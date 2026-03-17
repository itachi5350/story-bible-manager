# 📖 Story Bible Manager

I built this because I love writing stories — and I kept forgetting details about my own characters. 
This app fixes that. Upload your story chapters, and ask the AI anything about your own story. It answers from *your* writing, not from guesswork.

## Live App
👉 **[story-bible-manager.vercel.app](https://story-bible-manager.vercel.app)**

---

## What it does

**Ask questions about your story**
> "What do we know about King Aldric?"
> "Who knows about the secret meeting?"

**Check for contradictions**
> Paste a new scene you just wrote — the AI tells you if it conflicts with anything you've already written.

**Extract characters automatically**
> One click pulls out every character with their description, traits and relationships.

---

## TechStack

- **React + Vite** for the frontend
- **FastAPI** for the backend
- **ChromaDB** to store and search story content
- **Cohere** for turning text into searchable vectors
- **Groq (Llama 3.3)** as the AI brain
- **Vercel + Render** for deployment

---

## Run it locally

You'll need a free API key from [Groq](https://console.groq.com) and [Cohere](https://dashboard.cohere.com).

**Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**`.env` file in `/backend`**
```
GROQ_API_KEY=your_key
COHERE_API_KEY=your_key
```

---

## How it works under the hood

When you upload a chapter, the app splits it into chunks and converts each chunk into a vector (a list of numbers that captures meaning). These vectors are stored in ChromaDB.

When you ask a question, your question gets converted to a vector too. ChromaDB finds the chunks that are closest in meaning, and passes them to the AI as context. The AI reads those chunks and answers from them — not from its own training data.

This is called RAG (Retrieval Augmented Generation).

---


---

*Built by Sarika — because writers deserve better tools.*
