---
organization: Coloph
start: "2025"
end: present
location: Independent
artifacts:
  - Coloph Works
  - Coloph Migrations
  - Coloph Sync
keywords:
  - knowledge-graphs
  - structured-data
  - search
  - python
  - postgres
  - sql
  - pgvector
  - pydantic-ai
  - model-infrastructure
  - claude-code
  - fastapi
  - react
  - typescript
  - platform
  - kubernetes
  - developer-tools
  - autonomous-development
  - automation
  - evals
  - production-engineering
  - observability
  - betterstack
  - braintrust
tags:
  - knowledge-graphs
  - structured-data
  - product
  - ingestion
  - backend
  - search
  - pgvector
  - automation
  - platform
  - production-engineering
  - agents
  - safety
  - postgres
  - sql
  - developer-tools
  - frontend
  - react
  - typescript
  - python
  - pydantic-ai
  - fastapi
  - model-infrastructure
  - claude-code
  - kubernetes
  - observability
  - betterstack
  - braintrust
  - evals
  - autonomous-development
  - founder
role: "[Founder](topic:founder) & [Product Engineer](topic:product)"
---

[My own graph-based knowledge system](topic:knowledge-graphs): a production product that turns messy company communication into a live, cited model of what is true and how the business works. I’m finishing it through open-source work on its underlying tools and infrastructure. [](topic:knowledge-graphs)

## Experience

- Designed a [temporal knowledge graph](topic:knowledge-graphs) of natural-language entities, rules, procedures, typed relationships, and effective time windows—not isolated chat history or flat document retrieval. [](topic:knowledge-graphs)

- Made facts [atomic, source-cited, and fully traceable](topic:knowledge-graphs) to who said them, when they became true, and what they superseded. [](topic:knowledge-graphs)

- Built [contradiction detection and proactive interception](topic:knowledge-graphs,product) of outdated claims, preserving both old and current facts and the reason one replaced another. [](topic:knowledge-graphs,product)

- Built [ingestion for messages and documents across Telegram, email, Google Docs, web pages, PDFs, git, GetCourse, and Shopify](topic:ingestion), plus [structured data from Google Sheets, Notion, Trello, and YouGile](topic:structured-data), with [versioned source identities, sections, chunks, fingerprints, and reingestion](topic:backend). [](topic:ingestion,structured-data,backend)

- Implemented [lexical and embedding retrieval, graph-neighbor expansion, temporal filtering, citation-aware answers](topic:search), and a [managed pgvector/IVFFlat embedding lifecycle](topic:pgvector). [](topic:search,pgvector)

- Created [extraction and graph-review workflows](topic:automation) for [entity discovery, deduplication, link and citation coverage, recategorization, splitting, hierarchy, assumptions, provenance chains, orphan rules, and hub organization](topic:knowledge-graphs). [](topic:automation,knowledge-graphs)

- Built a [custom durable scheduler and agent-workflow runtime](topic:automation,backend) with [claimed work items, retries, backoff, crash recovery](topic:production-engineering), [provider and token budgets](topic:platform), scheduled and one-off execution, and immutable audit history. [](topic:automation,backend,platform,production-engineering,challenges)

- Added [versioned process contracts](topic:automation) that let [agents realize business procedures](topic:agents,product), bind trusted outputs, record required tool calls, and [gate external effects behind explicit authority and approval](topic:safety). [](topic:automation,agents,product,safety)

- Built [per-source and per-fact access control](topic:safety) with roles, scoped labels, provenance-propagated permissions, [PostgreSQL row-level security](topic:postgres,sql,backend), and hard failure for uncited or blocked knowledge. [](topic:safety,postgres,sql,backend)

- Used advanced PostgreSQL throughout the product: [recursive CTEs, triggers, stored functions](topic:sql,postgres), row-level security, carefully designed indexes, [query-plan analysis, and performance-sensitive SQL](topic:sql,postgres,production-engineering). [](topic:sql,postgres,production-engineering)

- Delivered [multi-tenant knowledge bases](topic:product,backend) with [tenant-safe foreign keys](topic:sql,safety), per-KB configuration, language and domain context, [isolated credentials](topic:safety,platform), bots, data, and model-provider routes. [](topic:product,backend,sql,safety,platform)

- Shipped cited Q&A and operational interfaces through per-company [Telegram bots](topic:product), a [web knowledge browser](topic:product,search), a [large CLI/tool surface](topic:developer-tools), APIs, [inline search](topic:search), group-safe behavior, and desktop/mobile login flows. [](topic:product,developer-tools,search)

- Built the frontend in [Preact](topic:react) and [TypeScript](topic:typescript) with [Vite, ECharts, Storybook, Playwright](topic:developer-tools), [responsive app views](topic:frontend), and reusable light/dark UI primitives. [](topic:frontend,react,typescript,developer-tools)

- Operated a [Python backend](topic:backend,python) using [PostgreSQL](topic:postgres), [pgvector](topic:pgvector), psycopg, [FastAPI/Starlette](topic:fastapi), and [Pydantic AI](topic:pydantic-ai). [](topic:backend,python,postgres,pgvector,pydantic-ai,fastapi)

- Integrated [OpenAI and other commercial model APIs](topic:model-infrastructure), routed [Claude Code](topic:claude-code) to OpenAI-compatible providers through a [self-hosted LiteLLM gateway](topic:model-infrastructure,platform), and [hosted and tuned private OpenLLaMA inference with vLLM](topic:model-infrastructure,platform). [](topic:model-infrastructure,claude-code,platform)

- Deployed on [Hetzner with Docker, Caddy, blue-green releases](topic:platform), [k3s/Kubernetes workloads](topic:kubernetes), private model services, [zero-downtime routing](topic:production-engineering), S3-compatible storage, [restore-tested backups, and production smoke tests](topic:production-engineering,safety). [](topic:production-engineering,kubernetes,platform,safety)

- Built [custom production observability infrastructure](topic:observability) around [workflow and agent-run histories](topic:agents), [host metrics, provider usage, operator diagnostics, alerts, Sentry](topic:observability), [Better Stack](topic:betterstack), and [Braintrust](topic:braintrust) trace archives. [](topic:observability,betterstack,braintrust,agents)

- Built [cost-directed model evaluation](topic:evals) with controlled cohorts, hidden-gold case banks, reasoning evidence, failure triage, and promotion gates. [](topic:evals)

- As [founder](topic:founder), built the production system solo in roughly five months using a [fleet of coding agents](topic:autonomous-development) and an [automated merge-test-deploy loop](topic:developer-tools,autonomous-development). [](topic:autonomous-development,developer-tools,founder)

- Turned that development machinery into Coloph Sync, an [open-source coordinator for reviewed commits, isolated worktrees, integration checks](topic:developer-tools,autonomous-development), [resilient deployment, recovery](topic:production-engineering), and evidence-backed delivery state. [](topic:autonomous-development,developer-tools,production-engineering)

- Used by [several real clients](topic:product). One production knowledge base processed about 3,200 conversations and documents and 7M source tokens into about [5,000 facts and entities with 8,000 citations](topic:knowledge-graphs). [](topic:product,knowledge-graphs,impact)

- Separately stress-tested ingestion on about [334,000 emails and 150M source tokens](topic:ingestion), plus a large public engineering handbook. [](topic:ingestion)

- Extracted [reusable open-source foundations](topic:developer-tools) into Coloph Works: [migrations](topic:sql), environment handling, skills, [command safety](topic:safety), [sync coordination, and delivery across Git worktrees](topic:developer-tools,autonomous-development). [](topic:developer-tools,autonomous-development,sql,safety)

