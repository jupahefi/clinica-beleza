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
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, completada, cancelada
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
    observaciones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
);

-- Tabla de sesiones
CREATE TABLE IF NOT EXISTS sesiones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    paciente_id INTEGER NOT NULL,
    fecha_agendada DATETIME NOT NULL,
    fecha_inicio DATETIME,
    fecha_fin DATETIME,
    box_id INTEGER DEFAULT 1,
    estado VARCHAR(20) DEFAULT 'agendada', -- agendada, confirmada, en_curso, completada, cancelada
    observaciones TEXT,
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
    activa BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de boxes/salas
CREATE TABLE IF NOT EXISTS boxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    disponible BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuraciones del sistema
CREATE TABLE IF NOT EXISTS configuraciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    descripcion TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_pacientes_rut ON pacientes(rut);
CREATE INDEX IF NOT EXISTS idx_pacientes_nombre ON pacientes(nombre);
CREATE INDEX IF NOT EXISTS idx_ventas_paciente ON ventas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos(venta_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_venta ON sesiones(venta_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_paciente ON sesiones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON sesiones(fecha_agendada);
CREATE INDEX IF NOT EXISTS idx_sesiones_estado ON sesiones(estado);
CREATE INDEX IF NOT EXISTS idx_ofertas_tratamiento ON ofertas(tratamiento);
CREATE INDEX IF NOT EXISTS idx_ofertas_fechas ON ofertas(fecha_inicio, fecha_fin);

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

-- Insertar datos iniciales
INSERT OR IGNORE INTO boxes (id, nombre, descripcion) VALUES 
(1, 'Box 1', 'Sala principal de tratamientos'),
(2, 'Box 2', 'Sala secundaria de tratamientos'),
(3, 'Box 3', 'Sala de tratamientos faciales');

INSERT OR IGNORE INTO configuraciones (clave, valor, descripcion) VALUES 
('horario_inicio', '09:00', 'Hora de inicio de atención'),
('horario_fin', '18:00', 'Hora de fin de atención'),
('duracion_sesion_default', '60', 'Duración por defecto de sesiones en minutos'),
('capacidad_boxes', '3', 'Número total de boxes disponibles'),
('version_db', '1.0', 'Versión del esquema de base de datos');

