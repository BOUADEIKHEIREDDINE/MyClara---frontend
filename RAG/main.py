from fastapi import FastAPI
from routes.chat import router as chat_router
from routes.exercises import router as exercises_router
from routes.revision import router as revision_router

app = FastAPI()
app.include_router(chat_router)
app.include_router(exercises_router)
app.include_router(revision_router)