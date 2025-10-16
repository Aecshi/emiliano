<?php
require_once __DIR__ . '/../config/database.php';

setCorsHeaders();

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    errorResponse("Database connection failed");
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            handleGetTables($db);
            break;
        case 'PUT':
            handleUpdateTable($db);
            break;
        case 'POST':
            handleCreateTable($db);
            break;
        case 'DELETE':
            handleDeleteTable($db);
            break;
        default:
            errorResponse("Method not allowed", 405);
    }
} catch (Exception $e) {
    errorResponse("Error: " . $e->getMessage());
}

function handleGetTables($db) {
    $query = "SELECT 
        rt.table_id as id,
        rt.table_number as number,
        rt.capacity,
        rt.status,
        rt.updated_at,
        rt.joined_table_group,
        o.order_id,
        o.created_at as order_created_at,
        COUNT(oi.order_item_id) as order_count,
        SUM(oi.quantity * oi.unit_price) as bill_amount
    FROM restaurant_tables rt
    LEFT JOIN orders o ON rt.table_id = o.table_id AND o.status IN ('pending', 'in_progress', 'ready')
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    GROUP BY rt.table_id, rt.table_number, rt.capacity, rt.status, rt.updated_at, rt.joined_table_group, o.order_id, o.created_at
    ORDER BY rt.table_number";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $tables = [];
    
    foreach ($results as $row) {
        $tableId = $row['id'];
        
        // Check if we already have this table
        $existingTableIndex = array_search($tableId, array_column($tables, 'id'));
        
        if ($existingTableIndex === false) {
            // Calculate time since seated/reserved
            $timeString = null;
            $seatedTime = null;
            
            if ($row['status'] === 'occupied' && $row['order_created_at']) {
                $seatedTime = new DateTime($row['order_created_at']);
                $now = new DateTime();
                $diff = $now->diff($seatedTime);
                $minutes = ($diff->h * 60) + $diff->i;
                $timeString = $minutes . ' min';
            } elseif ($row['status'] === 'reserved' && $row['updated_at']) {
                // For reserved tables, show reservation time
                $timeString = date('g:i A', strtotime($row['updated_at']));
            }
            
            // Estimate guests based on table capacity and status
            $guests = null;
            if ($row['status'] === 'occupied') {
                // For now, estimate guests as random between 1 and capacity
                // In a real system, this would be stored when seating guests
                $guests = min(4, $row['capacity']); // Default estimation
            }
            
            // Extract number from table_number (e.g., "Table 1" -> 1)
            $tableNumber = $row['number'];
            if (is_string($tableNumber)) {
                // Extract number from string like "Table 1"
                if (preg_match('/Table\s+(\d+)/i', $tableNumber, $matches)) {
                    $tableNumber = (int)$matches[1];
                } else if (preg_match('/(\d+)/', $tableNumber, $matches)) {
                    $tableNumber = (int)$matches[1];
                } else {
                    $tableNumber = 0;
                }
            } else {
                $tableNumber = (int)$tableNumber;
            }
            
            $table = [
                'id' => (int)$tableId,
                'number' => $tableNumber,
                'status' => $row['status'],
                'time' => $timeString,
                'guests' => $guests,
                'seatedTime' => $row['order_created_at'],
                'orders' => (int)($row['order_count'] ?: 0),
                'billAmount' => (float)($row['bill_amount'] ?: 0),
                'capacity' => (int)$row['capacity'],
                'joinedTableGroup' => $row['joined_table_group'],
                'isJoined' => !empty($row['joined_table_group'])
            ];
            
            $tables[] = $table;
        }
    }
    
    jsonResponse($tables);
}

function handleUpdateTable($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id']) || !isset($input['status'])) {
        errorResponse("Missing required fields: id, status", 400);
    }
    
    $tableId = $input['id'];
    $status = $input['status'];
    $guests = $input['guests'] ?? null;
    
    // Update table status
    $query = "UPDATE restaurant_tables SET status = :status, updated_at = NOW() WHERE table_id = :table_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':status', $status);
    $stmt->bindParam(':table_id', $tableId);
    
    if ($stmt->execute()) {
        // If marking table as occupied, create a new order
        if ($status === 'occupied' && $guests) {
            $orderQuery = "INSERT INTO orders (table_id, user_id, order_type, status, created_at) 
                          VALUES (:table_id, 1, 'dine_in', 'pending', NOW())";
            $orderStmt = $db->prepare($orderQuery);
            $orderStmt->bindParam(':table_id', $tableId);
            $orderStmt->execute();
        }
        
        // If marking table as available, update any active orders to completed
        if ($status === 'available') {
            $completeOrderQuery = "UPDATE orders SET status = 'completed', completed_at = NOW() 
                                  WHERE table_id = :table_id AND status IN ('pending', 'in_progress', 'ready')";
            $completeStmt = $db->prepare($completeOrderQuery);
            $completeStmt->bindParam(':table_id', $tableId);
            $completeStmt->execute();
        }
        
        jsonResponse(['success' => true, 'message' => 'Table updated successfully']);
    } else {
        errorResponse("Failed to update table", 500);
    }
}

function handleCreateTable($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['number']) || !isset($input['capacity'])) {
        errorResponse("Missing required fields: number, capacity", 400);
    }
    
    $tableNumber = $input['number'];
    $capacity = $input['capacity'] ?? 4;
    
    // Check if table number already exists
    $tableNumberString = "Table " . $tableNumber;
    $checkQuery = "SELECT table_id FROM restaurant_tables WHERE table_number = :table_number";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':table_number', $tableNumberString);
    $checkStmt->execute();
    
    if ($checkStmt->fetch()) {
        errorResponse("Table number already exists", 409);
    }
    
    // Create new table with proper format (e.g., "Table 5")
    $tableNumberString = "Table " . $tableNumber;
    $query = "INSERT INTO restaurant_tables (table_number, capacity, status, created_at) 
              VALUES (:table_number, :capacity, 'available', NOW())";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':table_number', $tableNumberString);
    $stmt->bindParam(':capacity', $capacity);
    
    if ($stmt->execute()) {
        $newTableId = $db->lastInsertId();
        jsonResponse(['success' => true, 'id' => $newTableId, 'message' => 'Table created successfully']);
    } else {
        errorResponse("Failed to create table", 500);
    }
}

function handleDeleteTable($db) {
    $tableId = $_GET['id'] ?? null;
    
    if (!$tableId) {
        errorResponse("Missing table ID", 400);
    }
    
    // Check if table has active orders
    $checkQuery = "SELECT COUNT(*) as active_orders FROM orders 
                   WHERE table_id = :table_id AND status IN ('pending', 'in_progress', 'ready')";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':table_id', $tableId);
    $checkStmt->execute();
    $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['active_orders'] > 0) {
        errorResponse("Cannot delete table with active orders", 409);
    }
    
    // Delete table
    $query = "DELETE FROM restaurant_tables WHERE table_id = :table_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':table_id', $tableId);
    
    if ($stmt->execute()) {
        jsonResponse(['success' => true, 'message' => 'Table deleted successfully']);
    } else {
        errorResponse("Failed to delete table", 500);
    }
}
?> 