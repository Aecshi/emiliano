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
            if ($path === '/categories') {
                handleGetCategories($db);
            } else {
                handleGetMenu($db);
            }
            break;
        case 'POST':
            handleCreateOrder($db);
            break;
        default:
            errorResponse("Method not allowed", 405);
    }
} catch (Exception $e) {
    errorResponse("Error: " . $e->getMessage());
}

/**
 * Get all menu categories
 */
function handleGetCategories($db) {
    $query = "SELECT category_id, name, description, sort_order FROM categories ORDER BY sort_order ASC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse($categories);
}

/**
 * Get all menu items, optionally filtered by category
 */
function handleGetMenu($db) {
    $categoryId = isset($_GET['category_id']) ? $_GET['category_id'] : null;
    
    $query = "SELECT 
                mi.item_id, 
                mi.name, 
                mi.description, 
                mi.price, 
                mi.is_available, 
                mi.image_path, 
                c.category_id, 
                c.name as category 
              FROM menu_items mi
              JOIN categories c ON mi.category_id = c.category_id";
    
    if ($categoryId) {
        $query .= " WHERE mi.category_id = :category_id";
    }
    
    $query .= " ORDER BY c.sort_order ASC, mi.name ASC";
    
    $stmt = $db->prepare($query);
    
    if ($categoryId) {
        $stmt->bindValue(':category_id', $categoryId);
    }
    
    $stmt->execute();
    $menuItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the data
    foreach ($menuItems as &$item) {
        $item['item_id'] = (int)$item['item_id'];
        $item['price'] = (float)$item['price'];
        $item['category_id'] = (int)$item['category_id'];
        $item['is_available'] = (bool)$item['is_available'];
    }
    
    // Get all categories for the response
    $categoriesQuery = "SELECT category_id, name, description FROM categories ORDER BY sort_order ASC";
    $categoriesStmt = $db->prepare($categoriesQuery);
    $categoriesStmt->execute();
    $categories = $categoriesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse([
        'categories' => $categories,
        'items' => $menuItems
    ]);
}

/**
 * Create a new order from the customer menu
 */
function handleCreateOrder($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['tableNumber']) || !isset($input['items']) || !is_array($input['items'])) {
        errorResponse("Missing required fields: tableNumber, items", 400);
    }
    
    $tableNumber = $input['tableNumber'];
    $items = $input['items'];
    $specialInstructions = $input['specialInstructions'] ?? '';
    $customerName = $input['customerName'] ?? null;
    $paymentMethod = 'cash'; // Default for customer orders
    
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
        $orderQuery = "INSERT INTO orders (table_id, user_id, customer_name, order_type, status, notes, created_at) 
                      VALUES (:table_id, 1, :customer_name, 'dine_in', 'pending', :notes, NOW())";
        $orderStmt = $db->prepare($orderQuery);
        $orderStmt->bindValue(':table_id', $tableId);
        $orderStmt->bindValue(':customer_name', $customerName);
        $orderStmt->bindValue(':notes', $specialInstructions);
        $orderStmt->execute();
        
        $orderId = $db->lastInsertId();
        
        // Add order items
        $totalAmount = 0;
        foreach ($items as $item) {
            if (!isset($item['id']) || !isset($item['quantity'])) {
                throw new Exception("Invalid item data");
            }
            
            // Get current price from menu_items table
            $priceQuery = "SELECT price FROM menu_items WHERE item_id = :item_id";
            $priceStmt = $db->prepare($priceQuery);
            $priceStmt->bindValue(':item_id', $item['id']);
            $priceStmt->execute();
            $priceData = $priceStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$priceData) {
                throw new Exception("Item not found: " . $item['id']);
            }
            
            $price = $priceData['price'];
            $itemNotes = isset($item['notes']) ? $item['notes'] : '';
            
            // Insert order item
            $itemQuery = "INSERT INTO order_items (order_id, item_id, quantity, unit_price, notes, created_at) 
                         VALUES (:order_id, :item_id, :quantity, :unit_price, :notes, NOW())";
            $itemStmt = $db->prepare($itemQuery);
            $itemStmt->bindValue(':order_id', $orderId);
            $itemStmt->bindValue(':item_id', $item['id']);
            $itemStmt->bindValue(':quantity', $item['quantity']);
            $itemStmt->bindValue(':unit_price', $price);
            $itemStmt->bindValue(':notes', $itemNotes);
            $itemStmt->execute();
            
            $totalAmount += $item['quantity'] * $price;
        }
        
        // Update table status to occupied if it's available
        $updateTableQuery = "UPDATE restaurant_tables SET status = 'occupied', updated_at = NOW() 
                            WHERE table_id = :table_id AND status = 'available'";
        $updateTableStmt = $db->prepare($updateTableQuery);
        $updateTableStmt->bindValue(':table_id', $tableId);
        $updateTableStmt->execute();
        
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
?> 