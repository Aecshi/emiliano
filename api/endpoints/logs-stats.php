<?php
require_once __DIR__ . '/../config/database.php';

setCorsHeaders();

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    errorResponse("Database connection failed");
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        handleGetSystemStats($db);
    } else {
        errorResponse("Method not allowed", 405);
    }
} catch (Exception $e) {
    errorResponse("Error: " . $e->getMessage());
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
?>
