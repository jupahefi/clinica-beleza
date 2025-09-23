/**
 * Módulo de Gestión de Sesiones
 * Maneja el agendamiento y control de sesiones de depilación
 */

// Las zonas se obtienen desde la API, no desde constantes
import { formatCurrency, formatDate, mostrarNotificacion, mostrarErrorInteligente, getCurrentProfesionalId } from '../utils.js';
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
        try {
            await this.cargarZonas();
            this.setupEventListeners();
            this.initCalendar();
            await this.loadSesiones();
            await this.cargarPacientesSelect();
            await this.cargarVentasSelect();
            await this.cargarBoxesSelect();
            await this.cargarProfesionalesSelect();
        } catch (error) {
            const errorMessage = error.message || 'Error desconocido inicializando módulo de sesiones';
            mostrarNotificacion(`Error inicializando módulo de sesiones: ${errorMessage}`, 'error');
        }
    }
    
    async cargarZonas() {
        try {
            // Importar zonasAPI dinámicamente
            const { zonasAPI } = await import('../api-client.js');
            this.zonas = await zonasAPI.getAll();
        } catch (error) {
            const errorMessage = error.message || 'Error desconocido cargando zonas';
            mostrarNotificacion(`Error cargando zonas: ${errorMessage}`, 'error');
            this.zonas = [];
        }
    }
    
    initCalendar() {
        // Intentar inicializar inmediatamente
        this.tryInitCalendar();
        
        // Si no funciona, intentar después de un pequeño delay
        setTimeout(() => {
            if (!this.calendar) {
                this.tryInitCalendar();
            }
        }, 100);
        
        // También intentar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (!this.calendar) {
                    this.tryInitCalendar();
                }
            });
        }
    }
    
    tryInitCalendar() {
        const calendarContainer = document.getElementById('calendar-wrapper');
        
        if (calendarContainer && typeof Calendar !== 'undefined') {
            
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
                const duracion = sesion.duracion_sesion_min || sesion.duracion || 30;
                
                // Crear título descriptivo
                const pacienteNombre = sesion.nombres && sesion.apellidos 
                    ? `${sesion.nombres} ${sesion.apellidos}`
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
                    } else {
            // No se pudo inicializar el calendario
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
                const form = document.getElementById('sesionForm');
                
        if (form) {
                        form.addEventListener('submit', (e) => {
                                e.preventDefault();
                                this.crearSesion();
            });
                    } else {
            // No se encontró el formulario de sesión
        }
        
        // Configurar evento para cargar ventas cuando se selecciona un paciente
        this.configurarEventosPaciente();
    }
    
    configurarEventosPaciente() {
        const pacienteSelect = document.getElementById('pacienteSesion');
        if (!pacienteSelect) {
            return;
        }
        
                
        // Para Select2, usar el evento de jQuery
        if (typeof $ !== 'undefined' && $.fn.select2) {
                        
            // Remover eventos anteriores si existen
            $(pacienteSelect).off('select2:select select2:clear');
            
            $(pacienteSelect).on('select2:select', (e) => {
                                this.cargarVentasPorPaciente(e.params.data.id);
            });
            
            $(pacienteSelect).on('select2:clear', () => {
                                this.cargarVentasPorPaciente(null);
            });
            
                    } else {
                        // Fallback para select normal
            pacienteSelect.removeEventListener('change', this.handlePacienteChange);
            pacienteSelect.addEventListener('change', this.handlePacienteChange.bind(this));
                    }
        
        // Configurar eventos para el select de ventas
        this.configurarEventosVenta();
    }
    
    configurarEventosVenta() {
        const ventaSelect = document.getElementById('ventaSesion');
        if (!ventaSelect) {
            return;
        }
        
        // El select de ventas es NATIVO, no Select2
                
        // Remover TODOS los event listeners anteriores
        const newVentaSelect = ventaSelect.cloneNode(true);
        ventaSelect.parentNode.replaceChild(newVentaSelect, ventaSelect);
        
        // Agregar el event listener al nuevo elemento
        newVentaSelect.addEventListener('change', this.handleVentaChangeNative.bind(this));
            }
    
    handleVentaChangeNative(e) {
                this.handleVentaChange(e.target.value);
    }
    
    handleVentaChange(ventaId) {
        if (!ventaId) {
                        this.limpiarDuracionSesion();
            return;
        }
        
                this.cargarDuracionSesion(ventaId);
    }
    
    handlePacienteChange(e) {
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
                const formData = this.getSesionFormData();
                
        if (!formData.venta_id || !formData.fecha_planificada || !formData.profesional_id) {
            mostrarNotificacion('Por favor complete todos los campos obligatorios (paciente, venta, profesional, fecha y hora)', 'error');
            return;
        }
        
        try {
                        const response = await sesionesAPI.create(formData);
                        
            // Si llegamos aquí, la petición fue exitosa
                        mostrarNotificacion('✅ Sesión creada exitosamente', 'success');
            this.limpiarFormularioSesion();
            await this.loadSesiones(); // Recargar sesiones y actualizar calendario
            
        } catch (error) {
            mostrarErrorInteligente(error, 'Error en crearSesion');
        }
    }
    
    getSesionFormData() {
                
        const ventaId = document.getElementById('ventaSesion').value;
        const fechaPlanificada = document.getElementById('fechaSesion').value;
        const horaPlanificada = document.getElementById('horaSesion').value;
        const boxId = document.getElementById('boxSesion').value;
        const profesionalId = document.getElementById('profesionalSesion').value;
        const duracion = document.getElementById('duracionSesion').value;
        const observaciones = document.getElementById('observacionesSesion').value || '';
        
        // Crear fecha_planificada completa
        const fechaPlanificadaCompleta = fechaPlanificada && horaPlanificada 
            ? `${fechaPlanificada} ${horaPlanificada}:00` 
            : null;
        
                
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
        
                return formData;
    }
    
    async abrirSesion(sesionId) {
        try {
                        
            // Obtener datos de la sesión
            const sesion = await sesionesAPI.getById(sesionId);
            if (!sesion) {
                mostrarNotificacion('No se pudo obtener la información de la sesión', 'error');
                return;
            }
            
                        
            // Mostrar modal de apertura de sesión
            this.showAbrirSesionModal(sesion);
            
        } catch (error) {
            mostrarErrorInteligente(error, 'Error abriendo sesión');
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
                mostrarNotificacion(' Debe seleccionar el tipo de ficha específica para la evaluación', 'error');
                return;
            }
            
            if (consentimientoElement && !consentimientoVerificado) {
                mostrarNotificacion(' Debe verificar el consentimiento informado antes de continuar', 'error');
                return;
            }
            
                        // Primero abrir la sesión en la base de datos
            const response = await sesionesAPI.abrirSesion(sesionId);
            
            if (response.success) {
                                
                // Guardar intensidades si existen (para depilaciones)
                if (Object.keys(intensidades).length > 0) {
                                        await this.guardarIntensidades(sesionId, intensidades);
                }
                
                // Preparar datos específicos según el tipo de tratamiento
                if (tipoFicha) {
                    // Para evaluaciones - almacenar tipo de ficha específica
                    sessionStorage.setItem(`evaluacion_${sesionId}`, JSON.stringify({
                        tipo_ficha: tipoFicha,
                        fecha_evaluacion: new Date().toISOString()
                    }));
                                        mostrarNotificacion('✅ Evaluación iniciada. Al cerrar la sesión se creará la ficha específica.', 'success');
                    
                } else if (productosFaciales) {
                    // Para faciales - almacenar productos utilizados
                    sessionStorage.setItem(`facial_${sesionId}`, JSON.stringify({
                        productos_utilizados: productosFaciales,
                        fecha_tratamiento: new Date().toISOString()
                    }));
                                        mostrarNotificacion('✅ Tratamiento facial iniciado', 'success');
                    
                } else if (estadoCueroCabelludo || tratamientosCapilares) {
                    // Para capilares - almacenar evaluación y tratamientos
                    sessionStorage.setItem(`capilar_${sesionId}`, JSON.stringify({
                        estado_cuero_cabelludo: estadoCueroCabelludo,
                        tratamientos_aplicados: tratamientosCapilares,
                        fecha_tratamiento: new Date().toISOString()
                    }));
                                        mostrarNotificacion('✅ Tratamiento capilar iniciado', 'success');
                    
                } else if (consentimientoVerificado) {
                    // Para depilaciones
                                        mostrarNotificacion('✅ Sesión de depilación iniciada', 'success');
                } else {
                    // Genérico
                                        mostrarNotificacion('✅ Sesión abierta exitosamente', 'success');
                }
                
                document.querySelector('.sesion-modal').remove();
                await this.loadSesiones();
            } else {
                mostrarErrorInteligente(response.error || response, 'Error abriendo sesión');
            }
        } catch (error) {
            mostrarErrorInteligente(error, 'Error confirmando apertura de sesión');
        }
    }
    
    async cerrarSesion(sesionId) {
                
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
                                
                // Verificar si hay datos específicos de tratamiento pendientes
                const evaluacionData = sessionStorage.getItem(`evaluacion_${sesionId}`);
                const facialData = sessionStorage.getItem(`facial_${sesionId}`);
                const capilarData = sessionStorage.getItem(`capilar_${sesionId}`);
                
                let datosGuardados = false;
                let tipoTratamiento = 'genérico';
                
                if (evaluacionData) {
                    const datos = JSON.parse(evaluacionData);
                                        
                    if (datos.tipo_ficha) {
                                                mostrarNotificacion(`📋 Creando ficha específica de ${datos.tipo_ficha}...`, 'info');
                        
                        try {
                            // Crear ficha específica automáticamente
                            await this.crearFichaEspecificaDesdeEvaluacion(sesionId, datos);
                            datosGuardados = true;
                            tipoTratamiento = 'evaluación';
                            sessionStorage.removeItem(`evaluacion_${sesionId}`);
                                                    } catch (error) {
                            mostrarErrorInteligente(error, 'Error creando ficha específica');
                            return; // No continuar si falla la creación de ficha
                        }
                    }
                    
                } else if (facialData) {
                    const datos = JSON.parse(facialData);
                                        
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
                                                                    } catch (error) {
                            mostrarErrorInteligente(error, 'Error guardando datos de facial');
                            return; // No continuar si falla el guardado
                        }
                    
                } else if (capilarData) {
                    const datos = JSON.parse(capilarData);
                                        
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
                                                                    } catch (error) {
                            mostrarErrorInteligente(error, 'Error guardando datos de capilar');
                            return; // No continuar si falla el guardado
                        }
                }
                
                                // Cerrar la sesión
                const response = await sesionesAPI.cerrarSesion(sesionId, observaciones);
                
                if (response.success) {
                                        
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
                    mostrarErrorInteligente(response.error || response, 'Error cerrando sesión');
                }
            } catch (error) {
                mostrarErrorInteligente(error, 'Error cerrando sesión');
            } finally {
                modal.hide();
                // Limpiar modal del DOM
                document.getElementById('observacionesModal').remove();
            }
        };
    }
    
    async guardarDatosSesion(sesionId, datosTratamiento) {
        try {
                        
            // Actualizar el campo datos_sesion usando la API de sesiones
            const response = await sesionesAPI.updateDatosSesion(sesionId, datosTratamiento);
            
            if (response.success) {
                                return response.data;
            } else {
                throw new Error(response.error || 'Error guardando datos de sesión');
            }
            
        } catch (error) {
            throw error;
        }
    }
    
    async crearFichaEspecificaDesdeEvaluacion(sesionId, datosEvaluacion) {
        try {
                                    
            // Obtener información de la sesión para extraer datos necesarios
            const sesion = await sesionesAPI.getById(sesionId);
            if (!sesion.success) {
                throw new Error('No se pudo obtener información de la sesión');
            }
            
            const sesionData = sesion.data;
            const ventaId = sesionData.venta_id;
                        
            // Obtener información de la venta para extraer evaluacion_id
            const venta = await ventasAPI.getById(ventaId);
            if (!venta.success) {
                throw new Error('No se pudo obtener información de la venta');
            }
            
            const ventaData = venta.data;
            const evaluacionId = ventaData.evaluacion_id;
                        
            if (!evaluacionId) {
                throw new Error('Esta venta no tiene una evaluación asociada');
            }
            
            // Obtener tipo de ficha específica por nombre
            const tipoFicha = datosEvaluacion.tipo_ficha.toUpperCase();
            const tipoFichaId = tipoFicha === 'DEPILACION' ? 1 : 2; // Por ahora hardcodeado, debería venir de la DB
                        
            // Crear datos básicos de ficha específica
            const fichaData = {
                evaluacion_id: evaluacionId,
                tipo_id: tipoFichaId,
                datos: this.generarDatosFichaEspecifica(tipoFicha, sesionData),
                observaciones: `Ficha creada automáticamente desde evaluación el ${new Date().toLocaleString()}`
            };
            
                        
            // Crear la ficha específica
            const response = await fichasEspecificasAPI.create(fichaData);
            
            if (response.success) {
                                mostrarNotificacion(`✅ Ficha específica de ${tipoFicha} creada exitosamente`, 'success');
                return response.data;
            } else {
                throw new Error(response.error || 'Error creando ficha específica');
            }
            
        } catch (error) {
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
                // No necesita cargar intensidades, se enfoca en la evaluación
        // Los eventos específicos de evaluación se manejan en confirmarAbrirSesion
    }
    
    configurarEventosDepilacion(sesion) {
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
                // Configuración específica para tratamientos faciales
        // Los campos específicos de facial se manejan en confirmarAbrirSesion
    }
    
    configurarEventosCapilar(sesion) {
                // Configuración específica para tratamientos capilares
        // Los campos específicos de capilar se manejan en confirmarAbrirSesion
    }
    
    configurarEventosGenerico(sesion) {
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
                mostrarErrorInteligente(response.error || response, 'Error guardando intensidades');
            }
        } catch (error) {
            mostrarErrorInteligente(error, 'Error guardando intensidades');
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
            mostrarErrorInteligente(error, 'Error cargando intensidades');
        }
    }
    
    getIntensidadesFromForm(gridId) {
        const intensidades = {};
        
        if (!this.zonas || this.zonas.length === 0) {
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
                try {
            this.sesiones = await sesionesAPI.getAll();
                        this.renderSesiones();
                        this.updateCalendarEvents(); // Actualizar calendario
                    } catch (error) {
            mostrarErrorInteligente(error, 'Error cargando sesiones');
        }
    }
    
    async getSesion(sesionId) {
        try {
                        const sesion = await sesionesAPI.getById(sesionId);
                        return sesion;
        } catch (error) {
            mostrarErrorInteligente(error, 'Error obteniendo sesión');
            return null;
        }
    }
    
    renderSesiones() {
                        const tbody = document.getElementById('cuerpoTablaSesiones');
                if (!tbody) {
            return;
        }
    
        tbody.innerHTML = '';
                
        this.sesiones.forEach(sesion => {
                                    
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Paciente">${sesion.nombres && sesion.apellidos ? `${sesion.nombres} ${sesion.apellidos}` : 'N/A'}</td>
                <td data-label="Venta ID">${sesion.venta_id || 'N/A'}</td>
                <td data-label="Box">${sesion.box_nombre || 'N/A'}</td>
                <td data-label="Fecha">${formatDate(sesion.fecha_planificada)}</td>
                <td data-label="Hora">${sesion.hora_planificada || this.extractHoraFromFecha(sesion.fecha_planificada) || 'N/A'}</td>
                <td data-label="Duración">${sesion.duracion_sesion_min || sesion.duracion || 'N/A'} min</td>
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
                        
            const response = await sesionesAPI.confirmarPaciente(sesionId);
            
            if (response.success) {
                                mostrarNotificacion('✅ Paciente confirmado exitosamente', 'success');
                await this.loadSesiones();
            } else {
                mostrarErrorInteligente(response.error || response, 'Error confirmando paciente');
            }
        } catch (error) {
            mostrarErrorInteligente(error, 'Error confirmando paciente');
        }
    }
    
    async reprogramarSesion(sesionId) {
                
        // Verificar que Bootstrap esté disponible
        if (typeof bootstrap === 'undefined') {
            mostrarNotificacion(' Error: Bootstrap no está disponible', 'error');
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
                                                const response = await sesionesAPI.reprogramar(sesionId, nuevaFecha + ' ' + nuevaHora);
                        
                        if (response.success) {
                                                        mostrarNotificacion('✅ Sesión reprogramada exitosamente', 'success');
                            await this.loadSesiones();
                        } else {
                            mostrarErrorInteligente(response.error || response, 'Error reprogramando sesión');
                        }
                    } catch (error) {
                        mostrarErrorInteligente(error, 'Error reprogramando sesión');
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
                
        // Verificar que Bootstrap esté disponible
        if (typeof bootstrap === 'undefined') {
            mostrarNotificacion(' Error: Bootstrap no está disponible', 'error');
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
                                                const response = await sesionesAPI.delete(sesionId);
                        
                        if (response.success) {
                                                        mostrarNotificacion('✅ Sesión cancelada exitosamente', 'success');
                            await this.loadSesiones();
                                    } else {
                mostrarErrorInteligente(response.error || response, 'Error cancelando sesión');
            }
        } catch (error) {
            mostrarErrorInteligente(error, 'Error cancelando sesión');
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
        
            }

    async loadPacientes() {
        // Este método se mantiene para compatibilidad con main.js
        // Los pacientes se cargan dinámicamente cuando se necesitan
        await this.cargarPacientesSelect();
    }
    
    async cargarPacientesSelect() {
        try {
                        const select = document.getElementById('pacienteSesion');
            if (!select) {
                return;
            }
            
            // Configurar Select2 exactamente igual que en ventas
            if (typeof $ !== 'undefined' && $.fn.select2) {
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
                            } else {
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
            }
        } catch (error) {
            mostrarErrorInteligente(error, 'Error cargando pacientes');
        }
    }
    
    async cargarVentasSelect() {
        try {
            const select = document.getElementById('ventaSesion');
            if (!select) {
                return;
            }
            
            // Inicializar select vacío - se cargará cuando se seleccione un paciente
            select.innerHTML = '<option value="">Seleccionar venta...</option>';
        } catch (error) {
            mostrarErrorInteligente(error, 'Error inicializando select de ventas');
        }
    }
    
    async cargarBoxesSelect() {
        try {
            const select = document.getElementById('boxSesion');
            if (!select) {
                return;
            }
            
            // Importar boxesAPI dinámicamente
            const { boxesAPI } = await import('../api-client.js');
            const boxes = await boxesAPI.getAll();
            
            select.innerHTML = '<option value="">Seleccionar box...</option>';
            
            boxes.forEach(box => {
                const option = document.createElement('option');
                option.value = box.id.toString();
                option.textContent = `${box.nombre} - ${box.activo ? 'Activo' : 'Inactivo'}`;
                // Guardar sucursal_id como data attribute para uso posterior
                option.setAttribute('data-sucursal-id', box.sucursal_id);
                select.appendChild(option);
            });
        } catch (error) {
            mostrarErrorInteligente(error, 'Error cargando boxes');
        }
    }
    
    async cargarProfesionalesSelect() {
        try {
            const select = document.getElementById('profesionalSesion');
            if (!select) {
                return;
            }
            
            // Importar profesionalesAPI dinámicamente
            const { profesionalesAPI } = await import('../api-client.js');
            const profesionales = await profesionalesAPI.getAll();
            
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
        } catch (error) {
            mostrarErrorInteligente(error, 'Error cargando profesionales');
        }
    }
    
    async cargarVentasPorPaciente(pacienteId) {
        try {
                        const select = document.getElementById('ventaSesion');
            if (!select) {
                return;
            }
            
            if (!pacienteId) {
                select.innerHTML = '<option value="">Seleccionar venta...</option>';
                                return;
            }
            
            // Importar ventasAPI dinámicamente
            const { ventasAPI } = await import('../api-client.js');
             const ventasPaciente = await ventasAPI.getByFichaId(pacienteId);
             
                          
             // Ordenar ventas del más reciente al más antiguo por fecha_creacion
             const ventasOrdenadas = ventasPaciente.sort((a, b) => {
                 const fechaA = new Date(a.fecha_creacion || 0);
                 const fechaB = new Date(b.fecha_creacion || 0);
                 return fechaB - fechaA; // Orden descendente (más reciente primero)
             });
             
                                       
             // Log detallado de la primera venta para ver la estructura de datos
             if (ventasOrdenadas.length > 0) {
                                               }
            
            select.innerHTML = '<option value="">Seleccionar venta...</option>';
            
                          
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
            
                     } catch (error) {
            mostrarErrorInteligente(error, 'Error cargando ventas del paciente');
        }
    }
    
    async cargarDuracionSesion(ventaId) {
        try {
                        
            // Obtener la venta del select actual
            const ventaSelect = document.getElementById('ventaSesion');
                    if (!ventaSelect) {
            return;
        }
            
            // Buscar la venta específica en las opciones del select
            const ventaOption = Array.from(ventaSelect.options).find(option => option.value == ventaId);
            if (!ventaOption) {
                return;
            }
            
            // Obtener los datos de la venta del atributo data o del texto
            const ventaText = ventaOption.textContent;
                        
            // Importar ventasAPI para obtener los datos completos de la venta
            const { ventasAPI } = await import('../api-client.js');
            const venta = await ventasAPI.getById(ventaId);
            
            if (!venta) {
                return;
            }
            
                        
            // Obtener la duración del pack o tratamiento
            const duracion = venta.duracion_sesion_min;
            
            if (duracion && duracion > 0) {
                                
                // Actualizar el campo de duración en el formulario si existe
                const duracionInput = document.getElementById('duracionSesion');
                if (duracionInput) {
                    duracionInput.value = duracion;
                                    } else {
                                    }
                
                // Mostrar notificación informativa
                mostrarNotificacion(`⏱️ Duración predeterminada: ${duracion} minutos`, 'info');
            } else {
                mostrarNotificacion('⚠️ No se encontró duración predeterminada para esta venta', 'warning');
            }
            
        } catch (error) {
            mostrarErrorInteligente(error, 'Error cargando duración de la sesión');
        }
    }
    
    limpiarDuracionSesion() {
                
        const duracionInput = document.getElementById('duracionSesion');
        if (duracionInput) {
            duracionInput.value = '';
                    }
    }
    
    // Métodos auxiliares para el calendario
    calculateEndTime(fecha, hora, duracion) {
        try {
            // Validar que los parámetros sean válidos
            if (!fecha || !hora || !duracion) {
                return null;
            }
            
            // Asegurar formato correcto de fecha y hora
            const fechaFormateada = fecha.toString().trim();
            const horaFormateada = hora.toString().trim();
            
            // Validar formato de fecha (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaFormateada)) {
                return null;
            }
            
            // Validar formato de hora (HH:MM)
            if (!/^\d{2}:\d{2}$/.test(horaFormateada)) {
                return null;
            }
            
            const start = new Date(`${fechaFormateada}T${horaFormateada}`);
            
            // Validar que la fecha sea válida
            if (isNaN(start.getTime())) {
                return null;
            }
            
            const end = new Date(start.getTime() + (duracion * 60000)); // duracion en minutos
            // Usar formato local en lugar de ISO para evitar problemas de zona horaria
            return `${fechaFormateada}T${end.toTimeString().substring(0, 5)}`;
        } catch (error) {
            return null;
        }
    }
    
    extractHoraFromFecha(fechaPlanificada) {
        if (!fechaPlanificada) return null;
        
        // Si fecha_planificada contiene fecha y hora (formato: "2025-08-25 08:00:00")
        if (typeof fechaPlanificada === 'string' && fechaPlanificada.includes(' ')) {
            const [, horaPart] = fechaPlanificada.split(' ');
            return horaPart.substring(0, 5); // Tomar solo HH:MM
        }
        
        return null;
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
                const duracion = sesion.duracion_sesion_min || sesion.duracion || 30;
                
                // Crear título descriptivo
                const pacienteNombre = sesion.nombres && sesion.apellidos 
                    ? `${sesion.nombres} ${sesion.apellidos}`
                    : sesion.paciente_nombre || 'Paciente';
                
                const tratamientoNombre = sesion.tratamiento_nombre || sesion.tratamiento || 'Tratamiento';
                
                return {
                    id: sesion.id,
                    title: `${pacienteNombre} - ${tratamientoNombre}`,
                    start: `${fecha}T${hora}`,
                    end: this.calculateEndTime(fecha, hora, duracion),
                    backgroundColor: this.getEventColor(sesion.estado),
                    fecha_planificada: sesion.fecha_planificada,
                    nombres: sesion.nombres,
                    apellidos: sesion.apellidos,
                    duracion_sesion_min: sesion.duracion_sesion_min,
                    extendedProps: sesion
                };
            });
            
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
