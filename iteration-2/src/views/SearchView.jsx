/* Alchemical‑Dictionaries – SearchView
   ------------------------------------
   Requirements touched: F‑5 (global search) – minus filters & autocomplete,
   which we’ll bolt on in later increments.
*/
import { useEffect, useState } from 'react';
import DataStore from '../lib/dataStore.js';

export default function SearchView () {
  const [ready, setReady] = useState(false);
  const [q, setQ]       = useState('');
  const [hits, setHits] = useState([]);

  /* wait for corpus to load once */
  useEffect(() => { DataStore.ready().then(() => setReady(true)); }, []);

  /* run search whenever q changes (debounced 250 ms) */
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      if (q.trim().length) {
        setHits(DataStore.search(q, { limit: 20 }));
      } else {
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, ready]);

  if (!ready) return <p>Loading corpus…</p>;

  return (
    <div style={{ maxWidth: 800 }}>
      <input
        autoFocus
        placeholder="Search lemma, variant, translation…"
        value={q}
        onChange={e => setQ(e.target.value)}
        style={styles.input}
      />

      {hits.length > 0 && (
        <p style={styles.meta}>{hits.length} hit{hits.length > 1 && 's'}</p>
      )}

      <ul style={styles.list}>
        {hits.map(entry => (
          <li
            key={entry.id}
            style={styles.item}
            onClick={() => console.log('TODO: route to EntryView', entry)}
          >
            <span style={styles.lemma}>{entry.lemma}</span>
            {entry.variants?.length > 0 && (
              <span style={styles.variants}>
                · {entry.variants.slice(0, 3).join(', ')}
                {entry.variants.length > 3 && '…'}
              </span>
            )}
            {entry.translations?.length > 0 && (
              <span style={styles.trans}>
                — {entry.translations[0]}
                {entry.translations.length > 1 && '…'}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '1rem',
    borderRadius: 4,
    border: '1px solid #bbb',
    marginBottom: '1rem'
  },
  meta:   { color: '#555', margin: '0 0 0.5rem 0' },
  list:   { listStyle: 'none', padding: 0, margin: 0 },
  item:   {
    padding: '0.4rem 0',
    borderBottom: '1px solid #eee',
    cursor: 'pointer'
  },
  lemma:  { fontWeight: 600 },
  variants:{ color: '#555' },
  trans:  { color: '#287' }
};
