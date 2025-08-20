<?php

/**
 * API REST para Clínica Beleza
 * PASSTHROUGH A STORED PROCEDURES - Sin lógica de negocio
 * Toda la lógica está en la base de datos
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'database/Database.php';

try {
    $db = Database::getInstance();
    
    // Parsear la URL para obtener el endpoint y parámetros
    $request = $_SERVER['REQUEST_URI'];
    $path = parse_url($request, PHP_URL_PATH);
    $pathSegments = explode('/', trim($path, '/'));
    
    // Encontrar el índice de api.php en los segmentos
    $apiIndex = array_search('api.php', $pathSegments);
    if ($apiIndex !== false) {
        $endpoint = $pathSegments[$apiIndex + 1] ?? '';
        $id = $pathSegments[$apiIndex + 2] ?? null;
    } else {
        $endpoint = $pathSegments[0] ?? '';
        $id = $pathSegments[1] ?? null;
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Router principal - SOLO PASSTHROUGH
    switch ($endpoint) {
        case '':
        case 'root':
            handleRoot($db);
            break;
            
        case 'config':
            handleConfig($db);
            break;
            
        case 'health':
            handleHealth($db);
            break;
            
        // ---------- FICHAS ----------
        case 'fichas':
            handleFichas($db, $method, $id, $data);
            break;
            
        case 'tipos-ficha-especifica':
            handleTiposFichaEspecifica($db, $method, $id, $data);
            break;
            
        case 'fichas-especificas':
            handleFichasEspecificas($db, $method, $id, $data);
            break;
            
        // ---------- EVALUACIONES ----------
        case 'evaluaciones':
            handleEvaluaciones($db, $method, $id, $data);
            break;
            
        // ---------- VENTAS ----------
        case 'ventas':
            handleVentas($db, $method, $id, $data);
            break;
            
        case 'pagos':
            handlePagos($db, $method, $id, $data);
            break;
            
        // ---------- AGENDA ----------
        case 'sesiones':
            handleSesiones($db, $method, $id, $data);
            break;
            
        case 'agenda':
            handleAgenda($db, $method, $id, $data);
            break;
            
        // ---------- OFERTAS ----------
        case 'ofertas':
            handleOfertas($db, $method, $id, $data);
            break;
            
        case 'ofertas-combo':
            handleOfertasCombo($db, $method, $id, $data);
            break;
            
        // ---------- CATÁLOGOS ----------
        case 'tratamientos':
            handleTratamientos($db, $method, $id, $data);
            break;
            
        case 'packs':
            handlePacks($db, $method, $id, $data);
            break;
            
        case 'sucursales':
            handleSucursales($db, $method, $id, $data);
            break;
            
        case 'boxes':
            handleBoxes($db, $method, $id, $data);
            break;
            
        case 'profesionales':
            handleProfesionales($db, $method, $id, $data);
            break;
            
        // ---------- REPORTES ----------
        case 'reportes':
            handleReportes($db, $method, $id, $data);
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Endpoint no encontrado']);
            break;
    }
    
} catch (Exception $e) {
    error_log("Error en API: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error interno del servidor: ' . $e->getMessage()]);
}

// =============================================================================
// HANDLERS - SOLO PASSTHROUGH A STORED PROCEDURES
// =============================================================================

function handleRoot($db) {
    echo json_encode([
        'success' => true,
        'message' => 'API Clínica Beleza - Passthrough a Stored Procedures',
        'version' => getenv('APP_VERSION') ?: '2.0.0',
        'architecture' => 'Server-based (sin modo offline)',
        'endpoints' => [
            'fichas', 'evaluaciones', 'ventas', 'sesiones', 'agenda',
            'ofertas', 'tratamientos', 'packs', 'sucursales', 'boxes', 'profesionales', 'reportes'
        ]
    ]);
}

function handleConfig($db) {
    // Solo variables seguras para el frontend
    echo json_encode([
        'success' => true,
        'config' => [
            'API_URL' => getenv('API_URL') ?: 'https://clinica-beleza.equalitech.xyz',
            'API_TIMEOUT' => getenv('API_TIMEOUT') ?: 10000,
            'API_RETRIES' => getenv('API_RETRIES') ?: 3,
            'APP_NAME' => getenv('APP_NAME') ?: 'Clínica Beleza',
            'APP_VERSION' => getenv('APP_VERSION') ?: '2.0.0',
            'CACHE_TTL' => getenv('CACHE_TTL') ?: 300,
            'CACHE_ENABLED' => getenv('CACHE_ENABLED') ?: true
        ]
    ]);
}

function handleHealth($db) {
    try {
        // Verificar conexión a la base de datos
        $db->selectOne("SELECT 1 as test");
        
        $health = [
            'status' => 'healthy',
            'timestamp' => date('Y-m-d H:i:s'),
            'database' => 'connected',
            'api_version' => getenv('APP_VERSION') ?: '2.0.0'
        ];
        
        echo json_encode(['success' => true, 'data' => $health]);
    } catch (Exception $e) {
        http_response_code(503);
        echo json_encode([
            'success' => false, 
            'data' => [
                'status' => 'unhealthy',
                'timestamp' => date('Y-m-d H:i:s'),
                'database' => 'disconnected',
                'error' => $e->getMessage()
            ]
        ]);
    }
}

// ---------- FICHAS ----------

function handleFichas($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                // Obtener ficha específica
                $result = $db->selectOne("SELECT * FROM ficha WHERE id = ?", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
            } else {
                // Buscar fichas
                $busqueda = $_GET['busqueda'] ?? '';
                $result = $db->executeRaw("CALL sp_buscar_fichas(?)", [$busqueda]);
                echo json_encode(['success' => true, 'data' => $result]);
            }
            break;
            
        case 'POST':
            // Crear ficha
            $result = $db->executeRaw("CALL sp_crear_ficha(?, ?, ?, ?, ?, ?, @ficha_id)", [
                $data['codigo'], $data['nombres'], $data['apellidos'],
                $data['rut'] ?? null, $data['telefono'] ?? null, $data['email'] ?? null
            ]);
            $fichaId = $db->selectOne("SELECT @ficha_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $fichaId]]);
            break;
            
        case 'PUT':
            // Actualizar ficha
            $result = $db->update("UPDATE ficha SET codigo = ?, nombres = ?, apellidos = ?, rut = ?, telefono = ?, email = ? WHERE id = ?", [
                $data['codigo'], $data['nombres'], $data['apellidos'],
                $data['rut'] ?? null, $data['telefono'] ?? null, $data['email'] ?? null, $id
            ]);
            echo json_encode(['success' => true, 'data' => ['updated' => $result]]);
            break;
            
        case 'DELETE':
            // Soft delete - cambiar estado
            $result = $db->update("UPDATE ficha SET activo = FALSE WHERE id = ?", [$id]);
            echo json_encode(['success' => true, 'data' => ['deleted' => $result]]);
            break;
    }
}

function handleFichasEspecificas($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT * FROM ficha_especifica WHERE id = ?", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
            } else {
                $fichaId = $_GET['ficha_id'] ?? null;
                if ($fichaId) {
                    $result = $db->select("SELECT fe.*, tfe.nombre as tipo_nombre FROM ficha_especifica fe JOIN tipo_ficha_especifica tfe ON fe.tipo_id = tfe.id WHERE fe.ficha_id = ?", [$fichaId]);
                } else {
                    $result = $db->select("SELECT fe.*, tfe.nombre as tipo_nombre FROM ficha_especifica fe JOIN tipo_ficha_especifica tfe ON fe.tipo_id = tfe.id");
                }
                echo json_encode(['success' => true, 'data' => $result]);
            }
            break;
            
        case 'POST':
            // Agregar ficha específica
            $result = $db->executeRaw("CALL sp_agregar_ficha_especifica(?, ?, ?, @ficha_especifica_id)", [
                $data['ficha_id'], $data['tipo_id'], json_encode($data['datos'])
            ]);
            $fichaEspecificaId = $db->selectOne("SELECT @ficha_especifica_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $fichaEspecificaId]]);
            break;
    }
}

function handleTiposFichaEspecifica($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT * FROM tipo_ficha_especifica WHERE id = ?", [$id]);
            } else {
                $result = $db->select("SELECT * FROM tipo_ficha_especifica ORDER BY nombre");
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            $result = $db->insert("INSERT INTO tipo_ficha_especifica (nombre, descripcion) VALUES (?, ?)", [
                $data['nombre'], $data['descripcion'] ?? null
            ]);
            echo json_encode(['success' => true, 'data' => ['id' => $result]]);
            break;
    }
}

// ---------- EVALUACIONES ----------

function handleEvaluaciones($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT * FROM evaluacion WHERE id = ?", [$id]);
            } else {
                $fichaId = $_GET['ficha_id'] ?? null;
                if ($fichaId) {
                    $result = $db->select("SELECT e.*, t.nombre as tratamiento_nombre, p.nombre as pack_nombre, prof.nombre as profesional_nombre FROM evaluacion e JOIN tratamiento t ON e.tratamiento_id = t.id LEFT JOIN pack p ON e.pack_id = p.id JOIN profesional prof ON e.profesional_id = prof.id WHERE e.ficha_id = ?", [$fichaId]);
                } else {
                    $result = $db->select("SELECT e.*, t.nombre as tratamiento_nombre, p.nombre as pack_nombre, prof.nombre as profesional_nombre FROM evaluacion e JOIN tratamiento t ON e.tratamiento_id = t.id LEFT JOIN pack p ON e.pack_id = p.id JOIN profesional prof ON e.profesional_id = prof.id");
                }
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            // Crear evaluación
            $result = $db->executeRaw("CALL sp_crear_evaluacion(?, ?, ?, ?, ?, ?, ?, @evaluacion_id)", [
                $data['ficha_id'], $data['tratamiento_id'], $data['pack_id'] ?? null,
                $data['profesional_id'], $data['precio_sugerido'], $data['sesiones_sugeridas'],
                $data['observaciones'] ?? null
            ]);
            $evaluacionId = $db->selectOne("SELECT @evaluacion_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $evaluacionId]]);
            break;
    }
}

// ---------- VENTAS ----------

function handleVentas($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                // Obtener venta completa
                $result = $db->executeRaw("CALL sp_venta_completa(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result[0] ?? null]);
            } else {
                $fichaId = $_GET['ficha_id'] ?? null;
                if ($fichaId) {
                    $result = $db->select("SELECT * FROM v_ventas_completas WHERE ficha_id = ?", [$fichaId]);
                } else {
                    $result = $db->select("SELECT * FROM v_ventas_completas ORDER BY fecha_creacion DESC");
                }
                echo json_encode(['success' => true, 'data' => $result]);
            }
            break;
            
        case 'POST':
            // Crear venta
            $result = $db->executeRaw("CALL sp_crear_venta(?, ?, ?, ?, ?, ?, ?, @venta_id)", [
                $data['ficha_id'], $data['evaluacion_id'] ?? null, $data['tratamiento_id'],
                $data['pack_id'] ?? null, $data['cantidad_sesiones'], $data['precio_lista'],
                $data['descuento_manual_pct'] ?? null
            ]);
            $ventaId = $db->selectOne("SELECT @venta_id as id")['id'];
            
            // Aplicar ofertas automáticamente
            $db->executeRaw("CALL sp_aplicar_ofertas(?)", [$ventaId]);
            
            echo json_encode(['success' => true, 'data' => ['id' => $ventaId]]);
            break;
            
        case 'PUT':
            if (isset($data['descuento_manual_pct'])) {
                // Aplicar descuento manual
                $db->executeRaw("CALL sp_aplicar_descuento_manual(?, ?)", [$id, $data['descuento_manual_pct']]);
            }
            echo json_encode(['success' => true, 'data' => ['updated' => true]]);
            break;
    }
}

function handlePagos($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT * FROM pago WHERE id = ?", [$id]);
            } else {
                $ventaId = $_GET['venta_id'] ?? null;
                if ($ventaId) {
                    $result = $db->select("SELECT * FROM pago WHERE venta_id = ? ORDER BY fecha_pago DESC", [$ventaId]);
                } else {
                    $result = $db->select("SELECT * FROM pago ORDER BY fecha_pago DESC");
                }
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            // Registrar pago
            $result = $db->insert("INSERT INTO pago (venta_id, monto, metodo_pago, fecha_pago, observaciones) VALUES (?, ?, ?, NOW(), ?)", [
                $data['venta_id'], $data['monto'], $data['metodo_pago'], $data['observaciones'] ?? null
            ]);
            
            // Actualizar total_pagado en venta
            $db->update("UPDATE venta SET total_pagado = total_pagado + ? WHERE id = ?", [
                $data['monto'], $data['venta_id']
            ]);
            
            echo json_encode(['success' => true, 'data' => ['id' => $result]]);
            break;
    }
}

// ---------- AGENDA ----------

function handleSesiones($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT * FROM v_sesiones_completas WHERE id = ?", [$id]);
            } else {
                $ventaId = $_GET['venta_id'] ?? null;
                if ($ventaId) {
                    $result = $db->executeRaw("CALL sp_sesiones_venta(?)", [$ventaId]);
                } else {
                    $result = $db->select("SELECT * FROM v_sesiones_completas ORDER BY fecha_planificada DESC");
                }
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            // Agendar sesión
            $result = $db->executeRaw("CALL sp_agendar_sesion(?, ?, ?, ?, ?, ?, ?, @sesion_id)", [
                $data['venta_id'], $data['numero_sesion'], $data['sucursal_id'],
                $data['box_id'], $data['profesional_id'], $data['fecha_planificada'],
                $data['observaciones'] ?? null
            ]);
            $sesionId = $db->selectOne("SELECT @sesion_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $sesionId]]);
            break;
            
        case 'PUT':
            if (isset($data['accion'])) {
                switch ($data['accion']) {
                    case 'confirmar':
                        $db->executeRaw("CALL sp_confirmar_paciente(?)", [$id]);
                        break;
                    case 'abrir':
                        $db->executeRaw("CALL sp_abrir_sesion(?)", [$id]);
                        break;
                    case 'cerrar':
                        $db->executeRaw("CALL sp_cerrar_sesion(?, ?)", [$id, $data['observaciones'] ?? null]);
                        break;
                    case 'reprogramar':
                        $db->executeRaw("CALL sp_reprogramar_sesion(?, ?)", [$id, $data['nueva_fecha']]);
                        break;
                }
            }
            echo json_encode(['success' => true, 'data' => ['updated' => true]]);
            break;
    }
}

function handleAgenda($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            // Obtener disponibilidad
            $fechaInicio = $_GET['fecha_inicio'] ?? date('Y-m-d');
            $fechaFin = $_GET['fecha_fin'] ?? date('Y-m-d', strtotime('+7 days'));
            $profesionalId = $_GET['profesional_id'] ?? null;
            $sucursalId = $_GET['sucursal_id'] ?? null;
            $boxId = $_GET['box_id'] ?? null;
            
            $result = $db->executeRaw("CALL sp_obtener_disponibilidad(?, ?, ?, ?, ?)", [
                $fechaInicio, $fechaFin, $profesionalId, $sucursalId, $boxId
            ]);
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            if (isset($data['accion']) && $data['accion'] === 'generar_plan') {
                // Generar plan completo de sesiones
                $db->executeRaw("CALL sp_generar_plan_sesiones(?, ?, ?, ?, ?, ?)", [
                    $data['venta_id'], $data['sucursal_id'], $data['box_id'],
                    $data['profesional_id'], $data['fecha_inicio'], $data['duracion_minutos']
                ]);
                echo json_encode(['success' => true, 'data' => ['plan_generado' => true]]);
            }
            break;
    }
}

// ---------- OFERTAS ----------

function handleOfertas($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT * FROM oferta WHERE id = ?", [$id]);
            } else {
                $result = $db->select("SELECT * FROM v_ofertas_aplicables ORDER BY prioridad");
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            if ($data['tipo'] === 'pack_temporal') {
                // Crear oferta pack temporal
                $result = $db->executeRaw("CALL sp_crear_oferta_pack(?, ?, ?, ?, ?, ?, @oferta_id)", [
                    $data['nombre'], $data['porc_descuento'], $data['fecha_inicio'],
                    $data['fecha_fin'], $data['combinable'], $data['prioridad']
                ]);
            } else {
                // Crear oferta combo
                $result = $db->executeRaw("CALL sp_crear_oferta_combo(?, ?, ?, ?, ?, @oferta_id)", [
                    $data['nombre'], $data['porc_descuento'], $data['min_packs'],
                    $data['combinable'], $data['prioridad']
                ]);
            }
            $ofertaId = $db->selectOne("SELECT @oferta_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $ofertaId]]);
            break;
    }
}

function handleOfertasCombo($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            $result = $db->select("SELECT * FROM v_ofertas_combo ORDER BY prioridad");
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            // Agregar pack a oferta combo
            $result = $db->insert("INSERT INTO oferta_combo_pack (oferta_combo_id, pack_id) VALUES (?, ?)", [
                $data['oferta_combo_id'], $data['pack_id']
            ]);
            echo json_encode(['success' => true, 'data' => ['id' => $result]]);
            break;
    }
}

// ---------- CATÁLOGOS ----------

function handleTratamientos($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT * FROM tratamiento WHERE id = ?", [$id]);
            } else {
                $result = $db->select("SELECT * FROM tratamiento ORDER BY nombre");
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            $result = $db->insert("INSERT INTO tratamiento (nombre, descripcion, requiere_ficha_especifica) VALUES (?, ?, ?)", [
                $data['nombre'], $data['descripcion'] ?? null, $data['requiere_ficha_especifica'] ?? false
            ]);
            echo json_encode(['success' => true, 'data' => ['id' => $result]]);
            break;
    }
}

function handlePacks($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT * FROM pack WHERE id = ?", [$id]);
            } else {
                $tratamientoId = $_GET['tratamiento_id'] ?? null;
                if ($tratamientoId) {
                    $result = $db->select("SELECT * FROM pack WHERE tratamiento_id = ? AND activo = TRUE ORDER BY nombre", [$tratamientoId]);
                } else {
                    $result = $db->select("SELECT * FROM pack WHERE activo = TRUE ORDER BY nombre");
                }
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            $result = $db->insert("INSERT INTO pack (tratamiento_id, nombre, descripcion, duracion_sesion_min) VALUES (?, ?, ?, ?)", [
                $data['tratamiento_id'], $data['nombre'], $data['descripcion'] ?? null, $data['duracion_sesion_min'] ?? 0
            ]);
            echo json_encode(['success' => true, 'data' => ['id' => $result]]);
            break;
    }
}

function handleSucursales($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT * FROM sucursal WHERE id = ?", [$id]);
            } else {
                $result = $db->select("SELECT * FROM sucursal WHERE activo = TRUE ORDER BY nombre");
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            $result = $db->insert("INSERT INTO sucursal (nombre, direccion, telefono) VALUES (?, ?, ?)", [
                $data['nombre'], $data['direccion'] ?? null, $data['telefono'] ?? null
            ]);
            echo json_encode(['success' => true, 'data' => ['id' => $result]]);
            break;
    }
}

function handleBoxes($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT * FROM box WHERE id = ?", [$id]);
            } else {
                $sucursalId = $_GET['sucursal_id'] ?? null;
                if ($sucursalId) {
                    $result = $db->select("SELECT * FROM box WHERE sucursal_id = ? AND activo = TRUE ORDER BY nombre", [$sucursalId]);
                } else {
                    $result = $db->select("SELECT * FROM box WHERE activo = TRUE ORDER BY nombre");
                }
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            $result = $db->insert("INSERT INTO box (sucursal_id, nombre) VALUES (?, ?)", [
                $data['sucursal_id'], $data['nombre']
            ]);
            echo json_encode(['success' => true, 'data' => ['id' => $result]]);
            break;
    }
}

function handleProfesionales($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT * FROM profesional WHERE id = ?", [$id]);
            } else {
                $result = $db->select("SELECT * FROM profesional WHERE activo = TRUE ORDER BY nombre");
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            // Crear profesional
            $result = $db->executeRaw("CALL sp_crear_profesional(?, ?, ?, ?, @profesional_id)", [
                $data['nombre'], $data['tipo_profesional'], $data['bio'] ?? null, $data['foto_url'] ?? null
            ]);
            $profesionalId = $db->selectOne("SELECT @profesional_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $profesionalId]]);
            break;
    }
}

// ---------- REPORTES ----------

function handleReportes($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            $tipo = $_GET['tipo'] ?? '';
            $fechaInicio = $_GET['fecha_inicio'] ?? date('Y-m-d', strtotime('-30 days'));
            $fechaFin = $_GET['fecha_fin'] ?? date('Y-m-d');
            
            switch ($tipo) {
                case 'progreso_ventas':
                    $result = $db->executeRaw("CALL sp_reporte_progreso_ventas(?, ?)", [$fechaInicio, $fechaFin]);
                    break;
                    
                case 'plan_vs_ejecucion':
                    $result = $db->executeRaw("CALL sp_reporte_plan_vs_ejecucion(?, ?)", [$fechaInicio, $fechaFin]);
                    break;
                    
                case 'ofertas_aplicadas':
                    $result = $db->select("SELECT * FROM v_reporte_ofertas WHERE DATE(fecha_creacion) BETWEEN ? AND ?", [$fechaInicio, $fechaFin]);
                    break;
                    
                case 'disponibilidad':
                    $result = $db->select("SELECT * FROM v_disponibilidad_profesionales");
                    break;
                    
                default:
                    $result = [];
                    break;
            }
            
            echo json_encode(['success' => true, 'data' => $result]);
            break;
    }
}

?>

