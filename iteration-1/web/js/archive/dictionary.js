class DictionaryDataLoader {
  constructor(config) {
      this.initialDataPath = config.dataPath.startsWith('./') ?
          '../' + config.dataPath.substring(2) :
          config.dataPath;
      this.dataPath = this.initialDataPath;
      this.cache = {
          metadata: null,
          letterIndexes: {}, // Key: 'ruland', 'sommerhoff'
          documentStructures: {}, // Key: 'ruland', 'sommerhoff'
          symbols: null,
          symbolTables: null,
          letterData: {},
          entryDetails: {},
          searchIndexes: {},
          combinedSearchIndex: null,
          referenceNetwork: null
      };
      this.failedRequests = new Set();
      this.initialized = false;
      this.initializing = false;
      this.pathResolved = false;
  }

  // --- loadResource and findAndFetchMetadata remain the same as Step 1 ---
  async loadResource(filename, cacheType = null, cacheKey = null) {
      const fullPath = `${this.dataPath}${filename}`;
      const uniqueRequestKey = filename;

      if (this.failedRequests.has(uniqueRequestKey)) {
          return null;
      }

      if (cacheType && cacheKey && this.cache[cacheType]?.[cacheKey]) {
          return this.cache[cacheType][cacheKey];
      }
      if (cacheType && !cacheKey && this.cache[cacheType]?.[filename]) {
           return this.cache[cacheType][filename];
      }
      // Adjusted check for direct properties like 'symbols'
      const directCacheKey = filename.split('.')[0].replace(/^(ruland_|sommerhoff_)/, '');
      if (!cacheType && this.cache.hasOwnProperty(directCacheKey) && this.cache[directCacheKey] !== null) {
           return this.cache[directCacheKey];
      }


      try {
          let response;
          if (filename === 'dictionary_metadata.json' && !this.pathResolved) {
              response = await this.findAndFetchMetadata();
          } else {
               if (!this.pathResolved && filename !== 'dictionary_metadata.json') {
                  console.warn(`Data path not resolved, attempting to load metadata first to find path for ${filename}`);
                  await this.loadMetadata();
                  if (!this.pathResolved) {
                       throw new Error(`Could not resolve data path before loading ${filename}`);
                  }
               }
              response = await fetch(`${this.dataPath}${filename}`);
          }

          if (!response.ok) {
              // Don't throw immediately for optional files, let caller handle null
              if (['sommerhoff_symbol_tables.json', 'cross_reference_network.json'].includes(filename)) {
                  console.warn(`Optional file not found or failed to load: ${this.dataPath}${filename}: ${response.status}`);
                  this.failedRequests.add(uniqueRequestKey);
                  return null; // Indicate optional file failure
              }
              throw new Error(`Workspace failed for ${this.dataPath}${filename}: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();

           if (cacheType && cacheKey) {
               if (!this.cache[cacheType]) this.cache[cacheType] = {};
               this.cache[cacheType][cacheKey] = data;
           } else if (cacheType) {
               // Handle cases where filename is the key (like letter index)
                const keyForCache = filename; // Use full filename as key within the type
               if (!this.cache[cacheType]) this.cache[cacheType] = {};
               this.cache[cacheType][keyForCache] = data;

           } else {
                // Use direct property name if it exists in cache structure
               if (this.cache.hasOwnProperty(directCacheKey)) {
                  this.cache[directCacheKey] = data;
               }
           }

          return data;

      } catch (error) {
          console.error(`Error loading ${filename}:`, error.message);
          this.failedRequests.add(uniqueRequestKey);
          return null;
      }
  }

   async findAndFetchMetadata() {
      const filename = 'dictionary_metadata.json';
      let lastError = null;
      const pathsToTry = [
          this.initialDataPath,
          './output/',
          '../output/',
          '../../output/',
           './data/',
           '../data/',
      ];

      for (const pathPrefix of pathsToTry) {
          const fullPath = `${pathPrefix}${filename}`;
          try {
              const response = await fetch(fullPath);
              if (response.ok) {
                  console.log(`Successfully found metadata at: ${pathPrefix}`);
                  this.dataPath = pathPrefix;
                  this.pathResolved = true;
                  return response;
              }
              lastError = `Status ${response.status} for ${fullPath}`;
          } catch (fetchError) {
              lastError = fetchError.message;
          }
      }
      this.pathResolved = false;
      throw new Error(`Could not find ${filename} in any specified path. Last error: ${lastError}`);
   }
  // --- End of loadResource / findAndFetchMetadata ---


  /**
   * Initialize the data loader by loading essential base data.
   */
  async initialize() {
      if (this.initialized || this.initializing) return;

      this.initializing = true;
      console.log('Initializing dictionary data loader...');

      try {
          // 1. Load metadata first to resolve path
          this.cache.metadata = await this.loadMetadata();
          if (!this.cache.metadata) {
              // If metadata failed even with fallback logic in loadMetadata, critical failure.
              throw new Error("Essential metadata could not be loaded or defaulted.");
          }

          // 2. Load other essential and optional data concurrently
          const loadPromises = [
              this.loadLetterIndex('ruland'),
              this.loadLetterIndex('sommerhoff'),
              this.loadDocumentStructure('ruland'),
              this.loadDocumentStructure('sommerhoff'),
              this.loadSymbols(),
              this.loadSymbolTables(), // Optional
              this.loadReferenceNetwork() // Optional
              // Search indexes will be loaded on demand by search functions
          ];

          await Promise.all(loadPromises);

          // Check if critical data failed post-concurrent load (indexes are important)
          if (!this.cache.letterIndexes.ruland || !this.cache.letterIndexes.sommerhoff) {
               console.warn("Failed to load one or more critical letter indexes during initialization.");
               // Decide if this is a fatal error or if app can continue degraded
               // For now, we allow continuing but log warning.
          }


          this.initialized = true;
          this.initializing = false;
          console.log('Dictionary data loader initialized successfully.');
          return true; // Indicate success

      } catch (error) {
          console.error('Failed to initialize dictionary data loader:', error);
          this.cache.metadata = this.createDefaultMetadata(); // Ensure fallback metadata exists on error
          this.initializing = false;
          this.initialized = false; // Ensure it's marked as not initialized
          // Propagate the error so the calling application knows init failed
          throw error;
      }
  }

  async loadMetadata() {
      // Check cache first
      if (this.cache.metadata) return this.cache.metadata;

      const data = await this.loadResource('dictionary_metadata.json'); // No cache type needed, handled directly
      if (data) {
          this.cache.metadata = data;
      } else if (!this.cache.metadata) {
          // If loading failed and cache still null, use fallback
          console.warn("Metadata loading failed, using default fallback metadata.");
          this.cache.metadata = this.createDefaultMetadata();
      }
      return this.cache.metadata;
  }

  /**
   * Load symbols data (primarily for Sommerhoff).
   */
  async loadSymbols() {
      // Check cache first
      if (this.cache.symbols) return this.cache.symbols;

      const data = await this.loadResource('sommerhoff_symbols.json'); // Infers cache key 'symbols'
      if (data) {
         this.cache.symbols = data;
      } else {
         console.warn("Symbols data (sommerhoff_symbols.json) could not be loaded. Symbols might not display correctly.");
         this.cache.symbols = {}; // Use empty object as fallback
      }
      return this.cache.symbols;
  }

  /**
   * Load symbol tables (optional).
   */
   async loadSymbolTables() {
      if (this.cache.symbolTables) return this.cache.symbolTables;
      const data = await this.loadResource('sommerhoff_symbol_tables.json'); // Infers cache key 'symbolTables'
      if (data) {
          this.cache.symbolTables = data;
      } else {
          console.log("Optional symbol tables (sommerhoff_symbol_tables.json) not found or failed to load.");
          this.cache.symbolTables = []; // Use empty array as fallback
      }
      return this.cache.symbolTables;
   }

  /**
   * Load letter index for a specific dictionary.
   */
  async loadLetterIndex(dictionary) {
      const cacheKey = dictionary;
      // Check cache first
      if (this.cache.letterIndexes[cacheKey]) {
          return this.cache.letterIndexes[cacheKey];
      }

      const filename = `${dictionary}_letter_index.json`;
      const data = await this.loadResource(filename, 'letterIndexes', cacheKey);

      if (data) {
          // Data is already stored in cache by loadResource
          return data;
      } else {
          console.error(`Critical letter index for ${dictionary} could not be loaded.`);
          const emptyIndex = this.createEmptyLetterIndex();
          this.cache.letterIndexes[cacheKey] = emptyIndex; // Cache fallback
          return emptyIndex;
      }
  }

  /**
   * Load document structure for a specific dictionary.
   */
  async loadDocumentStructure(dictionary) {
      const cacheKey = dictionary;
      // Check cache first
      if (this.cache.documentStructures[cacheKey]) {
          return this.cache.documentStructures[cacheKey];
      }

      const filename = `${dictionary}_document_structure.json`;
      const data = await this.loadResource(filename, 'documentStructures', cacheKey);

      if (data) {
          // Data is already stored in cache by loadResource
          return data;
      } else {
          console.warn(`Document structure for ${dictionary} could not be loaded. Page/Section navigation might be limited.`);
          const fallbackStructure = { sections: [], pages: {}, letters: [], headers_footers: {} };
          this.cache.documentStructures[cacheKey] = fallbackStructure; // Cache fallback
          return fallbackStructure;
      }
  }

   /**
    * Load reference network (optional).
    */
   async loadReferenceNetwork() {
      if (this.cache.referenceNetwork) return this.cache.referenceNetwork;
      const data = await this.loadResource('cross_reference_network.json'); // Infers cache key 'referenceNetwork'
      if (data) {
          this.cache.referenceNetwork = data;
      } else {
          console.log("Optional reference network (cross_reference_network.json) not found or failed to load.");
          this.cache.referenceNetwork = { nodes: [], links: [] }; // Use empty network fallback
      }
      return this.cache.referenceNetwork;
   }

  createDefaultMetadata() {
       return { ruland: { title: "Lexicon Alchemiae", author: "Martin Ruland", year: "1612", entryCount: 0, language: "Latin with German translations", description: "A comprehensive alchemical dictionary with scholarly notes." }, sommerhoff: { title: "Lexicon pharmaceutico-chymicum", author: "Johann Sommerhoff", year: "1701", entryCount: 0, language: "Bilingual Latin-German", description: "A bilingual dictionary covering pharmaceutical, alchemical, and botanical terms." }, generated: new Date().toISOString(), version: "1.0.0" };
   }

  createEmptyLetterIndex() {
      const letters = {};
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => { letters[letter] = { count: 0, entries: [] }; });
      return { letters: letters, totalEntries: 0 };
   }

  // --- Methods from old DictionaryManager to be updated/added later ---
  // getSymbolUnicode(symbolId) { /* Needs update to use cache */ }
  // loadLetterEntries(dictionary, letter) { /* Needs update */ }
  // enhanceEntries(entries, dictionary) { /* Needs review/update */ }
  // getEntry(dictionary, entryId) { /* Needs significant update */ }
  // searchEntries(dictionary, term) { /* Needs significant update */ }
  // searchInLetter(dictionary, letter, searchTerm, results) { /* Needs update/review */ }
  // resetFailedRequests() { /* Needs update to use Set */ }
  // clearCache(dictionary) { /* Needs update for new cache structure */ }

  // --- New methods to be added later ---
  // loadSearchIndex(dictionary)
  // loadCombinedSearchIndex()
  // searchAcrossDictionaries(term, options)
  // findCrossReferences(entry)
  // findIncomingReferences(entryId, dictionary)
  // findImplicitReferences(entry)
  // getPageInfo(dictionary, pageNumber)
  // getEntriesOnPage(dictionary, pageNumber)
  // getSectionInfo(dictionary, sectionId)
  // getEntriesInSection(dictionary, sectionId)
  // getAllSymbols(options)
  // getEntriesWithSymbol(symbolId, options)
  // getSymbolInfo(symbolId)

}

// Example Usage:
// Assuming config is defined elsewhere
// const config = { dataPath: './output/' };
// const dictionaryLoader = new DictionaryDataLoader(config);
// window.dictionaryLoader = dictionaryLoader; // Make globally accessible for app.js
//
// // Initialize the loader when the application starts
// dictionaryLoader.initialize()
//  .then(success => {
//      if (success) {
//          console.log("Loader initialized, ready to use.");
//          // Now the app can safely call other loader methods
//          // Example: dictionaryLoader.loadLetterIndex('ruland').then(index => console.log(index));
//      } else {
//          console.error("Loader initialization failed critically even with fallbacks.");
//          // Application should handle this failure state
//      }
//  })
//  .catch(error => {
//      console.error("Loader initialization threw an error:", error);
//      // Application should handle this failure state
//  });