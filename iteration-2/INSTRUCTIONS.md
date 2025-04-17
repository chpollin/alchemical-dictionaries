# INSTRUCTIONS.md – Build & Publish the **Alchemical‑Dictionaries** Single‑Page Application

This guide describes how to transform the two TEI sources (*Ruland 1612* & *Sommerhoff 1701*) into a performant static SPA that can be hosted on GitHub Pages.  It implements every functional requirement in the original specification **except** the facsimile panel (page images are not available) and deliberately omits CI/CD and future‑upgrade notes.

---

## 1  Repository & Branch Strategy

| branch     | purpose                                                                      |
| ---------- | ---------------------------------------------------------------------------- |
| `main`     | source code, TEI files, build scripts                                        |
| `gh-pages` | **built artefacts only** – the contents of `dist/` after each manual release |

> **Manual deploy** – after running the build in step 4, copy the `dist/` directory to a temporary work‑tree, commit, and force‑push to `gh-pages`.
>
> ```bash
> # manual deployment (from the project root)
> rm -rf /tmp/spa-release && mkdir /tmp/spa-release
> cp -R dist/* /tmp/spa-release
> cd /tmp/spa-release
> git init && git remote add origin git@github.com:USERNAME/PROJECT.git
> git checkout -b gh-pages
> git add . && git commit -m "release: $(date +%Y-%m-%d)"
> git push -f origin gh-pages
> ```

---

## 2  Offline Pre‑processing (TEI → Static JSON)

GitHub Pages serves static files only; therefore *all* data extraction and indexing happens **before** release.

```bash
# one‑time setup (Python 3.9+)
pip install -r requirements.txt      # includes lxml, unicodedata2, lunr, tqdm

# build the artefacts
python scripts/build_data.py         # run locally
```

`build_data.py` performs:

1. **Parse TEI** – keep `xml:id`, `@facs`, and all cross‑references.
2. **Normalise lemmas** – lower‑case and strip diacritics to enable fuzzy matching.
3. **Emit artefacts** into `dist/data/`:
   - `entries.ndjson` – one record per `<entry>` with lemma, variants, translations, symbols.
   - `index.json`     – **Lunr** full‑text index (≈ 300 kB gzip for ≈ 20 k rows).
   - `symbols.json`   – glyph catalogue for the symbol explorer.
   - `graph.json`     – nodes & edges for the synonym / variant network.

> **Why Lunr?**  It ships on PyPI (`pip install lunr`), has zero native deps, serialises directly to the JSON format that Lunr.js consumes in the browser, and keeps search P95 well under the 300 ms budget on 20 k documents.
>
> **Alternative:** if you prefer FlexSearch, add a tiny Node script (`node scripts/build_index.mjs`) that reads `entries.ndjson`, calls `FlexSearch.export()`, and writes `index.json`.  Everything else in the pipeline stays identical.

---

## 3  Front‑End Stack

| feature                       | library / tech                                                    |
| ----------------------------- | ----------------------------------------------------------------- |
| SPA shell & routing           | **React 18 + Vite**                                               |
| Global search & auto‑complete | Lunr.js + Algolia **autocomplete‑core** (powered by `index.json`) |
| Entry viewer (tabs, diff)     | React + Zustand + Prism (XML highlight)                           |
| Symbol explorer               | CSS Grid + click‑through modal                                    |
| Network visualisation         | **Cytoscape.js** (renders 5 k nodes interactively)                |
| Timeline & frequency charts   | **Chart.js** (heat‑maps & bars)                                   |

The entire stack is client‑side JavaScript, satisfying the "no back‑end" constraint while staying within the 300 ms P95 latency target.

**Routing note** – add a `404.html` that is byte‑identical to `index.html` so GitHub Pages rewrites deep links back to the SPA entry point.

---

## 4  Directory Layout (after build)

```
dist/
  index.html           # SPA entry point
  404.html             # copy of index.html for client routing
  assets/              # Vite‑generated JS/CSS chunks (hashed)
  data/
    index.json         # Lunr search index
    entries.ndjson
    symbols.json
    graph.json
```

Total bundle size: \~4 MB gzip JS/CSS + \~7 MB JSON  → well under the 100 MB cap.

---

## 5  Handling Large Assets

- **TEI sources** can bloat the repository. Track them with **Git LFS** via `.gitattributes`; only distilled JSON is shipped to `gh-pages`.
- If high‑resolution page images become available later, host them externally (e.g. IIIF) so the SPA size stays modest.

---

## 6  Authorised Inline Editing (Requirement F‑11)

Because the hosting layer is read‑only, editing is implemented via the GitHub REST API from the browser:

1. The user clicks **Edit** → a modal displays the TEI fragment.
2. On *Save*, the SPA:
   - creates a branch `edit/<username>/<date>` via the API,
   - commits the patched XML,
   - opens a Pull Request to `main`.
3. After manual merge, re‑run step 2 locally and re‑deploy to `gh-pages`.

This workflow satisfies the digital‑lexicographer user story without server infrastructure.

---

## 7  API for Researchers (Requirement F‑13)

Publishing artefacts in `/data/` automatically exposes simple GET endpoints under:

```
https://USERNAME.github.io/PROJECT/data/entries.ndjson
https://USERNAME.github.io/PROJECT/data/graph.json
```

Researchers can `fetch()` or `wget` these files directly.  When necessary, include a small `README` inside `/data/` describing field semantics derived from *DATA.md*.

---

## 8  Local Development Workflow

```bash
# clone & install dependencies (Node + Python)
git clone git@github.com:USERNAME/PROJECT.git
cd PROJECT
npm i                          # front‑end deps
pip install -r requirements.txt  # lxml, lunr, etc.

# build data
python scripts/build_data.py

# start Vite dev server with hot reload
npm run dev    # http://localhost:5173
```

*Revised April 17, 2025.*



