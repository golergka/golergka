import { renderWork, defaultTags, expertiseLabels, partitionWork, escapeHtml, buildTopicGraph, sourceForTag, matchesTags, workTags } from "./cv-render.mjs";
import { createTopicColorDirectory, CV_TEXT_SELECTION_HUE } from "./cv-colors.mjs";

const data = JSON.parse(document.querySelector("#cv-data").textContent);
const controls = document.querySelector(".cv-controls");
const tagsNode = controls;
const appNode = document.querySelector("#cv-app");
const statusNode = document.querySelector("#cv-status");
const clearButton = document.querySelector("#cv-clear");
const allowed = new Set(data.filters.map(({ id }) => id));
const aliases = data.topicAliases || {};
const exportLink = document.querySelector("#cv-export");
const generationNote = document.querySelector("#cv-generation-note");
const expertiseNode = document.querySelector("#cv-expertise");
const topicGraph = buildTopicGraph(data.filters, data.topicRelations);
const topicParents = new Map(data.filters.filter(({parent}) => parent).map(({id, parent}) => [id, parent]));
const expandedTopicRoots = new Set();
document.documentElement.style.setProperty("--cv-text-selection", `oklch(var(--cv-topic-lightness) var(--cv-topic-chroma) ${CV_TEXT_SELECTION_HUE} / 0.58)`);
let highlightEpoch = 0;
let markLibrary;
let topicScrollFrame = 0;

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
const partialTopicColor = (tag) => topicColor(tag, 0.48);
const hoverTopicColor = (tag) => {
  topicColors.ensure(tag);
  return topicColor(tag, 0.31);
};

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

async function applyTopicHighlights(animationTarget = null) {
  const epoch = ++highlightEpoch;
  for (const mark of tagsNode.querySelectorAll("mark.cv-topic-selector-mark")) {
    const parent = mark.parentElement;
    mark.replaceWith(document.createTextNode(mark.textContent));
    parent.normalize();
  }
  const marks = [...document.querySelectorAll("mark[data-highlight-topics]")];
  const selectorRanges = [];
  for (const button of tagsNode.querySelectorAll("[data-select-tag]")) {
    const tag = button.dataset.selectTag;
    const isSelected = selected.has(tag);
    const source = isSelected ? null : sourceForTag(tag, selected, aliases, topicGraph);
    button.classList.toggle("cv-topic-implied", Boolean(source));
    button.classList.toggle("cv-topic-implied-partial", Boolean(source?.derived));
    const colorTopic = isSelected ? tag : source?.topic;
    if (colorTopic) selectorRanges.push({
      button,
      range: {start: 0, length: button.textContent.length, topics: [colorTopic], derived: Boolean(source?.derived)},
    });
  }
  marks.forEach((mark) => mark.style.setProperty("--topic-color", mark.dataset.highlightDerived
    ? partialTopicColor(mark.dataset.highlightTopics.split(",")[0])
    : topicColor(mark.dataset.highlightTopics.split(",")[0])));
  if (!marks.length && !selectorRanges.length) return;
  try {
    const Mark = await loadMarkLibrary();
    if (epoch !== highlightEpoch || marks.some((mark) => !mark.isConnected)) return;
    const styleHighlight = (element, range) => {
      element.dataset.highlightTopics = range.topics.join(",");
      const hoverTopics = range.hoverTopics?.length ? range.hoverTopics : range.topics;
      element.dataset.highlightableTopics = hoverTopics.join(",");
      element.setAttribute("role", "button");
      element.tabIndex = 0;
      if (range.derived) element.dataset.highlightDerived = "true";
      if (range.title) element.title = range.title;
      element.style.setProperty("--topic-color", range.derived ? partialTopicColor(range.topics[0]) : topicColor(range.topics[0]));
      element.style.setProperty("--topic-hover-color", hoverTopicColor(hoverTopics[0]));
      element.style.setProperty("--topic-color-2", range.topics[1] ? topicColor(range.topics[1], 0.95) : "transparent");
      element.style.setProperty("--topic-color-3", range.topics[2] ? topicColor(range.topics[2], 0.95) : "transparent");
    };
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
        hoverTopics: mark.dataset.highlightableTopics.split(",").filter(Boolean),
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
          styleHighlight(element, range);
        },
      });
    }
    for (const {button, range} of selectorRanges) {
      if (!button.isConnected) continue;
      new Mark(button).markRanges([range], {
        element: "mark",
        className: "cv-topic-mark cv-topic-selector-mark",
        each: styleHighlight,
      });
    }
  } catch (error) {
    console.warn("Enhanced topic highlighting unavailable; using native marks.", error);
  }
  animateTriggeredHighlight(animationTarget);
  for (const element of appNode.querySelectorAll("[data-highlightable-topics]")) prepareHoverHighlight(element);
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

function render(animationTarget = null) {
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
  }
  const matching = data.work.map((item, index) => ({item, index})).filter(({item}) => matchesTags(workTags(item), selected, aliases, topicGraph));
  const { individual, grouped, recentGrouped } = partitionWork(data, selected);
  const groupedCount = grouped.length + recentGrouped.length;
  const groupedLabel = groupedCount ? ` · ${groupedCount} grouped` : "";
  statusNode.innerHTML = selected.size && matching.length
    ? `<a href="#experience-${matching[0].index}">${matching.length} highlighted</a>${groupedLabel}`
    : `${individual.length} experiences${groupedLabel}`;
  clearButton.disabled = selected.size === 0;
  const topics = data.filters.filter(({id}) => selected.has(id)).map(({label}) => label).join(", ");
  document.querySelector("#cv-expertise-topics").textContent = expertiseLabels(data.filters, selected).join(" · ");
  const publicUrl = new URL(document.querySelector('link[rel="canonical"]').href);
  publicUrl.searchParams.set("tags", [...selected].join(","));
  generationNote.innerHTML = `Generated ${topics ? `for ${escapeHtml(topics)}` : "overview"} · <a href="${escapeHtml(publicUrl.href)}">Web version</a>`;
  generationNote.hidden = true;
  return applyTopicHighlights(animationTarget);
}

function update(animationTarget = null) {
  const next = new URL(location.href);
  next.searchParams.delete("focus");
  next.searchParams.delete("depth");
  next.searchParams.set("tags", [...selected].join(","));
  history.replaceState(null, "", next);
  return render(animationTarget);
}

function rootTopic(tag) {
  let root = tag;
  while (topicParents.has(root)) root = topicParents.get(root);
  return root;
}

for (const tag of selected) expandedTopicRoots.add(rootTopic(tag));

function syncTopicExpansion(justExpanded = null) {
  for (const branch of tagsNode.querySelectorAll('#cv-tags > [data-depth="0"]')) {
    const children = branch.querySelector(':scope > .cv-topic-children');
    if (!children) continue;
    const expanded = expandedTopicRoots.has(branch.dataset.topicId);
    children.hidden = !expanded;
    branch.dataset.expanded = String(expanded);
    if (expanded && branch.dataset.topicId === justExpanded) {
      children.classList.remove("cv-topic-children-entering");
      void children.offsetWidth;
      children.classList.add("cv-topic-children-entering");
    }
  }
}

function expandTopic(tag) {
  const root = rootTopic(tag);
  const added = !expandedTopicRoots.has(root);
  expandedTopicRoots.add(root);
  syncTopicExpansion(added ? root : null);
}

function visibleContentKeys() {
  return new Set([...appNode.querySelectorAll(".cv-role[id], .cv-earlier")].map((node) =>
    node.id || node.querySelector("[id]")?.id).filter(Boolean));
}

function animateNewContent(previousKeys) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (const node of appNode.querySelectorAll(".cv-role[id], .cv-earlier")) {
    const key = node.id || node.querySelector("[id]")?.id;
    if (!key || previousKeys.has(key)) continue;
    node.classList.add("cv-content-entering");
    node.addEventListener("animationend", () => node.classList.remove("cv-content-entering"), {once: true});
  }
}

function stopTopicScroll() {
  if (topicScrollFrame) cancelAnimationFrame(topicScrollFrame);
  topicScrollFrame = 0;
}

function quickScrollTo(y) {
  stopTopicScroll();
  const start = window.scrollY;
  const distance = y - start;
  if (Math.abs(distance) < 1) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, y);
    return;
  }
  const duration = 220;
  const started = performance.now();
  const scrollKeys = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
  const cleanup = () => {
    window.removeEventListener("wheel", interrupt);
    window.removeEventListener("touchmove", interrupt);
    window.removeEventListener("pointerdown", interrupt);
    window.removeEventListener("keydown", interrupt);
  };
  const interrupt = (event) => {
    if (event.type === "keydown" && !scrollKeys.has(event.key)) return;
    stopTopicScroll();
    cleanup();
  };
  window.addEventListener("wheel", interrupt, {passive: true});
  window.addEventListener("touchmove", interrupt, {passive: true});
  window.addEventListener("pointerdown", interrupt, {passive: true});
  window.addEventListener("keydown", interrupt);
  const step = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    window.scrollTo(0, start + distance * eased);
    if (progress < 1) topicScrollFrame = requestAnimationFrame(step);
    else {
      topicScrollFrame = 0;
      cleanup();
    }
  };
  topicScrollFrame = requestAnimationFrame(step);
}

function revealFirstEvidence(topic) {
  const evidence = [...appNode.querySelectorAll("[data-highlight-topics]")].filter((node) =>
    node.dataset.highlightTopics.split(",").includes(topic));
  if (!evidence.length) return;
  const visible = evidence.some((node) => {
    const rect = node.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  });
  if (visible) return;
  const rect = evidence[0].getBoundingClientRect();
  quickScrollTo(Math.max(0, window.scrollY + rect.top - Math.min(80, window.innerHeight * 0.1)));
}

function captureScrollAnchor(control) {
  const role = control?.closest?.(".cv-role");
  const suggestions = control?.closest?.(".cv-topic-suggestions");
  const evidence = control?.closest?.("[data-highlightable-topics]");
  const node = suggestions || evidence || control?.closest?.("[data-select-tag]") || role || control;
  if (!node) return () => {};
  const top = node.getBoundingClientRect().top;
  const roleId = role?.id;
  const isSuggestionLine = node.classList?.contains("cv-topic-suggestions");
  const evidenceTopics = evidence?.dataset.highlightableTopics;
  const evidenceText = evidence?.textContent;
  const evidenceIndex = evidence && role
    ? [...role.querySelectorAll("[data-highlightable-topics]")]
      .filter((candidate) => candidate.dataset.highlightableTopics === evidenceTopics && candidate.textContent === evidenceText)
      .indexOf(evidence)
    : -1;
  const tag = node.dataset?.selectTag;
  const id = node.id;
  return () => {
    const nextRole = roleId ? document.getElementById(roleId) : null;
    const matchingEvidence = evidenceTopics && nextRole
      ? [...nextRole.querySelectorAll("[data-highlightable-topics]")]
        .filter((candidate) => candidate.dataset.highlightableTopics === evidenceTopics && candidate.textContent === evidenceText)
      : [];
    const next = isSuggestionLine ? nextRole?.querySelector(".cv-topic-suggestions") || nextRole
      : evidence ? matchingEvidence[evidenceIndex] || matchingEvidence[0] || nextRole
      : tag ? tagsNode.querySelector(`[data-select-tag="${tag}"]`)
        : nextRole || (id ? document.getElementById(id) : null);
    if (!next) return;
    const delta = next.getBoundingClientRect().top - top;
    if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
  };
}

function describeHighlight(control) {
  const evidence = control?.closest?.("[data-highlightable-topics]");
  const role = evidence?.closest?.(".cv-role");
  if (!evidence || !role?.id) return null;
  const topics = evidence.dataset.highlightableTopics;
  const text = evidence.textContent;
  const index = [...role.querySelectorAll("[data-highlightable-topics]")]
    .filter((candidate) => candidate.dataset.highlightableTopics === topics && candidate.textContent === text)
    .indexOf(evidence);
  return index < 0 ? null : { roleId: role.id, topics, text, index };
}

function animateTriggeredHighlight(target) {
  if (!target || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const role = document.getElementById(target.roleId);
  const candidates = role ? [...role.querySelectorAll(".cv-topic-mark[data-highlightable-topics]")]
    .filter((candidate) => candidate.dataset.highlightableTopics === target.topics && candidate.textContent === target.text) : [];
  const highlight = candidates[target.index];
  if (!highlight) return;
  highlight.classList.add("cv-topic-mark-entering");
  highlight.addEventListener("animationend", () => highlight.classList.remove("cv-topic-mark-entering"), {once: true});
}

function updateWithAnchor(control, change, activatedTopic = null) {
  const restoreScroll = captureScrollAnchor(control);
  const animationTarget = describeHighlight(control);
  const previousKeys = visibleContentKeys();
  const root = document.documentElement;
  root.classList.add("cv-scroll-lock");
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  change();
  const rendered = update(animationTarget);
  restoreScroll();
  const finish = () => requestAnimationFrame(() => {
    restoreScroll();
    requestAnimationFrame(() => {
      restoreScroll();
      root.classList.remove("cv-scroll-lock");
      animateNewContent(previousKeys);
      if (activatedTopic) revealFirstEvidence(activatedTopic);
    });
  });
  void rendered.then(finish, finish);
}

function toggleTopic(control) {
  const tag = control?.dataset.selectTag;
  if (!tag || !allowed.has(tag)) return;
  const activating = !selected.has(tag);
  updateWithAnchor(control, () => {
    expandTopic(tag);
    if (selected.has(tag)) selected.delete(tag);
    else selected.add(tag);
  }, activating ? tag : null);
}

function preventTopicTextSelection(event) {
  if (event.target.closest?.("[data-select-tag], [data-add-tag], [data-highlightable-topics]")) event.preventDefault();
}

function prepareHoverHighlight(element) {
  const topic = element?.dataset.highlightableTopics?.split(",")[0];
  if (topic && allowed.has(topic)) element.style.setProperty("--topic-hover-color", hoverTopicColor(topic));
}

function toggleEvidenceTopic(evidence) {
  const selectedTopic = evidence?.dataset.highlightTopics?.split(",").find((tag) => selected.has(tag));
  const topic = selectedTopic || evidence?.dataset.highlightableTopics?.split(",")[0];
  if (!topic || !allowed.has(topic)) return false;
  const activating = !selected.has(topic);
  updateWithAnchor(evidence, () => {
    expandTopic(topic);
    if (selected.has(topic)) selected.delete(topic);
    else selected.add(topic);
  }, activating ? topic : null);
  return true;
}

controls.addEventListener("dblclick", preventTopicTextSelection);
controls.addEventListener("click", (event) => {
  toggleTopic(event.target.closest?.("[data-select-tag]"));
});
controls.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const control = event.target.closest?.("[data-select-tag]");
  if (!control) return;
  event.preventDefault();
  toggleTopic(control);
});
appNode.addEventListener("dblclick", preventTopicTextSelection);
appNode.addEventListener("pointerover", (event) => prepareHoverHighlight(event.target.closest?.("[data-highlightable-topics]")));
appNode.addEventListener("click", (event) => {
  const evidence = event.target.closest?.("[data-highlightable-topics]");
  if (toggleEvidenceTopic(evidence)) return;
  const control = event.target.closest?.("[data-add-tag]");
  const tag = control?.dataset.addTag;
  if (!tag || !allowed.has(tag)) return;
  updateWithAnchor(control, () => {
    expandTopic(tag);
    selected.add(tag);
  }, tag);
});
appNode.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const evidence = event.target.closest?.("[data-highlightable-topics]");
  if (evidence) {
    event.preventDefault();
    toggleEvidenceTopic(evidence);
    return;
  }
  const control = event.target.closest?.("[data-add-tag]");
  const tag = control?.dataset.addTag;
  if (!tag || !allowed.has(tag)) return;
  event.preventDefault();
  updateWithAnchor(control, () => {
    expandTopic(tag);
    selected.add(tag);
  }, tag);
});
clearButton.addEventListener("click", () => updateWithAnchor(clearButton, () => selected.clear()));
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
  expertiseNode.hidden = false;
});
window.addEventListener("afterprint", () => {
  if (beforePrintHtml !== null) {
    appNode.innerHTML = beforePrintHtml;
    beforePrintHtml = null;
  }
  generationNote.hidden = true;
  expertiseNode.hidden = true;
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
syncTopicExpansion();
render();
expertiseNode.hidden = true;
controls.hidden = false;
document.querySelector(".cv-export-actions").hidden = false;
