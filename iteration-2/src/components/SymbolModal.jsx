/* Modal that shows one glyph in detail. */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function SymbolModal({ symbol, onClose }) {
  /* close on Esc */
  useEffect(() => {
    function handle(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  if (!symbol) return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.card} onClick={e => e.stopPropagation()}>
        <button style={styles.close} onClick={onClose}>×</button>

        <div style={styles.glyph} className="font-symbols">
          {symbol.char || '□'}
        </div>

        <p><strong>Unicode:</strong> U+{symbol.char.codePointAt(0).toString(16).toUpperCase()}</p>
        <p><strong>Occurrences:</strong> {symbol.count}</p>

        <h4>Linked entries</h4>
        <ul style={styles.list}>
          {symbol.entries.map(id => (
            <li key={id}>
              <Link to={`/entry/${id}`} onClick={onClose}>{id}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,.4)',
    display: 'grid', placeItems: 'center',
    zIndex: 2000
  },
  card: {
    background: '#fff', padding: '1.5rem 2rem',
    borderRadius: 8, maxWidth: 420, width: '90%',
    maxHeight: '90%', overflow: 'auto',
    position: 'relative'
  },
  close: {
    position: 'absolute', top: 8, right: 12,
    fontSize: 24, lineHeight: 1, border: 'none',
    background: 'transparent', cursor: 'pointer'
  },
  glyph: { fontSize: '5rem', textAlign: 'center', margin: '.5rem 0' },
  list:  { maxHeight: 200, overflow: 'auto', paddingLeft: 20 }
};
