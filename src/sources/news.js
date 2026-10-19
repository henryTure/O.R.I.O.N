// Underrättelse: nyheter inom AI, Marknad och Sjö.
// Nyhetssajters RSS kan inte läsas direkt från webbläsaren, så en liten server
// samlar ihop dem och svarar: { nyheter: [ { kategori, rubrik, lank, tid } ] }
import { result, example, fetchJSON } from "./_shared.js";

export const id = "news";
export const namn = "Underrättelse";
export const lamp = null;

const EXEMPEL = [
  { kategori: "AI", rubrik: "Rubriker hämtas när nyhetskällan är kopplad" },
  { kategori: "Marknad", rubrik: "Dagens rörelser på börsen" },
  { kategori: "Sjö", rubrik: "Kuling- och farledsvarningar för Västkusten" },
];

export async function load(cfg, g) {
  if (!cfg.enabled || !cfg.url) return example({ nyheter: EXEMPEL });
  const j = await fetchJSON(cfg.url, g.timeout);
  return result("ok", { nyheter: (j.nyheter || []).slice(0, 6) });
}
