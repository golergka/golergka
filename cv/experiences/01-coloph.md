---
organization: Coloph
start: "2025"
end: present
location: Independent
artifacts:
  - Coloph Works
  - Coloph Migrations
  - Coloph Sync
role: "[Founder](founder) & [Product Engineer](product)"
---

[My own graph-based knowledge system](knowledge-graphs): a production product that turns messy company communication into a live, cited model of what is true and how the business works. I’m finishing it through open-source work on its underlying tools and infrastructure.

## Experience

- Designed a [temporal knowledge graph](knowledge-graphs) of natural-language entities, rules, procedures, typed relationships, and effective time windows—not isolated chat history or flat document retrieval.

- Made facts [atomic, source-cited, and fully traceable](knowledge-graphs) to who said them, when they became true, and what they superseded.

- Built [contradiction detection and proactive interception](knowledge-graphs,product) of outdated claims, preserving both old and current facts and the reason one replaced another.

- Built [ingestion for messages and documents across Telegram, email, Google Docs, web pages, PDFs, git, GetCourse, and Shopify](ingestion), plus [structured data from Google Sheets, Notion, Trello, and YouGile](structured-data), with [versioned source identities, sections, chunks, fingerprints, and reingestion](backend).

- Implemented [lexical and embedding retrieval, graph-neighbor expansion, temporal filtering, citation-aware answers](search), and a [managed pgvector/IVFFlat embedding lifecycle](pgvector).

- Created [extraction and graph-review workflows](automation) for [entity discovery, deduplication, link and citation coverage, recategorization, splitting, hierarchy, assumptions, provenance chains, orphan rules, and hub organization](knowledge-graphs).

- [Built a [custom durable scheduler and agent-workflow runtime](automation,backend) with [claimed work items, retries, backoff, crash recovery](production-engineering), [provider and token budgets](platform), scheduled and one-off execution, and immutable audit history.](challenges)

- Added [versioned process contracts](automation) that let [agents realize business procedures](agents,product), bind trusted outputs, record required tool calls, and [gate external effects behind explicit authority and approval](safety).

- Built [per-source and per-fact access control](safety) with roles, scoped labels, provenance-propagated permissions, [PostgreSQL row-level security](postgres,sql,backend), and hard failure for uncited or blocked knowledge.

- Used advanced PostgreSQL throughout the product: [recursive CTEs, triggers, stored functions](sql,postgres), row-level security, carefully designed indexes, [query-plan analysis, and performance-sensitive SQL](sql,postgres,production-engineering).

- Delivered [multi-tenant knowledge bases](product,backend) with [tenant-safe foreign keys](sql,safety), per-KB configuration, language and domain context, [isolated credentials](safety,platform), bots, data, and model-provider routes.

- Shipped cited Q&A and operational interfaces through per-company [Telegram bots](product), a [web knowledge browser](product,search), a [large CLI/tool surface](developer-tools), APIs, [inline search](search), group-safe behavior, and desktop/mobile login flows.

- Built the frontend in [Preact](react) and [TypeScript](typescript) with [Vite, ECharts, Storybook, Playwright](developer-tools), [responsive app views](frontend), and reusable light/dark UI primitives.

- Operated a [Python backend](backend,python) using [PostgreSQL](postgres), [pgvector](pgvector), psycopg, [FastAPI/Starlette](fastapi), and [Pydantic AI](pydantic-ai).

- Integrated [OpenAI and other commercial model APIs](model-infrastructure), routed [Claude Code](claude-code) to OpenAI-compatible providers through a [self-hosted LiteLLM gateway](model-infrastructure,platform), and [hosted and tuned private OpenLLaMA inference with vLLM](model-infrastructure,platform).

- Deployed on [Hetzner with Docker, Caddy, blue-green releases](platform), [k3s/Kubernetes workloads](kubernetes), private model services, [zero-downtime routing](production-engineering), S3-compatible storage, [restore-tested backups, and production smoke tests](production-engineering,safety).

- Built [custom production observability infrastructure](observability) around [workflow and agent-run histories](agents), [host metrics, provider usage, operator diagnostics, alerts, Sentry](observability), [Better Stack](betterstack), and [Braintrust](braintrust) trace archives.

- Built [cost-directed model evaluation](evals) with controlled cohorts, hidden-gold case banks, reasoning evidence, failure triage, and promotion gates.

- As [founder](founder), built the production system solo in roughly five months using a [fleet of coding agents](autonomous-development) and an [automated merge-test-deploy loop](developer-tools,autonomous-development).

- Turned that development machinery into Coloph Sync, an [open-source coordinator for reviewed commits, isolated worktrees, integration checks](developer-tools,autonomous-development), [resilient deployment, recovery](production-engineering), and evidence-backed delivery state.

- [Used by [several real clients](product). One production knowledge base processed about 3,200 conversations and documents and 7M source tokens into about [5,000 facts and entities with 8,000 citations](knowledge-graphs).](impact)

- Separately stress-tested ingestion on about [334,000 emails and 150M source tokens](ingestion), plus a large public engineering handbook.

- Extracted [reusable open-source foundations](developer-tools) into Coloph Works: [migrations](sql), environment handling, skills, [command safety](safety), [sync coordination, and delivery across Git worktrees](developer-tools,autonomous-development).
