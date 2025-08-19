/**
 * Módulo de gestión de pagos
 * Maneja todas las operaciones relacionadas con pagos de ventas
 */

import { generarId, formatearPrecio, formatearFecha, fechaActualInput, mostrarNotificacion } from '../utils.js';
import { obtenerVentasPendientesPago, obtenerPacientePorId, obtenerVentaPorId, guardarPago, obtenerPagos, calcularEstadoPago } from '../storage-api.js';
import { METODOS_PAGO } from '../config.js';

let ventaSeleccionadaPago = null;

/**
 * Inicializa el módulo de pagos
 */
export function inicializarPagos() {
  cargarVentasPendientes();
  cargarMetodosPago();
  configurarEventosPagos();
  renderHistorialPagos();
}

/**
 * Configura los eventos del formulario de pagos
 */
function configurarEventosPagos() {
  const ventaSelect = document.getElementById('ventaPago');
  
  if (ventaSelect) {
    ventaSelect.addEventListener('change', seleccionarVentaPago);
  }
  
  // Configurar fecha por defecto
  const fechaInput = document.getElementById('fechaPago');
  if (fechaInput) {
    fechaInput.value = fechaActualInput();
  }
}

/**
 * Carga las ventas pendientes de pago
 */
function cargarVentasPendientes() {
  const select = document.getElementById('ventaPago');
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Seleccionar venta --</option>';
  
  const ventasPendientes = obtenerVentasPendientesPago();
  
  ventasPendientes.forEach(venta => {
    const paciente = obtenerPacientePorId(venta.clienteId);
    const estadoPago = calcularEstadoPago(venta.id);
    
    if (estadoPago.pendiente > 0) {
      const option = document.createElement('option');
      option.value = venta.id.toString();
      option.textContent = `${paciente?.nombre || 'Cliente'} - ${venta.tratamiento} (${formatearPrecio(estadoPago.pendiente)} pendiente)`;
      select.appendChild(option);
    }
  });
  
  if (ventasPendientes.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No hay ventas pendientes de pago';
    option.disabled = true;
    select.appendChild(option);
  }
}

/**
 * Carga los métodos de pago en el select
 */
function cargarMetodosPago() {
  const select = document.getElementById('metodoPago');
  if (!select || select.children.length > 0) return;
  
  METODOS_PAGO.forEach(metodo => {
    const option = document.createElement('option');
    option.value = metodo.value;
    option.textContent = metodo.label;
    select.appendChild(option);
  });
}

/**
 * Selecciona una venta para registrar pago
 */
function seleccionarVentaPago() {
  const select = document.getElementById('ventaPago');
  const ventaId = parseInt(select.value);
  const detalleCard = document.getElementById('detallePagoCard');
  
  if (!ventaId) {
    detalleCard.classList.add('hidden');
    ventaSeleccionadaPago = null;
    return;
  }
  
  const venta = obtenerVentaPorId(ventaId);
  if (!venta) return;
  
  ventaSeleccionadaPago = venta;
  const paciente = obtenerPacientePorId(venta.clienteId);
  const estadoPago = calcularEstadoPago(ventaId);
  
  mostrarDetallePago(venta, paciente, estadoPago);
  detalleCard.classList.remove('hidden');
}

/**
 * Muestra el detalle de la venta seleccionada
 */
function mostrarDetallePago(venta, paciente, estadoPago) {
  const detalleDiv = document.getElementById('detalleVentaPago');
  
  const porcentajePagado = ((estadoPago.pagado / venta.precioFinal) * 100).toFixed(1);
  
  detalleDiv.innerHTML = `
    <div class="item">
      <div class="item-header">
        <span class="item-title">${venta.tratamiento}</span>
        <span class="status ${estadoPago.clase}">${estadoPago.texto}</span>
      </div>
      <div class="item-subtitle">
        <strong>Cliente:</strong> ${paciente?.nombre || 'N/A'} (${paciente?.rut || 'N/A'})<br>
        <strong>Fecha venta:</strong> ${formatearFecha(venta.fecha)}<br>
        <strong>Total venta:</strong> ${formatearPrecio(venta.precioFinal)}<br>
        <strong>Ya pagado:</strong> ${formatearPrecio(estadoPago.pagado)} (${porcentajePagado}%)<br>
        <strong>Pendiente:</strong> ${formatearPrecio(estadoPago.pendiente)}<br>
        ${venta.observaciones ? `<strong>Observaciones:</strong> ${venta.observaciones}<br>` : ''}
      </div>
    </div>
  `;
  
  // Configurar monto sugerido (pendiente completo)
  document.getElementById('montoPago').value = estadoPago.pendiente.toString();
  
  // Mostrar historial de pagos de esta venta
  mostrarHistorialPagosVenta(venta.id);
}

/**
 * Muestra el historial de pagos de una venta específica
 */
function mostrarHistorialPagosVenta(ventaId) {
  // Crear o encontrar el contenedor del historial
  let historialContainer = document.getElementById('historialPagosVenta');
  
  if (!historialContainer) {
    historialContainer = document.createElement('div');
    historialContainer.id = 'historialPagosVenta';
    historialContainer.className = 'mt-2';
    document.getElementById('detalleVentaPago').appendChild(historialContainer);
  }
  
  const pagosVenta = obtenerPagos().filter(p => p.ventaId === ventaId);
  
  if (pagosVenta.length === 0) {
    historialContainer.innerHTML = '<p><strong>Historial de pagos:</strong> Sin pagos registrados</p>';
    return;
  }
  
  let html = '<div class="mt-2"><strong>Historial de pagos:</strong><div class="item-list" style="max-height: 200px;">';
  
  pagosVenta.forEach(pago => {
    html += `
      <div class="item" style="margin-bottom: 0.5rem; padding: 0.5rem;">
        <div class="item-header">
          <span class="item-title">${formatearPrecio(pago.monto)}</span>
          <span class="item-subtitle">${formatearFecha(pago.fecha)}</span>
        </div>
        <div class="item-subtitle">
          Método: ${pago.metodo}<br>
          ${pago.observaciones ? `Obs: ${pago.observaciones}` : ''}
        </div>
      </div>
    `;
  });
  
  html += '</div></div>';
  historialContainer.innerHTML = html;
}

/**
 * Valida los datos del pago
 */
function validarPago() {
  const errores = [];
  
  if (!ventaSeleccionadaPago) {
    errores.push('Debe seleccionar una venta');
  }
  
  const monto = parseInt(document.getElementById('montoPago').value);
  if (!monto || monto <= 0) {
    errores.push('El monto debe ser mayor a 0');
  }
  
  if (ventaSeleccionadaPago) {
    const estadoPago = calcularEstadoPago(ventaSeleccionadaPago.id);
    if (monto > estadoPago.pendiente) {
      errores.push(`El monto no puede ser mayor al pendiente (${formatearPrecio(estadoPago.pendiente)})`);
    }
  }
  
  const fecha = document.getElementById('fechaPago').value;
  if (!fecha) {
    errores.push('Debe seleccionar una fecha');
  }
  
  const metodo = document.getElementById('metodoPago').value;
  if (!metodo) {
    errores.push('Debe seleccionar un método de pago');
  }
  
  return errores;
}

/**
 * Registra un nuevo pago
 */
export function registrarPago() {
  const errores = validarPago();
  
  if (errores.length > 0) {
    mostrarNotificacion(`Errores en el pago:\n${errores.join('\n')}`, 'error');
    return false;
  }
  
  const monto = parseInt(document.getElementById('montoPago').value);
  const metodo = document.getElementById('metodoPago').value;
  const fecha = document.getElementById('fechaPago').value;
  const observaciones = document.getElementById('observacionesPago').value.trim();
  
  const pago = {
    id: generarId(),
    ventaId: ventaSeleccionadaPago.id,
    monto,
    metodo,
    fecha,
    observaciones,
    fechaRegistro: new Date().toISOString()
  };
  
  try {
    guardarPago(pago);
    
    // Limpiar campos (mantener venta seleccionada)
    document.getElementById('montoPago').value = '';
    document.getElementById('observacionesPago').value = '';
    document.getElementById('fechaPago').value = fechaActualInput();
    
    // Actualizar vistas
    const estadoPago = calcularEstadoPago(ventaSeleccionadaPago.id);
    const paciente = obtenerPacientePorId(ventaSeleccionadaPago.clienteId);
    
    mostrarDetallePago(ventaSeleccionadaPago, paciente, estadoPago);
    cargarVentasPendientes();
    renderHistorialPagos();
    
    const mensaje = estadoPago.pendiente === 0 
      ? 'Pago registrado. ¡Venta completamente pagada!' 
      : `Pago registrado. Pendiente: ${formatearPrecio(estadoPago.pendiente)}`;
    
    mostrarNotificacion(mensaje, 'success');
    
    return true;
  } catch (error) {
    mostrarNotificacion(`Error al registrar pago: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Renderiza el historial completo de pagos
 */
function renderHistorialPagos() {
  const lista = document.getElementById('listaPagos');
  if (!lista) return;
  
  const pagos = obtenerPagos().slice().reverse(); // Más recientes primero
  
  if (pagos.length === 0) {
    lista.innerHTML = '<p>No hay pagos registrados</p>';
    return;
  }
  
  let html = '';
  
  pagos.forEach(pago => {
    const venta = obtenerVentaPorId(pago.ventaId);
    const paciente = obtenerPacientePorId(venta?.clienteId);
    
    html += `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${formatearPrecio(pago.monto)} - ${pago.metodo}</span>
          <span class="item-subtitle">${formatearFecha(pago.fecha)}</span>
        </div>
        <div class="item-subtitle">
          <strong>Cliente:</strong> ${paciente?.nombre || 'N/A'}<br>
          <strong>Tratamiento:</strong> ${venta?.tratamiento || 'N/A'}<br>
          <strong>Registrado:</strong> ${formatearFecha(pago.fechaRegistro)}<br>
          ${pago.observaciones ? `<strong>Obs:</strong> ${pago.observaciones}` : ''}
        </div>
      </div>
    `;
  });
  
  lista.innerHTML = html;
}

/**
 * Obtiene un resumen de pagos por período
 */
export function obtenerResumenPagos(fechaInicio, fechaFin) {
  const pagos = obtenerPagos().filter(pago => {
    const fechaPago = pago.fecha;
    return fechaPago >= fechaInicio && fechaPago <= fechaFin;
  });
  
  const resumen = {
    totalPagos: pagos.length,
    montoTotal: pagos.reduce((sum, pago) => sum + pago.monto, 0),
    porMetodo: {}
  };
  
  // Agrupar por método de pago
  METODOS_PAGO.forEach(metodo => {
    const pagosPorMetodo = pagos.filter(p => p.metodo === metodo.value);
    resumen.porMetodo[metodo.value] = {
      cantidad: pagosPorMetodo.length,
      monto: pagosPorMetodo.reduce((sum, p) => sum + p.monto, 0)
    };
  });
  
  return resumen;
}

/**
 * Exporta los pagos a formato CSV
 */
export function exportarPagos(fechaInicio = null, fechaFin = null) {
  let pagos = obtenerPagos();
  
  if (fechaInicio && fechaFin) {
    pagos = pagos.filter(pago => {
      return pago.fecha >= fechaInicio && pago.fecha <= fechaFin;
    });
  }
  
  const datosCSV = pagos.map(pago => {
    const venta = obtenerVentaPorId(pago.ventaId);
    const paciente = obtenerPacientePorId(venta?.clienteId);
    
    return {
      fecha: pago.fecha,
      cliente: paciente?.nombre || 'N/A',
      rut: paciente?.rut || 'N/A',
      tratamiento: venta?.tratamiento || 'N/A',
      monto: pago.monto,
      metodo: pago.metodo,
      observaciones: pago.observaciones || ''
    };
  });
  
  return datosCSV;
}

/**
 * Obtiene la venta seleccionada para pago
 */
export function obtenerVentaSeleccionadaPago() {
  return ventaSeleccionadaPago;
}
