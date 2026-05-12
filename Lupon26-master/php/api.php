<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// VERSION 2.2 - Server Logging and Diagnostics
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Simple logger
function debugLog($msg) {
    $logFile = 'api_debug.log';
    $timestamp = date('[Y-m-d H:i:s] ');
    file_put_contents($logFile, $timestamp . $msg . PHP_EOL, FILE_APPEND);
}

debugLog("Request received: " . $_SERVER['REQUEST_METHOD'] . " Action: " . ($_GET['action'] ?? 'none'));

require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Helper to handle values for DB
function dbVal($val, $type = 'string') {
    if ($val === "" || $val === null) return null;
    if ($type === 'id') return (string)$val; 
    if ($type === 'int') return (int)$val;
    return $val;
}

switch ($action) {
    case 'get_all':
        try {
            $data = [
                'cases' => $pdo->query("SELECT * FROM cases")->fetchAll(),
                'members' => $pdo->query("SELECT * FROM members")->fetchAll(),
                'hearings' => $pdo->query("SELECT * FROM hearings")->fetchAll(),
                'settlements' => $pdo->query("SELECT * FROM settlements")->fetchAll(),
                'invitations' => $pdo->query("SELECT * FROM invitations ORDER BY issue_date DESC LIMIT 100")->fetchAll(),
                'config' => $pdo->query("SELECT * FROM config LIMIT 1")->fetch()
            ];
            echo json_encode($data);
        } catch (PDOException $e) {
            debugLog("Error in get_all: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'save_member':
        if ($method == 'POST') {
            $input = file_get_contents("php://input");
            debugLog("Save Member Data: " . $input);
            $data = json_decode($input, true);
            
            if (!$data) {
                debugLog("JSON Decode Failed");
                echo json_encode(["error" => "No data received"]); 
                break; 
            }

            try {
                $sql = "INSERT INTO members (id, name, role, tel, date_joined, expiry_date, status) 
                        VALUES (:id, :name, :role, :tel, :date, :exp, :status)
                        ON DUPLICATE KEY UPDATE 
                        name = :name, role = :role, tel = :tel, 
                        date_joined = :date, expiry_date = :exp, status = :status";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':id' => dbVal($data['id'], 'id'),
                    ':name' => $data['name'],
                    ':role' => dbVal($data['role']),
                    ':tel' => dbVal($data['tel']),
                    ':date' => dbVal($data['date']),
                    ':exp' => dbVal($data['exp']),
                    ':status' => dbVal($data['status'])
                ]);
                debugLog("Save Member Success: " . $data['id']);
                echo json_encode(["success" => true, "id_saved" => $data['id']]);
            } catch (PDOException $e) {
                debugLog("SQL Error in save_member: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(["error" => "Save member SQL error: " . $e->getMessage()]);
            }
        }
        break;

    case 'save_case':
        if ($method == 'POST') {
            $input = file_get_contents("php://input");
            debugLog("Save Case Data: " . $input);
            $data = json_decode($input, true);
            
            if (!$data) {
                debugLog("JSON Decode Failed");
                echo json_encode(["error" => "No data received"]); 
                break; 
            }

            try {
                $sql = "INSERT INTO cases (
                            id, case_no, date_filed, nature, status, pangkat, docket, description, relief,
                            comp_last, comp_first, comp_mid, comp_age, comp_addr, comp_tel, comp_civil,
                            resp_last, resp_first, resp_mid, resp_age, resp_addr, resp_tel, resp_civil
                        ) VALUES (
                            :id, :caseNo, :dateFiled, :nature, :status, :pangkat, :docket, :desc, :relief,
                            :c_last, :c_first, :c_mid, :c_age, :c_addr, :c_tel, :c_civil,
                            :r_last, :r_first, :r_mid, :r_age, :r_addr, :r_tel, :r_civil
                        ) ON DUPLICATE KEY UPDATE 
                            status = :status, pangkat = :pangkat, description = :desc, relief = :relief";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':id' => dbVal($data['id'], 'id'),
                    ':caseNo' => $data['caseNo'],
                    ':dateFiled' => $data['dateFiled'],
                    ':nature' => dbVal($data['nature']),
                    ':status' => dbVal($data['status']),
                    ':pangkat' => dbVal($data['pangkat']),
                    ':docket' => dbVal($data['docket']),
                    ':desc' => dbVal($data['desc']),
                    ':relief' => dbVal($data['relief']),
                    ':c_last' => dbVal($data['comp']['last']),
                    ':c_first' => dbVal($data['comp']['first']),
                    ':c_mid' => dbVal($data['comp']['mid']),
                    ':c_age' => dbVal($data['comp']['age'], 'int'),
                    ':c_addr' => dbVal($data['comp']['addr']),
                    ':c_tel' => dbVal($data['comp']['tel']),
                    ':c_civil' => dbVal($data['comp']['civil']),
                    ':r_last' => dbVal($data['resp']['last']),
                    ':r_first' => dbVal($data['resp']['first']),
                    ':r_mid' => dbVal($data['resp']['mid']),
                    ':r_age' => dbVal($data['resp']['age'], 'int'),
                    ':r_addr' => dbVal($data['resp']['addr']),
                    ':r_tel' => dbVal($data['resp']['tel']),
                    ':r_civil' => dbVal($data['resp']['civil'])
                ]);
                debugLog("Save Case Success: " . $data['id']);
                echo json_encode(["success" => true, "case_id" => $data['id']]);
            } catch (PDOException $e) {
                debugLog("SQL Error in save_case: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(["error" => "Save case SQL error: " . $e->getMessage()]);
            }
        }
        break;

    case 'save_hearing':
        if ($method == 'POST') {
            $data = json_decode(file_get_contents("php://input"), true);
            try {
                $sql = "INSERT INTO hearings (id, case_id, case_no, hearing_date, hearing_time, venue, type, mediator, notes) 
                        VALUES (:id, :caseId, :caseNo, :date, :time, :venue, :type, :mediator, :notes)
                        ON DUPLICATE KEY UPDATE 
                        hearing_date = :date, hearing_time = :time, venue = :venue, type = :type, mediator = :mediator, notes = :notes";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':id' => dbVal($data['id'], 'id'),
                    ':caseId' => dbVal($data['caseId'], 'id'),
                    ':caseNo' => $data['caseNo'],
                    ':date' => dbVal($data['date']),
                    ':time' => dbVal($data['time']),
                    ':venue' => dbVal($data['venue']),
                    ':type' => dbVal($data['type']),
                    ':mediator' => dbVal($data['mediator']),
                    ':notes' => dbVal($data['notes'])
                ]);
                echo json_encode(["success" => true]);
            } catch (PDOException $e) {
                debugLog("SQL Error in save_hearing: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        break;

    case 'save_settlement':
        if ($method == 'POST') {
            $data = json_decode(file_get_contents("php://input"), true);
            try {
                $sql = "INSERT INTO settlements (id, case_no, settlement_date, type, terms, captain, witness) 
                        VALUES (:id, :caseNo, :date, :type, :terms, :captain, :witness)
                        ON DUPLICATE KEY UPDATE 
                        settlement_date = :date, type = :type, terms = :terms, captain = :captain, witness = :witness";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':id' => dbVal($data['id'], 'id'),
                    ':caseNo' => $data['caseNo'],
                    ':date' => dbVal($data['date']),
                    ':type' => dbVal($data['type']),
                    ':terms' => dbVal($data['terms']),
                    ':captain' => dbVal($data['captain']),
                    ':witness' => dbVal($data['witness'])
                ]);
                echo json_encode(["success" => true]);
            } catch (PDOException $e) {
                debugLog("SQL Error in save_settlement: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        break;

    case 'save_config':
        if ($method == 'POST') {
            $data = json_decode(file_get_contents("php://input"), true);
            try {
                $sql = "UPDATE config SET brgy = :brgy, muni = :muni, prov = :prov, admin_pass = :pass WHERE id = 1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':brgy' => dbVal($data['brgy']),
                    ':muni' => dbVal($data['muni']),
                    ':prov' => dbVal($data['prov']),
                    ':pass' => dbVal($data['pass'])
                ]);
                debugLog("Save Config Success");
                echo json_encode(["success" => true]);
            } catch (PDOException $e) {
                debugLog("SQL Error in save_config: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        break;

    case 'delete_member':
    case 'delete_case':
    case 'delete_hearing':
    case 'delete_settlement':
        $table = str_replace('delete_', '', $action);
        if ($table === 'member') $table = 'members';
        else if ($table === 'case') $table = 'cases';
        else if ($table === 'hearing') $table = 'hearings';
        else if ($table === 'settlement') $table = 'settlements';
        
        $id = $_GET['id'] ?? null;
        if ($id) {
            try {
                $stmt = $pdo->prepare("DELETE FROM $table WHERE id = ?");
                $stmt->execute([dbVal($id, 'id')]);
                echo json_encode(["success" => true]);
            } catch (PDOException $e) {
                debugLog("SQL Error in delete: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        break;

    case 'clear_data':
        if ($method == 'POST') {
            try {
                $pdo->exec("DELETE FROM hearings");
                $pdo->exec("DELETE FROM settlements");
                $pdo->exec("DELETE FROM cases");
                $pdo->exec("DELETE FROM members");
                debugLog("Clear Data Success");
                echo json_encode(["success" => true]);
            } catch (PDOException $e) {
                debugLog("SQL Error in clear_data: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        break;

    case 'save_invitation':
        if ($method == 'POST') {
            $data = json_decode(file_get_contents("php://input"), true);
            try {
                $sql = "INSERT INTO invitations (id, type, issue_date, recipients, address, app_date, app_time, parties, subject, closing, signatory, title) 
                        VALUES (:id, :type, :date, :recipients, :addr, :appDate, :appTime, :parties, :subject, :closing, :signatory, :title)
                        ON DUPLICATE KEY UPDATE 
                        type = :type, issue_date = :date, recipients = :recipients, address = :addr, app_date = :appDate, 
                        app_time = :appTime, parties = :parties, subject = :subject, closing = :closing, 
                        signatory = :signatory, title = :title";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':id' => dbVal($data['id'], 'id'),
                    ':type' => dbVal($data['type']),
                    ':date' => dbVal($data['date']),
                    ':recipients' => dbVal($data['recipients']),
                    ':addr' => dbVal($data['addr']),
                    ':appDate' => dbVal($data['appDate']),
                    ':appTime' => dbVal($data['appTime']),
                    ':parties' => dbVal($data['parties']),
                    ':subject' => dbVal($data['subject']),
                    ':closing' => dbVal($data['closing']),
                    ':signatory' => dbVal($data['signatory']),
                    ':title' => dbVal($data['title'])
                ]);
                echo json_encode(["success" => true]);
            } catch (PDOException $e) {
                debugLog("SQL Error in save_invitation: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        break;

    case 'delete_invitation':
        $id = $_GET['id'] ?? null;
        if ($id) {
            try {
                $stmt = $pdo->prepare("DELETE FROM invitations WHERE id = ?");
                $stmt->execute([dbVal($id, 'id')]);
                echo json_encode(["success" => true]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        break;

    default:
        echo json_encode(["message" => "Welcome to Lupon26 API Version 2.2"]);
        break;
}
?>
