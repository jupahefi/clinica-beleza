/**
 * Módulo de gestión de reportes
 * Maneja todas las operaciones relacionadas con reportes y estadísticas
 * Server-based architecture - Sin modo offline
 */

import { reportesAPI, mostrarNotificacion } from '../api-client.js';

let reportes = [];

/**
 * Inicializa el módulo de reportes
 */
export async function inicializarReportes() {
    configurarEventosReportes();
    await cargarReportesDisponibles();
}

/**
 * Configura los eventos del módulo de reportes
 */
function configurarEventosReportes() {
    // Configurar botones de generación de reportes
    const btnProgresoVentas = document.getElementById('btnProgresoVentas');
    if (btnProgresoVentas) {
        btnProgresoVentas.addEventListener('click', () => generarReporteProgresoVentas());
    }
    
    const btnPlanVsEjecucion = document.getElementById('btnPlanVsEjecucion');
    if (btnPlanVsEjecucion) {
        btnPlanVsEjecucion.addEventListener('click', () => generarReportePlanVsEjecucion());
    }
    
    const btnDisponibilidadProfesionales = document.getElementById('btnDisponibilidadProfesionales');
    if (btnDisponibilidadProfesionales) {
        btnDisponibilidadProfesionales.addEventListener('click', () => generarReporteDisponibilidadProfesionales());
    }
    
    const btnOfertasAplicadas = document.getElementById('btnOfertasAplicadas');
    if (btnOfertasAplicadas) {
        btnOfertasAplicadas.addEventListener('click', () => generarReporteOfertasAplicadas());
    }
}

/**
 * Carga los reportes disponibles
 */
async function cargarReportesDisponibles() {
    try {
        // Aquí se podrían cargar reportes predefinidos o configuraciones
        console.log('Reportes disponibles cargados');
    } catch (error) {
        console.error('Error cargando reportes disponibles:', error);
        mostrarNotificacion('Error cargando reportes disponibles', 'error');
    }
}

/**
 * Genera el reporte de progreso de ventas (REP-001)
 */
export async function generarReporteProgresoVentas() {
    try {
        mostrarLoading('Generando reporte de progreso de ventas...');
        
        const reporte = await reportesAPI.getProgresoVentas();
        
        if (reporte) {
            mostrarReporteProgresoVentas(reporte);
            mostrarNotificacion('Reporte de progreso de ventas generado correctamente', 'success');
        } else {
            mostrarNotificacion('Error al generar reporte de progreso de ventas', 'error');
        }
    } catch (error) {
        console.error('Error generando reporte de progreso de ventas:', error);
        mostrarNotificacion('Error al generar reporte: ' + error.message, 'error');
    } finally {
        ocultarLoading();
    }
}

/**
 * Genera el reporte de plan vs ejecución (REP-002)
 */
export async function generarReportePlanVsEjecucion() {
    try {
        mostrarLoading('Generando reporte de plan vs ejecución...');
        
        const reporte = await reportesAPI.getPlanVsEjecucion();
        
        if (reporte) {
            mostrarReportePlanVsEjecucion(reporte);
            mostrarNotificacion('Reporte de plan vs ejecución generado correctamente', 'success');
        } else {
            mostrarNotificacion('Error al generar reporte de plan vs ejecución', 'error');
        }
    } catch (error) {
        console.error('Error generando reporte de plan vs ejecución:', error);
        mostrarNotificacion('Error al generar reporte: ' + error.message, 'error');
    } finally {
        ocultarLoading();
    }
}

/**
 * Genera el reporte de disponibilidad de profesionales (PRO-002)
 */
export async function generarReporteDisponibilidadProfesionales() {
    try {
        mostrarLoading('Generando reporte de disponibilidad de profesionales...');
        
        // Obtener parámetros del formulario
        const profesionalId = document.getElementById('profesionalReporte')?.value;
        const sucursalId = document.getElementById('sucursalReporte')?.value;
        const boxId = document.getElementById('boxReporte')?.value;
        const fecha = document.getElementById('fechaReporte')?.value;
        
        const reporte = await reportesAPI.getDisponibilidadProfesionales({
            profesional_id: profesionalId,
            sucursal_id: sucursalId,
            box_id: boxId,
            fecha: fecha
        });
        
        if (reporte) {
            mostrarReporteDisponibilidadProfesionales(reporte);
            mostrarNotificacion('Reporte de disponibilidad generado correctamente', 'success');
        } else {
            mostrarNotificacion('Error al generar reporte de disponibilidad', 'error');
        }
    } catch (error) {
        console.error('Error generando reporte de disponibilidad:', error);
        mostrarNotificacion('Error al generar reporte: ' + error.message, 'error');
    } finally {
        ocultarLoading();
    }
}

/**
 * Genera el reporte de ofertas aplicadas (OFE-004)
 */
export async function generarReporteOfertasAplicadas() {
    try {
        mostrarLoading('Generando reporte de ofertas aplicadas...');
        
        const ventaId = document.getElementById('ventaReporte')?.value;
        
        if (!ventaId) {
            mostrarNotificacion('Debe seleccionar una venta para el reporte', 'error');
            return;
        }
        
        const reporte = await reportesAPI.getOfertasAplicadas(ventaId);
        
        if (reporte) {
            mostrarReporteOfertasAplicadas(reporte);
            mostrarNotificacion('Reporte de ofertas aplicadas generado correctamente', 'success');
        } else {
            mostrarNotificacion('Error al generar reporte de ofertas aplicadas', 'error');
        }
    } catch (error) {
        console.error('Error generando reporte de ofertas aplicadas:', error);
        mostrarNotificacion('Error al generar reporte: ' + error.message, 'error');
    } finally {
        ocultarLoading();
    }
}

/**
 * Muestra el reporte de progreso de ventas
 */
function mostrarReporteProgresoVentas(reporte) {
    const container = document.getElementById('reporteProgresoVentas');
    if (!container) return;
    
    let html = `
        <div class="reporte-container">
            <h3>Reporte de Progreso de Ventas</h3>
            <div class="reporte-stats">
                <div class="stat-card">
                    <h4>Total Ventas</h4>
                    <p class="stat-value">${reporte.total_ventas || 0}</p>
                </div>
                <div class="stat-card">
                    <h4>Ventas Completadas</h4>
                    <p class="stat-value">${reporte.ventas_completadas || 0}</p>
                </div>
                <div class="stat-card">
                    <h4>Progreso General</h4>
                    <p class="stat-value">${((reporte.ventas_completadas / reporte.total_ventas) * 100).toFixed(1)}%</p>
                </div>
            </div>
            <div class="reporte-detalle">
                <h4>Detalle por Tratamiento</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Tratamiento</th>
                            <th>Total Sesiones</th>
                            <th>Sesiones Completadas</th>
                            <th>Progreso</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    if (reporte.detalle_tratamientos) {
        reporte.detalle_tratamientos.forEach(tratamiento => {
            const progreso = ((tratamiento.sesiones_completadas / tratamiento.total_sesiones) * 100).toFixed(1);
            html += `
                <tr>
                    <td>${tratamiento.nombre}</td>
                    <td>${tratamiento.total_sesiones}</td>
                    <td>${tratamiento.sesiones_completadas}</td>
                    <td>${progreso}%</td>
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

/**
 * Muestra el reporte de plan vs ejecución
 */
function mostrarReportePlanVsEjecucion(reporte) {
    const container = document.getElementById('reportePlanVsEjecucion');
    if (!container) return;
    
    let html = `
        <div class="reporte-container">
            <h3>Reporte Plan vs Ejecución</h3>
            <div class="reporte-stats">
                <div class="stat-card">
                    <h4>Planificado</h4>
                    <p class="stat-value">${reporte.total_planificado || 0}</p>
                </div>
                <div class="stat-card">
                    <h4>Ejecutado</h4>
                    <p class="stat-value">${reporte.total_ejecutado || 0}</p>
                </div>
                <div class="stat-card">
                    <h4>Eficiencia</h4>
                    <p class="stat-value">${((reporte.total_ejecutado / reporte.total_planificado) * 100).toFixed(1)}%</p>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    container.style.display = 'block';
}

/**
 * Muestra el reporte de disponibilidad de profesionales
 */
function mostrarReporteDisponibilidadProfesionales(reporte) {
    const container = document.getElementById('reporteDisponibilidadProfesionales');
    if (!container) return;
    
    let html = `
        <div class="reporte-container">
            <h3>Reporte de Disponibilidad de Profesionales</h3>
            <div class="reporte-detalle">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Profesional</th>
                            <th>Sucursal</th>
                            <th>Box</th>
                            <th>Fecha</th>
                            <th>Horarios Disponibles</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    if (reporte.disponibilidad) {
        reporte.disponibilidad.forEach(disp => {
            html += `
                <tr>
                    <td>${disp.profesional_nombre}</td>
                    <td>${disp.sucursal_nombre}</td>
                    <td>${disp.box_nombre}</td>
                    <td>${formatearFecha(disp.fecha)}</td>
                    <td>${disp.horarios_disponibles}</td>
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

/**
 * Muestra el reporte de ofertas aplicadas
 */
function mostrarReporteOfertasAplicadas(reporte) {
    const container = document.getElementById('reporteOfertasAplicadas');
    if (!container) return;
    
    let html = `
        <div class="reporte-container">
            <h3>Reporte de Ofertas Aplicadas</h3>
            <div class="reporte-info">
                <p><strong>Venta:</strong> ${reporte.venta_info || 'N/A'}</p>
                <p><strong>Cliente:</strong> ${reporte.cliente_info || 'N/A'}</p>
                <p><strong>Total Descuento:</strong> ${formatearPrecio(reporte.total_descuento || 0)}</p>
            </div>
            <div class="reporte-detalle">
                <h4>Ofertas Aplicadas</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Secuencia</th>
                            <th>Oferta</th>
                            <th>Porcentaje</th>
                            <th>Monto Descuento</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    if (reporte.ofertas_aplicadas) {
        reporte.ofertas_aplicadas.forEach(oferta => {
            html += `
                <tr>
                    <td>${oferta.secuencia}</td>
                    <td>${oferta.oferta_nombre}</td>
                    <td>${oferta.porc_descuento}%</td>
                    <td>${formatearPrecio(oferta.monto_descuento)}</td>
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

/**
 * Formatea una fecha
 */
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-ES');
}

/**
 * Formatea un precio
 */
function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP'
    }).format(precio);
}

/**
 * Muestra un indicador de carga
 */
function mostrarLoading(mensaje) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.textContent = mensaje;
        loading.style.display = 'block';
    }
}

/**
 * Oculta el indicador de carga
 */
function ocultarLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Funciones globales para compatibilidad
window.generarReporteProgresoVentas = generarReporteProgresoVentas;
window.generarReportePlanVsEjecucion = generarReportePlanVsEjecucion;
window.generarReporteDisponibilidadProfesionales = generarReporteDisponibilidadProfesionales;
window.generarReporteOfertasAplicadas = generarReporteOfertasAplicadas;
