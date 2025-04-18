/* Alchemical‑Dictionaries – EntryView
   -----------------------------------
   Displays one dictionary article.
   v0.4 · 2025‑04‑18
     • decodes URL‑encoded id  → fixes “Page not found” for ids that contain “/”
     • adds little badges + facsimile link
*/
import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import DataStore from '../lib/dataStore.js';

/* ---------- tiny Badge component -------------------------------------- */
function Badge({ children, color = '#666' }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0 0.5rem',
      marginLeft: '0.4rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      lineHeight: '1.4rem',
      background: color,
      color: '#fff'
    }}>
      {children}
    </span>
  );
}

export default function EntryView () {
  /* decode in case id contains '/' or other reserved chars */
  const { id: rawId } = useParams();
  const id = decodeURIComponent(rawId);
  const { state } = useLocation();          // may hold { from: { pathname, q } }
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    DataStore.ready().then(() => {
      console.debug('[Entry] open', id);
      setEntry(DataStore.getById(id));
    });
  }, [id]);

  if (!entry)                         return <p>Loading entry…</p>;
  if (!entry.definition && !entry.translations?.length)
    return <p>Entry not found.</p>;

  /* badge colours ------------------------------------------------------- */
  const sectionClr = { 'lat-de': '#4caf50', 'de-lat': '#2196f3', unknown: '#777' };
  const langClr    = { de: '#ffd54f', la: '#ff9800' };

  return (
    <article style={{ maxWidth: 800 }}>
      {/* ------------------------------------------------ lemma & badges */}
      <h2>
        {entry.lemma}
        {entry.section && (
          <Badge color={sectionClr[entry.section] ?? '#777'}>
            {entry.section.toUpperCase()}
          </Badge>
        )}
        {entry.translations_lang && (
          <Badge color={langClr[entry.translations_lang]}>DE</Badge>
        )}
        {entry.definition_lang && (
          <Badge color={langClr[entry.definition_lang]}>LA</Badge>
        )}
      </h2>

      {/* glyph strip ----------------------------------------------------- */}
      {entry.glyphs && (
        <p style={{ fontSize: '1.5rem', letterSpacing: '0.25rem' }}>
          {entry.glyphs}
        </p>
      )}

      {entry.variants?.length > 0 && (
        <p><strong>Variants:</strong> {entry.variants.join(', ')}</p>
      )}

      {entry.translations?.length > 0 && (
        <p><strong>German glosses:</strong> {entry.translations.join(', ')}</p>
      )}

      {entry.definition && (
        <>
          <h3>Definition</h3>
          <p style={styles.def}>{entry.definition}</p>
        </>
      )}

      {/* facsimile link -------------------------------------------------- */}
      {entry.page && (
        <p style={{ marginTop: '0.5rem' }}>
          <a
            href={DataStore.facsimileHref(entry)}
            target="_blank"
            rel="noopener noreferrer"
            title="Open page image (placeholder)"
          >
            Facsimile p.{entry.page} ↗
          </a>
        </p>
      )}

      {entry.symbols?.length > 0 && (
        <p><strong>Symbol IDs:</strong> {entry.symbols.join(', ')}</p>
      )}

      {/* back‑to‑results ------------------------------------------------- */}
      {state?.from?.pathname === '/search' && (
        <p style={styles.back}>
          <Link to={state.from.pathname} state={state.from}>
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
