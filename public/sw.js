// Generated from src/domain/pwa/cache-policy.ts. Run pnpm pwa:build after policy changes.
const CACHE_NAME = "my-workout-pal-public-v5";
const CACHE_PREFIX = "my-workout-pal-public-";
const INSTALL_ASSETS = ["/","/offline","/progress","/apple-touch-icon.png","/contours.svg","/icon-192.png","/icon-512.png","/icon.svg","/illustrations/companions/planning-hedgehog-512.webp","/illustrations/companions/planning-hedgehog.webp","/illustrations/companions/reviewing-raccoon-512.webp","/illustrations/companions/reviewing-raccoon.webp"];
const PUBLIC_ASSETS = new Set(["/apple-touch-icon.png","/contours.svg","/icon-192.png","/icon-512.png","/icon.svg","/illustrations/companions/planning-hedgehog-512.webp","/illustrations/companions/planning-hedgehog.webp","/illustrations/companions/reviewing-raccoon-512.webp","/illustrations/companions/reviewing-raccoon.webp"]);
const PUBLIC_NAVIGATION_EXACT = new Set(["/","/library","/offline","/program","/progress","/sample-workout"]);
const PUBLIC_NAVIGATION_PREFIXES = ["/library/","/program/"];
const STATIC_DESTINATIONS = new Set(["font","image","script","style"]);

function isCacheablePublicNavigation(url) {
  return (
    PUBLIC_NAVIGATION_EXACT.has(url.pathname) ||
    PUBLIC_NAVIGATION_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

function isCacheableStaticRequest(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  if (!STATIC_DESTINATIONS.has(request.destination)) return false;
  if (url.pathname.startsWith("/_next/static/")) {
    return ["font", "script", "style"].includes(request.destination);
  }
  return request.destination === "image" && PUBLIC_ASSETS.has(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(INSTALL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
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

  if (!isCacheableStaticRequest(request, url)) return;
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
