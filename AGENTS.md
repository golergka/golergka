Be concise.

- NEVER open, run, launch, or automate Google Chrome. This is a hard constraint. For browser verification, always use the Codex in-app browser; never use Playwright or another external browser.
- Follow the requested scope exactly. Preserve unrelated behavior.
- Inspect user-visible output, including generated files, visually and structurally. Tests alone are not verification.
- Keep tests only when they protect meaningful behavior.
- Preserve the site's near-default-HTML minimal style and use sound UX judgment.
- For every CV change, read `cv/REQUIREMENTS.md` before editing and check every applicable requirement before finishing.
- Treat the PDF as first-class output for every CV change.
- Surface unresolved content warnings clearly; never hide them.
- Treat commit and deploy instructions literally.
- Always add durable user-provided project workflow directions to this `AGENTS.md` file, especially directions containing words such as “always” and “never”.
- Never add regression checks. Delete regression checks when instructed.
- Always commit and deploy requested changes.
- Deploy this site with `npm run build`, then source `./.env` and run `npx wrangler pages deploy dist --project-name golergka --branch main`. Do not use `wrangler whoami` to determine whether deployment is available: this token deploys to the named project but cannot list accounts.
- Never show or send `pages.dev` URLs. Link only to the production domain.
- For exhaustive audits, split independent categories among subagents and reconcile the results.
