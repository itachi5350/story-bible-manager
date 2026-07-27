from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import json
import os
from datetime import datetime

router = APIRouter(prefix="/chapters", tags=["Chapters"])

CHAPTERS_DIR = "./chapters_store"

# Create chapters directory if it doesn't exist
os.makedirs(CHAPTERS_DIR, exist_ok=True)


class ChapterSave(BaseModel):
    story_name: str
    chapter_id: Optional[str] = None
    title: str
    content: str


def get_story_dir(story_name: str) -> str:
    path = os.path.join(CHAPTERS_DIR, story_name)
    os.makedirs(path, exist_ok=True)
    return path


def get_index_path(story_name: str) -> str:
    return os.path.join(get_story_dir(story_name), "index.json")


def load_index(story_name: str) -> list:
    path = get_index_path(story_name)
    if not os.path.exists(path):
        return []
    with open(path, "r") as f:
        return json.load(f)


def save_index(story_name: str, index: list):
    with open(get_index_path(story_name), "w") as f:
        json.dump(index, f, indent=2)


@router.post("/save")
def save_chapter(data: ChapterSave):
    """Save or update a chapter."""
    index = load_index(data.story_name)
    now = datetime.utcnow().isoformat()

    if data.chapter_id:
        # Update existing chapter
        chapter_path = os.path.join(
            get_story_dir(data.story_name),
            f"{data.chapter_id}.txt"
        )
        with open(chapter_path, "w", encoding="utf-8") as f:
            f.write(data.content)

        # Update index
        for chapter in index:
            if chapter["id"] == data.chapter_id:
                chapter["title"] = data.title
                chapter["updated_at"] = now
                chapter["word_count"] = len(data.content.split())
                break

        save_index(data.story_name, index)
        return {
            "message": "Chapter updated",
            "chapter_id": data.chapter_id
        }

    else:
        # Create new chapter
        chapter_id = f"ch_{int(datetime.utcnow().timestamp())}"
        chapter_path = os.path.join(
            get_story_dir(data.story_name),
            f"{chapter_id}.txt"
        )

        with open(chapter_path, "w", encoding="utf-8") as f:
            f.write(data.content)

        # Add to index
        index.append({
            "id": chapter_id,
            "title": data.title,
            "created_at": now,
            "updated_at": now,
            "word_count": len(data.content.split())
        })

        save_index(data.story_name, index)
        return {
            "message": "Chapter created",
            "chapter_id": chapter_id
        }


@router.get("/list/{story_name}")
def list_chapters(story_name: str):
    """List all chapters for a story."""
    index = load_index(story_name)
    return {"chapters": index, "total": len(index)}


@router.get("/load/{story_name}/{chapter_id}")
def load_chapter(story_name: str, chapter_id: str):
    """Load a specific chapter's content."""
    chapter_path = os.path.join(
        CHAPTERS_DIR,
        story_name,
        f"{chapter_id}.txt"
    )

    if not os.path.exists(chapter_path):
        return {"error": "Chapter not found", "content": ""}

    with open(chapter_path, "r", encoding="utf-8") as f:
        content = f.read()

    return {"content": content, "chapter_id": chapter_id}


@router.delete("/delete/{story_name}/{chapter_id}")
def delete_chapter(story_name: str, chapter_id: str):
    """Delete a chapter."""
    chapter_path = os.path.join(
        CHAPTERS_DIR,
        story_name,
        f"{chapter_id}.txt"
    )

    if os.path.exists(chapter_path):
        os.remove(chapter_path)

    # Remove from index
    index = load_index(story_name)
    index = [c for c in index if c["id"] != chapter_id]
    save_index(story_name, index)

    return {"message": "Chapter deleted"}