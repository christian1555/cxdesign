// input-bar.js — Unified Input Bar widget
// Wraps all bar types (OG Search, chatbot, cinema, youtube, etc.) into a single widget
// with icon switching, more menu, drag-to-reorder, and per-bar settings.

window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

// Store the original OG Search module before we override
window.TrueTab.widgetModules['bar-search'] = window.TrueTab.widgetModules.search;
if (window.TrueTab.widgetModules['bar-search']) {
  window.TrueTab.widgetModules['bar-search'].barMeta = {
    id: 'bar-search',
    name: 'OG Search',
    icon: 'mdi:magnify',
    testMode: false
  };
}

// Similarly alias chatbot and cinema as bar- prefixed for the registry
window.TrueTab.widgetModules['bar-chatbot'] = window.TrueTab.widgetModules.chatbot;
if (window.TrueTab.widgetModules['bar-chatbot']) {
  window.TrueTab.widgetModules['bar-chatbot'].barMeta = {
    id: 'bar-chatbot',
    name: 'AI Chat',
    icon: 'hugeicons:ai-chat-02',
    testMode: false
  };
}

window.TrueTab.widgetModules['bar-cinema'] = window.TrueTab.widgetModules.cinema;
if (window.TrueTab.widgetModules['bar-cinema']) {
  window.TrueTab.widgetModules['bar-cinema'].barMeta = {
    id: 'bar-cinema',
    name: 'Movies',
    icon: 'mdi:movie-search-outline',
    testMode: false
  };
}

// Default background text for each bar type
const BAR_DEFAULT_TEXT = {
  'bar-search': 'OG SEARCH',
  'bar-chatbot': 'AI CHAT',
  'bar-cinema': 'MOVIES',
  'bar-youtube': 'YOUTUBE',
  'bar-wikipedia': 'WIKIPEDIA',
  'bar-amazon': 'AMAZON',
  'bar-reddit': 'REDDIT',
  'bar-ebay': 'EBAY'
};

// Now replace search with the unified widget
window.TrueTab.widgetModules.search = (function() {
  const stateByWidget = new Map();

  // All known bar module IDs (order matters for discovery)
  const ALL_BAR_IDS = [
    'bar-search', 'bar-chatbot', 'bar-cinema',
    'bar-youtube', 'bar-wikipedia', 'bar-amazon', 'bar-reddit', 'bar-ebay'
  ];

  const DEFAULT_ENABLED = ['bar-search', 'bar-chatbot'];
  const DEFAULT_ACTIVE = 'bar-search';

  function getBarModule(barId) {
    return window.TrueTab.widgetModules[barId];
  }

  function getBarMeta(barId) {
    const mod = getBarModule(barId);
    return mod && mod.barMeta ? mod.barMeta : { id: barId, name: barId, icon: 'mdi:help-circle', testMode: true };
  }

  function getAllBars() {
    return ALL_BAR_IDS.filter(id => getBarModule(id));
  }

  function getEnabledBars(settings) {
    return settings.enabledBars && settings.enabledBars.length > 0
      ? settings.enabledBars.filter(id => getBarModule(id))
      : [...DEFAULT_ENABLED];
  }

  function getActiveBar(settings) {
    const enabled = getEnabledBars(settings);
    if (settings.activeBar && enabled.includes(settings.activeBar)) return settings.activeBar;
    return enabled[0] || DEFAULT_ACTIVE;
  }

  function getDisabledBars(settings) {
    const enabled = new Set(getEnabledBars(settings));
    return getAllBars().filter(id => !enabled.has(id));
  }

  function getBarBackgroundText(settings, barId) {
    const barSettings = settings.barSettings && settings.barSettings[barId];
    if (barSettings && barSettings.backgroundText !== undefined) return barSettings.backgroundText;
    return BAR_DEFAULT_TEXT[barId] || barId.replace('bar-', '').toUpperCase();
  }

  function shouldShowBackgroundText(settings) {
    return settings.showBackgroundText !== false;
  }

  // Determine if controls should go above or below the bar.
  // Top half of grid → controls ABOVE bar (suggestions expand below).
  // Bottom half of grid → controls BELOW bar (suggestions expand above).
  function getControlsPosition(element) {
    const gridContainer = document.getElementById('gridContainer');
    const rect = element.getBoundingClientRect();
    const widgetCenterY = rect.top + rect.height / 2;
    let midY;
    if (gridContainer) {
      const gridRect = gridContainer.getBoundingClientRect();
      midY = gridRect.top + gridRect.height / 2;
    } else {
      midY = window.innerHeight / 2;
    }
    return widgetCenterY <= midY ? 'controls-above' : 'controls-below';
  }

  return {
    barMeta: null, // null means this is a wrapper, not a bar

    render(settings = {}, widgetSize = '6x1') {
      const enabledBars = getEnabledBars(settings);
      const activeBar = getActiveBar(settings);
      const barMod = getBarModule(activeBar);

      // Get the bar-specific settings
      const barSettings = settings.barSettings && settings.barSettings[activeBar]
        ? { ...settings.barSettings[activeBar] }
        : {};

      // Render the active bar's content
      let barHTML = '';
      if (barMod && barMod.render) {
        barHTML = barMod.render(barSettings, widgetSize);
      }

      // Background text for active bar (shown on ALL bars, not just test bars)
      const bgText = getBarBackgroundText(settings, activeBar);
      const showBgText = shouldShowBackgroundText(settings);
      const bgTextHTML = showBgText && bgText
        ? `<div class="bar-bg-text">${bgText}</div>`
        : '';

      // Build icon buttons for enabled bars (only show if more than 1 enabled)
      let iconsHTML = '';
      if (enabledBars.length > 1) {
        const iconButtons = enabledBars.map(barId => {
          const meta = getBarMeta(barId);
          const isActive = barId === activeBar;
          return `<button type="button" class="input-bar-icon-btn ${isActive ? 'active' : ''}"
                    data-bar-id="${barId}" title="${meta.name}" draggable="false">
                    <span class="iconify" data-icon="${meta.icon}"></span>
                  </button>`;
        }).join('');

        iconsHTML = `<div class="input-bar-icons">${iconButtons}</div>`;
      }

      // More button (always visible)
      const moreHTML = `
        <button type="button" class="input-bar-more-btn" title="Add or remove bars">
          <span class="iconify" data-icon="mdi:dots-vertical"></span>
        </button>
      `;

      const singleBarClass = enabledBars.length <= 1 ? ' single-bar' : '';

      // Position class will be set dynamically in setup()
      return `
        <div class="input-bar-wrapper${singleBarClass}" data-active-bar="${activeBar}">
          <div class="input-bar-controls">
            ${iconsHTML}
            ${moreHTML}
          </div>
          <div class="input-bar-content">
            ${bgTextHTML}
            ${barHTML}
          </div>
        </div>
      `;
    },

    setup(element, editMode, settings = {}) {
      const widgetId = element.id;
      const enabledBars = getEnabledBars(settings);
      const activeBar = getActiveBar(settings);

      // Initialize state
      if (!stateByWidget.has(widgetId)) {
        stateByWidget.set(widgetId, {
          activeBar,
          enabledBars: [...enabledBars],
          moreMenuOpen: false
        });
      } else {
        const st = stateByWidget.get(widgetId);
        st.activeBar = activeBar;
        st.enabledBars = [...enabledBars];
      }

      // Set dynamic controls position (above or below bar)
      const wrapper = element.querySelector('.input-bar-wrapper');
      if (wrapper) {
        const pos = getControlsPosition(element);
        wrapper.classList.remove('controls-above', 'controls-below');
        wrapper.classList.add(pos);
      }

      if (editMode) {
        this._setupEditMode(element, widgetId, settings);
        return;
      }

      // Setup the active bar's behavior
      const barContentEl = element.querySelector('.input-bar-content') || element;
      barContentEl.dataset.widgetId = widgetId;
      const barMod = getBarModule(activeBar);
      const barSettings = settings.barSettings && settings.barSettings[activeBar]
        ? { ...settings.barSettings[activeBar] }
        : {};

      if (barMod) {
        if (activeBar === 'bar-chatbot' && barMod.update) {
          barMod.update(barContentEl, barSettings, false);
          // Re-add background text — chatbot's update replaces innerHTML
          const bgText = getBarBackgroundText(settings, activeBar);
          if (shouldShowBackgroundText(settings) && bgText && !barContentEl.querySelector('.bar-bg-text')) {
            const bgDiv = document.createElement('div');
            bgDiv.className = 'bar-bg-text';
            bgDiv.textContent = bgText;
            barContentEl.prepend(bgDiv);
          }
        } else if (barMod.setup) {
          barMod.setup(barContentEl, editMode, barSettings);
        }
      }

      // Setup icon button click handlers
      const iconBtns = element.querySelectorAll('.input-bar-icon-btn');
      iconBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const barId = btn.dataset.barId;
          if (barId && barId !== activeBar) {
            this._switchToBar(element, widgetId, settings, barId);
          }
        });
      });

      // Setup more button
      const moreBtn = element.querySelector('.input-bar-more-btn');
      if (moreBtn) {
        moreBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._toggleMoreMenu(element, widgetId, settings);
        });
      }

      // Setup drag-to-reorder for icons (only works in edit mode via mousedown check)
      this._setupIconDragReorder(element, widgetId, settings);

      // Scan icons
      if (window.Iconify && window.Iconify.scan) {
        window.Iconify.scan(element);
      }
    },

    _setupEditMode(element, widgetId, settings) {
      // Drag reorder is available in edit mode
      this._setupIconDragReorder(element, widgetId, settings);

      if (window.Iconify && window.Iconify.scan) {
        window.Iconify.scan(element);
      }
    },

    _setupIconDragReorder(element, widgetId, settings) {
      const iconsContainer = element.querySelector('.input-bar-icons');
      if (!iconsContainer) return;

      const state = stateByWidget.get(widgetId);
      if (!state) return;

      const iconBtns = Array.from(iconsContainer.querySelectorAll('.input-bar-icon-btn'));
      if (iconBtns.length < 2) return;

      iconBtns.forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
          if (!window.TrueTab.editMode) return;

          e.preventDefault();
          e.stopPropagation();

          const startX = e.clientX;
          let isDragging = false;
          let dragIndex = iconBtns.indexOf(btn);
          let currentOrder = iconBtns.map(b => b.dataset.barId);

          // Measure positions once at drag start
          const btnRects = iconBtns.map(b => b.getBoundingClientRect());
          const btnCenters = btnRects.map(r => r.left + r.width / 2);
          const gap = iconBtns.length > 1 ? btnRects[1].left - btnRects[0].right : 0;
          const btnWidth = btnRects[0].width;

          // Drag bounds
          const containerRect = iconsContainer.getBoundingClientRect();
          const minDragX = containerRect.left - btnRects[dragIndex].left;
          const maxDragX = containerRect.right - btnRects[dragIndex].right;

          const onMouseMove = (moveE) => {
            let dx = moveE.clientX - startX;

            if (!isDragging && Math.abs(dx) > 5) {
              isDragging = true;
              btn.classList.add('drag-active');
              iconsContainer.classList.add('drag-in-progress');
            }

            if (!isDragging) return;

            // Clamp within icon row
            dx = Math.max(minDragX, Math.min(maxDragX, dx));
            btn.style.transform = `translateX(${dx}px)`;

            // Current center of dragged button
            const draggedCenter = btnCenters[dragIndex] + dx;

            // Find target position
            let targetIndex = dragIndex;
            for (let i = 0; i < btnCenters.length; i++) {
              if (i === dragIndex) continue;
              if (dragIndex < i && draggedCenter >= btnCenters[i]) {
                targetIndex = i;
              } else if (dragIndex > i && draggedCenter <= btnCenters[i]) {
                targetIndex = i;
                break;
              }
            }

            // Shift other icons
            iconBtns.forEach((b, i) => {
              if (i === dragIndex) return;
              let shift = 0;
              if (dragIndex < targetIndex) {
                if (i > dragIndex && i <= targetIndex) shift = -(btnWidth + gap);
              } else if (dragIndex > targetIndex) {
                if (i >= targetIndex && i < dragIndex) shift = btnWidth + gap;
              }
              b.style.transform = shift ? `translateX(${shift}px)` : '';
            });
          };

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            if (!isDragging) return;

            // Calculate final target
            const finalDx = parseFloat(btn.style.transform.replace(/[^-\d.]/g, '')) || 0;
            const draggedCenter = btnCenters[dragIndex] + finalDx;
            let targetIndex = dragIndex;
            for (let i = 0; i < btnCenters.length; i++) {
              if (i === dragIndex) continue;
              if (dragIndex < i && draggedCenter >= btnCenters[i]) {
                targetIndex = i;
              } else if (dragIndex > i && draggedCenter <= btnCenters[i]) {
                targetIndex = i;
                break;
              }
            }

            // Build new order
            const newOrder = [...currentOrder];
            const [moved] = newOrder.splice(dragIndex, 1);
            newOrder.splice(targetIndex, 0, moved);

            // Clean up
            btn.classList.remove('drag-active');
            iconsContainer.classList.remove('drag-in-progress');
            iconBtns.forEach(b => { b.style.transform = ''; });

            // Only save and re-render if order changed
            if (newOrder.join(',') !== currentOrder.join(',')) {
              state.enabledBars = newOrder;

              const widget = window.TrueTab.getWidgetById(widgetId);
              if (widget) {
                widget.settings.enabledBars = newOrder;
                window.TrueTab.saveWidgets(false);
              }

              this._rerender(element, widgetId, widget ? widget.settings : settings, state.activeBar);
            }
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
      });
    },

    _switchToBar(element, widgetId, settings, targetBar) {
      const state = stateByWidget.get(widgetId);
      if (!state || state.activeBar === targetBar) return;

      // Cleanup current bar
      const currentBar = state.activeBar;
      const currentMod = getBarModule(currentBar);
      if (currentMod && currentMod.cleanup) {
        currentMod.cleanup(widgetId);
      }

      // Update state
      state.activeBar = targetBar;

      // Persist
      const widget = window.TrueTab.getWidgetById(widgetId);
      if (widget) {
        widget.settings.activeBar = targetBar;
        window.TrueTab.saveWidgets(false);
      }

      // Re-render
      this._rerender(element, widgetId, widget ? widget.settings : settings, targetBar);

      // Focus the input of the new bar
      setTimeout(() => {
        const input = element.querySelector('.search-input, .cb-input, .cinema-search-input, .bar-test-input');
        if (input) input.focus();
      }, 50);
    },

    _rerender(element, widgetId, settings, activeBarOverride) {
      if (activeBarOverride) settings.activeBar = activeBarOverride;

      // Save edit controls (settings btn, delete btn, resize handles) before re-rendering
      const editControls = [];
      element.querySelectorAll('.edit-widget-btn, .delete-btn, .resize-handle').forEach(el => {
        editControls.push(el);
        el.remove();
      });

      // Re-render the unified wrapper content
      element.innerHTML = this.render(settings);
      this.setup(element, window.TrueTab.editMode, settings);

      // Restore edit controls
      editControls.forEach(ctrl => element.appendChild(ctrl));

      if (window.Iconify && window.Iconify.scan) {
        window.Iconify.scan(element);
      }
    },

    _toggleMoreMenu(element, widgetId, settings) {
      const state = stateByWidget.get(widgetId);
      if (!state) return;

      let menu = document.getElementById(`input-bar-more-menu-${widgetId}`);
      if (menu) {
        menu.remove();
        state.moreMenuOpen = false;
        return;
      }

      state.moreMenuOpen = true;

      menu = document.createElement('div');
      menu.id = `input-bar-more-menu-${widgetId}`;
      menu.className = 'input-bar-more-menu suggestion-box';

      const enabledBars = getEnabledBars(settings);
      const disabledBars = getDisabledBars(settings);

      let menuHTML = '';

      if (enabledBars.length > 0) {
        menuHTML += '<div class="input-bar-more-section-title">Enabled</div>';
        enabledBars.forEach(barId => {
          const meta = getBarMeta(barId);
          const isLast = enabledBars.length <= 1;
          const isActive = barId === state.activeBar;
          menuHTML += `
            <div class="input-bar-more-item enabled ${isActive ? 'current' : ''}" data-bar-id="${barId}">
              <span class="iconify input-bar-more-item-icon" data-icon="${meta.icon}"></span>
              <span class="input-bar-more-item-name">${meta.name}</span>
              ${meta.testMode ? '<span class="input-bar-more-item-badge">TEST</span>' : ''}
              <button type="button" class="input-bar-more-item-delete ${isLast ? 'disabled' : ''}"
                      data-bar-id="${barId}" ${isLast ? 'disabled' : ''} title="${isLast ? 'Cannot remove last bar' : 'Remove'}">
                <span class="iconify" data-icon="material-symbols:close" data-width="14" data-height="14"></span>
              </button>
            </div>
          `;
        });
      }

      if (disabledBars.length > 0) {
        menuHTML += '<div class="input-bar-more-section-title">Available</div>';
        disabledBars.forEach(barId => {
          const meta = getBarMeta(barId);
          menuHTML += `
            <div class="input-bar-more-item available" data-bar-id="${barId}">
              <span class="iconify input-bar-more-item-icon" data-icon="${meta.icon}"></span>
              <span class="input-bar-more-item-name">${meta.name}</span>
              ${meta.testMode ? '<span class="input-bar-more-item-badge">TEST</span>' : ''}
              <button type="button" class="input-bar-more-item-add" data-bar-id="${barId}" title="Add">
                <span class="iconify" data-icon="material-symbols:add" data-width="14" data-height="14"></span>
              </button>
            </div>
          `;
        });
      }

      menu.innerHTML = `<div class="input-bar-more-menu-scroll suggestion-scroller">${menuHTML}</div>`;
      document.body.appendChild(menu);

      // Position the menu using same grid-based direction as suggestion boxes
      const moreBtn = element.querySelector('.input-bar-more-btn');
      if (moreBtn) {
        const btnRect = moreBtn.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const gridContainer = document.getElementById('gridContainer');
        const gridRect = gridContainer ? gridContainer.getBoundingClientRect() : { top: 0, bottom: viewportHeight, height: viewportHeight };
        const gridMidY = gridRect.top + gridRect.height / 2;
        const widget = element.closest('.widget') || element;
        const widgetCenterY = widget.getBoundingClientRect().top + widget.getBoundingClientRect().height / 2;

        menu.style.left = `${btnRect.left}px`;
        menu.style.minWidth = '200px';

        if (widgetCenterY <= gridMidY) {
          // Top half: controls above bar, menu opens below controls
          menu.classList.remove('expand-upwards');
          menu.style.top = `${btnRect.bottom + 4}px`;
          menu.style.bottom = 'auto';
        } else {
          // Bottom half: controls below bar, menu opens above controls
          menu.classList.add('expand-upwards');
          menu.style.bottom = `${viewportHeight - btnRect.top + 4}px`;
          menu.style.top = 'auto';
        }
      }

      if (window.Iconify && window.Iconify.scan) {
        window.Iconify.scan(menu);
      }

      menu.addEventListener('click', (e) => {
        e.stopPropagation();

        // Enabled item: click anywhere on row to remove (unless it's the last bar)
        const enabledItem = e.target.closest('.input-bar-more-item.enabled');
        if (enabledItem) {
          const deleteBtn = enabledItem.querySelector('.input-bar-more-item-delete');
          if (deleteBtn && !deleteBtn.disabled) {
            const barId = enabledItem.dataset.barId;
            this._removeBar(element, widgetId, settings, barId);
            menu.remove();
            state.moreMenuOpen = false;
          }
          return;
        }

        // Available item: click anywhere on row to add
        const availableItem = e.target.closest('.input-bar-more-item.available');
        if (availableItem) {
          const barId = availableItem.dataset.barId;
          this._addBar(element, widgetId, settings, barId);
          menu.remove();
          state.moreMenuOpen = false;
          return;
        }
      });

      const closeHandler = (e) => {
        if (!menu.contains(e.target) && !moreBtn.contains(e.target)) {
          menu.remove();
          state.moreMenuOpen = false;
          document.removeEventListener('click', closeHandler);
        }
      };
      setTimeout(() => document.addEventListener('click', closeHandler), 50);
    },

    _addBar(element, widgetId, settings, barId) {
      const state = stateByWidget.get(widgetId);
      if (!state) return;

      if (!state.enabledBars.includes(barId)) {
        state.enabledBars.push(barId);
      }

      const widget = window.TrueTab.getWidgetById(widgetId);
      if (widget) {
        widget.settings.enabledBars = [...state.enabledBars];
        window.TrueTab.saveWidgets(false);
      }

      this._rerender(element, widgetId, widget ? widget.settings : settings, state.activeBar);
    },

    _removeBar(element, widgetId, settings, barId) {
      const state = stateByWidget.get(widgetId);
      if (!state) return;

      if (state.enabledBars.length <= 1) return;

      state.enabledBars = state.enabledBars.filter(id => id !== barId);

      let newActive = state.activeBar;
      if (state.activeBar === barId) {
        newActive = state.enabledBars[0];
        state.activeBar = newActive;

        const oldMod = getBarModule(barId);
        if (oldMod && oldMod.cleanup) oldMod.cleanup(widgetId);
      }

      const widget = window.TrueTab.getWidgetById(widgetId);
      if (widget) {
        widget.settings.enabledBars = [...state.enabledBars];
        widget.settings.activeBar = newActive;
        window.TrueTab.saveWidgets(false);
      }

      this._rerender(element, widgetId, widget ? widget.settings : settings, newActive);
    },

    update(element, settings = {}) {
      const widgetId = element.id;
      const state = stateByWidget.get(widgetId);
      if (!state) return;

      const activeBar = state.activeBar;
      if (activeBar === 'bar-chatbot') {
        const barMod = getBarModule(activeBar);
        const barSettings = settings.barSettings && settings.barSettings[activeBar]
          ? { ...settings.barSettings[activeBar] }
          : {};
        if (barMod && barMod.update) {
          const barContentEl = element.querySelector('.input-bar-content') || element;
          barMod.update(barContentEl, barSettings);
        }
      }
    },

    cleanup(widgetId) {
      const state = stateByWidget.get(widgetId);
      if (state) {
        state.enabledBars.forEach(barId => {
          const mod = getBarModule(barId);
          if (mod && mod.cleanup) mod.cleanup(widgetId);
        });
      }

      const menu = document.getElementById(`input-bar-more-menu-${widgetId}`);
      if (menu) menu.remove();

      stateByWidget.delete(widgetId);
    }
  };
})();

// ============================================
// GLOBAL POSITIONING FUNCTIONS
// Used by all bar modules for suggestion boxes
// and by drag-resize for controls refresh
// ============================================

/**
 * Refresh controls-above/controls-below class on all input bar wrappers.
 * Called after drag/resize to update icon position relative to grid midpoint.
 */
window.TrueTab.refreshUnifiedControlsPositions = function() {
  const gridContainer = document.getElementById('gridContainer');
  if (!gridContainer) return;
  const gridRect = gridContainer.getBoundingClientRect();
  const gridMidY = gridRect.top + gridRect.height / 2;

  document.querySelectorAll('.widget .input-bar-wrapper').forEach(wrapper => {
    const widget = wrapper.closest('.widget');
    if (!widget) return;
    const rect = widget.getBoundingClientRect();
    const widgetCenterY = rect.top + rect.height / 2;
    const pos = widgetCenterY <= gridMidY ? 'controls-above' : 'controls-below';
    wrapper.classList.remove('controls-above', 'controls-below');
    wrapper.classList.add(pos);
  });
};

/**
 * Position a suggestion/expanded container relative to the input bar.
 * Direction is based on grid midpoint (same logic as controls, but opposite side).
 * Container is clamped to never extend past grid bounds.
 *
 * @param {HTMLElement} container - The suggestion/expanded container (position: fixed)
 * @param {HTMLElement} element   - The bar content element or any element inside the widget
 */
window.TrueTab.positionSuggestionBox = function(container, element) {
  const gridContainer = document.getElementById('gridContainer');
  if (!gridContainer) return;

  const widget = element.closest('.widget') || element;
  const gridRect = gridContainer.getBoundingClientRect();
  const widgetRect = widget.getBoundingClientRect();

  // Use bar-content element for precise vertical edge positioning
  const barContent = widget.querySelector('.input-bar-content');
  const barRect = barContent ? barContent.getBoundingClientRect() : widgetRect;

  const gridMidY = gridRect.top + gridRect.height / 2;
  const widgetCenterY = widgetRect.top + widgetRect.height / 2;

  container.style.left = `${widgetRect.left}px`;
  container.style.width = `${widgetRect.width}px`;

  if (widgetCenterY <= gridMidY) {
    // Top half of grid: controls above → suggestions expand BELOW bar
    container.classList.remove('expand-upwards');
    container.style.top = `${barRect.bottom}px`;
    container.style.bottom = 'auto';
    container.style.maxHeight = `${Math.max(100, gridRect.bottom - barRect.bottom)}px`;
  } else {
    // Bottom half of grid: controls below → suggestions expand ABOVE bar
    container.classList.add('expand-upwards');
    container.style.bottom = `${window.innerHeight - barRect.top}px`;
    container.style.top = 'auto';
    container.style.maxHeight = `${Math.max(100, barRect.top - gridRect.top)}px`;
  }
};
