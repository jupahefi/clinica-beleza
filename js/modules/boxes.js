/**
 * Módulo de gestión de boxes
 * Maneja todas las operaciones relacionadas con boxes de la clínica
 * Server-based architecture - Sin modo offline
 */

import { boxesAPI, sucursalesAPI } from '../api-client.js';
import { mostrarNotificacion } from '../utils.js';

export class BoxesModule {
    constructor() {
        this.boxes = [];
        this.init();
    }
    
    async init() {
        await this.cargarBoxes();
        await this.cargarSucursales();
        this.configurarEventosBoxes();
    }
    
    configurarEventosBoxes() {
        const form = document.getElementById('boxForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.guardarBox();
            });
        }
    }
    
    async cargarBoxes() {
        try {
            this.boxes = await boxesAPI.getAll();
            this.actualizarTablaBoxes();
        } catch (error) {
            console.error('Error cargando boxes:', error);
            const errorMessage = error.message || 'Error desconocido cargando boxes';
            mostrarNotificacion(`Error cargando boxes: ${errorMessage}`, 'error');
        }
    }
    
    async cargarSucursales() {
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
            const errorMessage = error.message || 'Error desconocido cargando sucursales';
            mostrarNotificacion(`Error cargando sucursales: ${errorMessage}`, 'error');
        }
    }
    
    actualizarTablaBoxes() {
        const tbody = document.getElementById('cuerpoTablaBoxes');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.boxes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay boxes registrados</td></tr>';
            return;
        }
        
        this.boxes.forEach(box => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Nombre">${box.nombre}</td>
                <td data-label="Sucursal">${box.sucursal?.nombre || 'N/A'}</td>
                <td data-label="Descripción">${box.descripcion || 'Sin descripción'}</td>
                <td data-label="Capacidad">${box.capacidad || 'N/A'}</td>
                <td data-label="Estado"><span class="status-badge status-${box.estado}">${this.formatearEstado(box.estado)}</span></td>
                <td data-label="Acciones">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="boxesModule.editarBox(${box.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="boxesModule.eliminarBox(${box.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async guardarBox() {
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
                await this.cargarBoxes();
            } else {
                mostrarNotificacion('Error al guardar box', 'error');
            }
        } catch (error) {
            console.error('Error guardando box:', error);
            const errorMessage = error.message || 'Error desconocido guardando box';
            mostrarNotificacion(`Error al guardar box: ${errorMessage}`, 'error');
        }
    }
    
    async editarBox(boxId) {
        const box = this.boxes.find(b => b.id === boxId);
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
    
    async eliminarBox(boxId) {
        const box = this.boxes.find(b => b.id === boxId);
        if (!box) return;
        
        if (confirm(`¿Estás seguro de que deseas eliminar el box "${box.nombre}"?`)) {
            try {
                const resultado = await boxesAPI.delete(boxId);
                
                if (resultado) {
                    mostrarNotificacion('Box eliminado correctamente', 'success');
                    await this.cargarBoxes();
                } else {
                    mostrarNotificacion('Error al eliminar box', 'error');
                }
            } catch (error) {
                console.error('Error eliminando box:', error);
                const errorMessage = error.message || 'Error desconocido eliminando box';
                mostrarNotificacion(`Error al eliminar box: ${errorMessage}`, 'error');
            }
        }
    }
    
    formatearEstado(estado) {
        const estados = {
            'activo': 'Activo',
            'inactivo': 'Inactivo',
            'mantenimiento': 'Mantenimiento'
        };
        return estados[estado] || estado;
    }
}

// Exportar instancia global
export const boxesModule = new BoxesModule();
