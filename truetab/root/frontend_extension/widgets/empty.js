// Empty Widget
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules.empty = {
    render: function(settings = {}, widgetSize = '3x2') {
        const title = settings.title || '';
        const links = settings.links || [];

        // Parse widget size
        const [width, height] = widgetSize.split('x').map(Number);

        // Size-based adjustments (stocks pattern)
        let itemFontSize = '';
        let itemPadding = '';
        let titleDisplay = true;

        // Hide title for 1-tall widgets
        if (height === 1) {
            titleDisplay = false;
        }

        // Smaller fonts and padding for 2-wide widgets
        if (width === 2) {
            itemFontSize = 'font-size: 10px;';
            itemPadding = 'padding: 4px 6px;';
        }

        const headerHtml = (title && titleDisplay) ? `<div class="widget-header" style="font-size: 13px; text-align: center;">${title}</div>` : '';

        if (links.length > 0) {
            const linkItems = links.map(link => {
                let inlineStyles = itemFontSize + itemPadding;

                if (link.colorBg) {
                    // Convert hex color to rgba with 50% opacity
                    const hex = link.colorBg.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    inlineStyles += `background-color: rgba(${r}, ${g}, ${b}, 0.5);`;
                }

                const styleAttr = inlineStyles ? ` style="${inlineStyles}"` : '';
                return `<a href="${link.url}" class="quick-link-item" target="_blank"${styleAttr}>${link.name}</a>`;
            }).join('');

            return `${headerHtml}<div class="widget-content quick-links-content">${linkItems}</div>`;
        }

        return `${headerHtml}<div class="widget-content empty-box"><div class="empty-text">Empty Space</div></div>`;
    },

    setup: function(element, editMode, settings = {}) {
        const content = element.querySelector('.quick-links-content');
        if (content) {
            const checkScrollable = () => {
                if (content.scrollHeight > content.clientHeight) {
                    content.classList.add('is-scrollable');
                } else {
                    content.classList.remove('is-scrollable');
                }
            };

            // Initial check
            setTimeout(checkScrollable, 0);

            // Watch for content changes
            if (typeof ResizeObserver !== 'undefined') {
                const observer = new ResizeObserver(checkScrollable);
                observer.observe(content);
            }

            // Store reference for external updates (when links are added/removed)
            if (!element.quickLinksCheckScrollable) {
                element.quickLinksCheckScrollable = checkScrollable;
            }
        }
    }
};
