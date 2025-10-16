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
            if ($path === '/sales-summary') {
                handleSalesSummary($db);
            } elseif ($path === '/daily-revenue') {
                handleDailyRevenue($db);
            } elseif ($path === '/best-selling-items') {
                handleBestSellingItems($db);
            } elseif ($path === '/sales-analytics') {
                handleSalesAnalytics($db);
            } elseif ($path === '/generate') {
                handleGenerateReport($db);
            } else {
                handleSalesSummary($db); // Default to sales summary
            }
            break;
        default:
            errorResponse("Method not allowed", 405);
    }
} catch (Exception $e) {
    errorResponse("Error: " . $e->getMessage());
}

function handleSalesSummary($db) {
    // Get date range from query parameters (default to last 30 days)
    $fromDate = $_GET['from'] ?? date('Y-m-d', strtotime('-30 days'));
    $toDate = $_GET['to'] ?? date('Y-m-d');
    
    try {
        // Get total revenue from payments
        $revenueQuery = "SELECT 
            COALESCE(SUM(amount), 0) as total_revenue,
            COUNT(DISTINCT order_id) as total_orders
            FROM payments 
            WHERE status = 'completed' 
            AND DATE(payment_date) BETWEEN :from_date AND :to_date";
        
        $revenueStmt = $db->prepare($revenueQuery);
        $revenueStmt->bindValue(':from_date', $fromDate);
        $revenueStmt->bindValue(':to_date', $toDate);
        $revenueStmt->execute();
        $revenueData = $revenueStmt->fetch(PDO::FETCH_ASSOC);
        
        // Get previous period for comparison
        $daysDiff = (strtotime($toDate) - strtotime($fromDate)) / (24 * 3600);
        $prevFromDate = date('Y-m-d', strtotime($fromDate . " -{$daysDiff} days"));
        $prevToDate = date('Y-m-d', strtotime($toDate . " -{$daysDiff} days"));
        
        $prevRevenueQuery = "SELECT COALESCE(SUM(amount), 0) as prev_revenue
            FROM payments 
            WHERE status = 'completed' 
            AND DATE(payment_date) BETWEEN :prev_from_date AND :prev_to_date";
        
        $prevRevenueStmt = $db->prepare($prevRevenueQuery);
        $prevRevenueStmt->bindValue(':prev_from_date', $prevFromDate);
        $prevRevenueStmt->bindValue(':prev_to_date', $prevToDate);
        $prevRevenueStmt->execute();
        $prevRevenueData = $prevRevenueStmt->fetch(PDO::FETCH_ASSOC);
        
        // Calculate percentage change
        $revenueChange = 0;
        if ($prevRevenueData['prev_revenue'] > 0) {
            $revenueChange = (($revenueData['total_revenue'] - $prevRevenueData['prev_revenue']) / $prevRevenueData['prev_revenue']) * 100;
        }
        
        // Calculate average order value
        $averageOrderValue = $revenueData['total_orders'] > 0 ? $revenueData['total_revenue'] / $revenueData['total_orders'] : 0;
        
        // Get best selling item
        $bestSellingQuery = "SELECT 
            mi.name,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.quantity * oi.unit_price) as total_revenue
            FROM order_items oi
            JOIN menu_items mi ON oi.item_id = mi.item_id
            JOIN orders o ON oi.order_id = o.order_id
            WHERE DATE(o.created_at) BETWEEN :from_date AND :to_date
            AND o.status != 'cancelled'
            GROUP BY oi.item_id, mi.name
            ORDER BY total_quantity DESC
            LIMIT 1";
        
        $bestSellingStmt = $db->prepare($bestSellingQuery);
        $bestSellingStmt->bindValue(':from_date', $fromDate);
        $bestSellingStmt->bindValue(':to_date', $toDate);
        $bestSellingStmt->execute();
        $bestSellingItem = $bestSellingStmt->fetch(PDO::FETCH_ASSOC);
        
        // Get total customers (approximated by unique orders)
        $customersQuery = "SELECT COUNT(DISTINCT o.order_id) as total_customers
            FROM orders o
            WHERE DATE(o.created_at) BETWEEN :from_date AND :to_date";
        
        $customersStmt = $db->prepare($customersQuery);
        $customersStmt->bindValue(':from_date', $fromDate);
        $customersStmt->bindValue(':to_date', $toDate);
        $customersStmt->execute();
        $customersData = $customersStmt->fetch(PDO::FETCH_ASSOC);
        
        jsonResponse([
            'summary' => [
                'totalRevenue' => (float)$revenueData['total_revenue'],
                'totalOrders' => (int)$revenueData['total_orders'],
                'averageOrderValue' => (float)$averageOrderValue,
                'revenueChange' => (float)$revenueChange,
                'totalCustomers' => (int)$customersData['total_customers']
            ],
            'bestSellingItem' => [
                'name' => $bestSellingItem['name'] ?? 'N/A',
                'quantity' => (int)($bestSellingItem['total_quantity'] ?? 0),
                'revenue' => (float)($bestSellingItem['total_revenue'] ?? 0)
            ],
            'dateRange' => [
                'from' => $fromDate,
                'to' => $toDate
            ]
        ]);
        
    } catch (Exception $e) {
        throw new Exception("Error fetching sales summary: " . $e->getMessage());
    }
}

function handleDailyRevenue($db) {
    $fromDate = $_GET['from'] ?? date('Y-m-d', strtotime('-30 days'));
    $toDate = $_GET['to'] ?? date('Y-m-d');
    
    try {
        // First, try to get data from daily_sales table
        $dailySalesQuery = "SELECT 
            sales_date as date,
            total_sales as revenue,
            total_orders as orders
            FROM daily_sales 
            WHERE sales_date BETWEEN :from_date AND :to_date
            ORDER BY sales_date ASC";
        
        $dailySalesStmt = $db->prepare($dailySalesQuery);
        $dailySalesStmt->bindValue(':from_date', $fromDate);
        $dailySalesStmt->bindValue(':to_date', $toDate);
        $dailySalesStmt->execute();
        $dailySalesData = $dailySalesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // If no daily_sales data, generate from payments table
        if (empty($dailySalesData)) {
            $paymentsQuery = "SELECT 
                DATE(payment_date) as date,
                COALESCE(SUM(amount), 0) as revenue,
                COUNT(DISTINCT order_id) as orders
                FROM payments 
                WHERE status = 'completed' 
                AND DATE(payment_date) BETWEEN :from_date AND :to_date
                GROUP BY DATE(payment_date)
                ORDER BY DATE(payment_date) ASC";
            
            $paymentsStmt = $db->prepare($paymentsQuery);
            $paymentsStmt->bindValue(':from_date', $fromDate);
            $paymentsStmt->bindValue(':to_date', $toDate);
            $paymentsStmt->execute();
            $dailySalesData = $paymentsStmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // Format data for chart
        $formattedData = array_map(function($row) {
            return [
                'date' => $row['date'],
                'revenue' => (float)$row['revenue'],
                'orders' => (int)$row['orders']
            ];
        }, $dailySalesData);
        
        jsonResponse($formattedData);
        
    } catch (Exception $e) {
        throw new Exception("Error fetching daily revenue: " . $e->getMessage());
    }
}

function handleBestSellingItems($db) {
    $fromDate = $_GET['from'] ?? date('Y-m-d', strtotime('-30 days'));
    $toDate = $_GET['to'] ?? date('Y-m-d');
    $limit = $_GET['limit'] ?? 10;
    
    try {
        $query = "SELECT 
            mi.name,
            mi.price,
            c.name as category,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.quantity * oi.unit_price) as total_revenue
            FROM order_items oi
            JOIN menu_items mi ON oi.item_id = mi.item_id
            JOIN categories c ON mi.category_id = c.category_id
            JOIN orders o ON oi.order_id = o.order_id
            WHERE DATE(o.created_at) BETWEEN :from_date AND :to_date
            AND o.status != 'cancelled'
            GROUP BY oi.item_id, mi.name, mi.price, c.name
            ORDER BY total_quantity DESC
            LIMIT :limit";
        
        $stmt = $db->prepare($query);
        $stmt->bindValue(':from_date', $fromDate);
        $stmt->bindValue(':to_date', $toDate);
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedItems = array_map(function($item) {
            return [
                'name' => $item['name'],
                'category' => $item['category'],
                'price' => (float)$item['price'],
                'quantity' => (int)$item['total_quantity'],
                'revenue' => (float)$item['total_revenue']
            ];
        }, $items);
        
        jsonResponse($formattedItems);
        
    } catch (Exception $e) {
        throw new Exception("Error fetching best selling items: " . $e->getMessage());
    }
}

function handleSalesAnalytics($db) {
    $fromDate = $_GET['from'] ?? date('Y-m-d', strtotime('-30 days'));
    $toDate = $_GET['to'] ?? date('Y-m-d');
    
    try {
        // Get sales by payment method
        $paymentMethodQuery = "SELECT 
            payment_method,
            COUNT(*) as count,
            SUM(amount) as total_amount
            FROM payments 
            WHERE status = 'completed' 
            AND DATE(payment_date) BETWEEN :from_date AND :to_date
            GROUP BY payment_method
            ORDER BY total_amount DESC";
        
        $paymentStmt = $db->prepare($paymentMethodQuery);
        $paymentStmt->bindValue(':from_date', $fromDate);
        $paymentStmt->bindValue(':to_date', $toDate);
        $paymentStmt->execute();
        $paymentMethods = $paymentStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get sales by category
        $categoryQuery = "SELECT 
            c.name as name,
            SUM(oi.quantity) as total_items,
            SUM(oi.quantity * oi.unit_price) as value
            FROM order_items oi
            JOIN menu_items mi ON oi.item_id = mi.item_id
            JOIN categories c ON mi.category_id = c.category_id
            JOIN orders o ON oi.order_id = o.order_id
            WHERE DATE(o.created_at) BETWEEN :from_date AND :to_date
            AND o.status != 'cancelled'
            GROUP BY c.category_id, c.name
            ORDER BY value DESC";
        
        $categoryStmt = $db->prepare($categoryQuery);
        $categoryStmt->bindValue(':from_date', $fromDate);
        $categoryStmt->bindValue(':to_date', $toDate);
        $categoryStmt->execute();
        $categories = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get hourly sales breakdown (approximate from order timestamps)
        $hourlyQuery = "SELECT 
            HOUR(o.created_at) as hour,
            COUNT(*) as order_count,
            SUM(oi.quantity * oi.unit_price) as hourly_revenue
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            WHERE DATE(o.created_at) BETWEEN :from_date AND :to_date
            AND o.status != 'cancelled'
            GROUP BY HOUR(o.created_at)
            ORDER BY hour";
        
        $hourlyStmt = $db->prepare($hourlyQuery);
        $hourlyStmt->bindValue(':from_date', $fromDate);
        $hourlyStmt->bindValue(':to_date', $toDate);
        $hourlyStmt->execute();
        $hourlyData = $hourlyStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format hourly data for frontend
        $totalHourlyRevenue = array_sum(array_column($hourlyData, 'hourly_revenue'));
        $formattedHourlyData = [];
        
        // Create 24-hour format with proper labels
        for ($i = 0; $i < 24; $i++) {
            $hourData = array_filter($hourlyData, function($h) use ($i) {
                return $h['hour'] == $i;
            });
            
            $revenue = !empty($hourData) ? array_values($hourData)[0]['hourly_revenue'] : 0;
            $percent = $totalHourlyRevenue > 0 ? ($revenue / $totalHourlyRevenue) * 100 : 0;
            
            // Format hour labels
            if ($i == 0) $hourLabel = '12-1 AM';
            elseif ($i < 12) $hourLabel = "{$i}-" . ($i + 1) . " AM";
            elseif ($i == 12) $hourLabel = '12-1 PM';
            else $hourLabel = ($i - 12) . "-" . (($i - 12) + 1) . " PM";
            
            $formattedHourlyData[] = [
                'hour' => $hourLabel,
                'percent' => round($percent, 1),
                'revenue' => (float)$revenue
            ];
        }
        
        // Format categories for chart compatibility
        $formattedCategories = array_map(function($cat) {
            return [
                'name' => $cat['name'],
                'value' => (float)$cat['value'],
                'items' => (int)$cat['total_items']
            ];
        }, $categories);
        
        jsonResponse([
            'paymentMethods' => $paymentMethods,
            'categories' => $formattedCategories,
            'hourlyDistribution' => $formattedHourlyData,
            'dateRange' => [
                'from' => $fromDate,
                'to' => $toDate
            ]
        ]);
        
    } catch (Exception $e) {
        throw new Exception("Error fetching sales analytics: " . $e->getMessage());
    }
}

/**
 * Generate a report in the specified format
 */
function handleGenerateReport($db) {
    // Get parameters
    $format = $_GET['format'] ?? 'json';
    $reportType = $_GET['type'] ?? 'sales';
    $fromDate = $_GET['from'] ?? date('Y-m-d', strtotime('-30 days'));
    $toDate = $_GET['to'] ?? date('Y-m-d');
    
    // Get report data based on type
    $reportData = [];
    
    if ($reportType === 'sales') {
        // Get sales summary
        $salesSummary = getSalesSummaryData($db, $fromDate, $toDate);
        
        // Get daily revenue
        $dailyRevenue = getDailyRevenueData($db, $fromDate, $toDate);
        
        // Get best selling items
        $bestSellingItems = getBestSellingItemsData($db, $fromDate, $toDate, 10);
        
        // Get sales analytics
        $salesAnalytics = getSalesAnalyticsData($db, $fromDate, $toDate);
        
        $reportData = [
            'summary' => $salesSummary,
            'dailyRevenue' => $dailyRevenue,
            'bestSellingItems' => $bestSellingItems,
            'analytics' => $salesAnalytics,
            'dateRange' => [
                'from' => $fromDate,
                'to' => $toDate
            ],
            'generatedAt' => date('Y-m-d H:i:s'),
            'reportType' => 'Sales Report'
        ];
    } else {
        // For inventory reports - just return a placeholder for now
        $reportData = [
            'message' => 'Inventory reports are not fully implemented yet',
            'dateRange' => [
                'from' => $fromDate,
                'to' => $toDate
            ],
            'generatedAt' => date('Y-m-d H:i:s'),
            'reportType' => 'Inventory Report'
        ];
    }
    
    // Return data in the requested format
    switch ($format) {
        case 'json':
            // Default JSON response
            jsonResponse($reportData);
            break;
            
        case 'csv':
            // Generate CSV
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="report_' . $reportType . '_' . date('Y-m-d') . '.csv"');
            
            $output = fopen('php://output', 'w');
            
            // Add headers
            fputcsv($output, ['Emiliano Ristorante - ' . ucfirst($reportType) . ' Report']);
            fputcsv($output, ['Date Range:', $fromDate . ' to ' . $toDate]);
            fputcsv($output, ['Generated:', date('Y-m-d H:i:s')]);
            fputcsv($output, []);
            
            if ($reportType === 'sales') {
                // Summary section
                fputcsv($output, ['SUMMARY']);
                fputcsv($output, ['Total Revenue', $reportData['summary']['summary']['totalRevenue']]);
                fputcsv($output, ['Total Orders', $reportData['summary']['summary']['totalOrders']]);
                fputcsv($output, ['Average Order Value', $reportData['summary']['summary']['averageOrderValue']]);
                fputcsv($output, ['Best Selling Item', $reportData['summary']['bestSellingItem']['name'] . ' (' . $reportData['summary']['bestSellingItem']['quantity'] . ' sold)']);
                fputcsv($output, []);
                
                // Daily revenue
                fputcsv($output, ['DAILY REVENUE']);
                fputcsv($output, ['Date', 'Revenue', 'Orders']);
                foreach ($reportData['dailyRevenue'] as $day) {
                    fputcsv($output, [$day['date'], $day['revenue'], $day['orders']]);
                }
                fputcsv($output, []);
                
                // Best selling items
                fputcsv($output, ['BEST SELLING ITEMS']);
                fputcsv($output, ['Item', 'Category', 'Quantity', 'Revenue']);
                foreach ($reportData['bestSellingItems'] as $item) {
                    fputcsv($output, [$item['name'], $item['category'], $item['quantity'], $item['revenue']]);
                }
            }
            
            exit;
            
        case 'pdf':
            // Generate PDF file
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="report_' . $reportType . '_' . date('Y-m-d') . '.pdf"');
            
            // Simple HTML to PDF conversion using output buffering
            ob_start();
            ?>
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Emiliano Ristorante - <?= ucfirst($reportType) ?> Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; text-align: center; }
                    h2 { color: #555; margin-top: 20px; }
                    .date-range { text-align: center; color: #777; margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th { background-color: #f2f2f2; text-align: left; padding: 8px; }
                    td { border-bottom: 1px solid #ddd; padding: 8px; }
                    .summary-box { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; }
                    .summary-item { display: flex; justify-content: space-between; margin-bottom: 10px; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
                </style>
            </head>
            <body>
                <h1>Emiliano Ristorante</h1>
                <h2><?= ucfirst($reportType) ?> Report</h2>
                <div class="date-range">Date Range: <?= $fromDate ?> to <?= $toDate ?></div>
                
                <?php if ($reportType === 'sales'): ?>
                    <div class="summary-box">
                        <h3>Summary</h3>
                        <div class="summary-item">
                            <span>Total Revenue:</span>
                            <span>₱<?= number_format($reportData['summary']['summary']['totalRevenue'], 2) ?></span>
                        </div>
                        <div class="summary-item">
                            <span>Total Orders:</span>
                            <span><?= $reportData['summary']['summary']['totalOrders'] ?></span>
                        </div>
                        <div class="summary-item">
                            <span>Average Order Value:</span>
                            <span>₱<?= number_format($reportData['summary']['summary']['averageOrderValue'], 2) ?></span>
                        </div>
                        <div class="summary-item">
                            <span>Best Selling Item:</span>
                            <span><?= $reportData['summary']['bestSellingItem']['name'] ?> (<?= $reportData['summary']['bestSellingItem']['quantity'] ?> sold)</span>
                        </div>
                    </div>
                    
                    <h3>Best Selling Items</h3>
                    <table>
                        <tr>
                            <th>Item</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Revenue</th>
                        </tr>
                        <?php foreach ($reportData['bestSellingItems'] as $item): ?>
                        <tr>
                            <td><?= $item['name'] ?></td>
                            <td><?= $item['category'] ?></td>
                            <td><?= $item['quantity'] ?></td>
                            <td>₱<?= number_format($item['revenue'], 2) ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                    
                    <h3>Daily Revenue</h3>
                    <table>
                        <tr>
                            <th>Date</th>
                            <th>Revenue</th>
                            <th>Orders</th>
                        </tr>
                        <?php foreach ($reportData['dailyRevenue'] as $day): ?>
                        <tr>
                            <td><?= $day['date'] ?></td>
                            <td>₱<?= number_format($day['revenue'], 2) ?></td>
                            <td><?= $day['orders'] ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                <?php else: ?>
                    <p>Inventory report data is not fully implemented yet.</p>
                <?php endif; ?>
                
                <div class="footer">
                    Generated on <?= date('Y-m-d H:i:s') ?> | Emiliano Ristorante POS System
                </div>
            </body>
            </html>
            <?php
            $html = ob_get_clean();
            
            // Convert HTML to PDF using a simple method (in a real app, you would use a library like TCPDF or mPDF)
            // For this example, we'll just output the HTML with PDF headers
            echo $html;
            exit;
            
        case 'excel':
            // Generate Excel file
            header('Content-Type: application/vnd.ms-excel');
            header('Content-Disposition: attachment; filename="report_' . $reportType . '_' . date('Y-m-d') . '.xls"');
            
            // Simple HTML table that Excel can open
            ob_start();
            ?>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Emiliano Ristorante - <?= ucfirst($reportType) ?> Report</title>
            </head>
            <body>
                <h1>Emiliano Ristorante - <?= ucfirst($reportType) ?> Report</h1>
                <p>Date Range: <?= $fromDate ?> to <?= $toDate ?></p>
                <p>Generated: <?= date('Y-m-d H:i:s') ?></p>
                
                <?php if ($reportType === 'sales'): ?>
                    <h2>Summary</h2>
                    <table border="1">
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                        </tr>
                        <tr>
                            <td>Total Revenue</td>
                            <td>₱<?= number_format($reportData['summary']['summary']['totalRevenue'], 2) ?></td>
                        </tr>
                        <tr>
                            <td>Total Orders</td>
                            <td><?= $reportData['summary']['summary']['totalOrders'] ?></td>
                        </tr>
                        <tr>
                            <td>Average Order Value</td>
                            <td>₱<?= number_format($reportData['summary']['summary']['averageOrderValue'], 2) ?></td>
                        </tr>
                        <tr>
                            <td>Best Selling Item</td>
                            <td><?= $reportData['summary']['bestSellingItem']['name'] ?> (<?= $reportData['summary']['bestSellingItem']['quantity'] ?> sold)</td>
                        </tr>
                    </table>
                    
                    <h2>Best Selling Items</h2>
                    <table border="1">
                        <tr>
                            <th>Item</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Revenue</th>
                        </tr>
                        <?php foreach ($reportData['bestSellingItems'] as $item): ?>
                        <tr>
                            <td><?= $item['name'] ?></td>
                            <td><?= $item['category'] ?></td>
                            <td><?= $item['quantity'] ?></td>
                            <td>₱<?= number_format($item['revenue'], 2) ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                    
                    <h2>Daily Revenue</h2>
                    <table border="1">
                        <tr>
                            <th>Date</th>
                            <th>Revenue</th>
                            <th>Orders</th>
                        </tr>
                        <?php foreach ($reportData['dailyRevenue'] as $day): ?>
                        <tr>
                            <td><?= $day['date'] ?></td>
                            <td>₱<?= number_format($day['revenue'], 2) ?></td>
                            <td><?= $day['orders'] ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                <?php else: ?>
                    <p>Inventory report data is not fully implemented yet.</p>
                <?php endif; ?>
            </body>
            </html>
            <?php
            $html = ob_get_clean();
            echo $html;
            exit;
            
        case 'print':
            // Generate print-friendly HTML
            header('Content-Type: text/html');
            ?>
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Emiliano Ristorante - <?= ucfirst($reportType) ?> Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; text-align: center; }
                    h2 { color: #555; margin-top: 20px; }
                    .date-range { text-align: center; color: #777; margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th { background-color: #f2f2f2; text-align: left; padding: 8px; }
                    td { border-bottom: 1px solid #ddd; padding: 8px; }
                    .summary-box { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; }
                    .summary-item { display: flex; justify-content: space-between; margin-bottom: 10px; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
                    @media print {
                        body { font-size: 12pt; }
                        h1 { font-size: 18pt; }
                        h2 { font-size: 16pt; }
                        .no-print { display: none; }
                        button { display: none; }
                    }
                </style>
                <script>
                    window.onload = function() {
                        // Auto-print when the page loads
                        window.print();
                    }
                </script>
            </head>
            <body>
                <div class="no-print" style="text-align: center; margin-bottom: 20px;">
                    <button onclick="window.print()">Print Report</button>
                </div>
                
                <h1>Emiliano Ristorante</h1>
                <h2><?= ucfirst($reportType) ?> Report</h2>
                <div class="date-range">Date Range: <?= $fromDate ?> to <?= $toDate ?></div>
                
                <?php if ($reportType === 'sales'): ?>
                    <div class="summary-box">
                        <h3>Summary</h3>
                        <div class="summary-item">
                            <span>Total Revenue:</span>
                            <span>₱<?= number_format($reportData['summary']['summary']['totalRevenue'], 2) ?></span>
                        </div>
                        <div class="summary-item">
                            <span>Total Orders:</span>
                            <span><?= $reportData['summary']['summary']['totalOrders'] ?></span>
                        </div>
                        <div class="summary-item">
                            <span>Average Order Value:</span>
                            <span>₱<?= number_format($reportData['summary']['summary']['averageOrderValue'], 2) ?></span>
                        </div>
                        <div class="summary-item">
                            <span>Best Selling Item:</span>
                            <span><?= $reportData['summary']['bestSellingItem']['name'] ?> (<?= $reportData['summary']['bestSellingItem']['quantity'] ?> sold)</span>
                        </div>
                    </div>
                    
                    <h3>Best Selling Items</h3>
                    <table>
                        <tr>
                            <th>Item</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Revenue</th>
                        </tr>
                        <?php foreach ($reportData['bestSellingItems'] as $item): ?>
                        <tr>
                            <td><?= $item['name'] ?></td>
                            <td><?= $item['category'] ?></td>
                            <td><?= $item['quantity'] ?></td>
                            <td>₱<?= number_format($item['revenue'], 2) ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                    
                    <h3>Daily Revenue</h3>
                    <table>
                        <tr>
                            <th>Date</th>
                            <th>Revenue</th>
                            <th>Orders</th>
                        </tr>
                        <?php foreach ($reportData['dailyRevenue'] as $day): ?>
                        <tr>
                            <td><?= $day['date'] ?></td>
                            <td>₱<?= number_format($day['revenue'], 2) ?></td>
                            <td><?= $day['orders'] ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                <?php else: ?>
                    <p>Inventory report data is not fully implemented yet.</p>
                <?php endif; ?>
                
                <div class="footer">
                    Generated on <?= date('Y-m-d H:i:s') ?> | Emiliano Ristorante POS System
                </div>
            </body>
            </html>
            <?php
            exit;
            
        default:
            errorResponse("Unsupported format: " . $format);
    }
}

/**
 * Helper function to get sales summary data
 */
function getSalesSummaryData($db, $fromDate, $toDate) {
    // Get total revenue from payments
    $revenueQuery = "SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(DISTINCT order_id) as total_orders
        FROM payments 
        WHERE status = 'completed' 
        AND DATE(payment_date) BETWEEN :from_date AND :to_date";
    
    $revenueStmt = $db->prepare($revenueQuery);
    $revenueStmt->bindValue(':from_date', $fromDate);
    $revenueStmt->bindValue(':to_date', $toDate);
    $revenueStmt->execute();
    $revenueData = $revenueStmt->fetch(PDO::FETCH_ASSOC);
    
    // Get previous period for comparison
    $daysDiff = (strtotime($toDate) - strtotime($fromDate)) / (24 * 3600);
    $prevFromDate = date('Y-m-d', strtotime($fromDate . " -{$daysDiff} days"));
    $prevToDate = date('Y-m-d', strtotime($toDate . " -{$daysDiff} days"));
    
    $prevRevenueQuery = "SELECT COALESCE(SUM(amount), 0) as prev_revenue
        FROM payments 
        WHERE status = 'completed' 
        AND DATE(payment_date) BETWEEN :prev_from_date AND :prev_to_date";
    
    $prevRevenueStmt = $db->prepare($prevRevenueQuery);
    $prevRevenueStmt->bindValue(':prev_from_date', $prevFromDate);
    $prevRevenueStmt->bindValue(':prev_to_date', $prevToDate);
    $prevRevenueStmt->execute();
    $prevRevenueData = $prevRevenueStmt->fetch(PDO::FETCH_ASSOC);
    
    // Calculate percentage change
    $revenueChange = 0;
    if ($prevRevenueData['prev_revenue'] > 0) {
        $revenueChange = (($revenueData['total_revenue'] - $prevRevenueData['prev_revenue']) / $prevRevenueData['prev_revenue']) * 100;
    }
    
    // Calculate average order value
    $averageOrderValue = $revenueData['total_orders'] > 0 ? $revenueData['total_revenue'] / $revenueData['total_orders'] : 0;
    
    // Get best selling item
    $bestSellingQuery = "SELECT 
        mi.name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.unit_price) as total_revenue
        FROM order_items oi
        JOIN menu_items mi ON oi.item_id = mi.item_id
        JOIN orders o ON oi.order_id = o.order_id
        WHERE DATE(o.created_at) BETWEEN :from_date AND :to_date
        AND o.status != 'cancelled'
        GROUP BY oi.item_id, mi.name
        ORDER BY total_quantity DESC
        LIMIT 1";
    
    $bestSellingStmt = $db->prepare($bestSellingQuery);
    $bestSellingStmt->bindValue(':from_date', $fromDate);
    $bestSellingStmt->bindValue(':to_date', $toDate);
    $bestSellingStmt->execute();
    $bestSellingItem = $bestSellingStmt->fetch(PDO::FETCH_ASSOC);
    
    // Get total customers (approximation based on orders)
    $customersQuery = "SELECT COUNT(DISTINCT table_id) as total_customers
        FROM orders
        WHERE DATE(created_at) BETWEEN :from_date AND :to_date";
    
    $customersStmt = $db->prepare($customersQuery);
    $customersStmt->bindValue(':from_date', $fromDate);
    $customersStmt->bindValue(':to_date', $toDate);
    $customersStmt->execute();
    $customersData = $customersStmt->fetch(PDO::FETCH_ASSOC);
    
    return [
        'summary' => [
            'totalRevenue' => (float)$revenueData['total_revenue'],
            'totalOrders' => (int)$revenueData['total_orders'],
            'averageOrderValue' => $averageOrderValue,
            'revenueChange' => $revenueChange,
            'totalCustomers' => (int)$customersData['total_customers']
        ],
        'bestSellingItem' => [
            'name' => $bestSellingItem['name'] ?? 'No data',
            'quantity' => (int)($bestSellingItem['total_quantity'] ?? 0),
            'revenue' => (float)($bestSellingItem['total_revenue'] ?? 0)
        ],
        'dateRange' => [
            'from' => $fromDate,
            'to' => $toDate
        ]
    ];
}

/**
 * Helper function to get daily revenue data
 */
function getDailyRevenueData($db, $fromDate, $toDate) {
    $query = "SELECT 
        DATE(p.payment_date) as date,
        SUM(p.amount) as revenue,
        COUNT(DISTINCT p.order_id) as orders
        FROM payments p
        WHERE p.status = 'completed'
        AND DATE(p.payment_date) BETWEEN :from_date AND :to_date
        GROUP BY DATE(p.payment_date)
        ORDER BY DATE(p.payment_date)";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':from_date', $fromDate);
    $stmt->bindValue(':to_date', $toDate);
    $stmt->execute();
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Helper function to get best selling items data
 */
function getBestSellingItemsData($db, $fromDate, $toDate, $limit = 10) {
    $query = "SELECT 
        mi.name,
        c.name as category,
        mi.price,
        SUM(oi.quantity) as quantity,
        SUM(oi.quantity * oi.unit_price) as revenue
        FROM order_items oi
        JOIN menu_items mi ON oi.item_id = mi.item_id
        JOIN categories c ON mi.category_id = c.category_id
        JOIN orders o ON oi.order_id = o.order_id
        WHERE DATE(o.created_at) BETWEEN :from_date AND :to_date
        AND o.status != 'cancelled'
        GROUP BY oi.item_id, mi.name, c.name, mi.price
        ORDER BY quantity DESC
        LIMIT :limit";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':from_date', $fromDate);
    $stmt->bindValue(':to_date', $toDate);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Helper function to get sales analytics data
 */
function getSalesAnalyticsData($db, $fromDate, $toDate) {
    // Get sales by payment method
    $paymentMethodsQuery = "SELECT 
        COALESCE(payment_method, 'Unknown') as payment_method,
        COUNT(*) as count,
        SUM(amount) as total_amount
        FROM payments
        WHERE status = 'completed'
        AND DATE(payment_date) BETWEEN :from_date AND :to_date
        GROUP BY payment_method
        ORDER BY total_amount DESC";
    
    $paymentMethodsStmt = $db->prepare($paymentMethodsQuery);
    $paymentMethodsStmt->bindValue(':from_date', $fromDate);
    $paymentMethodsStmt->bindValue(':to_date', $toDate);
    $paymentMethodsStmt->execute();
    $paymentMethods = $paymentMethodsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get sales by category
    $categoriesQuery = "SELECT 
        c.name,
        SUM(oi.quantity * oi.unit_price) as value,
        COUNT(DISTINCT oi.item_id) as items
        FROM order_items oi
        JOIN menu_items mi ON oi.item_id = mi.item_id
        JOIN categories c ON mi.category_id = c.category_id
        JOIN orders o ON oi.order_id = o.order_id
        WHERE DATE(o.created_at) BETWEEN :from_date AND :to_date
        AND o.status != 'cancelled'
        GROUP BY c.name
        ORDER BY value DESC";
    
    $categoriesStmt = $db->prepare($categoriesQuery);
    $categoriesStmt->bindValue(':from_date', $fromDate);
    $categoriesStmt->bindValue(':to_date', $toDate);
    $categoriesStmt->execute();
    $categories = $categoriesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get hourly distribution
    $hourlyQuery = "SELECT 
        HOUR(o.created_at) as hour,
        COUNT(*) as count,
        SUM(p.amount) as revenue
        FROM orders o
        JOIN payments p ON o.order_id = p.order_id
        WHERE DATE(o.created_at) BETWEEN :from_date AND :to_date
        AND p.status = 'completed'
        GROUP BY HOUR(o.created_at)
        ORDER BY HOUR(o.created_at)";
    
    $hourlyStmt = $db->prepare($hourlyQuery);
    $hourlyStmt->bindValue(':from_date', $fromDate);
    $hourlyStmt->bindValue(':to_date', $toDate);
    $hourlyStmt->execute();
    $hourlyData = $hourlyStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate percentages for hourly distribution
    $totalOrders = 0;
    foreach ($hourlyData as $hour) {
        $totalOrders += $hour['count'];
    }
    
    $hourlyDistribution = [];
    foreach ($hourlyData as $hour) {
        $percent = $totalOrders > 0 ? ($hour['count'] / $totalOrders) * 100 : 0;
        $hourlyDistribution[] = [
            'hour' => sprintf('%02d:00', $hour['hour']),
            'percent' => $percent,
            'revenue' => (float)$hour['revenue']
        ];
    }
    
    return [
        'paymentMethods' => $paymentMethods,
        'categories' => $categories,
        'hourlyDistribution' => $hourlyDistribution,
        'dateRange' => [
            'from' => $fromDate,
            'to' => $toDate
        ]
    ];
}
?> 