/**
 * Módulo de Gestión de Sesiones
 * Maneja el agendamiento y control de sesiones de depilación
 */

// Las zonas se obtienen desde la API, no desde constantes
import { formatCurrency, formatDate, mostrarNotificacion, getCurrentProfesionalId } from '../utils.js';
import { sesionesAPI, fichasAPI } from '../api-client.js';
import '../calendar.js';

export class SesionesModule {
    constructor() {
        this.sesiones = [];
        this.zonas = []; // Zonas del cuerpo desde la API
        this.intensidades = {}; // Almacena intensidades por paciente y zona
        this.calendar = null; // Instancia del calendario
        this.init();
    }
    
    async init() {
        console.log('🚀 Inicializando módulo de sesiones...');
        try {
            await this.cargarZonas();
            console.log('✅ Zonas cargadas:', this.zonas.length);
            this.setupEventListeners();
            console.log('✅ Event listeners configurados');
            this.initCalendar();
            console.log('✅ Calendario inicializado');
            await this.loadSesiones();
            console.log('✅ Sesiones cargadas:', this.sesiones.length);
            await this.cargarPacientesSelect();
            console.log('✅ Select de pacientes cargado');
            await this.cargarVentasSelect();
            console.log('✅ Select de ventas cargado');
            await this.cargarBoxesSelect();
            console.log('✅ Select de boxes cargado');
            await this.cargarProfesionalesSelect();
            console.log('✅ Select de profesionales cargado');
        } catch (error) {
            console.error('❌ Error inicializando módulo de sesiones:', error);
            const errorMessage = error.message || 'Error desconocido inicializando módulo de sesiones';
            mostrarNotificacion(`Error inicializando módulo de sesiones: ${errorMessage}`, 'error');
        }
    }
    
    async cargarZonas() {
        try {
            // Importar zonasAPI dinámicamente
            const { zonasAPI } = await import('../api-client.js');
            this.zonas = await zonasAPI.getAll();
            console.log('✅ Zonas cargadas:', this.zonas.length);
        } catch (error) {
            console.error('❌ Error cargando zonas:', error);
            const errorMessage = error.message || 'Error desconocido cargando zonas';
            mostrarNotificacion(`Error cargando zonas: ${errorMessage}`, 'error');
            this.zonas = [];
        }
    }
    
    initCalendar() {
        console.log('🔍 Inicializando calendario...');
        
        // Intentar inicializar inmediatamente
        this.tryInitCalendar();
        
        // Si no funciona, intentar después de un pequeño delay
        setTimeout(() => {
            if (!this.calendar) {
                console.log('🔄 Reintentando inicialización del calendario...');
                this.tryInitCalendar();
            }
        }, 100);
        
        // También intentar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (!this.calendar) {
                    console.log('🔄 Inicializando calendario después de DOMContentLoaded...');
                    this.tryInitCalendar();
                }
            });
        }
    }
    
    tryInitCalendar() {
        const calendarContainer = document.getElementById('calendar-wrapper');
        console.log('📦 Contenedor encontrado:', calendarContainer);
        console.log('📅 Calendar disponible:', typeof Calendar !== 'undefined');
        
        if (calendarContainer && typeof Calendar !== 'undefined') {
            console.log('✅ Inicializando calendario...');
            
            // Generar eventos iniciales usando la misma lógica que updateCalendarEvents
            const events = this.sesiones.map(sesion => {
                // Extraer fecha y hora de fecha_planificada si es necesario
                let fecha, hora;
                
                if (sesion.fecha_planificada) {
                    if (typeof sesion.fecha_planificada === 'string' && sesion.fecha_planificada.includes(' ')) {
                        // Si fecha_planificada contiene fecha y hora (formato: "2025-08-23 08:00:00")
                        const [fechaPart, horaPart] = sesion.fecha_planificada.split(' ');
                        fecha = fechaPart;
                        hora = horaPart.substring(0, 5); // Tomar solo HH:MM
                    } else if (sesion.hora_planificada) {
                        // Si tenemos campos separados
                        fecha = sesion.fecha_planificada;
                        hora = sesion.hora_planificada;
                    } else {
                        // Solo fecha, usar hora por defecto
                        fecha = sesion.fecha_planificada;
                        hora = '09:00';
                    }
                }
                
                // Calcular duración (usar duración del pack o por defecto)
                const duracion = sesion.duracion_sesion_min || sesion.duracion || 60;
                
                // Crear título descriptivo
                const pacienteNombre = sesion.paciente_nombres && sesion.paciente_apellidos 
                    ? `${sesion.paciente_nombres} ${sesion.paciente_apellidos}`
                    : sesion.paciente_nombre || 'Paciente';
                
                const tratamientoNombre = sesion.tratamiento_nombre || sesion.tratamiento || 'Tratamiento';
                
                return {
                    id: sesion.id,
                    title: `${pacienteNombre} - ${tratamientoNombre}`,
                    start: `${fecha}T${hora}`,
                    end: this.calculateEndTime(fecha, hora, duracion),
                    backgroundColor: this.getEventColor(sesion.estado),
                    extendedProps: sesion
                };
            });
            
            this.calendar = new Calendar(calendarContainer, { events });
            console.log('✅ Calendario inicializado correctamente con', events.length, 'eventos');
        } else {
            console.error('❌ No se pudo inicializar el calendario');
            console.error('Contenedor:', calendarContainer);
            console.error('Calendar disponible:', typeof Calendar !== 'undefined');
        }
    }
    
    setupEventListeners() {
        // Si el DOM ya está listo, configurar inmediatamente
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupSesionForm();
                this.setupIntensidadesForm();
            });
        } else {
            // DOM ya está listo, configurar inmediatamente
            this.setupSesionForm();
            this.setupIntensidadesForm();
        }
    }
    
    setupSesionForm() {
        console.log('🔧 Configurando formulario de sesión...');
        const form = document.getElementById('sesionForm');
        console.log('📋 Formulario encontrado:', form);
        
        if (form) {
            console.log('✅ Agregando event listener al formulario');
            form.addEventListener('submit', (e) => {
                console.log('🎯 Evento submit del formulario detectado');
                e.preventDefault();
                console.log('✅ PreventDefault ejecutado, llamando crearSesion...');
                this.crearSesion();
            });
            console.log('✅ Event listener agregado al formulario');
        } else {
            console.error('❌ No se encontró el formulario de sesión');
        }
        
        // Configurar evento para cargar ventas cuando se selecciona un paciente
        this.configurarEventosPaciente();
    }
    
    configurarEventosPaciente() {
        const pacienteSelect = document.getElementById('pacienteSesion');
        if (!pacienteSelect) {
            console.error('❌ No se encontró el select de pacientes');
            return;
        }
        
        console.log('🔧 Configurando eventos para select de pacientes...');
        
        // Para Select2, usar el evento de jQuery
        if (typeof $ !== 'undefined' && $.fn.select2) {
            console.log('🔧 Usando eventos Select2');
            
            // Remover eventos anteriores si existen
            $(pacienteSelect).off('select2:select select2:clear');
            
            $(pacienteSelect).on('select2:select', (e) => {
                console.log('🔍 Paciente seleccionado (Select2):', e.params.data);
                this.cargarVentasPorPaciente(e.params.data.id);
            });
            
            $(pacienteSelect).on('select2:clear', () => {
                console.log('🔍 Paciente deseleccionado (Select2)');
                this.cargarVentasPorPaciente(null);
            });
            
            console.log('✅ Eventos Select2 configurados');
        } else {
            console.log('🔧 Usando eventos nativos');
            // Fallback para select normal
            pacienteSelect.removeEventListener('change', this.handlePacienteChange);
            pacienteSelect.addEventListener('change', this.handlePacienteChange.bind(this));
            console.log('✅ Eventos nativos configurados');
        }
        
        // Configurar eventos para el select de ventas
        this.configurarEventosVenta();
    }
    
    configurarEventosVenta() {
        const ventaSelect = document.getElementById('ventaSesion');
        if (!ventaSelect) {
            console.error('❌ No se encontró el select de ventas');
            return;
        }
        
        // El select de ventas es NATIVO, no Select2
        console.log('🔧 Configurando eventos NATIVOS para select de ventas...');
        
        // Remover TODOS los event listeners anteriores
        const newVentaSelect = ventaSelect.cloneNode(true);
        ventaSelect.parentNode.replaceChild(newVentaSelect, ventaSelect);
        
        // Agregar el event listener al nuevo elemento
        newVentaSelect.addEventListener('change', this.handleVentaChangeNative.bind(this));
        console.log('✅ Eventos nativos para ventas configurados (limpiados)');
    }
    
    handleVentaChangeNative(e) {
        console.log('🔍 Venta seleccionada (nativo):', e.target.value);
        this.handleVentaChange(e.target.value);
    }
    
    handleVentaChange(ventaId) {
        if (!ventaId) {
            console.log('🔍 Venta deseleccionada, limpiando duración');
            this.limpiarDuracionSesion();
            return;
        }
        
        console.log('🔍 Venta seleccionada, cargando duración para venta ID:', ventaId);
        this.cargarDuracionSesion(ventaId);
    }
    
    handlePacienteChange(e) {
        console.log('🔍 Paciente seleccionado (nativo):', e.target.value);
        this.cargarVentasPorPaciente(e.target.value);
    }
    
    setupIntensidadesForm() {
        // Crear formulario de intensidades si no existe
        const intensidadesContainer = document.getElementById('intensidades-container');
        if (intensidadesContainer) {
            this.createIntensidadesForm(intensidadesContainer);
        }
    }
    
    createIntensidadesForm(container) {
        container.innerHTML = `
            <div class="intensidades-form">
                <h4>⚡ Configuración de Intensidades por Zona</h4>
                <div class="intensidades-grid" id="intensidades-grid"></div>
                <div class="intensidades-actions">
                    <button type="button" class="btn btn-primary" onclick="sesionesModule.guardarIntensidades()">
                        💾 Guardar Intensidades
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="sesionesModule.cargarIntensidadesAnteriores()">
                        📋 Cargar Intensidades Anteriores
                    </button>
                </div>
            </div>
        `;
        
        this.renderIntensidadesGrid();
    }
    
    renderIntensidadesGrid() {
        const grid = document.getElementById('intensidades-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // Si no hay zonas cargadas, mostrar mensaje
        if (!this.zonas || this.zonas.length === 0) {
            grid.innerHTML = '<p>Cargando zonas...</p>';
            return;
        }
        
        this.zonas.forEach(zona => {
            const zonaDiv = document.createElement('div');
            zonaDiv.className = 'intensidad-zona';
            zonaDiv.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 15px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                background: white;
            `;
            
            zonaDiv.innerHTML = `
                <label class="zona-label" style="font-weight: 600; color: #333;">${zona.nombre}</label>
                <div class="intensidad-controls">
                    <label>Intensidad (J/cm²):</label>
                    <input type="number" 
                           id="intensidad_${zona.codigo}" 
                           class="intensidad-input" 
                           min="0" 
                           max="50" 
                           step="0.1" 
                           placeholder="0.0"
                           style="width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div class="intensidad-controls">
                    <label>Frecuencia (Hz):</label>
                    <input type="number" 
                           id="frecuencia_${zona.codigo}" 
                           class="frecuencia-input" 
                           min="1" 
                           max="10" 
                           step="0.1" 
                           placeholder="1.0"
                           style="width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div class="intensidad-controls">
                    <label>Duración (ms):</label>
                    <input type="number" 
                           id="duracion_${zona.codigo}" 
                           class="duracion-input" 
                           min="1" 
                           max="100" 
                           step="1" 
                           placeholder="10"
                           style="width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div class="intensidad-controls">
                    <label>Spot Size (mm):</label>
                    <select id="spot_${zona.codigo}" class="spot-select" style="width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="6">6</option>
                        <option value="8">8</option>
                        <option value="10">10</option>
                        <option value="12">12</option>
                        <option value="15">15</option>
                        <option value="18">18</option>
                    </select>
                </div>
                <div class="intensidad-controls">
                    <label>Observaciones:</label>
                    <textarea id="obs_${zona.codigo}" 
                              class="obs-textarea" 
                              rows="2" 
                              placeholder="Observaciones específicas..."
                              style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"></textarea>
                </div>
            `;
            
            grid.appendChild(zonaDiv);
        });
        
        // Aplicar estilos CSS
        const styles = `
            .intensidades-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin: 15px 0;
            }
            
            .intensidad-controls {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .intensidad-controls label {
                font-size: 12px;
                color: #666;
                font-weight: 500;
            }
            
            .intensidades-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
                justify-content: center;
            }
        `;
        
        if (!document.getElementById('intensidades-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'intensidades-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    }
    
    async crearSesion() {
        console.log('🚀 Iniciando creación de sesión...');
        const formData = this.getSesionFormData();
        console.log('📋 Datos del formulario:', formData);
        
        if (!formData.venta_id || !formData.fecha_planificada || !formData.profesional_id) {
            console.error('❌ Campos obligatorios faltantes:', {
                venta_id: formData.venta_id,
                fecha_planificada: formData.fecha_planificada,
                profesional_id: formData.profesional_id
            });
            mostrarNotificacion('Por favor complete todos los campos obligatorios (paciente, venta, profesional, fecha y hora)', 'error');
            return;
        }
        
        try {
            console.log('📡 Enviando petición a la API...');
            const response = await sesionesAPI.create(formData);
            console.log('📥 Respuesta de la API:', response);
            
            // Si llegamos aquí, la petición fue exitosa
            console.log('✅ Sesión creada exitosamente');
            mostrarNotificacion('✅ Sesión creada exitosamente', 'success');
            this.limpiarFormularioSesion();
            await this.loadSesiones(); // Recargar sesiones y actualizar calendario
            
        } catch (error) {
            console.error('❌ Error en crearSesion:', error);
            
            // Mostrar directamente el error de la base de datos
            const errorMessage = error.message || 'Error desconocido creando sesión';
            mostrarNotificacion(`❌ ${errorMessage}`, 'error');
        }
    }
    
    getSesionFormData() {
        console.log('🔍 Obteniendo datos del formulario...');
        
        const ventaId = document.getElementById('ventaSesion').value;
        const fechaPlanificada = document.getElementById('fechaSesion').value;
        const horaPlanificada = document.getElementById('horaSesion').value;
        const boxId = document.getElementById('boxSesion').value;
        const profesionalId = document.getElementById('profesionalSesion').value;
        const duracion = document.getElementById('duracionSesion').value;
        const observaciones = document.getElementById('observacionesSesion').value || '';
        
        console.log('📋 Valores obtenidos del formulario:', {
            ventaId,
            fechaPlanificada,
            horaPlanificada,
            boxId,
            profesionalId,
            duracion,
            observaciones
        });
        
        // Crear fecha_planificada completa
        const fechaPlanificadaCompleta = fechaPlanificada && horaPlanificada 
            ? `${fechaPlanificada} ${horaPlanificada}:00` 
            : null;
        
        console.log('📅 Fecha planificada completa:', fechaPlanificadaCompleta);
        
        // Obtener sucursal_id del box seleccionado
        const boxSelect = document.getElementById('boxSesion');
        const selectedBoxOption = boxSelect ? boxSelect.options[boxSelect.selectedIndex] : null;
        const sucursalId = selectedBoxOption ? selectedBoxOption.getAttribute('data-sucursal-id') : null;
        
        if (!sucursalId) {
            throw new Error('Debe seleccionar un box para obtener la sucursal');
        }
        
        // Solo enviar los campos que realmente necesita el SP sp_agendar_sesion
        const formData = {
            venta_id: ventaId,
            numero_sesion: 1, // Primera sesión por defecto
            sucursal_id: parseInt(sucursalId),
            box_id: boxId,
            profesional_id: profesionalId,
            fecha_planificada: fechaPlanificadaCompleta,
            duracion_minutos: duracion ? parseInt(duracion) : null,
            observaciones: observaciones || null // NULL si está vacío
        };
        
        console.log('📤 Datos finales a enviar:', formData);
        return formData;
    }
    
    async abrirSesion(sesionId) {
        try {
            console.log('🔓 Abriendo sesión ID:', sesionId);
            
            // Obtener datos de la sesión
            const sesion = await sesionesAPI.getById(sesionId);
            if (!sesion) {
                console.error('❌ No se pudo obtener la información de la sesión');
                mostrarNotificacion('No se pudo obtener la información de la sesión', 'error');
                return;
            }
            
            console.log('✅ Datos de sesión obtenidos:', sesion);
            
            // Mostrar modal de apertura de sesión
            this.showAbrirSesionModal(sesion);
            
        } catch (error) {
            console.error('❌ Error abriendo sesión:', error);
            const errorMessage = error.message || 'Error desconocido abriendo sesión';
            mostrarNotificacion(`Error abriendo sesión: ${errorMessage}`, 'error');
        }
    }
    
    showAbrirSesionModal(sesion) {
        const modal = document.createElement('div');
        modal.className = 'sesion-modal';
        
        // Detectar tipo de tratamiento para renderizado dinámico
        const tratamientoNombre = sesion.tratamiento_nombre ? sesion.tratamiento_nombre.toUpperCase() : '';
        
        const isEvaluacion = tratamientoNombre.includes('EVALUACION');
        const isDepilacion = tratamientoNombre.includes('DEPILACION') || tratamientoNombre.includes('DEPILACIÓN');
        const isFacial = tratamientoNombre.includes('FACIAL');
        const isCapilar = tratamientoNombre.includes('CAPILAR');
        
        console.log('🔍 Tipo de tratamiento detectado:', {
            tratamiento: sesion.tratamiento_nombre,
            isEvaluacion,
            isDepilacion,
            isFacial,
            isCapilar
        });
        
        // Generar contenido dinámico según el tratamiento
        let modalContent = '';
        
        if (isEvaluacion) {
            modalContent = this.generarModalEvaluacion(sesion);
        } else if (isDepilacion) {
            modalContent = this.generarModalDepilacion(sesion);
        } else if (isFacial) {
            modalContent = this.generarModalFacial(sesion);
        } else if (isCapilar) {
            modalContent = this.generarModalCapilar(sesion);
        } else {
            modalContent = this.generarModalGenerico(sesion);
        }
        
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
        
        // Configurar eventos específicos según el tipo
        if (isEvaluacion) {
            this.configurarEventosEvaluacion(sesion);
        } else if (isDepilacion) {
            this.configurarEventosDepilacion(sesion);
        } else if (isFacial) {
            this.configurarEventosFacial(sesion);
        } else if (isCapilar) {
            this.configurarEventosCapilar(sesion);
        } else {
            this.configurarEventosGenerico(sesion);
        }
    }
    
    generarModalEvaluacion(sesion) {
        return `
            <div class="sesion-modal-content">
                <div class="sesion-modal-header">
                    <h3>🔍 Evaluar Paciente - ${sesion.paciente_nombre}</h3>
                    <button class="close-btn" onclick="this.closest('.sesion-modal').remove()">×</button>
                </div>
                
                <div class="sesion-modal-body">
                    <div class="sesion-info">
                        <p><strong>Paciente:</strong> ${sesion.paciente_nombre}</p>
                        <p><strong>Tratamiento:</strong> ${sesion.tratamiento_nombre}</p>
                        <p><strong>Box:</strong> ${sesion.box_nombre}</p>
                        <p><strong>Fecha:</strong> ${formatDate(sesion.fecha_planificada)}</p>
                        <p><strong>Hora:</strong> ${sesion.hora_planificada}</p>
                    </div>
                    
                    <div class="evaluacion-section">
                        <h4>📋 Proceso de Evaluación</h4>
                        <div class="alert alert-info">
                            <p><strong>Durante esta evaluación:</strong></p>
                            <ul>
                                <li>Examine al paciente según el protocolo</li>
                                <li>Complete la ficha específica correspondiente</li>
                                <li>Al cerrar la sesión, se creará automáticamente la ficha específica</li>
                            </ul>
                        </div>
                        
                        <div class="tipo-ficha-selector">
                            <label><strong>Tipo de ficha específica a crear:</strong></label>
                            <select id="tipo-ficha-evaluacion" class="form-control">
                                <option value="">-- Seleccionar tipo --</option>
                                <option value="DEPILACION">Depilación</option>
                                <option value="CORPORAL_FACIAL">Corporal/Facial</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="sesion-observaciones">
                        <label>Observaciones de la evaluación:</label>
                        <textarea id="sesion-observaciones" rows="4" placeholder="Notas y observaciones de la evaluación..."></textarea>
                    </div>
                </div>
                
                <div class="sesion-modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.sesion-modal').remove()">
                        ❌ Cancelar
                    </button>
                    <button class="btn btn-success" onclick="sesionesModule.confirmarAbrirSesion(${sesion.id})">
                        ✅ Iniciar Evaluación
                    </button>
                </div>
            </div>
        `;
    }
    
    generarModalDepilacion(sesion) {
        return `
            <div class="sesion-modal-content">
                <div class="sesion-modal-header">
                    <h3>⚡ Sesión de Depilación - ${sesion.paciente_nombre}</h3>
                    <button class="close-btn" onclick="this.closest('.sesion-modal').remove()">×</button>
                </div>
                
                <div class="sesion-modal-body">
                    <div class="sesion-info">
                        <p><strong>Paciente:</strong> ${sesion.paciente_nombre}</p>
                        <p><strong>Tratamiento:</strong> ${sesion.tratamiento_nombre}</p>
                        <p><strong>Box:</strong> ${sesion.box_nombre}</p>
                        <p><strong>Fecha:</strong> ${formatDate(sesion.fecha_planificada)}</p>
                        <p><strong>Hora:</strong> ${sesion.hora_planificada}</p>
                    </div>
                    
                    <div class="consentimiento-section">
                        <h4>📝 Consentimiento Informado</h4>
                        <div class="alert alert-warning">
                            <p><strong>Antes de iniciar:</strong></p>
                            <ul>
                                <li>Verificar que el consentimiento informado esté firmado</li>
                                <li>Revisar contraindicaciones y medicamentos</li>
                                <li>Configurar las intensidades según la zona y piel del paciente</li>
                            </ul>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" id="consentimiento-verificado" class="form-check-input" required>
                            <label for="consentimiento-verificado" class="form-check-label">
                                ✅ Consentimiento informado verificado y firmado
                            </label>
                        </div>
                    </div>
                    
                    <div class="intensidades-section">
                        <h4>⚡ Intensidades por Zona</h4>
                        <div id="sesion-intensidades-grid"></div>
                    </div>
                    
                    <div class="sesion-observaciones">
                        <label>Observaciones de la sesión:</label>
                        <textarea id="sesion-observaciones" rows="3" placeholder="Reacciones, intensidades utilizadas, observaciones..."></textarea>
                    </div>
                </div>
                
                <div class="sesion-modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.sesion-modal').remove()">
                        ❌ Cancelar
                    </button>
                    <button class="btn btn-success" onclick="sesionesModule.confirmarAbrirSesion(${sesion.id})">
                        ✅ Iniciar Depilación
                    </button>
                </div>
            </div>
        `;
    }
    
    generarModalGenerico(sesion) {
        return `
            <div class="sesion-modal-content">
                <div class="sesion-modal-header">
                    <h3>🔓 Abrir Sesión - ${sesion.paciente_nombre}</h3>
                    <button class="close-btn" onclick="this.closest('.sesion-modal').remove()">×</button>
                </div>
                
                <div class="sesion-modal-body">
                    <div class="sesion-info">
                        <p><strong>Paciente:</strong> ${sesion.paciente_nombre}</p>
                        <p><strong>Tratamiento:</strong> ${sesion.tratamiento_nombre}</p>
                        <p><strong>Box:</strong> ${sesion.box_nombre}</p>
                        <p><strong>Fecha:</strong> ${formatDate(sesion.fecha_planificada)}</p>
                        <p><strong>Hora:</strong> ${sesion.hora_planificada}</p>
                    </div>
                    
                    <div class="sesion-observaciones">
                        <label>Observaciones de la sesión:</label>
                        <textarea id="sesion-observaciones" rows="3" placeholder="Observaciones de la sesión..."></textarea>
                    </div>
                </div>
                
                <div class="sesion-modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.sesion-modal').remove()">
                        ❌ Cancelar
                    </button>
                    <button class="btn btn-success" onclick="sesionesModule.confirmarAbrirSesion(${sesion.id})">
                        ✅ Abrir Sesión
                    </button>
                </div>
            </div>
        `;
    }
    
    generarModalFacial(sesion) {
        return `
            <div class="sesion-modal-content">
                <div class="sesion-modal-header">
                    <h3>✨ Tratamiento Facial - ${sesion.paciente_nombre}</h3>
                    <button class="close-btn" onclick="this.closest('.sesion-modal').remove()">×</button>
                </div>
                
                <div class="sesion-modal-body">
                    <div class="sesion-info">
                        <p><strong>Paciente:</strong> ${sesion.paciente_nombre}</p>
                        <p><strong>Tratamiento:</strong> ${sesion.tratamiento_nombre}</p>
                        <p><strong>Box:</strong> ${sesion.box_nombre}</p>
                        <p><strong>Fecha:</strong> ${formatDate(sesion.fecha_planificada)}</p>
                        <p><strong>Hora:</strong> ${sesion.hora_planificada}</p>
                    </div>
                    
                    <div class="facial-section">
                        <h4>✨ Protocolo de Tratamiento Facial</h4>
                        <div class="alert alert-info">
                            <p><strong>Procedimiento estándar:</strong></p>
                            <ul>
                                <li>Evaluación del tipo de piel y condición</li>
                                <li>Limpieza profunda y preparación</li>
                                <li>Aplicación del tratamiento específico</li>
                                <li>Cuidados post-tratamiento y recomendaciones</li>
                            </ul>
                        </div>
                        
                        <div class="productos-utilizados">
                            <label><strong>Productos utilizados:</strong></label>
                            <textarea id="productos-faciales" rows="3" placeholder="Listar productos y técnicas utilizadas en el tratamiento..."></textarea>
                        </div>
                    </div>
                    
                    <div class="sesion-observaciones">
                        <label>Observaciones del tratamiento:</label>
                        <textarea id="sesion-observaciones" rows="3" placeholder="Reacciones, resultados observados, recomendaciones..."></textarea>
                    </div>
                </div>
                
                <div class="sesion-modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.sesion-modal').remove()">
                        ❌ Cancelar
                    </button>
                    <button class="btn btn-success" onclick="sesionesModule.confirmarAbrirSesion(${sesion.id})">
                        ✅ Iniciar Facial
                    </button>
                </div>
            </div>
        `;
    }
    
    generarModalCapilar(sesion) {
        return `
            <div class="sesion-modal-content">
                <div class="sesion-modal-header">
                    <h3>💆 Tratamiento Capilar - ${sesion.paciente_nombre}</h3>
                    <button class="close-btn" onclick="this.closest('.sesion-modal').remove()">×</button>
                </div>
                
                <div class="sesion-modal-body">
                    <div class="sesion-info">
                        <p><strong>Paciente:</strong> ${sesion.paciente_nombre}</p>
                        <p><strong>Tratamiento:</strong> ${sesion.tratamiento_nombre}</p>
                        <p><strong>Box:</strong> ${sesion.box_nombre}</p>
                        <p><strong>Fecha:</strong> ${formatDate(sesion.fecha_planificada)}</p>
                        <p><strong>Hora:</strong> ${sesion.hora_planificada}</p>
                    </div>
                    
                    <div class="capilar-section">
                        <h4>💆 Protocolo de Tratamiento Capilar</h4>
                        <div class="alert alert-info">
                            <p><strong>Proceso de tratamiento:</strong></p>
                            <ul>
                                <li>Evaluación del cuero cabelludo y folículos</li>
                                <li>Preparación y limpieza del área</li>
                                <li>Aplicación del tratamiento regenerativo</li>
                                <li>Terapias complementarias y masajes</li>
                                <li>Instrucciones de cuidado posterior</li>
                            </ul>
                        </div>
                        
                        <div class="evaluacion-capilar">
                            <label><strong>Estado del cuero cabelludo:</strong></label>
                            <select id="estado-cuero-cabelludo" class="form-control">
                                <option value="">-- Seleccionar --</option>
                                <option value="normal">Normal</option>
                                <option value="graso">Graso</option>
                                <option value="seco">Seco</option>
                                <option value="mixto">Mixto</option>
                                <option value="sensible">Sensible</option>
                            </select>
                        </div>
                        
                        <div class="tratamientos-aplicados">
                            <label><strong>Tratamientos aplicados:</strong></label>
                            <textarea id="tratamientos-capilares" rows="3" placeholder="Detallar técnicas, productos y equipos utilizados..."></textarea>
                        </div>
                    </div>
                    
                    <div class="sesion-observaciones">
                        <label>Observaciones del tratamiento:</label>
                        <textarea id="sesion-observaciones" rows="3" placeholder="Evolución, reacciones, próximos pasos..."></textarea>
                    </div>
                </div>
                
                <div class="sesion-modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.sesion-modal').remove()">
                        ❌ Cancelar
                    </button>
                    <button class="btn btn-success" onclick="sesionesModule.confirmarAbrirSesion(${sesion.id})">
                        ✅ Iniciar Capilar
                    </button>
                </div>
            </div>
        `;
    }
    
    async confirmarAbrirSesion(sesionId) {
        console.log('✅ Confirmando apertura de sesión ID:', sesionId);
        
        const observaciones = document.getElementById('sesion-observaciones').value;
        const intensidades = this.getIntensidadesFromForm('sesion-intensidades-grid');
        
        // Para evaluaciones, obtener el tipo de ficha específica seleccionado
        const tipoFichaElement = document.getElementById('tipo-ficha-evaluacion');
        const tipoFicha = tipoFichaElement ? tipoFichaElement.value : null;
        
        // Para depilaciones, verificar consentimiento
        const consentimientoElement = document.getElementById('consentimiento-verificado');
        const consentimientoVerificado = consentimientoElement ? consentimientoElement.checked : true;
        
        // Para faciales, obtener productos utilizados
        const productosFacialesElement = document.getElementById('productos-faciales');
        const productosFaciales = productosFacialesElement ? productosFacialesElement.value : null;
        
        // Para capilares, obtener estado del cuero cabelludo y tratamientos
        const estadoCueroCabelludoElement = document.getElementById('estado-cuero-cabelludo');
        const estadoCueroCabelludo = estadoCueroCabelludoElement ? estadoCueroCabelludoElement.value : null;
        const tratamientosCapilaresElement = document.getElementById('tratamientos-capilares');
        const tratamientosCapilares = tratamientosCapilaresElement ? tratamientosCapilaresElement.value : null;
        
        try {
            // Validaciones específicas según el tipo
            if (tipoFichaElement && !tipoFicha) {
                mostrarNotificacion('❌ Debe seleccionar el tipo de ficha específica para la evaluación', 'error');
                return;
            }
            
            if (consentimientoElement && !consentimientoVerificado) {
                mostrarNotificacion('❌ Debe verificar el consentimiento informado antes de continuar', 'error');
                return;
            }
            
            console.log('📡 Abriendo sesión en la base de datos...');
            // Primero abrir la sesión en la base de datos
            const response = await sesionesAPI.abrirSesion(sesionId);
            
            if (response.success) {
                console.log('✅ Sesión abierta en la base de datos');
                
                // Guardar intensidades si existen (para depilaciones)
                if (Object.keys(intensidades).length > 0) {
                    console.log('💾 Guardando intensidades...');
                    await this.guardarIntensidades(sesionId, intensidades);
                }
                
                // Preparar datos específicos según el tipo de tratamiento
                if (tipoFicha) {
                    // Para evaluaciones - almacenar tipo de ficha específica
                    sessionStorage.setItem(`evaluacion_${sesionId}`, JSON.stringify({
                        tipo_ficha: tipoFicha,
                        fecha_evaluacion: new Date().toISOString()
                    }));
                    console.log('📋 Datos de evaluación almacenados para sesión:', sesionId);
                    mostrarNotificacion('✅ Evaluación iniciada. Al cerrar la sesión se creará la ficha específica.', 'success');
                    
                } else if (productosFaciales) {
                    // Para faciales - almacenar productos utilizados
                    sessionStorage.setItem(`facial_${sesionId}`, JSON.stringify({
                        productos_utilizados: productosFaciales,
                        fecha_tratamiento: new Date().toISOString()
                    }));
                    console.log('✨ Datos de facial almacenados para sesión:', sesionId);
                    mostrarNotificacion('✅ Tratamiento facial iniciado', 'success');
                    
                } else if (estadoCueroCabelludo || tratamientosCapilares) {
                    // Para capilares - almacenar evaluación y tratamientos
                    sessionStorage.setItem(`capilar_${sesionId}`, JSON.stringify({
                        estado_cuero_cabelludo: estadoCueroCabelludo,
                        tratamientos_aplicados: tratamientosCapilares,
                        fecha_tratamiento: new Date().toISOString()
                    }));
                    console.log('💆 Datos de capilar almacenados para sesión:', sesionId);
                    mostrarNotificacion('✅ Tratamiento capilar iniciado', 'success');
                    
                } else if (consentimientoVerificado) {
                    // Para depilaciones
                    console.log('⚡ Sesión de depilación iniciada');
                    mostrarNotificacion('✅ Sesión de depilación iniciada', 'success');
                } else {
                    // Genérico
                    console.log('🔓 Sesión genérica iniciada');
                    mostrarNotificacion('✅ Sesión abierta exitosamente', 'success');
                }
                
                document.querySelector('.sesion-modal').remove();
                await this.loadSesiones();
            } else {
                console.error('❌ Error en respuesta de API:', response);
                mostrarNotificacion('❌ Error: ' + (response.error || 'Error desconocido'), 'error');
            }
        } catch (error) {
            console.error('❌ Error confirmando apertura de sesión:', error);
            const errorMessage = error.message || 'Error desconocido abriendo sesión';
            mostrarNotificacion(`❌ Error abriendo sesión: ${errorMessage}`, 'error');
        }
    }
    
    async cerrarSesion(sesionId) {
        console.log('🔒 Cerrando sesión ID:', sesionId);
        
        // Crear modal simple para observaciones
        const modalHtml = `
            <div class="modal fade" id="observacionesModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Observaciones de la Sesión</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="observacionesSesion" class="form-label">Observaciones (opcional):</label>
                                <textarea class="form-control" id="observacionesSesion" rows="3" placeholder="Ingrese observaciones adicionales..."></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="confirmarCerrarSesion">Cerrar Sesión</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('observacionesModal'));
        modal.show();
        
        // Configurar evento de confirmación
        document.getElementById('confirmarCerrarSesion').onclick = async () => {
            const observaciones = document.getElementById('observacionesSesion').value;
            
            try {
                console.log('📋 Procesando cierre de sesión con observaciones:', observaciones);
                
                // Verificar si hay datos específicos de tratamiento pendientes
                const evaluacionData = sessionStorage.getItem(`evaluacion_${sesionId}`);
                const facialData = sessionStorage.getItem(`facial_${sesionId}`);
                const capilarData = sessionStorage.getItem(`capilar_${sesionId}`);
                
                let datosGuardados = false;
                let tipoTratamiento = 'genérico';
                
                if (evaluacionData) {
                    const datos = JSON.parse(evaluacionData);
                    console.log('🔍 Datos de evaluación encontrados:', datos);
                    
                    if (datos.tipo_ficha) {
                        console.log('📋 Creando ficha específica de', datos.tipo_ficha);
                        mostrarNotificacion(`📋 Creando ficha específica de ${datos.tipo_ficha}...`, 'info');
                        
                        try {
                            // Crear ficha específica automáticamente
                            await this.crearFichaEspecificaDesdeEvaluacion(sesionId, datos);
                            datosGuardados = true;
                            tipoTratamiento = 'evaluación';
                            sessionStorage.removeItem(`evaluacion_${sesionId}`);
                            console.log('✅ Ficha específica creada exitosamente');
                        } catch (error) {
                            console.error('❌ Error creando ficha específica:', error);
                            const errorMessage = error.message || 'Error desconocido creando ficha específica';
                            mostrarNotificacion(`❌ Error creando ficha específica: ${errorMessage}`, 'error');
                            return; // No continuar si falla la creación de ficha
                        }
                    }
                    
                } else if (facialData) {
                    const datos = JSON.parse(facialData);
                    console.log('🔍 Datos de facial encontrados:', datos);
                    
                    console.log('✨ Guardando datos del tratamiento facial...');
                    mostrarNotificacion('✨ Guardando datos del tratamiento facial...', 'info');
                    
                    try {
                        // Guardar productos utilizados en datos_sesion
                        await this.guardarDatosSesion(sesionId, {
                            tipo_tratamiento: 'facial',
                            productos_utilizados: datos.productos_utilizados,
                            fecha_tratamiento: datos.fecha_tratamiento,
                            observaciones_tratamiento: observaciones || 'Sin observaciones adicionales'
                        });
                        
                        datosGuardados = true;
                        tipoTratamiento = 'facial';
                        sessionStorage.removeItem(`facial_${sesionId}`);
                        console.log('✅ Datos de facial guardados exitosamente');
                    } catch (error) {
                        console.error('❌ Error guardando datos de facial:', error);
                        const errorMessage = error.message || 'Error desconocido guardando datos del facial';
                        mostrarNotificacion(`❌ Error guardando datos del facial: ${errorMessage}`, 'error');
                        return; // No continuar si falla el guardado
                    }
                    
                } else if (capilarData) {
                    const datos = JSON.parse(capilarData);
                    console.log('🔍 Datos de capilar encontrados:', datos);
                    
                    console.log('💆 Guardando datos del tratamiento capilar...');
                    mostrarNotificacion('💆 Guardando datos del tratamiento capilar...', 'info');
                    
                    try {
                        // Guardar evaluación y tratamientos en datos_sesion
                        await this.guardarDatosSesion(sesionId, {
                            tipo_tratamiento: 'capilar',
                            estado_cuero_cabelludo: datos.estado_cuero_cabelludo,
                            tratamientos_aplicados: datos.tratamientos_aplicados,
                            fecha_tratamiento: datos.fecha_tratamiento,
                            observaciones_tratamiento: observaciones || 'Sin observaciones adicionales'
                        });
                        
                        datosGuardados = true;
                        tipoTratamiento = 'capilar';
                        sessionStorage.removeItem(`capilar_${sesionId}`);
                        console.log('✅ Datos de capilar guardados exitosamente');
                    } catch (error) {
                        console.error('❌ Error guardando datos de capilar:', error);
                        const errorMessage = error.message || 'Error desconocido guardando datos del capilar';
                        mostrarNotificacion(`❌ Error guardando datos del capilar: ${errorMessage}`, 'error');
                        return; // No continuar si falla el guardado
                    }
                }
                
                console.log('📡 Cerrando sesión en la base de datos...');
                // Cerrar la sesión
                const response = await sesionesAPI.cerrarSesion(sesionId, observaciones);
                
                if (response.success) {
                    console.log('✅ Sesión cerrada exitosamente en la base de datos');
                    
                    if (datosGuardados) {
                        switch (tipoTratamiento) {
                            case 'evaluación':
                                mostrarNotificacion('✅ Evaluación completada y ficha específica creada exitosamente', 'success');
                                break;
                            case 'facial':
                                mostrarNotificacion('✅ Tratamiento facial completado y datos guardados exitosamente', 'success');
                                break;
                            case 'capilar':
                                mostrarNotificacion('✅ Tratamiento capilar completado y datos guardados exitosamente', 'success');
                                break;
                            default:
                                mostrarNotificacion('✅ Sesión cerrada exitosamente', 'success');
                        }
                    } else {
                        mostrarNotificacion('✅ Sesión cerrada exitosamente', 'success');
                    }
                    
                    await this.loadSesiones();
                } else {
                    console.error('❌ Error en respuesta de API al cerrar sesión:', response);
                    mostrarNotificacion('❌ Error: ' + (response.error || 'Error desconocido'), 'error');
                }
            } catch (error) {
                console.error('❌ Error cerrando sesión:', error);
                const errorMessage = error.message || 'Error desconocido cerrando sesión';
                mostrarNotificacion(`❌ Error cerrando sesión: ${errorMessage}`, 'error');
            } finally {
                modal.hide();
                // Limpiar modal del DOM
                document.getElementById('observacionesModal').remove();
            }
        };
    }
    
    async guardarDatosSesion(sesionId, datosTratamiento) {
        try {
            console.log('💾 Guardando datos de sesión para ID:', sesionId, datosTratamiento);
            
            // Actualizar el campo datos_sesion usando la API de sesiones
            const response = await sesionesAPI.updateDatosSesion(sesionId, datosTratamiento);
            
            if (response.success) {
                console.log('✅ Datos de sesión guardados exitosamente:', datosTratamiento);
                return response.data;
            } else {
                console.error('❌ Error en respuesta de API:', response);
                throw new Error(response.error || 'Error guardando datos de sesión');
            }
            
        } catch (error) {
            console.error('❌ Error en guardarDatosSesion:', error);
            throw error;
        }
    }
    
    async crearFichaEspecificaDesdeEvaluacion(sesionId, datosEvaluacion) {
        try {
            console.log('📋 Creando ficha específica desde evaluación para sesión:', sesionId);
            console.log('📋 Datos de evaluación:', datosEvaluacion);
            
            // Obtener información de la sesión para extraer datos necesarios
            const sesion = await sesionesAPI.getById(sesionId);
            if (!sesion.success) {
                throw new Error('No se pudo obtener información de la sesión');
            }
            
            const sesionData = sesion.data;
            const ventaId = sesionData.venta_id;
            console.log('📋 Venta ID obtenida:', ventaId);
            
            // Obtener información de la venta para extraer evaluacion_id
            const venta = await ventasAPI.getById(ventaId);
            if (!venta.success) {
                throw new Error('No se pudo obtener información de la venta');
            }
            
            const ventaData = venta.data;
            const evaluacionId = ventaData.evaluacion_id;
            console.log('📋 Evaluación ID obtenida:', evaluacionId);
            
            if (!evaluacionId) {
                throw new Error('Esta venta no tiene una evaluación asociada');
            }
            
            // Obtener tipo de ficha específica por nombre
            const tipoFicha = datosEvaluacion.tipo_ficha.toUpperCase();
            const tipoFichaId = tipoFicha === 'DEPILACION' ? 1 : 2; // Por ahora hardcodeado, debería venir de la DB
            console.log('📋 Tipo de ficha:', tipoFicha, 'ID:', tipoFichaId);
            
            // Crear datos básicos de ficha específica
            const fichaData = {
                evaluacion_id: evaluacionId,
                tipo_id: tipoFichaId,
                datos: this.generarDatosFichaEspecifica(tipoFicha, sesionData),
                observaciones: `Ficha creada automáticamente desde evaluación el ${new Date().toLocaleString()}`
            };
            
            console.log('📋 Datos de ficha específica a crear:', fichaData);
            
            // Crear la ficha específica
            const response = await fichasEspecificasAPI.create(fichaData);
            
            if (response.success) {
                console.log('✅ Ficha específica creada automáticamente:', response.data);
                mostrarNotificacion(`✅ Ficha específica de ${tipoFicha} creada exitosamente`, 'success');
                return response.data;
            } else {
                console.error('❌ Error en respuesta de API:', response);
                throw new Error(response.error || 'Error creando ficha específica');
            }
            
        } catch (error) {
            console.error('❌ Error en crearFichaEspecificaDesdeEvaluacion:', error);
            throw error;
        }
    }
    
    generarDatosFichaEspecifica(tipoFicha, sesionData) {
        // Generar estructura básica según el tipo de ficha
        if (tipoFicha === 'DEPILACION') {
            return {
                antecedentes_personales: {
                    nombre_completo: sesionData.paciente_nombre || '',
                    fecha_nacimiento: '',
                    edad: 0,
                    ocupacion: '',
                    telefono_fijo: '',
                    celular: '',
                    email: '',
                    medio_conocimiento: ''
                },
                evaluacion_medica: {
                    medicamentos: false,
                    isotretinoina: false,
                    alergias: false,
                    enfermedades_piel: false,
                    antecedentes_cancer: false,
                    embarazo: false,
                    lactancia: false,
                    tatuajes: false,
                    antecedentes_herpes: false,
                    patologias_hormonales: false,
                    exposicion_sol: '',
                    tipo_piel_fitzpatrick: '',
                    metodo_depilacion_actual: '',
                    ultima_depilacion: '',
                    otros: 'Datos a completar en próxima cita'
                },
                zonas_tratamiento: {
                    zonas_seleccionadas: [],
                    observaciones_medicas: 'Pendiente evaluación completa'
                }
            };
        } else {
            // CORPORAL/FACIAL
            return {
                antecedentes_personales: {
                    nombre_completo: sesionData.paciente_nombre || '',
                    fecha_nacimiento: '',
                    edad: 0,
                    ocupacion: '',
                    telefono_fijo: '',
                    celular: '',
                    email: '',
                    medio_conocimiento: ''
                },
                evaluacion_medica: {
                    protesis_metalicas: false,
                    implantes_colageno: false,
                    medicamentos_actuales: false,
                    cirugias: false,
                    fuma: false,
                    ingiere_alcohol: false,
                    horas_sueno: 0,
                    periodo_menstrual_regular: false,
                    lesiones_timpano: false
                },
                medidas_corporales: {
                    peso_antes: 0,
                    peso_despues: 0,
                    altura: 0,
                    imc_antes: 0,
                    imc_despues: 0,
                    grasa_corporal_antes: 0,
                    grasa_corporal_despues: 0,
                    masa_muscular_antes: 0,
                    masa_muscular_despues: 0,
                    agua_corporal_antes: 0,
                    agua_corporal_despues: 0,
                    grasa_visceral_antes: 0,
                    grasa_visceral_despues: 0
                },
                medidas_pliegues: {
                    abdomen_alto_antes: 0,
                    abdomen_alto_despues: 0,
                    abdomen_bajo_antes: 0,
                    abdomen_bajo_despues: 0,
                    cintura_antes: 0,
                    cintura_despues: 0,
                    cadera_antes: 0,
                    cadera_despues: 0,
                    brazo_derecho_antes: 0,
                    brazo_derecho_despues: 0,
                    brazo_izquierdo_antes: 0,
                    brazo_izquierdo_despues: 0,
                    pierna_derecha_antes: 0,
                    pierna_derecha_despues: 0,
                    pierna_izquierda_antes: 0,
                    pierna_izquierda_despues: 0
                }
            };
        }
    }
    
    configurarEventosEvaluacion(sesion) {
        console.log('🔧 Configurando eventos para sesión de evaluación');
        // No necesita cargar intensidades, se enfoca en la evaluación
        // Los eventos específicos de evaluación se manejan en confirmarAbrirSesion
    }
    
    configurarEventosDepilacion(sesion) {
        console.log('🔧 Configurando eventos para sesión de depilación');
        // Cargar grid de intensidades para depilación
        this.cargarIntensidadesAnteriores(sesion.paciente_id, 'sesion-intensidades-grid');
        
        // Validar consentimiento antes de permitir continuar
        const btnConfirmar = document.querySelector('.sesion-modal-footer .btn-success');
        const checkboxConsentimiento = document.getElementById('consentimiento-verificado');
        
        if (btnConfirmar && checkboxConsentimiento) {
            // Deshabilitar botón inicialmente
            btnConfirmar.disabled = true;
            btnConfirmar.classList.add('disabled');
            
            // Habilitar solo cuando se marque el consentimiento
            checkboxConsentimiento.addEventListener('change', (e) => {
                if (e.target.checked) {
                    btnConfirmar.disabled = false;
                    btnConfirmar.classList.remove('disabled');
                } else {
                    btnConfirmar.disabled = true;
                    btnConfirmar.classList.add('disabled');
                }
            });
        }
    }
    
    configurarEventosFacial(sesion) {
        console.log('🔧 Configurando eventos para sesión facial');
        // Configuración específica para tratamientos faciales
        // Los campos específicos de facial se manejan en confirmarAbrirSesion
    }
    
    configurarEventosCapilar(sesion) {
        console.log('🔧 Configurando eventos para sesión capilar');
        // Configuración específica para tratamientos capilares
        // Los campos específicos de capilar se manejan en confirmarAbrirSesion
    }
    
    configurarEventosGenerico(sesion) {
        console.log('🔧 Configurando eventos para sesión genérica');
        // Configuración básica sin eventos específicos
    }
    
    async guardarIntensidades(pacienteId, intensidades) {
        try {
            const response = await sesionesAPI.abrirSesion(pacienteId, {
                intensidades: intensidades,
                fecha: new Date().toISOString()
            });
            
            if (response.success) {
                mostrarNotificacion('✅ Intensidades guardadas exitosamente', 'success');
            } else {
                mostrarNotificacion('❌ Error: ' + (response.error || 'Error desconocido'), 'error');
            }
        } catch (error) {
            console.error('Error guardando intensidades:', error);
            const errorMessage = error.message || 'Error desconocido guardando intensidades';
            mostrarNotificacion(`❌ Error guardando intensidades: ${errorMessage}`, 'error');
        }
    }
    
    async cargarIntensidadesAnteriores(paciente) {
        try {
            const response = await sesionesAPI.getByVentaId(paciente);
            
            if (response && response.length > 0) {
                // Obtener la última configuración de intensidades
                const ultimaConfig = response[response.length - 1];
                this.aplicarIntensidades(ultimaConfig.intensidades, 'intensidades-grid');
                mostrarNotificacion('✅ Intensidades anteriores cargadas', 'success');
            } else {
                mostrarNotificacion('No se encontraron intensidades anteriores para este paciente', 'info');
            }
        } catch (error) {
            console.error('Error cargando intensidades:', error);
            const errorMessage = error.message || 'Error desconocido cargando intensidades';
            mostrarNotificacion(`Error cargando intensidades anteriores: ${errorMessage}`, 'error');
        }
    }
    
    getIntensidadesFromForm(gridId) {
        const intensidades = {};
        
        if (!this.zonas || this.zonas.length === 0) {
            console.warn('⚠️ No hay zonas cargadas para obtener intensidades');
            return intensidades;
        }
        
        this.zonas.forEach(zona => {
            const intensidad = document.getElementById(`intensidad_${zona.codigo}`)?.value;
            const frecuencia = document.getElementById(`frecuencia_${zona.codigo}`)?.value;
            const duracion = document.getElementById(`duracion_${zona.codigo}`)?.value;
            const spot = document.getElementById(`spot_${zona.codigo}`)?.value;
            const observaciones = document.getElementById(`obs_${zona.codigo}`)?.value;
            
            if (intensidad || frecuencia || duracion || spot || observaciones) {
                intensidades[zona.codigo] = {
                    intensidad: intensidad ? parseFloat(intensidad) : 0,
                    frecuencia: frecuencia ? parseFloat(frecuencia) : 1,
                    duracion: duracion ? parseInt(duracion) : 10,
                    spot_size: spot ? parseInt(spot) : 8,
                    observaciones: observaciones || ''
                };
            }
        });
        
        return intensidades;
    }
    
    aplicarIntensidades(intensidades, gridId) {
        Object.entries(intensidades).forEach(([zona, config]) => {
            const intensidadInput = document.getElementById(`intensidad_${zona}`);
            const frecuenciaInput = document.getElementById(`frecuencia_${zona}`);
            const duracionInput = document.getElementById(`duracion_${zona}`);
            const spotSelect = document.getElementById(`spot_${zona}`);
            const obsTextarea = document.getElementById(`obs_${zona}`);
            
            if (intensidadInput) intensidadInput.value = config.intensidad || '';
            if (frecuenciaInput) frecuenciaInput.value = config.frecuencia || '';
            if (duracionInput) duracionInput.value = config.duracion || '';
            if (spotSelect) spotSelect.value = config.spot_size || 8;
            if (obsTextarea) obsTextarea.value = config.observaciones || '';
        });
    }
    
    async loadSesiones() {
        console.log('📋 Cargando sesiones...');
        try {
            this.sesiones = await sesionesAPI.getAll();
            console.log('✅ Sesiones obtenidas:', this.sesiones.length);
            this.renderSesiones();
            console.log('✅ Sesiones renderizadas');
            this.updateCalendarEvents(); // Actualizar calendario
            console.log('✅ Calendario actualizado');
        } catch (error) {
            console.error('❌ Error cargando sesiones:', error);
            const errorMessage = error.message || 'Error desconocido cargando sesiones';
            mostrarNotificacion(`Error cargando sesiones: ${errorMessage}`, 'error');
        }
    }
    
    async getSesion(sesionId) {
        try {
            console.log('🔍 Obteniendo sesión ID:', sesionId);
            const sesion = await sesionesAPI.getById(sesionId);
            console.log('✅ Sesión obtenida:', sesion);
            return sesion;
        } catch (error) {
            console.error('❌ Error obteniendo sesión:', error);
            const errorMessage = error.message || 'Error desconocido obteniendo sesión';
            mostrarNotificacion(`Error obteniendo sesión: ${errorMessage}`, 'error');
            return null;
        }
    }
    
    renderSesiones() {
        console.log('🎨 Renderizando sesiones...');
    const tbody = document.getElementById('cuerpoTablaSesiones');
        console.log('📋 Tbody encontrado:', tbody);
        if (!tbody) {
            console.error('❌ No se encontró el tbody para sesiones');
        return;
    }
    
        tbody.innerHTML = '';
        console.log('📊 Renderizando', this.sesiones.length, 'sesiones');
        
        this.sesiones.forEach(sesion => {
        const row = document.createElement('tr');
        row.innerHTML = `
                <td data-label="Paciente">${sesion.paciente_nombre || 'N/A'}</td>
                <td data-label="Venta ID">${sesion.venta_id || 'N/A'}</td>
                <td data-label="Box">${sesion.box_nombre || 'N/A'}</td>
                <td data-label="Fecha">${formatDate(sesion.fecha_planificada)}</td>
                <td data-label="Hora">${sesion.hora_planificada || 'N/A'}</td>
                <td data-label="Duración">${sesion.duracion || 'N/A'} min</td>
                <td data-label="Estado">
                    <span class="status-badge status-${sesion.estado}">
                        ${this.getEstadoLabel(sesion.estado)}
                    </span>
                </td>
            <td data-label="Acciones">
                <div class="action-buttons">
                        ${this.getActionButtons(sesion)}
      </div>
            </td>
        `;
            
        tbody.appendChild(row);
    });
}

    getEstadoLabel(estado) {
        const estados = {
            'programada': 'Programada',
            'confirmada': 'Confirmada',
            'en_curso': 'En Curso',
            'completada': 'Completada',
            'cancelada': 'Cancelada',
            'reprogramada': 'Reprogramada'
        };
        return estados[estado] || estado;
    }
    
    getActionButtons(sesion) {
        let buttons = '';
        
        switch (sesion.estado) {
            case 'programada':
                buttons += `<button class="btn btn-sm btn-success" onclick="sesionesModule.confirmarPaciente(${sesion.id})">✅ Confirmar</button>`;
                buttons += `<button class="btn btn-sm btn-primary" onclick="sesionesModule.abrirSesion(${sesion.id})">🔓 Abrir</button>`;
                break;
            case 'confirmada':
                buttons += `<button class="btn btn-sm btn-primary" onclick="sesionesModule.abrirSesion(${sesion.id})">🔓 Abrir</button>`;
                break;
            case 'en_curso':
                buttons += `<button class="btn btn-sm btn-success" onclick="sesionesModule.cerrarSesion(${sesion.id})">✅ Cerrar</button>`;
                break;
            case 'completada':
                buttons += `<button class="btn btn-sm btn-info" onclick="sesionesModule.verDetalles(${sesion.id})">👁️ Ver</button>`;
                break;
        }
        
        buttons += `<button class="btn btn-sm btn-warning" onclick="sesionesModule.reprogramarSesion(${sesion.id})">🔄 Reprogramar</button>`;
        buttons += `<button class="btn btn-sm btn-danger" onclick="sesionesModule.cancelarSesion(${sesion.id})">❌ Cancelar</button>`;
        
        return buttons;
    }
    
    async confirmarPaciente(sesionId) {
        try {
            console.log('✅ Confirmando paciente para sesión ID:', sesionId);
            
            const response = await sesionesAPI.confirmarPaciente(sesionId);
            
            if (response.success) {
                console.log('✅ Paciente confirmado exitosamente');
                mostrarNotificacion('✅ Paciente confirmado exitosamente', 'success');
                await this.loadSesiones();
            } else {
                console.error('❌ Error en respuesta de API:', response);
                mostrarNotificacion('❌ Error: ' + (response.error || 'Error desconocido'), 'error');
            }
        } catch (error) {
            console.error('❌ Error confirmando paciente:', error);
            const errorMessage = error.message || 'Error desconocido confirmando paciente';
            mostrarNotificacion(`❌ Error confirmando paciente: ${errorMessage}`, 'error');
        }
    }
    
    async reprogramarSesion(sesionId) {
        console.log('🔄 Reprogramando sesión ID:', sesionId);
        
        // Verificar que Bootstrap esté disponible
        if (typeof bootstrap === 'undefined') {
            console.error('❌ Bootstrap no está disponible');
            mostrarNotificacion('❌ Error: Bootstrap no está disponible', 'error');
            return;
        }
        
        // Crear modal simple para fecha y hora
        const modalHtml = `
            <div class="modal fade" id="reprogramarModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Reprogramar Sesión</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="nuevaFecha" class="form-label">Nueva Fecha:</label>
                                <input type="date" class="form-control" id="nuevaFecha" required>
                            </div>
                            <div class="mb-3">
                                <label for="nuevaHora" class="form-label">Nueva Hora:</label>
                                <input type="time" class="form-control" id="nuevaHora" required>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="confirmarReprogramar">Confirmar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Esperar a que el modal se agregue al DOM
        setTimeout(() => {
            const modalElement = document.getElementById('reprogramarModal');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
                
                // Configurar evento de confirmación
                document.getElementById('confirmarReprogramar').onclick = async () => {
                    const nuevaFecha = document.getElementById('nuevaFecha').value;
                    const nuevaHora = document.getElementById('nuevaHora').value;
                    
                    if (!nuevaFecha || !nuevaHora) {
                        mostrarNotificacion('Por favor ingrese fecha y hora válidas', 'warning');
                        return;
                    }
                    
                    try {
                        console.log('📡 Reprogramando sesión a:', nuevaFecha + ' ' + nuevaHora);
                        const response = await sesionesAPI.reprogramar(sesionId, nuevaFecha + ' ' + nuevaHora);
                        
                        if (response.success) {
                            console.log('✅ Sesión reprogramada exitosamente');
                            mostrarNotificacion('✅ Sesión reprogramada exitosamente', 'success');
                            await this.loadSesiones();
                        } else {
                            console.error('❌ Error en respuesta de API:', response);
                            mostrarNotificacion('❌ Error: ' + (response.error || 'Error desconocido'), 'error');
                        }
                    } catch (error) {
                        console.error('❌ Error reprogramando sesión:', error);
                        const errorMessage = error.message || 'Error desconocido reprogramando sesión';
                        mostrarNotificacion(`❌ Error reprogramando sesión: ${errorMessage}`, 'error');
                    } finally {
                        modal.hide();
                        // Limpiar modal del DOM
                        document.getElementById('reprogramarModal').remove();
                    }
                };
            }
        }, 100);
    }
    
    async cancelarSesion(sesionId) {
        console.log('❌ Cancelando sesión ID:', sesionId);
        
        // Verificar que Bootstrap esté disponible
        if (typeof bootstrap === 'undefined') {
            console.error('❌ Bootstrap no está disponible');
            mostrarNotificacion('❌ Error: Bootstrap no está disponible', 'error');
            return;
        }
        
        // Crear modal de confirmación
        const modalHtml = `
            <div class="modal fade" id="cancelarModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Confirmar Cancelación</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>¿Está seguro de que desea cancelar esta sesión?</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No, mantener</button>
                            <button type="button" class="btn btn-danger" id="confirmarCancelar">Sí, cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Esperar a que el modal se agregue al DOM
        setTimeout(() => {
            const modalElement = document.getElementById('cancelarModal');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
                
                // Configurar evento de confirmación
                document.getElementById('confirmarCancelar').onclick = async () => {
                    try {
                        console.log('📡 Cancelando sesión en la base de datos...');
                        const response = await sesionesAPI.delete(sesionId);
                        
                        if (response.success) {
                            console.log('✅ Sesión cancelada exitosamente');
                            mostrarNotificacion('✅ Sesión cancelada exitosamente', 'success');
                            await this.loadSesiones();
                        } else {
                            console.error('❌ Error en respuesta de API:', response);
                            mostrarNotificacion('❌ Error: ' + (response.error || 'Error desconocido'), 'error');
                        }
                    } catch (error) {
                        console.error('❌ Error cancelando sesión:', error);
                        const errorMessage = error.message || 'Error desconocido cancelando sesión';
                        mostrarNotificacion(`❌ Error cancelando sesión: ${errorMessage}`, 'error');
                    } finally {
                        modal.hide();
                        // Limpiar modal del DOM
                        document.getElementById('cancelarModal').remove();
                    }
                };
            }
        }, 100);
    }
    
    async verDetalles(sesionId) {
        const sesion = await this.getSesion(sesionId);
        if (!sesion) return;
        
        const detalles = `
            <strong>Detalles de la Sesión:</strong><br>
            <strong>Paciente:</strong> ${sesion.paciente_nombre}<br>
            <strong>Tratamiento:</strong> ${sesion.tratamiento_nombre}<br>
            <strong>Box:</strong> ${sesion.box_nombre}<br>
            <strong>Fecha:</strong> ${formatDate(sesion.fecha_planificada)}<br>
            <strong>Hora:</strong> ${sesion.hora_planificada}<br>
            <strong>Duración:</strong> ${sesion.duracion} minutos<br>
            <strong>Estado:</strong> ${this.getEstadoLabel(sesion.estado)}<br>
            <strong>Observaciones:</strong> ${sesion.observaciones || 'Sin observaciones'}
        `;
        
        mostrarNotificacion(detalles, 'info');
    }
    
    limpiarFormularioSesion() {
        const form = document.getElementById('sesionForm');
        if (form) {
            form.reset();
        }
        
        // Limpiar selects de Select2 específicamente
        if (typeof $ !== 'undefined' && $.fn.select2) {
            const pacienteSelect = document.getElementById('pacienteSesion');
            const ventaSelect = document.getElementById('ventaSesion');
            const boxSelect = document.getElementById('boxSesion');
            const profesionalSelect = document.getElementById('profesionalSesion');
            
            if (pacienteSelect) {
                $(pacienteSelect).val(null).trigger('change');
            }
            
            if (ventaSelect) {
                $(ventaSelect).val(null).trigger('change');
            }
            
            if (boxSelect) {
                $(boxSelect).val(null).trigger('change');
            }
            
            if (profesionalSelect) {
                $(profesionalSelect).val(null).trigger('change');
            }
        }
        
        console.log('✅ Formulario de sesión limpiado');
    }

    async loadPacientes() {
        // Este método se mantiene para compatibilidad con main.js
        // Los pacientes se cargan dinámicamente cuando se necesitan
        await this.cargarPacientesSelect();
    }
    
    async cargarPacientesSelect() {
        try {
            console.log('👥 Cargando select de pacientes...');
            const select = document.getElementById('pacienteSesion');
            if (!select) {
                console.error('❌ No se encontró el select de pacientes');
                return;
            }
            
            // Configurar Select2 exactamente igual que en ventas
            if (typeof $ !== 'undefined' && $.fn.select2) {
                console.log('🔧 Configurando Select2 para pacientes...');
                $(select).select2({
                    ajax: {
                        url: '/api.php/fichas',
                        dataType: 'json',
                        delay: 250,
                        data: function (params) {
                            return {
                                search: params.term,
                                page: params.page || 1
                            };
                        },
                        processResults: function (data) {
                            return {
                                results: data.data.map(paciente => ({
                                    id: paciente.id,
                                    text: `${paciente.nombres} ${paciente.apellidos} - ${paciente.rut}`
                                })),
                                pagination: {
                                    more: false // Por ahora sin paginación
                                }
                            };
                        },
                        cache: true
                    },
                    placeholder: '-- Selecciona cliente --',
                    minimumInputLength: 2,
                    width: '100%',
                    language: {
                        inputTooShort: function() {
                            return "Por favor ingresa al menos 2 caracteres";
                        },
                        noResults: function() {
                            return "No se encontraron pacientes";
                        },
                        searching: function() {
                            return "Buscando...";
                        }
                    },
                    // Mejorar accesibilidad
                    containerCssClass: 'select2-container--accessible',
                    dropdownCssClass: 'select2-dropdown--accessible'
                });
                
                // Configurar eventos después de inicializar Select2
                this.configurarEventosPaciente();
                console.log('✅ Select2 configurado para pacientes');
            } else {
                console.log('🔧 Usando select nativo para pacientes...');
                // Fallback sin Select2
                const { fichasAPI } = await import('../api-client.js');
                const pacientes = await fichasAPI.getAll();
                
                select.innerHTML = '<option value="">-- Selecciona cliente --</option>';
                
                pacientes.forEach(paciente => {
                    const option = document.createElement('option');
                    option.value = paciente.id.toString();
                    option.textContent = `${paciente.nombres} ${paciente.apellidos} - ${paciente.rut}`;
                    select.appendChild(option);
                });
                
                // Configurar eventos para select nativo
                this.configurarEventosPaciente();
                console.log('✅ Select nativo configurado para pacientes');
            }
            
            console.log('✅ Select de pacientes cargado exitosamente');
        } catch (error) {
            console.error('❌ Error cargando pacientes:', error);
            const errorMessage = error.message || 'Error desconocido cargando pacientes';
            mostrarNotificacion(`Error cargando pacientes: ${errorMessage}`, 'error');
        }
    }
    
    async cargarVentasSelect() {
        try {
            console.log('💰 Inicializando select de ventas...');
            const select = document.getElementById('ventaSesion');
            if (!select) {
                console.error('❌ No se encontró el select de ventas');
                return;
            }
            
            // Inicializar select vacío - se cargará cuando se seleccione un paciente
            select.innerHTML = '<option value="">Seleccionar venta...</option>';
            
            console.log('✅ Select de ventas inicializado exitosamente');
        } catch (error) {
            console.error('❌ Error inicializando select de ventas:', error);
            const errorMessage = error.message || 'Error desconocido inicializando select de ventas';
            mostrarNotificacion(`Error inicializando select de ventas: ${errorMessage}`, 'error');
        }
    }
    
    async cargarBoxesSelect() {
        try {
            console.log('📦 Cargando select de boxes...');
            const select = document.getElementById('boxSesion');
            if (!select) {
                console.error('❌ No se encontró el select de boxes');
                return;
            }
            
            // Importar boxesAPI dinámicamente
            const { boxesAPI } = await import('../api-client.js');
            const boxes = await boxesAPI.getAll();
            
            console.log('📦 Boxes obtenidos:', boxes.length);
            
            select.innerHTML = '<option value="">Seleccionar box...</option>';
            
            boxes.forEach(box => {
                const option = document.createElement('option');
                option.value = box.id.toString();
                option.textContent = `${box.nombre} - ${box.activo ? 'Activo' : 'Inactivo'}`;
                // Guardar sucursal_id como data attribute para uso posterior
                option.setAttribute('data-sucursal-id', box.sucursal_id);
                select.appendChild(option);
            });
            
            console.log('✅ Select de boxes cargado exitosamente:', boxes.length);
        } catch (error) {
            console.error('❌ Error cargando boxes:', error);
            const errorMessage = error.message || 'Error desconocido cargando boxes';
            mostrarNotificacion(`Error cargando boxes: ${errorMessage}`, 'error');
        }
    }
    
    async cargarProfesionalesSelect() {
        try {
            console.log('👨‍⚕️ Cargando select de profesionales...');
            const select = document.getElementById('profesionalSesion');
            if (!select) {
                console.error('❌ No se encontró el select de profesionales');
                return;
            }
            
            // Importar profesionalesAPI dinámicamente
            const { profesionalesAPI } = await import('../api-client.js');
            const profesionales = await profesionalesAPI.getAll();
            
            console.log('👨‍⚕️ Profesionales obtenidos:', profesionales.length);
            
            select.innerHTML = '<option value="">Seleccionar profesional...</option>';
            
                         profesionales.forEach(profesional => {
                 const option = document.createElement('option');
                 option.value = profesional.id.toString();
                 option.textContent = `${profesional.nombre} ${profesional.apellidos}`.trim();
                 select.appendChild(option);
             });
            
            // Configurar Select2 para profesionales con búsqueda sin mínimo de caracteres
            $(select).select2({
                placeholder: 'Seleccionar profesional...',
                allowClear: true,
                minimumInputLength: 0, // No requiere escribir al menos 2 letras
                width: '100%',
                language: {
                    noResults: function() {
                        return "No se encontraron profesionales";
                    },
                    searching: function() {
                        return "Buscando...";
                    }
                },
                // Mejorar accesibilidad
                containerCssClass: 'select2-container--accessible',
                dropdownCssClass: 'select2-dropdown--accessible'
            });
            
            console.log('✅ Select de profesionales cargado exitosamente:', profesionales.length);
        } catch (error) {
            console.error('❌ Error cargando profesionales:', error);
            const errorMessage = error.message || 'Error desconocido cargando profesionales';
            mostrarNotificacion(`Error cargando profesionales: ${errorMessage}`, 'error');
        }
    }
    
    async cargarVentasPorPaciente(pacienteId) {
        try {
            console.log('🔍 Cargando ventas para paciente ID:', pacienteId);
            const select = document.getElementById('ventaSesion');
            if (!select) {
                console.error('❌ No se encontró el select de ventas');
                return;
            }
            
            if (!pacienteId) {
                select.innerHTML = '<option value="">Seleccionar venta...</option>';
                console.log('✅ Select de ventas limpiado (sin paciente)');
                return;
            }
            
                         // Importar ventasAPI dinámicamente
             const { ventasAPI } = await import('../api-client.js');
             const ventasPaciente = await ventasAPI.getByFichaId(pacienteId);
             
             console.log('📊 Ventas obtenidas para paciente:', ventasPaciente.length);
             
             // Ordenar ventas del más reciente al más antiguo por fecha_creacion
             const ventasOrdenadas = ventasPaciente.sort((a, b) => {
                 const fechaA = new Date(a.fecha_creacion || 0);
                 const fechaB = new Date(b.fecha_creacion || 0);
                 return fechaB - fechaA; // Orden descendente (más reciente primero)
             });
             
             console.log('🔍 Ventas ordenadas del más reciente al más antiguo:', ventasOrdenadas.length);
             console.log('📋 Ventas del paciente:', ventasOrdenadas);
             
             // Log detallado de la primera venta para ver la estructura de datos
             if (ventasOrdenadas.length > 0) {
                 console.log('🔍 Estructura de datos de la primera venta:', Object.keys(ventasOrdenadas[0]));
                 console.log('📋 Datos completos de la primera venta:', ventasOrdenadas[0]);
             }
             
             select.innerHTML = '<option value="">Seleccionar venta...</option>';
             
             console.log('🔧 Configurando opciones del select de ventas...');
             
             for (const venta of ventasOrdenadas) {
                const option = document.createElement('option');
                option.value = venta.id.toString();
                
                // Crear texto descriptivo más útil y detallado usando los campos disponibles
                let ventaText = `#${venta.id}`;
                
                // Agregar nombre del tratamiento
                if (venta.tratamiento_nombre) {
                    ventaText += ` - ${venta.tratamiento_nombre}`;
                }
                
                // Agregar nombre del pack si existe
                if (venta.pack_nombre) {
                    ventaText += ` (${venta.pack_nombre})`;
                }
                
                // Agregar información de sesiones
                if (venta.cantidad_sesiones) {
                    ventaText += ` - ${venta.cantidad_sesiones} sesión${venta.cantidad_sesiones > 1 ? 'es' : ''}`;
                }
                
                // Agregar precio si existe (usar precio_lista o total_pagado)
                const precio = venta.precio_lista || venta.total_pagado;
                if (precio && precio > 0) {
                    ventaText += ` - $${parseFloat(precio).toLocaleString()}`;
                }
                
                // Agregar estado si existe
                if (venta.estado) {
                    ventaText += ` [${venta.estado}]`;
                }
                
                // Agregar fecha si existe (usar fecha_creacion)
                if (venta.fecha_creacion) {
                    const fecha = new Date(venta.fecha_creacion).toLocaleDateString('es-CL');
                    ventaText += ` - ${fecha}`;
                }
                
                                 option.textContent = ventaText;
                 select.appendChild(option);
             }
             
             console.log('✅ Ventas del paciente cargadas exitosamente:', ventasOrdenadas.length);
        } catch (error) {
            console.error('❌ Error cargando ventas del paciente:', error);
            const errorMessage = error.message || 'Error desconocido cargando ventas del paciente';
            mostrarNotificacion(`Error cargando ventas del paciente: ${errorMessage}`, 'error');
        }
    }
    
    async cargarDuracionSesion(ventaId) {
        try {
            console.log('🔍 Cargando duración para venta ID:', ventaId);
            
            // Obtener la venta del select actual
            const ventaSelect = document.getElementById('ventaSesion');
            if (!ventaSelect) {
                console.error('❌ No se encontró el select de ventas');
                return;
            }
            
            // Buscar la venta específica en las opciones del select
            const ventaOption = Array.from(ventaSelect.options).find(option => option.value == ventaId);
            if (!ventaOption) {
                console.warn('⚠️ No se encontró la venta con ID:', ventaId);
                return;
            }
            
            // Obtener los datos de la venta del atributo data o del texto
            const ventaText = ventaOption.textContent;
            console.log('📋 Texto de la venta:', ventaText);
            
            // Importar ventasAPI para obtener los datos completos de la venta
            const { ventasAPI } = await import('../api-client.js');
            const venta = await ventasAPI.getById(ventaId);
            
            if (!venta) {
                console.warn('⚠️ No se encontró la venta con ID:', ventaId);
                return;
            }
            
            console.log('📋 Datos completos de la venta:', venta);
            
            // Obtener la duración del pack o tratamiento
            const duracion = venta.duracion_sesion_min;
            
            if (duracion && duracion > 0) {
                console.log('⏱️ Duración encontrada:', duracion, 'minutos');
                
                // Actualizar el campo de duración en el formulario si existe
                const duracionInput = document.getElementById('duracionSesion');
                if (duracionInput) {
                    duracionInput.value = duracion;
                    console.log('✅ Duración actualizada en el formulario:', duracion);
                } else {
                    console.log('ℹ️ Campo de duración no encontrado en el formulario');
                }
                
                // Mostrar notificación informativa
                mostrarNotificacion(`⏱️ Duración predeterminada: ${duracion} minutos`, 'info');
            } else {
                console.warn('⚠️ No se encontró duración válida para la venta');
                mostrarNotificacion('⚠️ No se encontró duración predeterminada para esta venta', 'warning');
            }
            
        } catch (error) {
            console.error('❌ Error cargando duración de la sesión:', error);
            const errorMessage = error.message || 'Error desconocido cargando duración';
            mostrarNotificacion(`Error cargando duración: ${errorMessage}`, 'error');
        }
    }
    
    limpiarDuracionSesion() {
        console.log('🧹 Limpiando duración de la sesión');
        
        const duracionInput = document.getElementById('duracionSesion');
        if (duracionInput) {
            duracionInput.value = '';
            console.log('✅ Campo de duración limpiado');
        }
    }
    
    // Métodos auxiliares para el calendario
    calculateEndTime(fecha, hora, duracion) {
        try {
            // Validar que los parámetros sean válidos
            if (!fecha || !hora || !duracion) {
                console.warn('⚠️ Parámetros inválidos para calculateEndTime:', { fecha, hora, duracion });
                return null;
            }
            
            // Asegurar formato correcto de fecha y hora
            const fechaFormateada = fecha.toString().trim();
            const horaFormateada = hora.toString().trim();
            
            // Validar formato de fecha (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaFormateada)) {
                console.warn('⚠️ Formato de fecha inválido:', fechaFormateada);
                return null;
            }
            
            // Validar formato de hora (HH:MM)
            if (!/^\d{2}:\d{2}$/.test(horaFormateada)) {
                console.warn('⚠️ Formato de hora inválido:', horaFormateada);
                return null;
            }
            
            const start = new Date(`${fechaFormateada}T${horaFormateada}`);
            
            // Validar que la fecha sea válida
            if (isNaN(start.getTime())) {
                console.warn('⚠️ Fecha/hora inválida:', `${fechaFormateada}T${horaFormateada}`);
                return null;
            }
            
            const end = new Date(start.getTime() + (duracion * 60000)); // duracion en minutos
            return end.toISOString();
        } catch (error) {
            console.error('❌ Error en calculateEndTime:', error, { fecha, hora, duracion });
            return null;
        }
    }
    
    getEventColor(estado) {
        const colores = {
            'programada': '#FFC107',     // Amarillo
            'confirmada': '#17A2B8',     // Azul
            'en_curso': '#28A745',       // Verde
            'completada': '#6C757D',     // Gris
            'cancelada': '#DC3545',      // Rojo
            'reprogramada': '#FD7E14'    // Naranja
        };
        return colores[estado] || '#007BFF';
    }
    
    // Actualizar eventos del calendario cuando cambian las sesiones
    updateCalendarEvents() {
        if (this.calendar) {
            const events = this.sesiones.map(sesion => {
                // Extraer fecha y hora de fecha_planificada si es necesario
                let fecha, hora;
                
                if (sesion.fecha_planificada) {
                    if (typeof sesion.fecha_planificada === 'string' && sesion.fecha_planificada.includes(' ')) {
                        // Si fecha_planificada contiene fecha y hora (formato: "2025-08-23 08:00:00")
                        const [fechaPart, horaPart] = sesion.fecha_planificada.split(' ');
                        fecha = fechaPart;
                        hora = horaPart.substring(0, 5); // Tomar solo HH:MM
                    } else if (sesion.hora_planificada) {
                        // Si tenemos campos separados
                        fecha = sesion.fecha_planificada;
                        hora = sesion.hora_planificada;
                    } else {
                        // Solo fecha, usar hora por defecto
                        fecha = sesion.fecha_planificada;
                        hora = '09:00';
                    }
                }
                
                // Calcular duración (usar duración del pack o por defecto)
                const duracion = sesion.duracion_sesion_min || sesion.duracion || 60;
                
                // Crear título descriptivo
                const pacienteNombre = sesion.paciente_nombres && sesion.paciente_apellidos 
                    ? `${sesion.paciente_nombres} ${sesion.paciente_apellidos}`
                    : sesion.paciente_nombre || 'Paciente';
                
                const tratamientoNombre = sesion.tratamiento_nombre || sesion.tratamiento || 'Tratamiento';
                
                return {
                    id: sesion.id,
                    title: `${pacienteNombre} - ${tratamientoNombre}`,
                    start: `${fecha}T${hora}`,
                    end: this.calculateEndTime(fecha, hora, duracion),
                    backgroundColor: this.getEventColor(sesion.estado),
                    extendedProps: sesion
                };
            });
            
            console.log('📅 Eventos del calendario generados:', events.length);
            this.calendar.updateEvents(events);
        }
    }
}

// Exportar instancia global
export const sesionesModule = new SesionesModule();

// Hacer disponible globalmente para los botones
window.sesionesModule = sesionesModule;

// Función global para limpiar formulario de sesión
window.limpiarFormularioSesion = function() {
    sesionesModule.limpiarFormularioSesion();
};
