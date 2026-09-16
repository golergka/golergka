export const defaultTags = ["automation", "evals", "livekit", "knowledge-graphs"];

export const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (date) => date === "present" ? "present" : date.includes("-")
  ? `${months[Number(date.slice(5)) - 1]} ${date.slice(0, 4)}` : date;
const dateHtml = (date) => date === "present" ? "present" : `<time datetime="${escapeHtml(date)}">${dateLabel(date)}</time>`;
const periodHtml = ({ start, end }) => start === end ? dateHtml(start) : `${dateHtml(start)} – ${dateHtml(end)}`;
const canonicalTags = (tags, aliases = {}) => [...new Set(tags.map((tag) => aliases[tag] || tag))];
const topicParents = (filters) => new Map(filters.filter(({parent}) => parent).map(({id, parent}) => [id, parent]));

export function buildTopicGraph(filters, relations = []) {
  const graph = new Map(filters.map(({id}) => [id, []]));
  for (const {id, parent} of filters) {
    if (parent && graph.has(parent)) graph.get(parent).push({to: id, kind: "child"});
  }
  for (const {from, to} of relations) {
    if (graph.has(from) && graph.has(to)) graph.get(from).push({to, kind: "related"});
  }
  return graph;
}

export function sourceForTag(tag, selected, aliases, graph) {
  const target = aliases[tag] || tag;
  const queue = [...selected].map((topic) => ({node: aliases[topic] || topic, topic: aliases[topic] || topic, depth: 0, derived: false}));
  const visited = new Map();
  while (queue.length) {
    const current = queue.shift();
    const prior = visited.get(current.node);
    if (prior === false || (prior === true && current.derived)) continue;
    visited.set(current.node, current.derived);
    if (current.node === target) return {topic: current.topic, derived: current.derived};
    for (const edge of graph.get(current.node) || []) {
      queue.push({
        node: edge.to,
        topic: current.topic,
        depth: current.depth + 1,
        derived: current.derived || edge.kind === "related" || current.depth >= 1,
      });
    }
  }
  return null;
}

function matchSources(tags, selected, aliases, graph) {
  const sources = new Map();
  for (const tag of canonicalTags(tags, aliases)) {
    const source = sourceForTag(tag, selected, aliases, graph);
    if (!source) continue;
    const previous = sources.get(source.topic);
    if (!previous || (previous.derived && !source.derived)) sources.set(source.topic, source);
  }
  return [...sources.values()];
}

export const matchesTags = (tags, selected, aliases, graph) => matchSources(tags, selected, aliases, graph).length > 0;

function highlightText(point, selected, labels, aliases, graph) {
  const matching = matchSources(point.tags, selected, aliases, graph);
  const rawEmphases = point.emphases?.length ? point.emphases
    : point.emphasis ? [{text: point.emphasis, tags: point.emphasisTags || point.tags || []}] : [];
  const explicitEmphases = rawEmphases.filter(({text}) => point.text.includes(text)).map((emphasis) => {
    const hoverTags = canonicalTags(emphasis.tags || [], aliases);
    const sources = matchSources(hoverTags, selected, aliases, graph);
    return {
      ...emphasis,
      hoverTags,
      sources,
      tags: sources.map(({topic}) => topic),
      derived: sources.length > 0 && sources.every(({derived}) => derived),
      selected: sources.length > 0,
    };
  });
  const explicitlyCovered = new Set(explicitEmphases.filter(({selected}) => selected).flatMap(({tags}) => tags));
  const automaticEmphases = matching.filter(({topic, derived}) => !derived && !explicitlyCovered.has(topic))
    .map(({topic}) => ({text: labels.get(topic), tags: [topic], hoverTags: [topic], derived: false, selected: true}))
    .filter(({text}) => text && point.text.includes(text));
  const emphases = [...explicitEmphases, ...automaticEmphases];
  if (emphases.length) {
    const ranges = emphases.map((emphasis) => ({
      ...emphasis,
      start: point.text.indexOf(emphasis.text),
      end: point.text.indexOf(emphasis.text) + emphasis.text.length,
    })).sort((a, b) => a.start - b.start || b.end - a.end)
      .filter((range, index, ranges) => !ranges.slice(0, index).some((prior) => range.start < prior.end));
    let cursor = 0;
    return ranges.map((range) => {
      const prefix = escapeHtml(point.text.slice(cursor, range.start));
      cursor = range.end;
      const hoverTopics = escapeHtml(range.hoverTags.join(","));
      const hoverTitle = escapeHtml(range.hoverTags.map((tag) => labels.get(tag)).filter(Boolean).join(", "));
      if (!range.selected) return `${prefix}<span class="cv-highlightable" data-highlightable-topics="${hoverTopics}" role="button" tabindex="0" title="${hoverTitle}">${escapeHtml(range.text)}</span>`;
      return `${prefix}<mark data-highlight-topics="${escapeHtml(range.tags.join(","))}" data-highlightable-topics="${hoverTopics}" role="button" tabindex="0"${range.derived ? ' data-highlight-derived="true"' : ""} title="${escapeHtml(range.tags.map((tag) => labels.get(tag)).join(", "))}">${escapeHtml(range.text)}</mark>`;
    }).join("") + escapeHtml(point.text.slice(cursor));
  }
  return escapeHtml(point.text);
}

const renderPoint = (point, selected, labels, aliases, graph) => `<li>${highlightText(point, selected, labels, aliases, graph)}</li>`;

export function renderProfile(profile) {
  return `<p class="cv-headline">${escapeHtml(profile.headline)}</p>
    <p class="cv-global-lead">${escapeHtml(profile.summary)}</p>
    <p class="cv-links"><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span aria-hidden="true"> · </span><a href="${escapeHtml(profile.github)}">GitHub</a>${profile.linkedin ? `<span aria-hidden="true"> · </span><a href="${escapeHtml(profile.linkedin)}">LinkedIn</a>` : ""}<span aria-hidden="true"> · </span><a href="${escapeHtml(profile.stackoverflow)}">Stack Overflow</a></p>`;
}

export function expertiseLabels(filters, selected = new Set()) {
  const active = selected.size ? filters.filter(({id}) => selected.has(id)) : filters.filter(({parent}) => !parent);
  return active.map(({label}) => label);
}

export function renderExpertise(filters, selected = new Set()) {
  return `<p id="cv-expertise" class="cv-expertise"><strong>Selected expertise:</strong> <span id="cv-expertise-topics">${expertiseLabels(filters, selected).map(escapeHtml).join(" · ")}</span></p>`;
}

export function renderCredentials({education = [], languages = []}) {
  return `<div class="cv-credentials">
    ${education.length ? `<section class="cv-credential-section"><h2>Education</h2><p>${education.map(escapeHtml).join(" · ")}</p></section>` : ""}
    ${languages.length ? `<section class="cv-credential-section"><h2>Languages</h2><p>${languages.map(escapeHtml).join(" · ")}</p></section>` : ""}
  </div>`;
}

function renderFilterTree(filters, renderNode) {
  const ids = new Set(filters.map(({id}) => id));
  const children = new Map(filters.map(({id}) => [id, []]));
  const roots = [];
  for (const filter of filters) {
    if (filter.parent && ids.has(filter.parent)) children.get(filter.parent).push(filter);
    else roots.push(filter);
  }
  const renderBranch = (filter, depth) => {
    const childFilters = children.get(filter.id);
    return renderNode(filter, depth, childFilters.map((child) => renderBranch(child, depth + 1)).join(""), childFilters.length);
  };
  return roots.map((filter) => renderBranch(filter, 0)).join("");
}

export function renderTags(filters) {
  return renderFilterTree(filters, (tag, depth, children, childCount) => {
    const option = `<span class="cv-topic-select" data-select-tag="${escapeHtml(tag.id)}" role="button" tabindex="0" aria-pressed="false">${escapeHtml(tag.label)}</span>`;
    return `<div class="cv-filter-node" data-depth="${depth}" data-topic-id="${escapeHtml(tag.id)}">${option}${childCount
      ? `<div class="cv-topic-children">${children}</div>` : ""}</div>`;
  });
}

export function partitionWork(data, selected = new Set()) {
  const individual = [], grouped = [], recentGrouped = [];
  const graph = buildTopicGraph(data.filters, data.topicRelations);
  data.work.forEach((item, index) => {
    if (data.cvStart && item.start < data.cvStart) return;
    const older = data.earlierWork && item.end !== "present" && item.end.slice(0, 4) < data.earlierWork.before;
    const irrelevant = !matchesTags(item.tags, selected, data.topicAliases, graph);
    const target = older && irrelevant ? grouped
      : selected.size && irrelevant && data.recentWork ? recentGrouped : individual;
    target.push({ item, index });
  });
  return { individual, grouped, recentGrouped };
}

export function renderWork(data, selected = new Set(), { staticView = false, compact = false, complete = false } = {}) {
  const labels = new Map(data.filters.map(({ id, label }) => [id, label]));
  const aliases = data.topicAliases || {};
  const parents = topicParents(data.filters);
  const graph = buildTopicGraph(data.filters, data.topicRelations);
  const { individual, grouped, recentGrouped } = partitionWork(data, selected);
  // Individual entries and the expandable history each retain source chronology.
  function renderEntry({item, index}) {
    const relevant = matchesTags(item.tags, selected, aliases, graph);
    const points = item.highlights.map((point, order) => {
      const tags = canonicalTags(point.tags, aliases);
      const matchedTopics = matchSources(tags, selected, aliases, graph).map(({topic}) => topic);
      return { ...point, tags, matchedTopics, order, score: matchedTopics.length };
    });
    const preview = [];
    const uncovered = new Set(selected);
    const eligible = selected.size ? points.filter((point) => point.score) : [...points];
    // Default stays short; an explicit topic selection reveals all matching evidence.
    const previewLimit = complete ? eligible.length : selected.size ? eligible.length : 2;
    while (preview.length < previewLimit && eligible.length) {
      eligible.sort((a, b) => b.matchedTopics.filter((tag) => uncovered.has(tag)).length - a.matchedTopics.filter((tag) => uncovered.has(tag)).length || a.order - b.order);
      const point = eligible.shift();
      preview.push(point);
      point.matchedTopics.forEach((tag) => uncovered.delete(tag));
    }
    const remaining = points.filter((point) => !preview.includes(point));
    const suggestedTags = data.filters.filter(({id}) => !sourceForTag(id, selected, aliases, graph)
      && remaining.some((point) => point.tags.includes(id)));
    const directSuggestedIds = new Set(suggestedTags.map(({id}) => id));
    const suggestedIds = new Set(directSuggestedIds);
    for (const tag of suggestedTags) {
      let parent = tag.parent;
      while (parent) {
        suggestedIds.add(parent);
        parent = parents.get(parent);
      }
    }
    const suggestionTree = data.filters.filter(({id}) => suggestedIds.has(id));
    const artifacts = (item.artifacts || []).map((name) => data.artifacts.find((artifact) => artifact.name === name)).filter((artifact) => artifact?.url);
    const links = [...(item.links || []), ...artifacts.map(({name, url}) => ({label: name, url}))];
    const organization = item.url
      ? `<a href="${escapeHtml(item.url)}">${escapeHtml(item.organization)}</a>`
      : escapeHtml(item.organization);
    const role = highlightText({text: item.role, tags: item.tags, emphases: item.roleEmphases || []}, selected, labels, aliases, graph);
    return `<article class="cv-role${relevant ? " cv-relevant" : ""}" id="experience-${index}">
      <h3 class="cv-role-title">${organization} <span class="cv-role-separator">/</span> <span class="cv-role-name">${role}</span></h3>
      <p class="cv-role-meta">${periodHtml(item)}<span aria-hidden="true"> · </span>${escapeHtml(item.location)}</p>
      <p class="cv-summary">${highlightText({text: item.summary, emphasis: item.summaryEmphasis, emphasisTags: item.summaryEmphasisTags, emphases: item.summaryEmphases, tags: item.summaryTags || []}, selected, labels, aliases, graph)}</p>
      ${preview.length ? `<ul class="cv-points">${preview.map((point) => renderPoint(point, selected, labels, aliases, graph)).join("")}</ul>` : ""}
      ${remaining.length && !compact ? staticView
        ? `<ul class="cv-points">${remaining.map((point) => renderPoint(point, selected, labels, aliases, graph)).join("")}</ul>`
        : suggestedTags.length ? `<div class="cv-topic-suggestions"><span class="cv-topic-suggestions-label">Explore related topics</span><div class="cv-suggestion-options cv-topic-list">${renderFilterTree(suggestionTree, ({id, label}, depth, children, childCount) => {
          const option = directSuggestedIds.has(id) && !selected.has(id)
            ? `<span class="cv-topic-select" role="button" tabindex="0" data-add-tag="${escapeHtml(id)}">${escapeHtml(label)}</span>`
            : `<span class="cv-topic-select cv-topic-placeholder">${escapeHtml(label)}</span>`;
          return `<div class="cv-suggestion-node" data-depth="${depth}">${option}${childCount
            ? `<div class="cv-topic-children">${children}</div>` : ""}</div>`;
        })}</div></div>` : "" : ""}
      ${links.length ? `<p class="cv-evidence">${links.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join(" · ")}</p>` : ""}
    </article>`;
  }

  function renderGroup(members, config, id) {
  if (!members.length) return "";
  const organizations = new Set(members.map(({item}) => item.organization));
  const titleTopics = (config.titleThemes || [])
    .filter((theme) => theme.organizations.some((name) => organizations.has(name)))
    .map((theme) => theme.text).join(" & ");
  const summary = config.themes
    .filter((theme) => theme.organizations.some((name) => organizations.has(name)))
    .map((theme) => escapeHtml(theme.text)).join(" ");
  const years = members.flatMap(({item}) => [item.start.slice(0, 4), item.end === "present" ? "present" : item.end.slice(0, 4)]).sort();
  const period = years[0] === years.at(-1) ? years[0] : `${years[0]}–${years.at(-1)}`;
  return `<section class="cv-earlier" aria-labelledby="${id}-heading">
    <h3 class="cv-role-title" id="${id}-heading">${escapeHtml(config.title)}${titleTopics ? ` <span class="cv-role-separator">/</span> <span class="cv-role-name">${escapeHtml(titleTopics)}</span>` : ""}</h3>
    <p class="cv-role-meta">${period} · ${members.length} ${members.length === 1 ? "experience" : "experiences"}</p>
    <p class="cv-summary">${summary}</p>
    ${complete ? members.map(renderEntry).join("") : staticView ? "" : `<details class="cv-archive" id="${id}-details">
      <summary>Explore ${members.length === 1 ? "this experience" : `these ${members.length} experiences`}</summary>
      ${members.map(renderEntry).join("")}
    </details>`}
  </section>`;
  }

  // A group occupies the position of its newest member, not the end of the CV.
  const timeline = individual.map((entry) => ({ index: entry.index, html: renderEntry(entry) }));
  for (const [members, config, id] of [
    [recentGrouped, data.recentWork, "recent-work"],
    [grouped, data.earlierWork, "earlier-work"],
  ]) {
    if (members.length) timeline.push({ index: members[0].index, html: renderGroup(members, config, id) });
  }
  return timeline.sort((a, b) => a.index - b.index).map(({html}) => html).join("");
}
