const appState = {
    currentView: config.defaultView || 'explorer',
    currentDictionary: config.defaultDictionary || 'ruland',
    currentLetter: null,
    currentEntry: null,
    currentPage: null,
    currentSection: null,
    currentSymbol: null,
    isLoading: false,
    searchResults: [],
    lastError: null,
    showAdvancedFeatures: localStorage.getItem('showAdvancedFeatures') === 'true' || true,
    pageNavigation: {
      ruland: { current: 1, total: 0 },
      sommerhoff: { current: 1, total: 0 }
    }
  };
  
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
    errorCloseBtn: document.getElementById('error-close-btn'),
    errorRetryBtn: document.getElementById('error-retry-btn'),
    explorerTabBtn: document.getElementById('explorer-tab-btn'),
    dashboardTabBtn: document.getElementById('dashboard-tab-btn'),
    explorerView: document.getElementById('explorer-view'),
    dashboardView: document.getElementById('dashboard-view'),
    dashboardContent: document.getElementById('dashboard-content'),
    controls: document.querySelector('.controls'),
    advancedFeaturesToggle: document.getElementById('advanced-features-toggle'),
    pageNavContainer: document.getElementById('page-navigation'),
    sectionNavContainer: document.getElementById('section-navigation'),
    symbolsContainer: document.getElementById('symbols-container'),
    referenceContainer: document.getElementById('references-container'),
    contextInfoContainer: document.getElementById('context-info')
  };
  
  async function initializeApp() {
    try {
      showLoading('Initializing application...');
      if (typeof window.dictionaryLoader === 'undefined' || !window.dictionaryLoader) {
        if (typeof dictionaryManager !== 'undefined' && dictionaryManager) {
          console.warn("Enhanced dictionary loader not found. Using legacy dictionaryManager instead.");
          window.dictionaryLoader = dictionaryManager;
        } else {
          throw new Error("Neither dictionaryLoader nor dictionaryManager is available.");
        }
      }
      await window.dictionaryLoader.initialize();
      setupEventListeners();
      await initializeNavigation();
      if (elements.advancedFeaturesToggle) {
         elements.advancedFeaturesToggle.checked = appState.showAdvancedFeatures;
      }
      toggleAdvancedFeatures(appState.showAdvancedFeatures); // Apply initial state
      await switchDictionary(appState.currentDictionary);
      if (typeof initializeDashboard === 'function') {
        console.log("Initializing dashboard module...");
        await initializeDashboard();
      }
      switchView(appState.currentView);
      hideLoading();
    } catch (error) {
      console.error('Failed to initialize application:', error);
      appState.lastError = error;
      hideLoading();
      showError(`Failed to initialize application: ${error.message}. Please check console and try again.`);
    }
  }
  
  async function initializeNavigation() {
    try {
      const [rulandStructure, sommerhoffStructure] = await Promise.all([
           window.dictionaryLoader.loadDocumentStructure('ruland'),
           window.dictionaryLoader.loadDocumentStructure('sommerhoff')
      ]);
      if (rulandStructure && rulandStructure.pages) {
          appState.pageNavigation.ruland.total = Object.keys(rulandStructure.pages).length;
      }
      if (sommerhoffStructure && sommerhoffStructure.pages) {
        appState.pageNavigation.sommerhoff.total = Object.keys(sommerhoffStructure.pages).length;
      }
      if (appState.showAdvancedFeatures) {
          renderPageNavigation();
          renderSectionNavigation(appState.currentDictionary);
      }
    } catch (error) {
      console.warn('Failed to initialize navigation options:', error);
    }
  }
  
  function setupEventListeners() {
    elements.rulandBtn?.addEventListener('click', () => switchDictionary('ruland'));
    elements.sommerhoffBtn?.addEventListener('click', () => switchDictionary('sommerhoff'));
    elements.searchBtn?.addEventListener('click', handleSearch);
    elements.searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
    elements.closeComparisonBtn?.addEventListener('click', hideComparisonView);
    elements.errorCloseBtn?.addEventListener('click', hideError);
    elements.errorRetryBtn?.addEventListener('click', retryOperation);
    elements.explorerTabBtn?.addEventListener('click', () => switchView('explorer'));
    elements.dashboardTabBtn?.addEventListener('click', () => switchView('dashboard'));
    elements.advancedFeaturesToggle?.addEventListener('change', (e) => {
      appState.showAdvancedFeatures = e.target.checked;
      toggleAdvancedFeatures(appState.showAdvancedFeatures);
      if (appState.currentEntry) selectEntry(appState.currentEntry); // Refresh entry detail
      else if (appState.currentLetter) selectLetter(appState.currentLetter); // Refresh entry list context
      else if (appState.currentPage) navigateToPage(appState.currentPage); // Refresh page view
      else if (appState.currentSection) navigateToSection(appState.currentSection); // Refresh section view
      else if (appState.searchResults.length > 0 && elements.searchInput?.value) displaySearchResults(appState.searchResults, elements.searchInput.value); // Refresh search results context
    });
  }
  
  function toggleAdvancedFeatures(show) {
    const advancedElements = [
      elements.contextInfoContainer, elements.referenceContainer,
      elements.pageNavContainer, elements.sectionNavContainer
    ];
    advancedElements.forEach(el => { if (el) el.style.display = show ? '' : 'none'; });
    try { localStorage.setItem('showAdvancedFeatures', show); } catch (e) {}
    // Toggle visibility for items already rendered
    document.querySelectorAll('.entry-context, .references-header, .context-header').forEach(el => {
        el.style.display = show ? '' : 'none';
    });
  }
  
  function switchView(viewName) {
    if (!viewName || (viewName !== 'explorer' && viewName !== 'dashboard')) viewName = 'explorer';
    if (appState.currentView === viewName && !appState.isLoading) return;
    appState.currentView = viewName;
    elements.explorerTabBtn?.classList.toggle('active', viewName === 'explorer');
    elements.explorerTabBtn?.setAttribute('aria-pressed', viewName === 'explorer');
    elements.dashboardTabBtn?.classList.toggle('active', viewName === 'dashboard');
    elements.dashboardTabBtn?.setAttribute('aria-pressed', viewName === 'dashboard');
  
    if (viewName === 'explorer') {
      if (elements.explorerView) elements.explorerView.style.display = '';
      if (elements.dashboardView) elements.dashboardView.style.display = 'none';
      if (elements.controls) elements.controls.style.display = '';
      if (elements.dictionaryInfo) elements.dictionaryInfo.style.display = '';
      if (elements.letterNav) elements.letterNav.style.display = '';
      updateDictionaryInfo();
      toggleAdvancedFeatures(appState.showAdvancedFeatures); // Ensure nav visibility matches toggle
    } else if (viewName === 'dashboard') {
      if (elements.explorerView) elements.explorerView.style.display = 'none';
      if (elements.dashboardView) elements.dashboardView.style.display = 'block';
      if (typeof renderDashboard === 'function') {
        renderDashboard(elements.dashboardContent);
      } else {
        if (elements.dashboardContent) elements.dashboardContent.innerHTML = '<p class="error">Dashboard functionality not implemented yet.</p>';
      }
    }
  }
  
  async function switchDictionary(dictionary) {
    if (appState.currentDictionary === dictionary && !appState.isLoading && appState.currentView === 'explorer') return;
    appState.currentDictionary = dictionary;
    updateDictionaryToggle(dictionary);
  
    if (appState.currentView === 'dashboard') {
      if (typeof renderDashboard === 'function') renderDashboard(elements.dashboardContent);
      return;
    }
  
    if (appState.isLoading) return;
    try {
      showLoading(`Loading ${dictionary} dictionary...`);
      appState.currentLetter = null;
      appState.currentEntry = null;
      appState.currentPage = null;
      appState.currentSection = null;
      appState.searchResults = [];
      elements.searchInput.value = '';
      await updateLetterNavigation();
      updateDictionaryInfo();
      if (appState.showAdvancedFeatures) {
        appState.pageNavigation[dictionary].current = 1; // Reset page number on switch
        renderPageNavigation();
        renderSectionNavigation(dictionary);
      }
      clearEntryList();
      clearEntryDetail();
      hideLoading();
    } catch (error) {
      console.error(`Failed to switch to ${dictionary} dictionary:`, error);
      appState.lastError = error;
      hideLoading();
      showError(`Failed to load ${dictionary} dictionary data. Please try again.`);
    }
  }
  
  function updateDictionaryToggle(dictionary) {
    elements.rulandBtn?.classList.toggle('active', dictionary === 'ruland');
    elements.rulandBtn?.setAttribute('aria-pressed', dictionary === 'ruland');
    elements.sommerhoffBtn?.classList.toggle('active', dictionary === 'sommerhoff');
    elements.sommerhoffBtn?.setAttribute('aria-pressed', dictionary === 'sommerhoff');
  }
  
  function renderPageNavigation() {
    if (!elements.pageNavContainer) return;
    const dictionary = appState.currentDictionary;
    const totalPages = appState.pageNavigation[dictionary].total;
    if (totalPages <= 0) {
        elements.pageNavContainer.innerHTML = ''; // Hide if no pages
        return;
    }
    const currentPage = appState.pageNavigation[dictionary].current;
    elements.pageNavContainer.innerHTML = `
      <div class="navigation-header">Page Navigation</div>
      <div class="page-controls">
        <button id="prev-page" ${currentPage <= 1 ? 'disabled' : ''}>&laquo; Prev</button>
        <span class="page-indicator">Page ${currentPage} / ${totalPages}</span>
        <button id="next-page" ${currentPage >= totalPages ? 'disabled' : ''}>Next &raquo;</button>
      </div>
      <div class="page-jump">
        <label for="page-number-input" class="visually-hidden">Go to Page:</label>
        <input type="number" id="page-number-input" min="1" max="${totalPages}" value="${currentPage}" aria-label="Page Number Input">
        <button id="go-to-page">Go</button>
      </div>`;
    document.getElementById('prev-page')?.addEventListener('click', () => {
      if (currentPage > 1) navigateToPage(currentPage - 1);
    });
    document.getElementById('next-page')?.addEventListener('click', () => {
      if (currentPage < totalPages) navigateToPage(currentPage + 1);
    });
    const goToPageHandler = () => {
        const input = document.getElementById('page-number-input');
        if (input) {
          const pageNum = parseInt(input.value, 10);
          if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) navigateToPage(pageNum);
          else input.value = appState.pageNavigation[dictionary].current; // Reset if invalid
        }
    };
    document.getElementById('go-to-page')?.addEventListener('click', goToPageHandler);
    document.getElementById('page-number-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') goToPageHandler();
    });
  }
  
  async function navigateToPage(pageNumber) {
    if (!pageNumber || isNaN(pageNumber)) return;
    const dictionary = appState.currentDictionary;
    if (pageNumber < 1 || pageNumber > appState.pageNavigation[dictionary].total) return;
  
    try {
      showLoading(`Loading page ${pageNumber}...`);
      appState.currentPage = pageNumber;
      appState.currentLetter = null;
      appState.currentEntry = null;
      appState.currentSection = null;
      appState.searchResults = [];
      appState.pageNavigation[dictionary].current = pageNumber;
      if (appState.showAdvancedFeatures) renderPageNavigation();
      const entries = await window.dictionaryLoader.getEntriesOnPage(dictionary, pageNumber);
      displayPageEntries(entries, pageNumber);
      clearEntryDetail();
      updateLetterButtons(null); // Deselect letter buttons
      hideLoading();
    } catch (error) {
      console.error(`Failed to navigate to page ${pageNumber}:`, error);
      hideLoading();
      showError(`Could not load page ${pageNumber}. Please try again.`);
    }
  }
  
  function displayPageEntries(entries, pageNumber) {
    if (!elements.entriesHeading || !elements.entryList) return;
    elements.entriesHeading.textContent = `Entries: Page ${pageNumber}`;
    clearEntryList();
    if (!entries || !Array.isArray(entries)) {
      elements.entryList.innerHTML = '<li class="empty-state">Entry data is not available for this page.</li>'; return;
    }
    if (entries.length === 0) {
      elements.entryList.innerHTML = '<li class="empty-state">No entries found on this page.</li>'; return;
    }
    const fragment = document.createDocumentFragment();
    entries.forEach(entry => { if (entry && entry.id && entry.lemma) fragment.appendChild(createEntryListItem(entry)); });
    elements.entryList.appendChild(fragment);
  }
  
  function renderSectionNavigation(dictionary) {
    if (!elements.sectionNavContainer) return;
    try {
      const structure = window.dictionaryLoader.cache.documentStructures[dictionary];
      if (!structure || !structure.sections || !Array.isArray(structure.sections) || structure.sections.length === 0) {
        elements.sectionNavContainer.innerHTML = ''; return; // Hide if no sections
      }
      elements.sectionNavContainer.innerHTML = `
        <div class="navigation-header">Sections</div>
        <ul class="section-list">
          ${structure.sections.map(section => `
            <li><button class="section-btn" data-section-id="${sanitizeHTML(section.id)}">${sanitizeHTML(section.title || section.type || section.id)}</button></li>
          `).join('')}
        </ul>`;
      document.querySelectorAll('.section-btn').forEach(btn => {
        btn.addEventListener('click', () => navigateToSection(btn.getAttribute('data-section-id')));
      });
    } catch (error) {
      console.error('Failed to render section navigation:', error);
      elements.sectionNavContainer.innerHTML = '<div class="error">Failed to load sections</div>';
    }
  }
  
  async function navigateToSection(sectionId) {
    if (!sectionId) return;
    try {
      showLoading(`Loading section...`);
      appState.currentSection = sectionId;
      appState.currentLetter = null;
      appState.currentEntry = null;
      appState.currentPage = null;
      appState.searchResults = [];
      const sectionInfo = await window.dictionaryLoader.getSectionInfo(appState.currentDictionary, sectionId);
      const entries = await window.dictionaryLoader.getEntriesInSection(appState.currentDictionary, sectionId);
      displaySectionEntries(entries, sectionInfo);
      clearEntryDetail();
      updateLetterButtons(null); // Deselect letter buttons
      hideLoading();
    } catch (error) {
      console.error(`Failed to navigate to section ${sectionId}:`, error);
      hideLoading();
      showError(`Could not load section ${sectionId}. Please try again.`);
    }
  }
  
  function displaySectionEntries(entries, sectionInfo) {
    if (!elements.entriesHeading || !elements.entryList) return;
    const sectionTitle = sectionInfo?.title || sectionInfo?.type || sectionInfo?.id || 'Section';
    elements.entriesHeading.textContent = `Entries: ${sanitizeHTML(sectionTitle)}`;
    clearEntryList();
    if (!entries || !Array.isArray(entries)) {
      elements.entryList.innerHTML = '<li class="empty-state">Entry data is not available for this section.</li>'; return;
    }
    if (entries.length === 0) {
      elements.entryList.innerHTML = '<li class="empty-state">No entries found in this section.</li>'; return;
    }
    const fragment = document.createDocumentFragment();
    entries.forEach(entry => { if (entry && entry.id && entry.lemma) fragment.appendChild(createEntryListItem(entry)); });
    elements.entryList.appendChild(fragment);
  }
  
  async function updateLetterNavigation() {
    if (!elements.letterNav) return;
    elements.letterNav.innerHTML = '<div class="loading">Loading...</div>';
    try {
      const letterIndex = await window.dictionaryLoader.loadLetterIndex(appState.currentDictionary);
      elements.letterNav.innerHTML = ''; // Clear loading/previous
      if (!letterIndex || !letterIndex.letters || Object.keys(letterIndex.letters).length === 0) {
        elements.letterNav.innerHTML = '<div class="error">Index unavailable.</div>'; return;
      }
      const fragment = document.createDocumentFragment();
      const sortedLetters = Object.keys(letterIndex.letters).sort();
      let hasEntries = false;
      for (const letter of sortedLetters) {
        const letterData = letterIndex.letters[letter];
        const count = letterData?.count ?? (letterData?.entries?.length || 0);
        if (count === 0) continue;
        hasEntries = true;
        const button = document.createElement('button');
        button.className = 'letter-btn';
        button.setAttribute('data-letter', letter);
        button.textContent = letter;
        button.title = `${letter}: ${count} entries`;
        button.addEventListener('click', () => selectLetter(letter));
        fragment.appendChild(button);
      }
      if (hasEntries) elements.letterNav.appendChild(fragment);
      else elements.letterNav.innerHTML = '<div class="empty-state">No entries.</div>';
    } catch (error) {
      console.error('Failed to update letter navigation:', error);
      elements.letterNav.innerHTML = '<div class="error">Failed to load index</div>';
    }
  }
  
  function updateDictionaryInfo() {
    if (!elements.dictionaryInfo) return;
    const metadata = window.dictionaryLoader.cache.metadata;
    if (!metadata) { elements.dictionaryInfo.innerHTML = '<div class="error">Info unavailable</div>'; return; }
    const dictionary = appState.currentDictionary;
    const info = metadata[dictionary];
    if (!info) { elements.dictionaryInfo.innerHTML = `<div class="empty-state">No info for ${dictionary}</div>`; return; }
    let entryCountText = 'an unknown number of';
    if (info.entryCount && info.entryCount > 0) entryCountText = info.entryCount.toLocaleString();
    else {
        const letterIndex = window.dictionaryLoader.cache.letterIndexes?.[dictionary];
        if (letterIndex?.totalEntries > 0) entryCountText = letterIndex.totalEntries.toLocaleString();
    }
    let structureInfo = '';
    const structure = window.dictionaryLoader.cache.documentStructures?.[dictionary];
    if (structure) {
        const pageCount = structure.pages ? Object.keys(structure.pages).length : 'unknown';
        const symbolCount = dictionary === 'sommerhoff' && window.dictionaryLoader.cache.symbols ? Object.keys(window.dictionaryLoader.cache.symbols).length : 0;
        structureInfo = `<div class="structure-info"><span>Pages: ${pageCount}</span>${symbolCount > 0 ? `<span>Symbols: ${symbolCount}</span>` : ''}</div>`;
    }
    elements.dictionaryInfo.innerHTML = `
      <h3>${sanitizeHTML(info.title || 'Unknown Dictionary')}</h3>
      <p>${sanitizeHTML(info.author || 'Unknown Author')}, ${info.year || 'Unknown Year'}</p>
      <p>Contains ${entryCountText} alchemical terms</p>
      ${structureInfo}
      ${info.description ? `<p class="description">${sanitizeHTML(info.description)}</p>` : ''}`;
  }
  
  async function selectLetter(letter) {
    if (appState.currentView !== 'explorer') return;
    if (appState.currentLetter === letter && !appState.isLoading) return;
    try {
      showLoading(`Loading entries for letter ${letter}...`);
      appState.currentLetter = letter;
      appState.currentEntry = null;
      appState.currentPage = null;
      appState.currentSection = null;
      appState.searchResults = [];
      updateLetterButtons(letter);
      const letterData = await window.dictionaryLoader.loadLetterEntries(appState.currentDictionary, letter);
      displayLetterEntries(letterData, letter);
      clearEntryDetail();
      hideLoading();
    } catch (error) {
      console.error(`Failed to load entries for letter ${letter}:`, error);
      hideLoading();
      showError(`Failed to load entries for letter ${letter}. Please try again.`);
    }
  }
  
  function updateLetterButtons(selectedLetter) {
    if (!elements.letterNav) return;
    elements.letterNav.querySelectorAll('.letter-btn').forEach(button => {
      button.classList.toggle('active', button.getAttribute('data-letter') === selectedLetter);
    });
  }
  
  function displayLetterEntries(letterData, letter) {
    if (!elements.entriesHeading || !elements.entryList) return;
    elements.entriesHeading.textContent = `Entries: Letter ${letter}`;
    clearEntryList();
    if (!letterData || !letterData.entries || !Array.isArray(letterData.entries)) {
      elements.entryList.innerHTML = '<li class="empty-state">Entry data is not available for this letter.</li>'; return;
    }
    const entries = letterData.entries;
    if (entries.length === 0) {
      elements.entryList.innerHTML = '<li class="empty-state">No entries found for this letter.</li>'; return;
    }
    const fragment = document.createDocumentFragment();
    entries.forEach(entry => { if (entry && entry.id && entry.lemma) fragment.appendChild(createEntryListItem(entry)); });
    elements.entryList.appendChild(fragment);
  }
  
  function createEntryListItem(entry) {
    const entryEl = document.createElement('li'); // Use li for semantic list
    entryEl.className = 'entry-item';
    entryEl.setAttribute('data-entry-id', entry.id);
    entryEl.setAttribute('role', 'button');
    entryEl.setAttribute('tabindex', '0');
    const lemmaEl = document.createElement('div');
    lemmaEl.className = 'entry-lemma';
    lemmaEl.textContent = entry.lemma;
    const previewEl = document.createElement('div');
    previewEl.className = 'entry-preview';
    let previewText = '';
    if (entry.translations?.[0]) previewText = typeof entry.translations[0] === 'string' ? entry.translations[0] : entry.translations[0].text;
    else if (entry.german_text?.[0]) previewText = typeof entry.german_text[0] === 'string' ? entry.german_text[0] : entry.german_text[0].text;
    else if (entry.definition) previewText = entry.definition.substring(0, 80) + (entry.definition.length > 80 ? '...' : '');
    previewEl.textContent = previewText || 'No preview available';
    entryEl.appendChild(lemmaEl);
    entryEl.appendChild(previewEl);
    if (appState.showAdvancedFeatures && entry.context?.page) {
      const contextEl = document.createElement('div');
      contextEl.className = 'entry-context';
      contextEl.textContent = `Page: ${entry.context.page.n}`;
      entryEl.appendChild(contextEl);
    }
    entryEl.addEventListener('click', () => selectEntry(entry.id));
    entryEl.addEventListener('keypress', (e) => { if (e.key === 'Enter' || e.key === ' ') selectEntry(entry.id); });
    return entryEl;
  }
  
  function clearEntryList() {
    if (!elements.entryList || !elements.entriesHeading) return;
    elements.entryList.innerHTML = '';
    elements.entriesHeading.textContent = 'Entries';
  }
  
  async function selectEntry(entryId) {
    if (appState.currentView !== 'explorer' || !entryId) return;
    if (appState.currentEntry === entryId && !appState.isLoading) {
      elements.entryDetail?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return;
    }
    try {
      showLoading('Loading entry details...');
      appState.currentEntry = entryId;
      updateEntryItems(entryId);
      const entry = await window.dictionaryLoader.getEntry(appState.currentDictionary, entryId);
      let references = null;
      if (appState.showAdvancedFeatures) {
        try { references = await window.dictionaryLoader.findCrossReferences(entry); }
        catch (e) { console.warn('Failed to load cross-references:', e); }
      }
      displayEntryDetails(entry, references);
      elements.entryDetail?.scrollTo(0, 0);
      elements.entryDetail?.focus();
      hideLoading();
    } catch (error) {
      console.error(`Failed to load entry ${entryId}:`, error);
      appState.lastError = error;
      hideLoading();
      showError(`Failed to load entry details for ${entryId}. Please try again.`);
      clearEntryDetail();
    }
  }
  
  function updateEntryItems(selectedEntryId) {
    if (!elements.entryList) return;
    elements.entryList.querySelectorAll('.entry-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-entry-id') === selectedEntryId);
    });
  }
  
  function displayEntryDetails(entry, references) {
    if (!elements.entryDetail) return;
    if (!entry || entry.lemma === 'Entry not found') {
      elements.entryDetail.innerHTML = `<div class="empty-state">${entry ? entry.definition : 'Entry details not available.'}</div>`;
      if (elements.referenceContainer) elements.referenceContainer.innerHTML = '';
      if (elements.contextInfoContainer) elements.contextInfoContainer.innerHTML = '';
      return;
    }
    const getSymbolDisplay = getSymbolRenderer();
    const mainContent = document.createElement('div');
    mainContent.className = 'entry-main-content';
    mainContent.innerHTML = `
      <h4 class="lemma">${sanitizeHTML(entry.lemma || 'Untitled Entry')}</h4>
      ${entry.lemma_type && entry.lemma_type !== 'lemma' ? `<div class="lemma-type">(${entry.lemma_type})</div>` : ''}
      ${Array.isArray(entry.variants) && entry.variants.length > 0 ? `<div class="variants"><strong>Variants:</strong> ${entry.variants.map(v => sanitizeHTML(typeof v === 'string' ? v : v.text || '')).join(', ')}</div>` : ''}
      ${entry.forms && Array.isArray(entry.forms) && entry.forms.length > 1 ? `<div class="forms"><strong>Forms:</strong><ul>${entry.forms.filter(f => f.type !== 'lemma').map(form => `<li><span class="form-type">${form.type}:</span> <span class="form-text">${sanitizeHTML(form.text)}</span>${form.symbols?.length > 0 ? ` <span class="form-symbols">${form.symbols.map(s => getSymbolDisplay(s)).join(' ')}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
      <div class="definition" lang="la">${sanitizeHTML(entry.definition || 'No definition available')}</div>
      ${entry.explicit_definitions?.length > 0 ? `<div class="explicit-definitions"><strong>Explicit Definitions:</strong><ul>${entry.explicit_definitions.map(def => `<li>${sanitizeHTML(def)}</li>`).join('')}</ul></div>` : ''}
      ${entry.sense_texts?.length > 0 ? `<div class="sense-texts"><strong>Sense Texts:</strong><ul>${entry.sense_texts.map(sense => `<li>${sanitizeHTML(sense)}</li>`).join('')}</ul></div>` : ''}
      ${entry.sense_data?.length > 0 ? `<div class="sense-data"><strong>Sense Data:</strong><ul>${entry.sense_data.map(sense => `<li>${sanitizeHTML(sense.text)}${sense.symbols?.length > 0 ? ` <span class="sense-symbols">${sense.symbols.map(s => getSymbolDisplay(s)).join(' ')}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
      ${renderTranslations(entry)}
      ${renderSymbols(entry, getSymbolDisplay)}
      ${renderNotes(entry)}
      <div class="source">Source: ${entry.source === 'ruland' ? 'Ruland (1612)' : 'Sommerhoff (1701)'}
        ${entry.lemma ? `<button class="compare-btn" data-lemma="${sanitizeHTML(entry.lemma)}">Compare term</button>` : ''}
      </div>`;
    elements.entryDetail.innerHTML = '';
    elements.entryDetail.appendChild(mainContent);
    const compareBtn = elements.entryDetail.querySelector('.compare-btn');
    if (compareBtn) {
      const lemmaToCompare = compareBtn.getAttribute('data-lemma');
      if (lemmaToCompare) compareBtn.addEventListener('click', () => compareEntry(lemmaToCompare));
    }
    if (appState.showAdvancedFeatures) {
      displayEntryContext(entry);
      displayEntryReferences(entry, references);
    } else {
       if (elements.contextInfoContainer) elements.contextInfoContainer.innerHTML = '';
       if (elements.referenceContainer) elements.referenceContainer.innerHTML = '';
    }
  }
  
  function renderTranslations(entry) {
    let html = '';
    if (entry.translations?.length > 0) {
      if (typeof entry.translations[0] === 'string') {
        html += `<div class="translation" lang="de"><strong>German (Ruland):</strong> ${entry.translations.map(t => sanitizeHTML(t)).join(', ')}</div>`;
      } else {
        html += `<div class="translation enhanced" lang="de"><strong>German (Ruland):</strong><ul>${entry.translations.map(t => `<li><span class="translation-text">${sanitizeHTML(t.text)}</span>${t.context ? ` <span class="translation-context">(${sanitizeHTML(t.context)})</span>` : ''}${t.style ? ` <span class="translation-style" style="${sanitizeHTML(t.style)}"></span>` : ''}</li>`).join('')}</ul></div>`;
      }
    }
    if (entry.german_text?.length > 0) {
      if (typeof entry.german_text[0] === 'string') {
        html += `<div class="translation" lang="de"><strong>German (Sommerhoff):</strong> ${entry.german_text.map(t => sanitizeHTML(t)).join(', ')}</div>`;
      } else {
        html += `<div class="translation enhanced" lang="de"><strong>German (Sommerhoff):</strong><ul>${entry.german_text.map(t => `<li><span class="translation-text">${sanitizeHTML(t.text)}</span>${t.context ? ` <span class="translation-context">(${sanitizeHTML(t.context)})</span>` : ''}${t.pattern ? ` <span class="translation-pattern">(${sanitizeHTML(t.pattern)})</span>` : ''}</li>`).join('')}</ul></div>`;
      }
    }
    return html;
  }
  
  function renderSymbols(entry, getSymbolDisplay) {
    if (!entry.symbols || !Array.isArray(entry.symbols) || entry.symbols.length === 0) return '';
    if (typeof entry.symbols[0] === 'string') {
      return `<div class="symbols"><strong>Symbols:</strong> ${entry.symbols.map(symbolId => `<span class="symbol" title="${sanitizeHTML(symbolId)}">${getSymbolDisplay(symbolId)}</span>`).join(' ')}</div>`;
    } else {
      return `<div class="symbols enhanced"><strong>Symbols:</strong><ul>${entry.symbols.map(symbol => `<li><span class="symbol" title="${sanitizeHTML(symbol.details?.name || symbol.id)}">${getSymbolDisplay(symbol.id)}</span> <span class="symbol-id">${symbol.id}</span>${symbol.context ? ` <span class="symbol-context">(${sanitizeHTML(symbol.context)})</span>` : ''}${symbol.details?.name ? ` <span class="symbol-name">(${sanitizeHTML(symbol.details.name)})</span>` : ''}</li>`).join('')}</ul></div>`;
    }
  }
  
  function renderNotes(entry) {
    if (!entry.notes || !Array.isArray(entry.notes) || entry.notes.length === 0) return '';
    if (typeof entry.notes[0] === 'string') {
      return `<div class="notes"><strong>Notes:</strong><ul>${entry.notes.map(note => `<li>${sanitizeHTML(note)}</li>`).join('')}</ul></div>`;
    } else {
      return `<div class="notes enhanced"><strong>Notes:</strong><ul>${entry.notes.map(note => `<li ${note.number ? `class="numbered-note" data-note-number="${note.number}"` : ''}>${note.number ? `<span class="note-number">${note.number}.</span> ` : ''}<span class="note-text">${sanitizeHTML(note.text)}</span>${note.translations?.length > 0 ? `<div class="note-translations" lang="de"><em>Translations:</em> ${note.translations.map(t => `<div>${sanitizeHTML(t)}</div>`).join('')}</div>` : ''}</li>`).join('')}</ul></div>`;
    }
  }
  
  function displayEntryContext(entry) {
    if (!elements.contextInfoContainer) return;
    elements.contextInfoContainer.innerHTML = '';
    if (!entry.context) { elements.contextInfoContainer.style.display = 'none'; return; }
    elements.contextInfoContainer.style.display = '';
    let contextHtml = `<div class="context-header">Entry Context</div>`;
    if (entry.context.page) contextHtml += `<div class="context-section"><h4>Page Information</h4><p>Page: ${entry.context.page.n}${entry.context.page.id ? ` (ID: ${entry.context.page.id})` : ''}</p></div>`;
    if (entry.context.section) contextHtml += `<div class="context-section"><h4>Section Information</h4><p>Type: ${sanitizeHTML(entry.context.section.type || 'Unknown')}${entry.context.section.head ? `, Heading: ${sanitizeHTML(entry.context.section.head)}` : ''}</p></div>`;
    if (entry.context.letter) contextHtml += `<div class="context-section"><h4>Letter Group</h4><p>${sanitizeHTML(entry.context.letter)}</p></div>`;
    if (entry.context.preceding_header || entry.context.following_header) contextHtml += `<div class="context-section"><h4>Headers/Footers</h4>${entry.context.preceding_header ? `<p>Preceding: ${sanitizeHTML(entry.context.preceding_header)}</p>` : ''}${entry.context.following_header ? `<p>Following: ${sanitizeHTML(entry.context.following_header)}</p>` : ''}</div>`;
    if (entry.structural_markers) contextHtml += `<div class="context-section"><h4>Structural Markers</h4>${entry.structural_markers.line_breaks?.length > 0 ? `<p>Line breaks: ${entry.structural_markers.line_breaks.length}</p>` : ''}${entry.structural_markers.page_break ? `<p>Page break: ${entry.structural_markers.page_break.n}</p>` : ''}</div>`;
    elements.contextInfoContainer.innerHTML = contextHtml;
  }
  
  function displayEntryReferences(entry, references) {
    if (!elements.referenceContainer) return;
    elements.referenceContainer.innerHTML = '';
    if (!references) { // Try extracting from entry if separate refs weren't loaded
        references = { explicit: [], implicit: [], incoming: [] };
        if (entry.references?.length > 0) {
            references.explicit = entry.references.map(ref => ({ type: ref.type || 'unknown', targetId: ref.target, text: ref.text, label: ref.label || '' }));
        }
        if (entry.textual_references?.length > 0) {
            references.explicit = references.explicit.concat(
                entry.textual_references.map(ref => ({ type: 'textual', targetId: ref.target, text: ref.text, pattern: ref.pattern }))
            );
        }
    }
    const hasRefs = references && (references.explicit?.length > 0 || references.implicit?.length > 0 || references.incoming?.length > 0);
    if (!hasRefs) { elements.referenceContainer.style.display = 'none'; return; }
    elements.referenceContainer.style.display = '';
    let referencesHtml = `<div class="references-header">Cross References</div>`;
    const renderRefList = (title, refs) => {
        if (!refs || refs.length === 0) return '';
        return `<div class="references-section"><h4>${title}</h4><ul>${refs.map(ref => `<li>${ref.targetId || ref.id ? `<a href="#" class="reference-link" data-reference-id="${sanitizeHTML(ref.targetId || ref.id)}">${sanitizeHTML(ref.text || ref.lemma || ref.targetId || ref.id)}</a>` : `<span>${sanitizeHTML(ref.text || ref.lemma)}</span>`}${ref.type ? ` <span class="reference-type">(${sanitizeHTML(ref.type)})</span>` : ''}${ref.label ? ` <span class="reference-label">[${sanitizeHTML(ref.label)}]</span>` : ''}</li>`).join('')}</ul></div>`;
    };
    referencesHtml += renderRefList('Explicit References', references.explicit);
    referencesHtml += renderRefList('Related Terms (Implicit)', references.implicit);
    referencesHtml += renderRefList('Referenced By', references.incoming);
    elements.referenceContainer.innerHTML = referencesHtml;
    document.querySelectorAll('.reference-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const refId = link.getAttribute('data-reference-id');
        if (refId) {
          const targetDictionary = refId.startsWith('ruland_') ? 'ruland' : 'sommerhoff';
          if (targetDictionary !== appState.currentDictionary) {
             switchDictionary(targetDictionary).then(() => selectEntry(refId));
          } else {
              selectEntry(refId);
          }
        }
      });
    });
  }
  
  function getSymbolRenderer() {
    const symbolMap = { mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', sun: '☉', moon: '☽', water: '🜄', fire: '🜂', air: '🜁', earth: '🜃', salt: '🜔', copper: '♀', iron: '♂', tin: '♃', lead: '♄', gold: '☉', silver: '☽', antimony: '♁', sulfur: '🜍', spirit: ' Spiritus' }; // Added fallback text for spirit
    return function(symbolId) {
      if (!symbolId) return '?';
      if (window.dictionaryLoader && typeof window.dictionaryLoader.getSymbolUnicode === 'function') {
        const unicodeChar = window.dictionaryLoader.getSymbolUnicode(symbolId);
        if (unicodeChar !== symbolId || unicodeChar?.length === 1) return unicodeChar; // Use loader if it provides a single char or different value
      }
      if (window.dictionaryLoader?.cache?.symbols?.[symbolId]?.unicode) return window.dictionaryLoader.cache.symbols[symbolId].unicode;
      return symbolMap[symbolId.toLowerCase()] || `(${symbolId})`; // Fallback with ID
    };
  }
  
  function clearEntryDetail() {
    if (!elements.entryDetail) return;
    elements.entryDetail.innerHTML = '<div class="empty-state">Select an entry to view details</div>';
    if (elements.referenceContainer) { elements.referenceContainer.innerHTML = ''; elements.referenceContainer.style.display = 'none'; }
    if (elements.contextInfoContainer) { elements.contextInfoContainer.innerHTML = ''; elements.contextInfoContainer.style.display = 'none'; }
  }
  
  async function handleSearch() {
    if (appState.currentView !== 'explorer') return;
    const searchTerm = elements.searchInput?.value.trim();
    if (!searchTerm) { showError('Please enter a search term'); return; }
    try {
      showLoading(`Searching for "${searchTerm}"...`);
      let results;
      let allResults = {};
      if (appState.showAdvancedFeatures) {
        allResults = await window.dictionaryLoader.searchAcrossDictionaries(searchTerm);
        results = allResults[appState.currentDictionary] || [];
      } else {
        results = await window.dictionaryLoader.searchEntries(appState.currentDictionary, searchTerm);
        allResults[appState.currentDictionary] = results; // Store for potential other dict search
      }
      appState.searchResults = results; // Store results for current dictionary
      appState.currentLetter = null; appState.currentEntry = null; appState.currentPage = null; appState.currentSection = null;
      displaySearchResults(results, searchTerm, allResults);
      clearEntryDetail();
      updateLetterButtons(null);
      hideLoading();
    } catch (error) {
      console.error(`Failed to search for "${searchTerm}":`, error);
      hideLoading();
      showError(`Failed to search for "${searchTerm}". Please try again.`);
    }
  }
  
  function displaySearchResults(results, searchTerm, allResults = null) {
    if (!elements.entriesHeading || !elements.entryList) return;
    elements.entriesHeading.textContent = `Search Results: "${sanitizeHTML(searchTerm)}"`;
    clearEntryList();
    if (!results || !Array.isArray(results)) {
      elements.entryList.innerHTML = '<li class="error">Search results are not available or invalid.</li>'; return;
    }
    if (results.length === 0) {
      elements.entryList.innerHTML = '<li class="empty-state">No results found in this dictionary.</li>';
    } else {
        const fragment = document.createDocumentFragment();
        results.forEach(entry => {
          if (!entry || !entry.id || !entry.lemma) return;
          const entryEl = document.createElement('li'); // Use li for semantic list
          entryEl.className = 'entry-item search-result';
          entryEl.setAttribute('data-entry-id', entry.id);
          entryEl.setAttribute('role', 'button');
          entryEl.setAttribute('tabindex', '0');
          const lemmaEl = document.createElement('div');
          lemmaEl.className = 'entry-lemma';
          lemmaEl.textContent = entry.lemma;
          if (entry.matchType) {
            const matchTypeEl = document.createElement('span');
            matchTypeEl.className = `match-type match-${entry.matchType}`;
            matchTypeEl.textContent = entry.matchType;
            lemmaEl.appendChild(matchTypeEl);
          }
          const previewEl = document.createElement('div');
          previewEl.className = 'entry-preview';
          let previewText = '';
          if (entry.matchType === 'definition' && entry.definition) {
            const lowerDef = entry.definition.toLowerCase(); const lowerTerm = searchTerm.toLowerCase(); const index = lowerDef.indexOf(lowerTerm);
            if (index >= 0) {
                const start = Math.max(0, index - 20); const end = Math.min(lowerDef.length, index + searchTerm.length + 60);
                previewText = (start > 0 ? '...' : '') + entry.definition.substring(start, end) + (end < lowerDef.length ? '...' : '');
            } else previewText = entry.definition.substring(0, 80) + (entry.definition.length > 80 ? '...' : '');
          } else if (entry.matchType === 'translation' && entry.translation) previewText = entry.translation;
          else if (entry.matchType === 'german' && entry.german) previewText = entry.german;
          else if (entry.matchType === 'variant' && entry.variants?.length > 0) previewText = `Variant: ${entry.variants.find(v => v.toLowerCase().includes(searchTerm.toLowerCase())) || entry.variants[0]}`;
          else {
              if (entry.translations?.[0]) previewText = typeof entry.translations[0] === 'string' ? entry.translations[0] : entry.translations[0].text;
              else if (entry.german_text?.[0]) previewText = typeof entry.german_text[0] === 'string' ? entry.german_text[0] : entry.german_text[0].text;
              else if (entry.definition) previewText = entry.definition.substring(0, 80) + (entry.definition.length > 80 ? '...' : '');
          }
          previewEl.innerHTML = previewText ? sanitizeHTML(previewText).replace(new RegExp(`(${sanitizeHTML(searchTerm)})`, 'gi'), '<mark>$1</mark>') : 'No preview available';
          const sourceEl = document.createElement('div');
          sourceEl.className = 'entry-source';
          sourceEl.textContent = entry.source === 'ruland' ? 'Ruland (1612)' : 'Sommerhoff (1701)';
          entryEl.appendChild(lemmaEl); entryEl.appendChild(previewEl); entryEl.appendChild(sourceEl);
          entryEl.addEventListener('click', () => {
            if (entry.source !== appState.currentDictionary) switchDictionary(entry.source).then(() => selectEntry(entry.id));
            else selectEntry(entry.id);
          });
          entryEl.addEventListener('keypress', (e) => { if (e.key === 'Enter' || e.key === ' ') {
            if (entry.source !== appState.currentDictionary) switchDictionary(entry.source).then(() => selectEntry(entry.id));
            else selectEntry(entry.id);
          }});
          fragment.appendChild(entryEl);
        });
        elements.entryList.appendChild(fragment);
    }
    if (appState.showAdvancedFeatures && allResults) {
      const summaryEl = document.createElement('div');
      summaryEl.className = 'search-summary';
      const matchTypeCounts = {};
      results.forEach(result => { if (result.matchType) matchTypeCounts[result.matchType] = (matchTypeCounts[result.matchType] || 0) + 1; });
      const matchTypeText = Object.entries(matchTypeCounts).map(([type, count]) => `${type}: ${count}`).join(', ');
      summaryEl.textContent = `Found ${results.length} results in ${appState.currentDictionary === 'ruland' ? 'Ruland' : 'Sommerhoff'} (${matchTypeText || 'various match types'}). `;
      const otherDict = appState.currentDictionary === 'ruland' ? 'sommerhoff' : 'ruland';
      const otherDictLabel = otherDict === 'ruland' ? 'Ruland' : 'Sommerhoff';
      const otherResultsCount = allResults[otherDict]?.length || 0;
      if (otherResultsCount > 0) {
          const searchOtherBtn = document.createElement('button');
          searchOtherBtn.className = 'search-other-btn';
          searchOtherBtn.textContent = `View ${otherResultsCount} results in ${otherDictLabel}`;
          searchOtherBtn.addEventListener('click', () => {
              switchDictionary(otherDict).then(() => {
                  if(elements.searchInput) elements.searchInput.value = searchTerm; // Keep search term
                  handleSearch(); // Re-run search in the new dictionary
              });
          });
          summaryEl.appendChild(searchOtherBtn);
      } else {
          const noOtherResultsSpan = document.createElement('span');
          noOtherResultsSpan.textContent = `No results found in ${otherDictLabel}.`;
          summaryEl.appendChild(noOtherResultsSpan);
      }
      elements.entryList.insertBefore(summaryEl, elements.entryList.firstChild);
    }
  }
  
  async function compareEntry(lemma) {
    if (!lemma) { showError('Cannot compare: term (lemma) is missing'); return; }
    if (!elements.comparisonView || !elements.rulandComparisonContent || !elements.sommerhoffComparisonContent) { console.error("Comparison view elements not found."); return; }
    try {
      showLoading(`Comparing term "${lemma}"...`);
      let rulandResults, sommerhoffResults;
      if (appState.showAdvancedFeatures) {
        const searchResults = await window.dictionaryLoader.searchAcrossDictionaries(lemma, { limit: 5 }); // Limit search
        rulandResults = searchResults.ruland || [];
        sommerhoffResults = searchResults.sommerhoff || [];
      } else {
        rulandResults = await window.dictionaryLoader.searchEntries('ruland', lemma, { limit: 5 });
        sommerhoffResults = await window.dictionaryLoader.searchEntries('sommerhoff', lemma, { limit: 5 });
      }
      const rulandEntry = findBestMatch(rulandResults, lemma);
      const sommerhoffEntry = findBestMatch(sommerhoffResults, lemma);
      // Fetch full entry details for comparison
      const [fullRulandEntry, fullSommerhoffEntry] = await Promise.all([
          rulandEntry ? window.dictionaryLoader.getEntry('ruland', rulandEntry.id) : Promise.resolve(null),
          sommerhoffEntry ? window.dictionaryLoader.getEntry('sommerhoff', sommerhoffEntry.id) : Promise.resolve(null)
      ]);
      displayComparison(fullRulandEntry, fullSommerhoffEntry, lemma);
      hideLoading();
    } catch (error) {
      console.error(`Failed to compare entry "${lemma}":`, error);
      hideLoading();
      showError(`Failed to prepare comparison for "${lemma}". Please try again.`);
    }
  }
  
  function findBestMatch(results, lemma) {
    if (!results || !Array.isArray(results) || results.length === 0) return null;
    const lowerLemma = lemma.toLowerCase();
    const exactMatch = results.find(entry => entry?.lemma?.toLowerCase() === lowerLemma);
    if (exactMatch) return exactMatch;
    return results[0]; // Fallback to first result
  }
  
  function displayComparison(rulandEntry, sommerhoffEntry, lemma) {
    if (!elements.comparisonView || !elements.rulandComparisonContent || !elements.sommerhoffComparisonContent) { console.error("Comparison view content elements not found."); return; }
    const safeLemma = sanitizeHTML(lemma || 'Unknown Term');
    const renderComparisonContent = (entry, dictionaryName, originalLemma) => {
      if (!entry) return `<div class="empty-state">No equivalent entry found for "${originalLemma}" in ${dictionaryName}'s dictionary.</div>`;
      const getSymbolDisplay = getSymbolRenderer();
      return `
        <h4 class="lemma">${sanitizeHTML(entry.lemma)}</h4>
        ${entry.lemma_type && entry.lemma_type !== 'lemma' ? `<div class="lemma-type">(${entry.lemma_type})</div>` : ''}
        ${Array.isArray(entry.variants) && entry.variants.length > 0 ? `<div class="variants"><strong>Variants:</strong> ${entry.variants.map(v => sanitizeHTML(typeof v === 'string' ? v : v.text || '')).join(', ')}</div>` : ''}
        ${entry.forms && Array.isArray(entry.forms) && entry.forms.length > 1 ? `<div class="forms"><strong>Forms:</strong><ul>${entry.forms.filter(f => f.type !== 'lemma').map(form => `<li><span class="form-type">${form.type}:</span> <span class="form-text">${sanitizeHTML(form.text)}</span>${form.symbols?.length > 0 ? ` <span class="form-symbols">${form.symbols.map(s => getSymbolDisplay(s)).join(' ')}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
        <div class="definition" lang="la">${sanitizeHTML(entry.definition || 'No definition available')}</div>
        ${entry.explicit_definitions?.length > 0 ? `<div class="explicit-definitions"><strong>Explicit Definitions:</strong><ul>${entry.explicit_definitions.map(def => `<li>${sanitizeHTML(def)}</li>`).join('')}</ul></div>` : ''}
        ${entry.sense_texts?.length > 0 ? `<div class="sense-texts"><strong>Sense Texts:</strong><ul>${entry.sense_texts.map(sense => `<li>${sanitizeHTML(sense)}</li>`).join('')}</ul></div>` : ''}
        ${entry.sense_data?.length > 0 ? `<div class="sense-data"><strong>Sense Data:</strong><ul>${entry.sense_data.map(sense => `<li>${sanitizeHTML(sense.text)}${sense.symbols?.length > 0 ? ` <span class="sense-symbols">${sense.symbols.map(s => getSymbolDisplay(s)).join(' ')}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
        ${renderTranslations(entry)}
        ${renderSymbols(entry, getSymbolDisplay)}
        ${renderNotes(entry)}
        ${entry.context?.page ? `<div class="context-info"><strong>Page:</strong> ${entry.context.page.n}</div>` : ''}
        ${entry.references?.length > 0 ? `<div class="references"><strong>References:</strong><ul>${entry.references.map(ref => `<li>${sanitizeHTML(ref.text || ref.target)}</li>`).join('')}</ul></div>` : ''}
        ${entry.textual_references?.length > 0 ? `<div class="textual-references"><strong>Textual References:</strong><ul>${entry.textual_references.map(ref => `<li>${sanitizeHTML(ref.text || ref.pattern)}</li>`).join('')}</ul></div>` : ''}`;
    };
    elements.rulandComparisonContent.innerHTML = renderComparisonContent(rulandEntry, 'Ruland (1612)', safeLemma);
    elements.sommerhoffComparisonContent.innerHTML = renderComparisonContent(sommerhoffEntry, 'Sommerhoff (1701)', safeLemma);
    elements.comparisonView.classList.add('active');
    elements.closeComparisonBtn?.focus();
  }
  
  function hideComparisonView() {
    elements.comparisonView?.classList.remove('active');
  }
  
  function sanitizeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }
  
  function showLoading(message) {
    if (appState.isLoading) {
      if (elements.loadingMessage) elements.loadingMessage.textContent = message || 'Loading...'; return;
    }
    appState.isLoading = true;
    if (elements.loadingMessage) elements.loadingMessage.textContent = message || 'Loading...';
    if (elements.loadingOverlay) elements.loadingOverlay.classList.add('active');
  }
  
  function hideLoading() {
    if (!appState.isLoading) return;
    appState.isLoading = false;
    if (elements.loadingOverlay) elements.loadingOverlay.classList.remove('active');
  }
  
  function showError(message) {
    hideLoading();
    appState.lastError = message; // Store basic error message
    if (elements.errorText) elements.errorText.textContent = message || 'An unknown error occurred.';
    if (elements.errorMessage) {
      elements.errorMessage.classList.add('active');
      elements.errorCloseBtn?.focus();
    } else {
      console.error(message || 'An unknown error occurred.'); alert(message || 'An unknown error occurred.');
    }
  }
  
  function hideError() {
    if (elements.errorMessage) elements.errorMessage.classList.remove('active');
    appState.lastError = null;
  }
  
  function retryOperation() {
    console.log("Attempting to retry last operation...");
    hideError();
    showLoading("Retrying operation..."); // Add loading indicator for retry
  
    // Simple retry: re-initialize or reload current view/item
    if (appState.currentView === 'dashboard') {
      if (typeof renderDashboard === 'function') renderDashboard(elements.dashboardContent);
      else hideLoading();
    } else if (appState.currentEntry) {
      selectEntry(appState.currentEntry);
    } else if (appState.searchResults.length > 0 && elements.searchInput?.value) {
      handleSearch(); // Retry search
    } else if (appState.currentPage) {
      navigateToPage(appState.currentPage);
    } else if (appState.currentSection) {
      navigateToSection(appState.currentSection);
    } else if (appState.currentLetter) {
      selectLetter(appState.currentLetter);
    } else {
      // Fallback: re-switch to current dictionary or re-init
      switchDictionary(appState.currentDictionary);
    }
  }
  
  document.addEventListener('DOMContentLoaded', initializeApp);