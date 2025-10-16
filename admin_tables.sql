-- Admin and User Management Tables for Emiliano Restaurant POS System

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'staff', 'stockman') NOT NULL DEFAULT 'staff',
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    last_login DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- User Permissions Table
CREATE TABLE IF NOT EXISTS user_permissions (
    permission_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    module VARCHAR(50) NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_add BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, module)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, email, full_name, role, status, created_at)
VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'alfred.cepillo@example.com', 'Alfred Emil Cepillo', 'admin', 'active', NOW());

-- Insert default staff user (password: staff123)
INSERT INTO users (username, password, email, full_name, role, status, created_at)
VALUES ('karl', '$2y$10$hPJgAfaRBz5KMHOLtTjPdOPvUzuS5AECOj78pEWy.FVJ9CUgPYKdS', 'karl.pauste@example.com', 'Karl Pauste', 'staff', 'active', NOW());

-- Insert default staff user (password: staff123)
INSERT INTO users (username, password, email, full_name, role, status, created_at)
VALUES ('april', '$2y$10$hPJgAfaRBz5KMHOLtTjPdOPvUzuS5AECOj78pEWy.FVJ9CUgPYKdS', 'april.erasmo@example.com', 'April Erasmo', 'staff', 'active', NOW());

-- Insert default stockman user (password: stock123)
INSERT INTO users (username, password, email, full_name, role, status, created_at)
VALUES ('rafael', '$2y$10$8Jk/Kh3XEP9kJU7jDfJqMeVhwBYJtJ6LQq7HYbGhvbKrKZkLCCkJe', 'rafael.santos@example.com', 'Rafael Santos', 'stockman', 'active', NOW());

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_description, is_public) VALUES
('restaurant_name', 'Emiliano Restaurant', 'Name of the restaurant', TRUE),
('restaurant_address', '123 Main Street, Anytown, Philippines', 'Address of the restaurant', TRUE),
('restaurant_phone', '+63 123 456 7890', 'Contact number of the restaurant', TRUE),
('restaurant_email', 'info@emiliano.com', 'Email address of the restaurant', TRUE),
('tax_rate', '0', 'Tax rate percentage (0% as requested)', TRUE),
('currency', 'PHP', 'Currency used in the system', TRUE),
('receipt_footer', 'Thank you for dining with us!', 'Text to display at the bottom of receipts', TRUE),
('session_timeout', '30', 'Session timeout in minutes', FALSE),
('backup_frequency', 'daily', 'How often to backup the database', FALSE);

-- Insert default permissions for admin user
INSERT INTO user_permissions (user_id, module, can_view, can_add, can_edit, can_delete) VALUES
(1, 'dashboard', TRUE, TRUE, TRUE, TRUE),
(1, 'orders', TRUE, TRUE, TRUE, TRUE),
(1, 'menu', TRUE, TRUE, TRUE, TRUE),
(1, 'inventory', TRUE, TRUE, TRUE, TRUE),
(1, 'tables', TRUE, TRUE, TRUE, TRUE),
(1, 'reports', TRUE, TRUE, TRUE, TRUE),
(1, 'users', TRUE, TRUE, TRUE, TRUE),
(1, 'settings', TRUE, TRUE, TRUE, TRUE);

-- Insert default permissions for staff user (Karl)
INSERT INTO user_permissions (user_id, module, can_view, can_add, can_edit, can_delete) VALUES
(2, 'dashboard', TRUE, FALSE, FALSE, FALSE),
(2, 'orders', TRUE, TRUE, TRUE, FALSE),
(2, 'menu', TRUE, FALSE, FALSE, FALSE),
(2, 'tables', TRUE, TRUE, TRUE, FALSE);

-- Insert default permissions for staff user (April)
INSERT INTO user_permissions (user_id, module, can_view, can_add, can_edit, can_delete) VALUES
(3, 'dashboard', TRUE, FALSE, FALSE, FALSE),
(3, 'orders', TRUE, TRUE, TRUE, FALSE),
(3, 'menu', TRUE, FALSE, FALSE, FALSE),
(3, 'tables', TRUE, TRUE, TRUE, FALSE);

-- Insert default permissions for stockman user
INSERT INTO user_permissions (user_id, module, can_view, can_add, can_edit, can_delete) VALUES
(4, 'dashboard', TRUE, FALSE, FALSE, FALSE),
(4, 'inventory', TRUE, TRUE, TRUE, FALSE),
(4, 'menu', TRUE, FALSE, FALSE, FALSE);

-- Insert sample activity logs
INSERT INTO activity_logs (user_id, action, description, ip_address, created_at) VALUES
(1, 'login', 'User logged in successfully', '127.0.0.1', '2023-05-15 09:45:00'),
(2, 'login', 'User logged in successfully', '127.0.0.1', '2023-05-15 10:30:00'),
(3, 'login', 'User logged in successfully', '127.0.0.1', '2023-05-14 02:15:00'),
(4, 'login', 'User logged in successfully', '127.0.0.1', '2023-05-15 14:05:00'),
(1, 'update_settings', 'Updated system settings', '127.0.0.1', '2023-05-15 10:00:00'),
(2, 'create_order', 'Created new order #1001', '127.0.0.1', '2023-05-15 11:30:00'),
(3, 'update_order', 'Updated order #1001 status to ready', '127.0.0.1', '2023-05-14 03:20:00'),
(4, 'update_inventory', 'Updated inventory levels for 5 items', '127.0.0.1', '2023-05-15 15:10:00'); 