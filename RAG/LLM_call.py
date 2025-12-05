"""
LLM Call Module - Interface with Azure OpenAI (Grok-3)

This module provides a clean interface to call the Grok-3 model
with context from hybrid semantic search results.
"""

from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()


class GrokClient:
    """
    Client for calling Azure OpenAI Grok-3 model.
    
    Provides methods for generating responses with optional context
    from retrieved documents (RAG pattern).
    """

    def __init__(self):
        """Initialize the Grok client with Azure OpenAI configuration."""
        self.endpoint = os.getenv("AOAI_ENDPOINT")
        self.api_key = os.getenv("AOAI_GROK_API_KEY")
        self.deployment_name = "grok-3"
        
        if not self.endpoint or not self.api_key:
            raise EnvironmentError("AOAI_ENDPOINT and AOAI_GROK_API_KEY must be set in .env")
        
        self.client = OpenAI(
            base_url=self.endpoint,
            api_key=self.api_key
        )

    def call_grok(self, user_query: str, context: str = None) -> str:
        """
        Call Grok-3 model with optional context.
        
        Args:
            user_query (str): The user's question or prompt
            context (str, optional): Retrieved context from documents for RAG
        
        Returns:
            str: Model's response
        
        Example:
            >>> client = GrokClient()
            >>> response = client.call_grok("What's a WAN?")
            >>> print(response)
        """
        # Build the prompt with context if provided
        if context:
            prompt = f"""Context:
{context}

Question: {user_query}

Please answer based on the context provided."""
        else:
            prompt = user_query

        try:
            completion = self.client.chat.completions.create(
                model=self.deployment_name,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant providing accurate technical information."
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                temperature=0.7,
                max_tokens=1000,
            )

            return completion.choices[0].message.content
        
        except Exception as e:
            raise RuntimeError(f"Grok API call failed: {str(e)}")

    def call_grok_with_rag(self, user_query: str, retrieved_chunks: list) -> str:
        """
        Call Grok-3 with context from hybrid search results.
        
        Args:
            user_query (str): The user's question
            retrieved_chunks (list): List of retrieved document chunks from hybrid_retrieval
        
        Returns:
            str: Model's response with RAG context
        
        Example:
            >>> client = GrokClient()
            >>> chunks = ["Chunk 1 content", "Chunk 2 content"]
            >>> response = client.call_grok_with_rag("What's a WAN?", chunks)
        """
        # Combine chunks into context string
        context = "\n\n".join(retrieved_chunks)
        return self.call_grok(user_query, context)