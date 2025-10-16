<?php
require_once 'api/config/database.php';

// Create database connection
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.");
}

try {
    // Find all completed payments that don't have receipts
    $pendingPaymentsQuery = "
    SELECT p.payment_id, p.order_id, p.amount, p.status, p.payment_date, 
           p.cash_given, p.change_amount, o.customer_name
    FROM payments p
    JOIN orders o ON p.order_id = o.order_id
    LEFT JOIN receipts r ON p.payment_id = r.payment_id
    WHERE r.receipt_id IS NULL AND p.status = 'completed'
    ORDER BY p.payment_date DESC";
    
    $stmt = $db->prepare($pendingPaymentsQuery);
    $stmt->execute();
    $pendingPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h2>Creating Receipts for " . count($pendingPayments) . " Payments</h2>";
    
    if (count($pendingPayments) > 0) {
        $db->beginTransaction();
        
        foreach ($pendingPayments as $payment) {
            // Generate a receipt number
            $receiptNumber = 'RCP-' . date('Ymd', strtotime($payment['payment_date'])) . '-' . 
                            str_pad($payment['order_id'], 4, '0', STR_PAD_LEFT);
            
            // Calculate tax (assuming 12% VAT)
            $amount = (float)$payment['amount'];
            $subtotal = $amount / 1.12;
            $taxAmount = $amount - $subtotal;
            
            // Set cash given and change amount if they don't exist
            $cashGiven = $payment['cash_given'] ?? ($amount + 100.00);
            $changeAmount = $payment['change_amount'] ?? 100.00;
            
            // Customer name
            $customerName = $payment['customer_name'];
            
            // Create the receipt
            $receiptQuery = "
            INSERT INTO receipts (
                receipt_number, order_id, payment_id, 
                subtotal, tax_amount, discount_amount, total_amount,
                cash_given, change_amount, customer_name, created_by
            ) VALUES (
                :receipt_number, :order_id, :payment_id,
                :subtotal, :tax_amount, 0, :total_amount,
                :cash_given, :change_amount, :customer_name, 1
            )";
            
            $stmt = $db->prepare($receiptQuery);
            $stmt->bindValue(':receipt_number', $receiptNumber);
            $stmt->bindValue(':order_id', $payment['order_id']);
            $stmt->bindValue(':payment_id', $payment['payment_id']);
            $stmt->bindValue(':subtotal', $subtotal);
            $stmt->bindValue(':tax_amount', $taxAmount);
            $stmt->bindValue(':total_amount', $amount);
            $stmt->bindValue(':cash_given', $cashGiven);
            $stmt->bindValue(':change_amount', $changeAmount);
            $stmt->bindValue(':customer_name', $customerName);
            
            $result = $stmt->execute();
            
            if ($result) {
                echo "<p>Created receipt #{$receiptNumber} for order #{$payment['order_id']}, amount: ₱" . 
                     number_format($amount, 2) . "</p>";
                
                // Update the payment with cash_given and change_amount if they don't exist
                if ($payment['cash_given'] === null) {
                    $updatePaymentQuery = "
                    UPDATE payments
                    SET cash_given = :cash_given, change_amount = :change_amount
                    WHERE payment_id = :payment_id";
                    
                    $updateStmt = $db->prepare($updatePaymentQuery);
                    $updateStmt->bindValue(':cash_given', $cashGiven);
                    $updateStmt->bindValue(':change_amount', $changeAmount);
                    $updateStmt->bindValue(':payment_id', $payment['payment_id']);
                    $updateStmt->execute();
                    
                    echo "<p>Updated payment #{$payment['payment_id']} with cash and change amounts</p>";
                }
            } else {
                echo "<p style='color:red'>Failed to create receipt for order #{$payment['order_id']}</p>";
            }
        }
        
        $db->commit();
        echo "<h3>All receipts created successfully!</h3>";
    } else {
        echo "<p>No pending payments found. All receipts are up to date.</p>";
    }
    
} catch (PDOException $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    die("<p style='color:red'>Database error: " . $e->getMessage() . "</p>");
}
?> 