const CACHE_VERSION = "rocketservice-shell-v1";

const STATIC_CACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/android-chrome-192x192.png",
  "/apple-touch-icon.png"
];

const API_PREFIXES = [
  "/auth",
  "/tickets",
  "/messages",
  "/contacts",
  "/users",
  "/settings",
  "/glpi",
  "/reports",
  "/queue",
  "/whatsapp",
  "/campaigns",
  "/scheduled-messages"
];

const isApiRequest = request => {
  const url = new URL(request.url);
  return API_PREFIXES.some(prefix => url.pathname.startsWith(prefix));
};

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_VERSION)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || isApiRequest(event.request)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/index.html")));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, responseToCache));
        return response;
      });
    })
  );
});
