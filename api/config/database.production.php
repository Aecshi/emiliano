<?php
// Production database configuration
class Database {
    // Update these with your InfinityFree database credentials
    private $host = "sql306.infinityfree.com"; // Change this to your actual InfinityFree MySQL host
    private $db_name = "if0_40183863_XXX"; // Change this to your actual database name
    private $username = "if0_40183863"; // Change this to your actual database username
    private $password = "y0isdeLGlFBSgd"; // Change this to your actual database password
    private $conn;
    
    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->exec("set names utf8");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        
        return $this->conn;
    }
}

// CORS headers for production environment
function setCorsHeaders() {
    // Set CORS headers only if not already sent
    if (!headers_sent()) {
        // Allow your Netlify domain and local development domains
        $allowedOrigins = [
            'https://emiliano.netlify.app', // Your Netlify domain
            'https://emiliano-eats.netlify.app', // Alternative Netlify domain
            'https://emiliano-restaurant.netlify.app', // Another possible Netlify domain
            'https://main--emiliano-eats.netlify.app', // Netlify branch subdomain
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8080',
            'http://localhost:8081',
            'http://localhost:8082',
            'http://localhost:8083',
            'http://localhost:8084',
            'http://localhost:8085',
            'http://localhost:8086',
            'http://localhost:8087',
            'http://localhost:8088',
            'http://localhost:8089',
            'http://localhost:8090'
        ];
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        // Check if this is a mobile device
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $isMobile = preg_match('/(android|iphone|ipad|mobile)/i', strtolower($userAgent));
        
        if (in_array($origin, $allowedOrigins)) {
            // For known origins, set the specific origin
            header("Access-Control-Allow-Origin: " . $origin);
        } else if ($isMobile || empty($origin)) {
            // For mobile devices or when origin is not set, allow all origins
            header("Access-Control-Allow-Origin: *");
        } else {
            // For other origins, still allow but log for debugging
            header("Access-Control-Allow-Origin: *");
            // You could log unknown origins here if needed
        }
        
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
        header("Access-Control-Allow-Credentials: true");
        header("Content-Type: application/json; charset=UTF-8");
    }
    
    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// Helper function to return JSON response
function jsonResponse($data, $status_code = 200) {
    http_response_code($status_code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Helper function to handle errors
function errorResponse($message, $status_code = 500) {
    jsonResponse(['error' => $message], $status_code);
}
?>
