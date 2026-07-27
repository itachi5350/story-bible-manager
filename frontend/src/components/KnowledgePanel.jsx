export default function KnowledgePanel({ facts }) {
  return (
    <div className="side-panel">
      <div className="panel-header">
        <span className="panel-icon">📚</span>
        Story Context
      </div>

      {facts.length === 0 ? (
        <div className="panel-empty">
          Relevant story facts will surface here as you write
        </div>
      ) : (
        <div className="facts-list">
          {facts.map((fact, i) => (
            <div key={i} className="fact-item">
              <span className="fact-dot">✦</span>
              <span className="fact-text">{fact}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}