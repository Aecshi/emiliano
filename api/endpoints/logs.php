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
            if ($path === '/stats') {
                handleGetSystemStats($db);
            } else {
                handleGetLogs($db);
            }
            break;
        
        case 'POST':
            handleCreateLog($db);
            break;
            
        default:
            errorResponse("Method not allowed", 405);
    }
} catch (Exception $e) {
    errorResponse("Error: " . $e->getMessage());
}

/**
 * Get activity logs with optional filters
 */
function handleGetLogs($db) {
    // Get query parameters
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $action = $_GET['action'] ?? null;
    $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
    $from_date = $_GET['from_date'] ?? null;
    $to_date = $_GET['to_date'] ?? null;
    $level = $_GET['level'] ?? null; // For system logs: error, warning, info
    $source = $_GET['source'] ?? null; // For system logs: Database, Auth, Orders, etc.
    
    // Build query
    $query = "SELECT al.log_id, al.user_id, al.action, al.description, al.ip_address, 
                     al.created_at, u.username, u.full_name
              FROM activity_logs al
              LEFT JOIN users u ON al.user_id = u.user_id
              WHERE 1=1";
    
    $countQuery = "SELECT COUNT(*) FROM activity_logs al WHERE 1=1";
    
    $params = [];
    
    // Apply filters
    if ($action) {
        $query .= " AND al.action = :action";
        $countQuery .= " AND al.action = :action";
        $params[':action'] = $action;
    }
    
    if ($user_id) {
        $query .= " AND al.user_id = :user_id";
        $countQuery .= " AND al.user_id = :user_id";
        $params[':user_id'] = $user_id;
    }
    
    if ($from_date) {
        $query .= " AND al.created_at >= :from_date";
        $countQuery .= " AND al.created_at >= :from_date";
        $params[':from_date'] = $from_date . ' 00:00:00';
    }
    
    if ($to_date) {
        $query .= " AND al.created_at <= :to_date";
        $countQuery .= " AND al.created_at <= :to_date";
        $params[':to_date'] = $to_date . ' 23:59:59';
    }
    
    if ($level) {
        $query .= " AND al.action = :level";
        $countQuery .= " AND al.action = :level";
        $params[':level'] = $level;
    }
    
    if ($source) {
        $query .= " AND al.description LIKE :source";
        $countQuery .= " AND al.description LIKE :source";
        $params[':source'] = '%' . $source . '%';
    }
    
    // Add order by and limit
    $query .= " ORDER BY al.created_at DESC LIMIT :limit OFFSET :offset";
    
    // Execute count query first
    $countStmt = $db->prepare($countQuery);
    foreach ($params as $key => $value) {
        $countStmt->bindValue($key, $value);
    }
    $countStmt->execute();
    $total = $countStmt->fetchColumn();
    
    // Execute main query
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format logs for response
    $formattedLogs = [];
    foreach ($logs as $log) {
        // Format timestamp
        $timestamp = new DateTime($log['created_at']);
        
        $formattedLogs[] = [
            'id' => (int)$log['log_id'],
            'user_id' => $log['user_id'] ? (int)$log['user_id'] : null,
            'username' => $log['username'] ?? 'System',
            'full_name' => $log['full_name'] ?? 'System',
            'action' => $log['action'],
            'description' => $log['description'],
            'ip_address' => $log['ip_address'],
            'timestamp' => $timestamp->format('Y-m-d H:i:s'),
            'level' => determineLevelFromAction($log['action']),
            'source' => determineSourceFromDescription($log['description'])
        ];
    }
    
    // Return response with pagination info
    jsonResponse([
        'logs' => $formattedLogs,
        'pagination' => [
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total
        ]
    ]);
}

/**
 * Create a new activity log
 */
function handleCreateLog($db) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($data['action']) || empty($data['action'])) {
        errorResponse("Action is required", 400);
        return;
    }
    
    $userId = isset($data['user_id']) ? (int)$data['user_id'] : null;
    $action = $data['action'];
    $description = $data['description'] ?? '';
    $ipAddress = $data['ip_address'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    $userAgent = $data['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? null;
    
    // Insert into activity_logs table
    $query = "INSERT INTO activity_logs (user_id, action, description, ip_address, user_agent, created_at) 
              VALUES (:user_id, :action, :description, :ip_address, :user_agent, NOW())";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $stmt->bindValue(':action', $action);
    $stmt->bindValue(':description', $description);
    $stmt->bindValue(':ip_address', $ipAddress);
    $stmt->bindValue(':user_agent', $userAgent);
    
    $stmt->execute();
    $logId = $db->lastInsertId();
    
    // Return the created log
    jsonResponse([
        'id' => (int)$logId,
        'user_id' => $userId,
        'action' => $action,
        'description' => $description,
        'ip_address' => $ipAddress,
        'created_at' => date('Y-m-d H:i:s')
    ], 201);
}

/**
 * Get system statistics for the admin dashboard
 */
function handleGetSystemStats($db) {
    // Get total events today
    $eventsQuery = "SELECT COUNT(*) FROM activity_logs WHERE DATE(created_at) = CURDATE()";
    $eventsStmt = $db->prepare($eventsQuery);
    $eventsStmt->execute();
    $totalEvents = $eventsStmt->fetchColumn();
    
    // Get warnings requiring attention
    $warningsQuery = "SELECT COUNT(*) FROM activity_logs 
                     WHERE action IN ('warning', 'error') 
                     AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)";
    $warningsStmt = $db->prepare($warningsQuery);
    $warningsStmt->execute();
    $warnings = $warningsStmt->fetchColumn();
    
    // Get active user sessions today
    $sessionsQuery = "SELECT COUNT(DISTINCT user_id) 
                      FROM activity_logs 
                      WHERE action = 'login' 
                      AND DATE(created_at) = CURDATE()
                      AND user_id IS NOT NULL";
    $sessionsStmt = $db->prepare($sessionsQuery);
    $sessionsStmt->execute();
    $userSessions = $sessionsStmt->fetchColumn();
    
    jsonResponse([
        'system_events' => (int)$totalEvents,
        'warnings' => (int)$warnings,
        'user_sessions' => (int)$userSessions
    ]);
}

/**
 * Determine log level based on action
 */
function determineLevelFromAction($action) {
    switch (strtolower($action)) {
        case 'error':
            return 'error';
        case 'warning':
            return 'warning';
        default:
            return 'info';
    }
}

/**
 * Extract source system from description
 */
function determineSourceFromDescription($description) {
    $sources = ['Database', 'Auth', 'Users', 'Orders', 'Inventory', 'System', 'Menu', 'Tables', 'Reports'];
    
    foreach ($sources as $source) {
        if (stripos($description, $source) !== false) {
            return $source;
        }
    }
    
    return 'System';
}
?> 
