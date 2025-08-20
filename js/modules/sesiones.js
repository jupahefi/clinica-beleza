/**
 * Módulo de Gestión de Sesiones
 * Maneja el agendamiento y control de sesiones de depilación
 */

import { ZONAS_CUERPO, ZONAS_CUERPO_LABELS } from '../constants.js';
import { formatCurrency, formatDate } from '../utils.js';
import { sesionesAPI, fichasAPI } from '../api-client.js';
import '../calendar.js';

export class SesionesModule {
    constructor() {
        this.sesiones = [];
        this.intensidades = {}; // Almacena intensidades por paciente y zona
        this.calendar = null; // Instancia del calendario
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.initCalendar();
        await this.loadSesiones();
    }
    
    initCalendar() {
        // Inicializar el calendario cuando el contenedor esté disponible
        document.addEventListener('DOMContentLoaded', () => {
            const calendarContainer = document.getElementById('calendar-container');
            if (calendarContainer && typeof Calendar !== 'undefined') {
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
            }
        });
    }
    
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupSesionForm();
            this.setupIntensidadesForm();
        });
    }
    
    setupSesionForm() {
        const form = document.getElementById('sesionForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.crearSesion();
            });
        }
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
        
        Object.entries(ZONAS_CUERPO_LABELS).forEach(([key, label]) => {
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
                <label class="zona-label" style="font-weight: 600; color: #333;">${label}</label>
                <div class="intensidad-controls">
                    <label>Intensidad (J/cm²):</label>
                    <input type="number" 
                           id="intensidad_${key}" 
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
                           id="frecuencia_${key}" 
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
                           id="duracion_${key}" 
                           class="duracion-input" 
                           min="1" 
                           max="100" 
                           step="1" 
                           placeholder="10"
                           style="width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div class="intensidad-controls">
                    <label>Spot Size (mm):</label>
                    <select id="spot_${key}" class="spot-select" style="width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
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
                    <textarea id="obs_${key}" 
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
        
        if (!formData.paciente_id || !formData.venta_id || !formData.fecha_planificada || !formData.hora_planificada) {
            alert('Por favor complete todos los campos obligatorios');
            return;
        }
        
        try {
            const response = await sesionesAPI.create(formData);
            
            if (response.success) {
                alert('✅ Sesión creada exitosamente');
                this.limpiarFormularioSesion();
                await this.loadSesiones(); // Recargar sesiones y actualizar calendario
            } else {
                alert('❌ Error: ' + (response.error || 'Error desconocido'));
            }
  } catch (error) {
            console.error('Error:', error);
            alert('❌ Error creando sesión: ' + error.message);
        }
    }
    
    getSesionFormData() {
        return {
            paciente_id: document.getElementById('pacienteSesion').value,
            venta_id: document.getElementById('ventaSesion').value,
            box_id: document.getElementById('boxSesion').value,
            fecha_planificada: document.getElementById('fechaSesion').value,
            hora_planificada: document.getElementById('horaSesion').value,
            duracion: document.getElementById('duracionSesion').value || 60,
            observaciones: document.getElementById('observacionesSesion').value
        };
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
            alert('Error abriendo sesión: ' + error.message);
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
            alert('❌ Error abriendo sesión: ' + error.message);
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
            alert('❌ Error cerrando sesión: ' + error.message);
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
            alert('❌ Error guardando intensidades: ' + error.message);
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
            alert('Error cargando intensidades anteriores: ' + error.message);
        }
    }
    
    getIntensidadesFromForm(gridId) {
        const intensidades = {};
        
        Object.keys(ZONAS_CUERPO).forEach(zona => {
            const intensidad = document.getElementById(`intensidad_${zona}`)?.value;
            const frecuencia = document.getElementById(`frecuencia_${zona}`)?.value;
            const duracion = document.getElementById(`duracion_${zona}`)?.value;
            const spot = document.getElementById(`spot_${zona}`)?.value;
            const observaciones = document.getElementById(`obs_${zona}`)?.value;
            
            if (intensidad || frecuencia || duracion || spot || observaciones) {
                intensidades[zona] = {
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
        try {
            this.sesiones = await sesionesAPI.getAll();
            this.renderSesiones();
            this.updateCalendarEvents(); // Actualizar calendario
        } catch (error) {
            console.error('Error cargando sesiones:', error);
        }
    }
    
    async getSesion(sesionId) {
        try {
            const sesion = await sesionesAPI.getById(sesionId);
            return sesion;
        } catch (error) {
            console.error('Error obteniendo sesión:', error);
            return null;
        }
    }
    
    renderSesiones() {
    const tbody = document.getElementById('cuerpoTablaSesiones');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
        this.sesiones.forEach(sesion => {
        const row = document.createElement('tr');
        row.innerHTML = `
                <td>${sesion.paciente_nombre || 'N/A'}</td>
                <td>${sesion.venta_id || 'N/A'}</td>
                <td>${sesion.box_nombre || 'N/A'}</td>
                <td>${formatDate(sesion.fecha_planificada)}</td>
                <td>${sesion.hora_planificada || 'N/A'}</td>
                <td>${sesion.duracion || 'N/A'} min</td>
                <td>
                    <span class="status-badge status-${sesion.estado}">
                        ${this.getEstadoLabel(sesion.estado)}
                    </span>
                </td>
            <td>
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
            alert('❌ Error confirmando paciente: ' + error.message);
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
            alert('❌ Error reprogramando sesión: ' + error.message);
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
            alert('❌ Error cancelando sesión: ' + error.message);
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
    }

    async loadPacientes() {
        // Este método se mantiene para compatibilidad con main.js
        // Los pacientes se cargan dinámicamente cuando se necesitan
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
