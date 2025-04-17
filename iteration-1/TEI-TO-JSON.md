# Enhanced TEI-TO-JSON Converter

A comprehensive Python tool for converting TEI-XML dictionaries to richly structured JSON for advanced web applications.

## Overview

This tool is specifically designed to process early modern alchemical dictionaries encoded in TEI-XML format, converting them into feature-rich JSON data suitable for interactive web applications. It preserves the full range of TEI encoding, including structural context, multilingual content, cross-references, and alchemical symbols.

## Enhanced Features

- **Automatic file detection** - Finds dictionary files in common locations without requiring explicit paths
- **Complete document structure preservation** - Maintains pages, sections, headers, footers, and letter divisions
- **Comprehensive text extraction** - Captures all textual variants, formatting, and language markers
- **Hierarchical indexing** - Creates multiple index levels for efficient navigation and search
- **Rich symbol handling** - Extracts symbol definitions with Unicode mappings, descriptions, and graphical references
- **Cross-reference resolution** - Preserves and enhances relationships between entries with explicit and implicit links
- **Contextual metadata** - Records entry locations, page references, and sectional information
- **Combined search capabilities** - Generates cross-dictionary search indexes
- **Visual reference network** - Creates a network representation of entry relationships
- **Robust error recovery** - Gracefully handles malformed or incomplete entries with comprehensive logging

## Requirements

- Python 3.6 or higher
- Required libraries (automatically installed if missing):
  - lxml - For XML parsing
  - tqdm - For progress bar display

## Installation

No installation required. Simply download the `TEI-to-JSON.py` script to your project directory.

## Usage

### Basic Usage

Run the script without any parameters:

```bash
python TEI-to-JSON.py
```

The script will:
1. Automatically search for TEI-XML dictionary files in common locations
2. Process any found files 
3. Generate optimized JSON files in the `./output` directory

### Command-Line Options

```bash
python TEI-to-JSON.py [--ruland PATH] [--sommerhoff PATH] [--output DIR] [--verbose] [--partial]
```

- `--ruland` - Path to Ruland's dictionary XML file (optional)
- `--sommerhoff` - Path to Sommerhoff's dictionary XML file (optional)
- `--output` - Output directory for JSON files (default: `./output`)
- `--verbose` - Enable detailed logging
- `--partial` - Process only a subset of entries (for testing)

### Examples

Process specific files:
```bash
python TEI-to-JSON.py --ruland ./Ruland1612/Ruland.xml --sommerhoff ./Lexikon_Sommerhoff.xml
```

Specify a custom output directory:
```bash
python TEI-to-JSON.py --output ./json_data
```

Test with a partial dataset:
```bash
python TEI-to-JSON.py --partial --verbose
```

## Output Files

The script produces a comprehensive set of JSON files:

### Main Dictionary Files
- `ruland_dictionary.json` - Complete data for Ruland's Lexicon Alchemiae
- `sommerhoff_dictionary.json` - Complete data for Sommerhoff's Lexicon pharmaceutico-chymicum
- `sommerhoff_symbols.json` - Alchemical symbol definitions extracted from Sommerhoff
- `sommerhoff_symbol_tables.json` - Tables of symbols with their relationships
- `dictionary_metadata.json` - Detailed information about both dictionaries

### Document Structure Files
- `ruland_document_structure.json` - Pages, sections, headers/footers for Ruland
- `sommerhoff_document_structure.json` - Pages, sections, headers/footers for Sommerhoff

### Index Files
- `ruland_letter_index.json` - Master letter index for Ruland's dictionary
- `ruland_index_a.json`, `ruland_index_b.json`, etc. - Letter-specific indexes
- `sommerhoff_letter_index.json` - Master letter index for Sommerhoff's dictionary
- `sommerhoff_index_a.json`, `sommerhoff_index_b.json`, etc. - Letter-specific indexes

### Search and Reference Files
- `ruland_search_index.json` - Search-optimized index for Ruland entries
- `sommerhoff_search_index.json` - Search-optimized index for Sommerhoff entries
- `combined_search_index.json` - Unified search index across both dictionaries
- `cross_reference_network.json` - Network representation of cross-references

## Enhanced Data Structures

### Enriched Dictionary Entry (Ruland)

```json
{
  "id": "ruland_aqua_fortis",
  "lemma": "Aqua fortis",
  "lemma_type": "lemma",
  "entry_type": "A",
  "letter": "A",
  "forms": [
    {
      "type": "lemma",
      "text": "Aqua fortis"
    }
  ],
  "variants": ["Alternative forms"],
  "explicit_definitions": ["Nitri spiritus acidus..."],
  "sense_texts": ["Nitri spiritus acidus..."],
  "definition": "Nitri spiritus acidus...",
  "translations": [
    {
      "text": "Scheidewasser",
      "style": "font-variant: fraktur",
      "context": "sense"
    }
  ],
  "notes": [
    {
      "number": "1",
      "text": "Classification detail...",
      "translations": ["German translation of note"]
    }
  ],
  "textual_references": [
    {
      "text": "Argentum vivum",
      "pattern": "vide Argentum vivum",
      "target": "ruland_argentum_vivum"
    }
  ],
  "context": {
    "page": {
      "n": "42",
      "id": "img_0042",
      "facs": "#facs_0042"
    },
    "section": {
      "type": "dictionary",
      "id": "dict_entries",
      "head": "Lexicon Alchemiae"
    },
    "letter": "A",
    "preceding_header": "LEXICON ALCHEMIAE",
    "following_header": "42"
  },
  "structural_markers": {
    "line_breaks": [1, 2],
    "page_break": null
  },
  "source": "ruland",
  "xml": "<entry>...</entry>"
}
```

### Enriched Dictionary Entry (Sommerhoff)

```json
{
  "id": "sommerhoff_mercurius",
  "lemma": "Mercurius",
  "lemma_type": "lemma",
  "letter": "M",
  "forms": [
    {
      "type": "lemma",
      "text": "Mercurius",
      "symbols": ["mercury"]
    }
  ],
  "variants": ["Alternative forms"],
  "explicit_definitions": ["est Argentum vivum..."],
  "sense_data": [
    {
      "text": "est Argentum vivum...",
      "symbols": ["mercury"]
    }
  ],
  "definition": "est Argentum vivum...",
  "german_text": [
    {
      "text": "Quecksilber",
      "pattern": "lang-germ",
      "context": "sense"
    }
  ],
  "references": [
    {
      "type": "cf",
      "label": "vid.",
      "target": "argentum_vivum",
      "ref_type": "entry",
      "text": "Argentum vivum"
    }
  ],
  "textual_references": [
    {
      "text": "Argentum vivum",
      "pattern": "vid. Argentum vivum",
      "target": "sommerhoff_argentum_vivum",
      "context": "sense"
    }
  ],
  "symbols": [
    {
      "id": "mercury",
      "details": {
        "id": "mercury",
        "name": "MERCURY",
        "description": "Symbol for mercury",
        "unicode": "☿",
        "additional_mappings": {
          "html": "&#9791;"
        },
        "graphic": null
      },
      "context": "sense"
    }
  ],
  "context": {
    "page": {
      "n": "231",
      "id": "img_0231",
      "facs": "#facs_0231"
    },
    "section": {
      "type": "dictionary",
      "id": "dict_entries",
      "head": "Lexicon Pharmaceutico-Chymicum"
    },
    "letter": "M",
    "preceding_header": "Mercurius",
    "following_header": "231"
  },
  "structural_markers": {
    "line_breaks": [1, 2],
    "page_break": null
  },
  "source": "sommerhoff",
  "xml": "<entry>...</entry>"
}
```

### Enhanced Symbol Data Structure

```json
{
  "mercury": {
    "id": "mercury",
    "name": "MERCURY",
    "description": "Symbol for mercury",
    "unicode": "☿",
    "additional_mappings": {
      "html": "&#9791;",
      "ascii": "(Hg)"
    },
    "graphic": {
      "url": "images/mercury.png",
      "width": "24",
      "height": "24"
    }
  }
}
```

### Document Structure

```json
{
  "sections": [
    {
      "id": "frontmatter",
      "type": "frontmatter",
      "title": "Praefatio",
      "parent": null
    },
    {
      "id": "dictionary",
      "type": "dictionary",
      "title": "Lexicon Alchemiae",
      "parent": null
    }
  ],
  "pages": {
    "1": {
      "id": "img_0001",
      "facs": "#facs_0001",
      "headers_footers": ["LEXICON", "1"]
    }
  },
  "letters": ["A", "B", "C", "D"],
  "headers_footers": {}
}
```

## Implementation Details

### Document Structure Extraction

The enhanced converter captures the complete document structure:
- Pages with their numbering and facsimile references
- Sections with their hierarchical relationships
- Letter divisions for alphabetical organization
- Headers and footers with page context

### Contextual Information

Each entry is enriched with its complete structural context:
- Page and location in the document
- Section membership
- Alphabetical letter group
- Proximate headers and footers

### Symbol Processing

The converter implements comprehensive symbol handling:
- Extracts glyph definitions from TEI headers
- Captures descriptions, names, and unicode mappings
- Preserves graphical references
- Records where symbols appear within entries
- Processes symbol tables for related symbols

### Cross-Reference Resolution

The enhanced cross-reference system includes:
- Explicit cross-references from `<xr>` elements
- Implicit textual references (e.g., "vide", "vid.")
- Target resolution to actual entry IDs
- Reference types and contexts
- Network representation of entry relationships

### Multilingual Content Preservation

The improved language handling preserves:
- German translations with their formatting
- Language markers and their context
- Multiple translation patterns
- Original TEI encoding of language markers

### Entry Processing

Entry processing is enhanced to distinguish between:
- Different form types (lemma, phrase, variant)
- Explicit definitions vs. general sense content
- Hierarchical notes with numbering
- Various formatting and typographical elements

## Web Application Integration

The enhanced JSON files support advanced web application features:

1. Load `dictionary_metadata.json` to get comprehensive dictionary information
2. Use `document_structure.json` files for page-level navigation
3. Use letter index files for alphabetical navigation
4. Use search index files for full-text search
5. Load letter-specific entry lists when a letter is selected
6. Load individual entries on demand for detailed view
7. Use cross-reference network for visualization of entry relationships
8. Use symbol definitions for rendering alchemical symbols with proper Unicode

### Integration Example

```javascript
// Load metadata
fetch('output/dictionary_metadata.json')
  .then(response => response.json())
  .then(metadata => {
    // Display dictionary information
    displayDictionaryInfo(metadata);
    
    // Load letter index for navigation
    return fetch('output/ruland_letter_index.json');
  })
  .then(response => response.json())
  .then(letterIndex => {
    // Create navigation UI
    createLetterNavigation(letterIndex.letters);
    
    // Example: When user selects letter 'A'
    loadLetterEntries('a');
  });

// Load entries for a specific letter
function loadLetterEntries(letter) {
  fetch(`output/ruland_index_${letter}.json`)
    .then(response => response.json())
    .then(entries => {
      // Display entry list
      displayEntryList(entries);
    });
}

// Load full entry data
function loadEntry(entryId) {
  // Determine which dictionary to query based on ID prefix
  const isDictionaryRuland = entryId.startsWith('ruland_');
  const dictionaryFile = isDictionaryRuland ? 
    'ruland_dictionary.json' : 'sommerhoff_dictionary.json';
  
  // Load the full dictionary or use an API endpoint that returns a single entry
  // In a production app, you would have a backend that can serve individual entries
  fetch(`output/${dictionaryFile}`)
    .then(response => response.json())
    .then(dictionary => {
      // Find the specific entry
      const entry = dictionary.find(e => e.id === entryId);
      if (entry) {
        // Display the entry with all its rich data
        displayEntryDetail(entry);
        
        // Process symbols if present
        if (entry.symbols && entry.symbols.length > 0) {
          renderSymbols(entry.symbols);
        }
        
        // Process cross-references
        if (entry.references || entry.textual_references) {
          displayReferences(entry);
        }
      }
    });
}

// Render alchemical symbols with Unicode
function renderSymbols(symbols) {
  // Load symbol definitions if not already loaded
  if (!window.symbolDefinitions) {
    fetch('output/sommerhoff_symbols.json')
      .then(response => response.json())
      .then(symbolDefs => {
        window.symbolDefinitions = symbolDefs;
        replaceSymbolsWithUnicode(symbols);
      });
  } else {
    replaceSymbolsWithUnicode(symbols);
  }
}

function replaceSymbolsWithUnicode(symbols) {
  symbols.forEach(symbol => {
    const symbolId = typeof symbol === 'string' ? symbol : symbol.id;
    const symbolDef = window.symbolDefinitions[symbolId];
    if (symbolDef && symbolDef.unicode) {
      // Replace symbol reference with actual Unicode character
      document.querySelectorAll(`.symbol-${symbolId}`).forEach(el => {
        el.textContent = symbolDef.unicode;
      });
    }
  });
}
```

## Performance Considerations

The script includes optimizations for efficient processing:
- Generates separate index files to minimize data loading
- Preserves original XML for faithful rendering when needed
- Creates search indexes for rapid content discovery
- Uses document structure for contextual navigation
- Processes cross-references for relationship discovery

When working with the generated JSON files in a web application:
- Load the metadata and letter index on initial page load
- Load letter-specific index files when a letter is selected
- Load individual entries on demand rather than the entire dictionary
- Use the search index for quick lookups instead of scanning all entries