/**
 * Módulo de gestión de ofertas
 * Maneja todas las operaciones relacionadas con ofertas y descuentos
 * Server-based architecture - Sin modo offline
 */

import { ofertasAPI, ofertasComboAPI, mostrarNotificacion } from '../api-client.js';

let ofertas = [];
let ofertasCombo = [];

/**
 * Inicializa el módulo de ofertas
 */
export async function inicializarOfertas() {
    await cargarOfertas();
    await cargarOfertasCombo();
    configurarEventosOfertas();
}

/**
 * Configura los eventos del formulario de ofertas
 */
function configurarEventosOfertas() {
    const form = document.getElementById('ofertaForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarOferta();
        });
    }
    
    const formCombo = document.getElementById('ofertaComboForm');
    if (formCombo) {
        formCombo.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarOfertaCombo();
        });
    }
}

/**
 * Carga las ofertas en la tabla
 */
async function cargarOfertas() {
    try {
        ofertas = await ofertasAPI.getAll();
        actualizarTablaOfertas();
    } catch (error) {
        console.error('Error cargando ofertas:', error);
        mostrarNotificacion('Error cargando ofertas', 'error');
    }
}

/**
 * Carga las ofertas combo en la tabla
 */
async function cargarOfertasCombo() {
    try {
        ofertasCombo = await ofertasComboAPI.getAll();
        actualizarTablaOfertasCombo();
    } catch (error) {
        console.error('Error cargando ofertas combo:', error);
        mostrarNotificacion('Error cargando ofertas combo', 'error');
    }
}

/**
 * Actualiza la tabla de ofertas
 */
function actualizarTablaOfertas() {
    const tbody = document.getElementById('cuerpoTablaOfertas');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (ofertas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay ofertas registradas</td></tr>';
        return;
    }
    
    ofertas.forEach(oferta => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${oferta.nombre}</td>
            <td>${oferta.porcentaje_descuento}%</td>
            <td>${oferta.descripcion || 'Sin descripción'}</td>
            <td>${oferta.prioridad || 'N/A'}</td>
            <td><span class="status-badge status-${oferta.estado}">${formatearEstado(oferta.estado)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editarOferta(${oferta.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarOferta(${oferta.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Actualiza la tabla de ofertas combo
 */
function actualizarTablaOfertasCombo() {
    const tbody = document.getElementById('cuerpoTablaOfertasCombo');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (ofertasCombo.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay ofertas combo registradas</td></tr>';
        return;
    }
    
    ofertasCombo.forEach(ofertaCombo => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ofertaCombo.nombre}</td>
            <td>${ofertaCombo.porcentaje_descuento}%</td>
            <td>${ofertaCombo.descripcion || 'Sin descripción'}</td>
            <td><span class="status-badge status-${ofertaCombo.estado}">${formatearEstado(ofertaCombo.estado)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editarOfertaCombo(${ofertaCombo.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarOfertaCombo(${ofertaCombo.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Guarda una nueva oferta o actualiza una existente
 */
async function guardarOferta() {
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
            await cargarOfertas();
        } else {
            mostrarNotificacion('Error al guardar oferta', 'error');
        }
    } catch (error) {
        console.error('Error guardando oferta:', error);
        mostrarNotificacion('Error al guardar oferta: ' + error.message, 'error');
    }
}

/**
 * Guarda una nueva oferta combo o actualiza una existente
 */
async function guardarOfertaCombo() {
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
            await cargarOfertasCombo();
        } else {
            mostrarNotificacion('Error al guardar oferta combo', 'error');
        }
    } catch (error) {
        console.error('Error guardando oferta combo:', error);
        mostrarNotificacion('Error al guardar oferta combo: ' + error.message, 'error');
    }
}

/**
 * Edita una oferta existente
 */
export async function editarOferta(ofertaId) {
    const oferta = ofertas.find(o => o.id === ofertaId);
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

/**
 * Edita una oferta combo existente
 */
export async function editarOfertaCombo(ofertaComboId) {
    const ofertaCombo = ofertasCombo.find(o => o.id === ofertaComboId);
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

/**
 * Elimina una oferta (soft delete)
 */
export async function eliminarOferta(ofertaId) {
    const oferta = ofertas.find(o => o.id === ofertaId);
    if (!oferta) return;
    
    if (confirm(`¿Estás seguro de que deseas eliminar la oferta "${oferta.nombre}"?`)) {
        try {
            const resultado = await ofertasAPI.delete(ofertaId);
            
            if (resultado) {
                mostrarNotificacion('Oferta eliminada correctamente', 'success');
                await cargarOfertas();
            } else {
                mostrarNotificacion('Error al eliminar oferta', 'error');
            }
        } catch (error) {
            console.error('Error eliminando oferta:', error);
            mostrarNotificacion('Error al eliminar oferta: ' + error.message, 'error');
        }
    }
}

/**
 * Elimina una oferta combo (soft delete)
 */
export async function eliminarOfertaCombo(ofertaComboId) {
    const ofertaCombo = ofertasCombo.find(o => o.id === ofertaComboId);
    if (!ofertaCombo) return;
    
    if (confirm(`¿Estás seguro de que deseas eliminar la oferta combo "${ofertaCombo.nombre}"?`)) {
        try {
            const resultado = await ofertasComboAPI.delete(ofertaComboId);
            
            if (resultado) {
                mostrarNotificacion('Oferta combo eliminada correctamente', 'success');
                await cargarOfertasCombo();
            } else {
                mostrarNotificacion('Error al eliminar oferta combo', 'error');
            }
        } catch (error) {
            console.error('Error eliminando oferta combo:', error);
            mostrarNotificacion('Error al eliminar oferta combo: ' + error.message, 'error');
        }
    }
}

/**
 * Formatea el estado de la oferta
 */
function formatearEstado(estado) {
    const estados = {
        'activa': 'Activa',
        'inactiva': 'Inactiva',
        'expirada': 'Expirada'
    };
    return estados[estado] || estado;
}

// Funciones globales para compatibilidad
window.editarOferta = editarOferta;
window.eliminarOferta = eliminarOferta;
window.editarOfertaCombo = editarOfertaCombo;
window.eliminarOfertaCombo = eliminarOfertaCombo;
