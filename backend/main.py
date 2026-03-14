from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import chromadb
from routers.ingest import router as ingest_router
load_dotenv()

app = FastAPI(title="Story Bible Manager")

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB (stores data locally in a folder called chroma_store)
chroma_client = chromadb.PersistentClient(path="./chroma_store")
app.include_router(ingest_router)

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