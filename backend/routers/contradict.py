from fastapi import APIRouter
from pydantic import BaseModel
from embeddings import embed_texts
from chroma_store import get_or_create_collection
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/contradict", tags=["Contradiction"])
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class ContradictRequest(BaseModel):
    story_name: str
    new_scene: str

@router.post("/check")
def check_contradiction(request: ContradictRequest):
    """
    Checks if a new scene contradicts anything in the existing story.
    """

    # Step 1: Embed the new scene
    scene_embedding = embed_texts([request.new_scene])[0]

    # Step 2: Find most similar existing chunks
    collection = get_or_create_collection(request.story_name)
    results = collection.query(
        query_embeddings=[scene_embedding],
        n_results=5
    )

    chunks = results["documents"][0]

    if not chunks:
        return {
            "contradictions_found": False,
            "message": "No existing story content to compare against.",
            "details": []
        }

    # Step 3: Build context
    context = "\n\n---\n\n".join(chunks)

    # Step 4: Ask Groq to find contradictions
    prompt = f"""You are a story consistency checker helping an author avoid plot holes.

Here are excerpts from the existing story:

{context}

---

Here is a NEW scene the author just wrote:

{request.new_scene}

---

Your job:
1. Carefully compare the new scene against the existing story excerpts
2. Identify ANY contradictions, inconsistencies, or conflicts
3. Look for: character descriptions, timeline issues, knowledge conflicts, location errors, relationship conflicts

Respond in this EXACT format:

CONTRADICTIONS_FOUND: YES or NO

If YES, list each contradiction like this:
- ISSUE: [describe the contradiction clearly]
  EXISTING: [what the story says]
  NEW SCENE: [what conflicts with it]

If NO contradictions:
- Write: "The new scene is consistent with the existing story."
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000
    )

    raw = response.choices[0].message.content

    # Parse the response
    contradictions_found = "CONTRADICTIONS_FOUND: YES" in raw

    return {
        "contradictions_found": contradictions_found,
        "analysis": raw,
        "compared_against": chunks
    }