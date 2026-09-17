import {
  canonicalTags,
  matchSources,
  matchesTags,
  partitionWork,
  workPoints,
  workTags,
} from "../model.mjs";
import { Highlight } from "./topics.jsx";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
function DateLabel({ value }) {
  return value === "present" ? (
    "present"
  ) : (
    <time dateTime={value}>
      {value.includes("-")
        ? `${months[Number(value.slice(5)) - 1]} ${value.slice(0, 4)}`
        : value}
    </time>
  );
}

function Experience({ item, index, data, context, compact }) {
  const { selected, aliases, graph, ready } = context;
  const expanded = !compact && context.expandedExperiences?.has(index);
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
  const preview = [],
    uncovered = new Set(selected);
  const eligible = selected.size
    ? points.filter((point) => point.score)
    : [...points];
  const limit = selected.size ? eligible.length : 2;
  while (preview.length < limit && eligible.length) {
    eligible.sort(
      (a, b) =>
        b.matchedTopics.filter((tag) => uncovered.has(tag)).length -
          a.matchedTopics.filter((tag) => uncovered.has(tag)).length ||
        a.order - b.order,
    );
    const point = eligible.shift();
    preview.push(point);
    point.matchedTopics.forEach((tag) => uncovered.delete(tag));
  }
  const remaining = points.filter((point) => !preview.includes(point));
  const links = [
    ...(item.links || []),
    ...(item.artifacts || [])
      .map((name) => data.artifacts.find((artifact) => artifact.name === name))
      .filter((artifact) => artifact?.url)
      .map(({ name, url }) => ({ label: name, url })),
  ];
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
        {item.url ? (
          <a href={item.url}>{item.organization}</a>
        ) : (
          item.organization
        )}{" "}
        <span class="cv-role-separator">/</span>{" "}
        <span class="cv-role-name">
          <Highlight
            point={{
              text: item.role,
              tags: item.tags,
              emphases: item.roleEmphases || [],
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
            tags: item.summaryTags || [],
          }}
          context={context}
        />
      </p>
      {(expanded ? points : preview).length > 0 && pointList(expanded ? points : preview)}
      {!compact && remaining.length > 0 && (
        <details class="cv-fallback-details" hidden={ready}>
          <summary>More experience</summary>
          {pointList(remaining)}
        </details>
      )}
      {!compact && (expanded || remaining.length > 0) && (
        <p class="cv-experience-disclosure" hidden={!ready}>
          <span>{expanded ? "Showing full experience" : "Showing highlights"}</span>
          {" · "}
          <button type="button" aria-expanded={Boolean(expanded)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => context.toggleExperience(index, event.currentTarget)}>
            {expanded ? "Show highlights" : "Show full experience"}
          </button>
        </p>
      )}
      {links.length > 0 && (
        <p class="cv-evidence">
          {links.map((link, i) => (
            <span key={link.url}>
              {i > 0 && " · "}
              <a href={link.url}>{link.label}</a>
            </span>
          ))}
        </p>
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
      .map(({ text }) => text);
  const title = themes(config.titleThemes || []).join(" & ");
  const years = members
    .flatMap(({ item }) => [
      item.start.slice(0, 4),
      item.end === "present" ? "present" : item.end.slice(0, 4),
    ])
    .sort();
  return (
    <section class="cv-earlier" aria-labelledby={`${id}-heading`}>
      <h3 class="cv-role-title" id={`${id}-heading`}>
        {config.title}
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
        experiences
      </p>
      <p class="cv-summary">{themes(config.themes).join(" ")}</p>
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
  const { individual, grouped, recentGrouped } = partitionWork(
    data,
    context.selected,
    compact ? new Set() : context.expandedExperiences,
  );
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
  for (const [members, config, id] of [
    [recentGrouped, data.recentWork, "recent-work"],
    [grouped, data.earlierWork, "earlier-work"],
  ]) {
    if (members.length)
      timeline.push({
        index: members[0].index,
        node: (
          <ExperienceGroup
            key={id}
            {...{ members, config, id, data, context, compact }}
          />
        ),
      });
  }
  return (
    <div id="cv-app" class="cv-app">
      {timeline.sort((a, b) => a.index - b.index).map(({ node }) => node)}
    </div>
  );
}
