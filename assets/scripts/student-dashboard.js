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

    const API_BASE_URL = 'http://localhost/myclara-api';
    const RAG_API_BASE_URL = 'http://localhost:8000'; // RAG API base URL

    let selectedModule = null;
    const currentUserEmail = localStorage.getItem('currentUserEmail');
    let currentUserId = localStorage.getItem('currentUserId');
    let isDisplayingModules = false; // Flag to prevent concurrent calls
    let claraClient = null; // Clara API client instance
    let chatInterface = null; // Chat interface instance
    let exercisesInterface = null; // Exercises interface instance
    let revisionInterface = null; // Revision interface instance

    if (!currentUserEmail) {
        console.error("No current user email found in localStorage. Redirecting to login.");
        window.location.href = 'student-login.html';
        return;
    }

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

    // Function to fetch modules from SQL database - BOTH student-created AND teacher-imported
    // Merges modules created by student with modules imported from teachers
    async function fetchModulesFromSQL() {
        // Always get fresh currentUserId from localStorage
        const userId = localStorage.getItem('currentUserId');
        
        if (!userId) {
            return [];
        }

        // Convert to integer to ensure proper matching
        const userIdInt = parseInt(userId, 10);
        if (isNaN(userIdInt)) {
            return [];
        }

        try {
            // Fetch student's own modules (created by student)
            const studentModulesUrl = `${API_BASE_URL}/list_student_modules.php?creatorUserId=${userIdInt}`;
            
            const studentRes = await fetch(studentModulesUrl);
            let studentModules = [];
            
            if (studentRes.ok) {
                const studentData = await studentRes.json();
                if (studentData && studentData.success && Array.isArray(studentData.modules)) {
                    studentModules = studentData.modules.map(m => ({
                        moduleId: m.ModuleID || m.moduleId,
                        name: m.ModuleName || m.name || '',
                        isImported: false // Mark as student-created
                    })).filter(m => m.name && m.moduleId);
                }
            }

            // Fetch teacher modules (imported via enrollment code)
            const teacherModulesUrl = `${API_BASE_URL}/import_teacher_modules.php?studentId=${userIdInt}`;
            
            const teacherRes = await fetch(teacherModulesUrl);
            let teacherModules = [];
            
            if (teacherRes.ok) {
                const teacherData = await teacherRes.json();
                if (teacherData && teacherData.success && Array.isArray(teacherData.modules)) {
                    teacherModules = teacherData.modules.map(m => ({
                        moduleId: m.moduleId || m.ModuleID,
                        name: m.name || m.ModuleName || '',
                        isImported: true // Mark as imported from teacher
                    })).filter(m => m.name && m.moduleId);
                }
            }

            // Merge modules: combine both sources, avoiding duplicates by module name
            const mergedModules = [];
            const moduleNamesSeen = new Set();

            // Add student modules first
            studentModules.forEach(module => {
                if (!moduleNamesSeen.has(module.name)) {
                    mergedModules.push(module);
                    moduleNamesSeen.add(module.name);
                }
            });

            // Add teacher modules (skip if name already exists)
            teacherModules.forEach(module => {
                if (!moduleNamesSeen.has(module.name)) {
                    mergedModules.push(module);
                    moduleNamesSeen.add(module.name);
                }
            });

            return mergedModules;

        } catch (error) {
            console.error('Error fetching modules:', error);
            return [];
        }
    }

    // Function to display modules in the sidebar
    async function displayModules() {
        // Prevent concurrent calls
        if (isDisplayingModules) {
            return;
        }
        
        isDisplayingModules = true;
        
        try {
            // Verify moduleList element exists
            if (!moduleList) {
                return;
            }
            
            // Only clear if we're going to rebuild
            moduleList.innerHTML = '';
            
            // Fetch modules from SQL database
            const modules = await fetchModulesFromSQL();

            if (!modules || modules.length === 0) {
                moduleList.innerHTML = '<p style="text-align: center; color: #858596; padding: 20px;">No modules created yet.</p>';
                updateMainContent();
                toggleLearningModeButtons(false);
                return;
            }

            // Remove duplicates by moduleId (more reliable than name)
            const uniqueModules = [];
            const seenModuleIds = new Set();
            modules.forEach(module => {
                if (module.moduleId && !seenModuleIds.has(module.moduleId)) {
                    uniqueModules.push(module);
                    seenModuleIds.add(module.moduleId);
                }
            });

            let newlyCreatedModuleName = localStorage.getItem('newlyCreatedModuleName');

            // Display each module - ensure we don't add duplicates
            const addedModuleIds = new Set();
            uniqueModules.forEach((module, index) => {
                // Double-check: don't add if already in DOM (shouldn't happen after innerHTML = '', but just in case)
                if (addedModuleIds.has(module.moduleId)) {
                    return;
                }
                
                const li = document.createElement('li');
                li.classList.add('module-item');
                li.dataset.moduleName = module.name; // Store module name for selection
                li.dataset.moduleId = module.moduleId; // Store module ID
                li.innerHTML = `
                    <div class="module-text">
                        <img src="assets/icons/module.svg" alt="Module Icon" class="module-icon">
                        <span class="module-name">${module.name}</span>
                    </div>
                `;
                moduleList.appendChild(li);
                addedModuleIds.add(module.moduleId);

            // Automatically select the newly created module if it exists
            if (newlyCreatedModuleName && module.name === newlyCreatedModuleName) {
                li.classList.add('active');
                selectedModule = li; // Set this module as selected
                localStorage.removeItem('newlyCreatedModuleName'); // Clear after selection
            }

            li.addEventListener('click', () => {
                // Remove active class from all other modules
                moduleList.querySelectorAll('.module-item').forEach(mod => mod.classList.remove('active'));
                // Add active class to the clicked module
                li.classList.add('active');
                selectedModule = li;
                updateMainContent();
                toggleLearningModeButtons(true);
            });
        });

            // After all modules are displayed and potentially one is selected, update content
            updateMainContent();
            toggleLearningModeButtons(selectedModule !== null); // Enable buttons if a module is selected
        } finally {
            // Always reset the flag, even if there was an error
            isDisplayingModules = false;
        }
    }

    // Event listener for Add Module button
    if (addModuleBtn) {
        addModuleBtn.addEventListener('click', () => {
            window.location.href = 'student-create-module.html';
        });
    }

    if (modifyModulesBtn) {
        modifyModulesBtn.addEventListener('click', () => {
            window.location.href = 'student-manage-modules.html';
        });
    }

    // Initialize Clara Client
    function initializeClaraClient() {
        if (!claraClient) {
            claraClient = new ClaraClient(RAG_API_BASE_URL);
        }
        return claraClient;
    }

    // Event listeners for learning mode buttons
    if (aiChatBtn) {
        aiChatBtn.addEventListener('click', () => {
            if (!selectedModule) {
                console.warn("Please select a module first");
                alert("Please select a module from the sidebar first.");
                return;
            }

            // Initialize Clara client if not already initialized
            const client = initializeClaraClient();
            
            // Get module name
            const moduleName = selectedModule.dataset.moduleName || 'Module';
            
            // Close existing interfaces if open
            if (chatInterface && chatInterface.isOpen) {
                chatInterface.close();
            }
            if (exercisesInterface && exercisesInterface.isOpen) {
                exercisesInterface.close();
            }
            if (revisionInterface && revisionInterface.isOpen) {
                revisionInterface.close();
            }
            
            // Create and open new chat interface
            chatInterface = new ChatInterface(client, moduleName);
            chatInterface.open();
        });
    }

    if (exercisesBtn) {
        exercisesBtn.addEventListener('click', () => {
            if (!selectedModule) {
                console.warn("Please select a module first");
                alert("Please select a module from the sidebar first.");
                return;
            }

            // Initialize Clara client if not already initialized
            const client = initializeClaraClient();
            
            // Get module name
            const moduleName = selectedModule.dataset.moduleName || 'Module';
            
            // Close existing interfaces if open
            if (chatInterface && chatInterface.isOpen) {
                chatInterface.close();
            }
            if (exercisesInterface && exercisesInterface.isOpen) {
                exercisesInterface.close();
            }
            if (revisionInterface && revisionInterface.isOpen) {
                revisionInterface.close();
            }
            
            // Create and open new exercises interface
            exercisesInterface = new ExercisesInterface(client, moduleName);
            exercisesInterface.open();
        });
    }

    if (lessonSchematiserBtn) {
        lessonSchematiserBtn.addEventListener('click', () => {
            if (!selectedModule) {
                console.warn("Please select a module first");
                alert("Please select a module from the sidebar first.");
                return;
            }

            // Initialize Clara client if not already initialized
            const client = initializeClaraClient();
            
            // Get module name
            const moduleName = selectedModule.dataset.moduleName || 'Module';
            
            // Close existing interfaces if open
            if (chatInterface && chatInterface.isOpen) {
                chatInterface.close();
            }
            if (exercisesInterface && exercisesInterface.isOpen) {
                exercisesInterface.close();
            }
            if (revisionInterface && revisionInterface.isOpen) {
                revisionInterface.close();
            }
            
            // Create and open new revision interface
            revisionInterface = new RevisionInterface(client, moduleName);
            revisionInterface.open();
        });
    }

    // Function to refresh modules (useful when returning from other pages)
    // Only call this manually when needed, not automatically
    function refreshModules() {
        // Only refresh if not already displaying
        if (isDisplayingModules) {
            return;
        }
        
        // Re-fetch currentUserId in case it was updated
        const updatedUserId = localStorage.getItem('currentUserId');
        if (updatedUserId && updatedUserId !== currentUserId) {
            // Update the currentUserId if it changed
            currentUserId = updatedUserId;
        }
        displayModules();
    }

    // REMOVED automatic refresh on visibilitychange and focus
    // These were causing modules to reload every few seconds
    // Modules will only load once on page load
    // If refresh is needed, it should be done manually (e.g., after creating a module)

    // Initial setup when page loads
    displayModules();
});
