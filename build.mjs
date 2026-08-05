// Static site generator for golergka.com.
//
// The whole idea: the repo is already the source of truth. A post is a markdown
// file in the root. Its title is the H1, its slug is the filename, its date is
// when git first saw it, and `<name>-ru.md` is the Russian translation of
// `<name>.md`. No frontmatter, no manifest, no config beyond the constants below.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const SITE_NAME = "Max Yankov";
const SITE_URL = "https://golergka.com";
const SITE_DESCRIPTION = "Notes by Max Yankov (golergka).";

const FOOTER = `<a href="https://github.com/golergka">GitHub</a> ·
<a href="http://t.me/golergka">Telegram</a> ·
<a href="mailto:golergka@gmail.com">Email</a> ·
<a href="/Max%20Yankov%20-%20CV.pdf">CV</a> ·
<a href="/feed.xml">RSS</a>`;

// README is the homepage, not a post.
const HOMEPAGE = "README.md";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const theme = path.join(root, "theme");

const LANGUAGES = { ru: "Русский" };

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

// Links between markdown files in the repo become links between pages on the
// site, so the same file reads correctly on GitHub and here.
function rewriteLinks(html) {
  return html.replace(/href="([^"]+)\.md(#[^"]*)?"/g, (_, name, hash) =>
    `href="/${name}/${hash ?? ""}"`
  );
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

const files = fs
  .readdirSync(root)
  .filter((name) => name.endsWith(".md") && name !== HOMEPAGE)
  .sort();

const pages = [];
for (const file of files) {
  const markdown = fs.readFileSync(path.join(root, file), "utf8");
  if (!conforms(markdown)) {
    console.warn(`skipped ${file}: no H1 heading in the first lines`);
    continue;
  }
  const slug = file.replace(/\.md$/, "");
  const langMatch = slug.match(/-(\w{2})$/);
  const lang = langMatch && LANGUAGES[langMatch[1]] ? langMatch[1] : "en";
  pages.push({
    file,
    slug,
    lang,
    // `foo-ru.md` is a translation of `foo.md`; only the original is listed.
    translationOf: lang === "en" ? null : slug.slice(0, -(lang.length + 1)),
    title: titleOf(markdown, slug),
    created: gitDate(file, true),
    updated: gitDate(file, false),
    markdown,
  });
}

if (pages.length === 0) {
  throw new Error("no markdown pages found in the repo root");
}

// Dates come from git history. If the whole repo reports no dates, we are
// building from a shallow clone and every post would silently lose its date —
// fail loudly instead. (A single missing date just means a new, uncommitted file.)
if (pages.every((page) => !page.created)) {
  throw new Error(
    "no git history available: dates cannot be derived. " +
      "Ensure the build checks out full history (Cloudflare Pages: unset shallow clone), " +
      "or switch to date-prefixed filenames."
  );
}

for (const page of pages) {
  if (!page.created) console.warn(`no git date for ${page.file} (uncommitted?)`);
}

const originals = pages
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
    ? `<p><time datetime="${page.created}">${page.created}</time>${
        page.updated && page.updated !== page.created
          ? ` (updated <time datetime="${page.updated}">${page.updated}</time>)`
          : ""
      }</p>`
    : "";
  const html = rewriteLinks(marked.parse(page.markdown));
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
      content: body,
      footer: FOOTER,
    })
  );
}

const list = originals
  .map((page) => {
    const langs = (translations.get(page.slug) ?? [])
      .map((t) => ` · <a href="/${t.slug}/" lang="${t.lang}">${LANGUAGES[t.lang]}</a>`)
      .join("");
    const date = page.created
      ? `<time datetime="${page.created}">${page.created}</time> `
      : "";
    return `<li>${date}<a href="/${page.slug}/">${escapeHtml(page.title)}</a>${langs}</li>`;
  })
  .join("\n");

const readme = fs.readFileSync(path.join(root, HOMEPAGE), "utf8");
writePage(
  path.join(dist, "index.html"),
  render(layout, {
    lang: "en",
    title: SITE_NAME,
    sitename: SITE_NAME,
    content: rewriteLinks(marked.parse(readme)) + `\n<ul class="posts">\n${list}\n</ul>`,
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

fs.copyFileSync(path.join(theme, "style.css"), path.join(dist, "style.css"));

// Anything else in the root that is not source (PDFs, images) is served as-is.
for (const name of fs.readdirSync(root)) {
  const full = path.join(root, name);
  if (fs.statSync(full).isDirectory()) continue;
  if (/\.(md|mjs|json|lock|yaml)$/.test(name) || name.startsWith(".")) continue;
  fs.copyFileSync(full, path.join(dist, name));
}

console.log(
  `built ${pages.length} pages (${originals.length} listed) into dist/`
);
