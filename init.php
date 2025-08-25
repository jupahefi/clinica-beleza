<?php
/**
 * Archivo de inicialización común para Clínica Beleza
 * Centraliza la configuración de sesiones, variables de entorno y validaciones
 */

// Configurar cookies de sesión seguras
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Strict');

session_start();

// Cargar variables de entorno
function loadEnvironmentVariables() {
    $env_file = __DIR__ . '/.env';
    if (file_exists($env_file)) {
        $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value, '"\'');
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
}

loadEnvironmentVariables();

// Verificar si el usuario está logueado
function isUserLoggedIn() {
    return isset($_SESSION['user_id']) && isset($_SESSION['auth_token']);
}

// Verificar que el token de sesión sea válido
function isSessionTokenValid() {
    if (!isUserLoggedIn()) {
        return false;
    }
    
    $expected_token = hash('sha256', $_SESSION['user_id'] . 'clinica-beleza-session-secret-2025' . $_SESSION['login_time']);
    return $_SESSION['auth_token'] === $expected_token;
}

// Verificar que la sesión no haya expirado (24 horas)
function isSessionExpired() {
    if (!isUserLoggedIn()) {
        return true;
    }
    
    $session_timeout = 24 * 60 * 60; // 24 horas en segundos
    return (time() - $_SESSION['login_time']) > $session_timeout;
}

// Validar sesión completa
function validateSession() {
    if (!isUserLoggedIn()) {
        return false;
    }
    
    if (!isSessionTokenValid()) {
        session_destroy();
        return false;
    }
    
    if (isSessionExpired()) {
        session_destroy();
        return false;
    }
    
    return true;
}

// Requerir autenticación (para páginas protegidas)
function requireAuth() {
    if (!validateSession()) {
        header('Location: /login.php');
        exit();
    }
}

// Requerir que NO esté autenticado (para login)
function requireGuest() {
    if (validateSession()) {
        header('Location: /index.php');
        exit();
    }
}

// Obtener datos del usuario actual
function getCurrentUserData() {
    return $_SESSION['user_data'] ?? [];
}

// Obtener ID del usuario actual
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

// Obtener rol del usuario actual
function getCurrentUserRole() {
    $userData = getCurrentUserData();
    return $userData['rol'] ?? null;
}

// Verificar si el usuario es administrador
function isAdmin() {
    return getCurrentUserRole() === 'admin';
}

// Verificar si el usuario es profesional
function isProfessional() {
    return getCurrentUserRole() === 'profesional';
}

// Obtener configuración de base de datos
function getDatabaseConfig() {
    return [
        'host' => getenv('DB_HOST') ?: 'localhost',
        'name' => getenv('DB_NAME') ?: 'clinica_beleza',
        'user' => getenv('DB_USER') ?: 'root',
        'pass' => getenv('DB_PASS') ?: ''
    ];
}

// Crear conexión PDO
function createDatabaseConnection() {
    $config = getDatabaseConfig();
    
    return new PDO(
        "mysql:host={$config['host']};dbname={$config['name']};charset=utf8mb4",
        $config['user'],
        $config['pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
}

// Obtener URL permitida para API
function getAllowedOrigin() {
    return getenv('API_URL');
}

// Validar origen para API
function validateOrigin($origin, $referer) {
    $allowed_origin = getAllowedOrigin();
    
    if (!$allowed_origin) {
        return false;
    }
    
    $origin_host = parse_url($origin, PHP_URL_HOST);
    $referer_host = parse_url($referer, PHP_URL_HOST);
    $allowed_host = parse_url($allowed_origin, PHP_URL_HOST);
    
    // Validar origen
    if ($origin && $origin_host === $allowed_host) {
        return true;
    }
    
    // Validar referer
    if ($referer && $referer_host === $allowed_host) {
        $referer_path = parse_url($referer, PHP_URL_PATH);
        $valid_referers = ['/login.html', '/index.html', '/'];
        return in_array($referer_path, $valid_referers);
    }
    
    return false;
}

// Configurar headers de seguridad para API
function setSecurityHeaders() {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

// Función para detectar SQL Injection
function detectSQLInjection($data) {
    $sql_patterns = [
        '/\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script)\b/i',
        '/[\'";]/',
        '/--/',
        '/\/\*.*\*\//',
        '/xp_cmdshell/i',
        '/sp_/i'
    ];
    
    if (is_array($data)) {
        foreach ($data as $value) {
            if (detectSQLInjection($value)) {
                return true;
            }
        }
    } else {
        $string_data = (string)$data;
        foreach ($sql_patterns as $pattern) {
            if (preg_match($pattern, $string_data)) {
                return true;
            }
        }
    }
    
    return false;
}

// Función para verificar sesión en API
function verificarSesion($db, $endpoint) {
    // Endpoints que no requieren autenticación
    $public_endpoints = ['auth', 'tokens', 'health', 'config'];
    
    if (in_array($endpoint, $public_endpoints)) {
        return true;
    }
    
    // Verificar sesión para endpoints protegidos
    if (!validateSession()) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Sesión no válida - Debe iniciar sesión',
            'code' => 'SESSION_INVALID'
        ]);
        return false;
    }
    
    return true;
}

// Función para registrar actividad
function logActivity($action, $details = null) {
    if (!getCurrentUserId()) {
        return;
    }
    
    try {
        $pdo = createDatabaseConnection();
        $stmt = $pdo->prepare("CALL sp_registrar_actividad(?, ?, ?)");
        $stmt->execute([getCurrentUserId(), $action, $details]);
        $stmt->closeCursor();
    } catch (Exception $e) {
        error_log("Error registrando actividad: " . $e->getMessage());
    }
}

// Función para generar token de sesión
function generateSessionToken($user_id, $login_time) {
    return hash('sha256', $user_id . 'clinica-beleza-session-secret-2025' . $login_time);
}

// Función para crear sesión de usuario
function createUserSession($user_data) {
    $login_time = time();
    $session_token = generateSessionToken($user_data['id'], $login_time);
    
    $_SESSION['user_id'] = $user_data['id'];
    $_SESSION['auth_token'] = $session_token;
    $_SESSION['login_time'] = $login_time;
    $_SESSION['user_data'] = $user_data;
}

// Función para destruir sesión
function destroySession() {
    session_destroy();
    session_start();
    session_regenerate_id(true);
}
?>
