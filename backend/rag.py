import os
from dotenv import load_dotenv

load_dotenv()

from groq import Groq
from embeddings import embed_texts, rerank_chunks
from chroma_store import get_or_create_collection

# Initialize Groq client (free!)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def query_story(user_id: int,story_name: str, question: str, n_results: int = 5):
    """
    Takes a question, finds relevant story chunks,
    sends them to Groq, returns an answer.
    """

    # Step 1: Convert question to vector
    question_embedding = embed_texts([question])[0]

    # Step 2: Search ChromaDB for relevant chunks
    collection = get_or_create_collection(user_id) # Notice we removed story_name here
    
    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=15,
        where={"story_name": story_name}  # <-- THIS IS THE MAGIC FILTER!
    )

    # Step 3: Extract the relevant text chunks
    chunks = results["documents"][0]

    # Step 4: Rerank the chunks based on relevance to the question
    

    if not chunks:
        return {
            "answer": "I couldn't find anything relevant in your story.",
            "sources": []
        }

    best_chunks = rerank_chunks(question, chunks, top_n=5)

    # Step 4: Build context from retrieved chunks
    context = "\n\n---\n\n".join(best_chunks)

    # Step 5: Send to Groq with context
    prompt = f"""You are an assistant helping a writer stay consistent with their story.

Here are the relevant excerpts from the story:

{context}

---

Based ONLY on the story excerpts above, answer this question:
{question}

If the answer is not found in the excerpts, say "This information isn't in the uploaded story chapters yet."
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",  # free, very capable model
        messages=[
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )

    return {
        "answer": response.choices[0].message.content,
        "sources": best_chunks
    }