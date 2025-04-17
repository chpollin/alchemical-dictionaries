# Alchemical‑Dictionaries 🜛  
*Digital edition & exploratory UI for two early‑modern Latin–German alchemical lexicons*

---

## 1  Why this repo exists
* **Ruland 1612 – *Lexicon Alchemiae*** (≈ 3 k entries)
* **Sommerhoff 1701 – *Lexicon pharmaceutico‑chymicum*** (≈ 17 k entries)

Both dictionaries are TEI‑XML (CC‑BY 4.0) and come with high‑quality OCR.  This project parses the TEI, generates lightweight JSON artefacts, and serves them through a small **React + Vite SPA** for search, symbol exploration, and forthcoming network/timeline views.

---

## 2  Quick start (dev mode)
```bash
# 1. clone & install
$ git clone https://github.com/…/alchemical-dictionaries.git
$ cd iteration-2
$ npm install            # front‑end deps
$ pip install -r requirements.txt   # python build deps

# 2. one‑shot data build → public/data/
$ npm run data

# 3. launch dev server (auto‑rebuilds JSON then starts Vite)
$ npm run dev            # http://localhost:5173
```

---

## 3  Commands
| Script | What it does |
|--------|--------------|
| `npm run data` | Run `scripts/build_data.py` → produce **entries.ndjson**, **index.json**, **graph.json**, **symbols.json** inside `public/data/`. |
| `npm run dev` | Regenerate data **then** start Vite dev‑server. Hot reload for React code; re‑run `npm run data` manually if you change the TEI or the build script. |
| `npm run build` | Regenerate data **then** create a production bundle in `dist/` and copy the JSON artefacts alongside. |
| `npm run preview` | Static preview of the built site. |

Python entry‑point supports custom folders:
```bash
$ python scripts/build_data.py --tei-dir ./tei --out-dir ./public/data
```

---

## 4  Folder layout (after first build)
```
iteration-2/
├─ public/
│  └─ data/            # JSON artefacts consumed by the SPA
├─ dist/               # production build (``npm run build``)
├─ src/                # React source (views, components, lib)
├─ scripts/
│  └─ build_data.py    # TEI → JSON pipeline
└─ tei/                # ruland.xml, sommerhoff.xml
```

A complete schema of the JSON files lives in **`DATA‑JSON.md`**.