<?php
/**
 * Test de Conectividad Básica
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "🔍 TEST DE CONECTIVIDAD\n";
echo "======================\n\n";

$baseUrl = 'https://clinica-beleza.equalitech.xyz';

// 1. Test básico de conectividad
echo "1. Probando conectividad básica...\n";
$headers = get_headers($baseUrl);
if ($headers) {
    echo "✅ Servidor responde\n";
    echo "   Status: " . $headers[0] . "\n";
} else {
    echo "❌ No se puede conectar al servidor\n";
    exit(1);
}

// 2. Test del archivo api.php
echo "\n2. Probando api.php...\n";
$apiUrl = $baseUrl . '/api.php';
$headers = get_headers($apiUrl);
if ($headers) {
    echo "✅ api.php responde\n";
    echo "   Status: " . $headers[0] . "\n";
} else {
    echo "❌ api.php no responde\n";
}

// 3. Test del endpoint health
echo "\n3. Probando endpoint /health...\n";
$healthUrl = $apiUrl . '/health';
$response = file_get_contents($healthUrl);
if ($response !== false) {
    echo "✅ Endpoint /health responde\n";
    echo "   Response: " . $response . "\n";
} else {
    echo "❌ Endpoint /health no responde\n";
}

echo "\n🎯 Test de conectividad completado.\n";
?>
