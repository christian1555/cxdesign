// settings.js
window.TrueTab = window.TrueTab || {};

let settingsModal;
let addWidgetModal;
let widgetSettingsPopup;

// Initialize preferredGridPosition on window.TrueTab directly
window.TrueTab.preferredGridPosition = null;

// Store reference to IconifyPicker instances
let addAppIconifyPicker = null;
let editAppIconifyPickerInstance = null;

// Store current single app icon selection
let currentSingleAppIcon = null;

// Store modal position and size for repositioning
let modalPositionCache = {
    widgetSettings: { left: 0, top: 0, width: 280 },
    addWidget: { left: 0, top: 0, width: 280 }
};

// MutationObserver for dynamic boundary detection
let modalContentObserver = null;

// ============================================
// REUSABLE COMPONENT BUILDER FUNCTIONS
// ============================================

/**
 * Build an Apple-like toggle switch
 * @param {string} id - The ID for the checkbox input
 * @param {string} label - The label text
 * @param {boolean} checked - Whether the switch is checked
 * @returns {string} HTML string for the toggle switch
 */
function buildCheckbox(id, label, checked = false) {
    return `
        <div class="settings-menu-item">
            <label for="${id}">${label}</label>
            <label class="apple-switch">
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                <span class="apple-switch-slider"></span>
            </label>
        </div>
    `;
}

/**
 * Build a single-line text input field
 * @param {string} id - The ID for the input
 * @param {string} label - The label text
 * @param {string} value - The current value
 * @param {string} placeholder - Placeholder text (optional)
 * @returns {string} HTML string for the text input
 */
function buildTextInput(id, label, value = '', placeholder = '') {
    return `
        <div class="settings-menu-item">
            <label for="${id}">${label}</label>
            <input type="text" id="${id}" class="settings-input" value="${value}" placeholder="${placeholder}">
        </div>
    `;
}

/**
 * Build a single-line dropdown select
 * @param {string} id - The ID for the select
 * @param {string} label - The label text
 * @param {string} value - The current value
 * @param {Array} options - Array of {value, label} objects
 * @returns {string} HTML string for the dropdown
 */
function buildDropdown(id, label, value, options) {
    const optionsHTML = options.map(opt =>
        `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');

    return `
        <div class="settings-menu-item">
            <label for="${id}">${label}</label>
            <select id="${id}" class="settings-select">
                ${optionsHTML}
            </select>
        </div>
    `;
}

/**
 * Build a single-line file input
 * @param {string} id - The ID for the file input
 * @param {string} label - The label text
 * @param {string} buttonText - Text to show on the button (optional)
 * @returns {string} HTML string for the file input
 */
function buildFileInput(id, label, buttonText = 'Choose File') {
    return `
        <div class="settings-file-input-wrapper">
            <input type="file" id="${id}" class="settings-file-input" accept="image/*">
            <label for="${id}" class="settings-file-label">${buttonText}</label>
        </div>
    `;
}

/**
 * Build a single-line slider with value display
 * @param {string} id - The ID for the range input
 * @param {string} label - The label text
 * @param {number} value - The current value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} step - Step increment (optional, default 1)
 * @returns {string} HTML string for the slider
 */
function buildSlider(id, label, value, min, max, step = 1) {
    const fill = ((value - min) / (max - min)) * 100;
    return `
        <div class="settings-menu-item">
            <label for="${id}">${label}</label>
            <div class="settings-slider-wrapper">
                <input type="range" id="${id}" class="settings-slider" value="${value}" min="${min}" max="${max}" step="${step}" style="--slider-fill: ${fill}%">
                <span class="settings-slider-value" id="${id}Value">${value}</span>
            </div>
        </div>
    `;
}

/**
 * Build a divider (horizontal rule)
 * @returns {string} HTML string for the divider
 */
function buildDivider() {
    return '<div class="settings-divider"></div>';
}

/**
 * Build a section title
 * @param {string} title - The section title text
 * @returns {string} HTML string for the section title
 */
function buildSectionTitle(title) {
    return `<div class="settings-section-title">${title}</div>`;
}

/**
 * Build a button (for actions like "Add App", "Add Link")
 * @param {string} id - The ID for the button
 * @param {string} text - Button text
 * @returns {string} HTML string for the button
 */
function buildButton(id, text) {
    return `
        <div class="settings-field">
            <div id="${id}" class="settings-button-save" style="width: 100%; cursor: pointer;">
                ${text}
            </div>
        </div>
    `;
}

/**
 * Build a tip/hint text
 * @param {string} text - Tip text
 * @returns {string} HTML string for the tip
 */
function buildTip(text) {
    return `<div class="settings-tip">${text}</div>`;
}

/**
 * Build a textarea input (for system prompt, etc.)
 * @param {string} id - The ID for the textarea
 * @param {string} label - The label text
 * @param {string} value - The current value
 * @param {string} placeholder - Placeholder text (optional)
 * @param {number} rows - Number of rows (optional, default 3)
 * @returns {string} HTML string for the textarea
 */
function buildTextarea(id, label, value = '', placeholder = '', rows = 3) {
    return `
        <div class="settings-menu-item" style="flex-direction: column; align-items: stretch;">
            <label for="${id}" style="margin-bottom: 6px;">${label}</label>
            <textarea id="${id}" class="settings-input" rows="${rows}" placeholder="${placeholder}" style="resize: vertical; min-height: 60px;">${value}</textarea>
        </div>
    `;
}

/**
 * Build a single-line color picker with hex input
 * @param {string} colorId - The ID for the color picker input
 * @param {string} hexId - The ID for the hex text input
 * @param {string} label - The label text
 * @param {string} value - The current color value (hex)
 * @returns {string} HTML string for the color picker
 */
function buildColorPicker(colorId, hexId, label, value = '#ffffff') {
    return `
        <div class="settings-menu-item">
            <label>${label}</label>
            <div class="settings-color-group">
                <input type="color" id="${colorId}" class="settings-color-picker" value="${value}">
                <input type="text" id="${hexId}" class="settings-input settings-color-hex" value="${value}" placeholder="#ffffff">
            </div>
        </div>
    `;
}

/**
 * Build a small popup-tab styled button
 * @param {string} id - The ID for the button
 * @param {string} text - Button text
 * @param {string} styleClass - Additional class (popup-tab-cancel or popup-tab-save)
 * @returns {string} HTML string for the button
 */
function buildPopupTabButton(id, text, styleClass = '') {
    return `<div id="${id}" class="popup-tab ${styleClass}">${text}</div>`;
}

// ============================================
// MAIN SETTINGS MODAL GENERATION
// ============================================

/**
 * Generate the complete HTML for the main settings modal
 * @returns {string} HTML string for the entire settings modal
 */
function generateMainSettingsHTML() {
    const appearance = window.TrueTab.appearanceSettings || {
        settingsStyle: 'light',
        cornerStyle: 'rounded',
        background: 'default',
        stretchBackground: false,
        overlay: 0,
        blur: 0,
        widgetCustomColor: '#000000',
        widgetCustomIconColor: '#ffffff',
        widgetCustomTextColor: '#ffffff',
        widgetOpacity: 15,
        widgetBlur: 10,
        font: 'default',
        hideAppTitles: true,  // Inverted: true = show titles (default)
        hideBottomMenuWhenNotHovered: false,
        enableRubberBandScrolling: false,
        hideAllGlassBG: false  // Global setting to hide all glass backgrounds
    };

    return `
        <div class="modal-body">
            <div class="modal-sidebar">
                <div class="modal-tab active" data-panel="account">Account</div>
                <div class="modal-tab" data-panel="appearance">Appearance</div>
                <div class="modal-tab" data-panel="themes">Themes</div>
                <div class="modal-tab" data-panel="advanced">Advanced</div>
            </div>
            <div class="modal-main">
                <!-- Account Panel -->
                <div id="account" class="modal-panel active">
                    <div class="modal-section">
                        <div id="cloudSyncSection"></div>
                    </div>
                </div>

                <!-- Appearance Panel -->
                <div id="appearance" class="modal-panel">
                    <div class="modal-section">
                        ${buildDivider()}
                        ${buildSectionTitle('General')}
                        ${buildDropdown('settingsStyleSelect', 'Settings Style', appearance.settingsStyle, [
                            { value: 'light', label: 'Light' },
                            { value: 'dark', label: 'Dark' }
                        ])}
                        ${buildCheckbox('hideAllGlassBG', 'Hide All Glass BG', appearance.hideAllGlassBG)}
                        ${buildColorPicker('accentColorInput', 'accentHexInput', 'Accent Color', appearance.accentColor || '#81C3D7')}
                        ${buildDivider()}

                        ${buildSectionTitle('Widget & App Style')}
                        ${buildColorPicker('widgetColorInput', 'widgetHexInput', 'Background Color', appearance.widgetCustomColor)}
                        ${buildColorPicker('widgetIconColorInput', 'widgetIconHexInput', 'Icon Color', appearance.widgetCustomIconColor)}
                        ${buildSlider('widgetOpacitySlider', 'Opacity', appearance.widgetOpacity, 0, 100, 1)}
                        ${buildSlider('widgetBlurSlider', 'Blur', appearance.widgetBlur, 0, 30, 1)}
                        ${buildDropdown('cornerStyleSelect', 'Corners', appearance.cornerStyle, [
                            { value: 'rounded', label: 'Rounded' },
                            { value: 'square', label: 'Square' }
                        ])}
                        ${buildDivider()}

                        ${buildSectionTitle('Font')}
                        ${buildDropdown('fontSelect', 'Font Family', appearance.font, [
                            { value: 'default', label: 'Default (System)' },
                            { value: 'inter', label: 'Inter' },
                            { value: 'roboto', label: 'Roboto' },
                            { value: 'open-sans', label: 'Open Sans' },
                            { value: 'lato', label: 'Lato' },
                            { value: 'montserrat', label: 'Montserrat' },
                            { value: 'playfair', label: 'Playfair Display' },
                            { value: 'merriweather', label: 'Merriweather' },
                            { value: 'courier', label: 'Courier New' },
                            { value: 'georgia', label: 'Georgia' },
                            { value: 'custom', label: 'Custom Font' }
                        ])}
                        <div id="customFontUploadGroup" style="display: ${appearance.font === 'custom' ? 'block' : 'none'};">
                            <div class="settings-menu-item">
                                <label for="customFontUpload">Upload Font</label>
                                <label for="customFontUpload" class="settings-file-label" style="flex: 1; cursor: pointer;">Choose File</label>
                                <input type="file" id="customFontUpload" class="settings-file-input" accept=".ttf,.otf,.woff,.woff2" style="display: none;">
                            </div>
                            <div id="customFontPreview" class="settings-menu-item" style="display: ${appearance.customFont ? 'flex' : 'none'};">
                                <label>Font: <span id="customFontName">${appearance.customFontName || ''}</span></label>
                                <div class="popup-tab popup-tab-cancel" id="removeCustomFont" style="flex: 1; cursor: pointer;">Remove</div>
                            </div>
                        </div>
                        ${buildColorPicker('widgetTextColorInput', 'widgetTextHexInput', 'Text Color', appearance.widgetCustomTextColor)}
                        ${buildCheckbox('showAppTitles', 'App Titles', !appearance.hideAppTitles)}
                        ${buildDivider()}

                        ${buildSectionTitle('Background')}
                        ${buildDropdown('backgroundSelect', 'Pre-Defined Backgrounds', appearance.background, [
                            { value: 'default', label: 'Default' },
                            { value: 'minimalist', label: 'Minimalist' },
                            { value: 'retro', label: 'Retro' },
                            { value: 'dark', label: 'Dark' },
                            { value: 'scifi', label: 'Sci-Fi' },
                            { value: 'bw', label: 'Black & White' }
                        ])}
                        <div class="settings-menu-item">
                            <label for="customBackgroundUpload">Upload Background</label>
                            <label for="customBackgroundUpload" class="settings-file-label" style="flex: 1; cursor: pointer;">Choose File</label>
                            <input type="file" id="customBackgroundUpload" class="settings-file-input" accept="image/*" style="display: none;">
                        </div>
                        <div id="customBackgroundPreview" class="settings-menu-item" style="display: ${appearance.customBackground ? 'flex' : 'none'};">
                            <label>Current Background</label>
                            <div class="popup-tab popup-tab-cancel" id="removeCustomBackground" style="flex: 1; cursor: pointer;">Remove</div>
                        </div>
                        ${buildCheckbox('stretchBackgroundCheckbox', 'Stretch to Fit', appearance.stretchBackground)}
                        ${buildSlider('overlaySlider', 'Black Overlay', appearance.overlay, 0, 100, 1)}
                        ${buildSlider('blurSlider', 'Blur', appearance.blur, 0, 30, 1)}
                    </div>
                </div>

                <!-- Themes Panel -->
                <div id="themes" class="modal-panel">
                    <div class="modal-section">
                        <p style="color: var(--settings-text-color); opacity: 0.6; text-align: center; padding: 40px 20px;">Coming soon...</p>
                    </div>
                </div>

                <!-- Advanced Panel -->
                <div id="advanced" class="modal-panel">
                    <div class="modal-section">
                        ${buildDivider()}
                        ${buildSectionTitle('Interface')}
                        ${buildCheckbox('hideBottomMenuWhenNotHovered', 'Auto-Hide Bottom Menu', appearance.hideBottomMenuWhenNotHovered)}
                        ${buildCheckbox('enableRubberBandScrolling', 'Rubber-Band Scroll', appearance.enableRubberBandScrolling)}
                        ${buildDivider()}

                        ${buildSectionTitle('Layout Memory')}
                        <div class="settings-menu-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
                            ${buildPopupTabButton('clearLayoutMemoryBtn', 'Clear All', 'popup-tab-cancel')}
                        </div>
                        ${buildDivider()}

                        ${buildSectionTitle('Backup & Restore')}
                        <div class="settings-menu-item" style="flex-direction: row; align-items: center; gap: 8px;">
                            ${buildPopupTabButton('exportLayoutBtn', 'Export Layout', 'popup-tab-save')}
                            ${buildPopupTabButton('importLayoutBtn', 'Import Layout', 'popup-tab-save')}
                            <input type="file" id="importLayoutFileInput" accept=".json" style="display: none;">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <div class="popup-tab popup-tab-cancel settings-button-back">Cancel</div>
            <div class="popup-tab popup-tab-save settings-button-save">Save</div>
        </div>
    `;
}

/**
 * Generate the complete HTML for the add widget modal
 * @returns {string} HTML string for the add widget modal
 */
function generateAddWidgetModalHTML() {
    return `
        <div class="popup-scrollable-content">
            <!-- Tab Selector -->
            <div class="popup-tab-selector">
                <div class="popup-tab active" data-panel="app">App</div>
                <div class="popup-tab" data-panel="widget">Widget</div>
            </div>

            <!-- App Panel -->
            <div id="app-panel" class="popup-panel active">
                ${buildTextInput('singleAppName', 'App Name', '', 'App Name')}
                ${buildCheckbox('singleAppShowLabel', 'App Title', true)}
                ${buildTextInput('singleAppUrl', 'URL', '', 'Example.com')}
                <div id="addAppIconifyPicker"></div>
                <div class="settings-menu-item">
                    <label for="singleAppIcon">Upload Icon</label>
                    <label for="singleAppIcon" class="settings-file-label" style="flex: 1; cursor: pointer;">Choose File</label>
                    <input type="file" id="singleAppIcon" class="settings-file-input" accept="image/*" style="display: none;">
                </div>
                <div id="singleIconPreview" class="settings-menu-item" style="display: none;">
                    <label>Edit Icon</label>
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                        <img id="singleIconPreviewImg" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15);">
                        <button id="singleIconEditBtn" class="settings-button-save" style="flex: 0 0 auto; padding: 6px 12px; min-height: 32px;">Edit</button>
                        <button id="singleIconDeleteBtn" class="settings-button-back" style="flex: 0 0 auto; padding: 6px 12px; min-height: 32px;">✕</button>
                    </div>
                </div>
                ${buildCheckbox('singleAppColorIcon', 'Color Icon', true)}
                ${buildCheckbox('singleAppShowGlassBG', 'Glass BG', true)}
                ${buildCheckbox('singleAppHideWhenNotHovered', 'Auto-Hide', false)}
                <div class="settings-menu-item" style="gap: 8px; padding: 4px; margin-top: 2px;">
                    <div id="cancelAddAppBtn" class="popup-tab popup-tab-cancel">Cancel</div>
                    <div id="addSingleAppBtn" class="popup-tab popup-tab-save">Save</div>
                </div>
            </div>

            <!-- Widget Panel -->
            <div id="widget-panel" class="popup-panel">
                <div class="widget-list">
                    <div class="widget-list-item" data-widget-type="clock">
                        <span class="iconify widget-list-icon" data-icon="material-symbols:schedule" data-width="20" data-height="20"></span>
                        <div class="widget-list-info">
                            <div class="widget-list-title">Clock</div>
                            <div class="widget-list-desc">Keep track of time</div>
                        </div>
                    </div>
                    <div class="widget-list-item" data-widget-type="weather">
                        <span class="iconify widget-list-icon" data-icon="material-symbols:wb-sunny-outline" data-width="20" data-height="20"></span>
                        <div class="widget-list-info">
                            <div class="widget-list-title">Weather</div>
                            <div class="widget-list-desc">Check local conditions</div>
                        </div>
                    </div>
                    <div class="widget-list-item" data-widget-type="search">
                        <span class="iconify widget-list-icon" data-icon="material-symbols:search" data-width="20" data-height="20"></span>
                        <div class="widget-list-info">
                            <div class="widget-list-title">Search</div>
                            <div class="widget-list-desc">Web search, AI chat, movie search & more</div>
                        </div>
                    </div>
                    <div class="widget-list-item" data-widget-type="quote">
                        <span class="iconify widget-list-icon" data-icon="material-symbols:format-quote" data-width="20" data-height="20"></span>
                        <div class="widget-list-info">
                            <div class="widget-list-title">Quote</div>
                            <div class="widget-list-desc">Display inspiring quotes</div>
                        </div>
                    </div>
                    <div class="widget-list-item" data-widget-type="calendar">
                        <span class="iconify widget-list-icon" data-icon="material-symbols:calendar-month-outline" data-width="20" data-height="20"></span>
                        <div class="widget-list-info">
                            <div class="widget-list-title">Calendar</div>
                            <div class="widget-list-desc">View dates & events</div>
                        </div>
                    </div>
                    <div class="widget-list-item" data-widget-type="stocks">
                        <span class="iconify widget-list-icon" data-icon="material-symbols:show-chart" data-width="20" data-height="20"></span>
                        <div class="widget-list-info">
                            <div class="widget-list-title">Stocks</div>
                            <div class="widget-list-desc">Track market prices</div>
                        </div>
                    </div>
                    <div class="widget-list-item" data-widget-type="apps">
                        <span class="iconify widget-list-icon" data-icon="material-symbols:apps" data-width="20" data-height="20"></span>
                        <div class="widget-list-info">
                            <div class="widget-list-title">Apps Scroller</div>
                            <div class="widget-list-desc">Launch favorite apps</div>
                        </div>
                    </div>
                    <div class="widget-list-item" data-widget-type="empty">
                        <span class="iconify widget-list-icon" data-icon="material-symbols:link" data-width="20" data-height="20"></span>
                        <div class="widget-list-info">
                            <div class="widget-list-title">Quick Links</div>
                            <div class="widget-list-desc">Access saved links</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Initialize/re-initialize the main settings modal with dynamically generated HTML
 */
function initializeMainSettingsModal() {
    if (!settingsModal) return;

    const modalContent = settingsModal.querySelector('.modal-content');
    if (!modalContent) return;

    // Generate and inject the HTML
    modalContent.innerHTML = generateMainSettingsHTML();

    // Reinitialize auth UI in the cloud sync section (if auth-ui.js is loaded)
    if (window.TrueTab.initAuthUI) {
        const cloudSyncSection = document.getElementById('cloudSyncSection');
        if (cloudSyncSection) {
            window.TrueTab.initAuthUI(cloudSyncSection);
        }
    }

    // Update appearance controls to reflect current settings
    if (window.TrueTab.updateAppearanceControls) {
        // Delay to ensure DOM is fully rendered
        setTimeout(() => {
            window.TrueTab.updateAppearanceControls();
        }, 0);
    }

    // Scan for Iconify icons
    if (typeof Iconify !== 'undefined') {
        Iconify.scan(modalContent);
    }
}

/**
 * Initialize/re-initialize the add widget modal with dynamically generated HTML
 */
function initializeAddWidgetModal() {
    if (!addWidgetModal) return;

    // Generate and inject the HTML
    addWidgetModal.innerHTML = generateAddWidgetModalHTML();

    // Scan for Iconify icons
    if (typeof Iconify !== 'undefined') {
        Iconify.scan(addWidgetModal);
    }
}

/**
 * Reposition a modal to ensure it stays within viewport bounds
 * @param {HTMLElement} modal - The modal element to reposition
 * @param {string} cacheKey - Key to store/retrieve position from cache
 * @param {object} options - Optional positioning preferences
 */
function repositionModal(modal, cacheKey, options = {}) {
    if (!modal) return;

    const margin = 10;
    const maxHeight = window.innerHeight - (margin * 2);

    // Measure actual modal dimensions
    let modalHeight = modal.offsetHeight;

    // Get current position (don't move it, just constrain height if needed)
    const currentLeft = parseFloat(modal.style.left) || modalPositionCache[cacheKey]?.left || margin;
    const currentTop = parseFloat(modal.style.top) || modalPositionCache[cacheKey]?.top || margin;

    // If modal height exceeds viewport, constrain it and enable scrolling
    if (modalHeight > maxHeight) {
        modal.style.maxHeight = `${maxHeight}px`;
        modalHeight = maxHeight;
        // Enable scrolling for popup-scrollable-content when constrained
        const scrollableContent = modal.querySelector('.popup-scrollable-content');
        if (scrollableContent) {
            scrollableContent.style.overflow = 'hidden auto';
        }
    } else {
        modal.style.maxHeight = 'none';
        // Disable scrolling when not constrained
        const scrollableContent = modal.querySelector('.popup-scrollable-content');
        if (scrollableContent) {
            scrollableContent.style.overflow = 'visible';
        }
    }

    // DO NOT move the modal - initial positioning functions already handled that
    // Just keep the current position and cache it
    modalPositionCache[cacheKey] = {
        left: currentLeft,
        top: currentTop,
        width: modal.offsetWidth || 280
    };
}

/**
 * Setup dynamic boundary detection for a modal
 * Monitors content size changes and adjusts position accordingly
 * @param {HTMLElement} modal - The modal element
 * @param {string} cacheKey - Cache key for modal position
 */
function setupDynamicBoundaryDetection(modal, cacheKey) {
    if (!modal) return;

    // Disconnect existing observer if any
    if (modalContentObserver) {
        modalContentObserver.disconnect();
    }

    // Create new observer
    modalContentObserver = new MutationObserver((mutations) => {
        // Debounce repositioning to avoid excessive calls
        clearTimeout(modal._repositionTimeout);
        modal._repositionTimeout = setTimeout(() => {
            repositionModal(modal, cacheKey);
        }, 100);
    });

    // Observe the modal for size changes
    modalContentObserver.observe(modal, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });

    // Also listen to window resize
    const resizeHandler = () => {
        repositionModal(modal, cacheKey);
    };

    // Store handler reference for cleanup
    if (!modal._resizeHandler) {
        modal._resizeHandler = resizeHandler;
        window.addEventListener('resize', resizeHandler);
    }
}

/**
 * Cleanup boundary detection for a modal
 * @param {HTMLElement} modal - The modal element
 */
function cleanupBoundaryDetection(modal) {
    if (modalContentObserver) {
        modalContentObserver.disconnect();
        modalContentObserver = null;
    }

    if (modal && modal._resizeHandler) {
        window.removeEventListener('resize', modal._resizeHandler);
        modal._resizeHandler = null;
    }

    if (modal && modal._repositionTimeout) {
        clearTimeout(modal._repositionTimeout);
    }
}

function openAddWidgetModalAt(gridX, gridY) {
    console.log('openAddWidgetModalAt called:', {gridX, gridY, hasModal: !!addWidgetModal});
    window.TrueTab.preferredGridPosition = { x: gridX, y: gridY };
    if (!addWidgetModal) {
        console.error('addWidgetModal is null/undefined!');
        return;
    }

    // Close other modals first
    if (widgetSettingsPopup && widgetSettingsPopup.classList.contains('active')) {
        widgetSettingsPopup.classList.remove('active');
        cleanupBoundaryDetection(widgetSettingsPopup);
    }
    if (settingsModal && settingsModal.classList.contains('active')) {
        settingsModal.classList.remove('active');
    }

    addWidgetModal.classList.add('active');

    // Set the App tab as active by default
    const appTab = addWidgetModal.querySelector('.popup-tab[data-panel="app"]');
    const widgetTab = addWidgetModal.querySelector('.popup-tab[data-panel="widget"]');
    const appPanel = addWidgetModal.querySelector('#app-panel');
    const widgetPanel = addWidgetModal.querySelector('#widget-panel');

    if (appTab && appPanel) {
        widgetTab?.classList.remove('active');
        appTab.classList.add('active');
        widgetPanel?.classList.remove('active');
        appPanel.classList.add('active');
    }

    // Position popup near the clicked grid cell (via shared metrics)
    const metrics = window.TrueTab.utils.getGridMetrics();
    const { iconWidth, iconHeight } = metrics;
    const cellPos = window.TrueTab.utils.getCellTopLeft(gridX, gridY);

    const popupWidth = 280;
    const gap = 20;
    const margin = 10;

    // First, temporarily show the modal to measure its actual height
    addWidgetModal.style.visibility = 'hidden';
    addWidgetModal.style.display = 'flex';
    addWidgetModal.style.width = `${popupWidth}px`;
    const popupHeight = addWidgetModal.offsetHeight || 500; // fallback to 500 if not measurable
    addWidgetModal.style.display = ''; // Clear inline display style
    addWidgetModal.style.visibility = '';

    // Calculate cell bounds
    const cellLeft = cellPos.x;
    const cellRight = cellPos.x + iconWidth;
    const cellTop = cellPos.y;
    const cellBottom = cellPos.y + iconHeight;
    const cellCenterY = (cellTop + cellBottom) / 2;

    // Try positioning to the right of the cell
    let left = cellRight + gap;

    // Check if right positioning would overlap or go off screen
    if (left + popupWidth > window.innerWidth - margin) {
        // Try left side instead
        left = cellLeft - popupWidth - gap;

        // If left side also fails, position with most available space
        if (left < margin) {
            const spaceRight = window.innerWidth - cellRight - margin;
            const spaceLeft = cellLeft - margin;

            if (spaceRight > spaceLeft) {
                // Use right side, clamped to viewport
                left = Math.max(margin, Math.min(cellRight + gap, window.innerWidth - popupWidth - margin));
            } else {
                // Use left side, clamped to viewport
                left = Math.max(margin, cellLeft - popupWidth - gap);
            }
        }
    }

    // Smart vertical centering: prefer to center modal on cell
    let top = cellCenterY - (popupHeight / 2);

    // Clamp vertical position to viewport
    if (top + popupHeight > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - popupHeight - margin);
    }
    if (top < margin) {
        top = margin;
    }

    // Final horizontal clamp
    left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));

    addWidgetModal.style.left = `${left}px`;
    addWidgetModal.style.top = `${top}px`;
    addWidgetModal.style.width = `${popupWidth}px`;

    // Cache initial position
    modalPositionCache.addWidget = { left, top, width: popupWidth };

    // Setup dynamic boundary detection
    setupDynamicBoundaryDetection(addWidgetModal, 'addWidget');
}

// Map bar IDs to their per-bar settings template type
// 'bar-search' uses its own template key to avoid conflicting with the unified 'search' template
const barSettingsTypeMap = {
    'bar-search': 'bar-search',
    'bar-chatbot': 'chatbot',
    'bar-cinema': 'cinema',
    'bar-youtube': 'bar-youtube',
    'bar-wikipedia': 'bar-test',
    'bar-amazon': 'bar-test',
    'bar-reddit': 'bar-test',
    'bar-ebay': 'bar-test'
};

// Settings HTML templates for each widget type
const settingsTemplates = {
    app: (settings) => `
        ${buildTextInput('appName', 'App Name', settings.name || '', 'App Name')}
        ${buildCheckbox('appShowLabel', 'App Title', settings.showLabel !== false)}
        ${buildTextInput('appUrl', 'URL', settings.url || '', 'Example.com')}
        <div id="appIconifyPicker"></div>
        <div class="settings-menu-item">
            <label for="appIconUpload">Upload Icon</label>
            <label for="appIconUpload" class="settings-file-label" style="flex: 1; cursor: pointer;">Choose File</label>
            <input type="file" id="appIconUpload" class="settings-file-input" accept="image/*" style="display: none;">
        </div>
        <div id="appIconPreview" class="settings-menu-item" style="${settings.icon && settings.icon.startsWith('data:') ? 'display: flex;' : 'display: none;'}">
            <label>Edit Icon</label>
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <img id="appIconPreviewImg" src="${settings.icon && settings.icon.startsWith('data:') ? settings.icon : ''}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15);">
                <button id="appIconEditBtn" class="settings-button-save" style="flex: 0 0 auto; padding: 6px 12px; min-height: 32px;">Edit</button>
                <button id="appIconDeleteBtn" class="settings-button-back" style="flex: 0 0 auto; padding: 6px 12px; min-height: 32px;">✕</button>
            </div>
        </div>
        ${buildCheckbox('appColorIcon', 'Color Icon', settings.colorIcon !== false)}
        ${buildCheckbox('appShowGlassBG', 'Glass BG', !settings.hideBackground)}
        ${buildCheckbox('hideWhenNotHovered', 'Auto-Hide', settings.hideWhenNotHovered)}
    `,
    clock: (settings) => `
        ${buildTextInput('location', 'Location', settings.location || 'Copenhagen', 'Enter city name')}
        ${buildCheckbox('format24h', 'Use 24-hour Format', settings.format24h !== false)}
        ${buildCheckbox('showSeconds', 'Seconds', settings.showSeconds)}
        ${buildCheckbox('showDate', 'Date', settings.showDate !== false)}
        ${buildCheckbox('showWeather', 'Weather', settings.showWeather !== false)}
        ${buildCheckbox('showGlassBG', 'Glass BG', !settings.hideBackground)}
        ${buildCheckbox('hideWhenNotHovered', 'Auto-Hide', settings.hideWhenNotHovered)}
    `,
    weather: (settings) => {
        // All forecast options always available - layout will adapt
        let forecastOptions = [
            { value: 'none', label: 'None' },
            { value: '3', label: '3 Days' },
            { value: '7', label: '7 Days' },
            { value: '14', label: '14 Days' }
        ];

        return `
            ${buildTextInput('location', 'Location', settings.location || '', 'Enter city name')}
            ${buildDropdown('units', 'Unit Display', settings.units || 'celsius', [
                { value: 'celsius', label: 'Celsius' },
                { value: 'fahrenheit', label: 'Fahrenheit' }
            ])}
            ${buildDivider()}
            ${buildDropdown('forecastDays', 'Forecast', settings.forecastDays || 'none', forecastOptions)}
            ${buildDivider()}
            ${buildSectionTitle('Display Options')}
            ${buildCheckbox('showLocationTitle', 'Location Title', settings.showLocationTitle !== false)}
            ${buildCheckbox('showIcon', 'Weather Icon', settings.showIcon !== false)}
            ${buildCheckbox('showDegrees', 'Degrees', settings.showDegrees !== false)}
            ${buildCheckbox('showDescription', 'Description', settings.showDescription !== false)}
            ${buildCheckbox('showExtraInfo', 'Extra Info', settings.showExtraInfo !== false)}
            ${buildDivider()}
            ${buildCheckbox('showGlassBG', 'Glass BG', !settings.hideBackground)}
            ${buildCheckbox('hideWhenNotHovered', 'Auto-Hide', settings.hideWhenNotHovered)}
        `;
    },
    search: (settings, widget) => {
        // Build per-bar settings UI — compact icon tiles
        const enabledBars = settings.enabledBars && settings.enabledBars.length > 0
            ? settings.enabledBars
            : ['bar-search', 'bar-chatbot'];

        // Generate compact bar settings tiles: [bar-icon ⚙️] per enabled bar
        const barTilesHTML = enabledBars.map(barId => {
            const mod = window.TrueTab.widgetModules[barId];
            const meta = mod && mod.barMeta ? mod.barMeta : { name: barId, icon: 'mdi:help-circle' };

            return `
                <button type="button" class="input-bar-settings-tile input-bar-settings-btn" data-bar-id="${barId}" title="${meta.name} Settings">
                    <span class="iconify input-bar-settings-tile-icon" data-icon="${meta.icon}" data-width="18" data-height="18"></span>
                    <span class="iconify input-bar-settings-tile-gear" data-icon="material-symbols:settings-outline" data-width="12" data-height="12"></span>
                </button>
            `;
        }).join('');

        return `
            ${buildCheckbox('showBackgroundText', 'Background Text', settings.showBackgroundText !== false)}
            ${buildCheckbox('hideWhenNotHovered', 'Auto-Hide', settings.hideWhenNotHovered)}
            ${buildDivider()}
            ${buildSectionTitle('Bar Settings')}
            <div class="input-bar-settings-tiles">
                ${barTilesHTML}
            </div>
        `;
    },
    'bar-search': (settings) => `
        ${buildDropdown('searchEngine', 'Search Engine', settings.searchEngine || 'google', [
            { value: 'google', label: 'Google' },
            { value: 'bing', label: 'Bing' },
            { value: 'duckduckgo', label: 'DuckDuckGo' },
            { value: 'yahoo', label: 'Yahoo' },
            { value: 'brave', label: 'Brave Search' }
        ])}
        ${buildTextInput('searchPlaceholder', 'Placeholder', settings.placeholder || '', '')}
        ${buildCheckbox('enableAutocomplete', 'Autocomplete', settings.enableAutocomplete !== false)}
        ${buildCheckbox('showSearchIcon', 'Search Icon', settings.showSearchIcon !== false)}
        ${buildCheckbox('hideButtonOutline', 'Hide Button Outline', settings.hideButtonOutline !== false)}
        ${buildDivider()}
        ${buildTextInput('barBackgroundText', 'Background Text', settings.backgroundText || '', '')}
    `,
    quote: (settings) => `
        ${buildDropdown('category', 'Category', settings.category || 'inspirational', [
            { value: 'random', label: 'Random' },
            { value: 'inspirational', label: 'Inspirational' },
            { value: 'motivational', label: 'Motivational' },
            { value: 'life', label: 'Life' },
            { value: 'love', label: 'Love' },
            { value: 'happiness', label: 'Happiness' },
            { value: 'success', label: 'Success' },
            { value: 'wisdom', label: 'Wisdom' },
            { value: 'art', label: 'Art' }
        ])}
        ${buildCheckbox('showGlassBG', 'Glass BG', !settings.hideBackground)}
        ${buildCheckbox('hideWhenNotHovered', 'Auto-Hide', settings.hideWhenNotHovered)}
    `,
    calendar: (settings) => `
        ${buildCheckbox('showEvents', 'Events', settings.showEvents !== false)}
        ${buildCheckbox('showArrows', 'Navigation Arrows', settings.showArrows)}
        ${buildCheckbox('showYear', 'Year', settings.showYear)}
        ${buildCheckbox('showWeekNumber', 'Week Number', settings.showWeekNumber)}
        ${buildCheckbox('fullWeekdayNames', 'Full Weekday Names', settings.fullWeekdayNames)}
        ${buildCheckbox('showGlassBG', 'Glass BG', !settings.hideBackground)}
        ${buildCheckbox('hideWhenNotHovered', 'Auto-Hide', settings.hideWhenNotHovered)}
    `,
    stocks: (settings) => `
        ${buildTextInput('stockTitle', 'Title', settings.title || 'Stocks', 'Stocks')}
        ${buildTextInput('symbols', 'Stock Symbols', settings.symbols.join(', '), 'AAPL, GOOGL, MSFT')}
        ${buildTip('comma-separated')}
        ${buildCheckbox('showPrice', 'Current Price', settings.showPrice !== false)}
        ${buildCheckbox('showChange', 'Price Change', settings.showChange !== false)}
        ${buildCheckbox('showPercent', 'Percent Change', settings.showPercent !== false)}
        ${buildCheckbox('showLogo', 'Company Logos', settings.showLogo)}
        ${buildCheckbox('showGlassBG', 'Glass BG', !settings.hideBackground)}
        ${buildCheckbox('hideWhenNotHovered', 'Auto-Hide', settings.hideWhenNotHovered)}
    `,
    chatbot: (settings) => {
        // Build provider dropdown options
        const providerOptions = [
            { value: 'openai', label: 'OpenAI' },
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'gemini', label: 'Gemini' },
            { value: 'groq', label: 'Groq' },
            { value: 'xai', label: 'xAI' },
            { value: 'mistral', label: 'Mistral' },
            { value: 'openrouter', label: 'OpenRouter' }
        ];

        const providerOptionsHTML = providerOptions.map(opt =>
            `<option value="${opt.value}" ${settings.provider === opt.value ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}>${opt.label}</option>`
        ).join('');

        return `
        <div class="settings-menu-item">
            <label for="chatbotProvider">Provider</label>
            <select id="chatbotProvider" class="settings-select">
                ${providerOptionsHTML}
            </select>
        </div>
        <div class="settings-menu-item">
            <label for="chatbotModelSelect">Model</label>
            <select id="chatbotModelSelect" class="settings-select">
                <!-- Will be populated dynamically based on provider -->
            </select>
        </div>
        <div class="settings-menu-item">
            <label for="chatbotSystemPrompt">Prompt</label>
            <textarea id="chatbotSystemPrompt" class="settings-input" rows="3" placeholder="Enter system prompt..." style="resize: vertical; min-height: 28px;">${settings.systemPrompt || 'You are a concise, helpful assistant.'}</textarea>
        </div>
        ${buildCheckbox('hideWhenNotHovered', 'Auto-Hide', settings.hideWhenNotHovered)}
        ${buildDivider()}
        ${buildTextInput('barBackgroundText', 'Background Text', settings.backgroundText || '', '')}
    `;
    },
    apps: (settings) => {
        // Build compact app tiles — same style as input bar settings tiles
        const links = settings.links || [];
        const appTilesHTML = links.map((link, index) => {
            let iconHtml;
            if (link.icon && link.icon.startsWith('data:')) {
                iconHtml = `<img src="${link.icon}" class="input-bar-settings-tile-icon" style="width: 18px; height: 18px; object-fit: cover; border-radius: 4px;">`;
            } else if (link.icon && link.icon.startsWith('iconify:')) {
                const iconifyIcon = link.icon.replace('iconify:', '');
                iconHtml = `<span class="iconify input-bar-settings-tile-icon" data-icon="${iconifyIcon}" data-width="18" data-height="18"></span>`;
            } else {
                iconHtml = `<span class="input-bar-settings-tile-icon" style="font-size: 16px;">${link.icon || '📱'}</span>`;
            }
            return `
                <button type="button" class="input-bar-settings-tile settings-app-btn" data-index="${index}" title="${link.name}">
                    ${iconHtml}
                    <span class="iconify input-bar-settings-tile-gear" data-icon="material-symbols:settings-outline" data-width="12" data-height="12"></span>
                </button>
            `;
        }).join('');

        return `
            ${buildTextInput('appsTitle', 'Title', settings.title || 'Apps', 'Apps')}
            ${buildDropdown('appsGlassBGMode', 'Glass BG', settings.glassBGMode || 'show-all', [
                { value: 'show-all', label: 'Show All' },
                { value: 'widget-bg', label: 'Widget BG' },
                { value: 'app-bg', label: 'App BG' },
                { value: 'hide', label: 'Hide' }
            ])}
            ${buildCheckbox('hideWhenNotHovered', 'Auto-Hide', settings.hideWhenNotHovered)}
            ${buildDivider()}
            ${buildCheckbox('showAppNames', 'App Titles', settings.showLabels !== false)}
            ${buildSectionTitle('Apps')}
            <div class="input-bar-settings-tiles" id="appsList">
                ${appTilesHTML}
            </div>
            ${buildButton('addAppBtn', 'Add App')}
        `;
    },
    cinema: (settings) => `
        ${buildDropdown('cinemaLanguage', 'Language', settings.language || 'en-US', [
            { value: 'en-US', label: 'English (US)' },
            { value: 'da-DK', label: 'Danish' },
            { value: 'de-DE', label: 'German' },
            { value: 'fr-FR', label: 'French' },
            { value: 'es-ES', label: 'Spanish' },
            { value: 'it-IT', label: 'Italian' },
            { value: 'pt-BR', label: 'Portuguese (BR)' },
            { value: 'ja-JP', label: 'Japanese' },
            { value: 'ko-KR', label: 'Korean' }
        ])}
        ${buildDropdown('cinemaCountry', 'Streaming Region', settings.country || 'DK', [
            { value: 'US', label: 'United States' },
            { value: 'DK', label: 'Denmark' },
            { value: 'GB', label: 'United Kingdom' },
            { value: 'DE', label: 'Germany' },
            { value: 'FR', label: 'France' },
            { value: 'ES', label: 'Spain' },
            { value: 'IT', label: 'Italy' },
            { value: 'CA', label: 'Canada' },
            { value: 'AU', label: 'Australia' },
            { value: 'JP', label: 'Japan' },
            { value: 'KR', label: 'South Korea' }
        ])}
        ${buildCheckbox('cinemaShowSearchIcon', 'Search Icon', settings.showSearchIcon !== false)}
        ${buildCheckbox('hideWhenNotHovered', 'Auto-Hide', settings.hideWhenNotHovered)}
        ${buildDivider()}
        ${buildTextInput('barBackgroundText', 'Background Text', settings.backgroundText || '', '')}
    `,
    'bar-youtube': (settings) => `
        ${buildCheckbox('ytShowSearchIcon', 'Search Icon', settings.showSearchIcon !== false)}
        ${buildTextInput('ytPlaceholder', 'Placeholder', settings.placeholder || '', '')}
        ${buildDivider()}
        ${buildTextInput('barBackgroundText', 'Background Text', settings.backgroundText || '', '')}
    `,
    'bar-test': (settings) => {
        // Generic settings for test/example bars — change background text
        return `
            ${buildTextInput('barBackgroundText', 'Background Text', settings.backgroundText || '', '')}
        `;
    },
    empty: (settings) => `
        ${buildTextInput('quickLinksTitle', 'Title', settings.title || 'Quick Links', 'Quick Links')}
        ${buildCheckbox('showGlassBG', 'Glass BG', !settings.hideBackground)}
        ${buildCheckbox('hideWhenNotHovered', 'Auto-Hide', settings.hideWhenNotHovered)}
        ${buildDivider()}
        <div id="linksList">
            ${(settings.links || []).map((link, index) => {
                return `
                <div class="settings-list-item link-item" data-index="${index}">
                    <span class="settings-list-item-name">${link.name}</span>
                    <button type="button" class="settings-list-item-btn settings-link-btn" data-index="${index}">
                        <span class="iconify" data-icon="material-symbols:settings-outline" data-width="16" data-height="16"></span>
                    </button>
                    <button type="button" class="settings-list-item-btn remove-link-btn" data-index="${index}">
                        <span class="iconify" data-icon="material-symbols:close" data-width="16" data-height="16"></span>
                    </button>
                </div>
                `;
            }).join('')}
        </div>
        ${buildButton('addLinkBtn', 'Add Link')}
    `,

};

function generateSettingsHTML(widget) {
    const settings = widget.settings;
    return settingsTemplates[widget.type] ? settingsTemplates[widget.type](settings, widget) : '<p>No settings available for this widget type.</p>';
}

function openWidgetSettings(widget, buttonElement = null) {
    if (!widgetSettingsPopup) return;

    // Clear any per-bar settings save handler
    widgetSettingsPopup._barSettingsSave = null;

    // Check if we're just switching views within the SAME widget (e.g., going back from edit screen)
    // Only skip repositioning if it's the same widget AND modal is already open
    const isAlreadyOpen = widgetSettingsPopup.classList.contains('active');
    const isSameWidget = widgetSettingsPopup.dataset.widgetId === widget.id;
    const shouldSkipPositioning = isAlreadyOpen && isSameWidget;

    // Close other modals first
    if (addWidgetModal && addWidgetModal.classList.contains('active')) {
        addWidgetModal.classList.remove('active');
    }
    if (settingsModal && settingsModal.classList.contains('active')) {
        settingsModal.classList.remove('active');
    }

    const content = widgetSettingsPopup.querySelector('#widgetSettingsContent');
    const titleEl = widgetSettingsPopup.querySelector('#widgetSettingsTitle');

    if (!widget.settings) {
        widget.settings = window.TrueTab.utils.getDefaultSettings(widget.type);
    }

    // Set the title based on widget type
    const widgetTypeNames = {
        'clock': 'Clock',
        'weather': 'Weather',
        'search': 'Search',
        'quote': 'Quote',
        'calendar': 'Calendar',
        'stocks': 'Stocks',
        'chatbot': 'Chatbot',
        'cinema': 'Cinema Search',
        'apps': 'Apps Scroller',
        'app': 'App',
        'empty': 'Quick Links'
    };
    if (titleEl) {
        titleEl.textContent = `${widgetTypeNames[widget.type] || 'Widget'} Settings`;
    }

    if (content) {
        content.innerHTML = generateSettingsHTML(widget);
    }

    // ONLY position the popup if it's a different widget or first time opening
    // If same widget already open (e.g., going back from edit screen), keep the same position
    const widgetEl = document.getElementById(widget.id);
    if (widgetEl && !shouldSkipPositioning) {
        // Use button position if provided, otherwise fall back to widget position
        const targetRect = buttonElement ? buttonElement.getBoundingClientRect() : widgetEl.getBoundingClientRect();
        const popupWidth = 280;
        const gap = 20;
        const margin = 10;

        // First, temporarily show the popup to measure its actual height
        widgetSettingsPopup.style.visibility = 'hidden';
        widgetSettingsPopup.style.display = 'flex';
        widgetSettingsPopup.style.width = `${popupWidth}px`;
        const popupHeight = widgetSettingsPopup.offsetHeight || 400; // fallback to 400 if not measurable
        widgetSettingsPopup.style.display = ''; // Clear inline display style
        widgetSettingsPopup.style.visibility = '';

        // Calculate button/target center position
        const targetCenterX = targetRect.left + (targetRect.width / 2);
        const targetCenterY = targetRect.top + (targetRect.height / 2);

        // Calculate available space in all directions
        const spaceAbove = targetCenterY - margin;
        const spaceBelow = window.innerHeight - targetCenterY - margin;
        const spaceLeft = targetRect.left - margin;
        const spaceRight = window.innerWidth - targetRect.right - margin;

        // Horizontal positioning: prefer right, fallback to left
        let left;
        if (spaceRight >= popupWidth + gap) {
            // Position to the right of the target
            left = targetRect.right + gap;
        } else if (spaceLeft >= popupWidth + gap) {
            // Position to the left of the target
            left = targetRect.left - popupWidth - gap;
        } else {
            // Not enough space on either side, use side with most space
            if (spaceRight > spaceLeft) {
                left = Math.max(margin, window.innerWidth - popupWidth - margin);
            } else {
                left = margin;
            }
        }

        // Vertical positioning: center on button, prefer upward when possible
        let top = targetCenterY - (popupHeight / 2);

        // Smart vertical adjustment based on available space
        if (top + popupHeight > window.innerHeight - margin) {
            // Would go off bottom, try to position upward
            if (spaceAbove >= popupHeight) {
                // Enough space above, keep centered but shift up if needed
                top = Math.max(margin, window.innerHeight - popupHeight - margin);
            } else {
                // Not enough space above or below, clamp to bottom
                top = window.innerHeight - popupHeight - margin;
            }
        }

        if (top < margin) {
            // Would go off top, clamp to top
            top = margin;
        }

        // Final clamping to ensure fully visible
        left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - popupHeight - margin));

        widgetSettingsPopup.style.left = `${left}px`;
        widgetSettingsPopup.style.top = `${top}px`;
        widgetSettingsPopup.style.width = `${popupWidth}px`;

        // Cache initial position
        modalPositionCache.widgetSettings = { left, top, width: popupWidth };
    }

    widgetSettingsPopup.dataset.widgetId = widget.id;

    // Only setup if not already open, OR if switching to a different widget
    if (!isAlreadyOpen || !isSameWidget) {
        widgetSettingsPopup.classList.add('active');
        // Setup dynamic boundary detection when first opening or switching widgets
        setupDynamicBoundaryDetection(widgetSettingsPopup, 'widgetSettings');
    }

    // Attach event listeners to settings inputs
    attachSettingsListeners(widget);

    // Scan for Iconify icons in the settings popup
    if (typeof Iconify !== 'undefined') {
        Iconify.scan(widgetSettingsPopup);
    }
}

// Global state for settings interaction
let currentSettingsWidget = null;
let currentAppIconifyPicker = null;
let settingsInputTimeout = null;

// Helper function for saving widget settings
const getEl = (id) => document.getElementById(id);

function saveWidgetSettings(widget) {
    // Helper to get value or checked based on element type
    const getValue = (el, defaultVal = '') => {
        if (!el) return defaultVal;
        return el.type === 'checkbox' ? el.checked : (el.value || defaultVal);
    };

    const s = widget.settings; // Shorthand

    // Save settings based on widget type
    switch(widget.type) {
        case 'app':
            s.name = getValue(getEl('appName'), 'App');
            s.showLabel = getValue(getEl('appShowLabel')); // New: App Title toggle
            const urlEl = getEl('appUrl');
            if (urlEl) {
                let url = urlEl.value || 'Example.com';
                if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
                s.url = url;
            }
            const colorEl = getEl('appColorIcon');
            if (colorEl !== null) s.colorIcon = colorEl.checked;
            s.hideBackground = !getValue(getEl('appShowGlassBG')); // New: Glass BG toggle (reversed logic)
            s.hideWhenNotHovered = getValue(getEl('hideWhenNotHovered'));
            break;

        case 'clock':
            s.format24h = getValue(getEl('format24h'));
            s.showSeconds = getValue(getEl('showSeconds'));
            s.showDate = getValue(getEl('showDate'));
            s.showWeather = getValue(getEl('showWeather'));
            s.hideBackground = !getValue(getEl('showGlassBG')); // Reversed logic
            s.hideWhenNotHovered = getValue(getEl('hideWhenNotHovered'));

            const locClock = getEl('location');
            if (locClock) {
                const newLoc = locClock.value || 'Copenhagen';
                s.location = newLoc;
                // Sync to weather widgets
                if (window.TrueTab.widgetsArray) {
                    window.TrueTab.widgetsArray.filter(w => w.type === 'weather').forEach(w => w.settings.location = newLoc);
                }
                if (window.TrueTab.widgetModules.weather && window.TrueTab.widgetModules.weather.fetchWeatherData) {
                    window.TrueTab.widgetModules.weather.fetchWeatherData(newLoc, true);
                }
            }
            break;

        case 'weather':
            s.units = getValue(getEl('units'), 'celsius');
            s.hideBackground = !getValue(getEl('showGlassBG')); // Reversed logic
            s.hideWhenNotHovered = getValue(getEl('hideWhenNotHovered'));

            // Forecast and display options
            s.forecastDays = getValue(getEl('forecastDays'), 'none');
            s.showLocationTitle = getValue(getEl('showLocationTitle'), true);
            s.showIcon = getValue(getEl('showIcon'), true);
            s.showDescription = getValue(getEl('showDescription'), true);
            s.showExtraInfo = getValue(getEl('showExtraInfo'), true);

            const locWeather = getEl('location');
            if (locWeather) {
                const newLoc = locWeather.value || 'Copenhagen';
                s.location = newLoc;
                // Sync to clock widgets
                if (window.TrueTab.widgetsArray) {
                    window.TrueTab.widgetsArray.filter(w => w.type === 'clock').forEach(w => w.settings.location = newLoc);
                }
                // Force refresh with new settings
                if (window.TrueTab.widgetModules.weather && window.TrueTab.widgetModules.weather.fetchWeatherData) {
                    window.TrueTab.widgetModules.weather.fetchWeatherData(newLoc, { ...s, forceUpdate: true });
                }
            }
            break;

        case 'search':
            s.showBackgroundText = getValue(getEl('showBackgroundText'));
            s.hideWhenNotHovered = getValue(getEl('hideWhenNotHovered'));
            // enabledBars and barSettings are managed by the unified widget itself
            // and by per-bar settings modals, not saved here
            break;

        case 'bar-youtube':
            s.showSearchIcon = getValue(getEl('ytShowSearchIcon'));
            s.placeholder = getValue(getEl('ytPlaceholder'), '');
            s.backgroundText = getValue(getEl('barBackgroundText'), '');
            break;

        case 'bar-test':
            s.backgroundText = getValue(getEl('barBackgroundText'), '');
            break;

        case 'bar-search':
            s.searchEngine = getValue(getEl('searchEngine'), 'google');
            s.placeholder = getValue(getEl('searchPlaceholder'), '');
            s.enableAutocomplete = getValue(getEl('enableAutocomplete'));
            s.showSearchIcon = getValue(getEl('showSearchIcon'));
            s.hideButtonOutline = getValue(getEl('hideButtonOutline'));
            s.backgroundText = getValue(getEl('barBackgroundText'), '');
            break;

        case 'quote':
            // autoRefresh and refreshInterval removed - auto-refresh every 20 mins by default
            s.autoRefresh = true;
            s.refreshInterval = 1200; // 20 minutes in seconds
            s.hideBackground = !getValue(getEl('showGlassBG')); // Reversed logic
            s.hideWhenNotHovered = getValue(getEl('hideWhenNotHovered'));

            const catEl = getEl('category');
            if (catEl) {
                s.category = catEl.value || 'inspirational';
                // Force refresh
                if (window.TrueTab.widgetModules.quote) {
                    const el = getEl(widget.id);
                    if (el && window.TrueTab.widgetModules.quote.update) {
                        window.TrueTab.widgetModules.quote.update(el, s);
                    }
                }
            }
            break;

        case 'calendar':
            s.showEvents = getValue(getEl('showEvents'));
            // showEventGlow combined with showEvents as per requirements
            s.showEventGlow = getValue(getEl('showEvents')); // Same as showEvents
            s.showArrows = getValue(getEl('showArrows'));
            s.showYear = getValue(getEl('showYear'));
            s.showWeekNumber = getValue(getEl('showWeekNumber'));
            s.hideBackground = !getValue(getEl('showGlassBG')); // Reversed logic
            s.hideWhenNotHovered = getValue(getEl('hideWhenNotHovered'));
            break;

        case 'stocks':
            s.title = getValue(getEl('stockTitle'), '');
            s.showPrice = getValue(getEl('showPrice'));
            s.showChange = getValue(getEl('showChange'));
            s.showPercent = getValue(getEl('showPercent'));
            s.showLogo = getValue(getEl('showLogo'));
            // hideSymbol removed - always show symbols by default
            s.hideSymbol = false;
            s.hideBackground = !getValue(getEl('showGlassBG')); // Reversed logic
            s.hideWhenNotHovered = getValue(getEl('hideWhenNotHovered'));

            const symEl = getEl('symbols');
            if (symEl) {
                const input = symEl.value || 'AAPL, GOOGL, MSFT';
                s.symbols = input.split(',').map(x => x.trim()).filter(x => x);
            }
            break;

        case 'chatbot':
            s.provider = getValue(getEl('chatbotProvider'), 'gemini');

            // Only use dropdown selection (customModel removed)
            const selectedModel = getValue(getEl('chatbotModelSelect'), 'gemini-2.5-flash');
            s.model = selectedModel;

            // Placeholder and temperature removed - use defaults
            s.placeholder = '';
            s.systemPrompt = getValue(getEl('chatbotSystemPrompt'), 'You are a concise, helpful assistant.');
            // maxHistory set to 100 in background as per requirements
            s.maxHistory = 100;
            // hideBackground always false for chatbot (must always have background)
            s.hideBackground = false;
            s.hideButtonOutline = true; // Always true (no button outline)
            s.hideWhenNotHovered = getValue(getEl('hideWhenNotHovered'));
            s.backgroundText = getValue(getEl('barBackgroundText'), '');
            break;

        case 'cinema':
            s.placeholder = ''; // Hardcoded to empty string
            s.openTarget = 'imdb'; // Hardcoded
            s.language = getValue(getEl('cinemaLanguage'), 'en-US');
            s.country = getValue(getEl('cinemaCountry'), 'DK');
            s.maxSuggestions = 10; // Hardcoded to 10
            s.debounceMs = 200; // Fixed value
            s.showSearchIcon = getValue(getEl('cinemaShowSearchIcon'));
            s.showPoster = true; // Hardcoded
            s.showYear = true; // Hardcoded
            s.showTypeBadge = true; // Hardcoded
            s.showImdbRating = true; // Hardcoded
            s.showProviders = true; // Hardcoded
            s.maxProviderIcons = 16; // Hardcoded to 16 for 2x8 grid
            s.hideBackground = false; // Cinema always has background
            s.hideButtonOutline = true; // Always true (no button outline)
            s.hideWhenNotHovered = getValue(getEl('hideWhenNotHovered'));
            s.backgroundText = getValue(getEl('barBackgroundText'), '');
            break;


        case 'apps':
            s.title = getValue(getEl('appsTitle'), '');
            s.glassBGMode = getValue(getEl('appsGlassBGMode'), 'show-all'); // New: Glass BG dropdown
            s.showLabels = getValue(getEl('showAppNames')); // New: App Names toggle
            s.hideWhenNotHovered = getValue(getEl('hideWhenNotHovered'));
            break;

        case 'empty':
            s.title = getValue(getEl('quickLinksTitle'), '');
            s.hideBackground = !getValue(getEl('showGlassBG')); // Reversed logic
            s.hideWhenNotHovered = getValue(getEl('hideWhenNotHovered'));
            break;
    }

    window.TrueTab.saveWidgets();
    window.TrueTab.renderWidgets();
}

// Model options per provider
const chatbotModels = {
    openai: [
        { value: 'gpt-5-turbo', label: 'GPT-5 Turbo' },
        { value: 'gpt-5', label: 'GPT-5' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    anthropic: [
        { value: 'claude-4.5-sonnet-20250514', label: 'Claude 4.5 Sonnet' },
        { value: 'claude-4.5-opus-20250514', label: 'Claude 4.5 Opus' },
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
        { value: 'claude-3-opus-latest', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
    ],
    gemini: [
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
    ],
    groq: [
        { value: 'grok-4-turbo', label: 'Grok 4 Turbo' },
        { value: 'grok-4', label: 'Grok 4' },
        { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
        { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B' },
        { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
        { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
    ],
    mistral: [
        { value: 'mistral-large-latest', label: 'Mistral Large' },
        { value: 'mistral-small-latest', label: 'Mistral Small' },
        { value: 'codestral-latest', label: 'Codestral' },
        { value: 'mistral-tiny-latest', label: 'Mistral Tiny' }
    ],
    openrouter: [
        { value: 'openrouter/auto', label: 'Auto (Best Available)' },
        { value: 'anthropic/claude-4.5-sonnet', label: 'Claude 4.5 Sonnet' },
        { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
        { value: 'openai/gpt-5-turbo', label: 'GPT-5 Turbo' },
        { value: 'openai/gpt-4o', label: 'GPT-4o' },
        { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { value: 'google/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
        { value: 'x-ai/grok-4', label: 'Grok 4' },
        { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' }
    ],
    deepseek: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat' },
        { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' }
    ]
};

function populateChatbotModels(provider, currentModel) {
    const modelSelect = document.getElementById('chatbotModelSelect');
    if (!modelSelect) return;

    const models = chatbotModels[provider] || [];
    modelSelect.innerHTML = models.map(m =>
        `<option value="${m.value}" ${m.value === currentModel ? 'selected' : ''}>${m.label}</option>`
    ).join('');
}


function attachSettingsListeners(widget) {
    // Store current widget for event delegation
    currentSettingsWidget = widget;

    // Cleanup: Destroy old IconifyPicker instance to prevent memory leak
    if (currentAppIconifyPicker && currentAppIconifyPicker.destroy) {
        currentAppIconifyPicker.destroy();
        currentAppIconifyPicker = null;
    }

    // Initialize Iconify Picker for app widget
    if (widget.type === 'app' && window.IconifyPicker) {
        currentAppIconifyPicker = new window.IconifyPicker('appIconifyPicker', (iconId) => {
            widget.settings.icon = iconId;
            // Hide uploaded icon preview when iconify icon is selected
            const appIconPreview = document.getElementById('appIconPreview');
            const appIconUpload = document.getElementById('appIconUpload');
            if (appIconPreview) {
                appIconPreview.style.display = 'none';
            }
            if (appIconUpload) {
                appIconUpload.value = '';
            }
            saveWidgetSettings(widget);
            window.TrueTab.renderWidgets();
            setTimeout(() => openWidgetSettings(widget), 100);
        });

        // Add Edit Icon button handler
        const appIconEditBtn = document.getElementById('appIconEditBtn');
        if (appIconEditBtn) {
            appIconEditBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const appIconUpload = document.getElementById('appIconUpload');
                if (appIconUpload) {
                    appIconUpload.click();
                }
            });
        }

        // Add Delete Icon button handler
        const appIconDeleteBtn = document.getElementById('appIconDeleteBtn');
        if (appIconDeleteBtn) {
            appIconDeleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                widget.settings.icon = '';
                const appIconPreview = document.getElementById('appIconPreview');
                const appIconPreviewImg = document.getElementById('appIconPreviewImg');
                const appIconUpload = document.getElementById('appIconUpload');
                if (appIconPreviewImg) {
                    appIconPreviewImg.src = '';
                }
                if (appIconPreview) {
                    appIconPreview.style.display = 'none';
                }
                if (appIconUpload) {
                    appIconUpload.value = '';
                }
                saveWidgetSettings(widget);
                window.TrueTab.renderWidgets();
            });
        }
    }

    // Initialize chatbot model dropdown
    if (widget.type === 'chatbot') {
        const provider = widget.settings.provider || 'gemini';
        const model = widget.settings.model || 'gemini-2.5-flash';
        populateChatbotModels(provider, model);

        // Handle provider change
        const providerSelect = document.getElementById('chatbotProvider');
        if (providerSelect) {
            providerSelect.addEventListener('change', (e) => {
                const newProvider = e.target.value;
                const defaultModel = chatbotModels[newProvider]?.[0]?.value || 'gemini-2.5-flash';
                populateChatbotModels(newProvider, defaultModel);
            });
        }
    }

    // Input bar widget: per-bar settings buttons
    if (widget.type === 'search') {
        const barSettingsBtns = document.querySelectorAll('.input-bar-settings-btn');
        barSettingsBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const barId = btn.dataset.barId;
                if (!barId) return;

                // Determine bar type for settings template lookup
                const barType = barSettingsTypeMap[barId];
                if (!barType || !settingsTemplates[barType]) return;

                // Get bar-specific settings
                const barSettings = (widget.settings.barSettings && widget.settings.barSettings[barId]) || {};

                // Show bar settings in the popup
                const content = widgetSettingsPopup.querySelector('#widgetSettingsContent');
                const titleEl = widgetSettingsPopup.querySelector('#widgetSettingsTitle');

                const mod = window.TrueTab.widgetModules[barId];
                const meta = mod && mod.barMeta ? mod.barMeta : { name: barId };

                if (titleEl) titleEl.textContent = `${meta.name} Settings`;

                // Use the existing settings template for this bar type
                if (content) {
                    // Add a back button
                    const backBtn = `<div class="popup-tab popup-tab-cancel" id="barSettingsBackBtn" style="margin-bottom: 8px; cursor: pointer;">← Back</div>`;
                    content.innerHTML = backBtn + settingsTemplates[barType](barSettings);
                }

                // Attach back button — must stopPropagation so the document-level
                // click-outside handler doesn't close the popup (the back button
                // gets removed from DOM by innerHTML replacement before the event
                // finishes bubbling, causing contains() to fail).
                const backBtnEl = document.getElementById('barSettingsBackBtn');
                if (backBtnEl) {
                    backBtnEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openWidgetSettings(widget);
                    });
                }

                // Setup bar-specific listeners (chatbot model dropdown etc.)
                if (barType === 'chatbot') {
                    const provider = barSettings.provider || 'gemini';
                    const model = barSettings.model || 'gemini-2.5-flash';
                    populateChatbotModels(provider, model);

                    const providerSelect = document.getElementById('chatbotProvider');
                    if (providerSelect) {
                        providerSelect.addEventListener('change', (e) => {
                            const newProvider = e.target.value;
                            const defaultModel = chatbotModels[newProvider]?.[0]?.value || 'gemini-2.5-flash';
                            populateChatbotModels(newProvider, defaultModel);
                        });
                    }
                }

                // Override the save function to save into barSettings
                const origSave = saveWidgetSettings;
                const tempSaveHandler = () => {
                    // Create a temp widget to use the existing save logic
                    const tempWidget = { type: barType, settings: { ...barSettings } };
                    origSave(tempWidget);

                    // Copy saved settings into the real widget's barSettings
                    if (!widget.settings.barSettings) widget.settings.barSettings = {};
                    widget.settings.barSettings[barId] = tempWidget.settings;

                    window.TrueTab.saveWidgets();
                    window.TrueTab.renderWidgets();
                };

                // Attach save via the existing input change detection
                if (widgetSettingsPopup) {
                    // Remove old handler, add new one
                    widgetSettingsPopup._barSettingsSave = tempSaveHandler;
                }

                // Scan icons
                if (typeof Iconify !== 'undefined') {
                    Iconify.scan(widgetSettingsPopup);
                }
            });
        });
    }

}

function openAppLinkSettings(widget, linkIndex, link) {
    // Cleanup previous IconifyPicker instance if exists
    if (editAppIconifyPickerInstance && editAppIconifyPickerInstance.destroy) {
        editAppIconifyPickerInstance.destroy();
        editAppIconifyPickerInstance = null;
    }

    // Replace the content in the existing widget settings popup
    const content = widgetSettingsPopup.querySelector('#widgetSettingsContent');
    if (!content) return;

    // Store the fact that we're showing edit screen for repositioning
    widgetSettingsPopup.dataset.currentView = 'editApp';

    const isNewApp = linkIndex === -1;
    const buttonText = isNewApp ? 'Save' : 'Save';
    const backText = 'Cancel';

    content.innerHTML = `
        ${buildTextInput('editAppName', 'App Name', link.name || '', 'Enter app name')}
        ${buildTextInput('editAppUrl', 'URL', link.url || '', 'Example.com')}
        <div id="editAppIconifyPicker"></div>
        <div class="settings-menu-item">
            <label for="editAppIcon">Upload Icon</label>
            <label for="editAppIcon" class="settings-file-label" style="flex: 1; cursor: pointer;">Choose File</label>
            <input type="file" id="editAppIcon" class="settings-file-input" accept="image/*" style="display: none;">
        </div>
        <div id="editIconPreview" class="settings-menu-item" style="${(link.icon && link.icon.startsWith('data:')) ? 'display: flex;' : 'display: none;'}">
            <label>Edit Icon</label>
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <img id="editIconPreviewImg" src="${(link.icon && link.icon.startsWith('data:')) ? link.icon : ''}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15);">
                <button id="editIconEditBtn" class="settings-button-save" style="flex: 0 0 auto; padding: 6px 12px; min-height: 32px;">Edit</button>
                <button id="editIconDeleteBtn" class="settings-button-back" style="flex: 0 0 auto; padding: 6px 12px; min-height: 32px;">✕</button>
            </div>
        </div>
        ${buildCheckbox('editAppColorIcon', 'Color Icon', link.colorIcon !== false)}
        <div class="settings-menu-item" style="gap: 8px; padding: 4px; margin-top: 2px;">
            <div id="cancelEditApp" class="popup-tab popup-tab-cancel">${backText}</div>
            ${!isNewApp ? `<div id="deleteEditApp" class="popup-tab popup-tab-cancel" style="flex: 0 0 auto; padding: 6px 10px;">✕</div>` : ''}
            <div id="saveEditApp" class="popup-tab popup-tab-save">${buttonText}</div>
        </div>
    `;

    let editIconData = link.icon;

    // Initialize Iconify Picker for Edit App
    if (window.IconifyPicker) {
        editAppIconifyPickerInstance = new window.IconifyPicker('editAppIconifyPicker', (iconId) => {
            editIconData = iconId;
            const iconPreview = document.getElementById('editIconPreview');
            const iconInput = document.getElementById('editAppIcon');
            // Hide uploaded icon preview when iconify icon is selected
            if (iconPreview) {
                iconPreview.style.display = 'none';
            }
            if (iconInput) {
                iconInput.value = '';
            }
        });
    }

    // Icon upload handler
    const iconInput = document.getElementById('editAppIcon');
    const iconPreview = document.getElementById('editIconPreview');
    const iconPreviewImg = document.getElementById('editIconPreviewImg');

    // Handle Edit Icon button
    const editIconEditBtn = document.getElementById('editIconEditBtn');
    if (editIconEditBtn) {
        editIconEditBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Trigger file input to select a new icon
            if (iconInput) {
                iconInput.click();
            }
        });
    }

    // Handle Delete Icon button
    const editIconDeleteBtn = document.getElementById('editIconDeleteBtn');
    if (editIconDeleteBtn) {
        editIconDeleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Clear the uploaded icon
            editIconData = '';
            if (iconPreviewImg) {
                iconPreviewImg.src = '';
            }
            if (iconPreview) {
                iconPreview.style.display = 'none';
            }
            if (iconInput) {
                iconInput.value = '';
            }
        });
    }

    if (iconInput) {
        iconInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    editIconData = e.target.result;
                    iconPreviewImg.src = editIconData;
                    iconPreview.style.display = 'flex';
                    // Clear iconify picker selection
                    if (editAppIconifyPickerInstance && editAppIconifyPickerInstance.clearSelection) {
                        editAppIconifyPickerInstance.clearSelection();
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Cancel button - go back to app list
    const cancelBtn = document.getElementById('cancelEditApp');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            widgetSettingsPopup.dataset.currentView = 'main';
            openWidgetSettings(widget);
        });
    }

    // Delete button - remove this app and go back
    const deleteBtn = document.getElementById('deleteEditApp');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            widget.settings.links.splice(linkIndex, 1);
            saveWidgetSettings(widget);
            window.TrueTab.renderWidgets();
            widgetSettingsPopup.dataset.currentView = 'main';
            openWidgetSettings(widget);
        });
    }

    // Save button
    const saveBtn = document.getElementById('saveEditApp');
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = document.getElementById('editAppName').value.trim();
            const url = document.getElementById('editAppUrl').value.trim();
            const colorIcon = document.getElementById('editAppColorIcon').checked;

            if (!name || !url) {
                alert('Please enter both app name and URL');
                return;
            }

            if (!editIconData) {
                alert('Please select or upload an icon');
                return;
            }

            const appData = {
                name,
                url,
                icon: editIconData,
                colorIcon
            };

            if (isNewApp) {
                // Add new app to the scroller
                if (!widget.settings.links) {
                    widget.settings.links = [];
                }
                widget.settings.links.push(appData);
            } else {
                // Update existing link
                widget.settings.links[linkIndex] = appData;
            }

            window.TrueTab.renderWidgets();
            window.TrueTab.saveWidgets();
            openWidgetSettings(widget); // Go back to the main settings UI
        });
    }
}

function openQuickLinkSettings(widget, linkIndex, link) {
    // Replace the content in the existing widget settings popup
    const content = widgetSettingsPopup.querySelector('#widgetSettingsContent');
    if (!content) return;

    // Store the fact that we're showing edit screen for repositioning
    widgetSettingsPopup.dataset.currentView = 'editLink';

    const isNewLink = linkIndex === -1;
    const buttonText = 'Save';
    const backText = 'Cancel';

    content.innerHTML = `
        ${buildTextInput('editLinkName', 'Link Name', link.name || '', 'Enter link name')}
        ${buildTextInput('editLinkUrl', 'URL', link.url || '', 'Example.com')}
        <div class="settings-menu-item">
            <label for="editLinkColorBg">Color Link BG</label>
            <input type="color" id="editLinkColorBg" value="${link.colorBg || '#ffffff'}" class="settings-color-picker">
        </div>
        <div class="settings-menu-item" style="gap: 8px; padding: 4px; margin-top: 2px;">
            <div id="cancelEditLink" class="popup-tab popup-tab-cancel">${backText}</div>
            <div id="saveEditLink" class="popup-tab popup-tab-save">${buttonText}</div>
        </div>
    `;

    // Cancel button - go back to link list
    const cancelBtn = document.getElementById('cancelEditLink');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            widgetSettingsPopup.dataset.currentView = 'main';
            openWidgetSettings(widget); // Go back to the main quick links settings
        });
    }

    // Save button
    const saveBtn = document.getElementById('saveEditLink');
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = document.getElementById('editLinkName').value.trim();
            const url = document.getElementById('editLinkUrl').value.trim();
            const colorBg = document.getElementById('editLinkColorBg').value;

            if (!name || !url) {
                alert('Please enter both link name and URL');
                return;
            }

            const linkData = {
                name,
                url,
                colorBg
            };

            if (isNewLink) {
                // Add new link
                if (!widget.settings.links) {
                    widget.settings.links = [];
                }
                widget.settings.links.push(linkData);
            } else {
                // Update existing link
                widget.settings.links[linkIndex] = linkData;
            }

            window.TrueTab.renderWidgets();
            window.TrueTab.saveWidgets();
            openWidgetSettings(widget); // Go back to the main settings UI
        });
    }
}

// Wait for DOM to be ready before attaching event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Query DOM elements NOW that DOM is ready
    settingsModal = document.getElementById('settingsModal');
    addWidgetModal = document.getElementById('addWidgetModal');
    widgetSettingsPopup = document.getElementById('widgetSettingsPopup');


    // Initialize modals with dynamically generated HTML
    initializeMainSettingsModal();
    initializeAddWidgetModal();

    // Attach delegated event listeners for widget settings
    if (widgetSettingsPopup) {
        const settingsContent = widgetSettingsPopup.querySelector('#widgetSettingsContent');
        if (settingsContent) {
            // Change handler for inputs
            settingsContent.addEventListener('change', (e) => {
                if (e.target.matches('input, select, textarea') && currentSettingsWidget) {
                    // If in per-bar settings mode, use the bar-specific save handler
                    if (widgetSettingsPopup._barSettingsSave) {
                        widgetSettingsPopup._barSettingsSave();
                    } else {
                        saveWidgetSettings(currentSettingsWidget);
                    }
                }
                // Handle app icon upload
                if (e.target.id === 'appIconUpload') {
                    const file = e.target.files[0];
                    if (file && currentSettingsWidget) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            currentSettingsWidget.settings.icon = event.target.result;
                            // Show preview
                            const appIconPreview = document.getElementById('appIconPreview');
                            const appIconPreviewImg = document.getElementById('appIconPreviewImg');
                            if (appIconPreviewImg) {
                                appIconPreviewImg.src = event.target.result;
                            }
                            if (appIconPreview) {
                                appIconPreview.style.display = 'flex';
                            }
                            // Clear iconify picker selection
                            if (currentAppIconifyPicker && currentAppIconifyPicker.clearSelection) {
                                currentAppIconifyPicker.clearSelection();
                            }
                            saveWidgetSettings(currentSettingsWidget);
                            window.TrueTab.renderWidgets();
                        };
                        reader.readAsDataURL(file);
                    }
                }
            });

            // Input handler for text/number inputs with debounce
            settingsContent.addEventListener('input', (e) => {
                const input = e.target;

                // Handle chatbot temperature slider
                if (input.id === 'chatbotTemperature') {
                    const tempValue = document.getElementById('chatbotTempValue');
                    if (tempValue) {
                        tempValue.textContent = parseFloat(input.value).toFixed(1);
                    }
                }

                // Handle cinema sliders
                if (input.id === 'cinemaMaxSuggestions') {
                    const valueSpan = document.getElementById('cinemaMaxSuggestionsValue');
                    if (valueSpan) {
                        valueSpan.textContent = input.value;
                    }
                }
                if (input.id === 'cinemaMaxProviderIcons') {
                    const valueSpan = document.getElementById('cinemaMaxProviderIconsValue');
                    if (valueSpan) {
                        valueSpan.textContent = input.value;
                    }
                }

                if ((input.type === 'text' || input.type === 'number' || input.type === 'range') && currentSettingsWidget) {
                    clearTimeout(settingsInputTimeout);
                    settingsInputTimeout = setTimeout(() => {
                        saveWidgetSettings(currentSettingsWidget);
                    }, 500);
                }
            });

            // Click handler for buttons (apps scroller settings, etc.)
            settingsContent.addEventListener('click', (e) => {
                if (!currentSettingsWidget) return;
                const widget = currentSettingsWidget;

                // Handle delete search history button
                if (e.target.id === 'deleteSearchHistory') {
                    if (confirm('Are you sure you want to delete all search history?')) {
                        localStorage.removeItem('truetab_search_history_v1');
                        alert('Search history deleted successfully!');
                    }
                    return;
                }

                // Handle add app button in app scroller settings
                if (e.target.id === 'addAppBtn') {
                    e.stopPropagation();
                    // Open app link settings with linkIndex = -1 to indicate new app
                    openAppLinkSettings(widget, -1, { name: '', url: '', icon: '', colorIcon: true });
                    return;
                }

                // Handle settings button for app links (in apps scroller)
                if (e.target.closest('.settings-app-btn')) {
                    e.stopPropagation();
                    const btn = e.target.closest('.settings-app-btn');
                    const index = parseInt(btn.dataset.index);
                    const link = widget.settings.links[index];
                    openAppLinkSettings(widget, index, link);
                    return;
                }

                // Handle remove app button
                if (e.target.closest('.remove-app-btn')) {
                    const btn = e.target.closest('.remove-app-btn');
                    const index = parseInt(btn.dataset.index);
                    widget.settings.links.splice(index, 1);
                    saveWidgetSettings(widget);
                    openWidgetSettings(widget);
                }

                // Handle add link button in quick links settings
                if (e.target.id === 'addLinkBtn') {
                    e.stopPropagation();
                    // Open link settings with linkIndex = -1 to indicate new link
                    openQuickLinkSettings(widget, -1, { name: '', url: '', colorBg: '#ffffff' });
                    return;
                }

                // Handle settings button for quick links
                if (e.target.closest('.settings-link-btn')) {
                    e.stopPropagation();
                    const btn = e.target.closest('.settings-link-btn');
                    const index = parseInt(btn.dataset.index);
                    const link = widget.settings.links[index];
                    openQuickLinkSettings(widget, index, link);
                    return;
                }

                // Handle remove link button
                if (e.target.closest('.remove-link-btn')) {
                    const btn = e.target.closest('.remove-link-btn');
                    const index = parseInt(btn.dataset.index);
                    widget.settings.links.splice(index, 1);
                    saveWidgetSettings(widget);
                    openWidgetSettings(widget);
                }
            });
        }
    }

const editBtn = document.getElementById('editBtn');
const settingsBtn = document.getElementById('settingsBtn');

if (editBtn) {
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling to global click listener

        const wasInEditMode = window.TrueTab.editMode;
        window.TrueTab.editMode = !window.TrueTab.editMode;

        editBtn.innerHTML = window.TrueTab.editMode
            ? '<span class="iconify" data-icon="material-symbols:lock-open-outline" data-width="20" data-height="20"></span>'
            : '<span class="iconify" data-icon="material-symbols:lock-outline" data-width="20" data-height="20"></span>';
        editBtn.title = window.TrueTab.editMode ? 'Lock' : 'Unlock';

        // Re-scan for Iconify icons
        if (window.Iconify && window.Iconify.scan) {
            window.Iconify.scan(editBtn);
        }

        const gridContainer = window.TrueTab.gridContainer || document.getElementById('gridContainer');
        if (gridContainer) {
            gridContainer.classList.toggle('edit-mode', window.TrueTab.editMode);
        }

        // Show/hide edit mode tip banner
        const editModeTip = document.getElementById('editModeTip');
        if (editModeTip) {
            const tipDismissed = localStorage.getItem('editModeTipDismissed') === 'true';
            if (window.TrueTab.editMode && !tipDismissed) {
                editModeTip.style.display = 'flex';
                // Wire up close button if not already wired
                const closeTipBtn = document.getElementById('closeTipBtn');
                if (closeTipBtn && !closeTipBtn._tipListenerAdded) {
                    closeTipBtn._tipListenerAdded = true;
                    closeTipBtn.addEventListener('click', () => {
                        localStorage.setItem('editModeTipDismissed', 'true');
                        editModeTip.style.display = 'none';
                    });
                }
            } else {
                editModeTip.style.display = 'none';
            }
        }

        window.TrueTab.renderWidgets();
        window.TrueTab.updateGridOutline();
    });
}

if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling to global click listener

        // Cache current settings for cancel/discard functionality
        if (window.TrueTab.cacheSettingsForCancel) {
            window.TrueTab.cacheSettingsForCancel();
        }

        // Close other modals first
        if (widgetSettingsPopup && widgetSettingsPopup.classList.contains('active')) {
            widgetSettingsPopup.classList.remove('active');
        }
        if (addWidgetModal && addWidgetModal.classList.contains('active')) {
            addWidgetModal.classList.remove('active');
        }

        // Open settings modal with null check
        if (settingsModal) {
            settingsModal.classList.add('active');
        } else {
            // Fallback: re-query if original query failed
            const modal = document.getElementById('settingsModal');
            if (modal) {
                modal.classList.add('active');
            }
        }
    });
}

// Handle Close and Save buttons in settings modal footer
if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
        // Handle Close button - discard changes
        if (e.target.classList.contains('settings-button-back')) {
            if (window.TrueTab.discardSettingsChanges) {
                window.TrueTab.discardSettingsChanges();
            }
            settingsModal.classList.remove('active');
        }

        // Handle Save button - commit changes
        if (e.target.classList.contains('settings-button-save')) {
            if (window.TrueTab.commitSettingsChanges) {
                window.TrueTab.commitSettingsChanges();
            }
            settingsModal.classList.remove('active');
        }
    });
}

// Single app creation with IconifyPicker
const addSingleAppBtn = document.getElementById('addSingleAppBtn');
const singleAppIcon = document.getElementById('singleAppIcon');
const singleIconPreview = document.getElementById('singleIconPreview');
const singleIconPreviewImg = document.getElementById('singleIconPreviewImg');

// Handle icon upload
if (singleAppIcon) {
    singleAppIcon.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                currentSingleAppIcon = event.target.result;
                singleIconPreviewImg.src = currentSingleAppIcon;
                singleIconPreview.style.display = 'flex';
                // Clear iconify picker selection
                if (addAppIconifyPicker && addAppIconifyPicker.clearSelection) {
                    addAppIconifyPicker.clearSelection();
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

// Handle Edit Icon button
const singleIconEditBtn = document.getElementById('singleIconEditBtn');
if (singleIconEditBtn) {
    singleIconEditBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Trigger file input to select a new icon
        if (singleAppIcon) {
            singleAppIcon.click();
        }
    });
}

// Handle Delete Icon button
const singleIconDeleteBtn = document.getElementById('singleIconDeleteBtn');
if (singleIconDeleteBtn) {
    singleIconDeleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Clear the uploaded icon
        currentSingleAppIcon = null;
        if (singleIconPreviewImg) {
            singleIconPreviewImg.src = '';
        }
        if (singleIconPreview) {
            singleIconPreview.style.display = 'none';
        }
        if (singleAppIcon) {
            singleAppIcon.value = '';
        }
    });
}

// Initialize Iconify Picker for Add App Modal
if (window.IconifyPicker) {
    addAppIconifyPicker = new window.IconifyPicker('addAppIconifyPicker', (iconId) => {
        currentSingleAppIcon = iconId;
        // Hide uploaded icon preview when iconify icon is selected
        if (singleIconPreview) {
            singleIconPreview.style.display = 'none';
        }
        if (singleAppIcon) {
            singleAppIcon.value = '';
        }
    });
}

if (addSingleAppBtn) {
    addSingleAppBtn.addEventListener('click', () => {
        const name = document.getElementById('singleAppName')?.value.trim() || '';
        const url = document.getElementById('singleAppUrl')?.value.trim() || '';
        const showLabel = document.getElementById('singleAppShowLabel')?.checked ?? true;
        const showGlassBG = document.getElementById('singleAppShowGlassBG')?.checked ?? true;
        const colorIcon = document.getElementById('singleAppColorIcon')?.checked ?? true;
        const hideWhenNotHovered = document.getElementById('singleAppHideWhenNotHovered')?.checked ?? false;

        if (!name) {
            alert('Please enter an app name');
            return;
        }

        if (!url) {
            alert('Please enter a URL');
            return;
        }

        // Validate URL format
        let validUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            validUrl = 'https://' + url;
        }

        // Validate icon
        if (!currentSingleAppIcon) {
            alert('Please provide an icon (either select from Iconify or upload an image)');
            return;
        }

        // Priority: uploaded icon > iconify icon > default emoji
        const icon = currentSingleAppIcon || '📱';

        // Use preferred grid position if available, otherwise find available slot
        let slot;
        if (window.TrueTab.preferredGridPosition) {
            slot = window.TrueTab.preferredGridPosition;
            window.TrueTab.preferredGridPosition = null; // Clear after use
        } else {
            slot = window.TrueTab.utils.findAvailableSlot(1, 1);
        }

        // Create new single app widget (1x1)
        const widgetIdCounter = window.TrueTab.widgetIdCounter || 1000;
        const newWidget = {
            id: `app${widgetIdCounter}`,
            type: 'app',
            x: slot.x,
            y: slot.y,
            w: 1,
            h: 1,
            settings: {
                name: name,
                url: validUrl,
                icon: icon,
                showLabel: showLabel,
                hideBackground: !showGlassBG,  // Reversed logic
                colorIcon: colorIcon,
                hideWhenNotHovered: hideWhenNotHovered
            }
        };
        window.TrueTab.widgetIdCounter = widgetIdCounter + 1;
        window.TrueTab.widgetsArray.push(newWidget);
        window.TrueTab.saveWidgets();
        window.TrueTab.renderWidgets();
        if (window.TrueTab.editMode) window.TrueTab.updateGridOutline();

        // Reset form
        document.getElementById('singleAppName').value = '';
        document.getElementById('singleAppUrl').value = '';
        document.getElementById('singleAppIcon').value = '';
        singleIconPreview.style.display = 'none';
        currentSingleAppIcon = null;
        if (addAppIconifyPicker && addAppIconifyPicker.clearSelection) {
            addAppIconifyPicker.clearSelection();
        }

        addWidgetModal.classList.remove('active');
    });
}

document.querySelectorAll('.modal .modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('active');
    });
});

if (addWidgetModal) {
    addWidgetModal.addEventListener('click', (e) => {
        // Handle cancel button FIRST before tab switching
        if (e.target.id === 'cancelAddAppBtn' || e.target.closest('#cancelAddAppBtn')) {
            addWidgetModal.classList.remove('active');
            cleanupBoundaryDetection(addWidgetModal);
            return;
        }

        // Handle popup tabs (App/Widget tabs)
        const tab = e.target.closest('.popup-tab');
        if (tab) {
            const panelName = tab.dataset.panel;
            if (panelName) {
                // Remove active class from all tabs and panels
                addWidgetModal.querySelectorAll('.popup-tab').forEach(t => t.classList.remove('active'));
                addWidgetModal.querySelectorAll('.popup-panel').forEach(p => p.classList.remove('active'));

                // Add active class to clicked tab and corresponding panel
                tab.classList.add('active');
                const panel = addWidgetModal.querySelector(`#${panelName}-panel`);
                if (panel) panel.classList.add('active');
            }
            return;
        }

        // Handle widget type selection
        const typeBtn = e.target.closest('[data-widget-type]');
        if (typeBtn) {
            const type = typeBtn.dataset.widgetType;
            window.TrueTab.addWidget(type);
        }
    });
}

if (widgetSettingsPopup) {
    widgetSettingsPopup.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-settings')) {
            widgetSettingsPopup.classList.remove('active');
            cleanupBoundaryDetection(widgetSettingsPopup);
            return;
        }
        // Handle save button if present in widget-specific settings
        const saveBtn = e.target.closest('[data-save-widget-settings]');
        if (saveBtn) {
            const widgetId = widgetSettingsPopup.dataset.widgetId;
            const widget = window.TrueTab.getWidgetById(widgetId);
            if (widget) {
                const widgetModule = window.TrueTab.widgetModules[widget.type];
                if (widgetModule && widgetModule.saveSettings) {
                    const newSettings = widgetModule.saveSettings(widgetSettingsPopup.querySelector('#widgetSettingsContent'));
                    if (newSettings) {
                        widget.settings = newSettings;
                        window.TrueTab.saveWidgets();
                        window.TrueTab.renderWidgets();
                    }
                }
                widgetSettingsPopup.classList.remove('active');
                cleanupBoundaryDetection(widgetSettingsPopup);
            }
        }
    });
}

if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
        // Handle modal tabs
        const tab = e.target.closest('.modal-tab');
        if (tab) {
            const panelName = tab.dataset.panel;
            if (panelName) {
                // Remove active class from all tabs and panels
                settingsModal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
                settingsModal.querySelectorAll('.modal-panel').forEach(p => p.classList.remove('active'));

                // Add active class to clicked tab and corresponding panel
                tab.classList.add('active');
                const panel = settingsModal.querySelector(`#${panelName}`);
                if (panel) panel.classList.add('active');
            }
            return;
        }

        // Handle collapsible sections
        if (e.target.closest('.collapsible-header')) {
            const section = e.target.closest('.collapsible-section');
            if (section) {
                section.classList.toggle('collapsed');
            }
            return;
        }

        // Handle close button
        if (e.target.closest('.close-modal') || e.target.closest('.modal-close-btn')) {
            settingsModal.classList.remove('active');
            return;
        }

        // Handle save button
        if (e.target.closest('.modal-save-btn')) {
            // Settings are saved in real-time via appearance.js event handlers
            settingsModal.classList.remove('active');
            return;
        }

        // Handle Clear All button
        if (e.target.id === 'clearLayoutMemoryBtn') {
            if (confirm('Clear all saved widget positions and reset to default layout?\n\nThis will remove all added widgets, restore the default layout, and reset appearance settings.')) {
                // Clear ALL saved positions and appearance
                localStorage.removeItem('truetab-layout-memory');
                localStorage.removeItem('truetab-widgets');
                localStorage.removeItem('truetab-appearance');

                // Apply the default layout directly (same format as export/import)
                window.TrueTab.applyDefaultLayout();
                window.TrueTab.loadAppearanceSettings();
                window.TrueTab.renderWidgets();
                if (window.TrueTab.updateGridOutline) window.TrueTab.updateGridOutline();

                // Close modal
                settingsModal.classList.remove('active');
            }
            return;
        }

        // Handle Export Layout button
        if (e.target.id === 'exportLayoutBtn') {
            const layoutData = window.TrueTab.getCurrentLayoutData();
            const dataStr = JSON.stringify(layoutData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `truetab-layout-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(url);
            return;
        }

        // Handle Import Layout button
        if (e.target.id === 'importLayoutBtn') {
            const fileInput = document.getElementById('importLayoutFileInput');
            if (fileInput) fileInput.click();
            return;
        }
    });

    // Handle file import
    const importFileInput = document.getElementById('importLayoutFileInput');
    if (importFileInput) {
        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const layoutData = JSON.parse(event.target.result);
                    if (confirm('Import this layout? This will replace your current layout.')) {
                        window.TrueTab.applyLayoutData(layoutData);
                    }
                } catch (err) {
                    alert('Invalid layout file format');
                    console.error('Import error:', err);
                }
                e.target.value = ''; // Reset file input
            };
            reader.readAsText(file);
        });
    }
}

    // Close modals on backdrop click
    document.addEventListener('click', (e) => {
        // Close modals when clicking outside their content
        // Check widget settings popup first (highest priority)
        if (widgetSettingsPopup && widgetSettingsPopup.classList.contains('active')) {
            // Close if click is outside the popup
            if (!widgetSettingsPopup.contains(e.target)) {
                widgetSettingsPopup.classList.remove('active');
                return;
            }
        }

        // Check add widget modal
        if (addWidgetModal && addWidgetModal.classList.contains('active')) {
            // addWidgetModal itself is the .widget-settings-popup, check it directly
            if (!addWidgetModal.contains(e.target)) {
                addWidgetModal.classList.remove('active');
                return;
            }
        }

        // Check settings modal
        if (settingsModal && settingsModal.classList.contains('active')) {
            const modalContent = settingsModal.querySelector('.modal-content');
            if (modalContent && !modalContent.contains(e.target)) {
                settingsModal.classList.remove('active');
                return;
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (settingsModal) settingsModal.classList.remove('active');
            if (addWidgetModal) addWidgetModal.classList.remove('active');
            if (widgetSettingsPopup) widgetSettingsPopup.classList.remove('active');
        }
        if (e.key === 'e' && e.ctrlKey) {
            e.preventDefault();
            const editBtn = document.getElementById('editBtn');
            window.TrueTab.editMode = !window.TrueTab.editMode;
            if (editBtn) editBtn.classList.toggle('active', window.TrueTab.editMode);
            window.TrueTab.renderWidgets();
            window.TrueTab.updateGridOutline();
        }
    });

    // Export references to window.TrueTab
    window.TrueTab.settingsModal = settingsModal;
    window.TrueTab.addWidgetModal = addWidgetModal;
    window.TrueTab.widgetSettingsPopup = widgetSettingsPopup;
}); // End DOMContentLoaded

// Note: preferredGridPosition is initialized at the top of this file
window.TrueTab.openAddWidgetModalAt = openAddWidgetModalAt;
window.TrueTab.openWidgetSettings = openWidgetSettings;
window.TrueTab.openAppLinkSettings = openAppLinkSettings;

