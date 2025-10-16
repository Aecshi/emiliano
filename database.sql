-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 01, 2025 at 03:33 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `restaurant_pos`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `add_inventory` (IN `p_ingredient_id` INT, IN `p_quantity` DECIMAL(10,3), IN `p_unit_cost` DECIMAL(10,2), IN `p_user_id` INT, IN `p_notes` TEXT)   BEGIN
    DECLARE total_cost DECIMAL(10,2);
    SET total_cost = p_quantity * p_unit_cost;
    
    -- Add transaction record
    INSERT INTO inventory_transactions (
        ingredient_id, transaction_type, quantity, 
        unit_cost, total_cost, user_id, notes
    )
    VALUES (
        p_ingredient_id, 'purchase', p_quantity, 
        p_unit_cost, total_cost, p_user_id, p_notes
    );
    
    -- Update current stock
    UPDATE ingredients
    SET current_stock = current_stock + p_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE ingredient_id = p_ingredient_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `add_order_item` (IN `p_order_id` INT, IN `p_item_id` INT, IN `p_quantity` INT, IN `p_side_option` ENUM('bread','rice'), IN `p_notes` TEXT)   BEGIN
    DECLARE v_price DECIMAL(10,2);
    
    -- Get the current price of the item
    SELECT price INTO v_price FROM menu_items WHERE item_id = p_item_id;
    
    -- Add the order item
    INSERT INTO order_items (
        order_id, item_id, quantity, unit_price, side_option, notes
    )
    VALUES (
        p_order_id, p_item_id, p_quantity, v_price, p_side_option, p_notes
    );
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `add_order_item_extra` (IN `p_order_item_id` INT, IN `p_extra_id` INT, IN `p_quantity` INT)   BEGIN
    DECLARE v_price DECIMAL(10,2);
    
    -- Get the current price of the extra
    SELECT price INTO v_price FROM extras WHERE extra_id = p_extra_id;
    
    -- Add the order item extra
    INSERT INTO order_item_extras (
        order_item_id, extra_id, quantity, unit_price
    )
    VALUES (
        p_order_item_id, p_extra_id, p_quantity, v_price
    );
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `complete_order` (IN `p_order_id` INT, IN `p_payment_method` ENUM('cash','credit_card','debit_card','mobile_payment','other'), IN `p_user_id` INT, IN `p_transaction_reference` VARCHAR(100), IN `p_notes` TEXT)   BEGIN
    DECLARE v_total_amount DECIMAL(10,2);
    DECLARE v_table_id INT;
    
    -- Calculate the total amount from order items
    SELECT SUM(oi.quantity * oi.unit_price) INTO v_total_amount
    FROM order_items oi
    WHERE oi.order_id = p_order_id;
    
    -- Add extras to the total
    SELECT v_total_amount + COALESCE(SUM(oie.quantity * oie.unit_price), 0) INTO v_total_amount
    FROM order_item_extras oie
    JOIN order_items oi ON oie.order_item_id = oi.order_item_id
    WHERE oi.order_id = p_order_id;
    
    -- Create payment record
    INSERT INTO payments (
        order_id, amount, payment_method, status,
        transaction_reference, user_id, notes
    )
    VALUES (
        p_order_id, v_total_amount, p_payment_method, 'completed',
        p_transaction_reference, p_user_id, p_notes
    );
    
    -- Update order status
    UPDATE orders
    SET status = 'completed',
        completed_at = CURRENT_TIMESTAMP
    WHERE order_id = p_order_id;
    
    -- Get the table ID if it's a dine-in order
    SELECT table_id INTO v_table_id
    FROM orders
    WHERE order_id = p_order_id;
    
    -- Free up the table if applicable
    IF v_table_id IS NOT NULL THEN
        UPDATE restaurant_tables
        SET status = 'available',
            updated_at = CURRENT_TIMESTAMP
        WHERE table_id = v_table_id;
    END IF;
    
    -- Update daily sales
    INSERT INTO daily_sales (sales_date, total_sales, total_orders, total_items_sold)
    VALUES (
        CURDATE(), 
        v_total_amount, 
        1,
        (SELECT SUM(quantity) FROM order_items WHERE order_id = p_order_id)
    )
    ON DUPLICATE KEY UPDATE
        total_sales = total_sales + v_total_amount,
        total_orders = total_orders + 1,
        total_items_sold = total_items_sold + (SELECT SUM(quantity) FROM order_items WHERE order_id = p_order_id),
        updated_at = CURRENT_TIMESTAMP;
        
    -- Update ingredient stock based on recipes (would be more complex in reality)
    -- This is a simplified version; in a real system, you'd need to handle each item's recipe
    UPDATE ingredients i
    JOIN recipes r ON i.ingredient_id = r.ingredient_id
    JOIN order_items oi ON r.item_id = oi.item_id
    SET i.current_stock = i.current_stock - (r.quantity * oi.quantity)
    WHERE oi.order_id = p_order_id;
    
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `create_order` (IN `p_table_id` INT, IN `p_user_id` INT, IN `p_customer_name` VARCHAR(100), IN `p_order_type` ENUM('dine_in','takeout','delivery'), IN `p_notes` TEXT, OUT `p_order_id` INT)   BEGIN
    INSERT INTO orders (
        table_id, user_id, customer_name, order_type, notes
    )
    VALUES (
        p_table_id, p_user_id, p_customer_name, p_order_type, p_notes
    );
    
    SET p_order_id = LAST_INSERT_ID();
    
    -- If it's a dine-in order, update the table status
    IF p_order_type = 'dine_in' AND p_table_id IS NOT NULL THEN
        UPDATE restaurant_tables
        SET status = 'occupied',
            updated_at = CURRENT_TIMESTAMP
        WHERE table_id = p_table_id;
    END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`log_id`, `user_id`, `action`, `description`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 1, 'login', 'User logged in successfully', '127.0.0.1', NULL, '2023-05-15 09:45:00'),
(2, 2, 'login', 'User logged in successfully', '127.0.0.1', NULL, '2023-05-15 10:30:00'),
(3, 3, 'login', 'User logged in successfully', '127.0.0.1', NULL, '2023-05-14 02:15:00'),
(4, 4, 'login', 'User logged in successfully', '127.0.0.1', NULL, '2023-05-15 14:05:00'),
(5, 1, 'update_settings', 'Updated system settings', '127.0.0.1', NULL, '2023-05-15 10:00:00'),
(6, 2, 'create_order', 'Created new order #1001', '127.0.0.1', NULL, '2023-05-15 11:30:00'),
(7, 3, 'update_order', 'Updated order #1001 status to ready', '127.0.0.1', NULL, '2023-05-14 03:20:00'),
(8, 4, 'update_inventory', 'Updated inventory levels for 5 items', '127.0.0.1', NULL, '2023-05-15 15:10:00');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`category_id`, `name`, `description`, `sort_order`) VALUES
(1, 'PIZZA', 'Italian pizzas', 1),
(2, 'MEAT', 'Meat dishes', 2),
(3, 'FISH', 'Seafood dishes', 3),
(4, 'PASTA', 'Italian pasta dishes', 4),
(5, 'VEGETARIAN', 'Vegetarian options', 5),
(6, 'DESSERT', 'Sweet desserts', 6),
(7, 'SHAKES', 'Milk shakes', 7),
(8, 'SHOTS', 'Alcoholic shots', 8),
(9, 'LONG DRINKS', 'Cocktails and mixed drinks', 9),
(10, 'SANDWICHES', 'Sandwiches', 10),
(11, 'DRINKS', 'Soft drinks and beers', 11),
(12, 'JUICES', 'Fresh fruit juices', 12),
(13, 'WINES', 'Wine selection', 13),
(14, 'EXTRAS', 'Additional toppings and sides', 14);

-- --------------------------------------------------------

--
-- Table structure for table `daily_sales`
--

CREATE TABLE `daily_sales` (
  `sales_date` date NOT NULL,
  `total_sales` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_orders` int(11) NOT NULL DEFAULT 0,
  `total_items_sold` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `daily_sales`
--

INSERT INTO `daily_sales` (`sales_date`, `total_sales`, `total_orders`, `total_items_sold`, `created_at`, `updated_at`) VALUES
('2024-03-10', 4695.00, 18, 42, '2025-08-03 18:38:11', NULL),
('2024-03-11', 8676.00, 32, 76, '2025-08-03 18:38:11', NULL),
('2024-03-12', 13860.00, 45, 110, '2025-08-03 18:38:11', NULL),
('2024-03-13', 8990.00, 35, 82, '2025-08-03 18:38:11', NULL),
('2024-03-14', 4975.00, 19, 44, '2025-08-03 18:38:11', NULL),
('2024-03-15', 17600.00, 58, 138, '2025-08-03 18:38:11', NULL),
('2024-03-16', 12910.00, 42, 98, '2025-08-03 18:38:11', NULL),
('2024-03-17', 11965.00, 39, 92, '2025-08-03 18:38:11', NULL),
('2024-03-18', 5193.00, 20, 47, '2025-08-03 18:38:11', NULL),
('2024-03-19', 5810.00, 22, 52, '2025-08-03 18:38:11', NULL),
('2024-03-20', 8040.00, 31, 73, '2025-08-03 18:38:11', NULL),
('2024-03-21', 6545.00, 25, 59, '2025-08-03 18:38:11', NULL),
('2024-03-22', 12805.00, 41, 96, '2025-08-03 18:38:11', NULL),
('2024-03-23', 6860.00, 26, 61, '2025-08-03 18:38:11', NULL),
('2024-03-24', 3650.00, 14, 33, '2025-08-03 18:38:11', NULL),
('2024-03-25', 6320.00, 24, 57, '2025-08-03 18:38:11', NULL),
('2024-03-26', 7260.00, 28, 66, '2025-08-03 18:38:11', NULL),
('2024-03-27', 9460.00, 36, 85, '2025-08-03 18:38:11', NULL),
('2024-03-28', 8539.00, 33, 77, '2025-08-03 18:38:11', NULL),
('2024-03-29', 8835.00, 34, 80, '2025-08-03 18:38:11', NULL),
('2024-03-30', 26835.00, 78, 185, '2025-08-03 18:38:11', NULL),
('2024-03-31', 5140.00, 20, 46, '2025-08-03 18:38:11', NULL),
('2024-04-01', 18530.00, 60, 142, '2025-08-03 18:38:11', NULL),
('2024-04-02', 9775.00, 37, 88, '2025-08-03 18:38:11', NULL),
('2024-04-03', 6090.00, 23, 55, '2025-08-03 18:38:11', NULL),
('2024-04-04', 3880.00, 15, 35, '2025-08-03 18:38:11', NULL),
('2024-04-05', 9370.00, 36, 84, '2025-08-03 18:38:11', NULL),
('2024-04-06', 11985.00, 39, 93, '2025-08-03 18:38:11', NULL),
('2024-04-07', 14015.00, 46, 109, '2025-08-03 18:38:11', NULL),
('2024-04-08', 6644.00, 25, 60, '2025-08-03 18:38:11', NULL),
('2024-04-09', 12610.00, 41, 97, '2025-08-03 18:38:11', NULL),
('2024-04-10', 30690.00, 89, 211, '2025-08-03 18:38:11', NULL),
('2024-04-11', 22350.00, 68, 161, '2025-08-03 18:38:11', NULL),
('2024-04-12', 12905.00, 42, 99, '2025-08-03 18:38:11', NULL),
('2024-04-13', 21135.00, 65, 154, '2025-08-03 18:38:11', NULL),
('2024-04-14', 16050.00, 52, 123, '2025-08-03 18:38:11', NULL),
('2024-04-15', 18680.00, 61, 144, '2025-08-03 18:38:11', NULL),
('2024-04-16', 20960.00, 64, 152, '2025-08-03 18:38:11', NULL),
('2024-04-17', 20285.00, 62, 147, '2025-08-03 18:38:11', NULL),
('2024-04-18', 30825.00, 90, 213, '2025-08-03 18:38:11', NULL),
('2024-04-19', 27285.00, 80, 189, '2025-08-03 18:38:11', NULL),
('2024-04-20', 24495.00, 73, 172, '2025-08-03 18:38:11', NULL),
('2024-04-21', 4260.00, 16, 38, '2025-08-03 18:38:11', NULL),
('2024-04-22', 10010.00, 38, 90, '2025-08-03 18:38:11', NULL),
('2024-04-23', 16560.00, 54, 127, '2025-08-03 18:38:11', NULL),
('2024-04-24', 8510.00, 32, 76, '2025-08-03 18:38:11', NULL),
('2024-04-25', 8030.00, 30, 72, '2025-08-03 18:38:11', NULL),
('2024-04-26', 10805.00, 40, 95, '2025-08-03 18:38:11', NULL),
('2024-04-27', 10600.00, 39, 93, '2025-08-03 18:38:11', NULL),
('2024-04-28', 13360.00, 44, 104, '2025-08-03 18:38:11', NULL),
('2024-04-29', 13360.00, 44, 104, '2025-08-03 18:38:11', NULL),
('2024-04-30', 11330.00, 40, 95, '2025-08-03 18:38:11', NULL),
('2024-05-01', 14770.00, 48, 114, '2025-08-03 18:38:11', NULL),
('2024-05-02', 3790.00, 14, 34, '2025-08-03 18:38:11', NULL),
('2024-05-03', 10785.00, 40, 95, '2025-08-03 18:38:11', NULL),
('2024-05-04', 14300.00, 47, 111, '2025-08-03 18:38:11', NULL),
('2024-05-05', 8720.00, 33, 78, '2025-08-03 18:38:11', NULL),
('2024-05-06', 4360.00, 17, 39, '2025-08-03 18:38:11', NULL),
('2024-05-07', 3850.00, 15, 35, '2025-08-03 18:38:11', NULL),
('2024-05-08', 20110.00, 62, 147, '2025-08-03 18:38:11', NULL),
('2024-05-09', 9270.00, 35, 83, '2025-08-03 18:38:11', NULL),
('2024-05-10', 12175.00, 41, 97, '2025-08-03 18:38:11', NULL),
('2024-05-11', 5875.00, 22, 52, '2025-08-03 18:38:11', NULL),
('2024-05-13', 2220.00, 8, 19, '2025-08-03 18:38:11', NULL),
('2024-05-14', 3500.00, 13, 31, '2025-08-03 18:38:11', NULL),
('2024-05-15', 8300.00, 31, 74, '2025-08-03 18:38:11', NULL),
('2024-05-16', 11800.00, 40, 94, '2025-08-03 18:38:11', NULL),
('2024-05-17', 5920.00, 22, 53, '2025-08-03 18:38:11', NULL),
('2024-05-18', 10730.00, 39, 92, '2025-08-03 18:38:11', NULL),
('2024-05-19', 9170.00, 35, 82, '2025-08-03 18:38:11', NULL),
('2024-05-20', 14710.00, 48, 114, '2025-08-03 18:38:11', NULL),
('2024-05-21', 6740.00, 26, 61, '2025-08-03 18:38:11', NULL),
('2024-05-22', 8130.00, 31, 73, '2025-08-03 18:38:11', NULL),
('2024-05-23', 5930.00, 22, 53, '2025-08-03 18:38:11', NULL),
('2024-05-24', 3980.00, 15, 36, '2025-08-03 18:38:11', NULL),
('2024-05-25', 3910.00, 15, 35, '2025-08-03 18:38:11', NULL),
('2024-05-26', 4950.00, 19, 44, '2025-08-03 18:38:11', NULL),
('2024-05-27', 3980.00, 15, 36, '2025-08-03 18:38:11', NULL),
('2024-05-28', 5570.00, 21, 50, '2025-08-03 18:38:11', NULL),
('2024-05-29', 8320.00, 31, 74, '2025-08-03 18:38:11', NULL),
('2024-05-30', 20700.00, 63, 149, '2025-08-03 18:38:11', NULL),
('2024-05-31', 9160.00, 35, 82, '2025-08-03 18:38:11', NULL),
('2024-06-01', 14065.00, 46, 109, '2025-08-03 18:38:11', NULL),
('2024-06-02', 12090.00, 41, 97, '2025-08-03 18:38:11', NULL),
('2024-06-03', 16820.00, 55, 130, '2025-08-03 18:38:11', NULL),
('2024-06-04', 7170.00, 27, 64, '2025-08-03 18:38:11', NULL),
('2024-06-05', 2000.00, 8, 18, '2025-08-03 18:38:11', NULL),
('2024-06-06', 16465.00, 54, 127, '2025-08-03 18:38:11', NULL),
('2024-06-07', 16830.00, 55, 130, '2025-08-03 18:38:11', NULL),
('2024-06-08', 11270.00, 40, 94, '2025-08-03 18:38:11', NULL),
('2024-06-09', 21750.00, 66, 157, '2025-08-03 18:38:11', NULL),
('2024-06-10', 6790.00, 26, 61, '2025-08-03 18:38:11', NULL),
('2024-06-11', 3610.00, 14, 32, '2025-08-03 18:38:11', NULL),
('2024-06-12', 15890.00, 52, 123, '2025-08-03 18:38:11', NULL),
('2024-06-13', 3605.00, 14, 32, '2025-08-03 18:38:11', NULL),
('2024-06-14', 13525.00, 44, 105, '2025-08-03 18:38:11', NULL),
('2024-06-15', 35445.00, 102, 243, '2025-08-03 18:38:11', NULL),
('2024-06-16', 2430.00, 9, 22, '2025-08-03 18:38:11', NULL),
('2024-06-17', 4910.00, 19, 44, '2025-08-03 18:38:11', NULL),
('2024-06-18', 5000.00, 19, 45, '2025-08-03 18:38:11', NULL),
('2024-06-19', 600.00, 3, 6, '2025-08-03 18:38:11', NULL),
('2024-06-20', 6130.00, 23, 55, '2025-08-03 18:38:11', NULL),
('2024-06-21', 8800.00, 33, 78, '2025-08-03 18:38:11', NULL),
('2024-06-22', 9650.00, 36, 86, '2025-08-03 18:38:11', NULL),
('2024-06-23', 7900.00, 30, 71, '2025-08-03 18:38:11', NULL),
('2024-06-24', 1090.00, 4, 10, '2025-08-03 18:38:11', NULL),
('2024-06-25', 13270.00, 44, 103, '2025-08-03 18:38:11', NULL),
('2024-06-26', 8660.00, 33, 78, '2025-08-03 18:38:11', NULL),
('2024-06-27', 9340.00, 35, 83, '2025-08-03 18:38:11', NULL),
('2024-06-28', 14240.00, 47, 111, '2025-08-03 18:38:11', NULL),
('2024-06-29', 6080.00, 23, 55, '2025-08-03 18:38:11', NULL),
('2024-06-30', 10250.00, 38, 90, '2025-08-03 18:38:11', NULL),
('2024-07-01', 4970.00, 19, 44, '2025-08-03 18:38:11', NULL),
('2024-07-02', 3075.00, 12, 28, '2025-08-03 18:38:11', NULL),
('2024-07-03', 8330.00, 31, 74, '2025-08-03 18:38:11', NULL),
('2024-07-04', 11015.00, 40, 94, '2025-08-03 18:38:11', NULL),
('2024-07-05', 15665.00, 51, 121, '2025-08-03 18:38:11', NULL),
('2024-07-06', 13500.00, 44, 105, '2025-08-03 18:38:11', NULL),
('2024-07-07', 4740.00, 18, 42, '2025-08-03 18:38:11', NULL),
('2024-07-08', 9530.00, 36, 85, '2025-08-03 18:38:11', NULL),
('2024-07-09', 5695.00, 22, 51, '2025-08-03 18:38:11', NULL),
('2024-07-10', 6390.00, 24, 57, '2025-08-03 18:38:11', NULL),
('2024-07-11', 8310.00, 31, 74, '2025-08-03 18:38:11', NULL),
('2024-07-12', 11525.00, 40, 95, '2025-08-03 18:38:11', NULL),
('2024-07-13', 19195.00, 62, 147, '2025-08-03 18:38:11', NULL),
('2024-07-14', 15610.00, 51, 120, '2025-08-03 18:38:11', NULL),
('2024-07-15', 9680.00, 36, 86, '2025-08-03 18:38:11', NULL),
('2024-07-16', 12290.00, 42, 99, '2025-08-03 18:38:11', NULL),
('2024-07-17', 7405.00, 28, 66, '2025-08-03 18:38:11', NULL),
('2024-07-18', 4630.00, 18, 41, '2025-08-03 18:38:11', NULL),
('2024-07-19', 11590.00, 40, 95, '2025-08-03 18:38:11', NULL),
('2024-07-20', 11240.00, 40, 94, '2025-08-03 18:38:11', NULL),
('2024-07-21', 9925.00, 37, 88, '2025-08-03 18:38:11', NULL),
('2024-07-22', 7900.00, 30, 71, '2025-08-03 18:38:11', NULL),
('2024-07-23', 10795.00, 39, 92, '2025-08-03 18:38:11', NULL),
('2025-08-04', 1200.00, 3, 3, '2025-08-04 05:20:56', '2025-08-05 13:48:33'),
('2025-08-05', 3450.00, 6, 8, '2025-08-05 13:44:21', '2025-08-11 06:26:37'),
('2025-08-11', 3900.00, 10, 10, '2025-08-11 07:03:05', '2025-08-11 08:48:47'),
('2025-09-09', 2400.00, 4, 7, '2025-09-09 01:58:18', '2025-09-09 11:17:02'),
('2025-09-25', 3640.00, 9, 11, '2025-09-25 09:20:16', '2025-09-25 10:20:09'),
('2025-09-30', 3140.00, 7, 10, '2025-09-30 03:13:35', '2025-09-30 08:31:56'),
('2025-10-01', 1050.00, 3, 3, '2025-10-01 10:52:17', '2025-10-01 12:30:24');

-- --------------------------------------------------------

--
-- Table structure for table `extras`
--

CREATE TABLE `extras` (
  `extra_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_available` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `extras`
--

INSERT INTO `extras` (`extra_id`, `name`, `price`, `is_available`) VALUES
(1, 'Extra Parmesan', 100.00, 1),
(2, 'Extra Toppings', 100.00, 1);

-- --------------------------------------------------------

--
-- Table structure for table `ingredients`
--

CREATE TABLE `ingredients` (
  `ingredient_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `unit` varchar(20) NOT NULL,
  `cost_per_unit` decimal(10,2) NOT NULL,
  `current_stock` decimal(10,2) DEFAULT 0.00,
  `minimum_stock` decimal(10,2) DEFAULT 0.00,
  `supplier_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ingredients`
--

INSERT INTO `ingredients` (`ingredient_id`, `name`, `description`, `unit`, `cost_per_unit`, `current_stock`, `minimum_stock`, `supplier_id`, `created_at`, `updated_at`) VALUES
(1, 'Flour', NULL, 'kg', 50.00, 25.00, 10.00, NULL, '2025-07-28 14:01:50', NULL),
(2, 'Tomatoes', NULL, 'kg', 80.00, 15.00, 5.00, NULL, '2025-07-28 14:01:50', NULL),
(3, 'Mozzarella Cheese', NULL, 'kg', 300.00, 10.00, 3.00, NULL, '2025-07-28 14:01:50', NULL),
(4, 'Chicken', NULL, 'kg', 180.00, 20.00, 5.00, NULL, '2025-07-28 14:01:50', NULL),
(5, 'Beef', NULL, 'kg', 400.00, 15.00, 3.00, NULL, '2025-07-28 14:01:50', NULL),
(6, 'Pork', NULL, 'kg', 250.00, 15.00, 3.00, NULL, '2025-07-28 14:01:50', NULL),
(7, 'Rice', NULL, 'kg', 60.00, 30.00, 10.00, NULL, '2025-07-28 14:01:50', NULL),
(8, 'Bread', NULL, 'loaf', 40.00, 20.00, 5.00, NULL, '2025-07-28 14:01:50', NULL),
(9, 'Mushrooms', NULL, 'kg', 150.00, 5.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(10, 'Onions', NULL, 'kg', 60.00, 10.00, 2.00, NULL, '2025-07-28 14:01:50', NULL),
(11, 'Garlic', NULL, 'kg', 80.00, 3.00, 0.50, NULL, '2025-07-28 14:01:50', NULL),
(12, 'Pasta', NULL, 'kg', 100.00, 15.00, 5.00, NULL, '2025-07-28 14:01:50', NULL),
(13, 'Olive Oil', NULL, 'liter', 350.00, 10.00, 2.00, NULL, '2025-07-28 14:01:50', NULL),
(14, 'White Wine', NULL, 'bottle', 500.00, 10.00, 3.00, NULL, '2025-07-28 14:01:50', NULL),
(15, 'Red Wine', NULL, 'bottle', 500.00, 10.00, 3.00, NULL, '2025-07-28 14:01:50', NULL),
(16, 'Potatoes', NULL, 'kg', 60.00, 20.00, 5.00, NULL, '2025-07-28 14:01:50', NULL),
(17, 'Salami', NULL, 'kg', 400.00, 5.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(18, 'Ham', NULL, 'kg', 350.00, 8.00, 2.00, NULL, '2025-07-28 14:01:50', NULL),
(19, 'Tuna', NULL, 'kg', 300.00, 5.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(20, 'Squid', NULL, 'kg', 250.00, 8.00, 2.00, NULL, '2025-07-28 14:01:50', NULL),
(21, 'Shrimp', NULL, 'kg', 400.00, 8.00, 2.00, NULL, '2025-07-28 14:01:50', NULL),
(22, 'Clams', NULL, 'kg', 350.00, 5.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(23, 'Mussels', NULL, 'kg', 300.00, 5.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(24, 'Bacon', NULL, 'kg', 350.00, 5.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(25, 'Ground Beef', NULL, 'kg', 320.00, 10.00, 3.00, NULL, '2025-07-28 14:01:50', NULL),
(26, 'Cream', NULL, 'liter', 200.00, 5.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(27, 'Eggs', NULL, 'dozen', 120.00, 5.00, 2.00, NULL, '2025-07-28 14:01:50', NULL),
(28, 'Eggplant', NULL, 'kg', 80.00, 5.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(29, 'Pineapple', NULL, 'kg', 100.00, 10.00, 2.00, NULL, '2025-07-28 14:01:50', NULL),
(30, 'Banana', NULL, 'kg', 80.00, 10.00, 2.00, NULL, '2025-07-28 14:01:50', NULL),
(31, 'Mango', NULL, 'kg', 120.00, 10.00, 2.00, NULL, '2025-07-28 14:01:50', NULL),
(32, 'Orange', NULL, 'kg', 100.00, 10.00, 2.00, NULL, '2025-07-28 14:01:50', NULL),
(33, 'Nutella', NULL, 'jar', 250.00, 5.00, 2.00, NULL, '2025-07-28 14:01:50', NULL),
(34, 'San Miguel Light Beer', NULL, 'bottle', 50.00, 50.00, 20.00, NULL, '2025-07-28 14:01:50', NULL),
(35, 'San Miguel Beer', NULL, 'bottle', 50.00, 50.00, 20.00, NULL, '2025-07-28 14:01:50', NULL),
(36, 'Heineken Beer', NULL, 'bottle', 80.00, 30.00, 10.00, NULL, '2025-07-28 14:01:50', NULL),
(37, 'Coke', NULL, 'bottle', 30.00, 50.00, 20.00, NULL, '2025-07-28 14:01:50', NULL),
(38, 'Sprite', NULL, 'bottle', 30.00, 50.00, 20.00, NULL, '2025-07-28 14:01:50', NULL),
(39, 'Royal', NULL, 'bottle', 30.00, 50.00, 20.00, NULL, '2025-07-28 14:01:50', NULL),
(40, 'Bottled Water', NULL, 'bottle', 20.00, 100.00, 30.00, NULL, '2025-07-28 14:01:50', NULL),
(41, 'Baileys', NULL, 'bottle', 1000.00, 3.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(42, 'Jack Daniels', NULL, 'bottle', 1500.00, 3.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(43, 'Tequila', NULL, 'bottle', 1200.00, 3.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(44, 'Cruzan Rum', NULL, 'bottle', 1000.00, 3.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(45, 'Gin', NULL, 'bottle', 800.00, 3.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(46, 'Vodka', NULL, 'bottle', 800.00, 3.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(47, 'Whiskey', NULL, 'bottle', 1200.00, 3.00, 1.00, NULL, '2025-07-28 14:01:50', NULL),
(48, 'Tonic Water', NULL, 'bottle', 60.00, 20.00, 5.00, NULL, '2025-07-28 14:01:50', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `inventory_transactions`
--

CREATE TABLE `inventory_transactions` (
  `transaction_id` int(11) NOT NULL,
  `ingredient_id` int(11) NOT NULL,
  `transaction_type` enum('purchase','usage','adjustment','waste') NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `transaction_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `menu_items`
--

CREATE TABLE `menu_items` (
  `item_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `menu_items`
--

INSERT INTO `menu_items` (`item_id`, `category_id`, `name`, `description`, `price`, `image_path`, `is_available`, `created_at`, `updated_at`) VALUES
(1, 1, 'BIANCA', 'Mozzarella', 300.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(2, 1, 'MARGHERITA', 'Tomato, Mozzarella', 330.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(3, 1, 'DIAVOLA', 'Tomato, Mozzarella, Salami, Spicy', 450.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(4, 1, 'CAPRICCIOSA', 'Tomato, Mozzarella, Ham, Mushroom, Onion', 450.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(5, 1, 'EMIL', 'Half Fold, Half Open - Tomato, Mozzarella, Cook Ham, Mushroom, Salami, Onion', 500.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(6, 1, 'ROMANA', 'Tomato, Mozzarella, Anchioves, Cappers', 500.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(7, 1, 'HAWAIAN', 'Tomato, Mozzarella, Cook Ham, Pineapple', 450.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(8, 1, 'CALZONE', 'Pizza Fold - Tomato, Mozzarella, Mushroom, Ham', 450.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(9, 1, 'SEAFOOD', 'Tomato, Clamps, Muscles, Squid, Shrimp, Tuna', 600.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(10, 2, 'Scaloppine Al Vino', 'Pork Slices with White Wine', 300.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(11, 2, 'Scaloppine Al Limone', 'Pork Slice with Lemon', 300.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(12, 2, 'Scalloppine Al Balsamico', 'Pork Slices with Balsamic Vinegar', 330.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(13, 2, 'Pollo arrosto con patate', 'Oven baked chicken with potatoes', 350.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(14, 2, 'Pollo alla cacciatora', 'Stew chicken with potato', 350.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(15, 2, 'Straccetti Di Manzo', 'Beef Tenderloin with Olive Oil and Garlic', 350.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(16, 2, 'Filetto Al Pepe', 'Beef Tenderloin with Pepper Sauce', 500.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(17, 2, 'Filetto Al Balsamico', 'Beef Tenderloin with Balsamic Vinegar', 500.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(18, 3, 'Impepata Di Cozze', 'Muscles with Black Pepper', 250.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(19, 3, 'Cozze Alla Tarantina', 'Muscles with Tomato Sauce, Garlic, Chili', 280.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(20, 3, 'Calamari fritti', 'Fried Squid', 300.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(21, 3, 'Pesce Al Forno', 'Fish oven baked with baked Potato (good for 2)', 1000.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(22, 4, 'Aglio Olio e Peperoncinno', 'Olive oil, Chili, Garlic', 200.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(23, 4, 'Alla Norma', 'Tomato, Eggplant, Anchioves, Chili', 320.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(24, 4, 'Amatriciana', 'Tomato, Pork Belly, Chili', 320.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(25, 4, 'Bolognese', 'Ground Meat, Red Sauce', 320.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(26, 4, 'Carbonara', 'Bacon, Cream', 320.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(27, 4, 'Vongole', 'Clamps, muscles, Olive Oil', 350.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(28, 4, 'Marinara', 'Clamps, Muscles, Tomato, Shrimp, Squid', 400.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(29, 4, 'Arrabbiata', 'Red Sauce, Spicy, Garlic', 320.00, NULL, 1, '2025-07-28 14:01:49', NULL),
(30, 5, 'Crespelle Al Forno', 'Crepes rolled w/ Cheese & Veges. /Oven Baked', 300.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(31, 5, 'Capponata', 'Mixed Vegetables sauted in Tomato Sauce', 250.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(32, 5, 'Crescentine Fritte', 'Fried Dough with Cheese', 300.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(33, 5, 'Caprese', 'Tomato, Mozzarella Salad', 250.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(34, 5, 'Rumble Salad', 'Mixed Vegetables Salad', 200.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(35, 5, 'Patatine Fritte', 'Fried Potato', 200.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(36, 6, 'Banana Crepe', 'Sweet crepe with banana', 150.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(37, 6, 'Mango Crepe', 'Sweet crepe with mango', 150.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(38, 6, 'Pineapple Crepe', 'Sweet crepe with pineapple', 150.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(39, 6, 'Chocolate Crepe', 'Sweet crepe with Nutella', 170.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(40, 6, 'Pannacotta', 'Baked Cream with Chocolate Toppings', 180.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(41, 7, 'Mango Shake', 'Fresh mango milkshake', 100.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(42, 7, 'Banana Shake', 'Fresh banana milkshake', 100.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(43, 7, 'Vanilla Shake', 'Vanilla flavored milkshake', 100.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(44, 7, 'Chocolate Shake', 'Chocolate flavored milkshake', 100.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(45, 7, 'Pineapple Shake', 'Fresh pineapple milkshake', 100.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(46, 8, 'Baileys', 'Irish cream liqueur shot', 150.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(47, 8, 'Jack Daniels', 'Tennessee whiskey shot', 150.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(48, 8, 'Tequila', 'Mexican distilled spirit shot', 150.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(49, 8, 'Cruzan - Rhum', 'Rum shot', 150.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(50, 9, 'Gin - Tonic', 'Gin and tonic water', 200.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(51, 9, 'Rhum-Coke', 'Rum with cola', 180.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(52, 9, 'Vodka-Orange', 'Vodka with orange juice', 200.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(53, 9, 'Whiskey-Coke', 'Whiskey with cola', 250.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(54, 9, 'Piñacolada', 'Rum, coconut cream and pineapple juice', 250.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(55, 10, 'Prosciutto e Formaggio', 'Ham and Cheese', 180.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(56, 10, 'Pancetta e Formaggio', 'Bacon and Cheese', 180.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(57, 10, 'All\' Occhio di Bue', 'Sunny Side Up Egg Sandwich', 150.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(58, 10, 'Al Tonno', 'Tuna, Mayonnaise', 150.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(59, 11, 'San Miguel Light', 'Light beer', 80.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(60, 11, 'San Miguel Beer', 'Regular beer', 80.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(61, 11, 'Heineken', '330 ml bottle', 130.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(62, 11, 'Coke', 'Cola soft drink', 50.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(63, 11, 'Sprite', 'Lemon-lime soft drink', 50.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(64, 11, 'Royal', 'Orange flavor soft drink', 50.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(65, 11, 'Bottled Water', 'Mineral water', 40.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(66, 11, '1.5 Liters (Softdrinks)', 'Large bottle of soft drink', 160.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(67, 12, 'Mango Juice', 'Fresh mango juice', 90.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(68, 12, 'Pineapple Juice', 'Fresh pineapple juice', 90.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(69, 12, 'Orange Juice', 'Fresh orange juice', 90.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(70, 13, 'White Wine (Glass)', 'Glass of white wine', 250.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(71, 13, 'Red Wine (Glass)', 'Glass of red wine', 250.00, NULL, 1, '2025-07-28 14:01:50', NULL),
(72, 13, 'House Wine (Bottle)', 'Bottle of house wine', 1000.00, NULL, 1, '2025-07-28 14:01:50', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL,
  `table_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `order_type` enum('dine_in','takeout','delivery') NOT NULL DEFAULT 'dine_in',
  `status` enum('pending','in_progress','ready','served','completed','cancelled') NOT NULL DEFAULT 'pending',
  `payment_status` enum('pending','paid','refunded') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`order_id`, `table_id`, `user_id`, `customer_name`, `order_type`, `status`, `payment_status`, `notes`, `created_at`, `completed_at`) VALUES
(18, 3, 1, NULL, 'dine_in', 'completed', 'pending', '', '2025-08-11 07:03:05', '2025-09-05 06:20:46'),
(19, 4, 1, NULL, 'dine_in', 'completed', 'pending', '', '2025-08-11 07:03:45', '2025-09-05 06:20:42'),
(20, 1, 1, NULL, 'dine_in', 'completed', 'pending', '', '2025-08-11 08:41:08', NULL),
(21, 1, 1, NULL, 'dine_in', 'completed', 'pending', '', '2025-08-11 08:41:59', '2025-09-05 06:20:37'),
(22, 2, 1, NULL, 'dine_in', 'completed', 'pending', '', '2025-08-11 08:42:50', '2025-09-05 06:20:41'),
(23, 7, 1, NULL, 'dine_in', 'completed', 'pending', '', '2025-08-11 08:48:47', NULL),
(24, 1, 1, NULL, 'dine_in', 'completed', 'pending', NULL, '2025-09-05 06:23:19', '2025-09-05 06:23:28'),
(30, 5, 1, NULL, 'dine_in', 'completed', '', 'test', '2025-09-09 01:55:08', '2025-09-09 10:39:04'),
(31, 6, 1, NULL, 'dine_in', 'served', 'paid', '', '2025-09-09 01:58:18', NULL),
(32, 3, 1, NULL, 'dine_in', 'served', 'paid', '', '2025-09-09 02:04:54', NULL),
(33, 1, 1, NULL, 'dine_in', 'completed', 'paid', '', '2025-09-09 11:07:09', '2025-09-25 09:19:32'),
(34, 2, 1, NULL, 'dine_in', 'served', 'paid', '', '2025-09-09 11:17:02', NULL),
(35, 3, 1, NULL, 'dine_in', 'served', 'paid', 'pakisarapan po', '2025-09-25 09:20:16', NULL),
(36, 5, 1, NULL, 'dine_in', 'served', 'paid', 'Test order for receipt', '2025-09-25 09:36:54', NULL),
(37, 5, 1, NULL, 'dine_in', 'served', 'paid', 'Test order for receipt', '2025-09-25 09:37:10', NULL),
(38, 2, 1, NULL, 'dine_in', 'served', 'paid', '', '2025-09-25 09:38:47', NULL),
(39, 6, 1, NULL, 'dine_in', 'served', 'paid', 'Test order for receipt creation', '2025-09-25 09:46:41', NULL),
(40, 3, 1, NULL, 'dine_in', 'served', 'paid', 'pakisarapan po', '2025-09-25 09:47:57', NULL),
(41, 4, 1, NULL, 'dine_in', 'served', 'paid', '', '2025-09-25 09:57:39', NULL),
(42, 6, 1, 'EMILTHEGREAT', 'dine_in', 'served', 'paid', 'IM ALLERGIC TO NOT BEING AWESOME', '2025-09-25 10:18:05', NULL),
(43, 10, 1, NULL, 'dine_in', 'served', 'paid', '', '2025-09-25 10:20:09', NULL),
(44, 1, 1, NULL, 'dine_in', 'completed', 'pending', NULL, '2025-09-30 03:11:20', '2025-09-30 03:11:24'),
(45, 3, 1, NULL, 'dine_in', 'served', '', 'afdssadfag', '2025-09-30 03:12:16', NULL),
(46, 4, 1, NULL, 'dine_in', 'served', 'paid', '', '2025-09-30 03:13:35', NULL),
(47, 2, 1, NULL, 'dine_in', 'served', 'paid', '', '2025-09-30 03:14:04', NULL),
(48, 7, 1, 'EMILTHEGREAT', 'dine_in', 'served', 'paid', 'IM ALLERGIC TO NOT BEING AWESOME', '2025-09-30 03:19:14', NULL),
(49, 3, 1, NULL, 'dine_in', 'served', 'paid', '', '2025-09-30 06:02:15', NULL),
(50, 2, 1, NULL, 'dine_in', 'served', 'paid', '', '2025-09-30 06:03:39', NULL),
(51, 8, 1, 'sean', 'dine_in', 'served', 'pending', '', '2025-09-30 08:24:15', NULL),
(52, 8, 1, 'sean', 'dine_in', 'served', 'paid', '', '2025-09-30 08:24:58', NULL),
(53, 7, 1, NULL, 'dine_in', 'served', 'paid', 'bfoasjghw;ljg', '2025-09-30 08:30:50', NULL),
(54, 3, 1, NULL, 'dine_in', 'served', '', '', '2025-09-30 08:33:07', NULL),
(55, 3, 1, NULL, 'dine_in', 'served', 'paid', '', '2025-10-01 10:52:17', NULL),
(56, 3, 1, NULL, 'dine_in', 'ready', 'paid', '', '2025-10-01 12:29:49', NULL),
(57, 4, 1, NULL, 'dine_in', 'ready', 'paid', '', '2025-10-01 12:30:04', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL,
  `side_option` enum('bread','rice') DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('pending','preparing','ready','served','cancelled') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`order_item_id`, `order_id`, `item_id`, `quantity`, `unit_price`, `side_option`, `notes`, `status`, `created_at`) VALUES
(22, 18, 8, 1, 450.00, NULL, NULL, 'pending', '2025-08-11 07:03:05'),
(23, 19, 8, 1, 450.00, NULL, NULL, 'pending', '2025-08-11 07:03:45'),
(24, 20, 1, 1, 300.00, NULL, NULL, 'pending', '2025-08-11 08:41:08'),
(25, 21, 1, 1, 300.00, NULL, NULL, 'pending', '2025-08-11 08:41:59'),
(26, 22, 4, 1, 450.00, NULL, NULL, 'pending', '2025-08-11 08:42:50'),
(27, 23, 3, 1, 450.00, NULL, NULL, 'pending', '2025-08-11 08:48:47'),
(28, 30, 1, 1, 100.00, NULL, '', 'pending', '2025-09-09 01:55:08'),
(29, 31, 5, 1, 500.00, NULL, '', 'pending', '2025-09-09 01:58:18'),
(30, 32, 5, 1, 500.00, NULL, '', 'pending', '2025-09-09 02:04:54'),
(31, 32, 8, 1, 450.00, NULL, '', 'pending', '2025-09-09 02:04:54'),
(32, 33, 70, 1, 250.00, NULL, '', 'pending', '2025-09-09 11:07:09'),
(33, 33, 71, 1, 250.00, NULL, '', 'pending', '2025-09-09 11:07:09'),
(34, 34, 26, 1, 320.00, NULL, '', 'pending', '2025-09-09 11:17:02'),
(35, 34, 61, 1, 130.00, NULL, '', 'pending', '2025-09-09 11:17:02'),
(36, 35, 5, 1, 500.00, NULL, '', 'pending', '2025-09-25 09:20:16'),
(37, 36, 1, 1, 300.00, NULL, '', 'pending', '2025-09-25 09:36:54'),
(38, 37, 1, 1, 300.00, NULL, '', 'pending', '2025-09-25 09:37:10'),
(39, 38, 1, 1, 300.00, NULL, '', 'pending', '2025-09-25 09:38:47'),
(40, 39, 2, 1, 330.00, NULL, '', 'pending', '2025-09-25 09:46:41'),
(41, 40, 5, 1, 500.00, NULL, 'pakisarapan po', 'pending', '2025-09-25 09:47:57'),
(42, 41, 51, 1, 180.00, NULL, '', 'pending', '2025-09-25 09:57:39'),
(43, 42, 1, 3, 300.00, NULL, '', 'pending', '2025-09-25 10:18:05'),
(44, 43, 2, 1, 330.00, NULL, '', 'pending', '2025-09-25 10:20:09'),
(45, 45, 4, 1, 450.00, NULL, '', 'pending', '2025-09-30 03:12:16'),
(46, 45, 57, 1, 150.00, NULL, '', 'pending', '2025-09-30 03:12:16'),
(47, 46, 4, 1, 450.00, NULL, '', 'pending', '2025-09-30 03:13:35'),
(48, 47, 42, 1, 100.00, NULL, '', 'pending', '2025-09-30 03:14:04'),
(49, 48, 19, 1, 280.00, NULL, '', 'pending', '2025-09-30 03:19:14'),
(50, 49, 30, 1, 300.00, NULL, '', 'pending', '2025-09-30 06:02:15'),
(51, 49, 32, 1, 300.00, NULL, '', 'pending', '2025-09-30 06:02:15'),
(52, 50, 2, 1, 330.00, NULL, '', 'pending', '2025-09-30 06:03:39'),
(53, 51, 6, 1, 500.00, NULL, '', 'pending', '2025-09-30 08:24:15'),
(54, 52, 7, 1, 450.00, NULL, '', 'pending', '2025-09-30 08:24:58'),
(55, 53, 2, 1, 330.00, NULL, '', 'pending', '2025-09-30 08:30:50'),
(56, 53, 1, 2, 300.00, NULL, '', 'pending', '2025-09-30 08:30:50'),
(57, 54, 1, 1, 300.00, NULL, '', 'pending', '2025-09-30 08:33:07'),
(58, 55, 45, 1, 100.00, NULL, '', 'pending', '2025-10-01 10:52:17'),
(59, 56, 3, 1, 450.00, NULL, '', 'pending', '2025-10-01 12:29:49'),
(60, 57, 6, 1, 500.00, NULL, '', 'pending', '2025-10-01 12:30:04');

-- --------------------------------------------------------

--
-- Table structure for table `order_item_extras`
--

CREATE TABLE `order_item_extras` (
  `order_item_extra_id` int(11) NOT NULL,
  `order_item_id` int(11) NOT NULL,
  `extra_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','credit_card','debit_card','mobile_payment','other') NOT NULL,
  `status` enum('pending','completed','refunded','failed') NOT NULL DEFAULT 'pending',
  `transaction_reference` varchar(100) DEFAULT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `cash_given` decimal(10,2) DEFAULT NULL,
  `change_amount` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`payment_id`, `order_id`, `amount`, `payment_method`, `status`, `transaction_reference`, `payment_date`, `user_id`, `notes`, `cash_given`, `change_amount`) VALUES
(13, 18, 450.00, 'cash', 'completed', 'RCP-20250811-0018', '2025-08-11 07:03:05', 1, 'Cash: ₱500, Change: ₱50', NULL, NULL),
(14, 19, 450.00, 'cash', 'completed', 'RCP-20250811-0019', '2025-08-11 07:03:45', 1, 'Cash: ₱500, Change: ₱50', NULL, NULL),
(15, 20, 300.00, 'cash', 'completed', 'RCP-20250811-0020', '2025-08-11 08:41:08', 1, 'Cash: ₱1000, Change: ₱700', NULL, NULL),
(16, 21, 300.00, 'cash', 'completed', 'RCP-20250811-0021', '2025-08-11 08:41:59', 1, 'Cash: ₱500, Change: ₱200', NULL, NULL),
(17, 23, 450.00, 'cash', 'completed', 'RCP-20250811-0023', '2025-08-11 08:48:47', 1, 'Cash: ₱500, Change: ₱50', NULL, NULL),
(18, 31, 500.00, 'cash', 'completed', NULL, '2025-09-09 01:58:18', 1, NULL, NULL, NULL),
(19, 32, 950.00, 'cash', 'completed', NULL, '2025-09-09 06:51:11', 1, NULL, NULL, NULL),
(20, 33, 500.00, 'cash', 'completed', NULL, '2025-09-09 11:07:09', 1, NULL, NULL, NULL),
(21, 34, 450.00, 'cash', 'completed', NULL, '2025-09-09 11:17:02', 1, NULL, NULL, NULL),
(22, 35, 500.00, 'cash', 'completed', NULL, '2025-09-25 09:20:16', 1, NULL, NULL, NULL),
(23, 36, 300.00, 'cash', 'completed', NULL, '2025-09-25 09:36:54', 1, NULL, NULL, NULL),
(24, 37, 300.00, 'cash', 'completed', NULL, '2025-09-25 09:37:10', 1, NULL, NULL, NULL),
(25, 38, 300.00, 'cash', 'completed', NULL, '2025-09-25 09:39:08', 1, NULL, NULL, NULL),
(26, 39, 330.00, 'cash', 'completed', NULL, '2025-09-25 09:46:41', 1, NULL, 430.00, 100.00),
(27, 40, 500.00, 'cash', 'completed', NULL, '2025-09-25 09:47:57', 1, NULL, 600.00, 100.00),
(28, 41, 180.00, 'cash', 'completed', NULL, '2025-09-25 09:57:39', 1, NULL, 500.00, 320.00),
(29, 42, 900.00, 'cash', 'completed', NULL, '2025-09-25 10:19:01', 1, NULL, NULL, NULL),
(30, 43, 330.00, 'cash', 'completed', NULL, '2025-09-25 10:20:09', 1, NULL, 330.00, 0.00),
(31, 46, 450.00, 'cash', 'completed', NULL, '2025-09-30 03:13:35', 1, NULL, 500.00, 50.00),
(32, 47, 100.00, 'cash', 'completed', NULL, '2025-09-30 03:14:17', 1, NULL, NULL, NULL),
(33, 48, 280.00, 'cash', 'completed', NULL, '2025-09-30 03:19:36', 1, NULL, NULL, NULL),
(34, 49, 600.00, 'cash', 'completed', NULL, '2025-09-30 06:02:15', 1, NULL, 600.00, 0.00),
(35, 50, 330.00, 'cash', 'completed', NULL, '2025-09-30 06:03:39', 1, NULL, 330.00, 0.00),
(36, 52, 450.00, 'cash', 'completed', NULL, '2025-09-30 08:25:03', 1, NULL, NULL, NULL),
(37, 53, 930.00, 'cash', 'completed', NULL, '2025-09-30 08:31:56', 1, NULL, NULL, NULL),
(38, 55, 100.00, 'cash', 'completed', NULL, '2025-10-01 10:52:17', 1, NULL, 200.00, 100.00),
(39, 57, 500.00, 'cash', 'completed', NULL, '2025-10-01 12:30:22', 1, NULL, NULL, NULL),
(40, 56, 450.00, 'cash', 'completed', NULL, '2025-10-01 12:30:24', 1, NULL, NULL, NULL);

--
-- Triggers `payments`
--
DELIMITER $$
CREATE TRIGGER `after_payment_completed` AFTER UPDATE ON `payments` FOR EACH ROW BEGIN
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
            NULL, -- Cash given would be updated separately if known
            NULL, -- Change amount would be updated separately if known
            v_customer_name,
            NEW.user_id
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_payment_insert` AFTER INSERT ON `payments` FOR EACH ROW BEGIN
    IF NEW.status = 'completed' THEN
        -- Update or insert daily sales record
        INSERT INTO daily_sales (sales_date, total_sales, total_orders, total_items_sold)
        VALUES (
            DATE(NEW.payment_date), 
            NEW.amount, 
            1,
            (SELECT SUM(quantity) FROM order_items WHERE order_id = NEW.order_id)
        )
        ON DUPLICATE KEY UPDATE
            total_sales = total_sales + NEW.amount,
            total_orders = total_orders + 1,
            total_items_sold = total_items_sold + 
                (SELECT SUM(quantity) FROM order_items WHERE order_id = NEW.order_id),
            updated_at = CURRENT_TIMESTAMP;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `receipts`
--

CREATE TABLE `receipts` (
  `receipt_id` int(11) NOT NULL,
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
  `created_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `receipts`
--

INSERT INTO `receipts` (`receipt_id`, `receipt_number`, `order_id`, `payment_id`, `subtotal`, `tax_amount`, `discount_amount`, `total_amount`, `cash_given`, `change_amount`, `customer_name`, `notes`, `created_at`, `created_by`) VALUES
(1, 'RCP-20250925-0039', 39, 26, 294.64, 35.36, 0.00, 330.00, 430.00, 100.00, 'Test order for receipt creation', NULL, '2025-09-25 09:46:41', 1),
(2, 'RCP-20250925-0040', 40, 27, 446.43, 53.57, 0.00, 500.00, 600.00, 100.00, 'pakisarapan po', NULL, '2025-09-25 09:47:57', 1),
(3, 'RCP-20250925-0041', 41, 28, 180.00, 0.00, 0.00, 180.00, 500.00, 320.00, '', NULL, '2025-09-25 09:57:39', 1),
(4, 'RCP-20250925-0042', 42, 29, 900.00, 0.00, 0.00, 900.00, NULL, NULL, 'EMILTHEGREAT', NULL, '2025-09-25 10:19:01', 1),
(5, 'RCP-20250925-0043', 43, 30, 330.00, 0.00, 0.00, 330.00, 330.00, 0.00, '', NULL, '2025-09-25 10:20:09', 1),
(6, 'RCP-20250930-0046', 46, 31, 450.00, 0.00, 0.00, 450.00, 500.00, 50.00, '', NULL, '2025-09-30 03:13:35', 1),
(7, 'RCP-20250930-0047', 47, 32, 100.00, 0.00, 0.00, 100.00, NULL, NULL, NULL, NULL, '2025-09-30 03:14:17', 1),
(8, 'RCP-20250930-0048', 48, 33, 280.00, 0.00, 0.00, 280.00, NULL, NULL, 'EMILTHEGREAT', NULL, '2025-09-30 03:19:36', 1),
(9, 'RCP-20250930-0049', 49, 34, 600.00, 0.00, 0.00, 600.00, 600.00, 0.00, '', NULL, '2025-09-30 06:02:15', 1),
(10, 'RCP-20250930-0050', 50, 35, 330.00, 0.00, 0.00, 330.00, 330.00, 0.00, '', NULL, '2025-09-30 06:03:39', 1),
(11, 'RCP-20250930-0052', 52, 36, 450.00, 0.00, 0.00, 450.00, NULL, NULL, 'sean', NULL, '2025-09-30 08:25:03', 1),
(12, 'RCP-20250930-0053', 53, 37, 930.00, 0.00, 0.00, 930.00, NULL, NULL, NULL, NULL, '2025-09-30 08:31:56', 1),
(13, 'RCP-20251001-0055', 55, 38, 100.00, 0.00, 0.00, 100.00, 200.00, 100.00, '', NULL, '2025-10-01 10:52:17', 1),
(14, 'RCP-20251001-0057', 57, 39, 500.00, 0.00, 0.00, 500.00, NULL, NULL, NULL, NULL, '2025-10-01 12:30:22', 1),
(15, 'RCP-20251001-0056', 56, 40, 450.00, 0.00, 0.00, 450.00, NULL, NULL, NULL, NULL, '2025-10-01 12:30:24', 1);

-- --------------------------------------------------------

--
-- Table structure for table `recipes`
--

CREATE TABLE `recipes` (
  `recipe_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `ingredient_id` int(11) NOT NULL,
  `quantity` decimal(10,3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `restaurant_tables`
--

CREATE TABLE `restaurant_tables` (
  `table_id` int(11) NOT NULL,
  `table_number` varchar(10) NOT NULL,
  `capacity` int(11) NOT NULL,
  `location` varchar(50) DEFAULT NULL,
  `status` enum('available','occupied','reserved','maintenance') DEFAULT 'available',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `joined_table_group` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `restaurant_tables`
--

INSERT INTO `restaurant_tables` (`table_id`, `table_number`, `capacity`, `location`, `status`, `created_at`, `updated_at`, `joined_table_group`) VALUES
(1, 'Table 1', 2, 'Indoor', 'available', '2025-08-03 18:50:07', '2025-09-30 03:11:24', NULL),
(2, 'Table 2', 2, 'Indoor', 'available', '2025-08-03 18:50:07', '2025-10-01 10:49:56', NULL),
(3, 'Table 3', 4, 'Indoor', 'occupied', '2025-08-03 18:50:07', '2025-10-01 12:29:49', NULL),
(4, 'Table 4', 4, 'Indoor', 'occupied', '2025-08-03 18:50:07', '2025-10-01 12:30:04', NULL),
(5, 'Table 5', 4, 'Indoor', 'available', '2025-08-03 18:50:07', '2025-09-30 03:11:45', NULL),
(6, 'Table 6', 4, 'Indoor', 'available', '2025-08-03 18:50:07', '2025-09-25 12:23:24', NULL),
(7, 'Table 7', 6, 'Indoor', 'available', '2025-08-03 18:50:07', '2025-10-01 10:49:52', NULL),
(8, 'Table 8', 6, 'Indoor', 'available', '2025-08-03 18:50:07', '2025-10-01 10:49:55', NULL),
(9, 'Table 9', 4, 'Outdoor', 'available', '2025-08-03 18:50:07', NULL, NULL),
(10, 'Table 10', 4, 'Outdoor', 'available', '2025-08-03 18:50:07', '2025-09-25 12:23:22', NULL),
(11, 'Table 11', 6, 'Outdoor', 'available', '2025-08-03 18:50:07', '2025-09-30 03:11:43', NULL),
(12, 'Table 12', 8, 'Outdoor', 'available', '2025-08-03 18:50:07', '2025-09-25 09:40:25', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `setting_id` int(11) NOT NULL,
  `setting_key` varchar(50) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `setting_description` text DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`setting_id`, `setting_key`, `setting_value`, `setting_description`, `is_public`, `created_at`, `updated_at`) VALUES
(1, 'restaurant_name', 'Emiliano Restaurant', 'Name of the restaurant', 1, '2025-10-01 21:03:07', NULL),
(2, 'restaurant_address', '123 Main Street, Anytown, Philippines', 'Address of the restaurant', 1, '2025-10-01 21:03:07', NULL),
(3, 'restaurant_phone', '+63 123 456 7890', 'Contact number of the restaurant', 1, '2025-10-01 21:03:07', NULL),
(4, 'restaurant_email', 'info@emiliano.com', 'Email address of the restaurant', 1, '2025-10-01 21:03:07', NULL),
(5, 'tax_rate', '0', 'Tax rate percentage (0% as requested)', 1, '2025-10-01 21:03:07', NULL),
(6, 'currency', 'PHP', 'Currency used in the system', 1, '2025-10-01 21:03:07', NULL),
(7, 'receipt_footer', 'Thank you for dining with us!', 'Text to display at the bottom of receipts', 1, '2025-10-01 21:03:07', NULL),
(8, 'session_timeout', '30', 'Session timeout in minutes', 0, '2025-10-01 21:03:07', NULL),
(9, 'backup_frequency', 'daily', 'How often to backup the database', 0, '2025-10-01 21:03:07', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `role` enum('admin','staff','stockman') NOT NULL DEFAULT 'staff',
  `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `password`, `email`, `full_name`, `role`, `status`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'alfred.cepillo@example.com', 'Alfred Emil Cepillo', 'admin', 'active', NULL, '2025-10-01 21:03:07', NULL),
(2, 'karl', '$2y$10$hPJgAfaRBz5KMHOLtTjPdOPvUzuS5AECOj78pEWy.FVJ9CUgPYKdS', 'karl.pauste@example.com', 'Karl Pauste', 'staff', 'active', NULL, '2025-10-01 21:03:07', NULL),
(3, 'april', '$2y$10$hPJgAfaRBz5KMHOLtTjPdOPvUzuS5AECOj78pEWy.FVJ9CUgPYKdS', 'april.erasmo@example.com', 'April Erasmo', 'staff', 'active', NULL, '2025-10-01 21:03:07', NULL),
(4, 'rafael', '$2y$10$8Jk/Kh3XEP9kJU7jDfJqMeVhwBYJtJ6LQq7HYbGhvbKrKZkLCCkJe', 'rafael.santos@example.com', 'Rafael Santos', 'stockman', 'active', NULL, '2025-10-01 21:03:07', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_permissions`
--

CREATE TABLE `user_permissions` (
  `permission_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `module` varchar(50) NOT NULL,
  `can_view` tinyint(1) DEFAULT 0,
  `can_add` tinyint(1) DEFAULT 0,
  `can_edit` tinyint(1) DEFAULT 0,
  `can_delete` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_permissions`
--

INSERT INTO `user_permissions` (`permission_id`, `user_id`, `module`, `can_view`, `can_add`, `can_edit`, `can_delete`, `created_at`, `updated_at`) VALUES
(1, 1, 'dashboard', 1, 1, 1, 1, '2025-10-01 21:03:07', NULL),
(2, 1, 'orders', 1, 1, 1, 1, '2025-10-01 21:03:07', NULL),
(3, 1, 'menu', 1, 1, 1, 1, '2025-10-01 21:03:07', NULL),
(4, 1, 'inventory', 1, 1, 1, 1, '2025-10-01 21:03:07', NULL),
(5, 1, 'tables', 1, 1, 1, 1, '2025-10-01 21:03:07', NULL),
(6, 1, 'reports', 1, 1, 1, 1, '2025-10-01 21:03:07', NULL),
(7, 1, 'users', 1, 1, 1, 1, '2025-10-01 21:03:07', NULL),
(8, 1, 'settings', 1, 1, 1, 1, '2025-10-01 21:03:07', NULL),
(9, 2, 'dashboard', 1, 0, 0, 0, '2025-10-01 21:03:08', NULL),
(10, 2, 'orders', 1, 1, 1, 0, '2025-10-01 21:03:08', NULL),
(11, 2, 'menu', 1, 0, 0, 0, '2025-10-01 21:03:08', NULL),
(12, 2, 'tables', 1, 1, 1, 0, '2025-10-01 21:03:08', NULL),
(13, 3, 'dashboard', 1, 0, 0, 0, '2025-10-01 21:03:08', NULL),
(14, 3, 'orders', 1, 1, 1, 0, '2025-10-01 21:03:08', NULL),
(15, 3, 'menu', 1, 0, 0, 0, '2025-10-01 21:03:08', NULL),
(16, 3, 'tables', 1, 1, 1, 0, '2025-10-01 21:03:08', NULL),
(17, 4, 'dashboard', 1, 0, 0, 0, '2025-10-01 21:03:08', NULL),
(18, 4, 'inventory', 1, 1, 1, 0, '2025-10-01 21:03:08', NULL),
(19, 4, 'menu', 1, 0, 0, 0, '2025-10-01 21:03:08', NULL);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_daily_sales`
-- (See below for the actual view)
--
CREATE TABLE `vw_daily_sales` (
`sales_date` date
,`total_sales` decimal(10,2)
,`total_orders` int(11)
,`total_items_sold` int(11)
,`day_of_week` varchar(9)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_inventory_status`
-- (See below for the actual view)
--
CREATE TABLE `vw_inventory_status` (
`ingredient_id` int(11)
,`name` varchar(100)
,`current_stock` decimal(10,2)
,`minimum_stock` decimal(10,2)
,`unit` varchar(20)
,`cost_per_unit` decimal(10,2)
,`total_value` decimal(20,4)
,`stock_status` varchar(7)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_monthly_sales`
-- (See below for the actual view)
--
CREATE TABLE `vw_monthly_sales` (
`year` int(4)
,`month` int(2)
,`month_name` varchar(9)
,`total_sales` decimal(32,2)
,`total_orders` decimal(32,0)
,`total_items_sold` decimal(32,0)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_popular_items`
-- (See below for the actual view)
--
CREATE TABLE `vw_popular_items` (
`category_id` int(11)
,`category_name` varchar(50)
,`item_id` int(11)
,`item_name` varchar(100)
,`total_quantity_sold` decimal(32,0)
,`total_revenue` decimal(42,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_weekly_sales`
-- (See below for the actual view)
--
CREATE TABLE `vw_weekly_sales` (
`year` int(4)
,`week_number` int(2)
,`week_start_date` date
,`week_end_date` date
,`total_sales` decimal(32,2)
,`total_orders` decimal(32,0)
,`total_items_sold` decimal(32,0)
);

-- --------------------------------------------------------

--
-- Structure for view `vw_daily_sales`
--
DROP TABLE IF EXISTS `vw_daily_sales`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_daily_sales`  AS SELECT `ds`.`sales_date` AS `sales_date`, `ds`.`total_sales` AS `total_sales`, `ds`.`total_orders` AS `total_orders`, `ds`.`total_items_sold` AS `total_items_sold`, dayname(`ds`.`sales_date`) AS `day_of_week` FROM `daily_sales` AS `ds` ORDER BY `ds`.`sales_date` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `vw_inventory_status`
--
DROP TABLE IF EXISTS `vw_inventory_status`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_inventory_status`  AS SELECT `i`.`ingredient_id` AS `ingredient_id`, `i`.`name` AS `name`, `i`.`current_stock` AS `current_stock`, `i`.`minimum_stock` AS `minimum_stock`, `i`.`unit` AS `unit`, `i`.`cost_per_unit` AS `cost_per_unit`, `i`.`current_stock`* `i`.`cost_per_unit` AS `total_value`, CASE WHEN `i`.`current_stock` <= `i`.`minimum_stock` THEN 'Low' WHEN `i`.`current_stock` <= `i`.`minimum_stock` * 1.5 THEN 'Warning' ELSE 'OK' END AS `stock_status` FROM `ingredients` AS `i` ORDER BY CASE WHEN `i`.`current_stock` <= `i`.`minimum_stock` THEN 'Low' WHEN `i`.`current_stock` <= `i`.`minimum_stock` * 1.5 THEN 'Warning' ELSE 'OK' END ASC, `i`.`name` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `vw_monthly_sales`
--
DROP TABLE IF EXISTS `vw_monthly_sales`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_monthly_sales`  AS SELECT year(`daily_sales`.`sales_date`) AS `year`, month(`daily_sales`.`sales_date`) AS `month`, monthname(`daily_sales`.`sales_date`) AS `month_name`, sum(`daily_sales`.`total_sales`) AS `total_sales`, sum(`daily_sales`.`total_orders`) AS `total_orders`, sum(`daily_sales`.`total_items_sold`) AS `total_items_sold` FROM `daily_sales` GROUP BY year(`daily_sales`.`sales_date`), month(`daily_sales`.`sales_date`), monthname(`daily_sales`.`sales_date`) ORDER BY year(`daily_sales`.`sales_date`) DESC, month(`daily_sales`.`sales_date`) DESC ;

-- --------------------------------------------------------

--
-- Structure for view `vw_popular_items`
--
DROP TABLE IF EXISTS `vw_popular_items`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_popular_items`  AS SELECT `mi`.`category_id` AS `category_id`, `c`.`name` AS `category_name`, `mi`.`item_id` AS `item_id`, `mi`.`name` AS `item_name`, sum(`oi`.`quantity`) AS `total_quantity_sold`, sum(`oi`.`quantity` * `oi`.`unit_price`) AS `total_revenue` FROM (((`order_items` `oi` join `menu_items` `mi` on(`oi`.`item_id` = `mi`.`item_id`)) join `categories` `c` on(`mi`.`category_id` = `c`.`category_id`)) join `orders` `o` on(`oi`.`order_id` = `o`.`order_id`)) WHERE `o`.`status` = 'completed' GROUP BY `mi`.`category_id`, `c`.`name`, `mi`.`item_id`, `mi`.`name` ORDER BY sum(`oi`.`quantity`) DESC ;

-- --------------------------------------------------------

--
-- Structure for view `vw_weekly_sales`
--
DROP TABLE IF EXISTS `vw_weekly_sales`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_weekly_sales`  AS SELECT year(`daily_sales`.`sales_date`) AS `year`, week(`daily_sales`.`sales_date`) AS `week_number`, cast(`daily_sales`.`sales_date` - interval weekday(`daily_sales`.`sales_date`) day as date) AS `week_start_date`, cast(`daily_sales`.`sales_date` + interval 6 - weekday(`daily_sales`.`sales_date`) day as date) AS `week_end_date`, sum(`daily_sales`.`total_sales`) AS `total_sales`, sum(`daily_sales`.`total_orders`) AS `total_orders`, sum(`daily_sales`.`total_items_sold`) AS `total_items_sold` FROM `daily_sales` GROUP BY year(`daily_sales`.`sales_date`), week(`daily_sales`.`sales_date`), cast(`daily_sales`.`sales_date` - interval weekday(`daily_sales`.`sales_date`) day as date), cast(`daily_sales`.`sales_date` + interval 6 - weekday(`daily_sales`.`sales_date`) day as date) ORDER BY year(`daily_sales`.`sales_date`) DESC, week(`daily_sales`.`sales_date`) DESC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `daily_sales`
--
ALTER TABLE `daily_sales`
  ADD PRIMARY KEY (`sales_date`);

--
-- Indexes for table `extras`
--
ALTER TABLE `extras`
  ADD PRIMARY KEY (`extra_id`);

--
-- Indexes for table `ingredients`
--
ALTER TABLE `ingredients`
  ADD PRIMARY KEY (`ingredient_id`);

--
-- Indexes for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `ingredient_id` (`ingredient_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `menu_items`
--
ALTER TABLE `menu_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `table_id` (`table_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `item_id` (`item_id`);

--
-- Indexes for table `order_item_extras`
--
ALTER TABLE `order_item_extras`
  ADD PRIMARY KEY (`order_item_extra_id`),
  ADD KEY `order_item_id` (`order_item_id`),
  ADD KEY `extra_id` (`extra_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `receipts`
--
ALTER TABLE `receipts`
  ADD PRIMARY KEY (`receipt_id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD UNIQUE KEY `payment_id` (`payment_id`),
  ADD KEY `fk_receipts_users` (`created_by`);

--
-- Indexes for table `recipes`
--
ALTER TABLE `recipes`
  ADD PRIMARY KEY (`recipe_id`),
  ADD UNIQUE KEY `item_id` (`item_id`,`ingredient_id`),
  ADD KEY `ingredient_id` (`ingredient_id`);

--
-- Indexes for table `restaurant_tables`
--
ALTER TABLE `restaurant_tables`
  ADD PRIMARY KEY (`table_id`),
  ADD UNIQUE KEY `table_number` (`table_number`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD PRIMARY KEY (`permission_id`),
  ADD UNIQUE KEY `user_id` (`user_id`,`module`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `extras`
--
ALTER TABLE `extras`
  MODIFY `extra_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `ingredients`
--
ALTER TABLE `ingredients`
  MODIFY `ingredient_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `menu_items`
--
ALTER TABLE `menu_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `order_item_extras`
--
ALTER TABLE `order_item_extras`
  MODIFY `order_item_extra_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `receipts`
--
ALTER TABLE `receipts`
  MODIFY `receipt_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `recipes`
--
ALTER TABLE `recipes`
  MODIFY `recipe_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `restaurant_tables`
--
ALTER TABLE `restaurant_tables`
  MODIFY `table_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `setting_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `user_permissions`
--
ALTER TABLE `user_permissions`
  MODIFY `permission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  ADD CONSTRAINT `inventory_transactions_ibfk_1` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`),
  ADD CONSTRAINT `inventory_transactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `menu_items`
--
ALTER TABLE `menu_items`
  ADD CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`);

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`table_id`) REFERENCES `restaurant_tables` (`table_id`),
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`);

--
-- Constraints for table `order_item_extras`
--
ALTER TABLE `order_item_extras`
  ADD CONSTRAINT `order_item_extras_ibfk_1` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`order_item_id`),
  ADD CONSTRAINT `order_item_extras_ibfk_2` FOREIGN KEY (`extra_id`) REFERENCES `extras` (`extra_id`);

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `receipts`
--
ALTER TABLE `receipts`
  ADD CONSTRAINT `fk_receipts_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  ADD CONSTRAINT `fk_receipts_payments` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`),
  ADD CONSTRAINT `fk_receipts_users` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `recipes`
--
ALTER TABLE `recipes`
  ADD CONSTRAINT `recipes_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`),
  ADD CONSTRAINT `recipes_ibfk_2` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`);

--
-- Constraints for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
