const normalizeHue = (value) => ((Math.round(Number(value)) % 360) + 360) % 360;
const hueDistance = (left, right) => Math.min(Math.abs(left - right), 360 - Math.abs(left - right));

export function createTopicColorDirectory(topicIds, saved = {}, persist = () => {}) {
  const allowed = new Set(topicIds);
  const hues = new Map();
  const used = new Set();

  for (const topic of topicIds) {
    if (!Object.hasOwn(saved, topic) || !Number.isFinite(Number(saved[topic]))) continue;
    const hue = normalizeHue(saved[topic]);
    if (used.has(hue)) continue;
    hues.set(topic, hue);
    used.add(hue);
  }

  const snapshot = () => Object.fromEntries(hues);
  const save = () => persist(snapshot());

  function chooseHue(activeTopics) {
    const activeHues = [...new Set([...activeTopics].map((topic) => hues.get(topic)).filter(Number.isFinite))];
    const comparison = activeHues.length ? activeHues : [...hues.values()];
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

  function ensure(topic, activeTopics = []) {
    if (!allowed.has(topic)) return null;
    if (hues.has(topic)) return hues.get(topic);
    const hue = chooseHue(activeTopics);
    hues.set(topic, hue);
    used.add(hue);
    save();
    return hue;
  }

  function ensureSelection(topics) {
    const active = [];
    for (const topic of topics) {
      ensure(topic, active);
      active.push(topic);
    }
  }

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
