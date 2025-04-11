# TEI-TO-JSON Converter

A robust Python tool for converting TEI-XML dictionaries to optimized JSON for web applications.

## Overview

This tool is specifically designed to process early modern alchemical dictionaries encoded in TEI-XML format, converting them into structured JSON data suitable for use in web applications. It handles the complexities of TEI encoding, multilingual content, cross-references, and alchemical symbols.

## Features

- **Automatic file detection** - Finds dictionary files in common locations without requiring explicit paths
- **Robust text parsing** - Handles complex TEI structures and extracts meaningful data
- **Letter-based indexing** - Creates optimized indexes for efficient dictionary navigation
- **Alchemical symbol support** - Extracts and organizes symbol definitions with Unicode mappings
- **Cross-reference handling** - Preserves relationships between dictionary entries
- **Comprehensive error handling** - Gracefully handles malformed or incomplete entries

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
python TEI-to-JSON.py [--ruland PATH] [--sommerhoff PATH] [--output DIR] [--verbose]
```

- `--ruland` - Path to Ruland's dictionary XML file (optional)
- `--sommerhoff` - Path to Sommerhoff's dictionary XML file (optional)
- `--output` - Output directory for JSON files (default: `./output`)
- `--verbose` - Enable detailed logging

### Examples

Process specific files:
```bash
python TEI-to-JSON.py --ruland ./Ruland1612/Ruland.xml --sommerhoff ./Lexikon_Sommerhoff.xml
```

Specify a custom output directory:
```bash
python TEI-to-JSON.py --output ./json_data
```

## Output Files

The script produces several JSON files:

### Main Dictionary Files
- `ruland_dictionary.json` - Complete data for Ruland's Lexicon Alchemiae
- `sommerhoff_dictionary.json` - Complete data for Sommerhoff's Lexicon pharmaceutico-chymicum
- `sommerhoff_symbols.json` - Alchemical symbol definitions extracted from Sommerhoff
- `dictionary_metadata.json` - Information about both dictionaries

### Index Files
- `ruland_letter_index.json` - Letter index for Ruland's dictionary
- `ruland_index_a.json`, `ruland_index_b.json`, etc. - Letter-specific indexes
- `sommerhoff_letter_index.json` - Letter index for Sommerhoff's dictionary
- `sommerhoff_index_a.json`, `sommerhoff_index_b.json`, etc. - Letter-specific indexes

## Data Structure

### Dictionary Entry Structure (Ruland)

```json
{
  "id": "ruland_aqua_fortis",
  "lemma": "Aqua fortis",
  "letter": "A",
  "variants": ["Alternative forms"],
  "definition": "Nitri spiritus acidus...",
  "translations": ["Scheidewasser"],
  "notes": ["Classification detail..."],
  "source": "ruland",
  "xml": "<entry>...</entry>"
}
```

### Dictionary Entry Structure (Sommerhoff)

```json
{
  "id": "sommerhoff_mercurius",
  "lemma": "Mercurius",
  "letter": "M",
  "variants": ["Alternative forms"],
  "definition": "est Argentum vivum...",
  "german_text": ["Quecksilber"],
  "references": [
    {
      "target": "argentum_vivum",
      "text": "Argentum vivum"
    }
  ],
  "symbols": ["mercury"],
  "source": "sommerhoff",
  "xml": "<entry>...</entry>"
}
```

### Symbol Data Structure

```json
{
  "mercury": {
    "id": "mercury",
    "name": "MERCURY",
    "description": "Symbol for mercury",
    "unicode": "☿"
  }
}
```

## Implementation Details

### Automatic File Detection

The script searches for XML files in common locations:
- `./Ruland*.xml`, `./Ruland*/*.xml`
- `./Sommerhoff*.xml`, `./Lexikon_Sommerhoff*.xml`
- And several other common patterns

If multiple files are found, the script selects the largest one, assuming it is the most complete.

### Text Processing

- **Whitespace normalization** - Cleans up inconsistent spacing and line breaks
- **Language detection** - Identifies and separately stores Latin and German content
- **Element extraction** - Properly handles complex nested TEI elements
- **Lemma/variant separation** - Distinguishes between main terms and variant forms

### Letter Indexing

Entries are indexed by their initial letter to enable efficient alphabetical navigation:
- Validates that letters are alphabetic characters
- Normalizes letter case for consistent indexing
- Groups entries by first letter for quick lookup

### Error Handling

The script includes comprehensive error handling:
- Skips malformed entries rather than aborting
- Provides detailed logging for troubleshooting
- Gracefully handles unexpected XML structures
- Validates output file paths to prevent errors

## Web Application Integration

The generated JSON files are optimized for integration with web applications:

1. Load `dictionary_metadata.json` first to get dictionary information
2. Use letter index files for alphabetical navigation
3. Load letter-specific entry lists when a letter is selected
4. Load individual entries on demand for detailed view