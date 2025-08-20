/**
 * Módulo de gestión de ofertas
 * Maneja todas las operaciones relacionadas con ofertas y descuentos
 * Server-based architecture - Sin modo offline
 */

import { ofertasAPI, ofertasComboAPI } from '../api-client.js';
import { mostrarNotificacion } from '../utils.js';

export class OfertasModule {
    constructor() {
        this.ofertas = [];
        this.ofertasCombo = [];
        this.init();
    }
    
    async init() {
        await this.cargarOfertas();
        await this.cargarOfertasCombo();
        this.configurarEventosOfertas();
    }
    
    configurarEventosOfertas() {
        const form = document.getElementById('ofertaForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.guardarOferta();
            });
        }
        
        const formCombo = document.getElementById('ofertaComboForm');
        if (formCombo) {
            formCombo.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.guardarOfertaCombo();
            });
        }
    }
    
    async cargarOfertas() {
        try {
            this.ofertas = await ofertasAPI.getAll();
            this.actualizarTablaOfertas();
        } catch (error) {
            console.error('Error cargando ofertas:', error);
            mostrarNotificacion('Error cargando ofertas', 'error');
        }
    }
    
    async cargarOfertasCombo() {
        try {
            this.ofertasCombo = await ofertasComboAPI.getAll();
            this.actualizarTablaOfertasCombo();
        } catch (error) {
            console.error('Error cargando ofertas combo:', error);
            mostrarNotificacion('Error cargando ofertas combo', 'error');
        }
    }
    
    actualizarTablaOfertas() {
        const tbody = document.getElementById('cuerpoTablaOfertas');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.ofertas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay ofertas registradas</td></tr>';
            return;
        }
        
        this.ofertas.forEach(oferta => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${oferta.nombre}</td>
                <td>${oferta.porcentaje_descuento}%</td>
                <td>${oferta.descripcion || 'Sin descripción'}</td>
                <td>${oferta.prioridad || 'N/A'}</td>
                <td><span class="status-badge status-${oferta.estado}">${this.formatearEstado(oferta.estado)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="ofertasModule.editarOferta(${oferta.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="ofertasModule.eliminarOferta(${oferta.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    actualizarTablaOfertasCombo() {
        const tbody = document.getElementById('cuerpoTablaOfertasCombo');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.ofertasCombo.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay ofertas combo registradas</td></tr>';
            return;
        }
        
        this.ofertasCombo.forEach(ofertaCombo => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ofertaCombo.nombre}</td>
                <td>${ofertaCombo.porcentaje_descuento}%</td>
                <td>${ofertaCombo.descripcion || 'Sin descripción'}</td>
                <td><span class="status-badge status-${ofertaCombo.estado}">${this.formatearEstado(ofertaCombo.estado)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="ofertasModule.editarOfertaCombo(${ofertaCombo.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="ofertasModule.eliminarOfertaCombo(${ofertaCombo.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async guardarOferta() {
        const form = document.getElementById('ofertaForm');
        const formData = new FormData(form);
        
        const ofertaData = {
            nombre: formData.get('nombreOferta'),
            porcentaje_descuento: parseFloat(formData.get('porcentajeOferta')),
            descripcion: formData.get('descripcionOferta') || '',
            prioridad: parseInt(formData.get('prioridadOferta')) || 1,
            estado: formData.get('estadoOferta') || 'activa'
        };
        
        const ofertaId = formData.get('ofertaId');
        
        try {
            let resultado;
            if (ofertaId) {
                // Actualizar oferta existente
                resultado = await ofertasAPI.update(parseInt(ofertaId), ofertaData);
            } else {
                // Crear nueva oferta
                resultado = await ofertasAPI.create(ofertaData);
            }
            
            if (resultado) {
                mostrarNotificacion(ofertaId ? 'Oferta actualizada correctamente' : 'Oferta creada correctamente', 'success');
                form.reset();
                document.getElementById('ofertaId').value = '';
                await this.cargarOfertas();
            } else {
                mostrarNotificacion('Error al guardar oferta', 'error');
            }
        } catch (error) {
            console.error('Error guardando oferta:', error);
            mostrarNotificacion('Error al guardar oferta: ' + error.message, 'error');
        }
    }
    
    async guardarOfertaCombo() {
        const form = document.getElementById('ofertaComboForm');
        const formData = new FormData(form);
        
        const ofertaComboData = {
            nombre: formData.get('nombreOfertaCombo'),
            porcentaje_descuento: parseFloat(formData.get('porcentajeOfertaCombo')),
            descripcion: formData.get('descripcionOfertaCombo') || '',
            estado: formData.get('estadoOfertaCombo') || 'activa'
        };
        
        const ofertaComboId = formData.get('ofertaComboId');
        
        try {
            let resultado;
            if (ofertaComboId) {
                // Actualizar oferta combo existente
                resultado = await ofertasComboAPI.update(parseInt(ofertaComboId), ofertaComboData);
            } else {
                // Crear nueva oferta combo
                resultado = await ofertasComboAPI.create(ofertaComboData);
            }
            
            if (resultado) {
                mostrarNotificacion(ofertaComboId ? 'Oferta combo actualizada correctamente' : 'Oferta combo creada correctamente', 'success');
                form.reset();
                document.getElementById('ofertaComboId').value = '';
                await this.cargarOfertasCombo();
            } else {
                mostrarNotificacion('Error al guardar oferta combo', 'error');
            }
        } catch (error) {
            console.error('Error guardando oferta combo:', error);
            mostrarNotificacion('Error al guardar oferta combo: ' + error.message, 'error');
        }
    }
    
    async editarOferta(ofertaId) {
        const oferta = this.ofertas.find(o => o.id === ofertaId);
        if (!oferta) return;
        
        const form = document.getElementById('ofertaForm');
        form.querySelector('[name="ofertaId"]').value = oferta.id;
        form.querySelector('[name="nombreOferta"]').value = oferta.nombre;
        form.querySelector('[name="porcentajeOferta"]').value = oferta.porcentaje_descuento;
        form.querySelector('[name="descripcionOferta"]').value = oferta.descripcion || '';
        form.querySelector('[name="prioridadOferta"]').value = oferta.prioridad || 1;
        form.querySelector('[name="estadoOferta"]').value = oferta.estado;
        
        // Cambiar texto del botón
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Oferta';
        }
    }
    
    async editarOfertaCombo(ofertaComboId) {
        const ofertaCombo = this.ofertasCombo.find(o => o.id === ofertaComboId);
        if (!ofertaCombo) return;
        
        const form = document.getElementById('ofertaComboForm');
        form.querySelector('[name="ofertaComboId"]').value = ofertaCombo.id;
        form.querySelector('[name="nombreOfertaCombo"]').value = ofertaCombo.nombre;
        form.querySelector('[name="porcentajeOfertaCombo"]').value = ofertaCombo.porcentaje_descuento;
        form.querySelector('[name="descripcionOfertaCombo"]').value = ofertaCombo.descripcion || '';
        form.querySelector('[name="estadoOfertaCombo"]').value = ofertaCombo.estado;
        
        // Cambiar texto del botón
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Oferta Combo';
        }
    }
    
    async eliminarOferta(ofertaId) {
        const oferta = this.ofertas.find(o => o.id === ofertaId);
        if (!oferta) return;
        
        if (confirm(`¿Estás seguro de que deseas eliminar la oferta "${oferta.nombre}"?`)) {
            try {
                const resultado = await ofertasAPI.delete(ofertaId);
                
                if (resultado) {
                    mostrarNotificacion('Oferta eliminada correctamente', 'success');
                    await this.cargarOfertas();
                } else {
                    mostrarNotificacion('Error al eliminar oferta', 'error');
                }
            } catch (error) {
                console.error('Error eliminando oferta:', error);
                mostrarNotificacion('Error al eliminar oferta: ' + error.message, 'error');
            }
        }
    }
    
    async eliminarOfertaCombo(ofertaComboId) {
        const ofertaCombo = this.ofertasCombo.find(o => o.id === ofertaComboId);
        if (!ofertaCombo) return;
        
        if (confirm(`¿Estás seguro de que deseas eliminar la oferta combo "${ofertaCombo.nombre}"?`)) {
            try {
                const resultado = await ofertasComboAPI.delete(ofertaComboId);
                
                if (resultado) {
                    mostrarNotificacion('Oferta combo eliminada correctamente', 'success');
                    await this.cargarOfertasCombo();
                } else {
                    mostrarNotificacion('Error al eliminar oferta combo', 'error');
                }
            } catch (error) {
                console.error('Error eliminando oferta combo:', error);
                mostrarNotificacion('Error al eliminar oferta combo: ' + error.message, 'error');
            }
        }
    }
    
    formatearEstado(estado) {
        const estados = {
            'activa': 'Activa',
            'inactiva': 'Inactiva',
            'expirada': 'Expirada'
        };
        return estados[estado] || estado;
    }
}

// Exportar instancia global
export const ofertasModule = new OfertasModule();


