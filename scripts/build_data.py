#!/usr/bin/env python3
"""
build_data.py – generate JSON artefacts for the *Alchemical‑Dictionaries* SPA
=============================================================================
*Version 0.6.1  ·  2025‑04‑18*

### What’s new vs 0.6.0
* **Edge & node counters** now printed in the debug block.
* **Blank pagination counters** – see how many entries still miss `page` or `facs`.
* **Duplicate‑id counter** surfaces both at graph build and in the summary.
* **Safety exit** if node count ≠ entry count (helps CI).

Outputs stay drop‑in compatible with the React SPA.
"""

from __future__ import annotations
import argparse, json, re, unicodedata, sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, DefaultDict, Dict, List

from lxml import etree  # pip install lxml
from lunr import lunr   # pip install lunr[languages]
from tqdm import tqdm   # pip install tqdm

TEI_NS = {"tei": "http://www.tei-c.org/ns/1.0"}
REQ_FILES = ("ruland.xml", "sommerhoff.xml")

# --------------------------------------------------------------------------- helpers
def _norm(txt: str) -> str:
    """lower‑case, strip diacritics, collapse whitespace"""
    txt = unicodedata.normalize("NFKD", txt.lower())
    txt = "".join(c for c in txt if not unicodedata.combining(c))
    return " ".join(txt.split())


def _text(node: etree._Element) -> str:
    """Flatten node text (descendant order, single‑spaced)."""
    return " ".join(t.strip() for t in node.xpath(".//text()") if t.strip())

# --------------------------------------------------------------------------- glyph parsing
def _parse_glyphs(path: Path) -> Dict[str, str]:
    gmap: Dict[str, str] = {}
    tree = etree.parse(str(path))
    for g in tree.xpath("//tei:glyph", namespaces=TEI_NS):
        gid = g.get("{http://www.w3.org/XML/1998/namespace}id")
        if not gid:
            continue
        std = g.xpath("string(.//tei:mapping[@type='standardized'])", namespaces=TEI_NS).strip()
        if std:
            gmap[gid] = std
            continue
        uni = g.xpath("string(.//tei:mapping[@type='Unicode'])", namespaces=TEI_NS).strip()
        if uni:
            try:
                gmap[gid] = "".join(chr(int(cp, 16)) for cp in uni.split())
            except ValueError:
                pass
    return gmap

# --------------------------------------------------------------------------- TEI extraction
VAR_SPLIT = re.compile(r"[ ,;·/]+")
XR_PATH   = ".//tei:ref[@target] | .//tei:xr[@target]"

def _pagination(entry: etree._Element):
    """Return (pageNo, facsURI) from the first preceding <pb>."""
    pb = entry.xpath("preceding::tei:pb[1]", namespaces=TEI_NS)
    if pb:
        p = pb[0]
        return p.get("n", ""), p.get("facs", "")
    return "", ""


def extract_entries(xml_path: Path, tag: str) -> tuple[list[dict[str, Any]], Dict[str, str]]:
    tree = etree.parse(str(xml_path))
    glyph_map = _parse_glyphs(xml_path) if tag == "sommerhoff" else {}
    recs: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    dup_counter: dict[str, int] = {}

    for idx, e in enumerate(tqdm(
            tree.xpath("//tei:entry", namespaces=TEI_NS),
            desc=f"entries {tag}", leave=False)):

        xml_id = (
        e.get("{http://www.w3.org/XML/1998/namespace}id")
        or e.get("n")
        or f"{tag}:{idx}"
        )

        # ---- guarantee global uniqueness --------------------------------
        if xml_id in seen_ids:
            dup_counter[xml_id] = dup_counter.get(xml_id, 0) + 1
            xml_id = f"{xml_id}~dup{dup_counter[xml_id]}"
        seen_ids.add(xml_id)

        # lemma + fallback
        lemma_nodes = e.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
        lemma = _text(lemma_nodes[0]) if lemma_nodes else "⚠︎missing"
        lemma_norm = _norm(lemma)

        # variants
        variants_raw = [_text(v) for v in e.xpath(".//tei:form[@type='variant']", namespaces=TEI_NS)]
        variant_tokens: list[str] = []
        for vr in variants_raw:
            variant_tokens.extend(tok for tok in VAR_SPLIT.split(vr) if len(tok) > 1)

        if lemma == "⚠︎missing":
            if variant_tokens:
                lemma = variant_tokens[0]
            elif definition:
                lemma = definition[:40].split()[0] + "…"
            else:
                lemma = f"{tag}:{idx}"       # last resort
            lemma_norm = _norm(lemma)

        # translation / definition
        translations = [_text(q) for q in e.xpath(".//tei:cit[@type='translation']//tei:quote", namespaces=TEI_NS)]
        definition = " ".join(_text(d) for d in e.xpath(".//tei:def", namespaces=TEI_NS))

        # symbols & glyphs
        symbol_ids = [g.get("ref").lstrip("#") for g in e.xpath(".//tei:g[@ref]", namespaces=TEI_NS)]
        glyph_chars = "".join(glyph_map.get(sid, "") for sid in symbol_ids)

        # pagination
        page_no, facs = _pagination(e)

        # explicit cross‑references
        xrefs = [r.get("target").lstrip("#") for r in e.xpath(XR_PATH, namespaces=TEI_NS)]

        # Sommerhoff half
        section = None
        if tag == "sommerhoff":
            if translations and not definition:
                section = "lat-de"
            elif definition and not translations:
                section = "de-lat"
            else:
                section = "unknown"

        recs.append({
            "id": xml_id,
            "source": tag,
            "lemma": lemma,
            "lemma_norm": lemma_norm,
            "variants": " ".join(variant_tokens),
            "translations": " ".join(translations),
            "definition": definition,
            "symbols": symbol_ids,
            "glyphs": glyph_chars,
            "page": page_no,
            "facs": facs,
            "section": section,
            "translations_lang": "de" if translations else "",
            "definition_lang": "la" if definition else "",
            "xrefs": xrefs,
        })

    return recs, glyph_map

# --------------------------------------------------------------------------- writers
def write_ndjson(rows: list[dict[str, Any]], fp: Path):
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows), "utf8")
    print(f"› {fp.name:12} {fp.stat().st_size/1024:6.0f} kB")


def write_lunr(rows: list[dict[str, Any]], fp: Path):
    idx = lunr(ref="id",
               fields=("lemma", "lemma_norm", "variants", "translations", "definition"),
               documents=rows)
    fp.write_text(json.dumps(idx.serialize(), ensure_ascii=False), "utf8")
    print(f"› {fp.name:12} {fp.stat().st_size/1024:6.0f} kB")


def write_graph(rows: list[dict[str, Any]], fp: Path):
    nodes: Dict[str, Dict[str, Any]] = {}
    edges: list[dict[str, str]] = []
    deg = defaultdict(int); vdeg = defaultdict(int); xdeg = defaultdict(int)
    vide_pat = re.compile(r"vide\s+(?P<t>[A-Za-z0-9 ].+)", re.I)
    dup_ids = 0

    for r in rows:
        nid = r["id"]
        if nid in nodes:
            dup_ids += 1
            continue
        nodes[nid] = {
            "id": nid, "label": r["lemma"], "source": r["source"],
            "hasSymbol": bool(r["symbols"]),
            "deg": 0, "variantDeg": 0, "xrefDeg": 0
        }

        # variant edges
        for tok in r["variants"].split():
            tgt = _norm(tok)
            edges.append({"source": nid, "target": tgt, "type": "variant"})
            deg[nid]  += 1; vdeg[nid] += 1

        # explicit x‑refs
        for tgt in r["xrefs"]:
            if tgt:
                edges.append({"source": nid, "target": tgt, "type": "xref"})
                deg[nid] += 1; xdeg[nid] += 1

        # “vide …”
        m = vide_pat.match(r["definition"])
        if m:
            tgt = _norm(m.group("t"))
            edges.append({"source": nid, "target": tgt, "type": "xref"})
            deg[nid] += 1; xdeg[nid] += 1

    # propagate degrees
    for n in nodes.values():
        n["deg"], n["variantDeg"], n["xrefDeg"] = deg[n["id"]], vdeg[n["id"]], xdeg[n["id"]]

    json.dump({"v": "2025‑04‑18", "nodes": list(nodes.values()), "edges": edges},
              fp.open("w", encoding="utf8"), ensure_ascii=False)
    print(f"› {fp.name:12} nodes: {len(nodes):,}  edges: {len(edges):,}  dups: {dup_ids}")

    return len(nodes), len(edges), dup_ids


def write_symbols(rows: list[dict[str, Any]], glyph_map: Dict[str, str], fp: Path):
    sym: DefaultDict[str, List[str]] = defaultdict(list)
    for r in rows:
        for s in r["symbols"]:
            sym[s].append(r["id"])
    out = [{"id": sid, "glyph": glyph_map.get(sid, ""), "entries": e, "count": len(e)}
           for sid, e in sorted(sym.items(), key=lambda t: -len(t[1]))]
    json.dump(out, fp.open("w", encoding="utf8"), ensure_ascii=False)
    print(f"› {fp.name:12} glyphs: {len(out):,}")

# --------------------------------------------------------------------------- path helper
def _find_sources(cli: str | None) -> Path:
    if cli:
        p = Path(cli).expanduser()
        if all((p / f).exists() for f in REQ_FILES):
            return p
        print(f"⚠︎ --tei-dir '{cli}' missing required files")
    for cand in [
        Path("tei"), Path("data"), Path("../tei"), Path("../data"),
        Path(__file__).resolve().parent / "../tei",
        Path(__file__).resolve().parent / "../data"]:
        if all((cand / f).exists() for f in REQ_FILES):
            return cand
    raise SystemExit("❌  Could not locate ruland.xml & sommerhoff.xml – use --tei-dir.")

# --------------------------------------------------------------------------- debug summary
def _report(rows: list[dict[str, Any]], nodes: int, edges: int, dups: int):
    c = Counter()
    blank_page = blank_facs = 0
    for r in rows:
        if r["lemma"] == "⚠︎missing":
            c["missing_lemma"] += 1
        if not r["translations"]:
            c["no_translation"] += 1
        if not r["definition"]:
            c["no_definition"] += 1
        if not r["page"]:
            blank_page += 1
        if not r["facs"]:
            blank_facs += 1
        if r["id"].startswith(("ruland:", "sommerhoff:")):
            c["synthetic"] += 1

    print("\n*** Debug summary ***")
    print(f"Total entries        : {len(rows):,}")
    print(f"Graph nodes / edges  : {nodes:,} / {edges:,}")
    print(f"Duplicate ids skipped: {dups:,}")
    print(f"Missing lemma        : {c['missing_lemma']:,}")
    print(f"Synthetic ids        : {c['synthetic']:,}")
    print(f"No German gloss      : {c['no_translation']:,}")
    print(f"No Latin definition  : {c['no_definition']:,}")
    print(f"No page number       : {blank_page:,}")
    print(f"No facsimile link    : {blank_facs:,}")
    print("*********************\n")

    # CI guard: entry count must equal node count
    if nodes != len(rows):
        sys.exit("❌  Node count differs from entry count – bad duplicate ids.")

# --------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tei-dir", help="folder with TEI XMLs")
    ap.add_argument("--out-dir", default="../public/data", help="output folder")
    args = ap.parse_args()

    tei_dir = _find_sources(args.tei_dir)
    out_dir = Path(args.out_dir).expanduser()

    # ---- parse ------------------------------------------------------------
    rec_r, _ = extract_entries(tei_dir / "ruland.xml", "ruland")
    rec_s, glyph_map = extract_entries(tei_dir / "sommerhoff.xml", "sommerhoff")
    rows = rec_r + rec_s

    # ---- write ------------------------------------------------------------
    write_ndjson(rows, out_dir / "entries.ndjson")
    write_lunr(rows, out_dir / "index.json")
    nodes, edges, dups = write_graph(rows, out_dir / "graph.json")
    write_symbols(rows, glyph_map, out_dir / "symbols.json")

    # ---- summary ----------------------------------------------------------
    _report(rows, nodes, edges, dups)

if __name__ == "__main__":
    main()
