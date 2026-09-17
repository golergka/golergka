// One output directory, with separate owners for documents and applications.
import fs from "node:fs";
import path from "node:path";
import { dist, styleCss, styleHref } from "./site/build-context.mjs";
import { buildMarkdown } from "./scripts/markdown.mjs";
import { buildCv } from "./cv/build.mjs";

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, styleHref.slice(1)), styleCss);
await buildMarkdown();
await buildCv();
