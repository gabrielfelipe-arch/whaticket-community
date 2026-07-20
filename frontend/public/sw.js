const CACHE_VERSION = "rocketservice-shell-v2";

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
  "/push-subscriptions",
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
  const accept = request.headers.get("accept") || "";
  return accept.includes("application/json") || API_PREFIXES.some(prefix => url.pathname.startsWith(prefix));
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

self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { body: event.data ? event.data.text() : "Nova mensagem recebida" };
  }

  const title = data.title || "Nova mensagem";
  const options = {
    body: data.body || "Voce recebeu uma nova mensagem.",
    icon: data.icon || "/android-chrome-192x192.png",
    badge: data.badge || "/android-chrome-192x192.png",
    tag: data.tag || "rocketservice-message",
    renotify: true,
    data: {
      url: data.url || "/tickets",
      ticketId: data.ticketId || null
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "/tickets", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      const sameOriginClient = clients.find(client => client.url.startsWith(self.location.origin));

      if (sameOriginClient) {
        sameOriginClient.focus();
        sameOriginClient.navigate(targetUrl);
        return;
      }

      return self.clients.openWindow(targetUrl);
    })
  );
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
