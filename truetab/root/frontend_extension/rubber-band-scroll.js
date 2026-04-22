// Rubber Band Scroll Effect for Chrome
// Simulates iOS Safari elastic overscroll behavior

(function() {
    'use strict';

    // Check if rubber band scrolling is enabled in settings
    function isRubberBandEnabled() {
        try {
            const saved = localStorage.getItem('truetab-appearance');
            if (saved) {
                const settings = JSON.parse(saved);
                return settings.enableRubberBandScrolling === true;
            }
        } catch (e) {
            console.error('Failed to load rubber band setting:', e);
        }
        return false; // Disabled by default
    }

    if (!isRubberBandEnabled()) return;

    // Only apply to Chrome (not Safari or Firefox which have native support)
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    if (!isChrome) return;

    class RubberBandScroll {
        constructor(element, options = {}) {
            this.element = element;
            this.isVertical = options.vertical !== false;
            this.isHorizontal = options.horizontal === true;

            this.overscrollX = 0;
            this.overscrollY = 0;
            this.velocityX = 0;
            this.velocityY = 0;
            this.animationId = null;
            this.lastWheelTime = 0;
            this.wheelTimeout = null;

            // Physics constants
            this.maxOverscroll = 120; // Maximum pixels to overscroll (HARD LIMIT)
            this.rubberBandCoeff = 0.55; // Resistance coefficient
            this.stiffness = 450; // Spring stiffness (increased for faster snap-back)
            this.damping = 27; // Damping (reduced for quicker response)
            this.mass = 1;
            this.precision = 0.01;

            this.init();
        }

        init() {
            if (this.isVertical) {
                this.element.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
            }
            if (this.isHorizontal) {
                this.element.addEventListener('wheel', this.handleWheelHorizontal.bind(this), { passive: false });
            }
        }

        // Apply rubber band resistance with HARD clamp
        applyRubberBand(delta, currentOverscroll) {
            const newOverscroll = currentOverscroll + delta;

            // Apply resistance based on how far we've already scrolled
            const resistance = 1 - (Math.abs(currentOverscroll) / this.maxOverscroll);
            const resistedDelta = delta * this.rubberBandCoeff * Math.max(resistance, 0.1);

            const result = currentOverscroll + resistedDelta;

            // HARD CLAMP to maxOverscroll
            return Math.max(-this.maxOverscroll, Math.min(this.maxOverscroll, result));
        }

        handleWheel(e) {
            if (!this.isVertical) return;

            const delta = e.deltaY;
            const scrollTop = this.element.scrollTop;
            const scrollHeight = this.element.scrollHeight;
            const clientHeight = this.element.clientHeight;

            const atTop = scrollTop <= 0;
            const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

            if ((atTop && delta < 0) || (atBottom && delta > 0)) {
                e.preventDefault();

                // Update last wheel time
                this.lastWheelTime = Date.now();

                // Apply rubber band with hard limit
                this.overscrollY = this.applyRubberBand(delta, this.overscrollY);

                this.updateTransform();

                // Clear existing timeout
                if (this.wheelTimeout) {
                    clearTimeout(this.wheelTimeout);
                }

                // Start spring animation after wheel stops
                this.wheelTimeout = setTimeout(() => {
                    if (Date.now() - this.lastWheelTime >= 10 && !this.animationId && Math.abs(this.overscrollY) > 0) {
                        this.animate();
                    }
                }, 10);
            } else if (this.overscrollY !== 0) {
                // Optimize: Only reset if needed
                this.overscrollY = 0;
                if (this.element.style.transform) {
                    this.updateTransform();
                }
            }
        }

        handleWheelHorizontal(e) {
            if (!this.isHorizontal) return;

            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
            if (delta === 0) return;

            const scrollLeft = this.element.scrollLeft;
            const scrollWidth = this.element.scrollWidth;
            const clientWidth = this.element.clientWidth;

            const atLeft = scrollLeft <= 0;
            const atRight = scrollLeft + clientWidth >= scrollWidth - 1;

            if ((atLeft && delta < 0) || (atRight && delta > 0)) {
                e.preventDefault();

                // Update last wheel time
                this.lastWheelTime = Date.now();

                this.overscrollX = this.applyRubberBand(delta, this.overscrollX);

                this.updateTransform();

                if (this.wheelTimeout) {
                    clearTimeout(this.wheelTimeout);
                }

                this.wheelTimeout = setTimeout(() => {
                    if (Date.now() - this.lastWheelTime >= 16 && !this.animationId && Math.abs(this.overscrollX) > 0) {
                        this.animate();
                    }
                }, 16);
            } else if (this.overscrollX !== 0) {
                this.overscrollX = 0;
                this.updateTransform();
            }
        }

        updateTransform() {
            const x = this.isHorizontal ? -this.overscrollX : 0;
            const y = this.isVertical ? -this.overscrollY : 0;

            if (x !== 0 || y !== 0) {
                this.element.style.transform = `translate(${x}px, ${y}px)`;
            } else {
                this.element.style.transform = '';
            }
        }

        // Helper: Apply spring physics to a single axis (eliminates duplicate code)
        applySpringPhysics(overscroll, velocity, dt) {
            const springForce = -this.stiffness * overscroll;
            const dampingForce = -this.damping * velocity;
            const acceleration = (springForce + dampingForce) / this.mass;

            velocity += acceleration * dt;
            overscroll += velocity * dt;

            if (Math.abs(overscroll) < this.precision && Math.abs(velocity) < this.precision) {
                return { overscroll: 0, velocity: 0, needsAnimation: false };
            }

            return { overscroll, velocity, needsAnimation: true };
        }

        // Spring physics animation
        animate() {
            const dt = 1 / 60;
            let needsAnimation = false;

            // Vertical spring
            if (Math.abs(this.overscrollY) > this.precision || Math.abs(this.velocityY) > this.precision) {
                const result = this.applySpringPhysics(this.overscrollY, this.velocityY, dt);
                this.overscrollY = result.overscroll;
                this.velocityY = result.velocity;
                needsAnimation = needsAnimation || result.needsAnimation;
            }

            // Horizontal spring
            if (Math.abs(this.overscrollX) > this.precision || Math.abs(this.velocityX) > this.precision) {
                const result = this.applySpringPhysics(this.overscrollX, this.velocityX, dt);
                this.overscrollX = result.overscroll;
                this.velocityX = result.velocity;
                needsAnimation = needsAnimation || result.needsAnimation;
            }

            this.updateTransform();

            if (needsAnimation) {
                this.animationId = requestAnimationFrame(() => this.animate());
            } else {
                this.animationId = null;
            }
        }

        destroy() {
            this.element.removeEventListener('wheel', this.handleWheel);
            this.element.removeEventListener('wheel', this.handleWheelHorizontal);

            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }

            if (this.wheelTimeout) {
                clearTimeout(this.wheelTimeout);
            }

            this.element.style.transform = '';
        }
    }

    // Track initialized elements
    const initializedElements = new WeakSet();

    function initRubberBand() {
        // Vertical scrolling elements
        const verticalElements = document.querySelectorAll(
            '.search-suggestions, .cb-messages, .modal-main, .popup-scrollable-content, ' +
            '.stocks-scrollable, .widget[id*="stocks"] .widget-content, ' +
            '.quick-links-content, .calendar-events-content, .widget-list'
        );

        // Horizontal scrolling elements for calendar month navigation
        const calendarElements = document.querySelectorAll('.calendar-scroll-container');

        verticalElements.forEach(element => {
            if (!initializedElements.has(element) && element.scrollHeight > element.clientHeight) {
                new RubberBandScroll(element, { vertical: true, horizontal: false });
                initializedElements.add(element);
            }
        });

        // Horizontal scrolling elements (apps scroller)
        const horizontalElements = document.querySelectorAll('.apps-scroller-content');

        horizontalElements.forEach(element => {
            if (!initializedElements.has(element) && element.scrollWidth > element.clientWidth) {
                new RubberBandScroll(element, { vertical: false, horizontal: true });
                initializedElements.add(element);
            }
        });

        // Calendar navigation rubber band (horizontal)
        calendarElements.forEach(element => {
            if (!initializedElements.has(element)) {
                new RubberBandScroll(element, { vertical: false, horizontal: true });
                initializedElements.add(element);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRubberBand);
    } else {
        initRubberBand();
    }

    // Throttled mutation observer for better performance
    let observerTimeout;
    const observer = new MutationObserver(() => {
        if (observerTimeout) return;
        observerTimeout = setTimeout(() => {
            initRubberBand();
            observerTimeout = null;
        }, 250); // Reduced frequency from 100ms to 250ms
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
