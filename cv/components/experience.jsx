import {
  canonicalTags,
  matchSources,
  matchesTags,
  partitionWork,
  workPoints,
  workTags,
} from "../model.mjs";
import { Highlight } from "./topics.jsx";

function DateLabel({ value }) {
  return value === "present" ? (
    "present"
  ) : (
    <time dateTime={value}>{value.slice(0, 4)}</time>
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
  // Keep the first two Markdown bullets visible in every view. A selection
  // can add relevant evidence, but must never hide the overview preview.
  const preview = points.filter(
    (point) => point.order < 2 || (selected.size && point.score),
  );
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
      {!expanded && preview.length > 0 && pointList(preview)}
      {!compact && remaining.length > 0 && (
        <details
          class="cv-archive cv-experience-details"
          open={expanded || !ready}
          onToggle={(event) => {
            if (ready && event.currentTarget.open !== expanded)
              context.toggleExperience(index, event.currentTarget);
          }}
        >
          <summary>{expanded ? "Show highlights" : "Show full experience"}</summary>
          {(expanded || !ready) && pointList(expanded ? points : remaining)}
        </details>
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
        experiences
      </p>
      <p class="cv-summary">
        {summaryThemes.map((theme) => (
          <span key={theme.text}>
            <Highlight point={theme} context={context} />{" "}
          </span>
        ))}
      </p>
      {!compact && (
        <details class="cv-archive" id={`${id}-details`} open>
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
