/* Alchemical‑Dictionaries – App shell
   -----------------------------------
   * global data bootstrap (DataStore.ready)
   * React‑Router SPA navigation
   * routes:
       /search        – SearchView (live search)
       /symbols       – SymbolsView (glyph gallery)
       /entry/:id     – EntryView  (single dictionary article)
       /network       – placeholder
       /timeline      – placeholder
*/
import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate
} from 'react-router-dom';
import DataStore from './lib/dataStore.js';

import SearchView   from './views/SearchView.jsx';
import SymbolsView  from './views/SymbolsView.jsx';
import EntryView    from './views/EntryView.jsx';

/* still placeholders – we’ll flesh them out next */
function NetworkView()  { return <h2>Synonym network (coming soon)</h2>; }
function TimelineView() { return <h2>Timeline heat‑map (coming soon)</h2>; }

export default function App() {
  const [ready, setReady] = useState(false);

  /* one‑time corpus load */
  useEffect(() => {
    DataStore.ready().then(() => setReady(true)).catch(console.error);
  }, []);

  if (!ready) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>Alchemical‑Dictionaries</h1>
        <p>Loading data…</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <header style={styles.header}>
        <h1 style={{ margin: '0 1rem 0 0' }}>Alchemical‑Dictionaries</h1>

        <nav style={styles.nav}>
          <NavLink to="/search"   style={styles.link}>Search</NavLink>
          <NavLink to="/symbols"  style={styles.link}>Symbols</NavLink>
          <NavLink to="/network"  style={styles.link}>Network</NavLink>
          <NavLink to="/timeline" style={styles.link}>Timeline</NavLink>
        </nav>
      </header>

      <main style={{ padding: '1rem' }}>
        <Routes>
          <Route path="/"            element={<Navigate to="/search" replace />} />
          <Route path="/search"      element={<SearchView   />} />
          <Route path="/symbols"     element={<SymbolsView  />} />
          <Route path="/entry/:id"   element={<EntryView    />} />
          <Route path="/network"     element={<NetworkView  />} />
          <Route path="/timeline"    element={<TimelineView />} />
          <Route path="*"            element={<h2>Page not found</h2>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    background: '#222',
    color: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  },
  nav:  { display: 'flex', gap: '1rem' },
  link: ({ isActive }) => ({
    color: isActive ? '#ffd54f' : '#fff',
    textDecoration: 'none',
    fontWeight: isActive ? 600 : 400
  })
};
