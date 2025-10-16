<?php
require_once 'api/config/database.php';

// Create database connection
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.");
}

try {
    // Check if receipts table exists
    $checkTableQuery = "SHOW TABLES LIKE 'receipts'";
    $stmt = $db->prepare($checkTableQuery);
    $stmt->execute();
    $tableExists = ($stmt->rowCount() > 0);
    
    if (!$tableExists) {
        echo "Table 'receipts' does not exist. Creating it now...\n";
        
        // Create receipts table
        $createTableQuery = "
        CREATE TABLE IF NOT EXISTS `receipts` (
          `receipt_id` int(11) NOT NULL AUTO_INCREMENT,
          `receipt_number` varchar(20) NOT NULL,
          `order_id` int(11) NOT NULL,
          `payment_id` int(11) NOT NULL,
          `subtotal` decimal(10,2) NOT NULL,
          `tax_amount` decimal(10,2) NOT NULL,
          `discount_amount` decimal(10,2) DEFAULT 0.00,
          `total_amount` decimal(10,2) NOT NULL,
          `cash_given` decimal(10,2) DEFAULT NULL,
          `change_amount` decimal(10,2) DEFAULT NULL,
          `customer_name` varchar(100) DEFAULT NULL,
          `notes` text DEFAULT NULL,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
          `created_by` int(11) NOT NULL,
          PRIMARY KEY (`receipt_id`),
          UNIQUE KEY `receipt_number` (`receipt_number`),
          UNIQUE KEY `order_id` (`order_id`),
          UNIQUE KEY `payment_id` (`payment_id`),
          CONSTRAINT `fk_receipts_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
          CONSTRAINT `fk_receipts_payments` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`) ON DELETE CASCADE,
          CONSTRAINT `fk_receipts_users` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        ";
        
        $db->exec($createTableQuery);
        echo "Table 'receipts' created successfully.\n";
    } else {
        echo "Table 'receipts' already exists.\n";
    }
    
    // Check if payments table has cash_given and change_amount columns
    $checkColumnsQuery = "SHOW COLUMNS FROM payments LIKE 'cash_given'";
    $stmt = $db->prepare($checkColumnsQuery);
    $stmt->execute();
    $cashGivenExists = ($stmt->rowCount() > 0);
    
    if (!$cashGivenExists) {
        echo "Adding cash_given and change_amount columns to payments table...\n";
        
        $alterTableQuery = "
        ALTER TABLE `payments` 
        ADD COLUMN `cash_given` decimal(10,2) DEFAULT NULL,
        ADD COLUMN `change_amount` decimal(10,2) DEFAULT NULL;
        ";
        
        $db->exec($alterTableQuery);
        echo "Columns added successfully.\n";
    } else {
        echo "cash_given and change_amount columns already exist in payments table.\n";
    }
    
    // Check existing receipts
    $receiptQuery = "SELECT COUNT(*) as receipt_count FROM receipts";
    $stmt = $db->prepare($receiptQuery);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Current number of receipts in database: " . $result['receipt_count'] . "\n";
    
    // Check existing payments that don't have associated receipts
    $pendingPaymentsQuery = "
    SELECT p.payment_id, p.order_id, p.amount, p.status, p.payment_date
    FROM payments p
    LEFT JOIN receipts r ON p.payment_id = r.payment_id
    WHERE r.receipt_id IS NULL AND p.status = 'completed'
    ORDER BY p.payment_date DESC
    LIMIT 10";
    
    $stmt = $db->prepare($pendingPaymentsQuery);
    $stmt->execute();
    $pendingPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Payments that need receipts: " . count($pendingPayments) . "\n";
    if (count($pendingPayments) > 0) {
        echo "Payment IDs: " . implode(', ', array_column($pendingPayments, 'payment_id')) . "\n";
    }
    
    echo "Script completed successfully.";
    
} catch (PDOException $e) {
    die("Database error: " . $e->getMessage());
}
?> 