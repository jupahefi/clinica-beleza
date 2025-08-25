# Clínica Beleza - Sistema de Gestión Integral

Sistema completo de gestión para clínica estética desarrollado con arquitectura cliente-servidor, base de datos MySQL y frontend moderno con JavaScript vanilla.

## 🏥 Funcionalidades Principales

### 👥 Gestión de Pacientes
- **Fichas completas**: Datos personales, contacto, historial médico
- **Fichas específicas**: Depilación, corporal/facial con formularios especializados
- **Historial de tratamientos**: Seguimiento completo de cada paciente
- **Búsqueda y filtros**: Búsqueda por nombre, teléfono, email

### 💰 Sistema de Ventas
- **Catálogo de tratamientos**: Precios regulares y ofertas
- **Sistema de ofertas**: Descuentos por sesión con fechas de vigencia
- **Packs de tratamientos**: Múltiples sesiones con descuentos
- **Cálculo automático**: Precios con ofertas aplicables

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
- **Servidor web**: Apache/Nginx con PHP 7.4+
- **Base de datos**: MySQL 5.7+ o MariaDB 10.2+
- **Navegador**: Chrome, Firefox, Safari, Edge (modernos)

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/jupahefi/clinica-beleza.git
   cd clinica-beleza
   ```

2. **Configurar la base de datos**
   - Crear base de datos MySQL
   - Importar `docs/migracion_clinica_mysql.sql`
   - Configurar credenciales en `database/Database.php`

3. **Configurar el servidor web**
   - Apuntar el document root al directorio del proyecto
   - Asegurar que PHP tenga permisos de escritura

4. **Personalizar la marca**
   - Reemplazar `logo.png` con el logo de la clínica
   - Ajustar colores en `styles.css` (variables CSS)

5. **Acceder al sistema**
   - Abrir `index.html` en el navegador
   - Usar credenciales por defecto o crear nuevo usuario

## 📁 Estructura del Proyecto

```
clinica-beleza/
├── index.html                 # Página principal
├── login.html                 # Página de login
├── styles.css                 # Estilos globales
├── logo.png                   # Logo de la clínica
├── api.php                    # API REST principal
├── database/
│   └── Database.php           # Clase de conexión a BD
├── js/
│   ├── main.js                # Orquestador principal
│   ├── api-client.js          # Cliente HTTP para API
│   ├── utils.js               # Utilidades compartidas
│   ├── constants.js           # Constantes del sistema
│   ├── env.js                 # Configuración de entorno
│   ├── calendar.js            # Componente de calendario
│   ├── calendar.css           # Estilos del calendario
│   └── modules/
│       ├── pacientes.js       # Gestión de pacientes
│       ├── ventas.js          # Sistema de ventas
│       ├── pagos.js           # Gestión de pagos
│       ├── sesiones.js        # Control de sesiones
│       ├── ofertas.js         # Sistema de ofertas
│       ├── reportes.js        # Reportes y analytics
│       └── fichas-especificas.js # Fichas especializadas
├── docs/
│   ├── migracion_clinica_mysql.sql  # Script de BD
│   ├── BusinessRules.csv      # Reglas de negocio
│   ├── DataModel.csv          # Modelo de datos
│   ├── UserStories.csv        # Historias de usuario
│   └── AcceptanceCriteria.csv # Criterios de aceptación
└── test-*.php                 # Scripts de prueba
```

## 🏗️ Arquitectura Técnica

### Backend (PHP + MySQL)
- **API REST**: Endpoints para todas las operaciones CRUD
- **Stored Procedures**: Lógica de negocio centralizada en la BD
- **Validaciones**: Reglas de negocio en capa de datos
- **Manejo de errores**: Errores descriptivos desde MySQL
- **Seguridad**: Contraseñas hasheadas con bcrypt

### Frontend (Vanilla JavaScript)
- **Arquitectura modular**: Módulos ES6 con responsabilidades separadas
- **Componentes reutilizables**: Calendario, formularios, modales
- **Gestión de estado**: Estado local por módulo
- **Validaciones**: Validaciones en tiempo real
- **Responsive design**: CSS Grid y Flexbox

### Base de Datos (MySQL)
- **Normalización**: Estructura optimizada para consultas
- **Índices**: Optimización para búsquedas frecuentes
- **Triggers**: Automatización de operaciones
- **Soft deletes**: Mantenimiento de integridad referencial

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

### Accesibilidad
- **Navegación por teclado**: Tab navigation completa
- **Contraste**: Colores optimizados para legibilidad
- **Semántica**: HTML5 con estructura semántica

## 🔒 Seguridad y Privacidad

### Autenticación
- **Login seguro**: Validación de credenciales
- **Sesiones**: Control de acceso por sesión
- **Logout**: Limpieza de datos de sesión

### Protección de Datos
- **Validación**: Input sanitization en frontend y backend
- **SQL Injection**: Prevención con prepared statements
- **XSS**: Escape de datos en salida

### Cumplimiento
- **GDPR**: Control de datos personales
- **Auditoría**: Logs de todas las operaciones
- **Backup**: Estrategia de respaldo de datos

## 📊 Monitoreo y Debugging

### Logs del Sistema
- **Console logs**: Debugging detallado en desarrollo
- **Notificaciones**: Feedback descriptivo para usuarios
- **Errores de BD**: Mensajes nativos de MySQL

### Herramientas de Desarrollo
- **Test scripts**: Validación de endpoints
- **Documentación**: Reglas de negocio y modelo de datos
- **Versionado**: Git con commits descriptivos

## 🚧 Estado del Proyecto

### ✅ Completado
- Arquitectura base completa
- CRUD de pacientes, ventas, pagos, sesiones
- Sistema de calendario funcional
- Validaciones y reglas de negocio
- Interfaz responsive

### 🔄 En Desarrollo
- Fase de pruebas y refinamiento
- Optimización de performance
- Limpieza de logs de desarrollo
- Documentación de API

### 📋 Próximas Funcionalidades
- Dashboard con métricas
- Exportación de reportes
- Integración con sistemas externos
- App móvil

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
- **Documentación**: Carpeta `docs/` con especificaciones
- **Contacto**: Desarrollador principal para consultas técnicas

---

**Clínica Beleza** - Sistema de gestión estética profesional y moderno

*Desarrollado con ❤️ usando tecnologías web estándar*
