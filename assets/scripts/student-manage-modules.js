document.addEventListener('DOMContentLoaded', () => {
    const modulesList = document.getElementById('manage-modules-list');
    const backBtn = document.getElementById('back-to-dashboard-btn');
    const createModuleBtn = document.getElementById('create-new-module-btn');
    const fileInput = document.getElementById('manage-module-file-input');

    const currentUserEmail = localStorage.getItem('currentUserEmail');
    if (!currentUserEmail) {
        window.location.href = 'student-login.html';
        return;
    }

    let moduleStates = {};
    let pendingUploadTarget = null;

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'student-dashboard.html';
        });
    }

    if (createModuleBtn) {
        createModuleBtn.addEventListener('click', () => {
            window.location.href = 'student-create-module.html';
        });
    }

    fileInput.addEventListener('change', async (event) => {
        if (!pendingUploadTarget || !event.target.files.length) {
            pendingUploadTarget = null;
            return;
        }
        await addFilesToModule(pendingUploadTarget, event.target.files);
        pendingUploadTarget = null;
        fileInput.value = '';
    });

    async function addFilesToModule(moduleName, files) {
        try {
            await Promise.all(Array.from(files).map(file => saveStudentFile({
                email: currentUserEmail,
                moduleName,
                fileName: file.name,
                fileBlob: file,
                createdAt: new Date(),
                size: file.size
            })));
            await refreshModules();
        } catch (error) {
            console.error('Failed to add files to module:', error);
        }
    }

    async function removeFile(fileId) {
        if (!confirm('Remove this file from the module?')) return;
        try {
            await deleteFile(parseInt(fileId, 10));
            await refreshModules();
        } catch (error) {
            console.error('Failed to delete file:', error);
        }
    }

    async function deleteModule(module) {
        if (!confirm(`Delete the module "${module.name}" and all of its files?`)) return;
        try {
            await Promise.all(module.files.map(file => deleteFile(file.id)));
            await refreshModules();
        } catch (error) {
            console.error('Failed to delete module:', error);
        }
    }

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

    function getFileBadgeLabel(fileName) {
        const ext = fileName.includes('.') ? fileName.split('.').pop().toUpperCase() : 'FILE';
        return ext.slice(0, 4);
    }

    function formatFileSize(bytes) {
        if (!bytes) return '0 KB';
        const units = ['bytes', 'KB', 'MB', 'GB'];
        const index = Math.floor(Math.log(bytes) / Math.log(1024));
        const value = bytes / Math.pow(1024, index);
        return `${value.toFixed(1)} ${units[index]}`;
    }

    function renderModules(modules) {
        modulesList.innerHTML = '';
        if (modules.length === 0) {
            modulesList.classList.add('empty-state');
            modulesList.innerHTML = '<p>No modules yet. Create one to get started.</p>';
            return;
        }

        modulesList.classList.remove('empty-state');
        const knownModules = new Set(modules.map(m => m.name));
        Object.keys(moduleStates).forEach(name => {
            if (!knownModules.has(name)) delete moduleStates[name];
        });

        modules.forEach(module => {
            modulesList.appendChild(createModuleCard(module));
        });
    }

    function createModuleCard(module) {
        const isOpen = !!moduleStates[module.name];
        const card = document.createElement('article');
        card.className = 'manage-module-card';
        if (isOpen) {
            card.classList.add('open');
        }

        const headerBtn = document.createElement('button');
        headerBtn.type = 'button';
        headerBtn.className = 'manage-module-card__header';
        const latestFile = module.files.reduce((latest, file) => {
            if (!latest) return file;
            return new Date(file.createdAt) > new Date(latest.createdAt) ? file : latest;
        }, null);
        const metaText = `${module.files.length} ${module.files.length === 1 ? 'file' : 'files'}${latestFile ? ` • Updated ${new Date(latestFile.createdAt).toLocaleDateString()}` : ''}`;
        headerBtn.innerHTML = `
            <div>
                <h2>${module.name}</h2>
                <p class="manage-module-meta">${metaText}</p>
            </div>
            <span class="manage-module-chevron">${isOpen ? '▲' : '▼'}</span>
        `;
        headerBtn.addEventListener('click', () => toggleCard(card, module.name));

        const body = document.createElement('div');
        body.className = 'manage-module-card__body';

        const fileList = document.createElement('ul');
        fileList.className = 'manage-file-list';
        module.files.forEach(file => {
            const item = document.createElement('li');
            item.className = 'manage-file-item';

            const details = document.createElement('div');
            details.className = 'manage-file-details';

            const badge = document.createElement('span');
            badge.className = 'file-badge';
            badge.textContent = getFileBadgeLabel(file.fileName);

            const info = document.createElement('div');
            info.innerHTML = `
                <p class="manage-file-name">${file.fileName}</p>
                <p class="manage-file-meta">${formatFileSize(file.size)}</p>
            `;

            details.append(badge, info);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'ghost-btn';
            removeBtn.type = 'button';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                removeFile(file.id);
            });

            item.append(details, removeBtn);
            fileList.appendChild(item);
        });

        const actions = document.createElement('div');
        actions.className = 'manage-card-actions';

        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'link-btn';
        uploadBtn.textContent = 'Upload More Files';
        uploadBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            pendingUploadTarget = module.name;
            fileInput.click();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'danger-btn';
        deleteBtn.textContent = 'Delete Module';
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteModule(module);
        });

        actions.append(uploadBtn, deleteBtn);
        body.append(fileList, actions);

        body.addEventListener('dragover', (event) => {
            event.preventDefault();
            body.classList.add('drop-ready');
        });
        body.addEventListener('dragleave', () => body.classList.remove('drop-ready'));
        body.addEventListener('drop', (event) => {
            event.preventDefault();
            body.classList.remove('drop-ready');
            addFilesToModule(module.name, event.dataTransfer.files);
        });

        card.append(headerBtn, body);
        requestAnimationFrame(() => setBodyHeight(body, isOpen));
        return card;
    }

    function setBodyHeight(body, isOpen) {
        if (!body) return;
        if (isOpen) {
            body.style.maxHeight = `${Math.ceil(body.scrollHeight * 1.1)}px`;
        } else {
            body.style.maxHeight = '0px';
        }
    }

    function toggleCard(card, moduleName) {
        const body = card.querySelector('.manage-module-card__body');
        const chevron = card.querySelector('.manage-module-chevron');
        const isOpen = card.classList.toggle('open');
        moduleStates[moduleName] = isOpen;
        if (chevron) {
            chevron.textContent = isOpen ? '▲' : '▼';
        }
        requestAnimationFrame(() => setBodyHeight(body, isOpen));
    }

    async function refreshModules() {
        await openDB();
        const files = await getAllFilesByEmail(currentUserEmail);
        const modules = groupFilesByModule(files);
        renderModules(modules);
    }

    refreshModules();
});

