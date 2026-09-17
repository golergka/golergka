import test from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "./content.mjs";
import {
  buildTopicGraph,
  sourceForTag,
  partitionWork,
  workPoints,
} from "./model.mjs";

const data = loadContent();
test("expanded experiences stay individual across topic changes", () => {
  const expanded = new Set([0, 8]);
  for (const selection of [new Set(), new Set(["games"]), new Set(["career-moves"])]) {
    const result = partitionWork(data, selection, expanded);
    for (const index of expanded) {
      assert.ok(result.individual.some((entry) => entry.index === index));
      assert.ok(![...result.grouped, ...result.recentGrouped].some((entry) => entry.index === index));
    }
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
test("overview retains every eligible experience exactly once across groups", () => {
  const groups = partitionWork(data);
  const indices = Object.values(groups)
    .flat()
    .map(({ index }) => index);
  assert.equal(new Set(indices).size, indices.length);
  assert.deepEqual(
    indices.sort((a, b) => a - b),
    data.work.flatMap((item, index) =>
      item.start >= data.cvStart ? [index] : [],
    ),
  );
});
test("FAQ selection does not mutate editorial content", () => {
  const before = JSON.stringify(data);
  for (const item of data.work)
    workPoints(item, new Set(data.filters.map(({ id }) => id)), data.filters);
  assert.equal(JSON.stringify(data), before);
});
