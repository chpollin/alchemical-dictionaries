/* Alchemical‑Dictionaries – SymbolsView  (rev 2)
   --------------------------------------------- */
   import { useEffect, useState } from 'react';
   import DataStore from '../lib/dataStore.js';
   
   export default function SymbolsView () {
     const [glyphs, setGlyphs] = useState(null);
   
     useEffect(() => {
       DataStore.ready().then(() => setGlyphs(DataStore.symbols));
     }, []);
   
     if (!glyphs) return <p>Loading symbols…</p>;
   
     return (
       <div style={styles.grid}>
         {glyphs.map((g, i) => (
           <div
             key={`${g.id}-${i}`}                 // ← unique even if ids repeat
             style={styles.cell}
             title={`${g.id}\nlinked: ${preview(g.entries)}`}
             onClick={() => console.log('TODO: open linked list', g)}
           >
             <span style={styles.glyph}>
               {g.char?.trim() ? g.char : g.id}
             </span>
             <span style={styles.count}>{g.entries.length}</span>
           </div>
         ))}
       </div>
     );
   }
   
   /* helpers ------------------------------------------------------------- */
   function preview(arr, n = 3) {
     return arr.slice(0, n).join(', ') + (arr.length > n ? '…' : '');
   }
   
   /* simple inline styles ------------------------------------------------ */
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
   