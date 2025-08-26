<?php
/**
 * Archivo anti-cache para desarrollo
 * Envía headers para evitar que el navegador cachee assets
 * 
 * Para usar: descomenta la línea auto_prepend_file en custom.ini
 */

// Solo aplicar en desarrollo
if (getenv('APP_ENV') === 'development' || !getenv('APP_ENV')) {
    // Headers para evitar cache en desarrollo
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Headers específicos para assets
    $request_uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i', $request_uri)) {
        header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');
    }
}
?>
