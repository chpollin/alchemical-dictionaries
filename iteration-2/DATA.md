# DATA.md – Alchemical‑Dictionaries Dataset Guide

---

## 1  Dataset at a Glance
| File | Scope | ≈ Entries | Path |
|------|-------|----------|------|
| **Ruland 1612 – *Lexicon Alchemiae*** | Latin → German alchemical lexicon | 3 200 | `data/ruland.xml` |
| **Sommerhoff 1701 – *Lexicon pharmaceutico‑chymicum*** | Latin ↔ German pharma‑chymical lexicon | 17 000 | `data/sommerhoff.xml` |

*Both files are TEI‑XML, CC‑BY 4.0 (Zenodo 10.5281/zenodo.14638445).*  OCR was produced with the NOSCEMUS GM HTR model and is highly accurate but **not fully proof‑read**.

---

## 2  TEI Dictionary Skeleton (core elements)
| Element | Meaning |
|---------|---------|
| `<entry>` | one dictionary article (has `@xml:id`, optional `@n`). |
| `<form type='lemma'/>` | the headword; orthographic variants use `type='variant'`. |
| `<sense>` | a distinct meaning, may repeat inside one entry. |
| `<def>` | prose definition (mostly Latin). |
| `<cit type='translation'><quote>` | vernacular glosses (German); marked with `xml:lang='de'`. |
| `<g>` | alchemical symbol token (Sommerhoff only) referring to `<glyph>` in the header. |
| `<pb>` / `<fw>` | page breaks & printed headers; keep original pagination. |
| `<hi>` / `<lb>` / `<note>` | typography, line breaks, commentary. |

All elements live in the TEI namespace `http://www.tei-c.org/ns/1.0`.

---

## 3  Element & Attribute Inventory
### 3·1  Elements Present per File
| Ruland | Sommerhoff |
|--------|------------|
| ab, abbr, body, choice, cit, def, dictScrap, div, entry, expan, form, fw, hi, item, lang, lb, list, milestone, note, orth, pb, quote, seg, sense, usg | ab, abbr, **bibl**, body, **cell**, choice, cit, def, dictScrap, div, entry, expan, **figure**, form, fw, **g**, hi, lang, lb, **lbl**, orth, pb, **pc**, quote, **ref**, **row**, sense, **table**, **xr** |
*(bold = element not found in the other file).*  Combined union (34):  
`ab, abbr, bibl, body, cell, choice, cit, def, dictScrap, div, entry, expan, figure, form, fw, g, hi, item, lang, lb, lbl, list, milestone, note, orth, pb, pc, quote, ref, row, seg, sense, table, usg, xr`.

### 3·2  Attributes Present
| Attribute | Meaning (usage) |
|-----------|----------------|
| `break` | hard‑line break control (`@break='no'`). |
| `cols`, `rows` | width/height of `<table>` in Sommerhoff. |
| `facs` | link to page‑image zone. |
| `id` (xml:id) | stable local identifier. |
| `lang` (xml:lang) | language of content (Latin, German). |
| `n` | numbering (page, letter group, entry type). |
| `place` | location of running header (`top-centre`). |
| `ref`, `target` | cross‑references. |
| `rend`, `style` | rendering hints (italic, fraktur font, etc.). |
| `type`, `unit` | typology (lemma/variant …; milestone units). |

Full union (14): `break, cols, facs, id, lang, n, place, ref, rend, rows, style, target, type, unit`.

---

## 4  Sample XPath Snippets
> Prefix `tei` must be bound to `http://www.tei-c.org/ns/1.0`.

| Goal | XPath |
|------|-------|
| List all lemmas | `//tei:entry/tei:form[@type='lemma']/text()` |
| List German translations | `//tei:cit[@type='translation' and @xml:lang='de']/tei:quote/text()` |
| All alchemical symbols (Sommerhoff) | `//tei:g/@ref` |
| Page‑image facsimile links | `//tei:pb/@facs` |
| Entries containing a glyph | `//tei:entry[.//tei:g]` |
| Match lemma + German gloss quickly | `//tei:entry[tei:form[@type='lemma' and normalize-space()=$w] ]/tei:cit[@xml:lang='de']/tei:quote` |

---

## 5  Integration Strategy
1. **Normalise lemmas** (lower‑case, strip diacritics) across both files.
2. **Join** on lemma to build bilingual concordances (≈ 20 k rows).
3. **Harvest symbols** from Sommerhoff; tag occurrences in Ruland to extend coverage.
4. **Persist links** by adding `<ref target='#ID'/>` or SKOS `exactMatch` triples.

---

## 6  Known Limitations & TODOs
* Some OCR noise; not fully proof‑read.
* Sommerhoff German‑Latin section needs systematic `xml:id` (see TODOs.md).
* Ruland lacks `<glyph>` symbol encoding.
* Cross‑reference chains (“vide …”) not yet resolved.