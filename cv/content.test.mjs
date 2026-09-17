import test from "node:test";
import assert from "node:assert/strict";
import {loadContent, parseTopicText} from "./content.mjs";
import {buildTopicGraph, highlightRanges} from "./model.mjs";

test("Markdown compiles all experiences and FAQ uses ordinary topic evidence", () => {
  const data = loadContent();
  assert.equal(data.work.length, 21);
  const graph = buildTopicGraph(data.filters, data.topicRelations);
  const labels = new Map(data.filters.map(({id,label}) => [id,label]));
  const hotline = data.work.find(({organization}) => organization.startsWith("Hotline"));
  const career = hotline.highlights.find(({tags}) => tags.includes("career-moves"));
  assert.equal(career.text, "The startup ran out of runway. I gravitate toward early-stage startups.");
  const ranges = highlightRanges(career, new Set(["career-moves"]), labels, data.topicAliases, graph);
  assert.equal(ranges[0].text, career.text);
  assert.equal(ranges[0].selected, true);
  assert.ok(data.work.every((item) => !item.faq));
});

test("topic links preserve phrase boundaries and validate topic names", () => {
  const allowed = new Set(["python", "impact"]);
  const point = parseTopicText("Built a [Python](topic:python) service. [](topic:impact)", allowed);
  assert.equal(point.text, "Built a Python service.");
  assert.deepEqual(point.emphases, [{text:"Python",tags:["python"]},{text:point.text,tags:["impact"]}]);
  assert.throws(() => parseTopicText("[typo](topic:pythno)", allowed), /Unknown topic/);
});
