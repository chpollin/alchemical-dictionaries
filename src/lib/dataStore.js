/* Alchemical‑Dictionaries – DataStore singleton
   ---------------------------------------------
   Loads JSON artefacts and offers search helpers.
   v0.4 – 2025‑04‑18   (adds new fields + helper utils)
*/
import lunr from 'lunr';

const DEV  = import.meta.env.MODE === 'development';
const BASE = DEV ? '/data/' : 'data/';

class _DataStore {
  _ready   = null;
  _idMap   = new Map();            // id  → record
  _lemmaMap= new Map();            // lemma_norm → record

  /* ---------- public helpers ------------------------------------------- */
  ready() {                        // returns a promise
    if (this._ready) return this._ready;

    const t0 = performance.now();
    this._ready = Promise.all([
      /* entries.ndjson --------------------------------------------------- */
      fetch(BASE + 'entries.ndjson')
        .then(r => r.text())
        .then(text => {
          this.entries = text.trim().split('\n').map(line => this._parseEntry(JSON.parse(line)));
          return this.entries;
        }),

      /* symbols.json ----------------------------------------------------- */
      fetch(BASE + 'symbols.json')
        .then(r => r.json())
        .then(arr => {
          this.symbols = arr.map((s,i) => ({
            id:      s.id     ?? `sym-${i}`,
            char:    s.glyph  ?? s.char ?? '',
            entries: s.entries?? [],
            count:   s.count  ?? (s.entries?.length ?? 0)
          }));
        }),

      /* graph.json ------------------------------------------------------- */
      fetch(BASE + 'graph.json')
        .then(r => r.json())
        .then(obj => (this.graph = obj)),

      /* index.json ------------------------------------------------------- */
      fetch(BASE + 'index.json')
        .then(r => r.json())
        .then(idx => (this.lunr = lunr.Index.load(idx)))
    ])
    .then(() => {
      const dt = (performance.now() - t0).toFixed(0);
      console.info(`[DS] loaded ${this.entries.length} entries in ${dt} ms`);
    });

    return this._ready;
  }

  /** Case‑insensitive full‑text search (Lunr) */
  search(q, { limit = 20 } = {}) {
    if (!this.lunr) throw new Error('DataStore not ready');
    return this.lunr.search(q).slice(0, limit).map(h => this._idMap.get(h.ref));
  }

  getById(id)           { return this._idMap.get(id); }
  findByLemmaNorm(n)    { return this._lemmaMap.get(n.toLowerCase()); }
  hasSymbol(id)         { return this._idMap.get(id)?.symbols.length > 0; }

  /** Strip “~dup…” suffix so the UI hides synthetic disambiguators */
  displayId(id)         { return id.replace(/~dup\d+$/, ''); }

  /** Build placeholder facsimile href (`/facsimiles/img_0031`) */
  facsimileHref(rec) {
    if (!rec?.facs) return '#';
    const img = rec.facs.replace(/^#/, '').replace(/^img_/, '');
    return `facsimiles/${img}`;
  }

  /* ---------- private -------------------------------------------------- */
  _parseEntry(obj) {
    /* 1. string → array conversions  ------------------------------------ */
    if (typeof obj.variants     === 'string')
      obj.variants     = obj.variants.split(/\s+/).filter(Boolean);
    if (typeof obj.translations === 'string')
      obj.translations = obj.translations.split(/\s*[,;]\s*/).filter(Boolean);

    /* 2. index maps ------------------------------------------------------ */
    this._idMap.set(obj.id, obj);
    this._lemmaMap.set(obj.lemma_norm, obj);

    return obj;
  }
}

export default new _DataStore();
