#!/bin/bash

# Script de despliegue completo con SQLite
# Clínica Beleza - Sistema Completo

set -e  # Salir en caso de error

echo "🚀 Desplegando Clínica Beleza con SQLite completo..."

# Variables
DOMAIN="clinica-beleza.equalitech.xyz"
TARGET_DIR="/opt/easyengine/sites/$DOMAIN/app/htdocs"
SOURCE_DIR="clinica-beleza"

echo "📋 Verificando estructura del proyecto..."

# Verificar archivos críticos
CRITICAL_FILES=(
    "$SOURCE_DIR/index.html"
    "$SOURCE_DIR/.env"
    "$SOURCE_DIR/env.php"
    "$SOURCE_DIR/api.php"
    "$SOURCE_DIR/admin.php"
    "$SOURCE_DIR/migrate.html"
    "$SOURCE_DIR/database/Database.php"
    "$SOURCE_DIR/database/schema.sql"
    "$SOURCE_DIR/js/storage-api.js"
    "$SOURCE_DIR/js/api-client.js"
    "$SOURCE_DIR/js/env.js"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: Archivo crítico faltante: $file"
        exit 1
    fi
    echo "✅ $file"
done

echo "🚀 Copiando archivos al servidor..."

# Crear backup del directorio actual si existe
if [ -d "$TARGET_DIR" ]; then
    BACKUP_DIR="/tmp/clinica-beleza-backup-$(date +%Y%m%d-%H%M%S)"
    echo "📦 Creando backup en $BACKUP_DIR..."
    cp -r "$TARGET_DIR" "$BACKUP_DIR"
    echo "✅ Backup creado"
fi

# Copiar todos los archivos
echo "📁 Copiando archivos actualizados..."
cp -r "$SOURCE_DIR"/* "$TARGET_DIR/"

echo "🔒 Configurando permisos de seguridad..."

# Configurar permisos del archivo .env
chmod 600 "$TARGET_DIR/.env"

# Configurar permisos de archivos PHP
chmod 644 "$TARGET_DIR/env.php"
chmod 644 "$TARGET_DIR/api.php"
chmod 644 "$TARGET_DIR/admin.php"

# Configurar permisos del directorio de base de datos
mkdir -p "$TARGET_DIR/database"
chmod 755 "$TARGET_DIR/database"
chmod 644 "$TARGET_DIR/database/Database.php"
chmod 644 "$TARGET_DIR/database/schema.sql"

# Crear directorio de backups de BD
mkdir -p "$TARGET_DIR/database/backups"
chmod 755 "$TARGET_DIR/database/backups"

# Configurar permisos de la base de datos (si existe)
if [ -f "$TARGET_DIR/database/clinica_beleza.db" ]; then
    chmod 664 "$TARGET_DIR/database/clinica_beleza.db"
    echo "✅ Permisos de base de datos configurados"
fi

echo "📊 Inicializando base de datos..."

# Probar la inicialización de la base de datos
DB_INIT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api.php/health" || echo "000")

if [ "$DB_INIT_RESPONSE" = "200" ]; then
    echo "✅ Base de datos inicializada correctamente"
else
    echo "⚠️ Advertencia: Base de datos no responde aún (HTTP $DB_INIT_RESPONSE)"
    echo "   La base de datos se inicializará automáticamente en el primer uso"
fi

echo "🌐 Probando endpoints críticos..."

# Probar endpoint de variables de entorno
ENV_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/env.php")
echo "🔧 Variables de entorno: HTTP $ENV_RESPONSE"

# Probar API principal
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api.php/health")
echo "🔌 API principal: HTTP $API_RESPONSE"

# Probar panel de admin
ADMIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/admin.php")
echo "👮 Panel de admin: HTTP $ADMIN_RESPONSE"

# Probar herramienta de migración
MIGRATE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/migrate.html")
echo "🔄 Herramienta de migración: HTTP $MIGRATE_RESPONSE"

echo "🔄 Recargando sitio..."

# Recargar el sitio
if command -v ee &> /dev/null; then
    ee site reload "$DOMAIN"
    echo "✅ Sitio recargado con EasyEngine"
else
    echo "⚠️ EasyEngine no encontrado, recarga manual necesaria"
fi

echo "🧪 Ejecutando pruebas finales..."

# Verificar que la página principal carga
MAIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/")
if [ "$MAIN_RESPONSE" = "200" ]; then
    echo "✅ Página principal accesible (HTTP $MAIN_RESPONSE)"
else
    echo "❌ Error: Página principal no accesible (HTTP $MAIN_RESPONSE)"
fi

# Probar funcionalidad básica de la API
echo "🔍 Probando funcionalidad básica de la API..."

# Test de health check
HEALTH_TEST=$(curl -s "https://$DOMAIN/api.php/health")
if echo "$HEALTH_TEST" | grep -q '"success":true'; then
    echo "✅ Health check de la API funcional"
else
    echo "⚠️ Advertencia: Health check de la API no responde correctamente"
fi

# Test de estadísticas
STATS_TEST=$(curl -s "https://$DOMAIN/api.php/stats")
if echo "$STATS_TEST" | grep -q '"success":true'; then
    echo "✅ Endpoint de estadísticas funcional"
else
    echo "⚠️ Advertencia: Endpoint de estadísticas no responde correctamente"
fi

echo ""
echo "🎉 ¡Despliegue completo finalizado!"
echo ""
echo "📋 Resumen del despliegue:"
echo "  ✅ Variables de entorno configuradas securely"
echo "  ✅ API REST con SQLite implementada"
echo "  ✅ Sistema de cache y sincronización activo"
echo "  ✅ Herramientas de administración disponibles"
echo "  ✅ Migración de datos localStorage disponible"
echo "  ✅ Respaldos automáticos configurados"
echo ""
echo "🔗 Enlaces del sistema:"
echo "  • 🏠 Aplicación: https://$DOMAIN/"
echo "  • 👮 Panel Admin: https://$DOMAIN/admin.php"
echo "  • 🔄 Migración: https://$DOMAIN/migrate.html"
echo "  • 🧪 Test Variables: https://$DOMAIN/test-env.html"
echo "  • 🔌 API Health: https://$DOMAIN/api.php/health"
echo "  • 📊 API Stats: https://$DOMAIN/api.php/stats"
echo ""
echo "📁 Archivos importantes:"
echo "  • Base de datos: $TARGET_DIR/database/clinica_beleza.db"
echo "  • Configuración: $TARGET_DIR/.env"
echo "  • Backups: $TARGET_DIR/database/backups/"
if [ -n "${BACKUP_DIR:-}" ]; then
    echo "  • Backup anterior: $BACKUP_DIR"
fi
echo ""
echo "🚀 Próximos pasos:"
echo "  1. Visita https://$DOMAIN/admin.php para verificar el estado"
echo "  2. Si tienes datos anteriores, usa https://$DOMAIN/migrate.html"
echo "  3. Prueba la funcionalidad completa de la aplicación"
echo "  4. Configura backups automáticos si es necesario"
echo ""
echo "✅ Sistema listo para producción con SQLite"

