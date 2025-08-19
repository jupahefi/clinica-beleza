/**
 * Módulo de gestión de variables de entorno
 * Carga las configuraciones desde el endpoint env.php
 */

let ENV_CONFIG = null;
let ENV_LOADING = false;

/**
 * Carga las variables de entorno desde el servidor
 * @returns {Promise<Object>} Configuración de entorno
 */
export async function loadEnvironment() {
    if (ENV_CONFIG) {
        return ENV_CONFIG;
    }
    
    if (ENV_LOADING) {
        // Si ya está cargando, esperar hasta que termine
        while (ENV_LOADING) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return ENV_CONFIG;
    }
    
    ENV_LOADING = true;
    
    try {
        // Por ahora, usar valores por defecto ya que env.php fue eliminado
        // En el futuro, se puede implementar un endpoint para variables de entorno
        console.log('ℹ️ Usando configuración por defecto (env.php no disponible)');
        
        ENV_CONFIG = {
            GOOGLE_CALENDAR_API_KEY: '',
            GOOGLE_CLIENT_ID: '',
            APP_ENV: 'production',
            APP_URL: window.location.origin,
            API_URL: window.location.origin,
            TIMEZONE: 'America/Santiago',
            CLINIC_NAME: 'Clínica Beleza',
            CLINIC_EMAIL: '',
            CLINIC_PHONE: '',
            ENABLE_CACHE: 'true',
            CACHE_DURATION: '3600'
        };
        
        return ENV_CONFIG;
        
    } catch (error) {
        console.warn('⚠️ Error cargando variables de entorno, usando valores por defecto:', error);
        
        // Valores por defecto como fallback
        ENV_CONFIG = {
            GOOGLE_CALENDAR_API_KEY: '',
            GOOGLE_CLIENT_ID: '',
            APP_ENV: 'production',
            APP_URL: window.location.origin,
            API_URL: window.location.origin + '/api',
            TIMEZONE: 'America/Santiago',
            CLINIC_NAME: 'Clínica Beleza',
            CLINIC_EMAIL: '',
            CLINIC_PHONE: '',
            ENABLE_CACHE: 'true',
            CACHE_DURATION: '3600'
        };
        
        return ENV_CONFIG;
        
    } finally {
        ENV_LOADING = false;
    }
}

/**
 * Obtiene una variable de entorno específica
 * @param {string} key - Clave de la variable
 * @param {*} defaultValue - Valor por defecto si no existe
 * @returns {*} Valor de la variable
 */
export function getEnv(key, defaultValue = null) {
    if (!ENV_CONFIG) {
        console.warn(`⚠️ Intentando acceder a ENV.${key} antes de cargar las variables de entorno`);
        return defaultValue;
    }
    
    return ENV_CONFIG[key] ?? defaultValue;
}

/**
 * Verifica si las variables de entorno están cargadas
 * @returns {boolean}
 */
export function isEnvironmentLoaded() {
    return ENV_CONFIG !== null;
}

/**
 * Obtiene toda la configuración de entorno (solo lectura)
 * @returns {Object|null}
 */
export function getAllEnv() {
    return ENV_CONFIG ? { ...ENV_CONFIG } : null;
}

/**
 * Recarga las variables de entorno
 * @returns {Promise<Object>}
 */
export async function reloadEnvironment() {
    ENV_CONFIG = null;
    ENV_LOADING = false;
    return await loadEnvironment();
}

