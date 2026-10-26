// Service worker for the mobile app (app.html): lets it open and work without signal,
// e.g. on an allotment with weak reception. Registered with scope "./app", so the
// desktop pages are not affected.

const CACHE = "garden-app-v1"; // change the number to throw away old caches
const SHELL = [
  "app.html", "style.css", "mobile.css", "manifest.webmanifest",
  "data.js", "gardens-data.js", "community-demo.js", "app.js", "community.js", "mobile.js",
  "font/urbanist-latin.woff2", "vendor/fontawesome/icons.svg",
  "images/app-icon-192.png", "images/PvZ_1_Peashooter.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith("garden-app-") && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Weather: the live forecast when online, the last one we saw when offline.
  if (url.hostname === "api.open-meteo.com") {
    event.respondWith(fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request)));
    return;
  }

  // Map tiles and other sites go straight to the network.
  if (url.origin !== self.location.origin) return;

  // Our own files: answer from the cache straight away, and fetch a fresh copy in the
  // background for next time ("stale while revalidate").
  const refresh = caches.open(CACHE).then((cache) => fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }));
  event.waitUntil(refresh.catch(() => {}));
  event.respondWith(caches.match(request).then((cached) => cached || refresh));
});
