/**
 * Módulo de gestión de reportes
 * Solo historial de actividad - simple y funcional
 */

import { logsActividadAPI } from '../api-client.js';
import { mostrarNotificacion } from '../utils.js';

export class ReportesModule {
    constructor() {
        this.logsActividad = [];
        this.init();
    }

    async init() {
        this.configurarEventos();
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

    async cargarHistorialActividad() {
        try {
            mostrarNotificacion('Cargando historial de actividad...', 'info');
            
            const logs = await logsActividadAPI.getLogs({ limit: 100 });
            this.logsActividad = logs.data || [];
            
            this.mostrarHistorialActividad(this.logsActividad);
            mostrarNotificacion('Historial de actividad cargado correctamente', 'success');
        } catch (error) {
            const errorMessage = error?.message || error?.error || 'Error cargando historial de actividad';
            mostrarNotificacion(errorMessage, 'error');
        }
    }

    async aplicarFiltrosLogs() {
        try {
            mostrarNotificacion('Aplicando filtros...', 'info');
            
            const filtros = {};
            const fechaDesde = document.getElementById('fechaDesdeLogs')?.value;
            const fechaHasta = document.getElementById('fechaHastaLogs')?.value;
            const profesionalId = document.getElementById('profesionalLogs')?.value;
            
            if (fechaDesde) filtros.fecha_desde = fechaDesde;
            if (fechaHasta) filtros.fecha_hasta = fechaHasta;
            if (profesionalId) filtros.profesional_id = profesionalId;
            
            filtros.limit = 100;
            
            const logs = await logsActividadAPI.getLogs(filtros);
            this.logsActividad = logs.data || [];
            
            this.mostrarHistorialActividad(this.logsActividad);
            mostrarNotificacion('Filtros aplicados correctamente', 'success');
        } catch (error) {
            const errorMessage = error?.message || error?.error || 'Error aplicando filtros';
            mostrarNotificacion(errorMessage, 'error');
        }
    }

    limpiarFiltrosLogs() {
        const inputs = ['fechaDesdeLogs', 'fechaHastaLogs', 'profesionalLogs'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        
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
                                    <small class="text-muted">${log.fecha_formateada}</small>
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
}

// Exportar instancia global
export const reportesModule = new ReportesModule();

