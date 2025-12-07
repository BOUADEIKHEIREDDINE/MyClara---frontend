# MyClara - Frontend

MyClara is an educational platform that allows teachers to create classes and modules, and students to access and manage their learning materials. The platform now includes **Clara**, an AI-powered educational assistant with RAG (Retrieval-Augmented Generation) capabilities for interactive learning.

## ✨ Features

- **📚 Module & Class Management**: Teachers create classes and modules, students enroll and access content
- **💬 AI Chatbot**: Interactive chat with Clara AI for answering questions about course content
- **📝 Practice Exercises**: Generate multiple-choice questions for practice and assessment
- **📖 Lesson Schematiser**: Create visual mindmaps for revision and study materials
- **📁 File Management**: Upload and organize learning materials (PDFs, documents, etc.)

## Prerequisites

### Required Software

1. **XAMPP** (or similar local server environment)
   - Download from: https://www.apachefriends.org/
   - Includes Apache web server and MySQL database

2. **Python 3.8+** (for RAG API server)
   - Download from: https://www.python.org/downloads/
   - Make sure Python is added to your system PATH

### Required Services

- **Azure Cognitive Search** instance (for document search)
- **Azure OpenAI** account with:
  - Grok-3 deployment
  - text-embedding-ada-002 embedding model deployment

## Setup Instructions

### 1. Install XAMPP

1. Download and install XAMPP from the official website
2. During installation, make sure to install:
   - **Apache** (web server)
   - **MySQL** (database server)

### 2. Start XAMPP Services

1. Open the **XAMPP Control Panel**
2. Click **Start** next to:
   - **Apache** (web server)
   - **MySQL** (database server)
3. Both services should show a green status when running

### 3. Copy Project Files to htdocs

1. Navigate to your XAMPP installation directory (usually `C:\xampp\` on Windows)
2. Open the `htdocs` folder
3. Copy the entire `MyClara---frontend` folder into `htdocs`
4. Copy the `myclara-api` folder (backend API) into `htdocs` as well

Your `htdocs` folder structure should look like this:
```
C:\xampp\htdocs\
├── MyClara---frontend\
│   ├── assets\
│   ├── RAG\
│   ├── index.html
│   ├── student-dashboard.html
│   ├── teacher-create-class.html
│   └── ... (other frontend files)
└── myclara-api\
    ├── db_config.php
    ├── list_student_modules.php
    ├── create_module_with_files.php
    └── ... (other PHP API files)
```

### 4. Database Configuration

1. Open **phpMyAdmin** (usually accessible at `http://localhost/phpmyadmin`)
2. Create a database named `myclara` (or update the database name in `myclara-api/db_config.php` if you use a different name)
3. Import any SQL schema files if provided
4. Update database credentials in `myclara-api/db_config.php` if needed:
   ```php
   $host = 'localhost';
   $dbname = 'myclara';
   $username = 'root';
   $password = ''; // Default XAMPP MySQL password is empty
   ```

### 5. Setup RAG API Server (Clara AI)

The RAG API server provides AI-powered features like chat, exercises, and revision sheets.

#### 5.1 Install Python Dependencies

1. Open a terminal/command prompt
2. Navigate to the RAG folder:
   ```bash
   cd C:\xampp\htdocs\MyClara---frontend\RAG
   ```
3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
   
   This will install:
   - FastAPI (web framework)
   - Uvicorn (ASGI server)
   - OpenAI (for Azure OpenAI integration)
   - Azure Search Documents (for hybrid search)
   - Python-dotenv (for environment variables)

#### 5.2 Configure Environment Variables

1. In the `RAG` folder, you should have an `env` file (not `.env`)
2. Update the `env` file with your Azure credentials:
   ```
   SEARCH_ENDPOINT="https://your-search-service.search.windows.net"
   SEARCH_API_KEY="your-search-api-key"
   AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/openai/v1"
   AOAI_ENDPOINT="https://your-resource.openai.azure.com/openai/v1"
   AZURE_OPENAI_KEY="your-openai-api-key"
   AOAI_GROK_API_KEY="your-grok-api-key"
   ```
   
   **Important**: 
   - Remove any spaces around the `=` sign (e.g., use `KEY="value"` not `KEY = "value"`)
   - Make sure all endpoints include `/openai/v1` suffix
   - The file should be named `env` (not `.env`) based on the current configuration

#### 5.3 Start the RAG API Server

1. In a terminal, navigate to the RAG folder:
   ```bash
   cd C:\xampp\htdocs\MyClara---frontend\RAG
   ```

2. Start the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

3. You should see output like:
   ```
   INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
   INFO:     Started reloader process
   INFO:     Started server process
   INFO:     Waiting for application startup.
   INFO:     Application startup complete.
   ```

4. Verify the server is running by opening `http://localhost:8000/docs` in your browser. You should see the FastAPI interactive documentation.

**Keep this terminal window open** - the RAG server must be running for AI features to work.

### 6. Access the Application

1. Open your web browser
2. Navigate to: `http://localhost/MyClara---frontend/`
3. You should see the MyClara homepage

## Project Structure

```
MyClara---frontend/
├── assets/
│   ├── icons/              # SVG icons
│   ├── images/             # Images and logos
│   ├── libs/               # Local JavaScript libraries (d3.js, markmap)
│   ├── scripts/            # JavaScript files
│   │   ├── clara-client.js        # RAG API client
│   │   ├── chat-interface.js      # Chat UI component
│   │   ├── exercises-interface.js # Exercises UI component
│   │   ├── revision-interface.js  # Revision sheets UI component
│   │   └── ... (other scripts)
│   └── styles/             # CSS stylesheets
├── RAG/                    # RAG API server
│   ├── main.py            # FastAPI application
│   ├── env                # Environment variables
│   ├── requirements.txt   # Python dependencies
│   ├── routes/            # API endpoints
│   │   ├── chat.py
│   │   ├── exercises.py
│   │   └── revision.py
│   ├── services/          # Business logic
│   │   ├── hybrid_retrieval.py
│   │   └── LLM_call.py
│   └── script.js          # Mindmap conversion utilities
├── myclara-api/           # PHP backend API
├── index.html             # Homepage
├── student-dashboard.html
├── teacher-dashboard.html
└── ... (other HTML pages)
```

## Running the Application

### Required Services

For the application to function fully, you need **three services running simultaneously**:

1. **Apache** (from XAMPP) - Port 80
   - Serves the frontend HTML/CSS/JavaScript files
   - Serves the PHP API endpoints

2. **MySQL** (from XAMPP) - Port 3306
   - Stores user data, modules, classes, etc.

3. **RAG API Server** (Python/FastAPI) - Port 8000
   - Provides AI features (Chat, Exercises, Revision Sheets)
   - Must be started manually in a terminal

### Starting Everything

1. **Start XAMPP Services**:
   - Open XAMPP Control Panel
   - Start Apache
   - Start MySQL

2. **Start RAG API Server**:
   ```bash
   cd C:\xampp\htdocs\MyClara---frontend\RAG
   uvicorn main:app --reload --port 8000
   ```

3. **Access the Application**:
   - Open browser: `http://localhost/MyClara---frontend/`

## AI Features (Clara RAG)

The platform includes three AI-powered learning modes accessible from the student and teacher dashboards:

### 💬 AI Chatbot
- Ask questions about course content
- Get context-aware answers based on uploaded materials
- Conversation history is saved per module

### 📝 Practice Exercises
- Generate multiple-choice questions on any topic
- Practice with instant feedback
- Track progress and answers
- State is saved when switching between features

### 📖 Lesson Schematiser
- Create visual mindmaps from revision sheets
- Organize key concepts hierarchically
- Interactive mindmap visualization
- State is saved when switching between features

All AI features require the RAG API server to be running on `http://localhost:8000`.

## API Endpoints

### PHP Backend API (`myclara-api/`)
Located in `myclara-api/` and provides endpoints for:
- User authentication (login, signup)
- Module management (create, list, delete)
- Class management (create, list, delete)
- File uploads and management
- Student enrollment

### RAG API (`http://localhost:8000`)
Located in `RAG/` and provides AI endpoints:
- `POST /chat/` - Chat with Clara AI
- `POST /exercises/` - Generate practice exercises
- `POST /revision/` - Generate revision sheets (mindmaps)

See `RAG/README.md` for detailed API documentation.

## Troubleshooting

### Apache/MySQL won't start
- Check if ports 80 (Apache) and 3306 (MySQL) are already in use
- Stop other services using these ports or change XAMPP port settings

### Database connection errors
- Verify MySQL is running in XAMPP Control Panel
- Check database credentials in `myclara-api/db_config.php`
- Ensure the database exists in phpMyAdmin

### RAG API Server won't start

**Error: "uvicorn is not recognized"**
- Install Python dependencies: `cd RAG && pip install -r requirements.txt`

**Error: "Port 8000 already in use"**
- Stop other services using port 8000, or use a different port:
  ```bash
  uvicorn main:app --reload --port 8001
  ```
  Then update `RAG_API_BASE_URL` in dashboard JavaScript files to use port 8001

**Error: "AOAI_ENDPOINT and AOAI_GROK_API_KEY must be set"**
- Check that the `env` file exists in the `RAG` folder
- Verify all environment variables are set correctly (no spaces around `=`)
- Ensure the file is named `env` (the code loads from this filename)

### AI Features not working

**Error: "Failed to fetch" or "Cannot connect to RAG API server"**
1. Verify the RAG server is running:
   - Check terminal where you started `uvicorn`
   - Visit `http://localhost:8000/docs` to verify server is accessible
   
2. Check browser console (F12) for CORS errors
   - CORS is already configured, but check if there are any error messages

3. Verify libraries are loaded:
   - Check browser console for any JavaScript errors
   - Verify `assets/libs/d3.min.js` and `assets/libs/markmap-view.min.js` exist

**Mindmap not displaying**
- Check browser console for errors
- Verify markmap libraries are loaded (should be in `assets/libs/`)
- Ensure revision sheets were generated successfully

### Files not loading
- Make sure both Apache and MySQL are running
- Check browser console for errors (F12)
- Verify file paths are correct

### CORS errors
- Ensure the API folder is in the same `htdocs` directory
- Check that API endpoints are accessible at `http://localhost/myclara-api/`
- Verify RAG API server CORS configuration in `RAG/main.py`

## Development

### Technology Stack

**Frontend:**
- Vanilla JavaScript (no frameworks)
- HTML/CSS
- Local libraries: d3.js, markmap-view

**Backend:**
- PHP for REST API (`myclara-api/`)
- MySQL for database
- Python/FastAPI for RAG API (`RAG/`)

**AI Services:**
- Azure Cognitive Search (hybrid semantic search)
- Azure OpenAI (Grok-3 for content generation)
- text-embedding-ada-002 (for embeddings)

### Local Libraries

The application uses local copies of JavaScript libraries (stored in `assets/libs/`):
- `d3.min.js` - D3.js version 7 (for data visualization)
- `markmap-view.min.js` - Markmap library (for mindmap visualization)

These are loaded from local files instead of CDN for better reliability.

## Notes

- The frontend communicates with the backend API via fetch requests
- User session data is stored in `localStorage`
- File uploads are handled through PHP endpoints in `myclara-api/`
- AI features (chat, exercises, revision) are handled by the RAG API server
- All interfaces (chat, exercises, revision) save their state automatically
- State is preserved when switching between different learning modes
- The RAG server must be running for AI features to work

## Quick Start Checklist

- [ ] XAMPP installed and Apache/MySQL running
- [ ] Project files copied to `htdocs`
- [ ] Database created and configured
- [ ] Python 3.8+ installed
- [ ] RAG dependencies installed (`pip install -r RAG/requirements.txt`)
- [ ] RAG environment variables configured (`RAG/env` file)
- [ ] RAG API server running (`uvicorn main:app --reload --port 8000`)
- [ ] Application accessible at `http://localhost/MyClara---frontend/`
- [ ] Can access RAG API docs at `http://localhost:8000/docs`

## Additional Resources

- **RAG API Documentation**: See `RAG/README.md` for detailed API documentation
- **FastAPI Docs**: Available at `http://localhost:8000/docs` when RAG server is running
