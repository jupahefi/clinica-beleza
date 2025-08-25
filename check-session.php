<?php
// Configurar cookies de sesión seguras
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Strict');

session_start();

// Verificar si hay sesión activa
if (!isset($_SESSION['user_id']) || !isset($_SESSION['auth_token'])) {
    // No hay sesión, redirigir al login
    header('Location: /login.php');
    exit();
}

// Verificar que el token de sesión sea válido
$expected_token = hash('sha256', $_SESSION['user_id'] . 'clinica-beleza-session-secret-2025' . $_SESSION['login_time']);

if ($_SESSION['auth_token'] !== $expected_token) {
    // Token inválido, destruir sesión y redirigir al login
    session_destroy();
    header('Location: /login.php');
    exit();
}

// Sesión válida, permitir acceso a index.html
header('Location: /index.html');
exit();
?>
