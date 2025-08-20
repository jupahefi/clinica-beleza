/**
 * Módulo de Gestión de Ventas
 * Maneja ventas con soporte para zonas del cuerpo
 */

import { TRATAMIENTOS, ZONAS_CUERPO, ZONAS_CUERPO_LABELS, PRECIO_POR_ZONA } from '../constants.js';
import { formatCurrency } from '../utils.js';
import { fichasEspecificas } from './fichas-especificas.js';

export class VentasModule {
    constructor() {
        this.ventas = [];
        this.pacientes = [];
        this.tratamientos = [];
        this.init();
    }
    
    init() {
        this.loadVentas();
        this.loadPacientes();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupVentaForm();
            this.setupTratamientoSelector();
            this.setupZonasSelector();
        });
    }
    
    setupVentaForm() {
        const form = document.getElementById('ventaForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.crearVenta();
            });
        }
    }
    
    setupTratamientoSelector() {
        const select = document.getElementById('servicioVenta');
        if (select) {
            this.populateTratamientosSelect(select);
            select.addEventListener('change', (e) => {
                this.onTratamientoChange(e.target.value);
            });
        }
    }
    
    setupZonasSelector() {
        const zonasContainer = document.getElementById('zonas-venta-container');
        if (zonasContainer) {
            this.createZonasSelector(zonasContainer);
        }
    }
    
    populateTratamientosSelect(select) {
        select.innerHTML = '<option value="">Seleccionar tratamiento...</option>';
        
        // Agregar tratamientos faciales
        const facialGroup = document.createElement('optgroup');
        facialGroup.label = 'FACIAL';
        Object.entries(TRATAMIENTOS.FACIAL).forEach(([key, tratamiento]) => {
            const option = document.createElement('option');
            option.value = `facial_${key}`;
            option.textContent = `${tratamiento.nombre} - ${formatCurrency(tratamiento.precio_promo || tratamiento.precio)}`;
            option.dataset.precio = tratamiento.precio_promo || tratamiento.precio;
            option.dataset.sesiones = tratamiento.sesiones;
            option.dataset.zonas = JSON.stringify(tratamiento.zonas || []);
            facialGroup.appendChild(option);
        });
        select.appendChild(facialGroup);
        
        // Agregar tratamientos capilares
        const capilarGroup = document.createElement('optgroup');
        capilarGroup.label = 'CAPILAR';
        Object.entries(TRATAMIENTOS.CAPILAR).forEach(([key, tratamiento]) => {
            const option = document.createElement('option');
            option.value = `capilar_${key}`;
            option.textContent = `${tratamiento.nombre} - ${formatCurrency(tratamiento.precio_promo || tratamiento.precio)}`;
            option.dataset.precio = tratamiento.precio_promo || tratamiento.precio;
            option.dataset.sesiones = tratamiento.sesiones;
            option.dataset.zonas = JSON.stringify(tratamiento.zonas || []);
            capilarGroup.appendChild(option);
        });
        select.appendChild(capilarGroup);
        
        // Agregar tratamientos de depilación
        const depilacionGroup = document.createElement('optgroup');
        depilacionGroup.label = 'DEPILACIÓN LÁSER';
        Object.entries(TRATAMIENTOS.DEPILACION).forEach(([key, tratamiento]) => {
            const option = document.createElement('option');
            option.value = `depilacion_${key}`;
            option.textContent = `${tratamiento.nombre} - ${formatCurrency(tratamiento.precio_promo || tratamiento.precio)}`;
            option.dataset.precio = tratamiento.precio_promo || tratamiento.precio;
            option.dataset.sesiones = tratamiento.sesiones;
            option.dataset.zonas = JSON.stringify(tratamiento.zonas || []);
            depilacionGroup.appendChild(option);
        });
        select.appendChild(depilacionGroup);
    }
    
    onTratamientoChange(tratamientoId) {
        const precioInput = document.getElementById('precioVenta');
        const sesionesInput = document.getElementById('sesionesVenta');
        const zonasContainer = document.getElementById('zonas-venta-container');
        
        if (!tratamientoId) {
            precioInput.value = '';
            sesionesInput.value = '';
            if (zonasContainer) zonasContainer.style.display = 'none';
            return;
        }
        
        const option = document.querySelector(`option[value="${tratamientoId}"]`);
        if (option) {
            precioInput.value = option.dataset.precio || '';
            sesionesInput.value = option.dataset.sesiones || '';
            
            // Mostrar selector de zonas si el tratamiento las requiere
            const zonas = JSON.parse(option.dataset.zonas || '[]');
            if (zonas.length > 0 && zonasContainer) {
                this.showZonasSelector(zonas);
            } else if (zonasContainer) {
                zonasContainer.style.display = 'none';
            }
        }
    }
    
    createZonasSelector(container) {
        container.innerHTML = `
            <div class="zonas-venta-section">
                <h4>🎯 Zonas del Tratamiento</h4>
                <div class="zonas-info">
                    <p><strong>Zonas incluidas en el pack:</strong></p>
                    <div id="zonas-pack" class="zonas-pack"></div>
                </div>
                
                <div class="zonas-customization">
                    <h5>Personalizar Zonas</h5>
                    <div class="zonas-grid" id="zonas-venta-grid"></div>
                    <div class="zonas-summary" id="zonas-venta-summary"></div>
                </div>
            </div>
        `;
        
        container.style.display = 'none';
    }
    
    showZonasSelector(zonasPack) {
        const container = document.getElementById('zonas-venta-container');
        if (!container) return;
        
        container.style.display = 'block';
        
        // Mostrar zonas del pack
        const zonasPackDiv = document.getElementById('zonas-pack');
        if (zonasPackDiv) {
            zonasPackDiv.innerHTML = zonasPack.map(zona => 
                `<span class="zona-tag">${ZONAS_CUERPO_LABELS[zona]}</span>`
            ).join('');
        }
        
        // Crear grid de zonas personalizables
        this.createZonasVentaGrid(zonasPack);
        
        // Aplicar estilos
        this.applyZonasStyles();
    }
    
    createZonasVentaGrid(zonasPack) {
        const grid = document.getElementById('zonas-venta-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        Object.entries(ZONAS_CUERPO_LABELS).forEach(([key, label]) => {
            const isIncluded = zonasPack.includes(key);
            const precio = PRECIO_POR_ZONA[key];
            
            const zonaDiv = document.createElement('div');
            zonaDiv.className = 'zona-venta-item';
            zonaDiv.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                border: 2px solid ${isIncluded ? '#28a745' : '#e9ecef'};
                border-radius: 8px;
                background: ${isIncluded ? '#d4edda' : 'white'};
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `venta_zona_${key}`;
            checkbox.checked = isIncluded;
            checkbox.dataset.zona = key;
            checkbox.dataset.precio = precio;
            checkbox.dataset.included = isIncluded;
            
            const labelElement = document.createElement('label');
            labelElement.htmlFor = `venta_zona_${key}`;
            labelElement.textContent = label;
            labelElement.style.cursor = 'pointer';
            labelElement.style.fontWeight = '500';
            
            const precioSpan = document.createElement('span');
            precioSpan.textContent = formatCurrency(precio);
            precioSpan.style.cssText = `
                margin-left: auto;
                font-size: 14px;
                color: ${isIncluded ? '#155724' : '#666'};
                font-weight: 600;
            `;
            
            const statusSpan = document.createElement('span');
            statusSpan.textContent = isIncluded ? '✓ Incluida' : '+ Agregar';
            statusSpan.style.cssText = `
                font-size: 12px;
                color: ${isIncluded ? '#155724' : '#666'};
                font-weight: 500;
            `;
            
            zonaDiv.appendChild(checkbox);
            zonaDiv.appendChild(labelElement);
            zonaDiv.appendChild(precioSpan);
            zonaDiv.appendChild(statusSpan);
            
            // Event listeners
            checkbox.addEventListener('change', () => this.updateZonasVenta());
            zonaDiv.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.updateZonasVenta();
                }
            });
            
            grid.appendChild(zonaDiv);
        });
        
        this.updateZonasVenta();
    }
    
    updateZonasVenta() {
        const checkboxes = document.querySelectorAll('input[data-zona]:checked');
        const zonasSeleccionadas = Array.from(checkboxes).map(cb => ({
            zona: cb.dataset.zona,
            label: ZONAS_CUERPO_LABELS[cb.dataset.zona],
            precio: parseInt(cb.dataset.precio),
            included: cb.dataset.included === 'true'
        }));
        
        const precioBase = parseFloat(document.getElementById('precioVenta').value) || 0;
        const zonasPack = this.getZonasFromSelectedTratamiento();
        
        // Calcular ajustes de precio
        const zonasExtra = zonasSeleccionadas.filter(z => !zonasPack.includes(z.zona));
        const zonasRemovidas = zonasPack.filter(z => !zonasSeleccionadas.some(zs => zs.zona === z));
        
        const precioExtra = zonasExtra.reduce((sum, z) => sum + z.precio, 0);
        const precioDescuento = zonasRemovidas.reduce((sum, z) => sum + (PRECIO_POR_ZONA[z] || 0), 0);
        
        const precioFinal = precioBase + precioExtra - precioDescuento;
        
        // Actualizar precio
        document.getElementById('precioVenta').value = precioFinal;
        
        // Mostrar resumen
        const summaryDiv = document.getElementById('zonas-venta-summary');
        if (summaryDiv) {
            let summary = `<strong>Resumen de Zonas:</strong><br>`;
            summary += `• Zonas seleccionadas: ${zonasSeleccionadas.length}<br>`;
            
            if (zonasExtra.length > 0) {
                summary += `• Zonas adicionales: ${zonasExtra.map(z => z.label).join(', ')} (+${formatCurrency(precioExtra)})<br>`;
            }
            
            if (zonasRemovidas.length > 0) {
                summary += `• Zonas removidas: ${zonasRemovidas.map(z => ZONAS_CUERPO_LABELS[z]).join(', ')} (-${formatCurrency(precioDescuento)})<br>`;
            }
            
            summary += `• Precio final: ${formatCurrency(precioFinal)}`;
            
            summaryDiv.innerHTML = summary;
        }
        
        // Actualizar estilos de los items
        this.updateZonasVentaStyles();
    }
    
    updateZonasVentaStyles() {
        const items = document.querySelectorAll('.zona-venta-item');
        items.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const isChecked = checkbox.checked;
            const isIncluded = checkbox.dataset.included === 'true';
            
            if (isChecked) {
                item.style.borderColor = '#28a745';
                item.style.background = '#d4edda';
                item.querySelector('span:last-child').style.color = '#155724';
                item.querySelector('span:last-child').textContent = isIncluded ? '✓ Incluida' : '✓ Agregada';
            } else {
                item.style.borderColor = '#e9ecef';
                item.style.background = 'white';
                item.querySelector('span:last-child').style.color = '#666';
                item.querySelector('span:last-child').textContent = isIncluded ? '✗ Removida' : '+ Agregar';
            }
        });
    }
    
    getZonasFromSelectedTratamiento() {
        const select = document.getElementById('servicioVenta');
        const option = select.selectedOptions[0];
        if (option && option.dataset.zonas) {
            return JSON.parse(option.dataset.zonas);
        }
        return [];
    }
    
    applyZonasStyles() {
        const styles = `
            .zonas-venta-section {
                margin-top: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            
            .zonas-pack {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 10px 0;
            }
            
            .zona-tag {
                background: #28a745;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .zonas-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 10px;
                margin: 15px 0;
            }
            
            .zonas-summary {
                background: white;
                padding: 10px;
                border-radius: 6px;
                border: 1px solid #e9ecef;
                font-size: 14px;
                line-height: 1.4;
            }
        `;
        
        if (!document.getElementById('zonas-venta-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'zonas-venta-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    }
    
    async crearVenta() {
        const formData = this.getVentaFormData();
        
        if (!formData.paciente || !formData.servicio || !formData.precio || !formData.fecha) {
            alert('Por favor complete todos los campos obligatorios');
            return;
        }
        
        // Obtener zonas seleccionadas
        const zonasSeleccionadas = this.getZonasSeleccionadas();
        
        // Verificar si necesita consentimiento (para depilación)
        if (this.requiresConsentimiento(formData.servicio)) {
            await this.showConsentimiento(formData, zonasSeleccionadas);
        } else {
            await this.saveVenta(formData, zonasSeleccionadas);
        }
    }
    
    getVentaFormData() {
        return {
            paciente_id: document.getElementById('pacienteVenta').value,
            servicio: document.getElementById('servicioVenta').value,
            precio: parseFloat(document.getElementById('precioVenta').value),
            fecha: document.getElementById('fechaVenta').value,
            observaciones: document.getElementById('observacionesVenta').value
        };
    }
    
    getZonasSeleccionadas() {
        const checkboxes = document.querySelectorAll('input[data-zona]:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.zona);
    }
    
    requiresConsentimiento(servicio) {
        return servicio.startsWith('depilacion_');
    }
    
    async showConsentimiento(formData, zonasSeleccionadas) {
        fichasEspecificas.showConsentimiento(
            async (signatureData) => {
                // Consentimiento aceptado
                await this.saveVenta(formData, zonasSeleccionadas, signatureData);
            },
            () => {
                // Consentimiento rechazado
                alert('La venta no se puede completar sin el consentimiento firmado.');
            }
        );
    }
    
    async saveVenta(formData, zonasSeleccionadas, consentimiento = null) {
        const ventaData = {
            ...formData,
            zonas: zonasSeleccionadas,
            consentimiento: consentimiento,
            fecha_creacion: new Date().toISOString()
        };
        
        try {
            const response = await fetch('./api.php/ventas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ventaData)
            });
            
            if (!response.ok) {
                throw new Error('Error creando venta');
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Venta creada exitosamente');
                this.limpiarFormularioVenta();
                this.loadVentas();
            } else {
                alert('❌ Error: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error creando venta: ' + error.message);
        }
    }
    
    async loadVentas() {
        try {
            const response = await fetch('./api.php/ventas');
            const result = await response.json();
            
            if (result.success) {
                this.ventas = result.data;
                this.renderVentas();
            }
        } catch (error) {
            console.error('Error cargando ventas:', error);
        }
    }
    
    async loadPacientes() {
        try {
            const response = await fetch('./api.php/pacientes');
            const result = await response.json();
            
            if (result.success) {
                this.pacientes = result.data;
                this.populatePacientesSelect();
            }
        } catch (error) {
            console.error('Error cargando pacientes:', error);
        }
    }
    
    populatePacientesSelect() {
        const select = document.getElementById('pacienteVenta');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar paciente...</option>';
        
        this.pacientes.forEach(paciente => {
            const option = document.createElement('option');
            option.value = paciente.id;
            option.textContent = `${paciente.nombres} ${paciente.apellidos}`;
            select.appendChild(option);
        });
    }
    
    renderVentas() {
        const tbody = document.getElementById('cuerpoTablaVentas');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.ventas.forEach(venta => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${venta.paciente_nombre || 'N/A'}</td>
                <td>${venta.servicio_nombre || 'N/A'}</td>
                <td>${formatCurrency(venta.precio)}</td>
                <td>${formatDate(venta.fecha)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="ventasModule.verDetalles(${venta.id})">👁️ Ver</button>
                        <button class="btn btn-sm btn-warning" onclick="ventasModule.editarVenta(${venta.id})">✏️ Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="ventasModule.eliminarVenta(${venta.id})">🗑️ Eliminar</button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    async verDetalles(ventaId) {
        try {
            const response = await fetch(`./api.php/ventas/${ventaId}`);
            const result = await response.json();
            
            if (result.success) {
                const venta = result.data;
                const detalles = `
                    <strong>Detalles de la Venta:</strong><br>
                    <strong>Paciente:</strong> ${venta.paciente_nombre}<br>
                    <strong>Servicio:</strong> ${venta.servicio_nombre}<br>
                    <strong>Precio:</strong> ${formatCurrency(venta.precio)}<br>
                    <strong>Fecha:</strong> ${formatDate(venta.fecha)}<br>
                    <strong>Zonas:</strong> ${venta.zonas ? venta.zonas.map(z => ZONAS_CUERPO_LABELS[z]).join(', ') : 'N/A'}<br>
                    <strong>Observaciones:</strong> ${venta.observaciones || 'Sin observaciones'}
                `;
                
                alert(detalles);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error obteniendo detalles de la venta');
        }
    }
    
    async editarVenta(ventaId) {
        // Implementar edición de venta
        alert('Funcionalidad de edición en desarrollo');
    }
    
    async eliminarVenta(ventaId) {
        if (!confirm('¿Está seguro de que desea eliminar esta venta?')) return;
        
        try {
            const response = await fetch(`./api.php/ventas/${ventaId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Error eliminando venta');
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Venta eliminada exitosamente');
                this.loadVentas();
            } else {
                alert('❌ Error: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error eliminando venta: ' + error.message);
        }
    }
    
    limpiarFormularioVenta() {
        const form = document.getElementById('ventaForm');
        if (form) {
            form.reset();
        }
        
        // Ocultar selector de zonas
        const zonasContainer = document.getElementById('zonas-venta-container');
        if (zonasContainer) {
            zonasContainer.style.display = 'none';
        }
    }
}

// Exportar instancia global
export const ventasModule = new VentasModule();

// Hacer disponible globalmente para los botones
window.ventasModule = ventasModule;
