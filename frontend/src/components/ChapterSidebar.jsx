import { useState, useEffect } from "react";
import api from "../api";

export default function ChapterSidebar({
  activeStory,
  activeChapter,
  onChapterSelect,
  onNewChapter
}) {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeStory) fetchChapters();
  }, [activeStory]);

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/chapters/list/${activeStory}`);
      setChapters(res.data.chapters);
    } catch (err) {
      console.error("Failed to fetch chapters", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, chapterId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chapter? This cannot be undone.")) return;
    try {
      await api.delete(`/chapters/delete/${activeStory}/${chapterId}`);
      setChapters(chapters.filter(c => c.id !== chapterId));
      if (activeChapter?.id === chapterId) onChapterSelect(null);
    } catch (err) {
      console.error("Failed to delete chapter", err);
    }
  };

  // Expose refresh to parent
  useEffect(() => {
    window._refreshChapters = fetchChapters;
  }, [activeStory]);

  return (
    <div className="chapter-sidebar">
      <div className="chapter-sidebar-header">
        <span className="chapter-sidebar-title">Chapters</span>
        <button
          className="new-chapter-btn"
          onClick={onNewChapter}
          title="New Chapter"
        >
          +
        </button>
      </div>

      {loading ? (
        <div className="chapter-loading">Loading...</div>
      ) : chapters.length === 0 ? (
        <div className="chapter-empty-hint">
          No chapters yet. Click + to create one.
        </div>
      ) : (
        <div className="chapter-list">
          {chapters.map((chapter, i) => (
            <div
              key={chapter.id}
              className={`chapter-item ${activeChapter?.id === chapter.id ? "active" : ""}`}
              onClick={() => onChapterSelect(chapter)}
            >
              <div className="chapter-item-left">
                <div className="chapter-number">Ch. {i + 1}</div>
                <div className="chapter-info">
                  <div className="chapter-title">{chapter.title}</div>
                  <div className="chapter-meta">
                    {chapter.word_count} words · {new Date(chapter.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button
                className="chapter-delete-btn"
                onClick={(e) => handleDelete(e, chapter.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}