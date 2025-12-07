from fastapi import APIRouter
from services import search_client, grok_client

router = APIRouter(prefix="/exercises")

@router.post("/")
async def create_exercises(payload: dict):
    user_query = payload["query"]

    results = search_client.search(user_query)
    context = "".join([result["content"] for result in results["results"]])

    answer = grok_client.generateExercises(user_query, context)
    return answer
