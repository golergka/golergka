# CV requirements

Read this before every CV change and check every applicable item.

## Product

- Keep the near-default HTML style.
- Scroll to evidence only when a clicked portion was unhighlighted and becomes highlighted; never for an inherited or existing highlight.
- Treat the PDF as a first-class output and keep unresolved content warnings visible.
- Use the production domain in links, never `pages.dev`.

## Scope and verification

- Follow the requested scope exactly and preserve unrelated behavior.
- Inspect user-visible output visually and structurally; tests alone are insufficient.
- Keep only meaningful tests. Do not add regression checks; delete them when instructed.
- Use only the Codex in-app browser for browser verification. Never use Chrome, Playwright, or another external browser.

## Workflow and delivery

- Follow commit and deploy instructions literally; commit and deploy when requested.
- Record durable user-provided project workflow directions in `AGENTS.md`.
- For exhaustive audits, split independent categories among subagents and reconcile the results.
