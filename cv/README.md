# Editing the CV

Edit `experiences/*.md` for experience descriptions and `config.yaml` for the
profile, topics, selector placement, topic relationships, education, and languages.
The numbered filenames define the timeline order. All CV code and styles live here.

Each experience starts with YAML metadata between `---` lines, followed by its
summary and an `## Experience` list. Keep dates as quoted year or year-month
strings, or `present`.

Use ordinary Markdown link notation to associate words with topics. A target
that is an `http` or `https` URL is an inline external link instead:

```markdown
- Built [voice agents](livekit) with [background tools](agent-harness).
- [The startup ran out of runway.](career-moves)
- [Shipped the first production release.](product)
- Read [coloph-toolset](https://github.com/golergka/coloph-toolset).
```

Wrap a whole sentence to associate it with a topic. Links can nest when a phrase
inside that sentence has its own topic:

```markdown
- [Built [voice agents](livekit) with background tools.](product)
```

No tag or keyword lists are needed in the metadata. The build derives each
experience's topics from its role, summary, and bullet links.
FAQ topics use exactly the same syntax and rendering. `kind: faq` in the topic
configuration only controls which selector displays them.

The compiler supports metadata, a summary paragraph, the Experience heading,
bullet paragraphs, topic links, and inline HTTP(S) links. It is a small Markdown
dialect, not a general Markdown page renderer.

Run `npm run build` from the repository root to generate the site. Unknown
topics, missing required metadata, and malformed dates stop the build.
`dist/cv/data.json` is generated output; do not edit it.
