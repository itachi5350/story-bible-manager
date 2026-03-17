from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
    embeddings = []
    for text in texts:
        response = client.embeddings.create(
            model="nomic-embed-text-v1.5",
            input=text
        )
        embeddings.append(response.data[0].embedding)
    return embeddings
