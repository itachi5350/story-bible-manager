import chromadb
import uuid

chroma_client = chromadb.PersistentClient(path="./chroma_store")

def get_or_create_collection(story_name: str):
    """
    Gets an existing story collection or creates a new one.
    Think of a collection as a folder for one story.
    """
    return chroma_client.get_or_create_collection(
        name=story_name,
        metadata={"hnsw:space": "cosine"}  # cosine similarity for better search
    )

def save_chunks(story_name: str, chunks: list[str], embeddings: list):
    """
    Saves text chunks + their vectors into ChromaDB.
    """
    collection = get_or_create_collection(story_name)

    ids = [str(uuid.uuid4()) for _ in chunks]  # unique ID for each chunk

    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings
    )

    return len(chunks)

def list_stories():
    """
    Returns all story collections stored in ChromaDB.
    """
    collections = chroma_client.list_collections()
    return [c.name for c in collections]