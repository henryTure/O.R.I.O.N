// Tala med ORION: webbläsarens taligenkänning på svenska (sv-SE). Ingen nyckel, ingen server.
// Under lyssningen är kärnan i läget LYSSNAR. När du slutar prata blir det ANALYSERAR,
// och knappen "Skicka till Claude" visas.
import { $, esc } from "./ui.js";
import { sendToClaude } from "./chat.js";

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

const FEL = {
  "not-allowed": "Mikrofonen nekades. Tillåt mikrofon för den här sidan i webbläsarens inställningar.",
  "service-not-allowed": "Mikrofonen nekades. Tillåt mikrofon för den här sidan i webbläsarens inställningar.",
  "no-speech": "Jag hörde inget. Tryck på knappen och prova igen.",
  "audio-capture": "Ingen mikrofon hittades.",
  network: "Taligenkänningen behöver nätet. Kontrollera anslutningen.",
};

export function createVoice({ onMode = () => {} } = {}) {
  const btn = $("#voiceBtn"), sub = $("#voiceSub"), text = $("#voiceText");
  const msg = $("#voiceMsg"), send = $("#voiceSend");

  function show(m, cls = "") {
    msg.hidden = !m;
    msg.textContent = m;
    msg.className = "vmsg " + cls;
  }
  function render(interim = "") {
    text.innerHTML = esc(finalText) + (interim ? `<span class="interim"> ${esc(interim)}</span>` : "");
  }
  function state(name, label) {
    btn.dataset.state = name;
    sub.textContent = label;
  }

  if (!SR) {
    state("off", "Ej stött här");
    btn.disabled = true;
    show("Rösten stöds inte i den här webbläsaren. Prova Chrome eller Safari.");
    return;
  }

  const rec = new SR();
  rec.lang = "sv-SE";
  // Avslutar av sig själv när du slutar prata. Tryck på knappen avslutar tidigare.
  rec.continuous = false;
  rec.interimResults = true;

  let listening = false, finalText = "", lastError = "";

  function start() {
    finalText = "";
    lastError = "";
    show("");
    send.hidden = true;
    render();
    listening = true;
    state("listen", "Lyssnar · tryck för att avsluta");
    onMode("lyssnar");
    try { rec.start(); } catch { /* redan igång */ }
  }

  function stop() {
    try { rec.stop(); } catch { /* redan stoppad */ }
    // Vissa webbläsare skickar inte onend efter stop(): avsluta ändå.
    setTimeout(() => { if (listening) finish(); }, 1200);
  }

  // Körs när du slutar prata eller trycker på knappen igen.
  function finish() {
    if (!listening) return;
    listening = false;
    const t = finalText.trim();
    if (t) {
      onMode("analysera");
      state("done", "Klar · tryck för att tala igen");
      send.hidden = false;
      show("");
    } else {
      onMode("vila");
      state("idle", "Tryck och tala");
      if (!lastError) show(FEL["no-speech"], "warn");
    }
  }

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript + " ";
      else interim += r[0].transcript;
    }
    render(interim);
  };

  rec.onerror = (e) => {
    if (e.error === "aborted") return;
    lastError = e.error;
    show(FEL[e.error] || `Röstfelet: ${e.error}`, "alarm");
  };

  rec.onend = () => finish();

  btn.addEventListener("click", () => (listening ? stop() : start()));

  send.addEventListener("click", () => {
    const t = finalText.trim();
    if (!sendToClaude(t)) {
      show("Webbläsaren blockerade fönstret. Tillåt popup-fönster för sidan och försök igen.", "alarm");
      return;
    }
    finalText = "";
    render();
    send.hidden = true;
    onMode("vila");
    state("idle", "Tryck och tala");
    show("");
  });

  state("idle", "Tryck och tala");
  return { start, stop };
}
