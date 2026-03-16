const CACHE_NAME = 'taourirt-tournoi-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './logo.png',
  './manifest.json'
];

const FONT_AWESOME_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/';
const GOOGLE_FONTS_CDN = 'https://fonts.googleapis.com/';
const GOOGLE_FONTS_STATIC = 'https://fonts.gstatic.com/';

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Firebase API calls -> Network only with timeout
  if (url.hostname.includes('firebasedatabase.app')) {
    event.respondWith(
      Promise.race([
        fetch(event.request),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]).catch(() => {
        return new Response(JSON.stringify(null), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // CDN resources -> Cache first, then network
  if (url.href.startsWith(FONT_AWESOME_CDN) ||
      url.href.startsWith(GOOGLE_FONTS_CDN) ||
      url.href.startsWith(GOOGLE_FONTS_STATIC)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Local assets -> Stale-while-revalidate (fast + fresh)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);

      // Return cached immediately, update in background
      if (cached) {
        fetchPromise; // fire and forget update
        return cached;
      }

      // No cache - wait for network
      return fetchPromise.then(response => {
        if (response) return response;
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || '⚽ Taourirt-Ouablaa', {
        body: data.body || 'Mise à jour du tournoi !',
        icon: './logo.png',
        badge: './logo.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || './' }
      })
    );
  } catch (e) {}
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
