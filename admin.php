<?php
/**
 * Panel de Administración para Clínica Beleza
 * Herramientas de migración, backup y mantenimiento
 */

header('Content-Type: text/html; charset=UTF-8');

require_once 'database/Database.php';

// Verificar si hay parámetros de acción
$action = $_GET['action'] ?? 'dashboard';
$message = '';
$error = '';

try {
    $db = Database::getInstance();
    
    switch ($action) {
        case 'migrate':
            $result = migrarDatosLocalStorage();
            $message = $result['message'];
            break;
            
        case 'backup':
            $result = crearBackup();
            $message = $result['message'];
            break;
            
        case 'optimize':
            $db->optimize();
            $message = 'Base de datos optimizada correctamente';
            break;
            
        case 'clear':
            if (isset($_GET['confirm'])) {
                limpiarBaseDatos();
                $message = 'Base de datos limpiada correctamente';
            }
            break;
    }
    
} catch (Exception $e) {
    $error = 'Error: ' . $e->getMessage();
}

// Obtener estadísticas
$stats = [];
$health = [];
try {
    $stats = $db->getStats();
    $health = $db->healthCheck();
} catch (Exception $e) {
    $error = 'Error obteniendo estadísticas: ' . $e->getMessage();
}

/**
 * Migra datos desde localStorage a SQLite
 */
function migrarDatosLocalStorage() {
    // Esta función necesitaría recibir datos JSON desde el frontend
    // Por ahora, retorna un mensaje indicativo
    return [
        'success' => true,
        'message' => 'Para migrar datos, usa la herramienta de migración desde la aplicación web.'
    ];
}

/**
 * Crea un backup de la base de datos
 */
function crearBackup() {
    global $db;
    
    $backupFile = 'backups/backup_' . date('Y-m-d_H-i-s') . '.db';
    $success = $db->backup($backupFile);
    
    if ($success) {
        return [
            'success' => true,
            'message' => "Backup creado exitosamente: $backupFile"
        ];
    } else {
        throw new Exception('Error creando backup');
    }
}

/**
 * Limpia datos de prueba de la base de datos
 */
function limpiarBaseDatos() {
    global $db;
    
    $db->beginTransaction();
    try {
        // Limpiar datos pero mantener estructura
        $db->delete("DELETE FROM sesiones");
        $db->delete("DELETE FROM pagos");
        $db->delete("DELETE FROM ventas");
        $db->delete("DELETE FROM fichas_corporales");
        $db->delete("DELETE FROM fichas_depilacion");
        $db->delete("DELETE FROM pacientes");
        $db->delete("DELETE FROM ofertas");
        
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Clínica Beleza</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #667eea;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .stat-item {
            text-align: center;
            background: white;
            padding: 15px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            font-size: 0.9rem;
            color: #666;
            margin-top: 5px;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            margin: 5px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            font-size: 14px;
        }
        .btn:hover {
            background: #556cd6;
        }
        .btn-danger {
            background: #dc3545;
        }
        .btn-danger:hover {
            background: #c82333;
        }
        .btn-success {
            background: #28a745;
        }
        .btn-success:hover {
            background: #218838;
        }
        .alert {
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
        }
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .health-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .health-ok { background: #28a745; }
        .health-warning { background: #ffc107; }
        .health-error { background: #dc3545; }
        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Panel de Administración</h1>
            <p>Clínica Beleza - Sistema de Gestión</p>
        </div>
        
        <?php if ($message): ?>
            <div class="alert alert-success">✅ <?= htmlspecialchars($message) ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert alert-error">❌ <?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        
        <div class="grid">
            <!-- Estado del Sistema -->
            <div class="card">
                <h3>📊 Estado del Sistema</h3>
                <table>
                    <tr>
                        <td>Estado de la BD:</td>
                        <td>
                            <span class="health-indicator health-<?= $health['status'] === 'ok' ? 'ok' : 'error' ?>"></span>
                            <?= $health['status'] === 'ok' ? 'Funcionando' : 'Error' ?>
                        </td>
                    </tr>
                    <tr>
                        <td>Tablas:</td>
                        <td><?= $health['tables'] ?? 'N/A' ?></td>
                    </tr>
                    <tr>
                        <td>Tamaño BD:</td>
                        <td><?= formatBytes($health['database_size'] ?? 0) ?></td>
                    </tr>
                    <tr>
                        <td>Escribible:</td>
                        <td><?= ($health['writable'] ?? false) ? '✅ Sí' : '❌ No' ?></td>
                    </tr>
                </table>
            </div>
            
            <!-- Estadísticas -->
            <div class="card">
                <h3>📈 Estadísticas</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number"><?= $stats['pacientes'] ?? 0 ?></div>
                        <div class="stat-label">Pacientes</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= $stats['ventas'] ?? 0 ?></div>
                        <div class="stat-label">Ventas</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= $stats['pagos'] ?? 0 ?></div>
                        <div class="stat-label">Pagos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= $stats['sesiones'] ?? 0 ?></div>
                        <div class="stat-label">Sesiones</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Herramientas de Administración -->
        <div class="card">
            <h3>🛠️ Herramientas de Administración</h3>
            
            <div class="actions">
                <a href="?action=backup" class="btn btn-success">
                    💾 Crear Backup
                </a>
                
                <a href="?action=optimize" class="btn">
                    ⚡ Optimizar BD
                </a>
                
                <a href="test-env.html" class="btn" target="_blank">
                    🧪 Test Variables
                </a>
                
                <a href="migrate.html" class="btn">
                    🔄 Migrar Datos
                </a>
                
                <a href="?action=clear&confirm=1" class="btn btn-danger" 
                   onclick="return confirm('⚠️ ADVERTENCIA: Esto eliminará TODOS los datos. ¿Estás seguro?')">
                    🗑️ Limpiar Datos
                </a>
            </div>
        </div>
        
        <!-- Información de Archivos -->
        <div class="card">
            <h3>📁 Archivos del Sistema</h3>
            <table>
                <thead>
                    <tr>
                        <th>Archivo</th>
                        <th>Estado</th>
                        <th>Tamaño</th>
                        <th>Modificado</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $archivos = [
                        'database/clinica_beleza.db' => 'Base de Datos',
                        'api.php' => 'API REST',
                        'env.php' => 'Variables de Entorno',
                        '.env' => 'Configuración'
                    ];
                    
                    foreach ($archivos as $archivo => $descripcion):
                        $existe = file_exists($archivo);
                        $tamaño = $existe ? filesize($archivo) : 0;
                        $modificado = $existe ? date('Y-m-d H:i:s', filemtime($archivo)) : 'N/A';
                    ?>
                    <tr>
                        <td><?= htmlspecialchars($descripcion) ?></td>
                        <td>
                            <?php if ($existe): ?>
                                <span class="health-indicator health-ok"></span> Existe
                            <?php else: ?>
                                <span class="health-indicator health-error"></span> No encontrado
                            <?php endif; ?>
                        </td>
                        <td><?= formatBytes($tamaño) ?></td>
                        <td><?= $modificado ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <!-- Enlaces Rápidos -->
        <div class="card">
            <h3>🔗 Enlaces Rápidos</h3>
            <div class="actions">
                <a href="../" class="btn">🏠 Ir a la Aplicación</a>
                <a href="api.php/health" class="btn" target="_blank">🩺 Health Check API</a>
                <a href="api.php/stats" class="btn" target="_blank">📊 Estadísticas API</a>
                <a href="env.php" class="btn" target="_blank">⚙️ Variables de Entorno</a>
            </div>
        </div>
    </div>
</body>
</html>

<?php
/**
 * Formatea bytes en unidades legibles
 */
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}
?>

