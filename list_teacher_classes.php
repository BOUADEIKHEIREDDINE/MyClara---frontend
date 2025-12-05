<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_config.php';

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

    // First, let's check what columns exist in the classes table
    try {
        $checkStmt = $pdo->query("SHOW COLUMNS FROM classes");
        $columnData = $checkStmt->fetchAll(PDO::FETCH_ASSOC);
        $columns = array_column($columnData, 'Field');
    } catch (Exception $e) {
        // If SHOW COLUMNS fails, try a simple query to get error details
        $columns = [];
    }
    
    // Debug: log available columns
    $debugInfo = ['available_columns' => $columns];

    // Check which columns exist
    $hasModuleID = in_array('ModuleID', $columns);
    $hasTeachingModuleID = in_array('TeachingModuleID', $columns);
    $hasModuleName = in_array('ModuleName', $columns);
    $hasTeachingModuleName = in_array('TeachingModuleName', $columns);
    
    // Build the SELECT clause dynamically based on what exists
    $selectFields = ['c.ClassID', 'c.ClassName', 'c.CreatedAt'];
    
    // Add EnrollmentCode if it exists
    if (in_array('EnrollmentCode', $columns)) {
        $selectFields[] = 'c.EnrollmentCode';
    }
    
    // Build the query based on what columns exist
    $joinClause = '';
    $teachingModuleField = 'NULL as TeachingModuleName';
    
    if ($hasModuleID) {
        // Classes are linked to modules via ModuleID
        $selectFields[] = 'c.ModuleID';
        $joinClause = 'LEFT JOIN modules m ON c.ModuleID = m.ModuleID';
        $teachingModuleField = 'm.ModuleName as TeachingModuleName';
    } elseif ($hasTeachingModuleID) {
        // Classes have TeachingModuleID column
        $selectFields[] = 'c.TeachingModuleID';
        $joinClause = 'LEFT JOIN modules m ON c.TeachingModuleID = m.ModuleID';
        $teachingModuleField = 'm.ModuleName as TeachingModuleName';
    } elseif ($hasModuleName) {
        // Module name is stored directly in classes table
        $teachingModuleField = 'c.ModuleName as TeachingModuleName';
    } elseif ($hasTeachingModuleName) {
        // TeachingModuleName column exists
        $teachingModuleField = 'c.TeachingModuleName';
    }
    
    $selectFields[] = $teachingModuleField;
    $selectClause = implode(', ', $selectFields);
    
    // Build the final query
    $sql = "
        SELECT DISTINCT 
            $selectClause
        FROM classes c
        $joinClause
        WHERE c.TeacherID = ?
        ORDER BY c.CreatedAt DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    
    $stmt->execute([$teacherId]);
    $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // For each class, fetch its files via the module
    $classesWithFiles = [];
    foreach ($classes as $class) {
        // Get teaching module name (could be NULL if no module linked)
        $teachingModuleName = isset($class['TeachingModuleName']) ? $class['TeachingModuleName'] : null;
        
        // Get module ID (could be in ModuleID or TeachingModuleID column)
        $moduleId = null;
        if (isset($class['ModuleID'])) {
            $moduleId = $class['ModuleID'];
        } elseif (isset($class['TeachingModuleID'])) {
            $moduleId = $class['TeachingModuleID'];
        }
        
        $files = [];
        
        // If we have a module ID, get files directly
        if ($moduleId) {
            $filesStmt = $pdo->prepare("
                SELECT 
                    f.FileID as id,
                    COALESCE(f.OriginalFilename, f.FileName, f.filename) as fileName,
                    f.FileSize as size,
                    f.CreatedAt as createdAt,
                    m.ModuleName as teachingModule
                FROM files f
                JOIN modules m ON f.ModuleID = m.ModuleID
                WHERE f.ModuleID = ?
                ORDER BY f.CreatedAt DESC
            ");
            $filesStmt->execute([$moduleId]);
            $files = $filesStmt->fetchAll(PDO::FETCH_ASSOC);
        } 
        // If we have module name but no ID, try to find the module
        elseif ($teachingModuleName) {
            $moduleStmt = $pdo->prepare("
                SELECT ModuleID, ModuleName
                FROM modules 
                WHERE ModuleName = ? AND CreatorUserID = ?
                LIMIT 1
            ");
            $moduleStmt->execute([$teachingModuleName, $teacherId]);
            $module = $moduleStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($module) {
                $filesStmt = $pdo->prepare("
                    SELECT 
                        f.FileID as id,
                        COALESCE(f.OriginalFilename, f.FileName, f.filename) as fileName,
                        f.FileSize as size,
                        f.CreatedAt as createdAt,
                        m.ModuleName as teachingModule
                    FROM files f
                    JOIN modules m ON f.ModuleID = m.ModuleID
                    WHERE f.ModuleID = ?
                    ORDER BY f.CreatedAt DESC
                ");
                $filesStmt->execute([$module['ModuleID']]);
                $files = $filesStmt->fetchAll(PDO::FETCH_ASSOC);
            }
        }

        $classesWithFiles[] = [
            'name' => $class['ClassName'],
            'classId' => $class['ClassID'],
            'teachingModule' => $teachingModuleName ?? 'Unknown Module',
            'enrollmentCode' => $class['EnrollmentCode'] ?? '',
            'createdAt' => $class['CreatedAt'],
            'files' => $files
        ];
    }

    echo json_encode([
        'success' => true,
        'classes' => $classesWithFiles,
        'count' => count($classesWithFiles),
        'debug' => $debugInfo // Include debug info to see table structure
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>

