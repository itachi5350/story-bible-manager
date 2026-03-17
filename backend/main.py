from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import chromadb
from routers.ingest import router as ingest_router
from routers.query import router as query_router
from routers.contradict import router as contradict_router
from routers.characters import router as characters_router

load_dotenv()

app = FastAPI(title="Story Bible Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

chroma_client = chromadb.PersistentClient(path="./chroma_store")

app.include_router(ingest_router)
app.include_router(query_router)
app.include_router(contradict_router)
app.include_router(characters_router)

@app.get("/health")
def health_check():
    return {
        "status": "running",
        "message": "Story Bible Manager backend is alive!"
    }

@app.get("/collections")
def list_collections():
    collections = chroma_client.list_collections()
    return {
        "collections": [c.name for c in collections],
        "count": len(collections)
    }

@app.delete("/collections/{story_name}")
def delete_collection(story_name: str):
    try:
        chroma_client.delete_collection(name=story_name)
        return {"message": f"Story '{story_name}' deleted successfully"}
    except Exception as e:
        return {"error": str(e)}