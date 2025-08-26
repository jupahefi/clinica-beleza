/**
 * Herramientas de desarrollo para Clínica Beleza
 * Ejecutar en consola del navegador para funciones útiles
 */

// Utilidades de desarrollo
window.DevTools = {
  
  /**
   * Fuerza recarga completa sin cache
   */
  hardReload() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
      });
    }
    
    // Limpiar todos los caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    location.reload(true);
  },
  
  /**
   * Actualiza solo el cache del service worker
   */
  updateCache() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.update();
              });
    }
  },
  
  /**
   * Muestra información del cache actual
   */
  async showCacheInfo() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
            
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
              }
    }
  },
  
  /**
   * Ayuda con comandos disponibles
   */
  help() {
    console.log(`
🛠️ DevTools para Clínica Beleza

Comandos disponibles:
- DevTools.hardReload()     : Recarga completa sin cache
- DevTools.updateCache()    : Actualiza solo el service worker
- DevTools.showCacheInfo()  : Muestra información de cache
- DevTools.help()           : Muestra esta ayuda

Uso: Abre consola (F12) y escribe DevTools.comandoDeseado()
    `);
  }
};

// Auto-mostrar ayuda al cargar
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    DevTools.help();
}
