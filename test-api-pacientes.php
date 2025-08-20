<?php
/**
 * Test API - Guardado de Pacientes
 * Simula exactamente lo que hace el frontend: petición POST a la API
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "🧪 TEST API - GUARDADO DE PACIENTES\n";
echo "===================================\n\n";

// URL base de la API
$baseUrl = 'https://clinica-beleza.equalitech.xyz/api.php';

// Datos del formulario (igual que envía el frontend)
$data = [
    'codigo' => 'TEST' . date('YmdHis'), // Código único para el test
    'nombres' => 'Test API',
    'apellidos' => 'Paciente',
    'telefono' => '912345678',
    'email' => 'testapi' . date('YmdHis') . '@test.com',
    'fecha_nacimiento' => '1990-01-01',
    'direccion' => 'Test API Address',
    'observaciones' => 'Test API observaciones'
];

echo "📤 Enviando petición POST a: $baseUrl/fichas\n";
echo "📋 Datos enviados:\n";
foreach ($data as $key => $value) {
    echo "   - $key: $value\n";
}
echo "\n";

// Crear contexto para la petición POST con mejor manejo de errores
$options = [
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode($data),
        'ignore_errors' => true, // Importante: capturar errores HTTP
        'timeout' => 30
    ]
];

$context = stream_context_create($options);

// Hacer la petición
$response = file_get_contents($baseUrl . '/fichas', false, $context);

// Obtener headers de respuesta
$responseHeaders = $http_response_header ?? [];

echo "📥 Respuesta del servidor:\n";
foreach ($responseHeaders as $header) {
    echo "   $header\n";
}
echo "\n";

// Verificar si hay error HTTP
$httpCode = 0;
foreach ($responseHeaders as $header) {
    if (preg_match('/^HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
        $httpCode = (int)$matches[1];
        break;
    }
}

echo "🔍 Código HTTP: $httpCode\n";

if ($response === false) {
    echo "❌ Error: No se pudo conectar a la API\n";
    exit(1);
}

// Si es un error HTTP, mostrar el contenido del error
if ($httpCode >= 400) {
    echo "❌ Error HTTP $httpCode\n";
    echo "📄 Contenido del error:\n";
    echo $response . "\n\n";
    
    // Intentar decodificar como JSON
    $errorData = json_decode($response, true);
    if ($errorData) {
        echo "📋 Error JSON decodificado:\n";
        print_r($errorData);
    }
    exit(1);
}

// Decodificar respuesta
$result = json_decode($response, true);

echo "📄 Contenido de la respuesta:\n";
echo $response . "\n\n";

// Verificar resultado
if ($result && isset($result['success'])) {
    if ($result['success']) {
        echo "✅ ¡ÉXITO! Paciente guardado correctamente\n";
        if (isset($result['data']['id'])) {
            echo "   - ID del paciente: " . $result['data']['id'] . "\n";
        }
    } else {
        echo "❌ Error en la API: " . ($result['error'] ?? 'Error desconocido') . "\n";
    }
} else {
    echo "❌ Respuesta inválida de la API\n";
}

echo "\n🎯 Test completado.\n";
?>
