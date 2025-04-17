# Data Loading Process for Alchemical Dictionaries Explorer

This document outlines how the application loads the necessary data for the Ruland (1612) and Sommerhoff (1701) alchemical dictionaries.

## Overview

The core data loading logic resides in `load.js`, which defines the `DictionaryDataLoader` class. This class is responsible for fetching dictionary data (pre-processed into JSON format), caching it in the browser's memory, and making it available to the application.

## Data Source Location

-   All dictionary data is expected to be in **JSON format**.
-   These JSON files must be located together within a specific **data directory**.
-   The application needs to know the path to this directory. This is configured via the `dataPath` property passed to the `DictionaryDataLoader` constructor, typically set in the main HTML file (`index.html`).
-   The `dataPath` should be a **relative URL path** from the HTML file to the data directory (e.g., `../output/`, `./data/`, `/app/data/`).

*Example `dataPath` configuration in HTML:*
```javascript
const config = {
    // Path from this HTML file to the directory containing JSON data
    dataPath: '../output/'
};
window.dictionaryLoader = new DictionaryDataLoader(config);