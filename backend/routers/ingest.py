from fastapi import APIRouter, UploadFile, File, Form
from embeddings import chunk_text, embed_texts
from chroma_store import save_chunks
import fitz  # pymupdf
import io

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF bytes using PyMuPDF."""
    pdf = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in pdf:
        text += page.get_text()
    pdf.close()
    return text

@router.post("/upload")
async def upload_document(
    story_name: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Accepts .txt or .pdf file upload, chunks it, embeds it, saves to ChromaDB.
    """
    # Read the uploaded file
    content = await file.read()

    # Extract text based on file type
    filename = file.filename.lower()

    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(content)
    elif filename.endswith(".txt"):
        text = content.decode("utf-8")
    else:
        return {"error": "Only .txt and .pdf files are supported"}

    if not text.strip():
        return {"error": "File is empty or could not be read"}

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