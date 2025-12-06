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
    $dbname = 'myclara'; // Change this to your database name
    $username = 'root'; // Change this to your database username
    $password = ''; // Change this to your database password
    
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
    // Get teacher ID from query parameter
    $teacherId = isset($_GET['teacherId']) ? intval($_GET['teacherId']) : null;
    
    if (!$teacherId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'teacherId parameter is required'
        ]);
        exit;
    }

    // Fetch classes with their linked modules using class_modules table
    $stmt = $pdo->prepare("
        SELECT DISTINCT
            c.ClassID,
            c.ClassName,
            c.TeacherID,
            c.CreatedAt,
            c.EnrollmentCode,
            m.ModuleID,
            m.ModuleName as TeachingModuleName
        FROM classes c
        LEFT JOIN class_modules cm ON c.ClassID = cm.ClassID
        LEFT JOIN modules m ON cm.ModuleID = m.ModuleID
        WHERE c.TeacherID = ?
        ORDER BY c.CreatedAt DESC
    ");
    
    $stmt->execute([$teacherId]);
    $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // For each class, fetch its files via the module
    $classesWithFiles = [];
    foreach ($classes as $class) {
        $teachingModuleName = $class['TeachingModuleName'] ?? null;
        $moduleId = $class['ModuleID'] ?? null;
        
        $files = [];
        
        // If we have a module ID, get files directly
        if ($moduleId) {
            $filesStmt = $pdo->prepare("
                SELECT 
                    f.FileUUID as id,
                    f.OriginalFilename as fileName,
                    f.FileSize as size,
                    f.UploadedAt as createdAt,
                    m.ModuleName as teachingModule
                FROM files f
                JOIN modules m ON f.ModuleID = m.ModuleID
                WHERE f.ModuleID = ?
                ORDER BY f.UploadedAt DESC
            ");
            $filesStmt->execute([$moduleId]);
            $files = $filesStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $classesWithFiles[] = [
            'name' => $class['ClassName'],
            'classId' => $class['ClassID'],
            'teachingModule' => $teachingModuleName ?? 'Untitled module',
            'enrollmentCode' => $class['EnrollmentCode'] ?? '',
            'createdAt' => $class['CreatedAt'],
            'files' => $files
        ];
    }

    echo json_encode([
        'success' => true,
        'classes' => $classesWithFiles,
        'count' => count($classesWithFiles),
        'debug' => [
            'teacherId' => $teacherId,
            'classesFound' => count($classes),
            'classesWithFilesProcessed' => count($classesWithFiles)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'teacherId' => $teacherId ?? 'not set',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]
    ]);
}
?>

