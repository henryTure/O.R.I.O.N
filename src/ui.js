// Små hjälpfunktioner för gränssnittet.

export const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const $ = (sel) => document.querySelector(sel);

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const pad = (n) => String(n).padStart(2, "0");
export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const hhmmss = (d) => `${hhmm(d)}:${pad(d.getSeconds())}`;

export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 864e5 + 1) / 7);
}

const nf = (dec) => new Intl.NumberFormat("sv-SE", { minimumFractionDigits: dec, maximumFractionDigits: dec });

// Räknar upp en siffra till sitt värde.
export function countUp(el, to, { dec = 0, prefix = "", suffix = "", sign = false, ms = 1100 } = {}) {
  const fmt = (v) => (sign && v > 0 ? "+" : "") + prefix + nf(dec).format(v) + suffix;
  if (reduced || !Number.isFinite(to)) { el.textContent = Number.isFinite(to) ? fmt(to) : "—"; return; }
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(to * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Skriver ut text tecken för tecken.
export function typeText(el, text, cps = 70) {
  return new Promise((done) => {
    if (reduced) { el.textContent = text; return done(); }
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, 1000 / cps);
      else done();
    };
    tick();
  });
}
