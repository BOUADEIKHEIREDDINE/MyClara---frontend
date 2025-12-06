<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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
    // Get form data
    $className = isset($_POST['className']) ? trim($_POST['className']) : '';
    $teachingModuleName = isset($_POST['teachingModuleName']) ? trim($_POST['teachingModuleName']) : '';
    $teacherId = isset($_POST['teacherId']) ? intval($_POST['teacherId']) : null;
    $enrollmentCode = isset($_POST['enrollmentCode']) ? trim($_POST['enrollmentCode']) : '';
    
    // Validate required fields
    if (empty($className)) {
        throw new Exception('Class name is required');
    }
    if (empty($teachingModuleName)) {
        throw new Exception('Teaching module name is required');
    }
    if (!$teacherId) {
        throw new Exception('Teacher ID is required');
    }
    
    // Check if files were uploaded
    if (!isset($_FILES['files']) || empty($_FILES['files']['tmp_name'])) {
        throw new Exception('No files uploaded');
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // ===== STEP 1: CREATE MODULE FIRST =====
        // Check if this teacher already has classes
        $existingClassesStmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM classes
            WHERE TeacherID = ?
        ");
        $existingClassesStmt->execute([$teacherId]);
        $existingClassesCount = $existingClassesStmt->fetch(PDO::FETCH_ASSOC)['count'];
        $isFirstClass = ($existingClassesCount == 0);
        
        // Find the module by name and creator (teacher) - case-insensitive search
        $moduleStmt = $pdo->prepare("
            SELECT ModuleID, ModuleName, CreatorUserID
            FROM modules 
            WHERE LOWER(ModuleName) = LOWER(?) AND CreatorUserID = ?
            LIMIT 1
        ");
        $moduleStmt->execute([$teachingModuleName, $teacherId]);
        $module = $moduleStmt->fetch(PDO::FETCH_ASSOC);
        
        $moduleId = null;
        
        // If this is the first class and module doesn't exist, CREATE IT FIRST
        if (!$module && $isFirstClass) {
            // CREATE MODULE FIRST - This must happen before any file insertions
            $createModuleStmt = $pdo->prepare("
                INSERT INTO modules (ModuleName, CreatorUserID, CreatedAt)
                VALUES (?, ?, NOW())
            ");
            $createModuleStmt->execute([$teachingModuleName, $teacherId]);
            $moduleId = $pdo->lastInsertId();
            
            // Verify the module was created successfully
            if (!$moduleId || $moduleId == 0) {
                throw new Exception('Failed to create module. ModuleID is invalid.');
            }
        } 
        // If module doesn't exist and this is NOT the first class, throw error
        elseif (!$module) {
            // Get the teacher's existing module
            $teacherModuleStmt = $pdo->prepare("
                SELECT DISTINCT m.ModuleID, m.ModuleName
                FROM modules m
                JOIN class_modules cm ON m.ModuleID = cm.ModuleID
                JOIN classes c ON cm.ClassID = c.ClassID
                WHERE c.TeacherID = ?
                LIMIT 1
            ");
            $teacherModuleStmt->execute([$teacherId]);
            $teacherModule = $teacherModuleStmt->fetch(PDO::FETCH_ASSOC);
            
            $existingModuleName = $teacherModule ? $teacherModule['ModuleName'] : 'unknown';
            
            throw new Exception("A teacher can only teach one module. You are already teaching: '$existingModuleName'. Cannot create class with module: '$teachingModuleName'");
        }
        // If module exists, use its ID
        else {
            $moduleId = $module['ModuleID'];
        }
        
        // If module exists but this is NOT the first class, verify it matches teacher's existing module
        if (!$isFirstClass && $moduleId) {
            // Get the teacher's existing module
            $teacherModuleStmt = $pdo->prepare("
                SELECT DISTINCT m.ModuleID, m.ModuleName
                FROM modules m
                JOIN class_modules cm ON m.ModuleID = cm.ModuleID
                JOIN classes c ON cm.ClassID = c.ClassID
                WHERE c.TeacherID = ?
                LIMIT 1
            ");
            $teacherModuleStmt->execute([$teacherId]);
            $teacherModule = $teacherModuleStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($teacherModule && $teacherModule['ModuleID'] != $moduleId) {
                throw new Exception("A teacher can only teach one module. You are already teaching: '{$teacherModule['ModuleName']}'. Cannot create class with module: '$teachingModuleName'");
            }
        }
        
        // Final verification that moduleId is valid
        if (!$moduleId || $moduleId == 0) {
            throw new Exception('Invalid ModuleID. Cannot proceed with file upload.');
        }
        
        // Convert moduleId to integer to ensure type matching
        $moduleId = intval($moduleId);
        
        // ===== STEP 2: CREATE CLASS =====
        // Generate enrollment code if not provided
        if (empty($enrollmentCode)) {
            $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            $enrollmentCode = '';
            for ($i = 0; $i < 6; $i++) {
                $enrollmentCode .= $chars[rand(0, strlen($chars) - 1)];
            }
        }
        
        // Insert class into classes table
        $classStmt = $pdo->prepare("
            INSERT INTO classes (ClassName, TeacherID, EnrollmentCode, CreatedAt)
            VALUES (?, ?, ?, NOW())
        ");
        $classStmt->execute([$className, $teacherId, $enrollmentCode]);
        $classId = $pdo->lastInsertId();
        
        // Link class to module in class_modules table
        $checkLinkStmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM class_modules
            WHERE ClassID = ? AND ModuleID = ?
        ");
        $checkLinkStmt->execute([$classId, $moduleId]);
        $linkExists = $checkLinkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        if (!$linkExists) {
            $linkStmt = $pdo->prepare("
                INSERT INTO class_modules (ClassID, ModuleID)
                VALUES (?, ?)
            ");
            $linkStmt->execute([$classId, $moduleId]);
        }
        
        // ===== STEP 3: DISABLE FOREIGN KEY CHECKS TEMPORARILY =====
        // Disable foreign key constraint checks before inserting files
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
        
        // ===== STEP 4: INSERT FILES =====
        $fileNames = isset($_POST['fileNames']) ? $_POST['fileNames'] : [];
        $uploadedFiles = [];
        $uploadDir = __DIR__ . '/uploads/';
        
        // Create uploads directory if it doesn't exist
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        foreach ($_FILES['files']['tmp_name'] as $index => $tmpName) {
            if ($_FILES['files']['error'][$index] !== UPLOAD_ERR_OK) {
                continue; // Skip files with upload errors
            }
            
            // Get original filename
            $originalFileName = isset($fileNames[$index]) ? $fileNames[$index] : $_FILES['files']['name'][$index];
            
            // Generate unique filename (Blobname) to avoid conflicts
            $fileExtension = pathinfo($originalFileName, PATHINFO_EXTENSION);
            $blobName = uniqid('file_', true) . '.' . $fileExtension;
            $uploadPath = $uploadDir . $blobName;
            
            // Move uploaded file
            if (move_uploaded_file($tmpName, $uploadPath)) {
                $fileSize = $_FILES['files']['size'][$index];
                
                // Generate UUID for file
                $fileUUID = bin2hex(random_bytes(16));
                
                // Get file type from extension
                $fileType = $fileExtension ?: 'unknown';
                
                // Insert file into files table
                $fileStmt = $pdo->prepare("
                    INSERT INTO files (
                        FileUUID, 
                        ModuleID, 
                        OriginalFilename, 
                        Blobname, 
                        FileSize, 
                        FileType, 
                        UploadedAt
                    )
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                ");
                $fileStmt->execute([
                    $fileUUID,
                    $moduleId,
                    $originalFileName,
                    $blobName,
                    $fileSize,
                    $fileType
                ]);
                
                $uploadedFiles[] = [
                    'id' => $fileUUID,
                    'fileName' => $originalFileName,
                    'size' => $fileSize
                ];
            }
        }
        
        // ===== STEP 5: RE-ENABLE FOREIGN KEY CHECKS =====
        // Re-enable foreign key constraint checks after inserting files
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        
        // Commit transaction - all operations succeed together
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Class created successfully',
            'classId' => $classId,
            'moduleId' => $moduleId,
            'enrollmentCode' => $enrollmentCode,
            'filesUploaded' => count($uploadedFiles),
            'moduleCreated' => $isFirstClass && !$module
        ]);
        
    } catch (Exception $e) {
        // Re-enable foreign key checks in case of error
        try {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        } catch (Exception $e2) {
            // Ignore if this fails
        }
        // Rollback transaction on error
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
