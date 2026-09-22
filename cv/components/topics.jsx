import { highlightRanges, sourceForTag } from "../model.mjs";

export function topicStyle(topics, colors, derived = false) {
  topics.forEach(colors.ensure);
  return {
    "--topic-color": colors.color(topics[0], derived ? 0.48 : 0.62),
    "--topic-hover-color": colors.color(topics[0], 0.31),
    "--topic-color-2": topics[1]
      ? colors.color(topics[1], 0.95)
      : "transparent",
    "--topic-color-3": topics[2]
      ? colors.color(topics[2], 0.95)
      : "transparent",
  };
}

export function Highlight({ point, context }) {
  const { selected, labels, aliases, graph, colors, ready, toggle } = context;
  const ranges = highlightRanges(point, selected, labels, aliases, graph);
  let cursor = 0;
  const children = ranges.flatMap((range) => {
    const prefix = point.text.slice(cursor, range.start);
    cursor = range.end;
    const Tag = range.href ? "a" : range.selected ? "mark" : "span";
    const topic =
      range.tags.find((tag) => selected.has(tag)) || range.hoverTags[0];
    const topics = range.selected ? range.tags : range.hoverTags;
    return [
      prefix,
      <Tag
        key={`${range.start}-${range.end}`}
        class={
          range.selected
            ? "cv-topic-mark"
            : !range.href && ready
              ? "cv-highlightable"
              : undefined
        }
        href={range.href}
        style={topics.length ? topicStyle(topics, colors, range.derived) : undefined}
        data-highlight-topics={
          range.selected ? range.tags.join(",") : undefined
        }
        data-highlightable-topics={topics.length ? range.hoverTags.join(",") : undefined}
        data-highlight-derived={range.derived ? "true" : undefined}
        role={!range.href && ready ? "button" : undefined}
        tabIndex={!range.href && ready ? 0 : undefined}
        title={topics.length ? range.hoverTags.map((tag) => labels.get(tag)).join(", ") : undefined}
        onClick={range.href ? undefined : (event) => toggle(topic, event.currentTarget)}
        onKeyDown={(event) => {
          if (range.href) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle(topic, event.currentTarget);
          }
        }}
      >
        {range.text}
      </Tag>,
    ];
  });
  return (
    <>
      {children}
      {point.text.slice(cursor)}
    </>
  );
}

export function TopicTree({
  filters,
  context,
  suggestions = false,
  directIds,
}) {
  const { selected, aliases, graph, colors, ready, toggle, expanded } = context;
  const ids = new Set(filters.map(({ id }) => id));
  const branch = (filter, depth = 0) => {
    const children = filters.filter(({ parent }) => parent === filter.id);
    const source = sourceForTag(filter.id, selected, aliases, graph);
    const selectable = !directIds || directIds.has(filter.id);
    const label = source ? (
      <mark
        class="cv-topic-mark cv-topic-selector-mark"
        data-highlight-derived={source.derived ? "true" : undefined}
        style={topicStyle([source.topic], colors, source.derived)}
      >
        {filter.label}
      </mark>
    ) : (
      filter.label
    );
    return (
      <div
        key={filter.id}
        class={suggestions ? "cv-suggestion-node" : "cv-filter-node"}
        data-depth={depth}
        data-topic-id={filter.id}
      >
        {selectable ? (
          <button
            type="button"
            class="cv-topic-select"
            aria-label={filter.label}
            disabled={!ready}
            data-select-tag={suggestions ? undefined : filter.id}
            data-add-tag={suggestions ? filter.id : undefined}
            aria-pressed={selected.has(filter.id)}
            onClick={(event) =>
              toggle(filter.id, event.currentTarget, suggestions)
            }
          >
            {label}
          </button>
        ) : (
          <span class="cv-topic-select cv-topic-placeholder">{label}</span>
        )}
        {children.length > 0 && (
          <div
            class="cv-topic-children"
            hidden={!suggestions && depth === 0 && !expanded.has(filter.id)}
          >
            {children.map((child) => branch(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  return filters
    .filter(({ parent }) => !ids.has(parent))
    .map((filter) => branch(filter));
}
