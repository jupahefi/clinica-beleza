/**
 * Módulo de gestión de boxes
 * Maneja todas las operaciones relacionadas con boxes de la clínica
 * Server-based architecture - Sin modo offline
 */

import { boxesAPI, sucursalesAPI, mostrarNotificacion } from '../api-client.js';

let boxes = [];

/**
 * Inicializa el módulo de boxes
 */
export async function inicializarBoxes() {
    await cargarBoxes();
    await cargarSucursales();
    configurarEventosBoxes();
}

/**
 * Configura los eventos del formulario de boxes
 */
function configurarEventosBoxes() {
    const form = document.getElementById('boxForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarBox();
        });
    }
}

/**
 * Carga los boxes en la tabla
 */
async function cargarBoxes() {
    try {
        boxes = await boxesAPI.getAll();
        actualizarTablaBoxes();
    } catch (error) {
        console.error('Error cargando boxes:', error);
        mostrarNotificacion('Error cargando boxes', 'error');
    }
}

/**
 * Carga las sucursales en el select
 */
async function cargarSucursales() {
    try {
        const sucursales = await sucursalesAPI.getAll();
        const select = document.getElementById('sucursalBox');
        
        if (select) {
            select.innerHTML = '<option value="">-- Seleccionar sucursal --</option>';
            
            sucursales.forEach(sucursal => {
                if (sucursal.estado === 'activa') {
                    const option = document.createElement('option');
                    option.value = sucursal.id;
                    option.textContent = sucursal.nombre;
                    select.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error cargando sucursales:', error);
        mostrarNotificacion('Error cargando sucursales', 'error');
    }
}

/**
 * Actualiza la tabla de boxes
 */
function actualizarTablaBoxes() {
    const tbody = document.getElementById('cuerpoTablaBoxes');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (boxes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay boxes registrados</td></tr>';
        return;
    }
    
    boxes.forEach(box => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${box.nombre}</td>
            <td>${box.sucursal?.nombre || 'N/A'}</td>
            <td>${box.descripcion || 'Sin descripción'}</td>
            <td>${box.capacidad || 'N/A'}</td>
            <td><span class="status-badge status-${box.estado}">${formatearEstado(box.estado)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editarBox(${box.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarBox(${box.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Guarda un nuevo box o actualiza uno existente
 */
async function guardarBox() {
    const form = document.getElementById('boxForm');
    const formData = new FormData(form);
    
    const boxData = {
        nombre: formData.get('nombreBox'),
        sucursal_id: parseInt(formData.get('sucursalBox')),
        descripcion: formData.get('descripcionBox') || '',
        capacidad: parseInt(formData.get('capacidadBox')) || null,
        estado: formData.get('estadoBox') || 'activo'
    };
    
    const boxId = formData.get('boxId');
    
    try {
        let resultado;
        if (boxId) {
            // Actualizar box existente
            resultado = await boxesAPI.update(parseInt(boxId), boxData);
        } else {
            // Crear nuevo box
            resultado = await boxesAPI.create(boxData);
        }
        
        if (resultado) {
            mostrarNotificacion(boxId ? 'Box actualizado correctamente' : 'Box creado correctamente', 'success');
            form.reset();
            document.getElementById('boxId').value = '';
            await cargarBoxes();
        } else {
            mostrarNotificacion('Error al guardar box', 'error');
        }
    } catch (error) {
        console.error('Error guardando box:', error);
        mostrarNotificacion('Error al guardar box: ' + error.message, 'error');
    }
}

/**
 * Edita un box existente
 */
export async function editarBox(boxId) {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;
    
    const form = document.getElementById('boxForm');
    form.querySelector('[name="boxId"]').value = box.id;
    form.querySelector('[name="nombreBox"]').value = box.nombre;
    form.querySelector('[name="sucursalBox"]').value = box.sucursal_id || '';
    form.querySelector('[name="descripcionBox"]').value = box.descripcion || '';
    form.querySelector('[name="capacidadBox"]').value = box.capacidad || '';
    form.querySelector('[name="estadoBox"]').value = box.estado;
    
    // Cambiar texto del botón
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Actualizar Box';
    }
}

/**
 * Elimina un box (soft delete)
 */
export async function eliminarBox(boxId) {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;
    
    if (confirm(`¿Estás seguro de que deseas eliminar el box "${box.nombre}"?`)) {
        try {
            const resultado = await boxesAPI.delete(boxId);
            
            if (resultado) {
                mostrarNotificacion('Box eliminado correctamente', 'success');
                await cargarBoxes();
            } else {
                mostrarNotificacion('Error al eliminar box', 'error');
            }
        } catch (error) {
            console.error('Error eliminando box:', error);
            mostrarNotificacion('Error al eliminar box: ' + error.message, 'error');
        }
    }
}

/**
 * Formatea el estado del box
 */
function formatearEstado(estado) {
    const estados = {
        'activo': 'Activo',
        'inactivo': 'Inactivo',
        'mantenimiento': 'Mantenimiento'
    };
    return estados[estado] || estado;
}

// Funciones globales para compatibilidad
window.editarBox = editarBox;
window.eliminarBox = eliminarBox;
