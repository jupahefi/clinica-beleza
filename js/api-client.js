/**
 * Cliente API para Clínica Beleza
 * Server-based architecture - Sin modo offline
 * Cobertura completa de User Stories y Business Rules
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
    console.log('🌐 Cliente API inicializado (server-based):', API_CONFIG.baseUrl);
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
 * Función para cache con TTL
 */
function getCached(key) {
    const timestamp = API_CACHE.timestamps.get(key);
    if (timestamp && Date.now() - timestamp < API_CACHE.ttl) {
        return API_CACHE.data.get(key);
    }
    return null;
}

function setCached(key, data) {
    API_CACHE.data.set(key, data);
    API_CACHE.timestamps.set(key, Date.now());
}

function clearCache(pattern = null) {
    if (pattern) {
        for (const key of API_CACHE.data.keys()) {
            if (key.includes(pattern)) {
                API_CACHE.data.delete(key);
                API_CACHE.timestamps.delete(key);
            }
        }
    } else {
        API_CACHE.data.clear();
        API_CACHE.timestamps.clear();
    }
}

// ============================================================================
// API DE FICHAS (PACIENTES)
// ============================================================================

export const fichasAPI = {
    /**
     * Obtiene todas las fichas con paginación
     */
    async getAll(params = {}) {
        const cacheKey = `fichas_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('fichas', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene una ficha específica
     */
    async getById(id) {
        const cacheKey = `ficha_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`fichas/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Crea una nueva ficha
     */
    async create(fichaData) {
        const data = await post('fichas', fichaData);
        clearCache('fichas');
        return data;
    },
    
    /**
     * Actualiza una ficha
     */
    async update(id, fichaData) {
        const data = await put(`fichas/${id}`, fichaData);
        clearCache(`ficha_${id}`);
        clearCache('fichas');
        return data;
    },
    
    /**
     * Elimina una ficha (soft delete)
     */
    async delete(id) {
        const data = await del(`fichas/${id}`);
        clearCache(`ficha_${id}`);
        clearCache('fichas');
        return data;
    },
    
    /**
     * Busca fichas por término
     */
    async search(term) {
        return await this.getAll({ search: term });
    }
};

// ============================================================================
// API DE TIPOS DE FICHA ESPECÍFICA
// ============================================================================

export const tiposFichaEspecificaAPI = {
    /**
     * Obtiene todos los tipos de ficha específica
     */
    async getAll() {
        const cacheKey = 'tipos_ficha_especifica';
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('tipos-ficha-especifica');
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene un tipo específico
     */
    async getById(id) {
        const cacheKey = `tipo_ficha_especifica_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`tipos-ficha-especifica/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Crea un nuevo tipo
     */
    async create(tipoData) {
        const data = await post('tipos-ficha-especifica', tipoData);
        clearCache('tipos_ficha_especifica');
        return data;
    },
    
    /**
     * Actualiza un tipo
     */
    async update(id, tipoData) {
        const data = await put(`tipos-ficha-especifica/${id}`, tipoData);
        clearCache(`tipo_ficha_especifica_${id}`);
        clearCache('tipos_ficha_especifica');
        return data;
    }
};

// ============================================================================
// API DE FICHAS ESPECÍFICAS
// ============================================================================

export const fichasEspecificasAPI = {
    /**
     * Obtiene todas las fichas específicas
     */
    async getAll(params = {}) {
        const cacheKey = `fichas_especificas_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('fichas-especificas', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene una ficha específica
     */
    async getById(id) {
        const cacheKey = `ficha_especifica_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`fichas-especificas/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene fichas específicas por ficha
     */
    async getByFicha(fichaId) {
        return await this.getAll({ ficha_id: fichaId });
    },
    
    /**
     * Obtiene fichas específicas por tipo
     */
    async getByTipo(tipoId) {
        return await this.getAll({ tipo_id: tipoId });
    },
    
    /**
     * Crea una nueva ficha específica
     */
    async create(fichaEspecificaData) {
        const data = await post('fichas-especificas', fichaEspecificaData);
        clearCache('fichas_especificas');
        return data;
    },
    
    /**
     * Actualiza una ficha específica
     */
    async update(id, fichaEspecificaData) {
        const data = await put(`fichas-especificas/${id}`, fichaEspecificaData);
        clearCache(`ficha_especifica_${id}`);
        clearCache('fichas_especificas');
        return data;
    }
};

// ============================================================================
// API DE TRATAMIENTOS
// ============================================================================

export const tratamientosAPI = {
    /**
     * Obtiene todos los tratamientos
     */
    async getAll() {
        const cacheKey = 'tratamientos';
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('tratamientos');
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene un tratamiento específico
     */
    async getById(id) {
        const cacheKey = `tratamiento_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`tratamientos/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Crea un nuevo tratamiento
     */
    async create(tratamientoData) {
        const data = await post('tratamientos', tratamientoData);
        clearCache('tratamientos');
        return data;
    },
    
    /**
     * Actualiza un tratamiento
     */
    async update(id, tratamientoData) {
        const data = await put(`tratamientos/${id}`, tratamientoData);
        clearCache(`tratamiento_${id}`);
        clearCache('tratamientos');
        return data;
    }
};

// ============================================================================
// API DE PACKS
// ============================================================================

export const packsAPI = {
    /**
     * Obtiene todos los packs
     */
    async getAll(params = {}) {
        const cacheKey = `packs_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('packs', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene un pack específico
     */
    async getById(id) {
        const cacheKey = `pack_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`packs/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene packs por tratamiento
     */
    async getByTratamiento(tratamientoId) {
        return await this.getAll({ tratamiento_id: tratamientoId });
    },
    
    /**
     * Obtiene packs activos
     */
    async getActivos() {
        return await this.getAll({ activo: true });
    },
    
    /**
     * Crea un nuevo pack
     */
    async create(packData) {
        const data = await post('packs', packData);
        clearCache('packs');
        return data;
    },
    
    /**
     * Actualiza un pack
     */
    async update(id, packData) {
        const data = await put(`packs/${id}`, packData);
        clearCache(`pack_${id}`);
        clearCache('packs');
        return data;
    },
    
    /**
     * Elimina un pack (soft delete)
     */
    async delete(id) {
        const data = await del(`packs/${id}`);
        clearCache(`pack_${id}`);
        clearCache('packs');
        return data;
    }
};

// ============================================================================
// API DE EVALUACIONES
// ============================================================================

export const evaluacionesAPI = {
    /**
     * Obtiene todas las evaluaciones
     */
    async getAll(params = {}) {
        const cacheKey = `evaluaciones_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('evaluaciones', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene una evaluación específica
     */
    async getById(id) {
        const cacheKey = `evaluacion_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`evaluaciones/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene evaluaciones por ficha
     */
    async getByFicha(fichaId) {
        return await this.getAll({ ficha_id: fichaId });
    },
    
    /**
     * Crea una nueva evaluación
     */
    async create(evaluacionData) {
        const data = await post('evaluaciones', evaluacionData);
        clearCache('evaluaciones');
        return data;
    },
    
    /**
     * Actualiza una evaluación
     */
    async update(id, evaluacionData) {
        const data = await put(`evaluaciones/${id}`, evaluacionData);
        clearCache(`evaluacion_${id}`);
        clearCache('evaluaciones');
        return data;
    }
};

// ============================================================================
// API DE VENTAS
// ============================================================================

export const ventasAPI = {
    /**
     * Obtiene todas las ventas
     */
    async getAll(params = {}) {
        const cacheKey = `ventas_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('ventas', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene una venta específica
     */
    async getById(id) {
        const cacheKey = `venta_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`ventas/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene ventas por ficha
     */
    async getByFicha(fichaId) {
        return await this.getAll({ ficha_id: fichaId });
    },
    
    /**
     * Obtiene ventas por estado
     */
    async getByEstado(estado) {
        return await this.getAll({ estado: estado });
    },
    
    /**
     * Crea una nueva venta
     */
    async create(ventaData) {
        const data = await post('ventas', ventaData);
        clearCache('ventas');
        return data;
    },
    
    /**
     * Actualiza una venta
     */
    async update(id, ventaData) {
        const data = await put(`ventas/${id}`, ventaData);
        clearCache(`venta_${id}`);
        clearCache('ventas');
        return data;
    }
};

// ============================================================================
// API DE SESIONES
// ============================================================================

export const sesionesAPI = {
    /**
     * Obtiene todas las sesiones
     */
    async getAll(params = {}) {
        const cacheKey = `sesiones_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('sesiones', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene una sesión específica
     */
    async getById(id) {
        const cacheKey = `sesion_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`sesiones/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene sesiones por fecha
     */
    async getByFecha(fecha) {
        return await this.getAll({ fecha: fecha });
    },
    
    /**
     * Obtiene sesiones por venta
     */
    async getByVenta(ventaId) {
        return await this.getAll({ venta_id: ventaId });
    },
    
    /**
     * Obtiene sesiones por estado
     */
    async getByEstado(estado) {
        return await this.getAll({ estado: estado });
    },
    
    /**
     * Crea una nueva sesión
     */
    async create(sesionData) {
        const data = await post('sesiones', sesionData);
        clearCache('sesiones');
        return data;
    },
    
    /**
     * Actualiza una sesión
     */
    async update(id, sesionData) {
        const data = await put(`sesiones/${id}`, sesionData);
        clearCache(`sesion_${id}`);
        clearCache('sesiones');
        return data;
    }
};

// ============================================================================
// API DE OFERTAS
// ============================================================================

export const ofertasAPI = {
    /**
     * Obtiene todas las ofertas
     */
    async getAll(params = {}) {
        const cacheKey = `ofertas_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('ofertas', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene una oferta específica
     */
    async getById(id) {
        const cacheKey = `oferta_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`ofertas/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene ofertas activas
     */
    async getActivas() {
        return await this.getAll({ activo: true });
    },
    
    /**
     * Obtiene ofertas por tipo
     */
    async getByTipo(tipo) {
        return await this.getAll({ tipo: tipo });
    },
    
    /**
     * Obtiene ofertas combinables
     */
    async getCombinables() {
        return await this.getAll({ combinable: true });
    },
    
    /**
     * Crea una nueva oferta
     */
    async create(ofertaData) {
        const data = await post('ofertas', ofertaData);
        clearCache('ofertas');
        return data;
    },
    
    /**
     * Actualiza una oferta
     */
    async update(id, ofertaData) {
        const data = await put(`ofertas/${id}`, ofertaData);
        clearCache(`oferta_${id}`);
        clearCache('ofertas');
        return data;
    },
    
    /**
     * Elimina una oferta (soft delete)
     */
    async delete(id) {
        const data = await del(`ofertas/${id}`);
        clearCache(`oferta_${id}`);
        clearCache('ofertas');
        return data;
    }
};

// ============================================================================
// API DE OFERTAS COMBO
// ============================================================================

export const ofertasComboAPI = {
    /**
     * Obtiene todas las ofertas combo
     */
    async getAll(params = {}) {
        const cacheKey = `ofertas_combo_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('ofertas-combo', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene una oferta combo específica
     */
    async getById(id) {
        const cacheKey = `oferta_combo_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`ofertas-combo/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene ofertas combo por oferta
     */
    async getByOferta(ofertaId) {
        return await this.getAll({ oferta_id: ofertaId });
    },
    
    /**
     * Crea una nueva oferta combo
     */
    async create(ofertaComboData) {
        const data = await post('ofertas-combo', ofertaComboData);
        clearCache('ofertas_combo');
        return data;
    },
    
    /**
     * Actualiza una oferta combo
     */
    async update(id, ofertaComboData) {
        const data = await put(`ofertas-combo/${id}`, ofertaComboData);
        clearCache(`oferta_combo_${id}`);
        clearCache('ofertas_combo');
        return data;
    },
    
    /**
     * Elimina una oferta combo (soft delete)
     */
    async delete(id) {
        const data = await del(`ofertas-combo/${id}`);
        clearCache(`oferta_combo_${id}`);
        clearCache('ofertas_combo');
        return data;
    }
};

// ============================================================================
// API DE OFERTAS PACK
// ============================================================================

export const ofertasPackAPI = {
    /**
     * Obtiene todas las ofertas pack
     */
    async getAll(params = {}) {
        const cacheKey = `ofertas_pack_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('ofertas-pack', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene una oferta pack específica
     */
    async getById(id) {
        const cacheKey = `oferta_pack_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`ofertas-pack/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene ofertas pack por oferta
     */
    async getByOferta(ofertaId) {
        return await this.getAll({ oferta_id: ofertaId });
    },
    
    /**
     * Obtiene ofertas pack por pack
     */
    async getByPack(packId) {
        return await this.getAll({ pack_id: packId });
    },
    
    /**
     * Crea una nueva oferta pack
     */
    async create(ofertaPackData) {
        const data = await post('ofertas-pack', ofertaPackData);
        clearCache('ofertas_pack');
        return data;
    },
    
    /**
     * Actualiza una oferta pack
     */
    async update(id, ofertaPackData) {
        const data = await put(`ofertas-pack/${id}`, ofertaPackData);
        clearCache(`oferta_pack_${id}`);
        clearCache('ofertas_pack');
        return data;
    },
    
    /**
     * Elimina una oferta pack (soft delete)
     */
    async delete(id) {
        const data = await del(`ofertas-pack/${id}`);
        clearCache(`oferta_pack_${id}`);
        clearCache('ofertas_pack');
        return data;
    }
};

// ============================================================================
// API DE VENTA OFERTA
// ============================================================================

export const ventaOfertaAPI = {
    /**
     * Obtiene todas las ventas oferta
     */
    async getAll(params = {}) {
        const cacheKey = `venta_oferta_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('venta-oferta', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene una venta oferta específica
     */
    async getById(id) {
        const cacheKey = `venta_oferta_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`venta-oferta/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene ventas oferta por venta
     */
    async getByVenta(ventaId) {
        return await this.getAll({ venta_id: ventaId });
    },
    
    /**
     * Obtiene ventas oferta por oferta
     */
    async getByOferta(ofertaId) {
        return await this.getAll({ oferta_id: ofertaId });
    },
    
    /**
     * Crea una nueva venta oferta
     */
    async create(ventaOfertaData) {
        const data = await post('venta-oferta', ventaOfertaData);
        clearCache('venta_oferta');
        return data;
    },
    
    /**
     * Actualiza una venta oferta
     */
    async update(id, ventaOfertaData) {
        const data = await put(`venta-oferta/${id}`, ventaOfertaData);
        clearCache(`venta_oferta_${id}`);
        clearCache('venta_oferta');
        return data;
    },
    
    /**
     * Elimina una venta oferta (soft delete)
     */
    async delete(id) {
        const data = await del(`venta-oferta/${id}`);
        clearCache(`venta_oferta_${id}`);
        clearCache('venta_oferta');
        return data;
    }
};

// ============================================================================
// API DE SUCURSALES
// ============================================================================

export const sucursalesAPI = {
    /**
     * Obtiene todas las sucursales
     */
    async getAll(params = {}) {
        const cacheKey = `sucursales_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('sucursales', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene una sucursal específica
     */
    async getById(id) {
        const cacheKey = `sucursal_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`sucursales/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene sucursales activas
     */
    async getActivas() {
        return await this.getAll({ activo: true });
    },
    
    /**
     * Crea una nueva sucursal
     */
    async create(sucursalData) {
        const data = await post('sucursales', sucursalData);
        clearCache('sucursales');
        return data;
    },
    
    /**
     * Actualiza una sucursal
     */
    async update(id, sucursalData) {
        const data = await put(`sucursales/${id}`, sucursalData);
        clearCache(`sucursal_${id}`);
        clearCache('sucursales');
        return data;
    },
    
    /**
     * Elimina una sucursal (soft delete)
     */
    async delete(id) {
        const data = await del(`sucursales/${id}`);
        clearCache(`sucursal_${id}`);
        clearCache('sucursales');
        return data;
    }
};

// ============================================================================
// API DE BOXES
// ============================================================================

export const boxesAPI = {
    /**
     * Obtiene todos los boxes
     */
    async getAll(params = {}) {
        const cacheKey = `boxes_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('boxes', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene un box específico
     */
    async getById(id) {
        const cacheKey = `box_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`boxes/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene boxes por sucursal
     */
    async getBySucursal(sucursalId) {
        return await this.getAll({ sucursal_id: sucursalId });
    },
    
    /**
     * Obtiene boxes activos
     */
    async getActivos() {
        return await this.getAll({ activo: true });
    },
    
    /**
     * Crea un nuevo box
     */
    async create(boxData) {
        const data = await post('boxes', boxData);
        clearCache('boxes');
        return data;
    },
    
    /**
     * Actualiza un box
     */
    async update(id, boxData) {
        const data = await put(`boxes/${id}`, boxData);
        clearCache(`box_${id}`);
        clearCache('boxes');
        return data;
    },
    
    /**
     * Elimina un box (soft delete)
     */
    async delete(id) {
        const data = await del(`boxes/${id}`);
        clearCache(`box_${id}`);
        clearCache('boxes');
        return data;
    }
};

// ============================================================================
// API DE PROFESIONALES
// ============================================================================

export const profesionalesAPI = {
    /**
     * Obtiene todos los profesionales
     */
    async getAll(params = {}) {
        const cacheKey = `profesionales_${JSON.stringify(params)}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get('profesionales', params);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene un profesional específico
     */
    async getById(id) {
        const cacheKey = `profesional_${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;
        
        const data = await get(`profesionales/${id}`);
        setCached(cacheKey, data);
        return data;
    },
    
    /**
     * Obtiene profesionales activos
     */
    async getActivos() {
        return await this.getAll({ activo: true });
    },
    
    /**
     * Obtiene profesionales por tipo
     */
    async getByTipo(tipo) {
        return await this.getAll({ tipo_profesional: tipo });
    },
    
    /**
     * Crea un nuevo profesional
     */
    async create(profesionalData) {
        const data = await post('profesionales', profesionalData);
        clearCache('profesionales');
        return data;
    },
    
    /**
     * Actualiza un profesional
     */
    async update(id, profesionalData) {
        const data = await put(`profesionales/${id}`, profesionalData);
        clearCache(`profesional_${id}`);
        clearCache('profesionales');
        return data;
    },
    
    /**
     * Elimina un profesional (soft delete)
     */
    async delete(id) {
        const data = await del(`profesionales/${id}`);
        clearCache(`profesional_${id}`);
        clearCache('profesionales');
        return data;
    }
};

// ============================================================================
// API DE REPORTES
// ============================================================================

export const reportesAPI = {
    /**
     * Progreso de ventas (REP-001)
     */
    async getProgresoVentas(ventaId = null) {
        const params = ventaId ? { venta_id: ventaId } : {};
        return await get('reportes', { tipo: 'progreso-ventas', ...params });
    },
    
    /**
     * Plan vs ejecución (REP-002)
     */
    async getPlanVsEjecucion(fechaDesde = null, fechaHasta = null) {
        const params = { tipo: 'plan-vs-ejecucion' };
        if (fechaDesde) params.fecha_desde = fechaDesde;
        if (fechaHasta) params.fecha_hasta = fechaHasta;
        return await get('reportes', params);
    },
    
    /**
     * Disponibilidad de profesionales (PRO-002)
     */
    async getDisponibilidadProfesionales(fecha = null, profesionalId = null, sucursalId = null, boxId = null) {
        const params = { tipo: 'disponibilidad-profesionales' };
        if (fecha) params.fecha = fecha;
        if (profesionalId) params.profesional_id = profesionalId;
        if (sucursalId) params.sucursal_id = sucursalId;
        if (boxId) params.box_id = boxId;
        return await get('reportes', params);
    },
    
    /**
     * Ofertas aplicadas a una venta (OFE-004)
     */
    async getOfertasAplicadas(ventaId) {
        return await get('reportes', { tipo: 'ofertas-aplicadas', venta_id: ventaId });
    }
};

// ============================================================================
// FUNCIONES UTILITARIAS
// ============================================================================

/**
 * Verifica la salud de la API
 */
export async function healthCheck() {
    try {
        const response = await fetchWithRetry(`${API_CONFIG.baseUrl}/api.php/health`);
        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Error en health check:', error);
        return null;
    }
}

/**
 * Obtiene estadísticas del sistema
 */
export async function getStats() {
    try {
        const data = await get('stats');
        return data;
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        return null;
    }
}

/**
 * Crea un backup de la base de datos
 */
export async function createBackup() {
    try {
        const data = await post('backup');
        return data;
    } catch (error) {
        console.error('Error creando backup:', error);
        throw error;
    }
}

/**
 * Verifica la conexión a la API
 */
export async function checkConnection() {
    try {
        const health = await healthCheck();
        return {
            connected: !!health,
            details: health
        };
    } catch (error) {
        return {
            connected: false,
            error: error.message
        };
    }
}

/**
 * Limpia el cache de la API
 */
export function clearApiCache() {
    clearCache();
    console.log('🗑️ Cache de API limpiado');
}

/**
 * Obtiene información de la configuración de la API
 */
export function getApiConfig() {
    return {
        ...API_CONFIG,
        cacheSize: API_CACHE.data.size,
        cacheKeys: Array.from(API_CACHE.data.keys())
    };
}

/**
 * Función para mostrar notificaciones (compatibilidad con módulos)
 */
export function mostrarNotificacion(mensaje, tipo = 'info') {
    if (window.mostrarMensaje) {
        window.mostrarMensaje(mensaje, tipo);
    } else {
        console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    }
}

