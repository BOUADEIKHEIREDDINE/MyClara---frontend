from fastapi import APIRouter
from services import grok_client, search_client

router = APIRouter(prefix="/revision")

@router.post("/")
async def createRevisionSheets(payload: dict):
    user_query = payload["query"]

    results = search_client.search(user_query)
    context = "".join([result["content"] for result in results["results"]])

    answer = grok_client.generateRevisionSheets(user_query, context)
    return answer
