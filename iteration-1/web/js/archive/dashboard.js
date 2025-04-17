/**
 * Alchemical Dictionaries Explorer - Dashboard View Logic
 * Displays summary statistics and information about the dictionaries.
 */

/**
 * Initializes the dashboard module (if needed).
 * Currently, just logs initialization.
 */
async function initializeDashboard() {
    console.log("Dashboard initializing...");
    // Add any one-time setup for the dashboard here if necessary
}

/**
 * Renders the dashboard content into the provided parent element.
 * Fetches data from the dictionaryLoader.
 * @param {HTMLElement} parentElement - The container element for the dashboard view.
 */
async function renderDashboard(parentElement) {
    if (!parentElement) {
        console.error("Dashboard render target element not found.");
        return;
    }

    console.log("Rendering dashboard...");
    parentElement.innerHTML = '<div class="loading">Loading dashboard data...</div>'; // Show loading state

    // Use the correct global loader instance
    const loader = window.dictionaryLoader;

    if (!loader || !loader.initialized) {
        parentElement.innerHTML = '<div class="error">Data loader not initialized. Cannot display dashboard.</div>';
        console.error("Dashboard Error: dictionaryLoader not available or not initialized.");
        return;
    }

    // Get the currently selected dictionary from the app state
    const currentDictionary = window.appState?.currentDictionary || 'ruland'; // Default to 'ruland' if state unavailable

    try {
        // Fetch necessary data concurrently
        const [metadata, letterIndex, symbolsData] = await Promise.all([
            loader.loadMetadata(),
            loader.loadLetterIndex(currentDictionary),
            loader.loadSymbols() // Load symbols, mostly relevant for Sommerhoff stats
        ]);

        // Check if critical data is missing after loading
        if (!metadata || !letterIndex) {
            throw new Error("Failed to load essential dashboard data (metadata or letter index).");
        }

        // --- Prepare Data for Display ---
        const dictMeta = metadata[currentDictionary];
        const dictName = currentDictionary === 'ruland' ? 'Ruland (1612)' : 'Sommerhoff (1701)';
        const totalEntries = letterIndex.totalEntries || 'N/A';
        const letterCount = Object.keys(letterIndex.letters || {}).filter(l => letterIndex.letters[l]?.count > 0).length;

        let symbolCount = 'N/A';
        if (currentDictionary === 'sommerhoff' && symbolsData) {
            symbolCount = Object.keys(symbolsData).length;
        }

        // --- Generate Dashboard HTML ---
        let dashboardHTML = `
            <h2>${dictName} - Dashboard</h2>
            <div class="dashboard-grid">
                <div class="dashboard-card">
                    <h3>Dictionary Info</h3>
                    <p><strong>Title:</strong> ${sanitizeHTML(dictMeta?.title || 'N/A')}</p>
                    <p><strong>Author:</strong> ${sanitizeHTML(dictMeta?.author || 'N/A')}</p>
                    <p><strong>Year:</strong> ${dictMeta?.year || 'N/A'}</p>
                </div>

                <div class="dashboard-card">
                    <h3>Content Overview</h3>
                    <p><strong>Total Entries:</strong> ${totalEntries.toLocaleString()}</p>
                    <p><strong>Letters with Entries:</strong> ${letterCount}</p>
                    ${currentDictionary === 'sommerhoff' ? `<p><strong>Defined Symbols:</strong> ${symbolCount}</p>` : ''}
                </div>

                <div class="dashboard-card">
                    <h3>Letter Distribution (Top 5)</h3>
                    ${renderLetterDistribution(letterIndex)}
                </div>

                ${currentDictionary === 'sommerhoff' ? `
                <div class="dashboard-card">
                    <h3>Symbol Information</h3>
                    <p>Basic symbol data loaded. Further analysis could be added here.</p>
                    <p>Total Symbols Found: ${symbolCount}</p>
                    </div>` : ''}
            </div>
        `;

        parentElement.innerHTML = dashboardHTML;

    } catch (error) {
        console.error("Failed to render dashboard:", error);
        parentElement.innerHTML = `<div class="error">Could not load dashboard data for ${currentDictionary}. Error: ${error.message}</div>`;
        // Store error in app state if needed
        if(window.appState) window.appState.lastError = error;
    }
}

/**
 * Helper function to render a simple list of top letters by entry count.
 * @param {object} letterIndex - The loaded letter index data.
 * @returns {string} HTML string for the letter distribution list.
 */
function renderLetterDistribution(letterIndex) {
    if (!letterIndex || !letterIndex.letters) {
        return "<p>Letter distribution data not available.</p>";
    }

    try {
        const sortedLetters = Object.entries(letterIndex.letters)
            .filter(([letter, data]) => data && data.count > 0)
            .sort(([, a], [, b]) => b.count - a.count) // Sort descending by count
            .slice(0, 5); // Take top 5

        if (sortedLetters.length === 0) {
            return "<p>No letter data found.</p>";
        }

        let listHTML = "<ul>";
        sortedLetters.forEach(([letter, data]) => {
            listHTML += `<li>${letter}: ${data.count.toLocaleString()} entries</li>`;
        });
        listHTML += "</ul>";
        return listHTML;
    } catch (e) {
        console.error("Error rendering letter distribution:", e);
        return "<p>Error displaying letter distribution.</p>";
    }
}

/**
* Basic HTML Sanitizer (reuse from app.js or define locally if needed)
* IMPORTANT: For production, use a robust library like DOMPurify.
*/
function sanitizeHTML(str) {
  if (!str || typeof str !== 'string') return '';
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// Ensure functions are available globally if called directly by app.js
window.initializeDashboard = initializeDashboard;
window.renderDashboard = renderDashboard;