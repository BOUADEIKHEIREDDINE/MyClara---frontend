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
    // Get JSON data
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (!$data) {
        throw new Exception('Invalid JSON data');
    }
    
    $email = isset($data['email']) ? trim($data['email']) : '';
    $password = isset($data['password']) ? $data['password'] : '';
    $userType = isset($data['userType']) ? trim($data['userType']) : '';
    $enrollmentCode = isset($data['enrollmentCode']) ? trim(strtoupper($data['enrollmentCode'])) : null;
    
    // Validate required fields
    if (empty($email)) {
        throw new Exception('Email is required');
    }
    
    if (empty($password)) {
        throw new Exception('Password is required');
    }
    
    if (empty($userType)) {
        throw new Exception('User type is required');
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    // Validate password length
    if (strlen($password) < 6) {
        throw new Exception('Password must be at least 6 characters long');
    }
    
    // Validate enrollment code format if provided (only for students)
    if ($userType === 'Student' && $enrollmentCode) {
        if (!preg_match('/^[A-Z0-9]{6}$/', $enrollmentCode)) {
            throw new Exception('Enrollment code must be 6 alphanumeric characters');
        }
    }
    
    // Generate username from email (part before @)
    $username = explode('@', $email)[0];
    
    // Check if email already exists
    $checkEmailStmt = $pdo->prepare("SELECT UserID FROM users WHERE Email = ?");
    $checkEmailStmt->execute([$email]);
    if ($checkEmailStmt->fetch()) {
        throw new Exception('Email already exists');
    }
    
    // Check if username already exists, if so append a number
    $baseUsername = $username;
    $counter = 1;
    do {
        $checkUsernameStmt = $pdo->prepare("SELECT UserID FROM users WHERE Username = ?");
        $checkUsernameStmt->execute([$username]);
        if ($checkUsernameStmt->fetch()) {
            $username = $baseUsername . $counter;
            $counter++;
        } else {
            break;
        }
    } while (true);
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // If enrollment code is provided (for students), verify it exists in classes table
        $classId = null;
        if ($userType === 'Student' && $enrollmentCode) {
            $classStmt = $pdo->prepare("
                SELECT ClassID, ClassName, EnrollmentCode 
                FROM classes 
                WHERE EnrollmentCode = ?
                LIMIT 1
            ");
            $classStmt->execute([$enrollmentCode]);
            $class = $classStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$class) {
                throw new Exception('Invalid enrollment code. Please check with your teacher.');
            }
            
            $classId = $class['ClassID'];
        }
        
        // Hash password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Insert user into users table - including Username column
        $insertUserStmt = $pdo->prepare("
            INSERT INTO users (Username, Email, PasswordHash, UserType, EnrollmentCode, CreatedAt)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        
        // Only set EnrollmentCode for students
        $enrollmentCodeValue = ($userType === 'Student' && $enrollmentCode) ? $enrollmentCode : null;
        
        $insertUserStmt->execute([
            $username,
            $email,
            $hashedPassword,
            $userType,
            $enrollmentCodeValue
        ]);
        
        $userId = $pdo->lastInsertId();
        
        // If student has enrollment code, link them to the class in enrollments table
        if ($userType === 'Student' && $classId) {
            try {
                // Insert into enrollments table
                // EnrollmentID is auto-increment, so we only need ClassID and StudentID
                // EnrolledAt will use the default current_timestamp
                $enrollmentStmt = $pdo->prepare("
                    INSERT INTO enrollments (ClassID, StudentID, EnrolledAt)
                    VALUES (?, ?, NOW())
                    ON DUPLICATE KEY UPDATE EnrolledAt = NOW()
                ");
                $enrollmentStmt->execute([$classId, $userId]);
            } catch (PDOException $e) {
                // If enrollment already exists or other error, log but don't fail signup
                // The student is still created, just not enrolled
                error_log("Failed to create enrollment: " . $e->getMessage());
            }
        }
        
        // Commit transaction
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'User created successfully',
            'userId' => $userId,
            'username' => $username,
            'email' => $email,
            'userType' => $userType,
            'enrollmentCode' => $enrollmentCodeValue,
            'classLinked' => $classId !== null
        ]);
        
    } catch (Exception $e) {
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

