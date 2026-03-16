import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:8000";

const SUGGESTIONS = [
  "What are the main characters?",
  "Describe the setting",
  "What is the central conflict?",
  "Who knows about the secret?",
];

export default function App() {
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [storyName, setStoryName] = useState("");
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [newScene, setNewScene] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fetchStories = async () => {
    try {
      const res = await axios.get(`${API}/collections`);
      setStories(res.data.collections);
    } catch (err) {
      console.error("Failed to fetch stories", err);
    }
  };

  const handleSelectStory = (story) => {
    setActiveStory(story);
    setMessages([]);
    setCheckResult(null);
    setCharacters([]);
    setActiveTab("chat");
  };

  const handleSend = async (text) => {
    const question = text || input.trim();
    if (!question || !activeStory || loading) return;
    setInput("");

    const userMsg = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/query/ask`, {
        story_name: activeStory,
        question,
      });
      const assistantMsg = {
        role: "assistant",
        content: res.data.answer,
        sources: res.data.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUpload = async () => {
    if (!storyName.trim() || !file) return;
    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("story_name", storyName.trim().replace(/\s+/g, "_"));
    formData.append("file", file);

    try {
      const res = await axios.post(`${API}/ingest/upload`, formData);
      setUploadStatus({
        type: "success",
        message: `✓ ${res.data.chunks_saved} passages indexed from "${res.data.story}"`,
      });
      await fetchStories();
      setTimeout(() => {
        setShowUpload(false);
        setStoryName("");
        setFile(null);
        setUploadStatus(null);
      }, 2000);
    } catch (err) {
      setUploadStatus({
        type: "error",
        message: "Upload failed. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleContradictionCheck = async () => {
    if (!newScene.trim() || !activeStory) return;
    setChecking(true);
    setCheckResult(null);

    try {
      const res = await axios.post(`${API}/contradict/check`, {
        story_name: activeStory,
        new_scene: newScene,
      });
      setCheckResult(res.data);
    } catch (err) {
      setCheckResult({
        contradictions_found: false,
        analysis: "Something went wrong. Please try again.",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleExtractCharacters = async () => {
    if (!activeStory) return;
    setExtracting(true);
    setCharacters([]);

    try {
      const res = await axios.post(`${API}/characters/extract`, {
        story_name: activeStory,
      });
      setCharacters(res.data.characters);
    } catch (err) {
      console.error("Failed to extract characters", err);
    } finally {
      setExtracting(false);
    }
  };

  const handleDeleteStory = async (story, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${story.replace(/_/g, " ")}"? This cannot be undone.`)) return;

    try {
      await axios.delete(`${API}/collections/${story}`);
      setStories((prev) => prev.filter((s) => s !== story));
      if (activeStory === story) {
        setActiveStory(null);
        setMessages([]);
        setCharacters([]);
        setCheckResult(null);
      }
    } catch (err) {
      console.error("Failed to delete story", err);
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">📖</span>
            <span className="sidebar-title">Story Bible</span>
          </div>
          <div className="sidebar-subtitle">Your narrative universe</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Your Stories</div>
        </div>

        <div className="story-list">
          {stories.length === 0 ? (
            <div className="no-stories">
              No stories yet.<br />Upload your first chapter to begin.
            </div>
          ) : (
            stories.map((story) => (
              <div
                key={story}
                className={`story-item ${activeStory === story ? "active" : ""}`}
                onClick={() => handleSelectStory(story)}
              >
                <div className="story-dot" />
                <span className="story-name">{story.replace(/_/g, " ")}</span>
                <button
                  className="delete-story-btn"
                  onClick={(e) => handleDeleteStory(story, e)}
                  title="Delete story"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button className="upload-btn" onClick={() => setShowUpload(true)}>
            <span>＋</span> Add Story
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="topbar">
          <div className="topbar-story">
            {activeStory ? (
              <>Ask about <span>{activeStory.replace(/_/g, " ")}</span></>
            ) : (
              "Select a story to begin"
            )}
          </div>
          <div className="topbar-hint">
            {activeStory ? "Your AI story assistant" : "← Choose from the sidebar"}
          </div>
        </div>

        {!activeStory ? (
          <div className="no-story-selected">
            <div className="no-story-icon">🕯️</div>
            <div className="no-story-text">Your story awaits</div>
            <div className="no-story-hint">
              Select a story from the sidebar or upload a new one
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="tabs">
              <div
                className={`tab ${activeTab === "chat" ? "active" : ""}`}
                onClick={() => setActiveTab("chat")}
              >
                💬 Ask Questions
              </div>
              <div
                className={`tab ${activeTab === "contradict" ? "active" : ""}`}
                onClick={() => setActiveTab("contradict")}
              >
                ⚠️ Check Contradictions
              </div>
              <div
                className={`tab ${activeTab === "characters" ? "active" : ""}`}
                onClick={() => setActiveTab("characters")}
              >
                👤 Characters
              </div>
            </div>

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <>
                <div className="chat-area">
                  {messages.length === 0 && !loading && (
                    <div className="empty-state">
                      <div className="empty-icon">✦</div>
                      <div className="empty-title">What would you like to know?</div>
                      <div className="empty-subtitle">
                        Ask anything about your characters, plot, lore, or timeline.
                      </div>
                      <div className="suggestion-chips">
                        {SUGGESTIONS.map((s) => (
                          <div key={s} className="chip" onClick={() => handleSend(s)}>
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                      <div className="message-avatar">
                        {msg.role === "user" ? "✦" : "📖"}
                      </div>
                      <div className="message-bubble">
                        {msg.content}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="message-sources">
                            <div className="sources-label">Referenced from your story</div>
                            {msg.sources.slice(0, 2).map((src, j) => (
                              <div key={j} className="source-excerpt">{src}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="thinking">
                      <div className="message-avatar assistant">📖</div>
                      <div className="thinking-dots">
                        <span /><span /><span />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="input-area">
                  <div className="input-wrapper">
                    <textarea
                      ref={inputRef}
                      className="chat-input"
                      placeholder="Ask about your story..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                    />
                    <button
                      className="send-btn"
                      onClick={() => handleSend()}
                      disabled={!input.trim() || loading}
                    >
                      ↑
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Contradiction Tab */}
            {activeTab === "contradict" && (
              <div className="contradict-area">
                <div className="contradict-intro">
                  Paste a new scene you just wrote. The AI will compare it
                  against your uploaded story and flag any contradictions or
                  inconsistencies.
                </div>

                <div className="scene-input-wrapper">
                  <div className="scene-label">Your new scene</div>
                  <textarea
                    className="scene-textarea"
                    placeholder="Paste your new scene here... e.g. 'Elena walked into the room, her green eyes scanning the crowd.'"
                    value={newScene}
                    onChange={(e) => setNewScene(e.target.value)}
                  />
                  <button
                    className="check-btn"
                    onClick={handleContradictionCheck}
                    disabled={!newScene.trim() || checking}
                  >
                    {checking ? "Analysing..." : "Check for Contradictions →"}
                  </button>
                </div>

                {checkResult && (
                  <div
                    className={`result-card ${
                      checkResult.contradictions_found ? "warning" : "safe"
                    }`}
                  >
                    <div className="result-card-header">
                      <span className="result-icon">
                        {checkResult.contradictions_found ? "⚠️" : "✅"}
                      </span>
                      <span className="result-title">
                        {checkResult.contradictions_found
                          ? "Contradictions Detected"
                          : "No Contradictions Found"}
                      </span>
                    </div>
                    <div className="result-analysis">{checkResult.analysis}</div>
                  </div>
                )}
              </div>
            )}

            {/* Characters Tab */}
            {activeTab === "characters" && (
              <div className="characters-area">
                <div className="characters-header">
                  <div className="characters-intro">
                    Automatically extract and track all characters from your
                    story with their traits and relationships.
                  </div>
                  <button
                    className="extract-btn"
                    onClick={handleExtractCharacters}
                    disabled={extracting}
                  >
                    {extracting ? "Extracting..." : "✦ Extract Characters"}
                  </button>
                </div>

                {characters.length === 0 && !extracting && (
                  <div className="no-characters">
                    Click "Extract Characters" to analyse your story
                  </div>
                )}

                <div className="characters-grid">
                  {characters.map((char, i) => (
                    <div key={i} className="character-card">
                      <div className="character-card-header">
                        <div className="character-avatar">
                          {char.role === "antagonist"
                            ? "👤"
                            : char.role === "protagonist"
                            ? "⚔️"
                            : "🧑"}
                        </div>
                        <div>
                          <div className="character-name">{char.name}</div>
                          <span className={`character-role role-${char.role}`}>
                            {char.role}
                          </span>
                        </div>
                      </div>

                      {char.description && (
                        <div className="character-field">
                          <div className="character-field-label">Description</div>
                          <div className="character-field-value">
                            {char.description}
                          </div>
                        </div>
                      )}

                      {char.traits && (
                        <div className="character-field">
                          <div className="character-field-label">Traits</div>
                          <div className="character-field-value">{char.traits}</div>
                        </div>
                      )}

                      {char.relationships && (
                        <div className="character-field">
                          <div className="character-field-label">Relationships</div>
                          <div className="character-field-value">
                            {char.relationships}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowUpload(false)
          }
        >
          <div className="modal">
            <div className="modal-title">Add a New Story</div>
            <div className="modal-subtitle">
              Upload a chapter or document to your story bible
            </div>

            <div className="form-group">
              <label className="form-label">Story Name</label>
              <input
                className="form-input"
                placeholder="e.g. my-fantasy-novel"
                value={storyName}
                onChange={(e) => setStoryName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Upload File</label>
              <div className={`file-drop ${file ? "dragover" : ""}`}>
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <div className="file-drop-icon">📄</div>
                <div className="file-drop-text">
                  {file ? file.name : "Click to choose a file"}
                </div>
                <div className="file-drop-hint">.txt files supported</div>
                {file && (
                  <div className="file-selected">✓ {file.name} selected</div>
                )}
              </div>
            </div>

            {uploadStatus && (
              <div className={`upload-status ${uploadStatus.type}`}>
                {uploadStatus.message}
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </button>
              <button
                className="btn-upload"
                onClick={handleUpload}
                disabled={!storyName.trim() || !file || uploading}
              >
                {uploading ? "Indexing..." : "Upload & Index"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}