// Väder från SMHI:s öppna prognos-API (ingen nyckel). Vind, byar och riktning per plats.
import { result, fetchJSON } from "./_shared.js";

export const id = "weather";
export const namn = "SMHI";
export const lamp = "SMHI";

const URL_NY = (p) => `https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/${p.lon.toFixed(4)}/lat/${p.lat.toFixed(4)}/data.json`;
const URL_GAMMAL = (p) => `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${p.lon.toFixed(4)}/lat/${p.lat.toFixed(4)}/data.json`;

// Plockar ut nuvarande timme. Klarar både nya (snow1g) och gamla (pmp3g) formatet.
function nu(j) {
  const ts = j.timeSeries || [];
  const now = Date.now();
  const row = ts.find((r) => new Date(r.validTime || r.time).getTime() >= now - 30 * 60e3) || ts[0];
  if (!row) throw new Error("tom prognos");
  if (row.data) {
    const d = row.data;
    return { temp: d.air_temperature, vind: d.wind_speed, byar: d.wind_speed_of_gust, riktning: d.wind_from_direction };
  }
  const p = Object.fromEntries((row.parameters || []).map((x) => [x.name, x.values[0]]));
  return { temp: p.t, vind: p.ws, byar: p.gust, riktning: p.wd };
}

async function plats(p, timeout) {
  let j;
  try { j = await fetchJSON(URL_NY(p), timeout); }
  catch { j = await fetchJSON(URL_GAMMAL(p), timeout); }
  return { namn: p.namn, ...nu(j) };
}

export async function load(cfg, g) {
  const tomma = cfg.platser.map((p) => ({ namn: p.namn }));
  if (!cfg.enabled) return result("off", { platser: tomma });
  return result("ok", { platser: await Promise.all(cfg.platser.map((p) => plats(p, g.timeout))) });
}
