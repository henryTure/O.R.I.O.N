// ORION – startpunkt. Kopplar ihop klocka, kärna, datakällor, paneler och logg.
import config from "../config.js";
import { $, reduced, pad, isoWeek, hhmmss } from "./ui.js";
import { log } from "./log.js";
import { boot } from "./boot.js";
import { createCore } from "./core.js";
import { createVoice } from "./voice.js";
import { panels } from "./panels.js";
import { adapters, startSources } from "./sources/index.js";

// ---------- Grunddata från config ----------
document.querySelectorAll("[data-operator]").forEach((e) => (e.textContent = config.operator));
document.querySelectorAll("[data-klass]").forEach((e) => (e.textContent = config.klass));
$("#schoolBtns").innerHTML = config.skola
  .map((s) => `<a class="btn" target="_blank" rel="noopener" href="https://claude.ai/new?q=${encodeURIComponent(s.text)}">${s.namn}</a>`)
  .join("");

// ---------- Klocka ----------
const DAG = ["SÖN", "MÅN", "TIS", "ONS", "TOR", "FRE", "LÖR"];
const MAN = ["JAN", "FEB", "MAR", "APR", "MAJ", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"];
function tick() {
  const d = new Date();
  $("#hm").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  $("#ss").textContent = `:${pad(d.getSeconds())}`;
  $("#date").textContent = `${DAG[d.getDay()]} ${d.getDate()} ${MAN[d.getMonth()]} · V${isoWeek(d)}`;
  setTimeout(tick, 1000 - d.getMilliseconds());
}
tick();

// ---------- Systemstatus (lampor) ----------
const LAMP_TEXT = { ok: "kopplad", off: "ej kopplad", error: "ingen kontakt" };
const lampList = [{ id: "core", lamp: "KÄRNA" }, ...adapters.filter((a) => a.lamp)];
$("#lamps").innerHTML = lampList.map((a) => `<li class="lamp ${a.id === "core" ? "ok" : "off"}" id="lamp-${a.id}"><i></i>${a.lamp}</li>`).join("");
lampList.forEach((a, i) => { const el = $(`#lamp-${a.id} i`); if (el) el.style.animationDelay = `${-i * 0.7}s`; });
function setLamp(id, status) {
  const el = $(`#lamp-${id}`);
  if (!el) return;
  el.className = `lamp ${status}`;
  el.title = `${el.textContent}: ${LAMP_TEXT[status]}`;
}
$("#lamp-core").title = "KÄRNA: kopplad";

// ---------- Datakällor ----------
let started = false;
const statusMsg = (a, r) =>
  r.status === "ok" ? [`${a.namn}: kopplad`, ""]
  : r.status === "error" ? [`${a.namn}: ingen kontakt (${r.error || "fel"})`, "alarm"]
  : [`${a.namn}: väntar på koppling`, "warn"];

const sources = startSources(config, (a, r, prev) => {
  if (a.lamp) setLamp(a.id, r.status);
  panels[a.id]?.(r);
  if (!started) return; // första omgången loggas efter uppstarten
  if (!prev || prev.status !== r.status) log(...statusMsg(a, r));
  else if (r.status === "ok" && ["trading", "news", "github"].includes(a.id)) log(`${a.namn}: ny data`);
  updateFooter();
});

function updateFooter() {
  const ex = Object.values(sources.state).some((r) => r.example);
  $("#footData").textContent = ex ? "Alla siffror är exempel" : "Live-data";
}

// Schemat byter pågående lektion varje minut
setInterval(() => sources.state.schedule && panels.schedule(sources.state.schedule), 30e3);

// ---------- Kärnan ----------
const LABEL = {
  vila: ["VILA", "Inväntar order"],
  lyssnar: ["LYSSNAR", "Lyssnar"],
  analysera: ["ANALYSERAR", "Analyserar"],
};
const core = createCore($("#coreCanvas"), {
  reduced,
  onNodes: (n) => ($("#coreNodes").textContent = n),
  onMode: (m) => {
    $("#p-core").dataset.mode = m;
    $("#coreState").textContent = LABEL[m][0];
    $("#coreOrder").textContent = LABEL[m][1];
    if (started) log(`Kärna: läge ${LABEL[m][0]}`);
  },
});

// ---------- Tala med ORION ----------
// När du slutat prata analyserar kärnan en stund och går sedan till VILA.
// Kopplas en egen chatt in senare kan ANALYSERAR i stället ligga kvar tills svaret kommit.
createVoice({
  onMode: (m) => {
    if (m === "analysera") { core.setMode("vila"); core.analyze(); }
    else core.setMode(m);
  },
});

// ---------- Uppstart och paneler ----------
const panelEls = [...document.querySelectorAll(".panel")];
const moduleCount = panelEls.length - 1; // kärnan räknas inte som modul

function revealPanels() {
  // Visa i den ordning de syns (mobil: uppifrån och ner; dator: rad för rad)
  const sorted = panelEls
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .sort((a, b) => Math.round(a.r.top / 40) - Math.round(b.r.top / 40) || a.r.left - b.r.left);
  sorted.forEach(({ el }, i) => {
    el.style.setProperty("--h", el.offsetHeight + 60 + "px");
    setTimeout(() => el.classList.add("in"), reduced ? 0 : i * 110);
  });
}

const firstRound = Promise.race([sources.first, new Promise((r) => setTimeout(r, 1500))]);
boot([
  ["INITIERAR KÄRNA", "OK"],
  ["LADDAR MODULER", `${moduleCount}/${moduleCount}`],
  firstRound.then(() => {
    const ok = 1 + adapters.filter((a) => a.lamp && sources.state[a.id]?.status === "ok").length;
    const total = lampList.length;
    return ["KOPPLINGAR", `${ok}/${total}`, ok === total ? "ok" : "warn"];
  }),
  ["KLOCKA SYNKAD", hhmmss(new Date())],
  ["OPERATÖR", config.operator.toUpperCase()],
  ["LEDNINGSCENTRAL", "REDO"],
]).then(() => {
  revealPanels();
  started = true;
  log("Kärna online");
  log(`Moduler laddade: ${moduleCount}/${moduleCount}`);
  for (const a of adapters) {
    const r = sources.state[a.id];
    if (r && a.lamp) log(...statusMsg(a, r));
    else if (r?.status === "error") log(...statusMsg(a, r));
  }
  updateFooter();
});

// ---------- Live-händelser ----------
const t0 = Date.now();
setInterval(() => {
  const s = Math.floor((Date.now() - t0) / 1000);
  log(`Puls OK · drifttid ${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`);
}, 60e3);
window.addEventListener("online", () => log("Nät: uppkopplad"));
window.addEventListener("offline", () => log("Nät: frånkopplad", "alarm"));
document.addEventListener("visibilitychange", () => { if (!document.hidden && started) { log("Operatör tillbaka"); sources.refresh(); } });

// ---------- PWA ----------
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
