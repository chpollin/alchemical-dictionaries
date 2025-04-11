/**
 * Alchemical Dictionaries Explorer - Test Script
 * This script tests data loading and verifies the integrity of all dictionary files.
 * 
 * Usage: 
 * 1. Include this script after dictionary.js but before app.js in index.html
 * 2. Set testConfig.runTests = true to enable tests
 * 3. Check the console for test results
 */

const testConfig = {
    runTests: true,         // Set to true to run tests
    verbose: true,          // Set to true for detailed logs
    testMetadata: true,     // Test dictionary metadata
    testLetterIndexes: true, // Test letter indexes
    testEntries: true,      // Test entries for each letter
    testSymbols: true,      // Test symbols for Sommerhoff
    testSearch: true        // Test search functionality
  };
  
  // Create test manager
  const testManager = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    
    // Test results for each category
    results: {
      metadata: { status: 'pending', details: [] },
      letterIndexes: { status: 'pending', details: [] },
      entries: { status: 'pending', details: [] },
      symbols: { status: 'pending', details: [] },
      search: { status: 'pending', details: [] }
    },
    
    // Start timestamp
    startTime: null,
    
    // Initialize tests
    async runTests() {
      if (!testConfig.runTests) {
        console.log('Dictionary tests are disabled. Set testConfig.runTests = true to enable.');
        return;
      }
      
      this.startTime = performance.now();
      console.log('=== ALCHEMICAL DICTIONARIES EXPLORER - TEST SUITE ===');
      console.log('Starting tests...');
      
      try {
        // Wait for dictionary manager to initialize
        if (!dictionaryManager) {
          throw new Error('Dictionary manager not found. Make sure to include this script after dictionary.js');
        }
        
        await dictionaryManager.initialize();
        
        // Run tests
        if (testConfig.testMetadata) await this.testMetadata();
        if (testConfig.testLetterIndexes) await this.testLetterIndexes();
        if (testConfig.testEntries) await this.testEntries();
        if (testConfig.testSymbols) await this.testSymbols();
        if (testConfig.testSearch) await this.testSearch();
        
        // Report results
        this.reportResults();
      } catch (error) {
        console.error('Test suite failed:', error);
        console.log('=== TEST SUITE FAILED ===');
      }
    },
    
    // Test dictionary metadata
    async testMetadata() {
      console.log('\n--- Testing Dictionary Metadata ---');
      this.results.metadata.details = [];
      
      try {
        // Check if metadata exists
        const metadata = dictionaryManager.metadata;
        this.assert('Metadata object exists', !!metadata, 'metadata');
        
        // Check ruland metadata
        if (metadata) {
          this.assert('Ruland metadata exists', !!metadata.ruland, 'metadata');
          if (metadata.ruland) {
            this.assert('Ruland title exists', !!metadata.ruland.title, 'metadata');
            this.assert('Ruland author exists', !!metadata.ruland.author, 'metadata');
            this.assert('Ruland year exists', !!metadata.ruland.year, 'metadata');
            
            if (testConfig.verbose) {
              console.log(`  Ruland Dictionary: ${metadata.ruland.title} (${metadata.ruland.year})`);
              console.log(`  Author: ${metadata.ruland.author}`);
            }
          }
          
          // Check sommerhoff metadata
          this.assert('Sommerhoff metadata exists', !!metadata.sommerhoff, 'metadata');
          if (metadata.sommerhoff) {
            this.assert('Sommerhoff title exists', !!metadata.sommerhoff.title, 'metadata');
            this.assert('Sommerhoff author exists', !!metadata.sommerhoff.author, 'metadata');
            this.assert('Sommerhoff year exists', !!metadata.sommerhoff.year, 'metadata');
            
            if (testConfig.verbose) {
              console.log(`  Sommerhoff Dictionary: ${metadata.sommerhoff.title} (${metadata.sommerhoff.year})`);
              console.log(`  Author: ${metadata.sommerhoff.author}`);
            }
          }
        }
        
        this.results.metadata.status = this.results.metadata.details.every(d => d.passed) ? 'passed' : 'failed';
      } catch (error) {
        console.error('Metadata test failed:', error);
        this.results.metadata.status = 'error';
        this.results.metadata.error = error.message;
      }
    },
    
    // Test letter indexes
    async testLetterIndexes() {
      console.log('\n--- Testing Letter Indexes ---');
      this.results.letterIndexes.details = [];
      
      try {
        // Test Ruland letter index
        console.log('  Testing Ruland letter index...');
        const rulandIndex = await dictionaryManager.loadLetterIndex('ruland');
        this.assert('Ruland letter index exists', !!rulandIndex, 'letterIndexes');
        this.assert('Ruland letters object exists', !!rulandIndex.letters, 'letterIndexes');
        
        if (rulandIndex && rulandIndex.letters) {
          const letterCount = Object.keys(rulandIndex.letters).length;
          this.assert('Ruland has letter entries', letterCount > 0, 'letterIndexes');
          
          if (testConfig.verbose) {
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
        const sommerhoffIndex = await dictionaryManager.loadLetterIndex('sommerhoff');
        this.assert('Sommerhoff letter index exists', !!sommerhoffIndex, 'letterIndexes');
        this.assert('Sommerhoff letters object exists', !!sommerhoffIndex.letters, 'letterIndexes');
        
        if (sommerhoffIndex && sommerhoffIndex.letters) {
          const letterCount = Object.keys(sommerhoffIndex.letters).length;
          this.assert('Sommerhoff has letter entries', letterCount > 0, 'letterIndexes');
          
          if (testConfig.verbose) {
            console.log(`  Sommerhoff has ${letterCount} letters with entries`);
            let totalEntries = 0;
            let lettersWithEntries = [];
            
            for (const letter in sommerhoffIndex.letters) {
              const count = sommerhoffIndex.letters[letter].count || 0;
              totalEntries += count;
              if (count > 0) lettersWithEntries.push(`${letter}(${count})`);
            }
            
            console.log(`  Total Sommerhoff entries: ${totalEntries}`);
            console.log(`  Letters with entries: ${lettersWithEntries.join(', ')}`);
          }
        }
        
        this.results.letterIndexes.status = this.results.letterIndexes.details.every(d => d.passed) ? 'passed' : 'failed';
      } catch (error) {
        console.error('Letter index test failed:', error);
        this.results.letterIndexes.status = 'error';
        this.results.letterIndexes.error = error.message;
      }
    },
    
    // Test entries for each letter
    async testEntries() {
      console.log('\n--- Testing Dictionary Entries ---');
      this.results.entries.details = [];
      
      try {
        const dictionaries = ['ruland', 'sommerhoff'];
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        
        for (const dictionary of dictionaries) {
          console.log(`  Testing ${dictionary} entries...`);
          
          // Get letter index
          const letterIndex = await dictionaryManager.loadLetterIndex(dictionary);
          if (!letterIndex || !letterIndex.letters) {
            this.assert(`${dictionary} letter index is valid`, false, 'entries');
            continue;
          }
          
          let totalTestedEntries = 0;
          let entriesWithDefinitions = 0;
          let entriesWithTranslations = 0;
          
          // Test each letter with entries
          for (const letter of alphabet) {
            if (!letterIndex.letters[letter] || letterIndex.letters[letter].count === 0) {
              continue; // Skip letters with no entries
            }
            
            const count = letterIndex.letters[letter].count;
            console.log(`    Testing ${letter} entries (${count} expected)...`);
            
            // Load entries for this letter
            const letterData = await dictionaryManager.loadLetterEntries(dictionary, letter);
            
            // Verify entries
            this.assert(`${dictionary} ${letter} entries exist`, !!letterData && !!letterData.entries, 'entries');
            
            if (letterData && letterData.entries) {
              const entriesCount = letterData.entries.length;
              this.assert(`${dictionary} ${letter} has correct entry count`, entriesCount === count, 'entries');
              
              totalTestedEntries += entriesCount;
              
              // Sample a few entries for detailed testing
              const samplesToTest = Math.min(3, entriesCount);
              for (let i = 0; i < samplesToTest; i++) {
                const sampleIndex = Math.floor(i * entriesCount / samplesToTest);
                const entry = letterData.entries[sampleIndex];
                
                this.assert(`${dictionary} ${letter} sample entry ${i+1} has id`, !!entry && !!entry.id, 'entries');
                this.assert(`${dictionary} ${letter} sample entry ${i+1} has lemma`, !!entry && !!entry.lemma, 'entries');
                
                if (entry && entry.definition) entriesWithDefinitions++;
                if (entry && (
                    (entry.translations && entry.translations.length > 0) || 
                    (entry.german_text && entry.german_text.length > 0)
                  )) {
                  entriesWithTranslations++;
                }
              }
            }
          }
          
          console.log(`    ${dictionary} total tested entries: ${totalTestedEntries}`);
          console.log(`    ${dictionary} entries with definitions: ${entriesWithDefinitions}`);
          console.log(`    ${dictionary} entries with translations: ${entriesWithTranslations}`);
        }
        
        this.results.entries.status = this.results.entries.details.every(d => d.passed) ? 'passed' : 'failed';
      } catch (error) {
        console.error('Entries test failed:', error);
        this.results.entries.status = 'error';
        this.results.entries.error = error.message;
      }
    },
    
    // Test symbols for Sommerhoff
    async testSymbols() {
      console.log('\n--- Testing Alchemical Symbols ---');
      this.results.symbols.details = [];
      
      try {
        // Check if symbols are loaded
        const symbols = dictionaryManager.symbols;
        this.assert('Symbols data exists', !!symbols, 'symbols');
        
        if (symbols) {
          const symbolCount = Object.keys(symbols).length;
          this.assert('Symbols data contains entries', symbolCount > 0, 'symbols');
          
          if (testConfig.verbose) {
            console.log(`  Found ${symbolCount} symbol definitions`);
            
            // Check for unicode availability
            let unicodeCount = 0;
            for (const symbolId in symbols) {
              if (symbols[symbolId].unicode) {
                unicodeCount++;
              }
            }
            console.log(`  Symbols with Unicode mappings: ${unicodeCount} (${Math.round(unicodeCount/symbolCount*100)}%)`);
            
            // Sample a few symbols
            console.log('  Symbol samples:');
            const sampleKeys = Object.keys(symbols).slice(0, 5);
            for (const key of sampleKeys) {
              const symbol = symbols[key];
              console.log(`    ${key}: ${symbol.name || 'No name'} (Unicode: ${symbol.unicode || 'None'})`);
            }
          }
          
          // Test symbol rendering
          if (typeof dictionaryManager.getSymbolUnicode === 'function') {
            this.assert('Symbol rendering function exists', true, 'symbols');
            
            // Try rendering a few symbols
            for (const symbolId in symbols) {
              const rendered = dictionaryManager.getSymbolUnicode(symbolId);
              if (rendered) {
                this.assert(`Symbol '${symbolId}' renders correctly`, !!rendered, 'symbols');
                if (testConfig.verbose) {
                  console.log(`  Symbol '${symbolId}' renders as: ${rendered}`);
                }
                break; // Just test one symbol in detail
              }
            }
          } else {
            this.assert('Symbol rendering function exists', false, 'symbols');
          }
        }
        
        this.results.symbols.status = this.results.symbols.details.every(d => d.passed) ? 'passed' : 'failed';
      } catch (error) {
        console.error('Symbols test failed:', error);
        this.results.symbols.status = 'error';
        this.results.symbols.error = error.message;
      }
    },
    
    // Test search functionality
    async testSearch() {
      console.log('\n--- Testing Search Functionality ---');
      this.results.search.details = [];
      
      try {
        const searchTerms = ['mercury', 'gold', 'alchemical', 'water']; 
        
        for (const dictionary of ['ruland', 'sommerhoff']) {
          for (const term of searchTerms) {
            console.log(`  Searching for '${term}' in ${dictionary} dictionary...`);
            
            const results = await dictionaryManager.searchEntries(dictionary, term);
            this.assert(`${dictionary} search for '${term}' returns results array`, Array.isArray(results), 'search');
            
            if (Array.isArray(results)) {
              console.log(`    Found ${results.length} results for '${term}'`);
              
              // Check results structure
              if (results.length > 0) {
                const firstResult = results[0];
                this.assert(`${dictionary} search result has id`, !!firstResult.id, 'search');
                this.assert(`${dictionary} search result has lemma`, !!firstResult.lemma, 'search');
                
                if (testConfig.verbose && results.length > 0) {
                  console.log('    First few results:');
                  const samplesToShow = Math.min(3, results.length);
                  for (let i = 0; i < samplesToShow; i++) {
                    const result = results[i];
                    console.log(`      ${result.lemma} (${result.id})`);
                  }
                }
              }
            }
          }
        }
        
        this.results.search.status = this.results.search.details.every(d => d.passed) ? 'passed' : 'failed';
      } catch (error) {
        console.error('Search test failed:', error);
        this.results.search.status = 'error';
        this.results.search.error = error.message;
      }
    },
    
    // Assert helper
    assert(description, condition, category) {
      this.totalTests++;
      
      if (condition) {
        this.passedTests++;
        if (testConfig.verbose) {
          console.log(`  ✅ PASS: ${description}`);
        }
      } else {
        this.failedTests++;
        console.log(`  ❌ FAIL: ${description}`);
      }
      
      // Store test result
      if (this.results[category]) {
        this.results[category].details.push({
          description,
          passed: condition
        });
      }
      
      return condition;
    },
    
    // Report test results
    reportResults() {
      const endTime = performance.now();
      const duration = ((endTime - this.startTime) / 1000).toFixed(2);
      
      console.log('\n=== TEST RESULTS ===');
      console.log(`Tests completed in ${duration} seconds`);
      console.log(`Total tests: ${this.totalTests}`);
      console.log(`Passed: ${this.passedTests}`);
      console.log(`Failed: ${this.failedTests}`);
      
      console.log('\nCategory Results:');
      for (const category in this.results) {
        const result = this.results[category];
        const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
        console.log(`${icon} ${category}: ${result.status}`);
        
        if (result.status === 'failed' || result.status === 'error') {
          if (result.error) {
            console.log(`  Error: ${result.error}`);
          }
          
          const failures = result.details.filter(d => !d.passed);
          if (failures.length > 0) {
            console.log('  Failed assertions:');
            failures.forEach(f => console.log(`    - ${f.description}`));
          }
        }
      }
      
      console.log('\n=== TEST SUMMARY ===');
      if (this.failedTests === 0) {
        console.log('✅ ALL TESTS PASSED');
      } else {
        console.log(`❌ ${this.failedTests} TESTS FAILED`);
      }
    }
  };
  
  // Run tests if enabled
  document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment to let the app initialize first
    setTimeout(() => {
      testManager.runTests();
    }, 500);
  });