import fs from "node:fs";
import YAML from "yaml";

export function parseTopicText(source, allowed) {
  const emphases = [], allTags = new Set(), wholeTags = new Set();
  const text = source.replace(/\[([^\]]*)\]\(topic:([^)]+)\)/g, (_, phrase, ids) => {
    const tags = ids.split(",").map((id) => id.trim());
    for (const tag of tags) {
      if (!allowed.has(tag)) throw new Error(`Unknown topic: ${tag}`);
      allTags.add(tag);
      if (!phrase) wholeTags.add(tag);
    }
    if (phrase) emphases.push({text: phrase, tags});
    return phrase;
  }).trim();
  const uncovered = [...wholeTags].filter((tag) => !emphases.some((e) => e.tags.includes(tag)));
  if (uncovered.length) emphases.push({text, tags: uncovered});
  return {text, tags: [...allTags], emphases};
}

export function loadContent(directory = new URL("./", import.meta.url)) {
  const config = YAML.parse(fs.readFileSync(new URL("config.yaml", directory), "utf8"));
  const allowed = new Set([...config.filters.map(({id}) => id), ...Object.keys(config.topicAliases || {})]);
  const experienceDir = new URL("experiences/", directory);
  const work = fs.readdirSync(experienceDir).filter((name) => name.endsWith(".md")).sort().map((name) => {
    const source = fs.readFileSync(new URL(name, experienceDir), "utf8");
    const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`${name}: missing YAML metadata`);
    const meta = YAML.parse(match[1]);
    for (const key of ["organization", "role", "start", "end"]) {
      if (!meta[key]) throw new Error(`${name}: missing ${key}`);
    }
    for (const key of ["start", "end"]) {
      if (!/^(\d{4}(-\d{2})?|present)$/.test(meta[key])) throw new Error(`${name}: invalid ${key}`);
    }
    const [summarySource, bullets = ""] = match[2].split(/^## Experience\s*$/m);
    const summary = parseTopicText(summarySource.trim(), allowed);
    const role = parseTopicText(meta.role, allowed);
    const highlights = bullets.split(/^\s*- /m).filter((s) => s.trim()).map((s) => parseTopicText(s.trim().replace(/\n\s*/g, " "), allowed));
    const tags = [...new Set([...(meta.tags || []), ...summary.tags, ...role.tags, ...highlights.flatMap((p) => p.tags)])];
    for (const tag of tags) if (!allowed.has(tag)) throw new Error(`${name}: unknown topic ${tag}`);
    return {...meta, role: role.text, roleEmphases: role.emphases, summary: summary.text, summaryTags: summary.tags, summaryEmphases: summary.emphases, highlights, tags};
  });
  return {...config, work};
}
