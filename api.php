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

// =============================================================================
// FUNCIÓN DE DETECCIÓN DE SQL INJECTION (PARANOIA EXTREMA)
// =============================================================================

function detectSQLInjection($data) {
    $suspiciousPatterns = [
        '/\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/i',
        '/--|\/\*|\*\//',
        '/\b(and|or)\s+\d+\s*=\s*\d+/i',
        '/[\'"]\s*(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/i',
        '/\b(xp_cmdshell|sp_executesql|waitfor|delay)\b/i',
        '/\b(admin|root|system)\b/i',
        '/[<>{}[\]`~!@#$%^&*()+=|\\]/',
        '/0x[0-9a-fA-F]+/',
        '/char\s*\(\s*\d+\s*\)/i',
        '/concat\s*\(/i'
    ];

    // Función recursiva para revisar arrays
    $checkValue = function($value) use (&$checkValue, $suspiciousPatterns) {
        if (is_array($value)) {
            foreach ($value as $v) {
                if ($checkValue($v)) return true;
            }
            return false;
        }
        if (is_string($value)) {
            foreach ($suspiciousPatterns as $pattern) {
                if (preg_match($pattern, $value)) {
                    error_log("🚨 SQL INJECTION DETECTED: Pattern '$pattern' found in: " . substr($value, 0, 100));
                    return true;
                }
            }
        }
        return false;
    };

    return $checkValue($data);
}

try {
    $db = Database::getInstance();

    // Parsear la URL para obtener el endpoint y parámetros
    $request = $_SERVER['REQUEST_URI'];
    $path = parse_url($request, PHP_URL_PATH);
    $pathSegments = explode('/', trim($path, '/'));

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

    // =============================================================================
    // DETECCIÓN DE SQL INJECTION EN TODOS LOS DATOS RECIBIDOS
    // =============================================================================

    if ($data && detectSQLInjection($data)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Datos sospechosos detectados',
            'security' => 'SQL injection attempt blocked',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit();
    }

    if ($_GET && detectSQLInjection($_GET)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Parámetros sospechosos detectados',
            'security' => 'SQL injection attempt blocked',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit();
    }

    if ($id && detectSQLInjection([$id])) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'ID sospechoso detectado',
            'security' => 'SQL injection attempt blocked',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit();
    }

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
        case 'evaluaciones':
            handleEvaluaciones($db, $method, $id, $data);
            break;
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
        case 'sesiones':
            handleSesiones($db, $method, $id, $data);
            break;
        case 'agenda':
            handleAgenda($db, $method, $id, $data);
            break;
        case 'ofertas':
            handleOfertas($db, $method, $id, $data);
            break;
        case 'ofertas-combo':
            handleOfertasCombo($db, $method, $id, $data);
            break;
        case 'ofertas-aplicables':
            handleOfertasAplicables($db, $method, $id, $data);
            break;
        case 'tratamientos':
            handleTratamientos($db, $method, $id, $data);
            break;
        case 'zonas':
            handleZonas($db, $method, $id, $data);
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
        case 'reportes':
            handleReportes($db, $method, $id, $data);
            break;
        default:
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Endpoint no encontrado',
                'timestamp' => date('Y-m-d H:i:s'),
                'endpoint' => $endpoint ?? 'unknown',
                'method' => $method ?? 'unknown'
            ]);
            break;
    }

} catch (Exception $e) {
    // Propagar el error tal cual lo entrega la DB, pero con formato consistente
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'error_code' => $e->getCode(),
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
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'health',
            'method' => 'GET'
        ]);
    }
}

function handleFichas($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_fichas_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_fichas_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_fichas_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_fichas_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_fichas_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'fichas',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'fichas',
            'method' => $method
        ]);
    }
}

function handleTiposFichaEspecifica($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                $result = $db->select("CALL sp_tipos_ficha_especifica_list()");
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'tipos-ficha-especifica',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'tipos-ficha-especifica',
            'method' => $method
        ]);
    }
}

function handleFichasEspecificas($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_fichas_especificas_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_fichas_especificas_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_fichas_especificas_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_fichas_especificas_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_fichas_especificas_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'fichas-especificas',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'fichas-especificas',
            'method' => $method
        ]);
    }
}

function handleConsentimientoFirma($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_consentimiento_firma_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_consentimiento_firma_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_consentimiento_firma_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_consentimiento_firma_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_consentimiento_firma_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'consentimiento-firma',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'consentimiento-firma',
            'method' => $method
        ]);
    }
}

function handleEvaluaciones($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_evaluaciones_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_evaluaciones_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_evaluaciones_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_evaluaciones_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_evaluaciones_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'evaluaciones',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'evaluaciones',
            'method' => $method
        ]);
    }
}

function handleVentas($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_ventas_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_ventas_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                // Validar que se incluya género en la venta
                if (!isset($data['genero']) || !isset($data['genero_indicado_por'])) {
                    throw new Exception('Género y profesional que lo indicó son obligatorios para crear una venta');
                }
                $result = $db->selectOne("CALL sp_ventas_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_ventas_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_ventas_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'ventas',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'ventas',
            'method' => $method
        ]);
    }
}

function handleHistorialVentas($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                $result = $db->select("CALL sp_ventas_historial_list()");
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'ventas/historial',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'ventas/historial',
            'method' => $method
        ]);
    }
}

function handleAuth($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'POST':
                $result = $db->selectOne("CALL sp_auth_login(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'auth',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'auth',
            'method' => $method
        ]);
    }
}

function handlePagos($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_pagos_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_pagos_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_pagos_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_pagos_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_pagos_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'pagos',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'pagos',
            'method' => $method
        ]);
    }
}

function handleSesiones($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_sesiones_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_sesiones_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_sesiones_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_sesiones_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_sesiones_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'sesiones',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'sesiones',
            'method' => $method
        ]);
    }
}

function handleAgenda($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_agenda_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_agenda_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_agenda_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_agenda_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_agenda_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'agenda',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'agenda',
            'method' => $method
        ]);
    }
}

function handleOfertas($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_ofertas_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_ofertas_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_ofertas_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_ofertas_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_ofertas_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'ofertas',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'ofertas',
            'method' => $method
        ]);
    }
}

function handleOfertasCombo($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                $result = $db->select("CALL sp_ofertas_combo_list()");
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'ofertas-combo',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'ofertas-combo',
            'method' => $method
        ]);
    }
}

function handleOfertasAplicables($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                $result = $db->select("CALL sp_ofertas_aplicables_list()");
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'ofertas-aplicables',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'ofertas-aplicables',
            'method' => $method
        ]);
    }
}

function handleTratamientos($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_tratamientos_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_tratamientos_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_tratamientos_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_tratamientos_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_tratamientos_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'tratamientos',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'tratamientos',
            'method' => $method
        ]);
    }
}

function handleZonas($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                $result = $db->select("CALL sp_zonas_list()");
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'zonas',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'zonas',
            'method' => $method
        ]);
    }
}

function handlePacks($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_packs_get(?)", [$id]);
                } else {
                    // Verificar si hay parámetros de consulta para filtrar por tratamiento
                    $tratamiento_id = $_GET['tratamiento_id'] ?? null;
                    $genero = $_GET['genero'] ?? 'U';
                    if ($tratamiento_id) {
                        $result = $db->select("CALL sp_packs_by_tratamiento(?, ?)", [$tratamiento_id, $genero]);
                    } else {
                        $result = $db->select("CALL sp_packs_list()");
                    }
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_packs_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_packs_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_packs_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'packs',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'packs',
            'method' => $method
        ]);
    }
}

function handleSucursales($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_sucursales_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_sucursales_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_sucursales_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_sucursales_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_sucursales_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'sucursales',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'sucursales',
            'method' => $method
        ]);
    }
}

function handleBoxes($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                $result = $db->select("CALL sp_boxes_list()");
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'boxes',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'boxes',
            'method' => $method
        ]);
    }
}

function handleProfesionales($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $result = $db->selectOne("CALL sp_profesionales_get(?)", [$id]);
                } else {
                    $result = $db->select("CALL sp_profesionales_list()");
                }
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'POST':
                $result = $db->selectOne("CALL sp_profesionales_create(?)", [json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'PUT':
                $result = $db->selectOne("CALL sp_profesionales_update(?, ?)", [$id, json_encode($data)]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            case 'DELETE':
                $result = $db->selectOne("CALL sp_profesionales_delete(?)", [$id]);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'profesionales',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'profesionales',
            'method' => $method
        ]);
    }
}

function handleReportes($db, $method, $id, $data) {
    try {
        switch ($method) {
            case 'GET':
                $result = $db->select("CALL sp_reportes_list()");
                echo json_encode(['success' => true, 'data' => $result]);
                break;
            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'error' => 'Método no permitido',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'endpoint' => 'reportes',
                    'method' => $method
                ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode(),
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'reportes',
            'method' => $method
        ]);
    }
}

?>