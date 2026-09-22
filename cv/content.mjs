import fs from "node:fs";
import YAML from "yaml";
import config from "./config.mjs";

function matchingDelimiter(input, start, open, close) {
  let depth = 1;
  for (let index = start + 1; index < input.length; index++) {
    if (input[index] === open) depth++;
    if (input[index] === close && --depth === 0) return index;
  }
  return -1;
}

function parseTopicIds(source, allowed) {
  let target = source.trim();
  if (target.startsWith("<") || target.endsWith(">")) {
    if (!target.startsWith("<") || !target.endsWith(">"))
      throw new Error("Topic link tags must use matching angle brackets");
    target = target.slice(1, -1).trim();
  }
  const tags = target.split(",").map((id) => id.trim());
  if (!target || tags.some((tag) => !tag))
    throw new Error("Topic links must name at least one topic");
  for (const tag of tags)
    if (!allowed.has(tag)) throw new Error(`Unknown topic: ${tag}`);
  return tags;
}

function externalHref(source) {
  let href = source.trim();
  if (href.startsWith("<") && href.endsWith(">"))
    href = href.slice(1, -1).trim();
  try {
    const { protocol } = new URL(href);
    return protocol === "https:" || protocol === "http:" ? href : null;
  } catch {
    return null;
  }
}

export function parseTopicText(source, allowed) {
  const allTags = new Set();
  function parse(input) {
    let text = "", ranges = [];
    for (let i = 0; i < input.length;) {
      if (input[i] !== "[") { text += input[i++]; continue; }
      const end = matchingDelimiter(input, i, "[", "]");
      if (end < 0 || input[end + 1] !== "(") { text += input[i++]; continue; }
      const close = matchingDelimiter(input, end + 1, "(", ")");
      if (close < 0) throw new Error("Unclosed topic link");
      const phrase = parse(input.slice(i + 1, end));
      if (!phrase.text.trim()) throw new Error("Topic links must wrap visible text");
      const start = text.length;
      text += phrase.text;
      ranges.push(
        ...phrase.ranges.map((range) => ({
          ...range,
          start: range.start + start,
          end: range.end + start,
        })),
      );
      const target = input.slice(end + 2, close);
      const href = externalHref(target);
      if (href) {
        ranges.push({text: phrase.text, href, start, end: text.length});
      } else {
        const tags = parseTopicIds(target, allowed);
        for (const tag of tags) allTags.add(tag);
        ranges.push({text: phrase.text, tags, start, end: text.length});
      }
      i = close + 1;
    }
    return {text, ranges};
  }
  const parsed = parse(source);
  const leading = parsed.text.length - parsed.text.trimStart().length;
  const text = parsed.text.trim();
  const trailing = leading + text.length;
  const normalizedRanges = parsed.ranges
    .filter(({ start, end }) => start < trailing && end > leading)
    .map((range) => {
      const start = Math.max(range.start, leading) - leading;
      const end = Math.min(range.end, trailing) - leading;
      return {...range, text: text.slice(start, end), start, end};
    });
  return {
    text,
    tags: [...allTags],
    emphases: normalizedRanges.filter(({ tags }) => tags),
    links: normalizedRanges.filter(({ href }) => href),
  };
}

export function filtersWithoutEvidence({ filters, work }) {
  const evidence = new Set(work.flatMap(({ tags }) => tags));
  return filters.filter(({ id }) => !evidence.has(id)).map(({ id }) => id);
}

export function warnFiltersWithoutEvidence(data, warn = console.warn) {
  const ids = filtersWithoutEvidence(data);
  if (ids.length)
    warn(`CV warning: configured tags without individual experience evidence: ${ids.join(", ")}`);
  return ids;
}

function section(source, heading) {
  const marker = `## ${heading}`;
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const after = source.slice(start + marker.length).replace(/^\r?\n/, "");
  const next = after.search(/^## /m);
  return (next < 0 ? after : after.slice(0, next)).trim();
}

function parseThemes(source, allowed, file) {
  if (!source) return [];
  const parts = source.split(/^### (.+)$/m);
  if (parts[0].trim()) throw new Error(`${file}: expected a theme heading`);
  const themes = [];
  for (let index = 1; index < parts.length; index += 2) {
    const organizations = parts[index].split("|").map((name) => name.trim());
    const text = parts[index + 1]?.trim();
    if (!text || organizations.some((name) => !name))
      throw new Error(`${file}: invalid theme`);
    themes.push({ organizations, ...parseTopicText(text, allowed) });
  }
  return themes;
}

function loadGroup(file, allowed) {
  const source = fs.readFileSync(file, "utf8");
  const title = source.match(/^# (.+)$/m)?.[1];
  if (!title) throw new Error(`${file.pathname}: missing title`);
  const before = source.match(/^Before:\s*(\d{4})\s*$/m)?.[1];
  const tagSource = source.match(/^Tags:\s*(.+)$/m)?.[1];
  return {
    title,
    ...(before ? { before } : {}),
    ...(tagSource ? { tags: parseTopicText(tagSource, allowed).tags } : {}),
    titleThemes: parseThemes(section(source, "Title themes"), allowed, file.pathname),
    themes: parseThemes(section(source, "Summary themes"), allowed, file.pathname),
  };
}

export function loadContent(directory = new URL("./", import.meta.url)) {
  const allowed = new Set(config.filters.map(({id}) => id));
  const experienceDir = new URL("experiences/", directory);
  const work = fs.readdirSync(experienceDir).filter((name) => name.endsWith(".md")).sort().map((name) => {
    const source = fs.readFileSync(new URL(name, experienceDir), "utf8");
    const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`${name}: missing YAML metadata`);
    const meta = YAML.parse(match[1]);
    if ("tags" in meta || "keywords" in meta) throw new Error(`${name}: wrap text in topic links instead of listing topics in metadata`);
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
    const tags = [...new Set([...summary.tags, ...role.tags, ...highlights.flatMap((p) => p.tags)])];
    for (const tag of tags) if (!allowed.has(tag)) throw new Error(`${name}: unknown topic ${tag}`);
    return {
      ...meta,
      role: role.text,
      roleEmphases: role.emphases,
      roleLinks: role.links,
      summary: summary.text,
      summaryTags: summary.tags,
      summaryEmphases: summary.emphases,
      summaryLinks: summary.links,
      highlights,
      tags,
    };
  });
  const recentWork = loadGroup(new URL("groups/recent-work.md", directory), allowed);
  const earlierWork = loadGroup(new URL("groups/earlier-work.md", directory), allowed);
  const organizations = new Set(work.map(({ organization }) => organization));
  for (const group of [recentWork, earlierWork])
    for (const theme of [...group.titleThemes, ...group.themes]) {
      if (group.themes.includes(theme) && theme.organizations.length < 2)
        throw new Error(`${group.title}: a one-role summary belongs in that role's Markdown file`);
      for (const organization of theme.organizations)
        if (!organizations.has(organization))
          throw new Error(`${organization}: referenced by a group but has no Markdown experience`);
    }
  return {...config, recentWork, earlierWork, work};
}
