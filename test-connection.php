<?php
header('Content-Type: application/json; charset=UTF-8');

try {
    require_once 'database/Database.php';
    $db = Database::getInstance();
    
    // Probar conexión
    $result = $db->selectOne("SELECT 1 as test");
    
    echo json_encode([
        'success' => true,
        'message' => 'Conexión exitosa',
        'data' => $result
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
