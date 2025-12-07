/**
 * Exercises Interface Component
 * 
 * A reusable exercises UI component for generating and practicing with Clara RAG API
 */
class ExercisesInterface {
    constructor(claraClient, moduleName = 'Module') {
        this.claraClient = claraClient;
        this.moduleName = moduleName;
        this.exercises = [];
        this.currentExerciseIndex = 0;
        this.userAnswers = {}; // Track user answers: { exerciseIndex: selectedChoiceIndex }
        this.isOpen = false;
        this.isLoading = false;
        this.exercisesContainer = null;
    }

    /**
     * Create and inject the exercises interface into the page
     */
    open() {
        if (this.isOpen) {
            return; // Already open
        }

        // Create exercises container
        this.exercisesContainer = document.createElement('div');
        this.exercisesContainer.id = 'clara-exercises-container';
        this.exercisesContainer.innerHTML = `
            <div class="exercises-header">
                <div class="exercises-header-content">
                    <h3>📝 Practice Exercises</h3>
                    <span class="exercises-module-name">${this.moduleName}</span>
                </div>
                <button class="exercises-close-btn" id="exercises-close-btn" aria-label="Close exercises">×</button>
            </div>
            <div class="exercises-content">
                <div class="exercises-input-section" id="exercises-input-section">
                    <div class="exercises-welcome">
                        <p>👋 Ready to test your knowledge?</p>
                        <p>Enter a topic or question below, and I'll generate practice exercises for you!</p>
                    </div>
                    <div class="exercises-query-container">
                        <input 
                            type="text" 
                            id="exercises-query-input" 
                            class="exercises-query-input" 
                            placeholder="e.g., Generate exercises about WANs" 
                            autocomplete="off"
                        />
                        <button id="exercises-generate-btn" class="exercises-generate-btn" aria-label="Generate exercises">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            <span>Generate Exercises</span>
                        </button>
                    </div>
                </div>
                <div class="exercises-display-section" id="exercises-display-section" style="display: none;">
                    <div class="exercises-controls">
                        <button id="exercises-new-btn" class="exercises-new-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            New Exercises
                        </button>
                        <div class="exercises-progress">
                            <span id="exercises-progress-text">1 / 0</span>
                        </div>
                    </div>
                    <div class="exercises-list" id="exercises-list">
                        <!-- Exercises will be dynamically added here -->
                    </div>
                </div>
            </div>
        `;

        // Inject into main content area
        const mainContent = document.getElementById('main-content-module');
        const containerC = mainContent?.closest('.containerC');
        
        if (mainContent) {
            mainContent.innerHTML = '';
            mainContent.appendChild(this.exercisesContainer);
            mainContent.style.display = 'flex';
            // Adjust layout for exercises interface - fill container completely
            mainContent.style.justifyContent = 'stretch';
            mainContent.style.alignItems = 'stretch';
            mainContent.style.padding = '0';
            mainContent.style.width = '100%';
            mainContent.style.height = '100%';
        }
        
        // Remove padding from containerC to allow full width/height
        if (containerC) {
            const computedStyle = window.getComputedStyle(containerC);
            this.originalContainerCPadding = computedStyle.padding;
            containerC.style.padding = '0';
        }

        // Get references to DOM elements
        const queryInput = document.getElementById('exercises-query-input');
        const generateBtn = document.getElementById('exercises-generate-btn');
        const closeButton = document.getElementById('exercises-close-btn');
        const newExercisesBtn = document.getElementById('exercises-new-btn');

        // Set up event listeners
        generateBtn.addEventListener('click', () => this.generateExercises());
        queryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.generateExercises();
            }
        });
        closeButton.addEventListener('click', () => this.close());
        newExercisesBtn.addEventListener('click', () => this.showInputSection());

        // Load saved state if available
        const hasSavedState = this.loadState();
        
        this.isOpen = true;
        
        // If we have saved state, restore the display
        if (hasSavedState) {
            this.displayExercises();
        } else {
            queryInput.focus();
        }
    }

    /**
     * Close the exercises interface
     */
    close() {
        if (!this.isOpen) {
            return;
        }

        // Restore default content
        const mainContent = document.getElementById('main-content-module');
        const containerC = mainContent?.closest('.containerC');
        
        if (mainContent) {
            mainContent.innerHTML = `
                <h1 id="module-content-title" class="module-content-title">${this.moduleName}</h1>
                <p class="module-content-placeholder">Module content goes here</p>
            `;
            // Restore original layout styles
            mainContent.style.justifyContent = 'center';
            mainContent.style.alignItems = 'center';
            mainContent.style.padding = '';
            mainContent.style.width = '';
            mainContent.style.height = '';
        }
        
        // Restore containerC padding (empty string will use original CSS value)
        if (containerC && this.originalContainerCPadding !== undefined) {
            containerC.style.padding = '';
        }

        // Save state before closing
        this.saveState();

        this.exercisesContainer = null;
        // Don't clear exercises - they're saved in state
        // this.exercises = [];
        // this.currentExerciseIndex = 0;
        // this.userAnswers = {};
        this.isOpen = false;
    }

    /**
     * Save the current state to localStorage
     */
    saveState() {
        if (this.exercises && this.exercises.length > 0) {
            const stateKey = `exercises_state_${this.moduleName}`;
            const state = {
                exercises: this.exercises,
                currentExerciseIndex: this.currentExerciseIndex,
                userAnswers: this.userAnswers,
                timestamp: Date.now()
            };
            localStorage.setItem(stateKey, JSON.stringify(state));
        }
    }

    /**
     * Load saved state from localStorage
     */
    loadState() {
        const stateKey = `exercises_state_${this.moduleName}`;
        const savedState = localStorage.getItem(stateKey);
        
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.exercises && Array.isArray(state.exercises) && state.exercises.length > 0) {
                    this.exercises = state.exercises;
                    this.currentExerciseIndex = state.currentExerciseIndex || 0;
                    this.userAnswers = state.userAnswers || {};
                    return true;
                }
            } catch (error) {
                console.error('Error loading exercises state:', error);
            }
        }
        return false;
    }

    /**
     * Show the input section (for generating new exercises)
     */
    showInputSection() {
        const inputSection = document.getElementById('exercises-input-section');
        const displaySection = document.getElementById('exercises-display-section');
        
        if (inputSection && displaySection) {
            inputSection.style.display = 'block';
            displaySection.style.display = 'none';
            this.exercises = [];
            this.userAnswers = {};
            this.currentExerciseIndex = 0;
            
            // Clear saved state when starting new exercises
            const stateKey = `exercises_state_${this.moduleName}`;
            localStorage.removeItem(stateKey);
            
            const queryInput = document.getElementById('exercises-query-input');
            if (queryInput) {
                queryInput.value = '';
                queryInput.focus();
            }
        }
    }

    /**
     * Generate exercises from the API
     */
    async generateExercises() {
        const queryInput = document.getElementById('exercises-query-input');
        const generateBtn = document.getElementById('exercises-generate-btn');
        const query = queryInput.value.trim();
        
        if (!query || this.isLoading) {
            return;
        }

        // Disable input
        queryInput.disabled = true;
        generateBtn.disabled = true;
        this.isLoading = true;

        // Show loading state
        const inputSection = document.getElementById('exercises-input-section');
        if (inputSection) {
            inputSection.innerHTML = `
                <div class="exercises-loading">
                    <div class="exercises-typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <p>Generating exercises...</p>
                </div>
            `;
        }

        try {
            // Call Clara API
            const exercises = await this.claraClient.generateExercises(query);
            
            if (!Array.isArray(exercises) || exercises.length === 0) {
                throw new Error('No exercises were generated. Please try again with a different query.');
            }

            this.exercises = exercises;
            this.userAnswers = {};
            this.currentExerciseIndex = 0;
            
            // Show exercises
            this.displayExercises();
            // Save state after generating exercises
            this.saveState();
            
        } catch (error) {
            // Show error and restore input
            if (inputSection) {
                inputSection.innerHTML = `
                    <div class="exercises-welcome">
                        <p>⚠️ Error generating exercises</p>
                        <p style="color: #ff6b6b;">${error.message}</p>
                    </div>
                    <div class="exercises-query-container">
                        <input 
                            type="text" 
                            id="exercises-query-input" 
                            class="exercises-query-input" 
                            placeholder="e.g., Generate exercises about WANs" 
                            autocomplete="off"
                            value="${query}"
                        />
                        <button id="exercises-generate-btn" class="exercises-generate-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            <span>Generate Exercises</span>
                        </button>
                    </div>
                `;
                
                // Re-attach event listeners
                document.getElementById('exercises-generate-btn').addEventListener('click', () => this.generateExercises());
                document.getElementById('exercises-query-input').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.generateExercises();
                    }
                });
            }
            console.error('Exercises error:', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Display all exercises
     */
    displayExercises() {
        const inputSection = document.getElementById('exercises-input-section');
        const displaySection = document.getElementById('exercises-display-section');
        const exercisesList = document.getElementById('exercises-list');
        
        if (!inputSection || !displaySection || !exercisesList) {
            return;
        }

        // Hide input, show display
        inputSection.style.display = 'none';
        displaySection.style.display = 'block';

        // Clear existing exercises
        exercisesList.innerHTML = '';

        // Update progress
        this.updateProgress();

        // Render each exercise
        this.exercises.forEach((exercise, index) => {
            const exerciseElement = this.createExerciseElement(exercise, index);
            exercisesList.appendChild(exerciseElement);
        });

        // Scroll to top
        exercisesList.scrollTop = 0;
    }

    /**
     * Create a single exercise element
     */
    createExerciseElement(exercise, index) {
        const exerciseDiv = document.createElement('div');
        exerciseDiv.className = 'exercise-item';
        exerciseDiv.dataset.exerciseIndex = index;

        const userAnswer = this.userAnswers[index];
        const isAnswered = userAnswer !== undefined;
        const isCorrect = isAnswered && userAnswer === exercise.correct_answer;
        const showExplanation = isAnswered;

        exerciseDiv.innerHTML = `
            <div class="exercise-header">
                <span class="exercise-number">Question ${index + 1}</span>
                ${isAnswered ? `
                    <span class="exercise-status ${isCorrect ? 'correct' : 'incorrect'}">
                        ${isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                ` : ''}
            </div>
            <div class="exercise-question">${this.escapeHtml(exercise.question)}</div>
            <div class="exercise-choices">
                ${exercise.choices.map((choice, choiceIndex) => {
                    const choiceId = `exercise-${index}-choice-${choiceIndex}`;
                    const isSelected = userAnswer === choiceIndex;
                    const isCorrectChoice = choiceIndex === exercise.correct_answer;
                    let choiceClass = 'exercise-choice';
                    
                    if (isAnswered) {
                        if (isCorrectChoice) {
                            choiceClass += ' correct-answer';
                        } else if (isSelected && !isCorrect) {
                            choiceClass += ' incorrect-answer';
                        }
                    } else if (isSelected) {
                        choiceClass += ' selected';
                    }

                    return `
                        <label class="${choiceClass}" for="${choiceId}">
                            <input 
                                type="radio" 
                                id="${choiceId}"
                                name="exercise-${index}"
                                value="${choiceIndex}"
                                ${isSelected ? 'checked' : ''}
                                ${isAnswered ? 'disabled' : ''}
                            />
                            <span class="choice-letter">${String.fromCharCode(65 + choiceIndex)})</span>
                            <span class="choice-text">${this.escapeHtml(choice)}</span>
                            ${isAnswered && isCorrectChoice ? '<span class="choice-checkmark">✓</span>' : ''}
                        </label>
                    `;
                }).join('')}
            </div>
            ${showExplanation ? `
                <div class="exercise-explanation">
                    <strong>Explanation:</strong> ${this.escapeHtml(exercise.explanation)}
                </div>
            ` : ''}
        `;

        // Add event listeners for radio buttons
        const radioButtons = exerciseDiv.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (!isAnswered) {
                    const selectedIndex = parseInt(e.target.value);
                    this.userAnswers[index] = selectedIndex;
                    // Save state after answering
                    this.saveState();
                    this.handleAnswer(index, selectedIndex === exercise.correct_answer);
                }
            });
        });

        return exerciseDiv;
    }

    /**
     * Handle when user selects an answer
     */
    handleAnswer(exerciseIndex, isCorrect) {
        // Re-render all exercises to ensure consistency
        const exercisesList = document.getElementById('exercises-list');
        if (!exercisesList) {
            return;
        }

        // Clear and re-render all exercises
        exercisesList.innerHTML = '';
        this.exercises.forEach((exercise, index) => {
            const exerciseElement = this.createExerciseElement(exercise, index);
            exercisesList.appendChild(exerciseElement);
        });

        // Update progress
        this.updateProgress();
        
        // Scroll to the answered exercise
        const answeredExercise = exercisesList.querySelector(`[data-exercise-index="${exerciseIndex}"]`);
        if (answeredExercise) {
            answeredExercise.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Update progress indicator
     */
    updateProgress() {
        const progressText = document.getElementById('exercises-progress-text');
        if (progressText) {
            const answeredCount = Object.keys(this.userAnswers).length;
            progressText.textContent = `${answeredCount} / ${this.exercises.length} answered`;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

