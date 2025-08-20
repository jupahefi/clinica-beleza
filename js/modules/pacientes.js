/**
 * Módulo de gestión de pacientes
 * Maneja todas las operaciones relacionadas con fichas de pacientes
 */

import { generarId, formatearRut, autocompletarRut, validarRut, formatearEmail, sugerirEmail, validarEmail, validarEmailTiempoReal, formatearTelefono, sugerirTelefono, validarTelefono, mostrarNotificacion } from '../utils.js';
import { fichasAPI, tiposFichaEspecificaAPI, fichasEspecificasAPI } from '../api-client.js';
import { TIPOS_PIEL, ZONAS_TRATAMIENTO, FICHAS_ESPECIFICAS } from '../constants.js';

export class PacientesModule {
    constructor() {
        this.pacienteActual = null;
        this.init();
    }
    
    init() {
        this.cargarPacientesSelect();
        this.configurarEventosPacientes();
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
        
        // Configurar checkboxes de fichas específicas
        const checkboxFichas = document.querySelectorAll('input[type="checkbox"][id^="ficha"]');
        checkboxFichas.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.toggleFichasEspecificas());
        });
    }
    
    async cargarPacientesSelect() {
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
    
    async cargarPacienteSeleccionado() {
        const pacienteSelect = document.getElementById('pacienteSelect');
        const pacienteId = pacienteSelect?.value;
        
        if (!pacienteId) {
            this.limpiarFormularioPaciente();
            this.pacienteActual = null;
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
    
    limpiarFormularioPaciente() {
        const campos = [
            'nombrePaciente', 'rutPaciente', 'fechaNacimiento', 'telefonoPaciente',
            'emailPaciente', 'direccionPaciente', 'observacionesPaciente'
        ];
        
        campos.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) elemento.value = '';
        });
        
        // Limpiar fichas específicas
        this.limpiarFichasEspecificas();
    }
    
    llenarFormularioPaciente(paciente) {
        document.getElementById('nombrePaciente').value = paciente.nombres || '';
        document.getElementById('rutPaciente').value = paciente.rut || '';
        document.getElementById('fechaNacimiento').value = paciente.fecha_nacimiento || '';
        document.getElementById('telefonoPaciente').value = paciente.telefono || '';
        document.getElementById('emailPaciente').value = paciente.email || '';
        document.getElementById('direccionPaciente').value = paciente.direccion || '';
        document.getElementById('observacionesPaciente').value = paciente.observaciones || '';
        
        // Llenar fichas específicas si existen
        this.llenarFichasEspecificas(paciente);
    }
    
    limpiarFichasEspecificas() {
        const fichas = ['fichaDepilacion', 'fichaCorporal'];
        fichas.forEach(ficha => {
            const checkbox = document.getElementById(ficha);
            if (checkbox) checkbox.checked = false;
        });
        
        // Limpiar campos específicos
        const camposEspecificos = [
            'zonasDepilacion', 'observacionesMedicas',
            'tratamientosPrevios', 'objetivoEstetico'
        ];
        
        camposEspecificos.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) elemento.value = '';
        });
    }
    
    llenarFichasEspecificas(paciente) {
        if (paciente.fichasEspecificas) {
            paciente.fichasEspecificas.forEach(tipo => {
                const checkbox = document.getElementById(`ficha${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
                if (checkbox) {
                    checkbox.checked = true;
                    this.toggleFichasEspecificas();
                }
            });
        }
        
        // Llenar datos específicos si existen
        if (paciente.fichaDepilacion) {
            document.getElementById('zonasDepilacion').value = paciente.fichaDepilacion.zonas || '';
            document.getElementById('observacionesMedicas').value = paciente.fichaDepilacion.observacionesMedicas || '';
        }
        
        if (paciente.fichaCorporal) {
            document.getElementById('tratamientosPrevios').value = paciente.fichaCorporal.tratamientosPrevios || '';
            document.getElementById('objetivoEstetico').value = paciente.fichaCorporal.objetivoEstetico || '';
        }
    }
    
    toggleFichasEspecificas() {
        const fichaDepilacion = document.getElementById('fichaDepilacion');
        const fichaCorporal = document.getElementById('fichaCorporal');
        
        // Mostrar/ocultar sección de depilación
        const seccionDepilacion = document.getElementById('seccionDepilacion');
        if (seccionDepilacion) {
            seccionDepilacion.style.display = fichaDepilacion?.checked ? 'block' : 'none';
        }
        
        // Mostrar/ocultar sección corporal
        const seccionCorporal = document.getElementById('seccionCorporal');
        if (seccionCorporal) {
            seccionCorporal.style.display = fichaCorporal?.checked ? 'block' : 'none';
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
    
    validarFormularioPaciente() {
        const errores = [];
        
        // Validar nombre
        const nombre = document.getElementById('nombrePaciente').value.trim();
        if (!nombre) {
            errores.push('El nombre es obligatorio');
        }
        
        // Validar RUT
        const rut = document.getElementById('rutPaciente').value.trim();
        if (rut && !validarRut(rut)) {
            errores.push('RUT inválido');
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
        const fichasData = {};
        const fichasSeleccionadas = [];
        
        // Verificar ficha de depilación
        if (document.getElementById('fichaDepilacion')?.checked) {
            fichasSeleccionadas.push('depilacion');
            fichasData.fichaDepilacion = {
                zonas: document.getElementById('zonasDepilacion').value.trim(),
                observacionesMedicas: document.getElementById('observacionesMedicas').value.trim()
            };
        }
        
        // Verificar ficha corporal
        if (document.getElementById('fichaCorporal')?.checked) {
            fichasSeleccionadas.push('corporal');
            fichasData.fichaCorporal = {
                tratamientosPrevios: document.getElementById('tratamientosPrevios').value.trim(),
                objetivoEstetico: document.getElementById('objetivoEstetico').value.trim()
            };
        }
        
        return {
            fichasEspecificas: fichasSeleccionadas,
            ...fichasData
        };
    }
    
    async guardarPacienteFormulario() {
        const errores = this.validarFormularioPaciente();
        
        if (errores.length > 0) {
            mostrarNotificacion(`Errores en el formulario:\n${errores.join('\n')}`, 'error');
            return false;
        }
        
        const esNuevo = !this.pacienteActual;
        const datosEspecificos = this.obtenerDatosFichasEspecificas();
        
        const paciente = {
            id: this.pacienteActual?.id,
            nombres: document.getElementById('nombrePaciente').value.trim(),
            rut: formatearRut(document.getElementById('rutPaciente').value.trim()),
            fecha_nacimiento: document.getElementById('fechaNacimiento').value,
            telefono: document.getElementById('telefonoPaciente').value.trim(),
            email: document.getElementById('emailPaciente').value.trim(),
            direccion: document.getElementById('direccionPaciente').value.trim(),
            observaciones: document.getElementById('observacionesPaciente').value.trim(),
            ...datosEspecificos
        };
        
        try {
            let pacienteGuardado;
            if (esNuevo) {
                pacienteGuardado = await fichasAPI.create(paciente);
            } else {
                pacienteGuardado = await fichasAPI.update(paciente.id, paciente);
            }
            
            this.pacienteActual = pacienteGuardado;
            
            await this.cargarPacientesSelect();
            
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
    
    obtenerPacienteActual() {
        return this.pacienteActual;
    }
}

// Exportar instancia global
export const pacientesModule = new PacientesModule();
