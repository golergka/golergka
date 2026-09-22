import test from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "./content.mjs";
import { loadProjects } from "./projects.mjs";
import { buildTopicGraph, projectSlots } from "./model.mjs";

const data = loadContent();
data.projects = loadProjects(data.filters);
const graph = buildTopicGraph(data.filters, data.topicRelations);
test("project selection follows topics, including parents, and hides unrelated projects", () => {
  assert.equal(data.projects.length, 7);
  for (const tags of [[], ["career-moves"], ["games"], ["livekit"]]) {
    assert.equal(projectSlots(data, new Set(tags), graph).size, 0);
  }
  const ids = [...projectSlots(data, new Set(["data"]), graph).values()].flat().map(({ id }) => id);
  assert.deepEqual(ids, ["coloph-migrations", "pg-tx"]);
});
test("projects sit after contemporaneous experience; maintenance does not move older projects", () => {
  const slots = projectSlots(data, new Set(["backend", "developer-tools", "native"]), graph);
  assert.equal([...slots.values()].flat().length, 7);
  assert.equal(slots.get(0).length, 4);
  assert.equal(slots.get(5)[0].id, "pg-tx");
  assert.equal(slots.get(6)[0].id, "hn-comment-bot");
  assert.equal(slots.get(8)[0].id, "gcf-typescript-template");
});

test("every topic that reveals a project has a visible highlighted phrase", async () => {
  const { highlightRanges, matchSources } = await import("./model.mjs");
  const labels = new Map(data.filters.map(({ id, label }) => [id, label]));
  for (const { id } of data.filters) {
    const selected = new Set([id]);
    for (const project of [...projectSlots(data, selected, graph).values()].flat()) {
      const ranges = highlightRanges({ text: project.description, tags: project.tags, emphases: project.emphases }, selected, labels, data.topicAliases, graph);
      const highlighted = new Set(ranges.filter((range) => range.selected).flatMap((range) => range.tags));
      for (const { topic } of matchSources(project.tags, selected, data.topicAliases, graph)) {
        assert.ok(highlighted.has(topic), `${project.id} needs visible evidence for ${topic}`);
      }
    }
  }
});
