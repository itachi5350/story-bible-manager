from fastapi import APIRouter, UploadFile, File, Form
from embeddings import chunk_text, embed_texts
from chroma_store import save_chunks

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

@router.post("/upload")
async def upload_document(
    story_name: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Accepts a .txt file upload, chunks it, embeds it, saves to ChromaDB.
    """
    # Read the uploaded file
    content = await file.read()
    text = content.decode("utf-8")

    if not text.strip():
        return {"error": "File is empty"}

    # Chunk the text
    chunks = chunk_text(text)

    # Embed the chunks
    embeddings = embed_texts(chunks)

    # Save to ChromaDB
    saved = save_chunks(story_name, chunks, embeddings)

    return {
        "message": f"Successfully ingested '{file.filename}'",
        "story": story_name,
        "chunks_saved": saved
    }