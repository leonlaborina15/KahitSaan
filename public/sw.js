// Offline cache for the app shell + catalog (SPEC §2, AGENTS.md rule 4).
// scripts/sw-precache.mjs fills VERSION and PRECACHE after `next build`.
// Model weights are NOT cached here: WebLLM and transformers.js keep their own caches.
const VERSION = "__VERSION__";
const PRECACHE = self.__PRECACHE__ || [];
const CACHE = `kahitsaan-${VERSION}`;
const NAV_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  // Only delete our own old caches; never the model caches.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kahitsaan-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Pages: try the network briefly (fresh deploys), else the cached page, else Home. */
async function page(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS)),
    ]);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(new URL(request.url).pathname.replace(/\/$/, "") || "/", { ignoreSearch: true })) ||
      (await cache.match("/")) ||
      Response.error()
    );
  }
}

/** Everything else from our origin: cache first, then network (and keep a copy). */
async function asset(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: request.url.includes("_rsc=") });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === "navigate" ? page(request) : asset(request));
});
