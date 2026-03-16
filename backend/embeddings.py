from sentence_transformers import SentenceTransformer
import threading

# Load model lazily in background so server starts fast
model = None

def get_model():
    global model
    if model is None:
        model = SentenceTransformer("all-MiniLM-L6-v2")
    return model

# Start loading in background thread immediately
def _preload():
    get_model()

threading.Thread(target=_preload, daemon=True).start()

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50):
    """
    Splits a long text into smaller overlapping chunks.
    overlap means chunks share some sentences for better context.
    """
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

def embed_texts(texts: list[str]):
    """
    Converts a list of text chunks into vectors (numbers).
    """
    embeddings = get_model().encode(texts, show_progress_bar=True)
    return embeddings.tolist()