import test from "node:test";
import assert from "node:assert/strict";
import {
  filtersWithoutEvidence,
  loadContent,
  parseTopicText,
  warnFiltersWithoutEvidence,
} from "./content.mjs";
import {buildTopicGraph, highlightRanges} from "./model.mjs";

test("Markdown compiles all experiences and FAQ uses ordinary topic evidence", () => {
  const data = loadContent();
  assert.equal(data.work.length, 21);
  const graph = buildTopicGraph(data.filters, data.topicRelations);
  const labels = new Map(data.filters.map(({id,label}) => [id,label]));
  const hotline = data.work.find(({organization}) => organization.startsWith("Hotline"));
  const coloph = data.work.find(({ organization }) => organization === "Coloph");
  const international = data.work.find(
    ({ organization }) => organization === "International clients",
  );
  const contractors = data.work
    .filter(({ tags }) => tags.includes("contractor"))
    .map(({ organization }) => organization);
  const career = hotline.highlights.find(({tags}) => tags.includes("career-moves"));
  assert.ok(career.text.length > 0);
  const ranges = highlightRanges(career, new Set(["career-moves"]), labels, data.topicAliases, graph);
  assert.equal(ranges[0].text, career.emphases.find(({tags}) => tags.includes("career-moves")).text);
  assert.equal(ranges[0].selected, true);
  for (const tag of [
    "autonomous-development",
    "evals",
    "vercel-ai-sdk",
    "braintrust",
    "search",
  ])
    assert.ok(hotline.tags.includes(tag));
  for (const tag of ["search", "docker", "kubernetes", "agent-harness", "pydantic-ai"])
    assert.ok(coloph.tags.includes(tag));
  assert.deepEqual(contractors, ["International clients", "Silly Penguin", "Ilyon"]);
  assert.equal(international.role, "Contractor / conversational AI");
  assert.ok(data.earlierWork.tags.includes("contractor"));
  for (const tag of ["games", "backend", "founder", "team-lead", "product"])
    assert.ok(
      data.earlierWork.themes.some(({ tags }) => tags.includes(tag)),
      `Earlier work summary needs ${tag}`,
    );
  for (const tag of ["betterstack", "sentry", "opentelemetry"])
    assert.ok(hotline.tags.includes(tag));
  assert.ok(hotline.tags.includes("quo"));
  assert.deepEqual(
    data.work
      .filter(({ tags }) => tags.includes("node-bun"))
    .map(({ organization }) => organization),
    [
      "Hotline (Gestalt Systems)",
      "Jam.dev",
      "PopSQL",
      "International clients",
      "Deep Channel",
      "FastCup.net",
      "Sofq Games",
      "Ilyon",
    ],
  );
  assert.ok(
    data.filters.some(
      ({ id, label }) => id === "founder" && label === "Founder/CTO",
    ),
  );
  assert.ok(!data.filters.some(({ id }) => ["cto", "hiring"].includes(id)));
  assert.ok(!data.filters.some(({ id }) => ["claude-code", "fastapi"].includes(id)));
  for (const tag of ["agents", "llamaindex", "langchain"])
    assert.ok(international.tags.includes(tag));
  for (const organization of [
    "Jam.dev",
    "PopSQL",
    "Deep Channel",
    "FastCup.net",
    "Sofq Games",
  ])
    assert.ok(
      data.work.find((item) => item.organization === organization).tags.includes("postgres"),
    );
  for (const item of data.work.filter(({ start }) => start <= "2020"))
    assert.ok(item.tags.includes("games"), `${item.organization} needs Gamedev`);
  for (const item of data.work.filter(({ tags }) => tags.includes("games")))
    assert.ok(
      item.tags.includes("desktop") || item.tags.includes("mobile"),
      `${item.organization} needs a game platform`,
    );
  assert.deepEqual(
    data.work.slice(0, 4).map(({ organization }) => organization),
    ["Coloph", "Hotline (Gestalt Systems)", "Jam.dev", "PopSQL"],
  );
  assert.equal(coloph.start, "2026");
  assert.ok(!data.filters.some(({ id }) => id === "ml-ops"));
  assert.ok(data.work.every((item) => !item.faq));
});

test("build warns when a configured tag has no individual experience evidence", () => {
  const data = {
    filters: [{ id: "used" }, { id: "unused" }],
    work: [{ tags: ["used"] }],
  };
  assert.deepEqual(filtersWithoutEvidence(data), ["unused"]);
  const warnings = [];
  assert.deepEqual(warnFiltersWithoutEvidence(data, (message) => warnings.push(message)), ["unused"]);
  assert.match(warnings[0], /unused/);
});

test("topic links preserve phrase boundaries and validate topic names", () => {
  const allowed = new Set([
    "python",
    "agents",
    "agent-harness",
    "docker",
    "kubernetes",
  ]);
  const point = parseTopicText("[Built a [Python](python) service.](agents)", allowed);
  assert.equal(point.text, "Built a Python service.");
  assert.deepEqual(
    point.emphases.map(({ text, tags }) => ({ text, tags })),
    [{text:"Python",tags:["python"]},{text:point.text,tags:["agents"]}],
  );
  for (const emphasis of point.emphases)
    assert.equal(
      point.text.slice(emphasis.start, emphasis.end),
      emphasis.text,
    );
  const nested = parseTopicText(
    "Built a [custom scheduler, orchestration engine and [container provision](<docker, kubernetes>)](agent-harness) for durable invocations.",
    allowed,
  );
  assert.deepEqual(nested.tags, ["docker", "kubernetes", "agent-harness"]);
  assert.deepEqual(
    nested.emphases.map(({ text, tags }) => ({ text, tags })),
    [
      {text:"container provision",tags:["docker","kubernetes"]},
      {
        text:"custom scheduler, orchestration engine and container provision",
        tags:["agent-harness"],
      },
    ],
  );
  for (const emphasis of nested.emphases)
    assert.equal(
      nested.text.slice(emphasis.start, emphasis.end),
      emphasis.text,
    );
  const external = parseTopicText(
    "Open [coloph-toolset](https://github.com/golergka/coloph-toolset).",
    allowed,
  );
  assert.deepEqual(external.tags, []);
  assert.deepEqual(external.links, [
    {
      text: "coloph-toolset",
      href: "https://github.com/golergka/coloph-toolset",
      start: 5,
      end: 19,
    },
  ]);
  assert.throws(() => parseTopicText("[typo](pythno)", allowed), /Unknown topic/);
  assert.throws(() => parseTopicText("[](agents)", allowed), /wrap visible text/);
  assert.throws(
    () => parseTopicText("[container provision](<docker, kubernetes)", allowed),
    /matching angle brackets/,
  );
  const data = loadContent();
  for (const item of data.work) {
    assert.ok(!("keywords" in item));
    const evidence = new Set([...item.summaryTags, ...item.roleEmphases.flatMap((e) => e.tags), ...item.highlights.flatMap((p) => p.tags)]);
    assert.deepEqual(new Set(item.tags), evidence);
  }
});
