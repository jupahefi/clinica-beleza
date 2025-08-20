/**
 * Archivo principal de la aplicación
 * Orquesta todos los módulos y maneja la navegación
 */

import { inicializarPacientes, toggleFichasEspecificas, guardarPacienteFormulario } from './modules/pacientes.js';
import { inicializarVentas, confirmarVenta } from './modules/ventas.js';
import { inicializarPagos, registrarPago } from './modules/pagos.js';
import { inicializarSesiones, iniciarSesion, terminarSesion, editarSesion, cancelarSesion, reagendarSesion } from './modules/sesiones.js';
import { inicializarBoxes } from './modules/boxes.js';
import { inicializarOfertas } from './modules/ofertas.js';
import { inicializarReportes } from './modules/reportes.js';
import { loadEnvironment, validateConfig } from './env.js';
import { initializeApiClient, checkConnection } from './api-client.js';

// Estado global de la aplicación
const AppState = {
    inicializado: false,
    vistaActual: 'fichas',
    datosCargados: false
};

// Función principal de inicialización
async function inicializarApp() {
  if (AppState.inicializado) return;
  
  try {
        console.log('🚀 Iniciando aplicación...');
        
        // Cargar configuración del entorno
        await loadEnvironment();
        
        const isValid = validateConfig();
        if (!isValid) {
            console.error('❌ Error de configuración: Variables de entorno requeridas no encontradas');
            mostrarMensaje('Error de configuración: Variables de entorno requeridas no encontradas', 'error');
            return;
        }

        // Inicializar cliente API (server-based)
        initializeApiClient();
        
        // Verificar conexión a la API
        const connection = await checkConnection();
        if (!connection.connected) {
            console.error('❌ No se puede conectar a la API:', connection.error);
            mostrarMensaje('Error de conexión a la API: ' + connection.error, 'error');
            return;
        }
        
        console.log('✅ Conexión a API establecida');
    
    // Inicializar módulos
    await inicializarPacientes();
    await inicializarVentas();
    await inicializarPagos();
    await inicializarSesiones();
    await inicializarBoxes();
    await inicializarOfertas();
    await inicializarReportes();
    
        // Inicializar navegación
        inicializarNavegacion();
    
        // Inicializar funcionalidades móviles
        inicializarMobileMenu();
    
        // Cargar datos iniciales
        await cargarDatosIniciales();
    
    AppState.inicializado = true;
    console.log('✅ Aplicación inicializada correctamente');
        
  } catch (error) {
        console.error('❌ Error al inicializar la aplicación:', error);
        mostrarMensaje('Error al inicializar la aplicación: ' + error.message, 'error');
    }
}

// Inicializar navegación moderna
function inicializarNavegacion() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.getAttribute('data-view');
            if (view) {
                cambiarVista(view);
            }
        });
    });
    
    // Navegación por hash
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1);
        if (hash && ['fichas', 'ventas', 'pagos', 'sesiones', 'boxes', 'ofertas', 'historial'].includes(hash)) {
            cambiarVista(hash);
        }
    });
    
    // Establecer vista inicial
    const hash = window.location.hash.slice(1);
    if (hash && ['fichas', 'ventas', 'pagos', 'sesiones', 'boxes', 'ofertas', 'historial'].includes(hash)) {
        cambiarVista(hash);
    } else {
        cambiarVista('fichas');
    }
}

// Cambiar vista
function cambiarVista(vista) {
    // Ocultar todas las secciones
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remover clase active de todos los enlaces
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Mostrar sección seleccionada
    const seccion = document.getElementById(vista);
    if (seccion) {
        seccion.classList.add('active');
    }
    
    // Activar enlace correspondiente
    const link = document.querySelector(`[data-view="${vista}"]`);
    if (link) {
        link.classList.add('active');
    }
    
    // Actualizar hash
    window.location.hash = vista;
    
    // Actualizar estado
    AppState.vistaActual = vista;
    
    // Cargar datos específicos de la vista
    cargarDatosVista(vista);
}

// Inicializar menú móvil
function inicializarMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic en un enlace
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

// Cargar datos iniciales
async function cargarDatosIniciales() {
    try {
        // Aquí se cargarían los datos iniciales si es necesario
        console.log('📊 Datos iniciales cargados');
        AppState.datosCargados = true;
    } catch (error) {
        console.error('❌ Error al cargar datos iniciales:', error);
    }
}

// Cargar datos específicos de cada vista
function cargarDatosVista(vista) {
  switch (vista) {
        case 'fichas':
            // Los datos se cargan automáticamente en el módulo de pacientes
      break;
        case 'ventas':
            // Los datos se cargan automáticamente en el módulo de ventas
      break;
    case 'pagos':
            // Los datos se cargan automáticamente en el módulo de pagos
            break;
        case 'sesiones':
            // Los datos se cargan automáticamente en el módulo de sesiones
            break;
        case 'boxes':
            cargarBoxes();
            break;
        case 'ofertas':
            cargarOfertas();
            break;
        case 'historial':
            cargarHistorial();
      break;
  }
}

// Funciones para cargar datos específicos
function cargarBoxes() {
    // Implementar carga de boxes
    console.log('🏢 Cargando boxes...');
}

function cargarOfertas() {
    // Implementar carga de ofertas
    console.log('🏷️ Cargando ofertas...');
}

function cargarHistorial() {
    // Implementar carga de historial
    console.log('📋 Cargando historial...');
}

// Función para mostrar mensajes
function mostrarMensaje(mensaje, tipo = 'info') {
    // Crear elemento de mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${tipo}`;
    messageDiv.textContent = mensaje;
    
    // Insertar al inicio del contenedor principal
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(messageDiv, mainContent.firstChild);
        
        // Remover mensaje después de 5 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Función para mostrar loading
function mostrarLoading(elemento) {
    elemento.classList.add('loading');
}

function ocultarLoading(elemento) {
    elemento.classList.remove('loading');
}

// Funciones globales para formularios
function limpiarFormularioPaciente() {
    document.getElementById('pacienteForm').reset();
    mostrarMensaje('Formulario limpiado', 'info');
}

function limpiarFormularioVenta() {
    document.getElementById('ventaForm').reset();
    mostrarMensaje('Formulario limpiado', 'info');
}

function limpiarFormularioPago() {
    document.getElementById('pagoForm').reset();
    mostrarMensaje('Formulario limpiado', 'info');
}

function limpiarFormularioSesion() {
    document.getElementById('sesionForm').reset();
    mostrarMensaje('Formulario limpiado', 'info');
}

function limpiarFormularioBox() {
    document.getElementById('boxForm').reset();
    mostrarMensaje('Formulario limpiado', 'info');
}

function limpiarFormularioOferta() {
    document.getElementById('ofertaForm').reset();
    mostrarMensaje('Formulario limpiado', 'info');
}

// Exponer funciones globales
function exponerFuncionesGlobales() {
    window.cambiarVista = cambiarVista;
    window.mostrarMensaje = mostrarMensaje;
    window.mostrarLoading = mostrarLoading;
    window.ocultarLoading = ocultarLoading;
    window.limpiarFormularioPaciente = limpiarFormularioPaciente;
    window.limpiarFormularioVenta = limpiarFormularioVenta;
    window.limpiarFormularioPago = limpiarFormularioPago;
    window.limpiarFormularioSesion = limpiarFormularioSesion;
    window.limpiarFormularioBox = limpiarFormularioBox;
    window.limpiarFormularioOferta = limpiarFormularioOferta;
    
    // Funciones de módulos
    window.toggleFichasEspecificas = toggleFichasEspecificas;
    window.guardarPacienteFormulario = guardarPacienteFormulario;
    window.limpiarFormularioPaciente = limpiarFormularioPaciente;
    window.confirmarVenta = confirmarVenta;
    window.registrarPago = registrarPago;
    window.iniciarSesion = iniciarSesion;
    window.terminarSesion = terminarSesion;
    window.editarSesion = editarSesion;
    window.cancelarSesion = cancelarSesion;
    window.reagendarSesion = reagendarSesion;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  exponerFuncionesGlobales();
    await inicializarApp();
});

// Exportar para uso en otros módulos
export { cambiarVista, mostrarMensaje, mostrarLoading, ocultarLoading };
