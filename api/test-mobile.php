<?php
// Set CORS headers to allow all origins for this test
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json");

// Return a simple JSON response
echo json_encode([
    "success" => true,
    "message" => "API is accessible from mobile",
    "timestamp" => date("Y-m-d H:i:s"),
    "user_agent" => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
    "origin" => $_SERVER['HTTP_ORIGIN'] ?? 'Not provided',
    "referer" => $_SERVER['HTTP_REFERER'] ?? 'Not provided'
]);
?>
