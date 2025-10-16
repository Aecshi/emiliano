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
        case 'POST':
            handleJoinTables($db);
            break;
        case 'DELETE':
            handleSeparateTables($db);
            break;
        default:
            errorResponse("Method not allowed", 405);
    }
} catch (Exception $e) {
    errorResponse("Error: " . $e->getMessage());
}

function handleJoinTables($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['tableIds']) || !is_array($input['tableIds']) || count($input['tableIds']) < 2) {
        errorResponse("Missing required field: tableIds (array of at least 2 table IDs)", 400);
    }
    
    $tableIds = $input['tableIds'];
    $groupName = $input['groupName'] ?? null;
    
    try {
        $db->beginTransaction();
        
        // First, check if the joined_table_group column exists, if not create it
        $checkColumnQuery = "SHOW COLUMNS FROM restaurant_tables LIKE 'joined_table_group'";
        $checkStmt = $db->prepare($checkColumnQuery);
        $checkStmt->execute();
        
        if ($checkStmt->rowCount() == 0) {
            // Add the column if it doesn't exist
            $addColumnQuery = "ALTER TABLE restaurant_tables ADD COLUMN joined_table_group VARCHAR(50) NULL DEFAULT NULL";
            $db->exec($addColumnQuery);
        }
        
        // Verify all tables exist and are available
        $placeholders = str_repeat('?,', count($tableIds) - 1) . '?';
        $checkTablesQuery = "SELECT table_id, table_number, status, joined_table_group FROM restaurant_tables WHERE table_id IN ($placeholders)";
        $checkStmt = $db->prepare($checkTablesQuery);
        $checkStmt->execute($tableIds);
        $tables = $checkStmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($tables) != count($tableIds)) {
            throw new Exception("One or more tables not found");
        }
        
        // Check if any tables are already joined or occupied
        foreach ($tables as $table) {
            if ($table['joined_table_group'] !== null) {
                throw new Exception("Table " . $table['table_number'] . " is already part of a joined group");
            }
            if ($table['status'] === 'occupied') {
                throw new Exception("Table " . $table['table_number'] . " is currently occupied and cannot be joined");
            }
        }
        
        // Generate unique group ID
        $groupId = 'group_' . uniqid();
        
        // Update all tables to be part of the group
        $updateQuery = "UPDATE restaurant_tables SET joined_table_group = ?, updated_at = NOW() WHERE table_id IN ($placeholders)";
        $updateStmt = $db->prepare($updateQuery);
        $updateParams = array_merge([$groupId], $tableIds);
        $updateStmt->execute($updateParams);
        
        // Get the combined information
        $getTables = "SELECT table_id, table_number, capacity FROM restaurant_tables WHERE table_id IN ($placeholders)";
        $getStmt = $db->prepare($getTables);
        $getStmt->execute($tableIds);
        $joinedTables = $getStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $totalCapacity = array_sum(array_column($joinedTables, 'capacity'));
        $tableNumbers = array_column($joinedTables, 'table_number');
        
        $db->commit();
        
        jsonResponse([
            'success' => true,
            'message' => 'Tables joined successfully',
            'groupId' => $groupId,
            'tables' => $joinedTables,
            'totalCapacity' => $totalCapacity,
            'combinedName' => implode(' + ', $tableNumbers)
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

function handleSeparateTables($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['groupId']) && !isset($input['tableIds'])) {
        errorResponse("Missing required field: groupId or tableIds", 400);
    }
    
    try {
        $db->beginTransaction();
        
        if (isset($input['groupId'])) {
            // Separate all tables in a group
            $groupId = $input['groupId'];
            
            // Check if any tables in the group have active orders
            $checkOrdersQuery = "SELECT COUNT(*) as order_count 
                                FROM restaurant_tables rt 
                                JOIN orders o ON rt.table_id = o.table_id 
                                WHERE rt.joined_table_group = ? 
                                AND o.status IN ('pending', 'in_progress', 'ready')";
            $checkStmt = $db->prepare($checkOrdersQuery);
            $checkStmt->execute([$groupId]);
            $orderCount = $checkStmt->fetch(PDO::FETCH_ASSOC)['order_count'];
            
            if ($orderCount > 0) {
                throw new Exception("Cannot separate tables with active orders. Please complete all orders first.");
            }
            
            // Get all tables in the group
            $getTablesQuery = "SELECT table_id, table_number FROM restaurant_tables WHERE joined_table_group = ?";
            $getStmt = $db->prepare($getTablesQuery);
            $getStmt->execute([$groupId]);
            $tables = $getStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($tables)) {
                throw new Exception("No tables found in the specified group");
            }
            
            // Remove group association and set status to available
            $updateQuery = "UPDATE restaurant_tables 
                           SET joined_table_group = NULL, status = 'available', updated_at = NOW() 
                           WHERE joined_table_group = ?";
            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->execute([$groupId]);
            
        } else {
            // Separate specific tables by IDs
            $tableIds = $input['tableIds'];
            if (!is_array($tableIds) || empty($tableIds)) {
                throw new Exception("Invalid tableIds provided");
            }
            
            $placeholders = str_repeat('?,', count($tableIds) - 1) . '?';
            
            // Check if any of these tables have active orders
            $checkOrdersQuery = "SELECT COUNT(*) as order_count 
                                FROM orders o 
                                WHERE o.table_id IN ($placeholders) 
                                AND o.status IN ('pending', 'in_progress', 'ready')";
            $checkStmt = $db->prepare($checkOrdersQuery);
            $checkStmt->execute($tableIds);
            $orderCount = $checkStmt->fetch(PDO::FETCH_ASSOC)['order_count'];
            
            if ($orderCount > 0) {
                throw new Exception("Cannot separate tables with active orders. Please complete all orders first.");
            }
            
            // Remove group association and set status to available
            $updateQuery = "UPDATE restaurant_tables 
                           SET joined_table_group = NULL, status = 'available', updated_at = NOW() 
                           WHERE table_id IN ($placeholders)";
            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->execute($tableIds);
            
            // Get updated table info
            $getTablesQuery = "SELECT table_id, table_number FROM restaurant_tables WHERE table_id IN ($placeholders)";
            $getStmt = $db->prepare($getTablesQuery);
            $getStmt->execute($tableIds);
            $tables = $getStmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        $db->commit();
        
        jsonResponse([
            'success' => true,
            'message' => 'Tables separated successfully',
            'tables' => $tables
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}
?> 