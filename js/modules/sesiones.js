/**
 * Módulo de gestión de sesiones con integración a Google Calendar
 * Maneja el inicio, término, agendamiento de sesiones y sincronización con calendario
 */

import { generarId, formatearFecha, formatearFechaHora, fechaActualInput, mostrarNotificacion } from '../utils.js';
import { obtenerVentasPorCliente, obtenerVentaPorId, guardarVenta, guardarSesion, guardarAgenda, obtenerAgenda, obtenerPacientePorId, obtenerPacientes } from '../storage.js';
import { TRATAMIENTOS_CONFIG, ESTADOS, GOOGLE_CALENDAR_CONFIG, BOXES_CONFIG } from '../config.js';

let sesionActual = null;
let pacienteSeleccionadoSesion = null;
let ventaSeleccionada = null;
let gapi = null;
let gapiLoaded = false;
let isCalendarAuthorized = false;
let sesionesHoyCalendar = [];
let boxesDisponibles = [...BOXES_CONFIG];

/**
 * Inicializa el módulo de sesiones
 */
export function inicializarSesiones() {
  cargarTratamientosAgenda();
  configurarEventosSesiones();
  inicializarGoogleCalendar();
  cargarBoxes();
  cargarSelectorFecha();
  renderSesionesAgendadas();
  cargarSesionesHoy();
}

/**
 * Configura los eventos del módulo de sesiones
 */
function configurarEventosSesiones() {
  const buscadorCliente = document.getElementById('buscadorCliente');
  const fechaSelectorInput = document.getElementById('fechaSelector');
  const btnPlanSesiones = document.getElementById('btnPlanSesiones');
  
  if (buscadorCliente) {
    buscadorCliente.addEventListener('input', buscarClienteParaSesion);
  }
  
  if (fechaSelectorInput) {
    fechaSelectorInput.addEventListener('change', cargarSesionesDelDia);
  }
  
  if (btnPlanSesiones) {
    btnPlanSesiones.addEventListener('click', generarPlanSesiones);
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
 * Inicializa Google Calendar API
 */
async function inicializarGoogleCalendar() {
  try {
    // Cargar la API de Google
    if (typeof window.gapi === 'undefined') {
      await cargarGoogleAPI();
    }
    
    await window.gapi.load('client:auth2', inicializarGapiClient);
  } catch (error) {
    console.warn('Error al cargar Google Calendar API:', error);
  }
}

/**
 * Carga la API de Google desde CDN
 */
function cargarGoogleAPI() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Inicializa el cliente de Google API
 */
async function inicializarGapiClient() {
  try {
    await window.gapi.client.init({
      apiKey: GOOGLE_CALENDAR_CONFIG.API_KEY,
      discoveryDocs: [GOOGLE_CALENDAR_CONFIG.DISCOVERY_DOC]
    });
    
    gapi = window.gapi;
    gapiLoaded = true;
    
    // Autorizar automáticamente si ya se concedió antes
    const authInstance = gapi.auth2.getAuthInstance();
    if (authInstance && authInstance.isSignedIn.get()) {
      isCalendarAuthorized = true;
      cargarSesionesHoy();
    }
    
    console.log('Google Calendar API inicializada');
  } catch (error) {
    console.warn('Error al inicializar Google Calendar:', error);
  }
}

/**
 * Autoriza acceso a Google Calendar
 */
export async function autorizarCalendar() {
  if (!gapiLoaded) {
    mostrarNotificacion('Google Calendar API no está disponible', 'error');
    return false;
  }
  
  try {
    const authInstance = gapi.auth2.getAuthInstance();
    await authInstance.signIn();
    isCalendarAuthorized = true;
    
    cargarSesionesHoy();
    mostrarNotificacion('Acceso a Google Calendar autorizado', 'success');
    return true;
  } catch (error) {
    mostrarNotificacion('Error al autorizar Google Calendar: ' + error.message, 'error');
    return false;
  }
}

/**
 * Busca cliente para asignar sesión
 */
function buscarClienteParaSesion(event) {
  const termino = event.target.value.toLowerCase();
  const resultadosDiv = document.getElementById('resultadosBusqueda');
  
  if (termino.length < 2) {
    resultadosDiv.innerHTML = '';
    resultadosDiv.classList.add('hidden');
    return;
  }
  
  // Buscar pacientes que coincidan
  const pacientes = obtenerPacientes().filter(paciente => 
    paciente.nombre.toLowerCase().includes(termino) ||
    paciente.rut.includes(termino)
  );
  
  if (pacientes.length === 0) {
    resultadosDiv.innerHTML = '<div class="resultado-item">No se encontraron pacientes</div>';
    resultadosDiv.classList.remove('hidden');
    return;
  }
  
  let html = '';
  pacientes.slice(0, 5).forEach(paciente => {
    html += `
      <div class="resultado-item" onclick="seleccionarClienteParaSesion(${paciente.id})">
        <strong>${paciente.nombre}</strong><br>
        <small>${paciente.rut}</small>
      </div>
    `;
  });
  
  resultadosDiv.innerHTML = html;
  resultadosDiv.classList.remove('hidden');
}

/**
 * Selecciona un cliente desde el buscador
 */
window.seleccionarClienteParaSesion = function(pacienteId) {
  const paciente = obtenerPacientePorId(pacienteId);
  if (!paciente) return;
  
  pacienteSeleccionadoSesion = paciente;
  
  // Actualizar interfaz
  document.getElementById('buscadorCliente').value = paciente.nombre;
  document.getElementById('resultadosBusqueda').classList.add('hidden');
  
  // Cargar ventas disponibles
  cargarVentasDisponibles();
}

/**
 * Carga las ventas con sesiones disponibles del cliente
 */
function cargarVentasDisponibles() {
  const ventasDiv = document.getElementById('ventasDisponibles');
  
  if (!pacienteSeleccionadoSesion) {
    ventasDiv.innerHTML = '';
    ventasDiv.classList.add('hidden');
    return;
  }
  
  const ventasConSesiones = obtenerVentasPorCliente(pacienteSeleccionadoSesion.id)
    .filter(venta => venta.sesionesRestantes > 0);
  
  if (ventasConSesiones.length === 0) {
    ventasDiv.innerHTML = '<p>Este cliente no tiene sesiones disponibles</p>';
    ventasDiv.classList.remove('hidden');
    return;
  }
  
  let html = '<h4>Sesiones Disponibles:</h4>';
  
  ventasConSesiones.forEach(venta => {
    const progreso = venta.sesionesTotales - venta.sesionesRestantes;
    html += `
      <div class="venta-item" onclick="seleccionarVenta(${venta.id})">
        <div class="venta-header">
          <strong>${venta.tratamiento}</strong>
          <span class="sesiones-badge">${venta.sesionesRestantes} disponibles</span>
        </div>
        <div class="venta-progreso">
          Progreso: ${progreso}/${venta.sesionesTotales} completadas
        </div>
      </div>
    `;
  });
  
  ventasDiv.innerHTML = html;
  ventasDiv.classList.remove('hidden');
}

/**
 * Selecciona una venta para agendar sesión
 */
window.seleccionarVenta = function(ventaId) {
  ventaSeleccionada = obtenerVentaPorId(ventaId);
  
  // Resaltar venta seleccionada
  document.querySelectorAll('.venta-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  event.target.closest('.venta-item').classList.add('selected');
  
  // Mostrar botones de acción
  document.getElementById('accionesSesion').classList.remove('hidden');
}

/**
 * Carga el selector de fecha (por defecto hoy)
 */
function cargarSelectorFecha() {
  const fechaSelector = document.getElementById('fechaSelector');
  if (fechaSelector) {
    const hoy = new Date();
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    fechaSelector.value = hoy.toISOString().split('T')[0];
    cargarSesionesDelDia();
  }
}

/**
 * Carga las sesiones del día seleccionado
 */
function cargarSesionesDelDia() {
  const fechaSelector = document.getElementById('fechaSelector');
  const fecha = fechaSelector.value;
  
  if (isCalendarAuthorized) {
    cargarSesionesDelCalendar(fecha);
  } else {
    cargarSesionesLocales(fecha);
  }
}

/**
 * Carga sesiones desde Google Calendar
 */
async function cargarSesionesDelCalendar(fecha) {
  if (!gapiLoaded || !isCalendarAuthorized) {
    cargarSesionesLocales(fecha);
    return;
  }
  
  try {
    const startDate = new Date(fecha + 'T00:00:00');
    const endDate = new Date(fecha + 'T23:59:59');
    
    const response = await gapi.client.calendar.events.list({
      calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    sesionesHoyCalendar = response.result.items || [];
    renderSesionesDelDia(fecha);
  } catch (error) {
    console.error('Error al cargar eventos del calendario:', error);
    cargarSesionesLocales(fecha);
  }
}

/**
 * Carga sesiones locales (fallback)
 */
function cargarSesionesLocales(fecha) {
  const agenda = obtenerAgenda().filter(a => a.fecha.startsWith(fecha));
  sesionesHoyCalendar = agenda.map(a => ({
    id: a.id,
    summary: `${a.tratamientoNombre} - ${a.pacienteNombre}`,
    start: { dateTime: a.fecha },
    description: `Paciente: ${a.pacienteNombre}\nTratamiento: ${a.tratamientoNombre}`,
    extendedProperties: {
      private: {
        ventaId: a.ventaId,
        pacienteId: a.pacienteId,
        boxId: a.boxId
      }
    }
  }));
  
  renderSesionesDelDia(fecha);
}

/**
 * Renderiza las sesiones del día
 */
function renderSesionesDelDia(fecha) {
  const sesionesDiv = document.getElementById('sesionesHoy');
  if (!sesionesDiv) return;
  
  const fechaObj = new Date(fecha);
  const esHoy = fechaObj.toDateString() === new Date().toDateString();
  
  let html = `<h3>Sesiones ${esHoy ? 'de Hoy' : 'del ' + formatearFecha(fecha)}</h3>`;
  
  if (sesionesHoyCalendar.length === 0) {
    html += '<p>No hay sesiones programadas para esta fecha</p>';
  } else {
    sesionesHoyCalendar.forEach(evento => {
      const inicio = new Date(evento.start.dateTime || evento.start.date);
      const hora = inicio.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      
      html += `
        <div class="sesion-item">
          <div class="sesion-hora">${hora}</div>
          <div class="sesion-info">
            <strong>${evento.summary}</strong><br>
            <small>${evento.description || ''}</small>
          </div>
          <div class="sesion-acciones">
            <button class="btn btn-sm" onclick="abrirSesion('${evento.id}')">Abrir</button>
            <button class="btn btn-sm btn-secondary" onclick="editarSesion('${evento.id}')">Editar</button>
          </div>
        </div>
      `;
    });
  }
  
  sesionesDiv.innerHTML = html;
}

/**
 * Carga los boxes disponibles
 */
function cargarBoxes() {
  const boxesDiv = document.getElementById('boxesDisponibles');
  if (!boxesDiv) return;
  
  let html = '<h4>Boxes Disponibles:</h4>';
  boxesDisponibles.forEach(box => {
    const estado = box.disponible ? 'disponible' : 'ocupado';
    html += `
      <div class="box-item ${estado}" data-box-id="${box.id}">
        <span>${box.nombre}</span>
        <span class="box-estado">${estado}</span>
      </div>
    `;
  });
  
  boxesDiv.innerHTML = html;
}

/**
 * Genera plan de sesiones automático
 */
export function generarPlanSesiones() {
  if (!pacienteSeleccionadoSesion || !ventaSeleccionada) {
    mostrarNotificacion('Debe seleccionar un cliente y una venta', 'error');
    return;
  }
  
  const tratamiento = TRATAMIENTOS_CONFIG[ventaSeleccionada.tratamientoKey];
  const sesionesRestantes = ventaSeleccionada.sesionesRestantes;
  const frecuencia = tratamiento.frecuenciaSugerida || 7; // días
  
  // Calcular fechas sugeridas
  const fechasPlanes = [];
  const fechaInicio = new Date();
  
  for (let i = 0; i < sesionesRestantes; i++) {
    const fechaSesion = new Date(fechaInicio);
    fechaSesion.setDate(fechaInicio.getDate() + (i * frecuencia));
    fechasPlanes.push(fechaSesion);
  }
  
  // Mostrar plan sugerido
  mostrarPlanSesiones(fechasPlanes, tratamiento);
}

/**
 * Muestra el plan de sesiones sugerido
 */
function mostrarPlanSesiones(fechas, tratamiento) {
  const planDiv = document.getElementById('planSesiones');
  if (!planDiv) return;
  
  let html = `
    <h4>Plan de Sesiones Sugerido</h4>
    <p>Tratamiento: ${tratamiento.nombre} (${tratamiento.duracionSesion} min)</p>
    <p>Frecuencia sugerida: cada ${tratamiento.frecuenciaSugerida} días</p>
    <div class="plan-sesiones-lista">
  `;
  
  fechas.forEach((fecha, index) => {
    const fechaFormateada = fecha.toLocaleDateString('es-CL');
    const horaDefault = '10:00';
    
    html += `
      <div class="plan-sesion-item">
        <span>Sesión ${index + 1}: ${fechaFormateada}</span>
        <input type="time" value="${horaDefault}" id="hora-${index}">
        <button class="btn btn-sm" onclick="agendarSesionDelPlan(${index})">Agendar</button>
      </div>
    `;
  });
  
  html += `
    </div>
    <div class="plan-acciones">
      <button class="btn" onclick="agendarTodasLasSesiones()">Agendar Todas</button>
      <button class="btn btn-secondary" onclick="cerrarPlan()">Cancelar</button>
    </div>
  `;
  
  planDiv.innerHTML = html;
  planDiv.classList.remove('hidden');
  
  // Guardar datos del plan
  window.planActual = { fechas, tratamiento };
}

/**
 * Agenda una sesión específica del plan
 */
window.agendarSesionDelPlan = async function(index) {
  const fecha = window.planActual.fechas[index];
  const horaInput = document.getElementById(`hora-${index}`);
  const hora = horaInput.value;
  
  const fechaCompleta = new Date(`${fecha.toISOString().split('T')[0]}T${hora}:00`);
  
  await agendarSesionEnCalendar(fechaCompleta);
}

/**
 * Agenda todas las sesiones del plan
 */
window.agendarTodasLasSesiones = async function() {
  const fechas = window.planActual.fechas;
  
  for (let i = 0; i < fechas.length; i++) {
    const horaInput = document.getElementById(`hora-${i}`);
    const hora = horaInput.value;
    const fechaCompleta = new Date(`${fechas[i].toISOString().split('T')[0]}T${hora}:00`);
    
    await agendarSesionEnCalendar(fechaCompleta);
    
    // Pequeña pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  cerrarPlan();
  mostrarNotificacion('Plan de sesiones agendado completamente', 'success');
}

/**
 * Cierra el plan de sesiones
 */
window.cerrarPlan = function() {
  document.getElementById('planSesiones').classList.add('hidden');
  window.planActual = null;
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
 * Agenda una sesión individual
 */
export function agendarSesionUnica() {
  if (!pacienteSeleccionadoSesion || !ventaSeleccionada) {
    mostrarNotificacion('Debe seleccionar un cliente y una venta', 'error');
    return;
  }
  
  const fechaInput = document.getElementById('fechaAgendaUnica');
  const boxSelect = document.getElementById('boxSeleccionado');
  
  if (!fechaInput.value) {
    mostrarNotificacion('Debe seleccionar fecha y hora', 'error');
    return;
  }
  
  const fecha = new Date(fechaInput.value);
  const boxId = boxSelect ? parseInt(boxSelect.value) : 1;
  
  agendarSesionEnCalendar(fecha, boxId);
}

/**
 * Agenda una sesión en Google Calendar
 */
async function agendarSesionEnCalendar(fecha, boxId = 1) {
  if (!pacienteSeleccionadoSesion || !ventaSeleccionada) {
    mostrarNotificacion('Faltan datos para agendar la sesión', 'error');
    return;
  }
  
  const tratamiento = TRATAMIENTOS_CONFIG[ventaSeleccionada.tratamientoKey];
  const box = boxesDisponibles.find(b => b.id === boxId) || boxesDisponibles[0];
  
  const evento = {
    summary: `${tratamiento.nombre} - ${pacienteSeleccionadoSesion.nombre}`,
    description: `Paciente: ${pacienteSeleccionadoSesion.nombre}\nRUT: ${pacienteSeleccionadoSesion.rut}\nTratamiento: ${tratamiento.nombre}\nBox: ${box.nombre}\nProgreso: ${ventaSeleccionada.sesionesTotales - ventaSeleccionada.sesionesRestantes + 1} de ${ventaSeleccionada.sesionesTotales}`,
    start: {
      dateTime: fecha.toISOString(),
      timeZone: 'America/Santiago'
    },
    end: {
      dateTime: new Date(fecha.getTime() + tratamiento.duracionSesion * 60000).toISOString(),
      timeZone: 'America/Santiago'
    },
    extendedProperties: {
      private: {
        ventaId: ventaSeleccionada.id.toString(),
        pacienteId: pacienteSeleccionadoSesion.id.toString(),
        boxId: boxId.toString(),
        sesionNumero: (ventaSeleccionada.sesionesTotales - ventaSeleccionada.sesionesRestantes + 1).toString()
      }
    }
  };
  
  try {
    if (isCalendarAuthorized) {
      const response = await gapi.client.calendar.events.insert({
        calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
        resource: evento
      });
      
      // Guardar también localmente como respaldo
      const agendamientoLocal = {
        id: response.result.id,
        pacienteId: pacienteSeleccionadoSesion.id,
        pacienteNombre: pacienteSeleccionadoSesion.nombre,
        ventaId: ventaSeleccionada.id,
        tratamientoKey: ventaSeleccionada.tratamientoKey,
        tratamientoNombre: tratamiento.nombre,
        fecha: fecha.toISOString(),
        duracion: tratamiento.duracionSesion,
        boxId,
        estado: ESTADOS.SESION.AGENDADA,
        fechaCreacion: new Date().toISOString(),
        googleEventId: response.result.id
      };
      
      guardarAgenda(agendamientoLocal);
      
      mostrarNotificacion('Sesión agendada en Google Calendar', 'success');
    } else {
      // Agendar solo localmente
      const agendamientoLocal = {
        id: generarId(),
        pacienteId: pacienteSeleccionadoSesion.id,
        pacienteNombre: pacienteSeleccionadoSesion.nombre,
        ventaId: ventaSeleccionada.id,
        tratamientoKey: ventaSeleccionada.tratamientoKey,
        tratamientoNombre: tratamiento.nombre,
        fecha: fecha.toISOString(),
        duracion: tratamiento.duracionSesion,
        boxId,
        estado: ESTADOS.SESION.AGENDADA,
        fechaCreacion: new Date().toISOString()
      };
      
      guardarAgenda(agendamientoLocal);
      mostrarNotificacion('Sesión agendada localmente', 'success');
    }
    
    // Actualizar vistas
    cargarSesionesDelDia();
    renderSesionesAgendadas();
    
  } catch (error) {
    console.error('Error al agendar sesión:', error);
    mostrarNotificacion('Error al agendar sesión: ' + error.message, 'error');
  }
}

/**
 * Abre una sesión desde el calendario
 */
window.abrirSesion = async function(eventoId) {
  // Buscar el evento en la lista
  const evento = sesionesHoyCalendar.find(e => e.id === eventoId);
  if (!evento) {
    mostrarNotificacion('Sesión no encontrada', 'error');
    return;
  }
  
  // Obtener datos del evento
  const ventaId = evento.extendedProperties?.private?.ventaId;
  const pacienteId = evento.extendedProperties?.private?.pacienteId;
  
  if (!ventaId || !pacienteId) {
    mostrarNotificacion('Sesión sin datos de venta asociados', 'error');
    return;
  }
  
  // Mostrar diálogo de confirmación
  mostrarDialogoConfirmacionSesion(evento, parseInt(ventaId), parseInt(pacienteId));
}

/**
 * Muestra diálogo para confirmar apertura de sesión
 */
function mostrarDialogoConfirmacionSesion(evento, ventaId, pacienteId) {
  const venta = obtenerVentaPorId(ventaId);
  const paciente = obtenerPacientePorId(pacienteId);
  
  if (!venta || !paciente) {
    mostrarNotificacion('Error: No se encontraron los datos de la venta o paciente', 'error');
    return;
  }
  
  const progreso = venta.sesionesTotales - venta.sesionesRestantes + 1;
  
  const modal = document.getElementById('modalConfirmacionSesion');
  const detalles = document.getElementById('detallesSesionConfirmar');
  
  detalles.innerHTML = `
    <h4>Confirmar Apertura de Sesión</h4>
    <p><strong>Paciente:</strong> ${paciente.nombre}</p>
    <p><strong>RUT:</strong> ${paciente.rut}</p>
    <p><strong>Tratamiento:</strong> ${venta.tratamiento}</p>
    <p><strong>Progreso:</strong> Sesión ${progreso} de ${venta.sesionesTotales}</p>
    <p><strong>Hora programada:</strong> ${new Date(evento.start.dateTime).toLocaleTimeString()}</p>
    <p><strong>Sesiones restantes:</strong> ${venta.sesionesRestantes}</p>
  `;
  
  // Configurar botones
  document.getElementById('btnConfirmarSesion').onclick = () => {
    confirmarInicioSesion(ventaId, evento.id);
    modal.classList.add('hidden');
  };
  
  document.getElementById('btnCancelarConfirmacion').onclick = () => {
    modal.classList.add('hidden');
  };
  
  modal.classList.remove('hidden');
}

/**
 * Confirma e inicia la sesión
 */
function confirmarInicioSesion(ventaId, eventoId) {
  const venta = obtenerVentaPorId(ventaId);
  const paciente = obtenerPacientePorId(venta.clienteId);
  const tratamiento = TRATAMIENTOS_CONFIG[venta.tratamientoKey];
  
  if (sesionActual) {
    mostrarNotificacion('Ya hay una sesión en curso', 'warning');
    return;
  }
  
  // Crear sesión actual
  sesionActual = {
    ventaId,
    pacienteId: venta.clienteId,
    tratamiento: venta.tratamiento,
    tratamientoKey: venta.tratamientoKey,
    duracion: tratamiento.duracionSesion,
    horaInicio: new Date().toISOString(),
    pacienteNombre: paciente.nombre,
    eventoId,
    horaProgramada: null, // Se puede obtener del evento
    sesionNumero: venta.sesionesTotales - venta.sesionesRestantes + 1
  };
  
  mostrarSesionEnCurso();
  mostrarNotificacion(`Sesión ${sesionActual.sesionNumero} iniciada con ${paciente.nombre}`, 'success');
}

/**
 * Edita una sesión del calendario
 */
window.editarSesion = async function(eventoId) {
  const evento = sesionesHoyCalendar.find(e => e.id === eventoId);
  if (!evento) return;
  
  // Mostrar formulario de edición
  mostrarFormularioEdicionSesion(evento);
}

/**
 * Muestra formulario para editar sesión
 */
function mostrarFormularioEdicionSesion(evento) {
  const modal = document.getElementById('modalEditarSesion');
  const formulario = document.getElementById('formularioEditarSesion');
  
  const fechaInicio = new Date(evento.start.dateTime);
  const fechaFormateada = fechaInicio.toISOString().slice(0, 16);
  
  formulario.innerHTML = `
    <h4>Editar Sesión</h4>
    <div class="form-group">
      <label>Título:</label>
      <input type="text" id="tituloSesion" value="${evento.summary}">
    </div>
    <div class="form-group">
      <label>Fecha y Hora:</label>
      <input type="datetime-local" id="fechaSesion" value="${fechaFormateada}">
    </div>
    <div class="form-group">
      <label>Descripción:</label>
      <textarea id="descripcionSesion">${evento.description || ''}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn" onclick="guardarEdicionSesion('${evento.id}')">Guardar</button>
      <button class="btn btn-danger" onclick="eliminarSesion('${evento.id}')">Eliminar</button>
      <button class="btn btn-secondary" onclick="cerrarModalEdicion()">Cancelar</button>
    </div>
  `;
  
  modal.classList.remove('hidden');
}

/**
 * Guarda los cambios de una sesión editada
 */
window.guardarEdicionSesion = async function(eventoId) {
  const titulo = document.getElementById('tituloSesion').value;
  const fecha = document.getElementById('fechaSesion').value;
  const descripcion = document.getElementById('descripcionSesion').value;
  
  if (!titulo || !fecha) {
    mostrarNotificacion('Título y fecha son requeridos', 'error');
    return;
  }
  
  try {
    if (isCalendarAuthorized) {
      const fechaInicio = new Date(fecha);
      const fechaFin = new Date(fechaInicio.getTime() + 60 * 60000); // +60 min por defecto
      
      await gapi.client.calendar.events.patch({
        calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
        eventId: eventoId,
        resource: {
          summary: titulo,
          description: descripcion,
          start: {
            dateTime: fechaInicio.toISOString(),
            timeZone: 'America/Santiago'
          },
          end: {
            dateTime: fechaFin.toISOString(),
            timeZone: 'America/Santiago'
          }
        }
      });
    }
    
    // Actualizar también localmente
    const agendaLocal = obtenerAgenda();
    const sesionLocal = agendaLocal.find(s => s.googleEventId === eventoId);
    if (sesionLocal) {
      sesionLocal.fecha = new Date(fecha).toISOString();
      guardarAgenda(sesionLocal);
    }
    
    cerrarModalEdicion();
    cargarSesionesDelDia();
    mostrarNotificacion('Sesión actualizada exitosamente', 'success');
  } catch (error) {
    mostrarNotificacion('Error al actualizar sesión: ' + error.message, 'error');
  }
}

/**
 * Elimina una sesión
 */
window.eliminarSesion = async function(eventoId) {
  if (!confirm('¿Está seguro de eliminar esta sesión?')) return;
  
  try {
    if (isCalendarAuthorized) {
      await gapi.client.calendar.events.delete({
        calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
        eventId: eventoId
      });
    }
    
    // Eliminar también localmente
    const agendaLocal = obtenerAgenda();
    const nuevaAgenda = agendaLocal.filter(s => s.googleEventId !== eventoId && s.id !== eventoId);
    localStorage.setItem('agenda', JSON.stringify(nuevaAgenda));
    
    cerrarModalEdicion();
    cargarSesionesDelDia();
    mostrarNotificacion('Sesión eliminada exitosamente', 'success');
  } catch (error) {
    mostrarNotificacion('Error al eliminar sesión: ' + error.message, 'error');
  }
}

/**
 * Cierra el modal de edición
 */
window.cerrarModalEdicion = function() {
  document.getElementById('modalEditarSesion').classList.add('hidden');
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
 * Termina la sesión actual con métricas mejoradas
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
  
  // Calcular diferencia con hora programada si existe
  let diferenciaPrograma = null;
  if (sesionActual.horaProgramada) {
    const programada = new Date(sesionActual.horaProgramada);
    diferenciaPrograma = Math.floor((inicio - programada) / 60000);
  }
  
  const registroSesion = {
    id: generarId(),
    ventaId: sesionActual.ventaId,
    pacienteId: sesionActual.pacienteId,
    tratamiento: sesionActual.tratamiento,
    tratamientoKey: sesionActual.tratamientoKey,
    horaInicio: sesionActual.horaInicio,
    horaFin,
    horaProgramada: sesionActual.horaProgramada,
    duracionEstimada: sesionActual.duracion,
    duracionReal,
    diferenciaPrograma,
    sesionNumero: sesionActual.sesionNumero,
    observaciones,
    fechaRegistro: new Date().toISOString(),
    eventoGoogleId: sesionActual.eventoId
  };
  
  try {
    // Guardar registro de sesión
    guardarSesion(registroSesion);
    
    // Reducir sesiones restantes
    const venta = obtenerVentaPorId(sesionActual.ventaId);
    venta.sesionesRestantes = Math.max(0, venta.sesionesRestantes - 1);
    guardarVenta(venta);
    
    // Actualizar evento en Google Calendar si es necesario
    if (isCalendarAuthorized && sesionActual.eventoId) {
      actualizarEventoCompletado(sesionActual.eventoId);
    }
    
    // Limpiar sesión actual
    const sesionTerminada = { ...sesionActual };
    sesionActual = null;
    
    // Limpiar interfaz
    document.getElementById('sesionActualCard').classList.add('hidden');
    document.getElementById('observacionesSesion').value = '';
    
    if (window.sesionInterval) {
      clearInterval(window.sesionInterval);
    }
    
    // Actualizar vistas
    cargarSesionesDelDia();
    
    const mensaje = venta.sesionesRestantes === 0 
      ? `¡Tratamiento ${sesionTerminada.tratamiento} completado! ${venta.sesionesTotales}/${venta.sesionesTotales} sesiones`
      : `Sesión ${sesionTerminada.sesionNumero} completada. Quedan ${venta.sesionesRestantes} sesiones.`;
    
    mostrarNotificacion(mensaje, 'success');
    
    return true;
  } catch (error) {
    mostrarNotificacion(`Error al terminar sesión: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Actualiza un evento como completado en Google Calendar
 */
async function actualizarEventoCompletado(eventoId) {
  try {
    const evento = await gapi.client.calendar.events.get({
      calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
      eventId: eventoId
    });
    
    const nuevoTitulo = evento.result.summary + ' ✓';
    
    await gapi.client.calendar.events.patch({
      calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
      eventId: eventoId,
      resource: {
        summary: nuevoTitulo,
        colorId: '10' // Verde para indicar completado
      }
    });
  } catch (error) {
    console.warn('Error al actualizar evento en calendario:', error);
  }
}

/**
 * Carga sesiones de hoy automáticamente
 */
export function cargarSesionesHoy() {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fechaSelector').value = hoy;
  cargarSesionesDelDia();
}

/**
 * Obtiene estadísticas de sesiones
 */
export function obtenerEstadisticasSesiones(fechaInicio = null, fechaFin = null) {
  const sesiones = obtenerSesiones();
  
  let sesionesFiltradas = sesiones;
  if (fechaInicio && fechaFin) {
    sesionesFiltradas = sesiones.filter(s => {
      const fechaSesion = s.fechaRegistro.split('T')[0];
      return fechaSesion >= fechaInicio && fechaSesion <= fechaFin;
    });
  }
  
  const stats = {
    totalSesiones: sesionesFiltradas.length,
    duracionPromedio: 0,
    puntualidad: 0,
    tratamientos: {}
  };
  
  if (sesionesFiltradas.length > 0) {
    // Duración promedio
    const duracionTotal = sesionesFiltradas.reduce((sum, s) => sum + (s.duracionReal || 0), 0);
    stats.duracionPromedio = Math.round(duracionTotal / sesionesFiltradas.length);
    
    // Puntualidad (sesiones que empezaron a tiempo)
    const sesionesATiempo = sesionesFiltradas.filter(s => 
      s.diferenciaPrograma !== null && Math.abs(s.diferenciaPrograma) <= 10
    ).length;
    stats.puntualidad = Math.round((sesionesATiempo / sesionesFiltradas.length) * 100);
    
    // Estadísticas por tratamiento
    sesionesFiltradas.forEach(s => {
      if (!stats.tratamientos[s.tratamiento]) {
        stats.tratamientos[s.tratamiento] = {
          cantidad: 0,
          duracionPromedio: 0
        };
      }
      stats.tratamientos[s.tratamiento].cantidad++;
    });
    
    // Calcular duración promedio por tratamiento
    Object.keys(stats.tratamientos).forEach(tratamiento => {
      const sesionesTratamiento = sesionesFiltradas.filter(s => s.tratamiento === tratamiento);
      const duracionTotal = sesionesTratamiento.reduce((sum, s) => sum + (s.duracionReal || 0), 0);
      stats.tratamientos[tratamiento].duracionPromedio = 
        Math.round(duracionTotal / sesionesTratamiento.length);
    });
  }
  
  return stats;
}

/**
 * Obtiene todas las sesiones registradas
 */
function obtenerSesiones() {
  return JSON.parse(localStorage.getItem('sesiones') || '[]');
}

/**
 * Gestiona boxes/salas disponibles
 */
export function toggleBox(boxId) {
  const box = boxesDisponibles.find(b => b.id === boxId);
  if (box) {
    box.disponible = !box.disponible;
    cargarBoxes();
    
    const estado = box.disponible ? 'disponible' : 'no disponible';
    mostrarNotificacion(`${box.nombre} marcado como ${estado}`, 'info');
  }
}

/**
 * Añade un nuevo box
 */
export function añadirBox() {
  const nombre = prompt('Nombre del nuevo box:');
  if (!nombre) return;
  
  const nuevoId = Math.max(...boxesDisponibles.map(b => b.id)) + 1;
  const nuevoBox = {
    id: nuevoId,
    nombre: nombre.trim(),
    disponible: true
  };
  
  boxesDisponibles.push(nuevoBox);
  cargarBoxes();
  
  mostrarNotificacion(`${nombre} añadido exitosamente`, 'success');
}

/**
 * Elimina un box
 */
export function eliminarBox(boxId) {
  if (!confirm('¿Está seguro de eliminar este box?')) return;
  
  const index = boxesDisponibles.findIndex(b => b.id === boxId);
  if (index !== -1) {
    const box = boxesDisponibles[index];
    boxesDisponibles.splice(index, 1);
    cargarBoxes();
    
    mostrarNotificacion(`${box.nombre} eliminado`, 'success');
  }
}

/**
 * Exporta funciones globales necesarias
 */
window.autorizarCalendar = autorizarCalendar;
window.agendarSesionUnica = agendarSesionUnica;
window.generarPlanSesiones = generarPlanSesiones;
window.terminarSesion = terminarSesion;
window.cargarSesionesHoy = cargarSesionesHoy;
window.toggleBox = toggleBox;
window.añadirBox = añadirBox;
window.eliminarBox = eliminarBox;

/**
 * Obtiene la sesión actual
 */
export function obtenerSesionActual() {
  return sesionActual;
}

/**
 * Obtiene las sesiones del día desde Google Calendar
 */
export function obtenerSesionesHoy() {
  return sesionesHoyCalendar;
}

/**
 * Exporta las sesiones agendadas con integración de Google Calendar
 */
export function exportarAgenda(fechaInicio = null, fechaFin = null) {
  let agenda = sesionesHoyCalendar;
  
  if (fechaInicio && fechaFin) {
    agenda = agenda.filter(evento => {
      const fechaEvento = new Date(evento.start.dateTime || evento.start.date).toISOString().split('T')[0];
      return fechaEvento >= fechaInicio && fechaEvento <= fechaFin;
    });
  }
  
  return agenda.map(evento => ({
    fecha: evento.start.dateTime || evento.start.date,
    titulo: evento.summary,
    descripcion: evento.description,
    duracion: evento.extendedProperties?.private?.duracion || 60
  }));
}

/**
 * Funciones de compatibilidad mantenidas
 */
export function confirmarAgenda(agendaId) {
  // Mantener por compatibilidad
  return true;
}

export function cancelarAgenda(agendaId) {
  // Mantener por compatibilidad  
  return true;
}

export function reprogramarAgenda(agendaId) {
  // Mantener por compatibilidad
  return true;
}
