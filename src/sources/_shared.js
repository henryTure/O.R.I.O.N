// Gemensamt för alla adaptrar.
// Varje adapter exporterar: id, namn, lamp (namn i systemstatusen eller null) och
// async load(cfg, global) som returnerar { status: "ok" | "off" | "error", updated, data }.

export const result = (status, data, extra = {}) => ({ status, updated: new Date(), data, ...extra });

// Exempeldata märks alltid så att panelerna kan visa EXEMPEL.
export const example = (data) => result("off", data, { example: true });

// Hämtar JSON med tidsgräns. Kastar fel om källan inte svarar eller svarar fel.
export async function fetchJSON(url, timeout = 8000, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    throw new Error(err.name === "AbortError" ? "svarar inte" : err.message);
  } finally {
    clearTimeout(timer);
  }
}
