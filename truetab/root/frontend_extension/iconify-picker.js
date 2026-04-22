// Iconify Icon Picker Component
(function() {
    'use strict';

    const API_BASE = 'https://api.iconify.design/search';
    const INITIAL_LIMIT = 50;
    const LOAD_MORE_LIMIT = 12;

    class IconifyPicker {
        constructor(containerId, onSelect) {
            this.container = document.getElementById(containerId);
            this.onSelect = onSelect;
            this.startIndex = 0;
            this.total = 0;
            this.currentQuery = '';
            this.selectedCard = null;
            this.isInitialLoad = true;
            this.pagerEl = null;
            this.init();
        }

        init() {
            this.container.innerHTML = `
                <div class="settings-menu-item" style="position: relative;">
                    <label>Search Icons</label>
                    <input type="text" class="iconify-search settings-input" placeholder="Iconify" />
                    <button class="iconify-icon-btn" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--settings-text-color); cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; opacity: 0.5; transition: opacity 0.15s ease; pointer-events: none; width: 18px; height: 18px;">
                        <span class="iconify iconify-icon-btn-icon" data-icon="mdi:magnify" data-width="18" data-height="18"></span>
                    </button>
                </div>
                <div class="iconify-status" style="display: none;"></div>
                <div class="iconify-results"></div>
                    <button class="iconify-load-more settings-button-save" disabled style="width: 100%; margin-top: 8px; display: none;">Load More</button>
                </div>
            `;

            this.searchInput = this.container.querySelector('.iconify-search');
            this.resultsEl = this.container.querySelector('.iconify-results');
            this.statusEl = this.container.querySelector('.iconify-status');
            this.loadMoreBtn = this.container.querySelector('.iconify-load-more');
            this.iconBtn = this.container.querySelector('.iconify-icon-btn');
            this.iconBtnIcon = this.container.querySelector('.iconify-icon-btn-icon');

            this.setupEvents();
        }

        setupEvents() {
            this.searchInput.addEventListener('input', () => {
                clearTimeout(this.debounceTimeout);
                this.debounceTimeout = setTimeout(() => this.search(true), 300);

                // Toggle between search icon and X icon based on input
                if (this.searchInput.value.trim()) {
                    this.iconBtnIcon.setAttribute('data-icon', 'material-symbols:close');
                    this.iconBtn.style.opacity = '0.7';
                    this.iconBtn.style.pointerEvents = 'auto';
                    this.iconBtn.style.cursor = 'pointer';
                    if (window.Iconify && window.Iconify.scan) {
                        window.Iconify.scan(this.iconBtn);
                    }
                } else {
                    this.iconBtnIcon.setAttribute('data-icon', 'mdi:magnify');
                    this.iconBtn.style.opacity = '0.5';
                    this.iconBtn.style.pointerEvents = 'none';
                    this.iconBtn.style.cursor = 'default';
                    if (window.Iconify && window.Iconify.scan) {
                        window.Iconify.scan(this.iconBtn);
                    }
                }
            });

            this.iconBtn.addEventListener('click', () => {
                if (this.searchInput.value.trim()) {
                    this.searchInput.value = '';
                    this.iconBtnIcon.setAttribute('data-icon', 'mdi:magnify');
                    this.iconBtn.style.opacity = '0.5';
                    this.iconBtn.style.pointerEvents = 'none';
                    this.iconBtn.style.cursor = 'default';
                    if (window.Iconify && window.Iconify.scan) {
                        window.Iconify.scan(this.iconBtn);
                    }
                    this.clear();
                }
            });

            this.iconBtn.addEventListener('mouseenter', () => {
                if (this.iconBtn.style.pointerEvents === 'auto') {
                    this.iconBtn.style.opacity = '1';
                }
            });

            this.iconBtn.addEventListener('mouseleave', () => {
                if (this.iconBtn.style.pointerEvents === 'auto') {
                    this.iconBtn.style.opacity = '0.7';
                }
            });

            this.loadMoreBtn.addEventListener('click', () => this.search(false));
        }

        setStatus(text) {
            this.statusEl.textContent = text;
        }

        makeIconId(item) {
            if (!item) return null;
            if (typeof item === 'string') return item;
            if (item.prefix && item.name) return `${item.prefix}:${item.name}`;
            if (item.collection && item.name) return `${item.collection}:${item.name}`;
            if (item.provider && item.name) return `${item.provider}:${item.name}`;
            if (item.id) return item.id;
            if (item.icon) return item.icon;
            if (item.fullName) return item.fullName;
            if (item.name && item.name.includes(':')) return item.name;
            return null;
        }

        renderIcon(item) {
            const id = this.makeIconId(item);
            const card = document.createElement('div');
            card.className = 'iconify-icon-card';
            card.tabIndex = 0;

            // Add tooltip with icon name
            if (id) {
                card.title = id;
            }

            const preview = document.createElement('div');
            preview.className = 'iconify-icon-preview';

            if (id) {
                preview.innerHTML = `<span class="iconify" data-icon="${id}" data-width="24" data-height="24"></span>`;
            } else {
                preview.textContent = '?';
                preview.style.opacity = '0.3';
            }

            card.appendChild(preview);

            card.addEventListener('click', () => {
                if (id && this.onSelect) {
                    // Remove previous selection
                    if (this.selectedCard) {
                        this.selectedCard.classList.remove('selected');
                    }
                    // Highlight this card
                    card.classList.add('selected');
                    this.selectedCard = card;

                    this.onSelect(`iconify:${id}`);
                }
            });

            return card;
        }

        clearSelection() {
            if (this.selectedCard) {
                this.selectedCard.classList.remove('selected');
                this.selectedCard = null;
            }
        }

        async fetchIcons(query, start = 0, limit = INITIAL_LIMIT) {
            if (!query) return { icons: [], total: 0 };

            try {
                const url = `${API_BASE}?query=${encodeURIComponent(query)}&limit=${limit}&start=${start}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('Network error: ' + res.status);
                const data = await res.json();

                const icons = data.icons || data.results || data.items || data.data || [];
                const total = (typeof data.total === 'number') ? data.total
                            : (typeof data.total_count === 'number') ? data.total_count
                            : icons.length;

                return { icons, total };
            } catch (err) {
                console.error('Iconify search error:', err);
                return { icons: [], total: 0 };
            }
        }

        async search(reset = true) {
            let query;

            if (reset) {
                // For new search, get query from input
                query = this.searchInput.value.trim();

                if (!query) {
                    this.resultsEl.innerHTML = '';
                    this.setStatus('Type to search icons');
                    this.loadMoreBtn.disabled = true;
                    this.loadMoreBtn.style.display = 'none';
                    return;
                }

                this.startIndex = 0;
                this.resultsEl.innerHTML = '';
                this.total = 0;
                this.currentQuery = query;
                this.isInitialLoad = true;
            } else {
                // For load more, use cached query
                query = this.currentQuery;

                if (!query) {
                    return;
                }
            }

            this.setStatus('Searching...');
            this.loadMoreBtn.disabled = true;

            // Use INITIAL_LIMIT for first search, LOAD_MORE_LIMIT for subsequent loads
            const limit = this.isInitialLoad ? INITIAL_LIMIT : LOAD_MORE_LIMIT;
            const { icons, total } = await this.fetchIcons(query, this.startIndex, limit);
            this.total = total;

            if (!icons || icons.length === 0) {
                this.setStatus('No icons found');
                this.loadMoreBtn.style.display = 'none';
                return;
            }

            const frag = document.createDocumentFragment();
            icons.forEach(icon => frag.appendChild(this.renderIcon(icon)));
            this.resultsEl.appendChild(frag);

            this.startIndex += icons.length;
            this.setStatus(`Showing ${this.startIndex} of ${this.total}`);

            // Remove old load more button from grid if it exists
            const oldLoadMore = this.resultsEl.querySelector('.iconify-load-more-grid');
            if (oldLoadMore) {
                oldLoadMore.remove();
            }

            // Add load more button to grid if there are more items
            if (this.startIndex < this.total) {
                const loadMoreCard = document.createElement('button');
                loadMoreCard.className = 'iconify-icon-card iconify-load-more-grid';
                loadMoreCard.style.cssText = 'grid-column: span 2; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; cursor: pointer;';
                loadMoreCard.innerHTML = 'Load More';
                loadMoreCard.addEventListener('click', () => this.search(false));
                this.resultsEl.appendChild(loadMoreCard);
            }

            // Hide the old footer button (deprecated)
            this.loadMoreBtn.style.display = 'none';

            // After first load, switch to load more limit
            if (this.isInitialLoad) {
                this.isInitialLoad = false;
            }

            // Trigger Iconify to load the icons
            if (window.Iconify) {
                window.Iconify.scan(this.resultsEl);
            }
        }

        clear() {
            this.searchInput.value = '';
            this.resultsEl.innerHTML = '';
            this.setStatus('Type to search icons');
            this.loadMoreBtn.disabled = true;
            this.startIndex = 0;
            this.total = 0;
        }

        destroy() {
            // Clean up timers
            if (this.debounceTimeout) {
                clearTimeout(this.debounceTimeout);
                this.debounceTimeout = null;
            }

            // Clear content (removes event listeners via innerHTML)
            if (this.container) {
                this.container.innerHTML = '';
            }

            // Clear references
            this.searchInput = null;
            this.resultsEl = null;
            this.statusEl = null;
            this.pagerEl = null;
            this.loadMoreBtn = null;
            this.selectedCard = null;
            this.onSelect = null;
        }
    }

    // Export to global scope
    window.IconifyPicker = IconifyPicker;
})();
