# Configuración de Variables de Entorno

## Archivo .env

Crea un archivo `.env` en el directorio raíz del proyecto con las siguientes variables:

```env
# Configuración de la API
API_URL=http://localhost
API_TIMEOUT=10000
API_RETRIES=3

# Configuración de la base de datos (para el backend PHP)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clinica_beleza
DB_USER=postgres
DB_PASSWORD=tu_password_aqui

# Configuración de la aplicación
APP_NAME=Clínica Beleza
APP_VERSION=2.0.0
APP_ENV=development

# Configuración de seguridad
JWT_SECRET=tu_jwt_secret_aqui
SESSION_SECRET=tu_session_secret_aqui

# Configuración de logs
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Configuración de cache
CACHE_TTL=300
CACHE_ENABLED=true
```

## Variables Requeridas

### Frontend (JavaScript)
- `API_URL`: URL base de la API
- `API_TIMEOUT`: Timeout para peticiones HTTP (ms)
- `API_RETRIES`: Número de reintentos para peticiones fallidas
- `APP_NAME`: Nombre de la aplicación
- `APP_VERSION`: Versión de la aplicación
- `APP_ENV`: Entorno (development/production)
- `CACHE_TTL`: Tiempo de vida del cache (segundos)
- `CACHE_ENABLED`: Habilitar/deshabilitar cache

### Backend (PHP)
- `DB_HOST`: Host de la base de datos PostgreSQL
- `DB_PORT`: Puerto de la base de datos
- `DB_NAME`: Nombre de la base de datos
- `DB_USER`: Usuario de la base de datos
- `DB_PASSWORD`: Contraseña de la base de datos
- `JWT_SECRET`: Clave secreta para JWT
- `SESSION_SECRET`: Clave secreta para sesiones
- `LOG_LEVEL`: Nivel de logging
- `LOG_FILE`: Archivo de log

## Cómo Funciona

1. **Frontend**: El archivo `js/env.js` carga las variables de entorno desde `/api.php/config`
2. **Backend**: El archivo `api.php` lee el archivo `.env` y sirve las variables seguras al frontend
3. **Seguridad**: Solo se exponen variables seguras al frontend (no credenciales de BD)

## Configuración por Defecto

Si no existe el archivo `.env`, la aplicación usará valores por defecto:

```javascript
{
    API_URL: window.location.origin,
    API_TIMEOUT: 10000,
    API_RETRIES: 3,
    APP_NAME: 'Clínica Beleza',
    APP_VERSION: '2.0.0',
    APP_ENV: 'development',
    CACHE_TTL: 300,
    CACHE_ENABLED: true
}
```

## Verificación

Para verificar que las variables están cargadas correctamente:

1. Abre la consola del navegador
2. Ejecuta: `window.ENV_CONFIG`
3. Deberías ver todas las variables configuradas

## Troubleshooting

### Error: "Variables de entorno no cargadas"
- Verifica que el archivo `.env` existe en el directorio raíz
- Verifica que el endpoint `/api.php/config` responde correctamente
- Revisa la consola del navegador para errores de red

### Error: "API_URL no encontrada"
- Asegúrate de que `API_URL` esté definida en el archivo `.env`
- Verifica que la URL sea accesible desde el navegador

### Error de conexión a la base de datos
- Verifica las credenciales de la base de datos en el archivo `.env`
- Asegúrate de que PostgreSQL esté ejecutándose
- Verifica que la base de datos `clinica_beleza` exista
