<?php
// Debug CORS issues
header('Content-Type: application/json');

// Log access
$log = "Access at " . date('Y-m-d H:i:s') . "\n";
$log .= "User Agent: " . ($_SERVER['HTTP_USER_AGENT'] ?? 'not set') . "\n";
$log .= "Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'not set') . "\n";
file_put_contents('cors_debug_log.txt', $log, FILE_APPEND);

// Allow all origins for this debugging file
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Return all request information for debugging
echo json_encode([
    'success' => true,
    'message' => 'CORS Debug Info',
    'headers' => getallheaders(),
    'server' => $_SERVER,
    'time' => date('Y-m-d H:i:s')
]);
?>
