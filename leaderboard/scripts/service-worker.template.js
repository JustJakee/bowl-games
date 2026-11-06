// Generated during the production build. Only public app files are cached.
const CACHE_NAME = "bobs-bowl-games-__CACHE_VERSION__";
const PRECACHE_URLS = __PRECACHE_URLS__;
const PRECACHE_PATHS = new Set(PRECACHE_URLS);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key.startsWith("bobs-bowl-games-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match("/index.html")) ||
          (await cache.match("/offline.html")) || Response.error();
      }),
    );
    return;
  }

  if (PRECACHE_PATHS.has(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) =>
        (await cache.match(request, { ignoreSearch: true })) || fetch(request),
      ),
    );
  }
  // Auth, API, ESPN, and other network responses are never cached here.
});
