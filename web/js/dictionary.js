/**
 * Alchemical Dictionaries Explorer - Dictionary Data Handling
 * This file handles all data loading and processing for the dictionary application.
 */

class DictionaryManager {
    constructor(config) {
      // Fix path to point one level up if needed
      this.dataPath = config.dataPath.startsWith('./') ? 
        '../' + config.dataPath.substring(2) : 
        config.dataPath;
      
      this.metadata = null;
      this.letterIndexes = {
        ruland: null,
        sommerhoff: null
      };
      this.loadedLetters = {
        ruland: {},
        sommerhoff: {}
      };
      this.currentSearch = null;
      this.failedRequests = {};
      this.symbols = null;
    }
  
    /**
     * Initialize the dictionary manager
     */
    async initialize() {
      try {
        this.metadata = await this.loadMetadata();
        
        // Optionally preload letter indexes
        try {
          this.letterIndexes.ruland = await this.loadLetterIndex('ruland');
          this.letterIndexes.sommerhoff = await this.loadLetterIndex('sommerhoff');
        } catch (e) {
          console.warn('Failed to preload letter indexes:', e);
        }
        
        // Load symbols data for Sommerhoff dictionary
        try {
          this.symbols = await this.loadSymbols();
        } catch (e) {
          console.warn('Failed to load symbols data:', e);
        }
        
        return this.metadata;
      } catch (error) {
        console.error('Failed to initialize dictionary manager:', error);
        // Create default metadata if failed to load
        this.metadata = this.createDefaultMetadata();
        return this.metadata;
      }
    }
  
    /**
     * Create default metadata as fallback
     */
    createDefaultMetadata() {
      return {
        ruland: {
          title: "Lexicon Alchemiae",
          author: "Martin Ruland",
          year: "1612",
          entryCount: 0,
          language: "Latin with German translations",
          description: "A comprehensive alchemical dictionary with scholarly notes."
        },
        sommerhoff: {
          title: "Lexicon pharmaceutico-chymicum",
          author: "Johann Sommerhoff",
          year: "1701",
          entryCount: 0,
          language: "Bilingual Latin-German",
          description: "A bilingual dictionary covering pharmaceutical, alchemical, and botanical terms."
        },
        generated: new Date().toISOString(),
        version: "1.0.0"
      };
    }
  
    /**
     * Load dictionary metadata
     */
    async loadMetadata() {
      try {
        // Attempt to load from the configured path
        let response = await fetch(`${this.dataPath}dictionary_metadata.json`);
        
        // If that fails, try alternative paths
        if (!response.ok) {
          console.warn(`Failed to load metadata from ${this.dataPath}. Trying alternative paths...`);
          
          // Try different relative paths
          const alternativePaths = [
            './output/dictionary_metadata.json',
            '../output/dictionary_metadata.json',
            '../../output/dictionary_metadata.json',
            '/output/dictionary_metadata.json'
          ];
          
          for (const path of alternativePaths) {
            try {
              response = await fetch(path);
              if (response.ok) {
                console.log(`Successfully loaded metadata from ${path}`);
                // Update the data path to use the successful path
                this.dataPath = path.substring(0, path.lastIndexOf('/') + 1);
                break;
              }
            } catch (e) {
              // Continue trying other paths
            }
          }
        }
        
        if (!response.ok) {
          throw new Error(`Failed to load metadata: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error loading metadata:', error);
        throw error;
      }
    }
  
    /**
     * Load symbols data for Sommerhoff dictionary
     */
    async loadSymbols() {
      try {
        const response = await fetch(`${this.dataPath}sommerhoff_symbols.json`);
        if (!response.ok) {
          throw new Error(`Failed to load symbols: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error loading symbols data:', error);
        return {}; // Return empty object as fallback
      }
    }
  
    /**
     * Get Unicode representation for a symbol
     */
    getSymbolUnicode(symbolId) {
      if (!this.symbols || !symbolId) return '';
      
      const symbol = this.symbols[symbolId];
      if (!symbol) return symbolId; // Return the ID if symbol not found
      
      // If Unicode point is available, try to use it
      if (symbol.unicode && symbol.unicode.startsWith('U+')) {
        try {
          return String.fromCodePoint(parseInt(symbol.unicode.substring(2), 16));
        } catch (e) {
          console.warn(`Failed to convert Unicode point ${symbol.unicode} for symbol ${symbolId}:`, e);
        }
      }
      
      // Fallback to symbol name or ID
      return symbol.name || symbolId;
    }
  
    /**
     * Load letter index for a dictionary
     */
    async loadLetterIndex(dictionary) {
      // Return cached index if available
      if (this.letterIndexes[dictionary]) {
        return this.letterIndexes[dictionary];
      }
      
      // Skip if we've already tried and failed
      if (this.failedRequests[`${dictionary}_letter_index`]) {
        return this.createEmptyLetterIndex();
      }
  
      try {
        const response = await fetch(`${this.dataPath}${dictionary}_letter_index.json`);
        if (!response.ok) {
          throw new Error(`Failed to load letter index: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        this.letterIndexes[dictionary] = data;
        return data;
      } catch (error) {
        console.error(`Error loading letter index for ${dictionary}:`, error);
        this.failedRequests[`${dictionary}_letter_index`] = true;
        
        // Return an empty letter index as fallback
        const emptyIndex = this.createEmptyLetterIndex();
        this.letterIndexes[dictionary] = emptyIndex;
        return emptyIndex;
      }
    }
    
    /**
     * Create an empty letter index as fallback
     */
    createEmptyLetterIndex() {
      const letters = {};
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
        letters[letter] = { count: 0, entries: [] };
      });
      
      return {
        letters: letters,
        totalEntries: 0
      };
    }
  
    /**
     * Load entries for a specific letter
     */
    async loadLetterEntries(dictionary, letter) {
      // Return cached entries if available
      if (this.loadedLetters[dictionary][letter]) {
        return this.loadedLetters[dictionary][letter];
      }
      
      // Skip if we've already tried and failed
      if (this.failedRequests[`${dictionary}_${letter}`]) {
        return { entries: [] };
      }
  
      try {
        const response = await fetch(`${this.dataPath}${dictionary}_index_${letter.toLowerCase()}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load letter entries: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Process the data to enhance entries if needed
        const enhancedData = {
          entries: this.enhanceEntries(data, dictionary)
        };
        
        this.loadedLetters[dictionary][letter] = enhancedData;
        return enhancedData;
      } catch (error) {
        console.error(`Error loading ${letter} entries for ${dictionary}:`, error);
        this.failedRequests[`${dictionary}_${letter}`] = true;
        
        // Return empty entries as fallback
        return { entries: [] };
      }
    }
    
    /**
     * Enhance entries with additional information
     */
    enhanceEntries(entries, dictionary) {
      if (!Array.isArray(entries)) return [];
      
      return entries.map(entry => {
        // Make a copy to avoid modifying the original
        const enhancedEntry = { ...entry };
        
        // Add letter information if not present
        if (!enhancedEntry.letter && enhancedEntry.lemma) {
          enhancedEntry.letter = enhancedEntry.lemma.charAt(0).toUpperCase();
        }
        
        // Process symbols for Sommerhoff entries if symbols data is available
        if (dictionary === 'sommerhoff' && this.symbols && enhancedEntry.symbols) {
          enhancedEntry.symbolsUnicode = enhancedEntry.symbols.map(symbolId => 
            this.getSymbolUnicode(symbolId)
          );
        }
        
        return enhancedEntry;
      });
    }
  
    /**
     * Get a specific entry by ID
     */
    async getEntry(dictionary, entryId) {
      if (!entryId) {
        throw new Error('Entry ID is required');
      }
      
      try {
        // First, we need to determine which letter this entry belongs to
        const letterIndex = await this.loadLetterIndex(dictionary);
        
        // Find the letter for this entry
        let targetLetter = null;
        for (const letter in letterIndex.letters) {
          const entries = letterIndex.letters[letter].entries;
          if (entries && entries.includes(entryId)) {
            targetLetter = letter;
            break;
          }
        }
    
        if (!targetLetter) {
          console.warn(`Entry ${entryId} not found in letter index. Trying to guess the letter.`);
          // Try to guess the letter from the ID (common format: dictionary_term_...)
          const parts = entryId.split('_');
          if (parts.length > 1) {
            targetLetter = parts[1].charAt(0).toUpperCase();
          }
        }
        
        if (!targetLetter) {
          throw new Error(`Cannot determine letter for entry ${entryId}`);
        }
    
        // Load the letter data if not already loaded
        const letterData = await this.loadLetterEntries(dictionary, targetLetter);
        
        // Find the specific entry
        const entry = letterData.entries.find(entry => entry.id === entryId);
        
        if (!entry) {
          throw new Error(`Entry ${entryId} not found in ${dictionary} dictionary`);
        }
        
        return entry;
      } catch (error) {
        console.error(`Error getting entry ${entryId}:`, error);
        
        // Return a placeholder entry as fallback
        return {
          id: entryId,
          lemma: 'Entry not found',
          letter: 'Unknown',
          definition: 'This entry could not be loaded.',
          source: dictionary
        };
      }
    }
  
    /**
     * Search for entries matching a term
     */
    async searchEntries(dictionary, term) {
      if (!term || term.trim() === '') {
        return [];
      }
      
      const searchTerm = term.toLowerCase().trim();
      
      try {
        const letterIndex = await this.loadLetterIndex(dictionary);
        const results = [];
        
        // Start with the letter that matches the first character of the search term
        const firstLetter = searchTerm.charAt(0).toUpperCase();
        if (letterIndex.letters[firstLetter]) {
          await this.searchInLetter(dictionary, firstLetter, searchTerm, results);
        }
        
        // If we don't have enough results, search in other letters
        if (results.length < 10) {
          for (const letter in letterIndex.letters) {
            if (letter !== firstLetter && letterIndex.letters[letter].count > 0) {
              await this.searchInLetter(dictionary, letter, searchTerm, results);
              if (results.length >= 20) break; // Limit search to 20 results
            }
          }
        }
        
        // Sort results by relevance (exact matches first, then partial matches)
        results.sort((a, b) => {
          const aExact = a.lemma.toLowerCase() === searchTerm;
          const bExact = b.lemma.toLowerCase() === searchTerm;
          
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          return a.lemma.localeCompare(b.lemma);
        });
        
        return results;
      } catch (error) {
        console.error(`Error searching for "${searchTerm}":`, error);
        return []; // Return empty results in case of error
      }
    }
    
    /**
     * Search within a specific letter
     */
    async searchInLetter(dictionary, letter, searchTerm, results) {
      try {
        const letterData = await this.loadLetterEntries(dictionary, letter);
        
        if (!letterData.entries || !Array.isArray(letterData.entries)) {
          console.warn(`No entries found for letter ${letter} in ${dictionary}`);
          return;
        }
        
        for (const entry of letterData.entries) {
          // Skip invalid entries
          if (!entry || !entry.lemma) continue;
          
          // Check if the lemma contains the search term
          if (entry.lemma.toLowerCase().includes(searchTerm)) {
            results.push(entry);
            continue;
          }
          
          // Check translations if available
          if (entry.translations && Array.isArray(entry.translations) && 
              entry.translations.some(t => t && t.toLowerCase().includes(searchTerm))) {
            results.push(entry);
            continue;
          }
          
          // Check German text if available (for Sommerhoff)
          if (entry.german_text && Array.isArray(entry.german_text) && 
              entry.german_text.some(t => t && t.toLowerCase().includes(searchTerm))) {
            results.push(entry);
            continue;
          }
          
          // Check definition if available (more expensive search)
          if (entry.definition && entry.definition.toLowerCase().includes(searchTerm)) {
            results.push(entry);
          }
        }
      } catch (error) {
        console.warn(`Error searching in letter ${letter}:`, error);
        // Continue with other letters even if one fails
      }
    }
    
    /**
     * Reset failed request tracking
     * Useful when you want to retry loading after failures
     */
    resetFailedRequests() {
      this.failedRequests = {};
    }
    
    /**
     * Clear cache for a specific dictionary
     */
    clearCache(dictionary) {
      if (dictionary) {
        this.loadedLetters[dictionary] = {};
        this.letterIndexes[dictionary] = null;
      } else {
        // Clear all caches if no dictionary specified
        this.loadedLetters = {
          ruland: {},
          sommerhoff: {}
        };
        this.letterIndexes = {
          ruland: null,
          sommerhoff: null
        };
      }
    }
  }
  
  // Create the dictionary manager instance
  const dictionaryManager = new DictionaryManager(config);