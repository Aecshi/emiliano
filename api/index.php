<?php
require_once __DIR__ . '/config.php';

setCorsHeaders();

// Get the request URI and remove query parameters
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);
$path = str_replace('/api', '', $path);

// Handle sub-routes for orders endpoint
if (strpos($path, '/orders') === 0) {
    $_SERVER['PATH_INFO'] = str_replace('/orders', '', $path);
    $path = '/orders';
}

// Handle sub-routes for receipts endpoint
if (strpos($path, '/receipts') === 0) {
    $_SERVER['PATH_INFO'] = str_replace('/receipts', '', $path);
    $path = '/receipts';
}

// Handle sub-routes for reports endpoint
if (strpos($path, '/reports') === 0) {
    $_SERVER['PATH_INFO'] = str_replace('/reports', '', $path);
    $path = '/reports';
}

// Route the requests
switch ($path) {
    case '/dashboard':
        require __DIR__ . '/endpoints/dashboard.php';
        break;
    
    case '/tables':
        require __DIR__ . '/endpoints/tables.php';
        break;
    
    case '/table-groups':
        require __DIR__ . '/endpoints/table-groups.php';
        break;
    
    case '/menu':
        require __DIR__ . '/endpoints/menu.php';
        break;
    
    case '/orders':
        require __DIR__ . '/endpoints/orders.php';
        break;
    
    case '/receipts':
        require __DIR__ . '/endpoints/receipts.php';
        break;
    
    case '/reports':
        require __DIR__ . '/endpoints/reports.php';
        break;
    
    case '/customer-menu':
        require __DIR__ . '/endpoints/customer-menu.php';
        break;
    
    case '/auth':
        require __DIR__ . '/endpoints/auth.php';
        break;
    
    case '/users':
        require __DIR__ . '/endpoints/users.php';
        break;
    
    case '/logs':
        require __DIR__ . '/endpoints/logs.php';
        break;
    
    case '/logs-stats':
        require __DIR__ . '/endpoints/logs-stats.php';
        break;
    
    case '/test-cors':
        require __DIR__ . '/endpoints/test-cors.php';
        break;
    
    case '/':
    case '':
        jsonResponse(['message' => 'Emiliano Restaurant POS API', 'version' => '1.0.0']);
        break;
    
    default:
        errorResponse('Endpoint not found', 404);
}
?> 