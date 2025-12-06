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

// Get creatorUserId from query parameter
// This should be the UserID from the users table
// It will be matched against CreatorUserID in the modules table
$creatorUserId = isset($_GET['creatorUserId']) ? (int)$_GET['creatorUserId'] : 0;

if (!$creatorUserId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing creatorUserId parameter']);
    exit;
}

// Debug logging
error_log("list_student_modules.php called with creatorUserId: " . $creatorUserId);

try {
    // IMPORTANT: Fetch ALL modules for this user, even if they have 0 files
    // CreatorUserID in modules table should match UserID from users table
    // Using LEFT JOIN would filter out modules with no files, so we use a simple SELECT
    $stmt = $pdo->prepare(
        'SELECT ModuleID, ModuleName, CreatorUserID, CreatedAt 
         FROM modules 
         WHERE CreatorUserID = :creatorUserId 
         ORDER BY CreatedAt DESC'
    );
    $stmt->execute([':creatorUserId' => $creatorUserId]);
    $modules = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("Found " . count($modules) . " modules for CreatorUserID: " . $creatorUserId);

    // Format modules for frontend
    // Return ALL modules regardless of file count
    $formattedModules = array_map(function($module) {
        return [
            'ModuleID' => (int)$module['ModuleID'],
            'ModuleName' => $module['ModuleName'],
            'CreatorUserID' => (int)$module['CreatorUserID'],
            'CreatedAt' => $module['CreatedAt']
        ];
    }, $modules);

    echo json_encode([
        'success' => true,
        'modules' => $formattedModules,
        'count' => count($formattedModules),
        'debug' => [
            'creatorUserId' => $creatorUserId,
            'modulesFound' => count($formattedModules)
        ]
    ]);

} catch (Exception $e) {
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
