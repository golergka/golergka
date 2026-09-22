---
organization: Coloph
start: "2026"
end: present
location: Independent
artifacts:
  - Coloph Works
  - Coloph Migrations
  - Coloph Sync
role: "[Founder](founder) & [Product Engineer](product)"
---

[Founded and built](founder) [graph-based knowledge system](knowledge-graphs,search) that turns messy, self-contradictory company data into a live, cited model of what is true and how the business works.

## Experience

- [Systematic fact extraction with provenance, temporality, contradiction detection, escalation-to-human system, and ontology dynamically evolved by agents.](data,knowledge-graphs,search) Ingested data from messy communications in internal and external communication channels from telegram, email, google docs, external web pages, and pdfs. [Developed agentic workflows to effectively extract data from non-linear sources such as google sheets, trello, git and notion.](agent-harness) Over the course of operation, production-hardened all connectors with versioned source identities, fingerprints and effective reingestion. Added [role and scope-based access control policies and full mutation history](safety).
- Utilised [postgresql RLS](postgres) for tenant and user access control, [Enriched database with lexical (fulltext) and embedding ([pgvector](pgvector)) retrival based on an [operated local model](llms)](search)
- [Automatic media ingestion lifecycle with a durable work queue and a general-use third-party quota and backoff system for external APIs.](backend,devops)
- Automatic [LLM observability and monitoring](observability) based on [Braintrust](braintrust). Developed [custom evals based on set prompts, as well as full agent environments with pre-filled copies of db and target kb conditions](evals).
- Built a [custom scheduler, orchestration engine and [container provision](<docker, kubernetes>)](agent-harness) for durable, recoverable and sandboxed agent invocations over generalizable work queue system. Platform included provider and token budget per-tenant and per-workflow policies and full token spend audit, both on API pricing, [self-operated open models](llms) and provider subscriptions. It included automatic model routing with A/B-testing for cost and quality evaluation.
- Tokenmaxxed to hundreds of billions of used tokens, with data corpuses up to 150M.
- [Autonomous agents following user's instructions with principal provenance, incoming triggers, observability, white-listed toolsets, and external effects.](agents,agent-harness,observability). Agents were instructed by users in plan language, found business processes to automate by themselves. They self-reflected on last runs and corrected their out prompts.
- [Custom agent tool system](developer-tools,agent-harness) with automatically constructed API, MCP, cli facades and switchable tool formats, with highly A/B testable input and output formats. Custom skills, kwnoledge (based on the knowledge base), compaction and other internal agent tools. Gradually open-sourced at [coloph-toolset](https://github.com/golergka/coloph-toolset).
- [Deployment and operation on hetzner VMs](devops) with resilient [Kubernetes-based system](kubernetes). [Autonomous AI-based software development system and agent-first CI/CD pipeline ([ship loop](https://github.com/golergka/coloph-sync)), nested and self-correcting review agent, and agent-led project management](autonomous-development).
- [As a professional and experienced developer, failed at sales and ran out of runway (savings).](career-moves)
