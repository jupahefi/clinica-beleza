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
        // Verificar autenticación primero
        if (!this.checkAuthentication()) {
            window.location.href = '/login.html';
            return;
        }

        // Inicializar cliente API primero
        initializeApiClient();
        
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
    
    checkAuthentication() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        console.log('🔍 Verificando autenticación...');
        console.log('Token:', token ? 'Presente' : 'Ausente');
        console.log('UserData:', userData);
        
        if (!token || !userData) {
            console.log('❌ No hay token o userData');
            return false;
        }
        
        try {
            const user = JSON.parse(userData);
            console.log('👤 Usuario parseado:', user);
            
            // Verificar que el usuario tenga un rol válido
            if (!user.rol) {
                console.log('❌ Usuario sin rol válido');
                return false;
            }
            
            // Verificar que el usuario esté activo (si el campo existe)
            if (user.hasOwnProperty('activo') && !user.activo) {
                console.log('❌ Usuario inactivo');
                return false;
            }
            
            // Guardar datos del usuario en la aplicación
            this.currentUser = user;
            this.currentUser.profesional = JSON.parse(localStorage.getItem('profesionalData') || 'null');
            
            console.log('✅ Autenticación exitosa');
            return true;
        } catch (error) {
            console.error('❌ Error verificando autenticación:', error);
            return false;
        }
    }

    async setupNavigation() {
        console.log('🧭 Configurando navegación...');
        const navLinks = document.querySelectorAll('.nav-link');
        console.log('🔗 Enlaces encontrados:', navLinks.length);
        navLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                console.log('🖱️ Clic en enlace:', view);
                await this.switchView(view);
                
                // Actualizar la URL sin recargar la página
                history.pushState({ view }, '', `#${view}`);
                console.log('📍 URL actualizada:', window.location.hash);
            });
        });
        
        // Configurar pestañas de Mantenedores para que no interfieran con la navegación
        const mantenedoresTabs = document.querySelectorAll('#mantenedoresTabs .nav-link');
        mantenedoresTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Prevenir que el clic se propague al sistema de navegación
                e.stopPropagation();
                
                // Permitir que Bootstrap maneje las pestañas normalmente
                // Solo prevenir que se active nuestro sistema de navegación
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
        console.log(`🔄 Cambiando a vista: ${viewName}`);
        
        // Ocultar todas las vistas
        const views = document.querySelectorAll('.view-section');
        console.log('📋 Vistas encontradas:', views.length);
        views.forEach(view => {
            view.classList.remove('active');
            console.log('👁️ Vista oculta:', view.id);
        });
        
        // Mostrar vista seleccionada
        const targetView = document.getElementById(viewName);
        console.log('🎯 Vista objetivo:', targetView);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            console.log(`✅ Vista ${viewName} activada`);
        } else {
            console.error(`❌ Vista ${viewName} no encontrada`);
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
    
    async loadViewData(viewName) {
        console.log(`📊 Cargando datos para vista: ${viewName}`);
        switch (viewName) {
            case 'fichas':
                console.log('📋 Cargando datos de fichas...');
                this.modules.pacientes.cargarPacientes();
                break;
            case 'ventas':
                console.log('💰 Cargando datos de ventas...');
                this.modules.ventas.loadVentas();
                this.modules.ventas.loadPacientes();
                break;
            case 'pagos':
                console.log('💳 Cargando datos de pagos...');
                this.modules.pagos.loadPagosConFeedback && this.modules.pagos.loadPagosConFeedback();
                this.modules.pagos.loadPacientes && this.modules.pagos.loadPacientes();
                break;
            case 'sesiones':
                console.log('📅 Cargando datos de sesiones...');
                this.modules.sesiones.loadSesiones();
                this.modules.sesiones.loadPacientes();
                break;

            case 'ofertas':
                console.log('🎯 Cargando datos de ofertas...');
                this.modules.ofertas.init();
                break;
            case 'mantenedores':
                console.log('🔧 Cargando datos de mantenedores...');
                if (this.modules.mantenedores && this.modules.mantenedores.init) {
                    await this.modules.mantenedores.init();
                } else {
                    console.error('❌ Módulo de mantenedores no disponible');
                }
                break;
            case 'reportes':
                console.log('📊 Cargando datos de reportes...');
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
            console.log('🔄 Cargando datos iniciales...');
            
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
                        console.log('✅ Pagos cargados correctamente');
                        showMessage('Pagos cargados correctamente', 'success');
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
            
            console.log('✅ Datos iniciales cargados (con errores manejados)');
        } catch (error) {
            console.error('❌ Error crítico cargando datos iniciales:', error);
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
            const name = this.currentUser.profesional ? 
                `${this.currentUser.profesional.nombre} ${this.currentUser.profesional.apellidos}` : 
                this.currentUser.username;
            
            userInfo.textContent = `${name} (${roleText})`;
        }
    }
    
    logout() {
        // Limpiar datos de sesión
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('profesionalData');
        
        // Redirigir al login
        window.location.href = '/login.html';
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
            // Obtener datos actualizados de cada módulo
            const pacientes = this.modules.pacientes.pacientes || [];
            const ventas = this.modules.ventas?.ventas || [];
            const pagos = this.modules.pagos?.pagos || [];
            const sesiones = this.modules.sesiones?.sesiones || [];
            
            const stats = {
                pacientes: pacientes.length,
                ventas: ventas.length,
                pagos: pagos.length,
                sesiones: sesiones.length
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
    console.log('🚀 DOM cargado, inicializando aplicación...');
    window.clinicaApp = new ClinicaBelezaApp();
    
    // Hacer disponible globalmente para debugging
    window.app = window.clinicaApp;
    
    console.log('✅ Aplicación inicializada:', window.clinicaApp);
    
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
