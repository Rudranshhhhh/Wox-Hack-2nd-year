/* ============================================================
   TraceIT Service Worker
   Strategy:
   - App shell (HTML/JS/CSS/fonts) → Cache-first, network fallback
   - API calls (/api/*, /uploads/*) → Network-only (never cache)
   - Everything else → Network-first, cache fallback
   ============================================================ */

const CACHE_NAME = 'traceit-shell-v1';

// Resources that form the app shell — cached on install
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
];

// ── Install: pre-cache the shell ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS))
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ── Activate: delete outdated caches ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  // Take control of all open pages right away
  self.clients.claim();
});

// ── Fetch: routing logic ──────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never intercept non-GET or cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 2. API and uploads → always go to the network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    return; // let browser handle it normally
  }

  // 3. Navigation requests (page loads) → serve shell from cache,
  //    fall back to network so React Router handles unknown routes
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => cached || fetch(request))
    );
    return;
  }

  // 4. Static assets (JS, CSS, images, fonts) → cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          // Only cache successful same-origin responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
          return response;
        });
      })
    );
    return;
  }

  // 5. Everything else → network-first, cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
