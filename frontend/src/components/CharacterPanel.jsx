export default function CharacterPanel({ characters }) {
  return (
    <div className="side-panel">
      <div className="panel-header">
        <span className="panel-icon">👤</span>
        Characters in Scene
      </div>

      {characters.length === 0 ? (
        <div className="panel-empty">
          Character profiles will appear here as you mention them
        </div>
      ) : (
        <div className="character-cards">
          {characters.map((char, i) => (
            <div key={i} className="character-mini-card">
              <div className="character-mini-header">
                <div className="character-mini-avatar">
                  {char.role === "protagonist" ? "⚔️" :
                   char.role === "antagonist" ? "👤" : "🧑"}
                </div>
                <div>
                  <div className="character-mini-name">{char.name}</div>
                  <div className={`character-mini-role role-${char.role}`}>
                    {char.role}
                  </div>
                </div>
              </div>

              {char.description && (
                <div className="character-mini-field">
                  <span className="character-mini-label">Appearance</span>
                  <span className="character-mini-value">{char.description}</span>
                </div>
              )}

              {char.traits && (
                <div className="character-mini-field">
                  <span className="character-mini-label">Traits</span>
                  <span className="character-mini-value">{char.traits}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}