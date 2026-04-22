// Calendar Widget
window.TrueTab = window.TrueTab || {};
window.TrueTab.widgetModules = window.TrueTab.widgetModules || {};

window.TrueTab.widgetModules.calendar = {
    // Store calendar events (will be loaded from settings or API)
    events: {},
    // Store current viewing state per widget
    viewState: {},

    // Helper to format date key as YYYY-MM-DD
    formatDateKey: function(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    },

    // Helper to get events for a specific date
    getEventsForDate: function(year, month, day) {
        const key = this.formatDateKey(year, month, day);
        return this.events[key] || [];
    },

    render: function(settings = {}, widgetSize = '3x2') {
        const viewMode = settings.viewMode || 'grid'; // 'grid' or 'today'
        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Parse widget size for responsive scaling
        const [width, height] = widgetSize.split('x').map(Number);

        // Get weekday and month names
        const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
        const monthFull = now.toLocaleDateString('en-US', { month: 'long' });
        const monthShort = monthFull.slice(0, 3);

        // Demo events (will be replaced with real calendar integration)
        this.events = settings.events || {
            [`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`]: [{ title: 'Team Meeting', time: '10:00 AM' }],
            [`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-20`]: [{ title: 'Lunch with Sarah', time: '12:30 PM' }],
            [this.formatDateKey(currentYear, currentMonth, currentDay)]: [
                { title: 'Project Review', time: '3:00 PM' },
                { title: 'Dentist Appointment', time: '5:00 PM' }
            ]
        };

        if (viewMode === 'today') {
            // Today-only view
            const todayEvents = this.getEventsForDate(currentYear, currentMonth, currentDay);

            // Size-based font adjustments
            let eventFontSize = '';
            let timeFontSize = '';
            if (width === 2) {
                eventFontSize = 'font-size: 10px;';
                timeFontSize = 'font-size: 9px;';
            }

            const eventsHtml = todayEvents.map(event => `
                <div class="calendar-event-item">
                    <span class="calendar-event-title" style="${eventFontSize}">${event.title}</span>
                    <span class="calendar-event-time" style="${timeFontSize}">${event.time}</span>
                </div>
            `).join('');

            // Hide header for 1-tall widgets
            const showHeader = height > 1;
            const headerHtml = showHeader ? `<div class="widget-header">${weekday}, ${monthShort} ${currentDay}</div>` : '';

            return `
                ${headerHtml}
                <div class="widget-content calendar-events-content">
                    ${todayEvents.length > 0 ? eventsHtml : '<div class="calendar-no-events">No events today</div>'}
                </div>
            `;
        } else {
            // Grid view - show calendar grid
            return this.renderGridView(currentYear, currentMonth, currentDay, settings, width, height);
        }
    },

    // Shared function to render scrollable month grid (used by 3x2, 3x3, 4x3)
    renderScrollableMonthGrid: function(year, month, settings = {}) {
        const showEventGlow = settings.showEventGlow !== false;

        // Dynamic infinite scrolling: generate prev 4 + current + next 4 = 9 months
        const monthsToRender = [];
        const currentMonthIndex = 4; // Current month is always at index 4

        for (let offset = -4; offset <= 4; offset++) {
            const date = new Date(year, month, 1);
            date.setMonth(date.getMonth() + offset);
            monthsToRender.push({
                year: date.getFullYear(),
                month: date.getMonth()
            });
        }

        // Generate HTML for each month using helper function
        const monthsHtml = monthsToRender.map(monthData => this.generateMonthSlide(monthData, settings)).join('');

        return {
            monthsHtml,
            monthsToRender,
            currentMonthIndex,
            showEventGlow
        };
    },

    renderCompactView: function(year, month, currentDay, settings = {}, _width = 2, height = 2) {
        const showEventGlow = settings.showEventGlow !== false;

        if (height === 2) {
            // 2x2: Full month grid (same as 2x3 but no events list)
            // Dynamic infinite scrolling: generate prev 4 + current + next 4 = 9 months
            const monthsToRender = [];
            const currentMonthIndex = 4; // Current month is always at index 4

            for (let offset = -4; offset <= 4; offset++) {
                const date = new Date(year, month, 1);
                date.setMonth(date.getMonth() + offset);
                monthsToRender.push({
                    year: date.getFullYear(),
                    month: date.getMonth()
                });
            }

            // Generate HTML for each month - add calendar-2x2-month-slide class for specific styling
            const monthsHtml = monthsToRender.map(monthData => {
                const slide = this.generateMonthSlide(monthData, settings);
                // Add 2x2-specific class
                return slide.replace('class="calendar-month-slide"', 'class="calendar-month-slide calendar-2x2-month-slide"')
                            .replace('class="calendar-days-grid"', 'class="calendar-days-grid calendar-2x2-days-grid"');
            }).join('');

            return `
                <div class="calendar-2x2-container" data-size="2x2" data-event-glow="${showEventGlow}">
                    <div class="calendar-scroll-container calendar-2x2-scroll" data-current-index="${currentMonthIndex}" data-event-glow="${showEventGlow}">
                        <div class="calendar-months-wrapper">
                            ${monthsHtml}
                        </div>
                    </div>
                </div>
            `;
        } else if (height === 3) {
            // 2x3: Full month grid (like 3x3) + events list at bottom
            // Dynamic infinite scrolling: generate prev 4 + current + next 4 = 9 months
            const monthsToRender = [];
            const currentMonthIndex = 4; // Current month is always at index 4

            for (let offset = -4; offset <= 4; offset++) {
                const date = new Date(year, month, 1);
                date.setMonth(date.getMonth() + offset);
                monthsToRender.push({
                    year: date.getFullYear(),
                    month: date.getMonth()
                });
            }

            // Generate HTML for each month - add calendar-2x3-month-slide class for specific styling
            const monthsHtml = monthsToRender.map(monthData => {
                const slide = this.generateMonthSlide(monthData, settings);
                // Add 2x3-specific class
                return slide.replace('class="calendar-month-slide"', 'class="calendar-month-slide calendar-2x3-month-slide"')
                            .replace('class="calendar-days-grid"', 'class="calendar-days-grid calendar-2x3-days-grid"');
            }).join('');

            // Generate events list
            const eventsListHtml = this.renderMonthEventsList(month, year);

            return `
                <div class="calendar-2x3-container" data-size="2x3" data-event-glow="${showEventGlow}">
                    <div class="calendar-scroll-container calendar-2x3-scroll" data-current-index="${currentMonthIndex}">
                        <div class="calendar-months-wrapper">
                            ${monthsHtml}
                        </div>
                    </div>
                    <div class="calendar-events-section">
                        ${eventsListHtml}
                    </div>
                </div>
            `;
        }
    },

    render3x3WithEventsList: function(year, month, _currentDay, settings = {}) {
        const gridData = this.renderScrollableMonthGrid(year, month, settings);
        const eventsListHtml = this.renderMonthEventsList(month, year);

        return `
            <div class="calendar-3x3-container" data-event-glow="${gridData.showEventGlow}">
                <div class="calendar-3x3-grid-section">
                    <div class="calendar-scroll-container" data-event-glow="${gridData.showEventGlow}" data-month-count="${gridData.monthsToRender.length}" data-current-index="${gridData.currentMonthIndex}">
                        <div class="calendar-months-wrapper">
                            ${gridData.monthsHtml}
                        </div>
                    </div>
                </div>
                <div class="calendar-events-section">
                    ${eventsListHtml}
                </div>
            </div>
        `;
    },

    render4x3SpecialLayout: function(year, month, _currentDay, settings = {}) {
        const gridData = this.renderScrollableMonthGrid(year, month, settings);
        const now = new Date();

        // Today cover section - simplified without label and event count
        const todayDate = now;
        const todayWeekday = todayDate.toLocaleDateString('en-US', { weekday: 'long' });
        const todayMonthName = todayDate.toLocaleDateString('en-US', { month: 'long' });
        const todayDayNum = todayDate.getDate();

        const todayCoverHtml = `
            <div class="calendar-today-cover">
                <div class="calendar-today-weekday">${todayWeekday}</div>
                <div class="calendar-today-day">${todayDayNum}</div>
                <div class="calendar-today-month">${todayMonthName}</div>
            </div>
        `;

        const eventsListHtml = this.renderMonthEventsList(month, year);

        return `
            <div class="calendar-4x3-container" data-event-glow="${gridData.showEventGlow}">
                <div class="calendar-4x3-top-section">
                    <div class="calendar-4x3-grid-section">
                        <div class="calendar-scroll-container" data-event-glow="${gridData.showEventGlow}" data-month-count="${gridData.monthsToRender.length}" data-current-index="${gridData.currentMonthIndex}">
                            <div class="calendar-months-wrapper">
                                ${gridData.monthsHtml}
                            </div>
                        </div>
                    </div>
                    <div class="calendar-4x3-separator"></div>
                    <div class="calendar-4x3-today-section">
                        ${todayCoverHtml}
                    </div>
                </div>
                <div class="calendar-events-section">
                    ${eventsListHtml}
                </div>
            </div>
        `;
    },

    renderMonthEventsList: function(_month, _year) {
        // Standardized event list: show upcoming events from today for next 31 days
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const events = [];

        // Iterate through next 31 days starting from today
        for (let i = 0; i < 31; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);

            const day = currentDate.getDate();
            const eventMonth = currentDate.getMonth();
            const eventYear = currentDate.getFullYear();

            const dayEvents = this.getEventsForDate(eventYear, eventMonth, day);
            if (dayEvents.length > 0) {
                dayEvents.forEach(event => {
                    events.push({
                        day: day,
                        title: event.title,
                        time: event.time,
                        month: eventMonth,
                        year: eventYear,
                        date: currentDate
                    });
                });
            }
        }

        if (events.length === 0) {
            return '<div class="calendar-events-empty">No upcoming events</div>';
        }

        const eventsHtml = events.map(event => `
            <div class="calendar-event-list-item" data-day="${event.day}" data-month="${event.month}" data-year="${event.year}">
                <div class="calendar-event-list-day">${event.day}</div>
                <div class="calendar-event-list-details">
                    <div class="calendar-event-list-title">${event.title}</div>
                    <div class="calendar-event-list-time">${event.time}</div>
                </div>
            </div>
        `).join('');

        return `<div class="calendar-events-list">${eventsHtml}</div>`;
    },

    // Helper function to generate a single month slide HTML
    generateMonthSlide: function(monthData, settings = {}) {
        const showYear = settings.showYear || false;
        const showEventGlow = settings.showEventGlow !== false;
        const showArrows = settings.showArrows || false;
        const fullWeekdayNames = settings.fullWeekdayNames || false;
        const showWeekNumber = settings.showWeekNumber || false;
        const now = new Date();

        const monthName = new Date(monthData.year, monthData.month).toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
        const daysInMonth = new Date(monthData.year, monthData.month + 1, 0).getDate();
        const firstDayOfMonth = new Date(monthData.year, monthData.month, 1).getDay();
        const displayDay = (monthData.month === now.getMonth() && monthData.year === now.getFullYear()) ? now.getDate() : -1;

        // Calculate optimal week start to fit in 5 weeks (35 days)
        let bestStartDay = 0; // Sunday by default
        let minWeeks = 7;

        for (let startDay = 0; startDay < 7; startDay++) {
            let emptyBefore = (firstDayOfMonth - startDay + 7) % 7;
            let totalCells = emptyBefore + daysInMonth;
            let weeksNeeded = Math.ceil(totalCells / 7);

            if (weeksNeeded < minWeeks) {
                minWeeks = weeksNeeded;
                bestStartDay = startDay;
                if (weeksNeeded <= 5) break;
            }
        }

        // Generate weekday labels
        const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const dayNamesFull = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayNames = fullWeekdayNames ? dayNamesFull : dayNamesShort;
        const weekdayLabels = [];
        for (let i = 0; i < 7; i++) {
            weekdayLabels.push(dayNames[(bestStartDay + i) % 7]);
        }

        // Create day cells
        let daysCells = '';

        // Add previous month days
        const emptyBefore = (firstDayOfMonth - bestStartDay + 7) % 7;
        if (emptyBefore > 0) {
            const prevMonthDate = new Date(monthData.year, monthData.month, 0);
            const prevMonthDays = prevMonthDate.getDate();
            const prevMonth = prevMonthDate.getMonth();
            const prevYear = prevMonthDate.getFullYear();

            for (let i = emptyBefore - 1; i >= 0; i--) {
                const prevDay = prevMonthDays - i;
                const hasEvents = this.getEventsForDate(prevYear, prevMonth, prevDay).length > 0;

                daysCells += `
                    <div class="calendar-day-cell faded-day ${hasEvents ? 'has-events' : ''}" data-day="${prevDay}" data-month="${prevMonth}" data-year="${prevYear}">
                        <div class="calendar-day-number">${prevDay}</div>
                    </div>
                `;
            }
        }

        // Add current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === displayDay;
            const hasEvents = this.getEventsForDate(monthData.year, monthData.month, day).length > 0;

            daysCells += `
                <div class="calendar-day-cell ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''}" data-day="${day}" data-month="${monthData.month}" data-year="${monthData.year}">
                    <div class="calendar-day-number">${day}</div>
                </div>
            `;
        }

        // Add next month days to fill remaining cells
        const totalCellsUsed = emptyBefore + daysInMonth;
        const minCells = 35; // 5 rows minimum
        const remainingCells = totalCellsUsed < minCells ? minCells - totalCellsUsed : (totalCellsUsed % 7 === 0 ? 0 : 7 - (totalCellsUsed % 7));

        if (remainingCells > 0) {
            const nextMonthDate = new Date(monthData.year, monthData.month + 1, 1);
            const nextMonth = nextMonthDate.getMonth();
            const nextYear = nextMonthDate.getFullYear();

            for (let i = 1; i <= remainingCells; i++) {
                const hasEvents = this.getEventsForDate(nextYear, nextMonth, i).length > 0;

                daysCells += `
                    <div class="calendar-day-cell faded-day ${hasEvents ? 'has-events' : ''}" data-day="${i}" data-month="${nextMonth}" data-year="${nextYear}">
                        <div class="calendar-day-number">${i}</div>
                    </div>
                `;
            }
        }

        // Week number
        let weekNumberHtml = '';
        if (showWeekNumber) {
            const firstDay = new Date(monthData.year, monthData.month, 1);
            const weekNum = this.getWeekNumber(firstDay);
            weekNumberHtml = `<div class="calendar-week-number">W${weekNum}</div>`;
        }

        return `
            <div class="calendar-month-slide" data-month="${monthData.month}" data-year="${monthData.year}">
                <div class="calendar-header">
                    ${showArrows ? '<button class="calendar-nav-btn calendar-prev-month" aria-label="Previous month">←</button>' : '<span></span>'}
                    <span class="calendar-month-year">${monthName}${showYear ? ' ' + monthData.year : ''}</span>
                    ${showArrows ? '<button class="calendar-nav-btn calendar-next-month" aria-label="Next month">→</button>' : '<span></span>'}
                </div>
                <div class="calendar-grid-with-weeks">
                    ${showWeekNumber ? weekNumberHtml : ''}
                    <div class="calendar-weekday-labels">
                        ${weekdayLabels.map(day => `<div class="calendar-weekday-label">${day}</div>`).join('')}
                    </div>
                    <div class="calendar-days-grid">
                        ${daysCells}
                    </div>
                </div>
            </div>
        `;
    },

    renderGridView: function(year, month, currentDay, settings = {}, width = 3, height = 2) {
        // For 2-wide widgets, use compact layout
        if (width === 2) {
            return this.renderCompactView(year, month, currentDay, settings, width, height);
        }

        // For 3x3, render with events list
        if (width === 3 && height === 3) {
            return this.render3x3WithEventsList(year, month, currentDay, settings);
        }

        // For 4x3, render special layout with calendar left, today cover right, events below
        if (width === 4 && height === 3) {
            return this.render4x3SpecialLayout(year, month, currentDay, settings);
        }

        const showEventGlow = settings.showEventGlow !== false;

        // Dynamic infinite scrolling: generate prev 4 + current + next 4 = 9 months
        const monthsToRender = [];
        const currentMonthIndex = 4; // Current month is always at index 4

        for (let offset = -4; offset <= 4; offset++) {
            const date = new Date(year, month, 1);
            date.setMonth(date.getMonth() + offset);
            monthsToRender.push({
                year: date.getFullYear(),
                month: date.getMonth()
            });
        }

        // Generate HTML for each month using helper function
        const monthsHtml = monthsToRender.map(monthData => this.generateMonthSlide(monthData, settings)).join('');

        return `
            <div class="calendar-scroll-container" data-event-glow="${showEventGlow}" data-month-count="${monthsToRender.length}" data-current-index="${currentMonthIndex}">
                <div class="calendar-months-wrapper">
                    ${monthsHtml}
                </div>
            </div>
        `;
    },

    renderDayView: function(day, month, year, settings = {}) {
        const dayEvents = this.getEventsForDate(year, month, day);
        const eventsHtml = dayEvents.map(event => `
            <div class="calendar-event-item">
                <span class="calendar-event-title">${event.title}</span>
                <span class="calendar-event-time">${event.time}</span>
            </div>
        `).join('');

        const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
        const showYear = settings.showYear || false;

        return `
            <div class="calendar-day-view" data-day="${day}" data-month="${month}" data-year="${year}">
                <div class="calendar-day-view-header">
                    <button class="calendar-back-btn" aria-label="Back to calendar">←</button>
                    <span class="calendar-month-year">${monthName}${showYear ? ' ' + year : ''}</span>
                    <button class="calendar-create-btn" aria-label="Create event">+</button>
                </div>
                <div class="calendar-events-content">
                    ${dayEvents.length > 0 ? eventsHtml : '<div class="calendar-no-events">No events this day</div>'}
                </div>
            </div>
        `;
    },

    setup: function(element, editMode, settings = {}) {
        if (editMode) return;

        const viewMode = settings.viewMode || 'grid';
        if (viewMode !== 'grid') return; // Only set up interactions for grid view

        const widgetId = element.id || 'calendar-default';
        const now = new Date();

        // Initialize view state if not exists
        if (!this.viewState[widgetId]) {
            this.viewState[widgetId] = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                realCurrentMonth: now.getMonth(),
                realCurrentYear: now.getFullYear(),
                realCurrentDay: now.getDate()
            };
        }

        // Scroll to current month position
        const scrollContainer = element.querySelector('.calendar-scroll-container');
        if (scrollContainer) {
            const currentIndex = parseInt(scrollContainer.dataset.currentIndex) || 0;
            const containerWidth = scrollContainer.clientWidth;
            // Scroll to current month instantly without animation
            scrollContainer.style.scrollBehavior = 'auto';
            scrollContainer.scrollLeft = currentIndex * containerWidth;
            // Restore smooth scrolling after a brief delay
            setTimeout(() => {
                scrollContainer.style.scrollBehavior = 'smooth';
            }, 50);

            let scrollTimeout;
            let isAdjustingScroll = false;
            let lastLoadedIndex = 4; // Track which index we last loaded at

            scrollContainer.addEventListener('scroll', () => {
                // Update circle position immediately during scroll (for smooth scrolling)
                this.renderTodayCircleOverlay(element);

                // Skip processing if we're in the middle of adjusting scroll position
                if (isAdjustingScroll) return;

                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    // Get the current view state for this widget
                    const state = this.viewState[widgetId];
                    if (!state) return;

                    // Determine which month is currently centered
                    const slides = scrollContainer.querySelectorAll('.calendar-month-slide');
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const containerCenter = containerRect.left + containerRect.width / 2;

                    let closestSlide = null;
                    let closestDistance = Infinity;
                    let closestIndex = 0;

                    slides.forEach((slide, index) => {
                        const slideRect = slide.getBoundingClientRect();
                        const slideCenter = slideRect.left + slideRect.width / 2;
                        const distance = Math.abs(slideCenter - containerCenter);

                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestSlide = slide;
                            closestIndex = index;
                        }
                    });

                    if (closestSlide) {
                        const newMonth = parseInt(closestSlide.dataset.month);
                        const newYear = parseInt(closestSlide.dataset.year);

                        if (newMonth !== state.currentMonth || newYear !== state.currentYear) {
                            state.currentMonth = newMonth;
                            state.currentYear = newYear;
                        }

                        // Dynamic infinite scrolling: load only at specific edge indices
                        // Only load if we've settled on index 2 or 6 and haven't loaded there yet
                        const monthsWrapper = scrollContainer.querySelector('.calendar-months-wrapper');
                        const totalSlides = slides.length;

                        // Detect widget size from scroll container class
                        const is2x2 = scrollContainer.classList.contains('calendar-2x2-scroll');
                        const is2x3 = scrollContainer.classList.contains('calendar-2x3-scroll');

                        if ((closestIndex === 2 || closestIndex === 3) && lastLoadedIndex !== closestIndex && totalSlides === 9) {
                            // At index 2 or 3, load previous month
                            lastLoadedIndex = closestIndex;
                            isAdjustingScroll = true;

                            const firstSlide = slides[0];
                            const firstMonth = parseInt(firstSlide.dataset.month);
                            const firstYear = parseInt(firstSlide.dataset.year);

                            // Calculate previous month
                            const prevDate = new Date(firstYear, firstMonth, 1);
                            prevDate.setMonth(prevDate.getMonth() - 1);

                            // Generate new month slide with all settings
                            let newSlideHtml = this.generateMonthSlide({
                                year: prevDate.getFullYear(),
                                month: prevDate.getMonth()
                            }, settings);

                            // Apply size-specific classes
                            if (is2x2) {
                                newSlideHtml = newSlideHtml
                                    .replace('class="calendar-month-slide"', 'class="calendar-month-slide calendar-2x2-month-slide"')
                                    .replace('class="calendar-days-grid"', 'class="calendar-days-grid calendar-2x2-days-grid"');
                            } else if (is2x3) {
                                newSlideHtml = newSlideHtml
                                    .replace('class="calendar-month-slide"', 'class="calendar-month-slide calendar-2x3-month-slide"')
                                    .replace('class="calendar-days-grid"', 'class="calendar-days-grid calendar-2x3-days-grid"');
                            }

                            // Temporarily disable scroll snap and smooth scroll
                            const originalScrollSnapType = scrollContainer.style.scrollSnapType;
                            scrollContainer.style.scrollSnapType = 'none';
                            scrollContainer.style.scrollBehavior = 'auto';

                            // Insert at beginning
                            monthsWrapper.insertAdjacentHTML('afterbegin', newSlideHtml);

                            // Remove last slide
                            slides[slides.length - 1].remove();

                            // Adjust scroll position to maintain visual continuity
                            const slideWidth = firstSlide.offsetWidth;
                            scrollContainer.scrollLeft += slideWidth;

                            // Reset lastLoadedIndex after adjustment so next detection works
                            lastLoadedIndex = closestIndex + 1; // We're now at one index higher

                            // Re-enable scroll snap and smooth scrolling after a brief delay
                            setTimeout(() => {
                                scrollContainer.style.scrollSnapType = originalScrollSnapType;
                                scrollContainer.style.scrollBehavior = 'smooth';
                                isAdjustingScroll = false;
                            }, 50);
                        } else if ((closestIndex === 5 || closestIndex === 6) && lastLoadedIndex !== closestIndex && totalSlides === 9) {
                            // At index 5 or 6, load next month
                            lastLoadedIndex = closestIndex;
                            isAdjustingScroll = true;

                            const lastSlide = slides[slides.length - 1];
                            const lastMonth = parseInt(lastSlide.dataset.month);
                            const lastYear = parseInt(lastSlide.dataset.year);

                            // Calculate next month
                            const nextDate = new Date(lastYear, lastMonth, 1);
                            nextDate.setMonth(nextDate.getMonth() + 1);

                            // Generate new month slide with all settings
                            let newSlideHtml = this.generateMonthSlide({
                                year: nextDate.getFullYear(),
                                month: nextDate.getMonth()
                            }, settings);

                            // Apply size-specific classes
                            if (is2x2) {
                                newSlideHtml = newSlideHtml
                                    .replace('class="calendar-month-slide"', 'class="calendar-month-slide calendar-2x2-month-slide"')
                                    .replace('class="calendar-days-grid"', 'class="calendar-days-grid calendar-2x2-days-grid"');
                            } else if (is2x3) {
                                newSlideHtml = newSlideHtml
                                    .replace('class="calendar-month-slide"', 'class="calendar-month-slide calendar-2x3-month-slide"')
                                    .replace('class="calendar-days-grid"', 'class="calendar-days-grid calendar-2x3-days-grid"');
                            }

                            // Temporarily disable scroll snap and smooth scroll
                            const originalScrollSnapType = scrollContainer.style.scrollSnapType;
                            scrollContainer.style.scrollSnapType = 'none';
                            scrollContainer.style.scrollBehavior = 'auto';

                            // Insert at end
                            monthsWrapper.insertAdjacentHTML('beforeend', newSlideHtml);

                            // Remove first slide
                            const firstSlide = slides[0];
                            const slideWidth = firstSlide.offsetWidth;
                            firstSlide.remove();

                            // Adjust scroll position to maintain visual continuity
                            scrollContainer.scrollLeft -= slideWidth;

                            // Reset lastLoadedIndex after adjustment so next detection works
                            lastLoadedIndex = closestIndex - 1; // We're now at one index lower

                            // Re-enable scroll snap and smooth scrolling after a brief delay
                            setTimeout(() => {
                                scrollContainer.style.scrollSnapType = originalScrollSnapType;
                                scrollContainer.style.scrollBehavior = 'smooth';
                                isAdjustingScroll = false;
                            }, 50);
                        }
                    }

                    // Update circle overlay position after scroll settles
                    this.renderTodayCircleOverlay(element);
                }, 150);
            });

            // Initial circle overlay render (delay to ensure scroll positioning completes)
            setTimeout(() => {
                this.renderTodayCircleOverlay(element);
            }, 200);
        }

        // Handle navigation and day cell clicks
        element.addEventListener('click', (e) => {
            // Handle previous month navigation
            const prevBtn = e.target.closest('.calendar-prev-month');
            if (prevBtn) {
                e.preventDefault();
                e.stopPropagation();
                const state = this.viewState[widgetId];
                let newMonth = state.currentMonth - 1;
                let newYear = state.currentYear;

                if (newMonth < 0) {
                    newMonth = 11;
                    newYear--;
                }

                state.currentMonth = newMonth;
                state.currentYear = newYear;
                this.updateCalendarView(element, settings);
                // Update circle overlay after navigation
                setTimeout(() => this.renderTodayCircleOverlay(element), 50);
                return;
            }

            // Handle next month navigation
            const nextBtn = e.target.closest('.calendar-next-month');
            if (nextBtn) {
                e.preventDefault();
                e.stopPropagation();
                const state = this.viewState[widgetId];
                let newMonth = state.currentMonth + 1;
                let newYear = state.currentYear;

                if (newMonth > 11) {
                    newMonth = 0;
                    newYear++;
                }

                state.currentMonth = newMonth;
                state.currentYear = newYear;
                this.updateCalendarView(element, settings);
                // Update circle overlay after navigation
                setTimeout(() => this.renderTodayCircleOverlay(element), 50);
                return;
            }

            // Handle day cell clicks - allow clicking any day (including faded days)
            const dayCell = e.target.closest('.calendar-day-cell');
            if (dayCell) {
                const day = parseInt(dayCell.dataset.day);
                const month = parseInt(dayCell.dataset.month);
                const year = parseInt(dayCell.dataset.year);
                const scrollContainer = element.querySelector('.calendar-scroll-container');
                if (scrollContainer) {
                    scrollContainer.outerHTML = this.renderDayView(day, month, year, settings);
                }
                return;
            }

            // Handle compact day clicks (2x2 layouts)
            const compactDay = e.target.closest('.calendar-compact-day');
            if (compactDay) {
                const day = parseInt(compactDay.dataset.day);
                const month = parseInt(compactDay.dataset.month);
                const year = parseInt(compactDay.dataset.year);
                const compactContainer = element.querySelector('.calendar-compact-container');
                const container2x2 = element.querySelector('.calendar-2x2-container');
                const container2x3 = element.querySelector('.calendar-2x3-container');

                if (compactContainer) {
                    compactContainer.outerHTML = this.renderDayView(day, month, year, settings);
                } else if (container2x2) {
                    container2x2.outerHTML = this.renderDayView(day, month, year, settings);
                } else if (container2x3) {
                    container2x3.outerHTML = this.renderDayView(day, month, year, settings);
                }
                return;
            }

            // Handle event list item clicks (3x3, 4x3 layouts)
            const eventItem = e.target.closest('.calendar-event-list-item');
            if (eventItem) {
                const day = parseInt(eventItem.dataset.day);
                const month = parseInt(eventItem.dataset.month);
                const year = parseInt(eventItem.dataset.year);
                const container3x3 = element.querySelector('.calendar-3x3-container');
                const container4x3 = element.querySelector('.calendar-4x3-container');
                if (container3x3) {
                    container3x3.outerHTML = this.renderDayView(day, month, year, settings);
                } else if (container4x3) {
                    container4x3.outerHTML = this.renderDayView(day, month, year, settings);
                }
                return;
            }

            // Handle back button click
            const backBtn = e.target.closest('.calendar-back-btn');
            if (backBtn) {
                e.preventDefault();
                e.stopPropagation();
                this.updateCalendarView(element, settings);
                return;
            }

            // Handle create event button click
            const createBtn = e.target.closest('.calendar-create-btn');
            if (createBtn) {
                e.preventDefault();
                e.stopPropagation();
                const dayView = element.querySelector('.calendar-day-view');
                if (dayView) {
                    const day = parseInt(dayView.dataset.day);
                    const month = parseInt(dayView.dataset.month);
                    const year = parseInt(dayView.dataset.year);
                    this.showEventCreationModal(day, month, year, element, settings);
                }
                return;
            }
        });
    },

    updateCalendarView: function(element, settings) {
        const widgetId = element.id || 'calendar-default';
        let state = this.viewState[widgetId];

        // If state doesn't exist, reinitialize it with current date
        if (!state) {
            const now = new Date();
            this.viewState[widgetId] = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                realCurrentMonth: now.getMonth(),
                realCurrentYear: now.getFullYear(),
                realCurrentDay: now.getDate()
            };
            state = this.viewState[widgetId];
        }

        // Extract widget size from element classes (span-3x2 format)
        let width = 3, height = 2;
        const spanClass = Array.from(element.classList).find(cls => cls.startsWith('span-'));
        if (spanClass) {
            const sizeMatch = spanClass.match(/span-(\d+)x(\d+)/);
            if (sizeMatch) {
                width = parseInt(sizeMatch[1]);
                height = parseInt(sizeMatch[2]);
            }
        }

        // Determine if we're viewing the current month
        const isCurrentMonth = state.currentMonth === state.realCurrentMonth &&
                              state.currentYear === state.realCurrentYear;
        const currentDay = isCurrentMonth ? state.realCurrentDay : -1;

        // Always render the grid view with the stored state (not just when scroll container exists)
        const dayViewContainer = element.querySelector('.calendar-day-view');
        if (dayViewContainer) {
            // Coming back from day view - replace entire content with grid view
            element.innerHTML = this.renderGridView(
                state.currentYear,
                state.currentMonth,
                currentDay,
                settings,
                width,
                height
            );
            // Re-setup after rendering to restore event listeners
            this.setup(element, false, settings);
            // Render circle overlay after setup and scroll positioning completes
            setTimeout(() => this.renderTodayCircleOverlay(element), 200);
        } else {
            // Already in grid view, update the appropriate container
            const scrollContainer = element.querySelector('.calendar-scroll-container');
            const compactContainer = element.querySelector('.calendar-compact-container');
            const container3x3 = element.querySelector('.calendar-3x3-container');
            const container4x3 = element.querySelector('.calendar-4x3-container');

            if (scrollContainer) {
                scrollContainer.outerHTML = this.renderGridView(
                    state.currentYear,
                    state.currentMonth,
                    currentDay,
                    settings,
                    width,
                    height
                );
                // Re-setup after rendering to restore scroll position and event listeners
                this.setup(element, false, settings);
                // Render circle overlay after setup and scroll positioning completes
                setTimeout(() => this.renderTodayCircleOverlay(element), 200);
            } else if (compactContainer) {
                compactContainer.outerHTML = this.renderGridView(
                    state.currentYear,
                    state.currentMonth,
                    currentDay,
                    settings,
                    width,
                    height
                );
                // Re-setup after rendering to restore event listeners
                this.setup(element, false, settings);
            } else if (container3x3) {
                container3x3.outerHTML = this.renderGridView(
                    state.currentYear,
                    state.currentMonth,
                    currentDay,
                    settings,
                    width,
                    height
                );
                // Re-setup after rendering
                this.setup(element, false, settings);
            } else if (container4x3) {
                container4x3.outerHTML = this.renderGridView(
                    state.currentYear,
                    state.currentMonth,
                    currentDay,
                    settings,
                    width,
                    height
                );
                // Re-setup after rendering
                this.setup(element, false, settings);
            }
        }
    },

    renderTodayCircleOverlay: function(element) {
        // Error boundary: Validate element exists
        if (!element) return;

        try {
            // Don't show circle if we're in day view
            const dayView = element.querySelector('.calendar-day-view');
            if (dayView) {
                // Hide any existing overlay
                const overlay = element.querySelector('.calendar-circle-overlay');
                if (overlay) overlay.style.display = 'none';
                return;
            }

            const scrollContainer = element.querySelector('.calendar-scroll-container');
            if (!scrollContainer) return;

            // Mark that JS circle is active
            scrollContainer.classList.add('js-circle-active');

            // Find the today cell
            const todayCell = scrollContainer.querySelector('.calendar-day-cell.today');

            // Get or create overlay - attach to widget element (not scroll container) so it survives re-renders
            let overlay = element.querySelector('.calendar-circle-overlay');

            if (!todayCell) {
                // No today cell visible, hide overlay
                if (overlay) overlay.style.display = 'none';
                return;
            }

            // Error boundary: Validate getBoundingClientRect returns valid rect
            const widgetRect = element.getBoundingClientRect();
            const cellRect = todayCell.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            // Validate all rects have valid properties
            if (!widgetRect || !cellRect || !containerRect) {
                if (overlay) overlay.style.display = 'none';
                return;
            }

            // Skip if dimensions aren't ready yet
            if (cellRect.width === 0 || cellRect.height === 0) {
                if (overlay) overlay.style.display = 'none';
                return;
            }

            // Check if cell is actually visible within the scroll container
            const cellCenterX = cellRect.left + cellRect.width / 2;
            const isVisible = cellCenterX >= containerRect.left && cellCenterX <= containerRect.right;

            if (!isVisible) {
                // Cell is scrolled out of view, hide overlay
                if (overlay) overlay.style.display = 'none';
                return;
            }

            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'calendar-circle-overlay';
                element.appendChild(overlay);
            }

            // Use cell center since the day number is already centered in the cell via flexbox
            const circleSize = cellRect.width * 0.75;
            const centerX = cellRect.left - widgetRect.left + cellRect.width / 2;
            const centerY = cellRect.top - widgetRect.top + cellRect.height / 2;

            // Position the top-left corner of the circle so it's centered in the cell
            // Adjust by 0.5px left and up to compensate for rendering offset
            const left = centerX - (circleSize / 2) - 0.8;
            const top = centerY - (circleSize / 2) - 0.8;

            // Update overlay position and size
            overlay.style.display = 'block';
            overlay.style.left = left + 'px';
            overlay.style.top = top + 'px';
            overlay.style.width = circleSize + 'px';
            overlay.style.height = circleSize + 'px';
        } catch (error) {
            // Catch any unexpected errors and fail silently
            console.error('Calendar overlay error:', error);
        }
    },

    getWeekNumber: function(date) {
        // ISO week date calculation
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    },

    showEventCreationModal: function(day, month, year, element, settings) {
        // Remove any existing modal
        const existingModal = document.querySelector('.calendar-event-modal');
        if (existingModal) existingModal.remove();

        // Format date for display
        const dateObj = new Date(year, month, day);
        const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'calendar-event-modal';
        modal.innerHTML = `
            <div class="calendar-event-modal-overlay"></div>
            <div class="calendar-event-modal-content">
                <div class="calendar-event-modal-header">
                    <h3>Add Event</h3>
                    <button class="calendar-event-modal-close">&times;</button>
                </div>
                <div class="calendar-event-modal-body">
                    <div class="calendar-event-modal-date">${dateStr}</div>
                    <div class="calendar-event-form">
                        <input type="text" class="calendar-event-title-input" placeholder="Event title" autofocus>
                        <div class="calendar-event-time-row">
                            <input type="time" class="calendar-event-time-input" value="09:00">
                            <span class="calendar-event-time-separator">to</span>
                            <input type="time" class="calendar-event-end-time-input" value="10:00">
                        </div>
                        <textarea class="calendar-event-description-input" placeholder="Description (optional)" rows="3"></textarea>
                    </div>
                </div>
                <div class="calendar-event-modal-footer">
                    <button class="calendar-event-modal-cancel">Cancel</button>
                    <button class="calendar-event-modal-save">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Focus title input
        const titleInput = modal.querySelector('.calendar-event-title-input');
        setTimeout(() => titleInput.focus(), 100);

        // Handle close
        const closeModal = () => {
            modal.remove();
        };

        modal.querySelector('.calendar-event-modal-close').addEventListener('click', closeModal);
        modal.querySelector('.calendar-event-modal-cancel').addEventListener('click', closeModal);
        modal.querySelector('.calendar-event-modal-overlay').addEventListener('click', closeModal);

        // Handle save
        modal.querySelector('.calendar-event-modal-save').addEventListener('click', () => {
            const title = titleInput.value.trim();
            if (!title) {
                titleInput.focus();
                return;
            }

            const time = modal.querySelector('.calendar-event-time-input').value;
            const endTime = modal.querySelector('.calendar-event-end-time-input').value;
            const description = modal.querySelector('.calendar-event-description-input').value.trim();

            // Create event object
            if (!this.events[day]) {
                this.events[day] = [];
            }

            this.events[day].push({
                title: title,
                time: `${time} - ${endTime}`,
                description: description
            });

            // Close modal
            closeModal();

            // Refresh calendar view
            this.updateCalendarView(element, settings);
        });

        // Handle Enter key in title input
        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                modal.querySelector('.calendar-event-modal-save').click();
            }
        });
    }
};
