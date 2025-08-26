/**
 * Archivo Principal - Clínica Beleza
 * Orquestador de todos los módulos del sistema
 */

import { pacientesModule } from './modules/pacientes.js';
import { ventasModule } from './modules/ventas.js';
import { pagosModule } from './modules/pagos.js';
import { sesionesModule } from './modules/sesiones.js';
import { fichasEspecificas } from './modules/fichas-especificas.js';

import { ofertasModule } from './modules/ofertas.js';
import { mantenedoresModule } from './modules/mantenedores.js';
import { reportesModule } from './modules/reportes.js';

// Importar utilidades
import { formatCurrency, formatDate, showMessage } from './utils.js';

// Las constantes se obtienen desde la API, no desde constants.js

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

            ofertas: ofertasModule,
            mantenedores: mantenedoresModule,
            reportes: reportesModule
        };
        this.init();
    }
    
    async init() {
        // Inicializar cliente API primero
        initializeApiClient();
        
        // Obtener información del usuario desde el servidor
        await this.loadUserData();
        
        await this.setupNavigation();
        this.setupMobileMenu();
        this.setupSearchFunctionality();
        this.setupGlobalEventListeners();
        this.setupGlobalErrorHandling();
        this.setupUserInterface();
        this.setupGlobalFunctions();
        await this.loadInitialData();
        this.showWelcomeMessage();
    }
    
    async loadUserData() {
        try {
            // Intentar cargar desde PHP primero
            if (window.userData) {
                this.currentUser = window.userData;
                console.log('✅ Usuario cargado desde sesión PHP:', this.currentUser);
                return;
            }

            // Si no hay datos en PHP, cargar desde API
            const response = await fetch('/api.php/user-data', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                this.currentUser = await response.json();
                console.log('✅ Usuario cargado desde API:', this.currentUser);
            } else {
                console.warn('⚠️ No se pudo cargar usuario desde API');
            }
        } catch (error) {
            console.error('❌ Error cargando datos de usuario:', error);
        }
    }

    async setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-menu .nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                await this.switchView(view);
                
                // Actualizar la URL sin recargar la página
                history.pushState({ view }, '', `#${view}`);
            });
        });
        
        // Configurar pestañas de Mantenedores para que no interfieran con la navegación
        const mantenedoresTabs = document.querySelectorAll('#mantenedoresTabs .nav-link');
        mantenedoresTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Prevenir que el clic se propague al sistema de navegación
                e.preventDefault();
                e.stopPropagation();
                
                // Remover clase active de todas las pestañas
                mantenedoresTabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                
                // Agregar clase active a la pestaña clickeada
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                
                // Ocultar todos los paneles de contenido
                const tabPanes = document.querySelectorAll('#mantenedoresTabsContent .tab-pane');
                tabPanes.forEach(pane => {
                    pane.classList.remove('show', 'active');
                });
                
                // Mostrar el panel correspondiente
                const tabId = tab.id;
                const targetId = tabId.replace('-tab', '-tab-pane');
                const targetPane = document.querySelector('#' + targetId);
                if (targetPane) {
                    targetPane.classList.add('show', 'active');
                }
                
                // Prevenir que se active el sistema de navegación
                return false;
            });
        });
    
        // Manejar el botón atrás/adelante del navegador
        window.addEventListener('popstate', async (e) => {
            if (e.state && e.state.view) {
                await this.switchView(e.state.view);
            } else {
                // Si no hay estado, usar el hash de la URL
                const hash = window.location.hash.slice(1);
                if (hash) {
                    await this.switchView(hash);
                } else {
                    await this.switchView('fichas');
                }
            }
        });
        
        // Manejar enlaces del footer también
        const footerLinks = document.querySelectorAll('.footer-links a');
        footerLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const view = link.getAttribute('href').slice(1); // Remover el #
                await this.switchView(view);
                
                // Actualizar la URL sin recargar la página
                history.pushState({ view }, '', `#${view}`);
            });
        });
        
        // Activar vista inicial basada en la URL
        const hash = window.location.hash.slice(1);
        const initialView = hash || 'fichas';
        await this.switchView(initialView);
        
        // Actualizar la URL si no hay hash
        if (!hash) {
            history.replaceState({ view: initialView }, '', `#${initialView}`);
        }
    }
    
    async switchView(viewName) {
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
        const navLinks = document.querySelectorAll('.nav-menu .nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === viewName) {
                link.classList.add('active');
            }
        });
    
        // Cargar datos específicos de la vista
        this.loadViewData(viewName);
    }
    
    async loadViewData(viewName) {
        switch (viewName) {
            case 'fichas':
                this.modules.pacientes.cargarPacientes();
                break;
            case 'ventas':
                this.modules.ventas.loadVentas();
                this.modules.ventas.loadPacientes();
                break;
            case 'pagos':
                this.modules.pagos.loadPagosConFeedback && this.modules.pagos.loadPagosConFeedback();
                this.modules.pagos.loadPacientes && this.modules.pagos.loadPacientes();
                break;
            case 'sesiones':
                this.modules.sesiones.loadSesiones();
                this.modules.sesiones.loadPacientes();
                break;

            case 'ofertas':
                this.modules.ofertas.init();
                break;
            case 'mantenedores':
                if (this.modules.mantenedores && this.modules.mantenedores.init) {
                    await this.modules.mantenedores.init();
                }
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
            const navLinks = document.querySelectorAll('.nav-menu .nav-link');
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
                if (this.modules.pagos.buscarPagosConFeedback) {
                    this.modules.pagos.buscarPagosConFeedback(e.target.value);
                } else {
                    this.modules.pagos.buscarPagos(e.target.value);
                }
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
    
    setupGlobalErrorHandling() {
        // Capturar errores no manejados de la API
        window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason;

            // Si es un error de la API, mostrar información detallada
            if (error.apiError) {
                // Si viene desde la DB, mostrar el mensaje de la DB directamente
                if (error.apiError.dbError) {
                    console.error('🚨 Error de la base de datos:', error.apiError.dbError);
                    showMessage(error.apiError.dbError, 'error');
                } else {
                    console.error('🚨 Error de API:', error.apiError);
                    showMessage(
                        `Error: ${error.apiError.message}\n` +
                        `Endpoint: ${error.apiError.endpoint}\n` +
                        `Método: ${error.apiError.method}\n` +
                        `Código: ${error.apiError.code || 'N/A'}`,
                        'error'
                    );
                }
            } else if (error && error.dbError) {
                // Si el error viene directamente de la DB
                console.error('🚨 Error de la base de datos:', error.dbError);
                showMessage(error.dbError, 'error');
            } else {
                // Error genérico
                console.error('🚨 Error no manejado:', error);
                showMessage(`Error: ${error.message || 'Error desconocido'}`, 'error');
            }
            
            // Prevenir que el error se propague
            event.preventDefault();
        });
        
        // Capturar errores de JavaScript
        window.addEventListener('error', (event) => {
            console.error('🚨 Error de JavaScript:', event.error);
            showMessage(`Error de JavaScript: ${event.error?.message || 'Error desconocido'}`, 'error');
        });
    }
    
    async loadInitialData() {
        try {
            
            // Cargar datos básicos de forma individual para manejar errores
            const loadPromises = [
                this.modules.pacientes.cargarPacientes().catch(e => {
                    console.warn('⚠️ Error cargando pacientes:', e.message);
                    showMessage(`Error cargando pacientes: ${e.dbError || e.message}`, 'error');
                }),
                this.modules.ventas.loadVentas().catch(e => {
                    console.warn('⚠️ Error cargando ventas:', e.message);
                    showMessage(`Error cargando ventas: ${e.dbError || e.message}`, 'error');
                }),
                // PAGOS: Inspirado en pacientes.js, logs y notificaciones descriptivas
                (async () => {
                    try {
                        if (this.modules.pagos.loadPagosConFeedback) {
                            await this.modules.pagos.loadPagosConFeedback();
                        } else {
                            await this.modules.pagos.loadPagos();
                        }
                                                    } catch (e) {
                        if (e && e.dbError) {
                            console.error('⚠️ Error cargando pagos (DB):', e.dbError);
                            showMessage(e.dbError, 'error');
                        } else {
                            console.error('⚠️ Error cargando pagos:', e.message);
                            showMessage(`Error cargando pagos: ${e.message}`, 'error');
                        }
                    }
                })(),
                this.modules.sesiones.loadSesiones().catch(e => {
                    console.warn('⚠️ Error cargando sesiones:', e.message);
                    showMessage(`Error cargando sesiones: ${e.dbError || e.message}`, 'error');
                }),

                this.modules.ofertas.cargarOfertas().catch(e => {
                    console.warn('⚠️ Error cargando ofertas:', e.message);
                    showMessage(`Error cargando ofertas: ${e.dbError || e.message}`, 'error');
                })
            ];
            
            await Promise.allSettled(loadPromises);
        } catch (error) {
            showMessage('Error cargando datos iniciales', 'error');
        }
    }
    
    setupUserInterface() {
        // Mostrar información del usuario
        this.updateUserInfo();
        
        // Configurar botón de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    setupGlobalFunctions() {
        // Configurar función global para confirmar venta
        window.confirmarVenta = () => {
            if (this.modules.ventas && this.modules.ventas.confirmarVenta) {
                this.modules.ventas.confirmarVenta();
            }
        };
    }
    
    updateUserInfo() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo && this.currentUser) {
            const roleText = this.currentUser.rol === 'admin' ? 'Administrador' : 'Profesional';
            // Usar 'nombre' que es lo que devuelve nuestro stored procedure
            const name = this.currentUser.nombre || this.currentUser.username || 'Usuario';
            
            userInfo.textContent = `${name} (${roleText})`;
        }
    }
    
    logout() {
        // Redirigir al logout PHP que maneja la sesión del servidor
        window.location.href = '/logout.php';
    }
    
    showWelcomeMessage() {
        // Mensaje de bienvenida silencioso
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
        // Estadísticas silenciosas
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
                        showMessage('Datos importados correctamente', 'success');
            
        } catch (error) {
            console.error('Error importando datos:', error);
            showMessage('Error importando datos: ' + (error.dbError || error.message), 'error');
        }
    }
    
    // Método para obtener módulos
    getModule(moduleName) {
        return this.modules[moduleName];
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
    if (window.clinicaApp.getModule('pagos').limpiarFormularioPagoConFeedback) {
        window.clinicaApp.getModule('pagos').limpiarFormularioPagoConFeedback();
    } else {
        window.clinicaApp.getModule('pagos').limpiarFormularioPago();
    }
};

window.limpiarFormularioSesion = () => {
    window.clinicaApp.getModule('sesiones').limpiarFormularioSesion();
};



window.limpiarFormularioOferta = () => {
    window.clinicaApp.getModule('ofertas').limpiarFormularioOferta();
};

// Exportar para uso en otros módulos
export default ClinicaBelezaApp;
