<?php
require_once 'php/db_connect.php';
echo "<h2>Lupon26 Database Repair Tool</h2>";
try {
    $pdo->exec("ALTER TABLE invitations ADD COLUMN IF NOT EXISTS type VARCHAR(50) AFTER id");
    $check = $pdo->query("SHOW COLUMNS FROM invitations LIKE 'type'");
    if ($check->rowCount() > 0) {
        echo "<p style='color:green; font-weight:bold;'>SUCCESS: Database is fixed and 'type' column is active!</p>";
        echo "<p><a href='index.html'>Click here to return to the System</a></p>";
    }
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "<p style='color:blue;'>Database was already fixed! You're good to go.</p>";
        echo "<p><a href='index.html'>Click here to return to the System</a></p>";
    } else {
        echo "<p style='color:red;'>Error: " . $e->getMessage() . "</p>";
    }
}
?>