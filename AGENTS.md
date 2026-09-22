Be concise.

- NEVER open, run, launch, or automate Google Chrome. This is a hard constraint. For browser verification, always use the Codex in-app browser; never use Playwright or another external browser.
- Follow the requested scope exactly. Preserve unrelated behavior.
- Inspect user-visible output, including generated files, visually and structurally. Tests alone are not verification.
- Keep tests only when they protect meaningful behavior.
- Preserve the site's near-default-HTML minimal style and use sound UX judgment.
- Treat the PDF as first-class output for every CV change.
- Surface unresolved content warnings clearly; never hide them.
- Treat commit and deploy instructions literally.
- Do not add regression checks. When a requested change needs a commit and deployment, commit and deploy it.
- Never show or send `pages.dev` URLs. Link only to the production domain.
- For exhaustive audits, split independent categories among subagents and reconcile the results.
