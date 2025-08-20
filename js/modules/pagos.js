/**
 * Módulo de gestión de pagos
 * Maneja todas las operaciones relacionadas con pagos de ventas
 * Server-based architecture - Sin modo offline
 */

import { generarId, formatearPrecio, formatearFecha, fechaActualInput, mostrarNotificacion } from '../utils.js';
import { ventasAPI, fichasAPI, pagosAPI } from '../api-client.js';

export class PagosModule {
    constructor() {
        this.ventaSeleccionadaPago = null;
        this.init();
    }
    
    async init() {
        await this.cargarVentasPendientes();
        this.cargarMetodosPago();
        this.configurarEventosPagos();
        await this.renderHistorialPagos();
    }
    
    configurarEventosPagos() {
        const ventaSelect = document.getElementById('ventaPago');
        
        if (ventaSelect) {
            ventaSelect.addEventListener('change', () => this.seleccionarVentaPago());
        }
        
        // Configurar fecha por defecto
        const fechaInput = document.getElementById('fechaPago');
        if (fechaInput) {
            fechaInput.value = fechaActualInput();
        }
        
        // Configurar formulario de pago (AJAX)
        const pagoForm = document.getElementById('pagoForm');
        if (pagoForm) {
            pagoForm.addEventListener('submit', async (e) => {
                e.preventDefault(); // Prevenir envío tradicional
                
                const submitBtn = pagoForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                
                try {
                    // Mostrar loading
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
                    submitBtn.disabled = true;
                    
                    // Registrar pago
                    await this.registrarPago();
                    
                } catch (error) {
                    console.error('Error en formulario pago:', error);
                    mostrarNotificacion(`Error inesperado: ${error.message}`, 'error');
                } finally {
                    // Restaurar botón
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
    }
    
    async cargarVentasPendientes() {
        const select = document.getElementById('ventaPago');
        if (!select) return;
        
        try {
            const ventasPendientes = await ventasAPI.search('estado:pendiente');
            
            select.innerHTML = '<option value="">-- Seleccionar venta --</option>';
            
            for (const venta of ventasPendientes) {
                const paciente = await fichasAPI.getById(venta.ficha_id);
                const pendiente = venta.total_pagado - venta.precio_total;
                
                if (pendiente > 0) {
                    const option = document.createElement('option');
                    option.value = venta.id.toString();
                    option.textContent = `${paciente?.nombres || 'Cliente'} - ${venta.tratamiento?.nombre || 'Tratamiento'} (${formatearPrecio(pendiente)} pendiente)`;
                    select.appendChild(option);
                }
            }
            
            if (ventasPendientes.length === 0) {
                const option = document.createElement('option');
                option.textContent = 'No hay ventas pendientes de pago';
                option.disabled = true;
                select.appendChild(option);
            }
        } catch (error) {
            console.error('Error cargando ventas pendientes:', error);
            mostrarNotificacion('Error cargando ventas pendientes', 'error');
        }
    }
    
    cargarMetodosPago() {
        const select = document.getElementById('metodoPago');
        if (!select || select.children.length > 0) return;
        
        const METODOS_PAGO = [
            { value: 'efectivo', label: 'Efectivo' },
            { value: 'tarjeta_debito', label: 'Tarjeta Débito' },
            { value: 'tarjeta_credito', label: 'Tarjeta Crédito' },
            { value: 'transferencia', label: 'Transferencia' },
            { value: 'cheque', label: 'Cheque' },
            { value: 'otro', label: 'Otro' }
        ];
        
        METODOS_PAGO.forEach(metodo => {
            const option = document.createElement('option');
            option.value = metodo.value;
            option.textContent = metodo.label;
            select.appendChild(option);
        });
    }
    
    async seleccionarVentaPago() {
        const ventaSelect = document.getElementById('ventaPago');
        const ventaId = parseInt(ventaSelect.value);
        
        if (!ventaId) {
            this.ventaSeleccionadaPago = null;
            this.limpiarFormularioPago();
            return;
        }
        
        try {
            const venta = await ventasAPI.getById(ventaId);
            const paciente = await fichasAPI.getById(venta.ficha_id);
            
            this.ventaSeleccionadaPago = venta;
            
            // Mostrar detalles de la venta
            this.mostrarDetallesVenta(venta, paciente);
            
            // Configurar monto máximo
            const montoInput = document.getElementById('montoPago');
            if (montoInput) {
                const pendiente = venta.precio_total - venta.total_pagado;
                montoInput.max = pendiente;
                montoInput.placeholder = `Máximo: ${formatearPrecio(pendiente)}`;
            }
        } catch (error) {
            console.error('Error cargando venta:', error);
            mostrarNotificacion('Error cargando venta', 'error');
        }
    }
    
    mostrarDetallesVenta(venta, paciente) {
        const detallesContainer = document.getElementById('detallesVentaPago');
        if (!detallesContainer) return;
        
        const pendiente = venta.precio_total - venta.total_pagado;
        
        detallesContainer.innerHTML = `
            <div class="venta-detalles">
                <h4>Detalles de la Venta</h4>
                <p><strong>Cliente:</strong> ${paciente?.nombres || 'N/A'}</p>
                <p><strong>Tratamiento:</strong> ${venta.tratamiento?.nombre || 'N/A'}</p>
                <p><strong>Total:</strong> ${formatearPrecio(venta.precio_total)}</p>
                <p><strong>Pagado:</strong> ${formatearPrecio(venta.total_pagado)}</p>
                <p><strong>Pendiente:</strong> ${formatearPrecio(pendiente)}</p>
            </div>
        `;
        
        detallesContainer.style.display = 'block';
    }
    
    limpiarFormularioPago() {
        const campos = ['montoPago', 'metodoPago', 'observacionesPago'];
        campos.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) elemento.value = '';
        });
        
        const detallesContainer = document.getElementById('detallesVentaPago');
        if (detallesContainer) {
            detallesContainer.style.display = 'none';
        }
    }
    
    async registrarPago() {
        if (!this.ventaSeleccionadaPago) {
            mostrarNotificacion('Debe seleccionar una venta', 'error');
            return false;
        }
        
        const monto = parseFloat(document.getElementById('montoPago').value);
        const metodo = document.getElementById('metodoPago').value;
        const observaciones = document.getElementById('observacionesPago').value;
        const fecha = document.getElementById('fechaPago').value;
        
        if (!monto || monto <= 0) {
            mostrarNotificacion('El monto debe ser mayor a 0', 'error');
            return false;
        }
        
        if (!metodo) {
            mostrarNotificacion('Debe seleccionar un método de pago', 'error');
            return false;
        }
        
        const pendiente = this.ventaSeleccionadaPago.precio_total - this.ventaSeleccionadaPago.total_pagado;
        if (monto > pendiente) {
            mostrarNotificacion(`El monto no puede ser mayor a ${formatearPrecio(pendiente)}`, 'error');
            return false;
        }
        
        const pago = {
            venta_id: this.ventaSeleccionadaPago.id,
            monto: monto,
            metodo_pago: metodo,
            fecha_pago: fecha,
            observaciones: observaciones
        };
        
        try {
            const pagoGuardado = await pagosAPI.create(pago);
            
            if (pagoGuardado) {
                mostrarNotificacion('Pago registrado correctamente', 'success');
                
                // Actualizar venta
                await this.actualizarVentaDespuesPago(monto);
                
                // Limpiar formulario
                this.limpiarFormularioPago();
                this.ventaSeleccionadaPago = null;
                
                // Recargar datos
                await this.cargarVentasPendientes();
                await this.renderHistorialPagos();
                
                return true;
            } else {
                mostrarNotificacion('Error al registrar pago', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error registrando pago:', error);
            mostrarNotificacion(`Error al registrar pago: ${error.message}`, 'error');
            return false;
        }
    }
    
    async actualizarVentaDespuesPago(montoPago) {
        const nuevaVenta = {
            ...this.ventaSeleccionadaPago,
            total_pagado: this.ventaSeleccionadaPago.total_pagado + montoPago,
            estado: (this.ventaSeleccionadaPago.total_pagado + montoPago) >= this.ventaSeleccionadaPago.precio_total ? 'pagado' : 'pendiente'
        };
        
        await ventasAPI.update(this.ventaSeleccionadaPago.id, nuevaVenta);
    }
    
    async renderHistorialPagos() {
        const container = document.getElementById('historialPagos');
        if (!container) return;
        
        try {
            const pagos = await pagosAPI.getAll();
            
            if (pagos.length === 0) {
                container.innerHTML = '<p class="text-center">No hay pagos registrados</p>';
                return;
            }
            
            let html = `
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Tratamiento</th>
                                <th>Monto</th>
                                <th>Método</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            for (const pago of pagos) {
                const venta = await ventasAPI.getById(pago.venta_id);
                const paciente = venta ? await fichasAPI.getById(venta.ficha_id) : null;
                
                html += `
                    <tr>
                        <td>${formatearFecha(pago.fecha_pago)}</td>
                        <td>${paciente?.nombres || 'N/A'}</td>
                        <td>${venta?.tratamiento?.nombre || 'N/A'}</td>
                        <td>${formatearPrecio(pago.monto)}</td>
                        <td>${this.formatearMetodoPago(pago.metodo_pago)}</td>
                        <td>${pago.observaciones || '-'}</td>
                    </tr>
                `;
            }
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Error cargando historial de pagos:', error);
            container.innerHTML = '<p class="text-center text-danger">Error cargando historial de pagos</p>';
        }
    }
    
    formatearMetodoPago(metodo) {
        const metodos = {
            'efectivo': 'Efectivo',
            'tarjeta_debito': 'Tarjeta Débito',
            'tarjeta_credito': 'Tarjeta Crédito',
            'transferencia': 'Transferencia',
            'cheque': 'Cheque',
            'otro': 'Otro'
        };
        
        return metodos[metodo] || metodo;
    }
    
    async loadPagos() {
        await this.renderHistorialPagos();
    }
    
    async loadPacientes() {
        // Este método se mantiene para compatibilidad con main.js
        // Los pacientes se cargan dinámicamente cuando se necesitan
    }
}

// Exportar instancia global
export const pagosModule = new PagosModule();
