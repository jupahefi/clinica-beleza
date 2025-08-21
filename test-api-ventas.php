<?php
/**
 * Test API - Módulo de Ventas
 * Verifica que todos los endpoints de ventas funcionen correctamente
 */

// Configuración
$baseUrl = 'https://clinica-beleza.equalitech.xyz/api.php';
$testData = [
    'ficha_id' => 1, // Asumiendo que existe una ficha con ID 1
    'tratamiento_id' => 1, // FACIAL
    'pack_id' => 1, // Limpieza Facial Profunda
    'cantidad_sesiones' => 1,
    'precio_lista' => 24900, // Precio con oferta
    'descuento_manual_pct' => 5 // 5% adicional
];

echo "🧪 TEST API - MÓDULO DE VENTAS ===================================\n\n";

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

// Test 1: Obtener tratamientos
echo "📋 Test 1: Obtener tratamientos disponibles\n";
$result = makeRequest($baseUrl . '/tratamientos');
echo "📤 GET: {$baseUrl}/tratamientos\n";
echo "📥 HTTP Code: {$result['http_code']}\n";
if ($result['data']['success']) {
    echo "✅ Éxito: " . count($result['data']['data']) . " tratamientos encontrados\n";
    foreach ($result['data']['data'] as $tratamiento) {
        echo "   - {$tratamiento['nombre']} (ID: {$tratamiento['id']})\n";
    }
} else {
    echo "❌ Error: " . ($result['data']['error'] ?? 'Error desconocido') . "\n";
}
echo "\n";

// Test 2: Obtener packs por tratamiento
echo "📋 Test 2: Obtener packs del tratamiento FACIAL\n";
$result = makeRequest($baseUrl . '/packs?tratamiento_id=1');
echo "📤 GET: {$baseUrl}/packs?tratamiento_id=1\n";
echo "📥 HTTP Code: {$result['http_code']}\n";
if ($result['data']['success']) {
    echo "✅ Éxito: " . count($result['data']['data']) . " packs encontrados\n";
    foreach ($result['data']['data'] as $pack) {
        $precioOferta = $pack['precio_oferta'] ? " (oferta: $" . number_format($pack['precio_oferta']) . ")" : "";
        echo "   - {$pack['nombre']} - $" . number_format($pack['precio_regular']) . $precioOferta . "\n";
    }
} else {
    echo "❌ Error: " . ($result['data']['error'] ?? 'Error desconocido') . "\n";
}
echo "\n";

// Test 3: Obtener ofertas aplicables
echo "📋 Test 3: Obtener ofertas aplicables\n";
$result = makeRequest($baseUrl . '/ofertas-aplicables');
echo "📤 GET: {$baseUrl}/ofertas-aplicables\n";
echo "📥 HTTP Code: {$result['http_code']}\n";
if ($result['data']['success']) {
    echo "✅ Éxito: " . count($result['data']['data']) . " ofertas aplicables\n";
    foreach ($result['data']['data'] as $oferta) {
        echo "   - {$oferta['nombre']} ({$oferta['tipo']}) - {$oferta['porc_descuento']}%\n";
    }
} else {
    echo "❌ Error: " . ($result['data']['error'] ?? 'Error desconocido') . "\n";
}
echo "\n";

// Test 4: Crear una venta
echo "📋 Test 4: Crear una nueva venta\n";
echo "📤 POST: {$baseUrl}/ventas\n";
echo "📋 Datos enviados:\n";
foreach ($testData as $key => $value) {
    echo "   - {$key}: {$value}\n";
}

$result = makeRequest($baseUrl . '/ventas', 'POST', $testData);
echo "📥 HTTP Code: {$result['http_code']}\n";

if ($result['data']['success']) {
    $ventaId = $result['data']['data']['id'];
    echo "✅ Éxito: Venta creada con ID: {$ventaId}\n";
    
    // Test 5: Obtener la venta creada
    echo "\n📋 Test 5: Obtener venta creada\n";
    $resultVenta = makeRequest($baseUrl . "/ventas/{$ventaId}");
    echo "📤 GET: {$baseUrl}/ventas/{$ventaId}\n";
    echo "📥 HTTP Code: {$resultVenta['http_code']}\n";
    
    if ($resultVenta['data']['success']) {
        $venta = $resultVenta['data']['data'];
        echo "✅ Éxito: Venta obtenida\n";
        echo "   - Paciente: {$venta['paciente_nombres']} {$venta['paciente_apellidos']}\n";
        echo "   - Tratamiento: {$venta['tratamiento_nombre']}\n";
        echo "   - Pack: " . ($venta['pack_nombre'] ?? 'N/A') . "\n";
        echo "   - Precio: $" . number_format($venta['precio_lista']) . "\n";
        echo "   - Total pagado: $" . number_format($venta['total_pagado']) . "\n";
    } else {
        echo "❌ Error obteniendo venta: " . ($resultVenta['data']['error'] ?? 'Error desconocido') . "\n";
    }
    
    // Test 6: Obtener historial del cliente
    echo "\n📋 Test 6: Obtener historial de ventas del cliente\n";
    $resultHistorial = makeRequest($baseUrl . "/ventas/historial/{$testData['ficha_id']}");
    echo "📤 GET: {$baseUrl}/ventas/historial/{$testData['ficha_id']}\n";
    echo "📥 HTTP Code: {$resultHistorial['http_code']}\n";
    
    if ($resultHistorial['data']['success']) {
        $historial = $resultHistorial['data']['data'];
        echo "✅ Éxito: " . count($historial) . " ventas en historial\n";
        foreach ($historial as $venta) {
            echo "   - {$venta['tratamiento_nombre']} → $" . number_format($venta['total_pagado']) . " ({$venta['fecha_creacion']})\n";
        }
    } else {
        echo "❌ Error obteniendo historial: " . ($resultHistorial['data']['error'] ?? 'Error desconocido') . "\n";
    }
    
} else {
    echo "❌ Error creando venta: " . ($result['data']['error'] ?? 'Error desconocido') . "\n";
}

echo "\n🏁 TEST COMPLETADO ===================================\n";
echo "📊 Resumen:\n";
echo "   - Tratamientos: " . (isset($result['data']['success']) && $result['data']['success'] ? '✅' : '❌') . "\n";
echo "   - Packs: " . (isset($result['data']['success']) && $result['data']['success'] ? '✅' : '❌') . "\n";
echo "   - Ofertas: " . (isset($result['data']['success']) && $result['data']['success'] ? '✅' : '❌') . "\n";
echo "   - Crear venta: " . (isset($result['data']['success']) && $result['data']['success'] ? '✅' : '❌') . "\n";
echo "   - Obtener venta: " . (isset($resultVenta['data']['success']) && $resultVenta['data']['success'] ? '✅' : '❌') . "\n";
echo "   - Historial: " . (isset($resultHistorial['data']['success']) && $resultHistorial['data']['success'] ? '✅' : '❌') . "\n";
?>
