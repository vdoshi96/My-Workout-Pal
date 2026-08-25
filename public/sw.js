const CACHE_NAME = "my-workout-pal-public-v1";
const INSTALL_ASSETS = ["/", "/offline", "/icon-192.png", "/contours.svg"];

function isCacheablePublicNavigation(url) {
  return (
    url.pathname === "/" ||
    url.pathname === "/program" ||
    url.pathname.startsWith("/program/") ||
    url.pathname === "/library" ||
    url.pathname.startsWith("/library/") ||
    url.pathname === "/sample-progress" ||
    url.pathname === "/sample-workout" ||
    url.pathname === "/offline"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(INSTALL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (!isCacheablePublicNavigation(url)) return;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? caches.match("/offline")),
    );
    return;
  }

  if (!["style", "script", "font", "image"].includes(request.destination)) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
        }
        return response;
      });
    }),
  );
});
