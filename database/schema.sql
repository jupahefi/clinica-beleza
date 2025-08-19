-- Schema de Base de Datos para Clínica Beleza
-- SQLite Database Structure

-- Tabla de pacientes
CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre VARCHAR(255) NOT NULL,
    rut VARCHAR(12) UNIQUE NOT NULL,
    edad INTEGER,
    telefono VARCHAR(20),
    codigo_pais VARCHAR(5) DEFAULT '+56',
    email VARCHAR(255),
    observaciones_generales TEXT,
    estado VARCHAR(20) DEFAULT 'activo', -- activo, inactivo, eliminado
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de fichas específicas de depilación
CREATE TABLE IF NOT EXISTS fichas_depilacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL,
    zonas_tratar TEXT,
    tipo_piel VARCHAR(10),
    medicamentos TEXT,
    observaciones_medicas TEXT,
    estado VARCHAR(20) DEFAULT 'activo', -- activo, inactivo, eliminado
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

-- Tabla de fichas específicas corporal/facial
CREATE TABLE IF NOT EXISTS fichas_corporales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL,
    tratamientos_previos TEXT,
    objetivo_estetico TEXT,
    zona_tratamiento VARCHAR(50),
    expectativas TEXT,
    estado VARCHAR(20) DEFAULT 'activo', -- activo, inactivo, eliminado
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

-- Tabla de ventas
CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL,
    tratamiento VARCHAR(50) NOT NULL,
    pack_nombre VARCHAR(255),
    sesiones_total INTEGER NOT NULL,
    sesiones_usadas INTEGER DEFAULT 0,
    precio_total DECIMAL(10,2) NOT NULL,
    descuento_aplicado DECIMAL(5,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, completada, cancelada, eliminada
    observaciones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(20) NOT NULL, -- efectivo, tarjeta, transferencia, cheque
    fecha_pago DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'activo', -- activo, cancelado, eliminado
    observaciones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
);

-- Tabla de sesiones (calendario)
CREATE TABLE IF NOT EXISTS sesiones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    paciente_id INTEGER NOT NULL,
    box_id INTEGER DEFAULT 1,
    titulo VARCHAR(255) NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    duracion_minutos INTEGER DEFAULT 60,
    estado VARCHAR(20) DEFAULT 'agendada', -- agendada, confirmada, en_curso, completada, cancelada, reagendada
    color VARCHAR(7) DEFAULT '#7FB3D3', -- Color del evento en el calendario
    observaciones TEXT,
    motivo_cancelacion TEXT,
    usuario_creador VARCHAR(100),
    usuario_modificador VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

-- Tabla de ofertas
CREATE TABLE IF NOT EXISTS ofertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tratamiento VARCHAR(50) NOT NULL,
    descuento_porcentaje DECIMAL(5,2),
    precio_fijo DECIMAL(10,2),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'activa', -- activa, inactiva, eliminada
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de boxes/salas
CREATE TABLE IF NOT EXISTS boxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'disponible', -- disponible, ocupado, mantenimiento, eliminado
    color VARCHAR(7) DEFAULT '#7FB3D3', -- Color del box en el calendario
    capacidad INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de auditoría para tracking de cambios
CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tabla VARCHAR(50) NOT NULL,
    accion VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    registro_id INTEGER NOT NULL,
    datos_anteriores TEXT, -- JSON con datos anteriores
    datos_nuevos TEXT, -- JSON con datos nuevos
    usuario VARCHAR(100),
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuraciones del sistema
CREATE TABLE IF NOT EXISTS configuraciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'activo', -- activo, inactivo, eliminado
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_pacientes_rut ON pacientes(rut);
CREATE INDEX IF NOT EXISTS idx_pacientes_nombre ON pacientes(nombre);
CREATE INDEX IF NOT EXISTS idx_pacientes_estado ON pacientes(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_paciente ON ventas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos(venta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
CREATE INDEX IF NOT EXISTS idx_sesiones_venta ON sesiones(venta_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_paciente ON sesiones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha_inicio ON sesiones(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha_fin ON sesiones(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_sesiones_estado ON sesiones(estado);
CREATE INDEX IF NOT EXISTS idx_sesiones_box ON sesiones(box_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_tratamiento ON ofertas(tratamiento);
CREATE INDEX IF NOT EXISTS idx_ofertas_fechas ON ofertas(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_ofertas_estado ON ofertas(estado);
CREATE INDEX IF NOT EXISTS idx_boxes_estado ON boxes(estado);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria(tabla);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(created_at);

-- Triggers para actualizar timestamps
CREATE TRIGGER IF NOT EXISTS update_pacientes_timestamp 
    AFTER UPDATE ON pacientes
    BEGIN
        UPDATE pacientes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_fichas_depilacion_timestamp 
    AFTER UPDATE ON fichas_depilacion
    BEGIN
        UPDATE fichas_depilacion SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_fichas_corporales_timestamp 
    AFTER UPDATE ON fichas_corporales
    BEGIN
        UPDATE fichas_corporales SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_ventas_timestamp 
    AFTER UPDATE ON ventas
    BEGIN
        UPDATE ventas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_sesiones_timestamp 
    AFTER UPDATE ON sesiones
    BEGIN
        UPDATE sesiones SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_pagos_timestamp 
    AFTER UPDATE ON pagos
    BEGIN
        UPDATE pagos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_ofertas_timestamp 
    AFTER UPDATE ON ofertas
    BEGIN
        UPDATE ofertas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_boxes_timestamp 
    AFTER UPDATE ON boxes
    BEGIN
        UPDATE boxes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Triggers para auditoría
CREATE TRIGGER IF NOT EXISTS audit_pacientes_insert
    AFTER INSERT ON pacientes
    BEGIN
        INSERT INTO auditoria (tabla, accion, registro_id, datos_nuevos, usuario)
        VALUES ('pacientes', 'INSERT', NEW.id, json_object(
            'id', NEW.id,
            'nombre', NEW.nombre,
            'rut', NEW.rut,
            'estado', NEW.estado
        ), 'system');
    END;

CREATE TRIGGER IF NOT EXISTS audit_pacientes_update
    AFTER UPDATE ON pacientes
    BEGIN
        INSERT INTO auditoria (tabla, accion, registro_id, datos_anteriores, datos_nuevos, usuario)
        VALUES ('pacientes', 'UPDATE', NEW.id, json_object(
            'id', OLD.id,
            'nombre', OLD.nombre,
            'estado', OLD.estado
        ), json_object(
            'id', NEW.id,
            'nombre', NEW.nombre,
            'estado', NEW.estado
        ), 'system');
    END;

CREATE TRIGGER IF NOT EXISTS audit_sesiones_insert
    AFTER INSERT ON sesiones
    BEGIN
        INSERT INTO auditoria (tabla, accion, registro_id, datos_nuevos, usuario)
        VALUES ('sesiones', 'INSERT', NEW.id, json_object(
            'id', NEW.id,
            'paciente_id', NEW.paciente_id,
            'fecha_inicio', NEW.fecha_inicio,
            'estado', NEW.estado
        ), 'system');
    END;

CREATE TRIGGER IF NOT EXISTS audit_sesiones_update
    AFTER UPDATE ON sesiones
    BEGIN
        INSERT INTO auditoria (tabla, accion, registro_id, datos_anteriores, datos_nuevos, usuario)
        VALUES ('sesiones', 'UPDATE', NEW.id, json_object(
            'id', OLD.id,
            'fecha_inicio', OLD.fecha_inicio,
            'estado', OLD.estado
        ), json_object(
            'id', NEW.id,
            'fecha_inicio', NEW.fecha_inicio,
            'estado', NEW.estado
        ), 'system');
    END;

-- Insertar datos iniciales
INSERT OR IGNORE INTO boxes (id, nombre, descripcion, color) VALUES 
(1, 'Box 1', 'Sala principal de tratamientos', '#7FB3D3'),
(2, 'Box 2', 'Sala secundaria de tratamientos', '#A8D1E7'),
(3, 'Box 3', 'Sala de tratamientos faciales', '#5A8BA8');

INSERT OR IGNORE INTO configuraciones (clave, valor, descripcion) VALUES 
('horario_inicio', '09:00', 'Hora de inicio de atención'),
('horario_fin', '18:00', 'Hora de fin de atención'),
('duracion_sesion_default', '60', 'Duración por defecto de sesiones en minutos'),
('capacidad_boxes', '3', 'Número total de boxes disponibles'),
('version_db', '2.0', 'Versión del esquema de base de datos'),
('calendario_vista_default', 'week', 'Vista por defecto del calendario (day, week, month)'),
('calendario_slot_duration', '30', 'Duración de slots en minutos'),
('calendario_slot_min_time', '08:00', 'Hora mínima del calendario'),
('calendario_slot_max_time', '20:00', 'Hora máxima del calendario');

