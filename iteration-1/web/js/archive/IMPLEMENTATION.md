# Implementation Notes

This document outlines the implementation approach for the Alchemical Dictionaries Explorer.

## Core Files

- **index.html** - Single HTML file with the application structure
- **styles.css** - All styling for the application
- **js/app.js** - Main application logic and UI interactions
- **js/dictionary.js** - Dictionary data loading and processing

## Data Structure

The application uses JSON files located in the `/output` directory:

- **dictionary_metadata.json** - General information about both dictionaries
- **ruland_letter_index.json** - Letter index for Ruland dictionary
- **ruland_index_{letter}.json** - Entry data for each letter (a-z)
- **sommerhoff_letter_index.json** - Letter index for Sommerhoff dictionary
- **sommerhoff_index_{letter}.json** - Entry data for each letter (a-z)

## Implementation Strategy

### 1. Data Loading (dictionary.js)

The dictionary.js file handles all data loading operations:

```javascript
// Load dictionary metadata
async function loadMetadata() {
  const response = await fetch('output/dictionary_metadata.json');
  return await response.json();
}

// Load letter index for a dictionary
async function loadLetterIndex(dictionary) {
  const response = await fetch(`output/${dictionary}_letter_index.json`);
  return await response.json();
}

// Load entries for a specific letter
async function loadLetterEntries(dictionary, letter) {
  const response = await fetch(`output/${dictionary}_index_${letter.toLowerCase()}.json`);
  return await response.json();
}
```

### 2. User Interface (app.js)

The app.js file manages the UI and user interactions:

```javascript
// Initialize the application
function initApp() {
  // Set initial state
  const state = {
    currentDictionary: 'ruland',
    currentLetter: null,
    currentEntry: null
  };
  
  // Load initial data and set up UI
  loadInitialData();
  setupEventListeners();
}

// Handle dictionary toggle
function switchDictionary(dictionary) {
  state.currentDictionary = dictionary;
  updateLetterNavigation();
  clearEntryDisplay();
}

// Handle letter selection
function selectLetter(letter) {
  state.currentLetter = letter;
  loadAndDisplayEntries(state.currentDictionary, letter);
}

// Handle entry selection
function selectEntry(entryId) {
  loadAndDisplayEntryDetails(state.currentDictionary, entryId);
}

// Search functionality
function searchDictionary(term) {
  // Simple search implementation
}
```

### 3. HTML Structure

The index.html file provides a simple structure:

```html
<div class="container">
  <header>
    <h1>Alchemical Dictionaries Explorer</h1>
    
    <div class="controls">
      <div class="dictionary-toggle">
        <button id="ruland-btn">Ruland (1612)</button>
        <button id="sommerhoff-btn">Sommerhoff (1701)</button>
      </div>
      
      <div class="search">
        <input type="text" id="search-input" placeholder="Search terms...">
        <button id="search-btn">Search</button>
      </div>
    </div>
  </header>

  <nav class="letter-navigation" id="letter-nav">
    <!-- Alphabet navigation -->
  </nav>

  <main class="content">
    <div class="entry-list" id="entry-list">
      <!-- Entry list -->
    </div>
    
    <div class="entry-detail" id="entry-detail">
      <!-- Entry details -->
    </div>
  </main>
</div>
```

### 4. CSS Approach

The styles.css file uses a simple, responsive design:

```css
/* Basic layout using CSS Grid */
.container {
  display: grid;
  grid-template-rows: auto auto 1fr;
  height: 100vh;
}

.content {
  display: grid;
  grid-template-columns: 1fr 2fr;
}

/* Responsive layout */
@media (max-width: 768px) {
  .content {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}
```

## Performance Considerations

1. **Data Loading**
   - Load only letter data on demand, not entire dictionaries
   - Display loading indicators during data fetching
   - Cache loaded data in session storage when possible

2. **UI Performance**
   - Use document fragments for batch DOM updates
   - Limit the number of entries displayed at once
   - Implement simple pagination for large letter sections

3. **Search Implementation**
   - Start with basic client-side search within loaded data
   - Consider pre-loading common search terms
   - Implement debouncing for search input


# Development Guide

This guide provides instructions for developers working on the Alchemical Dictionaries Explorer.

## Getting Started

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/alchemical-dictionaries-explorer.git
   ```

2. Navigate to the project directory:
   ```
   cd alchemical-dictionaries-explorer
   ```

3. Open `index.html` in your browser to run the application locally

## Working with the Data

### JSON Data Files

The application uses pre-processed JSON files located in the `/output` directory:

- **dictionary_metadata.json**: Contains general information about both dictionaries
- **ruland_letter_index.json**: Contains an index of all letters and entry counts for Ruland
- **ruland_index_{letter}.json**: Contains entries for each letter in Ruland's dictionary
- **sommerhoff_letter_index.json**: Contains an index of all letters and entry counts for Sommerhoff
- **sommerhoff_index_{letter}.json**: Contains entries for each letter in Sommerhoff's dictionary

### Example Entry Structure

Ruland dictionary entry:
```json
{
  "id": "ruland_aqua_fortis",
  "lemma": "Aqua fortis",
  "letter": "A",
  "definition": "Nitri spiritus acidus...",
  "translations": ["Scheidewasser"],
  "source": "ruland"
}
```

Sommerhoff dictionary entry:
```json
{
  "id": "sommerhoff_mercurius",
  "lemma": "Mercurius",
  "letter": "M",
  "definition": "est Argentum vivum...",
  "german_text": ["Quecksilber"],
  "symbols": ["mercury"],
  "source": "sommerhoff"
}
```

## JavaScript Structure

### dictionary.js

This file handles data loading and processing:

- **loadMetadata()**: Loads general dictionary information
- **loadLetterIndex(dictionary)**: Loads the letter index for a dictionary
- **loadLetterEntries(dictionary, letter)**: Loads entries for a specific letter
- **getEntry(dictionary, entryId)**: Gets a specific entry by ID
- **searchEntries(dictionary, term)**: Searches for entries matching a term

### app.js

This file handles user interface and interactions:

- **initApp()**: Initializes the application
- **setupEventListeners()**: Sets up event listeners for UI elements
- **switchDictionary(dictionary)**: Handles dictionary switching
- **selectLetter(letter)**: Handles letter selection
- **renderEntryList(entries)**: Renders a list of entries
- **renderEntryDetails(entry)**: Renders detailed entry information
- **handleSearch(term)**: Handles search input

## Browser Compatibility

The application should work in all modern browsers (Chrome, Firefox, Safari, Edge). We use standard ES6 features that are widely supported:

- Fetch API for data loading
- Promises and async/await for asynchronous operations
- Arrow functions, template literals, and other ES6 syntax
- CSS Grid and Flexbox for layout

## Common Challenges

### Data Loading Performance

Be aware of performance implications when loading dictionary data:

- Letter data files range from a few KB to several hundred KB
- Some letters may contain hundreds of entries
- Consider loading in chunks or implementing pagination for large letter sections

### Multilingual Text

The dictionaries contain Latin and German text:

- Ensure proper display of special characters
- Use appropriate font that supports all required characters
- Consider adding language attributes to elements (`lang="la"`, `lang="de"`)

### Alchemical Symbols

Sommerhoff's dictionary contains alchemical symbols:

- Some symbols are represented in Unicode
- Handle symbol display consistently across browsers
- Consider using a specialized font or fallback characters