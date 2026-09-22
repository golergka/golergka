import test from "node:test";
import assert from "node:assert/strict";
import { loadContent, parseTopicText } from "./content.mjs";
import {
  buildTopicGraph,
  expandedRoots,
  filtersWithEvidence,
  highlightRanges,
  selectedExpertiseLabels,
  sourceForTag,
  partitionWork,
  workGroupAnchors,
  workPoints,
} from "./model.mjs";

const data = loadContent();
test("experience disclosures do not change grouping", () => {
  const disclosed = new Set([0, 8]);
  for (const selection of [new Set(), new Set(["games"]), new Set(["career-moves"])]) {
    assert.deepEqual(
      partitionWork(data, selection, disclosed),
      partitionWork(data, selection),
    );
  }
});
test("topic traversal handles cycles and distinguishes direct and derived evidence", () => {
  const graph = buildTopicGraph(
    [{ id: "a" }, { id: "b", parent: "a" }, { id: "c" }],
    [
      { from: "b", to: "c" },
      { from: "c", to: "a" },
    ],
  );
  assert.deepEqual(sourceForTag("b", new Set(["a"]), {}, graph), {
    topic: "a",
    derived: false,
  });
  assert.deepEqual(sourceForTag("c", new Set(["a"]), {}, graph), {
    topic: "a",
    derived: true,
  });
  assert.equal(sourceForTag("missing", new Set(["a"]), {}, graph), null);
});
test("nested topic links retain all selected annotations", () => {
  const filters = [
    { id: "agents" },
    { id: "agent-harness", parent: "agents" },
    { id: "devops" },
    { id: "docker", parent: "devops" },
    { id: "kubernetes", parent: "devops" },
  ];
  const point = parseTopicText(
    "Built a [custom scheduler, orchestration engine and [container provision](<docker, kubernetes>)](agent-harness).",
    new Set(filters.map(({ id }) => id)),
  );
  const labels = new Map(filters.map(({ id }) => [id, id]));
  const graph = buildTopicGraph(filters);
  const onlyDocker = highlightRanges(
    point,
    new Set(["docker"]),
    labels,
    {},
    graph,
  );
  assert.deepEqual(
    onlyDocker.filter(({ selected }) => selected).map(({ text, tags }) => ({ text, tags })),
    [{ text: "container provision", tags: ["docker"] }],
  );
  const allSelected = highlightRanges(
    point,
    new Set(["docker", "kubernetes", "agent-harness"]),
    labels,
    {},
    graph,
  );
  assert.deepEqual(
    allSelected.find(({ text }) => text === "container provision").tags,
    ["docker", "kubernetes", "agent-harness"],
  );
  assert.ok(allSelected.every(({ selected }) => selected));

  const outerSelected = highlightRanges(
    point,
    new Set(["agent-harness"]),
    labels,
    {},
    graph,
  );
  assert.equal(outerSelected.length, 1);
  assert.equal(
    outerSelected[0].text,
    "custom scheduler, orchestration engine and container provision",
  );
});
test("related selections expand every affected topic root", () => {
  assert.deepEqual(
    expandedRoots(
      [
        { id: "agents" },
        { id: "braintrust", parent: "agents" },
        { id: "devops" },
        { id: "observability", parent: "devops" },
      ],
      new Set(["observability"]),
      {},
      [{ from: "observability", to: "braintrust" }],
    ),
    new Set(["devops", "agents"]),
  );
});
test("overview retains every eligible experience exactly once across groups", () => {
  const groups = partitionWork(data);
  const indices = Object.values(groups)
    .flat()
    .map(({ index }) => index);
  assert.equal(new Set(indices).size, indices.length);
  assert.deepEqual(
    indices.sort((a, b) => a - b),
    data.work.map((_, index) => index),
  );
});
test("collapsed groups stay after overlapping visible work", () => {
  assert.deepEqual(workGroupAnchors(data), { recent: 7, earlier: 21 });
  const contractor = partitionWork(data, new Set(["contractor"]));
  assert.equal(contractor.grouped[0].index, 8);
  // Silly Penguin becomes visible at index 7, ahead of the fixed group anchor.
  assert.equal(workGroupAnchors(data).earlier, 21);
});
test("FAQ selection does not mutate editorial content", () => {
  const before = JSON.stringify(data);
  for (const item of data.work)
    workPoints(item, new Set(data.filters.map(({ id }) => id)), data.filters);
  assert.equal(JSON.stringify(data), before);
});
test("topic selectors omit tags without matching content", () => {
  const visible = filtersWithEvidence(
    [
      { id: "agents" },
      { id: "agent-harness", parent: "agents" },
      { id: "unused" },
    ],
    [{ tags: ["agent-harness"] }],
  ).map(({ id }) => id);
  assert.deepEqual(visible, ["agents", "agent-harness"]);
});
test("PDF expertise contains every direct selection, including FAQ tags", () => {
  const labels = selectedExpertiseLabels(
    [
      { id: "career-moves", label: "Career moves", kind: "faq" },
      { id: "contractor", label: "Contractor", kind: "faq" },
      { id: "agents", label: "AI & agents" },
      { id: "braintrust", label: "Braintrust", parent: "agents" },
    ],
    new Set(["career-moves", "contractor", "braintrust"]),
  );
  assert.deepEqual(labels, ["Career moves", "Contractor", "Braintrust"]);
  assert.ok(!labels.includes("AI & agents"));
});
