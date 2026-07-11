const CACHE_NAME = 'resu2026-cache-v17';

// Static assets to precache immediately
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

// 1. Install Event: Precaching core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Fetch Event: Intelligent Caching Strategies
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // We only cache GET requests from our origin
  if (event.request.method !== 'GET') return;

  // Strategy A: Image Caching -> Cache First (optimizes images and maps)
  if (
    requestUrl.pathname.includes('/images/') || 
    requestUrl.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Serve from cache and update in background in case image changed
            fetch(event.request).then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse);
              }
            }).catch(() => {/* Ignore network errors if offline */});
            
            return cachedResponse;
          }

          // Fetch from network and cache
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return fallback for images if offline and not cached
            return new Response('Offline', { status: 503, statusText: 'Offline' });
          });
        });
      })
    );
    return;
  }

  // Strategy B: JS / CSS Assets -> Stale While Revalidate
  if (requestUrl.pathname.includes('/assets/') || requestUrl.pathname.match(/\.(js|css|woff2|woff|ttf)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {/* Ignore offline errors */});

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Strategy C: HTML Page and core routes -> Network First (so updates are visible immediately)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline: Serve cached page shell
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('./index.html');
        });
      })
  );
});
