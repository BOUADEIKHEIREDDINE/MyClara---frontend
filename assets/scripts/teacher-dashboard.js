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
    const API_BASE_URL = 'http://localhost/myclara-api';
    const RAG_API_BASE_URL = 'http://localhost:8000'; // RAG API base URL
    const NEW_MODULE_KEY = 'teacherNewlyCreatedClassName';

    const currentUserEmail = localStorage.getItem('currentUserEmail');
    const teacherId = localStorage.getItem('currentUserId');
    let claraClient = null; // Clara API client instance
    let chatInterface = null; // Chat interface instance
    let exercisesInterface = null; // Exercises interface instance
    let revisionInterface = null; // Revision interface instance

    if (!currentUserEmail || !teacherId) {
        console.error("No current user email or ID found in localStorage. Redirecting to login.");
        window.location.href = 'teacher-login.html';
        return;
    }

    // Function to update main content area
    function updateMainContent() {
        if (selectedModule) {
            mainContentDefault.style.display = 'none';
            mainContentModule.style.display = 'flex'; // Use flex for centering module content
            moduleContentTitle.textContent = selectedModule.dataset.className || selectedModule.dataset.moduleName;
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

    // Function to fetch classes from SQL
    async function fetchClassesFromSQL() {
        try {
            const url = `${API_BASE_URL}/list_teacher_classes.php?teacherId=${teacherId}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to fetch classes:', response.status, errorText);
                return [];
            }

            const data = await response.json();
            
            if (!data.success) {
                console.error('API returned error:', data.error);
                return [];
            }

            return data.classes || [];
        } catch (error) {
            console.error('Error fetching classes from SQL:', error);
            return [];
        }
    }

    // Function to display classes in the sidebar
    async function displayModules() {
        moduleList.innerHTML = '';
        
        // Fetch classes from SQL
        const classes = await fetchClassesFromSQL();

        if (!classes || classes.length === 0) {
            moduleList.innerHTML = '<p style="text-align: center; color: #858596; padding: 20px;">No classes created yet.</p>';
            updateMainContent();
            toggleLearningModeButtons(false);
            return;
        }

        let newlyCreatedClassName = localStorage.getItem(NEW_MODULE_KEY);

        // Display each class
        classes.forEach(classItem => {
            const li = document.createElement('li');
            li.classList.add('module-item');
            li.dataset.className = classItem.name; // Store class name
            li.dataset.classId = classItem.classId; // Store class ID
            li.dataset.moduleName = classItem.teachingModule || classItem.name; // Store module name for compatibility
            li.innerHTML = `
                <div class="module-text">
                    <img src="assets/icons/module.svg" alt="Class Icon" class="module-icon">
                    <span class="module-name">${classItem.name}</span>
                </div>
            `;
            moduleList.appendChild(li);

            // Automatically select the newly created class if it exists
            if (newlyCreatedClassName && classItem.name === newlyCreatedClassName) {
                li.classList.add('active');
                selectedModule = li;
                localStorage.removeItem(NEW_MODULE_KEY); // Clear after selection
            }

            li.addEventListener('click', () => {
                // Remove active class from all other classes
                moduleList.querySelectorAll('.module-item').forEach(mod => mod.classList.remove('active'));
                // Add active class to the clicked class
                li.classList.add('active');
                selectedModule = li;
                console.log(`Class selected: ${selectedModule.dataset.className}`);
                updateMainContent();
                toggleLearningModeButtons(true);
            });
        });
        
        // After all classes are displayed and potentially one is selected, update content
        updateMainContent();
        toggleLearningModeButtons(selectedModule !== null); // Enable buttons if a class is selected
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
                console.warn("Please select a class first");
                alert("Please select a class from the sidebar first.");
                return;
            }

            // Initialize Clara client if not already initialized
            const client = initializeClaraClient();
            
            // Get class/module name
            const moduleName = selectedModule.dataset.className || selectedModule.dataset.moduleName || 'Class';
            
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
                console.warn("Please select a class first");
                alert("Please select a class from the sidebar first.");
                return;
            }

            // Initialize Clara client if not already initialized
            const client = initializeClaraClient();
            
            // Get class/module name
            const moduleName = selectedModule.dataset.className || selectedModule.dataset.moduleName || 'Class';
            
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
                console.warn("Please select a class first");
                alert("Please select a class from the sidebar first.");
                return;
            }

            // Initialize Clara client if not already initialized
            const client = initializeClaraClient();
            
            // Get class/module name
            const moduleName = selectedModule.dataset.className || selectedModule.dataset.moduleName || 'Class';
            
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

    // Initial setup when page loads
    displayModules();
});
