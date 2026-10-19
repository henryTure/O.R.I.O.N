// Systemlogg: live-händelser, nyast längst ner.
import { $, esc, hhmmss } from "./ui.js";

const MAX = 60;

export function log(msg, level = "") {
  const ul = $("#syslog");
  if (!ul) return;
  const li = document.createElement("li");
  li.innerHTML = `<time>${hhmmss(new Date())}</time><span class="${level}">${esc(msg)}</span>`;
  ul.appendChild(li);
  while (ul.children.length > MAX) ul.firstElementChild.remove();
  ul.scrollTop = ul.scrollHeight;
}
