/**
 * Módulo de gestión de reportes
 * Maneja todas las operaciones relacionadas con reportes y estadísticas
 * Server-based architecture - Sin modo offline
 */

import { reportesAPI } from '../api-client.js';
import { mostrarNotificacion } from '../utils.js';

export class ReportesModule {
    constructor() {
        this.reportes = [];
        this.init();
    }
    
    async init() {
        this.configurarEventosReportes();
        await this.cargarReportesDisponibles();
    }
    
    configurarEventosReportes() {
        // Configurar botones de generación de reportes
        const btnProgresoVentas = document.getElementById('btnProgresoVentas');
        if (btnProgresoVentas) {
            btnProgresoVentas.addEventListener('click', () => this.generarReporteProgresoVentas());
        }
        
        const btnPlanVsEjecucion = document.getElementById('btnPlanVsEjecucion');
        if (btnPlanVsEjecucion) {
            btnPlanVsEjecucion.addEventListener('click', () => this.generarReportePlanVsEjecucion());
        }
        
        const btnDisponibilidadProfesionales = document.getElementById('btnDisponibilidadProfesionales');
        if (btnDisponibilidadProfesionales) {
            btnDisponibilidadProfesionales.addEventListener('click', () => this.generarReporteDisponibilidadProfesionales());
        }
        
        const btnOfertasAplicadas = document.getElementById('btnOfertasAplicadas');
        if (btnOfertasAplicadas) {
            btnOfertasAplicadas.addEventListener('click', () => this.generarReporteOfertasAplicadas());
        }
    }
    
    async cargarReportesDisponibles() {
        try {
            // Aquí se podrían cargar reportes predefinidos o configuraciones
            console.log('Reportes disponibles cargados');
        } catch (error) {
            console.error('Error cargando reportes disponibles:', error);
            const errorMessage = error.message || 'Error desconocido cargando reportes disponibles';
            mostrarNotificacion(`Error cargando reportes disponibles: ${errorMessage}`, 'error');
        }
    }
    
    async generarReporteProgresoVentas() {
        try {
            const reporte = await reportesAPI.progresoVentas();
            this.mostrarReporteProgresoVentas(reporte);
        } catch (error) {
            console.error('Error generando reporte de progreso de ventas:', error);
            const errorMessage = error.message || 'Error desconocido generando reporte de progreso de ventas';
            this.mostrarError(`Error generando reporte de progreso de ventas: ${errorMessage}`);
        }
    }
    
    async generarReportePlanVsEjecucion() {
        try {
            const reporte = await reportesAPI.planVsEjecucion();
            this.mostrarReportePlanVsEjecucion(reporte);
        } catch (error) {
            console.error('Error generando reporte plan vs ejecución:', error);
            const errorMessage = error.message || 'Error desconocido generando reporte plan vs ejecución';
            this.mostrarError(`Error generando reporte plan vs ejecución: ${errorMessage}`);
        }
    }
    
    async generarReporteDisponibilidadProfesionales() {
        try {
            const reporte = await reportesAPI.disponibilidad();
            this.mostrarReporteDisponibilidadProfesionales(reporte);
        } catch (error) {
            console.error('Error generando reporte de disponibilidad:', error);
            const errorMessage = error.message || 'Error desconocido generando reporte de disponibilidad';
            this.mostrarError(`Error generando reporte de disponibilidad: ${errorMessage}`);
        }
    }
    
    async generarReporteOfertasAplicadas() {
        try {
            const reporte = await reportesAPI.ofertasAplicadas();
            this.mostrarReporteOfertasAplicadas(reporte);
        } catch (error) {
            console.error('Error generando reporte de ofertas aplicadas:', error);
            const errorMessage = error.message || 'Error desconocido generando reporte de ofertas aplicadas';
            this.mostrarError(`Error generando reporte de ofertas aplicadas: ${errorMessage}`);
        }
    }
    
    mostrarReporteProgresoVentas(reporte) {
        const container = document.getElementById('reporteProgresoVentas');
        if (!container) return;
        
        let html = `
            <div class="reporte-container">
                <h3>📊 Reporte de Progreso de Ventas</h3>
                <div class="reporte-stats">
                    <div class="stat-card">
                        <h4>Ventas Totales</h4>
                        <p class="stat-value">${reporte.ventasTotales || 0}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Monto Total</h4>
                        <p class="stat-value">$${this.formatearNumero(reporte.montoTotal || 0)}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Promedio por Venta</h4>
                        <p class="stat-value">$${this.formatearNumero(reporte.promedioPorVenta || 0)}</p>
                    </div>
                </div>
                <div class="reporte-chart">
                    <canvas id="chartProgresoVentas"></canvas>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
        
        // Aquí se podría agregar la lógica para crear gráficos con Chart.js
        this.crearGraficoProgresoVentas(reporte);
    }
    
    mostrarReportePlanVsEjecucion(reporte) {
        const container = document.getElementById('reportePlanVsEjecucion');
        if (!container) return;
        
        let html = `
            <div class="reporte-container">
                <h3>📈 Reporte Plan vs Ejecución</h3>
                <div class="reporte-table">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Métrica</th>
                                <th>Planificado</th>
                                <th>Ejecutado</th>
                                <th>Diferencia</th>
                                <th>% Cumplimiento</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (reporte.metricas) {
            reporte.metricas.forEach(metrica => {
                const diferencia = metrica.ejecutado - metrica.planificado;
                const porcentaje = metrica.planificado > 0 ? ((metrica.ejecutado / metrica.planificado) * 100).toFixed(1) : 0;
                
                html += `
                    <tr>
                        <td>${metrica.nombre}</td>
                        <td>${this.formatearNumero(metrica.planificado)}</td>
                        <td>${this.formatearNumero(metrica.ejecutado)}</td>
                        <td class="${diferencia >= 0 ? 'text-success' : 'text-danger'}">${this.formatearNumero(diferencia)}</td>
                        <td>${porcentaje}%</td>
                    </tr>
                `;
            });
        }
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
    }
    
    mostrarReporteDisponibilidadProfesionales(reporte) {
        const container = document.getElementById('reporteDisponibilidadProfesionales');
        if (!container) return;
        
        let html = `
            <div class="reporte-container">
                <h3>👥 Reporte de Disponibilidad de Profesionales</h3>
                <div class="profesionales-grid">
        `;
        
        if (reporte.profesionales) {
            reporte.profesionales.forEach(profesional => {
                const disponibilidad = profesional.disponibilidad || 0;
                const colorClase = disponibilidad >= 80 ? 'success' : disponibilidad >= 60 ? 'warning' : 'danger';
                
                html += `
                    <div class="profesional-card">
                        <h4>${profesional.nombre}</h4>
                        <p><strong>Especialidad:</strong> ${profesional.especialidad}</p>
                        <p><strong>Disponibilidad:</strong> <span class="text-${colorClase}">${disponibilidad}%</span></p>
                        <p><strong>Sesiones Programadas:</strong> ${profesional.sesionesProgramadas || 0}</p>
                        <p><strong>Horas Disponibles:</strong> ${profesional.horasDisponibles || 0}</p>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
    }
    
    mostrarReporteOfertasAplicadas(reporte) {
        const container = document.getElementById('reporteOfertasAplicadas');
        if (!container) return;
        
        let html = `
            <div class="reporte-container">
                <h3>🎯 Reporte de Ofertas Aplicadas</h3>
                <div class="ofertas-stats">
                    <div class="stat-card">
                        <h4>Ofertas Aplicadas</h4>
                        <p class="stat-value">${reporte.totalOfertas || 0}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Descuento Total</h4>
                        <p class="stat-value">$${this.formatearNumero(reporte.descuentoTotal || 0)}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Promedio Descuento</h4>
                        <p class="stat-value">${reporte.promedioDescuento || 0}%</p>
                    </div>
                </div>
                <div class="ofertas-detalle">
                    <h4>Detalle por Oferta</h4>
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Oferta</th>
                                <th>Veces Aplicada</th>
                                <th>Descuento Total</th>
                                <th>Promedio Descuento</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (reporte.detalleOfertas) {
            reporte.detalleOfertas.forEach(oferta => {
                html += `
                    <tr>
                        <td>${oferta.nombre}</td>
                        <td>${oferta.vecesAplicada}</td>
                        <td>$${this.formatearNumero(oferta.descuentoTotal)}</td>
                        <td>${oferta.promedioDescuento}%</td>
                    </tr>
                `;
            });
        }
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
    }
    
    crearGraficoProgresoVentas(reporte) {
        // Aquí se implementaría la lógica para crear gráficos con Chart.js
        // Por ahora solo un placeholder
        const canvas = document.getElementById('chartProgresoVentas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6c757d';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Gráfico de Progreso de Ventas', canvas.width / 2, canvas.height / 2);
        }
    }
    
    formatearNumero(numero) {
        return new Intl.NumberFormat('es-CL').format(numero);
    }
    
    mostrarLoading(mensaje) {
        // Implementar loading spinner
        const loadingDiv = document.getElementById('loadingReportes');
        if (loadingDiv) {
            loadingDiv.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-2">${mensaje}</p>
                </div>
            `;
            loadingDiv.style.display = 'block';
        }
    }
    
    ocultarLoading() {
        const loadingDiv = document.getElementById('loadingReportes');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }
    
    mostrarError(mensaje) {
        console.error(mensaje);
        // Aquí se puede integrar con el sistema de notificaciones del frontend
                    mostrarNotificacion(mensaje, 'info');
    }
    
    async exportarReporte(tipoReporte, formato = 'csv') {
        try {
            const reporte = await reportesAPI.progresoVentas(); // Usar el método correcto según el tipo
            this.exportarDatos(reporte, tipoReporte, formato);
        } catch (error) {
            console.error('Error exportando reporte:', error);
            this.mostrarError('Error exportando reporte');
        }
    }
    
    exportarDatos(datos, tipoReporte, formato) {
        if (formato === 'csv') {
            this.exportarCSV(datos, `reporte_${tipoReporte}.csv`);
        } else if (formato === 'json') {
            this.exportarJSON(datos, `reporte_${tipoReporte}.json`);
        }
    }
    
    exportarCSV(datos, nombreArchivo) {
        // Implementar exportación a CSV
        console.log('Exportando CSV:', datos);
        mostrarNotificacion('Funcionalidad de exportación CSV en desarrollo', 'info');
    }
    
    exportarJSON(datos, nombreArchivo) {
        // Implementar exportación a JSON
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    descargarArchivo(contenido, nombreArchivo) {
        const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', nombreArchivo);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    filtrarHistorial(tipo) {
        console.log('Filtrando historial por:', tipo);
        // Por ahora solo un placeholder - se implementará cuando se desarrolle el módulo de historial
        mostrarNotificacion(`Filtro de historial: ${tipo} - Funcionalidad en desarrollo`, 'info');
    }
}

// Exportar instancia global
export const reportesModule = new ReportesModule();
