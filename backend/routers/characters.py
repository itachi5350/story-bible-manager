from fastapi import APIRouter
from pydantic import BaseModel
from chroma_store import get_or_create_collection
from groq import Groq
import os
import json
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/characters", tags=["Characters"])
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class StoryRequest(BaseModel):
    story_name: str

@router.post("/extract")
def extract_characters(request: StoryRequest):
    """
    Extracts all characters from the story automatically.
    """

    # Get all chunks from the collection
    collection = get_or_create_collection(request.story_name)
    all_docs = collection.get()

    if not all_docs["documents"]:
        return {"characters": [], "message": "No story content found."}

    # Combine all chunks into full story text
    full_text = "\n\n".join(all_docs["documents"])

    prompt = f"""You are a literary analyst helping an author track their characters.

Read the following story excerpts carefully:

{full_text}

---

Extract ALL characters mentioned. For each character provide:
- name
- role (protagonist/antagonist/supporting)
- description (physical appearance if mentioned)
- traits (personality, key characteristics)
- relationships (who they know or are connected to)

Respond ONLY with a valid JSON array like this:
[
  {{
    "name": "Character Name",
    "role": "protagonist",
    "description": "physical description",
    "traits": "personality traits",
    "relationships": "connected to X, Y"
  }}
]

Return ONLY the JSON array, no other text.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2000
    )

    raw = response.choices[0].message.content.strip()

    # Clean and parse JSON
    try:
        # Remove markdown code blocks if present
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        characters = json.loads(raw)
    except:
        characters = []

    return {
        "characters": characters,
        "total": len(characters)
    }