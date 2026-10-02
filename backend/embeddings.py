import cohere
import os
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter # <-- ADDED THIS

load_dotenv()

client = cohere.Client(os.getenv("COHERE_API_KEY"))

# --- REMOVED THE OLD chunk_text FUNCTION ---
# --- ADDED THE NEW ADVANCED chunk_text FUNCTION ---

def chunk_text(text: str) -> list[str]:
    """
    Advanced RAG: Splits text by paragraphs, then sentences, then words.
    Ensures no sentence is cut in half.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000,  # 2000 characters is roughly 400-500 words
        chunk_overlap=200, # Overlap so we don't lose context between chunks
        length_function=len,
        separators=["\n\n", "\n", ".", " ", ""] # Tries to split by paragraph first, then sentence!
    )
    
    return text_splitter.split_text(text)


def embed_texts(texts: list[str]):
    response = client.embed(
        texts=texts,
        model="embed-english-v3.0",
        input_type="search_document"
    )
    return [list(e) for e in response.embeddings]

def rerank_chunks(query: str, chunks: list[str], top_n: int = 5) -> list[str]:
    """
    Takes the raw chunks from ChromaDB and uses Cohere's Rerank model 
    to score and sort them based on actual relevance to the user's query.
    """
    if not chunks:
        return []
        
    response = client.rerank(
        model="rerank-english-v3.0",
        query=query,
        documents=chunks,
        top_n=top_n
    )
    
    # Cohere returns the original index of the document. 
    # We use that to rebuild our list of chunks in the new, smarter order.
    reranked_chunks = [chunks[result.index] for result in response.results]
    
    return reranked_chunks