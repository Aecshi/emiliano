<?php
// Determine environment based on hostname
function isProduction() {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    // Check if we're on InfinityFree or another production host
    return (strpos($host, 'infinityfree.net') !== false || 
            strpos($host, 'epizy.com') !== false ||
            file_exists(__DIR__ . '/production.flag'));
}

// Load the appropriate configuration file
if (isProduction()) {
    require_once __DIR__ . '/config/database.production.php';
} else {
    require_once __DIR__ . '/config/database.php';
}
?>
