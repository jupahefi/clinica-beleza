# 🏥 Clínica Beleza - Sistema de Gestión Integral

Sistema completo de gestión para clínica estética desarrollado con **arquitectura de datos primero**, **vanilla JavaScript** y **stored procedures centralizados**. Desplegado en producción con performance optimizada y deployment automatizado.

## 🚀 Estado del Proyecto

### ✅ **En Producción**
- **Performance**: 268ms finalizar, 158ms carga, 142ms DOM
- **Tiempo de desarrollo**: 7 días (18-25 de agosto 2025)
- **Zero dependencias externas** - Solo vanilla JS y PHP nativo
- **Deployment automatizado** - Scripts de producción

### 🏗️ **Arquitectura Destacada**
- **Modelo de datos primero**: Diseño completo antes del código
- **API passthrough**: Proxy transparente hacia MySQL
- **Stored procedures únicos**: Toda lógica de negocio en BD
- **Vanilla JavaScript**: Sin frameworks, aprendizaje puro
- **Seguridad robusta**: Bcrypt + stored procedures + validaciones multi-capa

## 🏥 Funcionalidades Principales

### 👥 Gestión de Pacientes
- **Fichas completas**: Datos personales, contacto, historial médico
- **Fichas específicas**: Depilación, corporal/facial con formularios especializados
- **Historial de tratamientos**: Seguimiento completo de cada paciente
- **Búsqueda y filtros**: Búsqueda por nombre, teléfono, email
- **Firma digital**: Consentimientos informados con SignaturePad

### 💰 Sistema de Ventas
- **Catálogo de tratamientos**: Precios regulares y ofertas
- **Sistema de ofertas**: Descuentos por sesión con fechas de vigencia
- **Packs de tratamientos**: Múltiples sesiones con descuentos
- **Cálculo automático**: Precios con ofertas aplicables
- **Estados de venta**: Pendiente pago / Pagada (automático para $0)

### 💳 Gestión de Pagos
- **Múltiples métodos**: Efectivo, tarjeta, transferencia
- **Pagos parciales**: Registro de pagos por sesión
- **Estados de venta**: Pendiente pago / Pagada
- **Historial de pagos**: Seguimiento completo de transacciones

### 📅 Control de Sesiones
- **Calendario interactivo**: Vistas de día, semana y mes
- **Horario de atención**: 9 AM - 8 PM configurable
- **Estados de sesión**: Planificada, confirmada, en curso, completada, cancelada
- **Duración real**: Cálculo basado en minutos desde la base de datos
- **Agendamiento visual**: Click en slots para crear sesiones

### 📊 Reportes y Analytics
- **Reportes de ventas**: Por período, tratamiento, profesional
- **Estadísticas de pacientes**: Frecuencia, tratamientos más solicitados
- **Análisis de pagos**: Métodos preferidos, pagos pendientes

## 🚀 Instalación y Configuración

### Requisitos del Sistema
- **Servidor web**: Nginx con PHP 8.4+
- **Base de datos**: MySQL 8.0+
- **Navegador**: Chrome, Firefox, Safari, Edge (modernos)

### Deployment Automatizado

El proyecto incluye scripts de deployment que automatizan todo el proceso de instalación y configuración del sistema en producción.

### Deployment Manual

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/jupahefi/clinica-beleza.git
   cd clinica-beleza
   ```

2. **Configurar servidor (VPS Vultr + EasyEngine)**
   - VPS con EasyEngine + Docker
   - SSL con Let's Encrypt auto-renovación
   - Nginx proxy con configuración personalizada

3. **Configurar la base de datos**
   - Crear base de datos MySQL
   - Importar `docs/migracion_clinica_mysql.sql`
   - Configurar credenciales de conexión

4. **Personalizar la marca**
   - Reemplazar `logo.png` con el logo de la clínica
   - Ajustar colores en `styles.css` (variables CSS)

5. **Acceder al sistema**
   - Abrir URL del sitio en el navegador
   - Usar credenciales de administrador

## 📁 Estructura del Proyecto

```
clinica-beleza/
├── index.html                 # Página principal (70KB)
├── login.html                 # Página de login (11KB)
├── styles.css                 # Estilos globales (40KB)
├── logo.png                   # Logo de la clínica (1.7MB)
├── api.php                    # API REST principal (46KB)

├── dev-tools.js              # Herramientas de desarrollo (2.6KB)
├── sw.js                     # Service Worker (1.7KB)
├── site.webmanifest          # Manifest PWA (715B)
├── .gitignore                # Archivos ignorados por Git
├── database/
│   ├── Database.php           # Clase de conexión a BD (10KB)
│   └── migracion_clinica_mysql.sql  # Script de BD (154KB)
├── js/
│   ├── main.js                # Orquestador principal (21KB)
│   ├── api-client.js          # Cliente HTTP para API (18KB)
│   ├── utils.js               # Utilidades compartidas (18KB)
│   ├── constants.js           # Constantes del sistema (769B)
│   ├── env.js                 # Configuración de entorno (2.9KB)
│   ├── calendar.js            # Componente de calendario (34KB)
│   ├── calendar.css           # Estilos del calendario (15KB)
│   ├── components/
│   │   └── SignaturePad.js    # Componente de firma digital (12KB)
│   └── modules/
│       ├── pacientes.js       # Gestión de pacientes (24KB)
│       ├── ventas.js          # Sistema de ventas (40KB)
│       ├── pagos.js           # Gestión de pagos (19KB)
│       ├── sesiones.js        # Control de sesiones (96KB)
│       ├── ofertas.js         # Sistema de ofertas (13KB)
│       ├── reportes.js        # Reportes y analytics (16KB)
│       ├── mantenedores.js    # Mantenedores del sistema (34KB)
│       └── fichas-especificas.js # Fichas especializadas (22KB)
├── docs/
│   ├── ERD.mmd                # Diagrama entidad-relación (10KB)
│   ├── migracion_clinica_mysql.sql  # Script de BD (155KB)
│   ├── BusinessRules.csv      # Reglas de negocio (1.3KB)
│   ├── DataModel.csv          # Modelo de datos (6.1KB)
│   ├── UserStories.csv        # Historias de usuario (4.8KB)
│   ├── AcceptanceCriteria.csv # Criterios de aceptación (4.0KB)
│   ├── Flows.csv              # Flujos de trabajo (1.9KB)
│   ├── modelo_clinica_plan.csv # Plan del modelo (6.2KB)
│   ├── ficha_corporal_nueva.htm # Plantilla de ficha corporal (96KB)
│   ├── ficha_corporal_antigua.htm # Plantilla de ficha corporal antigua (87KB)
│   ├── ficha_depilacion.htm   # Plantilla de ficha depilación (102KB)
│   ├── consentimiento_depilacion.htm # Consentimiento informado (70KB)
│   └── Untitled diagram _ Mermaid Chart-2025-08-19-024733.png # Diagrama ER (732KB)
└── [archivos de favicon y manifest]
    ├── favicon.ico            # Favicon principal (15KB)
    ├── favicon-16x16.png      # Favicon 16x16 (829B)
    ├── favicon-32x32.png      # Favicon 32x32 (2.3KB)
    ├── apple-touch-icon.png   # Icono Apple (47KB)
    ├── android-chrome-192x192.png # Icono Android 192x192 (53KB)
    ├── android-chrome-512x512.png # Icono Android 512x512 (314KB)
    └── browserconfig.xml      # Configuración IE (255B)
```

## 🏗️ Arquitectura Técnica

### Backend (PHP 8.4 + MySQL 8.0+)
- **API REST**: Endpoints para todas las operaciones CRUD
- **Stored Procedures**: Lógica de negocio centralizada en la BD
- **Validaciones**: Reglas de negocio en capa de datos
- **Manejo de errores**: Errores descriptivos desde MySQL
- **Seguridad**: Contraseñas hasheadas con bcrypt
- **API Passthrough**: Proxy transparente hacia MySQL

### Frontend (Vanilla JavaScript ES6+)
- **Arquitectura modular**: Módulos ES6 con responsabilidades separadas
- **Componentes reutilizables**: Calendario, formularios, modales
- **Gestión de estado**: Estado local por módulo
- **Validaciones**: Validaciones en tiempo real
- **Responsive design**: CSS Grid y Flexbox
- **Zero dependencias**: Sin frameworks externos

### Base de Datos (MySQL 8.0+)
- **Normalización**: Estructura optimizada para consultas
- **Índices**: Optimización para búsquedas frecuentes
- **Triggers**: Automatización de operaciones
- **Soft deletes**: Mantenimiento de integridad referencial
- **Stored Procedures**: Toda lógica de negocio centralizada

## 🎨 Características de UX/UI

### Diseño Responsive
- **Desktop**: Layout completo con sidebar
- **Tablet**: Adaptación de columnas
- **Mobile**: Navegación optimizada para touch

### Componentes Interactivos
- **Calendario**: Slots de tiempo configurables (1px = 1 minuto)
- **Formularios**: Validación en tiempo real con feedback
- **Modales**: Información detallada sin perder contexto
- **Notificaciones**: Sistema de toast para feedback
- **Firma digital**: Componente SignaturePad para consentimientos

### Accesibilidad
- **Navegación por teclado**: Tab navigation completa
- **Contraste**: Colores optimizados para legibilidad
- **Semántica**: HTML5 con estructura semántica

## 🔒 Seguridad y Privacidad

### Autenticación
- **Login seguro**: Validación de credenciales
- **Sesiones**: Control de acceso por sesión
- **Logout**: Limpieza de datos de sesión
- **Bcrypt**: Hashing seguro de contraseñas

### Protección de Datos
- **Validación**: Input sanitization en frontend y backend
- **SQL Injection**: Prevención con stored procedures únicos
- **XSS**: Escape de datos en salida
- **Validación multi-capa**: Frontend + Backend + Base de datos

### Cumplimiento
- **GDPR**: Control de datos personales
- **Auditoría**: Logs de todas las operaciones
- **Backup**: Estrategia de respaldo de datos

## 📊 Métricas de Performance

### Rendimiento Actual
- **Finalizar**: 268ms
- **Cargar**: 158ms
- **DOMContentLoaded**: 142ms
- **Solicitudes**: 48
- **Transferido**: 11.8 kB
- **Recursos**: 2.8 MB

### Optimizaciones Implementadas
- **Zero dependencias externas**: Solo vanilla JS
- **Stored procedures centralizados**: Menos latencia
- **API passthrough**: Proxy transparente
- **CSS optimizado**: Grid y Flexbox nativos
- **Deployment automatizado**: Proceso optimizado

## 🚧 Estado del Proyecto

### ✅ Completado
- Arquitectura base completa
- CRUD de pacientes, ventas, pagos, sesiones
- Sistema de calendario funcional
- Validaciones y reglas de negocio
- Interfaz responsive
- **Deployment en producción**
- **Performance optimizada**
- **Sistema de ofertas completo**
- **Reportes y analytics**
- **Fichas específicas especializadas**
- **Scripts de deployment automatizados**
- **Seguridad robusta implementada**

### 🔄 En Desarrollo
- **Fase de estabilización**: Pruebas en producción
- **Optimización continua**: Performance y UX
- **Documentación**: Mejora continua

### 📋 Próximas Funcionalidades
- Dashboard con métricas en tiempo real
- Exportación de reportes (PDF/Excel)
- Integración con sistemas externos
- App móvil (React Native)
- Notificaciones push

## 🤝 Contribución

### Reportar Issues
- Usar el sistema de issues de GitHub
- Incluir pasos para reproducir
- Adjuntar logs relevantes

### Desarrollo Local
- Fork del repositorio
- Crear rama para feature
- Seguir convenciones de código
- Incluir tests si aplica

## 📞 Soporte

- **Issues**: GitHub Issues para bugs y features
- **Documentación**: Carpeta `docs/` con especificaciones completas
- **Contacto**: Desarrollador principal para consultas técnicas

## 🏆 Logros del Proyecto

### Técnicos
- **9 días de desarrollo** de cero a producción
- **Zero dependencias externas** - Arquitectura pura
- **Performance optimizada** - <300ms carga completa
- **Arquitectura escalable** - Stored procedures centralizados
- **Deployment automatizado** - Scripts de producción

### Arquitectónicos
- **Modelo de datos primero** - Diseño robusto
- **API passthrough** - Simplicidad y performance
- **Vanilla JavaScript** - Aprendizaje y control total
- **Seguridad multi-capa** - Frontend + Backend + BD
- **Stored procedures únicos** - Lógica centralizada

### Seguridad
- **Sin vulnerabilidades críticas** - Auditoría completa
- **Bcrypt hashing** - Contraseñas seguras
- **Stored procedures** - Prevención de SQL injection
- **Validación multi-capa** - Robustez total

---

**Clínica Beleza** - Sistema de gestión estética profesional y moderno

*Desarrollado con ❤️ usando tecnologías web estándar y arquitectura de datos primero*
