# Clara RAG API - Complete Documentation

## 📚 Overview

**Clara** is an educational assistant powered by a **Retrieval-Augmented Generation (RAG)** pipeline built with FastAPI and Azure AI services.

The system combines:
- **Hybrid Semantic Search**: Vector + BM25 + Semantic ranking for intelligent document retrieval
- **Azure OpenAI (Grok-3)**: Context-aware LLM for generating educational content
- **Three Educational Modes**:
  - 💬 **Chat**: Answer questions with relevant context
  - 📝 **Exercises**: Generate practice questions with multiple choice answers
  - 📖 **Revision Sheets**: Create study materials organized by concepts

### Architecture

```
User Query (from Frontend)
    ↓
[FastAPI Endpoint]
    ↓
Hybrid Search Pipeline:
├─→ Generate Embedding (OpenAI)
├─→ Vector Search (Azure Cognitive Search)
├─→ BM25 Keyword Search
└─→ Semantic Reranking
    ↓
Retrieved Context
    ↓
[Grok-3 LLM]
    ├─→ Chat Mode: Natural conversation
    ├─→ Exercises Mode: Generate MCQ
    └─→ Revision Mode: Study sheets
    ↓
Response → Frontend (JSON)
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- FastAPI & Uvicorn
- Azure Cognitive Search instance
- Azure OpenAI (Grok-3 deployment)
- text-embedding-ada-002 embedding model

### Installation

```bash
# Navigate to project directory
cd /home/nathan/Documents/Aivancity/Anglais/EP-S1

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the RAG directory:

```
SEARCH_ENDPOINT=https://<your-search-service>.search.windows.net
SEARCH_API_KEY=<your-search-api-key>
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/openai/v1
AZURE_OPENAI_KEY=<your-openai-api-key>
AOAI_ENDPOINT=https://<your-resource>.openai.azure.com/openai/v1
AOAI_GROK_API_KEY=<your-grok-api-key>
```

### Running the Server

```bash
# From RAG directory
uvicorn main:app --reload --port 8000
```

Server will be available at: `http://localhost:8000`

---

## 📡 API Endpoints

All endpoints accept **POST** requests with JSON payloads and return JSON responses.

### 1. 💬 Chat Endpoint

**Endpoint**: `POST /chat/`

**Purpose**: Answer user questions with context-aware responses

**Request**:
```json
{
  "query": "What's a WAN?"
}
```

**Response**:
```json
"A Wide Area Network (WAN) is a telecommunications network that spans a wide geographic area. It connects multiple Local Area Networks (LANs) across cities, countries, or continents using optical fibers, cables, satellites, or telecom operators..."
```

**JavaScript Example**:
```javascript
async function chat(userQuery) {
  const response = await fetch('http://localhost:8000/chat/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: userQuery })
  });
  
  const answer = await response.json();
  console.log('Clara:', answer);
  return answer;
}

// Usage
chat("What's a WAN?");
```

---

### 2. 📝 Exercises Endpoint

**Endpoint**: `POST /exercises/`

**Purpose**: Generate multiple-choice practice questions based on content

**Request**:
```json
{
  "query": "Generate exercises about WANs"
}
```

**Response**:
```json
[
  {
    "question": "What does WAN stand for?",
    "choices": [
      "Wide Area Network",
      "Wireless Access Network",
      "Web Application Network",
      "Wired Adapter Node"
    ],
    "correct_answer": 0,
    "explanation": "WAN stands for Wide Area Network, which connects multiple LANs across long distances."
  },
  {
    "question": "Which of the following is NOT a WAN infrastructure type?",
    "choices": [
      "Fiber optic cables",
      "Ethernet switches",
      "Satellites",
      "Telecom operators"
    ],
    "correct_answer": 1,
    "explanation": "Ethernet switches are used in LANs, not WANs for long-distance communication."
  }
]
```

**JavaScript Example**:
```javascript
async function generateExercises(topic) {
  const response = await fetch('http://localhost:8000/exercises/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: topic })
  });
  
  const exercises = await response.json();
  console.log('Exercises:', exercises);
  
  // Display exercises
  exercises.forEach((exercise, index) => {
    console.log(`Q${index + 1}: ${exercise.question}`);
    exercise.choices.forEach((choice, i) => {
      console.log(`  ${String.fromCharCode(65 + i)}) ${choice}`);
    });
    console.log(`Answer: ${String.fromCharCode(65 + exercise.correct_answer)}`);
    console.log(`Explanation: ${exercise.explanation}\n`);
  });
  
  return exercises;
}

// Usage
generateExercises("WANs and LANs");
```

---

### 3. 📖 Revision Sheets Endpoint

**Endpoint**: `POST /revision/`

**Purpose**: Generate organized revision/study materials with key concepts

**Request**:
```json
{
  "query": "Create revision sheets for network concepts"
}
```

**Response**:
```json
[
  {
    "title": "Wide Area Network (WAN)",
    "key_concepts": ["long-distance communication", "multiple LANs", "infrastructure"],
    "detailed_explanation": "A WAN is a telecommunications network that spans a wide geographic area. It connects multiple Local Area Networks (LANs) across cities, countries, or continents using various infrastructure including optical fibers, cables, satellites, and telecom operators. Internet is itself an immense WAN connecting millions of LANs globally."
  },
  {
    "title": "Virtual LAN (VLAN)",
    "key_concepts": ["logical segmentation", "security", "virtual networks"],
    "detailed_explanation": "A VLAN allows you to create logically separate networks on the same physical infrastructure. For example, in a university, VLAN 10 for administration, VLAN 20 for professors, and VLAN 30 for students can be configured on the same switch, with proper isolation ensuring a virus in the student VLAN cannot affect administrative servers."
  }
]
```

**JavaScript Example**:
```javascript
async function generateRevisionSheets(topic) {
  const response = await fetch('http://localhost:8000/revision/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: topic })
  });
  
  const sheets = await response.json();
  console.log('Revision Sheets:', sheets);
  
  // Display revision sheets
  sheets.forEach((sheet, index) => {
    console.log(`\n📖 Sheet ${index + 1}: ${sheet.title}`);
    console.log(`Key Concepts: ${sheet.key_concepts.join(', ')}`);
    console.log(`\nExplanation:\n${sheet.detailed_explanation}`);
    console.log('\n' + '─'.repeat(80));
  });
  
  return sheets;
}

// Usage
generateRevisionSheets("Network Infrastructure");
```

---

## 🔌 Complete JavaScript Client Example

Here's a reusable Clara client class for your frontend:

```javascript
class ClaraClient {
  constructor(baseURL = 'http://localhost:8000') {
    this.baseURL = baseURL;
  }

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
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Clara Client Error:', error);
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
   * @param {number} numQuestions - Number of questions (default: 5)
   * @returns {Promise<Array>} - Array of exercise objects
   */
  async generateExercises(topic, numQuestions = 5) {
    const query = `${topic}`;
    return this._request('/exercises/', query);
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

// ============================================
// Usage Examples
// ============================================

const clara = new ClaraClient('http://localhost:8000');

// 1. Simple Chat
async function example1() {
  try {
    const answer = await clara.chat("What's a WAN?");
    console.log('Answer:', answer);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 2. Generate Exercises
async function example2() {
  try {
    const exercises = await clara.generateExercises("Network Concepts");
    
    exercises.forEach((exercise, index) => {
      console.log(`\nQuestion ${index + 1}: ${exercise.question}`);
      exercise.choices.forEach((choice, i) => {
        const letter = String.fromCharCode(65 + i);
        console.log(`  ${letter}. ${choice}`);
      });
      console.log(`Correct Answer: ${String.fromCharCode(65 + exercise.correct_answer)}`);
      console.log(`Explanation: ${exercise.explanation}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// 3. Generate Revision Sheets
async function example3() {
  try {
    const sheets = await clara.generateRevisionSheets("OSI Model");
    
    sheets.forEach((sheet, index) => {
      console.log(`\n=== Revision Sheet ${index + 1} ===`);
      console.log(`Title: ${sheet.title}`);
      console.log(`Key Concepts: ${sheet.key_concepts.join(', ')}`);
      console.log(`\n${sheet.detailed_explanation}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run examples (uncomment to use)
// example1();
// example2();
// example3();
```

---

## 🏗️ Project Structure

```
RAG/
├── main.py                 # FastAPI app setup
├── .env                    # Environment variables (not in git)
├── routes/
│   ├── chat.py            # Chat endpoint
│   ├── exercises.py       # Exercises endpoint
│   └── revision.py        # Revision sheets endpoint
├── services/
│   ├── hybrid_retrieval.py # Hybrid search client
│   ├── LLM_call.py        # Grok-3 LLM client
│   └── __init__.py        # Service initialization
└── README.md              # This file
```

### Services Overview

#### HybridSearchClient (`hybrid_retrieval.py`)

Core search functionality:

- **search(query, top=7)**: Performs hybrid semantic search
- **get_embedding_vector(text)**: Generates OpenAI embeddings
- **getAllDocumentsFromUser(user_id)**: Retrieves all user documents

**Key Features**:
- Vector search with HNSW algorithm for fast approximate nearest neighbors
- BM25 keyword matching for traditional full-text search
- Semantic reranking using Azure's deep language understanding
- Automatic caption generation with highlighted passages
- Support for blob storage metadata (path, content type, etc.)

#### GrokClient (`LLM_call.py`)

LLM interaction with behavior control:

- **call_grok(query, system_context, doc_context)**: Base LLM call with full control
- **chatWithGrok(query, context)**: Answer questions concisely
- **generateExercises(query, context, n_questions)**: Create MCQs
- **generateRevisionSheets(query, context)**: Generate study materials

**System Context Control**:
Each function uses specific system prompts to control Clara's behavior:
- Chat: Concise, clear answers
- Exercises: Structured JSON with plausible incorrect options
- Revision: Organized concepts with clear explanations

---

## 🔄 Request/Response Flow

### Example: Complete Chat Flow

```
Frontend (JavaScript)
    ↓
POST /chat/ { "query": "What's a WAN?" }
    ↓
FastAPI Route (chat.py)
    ├─→ Extract query: "What's a WAN?"
    ├─→ HybridSearchClient.search(query)
    │   ├─→ Generate embedding
    │   ├─→ Vector search
    │   ├─→ BM25 search
    │   └─→ Semantic reranking
    │   Returns: { total_count: 5, results: [...], answers: [...] }
    │
    ├─→ Extract top 5 content chunks
    ├─→ GrokClient.chatWithGrok(query, context)
    │   └─→ Call Grok-3 API
    │   Returns: "A WAN is a Wide Area Network..."
    │
    └─→ Return response to frontend

Frontend receives answer as JSON string
```

---

## 📊 Understanding Data Structures

### Search Result Structure

When `search()` is called internally, it returns:

```python
{
  "total_count": 13,  # Total matching documents
  "answers": [        # Semantic answers
    {
      "score": 0.95,
      "text": "WAN is a Wide Area Network...",
      "highlights": "...WAN relie plusieurs..."
    }
  ],
  "results": [        # Ranked documents
    {
      "search_score": 0.0167,           # BM25 keyword relevance
      "reranker_score": 2.186,          # Semantic relevance
      "title": "Network_Concepts.md",
      "content": "### WAN (Wide Area Network)...",
      "storage_path": "blob://...",
      "content_type": "text/markdown",
      "caption": "...",
      "caption_highlights": "..."
    }
  ]
}
```

### Exercise Structure

```json
{
  "question": "What does WAN stand for?",
  "choices": [
    "Wide Area Network",
    "Wireless Access Network",
    "Web Application Network",
    "Wired Adapter Node"
  ],
  "correct_answer": 0,
  "explanation": "WAN stands for Wide Area Network..."
}
```

### Revision Sheet Structure

```json
{
  "title": "Wide Area Network",
  "key_concepts": ["long-distance", "multiple LANs"],
  "detailed_explanation": "..."
}
```

---

## 🔧 Troubleshooting

### Server Won't Start
```bash
# Check port availability
lsof -i :8000

# Use different port
uvicorn main:app --port 8001 --reload
```

### CORS Issues (if frontend on different domain)

Add to `main.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### API Returns 500 Error
```bash
# Check environment variables
env | grep -i azure
env | grep -i search

# Check .env file exists
cat /home/nathan/Documents/Aivancity/Anglais/EP-S1/RAG/.env
```

### Embedding Generation Fails
- Verify `AZURE_OPENAI_ENDPOINT` uses `/openai/v1` suffix
- Check `text-embedding-ada-002` deployment exists
- Ensure API keys are valid and not expired

### No Search Results
- Verify index name: `azureblob-index`
- Check semantic configuration exists
- Ensure documents are indexed with `text_vector` field
- Verify `content` field is populated in documents

---

## 🚀 Performance Optimization

### Frontend Caching Strategy

```javascript
class ClaraCached extends ClaraClient {
  constructor(baseURL = 'http://localhost:8000') {
    super(baseURL);
    this.cache = new Map();
    this.cacheTimeout = 1000 * 60 * 60; // 1 hour
  }

  async chat(userQuery) {
    const cacheKey = `chat:${userQuery}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }
    
    const result = await super.chat(userQuery);
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }

  clearCache() {
    this.cache.clear();
  }
}

const clara = new ClaraCached();
```

### Batch Requests

```javascript
async function batchQueries(queries) {
  const results = await Promise.all(
    queries.map(query => clara.chat(query))
  );
  return results;
}
```

---

## 📚 References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Azure Cognitive Search](https://learn.microsoft.com/en-us/azure/search/)
- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Hybrid Search Overview](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
- [JavaScript Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

## 📄 License

Internal Project - Aivancity

---

**Last Updated**: December 6, 2025  
**Status**: Production Ready
