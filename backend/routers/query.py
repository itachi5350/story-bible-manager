from fastapi import APIRouter, Depends
from pydantic import BaseModel
from rag import query_story
from auth_utils import get_current_user

router = APIRouter(prefix="/query", tags=["Query"])

class QuestionRequest(BaseModel):
    story_name: str
    question: str

@router.post("/ask")
def ask_question(request: QuestionRequest, current_user: dict = Depends(get_current_user)):
    """
    Ask a question about your story.
    Claude will answer based on your uploaded chapters.
    """
    result = query_story(current_user["id"], request.story_name, request.question)
    return result