<?php
require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');
echo "<h2>🛠️ Database Initialization & Fix</h2>";
echo "Connecting to database: <b>" . DB_NAME . "</b>... ";

try {
    // 1. Create MOVs table if missing
    echo "Checking 'movs' table... ";
    $sqlMovs = "CREATE TABLE IF NOT EXISTS movs (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    
    $pdo->exec($sqlMovs);
    echo "<span style='color:green;'>✅ Ready</span><br>";

    // 2. Ensure columns are correct
    echo "Optimizing 'movs' columns... ";
    // Check if we need to modify ref_id length
    $pdo->exec("ALTER TABLE movs MODIFY COLUMN ref_id VARCHAR(150)");
    echo "<span style='color:green;'>✅ Done</span><br>";
    
    // 3. Create uploads directory if it doesn't exist
    echo "Checking storage folders... ";
    $uploadDir = __DIR__ . '/../uploads/movs/';
    if (!file_exists($uploadDir)) {
        if (mkdir($uploadDir, 0777, true)) {
            echo "<span style='color:green;'>✅ Created uploads/movs/</span><br>";
        } else {
            echo "<span style='color:red;'>❌ Failed to create folder. Please create 'uploads/movs/' manually in your project root.</span><br>";
        }
    } else {
        echo "<span style='color:green;'>✅ Storage folder exists</span><br>";
    }

    // 4. Verify other core tables
    $coreTables = ['cases', 'members', 'hearings', 'settlements', 'config', 'invitations'];
    foreach ($coreTables as $table) {
        echo "Verifying table '$table'... ";
        try {
            $pdo->query("SELECT 1 FROM `$table` LIMIT 1");
            echo "<span style='color:green;'>✅ OK</span><br>";
        } catch (Exception $e) {
            echo "<span style='color:red;'>❌ MISSING!</span> (Please import your SQL setup file)<br>";
        }
    }
    
    echo "<br><div style='padding:15px; background:#e0f2f1; border-radius:8px;'>
            <strong>Success!</strong> The database is now ready to handle MOVs and documents.<br>
            You can now go back to the <a href='../index.html'>Main Dashboard</a>.
          </div>";
    
} catch (PDOException $e) {
    echo "<br><div style='padding:15px; background:#ffebee; border-radius:8px; color:#c62828;'>
            <strong>Database Error:</strong> " . $e->getMessage() . "
          </div>";
}
?>