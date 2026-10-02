import chromadb
import re
import uuid

chroma_client = chromadb.PersistentClient(path="./chroma_store")


def scoped_collection_name(user_id: int) -> str:
    """
    Every user's 'My Fantasy' story gets its own collection.
    ChromaDB only allows [a-zA-Z0-9._-] in collection names (no spaces) —
    this was already true before auth, just sanitizing it here now that
    we're touching every call site anyway.

    Did a system design fix: one collection per user. We will use metadata tostore stories inside a collection.
    """
    
    return f"user_{user_id}_stories"


def get_or_create_collection(user_id: int):
    return chroma_client.get_or_create_collection(
        name=scoped_collection_name(user_id),
        metadata={"hnsw:space": "cosine"}
    )

def save_chunks(user_id: int, story_name: str, chunks: list[str], embeddings: list):
    collection = get_or_create_collection(user_id)
    ids = [str(uuid.uuid4()) for _ in chunks]
    metadatas = [{"story_name": story_name} for _ in chunks]
    collection.add(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metadatas)
    return len(chunks)

def list_stories(user_id: int):
    collection = get_or_create_collection(user_id)
    # Get all metadata for this user
    results = collection.get(include=["metadatas"])
    
    # Extract unique story names using a Set
    unique_stories = set()
    if results and results.get("metadatas"):
     for meta in results["metadatas"]:
        if meta and "story_name" in meta:
            unique_stories.add(meta["story_name"])
            
    return list(unique_stories)