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
    'email' => 'testapi@test.com',
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

// Crear contexto para la petición POST
$options = [
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);

// Hacer la petición
$response = file_get_contents($baseUrl . '/fichas', false, $context);

if ($response === false) {
    echo "❌ Error: No se pudo conectar a la API\n";
    exit(1);
}

// Decodificar respuesta
$result = json_decode($response, true);

echo "📥 Respuesta de la API:\n";
echo "Status: " . $http_response_header[0] . "\n";
echo "Response: " . $response . "\n\n";

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
