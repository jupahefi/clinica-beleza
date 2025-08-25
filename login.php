<?php
require_once 'init.php';

// Verificar si ya está logueado
requireGuest();

$error = '';
$success = '';

// Procesar formulario de login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        $error = 'Por favor completa todos los campos';
    } else {
        try {
            // Conectar a la base de datos
            $pdo = createDatabaseConnection();
            
            // Buscar usuario
            $stmt = $pdo->prepare("CALL sp_obtener_usuario_por_username(?)");
            $stmt->execute([$username]);
            $user = $stmt->fetch();
            $stmt->closeCursor();
            
            if ($user && password_verify($password, $user['password_hash'])) {
                // Login exitoso
                $user_id = $user['id'];
                
                // Actualizar último login
                $stmt = $pdo->prepare("CALL sp_actualizar_ultimo_login(?)");
                $stmt->execute([$user_id]);
                $stmt->closeCursor();
                
                // Crear sesión de usuario
                createUserSession([
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'rol' => $user['rol']
                ]);
                
                // Redirigir al dashboard
                header('Location: /index.php');
                exit();
                
            } else {
                $error = 'Usuario o contraseña incorrectos';
            }
            
        } catch (PDOException $e) {
            error_log("Error de base de datos en login: " . $e->getMessage());
            $error = 'Error de conexión. Intenta nuevamente.';
        } catch (Exception $e) {
            error_log("Error general en login: " . $e->getMessage());
            $error = 'Error interno. Intenta nuevamente.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="es">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clínica Beleza - Sistema de Gestión</title>
    
    <!-- Meta tags para SEO y redes sociales -->
    <meta name="description" content="Sistema de gestión integral para Clínica Beleza. Administración de pacientes, ventas, pagos, sesiones y más.">
    <meta name="keywords" content="clínica belleza, sistema gestión, administración, pacientes, ventas, medicina estética">
    <meta name="author" content="Clínica Beleza">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://clinicabeleza.cl/">
    <meta property="og:title" content="Clínica Beleza - Sistema de Gestión">
    <meta property="og:description" content="Sistema de gestión integral para Clínica Beleza. Administración de pacientes, ventas, pagos, sesiones y más.">
    <meta property="og:image" content="https://clinicabeleza.cl/android-chrome-512x512.png">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">
    <meta property="og:site_name" content="Clínica Beleza">
    <meta property="og:locale" content="es_CL">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://clinicabeleza.cl/">
    <meta property="twitter:title" content="Clínica Beleza - Sistema de Gestión">
    <meta property="twitter:description" content="Sistema de gestión integral para Clínica Beleza. Administración de pacientes, ventas, pagos, sesiones y más.">
    <meta property="twitter:image" content="https://clinicabeleza.cl/android-chrome-512x512.png">
    
    <!-- WhatsApp -->
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:alt" content="Clínica Beleza - Logo">
    
    <!-- Favicon -->
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="shortcut icon" href="/favicon.ico">
    
    <!-- Theme colors -->
    <meta name="theme-color" content="#7FB3D3">
    <meta name="msapplication-TileColor" content="#7FB3D3">
    <meta name="msapplication-config" content="/browserconfig.xml">

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --calypso-pastel: #7FB3D3;
            --calypso-light: #A8D1E7;
            --calypso-dark: #5A8BA8;
            --white: #FFFFFF;
            --light-gray: #F8F9FA;
            --gray: #6C757D;
            --dark-gray: #343A40;
            --success: #28A745;
            --warning: #FFC107;
            --danger: #DC3545;
            --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --shadow-hover: 0 8px 15px rgba(0, 0, 0, 0.15);
        }

        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, var(--calypso-light) 0%, var(--calypso-pastel) 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .login-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            padding: 40px;
            width: 100%;
            max-width: 400px;
            text-align: center;
        }

        .logo {
            margin-bottom: 30px;
        }

        .logo-img {
            width: 80px;
            height: 80px;
            margin-bottom: 15px;
        }

        .logo h1 {
            color: #333;
            font-size: 1.8rem;
            font-weight: 600;
        }

        .logo p {
            color: #666;
            font-size: 0.9rem;
        }

        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
        }

        .input-group {
            position: relative;
        }

        .input-group i {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: #999;
            z-index: 1;
        }

        .form-control {
            width: 100%;
            padding: 15px 15px 15px 45px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: #f8f9fa;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--calypso-pastel);
            background: white;
            box-shadow: 0 0 0 3px rgba(127, 179, 211, 0.1);
        }

        .btn-login {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, var(--calypso-pastel) 0%, var(--calypso-dark) 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }

        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(127, 179, 211, 0.3);
        }

        .btn-login:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .alert {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 0.9rem;
        }

        .alert-error {
            background: #fee;
            color: #c53030;
            border: 1px solid #feb2b2;
        }

        .alert-success {
            background: #f0fff4;
            color: #2f855a;
            border: 1px solid #9ae6b4;
        }
    </style>
</head>

<body>
    <div class="login-container">
        <div class="logo">
            <img src="logo.png" alt="Clínica Beleza" class="logo-img">
            <h1>Clínica Beleza</h1>
            <p>Sistema de Gestión</p>
        </div>

        <?php if ($error): ?>
            <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <?php if ($success): ?>
            <div class="alert alert-success"><?php echo htmlspecialchars($success); ?></div>
        <?php endif; ?>

        <form method="POST" action="">
            <div class="form-group">
                <label for="username">Usuario</label>
                <div class="input-group">
                    <i class="fas fa-user"></i>
                    <input type="text" id="username" name="username" class="form-control" 
                           placeholder="Ingresa tu usuario" required 
                           value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>">
                </div>
            </div>

            <div class="form-group">
                <label for="password">Contraseña</label>
                <div class="input-group">
                    <i class="fas fa-lock"></i>
                    <input type="password" id="password" name="password" class="form-control" 
                           placeholder="Ingresa tu contraseña" required>
                </div>
            </div>

            <button type="submit" class="btn-login">
                Iniciar Sesión
            </button>
        </form>

    </div>

    <script>
        // Auto-focus en username
        document.getElementById('username').focus();
        
        // Enter key navigation
        document.getElementById('username').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('password').focus();
            }
        });
        
        document.getElementById('password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.querySelector('form').submit();
            }
        });
    </script>
</body>
</html>
