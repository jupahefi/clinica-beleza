/**
 * Archivo principal de la aplicación
 * Orquesta todos los módulos y maneja la navegación
 */

import { inicializarStorage } from './storage-api.js';
import { inicializarPacientes, toggleFichasEspecificas, guardarPacienteFormulario } from './modules/pacientes.js';
import { inicializarVentas, confirmarVenta } from './modules/ventas.js';
import { inicializarPagos, registrarPago } from './modules/pagos.js';
import { inicializarSesiones, iniciarSesion, terminarSesion, confirmarAgenda, cancelarAgenda, reprogramarAgenda } from './modules/sesiones.js';
import { loadEnvironment, isEnvironmentLoaded } from './env.js';
import { initializeConfig, validateConfig } from './config.js';

/**
 * Estado de la aplicación
 */
const AppState = {
  vistaActual: 'ficha',
  inicializado: false
};

/**
 * Inicializa la aplicación
 */
async function inicializarApp() {
  if (AppState.inicializado) return;
  
  try {
    console.log('🚀 Iniciando aplicación...');
    
    // Cargar variables de entorno primero
    const envConfig = await loadEnvironment();
    
    // Inicializar configuración con variables de entorno
    initializeConfig(envConfig);
    
    // Validar configuración
    const validation = validateConfig();
    if (!validation.isValid) {
      console.error('❌ Errores de configuración:', validation.errors);
      alert('Error en la configuración de la aplicación: ' + validation.errors.join(', '));
      return;
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Advertencias de configuración:', validation.warnings);
    }
    
    // Inicializar almacenamiento
    await inicializarStorage();
    
    // Inicializar módulos
    inicializarPacientes();
    inicializarVentas();
    inicializarPagos();
    inicializarSesiones();
    
    // Configurar navegación
    configurarNavegacion();
    
    // Configurar eventos globales
    configurarEventosGlobales();
    
    // Mostrar vista inicial
    showView('ficha');
    
    AppState.inicializado = true;
    console.log('✅ Aplicación inicializada correctamente');
    
  } catch (error) {
    console.error('❌ Error al inicializar aplicación:', error);
    alert('Error al inicializar la aplicación. Por favor, recarga la página.');
  }
}

/**
 * Configura la navegación entre vistas
 */
function configurarNavegacion() {
  // Los botones ya tienen onclick en el HTML, no necesitamos listeners adicionales
  console.log('✅ Navegación configurada');
}

/**
 * Mapea nombres de botones a IDs de vista
 */
function mapearNombreVista(nombre) {
  const mapeo = {
    'fichas': 'ficha',
    'ventas': 'ventas',
    'pagos': 'pagos',
    'sesiones': 'sesiones',
    'boxes': 'boxes',
    'ofertas': 'ofertas',
    'historial': 'historial'
  };
  
  return mapeo[nombre] || nombre;
}

/**
 * Configura eventos globales de la aplicación
 */
function configurarEventosGlobales() {
  // Eventos de teclado
  document.addEventListener('keydown', (e) => {
    // Escapar para cancelar operaciones
    if (e.key === 'Escape') {
      cancelarOperacionActual();
    }
    
    // Ctrl+S para guardar
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      guardarSegunVista();
    }
  });
  
  // Prevenir pérdida de datos al cerrar
  window.addEventListener('beforeunload', (e) => {
    if (hayDatosSinGuardar()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  
  // Manejo de errores globales
  window.addEventListener('error', (e) => {
    console.error('Error global:', e.error);
  });
}

/**
 * Cancela la operación actual según la vista
 */
function cancelarOperacionActual() {
  const vista = AppState.vistaActual;
  
  switch (vista) {
    case 'sesiones':
      const sesionCard = document.getElementById('sesionActualCard');
      if (sesionCard && !sesionCard.classList.contains('hidden')) {
        if (confirm('¿Desea terminar la sesión actual?')) {
          terminarSesion();
        }
      }
      break;
      
    case 'ofertas':
      const ofertaCard = document.getElementById('crearOfertaCard');
      if (ofertaCard && !ofertaCard.classList.contains('hidden')) {
        cancelarOferta();
      }
      break;
  }
}

/**
 * Guarda según la vista actual
 */
function guardarSegunVista() {
  const vista = AppState.vistaActual;
  
  switch (vista) {
    case 'ficha':
      guardarPacienteFormulario();
      break;
      
    case 'venta':
      confirmarVenta();
      break;
      
    case 'pagos':
      const pagoCard = document.getElementById('detallePagoCard');
      if (pagoCard && !pagoCard.classList.contains('hidden')) {
        registrarPago();
      }
      break;
  }
}

/**
 * Verifica si hay datos sin guardar
 */
function hayDatosSinGuardar() {
  const vista = AppState.vistaActual;
  
  switch (vista) {
    case 'ficha':
      const nombre = document.getElementById('nombrePaciente')?.value;
      return nombre && nombre.trim().length > 0;
      
    case 'sesiones':
      const sesionCard = document.getElementById('sesionActualCard');
      return sesionCard && !sesionCard.classList.contains('hidden');
      
    default:
      return false;
  }
}

/**
 * Cambia entre vistas de la aplicación
 */
export function showView(viewId) {
  try {
    // Actualizar estado
    AppState.vistaActual = viewId;
    
    // Actualizar navegación visual
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const btnActivo = Array.from(document.querySelectorAll('.nav-btn')).find(btn => {
      const nombre = btn.textContent.toLowerCase();
      const vista = mapearNombreVista(nombre);
      return vista === viewId;
    });
    
    if (btnActivo) {
      btnActivo.classList.add('active');
    }
    
    // Mostrar vista correspondiente
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });
    
    const vistaElement = document.getElementById(viewId);
    if (vistaElement) {
      vistaElement.classList.add('active');
    }
    
    // Ejecutar lógica específica de la vista
    ejecutarLogicaVista(viewId);
    
  } catch (error) {
    console.error('Error al cambiar vista:', error);
  }
}

/**
 * Ejecuta lógica específica al cambiar de vista
 */
function ejecutarLogicaVista(viewId) {
  switch (viewId) {
    case 'ficha':
      // La lógica ya está en el módulo de pacientes
      break;
      
    case 'venta':
      // La lógica ya está en el módulo de ventas
      break;
      
    case 'pagos':
      // Solo actualizar si ya está inicializado
      break;
      
    case 'sesiones':
      // Solo cargar sesiones del día actual si ya está inicializado
      if (window.cargarSesionesHoy) {
        window.cargarSesionesHoy();
      }
      break;
      
    case 'boxes':
      // Lógica para boxes
      break;
      
    case 'ofertas':
      inicializarOfertas();
      break;
      
    case 'historial':
      inicializarHistorial();
      break;
  }
}

/**
 * Inicializa la vista de ofertas
 */
function inicializarOfertas() {
  // Implementación pendiente - se puede expandir
  console.log('Vista de ofertas cargada');
}

/**
 * Inicializa la vista de historial
 */
function inicializarHistorial() {
  // Implementación pendiente - se puede expandir
  console.log('Vista de historial cargada');
}

/**
 * Expone funciones necesarias al contexto global para compatibilidad con HTML
 */
function exponerFuncionesGlobales() {
  // Navegación
  window.showView = showView;
  
  // Pacientes
  window.toggleFichaEspecifica = toggleFichasEspecificas; // Mantener compatibilidad
  window.toggleFichasEspecificas = toggleFichasEspecificas;
  window.guardarPaciente = guardarPacienteFormulario;
  
  // Ventas
  window.confirmarVenta = confirmarVenta;
  
  // Pagos
  window.registrarPago = registrarPago;
  
  // Sesiones
  window.iniciarSesion = iniciarSesion;
  window.terminarSesion = terminarSesion;
  window.confirmarAgenda = confirmarAgenda;
  window.cancelarAgenda = cancelarAgenda;
  window.reprogramarAgenda = reprogramarAgenda;
  
  console.log('✅ Funciones globales expuestas');
  console.log('showView disponible:', typeof window.showView);
}

/**
 * Punto de entrada principal
 */
document.addEventListener('DOMContentLoaded', async () => {
  exponerFuncionesGlobales();
  await inicializarApp();
});

// Para desarrollo y debugging
if (import.meta.env?.DEV) {
  window.AppState = AppState;
  window.reiniciarApp = () => {
    AppState.inicializado = false;
    inicializarApp();
  };
}
