/**
 * Revision Sheets Interface Component
 * 
 * A reusable revision sheets UI component for generating and viewing study materials
 */
class RevisionInterface {
    constructor(claraClient, moduleName = 'Module') {
        this.claraClient = claraClient;
        this.moduleName = moduleName;
        this.revisionSheets = [];
        this.isOpen = false;
        this.isLoading = false;
        this.revisionContainer = null;
        this.mindmapInstance = null; // Store mindmap instance
    }

    /**
     * Create and inject the revision interface into the page
     */
    open() {
        if (this.isOpen) {
            return; // Already open
        }

        // Create revision container
        this.revisionContainer = document.createElement('div');
        this.revisionContainer.id = 'clara-revision-container';
        this.revisionContainer.innerHTML = `
            <div class="revision-header">
                <div class="revision-header-content">
                    <h3>📖 Lesson Schematiser</h3>
                    <span class="revision-module-name">${this.moduleName}</span>
                </div>
                <button class="revision-close-btn" id="revision-close-btn" aria-label="Close revision">×</button>
            </div>
            <div class="revision-content">
                <div class="revision-input-section" id="revision-input-section">
                    <div class="revision-welcome">
                        <p>📚 Ready to create your study materials?</p>
                        <p>Enter a topic below, and I'll generate organized revision sheets with key concepts for you!</p>
                    </div>
                    <div class="revision-query-container">
                        <input 
                            type="text" 
                            id="revision-query-input" 
                            class="revision-query-input" 
                            placeholder="e.g., Create revision sheets for network concepts" 
                            autocomplete="off"
                        />
                        <button id="revision-generate-btn" class="revision-generate-btn" aria-label="Generate revision sheets">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            <span>Generate Revision Sheets</span>
                        </button>
                    </div>
                </div>
                <div class="revision-display-section" id="revision-display-section" style="display: none;">
                    <div class="revision-controls">
                        <div class="revision-controls-left">
                            <button id="revision-new-btn" class="revision-new-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                New Revision Sheets
                            </button>
                            <button id="revision-view-sheet-btn" class="revision-view-sheet-btn" disabled>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                View Original Sheet
                            </button>
                        </div>
                        <div class="revision-count">
                            <span id="revision-count-text">0 sheets</span>
                        </div>
                    </div>
                    <div class="revision-mindmap-container" id="revision-mindmap-container">
                        <svg id="revision-mindmap-svg" class="revision-mindmap-svg"></svg>
                    </div>
                </div>
            </div>
        `;

        // Inject into main content area
        const mainContent = document.getElementById('main-content-module');
        const containerC = mainContent?.closest('.containerC');
        
        if (mainContent) {
            mainContent.innerHTML = '';
            mainContent.appendChild(this.revisionContainer);
            mainContent.style.display = 'flex';
            // Adjust layout for revision interface - fill container completely
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
        const queryInput = document.getElementById('revision-query-input');
        const generateBtn = document.getElementById('revision-generate-btn');
        const closeButton = document.getElementById('revision-close-btn');
        const newRevisionBtn = document.getElementById('revision-new-btn');
        const viewSheetBtn = document.getElementById('revision-view-sheet-btn');

        // Set up event listeners
        generateBtn.addEventListener('click', () => this.generateRevisionSheets());
        queryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.generateRevisionSheets();
            }
        });
        closeButton.addEventListener('click', () => this.close());
        newRevisionBtn.addEventListener('click', () => this.showInputSection());
        
        // View sheet button - opens in new page
        if (viewSheetBtn) {
            viewSheetBtn.addEventListener('click', () => this.openSheetInNewPage());
        }

        // Load saved state if available
        const hasSavedState = this.loadState();
        
        this.isOpen = true;
        
        // If we have saved state, restore the display
        if (hasSavedState) {
            this.displayRevisionSheets();
        } else {
            queryInput.focus();
        }
    }

    /**
     * Close the revision interface
     */
    close() {
        if (!this.isOpen) {
            return;
        }

        // Save state before closing
        this.saveState();

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

        this.revisionContainer = null;
        // Don't clear revisionSheets - they're saved in state
        this.mindmapInstance = null;
        this.isOpen = false;
    }

    /**
     * Save the current state to localStorage
     */
    saveState() {
        if (this.revisionSheets && this.revisionSheets.length > 0) {
            const stateKey = `revision_state_${this.moduleName}`;
            const state = {
                revisionSheets: this.revisionSheets,
                timestamp: Date.now()
            };
            localStorage.setItem(stateKey, JSON.stringify(state));
        }
    }

    /**
     * Load saved state from localStorage
     */
    loadState() {
        const stateKey = `revision_state_${this.moduleName}`;
        const savedState = localStorage.getItem(stateKey);
        
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.revisionSheets && Array.isArray(state.revisionSheets) && state.revisionSheets.length > 0) {
                    this.revisionSheets = state.revisionSheets;
                    return true;
                }
            } catch (error) {
                console.error('Error loading revision state:', error);
            }
        }
        return false;
    }

    /**
     * Show the input section (for generating new revision sheets)
     */
    showInputSection() {
        const inputSection = document.getElementById('revision-input-section');
        const displaySection = document.getElementById('revision-display-section');
        const svgElement = document.getElementById('revision-mindmap-svg');
        const viewSheetBtn = document.getElementById('revision-view-sheet-btn');
        
        if (inputSection && displaySection) {
            inputSection.style.display = 'block';
            displaySection.style.display = 'none';
            this.revisionSheets = [];
            this.mindmapInstance = null;
            
            // Disable view sheet button
            if (viewSheetBtn) {
                viewSheetBtn.disabled = true;
            }
            
            // Clear saved state when starting new revision sheets
            const stateKey = `revision_state_${this.moduleName}`;
            localStorage.removeItem(stateKey);
            
            // Clear SVG
            if (svgElement) {
                svgElement.innerHTML = '';
            }
            
            const queryInput = document.getElementById('revision-query-input');
            if (queryInput) {
                queryInput.value = '';
                queryInput.focus();
            }
        }
    }

    /**
     * Generate revision sheets from the API
     */
    async generateRevisionSheets() {
        const queryInput = document.getElementById('revision-query-input');
        const generateBtn = document.getElementById('revision-generate-btn');
        const query = queryInput.value.trim();
        
        if (!query || this.isLoading) {
            return;
        }

        // Disable input
        queryInput.disabled = true;
        generateBtn.disabled = true;
        this.isLoading = true;

        // Show loading state
        const inputSection = document.getElementById('revision-input-section');
        if (inputSection) {
            inputSection.innerHTML = `
                <div class="revision-loading">
                    <div class="revision-typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <p>Generating revision sheets...</p>
                </div>
            `;
        }

        try {
            // Call Clara API
            const sheets = await this.claraClient.generateRevisionSheets(query);
            
            if (!Array.isArray(sheets) || sheets.length === 0) {
                throw new Error('No revision sheets were generated. Please try again with a different query.');
            }

            this.revisionSheets = sheets;
            
            // Show revision sheets
            this.displayRevisionSheets();
            // Save state after generating revision sheets
            this.saveState();
            
        } catch (error) {
            // Show error and restore input
            if (inputSection) {
                // Format error message for better readability
                let errorMessage = error.message;
                if (errorMessage.includes('Cannot connect to RAG API')) {
                    errorMessage = errorMessage.replace(/\n/g, '<br>');
                }
                
                inputSection.innerHTML = `
                    <div class="revision-welcome">
                        <p>⚠️ Error generating revision sheets</p>
                        <p style="color: #ff6b6b; white-space: pre-wrap;">${errorMessage}</p>
                    </div>
                    <div class="revision-query-container">
                        <input 
                            type="text" 
                            id="revision-query-input" 
                            class="revision-query-input" 
                            placeholder="e.g., Create revision sheets for network concepts" 
                            autocomplete="off"
                            value="${query}"
                        />
                        <button id="revision-generate-btn" class="revision-generate-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            <span>Generate Revision Sheets</span>
                        </button>
                    </div>
                `;
                
                // Re-attach event listeners
                document.getElementById('revision-generate-btn').addEventListener('click', () => this.generateRevisionSheets());
                document.getElementById('revision-query-input').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.generateRevisionSheets();
                    }
                });
            }
            console.error('Revision sheets error:', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Display revision sheets as mindmap
     */
    displayRevisionSheets() {
        const inputSection = document.getElementById('revision-input-section');
        const displaySection = document.getElementById('revision-display-section');
        const mindmapContainer = document.getElementById('revision-mindmap-container');
        const svgElement = document.getElementById('revision-mindmap-svg');
        
        if (!inputSection || !displaySection || !mindmapContainer || !svgElement) {
            return;
        }

        // Hide input, show display
        inputSection.style.display = 'none';
        displaySection.style.display = 'block';

        // Clear existing SVG
        svgElement.innerHTML = '';

        // Update count
        this.updateCount();
        
        // Enable/disable view sheet button based on whether we have sheets
        const viewSheetBtn = document.getElementById('revision-view-sheet-btn');
        if (viewSheetBtn) {
            viewSheetBtn.disabled = !this.revisionSheets || this.revisionSheets.length === 0;
        }

        // Wait for libraries to load and check availability
        const checkLibraries = () => {
            // Check if d3 is loaded
            if (typeof d3 === 'undefined' && typeof window.d3 === 'undefined') {
                return false;
            }
            
            // Check if markmap is loaded (various possible locations)
            const hasMarkmap = (window.markmap && window.markmap.Markmap) || 
                              window.Markmap || 
                              (typeof markmap !== 'undefined' && markmap.Markmap);
            
            // Check if setupMindmap function is available
            if (!hasMarkmap || typeof setupMindmap === 'undefined') {
                return false;
            }
            
            return true;
        };

        // Try to display mindmap, retry if libraries not loaded
        const attemptDisplay = (retries = 10) => {
            if (checkLibraries()) {
                try {
                    // Ensure SVG has proper dimensions
                    const containerRect = mindmapContainer.getBoundingClientRect();
                    if (containerRect.width === 0 || containerRect.height === 0) {
                        // Wait a bit for layout to settle
                        setTimeout(() => attemptDisplay(retries), 100);
                        return;
                    }

                    svgElement.style.width = '100%';
                    svgElement.style.height = `${Math.max(containerRect.height - 20, 600)}px`;

                    // Convert revision sheets to mindmap format and display
                    this.mindmapInstance = setupMindmap(this.revisionSheets, svgElement, this.mindmapInstance);
                } catch (error) {
                    console.error('Error creating mindmap:', error);
                    mindmapContainer.innerHTML = `
                        <div style="padding: 40px; text-align: center; color: #ff6b6b;">
                            <p>⚠️ Error creating mindmap visualization</p>
                            <p style="font-size: 0.9rem;">${error.message}</p>
                        </div>
                    `;
                }
            } else if (retries > 0) {
                // Libraries not loaded yet, retry
                setTimeout(() => attemptDisplay(retries - 1), 500);
            } else {
                // Give up after retries
                mindmapContainer.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: var(--text-light-grey);">
                        <p>⚠️ Mindmap library failed to load</p>
                        <p style="font-size: 0.9rem; color: var(--module-text-light);">Please refresh the page.</p>
                    </div>
                `;
            }
        };

        attemptDisplay();
    }


    /**
     * Open revision sheet in a new page
     */
    openSheetInNewPage() {
        if (!this.revisionSheets || this.revisionSheets.length === 0) {
            console.warn('No revision sheets available to view');
            return;
        }
        
        // Save current page URL to localStorage so we can return to it
        localStorage.setItem('revisionSheetReturnUrl', window.location.href);
        
        // Navigate to revision sheet view page with module name as parameter
        const url = `revision-sheet-view.html?module=${encodeURIComponent(this.moduleName)}`;
        window.location.href = url;
    }

    /**
     * Update revision sheets count
     */
    updateCount() {
        const countText = document.getElementById('revision-count-text');
        if (countText) {
            const count = this.revisionSheets.length;
            countText.textContent = `${count} ${count === 1 ? 'sheet' : 'sheets'}`;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

