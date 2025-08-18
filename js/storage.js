/**
 * Módulo de gestión de almacenamiento
 * Ahora usa API REST con SQLite como backend, con localStorage como fallback
 */

import { guardarContadorIds, generarId } from './utils.js';
import { 
    initializeApiClient, 
    pacientesAPI, 
    ventasAPI, 
    pagosAPI, 
    sesionesAPI, 
    ofertasAPI, 
    boxesAPI,
    handleApiError,
    checkConnection
} from './api-client.js';

/**
 * Configuración del storage híbrido
 */
const STORAGE_CONFIG = {
    useApi: true,
    useLocalStorageFallback: true,
    syncInterval: 30000 // 30 segundos
};

/**
 * Claves para localStorage (fallback)
 */
const STORAGE_KEYS = {
  PACIENTES: 'clinica_pacientes',
  VENTAS: 'clinica_ventas',
  PAGOS: 'clinica_pagos',
  SESIONES: 'clinica_sesiones',
  OFERTAS: 'clinica_ofertas',
  AGENDA: 'clinica_agenda'
};

/**
 * Cache local para datos de la API
 */
const DATA_CACHE = {
  pacientes: [],
  ventas: [],
  pagos: [],
  sesiones: [],
  ofertas: [],
  boxes: [],
  lastSync: null,
  isOnline: true
};

/**
 * Inicializa el almacenamiento
 */
export async function inicializarStorage() {
    try {
        // Inicializar cliente API
        initializeApiClient();
        
        // Verificar conectividad
        const isOnline = await checkConnection();
        DATA_CACHE.isOnline = isOnline;
        
        if (isOnline && STORAGE_CONFIG.useApi) {
            console.log('🌐 Modo API habilitado - usando SQLite');
            await cargarDatosDesdeAPI();
        } else {
            console.log('💾 Modo offline - usando localStorage');
            cargarDatosDesdeLocalStorage();
        }
        
        // Configurar sincronización automática
        if (STORAGE_CONFIG.useApi) {
            configurarSincronizacionAutomatica();
        }
        
    } catch (error) {
        console.warn('⚠️ Error inicializando storage, usando localStorage:', error);
        STORAGE_CONFIG.useApi = false;
        cargarDatosDesdeLocalStorage();
    }
}

/**
 * Carga datos desde la API
 */
async function cargarDatosDesdeAPI() {
    try {
        // Cargar datos en paralelo
        const [pacientes, ventas, pagos, sesiones, ofertas, boxes] = await Promise.all([
            pacientesAPI.getAll().catch(() => []),
            ventasAPI.getAll().catch(() => []),
            pagosAPI.getAll().catch(() => []),
            sesionesAPI.getAll().catch(() => []),
            ofertasAPI.getActive().catch(() => []),
            boxesAPI.getAll().catch(() => [])
        ]);
        
        DATA_CACHE.pacientes = pacientes;
        DATA_CACHE.ventas = ventas;
        DATA_CACHE.pagos = pagos;
        DATA_CACHE.sesiones = sesiones;
        DATA_CACHE.ofertas = ofertas;
        DATA_CACHE.boxes = boxes;
        DATA_CACHE.lastSync = Date.now();
        
        // Respaldar en localStorage
        if (STORAGE_CONFIG.useLocalStorageFallback) {
            respaldarEnLocalStorage();
        }
        
        console.log('✅ Datos cargados desde API');
        
    } catch (error) {
        console.error('❌ Error cargando datos desde API:', error);
        throw error;
    }
}

/**
 * Carga datos desde localStorage
 */
function cargarDatosDesdeLocalStorage() {
    Object.keys(DATA_CACHE).forEach(key => {
        if (key === 'lastSync' || key === 'isOnline') return;
        
        const storageKey = STORAGE_KEYS[key.toUpperCase()];
        if (storageKey) {
            DATA_CACHE[key] = JSON.parse(localStorage.getItem(storageKey) || '[]');
        }
    });
    
    console.log('✅ Datos cargados desde localStorage');
}

/**
 * Respalda datos en localStorage
 */
function respaldarEnLocalStorage() {
    Object.keys(DATA_CACHE).forEach(key => {
        if (key === 'lastSync' || key === 'isOnline') return;
        
        const storageKey = STORAGE_KEYS[key.toUpperCase()];
        if (storageKey && Array.isArray(DATA_CACHE[key])) {
            localStorage.setItem(storageKey, JSON.stringify(DATA_CACHE[key]));
        }
    });
}

/**
 * Configura sincronización automática
 */
function configurarSincronizacionAutomatica() {
    setInterval(async () => {
        try {
            const isOnline = await checkConnection();
            
            if (isOnline && !DATA_CACHE.isOnline) {
                // Reconectado - sincronizar
                console.log('🔄 Reconectado - sincronizando datos');
                await cargarDatosDesdeAPI();
            }
            
            DATA_CACHE.isOnline = isOnline;
            
        } catch (error) {
            console.warn('⚠️ Error en sincronización automática:', error);
        }
    }, STORAGE_CONFIG.syncInterval);
}

/**
 * Guarda todos los datos
 */
export function guardarTodos() {
    if (STORAGE_CONFIG.useLocalStorageFallback) {
        respaldarEnLocalStorage();
    }
    guardarContadorIds();
}

/**
 * Guarda una entidad específica
 */
function guardarEntidad(tipo) {
  const storageKey = STORAGE_KEYS[tipo.toUpperCase()];
  localStorage.setItem(storageKey, JSON.stringify(DATA[tipo]));
  guardarContadorIds();
}

// === PACIENTES ===

export function obtenerPacientes() {
  return [...DATA.pacientes];
}

export function obtenerPacientePorId(id) {
  return DATA.pacientes.find(p => p.id === id);
}

export function guardarPaciente(paciente) {
  const indiceExistente = DATA.pacientes.findIndex(p => p.id === paciente.id);
  
  if (indiceExistente >= 0) {
    DATA.pacientes[indiceExistente] = paciente;
  } else {
    DATA.pacientes.push(paciente);
  }
  
  guardarEntidad('pacientes');
  return paciente;
}

export function eliminarPaciente(id) {
  const indice = DATA.pacientes.findIndex(p => p.id === id);
  if (indice >= 0) {
    const paciente = DATA.pacientes.splice(indice, 1)[0];
    guardarEntidad('pacientes');
    return paciente;
  }
  return null;
}

// === VENTAS ===

export function obtenerVentas() {
  return [...DATA.ventas];
}

export function obtenerVentaPorId(id) {
  return DATA.ventas.find(v => v.id === id);
}

export function obtenerVentasPorCliente(clienteId) {
  return DATA.ventas.filter(v => v.clienteId === clienteId);
}

export function obtenerVentasPendientesPago() {
  return DATA.ventas.filter(venta => {
    const totalPagado = obtenerPagosPorVenta(venta.id)
      .reduce((sum, pago) => sum + pago.monto, 0);
    return totalPagado < venta.precioFinal;
  });
}

export function guardarVenta(venta) {
  const indiceExistente = DATA.ventas.findIndex(v => v.id === venta.id);
  
  if (indiceExistente >= 0) {
    DATA.ventas[indiceExistente] = venta;
  } else {
    DATA.ventas.push(venta);
  }
  
  guardarEntidad('ventas');
  return venta;
}

// === PAGOS ===

export function obtenerPagos() {
  return [...DATA.pagos];
}

export function obtenerPagosPorVenta(ventaId) {
  return DATA.pagos.filter(p => p.ventaId === ventaId);
}

export function guardarPago(pago) {
  DATA.pagos.push(pago);
  guardarEntidad('pagos');
  return pago;
}

export function calcularEstadoPago(ventaId) {
  const venta = obtenerVentaPorId(ventaId);
  if (!venta) return { pagado: 0, pendiente: 0, clase: 'status-pending', texto: 'Sin datos' };
  
  const pagosVenta = obtenerPagosPorVenta(ventaId);
  const totalPagado = pagosVenta.reduce((sum, pago) => sum + pago.monto, 0);
  const pendiente = Math.max(0, venta.precioFinal - totalPagado);
  
  const completamentePagado = pendiente === 0;
  
  return {
    pagado: totalPagado,
    pendiente,
    clase: completamentePagado ? 'status-paid' : 'status-pending',
    texto: completamentePagado ? 'Pagado' : 'Pendiente'
  };
}

// === SESIONES ===

export function obtenerSesiones() {
  return [...DATA.sesiones];
}

export function obtenerSesionesPorPaciente(pacienteId) {
  return DATA.sesiones.filter(s => s.pacienteId === pacienteId);
}

export function obtenerSesionesPorVenta(ventaId) {
  return DATA.sesiones.filter(s => s.ventaId === ventaId);
}

export function guardarSesion(sesion) {
  DATA.sesiones.push(sesion);
  guardarEntidad('sesiones');
  return sesion;
}

// === OFERTAS ===

export function obtenerOfertas() {
  return [...DATA.ofertas];
}

export function obtenerOfertasActivas() {
  const hoy = new Date().toISOString().split('T')[0];
  return DATA.ofertas.filter(o => o.activa && o.fechaFin >= hoy);
}

export function obtenerOfertaPorTratamiento(tratamientoKey) {
  const hoy = new Date().toISOString().split('T')[0];
  return DATA.ofertas.find(o => 
    o.tratamientoKey === tratamientoKey && 
    o.activa && 
    o.fechaInicio <= hoy && 
    o.fechaFin >= hoy
  );
}

export function guardarOferta(oferta) {
  const indiceExistente = DATA.ofertas.findIndex(o => o.id === oferta.id);
  
  if (indiceExistente >= 0) {
    DATA.ofertas[indiceExistente] = oferta;
  } else {
    DATA.ofertas.push(oferta);
  }
  
  guardarEntidad('ofertas');
  return oferta;
}

// === SESIONES Y AGENDA ===

export function obtenerAgenda() {
  return [...DATA.agenda];
}

export function obtenerAgendaPorPaciente(pacienteId) {
  return DATA.agenda.filter(a => a.pacienteId === pacienteId);
}

export function obtenerAgendaPorFecha(fecha) {
  return DATA.agenda.filter(a => a.fecha.startsWith(fecha));
}

export function guardarAgenda(agenda) {
  const indiceExistente = DATA.agenda.findIndex(a => a.id === agenda.id);
  
  if (indiceExistente >= 0) {
    DATA.agenda[indiceExistente] = agenda;
  } else {
    DATA.agenda.push(agenda);
  }
  
  guardarEntidad('agenda');
  return agenda;
}

/**
 * Crea una nueva sesión agendada con estructura completa
 * @param {Object} datosSesion - Datos de la sesión
 * @returns {Object} Sesión creada
 */
export function crearSesionAgendada(datosSesion) {
  const {
    clienteId,
    ventaId,
    fechaHora,
    boxId,
    googleEventId,
    numeroSesion,
    totalSesiones
  } = datosSesion;
  
  const cliente = obtenerPacientePorId(clienteId);
  const venta = obtenerVentaPorId(ventaId);
  
  if (!cliente || !venta) {
    throw new Error('Cliente o venta no encontrada');
  }
  
  const sesion = {
    id: generarId(),
    clienteId,
    clienteNombre: cliente.nombre,
    clienteRut: cliente.rut,
    ventaId,
    tratamientoKey: venta.tratamientoKey,
    tratamientoNombre: venta.tratamiento,
    fecha: fechaHora,
    boxId,
    googleEventId,
    numeroSesion,
    totalSesiones,
    estado: 'agendada',
    fechaCreacion: new Date().toISOString(),
    fechaProgramada: fechaHora, // Para comparar con ejecución real
    fechaEjecucion: null,
    horaInicioReal: null,
    horaFinReal: null,
    observaciones: null
  };
  
  return guardarAgenda(sesion);
}

/**
 * Marca una sesión como iniciada
 */
export function iniciarSesionAgendada(sesionId) {
  const sesion = DATA.agenda.find(a => a.id === sesionId);
  if (!sesion) throw new Error('Sesión no encontrada');
  
  sesion.estado = 'en_curso';
  sesion.horaInicioReal = new Date().toISOString();
  
  guardarEntidad('agenda');
  return sesion;
}

/**
 * Marca una sesión como completada y reduce sesiones restantes
 */
export function completarSesion(sesionId, observaciones = '') {
  const sesion = DATA.agenda.find(a => a.id === sesionId);
  if (!sesion) throw new Error('Sesión no encontrada');
  
  const venta = obtenerVentaPorId(sesion.ventaId);
  if (!venta) throw new Error('Venta no encontrada');
  
  // Actualizar sesión
  sesion.estado = 'completada';
  sesion.horaFinReal = new Date().toISOString();
  sesion.fechaEjecucion = new Date().toISOString();
  sesion.observaciones = observaciones;
  
  // Reducir sesiones restantes
  venta.sesionesRestantes = Math.max(0, venta.sesionesRestantes - 1);
  
  // Guardar cambios
  guardarEntidad('agenda');
  guardarVenta(venta);
  
  return { sesion, venta };
}

/**
 * Obtiene las próximas sesiones de una venta específica
 */
export function obtenerProximasSesionesPorVenta(ventaId) {
  return DATA.agenda.filter(a => 
    a.ventaId === ventaId && 
    ['agendada', 'en_curso'].includes(a.estado)
  ).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

// === UTILIDADES ===

/**
 * Exporta todos los datos para backup
 */
export function exportarBackup() {
  return {
    fecha: new Date().toISOString(),
    version: '1.0',
    datos: { ...DATA }
  };
}

/**
 * Importa datos desde backup
 */
export function importarBackup(backup) {
  if (!backup.datos) {
    throw new Error('Formato de backup inválido');
  }
  
  Object.keys(DATA).forEach(key => {
    if (backup.datos[key]) {
      DATA[key] = backup.datos[key];
    }
  });
  
  guardarTodos();
}

/**
 * Limpia todos los datos (usar con cuidado)
 */
export function limpiarTodosLosDatos() {
  if (confirm('¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
    Object.keys(DATA).forEach(key => {
      DATA[key] = [];
    });
    guardarTodos();
    return true;
  }
  return false;
}

/**
 * Obtiene estadísticas generales
 */
export function obtenerEstadisticas() {
  const totalPacientes = DATA.pacientes.length;
  const totalVentas = DATA.ventas.length;
  const totalPagos = DATA.pagos.reduce((sum, p) => sum + p.monto, 0);
  const sesionesCompletadas = DATA.sesiones.length;
  const ofertasActivas = obtenerOfertasActivas().length;
  
  return {
    totalPacientes,
    totalVentas,
    totalPagos,
    sesionesCompletadas,
    ofertasActivas
  };
}
