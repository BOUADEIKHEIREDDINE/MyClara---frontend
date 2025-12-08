/**
 * Revision Sheet View Page Script
 * Handles displaying revision sheet data on a dedicated page
 */

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('revision-sheet-container');
    const loading = document.getElementById('revision-sheet-loading');
    const backBtn = document.getElementById('revision-sheet-back-btn');
    const moduleNameEl = document.getElementById('revision-sheet-module-name');

    // Get revision sheet data from localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const moduleName = urlParams.get('module') || 'Module';
    
    // Update module name in header
    if (moduleNameEl) {
        moduleNameEl.textContent = moduleName;
    }

    // Load and display revision sheet
    loadRevisionSheet(moduleName);

    // Back button handler
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Check if we have a saved return URL
            const returnUrl = localStorage.getItem('revisionSheetReturnUrl');
            if (returnUrl) {
                localStorage.removeItem('revisionSheetReturnUrl');
                window.location.href = returnUrl;
                return;
            }
            
            // Otherwise, try to go back in history or redirect to dashboard
            const referrer = document.referrer;
            if (referrer && referrer.includes('teacher-dashboard')) {
                window.location.href = 'teacher-dashboard.html';
            } else if (referrer && referrer.includes('student-dashboard')) {
                window.location.href = 'student-dashboard.html';
            } else if (window.history.length > 1) {
                window.history.back();
            } else {
                // Default to student dashboard
                window.location.href = 'student-dashboard.html';
            }
        });
    }
});

/**
 * Load revision sheet data from localStorage and display it
 */
function loadRevisionSheet(moduleName) {
    const container = document.getElementById('revision-sheet-container');
    const loading = document.getElementById('revision-sheet-loading');

    if (!container || !loading) {
        return;
    }

    try {
        // Get revision sheet data from localStorage
        const stateKey = `revision_state_${moduleName}`;
        const savedState = localStorage.getItem(stateKey);

        if (!savedState) {
            showEmptyState();
            return;
        }

        const state = JSON.parse(savedState);
        const revisionSheets = state.revisionSheets;

        if (!revisionSheets || !Array.isArray(revisionSheets) || revisionSheets.length === 0) {
            showEmptyState();
            return;
        }

        // Hide loading, show content
        loading.classList.add('hidden');
        displayRevisionSheets(revisionSheets);

    } catch (error) {
        console.error('Error loading revision sheet:', error);
        showErrorState(error.message);
    }
}

/**
 * Display revision sheets in the container
 */
function displayRevisionSheets(revisionSheets) {
    const container = document.getElementById('revision-sheet-container');
    if (!container) {
        return;
    }

    let html = '';

    revisionSheets.forEach((sheet, index) => {
        html += '<div class="revision-sheet-item">';

        // Title
        if (sheet.title) {
            html += `<div class="revision-sheet-item-title">${escapeHtml(sheet.title)}</div>`;
        }

        // Explanation
        const explanation = sheet.detailed_explanation || sheet.explanation || '';
        if (explanation) {
            html += `<div class="revision-sheet-item-explanation">${escapeHtml(explanation)}</div>`;
        }

        // Key concepts
        if (sheet.key_concepts && Array.isArray(sheet.key_concepts) && sheet.key_concepts.length > 0) {
            html += '<div class="revision-sheet-item-concepts">';
            html += '<div class="revision-sheet-item-concepts-title">Key Concepts</div>';
            html += '<ul class="revision-sheet-item-concepts-list">';
            sheet.key_concepts.forEach(concept => {
                html += `<li>${escapeHtml(concept)}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        html += '</div>';
    });

    container.innerHTML = html;
}

/**
 * Show empty state when no revision sheet data is available
 */
function showEmptyState() {
    const container = document.getElementById('revision-sheet-container');
    const loading = document.getElementById('revision-sheet-loading');

    if (loading) {
        loading.classList.add('hidden');
    }

    if (container) {
        container.innerHTML = `
            <div class="revision-sheet-empty">
                <h2>No Revision Sheet Available</h2>
                <p>No revision sheet data found for this module.</p>
                <p>Please generate a revision sheet from the dashboard first.</p>
            </div>
        `;
    }
}

/**
 * Show error state
 */
function showErrorState(errorMessage) {
    const container = document.getElementById('revision-sheet-container');
    const loading = document.getElementById('revision-sheet-loading');

    if (loading) {
        loading.classList.add('hidden');
    }

    if (container) {
        container.innerHTML = `
            <div class="revision-sheet-empty">
                <h2>Error Loading Revision Sheet</h2>
                <p style="color: #ff6b6b;">${escapeHtml(errorMessage)}</p>
            </div>
        `;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

