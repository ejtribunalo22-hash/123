<?php
require_once 'db_connect.php';

function addColumnIfMissing($pdo, $table, $column, $definition) {
    try {
        $result = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
        if ($result->rowCount() == 0) {
            $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
            echo "Successfully added column '$column' to '$table'.<br>";
        } else {
            echo "Column '$column' already exists in '$table'.<br>";
        }
    } catch (PDOException $e) {
        echo "Error updating '$table': " . $e->getMessage() . "<br>";
    }
}

echo "<h3>Database Diagnostic & Fix</h3>";

// Fix invitations table
addColumnIfMissing($pdo, 'invitations', 'type', "VARCHAR(50) AFTER id");

// Check if tables exist
$tables = ['cases', 'members', 'hearings', 'settlements', 'config', 'invitations'];
foreach ($tables as $t) {
    try {
        $pdo->query("SELECT 1 FROM `$t` LIMIT 1");
        echo "Table '$t' exists.<br>";
    } catch (Exception $e) {
        echo "<b>Warning: Table '$t' is missing!</b><br>";
    }
}

echo "<br>Done. Please refresh your browser and try again.";
?>