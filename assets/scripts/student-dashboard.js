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

    // Function to fetch modules from SQL database ONLY (no IndexedDB fallback)
    // Uses CreatorUserID from modules table matching UserID from users table
    async function fetchModulesFromSQL() {
        // Always get fresh currentUserId from localStorage
        // This should be the UserID from the users table
        const userId = localStorage.getItem('currentUserId');
        
        if (!userId) {
            showDebugInfo('❌ No currentUserId found in localStorage', 'error');
            showDebugInfo('Please login again', 'error');
            return [];
        }

        // Convert to integer to ensure proper matching with CreatorUserID
        const userIdInt = parseInt(userId, 10);
        if (isNaN(userIdInt)) {
            showDebugInfo(`❌ Invalid UserID format: ${userId}`, 'error');
            return [];
        }

        showDebugInfo(`🔍 Fetching modules for UserID: ${userIdInt}`);
        showDebugInfo(`Query: WHERE CreatorUserID = ${userIdInt}`);

        try {
            const url = `${API_BASE_URL}/list_student_modules.php?creatorUserId=${userIdInt}`;
            showDebugInfo(`📡 Requesting: ${url}`);
            
            const res = await fetch(url);
            
            showDebugInfo(`📥 Response status: ${res.status} ${res.statusText}`);
            
            if (!res.ok) {
                const errorText = await res.text();
                showDebugInfo(`❌ Error ${res.status}: ${errorText.substring(0, 100)}`, 'error');
                return [];
            }

            const responseText = await res.text();
            showDebugInfo(`📄 Response received (${responseText.length} chars)`);
            
            let data;
            try {
                data = JSON.parse(responseText);
                showDebugInfo('✅ JSON parsed successfully');
            } catch (parseError) {
                showDebugInfo(`❌ JSON parse error: ${parseError.message}`, 'error');
                showDebugInfo(`Response: ${responseText.substring(0, 200)}`, 'error');
                return [];
            }
            
            showDebugInfo(`Success: ${data.success}, Modules: ${data.modules ? data.modules.length : 0}`);
            
            // Check if response is successful and has modules
            // IMPORTANT: Show ALL modules regardless of file count (even if 0 files)
            if (data && data.success && Array.isArray(data.modules)) {
                showDebugInfo(`✅ Processing ${data.modules.length} modules...`, 'success');
                
                const modules = data.modules.map((m, index) => {
                    const module = {
                        moduleId: m.ModuleID || m.moduleId,
                        name: m.ModuleName || m.name || ''
                    };
                    showDebugInfo(`  ✓ Module ${index + 1}: ${module.name} (ID: ${module.moduleId})`, 'success');
                    return module;
                }).filter(m => {
                    const isValid = m.name && m.moduleId;
                    if (!isValid) {
                        showDebugInfo(`  ⚠ Filtered out invalid module: ${JSON.stringify(m)}`, 'error');
                    }
                    return isValid;
                });
                
                showDebugInfo(`✅ Ready to display ${modules.length} modules`, 'success');
                return modules;
            } else if (data && data.error) {
                showDebugInfo(`❌ API error: ${data.error}`, 'error');
                return [];
            } else {
                showDebugInfo(`⚠ Unexpected format. Success: ${data?.success}, Modules type: ${typeof data?.modules}`, 'error');
                return [];
            }
        } catch (error) {
            showDebugInfo(`❌ Network error: ${error.message}`, 'error');
            return [];
        }
    }

    // Function to display modules in the sidebar
    async function displayModules() {
        showDebugInfo('=== displayModules() called ===');
        
        // Verify moduleList element exists
        if (!moduleList) {
            showDebugInfo('❌ ERROR: moduleList element not found!', 'error');
            showDebugInfo('Looking for element with id="module-list"', 'error');
            return;
        }
        
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

        let newlyCreatedModuleName = localStorage.getItem('newlyCreatedModuleName');

        // Display each module
        showDebugInfo(`🔨 Creating DOM for ${modules.length} modules`);
        modules.forEach((module, index) => {
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
    function refreshModules() {
        // Re-fetch currentUserId in case it was updated
        const updatedUserId = localStorage.getItem('currentUserId');
        if (updatedUserId && updatedUserId !== currentUserId) {
            // Update the currentUserId if it changed
            currentUserId = updatedUserId;
        }
        displayModules();
    }

    // Refresh modules when page becomes visible (e.g., when returning from create module page)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshModules();
        }
    });

    // Also refresh when page gains focus
    window.addEventListener('focus', refreshModules);

    // Initial setup when page loads
    displayModules();
});
