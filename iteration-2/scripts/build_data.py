#!/usr/bin/env python3
"""build_data.py – produce static artefacts for the *Alchemical‑Dictionaries* SPA
================================================================================

**Input**
  • TEI sources: ``ruland.xml`` (1612) & ``sommerhoff.xml`` (1701).

**Output** → ``../dist/data/``
  ├─ ``entries.ndjson``   – one JSON‑line per `<entry>`
  ├─ ``index.json``       – Lunr v2 serialisation used by the Search bar
  ├─ ``graph.json``       – lemma/variant/x‑ref network (Cytoscape)
  └─ ``symbols.json``     – symbol‑to‑entry map *including the rendered glyph*

Run from the repository root (or pass ``--tei-dir``)::

    python scripts/build_data.py                       # ← auto‑detects XML folder
    python scripts/build_data.py --tei-dir ./data/tei  # ← explicit path

Changelog (2025‑04‑17)
----------------------
* **Robust source resolution** – searches typical folders if ``--tei-dir`` is omitted.
* **Glyph extraction** – parses `<glyph>` declarations (Sommerhoff) and assigns a printable
  character to each `@xml:id`. The Symbols catalogue now contains that character so the
  front‑end grid can render the icon without extra logic.
* **Friendly errors** – clear messages when required XML files are missing.
"""
from __future__ import annotations

import argparse, json, unicodedata, re, sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

from lxml import etree  # pip install lxml
from lunr import lunr   # pip install lunr[languages]
from tqdm import tqdm    # pip install tqdm


TEI_NS = {"tei": "http://www.tei-c.org/ns/1.0"}
REQ_FILES = ("ruland.xml", "sommerhoff.xml")

# ---------------------------------------------------------------------------
# utilities
# ---------------------------------------------------------------------------

def _norm(txt: str) -> str:
    """Lower‑case, strip diacritics, collapse whitespace."""
    txt = unicodedata.normalize("NFKD", txt.lower())
    txt = "".join(c for c in txt if not unicodedata.combining(c))
    return " ".join(txt.split())


def _text_content(node: etree._Element) -> str:
    """Return all descendant text in reading order, single‑spaced."""
    if node is None:
        return ""
    parts = [t.strip() for t in node.xpath(".//text()") if t.strip()]
    return " ".join(parts)


# ---------------------------------------------------------------------------
# glyph handling (Sommerhoff only)
# ---------------------------------------------------------------------------

def parse_glyphs(tei_path: Path) -> Dict[str, str]:
    """Return a **mapping** ``xml:id → printable glyph (str)``.

    Resolution order per glyph element:
      1. `<mapping type='standardized'>🝩</mapping>` – already literal.
      2. `<mapping type='Unicode'>1F769</mapping>` – hex code point.
      3. Fallback: empty string – front end can still show a placeholder.
    """
    glyph_map: Dict[str, str] = {}
    tree = etree.parse(str(tei_path))
    for g in tree.xpath("//tei:glyph", namespaces=TEI_NS):
        gid = g.get("{http://www.w3.org/XML/1998/namespace}id")
        if not gid:
            continue
        # try standardized (usually already the 🝩 char)
        std = g.xpath("string(.//tei:mapping[@type='standardized'])", namespaces=TEI_NS).strip()
        if std:
            glyph_map[gid] = std
            continue
        # else try Unicode code point(s)
        uni = g.xpath("string(.//tei:mapping[@type='Unicode'])", namespaces=TEI_NS).strip()
        if uni:
            # may contain space‑separated sequence, but Sommerhoff uses single code points
            try:
                glyph_map[gid] = "".join(chr(int(cp, 16)) for cp in uni.split())
            except ValueError:
                glyph_map[gid] = ""  # malformed – ignore safely
    return glyph_map


# ---------------------------------------------------------------------------
# entry extraction
# ---------------------------------------------------------------------------

def extract_entries(path: Path, src_tag: str) -> List[Dict[str, Any]]:
    """Extract *entry‑level* records from one TEI file."""
    tree = etree.parse(str(path))
    glyph_lookup: Dict[str, str] = {}
    if src_tag == "sommerhoff":  # only Sommerhoff defines glyph catalogue
        glyph_lookup = parse_glyphs(path)

    records: List[Dict[str, Any]] = []
    entries_xml = tree.xpath("//tei:entry", namespaces=TEI_NS)

    for idx, entry in enumerate(tqdm(entries_xml, desc=f"entries {src_tag}", leave=False)):
        # -- identifiers ----------------------------------------------------
        xml_id = (
            entry.get("{http://www.w3.org/XML/1998/namespace}id")
            or entry.get("n")
            or f"{src_tag}:{idx}"
        )

        # -- lemma + normalised lemma --------------------------------------
        lemma_nodes = entry.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
        lemma = _text_content(lemma_nodes[0]) if lemma_nodes else "⚠︎missing"
        lemma_norm = _norm(lemma)

        # -- variants -------------------------------------------------------
        variant_nodes = entry.xpath(".//tei:form[@type='variant']", namespaces=TEI_NS)
        variants = [ _text_content(v) for v in variant_nodes ]
        variants_str = " ".join(variants)

        # -- translations (German quotes) ----------------------------------
        quote_nodes = entry.xpath(".//tei:cit[@type='translation']//tei:quote", namespaces=TEI_NS)
        translations = [ _text_content(q) for q in quote_nodes ]
        translations_str = " ".join(translations)

        # -- definition text ----------------------------------------------
        def_nodes = entry.xpath(".//tei:def", namespaces=TEI_NS)
        definition = " ".join(_text_content(d) for d in def_nodes)

        # -- referenced symbols -------------------------------------------
        symbols_ids: List[str] = []
        for g in entry.xpath(".//tei:g", namespaces=TEI_NS):
            ref = g.get("ref")
            if ref:
                symbols_ids.append(ref.lstrip("#"))

        records.append({
            "id": xml_id,
            "source": src_tag,
            "lemma": lemma,
            "lemma_norm": lemma_norm,
            "variants": variants_str,
            "translations": translations_str,
            "definition": definition,
            "symbols": symbols_ids,
        })

    return records


# ---------------------------------------------------------------------------
# artefact writers
# ---------------------------------------------------------------------------

def write_ndjson(records: List[Dict[str, Any]], out_file: Path) -> None:
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with out_file.open("w", encoding="utf8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"›  {out_file.name}   {out_file.stat().st_size/1024:,.0f} kB")


def write_lunr_index(records: List[Dict[str, Any]], out_file: Path) -> None:
    idx = lunr(
        ref="id",
        fields=("lemma", "lemma_norm", "variants", "translations", "definition"),
        documents=records,
    )
    out_file.write_text(json.dumps(idx.serialize(), ensure_ascii=False), encoding="utf8")
    print(f"›  {out_file.name}   {out_file.stat().st_size/1024:,.0f} kB")


def write_graph(records: List[Dict[str, Any]], out_file: Path) -> None:
    nodes, edges = [], []
    for rec in records:
        nid = rec["id"]
        nodes.append({"id": nid, "label": rec["lemma"]})
        # variant edges – connect lemma to each variant token (simple heuristic)
        for v in rec["variants"].split():
            if v:
                edges.append({"source": nid, "target": _norm(v), "type": "variant"})
        # textual cross‑references “vide …”
        m = re.match(r"vide\s+(?P<target>[A-Za-z0-9 ].+)$", rec["definition"], flags=re.I)
        if m:
            edges.append({"source": nid, "target": _norm(m.group("target")), "type": "xref"})
    json.dump({"nodes": nodes, "edges": edges}, out_file.open("w", encoding="utf8"), ensure_ascii=False)
    print(f"›  {out_file.name}   nodes: {len(nodes):,}   edges: {len(edges):,}")


def write_symbol_catalogue(records: List[Dict[str, Any]], glyph_map: Dict[str, str], out_file: Path) -> None:
    """Create **symbols.json** with printable glyphs and linked entry ids."""
    sym_map: Dict[str, List[str]] = {}
    for rec in records:
        for sym_id in rec["symbols"]:
            sym_map.setdefault(sym_id, []).append(rec["id"])

    symbols = [
        {"id": sid, "glyph": glyph_map.get(sid, ""), "entries": e, "count": len(e)}
        for sid, e in sorted(sym_map.items(), key=lambda t: -len(t[1]))
    ]
    json.dump(symbols, out_file.open("w", encoding="utf8"), ensure_ascii=False)
    print(f"›  {out_file.name}   glyphs: {len(symbols):,}")


# ---------------------------------------------------------------------------
# path helpers
# ---------------------------------------------------------------------------

def _find_sources(cli_dir: str | None) -> Path:
    """Return a directory that contains both required TEI files."""

    # 1. CLI flag
    if cli_dir:
        p = Path(cli_dir).expanduser()
        if all((p / f).exists() for f in REQ_FILES):
            return p
        print(f"⚠︎  --tei-dir '{cli_dir}' does not contain all XML files")

    # 2. common fallbacks relative to *cwd*
    candidates = [
        Path("tei"),
        Path("data"),
        Path("../tei"),
        Path("../data"),
        Path(__file__).resolve().parent / "../tei",  # repo_root/tei when called from scripts/
        Path(__file__).resolve().parent / "../data",
    ]
    for d in candidates:
        if all((d / f).exists() for f in REQ_FILES):
            return d

    raise SystemExit("❌  Could not locate ruland.xml & sommerhoff.xml – use --tei-dir.")


# ---------------------------------------------------------------------------
# entry point
# ---------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser(description="Build JSON artefacts for the SPA.")
    ap.add_argument("--tei-dir", help="folder containing ruland.xml & sommerhoff.xml")
    ap.add_argument("--out-dir", default="../dist/data", help="output folder for JSON artefacts")
    args = ap.parse_args()

    tei_dir = _find_sources(args.tei_dir)
    out_dir = Path(args.out_dir).expanduser()

    # -- parse both dictionaries ------------------------------------------
    ruland_file, sommerhoff_file = (tei_dir / n for n in REQ_FILES)

    print("› Parsing ruland.xml …")
    recs_r = extract_entries(ruland_file, "ruland")

    print("› Parsing sommerhoff.xml …")
    recs_s = extract_entries(sommerhoff_file, "sommerhoff")

    all_recs = recs_r + recs_s
    print(f"›  Total entries: {len(all_recs):,}")

    # -- write artefacts ----------------------------------------------------
    write_ndjson(all_recs, out_dir / "entries.ndjson")
    write_lunr_index(all_recs, out_dir / "index.json")
    write_graph(all_recs, out_dir / "graph.json")

    # glyph catalogue for Symbols view
    glyph_map = parse_glyphs(sommerhoff_file)
    write_symbol_catalogue(all_recs, glyph_map, out_dir / "symbols.json")


if __name__ == "__main__":
    main()
