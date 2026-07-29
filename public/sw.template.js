const CACHE_NAME = 'ongi-__BUILD_VERSION__';

// Cache static assets on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-bulb-lg.svg',
  '/icon-bulb-sm.svg',
  '/logo-en-lg.svg',
  '/logo-en-sm.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Precache items individually so one failure doesn't abort install
      Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, supabase API, mapbox API
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('mapbox.com')) return;

  // Next.js static chunks: Cache First (they have content hashes)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Static files in /public: Cache First
  // 주의: 오디오(m4a 등)는 의도적으로 제외 — <audio>의 Range 요청을 SW가 캐시로 응답하면
  // iOS Safari 재생이 깨진다. 오디오는 HTTP 캐시(immutable 헤더)에 맡긴다.
  if (
    url.pathname.match(/\.(svg|png|jpg|webp|ico|json|woff2?)$/) &&
    url.origin === self.location.origin
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Navigation (HTML pages): Network First with timeout, runtime-cached fallback.
  // Successful responses are cached so visited locale pages (/ko, /en, ...) work
  // offline; a 3s timeout keeps PWA launch fast on flaky networks.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000)
        );
        try {
          const response = await Promise.race([fetch(request), timeout]);
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        } catch {
          const cached =
            (await caches.match(request)) || (await caches.match('/'));
          if (!cached) return Response.error();
          if (!cached.redirected) return cached;
          // Rewrap: a redirected response can't be served to a navigation
          // (its redirect mode is not 'follow') — strip the flag
          const body = await cached.blob();
          return new Response(body, {
            status: cached.status,
            statusText: cached.statusText,
            headers: cached.headers,
          });
        }
      })()
    );
    return;
  }
});
