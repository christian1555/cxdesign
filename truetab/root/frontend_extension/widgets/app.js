// Single App Widget (1x1 grid)
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules.app = {
    render: function(settings = {}, widgetSize = '1x1') {
        const name = settings.name || 'App';
        const url = settings.url || '#';
        const icon = settings.icon || '📱';
        const iconFallback = settings.iconFallback;
        const showLabel = settings.showLabel !== false;
        const colorIcon = settings.colorIcon !== false; // Default to true

        // Parse widget size for responsive scaling (stocks pattern)
        const [width, height] = widgetSize.split('x').map(Number);

        // Size-based font adjustments
        let iconSize = '';
        let labelSize = '';

        // Keep label sizes unchanged - only adjust icon sizes
        if (width === 1 && height === 1) {
            iconSize = 'font-size: clamp(32px, 3.2vw, 40px);';
        } else if (width === 2 || height === 2) {
            iconSize = 'font-size: clamp(40px, 4vw, 52px);';
        } else if (width >= 3 || height >= 3) {
            iconSize = 'font-size: clamp(56px, 5.6vw, 72px);';
        }

        const colorClass = colorIcon ? 'color-icon' : 'no-color-icon';
        const iconHtml = window.TrueTab.utils.renderIconHTML(icon, name, colorClass, iconFallback);

        return `
            <a href="${url}" class="single-app-link" target="_blank">
                <div class="single-app-icon" style="${iconSize}">
                    ${iconHtml}
                </div>
                ${showLabel ? `<div class="single-app-name" style="${labelSize}">${name}</div>` : ''}
            </a>
        `;
    }
};
