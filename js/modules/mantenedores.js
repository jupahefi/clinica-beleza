/**
 * Módulo de mantenedores del sistema
 * Maneja todas las operaciones CRUD para entidades del sistema
 * Server-based architecture - Sin modo offline
 */

import { 
    boxesAPI, 
    sucursalesAPI, 
    tratamientosAPI, 
    packsAPI, 
    profesionalesAPI 
} from '../api-client.js';
import { mostrarNotificacion, mostrarErrorInteligente } from '../utils.js';

export class MantenedoresModule {
    constructor() {
        this.boxes = [];
        this.sucursales = [];
        this.tratamientos = [];
        this.packs = [];
        this.profesionales = [];
        this.init();
    }
    
    async init() {
        await this.cargarDatosIniciales();
        this.configurarEventos();
    }
    
    async cargarDatosIniciales() {
        try {
            // Cargar todos los datos en paralelo
            const [boxes, sucursales, tratamientos, packs, profesionales] = await Promise.all([
                boxesAPI.getAll(),
                sucursalesAPI.getAll(),
                tratamientosAPI.getAll(),
                packsAPI.getAll(),
                profesionalesAPI.getAll()
            ]);
            
            this.boxes = boxes;
            this.sucursales = sucursales;
            this.tratamientos = tratamientos;
            this.packs = packs;
            this.profesionales = profesionales;
            
            // Actualizar todas las tablas
            this.actualizarTodasLasTablas();
            
            // Cargar selects dependientes
            await this.cargarSelectsDependientes();
            

        } catch (error) {
            mostrarErrorInteligente(error, 'Error cargando datos de mantenedores');
        }
    }
    
    async cargarSelectsDependientes() {
        // Cargar sucursales en selects de boxes
        const selectSucursalBox = document.getElementById('mantenedorSucursalBox');
        if (selectSucursalBox) {
            selectSucursalBox.innerHTML = '<option value="">-- Seleccionar sucursal --</option>';
            this.sucursales.forEach(sucursal => {
                if (sucursal.activo === true) {
                    const option = document.createElement('option');
                    option.value = sucursal.id;
                    option.textContent = sucursal.nombre;
                    selectSucursalBox.appendChild(option);
                }
            });
        }
        
        // Cargar tratamientos en selects de packs
        const selectTratamientoPack = document.getElementById('mantenedorTratamientoPack');
        if (selectTratamientoPack) {
            selectTratamientoPack.innerHTML = '<option value="">-- Seleccionar tratamiento --</option>';
            this.tratamientos.forEach(tratamiento => {
                if (tratamiento.activo === true) {
                    const option = document.createElement('option');
                    option.value = tratamiento.id;
                    option.textContent = tratamiento.nombre;
                    selectTratamientoPack.appendChild(option);
                }
            });
        }
    }
    
    configurarEventos() {
        // Eventos para formularios
        const forms = [
            'mantenedorBoxForm',
            'mantenedorSucursalForm', 
            'mantenedorTratamientoForm',
            'mantenedorPackForm',
            'mantenedorProfesionalForm'
        ];
        
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.guardarEntidad(formId);
                });
            }
        });
        
        // Eventos para búsquedas
        const searchInputs = [
            'buscarBoxMantenedor',
            'buscarSucursalMantenedor',
            'buscarTratamientoMantenedor',
            'buscarPackMantenedor',
            'buscarProfesionalMantenedor'
        ];
        
        searchInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => {
                    this.filtrarTabla(inputId, e.target.value);
                });
            }
        });
    }
    
    actualizarTodasLasTablas() {
        this.actualizarTablaBoxes();
        this.actualizarTablaSucursales();
        this.actualizarTablaTratamientos();
        this.actualizarTablaPacks();
        this.actualizarTablaProfesionales();
    }
    
    // ==================== BOXES ====================
    
    actualizarTablaBoxes() {
        const tbody = document.getElementById('cuerpoTablaBoxesMantenedor');
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
                <td data-label="Sucursal">${box.sucursal_nombre || 'N/A'}</td>
                <td data-label="Descripción">${box.descripcion || 'Sin descripción'}</td>
                <td data-label="Capacidad">${box.capacidad || 'N/A'}</td>
                <td data-label="Estado"><span class="status-badge status-${box.estado}">${this.formatearEstado(box.estado)}</span></td>
                <td data-label="Acciones">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="mantenedoresModule.editarBox(${box.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="mantenedoresModule.eliminarBox(${box.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async guardarBox() {
        const form = document.getElementById('mantenedorBoxForm');
        const formData = new FormData(form);
        
        const boxData = {
            nombre: formData.get('nombreBox'),
            sucursal_id: parseInt(formData.get('sucursalBox')),
            descripcion: formData.get('descripcionBox') || '',
            capacidad: formData.get('capacidadBox') ? parseInt(formData.get('capacidadBox')) : null,
            activo: formData.get('estadoBox') === 'activo'
        };
        
        const boxId = formData.get('boxId');
        
        try {
            let resultado;
            if (boxId) {
                resultado = await boxesAPI.update(parseInt(boxId), boxData);
            } else {
                resultado = await boxesAPI.create(boxData);
            }
            
            if (resultado) {
                mostrarNotificacion(boxId ? 'Box actualizado correctamente' : 'Box creado correctamente', 'success');
                this.limpiarFormularioBox();
                await this.cargarDatosIniciales();
            }
        } catch (error) {
            mostrarErrorInteligente(error, 'Error guardando box');
        }
    }
    
    async editarBox(boxId) {
        const box = this.boxes.find(b => b.id === boxId);
        if (!box) return;
        
        const form = document.getElementById('mantenedorBoxForm');
        form.querySelector('[name="boxId"]').value = box.id;
        form.querySelector('[name="nombreBox"]').value = box.nombre;
        form.querySelector('[name="sucursalBox"]').value = box.sucursal_id || '';
        form.querySelector('[name="descripcionBox"]').value = box.descripcion || '';
        form.querySelector('[name="capacidadBox"]').value = box.capacidad || '';
        form.querySelector('[name="estadoBox"]').value = box.activo ? 'activo' : 'inactivo';
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Box';
        }
        
        mostrarNotificacion(`Box "${box.nombre}" cargado para edición`, 'info');
    }
    
    async eliminarBox(boxId) {
        const box = this.boxes.find(b => b.id === boxId);
        if (!box) return;
        
        if (confirm(`¿Estás seguro de que deseas eliminar el box "${box.nombre}"?`)) {
            try {
                const resultado = await boxesAPI.delete(boxId);
                
                if (resultado) {
                    mostrarNotificacion('Box eliminado correctamente', 'success');
                    await this.cargarDatosIniciales();
                }
            } catch (error) {
                mostrarErrorInteligente(error, 'Error eliminando box');
            }
        }
    }
    
    limpiarFormularioBox() {
        const form = document.getElementById('mantenedorBoxForm');
        if (form) {
            form.reset();
            document.getElementById('mantenedorBoxId').value = '';
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Guardar Box';
            }
        }
        mostrarNotificacion('Formulario de box limpiado', 'info');
    }
    
    // ==================== SUCURSALES ====================
    
    actualizarTablaSucursales() {
        const tbody = document.getElementById('cuerpoTablaSucursalesMantenedor');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.sucursales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay sucursales registradas</td></tr>';
            return;
        }
        
        this.sucursales.forEach(sucursal => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Nombre">${sucursal.nombre}</td>
                <td data-label="Dirección">${sucursal.direccion}</td>
                <td data-label="Teléfono">${sucursal.telefono}</td>
                <td data-label="Email">${sucursal.email}</td>
                <td data-label="Estado"><span class="status-badge status-${sucursal.activo ? 'activo' : 'inactivo'}">${sucursal.activo ? 'Activa' : 'Inactiva'}</span></td>
                <td data-label="Acciones">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="mantenedoresModule.editarSucursal(${sucursal.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="mantenedoresModule.eliminarSucursal(${sucursal.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async guardarSucursal() {
        const form = document.getElementById('mantenedorSucursalForm');
        const formData = new FormData(form);
        
        const sucursalData = {
            nombre: formData.get('nombreSucursal'),
            direccion: formData.get('direccionSucursal'),
            telefono: formData.get('telefonoSucursal'),
            email: formData.get('emailSucursal'),
            activo: formData.get('estadoSucursal') === 'activo'
        };
        
        const sucursalId = formData.get('sucursalId');
        
        try {
            let resultado;
            if (sucursalId) {
                resultado = await sucursalesAPI.update(parseInt(sucursalId), sucursalData);
            } else {
                resultado = await sucursalesAPI.create(sucursalData);
            }
            
            if (resultado) {
                mostrarNotificacion(sucursalId ? 'Sucursal actualizada correctamente' : 'Sucursal creada correctamente', 'success');
                this.limpiarFormularioSucursal();
                await this.cargarDatosIniciales();
            }
        } catch (error) {
            mostrarErrorInteligente(error, 'Error guardando sucursal');
        }
    }
    
    async editarSucursal(sucursalId) {
        const sucursal = this.sucursales.find(s => s.id === sucursalId);
        if (!sucursal) return;
        
        const form = document.getElementById('mantenedorSucursalForm');
        form.querySelector('[name="sucursalId"]').value = sucursal.id;
        form.querySelector('[name="nombreSucursal"]').value = sucursal.nombre;
        form.querySelector('[name="direccionSucursal"]').value = sucursal.direccion;
        form.querySelector('[name="telefonoSucursal"]').value = sucursal.telefono;
        form.querySelector('[name="emailSucursal"]').value = sucursal.email;
        form.querySelector('[name="estadoSucursal"]').value = sucursal.activo ? 'activo' : 'inactivo';
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Sucursal';
        }
        
        mostrarNotificacion(`Sucursal "${sucursal.nombre}" cargada para edición`, 'info');
    }
    
    async eliminarSucursal(sucursalId) {
        const sucursal = this.sucursales.find(s => s.id === sucursalId);
        if (!sucursal) return;
        
        if (confirm(`¿Estás seguro de que deseas eliminar la sucursal "${sucursal.nombre}"?`)) {
            try {
                const resultado = await sucursalesAPI.delete(sucursalId);
                
                if (resultado) {
                    mostrarNotificacion('Sucursal eliminada correctamente', 'success');
                    await this.cargarDatosIniciales();
                }
            } catch (error) {
                mostrarErrorInteligente(error, 'Error eliminando sucursal');
            }
        }
    }
    
    limpiarFormularioSucursal() {
        const form = document.getElementById('mantenedorSucursalForm');
        if (form) {
            form.reset();
            document.getElementById('mantenedorSucursalId').value = '';
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Guardar Sucursal';
            }
        }
        mostrarNotificacion('Formulario de sucursal limpiado', 'info');
    }
    
    // ==================== TRATAMIENTOS ====================
    
    actualizarTablaTratamientos() {
        const tbody = document.getElementById('cuerpoTablaTratamientosMantenedor');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.tratamientos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay tratamientos registrados</td></tr>';
            return;
        }
        
        this.tratamientos.forEach(tratamiento => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Nombre">${tratamiento.nombre}</td>
                <td data-label="Descripción">${tratamiento.descripcion}</td>
                <td data-label="Duración">${tratamiento.duracion_sesion_min} min</td>
                <td data-label="Frecuencia">${tratamiento.frecuencia_recomendada_dias} días</td>
                <td data-label="Estado"><span class="status-badge status-${tratamiento.activo ? 'activo' : 'inactivo'}">${tratamiento.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td data-label="Acciones">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="mantenedoresModule.editarTratamiento(${tratamiento.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="mantenedoresModule.eliminarTratamiento(${tratamiento.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async guardarTratamiento() {
        const form = document.getElementById('mantenedorTratamientoForm');
        const formData = new FormData(form);
        
        const tratamientoData = {
            nombre: formData.get('nombreTratamiento'),
            descripcion: formData.get('descripcionTratamiento'),
            duracion_sesion_min: parseInt(formData.get('duracionTratamiento')),
            frecuencia_recomendada_dias: parseInt(formData.get('frecuenciaTratamiento')),
            activo: formData.get('estadoTratamiento') === 'activo'
        };
        
        const tratamientoId = formData.get('tratamientoId');
        
        try {
            let resultado;
            if (tratamientoId) {
                resultado = await tratamientosAPI.update(parseInt(tratamientoId), tratamientoData);
            } else {
                resultado = await tratamientosAPI.create(tratamientoData);
            }
            
            if (resultado) {
                mostrarNotificacion(tratamientoId ? 'Tratamiento actualizado correctamente' : 'Tratamiento creado correctamente', 'success');
                this.limpiarFormularioTratamiento();
                await this.cargarDatosIniciales();
            }
        } catch (error) {
            mostrarErrorInteligente(error, 'Error guardando tratamiento');
        }
    }
    
    async editarTratamiento(tratamientoId) {
        const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);
        if (!tratamiento) return;
        
        const form = document.getElementById('mantenedorTratamientoForm');
        form.querySelector('[name="tratamientoId"]').value = tratamiento.id;
        form.querySelector('[name="nombreTratamiento"]').value = tratamiento.nombre;
        form.querySelector('[name="descripcionTratamiento"]').value = tratamiento.descripcion;
        form.querySelector('[name="duracionTratamiento"]').value = tratamiento.duracion_sesion_min;
        form.querySelector('[name="frecuenciaTratamiento"]').value = tratamiento.frecuencia_recomendada_dias;
        form.querySelector('[name="estadoTratamiento"]').value = tratamiento.activo ? 'activo' : 'inactivo';
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Tratamiento';
        }
        
        mostrarNotificacion(`Tratamiento "${tratamiento.nombre}" cargado para edición`, 'info');
    }
    
    async eliminarTratamiento(tratamientoId) {
        const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);
        if (!tratamiento) return;
        
        if (confirm(`¿Estás seguro de que deseas eliminar el tratamiento "${tratamiento.nombre}"?`)) {
            try {
                const resultado = await tratamientosAPI.delete(tratamientoId);
                
                if (resultado) {
                    mostrarNotificacion('Tratamiento eliminado correctamente', 'success');
                    await this.cargarDatosIniciales();
                }
            } catch (error) {
                mostrarErrorInteligente(error, 'Error eliminando tratamiento');
            }
        }
    }
    
    limpiarFormularioTratamiento() {
        const form = document.getElementById('mantenedorTratamientoForm');
        if (form) {
            form.reset();
            document.getElementById('mantenedorTratamientoId').value = '';
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Guardar Tratamiento';
            }
        }
        mostrarNotificacion('Formulario de tratamiento limpiado', 'info');
    }
    
    // ==================== PACKS ====================
    
    actualizarTablaPacks() {
        const tbody = document.getElementById('cuerpoTablaPacksMantenedor');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.packs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay packs registrados</td></tr>';
            return;
        }
        
        this.packs.forEach(pack => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Nombre">${pack.nombre}</td>
                <td data-label="Tratamiento">${pack.tratamiento_nombre || 'N/A'}</td>
                <td data-label="Sesiones">${pack.sesiones_incluidas}</td>
                <td data-label="Precio">$${pack.precio_total?.toLocaleString('es-CL') || 'N/A'}</td>
                <td data-label="Género">${this.formatearGenero(pack.genero)}</td>
                <td data-label="Estado"><span class="status-badge status-${pack.activo ? 'activo' : 'inactivo'}">${pack.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td data-label="Acciones">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="mantenedoresModule.editarPack(${pack.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="mantenedoresModule.eliminarPack(${pack.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async guardarPack() {
        const form = document.getElementById('mantenedorPackForm');
        const formData = new FormData(form);
        
        const packData = {
            tratamiento_id: parseInt(formData.get('tratamientoPack')),
            nombre: formData.get('nombrePack'),
            descripcion: formData.get('descripcionPack'),
            sesiones_incluidas: parseInt(formData.get('sesionesPack')),
            precio_total: parseFloat(formData.get('precioPack')),
            genero: formData.get('generoPack'),
            activo: formData.get('estadoPack') === 'activo'
        };
        
        const packId = formData.get('packId');
        
        try {
            let resultado;
            if (packId) {
                resultado = await packsAPI.update(parseInt(packId), packData);
            } else {
                resultado = await packsAPI.create(packData);
            }
            
            if (resultado) {
                mostrarNotificacion(packId ? 'Pack actualizado correctamente' : 'Pack creado correctamente', 'success');
                this.limpiarFormularioPack();
                await this.cargarDatosIniciales();
            }
        } catch (error) {
            mostrarErrorInteligente(error, 'Error guardando pack');
        }
    }
    
    async editarPack(packId) {
        const pack = this.packs.find(p => p.id === packId);
        if (!pack) return;
        
        const form = document.getElementById('mantenedorPackForm');
        form.querySelector('[name="packId"]').value = pack.id;
        form.querySelector('[name="tratamientoPack"]').value = pack.tratamiento_id || '';
        form.querySelector('[name="nombrePack"]').value = pack.nombre;
        form.querySelector('[name="descripcionPack"]').value = pack.descripcion || '';
        form.querySelector('[name="sesionesPack"]').value = pack.sesiones_incluidas;
        form.querySelector('[name="precioPack"]').value = pack.precio_total;
        form.querySelector('[name="generoPack"]').value = pack.genero || 'U';
        form.querySelector('[name="estadoPack"]').value = pack.activo ? 'activo' : 'inactivo';
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Pack';
        }
        
        mostrarNotificacion(`Pack "${pack.nombre}" cargado para edición`, 'info');
    }
    
    async eliminarPack(packId) {
        const pack = this.packs.find(p => p.id === packId);
        if (!pack) return;
        
        if (confirm(`¿Estás seguro de que deseas eliminar el pack "${pack.nombre}"?`)) {
            try {
                const resultado = await packsAPI.delete(packId);
                
                if (resultado) {
                    mostrarNotificacion('Pack eliminado correctamente', 'success');
                    await this.cargarDatosIniciales();
                }
            } catch (error) {
                mostrarErrorInteligente(error, 'Error eliminando pack');
            }
        }
    }
    
    limpiarFormularioPack() {
        const form = document.getElementById('mantenedorPackForm');
        if (form) {
            form.reset();
            document.getElementById('mantenedorPackId').value = '';
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Guardar Pack';
            }
        }
        mostrarNotificacion('Formulario de pack limpiado', 'info');
    }
    
    // ==================== PROFESIONALES ====================
    
    actualizarTablaProfesionales() {
        const tbody = document.getElementById('cuerpoTablaProfesionalesMantenedor');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.profesionales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay profesionales registrados</td></tr>';
            return;
        }
        
        this.profesionales.forEach(profesional => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Nombre">${profesional.nombre}</td>
                <td data-label="Apellidos">${profesional.apellidos}</td>
                <td data-label="RUT">${profesional.rut}</td>
                <td data-label="Teléfono">${profesional.telefono}</td>
                <td data-label="Email">${profesional.email}</td>
                <td data-label="Tipo">${profesional.tipo_profesional}</td>
                <td data-label="Especialidad">${profesional.especialidad}</td>
                <td data-label="Acciones">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="mantenedoresModule.editarProfesional(${profesional.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="mantenedoresModule.eliminarProfesional(${profesional.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async guardarProfesional() {
        const form = document.getElementById('mantenedorProfesionalForm');
        const formData = new FormData(form);
        
        const profesionalData = {
            nombre: formData.get('nombreProfesional'),
            apellidos: formData.get('apellidosProfesional'),
            rut: formData.get('rutProfesional'),
            telefono: formData.get('telefonoProfesional'),
            email: formData.get('emailProfesional'),
            tipo_profesional: formData.get('tipoProfesional'),
            especialidad: formData.get('especialidadProfesional')
        };
        
        const profesionalId = formData.get('profesionalId');
        
        try {
            let resultado;
            if (profesionalId) {
                resultado = await profesionalesAPI.update(parseInt(profesionalId), profesionalData);
            } else {
                resultado = await profesionalesAPI.create(profesionalData);
            }
            
            if (resultado) {
                mostrarNotificacion(profesionalId ? 'Profesional actualizado correctamente' : 'Profesional creado correctamente', 'success');
                this.limpiarFormularioProfesional();
                await this.cargarDatosIniciales();
            }
        } catch (error) {
            mostrarErrorInteligente(error, 'Error guardando profesional');
        }
    }
    
    async editarProfesional(profesionalId) {
        const profesional = this.profesionales.find(p => p.id === profesionalId);
        if (!profesional) return;
        
        const form = document.getElementById('mantenedorProfesionalForm');
        form.querySelector('[name="profesionalId"]').value = profesional.id;
        form.querySelector('[name="nombreProfesional"]').value = profesional.nombre;
        form.querySelector('[name="apellidosProfesional"]').value = profesional.apellidos;
        form.querySelector('[name="rutProfesional"]').value = profesional.rut;
        form.querySelector('[name="telefonoProfesional"]').value = profesional.telefono;
        form.querySelector('[name="emailProfesional"]').value = profesional.email;
        form.querySelector('[name="tipoProfesional"]').value = profesional.tipo_profesional;
        form.querySelector('[name="especialidadProfesional"]').value = profesional.especialidad;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Profesional';
        }
        
        mostrarNotificacion(`Profesional "${profesional.nombre} ${profesional.apellidos}" cargado para edición`, 'info');
    }
    
    async eliminarProfesional(profesionalId) {
        const profesional = this.profesionales.find(p => p.id === profesionalId);
        if (!profesional) return;
        
        if (confirm(`¿Estás seguro de que deseas eliminar al profesional "${profesional.nombre} ${profesional.apellidos}"?`)) {
            try {
                const resultado = await profesionalesAPI.delete(profesionalId);
                
                if (resultado) {
                    mostrarNotificacion('Profesional eliminado correctamente', 'success');
                    await this.cargarDatosIniciales();
                }
            } catch (error) {
                mostrarErrorInteligente(error, 'Error eliminando profesional');
            }
        }
    }
    
    limpiarFormularioProfesional() {
        const form = document.getElementById('mantenedorProfesionalForm');
        if (form) {
            form.reset();
            document.getElementById('mantenedorProfesionalId').value = '';
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Guardar Profesional';
            }
        }
        mostrarNotificacion('Formulario de profesional limpiado', 'info');
    }
    
    // ==================== MÉTODOS AUXILIARES ====================
    
    async guardarEntidad(formId) {
        switch (formId) {
            case 'mantenedorBoxForm':
                await this.guardarBox();
                break;
            case 'mantenedorSucursalForm':
                await this.guardarSucursal();
                break;
            case 'mantenedorTratamientoForm':
                await this.guardarTratamiento();
                break;
            case 'mantenedorPackForm':
                await this.guardarPack();
                break;
            case 'mantenedorProfesionalForm':
                await this.guardarProfesional();
                break;
        }
    }
    
    filtrarTabla(inputId, valor) {
        const tablas = {
            'buscarBoxMantenedor': 'cuerpoTablaBoxesMantenedor',
            'buscarSucursalMantenedor': 'cuerpoTablaSucursalesMantenedor',
            'buscarTratamientoMantenedor': 'cuerpoTablaTratamientosMantenedor',
            'buscarPackMantenedor': 'cuerpoTablaPacksMantenedor',
            'buscarProfesionalMantenedor': 'cuerpoTablaProfesionalesMantenedor'
        };
        
        const tbodyId = tablas[inputId];
        if (!tbodyId) return;
        
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        
        const filas = tbody.querySelectorAll('tr');
        const valorLower = valor.toLowerCase();
        
        filas.forEach(fila => {
            const texto = fila.textContent.toLowerCase();
            fila.style.display = texto.includes(valorLower) ? '' : 'none';
        });
    }
    
    formatearEstado(estado) {
        const estados = {
            'activo': 'Activo',
            'inactivo': 'Inactivo'
        };
        return estados[estado] || estado;
    }
    
    formatearGenero(genero) {
        const generos = {
            'M': 'Masculino',
            'F': 'Femenino',
            'U': 'Universal'
        };
        return generos[genero] || genero;
    }
}

// Exportar instancia global
export const mantenedoresModule = new MantenedoresModule();

// Conectar funciones globales
window.mantenedoresModule = mantenedoresModule;
window.limpiarFormularioBox = () => mantenedoresModule.limpiarFormularioBox();
window.limpiarFormularioSucursal = () => mantenedoresModule.limpiarFormularioSucursal();
window.limpiarFormularioTratamiento = () => mantenedoresModule.limpiarFormularioTratamiento();
window.limpiarFormularioPack = () => mantenedoresModule.limpiarFormularioPack();
window.limpiarFormularioProfesional = () => mantenedoresModule.limpiarFormularioProfesional();
