// Ritar varje panel utifrån sin adapters svar { status, updated, data }.
// Nyckeln är adapterns id.
import { $, esc, hhmm, countUp } from "./ui.js";

const NOCONTACT = "Ingen kontakt";

function foot(el, text, cls = "") {
  el.className = "foot" + (cls ? " " + cls : "");
  el.textContent = text;
}

function badge(el, text, cls = "") {
  el.className = "badge" + (cls ? " " + cls : "");
  el.textContent = text;
}

// ---------- Schema ----------
const toMin = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; };
const DAGAR = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];

function schedule(r) {
  const rows = $("#schedRows"), f = $("#schedFoot");
  if (r.status === "error") {
    rows.innerHTML = `<div class="r"><span class="t">—</span><span class="n">${NOCONTACT}</span><span></span></div>`;
    return foot(f, `Källa: Skolschema · ${NOCONTACT}`, "alarm");
  }
  const now = new Date();
  let dag = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const lektioner = r.data.lektioner || [];
  let idag = lektioner.filter((l) => Number(l.dag) === dag);
  let vilken = "";
  // Helg eller slut för dagen: visa nästa skoldag.
  if (!idag.length || mins > Math.max(...idag.map((l) => toMin(l.slut)))) {
    for (let i = 1; i <= 7; i++) {
      const d = (dag + i) % 7;
      const l = lektioner.filter((x) => Number(x.dag) === d);
      if (l.length) { idag = l; dag = d; vilken = DAGAR[d]; break; }
    }
  }
  idag.sort((a, b) => toMin(a.start) - toMin(b.start));
  const nu = vilken ? -1 : idag.findIndex((l) => mins >= toMin(l.start) && mins < toMin(l.slut));
  const nasta = vilken ? 0 : nu === -1 ? idag.findIndex((l) => toMin(l.start) > mins) : -1;
  rows.innerHTML = idag.length
    ? idag.map((l, i) => {
        const cls = i === nu ? "now" : i === nasta ? "next" : "";
        const t = i === nu ? "PÅGÅR" : l.start;
        const x = r.example ? "EXEMPEL" : esc(l.sal || "");
        return `<div class="r ${cls}"><span class="t">${t}</span><span class="n">${esc(l.amne)}</span><span class="x">${x}</span></div>`;
      }).join("")
    : `<div class="r"><span class="t">—</span><span class="n">Inga lektioner</span><span></span></div>`;
  const dagText = vilken ? ` · Visar ${vilken}` : "";
  if (r.status === "ok") foot(f, `Källa: Skolschema · ${hhmm(r.updated)}${dagText}`);
  else foot(f, `Källa: Skolschema · Ej kopplad${dagText}`);
}

// ---------- Trading ----------
let lastChart = "";
function trading(r) {
  const f = $("#tFoot"), chart = $("#tChart");
  const B = $("#tBudget"), P = $("#tResult"), O = $("#tOrders");
  if (r.status === "error") {
    [B, P, O].forEach((el) => (el.textContent = "—"));
    P.className = "";
    chart.innerHTML = "";
    lastChart = "";
    return foot(f, `${NOCONTACT} · Boten svarar inte`, "alarm");
  }
  const d = r.data;
  const key = JSON.stringify(d);
  if (key === lastChart) return;
  lastChart = key;
  countUp(B, d.budget, { suffix: " kr" });
  countUp(P, d.resultatProcent, { dec: 1, suffix: " %", sign: true });
  P.className = d.resultatProcent >= 0 ? "pos" : "neg";
  countUp(O, d.ordrar);
  drawChart(chart, d.historik.map((p) => p.värde).filter(Number.isFinite));
  if (r.example) foot(f, "Exempeldata · Boten kopplas i steg 2");
  else foot(f, `Bot ${d.status || "aktiv"} · ${hhmm(r.updated)}`, "ok");
}

function drawChart(el, vals) {
  el.classList.remove("drawn");
  if (vals.length < 2) { el.innerHTML = ""; return; }
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  // Kurvan ligger i nedre delen, som i förlagan
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * 300, 92 - ((v - min) / span) * 34]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const last = pts[pts.length - 1];
  el.innerHTML = `
    <svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="tgrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/>
        <stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient></defs>
      <line class="gl" x1="0" x2="300" y1="20" y2="20"/>
      <line class="gl" x1="0" x2="300" y1="48" y2="48"/>
      <line class="gl" x1="0" x2="300" y1="100" y2="100" style="opacity:.5"/>
      <path class="ar" d="${line} L300 100 L0 100 Z"/>
      <path class="ln" d="${line}" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1"/>
    </svg>
    <span class="dot" style="left:100%;top:${last[1]}%"></span>`;
  const ln = el.querySelector(".ln");
  // Efter animationen: ta bort streckningen så att linjen alltid når hela vägen fram.
  ln.addEventListener("transitionend", () => (ln.style.strokeDasharray = "none"), { once: true });
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) ln.style.strokeDasharray = "none";
  requestAnimationFrame(() => requestAnimationFrame(() => {
    ln.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.4,.1,.2,1)";
    ln.style.strokeDashoffset = "0";
    el.classList.add("drawn");
  }));
}

// ---------- Väder ----------
const RIKTNING = ["N", "NO", "O", "SO", "S", "SV", "V", "NV"];
const kompass = (deg) => (Number.isFinite(deg) ? RIKTNING[Math.round(deg / 45) % 8] : "—");
const num = (v, dec = 0) => (Number.isFinite(v) ? v.toLocaleString("sv-SE", { maximumFractionDigits: dec, minimumFractionDigits: dec }) : "—");

function weather(r) {
  const wx = $("#wx"), f = $("#wxFoot");
  const platser = r.data?.platser || [{ namn: "Öckerö" }, { namn: "Utpost Hållö" }];
  wx.innerHTML = platser.map((p, i) => i === 0
    ? `<div><span class="label">${esc(p.namn)}</span><b>${num(p.temp)}°</b><small>Vind ${num(p.vind)} m/s · byar ${num(p.byar)}</small></div>`
    : `<div class="hl"><span class="label">${esc(p.namn)}</span><b>${num(p.vind)} m/s</b><small>Byar ${num(p.byar)} · riktning ${kompass(p.riktning)}</small></div>`
  ).join("");
  if (r.status === "ok") foot(f, `SMHI prognos · ${hhmm(r.updated)}`);
  else if (r.status === "error") foot(f, `${NOCONTACT} · SMHI svarar inte`, "alarm");
  else foot(f, `${NOCONTACT} · Kopplas i steg 2`);
}

// ---------- Listor ----------
function list(el, items, keyCls = () => "") {
  el.innerHTML = items.map((it) => {
    const text = it.lank ? `<a href="${esc(it.lank)}" target="_blank" rel="noopener">${esc(it.text)}</a>` : esc(it.text);
    const when = it.tid ? `<span class="when">${esc(new Date(it.tid).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" }))}</span>` : "";
    return `<div class="it"><span class="k ${keyCls(it)}">${esc(it.k)}</span><span>${text}${when}</span></div>`;
  }).join("");
}

function news(r) {
  const b = $("#newsBadge"), l = $("#newsList");
  if (r.status === "error") {
    badge(b, NOCONTACT, "alarm");
    return list(l, [{ k: "—", text: "Nyhetskällan svarar inte" }]);
  }
  badge(b, r.example ? "Exempel" : "Live", r.example ? "" : "acc");
  list(l, r.data.nyheter.map((n) => ({ k: n.kategori, text: n.rubrik, lank: n.lank, tid: n.tid })),
    (it) => (/sjö/i.test(it.k) ? "warn" : ""));
}

function github(r) {
  const b = $("#ghBadge"), l = $("#ghList");
  if (r.status === "error") {
    badge(b, NOCONTACT, "alarm");
    return list(l, [{ k: "—", text: "GitHub svarar inte" }]);
  }
  badge(b, "GitHub", r.example ? "" : "acc");
  const a = r.data.andringar;
  list(l, a.length ? a.map((x) => ({ k: x.repo, text: x.text, lank: x.lank, tid: x.tid })) : [{ k: "—", text: "Inga ändringar på sistone" }]);
}

// ---------- Länkar ----------
function claude(r) {
  const c = r.data || {};
  document.querySelectorAll("[data-link]").forEach((a) => { if (c[a.dataset.link]) a.href = c[a.dataset.link]; });
  const b = $("#claudeBadge");
  if (r.status === "ok") badge(b, "Redo", "acc");
  else if (r.status === "error") badge(b, "Offline", "alarm");
  else badge(b, "Av", "warn");
}

function spotify(r) {
  if (r.data?.url) $("#spotifyBtn").href = r.data.url;
  $("#musicState").textContent = r.status === "ok" ? "Ljudkanal redo" : r.status === "error" ? NOCONTACT : "Ljudkanal av";
}

export const panels = { schedule, trading, weather, news, github, claude, spotify };
