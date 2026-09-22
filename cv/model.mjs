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

export function expandedRoots(filters, selected, aliases = {}, relations = []) {
  const parents = topicParents(filters);
  const graph = buildTopicGraph(filters, relations);
  const roots = new Set();
  const queue = canonicalTags([...selected], aliases);
  const visited = new Set();
  while (queue.length) {
    const tag = queue.shift();
    if (visited.has(tag)) continue;
    visited.add(tag);
    let root = tag;
    while (parents.has(root)) root = parents.get(root);
    roots.add(root);
    for (const { to } of graph.get(tag) || []) queue.push(to);
  }
  return roots;
}

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

export function sourceForTag(tag, selected, aliases = {}, graph) {
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

export function matchSources(tags, selected, aliases = {}, graph) {
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

export function filtersWithEvidence(filters, work, aliases = {}) {
  const evidence = new Set(
    work.flatMap((item) => canonicalTags(workTags(item), aliases)),
  );
  const parents = topicParents(filters);
  for (const tag of [...evidence]) {
    let parent = parents.get(tag);
    while (parent) {
      evidence.add(parent);
      parent = parents.get(parent);
    }
  }
  return filters.filter(({ id }) => evidence.has(id));
}

export const workPoints = (item) => item.highlights;

export function expertiseLabels(filters, selected = new Set()) {
  filters = filters.filter(({ kind }) => kind !== "faq");
  const selectedFilters = filters.filter(({ id }) => selected.has(id));
  const active = selectedFilters.length
    ? selectedFilters
    : filters.filter(({ parent }) => !parent);
  return active.map(({ label }) => label);
}

// The PDF records the explicit selection, rather than the expanded selector.
export const selectedExpertiseLabels = (filters, selected = new Set()) =>
  filters.filter(({ id }) => selected.has(id)).map(({ label }) => label);

export function partitionWork(data, selected = new Set()) {
  const individual = [],
    grouped = [],
    recentGrouped = [];
  const graph = buildTopicGraph(data.filters, data.topicRelations);
  data.work.forEach((item, index) => {
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
    const target = older && irrelevant
      ? grouped
      : selected.size && irrelevant && data.recentWork
        ? recentGrouped
        : individual;
    target.push({ item, index });
  });
  return { individual, grouped, recentGrouped };
}

// Group headings have a fixed timeline position. Their members change with the
// selected topics, but a collapsed group must not move behind a now-visible
// experience from the same period.
export function workGroupAnchors(data) {
  const eligible = (item) => !data.cvStart || item.start >= data.cvStart;
  const older = (item) =>
    data.earlierWork &&
    item.end !== "present" &&
    item.end.slice(0, 4) < data.earlierWork.before;
  return {
    recent: data.work.findIndex((item) => eligible(item) && !older(item)),
    earlier: data.work.findIndex((item) => eligible(item) && older(item)),
  };
}

export function highlightRanges(point, selected, labels, aliases, graph) {
  const matching = matchSources(point.tags, selected, aliases, graph);
  const rawEmphases = point.emphases?.length
    ? point.emphases
    : point.emphasis
      ? [{ text: point.emphasis, tags: point.emphasisTags || point.tags || [] }]
      : [];
  const explicitEmphases = rawEmphases
    .map((emphasis) => {
      const hasRange =
        Number.isInteger(emphasis.start) &&
        Number.isInteger(emphasis.end) &&
        emphasis.start >= 0 &&
        emphasis.end >= emphasis.start &&
        point.text.slice(emphasis.start, emphasis.end) === emphasis.text;
      const start = hasRange
        ? emphasis.start
        : point.text.indexOf(emphasis.text);
      if (start < 0 || !emphasis.text) return null;
      const hoverTags = canonicalTags(emphasis.tags || [], aliases);
      const sources = matchSources(hoverTags, selected, aliases, graph);
      return {
        ...emphasis,
        start,
        end: start + emphasis.text.length,
        hoverTags,
        sources,
        tags: sources.map(({ topic }) => topic),
        derived: sources.length > 0 && sources.every(({ derived }) => derived),
        selected: sources.length > 0,
      };
    })
    .filter(Boolean);
  const explicitlyCovered = new Set(
    explicitEmphases
      .filter(({ selected }) => selected)
      .flatMap(({ tags }) => tags),
  );
  const automaticEmphases = matching
    .filter(({ topic, derived }) => !derived && !explicitlyCovered.has(topic))
    .map(({ topic, derived }) => ({
      text: labels.get(topic),
      tags: [topic],
      hoverTags: [topic],
      sources: [{ topic, derived }],
      derived: false,
      selected: true,
    }))
    .map((emphasis) => ({
      ...emphasis,
      start: point.text.indexOf(emphasis.text),
      end: point.text.indexOf(emphasis.text) + emphasis.text.length,
    }))
    .filter(({ text, start }) => text && start >= 0);
  const linkEmphases = (point.links || [])
    .filter(
      ({ text, href, start, end }) =>
        text &&
        href &&
        Number.isInteger(start) &&
        Number.isInteger(end) &&
        point.text.slice(start, end) === text,
    );
  const emphases = [...explicitEmphases, ...automaticEmphases, ...linkEmphases];
  const boundaries = [...new Set(emphases.flatMap(({ start, end }) => [start, end]))]
    .sort((left, right) => left - right);
  const ranges = [];
  for (let index = 0; index < boundaries.length - 1; index++) {
    const [start, end] = boundaries.slice(index, index + 2);
    const covered = emphases.filter(
      (emphasis) => emphasis.start <= start && emphasis.end >= end,
    );
    if (!covered.length) continue;
    const hoverTags = [...new Set(covered.flatMap(({ hoverTags = [] }) => hoverTags))];
    const sources = new Map();
    for (const emphasis of covered)
      for (const source of emphasis.sources || []) {
        const previous = sources.get(source.topic);
        if (!previous || (previous.derived && !source.derived))
          sources.set(source.topic, source);
      }
    const selectedSources = [...sources.values()];
    ranges.push({
      text: point.text.slice(start, end),
      start,
      end,
      href: covered.find(({ href }) => href)?.href,
      hoverTags,
      sources: selectedSources,
      tags: selectedSources.map(({ topic }) => topic),
      derived:
        selectedSources.length > 0 &&
        selectedSources.every(({ derived }) => derived),
      selected: selectedSources.length > 0,
    });
  }
  return ranges.reduce((merged, range) => {
    const previous = merged.at(-1);
    const sameTopics =
      previous &&
      previous.tags.length === range.tags.length &&
      previous.tags.every((tag, index) => tag === range.tags[index]);
    if (
      previous?.end === range.start &&
      previous.selected &&
      range.selected &&
      sameTopics &&
      previous.derived === range.derived &&
      previous.href === range.href
    ) {
      previous.end = range.end;
      previous.text += range.text;
      previous.hoverTags = [
        ...new Set([...previous.hoverTags, ...range.hoverTags]),
      ];
      return merged;
    }
    merged.push({ ...range });
    return merged;
  }, []);
}
