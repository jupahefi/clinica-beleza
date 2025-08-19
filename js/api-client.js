/**
 * Cliente API para comunicación con el backend
 * Reemplaza el almacenamiento local con persistencia en SQLite
 */

import { getEnv } from './env.js';

/**
 * Configuración del cliente API
 */
const API_CONFIG = {
    baseUrl: null, // Se carga dinámicamente desde ENV
    timeout: 10000,
    retries: 3
};

/**
 * Cache local para optimización
 */
const CACHE = new Map();
const CACHE_EXPIRY = new Map();

/**
 * Inicializa el cliente API con la configuración de entorno
 */
export function initializeApiClient() {
    API_CONFIG.baseUrl = getEnv('API_URL', window.location.origin);
    console.log('🌐 Cliente API inicializado:', API_CONFIG.baseUrl);
}

/**
 * Realiza una petición HTTP con reintentos y manejo de errores
 */
async function fetchWithRetry(url, options = {}, retries = API_CONFIG.retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (retries > 0 && !error.name.includes('Abort')) {
            console.warn(`🔄 Reintentando petición (${API_CONFIG.retries - retries + 1}/${API_CONFIG.retries}):`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * (API_CONFIG.retries - retries + 1)));
            return fetchWithRetry(url, options, retries - 1);
        }
        
        throw error;
    }
}

/**
 * Realiza una petición GET
 */
async function get(endpoint, params = {}) {
    if (!API_CONFIG.baseUrl) {
        throw new Error('Cliente API no inicializado');
    }
    
    const url = new URL(`${API_CONFIG.baseUrl}/${endpoint}`);
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
            url.searchParams.append(key, params[key]);
        }
    });
    
    // Verificar cache
    const cacheKey = url.toString();
    if (CACHE.has(cacheKey) && CACHE_EXPIRY.has(cacheKey)) {
        const expiry = CACHE_EXPIRY.get(cacheKey);
        if (Date.now() < expiry) {
            return CACHE.get(cacheKey);
        } else {
            CACHE.delete(cacheKey);
            CACHE_EXPIRY.delete(cacheKey);
        }
    }
    
    const result = await fetchWithRetry(url);
    
    // Cachear resultado por 5 minutos
    CACHE.set(cacheKey, result);
    CACHE_EXPIRY.set(cacheKey, Date.now() + 5 * 60 * 1000);
    
    return result;
}

/**
 * Realiza una petición POST
 */
async function post(endpoint, data = {}) {
    if (!API_CONFIG.baseUrl) {
        throw new Error('Cliente API no inicializado');
    }
    
    const url = `${API_CONFIG.baseUrl}/${endpoint}`;
    
    const result = await fetchWithRetry(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    // Limpiar cache relacionado
    clearRelatedCache(endpoint);
    
    return result;
}

/**
 * Realiza una petición PUT
 */
async function put(endpoint, data = {}) {
    if (!API_CONFIG.baseUrl) {
        throw new Error('Cliente API no inicializado');
    }
    
    const url = `${API_CONFIG.baseUrl}/${endpoint}`;
    
    const result = await fetchWithRetry(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    
    // Limpiar cache relacionado
    clearRelatedCache(endpoint);
    
    return result;
}

/**
 * Realiza una petición DELETE
 */
async function del(endpoint) {
    if (!API_CONFIG.baseUrl) {
        throw new Error('Cliente API no inicializado');
    }
    
    const url = `${API_CONFIG.baseUrl}/${endpoint}`;
    
    const result = await fetchWithRetry(url, {
        method: 'DELETE'
    });
    
    // Limpiar cache relacionado
    clearRelatedCache(endpoint);
    
    return result;
}

/**
 * Limpia el cache relacionado con un endpoint
 */
function clearRelatedCache(endpoint) {
    const baseEndpoint = endpoint.split('/')[0];
    const keysToDelete = [];
    
    for (const key of CACHE.keys()) {
        if (key.includes(baseEndpoint)) {
            keysToDelete.push(key);
        }
    }
    
    keysToDelete.forEach(key => {
        CACHE.delete(key);
        CACHE_EXPIRY.delete(key);
    });
}

/**
 * Limpia todo el cache
 */
export function clearCache() {
    CACHE.clear();
    CACHE_EXPIRY.clear();
}

/**
 * API de Pacientes
 */
export const pacientesAPI = {
    // Obtener todos los pacientes
    async getAll() {
        const response = await get('pacientes');
        return response.data;
    },
    
    // Obtener paciente por ID
    async getById(id) {
        const response = await get(`pacientes/${id}`);
        return response.data;
    },
    
    // Crear nuevo paciente
    async create(pacienteData) {
        const response = await post('pacientes', pacienteData);
        return response.data;
    },
    
    // Actualizar paciente
    async update(id, pacienteData) {
        const response = await put(`pacientes/${id}`, pacienteData);
        return response.data;
    },
    
    // Eliminar paciente
    async delete(id) {
        const response = await del(`pacientes/${id}`);
        return response.data;
    }
};

/**
 * API de Ventas
 */
export const ventasAPI = {
    // Obtener todas las ventas
    async getAll(filters = {}) {
        const response = await get('ventas', filters);
        return response.data;
    },
    
    // Obtener venta por ID
    async getById(id) {
        const response = await get(`ventas/${id}`);
        return response.data;
    },
    
    // Crear nueva venta
    async create(ventaData) {
        const response = await post('ventas', ventaData);
        return response.data;
    },
    
    // Actualizar venta
    async update(id, ventaData) {
        const response = await put(`ventas/${id}`, ventaData);
        return response.data;
    }
};

/**
 * API de Pagos
 */
export const pagosAPI = {
    // Obtener todos los pagos
    async getAll(ventaId = null) {
        const params = ventaId ? { venta_id: ventaId } : {};
        const response = await get('pagos', params);
        return response.data;
    },
    
    // Crear nuevo pago
    async create(pagoData) {
        const response = await post('pagos', pagoData);
        return response.data;
    }
};

/**
 * API de Sesiones
 */
export const sesionesAPI = {
    // Obtener sesiones por fecha
    async getByDate(fecha) {
        const response = await get('sesiones', { fecha });
        return response.data;
    },
    
    // Obtener todas las sesiones recientes
    async getAll() {
        const response = await get('sesiones');
        return response.data;
    },
    
    // Crear nueva sesión
    async create(sesionData) {
        const response = await post('sesiones', sesionData);
        return response.data;
    },
    
    // Actualizar sesión
    async update(id, sesionData) {
        const response = await put(`sesiones/${id}`, sesionData);
        return response.data;
    }
};

/**
 * API de Ofertas
 */
export const ofertasAPI = {
    // Obtener ofertas activas
    async getActive() {
        const response = await get('ofertas');
        return response.data;
    },
    
    // Crear nueva oferta
    async create(ofertaData) {
        const response = await post('ofertas', ofertaData);
        return response.data;
    }
};

/**
 * API de Boxes
 */
export const boxesAPI = {
    // Obtener todos los boxes
    async getAll() {
        const response = await get('boxes');
        return response.data;
    }
};

/**
 * API de Estadísticas
 */
export const statsAPI = {
    // Obtener estadísticas generales
    async getGeneral() {
        const response = await get('stats');
        return response.data;
    }
};

/**
 * API de Sistema
 */
export const systemAPI = {
    // Health check
    async healthCheck() {
        const response = await get('health');
        return response.data;
    },
    
    // Crear backup
    async createBackup() {
        const response = await post('backup');
        return response.data;
    }
};

/**
 * Función de utilidad para manejar errores de API
 */
export function handleApiError(error, context = '') {
    console.error(`❌ Error de API ${context}:`, error);
    
    const userMessage = error.message.includes('Failed to fetch') 
        ? 'Error de conexión con el servidor. Verifica tu conexión a internet.'
        : error.message;
    
    // Mostrar notificación al usuario (si existe la función)
    if (window.mostrarNotificacion) {
        window.mostrarNotificacion(userMessage, 'error');
    } else {
        alert(userMessage);
    }
    
    return null;
}

/**
 * Función para verificar el estado de la conexión
 */
export async function checkConnection() {
    try {
        await systemAPI.healthCheck();
        return true;
    } catch (error) {
        return false;
    }
}

