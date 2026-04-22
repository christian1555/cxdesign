// bar-youtube.js — YouTube discovery search state
// 4-tab experience: Search · Trending · History · Saved
// Uses YouTube Data API v3 through PHP proxy, results in suggestion dropdown,
// expandable items with embedded YouTube player + comments.
// Layout: side-by-side player (left) + info (right), comments below.

window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules['bar-youtube'] = (function () {
  const BASE_URL = 'https://truetab-backend-930356305841.europe-west1.run.app/';

  const defaults = {
    placeholder: '',
    showSearchIcon: true,
    maxResults: 20,
    debounceMs: 300
  };

  // LocalStorage keys & limits
  const SK_HISTORY = 'yt_history';
  const SK_SAVED = 'yt_saved';
  const MAX_HISTORY = 50;
  const MAX_SAVED = 100;

  // Caches & per-widget state
  const cache = new Map();
  const TTL_MS = 5 * 60 * 1000;
  const lastFetchIdByWidget = new Map();
  const activeIndexByWidget = new Map();
  const searchResultsByWidget = new Map();
  const searchTokenByWidget = new Map();
  const activeTabByWidget = new Map();

  // Channel avatar color palette — deterministic from name
  const AVATAR_COLORS = [
    '#5B8DEF', '#E85D75', '#43B581', '#FAA61A', '#9B59B6',
    '#E67E22', '#1ABC9C', '#E74C3C', '#3498DB', '#2ECC71',
    '#F39C12', '#8E44AD', '#16A085', '#C0392B', '#2980B9'
  ];

  function avatarColor(name) {
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }

  function avatarInitial(name) {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    return words.length > 1
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  // ─── UTILITIES ───

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    const dy = Math.floor(h / 24); if (dy < 30) return dy + 'd ago';
    const mo = Math.floor(dy / 30); if (mo < 12) return mo + 'mo ago';
    return Math.floor(mo / 12) + 'y ago';
  }

  function icon(name, w = 16, h = 16) {
    return `<span class="iconify" data-icon="${name}" data-width="${w}" data-height="${h}"></span>`;
  }

  // Throttled icon scan to avoid excessive Iconify calls
  let scanTimer = null;
  function scanIcons(el) {
    if (!window.Iconify || !window.Iconify.scan) return;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => window.Iconify.scan(el), 50);
  }

  // ─── LOCAL STORAGE ───

  function sGet(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  }
  function sSet(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch {}
  }

  function videoRecord(v, extra) {
    return {
      videoId: v.videoId, title: v.title, channel: v.channel, channelId: v.channelId || '',
      thumbnail: v.thumbnail, thumbnailHigh: v.thumbnailHigh || '', duration: v.duration || '',
      viewCount: v.viewCount || '', publishedAt: v.publishedAt || '', description: v.description || '',
      likeCount: v.likeCount || '', commentCount: v.commentCount || '', ...extra
    };
  }

  function getHistory() { return sGet(SK_HISTORY); }
  function addToHistory(v) {
    const h = getHistory().filter(x => x.videoId !== v.videoId);
    h.unshift(videoRecord(v, { watchedAt: new Date().toISOString() }));
    if (h.length > MAX_HISTORY) h.length = MAX_HISTORY;
    sSet(SK_HISTORY, h);
  }
  function removeFromHistory(videoId) {
    sSet(SK_HISTORY, getHistory().filter(v => v.videoId !== videoId));
  }
  function clearAllHistory() { sSet(SK_HISTORY, []); }

  function getSaved() { return sGet(SK_SAVED); }
  function isSaved(videoId) { return getSaved().some(v => v.videoId === videoId); }
  function toggleSave(v) {
    const s = getSaved();
    const i = s.findIndex(x => x.videoId === v.videoId);
    if (i >= 0) { s.splice(i, 1); sSet(SK_SAVED, s); return false; }
    s.unshift(videoRecord(v, { savedAt: new Date().toISOString() }));
    if (s.length > MAX_SAVED) s.length = MAX_SAVED;
    sSet(SK_SAVED, s);
    return true;
  }

  // ─── API ───

  async function fetchSearch(query, cfg, widgetId, pageToken) {
    const ck = `search:${query}:${pageToken || ''}`;
    const cached = cache.get(ck);
    if (cached && (Date.now() - cached.ts) < TTL_MS)
      return { results: cached.results, nextPageToken: cached.nextPageToken, aborted: false };

    const fetchId = (lastFetchIdByWidget.get(widgetId) || 0) + 1;
    lastFetchIdByWidget.set(widgetId, fetchId);

    let url = `${BASE_URL}youtube.php?q=${encodeURIComponent(query)}&maxResults=${cfg.maxResults}`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return { results: [], nextPageToken: null, aborted: false };
      const data = await res.json();
      if (data.error) return { results: [], nextPageToken: null, aborted: false };
      if (fetchId !== lastFetchIdByWidget.get(widgetId)) return { results: [], nextPageToken: null, aborted: true };
      const results = data.results || [];
      const npt = data.nextPageToken || null;
      cache.set(ck, { ts: Date.now(), results, nextPageToken: npt });
      return { results, nextPageToken: npt, aborted: false };
    } catch {
      return { results: [], nextPageToken: null, aborted: false };
    }
  }

  async function fetchTrending(regionCode = 'US') {
    const ck = `trending:${regionCode}`;
    const cached = cache.get(ck);
    if (cached && (Date.now() - cached.ts) < TTL_MS) return cached.results;
    try {
      const res = await fetch(`${BASE_URL}youtube.php?trending=1&regionCode=${encodeURIComponent(regionCode)}&maxResults=25`);
      if (!res.ok) return [];
      const data = await res.json();
      const results = data.results || [];
      cache.set(ck, { ts: Date.now(), results });
      return results;
    } catch { return []; }
  }

  async function fetchComments(videoId) {
    try {
      const res = await fetch(`${BASE_URL}youtube.php?comments=${encodeURIComponent(videoId)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.comments || [];
    } catch { return []; }
  }

  async function fetchRelated(videoId) {
    const ck = `related:${videoId}`;
    const cached = cache.get(ck);
    if (cached && (Date.now() - cached.ts) < TTL_MS) return cached.results;
    try {
      const res = await fetch(`${BASE_URL}youtube.php?related=${encodeURIComponent(videoId)}&maxResults=12`);
      if (!res.ok) return [];
      const data = await res.json();
      const results = data.results || [];
      cache.set(ck, { ts: Date.now(), results });
      return results;
    } catch { return []; }
  }

  // ─── POSITIONING ───

  function positionBox(container, widgetEl) {
    if (window.TrueTab.positionSuggestionBox)
      window.TrueTab.positionSuggestionBox(container, widgetEl);
  }

  // ─── HTML BUILDERS ───

  function buildChannelAvatar(channelName, size) {
    const sz = size || 28;
    const fsz = sz < 24 ? 9 : (sz < 28 ? 10 : 12);
    const col = avatarColor(channelName);
    const init = avatarInitial(channelName);
    return `<div class="yt-channel-avatar" style="width:${sz}px;height:${sz}px;min-width:${sz}px;background:${col};font-size:${fsz}px">${init}</div>`;
  }

  function buildTabs(activeTab) {
    const tabs = [
      { id: 'search', ic: 'mdi:magnify', label: 'Search' },
      { id: 'trending', ic: 'mdi:fire', label: 'Trending' },
      { id: 'history', ic: 'mdi:history', label: 'History' },
      { id: 'saved', ic: 'mdi:bookmark-outline', label: 'Saved' }
    ];
    return `<div class="yt-tab-selector">${tabs.map(t =>
      `<div class="yt-tab${t.id === activeTab ? ' active' : ''}" data-tab="${t.id}">${icon(t.ic, 14, 14)}<span>${t.label}</span></div>`
    ).join('')}</div>`;
  }

  function buildVideoItem(it, idx, opts = {}) {
    const title = esc(it.title);
    const channel = esc(it.channel);
    const dur = it.duration || '';
    const views = it.viewCount ? it.viewCount + ' views' : '';
    const ago = timeAgo(it.publishedAt);
    const thumb = it.thumbnail || '';
    const saved = isSaved(it.videoId);
    const meta = [dur, views, ago].filter(Boolean).join(' \u00b7 ');
    const extra = opts.extraMeta || '';

    return `<div class="yt-suggestion-item" data-index="${idx}" data-video-id="${it.videoId}" data-expanded="false">
      <div class="yt-item-preview">
        ${buildChannelAvatar(it.channel)}
        <div class="yt-sugg-thumb-wrap">
          ${thumb ? `<img class="yt-sugg-thumb" src="${thumb}" loading="lazy">` : '<div class="yt-sugg-thumb placeholder"></div>'}
          ${dur ? `<span class="yt-duration-badge">${dur}</span>` : ''}
        </div>
        <div class="yt-sugg-text">
          <div class="yt-sugg-title">${title}</div>
          <div class="yt-sugg-channel">${channel}</div>
          <div class="yt-sugg-meta">${meta}${extra}</div>
        </div>
        <button class="yt-save-btn${saved ? ' saved' : ''}" data-video-id="${it.videoId}" title="${saved ? 'Saved' : 'Save'}">
          ${icon(saved ? 'mdi:bookmark' : 'mdi:bookmark-outline', 16, 16)}
        </button>
        ${opts.showRemove ? `<button class="yt-remove-btn" data-video-id="${it.videoId}" title="Remove">${icon('mdi:close', 13, 13)}</button>` : ''}
      </div>
      <div class="yt-item-details" style="display: none;" data-video-id="${it.videoId}">
        <div class="yt-detail-top">
          <div class="yt-player-container">
            <div class="yt-player-placeholder" data-video-id="${it.videoId}">
              <img class="yt-player-poster" src="${it.thumbnailHigh || thumb}" alt="">
              <button class="yt-play-btn" title="Play">${icon('mdi:play-circle', 40, 40)}</button>
            </div>
          </div>
          <div class="yt-detail-sidebar">
            <div class="yt-sidebar-title">Up Next</div>
            <div class="yt-sidebar-list" data-video-id="${it.videoId}" data-loaded="false">
              <div class="yt-sidebar-loading">${buildSidebarSkeleton(3)}</div>
            </div>
          </div>
        </div>
        <div class="yt-detail-info-full">
          <div class="yt-detail-title">${title}</div>
          <div class="yt-detail-info-row">
            <div class="yt-detail-channel-row">
              ${buildChannelAvatar(it.channel, 32)}
              <div class="yt-detail-channel-text">
                <span class="yt-detail-channel">${channel}</span>
                <div class="yt-detail-stats">
                  ${it.viewCount ? `<span>${icon('mdi:eye-outline', 12, 12)} ${it.viewCount} views</span>` : ''}
                  ${it.likeCount ? `<span>${icon('mdi:thumb-up-outline', 12, 12)} ${it.likeCount}</span>` : ''}
                  ${ago ? `<span>${icon('mdi:clock-outline', 12, 12)} ${ago}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="yt-detail-actions">
              <a href="https://www.youtube.com/watch?v=${it.videoId}" target="_blank" class="yt-detail-link yt-link-youtube">
                ${icon('mdi:youtube', 14, 14)} YouTube
              </a>
              ${it.channelId ? `<a href="https://www.youtube.com/channel/${it.channelId}" target="_blank" class="yt-detail-link yt-link-channel">
                ${icon('mdi:account-circle', 14, 14)} Channel
              </a>` : ''}
              <button class="yt-detail-link yt-detail-save-btn${saved ? ' saved' : ''}" data-video-id="${it.videoId}">
                ${icon(saved ? 'mdi:bookmark' : 'mdi:bookmark-outline', 14, 14)} ${saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
          ${it.description ? `<div class="yt-detail-description">${esc(it.description)}</div>` : ''}
        </div>
        <div class="yt-comments-section" data-video-id="${it.videoId}">
          <div class="yt-comments-title">Comments ${it.commentCount ? `(${it.commentCount})` : ''}</div>
          <div class="yt-comments-list" data-loaded="false"></div>
        </div>
      </div>
    </div>`;
  }

  function buildSidebarSkeleton(n = 3) {
    return Array(n).fill(
      `<div class="yt-sidebar-skeleton-item">
        <div class="yt-sidebar-skeleton-thumb"></div>
        <div class="yt-sidebar-skeleton-text">
          <div class="yt-sidebar-skeleton-title"></div>
          <div class="yt-sidebar-skeleton-channel"></div>
        </div>
      </div>`
    ).join('');
  }

  function buildSidebarItem(it) {
    const thumb = it.thumbnail || '';
    const dur = it.duration || '';
    return `<div class="yt-sidebar-item" data-video-id="${it.videoId}">
      <div class="yt-sidebar-thumb-wrap">
        ${thumb ? `<img class="yt-sidebar-thumb" src="${thumb}" loading="lazy">` : '<div class="yt-sidebar-thumb placeholder"></div>'}
        ${dur ? `<span class="yt-duration-badge">${dur}</span>` : ''}
      </div>
      <div class="yt-sidebar-text">
        <div class="yt-sidebar-item-title">${esc(it.title)}</div>
        <div class="yt-sidebar-item-channel">${esc(it.channel)}</div>
        <div class="yt-sidebar-item-meta">${it.viewCount ? it.viewCount + ' views' : ''} ${timeAgo(it.publishedAt) ? '\u00b7 ' + timeAgo(it.publishedAt) : ''}</div>
      </div>
    </div>`;
  }

  function buildSkeleton(n = 3) {
    return `<div class="yt-skeleton-container">${Array(n).fill(
      `<div class="yt-skeleton-item"><div class="yt-skeleton-avatar"></div><div class="yt-skeleton-thumb"></div><div class="yt-skeleton-content"><div class="yt-skeleton-title"></div><div class="yt-skeleton-channel"></div><div class="yt-skeleton-meta"></div></div></div>`
    ).join('')}</div>`;
  }

  function buildEmpty(ic, text, sub) {
    return `<div class="yt-empty-state">${icon(ic, 28, 28)}<div class="yt-empty-text">${text}</div>${sub ? `<div class="yt-empty-sub">${sub}</div>` : ''}</div>`;
  }

  // ─── PANEL CONTENT RENDERERS ───

  function panelSearch(widgetId) {
    const results = searchResultsByWidget.get(widgetId) || [];
    const token = searchTokenByWidget.get(widgetId) || null;
    if (!results.length) return buildEmpty('mdi:magnify', 'Search YouTube', 'Type to find videos');
    const items = results.map((it, i) => buildVideoItem(it, i)).join('');
    const more = token ? `<div class="yt-load-more-btn" data-page-token="${token}">Load More</div>` : '';
    return items + more;
  }

  function panelTrending(results) {
    if (!results || !results.length) return buildEmpty('mdi:fire', 'No trending videos available');
    return results.map((it, i) => buildVideoItem(it, i)).join('');
  }

  function panelHistory() {
    const h = getHistory();
    if (!h.length) return buildEmpty('mdi:history', 'No watch history', 'Videos you watch will appear here');
    return `<div class="yt-section-header"><span>Recently Watched</span><button class="yt-clear-history-btn">Clear All</button></div>`
      + h.map((it, i) => buildVideoItem(it, i, {
        extraMeta: it.watchedAt ? ` \u00b7 ${timeAgo(it.watchedAt)}` : '',
        showRemove: true
      })).join('');
  }

  function panelSaved() {
    const s = getSaved();
    if (!s.length) return buildEmpty('mdi:bookmark-outline', 'No saved videos', 'Bookmark videos to save them here');
    return `<div class="yt-section-header"><span>${s.length} Saved</span></div>`
      + s.map((it, i) => buildVideoItem(it, i)).join('');
  }

  // ─── DROPDOWN MANAGEMENT ───

  function showDropdown(container, widgetEl, tab, content) {
    container.innerHTML = buildTabs(tab) + `<div class="suggestion-scroller">${content}</div>`;
    positionBox(container, widgetEl);
    container.style.display = '';
    scanIcons(container);
  }

  function setPanel(container, tab, content) {
    const scroller = container.querySelector('.suggestion-scroller');
    if (!scroller) return;
    scroller.innerHTML = content;
    scroller.scrollTop = 0;
    container.querySelectorAll('.yt-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    scanIcons(container);
  }

  function hideDropdown(container, widgetId) {
    // Stop any playing iframes before clearing
    container.querySelectorAll('.yt-player-iframe').forEach(iframe => {
      iframe.src = '';
    });
    container.style.display = 'none';
    container.innerHTML = '';
    activeIndexByWidget.set(widgetId, -1);
  }

  function isOpen(container) {
    return container.style.display !== 'none';
  }

  // ─── EXPAND / COLLAPSE ───

  function expandItem(itemEl, container, widgetEl) {
    const videoId = itemEl.dataset.videoId;

    // Collapse all others
    container.querySelectorAll('.yt-suggestion-item[data-expanded="true"]').forEach(el => {
      if (el !== itemEl) collapseItem(el);
    });

    itemEl.dataset.expanded = 'true';
    itemEl.classList.add('expanded');
    const preview = itemEl.querySelector('.yt-item-preview');
    const details = itemEl.querySelector('.yt-item-details');
    if (preview) preview.style.display = 'none';
    if (details) details.style.display = 'block';

    // Track in history
    const video = findVideoData(videoId, widgetEl);
    if (video) addToHistory(video);

    // Play button → iframe
    const placeholder = details.querySelector('.yt-player-placeholder');
    if (placeholder) {
      const playBtn = placeholder.querySelector('.yt-play-btn');
      if (playBtn && !playBtn.dataset.bound) {
        playBtn.dataset.bound = 'true';
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          placeholder.parentElement.innerHTML = `<iframe class="yt-player-iframe"
            src="${BASE_URL}yt-player.php?v=${videoId}&autoplay=1"
            frameborder="0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen></iframe>`;
        });
      }
    }

    // Lazy-load suggested/related videos in sidebar
    const sidebarList = details.querySelector('.yt-sidebar-list');
    if (sidebarList && sidebarList.dataset.loaded === 'false') {
      sidebarList.dataset.loaded = 'true';
      fetchRelated(videoId).then(related => {
        if (!related.length) {
          sidebarList.innerHTML = '<div class="yt-sidebar-empty">No suggestions available</div>';
          return;
        }
        sidebarList.innerHTML = related.map(r => buildSidebarItem(r)).join('');
        scanIcons(sidebarList);
      });
    }

    // Lazy-load comments
    const commentsList = details.querySelector('.yt-comments-list');
    if (commentsList && commentsList.dataset.loaded === 'false') {
      commentsList.dataset.loaded = 'true';
      commentsList.innerHTML = '<div class="yt-comments-loading">Loading comments...</div>';
      fetchComments(videoId).then(comments => {
        if (!comments.length) {
          commentsList.innerHTML = '<div class="yt-comments-empty">No comments available</div>';
          return;
        }
        commentsList.innerHTML = comments.map(c => `<div class="yt-comment">
          <div class="yt-comment-header">
            ${c.authorImage ? `<img class="yt-comment-avatar" src="${c.authorImage}" loading="lazy">` : ''}
            <span class="yt-comment-author">${esc(c.author)}</span>
            <span class="yt-comment-time">${timeAgo(c.publishedAt)}</span>
          </div>
          <div class="yt-comment-text">${c.text}</div>
          ${c.likeCount > 0 ? `<div class="yt-comment-likes">${icon('mdi:thumb-up-outline', 10, 10)} ${c.likeCount}</div>` : ''}
        </div>`).join('');
        scanIcons(commentsList);
      });
    }

    itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    scanIcons(itemEl);
  }

  function collapseItem(itemEl) {
    itemEl.dataset.expanded = 'false';
    itemEl.classList.remove('expanded');
    const preview = itemEl.querySelector('.yt-item-preview');
    const details = itemEl.querySelector('.yt-item-details');
    if (preview) preview.style.display = '';
    if (details) {
      details.style.display = 'none';
      // Stop video if playing
      const iframe = details.querySelector('.yt-player-iframe');
      if (iframe) {
        const vid = details.dataset.videoId;
        const thumb = itemEl.querySelector('.yt-sugg-thumb');
        iframe.parentElement.innerHTML = `<div class="yt-player-placeholder" data-video-id="${vid}">
          <img class="yt-player-poster" src="${thumb ? thumb.src : ''}" alt="">
          <button class="yt-play-btn" title="Play">${icon('mdi:play-circle', 40, 40)}</button>
        </div>`;
      }
    }
  }

  // Find video data from any source (search results, trending cache, localStorage)
  function findVideoData(videoId, widgetEl) {
    const wid = widgetEl.id || widgetEl.dataset.widgetId;
    // Search results
    const sr = searchResultsByWidget.get(wid) || [];
    let v = sr.find(r => r.videoId === videoId);
    if (v) return v;
    // Trending cache
    for (const [, cached] of cache) {
      if (Array.isArray(cached.results)) {
        v = cached.results.find(r => r.videoId === videoId);
        if (v) return v;
      }
    }
    // History & saved
    v = getHistory().find(r => r.videoId === videoId);
    if (v) return v;
    v = getSaved().find(r => r.videoId === videoId);
    return v || null;
  }

  // Update all save button visuals for a given videoId
  function refreshSaveButtons(container, videoId) {
    const saved = isSaved(videoId);
    container.querySelectorAll(`.yt-save-btn[data-video-id="${videoId}"]`).forEach(btn => {
      btn.classList.toggle('saved', saved);
      btn.title = saved ? 'Saved' : 'Save';
      btn.innerHTML = icon(saved ? 'mdi:bookmark' : 'mdi:bookmark-outline', 16, 16);
    });
    container.querySelectorAll(`.yt-detail-save-btn[data-video-id="${videoId}"]`).forEach(btn => {
      btn.classList.toggle('saved', saved);
      btn.innerHTML = `${icon(saved ? 'mdi:bookmark' : 'mdi:bookmark-outline', 14, 14)} ${saved ? 'Saved' : 'Save'}`;
    });
    scanIcons(container);
  }

  // ─── MODULE INTERFACE ───

  return {
    barMeta: {
      id: 'bar-youtube',
      name: 'YouTube',
      icon: 'mdi:youtube',
      testMode: false
    },

    render(settings = {}) {
      const cfg = { ...defaults, ...settings };
      return `<div class="search-widget-container">
        <div class="search-blur-layer"></div>
        <div class="search-border-layer">
          <input type="text" class="search-input" placeholder="${esc(cfg.placeholder)}" autocomplete="off">
          ${cfg.showSearchIcon ? `<button type="button" class="search-button">${icon('mdi:youtube')}</button>` : ''}
        </div>
      </div>`;
    },

    setup(element, editMode, settings = {}) {
      if (editMode) return;
      const cfg = { ...defaults, ...settings };
      const widgetId = element.id || element.dataset.widgetId;
      const inputEl = element.querySelector('.search-input');
      const btnEl = element.querySelector('.search-button');
      if (!inputEl) return;

      // Create suggestion container on body
      let container = document.getElementById(`yt-search-suggestions-${widgetId}`);
      if (!container) {
        container = document.createElement('div');
        container.id = `yt-search-suggestions-${widgetId}`;
        container.className = 'yt-search-suggestions yt-search-suggestions-overlay suggestion-box';
        container.style.display = 'none';
        document.body.appendChild(container);
      }

      searchResultsByWidget.set(widgetId, []);
      searchTokenByWidget.set(widgetId, null);
      activeIndexByWidget.set(widgetId, -1);
      activeTabByWidget.set(widgetId, 'search');

      // Button opacity
      const updateBtn = () => { if (btnEl) btnEl.style.opacity = inputEl.value.trim() ? '1' : '0.3'; };
      updateBtn();
      inputEl.addEventListener('input', updateBtn);

      // Click-to-focus
      element.addEventListener('click', (e) => {
        if (e.target !== inputEl && !e.target.closest('.search-button')) inputEl.focus();
      });

      let debounce = null;

      // Determine default tab when no query
      const defaultTab = () => getHistory().length > 0 ? 'history' : 'trending';

      // Switch to a tab (updates panel content)
      const switchToTab = async (tab) => {
        activeTabByWidget.set(widgetId, tab);
        if (tab === 'search') {
          setPanel(container, tab, panelSearch(widgetId));
        } else if (tab === 'trending') {
          setPanel(container, tab, buildSkeleton(4));
          const results = await fetchTrending();
          if (activeTabByWidget.get(widgetId) === 'trending') {
            setPanel(container, tab, panelTrending(results));
          }
        } else if (tab === 'history') {
          setPanel(container, tab, panelHistory());
        } else if (tab === 'saved') {
          setPanel(container, tab, panelSaved());
        }
        positionBox(container, element);
      };

      // ─── FOCUS: Open dropdown ───
      inputEl.addEventListener('focus', () => {
        if (isOpen(container)) return;
        const q = inputEl.value.trim();
        if (q && (searchResultsByWidget.get(widgetId) || []).length > 0) {
          const tab = 'search';
          activeTabByWidget.set(widgetId, tab);
          showDropdown(container, element, tab, panelSearch(widgetId));
        } else if (q) {
          activeTabByWidget.set(widgetId, 'search');
          showDropdown(container, element, 'search', buildSkeleton(3));
          clearTimeout(debounce);
          debounce = setTimeout(async () => {
            const response = await fetchSearch(q, cfg, widgetId);
            if (response.aborted) return;
            searchResultsByWidget.set(widgetId, response.results);
            searchTokenByWidget.set(widgetId, response.nextPageToken);
            if (!response.results.length) {
              setPanel(container, 'search', buildEmpty('mdi:youtube', 'No videos found', `No results for "${esc(q)}"`));
            } else {
              setPanel(container, 'search', panelSearch(widgetId));
            }
            positionBox(container, element);
          }, cfg.debounceMs);
        } else {
          const dt = defaultTab();
          activeTabByWidget.set(widgetId, dt);
          showDropdown(container, element, dt, '');
          switchToTab(dt);
        }
      });

      // ─── INPUT: Search or switch tabs ───
      inputEl.addEventListener('input', () => {
        const q = inputEl.value.trim();

        if (!q) {
          searchResultsByWidget.set(widgetId, []);
          searchTokenByWidget.set(widgetId, null);
          if (isOpen(container)) {
            const dt = defaultTab();
            switchToTab(dt);
          }
          return;
        }

        if (!isOpen(container)) {
          showDropdown(container, element, 'search', buildSkeleton(3));
        }

        // Switch to search tab if not already
        if (activeTabByWidget.get(widgetId) !== 'search') {
          activeTabByWidget.set(widgetId, 'search');
          container.querySelectorAll('.yt-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'search'));
        }

        setPanel(container, 'search', buildSkeleton(3));

        clearTimeout(debounce);
        debounce = setTimeout(async () => {
          const response = await fetchSearch(q, cfg, widgetId);
          if (response.aborted) return;

          searchResultsByWidget.set(widgetId, response.results);
          searchTokenByWidget.set(widgetId, response.nextPageToken);
          activeIndexByWidget.set(widgetId, -1);

          if (!response.results.length) {
            setPanel(container, 'search', buildEmpty('mdi:youtube', 'No videos found', `No results for "${esc(q)}"`));
          } else {
            setPanel(container, 'search', panelSearch(widgetId));
          }
          positionBox(container, element);
        }, cfg.debounceMs);
      });

      // ─── SEARCH BUTTON: Open YouTube in new tab ───
      if (btnEl) {
        btnEl.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const q = inputEl.value.trim();
          if (q) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank');
        });
      }

      // ─── KEYBOARD ───
      inputEl.addEventListener('keydown', (e) => {
        if (!isOpen(container)) return;

        if (activeTabByWidget.get(widgetId) === 'search') {
          const list = searchResultsByWidget.get(widgetId) || [];
          const max = list.length - 1;
          let idx = activeIndexByWidget.get(widgetId) ?? -1;

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            idx = Math.min(max, idx + 1);
            activeIndexByWidget.set(widgetId, idx);
            updateActiveItem(container, widgetId);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            idx = Math.max(0, idx - 1);
            activeIndexByWidget.set(widgetId, idx);
            updateActiveItem(container, widgetId);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (idx >= 0) {
              const items = container.querySelectorAll('.yt-suggestion-item');
              if (items[idx]) items[idx].click();
            } else {
              const q = inputEl.value.trim();
              if (q) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank');
            }
          }
        }

        if (e.key === 'Escape') {
          const expanded = container.querySelector('.yt-suggestion-item[data-expanded="true"]');
          if (expanded) collapseItem(expanded);
          else hideDropdown(container, widgetId);
        }
      });

      function updateActiveItem(c, wid) {
        const idx = activeIndexByWidget.get(wid) ?? -1;
        c.querySelectorAll('.yt-suggestion-item').forEach((el, i) => {
          el.classList.toggle('active', i === idx);
          if (i === idx) el.scrollIntoView({ block: 'nearest' });
        });
      }

      // ─── CONTAINER EVENT DELEGATION ───
      container.addEventListener('mousedown', (e) => e.preventDefault());
      container.addEventListener('click', (e) => {

        // Tab click
        const tab = e.target.closest('.yt-tab');
        if (tab) {
          const tabId = tab.dataset.tab;
          if (tabId && tabId !== activeTabByWidget.get(widgetId)) {
            switchToTab(tabId);
          }
          return;
        }

        // Save button (preview row)
        const saveBtn = e.target.closest('.yt-save-btn');
        if (saveBtn) {
          e.stopPropagation();
          const vid = saveBtn.dataset.videoId;
          const video = findVideoData(vid, element);
          if (video) { toggleSave(video); refreshSaveButtons(container, vid); }
          return;
        }

        // Save button (expanded detail)
        const detailSaveBtn = e.target.closest('.yt-detail-save-btn');
        if (detailSaveBtn) {
          e.stopPropagation();
          const vid = detailSaveBtn.dataset.videoId;
          const video = findVideoData(vid, element);
          if (video) { toggleSave(video); refreshSaveButtons(container, vid); }
          return;
        }

        // Remove from history
        const removeBtn = e.target.closest('.yt-remove-btn');
        if (removeBtn) {
          e.stopPropagation();
          removeFromHistory(removeBtn.dataset.videoId);
          if (activeTabByWidget.get(widgetId) === 'history') {
            setPanel(container, 'history', panelHistory());
            positionBox(container, element);
          }
          return;
        }

        // Clear all history
        if (e.target.closest('.yt-clear-history-btn')) {
          e.stopPropagation();
          clearAllHistory();
          setPanel(container, 'history', panelHistory());
          positionBox(container, element);
          return;
        }

        // Load More
        const loadMoreBtn = e.target.closest('.yt-load-more-btn');
        if (loadMoreBtn) {
          e.stopPropagation();
          const token = loadMoreBtn.dataset.pageToken;
          if (!token) return;
          loadMoreBtn.textContent = 'Loading...';
          loadMoreBtn.style.opacity = '0.5';
          const q = inputEl.value.trim();
          if (!q) return;
          fetchSearch(q, cfg, widgetId, token).then(response => {
            if (response.aborted) return;
            if (response.results.length) {
              const existing = searchResultsByWidget.get(widgetId) || [];
              const updated = [...existing, ...response.results];
              searchResultsByWidget.set(widgetId, updated);
              searchTokenByWidget.set(widgetId, response.nextPageToken);
              setPanel(container, 'search', panelSearch(widgetId));
              positionBox(container, element);
            } else {
              loadMoreBtn.textContent = 'No more results';
              loadMoreBtn.style.cursor = 'default';
            }
          });
          return;
        }

        // Sidebar suggested video click → open on YouTube
        const sidebarItem = e.target.closest('.yt-sidebar-item');
        if (sidebarItem) {
          e.stopPropagation();
          const vid = sidebarItem.dataset.videoId;
          if (vid) window.open(`https://www.youtube.com/watch?v=${vid}`, '_blank');
          return;
        }

        // Links and play button — pass through
        if (e.target.closest('a') || e.target.closest('.yt-play-btn')) return;

        // Video item expand/collapse
        const itemEl = e.target.closest('.yt-suggestion-item');
        if (itemEl) {
          if (itemEl.dataset.expanded === 'true') collapseItem(itemEl);
          else expandItem(itemEl, container, element);
        }
      });

      // ─── CLOSE ON OUTSIDE CLICK ───
      document.addEventListener('click', (e) => {
        if (isOpen(container) && !container.contains(e.target) && !element.contains(e.target)) {
          hideDropdown(container, widgetId);
        }
      });
    },

    cleanup(widgetId) {
      lastFetchIdByWidget.delete(widgetId);
      activeIndexByWidget.delete(widgetId);
      searchResultsByWidget.delete(widgetId);
      searchTokenByWidget.delete(widgetId);
      activeTabByWidget.delete(widgetId);
      const c = document.getElementById(`yt-search-suggestions-${widgetId}`);
      if (c) c.remove();
    }
  };
})();
