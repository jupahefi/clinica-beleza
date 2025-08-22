/**
 * Módulo de Gestión de Sesiones
 * Maneja el agendamiento y control de sesiones de depilación
 */

// Las zonas se obtienen desde la API, no desde constantes
import { formatCurrency, formatDate, mostrarNotificacion } from '../utils.js';
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
            console.log('✅ Zonas cargadas');
            this.setupEventListeners();
            console.log('✅ Event listeners configurados');
            this.initCalendar();
            console.log('✅ Calendario inicializado');
            await this.loadSesiones();
            console.log('✅ Sesiones cargadas');
            await this.cargarPacientesSelect();
            console.log('✅ Select de pacientes cargado');
            await this.cargarVentasSelect();
            console.log('✅ Select de ventas cargado');
            await this.cargarBoxesSelect();
            console.log('✅ Select de boxes cargado');
        } catch (error) {
            console.error('❌ Error inicializando módulo de sesiones:', error);
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
            this.calendar = new Calendar(calendarContainer, {
                events: this.sesiones.map(sesion => ({
                    id: sesion.id,
                    title: `${sesion.paciente_nombre} - ${sesion.tratamiento}`,
                    start: `${sesion.fecha_planificada}T${sesion.hora_planificada}`,
                    end: this.calculateEndTime(sesion.fecha_planificada, sesion.hora_planificada, sesion.duracion),
                    backgroundColor: this.getEventColor(sesion.estado),
                    extendedProps: sesion
                }))
            });
            console.log('✅ Calendario inicializado correctamente');
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
        
        if (!formData.venta_id || !formData.fecha_planificada) {
            console.error('❌ Campos obligatorios faltantes:', {
                venta_id: formData.venta_id,
                fecha_planificada: formData.fecha_planificada
            });
            mostrarNotificacion('Por favor complete todos los campos obligatorios', 'error');
            return;
        }
        
        try {
            console.log('📡 Enviando petición a la API...');
            const response = await sesionesAPI.create(formData);
            console.log('📥 Respuesta de la API:', response);
            
            if (response.success) {
                console.log('✅ Sesión creada exitosamente');
                mostrarNotificacion('✅ Sesión creada exitosamente', 'success');
                this.limpiarFormularioSesion();
                await this.loadSesiones(); // Recargar sesiones y actualizar calendario
            } else {
                console.error('❌ Error en la respuesta:', response.error);
                mostrarNotificacion('❌ Error: ' + (response.error || 'Error desconocido'), 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            
            // Extraer el mensaje de error real de la respuesta
            let errorMessage = 'Error desconocido creando sesión';
            
            if (error.message) {
                try {
                    // Intentar parsear el error como JSON
                    const errorData = JSON.parse(error.message);
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // Si no es JSON, usar el mensaje directo
                    errorMessage = error.message;
                }
            }
            
            mostrarNotificacion(`❌ ${errorMessage}`, 'error');
        }
    }
    
    getSesionFormData() {
        console.log('🔍 Obteniendo datos del formulario...');
        
        const ventaId = document.getElementById('ventaSesion').value;
        const fechaPlanificada = document.getElementById('fechaSesion').value;
        const horaPlanificada = document.getElementById('horaSesion').value;
        const boxId = document.getElementById('boxSesion').value;
        const observaciones = document.getElementById('observacionesSesion').value || '';
        
        console.log('📋 Valores obtenidos del formulario:', {
            ventaId,
            fechaPlanificada,
            horaPlanificada,
            boxId,
            observaciones
        });
        
        // Crear fecha_planificada completa
        const fechaPlanificadaCompleta = fechaPlanificada && horaPlanificada 
            ? `${fechaPlanificada} ${horaPlanificada}:00` 
            : null;
        
        console.log('📅 Fecha planificada completa:', fechaPlanificadaCompleta);
        
        // Solo enviar los campos que realmente necesita el SP sp_agendar_sesion
        const formData = {
            venta_id: ventaId,
            numero_sesion: 1, // Por defecto es la primera sesión
            sucursal_id: 1, // Por defecto sucursal principal
            box_id: boxId,
            profesional_id: 1, // Por defecto profesional principal
            fecha_planificada: fechaPlanificadaCompleta,
            observaciones: observaciones || null // NULL si está vacío
        };
        
        console.log('📤 Datos finales a enviar:', formData);
        return formData;
    }
    
    async abrirSesion(sesionId) {
        try {
            // Obtener datos de la sesión
            const sesion = await sesionesAPI.getById(sesionId);
            if (!sesion) {
                alert('No se pudo obtener la información de la sesión');
                return;
            }
            
            // Mostrar modal de intensidades
            this.showIntensidadesModal(sesion);
            
        } catch (error) {
            console.error('Error abriendo sesión:', error);
            const errorMessage = error.message || 'Error desconocido abriendo sesión';
            alert(`Error abriendo sesión: ${errorMessage}`);
        }
    }
    
    showAbrirSesionModal(sesion) {
        const modal = document.createElement('div');
        modal.className = 'sesion-modal';
        modal.innerHTML = `
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
                    
                    <div class="intensidades-section">
                        <h4>⚡ Intensidades por Zona</h4>
                        <div id="sesion-intensidades-grid"></div>
                    </div>
                    
                    <div class="sesion-observaciones">
                        <label>Observaciones de la sesión:</label>
                        <textarea id="sesion-observaciones" rows="3" placeholder="Observaciones de la sesión actual..."></textarea>
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
        
        document.body.appendChild(modal);
        
        // Cargar intensidades anteriores
        this.cargarIntensidadesAnteriores(sesion.paciente_id, 'sesion-intensidades-grid');
    }
    
    async confirmarAbrirSesion(sesionId) {
        const observaciones = document.getElementById('sesion-observaciones').value;
        const intensidades = this.getIntensidadesFromForm('sesion-intensidades-grid');
        
        try {
            const response = await sesionesAPI.updateSesion(sesionId, {
                accion: 'abrir',
                observaciones: observaciones,
                intensidades: intensidades
            });
            
            if (response.success) {
                alert('✅ Sesión abierta exitosamente');
                document.querySelector('.sesion-modal').remove();
                this.loadSesiones();
            } else {
                alert('❌ Error: ' + (response.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = error.message || 'Error desconocido abriendo sesión';
            alert(`❌ Error abriendo sesión: ${errorMessage}`);
        }
    }
    
    async cerrarSesion(sesionId) {
        const observaciones = prompt('Ingrese observaciones de la sesión (opcional):');
        
        try {
            const response = await sesionesAPI.cerrarSesion(sesionId, observaciones);
            
            if (response.success) {
                alert('✅ Sesión cerrada exitosamente');
                await this.loadSesiones();
            } else {
                alert('❌ Error: ' + (response.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            const errorMessage = error.message || 'Error desconocido cerrando sesión';
            alert(`❌ Error cerrando sesión: ${errorMessage}`);
        }
    }
    
    async guardarIntensidades(pacienteId, intensidades) {
        try {
            const response = await sesionesAPI.abrirSesion(pacienteId, {
                intensidades: intensidades,
                fecha: new Date().toISOString()
            });
            
            if (response.success) {
                alert('✅ Intensidades guardadas exitosamente');
            } else {
                alert('❌ Error: ' + (response.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error guardando intensidades:', error);
            const errorMessage = error.message || 'Error desconocido guardando intensidades';
            alert(`❌ Error guardando intensidades: ${errorMessage}`);
        }
    }
    
    async cargarIntensidadesAnteriores(paciente) {
        try {
            const response = await sesionesAPI.getByVentaId(paciente);
            
            if (response && response.length > 0) {
                // Obtener la última configuración de intensidades
                const ultimaConfig = response[response.length - 1];
                this.aplicarIntensidades(ultimaConfig.intensidades, 'intensidades-grid');
                alert('✅ Intensidades anteriores cargadas');
            } else {
                alert('No se encontraron intensidades anteriores para este paciente');
            }
        } catch (error) {
            console.error('Error cargando intensidades:', error);
            const errorMessage = error.message || 'Error desconocido cargando intensidades';
            alert(`Error cargando intensidades anteriores: ${errorMessage}`);
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
                    intensidad: parseFloat(intensidad) || 0,
                    frecuencia: parseFloat(frecuencia) || 1,
                    duracion: parseInt(duracion) || 10,
                    spot_size: parseInt(spot) || 8,
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
            console.error('Error cargando sesiones:', error);
            const errorMessage = error.message || 'Error desconocido cargando sesiones';
            console.error(`Error cargando sesiones: ${errorMessage}`);
        }
    }
    
    async getSesion(sesionId) {
        try {
            const sesion = await sesionesAPI.getById(sesionId);
            return sesion;
        } catch (error) {
            console.error('Error obteniendo sesión:', error);
            const errorMessage = error.message || 'Error desconocido obteniendo sesión';
            console.error(`Error obteniendo sesión: ${errorMessage}`);
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
            const response = await sesionesAPI.confirmarPaciente(sesionId);
            
                        if (response.success) {
                alert('✅ Paciente confirmado exitosamente');
                await this.loadSesiones();
  } else {
                alert('❌ Error: ' + (response.error || 'Error desconocido'));
            }
  } catch (error) {
            console.error('Error confirmando paciente:', error);
            const errorMessage = error.message || 'Error desconocido confirmando paciente';
            alert(`❌ Error confirmando paciente: ${errorMessage}`);
        }
    }
    
    async reprogramarSesion(sesionId) {
        const nuevaFecha = prompt('Ingrese la nueva fecha (YYYY-MM-DD):');
        const nuevaHora = prompt('Ingrese la nueva hora (HH:MM):');
        
        if (!nuevaFecha || !nuevaHora) {
            alert('Por favor ingrese fecha y hora válidas');
            return;
        }
        
        try {
            const response = await sesionesAPI.reprogramar(sesionId, nuevaFecha + ' ' + nuevaHora);
            
                        if (response.success) {
                alert('✅ Sesión reprogramada exitosamente');
                await this.loadSesiones();
        } else {
                alert('❌ Error: ' + (response.error || 'Error desconocido'));
        }
  } catch (error) {
            console.error('Error reprogramando sesión:', error);
            const errorMessage = error.message || 'Error desconocido reprogramando sesión';
            alert(`❌ Error reprogramando sesión: ${errorMessage}`);
        }
    }
    
    async cancelarSesion(sesionId) {
        if (!confirm('¿Está seguro de que desea cancelar esta sesión?')) return;
        
        try {
            const response = await sesionesAPI.delete(sesionId);
            
                        if (response.success) {
                alert('✅ Sesión cancelada exitosamente');
                await this.loadSesiones();
        } else {
                alert('❌ Error: ' + (response.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error cancelando sesión:', error);
            const errorMessage = error.message || 'Error desconocido cancelando sesión';
            alert(`❌ Error cancelando sesión: ${errorMessage}`);
        }
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
        
        alert(detalles);
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
            
            if (pacienteSelect) {
                $(pacienteSelect).val(null).trigger('change');
            }
            
            if (ventaSelect) {
                $(ventaSelect).val(null).trigger('change');
            }
            
            if (boxSelect) {
                $(boxSelect).val(null).trigger('change');
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
            const select = document.getElementById('pacienteSesion');
            if (!select) return;
            
            // Configurar Select2 con AJAX para búsqueda dinámica
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $(select).select2({
                    placeholder: '-- Selecciona cliente --',
                    allowClear: true,
                    width: '100%',
                    ajax: {
                        url: '/api.php?endpoint=fichas',
                        dataType: 'json',
                        delay: 250,
                        data: function (params) {
                            return {
                                search: params.term,
                                page: params.page || 1
                            };
                        },
                        processResults: function (data, params) {
                            params.page = params.page || 1;
                            
                            return {
                                results: data.data.map(paciente => ({
                                    id: paciente.id,
                                    text: `${paciente.nombres} ${paciente.apellidos} - ${paciente.rut || paciente.codigo}`
                                })),
                                pagination: {
                                    more: false
                                }
                            };
                        },
                        cache: true
                    },
                    minimumInputLength: 0
                });
                
                // Cargar todos los pacientes inicialmente
                const { fichasAPI } = await import('../api-client.js');
                const pacientes = await fichasAPI.getAll();
                
                const options = pacientes.map(paciente => ({
                    id: paciente.id,
                    text: `${paciente.nombres} ${paciente.apellidos} - ${paciente.rut || paciente.codigo}`
                }));
                
                $(select).empty().select2({
                    placeholder: '-- Selecciona cliente --',
                    allowClear: true,
                    width: '100%',
                    data: options
                });
                
                // Asegurar que no haya valor seleccionado por defecto
                $(select).val(null).trigger('change');
                
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
                    option.textContent = `${paciente.nombres} ${paciente.apellidos} - ${paciente.rut || paciente.codigo}`;
                    select.appendChild(option);
                });
                
                // Configurar eventos para select nativo
                this.configurarEventosPaciente();
            }
            
            console.log('✅ Select de pacientes cargado');
        } catch (error) {
            console.error('❌ Error cargando pacientes:', error);
        }
    }
    
    async cargarVentasSelect() {
        try {
            const select = document.getElementById('ventaSesion');
            if (!select) return;
            
            // Inicializar select vacío - se cargará cuando se seleccione un paciente
            select.innerHTML = '<option value="">Seleccionar venta...</option>';
            
            console.log('✅ Select de ventas inicializado');
        } catch (error) {
            console.error('❌ Error inicializando select de ventas:', error);
        }
    }
    
    async cargarBoxesSelect() {
        try {
            const select = document.getElementById('boxSesion');
            if (!select) return;
            
            // Importar boxesAPI dinámicamente
            const { boxesAPI } = await import('../api-client.js');
            const boxes = await boxesAPI.getAll();
            
            select.innerHTML = '<option value="">Seleccionar box...</option>';
            
            boxes.forEach(box => {
                const option = document.createElement('option');
                option.value = box.id.toString();
                option.textContent = `${box.nombre} - ${box.estado}`;
                select.appendChild(option);
            });
            
            console.log('✅ Select de boxes cargado:', boxes.length);
        } catch (error) {
            console.error('❌ Error cargando boxes:', error);
        }
    }
    
    async cargarVentasPorPaciente(pacienteId) {
        try {
            const select = document.getElementById('ventaSesion');
            if (!select) {
                console.error('❌ No se encontró el select de ventas');
                return;
            }
            
            console.log('🔍 Cargando ventas para paciente ID:', pacienteId);
            
            if (!pacienteId) {
                select.innerHTML = '<option value="">Seleccionar venta...</option>';
                console.log('✅ Select de ventas limpiado (sin paciente)');
                return;
            }
            
            // Importar ventasAPI dinámicamente
            const { ventasAPI } = await import('../api-client.js');
            const ventas = await ventasAPI.getAll();
            
            console.log('📊 Total de ventas obtenidas:', ventas.length);
            
            // Filtrar ventas por paciente
            const ventasPaciente = ventas.filter(venta => venta.ficha_id == pacienteId);
            
            console.log('🔍 Ventas filtradas para paciente', pacienteId, ':', ventasPaciente.length);
            console.log('📋 Ventas del paciente:', ventasPaciente);
            
            select.innerHTML = '<option value="">Seleccionar venta...</option>';
            
                         for (const venta of ventasPaciente) {
                 const option = document.createElement('option');
                 option.value = venta.id.toString();
                 
                 // Crear texto descriptivo más útil
                 let ventaText = `#${venta.id}`;
                 
                 // Agregar nombre del tratamiento
                 if (venta.tratamiento?.nombre) {
                     ventaText += ` ${venta.tratamiento.nombre}`;
                 }
                 
                 // Agregar información de sesiones
                 if (venta.cantidad_sesiones) {
                     ventaText += ` (${venta.cantidad_sesiones} sesión${venta.cantidad_sesiones > 1 ? 'es' : ''})`;
                 }
                 
                 // Agregar precio si existe
                 if (venta.precio_total && venta.precio_total > 0) {
                     ventaText += ` - $${venta.precio_total.toLocaleString()}`;
                 }
                 
                 // Agregar fecha si existe
                 if (venta.fecha_venta) {
                     const fecha = new Date(venta.fecha_venta).toLocaleDateString('es-CL');
                     ventaText += ` - ${fecha}`;
                 }
                 
                 option.textContent = ventaText;
                 select.appendChild(option);
             }
            
            console.log('✅ Ventas del paciente cargadas:', ventasPaciente.length);
        } catch (error) {
            console.error('❌ Error cargando ventas del paciente:', error);
            console.error('Error completo:', error);
        }
    }
    
    // Métodos auxiliares para el calendario
    calculateEndTime(fecha, hora, duracion) {
        const start = new Date(`${fecha}T${hora}`);
        const end = new Date(start.getTime() + (duracion * 60000)); // duracion en minutos
        return end.toISOString();
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
            const events = this.sesiones.map(sesion => ({
                id: sesion.id,
                title: `${sesion.paciente_nombre} - ${sesion.tratamiento}`,
                start: `${sesion.fecha_planificada}T${sesion.hora_planificada}`,
                end: this.calculateEndTime(sesion.fecha_planificada, sesion.hora_planificada, sesion.duracion),
                backgroundColor: this.getEventColor(sesion.estado),
                extendedProps: sesion
            }));
            this.calendar.updateEvents(events);
        }
    }
}

// Exportar instancia global
export const sesionesModule = new SesionesModule();

// Hacer disponible globalmente para los botones
window.sesionesModule = sesionesModule;
