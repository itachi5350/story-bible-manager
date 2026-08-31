import chromadb
import re
import uuid

chroma_client = chromadb.PersistentClient(path="./chroma_store")


def scoped_collection_name(user_id: int, story_name: str) -> str:
    """
    Every user's 'My Fantasy' story gets its own collection.
    ChromaDB only allows [a-zA-Z0-9._-] in collection names (no spaces) —
    this was already true before auth, just sanitizing it here now that
    we're touching every call site anyway.
    """
    safe_story = re.sub(r"[^a-zA-Z0-9._-]", "_", story_name)
    return f"user_{user_id}_{safe_story}"


def get_or_create_collection(user_id: int, story_name: str):
    return chroma_client.get_or_create_collection(
        name=scoped_collection_name(user_id, story_name),
        metadata={"hnsw:space": "cosine"}
    )

def save_chunks(user_id: int, story_name: str, chunks: list[str], embeddings: list):
    collection = get_or_create_collection(user_id, story_name)
    ids = [str(uuid.uuid4()) for _ in chunks]
    collection.add(ids=ids, documents=chunks, embeddings=embeddings)
    return len(chunks)

def list_stories(user_id: int):
    """Returns this user's story names (unscoped, for display) from ChromaDB."""
    prefix = f"user_{user_id}_"
    collections = chroma_client.list_collections()
    return [c.name[len(prefix):] for c in collections if c.name.startswith(prefix)]