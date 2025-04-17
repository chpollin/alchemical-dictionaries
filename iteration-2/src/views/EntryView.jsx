/* Alchemical‑Dictionaries – EntryView
   -----------------------------------
   First usable slice of REQUIREMENTS F‑6. :contentReference[oaicite:2]{index=2}&#8203;:contentReference[oaicite:3]{index=3}
   * Reads :id from the URL
   * Shows lemma, variants, translations, definition text
   * Tabs + symbol highlighting will be added in later increments
*/
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DataStore from '../lib/dataStore.js';

export default function EntryView () {
  const { id } = useParams();
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    DataStore.ready().then(() => {
      setEntry(DataStore.getById(id));
    });
  }, [id]);

  if (!entry) return <p>Loading entry…</p>;
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

      <p style={styles.back}>
        <Link to="/search">← back to search</Link>
      </p>
    </article>
  );
}

const styles = {
  def:  { whiteSpace: 'pre-wrap', lineHeight: 1.4 },
  back: { marginTop: '2rem' }
};
