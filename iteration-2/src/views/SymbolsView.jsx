/* Alchemical‑Dictionaries – SymbolsView (rev 3) */
import { useEffect, useState } from 'react';
import DataStore from '../lib/dataStore.js';
import SymbolModal from '../components/SymbolModal.jsx';

export default function SymbolsView () {
  const [glyphs, setGlyphs] = useState(null);
  const [open, setOpen]     = useState(null);   // null | symbol obj

  useEffect(() => { DataStore.ready().then(() => setGlyphs(DataStore.symbols)); }, []);

  if (!glyphs) return <p>Loading symbols…</p>;

  return (
    <>
      <div style={styles.grid}>
        {glyphs.map(g => (
          <button
            key={g.id}
            style={styles.cell}
            title={`${g.count} occurrence${g.count !== 1 ? 's' : ''}`}
            onClick={() => setOpen(g)}
          >
            <span style={styles.glyph} className="font-symbols">{g.char || '□'}</span>
            <span style={styles.count}>{g.count}</span>
          </button>
        ))}
      </div>

      {open && <SymbolModal symbol={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/* helpers ----------------------------------------------------------- */
const styles = {
  grid: {
    display: 'grid',
    gap: '0.75rem',
    gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))'
  },
  cell: {
    position: 'relative',
    border: '1px solid #ddd',
    borderRadius: 4,
    aspectRatio: '1 / 1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: '#fafafa'
  },
  glyph: { fontSize: '1.8rem', lineHeight: 1 },
  count: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    fontSize: '0.7rem',
    color: '#555'
  }
};
