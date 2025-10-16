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
            if (isset($_GET['id'])) {
                handleGetReceiptById($db, $_GET['id']);
            } else {
                handleGetReceipts($db);
            }
            break;
        case 'POST':
            handleCreateReceipt($db);
            break;
        case 'PUT':
            handleUpdateReceipt($db);
            break;
        default:
            errorResponse("Method not allowed", 405);
    }
} catch (Exception $e) {
    errorResponse("Error: " . $e->getMessage());
}

/**
 * Get a list of all receipts
 */
function handleGetReceipts($db) {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    $searchTerm = isset($_GET['search']) ? $_GET['search'] : '';
    $fromDate = isset($_GET['from']) ? $_GET['from'] : null;
    $toDate = isset($_GET['to']) ? $_GET['to'] : null;
    
    $query = "SELECT 
                r.receipt_id, 
                r.receipt_number, 
                r.order_id, 
                r.payment_id, 
                r.subtotal, 
                r.tax_amount, 
                r.discount_amount, 
                r.total_amount, 
                r.cash_given, 
                r.change_amount, 
                r.customer_name, 
                r.notes, 
                r.created_at,
                o.table_id,
                rt.table_number,
                p.payment_method
              FROM receipts r
              JOIN orders o ON r.order_id = o.order_id
              JOIN restaurant_tables rt ON o.table_id = rt.table_id
              JOIN payments p ON r.payment_id = p.payment_id
              WHERE 1=1";
    
    $params = [];
    
    if ($searchTerm) {
        $query .= " AND (r.receipt_number LIKE :search OR r.customer_name LIKE :search OR rt.table_number LIKE :search)";
        $params[':search'] = '%' . $searchTerm . '%';
    }
    
    if ($fromDate) {
        $query .= " AND DATE(r.created_at) >= :from_date";
        $params[':from_date'] = $fromDate;
    }
    
    if ($toDate) {
        $query .= " AND DATE(r.created_at) <= :to_date";
        $params[':to_date'] = $toDate;
    }
    
    // Just order the results, skip limit/offset for now
    $query .= " ORDER BY r.created_at DESC";
    
    $stmt = $db->prepare($query);
    
    // If we're using positional parameters (? instead of :param), use execute directly with params array
    if (strpos($query, '?') !== false) {
        $stmt->execute($params);
    } else {
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
    }
    
    $receipts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get items for each receipt
    foreach ($receipts as &$receipt) {
        $receipt['items'] = getReceiptItems($db, $receipt['order_id']);
        
        // Format dates
        $receipt['date'] = date('Y-m-d', strtotime($receipt['created_at']));
        $receipt['time'] = date('H:i', strtotime($receipt['created_at']));
        
        // Format amounts for display
        $receipt['subtotal'] = (float)$receipt['subtotal'];
        $receipt['tax_amount'] = (float)$receipt['tax_amount'];
        $receipt['discount_amount'] = (float)$receipt['discount_amount'];
        $receipt['total_amount'] = (float)$receipt['total_amount'];
        $receipt['cash_given'] = (float)$receipt['cash_given'];
        $receipt['change_amount'] = (float)$receipt['change_amount'];
    }
    
    jsonResponse($receipts);
}

/**
 * Get receipt by ID
 */
function handleGetReceiptById($db, $id) {
    $query = "SELECT 
                r.receipt_id, 
                r.receipt_number, 
                r.order_id, 
                r.payment_id, 
                r.subtotal, 
                r.tax_amount, 
                r.discount_amount, 
                r.total_amount, 
                r.cash_given, 
                r.change_amount, 
                r.customer_name, 
                r.notes, 
                r.created_at,
                o.table_id,
                rt.table_number,
                p.payment_method
              FROM receipts r
              JOIN orders o ON r.order_id = o.order_id
              JOIN restaurant_tables rt ON o.table_id = rt.table_id
              JOIN payments p ON r.payment_id = p.payment_id
              WHERE r.receipt_id = :id OR r.receipt_number = :receipt_number";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':id', $id);
    $stmt->bindValue(':receipt_number', $id); // Allow lookup by receipt number as well
    $stmt->execute();
    
    $receipt = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$receipt) {
        errorResponse("Receipt not found", 404);
    }
    
    // Get items for this receipt
    $receipt['items'] = getReceiptItems($db, $receipt['order_id']);
    
    // Format dates
    $receipt['date'] = date('Y-m-d', strtotime($receipt['created_at']));
    $receipt['time'] = date('H:i', strtotime($receipt['created_at']));
    
    // Format amounts for display
    $receipt['subtotal'] = (float)$receipt['subtotal'];
    $receipt['tax_amount'] = (float)$receipt['tax_amount'];
    $receipt['discount_amount'] = (float)$receipt['discount_amount'];
    $receipt['total_amount'] = (float)$receipt['total_amount'];
    $receipt['cash_given'] = (float)$receipt['cash_given'];
    $receipt['change_amount'] = (float)$receipt['change_amount'];
    
    jsonResponse($receipt);
}

/**
 * Create a new receipt manually (typically created by triggers)
 */
function handleCreateReceipt($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['orderId']) || !isset($input['paymentId']) || !isset($input['totalAmount'])) {
        errorResponse("Missing required fields: orderId, paymentId, totalAmount", 400);
    }
    
    $orderId = $input['orderId'];
    $paymentId = $input['paymentId'];
    $totalAmount = $input['totalAmount'];
    $subtotal = isset($input['subtotal']) ? $input['subtotal'] : ($totalAmount / 1.12); // Default subtotal calculation
    $taxAmount = isset($input['taxAmount']) ? $input['taxAmount'] : ($totalAmount - $subtotal); // Default tax calculation
    $discountAmount = $input['discountAmount'] ?? 0;
    $cashGiven = $input['cashGiven'] ?? null;
    $changeAmount = $input['changeAmount'] ?? null;
    $customerName = $input['customerName'] ?? null;
    $notes = $input['notes'] ?? null;
    
    try {
        $db->beginTransaction();
        
        // Generate receipt number
        $receiptNumber = 'RCP-' . date('Ymd') . '-' . str_pad($orderId, 4, '0', STR_PAD_LEFT);
        
        // Check if receipt already exists for this order
        $checkQuery = "SELECT receipt_id FROM receipts WHERE order_id = :order_id";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindValue(':order_id', $orderId);
        $checkStmt->execute();
        
        if ($checkStmt->fetch()) {
            throw new Exception("Receipt already exists for this order");
        }
        
        // Insert receipt
        $query = "INSERT INTO receipts (
                    receipt_number, 
                    order_id, 
                    payment_id, 
                    subtotal, 
                    tax_amount, 
                    discount_amount, 
                    total_amount, 
                    cash_given, 
                    change_amount, 
                    customer_name, 
                    notes, 
                    created_by
                  ) VALUES (
                    :receipt_number,
                    :order_id,
                    :payment_id,
                    :subtotal,
                    :tax_amount,
                    :discount_amount,
                    :total_amount,
                    :cash_given,
                    :change_amount,
                    :customer_name,
                    :notes,
                    1
                  )";
        
        $stmt = $db->prepare($query);
        $stmt->bindValue(':receipt_number', $receiptNumber);
        $stmt->bindValue(':order_id', $orderId);
        $stmt->bindValue(':payment_id', $paymentId);
        $stmt->bindValue(':subtotal', $subtotal);
        $stmt->bindValue(':tax_amount', $taxAmount);
        $stmt->bindValue(':discount_amount', $discountAmount);
        $stmt->bindValue(':total_amount', $totalAmount);
        $stmt->bindValue(':cash_given', $cashGiven);
        $stmt->bindValue(':change_amount', $changeAmount);
        $stmt->bindValue(':customer_name', $customerName);
        $stmt->bindValue(':notes', $notes);
        $stmt->execute();
        
        $receiptId = $db->lastInsertId();
        
        // Also update the payments record with cash_given and change_amount if provided
        if ($cashGiven !== null && $changeAmount !== null) {
            $updateQuery = "UPDATE payments 
                          SET cash_given = :cash_given, change_amount = :change_amount
                          WHERE payment_id = :payment_id";
            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->bindValue(':cash_given', $cashGiven);
            $updateStmt->bindValue(':change_amount', $changeAmount);
            $updateStmt->bindValue(':payment_id', $paymentId);
            $updateStmt->execute();
        }
        
        $db->commit();
        
        jsonResponse([
            'success' => true,
            'receiptId' => $receiptId,
            'receiptNumber' => $receiptNumber,
            'message' => 'Receipt created successfully'
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

/**
 * Update receipt details
 */
function handleUpdateReceipt($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['receiptId'])) {
        errorResponse("Missing required field: receiptId", 400);
    }
    
    $receiptId = $input['receiptId'];
    $cashGiven = $input['cashGiven'] ?? null;
    $changeAmount = $input['changeAmount'] ?? null;
    $customerName = $input['customerName'] ?? null;
    $notes = $input['notes'] ?? null;
    
    try {
        $db->beginTransaction();
        
        // Update receipt
        $query = "UPDATE receipts SET ";
        $params = [];
        $updateFields = [];
        
        if ($cashGiven !== null) {
            $updateFields[] = "cash_given = :cash_given";
            $params[':cash_given'] = $cashGiven;
        }
        
        if ($changeAmount !== null) {
            $updateFields[] = "change_amount = :change_amount";
            $params[':change_amount'] = $changeAmount;
        }
        
        if ($customerName !== null) {
            $updateFields[] = "customer_name = :customer_name";
            $params[':customer_name'] = $customerName;
        }
        
        if ($notes !== null) {
            $updateFields[] = "notes = :notes";
            $params[':notes'] = $notes;
        }
        
        if (empty($updateFields)) {
            errorResponse("No fields to update", 400);
        }
        
        $query .= implode(", ", $updateFields);
        $query .= " WHERE receipt_id = :receipt_id";
        $params[':receipt_id'] = $receiptId;
        
        $stmt = $db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            throw new Exception("Receipt not found or no changes were made");
        }
        
        // Also update the payment record if cash_given and change_amount are provided
        if ($cashGiven !== null && $changeAmount !== null) {
            // Get the payment_id for this receipt
            $paymentQuery = "SELECT payment_id FROM receipts WHERE receipt_id = :receipt_id";
            $paymentStmt = $db->prepare($paymentQuery);
            $paymentStmt->bindValue(':receipt_id', $receiptId);
            $paymentStmt->execute();
            $paymentData = $paymentStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($paymentData) {
                $updateQuery = "UPDATE payments 
                              SET cash_given = :cash_given, change_amount = :change_amount
                              WHERE payment_id = :payment_id";
                $updateStmt = $db->prepare($updateQuery);
                $updateStmt->bindValue(':cash_given', $cashGiven);
                $updateStmt->bindValue(':change_amount', $changeAmount);
                $updateStmt->bindValue(':payment_id', $paymentData['payment_id']);
                $updateStmt->execute();
            }
        }
        
        $db->commit();
        
        jsonResponse([
            'success' => true,
            'message' => 'Receipt updated successfully'
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

/**
 * Get items for a specific receipt
 */
function getReceiptItems($db, $orderId) {
    $query = "SELECT 
                oi.item_id,
                mi.name,
                oi.quantity,
                oi.unit_price,
                (oi.quantity * oi.unit_price) as total_price,
                oi.notes
              FROM order_items oi
              JOIN menu_items mi ON oi.item_id = mi.item_id
              WHERE oi.order_id = :order_id";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':order_id', $orderId);
    $stmt->execute();
    
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format item prices
    foreach ($items as &$item) {
        $item['unit_price'] = (float)$item['unit_price'];
        $item['total_price'] = (float)$item['total_price'];
        $item['quantity'] = (int)$item['quantity'];
    }
    
    return $items;
}
?> 