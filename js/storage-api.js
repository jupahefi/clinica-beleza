/**
 * Módulo de almacenamiento moderno con API SQLite
 * Reemplaza el sistema localStorage con persistencia robusta
 */

import { 
    initializeApiClient, 
    pacientesAPI, 
    ventasAPI, 
    pagosAPI, 
    sesionesAPI, 
    ofertasAPI, 
    boxesAPI,
    handleApiError,
    checkConnection,
    clearCache
} from './api-client.js';

import { generarId } from './utils.js';

/**
 * Configuración del almacenamiento
 */
const STORAGE_CONFIG = {
    useApi: true,
    cacheEnabled: true,
    syncInterval: 30000, // 30 segundos
    retryAttempts: 3
};

/**
 * Estado del sistema de almacenamiento
 */
const STORAGE_STATE = {
    isInitialized: false,
    isOnline: true,
    lastSync: null,
    pendingSync: []
};

/**
 * Cache local para optimización
 */
const LOCAL_CACHE = {
    pacientes: new Map(),
    ventas: new Map(),
    pagos: new Map(),
    sesiones: new Map(),
    ofertas: new Map(),
    boxes: new Map()
};

/**
 * Inicializa el sistema de almacenamiento
 */
export async function inicializarStorage() {
    if (STORAGE_STATE.isInitialized) {
        return;
    }
    
    try {
        console.log('🚀 Inicializando sistema de almacenamiento...');
        
        // Inicializar cliente API
        initializeApiClient();
        
        // Verificar conectividad
        const isOnline = await checkConnection();
        STORAGE_STATE.isOnline = isOnline;
        
        if (isOnline) {
            console.log('🌐 Conectado a la API - cargando datos desde SQLite');
            await cargarDatosIniciales();
        } else {
            console.log('🔌 Sin conexión - usando datos locales');
            cargarDatosLocales();
        }
        
        // Configurar sincronización
        configurarSincronizacion();
        
        STORAGE_STATE.isInitialized = true;
        console.log('✅ Sistema de almacenamiento inicializado');
        
    } catch (error) {
        console.error('❌ Error inicializando almacenamiento:', error);
        // Fallback a datos locales
        cargarDatosLocales();
        STORAGE_STATE.isInitialized = true;
    }
}

/**
 * Carga datos iniciales desde la API
 */
async function cargarDatosIniciales() {
    try {
        console.log('📥 Cargando datos desde la API...');
        
        // Cargar en paralelo para mejor rendimiento
        const [pacientes, ventas, pagos, sesiones, ofertas, boxes] = await Promise.all([
            pacientesAPI.getAll().catch(() => []),
            ventasAPI.getAll().catch(() => []),
            pagosAPI.getAll().catch(() => []),
            sesionesAPI.getAll().catch(() => []),
            ofertasAPI.getActive().catch(() => []),
            boxesAPI.getAll().catch(() => [])
        ]);
        
        // Actualizar cache local
        pacientes.forEach(p => LOCAL_CACHE.pacientes.set(p.id, p));
        ventas.forEach(v => LOCAL_CACHE.ventas.set(v.id, v));
        pagos.forEach(p => LOCAL_CACHE.pagos.set(p.id, p));
        sesiones.forEach(s => LOCAL_CACHE.sesiones.set(s.id, s));
        ofertas.forEach(o => LOCAL_CACHE.ofertas.set(o.id, o));
        boxes.forEach(b => LOCAL_CACHE.boxes.set(b.id, b));
        
        STORAGE_STATE.lastSync = Date.now();
        console.log('✅ Datos cargados desde la API');
        
    } catch (error) {
        console.error('❌ Error cargando datos desde API:', error);
        throw error;
    }
}

/**
 * Carga datos desde localStorage (fallback)
 */
function cargarDatosLocales() {
    try {
        console.log('💾 Cargando datos desde localStorage...');
        
        // Cargar pacientes
        const pacientesData = localStorage.getItem('clinica_pacientes');
        if (pacientesData) {
            const pacientes = JSON.parse(pacientesData);
            pacientes.forEach(p => LOCAL_CACHE.pacientes.set(p.id, p));
        }
        
        // Cargar ventas
        const ventasData = localStorage.getItem('clinica_ventas');
        if (ventasData) {
            const ventas = JSON.parse(ventasData);
            ventas.forEach(v => LOCAL_CACHE.ventas.set(v.id, v));
        }
        
        // Cargar pagos
        const pagosData = localStorage.getItem('clinica_pagos');
        if (pagosData) {
            const pagos = JSON.parse(pagosData);
            pagos.forEach(p => LOCAL_CACHE.pagos.set(p.id, p));
        }
        
        console.log('✅ Datos cargados desde localStorage');
        
    } catch (error) {
        console.error('❌ Error cargando datos locales:', error);
    }
}

/**
 * Configura sincronización automática
 */
function configurarSincronizacion() {
    if (STORAGE_CONFIG.syncInterval > 0) {
        setInterval(async () => {
            if (STORAGE_STATE.isOnline && STORAGE_STATE.pendingSync.length > 0) {
                await sincronizarPendientes();
            }
        }, STORAGE_CONFIG.syncInterval);
    }
}

/**
 * Sincroniza operaciones pendientes
 */
async function sincronizarPendientes() {
    if (STORAGE_STATE.pendingSync.length === 0) return;
    
    console.log('🔄 Sincronizando operaciones pendientes...');
    
    const operaciones = [...STORAGE_STATE.pendingSync];
    STORAGE_STATE.pendingSync = [];
    
    for (const operacion of operaciones) {
        try {
            switch (operacion.entity) {
                case 'pacientes':
                    if (operacion.method === 'create') {
                        await pacientesAPI.create(operacion.data);
                    } else if (operacion.method === 'update') {
                        await pacientesAPI.update(operacion.id, operacion.data);
                    } else if (operacion.method === 'delete') {
                        await pacientesAPI.delete(operacion.id);
                    }
                    break;
                    
                case 'ventas':
                    if (operacion.method === 'create') {
                        await ventasAPI.create(operacion.data);
                    } else if (operacion.method === 'update') {
                        await ventasAPI.update(operacion.id, operacion.data);
                    } else if (operacion.method === 'delete') {
                        await ventasAPI.delete(operacion.id);
                    }
                    break;
                    
                case 'pagos':
                    if (operacion.method === 'create') {
                        await pagosAPI.create(operacion.data);
                    } else if (operacion.method === 'update') {
                        await pagosAPI.update(operacion.id, operacion.data);
                    } else if (operacion.method === 'delete') {
                        await pagosAPI.delete(operacion.id);
                    }
                    break;
            }
        } catch (error) {
            console.error('❌ Error sincronizando operación:', operacion, error);
            // Reagregar a la cola para reintentar
            STORAGE_STATE.pendingSync.push(operacion);
        }
    }
    
    console.log('✅ Sincronización completada');
}
        const [pacientes, ventas, pagos, sesiones, ofertas, boxes] = await Promise.allSettled([
            pacientesAPI.getAll(),
            ventasAPI.getAll(),
            pagosAPI.getAll(),
            sesionesAPI.getAll(),
            ofertasAPI.getActive(),
            boxesAPI.getAll()
        ]);
        
        // Procesar resultados
        if (pacientes.status === 'fulfilled') {
            pacientes.value.forEach(p => LOCAL_CACHE.pacientes.set(p.id, p));
        }
        
        if (ventas.status === 'fulfilled') {
            ventas.value.forEach(v => LOCAL_CACHE.ventas.set(v.id, v));
        }
        
        if (pagos.status === 'fulfilled') {
            pagos.value.forEach(p => LOCAL_CACHE.pagos.set(p.id, p));
        }
        
        if (sesiones.status === 'fulfilled') {
            sesiones.value.forEach(s => LOCAL_CACHE.sesiones.set(s.id, s));
        }
        
        if (ofertas.status === 'fulfilled') {
            ofertas.value.forEach(o => LOCAL_CACHE.ofertas.set(o.id, o));
        }
        
        if (boxes.status === 'fulfilled') {
            boxes.value.forEach(b => LOCAL_CACHE.boxes.set(b.id, b));
        }
        
        STORAGE_STATE.lastSync = Date.now();
        console.log('✅ Datos cargados exitosamente');
        
    } catch (error) {
        console.error('❌ Error cargando datos iniciales:', error);
        throw error;
    }
}

/**
 * Carga datos desde localStorage como fallback
 */
function cargarDatosLocales() {
    const entidades = ['pacientes', 'ventas', 'pagos', 'sesiones', 'ofertas', 'boxes'];
    
    entidades.forEach(entidad => {
        try {
            const data = localStorage.getItem(`clinica_${entidad}`);
            if (data) {
                const items = JSON.parse(data);
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        LOCAL_CACHE[entidad].set(item.id, item);
                    });
                }
            }
        } catch (error) {
            console.warn(`⚠️ Error cargando ${entidad} desde localStorage:`, error);
        }
    });
}

/**
 * Configura la sincronización automática
 */
function configurarSincronizacion() {
    // Sincronización periódica
    setInterval(async () => {
        if (STORAGE_STATE.isOnline) {
            await sincronizarDatos();
        }
    }, STORAGE_CONFIG.syncInterval);
    
    // Detectar cambios de conectividad
    window.addEventListener('online', async () => {
        console.log('🔄 Conexión restaurada - sincronizando...');
        STORAGE_STATE.isOnline = true;
        await sincronizarDatos();
    });
    
    window.addEventListener('offline', () => {
        console.log('🔌 Conexión perdida - modo offline');
        STORAGE_STATE.isOnline = false;
    });
}

/**
 * Sincroniza datos con el servidor
 */
async function sincronizarDatos() {
    try {
        const isConnected = await checkConnection();
        if (!isConnected) {
            STORAGE_STATE.isOnline = false;
            return;
        }
        
        STORAGE_STATE.isOnline = true;
        
        // Procesar operaciones pendientes
        if (STORAGE_STATE.pendingSync.length > 0) {
            console.log(`🔄 Sincronizando ${STORAGE_STATE.pendingSync.length} operaciones pendientes...`);
            
            for (const operation of STORAGE_STATE.pendingSync) {
                try {
                    await ejecutarOperacionPendiente(operation);
                } catch (error) {
                    console.error('❌ Error sincronizando operación:', error);
                }
            }
            
            STORAGE_STATE.pendingSync = [];
        }
        
        STORAGE_STATE.lastSync = Date.now();
        
    } catch (error) {
        console.error('❌ Error en sincronización:', error);
    }
}

/**
 * Ejecuta una operación pendiente de sincronización
 */
async function ejecutarOperacionPendiente(operation) {
    const { type, entity, method, data, id } = operation;
    
    switch (entity) {
        case 'pacientes':
            if (method === 'create') {
                await pacientesAPI.create(data);
            } else if (method === 'update') {
                await pacientesAPI.update(id, data);
            } else if (method === 'delete') {
                await pacientesAPI.delete(id);
            }
            break;
            
        case 'ventas':
            if (method === 'create') {
                await ventasAPI.create(data);
            } else if (method === 'update') {
                await ventasAPI.update(id, data);
            }
            break;
            
        case 'pagos':
            if (method === 'create') {
                await pagosAPI.create(data);
            }
            break;
            
        case 'sesiones':
            if (method === 'create') {
                await sesionesAPI.create(data);
            } else if (method === 'update') {
                await sesionesAPI.update(id, data);
            }
            break;
    }
}

/**
 * PACIENTES API
 */
export async function obtenerPacientes() {
    if (STORAGE_STATE.isOnline && STORAGE_CONFIG.useApi) {
        try {
            const pacientes = await pacientesAPI.getAll();
            // Actualizar cache
            LOCAL_CACHE.pacientes.clear();
            pacientes.forEach(p => LOCAL_CACHE.pacientes.set(p.id, p));
            return pacientes;
        } catch (error) {
            console.warn('⚠️ Error obteniendo pacientes de API, usando cache:', error);
        }
    }
    
    return Array.from(LOCAL_CACHE.pacientes.values());
}

export async function obtenerPacientePorId(id) {
    if (STORAGE_STATE.isOnline && STORAGE_CONFIG.useApi) {
        try {
            const paciente = await pacientesAPI.getById(id);
            LOCAL_CACHE.pacientes.set(id, paciente);
            return paciente;
        } catch (error) {
            console.warn('⚠️ Error obteniendo paciente de API, usando cache:', error);
        }
    }
    
    return LOCAL_CACHE.pacientes.get(parseInt(id)) || null;
}

export function obtenerPacientePorRut(rut) {
    for (const paciente of LOCAL_CACHE.pacientes.values()) {
        if (paciente.rut === rut) {
            return paciente;
        }
    }
    return null;
}

export async function guardarPaciente(pacienteData) {
    try {
        let paciente;
        
        if (STORAGE_STATE.isOnline && STORAGE_CONFIG.useApi) {
            if (pacienteData.id) {
                // Actualizar existente
                const result = await pacientesAPI.update(pacienteData.id, pacienteData);
                paciente = { ...pacienteData, ...result };
            } else {
                // Crear nuevo
                const result = await pacientesAPI.create(pacienteData);
                paciente = { ...pacienteData, id: result.id };
            }
        } else {
            // Modo offline - asignar ID temporal
            if (!pacienteData.id) {
                pacienteData.id = generarId('paciente');
            }
            
            paciente = {
                ...pacienteData,
                _pending: true,
                _timestamp: Date.now()
            };
            
            // Agregar a cola de sincronización
            STORAGE_STATE.pendingSync.push({
                entity: 'pacientes',
                method: pacienteData.id ? 'update' : 'create',
                data: pacienteData,
                id: pacienteData.id
            });
        }
        
        // Actualizar cache local
        LOCAL_CACHE.pacientes.set(paciente.id, paciente);
        
        // Respaldar en localStorage
        respaldarPacientes();
        
        return paciente;
        
    } catch (error) {
        console.error('❌ Error guardando paciente:', error);
        throw error;
    }
}

export async function eliminarPaciente(id) {
    try {
        if (STORAGE_STATE.isOnline && STORAGE_CONFIG.useApi) {
            await pacientesAPI.delete(id);
        } else {
            // Modo offline
            STORAGE_STATE.pendingSync.push({
                entity: 'pacientes',
                method: 'delete',
                id: id
            });
        }
        
        // Remover del cache local
        LOCAL_CACHE.pacientes.delete(parseInt(id));
        
        // Actualizar localStorage
        respaldarPacientes();
        
        return true;
        
    } catch (error) {
        console.error('❌ Error eliminando paciente:', error);
        return false;
    }
}

/**
 * VENTAS API
 */
export async function obtenerVentas(filtros = {}) {
    if (STORAGE_STATE.isOnline && STORAGE_CONFIG.useApi) {
        try {
            const ventas = await ventasAPI.getAll(filtros);
            // Actualizar cache
            LOCAL_CACHE.ventas.clear();
            ventas.forEach(v => LOCAL_CACHE.ventas.set(v.id, v));
            return ventas;
        } catch (error) {
            console.warn('⚠️ Error obteniendo ventas de API, usando cache:', error);
        }
    }
    
    let ventas = Array.from(LOCAL_CACHE.ventas.values());
    
    // Aplicar filtros localmente
    if (filtros.paciente_id) {
        ventas = ventas.filter(v => v.paciente_id == filtros.paciente_id);
    }
    
    if (filtros.estado) {
        ventas = ventas.filter(v => v.estado === filtros.estado);
    }
    
    return ventas;
}

export async function obtenerVentaPorId(id) {
    if (STORAGE_STATE.isOnline && STORAGE_CONFIG.useApi) {
        try {
            const venta = await ventasAPI.getById(id);
            LOCAL_CACHE.ventas.set(id, venta);
            return venta;
        } catch (error) {
            console.warn('⚠️ Error obteniendo venta de API, usando cache:', error);
        }
    }
    
    return LOCAL_CACHE.ventas.get(parseInt(id)) || null;
}

export function obtenerVentasPorCliente(clienteId) {
    return Array.from(LOCAL_CACHE.ventas.values())
        .filter(v => v.paciente_id == clienteId);
}

export function obtenerVentasPendientesPago() {
    return Array.from(LOCAL_CACHE.ventas.values())
        .filter(venta => {
            const pagos = Array.from(LOCAL_CACHE.pagos.values())
                .filter(p => p.venta_id == venta.id);
            
            const totalPagado = pagos.reduce((sum, pago) => sum + parseFloat(pago.monto), 0);
            return totalPagado < parseFloat(venta.precio_total);
        });
}

export async function guardarVenta(ventaData) {
    try {
        let venta;
        
        if (STORAGE_STATE.isOnline && STORAGE_CONFIG.useApi) {
            if (ventaData.id) {
                const result = await ventasAPI.update(ventaData.id, ventaData);
                venta = { ...ventaData, ...result };
            } else {
                const result = await ventasAPI.create(ventaData);
                venta = { ...ventaData, id: result.id };
            }
        } else {
            if (!ventaData.id) {
                ventaData.id = generarId('venta');
            }
            
            venta = {
                ...ventaData,
                _pending: true,
                _timestamp: Date.now()
            };
            
            STORAGE_STATE.pendingSync.push({
                entity: 'ventas',
                method: ventaData.id ? 'update' : 'create',
                data: ventaData,
                id: ventaData.id
            });
        }
        
        LOCAL_CACHE.ventas.set(venta.id, venta);
        respaldarVentas();
        
        return venta;
        
    } catch (error) {
        console.error('❌ Error guardando venta:', error);
        throw error;
    }
}

/**
 * PAGOS API
 */
export async function obtenerPagos() {
    if (STORAGE_STATE.isOnline && STORAGE_CONFIG.useApi) {
        try {
            const pagos = await pagosAPI.getAll();
            LOCAL_CACHE.pagos.clear();
            pagos.forEach(p => LOCAL_CACHE.pagos.set(p.id, p));
            return pagos;
        } catch (error) {
            console.warn('⚠️ Error obteniendo pagos de API, usando cache:', error);
        }
    }
    
    return Array.from(LOCAL_CACHE.pagos.values());
}

export function obtenerPagosPorVenta(ventaId) {
    return Array.from(LOCAL_CACHE.pagos.values())
        .filter(p => p.venta_id == ventaId);
}

export async function guardarPago(pagoData) {
    try {
        let pago;
        
        if (STORAGE_STATE.isOnline && STORAGE_CONFIG.useApi) {
            if (pagoData.id) {
                const result = await pagosAPI.update(pagoData.id, pagoData);
                pago = { ...pagoData, ...result };
            } else {
                const result = await pagosAPI.create(pagoData);
                pago = { ...pagoData, id: result.id };
            }
        } else {
            if (!pagoData.id) {
                pagoData.id = generarId('pago');
            }
            
            pago = {
                ...pagoData,
                _pending: true,
                _timestamp: Date.now()
            };
            
            STORAGE_STATE.pendingSync.push({
                entity: 'pagos',
                method: pagoData.id ? 'update' : 'create',
                data: pagoData,
                id: pagoData.id
            });
        }
        
        LOCAL_CACHE.pagos.set(pago.id, pago);
        respaldarPagos();
        
        return pago;
        
    } catch (error) {
        console.error('❌ Error guardando pago:', error);
        throw error;
    }
}

export function calcularEstadoPago(ventaId) {
    const venta = LOCAL_CACHE.ventas.get(parseInt(ventaId));
    if (!venta) return { pagado: 0, pendiente: 0, clase: 'status-pending', texto: 'Sin datos' };
    
    const pagosVenta = obtenerPagosPorVenta(ventaId);
    const totalPagado = pagosVenta.reduce((sum, pago) => sum + parseFloat(pago.monto), 0);
    const pendiente = Math.max(0, parseFloat(venta.precio_total) - totalPagado);
    
    const completamentePagado = pendiente === 0;
    
    return {
        pagado: totalPagado,
        pendiente,
        clase: completamentePagado ? 'status-success' : 'status-pending',
        texto: completamentePagado ? 'Pagado' : `Pendiente: $${pendiente.toLocaleString()}`
    };
}

/**
 * FUNCIONES DE RESPALDO LOCAL
 */
function respaldarPacientes() {
    const pacientes = Array.from(LOCAL_CACHE.pacientes.values());
    localStorage.setItem('clinica_pacientes', JSON.stringify(pacientes));
}

function respaldarVentas() {
    const ventas = Array.from(LOCAL_CACHE.ventas.values());
    localStorage.setItem('clinica_ventas', JSON.stringify(ventas));
}

function respaldarPagos() {
    const pagos = Array.from(LOCAL_CACHE.pagos.values());
    localStorage.setItem('clinica_pagos', JSON.stringify(pagos));
}

/**
 * FUNCIONES DE UTILIDAD
 */
export function getStorageState() {
    return { ...STORAGE_STATE };
}

export function getCacheStats() {
    return {
        pacientes: LOCAL_CACHE.pacientes.size,
        ventas: LOCAL_CACHE.ventas.size,
        pagos: LOCAL_CACHE.pagos.size,
        sesiones: LOCAL_CACHE.sesiones.size,
        ofertas: LOCAL_CACHE.ofertas.size,
        boxes: LOCAL_CACHE.boxes.size,
        lastSync: STORAGE_STATE.lastSync,
        isOnline: STORAGE_STATE.isOnline,
        pendingOperations: STORAGE_STATE.pendingSync.length
    };
}

export function clearLocalCache() {
    Object.values(LOCAL_CACHE).forEach(cache => cache.clear());
    clearCache(); // Limpiar también el cache de la API
}

// Para compatibilidad con el sistema anterior
export function guardarTodos() {
    respaldarPacientes();
    respaldarVentas();
    console.log('💾 Datos respaldados en localStorage');
}

