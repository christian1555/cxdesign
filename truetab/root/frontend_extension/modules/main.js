// main.js
window.TrueTab = window.TrueTab || {};

// Initialize DOM references first
const gridContainer = document.getElementById('gridContainer');
window.TrueTab.gridContainer = gridContainer;

function initialize() {
    // Clear the clearing flag if it exists (after reload from Clear All)
    sessionStorage.removeItem('truetab-clearing');

    // Load saved widgets and render
    const hadSavedWidgets = !!localStorage.getItem('truetab-widgets');
    window.TrueTab.loadWidgets();
    window.TrueTab.rebuildWidgetCache();
    window.TrueTab.loadAppearanceSettings();

    // Apply font normalization after appearance settings are loaded
    if (window.TrueTab.applyGlobalFontNormalization) {
        window.TrueTab.applyGlobalFontNormalization().catch(err => {
            console.error('Initial font normalization failed:', err);
        });
    }

    window.TrueTab.updateGridColumns();

    // Store current theme after appearance settings are loaded
    window.TrueTab.currentTheme = window.TrueTab.appearanceSettings.background;

    // Try to load saved layout for this viewport
    if (!window.TrueTab.loadLayoutMemory()) {
        // Only reflow if we had saved widgets (meaning positions might be stale)
        // If no saved widgets, use the default layout from code
        if (hadSavedWidgets) {
            window.TrueTab.reflowWidgets();
        } else {
            window.TrueTab.renderWidgets();
        }
    } else {
        window.TrueTab.renderWidgets();
    }

    // Initialize grid dimensions after layout is loaded
    window.TrueTab.previousCols = window.TrueTab.getGridDimensions().cols;

    // Initialize authentication and UI
    window.TrueTab.initializeAuthUI();

    // Verify existing token and load user if authenticated
    window.TrueTab.initAuth().then(isAuth => {
        if (isAuth) {
            const user = window.TrueTab.getCurrentUser();
            window.TrueTab.updateProfileUI(user);
            window.TrueTab.populateAccountInfo(user);
        } else {
            window.TrueTab.updateProfileUI(null);
        }
        window.TrueTab.updateCloudSaveUI();
    });

    const singleAppIconInput = document.getElementById('singleAppIconInput');
    if (window.IconifyPicker && singleAppIconInput) {
        new window.IconifyPicker(singleAppIconInput, { showLabels: true });
    }

    // Handle window resize with automatic reflow
    let resizeTimeout;
    let isResizing = false;

    window.addEventListener('resize', () => {
        // Mark that we're actively resizing
        isResizing = true;
        clearTimeout(resizeTimeout);

        // Get current grid dimensions
        const currentDimensions = window.TrueTab.getGridDimensions();
        const currentCols = currentDimensions.cols;
        const currentRows = currentDimensions.rows;
        const previousCols = window.TrueTab.previousCols || currentCols;

        // If columns changed, immediately update grid template to match new dimensions
        // This prevents visual overlaps during resize
        if (currentCols !== previousCols) {
            window.TrueTab.updateGridColumns();

            // For rapid/large viewport changes, reflow immediately to prevent overlaps
            // Only wait for the debounced reflow if it's a small change
            const colsDiff = Math.abs(currentCols - previousCols);
            if (colsDiff >= 2) {
                // Large change - reflow immediately
                if (!window.TrueTab.loadLayoutMemory()) {
                    window.TrueTab.reflowWidgets();
                } else {
                    window.TrueTab.renderWidgets();
                }
                window.TrueTab.previousCols = currentCols;
                isResizing = false;
                return;
            }
        }

        // Debounced reflow for smaller changes
        resizeTimeout = setTimeout(() => {
            const newDimensions = window.TrueTab.getGridDimensions();
            const newCols = newDimensions.cols;

            // Only reflow if columns actually changed since we started debouncing
            if (newCols !== window.TrueTab.previousCols) {
                window.TrueTab.updateGridColumns();
                // Try to load saved layout for this viewport first
                // Only reflow if no saved layout exists
                if (!window.TrueTab.loadLayoutMemory()) {
                    window.TrueTab.reflowWidgets();
                } else {
                    window.TrueTab.renderWidgets();
                }
                window.TrueTab.previousCols = newCols;
            }
            isResizing = false;
        }, 100);
    });

    document.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('search-input')) {
            e.preventDefault();
            const widget = e.target.closest('.widget');
            if (widget && window.TrueTab.widgets.search) {
                window.TrueTab.widgets.search.submit(widget, e.target.value);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initialize);