<?php

/**
 * Clase para manejo de la base de datos MySQL
 * Clínica Beleza - Sistema de Gestión
 * Server-based architecture (sin modo offline)
 */

// Cargar variables de entorno desde .env si existe
function loadEnvFile($path) {
    if (!file_exists($path)) {
        return;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue; // Comentarios
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remover comillas si existen
            if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                $value = substr($value, 1, -1);
            }
            
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

// Cargar archivo .env
loadEnvFile(__DIR__ . '/../.env');

class Database {
    private static $instance = null;
    private $pdo = null;
    private $config;
    
    private function __construct() {
        // Configuración de MySQL
        $this->config = [
            'host' => $_ENV['DB_HOST'] ?? 'localhost',
            'port' => $_ENV['DB_PORT'] ?? '3306',
            'dbname' => $_ENV['DB_NAME'] ?? 'clinica_beleza',
            'username' => $_ENV['DB_USER'] ?? 'root',
            'password' => $_ENV['DB_PASS'] ?? ''
        ];
        
        $this->connect();
    }
    
    /**
     * Singleton pattern para la conexión a la base de datos
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Conecta a la base de datos MySQL
     */
    private function connect() {
        try {
            $dsn = "mysql:host={$this->config['host']};port={$this->config['port']};dbname={$this->config['dbname']};charset=utf8mb4";
            
            $this->pdo = new PDO($dsn, $this->config['username'], $this->config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
            
        } catch (PDOException $e) {
            error_log("Error conectando a MySQL: " . $e->getMessage());
            throw new Exception("Error de conexión a la base de datos");
        }
    }
    
    /**
     * Obtiene la conexión PDO
     */
    public function getConnection() {
        return $this->pdo;
    }
    
    /**
     * Ejecuta una consulta SELECT
     */
    public function select($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error en SELECT: " . $e->getMessage());
            throw new Exception("Error ejecutando consulta: " . $e->getMessage());
        }
    }
    
    /**
     * Ejecuta una consulta SELECT que devuelve un solo registro
     */
    public function selectOne($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch();
            return $result === false ? null : $result;
        } catch (PDOException $e) {
            error_log("Error en SELECT ONE: " . $e->getMessage());
            throw new Exception("Error ejecutando consulta: " . $e->getMessage());
        }
    }
    
    /**
     * Ejecuta una consulta INSERT
     */
    public function insert($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $this->pdo->lastInsertId();
        } catch (PDOException $e) {
            error_log("Error en INSERT: " . $e->getMessage());
            throw new Exception("Error insertando datos: " . $e->getMessage());
        }
    }
    
    /**
     * Ejecuta una consulta INSERT con RETURNING (MySQL usa LAST_INSERT_ID)
     */
    public function insertReturning($sql, $params = [], $returnColumn = 'id') {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $this->pdo->lastInsertId();
        } catch (PDOException $e) {
            error_log("Error en INSERT RETURNING: " . $e->getMessage());
            throw new Exception("Error insertando datos: " . $e->getMessage());
        }
    }
    
    /**
     * Ejecuta una consulta UPDATE
     */
    public function update($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->rowCount();
        } catch (PDOException $e) {
            error_log("Error en UPDATE: " . $e->getMessage());
            throw new Exception("Error actualizando datos: " . $e->getMessage());
        }
    }
    
    /**
     * Ejecuta una consulta DELETE
     */
    public function delete($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->rowCount();
        } catch (PDOException $e) {
            error_log("Error en DELETE: " . $e->getMessage());
            throw new Exception("Error eliminando datos: " . $e->getMessage());
        }
    }
    
    /**
     * Inicia una transacción
     */
    public function beginTransaction() {
        return $this->pdo->beginTransaction();
    }
    
    /**
     * Confirma una transacción
     */
    public function commit() {
        return $this->pdo->commit();
    }
    
    /**
     * Revierte una transacción
     */
    public function rollback() {
        return $this->pdo->rollback();
    }
    
    /**
     * Verifica si la base de datos está funcionando
     */
    public function healthCheck() {
        try {
            $result = $this->selectOne("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?", [$this->config['dbname']]);
            return [
                'status' => 'ok',
                'tables' => $result['count'],
                'database' => $this->config['dbname'],
                'host' => $this->config['host'],
                'port' => $this->config['port']
            ];
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Crea un backup de la base de datos
     */
    public function backup($backupPath = null) {
        if ($backupPath === null) {
            $backupPath = __DIR__ . '/backups/clinica_beleza_' . date('Y-m-d_H-i-s') . '.sql';
        }
        
        $backupDir = dirname($backupPath);
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        $command = sprintf(
            'mysqldump -h %s -P %s -u %s -p%s %s > %s',
            escapeshellarg($this->config['host']),
            escapeshellarg($this->config['port']),
            escapeshellarg($this->config['username']),
            escapeshellarg($this->config['password']),
            escapeshellarg($this->config['dbname']),
            escapeshellarg($backupPath)
        );
        
        exec($command, $output, $returnCode);
        return $returnCode === 0;
    }
    
    /**
     * Optimiza la base de datos
     */
    public function optimize() {
        try {
            $this->pdo->exec('OPTIMIZE TABLE ' . implode(', ', [
                'sucursal', 'box', 'profesional', 'ficha', 'tipo_ficha_especifica', 'ficha_especifica',
                'tratamiento', 'pack', 'evaluacion', 'oferta', 'oferta_pack', 'oferta_combo', 'oferta_combo_pack',
                'venta', 'venta_oferta', 'sesion'
            ]));
            return true;
        } catch (PDOException $e) {
            error_log("Error optimizando base de datos: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Obtiene estadísticas de la base de datos
     */
    public function getStats() {
        try {
            $stats = [];
            
            // Contar registros por tabla según el modelo proporcionado
            $tables = [
                'ficha', 'tipo_ficha_especifica', 'ficha_especifica',
                'tratamiento', 'pack', 'evaluacion',
                'oferta', 'oferta_pack', 'oferta_combo', 'oferta_combo_pack',
                'sucursal', 'venta', 'venta_oferta',
                'box', 'profesional', 'sesion'
            ];
            
            foreach ($tables as $table) {
                try {
                    $result = $this->selectOne("SELECT COUNT(*) as count FROM $table");
                    $stats[$table] = $result['count'];
                } catch (Exception $e) {
                    $stats[$table] = 0; // Tabla no existe aún
                }
            }
            
            // Información de la base de datos
            $stats['database'] = $this->config['dbname'];
            $stats['host'] = $this->config['host'];
            $stats['port'] = $this->config['port'];
            
            return $stats;
            
        } catch (Exception $e) {
            error_log("Error obteniendo estadísticas: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Ejecuta una consulta raw (para reportes y vistas)
     */
    public function executeRaw($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error en EXECUTE RAW: " . $e->getMessage());
            throw new Exception("Error ejecutando consulta: " . $e->getMessage());
        }
    }
}

?>

