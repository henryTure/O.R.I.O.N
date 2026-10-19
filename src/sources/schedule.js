// Schema: lektioner för klassen.
// Skolschemas egna API kräver en server (se README). Den servern ska svara:
// { lektioner: [ { dag: 1-5, start: "08:20", slut: "09:20", amne: "Engelska 6", sal: "B12" } ] }
import { result, example, fetchJSON } from "./_shared.js";

export const id = "schedule";
export const namn = "Schema";
export const lamp = "SCHEMA";

const EXEMPEL = [
  { start: "08:20", slut: "09:40", amne: "Navigation" },
  { start: "10:00", slut: "11:20", amne: "Engelska 6" },
  { start: "12:40", slut: "14:00", amne: "Sjömanskap" },
  { start: "14:30", slut: "15:40", amne: "Matematik 2" },
];

export async function load(cfg, g) {
  if (!cfg.enabled || !cfg.url) {
    return example({ lektioner: [1, 2, 3, 4, 5].flatMap((dag) => EXEMPEL.map((l) => ({ dag, ...l }))) });
  }
  const j = await fetchJSON(cfg.url, g.timeout);
  return result("ok", { lektioner: Array.isArray(j.lektioner) ? j.lektioner : [] });
}
