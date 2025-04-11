/**
 * Alchemical Dictionaries Explorer - Main Application Logic
 * This file handles the user interface and interactions.
 */

// Application state
const appState = {
    currentDictionary: config.defaultDictionary || 'ruland',
    currentLetter: null,
    currentEntry: null,
    isLoading: false,
    searchResults: [],
    lastError: null
  };
  
  // DOM Elements
  const elements = {
    rulandBtn: document.getElementById('ruland-btn'),
    sommerhoffBtn: document.getElementById('sommerhoff-btn'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    dictionaryInfo: document.getElementById('dictionary-info'),
    letterNav: document.getElementById('letter-nav'),
    entriesHeading: document.getElementById('entries-heading'),
    entryList: document.getElementById('entry-list'),
    entryDetail: document.getElementById('entry-detail'),
    comparisonView: document.getElementById('comparison-view'),
    rulandComparisonContent: document.getElementById('ruland-comparison-content'),
    sommerhoffComparisonContent: document.getElementById('sommerhoff-comparison-content'),
    closeComparisonBtn: document.getElementById('close-comparison-btn'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingMessage: document.getElementById('loading-message'),
    errorMessage: document.getElementById('error-message'),
    errorText: document.getElementById('error-text'),
    errorCloseBtn: document.getElementById('error-close-btn')
  };
  
  /**
   * Initialize the application
   */
  async function initializeApp() {
    try {
      showLoading('Initializing application...');
      
      // Initialize the dictionary manager
      await dictionaryManager.initialize();
      
      // Set up event listeners
      setupEventListeners();
      
      // Load initial dictionary data
      await switchDictionary(appState.currentDictionary);
      
      hideLoading();
    } catch (error) {
      console.error('Failed to initialize application:', error);
      appState.lastError = error;
      showError('Failed to initialize application. Please check your connection and try again.');
    }
  }
  
  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Dictionary toggle buttons
    elements.rulandBtn.addEventListener('click', () => switchDictionary('ruland'));
    elements.sommerhoffBtn.addEventListener('click', () => switchDictionary('sommerhoff'));
    
    // Search
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
    
    // Close comparison view
    elements.closeComparisonBtn.addEventListener('click', hideComparisonView);
    
    // Close error message
    elements.errorCloseBtn.addEventListener('click', hideError);
  }
  
  /**
   * Switch between dictionaries
   */
  async function switchDictionary(dictionary) {
    if (appState.currentDictionary === dictionary && appState.isLoading) return;
    
    try {
      showLoading(`Loading ${dictionary} dictionary...`);
      
      // Update button states
      updateDictionaryToggle(dictionary);
      
      // Update app state
      appState.currentDictionary = dictionary;
      appState.currentLetter = null;
      appState.currentEntry = null;
      
      // Load letter index and update UI
      await updateLetterNavigation();
      
      // Update dictionary info
      updateDictionaryInfo();
      
      // Clear entry displays
      clearEntryList();
      clearEntryDetail();
      
      hideLoading();
    } catch (error) {
      console.error(`Failed to switch to ${dictionary} dictionary:`, error);
      appState.lastError = error;
      showError(`Failed to load ${dictionary} dictionary. Please try again.`);
    }
  }
  
  /**
   * Update the dictionary toggle buttons
   */
  function updateDictionaryToggle(dictionary) {
    elements.rulandBtn.classList.toggle('active', dictionary === 'ruland');
    elements.rulandBtn.setAttribute('aria-pressed', dictionary === 'ruland');
    
    elements.sommerhoffBtn.classList.toggle('active', dictionary === 'sommerhoff');
    elements.sommerhoffBtn.setAttribute('aria-pressed', dictionary === 'sommerhoff');
  }
  
  /**
   * Update the letter navigation
   */
  async function updateLetterNavigation() {
    try {
      // Clear existing letter navigation
      elements.letterNav.innerHTML = '';
      
      // Create temporary element for letter loading message
      const loadingEl = document.createElement('div');
      loadingEl.className = 'loading';
      loadingEl.textContent = 'Loading letter index...';
      elements.letterNav.appendChild(loadingEl);
      
      // Load letter index
      const letterIndex = await dictionaryManager.loadLetterIndex(appState.currentDictionary);
      
      // Remove loading message
      elements.letterNav.innerHTML = '';
      
      if (!letterIndex || !letterIndex.letters) {
        elements.letterNav.innerHTML = '<div class="error">Letter index is not available</div>';
        return;
      }
      
      // Create letter buttons
      for (const letter in letterIndex.letters) {
        const letterData = letterIndex.letters[letter];
        const count = letterData && letterData.count ? letterData.count : 0;
        
        // Skip letters with no entries
        if (count === 0) continue;
        
        const button = document.createElement('button');
        button.className = 'letter-btn';
        button.setAttribute('data-letter', letter);
        button.textContent = letter;
        button.title = `${letter}: ${count} entries`;
        
        button.addEventListener('click', () => selectLetter(letter));
        
        elements.letterNav.appendChild(button);
      }
      
      // If no letters were added (empty dictionary), show a message
      if (elements.letterNav.children.length === 0) {
        elements.letterNav.innerHTML = '<div class="empty-state">No entries available in this dictionary</div>';
      }
    } catch (error) {
      console.error('Failed to update letter navigation:', error);
      appState.lastError = error;
      elements.letterNav.innerHTML = '<div class="error">Failed to load letter index</div>';
    }
  }
  
  /**
   * Update dictionary info section
   */
  function updateDictionaryInfo() {
    if (!dictionaryManager.metadata) {
      elements.dictionaryInfo.innerHTML = '<div class="error">Dictionary information not available</div>';
      return;
    }
    
    const dictionary = appState.currentDictionary;
    const info = dictionaryManager.metadata[dictionary];
    
    if (!info) {
      elements.dictionaryInfo.innerHTML = '<div class="empty-state">No information available for this dictionary</div>';
      return;
    }
    
    elements.dictionaryInfo.innerHTML = `
      <h3>${sanitizeHTML(info.title || 'Unknown Dictionary')}</h3>
      <p>${sanitizeHTML(info.author || 'Unknown Author')}, ${info.year || 'Unknown Year'}</p>
      <p>Contains ${info.entryCount ? info.entryCount.toLocaleString() : 'an unknown number of'} alchemical terms</p>
      ${info.description ? `<p class="description">${sanitizeHTML(info.description)}</p>` : ''}
    `;
  }
  
  /**
   * Select a letter to display entries
   */
  async function selectLetter(letter) {
    if (appState.currentLetter === letter && !appState.isLoading) return;
    
    try {
      showLoading(`Loading entries for letter ${letter}...`);
      
      // Update letter button states
      updateLetterButtons(letter);
      
      // Update app state
      appState.currentLetter = letter;
      appState.currentEntry = null;
      
      // Load letter entries
      const letterData = await dictionaryManager.loadLetterEntries(appState.currentDictionary, letter);
      
      // Update UI
      displayLetterEntries(letterData, letter);
      clearEntryDetail();
      
      hideLoading();
    } catch (error) {
      console.error(`Failed to load entries for letter ${letter}:`, error);
      appState.lastError = error;
      showError(`Failed to load entries for letter ${letter}. Please try again.`);
    }
  }
  
  /**
   * Update letter button states
   */
  function updateLetterButtons(selectedLetter) {
    const letterButtons = elements.letterNav.querySelectorAll('.letter-btn');
    letterButtons.forEach(button => {
      const letter = button.getAttribute('data-letter');
      button.classList.toggle('active', letter === selectedLetter);
    });
  }
  
  /**
   * Display entries for a letter
   */
  function displayLetterEntries(letterData, letter) {
    // Update heading
    elements.entriesHeading.textContent = `Entries: Letter ${letter}`;
    
    // Clear existing entries
    clearEntryList();
    
    // Handle missing or invalid data
    if (!letterData || !letterData.entries || !Array.isArray(letterData.entries)) {
      elements.entryList.innerHTML = '<div class="empty-state">No entries available for this letter</div>';
      return;
    }
    
    // Create entry elements
    const entries = letterData.entries;
    
    if (entries.length === 0) {
      elements.entryList.innerHTML = '<div class="empty-state">No entries found for this letter</div>';
      return;
    }
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    entries.forEach(entry => {
      if (!entry || !entry.id || !entry.lemma) return; // Skip invalid entries
      
      const entryEl = document.createElement('div');
      entryEl.className = 'entry-item';
      entryEl.setAttribute('data-entry-id', entry.id);
      
      const lemmaEl = document.createElement('div');
      lemmaEl.className = 'entry-lemma';
      lemmaEl.textContent = entry.lemma;
      
      const previewEl = document.createElement('div');
      previewEl.className = 'entry-preview';
      
      // Choose preview content based on available data
      if (entry.translations && entry.translations.length > 0) {
        previewEl.textContent = entry.translations[0];
      } else if (entry.german_text && entry.german_text.length > 0) {
        previewEl.textContent = entry.german_text[0];
      } else if (entry.definition) {
        // Use first 50 characters of definition as preview
        previewEl.textContent = entry.definition.substring(0, 50) + (entry.definition.length > 50 ? '...' : '');
      } else {
        previewEl.textContent = 'No preview available';
      }
      
      entryEl.appendChild(lemmaEl);
      entryEl.appendChild(previewEl);
      
      entryEl.addEventListener('click', () => selectEntry(entry.id));
      
      fragment.appendChild(entryEl);
    });
    
    elements.entryList.appendChild(fragment);
  }
  
  /**
   * Clear the entry list
   */
  function clearEntryList() {
    elements.entryList.innerHTML = '';
    elements.entriesHeading.textContent = 'Entries';
  }
  
  /**
   * Select an entry to display details
   */
  async function selectEntry(entryId) {
    if (appState.currentEntry === entryId && !appState.isLoading) return;
    
    try {
      showLoading('Loading entry details...');
      
      // Update app state
      appState.currentEntry = entryId;
      
      // Update entry item states
      updateEntryItems(entryId);
      
      // Load entry details
      const entry = await dictionaryManager.getEntry(appState.currentDictionary, entryId);
      
      // Display entry details
      displayEntryDetails(entry);
      
      hideLoading();
    } catch (error) {
      console.error(`Failed to load entry ${entryId}:`, error);
      appState.lastError = error;
      showError(`Failed to load entry details. Please try again.`);
    }
  }
  
  /**
   * Update entry item states
   */
  function updateEntryItems(selectedEntryId) {
    const entryItems = elements.entryList.querySelectorAll('.entry-item');
    entryItems.forEach(item => {
      const entryId = item.getAttribute('data-entry-id');
      item.classList.toggle('active', entryId === selectedEntryId);
    });
  }
  
  /**
   * Display entry details
   */
  function displayEntryDetails(entry) {
    if (!entry) {
      elements.entryDetail.innerHTML = '<div class="empty-state">Entry details not available</div>';
      return;
    }
    
    // Create the entry detail HTML
    const html = `
      <div class="lemma">${sanitizeHTML(entry.lemma || 'Untitled Entry')}</div>
      
      ${entry.variants && entry.variants.length > 0 ? `
        <div class="variants">
          <strong>Variants:</strong> ${entry.variants.map(v => sanitizeHTML(v)).join(', ')}
        </div>
      ` : ''}
      
      <div class="definition" lang="la">
        ${sanitizeHTML(entry.definition || 'No definition available')}
      </div>
      
      ${entry.translations && entry.translations.length > 0 ? `
        <div class="translation" lang="de">
          <strong>German:</strong> ${entry.translations.map(t => sanitizeHTML(t)).join(', ')}
        </div>
      ` : ''}
      
      ${entry.german_text && entry.german_text.length > 0 ? `
        <div class="translation" lang="de">
          <strong>German:</strong> ${entry.german_text.map(t => sanitizeHTML(t)).join(', ')}
        </div>
      ` : ''}
      
      ${entry.symbols && entry.symbols.length > 0 ? `
        <div class="symbols">
          <strong>Symbols:</strong> 
          ${entry.symbols.map(symbol => `<span class="symbol" title="${sanitizeHTML(symbol)}">${getSymbolUnicode(symbol)}</span>`).join(' ')}
        </div>
      ` : ''}
      
      <div class="source">
        Source: ${entry.source === 'ruland' ? 'Ruland (1612)' : 'Sommerhoff (1701)'}
        ${entry.lemma ? `<button class="compare-btn" data-entry-id="${entry.id}">Compare in both dictionaries</button>` : ''}
      </div>
    `;
    
    elements.entryDetail.innerHTML = html;
    
    // Add event listener for compare button
    const compareBtn = elements.entryDetail.querySelector('.compare-btn');
    if (compareBtn) {
      compareBtn.addEventListener('click', () => compareEntry(entry.lemma));
    }
  }
  
  /**
   * Get Unicode representation of alchemical symbol
   */
  function getSymbolUnicode(symbolName) {
    // Try to use dictionaryManager symbol mapping if available
    if (dictionaryManager.getSymbolUnicode) {
      return dictionaryManager.getSymbolUnicode(symbolName);
    }
    
    // Fallback symbol mapping
    if (!symbolName) return '';
    
    const symbolMap = {
      mercury: '☿',
      venus: '♀',
      mars: '♂',
      jupiter: '♃',
      saturn: '♄',
      sun: '☉',
      moon: '☽',
      water: '🜄',
      fire: '🜂',
      air: '🜁',
      earth: '🜃',
      salt: '🜔',
      copper: '♀',
      iron: '♂',
      tin: '♃',
      lead: '♄',
      gold: '☉',
      silver: '☽',
      antimony: '♁',
      sulfur: '🜍',
      spirit: '🜍'
    };
    
    return symbolMap[symbolName.toLowerCase()] || symbolName;
  }
  
  /**
   * Sanitize HTML to prevent XSS attacks
   */
  function sanitizeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * Clear entry detail
   */
  function clearEntryDetail() {
    elements.entryDetail.innerHTML = '<div class="empty-state">Select an entry to view details</div>';
    appState.currentEntry = null;
  }
  
  /**
   * Handle search
   */
  async function handleSearch() {
    const searchTerm = elements.searchInput.value.trim();
    
    if (!searchTerm) {
      showError('Please enter a search term');
      return;
    }
    
    try {
      showLoading(`Searching for "${searchTerm}"...`);
      
      // Perform search
      const results = await dictionaryManager.searchEntries(appState.currentDictionary, searchTerm);
      
      // Update app state
      appState.searchResults = results;
      appState.currentLetter = null;
      appState.currentEntry = null;
      
      // Update UI
      displaySearchResults(results, searchTerm);
      clearEntryDetail();
      
      // Reset letter buttons
      updateLetterButtons(null);
      
      hideLoading();
    } catch (error) {
      console.error(`Failed to search for "${searchTerm}":`, error);
      appState.lastError = error;
      showError(`Failed to search for "${searchTerm}". Please try again.`);
    }
  }
  
  /**
   * Display search results
   */
  function displaySearchResults(results, searchTerm) {
    // Update heading
    elements.entriesHeading.textContent = `Search Results: "${sanitizeHTML(searchTerm)}"`;
    
    // Clear existing entries
    clearEntryList();
    
    // Handle missing results
    if (!results || !Array.isArray(results)) {
      elements.entryList.innerHTML = '<div class="error">Search results are not available</div>';
      return;
    }
    
    // Display results
    if (results.length === 0) {
      elements.entryList.innerHTML = '<div class="empty-state">No results found. Try a different search term.</div>';
      return;
    }
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    results.forEach(entry => {
      if (!entry || !entry.id || !entry.lemma) return; // Skip invalid entries
      
      const entryEl = document.createElement('div');
      entryEl.className = 'entry-item';
      entryEl.setAttribute('data-entry-id', entry.id);
      
      const lemmaEl = document.createElement('div');
      lemmaEl.className = 'entry-lemma';
      lemmaEl.textContent = entry.lemma;
      
      const previewEl = document.createElement('div');
      previewEl.className = 'entry-preview';
      
      // Choose preview content based on available data
      if (entry.translations && entry.translations.length > 0) {
        previewEl.textContent = entry.translations[0];
      } else if (entry.german_text && entry.german_text.length > 0) {
        previewEl.textContent = entry.german_text[0];
      } else if (entry.definition) {
        // Use first 50 characters of definition as preview
        previewEl.textContent = entry.definition.substring(0, 50) + (entry.definition.length > 50 ? '...' : '');
      } else {
        previewEl.textContent = 'No preview available';
      }
      
      entryEl.appendChild(lemmaEl);
      entryEl.appendChild(previewEl);
      
      entryEl.addEventListener('click', () => selectEntry(entry.id));
      
      fragment.appendChild(entryEl);
    });
    
    elements.entryList.appendChild(fragment);
  }
  
  /**
   * Compare an entry in both dictionaries
   */
  async function compareEntry(lemma) {
    if (!lemma) {
      showError('Cannot compare: entry lemma is missing');
      return;
    }
    
    try {
      showLoading('Preparing comparison view...');
      
      // Search for the lemma in both dictionaries
      const rulandResults = await dictionaryManager.searchEntries('ruland', lemma);
      const sommerhoffResults = await dictionaryManager.searchEntries('sommerhoff', lemma);
      
      // Find exact or closest matches
      const rulandEntry = findBestMatch(rulandResults, lemma);
      const sommerhoffEntry = findBestMatch(sommerhoffResults, lemma);
      
      // Display comparison
      displayComparison(rulandEntry, sommerhoffEntry, lemma);
      
      hideLoading();
    } catch (error) {
      console.error(`Failed to compare entry "${lemma}":`, error);
      appState.lastError = error;
      showError(`Failed to prepare comparison. Please try again.`);
    }
  }
  
  /**
   * Find the best match from search results
   */
  function findBestMatch(results, lemma) {
    if (!results || !Array.isArray(results) || results.length === 0) return null;
    
    // First look for exact match
    const exactMatch = results.find(entry => 
      entry && entry.lemma && entry.lemma.toLowerCase() === lemma.toLowerCase()
    );
    
    if (exactMatch) return exactMatch;
    
    // Return the first result as closest match
    return results[0];
  }
  
  /**
   * Display the comparison view
   */
  function displayComparison(rulandEntry, sommerhoffEntry, lemma) {
    const safelemma = sanitizeHTML(lemma || 'Unknown Term');
    
    // Display Ruland entry
    if (rulandEntry) {
      elements.rulandComparisonContent.innerHTML = `
        <div class="lemma">${sanitizeHTML(rulandEntry.lemma)}</div>
        <div class="definition" lang="la">${sanitizeHTML(rulandEntry.definition || 'No definition available')}</div>
        ${rulandEntry.translations && rulandEntry.translations.length > 0 ? `
          <div class="translation" lang="de">
            <strong>German:</strong> ${rulandEntry.translations.map(t => sanitizeHTML(t)).join(', ')}
          </div>
        ` : ''}
      `;
    } else {
      elements.rulandComparisonContent.innerHTML = `
        <div class="empty-state">No equivalent entry found in Ruland's dictionary for "${safelemma}"</div>
      `;
    }
    
    // Display Sommerhoff entry
    if (sommerhoffEntry) {
      elements.sommerhoffComparisonContent.innerHTML = `
        <div class="lemma">${sanitizeHTML(sommerhoffEntry.lemma)}</div>
        <div class="definition" lang="la">${sanitizeHTML(sommerhoffEntry.definition || 'No definition available')}</div>
        ${sommerhoffEntry.german_text && sommerhoffEntry.german_text.length > 0 ? `
          <div class="translation" lang="de">
            <strong>German:</strong> ${sommerhoffEntry.german_text.map(t => sanitizeHTML(t)).join(', ')}
          </div>
        ` : ''}
        ${sommerhoffEntry.symbols && sommerhoffEntry.symbols.length > 0 ? `
          <div class="symbols">
            <strong>Symbols:</strong> 
            ${sommerhoffEntry.symbols.map(symbol => `<span class="symbol" title="${sanitizeHTML(symbol)}">${getSymbolUnicode(symbol)}</span>`).join(' ')}
          </div>
        ` : ''}
      `;
    } else {
      elements.sommerhoffComparisonContent.innerHTML = `
        <div class="empty-state">No equivalent entry found in Sommerhoff's dictionary for "${safelemma}"</div>
      `;
    }
    
    // Show the comparison view
    elements.comparisonView.classList.add('active');
  }
  
  /**
   * Hide the comparison view
   */
  function hideComparisonView() {
    elements.comparisonView.classList.remove('active');
  }
  
  /**
   * Show loading overlay
   */
  function showLoading(message) {
    appState.isLoading = true;
    elements.loadingMessage.textContent = message || 'Loading...';
    elements.loadingOverlay.classList.add('active');
  }
  
  /**
   * Hide loading overlay
   */
  function hideLoading() {
    appState.isLoading = false;
    elements.loadingOverlay.classList.remove('active');
  }
  
  /**
   * Show error message
   */
  function showError(message) {
    hideLoading();
    elements.errorText.textContent = message || 'An error occurred';
    elements.errorMessage.classList.add('active');
  }
  
  /**
   * Hide error message
   */
  function hideError() {
    elements.errorMessage.classList.remove('active');
  }
  
  /**
   * Retry current operation
   * Useful to add a retry button for failed operations
   */
  function retryOperation() {
    hideError();
    
    if (appState.currentLetter) {
      selectLetter(appState.currentLetter);
    } else if (appState.currentEntry) {
      selectEntry(appState.currentEntry);
    } else {
      initializeApp();
    }
  }
  
  // Initialize the application when the DOM is loaded
  document.addEventListener('DOMContentLoaded', initializeApp);