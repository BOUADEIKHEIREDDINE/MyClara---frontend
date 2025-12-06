<?php
require 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$enrollmentCode = $input['enrollmentCode'] ?? '';
$studentId = isset($input['studentId']) ? (int)$input['studentId'] : 0;

if (!$enrollmentCode || !$studentId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing enrollmentCode or studentId']);
    exit;
}

try {
    // Find class by enrollment code
    $stmt = $pdo->prepare('SELECT ClassID, ClassName FROM classes WHERE EnrollmentCode = :code');
    $stmt->execute([':code' => $enrollmentCode]);
    $class = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$class) {
        http_response_code(404);
        echo json_encode(['error' => 'Invalid enrollment code']);
        exit;
    }

    $classId = (int)$class['ClassID'];

    // Check if already enrolled
    $stmt = $pdo->prepare('SELECT EnrollmentID FROM enrollments WHERE ClassID = :cid AND StudentID = :sid');
    $stmt->execute([':cid' => $classId, ':sid' => $studentId]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Already enrolled in this class']);
        exit;
    }

    // Enroll student
    $stmt = $pdo->prepare('INSERT INTO enrollments (ClassID, StudentID) VALUES (:cid, :sid)');
    $stmt->execute([':cid' => $classId, ':sid' => $studentId]);

    echo json_encode([
        'success' => true,
        'classId' => $classId,
        'className' => $class['ClassName']
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}