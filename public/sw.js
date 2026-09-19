/* AETHERA UMKM — Service Worker v4 */

const CACHE_VERSION = "aethera-v4";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  // Skip waiting immediately so the new SW takes over ASAP
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Non-fatal: precache failures shouldn't block install
      })
    )
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Delete ALL old caches (any key that doesn't start with current version)
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      // Take control of all open clients immediately
      await self.clients.claim();
    })()
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests from our own origin
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Skip Next.js internal routes and API routes
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("__nextjs")
  ) {
    return;
  }

  // WASM & SQL worker: cache-first (large files, never change between deploys)
  if (/\/sql-wasm\//.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              caches.open(STATIC_CACHE).then((c) => c.put(req, res.clone()));
            }
            return res;
          })
      )
    );
    return;
  }

  // Static icons & manifest: stale-while-revalidate
  if (/\/(icons|screenshots)\//.test(url.pathname) || url.pathname === "/manifest.json") {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        });
        return cached || networkPromise;
      })
    );
    return;
  }

  // Navigation requests (HTML pages): NETWORK-FIRST, no cache fallback for pages
  // This prevents stale cached pages from serving when a new deploy is out.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => {
        // Only serve offline page from cache if network completely fails
        return caches.match("/") || Response.error();
      })
    );
    return;
  }

  // Everything else: network-only (let Next.js handle its own JS chunks)
});

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow("/dashboard");
    })
  );
});
