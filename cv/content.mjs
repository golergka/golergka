import fs from "node:fs";
import YAML from "yaml";

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

export function loadContent(directory = new URL("./", import.meta.url)) {
  const config = YAML.parse(fs.readFileSync(new URL("config.yaml", directory), "utf8"));
  const allowed = new Set([...config.filters.map(({id}) => id), ...Object.keys(config.topicAliases || {})]);
  for (const group of [config.recentWork, config.earlierWork]) {
    if (!group?.themes) continue;
    group.themes = group.themes.map((theme) => ({
      ...theme,
      ...parseTopicText(theme.text, allowed),
    }));
  }
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
  return {...config, work};
}
