// utils.js
window.TrueTab = window.TrueTab || {};

// Cache for CSS variables
let cssVarsCache = null;
let cssVarsCacheTime = 0;
const CSS_CACHE_DURATION = 100;

function getCSSVars() {
    const now = Date.now();
    if (cssVarsCache && (now - cssVarsCacheTime) < CSS_CACHE_DURATION) {
        return cssVarsCache;
    }

    const style = getComputedStyle(document.documentElement);
    cssVarsCache = {
        iconWidth: parseInt(style.getPropertyValue('--icon-width')),
        iconHeight: parseInt(style.getPropertyValue('--icon-height')),
        gapX: parseInt(style.getPropertyValue('--icon-gap-x')),
        gapY: parseInt(style.getPropertyValue('--icon-gap-y'))
    };
    cssVarsCacheTime = now;
    return cssVarsCache;
}

// Get the shared grid container element (cached on window.TrueTab)
function getGridContainer() {
    return window.TrueTab.gridContainer || document.getElementById('gridContainer');
}

// Compute grid metrics used by multiple modules (dims, totals, offsets)
function getGridMetrics() {
    const gridContainer = getGridContainer();
    const { iconWidth, iconHeight, gapX, gapY } = getCSSVars();
    const { cols, rows } = window.TrueTab.getGridDimensions();
    const totalWidth = cols * iconWidth + (cols - 1) * gapX;
    const totalHeight = rows * iconHeight + (rows - 1) * gapY;
    const containerWidth = gridContainer ? gridContainer.clientWidth : window.innerWidth;
    const containerHeight = gridContainer ? gridContainer.clientHeight : window.innerHeight;
    const offsetX = (containerWidth - totalWidth) / 2;
    const offsetY = (containerHeight - totalHeight) / 2;
    return {
        cols, rows,
        iconWidth, iconHeight, gapX, gapY,
        totalWidth, totalHeight,
        containerWidth, containerHeight,
        offsetX, offsetY
    };
}

// Convert grid cell to its top-left pixel position within the grid container
function getCellTopLeft(gridX, gridY) {
    const m = getGridMetrics();
    const x = m.offsetX + (gridX - 1) * (m.iconWidth + m.gapX);
    const y = m.offsetY + (gridY - 1) * (m.iconHeight + m.gapY);
    return { x, y };
}

// Convert grid cell to its center pixel position within the grid container
function getCellCenter(gridX, gridY) {
    const { x, y } = getCellTopLeft(gridX, gridY);
    const { iconWidth, iconHeight } = getCSSVars();
    return { x: x + iconWidth / 2, y: y + iconHeight / 2 };
}

// Invalidate cache on window resize
window.addEventListener('resize', () => {
    // Invalidate only CSS vars cache; grid dimensions cache uses window size key
    cssVarsCache = null;
});

function getDefaultSettings(type) {
    const defaults = {
        clock: {
            format24h: true,
            showSeconds: false,
            showDate: true,
            showWeather: true,
            location: 'Copenhagen',
            hideBackground: true // Clock default: no glass BG
        },
        weather: {
            location: 'Copenhagen',
            units: 'celsius',
            hideBackground: false, // Show glass BG by default
            forecastDays: 'none', // none, 3, 7, 14
            showLocationTitle: true,
            showIcon: true,
            showDegrees: true,
            showDescription: true,
            showExtraInfo: true
        },
        search: {
            enabledBars: ['bar-search', 'bar-chatbot'],
            activeBar: 'bar-search',
            barSettings: {
                'bar-search': {
                    searchEngine: 'google',
                    placeholder: '',
                    enableAutocomplete: true,
                    maxSuggestions: 7,
                    localSuggestions: 3,
                    showSearchIcon: true,
                    hideButtonOutline: true
                },
                'bar-chatbot': {
                    provider: 'gemini',
                    model: 'gemini-2.5-flash',
                    systemPrompt: 'You are a concise, helpful assistant.',
                    maxHistory: 100,
                    hideBackground: false,
                    hideButtonOutline: true,
                    placeholder: ''
                }
            }
        },
        quote: {
            category: 'inspirational',
            autoRefresh: true, // Always auto-refresh
            refreshInterval: 1200, // 20 minutes in seconds
            hideBackground: false // Show glass BG by default
        },
        calendar: {
            showEvents: true,
            showEventGlow: true, // Combined with showEvents
            showArrows: false,
            showYear: false,
            showWeekNumber: false,
            hideBackground: false // Show glass BG by default
        },
        stocks: {
            title: 'Stocks',
            symbols: ['AAPL', 'GOOGL', 'MSFT', 'NVDA'],
            showPrice: true, // Changed to true by default
            showChange: true, // Changed to true by default
            showPercent: true,
            showLogo: false,
            hideSymbol: false, // Always show symbols
            hideBackground: false // Show glass BG by default
        },
        chatbot: {
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            systemPrompt: 'You are a concise, helpful assistant.',
            maxHistory: 100, // Set to 100 in background
            hideBackground: false, // Always has background
            hideButtonOutline: true, // No button outline by default
            placeholder: '' // Always empty
        },
        cinema: {
            placeholder: 'Search movies & TV…',
            maxSuggestions: 10,
            debounceMs: 200,
            showSearchIcon: true,
            showPoster: true,
            showYear: true,
            showTypeBadge: true,
            showImdbRating: true,
            showProviders: true,
            maxProviderIcons: 16,
            openTarget: 'imdb', // 'imdb', 'tmdb', or 'google'
            language: 'en-US',
            country: 'DK',
            hideBackground: false,
            hideButtonOutline: true
        },
        apps: {
            title: 'Apps',
            showLabels: true,
            hideBackground: false,
            links: []
        },
        empty: {
            title: 'Quick Links',
            backgroundColor: 'transparent',
            hideBackground: false, // Show glass BG by default
            links: [
                { name: 'Example 1', url: 'Example.com' },
                { name: 'Example 2', url: 'Example.com' },
                { name: 'Example 3', url: 'Example.com' }
            ]
        },
        app: {
            name: 'App',
            url: 'Example.com',
            icon: '📱',
            showLabel: true,
            hideBackground: false,
            colorIcon: true
        }
    };
    return defaults[type] || {};
}

function getSizeClass(w, h) {
    const sizeMap = {
        '1-1': 'icon-size-1x1',
        '2-1': 'icon-size-1x2',
        '1-2': 'icon-size-2x1',
        '2-2': 'icon-size-2x2',
        '4-2': 'icon-size-2x4',
        '4-4': 'icon-size-4x4',
        '3-1': 'span-3x1',
        '3-2': 'span-3x2',
        '3-3': 'span-3x3',
        '4-3': 'span-4x3',
        '5-2': 'span-5x2',
        '5-3': 'span-5x3',
        '6-1': 'span-6x1',
        '6-2': 'span-6x2',
        '8-1': 'span-8x1'
    };
    return sizeMap[`${w}-${h}`] || `span-${w}x${h}`;
}

// Shared renderer for icon HTML across widgets (app/apps)
function renderIconHTML(icon, name, colorClass, iconFallback) {
    if (!icon) {
        return `<span class="single-app-icon-emoji">📱</span>`;
    }
    // Quick first-char checks to minimize string ops
    if (icon[0] === 'd') {
        // data: URL
        return `<img src="${icon}" alt="${name || ''}" class="single-app-icon-img ${colorClass}">`;
    }
    if (icon[0] === 'i') {
        // iconify:
        const base = `<span class="iconify single-app-icon-svg ${colorClass}" data-icon="${icon.slice(8)}"></span>`;
        if (iconFallback) {
            return base + `<i class="${iconFallback} single-app-icon-svg ${colorClass}" style="display: none;"></i>`;
        }
        return base;
    }
    if (icon[0] === 'f' || icon.includes('fa-')) {
        // Font Awesome or similar class-based icon
        return `<i class="${icon} single-app-icon-svg ${colorClass}"></i>`;
    }
    // Emoji or plain text fallback
    return `<span class="single-app-icon-emoji">${icon}</span>`;
}

function applyIconColorFilters() {
    const iconColor = getComputedStyle(document.documentElement).getPropertyValue('--widget-icon-color').trim();
    const coloredIcons = document.querySelectorAll('.color-icon.single-app-icon-img');
    if (!coloredIcons || coloredIcons.length === 0) return;
    coloredIcons.forEach(img => {
        if (iconColor === '#ffffff' || iconColor === '#FFFFFF' || iconColor === 'white') {
            img.style.filter = 'brightness(0) invert(1)';
        } else if (iconColor === '#000000' || iconColor === '#000' || iconColor === 'black') {
            img.style.filter = 'brightness(0)';
        } else {
            const rgb = hexToRgb(iconColor);
            if (rgb) {
                const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                const hueRotate = hsl.h;
                const saturate = hsl.s * 100;
                const brightness = hsl.l / 50;
                img.style.filter = `brightness(0) invert(1) sepia(1) saturate(${saturate}%) hue-rotate(${hueRotate}deg) brightness(${brightness})`;
            } else {
                img.style.filter = 'brightness(0) invert(1)';
            }
        }
    });
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return {
        h: Math.round(h * 360),
        s: s,
        l: l * 100
    };
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

function checkWidgetCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    const right1 = x1 + w1 - 1;
    const bottom1 = y1 + h1 - 1;
    const right2 = x2 + w2 - 1;
    const bottom2 = y2 + h2 - 1;
    return !(x1 > right2 || right1 < x2 || y1 > bottom2 || bottom1 < y2);
}

function hasCollision(x, y, w, h, excludeId = null) {
    const widgetsArray = window.TrueTab.widgetsArray || [];
    for (const widget of widgetsArray) {
        if (widget.id === excludeId || !widget.x || !widget.y) continue;
        if (checkWidgetCollision(x, y, w, h, widget.x, widget.y, widget.w, widget.h)) {
            return true;
        }
    }
    return false;
}

function findAvailableSlot(w, h, preferredX = null, preferredY = null, excludeId = null) {
    const { cols, rows } = window.TrueTab.getGridDimensions();
    const isReservedFast = (x, y, width, height) => {
        const widgetBottom = y + height - 1;
        const widgetRight = x + width - 1;
        return widgetBottom >= rows && x <= 2 && widgetRight >= 1;
    };
    if (preferredX === null || preferredY === null) {
        for (let y = 1; y <= rows - h + 1; y++) {
            for (let x = 1; x <= cols - w + 1; x++) {
                if (!hasCollision(x, y, w, h, excludeId) && !isReservedArea(x, y, w, h)) {
                    return { x, y };
                }
            }
        }
        const fallbackX = Math.min(4, Math.max(1, cols - w + 1));
        const fallbackY = 1;
        return { x: fallbackX, y: fallbackY };
    }
    let bestSlot = null;
    let bestDistance = Infinity;
    for (let y = 1; y <= rows - h + 1; y++) {
        for (let x = 1; x <= cols - w + 1; x++) {
            if (!hasCollision(x, y, w, h, excludeId) && !isReservedArea(x, y, w, h)) {
                const distance = (Math.abs(y - preferredY) * 3) + Math.abs(x - preferredX);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestSlot = { x, y };
                }
            }
        }
    }
    if (!bestSlot) {
        const fallbackX = Math.min(4, Math.max(1, cols - w + 1));
        const fallbackY = 1;
        return { x: fallbackX, y: fallbackY };
    }
    return bestSlot;
}

// Build a Set of occupied grid cells for fast O(1) collision checks
// By default, excludes any currently dragged or resizing widget
function buildOccupancySet({ excludeIds } = {}) {
    const occupied = new Set();
    const widgetsArray = window.TrueTab.widgetsArray || [];
    const excludeSet = new Set(excludeIds || []);
    const drag = window.TrueTab.draggedWidget && window.TrueTab.draggedWidget.id;
    const resize = window.TrueTab.resizingWidget && window.TrueTab.resizingWidget.id;
    if (drag) excludeSet.add(drag);
    if (resize) excludeSet.add(resize);
    for (const w of widgetsArray) {
        if (excludeSet.has(w.id)) continue;
        if (!w.x || !w.y || !w.w || !w.h) continue;
        for (let row = w.y; row < w.y + w.h; row++) {
            for (let col = w.x; col < w.x + w.w; col++) {
                occupied.add(`${col},${row}`);
            }
        }
    }
    return occupied;
}

// Fast check if a widget of size w x h fits at (x,y) given bounds and an occupied Set
function canFitAtIn(x, y, w, h, cols, rows, occupiedSet) {
    if (x < 1 || y < 1 || x + w - 1 > cols || y + h - 1 > rows) return false;
    if (window.TrueTab.utils.isReservedArea(x, y, w, h)) return false;
    for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
            if (occupiedSet.has(`${x + dx},${y + dy}`)) {
                return false;
            }
        }
    }
    return true;
}

// Find a placement for a widget within the grid given an occupied Set
// Prefers nearest to preferred coords when provided; otherwise first-fit
function findPositionInGrid(w, h, { cols, rows, occupiedSet, prefX = null, prefY = null }) {
    let bestPos = null;
    let bestDist = Infinity;
    for (let y = 1; y <= rows - h + 1; y++) {
        for (let x = 1; x <= cols - w + 1; x++) {
            if (canFitAtIn(x, y, w, h, cols, rows, occupiedSet)) {
                if (prefX === null || prefY === null) {
                    return { x, y };
                }
                const dist = Math.abs(x - prefX) + Math.abs(y - prefY) * 2;
                if (dist < bestDist) {
                    bestDist = dist;
                    bestPos = { x, y };
                }
            }
        }
    }
    return bestPos;
}

function resolveOverlaps(changedWidget) {
    const repositioned = new Set([changedWidget.id]);
    let hasChanges = true;
    const widgetsArray = window.TrueTab.widgetsArray || [];
    while (hasChanges) {
        hasChanges = false;
        for (const widget of widgetsArray) {
            if (repositioned.has(widget.id)) continue;
            let needsReposition = false;
            for (const otherId of repositioned) {
                const other = window.TrueTab.getWidgetById(otherId);
                if (other && checkWidgetCollision(widget.x, widget.y, widget.w, widget.h, other.x, other.y, other.w, other.h)) {
                    needsReposition = true;
                    break;
                }
            }
            if (needsReposition) {
                const newPos = findAvailableSlot(widget.w, widget.h, null, null, null);
                widget.x = newPos.x;
                widget.y = newPos.y;
                repositioned.add(widget.id);
                hasChanges = true;
            }
        }
    }
}

function getViewportKey() {
    const { cols, rows } = window.TrueTab.getGridDimensions();
    return `${cols}x${rows}`;
}

function isReservedArea(x, y, w, h) {
    const { rows } = window.TrueTab.getGridDimensions();
    const bottomRow = rows;
    const widgetBottom = y + h - 1;
    const widgetRight = x + w - 1;
    if (widgetBottom >= bottomRow && x <= 2 && widgetRight >= 1) {
        return true;
    }
    return false;
}

function getWidgetConstraints(type) {
    const constraints = {
        app: { minW: 1, minH: 1, maxH: 1, maxW: null },
        search: { minW: 3, minH: 1, maxH: 1, maxW: null },
        chatbot: { minW: 3, minH: 1, maxH: 1, maxW: null },
        cinema: { minW: 3, minH: 1, maxH: 1, maxW: null },
        apps: { minW: 2, minH: 1, maxH: 2, maxW: null },
        clock: { minW: 1, minH: 1, maxH: 2, maxW: 4 },
        weather: { minW: 2, minH: 1, maxH: 3, maxW: 4 },
        quote: { minW: 2, minH: 1, maxH: null, maxW: null },
        stocks: { minW: 2, minH: 1, maxH: null, maxW: 4 },
        calendar: { minW: 2, minH: 2, maxH: 3, maxW: 4 }
    };
    return constraints[type] || { minW: 2, minH: 2, maxH: null, maxW: null };
}

function toggleSection(headerElement) {
    const section = headerElement.closest('.collapsible-section');
    if (section) {
        section.classList.toggle('collapsed');
    }
}

window.TrueTab.utils = {
    getCSSVars,
    getGridContainer,
    getGridMetrics,
    getCellTopLeft,
    getCellCenter,
    getDefaultSettings,
    getSizeClass,
    renderIconHTML,
    applyIconColorFilters,
    rgbToHsl,
    hexToRgb,
    checkWidgetCollision,
    hasCollision,
    findAvailableSlot,
    resolveOverlaps,
    getViewportKey,
    isReservedArea,
    getWidgetConstraints,
    toggleSection,
    buildOccupancySet,
    canFitAtIn,
    findPositionInGrid
};
