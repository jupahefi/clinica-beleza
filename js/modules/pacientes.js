/**
 * Módulo de gestión de pacientes
 * Maneja todas las operaciones relacionadas con fichas de pacientes
 */

import { generarId, formatearRut, validarRut, validarEmail, mostrarNotificacion } from '../utils.js';
import { obtenerPacientes, obtenerPacientePorId, guardarPaciente } from '../storage.js';
import { TIPOS_PIEL, ZONAS_TRATAMIENTO } from '../config.js';

let pacienteActual = null;

/**
 * Inicializa el módulo de pacientes
 */
export function inicializarPacientes() {
  cargarPacientesSelect();
  configurarEventosPacientes();
}

/**
 * Configura los eventos del formulario de pacientes
 */
function configurarEventosPacientes() {
  const pacienteSelect = document.getElementById('pacienteSelect');
  const rutInput = document.getElementById('rutPaciente');
  const emailInput = document.getElementById('emailPaciente');
  
  if (pacienteSelect) {
    pacienteSelect.addEventListener('change', cargarPacienteSeleccionado);
  }
  
  if (rutInput) {
    rutInput.addEventListener('blur', formatearRutInput);
  }
  
  if (emailInput) {
    emailInput.addEventListener('blur', validarEmailInput);
  }
  
  // Configurar checkboxes de fichas específicas
  const checkboxFichas = document.querySelectorAll('input[type="checkbox"][id^="ficha"]');
  checkboxFichas.forEach(checkbox => {
    checkbox.addEventListener('change', toggleFichasEspecificas);
  });
}

/**
 * Carga la lista de pacientes en el select
 */
export function cargarPacientesSelect() {
  const selects = document.querySelectorAll('#pacienteSelect, #clienteVenta, #pacienteSesion');
  const pacientes = obtenerPacientes();
  
  selects.forEach(select => {
    if (!select) return;
    
    const opcionVacia = select.id === 'pacienteSelect' 
      ? '-- Crear nuevo paciente --' 
      : '-- Seleccionar paciente --';
    
    select.innerHTML = `<option value="">${opcionVacia}</option>`;
    
    pacientes.forEach(paciente => {
      const option = document.createElement('option');
      option.value = paciente.id.toString();
      option.textContent = `${paciente.nombre} - ${paciente.rut}`;
      select.appendChild(option);
    });
  });
}

/**
 * Carga los datos de un paciente seleccionado
 */
function cargarPacienteSeleccionado() {
  const select = document.getElementById('pacienteSelect');
  const pacienteId = parseInt(select.value);
  
  if (!pacienteId) {
    limpiarFormularioPaciente();
    pacienteActual = null;
    return;
  }
  
  const paciente = obtenerPacientePorId(pacienteId);
  if (!paciente) return;
  
  pacienteActual = paciente;
  
  // Cargar datos básicos
  document.getElementById('nombrePaciente').value = paciente.nombre || '';
  document.getElementById('rutPaciente').value = paciente.rut || '';
  document.getElementById('edadPaciente').value = paciente.edad || '';
  document.getElementById('telefonoPaciente').value = paciente.telefono || '';
  document.getElementById('emailPaciente').value = paciente.email || '';
  document.getElementById('observacionesPaciente').value = paciente.observaciones || '';
  
  // Cargar fichas específicas
  const fichasEspecificas = paciente.fichasEspecificas || [];
  
  // Limpiar checkboxes
  document.querySelectorAll('input[type="checkbox"][id^="ficha"]').forEach(cb => cb.checked = false);
  
  // Marcar checkboxes según las fichas del paciente
  fichasEspecificas.forEach(tipo => {
    const checkbox = document.getElementById(`ficha${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (checkbox) {
      checkbox.checked = true;
    }
  });
  
  toggleFichasEspecificas();
  
  // Cargar datos específicos
  if (paciente.fichaDepilacion) {
    cargarDatosFichaEspecifica('depilacion', paciente.fichaDepilacion);
  }
  if (paciente.fichaCorporal) {
    cargarDatosFichaEspecifica('corporal', paciente.fichaCorporal);
  }
}

/**
 * Carga los datos de la ficha específica
 */
function cargarDatosFichaEspecifica(tipo, datos) {
  if (!datos) return;
  
  if (tipo === 'depilacion') {
    document.getElementById('zonasDepilacion').value = datos.zonas || '';
    document.getElementById('tipoPiel').value = datos.tipoPiel || '';
    document.getElementById('medicamentos').value = datos.medicamentos || '';
    document.getElementById('observacionesMedicas').value = datos.observacionesMedicas || '';
  } else if (tipo === 'corporal') {
    document.getElementById('tratamientosPrevios').value = datos.tratamientosPrevios || '';
    document.getElementById('objetivoEstetico').value = datos.objetivoEstetico || '';
    document.getElementById('zonaTratamiento').value = datos.zonaTratamiento || '';
    document.getElementById('expectativas').value = datos.expectativas || '';
  }
}

/**
 * Limpia el formulario de paciente
 */
function limpiarFormularioPaciente() {
  const campos = [
    'nombrePaciente', 'rutPaciente', 'edadPaciente', 
    'telefonoPaciente', 'emailPaciente', 'observacionesPaciente'
  ];
  
  campos.forEach(campo => {
    const elemento = document.getElementById(campo);
    if (elemento) elemento.value = '';
  });
  
  // Limpiar fichas específicas
  limpiarFichasEspecificas();
  
  // Desmarcar todos los checkboxes
  document.querySelectorAll('input[type="checkbox"][id^="ficha"]').forEach(cb => cb.checked = false);
  toggleFichasEspecificas();
  
  pacienteActual = null;
}

/**
 * Limpia los campos de las fichas específicas
 */
function limpiarFichasEspecificas() {
  const camposDepilacion = ['zonasDepilacion', 'tipoPiel', 'medicamentos', 'observacionesMedicas'];
  const camposCorporal = ['tratamientosPrevios', 'objetivoEstetico', 'zonaTratamiento', 'expectativas'];
  
  [...camposDepilacion, ...camposCorporal].forEach(campo => {
    const elemento = document.getElementById(campo);
    if (elemento) elemento.value = '';
  });
}

/**
 * Muestra/oculta las fichas específicas según los checkboxes seleccionados
 */
export function toggleFichasEspecificas() {
  const fichaDepilacion = document.getElementById('fichaDepilacionCard');
  const fichaCorporal = document.getElementById('fichaCorporalCard');
  
  const depilacionChecked = document.getElementById('fichaDepilacion')?.checked;
  const corporalChecked = document.getElementById('fichaCorporal')?.checked;
  
  // Mostrar/ocultar ficha de depilación
  if (fichaDepilacion) {
    if (depilacionChecked) {
      fichaDepilacion.classList.remove('hidden');
      cargarOpcionesTipoPiel();
    } else {
      fichaDepilacion.classList.add('hidden');
    }
  }
  
  // Mostrar/ocultar ficha corporal
  if (fichaCorporal) {
    if (corporalChecked) {
      fichaCorporal.classList.remove('hidden');
      cargarOpcionesZonasTratamiento();
    } else {
      fichaCorporal.classList.add('hidden');
    }
  }
}

// Mantener compatibilidad con llamadas anteriores
export function toggleFichaEspecifica() {
  toggleFichasEspecificas();
}

/**
 * Carga las opciones de tipos de piel
 */
function cargarOpcionesTipoPiel() {
  const select = document.getElementById('tipoPiel');
  if (!select || select.children.length > 1) return;
  
  TIPOS_PIEL.forEach(tipo => {
    const option = document.createElement('option');
    option.value = tipo.value;
    option.textContent = tipo.label;
    select.appendChild(option);
  });
}

/**
 * Carga las opciones de zonas de tratamiento
 */
function cargarOpcionesZonasTratamiento() {
  const select = document.getElementById('zonaTratamiento');
  if (!select || select.children.length > 1) return;
  
  ZONAS_TRATAMIENTO.forEach(zona => {
    const option = document.createElement('option');
    option.value = zona.value;
    option.textContent = zona.label;
    select.appendChild(option);
  });
}

/**
 * Formatea el RUT mientras el usuario escribe
 */
function formatearRutInput(event) {
  const input = event.target;
  const rut = input.value.trim();
  
  if (rut && validarRut(rut)) {
    input.value = formatearRut(rut);
    input.classList.remove('error');
  } else if (rut) {
    input.classList.add('error');
  }
}

/**
 * Valida el email mientras el usuario escribe
 */
function validarEmailInput(event) {
  const input = event.target;
  const email = input.value.trim();
  
  if (email && !validarEmail(email)) {
    input.classList.add('error');
  } else {
    input.classList.remove('error');
  }
}

/**
 * Valida los datos del formulario de paciente
 */
function validarFormularioPaciente() {
  const nombre = document.getElementById('nombrePaciente').value.trim();
  const rut = document.getElementById('rutPaciente').value.trim();
  const email = document.getElementById('emailPaciente').value.trim();
  
  const errores = [];
  
  if (!nombre) {
    errores.push('El nombre es requerido');
  }
  
  if (!rut) {
    errores.push('El RUT es requerido');
  } else if (!validarRut(rut)) {
    errores.push('El RUT no es válido');
  }
  
  if (email && !validarEmail(email)) {
    errores.push('El email no es válido');
  }
  
  return errores;
}

/**
 * Obtiene los datos de las fichas específicas seleccionadas
 */
function obtenerDatosFichasEspecificas() {
  const fichasData = {};
  const fichasSeleccionadas = [];
  
  // Verificar ficha de depilación
  if (document.getElementById('fichaDepilacion')?.checked) {
    fichasSeleccionadas.push('depilacion');
    fichasData.fichaDepilacion = {
      zonas: document.getElementById('zonasDepilacion').value.trim(),
      tipoPiel: document.getElementById('tipoPiel').value,
      medicamentos: document.getElementById('medicamentos').value.trim(),
      observacionesMedicas: document.getElementById('observacionesMedicas').value.trim()
    };
  }
  
  // Verificar ficha corporal
  if (document.getElementById('fichaCorporal')?.checked) {
    fichasSeleccionadas.push('corporal');
    fichasData.fichaCorporal = {
      tratamientosPrevios: document.getElementById('tratamientosPrevios').value.trim(),
      objetivoEstetico: document.getElementById('objetivoEstetico').value.trim(),
      zonaTratamiento: document.getElementById('zonaTratamiento').value,
      expectativas: document.getElementById('expectativas').value.trim()
    };
  }
  
  return {
    fichasEspecificas: fichasSeleccionadas,
    ...fichasData
  };
}

/**
 * Guarda o actualiza un paciente
 */
export function guardarPacienteFormulario() {
  const errores = validarFormularioPaciente();
  
  if (errores.length > 0) {
    mostrarNotificacion(`Errores en el formulario:\n${errores.join('\n')}`, 'error');
    return false;
  }
  
  const esNuevo = !pacienteActual;
  const datosEspecificos = obtenerDatosFichasEspecificas();
  
  const paciente = {
    id: pacienteActual?.id || generarId(),
    nombre: document.getElementById('nombrePaciente').value.trim(),
    rut: formatearRut(document.getElementById('rutPaciente').value.trim()),
    edad: parseInt(document.getElementById('edadPaciente').value) || 0,
    telefono: document.getElementById('telefonoPaciente').value.trim(),
    email: document.getElementById('emailPaciente').value.trim(),
    observaciones: document.getElementById('observacionesPaciente').value.trim(),
    ...datosEspecificos,
    fechaCreacion: pacienteActual?.fechaCreacion || new Date().toISOString(),
    fechaActualizacion: new Date().toISOString()
  };
  
  try {
    const pacienteGuardado = guardarPaciente(paciente);
    pacienteActual = pacienteGuardado;
    
    cargarPacientesSelect();
    
    const mensaje = esNuevo ? 'Paciente creado exitosamente' : 'Paciente actualizado exitosamente';
    mostrarNotificacion(mensaje, 'success');
    
    return true;
  } catch (error) {
    mostrarNotificacion(`Error al guardar paciente: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Busca pacientes por nombre o RUT
 */
export function buscarPacientes(termino) {
  if (!termino || termino.length < 2) {
    return obtenerPacientes();
  }
  
  const terminoLimpio = termino.toLowerCase();
  
  return obtenerPacientes().filter(paciente => 
    paciente.nombre.toLowerCase().includes(terminoLimpio) ||
    paciente.rut.includes(terminoLimpio)
  );
}

/**
 * Obtiene el paciente actual
 */
export function obtenerPacienteActual() {
  return pacienteActual;
}
