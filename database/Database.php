<?php

/**
 * Clase para manejo de la base de datos SQLite
 * Clínica Beleza - Sistema de Gestión
 */

class Database {
    private static $instance = null;
    private $pdo = null;
    private $dbPath;
    
    private function __construct() {
        $this->dbPath = __DIR__ . '/clinica_beleza.db';
        $this->connect();
        $this->initializeDatabase();
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
     * Conecta a la base de datos SQLite
     */
    private function connect() {
        try {
            $this->pdo = new PDO("sqlite:" . $this->dbPath);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            // Habilitar claves foráneas
            $this->pdo->exec('PRAGMA foreign_keys = ON');
            
            // Configurar WAL mode para mejor concurrencia
            $this->pdo->exec('PRAGMA journal_mode = WAL');
            
        } catch (PDOException $e) {
            error_log("Error conectando a la base de datos: " . $e->getMessage());
            throw new Exception("Error de conexión a la base de datos");
        }
    }
    
    /**
     * Inicializa la base de datos ejecutando el schema
     */
    private function initializeDatabase() {
        $schemaPath = __DIR__ . '/schema.sql';
        
        if (!file_exists($schemaPath)) {
            throw new Exception("Archivo de schema no encontrado");
        }
        
        $schema = file_get_contents($schemaPath);
        
        try {
            $this->pdo->exec($schema);
        } catch (PDOException $e) {
            error_log("Error inicializando base de datos: " . $e->getMessage());
            throw new Exception("Error inicializando base de datos");
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
            throw new Exception("Error ejecutando consulta");
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
            throw new Exception("Error ejecutando consulta");
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
            throw new Exception("Error insertando datos");
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
            throw new Exception("Error actualizando datos");
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
            throw new Exception("Error eliminando datos");
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
            $result = $this->selectOne("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'");
            return [
                'status' => 'ok',
                'tables' => $result['count'],
                'database_size' => filesize($this->dbPath),
                'writable' => is_writable($this->dbPath)
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
            $backupPath = __DIR__ . '/backups/clinica_beleza_' . date('Y-m-d_H-i-s') . '.db';
        }
        
        $backupDir = dirname($backupPath);
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        return copy($this->dbPath, $backupPath);
    }
    
    /**
     * Optimiza la base de datos
     */
    public function optimize() {
        try {
            $this->pdo->exec('VACUUM');
            $this->pdo->exec('ANALYZE');
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
            
            // Contar registros por tabla
            $tables = ['pacientes', 'ventas', 'pagos', 'sesiones', 'ofertas'];
            
            foreach ($tables as $table) {
                $result = $this->selectOne("SELECT COUNT(*) as count FROM $table");
                $stats[$table] = $result['count'];
            }
            
            // Información del archivo
            $stats['database_size'] = filesize($this->dbPath);
            $stats['last_modified'] = filemtime($this->dbPath);
            
            return $stats;
            
        } catch (Exception $e) {
            error_log("Error obteniendo estadísticas: " . $e->getMessage());
            return [];
        }
    }
}

?>

