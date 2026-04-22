/*
OG Search widget + cross-browser history/bookmarks wrapper
Filename: og-search.js
What this file includes:
- cross-browser wrapper for history/bookmarks (promises)
- merged suggestion pipeline: localHistory + browserHistory + bookmarks + server cache + DuckDuckGo
- respects settings: maxSuggestions, localSuggestionsCount
- minimal changes so you can drop in place of your previous widget code

Notes:
- Assumes BASE_URL is defined globally (your server base URL, e.g. https://search.example.com/)
- Make sure manifest.json adds permissions: "history", "bookmarks", and the host for your PHP endpoints.
- Keep search_proxy.php as your DDG proxy. The client will fetch it for DDG suggestions.
*/

// Cross-browser wrapper
const ExtAPI = (() => {
  const api = window.browser || window.chrome || {};

  function promisify(fn, ...args) {
    return new Promise((resolve) => {
      try {
        const result = fn(...args, (res) => {
          resolve(res);
        });
        // Some APIs return a Promise directly (Firefox), handle it
        if (result && typeof result.then === 'function') {
          result.then(resolve).catch(() => resolve(null));
        }
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Clean search engine suffixes from titles
  function cleanTitle(title) {
    if (!title) return '';
    // Remove common search engine suffixes in multiple languages
    const patterns = [
      / - Google Search$/i,
      / - Google søgning$/i,
      / - Google-Suche$/i,
      / - Recherche Google$/i,
      / - Búsqueda de Google$/i,
      / - Google 搜索$/i,
      / - Поиск в Google$/i,
      / - Bing$/i,
      / - DuckDuckGo$/i,
      / - Yahoo Search$/i,
      / \| Google Search$/i,
      / \| Bing$/i
    ];

    let cleanedTitle = title;
    for (const pattern of patterns) {
      cleanedTitle = cleanedTitle.replace(pattern, '');
    }
    return cleanedTitle.trim();
  }

  async function historySearch(query, maxResults = 50) {
    if (!api.history || !api.history.search) return [];
    try {
      const q = { text: query || '', maxResults };
      const res = await promisify(api.history.search, q);
      if (!Array.isArray(res)) return [];
      // map to simple shape and clean titles
      return res.map(r => {
        const title = cleanTitle(r.title || '');
        return { text: title || r.url || '', ts: r.lastVisitTime || Date.now(), raw: r };
      });
    } catch (e) { return []; }
  }

  async function bookmarksSearch(query, maxResults = 50) {
    if (!api.bookmarks || !api.bookmarks.search) return [];
    try {
      const res = await promisify(api.bookmarks.search, { query });
      if (!Array.isArray(res)) return [];
      return res.map(r => {
        const title = cleanTitle(r.title || '');
        return { text: title || r.url || '', ts: r.dateAdded || Date.now(), raw: r };
      });
    } catch (e) { return []; }
  }

  return { historySearch, bookmarksSearch };
})();

// Updated widget (replace your existing window.TrueTab.widgetModules.search with this)
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules.search = (function(){
  const STORAGE_KEY = 'truetab_search_history_v1';
  const MAX_HISTORY = 200;
  let searchHistory = [];
  // Per-widget fetch IDs to prevent race conditions between multiple search widgets
  const lastFetchIdByWidget = new Map();
  let activeIndex = -1;
  let currentSuggestions = [];

  // Settings defaults
  const defaults = {
    maxSuggestions: 7,
    localSuggestionsCount: 3, // counts browser+local+cache combined
    enableAutocomplete: true,
    searchEngine: 'google'
  };

  // Helpers
  function loadLocalHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      searchHistory = raw ? JSON.parse(raw) : [];
      // Normalize to objects for backward compatibility
      searchHistory = searchHistory.map(h => typeof h === 'string' ? { text: h, ts: Date.now(), source: 'local' } : h);
    } catch (e) { searchHistory = []; }
  }

  function saveLocalSearch(q) {
    if (!q) return;
    const low = q.toLowerCase();
    searchHistory = searchHistory.filter(h => h.text.toLowerCase() !== low);
    searchHistory.unshift({ text: q, ts: Date.now(), source: 'local' });
    if (searchHistory.length > MAX_HISTORY) searchHistory.length = MAX_HISTORY;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(searchHistory)); } catch (e) { console.error(e); }
  }

  function removeFromLocalHistory(q) {
    if (!q) return;
    const low = q.toLowerCase();
    searchHistory = searchHistory.filter(h => h.text.toLowerCase() !== low);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(searchHistory)); } catch (e) { console.error(e); }
  }

  function simpleFilter(list, query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return list.filter(item => item.text && item.text.toLowerCase().includes(q));
  }

  async function fetchServerCacheSuggestions(query, maxCount) {
    // your existing cache endpoint — keep it read-only
    try {
      const res = await fetch(`${BASE_URL}.cache_suggest_proxy.php?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const data = await res.json(); // expect array of phrases or objects
      if (!Array.isArray(data)) return [];
      // normalize
      const phrases = data.map(d => (typeof d === 'string' ? d : (d.phrase || d)) ).filter(Boolean);
      return [...new Set(phrases)].slice(0, maxCount);
    } catch (e) { return []; }
  }

  async function fetchDDGSuggestions(query, maxCount) {
    try {
      const res = await fetch(`${BASE_URL}search_proxy.php?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const data = await res.json();
      // DDG AC returns array of objects {phrase: '...'} or similar
      if (!Array.isArray(data)) return [];
      const phrases = data.map(i => (i.phrase || i).toString()).filter(Boolean);
      return [...new Set(phrases)].slice(0, maxCount);
    } catch (e) { return []; }
  }

  // Core merge pipeline
  async function getMergedSuggestions(query, settings, widgetId) {
    const { maxSuggestions, localSuggestionsCount } = settings;
    // increment fetch id for this specific widget
    const currentFetchId = (lastFetchIdByWidget.get(widgetId) || 0) + 1;
    lastFetchIdByWidget.set(widgetId, currentFetchId);
    const thisFetch = currentFetchId;

    // 1) local extension history (fast)
    const localMatches = simpleFilter(searchHistory, query).map(x => ({ text: typeof x === 'string' ? x : x.text || x }));

    // 2) browser history
    const browserHist = await ExtAPI.historySearch(query, 40);
    if (thisFetch !== lastFetchIdByWidget.get(widgetId)) return [];
    const bhMatches = browserHist.map(h => ({ text: h.text || h.raw && (h.raw.title || h.raw.url) || '', ts: h.ts, source: 'browser' }));

    // 3) bookmarks
    const bm = await ExtAPI.bookmarksSearch(query, 40);
    if (thisFetch !== lastFetchIdByWidget.get(widgetId)) return [];
    const bmMatches = bm.map(b => ({ text: b.text || b.raw && (b.raw.title || b.raw.url) || '', ts: b.ts, source: 'bookmark' }));

    // 4) server cache (your cache_suggest)
    const cacheMatches = await fetchServerCacheSuggestions(query, maxSuggestions);
    if (thisFetch !== lastFetchIdByWidget.get(widgetId)) return [];

    // Prepare local pool (localHistory + browser + bookmarks + cache)
    const localPool = [];

    // push local history entries first
    localMatches.forEach(t => localPool.push({ text: typeof t === 'string' ? t : t.text, source: 'local' }));
    // then browser history (sort by ts desc)
    bhMatches.sort((a,b) => (b.ts||0) - (a.ts||0)).forEach(h => localPool.push({ text: h.text, source: 'browser' }));
    // then bookmarks
    bmMatches.sort((a,b) => (b.ts||0) - (a.ts||0)).forEach(b => localPool.push({ text: b.text, source: 'bookmark' }));
    // then cache
    cacheMatches.forEach(c => localPool.push({ text: c, source: 'cache' }));

    // dedupe while preserving order
    const seen = new Set();
    const localUnique = [];
    for (const it of localPool) {
      const txt = (it.text || '').trim();
      if (!txt) continue;
      const canon = txt.toLowerCase();
      if (seen.has(canon)) continue;
      seen.add(canon);
      localUnique.push({ text: txt, source: it.source });
      if (localUnique.length >= localSuggestionsCount) break;
    }

    // Determine how many API (DDG) suggestions we need
    const apiNeeded = Math.max(0, maxSuggestions - localUnique.length);
    let apiSuggestions = [];
    if (apiNeeded > 0) {
      apiSuggestions = await fetchDDGSuggestions(query, apiNeeded * 2); // fetch a few extra to filter
      if (thisFetch !== lastFetchIdByWidget.get(widgetId)) return [];
      // filter out duplicates with localUnique
      const localSet = new Set(localUnique.map(s => s.text.toLowerCase()));
      apiSuggestions = apiSuggestions.filter(a => !localSet.has(a.toLowerCase())).slice(0, apiNeeded);
    }

    // final list: localUnique (already capped) + apiSuggestions (capped by max)
    const final = [...localUnique.map(x => ({ text: x.text, source: x.source })), ...apiSuggestions.map(x => ({ text: x, source: 'api' }))].slice(0, maxSuggestions);
    return final;
  }

  // Public widget object matching your original API (render/setup/others)
  return {
    STORAGE_KEY,
    MAX_HISTORY,
    barMeta: {
      id: 'search',
      name: 'Search',
      icon: 'mdi:magnify',
      testMode: false
    },
    render(settings = {}, widgetSize = '3x2') {
      const placeholder = settings.placeholder !== undefined ? settings.placeholder : '';
      const showIcon = settings.showSearchIcon !== false; // default to true

      // Parse widget size for responsive scaling (stocks pattern)
      const [width, height] = widgetSize.split('x').map(Number);

      // Size-based font adjustments
      let inputFontSize = '';
      let inputPadding = '';
      let buttonSize = '';

      if (width === 2) {
        inputFontSize = 'font-size: 12px;';
        inputPadding = 'padding: 8px 10px;';
        buttonSize = 'width: 30px; height: 30px; font-size: 16px;';
      } else if (height === 1) {
        inputPadding = 'padding-top: 6px; padding-bottom: 6px;';
      }

      // Use classes instead of IDs to support multiple search widgets
      // Note: search-suggestions will be created as a sibling to the widget, not inside container
      return `
            <div class="search-widget-container">
                <div class="search-blur-layer"></div>
                <div class="search-border-layer">
                    <input type="text" class="search-input" placeholder="${placeholder}" autocomplete="off" style="${inputFontSize}${inputPadding}">
                    ${showIcon ? `<button type="button" class="search-button" style="${buttonSize}"><span class="iconify" data-icon="mdi:magnify"></span></button>` : ''}
                </div>
            </div>
        `;
    },

    setup(element, editMode, settings = {}) {
      if (editMode) return;
      settings = Object.assign({}, defaults, settings);
      const widgetId = element.id || element.dataset.widgetId;

      const searchInput = element.querySelector('.search-input');
      const searchButton = element.querySelector('.search-button');
      if (!searchInput) return;

      // Create suggestions container as a sibling to the widget (outside grid container)
      let suggestionsContainer = document.getElementById(`search-suggestions-${widgetId}`);
      if (!suggestionsContainer) {
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = `search-suggestions-${widgetId}`;
        suggestionsContainer.className = 'search-suggestions search-suggestions-overlay suggestion-box';
        suggestionsContainer.style.display = 'none';
        document.body.appendChild(suggestionsContainer);
      }

      loadLocalHistory();

      // Search button click handler
      if (searchButton) {
        searchButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.performSearch(searchInput.value, settings.searchEngine);
        });
      }

      // Search button opacity effect based on input value
      const updateSearchButtonOpacity = () => {
        if (searchButton) {
          const hasText = searchInput.value.trim().length > 0;
          searchButton.style.opacity = hasText ? '1' : '0.3';
        }
      };

      // click-to-focus
      element.addEventListener('click', (e) => { if (e.target !== searchInput && !e.target.closest('.search-button')) searchInput.focus(); });

      let debounceTimer = null;
      searchInput.addEventListener('input', () => {
        updateSearchButtonOpacity(); // Update button opacity when typing
        const q = searchInput.value.trim();
        if (!settings.enableAutocomplete || !q) { this.hideSuggestions(suggestionsContainer); return; }
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const merged = await getMergedSuggestions(q, settings, widgetId);
          if (!merged || merged.length === 0) { this.hideSuggestions(suggestionsContainer); return; }
          this.showSuggestions(merged, suggestionsContainer, element);
        }, 150);
      });

      updateSearchButtonOpacity(); // Set initial state

      searchInput.addEventListener('focus', async () => {
        const q = searchInput.value.trim();
        if (settings.enableAutocomplete && q) {
          const merged = await getMergedSuggestions(q, settings, widgetId);
          if (merged && merged.length) this.showSuggestions(merged, suggestionsContainer, element);
        }
      });

      // keyboard navigation and selection
      searchInput.addEventListener('keydown', (e) => {
        const visible = suggestionsContainer.style.display !== 'none';
        const listItems = suggestionsContainer.querySelectorAll('.suggestion-item');
        if (e.key === 'ArrowDown' && visible) { e.preventDefault(); activeIndex = Math.min(listItems.length - 1, activeIndex + 1); this.updateActiveSuggestion(suggestionsContainer); }
        else if (e.key === 'ArrowUp' && visible) { e.preventDefault(); activeIndex = Math.max(0, activeIndex - 1); this.updateActiveSuggestion(suggestionsContainer); }
        else if (e.key === 'Enter') {
          if (visible && activeIndex >= 0 && currentSuggestions[activeIndex]) {
            e.preventDefault(); const val = currentSuggestions[activeIndex].text; searchInput.value = val; this.hideSuggestions(suggestionsContainer); this.performSearch(val, settings.searchEngine);
          } else { 
            e.preventDefault();
            this.performSearch(searchInput.value, settings.searchEngine); 
          }
        } else if (e.key === 'Escape' && visible) { this.hideSuggestions(suggestionsContainer); }
      });

      suggestionsContainer.addEventListener('mousedown', (e) => e.preventDefault());
      suggestionsContainer.addEventListener('click', (e) => {
        // Handle delete button click
        if (e.target.classList.contains('suggestion-delete')) {
          e.stopPropagation();
          e.preventDefault();
          const index = parseInt(e.target.dataset.index);
          const suggestion = currentSuggestions[index];

          if (suggestion) {
            // For local history, delete from localStorage
            if (suggestion.source === 'local') {
              this.removeFromLocalHistory(suggestion.text);
            }
            // For browser/bookmark history, we can't delete from browser API,
            // but we can remove from our display by refreshing suggestions
            // Refresh suggestions
            const query = searchInput.value.trim();
            if (query) {
              getMergedSuggestions(query, settings).then(merged => {
                if (merged && merged.length) {
                  this.showSuggestions(merged, suggestionsContainer, element);
                } else {
                  this.hideSuggestions(suggestionsContainer);
                }
              });
            }
          }
          return;
        }

        const item = e.target.closest('.suggestion-item');
        if (!item) return;
        const text = item.querySelector('.suggestion-text').textContent;
        searchInput.value = text;
        this.hideSuggestions(suggestionsContainer);
        this.performSearch(text, settings.searchEngine);
      });

      searchInput.addEventListener('blur', () => { setTimeout(() => this.hideSuggestions(suggestionsContainer), 200); });
      searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && suggestionsContainer.style.display === 'none') this.performSearch(searchInput.value, settings.searchEngine); });
    },

    positionContainer(container, widgetElement) {
      if (window.TrueTab.positionSuggestionBox) {
        window.TrueTab.positionSuggestionBox(container, widgetElement);
      }
    },

    showSuggestions(suggestions, container, widgetElement) {
      currentSuggestions = suggestions;
      activeIndex = -1;
      if (!suggestions || suggestions.length === 0) { this.hideSuggestions(container); return; }

      const getSourceLabel = (src) =>
        (src === 'local' || src === 'browser' || src === 'bookmark') ? 'history' :
        (src === 'cache') ? 'cache' : 'suggested';

      container.innerHTML = `<div class="suggestion-scroller">${suggestions.map((item, idx) => {
        const escapedText = this.escapeHtml(item.text);
        const sourceLabel = getSourceLabel(item.source);
        const isHistory = sourceLabel === 'history';
        const deleteBtn = isHistory ? `<button class="suggestion-delete" data-index="${idx}" data-source="${item.source}" title="Delete from history">×</button>` : '';
        return `<div class="suggestion-item" data-index="${idx}" data-val="${escapedText}"><div class="suggestion-text">${escapedText}</div><div class="suggestion-meta-wrapper">${deleteBtn}<div class="suggestion-meta">${sourceLabel}</div></div></div>`;
      }).join('')}</div>`;

      this.positionContainer(container, widgetElement);
      container.style.display = '';
    },

    hideSuggestions(container) { container.style.display = 'none'; container.innerHTML = ''; currentSuggestions = []; activeIndex = -1; },

    updateActiveSuggestion(container) {
      const items = container.querySelectorAll('.suggestion-item');
      items.forEach((it, i) => { it.classList.toggle('active', i === activeIndex); if (i === activeIndex) it.scrollIntoView({ block: 'nearest' }); });
    },

    performSearch(query, searchEngine) {
      query = (query || '').trim();
      if (!query) return;
      saveLocalSearch(query);
      if (query.startsWith('http://') || query.startsWith('https://')) {
        window.location.href = query;
      } else {
        const urls = {
          google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
          duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
        };
        // open in same tab (newtab) or new tab; adjust as you want
        window.location.href = urls[searchEngine] || urls.google;
      }
    },

    removeFromLocalHistory(query) {
      removeFromLocalHistory(query);
    },

    escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; },

    // Cleanup method to prevent memory leaks when widget is deleted
    cleanup(widgetId) {
      // Remove per-widget fetch ID
      lastFetchIdByWidget.delete(widgetId);

      // Remove suggestions container from DOM
      const suggestionsContainer = document.getElementById(`search-suggestions-${widgetId}`);
      if (suggestionsContainer) {
        suggestionsContainer.remove();
      }
    }
  };
})();

/*
Manifest snippet (add to your manifest.json):

"permissions": [
  "history",
  "bookmarks",
  "storage",
  "<all_urls>"  // or restrict to your domain + DDG if you prefer
],
"host_permissions": [
  "https://yourdomain.example/*"
],

Make sure BASE_URL is set (e.g. in a config file):
const BASE_URL = 'https://search.example.com/';

PHP notes:
- Keep your existing search_proxy.php. If you want a lightweight cache-suggest proxy endpoint for client-side cache fetches, create an endpoint that returns the cached phrases as an array (we call it .cache_suggest_proxy.php above). That can just read your .cache_suggest files and return the phrases JSON.

*/