/**
 * Módulo de gestión de reportes
 * Solo historial de actividad - simple y funcional
 */

import { logsActividadAPI, profesionalesAPI } from '../api-client.js';
import { mostrarNotificacion } from '../utils.js';

export class ReportesModule {
    constructor() {
        this.logsActividad = [];
        this.profesionales = [];
        this.init();
    }

    async init() {
        this.configurarEventos();
        this.establecerFechasPorDefecto();
        await this.cargarProfesionales();
        await this.cargarHistorialActividad();
    }

    configurarEventos() {
        const btnFiltrarLogs = document.getElementById('btnFiltrarLogs');
        if (btnFiltrarLogs) {
            btnFiltrarLogs.addEventListener('click', () => this.aplicarFiltrosLogs());
        }

        const btnLimpiarFiltrosLogs = document.getElementById('btnLimpiarFiltrosLogs');
        if (btnLimpiarFiltrosLogs) {
            btnLimpiarFiltrosLogs.addEventListener('click', () => this.limpiarFiltrosLogs());
        }
    }

    establecerFechasPorDefecto() {
        const fechaDesde = document.getElementById('fechaDesdeLogs');
        const fechaHasta = document.getElementById('fechaHastaLogs');
        
        if (fechaDesde && fechaHasta) {
            const hoy = new Date();
            const ayer = new Date(hoy);
            ayer.setDate(hoy.getDate() - 1);
            
            fechaDesde.value = ayer.toISOString().split('T')[0];
            fechaHasta.value = hoy.toISOString().split('T')[0];
        }
    }

    async cargarProfesionales() {
        try {
            const response = await profesionalesAPI.getAll();
            this.profesionales = response.data || [];
            
            const selectProfesional = document.getElementById('profesionalLogs');
            if (selectProfesional) {
                selectProfesional.innerHTML = '<option value="">Todos</option>';
                this.profesionales.forEach(prof => {
                    const option = document.createElement('option');
                    option.value = prof.id;
                    option.textContent = `${prof.nombre} ${prof.apellidos}`;
                    selectProfesional.appendChild(option);
                });
            }
        } catch (error) {
            mostrarNotificacion('Error cargando profesionales', 'error');
        }
    }

    async cargarHistorialActividad() {
        try {
            this.mostrarLoading();
            
            const fechaDesde = document.getElementById('fechaDesdeLogs')?.value;
            const fechaHasta = document.getElementById('fechaHastaLogs')?.value;
            
            const filtros = {
                fecha_desde: fechaDesde,
                fecha_hasta: fechaHasta,
                limit: 100
            };
            
            const response = await logsActividadAPI.getLogs(filtros);
            
            this.logsActividad = response || [];
            
            this.mostrarHistorialActividad(this.logsActividad);
            this.ocultarLoading();
        } catch (error) {
            this.ocultarLoading();
            const errorMessage = error?.message || error?.error || 'Error cargando historial de actividad';
            mostrarNotificacion(errorMessage, 'error');
        }
    }

    async aplicarFiltrosLogs() {
        try {
            this.mostrarLoading();
            
            const filtros = {};
            const fechaDesde = document.getElementById('fechaDesdeLogs')?.value;
            const fechaHasta = document.getElementById('fechaHastaLogs')?.value;
            const profesionalId = document.getElementById('profesionalLogs')?.value;
            
            if (fechaDesde) filtros.fecha_desde = fechaDesde;
            if (fechaHasta) filtros.fecha_hasta = fechaHasta;
            if (profesionalId) filtros.profesional_id = profesionalId;
            
            filtros.limit = 100;
            
            const response = await logsActividadAPI.getLogs(filtros);
            
            this.logsActividad = response || [];
            
            this.mostrarHistorialActividad(this.logsActividad);
            this.ocultarLoading();
            mostrarNotificacion('Filtros aplicados correctamente', 'success');
        } catch (error) {
            this.ocultarLoading();
            const errorMessage = error?.message || error?.error || 'Error aplicando filtros';
            mostrarNotificacion(errorMessage, 'error');
        }
    }

    limpiarFiltrosLogs() {
        this.establecerFechasPorDefecto();
        
        const selectProfesional = document.getElementById('profesionalLogs');
        if (selectProfesional) {
            selectProfesional.value = '';
        }
        
        this.cargarHistorialActividad();
        mostrarNotificacion('Filtros limpiados', 'info');
    }

    mostrarHistorialActividad(logs) {
        const container = document.getElementById('historialActividadContainer');
        if (!container) return;

        if (!logs || logs.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    No se encontraron registros de actividad para los filtros aplicados.
                </div>
            `;
            return;
        }

        const tabla = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Fecha</th>
                            <th>Profesional</th>
                            <th>Acción</th>
                            <th>Tabla</th>
                            <th>Registro ID</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(log => `
                            <tr>
                                <td>
                                    <small class="text-muted">${log.fecha_formateada || log.fecha}</small>
                                </td>
                                <td>
                                    <span class="badge bg-info">${log.profesional_nombre || 'N/A'}</span>
                                </td>
                                <td>
                                    <span class="badge bg-warning">${log.accion}</span>
                                </td>
                                <td>
                                    <span class="badge bg-secondary">${log.tabla_afectada || 'N/A'}</span>
                                </td>
                                <td>
                                    <code>${log.registro_id || 'N/A'}</code>
                                </td>
                                <td>
                                    <small class="text-muted">${log.ip_address || 'N/A'}</small>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <small class="text-muted">
                    <i class="fas fa-info-circle"></i>
                    Mostrando ${logs.length} registros de actividad (máximo 100)
                </small>
            </div>
        `;

        container.innerHTML = tabla;
    }

    mostrarLoading() {
        const container = document.getElementById('historialActividadContainer');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-2">Cargando historial de actividad...</p>
                </div>
            `;
        }
    }

    ocultarLoading() {
        // El loading se oculta automáticamente cuando se muestra la tabla
    }
}

// Exportar instancia global
export const reportesModule = new ReportesModule();

