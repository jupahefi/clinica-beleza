-- =============================================================================
-- Clínica Estética - Esquema base
-- PostgreSQL idempotent migration (create-if-missing) - v1
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Helper: create schema ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public') THEN
    EXECUTE 'CREATE SCHEMA public';
  END IF;
END$$;

-- ---------- Enums (use VARCHAR in tables for flexibility) ----------
-- (Kept as VARCHAR to ease future changes)

-- ---------- Tables ----------

CREATE TABLE IF NOT EXISTS sucursal (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  direccion VARCHAR(200),
  telefono VARCHAR(50),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sucursal_nombre ON sucursal (lower(nombre));

CREATE TABLE IF NOT EXISTS box (
  id BIGSERIAL PRIMARY KEY,
  sucursal_id BIGINT NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_box_sucursal ON box (sucursal_id);

CREATE TABLE IF NOT EXISTS profesional (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  tipo_profesional VARCHAR(80) NOT NULL,
  bio TEXT,
  foto_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ficha (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL,
  nombres VARCHAR(120) NOT NULL,
  apellidos VARCHAR(120) NOT NULL,
  rut VARCHAR(20),
  telefono VARCHAR(50),
  email VARCHAR(120),
  fecha_creacion timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ficha_codigo ON ficha (lower(codigo));
CREATE UNIQUE INDEX IF NOT EXISTS ux_ficha_email ON ficha (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS tipo_ficha_especifica (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tipo_ficha_especifica_nombre ON tipo_ficha_especifica (lower(nombre));

CREATE TABLE IF NOT EXISTS ficha_especifica (
  id BIGSERIAL PRIMARY KEY,
  ficha_id BIGINT NOT NULL,
  tipo_id BIGINT NOT NULL,
  datos JSONB NOT NULL DEFAULT '{}'::jsonb,
  fecha_creacion timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ficha_especifica_ficha ON ficha_especifica (ficha_id);
CREATE INDEX IF NOT EXISTS ix_ficha_especifica_tipo ON ficha_especifica (tipo_id);

CREATE TABLE IF NOT EXISTS tratamiento (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  requiere_ficha_especifica BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tratamiento_nombre ON tratamiento (lower(nombre));

CREATE TABLE IF NOT EXISTS pack (
  id BIGSERIAL PRIMARY KEY,
  tratamiento_id BIGINT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  duracion_sesion_min INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pack_tratamiento_nombre ON pack (tratamiento_id, lower(nombre));

CREATE TABLE IF NOT EXISTS evaluacion (
  id BIGSERIAL PRIMARY KEY,
  ficha_id BIGINT NOT NULL,
  tratamiento_id BIGINT NOT NULL,
  pack_id BIGINT,
  profesional_id BIGINT NOT NULL,
  precio_sugerido NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  sesiones_sugeridas INTEGER NOT NULL DEFAULT 1,
  observaciones TEXT,
  fecha timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_eval_ficha ON evaluacion (ficha_id);
CREATE INDEX IF NOT EXISTS ix_eval_tratamiento ON evaluacion (tratamiento_id);
CREATE INDEX IF NOT EXISTS ix_eval_pack ON evaluacion (pack_id);

CREATE TABLE IF NOT EXISTS oferta (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  tipo VARCHAR(40) NOT NULL, -- 'pack_temporal'|'descuento_manual'|'combo_packs'
  porc_descuento NUMERIC(5,2),
  fecha_inicio DATE,
  fecha_fin DATE,
  combinable BOOLEAN NOT NULL DEFAULT TRUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  prioridad INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_oferta_nombre ON oferta (lower(nombre));

CREATE TABLE IF NOT EXISTS oferta_pack (
  id BIGSERIAL PRIMARY KEY,
  oferta_id BIGINT NOT NULL,
  pack_id BIGINT NOT NULL,
  porc_descuento NUMERIC(5,2) NOT NULL DEFAULT 0.00
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_oferta_pack ON oferta_pack (oferta_id, pack_id);

CREATE TABLE IF NOT EXISTS oferta_combo (
  id BIGSERIAL PRIMARY KEY,
  oferta_id BIGINT NOT NULL,
  min_packs INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS oferta_combo_pack (
  id BIGSERIAL PRIMARY KEY,
  oferta_combo_id BIGINT NOT NULL,
  pack_id BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_oferta_combo_pack ON oferta_combo_pack (oferta_combo_id, pack_id);

CREATE TABLE IF NOT EXISTS venta (
  id BIGSERIAL PRIMARY KEY,
  ficha_id BIGINT NOT NULL,
  evaluacion_id BIGINT,
  tratamiento_id BIGINT NOT NULL,
  pack_id BIGINT,
  cantidad_sesiones INTEGER NOT NULL DEFAULT 1,
  precio_lista NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  descuento_manual_pct NUMERIC(5,2),
  descuento_aplicado_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_pagado NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente', -- pendiente|pagado|anulado
  fecha_creacion timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_venta_ficha ON venta (ficha_id);
CREATE INDEX IF NOT EXISTS ix_venta_tratamiento ON venta (tratamiento_id);
CREATE INDEX IF NOT EXISTS ix_venta_pack ON venta (pack_id);

CREATE TABLE IF NOT EXISTS venta_oferta (
  id BIGSERIAL PRIMARY KEY,
  venta_id BIGINT NOT NULL,
  oferta_id BIGINT NOT NULL,
  secuencia INTEGER NOT NULL DEFAULT 0,
  porc_descuento NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  monto_descuento NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_venta_oferta_seq ON venta_oferta (venta_id, secuencia);

CREATE TABLE IF NOT EXISTS sesion (
  id BIGSERIAL PRIMARY KEY,
  venta_id BIGINT NOT NULL,
  numero_sesion INTEGER NOT NULL, -- x de y
  sucursal_id BIGINT NOT NULL,
  box_id BIGINT NOT NULL,
  profesional_id BIGINT NOT NULL,
  fecha_planificada timestamptz NOT NULL,
  fecha_ejecucion timestamptz,
  estado VARCHAR(30) NOT NULL DEFAULT 'planificada', -- planificada|confirmada|realizada|no_show|cancelada
  paciente_confirmado BOOLEAN NOT NULL DEFAULT FALSE,
  abierta_en timestamptz,
  cerrada_en timestamptz,
  observaciones TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sesion_venta_num ON sesion (venta_id, numero_sesion);
CREATE INDEX IF NOT EXISTS ix_sesion_profesional ON sesion (profesional_id);
CREATE INDEX IF NOT EXISTS ix_sesion_box ON sesion (box_id);
CREATE INDEX IF NOT EXISTS ix_sesion_sucursal ON sesion (sucursal_id);
CREATE INDEX IF NOT EXISTS ix_sesion_estado ON sesion (estado);

-- ---------- Foreign keys (added idempotently) ----------

-- Helper function to add FK if missing
DO $$
DECLARE
  r RECORD;
BEGIN
  -- sucursal/box
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_box_sucursal') THEN
    ALTER TABLE box
      ADD CONSTRAINT fk_box_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
  END IF;

  -- ficha_especifica
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ficha_especifica_ficha') THEN
    ALTER TABLE ficha_especifica
      ADD CONSTRAINT fk_ficha_especifica_ficha FOREIGN KEY (ficha_id) REFERENCES ficha(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ficha_especifica_tipo') THEN
    ALTER TABLE ficha_especifica
      ADD CONSTRAINT fk_ficha_especifica_tipo FOREIGN KEY (tipo_id) REFERENCES tipo_ficha_especifica(id);
  END IF;

  -- pack
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pack_tratamiento') THEN
    ALTER TABLE pack
      ADD CONSTRAINT fk_pack_tratamiento FOREIGN KEY (tratamiento_id) REFERENCES tratamiento(id);
  END IF;

  -- evaluacion
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eval_ficha') THEN
    ALTER TABLE evaluacion
      ADD CONSTRAINT fk_eval_ficha FOREIGN KEY (ficha_id) REFERENCES ficha(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eval_tratamiento') THEN
    ALTER TABLE evaluacion
      ADD CONSTRAINT fk_eval_tratamiento FOREIGN KEY (tratamiento_id) REFERENCES tratamiento(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eval_pack') THEN
    ALTER TABLE evaluacion
      ADD CONSTRAINT fk_eval_pack FOREIGN KEY (pack_id) REFERENCES pack(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_eval_profesional') THEN
    ALTER TABLE evaluacion
      ADD CONSTRAINT fk_eval_profesional FOREIGN KEY (profesional_id) REFERENCES profesional(id);
  END IF;

  -- oferta_pack
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_oferta_pack_oferta') THEN
    ALTER TABLE oferta_pack
      ADD CONSTRAINT fk_oferta_pack_oferta FOREIGN KEY (oferta_id) REFERENCES oferta(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_oferta_pack_pack') THEN
    ALTER TABLE oferta_pack
      ADD CONSTRAINT fk_oferta_pack_pack FOREIGN KEY (pack_id) REFERENCES pack(id);
  END IF;

  -- oferta_combo
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_oferta_combo_oferta') THEN
    ALTER TABLE oferta_combo
      ADD CONSTRAINT fk_oferta_combo_oferta FOREIGN KEY (oferta_id) REFERENCES oferta(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_oferta_combo_pack_combo') THEN
    ALTER TABLE oferta_combo_pack
      ADD CONSTRAINT fk_oferta_combo_pack_combo FOREIGN KEY (oferta_combo_id) REFERENCES oferta_combo(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_oferta_combo_pack_pack') THEN
    ALTER TABLE oferta_combo_pack
      ADD CONSTRAINT fk_oferta_combo_pack_pack FOREIGN KEY (pack_id) REFERENCES pack(id);
  END IF;

  -- venta
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_venta_ficha') THEN
    ALTER TABLE venta
      ADD CONSTRAINT fk_venta_ficha FOREIGN KEY (ficha_id) REFERENCES ficha(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_venta_eval') THEN
    ALTER TABLE venta
      ADD CONSTRAINT fk_venta_eval FOREIGN KEY (evaluacion_id) REFERENCES evaluacion(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_venta_tratamiento') THEN
    ALTER TABLE venta
      ADD CONSTRAINT fk_venta_tratamiento FOREIGN KEY (tratamiento_id) REFERENCES tratamiento(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_venta_pack') THEN
    ALTER TABLE venta
      ADD CONSTRAINT fk_venta_pack FOREIGN KEY (pack_id) REFERENCES pack(id);
  END IF;

  -- venta_oferta
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_venta_oferta_venta') THEN
    ALTER TABLE venta_oferta
      ADD CONSTRAINT fk_venta_oferta_venta FOREIGN KEY (venta_id) REFERENCES venta(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_venta_oferta_oferta') THEN
    ALTER TABLE venta_oferta
      ADD CONSTRAINT fk_venta_oferta_oferta FOREIGN KEY (oferta_id) REFERENCES oferta(id);
  END IF;

  -- sesion
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sesion_venta') THEN
    ALTER TABLE sesion
      ADD CONSTRAINT fk_sesion_venta FOREIGN KEY (venta_id) REFERENCES venta(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sesion_sucursal') THEN
    ALTER TABLE sesion
      ADD CONSTRAINT fk_sesion_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sesion_box') THEN
    ALTER TABLE sesion
      ADD CONSTRAINT fk_sesion_box FOREIGN KEY (box_id) REFERENCES box(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sesion_profesional') THEN
    ALTER TABLE sesion
      ADD CONSTRAINT fk_sesion_profesional FOREIGN KEY (profesional_id) REFERENCES profesional(id);
  END IF;
END$$;

-- ---------- Business rules & checks ----------

-- numero_sesion must be positive
ALTER TABLE sesion
  ADD CONSTRAINT IF NOT EXISTS ck_sesion_numero_pos CHECK (numero_sesion >= 1);

-- cantidad_sesiones must be positive
ALTER TABLE venta
  ADD CONSTRAINT IF NOT EXISTS ck_venta_cantidad_pos CHECK (cantidad_sesiones >= 1);

-- estado enums (kept as CHECKs to avoid rigid ENUMs)
ALTER TABLE venta
  ADD CONSTRAINT IF NOT EXISTS ck_venta_estado CHECK (estado IN ('pendiente','pagado','anulado'));

ALTER TABLE sesion
  ADD CONSTRAINT IF NOT EXISTS ck_sesion_estado CHECK (estado IN ('planificada','confirmada','realizada','no_show','cancelada'));

-- If tratamiento requires specific form, venta must reference a matching evaluacion with a ficha_especifica on same ficha.
-- Enforced via trigger for strong consistency.

CREATE OR REPLACE FUNCTION trg_venta_requiere_ficha_especifica() RETURNS trigger AS $$
DECLARE
  req BOOLEAN;
  eval_ficha BIGINT;
BEGIN
  SELECT requiere_ficha_especifica INTO req FROM tratamiento WHERE id = NEW.tratamiento_id;
  IF req THEN
    IF NEW.evaluacion_id IS NULL THEN
      RAISE EXCEPTION 'Tratamiento requiere evaluación y ficha específica';
    END IF;

    SELECT e.ficha_id INTO eval_ficha FROM evaluacion e WHERE e.id = NEW.evaluacion_id;
    IF eval_ficha IS NULL OR eval_ficha <> NEW.ficha_id THEN
      RAISE EXCEPTION 'Evaluación debe pertenecer a la misma ficha';
    END IF;

    -- Ensure ficha_especifica exists for that ficha (at least one)
    IF NOT EXISTS (SELECT 1 FROM ficha_especifica fe WHERE fe.ficha_id = NEW.ficha_id) THEN
      RAISE EXCEPTION 'Ficha específica requerida no existe para la ficha %', NEW.ficha_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS _venta_req_ficha_especifica ON venta;
CREATE TRIGGER _venta_req_ficha_especifica
  BEFORE INSERT OR UPDATE ON venta
  FOR EACH ROW EXECUTE FUNCTION trg_venta_requiere_ficha_especifica();

-- Prevent scheduling sessions beyond purchased amount
CREATE OR REPLACE FUNCTION trg_sesion_numero_en_rango() RETURNS trigger AS $$
DECLARE
  max_ses INTEGER;
BEGIN
  SELECT cantidad_sesiones INTO max_ses FROM venta WHERE id = NEW.venta_id;
  IF max_ses IS NULL THEN
    RAISE EXCEPTION 'Venta no encontrada %', NEW.venta_id;
  END IF;
  IF NEW.numero_sesion < 1 OR NEW.numero_sesion > max_ses THEN
    RAISE EXCEPTION 'numero_sesion % fuera de rango [1..%] para venta %', NEW.numero_sesion, max_ses, NEW.venta_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS _sesion_numero_en_rango ON sesion;
CREATE TRIGGER _sesion_numero_en_rango
  BEFORE INSERT OR UPDATE ON sesion
  FOR EACH ROW EXECUTE FUNCTION trg_sesion_numero_en_rango();

-- Optional: Keep sesion.estado transitions coherent (planificada->confirmada/realizada/cancelada/no_show)
-- (Could be strengthened later with a dedicated state machine)

-- ---------- Views for convenience ----------
CREATE OR REPLACE VIEW v_venta_progreso AS
SELECT
  v.id AS venta_id,
  v.ficha_id,
  v.cantidad_sesiones AS total_sesiones,
  COALESCE(SUM(CASE WHEN s.estado = 'realizada' THEN 1 ELSE 0 END),0) AS realizadas,
  v.cantidad_sesiones - COALESCE(SUM(CASE WHEN s.estado = 'realizada' THEN 1 ELSE 0 END),0) AS pendientes
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
  EXTRACT(EPOCH FROM (s.fecha_ejecucion - s.fecha_planificada))/60.0 AS desfase_minutos,
  s.estado
FROM sesion s;