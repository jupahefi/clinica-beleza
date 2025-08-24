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
            console.log('Ofertas cargadas correctamente:', this.ofertas);
            mostrarNotificacion('Ofertas cargadas correctamente', 'info');
            this.actualizarTablaOfertas();
        } catch (error) {
            console.error('Error cargando ofertas:', error);
            // Mostrar el mensaje de error de la DB si existe, si no, mensaje genérico
            mostrarNotificacion(error.message || 'Error cargando ofertas', 'error');
        }
    }
    
    async cargarOfertasCombo() {
        try {
            this.ofertasCombo = await ofertasComboAPI.getAll();
            console.log('Ofertas combo cargadas correctamente:', this.ofertasCombo);
            mostrarNotificacion('Ofertas combo cargadas correctamente', 'info');
            this.actualizarTablaOfertasCombo();
        } catch (error) {
            console.error('Error cargando ofertas combo:', error);
            mostrarNotificacion(error.message || 'Error cargando ofertas combo', 'error');
        }
    }
    
    actualizarTablaOfertas() {
        const tbody = document.getElementById('cuerpoTablaOfertas');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.ofertas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay ofertas registradas</td></tr>';
            return;
        }
        
        this.ofertas.forEach(oferta => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Nombre">${oferta.nombre}</td>
                <td data-label="Tipo">${this.formatearTipo(oferta.tipo)}</td>
                <td data-label="Descuento">${oferta.porc_descuento}%</td>
                <td data-label="Sesiones Mínimas">${oferta.sesiones_minimas || 'N/A'}</td>
                <td data-label="Descripción">${oferta.descripcion || 'Sin descripción'}</td>
                <td data-label="Estado"><span class="status-badge status-${oferta.activo ? 'activa' : 'inactiva'}">${oferta.activo ? 'Activa' : 'Inactiva'}</span></td>
                <td data-label="Acciones">
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
                <td data-label="Nombre">${ofertaCombo.nombre}</td>
                <td data-label="Descuento">${ofertaCombo.porcentaje_descuento}%</td>
                <td data-label="Descripción">${ofertaCombo.descripcion || 'Sin descripción'}</td>
                <td data-label="Estado"><span class="status-badge status-${ofertaCombo.estado}">${this.formatearEstado(ofertaCombo.estado)}</span></td>
                <td data-label="Acciones">
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
            tipo: formData.get('tipoOferta') || 'pack',
            porc_descuento: parseFloat(formData.get('porcentajeOferta')),
            sesiones_minimas: parseInt(formData.get('sesionesMinimas')) || 1,
            descripcion: formData.get('descripcionOferta') || '',
            fecha_inicio: formData.get('fechaInicioOferta'),
            fecha_fin: formData.get('fechaFinOferta'),
            combinable: formData.get('combinableOferta') === 'true',
            prioridad: parseInt(formData.get('prioridadOferta')) || 0,
            activo: true
        };
        
        const ofertaId = formData.get('ofertaId');
        
        try {
            let resultado;
            if (ofertaId) {
                // Actualizar oferta existente
                resultado = await ofertasAPI.update(parseInt(ofertaId), ofertaData);
                console.log(`Oferta actualizada (ID: ${ofertaId}):`, ofertaData);
            } else {
                // Crear nueva oferta
                resultado = await ofertasAPI.create(ofertaData);
                console.log('Oferta creada:', ofertaData);
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
            mostrarNotificacion(error.message || 'Error guardando oferta', 'error');
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
                console.log(`Oferta combo actualizada (ID: ${ofertaComboId}):`, ofertaComboData);
            } else {
                // Crear nueva oferta combo
                resultado = await ofertasComboAPI.create(ofertaComboData);
                console.log('Oferta combo creada:', ofertaComboData);
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
            mostrarNotificacion(error.message || 'Error guardando oferta combo', 'error');
        }
    }
    
    async editarOferta(ofertaId) {
        const oferta = this.ofertas.find(o => o.id === ofertaId);
        if (!oferta) {
            console.error(`No se encontró la oferta con ID ${ofertaId} para editar`);
            mostrarNotificacion('No se encontró la oferta para editar', 'error');
            return;
        }
        
        const form = document.getElementById('ofertaForm');
        form.querySelector('[name="ofertaId"]').value = oferta.id;
        form.querySelector('[name="nombreOferta"]').value = oferta.nombre;
        form.querySelector('[name="tipoOferta"]').value = oferta.tipo || 'pack';
        form.querySelector('[name="porcentajeOferta"]').value = oferta.porc_descuento;
        form.querySelector('[name="sesionesMinimas"]').value = oferta.sesiones_minimas || 1;
        form.querySelector('[name="descripcionOferta"]').value = oferta.descripcion || '';
        form.querySelector('[name="fechaInicioOferta"]').value = oferta.fecha_inicio || '';
        form.querySelector('[name="fechaFinOferta"]').value = oferta.fecha_fin || '';
        form.querySelector('[name="combinableOferta"]').value = oferta.combinable ? 'true' : 'false';
        form.querySelector('[name="prioridadOferta"]').value = oferta.prioridad || 0;
        
        // Cambiar texto del botón
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Oferta';
        }
        console.log(`Oferta cargada para edición (ID: ${ofertaId})`, oferta);
        mostrarNotificacion('Oferta cargada para edición', 'info');
    }
    
    async editarOfertaCombo(ofertaComboId) {
        const ofertaCombo = this.ofertasCombo.find(o => o.id === ofertaComboId);
        if (!ofertaCombo) {
            console.error(`No se encontró la oferta combo con ID ${ofertaComboId} para editar`);
            mostrarNotificacion('No se encontró la oferta combo para editar', 'error');
            return;
        }
        
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
        console.log(`Oferta combo cargada para edición (ID: ${ofertaComboId})`, ofertaCombo);
        mostrarNotificacion('Oferta combo cargada para edición', 'info');
    }
    
    async eliminarOferta(ofertaId) {
        const oferta = this.ofertas.find(o => o.id === ofertaId);
        if (!oferta) {
            console.error(`No se encontró la oferta con ID ${ofertaId} para eliminar`);
            mostrarNotificacion('No se encontró la oferta para eliminar', 'error');
            return;
        }
        
        if (confirm(`¿Estás seguro de que deseas eliminar la oferta "${oferta.nombre}"?`)) {
            try {
                const resultado = await ofertasAPI.delete(ofertaId);
                
                if (resultado) {
                    console.log(`Oferta eliminada correctamente (ID: ${ofertaId})`);
                    mostrarNotificacion('Oferta eliminada correctamente', 'success');
                    await this.cargarOfertas();
                } else {
                    mostrarNotificacion('Error al eliminar oferta', 'error');
                }
            } catch (error) {
                console.error('Error eliminando oferta:', error);
                mostrarNotificacion(error.message || 'Error eliminando oferta', 'error');
            }
        }
    }
    
    async eliminarOfertaCombo(ofertaComboId) {
        const ofertaCombo = this.ofertasCombo.find(o => o.id === ofertaComboId);
        if (!ofertaCombo) {
            console.error(`No se encontró la oferta combo con ID ${ofertaComboId} para eliminar`);
            mostrarNotificacion('No se encontró la oferta combo para eliminar', 'error');
            return;
        }
        
        if (confirm(`¿Estás seguro de que deseas eliminar la oferta combo "${ofertaCombo.nombre}"?`)) {
            try {
                const resultado = await ofertasComboAPI.delete(ofertaComboId);
                
                if (resultado) {
                    console.log(`Oferta combo eliminada correctamente (ID: ${ofertaComboId})`);
                    mostrarNotificacion('Oferta combo eliminada correctamente', 'success');
                    await this.cargarOfertasCombo();
                } else {
                    mostrarNotificacion('Error al eliminar oferta combo', 'error');
                }
            } catch (error) {
                console.error('Error eliminando oferta combo:', error);
                mostrarNotificacion(error.message || 'Error eliminando oferta combo', 'error');
            }
        }
    }
    
    formatearTipo(tipo) {
        const tipos = {
            'pack': 'Pack',
            'tratamiento': 'Tratamiento',
            'sesiones': 'Sesiones',
            'combo': 'Combo',
            'manual': 'Manual'
        };
        return tipos[tipo] || tipo;
    }
    
    formatearEstado(estado) {
        const estados = {
            'activa': 'Activa',
            'inactiva': 'Inactiva',
            'expirada': 'Expirada'
        };
        return estados[estado] || estado;
    }
    
    limpiarFormularioOferta() {
        const form = document.getElementById('ofertaForm');
        if (form) {
            form.reset();
            document.getElementById('ofertaId').value = '';
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Crear Oferta';
            }
            console.log('[OFERTAS] Formulario limpiado');
            mostrarNotificacion('Formulario de oferta limpiado', 'info');
        }
    }
}

// Exportar instancia global
export const ofertasModule = new OfertasModule();

// Conectar funciones globales
window.ofertasModule = ofertasModule;
window.limpiarFormularioOferta = () => ofertasModule.limpiarFormularioOferta();

