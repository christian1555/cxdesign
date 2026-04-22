// bar-amazon.js — Amazon input bar (test/placeholder)
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules['bar-amazon'] = (function(){
  const defaults = { placeholder: '', showSearchIcon: true };

  return {
    barMeta: {
      id: 'bar-amazon',
      name: 'Amazon',
      icon: 'mdi:amazon',
      testMode: true
    },

    render(settings = {}) {
      const cfg = { ...defaults, ...settings };
      return `
        <div class="search-widget-container">
          <div class="search-blur-layer"></div>
          <div class="search-border-layer">
            <input type="text" class="search-input bar-test-input" placeholder="${cfg.placeholder}" autocomplete="off">
            ${cfg.showSearchIcon ? `<button type="button" class="search-button"><span class="iconify" data-icon="mdi:amazon"></span></button>` : ''}
          </div>
        </div>
      `;
    },

    setup(element, editMode, settings = {}) {
      if (editMode) return;
      const input = element.querySelector('.search-input');
      const btn = element.querySelector('.search-button');
      if (!input) return;

      element.addEventListener('click', (e) => {
        if (e.target !== input && !e.target.closest('.search-button')) input.focus();
      });

      const search = () => {
        const q = (input.value || '').trim();
        if (!q) return;
        window.location.href = `https://www.amazon.com/s?k=${encodeURIComponent(q)}`;
      };

      if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); search(); });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } });

      const updateOpacity = () => { if (btn) btn.style.opacity = input.value.trim() ? '1' : '0.3'; };
      input.addEventListener('input', updateOpacity);
      updateOpacity();
    },

    cleanup(widgetId) {}
  };
})();
