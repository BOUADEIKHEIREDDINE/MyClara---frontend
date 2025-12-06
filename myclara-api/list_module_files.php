<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'config.php';

// Vérifier que c'est une requête GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use GET.']);
    exit;
}

// Get moduleId from query parameter
$moduleId = isset($_GET['moduleId']) ? (int)$_GET['moduleId'] : 0;

if (!$moduleId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing moduleId parameter']);
    exit;
}

try {
    // Fetch files for the module
    $stmt = $pdo->prepare(
        'SELECT FileUUID, OriginalFilename, FileSize, FileType, CreatedAt 
         FROM files 
         WHERE ModuleID = :moduleId 
         ORDER BY CreatedAt DESC'
    );
    $stmt->execute([':moduleId' => $moduleId]);
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format files for frontend
    $formattedFiles = array_map(function($file) {
        return [
            'FileUUID' => $file['FileUUID'],
            'FileID' => $file['FileUUID'], // Alias for compatibility
            'OriginalFilename' => $file['OriginalFilename'],
            'FileName' => $file['OriginalFilename'], // Alias for compatibility
            'FileSize' => (int)$file['FileSize'],
            'FileType' => $file['FileType'] ?? '',
            'CreatedAt' => $file['CreatedAt']
        ];
    }, $files);

    echo json_encode([
        'success' => true,
        'files' => $formattedFiles
    ]);

} catch (Exception $e) {
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

