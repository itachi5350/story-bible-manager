from sentence_transformers import SentenceTransformer

# Load the embedding model (runs locally, no API needed)
model = SentenceTransformer("all-MiniLM-L6-v2")

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
    embeddings = model.encode(texts, show_progress_bar=True)
    return embeddings.tolist()