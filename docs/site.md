# golergka.com

The site is generated from this repo by `build.mjs` (~180 lines, one dependency:
`marked`). It lives in `docs/` so the generator never treats it as a post.

## How a post is defined

Everything the site needs is already in the repo, so there is no frontmatter and
no manifest:

| Thing | Where it comes from |
|-------|---------------------|
| Page | Any `*.md` in the repo root except `README.md` |
| Title | The first `# H1` in the file |
| URL | The filename — `fighting-opentelemetry.md` → `/fighting-opentelemetry/` |
| Date | Git: first commit that added the file (updated date: last commit) |
| Translation | `<name>-ru.md` is the Russian version of `<name>.md` |
| Homepage | `README.md`, followed by the post list |

A file without an H1 is skipped with a warning rather than half-published.
Translations are not listed separately — they appear as a language link next to
the original. Links between `.md` files are rewritten to site URLs, so the same
file reads correctly on GitHub and on the site.

To publish a post: write a markdown file in the root, commit it, push. Nothing else.

## Local development

    npm install
    npm run build      # writes dist/
    npm run serve      # builds, then serves dist/ at http://localhost:8000

## Design

`theme/layout.html` is the page shell, `theme/style.css` is everything visual —
currently browser defaults plus a readable column. Iterate there; the build
script does not need to change.

## Deployment (Cloudflare Pages)

Connect the repo in the Cloudflare dashboard: Workers & Pages → Create → Pages →
Connect to Git.

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

Then Custom domains → `golergka.com` (and `www` if wanted). DNS is already on
Cloudflare, so the records are created automatically.

### The one thing that can break

Dates come from git history. If Cloudflare's checkout is shallow, `git log`
returns nothing and the build fails on purpose with a message saying so — better
than silently publishing every post with the same date. If that happens, the
fallback is to put dates in filenames (`2026-08-05-fighting-opentelemetry.md`)
and read them from there instead.
