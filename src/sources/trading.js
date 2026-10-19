// Trading: läser tradingbotens JSON.
// Botens svar: { budget, resultatProcent, ordrar, historik: [ { tid, värde } ], status }
import { result, example, fetchJSON } from "./_shared.js";

export const id = "trading";
export const namn = "Trading";
export const lamp = null;

function exempel() {
  // Lugn slumpvandring som slutar på +4,2 %. Samma kurva varje gång.
  let seed = 7, v = 1000;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  const historik = [];
  for (let i = 0; i < 40; i++) {
    v += rnd() * 12 + 1.05;
    historik.push({ tid: i, värde: Math.round(v * 100) / 100 });
  }
  // Skala om så att kurvan slutar exakt på 1 042 kr (+4,2 %).
  const k = 42 / (v - 1000);
  for (const p of historik) p.värde = Math.round((1000 + (p.värde - 1000) * k) * 100) / 100;
  return { budget: 1000, resultatProcent: 4.2, ordrar: 17, historik, status: "simulerad" };
}

export async function load(cfg, g) {
  if (!cfg.enabled || !cfg.url) return example(exempel());
  const j = await fetchJSON(cfg.url, g.timeout);
  return result("ok", {
    budget: Number(j.budget) || 0,
    resultatProcent: Number(j.resultatProcent) || 0,
    ordrar: Number(j.ordrar) || 0,
    historik: Array.isArray(j.historik) ? j.historik.map((p) => ({ tid: p.tid, värde: Number(p.värde ?? p.varde) })) : [],
    status: j.status || "",
  });
}
