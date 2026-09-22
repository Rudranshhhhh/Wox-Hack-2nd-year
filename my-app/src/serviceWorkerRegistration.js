// Service worker registration for TraceIT PWA.
// Registers /sw.js when the app is served over HTTPS (or localhost).

const SW_URL = `${process.env.PUBLIC_URL}/sw.js`;

function isLocalhost() {
  return Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(\.\d+){3}$/)
  );
}

export function register() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    if (isLocalhost()) {
      // On localhost: validate the SW, but don't force-claim the page.
      checkSW();
    } else {
      registerSW();
    }
  });
}

function registerSW() {
  navigator.serviceWorker
    .register(SW_URL)
    .then(registration => {
      // When a new SW is waiting, reload once to activate it.
      registration.onupdatefound = () => {
        const incoming = registration.installing;
        if (!incoming) return;
        incoming.onstatechange = () => {
          if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[TraceIT] New content available — reload to update.');
          }
        };
      };
    })
    .catch(err => console.error('[TraceIT] SW registration failed:', err));
}

function checkSW() {
  fetch(SW_URL, { headers: { 'Service-Worker': 'script' } })
    .then(res => {
      const contentType = res.headers.get('content-type');
      if (res.status === 404 || (contentType && !contentType.includes('javascript'))) {
        // SW not found — unregister any stale one.
        navigator.serviceWorker.ready.then(r => r.unregister());
      } else {
        registerSW();
      }
    })
    .catch(() => console.log('[TraceIT] No internet — running from cache.'));
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(r => r.unregister())
      .catch(err => console.error(err));
  }
}
