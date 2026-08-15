from fastapi import APIRouter
from pydantic import BaseModel
from groq import Groq
from chroma_store import get_or_create_collection
from embeddings import embed_texts
import os
import json
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/realtime", tags=["Realtime"])
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class TextCheckRequest(BaseModel):
    story_name: str
    current_text: str

@router.post("/check-contradiction")
def check_contradiction_realtime(request: TextCheckRequest):
    if not request.current_text.strip() or len(request.current_text.split()) < 8:
        return {"contradiction_found": False, "warning": "", "conflicting_fact": ""}

    try:
        embedding = embed_texts([request.current_text])[0]
        collection = get_or_create_collection(request.story_name)
        results = collection.query(
            query_embeddings=[embedding],
            n_results=3
        )

        chunks = results["documents"][0]
        if not chunks:
            return {"contradiction_found": False, "warning": "", "conflicting_fact": ""}

        context = "\n\n---\n\n".join(chunks)

        prompt = f"""You are a real-time story consistency checker.

Existing story excerpts:
{context}

New text being written:
{request.current_text}

Check ONLY for clear, obvious contradictions (character descriptions, known facts, established relationships).

Respond in JSON format only:
{{
  "contradiction_found": true or false,
  "warning": "one short sentence describing the issue, or empty string if none",
  "conflicting_fact": "what the story already established, or empty string"
}}

Be conservative — only flag clear contradictions, not possibilities."""

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200
        )

        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        result = json.loads(raw)
        return result

    except Exception as e:
        print(f"Contradiction check error: {e}")
        return {"contradiction_found": False, "warning": "", "conflicting_fact": ""}


@router.post("/detect-characters")
def detect_characters_realtime(request: TextCheckRequest):
    if not request.current_text.strip():
        return {"characters": []}

    try:
        # Step 1: Extract character names from text
        name_prompt = f"""Extract all character names from this text.
Return ONLY a JSON array of names, nothing else.
Example: ["Elena", "Marcus", "King Aldric"]
If no character names found, return []

Text: {request.current_text}"""

        name_response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": name_prompt}],
            max_tokens=100
        )

        raw_names = name_response.choices[0].message.content.strip()
        if "```" in raw_names:
            raw_names = raw_names.split("```")[1]
            if raw_names.startswith("json"):
                raw_names = raw_names[4:]

        names = json.loads(raw_names)
        if not names:
            return {"characters": []}

        # Step 2: For each name, embed and search ChromaDB
        characters = []
        collection = get_or_create_collection(request.story_name)

        for name in names[:5]:
            # FIX: use query_embeddings not query_texts
            name_embedding = embed_texts([f"character {name} description traits appearance"])[0]
            results = collection.query(
                query_embeddings=[name_embedding],
                n_results=2
            )

            chunks = results["documents"][0] if results["documents"] else []
            context = " ".join(chunks)

            if context:
                profile_prompt = f"""From this story context, extract info about "{name}".
Return ONLY JSON with no extra text:
{{
  "name": "{name}",
  "description": "physical description or empty string",
  "traits": "personality traits or empty string",
  "role": "protagonist or antagonist or supporting or unknown"
}}

Context: {context}"""

                profile_response = client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[{"role": "user", "content": profile_prompt}],
                    max_tokens=150
                )

                raw_profile = profile_response.choices[0].message.content.strip()
                if "```" in raw_profile:
                    raw_profile = raw_profile.split("```")[1]
                    if raw_profile.startswith("json"):
                        raw_profile = raw_profile[4:]

                try:
                    profile = json.loads(raw_profile)
                    characters.append(profile)
                except:
                    characters.append({
                        "name": name,
                        "description": "",
                        "traits": "",
                        "role": "unknown"
                    })
            else:
                # Character mentioned but not in story bible yet
                characters.append({
                    "name": name,
                    "description": "Not yet in story bible",
                    "traits": "",
                    "role": "unknown"
                })

        return {"characters": characters}

    except Exception as e:
        print(f"Character detection error: {e}")
        return {"characters": []}


@router.post("/knowledge-panel")
def get_knowledge_panel(request: TextCheckRequest):
    if not request.current_text.strip() or len(request.current_text.split()) < 5:
        return {"facts": []}

    try:
        embedding = embed_texts([request.current_text])[0]
        collection = get_or_create_collection(request.story_name)

        results = collection.query(
            query_embeddings=[embedding],
            n_results=4
        )

        chunks = results["documents"][0]
        if not chunks:
            return {"facts": []}

        context = "\n\n".join(chunks)

        prompt = f"""Based on this story context, extract 3-4 key facts relevant to what's being written.

Current writing: {request.current_text}

Story context: {context}

Return ONLY a JSON array of short fact strings with no extra text:
["fact 1", "fact 2", "fact 3"]

Each fact should be one short sentence."""

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200
        )

        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        facts = json.loads(raw)
        return {"facts": facts}

    except Exception as e:
        print(f"Knowledge panel error: {e}")
        return {"facts": []}