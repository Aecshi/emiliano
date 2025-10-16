<?php
require_once __DIR__ . '/../config/database.php';

setCorsHeaders();

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    errorResponse("Database connection failed");
}

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '';

try {
    switch ($method) {
        case 'POST':
            if ($path === '/login') {
                handleLogin($db);
            } elseif ($path === '/logout') {
                handleLogout();
            } else {
                errorResponse("Invalid endpoint", 404);
            }
            break;
        case 'GET':
            if ($path === '/check') {
                handleSessionCheck();
            } elseif ($path === '/user') {
                handleGetCurrentUser($db);
            } else {
                errorResponse("Invalid endpoint", 404);
            }
            break;
        default:
            errorResponse("Method not allowed", 405);
    }
} catch (Exception $e) {
    errorResponse("Error: " . $e->getMessage());
}

/**
 * Handle user login
 */
function handleLogin($db) {
    // Get login data from request
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['username']) || !isset($data['password'])) {
        errorResponse("Username and password are required", 400);
    }
    
    $username = $data['username'];
    $password = $data['password'];
    
    // Find user in database
    $query = "SELECT user_id, username, password, email, full_name, role, status 
              FROM users 
              WHERE username = :username";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':username', $username);
    $stmt->execute();
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        errorResponse("Invalid username or password", 401);
    }
    
    // Check if account is active
    if ($user['status'] !== 'active') {
        errorResponse("Your account is " . $user['status'] . ". Please contact an administrator.", 403);
    }
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        errorResponse("Invalid username or password", 401);
    }
    
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Set session variables
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['logged_in'] = true;
    $_SESSION['last_activity'] = time();
    
    // Update last login time
    $updateQuery = "UPDATE users SET last_login = NOW() WHERE user_id = :user_id";
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->bindValue(':user_id', $user['user_id']);
    $updateStmt->execute();
    
    // Log the login activity
    logActivity($db, $user['user_id'], 'login', 'User logged in successfully');
    
    // Get user permissions
    $permissionsQuery = "SELECT module, can_view, can_add, can_edit, can_delete 
                        FROM user_permissions 
                        WHERE user_id = :user_id";
    
    $permStmt = $db->prepare($permissionsQuery);
    $permStmt->bindValue(':user_id', $user['user_id']);
    $permStmt->execute();
    
    $permissions = [];
    while ($perm = $permStmt->fetch(PDO::FETCH_ASSOC)) {
        $permissions[$perm['module']] = [
            'view' => (bool)$perm['can_view'],
            'add' => (bool)$perm['can_add'],
            'edit' => (bool)$perm['can_edit'],
            'delete' => (bool)$perm['can_delete']
        ];
    }
    
    // Return user data (without password)
    unset($user['password']);
    $user['permissions'] = $permissions;
    
    jsonResponse([
        'success' => true,
        'message' => 'Login successful',
        'user' => $user
    ]);
}

/**
 * Handle user logout
 */
function handleLogout() {
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Clear session data
    $_SESSION = [];
    
    // Destroy the session
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    session_destroy();
    
    jsonResponse([
        'success' => true,
        'message' => 'Logout successful'
    ]);
}

/**
 * Check if user is logged in
 */
function handleSessionCheck() {
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Check if session exists and is valid
    if (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
        // Check for session timeout
        $timeout = 30 * 60; // 30 minutes by default
        
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
            // Session has expired
            handleLogout();
            errorResponse("Session expired. Please login again.", 401);
        }
        
        // Update last activity time
        $_SESSION['last_activity'] = time();
        
        jsonResponse([
            'success' => true,
            'message' => 'Session is valid',
            'user_id' => $_SESSION['user_id'] ?? null,
            'username' => $_SESSION['username'] ?? null,
            'role' => $_SESSION['role'] ?? null
        ]);
    } else {
        errorResponse("Not authenticated", 401);
    }
}

/**
 * Get current logged in user details
 */
function handleGetCurrentUser($db) {
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        errorResponse("Not authenticated", 401);
    }
    
    $userId = $_SESSION['user_id'];
    
    // Get user details
    $query = "SELECT user_id, username, email, full_name, role, status, last_login, created_at 
              FROM users 
              WHERE user_id = :user_id";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':user_id', $userId);
    $stmt->execute();
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        errorResponse("User not found", 404);
    }
    
    // Get user permissions
    $permissionsQuery = "SELECT module, can_view, can_add, can_edit, can_delete 
                        FROM user_permissions 
                        WHERE user_id = :user_id";
    
    $permStmt = $db->prepare($permissionsQuery);
    $permStmt->bindValue(':user_id', $userId);
    $permStmt->execute();
    
    $permissions = [];
    while ($perm = $permStmt->fetch(PDO::FETCH_ASSOC)) {
        $permissions[$perm['module']] = [
            'view' => (bool)$perm['can_view'],
            'add' => (bool)$perm['can_add'],
            'edit' => (bool)$perm['can_edit'],
            'delete' => (bool)$perm['can_delete']
        ];
    }
    
    $user['permissions'] = $permissions;
    
    jsonResponse($user);
}

/**
 * Log user activity
 */
function logActivity($db, $userId, $action, $description) {
    $query = "INSERT INTO activity_logs (user_id, action, description, ip_address, user_agent) 
              VALUES (:user_id, :action, :description, :ip_address, :user_agent)";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':user_id', $userId);
    $stmt->bindValue(':action', $action);
    $stmt->bindValue(':description', $description);
    $stmt->bindValue(':ip_address', $_SERVER['REMOTE_ADDR'] ?? null);
    $stmt->bindValue(':user_agent', $_SERVER['HTTP_USER_AGENT'] ?? null);
    
    $stmt->execute();
}
?> 