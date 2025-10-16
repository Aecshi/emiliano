-- Add cash_given and change_amount columns to the payments table if they don't exist already
ALTER TABLE `payments` 
ADD COLUMN IF NOT EXISTS `cash_given` decimal(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `change_amount` decimal(10,2) DEFAULT NULL;

-- Create receipts table
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

-- Insert test data - receipts for existing completed orders with payments
-- This creates receipts for orders that already have payments
INSERT IGNORE INTO receipts (receipt_number, order_id, payment_id, subtotal, tax_amount, discount_amount, total_amount, created_by)
SELECT 
  CONCAT('RCP-', DATE_FORMAT(p.payment_date, '%Y%m%d'), '-', LPAD(p.order_id, 4, '0')) as receipt_number,
  p.order_id,
  p.payment_id,
  p.amount / 1.12 as subtotal, -- Assuming 12% tax rate
  p.amount - (p.amount / 1.12) as tax_amount,
  0.00 as discount_amount,
  p.amount as total_amount,
  1 as created_by -- Default user ID
FROM payments p
JOIN orders o ON p.order_id = o.order_id
WHERE p.status = 'completed'
AND NOT EXISTS (SELECT 1 FROM receipts r WHERE r.order_id = p.order_id);

-- Update the cash_given and change_amount in payments table for demonstration
UPDATE payments SET cash_given = amount + 100.00, change_amount = 100.00 WHERE cash_given IS NULL AND status = 'completed';

-- Update receipts with the cash_given and change_amount values from payments
UPDATE receipts r
JOIN payments p ON r.payment_id = p.payment_id
SET r.cash_given = p.cash_given, r.change_amount = p.change_amount
WHERE r.cash_given IS NULL AND p.cash_given IS NOT NULL; 