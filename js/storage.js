/**
 * Módulo de gestión de almacenamiento local
 * Maneja toda la persistencia de datos en localStorage
 */

import { guardarContadorIds } from './utils.js';

/**
 * Claves para localStorage
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
 * Datos en memoria para optimizar acceso
 */
const DATA = {
  pacientes: [],
  ventas: [],
  pagos: [],
  sesiones: [],
  ofertas: [],
  agenda: []
};

/**
 * Inicializa el almacenamiento cargando datos desde localStorage
 */
export function inicializarStorage() {
  Object.keys(DATA).forEach(key => {
    const storageKey = STORAGE_KEYS[key.toUpperCase()];
    DATA[key] = JSON.parse(localStorage.getItem(storageKey) || '[]');
  });
}

/**
 * Guarda todos los datos en localStorage
 */
export function guardarTodos() {
  Object.keys(DATA).forEach(key => {
    const storageKey = STORAGE_KEYS[key.toUpperCase()];
    localStorage.setItem(storageKey, JSON.stringify(DATA[key]));
  });
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

// === AGENDA ===

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
