document.addEventListener('DOMContentLoaded', () => {
    const moduleNameInput = document.getElementById('module-name');
    const moduleDropzone = document.getElementById('module-dropzone');
    const moduleFileInput = document.getElementById('module-file-input');
    const finishModuleBtn = document.getElementById('finish-module-btn');
    const currentModuleFilesList = document.getElementById('current-module-files');
    const currentFileCount = document.getElementById('current-file-count');
    const modulesList = document.getElementById('modules-list');
    const validateModulesBtn = document.getElementById('validate-modules-btn');
    const existingModuleFileInput = document.getElementById('existing-module-file-input');

    const currentUserEmail = localStorage.getItem('currentUserEmail');
    if (!currentUserEmail) {
        console.error('No current user email found in localStorage. Redirecting to login.');
        window.location.href = 'student-login.html';
        return;
    }

    const API_BASE_URL = 'http://localhost/myclara-api';

    let currentModule = {
        name: '',
        files: []
    };
    let signedModules = [];
    let existingModuleTarget = null;
    const moduleCardStates = {};

    function showWarning(message) {
        const existingWarning = document.querySelector('.warning-message');
        if (existingWarning) {
            existingWarning.remove();
        }
        const warningDiv = document.createElement('div');
        warningDiv.classList.add('warning-message');
        warningDiv.style.cssText = 'color: #c0392b; font-size: 0.9em; margin-top: 10px;';
        warningDiv.textContent = message;
        moduleNameInput.parentNode.insertBefore(warningDiv, moduleNameInput.nextSibling);
        setTimeout(() => warningDiv.remove(), 5000);
    }

    function updateCurrentModuleName() {
        currentModule.name = moduleNameInput.value.trim();
        // Activer le bouton dès qu'il y a un nom de module (pas besoin de fichiers)
        finishModuleBtn.disabled = !currentModule.name;
        
        // Activer "Validate All Modules" si on a un module en cours
        if (validateModulesBtn) {
            const hasCurrentModule = currentModule.name && currentModule.files.length > 0;
            validateModulesBtn.disabled = !(hasCurrentModule || signedModules.length > 0);
        }
    }

    moduleNameInput.addEventListener('input', updateCurrentModuleName);

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 KB';
        const sizes = ['bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }

    function getFileBadgeLabel(fileName) {
        const ext = fileName.includes('.') ? fileName.split('.').pop().toUpperCase() : 'FILE';
        return ext.substring(0, 4);
    }

    function renderCurrentModuleFiles() {
        currentFileCount.textContent = `${currentModule.files.length} ${currentModule.files.length === 1 ? 'file' : 'files'}`;
        if (currentModule.files.length === 0) {
            currentModuleFilesList.classList.add('empty-state');
            currentModuleFilesList.innerHTML = '<p>Add files to see them here.</p>';
            finishModuleBtn.disabled = true;
            return;
        }

        currentModuleFilesList.classList.remove('empty-state');
        currentModuleFilesList.innerHTML = '';

        currentModule.files.forEach((file, index) => {
            const chip = document.createElement('div');
            chip.className = 'current-file-chip';
            chip.innerHTML = `
                <span class="file-type">${getFileBadgeLabel(file.name)}</span>
                <div class="file-meta">
                    <span class="name">${file.name}</span>
                    <span class="size">${formatFileSize(file.size)}</span>
                </div>
            `;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'chip-action';
            removeBtn.type = 'button';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => {
                currentModule.files.splice(index, 1);
                renderCurrentModuleFiles();
                updateCurrentModuleName();
            });
            chip.appendChild(removeBtn);
            currentModuleFilesList.appendChild(chip);
        });

        finishModuleBtn.disabled = !currentModule.name;
    }

    function handleCurrentModuleFiles(fileList) {
        const moduleName = moduleNameInput.value.trim();
        if (!moduleName) {
            showWarning('Enter a module name before adding files.');
            moduleFileInput.value = '';
            return;
        }
        currentModule.files.push(...Array.from(fileList));
        renderCurrentModuleFiles();
        updateCurrentModuleName();
        moduleFileInput.value = '';
        
        // Activer "Validate All Modules" quand on ajoute des fichiers
        if (validateModulesBtn && currentModule.name) {
            validateModulesBtn.disabled = false;
        }
    }

    async function uploadFilesToExistingModule(moduleName, moduleId, fileList) {
        if (!API_BASE_URL) {
            throw new Error('API_BASE_URL is not configured');
        }

        const formData = new FormData();
        formData.append('moduleName', moduleName);
        formData.append('moduleId', moduleId);

        if (fileList.length === 0) {
            throw new Error('No files to upload');
        }

        Array.from(fileList).forEach((file) => {
            formData.append('files[]', file);
            formData.append('fileNames[]', file.name);
        });

        try {
            const response = await fetch(`${API_BASE_URL}/add_files_to_module.php`, {
                method: 'POST',
                body: formData
            });

            const responseText = await response.text();
            console.log('Backend response:', responseText);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
            }

            const data = JSON.parse(responseText);
            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.success) {
                throw new Error('Backend did not return success');
            }

            return data;
        } catch (err) {
            if (err instanceof SyntaxError) {
                throw new Error('Backend returned invalid JSON. Response: ' + err.message);
            }
            throw err;
        }
    }

    async function addFilesToExistingModule(moduleName, fileList) {
        if (!moduleName || !fileList.length) {
            return;
        }
        try {
            // Try to find the module in signedModules to get moduleId
            const module = signedModules.find(m => m.name === moduleName);
            
            // If module has moduleId, use backend API
            if (module && module.moduleId) {
                await uploadFilesToExistingModule(moduleName, module.moduleId, fileList);
            } else {
                // Fallback to IndexedDB if no moduleId (legacy)
                await Promise.all(Array.from(fileList).map(file => saveStudentFile({
                    email: currentUserEmail,
                    moduleName,
                    fileName: file.name,
                    fileBlob: file,
                    createdAt: new Date(),
                    size: file.size
                })));
            }
            await refreshSignedModules();
        } catch (error) {
            console.error('Error adding files to module:', error);
            showWarning('Failed to add files to this module.');
        }
    }

    moduleDropzone.addEventListener('click', () => moduleFileInput.click());

    moduleDropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        moduleDropzone.classList.add('drag-over');
    });

    moduleDropzone.addEventListener('dragleave', () => {
        moduleDropzone.classList.remove('drag-over');
    });

    moduleDropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        moduleDropzone.classList.remove('drag-over');
        if (event.dataTransfer.files.length) {
            handleCurrentModuleFiles(event.dataTransfer.files);
        }
    });

    moduleFileInput.addEventListener('change', (event) => {
        if (event.target.files.length) {
            handleCurrentModuleFiles(event.target.files);
        }
    });
    // ===== Helper: save module name to PHP backend (EXACTEMENT comme signup) =====
    async function saveModuleNameToBackend(moduleName, creatorUserId) {
        try {
            const res = await fetch(`${API_BASE_URL}/create_module.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moduleName: moduleName.trim(),
                    creatorUserId: parseInt(creatorUserId)
                })
            });

            let data = null;
            try {
                data = await res.json();
            } catch (jsonErr) {
                // If response is not JSON, capture raw text for debugging
                const text = await res.text();
                console.error(`Module creation failed (status ${res.status}). Raw response: ${text}`);
                throw new Error(`Invalid JSON response: ${text}`);
            }

            if (!res.ok || (data && data.error)) {
                console.error(data && data.error ? data.error : `Module creation failed (status ${res.status})`);
                throw new Error(data && data.error ? data.error : 'Module creation failed');
            }

            return data;
        } catch (e) {
            console.error(e);
            throw new Error('Server error during module creation: ' + e.message);
        }
    }

    async function persistCurrentModule() {
        if (!currentModule.name || currentModule.files.length === 0) {
            showWarning('Provide a module name and at least one file.');
            return;
        }
        
        finishModuleBtn.disabled = true;
        finishModuleBtn.textContent = 'Saving...';

        try {
            const creatorUserId = localStorage.getItem('currentUserId');
            
            if (!creatorUserId || creatorUserId === 'null' || creatorUserId === '0') {
                window.location.href = 'student-login.html';
                return;
            }

            // Save module name to MySQL (like signup - JSON)
            const result = await saveModuleNameToBackend(currentModule.name, creatorUserId);

            localStorage.setItem('newlyCreatedModuleName', currentModule.name);
            resetCurrentModule();
            await refreshSignedModules();
        } catch (error) {
            console.error('Error saving module:', error);
            showWarning('Failed to save module. Please try again.');
            finishModuleBtn.disabled = false;
            finishModuleBtn.textContent = 'Finish Module & Add Another';
        }
    }

    function resetCurrentModule() {
        currentModule = { name: '', files: [] };
        moduleNameInput.value = '';
        currentFileCount.textContent = '0 files';
        currentModuleFilesList.classList.add('empty-state');
        currentModuleFilesList.innerHTML = '<p>Add files to see them here.</p>';
        finishModuleBtn.disabled = true;
    }

    // Bouton "Finish Module & Add Another" - sauvegarde le module (EXACTEMENT comme signup)
    finishModuleBtn.addEventListener('click', async () => {
        const moduleName = moduleNameInput.value.trim();
        
        if (!moduleName) {
            showWarning('Please enter a module name.');
            return;
        }

        const creatorUserId = localStorage.getItem('currentUserId');
        if (!creatorUserId) {
            window.location.href = 'student-login.html';
            return;
        }

        finishModuleBtn.disabled = true;
        finishModuleBtn.textContent = 'Saving...';

        try {
            const res = await fetch(`${API_BASE_URL}/create_module.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moduleName: moduleName,
                    creatorUserId: parseInt(creatorUserId)
                })
            });

            let data = null;
            try {
                data = await res.json();
            } catch (jsonErr) {
                const text = await res.text();
                console.error(`Module creation failed (status ${res.status}). Raw response: ${text}`);
                showWarning('Failed to save module. Please try again.');
                finishModuleBtn.disabled = false;
                finishModuleBtn.textContent = 'Finish Module & Add Another';
                return;
            }

            if (!res.ok || (data && data.error)) {
                console.error(data && data.error ? data.error : `Module creation failed (status ${res.status})`);
                showWarning(data && data.error ? data.error : 'Failed to save module. Please try again.');
                finishModuleBtn.disabled = false;
                finishModuleBtn.textContent = 'Finish Module & Add Another';
                return;
            }

            // SUCCESS - module sauvegardé
            moduleNameInput.value = '';
            currentModule.name = '';
            currentModule.files = [];
            renderCurrentModuleFiles();
            await refreshSignedModules(); // Recharger la liste des modules
            
            finishModuleBtn.disabled = true;
            finishModuleBtn.textContent = 'Finish Module & Add Another';
        } catch (e) {
            console.error(e);
            showWarning('Server error during module creation.');
            finishModuleBtn.disabled = false;
            finishModuleBtn.textContent = 'Finish Module & Add Another';
        }
    });

    function groupFilesByModule(files) {
        const grouped = {};
        files.forEach(file => {
            if (!grouped[file.moduleName]) {
                grouped[file.moduleName] = [];
            }
            grouped[file.moduleName].push(file);
        });
        return Object.keys(grouped)
            .sort((a, b) => a.localeCompare(b))
            .map(name => ({ name, files: grouped[name] }));
    }

    function renderSignedModules() {
        modulesList.innerHTML = '';
        const moduleNames = new Set(signedModules.map(m => m.name));
        Object.keys(moduleCardStates).forEach(name => {
            if (!moduleNames.has(name)) {
                delete moduleCardStates[name];
            }
        });

        if (signedModules.length === 0) {
            modulesList.classList.add('empty-state');
            modulesList.innerHTML = '<p>No modules yet. Finish your first module to see it here.</p>';
        } else {
            modulesList.classList.remove('empty-state');
            signedModules.forEach(module => {
                modulesList.appendChild(createModuleCard(module));
            });
        }
        
        // Activer le bouton si on a un module en cours OU des modules sauvegardés
        const hasCurrentModule = currentModule.name && currentModule.files.length > 0;
        validateModulesBtn.disabled = !(hasCurrentModule || signedModules.length > 0);
    }

    function createModuleCard(module) {
        const isOpen = !!moduleCardStates[module.name];
        const card = document.createElement('article');
        card.className = 'signed-module-card';
        if (isOpen) {
            card.classList.add('open');
        }

        const headerBtn = document.createElement('button');
        headerBtn.type = 'button';
        headerBtn.className = 'signed-module-card__header';
        const latestFile = module.files.reduce((latest, file) => {
            if (!latest) return file;
            return new Date(file.createdAt) > new Date(latest.createdAt) ? file : latest;
        }, null);
        const metaText = `${module.files.length} ${module.files.length === 1 ? 'file' : 'files'}${latestFile ? ` • Updated ${new Date(latestFile.createdAt).toLocaleDateString()}` : ''}`;
        headerBtn.innerHTML = `
            <div class="module-card-title-group">
                <span class="module-block-title">${module.name}</span>
                <span class="module-card-meta">${metaText}</span>
            </div>
            <span class="module-card-chevron">${isOpen ? '▲' : '▼'}</span>
        `;
        headerBtn.addEventListener('click', () => toggleModuleCard(module.name, card));

        const body = document.createElement('div');
        body.className = 'signed-module-card__body';

        const fileList = document.createElement('ul');
        fileList.className = 'module-file-list';

        if (module.files && module.files.length > 0) {
            module.files.forEach(file => {
                const item = document.createElement('li');
                item.className = 'module-file-item';

                const details = document.createElement('div');
                details.className = 'module-file-details';

                const icon = document.createElement('div');
                icon.className = 'file-type-icon';
                icon.textContent = getFileBadgeLabel(file.fileName);

                const info = document.createElement('div');
                info.className = 'module-file-info';
                info.innerHTML = `
                    <p class="module-file-name">${file.fileName}</p>
                    <p class="module-file-meta">${formatFileSize(file.size || 0)}</p>
                `;

                details.append(icon, info);

                const actions = document.createElement('div');
                actions.className = 'module-file-actions';

                const removeBtn = document.createElement('button');
                removeBtn.className = 'ghost-btn';
                removeBtn.type = 'button';
                removeBtn.textContent = 'Remove';
                removeBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    deleteSingleFile(file.id);
                });

                actions.appendChild(removeBtn);
                item.append(details, actions);
                fileList.appendChild(item);
            });
        } else {
            // Show empty state if no files
            const emptyItem = document.createElement('li');
            emptyItem.className = 'module-file-item';
            emptyItem.style.cssText = 'padding: 15px; color: #858596; text-align: center;';
            emptyItem.textContent = 'No files in this module yet.';
            fileList.appendChild(emptyItem);
        }

        const actionsRow = document.createElement('div');
        actionsRow.className = 'module-card-actions';

        const uploadLink = document.createElement('button');
        uploadLink.type = 'button';
        uploadLink.className = 'text-link-btn';
        uploadLink.textContent = 'Upload More Files';
        uploadLink.addEventListener('click', (event) => {
            event.stopPropagation();
            openExistingModuleUploader(module.name);
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'danger-btn';
        deleteButton.textContent = 'Delete Module';
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteModuleAndRefresh(module.name);
        });

        actionsRow.append(uploadLink, deleteButton);
        body.append(fileList, actionsRow);

        body.addEventListener('dragover', (event) => {
            if (!card.classList.contains('open')) return;
            event.preventDefault();
            body.classList.add('drop-ready');
        });
        body.addEventListener('dragleave', () => body.classList.remove('drop-ready'));
        body.addEventListener('drop', (event) => {
            if (!card.classList.contains('open')) return;
            event.preventDefault();
            body.classList.remove('drop-ready');
            addFilesToExistingModule(module.name, event.dataTransfer.files);
        });

        card.append(headerBtn, body);

        requestAnimationFrame(() => {
            setBodyHeight(body, isOpen);
        });

        return card;
    }

    function setBodyHeight(body, isOpen) {
        if (!body) return;
        if (isOpen) {
            const naturalHeight = body.scrollHeight;
            const paddedHeight = Math.ceil(naturalHeight * 1.25);
            body.style.maxHeight = `${paddedHeight}px`;
        } else {
            body.style.maxHeight = '0px';
        }
    }

    function toggleModuleCard(moduleName, card) {
        const body = card.querySelector('.signed-module-card__body');
        const chevron = card.querySelector('.module-card-chevron');
        const isOpen = card.classList.toggle('open');
        moduleCardStates[moduleName] = isOpen;
        if (chevron) {
            chevron.textContent = isOpen ? '▲' : '▼';
        }
        requestAnimationFrame(() => {
            setBodyHeight(body, isOpen);
        });
    }

    function openExistingModuleUploader(moduleName) {
        existingModuleTarget = moduleName;
        existingModuleFileInput.value = '';
        existingModuleFileInput.click();
    }

    existingModuleFileInput.addEventListener('change', async (event) => {
        if (!existingModuleTarget || !event.target.files.length) {
            existingModuleTarget = null;
            return;
        }
        await addFilesToExistingModule(existingModuleTarget, event.target.files);
        existingModuleTarget = null;
        existingModuleFileInput.value = '';
    });

    async function deleteSingleFile(fileId) {
        if (!confirm('Remove this file from the module?')) {
            return;
        }
        try {
            // Try to delete from backend first (if it's a UUID from SQL)
            if (typeof fileId === 'string' && fileId.length > 10) {
                // Likely a UUID from SQL database
                const response = await fetch(`${API_BASE_URL}/delete_file.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId: fileId })
                });
                if (response.ok) {
                    await refreshSignedModules();
                    return;
                }
            }
            // Fallback to IndexedDB deletion
            await deleteFile(parseInt(fileId, 10));
            await refreshSignedModules();
        } catch (error) {
            console.error('Error deleting file:', error);
            showWarning('Failed to delete file.');
        }
    }

    async function deleteModuleFromBackend(moduleId) {
        try {
            const response = await fetch(`${API_BASE_URL}/delete_module.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ moduleId: moduleId })
            });

            const data = await response.json();
            if (!response.ok || (data && data.error)) {
                throw new Error(data && data.error ? data.error : 'Failed to delete module from database');
            }
            return data;
        } catch (error) {
            console.error('Error deleting module from backend:', error);
            throw error;
        }
    }

    async function deleteModuleAndRefresh(moduleName) {
        if (!confirm(`Delete the module "${moduleName}" and all of its files?`)) {
            return;
        }
        try {
            const module = signedModules.find(m => m.name === moduleName);
            if (!module) return;

            // Delete from SQL database if moduleId exists
            if (module.moduleId) {
                await deleteModuleFromBackend(module.moduleId);
            }

            // Also delete files from IndexedDB if they exist there
            if (module.files && module.files.length > 0) {
                await Promise.all(module.files.map(file => deleteFile(file.id)));
            }

            await refreshSignedModules();
        } catch (error) {
            console.error('Error deleting module:', error);
            showWarning('Failed to delete module.');
        }
    }

    async function fetchFilesForModule(moduleId) {
        if (!moduleId) {
            return [];
        }

        try {
            const res = await fetch(`${API_BASE_URL}/list_module_files.php?moduleId=${moduleId}`);
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error('Failed to fetch files for module:', res.status, errorText);
                return [];
            }

            const data = await res.json();
            
            // Check if response is successful and has files array
            if (data && data.success === true && Array.isArray(data.files)) {
                return data.files.map(f => ({
                    id: f.FileUUID || f.FileID || f.id,
                    fileName: f.OriginalFilename || f.FileName || f.fileName || '',
                    size: f.FileSize || f.size || 0,
                    createdAt: f.CreatedAt || f.createdAt || new Date().toISOString(),
                    fileType: f.FileType || f.fileType || ''
                })).filter(f => f.fileName); // Filter out files without names
            } else if (data && data.error) {
                console.error('API returned error:', data.error);
                return [];
            } else {
                // No files is not an error, just return empty array
                return [];
            }
        } catch (error) {
            console.error('Error fetching files for module:', error);
            return [];
        }
    }

    async function refreshSignedModules() {
        // Charger les modules depuis MySQL (comme signup charge les users)
        const creatorUserId = localStorage.getItem('currentUserId');
        if (!creatorUserId) {
            signedModules = [];
            renderSignedModules();
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/list_student_modules.php?creatorUserId=${creatorUserId}`);
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error('Failed to fetch modules:', res.status, errorText);
                signedModules = [];
                renderSignedModules();
                return;
            }

            let data = null;
            try {
                data = await res.json();
            } catch (jsonErr) {
                console.error('Failed to parse modules list JSON:', jsonErr);
                signedModules = [];
                renderSignedModules();
                return;
            }

            // Check if response is successful and has modules array
            if (data && data.success === true && Array.isArray(data.modules)) {
                // Convertir les modules de la DB en format attendu et charger les fichiers
                signedModules = await Promise.all(data.modules.map(async (m) => {
                    const moduleId = m.ModuleID || m.moduleId;
                    const moduleName = m.ModuleName || m.name || '';
                    
                    if (!moduleId || !moduleName) {
                        console.warn('Invalid module data:', m);
                        return null;
                    }
                    
                    const files = await fetchFilesForModule(moduleId);
                    return {
                        name: moduleName,
                        moduleId: moduleId,
                        files: files || []
                    };
                }));
                
                // Filter out any null modules
                signedModules = signedModules.filter(m => m !== null);
            } else if (data && data.error) {
                console.error('API returned error:', data.error);
                signedModules = [];
            } else {
                console.warn('Unexpected response format or no modules:', data);
                signedModules = [];
            }
        } catch (e) {
            console.error('Error loading modules:', e);
            signedModules = [];
        }

        renderSignedModules();
    }

    if (validateModulesBtn) {
        console.log('Validate button found, ID:', validateModulesBtn.id);
        validateModulesBtn.addEventListener('click', async () => {
            // Si il y a un module name, le sauvegarder dans la table modules
            if (currentModule.name && currentModule.name.trim() !== '') {
                try {
                    const creatorUserId = localStorage.getItem('currentUserId');
                    if (!creatorUserId) {
                        window.location.href = 'student-login.html';
                        return;
                    }

                    // Sauvegarder juste le nom du module (EXACTEMENT comme signup)
                    const result = await saveModuleNameToBackend(currentModule.name, creatorUserId);
                    
                    // Réinitialiser le formulaire
                    resetCurrentModule();
                    
                    // Attendre un peu avant de rediriger
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error('Failed to save module:', error);
                    showWarning('Failed to save module. Please try again.');
                    return; // Ne pas rediriger si la sauvegarde échoue
                }
            }

            // Vérifier qu'on a au moins un module sauvegardé
            if (signedModules.length === 0 && (!currentModule.name || currentModule.files.length === 0)) {
                showWarning('Create at least one module before validating.');
                return;
            }

            // Rediriger vers le dashboard
            window.location.href = 'student-dashboard.html';
        });
    }

    renderCurrentModuleFiles();
    refreshSignedModules();
    
    // Forcer l'activation du bouton "Validate All Modules" au chargement si on a déjà un module en cours
    if (validateModulesBtn) {
        const hasCurrentModule = currentModule.name && currentModule.files.length > 0;
        if (hasCurrentModule) {
            validateModulesBtn.disabled = false;
        }
    }
});
