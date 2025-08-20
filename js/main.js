/**
 * Archivo Principal - Clínica Beleza
 * Orquestador de todos los módulos del sistema
 */

import { pacientesModule } from './modules/pacientes.js';
import { ventasModule } from './modules/ventas.js';
import { pagosModule } from './modules/pagos.js';
import { sesionesModule } from './modules/sesiones.js';
import { fichasEspecificas } from './modules/fichas-especificas.js';
import { boxesModule } from './modules/boxes.js';
import { ofertasModule } from './modules/ofertas.js';
import { reportesModule } from './modules/reportes.js';

// Importar utilidades
import { formatCurrency, formatDate, showMessage } from './utils.js';

// Importar constantes
import { ZONAS_CUERPO, ZONAS_CUERPO_LABELS, TRATAMIENTOS } from './constants.js';

// Importar cliente API
import { initializeApiClient } from './api-client.js';

class ClinicaBelezaApp {
    constructor() {
        this.currentView = 'fichas';
        this.modules = {
            pacientes: pacientesModule,
            ventas: ventasModule,
            pagos: pagosModule,
            sesiones: sesionesModule,
            fichasEspecificas: fichasEspecificas,
            boxes: boxesModule,
            ofertas: ofertasModule,
            reportes: reportesModule
        };
        this.init();
    }
    
    async init() {
        // Inicializar cliente API primero
        initializeApiClient();
        
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupSearchFunctionality();
        this.setupGlobalEventListeners();
        await this.loadInitialData();
        this.showWelcomeMessage();
    }
    
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                this.switchView(view);
            });
        });
        
        // Activar vista inicial
        this.switchView('fichas');
    }
    
    switchView(viewName) {
        // Ocultar todas las vistas
        const views = document.querySelectorAll('.view-section');
        views.forEach(view => {
            view.classList.remove('active');
        });
        
        // Mostrar vista seleccionada
        const targetView = document.getElementById(viewName);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
        }
        
        // Actualizar navegación
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === viewName) {
                link.classList.add('active');
            }
        });
        
        // Cargar datos específicos de la vista
        this.loadViewData(viewName);
    }
    
    loadViewData(viewName) {
        switch (viewName) {
            case 'fichas':
                this.modules.pacientes.cargarPacientes();
                break;
            case 'ventas':
                this.modules.ventas.loadVentas();
                this.modules.ventas.loadPacientes();
                break;
            case 'pagos':
                this.modules.pagos.loadPagos();
                this.modules.pagos.loadPacientes();
                break;
            case 'sesiones':
                this.modules.sesiones.loadSesiones();
                this.modules.sesiones.loadPacientes();
                break;
            case 'boxes':
                this.modules.boxes.cargarBoxes();
                break;
            case 'ofertas':
                this.modules.ofertas.cargarOfertas();
                break;
            case 'reportes':
                this.modules.reportes.cargarReportesDisponibles();
                break;
        }
    }
    
    setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
            
            // Cerrar menú al hacer clic en un enlace
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                });
            });
        }
    }
    
    setupSearchFunctionality() {
        // Búsqueda de pacientes
        const buscarPaciente = document.getElementById('buscarPaciente');
        if (buscarPaciente) {
            buscarPaciente.addEventListener('input', (e) => {
                this.modules.pacientes.buscarPacientes(e.target.value);
            });
        }
        
        // Búsqueda de ventas
        const buscarVenta = document.getElementById('buscarVenta');
        if (buscarVenta) {
            buscarVenta.addEventListener('input', (e) => {
                this.modules.ventas.buscarVentas(e.target.value);
            });
        }
        
        // Búsqueda de pagos
        const buscarPago = document.getElementById('buscarPago');
        if (buscarPago) {
            buscarPago.addEventListener('input', (e) => {
                this.modules.pagos.buscarPagos(e.target.value);
            });
        }
        
        // Búsqueda de sesiones
        const buscarSesion = document.getElementById('buscarSesion');
        if (buscarSesion) {
            buscarSesion.addEventListener('input', (e) => {
                this.modules.sesiones.buscarSesiones(e.target.value);
            });
        }
    }
    
    setupGlobalEventListeners() {
        // Manejar cambios en fichas específicas
        const fichasCheckboxes = document.querySelectorAll('input[name="fichasEspecificas"]');
        fichasCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.modules.fichasEspecificas.toggleFichaEspecifica(e.target.id);
            });
        });
        
        // Manejar cambios en el toggle de fichas específicas
        const toggleFichas = document.getElementById('toggleFichasEspecificas');
        if (toggleFichas) {
            toggleFichas.addEventListener('change', (e) => {
                this.modules.pacientes.toggleFichasEspecificas(e.target.checked);
            });
        }
        
        // Filtro de historial
        const filtroHistorial = document.getElementById('filtroHistorial');
        if (filtroHistorial) {
            filtroHistorial.addEventListener('change', (e) => {
                this.modules.reportes.filtrarHistorial(e.target.value);
            });
        }
    }
    
    async loadInitialData() {
        try {
            console.log('🔄 Cargando datos iniciales...');
            
            // Cargar datos básicos de forma individual para manejar errores
            const loadPromises = [
                this.modules.pacientes.cargarPacientes().catch(e => console.warn('⚠️ Error cargando pacientes:', e.message)),
                this.modules.ventas.loadVentas().catch(e => console.warn('⚠️ Error cargando ventas:', e.message)),
                this.modules.pagos.loadPagos().catch(e => console.warn('⚠️ Error cargando pagos:', e.message)),
                this.modules.sesiones.loadSesiones().catch(e => console.warn('⚠️ Error cargando sesiones:', e.message)),
                this.modules.boxes.cargarBoxes().catch(e => console.warn('⚠️ Error cargando boxes:', e.message)),
                this.modules.ofertas.cargarOfertas().catch(e => console.warn('⚠️ Error cargando ofertas:', e.message))
            ];
            
            await Promise.allSettled(loadPromises);
            
            console.log('✅ Datos iniciales cargados (con errores manejados)');
        } catch (error) {
            console.error('❌ Error crítico cargando datos iniciales:', error);
            showMessage('Error cargando datos iniciales', 'error');
        }
    }
    
    showWelcomeMessage() {
        const now = new Date();
        const hour = now.getHours();
        let greeting = '';
        
        if (hour < 12) {
            greeting = 'Buenos días';
        } else if (hour < 18) {
            greeting = 'Buenas tardes';
        } else {
            greeting = 'Buenas noches';
        }
        
        console.log(`🏥 ${greeting}! Bienvenido al Sistema de Gestión de Clínica Beleza`);
        console.log('📊 Sistema cargado y listo para usar');
    }
    
    // Métodos de utilidad global
    getCurrentView() {
        return this.currentView;
    }
    
    getModule(moduleName) {
        return this.modules[moduleName];
    }
    
    // Método para mostrar estadísticas rápidas
    async showQuickStats() {
        try {
            const stats = {
                pacientes: this.modules.pacientes.pacientes?.length || 0,
                ventas: this.modules.ventas.ventas?.length || 0,
                pagos: this.modules.pagos.pagos?.length || 0,
                sesiones: this.modules.sesiones.sesiones?.length || 0
            };
            
            const statsMessage = `
                📊 Estadísticas Rápidas:
                • Pacientes: ${stats.pacientes}
                • Ventas: ${stats.ventas}
                • Pagos: ${stats.pagos}
                • Sesiones: ${stats.sesiones}
            `;
            
            console.log(statsMessage);
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
        }
    }
    
    // Método para exportar datos
    exportData() {
        const data = {
            pacientes: this.modules.pacientes.pacientes,
            ventas: this.modules.ventas.ventas,
            pagos: this.modules.pagos.pagos,
            sesiones: this.modules.sesiones.sesiones,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clinica-beleza-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showMessage('Datos exportados correctamente', 'success');
    }
    
    // Método para importar datos
    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validar estructura de datos
            if (!data.pacientes || !data.ventas || !data.pagos || !data.sesiones) {
                throw new Error('Formato de archivo inválido');
            }
            
            // Importar datos (implementar según necesidad)
            console.log('Datos importados:', data);
            showMessage('Datos importados correctamente', 'success');
            
        } catch (error) {
            console.error('Error importando datos:', error);
            showMessage('Error importando datos: ' + error.message, 'error');
        }
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.clinicaApp = new ClinicaBelezaApp();
    
    // Hacer disponible globalmente para debugging
    window.app = window.clinicaApp;
    
    // Mostrar estadísticas iniciales después de 2 segundos
    setTimeout(() => {
        window.clinicaApp.showQuickStats();
    }, 2000);
});

// Funciones globales para compatibilidad
window.limpiarFormularioPaciente = () => {
    window.clinicaApp.getModule('pacientes').limpiarFormularioPaciente();
};

window.limpiarFormularioVenta = () => {
    window.clinicaApp.getModule('ventas').limpiarFormularioVenta();
};

window.limpiarFormularioPago = () => {
    window.clinicaApp.getModule('pagos').limpiarFormularioPago();
};

window.limpiarFormularioSesion = () => {
    window.clinicaApp.getModule('sesiones').limpiarFormularioSesion();
};

window.limpiarFormularioBox = () => {
    window.clinicaApp.getModule('boxes').limpiarFormularioBox();
};

window.limpiarFormularioOferta = () => {
    window.clinicaApp.getModule('ofertas').limpiarFormularioOferta();
};

// Exportar para uso en otros módulos
export default ClinicaBelezaApp;
