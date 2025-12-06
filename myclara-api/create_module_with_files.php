<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'config.php';

// Vérifier que c'est une requête POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

// Lire les données depuis $_POST (FormData envoie en multipart/form-data)
$moduleName    = isset($_POST['moduleName']) ? trim($_POST['moduleName']) : '';
$creatorUserId = isset($_POST['creatorUserId']) ? (int)$_POST['creatorUserId'] : 0;

// Get filenames array from POST (explicitly sent by frontend)
$fileNames = isset($_POST['fileNames']) && is_array($_POST['fileNames']) ? $_POST['fileNames'] : [];

// Debug
error_log("POST data: " . print_r($_POST, true));
error_log("FILES data: " . print_r($_FILES, true));
error_log("Received moduleName: " . $moduleName);
error_log("Received creatorUserId: " . $creatorUserId);
error_log("Received fileNames: " . print_r($fileNames, true));

if (!$moduleName || !$creatorUserId) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Missing moduleName or creatorUserId',
        'debug' => [
            'moduleName' => $moduleName,
            'creatorUserId' => $creatorUserId,
            'post_keys' => array_keys($_POST),
            'files_keys' => isset($_FILES['files']) ? array_keys($_FILES['files']) : [],
            'request_method' => $_SERVER['REQUEST_METHOD'],
            'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set'
        ]
    ]);
    exit;
}

try {
    // 1) Créer le module
    $stmt = $pdo->prepare('INSERT INTO modules (ModuleName, CreatorUserID) VALUES (:n, :c)');
    $stmt->execute([':n' => $moduleName, ':c' => $creatorUserId]);
    $moduleId = (int)$pdo->lastInsertId();
    
    error_log("Module created with ID: " . $moduleId);

    // 2) Créer le dossier uploads s'il n'existe pas
    $uploadDir = __DIR__ . '/uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // 3) Sauvegarder chaque fichier
    $filesSaved = 0;
    if (!empty($_FILES['files']['name']) && is_array($_FILES['files']['name'])) {
        foreach ($_FILES['files']['name'] as $i => $defaultName) {
            $tmpName = $_FILES['files']['tmp_name'][$i] ?? null;
            if (!$tmpName || !is_uploaded_file($tmpName)) {
                error_log("Skipping file index $i (not uploaded)");
                continue;
            }

            // Use explicit filename from POST if available, otherwise fallback to $_FILES
            $fileName = isset($fileNames[$i]) && !empty(trim($fileNames[$i])) 
                ? trim($fileNames[$i]) 
                : $defaultName;
            
            // Sanitize filename for security
            $fileName = basename($fileName); // Remove any path components
            
            $size = (int)($_FILES['files']['size'][$i] ?? 0);
            $type = $_FILES['files']['type'][$i] ?? '';

            $uuid = bin2hex(random_bytes(16));
            $ext  = pathinfo($fileName, PATHINFO_EXTENSION);
            $blobName = $uuid . ($ext ? ".$ext" : '');

            if (!move_uploaded_file($tmpName, $uploadDir . $blobName)) {
                error_log("Failed to move file: $fileName");
                continue;
            }

            // Save file with the explicit filename
            $stmtFile = $pdo->prepare(
                'INSERT INTO files (FileUUID, OwnerUserID, OriginalFilename, BlobName, FileSize, FileType, ModuleID)
                 VALUES (:id, :owner, :orig, :blob, :size, :type, :module)'
            );
            $stmtFile->execute([
                ':id'     => $uuid,
                ':owner'  => $creatorUserId,
                ':orig'   => $fileName, // Use the explicit filename
                ':blob'   => $blobName,
                ':size'   => $size,
                ':type'   => $type,
                ':module' => $moduleId,
            ]);
            
            $filesSaved++;
            error_log("File saved: $fileName (UUID: $uuid, OriginalFilename: $fileName)");
        }
    }

    echo json_encode([
        'success' => true,
        'moduleId' => $moduleId,
        'filesSaved' => $filesSaved
    ]);

} catch (Exception $e) {
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

