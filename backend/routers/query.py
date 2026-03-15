from fastapi import APIRouter
from pydantic import BaseModel
from rag import query_story

router = APIRouter(prefix="/query", tags=["Query"])

class QuestionRequest(BaseModel):
    story_name: str
    question: str

@router.post("/ask")
def ask_question(request: QuestionRequest):
    """
    Ask a question about your story.
    Claude will answer based on your uploaded chapters.
    """
    result = query_story(request.story_name, request.question)
    return result