/**
 * Alchemical Dictionary Browser - UI Logic
 * Handles dictionary/letter selection and displays entries.
 *
 * ENHANCED: renderEntryDetail function to display more fields.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const dictionarySelect = document.getElementById('dictionary-select');
    const letterSelector = document.getElementById('letter-selector');
    const entryListContainer = document.getElementById('entry-list'); // Target the inner div
    const entryListUl = entryListContainer.querySelector('ul');
    const entryDetailContainer = document.getElementById('entry-detail');
    const statusIndicator = document.getElementById('status-indicator');
    const currentLetterSpan = document.getElementById('current-letter');
    const body = document.body;

    // --- State ---
    let currentDictionary = null;
    let currentLetter = null;
    let isLoaderInitialized = false;
    let isLoading = false; // Track loading state for UI feedback

    // --- Initialization ---

    // 1. Instantiate Loader (Ensure config is defined before this script)
    if (typeof DictionaryDataLoader !== 'undefined' && typeof config !== 'undefined') {
        window.dictionaryLoader = new DictionaryDataLoader(config);
    } else {
        updateStatus('Error: Loader script or config missing.', true);
        console.error("DictionaryDataLoader class or config object not found.");
        return; // Stop if loader can't be created
    }

    // 2. Initialize Loader and then UI
    async function initializeApp() {
        try {
            updateStatus('Initializing data loader...');
            const success = await window.dictionaryLoader.initialize();
            if (success) {
                isLoaderInitialized = true;
                updateStatus('Loader initialized. Setting up UI...');
                setupUI();
                updateStatus('Ready.', false); // Clear status after setup
            } else {
                updateStatus('Data loader initialization failed. Please check console.', true);
            }
        } catch (error) {
            updateStatus('Critical error during initialization. Check console.', true);
            console.error("Initialization error:", error);
        }
    }

    // 3. Setup UI elements after loader is ready
    function setupUI() {
        // Populate Dictionary Selector
        dictionarySelect.innerHTML = ''; // Clear "Loading..."
        if (window.dictionaryLoader.cache.metadata) {
            const metadata = window.dictionaryLoader.cache.metadata;
            for (const dictKey in metadata) {
                if (metadata[dictKey] && typeof metadata[dictKey] === 'object' && metadata[dictKey].title) {
                    const option = document.createElement('option');
                    option.value = dictKey;
                    // Add year to the display text
                    option.textContent = `${metadata[dictKey].title} (${metadata[dictKey].year})`;
                    dictionarySelect.appendChild(option);
                }
            }
            // Set initial dictionary (e.g., Ruland) and trigger selects
            currentDictionary = dictionarySelect.value || 'ruland'; // Default to ruland if available
             dictionarySelect.value = currentDictionary; // Ensure dropdown reflects state
             generateLetterButtons(); // Generate letters for the initial dictionary
             // Optionally load default letter
             handleLetterSelect('A'); // Load 'A' by default
        } else {
            updateStatus('Error: Metadata not loaded. Cannot populate dictionaries.', true);
        }

        // Add Event Listeners
        dictionarySelect.addEventListener('change', handleDictionarySelect);
        letterSelector.addEventListener('click', handleLetterButtonClick); // Use event delegation
        entryListUl.addEventListener('click', handleEntryListClick); // Use event delegation
    }

    // --- UI Update Functions ---

    function setLoadingState(loading) {
        isLoading = loading;
        if (loading) {
            body.classList.add('loading');
            updateStatus('Loading data...');
        } else {
            body.classList.remove('loading');
            updateStatus('Ready.', false); // Clear loading message
        }
    }

    function updateStatus(message, isError = false) {
        statusIndicator.textContent = message;
        statusIndicator.style.color = isError ? '#dc3545' : '#555';
        // Only log actual errors or significant status changes to console
        if (isError || message.includes('Initializing') || message.includes('failed')) {
             console.log(`Status: ${message}`);
             if (isError) console.error(message);
        }
    }

    function generateLetterButtons() {
        letterSelector.innerHTML = ''; // Clear previous buttons
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const letterIndex = window.dictionaryLoader.cache.letterIndexes[currentDictionary];

        if (!letterIndex) {
            updateStatus(`Error: Letter index for ${currentDictionary} not available.`, true);
            return;
        }

        alphabet.forEach(letter => {
            const button = document.createElement('button');
            button.textContent = letter;
            button.dataset.letter = letter;
            // Disable button if no entries for that letter
            const hasEntries = letterIndex.letters[letter] && letterIndex.letters[letter].count > 0;
            button.disabled = !hasEntries;
            letterSelector.appendChild(button);
        });
         // Highlight the currently active letter button if applicable
         updateActiveLetterButton();
    }

     function updateActiveLetterButton() {
         const buttons = letterSelector.querySelectorAll('button');
         buttons.forEach(button => {
             if (button.dataset.letter === currentLetter) {
                 button.classList.add('active');
             } else {
                 button.classList.remove('active');
             }
         });
         currentLetterSpan.textContent = currentLetter || ''; // Update list header
     }

    function updateSelectedEntryHighlight(selectedLi) {
        entryListUl.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
        if (selectedLi) {
             selectedLi.classList.add('selected');
        }
    }


    // --- Event Handlers ---

    function handleDictionarySelect(event) {
        if (isLoading) return;
        currentDictionary = event.target.value;
        currentLetter = null; // Reset letter when dictionary changes
        updateStatus(`Selected dictionary: ${currentDictionary}`);
        entryListUl.innerHTML = ''; // Clear entry list
        entryDetailContainer.innerHTML = '<p>Select a letter.</p>'; // Clear detail view
        generateLetterButtons(); // Regenerate buttons for the new dictionary's index
        updateActiveLetterButton();
        // Optionally auto-select 'A' for the new dictionary
         handleLetterSelect('A');
    }

    function handleLetterButtonClick(event) {
        if (isLoading || !event.target.matches('button')) return; // Only handle button clicks
        const letter = event.target.dataset.letter;
        if (letter && !event.target.disabled) {
            handleLetterSelect(letter);
        }
    }

    function handleEntryListClick(event) {
        if (isLoading) return;
        const targetLi = event.target.closest('li'); // Find the clicked list item
        if (targetLi && targetLi.dataset.entryId) {
            const entryId = targetLi.dataset.entryId;
            updateSelectedEntryHighlight(targetLi); // Highlight selection
            handleEntrySelect(entryId);
        }
    }


    // --- Data Loading and Display Logic ---

    async function handleLetterSelect(letter) {
        if (!isLoaderInitialized || !currentDictionary || letter === currentLetter || isLoading) {
            return; // Prevent redundant loads
        }
        currentLetter = letter;
        updateStatus(`Loading entries for letter: ${letter}`);
        setLoadingState(true);
        entryListUl.innerHTML = '<li><i>Loading entries...</i></li>'; // Clear previous list
        entryDetailContainer.innerHTML = '<p>Select an entry from the list.</p>'; // Reset detail view
        updateActiveLetterButton();


        try {
            // Ensure loadLetterEntries exists and works
             if (!window.dictionaryLoader.loadLetterEntries) {
                 throw new Error("loadLetterEntries method is missing from the data loader.");
             }
            const letterData = await window.dictionaryLoader.loadLetterEntries(currentDictionary, currentLetter);
            displayEntries(letterData?.entries || []);
        } catch (error) {
            updateStatus(`Error loading entries for ${currentLetter}: ${error.message}`, true);
            entryListUl.innerHTML = `<li><i>Error loading entries. Check console.</i></li>`;
        } finally {
            setLoadingState(false);
        }
    }

    function displayEntries(entries) {
        entryListUl.innerHTML = ''; // Clear loading message
        if (!entries || entries.length === 0) {
            entryListUl.innerHTML = '<li><i>No entries found for this letter.</i></li>';
            return;
        }

        // Sort entries alphabetically by lemma (case-insensitive)
        entries.sort((a, b) => (a.lemma || '').localeCompare(b.lemma || '', undefined, { sensitivity: 'base' }));

        entries.forEach(entry => {
            if (!entry || !entry.id || !entry.lemma) return; // Skip invalid entries
            const li = document.createElement('li');
            li.textContent = entry.lemma;
            li.dataset.entryId = entry.id;
            entryListUl.appendChild(li);
        });
    }

    async function handleEntrySelect(entryId) {
        if (!isLoaderInitialized || !currentDictionary || isLoading) return;
        updateStatus(`Loading details for entry: ${entryId}`);
        setLoadingState(true);
        entryDetailContainer.innerHTML = '<i>Loading details...</i>';

        try {
             // Ensure getEntry method exists
             if (!window.dictionaryLoader.getEntry) {
                  throw new Error("getEntry method is missing from the data loader.");
             }
            const entry = await window.dictionaryLoader.getEntry(currentDictionary, entryId);
            if (entry) {
                renderEntryDetail(entry);
            } else {
                updateStatus(`Entry details not found for ${entryId}.`, true);
                entryDetailContainer.innerHTML = `<p>Could not load details for entry ID: ${entryId}</p>`;
            }
        } catch (error) {
            updateStatus(`Error loading entry details for ${entryId}: ${error.message}`, true);
            entryDetailContainer.innerHTML = `<p>Error loading details. Check console.</p>`;
        } finally {
            setLoadingState(false);
        }
    }

    // --- Rendering Functions ---

    /**
     * Renders the full details of a dictionary entry into the detail pane.
     * @param {object} entry - The entry object loaded from the JSON data.
     */
    function renderEntryDetail(entry) {
        if (!entry || !entry.id) { // Check for valid entry object
            entryDetailContainer.innerHTML = '<p>Error: Invalid entry data provided.</p>';
            console.error("Render Error: Invalid entry object passed:", entry);
            return;
        }

        let html = `<h3>${escapeHtml(entry.lemma || 'N/A')}</h3>`;
        html += `<p><small>ID: ${escapeHtml(entry.id)}</small>`;
        // Display page number if available
        if (entry.context?.page?.n) {
            html += ` | <small>Page: ${escapeHtml(entry.context.page.n)}</small>`;
        }
         html += `</p>`;


        // Definition
        if (entry.definition) {
            html += `<div class="label">Definition:</div>`;
            // Basic handling: treat as text. Replace potential newlines with <br>
            // More advanced rendering would require parsing structured content if present.
            const definitionText = escapeHtml(entry.definition).replace(/\n/g, '<br>');
            html += `<div class="definition">${definitionText}</div>`;
        } else {
             html += `<div class="definition"><i>No definition provided.</i></div>`;
        }

        // Variants
        if (entry.variants && Array.isArray(entry.variants) && entry.variants.length > 0) {
            html += `<div class="label">Variants:</div>`;
            html += `<div class="variants">${entry.variants.map(v => escapeHtml(v)).join(', ')}</div>`;
        }

        // Translations (assuming array of strings or objects with 'text' property)
        if (entry.translations && Array.isArray(entry.translations) && entry.translations.length > 0) {
             html += `<div class="label">Translations / Related:</div>`;
             const transHtml = entry.translations
                .map(t => escapeHtml(typeof t === 'string' ? t : t?.text || ''))
                .filter(t => t) // Filter out empty strings
                .join('<br>');
             html += `<div class="translations">${transHtml || 'N/A'}</div>`;
        }

         // German Text (assuming array of strings or objects with 'text' property)
         if (entry.german_text && Array.isArray(entry.german_text) && entry.german_text.length > 0) {
              html += `<div class="label">German Text:</div>`;
              const germanHtml = entry.german_text
                 .map(t => escapeHtml(typeof t === 'string' ? t : t?.text || ''))
                 .filter(t => t) // Filter out empty strings
                 .join('<br>');
              html += `<div class="translations">${germanHtml || 'N/A'}</div>`; // Reuse styling
         }

        // Symbols (Check source and data)
        if (entry.source === 'sommerhoff' && entry.symbols && Array.isArray(entry.symbols) && entry.symbols.length > 0) {
            // Check if getSymbolUnicode method is available
            const canGetSymbolInfo = typeof window.dictionaryLoader.getSymbolInfo === 'function';
            const canGetSymbolUnicode = typeof window.dictionaryLoader.getSymbolUnicode === 'function';

            if (canGetSymbolUnicode) {
                 html += `<div class="label">Symbols:</div>`;
                 html += `<div class="symbols">`;
                 entry.symbols.forEach(symbolData => {
                     // Handle both string IDs and objects like {id: ...}
                     const symbolId = typeof symbolData === 'string' ? symbolData : symbolData?.id;
                     if (symbolId) {
                         const unicodeChar = window.dictionaryLoader.getSymbolUnicode(symbolId);
                         let title = symbolId; // Default title is the ID
                         // Try to get more detailed info for the tooltip if available
                         if (canGetSymbolInfo) {
                             const symbolInfo = window.dictionaryLoader.getSymbolInfo(symbolId);
                             if (symbolInfo) {
                                title = `${symbolInfo.name || symbolId}${symbolInfo.description ? `\n${symbolInfo.description}` : ''}`;
                             }
                         }
                         // Render the symbol (or ?) with a tooltip
                         html += `<span class="symbol" title="${escapeHtml(title)}">${unicodeChar || '?'}</span>`;
                     }
                 });
                 html += `</div>`;
             } else {
                 console.warn("getSymbolUnicode method missing, cannot render symbols.");
             }
        }

        // References (Explicit links from 'references' array)
        if (entry.references && Array.isArray(entry.references) && entry.references.length > 0) {
             html += `<div class="label">See Also (Explicit):</div>`;
             html += `<ul class="references">`;
             entry.references.forEach(ref => {
                 // Make the target ID clickable if we want to implement navigation later
                 const targetLink = ref.target ? ` (Target: ${escapeHtml(ref.target)})` : '';
                 html += `<li>${escapeHtml(ref.text || ref.label || ref.target || 'Unknown Reference')}${targetLink}</li>`;
             });
             html += `</ul>`;
        }

         // Textual References (Links found via patterns)
         if (entry.textual_references && Array.isArray(entry.textual_references) && entry.textual_references.length > 0) {
              html += `<div class="label">See Also (Textual):</div>`;
              html += `<ul class="references">`;
              entry.textual_references.forEach(ref => {
                 const targetLink = ref.target ? ` (Target: ${escapeHtml(ref.target)})` : '';
                  html += `<li>Found: "${escapeHtml(ref.text || ref.pattern || '?')}"${targetLink}</li>`;
              });
              html += `</ul>`;
         }


        entryDetailContainer.innerHTML = html;
    }

    // Simple HTML escaping function
    function escapeHtml(unsafe) {
        if (unsafe === null || typeof unsafe === 'undefined') return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // --- Start the Application ---
    initializeApp();

}); // End DOMContentLoaded