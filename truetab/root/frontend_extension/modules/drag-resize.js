// drag-resize.js
window.TrueTab = window.TrueTab || {};

// Initialize shared state on window.TrueTab
window.TrueTab.wasDragging = false;

let draggedWidget = null;
let resizingWidget = null;
let dragStartX = 0;
let dragStartY = 0;
let resizeAnimationFrame = null;
let resizeDirection = 'br';
let justFinishedResizing = false;
let lastResizeW = 0;
let lastResizeH = 0;

function startDrag(e) {
    const currentEditMode = window.TrueTab.editMode;
    if (!currentEditMode || e.target.classList.contains('resize-handle') || e.target.classList.contains('delete-btn') || e.target.classList.contains('edit-widget-btn')) return;
    e.preventDefault();
    e.stopPropagation();
    draggedWidget = e.target.closest('.widget');
    window.TrueTab.wasDragging = false;
    if (!draggedWidget) return;
    const widgetData = window.TrueTab.getWidgetById(draggedWidget.id);
    if (!widgetData || !widgetData.x || !widgetData.y) {
        console.warn('Widget has no position data, triggering reflow...');
        window.TrueTab.reflowWidgets();
        return;
    }
    draggedWidget.classList.add('dragging');
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    draggedWidget.dataset.startGridX = widgetData.x;
    draggedWidget.dataset.startGridY = widgetData.y;
    if (window.TrueTab.editMode) window.TrueTab.updateGridOutline();
    document.addEventListener('mousemove', drag, { passive: true });
    document.addEventListener('mouseup', stopDrag, { passive: true });
}

let dragAnimationFrame = null;

function drag(e) {
    if (!draggedWidget) return;
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    if (dragAnimationFrame) {
        cancelAnimationFrame(dragAnimationFrame);
    }
    dragAnimationFrame = requestAnimationFrame(() => {
        if (draggedWidget) {
            draggedWidget.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            draggedWidget.style.zIndex = '1000';
            window.TrueTab.wasDragging = true;
        }
    });
}

function stopDrag(e) {
    if (!draggedWidget) return;
    if (dragAnimationFrame) {
        cancelAnimationFrame(dragAnimationFrame);
        dragAnimationFrame = null;
    }
    const widgetData = window.TrueTab.getWidgetById(draggedWidget.id);
    const { iconWidth, iconHeight, gapX, gapY } = window.TrueTab.utils.getCSSVars();
    const { cols, rows } = window.TrueTab.getGridDimensions();
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    const cellsX = Math.round(deltaX / (iconWidth + gapX));
    const cellsY = Math.round(deltaY / (iconHeight + gapY));
    const startX = parseInt(draggedWidget.dataset.startGridX);
    const startY = parseInt(draggedWidget.dataset.startGridY);
    let newX = startX + cellsX;
    let newY = startY + cellsY;
    const maxX = Math.max(1, cols - widgetData.w + 1);
    const maxY = Math.max(1, rows - widgetData.h + 1);
    newX = Math.max(1, Math.min(maxX, newX));
    newY = Math.max(1, Math.min(maxY, newY));
    if (!window.TrueTab.utils.hasCollision(newX, newY, widgetData.w, widgetData.h, widgetData.id) && !window.TrueTab.utils.isReservedArea(newX, newY, widgetData.w, widgetData.h)) {
        widgetData.x = newX;
        widgetData.y = newY;
        window.TrueTab.saveWidgets();
    } else if (window.TrueTab.utils.isReservedArea(newX, newY, widgetData.w, widgetData.h)) {
        const availableSlot = window.TrueTab.utils.findAvailableSlot(widgetData.w, widgetData.h);
        widgetData.x = availableSlot.x;
        widgetData.y = availableSlot.y;
        window.TrueTab.saveWidgets();
    }
    draggedWidget.classList.remove('dragging');
    draggedWidget.style.transform = '';
    draggedWidget.style.zIndex = '';
    setTimeout(() => { window.TrueTab.wasDragging = false; }, 100);
    draggedWidget = null;
    document.removeEventListener('mousemove', drag, { passive: true });
    document.removeEventListener('mouseup', stopDrag, { passive: true });
    window.TrueTab.updateWidgetPositions();
    if (window.TrueTab.editMode) window.TrueTab.updateGridOutline();
    window.TrueTab.refreshUnifiedControlsPositions?.();
}

function startResize(e, direction = 'br') {
    e.preventDefault();
    e.stopPropagation();
    resizingWidget = e.target.closest('.widget');
    if (!resizingWidget) return;
    const widgetData = window.TrueTab.getWidgetById(resizingWidget.id);
    resizeDirection = direction;
    resizingWidget.dataset.startX = e.clientX;
    resizingWidget.dataset.startY = e.clientY;
    resizingWidget.dataset.startW = widgetData.w;
    resizingWidget.dataset.startH = widgetData.h;
    lastResizeW = widgetData.w;
    lastResizeH = widgetData.h;
    if (direction === 'bl') {
        resizingWidget.dataset.startGridX = widgetData.x;
    }
    if (window.TrueTab.editMode) window.TrueTab.updateGridOutline();
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
}

function resize(e) {
    if (!resizingWidget) return;
    if (resizeAnimationFrame) cancelAnimationFrame(resizeAnimationFrame);
    resizeAnimationFrame = requestAnimationFrame(() => {
        if (!resizingWidget) return;
        const widgetData = window.TrueTab.getWidgetById(resizingWidget.id);
        if (!widgetData) return;
        const { iconWidth, iconHeight, gapX, gapY } = window.TrueTab.utils.getCSSVars();
        const { cols, rows } = window.TrueTab.getGridDimensions();
        const { minW, minH, maxH, maxW } = window.TrueTab.utils.getWidgetConstraints(widgetData.type);
        const startW = parseInt(resizingWidget.dataset.startW);
        const startH = parseInt(resizingWidget.dataset.startH);
        let deltaX, deltaY, cellsX, cellsY;
        let newX = widgetData.x;
        let newW, newH;
        if (resizeDirection === 'bl') {
            const startX = parseInt(resizingWidget.dataset.startGridX);
            deltaX = parseInt(resizingWidget.dataset.startX) - e.clientX;
            deltaY = e.clientY - parseInt(resizingWidget.dataset.startY);
            cellsX = Math.round(deltaX / (iconWidth + gapX));
            cellsY = Math.round(deltaY / (iconHeight + gapY));

            // Calculate new width, but keep right edge fixed
            const rightEdge = startX + startW - 1;
            newW = Math.max(minW, startW + cellsX);
            newH = Math.max(minH, startH + cellsY);

            // Calculate new X position based on fixed right edge
            newX = rightEdge - newW + 1;

            // Prevent going outside left boundary
            if (newX < 1) {
                newX = 1;
                newW = rightEdge; // Right edge stays fixed, width adjusts to fit from x=1
            }
        } else {
            deltaX = e.clientX - parseInt(resizingWidget.dataset.startX);
            deltaY = e.clientY - parseInt(resizingWidget.dataset.startY);
            cellsX = Math.round(deltaX / (iconWidth + gapX));
            cellsY = Math.round(deltaY / (iconHeight + gapY));
            newW = Math.max(minW, startW + cellsX);
            newH = Math.max(minH, startH + cellsY);
        }
        if (maxW !== null) newW = Math.min(newW, maxW);
        if (maxH !== null) newH = Math.min(newH, maxH);
        newW = Math.min(newW, cols - newX + 1);
        newH = Math.min(newH, rows - widgetData.y + 1);
        newW = Math.max(minW, newW);
        newH = Math.max(minH, newH);

        const hasCollisionAny = window.TrueTab.utils.hasCollision(newX, widgetData.y, newW, newH, widgetData.id) ||
                                window.TrueTab.utils.isReservedArea(newX, widgetData.y, newW, newH);
        if (!hasCollisionAny && (newW !== widgetData.w || newH !== widgetData.h || newX !== widgetData.x)) {
            const sizeChanged = (newW !== lastResizeW || newH !== lastResizeH);
            widgetData.w = newW;
            widgetData.h = newH;
            widgetData.x = newX;
            resizingWidget.style.gridColumn = `${newX} / span ${newW}`;
            resizingWidget.style.gridRow = `${widgetData.y} / span ${newH}`;

            // Re-render widget when size changes
            if (sizeChanged) {
                lastResizeW = newW;
                lastResizeH = newH;

                // Save dataset properties before re-rendering
                const startX = resizingWidget.dataset.startX;
                const startY = resizingWidget.dataset.startY;
                const startW = resizingWidget.dataset.startW;
                const startH = resizingWidget.dataset.startH;
                const startGridX = resizingWidget.dataset.startGridX;

                resizingWidget = window.TrueTab.rerenderSingleWidget(widgetData);

                // Restore dataset properties
                if (resizingWidget) {
                    resizingWidget.dataset.startX = startX;
                    resizingWidget.dataset.startY = startY;
                    resizingWidget.dataset.startW = startW;
                    resizingWidget.dataset.startH = startH;
                    if (startGridX) resizingWidget.dataset.startGridX = startGridX;
                }
            }
        }
    });
}

function stopResize() {
    if (resizingWidget) {
        const widgetData = window.TrueTab.getWidgetById(resizingWidget.id);
        if (widgetData) {
            window.TrueTab.utils.resolveOverlaps(widgetData);
        }
        window.TrueTab.saveWidgets();
        // Re-render widgets to update appearance for new size
        if (window.TrueTab.editMode) {
            window.TrueTab.renderWidgets();
            window.TrueTab.updateGridOutline();
        } else {
            window.TrueTab.updateWidgetPositions();
            window.TrueTab.refreshUnifiedControlsPositions?.();
        }
        // Set flag to prevent edit mode exit on mouseup
        justFinishedResizing = true;
        setTimeout(() => { justFinishedResizing = false; }, 100);
    }
    resizingWidget = null;
    lastResizeW = 0;
    lastResizeH = 0;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
}

function initializeDragResizeListeners() {
    const gridContainer = document.getElementById('gridContainer');
    if (!gridContainer) return;

    // Exit edit mode when clicking gridContainer background
    gridContainer.addEventListener('click', (e) => {
        // Don't exit edit mode if we just finished resizing
        if (window.TrueTab.editMode && e.target === gridContainer && !justFinishedResizing) {
            // Check if any modal is currently open - if so, don't exit edit mode
            const settingsModal = document.getElementById('settingsModal');
            const addWidgetModal = document.getElementById('addWidgetModal');
            const widgetSettingsPopup = document.getElementById('widgetSettingsPopup');

            const isAnyModalOpen =
                (settingsModal && settingsModal.classList.contains('active')) ||
                (addWidgetModal && addWidgetModal.classList.contains('active')) ||
                (widgetSettingsPopup && widgetSettingsPopup.classList.contains('active'));

            if (isAnyModalOpen) {
                // Don't exit edit mode, a modal is still open
                return;
            }

            window.TrueTab.editMode = false;
            const editBtn = document.getElementById('editBtn');
            if (editBtn) {
                editBtn.innerHTML = '<span class="iconify" data-icon="material-symbols:lock-outline" data-width="20" data-height="20"></span>';
                editBtn.title = 'Unlock';
                if (window.Iconify && window.Iconify.scan) {
                    window.Iconify.scan(editBtn);
                }
            }
            gridContainer.classList.remove('edit-mode');

            // Hide edit mode tip banner
            const editModeTip = document.getElementById('editModeTip');
            if (editModeTip) {
                editModeTip.style.display = 'none';
            }

            window.TrueTab.renderWidgets();
            window.TrueTab.updateGridOutline();
            return;
        }
    });

    gridContainer.addEventListener('click', (e) => {
        if (e.target.closest('.edit-widget-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const buttonEl = e.target.closest('.edit-widget-btn');
            const widgetEl = e.target.closest('.widget');
            const widget = window.TrueTab.getWidgetById(widgetEl.id);
            if (widget) window.TrueTab.openWidgetSettings(widget, buttonEl);
            return;
        }
        if (e.target.closest('.delete-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const widgetEl = e.target.closest('.widget');
            if (widgetEl) window.TrueTab.deleteWidget(widgetEl.id);
            return;
        }
        if (window.TrueTab.wasDragging && e.target.closest('.single-app-widget')) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        // Prevent apps scroller links from opening after dragging
        if (window.TrueTab.wasDragging && e.target.closest('.apps-scroller-widget .app-item')) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
    });

    gridContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('.edit-widget-btn, .delete-btn')) {
            e.stopPropagation();
            return;
        }
        if (e.target.closest('.resize-handle-br')) {
            startResize(e);
            return;
        }
        if (e.target.closest('.resize-handle-bl')) {
            startResize(e, 'bl');
            return;
        }
        if (window.TrueTab.editMode && e.target.closest('.widget')) {
            startDrag(e);
        }
    });
}

// Initialize editMode from global state
window.TrueTab.editMode = window.TrueTab.editMode || false;

// Initialize listeners when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDragResizeListeners);
} else {
    initializeDragResizeListeners();
}

// Export drag/resize state and functions
// Note: editMode and wasDragging are initialized above and managed globally
window.TrueTab.draggedWidget = draggedWidget;
window.TrueTab.resizingWidget = resizingWidget;
window.TrueTab.dragStartX = dragStartX;
window.TrueTab.dragStartY = dragStartY;
window.TrueTab.startDrag = startDrag;
window.TrueTab.drag = drag;
window.TrueTab.stopDrag = stopDrag;
window.TrueTab.startResize = startResize;
window.TrueTab.resize = resize;
window.TrueTab.stopResize = stopResize;