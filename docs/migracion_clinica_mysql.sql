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
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ix_box_sucursal', 'box', 'sucursal_id', FALSE);

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
  grupo_sanguineo VARCHAR(5) NOT NULL,
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
  observaciones TEXT NOT NULL
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
  precio_regular DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  precio_oferta DECIMAL(12,2) NOT NULL,
  fecha_inicio_oferta DATE NOT NULL,
  fecha_fin_oferta DATE NOT NULL,
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
  precio_regular DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  precio_oferta DECIMAL(12,2) NOT NULL,
  fecha_inicio_oferta DATE NOT NULL,
  fecha_fin_oferta DATE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL AddIndexIfNotExists('ux_pack_tratamiento_nombre', 'pack', 'tratamiento_id, nombre', TRUE);





CREATE TABLE IF NOT EXISTS oferta (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  tipo VARCHAR(40) NOT NULL, -- 'pack_temporal'|'descuento_manual'|'combo_packs'
  descripcion TEXT NOT NULL,
  porc_descuento DECIMAL(5,2) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
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
  evaluacion_id BIGINT NOT NULL,
  ficha_especifica_id BIGINT NOT NULL,
  tratamiento_id BIGINT NOT NULL,
  pack_id BIGINT,
  cantidad_sesiones INT NOT NULL DEFAULT 1,
  precio_lista DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  descuento_manual_pct DECIMAL(5,2) DEFAULT 0,
  descuento_aplicado_total DECIMAL(12,2) DEFAULT 0,
  total_pagado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
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
  google_calendar_event_id VARCHAR(255) NOT NULL,
  fecha_planificada TIMESTAMP NOT NULL,
  fecha_ejecucion TIMESTAMP NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'planificada', -- planificada|confirmada|realizada|no_show|cancelada
  paciente_confirmado BOOLEAN NOT NULL DEFAULT FALSE,
  abierta_en TIMESTAMP NOT NULL,
  cerrada_en TIMESTAMP NOT NULL,
  observaciones TEXT NOT NULL,
  intensidades_zonas JSON NOT NULL,
  datos_sesion JSON NOT NULL,
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
CALL AddCheckConstraintIfNotExists('precio_tratamiento', 'ck_precio_tratamiento_regular_pos', 'precio_regular >= 0');
CALL AddCheckConstraintIfNotExists('precio_tratamiento', 'ck_precio_tratamiento_oferta_pos', 'precio_oferta IS NULL OR precio_oferta >= 0');
CALL AddCheckConstraintIfNotExists('pack', 'ck_pack_precio_regular_pos', 'precio_regular >= 0');
CALL AddCheckConstraintIfNotExists('pack', 'ck_pack_precio_oferta_pos', 'precio_oferta IS NULL OR precio_oferta >= 0');
CALL AddCheckConstraintIfNotExists('pack', 'ck_pack_sesiones_pos', 'sesiones_incluidas >= 1');
CALL AddCheckConstraintIfNotExists('pago', 'ck_pago_monto_pos', 'monto_total >= 0');
CALL AddCheckConstraintIfNotExists('pago', 'ck_pago_estado', 'estado IN (''pendiente'',''pagado'',''anulado'')');
CALL AddCheckConstraintIfNotExists('pago_detalle', 'ck_pago_detalle_monto_pos', 'monto >= 0');
CALL AddCheckConstraintIfNotExists('oferta_tratamiento', 'ck_oferta_tratamiento_descuento_rango', 'porc_descuento >= 0 AND porc_descuento <= 100');
CALL AddCheckConstraintIfNotExists('oferta_combo', 'ck_oferta_combo_descuento_adicional_rango', 'porc_descuento_adicional >= 0 AND porc_descuento_adicional <= 100');

-- ---------- Triggers ----------

-- Validar que la venta tenga evaluacion y ficha especifica requeridas
-- La evaluacion es obligatoria para todas las ventas EXCEPTO para evaluaciones
-- La ficha especifica nace en la evaluacion

DELIMITER $$

CREATE TRIGGER trg_venta_requiere_evaluacion_ficha_especifica
BEFORE INSERT ON venta
FOR EACH ROW
BEGIN
  DECLARE eval_ficha BIGINT DEFAULT NULL;
  DECLARE eval_id BIGINT DEFAULT NULL;
  DECLARE ficha_esp_id BIGINT DEFAULT NULL;
  DECLARE es_evaluacion BOOLEAN DEFAULT FALSE;
  DECLARE EXIT HANDLER FOR NOT FOUND
  BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registro no encontrado en validacion';
  END;
  
  -- Verificar si es una venta de evaluación
  SELECT TRUE INTO es_evaluacion FROM tratamiento WHERE id = NEW.tratamiento_id AND nombre = 'EVALUACION';
  
  -- Si es evaluación, permitir sin evaluación_id y ficha_especifica_id
  IF es_evaluacion THEN
    IF NEW.evaluacion_id IS NOT NULL OR NEW.ficha_especifica_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Venta de evaluacion no debe tener evaluacion_id ni ficha_especifica_id inicialmente';
    END IF;
    LEAVE;
  END IF;
  
  -- Para ventas normales, validar que la evaluacion existe y pertenece a la misma ficha
  IF NEW.evaluacion_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Evaluacion es obligatoria para ventas normales';
  END IF;

  SELECT ficha_id INTO eval_ficha FROM evaluacion WHERE id = NEW.evaluacion_id;
  IF eval_ficha IS NULL OR eval_ficha != NEW.ficha_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Evaluacion debe existir y pertenecer a la misma ficha';
  END IF;

  -- Validar que la ficha especifica existe y pertenece a la evaluacion
  IF NEW.ficha_especifica_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ficha especifica es obligatoria para ventas normales';
  END IF;
  
  SELECT evaluacion_id INTO eval_id FROM ficha_especifica WHERE id = NEW.ficha_especifica_id;
  IF eval_id IS NULL OR eval_id != NEW.evaluacion_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ficha especifica debe existir y pertenecer a la evaluacion';
  END IF;
  
  -- Validar que la ficha especifica pertenece a la misma ficha
  SELECT ficha_especifica.id INTO ficha_esp_id 
  FROM ficha_especifica, evaluacion 
  WHERE ficha_especifica.evaluacion_id = evaluacion.id 
    AND ficha_especifica.id = NEW.ficha_especifica_id 
    AND evaluacion.ficha_id = NEW.ficha_id;
  
  IF ficha_esp_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ficha especifica debe pertenecer a la evaluacion de la misma ficha';
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
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin >= CURDATE() THEN TRUE
    WHEN o.fecha_fin IS NULL AND o.fecha_inicio <= CURDATE() THEN TRUE
    WHEN CURDATE() BETWEEN o.fecha_inicio AND o.fecha_fin THEN TRUE
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
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin >= CURDATE() THEN TRUE
    WHEN o.fecha_fin IS NULL AND o.fecha_inicio <= CURDATE() THEN TRUE
    WHEN CURDATE() BETWEEN o.fecha_inicio AND o.fecha_fin THEN TRUE
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
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin >= CURDATE() THEN TRUE
    WHEN o.fecha_fin IS NULL AND o.fecha_inicio <= CURDATE() THEN TRUE
    WHEN CURDATE() BETWEEN o.fecha_inicio AND o.fecha_fin THEN TRUE
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
    WHEN o.fecha_inicio IS NULL AND o.fecha_fin >= CURDATE() THEN TRUE
    WHEN o.fecha_fin IS NULL AND o.fecha_inicio <= CURDATE() THEN TRUE
    WHEN CURDATE() BETWEEN o.fecha_inicio AND o.fecha_fin THEN TRUE
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
  p.duracion_sesion_min,
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

-- FIC-004: Crear ficha especifica desde sesion de evaluacion
DELIMITER $$
CREATE PROCEDURE sp_crear_ficha_especifica_desde_sesion(
    IN p_sesion_id BIGINT,
    IN p_tipo_id BIGINT,
    IN p_datos JSON,
    IN p_observaciones TEXT,
    OUT p_ficha_especifica_id BIGINT
)
BEGIN
    DECLARE v_evaluacion_id BIGINT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Crear evaluacion desde la sesion si no existe
    IF NOT EXISTS (SELECT 1 FROM evaluacion e 
                   JOIN sesion s ON e.ficha_id = (SELECT v.ficha_id FROM venta v WHERE v.id = s.venta_id)
                   WHERE s.id = p_sesion_id) THEN
        CALL sp_crear_evaluacion_desde_sesion(p_sesion_id, '', '', v_evaluacion_id);
    ELSE
        SELECT e.id INTO v_evaluacion_id FROM evaluacion e 
        JOIN sesion s ON e.ficha_id = (SELECT v.ficha_id FROM venta v WHERE v.id = s.venta_id)
        WHERE s.id = p_sesion_id;
    END IF;
    
    -- Crear ficha especifica
    INSERT INTO ficha_especifica (evaluacion_id, tipo_id, datos, observaciones)
    VALUES (v_evaluacion_id, p_tipo_id, p_datos, p_observaciones);
    
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

-- EVA-002: Crear evaluacion desde sesion (nuevo flujo)
DELIMITER $$
CREATE PROCEDURE sp_crear_evaluacion_desde_sesion(
    IN p_sesion_id BIGINT,
    IN p_observaciones TEXT,
    IN p_recomendaciones TEXT,
    OUT p_evaluacion_id BIGINT
)
BEGIN
    DECLARE v_ficha_id BIGINT;
    DECLARE v_profesional_id BIGINT;
    DECLARE v_tratamiento_id BIGINT;
    DECLARE v_pack_id BIGINT;
    DECLARE v_precio_lista DECIMAL(12,2);
    DECLARE v_cantidad_sesiones INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Obtener datos de la sesion y venta
    SELECT v.ficha_id, s.profesional_id, v.tratamiento_id, v.pack_id, v.precio_lista, v.cantidad_sesiones
    INTO v_ficha_id, v_profesional_id, v_tratamiento_id, v_pack_id, v_precio_lista, v_cantidad_sesiones
    FROM sesion s
    JOIN venta v ON s.venta_id = v.id
    WHERE s.id = p_sesion_id;
    
    -- Crear evaluacion
    INSERT INTO evaluacion (ficha_id, profesional_id, tratamiento_id, pack_id, precio_sugerido, sesiones_sugeridas, observaciones, recomendaciones, estado)
    VALUES (v_ficha_id, v_profesional_id, v_tratamiento_id, v_pack_id, v_precio_lista, v_cantidad_sesiones, p_observaciones, p_recomendaciones, 'COMPLETADA');
    
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
    OUT p_venta_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO venta (ficha_id, evaluacion_id, ficha_especifica_id, tratamiento_id, pack_id, cantidad_sesiones, precio_lista, descuento_manual_pct)
    VALUES (p_ficha_id, p_evaluacion_id, p_ficha_especifica_id, p_tratamiento_id, p_pack_id, p_cantidad_sesiones, p_precio_lista, p_descuento_manual_pct);
    
    SET p_venta_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- VEN-002: Crear venta de evaluacion (sin evaluacion ni ficha especifica)
DELIMITER $$
CREATE PROCEDURE sp_crear_venta_evaluacion(
    IN p_ficha_id BIGINT,
    IN p_tratamiento_id BIGINT,
    IN p_pack_id BIGINT,
    IN p_profesional_id BIGINT,
    OUT p_venta_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Para evaluacion, no necesitamos evaluacion_id ni ficha_especifica_id inicialmente
    -- Se crearán cuando se cierre la sesión de evaluación
    INSERT INTO venta (ficha_id, evaluacion_id, ficha_especifica_id, tratamiento_id, pack_id, cantidad_sesiones, precio_lista, descuento_manual_pct)
    VALUES (p_ficha_id, NULL, NULL, p_tratamiento_id, p_pack_id, 1, 0, 0);
    
    SET p_venta_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- VEN-002: Aplicar descuento manual
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
    
    INSERT INTO sesion (venta_id, numero_sesion, sucursal_id, box_id, profesional_id, fecha_planificada, observaciones)
    VALUES (p_venta_id, p_numero_sesion, p_sucursal_id, p_box_id, p_profesional_id, p_fecha_planificada, p_observaciones);
    
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

-- AGE-007: Cerrar sesion de evaluacion y completar venta
DELIMITER $$
CREATE PROCEDURE sp_cerrar_sesion_evaluacion(
    IN p_sesion_id BIGINT,
    IN p_observaciones TEXT,
    IN p_recomendaciones TEXT,
    IN p_fichas_especificas JSON -- Array de objetos con tipo_id, datos, observaciones
)
BEGIN
    DECLARE v_venta_id BIGINT;
    DECLARE v_evaluacion_id BIGINT;
    DECLARE v_ficha_especifica_id BIGINT;
    DECLARE v_tipo_id BIGINT;
    DECLARE v_datos JSON;
    DECLARE v_observaciones TEXT;
    DECLARE i INT DEFAULT 0;
    DECLARE v_total_fichas INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Obtener venta_id de la sesion
    SELECT venta_id INTO v_venta_id FROM sesion WHERE id = p_sesion_id;
    
    -- Crear evaluacion desde la sesion
    CALL sp_crear_evaluacion_desde_sesion(p_sesion_id, p_observaciones, p_recomendaciones, v_evaluacion_id);
    
    -- Crear fichas especificas si se proporcionan
    IF p_fichas_especificas IS NOT NULL THEN
        SET v_total_fichas = JSON_LENGTH(p_fichas_especificas);
        
        WHILE i < v_total_fichas DO
            SET v_tipo_id = JSON_UNQUOTE(JSON_EXTRACT(p_fichas_especificas, CONCAT('$[', i, '].tipo_id')));
            SET v_datos = JSON_EXTRACT(p_fichas_especificas, CONCAT('$[', i, '].datos'));
            SET v_observaciones = JSON_UNQUOTE(JSON_EXTRACT(p_fichas_especificas, CONCAT('$[', i, '].observaciones')));
            
            -- Crear ficha especifica
            CALL sp_agregar_ficha_especifica(v_evaluacion_id, v_tipo_id, v_datos, v_observaciones, v_ficha_especifica_id);
            
            SET i = i + 1;
        END WHILE;
    END IF;
    
    -- Actualizar la venta con la evaluacion y ficha especifica creadas
    UPDATE venta 
    SET evaluacion_id = v_evaluacion_id,
        ficha_especifica_id = v_ficha_especifica_id
    WHERE id = v_venta_id;
    
    -- Cerrar la sesion
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
    IN p_prioridad INT,
    OUT p_oferta_id BIGINT
)
BEGIN
    INSERT INTO oferta (nombre, tipo, descripcion, porc_descuento, fecha_inicio, fecha_fin, combinable, activo, prioridad)
    VALUES (p_nombre, 'pack_temporal', p_nombre, p_porc_descuento, p_fecha_inicio, p_fecha_fin, p_combinable, TRUE, p_prioridad);
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
    IN p_precio_regular DECIMAL(12,2),
    IN p_precio_oferta DECIMAL(12,2),
    IN p_fecha_inicio_oferta DATE,
    IN p_fecha_fin_oferta DATE,
    OUT p_precio_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO precio_tratamiento (tratamiento_id, precio_regular, precio_oferta, fecha_inicio_oferta, fecha_fin_oferta, activo)
    VALUES (p_tratamiento_id, p_precio_regular, p_precio_oferta, p_fecha_inicio_oferta, p_fecha_fin_oferta, TRUE);
    
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
        CASE 
            WHEN pt.precio_oferta IS NOT NULL 
                AND (pt.fecha_inicio_oferta IS NULL OR pt.fecha_inicio_oferta <= CURDATE())
                AND (pt.fecha_fin_oferta IS NULL OR pt.fecha_fin_oferta >= CURDATE())
            THEN pt.precio_oferta
            ELSE pt.precio_regular
        END AS precio_actual
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
    IN p_precio_regular DECIMAL(12,2),
    IN p_precio_oferta DECIMAL(12,2),
    IN p_fecha_inicio_oferta DATE,
    IN p_fecha_fin_oferta DATE
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE pack 
    SET precio_regular = p_precio_regular,
        precio_oferta = p_precio_oferta,
        fecha_inicio_oferta = p_fecha_inicio_oferta,
        fecha_fin_oferta = p_fecha_fin_oferta
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

-- TRA-006: Obtener tipos de ficha especifica para evaluacion
DELIMITER $$
CREATE PROCEDURE sp_obtener_tipos_ficha_evaluacion(
    IN p_pack_id BIGINT
)
BEGIN
    DECLARE v_pack_nombre VARCHAR(150);
    
    -- Obtener nombre del pack
    SELECT nombre INTO v_pack_nombre FROM pack WHERE id = p_pack_id;
    
    -- Retornar tipos de ficha específica según el pack
    IF v_pack_nombre LIKE '%Depilacion%' THEN
        SELECT id, nombre, descripcion, requiere_consentimiento, template_consentimiento, campos_requeridos
        FROM tipo_ficha_especifica 
        WHERE nombre = 'DEPILACION' AND activo = TRUE;
    ELSEIF v_pack_nombre LIKE '%Facial%' THEN
        SELECT id, nombre, descripcion, requiere_consentimiento, template_consentimiento, campos_requeridos
        FROM tipo_ficha_especifica 
        WHERE nombre = 'FACIAL' AND activo = TRUE;
    ELSEIF v_pack_nombre LIKE '%Completa%' THEN
        SELECT id, nombre, descripcion, requiere_consentimiento, template_consentimiento, campos_requeridos
        FROM tipo_ficha_especifica 
        WHERE nombre IN ('DEPILACION', 'FACIAL') AND activo = TRUE
        ORDER BY nombre;
    ELSE
        -- Pack no reconocido, retornar todos los tipos activos
        SELECT id, nombre, descripcion, requiere_consentimiento, template_consentimiento, campos_requeridos
        FROM tipo_ficha_especifica 
        WHERE activo = TRUE
        ORDER BY nombre;
    END IF;
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
    IN p_precio_regular DECIMAL(12,2),
    IN p_precio_oferta DECIMAL(12,2),
    IN p_fecha_inicio_oferta DATE,
    IN p_fecha_fin_oferta DATE,
    OUT p_pack_id BIGINT
)
BEGIN
    INSERT INTO pack (
        tratamiento_id, nombre, descripcion, duracion_sesion_min, sesiones_incluidas,
        zonas_incluidas, precio_por_zona, precio_regular, precio_oferta,
        fecha_inicio_oferta, fecha_fin_oferta, activo
    ) VALUES (
        p_tratamiento_id, p_nombre, p_descripcion, p_duracion_sesion_min, p_sesiones_incluidas,
        p_zonas_incluidas, p_precio_por_zona, p_precio_regular, p_precio_oferta,
        p_fecha_inicio_oferta, p_fecha_fin_oferta, TRUE
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
    IN p_grupo_sanguineo VARCHAR(5),
    IN p_contacto_emergencia VARCHAR(150),
    IN p_telefono_emergencia VARCHAR(50),
    OUT p_profesional_id BIGINT
)
BEGIN
    INSERT INTO profesional (
        usuario_id, nombre, apellidos, rut, telefono, email, tipo_profesional, 
        bio, foto_url, especialidad, titulo_profesional, numero_colegio, 
        fecha_nacimiento, direccion, estado_civil, grupo_sanguineo, 
        contacto_emergencia, telefono_emergencia, activo
    ) VALUES (
        p_usuario_id, p_nombre, p_apellidos, p_rut, p_telefono, p_email, p_tipo_profesional,
        p_bio, p_foto_url, p_especialidad, p_titulo_profesional, p_numero_colegio,
        p_fecha_nacimiento, p_direccion, p_estado_civil, p_grupo_sanguineo,
        p_contacto_emergencia, p_telefono_emergencia, TRUE
    );
    SET p_profesional_id = LAST_INSERT_ID();
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
CALL sp_crear_tratamiento('EVALUACION', 'Evaluacion inicial del paciente para determinar tratamiento', FALSE, 30, 0, @tratamiento_evaluacion_id);
CALL sp_crear_tratamiento('FACIAL', 'Tratamientos faciales y esteticos', TRUE, 60, 7, @tratamiento_facial_id);
CALL sp_crear_tratamiento('CAPILAR', 'Tratamientos capilares y regenerativos', TRUE, 90, 14, @tratamiento_capilar_id);
CALL sp_crear_tratamiento('DEPILACION', 'Depilacion laser y tratamientos corporales', TRUE, 45, 30, @tratamiento_depilacion_id);

-- ---------- TIPOS DE FICHA ESPECiFICA ----------
-- Usando SP para crear tipos de ficha específica con validaciones
CALL sp_crear_tipo_ficha_especifica('DEPILACION', 'Ficha especifica para depilacion laser', TRUE, 'Consentimiento informado para depilacion laser', JSON_OBJECT('zonas', 'array', 'intensidad_anterior', 'text', 'observaciones_medicas', 'text'), @tipo_depilacion_id);
CALL sp_crear_tipo_ficha_especifica('CORPORAL', 'Ficha especifica para tratamientos corporales', TRUE, 'Consentimiento informado para tratamientos corporales', JSON_OBJECT('medidas_antes', 'object', 'medidas_despues', 'object', 'objetivo_estetico', 'text'), @tipo_corporal_id);
CALL sp_crear_tipo_ficha_especifica('FACIAL', 'Ficha especifica para tratamientos faciales', TRUE, 'Consentimiento informado para tratamientos faciales', JSON_OBJECT('tipo_piel', 'text', 'alergias', 'text', 'tratamientos_previos', 'text'), @tipo_facial_id);
CALL sp_crear_tipo_ficha_especifica('CAPILAR', 'Ficha especifica para tratamientos capilares', TRUE, 'Consentimiento informado para tratamientos capilares', JSON_OBJECT('tipo_cabello', 'text', 'problemas_capilares', 'text', 'tratamientos_previos', 'text'), @tipo_capilar_id);

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
    '1980-01-01', 'Av. Las Condes 1000, Las Condes, Santiago', 'Casado', 'O+', 'Maria Herrera', '+56 9 8888 8888',
    @profesional_juan_id
);

-- ---------- PACKS DE TRATAMIENTOS FACIAL ----------
-- Usando SP para crear packs faciales con validaciones
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Limpieza Facial Profunda', 'Limpieza facial profunda con productos especializados', 60, 1, JSON_ARRAY(), JSON_OBJECT(), 39900, 24900, '2024-01-01', '2024-12-31', @pack_limpieza_facial_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Radiofrecuencia Facial', 'Radiofrecuencia facial reafirmante', 60, 6, JSON_ARRAY(), JSON_OBJECT(), 250000, 199000, '2024-01-01', '2024-12-31', @pack_radiofrecuencia_facial_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Criolipolisis Facial Dinamica', 'Criolipolisis facial reafirmante', 60, 6, JSON_ARRAY(), JSON_OBJECT(), 399000, 299000, '2024-01-01', '2024-12-31', @pack_criolipolisis_facial_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Hifu Facial 4D + PRP', 'Hifu facial 4D con plasma rico en plaquetas', 90, 2, JSON_ARRAY(), JSON_OBJECT(), 299000, 299000, '2024-01-01', '2024-12-31', @pack_hifu_facial_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Plasma Rico en Plaquetas', 'Tratamiento con plasma rico en plaquetas', 60, 3, JSON_ARRAY(), JSON_OBJECT(), 199000, 149900, '2024-01-01', '2024-12-31', @pack_prp_facial_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Radiofrecuencia Fraccionada + Vitamina C', 'Radiofrecuencia fraccionada con vitamina C', 75, 3, JSON_ARRAY(), JSON_OBJECT(), 450000, 390000, '2024-01-01', '2024-12-31', @pack_radiofrecuencia_fraccionada_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Tecnologia Plasmatica Parpados', 'Tratamiento plasmatico para parpados', 45, 1, JSON_ARRAY(), JSON_OBJECT(), 350000, 250000, '2024-01-01', '2024-12-31', @pack_tecnologia_plasmatica_id);
CALL sp_crear_pack_completo(@tratamiento_facial_id, 'Pink Glow + Ultrasonido', 'Pink Glow con ultrasonido', 60, 3, JSON_ARRAY(), JSON_OBJECT(), 189000, 139900, '2024-01-01', '2024-12-31', @pack_pink_glow_id);

-- ---------- PACKS DE TRATAMIENTOS CAPILAR ----------
-- Usando SP para crear packs capilares con validaciones
CALL sp_crear_pack_completo(@tratamiento_capilar_id, 'Carboxiterapia Capilar', 'Carboxiterapia para el cabello', 60, 6, JSON_ARRAY(), JSON_OBJECT(), 579000, 499000, '2024-01-01', '2024-12-31', @pack_carboxiterapia_capilar_id);
CALL sp_crear_pack_completo(@tratamiento_capilar_id, 'Plasma Rico en Plaquetas Capilar', 'PRP para el cabello', 60, 6, JSON_ARRAY(), JSON_OBJECT(), 579000, 499000, '2024-01-01', '2024-12-31', @pack_prp_capilar_id);
CALL sp_crear_pack_completo(@tratamiento_capilar_id, 'Fotobiomodulacion Capilar', 'Fotobiomodulacion para el cabello', 60, 6, JSON_ARRAY(), JSON_OBJECT(), 579000, 499000, '2024-01-01', '2024-12-31', @pack_fotobiomodulacion_capilar_id);

-- ---------- PACKS DE TRATAMIENTOS DEPILACION ----------
-- Usando SP para crear packs de depilación con validaciones
CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Cuerpo Completo', 'Depilacion laser cuerpo completo', 120, 6, 
 JSON_ARRAY('PIERNAS', 'BRAZOS', 'REBAJE', 'INTERGLUTEO', 'ROSTRO_C', 'CUELLO', 'BOZO', 'AXILA', 'MENTON', 'PATILLAS', 'ESPALDA', 'ABDOMEN', 'GLUTEOS', 'PECHO', 'BARBA'), 
 JSON_OBJECT('PIERNAS', 45000, 'BRAZOS', 35000, 'REBAJE', 25000, 'INTERGLUTEO', 20000, 'ROSTRO_C', 30000, 'CUELLO', 25000, 'BOZO', 15000, 'AXILA', 20000, 'MENTON', 15000, 'PATILLAS', 15000, 'ESPALDA', 40000, 'ABDOMEN', 30000, 'GLUTEOS', 25000, 'PECHO', 30000, 'BARBA', 25000),
 499000, 499000, '2024-01-01', '2024-12-31', @pack_cuerpo_completo_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Cuerpo Completo Sin Rostro', 'Depilacion laser cuerpo completo sin rostro', 90, 6,
 JSON_ARRAY('PIERNAS', 'BRAZOS', 'REBAJE', 'INTERGLUTEO', 'AXILA', 'ESPALDA', 'ABDOMEN', 'GLUTEOS', 'PECHO'), 
 JSON_OBJECT('PIERNAS', 45000, 'BRAZOS', 35000, 'REBAJE', 25000, 'INTERGLUTEO', 20000, 'AXILA', 20000, 'ESPALDA', 40000, 'ABDOMEN', 30000, 'GLUTEOS', 25000, 'PECHO', 30000),
 399000, 399000, '2024-01-01', '2024-12-31', @pack_cuerpo_sin_rostro_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Rostro Completo', 'Depilacion laser rostro completo', 45, 8,
 JSON_ARRAY('ROSTRO_C', 'CUELLO', 'BOZO', 'AXILA', 'MENTON', 'PATILLAS', 'BARBA'), 
 JSON_OBJECT('ROSTRO_C', 30000, 'CUELLO', 25000, 'BOZO', 15000, 'AXILA', 20000, 'MENTON', 15000, 'PATILLAS', 15000, 'BARBA', 25000),
 149900, 149900, '2024-01-01', '2024-12-31', @pack_rostro_completo_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Full Body', 'Depilacion laser full body: piernas, brazos, axilas, rebaje, intergluteo', 75, 6,
 JSON_ARRAY('PIERNAS', 'BRAZOS', 'AXILA', 'REBAJE', 'INTERGLUTEO'), 
 JSON_OBJECT('PIERNAS', 45000, 'BRAZOS', 35000, 'AXILA', 20000, 'REBAJE', 25000, 'INTERGLUTEO', 20000),
 259000, 199000, '2024-01-01', '2024-12-31', @pack_full_body_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Semi Full', 'Depilacion laser semi full: piernas, axilas, rebaje, intergluteo', 60, 6,
 JSON_ARRAY('PIERNAS', 'AXILA', 'REBAJE', 'INTERGLUTEO'), 
 JSON_OBJECT('PIERNAS', 45000, 'AXILA', 20000, 'REBAJE', 25000, 'INTERGLUTEO', 20000),
 199000, 159000, '2024-01-01', '2024-12-31', @pack_semi_full_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Bikini Full', 'Depilacion laser bikini full: rebaje e intergluteo', 30, 6,
 JSON_ARRAY('REBAJE', 'INTERGLUTEO'), 
 JSON_OBJECT('REBAJE', 25000, 'INTERGLUTEO', 20000),
 99000, 79900, '2024-01-01', '2024-12-31', @pack_bikini_full_id);

CALL sp_crear_pack_completo(@tratamiento_depilacion_id, 'Bikini Full + Axilas', 'Depilacion laser bikini full con axilas', 35, 6,
 JSON_ARRAY('REBAJE', 'INTERGLUTEO', 'AXILA'), 
 JSON_OBJECT('REBAJE', 25000, 'INTERGLUTEO', 20000, 'AXILA', 20000),
 120000, 99000, '2024-01-01', '2024-12-31', @pack_bikini_axilas_id);

-- ---------- PACKS DE EVALUACION ----------
-- Usando SP para crear packs de evaluación con validaciones
CALL sp_crear_pack_completo(@tratamiento_evaluacion_id, 'Evaluacion Depilacion', 'Evaluacion inicial para tratamientos de depilacion laser', 30, 1, JSON_ARRAY(), JSON_OBJECT(), 0, 0, '2024-01-01', '2024-12-31', @pack_evaluacion_depilacion_id);
CALL sp_crear_pack_completo(@tratamiento_evaluacion_id, 'Evaluacion Facial', 'Evaluacion inicial para tratamientos faciales', 30, 1, JSON_ARRAY(), JSON_OBJECT(), 0, 0, '2024-01-01', '2024-12-31', @pack_evaluacion_facial_id);
CALL sp_crear_pack_completo(@tratamiento_evaluacion_id, 'Evaluacion Completa', 'Evaluacion inicial para tratamientos de depilacion y faciales', 45, 1, JSON_ARRAY(), JSON_OBJECT(), 0, 0, '2024-01-01', '2024-12-31', @pack_evaluacion_completa_id);

-- ---------- PRECIOS DE TRATAMIENTOS ----------
-- Usando SP para crear precios de tratamientos con validaciones
CALL sp_crear_precio_tratamiento(@tratamiento_evaluacion_id, 0, 0, '2024-01-01', '2024-12-31', @precio_evaluacion_id);
CALL sp_crear_precio_tratamiento(@tratamiento_facial_id, 39900, 24900, '2024-01-01', '2024-12-31', @precio_facial_id);
CALL sp_crear_precio_tratamiento(@tratamiento_capilar_id, 579000, 499000, '2024-01-01', '2024-12-31', @precio_capilar_id);
CALL sp_crear_precio_tratamiento(@tratamiento_depilacion_id, 499000, 499000, '2024-01-01', '2024-12-31', @precio_depilacion_id);

-- ---------- OFERTAS DE PACKS (PROMOCIONES) ----------
-- Usando SP para crear ofertas con validaciones
-- Ofertas FACIAL
CALL sp_crear_oferta_pack_temporal('Promo Limpieza Facial', 37.5, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_limpieza_facial_id);
CALL sp_crear_oferta_pack_temporal('Promo Radiofrecuencia Facial', 20.4, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_radiofrecuencia_facial_id);
CALL sp_crear_oferta_pack_temporal('Promo Criolipolisis Facial', 25.1, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_criolipolisis_facial_id);
CALL sp_crear_oferta_pack_temporal('Promo Plasma Rico en Plaquetas', 24.7, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_prp_facial_id);
CALL sp_crear_oferta_pack_temporal('Promo Radiofrecuencia Fraccionada', 13.3, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_radiofrecuencia_fraccionada_id);
CALL sp_crear_oferta_pack_temporal('Promo Tecnologia Plasmatica', 28.6, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_tecnologia_plasmatica_id);
CALL sp_crear_oferta_pack_temporal('Promo Pink Glow', 26.0, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_pink_glow_id);

-- Ofertas CAPILAR
CALL sp_crear_oferta_pack_temporal('Promo Carboxiterapia Capilar', 13.8, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_carboxiterapia_capilar_id);
CALL sp_crear_oferta_pack_temporal('Promo PRP Capilar', 13.8, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_prp_capilar_id);
CALL sp_crear_oferta_pack_temporal('Promo Fotobiomodulacion Capilar', 13.8, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_fotobiomodulacion_capilar_id);

-- Ofertas DEPILACION
CALL sp_crear_oferta_pack_temporal('Promo Full Body', 23.2, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_full_body_id);
CALL sp_crear_oferta_pack_temporal('Promo Semi Full', 20.1, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_semi_full_id);
CALL sp_crear_oferta_pack_temporal('Promo Bikini Full', 19.3, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_bikini_full_id);
CALL sp_crear_oferta_pack_temporal('Promo Bikini Full + Axilas', 17.5, '2024-01-01', '2024-12-31', TRUE, 1, @oferta_bikini_axilas_id);

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
-- TIPOS DE FICHA ESPECÍFICA (basados en fichas HTML reales)
-- =============================================================================

-- Tipo DEPILACION (basado en ficha_depilacion.htm)
INSERT INTO tipo_ficha_especifica (nombre, descripcion, requiere_consentimiento, template_consentimiento, campos_requeridos, activo) VALUES
('DEPILACION', 'Ficha específica para depilación láser', TRUE, 
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
), TRUE);

-- Tipo CORPORAL_FACIAL (basado en ficha_corporal_nueva.htm)
INSERT INTO tipo_ficha_especifica (nombre, descripcion, requiere_consentimiento, template_consentimiento, campos_requeridos, activo) VALUES
('CORPORAL_FACIAL', 'Ficha específica para tratamientos corporales y faciales (LIPO WITH ICE)', FALSE, NULL,
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
), TRUE);

-- =============================================================================
-- NOTA IMPORTANTE: TODA LA LoGICA DE NEGOCIO ESTa EN LA BASE DE DATOS
-- =============================================================================
-- 
-- Esta migracion implementa el proceso correcto del negocio:
-- 
-- FLUJO CORRECTO:
-- 1. FICHA GENERAL (libre) - se puede crear en cualquier momento
-- 2. VENTA DE EVALUACIoN (obligatoria) - costo 0, se agenda sesion
-- 3. SESIoN DE EVALUACIoN - profesional llena fichas especificas
-- 4. EVALUACIoN (nace al cerrar sesion) - con observaciones y recomendaciones
-- 5. FICHA ESPECiFICA (nace en la evaluacion) - depilacion o facial
-- 6. VENTA NORMAL (requiere evaluacion y ficha especifica) - con validaciones
-- 7. CONSENTIMIENTO (solo para depilacion) - con firma digital
-- 
-- CAMBIOS PRINCIPALES:
-- ✓ TRATAMIENTO EVALUACIoN agregado (costo 0, no requiere ficha especifica)
-- ✓ PACKS DE EVALUACIoN agregados (Depilacion, Facial, Completa)
-- ✓ VENTA DE EVALUACIoN permite evaluacion_id y ficha_especifica_id NULL
-- ✓ SESIoN DE EVALUACIoN crea evaluacion y fichas especificas al cerrar
-- ✓ EVALUACIoN nace al cerrar sesion de evaluacion
-- ✓ FICHA_ESPECiFICA nace en la evaluacion (no antes)
-- ✓ VENTA NORMAL requiere tanto evaluacion como ficha especifica
-- ✓ CONSENTIMIENTO vinculado a ficha especifica de depilacion
-- ✓ Trigger trg_venta_requiere_evaluacion_ficha_especifica actualizado
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
-- ✓ FICHAS: sp_crear_ficha, sp_buscar_fichas, sp_agregar_ficha_especifica, sp_crear_ficha_especifica_desde_sesion
-- ✓ EVALUACIONES: sp_crear_evaluacion, sp_crear_evaluacion_desde_sesion
-- ✓ VENTAS: sp_crear_venta, sp_crear_venta_evaluacion, sp_aplicar_descuento_manual, sp_aplicar_ofertas
-- ✓ AGENDA: sp_agendar_sesion, sp_generar_plan_sesiones, sp_confirmar_paciente, sp_abrir_sesion, sp_cerrar_sesion, sp_cerrar_sesion_evaluacion, sp_reprogramar_sesion
-- ✓ OFERTAS: sp_crear_oferta_pack, sp_crear_oferta_tratamiento, sp_crear_oferta_combo
-- ✓ PROFESIONALES: sp_crear_profesional, sp_obtener_disponibilidad
-- ✓ REPORTES: sp_reporte_progreso_ventas, sp_reporte_plan_vs_ejecucion
-- ✓ PRECIOS: sp_crear_precio_tratamiento, sp_obtener_precio_tratamiento, sp_actualizar_precio_pack
-- ✓ PAGOS: sp_crear_pago, sp_agregar_detalle_pago, sp_confirmar_pago, sp_obtener_pagos_venta
-- ✓ DEPILACIoN: sp_guardar_intensidades_zonas, sp_cargar_intensidades_anteriores, sp_calcular_precio_zonas
-- ✓ CONSENTIMIENTOS: sp_guardar_firma_digital, sp_verificar_consentimiento_firmado, sp_obtener_firma_consentimiento
-- ✓ UTILITARIOS: sp_ofertas_aplicables_venta, sp_sesiones_venta, sp_venta_completa
-- ✓ TRATAMIENTOS: sp_obtener_tratamientos_disponibles, sp_obtener_packs_tratamiento, sp_obtener_zonas_cuerpo, sp_calcular_precio_pack_zonas, sp_obtener_historial_tratamientos, sp_obtener_tipos_ficha_evaluacion
-- =============================================================================
