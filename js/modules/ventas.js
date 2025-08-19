/**
 * Módulo de gestión de ventas
 * Maneja todas las operaciones relacionadas con ventas de tratamientos
 */

import { generarId, formatearPrecio, formatearFecha, mostrarNotificacion } from '../utils.js';
import { obtenerVentasPorCliente, guardarVenta, obtenerPacientePorId, calcularEstadoPago } from '../storage-api.js';
import { TRATAMIENTOS_CONFIG } from '../config.js';

let ventaActual = null;
let clienteSeleccionado = null;

/**
 * Inicializa el módulo de ventas
 */
export function inicializarVentas() {
  cargarTratamientosSelect();
  configurarEventosVentas();
}

/**
 * Configura los eventos del formulario de ventas
 */
function configurarEventosVentas() {
  const clienteSelect = document.getElementById('clienteVenta');
  const tratamientoSelect = document.getElementById('tratamientoVenta');
  const packSelect = document.getElementById('packVenta');
  const sesionesInput = document.getElementById('sesionesVenta');
  const ofertaInput = document.getElementById('ofertaVenta');
  
  if (clienteSelect) {
    clienteSelect.addEventListener('change', seleccionarCliente);
  }
  
  if (tratamientoSelect) {
    tratamientoSelect.addEventListener('change', () => {
      mostrarPacks();
      calcularPrecioVenta();
    });
  }
  
  if (packSelect) {
    packSelect.addEventListener('change', calcularPrecioVenta);
  }
  
  if (sesionesInput) {
    sesionesInput.addEventListener('input', calcularPrecioVenta);
  }
  
  if (ofertaInput) {
    ofertaInput.addEventListener('input', calcularPrecioVenta);
  }
}

/**
 * Carga los tratamientos en el select
 */
function cargarTratamientosSelect() {
  const select = document.getElementById('tratamientoVenta');
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Seleccionar tratamiento --</option>';
  
  Object.entries(TRATAMIENTOS_CONFIG).forEach(([key, tratamiento]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${tratamiento.nombre} - ${formatearPrecio(tratamiento.precioSesion)}/sesión`;
    select.appendChild(option);
  });
}

/**
 * Selecciona un cliente para la venta
 */
function seleccionarCliente() {
  const select = document.getElementById('clienteVenta');
  const clienteId = parseInt(select.value);
  
  if (!clienteId) {
    clienteSeleccionado = null;
    limpiarHistorialCliente();
    return;
  }
  
  clienteSeleccionado = obtenerPacientePorId(clienteId);
  if (clienteSeleccionado) {
    cargarHistorialCliente();
  }
}

/**
 * Carga el historial de compras del cliente seleccionado
 */
function cargarHistorialCliente() {
  const historialDiv = document.getElementById('historialCliente');
  
  if (!clienteSeleccionado) {
    limpiarHistorialCliente();
    return;
  }
  
  const ventasCliente = obtenerVentasPorCliente(clienteSeleccionado.id);
  
  if (ventasCliente.length === 0) {
    historialDiv.innerHTML = '<p>Este cliente no tiene compras anteriores</p>';
    return;
  }
  
  let html = '<h4>Historial de Compras:</h4>';
  
  ventasCliente.slice().reverse().forEach(venta => {
    const estadoPago = calcularEstadoPago(venta.id);
    const progreso = venta.sesionesTotales - venta.sesionesRestantes;
    
    html += `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${venta.tratamiento}</span>
          <span class="status ${estadoPago.clase}">${estadoPago.texto}</span>
        </div>
        <div class="item-subtitle">
          ${formatearFecha(venta.fecha)} - ${formatearPrecio(venta.precioFinal)}<br>
          Sesiones: ${progreso}/${venta.sesionesTotales} completadas<br>
          ${venta.observaciones ? `Obs: ${venta.observaciones}` : ''}
        </div>
      </div>
    `;
  });
  
  historialDiv.innerHTML = html;
}

/**
 * Limpia el historial del cliente
 */
function limpiarHistorialCliente() {
  const historialDiv = document.getElementById('historialCliente');
  if (historialDiv) {
    historialDiv.innerHTML = 'Selecciona un cliente para ver su historial';
  }
}

/**
 * Muestra los packs disponibles para el tratamiento seleccionado
 */
function mostrarPacks() {
  const tratamientoKey = document.getElementById('tratamientoVenta').value;
  const packDiv = document.getElementById('packsDiv');
  const packSelect = document.getElementById('packVenta');
  
  if (!tratamientoKey) {
    packDiv.classList.add('hidden');
    return;
  }
  
  const tratamiento = TRATAMIENTOS_CONFIG[tratamientoKey];
  packSelect.innerHTML = '<option value="">-- Modalidad por sesiones --</option>';
  
  if (tratamiento.packs && tratamiento.packs.length > 0) {
    packDiv.classList.remove('hidden');
    
    tratamiento.packs.forEach((pack, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      
      const precioMostrar = pack.oferta || pack.precio;
      const textoOferta = pack.oferta ? ` (¡Oferta: ${formatearPrecio(pack.oferta)}!)` : '';
      
      option.textContent = `${pack.nombre} - ${formatearPrecio(pack.precio)}${textoOferta}`;
      
      if (pack.oferta) {
        option.style.color = '#e74c3c';
        option.style.fontWeight = 'bold';
      }
      
      packSelect.appendChild(option);
    });
  } else {
    packDiv.classList.add('hidden');
  }
}

/**
 * Calcula el precio de la venta actual
 */
function calcularPrecioVenta() {
  const tratamientoKey = document.getElementById('tratamientoVenta').value;
  const sesiones = parseInt(document.getElementById('sesionesVenta').value) || 1;
  const ofertaVenta = parseInt(document.getElementById('ofertaVenta').value) || 0;
  const packIndex = document.getElementById('packVenta').value;
  
  const resultadoDiv = document.getElementById('resultadoVenta');
  const precioDiv = document.getElementById('precioFinal');
  const detalleDiv = document.getElementById('detalleVenta');
  
  if (!tratamientoKey) {
    resultadoDiv.classList.add('hidden');
    ventaActual = null;
    return;
  }
  
  const tratamiento = TRATAMIENTOS_CONFIG[tratamientoKey];
  let precio = 0;
  let detalle = '';
  let esPack = false;
  let sesionesTotales = sesiones;
  
  if (packIndex !== '') {
    // Modalidad pack
    const pack = tratamiento.packs[parseInt(packIndex)];
    precio = pack.oferta || pack.precio;
    detalle = `Pack: ${pack.nombre}`;
    esPack = true;
    
    // Extraer número de sesiones del nombre del pack
    const matchSesiones = pack.nombre.match(/(\d+)\s*sesion/i);
    if (matchSesiones) {
      sesionesTotales = parseInt(matchSesiones[1]);
    }
    
    if (pack.oferta) {
      const descuentoPack = ((pack.precio - pack.oferta) / pack.precio * 100).toFixed(0);
      detalle += `<br>Ahorro: ${formatearPrecio(pack.precio - pack.oferta)} (${descuentoPack}% desc.)`;
    }
  } else {
    // Modalidad sesión
    const precioUnitario = tratamiento.precioSesionOferta || tratamiento.precioSesion;
    precio = sesiones * precioUnitario;
    
    if (tratamiento.precioSesionOferta && sesiones === 1) {
      detalle = `1 sesión de ${tratamiento.nombre} (precio oferta)`;
      const ahorroSesion = tratamiento.precioSesion - tratamiento.precioSesionOferta;
      detalle += `<br>Ahorro: ${formatearPrecio(ahorroSesion)}`;
    } else {
      detalle = `${sesiones} sesión${sesiones > 1 ? 'es' : ''} de ${tratamiento.nombre}`;
      if (tratamiento.precioSesionOferta) {
        detalle += ` (precio normal)`;
      }
    }
  }
  
  const precioSinOfertaVenta = precio;
  
  // Aplicar oferta adicional de venta
  if (ofertaVenta > 0) {
    const descuento = precio * (ofertaVenta / 100);
    precio -= descuento;
    detalle += `<br>Descuento adicional: ${ofertaVenta}% (-${formatearPrecio(descuento)})`;
  }
  
  // Guardar datos de la venta actual para confirmar después
  ventaActual = {
    clienteId: clienteSeleccionado?.id,
    tratamientoKey,
    tratamientoNombre: tratamiento.nombre,
    sesionesTotales,
    sesionesRestantes: sesionesTotales,
    precioFinal: precio,
    precioSinOferta: precioSinOfertaVenta,
    esPack,
    packIndex: packIndex !== '' ? parseInt(packIndex) : null,
    ofertaVentaAplicada: ofertaVenta,
    detalle,
    duracionSesion: tratamiento.duracionSesion,
    frecuenciaSugerida: tratamiento.frecuenciaSugerida
  };
  
  precioDiv.textContent = formatearPrecio(precio);
  detalleDiv.innerHTML = detalle;
  resultadoDiv.classList.remove('hidden');
  
  return ventaActual;
}

/**
 * Valida los datos de la venta
 */
function validarVenta() {
  const errores = [];
  
  if (!clienteSeleccionado) {
    errores.push('Debe seleccionar un cliente');
  }
  
  if (!ventaActual) {
    errores.push('Debe configurar los detalles de la venta');
  }
  
  const sesiones = parseInt(document.getElementById('sesionesVenta').value);
  if (sesiones < 1 || sesiones > 50) {
    errores.push('La cantidad de sesiones debe estar entre 1 y 50');
  }
  
  const oferta = parseInt(document.getElementById('ofertaVenta').value);
  if (oferta < 0 || oferta > 100) {
    errores.push('El descuento debe estar entre 0% y 100%');
  }
  
  return errores;
}

/**
 * Confirma y guarda la venta
 */
export function confirmarVenta() {
  const errores = validarVenta();
  
  if (errores.length > 0) {
    mostrarNotificacion(`Errores en la venta:\n${errores.join('\n')}`, 'error');
    return false;
  }
  
  const observaciones = document.getElementById('observacionesVenta').value.trim();
  
  const venta = {
    id: generarId(),
    clienteId: ventaActual.clienteId,
    tratamiento: ventaActual.tratamientoNombre,
    tratamientoKey: ventaActual.tratamientoKey,
    detalle: ventaActual.detalle,
    sesionesTotales: ventaActual.sesionesTotales,
    sesionesRestantes: ventaActual.sesionesRestantes,
    precioFinal: ventaActual.precioFinal,
    esPack: ventaActual.esPack,
    packIndex: ventaActual.packIndex,
    ofertaAplicada: ventaActual.ofertaVentaAplicada,
    observaciones,
    fecha: new Date().toISOString(),
    estado: 'pendiente',
    duracionSesion: ventaActual.duracionSesion,
    frecuenciaSugerida: ventaActual.frecuenciaSugerida
  };
  
  try {
    guardarVenta(venta);
    
    // Limpiar formulario
    limpiarFormularioVenta();
    
    // Actualizar historial
    if (clienteSeleccionado) {
      cargarHistorialCliente();
    }
    
    mostrarNotificacion('Venta registrada exitosamente', 'success');
    
    // Preguntar si quiere ir a gestión de pagos
    if (confirm('Venta creada exitosamente. ¿Desea registrar un pago ahora?')) {
      // Aquí podrías cambiar a la vista de pagos
      window.showView('pagos');
    }
    
    return true;
  } catch (error) {
    mostrarNotificacion(`Error al registrar venta: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Limpia el formulario de venta
 */
function limpiarFormularioVenta() {
  document.getElementById('tratamientoVenta').value = '';
  document.getElementById('sesionesVenta').value = '1';
  document.getElementById('ofertaVenta').value = '0';
  document.getElementById('observacionesVenta').value = '';
  
  document.getElementById('packsDiv').classList.add('hidden');
  document.getElementById('resultadoVenta').classList.add('hidden');
  
  ventaActual = null;
}

/**
 * Obtiene la venta actual en preparación
 */
export function obtenerVentaActual() {
  return ventaActual;
}

/**
 * Obtiene el cliente seleccionado
 */
export function obtenerClienteSeleccionado() {
  return clienteSeleccionado;
}

/**
 * Calcula el precio de un tratamiento específico
 */
export function calcularPrecioTratamiento(tratamientoKey, sesiones = 1, packIndex = null, ofertaDescuento = 0) {
  const tratamiento = TRATAMIENTOS_CONFIG[tratamientoKey];
  if (!tratamiento) return null;
  
  let precio = 0;
  let sesionesTotales = sesiones;
  
  if (packIndex !== null && tratamiento.packs[packIndex]) {
    const pack = tratamiento.packs[packIndex];
    precio = pack.oferta || pack.precio;
    
    // Extraer sesiones del pack
    const matchSesiones = pack.nombre.match(/(\d+)\s*sesion/i);
    if (matchSesiones) {
      sesionesTotales = parseInt(matchSesiones[1]);
    }
  } else {
    precio = sesiones * (tratamiento.precioSesionOferta || tratamiento.precioSesion);
  }
  
  // Aplicar descuento adicional
  if (ofertaDescuento > 0) {
    precio -= precio * (ofertaDescuento / 100);
  }
  
  return {
    precio,
    sesionesTotales,
    tratamiento: tratamiento.nombre
  };
}
