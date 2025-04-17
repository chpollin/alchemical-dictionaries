# REQUIREMENTS.md – Interactive Analysis Tool for the *Alchemical‑Dictionaries* Corpus

This document captures research goals, user stories, and software requirements for a **web‑based application** that ingests the TEI‑XML files (*Ruland 1612* & *Sommerhoff 1701*) and provides exploratory analysis with rich visualisations.

---

## 1  Research Opportunities Enabled by the Data
1. **Lexicographical history** – track how alchemical terminology shifts between 1612 and 1701.
2. **Bilingual semantics** – compare Latin headwords with German translations to study knowledge transfer.
3. **Symbol studies** – quantify & classify alchemical symbols; map them to textual terms.
4. **Synonym networks** – mine `<form type='variant'>`, `<orth>`, and cross‑references ("vide …") to build graphs of equivalent terms.
5. **Concept frequency** – compute most frequent lexical roots, symbol occurrences per century.
6. **Translation quality** – detect literal vs. paraphrase patterns; identify gaps where one dictionary lacks a counterpart.
7. **Material culture** – cluster entries by referenced substances (metals, plants, devices) to glimpse early‑modern scientific focus.
8. **Historiography of Paracelsian vs. classical sources** – use citations in Sommerhoff to map intellectual lineage.
9. **OCR/error analytics** – surface likely recognition errors via spelling outliers.

---

## 2  Personas & Core User Stories
| ID | Persona | User Story |
|----|---------|-----------|
| U1 | *Early‑modern historian* | “I want to enter ‘crocus’ and **see every spelling variant, translation, and symbol** across both dictionaries, so I can cite the historical meaning in my article.” |
| U2 | *Digital lexicographer* | “I need an interface to **browse lemmas, correct OCR errors in‑place, and export patched TEI**, so the cleaned data feeds future editions.” |
| U3 | *Chemistry iconographer* | “Show me a **gallery of all alchemical symbols**, their Unicode mapping, first appearance date, and linked headwords.” |
| U4 | *NLP researcher* | “Give me a **JSON API** that returns lemma ↔ translation pairs, so I can train a bilingual alignment model.” |
| U5 | *Teacher* | “Show me a **side‑by‑side chart** that compares how many entries each dictionary contributes and lets me jump straight to the relevant lemmas.” |
| U6 | *Philologist* | “Highlight **cross‑reference chains** (‘vide …’) in a **network visualisation** to study terminological clustering.” |
| U7 | *Metadata librarian* | “I want provenance info & CC‑BY licence surfaced, and an easy way to **download subsets** filtered by tag, page range, or lemma list.” |

---

## 3  Functional Requirements
### 3·1  Data Ingestion & Processing
* **F‑1** Parse TEI‑XML, preserve `xml:id`, `@facs`, and symbol links.
* **F‑2** Normalise lemmas (case, diacritics) and index for full‑text search.
* **F‑3** Extract:
  * Lemma, variants, translations, definitions.
  * Symbol occurrences (`<g>`), glyph metadata.
  * Cross‑references via `@target`, `<xr>` or "vide" patterns.
* **F‑4** Persist to a queryable store (e.g. ElasticSearch + graph DB for networks).

### 3·2  User Interface
* **F‑5** Global search bar with auto‑complete; filters: source file, language, symbol presence.
* **F‑6** Entry viewer: tabbed panes for Ruland, Sommerhoff, side‑by‑side diff; highlight symbol tokens.
* **F‑7** Symbol explorer: grid of glyphs → click reveals description, Unicode, linked entries.
* **F‑8** Interactive network: nodes = lemmas, edges = variant/synonym/x‑ref ; pan/zoom, tooltips.
* **F‑9 (revised)** Corpus comparison: bar chart (Ruland 1612 vs Sommerhoff 1701) with click‑through filter to search results.
* **F‑9a** (optional future) Timeline heat‑map once additional dictionaries or per‑entry dates become available.
* **F‑10** Facsimile panel: display page image (`@facs`) synced with entry scroll.
* **F‑11** Inline editing (authorized users) → writes back to a fork or generates pull‑request patch.
* **F‑12** Export menu: CSV, JSON‑LD (SKOS), filtered TEI subset.
* **F‑13** REST & GraphQL endpoints for programmatic access.

### 3·3  Analysis Features
* **F‑14** Frequency charts: top N headwords, symbols, German glosses **plus the Ruland‑vs‑Sommerhoff bar already defined in F‑9**.
* **F‑15** Term evolution: compare definition lengths & translation variants between dictionaries.
* **F‑16** OCR quality dashboard: n‑gram outlier detection, flagging probable errors for crowdsourced fixes.

---

## 4  Non‑Functional Requirements
| Category | Requirement |
|----------|-------------|
| Performance | Search < 300 ms P95 for typical queries; network vis handles 5k nodes interactively. |
| Compatibility | Works in evergreen browsers; responsive down to tablet. |
| Accessibility | WCAG 2.1 AA: keyboard nav, ARIA labels, colour‑blind safe palettes. |
| Internationalisation | UI localisable; Unicode symbol rendering fallback fonts bundled. |
| API | Open, versioned (semver); rate‑limited; JSON & JSON‑LD. |
| Security | OAuth for edit mode; read‑only browsing public. |
| Provenance | Display Zenodo DOI, licence, and TEI revisionDesc metadata per entry. |
| Deployability | Docker compose (app + index); build in ≤ 5 min. |
| Extensibility | Plug‑in architecture for new TEI files; config‑driven mapping. |

---

## 5  Open Questions / Next Steps
1. **Cross‑ID strategy** – canonical URI scheme to link same lemma across files?
2. **Symbol OCR extension** – automatically detect symbols in Ruland images and align with glyph set.
3. **User contribution model** – crowd‑sourced corrections versus curator review pipeline.
4. **Scalability** – preparing for addition of future dictionaries (see TODOs.md).

---

*Compiled April 2025.*

