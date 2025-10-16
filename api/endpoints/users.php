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
        case 'GET':
            if (!empty($path) && preg_match('/\/(\d+)$/', $path, $matches)) {
                // GET /users/{id} - Get a specific user
                handleGetUser($db, $matches[1]);
            } else {
                // GET /users - List all users
                handleGetUsers($db);
            }
            break;
            
        case 'POST':
            // POST /users - Create a new user
            handleCreateUser($db);
            break;
            
        case 'PUT':
            if (!empty($path) && preg_match('/\/(\d+)$/', $path, $matches)) {
                // PUT /users/{id} - Update a user
                handleUpdateUser($db, $matches[1]);
            } else {
                errorResponse("Invalid endpoint", 404);
            }
            break;
            
        case 'DELETE':
            if (!empty($path) && preg_match('/\/(\d+)$/', $path, $matches)) {
                // DELETE /users/{id} - Delete a user
                handleDeleteUser($db, $matches[1]);
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
 * Get all users
 */
function handleGetUsers($db) {
    // Check for query parameters for filtering
    $role = $_GET['role'] ?? null;
    $status = $_GET['status'] ?? null;
    
    $query = "SELECT user_id, username, email, full_name, role, status, last_login, created_at 
              FROM users 
              WHERE 1=1";
              
    $params = [];
    
    if ($role) {
        $query .= " AND role = :role";
        $params[':role'] = $role;
    }
    
    if ($status) {
        $query .= " AND status = :status";
        $params[':status'] = $status;
    }
    
    $query .= " ORDER BY created_at DESC";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the users data
    foreach ($users as &$user) {
        $user['user_id'] = (int)$user['user_id'];
        
        // Format last_login to be more readable
        if (!empty($user['last_login'])) {
            $lastLogin = new DateTime($user['last_login']);
            $user['last_active'] = $lastLogin->format('Y-m-d H:i A');
        } else {
            $user['last_active'] = 'Never';
        }
        
        // Remove sensitive fields
        unset($user['password']);
    }
    
    jsonResponse($users);
}

/**
 * Get a specific user
 */
function handleGetUser($db, $userId) {
    $query = "SELECT user_id, username, email, full_name, role, status, last_login, created_at 
              FROM users 
              WHERE user_id = :user_id";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':user_id', $userId);
    $stmt->execute();
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        errorResponse("User not found", 404);
        return;
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
    
    // Format data
    $user['user_id'] = (int)$user['user_id'];
    
    if (!empty($user['last_login'])) {
        $lastLogin = new DateTime($user['last_login']);
        $user['last_active'] = $lastLogin->format('Y-m-d H:i A');
    } else {
        $user['last_active'] = 'Never';
    }
    
    // Remove sensitive fields
    unset($user['password']);
    
    jsonResponse($user);
}

/**
 * Create a new user
 */
function handleCreateUser($db) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $requiredFields = ['username', 'password', 'email', 'full_name', 'role'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            errorResponse("Missing required field: $field", 400);
            return;
        }
    }
    
    // Check if username or email already exists
    $checkQuery = "SELECT COUNT(*) FROM users WHERE username = :username OR email = :email";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindValue(':username', $data['username']);
    $checkStmt->bindValue(':email', $data['email']);
    $checkStmt->execute();
    
    if ($checkStmt->fetchColumn() > 0) {
        errorResponse("Username or email already exists", 409);
        return;
    }
    
    // Hash the password
    $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
    
    // Default status to active if not provided
    $status = isset($data['status']) ? $data['status'] : 'active';
    
    // Insert the new user
    $query = "INSERT INTO users (username, password, email, full_name, role, status, created_at) 
              VALUES (:username, :password, :email, :full_name, :role, :status, NOW())";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':username', $data['username']);
    $stmt->bindValue(':password', $hashedPassword);
    $stmt->bindValue(':email', $data['email']);
    $stmt->bindValue(':full_name', $data['full_name']);
    $stmt->bindValue(':role', $data['role']);
    $stmt->bindValue(':status', $status);
    
    $stmt->execute();
    $userId = $db->lastInsertId();
    
    // Insert default permissions based on role
    $defaultPermissions = getDefaultPermissions($data['role']);
    foreach ($defaultPermissions as $module => $permissions) {
        $permQuery = "INSERT INTO user_permissions (user_id, module, can_view, can_add, can_edit, can_delete) 
                      VALUES (:user_id, :module, :can_view, :can_add, :can_edit, :can_delete)";
        
        $permStmt = $db->prepare($permQuery);
        $permStmt->bindValue(':user_id', $userId);
        $permStmt->bindValue(':module', $module);
        $permStmt->bindValue(':can_view', $permissions['view']);
        $permStmt->bindValue(':can_add', $permissions['add']);
        $permStmt->bindValue(':can_edit', $permissions['edit']);
        $permStmt->bindValue(':can_delete', $permissions['delete']);
        
        $permStmt->execute();
    }
    
    // Return the created user (without password)
    $createdUser = [
        'user_id' => (int)$userId,
        'username' => $data['username'],
        'email' => $data['email'],
        'full_name' => $data['full_name'],
        'role' => $data['role'],
        'status' => $status,
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    jsonResponse($createdUser, 201);
}

/**
 * Update a user
 */
function handleUpdateUser($db, $userId) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Check if user exists
    $checkQuery = "SELECT user_id FROM users WHERE user_id = :user_id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindValue(':user_id', $userId);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() === 0) {
        errorResponse("User not found", 404);
        return;
    }
    
    // Start building the update query
    $updateFields = [];
    $params = [':user_id' => $userId];
    
    // Handle each field that might be updated
    if (isset($data['username']) && !empty($data['username'])) {
        // Check for duplicate username (other than current user)
        $dupQuery = "SELECT COUNT(*) FROM users WHERE username = :username AND user_id != :user_id";
        $dupStmt = $db->prepare($dupQuery);
        $dupStmt->bindValue(':username', $data['username']);
        $dupStmt->bindValue(':user_id', $userId);
        $dupStmt->execute();
        
        if ($dupStmt->fetchColumn() > 0) {
            errorResponse("Username already exists", 409);
            return;
        }
        
        $updateFields[] = "username = :username";
        $params[':username'] = $data['username'];
    }
    
    if (isset($data['email']) && !empty($data['email'])) {
        // Check for duplicate email (other than current user)
        $dupQuery = "SELECT COUNT(*) FROM users WHERE email = :email AND user_id != :user_id";
        $dupStmt = $db->prepare($dupQuery);
        $dupStmt->bindValue(':email', $data['email']);
        $dupStmt->bindValue(':user_id', $userId);
        $dupStmt->execute();
        
        if ($dupStmt->fetchColumn() > 0) {
            errorResponse("Email already exists", 409);
            return;
        }
        
        $updateFields[] = "email = :email";
        $params[':email'] = $data['email'];
    }
    
    if (isset($data['full_name'])) {
        $updateFields[] = "full_name = :full_name";
        $params[':full_name'] = $data['full_name'];
    }
    
    if (isset($data['role'])) {
        $updateFields[] = "role = :role";
        $params[':role'] = $data['role'];
    }
    
    if (isset($data['status'])) {
        $updateFields[] = "status = :status";
        $params[':status'] = $data['status'];
    }
    
    // Only update password if it's provided
    if (isset($data['password']) && !empty($data['password'])) {
        $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
        $updateFields[] = "password = :password";
        $params[':password'] = $hashedPassword;
    }
    
    // If there are fields to update, execute the query
    if (count($updateFields) > 0) {
        $query = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE user_id = :user_id";
        
        $stmt = $db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
    }
    
    // Update permissions if provided
    if (isset($data['permissions']) && is_array($data['permissions'])) {
        // Delete existing permissions
        $deletePermQuery = "DELETE FROM user_permissions WHERE user_id = :user_id";
        $deletePermStmt = $db->prepare($deletePermQuery);
        $deletePermStmt->bindValue(':user_id', $userId);
        $deletePermStmt->execute();
        
        // Add new permissions
        foreach ($data['permissions'] as $module => $permissions) {
            $permQuery = "INSERT INTO user_permissions (user_id, module, can_view, can_add, can_edit, can_delete) 
                          VALUES (:user_id, :module, :can_view, :can_add, :can_edit, :can_delete)";
            
            $permStmt = $db->prepare($permQuery);
            $permStmt->bindValue(':user_id', $userId);
            $permStmt->bindValue(':module', $module);
            $permStmt->bindValue(':can_view', $permissions['view'] ?? false);
            $permStmt->bindValue(':can_add', $permissions['add'] ?? false);
            $permStmt->bindValue(':can_edit', $permissions['edit'] ?? false);
            $permStmt->bindValue(':can_delete', $permissions['delete'] ?? false);
            
            $permStmt->execute();
        }
    }
    
    // Return the updated user
    handleGetUser($db, $userId);
}

/**
 * Delete a user
 */
function handleDeleteUser($db, $userId) {
    // Check if user exists
    $checkQuery = "SELECT user_id FROM users WHERE user_id = :user_id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindValue(':user_id', $userId);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() === 0) {
        errorResponse("User not found", 404);
        return;
    }
    
    // Delete permissions first (foreign key constraint)
    $deletePermQuery = "DELETE FROM user_permissions WHERE user_id = :user_id";
    $deletePermStmt = $db->prepare($deletePermQuery);
    $deletePermStmt->bindValue(':user_id', $userId);
    $deletePermStmt->execute();
    
    // Now delete the user
    $query = "DELETE FROM users WHERE user_id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindValue(':user_id', $userId);
    $stmt->execute();
    
    jsonResponse(['success' => true, 'message' => 'User deleted successfully']);
}

/**
 * Get default permissions based on role
 */
function getDefaultPermissions($role) {
    switch ($role) {
        case 'admin':
            return [
                'dashboard' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => true],
                'users' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => true],
                'menu' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => true],
                'orders' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => true],
                'inventory' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => true],
                'tables' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => true],
                'reports' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => true],
                'settings' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => true]
            ];
            
        case 'staff':
            return [
                'dashboard' => ['view' => true, 'add' => false, 'edit' => false, 'delete' => false],
                'menu' => ['view' => true, 'add' => false, 'edit' => false, 'delete' => false],
                'orders' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => false],
                'tables' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => false],
                'reports' => ['view' => true, 'add' => false, 'edit' => false, 'delete' => false]
            ];
            
        case 'stockman':
            return [
                'dashboard' => ['view' => true, 'add' => false, 'edit' => false, 'delete' => false],
                'inventory' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => false],
                'menu' => ['view' => true, 'add' => false, 'edit' => false, 'delete' => false]
            ];
            
        default:
            return [];
    }
}
?> 
