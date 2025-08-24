-- =============================================================================
-- Clinica Estetica - Esquema base
-- MySQL migration - v2 (Sistema de Login + Campos Requeridos)
-- =============================================================================

-- ---------- DROP DATABASE (DESARROLLO/TESTING) ----------
DROP DATABASE IF EXISTS clinica_estetica;
-- MANTENER COMENTADO PARA PRODUCCIoN

-- ---------- Helper: create database if not exists ----------
CREATE DATABASE IF NOT EXISTS clinica_estetica;
USE clinica_estetica;

-- ---------- Helper functions ----------

-- Drop existing helper procedures
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
DROP PROCEDURE IF EXISTS AddForeignKeyIfNotExists;
DROP PROCEDURE IF EXISTS AddCheckConstraintIfNotExists;

-- Drop existing triggers
DROP TRIGGER IF EXISTS trg_venta_requiere_ficha_especifica;
DROP TRIGGER IF EXISTS trg_venta_requiere_evaluacion_ficha_especifica;
DROP TRIGGER IF EXISTS trg_sesion_numero_en_rango;
DROP TRIGGER IF EXISTS trg_venta_calcular_total;
DROP TRIGGER IF EXISTS trg_venta_oferta_calcular_total;
DROP TRIGGER IF EXISTS trg_venta_oferta_update_total;
DROP TRIGGER IF EXISTS trg_venta_oferta_delete_total;
DROP TRIGGER IF EXISTS trg_oferta_validar_fechas;
DROP TRIGGER IF EXISTS trg_oferta_validar_fechas_update;
DROP TRIGGER IF EXISTS trg_sesion_auto_realizada;
DROP TRIGGER IF EXISTS trg_sesion_profesional_activo;
DROP TRIGGER IF EXISTS trg_sesion_box_activo;
DROP TRIGGER IF EXISTS trg_sesion_sucursal_activa;

-- Drop existing stored procedures
DROP PROCEDURE IF EXISTS sp_crear_ficha;
DROP PROCEDURE IF EXISTS sp_buscar_fichas;
DROP PROCEDURE IF EXISTS sp_agregar_ficha_especifica;
DROP PROCEDURE IF EXISTS sp_crear_evaluacion;
DROP PROCEDURE IF EXISTS sp_crear_venta;
DROP PROCEDURE IF EXISTS sp_aplicar_descuento_manual;
DROP PROCEDURE IF EXISTS sp_aplicar_ofertas;
DROP PROCEDURE IF EXISTS sp_agendar_sesion;
DROP PROCEDURE IF EXISTS sp_generar_plan_sesiones;
DROP PROCEDURE IF EXISTS sp_confirmar_paciente;
DROP PROCEDURE IF EXISTS sp_abrir_sesion;
DROP PROCEDURE IF EXISTS sp_cerrar_sesion;
DROP PROCEDURE IF EXISTS sp_reprogramar_sesion;
DROP PROCEDURE IF EXISTS sp_cancelar_sesion;
DROP PROCEDURE IF EXISTS sp_crear_oferta_pack;
DROP PROCEDURE IF EXISTS sp_crear_oferta_combo;
DROP PROCEDURE IF EXISTS sp_crear_profesional;
DROP PROCEDURE IF EXISTS sp_obtener_disponibilidad;
DROP PROCEDURE IF EXISTS sp_reporte_progreso_ventas;
DROP PROCEDURE IF EXISTS sp_reporte_plan_vs_ejecucion;
DROP PROCEDURE IF EXISTS sp_ofertas_aplicables_venta;
DROP PROCEDURE IF EXISTS sp_sesiones_venta;
DROP PROCEDURE IF EXISTS sp_venta_completa;
DROP PROCEDURE IF EXISTS sp_guardar_intensidades_zonas;
DROP PROCEDURE IF EXISTS sp_cargar_intensidades_anteriores;
DROP PROCEDURE IF EXISTS sp_calcular_precio_zonas;
DROP PROCEDURE IF EXISTS sp_guardar_firma_digital;
DROP PROCEDURE IF EXISTS sp_verificar_consentimiento_firmado;
DROP PROCEDURE IF EXISTS sp_obtener_firma_consentimiento;
DROP PROCEDURE IF EXISTS sp_crear_oferta_tratamiento;
DROP PROCEDURE IF EXISTS sp_crear_precio_tratamiento;
DROP PROCEDURE IF EXISTS sp_obtener_precio_tratamiento;
DROP PROCEDURE IF EXISTS sp_actualizar_precio_pack;
DROP PROCEDURE IF EXISTS sp_crear_pago;
DROP PROCEDURE IF EXISTS sp_agregar_detalle_pago;
DROP PROCEDURE IF EXISTS sp_confirmar_pago;
DROP PROCEDURE IF EXISTS sp_obtener_pagos_venta;
DROP PROCEDURE IF EXISTS sp_obtener_tratamientos_disponibles;
DROP PROCEDURE IF EXISTS sp_obtener_packs_tratamiento;
DROP PROCEDURE IF EXISTS sp_obtener_zonas_cuerpo;
DROP PROCEDURE IF EXISTS sp_calcular_precio_pack_zonas;
DROP PROCEDURE IF EXISTS sp_obtener_historial_tratamientos;
DROP PROCEDURE IF EXISTS sp_crear_tipo_ficha_especifica;
DROP PROCEDURE IF EXISTS sp_actualizar_ficha;
DROP PROCEDURE IF EXISTS sp_eliminar_ficha;
DROP PROCEDURE IF EXISTS sp_actualizar_ultimo_login;
DROP PROCEDURE IF EXISTS sp_crear_tratamiento;
DROP PROCEDURE IF EXISTS sp_crear_pack;
DROP PROCEDURE IF EXISTS sp_crear_sucursal;
DROP PROCEDURE IF EXISTS sp_crear_box;
DROP PROCEDURE IF EXISTS sp_agregar_pack_oferta_combo;

DELIMITER $$

CREATE PROCEDURE AddIndexIfNotExists(
    IN indexName VARCHAR(64),
    IN tableName VARCHAR(64),
    IN columnList VARCHAR(200),
    IN isUnique BOOLEAN
)
BEGIN
    DECLARE indexExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO indexExists
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE()
    AND table_name = tableName
    AND index_name = indexName;
    
    IF indexExists = 0 THEN
        IF isUnique THEN
            SET @sql = CONCAT('CREATE UNIQUE INDEX ', indexName, ' ON ', tableName, ' (', columnList, ')');
        ELSE
            SET @sql = CONCAT('CREATE INDEX ', indexName, ' ON ', tableName, ' (', columnList, ')');
        END IF;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

CREATE PROCEDURE AddForeignKeyIfNotExists(
    IN tableName VARCHAR(64),
    IN constraintName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN refTable VARCHAR(64),
    IN refColumn VARCHAR(64)
)
BEGIN
    DECLARE constraintExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO constraintExists
    FROM information_schema.table_constraints 
    WHERE table_schema = DATABASE()
    AND table_name = tableName
    AND constraint_name = constraintName;
    
    IF constraintExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD CONSTRAINT ', constraintName, ' FOREIGN KEY (', columnName, ') REFERENCES ', refTable, '(', refColumn, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

CREATE PROCEDURE AddCheckConstraintIfNotExists(
    IN tableName VARCHAR(64),
    IN constraintName VARCHAR(64),
    IN checkCondition VARCHAR(500)
)
BEGIN
    DECLARE constraintExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO constraintExists
    FROM information_schema.table_constraints 
    WHERE table_schema = DATABASE()
    AND table_name = tableName
    AND constraint_name = constraintName;
    
    IF constraintExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD CONSTRAINT ', constraintName, ' CHECK (', checkCondition, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- ---------- Tables ----------

CREATE TABLE IF NOT EXISTS sucursal (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  direccion VARCHAR(200) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  email VARCHAR(120) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ux_sucursal_nombre', 'sucursal', 'nombre', TRUE);

CREATE TABLE IF NOT EXISTS zona_cuerpo (
  codigo VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  precio_base DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Las inserciones de datos se moveran despues de la creacion de todas las tablas

-- Las inserciones de datos se moveran despues de la creacion de todas las tablas

CREATE TABLE IF NOT EXISTS box (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sucursal_id BIGINT NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  descripcion TEXT NOT NULL,
  capacidad INT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ix_box_sucursal', 'box', 'sucursal_id', FALSE);
CALL AddCheckConstraintIfNotExists('box', 'ck_box_sucursal_required', 'sucursal_id IS NOT NULL');

CREATE TABLE IF NOT EXISTS usuario (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  rol VARCHAR(20) NOT NULL DEFAULT 'profesional', -- 'admin', 'profesional', 'recepcionista'
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login TIMESTAMP NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ux_usuario_username', 'usuario', 'username', TRUE);
CALL AddIndexIfNotExists('ux_usuario_email', 'usuario', 'email', TRUE);

CREATE TABLE IF NOT EXISTS profesional (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  apellidos VARCHAR(150) NOT NULL,
  rut VARCHAR(20) NOT NULL UNIQUE,
  telefono VARCHAR(50) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  tipo_profesional VARCHAR(80) NOT NULL,
  bio TEXT NOT NULL,
  foto_url TEXT NOT NULL,
  especialidad VARCHAR(100) NOT NULL,
  titulo_profesional VARCHAR(150) NOT NULL,
  numero_colegio VARCHAR(50) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  direccion TEXT NOT NULL,
  estado_civil VARCHAR(20) NOT NULL,
  contacto_emergencia VARCHAR(150) NOT NULL,
  telefono_emergencia VARCHAR(50) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  -- Foreign key se agregara con funcion idempotente
);

CREATE TABLE IF NOT EXISTS ficha (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL,
  nombres VARCHAR(120) NOT NULL,
  apellidos VARCHAR(120) NOT NULL,
  rut VARCHAR(20) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  fecha_nacimiento DATE NOT NULL,
  direccion TEXT NOT NULL,
  observaciones TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ux_ficha_codigo', 'ficha', 'codigo', TRUE);
CALL AddIndexIfNotExists('ux_ficha_email', 'ficha', 'email', TRUE);

-- Primera definicion eliminada (duplicada)

CREATE TABLE IF NOT EXISTS evaluacion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ficha_id BIGINT NOT NULL,
  profesional_id BIGINT NOT NULL,
  tratamiento_id BIGINT NOT NULL,
  pack_id BIGINT,
  precio_sugerido DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sesiones_sugeridas INT NOT NULL DEFAULT 1,
  observaciones TEXT NOT NULL,
  recomendaciones TEXT NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
  fecha_evaluacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tipo_ficha_especifica (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT NOT NULL,
  requiere_consentimiento BOOLEAN NOT NULL DEFAULT FALSE,
  template_consentimiento TEXT,
  campos_requeridos JSON NOT NULL DEFAULT (JSON_OBJECT()),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CALL AddIndexIfNotExists('ux_tipo_ficha_especifica_nombre', 'tipo_ficha_especifica', 'nombre', TRUE);

CREATE TABLE IF NOT EXISTS ficha_especifica (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  evaluacion_id BIGINT NOT NULL,
  tipo_id BIGINT NOT NULL,
  datos JSON NOT NULL DEFAULT (JSON_OBJECT()),
  consentimiento_firmado BOOLEAN NOT NULL DEFAULT FALSE,
  observaciones TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consentimiento_firma (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ficha_id BIGINT NOT NULL,
  ficha_especifica_id BIGINT NOT NULL,
  profesional_id BIGINT NOT NULL,
  tipo_consentimiento VARCHAR(50) NOT NULL,
  firma_blob LONGBLOB NOT NULL,
  tipo_archivo VARCHAR(10) NOT NULL,
  contenido_leido TEXT NOT NULL,
  fecha_firma TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
  -- Unique key se agregara con funcion idempotente
);

CALL AddIndexIfNotExists('ix_evaluacion_ficha', 'evaluacion', 'ficha_id', FALSE);
CALL AddIndexIfNotExists('ix_evaluacion_profesional', 'evaluacion', 'profesional_id', FALSE);
CALL AddIndexIfNotExists('ix_evaluacion_tratamiento', 'evaluacion', 'tratamiento_id', FALSE);
CALL AddIndexIfNotExists('ix_evaluacion_pack', 'evaluacion', 'pack_id', FALSE);
CALL AddIndexIfNotExists('ix_ficha_especifica_evaluacion', 'ficha_especifica', 'evaluacion_id', FALSE);
CALL AddIndexIfNotExists('ix_ficha_especifica_tipo', 'ficha_especifica', 'tipo_id', FALSE);

CREATE TABLE IF NOT EXISTS tratamiento (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NOT NULL,
  requiere_ficha_especifica BOOLEAN NOT NULL DEFAULT FALSE,
  tipo_ficha_requerida VARCHAR(50),
  duracion_sesion_min INT NOT NULL DEFAULT 0,
  frecuencia_recomendada_dias INT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ux_tratamiento_nombre', 'tratamiento', 'nombre', TRUE);

CREATE TABLE IF NOT EXISTS precio_tratamiento (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tratamiento_id BIGINT NOT NULL,
  precio_por_sesion DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  genero ENUM('M', 'F', 'U') NOT NULL DEFAULT 'U',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ix_precio_tratamiento_tratamiento', 'precio_tratamiento', 'tratamiento_id', FALSE);

CREATE TABLE IF NOT EXISTS pack (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tratamiento_id BIGINT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NOT NULL,
  duracion_sesion_min INT NOT NULL DEFAULT 0,
  sesiones_incluidas INT NOT NULL DEFAULT 1,
  zonas_incluidas JSON NOT NULL,
  precio_por_zona JSON NOT NULL,
  precio_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  genero ENUM('M', 'F', 'U') NOT NULL DEFAULT 'U',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ux_pack_tratamiento_nombre', 'pack', 'tratamiento_id, nombre', TRUE);





CREATE TABLE IF NOT EXISTS oferta (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  tipo VARCHAR(40) NOT NULL, -- 'pack'|'tratamiento'|'sesiones'|'combo'|'manual'
  descripcion TEXT NOT NULL,
  porc_descuento DECIMAL(5,2) NOT NULL,
  sesiones_minimas INT NOT NULL DEFAULT 1,
  fecha_inicio DATE NULL,
  fecha_fin DATE NULL,
  combinable BOOLEAN NOT NULL DEFAULT TRUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  prioridad INT NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ux_oferta_nombre', 'oferta', 'nombre', TRUE);

CREATE TABLE IF NOT EXISTS oferta_pack (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  oferta_id BIGINT NOT NULL,
  pack_id BIGINT NOT NULL,
  porc_descuento DECIMAL(5,2) NOT NULL DEFAULT 0.00
);

CALL AddIndexIfNotExists('ux_oferta_pack', 'oferta_pack', 'oferta_id, pack_id', TRUE);

CREATE TABLE IF NOT EXISTS oferta_tratamiento (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  oferta_id BIGINT NOT NULL,
  tratamiento_id BIGINT NOT NULL,
  porc_descuento DECIMAL(5,2) NOT NULL DEFAULT 0.00
);

CALL AddIndexIfNotExists('ux_oferta_tratamiento', 'oferta_tratamiento', 'oferta_id, tratamiento_id', TRUE);

CREATE TABLE IF NOT EXISTS oferta_combo (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  oferta_id BIGINT NOT NULL,
  min_packs INT NOT NULL DEFAULT 2,
  porc_descuento_adicional DECIMAL(5,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS oferta_combo_pack (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  oferta_combo_id BIGINT NOT NULL,
  pack_id BIGINT NOT NULL
);

CALL AddIndexIfNotExists('ux_oferta_combo_pack', 'oferta_combo_pack', 'oferta_combo_id, pack_id', TRUE);

CREATE TABLE IF NOT EXISTS venta (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ficha_id BIGINT NOT NULL,
  evaluacion_id BIGINT NULL,
  ficha_especifica_id BIGINT NULL,
  tratamiento_id BIGINT NOT NULL,
  pack_id BIGINT,
  cantidad_sesiones INT NOT NULL DEFAULT 1,
  precio_lista DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  descuento_manual_pct DECIMAL(5,2) DEFAULT 0,
  descuento_aplicado_total DECIMAL(12,2) DEFAULT 0,
  total_pagado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  genero ENUM('M', 'F', 'U') NOT NULL,
  genero_indicado_por BIGINT NOT NULL,
  fecha_indicacion_genero TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
  observaciones TEXT NOT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ix_venta_ficha', 'venta', 'ficha_id', FALSE);
CALL AddIndexIfNotExists('ix_venta_evaluacion', 'venta', 'evaluacion_id', FALSE);
CALL AddIndexIfNotExists('ix_venta_ficha_especifica', 'venta', 'ficha_especifica_id', FALSE);
CALL AddIndexIfNotExists('ix_venta_tratamiento', 'venta', 'tratamiento_id', FALSE);
CALL AddIndexIfNotExists('ix_venta_pack', 'venta', 'pack_id', FALSE);

CREATE TABLE IF NOT EXISTS pago (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  venta_id BIGINT NOT NULL,
  monto_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente', -- pendiente|pagado|anulado
  observaciones TEXT NOT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ix_pago_venta', 'pago', 'venta_id', FALSE);

CREATE TABLE IF NOT EXISTS pago_detalle (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  pago_id BIGINT NOT NULL,
  monto DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  metodo_pago VARCHAR(50) NOT NULL,
  referencia VARCHAR(100) NOT NULL,
  observaciones TEXT NOT NULL,
  fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ix_pago_detalle_pago', 'pago_detalle', 'pago_id', FALSE);

CREATE TABLE IF NOT EXISTS venta_oferta (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  venta_id BIGINT NOT NULL,
  oferta_id BIGINT NOT NULL,
  secuencia INT NOT NULL DEFAULT 0,
  porc_descuento DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  monto_descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00
);

CALL AddIndexIfNotExists('ux_venta_oferta_seq', 'venta_oferta', 'venta_id, secuencia', TRUE);

CREATE TABLE IF NOT EXISTS sesion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  venta_id BIGINT NOT NULL,
  numero_sesion INT NOT NULL, -- x de y
  sucursal_id BIGINT NOT NULL,
  box_id BIGINT NOT NULL,
  profesional_id BIGINT NOT NULL,
  google_calendar_event_id VARCHAR(255) NULL, -- NULL hasta integrar con Google Calendar
  fecha_planificada TIMESTAMP NOT NULL,
  fecha_ejecucion TIMESTAMP NULL, -- NULL hasta ejecutar la sesión
  estado VARCHAR(30) NOT NULL DEFAULT 'planificada', -- planificada|confirmada|realizada|no_show|cancelada
  paciente_confirmado BOOLEAN NOT NULL DEFAULT FALSE,
  abierta_en TIMESTAMP NULL, -- NULL hasta abrir la sesión
  cerrada_en TIMESTAMP NULL, -- NULL hasta cerrar la sesión
  observaciones TEXT NULL, -- NULL si no hay observaciones
            intensidades_zonas JSON NOT NULL, -- JSON vacío por defecto
          datos_sesion JSON NOT NULL, -- JSON vacío por defecto
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ux_sesion_venta_num', 'sesion', 'venta_id, numero_sesion', TRUE);
CALL AddIndexIfNotExists('ix_sesion_profesional', 'sesion', 'profesional_id', FALSE);
CALL AddIndexIfNotExists('ix_sesion_box', 'sesion', 'box_id', FALSE);
CALL AddIndexIfNotExists('ix_sesion_sucursal', 'sesion', 'sucursal_id', FALSE);
CALL AddIndexIfNotExists('ix_sesion_estado', 'sesion', 'estado', FALSE);

-- ---------- Drop existing constraints ----------

-- ---------- Add foreign keys ----------

-- Add foreign keys
CALL AddForeignKeyIfNotExists('profesional', 'fk_profesional_usuario', 'usuario_id', 'usuario', 'id');
CALL AddIndexIfNotExists('uk_ficha_tipo_consentimiento', 'consentimiento_firma', 'ficha_id, tipo_consentimiento', TRUE);
CALL AddForeignKeyIfNotExists('box', 'fk_box_sucursal', 'sucursal_id', 'sucursal', 'id');

CALL AddForeignKeyIfNotExists('evaluacion', 'fk_evaluacion_ficha', 'ficha_id', 'ficha', 'id');
CALL AddForeignKeyIfNotExists('evaluacion', 'fk_evaluacion_profesional', 'profesional_id', 'profesional', 'id');
CALL AddForeignKeyIfNotExists('evaluacion', 'fk_evaluacion_tratamiento', 'tratamiento_id', 'tratamiento', 'id');
CALL AddForeignKeyIfNotExists('evaluacion', 'fk_evaluacion_pack', 'pack_id', 'pack', 'id');
CALL AddForeignKeyIfNotExists('ficha_especifica', 'fk_ficha_especifica_evaluacion', 'evaluacion_id', 'evaluacion', 'id');
CALL AddForeignKeyIfNotExists('ficha_especifica', 'fk_ficha_especifica_tipo', 'tipo_id', 'tipo_ficha_especifica', 'id');

CALL AddForeignKeyIfNotExists('consentimiento_firma', 'fk_consentimiento_firma_ficha', 'ficha_id', 'ficha', 'id');
CALL AddForeignKeyIfNotExists('consentimiento_firma', 'fk_consentimiento_firma_profesional', 'profesional_id', 'profesional', 'id');
CALL AddForeignKeyIfNotExists('consentimiento_firma', 'fk_consentimiento_firma_especifica', 'ficha_especifica_id', 'ficha_especifica', 'id');

CALL AddForeignKeyIfNotExists('precio_tratamiento', 'fk_precio_tratamiento_tratamiento', 'tratamiento_id', 'tratamiento', 'id');

CALL AddForeignKeyIfNotExists('pack', 'fk_pack_tratamiento', 'tratamiento_id', 'tratamiento', 'id');



CALL AddForeignKeyIfNotExists('oferta_pack', 'fk_oferta_pack_oferta', 'oferta_id', 'oferta', 'id');
CALL AddForeignKeyIfNotExists('oferta_pack', 'fk_oferta_pack_pack', 'pack_id', 'pack', 'id');

CALL AddForeignKeyIfNotExists('oferta_tratamiento', 'fk_oferta_tratamiento_oferta', 'oferta_id', 'oferta', 'id');
CALL AddForeignKeyIfNotExists('oferta_tratamiento', 'fk_oferta_tratamiento_tratamiento', 'tratamiento_id', 'tratamiento', 'id');

CALL AddForeignKeyIfNotExists('oferta_combo', 'fk_oferta_combo_oferta', 'oferta_id', 'oferta', 'id');

CALL AddForeignKeyIfNotExists('oferta_combo_pack', 'fk_oferta_combo_pack_combo', 'oferta_combo_id', 'oferta_combo', 'id');
CALL AddForeignKeyIfNotExists('oferta_combo_pack', 'fk_oferta_combo_pack_pack', 'pack_id', 'pack', 'id');

CALL AddForeignKeyIfNotExists('venta', 'fk_venta_ficha', 'ficha_id', 'ficha', 'id');
CALL AddForeignKeyIfNotExists('venta', 'fk_venta_evaluacion', 'evaluacion_id', 'evaluacion', 'id');
CALL AddForeignKeyIfNotExists('venta', 'fk_venta_ficha_especifica', 'ficha_especifica_id', 'ficha_especifica', 'id');
CALL AddForeignKeyIfNotExists('venta', 'fk_venta_tratamiento', 'tratamiento_id', 'tratamiento', 'id');
CALL AddForeignKeyIfNotExists('venta', 'fk_venta_pack', 'pack_id', 'pack', 'id');
CALL AddForeignKeyIfNotExists('venta', 'fk_venta_genero_profesional', 'genero_indicado_por', 'profesional', 'id');

CALL AddForeignKeyIfNotExists('pago', 'fk_pago_venta', 'venta_id', 'venta', 'id');
CALL AddForeignKeyIfNotExists('pago_detalle', 'fk_pago_detalle_pago', 'pago_id', 'pago', 'id');

CALL AddForeignKeyIfNotExists('venta_oferta', 'fk_venta_oferta_venta', 'venta_id', 'venta', 'id');
CALL AddForeignKeyIfNotExists('venta_oferta', 'fk_venta_oferta_oferta', 'oferta_id', 'oferta', 'id');

CALL AddForeignKeyIfNotExists('sesion', 'fk_sesion_venta', 'venta_id', 'venta', 'id');
CALL AddForeignKeyIfNotExists('sesion', 'fk_sesion_sucursal', 'sucursal_id', 'sucursal', 'id');
CALL AddForeignKeyIfNotExists('sesion', 'fk_sesion_box', 'box_id', 'box', 'id');
CALL AddForeignKeyIfNotExists('sesion', 'fk_sesion_profesional', 'profesional_id', 'profesional', 'id');

-- ---------- Business rules & checks ----------

CALL AddCheckConstraintIfNotExists('sesion', 'ck_sesion_numero_pos', 'numero_sesion >= 1');
CALL AddCheckConstraintIfNotExists('venta', 'ck_venta_cantidad_pos', 'cantidad_sesiones >= 1');
CALL AddCheckConstraintIfNotExists('venta', 'ck_venta_estado', 'estado IN (''pendiente'',''pagado'',''anulado'')');
CALL AddCheckConstraintIfNotExists('sesion', 'ck_sesion_estado', 'estado IN (''planificada'',''confirmada'',''realizada'',''no_show'',''cancelada'')');
-- CHECK constraint removido porque MySQL no permite CURRENT_TIMESTAMP en CHECK constraints
-- La validación se hace a nivel de aplicación y triggers
CALL AddCheckConstraintIfNotExists('sesion', 'ck_sesion_venta_valida', 'venta_id IS NOT NULL');
CALL AddCheckConstraintIfNotExists('sesion', 'ck_sesion_profesional_valido', 'profesional_id IS NOT NULL');
CALL AddCheckConstraintIfNotExists('sesion', 'ck_sesion_box_valido', 'box_id IS NOT NULL');
CALL AddCheckConstraintIfNotExists('sesion', 'ck_sesion_sucursal_valida', 'sucursal_id IS NOT NULL');
CALL AddCheckConstraintIfNotExists('evaluacion', 'ck_eval_precio_pos', 'precio_sugerido >= 0');
CALL AddCheckConstraintIfNotExists('evaluacion', 'ck_eval_sesiones_pos', 'sesiones_sugeridas >= 1');
CALL AddCheckConstraintIfNotExists('venta', 'ck_venta_precio_pos', 'precio_lista >= 0');
CALL AddCheckConstraintIfNotExists('venta', 'ck_venta_descuento_rango', 'descuento_manual_pct IS NULL OR (descuento_manual_pct >= 0 AND descuento_manual_pct <= 100)');
CALL AddCheckConstraintIfNotExists('venta', 'ck_venta_total_pos', 'total_pagado >= 0');
CALL AddCheckConstraintIfNotExists('oferta', 'ck_oferta_descuento_rango', 'porc_descuento IS NULL OR (porc_descuento >= 0 AND porc_descuento <= 100)');
CALL AddCheckConstraintIfNotExists('oferta_pack', 'ck_oferta_pack_descuento_rango', 'porc_descuento >= 0 AND porc_descuento <= 100');
CALL AddCheckConstraintIfNotExists('venta_oferta', 'ck_venta_oferta_monto_pos', 'monto_descuento >= 0');
CALL AddCheckConstraintIfNotExists('venta_oferta', 'ck_venta_oferta_descuento_rango', 'porc_descuento >= 0 AND porc_descuento <= 100');
CALL AddCheckConstraintIfNotExists('oferta_combo', 'ck_oferta_combo_min_packs', 'min_packs >= 2');
CALL AddCheckConstraintIfNotExists('pack', 'ck_pack_duracion_pos', 'duracion_sesion_min >= 0');
CALL AddCheckConstraintIfNotExists('oferta', 'ck_oferta_prioridad_pos', 'prioridad >= 0');
CALL AddCheckConstraintIfNotExists('precio_tratamiento', 'ck_precio_tratamiento_por_sesion_pos', 'precio_por_sesion >= 0');
CALL AddCheckConstraintIfNotExists('pack', 'ck_pack_precio_total_pos', 'precio_total >= 0');
CALL AddCheckConstraintIfNotExists('pack', 'ck_pack_sesiones_pos', 'sesiones_incluidas >= 1');
CALL AddCheckConstraintIfNotExists('pago', 'ck_pago_monto_pos', 'monto_total >= 0');
CALL AddCheckConstraintIfNotExists('pago', 'ck_pago_estado', 'estado IN (''pendiente'',''pagado'',''anulado'')');
CALL AddCheckConstraintIfNotExists('pago_detalle', 'ck_pago_detalle_monto_pos', 'monto >= 0');
CALL AddCheckConstraintIfNotExists('oferta_tratamiento', 'ck_oferta_tratamiento_descuento_rango', 'porc_descuento >= 0 AND porc_descuento <= 100');
CALL AddCheckConstraintIfNotExists('oferta_combo', 'ck_oferta_combo_descuento_adicional_rango', 'porc_descuento_adicional >= 0 AND porc_descuento_adicional <= 100');

-- ---------- Triggers ----------

-- Validar que la venta tenga evaluacion y ficha especifica requeridas
-- La evaluacion es obligatoria para todas las ventas
-- La ficha especifica nace en la evaluacion

DELIMITER $$

CREATE TRIGGER trg_venta_requiere_evaluacion_ficha_especifica
BEFORE INSERT ON venta
FOR EACH ROW
BEGIN
  DECLARE eval_ficha BIGINT;
  DECLARE eval_id BIGINT;
  DECLARE ficha_esp_id BIGINT;
  DECLARE requiere_ficha_especifica BOOLEAN DEFAULT TRUE;
  
  -- Verificar si el tratamiento requiere ficha específica
  SELECT t.requiere_ficha_especifica INTO requiere_ficha_especifica 
  FROM tratamiento t 
  WHERE t.id = NEW.tratamiento_id;
  
  -- Si requiere ficha específica, validar evaluación y ficha específica
  IF requiere_ficha_especifica = TRUE THEN
    -- Validar que la evaluacion existe y pertenece a la misma ficha
    SELECT ficha_id INTO eval_ficha FROM evaluacion WHERE id = NEW.evaluacion_id;
    IF eval_ficha IS NULL OR eval_ficha != NEW.ficha_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Evaluacion debe existir y pertenecer a la misma ficha';
    END IF;

    -- Validar que la ficha especifica existe y pertenece a la evaluacion
    SELECT evaluacion_id INTO eval_id FROM ficha_especifica WHERE id = NEW.ficha_especifica_id;
    IF eval_id IS NULL OR eval_id != NEW.evaluacion_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ficha especifica debe existir y pertenecer a la evaluacion';
    END IF;

    -- Validar que la ficha especifica pertenece a la misma ficha
    SELECT fe.id INTO ficha_esp_id 
    FROM ficha_especifica fe
    JOIN evaluacion e ON fe.evaluacion_id = e.id
    WHERE fe.id = NEW.ficha_especifica_id AND e.ficha_id = NEW.ficha_id;

    IF ficha_esp_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ficha especifica debe pertenecer a la evaluacion de la misma ficha';
    END IF;
  END IF;
END$$

-- Prevent scheduling sessions beyond purchased amount
CREATE TRIGGER trg_sesion_numero_en_rango
BEFORE INSERT ON sesion
FOR EACH ROW
BEGIN
  DECLARE max_ses INT;
  
  SELECT cantidad_sesiones INTO max_ses FROM venta WHERE id = NEW.venta_id;
  IF max_ses IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Venta no encontrada';
  END IF;
  
  IF NEW.numero_sesion < 1 OR NEW.numero_sesion > max_ses THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'numero_sesion fuera de rango';
  END IF;
END$$

-- Auto-calculate total_pagado when descuento_manual_pct changes
CREATE TRIGGER trg_venta_calcular_total
BEFORE UPDATE ON venta
FOR EACH ROW
BEGIN
  DECLARE descuento_manual DECIMAL(12,2) DEFAULT 0;
  
  -- Calculate manual discount amount
  IF NEW.descuento_manual_pct IS NOT NULL AND NEW.descuento_manual_pct > 0 THEN
    SET descuento_manual = (NEW.precio_lista * NEW.descuento_manual_pct) / 100;
  END IF;
  
  -- Update total_pagado (manual discount + offer discounts)
  SET NEW.total_pagado = NEW.precio_lista - descuento_manual - NEW.descuento_aplicado_total;
END$$

-- Auto-calculate descuento_aplicado_total from venta_oferta
CREATE TRIGGER trg_venta_oferta_calcular_total
AFTER INSERT ON venta_oferta
FOR EACH ROW
BEGIN
  UPDATE venta 
  SET descuento_aplicado_total = (
    SELECT COALESCE(SUM(monto_descuento), 0) 
    FROM venta_oferta 
    WHERE venta_id = NEW.venta_id
  )
  WHERE id = NEW.venta_id;
END$$

-- Auto-calculate descuento_aplicado_total when venta_oferta is updated
CREATE TRIGGER trg_venta_oferta_update_total
AFTER UPDATE ON venta_oferta
FOR EACH ROW
BEGIN
  UPDATE venta 
  SET descuento_aplicado_total = (
    SELECT COALESCE(SUM(monto_descuento), 0) 
    FROM venta_oferta 
    WHERE venta_id = NEW.venta_id
  )
  WHERE id = NEW.venta_id;
END$$

-- Auto-calculate descuento_aplicado_total when venta_oferta is deleted
CREATE TRIGGER trg_venta_oferta_delete_total
AFTER DELETE ON venta_oferta
FOR EACH ROW
BEGIN
  UPDATE venta 
  SET descuento_aplicado_total = (
    SELECT COALESCE(SUM(monto_descuento), 0) 
    FROM venta_oferta 
    WHERE venta_id = OLD.venta_id
  )
  WHERE id = OLD.venta_id;
END$$

-- Validate oferta dates when creating/updating
CREATE TRIGGER trg_oferta_validar_fechas
BEFORE INSERT ON oferta
FOR EACH ROW
BEGIN
  IF NEW.fecha_inicio IS NOT NULL AND NEW.fecha_fin IS NOT NULL THEN
    IF NEW.fecha_inicio > NEW.fecha_fin THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fecha_inicio no puede ser posterior a fecha_fin';
    END IF;
  END IF;
END$$

-- Validate oferta dates when updating
CREATE TRIGGER trg_oferta_validar_fechas_update
BEFORE UPDATE ON oferta
FOR EACH ROW
BEGIN
  IF NEW.fecha_inicio IS NOT NULL AND NEW.fecha_fin IS NOT NULL THEN
    IF NEW.fecha_inicio > NEW.fecha_fin THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fecha_inicio no puede ser posterior a fecha_fin';
    END IF;
  END IF;
END$$

-- Auto-update sesion estado when fecha_ejecucion is set
CREATE TRIGGER trg_sesion_auto_realizada
BEFORE UPDATE ON sesion
FOR EACH ROW
BEGIN
  IF NEW.fecha_ejecucion IS NOT NULL AND OLD.fecha_ejecucion IS NULL THEN
    SET NEW.estado = 'realizada';
  END IF;
END$$

-- Validate profesional is active when creating session
CREATE TRIGGER trg_sesion_profesional_activo
BEFORE INSERT ON sesion
FOR EACH ROW
BEGIN
  DECLARE prof_activo BOOLEAN;
  
  SELECT activo INTO prof_activo FROM profesional WHERE id = NEW.profesional_id;
  IF prof_activo = FALSE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Profesional debe estar activo';
  END IF;
END$$

-- Validate box is active when creating session
CREATE TRIGGER trg_sesion_box_activo
BEFORE INSERT ON sesion
FOR EACH ROW
BEGIN
  DECLARE box_activo BOOLEAN;
  
  SELECT activo INTO box_activo FROM box WHERE id = NEW.box_id;
  IF box_activo = FALSE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Box debe estar activo';
  END IF;
END$$

-- Validate sucursal is active when creating session
CREATE TRIGGER trg_sesion_sucursal_activa
BEFORE INSERT ON sesion
FOR EACH ROW
BEGIN
  DECLARE suc_activa BOOLEAN;
  
  SELECT activo INTO suc_activa FROM sucursal WHERE id = NEW.sucursal_id;
  IF suc_activa = FALSE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sucursal debe estar activa';
  END IF;
END$$

-- Validate venta has valid ficha and tratamiento before creating session
CREATE TRIGGER trg_sesion_venta_valida
BEFORE INSERT ON sesion
FOR EACH ROW
BEGIN
  DECLARE v_ficha_id BIGINT;
  DECLARE v_tratamiento_id BIGINT;
  DECLARE v_duracion_tratamiento INT;
  
  -- Verificar que la venta existe y tiene ficha y tratamiento válidos
  SELECT ficha_id, tratamiento_id INTO v_ficha_id, v_tratamiento_id
  FROM venta WHERE id = NEW.venta_id;
  
  IF v_ficha_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Venta debe tener una ficha válida';
  END IF;
  
  IF v_tratamiento_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Venta debe tener un tratamiento válido';
  END IF;
  
  -- Verificar que el tratamiento tiene duración definida
  SELECT duracion_sesion_min INTO v_duracion_tratamiento
  FROM tratamiento WHERE id = v_tratamiento_id;
  
  IF v_duracion_tratamiento IS NULL OR v_duracion_tratamiento <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tratamiento debe tener duración válida mayor a 0';
  END IF;
  
  -- Validar que la fecha_planificada es futura
  IF NEW.fecha_planificada IS NULL OR NEW.fecha_planificada <= NOW() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fecha_planificada debe ser futura';
  END IF;
END$$

DELIMITER ;

-- Optional: Keep sesion.estado transitions coherent (planificada->confirmada/realizada/cancelada/no_show)
-- (Could be strengthened later with a dedicated state machine)

-- ---------- Views for convenience ----------

CREATE OR REPLACE VIEW v_venta_progreso AS
SELECT
  v.id AS venta_id,
  v.ficha_id,
  v.cantidad_sesiones AS total_sesiones,
  COALESCE(SUM(CASE WHEN s.estado = 'realizada' THEN 1 ELSE 0 END), 0) AS realizadas,
  v.cantidad_sesiones - COALESCE(SUM(CASE WHEN s.estado = 'realizada' THEN 1 ELSE 0 END), 0) AS pendientes
FROM venta v
LEFT JOIN sesion s ON s.venta_id = v.id
GROUP BY v.id;

CREATE OR REPLACE VIEW v_plan_vs_ejecucion AS
SELECT
  s.id AS sesion_id,
  s.venta_id,
  s.numero_sesion,
  s.fecha_planificada,
  s.fecha_ejecucion,
  TIMESTAMPDIFF(MINUTE, s.fecha_planificada, s.fecha_ejecucion) AS desfase_minutos,
  s.estado
FROM sesion s;

-- Vista para ofertas aplicables (activas y en fecha)
CREATE OR REPLACE VIEW v_ofertas_aplicables AS
SELECT 
  o.*,
  CASE 
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin IS NULL THEN TRUE
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin IS NOT NULL AND o.fecha_fin >= CURDATE() THEN TRUE
    WHEN o.fecha_fin IS NULL AND o.fecha_inicio IS NOT NULL AND o.fecha_inicio <= CURDATE() THEN TRUE
    WHEN o.fecha_inicio IS NOT NULL AND o.fecha_fin IS NOT NULL AND CURDATE() BETWEEN o.fecha_inicio AND o.fecha_fin THEN TRUE
    ELSE FALSE
  END AS aplicable_hoy
FROM oferta o
WHERE o.activo = TRUE;

-- Vista para ofertas por pack con descuentos
CREATE OR REPLACE VIEW v_ofertas_pack AS
SELECT 
  o.id AS oferta_id,
  o.nombre AS oferta_nombre,
  o.tipo,
  o.porc_descuento AS descuento_general,
  op.porc_descuento AS descuento_pack,
  p.id AS pack_id,
  p.nombre AS pack_nombre,
  p.tratamiento_id,
  t.nombre AS tratamiento_nombre,
  o.combinable,
  o.prioridad,
  o.fecha_inicio,
  o.fecha_fin,
  CASE 
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin IS NULL THEN TRUE
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin IS NOT NULL AND o.fecha_fin >= CURDATE() THEN TRUE
    WHEN o.fecha_fin IS NULL AND o.fecha_inicio IS NOT NULL AND o.fecha_inicio <= CURDATE() THEN TRUE
    WHEN o.fecha_inicio IS NOT NULL AND o.fecha_fin IS NOT NULL AND CURDATE() BETWEEN o.fecha_inicio AND o.fecha_fin THEN TRUE
    ELSE FALSE
  END AS aplicable_hoy
FROM oferta o
JOIN oferta_pack op ON o.id = op.oferta_id
JOIN pack p ON op.pack_id = p.id
JOIN tratamiento t ON p.tratamiento_id = t.id
WHERE o.activo = TRUE AND p.activo = TRUE;

-- Vista para ofertas por tratamiento
CREATE OR REPLACE VIEW v_ofertas_tratamiento AS
SELECT 
  o.id AS oferta_id,
  o.nombre AS oferta_nombre,
  o.tipo,
  o.porc_descuento AS descuento_general,
  ot.porc_descuento AS descuento_tratamiento,
  t.id AS tratamiento_id,
  t.nombre AS tratamiento_nombre,
  o.combinable,
  o.prioridad,
  o.fecha_inicio,
  o.fecha_fin,
  CASE 
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin IS NULL THEN TRUE
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin IS NOT NULL AND o.fecha_fin >= CURDATE() THEN TRUE
    WHEN o.fecha_fin IS NULL AND o.fecha_inicio IS NOT NULL AND o.fecha_inicio <= CURDATE() THEN TRUE
    WHEN o.fecha_inicio IS NOT NULL AND o.fecha_fin IS NOT NULL AND CURDATE() BETWEEN o.fecha_inicio AND o.fecha_fin THEN TRUE
    ELSE FALSE
  END AS aplicable_hoy
FROM oferta o
JOIN oferta_tratamiento ot ON o.id = ot.oferta_id
JOIN tratamiento t ON ot.tratamiento_id = t.id
WHERE o.activo = TRUE AND t.activo = TRUE;

-- Vista para ofertas combo
CREATE OR REPLACE VIEW v_ofertas_combo AS
SELECT 
  o.id AS oferta_id,
  o.nombre AS oferta_nombre,
  o.tipo,
  oc.min_packs,
  oc.porc_descuento_adicional,
  oc.id AS oferta_combo_id,
  p.id AS pack_id,
  p.nombre AS pack_nombre,
  p.tratamiento_id,
  t.nombre AS tratamiento_nombre,
  o.combinable,
  o.prioridad,
  o.fecha_inicio,
  o.fecha_fin,
  CASE 
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin IS NULL THEN TRUE
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin IS NOT NULL AND o.fecha_fin >= CURDATE() THEN TRUE
    WHEN o.fecha_fin IS NULL AND o.fecha_inicio IS NOT NULL AND o.fecha_inicio <= CURDATE() THEN TRUE
    WHEN o.fecha_inicio IS NOT NULL AND o.fecha_fin IS NOT NULL AND CURDATE() BETWEEN o.fecha_inicio AND o.fecha_fin THEN TRUE
    ELSE FALSE
  END AS aplicable_hoy
FROM oferta o
JOIN oferta_combo oc ON o.id = oc.oferta_id
JOIN oferta_combo_pack ocp ON oc.id = ocp.oferta_combo_id
JOIN pack p ON ocp.pack_id = p.id
JOIN tratamiento t ON p.tratamiento_id = t.id
WHERE o.activo = TRUE AND p.activo = TRUE;

-- Vista para sesiones con informacion completa
CREATE OR REPLACE VIEW v_sesiones_completas AS
SELECT 
  s.*,
  f.codigo AS ficha_codigo,
  f.nombres AS paciente_nombres,
  f.apellidos AS paciente_apellidos,
  f.telefono AS paciente_telefono,
  f.email AS paciente_email,
  v.cantidad_sesiones,
  v.estado AS venta_estado,
  t.nombre AS tratamiento_nombre,
  p.nombre AS pack_nombre,
  COALESCE(p.duracion_sesion_min, t.duracion_sesion_min) AS duracion,
  prof.nombre AS profesional_nombre,
  prof.tipo_profesional,
  suc.nombre AS sucursal_nombre,
  b.nombre AS box_nombre,
  CONCAT(s.numero_sesion, ' de ', v.cantidad_sesiones) AS sesion_progreso
FROM sesion s
JOIN venta v ON s.venta_id = v.id
JOIN ficha f ON v.ficha_id = f.id
JOIN tratamiento t ON v.tratamiento_id = t.id
LEFT JOIN pack p ON v.pack_id = p.id
JOIN profesional prof ON s.profesional_id = prof.id
JOIN sucursal suc ON s.sucursal_id = suc.id
JOIN box b ON s.box_id = b.id;

-- Vista para ventas con informacion completa
CREATE OR REPLACE VIEW v_ventas_completas AS
SELECT 
  v.*,
  f.codigo AS ficha_codigo,
  f.nombres AS paciente_nombres,
  f.apellidos AS paciente_apellidos,
  f.telefono AS paciente_telefono,
  f.email AS paciente_email,
  t.nombre AS tratamiento_nombre,
  p.nombre AS pack_nombre,
  p.duracion_sesion_min,
  e.precio_sugerido,
  e.sesiones_sugeridas,
  e.observaciones AS evaluacion_observaciones,
  prof.nombre AS profesional_nombre,
  prof.tipo_profesional,
  (v.precio_lista - v.total_pagado) AS descuento_total,
  CASE 
    WHEN v.descuento_manual_pct IS NOT NULL THEN (v.precio_lista * v.descuento_manual_pct / 100)
    ELSE 0
  END AS descuento_manual_monto,
  vp.realizadas,
  vp.pendientes
FROM venta v
JOIN ficha f ON v.ficha_id = f.id
JOIN tratamiento t ON v.tratamiento_id = t.id
LEFT JOIN pack p ON v.pack_id = p.id
LEFT JOIN evaluacion e ON v.evaluacion_id = e.id
LEFT JOIN profesional prof ON e.profesional_id = prof.id
LEFT JOIN v_venta_progreso vp ON v.id = vp.venta_id;

-- Vista para reporte de ofertas aplicadas
CREATE OR REPLACE VIEW v_reporte_ofertas AS
SELECT 
  vo.venta_id,
  vo.secuencia,
  o.nombre AS oferta_nombre,
  o.tipo AS oferta_tipo,
  vo.porc_descuento,
  vo.monto_descuento,
  v.precio_lista,
  v.total_pagado,
  f.codigo AS ficha_codigo,
  CONCAT(f.nombres, ' ', f.apellidos) AS paciente_nombre,
  v.fecha_creacion
FROM venta_oferta vo
JOIN oferta o ON vo.oferta_id = o.id
JOIN venta v ON vo.venta_id = v.id
JOIN ficha f ON v.ficha_id = f.id
ORDER BY vo.venta_id, vo.secuencia;

-- Vista para disponibilidad de profesionales
CREATE OR REPLACE VIEW v_disponibilidad_profesionales AS
SELECT 
  prof.id AS profesional_id,
  prof.nombre AS profesional_nombre,
  prof.tipo_profesional,
  suc.id AS sucursal_id,
  suc.nombre AS sucursal_nombre,
  b.id AS box_id,
  b.nombre AS box_nombre,
  COUNT(s.id) AS sesiones_agendadas,
  SUM(CASE WHEN s.estado = 'planificada' THEN 1 ELSE 0 END) AS sesiones_pendientes,
  SUM(CASE WHEN s.estado = 'realizada' THEN 1 ELSE 0 END) AS sesiones_realizadas
FROM profesional prof
CROSS JOIN sucursal suc
CROSS JOIN box b
LEFT JOIN sesion s ON s.profesional_id = prof.id 
  AND s.sucursal_id = suc.id 
  AND s.box_id = b.id
  AND s.fecha_planificada >= CURDATE()
WHERE prof.activo = TRUE 
  AND suc.activo = TRUE 
  AND b.activo = TRUE
  AND b.sucursal_id = suc.id
GROUP BY prof.id, prof.nombre, prof.tipo_profesional, suc.id, suc.nombre, b.id, b.nombre;

-- =============================================================================
-- STORED PROCEDURES - TODA LA LoGICA DE NEGOCIO
-- =============================================================================

-- ---------- FICHAS ----------

-- FIC-001: Crear ficha con codigo unico
DELIMITER $$
CREATE PROCEDURE sp_crear_ficha(
    IN p_codigo VARCHAR(40),
    IN p_nombres VARCHAR(120),
    IN p_apellidos VARCHAR(120),
    IN p_rut VARCHAR(20),
    IN p_telefono VARCHAR(50),
    IN p_email VARCHAR(120),
    IN p_fecha_nacimiento DATE,
    IN p_direccion TEXT,
    IN p_observaciones TEXT,
    OUT p_ficha_id BIGINT
)
BEGIN
    DECLARE v_existing_id BIGINT DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Verificar si ya existe una ficha con el mismo codigo o email
    SELECT id INTO v_existing_id FROM ficha WHERE codigo = p_codigo OR email = p_email LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
        -- Si ya existe, devolver el ID existente
        SET p_ficha_id = v_existing_id;
    ELSE
        -- Si no existe, crear nueva ficha
        INSERT INTO ficha (codigo, nombres, apellidos, rut, telefono, email, fecha_nacimiento, direccion, observaciones)
        VALUES (p_codigo, p_nombres, p_apellidos, p_rut, p_telefono, p_email, p_fecha_nacimiento, p_direccion, p_observaciones);
    
    SET p_ficha_id = LAST_INSERT_ID();
    END IF;
    
    COMMIT;
END$$
DELIMITER ;

-- FIC-002: Buscar fichas por criterios
DELIMITER $$
CREATE PROCEDURE sp_buscar_fichas(
    IN p_busqueda VARCHAR(200)
)
BEGIN
    SELECT * FROM ficha 
    WHERE LOWER(codigo) LIKE CONCAT('%', LOWER(p_busqueda), '%')
       OR LOWER(nombres) LIKE CONCAT('%', LOWER(p_busqueda), '%')
       OR LOWER(apellidos) LIKE CONCAT('%', LOWER(p_busqueda), '%')
       OR LOWER(rut) LIKE CONCAT('%', LOWER(p_busqueda), '%')
       OR LOWER(email) LIKE CONCAT('%', LOWER(p_busqueda), '%')
    ORDER BY fecha_creacion DESC;
END$$
DELIMITER ;

-- FIC-003: Agregar ficha especifica desde evaluacion
DELIMITER $$
CREATE PROCEDURE sp_agregar_ficha_especifica(
    IN p_evaluacion_id BIGINT,
    IN p_tipo_id BIGINT,
    IN p_datos JSON,
    IN p_observaciones TEXT,
    OUT p_ficha_especifica_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO ficha_especifica (evaluacion_id, tipo_id, datos, observaciones)
    VALUES (p_evaluacion_id, p_tipo_id, p_datos, p_observaciones);
    
    SET p_ficha_especifica_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- ---------- EVALUACIONES ----------

-- EVA-001: Crear evaluacion
DELIMITER $$
CREATE PROCEDURE sp_crear_evaluacion(
    IN p_ficha_id BIGINT,
    IN p_profesional_id BIGINT,
    IN p_tratamiento_id BIGINT,
    IN p_pack_id BIGINT,
    IN p_precio_sugerido DECIMAL(12,2),
    IN p_sesiones_sugeridas INT,
    IN p_observaciones TEXT,
    IN p_recomendaciones TEXT,
    OUT p_evaluacion_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO evaluacion (ficha_id, profesional_id, tratamiento_id, pack_id, precio_sugerido, sesiones_sugeridas, observaciones, recomendaciones, estado)
    VALUES (p_ficha_id, p_profesional_id, p_tratamiento_id, p_pack_id, p_precio_sugerido, p_sesiones_sugeridas, p_observaciones, p_recomendaciones, 'COMPLETADA');
    
    SET p_evaluacion_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- ---------- VENTAS ----------

-- VEN-001: Crear venta desde evaluacion
DELIMITER $$
CREATE PROCEDURE sp_crear_venta(
    IN p_ficha_id BIGINT,
    IN p_evaluacion_id BIGINT,
    IN p_ficha_especifica_id BIGINT,
    IN p_tratamiento_id BIGINT,
    IN p_pack_id BIGINT,
    IN p_cantidad_sesiones INT,
    IN p_precio_lista DECIMAL(12,2),
    IN p_descuento_manual_pct DECIMAL(5,2),
    IN p_genero ENUM('M', 'F', 'U'),
    IN p_genero_indicado_por BIGINT,
    OUT p_venta_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO venta (ficha_id, evaluacion_id, ficha_especifica_id, tratamiento_id, pack_id, cantidad_sesiones, precio_lista, descuento_manual_pct, genero, genero_indicado_por, observaciones)
    VALUES (p_ficha_id, p_evaluacion_id, p_ficha_especifica_id, p_tratamiento_id, p_pack_id, p_cantidad_sesiones, p_precio_lista, p_descuento_manual_pct, p_genero, p_genero_indicado_por, 'Venta normal');
    
    SET p_venta_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- VEN-002: Crear venta de evaluación (sin ficha específica)
DELIMITER $$
CREATE PROCEDURE sp_crear_venta_evaluacion(
    IN p_ficha_id BIGINT,
    IN p_tratamiento_id BIGINT,
    IN p_pack_id BIGINT,
    IN p_cantidad_sesiones INT,
    IN p_precio_lista DECIMAL(12,2),
    IN p_descuento_manual_pct DECIMAL(5,2),
    IN p_genero ENUM('M', 'F', 'U'),
    IN p_genero_indicado_por BIGINT,
    OUT p_venta_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Para evaluación, evaluacion_id y ficha_especifica_id son NULL
    INSERT INTO venta (ficha_id, evaluacion_id, ficha_especifica_id, tratamiento_id, pack_id, cantidad_sesiones, precio_lista, descuento_manual_pct, genero, genero_indicado_por, observaciones)
    VALUES (p_ficha_id, NULL, NULL, p_tratamiento_id, p_pack_id, p_cantidad_sesiones, p_precio_lista, p_descuento_manual_pct, p_genero, p_genero_indicado_por, 'Venta de evaluación inicial');
    
    SET p_venta_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- VEN-003: Aplicar descuento manual
DELIMITER $$
CREATE PROCEDURE sp_aplicar_descuento_manual(
    IN p_venta_id BIGINT,
    IN p_descuento_manual_pct DECIMAL(5,2)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE venta 
    SET descuento_manual_pct = p_descuento_manual_pct
    WHERE id = p_venta_id;
    
    COMMIT;
END$$
DELIMITER ;

-- VEN-003: Aplicar ofertas automaticamente
DELIMITER $$
CREATE PROCEDURE sp_aplicar_ofertas(
    IN p_venta_id BIGINT
)
BEGIN
    DECLARE v_precio_lista DECIMAL(12,2);
    DECLARE v_pack_id BIGINT;
    DECLARE v_tratamiento_id BIGINT;
    DECLARE v_secuencia INT DEFAULT 0;
    DECLARE v_oferta_id BIGINT;
    DECLARE v_porc_descuento DECIMAL(5,2);
    DECLARE v_monto_descuento DECIMAL(12,2);
    DECLARE v_precio_actual DECIMAL(12,2);
    DECLARE v_prioridad INT;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE oferta_cursor CURSOR FOR
        SELECT o.id, op.porc_descuento, o.prioridad
        FROM oferta o
        JOIN oferta_pack op ON o.id = op.oferta_id
        WHERE op.pack_id = v_pack_id
          AND o.activo = TRUE
          AND o.combinable = TRUE
          AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
          AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
        
        UNION ALL
        
        SELECT o.id, ot.porc_descuento, o.prioridad
        FROM oferta o
        JOIN oferta_tratamiento ot ON o.id = ot.oferta_id
        WHERE ot.tratamiento_id = v_tratamiento_id
          AND o.activo = TRUE
          AND o.combinable = TRUE
          AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
          AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
        
        ORDER BY prioridad ASC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Obtener datos de la venta
    SELECT precio_lista, pack_id, tratamiento_id INTO v_precio_lista, v_pack_id, v_tratamiento_id
    FROM venta WHERE id = p_venta_id;
    
    SET v_precio_actual = v_precio_lista;
    
    -- Aplicar ofertas por pack y tratamiento en orden de prioridad
    OPEN oferta_cursor;
    
    read_loop: LOOP
        FETCH oferta_cursor INTO v_oferta_id, v_porc_descuento, v_prioridad;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET v_secuencia = v_secuencia + 1;
        SET v_monto_descuento = (v_precio_actual * v_porc_descuento) / 100;
        
        INSERT INTO venta_oferta (venta_id, oferta_id, secuencia, porc_descuento, monto_descuento)
        VALUES (p_venta_id, v_oferta_id, v_secuencia, v_porc_descuento, v_monto_descuento);
        
        SET v_precio_actual = v_precio_actual - v_monto_descuento;
    END LOOP;
    
    CLOSE oferta_cursor;
    
    COMMIT;
END$$
DELIMITER ;

-- ---------- AGENDA ----------

-- AGE-001: Agendar sesion
DELIMITER $$
CREATE PROCEDURE sp_agendar_sesion(
    IN p_venta_id BIGINT,
    IN p_numero_sesion INT,
    IN p_sucursal_id BIGINT,
    IN p_box_id BIGINT,
    IN p_profesional_id BIGINT,
    IN p_fecha_planificada TIMESTAMP,
    IN p_observaciones TEXT,
    OUT p_sesion_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
            INSERT INTO sesion (
            venta_id, numero_sesion, sucursal_id, box_id, profesional_id, 
            fecha_planificada, observaciones, intensidades_zonas, datos_sesion
        )
        VALUES (
            p_venta_id, p_numero_sesion, p_sucursal_id, p_box_id, p_profesional_id,
            p_fecha_planificada, p_observaciones, '{}', '{}'
        );
    
    SET p_sesion_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- AGE-002: Generar plan completo de sesiones
DELIMITER $$
CREATE PROCEDURE sp_generar_plan_sesiones(
    IN p_venta_id BIGINT,
    IN p_sucursal_id BIGINT,
    IN p_box_id BIGINT,
    IN p_profesional_id BIGINT,
    IN p_fecha_inicio TIMESTAMP,
    IN p_duracion_minutos INT
)
BEGIN
    DECLARE v_cantidad_sesiones INT;
    DECLARE v_sesion_actual INT DEFAULT 1;
    DECLARE v_fecha_actual TIMESTAMP;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Obtener cantidad de sesiones de la venta
    SELECT cantidad_sesiones INTO v_cantidad_sesiones
    FROM venta WHERE id = p_venta_id;
    
    SET v_fecha_actual = p_fecha_inicio;
    
    -- Generar sesiones faltantes
    WHILE v_sesion_actual <= v_cantidad_sesiones DO
        -- Verificar si la sesion ya existe
        IF NOT EXISTS (SELECT 1 FROM sesion WHERE venta_id = p_venta_id AND numero_sesion = v_sesion_actual) THEN
            INSERT INTO sesion (venta_id, numero_sesion, sucursal_id, box_id, profesional_id, fecha_planificada)
            VALUES (p_venta_id, v_sesion_actual, p_sucursal_id, p_box_id, p_profesional_id, v_fecha_actual);
        END IF;
        
        SET v_sesion_actual = v_sesion_actual + 1;
        SET v_fecha_actual = DATE_ADD(v_fecha_actual, INTERVAL p_duracion_minutos MINUTE);
    END WHILE;
    
    COMMIT;
END$$
DELIMITER ;

-- AGE-003: Confirmar paciente
DELIMITER $$
CREATE PROCEDURE sp_confirmar_paciente(
    IN p_sesion_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE sesion 
    SET paciente_confirmado = TRUE
    WHERE id = p_sesion_id;
    
    COMMIT;
END$$
DELIMITER ;

-- AGE-004: Abrir sesion
DELIMITER $$
CREATE PROCEDURE sp_abrir_sesion(
    IN p_sesion_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE sesion 
    SET abierta_en = NOW()
    WHERE id = p_sesion_id;
    
    COMMIT;
END$$
DELIMITER ;

-- AGE-005: Cerrar sesion
DELIMITER $$
CREATE PROCEDURE sp_cerrar_sesion(
    IN p_sesion_id BIGINT,
    IN p_observaciones TEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE sesion 
    SET cerrada_en = NOW(),
        fecha_ejecucion = NOW(),
        observaciones = p_observaciones
    WHERE id = p_sesion_id;
    
    COMMIT;
END$$
DELIMITER ;

-- AGE-006: Reprogramar sesion
DELIMITER $$
CREATE PROCEDURE sp_reprogramar_sesion(
    IN p_sesion_id BIGINT,
    IN p_nueva_fecha TIMESTAMP
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE sesion 
    SET fecha_planificada = p_nueva_fecha
    WHERE id = p_sesion_id;
    
    COMMIT;
END$$
DELIMITER ;

-- AGE-007: Cancelar sesion
DELIMITER $$
CREATE PROCEDURE sp_cancelar_sesion(
    IN p_sesion_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Validar que la sesión existe y no está completada
    IF NOT EXISTS (SELECT 1 FROM sesion WHERE id = p_sesion_id AND estado != 'completada') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sesión no encontrada o ya completada';
    END IF;
    
    -- Cancelar la sesión (soft delete)
    UPDATE sesion 
    SET estado = 'cancelada',
        actualizado_en = NOW()
    WHERE id = p_sesion_id;
    
    COMMIT;
END$$
DELIMITER ;

-- ---------- OFERTAS ----------

-- OFE-001: Crear oferta pack temporal
DELIMITER $$
CREATE PROCEDURE sp_crear_oferta_pack(
    IN p_nombre VARCHAR(150),
    IN p_porc_descuento DECIMAL(5,2),
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    IN p_combinable BOOLEAN,
    IN p_prioridad INT,
    OUT p_oferta_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO oferta (nombre, tipo, porc_descuento, fecha_inicio, fecha_fin, combinable, prioridad)
    VALUES (p_nombre, 'pack_temporal', p_porc_descuento, p_fecha_inicio, p_fecha_fin, p_combinable, p_prioridad);
    
    SET p_oferta_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- OFE-002: Crear oferta por tratamiento
DELIMITER $$
CREATE PROCEDURE sp_crear_oferta_tratamiento(
    IN p_nombre VARCHAR(150),
    IN p_porc_descuento DECIMAL(5,2),
    IN p_tratamiento_id BIGINT,
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    IN p_combinable BOOLEAN,
    IN p_prioridad INT,
    OUT p_oferta_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO oferta (nombre, tipo, porc_descuento, fecha_inicio, fecha_fin, combinable, prioridad)
    VALUES (p_nombre, 'tratamiento_temporal', p_porc_descuento, p_fecha_inicio, p_fecha_fin, p_combinable, p_prioridad);
    
    SET p_oferta_id = LAST_INSERT_ID();
    
    INSERT INTO oferta_tratamiento (oferta_id, tratamiento_id, porc_descuento)
    VALUES (p_oferta_id, p_tratamiento_id, p_porc_descuento);
    
    COMMIT;
END$$
DELIMITER ;

-- OFE-003: Crear oferta combo
DELIMITER $$
CREATE PROCEDURE sp_crear_oferta_combo(
    IN p_nombre VARCHAR(150),
    IN p_porc_descuento DECIMAL(5,2),
    IN p_min_packs INT,
    IN p_porc_descuento_adicional DECIMAL(5,2),
    IN p_combinable BOOLEAN,
    IN p_prioridad INT,
    OUT p_oferta_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO oferta (nombre, tipo, porc_descuento, combinable, prioridad)
    VALUES (p_nombre, 'combo_packs', p_porc_descuento, p_combinable, p_prioridad);
    
    SET p_oferta_id = LAST_INSERT_ID();
    
    INSERT INTO oferta_combo (oferta_id, min_packs, porc_descuento_adicional)
    VALUES (p_oferta_id, p_min_packs, p_porc_descuento_adicional);
    
    COMMIT;
END$$
DELIMITER ;

-- Crear oferta pack temporal
DELIMITER $$
CREATE PROCEDURE sp_crear_oferta_pack_temporal(
    IN p_nombre VARCHAR(150),
    IN p_porc_descuento DECIMAL(5,2),
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    IN p_combinable BOOLEAN,
    IN p_sesiones_minimas INT,
    OUT p_oferta_id BIGINT
)
BEGIN
    INSERT INTO oferta (nombre, tipo, descripcion, porc_descuento, sesiones_minimas, fecha_inicio, fecha_fin, combinable, activo, prioridad)
    VALUES (p_nombre, 'pack', p_nombre, p_porc_descuento, p_sesiones_minimas, p_fecha_inicio, p_fecha_fin, p_combinable, TRUE, 0);
    SET p_oferta_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- Crear zona del cuerpo
DELIMITER $$
CREATE PROCEDURE sp_crear_zona_cuerpo(
    IN p_codigo VARCHAR(50),
    IN p_nombre VARCHAR(100),
    IN p_categoria VARCHAR(50),
    IN p_precio_base DECIMAL(12,2),
    OUT p_zona_id VARCHAR(50)
)
BEGIN
    INSERT INTO zona_cuerpo (codigo, nombre, categoria, precio_base, activo)
    VALUES (p_codigo, p_nombre, p_categoria, p_precio_base, TRUE)
    ON DUPLICATE KEY UPDATE 
        nombre = p_nombre,
        categoria = p_categoria,
        precio_base = p_precio_base,
        activo = TRUE;
    SET p_zona_id = p_codigo;
END$$
DELIMITER ;

-- Asociar oferta con pack
DELIMITER $$
CREATE PROCEDURE sp_asociar_oferta_pack(
    IN p_oferta_id BIGINT,
    IN p_pack_id BIGINT,
    IN p_porc_descuento DECIMAL(5,2),
    OUT p_asociacion_id BIGINT
)
BEGIN
    INSERT INTO oferta_pack (oferta_id, pack_id, porc_descuento)
    VALUES (p_oferta_id, p_pack_id, p_porc_descuento)
    ON DUPLICATE KEY UPDATE 
        porc_descuento = p_porc_descuento;
    SET p_asociacion_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- ---------- PROFESIONALES ----------

-- PRO-001: Crear profesional
DELIMITER $$
CREATE PROCEDURE sp_crear_profesional(
    IN p_nombre VARCHAR(150),
    IN p_tipo_profesional VARCHAR(80),
    IN p_bio TEXT,
    IN p_foto_url TEXT,
    OUT p_profesional_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO profesional (nombre, tipo_profesional, bio, foto_url)
    VALUES (p_nombre, p_tipo_profesional, p_bio, p_foto_url);
    
    SET p_profesional_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- PRO-002: Obtener disponibilidad
DELIMITER $$
CREATE PROCEDURE sp_obtener_disponibilidad(
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    IN p_profesional_id BIGINT,
    IN p_sucursal_id BIGINT,
    IN p_box_id BIGINT
)
BEGIN
    SELECT 
        prof.id AS profesional_id,
        prof.nombre AS profesional_nombre,
        prof.tipo_profesional,
        suc.id AS sucursal_id,
        suc.nombre AS sucursal_nombre,
        b.id AS box_id,
        b.nombre AS box_nombre,
        s.fecha_planificada,
        s.estado
    FROM profesional prof
    CROSS JOIN sucursal suc
    CROSS JOIN box b
    LEFT JOIN sesion s ON s.profesional_id = prof.id 
        AND s.sucursal_id = suc.id 
        AND s.box_id = b.id
        AND DATE(s.fecha_planificada) BETWEEN p_fecha_inicio AND p_fecha_fin
    WHERE prof.activo = TRUE 
        AND suc.activo = TRUE 
        AND b.activo = TRUE
        AND b.sucursal_id = suc.id
        AND (p_profesional_id IS NULL OR prof.id = p_profesional_id)
        AND (p_sucursal_id IS NULL OR suc.id = p_sucursal_id)
        AND (p_box_id IS NULL OR b.id = p_box_id)
    ORDER BY prof.nombre, s.fecha_planificada;
END$$
DELIMITER ;

-- ---------- REPORTES ----------

-- REP-001: Reporte de progreso de ventas
DELIMITER $$
CREATE PROCEDURE sp_reporte_progreso_ventas(
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE
)
BEGIN
    SELECT 
        v.*,
        f.codigo AS ficha_codigo,
        CONCAT(f.nombres, ' ', f.apellidos) AS paciente_nombre,
        t.nombre AS tratamiento_nombre,
        p.nombre AS pack_nombre,
        vp.total_sesiones,
        vp.realizadas,
        vp.pendientes,
        ROUND((vp.realizadas / vp.total_sesiones) * 100, 2) AS porcentaje_completado
    FROM venta v
    JOIN ficha f ON v.ficha_id = f.id
    JOIN tratamiento t ON v.tratamiento_id = t.id
    LEFT JOIN pack p ON v.pack_id = p.id
    LEFT JOIN v_venta_progreso vp ON v.id = vp.venta_id
    WHERE DATE(v.fecha_creacion) BETWEEN p_fecha_inicio AND p_fecha_fin
    ORDER BY v.fecha_creacion DESC;
END$$
DELIMITER ;

-- REP-002: Reporte plan vs ejecucion
DELIMITER $$
CREATE PROCEDURE sp_reporte_plan_vs_ejecucion(
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE
)
BEGIN
    SELECT 
        s.*,
        f.codigo AS ficha_codigo,
        CONCAT(f.nombres, ' ', f.apellidos) AS paciente_nombre,
        t.nombre AS tratamiento_nombre,
        prof.nombre AS profesional_nombre,
        suc.nombre AS sucursal_nombre,
        b.nombre AS box_nombre,
        pve.desfase_minutos,
        CASE 
            WHEN pve.desfase_minutos > 15 THEN 'Retraso'
            WHEN pve.desfase_minutos < -15 THEN 'Adelanto'
            ELSE 'A tiempo'
        END AS estado_puntualidad
    FROM sesion s
    JOIN venta v ON s.venta_id = v.id
    JOIN ficha f ON v.ficha_id = f.id
    JOIN tratamiento t ON v.tratamiento_id = t.id
    JOIN profesional prof ON s.profesional_id = prof.id
    JOIN sucursal suc ON s.sucursal_id = suc.id
    JOIN box b ON s.box_id = b.id
    JOIN v_plan_vs_ejecucion pve ON s.id = pve.sesion_id
    WHERE s.fecha_ejecucion IS NOT NULL
        AND DATE(s.fecha_ejecucion) BETWEEN p_fecha_inicio AND p_fecha_fin
    ORDER BY s.fecha_ejecucion DESC;
END$$
DELIMITER ;

-- ---------- UTILITARIOS ----------

-- Obtener ofertas aplicables para una venta
DELIMITER $$
CREATE PROCEDURE sp_ofertas_aplicables_venta(
    IN p_venta_id BIGINT
)
BEGIN
    DECLARE v_pack_id BIGINT;
    DECLARE v_tratamiento_id BIGINT;
    
    -- Obtener pack y tratamiento de la venta
    SELECT pack_id, tratamiento_id INTO v_pack_id, v_tratamiento_id FROM venta WHERE id = p_venta_id;
    
    -- Ofertas por pack
    SELECT 'pack' AS tipo, o.*, op.porc_descuento AS descuento_especifico
    FROM oferta o
    JOIN oferta_pack op ON o.id = op.oferta_id
    WHERE op.pack_id = v_pack_id
      AND o.activo = TRUE
      AND o.combinable = TRUE
      AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
      AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
    
    UNION ALL
    
    -- Ofertas por tratamiento
    SELECT 'tratamiento' AS tipo, o.*, ot.porc_descuento AS descuento_especifico
    FROM oferta o
    JOIN oferta_tratamiento ot ON o.id = ot.oferta_id
    WHERE ot.tratamiento_id = v_tratamiento_id
      AND o.activo = TRUE
      AND o.combinable = TRUE
      AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
      AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
    
    UNION ALL
    
    -- Ofertas combo
    SELECT 'combo' AS tipo, o.*, o.porc_descuento AS descuento_especifico
    FROM oferta o
    JOIN oferta_combo oc ON o.id = oc.oferta_id
    WHERE o.activo = TRUE
      AND o.combinable = TRUE
      AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
      AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
    
    ORDER BY prioridad ASC;
END$$
DELIMITER ;

-- Obtener sesiones de una venta
DELIMITER $$
CREATE PROCEDURE sp_sesiones_venta(
    IN p_venta_id BIGINT
)
BEGIN
    SELECT * FROM v_sesiones_completas
    WHERE venta_id = p_venta_id
    ORDER BY numero_sesion;
END$$
DELIMITER ;

-- Obtener venta completa con toda la informacion
DELIMITER $$
CREATE PROCEDURE sp_venta_completa(
    IN p_venta_id BIGINT
)
BEGIN
    SELECT * FROM v_ventas_completas
    WHERE id = p_venta_id;
END$$
DELIMITER ;

-- ---------- DEPILACIoN Y ZONAS DEL CUERPO ----------

-- DEP-001: Guardar intensidades por zona del cuerpo
DELIMITER $$
CREATE PROCEDURE sp_guardar_intensidades_zonas(
    IN p_sesion_id BIGINT,
    IN p_intensidades_zonas JSON
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE sesion 
    SET intensidades_zonas = p_intensidades_zonas
    WHERE id = p_sesion_id;
    
    COMMIT;
END$$
DELIMITER ;

-- DEP-002: Cargar intensidades anteriores del paciente
DELIMITER $$
CREATE PROCEDURE sp_cargar_intensidades_anteriores(
    IN p_ficha_id BIGINT,
    IN p_tratamiento_id BIGINT
)
BEGIN
    SELECT s.intensidades_zonas
    FROM sesion s
    JOIN venta v ON s.venta_id = v.id
    WHERE v.ficha_id = p_ficha_id
      AND v.tratamiento_id = p_tratamiento_id
      AND s.intensidades_zonas IS NOT NULL
    ORDER BY s.fecha_ejecucion DESC
    LIMIT 1;
END$$
DELIMITER ;

-- DEP-003: Calcular precio por zonas del cuerpo
DELIMITER $$
CREATE PROCEDURE sp_calcular_precio_zonas(
    IN p_pack_id BIGINT,
    IN p_zonas_seleccionadas JSON,
    OUT p_precio_total DECIMAL(12,2)
)
BEGIN
    DECLARE v_precio_base DECIMAL(12,2) DEFAULT 0;
    DECLARE v_precio_zonas DECIMAL(12,2) DEFAULT 0;
    DECLARE v_zonas_incluidas JSON;
    DECLARE v_precio_por_zona JSON;
    
    -- Obtener informacion del pack
    SELECT zonas_incluidas, precio_por_zona INTO v_zonas_incluidas, v_precio_por_zona
    FROM pack WHERE id = p_pack_id;
    
    -- Calcular precio base del pack
    SELECT precio_lista INTO v_precio_base
    FROM venta WHERE pack_id = p_pack_id LIMIT 1;
    
    -- Calcular diferencia de zonas
    -- (Esta logica se puede expandir segun necesidades especificas)
    SET p_precio_total = v_precio_base + v_precio_zonas;
END$$
DELIMITER ;

-- DEP-004: Guardar firma digital como BLOB
DELIMITER $$
CREATE PROCEDURE sp_guardar_firma_digital(
    IN p_ficha_id BIGINT,
    IN p_ficha_especifica_id BIGINT,
    IN p_profesional_id BIGINT,
    IN p_tipo_consentimiento VARCHAR(50),
    IN p_firma_blob LONGBLOB,
    IN p_tipo_archivo VARCHAR(10),
    IN p_contenido_leido TEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO consentimiento_firma (ficha_id, ficha_especifica_id, profesional_id, tipo_consentimiento, firma_blob, tipo_archivo, contenido_leido, observaciones)
    VALUES (p_ficha_id, p_ficha_especifica_id, p_profesional_id, p_tipo_consentimiento, p_firma_blob, p_tipo_archivo, p_contenido_leido, 'Firma digital guardada')
    ON DUPLICATE KEY UPDATE
        firma_blob = p_firma_blob,
        tipo_archivo = p_tipo_archivo,
        contenido_leido = p_contenido_leido,
        fecha_firma = CURRENT_TIMESTAMP,
        profesional_id = p_profesional_id;
    
    COMMIT;
END$$
DELIMITER ;

-- DEP-005: Verificar si el paciente tiene consentimiento firmado
DELIMITER $$
CREATE PROCEDURE sp_verificar_consentimiento_firmado(
    IN p_ficha_id BIGINT,
    IN p_tipo_consentimiento VARCHAR(50)
)
BEGIN
    SELECT 
        cf.id,
        cf.fecha_firma,
        cf.tipo_archivo,
        p.nombre AS profesional_nombre
    FROM consentimiento_firma cf
    JOIN profesional p ON cf.profesional_id = p.id
    WHERE cf.ficha_id = p_ficha_id 
      AND cf.tipo_consentimiento = p_tipo_consentimiento;
END$$
DELIMITER ;

-- DEP-006: Obtener firma del consentimiento
DELIMITER $$
CREATE PROCEDURE sp_obtener_firma_consentimiento(
    IN p_ficha_id BIGINT,
    IN p_tipo_consentimiento VARCHAR(50)
)
BEGIN
    SELECT 
        firma_blob,
        tipo_archivo,
        fecha_firma,
        profesional_id
    FROM consentimiento_firma
    WHERE ficha_id = p_ficha_id 
      AND tipo_consentimiento = p_tipo_consentimiento;
END$$
DELIMITER ;

-- ---------- GESTIoN DE PRECIOS ----------

-- PRE-001: Crear precio de tratamiento
DELIMITER $$
CREATE PROCEDURE sp_crear_precio_tratamiento(
    IN p_tratamiento_id BIGINT,
    IN p_precio_por_sesion DECIMAL(12,2),
    OUT p_precio_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO precio_tratamiento (tratamiento_id, precio_por_sesion, activo)
    VALUES (p_tratamiento_id, p_precio_por_sesion, TRUE);
    
    SET p_precio_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- PRE-002: Obtener precio actual de tratamiento
DELIMITER $$
CREATE PROCEDURE sp_obtener_precio_tratamiento(
    IN p_tratamiento_id BIGINT
)
BEGIN
    SELECT 
        pt.*,
        t.nombre AS tratamiento_nombre,
        pt.precio_por_sesion AS precio_actual
    FROM precio_tratamiento pt
    JOIN tratamiento t ON pt.tratamiento_id = t.id
    WHERE pt.tratamiento_id = p_tratamiento_id
      AND pt.activo = TRUE
    ORDER BY pt.fecha_creacion DESC
    LIMIT 1;
END$$
DELIMITER ;

-- PRE-003: Actualizar precio de pack
DELIMITER $$
CREATE PROCEDURE sp_actualizar_precio_pack(
    IN p_pack_id BIGINT,
    IN p_precio_total DECIMAL(12,2)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE pack 
    SET precio_total = p_precio_total
    WHERE id = p_pack_id;
    
    COMMIT;
END$$
DELIMITER ;

-- ---------- GESTIoN DE PAGOS ----------

-- PAG-001: Crear pago
DELIMITER $$
CREATE PROCEDURE sp_crear_pago(
    IN p_venta_id BIGINT,
    IN p_monto_total DECIMAL(12,2),
    IN p_observaciones TEXT,
    OUT p_pago_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO pago (venta_id, monto_total, observaciones)
    VALUES (p_venta_id, p_monto_total, p_observaciones);
    
    SET p_pago_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- PAG-002: Agregar detalle de pago
DELIMITER $$
CREATE PROCEDURE sp_agregar_detalle_pago(
    IN p_pago_id BIGINT,
    IN p_monto DECIMAL(12,2),
    IN p_metodo_pago VARCHAR(50),
    IN p_referencia VARCHAR(100),
    IN p_observaciones TEXT,
    OUT p_detalle_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO pago_detalle (pago_id, monto, metodo_pago, referencia, observaciones)
    VALUES (p_pago_id, p_monto, p_metodo_pago, p_referencia, p_observaciones);
    
    SET p_detalle_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- PAG-003: Confirmar pago
DELIMITER $$
CREATE PROCEDURE sp_confirmar_pago(
    IN p_pago_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE pago 
    SET estado = 'pagado'
    WHERE id = p_pago_id;
    
    COMMIT;
END$$
DELIMITER ;

-- PAG-004: Obtener pagos de una venta
DELIMITER $$
CREATE PROCEDURE sp_obtener_pagos_venta(
    IN p_venta_id BIGINT
)
BEGIN
    SELECT 
        p.*,
        pd.id AS detalle_id,
        pd.monto,
        pd.metodo_pago,
        pd.referencia,
        pd.observaciones AS detalle_observaciones,
        pd.fecha_pago
    FROM pago p
    LEFT JOIN pago_detalle pd ON p.id = pd.pago_id
    WHERE p.venta_id = p_venta_id
    ORDER BY p.fecha_creacion DESC, pd.fecha_pago DESC;
END$$
DELIMITER ;

-- ---------- GESTIoN DE TRATAMIENTOS Y PACKS ----------

-- TRA-001: Obtener tratamientos disponibles
DELIMITER $$
CREATE PROCEDURE sp_obtener_tratamientos_disponibles()
BEGIN
    SELECT 
        t.id,
        t.nombre,
        t.descripcion,
        t.duracion_sesion_min,
        t.frecuencia_recomendada_dias,
        COUNT(p.id) AS cantidad_packs
    FROM tratamiento t
    LEFT JOIN pack p ON t.id = p.tratamiento_id AND p.activo = TRUE
    WHERE t.activo = TRUE
    GROUP BY t.id, t.nombre, t.descripcion, t.duracion_sesion_min, t.frecuencia_recomendada_dias
    ORDER BY t.nombre;
END$$
DELIMITER ;

-- TRA-002: Obtener packs por tratamiento
DELIMITER $$
CREATE PROCEDURE sp_obtener_packs_tratamiento(
    IN p_tratamiento_id BIGINT
)
BEGIN
    SELECT 
        p.*,
        t.nombre AS tratamiento_nombre,
        CASE 
            WHEN p.precio_oferta IS NOT NULL 
                AND (p.fecha_inicio_oferta IS NULL OR p.fecha_inicio_oferta <= CURDATE())
                AND (p.fecha_fin_oferta IS NULL OR p.fecha_fin_oferta >= CURDATE())
            THEN p.precio_oferta
            ELSE p.precio_regular
        END AS precio_actual
    FROM pack p
    JOIN tratamiento t ON p.tratamiento_id = t.id
    WHERE p.tratamiento_id = p_tratamiento_id
      AND p.activo = TRUE
      AND t.activo = TRUE
    ORDER BY p.nombre;
END$$
DELIMITER ;

-- TRA-003: Obtener zonas del cuerpo por categoria
DELIMITER $$
CREATE PROCEDURE sp_obtener_zonas_cuerpo(
    IN p_categoria VARCHAR(50)
)
BEGIN
    SELECT 
        codigo,
        nombre,
        categoria,
        precio_base
    FROM zona_cuerpo
    WHERE (p_categoria IS NULL OR categoria = p_categoria)
      AND activo = TRUE
    ORDER BY nombre;
END$$
DELIMITER ;

-- TRA-004: Calcular precio pack con zonas adicionales
DELIMITER $$
CREATE PROCEDURE sp_calcular_precio_pack_zonas(
    IN p_pack_id BIGINT,
    IN p_zonas_adicionales JSON,
    OUT p_precio_final DECIMAL(12,2)
)
BEGIN
    DECLARE v_precio_base DECIMAL(12,2);
    DECLARE v_precio_zonas DECIMAL(12,2) DEFAULT 0;
    DECLARE v_zonas_incluidas JSON;
    DECLARE v_precio_por_zona JSON;
    DECLARE v_zona VARCHAR(50);
    DECLARE v_precio_zona DECIMAL(12,2);
    DECLARE i INT DEFAULT 0;
    DECLARE v_total_zonas INT;
    
    -- Obtener informacion del pack
    SELECT precio_regular, zonas_incluidas, precio_por_zona INTO v_precio_base, v_zonas_incluidas, v_precio_por_zona
    FROM pack WHERE id = p_pack_id;
    
    -- Calcular precio de zonas adicionales
    IF p_zonas_adicionales IS NOT NULL THEN
        SET v_total_zonas = JSON_LENGTH(p_zonas_adicionales);
        
        WHILE i < v_total_zonas DO
            SET v_zona = JSON_UNQUOTE(JSON_EXTRACT(p_zonas_adicionales, CONCAT('$[', i, ']')));
            
            -- Verificar si la zona no esta incluida en el pack
            IF JSON_SEARCH(v_zonas_incluidas, 'one', v_zona) IS NULL THEN
                -- Obtener precio de la zona
                SET v_precio_zona = JSON_UNQUOTE(JSON_EXTRACT(v_precio_por_zona, CONCAT('$.', v_zona)));
                IF v_precio_zona IS NOT NULL THEN
                    SET v_precio_zonas = v_precio_zonas + CAST(v_precio_zona AS DECIMAL(12,2));
                END IF;
            END IF;
            
            SET i = i + 1;
        END WHILE;
    END IF;
    
    SET p_precio_final = v_precio_base + v_precio_zonas;
END$$
DELIMITER ;

-- TRA-005: Obtener historial de tratamientos de un paciente
DELIMITER $$
CREATE PROCEDURE sp_obtener_historial_tratamientos(
    IN p_ficha_id BIGINT
)
BEGIN
    SELECT 
        v.id AS venta_id,
        v.fecha_creacion,
        t.nombre AS tratamiento_nombre,
        p.nombre AS pack_nombre,
        v.cantidad_sesiones,
        v.precio_lista,
        v.total_pagado,
        v.estado,
        COUNT(s.id) AS sesiones_realizadas,
        v.cantidad_sesiones - COUNT(s.id) AS sesiones_pendientes
    FROM venta v
    JOIN tratamiento t ON v.tratamiento_id = t.id
    LEFT JOIN pack p ON v.pack_id = p.id
    LEFT JOIN sesion s ON v.id = s.venta_id AND s.estado = 'realizada'
    WHERE v.ficha_id = p_ficha_id
    GROUP BY v.id, v.fecha_creacion, t.nombre, p.nombre, v.cantidad_sesiones, v.precio_lista, v.total_pagado, v.estado
    ORDER BY v.fecha_creacion DESC;
END$$
DELIMITER ;

-- =============================================================================
-- STORED PROCEDURES ADICIONALES PARA API
-- =============================================================================

-- Crear tipo de ficha especifica
DELIMITER $$
CREATE PROCEDURE sp_crear_tipo_ficha_especifica(
    IN p_nombre VARCHAR(100),
    IN p_descripcion TEXT,
    IN p_requiere_consentimiento BOOLEAN,
    IN p_template_consentimiento TEXT,
    IN p_campos_requeridos JSON,
    OUT p_tipo_id BIGINT
)
BEGIN
    INSERT INTO tipo_ficha_especifica (nombre, descripcion, requiere_consentimiento, template_consentimiento, campos_requeridos, activo)
    VALUES (p_nombre, p_descripcion, p_requiere_consentimiento, p_template_consentimiento, p_campos_requeridos, TRUE);
    SET p_tipo_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- Actualizar ficha
DELIMITER $$
CREATE PROCEDURE sp_actualizar_ficha(
    IN p_id BIGINT,
    IN p_codigo VARCHAR(40),
    IN p_nombres VARCHAR(120),
    IN p_apellidos VARCHAR(120),
    IN p_rut VARCHAR(20),
    IN p_telefono VARCHAR(50),
    IN p_email VARCHAR(120),
    IN p_fecha_nacimiento DATE,
    IN p_direccion TEXT,
    IN p_observaciones TEXT,
    OUT p_filas_actualizadas INT
)
BEGIN
    UPDATE ficha SET 
        codigo = p_codigo,
        nombres = p_nombres,
        apellidos = p_apellidos,
        rut = p_rut,
        telefono = p_telefono,
        email = p_email,
        fecha_nacimiento = p_fecha_nacimiento,
        direccion = p_direccion,
        observaciones = p_observaciones
    WHERE id = p_id;
    SET p_filas_actualizadas = ROW_COUNT();
END$$
DELIMITER ;

-- Eliminar ficha (soft delete)
DELIMITER $$
CREATE PROCEDURE sp_eliminar_ficha(
    IN p_id BIGINT,
    OUT p_filas_actualizadas INT
)
BEGIN
    UPDATE ficha SET activo = FALSE WHERE id = p_id;
    SET p_filas_actualizadas = ROW_COUNT();
END$$
DELIMITER ;

-- Actualizar ultimo login de usuario
DELIMITER $$
CREATE PROCEDURE sp_actualizar_ultimo_login(
    IN p_usuario_id BIGINT
)
BEGIN
    UPDATE usuario SET ultimo_login = NOW() WHERE id = p_usuario_id;
END$$
DELIMITER ;

-- Crear tratamiento
DELIMITER $$
CREATE PROCEDURE sp_crear_tratamiento(
    IN p_nombre VARCHAR(100),
    IN p_descripcion TEXT,
    IN p_requiere_ficha_especifica BOOLEAN,
    IN p_duracion_sesion_min INT,
    IN p_frecuencia_recomendada_dias INT,
    OUT p_tratamiento_id BIGINT
)
BEGIN
    INSERT INTO tratamiento (nombre, descripcion, requiere_ficha_especifica, duracion_sesion_min, frecuencia_recomendada_dias, activo)
    VALUES (p_nombre, p_descripcion, p_requiere_ficha_especifica, p_duracion_sesion_min, p_frecuencia_recomendada_dias, TRUE);
    SET p_tratamiento_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- Crear pack
DELIMITER $$
CREATE PROCEDURE sp_crear_pack(
    IN p_tratamiento_id BIGINT,
    IN p_nombre VARCHAR(100),
    IN p_descripcion TEXT,
    IN p_duracion_sesion_min INT,
    OUT p_pack_id BIGINT
)
BEGIN
    INSERT INTO pack (tratamiento_id, nombre, descripcion, duracion_sesion_min, activo)
    VALUES (p_tratamiento_id, p_nombre, p_descripcion, p_duracion_sesion_min, TRUE);
    SET p_pack_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- Crear pack completo con precios y zonas
DELIMITER $$
CREATE PROCEDURE sp_crear_pack_completo(
    IN p_tratamiento_id BIGINT,
    IN p_nombre VARCHAR(100),
    IN p_descripcion TEXT,
    IN p_duracion_sesion_min INT,
    IN p_sesiones_incluidas INT,
    IN p_zonas_incluidas JSON,
    IN p_precio_por_zona JSON,
    IN p_precio_total DECIMAL(12,2),
    OUT p_pack_id BIGINT
)
BEGIN
    INSERT INTO pack (
        tratamiento_id, nombre, descripcion, duracion_sesion_min, sesiones_incluidas,
        zonas_incluidas, precio_por_zona, precio_total, activo
    ) VALUES (
        p_tratamiento_id, p_nombre, p_descripcion, p_duracion_sesion_min, p_sesiones_incluidas,
        p_zonas_incluidas, p_precio_por_zona, p_precio_total, TRUE
    );
    SET p_pack_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- Crear sucursal
DELIMITER $$
CREATE PROCEDURE sp_crear_sucursal(
    IN p_nombre VARCHAR(100),
    IN p_direccion TEXT,
    IN p_telefono VARCHAR(50),
    IN p_email VARCHAR(120),
    OUT p_sucursal_id BIGINT
)
BEGIN
    INSERT INTO sucursal (nombre, direccion, telefono, email, activo)
    VALUES (p_nombre, p_direccion, p_telefono, p_email, TRUE);
    SET p_sucursal_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- Crear box
DELIMITER $$
CREATE PROCEDURE sp_crear_box(
    IN p_sucursal_id BIGINT,
    IN p_nombre VARCHAR(100),
    IN p_descripcion TEXT,
    OUT p_box_id BIGINT
)
BEGIN
    INSERT INTO box (sucursal_id, nombre, descripcion, activo)
    VALUES (p_sucursal_id, p_nombre, p_descripcion, TRUE);
    SET p_box_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- Agregar pack a oferta combo
DELIMITER $$
CREATE PROCEDURE sp_agregar_pack_oferta_combo(
    IN p_oferta_combo_id BIGINT,
    IN p_pack_id BIGINT,
    OUT p_relacion_id BIGINT
)
BEGIN
    INSERT INTO oferta_combo_pack (oferta_combo_id, pack_id)
    VALUES (p_oferta_combo_id, p_pack_id);
    SET p_relacion_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- Crear usuario
DELIMITER $$
CREATE PROCEDURE sp_crear_usuario(
    IN p_username VARCHAR(50),
    IN p_password_hash VARCHAR(255),
    IN p_email VARCHAR(120),
    IN p_rol VARCHAR(20),
    OUT p_usuario_id BIGINT
)
BEGIN
    INSERT INTO usuario (username, password_hash, email, rol, activo)
    VALUES (p_username, p_password_hash, p_email, p_rol, TRUE);
    SET p_usuario_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- Crear profesional completo
DELIMITER $$
CREATE PROCEDURE sp_crear_profesional_completo(
    IN p_usuario_id BIGINT,
    IN p_nombre VARCHAR(150),
    IN p_apellidos VARCHAR(150),
    IN p_rut VARCHAR(20),
    IN p_telefono VARCHAR(50),
    IN p_email VARCHAR(120),
    IN p_tipo_profesional VARCHAR(80),
    IN p_bio TEXT,
    IN p_foto_url TEXT,
    IN p_especialidad VARCHAR(100),
    IN p_titulo_profesional VARCHAR(150),
    IN p_numero_colegio VARCHAR(50),
    IN p_fecha_nacimiento DATE,
    IN p_direccion TEXT,
    IN p_estado_civil VARCHAR(20),
    IN p_contacto_emergencia VARCHAR(150),
    IN p_telefono_emergencia VARCHAR(50),
    OUT p_profesional_id BIGINT
)
BEGIN
    INSERT INTO profesional (
        usuario_id, nombre, apellidos, rut, telefono, email, tipo_profesional, 
        bio, foto_url, especialidad, titulo_profesional, numero_colegio, 
        fecha_nacimiento, direccion, estado_civil, 
        contacto_emergencia, telefono_emergencia, activo
    ) VALUES (
        p_usuario_id, p_nombre, p_apellidos, p_rut, p_telefono, p_email, p_tipo_profesional,
        p_bio, p_foto_url, p_especialidad, p_titulo_profesional, p_numero_colegio,
        p_fecha_nacimiento, p_direccion, p_estado_civil,
        p_contacto_emergencia, p_telefono_emergencia, TRUE
    );
    SET p_profesional_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- =============================================================================
-- STORED PROCEDURES DE LISTADO - PARA LA API
-- =============================================================================

-- ---------- LISTADOS PARA API ----------

-- FIC-004: Listar todas las fichas
DELIMITER $$
CREATE PROCEDURE sp_fichas_list()
BEGIN
    SELECT * FROM ficha WHERE activo = TRUE ORDER BY fecha_creacion DESC;
END$$
DELIMITER ;

-- FIC-005: Listar tipos de ficha específica
DELIMITER $$
CREATE PROCEDURE sp_tipos_ficha_especifica_list()
BEGIN
    SELECT * FROM tipo_ficha_especifica ORDER BY nombre;
END$$
DELIMITER ;

-- FIC-006: Listar fichas específicas
DELIMITER $$
CREATE PROCEDURE sp_fichas_especificas_list()
BEGIN
    SELECT fe.*, tfe.nombre as tipo_nombre, tfe.requiere_consentimiento
    FROM ficha_especifica fe
    JOIN tipo_ficha_especifica tfe ON fe.tipo_id = tfe.id
    WHERE fe.activo = TRUE
    ORDER BY fe.fecha_creacion DESC;
END$$
DELIMITER ;

-- CON-001: Listar consentimientos con firma
DELIMITER $$
CREATE PROCEDURE sp_consentimiento_firma_list()
BEGIN
    SELECT cf.*, fe.id as ficha_especifica_id, tfe.nombre as tipo_ficha
    FROM consentimiento_firma cf
    JOIN ficha_especifica fe ON cf.ficha_especifica_id = fe.id
    JOIN tipo_ficha_especifica tfe ON fe.tipo_id = tfe.id
    WHERE cf.activo = TRUE
    ORDER BY cf.fecha_firma DESC;
END$$
DELIMITER ;

-- EVA-002: Listar evaluaciones
DELIMITER $$
CREATE PROCEDURE sp_evaluaciones_list()
BEGIN
    SELECT e.*, f.codigo as ficha_codigo, f.nombres, f.apellidos
    FROM evaluacion e
    JOIN ficha f ON e.ficha_id = f.id
    WHERE e.estado != 'ELIMINADA' AND f.activo = TRUE
    ORDER BY e.fecha_evaluacion DESC;
END$$
DELIMITER ;

-- VEN-002: Listar ventas
DELIMITER $$
CREATE PROCEDURE sp_ventas_list()
BEGIN
    SELECT v.*, f.codigo as ficha_codigo, f.nombres, f.apellidos, e.fecha_evaluacion,
           t.nombre as tratamiento_nombre, p.nombre as pack_nombre
    FROM venta v
    JOIN ficha f ON v.ficha_id = f.id
    LEFT JOIN evaluacion e ON v.evaluacion_id = e.id
    LEFT JOIN tratamiento t ON v.tratamiento_id = t.id
    LEFT JOIN pack p ON v.pack_id = p.id
    WHERE f.activo = TRUE AND (e.estado IS NULL OR e.estado != 'ELIMINADA')
    ORDER BY v.fecha_creacion DESC;
END$$
DELIMITER ;

-- VEN-003: Listar historial de ventas
DELIMITER $$
CREATE PROCEDURE sp_ventas_historial_list()
BEGIN
    SELECT v.*, f.codigo as ficha_codigo, f.nombres, f.apellidos, e.fecha_evaluacion,
           t.nombre as tratamiento_nombre, p.nombre as pack_nombre
    FROM venta v
    JOIN ficha f ON v.ficha_id = f.id
    LEFT JOIN evaluacion e ON v.evaluacion_id = e.id
    LEFT JOIN tratamiento t ON v.tratamiento_id = t.id
    LEFT JOIN pack p ON v.pack_id = p.id
    WHERE v.estado = 'COMPLETADA' AND f.activo = TRUE AND (e.estado IS NULL OR e.estado != 'ELIMINADA')
    ORDER BY v.fecha_creacion DESC;
END$$
DELIMITER ;

-- VEN-004: Listar ventas por ficha
DELIMITER $$
CREATE PROCEDURE sp_ventas_list_by_ficha(IN p_ficha_id BIGINT)
BEGIN
    SELECT v.*, f.codigo as ficha_codigo, f.nombres, f.apellidos, e.fecha_evaluacion,
           t.nombre as tratamiento_nombre, p.nombre as pack_nombre
    FROM venta v
    JOIN ficha f ON v.ficha_id = f.id
    LEFT JOIN evaluacion e ON v.evaluacion_id = e.id
    LEFT JOIN tratamiento t ON v.tratamiento_id = t.id
    LEFT JOIN pack p ON v.pack_id = p.id
    WHERE v.ficha_id = p_ficha_id AND f.activo = TRUE AND (e.estado IS NULL OR e.estado != 'ELIMINADA')
    ORDER BY v.fecha_creacion DESC;
END$$
DELIMITER ;

-- PAG-004: Listar pagos
DELIMITER $$
CREATE PROCEDURE sp_pagos_list()
BEGIN
    SELECT p.*, f.codigo as ficha_codigo, f.nombres, f.apellidos
    FROM pago p
    JOIN venta v ON p.venta_id = v.id
    JOIN ficha f ON v.ficha_id = f.id
    WHERE f.activo = TRUE
    ORDER BY p.fecha_pago DESC;
END$$
DELIMITER ;

-- SES-008: Listar sesiones
DELIMITER $$
CREATE PROCEDURE sp_sesiones_list()
BEGIN
    SELECT s.*, f.codigo as ficha_codigo, f.nombres, f.apellidos,
           p.nombre as profesional_nombre, b.nombre as box_nombre, suc.nombre as sucursal_nombre
    FROM sesion s
    JOIN venta v ON s.venta_id = v.id
    JOIN ficha f ON v.ficha_id = f.id
    LEFT JOIN profesional p ON s.profesional_id = p.id
    LEFT JOIN box b ON s.box_id = b.id
    LEFT JOIN sucursal suc ON b.sucursal_id = suc.id
    WHERE f.activo = TRUE
    ORDER BY s.fecha_planificada DESC;
END$$
DELIMITER ;

-- SES-009: Listar agenda
DELIMITER $$
CREATE PROCEDURE sp_agenda_list()
BEGIN
    SELECT s.*, f.codigo as ficha_codigo, f.nombres, f.apellidos,
           p.nombre as profesional_nombre, b.nombre as box_nombre, suc.nombre as sucursal_nombre
    FROM sesion s
    JOIN venta v ON s.venta_id = v.id
    JOIN ficha f ON v.ficha_id = f.id
    LEFT JOIN profesional p ON s.profesional_id = p.id
    LEFT JOIN box b ON s.box_id = b.id
    LEFT JOIN sucursal suc ON b.sucursal_id = suc.id
    WHERE s.estado IN ('planificada', 'confirmada')
    ORDER BY s.fecha_planificada ASC;
END$$
DELIMITER ;

-- OFE-004: Listar ofertas
DELIMITER $$
CREATE PROCEDURE sp_ofertas_list()
BEGIN
    SELECT o.*, 
           CASE 
               WHEN o.tipo = 'pack_temporal' THEN (SELECT GROUP_CONCAT(p.nombre SEPARATOR ', ') FROM oferta_pack op JOIN pack p ON op.pack_id = p.id WHERE op.oferta_id = o.id)
               WHEN o.tipo = 'descuento_manual' THEN (SELECT GROUP_CONCAT(t.nombre SEPARATOR ', ') FROM oferta_tratamiento ot JOIN tratamiento t ON ot.tratamiento_id = t.id WHERE ot.oferta_id = o.id)
               WHEN o.tipo = 'combo_packs' THEN (SELECT GROUP_CONCAT(p.nombre SEPARATOR ', ') FROM oferta_combo oc JOIN oferta_combo_pack ocp ON oc.id = ocp.oferta_combo_id JOIN pack p ON ocp.pack_id = p.id WHERE oc.oferta_id = o.id)
               ELSE NULL
           END as elemento_nombre
    FROM oferta o
    WHERE o.activo = TRUE AND o.fecha_fin >= CURDATE()
    ORDER BY o.fecha_inicio DESC;
END$$
DELIMITER ;

-- OFE-005: Listar ofertas combo
DELIMITER $$
CREATE PROCEDURE sp_ofertas_combo_list()
BEGIN
    SELECT oc.*, o.nombre as oferta_nombre, o.porc_descuento as oferta_descuento
    FROM oferta_combo oc
    JOIN oferta o ON oc.oferta_id = o.id
    WHERE o.activo = TRUE AND o.fecha_fin >= CURDATE()
    ORDER BY o.fecha_inicio DESC;
END$$
DELIMITER ;

-- OFE-006: Listar ofertas aplicables
DELIMITER $$
CREATE PROCEDURE sp_ofertas_aplicables_list()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        RESIGNAL;
    END;
    
    SELECT 
        id,
        nombre,
        tipo,
        descripcion,
        porc_descuento,
        fecha_inicio,
        fecha_fin,
        combinable,
        activo,
        prioridad,
        fecha_creacion,
        aplicable_hoy
    FROM v_ofertas_aplicables
    WHERE aplicable_hoy = TRUE
    ORDER BY porc_descuento DESC;
END$$
DELIMITER ;

-- TRA-002: Listar tratamientos
DELIMITER $$
CREATE PROCEDURE sp_tratamientos_list(IN p_genero ENUM('M', 'F', 'U'))
BEGIN
    SELECT 
        t.*,
        pt.precio_por_sesion,
        -- Buscar oferta aplicable para este tratamiento
        (SELECT o.porc_descuento 
         FROM oferta o 
         JOIN oferta_tratamiento ot ON o.id = ot.oferta_id 
         WHERE ot.tratamiento_id = t.id 
         AND o.activo = TRUE 
         AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
         AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
         ORDER BY o.prioridad DESC, o.porc_descuento DESC 
         LIMIT 1) as descuento_aplicable,
        -- Calcular precio con descuento si aplica
        CASE 
            WHEN (SELECT o.porc_descuento 
                  FROM oferta o 
                  JOIN oferta_tratamiento ot ON o.id = ot.oferta_id 
                  WHERE ot.tratamiento_id = t.id 
                  AND o.activo = TRUE 
                  AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
                  AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
                  ORDER BY o.prioridad DESC, o.porc_descuento DESC 
                  LIMIT 1) IS NOT NULL
            THEN pt.precio_por_sesion * (1 - (SELECT o.porc_descuento 
                                             FROM oferta o 
                                             JOIN oferta_tratamiento ot ON o.id = ot.oferta_id 
                                             WHERE ot.tratamiento_id = t.id 
                                             AND o.activo = TRUE 
                                             AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
                                             AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
                                             ORDER BY o.prioridad DESC, o.porc_descuento DESC 
                                             LIMIT 1) / 100)
            ELSE pt.precio_por_sesion
        END as precio_con_descuento
    FROM tratamiento t
    LEFT JOIN precio_tratamiento pt ON t.id = pt.tratamiento_id AND pt.activo = TRUE AND (pt.genero = p_genero OR pt.genero = 'U')
    WHERE t.activo = TRUE 
    ORDER BY t.nombre;
END$$
DELIMITER ;

-- ZON-002: Listar zonas
DELIMITER $$
CREATE PROCEDURE sp_zonas_list()
BEGIN
    SELECT * FROM zona_cuerpo ORDER BY nombre;
END$$
DELIMITER ;

-- PAC-002: Listar packs
DELIMITER $$
CREATE PROCEDURE sp_packs_list()
BEGIN
    SELECT 
        p.*, 
        t.nombre as tratamiento_nombre,
        -- Buscar oferta aplicable para este pack
        (SELECT o.porc_descuento 
         FROM oferta o 
         JOIN oferta_pack op ON o.id = op.oferta_id 
         WHERE op.pack_id = p.id 
         AND o.activo = TRUE 
         AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
         AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
         ORDER BY o.prioridad DESC, o.porc_descuento DESC 
         LIMIT 1) as descuento_aplicable,
        -- Calcular precio con descuento si aplica
        CASE 
            WHEN (SELECT o.porc_descuento 
                  FROM oferta o 
                  JOIN oferta_pack op ON o.id = op.oferta_id 
                  WHERE op.pack_id = p.id 
                  AND o.activo = TRUE 
                  AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
                  AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
                  ORDER BY o.prioridad DESC, o.porc_descuento DESC 
                  LIMIT 1) IS NOT NULL
            THEN p.precio_total * (1 - (SELECT o.porc_descuento 
                                       FROM oferta o 
                                       JOIN oferta_pack op ON o.id = op.oferta_id 
                                       WHERE op.pack_id = p.id 
                                       AND o.activo = TRUE 
                                       AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
                                       AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
                                       ORDER BY o.prioridad DESC, o.porc_descuento DESC 
                                       LIMIT 1) / 100)
            ELSE p.precio_total
        END as precio_con_descuento
    FROM pack p
    JOIN tratamiento t ON p.tratamiento_id = t.id
    WHERE p.activo = TRUE AND t.activo = TRUE
    ORDER BY p.nombre;
END$$
DELIMITER ;

-- PAC-003: Listar packs por tratamiento
DELIMITER $$
CREATE PROCEDURE sp_packs_by_tratamiento(IN p_tratamiento_id INT, IN p_genero ENUM('M', 'F', 'U'))
BEGIN
    SELECT 
        p.*, 
        t.nombre as tratamiento_nombre,
        -- Buscar oferta aplicable para este pack
        (SELECT o.porc_descuento 
         FROM oferta o 
         JOIN oferta_pack op ON o.id = op.oferta_id 
         WHERE op.pack_id = p.id 
         AND o.activo = TRUE 
         AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
         AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
         ORDER BY o.prioridad DESC, o.porc_descuento DESC 
         LIMIT 1) as descuento_aplicable,
        -- Calcular precio con descuento si aplica
        CASE 
            WHEN (SELECT o.porc_descuento 
                  FROM oferta o 
                  JOIN oferta_pack op ON o.id = op.oferta_id 
                  WHERE op.pack_id = p.id 
                  AND o.activo = TRUE 
                  AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
                  AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
                  ORDER BY o.prioridad DESC, o.porc_descuento DESC 
                  LIMIT 1) IS NOT NULL
            THEN p.precio_total * (1 - (SELECT o.porc_descuento 
                                       FROM oferta o 
                                       JOIN oferta_pack op ON o.id = op.oferta_id 
                                       WHERE op.pack_id = p.id 
                                       AND o.activo = TRUE 
                                       AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
                                       AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
                                       ORDER BY o.prioridad DESC, o.porc_descuento DESC 
                                       LIMIT 1) / 100)
            ELSE p.precio_total
        END as precio_con_descuento
    FROM pack p
    JOIN tratamiento t ON p.tratamiento_id = t.id
    WHERE p.tratamiento_id = p_tratamiento_id 
    AND (p.genero = p_genero OR p.genero = 'U')
    AND p.activo = TRUE 
    AND t.activo = TRUE
    ORDER BY p.nombre;
END$$
DELIMITER ;

-- SUC-002: Listar sucursales
DELIMITER $$
CREATE PROCEDURE sp_sucursales_list()
BEGIN
    SELECT * FROM sucursal ORDER BY nombre;
END$$
DELIMITER ;

-- BOX-001: Obtener box por ID
DELIMITER $$
CREATE PROCEDURE sp_boxes_get(IN p_id BIGINT)
BEGIN
    SELECT b.*, s.nombre as sucursal_nombre,
           CASE 
               WHEN b.activo = TRUE THEN 'activo'
               ELSE 'inactivo'
           END as estado
    FROM box b
    JOIN sucursal s ON b.sucursal_id = s.id
    WHERE b.id = p_id;
END$$
DELIMITER ;

-- BOX-002: Listar boxes
DELIMITER $$
CREATE PROCEDURE sp_boxes_list()
BEGIN
    SELECT b.*, s.nombre as sucursal_nombre,
           CASE 
               WHEN b.activo = TRUE THEN 'activo'
               ELSE 'inactivo'
           END as estado
    FROM box b
    JOIN sucursal s ON b.sucursal_id = s.id
    ORDER BY s.nombre, b.nombre;
END$$
DELIMITER ;

-- PRO-002: Listar profesionales
DELIMITER $$
CREATE PROCEDURE sp_profesionales_list()
BEGIN
    SELECT p.*
    FROM profesional p
    WHERE p.activo = TRUE
    ORDER BY p.nombre;
END$$
DELIMITER ;

-- REP-001: Listar reportes disponibles
DELIMITER $$
CREATE PROCEDURE sp_reportes_list()
BEGIN
    SELECT 'v_venta_progreso' as vista, 'Progreso de sesiones por venta' as descripcion
    UNION ALL
    SELECT 'v_plan_vs_ejecucion', 'Comparación plan vs ejecución'
    UNION ALL
    SELECT 'v_ofertas_aplicables', 'Ofertas activas y en fecha'
    UNION ALL
    SELECT 'v_ofertas_pack', 'Ofertas por pack con descuentos'
    UNION ALL
    SELECT 'v_ofertas_tratamiento', 'Ofertas por tratamiento'
    UNION ALL
    SELECT 'v_ofertas_combo', 'Ofertas combo con descuento adicional'
    UNION ALL
    SELECT 'v_sesiones_completas', 'Sesiones con toda la información'
    UNION ALL
    SELECT 'v_ventas_completas', 'Ventas con toda la información'
    UNION ALL
    SELECT 'v_reporte_ofertas', 'Reporte de ofertas aplicadas'
    UNION ALL
    SELECT 'v_disponibilidad_profesionales', 'Disponibilidad para agenda';
END$$
DELIMITER ;

-- =============================================================================
-- DATOS INICIALES - USANDO STORED PROCEDURES PARA CALIDAD DE DATOS
-- =============================================================================

-- ---------- ZONAS DEL CUERPO ----------
-- Usando SP para crear zonas del cuerpo con validaciones
CALL sp_crear_zona_cuerpo('PIERNAS', 'Piernas', 'DEPILACION', 45000, @zona_piernas);
CALL sp_crear_zona_cuerpo('BRAZOS', 'Brazos', 'DEPILACION', 35000, @zona_brazos);
CALL sp_crear_zona_cuerpo('REBAJE', 'Rebaje', 'DEPILACION', 25000, @zona_rebaje);
CALL sp_crear_zona_cuerpo('INTERGLUTEO', 'Intergluteo', 'DEPILACION', 20000, @zona_intergluteo);
CALL sp_crear_zona_cuerpo('ROSTRO_C', 'Rostro C', 'DEPILACION', 30000, @zona_rostro_c);
CALL sp_crear_zona_cuerpo('CUELLO', 'Cuello', 'DEPILACION', 25000, @zona_cuello);
CALL sp_crear_zona_cuerpo('BOZO', 'Bozo', 'DEPILACION', 15000, @zona_bozo);
CALL sp_crear_zona_cuerpo('AXILA', 'Axila', 'DEPILACION', 20000, @zona_axila);
CALL sp_crear_zona_cuerpo('MENTON', 'Menton', 'DEPILACION', 15000, @zona_menton);
CALL sp_crear_zona_cuerpo('PATILLAS', 'Patillas', 'DEPILACION', 15000, @zona_patillas);
CALL sp_crear_zona_cuerpo('ESPALDA', 'Espalda', 'DEPILACION', 40000, @zona_espalda);
CALL sp_crear_zona_cuerpo('ABDOMEN', 'Abdomen', 'DEPILACION', 30000, @zona_abdomen);
CALL sp_crear_zona_cuerpo('GLUTEOS', 'Gluteos', 'DEPILACION', 25000, @zona_gluteos);
CALL sp_crear_zona_cuerpo('PECHO', 'Pecho', 'DEPILACION', 30000, @zona_pecho);
CALL sp_crear_zona_cuerpo('BARBA', 'Barba', 'DEPILACION', 25000, @zona_barba);
CALL sp_crear_zona_cuerpo('DEDOS_MANOS', 'Dedos Manos', 'DEPILACION', 10000, @zona_dedos_manos);
CALL sp_crear_zona_cuerpo('EMPEINE_DEDOS', 'Empeine Dedos', 'DEPILACION', 15000, @zona_empeine_dedos);
CALL sp_crear_zona_cuerpo('LINEA_ALBA', 'Linea Alba', 'DEPILACION', 20000, @zona_linea_alba);

-- ---------- TRATAMIENTOS BASE ----------
-- Usando SP para crear tratamientos con validaciones
CALL sp_crear_tratamiento('EVALUACION', 'Evaluación médica y estética inicial', FALSE, 30, 1, @tratamiento_evaluacion_id);
CALL sp_crear_tratamiento('FACIAL', 'Tratamientos faciales y esteticos', TRUE, 60, 7, @tratamiento_facial_id);
CALL sp_crear_tratamiento('CAPILAR', 'Tratamientos capilares y regenerativos', TRUE, 90, 14, @tratamiento_capilar_id);
CALL sp_crear_tratamiento('DEPILACION', 'Depilacion laser y tratamientos corporales', TRUE, 45, 30, @tratamiento_depilacion_id);
CALL sp_crear_tratamiento('CORPORAL', 'Tratamientos corporales y estéticos', TRUE, 75, 14, @tratamiento_corporal_id);

-- ---------- TIPOS DE FICHA ESPECiFICA ----------
-- Usando SP para crear tipos de ficha específica con validaciones
-- DEPILACION: Definición completa basada en ficha_depilacion.htm
CALL sp_crear_tipo_ficha_especifica('DEPILACION', 'Ficha específica para depilación láser', TRUE, 
'CONSENTIMIENTO INFORMADO - DEPILACIÓN LÁSER

He sido informado/a sobre el procedimiento de depilación láser y entiendo que:

1. El láser actúa sobre el folículo piloso para reducir el crecimiento del vello
2. Se requieren múltiples sesiones para resultados óptimos
3. Los resultados varían según el tipo de piel y color del vello
4. Pueden existir efectos secundarios temporales como enrojecimiento o inflamación
5. Es importante evitar la exposición solar antes y después del tratamiento
6. Debo informar sobre cualquier cambio en mi estado de salud

Declaro que:
- He leído y comprendido toda la información proporcionada
- He tenido la oportunidad de hacer preguntas
- Consiento voluntariamente al tratamiento
- Entiendo que los resultados no están garantizados
- Me comprometo a seguir las indicaciones post-tratamiento

Fecha: {fecha}',
JSON_OBJECT(
    'antecedentes_personales', JSON_OBJECT(
        'nombre_completo', 'text',
        'fecha_nacimiento', 'date',
        'edad', 'number',
        'ocupacion', 'text',
        'telefono_fijo', 'text',
        'celular', 'text',
        'email', 'email',
        'medio_conocimiento', 'text'
    ),
    'evaluacion_medica', JSON_OBJECT(
        'medicamentos', 'boolean',
        'isotretinoina', 'boolean',
        'alergias', 'boolean',
        'enfermedades_piel', 'boolean',
        'antecedentes_cancer', 'boolean',
        'embarazo', 'boolean',
        'lactancia', 'boolean',
        'tatuajes', 'boolean',
        'antecedentes_herpes', 'boolean',
        'patologias_hormonales', 'boolean',
        'exposicion_sol', 'text',
        'tipo_piel_fitzpatrick', 'select',
        'metodo_depilacion_actual', 'text',
        'ultima_depilacion', 'date',
        'otros', 'text'
    ),
    'zonas_tratamiento', JSON_OBJECT(
        'zonas_seleccionadas', 'array',
        'observaciones_medicas', 'text'
    )
), @tipo_depilacion_id);

-- CORPORAL_FACIAL: Definición completa basada en ficha_corporal_nueva.htm
CALL sp_crear_tipo_ficha_especifica('CORPORAL_FACIAL', 'Ficha específica para tratamientos corporales y faciales (LIPO WITH ICE)', FALSE, NULL,
JSON_OBJECT(
    'antecedentes_personales', JSON_OBJECT(
        'nombre_completo', 'text',
        'fecha_nacimiento', 'date',
        'edad', 'number',
        'ocupacion', 'text',
        'telefono_fijo', 'text',
        'celular', 'text',
        'email', 'email',
        'medio_conocimiento', 'text'
    ),
    'antecedentes_clinicos', JSON_OBJECT(
        'enfermedades_cardiacas', 'boolean',
        'enfermedades_renales', 'boolean',
        'enfermedades_hepaticas', 'boolean',
        'enfermedades_digestivas', 'boolean',
        'enfermedades_neuromusculares', 'boolean',
        'trastorno_coagulacion', 'boolean',
        'alergias', 'boolean',
        'epilepsia', 'boolean',
        'embarazo', 'boolean',
        'dispositivo_intrauterino', 'boolean',
        'cancer', 'boolean',
        'protesis_metalicas', 'boolean',
        'implantes_colageno', 'boolean',
        'medicamentos_actuales', 'boolean',
        'cirugias', 'boolean',
        'fuma', 'boolean',
        'ingiere_alcohol', 'boolean',
        'horas_sueno', 'number',
        'periodo_menstrual_regular', 'boolean',
        'lesiones_timpano', 'boolean'
    ),
    'medidas_corporales', JSON_OBJECT(
        'imc_antes', 'number',
        'imc_despues', 'number',
        'porcentaje_musculo_antes', 'number',
        'porcentaje_musculo_despues', 'number',
        'porcentaje_grasa_antes', 'number',
        'porcentaje_grasa_despues', 'number',
        'grasa_visceral_antes', 'number',
        'grasa_visceral_despues', 'number',
        'peso_corporal_antes', 'number',
        'peso_corporal_despues', 'number',
        'edad_corporal_antes', 'number',
        'edad_corporal_despues', 'number',
        'metabolismo_basal_antes', 'number',
        'metabolismo_basal_despues', 'number'
    ),
    'medidas_pliegues', JSON_OBJECT(
        'abdomen_alto_antes', 'number',
        'abdomen_alto_despues', 'number',
        'abdomen_bajo_antes', 'number',
        'abdomen_bajo_despues', 'number',
        'cintura_antes', 'number',
        'cintura_despues', 'number',
        'cadera_antes', 'number',
        'cadera_despues', 'number',
        'flanco_derecho_antes', 'number',
        'flanco_derecho_despues', 'number',
        'flanco_izquierdo_antes', 'number',
        'flanco_izquierdo_despues', 'number'
    ),
    'tratamiento', JSON_OBJECT(
        'tratamientos_previos', 'text',
        'objetivo_estetico', 'text'
    )
), @tipo_corporal_id);

-- FACIAL: Definición básica (se puede expandir según necesidad)
CALL sp_crear_tipo_ficha_especifica('FACIAL', 'Ficha especifica para tratamientos faciales', TRUE, 'Consentimiento informado para tratamientos faciales', 
JSON_OBJECT('tipo_piel', 'text', 'alergias', 'text', 'tratamientos_previos', 'text'), @tipo_facial_id);

-- CAPILAR: Definición básica (se puede expandir según necesidad)
CALL sp_crear_tipo_ficha_especifica('CAPILAR', 'Ficha especifica para tratamientos capilares', TRUE, 'Consentimiento informado para tratamientos capilares', 
JSON_OBJECT('tipo_cabello', 'text', 'problemas_capilares', 'text', 'tratamientos_previos', 'text'), @tipo_capilar_id);

-- ---------- SUCURSAL ----------
-- Usando SP para crear sucursal con validaciones
CALL sp_crear_sucursal('Clinica Beleza Principal', 'Av. Principal 123, Santiago', '+56 2 2345 6789', 'contacto@clinica-beleza.cl', @sucursal_principal_id);

-- ---------- BOXES ----------
-- Usando SP para crear boxes con validaciones
CALL sp_crear_box(@sucursal_principal_id, 'Box 1', 'Box principal para tratamientos faciales y corporales', @box_1_id);
CALL sp_crear_box(@sucursal_principal_id, 'Box 2', 'Box secundario para tratamientos especializados', @box_2_id);

-- ---------- USUARIOS ----------
-- Usando SP para crear usuarios con validaciones (solo Juan Herrera por ahora)
CALL sp_crear_usuario('juan.herrera', '$2y$10$NgKGj0dk8VdWeuXclKEcH.7llW48dIGlNl5b2ScRFlA1RtkS.fLi.', 'juan.herrera@programadores.org', 'admin', @usuario_juan_id);

-- ---------- PROFESIONALES ----------
-- Usando SP para crear profesionales con validaciones (solo Juan Herrera por ahora)
CALL sp_crear_profesional_completo(
    @usuario_juan_id, 'Juan', 'Herrera', '11.111.111-1', '+56 9 9999 9999', 'juan.herrera@programadores.org', 'Administrador',
    'Administrador del sistema y desarrollador principal. Especialista en gestion de clinicas esteticas y sistemas de informacion medica.',
    '/assets/profesionales/juan-herrera.jpg', 'Administracion y Desarrollo', 'Ingeniero en Informatica', 'ADM-00001',
    '1980-01-01', 'Av. Las Condes 1000, Las Condes, Santiago', 'Casado', 'Maria Herrera', '+56 9 8888 8888',
    @profesional_juan_id
);

-- ---------- PACKS DE TRATAMIENTOS FACIAL (UNIVERSAL) ----------
-- Usando SP para crear packs faciales con validaciones
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Limpieza Facial Profunda', 'Limpieza facial profunda con productos especializados', 60, 1, JSON_ARRAY(), JSON_OBJECT(), 39900, @pack_limpieza_facial_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Radiofrecuencia Facial', 'Radiofrecuencia facial reafirmante', 60, 6, JSON_ARRAY(), JSON_OBJECT(), 250000, @pack_radiofrecuencia_facial_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Criolipolisis Facial Dinamica', 'Criolipolisis facial reafirmante', 60, 6, JSON_ARRAY(), JSON_OBJECT(), 399000, @pack_criolipolisis_facial_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Hifu Facial 4D + PRP', 'Hifu facial 4D con plasma rico en plaquetas', 90, 2, JSON_ARRAY(), JSON_OBJECT(), 299000, @pack_hifu_facial_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Plasma Rico en Plaquetas', 'Tratamiento con plasma rico en plaquetas', 60, 3, JSON_ARRAY(), JSON_OBJECT(), 199000, @pack_prp_facial_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Radiofrecuencia Fraccionada + Vitamina C', 'Radiofrecuencia fraccionada con vitamina C', 75, 3, JSON_ARRAY(), JSON_OBJECT(), 450000, @pack_radiofrecuencia_fraccionada_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Tecnologia Plasmatica Parpados', 'Tratamiento plasmatico para parpados', 45, 1, JSON_ARRAY(), JSON_OBJECT(), 350000, @pack_tecnologia_plasmatica_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Pink Glow + Ultrasonido', 'Pink Glow con ultrasonido', 60, 3, JSON_ARRAY(), JSON_OBJECT(), 189000, @pack_pink_glow_id);

-- ---------- PACKS DE TRATAMIENTOS CAPILAR (UNIVERSAL) ----------
-- Usando SP para crear packs capilares con validaciones
CALL sp_crear_pack_completo(@tratamiento_capilar_id, 'Carboxiterapia Capilar', 'Carboxiterapia para el cabello', 60, 6, JSON_ARRAY(), JSON_OBJECT(), 579000, @pack_carboxiterapia_capilar_id);
CALL sp_crear_pack_completo(@tratamiento_capilar_id, 'Plasma Rico en Plaquetas Capilar', 'PRP para el cabello', 60, 6, JSON_ARRAY(), JSON_OBJECT(), 579000, @pack_prp_capilar_id);
CALL sp_crear_pack_completo(@tratamiento_capilar_id, 'Fotobiomodulacion Capilar', 'Fotobiomodulacion para el cabello', 60, 6, JSON_ARRAY(), JSON_OBJECT(), 579000, @pack_fotobiomodulacion_capilar_id);

-- ---------- PACKS DE TRATAMIENTOS DEPILACION (MUJER) ----------
-- Usando SP para crear packs de depilación con validaciones
CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Cuerpo Completo', 'Depilacion laser cuerpo completo', 120, 6, 
 JSON_ARRAY('PIERNAS', 'BRAZOS', 'REBAJE', 'INTERGLUTEO', 'ROSTRO_C', 'CUELLO', 'BOZO', 'AXILA', 'MENTON', 'PATILLAS', 'ESPALDA', 'ABDOMEN', 'GLUTEOS', 'PECHO', 'BARBA'), 
 JSON_OBJECT('PIERNAS', 45000, 'BRAZOS', 35000, 'REBAJE', 25000, 'INTERGLUTEO', 20000, 'ROSTRO_C', 30000, 'CUELLO', 25000, 'BOZO', 15000, 'AXILA', 20000, 'MENTON', 15000, 'PATILLAS', 15000, 'ESPALDA', 40000, 'ABDOMEN', 30000, 'GLUTEOS', 25000, 'PECHO', 30000, 'BARBA', 25000),
 499000, @pack_cuerpo_completo_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Cuerpo Completo Sin Rostro', 'Depilacion laser cuerpo completo sin rostro', 90, 6,
 JSON_ARRAY('PIERNAS', 'BRAZOS', 'REBAJE', 'INTERGLUTEO', 'AXILA', 'ESPALDA', 'ABDOMEN', 'GLUTEOS', 'PECHO'), 
 JSON_OBJECT('PIERNAS', 45000, 'BRAZOS', 35000, 'REBAJE', 25000, 'INTERGLUTEO', 20000, 'AXILA', 20000, 'ESPALDA', 40000, 'ABDOMEN', 30000, 'GLUTEOS', 25000, 'PECHO', 30000),
 399000, @pack_cuerpo_sin_rostro_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Rostro Completo', 'Depilacion laser rostro completo', 45, 8,
 JSON_ARRAY('ROSTRO_C', 'CUELLO', 'BOZO', 'AXILA', 'MENTON', 'PATILLAS', 'BARBA'), 
 JSON_OBJECT('ROSTRO_C', 30000, 'CUELLO', 25000, 'BOZO', 15000, 'AXILA', 20000, 'MENTON', 15000, 'PATILLAS', 15000, 'BARBA', 25000),
 149900, @pack_rostro_completo_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Full Body', 'Depilacion laser full body: piernas, brazos, axilas, rebaje, intergluteo', 75, 6,
 JSON_ARRAY('PIERNAS', 'BRAZOS', 'AXILA', 'REBAJE', 'INTERGLUTEO'), 
 JSON_OBJECT('PIERNAS', 45000, 'BRAZOS', 35000, 'AXILA', 20000, 'REBAJE', 25000, 'INTERGLUTEO', 20000),
 259000, @pack_full_body_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Semi Full', 'Depilacion laser semi full: piernas, axilas, rebaje, intergluteo', 60, 6,
 JSON_ARRAY('PIERNAS', 'AXILA', 'REBAJE', 'INTERGLUTEO'), 
 JSON_OBJECT('PIERNAS', 45000, 'AXILA', 20000, 'REBAJE', 25000, 'INTERGLUTEO', 20000),
 199000, @pack_semi_full_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Bikini Full', 'Depilacion laser bikini full: rebaje e intergluteo', 30, 6,
 JSON_ARRAY('REBAJE', 'INTERGLUTEO'), 
 JSON_OBJECT('REBAJE', 25000, 'INTERGLUTEO', 20000),
 99000, @pack_bikini_full_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Bikini Full + Axilas', 'Depilacion laser bikini full con axilas', 35, 6,
 JSON_ARRAY('REBAJE', 'INTERGLUTEO', 'AXILA'), 
 JSON_OBJECT('REBAJE', 25000, 'INTERGLUTEO', 20000, 'AXILA', 20000),
 120000, @pack_bikini_axilas_id);

-- ---------- PACKS DE TRATAMIENTOS DEPILACION (HOMBRE) ----------
-- Packs específicos para hombres
CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Abdomen Pecho y Espalda', 'Depilacion laser abdomen, pecho y espalda', 90, 8,
 JSON_ARRAY('ABDOMEN', 'PECHO', 'ESPALDA'), 
 JSON_OBJECT('ABDOMEN', 30000, 'PECHO', 30000, 'ESPALDA', 40000),
 289000, @pack_abdomen_pecho_espalda_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Pierna Completa', 'Depilacion laser pierna completa', 75, 8,
 JSON_ARRAY('PIERNAS'), 
 JSON_OBJECT('PIERNAS', 45000),
 199000, @pack_pierna_completa_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Brazos Completos', 'Depilacion laser brazos completos', 60, 8,
 JSON_ARRAY('BRAZOS'), 
 JSON_OBJECT('BRAZOS', 35000),
 159000, @pack_brazos_completos_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Gluteos', 'Depilacion laser gluteos', 45, 8,
 JSON_ARRAY('GLUTEOS'), 
 JSON_OBJECT('GLUTEOS', 25000),
 100000, @pack_gluteos_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Rostro Completo Mas Barba', 'Depilacion laser rostro completo mas barba', 60, 10,
 JSON_ARRAY('ROSTRO_C', 'BARBA', 'BOZO', 'AXILA', 'MENTON', 'PATILLAS'), 
 JSON_OBJECT('ROSTRO_C', 30000, 'BARBA', 25000, 'BOZO', 15000, 'AXILA', 20000, 'MENTON', 15000, 'PATILLAS', 15000),
 240000, @pack_rostro_barba_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Perfilado de Barba', 'Perfilado de barba (pomulos, borde del cuello)', 45, 8,
 JSON_ARRAY('BARBA', 'CUELLO'), 
 JSON_OBJECT('BARBA', 25000, 'CUELLO', 25000),
 150000, @pack_perfilado_barba_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Cuerpo Completo Hombre', 'Depilacion laser cuerpo completo para hombre', 120, 8,
 JSON_ARRAY('PIERNAS', 'BRAZOS', 'ABDOMEN', 'PECHO', 'ESPALDA', 'GLUTEOS', 'BARBA', 'AXILA'), 
 JSON_OBJECT('PIERNAS', 45000, 'BRAZOS', 35000, 'ABDOMEN', 30000, 'PECHO', 30000, 'ESPALDA', 40000, 'GLUTEOS', 25000, 'BARBA', 25000, 'AXILA', 20000),
 799000, @pack_cuerpo_completo_hombre_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Axila', 'Depilacion laser axila', 30, 8,
 JSON_ARRAY('AXILA'), 
 JSON_OBJECT('AXILA', 20000),
 99000, @pack_axila_id);

-- ---------- PACKS CORPORALES (UNIVERSAL) ----------
-- Packs corporales para ambos géneros
CALL sp_crear_pack_completo(@tratamiento_corporal_id, 'Hidrolipoclasia Ultrasónica', 'Hidrolipoclasia ultrasónica', 60, 3,
 JSON_ARRAY(), 
 JSON_OBJECT(),
 250000, @pack_hidrolipoclasia_id);

CALL sp_crear_pack_completo(@tratamiento_corporal_id, 'Radiofrecuencia', 'Radiofrecuencia corporal', 60, 6,
 JSON_ARRAY(), 
 JSON_OBJECT(),
 250000, @pack_radiofrecuencia_corporal_id);

CALL sp_crear_pack_completo(@tratamiento_corporal_id, 'Radiofrecuencia Mas Carboxiterapia', 'Radiofrecuencia mas carboxiterapia', 75, 6,
 JSON_ARRAY(), 
 JSON_OBJECT(),
 299000, @pack_radiofrecuencia_carboxi_id);

CALL sp_crear_pack_completo(@tratamiento_corporal_id, 'Criolipolisis Protocolo A', 'Criolipolisis protocolo A - sin reafirmantes', 90, 1,
 JSON_ARRAY(), 
 JSON_OBJECT(),
 499000, @pack_criolipolisis_a_id);

CALL sp_crear_pack_completo(@tratamiento_corporal_id, 'Criolipolisis Protocolo B', 'Criolipolisis protocolo B - con reafirmante', 90, 1,
 JSON_ARRAY(), 
 JSON_OBJECT(),
 699000, @pack_criolipolisis_b_id);

CALL sp_crear_pack_completo(@tratamiento_corporal_id, 'Criolipolisis Protocolo C', 'Criolipolisis protocolo C - abdomen sobre 30% grasa', 90, 1,
 JSON_ARRAY(), 
 JSON_OBJECT(),
 899000, @pack_criolipolisis_c_id);

CALL sp_crear_pack_completo(@tratamiento_corporal_id, 'Criolipolisis Protocolo D', 'Criolipolisis protocolo D - abdomen muy bultoso', 90, 1,
 JSON_ARRAY(), 
 JSON_OBJECT(),
 990000, @pack_criolipolisis_d_id);

CALL sp_crear_pack_completo(@tratamiento_corporal_id, 'Hifu 4D', 'Hifu 4D corporal', 60, 2,
 JSON_ARRAY(), 
 JSON_OBJECT(),
 299000, @pack_hifu_4d_id);

CALL sp_crear_pack_completo(@tratamiento_corporal_id, 'Criolipolisis Dinámica', 'Criolipolisis dinámica para reafirmante', 60, 4,
 JSON_ARRAY(), 
 JSON_OBJECT(),
 250000, @pack_criolipolisis_dinamica_id);

CALL sp_crear_pack_completo(@tratamiento_corporal_id, 'Levantamiento de Gluteos', 'Levantamiento de gluteos con radiofrecuencia', 75, 6,
 JSON_ARRAY(), 
 JSON_OBJECT(),
 250000, @pack_levantamiento_gluteos_id);

-- ---------- PACKS DE EVALUACIÓN ----------
-- Usando SP para crear packs de evaluación con validaciones
CALL sp_crear_pack_completo(@tratamiento_evaluacion_id, 'Evaluación Depilación', 'Evaluación médica para depilación láser', 30, 1, 
 JSON_ARRAY(), JSON_OBJECT(), 0, @pack_evaluacion_depilacion_id);

CALL sp_crear_pack_completo(@tratamiento_evaluacion_id, 'Evaluación Corporal/Facial', 'Evaluación médica para tratamientos corporales y faciales', 30, 1, 
 JSON_ARRAY(), JSON_OBJECT(), 0, @pack_evaluacion_corporal_id);

CALL sp_crear_pack_completo(@tratamiento_evaluacion_id, 'Evaluación Completa', 'Evaluación médica para depilación y tratamientos corporales/faciales', 45, 1, 
 JSON_ARRAY(), JSON_OBJECT(), 0, @pack_evaluacion_completa_id);

-- ---------- PRECIOS DE TRATAMIENTOS ----------
-- Usando SP para crear precios de tratamientos con validaciones
CALL sp_crear_precio_tratamiento(@tratamiento_evaluacion_id, 0, @precio_evaluacion_id);
CALL sp_crear_precio_tratamiento(@tratamiento_facial_id, 39900, @precio_facial_id);
CALL sp_crear_precio_tratamiento(@tratamiento_capilar_id, 579000, @precio_capilar_id);
CALL sp_crear_precio_tratamiento(@tratamiento_depilacion_id, 499000, @precio_depilacion_id);

-- ---------- OFERTAS DE PACKS (PROMOCIONES) ----------
-- Usando SP para crear ofertas con validaciones
-- Ofertas FACIAL
CALL sp_crear_oferta_pack_temporal('Promo Limpieza Facial', 37.5, '2025-01-01', '2025-12-31', TRUE, 1, @oferta_limpieza_facial_id);
CALL sp_crear_oferta_pack_temporal('Promo Radiofrecuencia Facial', 20.4, '2025-01-01', '2025-12-31', TRUE, 6, @oferta_radiofrecuencia_facial_id);
CALL sp_crear_oferta_pack_temporal('Promo Criolipolisis Facial', 25.1, '2025-01-01', '2025-12-31', TRUE, 6, @oferta_criolipolisis_facial_id);
CALL sp_crear_oferta_pack_temporal('Promo Plasma Rico en Plaquetas', 24.7, '2025-01-01', '2025-12-31', TRUE, 3, @oferta_prp_facial_id);
CALL sp_crear_oferta_pack_temporal('Promo Radiofrecuencia Fraccionada', 13.3, '2025-01-01', '2025-12-31', TRUE, 3, @oferta_radiofrecuencia_fraccionada_id);
CALL sp_crear_oferta_pack_temporal('Promo Tecnologia Plasmatica', 28.6, '2025-01-01', '2025-12-31', TRUE, 1, @oferta_tecnologia_plasmatica_id);
CALL sp_crear_oferta_pack_temporal('Promo Pink Glow', 26.0, '2025-01-01', '2025-12-31', TRUE, 3, @oferta_pink_glow_id);

-- Ofertas CAPILAR
CALL sp_crear_oferta_pack_temporal('Promo Carboxiterapia Capilar', 13.8, '2025-01-01', '2025-12-31', TRUE, 6, @oferta_carboxiterapia_capilar_id);
CALL sp_crear_oferta_pack_temporal('Promo PRP Capilar', 13.8, '2025-01-01', '2025-12-31', TRUE, 6, @oferta_prp_capilar_id);
CALL sp_crear_oferta_pack_temporal('Promo Fotobiomodulacion Capilar', 13.8, '2025-01-01', '2025-12-31', TRUE, 6, @oferta_fotobiomodulacion_capilar_id);

-- Ofertas DEPILACION
CALL sp_crear_oferta_pack_temporal('Promo Full Body', 23.2, '2025-01-01', '2025-12-31', TRUE, 6, @oferta_full_body_id);
CALL sp_crear_oferta_pack_temporal('Promo Semi Full', 20.1, '2025-01-01', '2025-12-31', TRUE, 6, @oferta_semi_full_id);
CALL sp_crear_oferta_pack_temporal('Promo Bikini Full', 19.3, '2025-01-01', '2025-12-31', TRUE, 6, @oferta_bikini_full_id);
CALL sp_crear_oferta_pack_temporal('Promo Bikini Full + Axilas', 17.5, '2025-01-01', '2025-12-31', TRUE, 6, @oferta_bikini_axilas_id);

-- ---------- ASOCIAR OFERTAS CON PACKS FACIAL ----------
-- Usando SP para asociar ofertas con packs
CALL sp_asociar_oferta_pack(@oferta_limpieza_facial_id, @pack_limpieza_facial_id, 37.5, @asociacion_limpieza_facial);
CALL sp_asociar_oferta_pack(@oferta_radiofrecuencia_facial_id, @pack_radiofrecuencia_facial_id, 20.4, @asociacion_radiofrecuencia_facial);
CALL sp_asociar_oferta_pack(@oferta_criolipolisis_facial_id, @pack_criolipolisis_facial_id, 25.1, @asociacion_criolipolisis_facial);
CALL sp_asociar_oferta_pack(@oferta_prp_facial_id, @pack_prp_facial_id, 24.7, @asociacion_prp_facial);
CALL sp_asociar_oferta_pack(@oferta_radiofrecuencia_fraccionada_id, @pack_radiofrecuencia_fraccionada_id, 13.3, @asociacion_radiofrecuencia_fraccionada);
CALL sp_asociar_oferta_pack(@oferta_tecnologia_plasmatica_id, @pack_tecnologia_plasmatica_id, 28.6, @asociacion_tecnologia_plasmatica);
CALL sp_asociar_oferta_pack(@oferta_pink_glow_id, @pack_pink_glow_id, 26.0, @asociacion_pink_glow);

-- ---------- ASOCIAR OFERTAS CON PACKS CAPILAR ----------
-- Usando SP para asociar ofertas con packs capilares
CALL sp_asociar_oferta_pack(@oferta_carboxiterapia_capilar_id, @pack_carboxiterapia_capilar_id, 13.8, @asociacion_carboxiterapia_capilar);
CALL sp_asociar_oferta_pack(@oferta_prp_capilar_id, @pack_prp_capilar_id, 13.8, @asociacion_prp_capilar);
CALL sp_asociar_oferta_pack(@oferta_fotobiomodulacion_capilar_id, @pack_fotobiomodulacion_capilar_id, 13.8, @asociacion_fotobiomodulacion_capilar);

-- ---------- ASOCIAR OFERTAS CON PACKS DEPILACION ----------
-- Usando SP para asociar ofertas con packs de depilación
CALL sp_asociar_oferta_pack(@oferta_full_body_id, @pack_full_body_id, 23.2, @asociacion_full_body);
CALL sp_asociar_oferta_pack(@oferta_semi_full_id, @pack_semi_full_id, 20.1, @asociacion_semi_full);
CALL sp_asociar_oferta_pack(@oferta_bikini_full_id, @pack_bikini_full_id, 19.3, @asociacion_bikini_full);
CALL sp_asociar_oferta_pack(@oferta_bikini_axilas_id, @pack_bikini_axilas_id, 17.5, @asociacion_bikini_axilas);

-- =============================================================================
-- STORED PROCEDURES FALTANTES PARA API - CRUD OPERATIONS
-- =============================================================================

-- ---------- FICHAS CRUD ----------
DELIMITER $$
CREATE PROCEDURE sp_fichas_get(IN p_id INT)
BEGIN
    SELECT * FROM ficha WHERE id = p_id;
END$$

CREATE PROCEDURE sp_fichas_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    DECLARE v_codigo VARCHAR(40);
    
    -- Generar código único para la ficha
    SET v_codigo = CONCAT('FICHA-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
    
    INSERT INTO ficha (
        codigo, nombres, apellidos, rut, telefono, email, 
        fecha_nacimiento, direccion, observaciones, activo, fecha_creacion
    ) VALUES (
        v_codigo,
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombres')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.apellidos')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.rut')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.telefono')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.email')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.fecha_nacimiento')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.direccion')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.observaciones')),
        TRUE,
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM ficha WHERE id = v_id;
END$$

CREATE PROCEDURE sp_fichas_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE ficha SET
        nombres = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombres')), nombres),
        apellidos = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.apellidos')), apellidos),
        rut = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.rut')), rut),
        telefono = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.telefono')), telefono),
        email = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.email')), email),
        fecha_nacimiento = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.fecha_nacimiento')), fecha_nacimiento),
        direccion = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.direccion')), direccion),
        observaciones = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.observaciones')), observaciones),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM ficha WHERE id = p_id;
END$$

CREATE PROCEDURE sp_fichas_delete(IN p_id INT)
BEGIN
    UPDATE ficha SET 
        activo = FALSE,
        fecha_actualizacion = NOW() 
    WHERE id = p_id;
    SELECT 'Ficha marcada como eliminada' as mensaje;
END$$

-- ---------- FICHAS ESPECIFICAS CRUD ----------
CREATE PROCEDURE sp_fichas_especificas_get(IN p_id INT)
BEGIN
    SELECT * FROM ficha_especifica WHERE id = p_id;
END$$

CREATE PROCEDURE sp_fichas_especificas_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO ficha_especifica (
        evaluacion_id, tipo_id, datos, 
        observaciones, activo, fecha_creacion
    ) VALUES (
        JSON_EXTRACT(p_data, '$.evaluacion_id'),
        JSON_EXTRACT(p_data, '$.tipo_id'),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.datos')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.observaciones')),
        TRUE,
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM ficha_especifica WHERE id = v_id;
END$$

CREATE PROCEDURE sp_fichas_especificas_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE ficha_especifica SET
        datos = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.datos')), datos),
        observaciones = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.observaciones')), observaciones),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM ficha_especifica WHERE id = p_id;
END$$

CREATE PROCEDURE sp_fichas_especificas_delete(IN p_id INT)
BEGIN
    UPDATE ficha_especifica SET 
        activo = FALSE,
        fecha_actualizacion = NOW() 
    WHERE id = p_id;
    SELECT 'Ficha específica marcada como eliminada' as mensaje;
END$$

-- ---------- CONSENTIMIENTO FIRMA CRUD ----------
CREATE PROCEDURE sp_consentimiento_firma_get(IN p_id INT)
BEGIN
    SELECT * FROM consentimiento_firma WHERE id = p_id;
END$$

CREATE PROCEDURE sp_consentimiento_firma_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO consentimiento_firma (
        ficha_especifica_id, firma_digital, fecha_firma, 
        ip_address, user_agent, fecha_creacion
    ) VALUES (
        JSON_EXTRACT(p_data, '$.ficha_especifica_id'),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.firma_digital')),
        NOW(),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.ip_address')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.user_agent')),
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM consentimiento_firma WHERE id = v_id;
END$$

CREATE PROCEDURE sp_consentimiento_firma_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE consentimiento_firma SET
        firma_digital = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.firma_digital')), firma_digital),
        fecha_firma = NOW()
    WHERE id = p_id;
    SELECT * FROM consentimiento_firma WHERE id = p_id;
END$$

CREATE PROCEDURE sp_consentimiento_firma_delete(IN p_id INT)
BEGIN
    UPDATE consentimiento_firma SET 
        activo = FALSE,
        fecha_firma = NOW()
    WHERE id = p_id;
    SELECT 'Consentimiento marcado como eliminado' as mensaje;
END$$

-- ---------- EVALUACIONES CRUD ----------
CREATE PROCEDURE sp_evaluaciones_get(IN p_id INT)
BEGIN
    SELECT * FROM evaluacion WHERE id = p_id;
END$$

CREATE PROCEDURE sp_evaluaciones_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO evaluacion (
        ficha_id, profesional_id, fecha_evaluacion, 
        observaciones, recomendaciones, fecha_creacion
    ) VALUES (
        JSON_EXTRACT(p_data, '$.ficha_id'),
        JSON_EXTRACT(p_data, '$.profesional_id'),
        NOW(),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.observaciones')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.recomendaciones')),
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM evaluacion WHERE id = v_id;
END$$

CREATE PROCEDURE sp_evaluaciones_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE evaluacion SET
        observaciones = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.observaciones')), observaciones),
        recomendaciones = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.recomendaciones')), recomendaciones),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM evaluacion WHERE id = p_id;
END$$

CREATE PROCEDURE sp_evaluaciones_delete(IN p_id INT)
BEGIN
    UPDATE evaluacion SET 
        estado = 'ELIMINADA',
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT 'Evaluación marcada como eliminada' as mensaje;
END$$

-- ---------- VENTAS CRUD ----------
CREATE PROCEDURE sp_ventas_get(IN p_id INT)
BEGIN
    SELECT v.*, f.codigo as ficha_codigo, f.nombres, f.apellidos, e.fecha_evaluacion,
           t.nombre as tratamiento_nombre, p.nombre as pack_nombre
    FROM venta v
    JOIN ficha f ON v.ficha_id = f.id
    LEFT JOIN evaluacion e ON v.evaluacion_id = e.id
    LEFT JOIN tratamiento t ON v.tratamiento_id = t.id
    LEFT JOIN pack p ON v.pack_id = p.id
    WHERE v.id = p_id;
END$$

-- PROCEDURE ELIMINADO: sp_ventas_create tenía columnas incorrectas
-- Se usa sp_crear_venta y sp_crear_venta_evaluacion en su lugar

CREATE PROCEDURE sp_ventas_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE venta SET
        total_venta = COALESCE(JSON_EXTRACT(p_data, '$.total_venta'), total_venta),
        descuento_manual = COALESCE(JSON_EXTRACT(p_data, '$.descuento_manual'), descuento_manual),
        total_final = COALESCE(JSON_EXTRACT(p_data, '$.total_final'), total_final),
        estado = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.estado')), estado),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM venta WHERE id = p_id;
END$$

CREATE PROCEDURE sp_ventas_delete(IN p_id INT)
BEGIN
    UPDATE venta SET estado = 'cancelada', fecha_actualizacion = NOW() WHERE id = p_id;
    SELECT 'Venta cancelada' as mensaje;
END$$

-- ---------- AUTH ----------
CREATE PROCEDURE sp_auth_login(IN p_data JSON)
BEGIN
    DECLARE v_usuario_id INT;
    DECLARE v_nombre VARCHAR(255);
    DECLARE v_email VARCHAR(255);
    DECLARE v_rol VARCHAR(50);
    
    SELECT id, nombre, email, rol 
    INTO v_usuario_id, v_nombre, v_email, v_rol
    FROM usuario 
    WHERE email = JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.email'))
    AND password = JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.password'))
    AND activo = TRUE;
    
    IF v_usuario_id IS NOT NULL THEN
        CALL sp_actualizar_ultimo_login(v_usuario_id);
        SELECT 
            v_usuario_id as id,
            v_nombre as nombre,
            v_email as email,
            v_rol as rol,
            'Login exitoso' as mensaje;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Credenciales inválidas';
    END IF;
END$$

-- ---------- PAGOS CRUD ----------
CREATE PROCEDURE sp_pagos_get(IN p_id INT)
BEGIN
    SELECT * FROM pago WHERE id = p_id;
END$$

CREATE PROCEDURE sp_pagos_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO pago (
        venta_id, monto, metodo_pago, referencia, 
        estado, fecha_creacion
    ) VALUES (
        JSON_EXTRACT(p_data, '$.venta_id'),
        JSON_EXTRACT(p_data, '$.monto'),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.metodo_pago')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.referencia')),
        'pendiente',
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM pago WHERE id = v_id;
END$$

CREATE PROCEDURE sp_pagos_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE pago SET
        monto = COALESCE(JSON_EXTRACT(p_data, '$.monto'), monto),
        metodo_pago = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.metodo_pago')), metodo_pago),
        referencia = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.referencia')), referencia),
        estado = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.estado')), estado),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM pago WHERE id = p_id;
END$$

CREATE PROCEDURE sp_pagos_delete(IN p_id INT)
BEGIN
    UPDATE pago SET estado = 'cancelado', fecha_actualizacion = NOW() WHERE id = p_id;
    SELECT 'Pago cancelado' as mensaje;
END$$

-- ---------- SESIONES CRUD ----------
CREATE PROCEDURE sp_sesiones_get(IN p_id INT)
BEGIN
    SELECT * FROM sesion WHERE id = p_id;
END$$

CREATE PROCEDURE sp_sesiones_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO sesion (
        venta_id, profesional_id, box_id, fecha_planificada,
        duracion_minutos, estado, observaciones, fecha_creacion
    ) VALUES (
        JSON_EXTRACT(p_data, '$.venta_id'),
        JSON_EXTRACT(p_data, '$.profesional_id'),
        JSON_EXTRACT(p_data, '$.box_id'),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.fecha_planificada')),
        JSON_EXTRACT(p_data, '$.duracion_minutos'),
        'planificada',
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.observaciones')),
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM sesion WHERE id = v_id;
END$$

CREATE PROCEDURE sp_sesiones_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE sesion SET
        fecha_planificada = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.fecha_planificada')), fecha_planificada),
        duracion_minutos = COALESCE(JSON_EXTRACT(p_data, '$.duracion_minutos'), duracion_minutos),
        estado = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.estado')), estado),
        observaciones = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.observaciones')), observaciones),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM sesion WHERE id = p_id;
END$$

CREATE PROCEDURE sp_sesiones_delete(IN p_id INT)
BEGIN
    UPDATE sesion SET estado = 'cancelada', fecha_actualizacion = NOW() WHERE id = p_id;
    SELECT 'Sesión cancelada' as mensaje;
END$$

-- ---------- AGENDA CRUD ----------
CREATE PROCEDURE sp_agenda_get(IN p_id INT)
BEGIN
    SELECT * FROM sesion WHERE id = p_id;
END$$

CREATE PROCEDURE sp_agenda_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO sesion (
        venta_id, profesional_id, box_id, fecha_planificada,
        duracion_minutos, estado, observaciones, fecha_creacion
    ) VALUES (
        JSON_EXTRACT(p_data, '$.venta_id'),
        JSON_EXTRACT(p_data, '$.profesional_id'),
        JSON_EXTRACT(p_data, '$.box_id'),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.fecha_planificada')),
        JSON_EXTRACT(p_data, '$.duracion_minutos'),
        'planificada',
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.observaciones')),
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM sesion WHERE id = v_id;
END$$

CREATE PROCEDURE sp_agenda_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE sesion SET
        fecha_planificada = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.fecha_planificada')), fecha_planificada),
        duracion_minutos = COALESCE(JSON_EXTRACT(p_data, '$.duracion_minutos'), duracion_minutos),
        estado = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.estado')), estado),
        observaciones = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.observaciones')), observaciones),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM sesion WHERE id = p_id;
END$$

CREATE PROCEDURE sp_agenda_delete(IN p_id INT)
BEGIN
    UPDATE sesion SET estado = 'cancelada', fecha_actualizacion = NOW() WHERE id = p_id;
    SELECT 'Cita cancelada' as mensaje;
END$$

-- ---------- OFERTAS CRUD ----------
CREATE PROCEDURE sp_ofertas_get(IN p_id INT)
BEGIN
    SELECT * FROM oferta WHERE id = p_id;
END$$

CREATE PROCEDURE sp_ofertas_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO oferta (
        nombre, tipo, descripcion, porc_descuento,
        fecha_inicio, fecha_fin, combinable, activo, prioridad, fecha_creacion
    ) VALUES (
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.tipo')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')),
        JSON_EXTRACT(p_data, '$.porc_descuento'),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.fecha_inicio')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.fecha_fin')),
        COALESCE(JSON_EXTRACT(p_data, '$.combinable'), FALSE),
        COALESCE(JSON_EXTRACT(p_data, '$.activo'), TRUE),
        COALESCE(JSON_EXTRACT(p_data, '$.prioridad'), 1),
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM oferta WHERE id = v_id;
END$$

CREATE PROCEDURE sp_ofertas_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE oferta SET
        nombre = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')), nombre),
        tipo = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.tipo')), tipo),
        descripcion = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')), descripcion),
        porc_descuento = COALESCE(JSON_EXTRACT(p_data, '$.porc_descuento'), porc_descuento),
        fecha_inicio = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.fecha_inicio')), fecha_inicio),
        fecha_fin = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.fecha_fin')), fecha_fin),
        combinable = COALESCE(JSON_EXTRACT(p_data, '$.combinable'), combinable),
        activo = COALESCE(JSON_EXTRACT(p_data, '$.activo'), activo),
        prioridad = COALESCE(JSON_EXTRACT(p_data, '$.prioridad'), prioridad),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM oferta WHERE id = p_id;
END$$

CREATE PROCEDURE sp_ofertas_delete(IN p_id INT)
BEGIN
    UPDATE oferta SET activo = FALSE, fecha_actualizacion = NOW() WHERE id = p_id;
    SELECT 'Oferta eliminada' as mensaje;
END$$

-- ---------- TRATAMIENTOS CRUD ----------
CREATE PROCEDURE sp_tratamientos_get(IN p_id INT)
BEGIN
    SELECT * FROM tratamiento WHERE id = p_id;
END$$

CREATE PROCEDURE sp_tratamientos_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO tratamiento (
        nombre, descripcion, requiere_sesiones, 
        duracion_minutos, intervalo_dias, fecha_creacion
    ) VALUES (
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')),
        COALESCE(JSON_EXTRACT(p_data, '$.requiere_sesiones'), FALSE),
        JSON_EXTRACT(p_data, '$.duracion_minutos'),
        JSON_EXTRACT(p_data, '$.intervalo_dias'),
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM tratamiento WHERE id = v_id;
END$$

CREATE PROCEDURE sp_tratamientos_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE tratamiento SET
        nombre = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')), nombre),
        descripcion = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')), descripcion),
        requiere_sesiones = COALESCE(JSON_EXTRACT(p_data, '$.requiere_sesiones'), requiere_sesiones),
        duracion_minutos = COALESCE(JSON_EXTRACT(p_data, '$.duracion_minutos'), duracion_minutos),
        intervalo_dias = COALESCE(JSON_EXTRACT(p_data, '$.intervalo_dias'), intervalo_dias),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM tratamiento WHERE id = p_id;
END$$

CREATE PROCEDURE sp_tratamientos_delete(IN p_id INT)
BEGIN
    UPDATE tratamiento SET activo = FALSE, fecha_actualizacion = NOW() WHERE id = p_id;
    SELECT 'Tratamiento eliminado' as mensaje;
END$$

-- ---------- PACKS CRUD ----------
CREATE PROCEDURE sp_packs_get(IN p_id INT)
BEGIN
    SELECT * FROM pack WHERE id = p_id;
END$$

CREATE PROCEDURE sp_packs_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO pack (
        nombre, descripcion, tratamiento_id, precio_base,
        sesiones_incluidas, activo, fecha_creacion
    ) VALUES (
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')),
        JSON_EXTRACT(p_data, '$.tratamiento_id'),
        JSON_EXTRACT(p_data, '$.precio_base'),
        JSON_EXTRACT(p_data, '$.sesiones_incluidas'),
        COALESCE(JSON_EXTRACT(p_data, '$.activo'), TRUE),
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM pack WHERE id = v_id;
END$$

CREATE PROCEDURE sp_packs_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE pack SET
        nombre = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')), nombre),
        descripcion = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')), descripcion),
        tratamiento_id = COALESCE(JSON_EXTRACT(p_data, '$.tratamiento_id'), tratamiento_id),
        precio_base = COALESCE(JSON_EXTRACT(p_data, '$.precio_base'), precio_base),
        sesiones_incluidas = COALESCE(JSON_EXTRACT(p_data, '$.sesiones_incluidas'), sesiones_incluidas),
        activo = COALESCE(JSON_EXTRACT(p_data, '$.activo'), activo),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM pack WHERE id = p_id;
END$$

CREATE PROCEDURE sp_packs_delete(IN p_id INT)
BEGIN
    UPDATE pack SET activo = FALSE, fecha_actualizacion = NOW() WHERE id = p_id;
    SELECT 'Pack eliminado' as mensaje;
END$$

-- ---------- SUCURSALES CRUD ----------
CREATE PROCEDURE sp_sucursales_get(IN p_id INT)
BEGIN
    SELECT * FROM sucursal WHERE id = p_id;
END$$

CREATE PROCEDURE sp_sucursales_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO sucursal (
        nombre, direccion, telefono, email, 
        activo, fecha_creacion
    ) VALUES (
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.direccion')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.telefono')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.email')),
        COALESCE(JSON_EXTRACT(p_data, '$.activo'), TRUE),
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM sucursal WHERE id = v_id;
END$$

CREATE PROCEDURE sp_sucursales_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE sucursal SET
        nombre = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')), nombre),
        direccion = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.direccion')), direccion),
        telefono = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.telefono')), telefono),
        email = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.email')), email),
        activo = COALESCE(JSON_EXTRACT(p_data, '$.activo'), activo),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM sucursal WHERE id = p_id;
END$$

CREATE PROCEDURE sp_sucursales_delete(IN p_id INT)
BEGIN
    UPDATE sucursal SET activo = FALSE, fecha_actualizacion = NOW() WHERE id = p_id;
    SELECT 'Sucursal eliminada' as mensaje;
END$$

-- ---------- PROFESIONALES CRUD ----------
CREATE PROCEDURE sp_profesionales_get(IN p_id INT)
BEGIN
    SELECT * FROM profesional WHERE id = p_id;
END$$

CREATE PROCEDURE sp_profesionales_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO profesional (
        nombre, apellido, email, telefono, 
        especialidad, activo, fecha_creacion
    ) VALUES (
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.apellido')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.email')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.telefono')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.especialidad')),
        COALESCE(JSON_EXTRACT(p_data, '$.activo'), TRUE),
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM profesional WHERE id = v_id;
END$$

CREATE PROCEDURE sp_profesionales_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE profesional SET
        nombre = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')), nombre),
        apellido = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.apellido')), apellido),
        email = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.email')), email),
        telefono = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.telefono')), telefono),
        especialidad = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.especialidad')), especialidad),
        activo = COALESCE(JSON_EXTRACT(p_data, '$.activo'), activo),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM profesional WHERE id = p_id;
END$$

CREATE PROCEDURE sp_profesionales_delete(IN p_id INT)
BEGIN
    UPDATE profesional SET activo = FALSE, fecha_actualizacion = NOW() WHERE id = p_id;
    SELECT 'Profesional eliminado' as mensaje;
END$$

-- ---------- BOXES CRUD ----------
CREATE PROCEDURE sp_boxes_get(IN p_id INT)
BEGIN
    SELECT * FROM box WHERE id = p_id;
END$$

CREATE PROCEDURE sp_boxes_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO box (
        nombre, sucursal_id, descripcion, capacidad, 
        activo, fecha_creacion
    ) VALUES (
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')),
        JSON_EXTRACT(p_data, '$.sucursal_id'),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')),
        JSON_EXTRACT(p_data, '$.capacidad'),
        COALESCE(JSON_EXTRACT(p_data, '$.activo'), TRUE),
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM box WHERE id = v_id;
END$$

CREATE PROCEDURE sp_boxes_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE box SET
        nombre = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')), nombre),
        sucursal_id = COALESCE(JSON_EXTRACT(p_data, '$.sucursal_id'), sucursal_id),
        descripcion = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')), descripcion),
        capacidad = COALESCE(JSON_EXTRACT(p_data, '$.capacidad'), capacidad),
        activo = COALESCE(JSON_EXTRACT(p_data, '$.activo'), activo)
    WHERE id = p_id;
    SELECT * FROM box WHERE id = p_id;
END$$

CREATE PROCEDURE sp_boxes_delete(IN p_id INT)
BEGIN
    UPDATE box SET activo = FALSE WHERE id = p_id;
    SELECT 'Box eliminado' as mensaje;
END$$

-- ---------- ZONAS CRUD ----------
CREATE PROCEDURE sp_zonas_get(IN p_codigo VARCHAR(10))
BEGIN
    SELECT * FROM zona_cuerpo WHERE codigo = p_codigo;
END$$

CREATE PROCEDURE sp_zonas_create(IN p_data JSON)
BEGIN
    DECLARE v_codigo VARCHAR(10);
    INSERT INTO zona_cuerpo (
        codigo, nombre, descripcion, precio_base, 
        activo, fecha_creacion
    ) VALUES (
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.codigo')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')),
        JSON_EXTRACT(p_data, '$.precio_base'),
        COALESCE(JSON_EXTRACT(p_data, '$.activo'), TRUE),
        NOW()
    );
    SET v_codigo = JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.codigo'));
    SELECT * FROM zona_cuerpo WHERE codigo = v_codigo;
END$$

CREATE PROCEDURE sp_zonas_update(IN p_codigo VARCHAR(10), IN p_data JSON)
BEGIN
    UPDATE zona_cuerpo SET
        nombre = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')), nombre),
        descripcion = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')), descripcion),
        precio_base = COALESCE(JSON_EXTRACT(p_data, '$.precio_base'), precio_base),
        activo = COALESCE(JSON_EXTRACT(p_data, '$.activo'), activo),
        fecha_actualizacion = NOW()
    WHERE codigo = p_codigo;
    SELECT * FROM zona_cuerpo WHERE codigo = p_codigo;
END$$

CREATE PROCEDURE sp_zonas_delete(IN p_codigo VARCHAR(10))
BEGIN
    UPDATE zona_cuerpo SET activo = FALSE, fecha_actualizacion = NOW() WHERE codigo = p_codigo;
    SELECT 'Zona eliminada' as mensaje;
END$$

-- ---------- OFERTAS COMBO CRUD ----------
CREATE PROCEDURE sp_ofertas_combo_get(IN p_id INT)
BEGIN
    SELECT * FROM oferta_combo WHERE id = p_id;
END$$

CREATE PROCEDURE sp_ofertas_combo_create(IN p_data JSON)
BEGIN
    DECLARE v_id INT;
    INSERT INTO oferta_combo (
        nombre, descripcion, porc_descuento, activo, 
        fecha_creacion
    ) VALUES (
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')),
        JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')),
        JSON_EXTRACT(p_data, '$.porc_descuento'),
        COALESCE(JSON_EXTRACT(p_data, '$.activo'), TRUE),
        NOW()
    );
    SET v_id = LAST_INSERT_ID();
    SELECT * FROM oferta_combo WHERE id = v_id;
END$$

CREATE PROCEDURE sp_ofertas_combo_update(IN p_id INT, IN p_data JSON)
BEGIN
    UPDATE oferta_combo SET
        nombre = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.nombre')), nombre),
        descripcion = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_data, '$.descripcion')), descripcion),
        porc_descuento = COALESCE(JSON_EXTRACT(p_data, '$.porc_descuento'), porc_descuento),
        activo = COALESCE(JSON_EXTRACT(p_data, '$.activo'), activo),
        fecha_actualizacion = NOW()
    WHERE id = p_id;
    SELECT * FROM oferta_combo WHERE id = p_id;
END$$

CREATE PROCEDURE sp_ofertas_combo_delete(IN p_id INT)
BEGIN
    UPDATE oferta_combo SET activo = FALSE, fecha_actualizacion = NOW() WHERE id = p_id;
    SELECT 'Oferta combo eliminada' as mensaje;
END$$

DELIMITER ;

-- =============================================================================
-- ACTUALIZACIONES DE GÉNERO PARA PACKS EXISTENTES
-- =============================================================================

-- Actualizar packs existentes para especificar género
-- Packs de depilación para mujeres (F)
UPDATE pack SET genero = 'F' WHERE id IN (@pack_cuerpo_completo_id, @pack_cuerpo_sin_rostro_id, @pack_rostro_completo_id, @pack_full_body_id, @pack_semi_full_id, @pack_bikini_full_id, @pack_bikini_axilas_id);

-- Packs de depilación para hombres (M)
UPDATE pack SET genero = 'M' WHERE id IN (@pack_abdomen_pecho_espalda_id, @pack_pierna_completa_id, @pack_brazos_completos_id, @pack_gluteos_id, @pack_rostro_barba_id, @pack_perfilado_barba_id, @pack_cuerpo_completo_hombre_id, @pack_axila_id);

-- Packs universales (U) - faciales, capilares, corporales, evaluaciones
UPDATE pack SET genero = 'U' WHERE id IN (@pack_limpieza_facial_id, @pack_radiofrecuencia_facial_id, @pack_criolipolisis_facial_id, @pack_hifu_facial_id, @pack_prp_facial_id, @pack_radiofrecuencia_fraccionada_id, @pack_tecnologia_plasmatica_id, @pack_pink_glow_id, @pack_carboxiterapia_capilar_id, @pack_prp_capilar_id, @pack_fotobiomodulacion_capilar_id, @pack_hidrolipoclasia_id, @pack_radiofrecuencia_corporal_id, @pack_radiofrecuencia_carboxi_id, @pack_criolipolisis_a_id, @pack_criolipolisis_b_id, @pack_criolipolisis_c_id, @pack_criolipolisis_d_id, @pack_hifu_4d_id, @pack_criolipolisis_dinamica_id, @pack_levantamiento_gluteos_id, @pack_evaluacion_depilacion_id, @pack_evaluacion_corporal_id, @pack_evaluacion_completa_id);

-- =============================================================================
-- NOTA IMPORTANTE: TODA LA LoGICA DE NEGOCIO ESTa EN LA BASE DE DATOS
-- =============================================================================
-- 
-- Esta migracion implementa el proceso correcto del negocio:
-- 
-- FLUJO CORRECTO:
-- 1. FICHA GENERAL (libre) - se puede crear en cualquier momento
-- 2. EVALUACIoN (obligatoria) - se agenda o se hace inmediatamente
-- 3. FICHA ESPECiFICA (nace en la evaluacion) - depilacion o corporal
-- 4. VENTA (requiere evaluacion y ficha especifica) - con validaciones
-- 5. CONSENTIMIENTO (solo para depilacion) - con firma digital
-- 
-- CAMBIOS PRINCIPALES:
-- ✓ EVALUACIoN es obligatoria para todas las ventas
-- ✓ FICHA_ESPECiFICA nace en la evaluacion (no antes)
-- ✓ VENTA requiere tanto evaluacion como ficha especifica
-- ✓ CONSENTIMIENTO vinculado a ficha especifica de depilacion
-- ✓ Trigger trg_venta_requiere_evaluacion_ficha_especifica
-- ✓ Campos actualizados segun ERD.mmd
-- 
-- La API debe ser un simple passthrough a la base de datos.
-- NO implementar logica de negocio en la API.
-- 
-- Vistas disponibles para consultas complejas:
-- ✓ v_venta_progreso: Progreso de sesiones por venta
-- ✓ v_plan_vs_ejecucion: Comparacion plan vs ejecucion
-- ✓ v_ofertas_aplicables: Ofertas activas y en fecha
-- ✓ v_ofertas_pack: Ofertas por pack con descuentos
-- ✓ v_ofertas_tratamiento: Ofertas por tratamiento
-- ✓ v_ofertas_combo: Ofertas combo con descuento adicional
-- ✓ v_sesiones_completas: Sesiones con toda la informacion
-- ✓ v_ventas_completas: Ventas con toda la informacion
-- ✓ v_reporte_ofertas: Reporte de ofertas aplicadas
-- ✓ v_disponibilidad_profesionales: Disponibilidad para agenda
-- 
-- Stored Procedures por categoria:
-- ✓ FICHAS: sp_crear_ficha, sp_buscar_fichas, sp_agregar_ficha_especifica
-- ✓ EVALUACIONES: sp_crear_evaluacion
-- ✓ VENTAS: sp_crear_venta, sp_aplicar_descuento_manual, sp_aplicar_ofertas
-- ✓ AGENDA: sp_agendar_sesion, sp_generar_plan_sesiones, sp_confirmar_paciente, sp_abrir_sesion, sp_cerrar_sesion, sp_reprogramar_sesion, sp_cancelar_sesion
-- ✓ OFERTAS: sp_crear_oferta_pack, sp_crear_oferta_tratamiento, sp_crear_oferta_combo
-- ✓ PROFESIONALES: sp_crear_profesional, sp_obtener_disponibilidad
-- ✓ REPORTES: sp_reporte_progreso_ventas, sp_reporte_plan_vs_ejecucion
-- ✓ PRECIOS: sp_crear_precio_tratamiento, sp_obtener_precio_tratamiento, sp_actualizar_precio_pack
-- ✓ PAGOS: sp_crear_pago, sp_agregar_detalle_pago, sp_confirmar_pago, sp_obtener_pagos_venta
-- ✓ DEPILACIoN: sp_guardar_intensidades_zonas, sp_cargar_intensidades_anteriores, sp_calcular_precio_zonas
-- ✓ CONSENTIMIENTOS: sp_guardar_firma_digital, sp_verificar_consentimiento_firmado, sp_obtener_firma_consentimiento
-- ✓ UTILITARIOS: sp_ofertas_aplicables_venta, sp_sesiones_venta, sp_venta_completa
-- ✓ TRATAMIENTOS: sp_obtener_tratamientos_disponibles, sp_obtener_packs_tratamiento, sp_obtener_zonas_cuerpo, sp_calcular_precio_pack_zonas, sp_obtener_historial_tratamientos
-- =============================================================================
