/**
 * Cliente API para Clínica Beleza
 * PASSTHROUGH A STORED PROCEDURES - Sin lógica de negocio
 * Toda la lógica está en la base de datos
 */

// Configuración de la API
const API_CONFIG = {
    baseUrl: '',
    timeout: 10000,
    retries: 3
};

// Cache local para mejorar rendimiento (solo cache, no fallback)
const API_CACHE = {
    data: new Map(),
    timestamps: new Map(),
    ttl: 5 * 60 * 1000 // 5 minutos
};

/**
 * Inicializa el cliente API
 */
export function initializeApiClient() {
    API_CONFIG.baseUrl = getEnv('API_URL', window.location.origin);
    console.log('🌐 Cliente API inicializado (passthrough):', API_CONFIG.baseUrl);
}

/**
 * Obtiene variable de entorno
 */
function getEnv(key, defaultValue = '') {
    return window.ENV_CONFIG?.[key] || defaultValue;
}

/**
 * Función principal para hacer peticiones HTTP con reintentos
 */
async function fetchWithRetry(url, options = {}, retries = API_CONFIG.retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(options.headers || {})
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (retries > 0 && (error.name === 'AbortError' || error.message.includes('HTTP 5'))) {
            console.warn(`🔄 Reintentando petición (${API_CONFIG.retries - retries + 1}/${API_CONFIG.retries}): ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        
        throw error;
    }
}

/**
 * Función genérica para peticiones GET
 */
async function get(endpoint, params = {}) {
    const url = new URL(`${API_CONFIG.baseUrl}/api.php/${endpoint}`);
    
    // Agregar parámetros de consulta
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
            url.searchParams.append(key, params[key]);
        }
    });
    
    const response = await fetchWithRetry(url.toString());
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.error || 'Error en la petición');
    }
    
    return data.data;
}

/**
 * Función genérica para peticiones POST
 */
async function post(endpoint, data = {}) {
    const url = `${API_CONFIG.baseUrl}/api.php/${endpoint}`;
    
    const response = await fetchWithRetry(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Error en la petición');
    }
    
    return result.data;
}

/**
 * Función genérica para peticiones PUT
 */
async function put(endpoint, data = {}) {
    const url = `${API_CONFIG.baseUrl}/api.php/${endpoint}`;
    
    const response = await fetchWithRetry(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Error en la petición');
    }
    
    return result.data;
}

/**
 * Función genérica para peticiones DELETE
 */
async function del(endpoint) {
    const url = `${API_CONFIG.baseUrl}/api.php/${endpoint}`;
    
    const response = await fetchWithRetry(url, {
        method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Error en la petición');
    }
    
    return result.data;
}

/**
 * Verifica la conexión a la API
 */
export async function checkConnection() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/api.php/health`);
        const data = await response.json();
        return {
            connected: data.success,
            error: data.success ? null : (data.data?.error || 'Error desconocido')
        };
    } catch (error) {
        console.error('❌ Error verificando conexión:', error);
        return {
            connected: false,
            error: error.message || 'Error de conexión'
        };
    }
}

// =============================================================================
// API CLIENTES - SOLO PASSTHROUGH
// =============================================================================

// ---------- FICHAS ----------

export const fichasAPI = {
    // Buscar fichas
    search: (busqueda = '') => get('fichas', { busqueda }),
    
    // Obtener ficha por ID
    getById: (id) => get(`fichas/${id}`),
    
    // Crear ficha
    create: (ficha) => post('fichas', ficha),
    
    // Actualizar ficha
    update: (id, ficha) => put(`fichas/${id}`, ficha),
    
    // Eliminar ficha (soft delete)
    delete: (id) => del(`fichas/${id}`)
};

export const fichasEspecificasAPI = {
    // Obtener fichas específicas de una ficha
    getByFichaId: (fichaId) => get('fichas-especificas', { ficha_id: fichaId }),
    
    // Obtener ficha específica por ID
    getById: (id) => get(`fichas-especificas/${id}`),
    
    // Agregar ficha específica
    create: (fichaEspecifica) => post('fichas-especificas', fichaEspecifica)
};

export const tiposFichaEspecificaAPI = {
    // Obtener todos los tipos
    getAll: () => get('tipos-ficha-especifica'),
    
    // Obtener tipo por ID
    getById: (id) => get(`tipos-ficha-especifica/${id}`),
    
    // Crear tipo
    create: (tipo) => post('tipos-ficha-especifica', tipo)
};

// ---------- EVALUACIONES ----------

export const evaluacionesAPI = {
    // Obtener evaluaciones de una ficha
    getByFichaId: (fichaId) => get('evaluaciones', { ficha_id: fichaId }),
    
    // Obtener evaluación por ID
    getById: (id) => get(`evaluaciones/${id}`),
    
    // Crear evaluación
    create: (evaluacion) => post('evaluaciones', evaluacion)
};

// ---------- VENTAS ----------

export const ventasAPI = {
    // Obtener ventas de una ficha
    getByFichaId: (fichaId) => get('ventas', { ficha_id: fichaId }),
    
    // Obtener venta por ID
    getById: (id) => get(`ventas/${id}`),
    
    // Obtener todas las ventas
    getAll: () => get('ventas'),
    
    // Crear venta
    create: (venta) => post('ventas', venta),
    
    // Aplicar descuento manual
    aplicarDescuento: (id, descuentoPct) => put(`ventas/${id}`, { descuento_manual_pct: descuentoPct })
};

export const pagosAPI = {
    // Obtener pagos de una venta
    getByVentaId: (ventaId) => get('pagos', { venta_id: ventaId }),
    
    // Obtener pago por ID
    getById: (id) => get(`pagos/${id}`),
    
    // Obtener todos los pagos
    getAll: () => get('pagos'),
    
    // Registrar pago
    create: (pago) => post('pagos', pago)
};

// ---------- AGENDA ----------

export const sesionesAPI = {
    // Obtener sesiones de una venta
    getByVentaId: (ventaId) => get('sesiones', { venta_id: ventaId }),
    
    // Obtener sesión por ID
    getById: (id) => get(`sesiones/${id}`),
    
    // Obtener todas las sesiones
    getAll: () => get('sesiones'),
    
    // Agendar sesión
    create: (sesion) => post('sesiones', sesion),
    
    // Confirmar paciente
    confirmarPaciente: (id) => put(`sesiones/${id}`, { accion: 'confirmar' }),
    
    // Abrir sesión
    abrirSesion: (id) => put(`sesiones/${id}`, { accion: 'abrir' }),
    
    // Cerrar sesión
    cerrarSesion: (id, observaciones) => put(`sesiones/${id}`, { accion: 'cerrar', observaciones }),
    
    // Reprogramar sesión
    reprogramar: (id, nuevaFecha) => put(`sesiones/${id}`, { accion: 'reprogramar', nueva_fecha: nuevaFecha })
};

export const agendaAPI = {
    // Obtener disponibilidad
    getDisponibilidad: (params = {}) => get('agenda', params),
    
    // Generar plan de sesiones
    generarPlan: (planData) => post('agenda', { accion: 'generar_plan', ...planData })
};

// ---------- OFERTAS ----------

export const ofertasAPI = {
    // Obtener ofertas aplicables
    getAplicables: () => get('ofertas'),
    
    // Obtener oferta por ID
    getById: (id) => get(`ofertas/${id}`),
    
    // Crear oferta pack temporal
    createPackTemporal: (oferta) => post('ofertas', { ...oferta, tipo: 'pack_temporal' }),
    
    // Crear oferta combo
    createCombo: (oferta) => post('ofertas', { ...oferta, tipo: 'combo_packs' })
};

export const ofertasComboAPI = {
    // Obtener ofertas combo
    getAll: () => get('ofertas-combo'),
    
    // Agregar pack a oferta combo
    agregarPack: (ofertaComboId, packId) => post('ofertas-combo', { oferta_combo_id: ofertaComboId, pack_id: packId })
};

// ---------- CATÁLOGOS ----------

export const tratamientosAPI = {
    // Obtener todos los tratamientos
    getAll: () => get('tratamientos'),
    
    // Obtener tratamiento por ID
    getById: (id) => get(`tratamientos/${id}`),
    
    // Crear tratamiento
    create: (tratamiento) => post('tratamientos', tratamiento)
};

export const packsAPI = {
    // Obtener packs de un tratamiento
    getByTratamientoId: (tratamientoId) => get('packs', { tratamiento_id: tratamientoId }),
    
    // Obtener pack por ID
    getById: (id) => get(`packs/${id}`),
    
    // Obtener todos los packs
    getAll: () => get('packs'),
    
    // Crear pack
    create: (pack) => post('packs', pack)
};

export const sucursalesAPI = {
    // Obtener todas las sucursales
    getAll: () => get('sucursales'),
    
    // Obtener sucursal por ID
    getById: (id) => get(`sucursales/${id}`),
    
    // Crear sucursal
    create: (sucursal) => post('sucursales', sucursal)
};

export const boxesAPI = {
    // Obtener boxes de una sucursal
    getBySucursalId: (sucursalId) => get('boxes', { sucursal_id: sucursalId }),
    
    // Obtener box por ID
    getById: (id) => get(`boxes/${id}`),
    
    // Obtener todos los boxes
    getAll: () => get('boxes'),
    
    // Crear box
    create: (box) => post('boxes', box)
};

export const profesionalesAPI = {
    // Obtener todos los profesionales
    getAll: () => get('profesionales'),
    
    // Obtener profesional por ID
    getById: (id) => get(`profesionales/${id}`),
    
    // Crear profesional
    create: (profesional) => post('profesionales', profesional)
};

// ---------- REPORTES ----------

export const reportesAPI = {
    // Reporte de progreso de ventas
    progresoVentas: (fechaInicio, fechaFin) => get('reportes', { 
        tipo: 'progreso_ventas', 
        fecha_inicio: fechaInicio, 
        fecha_fin: fechaFin 
    }),
    
    // Reporte plan vs ejecución
    planVsEjecucion: (fechaInicio, fechaFin) => get('reportes', { 
        tipo: 'plan_vs_ejecucion', 
        fecha_inicio: fechaInicio, 
        fecha_fin: fechaFin 
    }),
    
    // Reporte de ofertas aplicadas
    ofertasAplicadas: (fechaInicio, fechaFin) => get('reportes', { 
        tipo: 'ofertas_aplicadas', 
        fecha_inicio: fechaInicio, 
        fecha_fin: fechaFin 
    }),
    
    // Reporte de disponibilidad
    disponibilidad: () => get('reportes', { tipo: 'disponibilidad' })
};

// ---------- UTILITARIOS ----------

/**
 * Mostrar notificación (compatibilidad)
 */
export function mostrarNotificacion(mensaje, tipo = 'info') {
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
    // Aquí se puede integrar con el sistema de notificaciones del frontend
}

/**
 * Health check de la API
 */
export async function healthCheck() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/api.php/health`);
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('❌ Error en health check:', error);
        return false;
    }
}

/**
 * Obtener configuración de la API
 */
export async function getConfig() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/api.php/config`);
        const data = await response.json();
        return data.config;
    } catch (error) {
        console.error('❌ Error obteniendo configuración:', error);
        return null;
    }
}

