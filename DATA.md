# Alchemical Dictionaries: TEI-XML Structure Documentation

This document provides a comprehensive analysis of the TEI-XML structure in the alchemical dictionaries project, covering Ruland's *Lexicon Alchemiae* (1612) and Sommerhoff's *Lexicon pharmaceutico-chymicum* (1701).

## Dictionary Comparison

| Feature | Ruland (1612) | Sommerhoff (1701) |
|---------|---------------|-------------------|
| Entry count | 3,147 | 17,412 |
| Primary structure | Single integrated dictionary | Latin-German and German-Latin sections |
| Content focus | Alchemical terms with scholarly notes | Pharmaceutical, alchemical, and botanical terms |
| Language approach | Latin with German translations | Bilingual with systematic translations |
| Symbol usage | Minimal, described textually | Extensive (280+ unique symbols identified) |
| Notable features | Extensive scholarly notes, hierarchical lists | Rich alchemical symbol encoding, cross-references |
| ID pattern | `n="Ruland1612-[Term]"` | `xml:id="[term]"` |
| File size | ~500 pages, 3,200 entries | ~500 pages, 17,400 entries |

## Document Structure

Both dictionaries use the TEI dictionary module, with this general structure:

```xml
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <!-- Metadata and symbol declarations (for Sommerhoff) -->
  </teiHeader>
  <text>
    <body>
      <div type="frontmatter">
        <!-- Front matter -->
      </div>
      <div type="dictionary">
        <!-- Dictionary entries -->
      </div>
    </body>
  </text>
</TEI>
```

### Ruland-Specific Structure
- Entries organized alphabetically with `<milestone unit="letter" n="A"/>`
- Page structure preserved with `<pb>`, `<fw>`, headers/footers
- Entries marked with letter type: `<entry type="A">`

### Sommerhoff-Specific Structure
- Contains three main divisions: `<div type="frontmatter">`, `<div type="dictionary">`, `<div type="errata">`
- Latin-German section followed by German-Latin section (not explicitly marked in XML)
- Extensive symbol tables in special sections

## Entry Structure

### Ruland Entry Patterns

- All entries wrapped in `<dictScrap>`
- Most common pattern (84.2%): `<form type="lemma">` → `<sense>`
- German translations in `<cit type="translation" xml:lang="de">`
- Scholarly content in hierarchical `<note>` elements
- Entries often grouped by concept with numbered sub-sections

```xml
<entry type="A" n="Ruland1612-Aqua_fortis">
  <dictScrap>
    <form type="lemma">Aqua fortis</form>
    <sense>Nitri spiritus acidus...
      <cit type="translation" xml:lang="de" style="font-variant: fraktur">
        <quote>Scheidewasser</quote>
      </cit>
    </sense>
    <note>1. Classification detail...
      <cit type="translation" xml:lang="de" style="font-variant: fraktur">
        <quote>German explanation</quote>
      </cit>
    </note>
  </dictScrap>
</entry>
```

### Sommerhoff Entry Patterns

- All entries wrapped in `<dictScrap>`
- Most common pattern (78.6%): `<form type="lemma">` → `<sense>`
- German translations marked with inline `<lang>Germ.</lang>` followed by German text
- Alchemical symbols encoded with `<g ref="#symbol">` elements
- Explicit cross-references with `<xr>` elements

```xml
<entry xml:id="mercurius">
  <dictScrap>
    <form type="lemma">Mercurius</form>
    <sense>est Argentum vivum <g ref="#mercury"/>
      <lang>Germ.</lang> Quecksilber
    </sense>
  </dictScrap>
</entry>
```

## Element Usage Statistics

| Element | Ruland Count | Sommerhoff Count | Purpose |
|---------|--------------|------------------|---------|
| `<entry>` | 3,147 | 17,412 | Dictionary entries |
| `<form>` | 3,209 | 20,570 | Terms and variants |
| `<sense>` | 3,133 | 16,829 | Definitions/meanings |
| `<def>` | 1,835 | 636 | Explicit definitions |
| `<cit>` | 2,188 | 424 | Citations/translations |
| `<note>` | 181 | rare | Scholarly notes |
| `<g>` | rare | 950+ | Alchemical symbols |
| `<xr>` | rare | 675 | Cross-references |
| `<lang>` | rare | 5,477 | Language markers |
| `<lb>` | 11,000+ | 13,000+ | Line breaks |
| `<pb>` | 178 | 477 | Page breaks |
| `<fw>` | 334 | 1,566 | Headers/footers |

## Form Elements

### Ruland's `<form>` Usage
- **Attributes**:
  - `type="lemma"`: 2,900 instances (90.4%)
  - `type="phrase"`: 216 instances (6.7%)
  - `type="variant"`: 92 instances (2.9%)
- **Child Elements**:
  - `<orth>`: 219 instances for orthographic variants
  - `<choice>`: For abbreviation expansion

### Sommerhoff's `<form>` Usage
- **Attributes**:
  - `type="lemma"`: 16,868 instances (82.0%)
  - `type="variant"`: 251 instances (1.2%)
- **Child Elements**:
  - `<g>`: For alchemical symbols
  - `<orth>`: 286 instances for variant forms

## Cross-Reference Systems

### Ruland's Approach
- Primarily textual references using phrases like "vide ana" within `<sense>` elements
- No structured cross-reference elements
- Example: `<sense>vide ana</sense>`

### Sommerhoff's Approach
- Structured cross-references using dedicated elements:
  ```xml
  <xr type="cf">
    <lbl>vid.</lbl>
    <ref target="#term" type="entry">Referenced Term</ref>
  </xr>
  ```
- 675 explicit `<xr>` elements
- Common labels: "vid.", "vide", "apud"
- Reference targets often point to specific entries using the `target` attribute
- Many cross-references to categories like "vid. Herbas" (see Herbs)

## Multilingual Content

### Ruland's Approach
- German content consistently wrapped in `<cit>` elements:
  ```xml
  <cit type="translation" xml:lang="de" style="font-variant: fraktur">
    <quote>German translation</quote>
  </cit>
  ```
- 2,188 German translations
- Typically appears after Latin definitions
- Uses "font-variant: fraktur" style attribute

### Sommerhoff's Approach
- Primary pattern: `<lang>Germ.</lang>` followed directly by German text (5,477 instances)
- Secondary pattern: `<cit xml:lang="de">` with `<quote>` (424 instances)
- German translations often appear at the end of sense definitions
- Often followed by cross-references to related entries

## Alchemical Symbols

### Symbol Encoding in Sommerhoff
- Encoded using `<g ref="#symbol">` elements
- Symbol definitions in `<teiHeader>` using `<glyph>` elements
- Only fully encoded for first 22 pages (approximately 280 unique symbols)
- Common symbol references include:
  - `#water`, `#mercury`, `#silver`, `#salt`, `#sulfur`, `#lead`, `#fire`
- Symbols appear in various contexts:
  - Within definitions
  - As variant forms
  - In cross-references
  - In tabular data

### Symbol Tables
- Contains tabular symbol reference content using `<table>`, `<row>`, `<cell>` 
- Includes "Alphabetum chymicum" (Chemical Alphabet) with symbol mappings
- Lists of symbols for elements, planets, weights, and other alchemical concepts

## Special Features

### Scholarly Content in Ruland
- Extensive `<note>` elements (181 instances)
- Hierarchical organization with numbered sub-sections
- Topics often organized by color or physical characteristics
- Scholarly citations and references to classical sources
- Extensive use of Latin scholarly terminology

Example of note structure:
```xml
<note>Cinerei coloris.</note>
<note>1. Argentum instar flammae ignis...
  <cit type="translation" xml:lang="de" style="font-variant: fraktur">
    <quote>Grawe gediegen Silber in einem harten Kobelt</quote>
  </cit>
</note>
```

### Special Formatting

#### Ruland
- Extensive use of `<lb/>` for line breaks (11,000+ instances)
- Page structure with `<pb>`, `<fw>` for headers/footers
- Preserves historical orthography including special characters

#### Sommerhoff
- Special punctuation encoded with `<pc>` elements
- Preserves typographical features with attributes
- Table structures for organized content

### Abbreviation Handling
- Both dictionaries use `<choice>`, `<abbr>`, `<expan>` for abbreviations
- Common pattern: `<choice><abbr>i. e.</abbr><expan>id est</expan></choice>`
- Ruland has more extensive abbreviation expansion

## Data Quality Considerations

- **OCR Quality**: Character error rate of approximately 0.80% (2-10 character errors per page)
- **Structural Consistency**: Variations in entry structure, especially for complex entries
- **Symbol Encoding**: Incomplete beyond first 22 pages of Sommerhoff
- **ID Coverage**: Not all entries have complete ID attributes
- **Cross-Reference Consistency**: Varying approaches to references and citations
- **Historical Characters**: Special characters and ligatures may have inconsistent encoding

## Processing Recommendations

### Entry Processing
- Focus on dominant patterns (`<form>` → `<sense>`)
- Handle variations with fallback approaches
- Extract German translations from both patterns
- Consider entry context for proper interpretation

### Cross-References
- For Sommerhoff: Process explicit `<xr>` elements
- For Ruland: Parse "vide" text patterns
- Build reference networks between related entries
- Connect to external terms where indicated

### Symbol Handling
- Extract and normalize `<g>` elements
- Map to Unicode where possible
- Consider symbol context for meaning
- Build controlled vocabulary for symbols

### Cross-Dictionary Integration
- Normalize headwords for matching
- Account for orthographic variations
- Connect related concepts across dictionaries
- Consider terminology evolution between 1612 and 1701

### Quality Improvements
- Standardize entry structures
- Complete cross-references
- Extend symbol encoding
- Add missing IDs
- Link related entries