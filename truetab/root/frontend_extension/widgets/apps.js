// Apps Widget - Horizontal scroller (locked at 2 boxes high)
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules.apps = {
    setup: function(element, editMode, settings = {}) {
        if (editMode) return;

        // Check if content is scrollable and add class accordingly (stocks pattern)
        const content = element.querySelector('.apps-scroller-content');
        if (content) {
            const checkScrollable = () => {
                const isScrollable = content.scrollWidth > content.clientWidth;
                if (isScrollable) {
                    content.classList.add('is-scrollable');
                    content.classList.remove('not-scrollable');
                } else {
                    content.classList.remove('is-scrollable');
                    content.classList.add('not-scrollable');
                }
            };

            // Check initially
            setTimeout(checkScrollable, 0);

            // Use ResizeObserver to detect changes
            if (typeof ResizeObserver !== 'undefined') {
                const observer = new ResizeObserver(checkScrollable);
                observer.observe(content);
            }
        }
    },

    render: function(settings = {}, widgetWidth = 4, widgetHeight = 2) {
        const title = settings.title || 'Apps';
        const showLabels = settings.showLabels !== false;
        const glassBGMode = settings.glassBGMode || 'show-all'; // Widget-level glass BG setting
        const links = settings.links || [];

        // Determine if compact layout (1 box tall)
        const isCompact = widgetHeight === 1;
        const compactClass = isCompact ? 'apps-compact' : '';

        // Size-based font adjustments (stocks pattern) - icons only, labels use original calc
        let iconSize = '';
        let labelSize = '';
        if (widgetWidth === 2) {
            iconSize = 'font-size: 20px;';
        } else if (widgetWidth === 3) {
            iconSize = 'font-size: 24px;';
        }

        // Show all apps and allow horizontal scrolling
        const appItems = links.map(link => {
            const colorClass = (link.colorIcon !== false) ? 'color-icon' : 'no-color-icon';
            const iconHtml = window.TrueTab.utils.renderIconHTML(link.icon, link.name, colorClass);

            const labelHtml = showLabels ? `<div class="single-app-name" style="${labelSize}">${link.name}</div>` : '';

            return `<a href="${link.url}" class="app-item ${compactClass}" target="_blank"><div class="single-app-icon" style="${iconSize}">${iconHtml}</div>${labelHtml}</a>`;
        }).join('');

        // Hide title when widget is only 1 box tall
        const showTitle = widgetHeight > 1;

        return `
            ${showTitle ? `<div class="widget-header apps-scroller-title">${title || '&nbsp;'}</div>` : ''}
            <div class="widget-content apps-scroller-content ${isCompact ? 'apps-scroller-compact-height' : ''}" data-glass-mode="${glassBGMode}" data-hide-labels="${!showLabels}">
                <div class="app-grid">
                    ${appItems}
                </div>
            </div>
        `;
    }
};
