/**
 * Módulo de gestión de reportes
 * Maneja todas las operaciones relacionadas con reportes y estadísticas
 * Server-based architecture - Sin modo offline
 */

import { reportesAPI, mostrarNotificacion } from '../api-client.js';

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
            mostrarNotificacion('Error cargando reportes disponibles', 'error');
        }
    }
    
    async generarReporteProgresoVentas() {
        try {
            this.mostrarLoading('Generando reporte de progreso de ventas...');
            
            const reporte = await reportesAPI.getProgresoVentas();
            
            if (reporte) {
                this.mostrarReporteProgresoVentas(reporte);
                mostrarNotificacion('Reporte de progreso de ventas generado correctamente', 'success');
            } else {
                mostrarNotificacion('Error al generar reporte de progreso de ventas', 'error');
            }
        } catch (error) {
            console.error('Error generando reporte de progreso de ventas:', error);
            mostrarNotificacion('Error al generar reporte: ' + error.message, 'error');
        } finally {
            this.ocultarLoading();
        }
    }
    
    async generarReportePlanVsEjecucion() {
        try {
            this.mostrarLoading('Generando reporte de plan vs ejecución...');
            
            const reporte = await reportesAPI.getPlanVsEjecucion();
            
            if (reporte) {
                this.mostrarReportePlanVsEjecucion(reporte);
                mostrarNotificacion('Reporte de plan vs ejecución generado correctamente', 'success');
            } else {
                mostrarNotificacion('Error al generar reporte de plan vs ejecución', 'error');
            }
        } catch (error) {
            console.error('Error generando reporte de plan vs ejecución:', error);
            mostrarNotificacion('Error al generar reporte: ' + error.message, 'error');
        } finally {
            this.ocultarLoading();
        }
    }
    
    async generarReporteDisponibilidadProfesionales() {
        try {
            this.mostrarLoading('Generando reporte de disponibilidad de profesionales...');
            
            const reporte = await reportesAPI.getDisponibilidadProfesionales();
            
            if (reporte) {
                this.mostrarReporteDisponibilidadProfesionales(reporte);
                mostrarNotificacion('Reporte de disponibilidad generado correctamente', 'success');
            } else {
                mostrarNotificacion('Error al generar reporte de disponibilidad', 'error');
            }
        } catch (error) {
            console.error('Error generando reporte de disponibilidad:', error);
            mostrarNotificacion('Error al generar reporte: ' + error.message, 'error');
        } finally {
            this.ocultarLoading();
        }
    }
    
    async generarReporteOfertasAplicadas() {
        try {
            this.mostrarLoading('Generando reporte de ofertas aplicadas...');
            
            const reporte = await reportesAPI.getOfertasAplicadas();
            
            if (reporte) {
                this.mostrarReporteOfertasAplicadas(reporte);
                mostrarNotificacion('Reporte de ofertas aplicadas generado correctamente', 'success');
            } else {
                mostrarNotificacion('Error al generar reporte de ofertas aplicadas', 'error');
            }
        } catch (error) {
            console.error('Error generando reporte de ofertas aplicadas:', error);
            mostrarNotificacion('Error al generar reporte: ' + error.message, 'error');
        } finally {
            this.ocultarLoading();
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
    
    async exportarReporte(tipoReporte, formato = 'csv') {
        try {
            this.mostrarLoading(`Exportando reporte ${tipoReporte}...`);
            
            const reporte = await reportesAPI.exportar(tipoReporte, formato);
            
            if (reporte) {
                this.descargarArchivo(reporte, `reporte_${tipoReporte}.${formato}`);
                mostrarNotificacion(`Reporte ${tipoReporte} exportado correctamente`, 'success');
            } else {
                mostrarNotificacion(`Error al exportar reporte ${tipoReporte}`, 'error');
            }
        } catch (error) {
            console.error(`Error exportando reporte ${tipoReporte}:`, error);
            mostrarNotificacion(`Error al exportar reporte: ${error.message}`, 'error');
        } finally {
            this.ocultarLoading();
        }
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
}

// Exportar instancia global
export const reportesModule = new ReportesModule();
