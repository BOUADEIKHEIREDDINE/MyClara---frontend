<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Try to include db_config.php - adjust path if needed
if (file_exists(__DIR__ . '/db_config.php')) {
    require_once __DIR__ . '/db_config.php';
} elseif (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} else {
    // Fallback: try to connect directly (adjust these values to match your database)
    $host = 'localhost';
    $dbname = 'myclara';
    $username = 'root';
    $password = '';
    
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database connection failed: ' . $e->getMessage()
        ]);
        exit;
    }
}

try {
    // Get student ID from query parameter
    $studentId = isset($_GET['studentId']) ? intval($_GET['studentId']) : null;
    
    if (!$studentId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'studentId parameter is required'
        ]);
        exit;
    }

    // Step 1: Get the student's EnrollmentCode from users table
    $studentStmt = $pdo->prepare("
        SELECT EnrollmentCode 
        FROM users 
        WHERE UserID = ? AND UserType = 'Student'
    ");
    $studentStmt->execute([$studentId]);
    $student = $studentStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$student || !$student['EnrollmentCode']) {
        echo json_encode([
            'success' => true,
            'modules' => [],
            'message' => 'No enrollment code found for this student'
        ]);
        exit;
    }
    
    $enrollmentCode = $student['EnrollmentCode'];
    
    // Step 2: Find the class with this EnrollmentCode in classes table
    $classStmt = $pdo->prepare("
        SELECT ClassID, ClassName, EnrollmentCode 
        FROM classes 
        WHERE EnrollmentCode = ?
        LIMIT 1
    ");
    $classStmt->execute([$enrollmentCode]);
    $class = $classStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$class) {
        echo json_encode([
            'success' => true,
            'modules' => [],
            'message' => 'No class found with this enrollment code'
        ]);
        exit;
    }
    
    $classId = $class['ClassID'];
    
    // Step 3: Find all ModuleIDs in class_modules where ClassID matches
    $moduleIdsStmt = $pdo->prepare("
        SELECT DISTINCT ModuleID 
        FROM class_modules 
        WHERE ClassID = ?
    ");
    $moduleIdsStmt->execute([$classId]);
    $moduleIds = $moduleIdsStmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($moduleIds)) {
        echo json_encode([
            'success' => true,
            'modules' => [],
            'message' => 'No modules found for this class'
        ]);
        exit;
    }
    
    // Step 4: Get module details from modules table for each ModuleID
    $placeholders = implode(',', array_fill(0, count($moduleIds), '?'));
    $modulesStmt = $pdo->prepare("
        SELECT ModuleID, ModuleName, Description, CreatorUserID, CreatedAt
        FROM modules 
        WHERE ModuleID IN ($placeholders)
    ");
    $modulesStmt->execute($moduleIds);
    $modules = $modulesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Step 5: For each module, get files from files table
    $modulesWithFiles = [];
    foreach ($modules as $module) {
        $moduleId = $module['ModuleID'];
        
        // Get files for this module
        $filesStmt = $pdo->prepare("
            SELECT 
                f.FileUUID as id,
                f.OriginalFilename as fileName,
                f.FileSize as size,
                f.FileType as fileType,
                f.UploadedAt as createdAt
            FROM files f
            WHERE f.ModuleID = ?
            ORDER BY f.UploadedAt DESC
        ");
        $filesStmt->execute([$moduleId]);
        $files = $filesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $modulesWithFiles[] = [
            'name' => $module['ModuleName'],
            'moduleId' => $moduleId,
            'description' => $module['Description'] ?? '',
            'files' => array_map(function($file) {
                return [
                    'id' => $file['id'],
                    'fileName' => $file['fileName'],
                    'size' => intval($file['size']),
                    'fileType' => $file['fileType'] ?? '',
                    'createdAt' => $file['createdAt']
                ];
            }, $files)
        ];
    }
    
    echo json_encode([
        'success' => true,
        'modules' => $modulesWithFiles,
        'count' => count($modulesWithFiles),
        'classId' => $classId,
        'enrollmentCode' => $enrollmentCode
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'studentId' => $studentId ?? 'not set',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]
    ]);
}
?>

