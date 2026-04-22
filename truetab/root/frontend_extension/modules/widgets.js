// widgets.js
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

// Default layout in the same format as export/import layouts.
// This is applied on fresh installs or when the user clicks "Clear All".
const DEFAULT_LAYOUT = {
    version: '1.0.0',
    widgets: [
        { id: 'clock', type: 'clock', x: 1, y: 1, w: 3, h: 2, settings: {} },
        { id: 'search', type: 'search', x: 1, y: 3, w: 6, h: 1, settings: {} }
    ],
    layoutMemory: {},
    appearanceSettings: {}
};

// Initialize widgets array — starts empty, populated by loadWidgets() or applyDefaultLayout()
if (!window.TrueTab.widgetsArray) {
    window.TrueTab.widgetsArray = [];
}

// Initialize counter - will be properly set after loading saved widgets
let widgetIdCounter = 1;

// Widget caches - will be populated by rebuildWidgetCache()
let widgetsByType = {};
let widgetsById = new Map();

// Cache gridContainer to avoid repeated DOM lookups
let cachedGridContainer = null;

function getGridContainer() {
    if (!cachedGridContainer) {
        cachedGridContainer = window.TrueTab.gridContainer || document.getElementById('gridContainer');
        if (cachedGridContainer) {
            window.TrueTab.gridContainer = cachedGridContainer; // Store for other modules
        }
    }
    return cachedGridContainer;
}

/**
 * Rebuilds the widget cache (widgetsByType and widgetsById) from the current widgetsArray.
 * Should be called after loading widgets, rendering, or any operation that modifies the array.
 */
function rebuildWidgetCache() {
    widgetsByType = {};
    widgetsById.clear();
    window.TrueTab.widgetsArray.forEach(w => {
        if (!widgetsByType[w.type]) widgetsByType[w.type] = [];
        widgetsByType[w.type].push(w);
        widgetsById.set(w.id, w);
    });
}

/**
 * Retrieves a widget by its ID using O(1) Map lookup.
 * @param {string} id - The widget ID
 * @returns {Object|undefined} The widget object or undefined if not found
 */
function getWidgetById(id) {
    return widgetsById.get(id);
}

/**
 * Returns the default size for a widget type.
 * @param {string} type - The widget type (e.g., 'clock', 'weather', 'app')
 * @returns {{w: number, h: number}} Object with width (w) and height (h) in grid cells
 */
function getDefaultSize(type) {
    const sizes = {
        app: { w: 1, h: 1 },
        search: { w: 6, h: 1 },
        chatbot: { w: 6, h: 1 },
        cinema: { w: 6, h: 1 },
        clock: { w: 2, h: 1 },
        weather: { w: 2, h: 2 },
        stocks: { w: 3, h: 2 },
        apps: { w: 4, h: 2 },
        quote: { w: 3, h: 2 },
        calendar: { w: 3, h: 2 },
        empty: { w: 3, h: 2 }
    };
    return sizes[type] || { w: 3, h: 2 };
}

/**
 * Ensures a widget has settings assigned, using defaults if not present.
 * Mutates the widget object if settings are missing.
 * @param {Object} widget - The widget object
 * @returns {Object} The widget's settings (either existing or newly assigned defaults)
 */
function ensureWidgetSettings(widget) {
    if (!widget.settings) {
        widget.settings = window.TrueTab.utils.getDefaultSettings(widget.type);
    }
    return widget.settings;
}

/**
 * Sets up a widget by calling its module's setup() method with error handling.
 * @param {HTMLElement} element - The widget DOM element
 * @param {Object} widget - The widget data object
 * @param {boolean} isEditMode - Whether edit mode is active
 * @returns {boolean} True if setup succeeded, false otherwise
 */
function setupWidget(element, widget, isEditMode) {
    const widgetModule = window.TrueTab.widgetModules[widget.type];
    if (!widgetModule || !widgetModule.setup) return false;

    const settings = ensureWidgetSettings(widget);

    try {
        widgetModule.setup(element, isEditMode, settings);
        return true;
    } catch (error) {
        console.error(`Failed to setup widget ${widget.id} (${widget.type}):`, error);
        return false;
    }
}

/**
 * Updates a widget by calling its module's update() method with error handling.
 * @param {HTMLElement} element - The widget DOM element
 * @param {Object} widget - The widget data object
 * @returns {boolean} True if update succeeded, false otherwise
 */
function updateWidget(element, widget) {
    const widgetModule = window.TrueTab.widgetModules[widget.type];
    if (!widgetModule || !widgetModule.update) return false;

    const settings = ensureWidgetSettings(widget);

    try {
        widgetModule.update(element, settings);
        return true;
    } catch (error) {
        console.error(`Failed to update widget ${widget.id} (${widget.type}):`, error);
        return false;
    }
}

/**
 * Cleans up a widget by calling its module's cleanup() method with error handling.
 * @param {string} widgetId - The widget ID
 * @param {string} widgetType - The widget type
 * @returns {boolean} True if cleanup succeeded, false otherwise
 */
function cleanupWidget(widgetId, widgetType) {
    const widgetModule = window.TrueTab.widgetModules[widgetType];
    if (!widgetModule || !widgetModule.cleanup) return false;

    try {
        widgetModule.cleanup(widgetId);
        return true;
    } catch (error) {
        console.error(`Failed to cleanup widget ${widgetId} (${widgetType}):`, error);
        return false;
    }
}

function calculateNextWidgetId() {
    // Scan all existing widget IDs and find the highest numeric ID
    let maxId = 0;
    window.TrueTab.widgetsArray.forEach(widget => {
        // Extract number from IDs like "widget123"
        const match = widget.id.match(/^widget(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxId) maxId = num;
        }
    });
    // Return next available ID (max + 1, or 1 if no numeric IDs exist)
    return maxId + 1;
}

let saveTimeout = null;

function _performSave(saveLayout) {
    const metadata = window.TrueTab.widgetsArray.map(w => ({
        id: w.id,
        type: w.type,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        settings: w.settings
    }));
    localStorage.setItem('truetab-widgets', JSON.stringify(metadata));
    if (saveLayout) window.TrueTab.saveLayoutMemory();
    rebuildWidgetCache();
}

/**
 * Saves widgets to localStorage with debouncing (300ms delay).
 * @param {boolean} [saveLayout=true] - Whether to also save layout memory
 */
function saveWidgets(saveLayout = true) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        _performSave(saveLayout);
        saveTimeout = null;
    }, 300);
}

/**
 * Saves widgets to localStorage immediately without debouncing.
 * @param {boolean} [saveLayout=true] - Whether to also save layout memory
 */
function saveWidgetsImmediate(saveLayout = true) {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
    _performSave(saveLayout);
}

/**
 * Applies the default layout (same format as export/import).
 * Used on fresh installs and when the user clicks "Clear All".
 */
function applyDefaultLayout() {
    window.TrueTab.widgetsArray = DEFAULT_LAYOUT.widgets.map(w => {
        const defaultSize = getDefaultSize(w.type);
        return {
            id: w.id,
            type: w.type,
            settings: w.settings || window.TrueTab.utils.getDefaultSettings(w.type),
            x: w.x || 1,
            y: w.y || 1,
            w: w.w || defaultSize.w,
            h: w.h || defaultSize.h
        };
    });
    window.TrueTab.layoutMemory = DEFAULT_LAYOUT.layoutMemory || {};
    widgetIdCounter = calculateNextWidgetId();
    window.TrueTab.widgetIdCounter = widgetIdCounter;
    rebuildWidgetCache();
}

/**
 * Loads widgets from localStorage and rebuilds the widget cache.
 * Falls back to the default layout if no saved data exists.
 */
function loadWidgets() {
    const saved = localStorage.getItem('truetab-widgets');
    if (!saved) {
        applyDefaultLayout();
        return;
    }
    try {
        const loaded = JSON.parse(saved);
        if (Array.isArray(loaded) && loaded.length > 0) {
            window.TrueTab.widgetsArray = loaded.map(w => {
                const defaultSize = getDefaultSize(w.type);
                return {
                    id: w.id,
                    type: w.type,
                    settings: w.settings || window.TrueTab.utils.getDefaultSettings(w.type),
                    x: w.x || 1,
                    y: w.y || 1,
                    w: w.w || defaultSize.w,
                    h: w.h || defaultSize.h
                };
            });
            // Recalculate counter based on loaded widgets to prevent ID collisions
            widgetIdCounter = calculateNextWidgetId();
            window.TrueTab.widgetIdCounter = widgetIdCounter;
        } else {
            applyDefaultLayout();
        }
    } catch (e) {
        console.error('Failed to load widgets:', e);
        applyDefaultLayout();
    }
    rebuildWidgetCache();
}

const EDIT_BUTTON_HTML = '<span class="iconify" data-icon="material-symbols:settings-outline" data-width="16" data-height="16"></span>';
const DELETE_BUTTON_HTML = '<span class="iconify" data-icon="material-symbols:close" data-width="16" data-height="16"></span>';
const WIDGET_TYPE_CLASSES = Object.freeze({
    search: 'widget search-widget',
    chatbot: 'widget chatbot-widget',
    cinema: 'widget cinema-widget',
    app: 'widget single-app-widget',
    apps: 'widget apps-scroller-widget',
    calendar: 'widget calendar-widget',
    quote: 'widget quote-widget',
    stocks: 'widget stocks-widget',
    weather: 'widget weather-widget',
    clock: 'widget clock-widget',
});

function applyWidgetClasses(el, widget) {
    el.className = WIDGET_TYPE_CLASSES[widget.type] || 'widget';

    if (widget.type === 'apps' && widget.h === 1) {
        el.classList.add('apps-scroller-compact');
    }

    const sizeClass = window.TrueTab.utils.getSizeClass(widget.w, widget.h);
    if (sizeClass) el.classList.add(sizeClass);

    // Check global hideAllGlassBG setting OR individual widget hideBackground setting
    const shouldHideBackground = window.TrueTab.shouldHideGlassBG?.() || widget.settings?.hideBackground;
    if (shouldHideBackground && widget.type !== 'search' && widget.type !== 'chatbot') {
        el.classList.add('no-background');
    }

    if ((widget.type === 'search' || widget.type === 'chatbot') && widget.settings?.useDefaultColor === true) {
        el.classList.add('default-color');
    }

    if (widget.settings?.hideWhenNotHovered) {
        el.classList.add('hide-when-not-hovered');
    }
}

function applyWidgetAttributes(el, widget) {
    el.id = widget.id;
    el.dataset.widgetId = widget.id;
    el.dataset.widgetType = widget.type;
    el.dataset.widgetSize = `${widget.w}x${widget.h}`;

    if (widget.x && widget.y) {
        el.style.gridColumn = `${widget.x} / span ${widget.w}`;
        el.style.gridRow = `${widget.y} / span ${widget.h}`;
    }
}

function renderWidgetContent(el, widget) {
    const widgetModule = window.TrueTab.widgetModules[widget.type];
    if (!widgetModule || !widgetModule.render) return;

    const settings = widget.settings || {};

    if (widget.type === 'apps') {
        el.innerHTML = widgetModule.render(settings, widget.w, widget.h);
    } else if (widget.type === 'quote' || widget.type === 'stocks' || widget.type === 'calendar' || widget.type === 'weather') {
        el.innerHTML = widgetModule.render(settings, el.dataset.widgetSize);
    } else {
        el.innerHTML = widgetModule.render(settings);
    }
}

function addEditControls(el, widget) {
    const editWidgetBtn = document.createElement('button');
    editWidgetBtn.className = 'edit-widget-btn';
    editWidgetBtn.innerHTML = EDIT_BUTTON_HTML;
    el.appendChild(editWidgetBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = DELETE_BUTTON_HTML;
    el.appendChild(deleteBtn);

    // Don't add resize handles to 1x1 app widgets
    if (!(widget.type === 'app' && widget.w === 1 && widget.h === 1)) {
        const resizeHandleBR = document.createElement('div');
        resizeHandleBR.className = 'resize-handle resize-handle-br';
        el.appendChild(resizeHandleBR);

        const resizeHandleBL = document.createElement('div');
        resizeHandleBL.className = 'resize-handle resize-handle-bl';
        el.appendChild(resizeHandleBL);
    }
}

function createWidgetElement(widget, shouldAddEditControls) {
    const el = document.createElement('div');

    applyWidgetClasses(el, widget);
    applyWidgetAttributes(el, widget);
    renderWidgetContent(el, widget);

    if (shouldAddEditControls) {
        addEditControls(el, widget);
    }

    return el;
}

/**
 * Re-renders a single widget by replacing its DOM element with a fresh one.
 * Used during resize operations to update widget appearance in real-time.
 * @param {Object} widgetData - The widget data object
 * @returns {HTMLElement|null} The new widget element or null if failed
 */
function rerenderSingleWidget(widgetData) {
    try {
        const oldElement = document.getElementById(widgetData.id);
        if (!oldElement) return null;

        const shouldAddEditControls = window.TrueTab.editMode;
        const newElement = createWidgetElement(widgetData, shouldAddEditControls);

        oldElement.replaceWith(newElement);

        // Setup widget behavior
        setupWidget(newElement, widgetData, window.TrueTab.editMode);

        // Rescan iconify icons
        if (window.Iconify && window.Iconify.scan) {
            window.Iconify.scan(newElement);
        }

        return newElement;
    } catch (error) {
        console.error(`Failed to rerender widget ${widgetData.id} (${widgetData.type}):`, error);
        return null;
    }
}

/**
 * Renders all widgets to the grid container.
 * Removes existing widgets, creates new elements, and sets them up.
 * Optimized with element reference caching to avoid repeated DOM lookups.
 */
function renderWidgets() {
    rebuildWidgetCache();
    requestAnimationFrame(() => {
        const gridContainer = getGridContainer();
        if (!gridContainer) return;

        const widgetElements = gridContainer.querySelectorAll('.widget');
        widgetElements.forEach(el => el.remove());
        const fragment = document.createDocumentFragment();
        const shouldAddEditControls = window.TrueTab.editMode;
        const skipDataFetch = window.TrueTab.editMode;

        // Store element references to avoid DOM lookups
        const elementRefs = new Map();

        // Create all widget elements with error boundaries
        window.TrueTab.widgetsArray.forEach(widget => {
            try {
                const el = createWidgetElement(widget, shouldAddEditControls);
                fragment.appendChild(el);
                elementRefs.set(widget.id, el); // Store reference instead of using getElementById later
            } catch (error) {
                console.error(`Failed to create widget ${widget.id} (${widget.type}):`, error);
            }
        });

        // Single DOM append operation
        gridContainer.appendChild(fragment);

        // Setup and update all widgets using stored references (no DOM lookups!)
        window.TrueTab.widgetsArray.forEach(widget => {
            const el = elementRefs.get(widget.id); // Use stored reference instead of getElementById
            if (!el) return;

            // Setup widget
            setupWidget(el, widget, window.TrueTab.editMode);

            // Update widget (unless in edit mode)
            if (!skipDataFetch) {
                updateWidget(el, widget);
            }
        });

        try {
            window.TrueTab.utils.applyIconColorFilters();
        } catch (error) {
            console.error('Failed to apply icon color filters:', error);
        }
    });
}

/**
 * Updates widget grid positions in the DOM.
 * Can update specific widgets or all widgets.
 * @param {string|string[]|null} [widgetIds=null] - Widget ID(s) to update, or null to update all
 */
function updateWidgetPositions(widgetIds = null) {
    requestAnimationFrame(() => {
        // If specific widgets provided, only update those (performance win!)
        if (widgetIds) {
            const ids = Array.isArray(widgetIds) ? widgetIds : [widgetIds];
            ids.forEach(id => {
                const widget = widgetsById.get(id);
                if (!widget) return;
                const el = document.getElementById(id);
                if (el && widget.x && widget.y) {
                    el.style.gridColumn = `${widget.x} / span ${widget.w}`;
                    el.style.gridRow = `${widget.y} / span ${widget.h}`;
                }
            });
        } else {
            // Update all widgets (fallback)
            window.TrueTab.widgetsArray.forEach(widget => {
                const el = document.getElementById(widget.id);
                if (el && widget.x && widget.y) {
                    el.style.gridColumn = `${widget.x} / span ${widget.w}`;
                    el.style.gridRow = `${widget.y} / span ${widget.h}`;
                }
            });
        }
    });
}

/**
 * Deletes a widget by ID.
 * Calls cleanup, removes from array, saves, and re-renders.
 * @param {string} widgetId - The ID of the widget to delete
 */
function deleteWidget(widgetId) {
    // Get widget before deletion to check type (using Map for O(1) lookup)
    const widget = widgetsById.get(widgetId);

    // Call cleanup method if widget module has one
    if (widget?.type) {
        cleanupWidget(widgetId, widget.type);
    }

    // Use findIndex and splice instead of filter to avoid creating new array
    const index = window.TrueTab.widgetsArray.findIndex(w => w.id === widgetId);
    if (index !== -1) {
        window.TrueTab.widgetsArray.splice(index, 1);
    }

    saveWidgets();
    renderWidgets(); // This already positions all widgets, no need for updateWidgetPositions
    if (window.TrueTab.editMode) window.TrueTab.updateGridOutline();
}

/**
 * Adds a new widget of the specified type.
 * Finds available slot, generates unique ID, saves, and renders.
 * @param {string} type - The widget type to add (e.g., 'clock', 'weather', 'app')
 */
function addWidget(type) {
    // Use getDefaultSize instead of duplicate if-else chain
    const defaultSize = getDefaultSize(type);
    const w = defaultSize.w;
    const h = defaultSize.h;

    let slot;
    if (window.TrueTab.preferredGridPosition) {
        const { x, y } = window.TrueTab.preferredGridPosition;
        // Always use findAvailableSlot with preferred position to find nearest space
        // This ensures we find a spot even if the exact position is blocked
        slot = window.TrueTab.utils.findAvailableSlot(w, h, x, y);
        window.TrueTab.preferredGridPosition = null;
    } else {
        slot = window.TrueTab.utils.findAvailableSlot(w, h);
    }
    // Generate unique ID using the counter
    const newWidget = {
        id: `widget${widgetIdCounter}`,
        type: type,
        x: slot.x,
        y: slot.y,
        w: w,
        h: h,
        settings: window.TrueTab.utils.getDefaultSettings(type)
    };
    // Increment counter for next widget
    widgetIdCounter++;
    window.TrueTab.widgetIdCounter = widgetIdCounter;
    window.TrueTab.widgetsArray.push(newWidget);
    saveWidgets();
    renderWidgets();
    if (window.TrueTab.editMode) window.TrueTab.updateGridOutline();
    const addModal = window.TrueTab.addWidgetModal || document.getElementById('addWidgetModal');
    if (addModal) addModal.classList.remove('active');
}

// Unified widget update interval system
// Instead of 3 separate intervals, one smart interval handles all widget types
let unifiedUpdateInterval = null;
let lastClockMinuteRendered = null;
let secondsElapsed = 0;

function updateClock() {
    const clockWidgets = widgetsByType.clock || [];
    if (clockWidgets.length === 0) return;

    const clockWidget = clockWidgets[0];
    const clockEl = document.getElementById(clockWidget.id);
    if (!clockEl) return;

    const settings = ensureWidgetSettings(clockWidget);

    const now = new Date();
    const currentMinute = now.getMinutes();
    const needsSecondTick = settings.showSeconds === true;

    // If seconds are not shown, only update on minute changes
    if (!needsSecondTick && lastClockMinuteRendered === currentMinute) {
        return;
    }

    updateWidget(clockEl, clockWidget);
    lastClockMinuteRendered = currentMinute;
}

function updateStocks() {
    const stocksWidgets = widgetsByType.stocks || [];
    if (stocksWidgets.length === 0) return;

    stocksWidgets.forEach(widget => {
        const stockEl = document.getElementById(widget.id);
        if (stockEl) {
            updateWidget(stockEl, widget);
        }
    });
}

function updateQuotes() {
    const quoteWidgets = widgetsByType.quote || [];
    if (quoteWidgets.length === 0) return;

    const quoteModule = window.TrueTab.widgetModules?.quote;
    if (!quoteModule || !quoteModule.lastUpdate) return;

    const now = Date.now();
    quoteWidgets.forEach(widget => {
        const settings = ensureWidgetSettings(widget);
        if (settings.autoRefresh) {
            const interval = (settings.refreshInterval || 60) * 1000;
            const lastUpdate = quoteModule.lastUpdate[widget.id] || 0;
            if (now - lastUpdate >= interval) {
                const quoteEl = document.getElementById(widget.id);
                if (quoteEl) {
                    updateWidget(quoteEl, widget);
                    quoteModule.lastUpdate[widget.id] = now;
                }
            }
        }
    });
}

// Unified interval - runs every second, manages all widget updates efficiently
function startUnifiedInterval() {
    if (unifiedUpdateInterval) return; // Already running

    unifiedUpdateInterval = setInterval(() => {
        if (window.TrueTab.editMode) return; // Skip all updates in edit mode

        secondsElapsed++;

        // Clock: every 1 second
        updateClock();

        // Quotes: every 5 seconds
        if (secondsElapsed % 5 === 0) {
            updateQuotes();
        }

        // Stocks: every 180 seconds (3 minutes)
        if (secondsElapsed % 180 === 0) {
            updateStocks();
        }

        // Reset counter after 180 seconds to prevent overflow
        if (secondsElapsed >= 180) {
            secondsElapsed = 0;
        }
    }, 1000);
}

function stopUnifiedInterval() {
    if (unifiedUpdateInterval) {
        clearInterval(unifiedUpdateInterval);
        unifiedUpdateInterval = null;
        secondsElapsed = 0;
    }
}

// Start the unified interval
startUnifiedInterval();

// Clean up interval on page unload to prevent memory leaks
window.addEventListener('beforeunload', stopUnifiedInterval);

// ============================================================================
// Public API Exports
// ============================================================================
// Note: window.TrueTab.widgetModules contains widget type implementations (clock, weather, etc.) from widget files
// window.TrueTab.widgetsArray contains the widget instances

// Core widget operations (high-level API)
window.TrueTab.addWidget = addWidget;
window.TrueTab.deleteWidget = deleteWidget;
window.TrueTab.renderWidgets = renderWidgets;
window.TrueTab.rerenderSingleWidget = rerenderSingleWidget;
window.TrueTab.updateWidgetPositions = updateWidgetPositions;

// Widget lifecycle operations
window.TrueTab.setupWidget = setupWidget;
window.TrueTab.updateWidget = updateWidget;
window.TrueTab.cleanupWidget = cleanupWidget;

// Widget data operations
window.TrueTab.getWidgetById = getWidgetById;
window.TrueTab.getDefaultSize = getDefaultSize;
window.TrueTab.ensureWidgetSettings = ensureWidgetSettings;

// Persistence operations
window.TrueTab.saveWidgets = saveWidgets;
window.TrueTab.saveWidgetsImmediate = saveWidgetsImmediate;
window.TrueTab.loadWidgets = loadWidgets;
window.TrueTab.applyDefaultLayout = applyDefaultLayout;
window.TrueTab.DEFAULT_LAYOUT = DEFAULT_LAYOUT;

// ============================================================================
// Internal State Exports (read-only - use API methods instead)
// ============================================================================
// These are exposed for compatibility but should not be modified directly.
// Use the public API methods above instead.

// Widget counter - managed internally, incremented by addWidget()
Object.defineProperty(window.TrueTab, 'widgetIdCounter', {
    get: () => widgetIdCounter,
    set: (value) => { widgetIdCounter = value; }, // Allow setting for backward compatibility
    enumerable: true
});

// Widget caches - automatically maintained by rebuildWidgetCache()
// Use getWidgetById() instead of accessing these directly
Object.defineProperty(window.TrueTab, 'widgetsByType', {
    get: () => widgetsByType,
    enumerable: true
});

Object.defineProperty(window.TrueTab, 'widgetsById', {
    get: () => widgetsById,
    enumerable: true
});

// Internal cache management - called automatically when needed
window.TrueTab.rebuildWidgetCache = rebuildWidgetCache;
