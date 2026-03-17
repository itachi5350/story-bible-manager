import cohere
import os
from dotenv import load_dotenv

load_dotenv()

client = cohere.Client(os.getenv("COHERE_API_KEY"))

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

def embed_texts(texts: list[str]):
    response = client.embed(
        texts=texts,
        model="embed-english-v3.0",
        input_type="search_document"
    )
    return [list(e) for e in response.embeddings]
