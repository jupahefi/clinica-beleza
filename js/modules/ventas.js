/**
 * Módulo de gestión de ventas
 * Maneja todas las operaciones relacionadas con ventas de tratamientos
 * Server-based architecture - Sin modo offline
 */

import { generarId, formatearPrecio, formatearFecha, mostrarNotificacion } from '../utils.js';
import { ventasAPI, fichasAPI, tratamientosAPI, packsAPI, ofertasAPI } from '../api-client.js';

let ventaActual = null;
let clienteSeleccionado = null;

/**
 * Inicializa el módulo de ventas
 */
export async function inicializarVentas() {
  await cargarTratamientosSelect();
  await cargarPacksSelect();
  await cargarOfertasSelect();
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
async function cargarTratamientosSelect() {
  const select = document.getElementById('tratamientoVenta');
  if (!select) return;
  
  try {
    const tratamientos = await tratamientosAPI.getAll();
    
    select.innerHTML = '<option value="">-- Seleccionar tratamiento --</option>';
    
    tratamientos.forEach(tratamiento => {
      const option = document.createElement('option');
      option.value = tratamiento.id;
      option.textContent = `${tratamiento.nombre} - ${formatearPrecio(tratamiento.precio_sesion)}/sesión`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando tratamientos:', error);
    mostrarNotificacion('Error cargando tratamientos', 'error');
  }
}

/**
 * Carga los packs en el select
 */
async function cargarPacksSelect() {
  const select = document.getElementById('packVenta');
  if (!select) return;
  
  try {
    const packs = await packsAPI.getAll();
    
    select.innerHTML = '<option value="">-- Modalidad por sesiones --</option>';
    
    packs.forEach(pack => {
      const option = document.createElement('option');
      option.value = pack.id;
      
      const precioMostrar = pack.precio_oferta || pack.precio;
      const textoOferta = pack.precio_oferta ? ` (¡Oferta: ${formatearPrecio(pack.precio_oferta)}!)` : '';
      
      option.textContent = `${pack.nombre} - ${formatearPrecio(pack.precio)}${textoOferta}`;
      
      if (pack.precio_oferta) {
        option.style.color = '#e74c3c';
        option.style.fontWeight = 'bold';
      }
      
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando packs:', error);
    mostrarNotificacion('Error cargando packs', 'error');
  }
}

/**
 * Carga las ofertas en el select
 */
async function cargarOfertasSelect() {
  const select = document.getElementById('ofertaVenta');
  if (!select) return;
  
  try {
    const ofertas = await ofertasAPI.getAll();
    
    select.innerHTML = '<option value="">-- Sin oferta --</option>';
    
    ofertas.forEach(oferta => {
      const option = document.createElement('option');
      option.value = oferta.id;
      option.textContent = `${oferta.nombre} (${oferta.porcentaje_descuento}% desc.)`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando ofertas:', error);
    mostrarNotificacion('Error cargando ofertas', 'error');
  }
}

/**
 * Selecciona un cliente para la venta
 */
async function seleccionarCliente() {
  const select = document.getElementById('clienteVenta');
  const clienteId = parseInt(select.value);
  
  if (!clienteId) {
    clienteSeleccionado = null;
    limpiarHistorialCliente();
    return;
  }
  
  try {
    clienteSeleccionado = await fichasAPI.getById(clienteId);
    if (clienteSeleccionado) {
      await cargarHistorialCliente();
    }
  } catch (error) {
    console.error('Error seleccionando cliente:', error);
    mostrarNotificacion('Error cargando datos del cliente', 'error');
  }
}

/**
 * Carga el historial de compras del cliente seleccionado
 */
async function cargarHistorialCliente() {
  const historialDiv = document.getElementById('historialCliente');
  
  if (!clienteSeleccionado) {
    limpiarHistorialCliente();
    return;
  }
  
  try {
    const ventasCliente = await ventasAPI.search(`ficha_id:${clienteSeleccionado.id}`);
    
    if (ventasCliente.length === 0) {
      historialDiv.innerHTML = '<p>Este cliente no tiene compras anteriores</p>';
      return;
    }
    
    let html = '<h4>Historial de Compras:</h4>';
    
    ventasCliente.slice().reverse().forEach(venta => {
      const progreso = venta.cantidad_sesiones - venta.sesiones_restantes;
      
      html += `
        <div class="item">
          <div class="item-header">
            <span class="item-title">${venta.tratamiento?.nombre || 'Tratamiento'}</span>
            <span class="status ${venta.estado === 'pagado' ? 'success' : 'pending'}">${venta.estado === 'pagado' ? 'Pagado' : 'Pendiente'}</span>
          </div>
          <div class="item-subtitle">
            ${formatearFecha(venta.fecha_venta)} - ${formatearPrecio(venta.total_pagado)}<br>
            Sesiones: ${progreso}/${venta.cantidad_sesiones} completadas<br>
            ${venta.observaciones ? `Obs: ${venta.observaciones}` : ''}
          </div>
        </div>
      `;
    });
    
    historialDiv.innerHTML = html;
  } catch (error) {
    console.error('Error cargando historial:', error);
    historialDiv.innerHTML = '<p>Error cargando historial de compras</p>';
  }
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
async function mostrarPacks() {
  const tratamientoId = document.getElementById('tratamientoVenta').value;
  const packDiv = document.getElementById('packsDiv');
  const packSelect = document.getElementById('packVenta');
  
  if (!tratamientoId) {
    packDiv.classList.add('hidden');
    return;
  }
  
  try {
    const packs = await packsAPI.search(`tratamiento_id:${tratamientoId}`);
    
    if (packs.length > 0) {
      packDiv.classList.remove('hidden');
      packSelect.innerHTML = '<option value="">-- Modalidad por sesiones --</option>';
      
      packs.forEach(pack => {
        const option = document.createElement('option');
        option.value = pack.id;
        
        const precioMostrar = pack.precio_oferta || pack.precio;
        const textoOferta = pack.precio_oferta ? ` (¡Oferta: ${formatearPrecio(pack.precio_oferta)}!)` : '';
        
        option.textContent = `${pack.nombre} - ${formatearPrecio(pack.precio)}${textoOferta}`;
        
        if (pack.precio_oferta) {
          option.style.color = '#e74c3c';
          option.style.fontWeight = 'bold';
        }
        
        packSelect.appendChild(option);
      });
    } else {
      packDiv.classList.add('hidden');
    }
  } catch (error) {
    console.error('Error cargando packs del tratamiento:', error);
    packDiv.classList.add('hidden');
  }
}

/**
 * Calcula el precio de la venta actual
 */
async function calcularPrecioVenta() {
  const tratamientoId = document.getElementById('tratamientoVenta').value;
  const sesiones = parseInt(document.getElementById('sesionesVenta').value) || 1;
  const ofertaId = document.getElementById('ofertaVenta').value;
  const packId = document.getElementById('packVenta').value;
  
  const resultadoDiv = document.getElementById('resultadoVenta');
  const precioDiv = document.getElementById('precioFinal');
  const detalleDiv = document.getElementById('detalleVenta');
  
  if (!tratamientoId) {
    resultadoDiv.classList.add('hidden');
    ventaActual = null;
    return;
  }
  
  try {
    const tratamiento = await tratamientosAPI.getById(tratamientoId);
    let precio = 0;
    let detalle = '';
    let esPack = false;
    let sesionesTotales = sesiones;
    let packSeleccionado = null;
    let ofertaSeleccionada = null;
    
    if (packId) {
      // Modalidad pack
      packSeleccionado = await packsAPI.getById(packId);
      precio = packSeleccionado.precio_oferta || packSeleccionado.precio;
      detalle = `Pack: ${packSeleccionado.nombre}`;
      esPack = true;
      sesionesTotales = packSeleccionado.cantidad_sesiones;
      
      if (packSeleccionado.precio_oferta) {
        const descuentoPack = ((packSeleccionado.precio - packSeleccionado.precio_oferta) / packSeleccionado.precio * 100).toFixed(0);
        detalle += `<br>Ahorro: ${formatearPrecio(packSeleccionado.precio - packSeleccionado.precio_oferta)} (${descuentoPack}% desc.)`;
      }
    } else {
      // Modalidad sesión
      const precioUnitario = tratamiento.precio_oferta || tratamiento.precio_sesion;
      precio = sesiones * precioUnitario;
      
      if (tratamiento.precio_oferta && sesiones === 1) {
        detalle = `1 sesión de ${tratamiento.nombre} (precio oferta)`;
        const ahorroSesion = tratamiento.precio_sesion - tratamiento.precio_oferta;
        detalle += `<br>Ahorro: ${formatearPrecio(ahorroSesion)}`;
      } else {
        detalle = `${sesiones} sesión${sesiones > 1 ? 'es' : ''} de ${tratamiento.nombre}`;
        if (tratamiento.precio_oferta) {
          detalle += ` (precio normal)`;
        }
      }
    }
    
    const precioSinOfertaVenta = precio;
    
    // Aplicar oferta adicional de venta
    if (ofertaId) {
      ofertaSeleccionada = await ofertasAPI.getById(ofertaId);
      const descuento = precio * (ofertaSeleccionada.porcentaje_descuento / 100);
      precio -= descuento;
      detalle += `<br>Descuento adicional: ${ofertaSeleccionada.nombre} (${ofertaSeleccionada.porcentaje_descuento}% - ${formatearPrecio(descuento)})`;
    }
    
    // Guardar datos de la venta actual para confirmar después
    ventaActual = {
      fichaId: clienteSeleccionado?.id,
      tratamientoId,
      tratamientoNombre: tratamiento.nombre,
      packId: packId || null,
      packNombre: packSeleccionado?.nombre,
      ofertaId: ofertaId || null,
      ofertaNombre: ofertaSeleccionada?.nombre,
      cantidadSesiones: sesionesTotales,
      sesionesRestantes: sesionesTotales,
      precioFinal: precio,
      precioSinOferta: precioSinOfertaVenta,
      esPack,
      detalle,
      duracionSesion: tratamiento.duracion_sesion,
      frecuenciaSugerida: tratamiento.frecuencia_sugerida
    };
    
    precioDiv.textContent = formatearPrecio(precio);
    detalleDiv.innerHTML = detalle;
    resultadoDiv.classList.remove('hidden');
    
    return ventaActual;
  } catch (error) {
    console.error('Error calculando precio:', error);
    mostrarNotificacion('Error calculando precio de venta', 'error');
    return null;
  }
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
  
  return errores;
}

/**
 * Confirma y guarda la venta
 */
export async function confirmarVenta() {
  const errores = validarVenta();
  
  if (errores.length > 0) {
    mostrarNotificacion(`Errores en la venta:\n${errores.join('\n')}`, 'error');
    return false;
  }
  
  const observaciones = document.getElementById('observacionesVenta').value.trim();
  
  const ventaData = {
    ficha_id: ventaActual.fichaId,
    tratamiento_id: ventaActual.tratamientoId,
    pack_id: ventaActual.packId,
    cantidad_sesiones: ventaActual.cantidadSesiones,
    sesiones_restantes: ventaActual.sesionesRestantes,
    precio_unitario: ventaActual.precioSinOferta / ventaActual.cantidadSesiones,
    precio_total: ventaActual.precioSinOferta,
    descuento_manual_pct: 0, // Se puede agregar campo en el formulario
    descuento_aplicado_total: ventaActual.precioSinOferta - ventaActual.precioFinal,
    total_pagado: ventaActual.precioFinal,
    observaciones,
    fecha_venta: new Date().toISOString(),
    estado: 'pendiente'
  };
  
  try {
    const ventaGuardada = await ventasAPI.create(ventaData);
    
    // Si hay oferta aplicada, guardar en venta_oferta
    if (ventaActual.ofertaId) {
      const ofertaData = {
        venta_id: ventaGuardada.id,
        oferta_id: ventaActual.ofertaId,
        secuencia: 1,
        porc_descuento: ventaActual.ofertaNombre.porcentaje_descuento,
        monto_descuento: ventaActual.precioSinOferta - ventaActual.precioFinal
      };
      
      // Aquí se guardaría en la tabla venta_oferta
      // await ventaOfertaAPI.create(ofertaData);
    }
    
    // Limpiar formulario
    limpiarFormularioVenta();
    
    // Actualizar historial
    if (clienteSeleccionado) {
      await cargarHistorialCliente();
    }
    
    mostrarNotificacion('Venta registrada exitosamente', 'success');
    
    // Preguntar si quiere ir a gestión de pagos
    if (confirm('Venta creada exitosamente. ¿Desea registrar un pago ahora?')) {
      // Aquí podrías cambiar a la vista de pagos
      window.cambiarVista('pagos');
    }
    
    return true;
  } catch (error) {
    console.error('Error al registrar venta:', error);
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
  document.getElementById('ofertaVenta').value = '';
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
export async function calcularPrecioTratamiento(tratamientoId, sesiones = 1, packId = null, ofertaId = null) {
  try {
    const tratamiento = await tratamientosAPI.getById(tratamientoId);
    if (!tratamiento) return null;
    
    let precio = 0;
    let sesionesTotales = sesiones;
    
    if (packId) {
      const pack = await packsAPI.getById(packId);
      precio = pack.precio_oferta || pack.precio;
      sesionesTotales = pack.cantidad_sesiones;
    } else {
      precio = sesiones * (tratamiento.precio_oferta || tratamiento.precio_sesion);
    }
    
    // Aplicar oferta adicional
    if (ofertaId) {
      const oferta = await ofertasAPI.getById(ofertaId);
      precio -= precio * (oferta.porcentaje_descuento / 100);
    }
    
    return {
      precio,
      sesionesTotales,
      tratamiento: tratamiento.nombre
    };
  } catch (error) {
    console.error('Error calculando precio tratamiento:', error);
    return null;
  }
}
