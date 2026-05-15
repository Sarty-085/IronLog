// IronLog Service Worker — Workbox-free baseline cache strategy
// Caches the app shell and API data for basic offline support.

const CACHE_NAME = "ironlog-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install: cache static shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

// ── Fetch: stale-while-revalidate for pages, network-first for API ───────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET") return;
  if (url.origin !== location.origin && !url.pathname.startsWith("/api"))
    return;

  // API calls: network-first, no cache on failure (show error instead)
  if (
    url.pathname.startsWith("/api") ||
    url.hostname.includes("neon") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/workouts") ||
    url.pathname.startsWith("/analytics") ||
    url.pathname.startsWith("/sets")
  ) {
    return; // let these fall through to the network naturally
  }

  // App shell: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request).then((res) => {
        if (res.ok) cache.put(request, res.clone());
        return res;
      });
      return cached ?? networkFetch;
    }),
  );
});
