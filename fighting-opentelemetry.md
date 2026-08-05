# We Spent 2 Weeks Fighting OpenTelemetry So You Don't Have To

OpenTelemetry promises a vendor-neutral, unified observability standard. The pitch is compelling: instrument once, export everywhere. No vendor lock-in. Traces, metrics, and logs all speaking the same language.

The reality? We spent 10 days and 15+ commits getting basic tracing to work in our Node.js application. Along the way we encountered global registration conflicts, pnpm incompatibilities, breaking API changes between versions, silent failures, and a configuration maze that required four separate tokens and URLs for what should have been one integration.

This is the story of what went wrong, and what you can do to avoid our mistakes.

---

## Our Stack

We're building a voice AI application using several observability-adjacent libraries:

| Library | Purpose | OpenTelemetry Behavior |
|---------|---------|------------------------|
| **LiveKit Agents SDK** | Real-time voice/video infrastructure | Registers OTel context API at import time |
| **Braintrust** | LLM observability and evals | Has optional OTel peer deps, uses dynamic `__require()` |
| **Sentry v9+** | Error tracking | Registers OTel APIs if tracing integrations are enabled |
| **Better Stack** | Logs + distributed traces | Receives data via OTLP protocol |

Our goal was simple: get traces from all these systems into Better Stack for unified observability. We figured it would take a day or two.

It did not take a day or two.

---

## Problem #1: The Global Singleton War

OpenTelemetry uses global singletons for its core APIs: `TracerProvider`, `ContextManager`, and `Propagator`. This design means there's exactly one of each per process. The idea is that all libraries share the same tracing context.

The problem arises when multiple libraries try to register these globals.

### What happened

When we tried to initialize our tracer, we got errors like:

```
@opentelemetry/api: Attempted duplicate registration of API: context
```

The culprit? LiveKit's `@livekit/rtc-node` package registers the OpenTelemetry context API **at import time**—before our initialization code even runs. Meanwhile, Sentry v9+ also registers OTel APIs if you have tracing integrations enabled.

So by the time our code called `provider.register()`, the APIs were already registered.

### The confusing part

We tried to detect whether a real provider was already registered:

```typescript
const provider = trace.getTracerProvider();
if (provider.constructor.name !== "ProxyTracerProvider") {
  // Real provider already registered, skip
}
```

This check was **always false**. Turns out, OpenTelemetry wraps every provider in a `ProxyTracerProvider`. The actual provider is hidden inside a private `_delegate` field.

### The solution

We had to dig into OTel internals:

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

**Lesson:** OTel's abstraction layers make introspection nearly impossible without internal knowledge. The public API doesn't tell you what's actually registered.

---

## Problem #2: pnpm + ESM + Dynamic Requires

Our project uses pnpm with strict dependency isolation and ES modules. This combination exposed a nasty issue with how Braintrust loads OpenTelemetry.

### What happened

Braintrust uses dynamic requires internally:

```javascript
// Inside braintrust package
__require("@opentelemetry/sdk-trace-base")
```

This pattern fails in two ways:
1. **pnpm isolation**: Packages can only see their declared dependencies, not transitive ones. Even though `@opentelemetry/sdk-trace-base` was installed in our core package, Braintrust couldn't find it.
2. **ESM context**: In ES modules, `require()` isn't available. Braintrust was using a polyfilled `__require()` that didn't work correctly.

The error we saw:

```
Cannot find module '@opentelemetry/sdk-trace-base'
```

### The fix attempts

This took us **four separate commits** to resolve:

1. **Add OTel deps to our agent package** → Removed them thinking they were redundant (core already had them) → Had to re-add
2. **Add braintrust as a direct dependency** → Still broken because pnpm resolves from the package's location in the store
3. **Create `.pnpmfile.cjs` to inject deps** → Hacky but necessary:

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

4. **Add OTel deps to every consuming package** → api-server, async-worker, agent all needed their own copies

**Lesson:** Optional peer dependencies + dynamic requires + pnpm = pain. If a library uses dynamic requires for optional features, you'll need to manually ensure those dependencies are resolvable from the library's location.

---

## Problem #3: Breaking v1.x → v2.x API Changes

OpenTelemetry's SDK packages recently released v2.x with breaking changes. LiveKit pins to v1.x, but we needed v2.x for the latest features.

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

The `addSpanProcessor()` method was removed entirely. The `Resource` constructor was replaced with a factory function.

### The solution

Runtime detection for which API version is available:

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

**Lesson:** Pin exact versions of OpenTelemetry packages. The v1.x and v2.x APIs are incompatible, and you may have dependencies on both.

---

## Problem #4: The Token/URL Configuration Maze

We use Better Stack for both logs (via their Logtail integration) and traces (via OTLP). Naturally, we assumed we could use the same credentials for both.

We could not.

### What Better Stack actually requires

| What | Environment Variable | Purpose |
|------|---------------------|---------|
| Log source token | `BETTER_STACK_SOURCE_TOKEN` | For Logtail logging API |
| Traces source token | `BETTER_STACK_TRACES_TOKEN` | For OTLP trace ingestion |
| Traces ingesting URL | `BETTER_STACK_TRACES_INGESTING_URL` | Each source has its own URL |

Each Better Stack "source" is a separate entity with its own token and ingesting URL. A logs source and a traces source are completely separate, even for the same application.

### What went wrong

1. We used the log source token for OTLP traces → "Unauthorized" errors
2. We didn't know each source has its own ingesting URL → traces going nowhere
3. The errors were invisible (see next section)

**Lesson:** OTLP is not Logtail. Different protocols require different auth and different endpoints. Read the docs carefully for your observability vendor.

---

## Problem #5: Silent Failures Everywhere

While debugging all of the above, we kept running into a meta-problem: OpenTelemetry fails silently by default.

### What we couldn't see

- OTLP exports failing with 401 Unauthorized
- Traces being dropped because no exporter was configured
- Span processors failing to initialize

No errors in console. No warnings. Nothing.

### The fix

You have to explicitly enable OpenTelemetry diagnostics:

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

Once we added this, we immediately saw the 401 errors and configuration issues.

**Lesson:** Enable OTel diagnostics on day one. The default silence will cost you hours of debugging.

---

## Problem #6: OpenTelemetry Logs - The Road Not Taken

While we were in the weeds, we figured we'd also unify our logging through OpenTelemetry. Send logs via OTLP, correlate them with traces automatically. The dream!

### Why we abandoned it

- `@opentelemetry/sdk-logs` is on version 0.x (experimental)
- `@opentelemetry/sdk-trace-base` is on version 2.x (stable)
- These packages have **incompatible peer dependencies**
- The Logs API is less mature, with fewer examples and more bugs
- Better Stack's native Logtail integration already works well

We spent a day trying to get it working, hit version conflicts, and gave up. Our logs still go through Logtail's native integration. Traces go through OTLP. They're correlated by injecting trace/span IDs into log messages manually.

**Lesson:** Just because OpenTelemetry supports something doesn't mean it's ready. The logs API is experimental for a reason.

---

## The Final Architecture

After all the fixes, here's what we ended up with:

```
┌─────────────────────────────────────────────────────────────┐
│                      Our Application                        │
├─────────────────────────────────────────────────────────────┤
│  LiveKit Agent    │  Braintrust      │  Our Code           │
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

Key points:
- We detect if someone else registered the TracerProvider before us
- We add our span processors to whatever provider exists
- We handle v1.x vs v2.x API differences at runtime
- Logs and traces use separate Better Stack sources with separate credentials
- OTel Logs API was abandoned; we use Logtail directly

---

## Recommendations

If you're integrating OpenTelemetry into a Node.js application with multiple observability libraries, here's our hard-won advice:

1. **Enable OTel diagnostics immediately.** Add `diag.setLogger()` before anything else. You'll thank yourself later.

2. **Check what your dependencies register.** Import order matters. If a library registers OTel APIs at import time, you need to work with their registration, not fight it.

3. **Pin exact versions.** Don't use `^` or `~` for OpenTelemetry packages. v1.x and v2.x APIs are incompatible. You'll end up with multiple versions in the same process.

4. **Test with pnpm specifically.** If you use pnpm, test your OTel integration in a clean install. npm and yarn's hoisting hides dependency resolution issues that pnpm exposes.

5. **Expect separate credentials per observability source.** Don't assume one API key works for logs and traces. Read your vendor's docs carefully.

6. **Skip OTel Logs for now.** The logs API is still experimental (0.x versions). Use your vendor's native logging integration instead.

7. **Write detection and fallback code.** The "standard" isn't standard yet. You'll need runtime checks for which provider registered, which API version is available, and whether methods exist.

8. **Budget 3x the time you expect.** Seriously. Integration is much harder than the docs suggest.

---

## Conclusion

OpenTelemetry's vision is compelling: vendor-neutral, unified observability. One instrumentation library to rule them all.

But the reality of integrating it into a production Node.js application—especially one that uses multiple libraries with their own OTel opinions—is rough. The ecosystem is fragmented (0.x logs vs 2.x traces). The global singleton model creates registration conflicts. pnpm and ESM compatibility feels like an afterthought. And the default behavior is to fail silently.

We spent two weeks and 15+ commits on what we thought would be a day's work. The tracing now works, but we have `.pnpmfile.cjs` hacks, require polyfills, runtime version detection, and pages of documentation explaining why our initialization code is so complex.

Our advice: OpenTelemetry is worth using for traces, but go in with eyes open. If you're using multiple libraries that touch OTel—and you probably are—prepare for a fight. And maybe wait another year for the logs API.

---

*If you're dealing with similar OTel integration headaches, I'd love to hear about your experience. The more we document these issues, the better the ecosystem will get.*
