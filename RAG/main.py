"""
Main RAG Pipeline - Hybrid Search + LLM Generation

This is the main entry point that demonstrates the full RAG pipeline:
1. Hybrid semantic search to retrieve relevant documents
2. LLM generation using Grok-3 with retrieved context
"""

import sys
from RAG import HybridSearchClient
from RAG import GrokClient


def run_test_rag_pipeline(user_query: str, top_results: int = 5):
    """
    Execute the full RAG pipeline: search + generation.
    
    Args:
        user_query (str): User's question
        top_results (int): Number of top results to retrieve and use as context
    
    Returns:
        dict: Contains search results and LLM response
    """
    print("=" * 60)
    print(f"🔍 RAG PIPELINE - Query: '{user_query}'")
    print("=" * 60)
    
    try:
        # Step 1: Initialize search client
        print("\n📚 Step 1: Initializing Hybrid Search...")
        search_client = HybridSearchClient()
        
        # Step 2: Perform hybrid search
        print(f"🔎 Step 2: Searching for relevant documents...")
        search_results = search_client.search(user_query, top=top_results)
        
        print(f"✅ Found {search_results['total_count']} matching documents\n")
        
        # Step 3: Display search results
        print("📄 Search Results:")
        print("-" * 60)
        search_client.print_results(search_results)
        
        # Step 4: Extract context from top results
        print("\n🧠 Step 3: Generating response with Grok-3...")
        context_chunks = [
            doc['content'] for doc in search_results['results'][:top_results]
            if doc.get('content')
        ]
        
        # Step 5: Initialize LLM client
        grok_client = GrokClient()
        
        # Step 6: Call Grok with context (RAG)
        llm_response = grok_client.call_grok_with_rag(user_query, context_chunks)
        
        # Step 7: Display LLM response
        print("\n💡 LLM Response:")
        print("-" * 60)
        print(llm_response)
        print("-" * 60)
        
        return {
            "query": user_query,
            "search_results": search_results,
            "llm_response": llm_response
        }
    
    except Exception as e:
        print(f"\n❌ Error in RAG pipeline: {str(e)}")
        sys.exit(1)


def main():
    """Main entry point for testing the RAG pipeline."""
    
    # Example queries to test
    queries = [
        "I'd love to learn wushu, what'd be the best first move to learn?",
        "What's a WAN?",
        "How do VLANs improve network security?",
        "Explain the difference between LAN and WAN"
    ]
    
    # Run pipeline with first query
    user_query = queries[0]
    
    print("\n")
    print("🚀 Starting RAG Pipeline...\n")
    
    result = run_test_rag_pipeline(user_query, top_results=5)

    print(result["llm_response"])
    
    print("\n" + "=" * 60)
    print("✨ RAG Pipeline completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()