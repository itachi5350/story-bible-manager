import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import axios from "axios";
import CharacterPanel from "./CharacterPanel";
import KnowledgePanel from "./KnowledgePanel";
import ChapterSidebar from "./ChapterSidebar";

const API = "http://localhost:8000";

export default function WritingEditor({ activeStory }) {
  const [contradiction, setContradiction] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [facts, setFacts] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [activeChapter, setActiveChapter] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("Untitled Chapter");
  const [showTitleEdit, setShowTitleEdit] = useState(false);
  const titleInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: "Start writing your chapter here... The AI will watch for contradictions and surface relevant story facts as you write.",
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
      attributes: { class: "writing-editor-content" },
    },
  });

  // Load chapter content when chapter is selected
  const handleChapterSelect = async (chapter) => {
    if (!chapter) {
      setActiveChapter(null);
      setChapterTitle("Untitled Chapter");
      editor?.commands.setContent("");
      return;
    }

    try {
      const res = await axios.get(
        `${API}/chapters/load/${activeStory}/${chapter.id}`
      );
      setActiveChapter(chapter);
      setChapterTitle(chapter.title);
      editor?.commands.setContent(res.data.content);
    } catch (err) {
      console.error("Failed to load chapter", err);
    }
  };

  // Create new chapter
  const handleNewChapter = () => {
    setActiveChapter(null);
    setChapterTitle("Untitled Chapter");
    editor?.commands.setContent("");
    editor?.commands.focus();
    setShowTitleEdit(true);
    setTimeout(() => titleInputRef.current?.focus(), 100);
  };

  // Save chapter
  const handleSave = async () => {
    if (!activeStory || !editor) return;
    const content = editor.getText();
    if (!content.trim()) return;

    setSaving(true);
    try {
      const res = await axios.post(`${API}/chapters/save`, {
        story_name: activeStory,
        chapter_id: activeChapter?.id || null,
        title: chapterTitle,
        content: editor.getHTML()
      });

      if (!activeChapter) {
        setActiveChapter({
          id: res.data.chapter_id,
          title: chapterTitle
        });
      }

      setSavedMsg("Saved ✓");
      setTimeout(() => setSavedMsg(""), 2000);

      // Refresh chapter list
      if (window._refreshChapters) window._refreshChapters();

    } catch (err) {
      setSavedMsg("Save failed");
      setTimeout(() => setSavedMsg(""), 2000);
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S to save
  useEffect(() => {
    const handleKeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeStory, activeChapter, chapterTitle, editor]);

  // Debounced AI checks
  const handleTextChange = useDebouncedCallback(async (text) => {
    if (!activeStory || !text.trim()) return;
    if (text.trim().split(/\s+/).length < 8) return;

    setChecking(true);
    try {
      const [contradictionRes, charactersRes, factsRes] = await Promise.all([
        axios.post(`${API}/realtime/check-contradiction`, {
          story_name: activeStory,
          current_text: text.slice(-500)
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
          Choose a story from the sidebar to begin writing chapters
        </div>
      </div>
    );
  }

  return (
    <div className="write-layout">
      {/* Chapter Sidebar */}
      <ChapterSidebar
        activeStory={activeStory}
        activeChapter={activeChapter}
        onChapterSelect={handleChapterSelect}
        onNewChapter={handleNewChapter}
      />

      {/* Editor Area */}
      <div className="editor-area">
        {/* Toolbar */}
        <div className="editor-toolbar">
          <button
            className="toolbar-btn"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            data-active={editor?.isActive("bold")}
          >B</button>
          <button
            className="toolbar-btn"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            data-active={editor?.isActive("italic")}
          >I</button>
          <button
            className="toolbar-btn"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            data-active={editor?.isActive("heading", { level: 2 })}
          >H2</button>

          <div className="toolbar-divider" />

          {/* Chapter Title */}
          {showTitleEdit ? (
            <input
              ref={titleInputRef}
              className="chapter-title-input"
              value={chapterTitle}
              onChange={e => setChapterTitle(e.target.value)}
              onBlur={() => setShowTitleEdit(false)}
              onKeyDown={e => e.key === "Enter" && setShowTitleEdit(false)}
              placeholder="Chapter title..."
            />
          ) : (
            <div
              className="chapter-title-display"
              onClick={() => {
                setShowTitleEdit(true);
                setTimeout(() => titleInputRef.current?.focus(), 50);
              }}
              title="Click to edit title"
            >
              {chapterTitle}
            </div>
          )}

          <div className="toolbar-divider" />
          <div className="word-count">{wordCount} words</div>

          {checking && (
            <div className="checking-indicator">
              <span className="checking-dot" />
              AI checking...
            </div>
          )}

          {/* Save Button */}
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={saving}
            title="Save (Ctrl+S)"
          >
            {saving ? "Saving..." : savedMsg || "💾 Save"}
          </button>
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
            >✕</button>
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