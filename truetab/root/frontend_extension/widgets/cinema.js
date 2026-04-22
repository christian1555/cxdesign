// cinema.js — "CineSearch" widget
// TMDb search + IMDb link via TMDb imdb_id + OMDb stars + TMDb watch providers icons

window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules.cinema = (function () {
  const BASE_URL = 'https://truetab-backend-930356305841.europe-west1.run.app/';

  const defaults = {
    placeholder: '',
    maxSuggestions: 10,
    initialResults: 5,
    loadMoreIncrement: 5,
    debounceMs: 200,
    showSearchIcon: true,
    showPoster: true,
    showYear: true,
    showTypeBadge: true,
    showImdbRating: true,
    showProviders: true,
    maxProviderIcons: 8,
    openTarget: 'imdb',
    language: 'en-US',
    country: 'DK'
  };

  const cache = new Map();
  const TTL_MS = 5 * 60 * 1000;
  const lastFetchIdByWidget = new Map();
  const activeIndexByWidget = new Map();
  const suggestionsByWidget = new Map();
  const displayCountByWidget = new Map();
  const currentPageByWidget = new Map();
  const totalPagesByWidget = new Map();

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  }

  function getLocalStreamingIcon(providerName) {
    if (!providerName) return null;

    // Normalize: lowercase, remove non-alphanumeric
    const normalized = providerName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const mappings = {
      'netflix': 'netflix.png',
      'netflixkids': 'netflixkids.png',
      'amazonprimevideo': 'primevideo.png',
      'primevideo': 'primevideo.png',
      'appletv': 'appletv.png',
      'appletvplus': 'appletv.png',
      'disneyplus': 'disneyplus.png',
      'disney': 'disneyplus.png',
      'hbomax': 'hbomax.png',
      'hbo': 'hbomax.png',
      'crunchyroll': 'crunchyroll.png',
      'youtubepremium': 'youtubepremium.png',
      'youtube': 'youtubepremium.png',
      'allente': 'allente.png',
      'hayu': 'hayu.png',
      'viaplay': 'viaplay.png',
      'tv2play': 'tv2play.png',
      'rakutentv': 'rakutentv.png',
      'rakuten': 'rakutentv.png',
      'filmstriben': 'filmstriben.png',
      'sfanytime': 'sfanytime.png',
      'drtv': 'drtv.png',
      'skyshowtime': 'skyshowtime.png',
      'blockbuster': 'blockbuster.png',
      'bloodstream': 'bloodstream.png',
      'britbox': 'britbox.png',
      'broadwayhd': 'broadwayhd.png',
      'cultpix': 'cultpix.png',
      'curiositystream': 'curiositystream.png',
      'dafilmscom': 'dafilms.com.png',
      'dekkoo': 'dekkoo.png',
      'docsville': 'docsville.png',
      'filmbox': 'filmbox+.png',
      'filmboxplus': 'filmbox+.png',
      'filmzie': 'filmzie.png',
      'foundtv': 'foundtv.png',
      'googleplay': 'googleplay.png',
      'guidedoc': 'guidedoc.png',
      'hoichoi': 'hoichoi.png',
      'joltfilm': 'joltfilm.png',
      'justwatch': 'justwatch.png',
      'kableone': 'kableone.png',
      'kocowaplus': 'kocowa+.png',
      'kocowa': 'kocowa+.png',
      'magellantv': 'magellantv.png',
      'mubi': 'mubi.png',
      'nordiskfilm': 'nordiskfilm+.png',
      'nordiskfilmplus': 'nordiskfilm+.png',
      'plex': 'plex.png',
      'plutotv': 'plutotv.png',
      'shortstvamazonchannel': 'shortstvamazonchannel.png',
      'sunnxt': 'sunnxt.png',
      'takflix': 'takflix.png',
      'tentkotta': 'tentkotta.png',
      'wowpresentsplus': 'wowpresentsplus.png',
      'wowpresents': 'wowpresentsplus.png'
    };

    return mappings[normalized] || null;
  }

  async function fetchSuggestions(q, cfg, widgetId, page = 1) {
    const now = Date.now();
    const cacheKey = `${q}:${page}`;
    const cached = cache.get(cacheKey);
    if (cached && (now - cached.ts) < TTL_MS) {
      return {
        results: cached.results,
        fetchId: lastFetchIdByWidget.get(widgetId),
        aborted: false,
        page: cached.page,
        totalPages: cached.totalPages
      };
    }

    const fetchId = (lastFetchIdByWidget.get(widgetId) || 0) + 1;
    lastFetchIdByWidget.set(widgetId, fetchId);

    // Fetch more results (up to 50) to support "load more"
    const fetchLimit = Math.max(cfg.maxSuggestions, 50);
    const url =
      `${BASE_URL}cinema.php?q=${encodeURIComponent(q)}` +
      `&limit=${fetchLimit}` +
      `&page=${page}` +
      `&lang=${encodeURIComponent(cfg.language)}` +
      `&country=${encodeURIComponent(cfg.country)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return { results: [], fetchId, aborted: false, page: 1, totalPages: 1 };
      const data = await res.json();
      if (data.error) return { results: [], fetchId, aborted: false, page: 1, totalPages: 1 };

      // Check if this fetch was superseded
      if (fetchId !== lastFetchIdByWidget.get(widgetId)) {
        return { results: [], fetchId, aborted: true, page: 1, totalPages: 1 };
      }

      const results = (data.results || []);
      const totalPages = data.total_pages || 1;
      const currentPage = data.page || page;

      // Debug: Log OMDB debug info from backend
      if (data.debug) {
        console.log('🔍 Cinema OMDB Debug Info:', data.debug);
      }

      // Debug: Log first result to see what data we're getting
      if (results.length > 0) {
        console.log('Cinema search results sample:', {
          title: results[0].title,
          imdb_id: results[0].imdb_id,
          imdb_rating: results[0].imdb_rating,
          overview: results[0].overview ? results[0].overview.substring(0, 50) + '...' : 'No overview'
        });
      }

      cache.set(cacheKey, { ts: now, results, totalPages, page: currentPage });
      return { results, fetchId, aborted: false, page: currentPage, totalPages };
    } catch (err) {
      console.error('Cinema search error:', err);
      return { results: [], fetchId, aborted: false, page: 1, totalPages: 1 };
    }
  }

  function buildOpenUrl(item, target) {
    if (target === 'imdb' && item.imdb_id) {
      return `https://www.imdb.com/title/${item.imdb_id}/`;
    }
    if (target === 'tmdb' && item.tmdb_id) {
      return item.media_type === 'tv'
        ? `https://www.themoviedb.org/tv/${item.tmdb_id}`
        : `https://www.themoviedb.org/movie/${item.tmdb_id}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(item.title || '')}`;
  }

  function positionContainer(container, widgetEl) {
    if (window.TrueTab.positionSuggestionBox) {
      window.TrueTab.positionSuggestionBox(container, widgetEl);
    }
  }

  function renderProviders(it, cfg) {
    if (!cfg.showProviders) return '';

    const list = Array.isArray(it.providers) ? it.providers : [];
    if (!list.length) {
      return `<div class="cinema-sugg-providers unknown">Unknown</div>`;
    }

    const take = list.slice(0, cfg.maxProviderIcons);
    const extra = list.length - take.length;

    const icons = take.map(p => {
      const title = escapeHtml(p.name || '');
      const localIcon = getLocalStreamingIcon(p.name);

      let iconSrc;
      if (localIcon) {
        iconSrc = `streaming_icon/${localIcon}`;
      } else if (p.logo) {
        iconSrc = p.logo;
      } else {
        return '';
      }

      return `<img class="cinema-provider-icon" src="${iconSrc}" title="${title}" alt="${title}" onerror="this.style.display='none'">`;
    }).join('');

    const more = extra > 0 ? `<div class="cinema-provider-more">+${extra}</div>` : '';

    return `<div class="cinema-sugg-providers">${icons}${more}</div>`;
  }

  /**
   * Build organized detail sections for the expanded view
   */
  function buildDetailSections(it, cfg) {
    const sections = [];
    const details = it.details || {};

    // Section 1: Overview
    if (it.overview) {
      const taglineHtml = details.tagline
        ? `<div class="cinema-detail-tagline">"${escapeHtml(details.tagline)}"</div>`
        : '';

      sections.push(`
        <div class="cinema-detail-section">
          <div class="cinema-detail-section-title">Overview</div>
          <div class="cinema-detail-description">${escapeHtml(it.overview)}</div>
          ${taglineHtml}
        </div>
      `);
    }

    // Section 2: Details (runtime, genres, etc.)
    const detailItems = [];

    if (it.media_type === 'movie' && details.runtime) {
      const hours = Math.floor(details.runtime / 60);
      const mins = details.runtime % 60;
      detailItems.push(`<div class="cinema-detail-item"><span class="label">Runtime:</span> ${hours}h ${mins}m</div>`);
    }

    if (it.media_type === 'tv') {
      if (details.number_of_seasons) {
        detailItems.push(`<div class="cinema-detail-item"><span class="label">Seasons:</span> ${details.number_of_seasons}</div>`);
      }
      if (details.number_of_episodes) {
        detailItems.push(`<div class="cinema-detail-item"><span class="label">Episodes:</span> ${details.number_of_episodes}</div>`);
      }
      if (details.episode_run_time && details.episode_run_time.length > 0) {
        detailItems.push(`<div class="cinema-detail-item"><span class="label">Episode Length:</span> ${details.episode_run_time[0]} min</div>`);
      }
      if (details.in_production !== null && details.in_production !== undefined) {
        const statusText = details.in_production ? 'In Production' : 'Ended';
        detailItems.push(`<div class="cinema-detail-item"><span class="label">Status:</span> ${statusText}</div>`);
      } else if (details.status) {
        detailItems.push(`<div class="cinema-detail-item"><span class="label">Status:</span> ${details.status}</div>`);
      }
    }

    if (details.genres && details.genres.length > 0) {
      const genreNames = details.genres.slice(0, 4).map(g => g.name).join(', ');
      detailItems.push(`<div class="cinema-detail-item"><span class="label">Genres:</span> ${genreNames}</div>`);
    }

    if (details.vote_average) {
      const tmdbRating = Math.round(details.vote_average * 10) / 10;
      detailItems.push(`
        <div class="cinema-detail-item">
          <span class="label">TMDB Rating:</span>
          <span class="cinema-tmdb-rating">${tmdbRating}/10</span>
        </div>
      `);
    }

    if (it.media_type === 'movie' && details.budget && details.budget > 0) {
      const budgetM = (details.budget / 1000000).toFixed(1);
      detailItems.push(`<div class="cinema-detail-item"><span class="label">Budget:</span> $${budgetM}M</div>`);
    }

    if (it.media_type === 'movie' && details.revenue && details.revenue > 0) {
      const revenueM = (details.revenue / 1000000).toFixed(1);
      detailItems.push(`<div class="cinema-detail-item"><span class="label">Revenue:</span> $${revenueM}M</div>`);
    }

    if (detailItems.length > 0) {
      sections.push(`
        <div class="cinema-detail-section">
          <div class="cinema-detail-section-title">Details</div>
          <div class="cinema-detail-grid">
            ${detailItems.join('')}
          </div>
        </div>
      `);
    }

    // Section 3: Cast
    if (details.cast && details.cast.length > 0) {
      const castHtml = details.cast.map(person => {
        const photo = person.profile_path
          ? `<img src="https://image.tmdb.org/t/p/w45${person.profile_path}" alt="${escapeHtml(person.name)}" class="cinema-person-photo">`
          : `<div class="cinema-person-photo placeholder">${person.name.charAt(0)}</div>`;

        return `
          <div class="cinema-person-card">
            ${photo}
            <div class="cinema-person-info">
              <div class="cinema-person-name">${escapeHtml(person.name)}</div>
              <div class="cinema-person-role">${escapeHtml(person.character || '')}</div>
            </div>
          </div>
        `;
      }).join('');

      sections.push(`
        <div class="cinema-detail-section">
          <div class="cinema-detail-section-title">Cast</div>
          <div class="cinema-person-grid">
            ${castHtml}
          </div>
        </div>
      `);
    }

    // Section 4: Crew (Directors/Creators)
    if (details.crew && details.crew.length > 0) {
      const crewHtml = details.crew.map(person => {
        return `
          <div class="cinema-crew-item">
            <span class="cinema-crew-name">${escapeHtml(person.name)}</span>
            <span class="cinema-crew-job">${escapeHtml(person.job || 'Creator')}</span>
          </div>
        `;
      }).join('');

      sections.push(`
        <div class="cinema-detail-section cinema-detail-section-compact">
          <div class="cinema-detail-section-title">${it.media_type === 'tv' ? 'Created By' : 'Directed By'}</div>
          <div class="cinema-crew-list">
            ${crewHtml}
          </div>
        </div>
      `);
    }

    // Section 5: Production Companies
    if (details.production_companies && details.production_companies.length > 0) {
      const companiesHtml = details.production_companies.map(company => {
        const logo = company.logo_path
          ? `<img src="https://image.tmdb.org/t/p/w92${company.logo_path}" alt="${escapeHtml(company.name)}" class="cinema-company-logo">`
          : `<span class="cinema-company-name-text">${escapeHtml(company.name)}</span>`;

        return `<div class="cinema-company-item">${logo}</div>`;
      }).join('');

      sections.push(`
        <div class="cinema-detail-section cinema-detail-section-compact">
          <div class="cinema-detail-section-title">Production</div>
          <div class="cinema-company-grid">
            ${companiesHtml}
          </div>
        </div>
      `);
    }

    // Section 6: Streaming Availability
    const providers = renderProviders(it, cfg);
    if (providers) {
      sections.push(`
        <div class="cinema-detail-section">
          <div class="cinema-detail-section-title">Available On</div>
          <div class="cinema-detail-providers-display">
            ${providers}
          </div>
        </div>
      `);
    }

    // Section 7: Links
    const links = [];
    if (it.imdb_id) {
      links.push(`<a href="https://www.imdb.com/title/${it.imdb_id}/" target="_blank" class="cinema-detail-link cinema-link-imdb">
        <span class="iconify" data-icon="simple-icons:imdb"></span> View on IMDb
      </a>`);
    }
    if (it.tmdb_id) {
      const tmdbUrl = it.media_type === 'tv'
        ? `https://www.themoviedb.org/tv/${it.tmdb_id}`
        : `https://www.themoviedb.org/movie/${it.tmdb_id}`;
      links.push(`<a href="${tmdbUrl}" target="_blank" class="cinema-detail-link cinema-link-tmdb">
        <span class="iconify" data-icon="simple-icons:themoviedatabase"></span> View on TMDB
      </a>`);
    }

    if (links.length > 0) {
      sections.push(`
        <div class="cinema-detail-section">
          <div class="cinema-detail-links">
            ${links.join('')}
          </div>
        </div>
      `);
    }

    return sections.join('');
  }


  function renderSuggestions(list, container, widgetEl, cfg, isLoadMore = false) {
    const widgetId = widgetEl.id || widgetEl.dataset.widgetId;
    const currentPage = currentPageByWidget.get(widgetId) || 1;
    const totalPages = totalPagesByWidget.get(widgetId) || 1;
    const hasMore = currentPage < totalPages;

    const itemsHtml = list.map((it, idx) => {
      const title = escapeHtml(it.title);
      const year = it.year ? ` (${escapeHtml(it.year)})` : '';
      const type = it.media_type === 'tv' ? 'TV' : 'MOVIE';

      const poster = (cfg.showPoster && it.poster)
        ? `<img class="cinema-sugg-poster" src="${it.poster}" onerror="this.style.display='none'"/>`
        : `<div class="cinema-sugg-poster placeholder"></div>`;

      // Rating - inline with title
      let ratingValue = (it.imdb_rating && it.imdb_rating !== 'N/A')
        ? escapeHtml(it.imdb_rating)
        : '<span style="font-size: 9px; opacity: 0.5;">N/A</span>';

      const rating = cfg.showImdbRating
        ? `<span class="cinema-sugg-rating-inline">
             <span class="iconify" data-icon="mdi:star"></span>${ratingValue}
           </span>`
        : '';

      // Badge - inline with title and rating
      const badge = cfg.showTypeBadge
        ? `<span class="cinema-sugg-type">${type}</span>`
        : '';

      // Description with ellipsis
      const description = it.overview
        ? `<div class="cinema-sugg-description">${escapeHtml(it.overview)}</div>`
        : '';

      const providers = renderProviders(it, cfg);

      // Build comprehensive detail sections
      const detailSections = buildDetailSections(it, cfg);

      return `
        <div class="cinema-suggestion-item" data-index="${idx}" data-expanded="false">
            <div class="cinema-item-preview">
                ${poster}
                <div class="cinema-sugg-text">
                    <div class="cinema-sugg-title-row">
                        <span class="cinema-sugg-title">${title}${cfg.showYear ? year : ''}</span>
                        ${rating}
                        ${badge}
                    </div>
                    ${description}
                </div>
                <div class="cinema-sugg-right">
                    ${providers}
                </div>
            </div>
            <div class="cinema-item-details" style="display: none;">
                ${detailSections}
            </div>
        </div>
      `;
    }).join('');

    // Add "Load More" button if there are more pages
    const loadMoreButton = hasMore
      ? `<div class="cinema-load-more-btn" data-widget-id="${widgetId}">
           Load More (Page ${currentPage + 1} of ${totalPages})
         </div>`
      : '';

    // Append or replace content (always inside .suggestion-scroller child)
    if (isLoadMore) {
      const scroller = container.querySelector('.suggestion-scroller');
      const oldBtn = scroller.querySelector('.cinema-load-more-btn');
      if (oldBtn) oldBtn.remove();
      scroller.insertAdjacentHTML('beforeend', itemsHtml + loadMoreButton);
    } else {
      container.innerHTML = `<div class="suggestion-scroller">${itemsHtml}${loadMoreButton}</div>`;
    }

    positionContainer(container, widgetEl);
    container.style.display = '';

    // Attach load more button click handler
    if (hasMore) {
      const loadMoreBtn = container.querySelector('.cinema-load-more-btn');
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async (e) => {
          e.stopPropagation();

          // Show loading state
          loadMoreBtn.textContent = 'Loading...';
          loadMoreBtn.style.opacity = '0.5';

          const nextPage = currentPage + 1;
          const inputEl = widgetEl.querySelector('.cinema-search-input');
          const q = inputEl ? inputEl.value.trim() : '';

          if (!q) return;

          // Fetch next page
          const response = await fetchSuggestions(q, cfg, widgetId, nextPage);

          if (!response.aborted && response.results.length > 0) {
            // Update page tracking
            currentPageByWidget.set(widgetId, nextPage);
            totalPagesByWidget.set(widgetId, response.totalPages);

            // Append new results to existing list
            const existingList = suggestionsByWidget.get(widgetId) || [];
            const updatedList = [...existingList, ...response.results];
            suggestionsByWidget.set(widgetId, updatedList);

            // Re-render with isLoadMore flag
            renderSuggestions(updatedList, container, widgetEl, cfg, true);
          } else {
            loadMoreBtn.textContent = 'No more results';
            loadMoreBtn.style.cursor = 'default';
          }
        });
      }
    }

    // Scan Iconify icons for dynamic content
    if (window.Iconify && window.Iconify.scan) {
      window.Iconify.scan(container);
    }
  }

  function hideSuggestions(container, widgetId) {
    container.style.display = 'none';
    container.innerHTML = '';
    suggestionsByWidget.set(widgetId, []);
    activeIndexByWidget.set(widgetId, -1);
  }

  function updateActive(container, widgetId) {
    const activeIndex = activeIndexByWidget.get(widgetId) ?? -1;
    const items = container.querySelectorAll('.cinema-suggestion-item');
    items.forEach((el, i) => {
      el.classList.toggle('active', i === activeIndex);
      if (i === activeIndex) el.scrollIntoView({ block: 'nearest' });
    });
  }

  return {
    barMeta: {
      id: 'cinema',
      name: 'Movies',
      icon: 'mdi:movie-search-outline',
      testMode: false
    },

    render(settings = {}, widgetSize = '6x1') {
      const cfg = { ...defaults, ...settings };
      const [w, h] = widgetSize.split('x').map(Number);

      let inputFontSize = '';
      let inputPadding = '';
      let buttonSize = '';

      if (w === 2) {
        inputFontSize = 'font-size: 12px;';
        inputPadding = 'padding: 8px 10px;';
        buttonSize = 'width: 30px; height: 30px; font-size: 16px;';
      } else if (h === 1) {
        inputPadding = 'padding: 6px 10px;';
      }

      return `
        <div class="cinema-search-widget-container">
          <div class="cinema-search-blur-layer"></div>
          <div class="cinema-search-border-layer">
            <input type="text" class="cinema-search-input" placeholder="${escapeHtml(cfg.placeholder)}" autocomplete="off">
            ${cfg.showSearchIcon ? `
              <button type="button" class="cinema-search-button" style="${buttonSize}">
                <span class="iconify" data-icon="mdi:movie-search-outline"></span>
              </button>` : ''}
          </div>
        </div>
      `;
    },

    setup(element, editMode, settings = {}) {
      if (editMode) return;
      const cfg = { ...defaults, ...settings };
      const widgetId = element.id || element.dataset.widgetId;

      const inputEl = element.querySelector('.cinema-search-input');
      const btnEl = element.querySelector('.cinema-search-button');
      if (!inputEl) return;

      let container = document.getElementById(`cinema-search-suggestions-${widgetId}`);
      if (!container) {
        container = document.createElement('div');
        container.id = `cinema-search-suggestions-${widgetId}`;
        container.className = 'cinema-search-suggestions cinema-search-suggestions-overlay suggestion-box';
        container.style.display = 'none';
        document.body.appendChild(container);
      }

      suggestionsByWidget.set(widgetId, []);
      activeIndexByWidget.set(widgetId, -1);

      const updateBtnOpacity = () => {
        if (!btnEl) return;
        btnEl.style.opacity = inputEl.value.trim() ? '1' : '0.3';
      };
      updateBtnOpacity();
      inputEl.addEventListener('input', updateBtnOpacity);

      element.addEventListener('click', (e) => {
        if (e.target !== inputEl && !e.target.closest('.cinema-search-button')) inputEl.focus();
      });

      let debounce = null;

      const showLoading = () => {
        // Generate 3 skeleton items to match the expected layout
        const skeletonItems = Array(3).fill(0).map(() => `
          <div class="cinema-skeleton-item">
            <div class="cinema-skeleton-poster"></div>
            <div class="cinema-skeleton-content">
              <div class="cinema-skeleton-title"></div>
              <div class="cinema-skeleton-description">
                <div class="cinema-skeleton-line"></div>
                <div class="cinema-skeleton-line"></div>
                <div class="cinema-skeleton-line"></div>
              </div>
            </div>
            <div class="cinema-skeleton-providers">
              <div class="cinema-skeleton-provider"></div>
              <div class="cinema-skeleton-provider"></div>
              <div class="cinema-skeleton-provider"></div>
            </div>
          </div>
        `).join('');

        container.innerHTML = `<div class="suggestion-scroller"><div class="cinema-skeleton-container">${skeletonItems}</div></div>`;
        positionContainer(container, element);
        container.style.display = '';
      };

      const runSearch = async () => {
        const q = inputEl.value.trim();
        if (!q) return hideSuggestions(container, widgetId);

        // Show loading state immediately
        showLoading();

        clearTimeout(debounce);
        debounce = setTimeout(async () => {
          // Fetch starts while skeleton is already showing

          // Reset to page 1 for new search
          currentPageByWidget.set(widgetId, 1);

          const response = await fetchSuggestions(q, cfg, widgetId, 1);

          // If the search was aborted (superseded by a newer search), don't update UI
          if (response.aborted) {
            return;
          }

          // If no results found, show "no results" message
          if (!response.results.length) {
            container.innerHTML = `
              <div class="suggestion-scroller">
                <div class="cinema-no-results">
                  <div class="cinema-no-results-text">No results found</div>
                </div>
              </div>
            `;
            positionContainer(container, element);
            container.style.display = '';
            return;
          }

          // Display the results
          suggestionsByWidget.set(widgetId, response.results);
          currentPageByWidget.set(widgetId, response.page);
          totalPagesByWidget.set(widgetId, response.totalPages);
          activeIndexByWidget.set(widgetId, -1);
          displayCountByWidget.delete(widgetId);
          renderSuggestions(response.results, container, element, cfg, false);
        }, cfg.debounceMs);
      };

      inputEl.addEventListener('input', runSearch);
      inputEl.addEventListener('focus', runSearch);

      if (btnEl) {
        btnEl.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const q = inputEl.value.trim();
          if (!q) return;
          window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q + ' movie')}`;
        });
      }

      inputEl.addEventListener('keydown', (e) => {
        const visible = container.style.display !== 'none';
        const list = suggestionsByWidget.get(widgetId) || [];
        const max = list.length - 1;
        let idx = activeIndexByWidget.get(widgetId) ?? -1;

        if (e.key === 'ArrowDown' && visible) {
          e.preventDefault();
          idx = Math.min(max, idx + 1);
          activeIndexByWidget.set(widgetId, idx);
          updateActive(container, widgetId);
        } else if (e.key === 'ArrowUp' && visible) {
          e.preventDefault();
          idx = Math.max(0, idx - 1);
          activeIndexByWidget.set(widgetId, idx);
          updateActive(container, widgetId);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const pick = (visible && idx >= 0) ? list[idx] : null;
          if (pick) {
            // Trigger click on active item to expand it
            const items = container.querySelectorAll('.cinema-suggestion-item');
            if (items[idx]) {
              items[idx].click();
            }
          } else {
            const q = inputEl.value.trim();
            if (q) window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q + ' movie')}`;
          }
        } else if (e.key === 'Escape' && visible) {
          // Check if any item is expanded
          const expandedItem = container.querySelector('.cinema-suggestion-item[data-expanded="true"]');
          if (expandedItem) {
            // Collapse the expanded item
            expandedItem.dataset.expanded = 'false';
            expandedItem.querySelector('.cinema-item-details').style.display = 'none';
            expandedItem.classList.remove('expanded');
          } else {
            // Hide suggestions entirely
            hideSuggestions(container, widgetId);
          }
        }
      });

      container.addEventListener('mousedown', (e) => e.preventDefault());
      container.addEventListener('click', (e) => {
        // Don't expand if clicking on a link or load more button
        if (e.target.closest('a') || e.target.closest('.cinema-load-more-btn')) {
          return;
        }

        const itemEl = e.target.closest('.cinema-suggestion-item');
        if (!itemEl) return;

        const isExpanded = itemEl.dataset.expanded === 'true';

        // Collapse all other items
        container.querySelectorAll('.cinema-suggestion-item').forEach(item => {
          if (item !== itemEl) {
            item.dataset.expanded = 'false';
            item.classList.remove('expanded');

            // Hide details, show preview
            const previewEl = item.querySelector('.cinema-item-preview');
            const detailsEl = item.querySelector('.cinema-item-details');
            if (previewEl) previewEl.style.display = '';
            if (detailsEl) detailsEl.style.display = 'none';
          }
        });

        // Toggle this item
        if (isExpanded) {
          // Collapse: show preview, hide details
          itemEl.dataset.expanded = 'false';
          itemEl.classList.remove('expanded');

          const previewEl = itemEl.querySelector('.cinema-item-preview');
          const detailsEl = itemEl.querySelector('.cinema-item-details');
          if (previewEl) previewEl.style.display = '';
          if (detailsEl) detailsEl.style.display = 'none';
        } else {
          // Expand: hide preview, show details
          itemEl.dataset.expanded = 'true';
          itemEl.classList.add('expanded');

          const previewEl = itemEl.querySelector('.cinema-item-preview');
          const detailsEl = itemEl.querySelector('.cinema-item-details');
          if (previewEl) previewEl.style.display = 'none';
          if (detailsEl) detailsEl.style.display = 'block';

          // Smooth scroll to keep item in view
          itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

          // Scan Iconify for new icons in expanded content
          if (window.Iconify && window.Iconify.scan) {
            window.Iconify.scan(itemEl);
          }
        }
      });

      document.addEventListener('click', (e) => {
        if (!container.contains(e.target) && !element.contains(e.target)) {
          hideSuggestions(container, widgetId);
        }
      });
    },

    cleanup(widgetId) {
      lastFetchIdByWidget.delete(widgetId);
      activeIndexByWidget.delete(widgetId);
      suggestionsByWidget.delete(widgetId);
      displayCountByWidget.delete(widgetId);
      currentPageByWidget.delete(widgetId);
      totalPagesByWidget.delete(widgetId);
      const c = document.getElementById(`cinema-search-suggestions-${widgetId}`);
      if (c) c.remove();
    }
  };
})();
