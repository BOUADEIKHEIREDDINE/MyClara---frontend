document.addEventListener('DOMContentLoaded', async () => {
    const moduleList = document.getElementById('module-list');
    const addModuleBtn = document.getElementById('add-module-btn');
    const modifyModulesBtn = document.getElementById('modify-modules-btn');
    const mainContentDefault = document.getElementById('main-content-default');
    const mainContentModule = document.getElementById('main-content-module');
    const moduleContentTitle = document.getElementById('module-content-title');
    const learningModeBtns = document.querySelectorAll('.learning-mode-btn');
    const aiChatBtn = document.getElementById('ai-chat-btn');
    const exercisesBtn = document.getElementById('exercises-btn');
    const lessonSchematiserBtn = document.getElementById('lesson-schematiser-btn');

    let selectedModule = null;
    const currentUserEmail = localStorage.getItem('currentUserEmail');

    if (!currentUserEmail) {
        console.error("No current user email found in localStorage. Redirecting to login.");
        window.location.href = 'teacher-login.html';
        return;
    }

    const NEW_MODULE_KEY = 'teacherNewlyCreatedClassName';

    // Function to update main content area
    function updateMainContent() {
        if (selectedModule) {
            mainContentDefault.style.display = 'none';
            mainContentModule.style.display = 'flex'; // Use flex for centering module content
            moduleContentTitle.textContent = selectedModule.dataset.moduleName;
        } else {
            mainContentDefault.style.display = 'flex';
            mainContentModule.style.display = 'none';
        }
    }

    // Function to enable/disable learning mode buttons
    function toggleLearningModeButtons(enable) {
        learningModeBtns.forEach(button => {
            button.disabled = !enable;
        });
    }

    // Function to display modules in the sidebar
    async function displayModules() {
        moduleList.innerHTML = '';
        await openDB(); // Ensure DB is open before fetching
        const files = await getAllFilesByEmail(currentUserEmail);

        // Group files by module name
        const modules = {};
        files.forEach(file => {
            if (!modules[file.moduleName]) {
                modules[file.moduleName] = { name: file.moduleName, files: [] };
            }
            modules[file.moduleName].files.push(file);
        });

        if (Object.keys(modules).length === 0) {
            moduleList.innerHTML = '<p style="text-align: center; color: #858596; padding: 20px;">No classes created yet.</p>';
            return;
        }

        let newlyCreatedModuleName = localStorage.getItem(NEW_MODULE_KEY);

        for (const moduleName in modules) {
            const moduleFiles = modules[moduleName].files;
            const li = document.createElement('li');
            li.classList.add('module-item');
            li.dataset.moduleName = moduleName; // Store module name for selection
            li.innerHTML = `
                <div class="module-text">
                    <img src="assets/icons/module.svg" alt="Module Icon" class="module-icon">
                    <span class="module-name">${moduleName}</span>
                </div>
            `;
            moduleList.appendChild(li);

            // Automatically select the newly created module if it exists
            if (newlyCreatedModuleName && moduleName === newlyCreatedModuleName) {
                li.classList.add('active');
                selectedModule = li; // Set this module as selected
                localStorage.removeItem(NEW_MODULE_KEY); // Clear after selection
            }

            li.addEventListener('click', () => {
                // Remove active class from all other modules
                moduleList.querySelectorAll('.module-item').forEach(mod => mod.classList.remove('active'));
                // Add active class to the clicked module
                li.classList.add('active');
                selectedModule = li;
                console.log(`Class selected: ${selectedModule.dataset.moduleName}`);
                updateMainContent();
                toggleLearningModeButtons(true);
            });
        }
        // After all modules are displayed and potentially one is selected, update content
        updateMainContent();
        toggleLearningModeButtons(selectedModule !== null); // Enable buttons if a module is selected
    }

    // Event listener for Add Class button
    if (addModuleBtn) {
        addModuleBtn.addEventListener('click', () => {
            window.location.href = 'teacher-create-class.html';
        });
    }

    if (modifyModulesBtn) {
        modifyModulesBtn.addEventListener('click', () => {
            window.location.href = 'teacher-manage-modules.html';
        });
    }

    // Event listeners for learning mode buttons (placeholder)
    if (aiChatBtn) {
        aiChatBtn.addEventListener('click', () => {
            console.log("AI Chatbot selected");
        });
    }

    if (exercisesBtn) {
        exercisesBtn.addEventListener('click', () => {
            console.log("Exercises selected");
        });
    }

    if (lessonSchematiserBtn) {
        lessonSchematiserBtn.addEventListener('click', () => {
            console.log("Lesson Schematiser selected");
        });
    }

    // Initial setup when page loads
    displayModules();
});
