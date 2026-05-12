<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

// --- VERSION 2.0 (MODIFIED IDs) ---
$results = [
    "version" => "2.0",
    "status" => "success",
    "connection" => "OK",
    "database_name" => DB_NAME,
    "tables" => []
];

$required_tables = ['members', 'cases', 'hearings', 'settlements', 'config'];

try {
    foreach ($required_tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            $count = $pdo->query("SELECT COUNT(*) FROM $table")->fetchColumn();
            
            // Check ID column type
            $col = $pdo->query("DESCRIBE $table")->fetchAll();
            $id_type = 'unknown';
            foreach($col as $c) {
                if ($c['Field'] === 'id') $id_type = $c['Type'];
            }

            $results["tables"][$table] = [
                "exists" => true,
                "rows" => (int)$count,
                "id_type" => $id_type
            ];
        } else {
            $results["status"] = "partial";
            $results["tables"][$table] = [
                "exists" => false,
                "message" => "Table not found. Please DROP the database and run setup.sql again."
            ];
        }
    }
    
    echo json_encode($results);

} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Check failed: " . $e->getMessage()
    ]);
}
?>
