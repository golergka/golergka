# Editing the CV

Edit `experiences/*.md` for experience descriptions and `config.yaml` for the
profile, topics, selector placement, topic relationships, education, and languages.
The numbered filenames define the timeline order. All CV code and styles live here.

Each experience starts with YAML metadata between `---` lines, followed by its
summary and an `## Experience` list. Keep dates as quoted year or year-month
strings, or `present`.

Use ordinary Markdown link notation to associate words with topics:

```markdown
- Built [voice agents](topic:livekit) with [background tools](topic:automation).
- [The startup ran out of runway.](topic:career-moves)
- [Shipped the first production release.](topic:impact,challenges)
```

An empty topic link at the end assigns topics to the whole bullet:

```markdown
- Built [voice agents](topic:livekit) with background tools. [](topic:impact)
```

If the topic already marks a phrase, an empty link does not widen that highlight.
FAQ topics use exactly the same syntax and rendering. `kind: faq` in the topic
configuration only controls which selector displays them.

The compiler supports metadata, a summary paragraph, the Experience heading,
bullet paragraphs, and topic links. Use the metadata `links` list for external
links. It is a small Markdown dialect, not a general Markdown page renderer.

Run `npm run build` from the repository root to generate the site. Unknown
topics, missing required metadata, and malformed dates stop the build.
`dist/cv/data.json` is generated output; do not edit it.
