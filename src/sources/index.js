// Alla datakällor. Ordningen här styr ordningen på lamporna i sidhuvudet.
// Ny källa: importera filen här och lägg till den i listan.
import * as claude from "./claude.js";
import * as schedule from "./schedule.js";
import * as weather from "./weather.js";
import * as github from "./github.js";
import * as spotify from "./spotify.js";
import * as trading from "./trading.js";
import * as news from "./news.js";

export const adapters = [claude, schedule, weather, github, spotify, trading, news];

// Kör alla adaptrar, var och en för sig. En källa som felar påverkar aldrig de andra.
export function startSources(config, onUpdate) {
  const state = {};

  async function run(a) {
    const cfg = config.sources[a.id] || {};
    let r;
    try {
      r = await a.load(cfg, config);
    } catch (err) {
      r = { status: "error", updated: new Date(), data: null, error: err.message || "okänt fel" };
    }
    const prev = state[a.id];
    state[a.id] = r;
    try { onUpdate(a, r, prev); } catch (err) { console.error(a.id, err); }
    return r;
  }

  const first = Promise.all(adapters.map(run));

  for (const a of adapters) {
    const cfg = config.sources[a.id] || {};
    if (cfg.enabled && cfg.every) setInterval(() => !document.hidden && run(a), cfg.every * 1000);
  }
  // Hämta om allt som är äldre än en minut (eller allt, vid force).
  const all = (force = false) => adapters.forEach((a) => {
    if (force === true || !state[a.id] || Date.now() - state[a.id].updated > 60e3) run(a);
  });
  window.addEventListener("online", () => all(true));
  window.addEventListener("offline", () => all(true));

  return { state, first, refresh: all };
}
