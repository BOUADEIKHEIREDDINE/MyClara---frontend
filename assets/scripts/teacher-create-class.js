document.addEventListener('DOMContentLoaded', () => {
    const teachingModuleInput = document.getElementById('teaching-module-name');
    const classNameInput = document.getElementById('class-name');
    const addStudentsBtn = document.getElementById('add-students-btn');
    const classDropzone = document.getElementById('module-dropzone');
    const classFileInput = document.getElementById('module-file-input');
    const finishClassBtn = document.getElementById('finish-class-btn');
    const classFilesList = document.getElementById('current-module-files');
    const classFileCount = document.getElementById('current-file-count');
    const classesList = document.getElementById('modules-list');
    const validateClassesBtn = document.getElementById('validate-modules-btn');
    const existingClassFileInput = document.getElementById('existing-module-file-input');

    const currentUserEmail = localStorage.getItem('currentUserEmail');
    if (!currentUserEmail) {
        console.error('No current user email found in localStorage. Redirecting to login.');
        window.location.href = 'teacher-login.html';
        return;
    }

    const CREATED_CLASS_KEY = 'teacherNewlyCreatedClassName';

    let currentClass = {
        teachingModule: '',
        name: '',
        files: []
    };
    let publishedClasses = [];
    let existingClassTarget = null;
    const classCardStates = {};

    function showWarning(message) {
        const existingWarning = document.querySelector('.warning-message');
        if (existingWarning) {
            existingWarning.remove();
        }
        const warningDiv = document.createElement('div');
        warningDiv.classList.add('warning-message');
        warningDiv.style.cssText = 'color: #c0392b; font-size: 0.9em; margin-top: 10px;';
        warningDiv.textContent = message;
        classNameInput.parentNode.insertBefore(warningDiv, classNameInput.nextSibling);
        setTimeout(() => warningDiv.remove(), 5000);
    }

    function updateCurrentClassDetails() {
        currentClass.teachingModule = teachingModuleInput.value.trim();
        currentClass.name = classNameInput.value.trim();
        finishClassBtn.disabled = !(currentClass.teachingModule && currentClass.name && currentClass.files.length);
    }

    teachingModuleInput.addEventListener('input', updateCurrentClassDetails);
    classNameInput.addEventListener('input', updateCurrentClassDetails);

    if (addStudentsBtn) {
        addStudentsBtn.addEventListener('click', () => {
            alert('Student enrollment is coming soon.');
        });
    }

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

    function renderCurrentClassFiles() {
        classFileCount.textContent = `${currentClass.files.length} ${currentClass.files.length === 1 ? 'file' : 'files'}`;
        if (currentClass.files.length === 0) {
            classFilesList.classList.add('empty-state');
            classFilesList.innerHTML = '<p>Add files to see them here.</p>';
            finishClassBtn.disabled = true;
            return;
        }

        classFilesList.classList.remove('empty-state');
        classFilesList.innerHTML = '';

        currentClass.files.forEach((file, index) => {
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
                currentClass.files.splice(index, 1);
                renderCurrentClassFiles();
                updateCurrentClassDetails();
            });
            chip.appendChild(removeBtn);
            classFilesList.appendChild(chip);
        });

        finishClassBtn.disabled = !(currentClass.teachingModule && currentClass.name);
    }

    function handleClassFiles(fileList) {
        if (!currentClass.teachingModule || !currentClass.name) {
            showWarning('Enter the teaching module and class name before adding files.');
            classFileInput.value = '';
            return;
        }
        currentClass.files.push(...Array.from(fileList));
        renderCurrentClassFiles();
        updateCurrentClassDetails();
        classFileInput.value = '';
    }

    classDropzone.addEventListener('click', () => classFileInput.click());

    classDropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        classDropzone.classList.add('drag-over');
    });

    classDropzone.addEventListener('dragleave', () => {
        classDropzone.classList.remove('drag-over');
    });

    classDropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        classDropzone.classList.remove('drag-over');
        if (event.dataTransfer.files.length) {
            handleClassFiles(event.dataTransfer.files);
        }
    });

    classFileInput.addEventListener('change', (event) => {
        if (event.target.files.length) {
            handleClassFiles(event.target.files);
        }
    });

    async function persistCurrentClass() {
        if (!currentClass.teachingModule || !currentClass.name || currentClass.files.length === 0) {
            showWarning('Provide a teaching module, class name, and at least one file.');
            return;
        }
        finishClassBtn.disabled = true;

        try {
            const saveOperations = currentClass.files.map(file => saveStudentFile({
                email: currentUserEmail,
                moduleName: currentClass.name,
                className: currentClass.name,
                teachingModule: currentClass.teachingModule,
                fileName: file.name,
                fileBlob: file,
                createdAt: new Date(),
                size: file.size
            }));
            await Promise.all(saveOperations);
            localStorage.setItem(CREATED_CLASS_KEY, currentClass.name);
            resetCurrentClass();
            await refreshPublishedClasses();
        } catch (error) {
            console.error('Error saving class files:', error);
            alert('Failed to save class files. Please try again.');
            finishClassBtn.disabled = false;
        }
    }

    function resetCurrentClass() {
        currentClass = { teachingModule: '', name: '', files: [] };
        teachingModuleInput.value = '';
        classNameInput.value = '';
        classFileCount.textContent = '0 files';
        classFilesList.classList.add('empty-state');
        classFilesList.innerHTML = '<p>Add files to see them here.</p>';
        finishClassBtn.disabled = true;
    }

    finishClassBtn.addEventListener('click', persistCurrentClass);

    function groupFilesByClass(files) {
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

    function renderPublishedClasses() {
        classesList.innerHTML = '';
        const classNames = new Set(publishedClasses.map(c => c.name));
        Object.keys(classCardStates).forEach(name => {
            if (!classNames.has(name)) {
                delete classCardStates[name];
            }
        });

        if (publishedClasses.length === 0) {
            classesList.classList.add('empty-state');
            classesList.innerHTML = '<p>No classes yet. Finish your first class to see it here.</p>';
            validateClassesBtn.disabled = true;
            return;
        }

        classesList.classList.remove('empty-state');
        publishedClasses.forEach(cls => {
            classesList.appendChild(createClassCard(cls));
        });
        validateClassesBtn.disabled = false;
    }

    function createClassCard(cls) {
        const isOpen = !!classCardStates[cls.name];
        const card = document.createElement('article');
        card.className = 'signed-module-card';
        if (isOpen) {
            card.classList.add('open');
        }

        const headerBtn = document.createElement('button');
        headerBtn.type = 'button';
        headerBtn.className = 'signed-module-card__header';
        const latestFile = cls.files.reduce((latest, file) => {
            if (!latest) return file;
            return new Date(file.createdAt) > new Date(latest.createdAt) ? file : latest;
        }, null);
        const teachingModule = cls.files[0]?.teachingModule || 'Untitled Module';
        const metaText = `${teachingModule} • ${cls.files.length} ${cls.files.length === 1 ? 'file' : 'files'}${latestFile ? ` • Updated ${new Date(latestFile.createdAt).toLocaleDateString()}` : ''}`;
        headerBtn.innerHTML = `
            <div>
                <p class="module-block-title">Class: ${cls.name}</p>
                <p class="module-block-subtitle">${metaText}</p>
            </div>
            <span class="module-card-chevron">${isOpen ? '▲' : '▼'}</span>
        `;
        headerBtn.addEventListener('click', () => toggleClassCard(cls.name, card));

        const body = document.createElement('div');
        body.className = 'signed-module-card__body';

        const fileList = document.createElement('div');
        fileList.className = 'module-block-files';

        cls.files.forEach(file => {
            const row = document.createElement('div');
            row.className = 'module-file-row';

            const icon = document.createElement('div');
            icon.className = 'file-type-icon';
            icon.textContent = getFileBadgeLabel(file.fileName);

            const info = document.createElement('div');
            info.className = 'module-file-info';
            info.innerHTML = `
                <p class="module-file-name">${file.fileName}</p>
                <p class="module-file-meta">${formatFileSize(file.size)} · ${new Date(file.createdAt).toLocaleDateString()}</p>
            `;

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
            row.append(icon, info, actions);
            fileList.appendChild(row);
        });

        const actionsRow = document.createElement('div');
        actionsRow.className = 'module-card-actions';

        const uploadLink = document.createElement('button');
        uploadLink.type = 'button';
        uploadLink.className = 'text-link-btn';
        uploadLink.textContent = 'Upload More Files';
        uploadLink.addEventListener('click', (event) => {
            event.stopPropagation();
            openExistingClassUploader(cls.name);
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'danger-btn';
        deleteButton.textContent = 'Delete Class';
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteClassAndRefresh(cls.name);
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
            addFilesToExistingClass(cls.name, event.dataTransfer.files);
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

    function toggleClassCard(className, card) {
        const body = card.querySelector('.signed-module-card__body');
        const chevron = card.querySelector('.module-card-chevron');
        const isOpen = card.classList.toggle('open');
        classCardStates[className] = isOpen;
        if (chevron) {
            chevron.textContent = isOpen ? '▲' : '▼';
        }
        requestAnimationFrame(() => {
            setBodyHeight(body, isOpen);
        });
    }

    function openExistingClassUploader(className) {
        existingClassTarget = className;
        existingClassFileInput.value = '';
        existingClassFileInput.click();
    }

    existingClassFileInput.addEventListener('change', async (event) => {
        if (!existingClassTarget || !event.target.files.length) {
            existingClassTarget = null;
            return;
        }
        await addFilesToExistingClass(existingClassTarget, event.target.files);
        existingClassTarget = null;
        existingClassFileInput.value = '';
    });

    async function addFilesToExistingClass(className, fileList) {
        if (!className || !fileList.length) {
            return;
        }
        const existing = publishedClasses.find(c => c.name === className);
        const teachingModule = existing?.files[0]?.teachingModule || currentClass.teachingModule || '';
        try {
            await Promise.all(Array.from(fileList).map(file => saveStudentFile({
                email: currentUserEmail,
                moduleName: className,
                className,
                teachingModule,
                fileName: file.name,
                fileBlob: file,
                createdAt: new Date(),
                size: file.size
            })));
            await refreshPublishedClasses();
        } catch (error) {
            console.error('Error adding files to class:', error);
            alert('Failed to add files to this class.');
        }
    }

    async function deleteSingleFile(fileId) {
        if (!confirm('Remove this file from the class?')) {
            return;
        }
        try {
            await deleteFile(parseInt(fileId, 10));
            await refreshPublishedClasses();
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Failed to delete file.');
        }
    }

    async function deleteClassAndRefresh(className) {
        if (!confirm(`Delete the class "${className}" and all of its files?`)) {
            return;
        }
        try {
            const cls = publishedClasses.find(c => c.name === className);
            if (!cls) return;
            await Promise.all(cls.files.map(file => deleteFile(file.id)));
            await refreshPublishedClasses();
        } catch (error) {
            console.error('Error deleting class:', error);
            alert('Failed to delete class.');
        }
    }

    async function refreshPublishedClasses() {
        const files = await getAllFilesByEmail(currentUserEmail);
        publishedClasses = groupFilesByClass(files);
        renderPublishedClasses();
    }

    if (validateClassesBtn) {
        validateClassesBtn.addEventListener('click', () => {
            if (currentClass.files.length) {
                showWarning('Finish the class you are working on before validating.');
                return;
            }
            if (publishedClasses.length === 0) {
                showWarning('Create at least one class before validating.');
                return;
            }
            window.location.href = 'teacher-dashboard.html';
        });
    }

    renderCurrentClassFiles();
    refreshPublishedClasses();
});

document.addEventListener('DOMContentLoaded', () => {
    // ===== Backend API config (XAMPP / PHP) =====
    // Adjust this URL to match your local API folder, e.g. http://localhost/myclara-api
    const API_BASE_URL = 'http://localhost/myclara-api';
    // Flip this flag to false if you want to fall back to the old IndexedDB-only behaviour
    const USE_BACKEND_API_FOR_MODULES = true;

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
        window.location.href = 'teacher-login.html';
        return;
    }

    const CREATED_MODULE_KEY = 'teacherNewlyCreatedModuleName';

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

    // ===== Helper: upload a module and its files to the PHP backend =====
    async function uploadModuleToBackend(module, creatorUserId) {
        if (!API_BASE_URL) {
            throw new Error('API_BASE_URL is not configured');
        }

        const formData = new FormData();
        formData.append('moduleName', module.name);
        formData.append('creatorUserId', creatorUserId || '');
        // Optionally: add description or other metadata later

        module.files.forEach((file) => {
            // The backend can read this as $_FILES['files']['name'][i] ...
            formData.append('files[]', file);
        });

        const response = await fetch(`${API_BASE_URL}/create_module_with_files.php`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json().catch(() => ({}));
        if (data.error) {
            throw new Error(data.error);
        }

        // Expect something like { success: true, moduleId: 123 }
        return data;
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
            if (USE_BACKEND_API_FOR_MODULES) {
                // New path: send module + files to the PHP backend (MySQL)
                const creatorUserId = localStorage.getItem('currentUserId');
                await uploadModuleToBackend(currentModule, creatorUserId);
            } else {
                // Legacy path: keep saving in IndexedDB only
                const saveOperations = currentModule.files.map(file => saveStudentFile({
                    email: currentUserEmail,
                    moduleName: currentModule.name,
                    fileName: file.name,
                    fileBlob: file,
                    createdAt: new Date(),
                    size: file.size
                }));
                await Promise.all(saveOperations);
            }
            localStorage.setItem(CREATED_MODULE_KEY, currentModule.name);
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
            window.location.href = 'teacher-dashboard.html';
        });
    }

    renderCurrentModuleFiles();
    refreshSignedModules();
});
