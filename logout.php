<?php
require_once 'init.php';

// Destruir la sesión
destroySession();

// Redirigir al login
header('Location: /login.php');
exit();
?>
