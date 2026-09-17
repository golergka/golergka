# golergka.com

`build.mjs` coordinates two separate builders and writes the shared stylesheet once.
The output directory is `dist/`.

## Source structure

```text
*.md                 Posts and the GitHub profile homepage
pages/               Permanent Markdown documents
scripts/markdown.mjs Markdown renderer, feed, redirects, and static files
cv/                  Preact application at /cv/
  experiences/       Editable Markdown experience records
  config.yaml        Profile, topics, relationships, and credentials
  content.mjs        Markdown and YAML compiler
  style.css          CV-specific styles
  model.mjs          Topic matching and experience grouping
  components/        Topic and experience components
  app.jsx            Application state and page composition
  client.jsx         Browser hydration entry
  prerender.jsx      Build-time rendering entry
  build.mjs          Application bundling and prerendering
  export.jsx         Lazy PDF export entry
  pdf.mjs            PDF layout
  colors.mjs         Topic color allocation
site/                Shared HTML shell, stylesheet, and build context
docs/                Repository documentation, never published
```

Markdown documents do not contain application placeholders or scripts.
The CV owns its route and build entry under `cv/`.
The coordinator calls each builder explicitly. Duplicate output paths fail the build.

The CV builder uses esbuild for browser modules and Preact for prerendering.
The browser hydrates the same components that produce the initial HTML.
Before hydration, the CV shows an overview with native expandable details.
Interactive controls appear after hydration. URL filters then select the requested topics.
PDF dependencies load only when the reader requests a download.
Editorial date notes stay out of the public data and browser bundle.

## How a post is defined

Everything the site needs is already in the repo, so there is no frontmatter and
no manifest:

| Thing | Where it comes from |
|-------|---------------------|
| Post | Any `*.md` in the repo root except `README.md` |
| Permanent page | Any `*.md` in `pages/` |
| Title | The first `# H1` in the file |
| URL | The filename — `opentelemetry-integration.md` → `/opentelemetry-integration/` |
| Date | Git: first commit that added the file (updated date: last commit) |
| Translation | `<name>-ru.md` is the Russian version of `<name>.md` |
| Homepage | `README.md`, followed by the post list |

Posts and pages render identically and share the same URL shape. The difference
is that a page is undated and appears in neither the post list nor the feed —
it gets revised rather than published, so a date on it would be misleading.
Link to a page from `README.md` or from `FOOTER` in `site/build-context.mjs`; nothing lists
them automatically.

Non-markdown files in the root (images, PDFs) are copied to the site as-is,
unless listed in `UNPUBLISHED` in `scripts/markdown.mjs` — that is where the outdated CV
sits: still in the repo, not served.

Renaming a post changes its URL. Add the old path to `REDIRECTS` in `scripts/markdown.mjs`
and it is written into `_redirects` as a 301.

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

`site/layout.html` is the page shell. `site/style.css` holds shared styles;
`cv/style.css` holds CV styles. The build combines them into one stylesheet.

The stylesheet is served under a content-hashed name (`/style.<hash>.css`), so a
design change can never be hidden behind a cached copy.

Code blocks are highlighted by Shiki at build time. Both the light and dark
palettes are emitted as CSS custom properties on every token, and the stylesheet
chooses between them — so Markdown pages ship no JavaScript and dark mode never
flashes the wrong colours. Languages have to be listed in `CODE_LANGUAGES` in
`scripts/markdown.mjs`; an unlisted or missing language renders as plain text instead of
breaking the build.

## Deployment (Cloudflare Pages)

The site is a direct upload, not a Git-connected Pages project — the build runs
here and only `dist/` is shipped. This keeps git history available, which the
dates depend on.

    set -a; . ./.env; set +a
    npm run build
    npx wrangler pages deploy dist --project-name golergka --branch main

`.env` (gitignored) holds `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

Live setup, already done:

- Pages project `golergka` → `golergka.pages.dev`
- Custom domains `golergka.com` and `www.golergka.com`
- Proxied CNAMEs for both, pointing at `golergka.pages.dev`

### Known rough edges

`www` serves the same content instead of redirecting to the apex. Pages
`_redirects` cannot match on hostname, and the zone-level Redirect Rule that
would do it needs a token permission the current token lacks (Zone → Dynamic
Redirect → Edit). Every page carries a `rel="canonical"` pointing at the apex, so
search engines see one URL; adding that permission (or one dashboard rule) turns
it into a real 301.

Dates come from git history, so any future move to a Git-connected build or CI
needs a full-depth checkout (`fetch-depth: 0` in GitHub Actions). If history is
missing, the build fails on purpose rather than stamping every post with the same
date; the fallback is date-prefixed filenames.
