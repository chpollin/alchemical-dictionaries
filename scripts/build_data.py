#!/usr/bin/env python3
"""
build_data.py – generate all JSON artefacts for the *Alchemical‑Dictionaries* SPA
================================================================================
v3 · 2025‑04‑17 (iteration 3 + network enrichment)

Outputs → ../public/data/  (dev)  or any folder via --out-dir
  • entries.ndjson   – one dictionary article per line
  • index.json       – Lunr v2 serialisation for client‑side search
  • graph.json       – lemma/variant/x‑ref network with rich node attrs
  • symbols.json     – glyph ↔ entry map, printable char included
"""

from __future__ import annotations
import argparse, json, re, unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Any, DefaultDict

from lxml import etree            # pip install lxml
from lunr import lunr             # pip install lunr[languages]
from tqdm import tqdm             # pip install tqdm

TEI_NS = {"tei": "http://www.tei-c.org/ns/1.0"}
REQ_FILES = ("ruland.xml", "sommerhoff.xml")

# --------------------------------------------------------------------------- helpers
def _norm(txt: str) -> str:
    """lower‑case, strip diacritics, collapse whitespace"""
    txt = unicodedata.normalize("NFKD", txt.lower())
    txt = "".join(c for c in txt if not unicodedata.combining(c))
    return " ".join(txt.split())

def _text(node: etree._Element) -> str:
    """all descendant text in reading order, single‑spaced"""
    return " ".join(t.strip() for t in node.xpath(".//text()") if t.strip())

# --------------------------------------------------------------------------- glyph parsing
def parse_glyphs(tei_path: Path) -> Dict[str, str]:
    """Sommerhoff only: map glyph xml:id → printable char."""
    tree = etree.parse(str(tei_path))
    m: Dict[str, str] = {}
    for g in tree.xpath("//tei:glyph", namespaces=TEI_NS):
        gid = g.get("{http://www.w3.org/XML/1998/namespace}id")
        if not gid:
            continue
        std = g.xpath("string(.//tei:mapping[@type='standardized'])", namespaces=TEI_NS).strip()
        if std:
            m[gid] = std
            continue
        uni = g.xpath("string(.//tei:mapping[@type='Unicode'])", namespaces=TEI_NS).strip()
        if uni:
            try:
                m[gid] = "".join(chr(int(cp, 16)) for cp in uni.split())
            except ValueError:
                m[gid] = ""
    return m

# --------------------------------------------------------------------------- TEI extraction
def extract_entries(path: Path, tag: str) -> List[Dict[str, Any]]:
    tree = etree.parse(str(path))
    glyph_map = parse_glyphs(path) if tag == "sommerhoff" else {}
    recs: List[Dict[str, Any]] = []

    for idx, e in enumerate(tqdm(tree.xpath("//tei:entry", namespaces=TEI_NS),
                                 desc=f"entries {tag}", leave=False)):
        xml_id = (e.get("{http://www.w3.org/XML/1998/namespace}id")
                  or e.get("n") or f"{tag}:{idx}")

        # --- lemma ---------------------------------------------------------
        lemma_nodes = e.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
        if lemma_nodes:
            lemma      = _text(lemma_nodes[0])
            lemma_norm = _norm(lemma)
        else:
            lemma      = "⚠︎missing"
            lemma_norm = "missing"

        variants = [_text(v) for v in e.xpath(".//tei:form[@type='variant']", namespaces=TEI_NS)]
        translations = [_text(q) for q in
                        e.xpath(".//tei:cit[@type='translation']//tei:quote", namespaces=TEI_NS)]
        definition = " ".join(_text(d) for d in e.xpath(".//tei:def", namespaces=TEI_NS))

        symbols = [g.get("ref").lstrip("#") for g in e.xpath(".//tei:g[@ref]", namespaces=TEI_NS)]

        recs.append({
            "id": xml_id,
            "source": tag,
            "lemma": lemma,
            "lemma_norm": lemma_norm,
            "variants": " ".join(variants),
            "translations": " ".join(translations),
            "definition": definition,
            "symbols": symbols,
        })

    return recs, glyph_map

# --------------------------------------------------------------------------- writers
def write_ndjson(rows, fp: Path):
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows), "utf8")
    print(f"›  {fp.name:12} {fp.stat().st_size/1024:6.0f} kB")

def write_lunr(rows, fp: Path):
    idx = lunr(ref="id",
               fields=("lemma", "lemma_norm", "variants", "translations", "definition"),
               documents=rows)
    fp.write_text(json.dumps(idx.serialize(), ensure_ascii=False), "utf8")
    print(f"›  {fp.name:12} {fp.stat().st_size/1024:6.0f} kB")

def write_graph(rows, fp: Path):
    nodes: Dict[str, Dict[str, Any]] = {}
    edges: List[Dict[str, str]] = []

    deg: DefaultDict[str, int] = defaultdict(int)
    vdeg: DefaultDict[str, int] = defaultdict(int)
    xdeg: DefaultDict[str, int] = defaultdict(int)

    v_pat = re.compile(r"vide\s+(?P<t>[A-Za-z0-9 ].+)", flags=re.I)

    for r in rows:
        nid = r["id"]
        nodes[nid] = {
            "id": nid,
            "label": r["lemma"],
            "source": r["source"],
            "hasSymbol": bool(r["symbols"]),
            "deg": 0, "variantDeg": 0, "xrefDeg": 0
        }

        # variant edges: entry → each variant token (normalised)
        for v in r["variants"].split():
            tgt = _norm(v)
            edges.append({"source": nid, "target": tgt, "type": "variant"})
            deg[nid] += 1; vdeg[nid] += 1

        # x‑ref edges
        m = v_pat.match(r["definition"])
        if m:
            tgt = _norm(m.group("t"))
            edges.append({"source": nid, "target": tgt, "type": "xref"})
            deg[nid] += 1; xdeg[nid] += 1

    # update degrees
    for n in nodes.values():
        n["deg"]        = deg[n["id"]]
        n["variantDeg"] = vdeg[n["id"]]
        n["xrefDeg"]    = xdeg[n["id"]]

    json.dump({"v": "2025‑04‑17", "nodes": list(nodes.values()), "edges": edges},
              fp.open("w", encoding="utf8"), ensure_ascii=False)
    print(f"›  {fp.name:12} nodes: {len(nodes):,}  edges: {len(edges):,}")

def write_symbols(rows, glyph_map: Dict[str, str], fp: Path):
    sym: DefaultDict[str, List[str]] = defaultdict(list)
    for r in rows:
        for s in r["symbols"]:
            sym[s].append(r["id"])
    out = [{"id": sid, "glyph": glyph_map.get(sid, ""), "entries": e, "count": len(e)}
           for sid, e in sorted(sym.items(), key=lambda t: -len(t[1]))]
    json.dump(out, fp.open("w", encoding="utf8"), ensure_ascii=False)
    print(f"›  {fp.name:12} glyphs: {len(out):,}")

# --------------------------------------------------------------------------- path helper
def _find_sources(cli: str | None) -> Path:
    if cli:
        p = Path(cli).expanduser()
        if all((p / f).exists() for f in REQ_FILES):
            return p
        print(f"⚠︎ --tei-dir '{cli}' missing required files")

    for cand in [Path("tei"), Path("data"), Path("../tei"), Path("../data"),
                 Path(__file__).resolve().parent / "../tei",
                 Path(__file__).resolve().parent / "../data"]:
        if all((cand / f).exists() for f in REQ_FILES):
            return cand

    raise SystemExit("❌  Could not locate ruland.xml & sommerhoff.xml – use --tei-dir.")

# --------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tei-dir", help="folder with TEI XMLs")
    ap.add_argument("--out-dir", default="../public/data", help="output folder")
    args = ap.parse_args()

    tei_dir = _find_sources(args.tei_dir)
    out_dir = Path(args.out_dir).expanduser()

    # ---- parse
    rec_r, _          = extract_entries(tei_dir / "ruland.xml", "ruland")
    rec_s, glyph_map  = extract_entries(tei_dir / "sommerhoff.xml", "sommerhoff")
    rows = rec_r + rec_s
    print(f"›  Total entries: {len(rows):,}")

    # ---- write
    write_ndjson(rows,        out_dir / "entries.ndjson")
    write_lunr(rows,          out_dir / "index.json")
    write_graph(rows,         out_dir / "graph.json")
    write_symbols(rows, glyph_map, out_dir / "symbols.json")

if __name__ == "__main__":
    main()
