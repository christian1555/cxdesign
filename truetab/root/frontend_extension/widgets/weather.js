const BASE_URL = 'https://truetab-backend-930356305841.europe-west1.run.app/';

// Weather Widget (WeatherAPI + 3-14 day forecast)
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules.weather = {
    cachedData: {},
    lastUpdate: {},
    TTL_MS: 10 * 60 * 1000, // 10 min cache – forecasts don't change fast

    render: function(settings = {}, widgetSize = '2x2') {
        const location = settings.location || 'Copenhagen';
        const [w, h] = widgetSize.split('x').map(Number);

        // Settings toggles
        const showLocationTitle = settings.showLocationTitle !== false;
        const showIcon = settings.showIcon !== false;
        const showDegrees = settings.showDegrees !== false;
        const showDescription = settings.showDescription !== false && h > 1; // Hide description at 2x1
        const showExtraInfo = settings.showExtraInfo !== false;
        const forecastDays = settings.forecastDays || 'none';

        // Determine if forecast should be shown
        const showForecast = forecastDays !== 'none';

        // Parse requested forecast days
        let requestedDays = parseInt(forecastDays, 10) || 0;

        // Determine how many days to DISPLAY based on size (not restrict setting)
        let numForecastDays = 0;
        if (showForecast) {
            if (w === 2 && h === 1) {
                // 2x1: show 3 days max
                numForecastDays = Math.min(requestedDays, 3);
            } else if (w === 2 && h === 2) {
                // 2x2: show up to 7 days
                numForecastDays = Math.min(requestedDays, 7);
            } else if (w === 2 && h === 3) {
                // 2x3: show up to 7 days
                numForecastDays = Math.min(requestedDays, 7);
            } else if (w === 3 && h === 1) {
                // 3x1: show up to 7 days
                numForecastDays = Math.min(requestedDays, 7);
            } else if (w === 3 && h === 2) {
                // 3x2: show up to 7 days
                numForecastDays = Math.min(requestedDays, 7);
            } else if (w === 3 && h === 3) {
                // 3x3: show up to 14 days
                numForecastDays = Math.min(requestedDays, 14);
            } else if (w === 4 && h === 1) {
                // 4x1: show up to 7 days
                numForecastDays = Math.min(requestedDays, 7);
            } else if (w === 4 && h === 2) {
                // 4x2: show up to 7 days
                numForecastDays = Math.min(requestedDays, 7);
            } else {
                // 4x3: show all 14 days
                numForecastDays = Math.min(requestedDays, 14);
            }
        }

        // Check if ONLY forecast is shown
        const hasCurrentWeather = showIcon || showDegrees || showDescription;
        const onlyForecast = showForecast && !hasCurrentWeather && !showExtraInfo;

        // Dynamic sizing based on what's visible
        const hiddenElementsCount = [!showLocationTitle, !showIcon, !showDescription, !showDegrees].filter(Boolean).length;

        // Determine if we need grid layout for forecast
        const useGridLayout = numForecastDays > 3;
        // 7 days: 3 top row, 4 bottom row
        // 14 days: 7x2 grid
        const forecastCols = numForecastDays === 7 ? 4 : (numForecastDays === 14 ? 7 : numForecastDays);
        const forecastRows = numForecastDays === 7 ? 2 : (numForecastDays === 14 ? 2 : 1);

        // Calculate icon size with comprehensive dynamic adjustment
        let iconSize;
        if (h === 1) {
            // 2x1: tiny
            iconSize = '10px';
        } else if (w === 2 && h === 2) {
            // 2x2: dynamic based on hidden elements
            const baseSize = 36 + (hiddenElementsCount * 6);
            iconSize = `clamp(${baseSize}px, 3.5vw, ${baseSize + 16}px)`;
        } else if (w === 2 && h === 3) {
            // 2x3: mix of 3x3 and 3x2, supports 7-day forecast
            const baseSize = 34 + (hiddenElementsCount * 5);
            iconSize = `clamp(${baseSize}px, 3.2vw, ${baseSize + 14}px)`;
        } else if (w === 3 && h === 2) {
            // 3x2: smaller when 7-day forecast or extra info enabled
            const is7Day = numForecastDays === 7;
            const baseSize = (is7Day || showExtraInfo) ? 26 : (32 + (hiddenElementsCount * 4));
            const maxExtra = (is7Day || showExtraInfo) ? 9 : 12;
            iconSize = `clamp(${baseSize}px, 3vw, ${baseSize + maxExtra}px)`;
        } else if (w === 3 && h === 3) {
            // 3x3: ~30% smaller when extra info enabled
            const baseSize = showExtraInfo ? 28 : (40 + (hiddenElementsCount * 5));
            const maxExtra = showExtraInfo ? 11 : 16;
            iconSize = `clamp(${baseSize}px, 3vw, ${baseSize + maxExtra}px)`;
        } else if (w === 4 && h === 2) {
            // 4x2
            const baseSize = 36 + (hiddenElementsCount * 4);
            iconSize = `clamp(${baseSize}px, 3.2vw, ${baseSize + 14}px)`;
        } else {
            // 4x3: ~20% smaller when extra info enabled
            const baseSize = showExtraInfo ? 38 : (48 + (hiddenElementsCount * 6));
            const maxExtra = showExtraInfo ? 16 : 20;
            iconSize = `clamp(${baseSize}px, 3.5vw, ${baseSize + maxExtra}px)`;
        }

        // Calculate temperature size
        let tempSize;
        if (h === 1) {
            tempSize = '10px';
        } else if (w === 2 && h === 2) {
            const baseSize = 28 + (hiddenElementsCount * 4);
            tempSize = `clamp(${baseSize}px, 3vw, ${baseSize + 10}px)`;
        } else if (w === 2 && h === 3) {
            // 2x3: mix of 3x3 and 3x2
            const baseSize = 28 + (hiddenElementsCount * 3);
            tempSize = `clamp(${baseSize}px, 2.9vw, ${baseSize + 11}px)`;
        } else if (w === 3 && h === 2) {
            // 3x2: smaller when 7-day forecast or extra info enabled
            const is7Day = numForecastDays === 7;
            const baseSize = (is7Day || showExtraInfo) ? 22 : (26 + (hiddenElementsCount * 3));
            const maxExtra = (is7Day || showExtraInfo) ? 8 : 10;
            tempSize = `clamp(${baseSize}px, 2.8vw, ${baseSize + maxExtra}px)`;
        } else if (w === 3 && h === 3) {
            // 3x3: ~30% smaller when extra info enabled
            const baseSize = showExtraInfo ? 22 : (32 + (hiddenElementsCount * 4));
            const maxExtra = showExtraInfo ? 8 : 12;
            tempSize = `clamp(${baseSize}px, 2.8vw, ${baseSize + maxExtra}px)`;
        } else if (w === 4 && h === 2) {
            const baseSize = 30 + (hiddenElementsCount * 3);
            tempSize = `clamp(${baseSize}px, 3vw, ${baseSize + 12}px)`;
        } else {
            // 4x3: ~20% smaller when extra info enabled
            const baseSize = showExtraInfo ? 30 : (38 + (hiddenElementsCount * 5));
            const maxExtra = showExtraInfo ? 13 : 16;
            tempSize = `clamp(${baseSize}px, 3.2vw, ${baseSize + maxExtra}px)`;
        }

        // Forecast sizing
        let forecastIconSize, forecastFontSize, forecastGap;
        let forecastTopIconSize, forecastTopFontSize; // For 7-day top row

        if (onlyForecast) {
            // Forecast is only element - BIG
            if (h === 1) {
                forecastIconSize = '28px'; forecastFontSize = '12px'; forecastGap = '8px';
            } else if (w === 2 && h === 2) {
                forecastIconSize = '40px'; forecastFontSize = '14px'; forecastGap = '12px';
            } else if (w === 2 && h === 3) {
                forecastIconSize = '42px'; forecastFontSize = '14px'; forecastGap = '12px';
            } else if (w === 3 && h === 2) {
                forecastIconSize = '44px'; forecastFontSize = '15px'; forecastGap = '14px';
            } else if (w === 3 && h === 3) {
                forecastIconSize = '52px'; forecastFontSize = '16px'; forecastGap = '16px';
            } else if (w === 4 && h === 2) {
                forecastIconSize = '48px'; forecastFontSize = '15px'; forecastGap = '14px';
            } else {
                forecastIconSize = '56px'; forecastFontSize = '17px'; forecastGap = '18px';
            }
        } else {
            // Normal forecast
            if (h === 1 && w === 2) {
                // 2x1
                forecastIconSize = '15px'; forecastFontSize = '9px'; forecastGap = '3px';
            } else if (h === 1 && w === 3) {
                // 3x1: larger icons for 3-day
                if (numForecastDays <= 3) {
                    forecastIconSize = '18px'; forecastFontSize = '10px'; forecastGap = '6px';
                } else {
                    // 7-day in single row
                    forecastIconSize = '16px'; forecastFontSize = '9px'; forecastGap = '5px';
                }
            } else if (h === 1 && w === 4) {
                // 4x1: will handle separately in layout
                forecastIconSize = '16px'; forecastFontSize = '9px'; forecastGap = '5px';
            } else if (numForecastDays === 14) {
                // 14 days: compact with better vertical spacing for 4x3
                if (w === 3) {
                    forecastIconSize = '16px'; forecastFontSize = '8px'; forecastGap = '4px';
                } else {
                    // 4x3: better vertical spacing
                    forecastIconSize = '20px'; forecastFontSize = '10px'; forecastGap = '8px';
                }
            } else if (numForecastDays === 7) {
                // 7 days: two rows - all icons same width
                if (w === 2 && h === 2) {
                    // 2x2: compact 7-day layout
                    forecastTopIconSize = '14px'; forecastTopFontSize = '8px';
                    forecastIconSize = '14px'; forecastFontSize = '8px'; forecastGap = '4px';
                } else if (w === 2 && h === 3) {
                    // 2x3: larger 7-day layout with better spacing
                    forecastTopIconSize = '20px'; forecastTopFontSize = '9px';
                    forecastIconSize = '20px'; forecastFontSize = '9px'; forecastGap = '8px';
                } else if (w === 3) {
                    forecastTopIconSize = '18px'; forecastTopFontSize = '9px';
                    forecastIconSize = '18px'; forecastFontSize = '9px'; forecastGap = '6px';
                } else {
                    // 4x2 and 4x3: better spacing
                    forecastTopIconSize = '24px'; forecastTopFontSize = '11px';
                    forecastIconSize = '24px'; forecastFontSize = '11px'; forecastGap = '10px';
                }
            } else {
                // 3 days or less: normal
                if (w === 2 && h === 2) {
                    forecastIconSize = '18px'; forecastFontSize = '10px'; forecastGap = '6px';
                } else if (w === 2 && h === 3) {
                    forecastIconSize = '20px'; forecastFontSize = '10px'; forecastGap = '6px';
                } else if (w === 3) {
                    forecastIconSize = '22px'; forecastFontSize = '11px'; forecastGap = '8px';
                } else if (w === 4 && h === 2) {
                    // 4x2: slightly larger 3-day forecast icons
                    forecastIconSize = '28px'; forecastFontSize = '12px'; forecastGap = '10px';
                } else {
                    // 4x3
                    forecastIconSize = '30px'; forecastFontSize = '13px'; forecastGap = '12px';
                }
            }
        }

        // Build forecast strip
        const forecastStrip = showForecast ? (w === 2 && h === 3 && numForecastDays === 3 ? `
            <div class="weather-forecast-strip forecast-2x3-3day" style="
                display:flex;
                flex-direction:column;
                gap:${forecastGap};
                flex:1;
                justify-content:center;
                align-items:center;
            ">
                <div style="display:flex;justify-content:center;align-items:center;">
                    <div class="wf-day wf-day-today" style="display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;">
                        <div class="wf-label" style="font-size:11px;opacity:.8;font-weight:500;">--</div>
                        <span class="wf-icon iconify" data-icon="mdi:weather-cloudy" style="font-size:32px;opacity:.9"></span>
                        <div class="wf-temps" style="font-size:11px;white-space:nowrap;"><span class="hi">--</span>/<span class="lo" style="opacity:.7">--</span></div>
                    </div>
                </div>
                <div style="display:flex;gap:${forecastGap};justify-content:center;align-items:center;">
                    ${Array.from({length: 2}, (_, i) => `
                        <div class="wf-day wf-day-other" style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;">
                            <div class="wf-label" style="font-size:10px;opacity:.8;font-weight:500;">--</div>
                            <span class="wf-icon iconify" data-icon="mdi:weather-cloudy" style="font-size:24px;opacity:.9"></span>
                            <div class="wf-temps" style="font-size:10px;white-space:nowrap;"><span class="hi">--</span>/<span class="lo" style="opacity:.7">--</span></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : numForecastDays === 7 ? `
            <div class="weather-forecast-strip forecast-7day" style="
                display:flex;
                flex-direction:column;
                gap:${forecastGap};
                flex:1;
                justify-content:center;
                align-items:center;
            ">
                <div style="display:flex;gap:${forecastGap};justify-content:center;align-items:center;">
                    ${Array.from({length: 3}, (_, i) => `
                        <div class="wf-day wf-day-top" style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;">
                            <div class="wf-label" style="font-size:${forecastTopFontSize};opacity:.8;font-weight:500;">--</div>
                            <span class="wf-icon iconify" data-icon="mdi:weather-cloudy" style="font-size:${forecastTopIconSize};opacity:.9"></span>
                            <div class="wf-temps" style="font-size:${forecastTopFontSize};white-space:nowrap;"><span class="hi">--</span>/<span class="lo" style="opacity:.7">--</span></div>
                        </div>
                    `).join('')}
                </div>
                <div style="display:flex;gap:${forecastGap};justify-content:center;align-items:center;">
                    ${Array.from({length: 4}, (_, i) => `
                        <div class="wf-day wf-day-bottom" style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;">
                            <div class="wf-label" style="font-size:${forecastFontSize};opacity:.8;font-weight:500;">--</div>
                            <span class="wf-icon iconify" data-icon="mdi:weather-cloudy" style="font-size:${forecastIconSize};opacity:.9"></span>
                            <div class="wf-temps" style="font-size:${forecastFontSize};white-space:nowrap;"><span class="hi">--</span>/<span class="lo" style="opacity:.7">--</span></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : `
            <div class="weather-forecast-strip ${useGridLayout ? 'forecast-grid' : ''}" style="
                ${useGridLayout ? `
                    display:grid;
                    grid-template-columns:repeat(${forecastCols}, 1fr);
                    gap:${forecastGap};
                    align-content:center;
                ` : `
                    display:flex;
                    gap:${forecastGap};
                    justify-content:center;
                `}
                flex:1;
                align-items:center;
            ">
                ${Array.from({length: numForecastDays}, (_, i) => `
                    <div class="wf-day" style="display:flex;flex-direction:column;align-items:center;gap:${onlyForecast ? '4px' : '2px'};flex:${onlyForecast && !useGridLayout ? '0 0 auto' : '1'};min-width:0;">
                        <div class="wf-label" style="font-size:${forecastFontSize};opacity:.8;font-weight:500;">--</div>
                        <span class="wf-icon iconify" data-icon="mdi:weather-cloudy" style="font-size:${forecastIconSize};opacity:.9"></span>
                        <div class="wf-temps" style="font-size:${forecastFontSize};white-space:nowrap;"><span class="hi">--</span>/<span class="lo" style="opacity:.7">--</span></div>
                    </div>
                `).join('')}
            </div>
        `) : '';

        // Build current weather section
        const weatherIcon = showIcon ? `<span class="weather-icon iconify" data-icon="mdi:weather-cloudy" style="font-size:${iconSize};flex-shrink:0;opacity:.9;"></span>` : '';
        const weatherTemp = showDegrees ? `<div class="weather-temp" style="font-size:${tempSize};font-weight:600;flex-shrink:0;">Loading...</div>` : '';
        const weatherDesc = showDescription ? `<div class="weather-desc" style="font-size:${w <= 2 ? '11px' : '13px'};opacity:.85;text-align:center;"></div>` : '';

        // Build extra info section
        const extraInfoFontSize = w === 2 ? '10px' : (w === 3 ? '11px' : '12px');
        const extraInfoSection = showExtraInfo ? `
            <div class="weather-extra-info" style="display:flex;flex-direction:column;gap:${w === 2 ? '3px' : '4px'};font-size:${extraInfoFontSize};opacity:.9;${!showForecast && !hasCurrentWeather ? 'flex:1;justify-content:center;' : ''}">
                <div class="weather-feels-like">Feels: <span>--</span></div>
                <div class="weather-humidity">Humidity: <span>--</span></div>
                <div class="weather-wind">Wind: <span>--</span></div>
            </div>
        ` : '';

        // Layout rendering
        if (h === 1) {
            // 2x1 COMPACT
            const showExtraInfoInLayout = showExtraInfo && !showForecast;

            if (showExtraInfoInLayout) {
                // Special layout: weather icon + degrees + extra info all in one row
                return `
                    <div class="widget-content weather-compact weather-compact-extra-layout">
                        ${showLocationTitle ? `<div style="font-size:9px;font-weight:600;opacity:.9;text-transform:uppercase;line-height:1;flex-shrink:0;">${location}</div>` : ''}
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;flex:1;">
                            ${hasCurrentWeather ? `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                ${showIcon ? `<span class="weather-icon iconify" data-icon="mdi:weather-cloudy" style="font-size:14px;opacity:.9;"></span>` : ''}
                                ${showDegrees ? `<div class="weather-temp" style="font-size:13px;font-weight:600;">Loading...</div>` : ''}
                            </div>` : ''}
                            <div class="weather-extra-info" style="display:flex;gap:6px;font-size:9px;opacity:.9;flex-shrink:0;">
                                <div class="weather-feels-like" style="white-space:nowrap;"><span>--</span></div>
                                <div class="weather-humidity" style="white-space:nowrap;"><span>--</span></div>
                                <div class="weather-wind" style="white-space:nowrap;"><span>--</span></div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (showForecast) {
                // Forecast enabled layout
                return `
                    <div class="widget-content weather-compact">
                        ${hasCurrentWeather ? `
                            <div class="weather-compact-top">
                                ${showLocationTitle ? `<span class="compact-title">${location}</span>` : ''}
                                ${showIcon ? `<span class="weather-icon iconify compact-icon" data-icon="mdi:weather-cloudy"></span>` : ''}
                                ${showDegrees ? `<div class="weather-temp compact-temp">Loading...</div>` : ''}
                            </div>
                        ` : ''}
                        ${forecastStrip}
                    </div>
                `;
            } else {
                // No forecast, no extra info
                return `
                    <div class="widget-content weather-compact">
                        ${hasCurrentWeather ? `
                            <div class="weather-compact-top">
                                ${showLocationTitle ? `<span class="compact-title">${location}</span>` : ''}
                                ${showIcon ? `<span class="weather-icon iconify compact-icon" data-icon="mdi:weather-cloudy"></span>` : ''}
                                ${showDegrees ? `<div class="weather-temp compact-temp">Loading...</div>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        } else if (w === 2 && h === 2) {
            // 2x2: Centered, vertical stack
            const showExtraInfoInLayout = showExtraInfo && !showForecast;

            return `
                ${showLocationTitle ? `<div class="widget-header" style="text-transform:uppercase;">${location}</div>` : ''}
                <div class="widget-content weather-2x2 ${showLocationTitle ? 'has-title' : 'no-title'}" style="justify-content:${onlyForecast ? 'center' : (showExtraInfoInLayout ? 'center' : 'space-between')};gap:${showExtraInfoInLayout ? '12px' : '6px'};">
                    ${hasCurrentWeather ? `
                        <div class="weather-top-section" style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                ${weatherIcon}
                                ${weatherTemp ? weatherTemp : ''}
                            </div>
                            ${weatherDesc}
                        </div>
                    ` : ''}
                    ${showExtraInfoInLayout ? `
                        <div class="weather-extra-info" style="display:flex;flex-direction:column;gap:5px;font-size:11px;opacity:.9;align-items:center;">
                            <div class="weather-feels-like">Feels: <span>--</span></div>
                            <div class="weather-humidity">Humidity: <span>--</span></div>
                            <div class="weather-wind">Wind: <span>--</span></div>
                        </div>
                    ` : ''}
                    ${showForecast ? forecastStrip : ''}
                </div>
            `;
        } else if (w === 2 && h === 3) {
            // 2x3: Taller layout similar to 2x2 but with more vertical space for 7-day forecast
            const showExtraInfoInLayout = showExtraInfo && !showForecast;

            return `
                ${showLocationTitle ? `<div class="widget-header" style="text-transform:uppercase;">${location}</div>` : ''}
                <div class="widget-content weather-2x2 ${showLocationTitle ? 'has-title' : 'no-title'}" style="justify-content:${onlyForecast ? 'center' : 'flex-start'};">
                    ${hasCurrentWeather ? `
                        <div class="weather-top-section" style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                ${weatherIcon}
                                ${weatherTemp ? weatherTemp : ''}
                            </div>
                            ${weatherDesc}
                        </div>
                    ` : ''}
                    ${showExtraInfoInLayout ? extraInfoSection : ''}
                    ${showForecast ? forecastStrip : ''}
                </div>
            `;
        } else if ((w === 3 || w === 4) && h === 1) {
            // 3x1 and 4x1 LAYOUTS
            if (w === 3) {
                // 3x1: Simple horizontal layout with larger forecast icons
                return `
                    <div class="widget-content weather-compact">
                        ${hasCurrentWeather ? `
                            <div class="weather-compact-top">
                                ${showLocationTitle ? `<span class="compact-title">${location}</span>` : ''}
                                ${showIcon ? `<span class="weather-icon iconify compact-icon" data-icon="mdi:weather-cloudy"></span>` : ''}
                                ${showDegrees ? `<div class="weather-temp compact-temp">Loading...</div>` : ''}
                            </div>
                        ` : ''}
                        ${showForecast ? forecastStrip : ''}
                    </div>
                `;
            } else {
                // 4x1: Special left/right section layouts
                const showExtraInfoInLayout = showExtraInfo && !showForecast;

                if (showForecast && numForecastDays === 3) {
                    // 3-day forecast: left section (location, icon/degrees, description) + right section (forecast)
                    return `
                        <div class="widget-content weather-compact" style="display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:12px;padding:4px 8px;">
                            <div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;flex-shrink:0;">
                                ${showLocationTitle ? `<div style="font-size:10px;font-weight:600;opacity:.9;text-transform:uppercase;">${location}</div>` : ''}
                                ${hasCurrentWeather ? `<div style="display:flex;align-items:center;gap:5px;">
                                    ${showIcon ? `<span class="weather-icon iconify" data-icon="mdi:weather-cloudy" style="font-size:14px;opacity:.9;"></span>` : ''}
                                    ${showDegrees ? `<div class="weather-temp" style="font-size:13px;font-weight:600;">Loading...</div>` : ''}
                                </div>` : ''}
                                ${showDescription ? `<div class="weather-desc" style="font-size:9px;opacity:.85;"></div>` : ''}
                            </div>
                            <div style="display:flex;gap:6px;flex-shrink:0;">
                                ${forecastStrip}
                            </div>
                        </div>
                    `;
                } else if (showForecast && numForecastDays === 7) {
                    // 7-day forecast: compact top row + single-row forecast
                    return `
                        <div class="widget-content weather-compact" style="display:flex;flex-direction:column;gap:3px;padding:3px 6px;justify-content:center;">
                            ${hasCurrentWeather || showLocationTitle ? `<div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;">
                                ${showLocationTitle ? `<span style="font-size:9px;font-weight:600;opacity:.9;text-transform:uppercase;">${location}</span>` : ''}
                                ${showIcon ? `<span class="weather-icon iconify" data-icon="mdi:weather-cloudy" style="font-size:12px;opacity:.9;"></span>` : ''}
                                ${showDegrees ? `<div class="weather-temp" style="font-size:11px;font-weight:600;">Loading...</div>` : ''}
                            </div>` : ''}
                            ${forecastStrip}
                        </div>
                    `;
                } else if (showExtraInfoInLayout) {
                    // Extra info layout: left section (weather) + right section (extra info)
                    return `
                        <div class="widget-content weather-compact" style="display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:12px;padding:4px 8px;">
                            <div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;flex-shrink:0;">
                                ${showLocationTitle ? `<div style="font-size:10px;font-weight:600;opacity:.9;text-transform:uppercase;">${location}</div>` : ''}
                                ${hasCurrentWeather ? `<div style="display:flex;align-items:center;gap:5px;">
                                    ${showIcon ? `<span class="weather-icon iconify" data-icon="mdi:weather-cloudy" style="font-size:14px;opacity:.9;"></span>` : ''}
                                    ${showDegrees ? `<div class="weather-temp" style="font-size:13px;font-weight:600;">Loading...</div>` : ''}
                                </div>` : ''}
                                ${showDescription ? `<div class="weather-desc" style="font-size:9px;opacity:.85;"></div>` : ''}
                            </div>
                            <div class="weather-extra-info" style="display:flex;gap:8px;font-size:9px;opacity:.9;flex-shrink:0;">
                                <div class="weather-feels-like" style="white-space:nowrap;"><span>--</span></div>
                                <div class="weather-humidity" style="white-space:nowrap;"><span>--</span></div>
                                <div class="weather-wind" style="white-space:nowrap;"><span>--</span></div>
                            </div>
                        </div>
                    `;
                } else {
                    // Default 4x1 layout
                    return `
                        <div class="widget-content weather-compact">
                            ${hasCurrentWeather ? `
                                <div class="weather-compact-top">
                                    ${showLocationTitle ? `<span class="compact-title">${location}</span>` : ''}
                                    ${showIcon ? `<span class="weather-icon iconify compact-icon" data-icon="mdi:weather-cloudy"></span>` : ''}
                                    ${showDegrees ? `<div class="weather-temp compact-temp">Loading...</div>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }
            }
        } else if (w === 3 || w === 4) {
            // WIDE LAYOUTS (3x2, 3x3, 4x2, 4x3)
            // At 3x3 and 4x3, extra info goes on right side of top row
            const showExtraInfoInLayout = showExtraInfo && (!showForecast || h >= 3);

            if (h >= 3) {
                // 3x3 and 4x3: Extra info on right side of top row
                return `
                    ${showLocationTitle ? `<div class="widget-header" style="text-transform:uppercase;">${location}</div>` : ''}
                    <div class="widget-content weather-wide ${showLocationTitle ? 'has-title' : 'no-title'}" style="justify-content:${onlyForecast ? 'center' : 'flex-start'};">
                        ${hasCurrentWeather ? `
                            <div class="weather-main-row" style="display:flex;align-items:center;justify-content:space-between;gap:${w === 4 ? '16px' : '12px'};flex-shrink:0;width:100%;">
                                <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                                    <div style="display:flex;align-items:center;gap:${w === 4 ? '12px' : '10px'};justify-content:center;">
                                        ${weatherIcon}
                                        ${weatherTemp ? weatherTemp : ''}
                                    </div>
                                    ${weatherDesc}
                                </div>
                                ${showExtraInfoInLayout ? `<div class="weather-extra-info" style="display:flex;flex-direction:column;gap:${w === 4 ? '4px' : '3px'};font-size:${w === 4 ? '11px' : '10px'};opacity:.9;flex-shrink:0;">
                                    <div class="weather-feels-like">Feels: <span>--</span></div>
                                    <div class="weather-humidity">Humidity: <span>--</span></div>
                                    <div class="weather-wind">Wind: <span>--</span></div>
                                </div>` : ''}
                            </div>
                        ` : ''}
                        ${showForecast ? forecastStrip : ''}
                    </div>
                `;
            } else if (w === 4 && h === 2) {
                // 4x2: Special layouts based on forecast and extra info
                const showExtraInfoInLayout4x2 = showExtraInfo && numForecastDays <= 7;

                if (numForecastDays === 3 && showExtraInfoInLayout4x2) {
                    // 3-day with extra info: left section (icon/degrees/desc) + right section (extra info)
                    return `
                        ${showLocationTitle ? `<div class="widget-header" style="text-transform:uppercase;">${location}</div>` : ''}
                        <div class="widget-content weather-wide ${showLocationTitle ? 'has-title' : 'no-title'}" style="display:flex;flex-direction:column;gap:8px;">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-shrink:0;width:100%;">
                                ${hasCurrentWeather ? `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
                                    <div style="display:flex;align-items:center;gap:10px;justify-content:center;">
                                        ${weatherIcon}
                                        ${weatherTemp ? weatherTemp : ''}
                                    </div>
                                    ${weatherDesc}
                                </div>` : ''}
                                <div class="weather-extra-info" style="display:flex;flex-direction:column;gap:4px;font-size:11px;opacity:.9;flex-shrink:0;">
                                    <div class="weather-feels-like">Feels: <span>--</span></div>
                                    <div class="weather-humidity">Humidity: <span>--</span></div>
                                    <div class="weather-wind">Wind: <span>--</span></div>
                                </div>
                            </div>
                            ${forecastStrip}
                        </div>
                    `;
                } else if (numForecastDays === 3 && !showExtraInfo) {
                    // 3-day without extra info: description in same row as icon/degrees
                    return `
                        ${showLocationTitle ? `<div class="widget-header" style="text-transform:uppercase;">${location}</div>` : ''}
                        <div class="widget-content weather-wide ${showLocationTitle ? 'has-title' : 'no-title'}" style="display:flex;flex-direction:column;gap:8px;">
                            ${hasCurrentWeather ? `<div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-shrink:0;">
                                ${weatherDesc}
                                ${weatherIcon}
                                ${weatherTemp ? weatherTemp : ''}
                            </div>` : ''}
                            ${forecastStrip}
                        </div>
                    `;
                } else if (numForecastDays === 7 && showExtraInfoInLayout4x2) {
                    // 7-day with extra info: similar to 3-day, but 7-day forecast in single row
                    return `
                        ${showLocationTitle ? `<div class="widget-header" style="text-transform:uppercase;">${location}</div>` : ''}
                        <div class="widget-content weather-wide ${showLocationTitle ? 'has-title' : 'no-title'}" style="display:flex;flex-direction:column;gap:6px;">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-shrink:0;width:100%;">
                                ${hasCurrentWeather ? `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
                                    <div style="display:flex;align-items:center;gap:10px;justify-content:center;">
                                        ${weatherIcon}
                                        ${weatherTemp ? weatherTemp : ''}
                                    </div>
                                    ${weatherDesc}
                                </div>` : ''}
                                <div class="weather-extra-info" style="display:flex;flex-direction:column;gap:4px;font-size:11px;opacity:.9;flex-shrink:0;">
                                    <div class="weather-feels-like">Feels: <span>--</span></div>
                                    <div class="weather-humidity">Humidity: <span>--</span></div>
                                    <div class="weather-wind">Wind: <span>--</span></div>
                                </div>
                            </div>
                            ${forecastStrip}
                        </div>
                    `;
                } else if (numForecastDays === 7 && !showExtraInfo) {
                    // 7-day without extra info: description in same row as icon/degrees
                    return `
                        ${showLocationTitle ? `<div class="widget-header" style="text-transform:uppercase;">${location}</div>` : ''}
                        <div class="widget-content weather-wide ${showLocationTitle ? 'has-title' : 'no-title'}" style="display:flex;flex-direction:column;gap:6px;">
                            ${hasCurrentWeather ? `<div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-shrink:0;">
                                ${weatherDesc}
                                ${weatherIcon}
                                ${weatherTemp ? weatherTemp : ''}
                            </div>` : ''}
                            ${forecastStrip}
                        </div>
                    `;
                } else {
                    // Default 4x2 layout (no forecast or other cases)
                    return `
                        ${showLocationTitle ? `<div class="widget-header" style="text-transform:uppercase;">${location}</div>` : ''}
                        <div class="widget-content weather-wide ${showLocationTitle ? 'has-title' : 'no-title'}" style="justify-content:${onlyForecast ? 'center' : 'flex-start'};">
                            ${hasCurrentWeather ? `
                                <div class="weather-main-row" style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;">
                                    <div style="display:flex;align-items:center;gap:12px;justify-content:center;">
                                        ${weatherIcon}
                                        ${weatherTemp ? weatherTemp : ''}
                                    </div>
                                    ${weatherDesc}
                                </div>
                            ` : ''}
                            ${showForecast ? forecastStrip : ''}
                        </div>
                    `;
                }
            } else {
                // 3x2: Simpler centered layout
                return `
                    ${showLocationTitle ? `<div class="widget-header" style="text-transform:uppercase;">${location}</div>` : ''}
                    <div class="widget-content weather-wide ${showLocationTitle ? 'has-title' : 'no-title'}" style="justify-content:${onlyForecast ? 'center' : 'flex-start'};">
                        ${hasCurrentWeather ? `
                            <div class="weather-main-row" style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;">
                                <div style="display:flex;align-items:center;gap:10px;justify-content:center;">
                                    ${weatherIcon}
                                    ${weatherTemp ? weatherTemp : ''}
                                </div>
                                ${weatherDesc}
                            </div>
                        ` : ''}
                        ${showForecast ? forecastStrip : ''}
                    </div>
                `;
            }
        } else {
            // Fallback
            return `<div class="widget-content">Loading...</div>`;
        }
    },

    getWeatherIcon: function(conditionText, isDay) {
        const condition = (conditionText || '').toLowerCase();

        if (condition.includes('partly cloudy')) {
            return isDay ? 'mdi:weather-partly-cloudy' : 'mdi:weather-night-partly-cloudy';
        }
        if (condition.includes('sunny') || condition.includes('clear')) {
            return isDay ? 'mdi:weather-sunny' : 'mdi:weather-night';
        }
        if (condition.includes('thunder') || condition.includes('storm')) return 'mdi:weather-lightning-rainy';
        if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) return 'mdi:weather-rainy';
        if (condition.includes('snow') || condition.includes('blizzard')) return 'mdi:weather-snowy';
        if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze')) return 'mdi:weather-fog';
        if (condition.includes('wind')) return 'mdi:weather-windy';
        if (condition.includes('cloudy') || condition.includes('overcast')) return 'mdi:weather-cloudy';

        return 'mdi:weather-cloudy';
    },

    generateDummyForecast: function(startIndex, count) {
        // Generate dummy forecast data for days beyond the API limit
        const dummyConditions = [
            { text: 'Partly cloudy', icon: 'mdi:weather-partly-cloudy' },
            { text: 'Sunny', icon: 'mdi:weather-sunny' },
            { text: 'Cloudy', icon: 'mdi:weather-cloudy' },
            { text: 'Light rain', icon: 'mdi:weather-rainy' },
            { text: 'Overcast', icon: 'mdi:weather-cloudy' }
        ];

        const dummy = [];
        const today = new Date();

        for (let i = 0; i < count; i++) {
            const dayOffset = startIndex + i;
            const date = new Date(today);
            date.setDate(date.getDate() + dayOffset);

            const condition = dummyConditions[i % dummyConditions.length];
            const baseTemp = 15;
            const variance = Math.sin(i) * 5;

            dummy.push({
                label: date.toLocaleDateString(undefined, { weekday: 'short' }),
                hi: Math.round(baseTemp + variance + 5),
                lo: Math.round(baseTemp + variance - 3),
                desc: condition.text,
                icon: condition.icon
            });
        }

        return dummy;
    },

    fetchWeatherData: async function(location, settings = {}) {
        const key = String(location);
        const now = Date.now();
        const lastFetch = this.lastUpdate[key] || 0;
        const forceUpdate = settings.forceUpdate === true;

        // Determine how many days to request from API
        const forecastDays = settings.forecastDays || 'none';
        let requestDays = 3; // Always request at least 3 days

        if (forecastDays !== 'none') {
            const numDays = parseInt(forecastDays, 10) || 3;
            // Free tier is limited to 3 days, but we'll request it anyway for when upgraded
            requestDays = Math.min(numDays, 3); // Currently limited to 3 for free tier
        }

        // Use cache if still fresh
        if (!forceUpdate && now - lastFetch < this.TTL_MS && lastFetch !== 0) {
            return this.cachedData[key] || null;
        }

        try {
            const query = encodeURIComponent(location);
            const url = `${BASE_URL}weather.php?city=${query}&days=${requestDays}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();

            // Current weather
            const current = data.current || {};
            const isDay = current.is_day === 1;
            const currentIcon = this.getWeatherIcon(current?.condition?.text || '', isDay);

            // Build forecast from API (first 3 days)
            const f = (data.forecast && data.forecast.forecastday) ? data.forecast.forecastday.slice(0, 3) : [];
            const forecastDays = f.map((d, idx) => {
                const dateObj = new Date(d.date + 'T00:00:00');
                const label = idx === 0 ? 'Today' : dateObj.toLocaleDateString(undefined, { weekday: 'short' });
                const hi = Math.round(d.day?.maxtemp_c ?? NaN);
                const lo = Math.round(d.day?.mintemp_c ?? NaN);
                const desc = d.day?.condition?.text || '';
                const icon = this.getWeatherIcon(desc, true);
                return { label, hi, lo, desc, icon };
            });

            // Add dummy data for days 4-14 if needed
            const requestedDays = parseInt(settings.forecastDays, 10) || 0;
            if (requestedDays > 3) {
                const dummyDays = this.generateDummyForecast(3, requestedDays - 3);
                forecastDays.push(...dummyDays);
            }

            const weatherData = {
                temp: isFinite(current.temp_c) ? Math.round(current.temp_c) + '°C' : '--°C',
                desc: current?.condition?.text || '',
                isDay,
                feelsLike: isFinite(current.feelslike_c) ? Math.round(current.feelslike_c) + '°C' : '--°C',
                humidity: (current.humidity != null) ? current.humidity + '%' : '--',
                windSpeed: isFinite(current.wind_kph) ? Math.round(current.wind_kph) + ' km/h' : '-- km/h',
                icon: currentIcon,
                forecastDays
            };

            this.cachedData[key] = weatherData;
            this.lastUpdate[key] = now;
            return weatherData;
        } catch (err) {
            console.error('Weather fetch error:', err);
            return {
                error: true,
                temp: '--°C',
                desc: 'Unable to load weather',
                feelsLike: '--°C',
                humidity: '--',
                windSpeed: '-- km/h',
                icon: 'mdi:weather-cloudy',
                forecastDays: []
            };
        }
    },

    update: async function(element, settings = {}) {
        if (!element) return;

        const location = settings.location || 'Copenhagen';
        const data = await this.fetchWeatherData(location, settings);
        if (!data) return;

        // Update current weather
        const tempEl = element.querySelector('.weather-temp');
        const descEl = element.querySelector('.weather-desc');
        const iconEl = element.querySelector('.weather-icon');

        if (tempEl) tempEl.textContent = data.temp;
        if (descEl) descEl.textContent = data.desc || '';
        if (iconEl && data.icon) iconEl.setAttribute('data-icon', data.icon);

        // Update extra info (if visible)
        const feelsLikeEl = element.querySelector('.weather-feels-like span');
        const humidityEl = element.querySelector('.weather-humidity span');
        const windEl = element.querySelector('.weather-wind span');

        if (feelsLikeEl) feelsLikeEl.textContent = data.feelsLike || '--°C';
        if (humidityEl) humidityEl.textContent = data.humidity || '--';
        if (windEl) windEl.textContent = data.windSpeed || '-- km/h';

        // Update forecast strip (if visible)
        const strip = element.querySelector('.weather-forecast-strip');
        if (strip && data.forecastDays?.length) {
            const dayEls = strip.querySelectorAll('.wf-day');
            data.forecastDays.forEach((d, i) => {
                const el = dayEls[i];
                if (!el) return;

                const lbl = el.querySelector('.wf-label');
                const icon = el.querySelector('.wf-icon');
                const hi = el.querySelector('.hi');
                const lo = el.querySelector('.lo');

                if (lbl) lbl.textContent = d.label;
                if (icon && d.icon) icon.setAttribute('data-icon', d.icon);
                if (hi) hi.textContent = Number.isFinite(d.hi) ? `${d.hi}°` : '--';
                if (lo) lo.textContent = Number.isFinite(d.lo) ? `${d.lo}°` : '--';

                // Tooltip with description
                el.setAttribute('title', d.desc || '');
            });
        }
    }
};
