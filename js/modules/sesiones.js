// Módulo de Sesiones - Integrado con Calendario Propio
// Eliminada dependencia de Google Calendar

let sesiones = [];
let calendar = null;

export function inicializarSesiones() {
    console.log('📅 Inicializando módulo de sesiones...');
    
    // Inicializar calendario
    inicializarCalendario();
    
    // Cargar datos iniciales
    cargarSesiones();
    cargarPacientes();
    cargarVentas();
    cargarBoxes();
    
    // Configurar formulario
    configurarFormularioSesion();
    
    // Configurar búsqueda
    configurarBusqueda();
    
    console.log('✅ Módulo de sesiones inicializado');
}

function inicializarCalendario() {
    const calendarWrapper = document.getElementById('calendar-wrapper');
    if (calendarWrapper) {
        calendar = new Calendar(calendarWrapper, {
            initialView: 'week',
            slotDuration: 30,
            slotMinTime: '08:00:00',
            slotMaxTime: '20:00:00'
        });
        
        // Cargar boxes en el calendario
        calendar.loadBoxes();
    }
}

async function cargarSesiones() {
    try {
        const response = await fetch('/api.php?action=sesiones');
        const data = await response.json();
        
        if (data.success) {
            sesiones = data.data;
            actualizarTablaSesiones();
            
            // Actualizar calendario si existe
            if (calendar) {
                calendar.events = sesiones;
                calendar.renderCalendar();
            }
        }
    } catch (error) {
        console.error('Error cargando sesiones:', error);
        mostrarMensaje('Error cargando sesiones', 'error');
    }
}

async function cargarPacientes() {
    try {
        const response = await fetch('/api.php?action=pacientes');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('pacienteSesion');
            select.innerHTML = '<option value="">Seleccionar paciente...</option>';
            
            data.data.forEach(paciente => {
                if (paciente.estado === 'activo') {
                    const option = document.createElement('option');
                    option.value = paciente.id;
                    option.textContent = `${paciente.nombre} (${paciente.rut})`;
                    select.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error cargando pacientes:', error);
    }
}

async function cargarVentas() {
    try {
        const response = await fetch('/api.php?action=ventas');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('ventaSesion');
            select.innerHTML = '<option value="">Seleccionar venta...</option>';
            
            data.data.forEach(venta => {
                if (venta.estado === 'pendiente' || venta.estado === 'completada') {
                    const option = document.createElement('option');
                    option.value = venta.id;
                    option.textContent = `${venta.tratamiento} - ${venta.paciente_nombre} (${venta.sesiones_usadas}/${venta.sesiones_total})`;
                    select.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error cargando ventas:', error);
    }
}

async function cargarBoxes() {
    try {
        const response = await fetch('/api.php?action=boxes');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('boxSesion');
            select.innerHTML = '<option value="">Seleccionar box...</option>';
            
            data.data.forEach(box => {
                if (box.estado === 'disponible') {
                    const option = document.createElement('option');
                    option.value = box.id;
                    option.textContent = box.nombre;
                    select.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error cargando boxes:', error);
    }
}

function configurarFormularioSesion() {
    const form = document.getElementById('sesionForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarSesion();
        });
    }
    
    // Configurar cambio de paciente para cargar ventas
    const pacienteSelect = document.getElementById('pacienteSesion');
    if (pacienteSelect) {
        pacienteSelect.addEventListener('change', async (e) => {
            const pacienteId = e.target.value;
            if (pacienteId) {
                await cargarVentasPorPaciente(pacienteId);
            }
        });
    }
}

async function cargarVentasPorPaciente(pacienteId) {
    try {
        const response = await fetch(`/api.php?action=ventas&paciente_id=${pacienteId}`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('ventaSesion');
            select.innerHTML = '<option value="">Seleccionar venta...</option>';
            
            data.data.forEach(venta => {
                if (venta.sesiones_usadas < venta.sesiones_total) {
                    const option = document.createElement('option');
                    option.value = venta.id;
                    option.textContent = `${venta.tratamiento} (${venta.sesiones_usadas}/${venta.sesiones_total})`;
                    select.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error cargando ventas del paciente:', error);
    }
}

async function guardarSesion() {
    const form = document.getElementById('sesionForm');
    const formData = new FormData(form);
    
    const sesionData = {
        venta_id: formData.get('ventaSesion'),
        paciente_id: formData.get('pacienteSesion'),
        box_id: formData.get('boxSesion'),
        titulo: formData.get('tituloSesion') || 'Sesión de tratamiento',
        fecha_inicio: `${formData.get('fechaSesion')}T${formData.get('horaSesion')}:00`,
        duracion_minutos: parseInt(formData.get('duracionSesion')) || 60,
        observaciones: formData.get('observacionesSesion') || ''
    };
    
    // Calcular fecha fin
    const fechaInicio = new Date(sesionData.fecha_inicio);
    const fechaFin = new Date(fechaInicio.getTime() + (sesionData.duracion_minutos * 60000));
    sesionData.fecha_fin = fechaFin.toISOString();
    
    try {
        const response = await fetch('/api.php?action=sesiones', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sesionData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarMensaje('Sesión agendada correctamente', 'success');
            form.reset();
            await cargarSesiones();
        } else {
            mostrarMensaje(data.message || 'Error al agendar sesión', 'error');
        }
    } catch (error) {
        console.error('Error guardando sesión:', error);
        mostrarMensaje('Error al guardar sesión', 'error');
    }
}

function configurarBusqueda() {
    const searchInput = document.getElementById('buscarSesion');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filtrarSesiones(searchTerm);
        });
    }
}

function filtrarSesiones(searchTerm) {
    const tbody = document.getElementById('cuerpoTablaSesiones');
    if (!tbody) return;
    
    const filteredSesiones = sesiones.filter(sesion => {
        return sesion.paciente_nombre?.toLowerCase().includes(searchTerm) ||
               sesion.titulo?.toLowerCase().includes(searchTerm) ||
               sesion.box_nombre?.toLowerCase().includes(searchTerm);
    });
    
    actualizarTablaSesiones(filteredSesiones);
}

function actualizarTablaSesiones(sesionesAMostrar = sesiones) {
    const tbody = document.getElementById('cuerpoTablaSesiones');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (sesionesAMostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay sesiones programadas</td></tr>';
        return;
    }
    
    sesionesAMostrar.forEach(sesion => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sesion.paciente_nombre || 'N/A'}</td>
            <td>${sesion.venta_tratamiento || 'N/A'}</td>
            <td>${sesion.box_nombre || 'N/A'}</td>
            <td>${formatearFecha(sesion.fecha_inicio)}</td>
            <td>${formatearHora(sesion.fecha_inicio)}</td>
            <td>${sesion.duracion_minutos} min</td>
            <td><span class="status-badge status-${sesion.estado}">${formatearEstado(sesion.estado)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editarSesion(${sesion.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="reagendarSesion(${sesion.id})">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="cancelarSesion(${sesion.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Funciones de acción de sesiones
export async function editarSesion(sesionId) {
    const sesion = sesiones.find(s => s.id === sesionId);
    if (!sesion) return;
    
    // Implementar modal de edición
    console.log('Editar sesión:', sesion);
    mostrarMensaje('Función de edición en desarrollo', 'info');
}

export async function reagendarSesion(sesionId) {
    const sesion = sesiones.find(s => s.id === sesionId);
    if (!sesion) return;
    
    // Implementar modal de reagendamiento
    console.log('Reagendar sesión:', sesion);
    mostrarMensaje('Función de reagendamiento en desarrollo', 'info');
}

export async function cancelarSesion(sesionId) {
    const sesion = sesiones.find(s => s.id === sesionId);
    if (!sesion) return;
    
    if (confirm(`¿Estás seguro de que deseas cancelar la sesión "${sesion.titulo}"?`)) {
        try {
            const response = await fetch(`/api.php?action=sesiones&id=${sesionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    estado: 'cancelada',
                    motivo_cancelacion: 'Cancelada por el usuario'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                mostrarMensaje('Sesión cancelada correctamente', 'success');
                await cargarSesiones();
            } else {
                mostrarMensaje(data.message || 'Error al cancelar sesión', 'error');
            }
        } catch (error) {
            console.error('Error cancelando sesión:', error);
            mostrarMensaje('Error al cancelar sesión', 'error');
        }
    }
}

export async function iniciarSesion(sesionId) {
    const sesion = sesiones.find(s => s.id === sesionId);
    if (!sesion) return;
    
    try {
        const response = await fetch(`/api.php?action=sesiones&id=${sesionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estado: 'en_curso',
                fecha_inicio: new Date().toISOString()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarMensaje('Sesión iniciada correctamente', 'success');
            await cargarSesiones();
        } else {
            mostrarMensaje(data.message || 'Error al iniciar sesión', 'error');
        }
    } catch (error) {
        console.error('Error iniciando sesión:', error);
        mostrarMensaje('Error al iniciar sesión', 'error');
    }
}

export async function terminarSesion(sesionId) {
    const sesion = sesiones.find(s => s.id === sesionId);
    if (!sesion) return;
    
    try {
        const response = await fetch(`/api.php?action=sesiones&id=${sesionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estado: 'completada',
                fecha_fin: new Date().toISOString()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarMensaje('Sesión completada correctamente', 'success');
            await cargarSesiones();
        } else {
            mostrarMensaje(data.message || 'Error al completar sesión', 'error');
        }
    } catch (error) {
        console.error('Error terminando sesión:', error);
        mostrarMensaje('Error al terminar sesión', 'error');
    }
}

// Funciones de utilidad
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatearHora(fecha) {
    return new Date(fecha).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatearEstado(estado) {
    const estados = {
        'agendada': 'Agendada',
        'confirmada': 'Confirmada',
        'en_curso': 'En Curso',
        'completada': 'Completada',
        'cancelada': 'Cancelada',
        'reagendada': 'Reagendada'
    };
    return estados[estado] || estado;
}

function mostrarMensaje(mensaje, tipo = 'info') {
    if (window.mostrarMensaje) {
        window.mostrarMensaje(mensaje, tipo);
    } else {
        console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    }
}

// Funciones globales para compatibilidad
window.editarSesion = editarSesion;
window.reagendarSesion = reagendarSesion;
window.cancelarSesion = cancelarSesion;
window.iniciarSesion = iniciarSesion;
window.terminarSesion = terminarSesion;
