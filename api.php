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
            
        case 'consentimiento-firma':
            handleConsentimientoFirma($db, $method, $id, $data);
            break;
            
        // ---------- EVALUACIONES ----------
        case 'evaluaciones':
            handleEvaluaciones($db, $method, $id, $data);
            break;
            
        // ---------- VENTAS ----------
        case 'ventas':
            handleVentas($db, $method, $id, $data);
            break;
            
        case 'ventas/historial':
            handleHistorialVentas($db, $method, $id, $data);
            break;
            
        case 'auth':
            handleAuth($db, $method, $id, $data);
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
            
        case 'ofertas-aplicables':
            handleOfertasAplicables($db, $method, $id, $data);
            break;
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
    // Capturar errores de MySQL y otros errores de base de datos
    $errorMessage = $e->getMessage();
    $errorCode = $e->getCode();
    
    // Log del error para debugging
    error_log("Error en API: " . $errorMessage . " (Code: " . $errorCode . ")");
    
    // Determinar el código HTTP apropiado
    $httpCode = 500;
    if (strpos($errorMessage, 'Duplicate entry') !== false) {
        $httpCode = 409; // Conflict
    } elseif (strpos($errorMessage, 'foreign key constraint') !== false) {
        $httpCode = 400; // Bad Request
    } elseif (strpos($errorMessage, 'doesn\'t exist') !== false) {
        $httpCode = 404; // Not Found
    } elseif (strpos($errorMessage, 'SQLSTATE[23000]') !== false) {
        $httpCode = 400; // Bad Request (constraint violation)
    } elseif (strpos($errorMessage, 'SQLSTATE[42000]') !== false) {
        $httpCode = 400; // Bad Request (syntax error)
    }
    
    http_response_code($httpCode);
    
    // Devolver error en formato consistente para el frontend
    echo json_encode([
        'success' => false, 
        'error' => $errorMessage,
        'error_code' => $errorCode,
        'timestamp' => date('Y-m-d H:i:s'),
        'endpoint' => $endpoint ?? 'unknown',
        'method' => $method ?? 'unknown'
    ]);
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
            // Crear ficha - los errores se capturan en el try-catch global
            $result = $db->executeRaw("CALL sp_crear_ficha(?, ?, ?, ?, ?, ?, ?, ?, ?, @ficha_id)", [
                $data['codigo'], $data['nombres'], $data['apellidos'],
                $data['rut'] ?? null, $data['telefono'] ?? null, $data['email'] ?? null,
                $data['fecha_nacimiento'] ?? null, $data['direccion'] ?? '', $data['observaciones'] ?? ''
            ]);
            $fichaId = $db->selectOne("SELECT @ficha_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $fichaId]]);
            break;
            
        case 'PUT':
            // Actualizar ficha usando stored procedure
            $result = $db->executeRaw("CALL sp_actualizar_ficha(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @filas_actualizadas)", [
                $id, $data['codigo'], $data['nombres'], $data['apellidos'],
                $data['rut'] ?? null, $data['telefono'] ?? null, $data['email'] ?? null,
                $data['fecha_nacimiento'] ?? null, $data['direccion'] ?? '', $data['observaciones'] ?? ''
            ]);
            $filasActualizadas = $db->selectOne("SELECT @filas_actualizadas as filas")['filas'];
            echo json_encode(['success' => true, 'data' => ['updated' => $filasActualizadas]]);
            break;
            
        case 'DELETE':
            // Soft delete - cambiar estado usando stored procedure
            $result = $db->executeRaw("CALL sp_eliminar_ficha(?, @filas_actualizadas)", [$id]);
            $filasActualizadas = $db->selectOne("SELECT @filas_actualizadas as filas")['filas'];
            echo json_encode(['success' => true, 'data' => ['deleted' => $filasActualizadas]]);
            break;
    }
}

function handleFichasEspecificas($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT fe.*, tfe.nombre as tipo_nombre, e.ficha_id FROM ficha_especifica fe JOIN tipo_ficha_especifica tfe ON fe.tipo_id = tfe.id JOIN evaluacion e ON fe.evaluacion_id = e.id WHERE fe.id = ?", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
            } else {
                $evaluacionId = $_GET['evaluacion_id'] ?? null;
                if ($evaluacionId) {
                    $result = $db->select("SELECT fe.*, tfe.nombre as tipo_nombre FROM ficha_especifica fe JOIN tipo_ficha_especifica tfe ON fe.tipo_id = tfe.id WHERE fe.evaluacion_id = ?", [$evaluacionId]);
                } else {
                    $result = $db->select("SELECT fe.*, tfe.nombre as tipo_nombre, e.ficha_id FROM ficha_especifica fe JOIN tipo_ficha_especifica tfe ON fe.tipo_id = tfe.id JOIN evaluacion e ON fe.evaluacion_id = e.id");
                }
                echo json_encode(['success' => true, 'data' => $result]);
            }
            break;
            
        case 'POST':
            // Agregar ficha específica desde evaluación
            $result = $db->executeRaw("CALL sp_agregar_ficha_especifica(?, ?, ?, ?, @ficha_especifica_id)", [
                $data['evaluacion_id'], $data['tipo_id'], json_encode($data['datos']), $data['observaciones'] ?? ''
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
                $result = $db->select("SELECT * FROM tipo_ficha_especifica WHERE activo = TRUE ORDER BY nombre");
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            $result = $db->executeRaw("CALL sp_crear_tipo_ficha_especifica(?, ?, ?, ?, ?, @tipo_id)", [
                $data['nombre'], $data['descripcion'] ?? '', $data['requiere_consentimiento'] ?? false,
                $data['template_consentimiento'] ?? '', json_encode($data['campos_requeridos'] ?? [])
            ]);
            $tipoId = $db->selectOne("SELECT @tipo_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $tipoId]]);
            break;
    }
}

function handleConsentimientoFirma($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT cf.*, p.nombre as profesional_nombre FROM consentimiento_firma cf JOIN profesional p ON cf.profesional_id = p.id WHERE cf.id = ?", [$id]);
            } else {
                $fichaId = $_GET['ficha_id'] ?? null;
                $tipoConsentimiento = $_GET['tipo_consentimiento'] ?? null;
                if ($fichaId && $tipoConsentimiento) {
                    $result = $db->selectOne("SELECT cf.*, p.nombre as profesional_nombre FROM consentimiento_firma cf JOIN profesional p ON cf.profesional_id = p.id WHERE cf.ficha_id = ? AND cf.tipo_consentimiento = ?", [$fichaId, $tipoConsentimiento]);
                } else {
                    $result = $db->select("SELECT cf.*, p.nombre as profesional_nombre FROM consentimiento_firma cf JOIN profesional p ON cf.profesional_id = p.id");
                }
            }
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'POST':
            // Guardar firma digital
            $result = $db->executeRaw("CALL sp_guardar_firma_digital(?, ?, ?, ?, ?, ?, ?)", [
                $data['ficha_id'], $data['ficha_especifica_id'], $data['profesional_id'],
                $data['tipo_consentimiento'], $data['firma_blob'], $data['tipo_archivo'],
                $data['contenido_leido']
            ]);
            echo json_encode(['success' => true, 'data' => ['firma_guardada' => true]]);
            break;
    }
}

// ---------- EVALUACIONES ----------

function handleEvaluaciones($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $result = $db->selectOne("SELECT e.*, t.nombre as tratamiento_nombre, p.nombre as pack_nombre, prof.nombre as profesional_nombre FROM evaluacion e JOIN tratamiento t ON e.tratamiento_id = t.id LEFT JOIN pack p ON e.pack_id = p.id JOIN profesional prof ON e.profesional_id = prof.id WHERE e.id = ?", [$id]);
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
            $result = $db->executeRaw("CALL sp_crear_evaluacion(?, ?, ?, ?, ?, ?, ?, ?, @evaluacion_id)", [
                $data['ficha_id'], $data['profesional_id'], $data['tratamiento_id'], 
                $data['pack_id'] ?? null, $data['precio_sugerido'], $data['sesiones_sugeridas'],
                $data['observaciones'] ?? '', $data['recomendaciones'] ?? ''
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
            $result = $db->executeRaw("CALL sp_crear_venta(?, ?, ?, ?, ?, ?, ?, ?, @venta_id)", [
                $data['ficha_id'], $data['evaluacion_id'], $data['ficha_especifica_id'],
                $data['tratamiento_id'], $data['pack_id'] ?? null, $data['cantidad_sesiones'], 
                $data['precio_lista'], $data['descuento_manual_pct'] ?? 0
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
            // Registrar pago usando stored procedure
            $result = $db->executeRaw("CALL sp_crear_pago(?, ?, ?, ?, @pago_id)", [
                $data['venta_id'], $data['monto'], $data['metodo_pago'], $data['observaciones'] ?? null
            ]);
            $pagoId = $db->selectOne("SELECT @pago_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $pagoId]]);
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
            $result = $db->executeRaw("CALL sp_agregar_pack_oferta_combo(?, ?, @relacion_id)", [
                $data['oferta_combo_id'], $data['pack_id']
            ]);
            $relacionId = $db->selectOne("SELECT @relacion_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $relacionId]]);
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
            $result = $db->executeRaw("CALL sp_crear_tratamiento(?, ?, ?, @tratamiento_id)", [
                $data['nombre'], $data['descripcion'] ?? null, $data['requiere_ficha_especifica'] ?? false
            ]);
            $tratamientoId = $db->selectOne("SELECT @tratamiento_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $tratamientoId]]);
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
            $result = $db->executeRaw("CALL sp_crear_pack(?, ?, ?, ?, @pack_id)", [
                $data['tratamiento_id'], $data['nombre'], $data['descripcion'] ?? null, $data['duracion_sesion_min'] ?? 0
            ]);
            $packId = $db->selectOne("SELECT @pack_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $packId]]);
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
            $result = $db->executeRaw("CALL sp_crear_sucursal(?, ?, ?, @sucursal_id)", [
                $data['nombre'], $data['direccion'] ?? null, $data['telefono'] ?? null
            ]);
            $sucursalId = $db->selectOne("SELECT @sucursal_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $sucursalId]]);
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
            $result = $db->executeRaw("CALL sp_crear_box(?, ?, @box_id)", [
                $data['sucursal_id'], $data['nombre']
            ]);
            $boxId = $db->selectOne("SELECT @box_id as id")['id'];
            echo json_encode(['success' => true, 'data' => ['id' => $boxId]]);
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

function handleOfertasAplicables($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            // Obtener todas las ofertas aplicables (activas y en fecha)
            $result = $db->select("SELECT * FROM v_ofertas_aplicables WHERE aplicable_hoy = TRUE ORDER BY prioridad");
            echo json_encode(['success' => true, 'data' => $result]);
            break;
    }
}

// ---------- HISTORIAL DE VENTAS ----------

function handleHistorialVentas($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                // Obtener historial de ventas de un cliente específico
                $result = $db->executeRaw("CALL sp_obtener_historial_tratamientos(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
            }
            break;
    }
}

// ---------- AUTENTICACIÓN ----------

function handleAuth($db, $method, $id, $data) {
    switch ($method) {
        case 'POST':
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            
            if (empty($username) || empty($password)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Username y password son requeridos']);
                return;
            }
            
            // Buscar usuario por username
            $usuario = $db->selectOne("SELECT * FROM usuario WHERE username = ? AND activo = TRUE", [$username]);
            
            if (!$usuario) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Credenciales inválidas']);
                return;
            }
            
            // Verificar password
            if (!password_verify($password, $usuario['password_hash'])) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Credenciales inválidas']);
                return;
            }
            
            // Actualizar último login usando stored procedure
            $db->executeRaw("CALL sp_actualizar_ultimo_login(?)", [$usuario['id']]);
            
            // Obtener datos del profesional si existe
            $profesional = null;
            if ($usuario['rol'] === 'profesional') {
                $profesional = $db->selectOne("SELECT * FROM profesional WHERE usuario_id = ?", [$usuario['id']]);
            }
            
            // Generar token de sesión (simple por ahora)
            $token = bin2hex(random_bytes(32));
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'token' => $token,
                    'usuario' => [
                        'id' => $usuario['id'],
                        'username' => $usuario['username'],
                        'email' => $usuario['email'],
                        'rol' => $usuario['rol'],
                        'ultimo_login' => $usuario['ultimo_login']
                    ],
                    'profesional' => $profesional
                ]
            ]);
            break;
            
        case 'GET':
            // Verificar token (implementación simple)
            $token = $_GET['token'] ?? '';
            if (empty($token)) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Token requerido']);
                return;
            }
            
            // Por ahora, solo validamos que el token existe
            // En una implementación real, deberías verificar el token en una tabla de sesiones
            echo json_encode(['success' => true, 'data' => ['valid' => true]]);
            break;
    }
}

?>

