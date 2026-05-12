<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'upload':
        if ($method == 'POST') {
            if (!isset($_FILES['file']) || !isset($_POST['ref_id']) || !isset($_POST['ref_type'])) {
                echo json_encode(["error" => "Missing required fields"]);
                break;
            }

            $ref_id = $_POST['ref_id'];
            $ref_type = $_POST['ref_type'];
            $uploaded_by = isset($_POST['uploaded_by']) ? $_POST['uploaded_by'] : 'System';
            
            $file = $_FILES['file'];
            $fileName = basename($file['name']);
            $fileSize = $file['size'];
            $fileType = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            
            // Validation
            $allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
            if (!in_array($fileType, $allowedTypes)) {
                echo json_encode(["error" => "Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX"]);
                break;
            }
            
            if ($fileSize > 10 * 1024 * 1024) { // 10MB limit
                echo json_encode(["error" => "File too large. Maximum 10MB allowed."]);
                break;
            }

            $uniqueName = uniqid() . '_' . $fileName;
            $uploadDir = __DIR__ . '/../uploads/movs/';
            $targetPath = $uploadDir . $uniqueName;

            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                try {
                    $sql = "INSERT INTO movs (ref_id, ref_type, file_name, file_path, file_type, file_size, uploaded_by) 
                            VALUES (:ref_id, :ref_type, :file_name, :file_path, :file_type, :file_size, :uploaded_by)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        ':ref_id' => $ref_id,
                        ':ref_type' => $ref_type,
                        ':file_name' => $fileName,
                        ':file_path' => $uniqueName,
                        ':file_type' => $fileType,
                        ':file_size' => $fileSize,
                        ':uploaded_by' => $uploaded_by
                    ]);
                    echo json_encode(["success" => true, "id" => $pdo->lastInsertId()]);
                } catch (PDOException $e) {
                    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
                }
            } else {
                echo json_encode(["error" => "Failed to move uploaded file."]);
            }
        }
        break;

    case 'list':
        if ($method == 'GET') {
            $ref_id = isset($_GET['ref_id']) ? $_GET['ref_id'] : '';
            $ref_type = isset($_GET['ref_type']) ? $_GET['ref_type'] : '';
            
            try {
                $sql = "SELECT * FROM movs WHERE ref_id = :ref_id AND ref_type = :ref_type ORDER BY upload_date DESC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([':ref_id' => $ref_id, ':ref_type' => $ref_type]);
                echo json_encode($stmt->fetchAll());
            } catch (PDOException $e) {
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        break;

    case 'delete':
        if ($method == 'DELETE') {
            $id = isset($_GET['id']) ? $_GET['id'] : '';
            
            try {
                // Get file path first
                $stmt = $pdo->prepare("SELECT file_path FROM movs WHERE id = :id");
                $stmt->execute([':id' => $id]);
                $mov = $stmt->fetch();
                
                if ($mov) {
                    $filePath = __DIR__ . '/../uploads/movs/' . $mov['file_path'];
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                    
                    $stmt = $pdo->prepare("DELETE FROM movs WHERE id = :id");
                    $stmt->execute([':id' => $id]);
                    echo json_encode(["success" => true]);
                } else {
                    echo json_encode(["error" => "MOV not found"]);
                }
            } catch (PDOException $e) {
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        break;

    default:
        echo json_encode(["error" => "Invalid action"]);
        break;
}
?>