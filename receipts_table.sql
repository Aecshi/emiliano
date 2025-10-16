-- Create receipts table
CREATE TABLE `receipts` (
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
  CONSTRAINT `fk_receipts_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `fk_receipts_payments` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`),
  CONSTRAINT `fk_receipts_users` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add cash_given and change_amount columns to the payments table
ALTER TABLE `payments` 
ADD COLUMN `cash_given` decimal(10,2) DEFAULT NULL,
ADD COLUMN `change_amount` decimal(10,2) DEFAULT NULL;

-- Create a trigger that automatically creates a receipt after a payment is marked as completed
DELIMITER $$
CREATE TRIGGER `after_payment_completed` AFTER UPDATE ON `payments`
FOR EACH ROW
BEGIN
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_tax_rate DECIMAL(5,2) DEFAULT 0.12; -- 12% tax rate
    DECLARE v_tax_amount DECIMAL(10,2);
    DECLARE v_receipt_number VARCHAR(20);
    DECLARE v_customer_name VARCHAR(100);
    
    -- Only proceed if the payment status has changed to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Generate receipt number - Format: RCP-YYYYMMDD-XXXX (where XXXX is the order_id with leading zeros)
        SET v_receipt_number = CONCAT('RCP-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(NEW.order_id, 4, '0'));
        
        -- Calculate subtotal and tax
        SET v_subtotal = NEW.amount / (1 + v_tax_rate);
        SET v_tax_amount = NEW.amount - v_subtotal;
        
        -- Get customer name from the order if available
        SELECT customer_name INTO v_customer_name FROM orders WHERE order_id = NEW.order_id;
        
        -- Check if receipt already exists
        IF NOT EXISTS (SELECT 1 FROM receipts WHERE order_id = NEW.order_id OR payment_id = NEW.payment_id) THEN
            -- Insert receipt record
            INSERT INTO receipts (
                receipt_number,
                order_id,
                payment_id,
                subtotal,
                tax_amount,
                total_amount,
                cash_given,
                change_amount,
                customer_name,
                created_by
            ) VALUES (
                v_receipt_number,
                NEW.order_id,
                NEW.payment_id,
                v_subtotal,
                v_tax_amount,
                NEW.amount,
                NEW.cash_given,
                NEW.change_amount,
                v_customer_name,
                NEW.user_id
            );
        END IF;
    END IF;
END$$
DELIMITER ;

-- Create a trigger for new payments as well
DELIMITER $$
CREATE TRIGGER `after_payment_insert` AFTER INSERT ON `payments`
FOR EACH ROW
BEGIN
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_tax_rate DECIMAL(5,2) DEFAULT 0.12; -- 12% tax rate
    DECLARE v_tax_amount DECIMAL(10,2);
    DECLARE v_receipt_number VARCHAR(20);
    DECLARE v_customer_name VARCHAR(100);
    
    -- Only proceed if the payment status is completed
    IF NEW.status = 'completed' THEN
        -- Generate receipt number
        SET v_receipt_number = CONCAT('RCP-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(NEW.order_id, 4, '0'));
        
        -- Calculate subtotal and tax
        SET v_subtotal = NEW.amount / (1 + v_tax_rate);
        SET v_tax_amount = NEW.amount - v_subtotal;
        
        -- Get customer name from the order if available
        SELECT customer_name INTO v_customer_name FROM orders WHERE order_id = NEW.order_id;
        
        -- Check if receipt already exists
        IF NOT EXISTS (SELECT 1 FROM receipts WHERE order_id = NEW.order_id OR payment_id = NEW.payment_id) THEN
            -- Insert receipt record
            INSERT INTO receipts (
                receipt_number,
                order_id,
                payment_id,
                subtotal,
                tax_amount,
                total_amount,
                cash_given,
                change_amount,
                customer_name,
                created_by
            ) VALUES (
                v_receipt_number,
                NEW.order_id,
                NEW.payment_id,
                v_subtotal,
                v_tax_amount,
                NEW.amount,
                NEW.cash_given,
                NEW.change_amount,
                v_customer_name,
                NEW.user_id
            );
        END IF;
    END IF;
END$$
DELIMITER ; 