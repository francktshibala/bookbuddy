/**
 * BreakpointManager - Core viewport detection and breakpoint management
 * Follows your established service patterns with EventBus integration
 */
import { eventBus, EVENTS } from '../../../utils/EventBus.js';
import { AsyncUtils } from '../../../utils/Helpers.js';

export default class BreakpointManager {
    constructor() {
        this.breakpoints = {
            mobile: 480,
            tablet: 768,
            desktop: 1024,
            large: 1200
        };

        this.currentBreakpoint = null;
        this.currentViewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        // Debounced resize handler
        this.resizeTimeout = null;
        this.resizeDebounce = 250;

        this.initialized = false;

        console.log('🎯 BreakpointManager initializing...');
        this.initialize();
    }

    initialize() {
        try {
            // Set initial breakpoint
            this.detectBreakpoint();

            // Setup resize listener with debouncing
            this.setupResizeListener();

            // Setup orientation change listener
            this.setupOrientationListener();

            this.initialized = true;
            console.log('✅ BreakpointManager initialized successfully');

            // Emit initial state
            eventBus.emit('responsive:initialized', {
                breakpoint: this.currentBreakpoint,
                viewport: this.currentViewport
            });

        } catch (error) {
            console.error('❌ BreakpointManager initialization failed:', error);
        }
    }

    setupResizeListener() {
        const handleResize = () => {
            // Clear previous timeout
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }

            // Debounce resize handling
            this.resizeTimeout = setTimeout(() => {
                this.handleViewportChange();
            }, this.resizeDebounce);
        };

        window.addEventListener('resize', handleResize, { passive: true });
        console.log('📏 Resize listener attached with debouncing');
    }

    setupOrientationListener() {
        // Handle orientation changes (mobile/tablet)
        window.addEventListener('orientationchange', () => {
            // Small delay to allow viewport to update
            setTimeout(() => {
                this.handleViewportChange();
            }, 100);
        }, { passive: true });

        console.log('🔄 Orientation change listener attached');
    }

    handleViewportChange() {
        const oldViewport = { ...this.currentViewport };
        const oldBreakpoint = this.currentBreakpoint;

        // Update viewport dimensions
        this.currentViewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        // Detect new breakpoint
        const newBreakpoint = this.detectBreakpoint();

        // Only emit events if something actually changed
        if (this.hasViewportChanged(oldViewport) || oldBreakpoint !== newBreakpoint) {
            console.log(`📱 Viewport changed: ${oldBreakpoint} → ${newBreakpoint} (${this.currentViewport.width}x${this.currentViewport.height})`);

            // Emit breakpoint change event
            if (oldBreakpoint !== newBreakpoint) {
                eventBus.emit('responsive:breakpointChanged', {
                    from: oldBreakpoint,
                    to: newBreakpoint,
                    viewport: this.currentViewport
                });
            }

            // Emit general viewport change event
            eventBus.emit('responsive:viewportChanged', {
                viewport: this.currentViewport,
                breakpoint: newBreakpoint,
                previousViewport: oldViewport
            });
        }
    }

    detectBreakpoint() {
        const width = this.currentViewport.width;
        let newBreakpoint;

        if (width <= this.breakpoints.mobile) {
            newBreakpoint = 'mobile';
        } else if (width <= this.breakpoints.tablet) {
            newBreakpoint = 'tablet';
        } else if (width <= this.breakpoints.desktop) {
            newBreakpoint = 'desktop';
        } else {
            newBreakpoint = 'large';
        }

        // Only update if changed
        if (this.currentBreakpoint !== newBreakpoint) {
            this.currentBreakpoint = newBreakpoint;

            // Update CSS custom property for styling
            document.documentElement.setAttribute('data-breakpoint', newBreakpoint);

            // Add breakpoint class to body for CSS targeting
            document.body.className = document.body.className
                .replace(/\bbreakpoint-\w+\b/g, '')
                .trim();
            document.body.classList.add(`breakpoint-${newBreakpoint}`);
        }

        return newBreakpoint;
    }

    hasViewportChanged(oldViewport) {
        return oldViewport.width !== this.currentViewport.width ||
            oldViewport.height !== this.currentViewport.height;
    }

    // Public API methods
    getCurrentBreakpoint() {
        return this.currentBreakpoint;
    }

    getCurrentViewport() {
        return { ...this.currentViewport };
    }

    isMobile() {
        return this.currentBreakpoint === 'mobile';
    }

    isTablet() {
        return this.currentBreakpoint === 'tablet';
    }

    isDesktop() {
        return this.currentBreakpoint === 'desktop' || this.currentBreakpoint === 'large';
    }

    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    isLandscape() {
        return this.currentViewport.width > this.currentViewport.height;
    }

    isPortrait() {
        return this.currentViewport.width <= this.currentViewport.height;
    }

    // Get viewport info for components
    getViewportInfo() {
        return {
            breakpoint: this.currentBreakpoint,
            viewport: this.getCurrentViewport(),
            isMobile: this.isMobile(),
            isTablet: this.isTablet(),
            isDesktop: this.isDesktop(),
            isTouchDevice: this.isTouchDevice(),
            isLandscape: this.isLandscape(),
            isPortrait: this.isPortrait()
        };
    }

    // Update breakpoint thresholds (for customization)
    setBreakpoints(newBreakpoints) {
        this.breakpoints = { ...this.breakpoints, ...newBreakpoints };
        console.log('📏 Breakpoints updated:', this.breakpoints);

        // Re-detect current breakpoint
        this.detectBreakpoint();
    }

    // Method for components to register for specific breakpoint changes
    onBreakpointChange(callback, targetBreakpoint = null) {
        const wrappedCallback = (data) => {
            // If targetBreakpoint specified, only call for that breakpoint
            if (!targetBreakpoint || data.to === targetBreakpoint) {
                callback(data);
            }
        };

        return eventBus.on('responsive:breakpointChanged', wrappedCallback);
    }

    // Utility method to check if current viewport matches media query
    matchesMediaQuery(query) {
        return window.matchMedia(query).matches;
    }

    // Get CSS breakpoint values for JavaScript use
    getCSSBreakpoint(breakpointName) {
        const breakpointValue = this.breakpoints[breakpointName];
        return breakpointValue ? `${breakpointValue}px` : null;
    }

    // Debug method
    getDebugInfo() {
        return {
            initialized: this.initialized,
            currentBreakpoint: this.currentBreakpoint,
            viewport: this.currentViewport,
            breakpoints: this.breakpoints,
            isTouchDevice: this.isTouchDevice(),
            orientation: this.isLandscape() ? 'landscape' : 'portrait'
        };
    }

    // Cleanup method
    destroy() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        // Remove event listeners would go here if we stored references
        console.log('🗑️ BreakpointManager destroyed');
    }
}