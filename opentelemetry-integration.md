# Getting four SDKs to share one OpenTelemetry

> The thoughts here are mine, the text is LLM-assisted.

OpenTelemetry is an observability library. Many SDKs bundle it plug-and-play style, so you don't have to think about how it is set up — but with several of them in one project I ended up untangling them one from another. Here is how I got LiveKit, Braintrust, Sentry and Better Stack all working in the same project.

Instrumenting my own code was never the hard part. OpenTelemetry keeps its core APIs — the tracer provider, the context manager, the propagator — as global singletons, on the assumption that every library in the process cooperates through them. That assumption holds for one SDK. With four, each arriving with its own opinion about what to register, when to register it, and which SDK version to pin, the work becomes arbitration: figuring out who registered first and attaching yourself to whatever they left behind.

It took 10 days and more than 15 commits. The first three problems below all come from libraries bringing their own OpenTelemetry along. The last three — vendor configuration, silent failures, and an experimental logs API — would have found me just as easily with a single SDK.

---

## The stack

I'm building a voice AI application on top of several observability-adjacent libraries:

| Library | Purpose | OpenTelemetry behaviour |
|---------|---------|------------------------|
| **LiveKit Agents SDK** | Real-time voice/video infrastructure | Registers OTel context API at import time |
| **Braintrust** | LLM observability and evals | Has optional OTel peer deps, uses dynamic `__require()` |
| **Sentry v9+** | Error tracking | Registers OTel APIs if tracing integrations are enabled |
| **Better Stack** | Logs + distributed traces | Receives data via OTLP protocol |

Three of them register OpenTelemetry APIs on their own; the fourth is where the traces had to end up. The goal was to get spans from all of them into Better Stack. I expected it to take a day or two.

---

## Problem 1: global singleton conflicts

OpenTelemetry uses global singletons for its core APIs: `TracerProvider`, `ContextManager` and `Propagator`. There is exactly one of each per process, so that every library shares the same tracing context.

This breaks down when several libraries try to register those globals.

### What happened

Initializing my tracer produced errors like:

```
@opentelemetry/api: Attempted duplicate registration of API: context
```

LiveKit's `@livekit/rtc-node` registers the OpenTelemetry context API **at import time**, before my initialization code runs. Sentry v9+ also registers OTel APIs when tracing integrations are enabled. By the time my code called `provider.register()`, the APIs were already taken.

### Why the obvious check doesn't work

The natural approach is to detect whether a real provider is already registered:

```typescript
const provider = trace.getTracerProvider();
if (provider.constructor.name !== "ProxyTracerProvider") {
  // Real provider already registered, skip
}
```

This condition is always false. OpenTelemetry wraps every provider in a `ProxyTracerProvider`, and the actual provider sits behind a private `_delegate` field.

### The solution

Reaching into OTel internals:

```typescript
const provider = trace.getTracerProvider();
const delegate = (provider as any).getDelegate?.();
const delegateName = delegate?.constructor?.name;

// Check if delegate is a real provider (not just another proxy)
const hasRealProvider = delegateName && delegateName !== "ProxyTracerProvider";

if (hasRealProvider) {
  // Someone else registered first, try to add our processors to their provider
  if ("addSpanProcessor" in delegate) {
    delegate.addSpanProcessor(ourProcessor);
  }
} else {
  // We're first, create and register our own provider
  trace.setGlobalTracerProvider(ourProvider);
}
```

**Lesson:** the public API doesn't tell you what is actually registered, and the abstraction layers make introspection difficult without internal knowledge.

---

## Problem 2: pnpm, ESM and dynamic requires

The project uses pnpm with strict dependency isolation, and ES modules. That combination breaks the way Braintrust loads OpenTelemetry.

### What happened

Braintrust uses dynamic requires internally:

```javascript
// Inside braintrust package
__require("@opentelemetry/sdk-trace-base")
```

This fails in two ways:

1. **pnpm isolation**: packages only see their declared dependencies, not transitive ones. `@opentelemetry/sdk-trace-base` was installed in my core package, but Braintrust could not find it.
2. **ESM context**: in ES modules `require()` isn't available, and the polyfilled `__require()` Braintrust falls back to didn't work correctly.

The resulting error:

```
Cannot find module '@opentelemetry/sdk-trace-base'
```

### Four attempts

1. **Add OTel deps to the agent package.** Removed them again as redundant, since core already had them, then had to add them back.
2. **Add braintrust as a direct dependency.** Still broken: pnpm resolves from the package's location in the store.
3. **Inject the dependencies with `.pnpmfile.cjs`.** Hacky, but it works:

```javascript
// .pnpmfile.cjs
function readPackage(pkg) {
  if (pkg.name === "braintrust") {
    pkg.dependencies = {
      ...pkg.dependencies,
      "@opentelemetry/api": "1.9.0",
      "@opentelemetry/sdk-trace-base": "1.30.1",
    };
  }
  return pkg;
}
module.exports = { hooks: { readPackage } };
```

4. **Add OTel deps to every consuming package.** api-server, async-worker and agent each needed their own copies.

**Lesson:** optional peer dependencies combined with dynamic requires and pnpm are painful. If a library uses dynamic requires for optional features, those dependencies have to be resolvable from that library's own location.

---

## Problem 3: breaking v1.x to v2.x API changes

The OpenTelemetry SDK packages recently released v2.x with breaking changes. LiveKit pins to v1.x, and I needed v2.x.

### What broke

```typescript
// v1.x (what LiveKit uses)
const resource = new Resource({
  [ATTR_SERVICE_NAME]: "my-service",
});
provider.addSpanProcessor(processor);
provider.register();

// v2.x (current)
import { resourceFromAttributes } from "@opentelemetry/resources";

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: "my-service",
});
// addSpanProcessor() is GONE - must pass processors to constructor
const provider = new NodeTracerProvider({
  resource,
  spanProcessors: [processor],
});
```

`addSpanProcessor()` was removed entirely, and the `Resource` constructor was replaced by a factory function.

### The solution

Detecting at runtime which API version is present:

```typescript
function addProcessorToProvider(
  provider: TracerProvider,
  processor: SpanProcessor
): boolean {
  // v1.x style - method exists on provider
  if ("addSpanProcessor" in provider) {
    (provider as any).addSpanProcessor(processor);
    return true;
  }

  // v2.x style - check delegate
  const delegate = (provider as any).getDelegate?.();
  if (delegate && "addSpanProcessor" in delegate) {
    delegate.addSpanProcessor(processor);
    return true;
  }

  // Can't add processor to existing provider
  return false;
}
```

**Lesson:** pin exact versions of OpenTelemetry packages. The v1.x and v2.x APIs are incompatible, and you may well depend on both.

---

## Problem 4: token and URL configuration

I use Better Stack for both logs, through their Logtail integration, and traces, through OTLP. I assumed the same credentials would cover both. They don't.

### What Better Stack requires

| What | Environment variable | Purpose |
|------|---------------------|---------|
| Log source token | `BETTER_STACK_SOURCE_TOKEN` | For Logtail logging API |
| Traces source token | `BETTER_STACK_TRACES_TOKEN` | For OTLP trace ingestion |
| Traces ingesting URL | `BETTER_STACK_TRACES_INGESTING_URL` | Each source has its own URL |

Each Better Stack source is a separate entity with its own token and ingesting URL. A logs source and a traces source are unrelated, even for the same application.

### What went wrong

1. I used the log source token for OTLP traces, which produced "Unauthorized" errors.
2. I didn't know each source has its own ingesting URL, so traces went nowhere.
3. Both failures were invisible, which is the next problem.

**Lesson:** OTLP is not Logtail. Different protocols need different auth and different endpoints.

---

## Problem 5: silent failures

Underneath all of the above sat a second-order problem: OpenTelemetry fails silently by default.

### What I couldn't see

- OTLP exports failing with 401 Unauthorized
- Traces dropped because no exporter was configured
- Span processors failing to initialize

No errors in the console, no warnings, nothing.

### The fix

Diagnostics have to be enabled explicitly:

```typescript
import { diag, DiagLogLevel } from "@opentelemetry/api";

// Route OTel diagnostics to your logging system
diag.setLogger(
  {
    error: (msg, ...args) => console.error("[otel]", msg, ...args),
    warn: (msg, ...args) => console.warn("[otel]", msg, ...args),
    info: (msg, ...args) => console.info("[otel]", msg, ...args),
    debug: (msg, ...args) => console.debug("[otel]", msg, ...args),
    verbose: (msg, ...args) => console.debug("[otel]", msg, ...args),
  },
  DiagLogLevel.DEBUG
);
```

With this in place, the 401s and configuration errors showed up immediately.

**Lesson:** enable OTel diagnostics on day one. The default silence costs hours.

---

## Problem 6: OpenTelemetry logs

While I was in there, I also tried to unify logging through OpenTelemetry: send logs over OTLP and correlate them with traces automatically.

I gave up on it:

- `@opentelemetry/sdk-logs` is on 0.x, still experimental
- `@opentelemetry/sdk-trace-base` is on 2.x, stable
- The two have **incompatible peer dependencies**
- The logs API is less mature, with fewer examples and more bugs
- Better Stack's native Logtail integration already works

After a day of version conflicts I stopped. Logs still go through Logtail, traces go through OTLP, and they're correlated by injecting trace and span IDs into log messages manually.

**Lesson:** support for a signal doesn't mean it's ready. The logs API is experimental for a reason.

---

## Where it ended up

```
┌─────────────────────────────────────────────────────────────┐
│                       Application                           │
├─────────────────────────────────────────────────────────────┤
│  LiveKit Agent    │  Braintrust      │  My code            │
│  (registers       │  (needs OTel     │  (adds span         │
│   context API)    │   via require)   │   processors)       │
├─────────────────────────────────────────────────────────────┤
│                    Sentry v9+                               │
│              (may register OTel APIs)                       │
├─────────────────────────────────────────────────────────────┤
│              OpenTelemetry Global APIs                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ContextManager│  │TracerProvider│  │ Propagator   │      │
│  │ (LiveKit's)  │  │ (detect who  │  │              │      │
│  │              │  │  registered) │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                    Span Processors                          │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ BraintrustSpan   │  │ OTLPSpanExporter │                │
│  │ Processor        │  │ (Better Stack)   │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────┐
│    Better Stack     │               │     Braintrust      │
│   Logs (Logtail)    │               │   LLM Observability │
│   Traces (OTLP)     │               │                     │
│ (separate tokens!)  │               │                     │
└─────────────────────┘               └─────────────────────┘
```

In short:

- Detect whether something else registered the TracerProvider first
- Add my span processors to whatever provider exists
- Handle the v1.x and v2.x API differences at runtime
- Use separate Better Stack sources, with separate credentials, for logs and traces
- Skip the OTel logs API and use Logtail directly

---

## What I'd tell myself before starting

1. **Enable OTel diagnostics first.** Add `diag.setLogger()` before anything else.

2. **Check what your dependencies register.** Import order matters. If a library registers OTel APIs at import time, work with that registration rather than against it.

3. **Pin exact versions.** No `^` or `~` for OpenTelemetry packages: v1.x and v2.x are incompatible, and you can easily end up with both in one process.

4. **Test with pnpm specifically.** npm and yarn hoisting hides resolution problems that pnpm exposes.

5. **Expect separate credentials per source.** One API key for logs and traces is not a safe assumption.

6. **Skip OTel logs for now.** The API is still 0.x. Use your vendor's native logging integration.

7. **Write detection and fallback code.** You'll need runtime checks for which provider registered, which API version is available, and whether a given method exists.

8. **Budget about three times the time you expect.**

---

## Conclusion

OpenTelemetry's goal is a good one: vendor-neutral, unified observability, with one instrumentation library across the stack.

With one SDK it delivers on that, and you never see the machinery. With four, the machinery is the work: the global singleton model turns plug-and-play integrations into registration conflicts, the ecosystem is fragmented across 0.x logs and 2.x traces, pnpm and ESM support feels like an afterthought, and the default behaviour is to fail silently.

Two weeks and 15+ commits later, tracing works, at the cost of a `.pnpmfile.cjs` hack, require polyfills, runtime version detection, and a page of documentation explaining why the initialization code looks the way it does.

I'd still use OpenTelemetry for traces. I'd go in expecting the integration to be the hard part, and I'd wait another year before touching the logs API.
