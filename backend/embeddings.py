from fastembed import TextEmbedding

embedding_model = None

def get_model():
    global embedding_model
    if embedding_model is None:
        embedding_model = TextEmbedding("BAAI/bge-small-en-v1.5")
    return embedding_model

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
    model = get_model()
    embeddings = list(model.embed(texts))
    return [e.tolist() for e in embeddings]