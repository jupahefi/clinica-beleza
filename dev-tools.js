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
    
    // Limpiar localStorage si se desea
    // localStorage.clear();
    
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
   * Exporta todos los datos del localStorage
   */
  exportData() {
    const data = {};
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        data[key] = localStorage.getItem(key);
      }
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinica-beleza-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
- DevTools.exportData()     : Exporta backup de datos
- DevTools.help()           : Muestra esta ayuda

Uso: Abre consola (F12) y escribe DevTools.comandoDeseado()
    `);
  }
};

// Auto-mostrar ayuda al cargar
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    DevTools.help();
}
