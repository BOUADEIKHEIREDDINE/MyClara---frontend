from .hybrid_retrieval import HybridSearchClient
from .LLM_call import GrokClient

grok_client = GrokClient()
search_client = HybridSearchClient()