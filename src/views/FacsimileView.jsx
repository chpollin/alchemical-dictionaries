/* Alchemical‑Dictionaries – FacsimileView
   ---------------------------------------
   Lightweight placeholder for scanned page images.

   • Route: /facsimiles/:img
     where :img is the numeric part we stripped from "#img_0031"
     in DataStore.facsimileHref().

   • If a matching file exists in /scans/img_<id>.jpg|png
     the <img> tag will show it; otherwise we display a text stub.

   • No external dependencies – pure React 18.
*/

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function FacsimileView () {
  const { img } = useParams();              // e.g. "0031"
  const nav     = useNavigate();
  const [err, setErr] = useState(false);

  // absolute path to a future scan; adjust extension/folder if needed
  const srcJpg = `/scans/img_${img}.jpg`;
  const srcPng = `/scans/img_${img}.png`;

  return (
    <div style={styles.wrap}>
      <header style={styles.head}>
        <button onClick={() => nav(-1)} style={styles.back}>← back</button>
        <h2 style={{ margin: 0 }}>Facsimile #{img}</h2>
      </header>

      {err ? (
        <div style={styles.placeholder}>
          <p>No scan found for <code>img_{img}</code>.</p>
          <p>(When page scans are uploaded to <code>public/scans/</code> they’ll appear here.)</p>
        </div>
      ) : (
        <img
          src={srcJpg}
          onError={() => {      // try PNG fallback once
            if (!err) {
              const el = document.querySelector('img[alt="facsimile"]');
              if (el && el.src.endsWith('.jpg')) el.src = srcPng;
              else setErr(true);
            }
          }}
          alt="facsimile"
          style={styles.img}
        />
      )}

      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        Image viewer coming soon — scans will load automatically when available.
      </p>

      <p>
        <Link to="/">⤺ home</Link>
      </p>
    </div>
  );
}

const styles = {
  wrap:  { maxWidth: 900, margin: '0 auto', padding: '1rem' },
  head:  { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  back:  { background: 'none', border: 0, fontSize: '1rem', cursor: 'pointer' },
  img:   { width: '100%', height: 'auto', boxShadow: '0 0 4px rgba(0,0,0,0.3)' },
  placeholder: {
    padding: '2rem', textAlign: 'center',
    border: '1px dashed #999', color: '#666'
  }
};
