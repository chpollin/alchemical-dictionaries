/**
 * Alchemical Dictionaries Explorer - Enhanced Data Loader
 * This module provides comprehensive access to all TEI-to-JSON data structures
 * and serves as a central data access layer for the application.
 *
 * VERSION: Consolidated with working loader and necessary methods for Browse.
 */

class DictionaryDataLoader {
    constructor(config) {
        // Ensure dataPath ends with a slash
        let dp = config.dataPath || './output/';
        if (!dp.endsWith('/')) {
            dp += '/';
        }
        // Handle relative paths slightly more robustly
        this.dataPath = dp.startsWith('./') ? '../' + dp.substring(2) : dp;

        this.cache = {
            metadata: null,
            letterIndexes: {}, // { ruland: {...}, sommerhoff: {...} }
            documentStructures: {}, // { ruland: {...}, sommerhoff: {...} }
            symbols: null, // Object keyed by symbol ID
            symbolTables: null, // Optional, likely array or object
            letterData: {},      // Cache for { entries: [...] } per letter, key: 'dict_L'
            entryDetails: {},    // Cache for individual full entry objects, key: entryId
            searchIndexes: {}, // { ruland: [...], sommerhoff: [...] }
            combinedSearchIndex: null, // Array
            referenceNetwork: null // Object { nodes: [], links: [] }
        };
        this.failedRequests = new Set(); // Keep track of failed fetches for specific files
        this.initialized = false;
        this.initializing = false; // Prevent multiple initializations

        console.log(`[Loader Constructor] dataPath initialized to: ${this.dataPath}`);
    }

    /**
     * Initialize the data loader
     * Loads essential data and prepares the loader for use.
     */
    async initialize() {
        if (this.initialized || this.initializing) {
            console.log(`Initialization already complete or in progress.`);
            return this.initialized;
        }

        this.initializing = true;
        console.log(`[Initialize] Starting dictionary data loader initialization... (Path: ${this.dataPath})`);

        try {
            // 1. Load metadata FIRST
            this.cache.metadata = await this.loadMetadata();
            if (!this.cache.metadata) {
                 throw new Error("Failed to load essential dictionary_metadata.json. Cannot proceed.");
            }
            console.log("[Initialize] Metadata loaded.");

            // 2. Load other essential data concurrently
            const essentialLoads = await Promise.allSettled([
                this.loadLetterIndex('ruland'),
                this.loadLetterIndex('sommerhoff'),
                this.loadSymbols(),
                this.loadDocumentStructure('ruland'),
                this.loadDocumentStructure('sommerhoff')
            ]);

            // Check results of essential loads
            essentialLoads.forEach((result, i) => {
                const name = ['Ruland Index', 'Sommerhoff Index', 'Symbols', 'Ruland Structure', 'Sommerhoff Structure'][i];
                if (result.status === 'rejected') {
                    console.error(`[Initialize] Failed to load essential resource (${name}):`, result.reason);
                    if (name.includes('Index')) throw new Error(`Failed to load critical resource: ${name}`);
                } else if (result.value === null && !name.includes('Symbols') && !name.includes('Structure')) { // Symbols/Structure failure might be less critical initially
                    // Allow Symbols/Structure to fail without halting if needed, but Indexes are critical
                     console.warn(`[Initialize] Essential resource (${name}) loaded as null.`);
                     if (name.includes('Index')) throw new Error(`Critical resource (${name}) could not be loaded.`);
                 } else {
                     console.log(`[Initialize] Essential resource (${name}) loaded.`);
                 }
            });

            // 3. Load optional data concurrently
            console.log("[Initialize] Attempting to load optional resources...");
             await Promise.allSettled([
                 this.loadSymbolTables(),
                 this.loadReferenceNetwork(),
                 this.loadCombinedSearchIndex(),
                 this.loadSearchIndex('ruland'),
                 this.loadSearchIndex('sommerhoff')
             ]).then(results => {
                 results.forEach((result, i) => {
                     const name = ['Symbol Tables', 'Reference Network', 'Combined Search', 'Ruland Search', 'Sommerhoff Search'][i];
                     if (result.status === 'rejected') {
                        console.warn(`[Initialize] Optional resource (${name}) failed to load:`, result.reason);
                     } else if (result.value === null) {
                         // This is expected if file is 404 etc.
                         // console.warn(`[Initialize] Optional resource (${name}) was not found or failed to load.`);
                     } else {
                         console.log(`[Initialize] Optional resource (${name}) loaded.`);
                     }
                 });
             });


            this.initialized = true;
            this.initializing = false;
            console.log('[Initialize] Dictionary data loader initialization completed successfully.');
            return true;

        } catch (error) {
            console.error('[Initialize] CRITICAL ERROR during data loader initialization:', error);
            this.initializing = false;
            this.initialized = false; // Ensure it's marked as not initialized on failure
            // Reset core cache items on critical failure
            this.cache.metadata = null;
            this.cache.letterIndexes = {};
            this.cache.symbols = null;
            this.cache.documentStructures = {};
            return false; // Indicate failure
        }
    }

    /**
     * Load any resource by filename. (Simplified loading logic)
     */
    async loadResource(filename, cacheType = null, cacheKey = null, isOptional = false) {
        const fullPath = `${this.dataPath}${filename}`;
        const uniqueRequestKey = filename;

        const cachedItem = this.getCachedResource(filename, cacheType, cacheKey);
        if (cachedItem !== undefined && cachedItem !== null) { // Check cache (allow null only if not explicitly undefined)
             return cachedItem;
        }

        if (this.failedRequests.has(uniqueRequestKey)) {
            return null; // Don't retry known failures
        }

        try {
            const response = await fetch(fullPath);

            if (!response.ok) {
                const errorMsg = `Request failed for ${filename}: ${response.status} ${response.statusText}`;
                // Log 404s for optional files as warnings, others potentially as errors
                if (isOptional || response.status === 404) {
                    // console.warn(`[Load Warn] ${errorMsg}. Resource considered optional or not found.`); // Reduce noise
                } else {
                     console.error(`[Load Fail] ${errorMsg}. Resource considered essential.`);
                }
                this.failedRequests.add(uniqueRequestKey);
                if (isOptional || response.status === 404) return null;
                else throw new Error(errorMsg); // Throw for essential file load errors (non-404)
            }

            const data = await response.json();
            this.setCachedResource(data, filename, cacheType, cacheKey);
            return data;

        } catch (error) {
            const errorType = error instanceof SyntaxError ? 'Invalid JSON' : 'Fetch/Network Error';
            // Log non-optional failures more prominently
             if (!isOptional) {
                console.error(`[Load Fail] Error loading ${filename} (${errorType}):`, error.message);
             } else {
                 // console.warn(`[Load Warn] Failed optional ${filename} (${errorType}):`, error.message); // Reduce noise
             }
            this.failedRequests.add(uniqueRequestKey);
            return null;
        }
    }

    // --- Caching Helpers ---
    getCachedResource(filename, cacheType, cacheKey) {
        if (cacheType && cacheKey && this.cache[cacheType] && this.cache[cacheType].hasOwnProperty(cacheKey)) { return this.cache[cacheType][cacheKey]; }
        if (cacheType && !cacheKey && this.cache[cacheType] && this.cache[cacheType].hasOwnProperty(filename)) { return this.cache[cacheType][filename]; }
        const directCacheKey = filename.split('.')[0].replace(/^(ruland_|sommerhoff_)/, '');
        if (!cacheType && this.cache.hasOwnProperty(directCacheKey) && this.cache[directCacheKey] !== null) { return this.cache[directCacheKey]; }
        // Handle specific known types explicitly if needed for robustness
        return undefined; // Indicate not found in cache
    }

    setCachedResource(data, filename, cacheType, cacheKey) {
        if (cacheType && cacheKey) {
            if (!this.cache[cacheType]) this.cache[cacheType] = {};
            this.cache[cacheType][cacheKey] = data;
        } else if (cacheType) {
            // Store directly under the type if no specific key given? Or use filename? Let's use filename for now.
            const keyForCache = filename;
            if (!this.cache[cacheType]) this.cache[cacheType] = {};
            this.cache[cacheType][keyForCache] = data;
        } else {
             const directCacheKey = filename.split('.')[0].replace(/^(ruland_|sommerhoff_)/, '');
             if (this.cache.hasOwnProperty(directCacheKey)) { this.cache[directCacheKey] = data; }
             // Handle specific known types if they don't fit the pattern
             else if (filename === 'dictionary_metadata.json') this.cache.metadata = data;
             else if (filename === 'sommerhoff_symbols.json') this.cache.symbols = data;
             else if (filename === 'sommerhoff_symbol_tables.json') this.cache.symbolTables = data;
             else if (filename === 'cross_reference_network.json') this.cache.referenceNetwork = data;
             else if (filename === 'combined_search_index.json') this.cache.combinedSearchIndex = data;

             // Ensure structured caches are initialized if needed
             if (filename.endsWith('_letter_index.json')) {
                 const dict = filename.replace('_letter_index.json', '');
                 if (!this.cache.letterIndexes) this.cache.letterIndexes = {};
                 this.cache.letterIndexes[dict] = data;
             } else if (filename.endsWith('_document_structure.json')) {
                 const dict = filename.replace('_document_structure.json', '');
                  if (!this.cache.documentStructures) this.cache.documentStructures = {};
                 this.cache.documentStructures[dict] = data;
             } else if (filename.endsWith('_search_index.json')) {
                  const dict = filename.replace('_search_index.json', '');
                  if (!this.cache.searchIndexes) this.cache.searchIndexes = {};
                  this.cache.searchIndexes[dict] = data;
             }
        }
    }

    // --- Specific Data Loading Methods ---

    async loadMetadata() { return await this.loadResource('dictionary_metadata.json', null, null, false); }
    async loadSymbols() { return await this.loadResource('sommerhoff_symbols.json', 'symbols', null, false); } // Treat symbols as essential for now
    async loadSymbolTables() { return await this.loadResource('sommerhoff_symbol_tables.json', 'symbolTables', null, true); }
    async loadDocumentStructure(dictionary) { return await this.loadResource(`${dictionary}_document_structure.json`, 'documentStructures', dictionary, false); }
    async loadLetterIndex(dictionary) { return await this.loadResource(`${dictionary}_letter_index.json`, 'letterIndexes', dictionary, false); }
    async loadSearchIndex(dictionary) { return await this.loadResource(`${dictionary}_search_index.json`, 'searchIndexes', dictionary, true); }
    async loadCombinedSearchIndex() { return await this.loadResource('combined_search_index.json', 'combinedSearchIndex', null, true); }
    async loadReferenceNetwork() { return await this.loadResource('cross_reference_network.json', 'referenceNetwork', null, true); }

    // --- Entry Loading and Handling (Re-integrated from Original) ---

    /**
     * Load entries for a specific letter, enhancing them on load.
     */
    async loadLetterEntries(dictionary, letter) {
        const upperLetter = letter.toUpperCase();
        const cacheKey = `${dictionary}_${upperLetter}`;
        const filename = `${dictionary}_index_${letter.toLowerCase()}.json`;

        const cachedData = this.getCachedResource(filename, 'letterData', cacheKey);
         if (cachedData) return cachedData;

        const rawEntryArray = await this.loadResource(filename, null, null, false); // Letter files are essential when requested

         if (!rawEntryArray || !Array.isArray(rawEntryArray)) {
             console.error(`Error loading or parsing ${letter} entries for ${dictionary}. Returning empty.`);
             const fallbackData = { entries: [] };
              // Cache the empty result to prevent repeated failed loads
              this.setCachedResource(fallbackData, filename, 'letterData', cacheKey);
             return fallbackData;
         }

         // Enhance entries (adds source, letter, symbolsUnicode if applicable)
         const letterData = {
             entries: this.enhanceEntries(rawEntryArray, dictionary)
         };

         // Cache the processed result
          this.setCachedResource(letterData, filename, 'letterData', cacheKey);

           // Also populate entryDetails cache for faster direct access later by getEntry
           if (!this.cache.entryDetails) this.cache.entryDetails = {};
           letterData.entries.forEach(entry => {
               if (entry && entry.id) {
                    this.cache.entryDetails[entry.id] = entry;
               }
           });

         return letterData;
     }

     /**
      * Enhance entries with additional derived information (like source, symbolsUnicode).
      * Preserves original fields.
      */
    enhanceEntries(entries, dictionary) {
        if (!Array.isArray(entries)) return [];
        // console.log(`[Enhance] Enhancing ${entries?.length} entries for ${dictionary}`); // Can be noisy

        const symbolsAvailable = dictionary === 'sommerhoff' && this.cache.symbols && Object.keys(this.cache.symbols).length > 0;

        return entries.map(entry => {
            if (!entry) return null; // Handle null entries in array if they occur

            const enhancedEntry = { ...entry }; // Start with a copy

            // Add 'source' if missing
            if (!enhancedEntry.source) { enhancedEntry.source = dictionary; }
            // Add 'letter' if missing
            if (!enhancedEntry.letter && enhancedEntry.lemma) {
                enhancedEntry.letter = enhancedEntry.lemma.charAt(0).toUpperCase();
            }

            // Add 'symbolsUnicode' for Sommerhoff if symbols are available
            if (symbolsAvailable && enhancedEntry.symbols && Array.isArray(enhancedEntry.symbols) && enhancedEntry.symbols.length > 0) {
                // Ensure symbolsUnicode isn't already present
                 if (!enhancedEntry.symbolsUnicode) {
                    enhancedEntry.symbolsUnicode = enhancedEntry.symbols.map(symbolData => {
                        const symbolId = typeof symbolData === 'string' ? symbolData : symbolData?.id;
                        return symbolId ? this.getSymbolUnicode(symbolId) : '';
                    }).filter(Boolean); // Remove empty strings if any symbol failed
                 }
            }
            return enhancedEntry;
        }).filter(Boolean); // Filter out any null entries processed
    }


    /**
     * Get a specific entry by ID, returning the full data structure.
     * Uses cache, loads letter data if necessary.
     */
    async getEntry(dictionary, entryId) {
        if (!entryId) {
            console.error('getEntry requires an entry ID.');
            return null;
        }

        // 1. Check entryDetails cache first (populated by loadLetterEntries)
        if (this.cache.entryDetails && this.cache.entryDetails[entryId]) {
            return this.cache.entryDetails[entryId];
        }

        // 2. Determine the letter for the entry IF letter indexes are loaded
        let targetLetter = null;
        const letterIndex = this.cache.letterIndexes ? this.cache.letterIndexes[dictionary] : null;

        if (letterIndex && letterIndex.letters) {
             // Optimized: Find the letter directly
             for (const letter in letterIndex.letters) {
                 const indexEntries = letterIndex.letters[letter]?.entries;
                 if (indexEntries?.length > 0) {
                     // Check if index entries are simple IDs or objects like {id: ...}
                     const firstEntry = indexEntries[0];
                      const indexHasObjects = typeof firstEntry === 'object' && firstEntry !== null && firstEntry.hasOwnProperty('id');

                     if (indexHasObjects) {
                         if (indexEntries.some(e => e && e.id === entryId)) { targetLetter = letter; break; }
                     } else { // Assume array of strings (IDs)
                         if (indexEntries.includes(entryId)) { targetLetter = letter; break; }
                     }
                 }
             }
        }

        // Fallback guess if not found in index or index not ready
        if (!targetLetter) {
            console.warn(`Entry ${entryId} not found in index for ${dictionary}, or index not loaded. Guessing letter from ID.`);
            // Basic guess: e.g., "ruland_acidum_1" -> "A"
            const parts = entryId.replace(`${dictionary}_`, '').split('_');
            if (parts.length > 0 && parts[0] && /^[a-zA-Z]/.test(parts[0])) {
                const guessedLetter = parts[0].charAt(0).toUpperCase();
                 // Basic validation against alphabet
                 if ('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(guessedLetter)) {
                      targetLetter = guessedLetter;
                      console.warn(`Guessed letter: ${targetLetter}`);
                 } else {
                      console.error(`Could not determine a valid letter for entry ${entryId}`);
                      return null;
                 }
            } else {
                console.error(`Could not determine letter for entry ${entryId}`);
                return null;
            }
        }

        // 3. Load the necessary letter data (will use cache if available)
        const letterData = await this.loadLetterEntries(dictionary, targetLetter);
        if (!letterData || !letterData.entries) {
            console.error(`Could not load entries for letter ${targetLetter}, cannot find entry ${entryId}`);
            return null;
        }

        // 4. Find the specific entry within the loaded letter data
        // Note: letterData.entries should already be enhanced
        const entry = letterData.entries.find(e => e && e.id === entryId);

        if (!entry) {
            console.warn(`Entry ${entryId} not found within loaded letter ${targetLetter} data.`);
            // Cache failure? No, might just be missing from file.
            return null;
        }

        // 5. Cache in entryDetails (might be redundant if loadLetterEntries already did it, but safe)
         if (!this.cache.entryDetails) this.cache.entryDetails = {};
        this.cache.entryDetails[entryId] = entry;
        return entry;
    }

    // --- Symbol Handling (Re-integrated from Original) ---

     /**
      * Get Unicode representation for a symbol ID.
      * Prefers direct char, then code point, then name, then ID.
      */
    getSymbolUnicode(symbolId) {
        if (!this.cache.symbols || !symbolId) return symbolId || ''; // Return ID if no symbol data or no ID

        const symbol = this.cache.symbols[symbolId];
        if (!symbol) return symbolId; // Return the ID if specific symbol not found

        // Prefer direct unicode character if present
        if (symbol.unicode_char) { return symbol.unicode_char; }

        // Then try converting from code point if available (format U+XXXX)
        if (symbol.unicode && typeof symbol.unicode === 'string' && symbol.unicode.startsWith('U+')) {
            try {
                return String.fromCodePoint(parseInt(symbol.unicode.substring(2), 16));
            } catch (e) {
                console.warn(`Failed to convert Unicode point ${symbol.unicode} for symbol ${symbolId}:`, e);
            }
        }
        // Use direct unicode if it's likely a char already (single char string)
        if (symbol.unicode && typeof symbol.unicode === 'string' && symbol.unicode.length === 1) {
             return symbol.unicode;
        }

        // Fallback to symbol name (if available) or the original ID
        return symbol.name || symbolId;
    }

     /**
      * Get complete symbol information object, including the display character.
      */
    getSymbolInfo(symbolId) {
        if (!this.cache.symbols || !symbolId) return null;
        const symbol = this.cache.symbols[symbolId];
        if (!symbol) return null;

        return {
            ...symbol, // Spread all original symbol data
            unicodeDisplay: this.getSymbolUnicode(symbolId) // Add display character
        };
    }


    // --- Other potential methods (Search, References, Structure Info etc.) ---
    // Add search, reference finding, page/section info methods back here
    // from the original load.js if needed for future features.


    // --- Cache Management ---
    resetFailedRequests() {
        this.failedRequests.clear();
        console.log("Cleared failed requests log.");
    }

    clearCache(type = 'all', key = null) {
        // (Using the detailed clearCache logic from original)
        console.log(`Clearing cache: type='${type}', key='${key}'`);
        switch (type.toLowerCase()) {
            case 'dictionary':
                if (key && (key === 'ruland' || key === 'sommerhoff')) {
                    delete this.cache.letterIndexes[key];
                    delete this.cache.documentStructures[key];
                    delete this.cache.searchIndexes[key];
                    // Clear letter data
                    Object.keys(this.cache.letterData || {}).forEach(cacheKey => {
                        if (cacheKey.startsWith(`${key}_`)) delete this.cache.letterData[cacheKey];
                    });
                    // Clear entry details
                    Object.keys(this.cache.entryDetails || {}).forEach(entryId => {
                        if (entryId.startsWith(`${key}_`)) delete this.cache.entryDetails[entryId];
                    });
                    console.log(`Cleared cache for dictionary: ${key}`);
                } else { console.warn(`Invalid key '${key}' for clearing dictionary cache.`); }
                break;
            case 'letter': // Expects key like 'ruland_A'
                if (key && key.includes('_')) delete this.cache.letterData[key];
                else { console.warn(`Invalid key '${key}' for clearing letter cache. Expected format 'dictionary_LETTER'.`); }
                break;
            case 'entry': // Expects entryId like 'ruland_acidum_1'
                if (key) delete this.cache.entryDetails[key];
                else { console.warn(`Missing key for clearing entry cache.`); }
                break;
            case 'symbols':
                this.cache.symbols = null; this.cache.symbolTables = null;
                console.log(`Cleared symbols and symbol tables cache.`);
                break;
            case 'metadata':
                this.cache.metadata = null;
                console.log(`Cleared metadata cache.`);
                break;
            case 'structure':
                 if (key && (key === 'ruland' || key === 'sommerhoff')) delete this.cache.documentStructures[key];
                 else if (!key) { this.cache.documentStructures = {}; console.log("Cleared all document structures."); }
                 else { console.warn(`Invalid key '${key}' for clearing structure cache.`); }
                 break;
            case 'network':
                 this.cache.referenceNetwork = null;
                 console.log(`Cleared reference network cache.`);
                 break;
            case 'search':
                 if (key && (key === 'ruland' || key === 'sommerhoff')) delete this.cache.searchIndexes[key];
                 else if (key === 'combined') this.cache.combinedSearchIndex = null;
                 else if (!key) { this.cache.searchIndexes = {}; this.cache.combinedSearchIndex = null; console.log("Cleared all search indexes."); }
                 else { console.warn(`Invalid key '${key}' for clearing search cache.`); }
                 break;
            case 'all':
                this.cache = { metadata: null, letterIndexes: {}, documentStructures: {}, symbols: null, symbolTables: null, letterData: {}, entryDetails: {}, searchIndexes: {}, combinedSearchIndex: null, referenceNetwork: null };
                console.log("Cleared all caches.");
                break;
            default:
                console.warn(`Unknown cache type: ${type}`);
        }
    }
}

// Note: Instance creation (`window.dictionaryLoader = ...`) should happen in the HTML file
// after the config is defined and this script is loaded.