document.addEventListener('DOMContentLoaded', () => {
    const moduleNameInput = document.getElementById('module-name');
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const uploadedFilesList = document.getElementById('uploaded-files-list');
    const validateModulesBtn = document.getElementById('validate-modules-btn');

    const currentUserEmail = localStorage.getItem('currentUserEmail');
    const currentUserName = localStorage.getItem('currentUserEmail'); // Assuming email as username for now

    if (!currentUserEmail) {
        console.error("No current user email found in localStorage. Redirecting to login.");
        window.location.href = 'student-login.html';
        return;
    }

    // Function to show a non-intrusive warning message
    function showWarning(message) {
        const existingWarning = document.querySelector('.warning-message');
        if (existingWarning) {
            existingWarning.remove();
        }

        const warningDiv = document.createElement('div');
        warningDiv.classList.add('warning-message');
        warningDiv.style.cssText = 'color: #e74c3c; font-size: 0.9em; margin-top: 10px;';
        warningDiv.textContent = message;
        moduleNameInput.parentNode.insertBefore(warningDiv, moduleNameInput.nextSibling);
        setTimeout(() => warningDiv.remove(), 5000);
    }

    // Event Listeners for Drag and Drop
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    // Function to handle file upload
    async function handleFileUpload(file) {
        const moduleName = moduleNameInput.value.trim();

        if (!moduleName) {
            alert("Please enter a Module Name before uploading a file.");
            return;
        }

        const fileData = {
            email: currentUserEmail,
            moduleName: moduleName,
            fileName: file.name,
            fileBlob: file,
            createdAt: new Date(),
            size: file.size
        };

        try {
            await saveStudentFile(fileData);
            alert("File uploaded successfully!");
            moduleNameInput.value = ''; // Clear module name after upload
            displayUploadedFiles();
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload file.");
        }
    }

    // Function to display uploaded files
    async function displayUploadedFiles() {
        uploadedFilesList.innerHTML = '';
        const files = await getAllFilesByEmail(currentUserEmail);

        if (files.length === 0) {
            uploadedFilesList.innerHTML = '<p style="text-align: center; color: var(--text-light);">No files uploaded yet.</p>';
            return;
        }

        files.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="file-info">
                    <span class="file-name">${file.fileName}</span>
                    <span class="file-details">Module: ${file.moduleName} | Size: ${(file.size / 1024).toFixed(2)} KB | Uploaded: ${new Date(file.createdAt).toLocaleString()}</span>
                </div>
                <div class="file-actions">
                    <button class="download-btn" data-id="${file.id}">Download</button>
                    <button class="delete-btn" data-id="${file.id}">Delete</button>
                </div>
            `;
            uploadedFilesList.appendChild(li);
        });

        // Add event listeners for download and delete buttons
        uploadedFilesList.querySelectorAll('.download-btn').forEach(button => {
            button.addEventListener('click', (e) => downloadFile(e.target.dataset.id));
        });

        uploadedFilesList.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => deleteAndRefreshFiles(e.target.dataset.id));
        });
    }

    // Function to download a file
    async function downloadFile(id) {
        const files = await getAllFilesByEmail(currentUserEmail);
        const fileToDownload = files.find(file => file.id == id);

        if (fileToDownload && fileToDownload.fileBlob) {
            const blob = fileToDownload.fileBlob;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileToDownload.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            alert("File not found or corrupted.");
        }
    }

    // Function to delete a file and refresh the list
    async function deleteAndRefreshFiles(id) {
        if (confirm("Are you sure you want to delete this file?")) {
            try {
                await deleteFile(parseInt(id));
                alert("File deleted successfully!");
                displayUploadedFiles();
            } catch (error) {
                console.error("Error deleting file:", error);
                alert("Failed to delete file.");
            }
        }
    }

    // Initial display of files when page loads
    displayUploadedFiles();

    if (validateModulesBtn) {
        validateModulesBtn.addEventListener('click', async () => {
            const moduleName = moduleNameInput.value.trim();
            const uploadedFiles = await getAllFilesByEmail(currentUserEmail); // Get all files for validation

            // Removed condition for moduleName. Now only checks for uploaded files.
            if (uploadedFiles.length === 0) {
                showWarning("Please upload at least one file to create a module.");
                return;
            }

            // Store the newly created module's name in localStorage
            // In a real app, this would involve a backend API call
            localStorage.setItem('newlyCreatedModuleName', moduleName);

            console.log("Validate Modules button clicked! Redirecting to dashboard.");
            window.location.href = 'student-dashboard.html';
        });
    }

    // Page Load Animation for Validate Button
    if (validateModulesBtn) {
        validateModulesBtn.classList.remove('hidden-onload');
        validateModulesBtn.classList.add('fade-in-up');
    }
});
