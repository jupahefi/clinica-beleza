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
        await this.cargarPacientesSelect();
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
                    const errorMessage = error.message || 'Error desconocido en formulario pago';
                    mostrarNotificacion(`Error inesperado: ${errorMessage}`, 'error');
                } finally {
                    // Restaurar botón
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
    }
    

    
    cargarMetodosPago() {
        const select = document.getElementById('metodoPago');
        if (!select) return;
        
        // Limpiar opciones existentes excepto el placeholder
        select.innerHTML = '<option value="">Seleccionar método...</option>';
        
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
            const errorMessage = error.message || 'Error desconocido cargando venta';
            mostrarNotificacion(`Error cargando venta: ${errorMessage}`, 'error');
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
        
        // Limpiar select de venta
        const ventaSelect = document.getElementById('ventaPago');
        if (ventaSelect) {
            ventaSelect.innerHTML = '<option value="">-- Seleccionar venta --</option>';
        }
        
        const detallesContainer = document.getElementById('detallesVentaPago');
        if (detallesContainer) {
            detallesContainer.style.display = 'none';
        }
        
        // Resetear venta seleccionada
        this.ventaSeleccionadaPago = null;
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
                await this.renderHistorialPagos();
                
                return true;
            } else {
                mostrarNotificacion('Error al registrar pago', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error registrando pago:', error);
            const errorMessage = error.message || 'Error desconocido registrando pago';
            mostrarNotificacion(`Error al registrar pago: ${errorMessage}`, 'error');
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
    
    async cargarPacientesSelect() {
        try {
            const select = document.getElementById('pacientePago');
            if (!select) return;
            
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
                    }
                });
                
                // Configurar evento para cargar ventas cuando se selecciona un paciente
                $(select).on('select2:select', (e) => {
                    this.cargarVentasPorPaciente(e.params.data.id);
                });
                
                $(select).on('select2:clear', () => {
                    this.cargarVentasPorPaciente(null);
                });
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
                select.addEventListener('change', (e) => {
                    this.cargarVentasPorPaciente(e.target.value);
                });
            }
            
            console.log('✅ Select de pacientes cargado en pagos');
        } catch (error) {
            console.error('❌ Error cargando pacientes en pagos:', error);
        }
    }
    
    async cargarVentasPorPaciente(pacienteId) {
        try {
            const select = document.getElementById('ventaPago');
            if (!select) return;
            
            if (!pacienteId) {
                select.innerHTML = '<option value="">-- Seleccionar venta --</option>';
                this.limpiarFormularioPago();
                return;
            }
            
            const ventasPendientes = await ventasAPI.search('estado:pendiente');
            
            select.innerHTML = '<option value="">-- Seleccionar venta --</option>';
            
            for (const venta of ventasPendientes) {
                if (venta.ficha_id == pacienteId) {
                    const pendiente = venta.precio_total - venta.total_pagado;
                    
                    if (pendiente > 0) {
                        const option = document.createElement('option');
                        option.value = venta.id.toString();
                        option.textContent = `${venta.tratamiento?.nombre || 'Tratamiento'} (${formatearPrecio(pendiente)} pendiente)`;
                        select.appendChild(option);
                    }
                }
            }
            
            if (select.children.length === 1) { // Solo el placeholder
                const option = document.createElement('option');
                option.textContent = 'No hay ventas pendientes de pago';
                option.disabled = true;
                select.appendChild(option);
            }
        } catch (error) {
            console.error('Error cargando ventas por paciente:', error);
            const errorMessage = error.message || 'Error desconocido cargando ventas por paciente';
            mostrarNotificacion(`Error cargando ventas por paciente: ${errorMessage}`, 'error');
        }
    }
}

// Exportar instancia global
export const pagosModule = new PagosModule();
