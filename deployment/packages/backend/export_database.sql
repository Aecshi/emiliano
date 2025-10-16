-- Export script for restaurant_pos database
-- This script will create all necessary tables for your production database

-- Create database if it doesn't exist
-- CREATE DATABASE IF NOT EXISTS restaurant_pos;
-- USE restaurant_pos;

-- Drop tables if they exist (in reverse order of dependencies)
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS receipts;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_item_extras;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS restaurant_tables;
DROP TABLE IF EXISTS inventory_transactions;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS extras;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS daily_sales;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS system_settings;

SET FOREIGN_KEY_CHECKS=1;

-- Create tables

-- Users table
CREATE TABLE users (
  user_id int(11) NOT NULL AUTO_INCREMENT,
  username varchar(50) NOT NULL,
  password varchar(255) NOT NULL,
  email varchar(100) NOT NULL,
  full_name varchar(100) NOT NULL,
  role enum('admin','staff','stockman') NOT NULL DEFAULT 'staff',
  status enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
  last_login datetime DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT current_timestamp(),
  updated_at datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (user_id),
  UNIQUE KEY username (username),
  UNIQUE KEY email (email)
);

-- Activity logs
CREATE TABLE activity_logs (
  log_id int(11) NOT NULL AUTO_INCREMENT,
  user_id int(11) DEFAULT NULL,
  action varchar(100) NOT NULL,
  description text DEFAULT NULL,
  ip_address varchar(45) DEFAULT NULL,
  user_agent text DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (log_id),
  KEY user_id (user_id),
  CONSTRAINT activity_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
);

-- User permissions
CREATE TABLE user_permissions (
  permission_id int(11) NOT NULL AUTO_INCREMENT,
  user_id int(11) NOT NULL,
  module varchar(50) NOT NULL,
  can_view tinyint(1) DEFAULT 0,
  can_add tinyint(1) DEFAULT 0,
  can_edit tinyint(1) DEFAULT 0,
  can_delete tinyint(1) DEFAULT 0,
  created_at datetime NOT NULL DEFAULT current_timestamp(),
  updated_at datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (permission_id),
  UNIQUE KEY user_id (user_id,module),
  CONSTRAINT user_permissions_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- Categories
CREATE TABLE categories (
  category_id int(11) NOT NULL AUTO_INCREMENT,
  name varchar(50) NOT NULL,
  description varchar(255) DEFAULT NULL,
  sort_order int(11) DEFAULT 0,
  PRIMARY KEY (category_id),
  UNIQUE KEY name (name)
);

-- Daily sales
CREATE TABLE daily_sales (
  sales_date date NOT NULL,
  total_sales decimal(10,2) NOT NULL DEFAULT 0.00,
  total_orders int(11) NOT NULL DEFAULT 0,
  total_items_sold int(11) NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (sales_date)
);

-- Ingredients
CREATE TABLE ingredients (
  ingredient_id int(11) NOT NULL AUTO_INCREMENT,
  name varchar(100) NOT NULL,
  description varchar(255) DEFAULT NULL,
  unit varchar(20) NOT NULL,
  cost_per_unit decimal(10,2) NOT NULL,
  current_stock decimal(10,2) DEFAULT 0.00,
  minimum_stock decimal(10,2) DEFAULT 0.00,
  supplier_id int(11) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (ingredient_id)
);

-- Extras
CREATE TABLE extras (
  extra_id int(11) NOT NULL AUTO_INCREMENT,
  name varchar(50) NOT NULL,
  price decimal(10,2) NOT NULL,
  is_available tinyint(1) DEFAULT 1,
  PRIMARY KEY (extra_id)
);

-- Menu items
CREATE TABLE menu_items (
  item_id int(11) NOT NULL AUTO_INCREMENT,
  category_id int(11) NOT NULL,
  name varchar(100) NOT NULL,
  description text DEFAULT NULL,
  price decimal(10,2) NOT NULL,
  image_path varchar(255) DEFAULT NULL,
  is_available tinyint(1) DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (item_id),
  KEY category_id (category_id),
  CONSTRAINT menu_items_ibfk_1 FOREIGN KEY (category_id) REFERENCES categories (category_id)
);

-- Recipes
CREATE TABLE recipes (
  recipe_id int(11) NOT NULL AUTO_INCREMENT,
  item_id int(11) NOT NULL,
  ingredient_id int(11) NOT NULL,
  quantity decimal(10,3) NOT NULL,
  PRIMARY KEY (recipe_id),
  UNIQUE KEY item_id (item_id,ingredient_id),
  KEY ingredient_id (ingredient_id),
  CONSTRAINT recipes_ibfk_1 FOREIGN KEY (item_id) REFERENCES menu_items (item_id),
  CONSTRAINT recipes_ibfk_2 FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id)
);

-- Inventory transactions
CREATE TABLE inventory_transactions (
  transaction_id int(11) NOT NULL AUTO_INCREMENT,
  ingredient_id int(11) NOT NULL,
  transaction_type enum('purchase','usage','adjustment','waste') NOT NULL,
  quantity decimal(10,3) NOT NULL,
  unit_cost decimal(10,2) DEFAULT NULL,
  total_cost decimal(10,2) DEFAULT NULL,
  transaction_date timestamp NOT NULL DEFAULT current_timestamp(),
  user_id int(11) DEFAULT NULL,
  notes text DEFAULT NULL,
  PRIMARY KEY (transaction_id),
  KEY ingredient_id (ingredient_id),
  KEY user_id (user_id),
  CONSTRAINT inventory_transactions_ibfk_1 FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id),
  CONSTRAINT inventory_transactions_ibfk_2 FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Restaurant tables
CREATE TABLE restaurant_tables (
  table_id int(11) NOT NULL AUTO_INCREMENT,
  table_number varchar(10) NOT NULL,
  capacity int(11) NOT NULL,
  location varchar(50) DEFAULT NULL,
  status enum('available','occupied','reserved','maintenance') DEFAULT 'available',
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  joined_table_group varchar(50) DEFAULT NULL,
  PRIMARY KEY (table_id),
  UNIQUE KEY table_number (table_number)
);

-- Orders
CREATE TABLE orders (
  order_id int(11) NOT NULL AUTO_INCREMENT,
  table_id int(11) DEFAULT NULL,
  user_id int(11) NOT NULL,
  customer_name varchar(100) DEFAULT NULL,
  order_type enum('dine_in','takeout','delivery') NOT NULL DEFAULT 'dine_in',
  status enum('pending','in_progress','ready','served','completed','cancelled') NOT NULL DEFAULT 'pending',
  payment_status enum('pending','paid','refunded') DEFAULT 'pending',
  notes text DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  completed_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (order_id),
  KEY table_id (table_id),
  KEY user_id (user_id),
  CONSTRAINT orders_ibfk_1 FOREIGN KEY (table_id) REFERENCES restaurant_tables (table_id),
  CONSTRAINT orders_ibfk_2 FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Order items
CREATE TABLE order_items (
  order_item_id int(11) NOT NULL AUTO_INCREMENT,
  order_id int(11) NOT NULL,
  item_id int(11) NOT NULL,
  quantity int(11) NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  side_option enum('bread','rice') DEFAULT NULL,
  notes text DEFAULT NULL,
  status enum('pending','preparing','ready','served','cancelled') NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (order_item_id),
  KEY order_id (order_id),
  KEY item_id (item_id),
  CONSTRAINT order_items_ibfk_1 FOREIGN KEY (order_id) REFERENCES orders (order_id),
  CONSTRAINT order_items_ibfk_2 FOREIGN KEY (item_id) REFERENCES menu_items (item_id)
);

-- Order item extras
CREATE TABLE order_item_extras (
  order_item_extra_id int(11) NOT NULL AUTO_INCREMENT,
  order_item_id int(11) NOT NULL,
  extra_id int(11) NOT NULL,
  quantity int(11) NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  PRIMARY KEY (order_item_extra_id),
  KEY order_item_id (order_item_id),
  KEY extra_id (extra_id),
  CONSTRAINT order_item_extras_ibfk_1 FOREIGN KEY (order_item_id) REFERENCES order_items (order_item_id),
  CONSTRAINT order_item_extras_ibfk_2 FOREIGN KEY (extra_id) REFERENCES extras (extra_id)
);

-- Payments
CREATE TABLE payments (
  payment_id int(11) NOT NULL AUTO_INCREMENT,
  order_id int(11) NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_method enum('cash','credit_card','debit_card','mobile_payment','other') NOT NULL,
  status enum('pending','completed','refunded','failed') NOT NULL DEFAULT 'pending',
  transaction_reference varchar(100) DEFAULT NULL,
  payment_date timestamp NOT NULL DEFAULT current_timestamp(),
  user_id int(11) NOT NULL,
  notes text DEFAULT NULL,
  cash_given decimal(10,2) DEFAULT NULL,
  change_amount decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (payment_id),
  KEY order_id (order_id),
  KEY user_id (user_id),
  CONSTRAINT payments_ibfk_1 FOREIGN KEY (order_id) REFERENCES orders (order_id),
  CONSTRAINT payments_ibfk_2 FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Receipts
CREATE TABLE receipts (
  receipt_id int(11) NOT NULL AUTO_INCREMENT,
  receipt_number varchar(20) NOT NULL,
  order_id int(11) NOT NULL,
  payment_id int(11) NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  tax_amount decimal(10,2) NOT NULL,
  discount_amount decimal(10,2) DEFAULT 0.00,
  total_amount decimal(10,2) NOT NULL,
  cash_given decimal(10,2) DEFAULT NULL,
  change_amount decimal(10,2) DEFAULT NULL,
  customer_name varchar(100) DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  created_by int(11) NOT NULL,
  PRIMARY KEY (receipt_id),
  UNIQUE KEY receipt_number (receipt_number),
  UNIQUE KEY order_id (order_id),
  UNIQUE KEY payment_id (payment_id),
  KEY fk_receipts_users (created_by),
  CONSTRAINT fk_receipts_orders FOREIGN KEY (order_id) REFERENCES orders (order_id),
  CONSTRAINT fk_receipts_payments FOREIGN KEY (payment_id) REFERENCES payments (payment_id),
  CONSTRAINT fk_receipts_users FOREIGN KEY (created_by) REFERENCES users (user_id)
);

-- System settings
CREATE TABLE system_settings (
  setting_id int(11) NOT NULL AUTO_INCREMENT,
  setting_key varchar(50) NOT NULL,
  setting_value text DEFAULT NULL,
  setting_description text DEFAULT NULL,
  is_public tinyint(1) DEFAULT 0,
  created_at datetime NOT NULL DEFAULT current_timestamp(),
  updated_at datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (setting_id),
  UNIQUE KEY setting_key (setting_key)
);

-- Insert default admin user
INSERT INTO users (username, password, email, full_name, role, status, created_at) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@example.com', 'Administrator', 'admin', 'active', NOW());

-- Insert default admin permissions
INSERT INTO user_permissions (user_id, module, can_view, can_add, can_edit, can_delete, created_at) VALUES
(1, 'dashboard', 1, 1, 1, 1, NOW()),
(1, 'users', 1, 1, 1, 1, NOW()),
(1, 'menu', 1, 1, 1, 1, NOW()),
(1, 'orders', 1, 1, 1, 1, NOW()),
(1, 'inventory', 1, 1, 1, 1, NOW()),
(1, 'tables', 1, 1, 1, 1, NOW()),
(1, 'reports', 1, 1, 1, 1, NOW()),
(1, 'settings', 1, 1, 1, 1, NOW());

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, setting_description, is_public, created_at) VALUES
('restaurant_name', 'Emiliano Restaurant', 'Name of the restaurant', 1, NOW()),
('restaurant_address', '123 Main Street, Anytown, Philippines', 'Address of the restaurant', 1, NOW()),
('restaurant_phone', '+63 123 456 7890', 'Contact number of the restaurant', 1, NOW()),
('restaurant_email', 'info@emiliano.com', 'Email address of the restaurant', 1, NOW()),
('tax_rate', '0', 'Tax rate percentage (0% as requested)', 1, NOW()),
('currency', 'PHP', 'Currency used in the system', 1, NOW()),
('receipt_footer', 'Thank you for dining with us!', 'Text to display at the bottom of receipts', 1, NOW()),
('session_timeout', '30', 'Session timeout in minutes', 0, NOW()),
('backup_frequency', 'daily', 'How often to backup the database', 0, NOW());

-- Insert default categories
INSERT INTO categories (name, description, sort_order) VALUES
('PIZZA', 'Italian pizzas', 1),
('MEAT', 'Meat dishes', 2),
('FISH', 'Seafood dishes', 3),
('PASTA', 'Italian pasta dishes', 4),
('VEGETARIAN', 'Vegetarian options', 5),
('DESSERT', 'Sweet desserts', 6),
('SHAKES', 'Milk shakes', 7),
('SHOTS', 'Alcoholic shots', 8),
('LONG DRINKS', 'Cocktails and mixed drinks', 9),
('SANDWICHES', 'Sandwiches', 10),
('DRINKS', 'Soft drinks and beers', 11),
('JUICES', 'Fresh fruit juices', 12),
('WINES', 'Wine selection', 13),
('EXTRAS', 'Additional toppings and sides', 14);

-- Insert default tables
INSERT INTO restaurant_tables (table_number, capacity, location, status) VALUES
('Table 1', 2, 'Indoor', 'available'),
('Table 2', 2, 'Indoor', 'available'),
('Table 3', 4, 'Indoor', 'available'),
('Table 4', 4, 'Indoor', 'available'),
('Table 5', 4, 'Indoor', 'available'),
('Table 6', 4, 'Indoor', 'available'),
('Table 7', 6, 'Indoor', 'available'),
('Table 8', 6, 'Indoor', 'available'),
('Table 9', 4, 'Outdoor', 'available'),
('Table 10', 4, 'Outdoor', 'available'),
('Table 11', 6, 'Outdoor', 'available'),
('Table 12', 8, 'Outdoor', 'available');

-- Insert default extras
INSERT INTO extras (name, price, is_available) VALUES
('Extra Parmesan', 100.00, 1),
('Extra Toppings', 100.00, 1);

-- Insert sample menu items (just a few for example)
INSERT INTO menu_items (category_id, name, description, price, is_available) VALUES
(1, 'MARGHERITA', 'Tomato, Mozzarella', 330.00, 1),
(1, 'DIAVOLA', 'Tomato, Mozzarella, Salami, Spicy', 450.00, 1),
(2, 'Scaloppine Al Vino', 'Pork Slices with White Wine', 300.00, 1),
(4, 'Carbonara', 'Bacon, Cream', 320.00, 1),
(6, 'Pannacotta', 'Baked Cream with Chocolate Toppings', 180.00, 1),
(11, 'Bottled Water', 'Mineral water', 40.00, 1);

-- Add more sample data as needed
