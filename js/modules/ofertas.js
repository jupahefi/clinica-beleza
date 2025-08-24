/**
 * Módulo de gestión de ofertas
 * Maneja todas las operaciones relacionadas con ofertas y descuentos
 * Server-based architecture - Sin modo offline
 */

import { ofertasAPI, tratamientosAPI, packsAPI } from '../api-client.js';
import { mostrarNotificacion } from '../utils.js';

export class OfertasModule {
    constructor() {
        this.ofertas = [];
        this.tratamientos = [];
        this.packs = [];
        // No inicializar automáticamente, se hará cuando se cargue la vista
    }
    
    async init() {
        console.log('[OFERTAS] Inicializando módulo de ofertas...');
        try {
            await this.cargarOfertas();
            await this.cargarTratamientos();
            await this.cargarPacks();
            this.configurarEventosOfertas();
            console.log('[OFERTAS] Módulo inicializado correctamente');
        } catch (error) {
            console.error('[OFERTAS] Error en inicialización:', error);
        }
    }
    
    configurarEventosOfertas() {
        const form = document.getElementById('ofertaForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.guardarOferta();
            });
        }
        
        // Configurar cambio de tipo de oferta
        const tipoOfertaSelect = document.getElementById('tipoOferta');
        if (tipoOfertaSelect) {
            tipoOfertaSelect.addEventListener('change', () => {
                this.mostrarCamposSegunTipo();
            });
        }
    }
    
    async cargarOfertas() {
        try {
            this.ofertas = await ofertasAPI.getAll();
            console.log('Ofertas cargadas correctamente:', this.ofertas);
            this.actualizarTablaOfertas();
        } catch (error) {
            console.error('Error cargando ofertas:', error);
            mostrarNotificacion(error.message || 'Error cargando ofertas', 'error');
        }
    }
    
    async cargarTratamientos() {
        try {
            console.log('[OFERTAS] Cargando tratamientos...');
            // Cargar tratamientos para el selector usando la API correcta
            this.tratamientos = await tratamientosAPI.getAll();
            console.log('[OFERTAS] Tratamientos cargados:', this.tratamientos);
            this.actualizarSelectorTratamientos();
        } catch (error) {
            console.error('[OFERTAS] Error cargando tratamientos:', error);
            this.tratamientos = [];
        }
    }
    
    async cargarPacks() {
        try {
            console.log('[OFERTAS] Cargando packs...');
            // Cargar packs para el selector usando la API correcta
            this.packs = await packsAPI.getAll();
            console.log('[OFERTAS] Packs cargados:', this.packs);
            this.actualizarSelectorPacks();
        } catch (error) {
            console.error('[OFERTAS] Error cargando packs:', error);
            this.packs = [];
        }
    }
    
    actualizarSelectorTratamientos() {
        const select = document.getElementById('tratamientoOferta');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Selecciona tratamiento --</option>';
        
        if (!this.tratamientos || !Array.isArray(this.tratamientos)) {
            console.warn('Tratamientos no es un array válido:', this.tratamientos);
            return;
        }
        
        this.tratamientos.forEach(tratamiento => {
            const option = document.createElement('option');
            option.value = tratamiento.id;
            option.textContent = tratamiento.nombre;
            select.appendChild(option);
        });
    }
    
    actualizarSelectorPacks() {
        const select = document.getElementById('packOferta');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Selecciona pack --</option>';
        
        if (!this.packs || !Array.isArray(this.packs)) {
            console.warn('Packs no es un array válido:', this.packs);
            return;
        }
        
        this.packs.forEach(pack => {
            const option = document.createElement('option');
            option.value = pack.id;
            option.textContent = `${pack.nombre} (${pack.sesiones_incluidas} sesiones)`;
            select.appendChild(option);
        });
    }
    
    mostrarCamposSegunTipo() {
        const tipoOferta = document.getElementById('tipoOferta').value;
        const tratamientoDiv = document.getElementById('tratamientoOfertaDiv');
        const packDiv = document.getElementById('packOfertaDiv');
        
        if (tratamientoDiv) tratamientoDiv.style.display = 'none';
        if (packDiv) packDiv.style.display = 'none';
        
        if (tipoOferta === 'tratamiento') {
            if (tratamientoDiv) tratamientoDiv.style.display = 'block';
        } else if (tipoOferta === 'pack') {
            if (tratamientoDiv) tratamientoDiv.style.display = 'block';
            if (packDiv) packDiv.style.display = 'block';
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
                <td data-label="Nombre">${oferta.nombre}</td>
                <td data-label="Tipo">${this.formatearTipo(oferta.tipo)}</td>
                <td data-label="Descuento">${oferta.porc_descuento}%</td>
                <td data-label="Sesiones Mínimas">${oferta.sesiones_minimas || 'N/A'}</td>
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
    
    async guardarOferta() {
        const form = document.getElementById('ofertaForm');
        const formData = new FormData(form);
        
        const tipoOferta = formData.get('tipoOferta');
        const tratamientoId = formData.get('tratamientoOferta');
        const packId = formData.get('packOferta');
        
        // Validar que se seleccione el elemento correspondiente según el tipo
        if (tipoOferta === 'tratamiento' && !tratamientoId) {
            mostrarNotificacion('Debe seleccionar un tratamiento', 'error');
            return;
        }
        
        if (tipoOferta === 'pack' && (!tratamientoId || !packId)) {
            mostrarNotificacion('Debe seleccionar tratamiento y pack', 'error');
            return;
        }
        
        const ofertaData = {
            nombre: formData.get('nombreOferta'),
            tipo: tipoOferta,
            porc_descuento: parseFloat(formData.get('porcentajeOferta')),
            sesiones_minimas: parseInt(formData.get('sesionesMinimas')),
            descripcion: formData.get('descripcionOferta') || '',
            fecha_inicio: formData.get('fechaInicioOferta'),
            fecha_fin: formData.get('fechaFinOferta'),
            combinable: formData.get('combinableOferta') === 'true',
            prioridad: parseInt(formData.get('prioridadOferta')) || 0,
            activo: true
        };
        
        // Agregar elemento_id según el tipo
        if (tipoOferta === 'tratamiento') {
            ofertaData.elemento_id = parseInt(tratamientoId);
        } else if (tipoOferta === 'pack') {
            ofertaData.elemento_id = parseInt(packId);
        }
        
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
                this.mostrarCamposSegunTipo();
                await this.cargarOfertas();
            } else {
                mostrarNotificacion('Error al guardar oferta', 'error');
            }
        } catch (error) {
            console.error('Error guardando oferta:', error);
            mostrarNotificacion(error.message || 'Error guardando oferta', 'error');
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
        form.querySelector('[name="sesionesMinimas"]').value = oferta.sesiones_minimas;
        form.querySelector('[name="descripcionOferta"]').value = oferta.descripcion || '';
        form.querySelector('[name="fechaInicioOferta"]').value = oferta.fecha_inicio || '';
        form.querySelector('[name="fechaFinOferta"]').value = oferta.fecha_fin || '';
        form.querySelector('[name="combinableOferta"]').value = oferta.combinable ? 'true' : 'false';
        form.querySelector('[name="prioridadOferta"]').value = oferta.prioridad || 0;
        
        // Establecer el elemento seleccionado según el tipo
        if (oferta.tipo === 'tratamiento') {
            form.querySelector('[name="tratamientoOferta"]').value = oferta.elemento_id || '';
        } else if (oferta.tipo === 'pack') {
            form.querySelector('[name="tratamientoOferta"]').value = oferta.elemento_id || '';
            form.querySelector('[name="packOferta"]').value = oferta.elemento_id || '';
        }
        
        // Mostrar campos según tipo
        this.mostrarCamposSegunTipo();
        
        // Cambiar texto del botón
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Oferta';
        }
        console.log(`Oferta cargada para edición (ID: ${ofertaId})`, oferta);
        mostrarNotificacion('Oferta cargada para edición', 'info');
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
    
    formatearTipo(tipo) {
        const tipos = {
            'pack': 'Pack',
            'tratamiento': 'Tratamiento'
        };
        return tipos[tipo] || tipo;
    }
    
    limpiarFormularioOferta() {
        const form = document.getElementById('ofertaForm');
        if (form) {
            form.reset();
            document.getElementById('ofertaId').value = '';
            this.mostrarCamposSegunTipo();
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

