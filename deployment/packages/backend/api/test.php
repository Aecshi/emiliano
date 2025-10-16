<?php
// Simple test file to verify setup
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

echo "<h1>Emiliano POS API Test</h1>";

// Test 1: PHP Version
echo "<h2>1. PHP Version</h2>";
echo "<p>PHP Version: " . phpversion() . "</p>";

// Test 2: Database Connection
echo "<h2>2. Database Connection</h2>";
try {
    $database = new Database();
    $db = $database->getConnection();
    
    if ($db) {
        echo "<p style='color: green;'>✓ Database connection successful!</p>";
        
        // Test 3: Check if tables exist
        echo "<h2>3. Database Tables Check</h2>";
        $tables = ['restaurant_tables', 'daily_sales', 'orders', 'users'];
        
        foreach ($tables as $table) {
            try {
                $stmt = $db->prepare("SELECT COUNT(*) as count FROM $table");
                $stmt->execute();
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                echo "<p style='color: green;'>✓ Table '$table': {$result['count']} records</p>";
            } catch (Exception $e) {
                echo "<p style='color: red;'>✗ Table '$table': Error - {$e->getMessage()}</p>";
            }
        }
    } else {
        echo "<p style='color: red;'>✗ Database connection failed!</p>";
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>✗ Database connection error: " . $e->getMessage() . "</p>";
}

// Test 4: File Structure
echo "<h2>4. File Structure Check</h2>";
$files = [
    'config/database.php',
    'endpoints/dashboard.php',
    'endpoints/tables.php',
    '.htaccess'
];

foreach ($files as $file) {
    if (file_exists(__DIR__ . '/' . $file)) {
        echo "<p style='color: green;'>✓ File exists: $file</p>";
    } else {
        echo "<p style='color: red;'>✗ File missing: $file</p>";
    }
}

echo "<h2>5. Next Steps</h2>";
echo "<p>If all tests pass above, try accessing:</p>";
echo "<ul>";
echo "<li><a href='/api/'>API Root</a></li>";
echo "<li><a href='/api/dashboard'>Dashboard Endpoint</a></li>";
echo "<li><a href='/api/tables'>Tables Endpoint</a></li>";
echo "</ul>";
?> 