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

    let selectedModule = null;
    const currentUserEmail = localStorage.getItem('currentUserEmail');
    let currentUserId = localStorage.getItem('currentUserId');
    let isDisplayingModules = false; // Flag to prevent concurrent calls
    
    // Debug: Show current user info on page
    function initDebugPanel() {
        showDebugInfo('🚀 Dashboard loaded');
        showDebugInfo(`👤 User ID: ${currentUserId || 'NOT SET'}`);
        showDebugInfo(`📧 Email: ${currentUserEmail || 'NOT SET'}`);
        
        // Verify currentUserId is set and is a number
        if (currentUserId) {
            const userIdNum = parseInt(currentUserId, 10);
            if (isNaN(userIdNum)) {
                showDebugInfo(`⚠ WARNING: UserID is not a number! Value: ${currentUserId}`, 'error');
            } else {
                showDebugInfo(`✅ UserID is valid: ${userIdNum}`, 'success');
                showDebugInfo(`Will query: WHERE CreatorUserID = ${userIdNum}`);
            }
        } else {
            showDebugInfo('❌ UserID not found in localStorage!', 'error');
        }
    }
    
    initDebugPanel();

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

    // Function to show debug info on page (alternative to console)
    function showDebugInfo(message, type = 'info') {
        let debugDiv = document.getElementById('debug-info');
        if (!debugDiv) {
            debugDiv = document.createElement('div');
            debugDiv.id = 'debug-info';
            debugDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #1a1a1a; color: #fff; padding: 15px; border-radius: 5px; max-width: 400px; max-height: 80vh; overflow-y: auto; z-index: 10000; font-family: monospace; font-size: 12px; border: 2px solid #61afef;';
            document.body.appendChild(debugDiv);
        }
        const color = type === 'error' ? '#ff6b6b' : type === 'success' ? '#51cf66' : '#61afef';
        const p = document.createElement('p');
        p.style.cssText = `margin: 5px 0; color: ${color};`;
        p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        debugDiv.appendChild(p);
        // Keep only last 20 messages
        while (debugDiv.children.length > 20) {
            debugDiv.removeChild(debugDiv.firstChild);
        }
    }

    // Function to fetch modules from SQL database - BOTH student-created AND teacher-imported
    // Merges modules created by student with modules imported from teachers
    async function fetchModulesFromSQL() {
        // Always get fresh currentUserId from localStorage
        const userId = localStorage.getItem('currentUserId');
        
        if (!userId) {
            showDebugInfo('❌ No currentUserId found in localStorage', 'error');
            showDebugInfo('Please login again', 'error');
            return [];
        }

        // Convert to integer to ensure proper matching
        const userIdInt = parseInt(userId, 10);
        if (isNaN(userIdInt)) {
            showDebugInfo(`❌ Invalid UserID format: ${userId}`, 'error');
            return [];
        }

        showDebugInfo(`🔍 Fetching modules for UserID: ${userIdInt}`);

        try {
            // Fetch student's own modules (created by student)
            const studentModulesUrl = `${API_BASE_URL}/list_student_modules.php?creatorUserId=${userIdInt}`;
            showDebugInfo(`📡 Fetching student modules: ${studentModulesUrl}`);
            
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
                    showDebugInfo(`✅ Found ${studentModules.length} student-created modules`, 'success');
                }
            }

            // Fetch teacher modules (imported via enrollment code)
            const teacherModulesUrl = `${API_BASE_URL}/import_teacher_modules.php?studentId=${userIdInt}`;
            showDebugInfo(`📡 Fetching teacher modules: ${teacherModulesUrl}`);
            
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
                    showDebugInfo(`✅ Found ${teacherModules.length} teacher-imported modules`, 'success');
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

            showDebugInfo(`✅ Merged total: ${mergedModules.length} modules (${studentModules.length} student + ${teacherModules.length} teacher)`, 'success');
            return mergedModules;

        } catch (error) {
            showDebugInfo(`❌ Network error: ${error.message}`, 'error');
            return [];
        }
    }

    // Function to display modules in the sidebar
    async function displayModules() {
        // Prevent concurrent calls
        if (isDisplayingModules) {
            showDebugInfo('⏸️ displayModules() already in progress, skipping...');
            return;
        }
        
        isDisplayingModules = true;
        showDebugInfo('=== displayModules() called ===');
        
        try {
            // Verify moduleList element exists
            if (!moduleList) {
                showDebugInfo('❌ ERROR: moduleList element not found!', 'error');
                showDebugInfo('Looking for element with id="module-list"', 'error');
                return;
            }
            
            // Clear existing modules first - this prevents duplicates
            const existingModuleIds = new Set();
            moduleList.querySelectorAll('.module-item').forEach(item => {
                const moduleId = item.dataset.moduleId;
                if (moduleId) {
                    existingModuleIds.add(moduleId);
                }
            });
            
            // Only clear if we're going to rebuild
            moduleList.innerHTML = '';
            
            // Fetch modules from SQL database
            const modules = await fetchModulesFromSQL();
            
            showDebugInfo(`📦 Received ${modules.length} modules from fetch`);

            if (!modules || modules.length === 0) {
                showDebugInfo('⚠ No modules found - showing empty state', 'error');
                moduleList.innerHTML = '<p style="text-align: center; color: #858596; padding: 20px;">No modules created yet.</p>';
                updateMainContent();
                toggleLearningModeButtons(false);
                return;
            }
            
            showDebugInfo(`🎨 Displaying ${modules.length} modules in sidebar`, 'success');

            // Remove duplicates by moduleId (more reliable than name)
            const uniqueModules = [];
            const seenModuleIds = new Set();
            modules.forEach(module => {
                if (module.moduleId && !seenModuleIds.has(module.moduleId)) {
                    uniqueModules.push(module);
                    seenModuleIds.add(module.moduleId);
                }
            });

            showDebugInfo(`🔍 After deduplication: ${uniqueModules.length} unique modules`);

            let newlyCreatedModuleName = localStorage.getItem('newlyCreatedModuleName');

            // Display each module - ensure we don't add duplicates
            showDebugInfo(`🔨 Creating DOM for ${uniqueModules.length} modules`);
            const addedModuleIds = new Set();
            uniqueModules.forEach((module, index) => {
                // Double-check: don't add if already in DOM (shouldn't happen after innerHTML = '', but just in case)
                if (addedModuleIds.has(module.moduleId)) {
                    showDebugInfo(`  ⚠ Skipping duplicate: "${module.name}" (ID: ${module.moduleId})`, 'error');
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
                showDebugInfo(`  ✓ Added: "${module.name}"`, 'success');

            // Automatically select the newly created module if it exists
            if (newlyCreatedModuleName && module.name === newlyCreatedModuleName) {
                li.classList.add('active');
                selectedModule = li; // Set this module as selected
                localStorage.removeItem('newlyCreatedModuleName'); // Clear after selection
                showDebugInfo(`  ⭐ Auto-selected: ${module.name}`, 'success');
            }

            li.addEventListener('click', () => {
                // Remove active class from all other modules
                moduleList.querySelectorAll('.module-item').forEach(mod => mod.classList.remove('active'));
                // Add active class to the clicked module
                li.classList.add('active');
                selectedModule = li;
                showDebugInfo(`👆 Selected: ${selectedModule.dataset.moduleName}`, 'success');
                updateMainContent();
                toggleLearningModeButtons(true);
            });
        });
        
        showDebugInfo(`✅ Done! ${moduleList.children.length} modules in DOM`, 'success');

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
