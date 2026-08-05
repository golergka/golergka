// Static site generator for golergka.com.
//
// The whole idea: the repo is already the source of truth. A post is a markdown
// file in the root. Its title is the H1, its slug is the filename, its date is
// when git first saw it, and `<name>-ru.md` is the Russian translation of
// `<name>.md`. Markdown under pages/ is a permanent page instead: same URL
// shape, but undated and kept out of the post list and the feed. No frontmatter,
// no manifest, no config beyond the constants below.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { createHighlighter } from "shiki";

const SITE_NAME = "Max Yankov";
const SITE_URL = "https://golergka.com";
const SITE_DESCRIPTION = "Notes by Max Yankov (golergka).";

const FOOTER = `<a href="/my-repositories/">Projects</a> ·
<a href="https://github.com/golergka">GitHub</a> ·
<a href="http://t.me/golergka">Telegram</a> ·
<a href="mailto:golergka@gmail.com">Email</a> ·
<a href="/feed.xml">RSS</a>`;

// README is the homepage, not a post.
const HOMEPAGE = "README.md";

// Markdown here is a permanent page rather than a dated post.
const PAGES_DIR = "pages";

// Files kept in the repo but not served on the site.
const UNPUBLISHED = ["Max Yankov - CV.pdf"];

// Old paths that were live once and should keep working.
const REDIRECTS = [["/fighting-opentelemetry/*", "/opentelemetry-integration/"]];

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const theme = path.join(root, "theme");

const LANGUAGES = { ru: "Русский" };

// Syntax highlighting happens here, at build time: the colours are baked into
// the HTML, so the site ships no JavaScript. Both themes are emitted at once
// (as CSS variables) and the stylesheet picks one, so dark mode needs no flash
// of the wrong palette. A fence with an unknown or missing language falls back
// to plain text rather than failing the build.
const CODE_LANGUAGES = [
  "typescript",
  "javascript",
  "json",
  "bash",
  "shell",
  "python",
  "sql",
  "yaml",
  "html",
  "css",
  "markdown",
  "diff",
];

const highlighter = await createHighlighter({
  themes: ["github-light", "github-dark"],
  langs: CODE_LANGUAGES,
});

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = CODE_LANGUAGES.includes(lang) ? lang : "text";
      return highlighter.codeToHtml(text, {
        lang: language,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
      });
    },
  },
});

function gitDate(file, first) {
  const args = first
    ? ["log", "--diff-filter=A", "--format=%ad", "--date=short", "-1", "--", file]
    : ["log", "--format=%ad", "--date=short", "-1", "--", file];
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

function titleOf(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

// A markdown file conforms to the format if it leads with an H1. Anything else
// in the root is ignored rather than half-published.
function conforms(markdown) {
  return /^#\s+.+$/m.test(markdown.split("\n").slice(0, 5).join("\n"));
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Wide tables scroll inside their own box. This needs a wrapper element:
// `display: block` on the table itself would disable border-collapse.
function wrapTables(html) {
  return html
    .replace(/<table>/g, '<div class="scroll"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

// Links between markdown files in the repo become links between pages on the
// site, so the same file reads correctly on GitHub and here.
function rewriteLinks(html) {
  return html.replace(
    /href="(?:pages\/)?([^"\/]+)\.md(#[^"]*)?"/g,
    (_, name, hash) => `href="/${name}/${hash ?? ""}"`
  );
}

// www.golergka.com serves the same files as the apex; canonical points at one.
function canonicalTag(pathname) {
  return `<link rel="canonical" href="${SITE_URL}${pathname}">`;
}

function render(layout, values) {
  return layout.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}

function writePage(outPath, html) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
}

// --- collect ---------------------------------------------------------------

const layout = fs.readFileSync(path.join(theme, "layout.html"), "utf8");

// The stylesheet URL carries a hash of its contents, so a design change is
// never hidden behind a stale cached copy.
const styleCss = fs.readFileSync(path.join(theme, "style.css"), "utf8");
const styleHref = `/style.${createHash("sha256").update(styleCss).digest("hex").slice(0, 8)}.css`;

const postFiles = fs
  .readdirSync(root)
  .filter((name) => name.endsWith(".md") && name !== HOMEPAGE)
  .sort()
  .map((name) => ({ kind: "post", file: name }));

const pageFiles = (
  fs.existsSync(path.join(root, PAGES_DIR))
    ? fs.readdirSync(path.join(root, PAGES_DIR))
    : []
)
  .filter((name) => name.endsWith(".md"))
  .sort()
  .map((name) => ({ kind: "page", file: path.join(PAGES_DIR, name) }));

const pages = [];
for (const { kind, file } of [...postFiles, ...pageFiles]) {
  const markdown = fs.readFileSync(path.join(root, file), "utf8");
  if (!conforms(markdown)) {
    console.warn(`skipped ${file}: no H1 heading in the first lines`);
    continue;
  }
  const slug = path.basename(file, ".md");
  const langMatch = slug.match(/-(\w{2})$/);
  const lang = langMatch && LANGUAGES[langMatch[1]] ? langMatch[1] : "en";
  pages.push({
    kind,
    file,
    slug,
    lang,
    // `foo-ru.md` is a translation of `foo.md`; only the original is listed.
    translationOf: lang === "en" ? null : slug.slice(0, -(lang.length + 1)),
    title: titleOf(markdown, slug),
    // Permanent pages are undated: they get revised, not published.
    created: kind === "post" ? gitDate(file, true) : null,
    updated: kind === "post" ? gitDate(file, false) : null,
    markdown,
  });
}

if (pages.length === 0) {
  throw new Error("no markdown pages found in the repo root");
}

// Dates come from git history. If the whole repo reports no dates, we are
// building from a shallow clone and every post would silently lose its date —
// fail loudly instead. (A single missing date just means a new, uncommitted file.)
const posts = pages.filter((page) => page.kind === "post");

if (posts.every((page) => !page.created)) {
  throw new Error(
    "no git history available: dates cannot be derived. " +
      "Ensure the build checks out full history (Cloudflare Pages: unset shallow clone), " +
      "or switch to date-prefixed filenames."
  );
}

for (const page of posts) {
  if (!page.created) console.warn(`no git date for ${page.file} (uncommitted?)`);
}

const originals = posts
  .filter((page) => !page.translationOf)
  .sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""));

const translations = new Map();
for (const page of pages) {
  if (!page.translationOf) continue;
  const list = translations.get(page.translationOf) ?? [];
  list.push(page);
  translations.set(page.translationOf, list);
}

// --- render ----------------------------------------------------------------

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const page of pages) {
  const dated = page.created
    ? `<p class="date"><time datetime="${page.created}">${page.created}</time>${
        page.updated && page.updated !== page.created
          ? ` · updated <time datetime="${page.updated}">${page.updated}</time>`
          : ""
      }</p>`
    : "";
  const html = wrapTables(rewriteLinks(marked.parse(page.markdown)));
  // The H1 belongs to the markdown; the date slots in just underneath it.
  const body = html.includes("</h1>")
    ? html.replace("</h1>", `</h1>\n${dated}`)
    : dated + html;
  writePage(
    path.join(dist, page.slug, "index.html"),
    render(layout, {
      lang: page.lang,
      title: `${escapeHtml(page.title)} — ${SITE_NAME}`,
      sitename: SITE_NAME,
      stylesheet: styleHref,
      canonical: canonicalTag(`/${page.slug}/`),
      content: body,
      footer: FOOTER,
    })
  );
}

// Title on its own line, date and language quietly underneath it.
const list = originals
  .map((page) => {
    const meta = [
      page.created ? `<time datetime="${page.created}">${page.created}</time>` : null,
      ...(translations.get(page.slug) ?? []).map(
        (t) => `<a href="/${t.slug}/" lang="${t.lang}">${LANGUAGES[t.lang]}</a>`
      ),
    ].filter(Boolean);
    return `<li>
<a href="/${page.slug}/">${escapeHtml(page.title)}</a>
<div class="date">${meta.join(" · ")}</div>
</li>`;
  })
  .join("\n");

const readme = fs.readFileSync(path.join(root, HOMEPAGE), "utf8");
writePage(
  path.join(dist, "index.html"),
  render(layout, {
    lang: "en",
    title: SITE_NAME,
    sitename: SITE_NAME,
    stylesheet: styleHref,
    canonical: canonicalTag("/"),
    content:
      wrapTables(rewriteLinks(marked.parse(readme))) +
      `\n<h2>Writing</h2>\n<ul class="posts">\n${list}\n</ul>`,
    footer: FOOTER,
  })
);

const items = originals
  .filter((page) => page.created)
  .map(
    (page) => `  <item>
    <title>${escapeHtml(page.title)}</title>
    <link>${SITE_URL}/${page.slug}/</link>
    <guid>${SITE_URL}/${page.slug}/</guid>
    <pubDate>${new Date(`${page.created}T00:00:00Z`).toUTCString()}</pubDate>
  </item>`
  )
  .join("\n");

fs.writeFileSync(
  path.join(dist, "feed.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
<channel>
  <title>${SITE_NAME}</title>
  <link>${SITE_URL}/</link>
  <description>${SITE_DESCRIPTION}</description>
${items}
</channel>
</rss>
`
);

// Without this, Cloudflare Pages answers unknown paths with the homepage and a
// 200, which makes every typo look like a real page.
writePage(
  path.join(dist, "404.html"),
  render(layout, {
    lang: "en",
    title: `Not found — ${SITE_NAME}`,
    sitename: SITE_NAME,
    stylesheet: styleHref,
    content: `<h1>Not found</h1>\n<p>No page at this address. <a href="/">Back to the front page</a>.</p>`,
    footer: FOOTER,
  })
);


if (REDIRECTS.length) {
  fs.writeFileSync(
    path.join(dist, "_redirects"),
    REDIRECTS.map(([from, to]) => `${from} ${to} 301`).join("\n") + "\n"
  );
}

fs.writeFileSync(path.join(dist, styleHref.slice(1)), styleCss);

// Anything else in the root that is not source (PDFs, images) is served as-is.
for (const name of fs.readdirSync(root)) {
  const full = path.join(root, name);
  if (fs.statSync(full).isDirectory()) continue;
  if (/\.(md|mjs|json|lock|yaml)$/.test(name) || name.startsWith(".")) continue;
  if (UNPUBLISHED.includes(name)) continue;
  fs.copyFileSync(full, path.join(dist, name));
}

console.log(
  `built ${pages.length} pages (${originals.length} listed) into dist/`
);
