<?php
require_once 'config.php';

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        // MUST BE TRUE to allow reusing the same named parameter in ON DUPLICATE KEY UPDATE
        PDO::ATTR_EMULATE_PREPARES   => true, 
    ];
    
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);

    // --- AUTO-MIGRATION: Ensure database structure is up to date ---
    try {
        // 1. Check for 'type' column in invitations table
        $check = $pdo->query("SHOW COLUMNS FROM invitations LIKE 'type'");
        if ($check->rowCount() == 0) {
            $pdo->exec("ALTER TABLE invitations ADD COLUMN type VARCHAR(50) AFTER id");
        }

        // 2. Ensure MOVs table exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS movs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ref_id VARCHAR(150) NOT NULL,
            ref_type VARCHAR(50) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(255) NOT NULL,
            file_type VARCHAR(50),
            file_size INT,
            uploaded_by VARCHAR(100),
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'complete',
            INDEX (ref_id),
            INDEX (ref_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    } catch (Exception $e) {
        // Silently fail migration if table doesn't exist yet
    }
    // -------------------------------------------------------------

} catch (PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $e->getMessage()
    ]);
    exit;
}
?>
