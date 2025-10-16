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
            handleGetMenu($db);
            break;
        default:
            errorResponse("Method not allowed", 405);
    }
} catch (Exception $e) {
    errorResponse("Error: " . $e->getMessage());
}

function handleGetMenu($db) {
    // Get categories
    $categoriesQuery = "SELECT 
        category_id,
        name,
        description,
        sort_order
    FROM categories 
    WHERE category_id IN (
        SELECT DISTINCT category_id 
        FROM menu_items 
        WHERE is_available = 1
    )
    ORDER BY sort_order ASC";
    
    $categoriesStmt = $db->prepare($categoriesQuery);
    $categoriesStmt->execute();
    $categories = $categoriesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get menu items
    $itemsQuery = "SELECT 
        mi.item_id,
        mi.category_id,
        mi.name,
        mi.description,
        mi.price,
        mi.image_path,
        mi.is_available,
        c.name as category_name
    FROM menu_items mi
    JOIN categories c ON mi.category_id = c.category_id
    WHERE mi.is_available = 1
    ORDER BY c.sort_order ASC, mi.item_id ASC";
    
    $itemsStmt = $db->prepare($itemsQuery);
    $itemsStmt->execute();
    $menuItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the response
    $formattedCategories = [];
    $formattedItems = [];
    
    foreach ($categories as $category) {
        $formattedCategories[] = [
            'id' => (int)$category['category_id'],
            'name' => $category['name'],
            'description' => $category['description'],
            'sortOrder' => (int)$category['sort_order']
        ];
    }
    
    foreach ($menuItems as $item) {
        $formattedItems[] = [
            'id' => (int)$item['item_id'],
            'categoryId' => (int)$item['category_id'],
            'name' => $item['name'],
            'description' => $item['description'],
            'price' => (float)$item['price'],
            'category' => $item['category_name'],
            'imagePath' => $item['image_path'],
            'isAvailable' => (bool)$item['is_available']
        ];
    }
    
    $response = [
        'categories' => $formattedCategories,
        'items' => $formattedItems
    ];
    
    jsonResponse($response);
}
?> 