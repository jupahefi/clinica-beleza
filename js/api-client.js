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
    // Usar la URL actual como base si no hay configuración específica
    API_CONFIG.baseUrl = window.location.origin;
}

/**
 * Obtiene variable de entorno
 */
function getEnv(key, defaultValue = '') {
    return window.ENV_CONFIG?.[key] || defaultValue;
}

/**
 * Función helper para manejar errores de la API
 */
function handleApiError(result) {
    if (!result.success) {
        // Log detallado del error para debugging
        console.error('🚨 Error del API:', {
            error: result.error,
            code: result.error_code,
            timestamp: result.timestamp,
            endpoint: result.endpoint,
            method: result.method,
            fullResponse: result
        });
        
        // Manejar redirección por sesión inválida
        if (result.redirect && result.error && result.error.includes('Sesión no válida')) {
            console.warn('🔄 Redirigiendo al login por sesión inválida');
            window.location.href = result.redirect;
            return;
        }
        
        // Crear un error más descriptivo con toda la información del servidor
        const error = new Error(result.error || 'Error en la petición');
        error.apiError = {
            message: result.error,
            code: result.error_code,
            timestamp: result.timestamp,
            endpoint: result.endpoint,
            method: result.method
        };
        throw error;
    }
    return result.data;
}

/**
 * Función principal para hacer peticiones HTTP con reintentos
 */
async function fetchWithRetry(url, options = {}, retries = API_CONFIG.retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    // Preparar headers base
    const baseHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...baseHeaders,
                ...(options.headers || {})
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            // Log del error HTTP para debugging
            console.error('🚨 Error HTTP:', {
                status: response.status,
                statusText: response.statusText,
                url: url,
                method: options.method || 'GET'
            });
            
            // Intentar obtener el cuerpo de la respuesta para más detalles
            const errorBody = await response.text();
            console.error('🚨 Cuerpo del error:', errorBody);
            
            // Intentar parsear el JSON para obtener el error específico de la DB
            try {
                const errorData = JSON.parse(errorBody);
                
                // Manejar redirección por sesión inválida
                if (errorData.redirect && errorData.error && errorData.error.includes('Sesión no válida')) {
                    console.warn('🔄 Redirigiendo al login por sesión inválida');
                    window.location.href = errorData.redirect;
                    return;
                }
                
                // Mostrar el JSON completo del error
                throw new Error(errorBody);
            } catch (parseError) {
                // Si no es JSON válido, usar el texto como está
                throw new Error(errorBody);
            }
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
export async function get(endpoint, params = {}) {
    let url;
    
    if (API_CONFIG.baseUrl) {
        url = new URL(`${API_CONFIG.baseUrl}/api.php/${endpoint}`);
    } else {
        // Si no hay baseUrl, usar URL relativa
        url = new URL(`/api.php/${endpoint}`, window.location.origin);
    }
    
    // Agregar parámetros de consulta
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
            url.searchParams.append(key, params[key]);
        }
    });
    
    const response = await fetchWithRetry(url.toString());
    const data = await response.json();
    return handleApiError(data);
}

/**
 * Función genérica para peticiones POST
 */
export async function post(endpoint, data = {}) {
    const url = API_CONFIG.baseUrl ? 
        `${API_CONFIG.baseUrl}/api.php/${endpoint}` : 
        `/api.php/${endpoint}`;
    
    const response = await fetchWithRetry(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    return handleApiError(result);
}

/**
 * Función genérica para peticiones PUT
 */
export async function put(endpoint, data = {}) {
    const url = API_CONFIG.baseUrl ? 
        `${API_CONFIG.baseUrl}/api.php/${endpoint}` : 
        `/api.php/${endpoint}`;
    
    const response = await fetchWithRetry(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    return handleApiError(result);
}

/**
 * Función genérica para peticiones DELETE
 */
export async function del(endpoint) {
    const url = API_CONFIG.baseUrl ? 
        `${API_CONFIG.baseUrl}/api.php/${endpoint}` : 
        `/api.php/${endpoint}`;
    
    const response = await fetchWithRetry(url, {
        method: 'DELETE'
    });
    
    const result = await response.json();
    return handleApiError(result);
}

/**
 * Verifica la conexión a la API
 */
export async function checkConnection() {
    try {
        const url = API_CONFIG.baseUrl ? 
            `${API_CONFIG.baseUrl}/api.php/health` : 
            `/api.php/health`;
            
        const response = await fetch(url);
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
    
    // Obtener todas las fichas
    getAll: () => get('fichas'),
    
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
    // Obtener fichas específicas de una evaluación
    getByEvaluacionId: (evaluacionId) => get('fichas-especificas', { evaluacion_id: evaluacionId }),
    
    // Obtener ficha específica por ID
    getById: (id) => get(`fichas-especificas/${id}`),
    
    // Agregar ficha específica desde evaluación
    create: (fichaEspecifica) => post('fichas-especificas', fichaEspecifica),
    
    // Guardar ficha específica (alias para create)
    saveFichaEspecifica: (fichaEspecifica) => post('fichas-especificas', fichaEspecifica),
    
    // Guardar consentimiento y firma
    saveConsentimientoFirma: (firmaData) => post('consentimiento-firma', firmaData),
    
    // Obtener consentimiento por ficha y tipo
    getConsentimientoFirma: (fichaId, tipoConsentimiento) => get('consentimiento-firma', { ficha_id: fichaId, tipo_consentimiento: tipoConsentimiento })
};

export const consentimientoFirmaAPI = {
    // Obtener consentimiento por ficha y tipo
    getByFichaAndTipo: (fichaId, tipoConsentimiento) => get('consentimiento-firma', { ficha_id: fichaId, tipo_consentimiento: tipoConsentimiento }),
    
    // Obtener consentimiento por ID
    getById: (id) => get(`consentimiento-firma/${id}`),
    
    // Guardar firma digital
    saveFirma: (firmaData) => post('consentimiento-firma', firmaData),
    
    // Guardar consentimiento y firma (alias para saveFirma)
    saveConsentimientoFirma: (firmaData) => post('consentimiento-firma', firmaData)
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
    
    // Buscar ventas
    search: (busqueda = '') => get('ventas', { busqueda }),
    
    // Crear venta
    create: (venta) => post('ventas', venta),
    
    // Actualizar venta
    update: (id, venta) => put(`ventas/${id}`, venta),
    
    // Eliminar venta
    delete: (id) => del(`ventas/${id}`),
    
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
    
    // Eliminar sesión
    delete: (id) => del(`sesiones/${id}`),
    
    // Confirmar paciente
    confirmarPaciente: (id) => put(`sesiones/${id}`, { accion: 'confirmar' }),
    
    // Abrir sesión
    abrirSesion: (id) => put(`sesiones/${id}`, { accion: 'abrir' }),
    
    // Cerrar sesión
    cerrarSesion: (id, observaciones) => put(`sesiones/${id}`, { accion: 'cerrar', observaciones }),
    
    // Actualizar datos de sesión
    updateDatosSesion: (id, datosSesion) => put(`sesiones/${id}`, {
        accion: 'actualizar_datos',
        datos_sesion: datosSesion
    }),
    
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
    getAplicables: () => get('ofertas-aplicables'),
    
    // Obtener todas las ofertas
    getAll: () => get('ofertas'),
    
    // Obtener oferta por ID
    getById: (id) => get(`ofertas/${id}`),
    
    // Crear oferta
    create: (oferta) => post('ofertas', oferta),
    
    // Actualizar oferta
    update: (id, oferta) => put(`ofertas/${id}`, oferta),
    
    // Eliminar oferta
    delete: (id) => del(`ofertas/${id}`)
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
    getAll: (genero = null) => {
        const params = {};
        if (genero) {
            params.genero = genero;
        }
        return get('tratamientos', params);
    },
    
    // Obtener tratamiento por ID
    getById: (id) => get(`tratamientos/${id}`),
    
    // Crear tratamiento
    create: (tratamiento) => post('tratamientos', tratamiento),
    
    // Actualizar tratamiento
    update: (id, tratamiento) => put(`tratamientos/${id}`, tratamiento),
    
    // Eliminar tratamiento
    delete: (id) => del(`tratamientos/${id}`)
};

export const zonasAPI = {
    // Obtener todas las zonas del cuerpo
    getAll: () => get('zonas'),
    
    // Obtener zona por código
    getByCodigo: (codigo) => get(`zonas/${codigo}`),
    
    // Crear zona
    create: (zona) => post('zonas', zona)
};

export const packsAPI = {
    // Obtener packs de un tratamiento
    getByTratamientoId: (tratamientoId, genero = null) => {
        const params = { tratamiento_id: tratamientoId };
        if (genero) {
            params.genero = genero;
        }
        return get('packs', params);
    },
    
    // Obtener pack por ID
    getById: (id) => get(`packs/${id}`),
    
    // Obtener todos los packs
    getAll: () => get('packs'),
    
    // Crear pack
    create: (pack) => post('packs', pack),
    
    // Actualizar pack
    update: (id, pack) => put(`packs/${id}`, pack),
    
    // Eliminar pack
    delete: (id) => del(`packs/${id}`)
};

export const sucursalesAPI = {
    // Obtener todas las sucursales
    getAll: () => get('sucursales'),
    
    // Obtener sucursal por ID
    getById: (id) => get(`sucursales/${id}`),
    
    // Crear sucursal
    create: (sucursal) => post('sucursales', sucursal),
    
    // Actualizar sucursal
    update: (id, sucursal) => put(`sucursales/${id}`, sucursal),
    
    // Eliminar sucursal
    delete: (id) => del(`sucursales/${id}`)
};

export const boxesAPI = {
    // Obtener boxes de una sucursal
    getBySucursalId: (sucursalId) => get('boxes', { sucursal_id: sucursalId }),
    
    // Obtener box por ID
    getById: (id) => get(`boxes/${id}`),
    
    // Obtener todos los boxes
    getAll: () => get('boxes'),
    
    // Crear box
    create: (box) => post('boxes', box),
    
    // Actualizar box
    update: (id, box) => put(`boxes/${id}`, box),
    
    // Eliminar box
    delete: (id) => del(`boxes/${id}`)
};

export const profesionalesAPI = {
    // Obtener todos los profesionales
    getAll: () => get('profesionales'),
    
    // Obtener profesional por ID
    getById: (id) => get(`profesionales/${id}`),
    
    // Crear profesional
    create: (profesional) => post('profesionales', profesional),
    
    // Actualizar profesional
    update: (id, profesional) => put(`profesionales/${id}`, profesional),
    
    // Eliminar profesional
    delete: (id) => del(`profesionales/${id}`)
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
    // Importar desde utils.js para usar la implementación real
    import('./utils.js').then(utils => {
        utils.mostrarNotificacion(mensaje, tipo);
    });
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

export const logsActividadAPI = {
    getLogs: (filtros = {}) => get('logs-actividad', filtros)
};