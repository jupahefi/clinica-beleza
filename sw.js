/**
 * Service Worker para gestión inteligente de cache
 * Clínica Beleza - Sistema de Gestión
 */

const CACHE_NAME = 'clinica-beleza-v3.1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/js/main.js',
  '/js/config.js',
  '/js/utils.js',
  '/js/storage.js',
  '/js/modules/pacientes.js',
  '/js/modules/ventas.js',
  '/js/modules/pagos.js',
  '/js/modules/sesiones.js',
  '/logo.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache abierto');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Eliminando cache antiguo', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de cache: Network First para desarrollo
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, actualizar cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, usar cache
        return caches.match(event.request);
      })
  );
});
