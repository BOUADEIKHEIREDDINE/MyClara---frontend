from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from azure.search.documents.indexes import SearchIndexClient 
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

index_name = "rag-1764058431266"
semantic_config_name = "rag-1764058431266-semantic-configuration"

# # Define variables
search_endpoint = "https://myclarasearch.search.windows.net"
api_key = os.environ.get("SEARCH_API_KEY")
if not api_key:
    raise EnvironmentError("SEARCH_API_KEY not set")

index_client = SearchIndexClient(endpoint=search_endpoint, credential=AzureKeyCredential(api_key))


index = index_client.get_index(index_name)

search_client = SearchClient(endpoint=search_endpoint, index_name=index_name, credential=AzureKeyCredential(api_key))

# Generate embedding vector
def get_embedding_vector(text: str) -> list:
    token_provider = get_bearer_token_provider(
        DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
    )
    api_key = os.getenv("AZURE_OPENAI_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")

    if not api_key or not endpoint:
        raise EnvironmentError("Set AZURE_OPENAI_KEY and AZURE_OPENAI_ENDPOINT")

    client = OpenAI(base_url=endpoint, api_key=token_provider)
    deployement_name = "text-embedding-ada-002"

    response = client.embeddings.create(
        input=text,
        model=deployement_name
    )
    
    return response.data[0].embedding

# Then use it
vector = get_embedding_vector("What's a WAN?")

try:
    vector_query = VectorizedQuery(
        vector=vector,
        k_nearest_neighbors=5,
        fields="text_vector",
        kind="vector",
        exhaustive=True
    )

    results = search_client.search(
        include_total_count=True,
        search_text="What's a WAN?",
        query_type="semantic",
        semantic_configuration_name=semantic_config_name,
        top=7,            
        vector_queries=[vector_query]
    )

    print(f"Total semantic hybrid results: {results.get_count()}")
    
    # Extract semantic answers
    answers = results.get_answers()
    if answers:
        print("=== SEMANTIC ANSWERS ===")
        for answer in answers:
            print(f"Score: {answer.score}")
            print(f"Text: {answer.text}")
            print(f"Highlights: {answer.highlights}\n")
    
    # Extract ranked results
    print("=== RANKED RESULTS ===")
    for result in results:
        print(f"Search Score: {result.get('@search.score')}")
        print(f"Reranker Score: {result.get('@search.rerankerScore')}")
        
        # Get captions if available
        captions = result.get("@search.captions")
        if captions:
            print(f"Caption: {captions[0]['text']}")
        
        print(f"Chunk: {result.get('chunk')[:200]}...")  # First 200 chars
        print(f"Title: {result.get('title')}")
        print()

except Exception as ex:
    print("Semantic hybrid search failed:", ex)