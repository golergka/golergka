import {
  canonicalTags,
  matchSources,
  matchesTags,
  partitionWork,
  projectSlots,
  workGroupAnchors,
  workPoints,
  workTags,
} from "../model.mjs";
import { Highlight } from "./topics.jsx";

const projectColumns = 2;
function DateLabel({ value }) {
  return value === "present" ? (
    "present"
  ) : (
    <time dateTime={value}>{value.slice(0, 4)}</time>
  );
}

function Experience({ item, index, data, context, compact }) {
  const { selected, aliases, graph } = context;
  const points = workPoints(item, selected, data.filters).map(
    (point, order) => {
      const tags = canonicalTags(point.tags, aliases);
      const matchedTopics = matchSources(tags, selected, aliases, graph).map(
        ({ topic }) => topic,
      );
      return {
        ...point,
        tags,
        matchedTopics,
        order,
        score: matchedTopics.length,
      };
    },
  );
  // Keep the first two Markdown bullets visible in every view. A selection
  // can add relevant evidence, but must never hide the overview preview.
  const preview = points.filter(
    (point) => point.order < 2 || (selected.size && point.score),
  );
  const remaining = points.filter((point) => !preview.includes(point));
  const pointList = (items) => (
    <ul class="cv-points">
      {items.map((point) => (
        <li key={point.order}>
          <Highlight point={point} context={context} />
        </li>
      ))}
    </ul>
  );
  return (
    <article
      class={`cv-role${matchesTags(workTags(item), selected, aliases, graph) ? " cv-relevant" : ""}`}
      id={`experience-${index}`}
    >
      <h3 class="cv-role-title">
        {item.organization}{" "}
        <span class="cv-role-separator">/</span>{" "}
        <span class="cv-role-name">
          <Highlight
            point={{
              text: item.role,
              tags: item.tags,
              emphases: item.roleEmphases || [],
              links: item.roleLinks || [],
            }}
            context={context}
          />
        </span>
      </h3>
      <p class="cv-role-meta">
        <DateLabel value={item.start} />
        {item.start !== item.end && (
          <>
            {" "}
            – <DateLabel value={item.end} />
          </>
        )}
        <span aria-hidden="true"> · </span>
        {item.location}
      </p>
      <p class="cv-summary">
        <Highlight
          point={{
            text: item.summary,
            emphasis: item.summaryEmphasis,
            emphasisTags: item.summaryEmphasisTags,
            emphases: item.summaryEmphases,
            links: item.summaryLinks,
            tags: item.summaryTags || [],
          }}
          context={context}
        />
      </p>
      {preview.length > 0 && pointList(preview)}
      {!compact && remaining.length > 0 && (
        <details class="cv-archive cv-experience-details">
          <summary>
            <span class="cv-experience-show-full">Show full experience</span>
            <span class="cv-experience-show-highlights">Show highlights</span>
          </summary>
          {pointList(remaining)}
        </details>
      )}
    </article>
  );
}

function ExperienceGroup({ members, config, id, data, context, compact }) {
  const organizations = new Set(members.map(({ item }) => item.organization));
  const themes = (items) =>
    items
      .filter((theme) =>
        theme.organizations.some((name) => organizations.has(name)),
      )
  const title = themes(config.titleThemes || []).map(({ text }) => text).join(" & ");
  const summaryThemes = themes(config.themes);
  const tagLabel = (config.tags || [])
    .map((tag) => context.labels.get(tag) || tag)
    .join(" · ");
  const years = members
    .flatMap(({ item }) => [
      item.start.slice(0, 4),
      item.end === "present" ? "present" : item.end.slice(0, 4),
    ])
    .sort();
  return (
    <section class="cv-earlier" aria-labelledby={`${id}-heading`}>
      <h3 class="cv-role-title" id={`${id}-heading`}>
        <Highlight
          point={{ text: config.title, tags: config.tags || [] }}
          context={context}
        />
        {tagLabel && (
          <>
            {" "}
            <span class="cv-role-separator">/</span>{" "}
            <span class="cv-role-name">
              <Highlight point={{ text: tagLabel, tags: config.tags }} context={context} />
            </span>
          </>
        )}
        {title && (
          <>
            {" "}
            <span class="cv-role-separator">/</span>{" "}
            <span class="cv-role-name">{title}</span>
          </>
        )}
      </h3>
      <p class="cv-role-meta">
        {years[0]}
        {years[0] !== years.at(-1) && `–${years.at(-1)}`} · {members.length}{" "}
        {members.length === 1 ? "experience" : "experiences"}
      </p>
      <p class="cv-summary">
        {summaryThemes.map((theme) => (
          <span key={theme.text}>
            <Highlight point={theme} context={context} />{" "}
          </span>
        ))}
      </p>
      {!compact && (
        <details class="cv-archive" id={`${id}-details`}>
          <summary>
            Explore{" "}
            {members.length === 1
              ? "this experience"
              : `these ${members.length} experiences`}
          </summary>
          {members.map((entry) => (
            <Experience
              key={entry.index}
              {...entry}
              data={data}
              context={context}
            />
          ))}
        </details>
      )}
    </section>
  );
}

export function Work({ data, context, compact = false }) {
  const { individual, grouped, recentGrouped } = partitionWork(data, context.selected);
  const anchors = workGroupAnchors(data);
  const slots = context.projectLayout
    ? projectSlots(data, context.selected, context.graph) : new Map();
  const timeline = individual.map((entry) => ({
    index: entry.index,
    node: (
      <Experience
        key={entry.index}
        {...entry}
        data={data}
        context={context}
        compact={compact}
      />
    ),
  }));
  for (const [members, config, id, anchor] of [
    [recentGrouped, data.recentWork, "recent-work", anchors.recent],
    [grouped, data.earlierWork, "earlier-work", anchors.earlier],
  ]) {
    // Split collapsed experience at project boundaries, retaining chronological placement.
    const chunks = [];
    for (const member of members) {
      const previous = chunks.at(-1)?.at(-1);
      if (!previous || [...slots.keys()].some((index) => index >= previous.index && index < member.index)) chunks.push([]);
      chunks.at(-1).push(member);
    }
    for (const [chunkIndex, chunk] of chunks.entries()) {
      const chunkId = chunkIndex ? `${id}-${chunkIndex}` : id;
      timeline.push({
        index: chunkIndex ? chunk[0].index : anchor,
        node: <ExperienceGroup key={chunkId} members={chunk} config={config}
          id={chunkId} data={data} context={context} compact={compact} />,
      });
    }
  }
  for (const [index, projects] of slots) {
    timeline.push({
      index: index + 0.5,
      node: <aside key={`projects-${index}`} class="cv-project-insert" aria-label="Related projects">
        <div class="cv-project-notes" data-project-columns={projectColumns} style={{ "--cv-project-columns": projectColumns }}>
          {projects.map((project) => <p class="cv-project-note" key={project.id}>
            <a href={project.url}>{project.name}</a>
            <span class="cv-project-description"><Highlight point={{ text: project.description, tags: project.tags, emphases: project.emphases }} context={context} /></span>
          </p>)}
        </div>
      </aside>,
    });
  }
  return (
    <div id="cv-app" class={`cv-app${context.projectLayout ? ` cv-projects-${context.projectLayout}` : ""}`}>
      {timeline.sort((a, b) => a.index - b.index).map(({ node }) => node)}
    </div>
  );
}
