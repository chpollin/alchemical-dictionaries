/* Alchemical‑Dictionaries – SearchView
   ------------------------------------
   v0.4  · 2025‑04‑18
     • encodes id in <Link>   → no more 404 on entries with '/' in id
     • filter chips: by source, “has symbol”, “German gloss present”
     • minimal console debug logging
*/
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import DataStore from '../lib/dataStore.js';

/* ––––– helper for small rounded chips ––––– */
function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: 0,
        padding: '0 0.6rem',
        marginRight: '0.4rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        lineHeight: '1.6rem',
        cursor: 'pointer',
        background: active ? '#333' : '#ddd',
        color: active ? '#fff' : '#000'
      }}
    >
      {children}
    </button>
  );
}

export default function SearchView() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const params     = new URLSearchParams(location.search);
  const [ready, setReady] = useState(false);

  /* --- local state ---------------------------------------------------- */
  const [q,   setQ]   = useState(params.get('q') ?? '');
  const [srcR, setR ] = useState(params.get('ruland')     !== '0'); // default on
  const [srcS, setS ] = useState(params.get('sommerhoff') !== '0');
  const [hasSym,setHS] = useState(params.get('sym') === '1');
  const [hasDE, setDE] = useState(params.get('de')  === '1');

  const [hits, setHits] = useState([]);

  /* --- load DataStore ------------------------------------------------- */
  useEffect(() => {
    DataStore.ready().then(() => setReady(true));
  }, []);

  /* --- perform search whenever q or filters change ------------------- */
  useEffect(() => {
    if (!ready || !q.trim()) { setHits([]); return; }

    /* write params to URL */
    const p = new URLSearchParams();
    p.set('q', q);
    if (!srcR) p.set('ruland', '0');
    if (!srcS) p.set('sommerhoff', '0');
    if (hasSym) p.set('sym', '1');
    if (hasDE)  p.set('de',  '1');
    navigate({ search: p.toString() }, { replace: true });

    /* run Lunr */
    const raw = DataStore.search(q, { limit: 200 });
    const filtered = raw.filter(r =>
      ((srcR && r.source === 'ruland')     || (srcS && r.source === 'sommerhoff')) &&
      (!hasSym || r.symbols.length > 0) &&
      (!hasDE  || r.translations_lang === 'de')
    );
    console.debug('[Search] ', q, '→', filtered.length, 'hits');
    setHits(filtered);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, q, srcR, srcS, hasSym, hasDE]);

  /* --- group hits by source ------------------------------------------ */
  const grouped = hits.reduce((acc, h) => {
    (acc[h.source] = acc[h.source] || []).push(h);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 900 }}>
      {/* search box ------------------------------------------------------ */}
      <input
        type="search"
        placeholder="Search"
        value={q}
        autoFocus
        onChange={e => setQ(e.target.value)}
        style={{ width: '100%', fontSize: '1rem', padding: '0.4rem 0.6rem', marginBottom: '0.5rem' }}
      />

      {/* chips / filters ------------------------------------------------- */}
      <div style={{ marginBottom: '0.75rem' }}>
        <Chip active={srcR} onClick={() => setR(!srcR)}>Ruland (1612)</Chip>
        <Chip active={srcS} onClick={() => setS(!srcS)}>Sommerhoff (1701)</Chip>
        <Chip active={hasSym} onClick={() => setHS(!hasSym)}>has symbol</Chip>
        <Chip active={hasDE}  onClick={() => setDE(!hasDE)}>German gloss</Chip>
      </div>

      {/* result counts --------------------------------------------------- */}
      {q && (
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
          {hits.length} hit{hits.length !== 1 && 's'}
          &nbsp;· Ruland {grouped.ruland?.length ?? 0}
          &nbsp;· Sommerhoff {grouped.sommerhoff?.length ?? 0}
          {hasSym && ' · with symbol'}
        </p>
      )}

      {/* results list ---------------------------------------------------- */}
      {['ruland', 'sommerhoff'].map(src => (
        grouped[src]?.length ? (
          <section key={src} style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0.4rem 0' }}>
              {src === 'ruland' ? 'Ruland 1612' : 'Sommerhoff 1701'}
              <Badge count={grouped[src].length}/>
            </h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {grouped[src].map(rec => (
                <li key={rec.id} style={rowStyle}>
                  <span style={pillStyle(src)}>{src === 'ruland' ? 'R' : 'S'}</span>
                  <Link
                    to={`/entry/${encodeURIComponent(rec.id)}`}
                    state={{ from: { pathname: '/search', q } }}
                    style={linkStyle}
                  >
                    {console.debug('[Search] link →', encodeURIComponent(rec.id))}
                    <strong>{rec.lemma === '⚠︎missing' ? '[no lemma]' : rec.lemma}</strong>
                    {rec.definition && ' — '}
                    <span style={{ color: '#00695c' }}>
                      {(rec.definition || rec.translations?.[0] || '').slice(0, 90)}…
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      ))}
    </div>
  );
}

/* --- tiny inline helpers --------------------------------------------- */
function Badge({ count }) {
  return (
    <span style={{
      background: '#222', color: '#fff',
      borderRadius: '999px', padding: '0 0.35rem',
      fontSize: '0.7rem', marginLeft: '0.35rem'
    }}>
      {count}
    </span>
  );
}

const rowStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '0.5rem',
  padding: '0.15rem 0'
};

const pillStyle = src => ({
  display: 'inline-block',
  width: 18,
  height: 18,
  lineHeight: '18px',
  textAlign: 'center',
  borderRadius: '50%',
  fontSize: '0.7rem',
  color: '#fff',
  background: src === 'ruland' ? '#8e24aa' : '#1565c0'
});

const linkStyle = { textDecoration: 'none', color: '#000' };
