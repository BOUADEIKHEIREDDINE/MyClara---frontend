<?php
require 'config.php';

// Read JSON input
$input = json_decode(file_get_contents('php://input'), true);
$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing email or password']);
    exit;
}

// Find user by email
$stmt = $pdo->prepare('SELECT UserID, Username, Email, PasswordHash, UserType FROM users WHERE Email = :email');
$stmt->execute([':email' => $email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    exit;
}

// TEST ZONE: compare plain password with PasswordHash field
// (for real production, use password_hash / password_verify)
if ($user['PasswordHash'] !== $password) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    exit;
}

// Success
echo json_encode([
    'userId'   => (int)$user['UserID'],
    'username' => $user['Username'],
    'email'    => $user['Email'],
    'userType' => $user['UserType'],
]);