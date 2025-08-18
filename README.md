# Clínica Beleza - Sistema de Gestión

Sistema integral de gestión para clínica estética desarrollado con arquitectura modular y principios KISS/DRY.

## 🏥 Funcionalidades

- **Gestión de Pacientes**: Fichas generales y específicas (depilación, corporal/facial)
- **Sistema de Ventas**: Tratamientos, packs y ofertas
- **Gestión de Pagos**: Múltiples métodos y pagos parciales
- **Control de Sesiones**: Inicio, término y agendamiento
- **Sistema de Ofertas**: Descuentos y promociones con fechas
- **Historial Completo**: Seguimiento de todas las operaciones

## 🚀 Instalación

1. Clona el repositorio
2. Coloca tu logo como `logo.png` en la raíz del proyecto
3. Abre `index.html` en un navegador
4. ¡Listo! El sistema funciona completamente offline

## 📁 Estructura del Proyecto

```
clinica-beleza/
├── index.html              # Estructura principal
├── styles.css              # Estilos globales
├── logo.png               # Logo de la clínica (agregar)
└── js/
    ├── config.js           # Configuración central
    ├── utils.js            # Utilidades compartidas
    ├── storage.js          # Gestión de datos
    ├── main.js             # Orquestador principal
    └── modules/
        ├── pacientes.js    # Módulo de pacientes
        ├── ventas.js       # Módulo de ventas
        ├── pagos.js        # Módulo de pagos
        └── sesiones.js     # Módulo de sesiones
```

## 🎨 Logo y Branding

### Especificaciones del Logo

- **Archivo**: `logo.png` en la raíz del proyecto
- **Tamaño recomendado**: 200x200px mínimo
- **Formato**: PNG con fondo transparente
- **Uso**: Se muestra en header (40px altura) y como favicon

### Vista Previa en Redes Sociales

El sistema está configurado con metadatos Open Graph para mostrar vista previa en:
- WhatsApp
- Facebook
- Twitter
- LinkedIn
- Otras redes sociales

## 🔧 Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Arquitectura**: Módulos ES6, separación de responsabilidades
- **Almacenamiento**: localStorage (sin base de datos)
- **Compatibilidad**: Navegadores modernos

## 📱 Responsive Design

- ✅ Desktop (1200px+)
- ✅ Tablet (768px - 1199px)
- ✅ Mobile (320px - 767px)

## 🌐 SEO y Metadatos

Configurado con:
- Meta description optimizada
- Open Graph para redes sociales
- Twitter Cards
- Favicon personalizado
- Estructura semántica HTML5

## 💾 Características Técnicas

- **Sin dependencias externas**
- **Almacenamiento local automático**
- **Validaciones en tiempo real**
- **Interfaz moderna con glassmorphism**
- **Arquitectura modular escalable**

## 🔒 Privacidad

- Todos los datos se almacenan localmente
- Sin conexión a servidores externos
- GDPR compliant por diseño
- Control total de la información

## 📞 Soporte

Para soporte técnico o personalizaciones, contacta al desarrollador.

---

**Clínica Beleza** - Sistema de gestión estética profesional
