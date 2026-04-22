// Stocks Widget
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules.stocks = {
    cachedData: {},
    lastUpdate: {},
    previousSymbols: [],

    render: function(settings = {}, widgetSize = '3x2') {
        const symbols = settings.symbols || ['AAPL', 'GOOGL', 'MSFT'];
        const title = settings.title || 'Stocks';
        const showPrice = settings.showPrice !== false;
        const showChange = settings.showChange !== false;
        const showPercent = settings.showPercent !== false;
        const showLogo = settings.showLogo === true;
        const hideSymbol = settings.hideSymbol === true;

        // Determine spacing based on widget dimensions
        let itemPadding;
        let fontSize = '';
        let changeFontSize = '';
        let itemGap = '12px';

        // Check if widget width is 2 (e.g., 2x1, 2x2, 2x3)
        const width = parseInt(widgetSize.split('x')[0]);

        if (width === 2) {
            itemPadding = '4px';
            fontSize = 'font-size: 11px;';
            changeFontSize = 'font-size: 10px;';
            itemGap = '12px'; // keep gap same as default
        } else {
            itemPadding = '6px';
            fontSize = '';
            changeFontSize = '';
            itemGap = '12px';
        }

        // Precompute shared styles (avoid repetition)
        const itemStyle = `padding: ${itemPadding} 8px; display: grid; grid-template-columns: ${hideSymbol ? '1fr' : 'auto 1fr'}; align-items: center; gap: 12px; ${fontSize}`;
        const changeStyle = `text-align: ${hideSymbol ? 'center' : 'right'}; font-variant-numeric: tabular-nums; ${changeFontSize}`;

        const stockItems = symbols.map(symbol => {
            const data = this.cachedData[symbol];

            if (data && !data.error) {
                const isPositive = data.percent >= 0;
                const displayParts = [];

                if (showPrice && data.current !== null) displayParts.push(`$${Number(data.current).toFixed(2)}`);
                if (showChange && data.change !== null) displayParts.push(`${isPositive ? '+' : ''}${Number(data.change).toFixed(2)}`);
                if (showPercent && data.percent !== null) displayParts.push(`${isPositive ? '+' : ''}${Number(data.percent).toFixed(2)}%`);

                const displayText = displayParts.length > 0 ? displayParts.join(' ') : '--';
                const symbolHtml = !hideSymbol ? `<div style="display: flex; align-items: center; gap: 6px;">${showLogo && data.logo ? `<img src="${data.logo}" style="width: 20px; height: 20px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none'" />` : ''}<span style="font-weight: 500;">${symbol}</span></div>` : '';

                return `<div class="stock-item" style="${itemStyle}">${symbolHtml}<span class="stock-change ${isPositive ? 'positive' : 'negative'}" style="${changeStyle}">${displayText}</span></div>`;
            }

            return `<div class="stock-item" style="${itemStyle}">${!hideSymbol ? `<span style="font-weight: 500;">${symbol}</span>` : ''}<span class="stock-change" style="${changeStyle}">--</span></div>`;
        }).join('');

        return `
            <div class="widget-header stocks-header">${title}</div>
            <div class="widget-content stocks-scrollable">
                ${stockItems}
            </div>
        `;
    },

    async fetchStockData(symbols, forceUpdate = false) {
        const now = Date.now();

        for (const symbol of symbols) {
            // Only fetch if more than 3 minutes have passed for this symbol (or first time or forced)
            const lastFetch = this.lastUpdate[symbol] || 0;
            if (!forceUpdate && now - lastFetch < 180000 && lastFetch !== 0) continue;

            try {
                const response = await fetch(`${BASE_URL}stocks.php?symbol=${encodeURIComponent(symbol)}`);
                const data = await response.json();

                if (data.error) {
                    console.error(`Error fetching ${symbol}:`, data.error);
                    this.cachedData[symbol] = { error: data.error };
                } else {
                    this.cachedData[symbol] = data;
                    this.lastUpdate[symbol] = now;
                }
            } catch (err) {
                console.error(`Network error fetching ${symbol}:`, err);
                this.cachedData[symbol] = { error: 'Network error' };
            }
        }
    },

    update: async function(element, settings = {}, forceUpdate = false) {
        const symbols = settings.symbols || ['AAPL', 'GOOGL', 'MSFT'];

        // Check if symbols changed - if so, force update
        const symbolsChanged = JSON.stringify(symbols) !== JSON.stringify(this.previousSymbols);
        if (symbolsChanged) {
            this.previousSymbols = [...symbols];
            forceUpdate = true;
        }

        await this.fetchStockData(symbols, forceUpdate);

        if (element) {
            // Get the widget size from the element's data attribute or default
            const widgetSize = element.dataset.widgetSize || '3x2';

            // Re-render the entire content
            const content = element.querySelector('.widget-content');
            if (content) {
                const fullRender = this.render(settings, widgetSize);
                // Use a more greedy regex to capture all content including newlines
                const match = fullRender.match(/<div class="widget-content stocks-scrollable">([\s\S]+)<\/div>/);
                if (match) {
                    content.innerHTML = match[1];
                } else {
                    console.error('Stocks widget: Failed to match render output', fullRender);
                }

                // Check if content is scrollable and add class
                setTimeout(() => {
                    if (content.scrollHeight > content.clientHeight) {
                        content.classList.add('is-scrollable');
                    } else {
                        content.classList.remove('is-scrollable');
                    }
                }, 0);
            }
        }
    }
};
