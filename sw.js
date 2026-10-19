// ORION service worker: gör appen installerbar och startbar utan nät.
// Höj VERSION vid varje ändring så att mobilen hämtar nya filer.
const VERSION = "orion-v1";
const SHELL = [
  "./",
  "index.html",
  "config.js",
  "css/orion.css",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "src/main.js",
  "src/ui.js",
  "src/log.js",
  "src/boot.js",
  "src/core.js",
  "src/panels.js",
  "src/sources/index.js",
  "src/sources/_shared.js",
  "src/sources/claude.js",
  "src/sources/schedule.js",
  "src/sources/weather.js",
  "src/sources/github.js",
  "src/sources/spotify.js",
  "src/sources/trading.js",
  "src/sources/news.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  // Datakällor (SMHI, GitHub, boten …) går alltid direkt mot nätet.
  if (url.origin !== location.origin && !fonts) return;
  // Nätet först, cachen som reserv: nya versioner syns direkt när det finns nät.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
