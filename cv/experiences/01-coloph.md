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

[Founded and built](founder) [graph-based knowledge system](knowledge-graphs) that turns messy, self-contradictory company data into a live, cited model of what is true and how the business works.

## Experience

- Systematic fact extraction with provenance, temporality, contradiction detection, escalation-to-human system, and onthology dynamically evolved by the agents themselces. Ingested data from messy communications in internal and external communication channels from telegram, email, google docs, external web pages, and pdfs. Developed workflows to effectively extract data from non-linear sources such as google sheets, trello, git and notion. Over the course of operation, production-hardened all connectors with versioned source identities, fingerprints and effective reingestion. Added advanced role and scope-based access control policies and full mutation history.
- Utilised [postgresql RL](postgres) for tenant and user access control, Enriched database with lexical (fulltext) and embedding ([pgvector](pgvector)) retrival based on [operated local model](ml-ops).
- Automatic media ingestion lifecycle with a durable work queue. Operationalising prompted creating a general-use third-party quota and backoff system used for interaction with all external APIs.
- Automatic [LLM observability and monitoring](observability) based on [Braintrust](braintrust). Developed [custom evals based on set prompts, as well as full agent environments with pre-filled copies of db and target kb conditions](evals).
- Built a [custom scheduler and orchetration engine](agent-harness) for durable, recoverable and sandboxed agent invocations over generalizable work queue system. Platform included provider and token budget per-tenant and per-workflow policies and full token spend audit, both on API pricing, [self-operated open models](ml-ops) and provider subscriptions. It included automatic model routing with A/B-testing for cost and quality evaluation.
- Tokenmaxxed to hundreds of billions of used tokens, with data corpuses up to 150M.
- Autonomous user-instructed agents, acting with full principal provenance and incoming triggers. Full provenance, observability, tool calls and effects on all external systems. Agents acted on self-written and self-correcting prompts and strict contracts, limiting agent capabilities and requiring certain outputs and external effects.
- [Custom agent tool system](developer-tools,agent-harness) with automatically constructed API, MCP, cli and several tool formats, with highly A/B testable input and output formats. Custom skills, kwnoledge, compaction and other internal agent tools. Gradually open-sourced at coloph-toolset (insert link).
- [Deployment and operation on hetzner VMs](devops) with resilient [k8s-based system](kubernetes).
- [Autonomous AI-based software development system with ship loop (link), nested and self-correcting review agent, and agent-led project management](autonomous-development).
- [As a professional and experienced developer, failed at sales and ran out of runway (savings).](career-moves)
