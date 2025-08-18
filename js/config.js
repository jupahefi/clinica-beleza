/**
 * Configuración central del sistema
 * Contiene todos los tratamientos disponibles y sus propiedades
 */

export const TRATAMIENTOS_CONFIG = {
  "DEPILACION": {
    nombre: "Depilación",
    precioSesion: 35000,
    precioSesionOferta: 30000,
    duracionSesion: 60,
    frecuenciaSugerida: 30,
    packs: [
      { nombre: "Full Body 6 sesiones", precio: 180000, oferta: 150000 },
      { nombre: "Full Body 12 sesiones", precio: 350000, oferta: 280000 }
    ]
  },
  "LIMPIEZA_FACIAL": {
    nombre: "Limpieza Facial",
    precioSesion: 25000,
    precioSesionOferta: null,
    duracionSesion: 45,
    frecuenciaSugerida: 21,
    packs: [
      { nombre: "Pack 4 sesiones", precio: 90000, oferta: null }
    ]
  },
  "CORPORAL": {
    nombre: "Tratamiento Corporal",
    precioSesion: 40000,
    precioSesionOferta: 35000,
    duracionSesion: 90,
    frecuenciaSugerida: 14,
    packs: [
      { nombre: "Corporal + Glúteos", precio: 300000, oferta: 250000 },
      { nombre: "Corporal Abdomen + Meso", precio: 350000, oferta: 299000 }
    ]
  },
  "BOTOX": {
    nombre: "Botox",
    precioSesion: 180000,
    precioSesionOferta: null,
    duracionSesion: 30,
    frecuenciaSugerida: 120,
    packs: []
  },
  "HIFU": {
    nombre: "HIFU",
    precioSesion: 120000,
    precioSesionOferta: 100000,
    duracionSesion: 60,
    frecuenciaSugerida: 30,
    packs: [
      { nombre: "HIFU Facial + Papada", precio: 200000, oferta: null }
    ]
  },
  "RADIOFRECUENCIA": {
    nombre: "Radiofrecuencia",
    precioSesion: 35000,
    precioSesionOferta: null,
    duracionSesion: 45,
    frecuenciaSugerida: 7,
    packs: [
      { nombre: "RF Pack 8 sesiones", precio: 240000, oferta: 200000 }
    ]
  },
  "PEELING": {
    nombre: "Peeling",
    precioSesion: 45000,
    precioSesionOferta: null,
    duracionSesion: 60,
    frecuenciaSugerida: 21,
    packs: []
  },
  "BBGLOW": {
    nombre: "BB Glow",
    precioSesion: 55000,
    precioSesionOferta: 50000,
    duracionSesion: 75,
    frecuenciaSugerida: 14,
    packs: [
      { nombre: "BB Glow Pack 4 sesiones", precio: 200000, oferta: 180000 }
    ]
  },
  "PLASMA_PRP": {
    nombre: "Plasma Rico en Plaquetas",
    precioSesion: 85000,
    precioSesionOferta: null,
    duracionSesion: 45,
    frecuenciaSugerida: 30,
    packs: [
      { nombre: "PRP Pack 3 sesiones", precio: 240000, oferta: 210000 }
    ]
  },
  "MESOTERAPIA": {
    nombre: "Mesoterapia",
    precioSesion: 60000,
    precioSesionOferta: 55000,
    duracionSesion: 30,
    frecuenciaSugerida: 7,
    packs: [
      { nombre: "Meso Pack 6 sesiones", precio: 320000, oferta: 280000 }
    ]
  }
};

/**
 * Configuración de métodos de pago disponibles
 */
export const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" }
];

/**
 * Tipos de piel para depilación
 */
export const TIPOS_PIEL = [
  { value: "I", label: "Tipo I - Muy clara, siempre se quema" },
  { value: "II", label: "Tipo II - Clara, se quema fácilmente" },
  { value: "III", label: "Tipo III - Ligeramente morena" },
  { value: "IV", label: "Tipo IV - Morena clara" },
  { value: "V", label: "Tipo V - Morena" },
  { value: "VI", label: "Tipo VI - Muy morena/negra" }
];

/**
 * Zonas de tratamiento corporal/facial
 */
export const ZONAS_TRATAMIENTO = [
  { value: "facial", label: "Facial" },
  { value: "corporal-abdomen", label: "Corporal - Abdomen" },
  { value: "corporal-gluteos", label: "Corporal - Glúteos" },
  { value: "corporal-brazos", label: "Corporal - Brazos" },
  { value: "corporal-piernas", label: "Corporal - Piernas" },
  { value: "corporal-completo", label: "Corporal - Completo" }
];

/**
 * Estados posibles de las entidades del sistema
 */
export const ESTADOS = {
  VENTA: {
    PENDIENTE: 'pendiente',
    COMPLETADA: 'completada',
    CANCELADA: 'cancelada'
  },
  PAGO: {
    PENDIENTE: 'pendiente',
    PAGADO: 'pagado'
  },
  SESION: {
    AGENDADA: 'agendada',
    CONFIRMADA: 'confirmada',
    EN_CURSO: 'en_curso',
    COMPLETADA: 'completada',
    CANCELADA: 'cancelada'
  }
};

/**
 * Configuración de Google Calendar
 * Las credenciales se cargan dinámicamente desde variables de entorno
 */
export const GOOGLE_CALENDAR_CONFIG = {
  API_KEY: null, // Se carga dinámicamente desde ENV
  CLIENT_ID: null, // Se carga dinámicamente desde ENV
  CALENDAR_NAME: 'sesiones', // Nombre del calendario específico para sesiones
  CALENDAR_ID: null, // Se establecerá dinámicamente al encontrar/crear el calendario
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  USE_API_KEY_ONLY: true
};

/**
 * Configuración de boxes/salas
 */
export const BOXES_CONFIG = [
  { id: 1, nombre: 'Box 1', disponible: true },
  { id: 2, nombre: 'Box 2', disponible: true },
  { id: 3, nombre: 'Box 3', disponible: true }
];

/**
 * Configuración de la aplicación que se carga dinámicamente
 */
export const APP_CONFIG = {
  CLINIC_NAME: 'Clínica Beleza',
  CLINIC_EMAIL: '',
  CLINIC_PHONE: '',
  APP_URL: '',
  API_URL: '',
  TIMEZONE: 'America/Santiago',
  CACHE_ENABLED: true,
  CACHE_DURATION: 3600
};

/**
 * Inicializa las configuraciones con las variables de entorno
 * @param {Object} envConfig - Configuración de entorno cargada
 */
export function initializeConfig(envConfig) {
  // Configurar Google Calendar
  GOOGLE_CALENDAR_CONFIG.API_KEY = envConfig.GOOGLE_CALENDAR_API_KEY || '';
  GOOGLE_CALENDAR_CONFIG.CLIENT_ID = envConfig.GOOGLE_CLIENT_ID || '';
  
  // Configurar aplicación
  APP_CONFIG.CLINIC_NAME = envConfig.CLINIC_NAME || 'Clínica Beleza';
  APP_CONFIG.CLINIC_EMAIL = envConfig.CLINIC_EMAIL || '';
  APP_CONFIG.CLINIC_PHONE = envConfig.CLINIC_PHONE || '';
  APP_CONFIG.APP_URL = envConfig.APP_URL || window.location.origin;
  APP_CONFIG.API_URL = envConfig.API_URL || window.location.origin + '/api';
  APP_CONFIG.TIMEZONE = envConfig.TIMEZONE || 'America/Santiago';
  APP_CONFIG.CACHE_ENABLED = envConfig.ENABLE_CACHE === 'true';
  APP_CONFIG.CACHE_DURATION = parseInt(envConfig.CACHE_DURATION) || 3600;
  
  console.log('✅ Configuración inicializada con variables de entorno');
}

/**
 * Verifica si las configuraciones críticas están disponibles
 * @returns {Object} Estado de la configuración
 */
export function validateConfig() {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  // Verificar Google Calendar
  if (!GOOGLE_CALENDAR_CONFIG.API_KEY) {
    validation.warnings.push('Google Calendar API Key no configurada');
  }
  
  if (!GOOGLE_CALENDAR_CONFIG.CLIENT_ID) {
    validation.warnings.push('Google Client ID no configurado');
  }
  
  // Verificar configuración de la clínica
  if (!APP_CONFIG.CLINIC_NAME) {
    validation.errors.push('Nombre de la clínica no configurado');
    validation.isValid = false;
  }
  
  return validation;
}
