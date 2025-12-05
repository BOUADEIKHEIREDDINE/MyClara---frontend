# Backend PHP Requirements for Filename Saving

## Overview
The frontend is now sending filenames explicitly in the FormData. The backend PHP files need to be updated to save these filenames in the SQL `files` table.

## Frontend Data Being Sent

### 1. `create_module_with_files.php`
**FormData includes:**
- `moduleName` - The name of the module
- `creatorUserId` - The user ID creating the module
- `files[]` - Array of file objects (File objects from JavaScript)
- `fileNames[]` - Array of filenames (explicitly sent)

**Example:**
```php
// Access files
$files = $_FILES['files'];

// Access filenames explicitly
$fileNames = $_POST['fileNames']; // This is an array
```

### 2. `create_class_with_files.php`
**FormData includes:**
- `className` - The name of the class
- `teachingModuleName` - The teaching module name
- `teacherId` - The teacher ID
- `files[]` - Array of file objects
- `fileNames[]` - Array of filenames (explicitly sent)

### 3. `add_files_to_module.php` (NEW - needs to be created)
**FormData includes:**
- `moduleName` - The name of the module
- `moduleId` - The module ID
- `files[]` - Array of file objects
- `fileNames[]` - Array of filenames (explicitly sent)

## What the Backend Needs to Do

### For `create_module_with_files.php`:
1. Accept `fileNames[]` from `$_POST['fileNames']`
2. When saving each file to the database, use the corresponding filename from `$fileNames[$index]`
3. Save the filename in the `files` table (likely in a `FileName` or `filename` column)

**Example PHP code:**
```php
$fileNames = $_POST['fileNames']; // Array of filenames

foreach ($_FILES['files']['tmp_name'] as $index => $tmpName) {
    $fileName = $fileNames[$index]; // Get the filename from the array
    $fileSize = $_FILES['files']['size'][$index];
    
    // Move file to upload directory
    $uploadPath = 'uploads/' . basename($fileName);
    move_uploaded_file($tmpName, $uploadPath);
    
    // Save to database with filename
    $stmt = $pdo->prepare("INSERT INTO files (ModuleID, FileName, FilePath, FileSize, CreatedAt) VALUES (?, ?, ?, ?, NOW())");
    $stmt->execute([$moduleId, $fileName, $uploadPath, $fileSize]);
}
```

### For `create_class_with_files.php`:
Same approach - use `$fileNames[$index]` when saving files to the database.

### For `add_files_to_module.php` (NEW FILE):
Create a new PHP file that:
1. Accepts `moduleId`, `moduleName`, `files[]`, and `fileNames[]`
2. Validates the module exists
3. Saves each file with its filename to the database
4. Returns JSON response with success/error

**Example structure:**
```php
<?php
header('Content-Type: application/json');

// Database connection
require_once 'db_config.php';

// Get data
$moduleId = $_POST['moduleId'];
$moduleName = $_POST['moduleName'];
$fileNames = $_POST['fileNames']; // Array of filenames
$files = $_FILES['files'];

try {
    // Validate module exists
    $stmt = $pdo->prepare("SELECT ModuleID FROM modules WHERE ModuleID = ?");
    $stmt->execute([$moduleId]);
    if (!$stmt->fetch()) {
        throw new Exception("Module not found");
    }
    
    // Process each file
    foreach ($files['tmp_name'] as $index => $tmpName) {
        $fileName = $fileNames[$index];
        $fileSize = $files['size'][$index];
        
        // Move file
        $uploadPath = 'uploads/' . basename($fileName);
        move_uploaded_file($tmpName, $uploadPath);
        
        // Save to database with filename
        $stmt = $pdo->prepare("INSERT INTO files (ModuleID, FileName, FilePath, FileSize, CreatedAt) VALUES (?, ?, ?, ?, NOW())");
        $stmt->execute([$moduleId, $fileName, $uploadPath, $fileSize]);
    }
    
    echo json_encode(['success' => true, 'message' => 'Files added successfully']);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
```

## Database Table Structure

The `files` table should have at minimum:
- `FileID` (primary key, auto-increment)
- `ModuleID` (foreign key to modules table)
- `FileName` (VARCHAR) - **This is where the filename should be saved**
- `FilePath` (VARCHAR) - Path to the uploaded file
- `FileSize` (INT) - Size of the file in bytes
- `CreatedAt` (DATETIME) - When the file was uploaded

## Important Notes

1. **Always use `$fileNames[$index]`** - Don't rely on `$_FILES['files']['name'][$index]` as it might be sanitized or changed by the server
2. **Validate filenames** - Sanitize filenames before saving to prevent security issues
3. **Handle file upload errors** - Check for upload errors using `$_FILES['files']['error'][$index]`
4. **Use prepared statements** - Always use prepared statements to prevent SQL injection

## Testing

After updating the PHP files, test by:
1. Creating a new module with files
2. Adding files to an existing module
3. Verifying the filenames are correctly saved in the database

