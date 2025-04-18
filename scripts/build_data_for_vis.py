#!/usr/bin/env python3
"""
build_data_for_vis.py – extra aggregates for the Entry‑Lens canvas
v0.3 (2025‑04‑18) – JSON is now minified to keep bundle weight low.

Requires build_data.py in the same package.
"""

from __future__ import annotations
import argparse, json, string
from pathlib import Path
from collections import Counter
import build_data as base                       # re‑use TEI parser

# ————————————————— helpers
def _bucket(txt: str) -> str:
    return (txt[:2] if len(txt) > 1 else txt[0]).lower()

def _de_tokens(text: str):
    return [t.lower() for t in text.split() if len(t) > 2]

def _dump(obj, path: Path) -> None:
    path.write_text(json.dumps(obj, separators=(",", ":"),
                               ensure_ascii=False), "utf8")
    kb = path.stat().st_size / 1024
    print(f"› {path.name:20} {len(obj):>6,} rows  {kb:5.0f} kB")

# ————————————————— main
def main() -> None:
    ap = argparse.ArgumentParser(prog="build_data_for_vis")
    ap.add_argument("--tei-dir", help="folder with ruland.xml & sommerhoff.xml")
    ap.add_argument("--out-dir", default="../public/data")
    ap.add_argument("--pair-limit", type=int, default=10_000)
    args = ap.parse_args()

    tei_dir = base._find_sources(args.tei_dir)
    rows_r, _ = base.extract_entries(tei_dir / "ruland.xml", "ruland")
    rows_s, _ = base.extract_entries(tei_dir / "sommerhoff.xml", "sommerhoff")
    rows = rows_r + rows_s
    out = Path(args.out_dir).expanduser(); out.mkdir(parents=True, exist_ok=True)

    # 1 glyphMatrix
    gm = Counter()
    for r in rows:
        b = _bucket(r["lemma_norm"])
        for g in r["symbols"]:
            gm[(g, b)] += 1
    _dump([{"glyph": g, "bucket": b, "count": c}
           for (g, b), c in gm.items()], out / "glyphMatrix.json")

    # 2 letterHistogram
    hist = {ltr: {"letter": ltr, "ruland": 0, "sommerhoff": 0}
            for ltr in string.ascii_lowercase}
    for r in rows:
        l = r["lemma_norm"][0]
        if l in hist:
            hist[l][r["source"]] += 1
    _dump([hist[l] for l in string.ascii_lowercase],
          out / "letterHistogram.json")

    # 3 lemmaGlossPairs
    pc = Counter()
    for r in rows:
        for de in _de_tokens(r["translations"]):
            pc[(r["lemma_norm"], de)] += 1
    _dump([{"latin": la, "german": de, "count": n}
           for (la, de), n in pc.most_common(args.pair_limit)],
          out / "lemmaGlossPairs.json")

if __name__ == "__main__":
    main()
