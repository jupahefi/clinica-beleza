/**
 * Módulo de gestión de variables de entorno
 * Carga las variables de entorno desde el servidor o usa valores por defecto
 */

// Configuración por defecto
const DEFAULT_CONFIG = {
    API_URL: window.location.origin,
    API_TIMEOUT: 10000,
    API_RETRIES: 3,
    APP_NAME: 'Clínica Beleza',
    APP_VERSION: '2.0.0',
    APP_ENV: 'development',
    CACHE_TTL: 300,
    CACHE_ENABLED: true
};

// Variable global para almacenar la configuración
window.ENV_CONFIG = { ...DEFAULT_CONFIG };

/**
 * Carga las variables de entorno desde el servidor
 */
export async function loadEnvironment() {
    try {
        // Intentar cargar configuración desde el servidor
        const response = await fetch('/api.php/config');
        if (response.ok) {
            const config = await response.json();
            if (config.success && config.data) {
                window.ENV_CONFIG = { ...DEFAULT_CONFIG, ...config.data };
                console.log('✅ Variables de entorno cargadas desde servidor');
                return true;
            }
        }
    } catch (error) {
        console.warn('⚠️ No se pudo cargar configuración del servidor, usando valores por defecto:', error.message);
    }
    
    // Usar configuración por defecto
    window.ENV_CONFIG = { ...DEFAULT_CONFIG };
    console.log('ℹ️ Usando configuración por defecto');
    return false;
}

/**
 * Verifica si las variables de entorno están cargadas
 */
export function isEnvironmentLoaded() {
    return !!window.ENV_CONFIG;
}

/**
 * Obtiene una variable de entorno
 */
export function getEnv(key, defaultValue = '') {
    if (!isEnvironmentLoaded()) {
        console.warn('⚠️ Variables de entorno no cargadas, cargando...');
        loadEnvironment();
    }
    
    return window.ENV_CONFIG?.[key] || defaultValue;
}

/**
 * Obtiene toda la configuración
 */
export function getConfig() {
    if (!isEnvironmentLoaded()) {
        loadEnvironment();
    }
    
    return { ...window.ENV_CONFIG };
}

/**
 * Actualiza una variable de entorno
 */
export function setEnv(key, value) {
    if (!isEnvironmentLoaded()) {
        loadEnvironment();
    }
    
    window.ENV_CONFIG[key] = value;
    console.log(`🔧 Variable de entorno actualizada: ${key} = ${value}`);
}

/**
 * Reinicia la configuración a los valores por defecto
 */
export function resetConfig() {
    window.ENV_CONFIG = { ...DEFAULT_CONFIG };
    console.log('🔄 Configuración reiniciada a valores por defecto');
}

/**
 * Valida la configuración requerida
 */
export function validateConfig() {
    const required = ['API_URL'];
    const missing = [];
    
    for (const key of required) {
        if (!getEnv(key)) {
            missing.push(key);
        }
    }
    
    if (missing.length > 0) {
        console.error('❌ Variables de entorno faltantes:', missing);
        return false;
    }
    
    console.log('✅ Configuración validada correctamente');
    return true;
}

/**
 * Muestra información de la configuración actual
 */
export function showConfig() {
    const config = getConfig();
    console.log('📋 Configuración actual:', config);
    return config;
}

