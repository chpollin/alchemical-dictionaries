/* Alchemical‑Dictionaries – EntryView
   -----------------------------------
   Displays a single dictionary article.
   Adds a “back to results” link that preserves the user’s search query.
*/
import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import DataStore from '../lib/dataStore.js';

export default function EntryView () {
  const { id } = useParams();
  const { state } = useLocation();       // may contain { from: { pathname, q } }
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    DataStore.ready().then(() => {
      setEntry(DataStore.getById(id));
    });
  }, [id]);

  if (!entry)          return <p>Loading entry…</p>;
  if (!entry.definition) return <p>Entry not found.</p>;

  return (
    <article style={{ maxWidth: 800 }}>
      <h2>{entry.lemma}</h2>

      {entry.variants?.length > 0 && (
        <p><strong>Variants:</strong> {entry.variants.join(', ')}</p>
      )}

      {entry.translations?.length > 0 && (
        <p><strong>German glosses:</strong> {entry.translations.join(', ')}</p>
      )}

      <h3>Definition</h3>
      <p style={styles.def}>{entry.definition}</p>

      {entry.symbols?.length > 0 && (
        <p><strong>Symbols:</strong> {entry.symbols.join(', ')}</p>
      )}

      {state?.from?.pathname === '/search' && (
        <p style={styles.back}>
          <Link
            to={state.from.pathname}
            state={state.from}        /* sends query back to SearchView */
          >
            ← back to results
          </Link>
        </p>
      )}
    </article>
  );
}

const styles = {
  def:  { whiteSpace: 'pre-wrap', lineHeight: 1.4 },
  back: { marginTop: '2rem' }
};
