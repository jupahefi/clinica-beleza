/**
 * Módulo de gestión de pacientes
 * Maneja todas las operaciones relacionadas con fichas de pacientes
 */

import { generarId, formatearRut, autocompletarRut, validarRut, formatearEmail, sugerirEmail, validarEmail, validarEmailTiempoReal, formatearTelefono, sugerirTelefono, validarTelefono, mostrarNotificacion } from '../utils.js';
import { fichasAPI, tiposFichaEspecificaAPI, fichasEspecificasAPI } from '../api-client.js';
import { TIPOS_PIEL, ZONAS_TRATAMIENTO } from '../constants.js';

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
  const telefonoInput = document.getElementById('telefonoPaciente');
  const codigoPaisSelect = document.getElementById('codigoPais');
  
  if (pacienteSelect) {
    pacienteSelect.addEventListener('change', cargarPacienteSeleccionado);
  }
  
  // Configurar RUT
  if (rutInput) {
    rutInput.addEventListener('input', formatearRutTiempoReal);
    rutInput.addEventListener('blur', validarRutFinal);
    rutInput.addEventListener('keydown', manejarTeclasRut);
  }
  
  // Configurar Email
  if (emailInput) {
    emailInput.addEventListener('input', manejarEmailTiempoReal);
    emailInput.addEventListener('blur', validarEmailFinal);
  }
  
  // Configurar Teléfono
  if (telefonoInput) {
    telefonoInput.addEventListener('input', formatearTelefonoTiempoReal);
    telefonoInput.addEventListener('blur', validarTelefonoFinal);
  }
  
  // Configurar selector de país
  if (codigoPaisSelect) {
    codigoPaisSelect.addEventListener('change', () => {
      // Revalidar teléfono cuando cambie el país
      if (telefonoInput.value.trim()) {
        formatearTelefonoTiempoReal({ target: telefonoInput });
      }
    });
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
export async function cargarPacientesSelect() {
  try {
    const selects = document.querySelectorAll('#pacienteSelect, #clienteVenta, #pacienteSesion');
    const response = await fichasAPI.getAll();
    const pacientes = response.data || response;
    
    selects.forEach(select => {
      if (!select) return;
      
      const opcionVacia = select.id === 'pacienteSelect' 
        ? '-- Crear nuevo paciente --' 
        : '-- Seleccionar paciente --';
      
      select.innerHTML = `<option value="">${opcionVacia}</option>`;
      
      pacientes.forEach(paciente => {
        const option = document.createElement('option');
        option.value = paciente.id.toString();
        option.textContent = `${paciente.nombres} ${paciente.apellidos} - ${paciente.rut || paciente.codigo}`;
        select.appendChild(option);
      });
    });
  } catch (error) {
    console.error('Error cargando pacientes:', error);
    mostrarMensaje('Error cargando pacientes', 'error');
  }
}

/**
 * Carga los datos de un paciente seleccionado
 */
async function cargarPacienteSeleccionado() {
  const select = document.getElementById('pacienteSelect');
  const pacienteId = parseInt(select.value);
  
  if (!pacienteId) {
    limpiarFormularioPaciente();
    pacienteActual = null;
    return;
  }
  
    try {
    const paciente = await fichasAPI.getById(pacienteId);
    if (!paciente) return;
   
    pacienteActual = paciente;
    
    // Cargar datos básicos
    document.getElementById('nombrePaciente').value = paciente.nombres || '';
    document.getElementById('rutPaciente').value = paciente.rut || '';
    document.getElementById('edadPaciente').value = paciente.edad || '';
    document.getElementById('telefonoPaciente').value = paciente.telefono || '';
    document.getElementById('emailPaciente').value = paciente.email || '';
    document.getElementById('observacionesPaciente').value = paciente.observaciones || '';
  
    // Cargar fichas específicas
    const fichasEspecificas = paciente.fichas_especificas || [];
    
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
  } catch (error) {
    console.error('Error cargando paciente:', error);
    mostrarMensaje('Error cargando paciente', 'error');
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
 * Formatea RUT en tiempo real mientras el usuario escribe
 */
function formatearRutTiempoReal(event) {
  const input = event.target;
  const valor = input.value;
  const cursorPos = input.selectionStart;
  
  // Limpiar y formatear
  const soloNumeros = valor.replace(/[^0-9kK]/g, '');
  let rutFormateado = '';
  
  if (soloNumeros.length === 0) {
    input.value = '';
    return;
  }
  
  // Formatear según la longitud
  if (soloNumeros.length <= 7) {
    // Solo números, sin DV aún - aplicar puntos
    rutFormateado = soloNumeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  } else if (soloNumeros.length === 8) {
    // Con DV, formatear completo
    const cuerpo = soloNumeros.slice(0, 7);  // Primeros 7 dígitos
    const dv = soloNumeros.slice(7).toUpperCase();  // Último dígito
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    rutFormateado = `${cuerpoFormateado}-${dv}`;
  } else if (soloNumeros.length === 9) {
    // RUT con 9 dígitos (ej: 183648276)
    const cuerpo = soloNumeros.slice(0, 8);  // Primeros 8 dígitos
    const dv = soloNumeros.slice(8).toUpperCase();  // Último dígito
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    rutFormateado = `${cuerpoFormateado}-${dv}`;
  } else {
    // Muy largo, mantener solo los primeros 9 caracteres
    const rutRecortado = soloNumeros.slice(0, 9);
    const cuerpo = rutRecortado.slice(0, 8);
    const dv = rutRecortado.slice(8).toUpperCase();
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    rutFormateado = `${cuerpoFormateado}-${dv}`;
  }
  
  input.value = rutFormateado;
  
  // Restaurar posición del cursor de forma inteligente
  const nuevaPos = Math.min(cursorPos + (rutFormateado.length - valor.length), rutFormateado.length);
  setTimeout(() => {
    input.setSelectionRange(nuevaPos, nuevaPos);
  }, 0);
  
  // Limpiar estilos de error mientras escribe
  input.classList.remove('error', 'success');
}

/**
 * Autocompletar RUT con dígito verificador
 */
function autocompletarRutInput(event) {
  const input = event.target;
  const valor = input.value.replace(/[^0-9]/g, '');
  
  // Solo autocompletar si tiene exactamente 7 números (para calcular DV)
  if (valor.length === 7) {
    const rutCompleto = autocompletarRut(valor);
    input.value = rutCompleto;
    
    // Mover cursor al final
    setTimeout(() => {
      input.setSelectionRange(rutCompleto.length, rutCompleto.length);
    }, 0);
  }
}

/**
 * Maneja teclas especiales en el input de RUT
 */
function manejarTeclasRut(event) {
  const input = event.target;
  
  // TAB: autocompletar RUT si tiene 7 dígitos
  if (event.key === 'Tab') {
    const soloNumeros = input.value.replace(/[^0-9]/g, '');
    if (soloNumeros.length === 7) {
      event.preventDefault();
      autocompletarRutInput(event);
      
      // Luego permitir que el TAB continúe al siguiente campo
      setTimeout(() => {
        const nextElement = input.form?.elements[Array.from(input.form.elements).indexOf(input) + 1];
        if (nextElement) nextElement.focus();
      }, 0);
    }
  }
  
  // ENTER: autocompletar y validar
  if (event.key === 'Enter') {
    event.preventDefault();
    autocompletarRutInput(event);
    validarRutFinal(event);
  }
}

/**
 * Valida RUT al salir del campo
 */
function validarRutFinal(event) {
  const input = event.target;
  const rut = input.value.trim();
  
  if (!rut) {
    input.classList.remove('error', 'success');
    return;
  }
  
  if (validarRut(rut)) {
    input.value = formatearRut(rut);
    input.classList.remove('error');
    input.classList.add('success');
  } else {
    input.classList.add('error');
    input.classList.remove('success');
    
    // Mostrar sugerencia si tiene 7 dígitos
    const soloNumeros = rut.replace(/[^0-9]/g, '');
    if (soloNumeros.length === 7) {
      const rutSugerido = autocompletarRut(soloNumeros);
      const confirmar = confirm(`¿Quisiste decir ${rutSugerido}?`);
      if (confirmar) {
        input.value = rutSugerido;
        input.classList.remove('error');
        input.classList.add('success');
      }
    }
  }
}

/**
 * Maneja email en tiempo real mientras el usuario escribe
 */
function manejarEmailTiempoReal(event) {
  const input = event.target;
  const email = input.value;
  
  // Formatear automáticamente (minúsculas, sin espacios)
  const emailFormateado = formatearEmail(email);
  if (emailFormateado !== email) {
    const cursorPos = input.selectionStart;
    input.value = emailFormateado;
    setTimeout(() => {
      input.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  }
  
  // Validar en tiempo real
  const validacion = validarEmailTiempoReal(emailFormateado);
  
  if (!validacion.valido) {
    input.classList.add('error');
    input.classList.remove('success');
    input.title = validacion.mensaje;
  } else {
    input.classList.remove('error');
    input.title = '';
    
    // Si parece completo, mostrar como éxito
    if (emailFormateado.includes('@') && emailFormateado.includes('.') && emailFormateado.length > 5) {
      if (validarEmail(emailFormateado)) {
        input.classList.add('success');
      } else {
        input.classList.remove('success');
      }
    } else {
      input.classList.remove('success');
    }
  }
}

/**
 * Valida email al salir del campo
 */
function validarEmailFinal(event) {
  const input = event.target;
  const email = input.value.trim();
  
  if (!email) {
    input.classList.remove('error', 'success');
    input.title = '';
    return;
  }
  
  if (validarEmail(email)) {
    input.classList.remove('error');
    input.classList.add('success');
    input.title = '';
  } else {
    input.classList.add('error');
    input.classList.remove('success');
    
    // Sugerir corrección si es posible
    const sugerencia = sugerirEmail(email);
    if (sugerencia) {
      const confirmar = confirm(`¿Quisiste decir "${sugerencia}"?`);
      if (confirmar) {
        input.value = sugerencia;
        input.classList.remove('error');
        input.classList.add('success');
        input.title = '';
      }
    } else {
      input.title = 'Email no válido';
    }
  }
}

/**
 * Formatea teléfono en tiempo real
 */
function formatearTelefonoTiempoReal(event) {
  const input = event.target;
  const telefono = input.value;
  const cursorPos = input.selectionStart;
  
  // Formatear automáticamente (sin código de país)
  const telefonoFormateado = formatearTelefono(telefono);
  
  if (telefonoFormateado !== telefono) {
    input.value = telefonoFormateado;
    
    // Restaurar posición del cursor
    const diferencia = telefonoFormateado.length - telefono.length;
    const nuevaPos = Math.min(Math.max(cursorPos + diferencia, 0), telefonoFormateado.length);
    setTimeout(() => {
      input.setSelectionRange(nuevaPos, nuevaPos);
    }, 0);
  }
  
  // Validar en tiempo real
  const codigoPais = document.getElementById('codigoPais').value;
  const telefonoCompleto = codigoPais + ' ' + telefonoFormateado;
  
  if (telefonoFormateado.length === 0) {
    input.classList.remove('error', 'success');
    input.title = '';
  } else if (validarTelefono(telefonoCompleto)) {
    input.classList.remove('error');
    input.classList.add('success');
    input.title = '';
  } else {
    input.classList.add('error');
    input.classList.remove('success');
    
    // Mostrar ayuda según el código de país
    if (codigoPais === '+56') {
      input.title = 'Móvil: 9 XXXX XXXX | Fijo: 2 XXXX XXXX';
    } else {
      input.title = 'Formato de teléfono no válido';
    }
  }
}

/**
 * Valida teléfono al salir del campo
 */
function validarTelefonoFinal(event) {
  const input = event.target;
  const telefono = input.value.trim();
  const codigoPais = document.getElementById('codigoPais').value;
  
  if (!telefono) {
    input.classList.remove('error', 'success');
    input.title = '';
    return;
  }
  
  const telefonoCompleto = codigoPais + ' ' + telefono;
  
  if (validarTelefono(telefonoCompleto)) {
    input.classList.remove('error');
    input.classList.add('success');
    input.title = '';
  } else {
    input.classList.add('error');
    input.classList.remove('success');
    
    // Sugerir corrección para números chilenos
    if (codigoPais === '+56') {
      const soloNumeros = telefono.replace(/\D/g, '');
      
      if (soloNumeros.length === 8 && soloNumeros.startsWith('9')) {
        // Le falta un dígito al móvil
        input.title = 'Móvil chileno debe tener 9 dígitos (ej: 9 5359 1938)';
      } else if (soloNumeros.length === 9 && !soloNumeros.startsWith('9')) {
        // Es fijo con 9 dígitos?
        input.title = 'Fijo chileno debe tener 8 dígitos (ej: 2 1234 5678)';
      } else {
        input.title = 'Móvil: 9 XXXX XXXX | Fijo: 2 XXXX XXXX';
      }
    } else {
      input.title = 'Formato de teléfono no válido para este país';
    }
  }
}

/**
 * Valida los datos del formulario de paciente
 */
function validarFormularioPaciente() {
  const nombre = document.getElementById('nombrePaciente').value.trim();
  const rut = document.getElementById('rutPaciente').value.trim();
  const email = document.getElementById('emailPaciente').value.trim();
  const telefono = document.getElementById('telefonoPaciente').value.trim();
  
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
  
  if (telefono) {
    const codigoPais = document.getElementById('codigoPais').value;
    const telefonoCompleto = codigoPais + ' ' + telefono;
    if (!validarTelefono(telefonoCompleto)) {
      errores.push('El teléfono no es válido');
    }
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
export async function guardarPacienteFormulario() {
  const errores = validarFormularioPaciente();
  
  if (errores.length > 0) {
    mostrarNotificacion(`Errores en el formulario:\n${errores.join('\n')}`, 'error');
    return false;
  }
  
  const esNuevo = !pacienteActual;
  const datosEspecificos = obtenerDatosFichasEspecificas();
  
  const paciente = {
    id: pacienteActual?.id,
    nombres: document.getElementById('nombrePaciente').value.trim(),
    rut: formatearRut(document.getElementById('rutPaciente').value.trim()),
    telefono: document.getElementById('telefonoPaciente').value.trim(),
    email: document.getElementById('emailPaciente').value.trim(),
    ...datosEspecificos
  };
  
  try {
    let pacienteGuardado;
    if (esNuevo) {
      pacienteGuardado = await fichasAPI.create(paciente);
    } else {
      pacienteGuardado = await fichasAPI.update(paciente.id, paciente);
    }
    
    pacienteActual = pacienteGuardado;
    
    await cargarPacientesSelect();
    
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
export async function buscarPacientes(termino) {
  if (!termino || termino.length < 2) {
    return await fichasAPI.getAll();
  }
  
  return await fichasAPI.search(termino);
}

/**
 * Obtiene el paciente actual
 */
export function obtenerPacienteActual() {
  return pacienteActual;
}
