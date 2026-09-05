export const PWA_CACHE_NAME = "my-workout-pal-public-v7";

export const PWA_INSTALL_ASSETS = Object.freeze([
  "/",
  "/offline",
  "/progress",
  "/illustrations/quiet-set/dawn-studio.webp",
  "/illustrations/quiet-set/dawn-studio-phone.webp",
  "/illustrations/quiet-set/evening-studio.webp",
  "/illustrations/quiet-set/pip-ready.webp",
  "/illustrations/quiet-set/pip-resting.webp",
  "/illustrations/quiet-set/pip-complete.webp",
  "/illustrations/quiet-set/mica-ready.webp",
  "/illustrations/quiet-set/mica-resting.webp",
  "/illustrations/quiet-set/mica-complete.webp",
  "/illustrations/quiet-set/evening-studio-phone.webp",
  "/apple-touch-icon.png",
  "/contours.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
  "/illustrations/companions/planning-hedgehog-512.webp",
  "/illustrations/companions/planning-hedgehog.webp",
  "/illustrations/companions/cataloging-otter-512.webp",
  "/illustrations/companions/cataloging-otter.webp",
  "/illustrations/companions/reviewing-raccoon-512.webp",
  "/illustrations/companions/reviewing-raccoon.webp",
] as const);

export const PWA_PUBLIC_ASSETS = Object.freeze([
  "/illustrations/quiet-set/dawn-studio.webp",
  "/illustrations/quiet-set/dawn-studio-phone.webp",
  "/illustrations/quiet-set/evening-studio.webp",
  "/illustrations/quiet-set/pip-ready.webp",
  "/illustrations/quiet-set/pip-resting.webp",
  "/illustrations/quiet-set/pip-complete.webp",
  "/illustrations/quiet-set/mica-ready.webp",
  "/illustrations/quiet-set/mica-resting.webp",
  "/illustrations/quiet-set/mica-complete.webp",
  "/illustrations/quiet-set/evening-studio-phone.webp",
  "/apple-touch-icon.png",
  "/contours.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
  "/illustrations/companions/planning-hedgehog-512.webp",
  "/illustrations/companions/planning-hedgehog.webp",
  "/illustrations/companions/cataloging-otter-512.webp",
  "/illustrations/companions/cataloging-otter.webp",
  "/illustrations/companions/reviewing-raccoon-512.webp",
  "/illustrations/companions/reviewing-raccoon.webp",
] as const);

const publicNavigationExact = new Set([
  "/",
  "/library",
  "/offline",
  "/program",
  "/progress",
  "/sample-workout",
  "/try",
]);
const publicNavigationPrefixes = ["/library/", "/program/"] as const;
const staticDestinations = new Set(["font", "image", "script", "style"]);

export function isCacheablePublicNavigationPath(pathname: string): boolean {
  return (
    publicNavigationExact.has(pathname) ||
    publicNavigationPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}

export function isCacheableStaticRequest({
  appOrigin,
  destination,
  method,
  url,
}: Readonly<{
  appOrigin: string;
  destination: string;
  method: string;
  url: string;
}>): boolean {
  if (method !== "GET" || !staticDestinations.has(destination)) return false;

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return false;
  }
  if (target.origin !== appOrigin) return false;
  if (target.pathname.startsWith("/_next/static/")) {
    return destination === "font" || destination === "script" || destination === "style";
  }
  return destination === "image" && PWA_PUBLIC_ASSETS.includes(
    target.pathname as (typeof PWA_PUBLIC_ASSETS)[number],
  );
}

export function renderServiceWorker(): string {
  return `// Generated from src/domain/pwa/cache-policy.ts. Run pnpm pwa:build after policy changes.
const CACHE_NAME = ${JSON.stringify(PWA_CACHE_NAME)};
const CACHE_PREFIX = "my-workout-pal-public-";
const INSTALL_ASSETS = ${JSON.stringify(PWA_INSTALL_ASSETS)};
const PUBLIC_ASSETS = new Set(${JSON.stringify(PWA_PUBLIC_ASSETS)});
const PUBLIC_NAVIGATION_EXACT = new Set(${JSON.stringify([...publicNavigationExact])});
const PUBLIC_NAVIGATION_PREFIXES = ${JSON.stringify(publicNavigationPrefixes)};
const STATIC_DESTINATIONS = new Set(${JSON.stringify([...staticDestinations])});

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
`;
}
