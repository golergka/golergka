---
organization: Hotline (Gestalt Systems)
start: 2025-07
end: 2026-03
location: Remote
url: https://hotline.net
links:
  - label: LinkedIn company
    url: https://www.linkedin.com/company/102483250/
role: "[Founding Engineer](leadership)"
---

The [only founding engineer](leadership) on an AI voice and messaging platform, from agent behavior to production infrastructure.

## Experience

- Built a real-time [LiveKit](livekit) [voice-agent pipeline](agents,product,backend) using Deepgram streaming speech recognition, Silero VAD, [Gemini](model-infrastructure) and [OpenAI](model-infrastructure) tool-calling, and ElevenLabs streaming speech synthesis.

- Built [inbound and outbound voice](product), [SMS](product,twilio), and [email communication](product) with [Twilio](twilio), [LiveKit SIP/PSTN](livekit,backend,platform), [AWS](platform), and [Quo (formerly OpenPhone)](quo).

- [Built [background and specialist agents](agents,automation,product) with [shared tools, persistent context, scheduled execution](automation,backend), [transactional side effects](backend,safety), progress reporting, and [guarded completion](safety).](challenges)

- Built [LLM evaluation](evals) and [debugging infrastructure](developer-tools) using [Braintrust](braintrust) traces and experiments, [real-model agent behavioral tests](evals,agents), [token and cost tracking](evals,observability), and correlation with [Better Stack](betterstack) [production traces](observability,production-engineering).

- Developed [scheduled agent execution](agents,automation), [assistant provisioning](platform), [PostgreSQL/PGMQ queues with durable retries](postgres,backend,platform), [Redis caching](backend), [database migrations](postgres,platform), and [remote production tests](developer-tools,production-engineering) across [SMS, email, and voice](product).

- Worked across a [TypeScript](typescript) monorepo: [Next.js admin tools](frontend,product,developer-tools), [API services, asynchronous workers, shared domain logic](backend), and [remote environment tests](developer-tools,production-engineering).

- Built end-to-end [agent-driven development pipelines](agents,autonomous-development,developer-tools) for autonomous implementation, [specialized review agents](autonomous-development,developer-tools), [testing, integration](developer-tools), and [production delivery](production-engineering).

- [Instrumented and investigated production](production-engineering,observability) with [OpenTelemetry](opentelemetry), [Better Stack](betterstack), [Braintrust](braintrust), Sentry, and [voice metrics](observability,livekit) covering speech-to-text (STT), large language models (LLMs), text-to-speech (TTS), voice activity detection (VAD), silence, latency, and usage.

- [Kept agent responses highly responsive at [roughly 200–500 ms](livekit,production-engineering) while [tool calls and longer-running work continued in the background](automation,backend).](impact)

- [The startup ran out of runway. I gravitate toward early-stage startups.](career-moves)
