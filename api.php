<?php

/**
 * API REST para Clínica Beleza
 * Maneja todas las operaciones CRUD con la base de datos SQLite
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
    
    // Router principal
    switch ($endpoint) {
        case 'pacientes':
            handlePacientes($db, $method, $id, $data);
            break;
            
        case 'ventas':
            handleVentas($db, $method, $id, $data);
            break;
            
        case 'pagos':
            handlePagos($db, $method, $id, $data);
            break;
            
        case 'sesiones':
            handleSesiones($db, $method, $id, $data);
            break;
            
        case 'ofertas':
            handleOfertas($db, $method, $id, $data);
            break;
            
        case 'boxes':
            handleBoxes($db, $method, $id, $data);
            break;
            
        case 'stats':
            handleStats($db, $method);
            break;
            
        case 'health':
            handleHealth($db);
            break;
            
        case 'backup':
            handleBackup($db, $method);
            break;
            
        default:
            respondWithError('Endpoint no encontrado', 404);
    }
    
} catch (Exception $e) {
    error_log('API Error: ' . $e->getMessage());
    respondWithError('Error interno del servidor: ' . $e->getMessage(), 500);
}

/**
 * Maneja operaciones de pacientes
 */
function handlePacientes($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                // Obtener paciente específico con sus fichas
                $paciente = $db->selectOne(
                    "SELECT * FROM pacientes WHERE id = ?", 
                    [$id]
                );
                
                if (!$paciente) {
                    respondWithError('Paciente no encontrado', 404);
                }
                
                // Obtener fichas relacionadas
                $fichaDepilacion = $db->selectOne(
                    "SELECT * FROM fichas_depilacion WHERE paciente_id = ?", 
                    [$id]
                );
                
                $fichaCorporal = $db->selectOne(
                    "SELECT * FROM fichas_corporales WHERE paciente_id = ?", 
                    [$id]
                );
                
                $paciente['ficha_depilacion'] = $fichaDepilacion;
                $paciente['ficha_corporal'] = $fichaCorporal;
                
                respondWithSuccess($paciente);
            } else {
                // Obtener todos los pacientes
                $pacientes = $db->select(
                    "SELECT id, nombre, rut, edad, telefono, email, created_at FROM pacientes ORDER BY nombre"
                );
                respondWithSuccess($pacientes);
            }
            break;
            
        case 'POST':
            // Crear nuevo paciente
            $db->beginTransaction();
            try {
                $pacienteId = $db->insert(
                    "INSERT INTO pacientes (nombre, rut, edad, telefono, codigo_pais, email, observaciones_generales) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                        $data['nombre'],
                        $data['rut'],
                        $data['edad'] ?? null,
                        $data['telefono'] ?? null,
                        $data['codigo_pais'] ?? '+56',
                        $data['email'] ?? null,
                        $data['observaciones_generales'] ?? null
                    ]
                );
                
                // Insertar fichas específicas si existen
                if (isset($data['ficha_depilacion'])) {
                    $ficha = $data['ficha_depilacion'];
                    $db->insert(
                        "INSERT INTO fichas_depilacion (paciente_id, zonas_tratar, tipo_piel, medicamentos, observaciones_medicas) 
                         VALUES (?, ?, ?, ?, ?)",
                        [
                            $pacienteId,
                            $ficha['zonas_tratar'] ?? null,
                            $ficha['tipo_piel'] ?? null,
                            $ficha['medicamentos'] ?? null,
                            $ficha['observaciones_medicas'] ?? null
                        ]
                    );
                }
                
                if (isset($data['ficha_corporal'])) {
                    $ficha = $data['ficha_corporal'];
                    $db->insert(
                        "INSERT INTO fichas_corporales (paciente_id, tratamientos_previos, objetivo_estetico, zona_tratamiento, expectativas) 
                         VALUES (?, ?, ?, ?, ?)",
                        [
                            $pacienteId,
                            $ficha['tratamientos_previos'] ?? null,
                            $ficha['objetivo_estetico'] ?? null,
                            $ficha['zona_tratamiento'] ?? null,
                            $ficha['expectativas'] ?? null
                        ]
                    );
                }
                
                $db->commit();
                respondWithSuccess(['id' => $pacienteId, 'message' => 'Paciente creado exitosamente']);
                
            } catch (Exception $e) {
                $db->rollback();
                throw $e;
            }
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID de paciente requerido', 400);
            }
            
            // Actualizar paciente
            $db->update(
                "UPDATE pacientes SET nombre = ?, rut = ?, edad = ?, telefono = ?, codigo_pais = ?, email = ?, observaciones_generales = ? WHERE id = ?",
                [
                    $data['nombre'],
                    $data['rut'],
                    $data['edad'] ?? null,
                    $data['telefono'] ?? null,
                    $data['codigo_pais'] ?? '+56',
                    $data['email'] ?? null,
                    $data['observaciones_generales'] ?? null,
                    $id
                ]
            );
            
            respondWithSuccess(['message' => 'Paciente actualizado exitosamente']);
            break;
            
        case 'DELETE':
            if (!$id) {
                respondWithError('ID de paciente requerido', 400);
            }
            
            $deleted = $db->delete("DELETE FROM pacientes WHERE id = ?", [$id]);
            
            if ($deleted > 0) {
                respondWithSuccess(['message' => 'Paciente eliminado exitosamente']);
            } else {
                respondWithError('Paciente no encontrado', 404);
            }
            break;
            
        default:
            respondWithError('Método no permitido', 405);
    }
}

/**
 * Maneja operaciones de ventas
 */
function handleVentas($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $venta = $db->selectOne(
                    "SELECT v.*, p.nombre as paciente_nombre, p.rut as paciente_rut 
                     FROM ventas v 
                     JOIN pacientes p ON v.paciente_id = p.id 
                     WHERE v.id = ?", 
                    [$id]
                );
                
                if (!$venta) {
                    respondWithError('Venta no encontrada', 404);
                }
                
                respondWithSuccess($venta);
            } else {
                // Filtros opcionales
                $where = "1=1";
                $params = [];
                
                if (isset($_GET['paciente_id'])) {
                    $where .= " AND v.paciente_id = ?";
                    $params[] = $_GET['paciente_id'];
                }
                
                if (isset($_GET['estado'])) {
                    $where .= " AND v.estado = ?";
                    $params[] = $_GET['estado'];
                }
                
                $ventas = $db->select(
                    "SELECT v.*, p.nombre as paciente_nombre, p.rut as paciente_rut 
                     FROM ventas v 
                     JOIN pacientes p ON v.paciente_id = p.id 
                     WHERE $where 
                     ORDER BY v.created_at DESC",
                    $params
                );
                
                respondWithSuccess($ventas);
            }
            break;
            
        case 'POST':
            $ventaId = $db->insert(
                "INSERT INTO ventas (paciente_id, tratamiento, pack_nombre, sesiones_total, precio_total, descuento_aplicado, observaciones) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    $data['paciente_id'],
                    $data['tratamiento'],
                    $data['pack_nombre'] ?? null,
                    $data['sesiones_total'],
                    $data['precio_total'],
                    $data['descuento_aplicado'] ?? 0,
                    $data['observaciones'] ?? null
                ]
            );
            
            respondWithSuccess(['id' => $ventaId, 'message' => 'Venta creada exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID de venta requerido', 400);
            }
            
            $db->update(
                "UPDATE ventas SET estado = ?, sesiones_usadas = ?, observaciones = ? WHERE id = ?",
                [
                    $data['estado'] ?? 'pendiente',
                    $data['sesiones_usadas'] ?? 0,
                    $data['observaciones'] ?? null,
                    $id
                ]
            );
            
            respondWithSuccess(['message' => 'Venta actualizada exitosamente']);
            break;
            
        default:
            respondWithError('Método no permitido', 405);
    }
}

/**
 * Maneja operaciones de pagos
 */
function handlePagos($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if (isset($_GET['venta_id'])) {
                $pagos = $db->select(
                    "SELECT * FROM pagos WHERE venta_id = ? ORDER BY fecha_pago DESC",
                    [$_GET['venta_id']]
                );
            } else {
                $pagos = $db->select(
                    "SELECT p.*, v.tratamiento, pac.nombre as paciente_nombre 
                     FROM pagos p 
                     JOIN ventas v ON p.venta_id = v.id 
                     JOIN pacientes pac ON v.paciente_id = pac.id 
                     ORDER BY p.fecha_pago DESC"
                );
            }
            
            respondWithSuccess($pagos);
            break;
            
        case 'POST':
            $pagoId = $db->insert(
                "INSERT INTO pagos (venta_id, monto, metodo_pago, fecha_pago, observaciones) 
                 VALUES (?, ?, ?, ?, ?)",
                [
                    $data['venta_id'],
                    $data['monto'],
                    $data['metodo_pago'],
                    $data['fecha_pago'],
                    $data['observaciones'] ?? null
                ]
            );
            
            respondWithSuccess(['id' => $pagoId, 'message' => 'Pago registrado exitosamente']);
            break;
            
        default:
            respondWithError('Método no permitido', 405);
    }
}

/**
 * Maneja operaciones de sesiones
 */
function handleSesiones($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if (isset($_GET['fecha'])) {
                $fecha = $_GET['fecha'];
                $sesiones = $db->select(
                    "SELECT s.*, v.tratamiento, p.nombre as paciente_nombre, p.rut as paciente_rut 
                     FROM sesiones s 
                     JOIN ventas v ON s.venta_id = v.id 
                     JOIN pacientes p ON s.paciente_id = p.id 
                     WHERE DATE(s.fecha_agendada) = ? 
                     ORDER BY s.fecha_agendada",
                    [$fecha]
                );
            } else {
                $sesiones = $db->select(
                    "SELECT s.*, v.tratamiento, p.nombre as paciente_nombre 
                     FROM sesiones s 
                     JOIN ventas v ON s.venta_id = v.id 
                     JOIN pacientes p ON s.paciente_id = p.id 
                     ORDER BY s.fecha_agendada DESC 
                     LIMIT 50"
                );
            }
            
            respondWithSuccess($sesiones);
            break;
            
        case 'POST':
            $sesionId = $db->insert(
                "INSERT INTO sesiones (venta_id, paciente_id, fecha_agendada, box_id, observaciones) 
                 VALUES (?, ?, ?, ?, ?)",
                [
                    $data['venta_id'],
                    $data['paciente_id'],
                    $data['fecha_agendada'],
                    $data['box_id'] ?? 1,
                    $data['observaciones'] ?? null
                ]
            );
            
            respondWithSuccess(['id' => $sesionId, 'message' => 'Sesión agendada exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID de sesión requerido', 400);
            }
            
            $db->update(
                "UPDATE sesiones SET estado = ?, fecha_inicio = ?, fecha_fin = ?, observaciones = ? WHERE id = ?",
                [
                    $data['estado'],
                    $data['fecha_inicio'] ?? null,
                    $data['fecha_fin'] ?? null,
                    $data['observaciones'] ?? null,
                    $id
                ]
            );
            
            respondWithSuccess(['message' => 'Sesión actualizada exitosamente']);
            break;
            
        default:
            respondWithError('Método no permitido', 405);
    }
}

/**
 * Maneja operaciones de ofertas
 */
function handleOfertas($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            $ofertas = $db->select(
                "SELECT * FROM ofertas WHERE activa = 1 AND fecha_fin >= DATE('now') ORDER BY fecha_inicio"
            );
            respondWithSuccess($ofertas);
            break;
            
        case 'POST':
            $ofertaId = $db->insert(
                "INSERT INTO ofertas (tratamiento, descuento_porcentaje, precio_fijo, fecha_inicio, fecha_fin, descripcion) 
                 VALUES (?, ?, ?, ?, ?, ?)",
                [
                    $data['tratamiento'],
                    $data['descuento_porcentaje'] ?? null,
                    $data['precio_fijo'] ?? null,
                    $data['fecha_inicio'],
                    $data['fecha_fin'],
                    $data['descripcion'] ?? null
                ]
            );
            
            respondWithSuccess(['id' => $ofertaId, 'message' => 'Oferta creada exitosamente']);
            break;
            
        default:
            respondWithError('Método no permitido', 405);
    }
}

/**
 * Maneja operaciones de boxes
 */
function handleBoxes($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            $boxes = $db->select("SELECT * FROM boxes ORDER BY id");
            respondWithSuccess($boxes);
            break;
            
        default:
            respondWithError('Método no permitido', 405);
    }
}

/**
 * Maneja estadísticas
 */
function handleStats($db, $method) {
    if ($method !== 'GET') {
        respondWithError('Método no permitido', 405);
    }
    
    $stats = $db->getStats();
    respondWithSuccess($stats);
}

/**
 * Maneja health check
 */
function handleHealth($db) {
    $health = $db->healthCheck();
    respondWithSuccess($health);
}

/**
 * Maneja backup
 */
function handleBackup($db, $method) {
    if ($method !== 'POST') {
        respondWithError('Método no permitido', 405);
    }
    
    $success = $db->backup();
    
    if ($success) {
        respondWithSuccess(['message' => 'Backup creado exitosamente']);
    } else {
        respondWithError('Error creando backup', 500);
    }
}

/**
 * Responde con éxito
 */
function respondWithSuccess($data, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => true,
        'data' => $data,
        'timestamp' => date('c')
    ]);
    exit();
}

/**
 * Responde con error
 */
function respondWithError($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message,
        'timestamp' => date('c')
    ]);
    exit();
}

?>

