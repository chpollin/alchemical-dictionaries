# Alchemical Dictionaries Explorer

An interactive web application for exploring historical alchemical dictionaries:

- **Ruland's Lexicon Alchemiae (1612)** - ~3,200 entries
- **Sommerhoff's Lexicon pharmaceutico-chymicum (1701)** - ~17,400 entries

## About

The Alchemical Dictionaries Explorer provides researchers, students, and history enthusiasts with a user-friendly interface to browse, search, and compare alchemical terminology across two influential historical dictionaries. This application bridges the gap between rare historical texts and modern accessibility.

## Features

- Dictionary Toggle: Switch seamlessly between Ruland (1612) and Sommerhoff (1701)
- Alphabetical Navigation: Browse entries organized by letter
- Search Functionality: Find specific terms across dictionaries
- Detailed Entries: View complete definitions, translations, and contextual information
- Comparison View: Compare how terms evolved between the two dictionaries
- Alchemical Symbols: View and understand historical alchemical symbols (particularly in Sommerhoff's entries)
- Responsive Design: Access on desktop, tablet, or mobile devices

## Project Structure

```
/alchemical-dictionaries-explorer/
├── index.html              # Main HTML file
├── styles.css              # CSS styles
├── js/
│   ├── app.js              # Main application logic
│   └── dictionary.js       # Data loading and processing
└── output/                 # Dictionary data files (JSON)
    ├── dictionary_metadata.json       # General information about both dictionaries
    ├── ruland_dictionary.json         # Complete Ruland dictionary data
    ├── ruland_letter_index.json       # Letter index for Ruland dictionary
    ├── ruland_index_a.json            # Entries for letter A in Ruland dictionary
    ├── ruland_index_b.json            # Entries for letter B in Ruland dictionary
    ├── ruland_index_c.json            # Entries for letter C in Ruland dictionary
    ├── ruland_index_d.json            # Entries for letter D in Ruland dictionary
    ├── ruland_index_e.json            # Entries for letter E in Ruland dictionary
    ├── ruland_index_f.json            # Entries for letter F in Ruland dictionary
    ├── ruland_index_g.json            # Entries for letter G in Ruland dictionary
    ├── ruland_index_h.json            # Entries for letter H in Ruland dictionary
    ├── ruland_index_i.json            # Entries for letter I in Ruland dictionary
    ├── ruland_index_j.json            # Entries for letter J in Ruland dictionary
    ├── ruland_index_k.json            # Entries for letter K in Ruland dictionary
    ├── ruland_index_l.json            # Entries for letter L in Ruland dictionary
    ├── ruland_index_m.json            # Entries for letter M in Ruland dictionary
    ├── ruland_index_n.json            # Entries for letter N in Ruland dictionary
    ├── ruland_index_o.json            # Entries for letter O in Ruland dictionary
    ├── ruland_index_p.json            # Entries for letter P in Ruland dictionary
    ├── ruland_index_q.json            # Entries for letter Q in Ruland dictionary
    ├── ruland_index_r.json            # Entries for letter R in Ruland dictionary
    ├── ruland_index_s.json            # Entries for letter S in Ruland dictionary
    ├── ruland_index_t.json            # Entries for letter T in Ruland dictionary
    ├── ruland_index_u.json            # Entries for letter U in Ruland dictionary
    ├── ruland_index_v.json            # Entries for letter V in Ruland dictionary
    ├── ruland_index_w.json            # Entries for letter W in Ruland dictionary
    ├── ruland_index_x.json            # Entries for letter X in Ruland dictionary
    ├── ruland_index_y.json            # Entries for letter Y in Ruland dictionary
    ├── ruland_index_z.json            # Entries for letter Z in Ruland dictionary
    ├── sommerhoff_dictionary.json     # Complete Sommerhoff dictionary data
    ├── sommerhoff_letter_index.json   # Letter index for Sommerhoff dictionary
    ├── sommerhoff_index_a.json        # Entries for letter A in Sommerhoff dictionary
    ├── sommerhoff_index_b.json        # Entries for letter B in Sommerhoff dictionary
    ├── sommerhoff_index_c.json        # Entries for letter C in Sommerhoff dictionary
    ├── sommerhoff_index_d.json        # Entries for letter D in Sommerhoff dictionary
    ├── sommerhoff_index_e.json        # Entries for letter E in Sommerhoff dictionary
    ├── sommerhoff_index_f.json        # Entries for letter F in Sommerhoff dictionary
    ├── sommerhoff_index_g.json        # Entries for letter G in Sommerhoff dictionary
    ├── sommerhoff_index_h.json        # Entries for letter H in Sommerhoff dictionary
    ├── sommerhoff_index_i.json        # Entries for letter I in Sommerhoff dictionary
    ├── sommerhoff_index_j.json        # Entries for letter J in Sommerhoff dictionary
    ├── sommerhoff_index_k.json        # Entries for letter K in Sommerhoff dictionary
    ├── sommerhoff_index_l.json        # Entries for letter L in Sommerhoff dictionary
    ├── sommerhoff_index_m.json        # Entries for letter M in Sommerhoff dictionary
    ├── sommerhoff_index_n.json        # Entries for letter N in Sommerhoff dictionary
    ├── sommerhoff_index_o.json        # Entries for letter O in Sommerhoff dictionary
    ├── sommerhoff_index_p.json        # Entries for letter P in Sommerhoff dictionary
    ├── sommerhoff_index_q.json        # Entries for letter Q in Sommerhoff dictionary
    ├── sommerhoff_index_r.json        # Entries for letter R in Sommerhoff dictionary
    ├── sommerhoff_index_s.json        # Entries for letter S in Sommerhoff dictionary
    ├── sommerhoff_index_t.json        # Entries for letter T in Sommerhoff dictionary
    ├── sommerhoff_index_u.json        # Entries for letter U in Sommerhoff dictionary
    ├── sommerhoff_index_v.json        # Entries for letter V in Sommerhoff dictionary
    ├── sommerhoff_index_w.json        # Entries for letter W in Sommerhoff dictionary
    ├── sommerhoff_index_x.json        # Entries for letter X in Sommerhoff dictionary
    ├── sommerhoff_index_y.json        # Entries for letter Y in Sommerhoff dictionary
    ├── sommerhoff_index_z.json        # Entries for letter Z in Sommerhoff dictionary
    └── sommerhoff_symbols.json        # Alchemical symbols used in Sommerhoff dictionary
```

## Implementation Approach

The application is built with vanilla JavaScript, HTML, and CSS, with no external dependencies. Key technical decisions include:

- Client-side Only: All processing happens in the browser for simplicity and deployability
- Progressive Loading: Data is loaded incrementally (letter by letter) to optimize performance
- Caching Strategy: Loaded data is cached in memory to minimize repeat requests
- Error Handling: Robust fallbacks for missing data or connection issues
- Unicode Symbol Support: Historical alchemical symbols rendered using Unicode

## Development Setup

### Prerequisites

- A modern web browser
- Basic understanding of HTML, CSS, and JavaScript (for developers)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/alchemical-dictionaries-explorer.git
   ```

2. Navigate to the project directory:
   ```
   cd alchemical-dictionaries-explorer
   ```

3. Open `index.html` in your browser to run locally.

## Data Structure

### Dictionary Metadata (dictionary_metadata.json)
Contains general information about both dictionaries (title, author, year, etc.)

### Letter Indexes (ruland_letter_index.json, sommerhoff_letter_index.json)
Provide information about which letters have entries and how many entries each letter has.

### Letter Entries (ruland_index_a.json, sommerhoff_index_b.json, etc.)
Each file contains all entries for a specific letter in a specific dictionary. Basic structure:
```json
[
  {
    "id": "Ruland1612-Acetum",
    "lemma": "Acetum",
    "source": "ruland"
  }
]
``` 