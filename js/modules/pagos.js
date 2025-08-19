/**
 * Módulo de gestión de pagos
 * Maneja todas las operaciones relacionadas con pagos de ventas
 * Server-based architecture - Sin modo offline
 */

import { generarId, formatearPrecio, formatearFecha, fechaActualInput, mostrarNotificacion } from '../utils.js';
import { ventasAPI, fichasAPI, pagosAPI } from '../api-client.js';

let ventaSeleccionadaPago = null;

/**
 * Inicializa el módulo de pagos
 */
export async function inicializarPagos() {
  await cargarVentasPendientes();
  cargarMetodosPago();
  configurarEventosPagos();
  await renderHistorialPagos();
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
async function cargarVentasPendientes() {
  const select = document.getElementById('ventaPago');
  if (!select) return;
  
  try {
    const ventasPendientes = await ventasAPI.search('estado:pendiente');
    
    select.innerHTML = '<option value="">-- Seleccionar venta --</option>';
    
    for (const venta of ventasPendientes) {
      const paciente = await fichasAPI.getById(venta.ficha_id);
      const pendiente = venta.total_pagado - venta.precio_total;
      
      if (pendiente > 0) {
        const option = document.createElement('option');
        option.value = venta.id.toString();
        option.textContent = `${paciente?.nombres || 'Cliente'} - ${venta.tratamiento?.nombre || 'Tratamiento'} (${formatearPrecio(pendiente)} pendiente)`;
        select.appendChild(option);
      }
    }
    
    if (ventasPendientes.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'No hay ventas pendientes de pago';
      option.disabled = true;
      select.appendChild(option);
    }
  } catch (error) {
    console.error('Error cargando ventas pendientes:', error);
    mostrarNotificacion('Error cargando ventas pendientes', 'error');
  }
}

/**
 * Carga los métodos de pago en el select
 */
function cargarMetodosPago() {
  const select = document.getElementById('metodoPago');
  if (!select || select.children.length > 0) return;
  
  const METODOS_PAGO = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'tarjeta_debito', label: 'Tarjeta Débito' },
    { value: 'tarjeta_credito', label: 'Tarjeta Crédito' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'otro', label: 'Otro' }
  ];
  
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
async function seleccionarVentaPago() {
  const select = document.getElementById('ventaPago');
  const ventaId = parseInt(select.value);
  const detalleCard = document.getElementById('detallePagoCard');
  
  if (!ventaId) {
    detalleCard.classList.add('hidden');
    ventaSeleccionadaPago = null;
    return;
  }
  
  try {
    const venta = await ventasAPI.getById(ventaId);
    if (!venta) return;
    
    ventaSeleccionadaPago = venta;
    const paciente = await fichasAPI.getById(venta.ficha_id);
    const pendiente = venta.precio_total - venta.total_pagado;
    
    mostrarDetallePago(venta, paciente, pendiente);
    detalleCard.classList.remove('hidden');
  } catch (error) {
    console.error('Error seleccionando venta:', error);
    mostrarNotificacion('Error cargando datos de la venta', 'error');
  }
}

/**
 * Muestra el detalle de la venta seleccionada
 */
function mostrarDetallePago(venta, paciente, pendiente) {
  const detalleDiv = document.getElementById('detalleVentaPago');
  
  const porcentajePagado = ((venta.total_pagado / venta.precio_total) * 100).toFixed(1);
  
  detalleDiv.innerHTML = `
    <div class="item">
      <div class="item-header">
        <span class="item-title">${venta.tratamiento?.nombre || 'Tratamiento'}</span>
        <span class="status ${venta.estado === 'pagado' ? 'success' : 'pending'}">${venta.estado === 'pagado' ? 'Pagado' : 'Pendiente'}</span>
      </div>
      <div class="item-subtitle">
        <strong>Cliente:</strong> ${paciente?.nombres || 'N/A'} ${paciente?.apellidos || ''} (${paciente?.rut || 'N/A'})<br>
        <strong>Fecha venta:</strong> ${formatearFecha(venta.fecha_venta)}<br>
        <strong>Total venta:</strong> ${formatearPrecio(venta.precio_total)}<br>
        <strong>Ya pagado:</strong> ${formatearPrecio(venta.total_pagado)} (${porcentajePagado}%)<br>
        <strong>Pendiente:</strong> ${formatearPrecio(pendiente)}<br>
        ${venta.observaciones ? `<strong>Observaciones:</strong> ${venta.observaciones}<br>` : ''}
      </div>
    </div>
  `;
  
  // Configurar monto sugerido (pendiente completo)
  document.getElementById('montoPago').value = pendiente.toString();
  
  // Mostrar historial de pagos de esta venta
  mostrarHistorialPagosVenta(venta.id);
}

/**
 * Muestra el historial de pagos de una venta específica
 */
async function mostrarHistorialPagosVenta(ventaId) {
  // Crear o encontrar el contenedor del historial
  let historialContainer = document.getElementById('historialPagosVenta');
  
  if (!historialContainer) {
    historialContainer = document.createElement('div');
    historialContainer.id = 'historialPagosVenta';
    historialContainer.className = 'mt-2';
    document.getElementById('detalleVentaPago').appendChild(historialContainer);
  }
  
  try {
    const pagosVenta = await pagosAPI.search(`venta_id:${ventaId}`);
    
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
            <span class="item-subtitle">${formatearFecha(pago.fecha_pago)}</span>
          </div>
          <div class="item-subtitle">
            Método: ${pago.metodo_pago}<br>
            ${pago.observaciones ? `Obs: ${pago.observaciones}` : ''}
          </div>
        </div>
      `;
    });
    
    html += '</div></div>';
    historialContainer.innerHTML = html;
  } catch (error) {
    console.error('Error cargando historial de pagos:', error);
    historialContainer.innerHTML = '<p><strong>Historial de pagos:</strong> Error cargando datos</p>';
  }
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
    const pendiente = ventaSeleccionadaPago.precio_total - ventaSeleccionadaPago.total_pagado;
    if (monto > pendiente) {
      errores.push(`El monto no puede ser mayor al pendiente (${formatearPrecio(pendiente)})`);
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
export async function registrarPago() {
  const errores = validarPago();
  
  if (errores.length > 0) {
    mostrarNotificacion(`Errores en el pago:\n${errores.join('\n')}`, 'error');
    return false;
  }
  
  const monto = parseInt(document.getElementById('montoPago').value);
  const metodo = document.getElementById('metodoPago').value;
  const fecha = document.getElementById('fechaPago').value;
  const observaciones = document.getElementById('observacionesPago').value.trim();
  
  const pagoData = {
    venta_id: ventaSeleccionadaPago.id,
    monto,
    metodo_pago: metodo,
    fecha_pago: fecha,
    observaciones,
    fecha_registro: new Date().toISOString()
  };
  
  try {
    await pagosAPI.create(pagoData);
    
    // Actualizar el total pagado en la venta
    const nuevoTotalPagado = ventaSeleccionadaPago.total_pagado + monto;
    const nuevoEstado = nuevoTotalPagado >= ventaSeleccionadaPago.precio_total ? 'pagado' : 'pendiente';
    
    await ventasAPI.update(ventaSeleccionadaPago.id, {
      total_pagado: nuevoTotalPagado,
      estado: nuevoEstado
    });
    
    // Limpiar campos (mantener venta seleccionada)
    document.getElementById('montoPago').value = '';
    document.getElementById('observacionesPago').value = '';
    document.getElementById('fechaPago').value = fechaActualInput();
    
    // Actualizar vistas
    const pendiente = ventaSeleccionadaPago.precio_total - nuevoTotalPagado;
    const paciente = await fichasAPI.getById(ventaSeleccionadaPago.ficha_id);
    
    mostrarDetallePago(ventaSeleccionadaPago, paciente, pendiente);
    await cargarVentasPendientes();
    await renderHistorialPagos();
    
    const mensaje = pendiente <= 0 
      ? 'Pago registrado. ¡Venta completamente pagada!' 
      : `Pago registrado. Pendiente: ${formatearPrecio(pendiente)}`;
    
    mostrarNotificacion(mensaje, 'success');
    
    return true;
  } catch (error) {
    console.error('Error al registrar pago:', error);
    mostrarNotificacion(`Error al registrar pago: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Renderiza el historial completo de pagos
 */
async function renderHistorialPagos() {
  const lista = document.getElementById('listaPagos');
  if (!lista) return;
  
  try {
    const pagos = await pagosAPI.getAll();
    const pagosOrdenados = pagos.slice().reverse(); // Más recientes primero
    
    if (pagosOrdenados.length === 0) {
      lista.innerHTML = '<p>No hay pagos registrados</p>';
      return;
    }
    
    let html = '';
    
    for (const pago of pagosOrdenados) {
      const venta = await ventasAPI.getById(pago.venta_id);
      const paciente = await fichasAPI.getById(venta?.ficha_id);
      
      html += `
        <div class="item">
          <div class="item-header">
            <span class="item-title">${formatearPrecio(pago.monto)} - ${pago.metodo_pago}</span>
            <span class="item-subtitle">${formatearFecha(pago.fecha_pago)}</span>
          </div>
          <div class="item-subtitle">
            <strong>Cliente:</strong> ${paciente?.nombres || 'N/A'} ${paciente?.apellidos || ''}<br>
            <strong>Tratamiento:</strong> ${venta?.tratamiento?.nombre || 'N/A'}<br>
            <strong>Registrado:</strong> ${formatearFecha(pago.fecha_registro)}<br>
            ${pago.observaciones ? `<strong>Obs:</strong> ${pago.observaciones}` : ''}
          </div>
        </div>
      `;
    }
    
    lista.innerHTML = html;
  } catch (error) {
    console.error('Error renderizando historial de pagos:', error);
    lista.innerHTML = '<p>Error cargando historial de pagos</p>';
  }
}

/**
 * Obtiene un resumen de pagos por período
 */
export async function obtenerResumenPagos(fechaInicio, fechaFin) {
  try {
    const pagos = await pagosAPI.getAll();
    const pagosFiltrados = pagos.filter(pago => {
      const fechaPago = pago.fecha_pago;
      return fechaPago >= fechaInicio && fechaPago <= fechaFin;
    });
    
    const resumen = {
      totalPagos: pagosFiltrados.length,
      montoTotal: pagosFiltrados.reduce((sum, pago) => sum + pago.monto, 0),
      porMetodo: {}
    };
    
    // Agrupar por método de pago
    const METODOS_PAGO = ['efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'cheque', 'otro'];
    METODOS_PAGO.forEach(metodo => {
      const pagosPorMetodo = pagosFiltrados.filter(p => p.metodo_pago === metodo);
      resumen.porMetodo[metodo] = {
        cantidad: pagosPorMetodo.length,
        monto: pagosPorMetodo.reduce((sum, p) => sum + p.monto, 0)
      };
    });
    
    return resumen;
  } catch (error) {
    console.error('Error obteniendo resumen de pagos:', error);
    return null;
  }
}

/**
 * Exporta los pagos a formato CSV
 */
export async function exportarPagos(fechaInicio = null, fechaFin = null) {
  try {
    let pagos = await pagosAPI.getAll();
    
    if (fechaInicio && fechaFin) {
      pagos = pagos.filter(pago => {
        return pago.fecha_pago >= fechaInicio && pago.fecha_pago <= fechaFin;
      });
    }
    
    const datosCSV = [];
    
    for (const pago of pagos) {
      const venta = await ventasAPI.getById(pago.venta_id);
      const paciente = await fichasAPI.getById(venta?.ficha_id);
      
      datosCSV.push({
        fecha: pago.fecha_pago,
        cliente: `${paciente?.nombres || ''} ${paciente?.apellidos || ''}`.trim() || 'N/A',
        rut: paciente?.rut || 'N/A',
        tratamiento: venta?.tratamiento?.nombre || 'N/A',
        monto: pago.monto,
        metodo: pago.metodo_pago,
        observaciones: pago.observaciones || ''
      });
    }
    
    return datosCSV;
  } catch (error) {
    console.error('Error exportando pagos:', error);
    return [];
  }
}

/**
 * Obtiene la venta seleccionada para pago
 */
export function obtenerVentaSeleccionadaPago() {
  return ventaSeleccionadaPago;
}
