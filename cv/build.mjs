import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { loadContent } from "./content.mjs";
import {
  root,
  dist,
  SITE_NAME,
  SITE_URL,
  FOOTER,
  layout,
  render,
  writePage,
  styleHref,
} from "../site/build-context.mjs";

export async function buildCv({ outDir = dist } = {}) {
  const source = loadContent();
  const {
    cvStart,
    profile,
    filters,
    topicRelations,
    topicAliases,
    earlierWork,
    recentWork,
    artifacts,
    skills,
    education,
    languages,
  } = source;
  const data = {
    cvStart,
    profile,
    filters,
    topicRelations,
    topicAliases,
    earlierWork,
    recentWork,
    artifacts,
    skills,
    education,
    languages,
    work: source.work.map(({ dateNote, ...work }) => work),
  };
  const common = {
    absWorkingDir: root,
    bundle: true,
    format: "esm",
    jsx: "automatic",
    jsxImportSource: "preact",
    logLevel: "warning",
  };
  const client = await build({
    ...common,
    entryPoints: ["cv/client.jsx"],
    outdir: path.join(outDir, "cv/assets"),
    entryNames: "[name]-[hash]",
    chunkNames: "[name]-[hash]",
    splitting: true,
    minify: true,
    metafile: true,
    target: "es2022",
  });
  // Resolve Node dependencies before importing the in-memory server bundle.
  const server = await build({
    ...common,
    entryPoints: ["cv/prerender.jsx"],
    platform: "node",
    write: false,
    plugins: [
      {
        name: "server-imports",
        setup(builder) {
          builder.onResolve({ filter: /^[^./]/ }, ({ path: specifier }) => ({
            path: import.meta.resolve(specifier),
            external: true,
          }));
          builder.onResolve({ filter: /export\.jsx$/ }, () => ({
            path: new URL("./export.jsx", import.meta.url).href,
            external: true,
          }));
        },
      },
    ],
  });
  const { prerender } = await import(
    `data:text/javascript;base64,${Buffer.from(server.outputFiles[0].text).toString("base64")}`
  );
  const entry = Object.entries(client.metafile.outputs).find(
    ([, info]) => info.entryPoint === "cv/client.jsx",
  )[0];
  const content = prerender(data);
  const scripts = `<script id="cv-data" type="application/json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>\n<script type="module" src="/${path.relative(outDir, path.resolve(root, entry))}"></script>`;
  writePage(
    path.join(outDir, "cv/index.html"),
    render(layout, {
      lang: "en",
      title: `Experience — ${SITE_NAME}`,
      sitename: SITE_NAME,
      homeLabel: "Writing &amp; projects",
      stylesheet: styleHref,
      canonical: `<link rel="canonical" href="${SITE_URL}/cv/">`,
      content,
      footer: FOOTER,
      scripts,
    }),
  );
  fs.writeFileSync(path.join(outDir, "cv/data.json"), JSON.stringify(data));
  console.log("built Preact app at /cv/");
}
