import fs from "node:fs";
import { parseTopicText } from "./content.mjs";

// Names and destinations come from the public Projects page, not CV artifacts.
// Years approximate default-branch commit ranges, checked 2026-09-22.
// Place by first activity: later maintenance should not move an old project up.
export function loadProjects(filters) {
  const source = fs.readFileSync(new URL("../pages/projects.md", import.meta.url), "utf8");
  const metadata = JSON.parse(fs.readFileSync(new URL("../pages/projects-cv.json", import.meta.url), "utf8"));
  const allowed = new Set(filters.map(({ id }) => id));
  return [...source.matchAll(/<h3><a href="(https:\/\/github\.com\/golergka\/([^"/]+))">([^<]+)<\/a><\/h3>/g)].map(([, url, id, name]) => {
    const meta = metadata[id];
    if (!meta?.description) throw new Error(`Invalid project metadata: ${id}`);
    const point = parseTopicText(meta.description, allowed);
    return { id, name, url, ...meta, description: point.text, tags: point.tags, emphases: point.emphases };
  });
}
