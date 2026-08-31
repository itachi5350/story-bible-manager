from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import chromadb
import database
from auth_utils import get_current_user
from chroma_store import scoped_collection_name
from rate_limiter import limiter
from routers.ingest import router as ingest_router
from routers.query import router as query_router
from routers.contradict import router as contradict_router
from routers.characters import router as characters_router
from routers.realtime import router as realtime_router
from routers.chapters import router as chapters_router
from routers.auth import router as auth_router

load_dotenv()

database.init_db()

app = FastAPI(title="Story Bible Manager")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

chroma_client = chromadb.PersistentClient(path="./chroma_store")

app.include_router(auth_router)
app.include_router(ingest_router)
app.include_router(query_router)
app.include_router(contradict_router)
app.include_router(characters_router)
app.include_router(realtime_router)
app.include_router(chapters_router)

@app.get("/health")
def health_check():
    return {"status": "running", "message": "Story Bible Manager backend is alive!"}

@app.get("/collections")
def list_collections(current_user: dict = Depends(get_current_user)):
    prefix = f"user_{current_user['id']}_"
    collections = chroma_client.list_collections()
    names = [c.name[len(prefix):] for c in collections if c.name.startswith(prefix)]
    return {"collections": names, "count": len(names)}

@app.delete("/collections/{story_name}")
def delete_collection(story_name: str, current_user: dict = Depends(get_current_user)):
    try:
        chroma_client.delete_collection(name=scoped_collection_name(current_user["id"], story_name))
        return {"message": f"Story '{story_name}' deleted successfully"}
    except Exception as e:
        return {"error": str(e)}