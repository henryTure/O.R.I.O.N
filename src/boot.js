// Uppstartssekvens: ORION, statusrader en i taget, laddningslinje, tona bort.
import { $, reduced, typeText } from "./ui.js";

const dots = (a, b, w = 34) => a + " " + ".".repeat(Math.max(2, w - a.length - b.length)) + " " + b;

// lines: [[text, värde, klass]]. ready: löfte som ska vara klart innan sista raden.
export async function boot(lines) {
  const el = $("#boot"), box = $("#bootLines"), bar = $("#bootBar"), pct = $("#bootPct");
  let skip = false;
  const done = () => { skip = true; };
  el.addEventListener("pointerdown", done, { once: true });
  window.addEventListener("keydown", done, { once: true });
  const wait = (ms) => new Promise((r) => setTimeout(r, skip ? 0 : ms));

  await wait(reduced ? 0 : 650);
  for (let i = 0; i < lines.length; i++) {
    const [label, value, cls] = await lines[i];
    const row = document.createElement("div");
    box.appendChild(row);
    const text = dots(label, value);
    if (skip || reduced) row.textContent = text;
    else await typeText(row, text.slice(0, text.length - value.length), 110);
    row.innerHTML = "";
    row.append(text.slice(0, text.length - value.length));
    const v = document.createElement("span");
    v.className = cls || "ok";
    v.textContent = value;
    row.appendChild(v);
    const p = Math.round(((i + 1) / lines.length) * 100);
    bar.style.width = p + "%";
    pct.textContent = p + " %";
    await wait(120);
  }
  await wait(reduced ? 150 : 450);
  el.classList.add("done");
  await wait(reduced ? 0 : 350);
  setTimeout(() => el.remove(), 900);
}
