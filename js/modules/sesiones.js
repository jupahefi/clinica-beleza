/**
 * Módulo de gestión de sesiones
 * Maneja el inicio, término y agendamiento de sesiones
 */

import { generarId, formatearFecha, formatearFechaHora, fechaActualInput, mostrarNotificacion } from '../utils.js';
import { obtenerVentasPorCliente, obtenerVentaPorId, guardarVenta, guardarSesion, guardarAgenda, obtenerAgenda, obtenerPacientePorId } from '../storage.js';
import { TRATAMIENTOS_CONFIG, ESTADOS } from '../config.js';

let sesionActual = null;
let pacienteSeleccionadoSesion = null;

/**
 * Inicializa el módulo de sesiones
 */
export function inicializarSesiones() {
  cargarTratamientosAgenda();
  configurarEventosSesiones();
  renderSesionesAgendadas();
}

/**
 * Configura los eventos del módulo de sesiones
 */
function configurarEventosSesiones() {
  const pacienteSelect = document.getElementById('pacienteSesion');
  
  if (pacienteSelect) {
    pacienteSelect.addEventListener('change', seleccionarPacienteSesion);
  }
  
  // Configurar fecha por defecto para agendamiento
  const fechaInput = document.getElementById('fechaAgenda');
  if (fechaInput) {
    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    fechaInput.value = ahora.toISOString().slice(0, 16);
  }
}

/**
 * Selecciona un paciente para ver sus sesiones
 */
function seleccionarPacienteSesion() {
  const select = document.getElementById('pacienteSesion');
  const pacienteId = parseInt(select.value);
  
  if (!pacienteId) {
    pacienteSeleccionadoSesion = null;
    limpiarListaSesiones();
    return;
  }
  
  pacienteSeleccionadoSesion = obtenerPacientePorId(pacienteId);
  if (pacienteSeleccionadoSesion) {
    cargarSesionesPaciente();
  }
}

/**
 * Carga las sesiones disponibles del paciente seleccionado
 */
function cargarSesionesPaciente() {
  const listaDiv = document.getElementById('listaSesiones');
  
  if (!pacienteSeleccionadoSesion) {
    limpiarListaSesiones();
    return;
  }
  
  const ventasPaciente = obtenerVentasPorCliente(pacienteSeleccionadoSesion.id)
    .filter(venta => venta.sesionesRestantes > 0);
  
  if (ventasPaciente.length === 0) {
    listaDiv.innerHTML = '<p>Este paciente no tiene sesiones disponibles</p>';
    return;
  }
  
  let html = '';
  
  ventasPaciente.forEach(venta => {
    const sesionesCompletadas = venta.sesionesTotales - venta.sesionesRestantes;
    const progreso = ((sesionesCompletadas / venta.sesionesTotales) * 100).toFixed(1);
    const tratamiento = TRATAMIENTOS_CONFIG[venta.tratamientoKey];
    
    html += `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${venta.tratamiento}</span>
          <span class="status status-pending">${venta.sesionesRestantes} disponibles</span>
        </div>
        <div class="item-subtitle">
          <strong>Progreso:</strong> ${sesionesCompletadas}/${venta.sesionesTotales} sesiones (${progreso}%)<br>
          <strong>Duración:</strong> ${tratamiento?.duracionSesion || 60} minutos<br>
          <strong>Frecuencia sugerida:</strong> cada ${tratamiento?.frecuenciaSugerida || 7} días<br>
          <strong>Compra:</strong> ${formatearFecha(venta.fecha)}
        </div>
        <div class="item-actions">
          <button class="btn" onclick="window.iniciarSesion(${venta.id})">Iniciar Sesión</button>
        </div>
      </div>
    `;
  });
  
  listaDiv.innerHTML = html;
}

/**
 * Limpia la lista de sesiones
 */
function limpiarListaSesiones() {
  const listaDiv = document.getElementById('listaSesiones');
  if (listaDiv) {
    listaDiv.innerHTML = 'Selecciona un paciente';
  }
}

/**
 * Inicia una sesión con el paciente
 */
export function iniciarSesion(ventaId) {
  if (sesionActual) {
    mostrarNotificacion('Ya hay una sesión en curso. Termínala antes de iniciar otra.', 'warning');
    return false;
  }
  
  const venta = obtenerVentaPorId(ventaId);
  if (!venta || venta.sesionesRestantes <= 0) {
    mostrarNotificacion('No hay sesiones disponibles para esta venta', 'error');
    return false;
  }
  
  const paciente = obtenerPacientePorId(venta.clienteId);
  const tratamiento = TRATAMIENTOS_CONFIG[venta.tratamientoKey];
  
  sesionActual = {
    ventaId,
    pacienteId: venta.clienteId,
    tratamiento: venta.tratamiento,
    tratamientoKey: venta.tratamientoKey,
    duracion: tratamiento.duracionSesion,
    horaInicio: new Date().toISOString(),
    pacienteNombre: paciente.nombre
  };
  
  mostrarSesionEnCurso();
  cargarSesionesPaciente(); // Actualizar la lista
  
  mostrarNotificacion(`Sesión iniciada con ${paciente.nombre}`, 'success');
  return true;
}

/**
 * Muestra la interfaz de sesión en curso
 */
function mostrarSesionEnCurso() {
  const card = document.getElementById('sesionActualCard');
  const detalles = document.getElementById('detallesSesionActual');
  
  if (!card || !detalles || !sesionActual) return;
  
  const horaInicio = new Date(sesionActual.horaInicio);
  const tiempoTranscurrido = Math.floor((Date.now() - horaInicio.getTime()) / 60000); // minutos
  
  detalles.innerHTML = `
    <div class="item">
      <div class="item-header">
        <span class="item-title">Sesión en Curso</span>
        <span class="status status-completed">Activa</span>
      </div>
      <div class="item-subtitle">
        <strong>Paciente:</strong> ${sesionActual.pacienteNombre}<br>
        <strong>Tratamiento:</strong> ${sesionActual.tratamiento}<br>
        <strong>Duración estimada:</strong> ${sesionActual.duracion} minutos<br>
        <strong>Hora inicio:</strong> ${horaInicio.toLocaleTimeString()}<br>
        <strong>Tiempo transcurrido:</strong> ${tiempoTranscurrido} minutos
      </div>
    </div>
  `;
  
  card.classList.remove('hidden');
  
  // Actualizar cada minuto
  if (window.sesionInterval) {
    clearInterval(window.sesionInterval);
  }
  
  window.sesionInterval = setInterval(mostrarSesionEnCurso, 60000);
}

/**
 * Termina la sesión actual
 */
export function terminarSesion() {
  if (!sesionActual) {
    mostrarNotificacion('No hay sesión activa', 'warning');
    return false;
  }
  
  const observaciones = document.getElementById('observacionesSesion').value.trim();
  const horaFin = new Date().toISOString();
  
  // Calcular duración real
  const inicio = new Date(sesionActual.horaInicio);
  const fin = new Date(horaFin);
  const duracionReal = Math.floor((fin - inicio) / 60000); // minutos
  
  const registroSesion = {
    id: generarId(),
    ventaId: sesionActual.ventaId,
    pacienteId: sesionActual.pacienteId,
    tratamiento: sesionActual.tratamiento,
    tratamientoKey: sesionActual.tratamientoKey,
    horaInicio: sesionActual.horaInicio,
    horaFin,
    duracionEstimada: sesionActual.duracion,
    duracionReal,
    observaciones,
    fechaRegistro: new Date().toISOString()
  };
  
  try {
    // Guardar registro de sesión
    guardarSesion(registroSesion);
    
    // Reducir sesiones restantes
    const venta = obtenerVentaPorId(sesionActual.ventaId);
    venta.sesionesRestantes = Math.max(0, venta.sesionesRestantes - 1);
    guardarVenta(venta);
    
    // Limpiar sesión actual
    const sesionTerminada = { ...sesionActual };
    sesionActual = null;
    
    // Limpiar interfaz
    document.getElementById('sesionActualCard').classList.add('hidden');
    document.getElementById('observacionesSesion').value = '';
    
    if (window.sesionInterval) {
      clearInterval(window.sesionInterval);
    }
    
    // Actualizar listas
    cargarSesionesPaciente();
    
    const mensaje = venta.sesionesRestantes === 0 
      ? `Sesión terminada. ¡Tratamiento ${sesionTerminada.tratamiento} completado!`
      : `Sesión terminada. Quedan ${venta.sesionesRestantes} sesiones.`;
    
    mostrarNotificacion(mensaje, 'success');
    
    return true;
  } catch (error) {
    mostrarNotificacion(`Error al terminar sesión: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Carga los tratamientos para agendamiento
 */
function cargarTratamientosAgenda() {
  const select = document.getElementById('tratamientoAgenda');
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Seleccionar tratamiento --</option>';
  
  Object.entries(TRATAMIENTOS_CONFIG).forEach(([key, tratamiento]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${tratamiento.nombre} (${tratamiento.duracionSesion}min)`;
    select.appendChild(option);
  });
}

/**
 * Agenda una nueva sesión
 */
export function agendarSesion() {
  const errores = validarAgendamiento();
  
  if (errores.length > 0) {
    mostrarNotificacion(`Errores en el agendamiento:\n${errores.join('\n')}`, 'error');
    return false;
  }
  
  const fecha = document.getElementById('fechaAgenda').value;
  const tratamientoKey = document.getElementById('tratamientoAgenda').value;
  const tratamiento = TRATAMIENTOS_CONFIG[tratamientoKey];
  
  const agendamiento = {
    id: generarId(),
    pacienteId: pacienteSeleccionadoSesion.id,
    pacienteNombre: pacienteSeleccionadoSesion.nombre,
    tratamientoKey,
    tratamientoNombre: tratamiento.nombre,
    fecha,
    duracion: tratamiento.duracionSesion,
    estado: ESTADOS.SESION.AGENDADA,
    fechaCreacion: new Date().toISOString()
  };
  
  try {
    guardarAgenda(agendamiento);
    
    // Limpiar formulario
    document.getElementById('fechaAgenda').value = '';
    document.getElementById('tratamientoAgenda').value = '';
    
    renderSesionesAgendadas();
    mostrarNotificacion('Sesión agendada exitosamente', 'success');
    
    return true;
  } catch (error) {
    mostrarNotificacion(`Error al agendar sesión: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Valida los datos de agendamiento
 */
function validarAgendamiento() {
  const errores = [];
  
  if (!pacienteSeleccionadoSesion) {
    errores.push('Debe seleccionar un paciente');
  }
  
  const fecha = document.getElementById('fechaAgenda').value;
  if (!fecha) {
    errores.push('Debe seleccionar fecha y hora');
  } else {
    const fechaAgenda = new Date(fecha);
    const ahora = new Date();
    
    if (fechaAgenda <= ahora) {
      errores.push('La fecha debe ser futura');
    }
  }
  
  const tratamientoKey = document.getElementById('tratamientoAgenda').value;
  if (!tratamientoKey) {
    errores.push('Debe seleccionar un tratamiento');
  }
  
  return errores;
}

/**
 * Renderiza las sesiones agendadas
 */
function renderSesionesAgendadas() {
  const lista = document.getElementById('sesionesAgendadas');
  if (!lista) return;
  
  const agenda = obtenerAgenda()
    .filter(a => a.estado === ESTADOS.SESION.AGENDADA)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  
  if (agenda.length === 0) {
    lista.innerHTML = '<p>No hay sesiones agendadas</p>';
    return;
  }
  
  let html = '';
  
  agenda.forEach(agendamiento => {
    const fechaAgenda = new Date(agendamiento.fecha);
    const esHoy = fechaAgenda.toDateString() === new Date().toDateString();
    const esPasada = fechaAgenda < new Date();
    
    let claseEstado = 'status-pending';
    let textoEstado = 'Agendada';
    
    if (esPasada) {
      claseEstado = 'status-pending';
      textoEstado = 'Vencida';
    } else if (esHoy) {
      claseEstado = 'status-completed';
      textoEstado = 'Hoy';
    }
    
    html += `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${agendamiento.tratamientoNombre}</span>
          <span class="status ${claseEstado}">${textoEstado}</span>
        </div>
        <div class="item-subtitle">
          <strong>Paciente:</strong> ${agendamiento.pacienteNombre}<br>
          <strong>Fecha:</strong> ${formatearFechaHora(agendamiento.fecha)}<br>
          <strong>Duración:</strong> ${agendamiento.duracion} minutos
        </div>
        <div class="item-actions">
          <button class="btn btn-success" onclick="window.confirmarAgenda(${agendamiento.id})">Confirmar</button>
          <button class="btn btn-secondary" onclick="window.reprogramarAgenda(${agendamiento.id})">Reprogramar</button>
          <button class="btn btn-danger" onclick="window.cancelarAgenda(${agendamiento.id})">Cancelar</button>
        </div>
      </div>
    `;
  });
  
  lista.innerHTML = html;
}

/**
 * Confirma una sesión agendada
 */
export function confirmarAgenda(agendaId) {
  const agendamiento = obtenerAgenda().find(a => a.id === agendaId);
  if (!agendamiento) return false;
  
  agendamiento.estado = 'confirmada';
  agendamiento.fechaConfirmacion = new Date().toISOString();
  
  guardarAgenda(agendamiento);
  renderSesionesAgendadas();
  
  mostrarNotificacion('Sesión confirmada', 'success');
  return true;
}

/**
 * Cancela una sesión agendada
 */
export function cancelarAgenda(agendaId) {
  if (!confirm('¿Está seguro de que desea cancelar esta sesión?')) {
    return false;
  }
  
  const agendamiento = obtenerAgenda().find(a => a.id === agendaId);
  if (!agendamiento) return false;
  
  agendamiento.estado = ESTADOS.SESION.CANCELADA;
  agendamiento.fechaCancelacion = new Date().toISOString();
  
  guardarAgenda(agendamiento);
  renderSesionesAgendadas();
  
  mostrarNotificacion('Sesión cancelada', 'success');
  return true;
}

/**
 * Reprograma una sesión agendada
 */
export function reprogramarAgenda(agendaId) {
  const nuevaFecha = prompt('Ingrese la nueva fecha y hora (YYYY-MM-DD HH:MM):');
  if (!nuevaFecha) return false;
  
  try {
    const fecha = new Date(nuevaFecha);
    if (fecha <= new Date()) {
      mostrarNotificacion('La nueva fecha debe ser futura', 'error');
      return false;
    }
    
    const agendamiento = obtenerAgenda().find(a => a.id === agendaId);
    if (!agendamiento) return false;
    
    agendamiento.fecha = fecha.toISOString();
    agendamiento.fechaReprogramacion = new Date().toISOString();
    
    guardarAgenda(agendamiento);
    renderSesionesAgendadas();
    
    mostrarNotificacion('Sesión reprogramada exitosamente', 'success');
    return true;
  } catch (error) {
    mostrarNotificacion('Formato de fecha inválido', 'error');
    return false;
  }
}

/**
 * Obtiene la sesión actual
 */
export function obtenerSesionActual() {
  return sesionActual;
}

/**
 * Obtiene las sesiones del día
 */
export function obtenerSesionesHoy() {
  const hoy = new Date().toISOString().split('T')[0];
  return obtenerAgenda().filter(a => a.fecha.startsWith(hoy));
}

/**
 * Exporta las sesiones agendadas
 */
export function exportarAgenda(fechaInicio = null, fechaFin = null) {
  let agenda = obtenerAgenda();
  
  if (fechaInicio && fechaFin) {
    agenda = agenda.filter(a => {
      const fechaAgenda = a.fecha.split('T')[0];
      return fechaAgenda >= fechaInicio && fechaAgenda <= fechaFin;
    });
  }
  
  return agenda.map(agendamiento => ({
    fecha: agendamiento.fecha,
    paciente: agendamiento.pacienteNombre,
    tratamiento: agendamiento.tratamientoNombre,
    duracion: agendamiento.duracion,
    estado: agendamiento.estado
  }));
}
