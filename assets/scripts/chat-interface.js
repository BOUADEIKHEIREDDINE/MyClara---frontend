/**
 * Chat Interface Component
 * 
 * A reusable chat UI component for interacting with Clara RAG API
 */
class ChatInterface {
    constructor(claraClient, moduleName = 'Module') {
        this.claraClient = claraClient;
        this.moduleName = moduleName;
        this.chatHistory = [];
        this.isOpen = false;
        this.isLoading = false;
        this.chatContainer = null;
        this.messagesContainer = null;
        this.inputField = null;
        this.sendButton = null;
    }

    /**
     * Create and inject the chat interface into the page
     */
    open() {
        if (this.isOpen) {
            return; // Already open
        }

        // Create chat container
        this.chatContainer = document.createElement('div');
        this.chatContainer.id = 'clara-chat-container';
        this.chatContainer.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-content">
                    <h3>💬 Clara AI Chatbot</h3>
                    <span class="chat-module-name">${this.moduleName}</span>
                </div>
                <button class="chat-close-btn" id="chat-close-btn" aria-label="Close chat">×</button>
            </div>
            <div class="chat-messages" id="chat-messages">
                <div class="chat-welcome">
                    <p>👋 Hello! I'm Clara, your AI educational assistant.</p>
                    <p>Ask me anything about <strong>${this.moduleName}</strong> and I'll help you learn!</p>
                </div>
            </div>
            <div class="chat-input-container">
                <input 
                    type="text" 
                    id="chat-input" 
                    class="chat-input" 
                    placeholder="Type your question here..." 
                    autocomplete="off"
                />
                <button id="chat-send-btn" class="chat-send-btn" aria-label="Send message">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        `;

        // Inject into main content area
        const mainContent = document.getElementById('main-content-module');
        const containerC = mainContent?.closest('.containerC');
        
        if (mainContent) {
            mainContent.innerHTML = '';
            mainContent.appendChild(this.chatContainer);
            mainContent.style.display = 'flex';
            // Adjust layout for chat interface - fill container completely
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
        this.messagesContainer = document.getElementById('chat-messages');
        this.inputField = document.getElementById('chat-input');
        this.sendButton = document.getElementById('chat-send-btn');
        const closeButton = document.getElementById('chat-close-btn');

        // Set up event listeners
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        closeButton.addEventListener('click', () => this.close());

        // Load saved state if available
        const hasSavedState = this.loadState();
        
        this.isOpen = true;
        
        // If we have saved state, restore the messages
        if (hasSavedState) {
            this.restoreMessages();
        } else {
            this.inputField.focus();
        }

        // Scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Restore messages from saved chat history
     */
    restoreMessages() {
        if (!this.messagesContainer || !this.chatHistory || this.chatHistory.length === 0) {
            return;
        }

        // Clear welcome message
        this.messagesContainer.innerHTML = '';

        // Restore all messages from history
        this.chatHistory.forEach((msg) => {
            this.addMessage(msg.role, msg.content, false, false);
        });
    }

    /**
     * Close the chat interface
     */
    close() {
        if (!this.isOpen) {
            return;
        }

        // Restore default content and styles
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

        this.chatContainer = null;
        this.messagesContainer = null;
        this.inputField = null;
        this.sendButton = null;
        this.isOpen = false;
    }

    /**
     * Save the current state to localStorage
     */
    saveState() {
        if (this.chatHistory && this.chatHistory.length > 0) {
            const stateKey = `chat_state_${this.moduleName}`;
            const state = {
                chatHistory: this.chatHistory,
                timestamp: Date.now()
            };
            localStorage.setItem(stateKey, JSON.stringify(state));
        }
    }

    /**
     * Load saved state from localStorage
     */
    loadState() {
        const stateKey = `chat_state_${this.moduleName}`;
        const savedState = localStorage.getItem(stateKey);
        
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.chatHistory && Array.isArray(state.chatHistory) && state.chatHistory.length > 0) {
                    this.chatHistory = state.chatHistory;
                    return true;
                }
            } catch (error) {
                console.error('Error loading chat state:', error);
            }
        }
        return false;
    }

    /**
     * Send a message to Clara
     */
    async sendMessage() {
        const message = this.inputField.value.trim();
        
        if (!message || this.isLoading) {
            return;
        }

        // Clear input
        this.inputField.value = '';
        this.inputField.disabled = true;
        this.sendButton.disabled = true;
        this.isLoading = true;

        // Add user message to chat
        this.addMessage('user', message);

        // Add loading indicator
        const loadingId = this.addMessage('assistant', 'Thinking...', true);

        try {
            // Call Clara API
            const response = await this.claraClient.chat(message);
            
            // Remove loading message and add actual response
            this.removeMessage(loadingId);
            this.addMessage('assistant', response);
            
            // Save to history
            this.chatHistory.push({ role: 'user', content: message });
            this.chatHistory.push({ role: 'assistant', content: response });
            
            // Save state after each message
            this.saveState();
            
        } catch (error) {
            // Remove loading message and show error
            this.removeMessage(loadingId);
            this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}. Please try again.`, false, true);
            console.error('Chat error:', error);
        } finally {
            this.inputField.disabled = false;
            this.sendButton.disabled = false;
            this.isLoading = false;
            this.inputField.focus();
        }
    }

    /**
     * Add a message to the chat interface
     * @param {string} role - 'user' or 'assistant'
     * @param {string} content - Message content
     * @param {boolean} isLoading - Whether this is a loading message
     * @param {boolean} isError - Whether this is an error message
     * @returns {string} - Message ID
     */
    addMessage(role, content, isLoading = false, isError = false) {
        if (!this.messagesContainer) {
            return null;
        }

        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message chat-message-${role}`;
        messageDiv.id = messageId;
        
        if (isLoading) {
            messageDiv.classList.add('chat-message-loading');
            messageDiv.innerHTML = `
                <div class="chat-message-content">
                    <div class="chat-typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
        } else {
            const contentClass = isError ? 'chat-message-error' : '';
            messageDiv.innerHTML = `
                <div class="chat-message-content ${contentClass}">
                    ${this.formatMessage(content)}
                </div>
            `;
        }

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageId;
    }

    /**
     * Remove a message from the chat interface
     * @param {string} messageId - ID of message to remove
     */
    removeMessage(messageId) {
        if (!messageId || !this.messagesContainer) {
            return;
        }
        
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            messageElement.remove();
        }
    }

    /**
     * Format message content (basic markdown support)
     * @param {string} content - Raw message content
     * @returns {string} - Formatted HTML
     */
    formatMessage(content) {
        if (!content) {
            return '';
        }

        // Escape HTML first
        let formatted = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Basic markdown-like formatting
        formatted = formatted
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/\n/g, '<br>'); // Line breaks

        return formatted;
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
}

