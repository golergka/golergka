import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { partitionWork, renderTags, renderWork } from "../theme/cv-render.mjs";
import { createCvPdf } from "../theme/cv-pdf.mjs";
import { createTopicColorDirectory, CV_TEXT_SELECTION_HUE } from "../theme/cv-colors.mjs";
import { jsPDF } from "jspdf";

const data = JSON.parse(readFileSync(new URL("../data/cv.json", import.meta.url)));

test("topic colors are unique, maximally separated, and persistent", () => {
  let saved;
  const colors = createTopicColorDirectory(["observability", "product", "leadership", "agents"], {}, (value) => { saved = value; });
  colors.ensure("observability", []);
  colors.ensure("product", ["observability"]);
  colors.ensure("leadership", ["observability", "product"]);
  const first = colors.snapshot();
  assert.equal(new Set(Object.values(first)).size, 3);
  const distanceFromSelection = (hue) => Math.min(Math.abs(hue - CV_TEXT_SELECTION_HUE), 360 - Math.abs(hue - CV_TEXT_SELECTION_HUE));
  assert.ok(Object.values(first).every((hue) => distanceFromSelection(hue) >= 12));

  const retained = first.observability;
  colors.ensure("observability", ["leadership"]);
  assert.equal(colors.snapshot().observability, retained);

  const restored = createTopicColorDirectory(["observability", "product", "leadership", "agents"], saved);
  restored.ensure("observability", ["leadership"]);
  assert.equal(restored.snapshot().observability, retained);
  restored.ensure("agents", ["observability", "product", "leadership"]);
  assert.equal(new Set(Object.values(restored.snapshot())).size, 4);
});

test("native text selection has a permanently reserved topic hue", () => {
  const colors = createTopicColorDirectory(["selection-adjacent", "another"], {
    "selection-adjacent": CV_TEXT_SELECTION_HUE,
  });
  assert.deepEqual(colors.snapshot(), {});
  colors.ensureSelection(["selection-adjacent", "another"]);
  for (const hue of Object.values(colors.snapshot())) {
    const distance = Math.min(Math.abs(hue - CV_TEXT_SELECTION_HUE), 360 - Math.abs(hue - CV_TEXT_SELECTION_HUE));
    assert.ok(distance >= 12);
  }
  const script = readFileSync(new URL("../theme/cv.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../theme/style.css", import.meta.url), "utf8");
  assert.match(script, /--cv-text-selection/);
  assert.match(css, /::selection \{ color: inherit; background: var\(--cv-text-selection\); \}/);
});

test("topic color registry repairs visual collisions and respects every reserved color", () => {
  let saved;
  const colors = createTopicColorDirectory(
    ["automation", "evals", "knowledge-graphs", "product"],
    {automation: 346, evals: 347, "knowledge-graphs": 166},
    (value) => { saved = value; },
  );
  assert.deepEqual(colors.snapshot(), {automation: 346, "knowledge-graphs": 166});
  assert.deepEqual(saved, {automation: 346, "knowledge-graphs": 166});

  colors.ensureSelection(["automation", "knowledge-graphs", "evals"]);
  const repaired = colors.snapshot();
  assert.equal(new Set(Object.values(repaired)).size, 3);
  const circularDistance = (left, right) => Math.min(Math.abs(left - right), 360 - Math.abs(left - right));
  assert.ok(circularDistance(repaired.evals, repaired.automation) >= 12);
  assert.ok(circularDistance(repaired.evals, repaired["knowledge-graphs"]) >= 12);

  colors.ensure("product", ["automation"]);
  assert.ok(Object.values(repaired).every((hue) => circularDistance(colors.snapshot().product, hue) >= 12));
});

test("topic highlighting uses Mark.js for selectors and experience evidence", () => {
  const script = readFileSync(new URL("../theme/cv.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../theme/style.css", import.meta.url), "utf8");
  assert.match(script, /mark\.min\.js/);
  assert.match(script, /markRanges/);
  assert.match(script, /new Mark\(button\)\.markRanges/);
  assert.match(script, /cv-topic-selector-mark/);
  assert.match(script, /cv-topic-implied-partial/);
  assert.match(css, /\.cv-topic-mark\[data-highlight-derived="true"\] \{[\s\S]*?repeating-linear-gradient/);
  assert.match(css, /color-mix\(in srgb, var\(--topic-color\) 48%, transparent\)/);
  assert.match(css, /\.cv-topic-mark \{[\s\S]*?padding-inline: 0;/);
  assert.match(css, /\.cv-topic-select > \.cv-topic-selector-mark \{ padding-inline: 0; \}/);
  assert.doesNotMatch(css, /\.cv-topic-mark \{[\s\S]*?padding-inline: 0\.\d/);
  assert.doesNotMatch(script, /rough-notation|ResizeObserver/);
});

test("topic clicks cannot create browser text selections", () => {
  const script = readFileSync(new URL("../theme/cv.js", import.meta.url), "utf8");
  assert.match(script, /function preventTopicTextSelection\(event\)/);
  assert.match(script, /closest\?\.\("\[data-select-tag\], \[data-add-tag\]"\)\) event\.preventDefault\(\)/);
  assert.match(script, /controls\.addEventListener\("mousedown", preventTopicTextSelection\)/);
  assert.match(script, /controls\.addEventListener\("dblclick", preventTopicTextSelection\)/);
  assert.match(script, /appNode\.addEventListener\("mousedown", preventTopicTextSelection\)/);
  assert.match(script, /appNode\.addEventListener\("dblclick", preventTopicTextSelection\)/);
});

test("topic changes preserve the clicked anchor and use a short view transition", () => {
  const script = readFileSync(new URL("../theme/cv.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../theme/style.css", import.meta.url), "utf8");
  assert.match(script, /function captureScrollAnchor\(control\)/);
  assert.match(script, /window\.scrollBy\(0, delta\)/);
  assert.match(script, /document\.startViewTransition\(apply\)/);
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(css, /view-transition-name: cv-experience-list/);
  assert.match(css, /animation-duration: 140ms/);
});

test("every topic combination retains every experience and chronological group placement", () => {
  const ids = data.filters.map(({id}) => id);
  const visibleIndexes = data.work.map((item, index) => ({item, index}))
    .filter(({item}) => !data.cvStart || item.start >= data.cvStart).map(({index}) => index);
  const selections = [new Set(), new Set(ids), ...ids.map((id) => new Set([id]))];
  for (let left = 0; left < ids.length; left++) {
    for (let right = left + 1; right < ids.length; right++) selections.push(new Set([ids[left], ids[right]]));
  }
  for (const selected of selections) {
    const {individual, grouped, recentGrouped} = partitionWork(data, selected);
    assert.deepEqual([...individual, ...grouped, ...recentGrouped].map(({index}) => index).sort((a, b) => a - b), visibleIndexes);
    const html = renderWork(data, selected, {staticView: true, compact: true});
    assert.doesNotMatch(html, /<details|<summary>/);
    const order = [...html.matchAll(/id="(experience-\d+|recent-work-heading|earlier-work-heading)"/g)].map(([, id]) =>
      id === "recent-work-heading" ? recentGrouped[0].index : id === "earlier-work-heading" ? grouped[0].index : Number(id.slice(11)));
    assert.deepEqual(order, [...order].sort((a, b) => a - b));
  }
});

test("Coloph keeps depth collapsed and promotes evidence selected by the global topics", () => {
  const overview = renderWork(data);
  assert.doesNotMatch(overview, /class="cv-keywords"/);
  assert.doesNotMatch(overview, /more details/);
  assert.match(overview, /data-add-tag="ingestion">Data ingestion/);
  assert.doesNotMatch(overview, /334,000 emails and 150M source tokens/);

  const ingestion = renderWork(data, new Set(["ingestion"]));
  assert.match(ingestion, /ingestion for Telegram/);
  assert.match(ingestion, /334,000 emails and 150M source tokens/);
  assert.doesNotMatch(ingestion, /data-add-tag="ingestion"/);
});

test("topics form semantic trees without visual category buckets", () => {
  const controls = renderTags(data.filters);
  const css = readFileSync(new URL("../theme/style.css", import.meta.url), "utf8");
  assert.doesNotMatch(controls, /cv-filter-group|Focus|Engineering systems|Domains|Technologies/);
  assert.doesNotMatch(controls, /<input|type="checkbox"/);
  assert.match(css, /\.cv-topic-list \{ display: inline; line-height:/);
  assert.match(css, /\.cv-topic-children > \[data-depth\]:not\(:last-child\)::after \{ content: ", ";/);
  assert.match(css, /\.cv-topic-list > \[data-depth="0"\] \{ display: inline;/);
  assert.doesNotMatch(controls, /data-topic-toggle|<button|[▸▾]/);
  assert.match(css, /\.cv-topic-select \{[\s\S]*?user-select: none;[\s\S]*?-webkit-user-select: none;/);
  assert.doesNotMatch(css, /\.cv-suggestion-options \{[^}]*grid-template-columns/);
  assert.match(controls, /<span class="cv-topic-select" data-select-tag="agents" role="button" tabindex="0" aria-pressed="false">AI &amp; agents<\/span>[\s\S]*class="cv-topic-children">[\s\S]*data-depth="1"><span class="cv-topic-select" data-select-tag="pydantic-ai"/);
  assert.doesNotMatch(controls, /data-depth="2"/);
  assert.match(controls, /data-depth="1"><span class="cv-topic-select" data-select-tag="braintrust"/);
  assert.match(controls, /data-depth="1"><span class="cv-topic-select" data-select-tag="betterstack"/);
  const coloph = renderWork(data);
  assert.doesNotMatch(coloph, /cv-suggestion-group|data-filter-group/);
  assert.match(coloph, /cv-suggestion-options cv-topic-list/);
  assert.match(coloph, /class="cv-topic-select" role="button" tabindex="0" data-add-tag=/);
  assert.match(css, /\.cv-topic-suggestions \{[^}]*font-size: 0\.85rem;/);
  assert.match(css, /\.cv-topic-suggestions \.cv-topic-select \{ font-size: inherit; \}/);
  assert.doesNotMatch(coloph, /data-topic-toggle|[▸▾]/);
  assert.match(coloph, /cv-topic-children/);
});

test("direct visual children are solid while DAG relatives are partial", () => {
  const observability = renderWork(data, new Set(["observability"]));
  assert.match(observability, /data-highlight-topics="observability" data-highlight-derived="true"[^>]*>Better Stack<\/mark>/);
  assert.match(observability, /data-highlight-topics="observability" data-highlight-derived="true"[^>]*>Datadog<\/mark>/);
  assert.match(observability, /data-highlight-topics="observability" data-highlight-derived="true"[^>]*>OpenTelemetry<\/mark>/);
  assert.match(observability, /data-highlight-topics="observability" data-highlight-derived="true"[^>]*>Braintrust<\/mark>/);
  const reliability = renderWork(data, new Set(["production-engineering"]));
  assert.match(reliability, /data-highlight-topics="production-engineering" title="Reliability &amp; operations">Better Stack<\/mark>/);
  const exact = renderWork(data, new Set(["betterstack"]));
  assert.match(exact, /data-highlight-topics="betterstack" title="Better Stack">Better Stack<\/mark>/);
  assert.doesNotMatch(exact, /data-highlight-topics="betterstack" data-highlight-derived/);
});

test("leadership terms in role titles carry explicit topic evidence", () => {
  const founder = renderWork(data, new Set(["founder"]));
  assert.match(founder, /cv-role-name"><mark data-highlight-topics="founder"[^>]*>Founder<\/mark> &amp; Product Engineer/);
  assert.match(founder, /cv-role-name"><mark data-highlight-topics="founder"[^>]*>Co-Founder<\/mark> &amp; CTO/);
  assert.match(founder, /cv-role-name"><mark data-highlight-topics="founder"[^>]*>CEO<\/mark> &amp; <mark data-highlight-topics="founder"[^>]*>Founder<\/mark>/);

  const leadership = renderWork(data, new Set(["leadership"]));
  assert.match(leadership, /cv-role-name"><mark data-highlight-topics="leadership"[^>]*>Founding Engineer<\/mark>/);
  assert.match(leadership, /cv-role-name">[^<]*<mark data-highlight-topics="leadership"[^>]*>Lead Game Designer<\/mark>/);

  const teamLead = renderWork(data, new Set(["team-lead"]));
  assert.match(teamLead, /cv-role-name"><mark data-highlight-topics="team-lead"[^>]*>Lead Developer<\/mark>/);

  assert.equal(data.filters.some(({id}) => id === "ceo"), false);
  assert.equal(data.topicAliases.ceo, "founder");

  const cto = renderWork(data, new Set(["cto"]));
  assert.match(cto, /cv-role-name"><mark data-highlight-topics="cto"[^>]*>CTO<\/mark>/);
});

test("topic relationships form a directed acyclic graph independent of the visual tree", () => {
  assert.ok(data.topicRelations.some(({from, to}) => from === "observability" && to === "braintrust"));
  assert.ok(data.topicRelations.some(({from, to}) => from === "observability" && to === "betterstack"));
  const ids = new Set(data.filters.map(({id}) => id));
  const graph = new Map(data.filters.map(({id}) => [id, []]));
  for (const {id, parent} of data.filters) if (parent) graph.get(parent).push(id);
  for (const {from, to} of data.topicRelations) {
    assert.ok(ids.has(from) && ids.has(to));
    graph.get(from).push(to);
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    assert.ok(!visiting.has(id), `topic relationship cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    graph.get(id).forEach(visit);
    visiting.delete(id);
    visited.add(id);
  };
  graph.forEach((_, id) => visit(id));
});

test("React and Preact share one topic and Telegram is not a technology topic", () => {
  assert.equal(data.filters.some(({id}) => id === "preact" || id === "telegram"), false);
  assert.equal(data.topicAliases.preact, "react");
  const html = renderWork(data, new Set(["react"]));
  assert.match(html, /data-highlight-topics="react"[^>]*>Preact<\/mark>/);
});

test("matching evidence identifies every selected topic for natural highlighting", () => {
  const html = renderWork(data, new Set(["observability", "production-engineering"]));
  assert.match(html, /data-highlight-topics="observability,production-engineering"/);
});

test("technology topics highlight their exact mentions", () => {
  const models = renderWork(data, new Set(["model-infrastructure"]));
  assert.match(models, /data-highlight-topics="model-infrastructure"[^>]*>OpenAI and other commercial model APIs<\/mark>/);
  assert.match(models, /data-highlight-topics="model-infrastructure"[^>]*>self-hosted LiteLLM gateway<\/mark>/);
  assert.match(models, /data-highlight-topics="model-infrastructure"[^>]*>hosted and tuned private OpenLLaMA inference with vLLM<\/mark>/);
  assert.match(models, /data-highlight-topics="model-infrastructure"[^>]*>Gemini<\/mark>/);
  assert.match(models, /data-highlight-topics="model-infrastructure"[^>]*>OpenAI<\/mark>/);
  assert.doesNotMatch(models, /data-highlight-topics="model-infrastructure"[^>]*>Python backend<\/mark>/);
  const betterStack = renderWork(data, new Set(["betterstack"]));
  assert.match(betterStack, /data-highlight-topics="betterstack"[^>]*>Better Stack<\/mark>/);
});

test("voice AI is represented by the LiveKit topic", () => {
  assert.equal(data.filters.some(({id}) => id === "voice-ai"), false);
  assert.equal(data.topicAliases["voice-ai"], "livekit");
  const html = renderWork(data, new Set(["livekit"]));
  assert.match(html, /data-highlight-topics="livekit"[^>]*>LiveKit<\/mark>/);
  assert.doesNotMatch(html, /data-highlight-topics="livekit"[^>]*>voice-agent pipeline<\/mark>/);
});

test("Kubernetes highlights Kubernetes evidence, never adjacent deployment text", () => {
  const html = renderWork(data, new Set(["kubernetes"]));
  assert.match(html, /data-highlight-topics="kubernetes"[^>]*>k3s\/Kubernetes workloads<\/mark>/);
  assert.doesNotMatch(html, /data-highlight-topics="kubernetes"[^>]*>blue-green releases<\/mark>/);
});

test("developer-tools highlights developer tooling rather than adjacent product technologies", () => {
  const html = renderWork(data, new Set(["developer-tools"]));
  assert.match(html, /data-highlight-topics="developer-tools"[^>]*>Vite, ECharts, Storybook, Playwright<\/mark>/);
  assert.doesNotMatch(html, /data-highlight-topics="developer-tools"[^>]*>Preact and TypeScript<\/mark>/);
  for (const item of data.work) {
    for (const point of item.highlights.filter(({tags}) => tags.includes("developer-tools"))) {
      assert.ok(point.emphases?.some(({tags}) => tags.includes("developer-tools")),
        `${item.organization} has developer-tools evidence without an explicit phrase`);
    }
  }
});

test("every experience tag has explicitly reviewed display evidence", () => {
  const labels = new Map(data.filters.map(({id, label}) => [id, label]));
  const resolve = (tag) => data.topicAliases[tag] || tag;
  const uncovered = (tags, text, emphasisTags = [], emphases = []) => {
    const covered = new Set([...emphasisTags, ...emphases.flatMap(({tags}) => tags)].map(resolve));
    return [...new Set(tags.map(resolve))].filter((tag) =>
      !covered.has(tag) && !text.includes(labels.get(tag) || "\0"));
  };
  for (const item of data.work) {
    assert.deepEqual(uncovered(item.roleEmphases?.flatMap(({tags}) => tags) || [], item.role, [], item.roleEmphases), [],
      `${item.organization} role has an unreviewed tag`);
    assert.deepEqual(uncovered(item.summaryTags || [], item.summary, item.summaryEmphasisTags, item.summaryEmphases), [],
      `${item.organization} summary has an unreviewed tag`);
    for (const point of item.highlights) {
      assert.deepEqual(uncovered(point.tags, point.text, point.emphasisTags, point.emphases), [],
        `${item.organization} has an unreviewed bullet tag: ${point.text}`);
    }
    const evidence = new Set([...(item.roleEmphases || []).flatMap(({tags}) => tags), ...(item.summaryTags || []), ...item.highlights.flatMap(({tags}) => tags)].map(resolve));
    assert.deepEqual([...new Set(item.tags.map(resolve))].filter((tag) => !evidence.has(tag)), [],
      `${item.organization} has an experience tag without summary or bullet evidence`);
    assert.deepEqual([...evidence].filter((tag) => !new Set(item.tags.map(resolve)).has(tag)), [],
      `${item.organization} has display evidence missing from its experience tags`);
  }
});

test("reviewed highlight phrases exist and never overlap", () => {
  for (const item of data.work) {
    for (const source of [
      {text: item.role, emphases: item.roleEmphases || []},
      {text: item.summary, emphases: item.summaryEmphases || []},
      ...item.highlights.map(({text, emphases = []}) => ({text, emphases})),
    ]) {
      const ranges = source.emphases.map(({text}) => {
        const start = source.text.indexOf(text);
        assert.notEqual(start, -1, `${item.organization}: missing exact phrase “${text}”`);
        return [start, start + text.length, text];
      }).sort((a, b) => a[0] - b[0]);
      for (let index = 1; index < ranges.length; index++) {
        assert.ok(ranges[index - 1][1] <= ranges[index][0],
          `${item.organization}: overlapping phrases “${ranges[index - 1][2]}” and “${ranges[index][2]}”`);
      }
    }
  }
});

test("knowledge-graphs highlights graph evidence, not client status", () => {
  const html = renderWork(data, new Set(["knowledge-graphs"]));
  assert.match(html, /data-highlight-topics="knowledge-graphs"[^>]*>5,000 facts and entities with 8,000 citations<\/mark>/);
  assert.doesNotMatch(html, /data-highlight-topics="knowledge-graphs"[^>]*>several real clients<\/mark>/);
});

test("every experience topic and Coloph keyword exists in the global selector", () => {
  const filters = new Set(data.filters.map(({id}) => id));
  const resolve = (tag) => data.topicAliases[tag] || tag;
  const used = new Set(data.work.flatMap((item) => [
    ...item.tags,
    ...(item.summaryTags || []),
    ...item.highlights.flatMap((point) => point.tags),
  ]));
  assert.deepEqual([...used].filter((tag) => !filters.has(resolve(tag))), []);
  assert.deepEqual(data.work[0].keywords.filter((tag) => !filters.has(resolve(tag))), []);
  assert.ok(data.filters.some(({id, label}) => id === "python" && label === "Python"));
  assert.ok(data.filters.some(({id, label}) => id === "agents" && label === "AI & agents"));
  assert.ok(!filters.has("ai"));
  assert.ok(data.filters.some(({id, parent}) => id === "automation" && parent === "agents"));
  assert.ok(data.filters.some(({id, parent}) => id === "evals" && parent === "agents"));
  assert.ok(data.filters.some(({id, parent}) => id === "autonomous-development" && parent === "agents"));
  assert.ok(data.filters.some(({id, parent}) => id === "ides" && parent === "developer-tools"));
  assert.ok(data.filters.some(({id, parent}) => id === "type-systems" && parent === "developer-tools"));
  assert.ok(data.filters.some(({id, label}) => id === "production-engineering" && label === "Reliability & operations"));
  assert.ok(data.filters.some(({id, parent}) => id === "founder" && parent === "leadership"));
  assert.ok(data.filters.some(({id, parent}) => id === "cto" && parent === "leadership"));
  assert.ok(data.filters.some(({id, parent}) => id === "team-lead" && parent === "leadership"));
  assert.ok(data.filters.some(({id, parent}) => id === "hiring" && parent === "leadership"));
  assert.ok(data.filters.some(({id, label, parent}) => id === "multiplayer" && label === "Multiplayer & netcode" && parent === "games"));
  assert.ok(!filters.has("networking") && !filters.has("database"));
  for (const filter of data.filters) {
    const ancestors = new Set([filter.id]);
    let parent = filter.parent;
    while (parent) {
      assert.ok(filters.has(parent), `${filter.id} has missing parent ${parent}`);
      assert.ok(!ancestors.has(parent), `${filter.id} creates a topic cycle`);
      ancestors.add(parent);
      parent = data.filters.find(({id}) => id === parent)?.parent;
    }
    const evidence = data.work.flatMap((item) => item.highlights)
      .filter((point) => point.tags.map(resolve).includes(filter.id));
    assert.ok(evidence.length, `${filter.id} has no supporting evidence`);
  }
});

test("Games puts recent work before FastCup; default keeps recent entries separate", () => {
  const games = renderWork(data, new Set(["games"]), {staticView: true, compact: true});
  assert.ok(games.indexOf('id="recent-work-heading"') < games.indexOf('id="experience-6"'));
  const overview = partitionWork(data);
  assert.equal(overview.recentGrouped.length, 0);
  assert.equal(overview.individual[0].item.organization, "Coloph");
  assert.equal(overview.grouped.length, 10);
});

test("the public CV starts with adOffer while older source records remain archived in JSON", () => {
  const html = renderWork(data, new Set(["leadership"]), {staticView: true});
  assert.match(html, />adOffer</);
  assert.doesNotMatch(html, />Playnatic Entertainment</);
  assert.equal(data.work.at(-1).organization, "2RealLife");
});

test("PDF layout fits compact entries without rasterization", () => {
  const groups = Array.from({length:16}, (_, index) => [
    {runs:[{text:`Company ${index} / Engineer · 2020–2021`, bold:true}], size:10, after:2},
    {runs:[{text:"Built and shipped products. ".repeat(8)}], size:9, after:2},
    {rule:true, after:5},
  ]);
  const pdf = createCvPdf(jsPDF, groups, "Test CV");
  assert.equal(pdf.getNumberOfPages(), 1);
  assert.doesNotMatch(pdf.output(), /\/Subtype \/Image/);
});
