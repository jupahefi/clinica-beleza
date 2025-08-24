/**
 * Módulo de gestión de pacientes
 * Maneja todas las operaciones relacionadas con fichas de pacientes
 */

import { generarId, formatearRut, autocompletarRut, validarRut, formatearEmail, sugerirEmail, validarEmail, validarEmailTiempoReal, formatearTelefono, sugerirTelefono, validarTelefono, mostrarNotificacion } from '../utils.js';
import { fichasAPI, tiposFichaEspecificaAPI, fichasEspecificasAPI } from '../api-client.js';
// Las constantes se obtienen desde la API, no desde constants.js

export class PacientesModule {
    constructor() {
        this.pacienteActual = null;
        this.pacientes = []; // Array para almacenar la lista de pacientes
        this.init();
    }
    
    init() {
        this.cargarPacientesSelect();
        this.configurarEventosPacientes();
        this.configurarValidacionFecha();
        
        // Actualizar estadísticas después de cargar pacientes
        setTimeout(() => {
            if (window.clinicaApp) {
                window.clinicaApp.showQuickStats();
            }
        }, 1000);
    }
    
    configurarEventosPacientes() {
  const pacienteSelect = document.getElementById('pacienteSelect');
  const rutInput = document.getElementById('rutPaciente');
  const emailInput = document.getElementById('emailPaciente');
  const telefonoInput = document.getElementById('telefonoPaciente');
  const codigoPaisSelect = document.getElementById('codigoPais');
  
  if (pacienteSelect) {
            pacienteSelect.addEventListener('change', () => this.cargarPacienteSeleccionado());
  }
  
  // Configurar RUT
  if (rutInput) {
            rutInput.addEventListener('input', (e) => this.formatearRutTiempoReal(e));
            rutInput.addEventListener('blur', () => this.validarRutFinal());
            rutInput.addEventListener('keydown', (e) => this.manejarTeclasRut(e));
  }
  
  // Configurar Email
  if (emailInput) {
            emailInput.addEventListener('input', (e) => this.manejarEmailTiempoReal(e));
            emailInput.addEventListener('blur', () => this.validarEmailFinal());
  }
  
  // Configurar Teléfono
  if (telefonoInput) {
            telefonoInput.addEventListener('input', (e) => this.formatearTelefonoTiempoReal(e));
            telefonoInput.addEventListener('blur', () => this.validarTelefonoFinal());
  }
  
  // Configurar selector de país
  if (codigoPaisSelect) {
    codigoPaisSelect.addEventListener('change', () => {
      // Revalidar teléfono cuando cambie el país
      if (telefonoInput.value.trim()) {
                    this.formatearTelefonoTiempoReal({ target: telefonoInput });
      }
    });
  }
  
  
        
        // Configurar búsqueda de pacientes
        const buscarInput = document.getElementById('buscarPaciente');
        if (buscarInput) {
            buscarInput.addEventListener('input', (e) => this.buscarPacientesEnTabla(e.target.value));
        }
        
        // Configurar formulario de paciente (AJAX)
        const pacienteForm = document.getElementById('pacienteForm');
        if (pacienteForm) {
            pacienteForm.addEventListener('submit', async (e) => {
                e.preventDefault(); // Prevenir envío tradicional
                
                const submitBtn = pacienteForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                
                try {
                    // Mostrar loading
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                    submitBtn.disabled = true;
                    
                    // Guardar paciente
                    const success = await this.guardarPacienteFormulario();
                    
                    if (success) {
                        // Limpiar formulario si fue exitoso
                        this.limpiarFormularioPaciente();
                    }
                    
                } catch (error) {
                    console.error('Error en formulario paciente:', error);
                    mostrarNotificacion(`Error inesperado: ${error.message}`, 'error');
                } finally {
                    // Restaurar botón
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
        
        // Configurar capitalización automática para nombres y apellidos
        const nombresInput = document.getElementById('nombresPaciente');
        const apellidosInput = document.getElementById('apellidosPaciente');
        
        if (nombresInput) {
            nombresInput.addEventListener('blur', (e) => {
                e.target.value = this.capitalizarTexto(e.target.value);
            });
        }
        
        if (apellidosInput) {
            apellidosInput.addEventListener('blur', (e) => {
                e.target.value = this.capitalizarTexto(e.target.value);
            });
        }
    }
    
    async cargarPacientesSelect() {
  try {
    const selects = document.querySelectorAll('#pacienteSelect, #clienteVenta, #pacienteSesion');
    const response = await fichasAPI.getAll();
    const pacientes = response.data || response;
            
            // Guardar la lista de pacientes en la instancia
            this.pacientes = pacientes;
    
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
            
            // Actualizar también la tabla de pacientes registrados
            this.actualizarTablaPacientes();
            
  } catch (error) {
    console.error('Error cargando pacientes:', error);
            mostrarNotificacion('Error cargando pacientes', 'error');
        }
    }
    
    async cargarPacientes() {
        return this.cargarPacientesSelect();
    }
    
    async loadPacientes() {
        // Alias para compatibilidad con main.js
        return this.cargarPacientes();
    }
    
    actualizarTablaPacientes() {
        const tbody = document.getElementById('cuerpoTablaPacientes');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.pacientes.forEach(paciente => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Nombre">${paciente.nombres} ${paciente.apellidos}</td>
                <td data-label="Teléfono">${paciente.telefono || '-'}</td>
                <td data-label="Email">${paciente.email || '-'}</td>
                <td data-label="Fecha Nac.">${paciente.fecha_nacimiento ? new Date(paciente.fecha_nacimiento).toLocaleDateString('es-CL') : '-'}</td>
                <td data-label="Acciones" class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="window.clinicaApp.getModule('pacientes').editarPaciente(${paciente.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.clinicaApp.getModule('pacientes').eliminarPaciente(${paciente.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async cargarPacienteSeleccionado() {
        const pacienteSelect = document.getElementById('pacienteSelect');
        const pacienteId = pacienteSelect?.value;
  
  if (!pacienteId) {
            this.limpiarFormularioPaciente();
            this.pacienteActual = null;
            
            // Ocultar fichas específicas para nuevo paciente
            const fichasEspecificasContainer = document.getElementById('fichasEspecificasContainer');
            if (fichasEspecificasContainer) {
                fichasEspecificasContainer.style.display = 'none';
            }
            
    return;
  }
  
    try {
            const paciente = await fichasAPI.getById(parseInt(pacienteId));
            this.pacienteActual = paciente;
            this.llenarFormularioPaciente(paciente);
  } catch (error) {
    console.error('Error cargando paciente:', error);
            mostrarNotificacion('Error cargando paciente', 'error');
        }
    }
    

    
    llenarFormularioPaciente(paciente) {
        // Llenar campos principales (solo los que existen en el HTML)
        const nombresElement = document.getElementById('nombresPaciente');
        if (nombresElement) {
            nombresElement.value = paciente.nombres || '';
        }
        
        const apellidosElement = document.getElementById('apellidosPaciente');
        if (apellidosElement) {
            apellidosElement.value = paciente.apellidos || '';
        }
        
        const rutElement = document.getElementById('rutPaciente');
        if (rutElement) {
            rutElement.value = paciente.rut || '';
        }
        
        const fechaElement = document.getElementById('fechaNacimiento');
        if (fechaElement) {
            fechaElement.value = paciente.fecha_nacimiento || '';
        }
        
        const telefonoElement = document.getElementById('telefonoPaciente');
        if (telefonoElement) {
            telefonoElement.value = paciente.telefono || '';
        }
        
        const emailElement = document.getElementById('emailPaciente');
        if (emailElement) {
            emailElement.value = paciente.email || '';
        }
        
        const direccionElement = document.getElementById('direccionPaciente');
        if (direccionElement) {
            direccionElement.value = paciente.direccion || '';
        }
        
        const observacionesElement = document.getElementById('observacionesPaciente');
        if (observacionesElement) {
            observacionesElement.value = paciente.observaciones || '';
        }
        
        // Llenar fichas específicas si existen
        this.llenarFichasEspecificas(paciente);
    }
    


    llenarFichasEspecificas(paciente) {
        const container = document.getElementById('fichasEspecificasContainer');
        const fichaDepilacionCard = document.getElementById('fichaDepilacionCard');
        const fichaCorporalCard = document.getElementById('fichaCorporalCard');
        
        if (!container) return;
        
        // Ocultar contenedor por defecto
        container.style.display = 'none';
        fichaDepilacionCard.style.display = 'none';
        fichaCorporalCard.style.display = 'none';
        
        // Mostrar fichas específicas si existen
        if (paciente.fichas_especificas && paciente.fichas_especificas.length > 0) {
            container.style.display = 'block';
            
            paciente.fichas_especificas.forEach(ficha => {
                if (ficha.tipo === 'depilacion') {
                    fichaDepilacionCard.style.display = 'block';
                    const zonasElement = document.getElementById('zonasDepilacion');
                    const observacionesElement = document.getElementById('observacionesMedicas');
                    
                    if (zonasElement) zonasElement.value = ficha.datos?.zonas || '';
                    if (observacionesElement) observacionesElement.value = ficha.datos?.observaciones_medicas || '';
                }
                
                if (ficha.tipo === 'corporal') {
                    fichaCorporalCard.style.display = 'block';
                    const tratamientosElement = document.getElementById('tratamientosPrevios');
                    const objetivoElement = document.getElementById('objetivoEstetico');
                    
                    if (tratamientosElement) tratamientosElement.value = ficha.datos?.tratamientos_previos || '';
                    if (objetivoElement) objetivoElement.value = ficha.datos?.objetivo_estetico || '';
                }
            });
        }
    }
    

    
    formatearRutTiempoReal(event) {
  const input = event.target;
  const valor = input.value;
  const cursorPos = input.selectionStart;
  
        const rutFormateado = formatearRut(valor);
  input.value = rutFormateado;
  
        // Restaurar posición del cursor
  const nuevaPos = Math.min(cursorPos + (rutFormateado.length - valor.length), rutFormateado.length);
    input.setSelectionRange(nuevaPos, nuevaPos);
    }
    
    validarRutFinal() {
        const rutInput = document.getElementById('rutPaciente');
        const rut = rutInput.value.trim();
        
        if (rut && !validarRut(rut)) {
            mostrarNotificacion('RUT inválido', 'error');
            rutInput.focus();
            return false;
        }
        
        return true;
    }
    
    manejarTeclasRut(event) {
  if (event.key === 'Enter') {
            const rut = event.target.value.trim();
            if (rut && rut.length >= 7) {
                const rutCompleto = autocompletarRut(rut);
                event.target.value = rutCompleto;
                this.validarRutFinal();
            }
        }
    }
    
    manejarEmailTiempoReal(event) {
  const input = event.target;
        const email = input.value.trim();
        
        if (email) {
            const validacion = validarEmailTiempoReal(email);
  if (!validacion.valido) {
    input.classList.add('error');
                this.mostrarSugerenciaEmail(email);
  } else {
    input.classList.remove('error');
                this.ocultarSugerenciaEmail();
      }
    } else {
            input.classList.remove('error');
            this.ocultarSugerenciaEmail();
        }
    }
    
    validarEmailFinal() {
        const emailInput = document.getElementById('emailPaciente');
        const email = emailInput.value.trim();
        
        if (email && !validarEmail(email)) {
            mostrarNotificacion('Email inválido', 'error');
            emailInput.focus();
            return false;
        }
        
        return true;
    }
    
    mostrarSugerenciaEmail(email) {
    const sugerencia = sugerirEmail(email);
    if (sugerencia) {
            let sugerenciaElement = document.getElementById('sugerenciaEmail');
            if (!sugerenciaElement) {
                sugerenciaElement = document.createElement('div');
                sugerenciaElement.id = 'sugerenciaEmail';
                sugerenciaElement.className = 'sugerencia-email';
                document.getElementById('emailPaciente').parentNode.appendChild(sugerenciaElement);
            }
            sugerenciaElement.textContent = `¿Quisiste decir: ${sugerencia}?`;
            sugerenciaElement.style.display = 'block';
        }
    }
    
    ocultarSugerenciaEmail() {
        const sugerenciaElement = document.getElementById('sugerenciaEmail');
        if (sugerenciaElement) {
            sugerenciaElement.style.display = 'none';
        }
    }
    
    formatearTelefonoTiempoReal(event) {
  const input = event.target;
        const valor = input.value;
  const cursorPos = input.selectionStart;
  
        const telefonoFormateado = formatearTelefono(valor);
    input.value = telefonoFormateado;
    
    // Restaurar posición del cursor
        const nuevaPos = Math.min(cursorPos + (telefonoFormateado.length - valor.length), telefonoFormateado.length);
      input.setSelectionRange(nuevaPos, nuevaPos);
    }
    
    validarTelefonoFinal() {
        const telefonoInput = document.getElementById('telefonoPaciente');
        const telefono = telefonoInput.value.trim();
        
        if (telefono && !validarTelefono(telefono)) {
            mostrarNotificacion('Teléfono inválido', 'error');
            telefonoInput.focus();
            return false;
        }
        
        return true;
    }
    
    configurarValidacionFecha() {
        const fechaInput = document.getElementById('fechaNacimiento');
        if (fechaInput) {
            // Establecer fecha máxima como hoy (no puede nacer en el futuro)
            const hoy = new Date();
            const fechaMaxima = hoy.toISOString().split('T')[0];
            fechaInput.setAttribute('max', fechaMaxima);
            
            // Agregar validación adicional en tiempo real
            fechaInput.addEventListener('change', () => {
                const fechaSeleccionada = new Date(fechaInput.value);
                const fechaActual = new Date();
                
                if (fechaSeleccionada > fechaActual) {
                    mostrarNotificacion('La fecha de nacimiento no puede ser futura', 'error');
                    fechaInput.value = '';
                    fechaInput.focus();
                }
            });
        }
    }
    
    validarFormularioPaciente() {
  const errores = [];
  
        // Validar nombres
        const nombres = document.getElementById('nombresPaciente').value.trim();
  if (!nombres) {
            errores.push('Los nombres son obligatorios');
  }
  
        // Validar apellidos
        const apellidos = document.getElementById('apellidosPaciente').value.trim();
  if (!apellidos) {
            errores.push('Los apellidos son obligatorios');
  }
  
        // Validar RUT
        const rut = document.getElementById('rutPaciente').value.trim();
  if (!rut) {
            errores.push('El RUT es obligatorio');
        }
        
        // Validar fecha de nacimiento
        const fechaNacimiento = document.getElementById('fechaNacimiento').value;
        if (fechaNacimiento) {
            const fechaSeleccionada = new Date(fechaNacimiento);
            const fechaActual = new Date();
            if (fechaSeleccionada > fechaActual) {
                errores.push('La fecha de nacimiento no puede ser futura');
            }
        }
        
        // Validar email
        const email = document.getElementById('emailPaciente').value.trim();
  if (email && !validarEmail(email)) {
            errores.push('Email inválido');
        }
        
        // Validar teléfono
        const telefono = document.getElementById('telefonoPaciente').value.trim();
        if (telefono && !validarTelefono(telefono)) {
            errores.push('Teléfono inválido');
  }
  
  return errores;
}

        obtenerDatosFichasEspecificas() {
        return {};
    }

    async guardarPacienteFormulario() {
        const errores = this.validarFormularioPaciente();
  
  if (errores.length > 0) {
    mostrarNotificacion(`Errores en el formulario:\n${errores.join('\n')}`, 'error');
    return false;
  }
  
        const esNuevo = !this.pacienteActual;
        const datosEspecificos = this.obtenerDatosFichasEspecificas();
        
        // Obtener nombres y apellidos directamente, capitalizados y trimmed
        const nombres = this.capitalizarTexto(document.getElementById('nombresPaciente').value.trim());
        const apellidos = this.capitalizarTexto(document.getElementById('apellidosPaciente').value.trim());
  
  const paciente = {
            id: this.pacienteActual?.id,
            codigo: 'PAC' + Date.now(), // Generar código único
            nombres: nombres,
            apellidos: apellidos,
            rut: document.getElementById('rutPaciente').value.trim(),
    fecha_nacimiento: document.getElementById('fechaNacimiento').value,
    telefono: document.getElementById('telefonoPaciente').value.trim(),
    email: document.getElementById('emailPaciente').value.trim(),
    direccion: document.getElementById('direccionPaciente').value.trim(),
    observaciones: document.getElementById('observacionesPaciente').value.trim(),
    ...datosEspecificos
  };
  
  // Log para debugging
  console.log('📤 Datos del paciente a enviar:', paciente);
  
  try {
    let pacienteGuardado;
    if (esNuevo) {
      pacienteGuardado = await fichasAPI.create(paciente);
    } else {
      pacienteGuardado = await fichasAPI.update(paciente.id, paciente);
    }
    
            this.pacienteActual = pacienteGuardado;
            
            await this.cargarPacientesSelect();
    
            // Actualizar estadísticas
            if (window.clinicaApp) {
                window.clinicaApp.showQuickStats();
            }
    
    const mensaje = esNuevo ? 'Paciente creado exitosamente' : 'Paciente actualizado exitosamente';
    mostrarNotificacion(mensaje, 'success');
    
    return true;
  } catch (error) {
    mostrarNotificacion(`Error al guardar paciente: ${error.message}`, 'error');
    return false;
  }
}

    async buscarPacientes(termino) {
  if (!termino || termino.length < 2) {
    return await fichasAPI.getAll();
  }
  
  return await fichasAPI.search(termino);
}

    buscarPacientesEnTabla(termino) {
        const tbody = document.getElementById('cuerpoTablaPacientes');
        if (!tbody) return;
        
        const filas = tbody.querySelectorAll('tr');
        
        filas.forEach(fila => {
            const texto = fila.textContent.toLowerCase();
            const coincide = texto.includes(termino.toLowerCase());
            fila.style.display = coincide ? '' : 'none';
        });
    }
    
    obtenerPacienteActual() {
        return this.pacienteActual;
    }
    
    async editarPaciente(id) {
        try {
            const paciente = await fichasAPI.getById(id);
            this.pacienteActual = paciente;
            this.llenarFormularioPaciente(paciente);
            mostrarNotificacion('Paciente cargado para edición', 'info');
        } catch (error) {
            console.error('Error cargando paciente para edición:', error);
            mostrarNotificacion('Error cargando paciente', 'error');
        }
    }
    
    async eliminarPaciente(id) {
        if (!confirm('¿Está seguro de que desea eliminar este paciente?')) {
            return;
        }
        
        try {
            await fichasAPI.delete(id);
            await this.cargarPacientesSelect(); // Esto también actualizará la tabla
            mostrarNotificacion('Paciente eliminado exitosamente', 'success');
        } catch (error) {
            console.error('Error eliminando paciente:', error);
            mostrarNotificacion('Error eliminando paciente', 'error');
        }
    }
    
    capitalizarTexto(texto) {
        if (!texto) return '';
        
        // Dividir por espacios y capitalizar cada palabra
        return texto.split(' ')
            .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
            .join(' ')
            .trim();
    }
    
    limpiarFormularioPaciente() {
        // Limpiar campos principales con verificación de existencia
        const campos = [
            'nombresPaciente', 'apellidosPaciente', 'rutPaciente', 'telefonoPaciente', 'emailPaciente', 
            'fechaNacimiento', 'direccionPaciente', 'observacionesPaciente'
        ];
        
        campos.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) elemento.value = '';
        });
        

        
        // Ocultar fichas específicas
        const fichasEspecificasContainer = document.getElementById('fichasEspecificasContainer');
        if (fichasEspecificasContainer) {
            fichasEspecificasContainer.style.display = 'none';
        }
        
        // Resetear paciente actual
        this.pacienteActual = null;
        
        mostrarNotificacion('Formulario limpiado', 'info');
    }
}

// Exportar instancia global
export const pacientesModule = new PacientesModule();
