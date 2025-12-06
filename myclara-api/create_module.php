<?php
require 'config.php';

// EXACTEMENT comme signup.php
$input = json_decode(file_get_contents('php://input'), true);
$moduleName = $input['moduleName'] ?? '';
$creatorUserId = isset($input['creatorUserId']) ? (int)$input['creatorUserId'] : 0;

if (!$moduleName || !$creatorUserId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing moduleName or creatorUserId']);
    exit;
}

try {
    // INSERT dans modules (comme signup fait INSERT dans users)
    $stmt = $pdo->prepare('INSERT INTO modules (ModuleName, CreatorUserID) VALUES (:n, :c)');
    $stmt->execute([':n' => trim($moduleName), ':c' => $creatorUserId]);
    
    $moduleId = (int)$pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'moduleId' => $moduleId,
        'moduleName' => trim($moduleName)
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}