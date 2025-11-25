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
        finishModuleBtn.disabled = !(currentModule.name && currentModule.files.length);
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
    }

    async function addFilesToExistingModule(moduleName, fileList) {
        if (!moduleName || !fileList.length) {
            return;
        }
        try {
            await Promise.all(Array.from(fileList).map(file => saveStudentFile({
                email: currentUserEmail,
                moduleName,
                fileName: file.name,
                fileBlob: file,
                createdAt: new Date(),
                size: file.size
            })));
            await refreshSignedModules();
        } catch (error) {
            console.error('Error adding files to module:', error);
            alert('Failed to add files to this module.');
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
    async function persistCurrentModule() {
        if (!currentModule.name || currentModule.files.length === 0) {
            showWarning('Provide a module name and at least one file.');
            return;
        }
        finishModuleBtn.disabled = true;

        try {
            const saveOperations = currentModule.files.map(file => saveStudentFile({
                email: currentUserEmail,
                moduleName: currentModule.name,
                fileName: file.name,
                fileBlob: file,
                createdAt: new Date(),
                size: file.size
            }));
            await Promise.all(saveOperations);
            localStorage.setItem('newlyCreatedModuleName', currentModule.name);
            resetCurrentModule();
            await refreshSignedModules();
        } catch (error) {
            console.error('Error saving module files:', error);
            alert('Failed to save module files. Please try again.');
            finishModuleBtn.disabled = false;
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

    finishModuleBtn.addEventListener('click', persistCurrentModule);

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
            validateModulesBtn.disabled = true;
            return;
        }

        modulesList.classList.remove('empty-state');
        signedModules.forEach(module => {
            modulesList.appendChild(createModuleCard(module));
        });
        validateModulesBtn.disabled = false;
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
                <p class="module-file-meta">${formatFileSize(file.size)}</p>
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
            await deleteFile(parseInt(fileId, 10));
            await refreshSignedModules();
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Failed to delete file.');
        }
    }

    async function deleteModuleAndRefresh(moduleName) {
        if (!confirm(`Delete the module "${moduleName}" and all of its files?`)) {
            return;
        }
        try {
            const module = signedModules.find(m => m.name === moduleName);
            if (!module) return;
            await Promise.all(module.files.map(file => deleteFile(file.id)));
            await refreshSignedModules();
        } catch (error) {
            console.error('Error deleting module:', error);
            alert('Failed to delete module.');
        }
    }

    async function refreshSignedModules() {
        const files = await getAllFilesByEmail(currentUserEmail);
        signedModules = groupFilesByModule(files);
        renderSignedModules();
    }

    if (validateModulesBtn) {
        validateModulesBtn.addEventListener('click', () => {
            if (currentModule.files.length) {
                showWarning('Finish the module you are working on before validating.');
                return;
            }
            if (signedModules.length === 0) {
                showWarning('Create at least one module before validating.');
                return;
            }
            window.location.href = 'student-dashboard.html';
        });
    }

    renderCurrentModuleFiles();
    refreshSignedModules();
});
