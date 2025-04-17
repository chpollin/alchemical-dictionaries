/* Alchemical‑Dictionaries – DataStore singleton
   ---------------------------------------------
   Loads JSON artefacts and offers search helpers.
*/
import lunr from 'lunr';

const BASE =
  import.meta.env.MODE === 'development' ? '/data/' : 'data/';

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

          /* --- NEW: normalise variants / translations to arrays ---------- */
          if (typeof obj.variants === 'string')
            obj.variants = obj.variants.split(/\s*[,;]\s*|\s+/).filter(Boolean);

          if (typeof obj.translations === 'string')
            obj.translations = obj.translations.split(/\s*[,;]\s*/).filter(Boolean);
          /* ---------------------------------------------------------------- */

          this._idMap.set(obj.id, obj);
          this._lemmaMap.set(obj.lemma_norm, obj);
          return obj;
        })
      )
      .then(arr => (this.entries = arr)),

      /* symbols.json ------------------------------------------------------ */
      fetch(`${BASE}symbols.json`)
        .then(r => r.json())
        .then(arr => {
          /* normalise → ensure { id, char, entries, count } */
          this.symbols = arr.map((s, i) => ({
            id:      s.id     ?? `sym-${i}`,
            char:    s.char   ?? s.glyph ?? '',
            entries: s.entries ?? [],
            count:   s.count  ?? (s.entries?.length ?? 0)
          }));
        }),

      /* graph.json -------------------------------------------------------- */
      fetch(`${BASE}graph.json`)
        .then(r => r.json())
        .then(obj => (this.graph = obj)),

        
      /* index.json → hydrate Lunr ---------------------------------------- */
      fetch(`${BASE}index.json`)
        .then(r => r.json())
        .then(idx => (this.lunr = lunr.Index.load(idx)))
    ]);

    return this._ready;
  }

  /** Full‑text search */
  search(q, { limit = 20 } = {}) {
    if (!this.lunr) throw new Error('DataStore not ready');
    return this.lunr.search(q).slice(0, limit).map(h => this._idMap.get(h.ref));
  }

  /* convenience */
  getById(id)           { return this._idMap.get(id); }
  findByLemmaNorm(norm) { return this._lemmaMap.get(norm.toLowerCase()); }
  
  /* NEW: true if the entry referenced by id contains at least one <g> */
  hasSymbol(id) {
    const rec = this._idMap.get(id);
    return rec ? rec.symbols.length > 0 : false;
  }
}

export default new _DataStore();

