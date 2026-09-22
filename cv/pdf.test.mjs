import test from "node:test";
import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import { createCvPdf } from "./pdf.mjs";

test("PDF project rows preserve two bordered columns, wrapping and following content", () => {
  const text = [], boxes = [];
  function RecordingPdf(options) {
    const pdf = new jsPDF(options);
    const write = pdf.text.bind(pdf), rect = pdf.rect.bind(pdf);
    pdf.text = (value, x, y, ...args) => {
      text.push({ value, x, y, page: pdf.getCurrentPageInfo().pageNumber });
      return write(value, x, y, ...args);
    };
    pdf.rect = (x, y, width, height, ...args) => {
      boxes.push({ x, y, width, height });
      return rect(x, y, width, height, ...args);
    };
    return pdf;
  }
  const block = (value) => ({ runs: [{ text: value }], size: 9, after: 3 });
  const pdf = createCvPdf(RecordingPdf, [[{
    columnCount: 2,
    columns: [
      [block("LeftProject"), block("A longer description that must wrap within its own bordered column. ".repeat(4))],
      [block("RightProject"), block("A shorter description.")],
    ],
    padding: 7, gap: 8, after: 6,
  }], [block("FollowingExperience")]], "CV");
  const left = text.find(({ value }) => value === "LeftProject");
  const right = text.find(({ value }) => value === "RightProject");
  const next = text.find(({ value }) => value === "FollowingExperience");
  assert.equal(left.page, right.page);
  assert.equal(left.y, right.y);
  assert.ok(right.x > left.x + 200);
  assert.equal(boxes.length, 2);
  assert.equal(boxes[0].height, boxes[1].height);
  assert.ok(boxes[0].height > 40, "long description wraps inside its column");
  assert.ok(next.y > boxes[0].y + boxes[0].height);
  for (const box of boxes) {
    assert.ok(box.x + box.width <= pdf.internal.pageSize.getWidth() - 26);
    assert.ok(box.y + box.height <= pdf.internal.pageSize.getHeight() - 26);
  }
});
