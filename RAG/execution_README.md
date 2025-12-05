# Hybrid Semantic Search - Documentation

## Overview

This module implements **hybrid semantic search** combining three search techniques:

1. **Vector Search**: Uses embeddings (text-embedding-ada-002) to find semantically similar documents
2. **Semantic Ranking**: Azure's semantic reranker scores and prioritizes results by relevance
3. **BM25 Keyword Matching**: Traditional full-text search for keyword-based matching

The result is a powerful RAG (Retrieval-Augmented Generation) system that retrieves contextually relevant documents.

---

## Architecture

```
User Query
    ↓
├─→ Generate Embedding (OpenAI)
│   ↓
├─→ Vector Search (Azure Cognitive Search)
│   ↓
├─→ BM25 Keyword Search
│   ↓
└─→ Semantic Reranking
    ↓
Ranked Results + Semantic Answers
```

---

## Setup

### 1. Prerequisites

- Python 3.8+
- Azure Cognitive Search instance with a configured index
- Azure OpenAI with text-embedding-ada-002 deployment
- Environment variables properly configured

### 2. Installation

```bash
pip install -r requirements.txt
```

### 3. Environment Variables

Create a `.env` file in the project root with:

```
SEARCH_ENDPOINT=https://<your-search-service>.search.windows.net
SEARCH_API_KEY=<your-search-api-key>
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/openai/v1
AZURE_OPENAI_KEY=<your-openai-api-key>
```

**⚠️ Important**: 
- Use your Azure resource endpoint (not the Studio project URL)
- Keep these keys secure - never commit to version control
- Use .gitignore to exclude .env files

### 4. Index Configuration

Your Azure Cognitive Search index must have:

```json
{
  "fields": [
    {
      "name": "text_vector",
      "type": "Collection(Edm.Single)",
      "searchable": true,
      "retrievable": true,
      "dimensions": 1536,
      "vectorSearchProfile": "myHnsw"
    },
    {
      "name": "chunk",
      "type": "Edm.String",
      "searchable": true,
      "retrievable": true
    },
    {
      "name": "title",
      "type": "Edm.String",
      "searchable": true,
      "retrievable": true
    }
  ]
}
```

---

## Usage

### Basic Usage

```python
from hybrid_retrieval import HybridSearchClient

# Initialize client
client = HybridSearchClient()

# Perform search
results = client.search("What's a WAN?", top=7)

# Print formatted results
client.print_results(results)
```

### Advanced Usage - Accessing Raw Data

```python
results = client.search("Your query here")

# Access semantic answers
for answer in results["answers"]:
    print(f"Answer: {answer['text']}")
    print(f"Score: {answer['score']}")

# Access ranked documents
for doc in results["results"]:
    print(f"Title: {doc['title']}")
    print(f"Reranker Score: {doc['reranker_score']}")
    print(f"Content: {doc['chunk']}")
```

---

## Search Result Format

### Response Structure

```python
{
    "total_count": 13,  # Total matching documents
    "answers": [
        {
            "score": 0.95,
            "text": "WAN (Wide Area Network) is...",
            "highlights": "...WAN relie plusieurs LAN..."
        }
    ],
    "results": [
        {
            "search_score": 0.0167,          # BM25 score
            "reranker_score": 2.186,         # Semantic reranker score
            "title": "Reseaux Informatiques",
            "chunk": "### WAN (Wide Area Network)...",
            "chunk_id": "5775c9e30b60_...",
            "parent_id": "aHR0cHM6...",
            "caption": "### WAN (Wide Area Network)...",
            "caption_highlights": "...WAN..."
        }
    ]
}
```

### Interpreting Scores

- **search_score**: BM25 keyword relevance (0-1). Higher = more keyword matches
- **reranker_score**: Semantic relevance after reranking (0-4). Higher = more semantically relevant
- **answer score**: Semantic answer extraction confidence (0-1)

**Note**: Reranker scores can exceed 1 and are used primarily for relative ranking within results.

---

## How It Works

### 1. Query Embedding
When you search for "What's a WAN?":
- Text is sent to Azure OpenAI
- Returns 1536-dimensional embedding vector
- Example: `[0.0095, -0.0142, 0.0234, ...]`

### 2. Vector Search
- Azure Cognitive Search finds 5 closest vectors using HNSW algorithm
- Returns documents with high embedding similarity
- Fast approximate nearest neighbor search

### 3. BM25 Keyword Matching
- Traditional full-text search on all indexed fields
- Matches exact keywords in your query
- Complements semantic search for exact phrase matches

### 4. Semantic Ranking
- Azure's semantic reranker re-scores all results
- Uses deep language understanding (not just embeddings)
- Extracts semantic answers from top results
- Generates captions with highlighted relevant passages

### 5. Result Combination
- Results are merged and re-ranked by semantic score
- Semantic answers are extracted if high confidence
- Top results + answers returned to user

---

## Example: RAG Pipeline

```python
from hybrid_retrieval import HybridSearchClient

client = HybridSearchClient()

# User question
user_query = "How do VLANs improve network security?"

# Retrieve relevant documents
search_results = client.search(user_query, top=5)

# Extract top answer and context
semantic_answer = search_results["answers"][0]["text"] if search_results["answers"] else None
context_chunks = [doc["chunk"] for doc in search_results["results"][:3]]

# Pass to LLM for generation
prompt = f"""
Context:
{chr(10).join(context_chunks)}

Question: {user_query}

Answer:
"""

# Use your LLM (e.g., GPT-4, Grok) to generate final response
```

---

## Troubleshooting

### Error: "Missing environment variables"
**Solution**: Verify all variables are in `.env` and `load_dotenv()` is called

### Error: "Embedding request failed"
**Solution**: Check that:
- AZURE_OPENAI_ENDPOINT is correct format (ends with `/openai/v1`)
- AZURE_OPENAI_KEY is valid
- text-embedding-ada-002 deployment exists

### Error: "Index not found"
**Solution**: 
- Verify index_name matches your Azure Cognitive Search index
- Check that SEARCH_ENDPOINT and SEARCH_API_KEY are correct

### No semantic answers returned
**Possible causes**:
- Semantic configuration not enabled on index
- semantic_configuration_name doesn't match your configuration
- Results don't contain extractable answers

### Low reranker scores
**Possible reasons**:
- Query is too vague or doesn't match document content
- Index doesn't contain relevant documents
- Semantic configuration needs tuning

---

## Performance Tips

1. **Optimize vector field**: Use HNSW algorithm for faster searches
2. **Set appropriate k_nearest_neighbors**: Balance speed vs recall (5-10 is typical)
3. **Cache embeddings**: If searching same queries repeatedly, cache results
4. **Batch searches**: Use batch API calls for multiple queries
5. **Index tuning**: Ensure index is properly optimized and replicated

---

## Cost Considerations

- **Azure Cognitive Search**: Charged per search operation
- **OpenAI Embeddings**: Charged per 1K tokens (~4 chars)
- **Semantic ranking**: Additional cost on top of search

For cost optimization:
- Cache embeddings for frequently used queries
- Adjust `top` parameter to minimum needed
- Consider using smaller embedding models if accuracy allows

---

## References

- [Azure Cognitive Search Documentation](https://learn.microsoft.com/en-us/azure/search/)
- [Semantic Search Documentation](https://learn.microsoft.com/en-us/azure/search/semantic-search-overview)
- [Azure OpenAI Embeddings](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#embeddings)
- [Vector Search in Azure](https://learn.microsoft.com/en-us/azure/search/vector-search-overview)

---
