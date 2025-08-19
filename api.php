<?php

/**
 * API REST para Clínica Beleza
 * Server-based architecture - Sin modo offline
 * Cobertura completa de User Stories y Business Rules
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
        case 'fichas':
            handleFichas($db, $method, $id, $data);
            break;
            
        case 'tipos-ficha-especifica':
            handleTiposFichaEspecifica($db, $method, $id, $data);
            break;
            
        case 'fichas-especificas':
            handleFichasEspecificas($db, $method, $id, $data);
            break;
            
        case 'tratamientos':
            handleTratamientos($db, $method, $id, $data);
            break;
            
        case 'packs':
            handlePacks($db, $method, $id, $data);
            break;
            
        case 'evaluaciones':
            handleEvaluaciones($db, $method, $id, $data);
            break;
            
        case 'ventas':
            handleVentas($db, $method, $id, $data);
            break;
            
        case 'sesiones':
            handleSesiones($db, $method, $id, $data);
            break;
            
        case 'ofertas':
            handleOfertas($db, $method, $id, $data);
            break;
            
        case 'ofertas-combo':
            handleOfertasCombo($db, $method, $id, $data);
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
            
        case 'reportes':
            handleReportes($db, $method, $id, $data);
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
 * Maneja operaciones de fichas (pacientes)
 */
function handleFichas($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                // Obtener ficha específica con sus datos relacionados
                $ficha = $db->selectOne(
                    "SELECT * FROM ficha WHERE id = ?", 
                    [$id]
                );
                
                if (!$ficha) {
                    respondWithError('Ficha no encontrada', 404);
                    return;
                }
                
                // Obtener fichas específicas relacionadas
                $fichasEspecificas = $db->select(
                    "SELECT fe.*, tf.nombre as tipo_nombre, t.nombre as tratamiento_nombre, p.nombre as pack_nombre
                     FROM ficha_especifica fe
                     LEFT JOIN tipo_ficha_especifica tf ON fe.tipo_id = tf.id
                     LEFT JOIN tratamiento t ON fe.tratamiento_id = t.id
                     LEFT JOIN pack p ON fe.pack_id = p.id
                     WHERE fe.ficha_id = ?",
                    [$id]
                );
                
                $ficha['fichas_especificas'] = $fichasEspecificas;
                respondWithSuccess($ficha);
                
            } else {
                // Listar todas las fichas con paginación
                $page = $_GET['page'] ?? 1;
                $limit = $_GET['limit'] ?? 50;
                $offset = ($page - 1) * $limit;
                $search = $_GET['search'] ?? '';
                
                $whereClause = '';
                $params = [];
                
                if ($search) {
                    $whereClause = "WHERE nombres ILIKE ? OR apellidos ILIKE ? OR rut ILIKE ? OR email ILIKE ?";
                    $searchTerm = "%$search%";
                    $params = [$searchTerm, $searchTerm, $searchTerm, $searchTerm];
                }
                
                $fichas = $db->select(
                    "SELECT * FROM ficha $whereClause ORDER BY fecha_creacion DESC LIMIT ? OFFSET ?",
                    array_merge($params, [$limit, $offset])
                );
                
                $total = $db->selectOne(
                    "SELECT COUNT(*) as count FROM ficha $whereClause",
                    $params
                );
                
                respondWithSuccess([
                    'data' => $fichas,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => $total['count'],
                        'pages' => ceil($total['count'] / $limit)
                    ]
                ]);
            }
            break;
            
        case 'POST':
            // Crear nueva ficha
            $requiredFields = ['nombres', 'apellidos'];
            validateRequiredFields($data, $requiredFields);
            
            $fichaId = $db->insertReturning(
                "INSERT INTO ficha (codigo, nombres, apellidos, rut, telefono, email, fecha_creacion) 
                 VALUES (?, ?, ?, ?, ?, ?, NOW()) RETURNING id",
                [
                    $data['codigo'] ?? null,
                    $data['nombres'],
                    $data['apellidos'],
                    $data['rut'] ?? null,
                    $data['telefono'] ?? null,
                    $data['email'] ?? null
                ]
            );
            
            respondWithSuccess(['id' => $fichaId, 'message' => 'Ficha creada exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE ficha SET 
                 codigo = ?, nombres = ?, apellidos = ?, rut = ?, telefono = ?, email = ?
                 WHERE id = ?",
                [
                    $data['codigo'] ?? null,
                    $data['nombres'] ?? '',
                    $data['apellidos'] ?? '',
                    $data['rut'] ?? null,
                    $data['telefono'] ?? null,
                    $data['email'] ?? null,
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Ficha actualizada exitosamente']);
            } else {
                respondWithError('Ficha no encontrada', 404);
            }
            break;
            
        case 'DELETE':
            if (!$id) {
                respondWithError('ID requerido para eliminar', 400);
                return;
            }
            
            // Soft delete - cambiar estado en lugar de eliminar
            $deleted = $db->update(
                "UPDATE ficha SET activo = false WHERE id = ?",
                [$id]
            );
            
            if ($deleted > 0) {
                respondWithSuccess(['message' => 'Ficha eliminada exitosamente']);
            } else {
                respondWithError('Ficha no encontrada', 404);
            }
            break;
    }
}

/**
 * Maneja operaciones de tratamientos
 */
function handleTratamientos($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $tratamiento = $db->selectOne(
                    "SELECT * FROM tratamiento WHERE id = ?", 
                    [$id]
                );
                
                if (!$tratamiento) {
                    respondWithError('Tratamiento no encontrado', 404);
                    return;
                }
                
                // Obtener packs relacionados
                $packs = $db->select(
                    "SELECT * FROM pack WHERE tratamiento_id = ? AND activo = true",
                    [$id]
                );
                
                $tratamiento['packs'] = $packs;
                respondWithSuccess($tratamiento);
                
            } else {
                $tratamientos = $db->select(
                    "SELECT * FROM tratamiento ORDER BY nombre"
                );
                respondWithSuccess($tratamientos);
            }
            break;
            
        case 'POST':
            $requiredFields = ['nombre'];
            validateRequiredFields($data, $requiredFields);
            
            $tratamientoId = $db->insertReturning(
                "INSERT INTO tratamiento (nombre, descripcion, requiere_ficha_especifica) 
                 VALUES (?, ?, ?) RETURNING id",
                [
                    $data['nombre'],
                    $data['descripcion'] ?? null,
                    $data['requiere_ficha_especifica'] ?? false
                ]
            );
            
            respondWithSuccess(['id' => $tratamientoId, 'message' => 'Tratamiento creado exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE tratamiento SET 
                 nombre = ?, descripcion = ?, requiere_ficha_especifica = ?
                 WHERE id = ?",
                [
                    $data['nombre'] ?? '',
                    $data['descripcion'] ?? null,
                    $data['requiere_ficha_especifica'] ?? false,
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Tratamiento actualizado exitosamente']);
            } else {
                respondWithError('Tratamiento no encontrado', 404);
            }
            break;
    }
}

/**
 * Maneja operaciones de packs
 */
function handlePacks($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $pack = $db->selectOne(
                    "SELECT p.*, t.nombre as tratamiento_nombre 
                     FROM pack p 
                     LEFT JOIN tratamiento t ON p.tratamiento_id = t.id 
                     WHERE p.id = ?", 
                    [$id]
                );
                
                if (!$pack) {
                    respondWithError('Pack no encontrado', 404);
                    return;
                }
                
                respondWithSuccess($pack);
                
            } else {
                $tratamientoId = $_GET['tratamiento_id'] ?? null;
                
                if ($tratamientoId) {
                    $packs = $db->select(
                        "SELECT * FROM pack WHERE tratamiento_id = ? AND activo = true ORDER BY nombre",
                        [$tratamientoId]
                    );
                } else {
                    $packs = $db->select(
                        "SELECT p.*, t.nombre as tratamiento_nombre 
                         FROM pack p 
                         LEFT JOIN tratamiento t ON p.tratamiento_id = t.id 
                         WHERE p.activo = true 
                         ORDER BY t.nombre, p.nombre"
                    );
                }
                
                respondWithSuccess($packs);
            }
            break;
            
        case 'POST':
            $requiredFields = ['nombre', 'tratamiento_id'];
            validateRequiredFields($data, $requiredFields);
            
            $packId = $db->insertReturning(
                "INSERT INTO pack (tratamiento_id, nombre, descripcion, duracion_sesion_min, activo) 
                 VALUES (?, ?, ?, ?, ?) RETURNING id",
                [
                    $data['tratamiento_id'],
                    $data['nombre'],
                    $data['descripcion'] ?? null,
                    $data['duracion_sesion_min'] ?? 0,
                    $data['activo'] ?? true
                ]
            );
            
            respondWithSuccess(['id' => $packId, 'message' => 'Pack creado exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE pack SET 
                 nombre = ?, descripcion = ?, duracion_sesion_min = ?, activo = ?
                 WHERE id = ?",
                [
                    $data['nombre'] ?? '',
                    $data['descripcion'] ?? null,
                    $data['duracion_sesion_min'] ?? 0,
                    $data['activo'] ?? true,
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Pack actualizado exitosamente']);
            } else {
                respondWithError('Pack no encontrado', 404);
            }
            break;
    }
}

/**
 * Maneja operaciones de evaluaciones
 */
function handleEvaluaciones($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $evaluacion = $db->selectOne(
                    "SELECT e.*, f.nombres, f.apellidos, t.nombre as tratamiento_nombre, 
                            p.nombre as pack_nombre, pr.nombre as profesional_nombre
                     FROM evaluacion e
                     LEFT JOIN ficha f ON e.ficha_id = f.id
                     LEFT JOIN tratamiento t ON e.tratamiento_id = t.id
                     LEFT JOIN pack p ON e.pack_id = p.id
                     LEFT JOIN profesional pr ON e.profesional_id = pr.id
                     WHERE e.id = ?", 
                    [$id]
                );
                
                if (!$evaluacion) {
                    respondWithError('Evaluación no encontrada', 404);
                    return;
                }
                
                respondWithSuccess($evaluacion);
                
            } else {
                $fichaId = $_GET['ficha_id'] ?? null;
                
                if ($fichaId) {
                    $evaluaciones = $db->select(
                        "SELECT e.*, t.nombre as tratamiento_nombre, p.nombre as pack_nombre, pr.nombre as profesional_nombre
                         FROM evaluacion e
                         LEFT JOIN tratamiento t ON e.tratamiento_id = t.id
                         LEFT JOIN pack p ON e.pack_id = p.id
                         LEFT JOIN profesional pr ON e.profesional_id = pr.id
                         WHERE e.ficha_id = ?
                         ORDER BY e.fecha DESC",
                        [$fichaId]
                    );
                } else {
                    $evaluaciones = $db->select(
                        "SELECT e.*, f.nombres, f.apellidos, t.nombre as tratamiento_nombre, 
                                p.nombre as pack_nombre, pr.nombre as profesional_nombre
                         FROM evaluacion e
                         LEFT JOIN ficha f ON e.ficha_id = f.id
                         LEFT JOIN tratamiento t ON e.tratamiento_id = t.id
                         LEFT JOIN pack p ON e.pack_id = p.id
                         LEFT JOIN profesional pr ON e.profesional_id = pr.id
                         ORDER BY e.fecha DESC
                         LIMIT 50"
                    );
                }
                
                respondWithSuccess($evaluaciones);
            }
            break;
            
        case 'POST':
            $requiredFields = ['ficha_id', 'tratamiento_id', 'profesional_id'];
            validateRequiredFields($data, $requiredFields);
            
            $evaluacionId = $db->insertReturning(
                "INSERT INTO evaluacion (ficha_id, tratamiento_id, pack_id, profesional_id, precio_sugerido, sesiones_sugeridas, observaciones, fecha) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW()) RETURNING id",
                [
                    $data['ficha_id'],
                    $data['tratamiento_id'],
                    $data['pack_id'] ?? null,
                    $data['profesional_id'],
                    $data['precio_sugerido'] ?? 0,
                    $data['sesiones_sugeridas'] ?? 1,
                    $data['observaciones'] ?? null
                ]
            );
            
            respondWithSuccess(['id' => $evaluacionId, 'message' => 'Evaluación creada exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE evaluacion SET 
                 precio_sugerido = ?, sesiones_sugeridas = ?, observaciones = ?
                 WHERE id = ?",
                [
                    $data['precio_sugerido'] ?? 0,
                    $data['sesiones_sugeridas'] ?? 1,
                    $data['observaciones'] ?? null,
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Evaluación actualizada exitosamente']);
            } else {
                respondWithError('Evaluación no encontrada', 404);
            }
            break;
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
                    "SELECT v.*, f.nombres, f.apellidos, t.nombre as tratamiento_nombre, 
                            p.nombre as pack_nombre, e.precio_sugerido, e.sesiones_sugeridas
                     FROM venta v
                     LEFT JOIN ficha f ON v.ficha_id = f.id
                     LEFT JOIN tratamiento t ON v.tratamiento_id = t.id
                     LEFT JOIN pack p ON v.pack_id = p.id
                     LEFT JOIN evaluacion e ON v.evaluacion_id = e.id
                     WHERE v.id = ?", 
                    [$id]
                );
                
                if (!$venta) {
                    respondWithError('Venta no encontrada', 404);
                    return;
                }
                
                // Obtener ofertas aplicadas
                $ofertas = $db->select(
                    "SELECT vo.*, o.nombre as oferta_nombre
                     FROM venta_oferta vo
                     LEFT JOIN oferta o ON vo.oferta_id = o.id
                     WHERE vo.venta_id = ?
                     ORDER BY vo.secuencia",
                    [$id]
                );
                
                $venta['ofertas_aplicadas'] = $ofertas;
                respondWithSuccess($venta);
                
            } else {
                $fichaId = $_GET['ficha_id'] ?? null;
                $estado = $_GET['estado'] ?? null;
                
                $whereClause = '';
                $params = [];
                
                if ($fichaId) {
                    $whereClause = "WHERE v.ficha_id = ?";
                    $params[] = $fichaId;
                }
                
                if ($estado) {
                    $whereClause = $whereClause ? $whereClause . " AND v.estado = ?" : "WHERE v.estado = ?";
                    $params[] = $estado;
                }
                
                $ventas = $db->select(
                    "SELECT v.*, f.nombres, f.apellidos, t.nombre as tratamiento_nombre, p.nombre as pack_nombre
                     FROM venta v
                     LEFT JOIN ficha f ON v.ficha_id = f.id
                     LEFT JOIN tratamiento t ON v.tratamiento_id = t.id
                     LEFT JOIN pack p ON v.pack_id = p.id
                     $whereClause
                     ORDER BY v.fecha_creacion DESC
                     LIMIT 50",
                    $params
                );
                
                respondWithSuccess($ventas);
            }
            break;
            
        case 'POST':
            $requiredFields = ['ficha_id', 'tratamiento_id'];
            validateRequiredFields($data, $requiredFields);
            
            $db->beginTransaction();
            
            try {
                // BR-001: Validar que el tratamiento no requiera ficha específica o que exista
                $tratamiento = $db->selectOne(
                    "SELECT requiere_ficha_especifica FROM tratamiento WHERE id = ?",
                    [$data['tratamiento_id']]
                );
                
                if (!$tratamiento) {
                    throw new Exception('Tratamiento no encontrado');
                }
                
                if ($tratamiento['requiere_ficha_especifica']) {
                    if (!$data['evaluacion_id']) {
                        throw new Exception('Tratamiento requiere evaluación y ficha específica');
                    }
                    
                    // Verificar que la evaluación pertenezca a la misma ficha
                    $evaluacion = $db->selectOne(
                        "SELECT ficha_id FROM evaluacion WHERE id = ?",
                        [$data['evaluacion_id']]
                    );
                    
                    if (!$evaluacion || $evaluacion['ficha_id'] != $data['ficha_id']) {
                        throw new Exception('Evaluación debe pertenecer a la misma ficha');
                    }
                    
                    // Verificar que exista al menos una ficha específica
                    $fichasEspecificas = $db->selectOne(
                        "SELECT COUNT(*) as count FROM ficha_especifica WHERE ficha_id = ?",
                        [$data['ficha_id']]
                    );
                    
                    if ($fichasEspecificas['count'] == 0) {
                        throw new Exception('Ficha específica requerida no existe para la ficha');
                    }
                }
                
                // Calcular precio final con descuentos
                $precioLista = $data['precio_lista'] ?? 0;
                $descuentoManual = $data['descuento_manual_pct'] ?? 0;
                $descuentoManualMonto = $precioLista * ($descuentoManual / 100);
                $precioConDescuentoManual = $precioLista - $descuentoManualMonto;
                
                // Aplicar ofertas en orden de prioridad (BR-003)
                $descuentoOfertas = 0;
                $ofertasAplicadas = [];
                
                if (isset($data['ofertas']) && is_array($data['ofertas'])) {
                    // Ordenar ofertas por prioridad
                    usort($data['ofertas'], function($a, $b) {
                        return ($a['prioridad'] ?? 0) - ($b['prioridad'] ?? 0);
                    });
                    
                    $precioActual = $precioConDescuentoManual;
                    
                    foreach ($data['ofertas'] as $index => $oferta) {
                        $porcDescuento = $oferta['porc_descuento'] ?? 0;
                        $montoDescuento = $precioActual * ($porcDescuento / 100);
                        
                        $ofertasAplicadas[] = [
                            'oferta_id' => $oferta['oferta_id'],
                            'secuencia' => $index + 1,
                            'porc_descuento' => $porcDescuento,
                            'monto_descuento' => $montoDescuento
                        ];
                        
                        $descuentoOfertas += $montoDescuento;
                        $precioActual -= $montoDescuento;
                    }
                }
                
                $descuentoTotal = $descuentoManualMonto + $descuentoOfertas;
                $totalPagado = $precioLista - $descuentoTotal;
                
                $ventaId = $db->insertReturning(
                    "INSERT INTO venta (ficha_id, evaluacion_id, tratamiento_id, pack_id, cantidad_sesiones, 
                                       precio_lista, descuento_manual_pct, descuento_aplicado_total, 
                                       total_pagado, estado, fecha_creacion) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) RETURNING id",
                    [
                        $data['ficha_id'],
                        $data['evaluacion_id'] ?? null,
                        $data['tratamiento_id'],
                        $data['pack_id'] ?? null,
                        $data['cantidad_sesiones'] ?? 1,
                        $precioLista,
                        $descuentoManual,
                        $descuentoTotal,
                        $totalPagado,
                        $data['estado'] ?? 'pendiente'
                    ]
                );
                
                // Registrar ofertas aplicadas
                foreach ($ofertasAplicadas as $oferta) {
                    $db->insert(
                        "INSERT INTO venta_oferta (venta_id, oferta_id, secuencia, porc_descuento, monto_descuento) 
                         VALUES (?, ?, ?, ?, ?)",
                        [
                            $ventaId,
                            $oferta['oferta_id'],
                            $oferta['secuencia'],
                            $oferta['porc_descuento'],
                            $oferta['monto_descuento']
                        ]
                    );
                }
                
                $db->commit();
                respondWithSuccess(['id' => $ventaId, 'message' => 'Venta creada exitosamente']);
                
            } catch (Exception $e) {
                $db->rollback();
                throw $e;
            }
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE venta SET 
                 cantidad_sesiones = ?, precio_lista = ?, descuento_manual_pct = ?, 
                 descuento_aplicado_total = ?, total_pagado = ?, estado = ?
                 WHERE id = ?",
                [
                    $data['cantidad_sesiones'] ?? 1,
                    $data['precio_lista'] ?? 0,
                    $data['descuento_manual_pct'] ?? 0,
                    $data['descuento_aplicado_total'] ?? 0,
                    $data['total_pagado'] ?? 0,
                    $data['estado'] ?? 'pendiente',
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Venta actualizada exitosamente']);
            } else {
                respondWithError('Venta no encontrada', 404);
            }
            break;
    }
}

/**
 * Maneja operaciones de sesiones
 */
function handleSesiones($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $sesion = $db->selectOne(
                    "SELECT s.*, v.cantidad_sesiones, f.nombres, f.apellidos, 
                            t.nombre as tratamiento_nombre, b.nombre as box_nombre,
                            pr.nombre as profesional_nombre, suc.nombre as sucursal_nombre
                     FROM sesion s
                     LEFT JOIN venta v ON s.venta_id = v.id
                     LEFT JOIN ficha f ON v.ficha_id = f.id
                     LEFT JOIN tratamiento t ON v.tratamiento_id = t.id
                     LEFT JOIN box b ON s.box_id = b.id
                     LEFT JOIN profesional pr ON s.profesional_id = pr.id
                     LEFT JOIN sucursal suc ON s.sucursal_id = suc.id
                     WHERE s.id = ?", 
                    [$id]
                );
                
                if (!$sesion) {
                    respondWithError('Sesión no encontrada', 404);
                    return;
                }
                
                respondWithSuccess($sesion);
                
            } else {
                $fecha = $_GET['fecha'] ?? null;
                $ventaId = $_GET['venta_id'] ?? null;
                $estado = $_GET['estado'] ?? null;
                
                $whereClause = '';
                $params = [];
                
                if ($fecha) {
                    $whereClause = "WHERE DATE(s.fecha_planificada) = ?";
                    $params[] = $fecha;
                }
                
                if ($ventaId) {
                    $whereClause = $whereClause ? $whereClause . " AND s.venta_id = ?" : "WHERE s.venta_id = ?";
                    $params[] = $ventaId;
                }
                
                if ($estado) {
                    $whereClause = $whereClause ? $whereClause . " AND s.estado = ?" : "WHERE s.estado = ?";
                    $params[] = $estado;
                }
                
                $sesiones = $db->select(
                    "SELECT s.*, v.cantidad_sesiones, f.nombres, f.apellidos, 
                            t.nombre as tratamiento_nombre, b.nombre as box_nombre,
                            pr.nombre as profesional_nombre, suc.nombre as sucursal_nombre
                     FROM sesion s
                     LEFT JOIN venta v ON s.venta_id = v.id
                     LEFT JOIN ficha f ON v.ficha_id = f.id
                     LEFT JOIN tratamiento t ON v.tratamiento_id = t.id
                     LEFT JOIN box b ON s.box_id = b.id
                     LEFT JOIN profesional pr ON s.profesional_id = pr.id
                     LEFT JOIN sucursal suc ON s.sucursal_id = suc.id
                     $whereClause
                     ORDER BY s.fecha_planificada DESC
                     LIMIT 50",
                    $params
                );
                
                respondWithSuccess($sesiones);
            }
            break;
            
        case 'POST':
            $requiredFields = ['venta_id', 'numero_sesion', 'sucursal_id', 'box_id', 'profesional_id', 'fecha_planificada'];
            validateRequiredFields($data, $requiredFields);
            
            // BR-002: Validar que numero_sesion esté en el rango válido
            $venta = $db->selectOne(
                "SELECT cantidad_sesiones FROM venta WHERE id = ?",
                [$data['venta_id']]
            );
            
            if (!$venta) {
                respondWithError('Venta no encontrada', 404);
                return;
            }
            
            if ($data['numero_sesion'] < 1 || $data['numero_sesion'] > $venta['cantidad_sesiones']) {
                respondWithError("Número de sesión debe estar entre 1 y {$venta['cantidad_sesiones']}", 400);
                return;
            }
            
            // Verificar que no exista ya una sesión con ese número para esa venta
            $sesionExistente = $db->selectOne(
                "SELECT id FROM sesion WHERE venta_id = ? AND numero_sesion = ?",
                [$data['venta_id'], $data['numero_sesion']]
            );
            
            if ($sesionExistente) {
                respondWithError("Ya existe una sesión con el número {$data['numero_sesion']} para esta venta", 400);
                return;
            }
            
            $sesionId = $db->insertReturning(
                "INSERT INTO sesion (venta_id, numero_sesion, sucursal_id, box_id, profesional_id, 
                                   fecha_planificada, estado, paciente_confirmado) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
                [
                    $data['venta_id'],
                    $data['numero_sesion'],
                    $data['sucursal_id'],
                    $data['box_id'],
                    $data['profesional_id'],
                    $data['fecha_planificada'],
                    $data['estado'] ?? 'planificada',
                    $data['paciente_confirmado'] ?? false
                ]
            );
            
            respondWithSuccess(['id' => $sesionId, 'message' => 'Sesión creada exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updateFields = [];
            $params = [];
            
            $fields = ['numero_sesion', 'sucursal_id', 'box_id', 'profesional_id', 'fecha_planificada', 
                      'fecha_ejecucion', 'estado', 'paciente_confirmado', 'abierta_en', 'cerrada_en', 'observaciones'];
            
            foreach ($fields as $field) {
                if (isset($data[$field])) {
                    $updateFields[] = "$field = ?";
                    $params[] = $data[$field];
                }
            }
            
            if (empty($updateFields)) {
                respondWithError('No hay campos para actualizar', 400);
                return;
            }
            
            $params[] = $id;
            
            $updated = $db->update(
                "UPDATE sesion SET " . implode(', ', $updateFields) . " WHERE id = ?",
                $params
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Sesión actualizada exitosamente']);
            } else {
                respondWithError('Sesión no encontrada', 404);
            }
            break;
    }
}

/**
 * Maneja operaciones de ofertas combo
 */
function handleOfertasCombo($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $ofertaCombo = $db->selectOne(
                    "SELECT oc.*, o.nombre as oferta_nombre
                     FROM oferta_combo oc
                     LEFT JOIN oferta o ON oc.oferta_id = o.id
                     WHERE oc.id = ?", 
                    [$id]
                );
                
                if (!$ofertaCombo) {
                    respondWithError('Oferta combo no encontrada', 404);
                    return;
                }
                
                // Obtener packs del combo
                $packs = $db->select(
                    "SELECT ocp.*, p.nombre as pack_nombre, t.nombre as tratamiento_nombre
                     FROM oferta_combo_pack ocp
                     LEFT JOIN pack p ON ocp.pack_id = p.id
                     LEFT JOIN tratamiento t ON p.tratamiento_id = t.id
                     WHERE ocp.oferta_combo_id = ?",
                    [$id]
                );
                
                $ofertaCombo['packs'] = $packs;
                respondWithSuccess($ofertaCombo);
                
            } else {
                $ofertaId = $_GET['oferta_id'] ?? null;
                
                if ($ofertaId) {
                    $ofertasCombo = $db->select(
                        "SELECT oc.*, o.nombre as oferta_nombre
                         FROM oferta_combo oc
                         LEFT JOIN oferta o ON oc.oferta_id = o.id
                         WHERE oc.oferta_id = ?
                         ORDER BY oc.min_packs",
                        [$ofertaId]
                    );
                } else {
                    $ofertasCombo = $db->select(
                        "SELECT oc.*, o.nombre as oferta_nombre
                         FROM oferta_combo oc
                         LEFT JOIN oferta o ON oc.oferta_id = o.id
                         ORDER BY o.nombre, oc.min_packs"
                    );
                }
                
                respondWithSuccess($ofertasCombo);
            }
            break;
            
        case 'POST':
            $requiredFields = ['oferta_id', 'min_packs'];
            validateRequiredFields($data, $requiredFields);
            
            $ofertaComboId = $db->insertReturning(
                "INSERT INTO oferta_combo (oferta_id, min_packs) 
                 VALUES (?, ?) RETURNING id",
                [
                    $data['oferta_id'],
                    $data['min_packs']
                ]
            );
            
            // Agregar packs al combo si se proporcionan
            if (isset($data['packs']) && is_array($data['packs'])) {
                foreach ($data['packs'] as $pack) {
                    $db->insert(
                        "INSERT INTO oferta_combo_pack (oferta_combo_id, pack_id) VALUES (?, ?)",
                        [$ofertaComboId, $pack['pack_id']]
                    );
                }
            }
            
            respondWithSuccess(['id' => $ofertaComboId, 'message' => 'Oferta combo creada exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE oferta_combo SET 
                 min_packs = ?
                 WHERE id = ?",
                [
                    $data['min_packs'] ?? 2,
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Oferta combo actualizada exitosamente']);
            } else {
                respondWithError('Oferta combo no encontrada', 404);
            }
            break;
    }
}

/**
 * Maneja operaciones de ofertas
 */
function handleOfertas($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $oferta = $db->selectOne(
                    "SELECT * FROM oferta WHERE id = ?", 
                    [$id]
                );
                
                if (!$oferta) {
                    respondWithError('Oferta no encontrada', 404);
                    return;
                }
                
                // Obtener packs relacionados
                $packs = $db->select(
                    "SELECT op.*, p.nombre as pack_nombre, t.nombre as tratamiento_nombre
                     FROM oferta_pack op
                     LEFT JOIN pack p ON op.pack_id = p.id
                     LEFT JOIN tratamiento t ON p.tratamiento_id = t.id
                     WHERE op.oferta_id = ?",
                    [$id]
                );
                
                $oferta['packs'] = $packs;
                respondWithSuccess($oferta);
                
            } else {
                $activas = $_GET['activas'] ?? false;
                
                if ($activas) {
                    $ofertas = $db->select(
                        "SELECT * FROM oferta 
                         WHERE activo = true 
                         AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE)
                         AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
                         ORDER BY prioridad, nombre"
                    );
                } else {
                    $ofertas = $db->select(
                        "SELECT * FROM oferta ORDER BY prioridad, nombre"
                    );
                }
                
                respondWithSuccess($ofertas);
            }
            break;
            
        case 'POST':
            $requiredFields = ['nombre', 'tipo'];
            validateRequiredFields($data, $requiredFields);
            
            $ofertaId = $db->insertReturning(
                "INSERT INTO oferta (nombre, tipo, porc_descuento, fecha_inicio, fecha_fin, combinable, activo, prioridad) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
                [
                    $data['nombre'],
                    $data['tipo'],
                    $data['porc_descuento'] ?? 0,
                    $data['fecha_inicio'] ?? null,
                    $data['fecha_fin'] ?? null,
                    $data['combinable'] ?? true,
                    $data['activo'] ?? true,
                    $data['prioridad'] ?? 0
                ]
            );
            
            // Agregar packs si se proporcionan
            if (isset($data['packs']) && is_array($data['packs'])) {
                foreach ($data['packs'] as $pack) {
                    $db->insert(
                        "INSERT INTO oferta_pack (oferta_id, pack_id, porc_descuento) VALUES (?, ?, ?)",
                        [$ofertaId, $pack['pack_id'], $pack['porc_descuento'] ?? 0]
                    );
                }
            }
            
            respondWithSuccess(['id' => $ofertaId, 'message' => 'Oferta creada exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE oferta SET 
                 nombre = ?, tipo = ?, porc_descuento = ?, fecha_inicio = ?, 
                 fecha_fin = ?, combinable = ?, activo = ?, prioridad = ?
                 WHERE id = ?",
                [
                    $data['nombre'] ?? '',
                    $data['tipo'] ?? '',
                    $data['porc_descuento'] ?? 0,
                    $data['fecha_inicio'] ?? null,
                    $data['fecha_fin'] ?? null,
                    $data['combinable'] ?? true,
                    $data['activo'] ?? true,
                    $data['prioridad'] ?? 0,
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Oferta actualizada exitosamente']);
            } else {
                respondWithError('Oferta no encontrada', 404);
            }
            break;
    }
}

/**
 * Maneja operaciones de sucursales
 */
function handleSucursales($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $sucursal = $db->selectOne(
                    "SELECT * FROM sucursal WHERE id = ?", 
                    [$id]
                );
                
                if (!$sucursal) {
                    respondWithError('Sucursal no encontrada', 404);
                    return;
                }
                
                // Obtener boxes de la sucursal
                $boxes = $db->select(
                    "SELECT * FROM box WHERE sucursal_id = ? AND activo = true",
                    [$id]
                );
                
                $sucursal['boxes'] = $boxes;
                respondWithSuccess($sucursal);
                
            } else {
                $sucursales = $db->select(
                    "SELECT * FROM sucursal WHERE activo = true ORDER BY nombre"
                );
                respondWithSuccess($sucursales);
            }
            break;
            
        case 'POST':
            $requiredFields = ['nombre'];
            validateRequiredFields($data, $requiredFields);
            
            $sucursalId = $db->insertReturning(
                "INSERT INTO sucursal (nombre, direccion, telefono, activo) 
                 VALUES (?, ?, ?, ?) RETURNING id",
                [
                    $data['nombre'],
                    $data['direccion'] ?? null,
                    $data['telefono'] ?? null,
                    $data['activo'] ?? true
                ]
            );
            
            respondWithSuccess(['id' => $sucursalId, 'message' => 'Sucursal creada exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE sucursal SET 
                 nombre = ?, direccion = ?, telefono = ?, activo = ?
                 WHERE id = ?",
                [
                    $data['nombre'] ?? '',
                    $data['direccion'] ?? null,
                    $data['telefono'] ?? null,
                    $data['activo'] ?? true,
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Sucursal actualizada exitosamente']);
            } else {
                respondWithError('Sucursal no encontrada', 404);
            }
            break;
    }
}

/**
 * Maneja operaciones de boxes
 */
function handleBoxes($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $box = $db->selectOne(
                    "SELECT b.*, s.nombre as sucursal_nombre 
                     FROM box b 
                     LEFT JOIN sucursal s ON b.sucursal_id = s.id 
                     WHERE b.id = ?", 
                    [$id]
                );
                
                if (!$box) {
                    respondWithError('Box no encontrado', 404);
                    return;
                }
                
                respondWithSuccess($box);
                
            } else {
                $sucursalId = $_GET['sucursal_id'] ?? null;
                
                if ($sucursalId) {
                    $boxes = $db->select(
                        "SELECT b.*, s.nombre as sucursal_nombre 
                         FROM box b 
                         LEFT JOIN sucursal s ON b.sucursal_id = s.id 
                         WHERE b.sucursal_id = ? AND b.activo = true 
                         ORDER BY b.nombre",
                        [$sucursalId]
                    );
                } else {
                    $boxes = $db->select(
                        "SELECT b.*, s.nombre as sucursal_nombre 
                         FROM box b 
                         LEFT JOIN sucursal s ON b.sucursal_id = s.id 
                         WHERE b.activo = true 
                         ORDER BY s.nombre, b.nombre"
                    );
                }
                
                respondWithSuccess($boxes);
            }
            break;
            
        case 'POST':
            $requiredFields = ['nombre', 'sucursal_id'];
            validateRequiredFields($data, $requiredFields);
            
            $boxId = $db->insertReturning(
                "INSERT INTO box (sucursal_id, nombre, activo) 
                 VALUES (?, ?, ?) RETURNING id",
                [
                    $data['sucursal_id'],
                    $data['nombre'],
                    $data['activo'] ?? true
                ]
            );
            
            respondWithSuccess(['id' => $boxId, 'message' => 'Box creado exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE box SET 
                 nombre = ?, activo = ?
                 WHERE id = ?",
                [
                    $data['nombre'] ?? '',
                    $data['activo'] ?? true,
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Box actualizado exitosamente']);
            } else {
                respondWithError('Box no encontrado', 404);
            }
            break;
    }
}

/**
 * Maneja operaciones de tipos de ficha específica
 */
function handleTiposFichaEspecifica($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $tipo = $db->selectOne(
                    "SELECT * FROM tipo_ficha_especifica WHERE id = ?", 
                    [$id]
                );
                
                if (!$tipo) {
                    respondWithError('Tipo de ficha específica no encontrado', 404);
                    return;
                }
                
                respondWithSuccess($tipo);
                
            } else {
                $tipos = $db->select(
                    "SELECT * FROM tipo_ficha_especifica ORDER BY nombre"
                );
                respondWithSuccess($tipos);
            }
            break;
            
        case 'POST':
            $requiredFields = ['nombre'];
            validateRequiredFields($data, $requiredFields);
            
            $tipoId = $db->insertReturning(
                "INSERT INTO tipo_ficha_especifica (nombre, descripcion) 
                 VALUES (?, ?) RETURNING id",
                [
                    $data['nombre'],
                    $data['descripcion'] ?? null
                ]
            );
            
            respondWithSuccess(['id' => $tipoId, 'message' => 'Tipo de ficha específica creado exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE tipo_ficha_especifica SET 
                 nombre = ?, descripcion = ?
                 WHERE id = ?",
                [
                    $data['nombre'] ?? '',
                    $data['descripcion'] ?? null,
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Tipo de ficha específica actualizado exitosamente']);
            } else {
                respondWithError('Tipo de ficha específica no encontrado', 404);
            }
            break;
    }
}

/**
 * Maneja operaciones de fichas específicas
 */
function handleFichasEspecificas($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $fichaEspecifica = $db->selectOne(
                    "SELECT fe.*, tf.nombre as tipo_nombre, t.nombre as tratamiento_nombre, p.nombre as pack_nombre
                     FROM ficha_especifica fe
                     LEFT JOIN tipo_ficha_especifica tf ON fe.tipo_id = tf.id
                     LEFT JOIN tratamiento t ON fe.tratamiento_id = t.id
                     LEFT JOIN pack p ON fe.pack_id = p.id
                     WHERE fe.id = ?", 
                    [$id]
                );
                
                if (!$fichaEspecifica) {
                    respondWithError('Ficha específica no encontrada', 404);
                    return;
                }
                
                respondWithSuccess($fichaEspecifica);
                
            } else {
                $fichaId = $_GET['ficha_id'] ?? null;
                $tipoId = $_GET['tipo_id'] ?? null;
                
                $whereClause = '';
                $params = [];
                
                if ($fichaId) {
                    $whereClause = "WHERE fe.ficha_id = ?";
                    $params[] = $fichaId;
                }
                
                if ($tipoId) {
                    $whereClause = $whereClause ? $whereClause . " AND fe.tipo_id = ?" : "WHERE fe.tipo_id = ?";
                    $params[] = $tipoId;
                }
                
                $fichasEspecificas = $db->select(
                    "SELECT fe.*, tf.nombre as tipo_nombre, t.nombre as tratamiento_nombre, p.nombre as pack_nombre
                     FROM ficha_especifica fe
                     LEFT JOIN tipo_ficha_especifica tf ON fe.tipo_id = tf.id
                     LEFT JOIN tratamiento t ON fe.tratamiento_id = t.id
                     LEFT JOIN pack p ON fe.pack_id = p.id
                     $whereClause
                     ORDER BY fe.fecha_creacion DESC",
                    $params
                );
                
                respondWithSuccess($fichasEspecificas);
            }
            break;
            
        case 'POST':
            $requiredFields = ['ficha_id', 'tipo_id'];
            validateRequiredFields($data, $requiredFields);
            
            $fichaEspecificaId = $db->insertReturning(
                "INSERT INTO ficha_especifica (ficha_id, tipo_id, datos, fecha_creacion) 
                 VALUES (?, ?, ?, NOW()) RETURNING id",
                [
                    $data['ficha_id'],
                    $data['tipo_id'],
                    $data['datos'] ?? '{}'
                ]
            );
            
            respondWithSuccess(['id' => $fichaEspecificaId, 'message' => 'Ficha específica creada exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE ficha_especifica SET 
                 datos = ?
                 WHERE id = ?",
                [
                    $data['datos'] ?? '{}',
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Ficha específica actualizada exitosamente']);
            } else {
                respondWithError('Ficha específica no encontrada', 404);
            }
            break;
    }
}

/**
 * Maneja operaciones de reportes
 */
function handleReportes($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            $tipo = $_GET['tipo'] ?? '';
            
            switch ($tipo) {
                case 'progreso-ventas':
                    // REP-001: Progreso de ventas (realizadas vs pendientes)
                    $ventaId = $_GET['venta_id'] ?? null;
                    
                    if ($ventaId) {
                        $progreso = $db->executeRaw(
                            "SELECT * FROM v_venta_progreso WHERE venta_id = ?",
                            [$ventaId]
                        );
                    } else {
                        $progreso = $db->executeRaw(
                            "SELECT * FROM v_venta_progreso ORDER BY venta_id"
                        );
                    }
                    
                    respondWithSuccess($progreso);
                    break;
                    
                case 'plan-vs-ejecucion':
                    // REP-002: Planificación vs ejecución con desfase
                    $fechaDesde = $_GET['fecha_desde'] ?? null;
                    $fechaHasta = $_GET['fecha_hasta'] ?? null;
                    
                    $whereClause = '';
                    $params = [];
                    
                    if ($fechaDesde && $fechaHasta) {
                        $whereClause = "WHERE s.fecha_planificada BETWEEN ? AND ?";
                        $params = [$fechaDesde, $fechaHasta];
                    }
                    
                    $planVsEjecucion = $db->executeRaw(
                        "SELECT * FROM v_plan_vs_ejecucion $whereClause ORDER BY sesion_id",
                        $params
                    );
                    
                    respondWithSuccess($planVsEjecucion);
                    break;
                    
                case 'disponibilidad-profesionales':
                    // PRO-002: Disponibilidad por profesional/sucursal/box
                    $profesionalId = $_GET['profesional_id'] ?? null;
                    $sucursalId = $_GET['sucursal_id'] ?? null;
                    $boxId = $_GET['box_id'] ?? null;
                    $fecha = $_GET['fecha'] ?? date('Y-m-d');
                    
                    $whereConditions = ["DATE(s.fecha_planificada) = ?"];
                    $params = [$fecha];
                    
                    if ($profesionalId) {
                        $whereConditions[] = "s.profesional_id = ?";
                        $params[] = $profesionalId;
                    }
                    
                    if ($sucursalId) {
                        $whereConditions[] = "s.sucursal_id = ?";
                        $params[] = $sucursalId;
                    }
                    
                    if ($boxId) {
                        $whereConditions[] = "s.box_id = ?";
                        $params[] = $boxId;
                    }
                    
                    $whereClause = "WHERE " . implode(" AND ", $whereConditions);
                    
                    $disponibilidad = $db->select(
                        "SELECT s.*, p.nombre as profesional_nombre, suc.nombre as sucursal_nombre, b.nombre as box_nombre
                         FROM sesion s
                         LEFT JOIN profesional p ON s.profesional_id = p.id
                         LEFT JOIN sucursal suc ON s.sucursal_id = suc.id
                         LEFT JOIN box b ON s.box_id = b.id
                         $whereClause
                         ORDER BY s.fecha_planificada",
                        $params
                    );
                    
                    respondWithSuccess($disponibilidad);
                    break;
                    
                case 'ofertas-aplicadas':
                    // OFE-004: Ofertas aplicadas a una venta en orden
                    $ventaId = $_GET['venta_id'] ?? null;
                    
                    if (!$ventaId) {
                        respondWithError('ID de venta requerido para reporte de ofertas', 400);
                        return;
                    }
                    
                    $ofertasAplicadas = $db->select(
                        "SELECT vo.*, o.nombre as oferta_nombre, o.tipo as oferta_tipo
                         FROM venta_oferta vo
                         LEFT JOIN oferta o ON vo.oferta_id = o.id
                         WHERE vo.venta_id = ?
                         ORDER BY vo.secuencia",
                        [$ventaId]
                    );
                    
                    respondWithSuccess($ofertasAplicadas);
                    break;
                    
                default:
                    respondWithError('Tipo de reporte no válido', 400);
            }
            break;
            
        default:
            respondWithError('Método no permitido para reportes', 405);
    }
}

/**
 * Maneja operaciones de profesionales
 */
function handleProfesionales($db, $method, $id, $data) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $profesional = $db->selectOne(
                    "SELECT * FROM profesional WHERE id = ?", 
                    [$id]
                );
                
                if (!$profesional) {
                    respondWithError('Profesional no encontrado', 404);
                    return;
                }
                
                respondWithSuccess($profesional);
                
            } else {
                $profesionales = $db->select(
                    "SELECT * FROM profesional WHERE activo = true ORDER BY nombre"
                );
                respondWithSuccess($profesionales);
            }
            break;
            
        case 'POST':
            $requiredFields = ['nombre', 'tipo_profesional'];
            validateRequiredFields($data, $requiredFields);
            
            $profesionalId = $db->insertReturning(
                "INSERT INTO profesional (nombre, tipo_profesional, bio, foto_url, activo) 
                 VALUES (?, ?, ?, ?, ?) RETURNING id",
                [
                    $data['nombre'],
                    $data['tipo_profesional'],
                    $data['bio'] ?? null,
                    $data['foto_url'] ?? null,
                    $data['activo'] ?? true
                ]
            );
            
            respondWithSuccess(['id' => $profesionalId, 'message' => 'Profesional creado exitosamente']);
            break;
            
        case 'PUT':
            if (!$id) {
                respondWithError('ID requerido para actualizar', 400);
                return;
            }
            
            $updated = $db->update(
                "UPDATE profesional SET 
                 nombre = ?, tipo_profesional = ?, bio = ?, foto_url = ?, activo = ?
                 WHERE id = ?",
                [
                    $data['nombre'] ?? '',
                    $data['tipo_profesional'] ?? '',
                    $data['bio'] ?? null,
                    $data['foto_url'] ?? null,
                    $data['activo'] ?? true,
                    $id
                ]
            );
            
            if ($updated > 0) {
                respondWithSuccess(['message' => 'Profesional actualizado exitosamente']);
            } else {
                respondWithError('Profesional no encontrado', 404);
            }
            break;
    }
}

/**
 * Maneja estadísticas
 */
function handleStats($db, $method) {
    if ($method !== 'GET') {
        respondWithError('Método no permitido', 405);
        return;
    }
    
    try {
        $stats = $db->getStats();
        respondWithSuccess($stats);
    } catch (Exception $e) {
        respondWithError('Error obteniendo estadísticas: ' . $e->getMessage());
    }
}

/**
 * Maneja health check
 */
function handleHealth($db) {
    try {
        $health = $db->healthCheck();
        respondWithSuccess($health);
    } catch (Exception $e) {
        respondWithError('Error en health check: ' . $e->getMessage());
    }
}

/**
 * Maneja backup
 */
function handleBackup($db, $method) {
    if ($method !== 'POST') {
        respondWithError('Método no permitido', 405);
        return;
    }
    
    try {
        $success = $db->backup();
        if ($success) {
            respondWithSuccess(['message' => 'Backup creado exitosamente']);
        } else {
            respondWithError('Error creando backup');
        }
    } catch (Exception $e) {
        respondWithError('Error creando backup: ' . $e->getMessage());
    }
}

/**
 * Valida campos requeridos
 */
function validateRequiredFields($data, $requiredFields) {
    $missing = [];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $missing[] = $field;
        }
    }
    
    if (!empty($missing)) {
        respondWithError('Campos requeridos faltantes: ' . implode(', ', $missing), 400);
    }
}

/**
 * Responde con éxito
 */
function respondWithSuccess($data, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => true,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Responde con error
 */
function respondWithError($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message
    ], JSON_UNESCAPED_UNICODE);
}

?>

