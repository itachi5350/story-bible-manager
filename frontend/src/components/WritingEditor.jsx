import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import axios from "axios";
import CharacterPanel from "./CharacterPanel";
import KnowledgePanel from "./KnowledgePanel";

const API = "https://localhost:8000"; // Replace with your backend API URL

export default function WritingEditor({ activeStory }) {
  const [contradiction, setContradiction] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [facts, setFacts] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: "Start writing your story here... The AI will watch for contradictions and surface relevant story facts as you write.",
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      setWordCount(words.length);
      handleTextChange(text);
    },
    editorProps: {
      attributes: {
        class: "writing-editor-content",
      },
    },
  });

  // Debounced AI checks — fires 2 seconds after user stops typing
  const handleTextChange = useDebouncedCallback(async (text) => {
    if (!activeStory || !text.trim() || text === lastChecked) return;
    if (text.trim().split(/\s+/).length < 8) return;

    setLastChecked(text);
    setChecking(true);

    try {
      // Run all three checks in parallel
      const [contradictionRes, charactersRes, factsRes] = await Promise.all([
        axios.post(`${API}/realtime/check-contradiction`, {
          story_name: activeStory,
          current_text: text.slice(-500) // last 500 chars for speed
        }),
        axios.post(`${API}/realtime/detect-characters`, {
          story_name: activeStory,
          current_text: text.slice(-300)
        }),
        axios.post(`${API}/realtime/knowledge-panel`, {
          story_name: activeStory,
          current_text: text.slice(-300)
        })
      ]);

      setContradiction(contradictionRes.data);
      setCharacters(charactersRes.data.characters || []);
      setFacts(factsRes.data.facts || []);

    } catch (err) {
      console.error("Realtime check failed", err);
    } finally {
      setChecking(false);
    }
  }, 2000);

  if (!activeStory) {
    return (
      <div className="write-empty">
        <div className="write-empty-icon">✍️</div>
        <div className="write-empty-text">Select a story to start writing</div>
        <div className="write-empty-hint">
          Choose a story from the sidebar — the AI will watch for contradictions as you write
        </div>
      </div>
    );
  }

  return (
    <div className="write-layout">
      {/* Editor Area */}
      <div className="editor-area">
        {/* Toolbar */}
        <div className="editor-toolbar">
          <button
            className="toolbar-btn"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            data-active={editor?.isActive("bold")}
          >
            B
          </button>
          <button
            className="toolbar-btn"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            data-active={editor?.isActive("italic")}
          >
            I
          </button>
          <button
            className="toolbar-btn"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            data-active={editor?.isActive("heading", { level: 2 })}
          >
            H2
          </button>
          <div className="toolbar-divider" />
          <div className="word-count">{wordCount} words</div>
          {checking && (
            <div className="checking-indicator">
              <span className="checking-dot" />
              AI checking...
            </div>
          )}
        </div>

        {/* Contradiction Warning */}
        {contradiction?.contradiction_found && (
          <div className="contradiction-banner">
            <span className="contradiction-icon">⚠️</span>
            <div>
              <div className="contradiction-warning">{contradiction.warning}</div>
              {contradiction.conflicting_fact && (
                <div className="contradiction-fact">
                  Story says: {contradiction.conflicting_fact}
                </div>
              )}
            </div>
            <button
              className="contradiction-dismiss"
              onClick={() => setContradiction(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* TipTap Editor */}
        <div className="editor-wrapper">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Right Panels */}
      <div className="panels-area">
        <CharacterPanel characters={characters} />
        <KnowledgePanel facts={facts} />
      </div>
    </div>
  );
}