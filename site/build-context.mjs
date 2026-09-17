import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const dist = path.join(root, "dist");
export const SITE_NAME = "Max Yankov";
export const SITE_URL = "https://golergka.com";
export const SITE_DESCRIPTION = "Notes by Max Yankov (golergka).";

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
const writtenPages = new Set();
export function writePage(outPath, html) {
  if (writtenPages.has(outPath)) throw new Error(`Two builders own ${outPath}`);
  writtenPages.add(outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
}
