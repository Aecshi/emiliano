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
        case 'POST':
            if ($path === '/update-status') {
                handleUpdateOrderStatus($db);
            } elseif ($path === '/update-payment') {
                handleUpdatePayment($db);
            } else {
                handleCreateOrder($db);
            }
            break;
        case 'GET':
            handleGetOrders($db);
            break;
        case 'PUT':
            if ($path === '/update-status') {
                handleUpdateOrderStatus($db);
            } elseif ($path === '/update-payment') {
                handleUpdatePayment($db);
            } else {
                errorResponse("Invalid endpoint", 404);
            }
            break;
        default:
            errorResponse("Method not allowed", 405);
    }
} catch (Exception $e) {
    errorResponse("Error: " . $e->getMessage());
}

function handleCreateOrder($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['tableNumber']) || !isset($input['items']) || !is_array($input['items'])) {
        errorResponse("Missing required fields: tableNumber, items", 400);
    }
    
    $tableNumber = $input['tableNumber'];
    $items = $input['items'];
    $notes = $input['notes'] ?? '';
    $paymentMethod = $input['paymentMethod'] ?? 'cash';
    $paymentStatus = $input['paymentStatus'] ?? 'unpaid';
    
    try {
        $db->beginTransaction();
        
        // Find the table ID from table number
        $tableQuery = "SELECT table_id FROM restaurant_tables WHERE table_number = :table_number";
        $tableStmt = $db->prepare($tableQuery);
        $tableStmt->bindValue(':table_number', $tableNumber);
        $tableStmt->execute();
        $tableData = $tableStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$tableData) {
            throw new Exception("Table not found: " . $tableNumber);
        }
        
        $tableId = $tableData['table_id'];
        
        // Create the order
        $orderQuery = "INSERT INTO orders (table_id, user_id, order_type, status, payment_status, notes, created_at) 
                      VALUES (:table_id, 1, 'dine_in', 'pending', :payment_status, :notes, NOW())";
        $orderStmt = $db->prepare($orderQuery);
        $orderStmt->bindValue(':table_id', $tableId);
        $orderStmt->bindValue(':payment_status', $paymentStatus);
        $orderStmt->bindValue(':notes', $notes);
        $orderStmt->execute();
        
        $orderId = $db->lastInsertId();
        
        // Add order items
        $totalAmount = 0;
        foreach ($items as $item) {
            if (!isset($item['id']) || !isset($item['quantity']) || !isset($item['price'])) {
                throw new Exception("Invalid item data");
            }
            
            $itemNotes = $item['notes'] ?? '';
            
            $itemQuery = "INSERT INTO order_items (order_id, item_id, quantity, unit_price, notes, created_at) 
                         VALUES (:order_id, :item_id, :quantity, :unit_price, :notes, NOW())";
            $itemStmt = $db->prepare($itemQuery);
            $itemStmt->bindValue(':order_id', $orderId);
            $itemStmt->bindValue(':item_id', $item['id']);
            $itemStmt->bindValue(':quantity', $item['quantity']);
            $itemStmt->bindValue(':unit_price', $item['price']);
            $itemStmt->bindValue(':notes', $itemNotes);
            $itemStmt->execute();
            
            $totalAmount += $item['quantity'] * $item['price'];
        }
        
        // Update table status to occupied if it's available
        $updateTableQuery = "UPDATE restaurant_tables SET status = 'occupied', updated_at = NOW() 
                            WHERE table_id = :table_id AND status = 'available'";
        $updateTableStmt = $db->prepare($updateTableQuery);
        $updateTableStmt->bindValue(':table_id', $tableId);
        $updateTableStmt->execute();
        
        // Create payment record if paid
        if ($paymentStatus === 'paid') {
            // Get cash and change info from input if provided
            $cashGiven = $input['cashGiven'] ?? $totalAmount + 100; // Default value for demonstration
            $changeAmount = $input['changeAmount'] ?? 100; // Default value for demonstration
            
            $paymentQuery = "INSERT INTO payments (order_id, amount, payment_method, status, cash_given, change_amount, payment_date, user_id) 
                            VALUES (:order_id, :amount, :payment_method, 'completed', :cash_given, :change_amount, NOW(), 1)";
            $paymentStmt = $db->prepare($paymentQuery);
            $paymentStmt->bindValue(':order_id', $orderId);
            $paymentStmt->bindValue(':amount', $totalAmount);
            $paymentStmt->bindValue(':payment_method', $paymentMethod);
            $paymentStmt->bindValue(':cash_given', $cashGiven);
            $paymentStmt->bindValue(':change_amount', $changeAmount);
            $paymentStmt->execute();
            
            $paymentId = $db->lastInsertId();
            
            // Create receipt for this payment
            if ($paymentId) {
                // Zero tax as requested
                $subtotal = $totalAmount;
                $taxAmount = 0;
                
                // Generate receipt number
                $receiptNumber = 'RCP-' . date('Ymd') . '-' . str_pad($orderId, 4, '0', STR_PAD_LEFT);
                
                // Create new receipt
                $insertReceiptQuery = "INSERT INTO receipts (
                                      receipt_number, order_id, payment_id, 
                                      subtotal, tax_amount, discount_amount, total_amount,
                                      cash_given, change_amount, customer_name, created_by
                                      ) VALUES (
                                      :receipt_number, :order_id, :payment_id,
                                      :subtotal, :tax_amount, 0, :total_amount,
                                      :cash_given, :change_amount, :customer_name, 1
                                      )";
                $receiptStmt = $db->prepare($insertReceiptQuery);
                $receiptStmt->bindValue(':receipt_number', $receiptNumber);
                $receiptStmt->bindValue(':order_id', $orderId);
                $receiptStmt->bindValue(':payment_id', $paymentId);
                $receiptStmt->bindValue(':subtotal', $subtotal);
                $receiptStmt->bindValue(':tax_amount', $taxAmount);
                $receiptStmt->bindValue(':total_amount', $totalAmount);
                $receiptStmt->bindValue(':cash_given', $cashGiven);
                $receiptStmt->bindValue(':change_amount', $changeAmount);
                $receiptStmt->bindValue(':customer_name', $notes); // Using notes as customer name for now
                $receiptStmt->execute();
            }
        }
        
        $db->commit();
        
        jsonResponse([
            'success' => true,
            'orderId' => $orderId,
            'message' => 'Order created successfully',
            'totalAmount' => $totalAmount
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

function handleGetOrders($db) {
    // Check if we need to filter by table_id
    $tableId = isset($_GET['table_id']) ? $_GET['table_id'] : null;
    
    // Get all orders with their items
    $query = "SELECT 
        o.order_id,
        o.table_id,
        rt.table_number,
        o.status,
        o.payment_status,
        o.created_at,
        o.notes,
        oi.item_id,
        mi.name as item_name,
        oi.quantity,
        oi.unit_price,
        oi.notes as item_notes
    FROM orders o
    JOIN restaurant_tables rt ON o.table_id = rt.table_id
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    LEFT JOIN menu_items mi ON oi.item_id = mi.item_id
    WHERE o.status IN ('pending', 'in_progress', 'ready')";
    
    // Add table filter if specified
    if ($tableId) {
        $query .= " AND o.table_id = :table_id";
    }
    
    $query .= " ORDER BY o.created_at DESC, oi.order_item_id ASC";
    
    $stmt = $db->prepare($query);
    
    // Bind table_id if specified
    if ($tableId) {
        $stmt->bindValue(':table_id', $tableId);
    }
    
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Group orders and their items
    $ordersMap = [];
    
    foreach ($results as $row) {
        $orderId = $row['order_id'];
        
        if (!isset($ordersMap[$orderId])) {
            $ordersMap[$orderId] = [
                'order_id' => (int)$row['order_id'],
                'table_id' => (int)$row['table_id'],
                'table_number' => $row['table_number'],
                'status' => $row['status'],
                'payment_status' => $row['payment_status'],
                'created_at' => $row['created_at'],
                'notes' => $row['notes'],
                'items' => [],
                'total_amount' => 0
            ];
        }
        
        if ($row['item_id']) {
            $ordersMap[$orderId]['items'][] = [
                'item_id' => (int)$row['item_id'],
                'name' => $row['item_name'],
                'quantity' => (int)$row['quantity'],
                'unit_price' => (float)$row['unit_price'],
                'notes' => $row['item_notes']
            ];
            
            $ordersMap[$orderId]['total_amount'] += $row['quantity'] * $row['unit_price'];
        }
    }
    
    // Convert to indexed array
    $orders = array_values($ordersMap);
    
    jsonResponse($orders);
}

function handleUpdateOrderStatus($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['orderId']) || !isset($input['status'])) {
        errorResponse("Missing required fields: orderId, status", 400);
    }
    
    $orderId = $input['orderId'];
    $status = $input['status'];
    
    // Validate status
    $validStatuses = ['pending', 'in_progress', 'ready', 'completed', 'served', 'cancelled'];
    if (!in_array($status, $validStatuses)) {
        errorResponse("Invalid status. Must be one of: " . implode(', ', $validStatuses), 400);
    }
    
    try {
        $db->beginTransaction();
        
        // Update order status
        $query = "UPDATE orders SET status = :status WHERE order_id = :order_id";
        $stmt = $db->prepare($query);
        $stmt->bindValue(':status', $status);
        $stmt->bindValue(':order_id', $orderId);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            throw new Exception("Order not found or status not changed");
        }
        
        // If order is completed/served, optionally free the table
        if ($status === 'completed' || $status === 'served') {
            // Get the table for this order
            $tableQuery = "SELECT table_id FROM orders WHERE order_id = :order_id";
            $tableStmt = $db->prepare($tableQuery);
            $tableStmt->bindValue(':order_id', $orderId);
            $tableStmt->execute();
            $tableData = $tableStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($tableData) {
                // Check if this table has any other active orders
                $activeOrdersQuery = "SELECT COUNT(*) as active_count FROM orders 
                                    WHERE table_id = :table_id 
                                    AND status IN ('pending', 'in_progress', 'ready')
                                    AND order_id != :current_order_id";
                $activeStmt = $db->prepare($activeOrdersQuery);
                $activeStmt->bindValue(':table_id', $tableData['table_id']);
                $activeStmt->bindValue(':current_order_id', $orderId);
                $activeStmt->execute();
                $activeCount = $activeStmt->fetch(PDO::FETCH_ASSOC)['active_count'];
                
                // If no other active orders, mark table as available
                if ($activeCount == 0) {
                    $updateTableQuery = "UPDATE restaurant_tables SET status = 'available', updated_at = NOW() 
                                        WHERE table_id = :table_id";
                    $updateTableStmt = $db->prepare($updateTableQuery);
                    $updateTableStmt->bindValue(':table_id', $tableData['table_id']);
                    $updateTableStmt->execute();
                }
            }
        }
        
        $db->commit();
        
        jsonResponse([
            'success' => true,
            'message' => 'Order status updated successfully',
            'orderId' => $orderId,
            'newStatus' => $status
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

function handleUpdatePayment($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['orderId']) || !isset($input['paymentStatus'])) {
        errorResponse("Missing required fields: orderId, paymentStatus", 400);
    }
    
    $orderId = $input['orderId'];
    $paymentStatus = $input['paymentStatus'];
    $paymentMethod = $input['paymentMethod'] ?? 'cash';
    $amount = $input['amount'] ?? null;
    $cashGiven = $input['cashGiven'] ?? null;
    $changeAmount = $input['changeAmount'] ?? null;
    
    // Validate payment status
    $validPaymentStatuses = ['paid', 'unpaid', 'pending', 'refunded'];
    if (!in_array($paymentStatus, $validPaymentStatuses)) {
        errorResponse("Invalid payment status. Must be one of: " . implode(', ', $validPaymentStatuses), 400);
    }
    
    try {
        $db->beginTransaction();
        
        // Update order payment status
        $query = "UPDATE orders SET payment_status = :payment_status WHERE order_id = :order_id";
        $stmt = $db->prepare($query);
        $stmt->bindValue(':payment_status', $paymentStatus);
        $stmt->bindValue(':order_id', $orderId);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            throw new Exception("Order not found or payment status not changed");
        }
        
        // If payment is marked as paid, create a payment record
        if ($paymentStatus === 'paid') {
            // Calculate total amount if not provided
            if ($amount === null) {
                $amountQuery = "SELECT SUM(oi.quantity * oi.unit_price) as total_amount 
                               FROM order_items oi WHERE oi.order_id = :order_id";
                $amountStmt = $db->prepare($amountQuery);
                $amountStmt->bindValue(':order_id', $orderId);
                $amountStmt->execute();
                $amountData = $amountStmt->fetch(PDO::FETCH_ASSOC);
                $amount = $amountData['total_amount'] ?? 0;
            }
            
            // Check if payment record already exists
            $existingPaymentQuery = "SELECT payment_id FROM payments WHERE order_id = :order_id";
            $existingStmt = $db->prepare($existingPaymentQuery);
            $existingStmt->bindValue(':order_id', $orderId);
            $existingStmt->execute();
            $existingPayment = $existingStmt->fetch(PDO::FETCH_ASSOC);
            $paymentId = null;
            
            if ($existingPayment) {
                // Update existing payment record
                $paymentId = $existingPayment['payment_id'];
                $updatePaymentQuery = "UPDATE payments SET 
                                      amount = :amount, 
                                      payment_method = :payment_method, 
                                      status = 'completed',
                                      cash_given = :cash_given,
                                      change_amount = :change_amount,
                                      payment_date = NOW()
                                      WHERE order_id = :order_id";
                $paymentStmt = $db->prepare($updatePaymentQuery);
            } else {
                // Create new payment record
                $updatePaymentQuery = "INSERT INTO payments (order_id, amount, payment_method, status, cash_given, change_amount, payment_date, user_id) 
                                      VALUES (:order_id, :amount, :payment_method, 'completed', :cash_given, :change_amount, NOW(), 1)";
                $paymentStmt = $db->prepare($updatePaymentQuery);
            }
            
            $paymentStmt->bindValue(':order_id', $orderId);
            $paymentStmt->bindValue(':amount', $amount);
            $paymentStmt->bindValue(':payment_method', $paymentMethod);
            $paymentStmt->bindValue(':cash_given', $cashGiven);
            $paymentStmt->bindValue(':change_amount', $changeAmount);
            $paymentStmt->execute();
            
            if (!$existingPayment) {
                $paymentId = $db->lastInsertId();
            }
            
            // Create or update a receipt for this payment
            if ($paymentId) {
                // Check if a receipt already exists
                $checkReceiptQuery = "SELECT receipt_id FROM receipts WHERE order_id = :order_id";
                $checkReceiptStmt = $db->prepare($checkReceiptQuery);
                $checkReceiptStmt->bindValue(':order_id', $orderId);
                $checkReceiptStmt->execute();
                $receiptExists = $checkReceiptStmt->fetch(PDO::FETCH_ASSOC);
                
                // Zero tax as requested
                $subtotal = $amount;
                $taxAmount = 0;
                
                // Get customer name from order if available
                $customerQuery = "SELECT customer_name FROM orders WHERE order_id = :order_id";
                $customerStmt = $db->prepare($customerQuery);
                $customerStmt->bindValue(':order_id', $orderId);
                $customerStmt->execute();
                $customerData = $customerStmt->fetch(PDO::FETCH_ASSOC);
                $customerName = $customerData['customer_name'] ?? null;
                
                // Generate receipt number
                $receiptNumber = 'RCP-' . date('Ymd') . '-' . str_pad($orderId, 4, '0', STR_PAD_LEFT);
                
                if ($receiptExists) {
                    // Update existing receipt
                    $updateReceiptQuery = "UPDATE receipts SET 
                                          subtotal = :subtotal,
                                          tax_amount = :tax_amount,
                                          total_amount = :total_amount,
                                          cash_given = :cash_given,
                                          change_amount = :change_amount,
                                          customer_name = :customer_name
                                          WHERE order_id = :order_id";
                    $receiptStmt = $db->prepare($updateReceiptQuery);
                    $receiptStmt->bindValue(':subtotal', $subtotal);
                    $receiptStmt->bindValue(':tax_amount', $taxAmount);
                    $receiptStmt->bindValue(':total_amount', $amount);
                    $receiptStmt->bindValue(':cash_given', $cashGiven);
                    $receiptStmt->bindValue(':change_amount', $changeAmount);
                    $receiptStmt->bindValue(':customer_name', $customerName);
                    $receiptStmt->bindValue(':order_id', $orderId);
                    $receiptStmt->execute();
                } else {
                    // Create new receipt
                    $insertReceiptQuery = "INSERT INTO receipts (
                                          receipt_number, order_id, payment_id, 
                                          subtotal, tax_amount, discount_amount, total_amount,
                                          cash_given, change_amount, customer_name, created_by
                                          ) VALUES (
                                          :receipt_number, :order_id, :payment_id,
                                          :subtotal, :tax_amount, 0, :total_amount,
                                          :cash_given, :change_amount, :customer_name, 1
                                          )";
                    $receiptStmt = $db->prepare($insertReceiptQuery);
                    $receiptStmt->bindValue(':receipt_number', $receiptNumber);
                    $receiptStmt->bindValue(':order_id', $orderId);
                    $receiptStmt->bindValue(':payment_id', $paymentId);
                    $receiptStmt->bindValue(':subtotal', $subtotal);
                    $receiptStmt->bindValue(':tax_amount', $taxAmount);
                    $receiptStmt->bindValue(':total_amount', $amount);
                    $receiptStmt->bindValue(':cash_given', $cashGiven);
                    $receiptStmt->bindValue(':change_amount', $changeAmount);
                    $receiptStmt->bindValue(':customer_name', $customerName);
                    $receiptStmt->execute();
                }
            }
        }
        
        $db->commit();
        
        jsonResponse([
            'success' => true,
            'message' => 'Payment status updated successfully',
            'orderId' => $orderId,
            'paymentStatus' => $paymentStatus,
            'paymentMethod' => $paymentMethod
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}
?> 