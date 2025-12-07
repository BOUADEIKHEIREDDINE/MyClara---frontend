"""
Hybrid Semantic Search with Azure Cognitive Search and OpenAI Embeddings

This module performs hybrid search combining:
- Vector search (using OpenAI embeddings)
- Semantic search (using Azure's semantic reranker)
- BM25 keyword matching

Configuration is managed via environment variables.
See README.md for setup instructions.
"""

import os
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class HybridSearchClient:
    """
    Client for performing hybrid semantic search on Azure Cognitive Search.
    
    Combines vector search (embeddings), semantic ranking, and BM25 keyword matching
    to retrieve and rank relevant documents.
    """

    def __init__(self):
        """Initialize the search client with Azure credentials and configuration."""
        self.search_endpoint = os.getenv("SEARCH_ENDPOINT")
        self.search_api_key = os.getenv("SEARCH_API_KEY")
        self.openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.openai_api_key = os.getenv("AZURE_OPENAI_KEY")
        
        self.index_name = "azureblob-index"
        self.semantic_config_name = "azureblob-index-semantic-configuration"
        self.embedding_deployment = "text-embedding-ada-002"
        
        # Index field mappings for blob storage
        self.vector_field = "text_vector"
        self.content_field = "content"
        self.title_field = "metadata_storage_name"
        self.chunk_field = "content"
        
        # Validate required environment variables
        self._validate_config()
        
        # Initialize Azure Search client
        self.search_client = SearchClient(
            endpoint=self.search_endpoint,
            index_name=self.index_name,
            credential=AzureKeyCredential(self.search_api_key)
        )
        
        # Initialize OpenAI client for embeddings
        self.openai_client = OpenAI(
            base_url=self.openai_endpoint,
            api_key=self.openai_api_key
        )

    def _validate_config(self):
        """Validate that all required environment variables are set."""
        required_vars = {
            "SEARCH_ENDPOINT": self.search_endpoint,
            "SEARCH_API_KEY": self.search_api_key,
            "AZURE_OPENAI_ENDPOINT": self.openai_endpoint,
            "AZURE_OPENAI_KEY": self.openai_api_key,
        }
        
        missing_vars = [var for var, value in required_vars.items() if not value]
        if missing_vars:
            raise EnvironmentError(
                f"Missing environment variables: {', '.join(missing_vars)}\n"
                "Please check your .env file."
            )

    def get_embedding_vector(self, text: str) -> list:
        """
        Generate an embedding vector for the given text using Azure OpenAI.
        
        Args:
            text (str): The text to embed.
            
        Returns:
            list: The embedding vector.
            
        Raises:
            Exception: If the embedding request fails.
        """
        try:
            response = self.openai_client.embeddings.create(
                input=text,
                model=self.embedding_deployment
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error generating embedding: {e}")
            raise

    def search(self, query: str, top: int = 7) -> dict:
        """
        Perform hybrid semantic search on the index.
        
        The search combines:
        - Vector search using embedding similarity
        - Semantic ranking to re-rank results by relevance
        - BM25 keyword matching for additional relevance
        
        Args:
            query (str): The search query (can be natural language).
            top (int): Maximum number of results to return (default: 7).
            
        Returns:
            dict: Search results containing:
                - 'answers': Semantic answers extracted from top results
                - 'results': Ranked documents with scores and metadata
                - 'total_count': Total number of matching documents
                
        Raises:
            Exception: If the search fails.
        """
        try:
            # Step 1: Generate embedding vector for the query
            vector = self.get_embedding_vector(query)
            
            # Step 2: Create vector query
            vector_query = VectorizedQuery(
                vector=vector,
                k_nearest_neighbors=5,
                fields=self.vector_field,
                kind="vector",
                exhaustive=True
            )
            
            # Step 3: Execute hybrid search
            results = self.search_client.search(
                include_total_count=True,
                search_text=query,  # BM25 keyword search
                # filter=f"{self.auth_field} eq {self.user_id}",
                query_type="semantic",  # Enable semantic ranking
                semantic_configuration_name=self.semantic_config_name,
                top=top,
                vector_queries=[vector_query]  # Add vector search
            )
            
            # Step 4: Process and format results
            return self._format_results(results)
            
        except Exception as e:
            print(f"Semantic hybrid search failed: {e}")
            raise

    def getAllDocumentsFromUser(self, user_id:str) -> str:
        """
        Retrieves all documents' content from a specific user
        
        :param user_id: metadata_author saved in the server
        :type user_id: str
        :return: A string with the text
        :rtype: str
        """
        results = self.search_client.search(
            top=100,
        )
        return "\n".join([result["content"] for result in results])

    def _format_results(self, results) -> dict:
        """
        Format raw search results into a structured dictionary.
        
        Args:
            results: Raw Azure Search results object.
            
        Returns:
            dict: Formatted results with answers and documents.
        """
        formatted_results = {
            "total_count": results.get_count(),
            "answers": [],
            "results": []
        }
        
        # Extract semantic answers (if available)
        answers = results.get_answers()
        if answers:
            for answer in answers:
                formatted_results["answers"].append({
                    "score": answer.score,
                    "text": answer.text,
                    "highlights": answer.highlights
                })
        
        # Extract and format ranked results
        for result in results:
            # Extract captions if available
            caption_text = None
            caption_highlights = None
            captions = result.get("@search.captions")
            if captions:
                caption_text = captions[0].get("text")
                caption_highlights = captions[0].get("highlights")
            
            formatted_result = {
                "search_score": result.get("@search.score"),
                "reranker_score": result.get("@search.rerankerScore"),
                "title": result.get("metadata_storage_name"),
                "content": result.get("content"),
                "chunk_id": result.get("chunk_id"),
                "storage_path": result.get("metadata_storage_path"),
                "content_type": result.get("metadata_content_type"),
                "caption": caption_text,
                "caption_highlights": caption_highlights
            }
            formatted_results["results"].append(formatted_result)
        
        return formatted_results

    def print_results(self, results: dict):
        """
        Pretty-print search results.
        
        Args:
            results (dict): Formatted search results from the search() method.
        """
        print(f"\n{'='*80}")
        print(f"Total documents found: {results['total_count']}")
        print(f"{'='*80}\n")
        
        # Print semantic answers
        if results["answers"]:
            print("🎯 SEMANTIC ANSWERS")
            print("-" * 80)
            for i, answer in enumerate(results["answers"], 1):
                print(f"\nAnswer {i} (Score: {answer['score']:.4f})")
                print(f"Text: {answer['text'][:300]}...")
                if answer["highlights"]:
                    print(f"Highlights: {answer['highlights'][:200]}...")
            print("\n" + "=" * 80 + "\n")
        
        # Print ranked results
        if results["results"]:
            print("📄 RANKED RESULTS")
            print("-" * 80)
            for i, result in enumerate(results["results"], 1):
                print(f"\nResult {i}")
                print(f"  Search Score: {result['search_score']:.4f}")
                if result['reranker_score']:
                    print(f"  Reranker Score: {result['reranker_score']:.4f}")
                print(f"  Title: {result['title']}")
                print(f"  Path: {result['storage_path']}")
                print(f"  Type: {result['content_type']}")
                
                if result["caption"]:
                    print(f"  Caption: {result['caption'][:200]}...")
                
                if result["content"]:
                    print(f"  Content: {result['content'][:300]}...")

                print()