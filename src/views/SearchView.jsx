/* Alchemical‑Dictionaries – SearchView (rev 3)
   -------------------------------------------
   Overview → filter → detail UI:
     • summary bar with counts
     • filter chips (source + has‑symbol)
     • grouped results, badge shows dictionary
*/
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DataStore from '../lib/dataStore.js';

export default function SearchView () {
  const [ready, setReady]       = useState(false);
  const [q, setQ]               = useState('');
  const [rawHits, setRawHits]   = useState([]);

  /* filter state */
  const [showRuland,     setShowRuland]   = useState(true);
  const [showSommerhoff, setShowSommer]   = useState(true);
  const [onlySymbol,     setOnlySymbol]   = useState(false);

  /* ---------- load corpus once --------------------------------------- */
  useEffect(() => { DataStore.ready().then(() => setReady(true)); }, []);

  /* ---------- run search (debounced) --------------------------------- */
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      setRawHits(q.trim() ? DataStore.search(q, { limit: 200 }) : []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, ready]);

  /* ---------- apply filters & compute summary ------------------------ */
  const { hits, summary } = useMemo(() => {
    let list = rawHits.filter(rec => {
      if (onlySymbol && rec.symbols.length === 0) return false;
      if (!showRuland     && rec.source === 'ruland')      return false;
      if (!showSommerhoff && rec.source === 'sommerhoff')  return false;
      return true;
    });

    const counts = {
      total:        list.length,
      ruland:       list.filter(r => r.source === 'ruland').length,
      sommerhoff:   list.filter(r => r.source === 'sommerhoff').length,
      withSymbol:   list.filter(r => r.symbols.length).length
    };
    return { hits: list, summary: counts };
  }, [rawHits, showRuland, showSommerhoff, onlySymbol]);

  if (!ready) return <p>Loading corpus…</p>;

  /* ---------- UI ----------------------------------------------------- */
  return (
    <div style={{ maxWidth: 860 }}>
      {/* query box */}
      <input
        autoFocus
        placeholder="Search lemma, variant, translation…"
        value={q}
        onChange={e => setQ(e.target.value)}
        style={styles.input}
      />

      {/* filters */}
      <div style={styles.filters}>
        <Chip active={showRuland}     onClick={() => setShowRuland(!showRuland)}     label={`Ruland (1612)`} />
        <Chip active={showSommerhoff} onClick={() => setShowSommer(!showSommerhoff)} label={`Sommerhoff (1701)`} />
        <Chip active={onlySymbol}     onClick={() => setOnlySymbol(!onlySymbol)}     label="has symbol" />
      </div>

      {/* summary */}
      {q.trim() && (
        <p style={styles.meta}>
          {summary.total} hit{summary.total !== 1 && 's'}
          {' · '}Ruland {summary.ruland}
          {' · '}Sommerhoff {summary.sommerhoff}
          {' · '}with symbol {summary.withSymbol}
        </p>
      )}

      {/* grouped list */}
      {['ruland', 'sommerhoff'].map(src => {
        const group = hits.filter(h => h.source === src);
        if (group.length === 0) return null;
        return (
          <section key={src} style={{ marginBottom: '1.5rem' }}>
            <h3 style={styles.groupHdr}>
              {src === 'ruland' ? 'Ruland 1612' : 'Sommerhoff 1701'} 
              <span style={styles.countBadge}>{group.length}</span>
            </h3>
            <ul style={styles.list}>
              {group.map(rec => (
                <li key={rec.id} style={styles.item}>
                  <Link
                    to={`/entry/${rec.id}`}
                    state={{ from: { pathname: '/search', q } }}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <span style={{ ...styles.sourceBadge, background: src === 'ruland' ? '#9c27b0' : '#2196f3' }}>
                      {src === 'ruland' ? 'R' : 'S'}
                    </span>
                    <span style={styles.lemma}>{rec.lemma}</span>
                    {rec.variants.length > 0 && (
                      <span style={styles.variants}> · {rec.variants.slice(0, 3).join(', ')}{rec.variants.length > 3 && '…'}</span>
                    )}
                    {rec.translations.length > 0 && (
                      <span style={styles.trans}> — {rec.translations[0]}{rec.translations.length > 1 && '…'}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ---------- tiny Chip component ------------------------------------- */
function Chip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0 0.6rem',
        borderRadius: 16,
        border: '1px solid #888',
        background: active ? '#444' : '#eee',
        color: active ? '#fff' : '#222',
        cursor: 'pointer',
        fontSize: '0.85rem'
      }}
    >
      {label}
    </button>
  );
}

/* ---------- styles --------------------------------------------------- */
const styles = {
  input: {
    width: '100%', padding: '0.5rem 0.75rem',
    fontSize: '1rem', borderRadius: 4,
    border: '1px solid #bbb', marginBottom: '0.75rem'
  },
  filters: { display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' },
  meta: { color: '#555', margin: 0, marginBottom: '0.75rem' },
  groupHdr: { margin: '1rem 0 0.25rem 0', fontSize: '1rem' },
  countBadge: {
    background: '#666', color: '#fff', borderRadius: 12,
    padding: '0 0.5rem', fontSize: '0.8rem'
  },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    padding: '0.45rem 0',
    borderBottom: '1px solid #eee'
  },
  sourceBadge: {
    display: 'inline-block',
    width: 18, height: 18, lineHeight: '18px',
    borderRadius: '50%', textAlign: 'center',
    fontSize: '0.7rem', color: '#fff', marginRight: 6
  },
  lemma: { fontWeight: 600 },
  variants:{ color: '#555' },
  trans:  { color: '#287' }
};
