import { flushSync } from "preact/compat";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import {
  buildTopicGraph,
  defaultTags,
  expandedRoots,
  expertiseLabels,
  filtersWithEvidence,
  matchesTags,
  partitionWork,
  selectedExpertiseLabels,
  workTags,
} from "./model.mjs";
import { createTopicColorDirectory } from "./colors.mjs";
import { TopicTree } from "./components/topics.jsx";
import { Work } from "./components/experience.jsx";
import { PDF_ERROR_STATUS } from "./constants.mjs";

const colorStorageKey = "cv-topic-color-directory-v1";
export function readSelection(data, search) {
  const params = new URLSearchParams(search),
    allowed = new Set(
      filtersWithEvidence(data.filters, data.work, data.topicAliases).map(
        ({ id }) => id,
      ),
    );
  return new Set(
    (params.has("tags") ? params.get("tags").split(",") : defaultTags)
      .map((tag) => data.topicAliases?.[tag] || tag)
      .filter((tag) => allowed.has(tag)),
  );
}
function rootsFor(data, selection) {
  return expandedRoots(
    data.filters,
    selection,
    data.topicAliases,
    data.topicRelations,
  );
}

export function App({ data, exportSelection, createPdf }) {
  const [selected, setSelected] = useState(() => exportSelection || new Set());
  const [ready, setReady] = useState(false);
  const [printing, setPrinting] = useState(Boolean(exportSelection));
  const [expanded, setExpanded] = useState(new Set());
  const [expandedExperiences, setExpandedExperiences] = useState(new Set());
  const [pdfStatus, setPdfStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const scrollAnchor = useRef(null);
  const [colors, setColors] = useState(() =>
    createTopicColorDirectory(data.filters.map(({ id }) => id)),
  );
  const graph = useMemo(
    () => buildTopicGraph(data.filters, data.topicRelations),
    [data],
  );
  const labels = useMemo(
    () => new Map(data.filters.map(({ id, label }) => [id, label])),
    [data],
  );
  const visibleFilters = useMemo(
    () => filtersWithEvidence(data.filters, data.work, data.topicAliases),
    [data],
  );
  const expertise = exportSelection
    ? selectedExpertiseLabels(data.filters, selected)
    : expertiseLabels(data.filters, selected);

  useEffect(() => {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(colorStorageKey) || "{}");
    } catch {}
    setColors(
      createTopicColorDirectory(
        data.filters.map(({ id }) => id),
        saved,
        (next) => {
          try {
            localStorage.setItem(colorStorageKey, JSON.stringify(next));
          } catch {}
        },
      ),
    );
    const syncUrl = () => {
      const selection = readSelection(data, location.search);
      setSelected(selection);
      setExpanded((previous) =>
        new Set([...previous, ...rootsFor(data, selection)]),
      );
    };
    syncUrl();
    setReady(true);
    const url = new URL(location.href);
    url.searchParams.delete("view");
    history.replaceState(null, "", url);
    const beforePrint = () => flushSync(() => setPrinting(true)),
      afterPrint = () => setPrinting(false);
    window.addEventListener("popstate", syncUrl);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("popstate", syncUrl);
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [data]);

  useLayoutEffect(() => {
    const anchor = scrollAnchor.current;
    if (!anchor) return;
    scrollAnchor.current = null;
    if (anchor.experienceIndex !== undefined) {
      anchor.node = document.querySelector(`#experience-${anchor.experienceIndex} .cv-experience-details summary`) || anchor.node;
    }
    if (anchor.node.isConnected)
      window.scrollBy(0, anchor.node.getBoundingClientRect().top - anchor.top);
    document.documentElement.classList.remove("cv-scroll-lock");
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const node of document.querySelectorAll(
        ".cv-role[id], .cv-earlier",
      )) {
        if (anchor.previousNodes.has(node)) continue;
        node.classList.add("cv-content-entering");
        node.addEventListener(
          "animationend",
          () => node.classList.remove("cv-content-entering"),
          { once: true },
        );
      }
    }
    if (anchor.topic) {
      const evidence = [
        ...document.querySelectorAll("#cv-app [data-highlight-topics]"),
      ].filter((node) =>
        node.dataset.highlightTopics.split(",").includes(anchor.topic),
      );
      if (
        !evidence.some((node) => {
          const rect = node.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < innerHeight;
        })
      ) {
        evidence[0]?.scrollIntoView({
          block: "center",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
      }
    }
  }, [selected, expandedExperiences]);

  function toggleExperience(index, node) {
    scrollAnchor.current = {
      node,
      experienceIndex: index,
      top: node.getBoundingClientRect().top,
      previousNodes: new Set(document.querySelectorAll(".cv-role[id], .cv-earlier")),
    };
    document.documentElement.classList.add("cv-scroll-lock");
    setExpandedExperiences((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function changeSelection(next, node, topic) {
    if (node) {
      scrollAnchor.current = {
        node,
        top: node.getBoundingClientRect().top,
        topic,
        previousNodes: new Set(
          document.querySelectorAll(".cv-role[id], .cv-earlier"),
        ),
      };
      document.documentElement.classList.add("cv-scroll-lock");
    }
    colors.ensureSelection(next);
    setSelected(next);
    setPdfStatus("");
    setExpanded((previous) =>
      new Set([...previous, ...rootsFor(data, next)]),
    );
    const url = new URL(location.href);
    ["focus", "depth", "view"].forEach((key) => url.searchParams.delete(key));
    url.searchParams.set("tags", [...next].join(","));
    history.replaceState(null, "", url);
  }
  function toggle(tag, node, addOnly = false) {
    if (!ready || !labels.has(tag)) return;
    const next = new Set(selected),
      activating = !next.has(tag);
    if (next.has(tag) && !addOnly) next.delete(tag);
    else next.add(tag);
    changeSelection(next, node, activating ? tag : null);
  }
  const context = {
    selected,
    expanded,
    expandedExperiences,
    toggleExperience,
    graph,
    labels,
    aliases: data.topicAliases || {},
    colors,
    ready: ready && !printing,
    toggle,
  };
  colors.ensureSelection(selected);
  const { individual, grouped, recentGrouped } = partitionWork(data, selected);
  const matching = data.work
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        matchesTags(workTags(item), selected, context.aliases, graph),
    );
  const groupedCount = grouped.length + recentGrouped.length;

  async function downloadPdf() {
    const selection = new Set(selected);
    setExporting(true);
    setPdfStatus("Generating PDF…");
    try {
      const pages = await createPdf(data, selection);
      setPdfStatus(`Downloaded · ${pages} ${pages === 1 ? "page" : "pages"}`);
    } catch (error) {
      console.error(error);
      setPdfStatus(PDF_ERROR_STATUS);
    } finally {
      setExporting(false);
    }
  }

  const profile = data.profile;
  return (
    <>
      <h1>{profile.name}</h1>
      <div id="cv-profile" class="cv-profile">
        <p class="cv-headline">{profile.headline}</p>
        <p class="cv-global-lead">{profile.summary}</p>
        <p class="cv-links">
          <a href={`mailto:${profile.email}`}>{profile.email}</a> ·{" "}
          <a href={profile.github}>GitHub</a>
          {profile.linkedin && !printing && (
            <>
              {" "}
              · <a href={profile.linkedin}>LinkedIn</a>
            </>
          )}
          {profile.twitter && (
            <>
              {" "}
              · <a href={profile.twitter}>Twitter</a>
            </>
          )}{" "}
          · <a href={profile.stackoverflow}>Stack Overflow</a>
        </p>
        <p id="cv-generation-note" class="cv-generation-note" hidden={!printing}>
          Compiled to these tags. Visit{" "}
          <a href="https://golergka.com/cv/">golergka.com/cv</a> to get another
          personalized version
        </p>
        <p id="cv-expertise" class="cv-expertise" hidden={ready && !printing}>
          <strong>Selected expertise:</strong>{" "}
          <span id="cv-expertise-topics">
            {expertise.join(" · ")}
          </span>
        </p>
      </div>
      <p class="cv-export-actions" hidden={!ready || printing}>
        <button
          type="button"
          id="cv-export"
          disabled={exporting}
          onClick={downloadPdf}
        >
          Generate PDF
        </button>{" "}
        <span id="cv-pdf-status" role="status">
          {pdfStatus}
        </span>
      </p>
      <form
        class="cv-controls"
        aria-label="Highlight experience by topic"
        hidden={!ready || printing}
        onSubmit={(event) => event.preventDefault()}
      >
        <p class="cv-tag-instruction">
          <strong>Click</strong> to expand relevant experience
        </p>
        {[
          ["cv-tags", false],
          ["cv-faq", true],
        ].map(([id, faq]) => (
          <fieldset
            key={id}
            class={faq ? "cv-faq-controls" : undefined}
            aria-label={faq ? "FAQ tags" : "Experience tags"}
          >
            <div id={id} class="cv-topic-list">
              <TopicTree
                filters={visibleFilters.filter(
                  ({ kind }) => (kind === "faq") === faq,
                )}
                context={context}
              />
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          id="cv-clear"
          disabled={!selected.size}
          onClick={(event) => changeSelection(new Set(), event.currentTarget)}
        >
          Clear
        </button>
      </form>
      <div class="cv-section-heading">
        <h2>Experience</h2>
        <p id="cv-status" role="status">
          {selected.size && matching.length ? (
            <a href={`#experience-${matching[0].index}`}>
              {matching.length} highlighted
            </a>
          ) : (
            `${individual.length} experiences`
          )}
          {groupedCount > 0 && ` · ${groupedCount} grouped`}
        </p>
      </div>
      <Work data={data} context={context} compact={Boolean(exportSelection)} />
      <div class="cv-credentials">
        {[
          ["Education", data.education],
          ["Languages", data.languages],
        ].map(
          ([title, items]) =>
            items?.length > 0 && (
              <section key={title} class="cv-credential-section">
                <h2>{title}</h2>
                <p>{items.join(" · ")}</p>
              </section>
            ),
        )}
      </div>
    </>
  );
}
