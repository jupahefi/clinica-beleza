-- =============================================================================
-- Clínica Estética - Esquema base
-- MySQL migration - v1
-- =============================================================================

-- ---------- Helper: create database if not exists ----------
CREATE DATABASE IF NOT EXISTS clinica_estetica;
USE clinica_estetica;

-- ---------- Tables ----------

CREATE TABLE IF NOT EXISTS sucursal (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  direccion VARCHAR(200),
  telefono VARCHAR(50),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sucursal_nombre ON sucursal (nombre);

CREATE TABLE IF NOT EXISTS box (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sucursal_id BIGINT NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX ix_box_sucursal ON box (sucursal_id);

CREATE TABLE IF NOT EXISTS profesional (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  tipo_profesional VARCHAR(80) NOT NULL,
  bio TEXT,
  foto_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ficha (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL,
  nombres VARCHAR(120) NOT NULL,
  apellidos VARCHAR(120) NOT NULL,
  rut VARCHAR(20),
  telefono VARCHAR(50),
  email VARCHAR(120),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ficha_codigo ON ficha (codigo);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ficha_email ON ficha (email);

CREATE TABLE IF NOT EXISTS tipo_ficha_especifica (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tipo_ficha_especifica_nombre ON tipo_ficha_especifica (nombre);

CREATE TABLE IF NOT EXISTS ficha_especifica (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ficha_id BIGINT NOT NULL,
  tipo_id BIGINT NOT NULL,
  datos JSON NOT NULL DEFAULT (JSON_OBJECT()),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_ficha_especifica_ficha ON ficha_especifica (ficha_id);
CREATE INDEX ix_ficha_especifica_tipo ON ficha_especifica (tipo_id);

CREATE TABLE IF NOT EXISTS tratamiento (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  requiere_ficha_especifica BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tratamiento_nombre ON tratamiento (nombre);

CREATE TABLE IF NOT EXISTS pack (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tratamiento_id BIGINT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  duracion_sesion_min INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pack_tratamiento_nombre ON pack (tratamiento_id, nombre);

CREATE TABLE IF NOT EXISTS evaluacion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ficha_id BIGINT NOT NULL,
  tratamiento_id BIGINT NOT NULL,
  pack_id BIGINT,
  profesional_id BIGINT NOT NULL,
  precio_sugerido DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sesiones_sugeridas INT NOT NULL DEFAULT 1,
  observaciones TEXT,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_eval_ficha ON evaluacion (ficha_id);
CREATE INDEX ix_eval_tratamiento ON evaluacion (tratamiento_id);
CREATE INDEX ix_eval_pack ON evaluacion (pack_id);

CREATE TABLE IF NOT EXISTS oferta (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  tipo VARCHAR(40) NOT NULL, -- 'pack_temporal'|'descuento_manual'|'combo_packs'
  porc_descuento DECIMAL(5,2),
  fecha_inicio DATE,
  fecha_fin DATE,
  combinable BOOLEAN NOT NULL DEFAULT TRUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  prioridad INT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_oferta_nombre ON oferta (nombre);

CREATE TABLE IF NOT EXISTS oferta_pack (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  oferta_id BIGINT NOT NULL,
  pack_id BIGINT NOT NULL,
  porc_descuento DECIMAL(5,2) NOT NULL DEFAULT 0.00
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_oferta_pack ON oferta_pack (oferta_id, pack_id);

CREATE TABLE IF NOT EXISTS oferta_combo (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  oferta_id BIGINT NOT NULL,
  min_packs INT NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS oferta_combo_pack (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  oferta_combo_id BIGINT NOT NULL,
  pack_id BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_oferta_combo_pack ON oferta_combo_pack (oferta_combo_id, pack_id);

CREATE TABLE IF NOT EXISTS venta (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ficha_id BIGINT NOT NULL,
  evaluacion_id BIGINT,
  tratamiento_id BIGINT NOT NULL,
  pack_id BIGINT,
  cantidad_sesiones INT NOT NULL DEFAULT 1,
  precio_lista DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  descuento_manual_pct DECIMAL(5,2),
  descuento_aplicado_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_pagado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente', -- pendiente|pagado|anulado
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_venta_ficha ON venta (ficha_id);
CREATE INDEX ix_venta_tratamiento ON venta (tratamiento_id);
CREATE INDEX ix_venta_pack ON venta (pack_id);

CREATE TABLE IF NOT EXISTS venta_oferta (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  venta_id BIGINT NOT NULL,
  oferta_id BIGINT NOT NULL,
  secuencia INT NOT NULL DEFAULT 0,
  porc_descuento DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  monto_descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_venta_oferta_seq ON venta_oferta (venta_id, secuencia);

CREATE TABLE IF NOT EXISTS sesion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  venta_id BIGINT NOT NULL,
  numero_sesion INT NOT NULL, -- x de y
  sucursal_id BIGINT NOT NULL,
  box_id BIGINT NOT NULL,
  profesional_id BIGINT NOT NULL,
  fecha_planificada TIMESTAMP NOT NULL,
  fecha_ejecucion TIMESTAMP NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'planificada', -- planificada|confirmada|realizada|no_show|cancelada
  paciente_confirmado BOOLEAN NOT NULL DEFAULT FALSE,
  abierta_en TIMESTAMP NULL,
  cerrada_en TIMESTAMP NULL,
  observaciones TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sesion_venta_num ON sesion (venta_id, numero_sesion);
CREATE INDEX ix_sesion_profesional ON sesion (profesional_id);
CREATE INDEX ix_sesion_box ON sesion (box_id);
CREATE INDEX ix_sesion_sucursal ON sesion (sucursal_id);
CREATE INDEX ix_sesion_estado ON sesion (estado);

-- ---------- Foreign keys (added idempotently) ----------

-- Helper function to add FK if missing
DELIMITER $$

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

DELIMITER ;

-- Add foreign keys
CALL AddForeignKeyIfNotExists('box', 'fk_box_sucursal', 'sucursal_id', 'sucursal', 'id');

CALL AddForeignKeyIfNotExists('ficha_especifica', 'fk_ficha_especifica_ficha', 'ficha_id', 'ficha', 'id');
CALL AddForeignKeyIfNotExists('ficha_especifica', 'fk_ficha_especifica_tipo', 'tipo_id', 'tipo_ficha_especifica', 'id');

CALL AddForeignKeyIfNotExists('pack', 'fk_pack_tratamiento', 'tratamiento_id', 'tratamiento', 'id');

CALL AddForeignKeyIfNotExists('evaluacion', 'fk_eval_ficha', 'ficha_id', 'ficha', 'id');
CALL AddForeignKeyIfNotExists('evaluacion', 'fk_eval_tratamiento', 'tratamiento_id', 'tratamiento', 'id');
CALL AddForeignKeyIfNotExists('evaluacion', 'fk_eval_pack', 'pack_id', 'pack', 'id');
CALL AddForeignKeyIfNotExists('evaluacion', 'fk_eval_profesional', 'profesional_id', 'profesional', 'id');

CALL AddForeignKeyIfNotExists('oferta_pack', 'fk_oferta_pack_oferta', 'oferta_id', 'oferta', 'id');
CALL AddForeignKeyIfNotExists('oferta_pack', 'fk_oferta_pack_pack', 'pack_id', 'pack', 'id');

CALL AddForeignKeyIfNotExists('oferta_combo', 'fk_oferta_combo_oferta', 'oferta_id', 'oferta', 'id');

CALL AddForeignKeyIfNotExists('oferta_combo_pack', 'fk_oferta_combo_pack_combo', 'oferta_combo_id', 'oferta_combo', 'id');
CALL AddForeignKeyIfNotExists('oferta_combo_pack', 'fk_oferta_combo_pack_pack', 'pack_id', 'pack', 'id');

CALL AddForeignKeyIfNotExists('venta', 'fk_venta_ficha', 'ficha_id', 'ficha', 'id');
CALL AddForeignKeyIfNotExists('venta', 'fk_venta_eval', 'evaluacion_id', 'evaluacion', 'id');
CALL AddForeignKeyIfNotExists('venta', 'fk_venta_tratamiento', 'tratamiento_id', 'tratamiento', 'id');
CALL AddForeignKeyIfNotExists('venta', 'fk_venta_pack', 'pack_id', 'pack', 'id');

CALL AddForeignKeyIfNotExists('venta_oferta', 'fk_venta_oferta_venta', 'venta_id', 'venta', 'id');
CALL AddForeignKeyIfNotExists('venta_oferta', 'fk_venta_oferta_oferta', 'oferta_id', 'oferta', 'id');

CALL AddForeignKeyIfNotExists('sesion', 'fk_sesion_venta', 'venta_id', 'venta', 'id');
CALL AddForeignKeyIfNotExists('sesion', 'fk_sesion_sucursal', 'sucursal_id', 'sucursal', 'id');
CALL AddForeignKeyIfNotExists('sesion', 'fk_sesion_box', 'box_id', 'box', 'id');
CALL AddForeignKeyIfNotExists('sesion', 'fk_sesion_profesional', 'profesional_id', 'profesional', 'id');

-- Clean up procedure
DROP PROCEDURE IF EXISTS AddForeignKeyIfNotExists;

-- ---------- Business rules & checks ----------

ALTER TABLE sesion
  ADD CONSTRAINT ck_sesion_numero_pos CHECK (numero_sesion >= 1);

ALTER TABLE venta
  ADD CONSTRAINT ck_venta_cantidad_pos CHECK (cantidad_sesiones >= 1);

ALTER TABLE venta
  ADD CONSTRAINT ck_venta_estado CHECK (estado IN ('pendiente','pagado','anulado'));

ALTER TABLE sesion
  ADD CONSTRAINT ck_sesion_estado CHECK (estado IN ('planificada','confirmada','realizada','no_show','cancelada'));

-- Validar que precio_sugerido no sea negativo
ALTER TABLE evaluacion
  ADD CONSTRAINT ck_eval_precio_pos CHECK (precio_sugerido >= 0);

-- Validar que sesiones_sugeridas sea positivo
ALTER TABLE evaluacion
  ADD CONSTRAINT ck_eval_sesiones_pos CHECK (sesiones_sugeridas >= 1);

-- Validar que precio_lista no sea negativo
ALTER TABLE venta
  ADD CONSTRAINT ck_venta_precio_pos CHECK (precio_lista >= 0);

-- Validar que descuento_manual_pct esté en rango válido
ALTER TABLE venta
  ADD CONSTRAINT ck_venta_descuento_rango CHECK (descuento_manual_pct IS NULL OR (descuento_manual_pct >= 0 AND descuento_manual_pct <= 100));

-- Validar que total_pagado no sea negativo
ALTER TABLE venta
  ADD CONSTRAINT ck_venta_total_pos CHECK (total_pagado >= 0);

-- Validar que porc_descuento en oferta esté en rango válido
ALTER TABLE oferta
  ADD CONSTRAINT ck_oferta_descuento_rango CHECK (porc_descuento IS NULL OR (porc_descuento >= 0 AND porc_descuento <= 100));

-- Validar que porc_descuento en oferta_pack esté en rango válido
ALTER TABLE oferta_pack
  ADD CONSTRAINT ck_oferta_pack_descuento_rango CHECK (porc_descuento >= 0 AND porc_descuento <= 100);

-- Validar que monto_descuento en venta_oferta no sea negativo
ALTER TABLE venta_oferta
  ADD CONSTRAINT ck_venta_oferta_monto_pos CHECK (monto_descuento >= 0);

-- Validar que porc_descuento en venta_oferta esté en rango válido
ALTER TABLE venta_oferta
  ADD CONSTRAINT ck_venta_oferta_descuento_rango CHECK (porc_descuento >= 0 AND porc_descuento <= 100);

-- Validar que min_packs en oferta_combo sea al menos 2
ALTER TABLE oferta_combo
  ADD CONSTRAINT ck_oferta_combo_min_packs CHECK (min_packs >= 2);

-- Validar que duracion_sesion_min no sea negativo
ALTER TABLE pack
  ADD CONSTRAINT ck_pack_duracion_pos CHECK (duracion_sesion_min >= 0);

-- Validar que prioridad en oferta no sea negativo
ALTER TABLE oferta
  ADD CONSTRAINT ck_oferta_prioridad_pos CHECK (prioridad >= 0);

-- ---------- Triggers ----------

-- If tratamiento requires specific form, venta must reference a matching evaluacion with a ficha_especifica on same ficha.
-- Enforced via trigger for strong consistency.

DELIMITER $$

CREATE TRIGGER trg_venta_requiere_ficha_especifica
BEFORE INSERT ON venta
FOR EACH ROW
BEGIN
  DECLARE req BOOLEAN;
  DECLARE eval_ficha BIGINT;
  
  SELECT requiere_ficha_especifica INTO req FROM tratamiento WHERE id = NEW.tratamiento_id;
  
  IF req THEN
    IF NEW.evaluacion_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tratamiento requiere evaluación y ficha específica';
    END IF;

    SELECT ficha_id INTO eval_ficha FROM evaluacion WHERE id = NEW.evaluacion_id;
    IF eval_ficha IS NULL OR eval_ficha != NEW.ficha_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Evaluación debe pertenecer a la misma ficha';
    END IF;

    -- Ensure ficha_especifica exists for that ficha (at least one)
    IF NOT EXISTS (SELECT 1 FROM ficha_especifica WHERE ficha_id = NEW.ficha_id) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ficha específica requerida no existe para la ficha';
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

-- Vista para ofertas combo
CREATE OR REPLACE VIEW v_ofertas_combo AS
SELECT 
  o.id AS oferta_id,
  o.nombre AS oferta_nombre,
  o.tipo,
  oc.min_packs,
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

-- Vista para sesiones con información completa
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

-- Vista para ventas con información completa
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
-- STORED PROCEDURES - TODA LA LÓGICA DE NEGOCIO
-- =============================================================================

-- ---------- FICHAS ----------

-- FIC-001: Crear ficha con código único
DELIMITER $$
CREATE PROCEDURE sp_crear_ficha(
    IN p_codigo VARCHAR(40),
    IN p_nombres VARCHAR(120),
    IN p_apellidos VARCHAR(120),
    IN p_rut VARCHAR(20),
    IN p_telefono VARCHAR(50),
    IN p_email VARCHAR(120),
    OUT p_ficha_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO ficha (codigo, nombres, apellidos, rut, telefono, email)
    VALUES (p_codigo, p_nombres, p_apellidos, p_rut, p_telefono, p_email);
    
    SET p_ficha_id = LAST_INSERT_ID();
    
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

-- FIC-003: Agregar ficha específica
DELIMITER $$
CREATE PROCEDURE sp_agregar_ficha_especifica(
    IN p_ficha_id BIGINT,
    IN p_tipo_id BIGINT,
    IN p_datos JSON,
    OUT p_ficha_especifica_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO ficha_especifica (ficha_id, tipo_id, datos)
    VALUES (p_ficha_id, p_tipo_id, p_datos);
    
    SET p_ficha_especifica_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- ---------- EVALUACIONES ----------

-- EVA-001: Crear evaluación
DELIMITER $$
CREATE PROCEDURE sp_crear_evaluacion(
    IN p_ficha_id BIGINT,
    IN p_tratamiento_id BIGINT,
    IN p_pack_id BIGINT,
    IN p_profesional_id BIGINT,
    IN p_precio_sugerido DECIMAL(12,2),
    IN p_sesiones_sugeridas INT,
    IN p_observaciones TEXT,
    OUT p_evaluacion_id BIGINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO evaluacion (ficha_id, tratamiento_id, pack_id, profesional_id, precio_sugerido, sesiones_sugeridas, observaciones)
    VALUES (p_ficha_id, p_tratamiento_id, p_pack_id, p_profesional_id, p_precio_sugerido, p_sesiones_sugeridas, p_observaciones);
    
    SET p_evaluacion_id = LAST_INSERT_ID();
    
    COMMIT;
END$$
DELIMITER ;

-- ---------- VENTAS ----------

-- VEN-001: Crear venta desde evaluación
DELIMITER $$
CREATE PROCEDURE sp_crear_venta(
    IN p_ficha_id BIGINT,
    IN p_evaluacion_id BIGINT,
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
    
    INSERT INTO venta (ficha_id, evaluacion_id, tratamiento_id, pack_id, cantidad_sesiones, precio_lista, descuento_manual_pct)
    VALUES (p_ficha_id, p_evaluacion_id, p_tratamiento_id, p_pack_id, p_cantidad_sesiones, p_precio_lista, p_descuento_manual_pct);
    
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

-- VEN-003: Aplicar ofertas automáticamente
DELIMITER $$
CREATE PROCEDURE sp_aplicar_ofertas(
    IN p_venta_id BIGINT
)
BEGIN
    DECLARE v_precio_lista DECIMAL(12,2);
    DECLARE v_pack_id BIGINT;
    DECLARE v_secuencia INT DEFAULT 0;
    DECLARE v_oferta_id BIGINT;
    DECLARE v_porc_descuento DECIMAL(5,2);
    DECLARE v_monto_descuento DECIMAL(12,2);
    DECLARE v_precio_actual DECIMAL(12,2);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Obtener datos de la venta
    SELECT precio_lista, pack_id INTO v_precio_lista, v_pack_id
    FROM venta WHERE id = p_venta_id;
    
    SET v_precio_actual = v_precio_lista;
    
    -- Aplicar ofertas por pack en orden de prioridad
    FOR v_oferta IN (
        SELECT o.id, op.porc_descuento
        FROM oferta o
        JOIN oferta_pack op ON o.id = op.oferta_id
        WHERE op.pack_id = v_pack_id
          AND o.activo = TRUE
          AND o.combinable = TRUE
          AND (o.fecha_inicio IS NULL OR o.fecha_inicio <= CURDATE())
          AND (o.fecha_fin IS NULL OR o.fecha_fin >= CURDATE())
        ORDER BY o.prioridad ASC
    ) DO
        SET v_secuencia = v_secuencia + 1;
        SET v_monto_descuento = (v_precio_actual * v_oferta.porc_descuento) / 100;
        
        INSERT INTO venta_oferta (venta_id, oferta_id, secuencia, porc_descuento, monto_descuento)
        VALUES (p_venta_id, v_oferta.id, v_secuencia, v_oferta.porc_descuento, v_monto_descuento);
        
        SET v_precio_actual = v_precio_actual - v_monto_descuento;
    END FOR;
    
    COMMIT;
END$$
DELIMITER ;

-- ---------- AGENDA ----------

-- AGE-001: Agendar sesión
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
        -- Verificar si la sesión ya existe
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

-- AGE-004: Abrir sesión
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

-- AGE-005: Cerrar sesión
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

-- AGE-006: Reprogramar sesión
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

-- OFE-002: Crear oferta combo
DELIMITER $$
CREATE PROCEDURE sp_crear_oferta_combo(
    IN p_nombre VARCHAR(150),
    IN p_porc_descuento DECIMAL(5,2),
    IN p_min_packs INT,
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
    
    INSERT INTO oferta_combo (oferta_id, min_packs)
    VALUES (p_oferta_id, p_min_packs);
    
    COMMIT;
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

-- REP-002: Reporte plan vs ejecución
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
    
    -- Obtener pack de la venta
    SELECT pack_id INTO v_pack_id FROM venta WHERE id = p_venta_id;
    
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

-- Obtener venta completa con toda la información
DELIMITER $$
CREATE PROCEDURE sp_venta_completa(
    IN p_venta_id BIGINT
)
BEGIN
    SELECT * FROM v_ventas_completas
    WHERE id = p_venta_id;
END$$
DELIMITER ;

-- =============================================================================
-- NOTA IMPORTANTE: TODA LA LÓGICA DE NEGOCIO ESTÁ EN LA BASE DE DATOS
-- =============================================================================
-- 
-- Esta migración implementa todas las reglas de negocio definidas en los documentos:
-- - BusinessRules.csv: BR-001 a BR-006 implementadas con triggers y constraints
-- - UserStories.csv: Todas las validaciones y cálculos automáticos
-- - AcceptanceCriteria.csv: Validaciones automáticas en triggers
-- - Flows.csv: Flujos implementados con triggers y vistas
-- 
-- La API debe ser un simple passthrough a la base de datos.
-- NO implementar lógica de negocio en la API.
-- 
-- Reglas implementadas:
-- ✓ BR-001: Trigger trg_venta_requiere_ficha_especifica
-- ✓ BR-002: Trigger trg_sesion_numero_en_rango + constraint
-- ✓ BR-003: Triggers de cálculo automático de descuentos
-- ✓ BR-004: Campo pack.duracion_sesion_min
-- ✓ BR-005: FK obligatorias en sesion
-- ✓ BR-006: Arquitectura server-based (sin modo offline)
-- 
-- Vistas disponibles para consultas complejas:
-- ✓ v_venta_progreso: Progreso de sesiones por venta
-- ✓ v_plan_vs_ejecucion: Comparación plan vs ejecución
-- ✓ v_ofertas_aplicables: Ofertas activas y en fecha
-- ✓ v_ofertas_pack: Ofertas por pack con descuentos
-- ✓ v_ofertas_combo: Ofertas combo
-- ✓ v_sesiones_completas: Sesiones con toda la información
-- ✓ v_ventas_completas: Ventas con toda la información
-- ✓ v_reporte_ofertas: Reporte de ofertas aplicadas
-- ✓ v_disponibilidad_profesionales: Disponibilidad para agenda
-- =============================================================================
