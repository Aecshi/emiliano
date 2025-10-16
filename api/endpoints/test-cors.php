<?php
require_once __DIR__ . '/../config/database.php';

setCorsHeaders();

// Simple test response
$response = [
    'message' => 'CORS test successful!',
    'timestamp' => date('Y-m-d H:i:s'),
    'method' => $_SERVER['REQUEST_METHOD'],
    'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'No origin header',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'No user agent'
];

jsonResponse($response);
?> 