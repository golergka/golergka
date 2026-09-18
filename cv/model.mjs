export const defaultTags = [
  "evals",
  "livekit",
  "knowledge-graphs",
];

export const canonicalTags = (tags, aliases = {}) => [
  ...new Set(tags.map((tag) => aliases[tag] || tag)),
];
export const topicParents = (filters) =>
  new Map(
    filters
      .filter(({ parent }) => parent)
      .map(({ id, parent }) => [id, parent]),
  );

export function buildTopicGraph(filters, relations = []) {
  const graph = new Map(filters.map(({ id }) => [id, []]));
  for (const { id, parent } of filters) {
    if (parent && graph.has(parent))
      graph.get(parent).push({ to: id, kind: "child" });
  }
  for (const { from, to } of relations) {
    if (graph.has(from) && graph.has(to))
      graph.get(from).push({ to, kind: "related" });
  }
  return graph;
}

export function sourceForTag(tag, selected, aliases, graph) {
  const target = aliases[tag] || tag;
  const queue = [...selected].map((topic) => ({
    node: aliases[topic] || topic,
    topic: aliases[topic] || topic,
    depth: 0,
    derived: false,
  }));
  const visited = new Map();
  while (queue.length) {
    const current = queue.shift();
    const prior = visited.get(current.node);
    if (prior === false || (prior === true && current.derived)) continue;
    visited.set(current.node, current.derived);
    if (current.node === target)
      return { topic: current.topic, derived: current.derived };
    for (const edge of graph.get(current.node) || []) {
      queue.push({
        node: edge.to,
        topic: current.topic,
        depth: current.depth + 1,
        derived:
          current.derived || edge.kind === "related" || current.depth >= 1,
      });
    }
  }
  return null;
}

export function matchSources(tags, selected, aliases, graph) {
  const sources = new Map();
  for (const tag of canonicalTags(tags, aliases)) {
    const source = sourceForTag(tag, selected, aliases, graph);
    if (!source) continue;
    const previous = sources.get(source.topic);
    if (!previous || (previous.derived && !source.derived))
      sources.set(source.topic, source);
  }
  return [...sources.values()];
}

export const matchesTags = (tags, selected, aliases, graph) =>
  matchSources(tags, selected, aliases, graph).length > 0;

export const workTags = (item) => item.tags;

export const workPoints = (item) => item.highlights;

export function expertiseLabels(filters, selected = new Set()) {
  filters = filters.filter(({ kind }) => kind !== "faq");
  const selectedFilters = filters.filter(({ id }) => selected.has(id));
  const active = selectedFilters.length
    ? selectedFilters
    : filters.filter(({ parent }) => !parent);
  return active.map(({ label }) => label);
}

export function partitionWork(data, selected = new Set(), expandedExperiences = new Set()) {
  const individual = [],
    grouped = [],
    recentGrouped = [];
  const graph = buildTopicGraph(data.filters, data.topicRelations);
  data.work.forEach((item, index) => {
    if (data.cvStart && item.start < data.cvStart) return;
    const older =
      data.earlierWork &&
      item.end !== "present" &&
      item.end.slice(0, 4) < data.earlierWork.before;
    const irrelevant = !matchesTags(
      workTags(item),
      selected,
      data.topicAliases,
      graph,
    );
    const target =
      expandedExperiences.has(index) ? individual : older && irrelevant
        ? grouped
        : selected.size && irrelevant && data.recentWork
          ? recentGrouped
          : individual;
    target.push({ item, index });
  });
  return { individual, grouped, recentGrouped };
}

export function highlightRanges(point, selected, labels, aliases, graph) {
  const matching = matchSources(point.tags, selected, aliases, graph);
  const rawEmphases = point.emphases?.length
    ? point.emphases
    : point.emphasis
      ? [{ text: point.emphasis, tags: point.emphasisTags || point.tags || [] }]
      : [];
  const explicitEmphases = rawEmphases
    .filter(({ text }) => point.text.includes(text))
    .map((emphasis) => {
      const hoverTags = canonicalTags(emphasis.tags || [], aliases);
      const sources = matchSources(hoverTags, selected, aliases, graph);
      return {
        ...emphasis,
        hoverTags,
        sources,
        tags: sources.map(({ topic }) => topic),
        derived: sources.length > 0 && sources.every(({ derived }) => derived),
        selected: sources.length > 0,
      };
    });
  const explicitlyCovered = new Set(
    explicitEmphases
      .filter(({ selected }) => selected)
      .flatMap(({ tags }) => tags),
  );
  const automaticEmphases = matching
    .filter(({ topic, derived }) => !derived && !explicitlyCovered.has(topic))
    .map(({ topic }) => ({
      text: labels.get(topic),
      tags: [topic],
      hoverTags: [topic],
      derived: false,
      selected: true,
    }))
    .filter(({ text }) => text && point.text.includes(text));
  const emphases = [...explicitEmphases, ...automaticEmphases];
  return emphases
    .map((emphasis) => ({
      ...emphasis,
      start: point.text.indexOf(emphasis.text),
      end: point.text.indexOf(emphasis.text) + emphasis.text.length,
    }))
    .sort((a, b) => Number(b.selected) - Number(a.selected) || (a.selected ? (b.end - b.start) - (a.end - a.start) : (a.end - a.start) - (b.end - b.start)))
    .filter(
      (range, index, ranges) =>
        !ranges.slice(0, index).some((prior) => range.start < prior.end && prior.start < range.end),
    ).sort((a, b) => a.start - b.start);
}
