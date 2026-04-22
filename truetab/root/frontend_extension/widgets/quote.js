// Quote Widget - Responsive text sizing with API integration
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules.quote = {
    cachedQuote: null,
    lastCategory: null,
    lastUpdate: {},

    render: function(settings = {}, widgetSize = '3x2') {
        const category = settings.category || 'inspirational';

        // Parse widget dimensions
        const [w, h] = widgetSize.split('x').map(Number);
        const totalCells = w * h;

        // Progressive font scaling based on widget size - increased for 1-box-tall
        let textSize, authorSize, lineHeight, padding;
        if (h === 1) {
            // Single row - compact layout with bigger text
            textSize = 'clamp(12px, 1.3vw, 15px)';
            authorSize = 'clamp(10px, 1.1vw, 12px)';
            lineHeight = '1.3';
            padding = '8px 12px';
        } else if (totalCells <= 4) {
            // 2x2 or smaller
            textSize = 'clamp(11px, 1.2vw, 14px)';
            authorSize = 'clamp(9px, 1vw, 11px)';
            lineHeight = '1.3';
            padding = '16px';
        } else if (totalCells <= 6) {
            // 3x2
            textSize = 'clamp(13px, 1.4vw, 16px)';
            authorSize = 'clamp(11px, 1.2vw, 13px)';
            lineHeight = '1.4';
            padding = '16px';
        } else if (totalCells <= 9) {
            // 3x3 or smaller
            textSize = 'clamp(15px, 1.6vw, 18px)';
            authorSize = 'clamp(12px, 1.3vw, 15px)';
            lineHeight = '1.5';
            padding = '16px';
        } else {
            // Large widgets
            textSize = 'clamp(17px, 1.8vw, 20px)';
            authorSize = 'clamp(13px, 1.4vw, 16px)';
            lineHeight = '1.6';
            padding = '16px';
        }

        // Use cached quote or placeholder
        const quoteText = this.cachedQuote?.text || 'Loading quote...';
        const quoteAuthor = this.cachedQuote?.author || '';

        return `
            <div class="widget-content quote-widget-content" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding: ${padding};">
                <div class="quote-text" data-max-font="${textSize}" style="font-size: ${textSize}; line-height: ${lineHeight}; text-align: center; margin-bottom: ${h === 1 ? '4px' : '8px'};">"${quoteText}"</div>
                ${quoteAuthor ? `<div class="quote-author" style="font-size: ${authorSize}; opacity: 0.8;">— ${quoteAuthor}</div>` : ''}
            </div>
        `;
    },

    fetchQuote: async function(category = 'inspirational') {
        try {
            const tag = category === 'random' ? '' : category;
            const url = `${BASE_URL}quotes.php?fetch=1${tag ? '&tag=' + encodeURIComponent(tag) : ''}`;
            const res = await fetch(url);

            // Log raw response for debugging
            const responseText = await res.text();
            console.log('Quote API raw response:', responseText.substring(0, 200));

            let json;
            try {
                json = JSON.parse(responseText);
            } catch (parseErr) {
                console.error('Quote fetch error: Invalid JSON from provider', parseErr);
                console.error('Response was:', responseText);
                this.cachedQuote = { text: 'API returned invalid data', author: '' };
                return this.cachedQuote;
            }

            if (json.error) {
                console.error('Quote fetch error:', json.error);
                this.cachedQuote = { text: 'Unable to load quote: ' + json.error, author: '' };
                return this.cachedQuote;
            }

            // Handle normalized response format from PHP
            let quoteText = '';
            let quoteAuthor = '';

            if (json.data) {
                quoteText = json.data.text || '';
                quoteAuthor = json.data.author || '';
            }

            this.cachedQuote = {
                text: quoteText || 'No quote available',
                author: quoteAuthor
            };
            this.lastCategory = category;

            return this.cachedQuote;
        } catch (err) {
            console.error('Quote network error:', err);
            this.cachedQuote = { text: 'Network error: ' + err.message, author: '' };
            return this.cachedQuote;
        }
    },

    update: async function(element, settings = {}) {
        if (!element) return;

        const category = settings.category || 'inspirational';

        // Fetch new quote
        await this.fetchQuote(category);

        // Update DOM
        const quoteTextEl = element.querySelector('.quote-text');
        const quoteAuthorEl = element.querySelector('.quote-author');

        if (quoteTextEl && this.cachedQuote) {
            quoteTextEl.textContent = `"${this.cachedQuote.text}"`;
            this.scaleQuoteToFit(quoteTextEl);
        }

        if (quoteAuthorEl && this.cachedQuote?.author) {
            quoteAuthorEl.textContent = `— ${this.cachedQuote.author}`;
        }
    },

    scaleQuoteToFit: function(quoteElement) {
        if (!quoteElement) return;

        // Use requestAnimationFrame to ensure DOM is fully rendered
        requestAnimationFrame(() => {
            const container = quoteElement.closest('.quote-widget-content');
            if (!container) return;

            const maxFont = quoteElement.getAttribute('data-max-font') || '18px';
            const maxFontValue = parseFloat(maxFont);
            const minFontSize = 10;

            // Reset to max size
            quoteElement.style.fontSize = maxFont;

            // Single read of dimensions (avoid repeated reflows in loop)
            const containerHeight = container.clientHeight;
            let scrollHeight = quoteElement.scrollHeight;

            // Binary search for optimal font size (faster than linear decrement)
            let low = minFontSize;
            let high = maxFontValue;
            let fontSize = maxFontValue;

            while (low <= high && scrollHeight > containerHeight) {
                fontSize = (low + high) / 2;
                quoteElement.style.fontSize = fontSize + 'px';
                scrollHeight = quoteElement.scrollHeight;

                if (scrollHeight > containerHeight) {
                    high = fontSize - 0.5;
                } else {
                    low = fontSize + 0.5;
                }
            }
        });
    }
};
