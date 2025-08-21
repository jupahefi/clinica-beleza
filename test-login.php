<?php
/**
 * Test Login - Sistema de Autenticación
 * Verifica que el endpoint de login funcione correctamente
 */

// Configuración
$baseUrl = 'https://clinica-beleza.equalitech.xyz/api.php';

echo "🧪 TEST LOGIN - SISTEMA DE AUTENTICACIÓN ===================================\n\n";

// Función helper para hacer requests
function makeRequest($url, $method = 'GET', $data = null) {
    $context = stream_context_create([
        'http' => [
            'method' => $method,
            'header' => 'Content-Type: application/json',
            'content' => $data ? json_encode($data) : null,
            'timeout' => 30
        ]
    ]);
    
    $response = file_get_contents($url, false, $context);
    $httpCode = $http_response_header[0] ?? 'Unknown';
    
    return [
        'http_code' => $httpCode,
        'response' => $response,
        'data' => json_decode($response, true)
    ];
}

// Test 1: Login con credenciales válidas (Juan Herrera)
echo "📋 Test 1: Login con credenciales válidas (Admin)\n";
$loginData = [
    'username' => 'juan.herrera',
    'password' => '141214'
];

$result = makeRequest($baseUrl . '/auth', 'POST', $loginData);
echo "📤 POST: {$baseUrl}/auth\n";
echo "📋 Datos enviados:\n";
foreach ($loginData as $key => $value) {
    echo "   - {$key}: {$value}\n";
}
echo "📥 HTTP Code: {$result['http_code']}\n";

if ($result['data']['success']) {
    $token = $result['data']['data']['token'];
    $user = $result['data']['data']['usuario'];
    echo "✅ Éxito: Login exitoso\n";
    echo "   - Token: " . substr($token, 0, 20) . "...\n";
    echo "   - Usuario: {$user['username']}\n";
    echo "   - Email: {$user['email']}\n";
    echo "   - Rol: {$user['rol']}\n";
    echo "   - Último login: {$user['ultimo_login']}\n";
    
    if ($result['data']['data']['profesional']) {
        $prof = $result['data']['data']['profesional'];
        echo "   - Profesional: {$prof['nombre']} {$prof['apellidos']}\n";
        echo "   - Tipo: {$prof['tipo_profesional']}\n";
    }
} else {
    echo "❌ Error: " . ($result['data']['error'] ?? 'Error desconocido') . "\n";
}
echo "\n";

// Test 2: Login con credenciales válidas (Profesional)
echo "📋 Test 2: Login con credenciales válidas (Profesional)\n";
$loginData2 = [
    'username' => 'maria.gonzalez',
    'password' => 'clinica2024'
];

$result2 = makeRequest($baseUrl . '/auth', 'POST', $loginData2);
echo "📤 POST: {$baseUrl}/auth\n";
echo "📋 Datos enviados:\n";
foreach ($loginData2 as $key => $value) {
    echo "   - {$key}: {$value}\n";
}
echo "📥 HTTP Code: {$result2['http_code']}\n";

if ($result2['data']['success']) {
    $token2 = $result2['data']['data']['token'];
    $user2 = $result2['data']['data']['usuario'];
    echo "✅ Éxito: Login exitoso\n";
    echo "   - Token: " . substr($token2, 0, 20) . "...\n";
    echo "   - Usuario: {$user2['username']}\n";
    echo "   - Email: {$user2['email']}\n";
    echo "   - Rol: {$user2['rol']}\n";
    
    if ($result2['data']['data']['profesional']) {
        $prof2 = $result2['data']['data']['profesional'];
        echo "   - Profesional: {$prof2['nombre']} {$prof2['apellidos']}\n";
        echo "   - Tipo: {$prof2['tipo_profesional']}\n";
        echo "   - Especialidad: {$prof2['especialidad']}\n";
    }
} else {
    echo "❌ Error: " . ($result2['data']['error'] ?? 'Error desconocido') . "\n";
}
echo "\n";

// Test 3: Login con credenciales inválidas
echo "📋 Test 3: Login con credenciales inválidas\n";
$invalidData = [
    'username' => 'usuario.inexistente',
    'password' => 'password123'
];

$result3 = makeRequest($baseUrl . '/auth', 'POST', $invalidData);
echo "📤 POST: {$baseUrl}/auth\n";
echo "📋 Datos enviados:\n";
foreach ($invalidData as $key => $value) {
    echo "   - {$key}: {$value}\n";
}
echo "📥 HTTP Code: {$result3['http_code']}\n";

if (!$result3['data']['success']) {
    echo "✅ Éxito: Login rechazado correctamente\n";
    echo "   - Error: " . ($result3['data']['error'] ?? 'Error desconocido') . "\n";
} else {
    echo "❌ Error: El login debería haber fallado\n";
}
echo "\n";

// Test 4: Login con password incorrecto
echo "📋 Test 4: Login con password incorrecto\n";
$wrongPasswordData = [
    'username' => 'juan.herrera',
    'password' => 'password_incorrecto'
];

$result4 = makeRequest($baseUrl . '/auth', 'POST', $wrongPasswordData);
echo "📤 POST: {$baseUrl}/auth\n";
echo "📋 Datos enviados:\n";
foreach ($wrongPasswordData as $key => $value) {
    echo "   - {$key}: {$value}\n";
}
echo "📥 HTTP Code: {$result4['http_code']}\n";

if (!$result4['data']['success']) {
    echo "✅ Éxito: Login rechazado correctamente\n";
    echo "   - Error: " . ($result4['data']['error'] ?? 'Error desconocido') . "\n";
} else {
    echo "❌ Error: El login debería haber fallado\n";
}
echo "\n";

// Test 5: Verificar token (si tenemos uno válido)
if (isset($token)) {
    echo "📋 Test 5: Verificar token válido\n";
    $result5 = makeRequest($baseUrl . "/auth?token=" . urlencode($token));
    echo "📤 GET: {$baseUrl}/auth?token=...\n";
    echo "📥 HTTP Code: {$result5['http_code']}\n";
    
    if ($result5['data']['success']) {
        echo "✅ Éxito: Token válido\n";
        echo "   - Valid: " . ($result5['data']['data']['valid'] ? 'true' : 'false') . "\n";
    } else {
        echo "❌ Error: " . ($result5['data']['error'] ?? 'Error desconocido') . "\n";
    }
    echo "\n";
}

echo "🏁 TEST COMPLETADO ===================================\n";
echo "📊 Resumen:\n";
echo "   - Login Admin: " . (isset($result['data']['success']) && $result['data']['success'] ? '✅' : '❌') . "\n";
echo "   - Login Profesional: " . (isset($result2['data']['success']) && $result2['data']['success'] ? '✅' : '❌') . "\n";
echo "   - Rechazo usuario inexistente: " . (isset($result3['data']['success']) && !$result3['data']['success'] ? '✅' : '❌') . "\n";
echo "   - Rechazo password incorrecto: " . (isset($result4['data']['success']) && !$result4['data']['success'] ? '✅' : '❌') . "\n";
echo "   - Verificación token: " . (isset($result5['data']['success']) && $result5['data']['success'] ? '✅' : '❌') . "\n";

echo "\n🎯 Próximos pasos:\n";
echo "   1. Ejecutar la migración en la base de datos\n";
echo "   2. Acceder a login.html en el navegador\n";
echo "   3. Probar las credenciales de Juan Herrera\n";
echo "   4. Verificar redirección al dashboard\n";
echo "   5. Probar el botón de logout\n";
?>
