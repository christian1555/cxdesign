// Clock Widget
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules.clock = {
    // Shared helper to format time (avoid code duplication)
    _formatTime: function(settings = {}) {
        const now = new Date();
        const format24h = settings.format24h !== false;
        const showSeconds = settings.showSeconds === true;
        const showDate = settings.showDate !== false;

        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: !format24h
        };
        if (showSeconds) timeOptions.second = '2-digit';

        // Replace colons with periods for time formatting
        const formattedTime = now.toLocaleTimeString('en-US', timeOptions).replace(/:/g, '.');

        return {
            time: formattedTime,
            date: showDate ? now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''
        };
    },

    render: function(settings = {}, widgetSize = '3x2') {
        const showWeather = settings.showWeather !== false;
        const showDate = settings.showDate !== false;
        const location = settings.location || 'Copenhagen';
        const { time, date } = this._formatTime(settings);

        // Parse widget size for responsive scaling (stocks pattern)
        const [width, height] = widgetSize.split('x').map(Number);

        // Size-based font adjustments
        let timeSize = '';
        let dateSize = '';
        let weatherSize = '';

        if (width === 2) {
            timeSize = 'font-size: clamp(24px, 2.4vw, 28px);';
            dateSize = 'font-size: clamp(10px, 1vw, 12px);';
            weatherSize = 'font-size: clamp(10px, 1vw, 12px);';
        } else if (height === 1) {
            timeSize = 'font-size: clamp(20px, 2vw, 24px);';
            dateSize = 'font-size: clamp(9px, 0.9vw, 11px);';
            weatherSize = 'font-size: clamp(9px, 0.9vw, 11px);';
        }

        // Hide date and weather for 1-tall widgets
        const showDateComputed = showDate && height > 1;
        const showWeatherComputed = showWeather && height > 1;

        return `
            <div class="widget-content">
                ${showWeatherComputed ? `
                    <div class="clock-weather" style="${weatherSize}">
                        <span class="clock-weather-city">${location}</span>
                        <span class="clock-weather-icon iconify" data-icon="mdi:weather-cloudy"></span>
                        <span class="clock-weather-temp">--°C</span>
                    </div>
                ` : ''}
                <div class="clock-time" style="${timeSize}">${time}</div>
                ${showDateComputed ? `<div class="clock-date" style="${dateSize}">${date}</div>` : ''}
            </div>
        `;
    },

    update: async function(element, settings = {}) {
        if (!element) return;

        const showDate = settings.showDate !== false;
        const showWeather = settings.showWeather !== false;
        const location = settings.location || 'Copenhagen';
        const { time, date } = this._formatTime(settings);

        const timeEl = element.querySelector('.clock-time');
        const dateEl = element.querySelector('.clock-date');

        if (timeEl) timeEl.textContent = time;
        if (dateEl && showDate) {
            dateEl.textContent = date;
        } else if (showDate && !dateEl) {
            // Add date element if it doesn't exist
            const content = element.querySelector('.widget-content');
            if (content) {
                const newDateEl = document.createElement('div');
                newDateEl.className = 'clock-date';
                newDateEl.textContent = date;
                content.appendChild(newDateEl);
            }
        }

        // Update weather if enabled
        if (showWeather && window.TrueTab.widgetModules.weather) {
            const weatherData = await window.TrueTab.widgetModules.weather.fetchWeatherData(location);

            if (weatherData && !weatherData.error) {
                const weatherCityEl = element.querySelector('.clock-weather-city');
                const weatherIconEl = element.querySelector('.clock-weather-icon');
                const weatherTempEl = element.querySelector('.clock-weather-temp');

                if (weatherCityEl) weatherCityEl.textContent = location;
                if (weatherIconEl && weatherData.icon) weatherIconEl.setAttribute('data-icon', weatherData.icon);
                if (weatherTempEl) weatherTempEl.textContent = weatherData.temp;
            }
        }
    }
};
