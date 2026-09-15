const normalizeHue = (value) => ((Math.round(Number(value)) % 360) + 360) % 360;
const hueDistance = (left, right) => Math.min(Math.abs(left - right), 360 - Math.abs(left - right));
const MIN_SAVED_HUE_DISTANCE = 12;
export const CV_TEXT_SELECTION_HUE = 210;
const RESERVED_UI_HUES = [CV_TEXT_SELECTION_HUE];

export function createTopicColorDirectory(topicIds, saved = {}, persist = () => {}) {
  const allowed = new Set(topicIds);
  const hues = new Map();
  const used = new Set(RESERVED_UI_HUES);
  let repaired = Object.keys(saved).some((topic) => !allowed.has(topic));

  for (const topic of topicIds) {
    if (!Object.hasOwn(saved, topic)) continue;
    if (!Number.isFinite(Number(saved[topic]))) {
      repaired = true;
      continue;
    }
    const hue = normalizeHue(saved[topic]);
    if (Number(saved[topic]) !== hue) repaired = true;
    if ([...used].some((reserved) => hueDistance(reserved, hue) < MIN_SAVED_HUE_DISTANCE)) {
      repaired = true;
      continue;
    }
    hues.set(topic, hue);
    used.add(hue);
  }

  const snapshot = () => Object.fromEntries(hues);
  const save = () => persist(snapshot());

  function chooseHue() {
    const comparison = [...used];
    let bestHue = 346;
    let bestDistance = -1;

    for (let offset = 0; offset < 360; offset += 1) {
      const candidate = (346 + offset) % 360;
      if (used.has(candidate)) continue;
      const distance = comparison.length
        ? Math.min(...comparison.map((hue) => hueDistance(candidate, hue)))
        : 180;
      if (distance > bestDistance) {
        bestHue = candidate;
        bestDistance = distance;
      }
    }
    return bestHue;
  }

  function ensure(topic) {
    if (!allowed.has(topic)) return null;
    if (hues.has(topic)) return hues.get(topic);
    const hue = chooseHue();
    hues.set(topic, hue);
    used.add(hue);
    save();
    return hue;
  }

  function ensureSelection(topics) {
    for (const topic of topics) {
      ensure(topic);
    }
  }

  if (repaired) save();

  return {
    ensure,
    ensureSelection,
    snapshot,
    color(topic, alpha = 0.62) {
      const hue = hues.get(topic);
      return Number.isFinite(hue) ? `hsla(${hue}, 82%, 67%, ${alpha})` : "transparent";
    },
  };
}
