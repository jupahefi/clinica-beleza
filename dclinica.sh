#!/bin/bash

rm -r clinica-beleza
git clone https://github.com/jupahefi/clinica-beleza.git

rm -rf /opt/easyengine/sites/clinica-beleza.equalitech.xyz/app/htdocs/index.php
cp -r clinica-beleza/* /opt/easyengine/sites/clinica-beleza.equalitech.xyz/app/htdocs/

# Configurar MySQL
mysql -u root -e "CREATE DATABASE IF NOT EXISTS clinica_estetica;"
mysql -u root -e "CREATE USER IF NOT EXISTS 'clinica_user'@'localhost' IDENTIFIED BY 'Cl1nic42025';"
mysql -u root -e "GRANT ALL PRIVILEGES ON clinica_estetica.* TO 'clinica_user'@'localhost';"
mysql -u root -e "FLUSH PRIVILEGES;"

cat > /opt/easyengine/sites/clinica-beleza.equalitech.xyz/app/htdocs/.env << 'ENVEOF'
# Configuración de Base de Datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=clinica_estetica
DB_USER=clinica_user
DB_PASS=Cl1nic42025

# Configuración de la API
API_URL=https://clinica-beleza.equalitech.xyz
API_TIMEOUT=10000
API_RETRIES=3

# Configuración de la Aplicación
APP_NAME=Clínica Beleza
APP_VERSION=2.0.0
APP_ENV=production

# Configuración de Cache
CACHE_TTL=300
CACHE_ENABLED=true
ENVEOF

chown www-data:www-data /opt/easyengine/sites/clinica-beleza.equalitech.xyz/app/htdocs/.env
chmod 600 /opt/easyengine/sites/clinica-beleza.equalitech.xyz/app/htdocs/.env

# Ejecutar migración MySQL
mysql -u clinica_user -pCl1nic42025 clinica_estetica < /opt/easyengine/sites/clinica-beleza.equalitech.xyz/app/htdocs/docs/migracion_clinica_mysql.sql

ee site reload clinica-beleza.equalitech.xyz
