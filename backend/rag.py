import os
from dotenv import load_dotenv

load_dotenv()

from groq import Groq
from embeddings import embed_texts
from chroma_store import get_or_create_collection

# Initialize Groq client (free!)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def query_story(story_name: str, question: str, n_results: int = 5):
    """
    Takes a question, finds relevant story chunks,
    sends them to Groq, returns an answer.
    """

    # Step 1: Convert question to vector
    question_embedding = embed_texts([question])[0]

    # Step 2: Search ChromaDB for relevant chunks
    collection = get_or_create_collection(story_name)
    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=n_results
    )

    # Step 3: Extract the relevant text chunks
    chunks = results["documents"][0]

    if not chunks:
        return {
            "answer": "I couldn't find anything relevant in your story.",
            "sources": []
        }

    # Step 4: Build context from retrieved chunks
    context = "\n\n---\n\n".join(chunks)

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
        model="llama-3.3-70b-versatile",  # free, very capable model
        messages=[
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )

    return {
        "answer": response.choices[0].message.content,
        "sources": chunks
    }