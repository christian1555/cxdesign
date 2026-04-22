// layout.js
window.TrueTab = window.TrueTab || {};

let layoutMemory = {};

function saveLayoutMemory() {
    const key = window.TrueTab.utils.getViewportKey();
    const widgetsArray = window.TrueTab.widgetsArray || [];
    layoutMemory[key] = widgetsArray.map(w => ({ id: w.id, x: w.x, y: w.y, w: w.w, h: w.h }));
    localStorage.setItem('truetab-layout-memory', JSON.stringify(layoutMemory));
}

function loadLayoutMemory() {
    const saved = localStorage.getItem('truetab-layout-memory');
    if (saved) {
        try {
            layoutMemory = JSON.parse(saved);
        } catch (e) {
            layoutMemory = {};
        }
    }
    const key = window.TrueTab.utils.getViewportKey();
    const layout = layoutMemory[key];
    if (!layout) return false;
    const { cols, rows } = window.TrueTab.getGridDimensions();
    let allValid = true;
    layout.forEach(saved => {
        const widget = window.TrueTab.getWidgetById(saved.id);
        if (widget) {
            const { minW, minH, maxH, maxW } = window.TrueTab.utils.getWidgetConstraints(widget.type);
            widget.x = saved.x;
            widget.y = saved.y;
            widget.w = saved.w;
            widget.h = saved.h;
            if (widget.x < 1 || widget.y < 1 ||
                widget.x + widget.w - 1 > cols ||
                widget.y + widget.h - 1 > rows) {
                allValid = false;
            }
            if (widget.w < minW || widget.h < minH) {
                allValid = false;
            }
            if (maxW !== null && widget.w > maxW) {
                allValid = false;
            }
            if (maxH !== null && widget.h > maxH) {
                allValid = false;
            }
        }
    });
    return allValid;
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Don't save if we're in the process of clearing all data
        if (sessionStorage.getItem('truetab-clearing') === 'true') {
            return;
        }
        window.TrueTab.saveWidgetsImmediate();
    }
});

// Export layout memory functions and state
// Make layoutMemory accessible via getter/setter to ensure it stays in sync
Object.defineProperty(window.TrueTab, 'layoutMemory', {
    get: () => layoutMemory,
    set: (value) => { layoutMemory = value; }
});

window.TrueTab.saveLayoutMemory = saveLayoutMemory;
window.TrueTab.loadLayoutMemory = loadLayoutMemory;