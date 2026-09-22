---
organization: Hotline (Gestalt Systems)
start: 2025-07
end: 2026-03
location: Remote
role: "[Founding Engineer](leadership)"
---

The [only founding engineer](leadership) for an [sms/email/call-based AI agent](agents).

## Experience

- Real-time [LiveKit](livekit) [voice-agent pipeline](agents,product,backend) using Deepgram streaming speech recognition, Silero VAD, [Gemini](llms) and [OpenAI](llms) tool-calling, and ElevenLabs streaming speech synthesis. In and outbound calls ([Quo, formerly OpenPhone](quo)), [SMS](twilio), and email communication. Used STT, TTS and VAD to achieve highly responsive voice agent with 200-500ms latency and delegating tool calls to a background agent (feature implemented by ChatGPT voice only in July 2026).
- [Agent harness based on Vercel AI SDK](agent-harness,vercel-ai-sdk,node-bun), with shared tools, persisted context, memory system, and [advanced context preparation and retrieval](search) for agents. [Scheduled execution and work queues](autonomous-development) ([PGMQ](postgres)), resilient agent orchestration and provisioning, and transactional side effects, [Redis caching](backend).
- Built [LLM evaluation, debugging, and observability infrastructure](evals,observability) using [Braintrust](braintrust) for traces and experiments, token and cost tracking, connected with [Better Stack](betterstack) and [Sentry](sentry) production traces, integrating together several [OpenTelemetry](opentelemetry)-based SDKs.
- Built an [AI-based software development system with recursive agent review](autonomous-development,evals).
- [Developed [scheduled agent execution](agents), [assistant provisioning](devops), [PostgreSQL/PGMQ queues with durable retries](postgres,backend,devops), [Redis caching](backend), [database migrations](postgres), and remote production tests across [SMS, email, and voice](product)](devops).
- [Unfortunately, startup didn't hit a product-market fit and ran out of runway](career-moves).
