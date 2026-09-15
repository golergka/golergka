import { renderWork, defaultTags, partitionWork, escapeHtml, buildTopicGraph, sourceForTag, matchesTags } from "./cv-render.mjs";
import { createTopicColorDirectory } from "./cv-colors.mjs";

const data = JSON.parse(document.querySelector("#cv-data").textContent);
const controls = document.querySelector(".cv-controls");
const tagsNode = document.querySelector("#cv-tags");
const appNode = document.querySelector("#cv-app");
const statusNode = document.querySelector("#cv-status");
const clearButton = document.querySelector("#cv-clear");
const allowed = new Set(data.filters.map(({ id }) => id));
const aliases = data.topicAliases || {};
const exportLink = document.querySelector("#cv-export");
const generationNote = document.querySelector("#cv-generation-note");
const topicGraph = buildTopicGraph(data.filters, data.topicRelations);
let highlightEpoch = 0;
let markLibrary;

const colorStorageKey = "cv-topic-color-directory-v1";
let savedColors = {};
try { savedColors = JSON.parse(localStorage.getItem(colorStorageKey) || "{}"); } catch {}
const topicColors = createTopicColorDirectory(
  data.filters.map(({id}) => id),
  savedColors,
  (colors) => {
    try { localStorage.setItem(colorStorageKey, JSON.stringify(colors)); } catch {}
  },
);
const topicColor = (tag, alpha = 0.62) => topicColors.color(tag, alpha);

function loadMarkLibrary() {
  markLibrary ||= new Promise((resolve, reject) => {
    if (window.Mark) return resolve(window.Mark);
    const script = document.createElement("script");
    script.src = "/cv/mark.min.js";
    script.onload = () => resolve(window.Mark);
    script.onerror = () => { script.remove(); markLibrary = null; reject(new Error("Could not load text highlighting tools")); };
    document.head.append(script);
  });
  return markLibrary;
}

async function applyTopicHighlights() {
  const epoch = ++highlightEpoch;
  const marks = [...document.querySelectorAll("mark[data-highlight-topics]")];
  for (const button of tagsNode.querySelectorAll("[data-select-tag]")) {
    const tag = button.dataset.selectTag;
    const isSelected = selected.has(tag);
    const source = isSelected ? null : sourceForTag(tag, selected, aliases, topicGraph);
    button.classList.toggle("cv-topic-implied", Boolean(source));
    button.classList.toggle("cv-topic-implied-partial", Boolean(source?.derived));
    const colorTopic = isSelected ? tag : source?.topic;
    if (colorTopic) button.style.setProperty("--topic-color", topicColor(colorTopic, source?.derived ? 0.27 : 0.62));
    else button.style.removeProperty("--topic-color");
  }
  marks.forEach((mark) => mark.style.setProperty("--topic-color", topicColor(mark.dataset.highlightTopics.split(",")[0], mark.dataset.highlightDerived ? 0.27 : 0.62)));
  if (!marks.length) return;
  try {
    const Mark = await loadMarkLibrary();
    if (epoch !== highlightEpoch || marks.some((mark) => !mark.isConnected)) return;
    const groups = new Map();
    for (const mark of marks) {
      const parent = mark.parentElement;
      const before = document.createRange();
      before.selectNodeContents(parent);
      before.setEndBefore(mark);
      const range = {
        start: before.toString().length,
        length: mark.textContent.length,
        topics: mark.dataset.highlightTopics.split(",").filter(Boolean),
        title: mark.title,
        derived: mark.dataset.highlightDerived === "true",
      };
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push({ mark, range });
    }
    for (const [parent, entries] of groups) {
      const ranges = entries.map(({range}) => range);
      entries.forEach(({mark}) => mark.replaceWith(document.createTextNode(mark.textContent)));
      parent.normalize();
      new Mark(parent).markRanges(ranges, {
        element: "mark",
        className: "cv-topic-mark",
        each(element, range) {
          element.dataset.highlightTopics = range.topics.join(",");
          if (range.derived) element.dataset.highlightDerived = "true";
          element.title = range.title;
          element.style.setProperty("--topic-color", topicColor(range.topics[0], range.derived ? 0.27 : 0.62));
          element.style.setProperty("--topic-color-2", range.topics[1] ? topicColor(range.topics[1], 0.95) : "transparent");
          element.style.setProperty("--topic-color-3", range.topics[2] ? topicColor(range.topics[2], 0.95) : "transparent");
        },
      });
    }
  } catch (error) {
    console.warn("Enhanced topic highlighting unavailable; using native marks.", error);
  }
}
// Old export URLs now show the interactive CV; exporting never navigates away.
const cleanUrl = new URL(location.href);
cleanUrl.searchParams.delete("view");
history.replaceState(null, "", cleanUrl);

function readSelection() {
  const params = new URLSearchParams(location.search);
  return new Set((params.has("tags") ? params.get("tags").split(",") : defaultTags)
    .map((tag) => aliases[tag] || tag).filter((tag) => allowed.has(tag)));
}

let selected = readSelection();

function render() {
  topicColors.ensureSelection(selected);
  if (!exportLink.disabled) document.querySelector("#cv-pdf-status").textContent = "";
  const openDetails = new Set([...appNode.querySelectorAll("details[open]")].map((node) => node.id));
  appNode.innerHTML = renderWork(data, selected);
  for (const node of appNode.querySelectorAll("details")) node.open = openDetails.has(node.id);
  for (const button of tagsNode.querySelectorAll("[data-select-tag]")) {
    const tag = button.dataset.selectTag;
    const isSelected = selected.has(tag);
    button.setAttribute("aria-pressed", String(isSelected));
    const implied = !isSelected && sourceForTag(tag, selected, aliases, topicGraph);
    if (!isSelected && !implied) continue;
    const node = button.closest(".cv-filter-node");
    const containers = [
      ...(isSelected ? node.querySelectorAll(".cv-topic-children") : []),
      ...function ancestors() {
        const result = [];
        let current = node.parentElement.closest(".cv-topic-children");
        while (current) {
          result.push(current);
          current = current.parentElement.parentElement.closest(".cv-topic-children");
        }
        return result;
      }(),
    ];
    for (const children of containers) {
      children.hidden = false;
      const toggle = children.parentElement.querySelector(":scope > .cv-topic-parent-row [data-topic-toggle]");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "true");
        toggle.textContent = "▾";
      }
    }
  }
  const matching = data.work.map((item, index) => ({item, index})).filter(({item}) => matchesTags(item.tags, selected, aliases, topicGraph));
  const { individual, grouped, recentGrouped } = partitionWork(data, selected);
  const groupedCount = grouped.length + recentGrouped.length;
  const groupedLabel = groupedCount ? ` · ${groupedCount} grouped` : "";
  statusNode.innerHTML = selected.size && matching.length
    ? `<a href="#experience-${matching[0].index}">${matching.length} highlighted</a>${groupedLabel}`
    : `${individual.length} experiences${groupedLabel}`;
  clearButton.disabled = selected.size === 0;
  const topics = data.filters.filter(({id}) => selected.has(id)).map(({label}) => label).join(", ");
  const publicUrl = new URL(document.querySelector('link[rel="canonical"]').href);
  publicUrl.searchParams.set("tags", [...selected].join(","));
  generationNote.innerHTML = `Generated ${topics ? `for ${escapeHtml(topics)}` : "overview"} · <a href="${escapeHtml(publicUrl.href)}">Full CV</a>`;
  generationNote.hidden = true;
  void applyTopicHighlights();
}

function update() {
  const next = new URL(location.href);
  next.searchParams.delete("focus");
  next.searchParams.delete("depth");
  next.searchParams.set("tags", [...selected].join(","));
  history.replaceState(null, "", next);
  render();
}

function handleTopicToggle(event) {
  const button = event.target.closest?.("[data-topic-toggle]");
  if (!button) return false;
  const children = document.getElementById(button.getAttribute("aria-controls"));
  if (!children) return true;
  const expanded = button.getAttribute("aria-expanded") !== "true";
  button.setAttribute("aria-expanded", String(expanded));
  button.textContent = expanded ? "▾" : "▸";
  children.hidden = !expanded;
  return true;
}

function toggleTopic(control) {
  const tag = control?.dataset.selectTag;
  if (!tag || !allowed.has(tag)) return;
  if (selected.has(tag)) selected.delete(tag);
  else selected.add(tag);
  update();
}

controls.addEventListener("click", (event) => {
  if (handleTopicToggle(event)) return;
  toggleTopic(event.target.closest?.("[data-select-tag]"));
});
controls.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const control = event.target.closest?.("[data-select-tag]");
  if (!control) return;
  event.preventDefault();
  toggleTopic(control);
});
appNode.addEventListener("click", (event) => {
  if (handleTopicToggle(event)) return;
  const button = event.target.closest?.("[data-add-tag]");
  const tag = button?.dataset.addTag;
  if (!tag || !allowed.has(tag)) return;
  selected.add(tag);
  update();
});
clearButton.addEventListener("click", () => { selected.clear(); update(); });
controls.addEventListener("submit", (event) => event.preventDefault());
window.addEventListener("popstate", () => { selected = readSelection(); render(); });

// Print the same static content even when someone uses the browser shortcut
// directly on the interactive page. Restore their disclosures afterwards.
let beforePrintHtml = null;
window.addEventListener("beforeprint", () => {
  highlightEpoch += 1;
  if (beforePrintHtml === null) {
    beforePrintHtml = appNode.innerHTML;
    appNode.innerHTML = renderWork(data, selected, { staticView: true, compact: true });
  }
  generationNote.hidden = false;
});
window.addEventListener("afterprint", () => {
  if (beforePrintHtml !== null) {
    appNode.innerHTML = beforePrintHtml;
    beforePrintHtml = null;
  }
  generationNote.hidden = true;
  void applyTopicHighlights();
});
let pdfLibrary;
exportLink.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const status = document.querySelector("#cv-pdf-status");
  const exportSelection = new Set(selected);
  const exportRoot = document.querySelector("main").cloneNode(true);
  exportRoot.querySelector("#cv-app").innerHTML = renderWork(data, exportSelection, { staticView: true, compact: true });
  button.disabled = true;
  status.textContent = "Generating PDF…";
  try {
    pdfLibrary ||= new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/cv/jspdf.umd.min.js";
      script.onload = resolve;
      script.onerror = () => { script.remove(); pdfLibrary = null; reject(new Error("Could not load PDF tools")); };
      document.head.append(script);
    });
    await pdfLibrary;
    const { createCvPdf, pdfBlocks } = await import("./cv-pdf.mjs");
    const filename = `Max-Yankov-CV-${[...exportSelection].join("-") || "overview"}.pdf`;
    const pdf = createCvPdf(window.jspdf.jsPDF, pdfBlocks(exportRoot), `${data.profile.name} — CV`);
    pdf.save(filename);
    const pages = pdf.getNumberOfPages();
    status.textContent = `Downloaded · ${pages} ${pages === 1 ? "page" : "pages"}`;
  } catch (error) {
    status.textContent = "PDF generation failed. Retry or use your browser’s Print command.";
    console.error(error);
  } finally { button.disabled = false; }
});
render();
controls.hidden = false;
document.querySelector(".cv-export-actions").hidden = false;
