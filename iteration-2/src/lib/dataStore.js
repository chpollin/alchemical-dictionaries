/* Alchemical‑Dictionaries – DataStore singleton
   ---------------------------------------------
   Loads:
     public/data/entries.ndjson   – 20 576 entry records
     public/data/symbols.json     – 294 glyphs
     public/data/graph.json       – { nodes, edges }
     public/data/index.json       – Lunr v2 serialisation
   Exposes:
     await DataStore.ready()
     DataStore.entries            // Array
     DataStore.symbols            // Array
     DataStore.graph              // { nodes, edges }
     DataStore.search(q, {limit}) // ranked entry objects
     DataStore.getById(id)
     DataStore.findByLemmaNorm(str)
*/

import lunr from 'lunr';     // local dependency (npm i lunr)

const BASE =
  import.meta.env.MODE === 'development'
    ? '/data/'   // vite dev‑server serves public/ at /
    : 'data/';   // after build everything sits in dist/

class _DataStore {
  _ready = null;
  _idMap = new Map();
  _lemmaMap = new Map();

  /** Resolves when all JSON + Lunr index are loaded */
  ready() {
    if (this._ready) return this._ready;

    this._ready = Promise.all([
      /* entries.ndjson ---------------------------------------------------- */
      fetch(BASE + 'entries.ndjson')
        .then(r => r.text())
        .then(text =>
          text.trim().split('\n').map(line => {
            const obj = JSON.parse(line);
            this._idMap.set(obj.id, obj);
            this._lemmaMap.set(obj.lemma_norm, obj);
            return obj;
          })
        )
        .then(arr => (this.entries = arr)),

      /* symbols.json ------------------------------------------------------ */
      fetch(BASE + 'symbols.json')
        .then(r => r.json())
          .then(arr => (this.symbols = arr.map((s, i) => ({
                id:    s.id    ?? `sym-${i}`,       // fallback key
                char:  s.char  ?? s.glyph ?? '',    // <- point UI to the glyph
                entries: s.entries ?? [],
                count:  s.count ?? (s.entries?.length ?? 0)
            })))),

      /* graph.json -------------------------------------------------------- */
      fetch(BASE + 'graph.json')
        .then(r => r.json())
        .then(obj => (this.graph = obj)),

      /* index.json  → hydrate Lunr --------------------------------------- */
      fetch(BASE + 'index.json')
        .then(r => r.json())
        .then(idx => (this.lunr = lunr.Index.load(idx)))
    ]);

    return this._ready;
  }

  /** Full‑text search */
  search(q, { limit = 20 } = {}) {
    if (!this.lunr) throw new Error('DataStore not ready – call await DataStore.ready()');
    return this.lunr
      .search(q)
      .slice(0, limit)
      .map(hit => this._idMap.get(hit.ref));
  }

  /* Convenience getters */
  getById(id)               { return this._idMap.get(id); }
  findByLemmaNorm(norm)     { return this._lemmaMap.get(norm.toLowerCase()); }
}

/* export singleton */
const DataStore = new _DataStore();
export default DataStore;
