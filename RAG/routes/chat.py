from fastapi import APIRouter
from services import grok_client, search_client

router = APIRouter(prefix="/chat")

@router.post("/")
async def chat_endpoint(payload: dict):
    query = payload["query"]

    results = search_client.search(query)
    context = "".join([result["content"] for result in results["results"]])

    answer = grok_client.chatWithGrok(query, context)

    return answer
