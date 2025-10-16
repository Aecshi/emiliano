<?php
require_once __DIR__ . '/../config/database.php';

setCorsHeaders();

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    errorResponse("Database connection failed");
}

try {
    // Get today's date
    $today = date('Y-m-d');
    
    // Get today's sales
    $salesQuery = "SELECT 
        COALESCE(total_sales, 0) as total_sales,
        COALESCE(total_orders, 0) as total_orders,
        COALESCE(total_items_sold, 0) as total_items_sold
        FROM daily_sales 
        WHERE sales_date = :today";
    
    $salesStmt = $db->prepare($salesQuery);
    $salesStmt->bindParam(':today', $today);
    $salesStmt->execute();
    $salesData = $salesStmt->fetch(PDO::FETCH_ASSOC);
    
    // If no sales data for today, set defaults
    if (!$salesData) {
        $salesData = ['total_sales' => 0, 'total_orders' => 0, 'total_items_sold' => 0];
    }
    
    // Get yesterday's sales for comparison
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $yesterdayQuery = "SELECT COALESCE(total_sales, 0) as total_sales FROM daily_sales WHERE sales_date = :yesterday";
    $yesterdayStmt = $db->prepare($yesterdayQuery);
    $yesterdayStmt->bindParam(':yesterday', $yesterday);
    $yesterdayStmt->execute();
    $yesterdayData = $yesterdayStmt->fetch(PDO::FETCH_ASSOC);
    
    // Calculate sales change percentage
    $salesChange = 0;
    if ($yesterdayData && $yesterdayData['total_sales'] > 0) {
        $salesChange = (($salesData['total_sales'] - $yesterdayData['total_sales']) / $yesterdayData['total_sales']) * 100;
    } elseif ($salesData['total_sales'] > 0) {
        $salesChange = 100; // 100% increase from 0
    }
    
    // Get table statistics
    $tablesQuery = "SELECT 
        COUNT(*) as total_tables,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_tables,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_tables,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved_tables
        FROM restaurant_tables";
    
    $tablesStmt = $db->prepare($tablesQuery);
    $tablesStmt->execute();
    $tablesData = $tablesStmt->fetch(PDO::FETCH_ASSOC);
    
    // Get open orders count
    $ordersQuery = "SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders
        FROM orders 
        WHERE status IN ('pending', 'in_progress', 'ready')";
    
    $ordersStmt = $db->prepare($ordersQuery);
    $ordersStmt->execute();
    $ordersData = $ordersStmt->fetch(PDO::FETCH_ASSOC);
    
    // Get today's unique customers (approximated by today's orders)
    $customersQuery = "SELECT COUNT(*) as customers_today FROM orders WHERE DATE(created_at) = :today";
    $customersStmt = $db->prepare($customersQuery);
    $customersStmt->bindParam(':today', $today);
    $customersStmt->execute();
    $customersData = $customersStmt->fetch(PDO::FETCH_ASSOC);
    
    // Get yesterday's customers for comparison
    $yesterdayCustomersQuery = "SELECT COUNT(*) as customers_yesterday FROM orders WHERE DATE(created_at) = :yesterday";
    $yesterdayCustomersStmt = $db->prepare($yesterdayCustomersQuery);
    $yesterdayCustomersStmt->bindParam(':yesterday', $yesterday);
    $yesterdayCustomersStmt->execute();
    $yesterdayCustomersData = $yesterdayCustomersStmt->fetch(PDO::FETCH_ASSOC);
    
    // Calculate customers change percentage
    $customersChange = 0;
    if ($yesterdayCustomersData && $yesterdayCustomersData['customers_yesterday'] > 0) {
        $customersChange = (($customersData['customers_today'] - $yesterdayCustomersData['customers_yesterday']) / $yesterdayCustomersData['customers_yesterday']) * 100;
    } elseif ($customersData['customers_today'] > 0) {
        $customersChange = 100;
    }
    
    // Prepare response
    $stats = [
        'todaysSales' => [
            'value' => '₱' . number_format($salesData['total_sales'], 2),
            'change' => ($salesChange >= 0 ? '+' : '') . number_format($salesChange, 1) . '%',
            'isPositive' => $salesChange >= 0
        ],
        'activeTables' => [
            'value' => $tablesData['occupied_tables'] . '/' . $tablesData['total_tables'],
            'change' => $tablesData['available_tables'] . ' available',
            'isPositive' => $tablesData['available_tables'] > 0
        ],
        'openOrders' => [
            'value' => $ordersData['total_orders'],
            'change' => $ordersData['pending_orders'] . ' pending',
            'isPositive' => true
        ],
        'customersToday' => [
            'value' => $customersData['customers_today'],
            'change' => ($customersChange >= 0 ? '+' : '') . number_format($customersChange, 1) . '%',
            'isPositive' => $customersChange >= 0
        ]
    ];
    
    jsonResponse($stats);
    
} catch (Exception $e) {
    errorResponse("Error fetching dashboard data: " . $e->getMessage());
}
?> 