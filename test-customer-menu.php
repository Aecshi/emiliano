<?php
// Test script to check customer menu API endpoint
header('Content-Type: application/json');

$apiUrl = 'http://localhost/api/customer-menu';
$response = file_get_contents($apiUrl);

if ($response === false) {
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch data from API',
        'url' => $apiUrl
    ]);
    exit;
}

// Try to decode the response
$data = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode([
        'success' => false,
        'error' => 'Failed to decode JSON response',
        'raw_response' => $response
    ]);
    exit;
}

// Return the data
echo json_encode([
    'success' => true,
    'message' => 'Successfully fetched menu data',
    'categories_count' => count($data['categories'] ?? []),
    'items_count' => count($data['items'] ?? []),
    'data' => $data
]);
?> 