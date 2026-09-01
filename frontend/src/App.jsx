import { useState, useEffect, useRef } from "react";
import api from "./api";
import "./App.css";
import WritingEditor from "./components/WritingEditor";
import AuthPage from "./components/AuthPage";

const SUGGESTIONS = [
  "What are the main characters?",
  "Describe the setting",
  "What is the central conflict?",
  "Who knows about the secret?",
];

// Landing Page Component
function LandingPage({ onEnter }) {
  return (
    <div className="landing">
      <div className="landing-content">
        {/* Candle */}
        <div className="landing-candle">
          <div className="flame-wrapper">
            <div className="flame">
              <div className="flame-inner"></div>
              <div className="flame-core"></div>
            </div>
            <div className="flame-glow"></div>
          </div>
          <div className="candle-body">
            <div className="candle-shine"></div>
            <div className="candle-drip drip-1"></div>
            <div className="candle-drip drip-2"></div>
            <div className="candle-drip drip-3"></div>
          </div>
          <div className="candle-base"></div>
          <div className="candle-shadow"></div>
        </div>

        {/* Title */}
        <div className="landing-title">Story Bible</div>
        <div className="landing-subtitle">Manager</div>

        {/* Description */}
        <div className="landing-description">
          Within these enchanted pages lies a most extraordinary grimoire. It is
          a keeper of tales, a guardian of characters, and a warden against
          the dark magic of plot contradictions. Let your stories breathe,
          your characters live, and your worlds expand without fear of
          forgetting what was written by candlelight.
        </div>

        {/* Divider */}
        <div className="landing-divider">
          <span className="landing-divider-star">✦</span>
        </div>

        {/* Enter Button */}
        <button className="landing-enter-btn" onClick={onEnter}>
          Open this Grimoire
        </button>
      </div>

      {/* Background particles */}
      <div className="landing-particles">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`particle particle-${i}`} />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem("sbm_token"));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("sbm_email"));
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
    if (token) fetchStories();
  }, [token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleAuthenticated = (newToken, email) => {
    setToken(newToken);
    setUserEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem("sbm_token");
    localStorage.removeItem("sbm_email");
    setToken(null);
    setUserEmail(null);
    setStories([]);
    setActiveStory(null);
    setMessages([]);
    setShowLanding(true);
  };

  const fetchStories = async () => {
    try {
      const res = await api.get("/collections");
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
      const res = await api.post("/query/ask", {
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
      const res = await api.post("/ingest/upload", formData);
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
      const res = await api.post("/contradict/check", {
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
      const res = await api.post("/characters/extract", {
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
      await api.delete(`/collections/${story}`);
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

  // Show landing page
  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  // Not signed in yet -> show the auth screen before the real app
  if (!token) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-title">Story Bible</span>
          </div>
          <div className="sidebar-subtitle">My narrative universe</div>
          <div className="sidebar-account">
            {userEmail} · <button onClick={handleLogout}>Sign out</button>
          </div>
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
            {activeStory ? "Your AI story assistant" : "Choose from the sidebar"}
          </div>
        </div>

        {!activeStory ? (
          <div className="no-story-selected">
            <div className="candle-container">
              <div className="flame-wrapper">
                <div className="flame">
                  <div className="flame-inner"></div>
                  <div className="flame-core"></div>
                </div>
                <div className="flame-glow"></div>
              </div>
              <div className="candle-body">
                <div className="candle-shine"></div>
                <div className="candle-drip drip-1"></div>
                <div className="candle-drip drip-2"></div>
                <div className="candle-drip drip-3"></div>
              </div>
              <div className="candle-base"></div>
              <div className="candle-shadow"></div>
            </div>
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
                Ask Questions
              </div>
              <div
                className={`tab ${activeTab === "contradict" ? "active" : ""}`}
                onClick={() => setActiveTab("contradict")}
              >
                Check Contradictions
              </div>
              <div
                className={`tab ${activeTab === "characters" ? "active" : ""}`}
                onClick={() => setActiveTab("characters")}
              >
                Characters
              </div>
              <div
                className={`tab ${activeTab === "write" ? "active" : ""}`}
                onClick={() => setActiveTab("write")}
              >
                Write
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
                        Ask anything about your own creation.
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
                        {msg.role === "user" ? "✦" : "✦"}
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
                      <div className="message-avatar assistant">✦</div>
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
                    placeholder="Paste your new scene here..."
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
                  <div className={`result-card ${checkResult.contradictions_found ? "warning" : "safe"}`}>
                    <div className="result-card-header">
                      <span className="result-icon">
                        {checkResult.contradictions_found ? "⚠" : "✓"}
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
                          {char.role === "protagonist" ? "P" :
                           char.role === "antagonist" ? "A" : "S"}
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
                          <div className="character-field-value">{char.description}</div>
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
                          <div className="character-field-value">{char.relationships}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Write Tab */}
            {activeTab === "write" && (
              <WritingEditor activeStory={activeStory} />
            )}
          </>
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowUpload(false)}
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
                  accept=".txt,.pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <div className="file-drop-text">
                  {file ? file.name : "Click to choose a file"}
                </div>
                <div className="file-drop-hint">.txt and .pdf files supported</div>
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
              <button className="btn-cancel" onClick={() => setShowUpload(false)}>
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