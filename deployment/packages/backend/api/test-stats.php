<?php
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

// Return a simple response for testing
$response = [
    'success' => true,
    'message' => 'API is working',
    'system_events' => 123,
    'warnings' => 5,
    'user_sessions' => 10
];

header('Content-Type: application/json');
echo json_encode($response);
?>
