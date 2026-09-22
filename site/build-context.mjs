import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const dist = path.join(root, "dist");
export const SITE_NAME = "Max Yankov";
export const SITE_URL = "https://golergka.com";
export const SITE_DESCRIPTION = "Notes by Max Yankov (golergka).";
export const SOCIAL_IMAGE = `${SITE_URL}/site-card.png`;

export const FOOTER = `<a href="/projects/">Projects</a> ·
<a href="https://github.com/golergka">GitHub</a> ·
<a href="http://t.me/golergka">Telegram</a> ·
<a href="mailto:golergka@gmail.com">Email</a> ·
<a href="/feed.xml">RSS</a>`;

export const layout = fs.readFileSync(
  new URL("./layout.html", import.meta.url),
  "utf8",
);
export const styleCss = fs.readFileSync(
  new URL("./style.css", import.meta.url),
  "utf8",
 ) + "\n" + fs.readFileSync(new URL("../cv/style.css", import.meta.url), "utf8");
export const styleHref = `/style.${createHash("sha256").update(styleCss).digest("hex").slice(0, 8)}.css`;
export function render(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}
function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function socialMetadata({
  title,
  description = SITE_DESCRIPTION,
  pathname = "/",
  image = SOCIAL_IMAGE,
  imageAlt = "Max Yankov's notes and projects",
}) {
  const content = (value) => escapeAttribute(value);
  const url = `${SITE_URL}${pathname}`;
  return `<meta name="description" content="${content(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${content(SITE_NAME)}">
<meta property="og:title" content="${content(title)}">
<meta property="og:description" content="${content(description)}">
<meta property="og:url" content="${content(url)}">
<meta property="og:image" content="${content(image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${content(imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@GolerGkA">
<meta name="twitter:title" content="${content(title)}">
<meta name="twitter:description" content="${content(description)}">
<meta name="twitter:image" content="${content(image)}">
<meta name="twitter:image:alt" content="${content(imageAlt)}">`;
}
const writtenPages = new Set();
export function writePage(outPath, html) {
  if (writtenPages.has(outPath)) throw new Error(`Two builders own ${outPath}`);
  writtenPages.add(outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
}
