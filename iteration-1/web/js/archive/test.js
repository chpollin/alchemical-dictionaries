/**
 * Enhanced TEI-to-JSON Data Loader Test Script
 * 
 * This script thoroughly tests the data loader to ensure all JSON data
 * from the enhanced TEI-to-JSON converter is being loaded correctly.
 * 
 * Include this script after load-data.js but before other app scripts:
 * <script src="load-data.js"></script>
 * <script src="test-data-loader.js"></script>
 * <script src="app.js"></script>
 */

// Test configuration
const dataLoaderTests = {
  enabled: true,           // Set to false to disable tests
  verbose: true,           // Set to true for detailed logs
  testMetadata: true,      // Test dictionary metadata
  testLetterIndexes: true, // Test letter indexes
  testDocStructure: true,  // Test document structure
  testSymbols: true,       // Test symbol data
  testEntries: true,       // Test entry loading
  testReferences: true,    // Test cross-references
  testSearch: true,        // Test search functionality
  outputToDOM: true        // Create visual test report in page
};

// Test controller
const dataLoaderTestRunner = {
  results: {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    startTime: null,
    endTime: null,
    categories: {}
  },
  testQueue: [],
  
  /**
   * Initialize and run tests
   */
  async runTests() {
    if (!dataLoaderTests.enabled) {
      console.log('Data loader tests are disabled');
      return;
    }
    
    this.results.startTime = performance.now();
    console.log('=== ENHANCED TEI-to-JSON DATA LOADER TESTS ===');
    console.log('Starting tests...');
    
    // Check if dictionaryLoader exists
    if (!window.dictionaryLoader) {
      this.logError('DictionaryDataLoader not found. Ensure load-data.js is loaded before this script.');
      return;
    }
    
    try {
      // Initialize data loader if not already initialized
      if (!window.dictionaryLoader.initialized) {
        console.log('Initializing dictionary data loader for tests...');
        await window.dictionaryLoader.initialize();
      }
      
      // Run the tests in sequence
      console.log('\n=== Running Data Tests ===');
      
      if (dataLoaderTests.testMetadata) await this.testMetadata();
      if (dataLoaderTests.testLetterIndexes) await this.testLetterIndexes();
      if (dataLoaderTests.testDocStructure) await this.testDocumentStructure();
      if (dataLoaderTests.testSymbols) await this.testSymbols();
      if (dataLoaderTests.testEntries) await this.testEntries();
      if (dataLoaderTests.testReferences) await this.testReferences();
      if (dataLoaderTests.testSearch) await this.testSearch();
      
      // Complete the test run
      this.results.endTime = performance.now();
      this.reportResults();
      
      // Create visual report if enabled
      if (dataLoaderTests.outputToDOM) {
        this.createVisualReport();
      }
    } catch (error) {
      this.logError(`Unexpected test failure: ${error.message}`);
      console.error(error);
    }
  },
  
  /**
   * Test metadata loading
   */
  async testMetadata() {
    console.log('\n--- Testing Dictionary Metadata ---');
    this.initCategory('metadata');
    
    try {
      // Test metadata loading
      const metadata = await window.dictionaryLoader.loadMetadata();
      this.assert('metadata', 'Metadata object exists', !!metadata);
      
      if (metadata) {
        // Test Ruland metadata
        this.assert('metadata', 'Ruland metadata exists', !!metadata.ruland);
        
        if (metadata.ruland) {
          this.assert('metadata', 'Ruland title exists', !!metadata.ruland.title);
          this.assert('metadata', 'Ruland author exists', !!metadata.ruland.author);
          this.assert('metadata', 'Ruland year exists', !!metadata.ruland.year);
          
          // Enhanced metadata fields
          this.assert('metadata', 'Ruland structure data exists', !!metadata.ruland.structure);
          
          if (dataLoaderTests.verbose && metadata.ruland) {
            console.log(`  Ruland: ${metadata.ruland.title} (${metadata.ruland.year}) by ${metadata.ruland.author}`);
            console.log(`  Entry count: ${metadata.ruland.entryCount || 'N/A'}`);
            
            if (metadata.ruland.structure) {
              console.log(`  Structure: ${JSON.stringify(metadata.ruland.structure)}`);
            }
          }
        }
        
        // Test Sommerhoff metadata
        this.assert('metadata', 'Sommerhoff metadata exists', !!metadata.sommerhoff);
        
        if (metadata.sommerhoff) {
          this.assert('metadata', 'Sommerhoff title exists', !!metadata.sommerhoff.title);
          this.assert('metadata', 'Sommerhoff author exists', !!metadata.sommerhoff.author);
          this.assert('metadata', 'Sommerhoff year exists', !!metadata.sommerhoff.year);
          this.assert('metadata', 'Sommerhoff symbol count exists', 
            metadata.sommerhoff.symbols !== undefined);
          
          if (dataLoaderTests.verbose && metadata.sommerhoff) {
            console.log(`  Sommerhoff: ${metadata.sommerhoff.title} (${metadata.sommerhoff.year}) by ${metadata.sommerhoff.author}`);
            console.log(`  Entry count: ${metadata.sommerhoff.entryCount || 'N/A'}`);
            console.log(`  Symbol count: ${metadata.sommerhoff.symbols || 'N/A'}`);
            
            if (metadata.sommerhoff.structure) {
              console.log(`  Structure: ${JSON.stringify(metadata.sommerhoff.structure)}`);
            }
          }
        }
        
        // Test metadata version info
        this.assert('metadata', 'Metadata version exists', !!metadata.version);
        this.assert('metadata', 'Metadata generation timestamp exists', !!metadata.generated);
        
        // Test converter info
        if (metadata.converter) {
          this.assert('metadata', 'Converter name exists', !!metadata.converter.name);
          this.assert('metadata', 'Converter features list exists', 
            Array.isArray(metadata.converter.features));
          
          if (dataLoaderTests.verbose && metadata.converter) {
            console.log(`  Converter: ${metadata.converter.name} v${metadata.version}`);
            if (Array.isArray(metadata.converter.features)) {
              console.log(`  Features: ${metadata.converter.features.join(', ')}`);
            }
          }
        }
      }
    } catch (error) {
      this.logError(`Metadata test failed: ${error.message}`);
    }
  },
  
  /**
   * Test letter indexes
   */
  async testLetterIndexes() {
    console.log('\n--- Testing Letter Indexes ---');
    this.initCategory('letterIndexes');
    
    try {
      // Test Ruland letter index
      console.log('  Testing Ruland letter index...');
      const rulandIndex = await window.dictionaryLoader.loadLetterIndex('ruland');
      this.assert('letterIndexes', 'Ruland letter index exists', !!rulandIndex);
      this.assert('letterIndexes', 'Ruland letters object exists', !!rulandIndex.letters);
      
      if (rulandIndex && rulandIndex.letters) {
        const letterCount = Object.keys(rulandIndex.letters).length;
        this.assert('letterIndexes', 'Ruland has letter entries', letterCount > 0);
        this.assert('letterIndexes', 'Ruland has total entries count', rulandIndex.totalEntries > 0);
        
        // Find a letter with entries to test enhanced index structure
        let testLetter = null;
        for (const letter in rulandIndex.letters) {
          if (rulandIndex.letters[letter].count > 0) {
            testLetter = letter;
            break;
          }
        }
        
        if (testLetter) {
          this.assert('letterIndexes', 'Ruland letter has entries array', 
            Array.isArray(rulandIndex.letters[testLetter].entries));
          
          // Check entry structure
          if (Array.isArray(rulandIndex.letters[testLetter].entries) && 
              rulandIndex.letters[testLetter].entries.length > 0) {
            
            const sampleEntry = rulandIndex.letters[testLetter].entries[0];
            
            // Test if entries contain objects (enhanced) or just IDs (original)
            if (typeof sampleEntry === 'object') {
              this.assert('letterIndexes', 'Ruland letter index has enhanced entries', true);
              this.assert('letterIndexes', 'Ruland letter entry has id', !!sampleEntry.id);
              this.assert('letterIndexes', 'Ruland letter entry has lemma', !!sampleEntry.lemma);
            }
          }
        }
        
        if (dataLoaderTests.verbose) {
          console.log(`  Ruland has ${letterCount} letters with entries`);
          let totalEntries = 0;
          let lettersWithEntries = [];
          
          for (const letter in rulandIndex.letters) {
            const count = rulandIndex.letters[letter].count || 0;
            totalEntries += count;
            if (count > 0) lettersWithEntries.push(`${letter}(${count})`);
          }
          
          console.log(`  Total Ruland entries: ${totalEntries}`);
          console.log(`  Letters with entries: ${lettersWithEntries.join(', ')}`);
        }
      }
      
      // Test Sommerhoff letter index
      console.log('  Testing Sommerhoff letter index...');
      const sommerhoffIndex = await window.dictionaryLoader.loadLetterIndex('sommerhoff');
      this.assert('letterIndexes', 'Sommerhoff letter index exists', !!sommerhoffIndex);
      this.assert('letterIndexes', 'Sommerhoff letters object exists', !!sommerhoffIndex.letters);
      
      if (sommerhoffIndex && sommerhoffIndex.letters) {
        const letterCount = Object.keys(sommerhoffIndex.letters).length;
        this.assert('letterIndexes', 'Sommerhoff has letter entries', letterCount > 0);
        this.assert('letterIndexes', 'Sommerhoff has total entries count', sommerhoffIndex.totalEntries > 0);
        
        // Find a letter with entries to test enhanced index structure
        let testLetter = null;
        for (const letter in sommerhoffIndex.letters) {
          if (sommerhoffIndex.letters[letter].count > 0) {
            testLetter = letter;
            break;
          }
        }
        
        if (testLetter) {
          this.assert('letterIndexes', 'Sommerhoff letter has entries array', 
            Array.isArray(sommerhoffIndex.letters[testLetter].entries));
          
          // Check entry structure
          if (Array.isArray(sommerhoffIndex.letters[testLetter].entries) && 
              sommerhoffIndex.letters[testLetter].entries.length > 0) {
            
            const sampleEntry = sommerhoffIndex.letters[testLetter].entries[0];
            
            // Test if entries contain objects (enhanced) or just IDs (original)
            if (typeof sampleEntry === 'object') {
              this.assert('letterIndexes', 'Sommerhoff letter index has enhanced entries', true);
              this.assert('letterIndexes', 'Sommerhoff letter entry has id', !!sampleEntry.id);
              this.assert('letterIndexes', 'Sommerhoff letter entry has lemma', !!sampleEntry.lemma);
            }
          }
        }
        
        if (dataLoaderTests.verbose) {
          console.log(`  Sommerhoff has ${letterCount} letters with entries`);
          let totalEntries = 0;
          let lettersWithEntries = [];
          
          for (const letter in sommerhoffIndex.letters) {
            const count = sommerhoffIndex.letters[letter].count || 0;
            totalEntries += count;
            if (count > 0) lettersWithEntries.push(`${letter}(${count})`);
          }
          
          console.log(`  Total Sommerhoff entries: ${totalEntries}`);
          console.log(`  Letters with entries: ${lettersWithEntries.slice(0, 10).join(', ')}${
            lettersWithEntries.length > 10 ? '...' : ''}`);
        }
      }
      
      // Test search indexes
      try {
        console.log('  Testing search indexes...');
        const rulandSearchIndex = await window.dictionaryLoader.loadSearchIndex('ruland');
        this.assert('letterIndexes', 'Ruland search index exists', Array.isArray(rulandSearchIndex));
        this.assert('letterIndexes', 'Ruland search index has entries', 
          Array.isArray(rulandSearchIndex) && rulandSearchIndex.length > 0);
          
        const sommerhoffSearchIndex = await window.dictionaryLoader.loadSearchIndex('sommerhoff');
        this.assert('letterIndexes', 'Sommerhoff search index exists', Array.isArray(sommerhoffSearchIndex));
        this.assert('letterIndexes', 'Sommerhoff search index has entries', 
          Array.isArray(sommerhoffSearchIndex) && sommerhoffSearchIndex.length > 0);
          
        if (dataLoaderTests.verbose) {
          console.log(`  Ruland search index has ${rulandSearchIndex.length} entries`);
          console.log(`  Sommerhoff search index has ${sommerhoffSearchIndex.length} entries`);
        }
        
        // Test combined search index
        const combinedIndex = await window.dictionaryLoader.loadCombinedSearchIndex();
        this.assert('letterIndexes', 'Combined search index exists', Array.isArray(combinedIndex));
        
        if (dataLoaderTests.verbose && Array.isArray(combinedIndex)) {
          console.log(`  Combined search index has ${combinedIndex.length} entries`);
        }
      } catch (error) {
        this.logError(`Search index test failed: ${error.message}`);
      }
      
    } catch (error) {
      this.logError(`Letter index test failed: ${error.message}`);
    }
  },
  
  /**
   * Test document structure
   */
  async testDocumentStructure() {
    console.log('\n--- Testing Document Structure ---');
    this.initCategory('docStructure');
    
    try {
      // Test Ruland document structure
      console.log('  Testing Ruland document structure...');
      const rulandStructure = await window.dictionaryLoader.loadDocumentStructure('ruland');
      this.assert('docStructure', 'Ruland document structure exists', !!rulandStructure);
      
      if (rulandStructure) {
        // Test sections
        this.assert('docStructure', 'Ruland sections array exists', 
          Array.isArray(rulandStructure.sections));
          
        if (Array.isArray(rulandStructure.sections) && rulandStructure.sections.length > 0) {
          this.assert('docStructure', 'Ruland has document sections', rulandStructure.sections.length > 0);
          
          // Test section properties
          const sampleSection = rulandStructure.sections[0];
          this.assert('docStructure', 'Ruland section has id', !!sampleSection.id);
          this.assert('docStructure', 'Ruland section has type', !!sampleSection.type);
        }
        
        // Test pages
        this.assert('docStructure', 'Ruland pages object exists', !!rulandStructure.pages);
        
        if (rulandStructure.pages) {
          const pageCount = Object.keys(rulandStructure.pages).length;
          this.assert('docStructure', 'Ruland has page data', pageCount > 0);
          
          // Test page properties
          if (pageCount > 0) {
            const samplePageKey = Object.keys(rulandStructure.pages)[0];
            const samplePage = rulandStructure.pages[samplePageKey];
            
            this.assert('docStructure', 'Ruland page has id', !!samplePage.id);
            this.assert('docStructure', 'Ruland page has facs reference', 
              samplePage.facs !== undefined);
          }
        }
        
        // Test letters array
        this.assert('docStructure', 'Ruland letters array exists', 
          Array.isArray(rulandStructure.letters));
          
        if (Array.isArray(rulandStructure.letters)) {
          this.assert('docStructure', 'Ruland has letter markers', rulandStructure.letters.length > 0);
        }
        
        // Test headers/footers
        this.assert('docStructure', 'Ruland headers/footers object exists', 
          !!rulandStructure.headers_footers);
          
        if (dataLoaderTests.verbose) {
          console.log(`  Ruland has ${rulandStructure.sections.length} sections`);
          console.log(`  Ruland has ${Object.keys(rulandStructure.pages).length} pages`);
          console.log(`  Ruland has ${rulandStructure.letters.length} letter markers`);
        }
      }
      
      // Test Sommerhoff document structure
      console.log('  Testing Sommerhoff document structure...');
      const sommerhoffStructure = await window.dictionaryLoader.loadDocumentStructure('sommerhoff');
      this.assert('docStructure', 'Sommerhoff document structure exists', !!sommerhoffStructure);
      
      if (sommerhoffStructure) {
        // Test sections
        this.assert('docStructure', 'Sommerhoff sections array exists', 
          Array.isArray(sommerhoffStructure.sections));
          
        if (Array.isArray(sommerhoffStructure.sections) && sommerhoffStructure.sections.length > 0) {
          this.assert('docStructure', 'Sommerhoff has document sections', 
            sommerhoffStructure.sections.length > 0);
          
          // Test section properties
          const sampleSection = sommerhoffStructure.sections[0];
          this.assert('docStructure', 'Sommerhoff section has id', !!sampleSection.id);
          this.assert('docStructure', 'Sommerhoff section has type', !!sampleSection.type);
        }
        
        // Test pages
        this.assert('docStructure', 'Sommerhoff pages object exists', !!sommerhoffStructure.pages);
        
        if (sommerhoffStructure.pages) {
          const pageCount = Object.keys(sommerhoffStructure.pages).length;
          this.assert('docStructure', 'Sommerhoff has page data', pageCount > 0);
          
          // Test page properties
          if (pageCount > 0) {
            const samplePageKey = Object.keys(sommerhoffStructure.pages)[0];
            const samplePage = sommerhoffStructure.pages[samplePageKey];
            
            this.assert('docStructure', 'Sommerhoff page has id', !!samplePage.id);
            this.assert('docStructure', 'Sommerhoff page has facs reference', 
              samplePage.facs !== undefined);
          }
        }
        
        if (dataLoaderTests.verbose) {
          console.log(`  Sommerhoff has ${sommerhoffStructure.sections.length} sections`);
          console.log(`  Sommerhoff has ${Object.keys(sommerhoffStructure.pages).length} pages`);
          console.log(`  Sommerhoff has ${sommerhoffStructure.letters?.length || 0} letter markers`);
        }
      }
      
      // Test functionality to get page information
      try {
        console.log('  Testing page information retrieval...');
        // Find a valid page number from structure
        let testPageNumber = null;
        if (rulandStructure && rulandStructure.pages) {
          testPageNumber = Object.keys(rulandStructure.pages)[0];
        }
        
        if (testPageNumber) {
          const pageInfo = await window.dictionaryLoader.getPageInfo('ruland', testPageNumber);
          this.assert('docStructure', 'Page info retrieval works', !!pageInfo);
          
          if (pageInfo) {
            this.assert('docStructure', 'Page info has ID', !!pageInfo.id);
            this.assert('docStructure', 'Page info has page number', pageInfo.number !== undefined);
            
            if (dataLoaderTests.verbose) {
              console.log(`  Retrieved page info for Ruland page ${testPageNumber}:`, pageInfo);
            }
          }
        }
      } catch (error) {
        this.logError(`Page info test failed: ${error.message}`);
      }
    } catch (error) {
      this.logError(`Document structure test failed: ${error.message}`);
    }
  },
  
  /**
   * Test symbol data
   */
  async testSymbols() {
    console.log('\n--- Testing Symbol Data ---');
    this.initCategory('symbols');
    
    try {
      // Test symbols data
      console.log('  Testing Sommerhoff symbols...');
      const symbols = await window.dictionaryLoader.loadSymbols();
      this.assert('symbols', 'Symbols data exists', !!symbols);
      
      if (symbols) {
        const symbolCount = Object.keys(symbols).length;
        this.assert('symbols', 'Symbols data contains entries', symbolCount > 0);
        
        if (symbolCount > 0) {
          // Test a sample symbol
          const sampleSymbolId = Object.keys(symbols)[0];
          const sampleSymbol = symbols[sampleSymbolId];
          
          this.assert('symbols', 'Symbol has ID', !!sampleSymbol.id);
          this.assert('symbols', 'Symbol has name or description', 
            !!sampleSymbol.name || !!sampleSymbol.description);
          this.assert('symbols', 'Symbol has Unicode mapping', 
            sampleSymbol.unicode !== undefined);
            
          // Test enhanced symbol properties
          this.assert('symbols', 'Symbol has additional mappings field', 
            sampleSymbol.additional_mappings !== undefined);
          this.assert('symbols', 'Symbol has graphic field', 
            sampleSymbol.graphic !== undefined);
            
          // Test getSymbolUnicode function
          const unicodeChar = window.dictionaryLoader.getSymbolUnicode(sampleSymbolId);
          this.assert('symbols', 'getSymbolUnicode function works', !!unicodeChar);
          
          // Test getSymbolInfo function
          const symbolInfo = window.dictionaryLoader.getSymbolInfo(sampleSymbolId);
          this.assert('symbols', 'getSymbolInfo function works', !!symbolInfo);
          this.assert('symbols', 'getSymbolInfo returns complete data',
            symbolInfo.unicodeDisplay !== undefined);
        }
        
        // Test getAllSymbols function
        const symbolsPage = await window.dictionaryLoader.getAllSymbols({ limit: 10 });
        this.assert('symbols', 'getAllSymbols function works', !!symbolsPage);
        
        if (symbolsPage) {
          this.assert('symbols', 'getAllSymbols returns symbols array', 
            Array.isArray(symbolsPage.symbols));
          this.assert('symbols', 'getAllSymbols returns pagination data', 
            symbolsPage.total !== undefined && symbolsPage.page !== undefined);
            
          if (dataLoaderTests.verbose) {
            console.log(`  Found ${symbolsPage.total} symbol definitions`);
            console.log(`  Pagination: Page ${symbolsPage.page} of ${symbolsPage.totalPages}, limit ${symbolsPage.limit}`);
            
            // Check for unicode availability
            let unicodeCount = 0;
            for (const symbolId in symbols) {
              if (symbols[symbolId].unicode) {
                unicodeCount++;
              }
            }
            console.log(`  Symbols with Unicode mappings: ${unicodeCount} (${Math.round(unicodeCount/symbolCount*100)}%)`);
            
            // Sample a few symbols
            const sampleIds = Object.keys(symbols).slice(0, 3);
            for (const id of sampleIds) {
              const symbol = symbols[id];
              const unicodeDisplay = window.dictionaryLoader.getSymbolUnicode(id);
              console.log(`    ${id}: ${symbol.name || 'No name'} (Unicode: ${symbol.unicode || 'None'}) → ${unicodeDisplay}`);
            }
          }
        }
        
        // Test symbol tables if available
        try {
          const symbolTables = await window.dictionaryLoader.loadSymbolTables();
          this.assert('symbols', 'Symbol tables data exists', !!symbolTables);
          
          if (symbolTables && Array.isArray(symbolTables) && symbolTables.length > 0) {
            this.assert('symbols', 'Symbol tables contains entries', symbolTables.length > 0);
            
            if (dataLoaderTests.verbose) {
              console.log(`  Found ${symbolTables.length} symbol tables`);
              
              // Sample the first table
              if (symbolTables.length > 0) {
                const sampleTable = symbolTables[0];
                console.log(`    Table ID: ${sampleTable.id || 'N/A'}`);
                console.log(`    Table rows: ${sampleTable.rows?.length || 0}`);
              }
            }
          }
        } catch (error) {
          this.logInfo(`Symbol tables not available: ${error.message}`);
        }
        
        // Test getEntriesWithSymbol function if symbols exist
        if (symbolCount > 0) {
          const sampleSymbolId = Object.keys(symbols)[0];
          
          try {
            const entriesWithSymbol = await window.dictionaryLoader.getEntriesWithSymbol(sampleSymbolId, { limit: 5 });
            this.assert('symbols', 'getEntriesWithSymbol function works', Array.isArray(entriesWithSymbol));
            
            if (dataLoaderTests.verbose && Array.isArray(entriesWithSymbol)) {
              console.log(`  Found ${entriesWithSymbol.length} entries using symbol "${sampleSymbolId}"`);
              
              if (entriesWithSymbol.length > 0) {
                const sampleEntry = entriesWithSymbol[0];
                console.log(`    Example: "${sampleEntry.lemma}" (${sampleEntry.id})`);
              }
            }
          } catch (error) {
            this.logInfo(`Could not test getEntriesWithSymbol: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logError(`Symbol data test failed: ${error.message}`);
    }
  },
  
  /**
   * Test entry loading
   */
  async testEntries() {
    console.log('\n--- Testing Entry Loading ---');
    this.initCategory('entries');
    
    try {
      // Get letter indexes to find sample entries
      const rulandIndex = await window.dictionaryLoader.loadLetterIndex('ruland');
      const sommerhoffIndex = await window.dictionaryLoader.loadLetterIndex('sommerhoff');
      
      // Find a sample Ruland entry ID
      let rulandEntryId = null;
      if (rulandIndex && rulandIndex.letters) {
        // Find first letter with entries
        for (const letter in rulandIndex.letters) {
          if (rulandIndex.letters[letter].count > 0 && 
              rulandIndex.letters[letter].entries && 
              rulandIndex.letters[letter].entries.length > 0) {
            
            // Get first entry ID
            const firstEntry = rulandIndex.letters[letter].entries[0];
            if (typeof firstEntry === 'string') {
              rulandEntryId = firstEntry;
            } else if (typeof firstEntry === 'object' && firstEntry.id) {
              rulandEntryId = firstEntry.id;
            }
            
            if (rulandEntryId) break;
          }
        }
      }
      
      // Find a sample Sommerhoff entry ID
      let sommerhoffEntryId = null;
      if (sommerhoffIndex && sommerhoffIndex.letters) {
        // Find first letter with entries
        for (const letter in sommerhoffIndex.letters) {
          if (sommerhoffIndex.letters[letter].count > 0 && 
              sommerhoffIndex.letters[letter].entries && 
              sommerhoffIndex.letters[letter].entries.length > 0) {
            
            // Get first entry ID
            const firstEntry = sommerhoffIndex.letters[letter].entries[0];
            if (typeof firstEntry === 'string') {
              sommerhoffEntryId = firstEntry;
            } else if (typeof firstEntry === 'object' && firstEntry.id) {
              sommerhoffEntryId = firstEntry.id;
            }
            
            if (sommerhoffEntryId) break;
          }
        }
      }
      
      // Test Ruland entry loading
      if (rulandEntryId) {
        console.log(`  Testing Ruland entry loading for ID: ${rulandEntryId}`);
        
        const rulandEntry = await window.dictionaryLoader.getEntry('ruland', rulandEntryId);
        this.assert('entries', 'Ruland entry exists', !!rulandEntry);
        
        if (rulandEntry) {
          // Test basic entry properties
          this.assert('entries', 'Ruland entry has ID', !!rulandEntry.id);
          this.assert('entries', 'Ruland entry has lemma', !!rulandEntry.lemma);
          this.assert('entries', 'Ruland entry has letter', !!rulandEntry.letter);
          this.assert('entries', 'Ruland entry has source', rulandEntry.source === 'ruland');
          
          // Test enhanced entry properties
          this.assert('entries', 'Ruland entry has context data', !!rulandEntry.context);
          
          if (rulandEntry.context) {
            this.assert('entries', 'Ruland entry context has page data', 
              !!rulandEntry.context.page);
            this.assert('entries', 'Ruland entry context has section data', 
              !!rulandEntry.context.section);
          }
          
          this.assert('entries', 'Ruland entry has structural markers', 
            !!rulandEntry.structural_markers);
          this.assert('entries', 'Ruland entry has forms data', 
            Array.isArray(rulandEntry.forms));
          
          // Test form type distinction
          this.assert('entries', 'Ruland entry has lemma type', 
            !!rulandEntry.lemma_type);
            
          // Test explicit definitions vs sense distinction
          this.assert('entries', 'Ruland entry has explicit definitions array', 
            Array.isArray(rulandEntry.explicit_definitions));
          this.assert('entries', 'Ruland entry has sense texts array', 
            Array.isArray(rulandEntry.sense_texts));
            
          // Test notes structure
          if (Array.isArray(rulandEntry.notes) && rulandEntry.notes.length > 0) {
            this.assert('entries', 'Ruland entry has structured notes', true);
            
            // Check first note structure
            const firstNote = rulandEntry.notes[0];
            this.assert('entries', 'Ruland note has text', 
              typeof firstNote.text === 'string');
            this.assert('entries', 'Ruland note has number field', 
              firstNote.number !== undefined);
            this.assert('entries', 'Ruland note has translations array', 
              Array.isArray(firstNote.translations));
          }
          
          // Test translations structure
          if (Array.isArray(rulandEntry.translations) && rulandEntry.translations.length > 0) {
            this.assert('entries', 'Ruland entry has structured translations', true);
            
            // Check if translations are objects (enhanced) or strings (original)
            const firstTranslation = rulandEntry.translations[0];
            if (typeof firstTranslation === 'object') {
              this.assert('entries', 'Ruland translation has text', 
                typeof firstTranslation.text === 'string');
              this.assert('entries', 'Ruland translation has context field', 
                firstTranslation.context !== undefined);
              this.assert('entries', 'Ruland translation has style field', 
                firstTranslation.style !== undefined);
            }
          }
          
          // Test textual references
          this.assert('entries', 'Ruland entry has textual references array', 
            Array.isArray(rulandEntry.textual_references));
          
          if (dataLoaderTests.verbose) {
            console.log(`  Ruland entry "${rulandEntry.lemma}" (${rulandEntry.id}):`);
            console.log(`    Lemma type: ${rulandEntry.lemma_type}`);
            console.log(`    Definition: ${rulandEntry.definition?.substring(0, 50)}${rulandEntry.definition?.length > 50 ? '...' : ''}`);
            
            if (rulandEntry.context && rulandEntry.context.page) {
              console.log(`    Page: ${rulandEntry.context.page.n}`);
            }
            
            if (Array.isArray(rulandEntry.translations) && rulandEntry.translations.length > 0) {
              const translationText = typeof rulandEntry.translations[0] === 'string' ? 
                rulandEntry.translations[0] : 
                rulandEntry.translations[0].text;
              
              console.log(`    Translation: ${translationText}`);
            }
          }
        }
      } else {
        this.logWarning("Could not find a valid Ruland entry ID for testing");
      }
      
      // Test Sommerhoff entry loading
      if (sommerhoffEntryId) {
        console.log(`  Testing Sommerhoff entry loading for ID: ${sommerhoffEntryId}`);
        
        const sommerhoffEntry = await window.dictionaryLoader.getEntry('sommerhoff', sommerhoffEntryId);
        this.assert('entries', 'Sommerhoff entry exists', !!sommerhoffEntry);
        
        if (sommerhoffEntry) {
          // Test basic entry properties
          this.assert('entries', 'Sommerhoff entry has ID', !!sommerhoffEntry.id);
          this.assert('entries', 'Sommerhoff entry has lemma', !!sommerhoffEntry.lemma);
          this.assert('entries', 'Sommerhoff entry has letter', !!sommerhoffEntry.letter);
          this.assert('entries', 'Sommerhoff entry has source', sommerhoffEntry.source === 'sommerhoff');
          
          // Test enhanced entry properties
          this.assert('entries', 'Sommerhoff entry has context data', !!sommerhoffEntry.context);
          
          if (sommerhoffEntry.context) {
            this.assert('entries', 'Sommerhoff entry context has page data', 
              !!sommerhoffEntry.context.page);
            this.assert('entries', 'Sommerhoff entry context has section data', 
              !!sommerhoffEntry.context.section);
          }
          
          this.assert('entries', 'Sommerhoff entry has structural markers', 
            !!sommerhoffEntry.structural_markers);
          this.assert('entries', 'Sommerhoff entry has forms data', 
            Array.isArray(sommerhoffEntry.forms));
          
          // Test form type distinction
          this.assert('entries', 'Sommerhoff entry has lemma type', 
            !!sommerhoffEntry.lemma_type);
            
          // Test sense data structure
          this.assert('entries', 'Sommerhoff entry has sense data array', 
            Array.isArray(sommerhoffEntry.sense_data));
            
          if (Array.isArray(sommerhoffEntry.sense_data) && sommerhoffEntry.sense_data.length > 0) {
            const firstSense = sommerhoffEntry.sense_data[0];
            this.assert('entries', 'Sommerhoff sense has text', 
              typeof firstSense.text === 'string');
            this.assert('entries', 'Sommerhoff sense has symbols array', 
              Array.isArray(firstSense.symbols));
          }
          
          // Test German text structure
          this.assert('entries', 'Sommerhoff entry has German text array', 
            Array.isArray(sommerhoffEntry.german_text));
            
          if (Array.isArray(sommerhoffEntry.german_text) && sommerhoffEntry.german_text.length > 0) {
            // Check if German texts are objects (enhanced) or strings (original)
            const firstGerman = sommerhoffEntry.german_text[0];
            if (typeof firstGerman === 'object') {
              this.assert('entries', 'Sommerhoff German text has text field', 
                typeof firstGerman.text === 'string');
              this.assert('entries', 'Sommerhoff German text has pattern field', 
                firstGerman.pattern !== undefined);
              this.assert('entries', 'Sommerhoff German text has context field', 
                firstGerman.context !== undefined);
            }
          }
          
          // Test references structure
          this.assert('entries', 'Sommerhoff entry has references array', 
            Array.isArray(sommerhoffEntry.references));
            
          if (Array.isArray(sommerhoffEntry.references) && sommerhoffEntry.references.length > 0) {
            const firstRef = sommerhoffEntry.references[0];
            this.assert('entries', 'Sommerhoff reference has type', 
              typeof firstRef.type === 'string');
            this.assert('entries', 'Sommerhoff reference has target', 
              typeof firstRef.target === 'string');
            this.assert('entries', 'Sommerhoff reference has text', 
              typeof firstRef.text === 'string');
          }
          
          // Test symbols structure
          this.assert('entries', 'Sommerhoff entry has symbols array', 
            Array.isArray(sommerhoffEntry.symbols));
            
          if (Array.isArray(sommerhoffEntry.symbols) && sommerhoffEntry.symbols.length > 0) {
            // Check if symbols are objects (enhanced) or strings (original)
            const firstSymbol = sommerhoffEntry.symbols[0];
            if (typeof firstSymbol === 'object') {
              this.assert('entries', 'Sommerhoff symbol has id field', 
                typeof firstSymbol.id === 'string');
              this.assert('entries', 'Sommerhoff symbol has details field', 
                firstSymbol.details !== undefined);
              this.assert('entries', 'Sommerhoff symbol has context field', 
                firstSymbol.context !== undefined);
            }
          }
          
          if (dataLoaderTests.verbose) {
            console.log(`  Sommerhoff entry "${sommerhoffEntry.lemma}" (${sommerhoffEntry.id}):`);
            console.log(`    Lemma type: ${sommerhoffEntry.lemma_type}`);
            console.log(`    Definition: ${sommerhoffEntry.definition?.substring(0, 50)}${sommerhoffEntry.definition?.length > 50 ? '...' : ''}`);
            
            if (sommerhoffEntry.context && sommerhoffEntry.context.page) {
              console.log(`    Page: ${sommerhoffEntry.context.page.n}`);
            }
            
            if (Array.isArray(sommerhoffEntry.german_text) && sommerhoffEntry.german_text.length > 0) {
              const germanText = typeof sommerhoffEntry.german_text[0] === 'string' ? 
                sommerhoffEntry.german_text[0] : 
                sommerhoffEntry.german_text[0].text;
              
              console.log(`    German text: ${germanText}`);
            }
            
            if (Array.isArray(sommerhoffEntry.symbols) && sommerhoffEntry.symbols.length > 0) {
              const symbolsDisplay = sommerhoffEntry.symbols.map(s => 
                typeof s === 'string' ? s : s.id
              ).join(', ');
              
              console.log(`    Symbols: ${symbolsDisplay}`);
            }
          }
        }
      } else {
        this.logWarning("Could not find a valid Sommerhoff entry ID for testing");
      }
      
      // Test letter entries loading
      try {
        console.log('  Testing letter entries loading...');
        
        // Find a letter with entries in Ruland
        let testLetter = null;
        if (rulandIndex && rulandIndex.letters) {
          for (const letter in rulandIndex.letters) {
            if (rulandIndex.letters[letter].count > 0) {
              testLetter = letter;
              break;
            }
          }
        }
        
        if (testLetter) {
          const letterData = await window.dictionaryLoader.loadLetterEntries('ruland', testLetter);
          this.assert('entries', 'Letter entries loading works', !!letterData);
          
          if (letterData) {
            this.assert('entries', 'Letter data has entries array', 
              Array.isArray(letterData.entries));
            
            if (Array.isArray(letterData.entries) && letterData.entries.length > 0) {
              this.assert('entries', 'Letter entries contain expected count', 
                letterData.entries.length === rulandIndex.letters[testLetter].count);
              
              // Check entry structure
              const sampleEntry = letterData.entries[0];
              this.assert('entries', 'Letter entry has proper structure', 
                !!sampleEntry.id && !!sampleEntry.lemma);
            }
            
            if (dataLoaderTests.verbose) {
              console.log(`  Loaded ${letterData.entries.length} entries for Ruland letter ${testLetter}`);
              
              if (letterData.entries.length > 0) {
                const entrySample = letterData.entries[0];
                console.log(`    First entry: "${entrySample.lemma}" (${entrySample.id})`);
              }
            }
          }
        } else {
          this.logWarning("Could not find a letter with entries in Ruland");
        }
      } catch (error) {
        this.logError(`Letter entries loading test failed: ${error.message}`);
      }
      
      // Test page and section entry functions
      try {
        console.log('  Testing page and section entries functions...');
        
        // Find a valid page number
        let testPageNumber = null;
        if (rulandIndex && rulandIndex.letters) {
          // Try to get a page number from an entry context
          for (const letter in rulandIndex.letters) {
            if (rulandIndex.letters[letter].count > 0) {
              const letterData = await window.dictionaryLoader.loadLetterEntries('ruland', letter);
              
              if (letterData && Array.isArray(letterData.entries) && letterData.entries.length > 0) {
                for (const entry of letterData.entries) {
                  if (entry.context && entry.context.page && entry.context.page.n) {
                    testPageNumber = entry.context.page.n;
                    break;
                  }
                }
              }
              
              if (testPageNumber) break;
            }
          }
        }
        
        if (testPageNumber) {
          // Test getEntriesOnPage function
          const pageEntries = await window.dictionaryLoader.getEntriesOnPage('ruland', testPageNumber);
          this.assert('entries', 'getEntriesOnPage function works', Array.isArray(pageEntries));
          
          if (Array.isArray(pageEntries)) {
            this.assert('entries', 'Page has entries', pageEntries.length > 0);
            
            if (dataLoaderTests.verbose && pageEntries.length > 0) {
              console.log(`  Found ${pageEntries.length} entries on Ruland page ${testPageNumber}`);
              
              if (pageEntries.length > 0) {
                const entrySample = pageEntries[0];
                console.log(`    Sample entry: "${entrySample.lemma}" (${entrySample.id})`);
              }
            }
          }
        } else {
          this.logInfo("Could not find a valid page number for testing getEntriesOnPage");
        }
        
        // Find a valid section ID
        let testSectionId = null;
        if (rulandIndex && rulandIndex.letters) {
          // Try to get a section ID from an entry context
          for (const letter in rulandIndex.letters) {
            if (rulandIndex.letters[letter].count > 0) {
              const letterData = await window.dictionaryLoader.loadLetterEntries('ruland', letter);
              
              if (letterData && Array.isArray(letterData.entries) && letterData.entries.length > 0) {
                for (const entry of letterData.entries) {
                  if (entry.context && entry.context.section && entry.context.section.id) {
                    testSectionId = entry.context.section.id;
                    break;
                  }
                }
              }
              
              if (testSectionId) break;
            }
          }
        }
        
        if (testSectionId) {
          // Test getSectionInfo function
          const sectionInfo = await window.dictionaryLoader.getSectionInfo('ruland', testSectionId);
          this.assert('entries', 'getSectionInfo function works', !!sectionInfo);
          
          if (sectionInfo) {
            this.assert('entries', 'Section info has ID', sectionInfo.id === testSectionId);
            this.assert('entries', 'Section info has type', !!sectionInfo.type);
            
            if (dataLoaderTests.verbose) {
              console.log(`  Section info for ${testSectionId}:`, 
                { id: sectionInfo.id, type: sectionInfo.type, title: sectionInfo.title });
            }
          }
          
          // Test getEntriesInSection function
          const sectionEntries = await window.dictionaryLoader.getEntriesInSection('ruland', testSectionId);
          this.assert('entries', 'getEntriesInSection function works', Array.isArray(sectionEntries));
          
          if (Array.isArray(sectionEntries) && dataLoaderTests.verbose) {
            console.log(`  Found ${sectionEntries.length} entries in section ${testSectionId}`);
          }
        } else {
          this.logInfo("Could not find a valid section ID for testing section functions");
        }
      } catch (error) {
        this.logError(`Page/section functions test failed: ${error.message}`);
      }
    } catch (error) {
      this.logError(`Entry loading test failed: ${error.message}`);
    }
  },
  
  /**
   * Test cross-references
   */
  async testReferences() {
    console.log('\n--- Testing Cross-References ---');
    this.initCategory('references');
    
    try {
      // Try to load the reference network
      console.log('  Testing reference network...');
      const network = await window.dictionaryLoader.loadReferenceNetwork();
      
      this.assert('references', 'Reference network exists', !!network);
      
      if (network) {
        this.assert('references', 'Network has nodes array', Array.isArray(network.nodes));
        this.assert('references', 'Network has links array', Array.isArray(network.links));
        
        if (dataLoaderTests.verbose) {
          const nodeCount = Array.isArray(network.nodes) ? network.nodes.length : 0;
          const linkCount = Array.isArray(network.links) ? network.links.length : 0;
          
          console.log(`  Reference network has ${nodeCount} nodes and ${linkCount} links`);
          
          // Sample a few nodes
          if (nodeCount > 0) {
            console.log('  Sample network nodes:');
            for (let i = 0; i < Math.min(3, nodeCount); i++) {
              const node = network.nodes[i];
              console.log(`    - ${node.label} (${node.id})`);
            }
          }
          
          // Sample a few links
          if (linkCount > 0) {
            console.log('  Sample network links:');
            for (let i = 0; i < Math.min(3, linkCount); i++) {
              const link = network.links[i];
              console.log(`    - ${link.source} → ${link.target}`);
            }
          }
        }
      }
      
      // Test cross-reference functions using a sample entry
      console.log('  Testing cross-reference functions...');
      
      // Find an entry with references
      let testEntry = null;
      let testEntryDictionary = null;
      
      // Try Sommerhoff first as it has more explicit references
      try {
        const sommerhoffIndex = await window.dictionaryLoader.loadLetterIndex('sommerhoff');
        
        if (sommerhoffIndex && sommerhoffIndex.letters) {
          // Check a few letters for entries with references
          for (const letter in sommerhoffIndex.letters) {
            if (sommerhoffIndex.letters[letter].count > 0) {
              const letterData = await window.dictionaryLoader.loadLetterEntries('sommerhoff', letter);
              
              if (letterData && Array.isArray(letterData.entries)) {
                for (const entry of letterData.entries) {
                  if ((entry.references && entry.references.length > 0) || 
                      (entry.textual_references && entry.textual_references.length > 0)) {
                    testEntry = entry;
                    testEntryDictionary = 'sommerhoff';
                    break;
                  }
                }
              }
              
              if (testEntry) break;
            }
          }
        }
      } catch (error) {
        this.logWarning(`Failed to find Sommerhoff entry with references: ${error.message}`);
      }
      
      // If no Sommerhoff entry found, try Ruland
      if (!testEntry) {
        try {
          const rulandIndex = await window.dictionaryLoader.loadLetterIndex('ruland');
          
          if (rulandIndex && rulandIndex.letters) {
            // Check a few letters for entries with references
            for (const letter in rulandIndex.letters) {
              if (rulandIndex.letters[letter].count > 0) {
                const letterData = await window.dictionaryLoader.loadLetterEntries('ruland', letter);
                
                if (letterData && Array.isArray(letterData.entries)) {
                  for (const entry of letterData.entries) {
                    if (entry.textual_references && entry.textual_references.length > 0) {
                      testEntry = entry;
                      testEntryDictionary = 'ruland';
                      break;
                    }
                  }
                }
                
                if (testEntry) break;
              }
            }
          }
        } catch (error) {
          this.logWarning(`Failed to find Ruland entry with references: ${error.message}`);
        }
      }
      
      if (testEntry) {
        console.log(`  Found test entry "${testEntry.lemma}" with references in ${testEntryDictionary}`);
        
        // Test findCrossReferences function
        const references = await window.dictionaryLoader.findCrossReferences(testEntry);
        
        this.assert('references', 'findCrossReferences function works', !!references);
        
        if (references) {
          this.assert('references', 'References result has explicit array', 
            Array.isArray(references.explicit));
          this.assert('references', 'References result has implicit array', 
            Array.isArray(references.implicit));
          this.assert('references', 'References result has incoming array', 
            Array.isArray(references.incoming));
            
          if (dataLoaderTests.verbose) {
            console.log(`  Cross-references for entry "${testEntry.lemma}":`);
            console.log(`    Explicit: ${references.explicit.length}`);
            console.log(`    Implicit: ${references.implicit.length}`);
            console.log(`    Incoming: ${references.incoming.length}`);
            
            // Sample some references if available
            if (references.explicit.length > 0) {
              console.log('    Explicit reference examples:');
              for (let i = 0; i < Math.min(2, references.explicit.length); i++) {
                console.log(`      - ${references.explicit[i].text} (${references.explicit[i].targetId})`);
              }
            }
            
            if (references.implicit.length > 0) {
              console.log('    Implicit reference examples:');
              for (let i = 0; i < Math.min(2, references.implicit.length); i++) {
                console.log(`      - ${references.implicit[i].lemma} (${references.implicit[i].id})`);
              }
            }
            
            if (references.incoming.length > 0) {
              console.log('    Incoming reference examples:');
              for (let i = 0; i < Math.min(2, references.incoming.length); i++) {
                console.log(`      - ${references.incoming[i].lemma} (${references.incoming[i].id})`);
              }
            }
          }
        }
      } else {
        this.logWarning("Could not find entry with references for testing");
      }
    } catch (error) {
      this.logError(`Cross-references test failed: ${error.message}`);
    }
  },
  
  /**
   * Test search functionality
   */
  async testSearch() {
    console.log('\n--- Testing Search Functionality ---');
    this.initCategory('search');
    
    try {
      // Test basic search in Ruland
      console.log('  Testing Ruland search...');
      const rulandResults = await window.dictionaryLoader.searchEntries('ruland', 'water');
      
      this.assert('search', 'Ruland search returns results array', Array.isArray(rulandResults));
      
      if (Array.isArray(rulandResults)) {
        this.assert('search', 'Ruland search finds results', rulandResults.length > 0);
        
        if (rulandResults.length > 0) {
          const firstResult = rulandResults[0];
          this.assert('search', 'Ruland search result has ID', !!firstResult.id);
          this.assert('search', 'Ruland search result has lemma', !!firstResult.lemma);
          
          // Check for matchType in enhanced search
          this.assert('search', 'Ruland search result has match type', !!firstResult.matchType);
        }
        
        if (dataLoaderTests.verbose) {
          console.log(`  Found ${rulandResults.length} results for 'water' in Ruland`);
          
          if (rulandResults.length > 0) {
            console.log('  Sample results:');
            for (let i = 0; i < Math.min(3, rulandResults.length); i++) {
              const result = rulandResults[i];
              console.log(`    - ${result.lemma} (${result.id}) [${result.matchType || 'unknown'}]`);
            }
          }
        }
      }
      
      // Test basic search in Sommerhoff
      console.log('  Testing Sommerhoff search...');
      const sommerhoffResults = await window.dictionaryLoader.searchEntries('sommerhoff', 'mercury');
      
      this.assert('search', 'Sommerhoff search returns results array', Array.isArray(sommerhoffResults));
      
      if (Array.isArray(sommerhoffResults)) {
        this.assert('search', 'Sommerhoff search finds results', sommerhoffResults.length > 0);
        
        if (dataLoaderTests.verbose) {
          console.log(`  Found ${sommerhoffResults.length} results for 'mercury' in Sommerhoff`);
          
          if (sommerhoffResults.length > 0) {
            console.log('  Sample results:');
            for (let i = 0; i < Math.min(3, sommerhoffResults.length); i++) {
              const result = sommerhoffResults[i];
              console.log(`    - ${result.lemma} (${result.id}) [${result.matchType || 'unknown'}]`);
            }
          }
        }
      }
      
      // Test cross-dictionary search
      console.log('  Testing cross-dictionary search...');
      const crossResults = await window.dictionaryLoader.searchAcrossDictionaries('gold');
      
      this.assert('search', 'Cross-dictionary search returns results object', !!crossResults);
      
      if (crossResults) {
        this.assert('search', 'Cross-dictionary has Ruland results', Array.isArray(crossResults.ruland));
        this.assert('search', 'Cross-dictionary has Sommerhoff results', Array.isArray(crossResults.sommerhoff));
        this.assert('search', 'Cross-dictionary has combined results', Array.isArray(crossResults.combined));
        
        if (dataLoaderTests.verbose) {
          console.log(`  Cross-dictionary search results for 'gold':`);
          console.log(`    Ruland: ${crossResults.ruland.length} results`);
          console.log(`    Sommerhoff: ${crossResults.sommerhoff.length} results`);
          console.log(`    Combined: ${crossResults.combined.length} results`);
          
          if (crossResults.combined.length > 0) {
            console.log('  Sample combined results:');
            for (let i = 0; i < Math.min(3, crossResults.combined.length); i++) {
              const result = crossResults.combined[i];
              console.log(`    - ${result.lemma} (${result.source}) [${result.matchType || 'unknown'}]`);
            }
          }
        }
      }
      
      // Test advanced search options
      console.log('  Testing advanced search options...');
      
      // Test exact match search
      const exactResults = await window.dictionaryLoader.searchEntries('ruland', 'aqua', { 
        exactMatch: true, limit: 5 
      });
      
      this.assert('search', 'Exact match search works', Array.isArray(exactResults));
      
      if (Array.isArray(exactResults) && exactResults.length > 0) {
        this.assert('search', 'Exact match results are correct', 
          exactResults[0].lemma.toLowerCase() === 'aqua');
          
        if (dataLoaderTests.verbose) {
          console.log(`  Exact match search found ${exactResults.length} results for 'aqua'`);
          if (exactResults.length > 0) {
            console.log(`    First result: ${exactResults[0].lemma}`);
          }
        }
      }
      
      // Test definition search
      const defResults = await window.dictionaryLoader.searchEntries('sommerhoff', 'philosophical', { 
        includeDefinitions: true, limit: 5 
      });
      
      this.assert('search', 'Definition search works', Array.isArray(defResults));
      
      if (Array.isArray(defResults) && dataLoaderTests.verbose) {
        console.log(`  Definition search found ${defResults.length} results for 'philosophical'`);
      }
    } catch (error) {
      this.logError(`Search functionality test failed: ${error.message}`);
    }
  },
  
  /**
   * Initialize a test category
   */
  initCategory(category) {
    this.results.categories[category] = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      details: []
    };
  },
  
  /**
   * Assert a test condition
   */
  assert(category, description, condition) {
    this.results.total++;
    
    if (!this.results.categories[category]) {
      this.initCategory(category);
    }
    
    this.results.categories[category].total++;
    
    if (condition) {
      this.results.passed++;
      this.results.categories[category].passed++;
      
      if (dataLoaderTests.verbose) {
        console.log(`  ✅ PASS: ${description}`);
      }
    } else {
      this.results.failed++;
      this.results.categories[category].failed++;
      console.log(`  ❌ FAIL: ${description}`);
    }
    
    // Store test result
    this.results.categories[category].details.push({
      description,
      passed: condition
    });
    
    return condition;
  },
  
  /**
   * Log an error message
   */
  logError(message) {
    console.error(`ERROR: ${message}`);
  },
  
  /**
   * Log a warning message
   */
  logWarning(message) {
    console.warn(`WARNING: ${message}`);
  },
  
  /**
   * Log an info message
   */
  logInfo(message) {
    console.log(`INFO: ${message}`);
  },
  
  /**
   * Report test results to console
   */
  reportResults() {
    const duration = ((this.results.endTime - this.results.startTime) / 1000).toFixed(2);
    
    console.log('\n=== TEST RESULTS ===');
    console.log(`Tests completed in ${duration} seconds`);
    console.log(`Total tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} (${Math.round(this.results.passed / this.results.total * 100)}%)`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Skipped: ${this.results.skipped}`);
    
    console.log('\nCategory Results:');
    for (const category in this.results.categories) {
      const cat = this.results.categories[category];
      const percent = Math.round(cat.passed / cat.total * 100);
      const icon = cat.failed > 0 ? '❌' : '✅';
      
      console.log(`${icon} ${category}: ${cat.passed}/${cat.total} (${percent}%)`);
      
      if (cat.failed > 0) {
        console.log('  Failed tests:');
        
        cat.details.forEach(detail => {
          if (!detail.passed) {
            console.log(`  - ${detail.description}`);
          }
        });
      }
    }
    
    console.log('\n=== TEST SUMMARY ===');
    if (this.results.failed === 0) {
      console.log('✅ ALL TESTS PASSED');
    } else {
      console.log(`❌ ${this.results.failed} TESTS FAILED`);
    }
  },
  
  /**
   * Create a visual report in the DOM
   */
  createVisualReport() {
    // Create report container if it doesn't exist
    let reportContainer = document.getElementById('data-loader-test-report');
    
    if (!reportContainer) {
      reportContainer = document.createElement('div');
      reportContainer.id = 'data-loader-test-report';
      reportContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 320px;
        max-height: 80vh;
        overflow: auto;
        background: #fff;
        border: 1px solid #ddd;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        border-radius: 4px;
        padding: 15px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        z-index: 9999;
      `;
      
      document.body.appendChild(reportContainer);
    }
    
    // Create report content
    const duration = ((this.results.endTime - this.results.startTime) / 1000).toFixed(2);
    const percentPassed = Math.round(this.results.passed / this.results.total * 100);
    
    let reportHtml = `
      <h3 style="margin-top: 0; margin-bottom: 10px; color: #333;">
        Data Loader Test Results
      </h3>
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <div style="font-weight: bold; color: ${this.results.failed > 0 ? '#e74c3c' : '#2ecc71'}">
          ${this.results.failed > 0 ? '❌ FAILED' : '✅ PASSED'}
        </div>
        <div>${duration}s</div>
      </div>
      <div style="display: flex; margin-bottom: 15px;">
        <div style="flex: 1; text-align: center; padding: 5px; background: #f5f5f5; border-radius: 4px;">
          <div style="font-size: 18px; font-weight: bold;">${this.results.total}</div>
          <div style="font-size: 12px;">Total</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 5px; background: #edfaf1; margin: 0 5px; border-radius: 4px;">
          <div style="font-size: 18px; font-weight: bold; color: #2ecc71;">${this.results.passed}</div>
          <div style="font-size: 12px;">Passed</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 5px; background: ${this.results.failed > 0 ? '#fceeec' : '#f5f5f5'}; border-radius: 4px;">
          <div style="font-size: 18px; font-weight: bold; color: ${this.results.failed > 0 ? '#e74c3c' : '#999'};">${this.results.failed}</div>
          <div style="font-size: 12px;">Failed</div>
        </div>
      </div>
      
      <div style="height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 15px;">
        <div style="height: 100%; width: ${percentPassed}%; background: ${this.results.failed > 0 ? '#f39c12' : '#2ecc71'};"></div>
      </div>
      
      <h4 style="margin-top: 0; margin-bottom: 10px; color: #333;">Categories</h4>
      <div style="margin-bottom: 15px;">
    `;
    
    // Add category results
    for (const category in this.results.categories) {
      const cat = this.results.categories[category];
      const percent = Math.round(cat.passed / cat.total * 100);
      const icon = cat.failed > 0 ? '❌' : '✅';
      
      reportHtml += `
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-weight: ${cat.failed > 0 ? 'bold' : 'normal'};">
            <div>${icon} ${category}</div>
            <div>${cat.passed}/${cat.total} (${percent}%)</div>
          </div>
      `;
      
      if (cat.failed > 0) {
        reportHtml += `<div style="margin-top: 5px; border-left: 2px solid #e74c3c; padding-left: 8px; font-size: 12px;">`;
        
        cat.details.forEach(detail => {
          if (!detail.passed) {
            reportHtml += `<div style="margin-bottom: 3px; color: #e74c3c;">- ${detail.description}</div>`;
          }
        });
        
        reportHtml += `</div>`;
      }
      
      reportHtml += `</div>`;
    }
    
    // Add close button
    reportHtml += `
        </div>
        <div style="text-align: center;">
          <button id="close-test-report" style="
            padding: 5px 10px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
          ">Close Report</button>
        </div>
      `;
    
    reportContainer.innerHTML = reportHtml;
    
    // Add close button handler
    document.getElementById('close-test-report')?.addEventListener('click', () => {
      reportContainer.remove();
    });
  }
};

// Run the tests when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Wait a moment to let the app initialize first
  setTimeout(() => {
    dataLoaderTestRunner.runTests();
  }, 500);
});