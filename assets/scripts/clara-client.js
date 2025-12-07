/**
 * Clara RAG API Client
 * 
 * A JavaScript client for interacting with the Clara RAG API endpoints.
 * Based on the API documentation in RAG/README.md
 */
class ClaraClient {
    constructor(baseURL = 'http://localhost:8000') {
        this.baseURL = baseURL;
    }

    /**
     * Test if the RAG API server is accessible
     * @returns {Promise<boolean>} - True if server is accessible
     */
    async testConnection() {
        try {
            // Try to access the FastAPI docs endpoint as a connectivity test
            const response = await fetch(`${this.baseURL}/docs`, {
                method: 'GET',
                mode: 'cors'
            });
            return response.ok || response.status === 200;
        } catch (error) {
            console.warn('Connection test failed:', error);
            return false;
        }
    }

    /**
     * Internal method to make requests to the API
     * @param {string} endpoint - API endpoint path
     * @param {string} query - User query string
     * @returns {Promise<any>} - Response from the API
     */
    async _request(endpoint, query) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Clara Client Error:', error);
            
            // Provide more helpful error messages
            if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message.includes('fetch')) {
                // Check if it's a network/CORS issue
                const errorMsg = `Cannot connect to RAG API server at ${this.baseURL}.\n\nPossible causes:\n1. Server is not running - Start it with: cd RAG && uvicorn main:app --reload --port 8000\n2. CORS issue - Check browser console for CORS errors\n3. Firewall/Network blocking the connection\n\nPlease check the browser console (F12) for more details.`;
                throw new Error(errorMsg);
            }
            
            throw error;
        }
    }

    /**
     * Ask Clara a question and get an answer with context
     * @param {string} userQuery - The user's question
     * @returns {Promise<string>} - Clara's response
     */
    async chat(userQuery) {
        return this._request('/chat/', userQuery);
    }

    /**
     * Generate multiple choice questions for practice
     * @param {string} topic - Topic to generate exercises about
     * @returns {Promise<Array>} - Array of exercise objects
     */
    async generateExercises(topic) {
        return this._request('/exercises/', topic);
    }

    /**
     * Generate revision/study sheets with concepts and explanations
     * @param {string} topic - Topic to create revision sheets for
     * @returns {Promise<Array>} - Array of revision sheet objects
     */
    async generateRevisionSheets(topic) {
        return this._request('/revision/', topic);
    }
}

