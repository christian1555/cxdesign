// grid.js
window.TrueTab = window.TrueTab || {};

let gridDimensionsCache = null;
let gridDimensionsCacheKey = '';
let isReflowing = false;

function getGridDimensions() {
    const cacheKey = `${window.innerWidth}x${window.innerHeight}`;
    if (gridDimensionsCache && gridDimensionsCacheKey === cacheKey) {
        return gridDimensionsCache;
    }
    const { iconWidth, iconHeight, gapX, gapY } = window.TrueTab.utils.getCSSVars();
    const availableWidth = window.innerWidth - 40;
    const availableHeight = window.innerHeight - 40;
    const cols = Math.floor((availableWidth + gapX) / (iconWidth + gapX));
    const rows = Math.floor((availableHeight + gapY) / (iconHeight + gapY));
    gridDimensionsCache = {
        cols: Math.max(6, cols),
        rows: Math.max(6, rows)
    };
    gridDimensionsCacheKey = cacheKey;
    return gridDimensionsCache;
}

function updateGridColumns() {
    const { cols, rows } = getGridDimensions();
    const gridContainer = window.TrueTab.gridContainer || document.getElementById('gridContainer');
    if (gridContainer) {
        gridContainer.style.gridTemplateColumns = `repeat(${cols}, var(--icon-width))`;
        gridContainer.style.gridTemplateRows = `repeat(${rows}, var(--icon-height))`;
    }
}

let gridOutlineTimeout = null;
let occupancyCache = null;

function buildOccupancyMap() {
    if (occupancyCache) return occupancyCache;
    occupancyCache = window.TrueTab.utils.buildOccupancySet();
    return occupancyCache;
}

function updateGridOutline() {
    if (gridOutlineTimeout) {
        clearTimeout(gridOutlineTimeout);
    }
    gridOutlineTimeout = setTimeout(() => {
        updateGridOutlineImmediate();
        gridOutlineTimeout = null;
    }, 50);
}

function updateGridOutlineImmediate() {
    let outline = document.querySelector('.grid-outline');
    if (outline) {
        outline.remove();
    }
    if (!window.TrueTab.editMode) return;

    const gridContainer = window.TrueTab.gridContainer || document.getElementById('gridContainer');
    if (!gridContainer) return;

    outline = document.createElement('div');
    outline.className = 'grid-outline';
    const metrics = window.TrueTab.utils.getGridMetrics();
    const { cols, rows, iconWidth, iconHeight } = metrics;
    occupancyCache = null;
    const occupied = buildOccupancyMap();
    const fragment = document.createDocumentFragment();
    for (let row = 1; row <= rows; row++) {
        for (let col = 1; col <= cols; col++) {
            if (window.TrueTab.utils.isReservedArea(col, row, 1, 1)) continue;
            if (!occupied.has(`${col},${row}`)) {
                const center = window.TrueTab.utils.getCellCenter(col, row);
                const addBtn = document.createElement('button');
                addBtn.className = 'grid-add-btn';
                addBtn.textContent = '+';
                addBtn.style.left = `${center.x}px`;
                addBtn.style.top = `${center.y}px`;
                addBtn.dataset.gridX = col;
                addBtn.dataset.gridY = row;
                fragment.appendChild(addBtn);
            }
        }
    }
    outline.appendChild(fragment);
    gridContainer.appendChild(outline);
    outline.addEventListener('click', (e) => {
        const btn = e.target.closest('.grid-add-btn');
        if (btn) {
            e.stopPropagation();
            const gridX = parseInt(btn.dataset.gridX);
            const gridY = parseInt(btn.dataset.gridY);
            window.TrueTab.openAddWidgetModalAt(gridX, gridY);
        }
    });
}

function reflowWidgets() {
    // Prevent concurrent reflows - critical for rapid window resizing
    if (isReflowing) {
        // Skip if a reflow is already scheduled/in progress
        return;
    }
    isReflowing = true;

    const { cols, rows } = getGridDimensions();
    updateGridColumns();
    const widgetsArray = window.TrueTab.widgetsArray || [];
    // Filter out widgets with invalid positions before sorting
    const validWidgets = widgetsArray.filter(w => w.x && w.y);
    const sortedWidgets = [...validWidgets].sort((a, b) => {
        if (a.y === b.y) return a.x - b.x;
        return a.y - b.y;
    });
    const occupied = new Set();

    // Clear any cached occupancy data to ensure fresh calculations
    occupancyCache = null;
    const canFitAt = (x, y, w, h) => window.TrueTab.utils.canFitAtIn(x, y, w, h, cols, rows, occupied);
    const findPosition = (w, h, prefX = null, prefY = null) => (
        window.TrueTab.utils.findPositionInGrid(w, h, { cols, rows, occupiedSet: occupied, prefX, prefY })
    );
    sortedWidgets.forEach(widget => {
        // Widget should already have valid x,y from filtering above, but double-check
        if (!widget.x || !widget.y) {
            console.warn(`Widget ${widget.id} missing position during reflow, skipping`);
            return;
        }
        const { minW, minH, maxH, maxW } = window.TrueTab.utils.getWidgetConstraints(widget.type);
        let newW = widget.w;
        let newH = widget.h;
        if (maxW !== null) newW = Math.min(newW, maxW);
        if (maxH !== null) newH = Math.min(newH, maxH);
        newW = Math.min(newW, cols);
        newH = Math.min(newH, rows);
        newW = Math.max(minW, newW);
        newH = Math.max(minH, newH);
        let pos = null;
        pos = findPosition(newW, newH, widget.x, widget.y);
        if (!pos) {
            let foundSize = false;
            for (let h = newH; h >= minH && !foundSize; h--) {
                for (let w = newW; w >= minW && !foundSize; w--) {
                    pos = findPosition(w, h, widget.x, widget.y);
                    if (pos) {
                        newW = w;
                        newH = h;
                        foundSize = true;
                    }
                }
            }
        }
        if (!pos) {
            newW = Math.min(minW, cols);
            newH = Math.min(minH, rows);
            if (newW < minW || newH < minH) {
                newW = minW;
                newH = minH;
            }
            pos = { x: 1, y: 1 };
        }
        // Mark all cells as occupied BEFORE assigning to widget
        // This ensures the occupied Set is fully updated before any other operations
        for (let dy = 0; dy < newH; dy++) {
            for (let dx = 0; dx < newW; dx++) {
                const cellKey = `${pos.x + dx},${pos.y + dy}`;
                if (occupied.has(cellKey)) {
                    console.error(`CRITICAL: Cell ${cellKey} already occupied when placing widget ${widget.id}!`);
                }
                occupied.add(cellKey);
            }
        }
        // Ensure all values are integers
        widget.x = Math.round(pos.x);
        widget.y = Math.round(pos.y);
        widget.w = Math.round(newW);
        widget.h = Math.round(newH);
    });

    // Validation: Check for any overlaps (defensive, gated by DEBUG)
    if (window.TrueTab && window.TrueTab.DEBUG && typeof console !== 'undefined' && console.assert) {
        for (let i = 0; i < sortedWidgets.length; i++) {
            for (let j = i + 1; j < sortedWidgets.length; j++) {
                const w1 = sortedWidgets[i];
                const w2 = sortedWidgets[j];
                if (window.TrueTab.utils.checkWidgetCollision(
                    w1.x, w1.y, w1.w, w1.h,
                    w2.x, w2.y, w2.w, w2.h
                )) {
                    console.error(`Reflow produced overlap: ${w1.id} at (${w1.x},${w1.y},${w1.w},${w1.h}) and ${w2.id} at (${w2.x},${w2.y},${w2.w},${w2.h})`);
                }
            }
        }
    }

    window.TrueTab.previousCols = cols;
    window.TrueTab.saveWidgets(false);
    window.TrueTab.renderWidgets();
    if (window.TrueTab.editMode) updateGridOutline();

    // Use requestAnimationFrame to ensure rendering completes before allowing next reflow
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            isReflowing = false;
        });
    });
}

window.TrueTab.getGridDimensions = getGridDimensions;
window.TrueTab.updateGridColumns = updateGridColumns;
window.TrueTab.updateGridOutline = updateGridOutline;
window.TrueTab.updateGridOutlineImmediate = updateGridOutlineImmediate;
window.TrueTab.buildOccupancyMap = buildOccupancyMap;
window.TrueTab.reflowWidgets = reflowWidgets;
