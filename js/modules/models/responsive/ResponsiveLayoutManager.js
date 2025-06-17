/**
 * ResponsiveLayoutManager - Main orchestrator for responsive features
 * Enhances existing BookBuddy components with responsive behavior
 */
import { eventBus, EVENTS } from '../../../utils/EventBus.js';
import { DOMUtils } from '../../../utils/Helpers.js';
import BreakpointManager from './BreakpointManager.js';
import MobileNavigationController from './MobileNavigationController.js';
import TouchGestureHandler from './TouchGestureHandler.js';
import { MobilePerformanceOptimizer } from '../../../utils/MobilePerformanceOptimizer.js';
export default class ResponsiveLayoutManager {
    constructor(navigationController, modalManager) {
        this.navigationController = navigationController;
        this.modalManager = modalManager;

        // Responsive components
        this.breakpointManager = new BreakpointManager();
        this.mobileNavigationController = null;
        this.touchGestureHandler = null;

        // State tracking
        this.currentBreakpoint = null;
        this.isInitialized = false;
        this.adaptationRules = new Map();

        console.log('📱 ResponsiveLayoutManager initializing...');
        this.initialize();
    }

    async initialize() {
        try {
            // Wait for DOM and breakpoint manager
            await this.waitForInitialization();

            // Initialize responsive components
            await this.initializeResponsiveComponents();

            // Setup event listeners
            this.setupEventListeners();

            // Apply initial responsive adaptations
            this.applyResponsiveAdaptations();

            // Register adaptation rules for existing components
            this.registerBookBuddyAdaptations();

            this.isInitialized = true;
            console.log('✅ ResponsiveLayoutManager initialized successfully');

            // Emit ready event
            eventBus.emit('responsive:ready', {
                breakpoint: this.currentBreakpoint,
                features: this.getAvailableFeatures()
            });

        } catch (error) {
            console.error('❌ ResponsiveLayoutManager initialization failed:', error);
        }
    }

    async waitForInitialization() {
        // Wait for DOM to be ready
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve, { once: true });
            });
        }

        // Wait for BreakpointManager to be ready
        await new Promise(resolve => {
            if (this.breakpointManager.initialized) {
                resolve();
            } else {
                eventBus.once('responsive:initialized', resolve);
            }
        });

        this.currentBreakpoint = this.breakpointManager.getCurrentBreakpoint();
    }

    async initializeResponsiveComponents() {
        // Initialize mobile navigation enhancement
        if (this.navigationController) {
            this.mobileNavigationController = new MobileNavigationController(
                this.navigationController,
                this.breakpointManager
            );
        }

        // Initialize touch gesture handling
        this.touchGestureHandler = new TouchGestureHandler(this.breakpointManager);

        console.log('📱 Responsive components initialized');
    }

    setupEventListeners() {
        // Listen for breakpoint changes
        eventBus.on('responsive:breakpointChanged', (data) => {
            this.handleBreakpointChange(data.from, data.to);
        });

        // Listen for viewport changes
        eventBus.on('responsive:viewportChanged', (data) => {
            this.handleViewportChange(data);
        });

        // Listen for view changes to apply responsive adaptations
        eventBus.on(EVENTS.UI_VIEW_CHANGED, (data) => {
            this.applyViewSpecificAdaptations(data.to);
        });

        console.log('🔗 ResponsiveLayoutManager event listeners setup complete');
    }

    handleBreakpointChange(fromBreakpoint, toBreakpoint) {
        console.log(`📱 Breakpoint changed: ${fromBreakpoint} → ${toBreakpoint}`);

        this.currentBreakpoint = toBreakpoint;

        // Apply breakpoint-specific adaptations
        this.applyBreakpointAdaptations(toBreakpoint);

        // Notify components of breakpoint change
        this.notifyComponentsOfBreakpointChange(fromBreakpoint, toBreakpoint);

        // Update modal behavior for new breakpoint
        this.adaptModalBehavior(toBreakpoint);
    }

    handleViewportChange(data) {
        // Apply dynamic layout adjustments
        this.adjustGridLayouts();
        this.adjustTextSizes();
        this.adjustSpacing();
    }

    registerBookBuddyAdaptations() {
        // Register adaptations for existing BookBuddy components

        // Library grid adaptations
        this.registerAdaptation('library-grid', {
            mobile: () => this.adaptLibraryForMobile(),
            tablet: () => this.adaptLibraryForTablet(),
            desktop: () => this.adaptLibraryForDesktop()
        });

        // Search interface adaptations
        this.registerAdaptation('search-interface', {
            mobile: () => this.adaptSearchForMobile(),
            tablet: () => this.adaptSearchForTablet(),
            desktop: () => this.adaptSearchForDesktop()
        });

        // Reading interface adaptations
        this.registerAdaptation('reading-interface', {
            mobile: () => this.adaptReadingForMobile(),
            tablet: () => this.adaptReadingForTablet(),
            desktop: () => this.adaptReadingForDesktop()
        });

        // Modal adaptations
        this.registerAdaptation('modals', {
            mobile: () => this.adaptModalsForMobile(),
            tablet: () => this.adaptModalsForTablet(),
            desktop: () => this.adaptModalsForDesktop()
        });
    }

    registerAdaptation(name, rules) {
        this.adaptationRules.set(name, rules);
    }

    applyResponsiveAdaptations() {
        const breakpoint = this.currentBreakpoint;

        // Apply all registered adaptations for current breakpoint
        this.adaptationRules.forEach((rules, name) => {
            if (rules[breakpoint]) {
                try {
                    rules[breakpoint]();
                } catch (error) {
                    console.error(`❌ Failed to apply ${name} adaptation for ${breakpoint}:`, error);
                }
            }
        });
    }

    applyBreakpointAdaptations(breakpoint) {
        // Apply responsive CSS classes
        document.body.setAttribute('data-responsive-mode', breakpoint);

        // Apply specific adaptations
        this.applyResponsiveAdaptations();
    }

    applyViewSpecificAdaptations(viewName) {
        // Apply adaptations specific to the current view
        setTimeout(() => {
            switch (viewName) {
                case 'library':
                    this.optimizeLibraryView();
                    break;
                case 'search':
                    this.optimizeSearchView();
                    break;
                case 'reading':
                    this.optimizeReadingView();
                    break;
            }
        }, 100); // Small delay to allow view transition
    }

    // Specific adaptation methods for BookBuddy components

    adaptLibraryForMobile() {
        this.optimizeForMobile(); // Add this line first

        const booksGrid = DOMUtils.query('#books-grid');
        if (booksGrid) {
            // Force single column layout
            booksGrid.style.gridTemplateColumns = '1fr';
            booksGrid.style.gap = '1rem';

            // Enhance book cards for mobile
            this.enhanceBookCardsForMobile();
        }
    }
    optimizeForMobile() {
        console.log('📱 Optimizing for mobile performance...');

        // Apply performance optimizations
        MobilePerformanceOptimizer.optimizeForMobile();

        // Existing mobile optimizations
        const booksGrid = DOMUtils.query('#books-grid');
        if (booksGrid) {
            booksGrid.style.gridTemplateColumns = '1fr';
            booksGrid.style.gap = '1rem';
            this.enhanceBookCardsForMobile();
        }
    }

    adaptLibraryForTablet() {
        const booksGrid = DOMUtils.query('#books-grid');
        if (booksGrid) {
            booksGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            booksGrid.style.gap = '1.25rem';
        }
    }

    adaptLibraryForDesktop() {
        const booksGrid = DOMUtils.query('#books-grid');
        if (booksGrid) {
            booksGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
            booksGrid.style.gap = '1.5rem';
        }
    }

    enhanceBookCardsForMobile() {
        const bookCards = DOMUtils.queryAll('.book-card');
        bookCards.forEach(card => {
            // Add mobile-specific classes
            card.classList.add('mobile-enhanced');

            // Optimize action buttons for touch
            const actions = card.querySelector('.book-actions');
            if (actions) {
                actions.style.flexDirection = 'column';
                actions.style.gap = '0.5rem';

                // Make buttons full width and touch-friendly
                const buttons = actions.querySelectorAll('.btn');
                buttons.forEach(btn => {
                    btn.style.width = '100%';
                    btn.style.minHeight = '44px'; // Touch target size
                });
            }
        });
    }

    adaptSearchForMobile() {
        const searchContainer = DOMUtils.query('#advanced-search-container');
        if (searchContainer) {
            // Enhance search interface for mobile
            searchContainer.classList.add('mobile-optimized');

            // Stack search elements vertically
            const searchFilters = DOMUtils.query('.search-filters', searchContainer);
            if (searchFilters) {
                searchFilters.style.flexDirection = 'column';
                searchFilters.style.gap = '0.75rem';
            }
        }
    }

    adaptSearchForTablet() {
        const searchContainer = DOMUtils.query('#advanced-search-container');
        if (searchContainer) {
            searchContainer.classList.remove('mobile-optimized');
            searchContainer.classList.add('tablet-optimized');
        }
    }

    adaptSearchForDesktop() {
        const searchContainer = DOMUtils.query('#advanced-search-container');
        if (searchContainer) {
            searchContainer.classList.remove('mobile-optimized', 'tablet-optimized');
        }
    }

    adaptReadingForMobile() {
        const readingInterface = DOMUtils.query('.reading-interface');
        if (readingInterface) {
            // Optimize reading interface for mobile
            readingInterface.classList.add('mobile-reading');

            // Adjust font size and line height for mobile reading
            const bookContent = DOMUtils.query('.book-content', readingInterface);
            if (bookContent) {
                bookContent.style.fontSize = '1rem';
                bookContent.style.lineHeight = '1.6';
                bookContent.style.padding = '1rem';
            }
        }
    }

    adaptReadingForTablet() {
        const readingInterface = DOMUtils.query('.reading-interface');
        if (readingInterface) {
            readingInterface.classList.remove('mobile-reading');
            readingInterface.classList.add('tablet-reading');
        }
    }

    adaptReadingForDesktop() {
        const readingInterface = DOMUtils.query('.reading-interface');
        if (readingInterface) {
            readingInterface.classList.remove('mobile-reading', 'tablet-reading');
        }
    }

    adaptModalsForMobile() {
        // Enhance modal behavior for mobile
        if (this.modalManager) {
            // Make modals full-screen on mobile
            const activeModals = DOMUtils.queryAll('.modal.show');
            activeModals.forEach(modal => {
                if (!modal.classList.contains('mobile-fullscreen')) {
                    modal.classList.add('mobile-fullscreen');
                    modal.style.width = '100vw';
                    modal.style.height = '100vh';
                    modal.style.maxWidth = 'none';
                    modal.style.maxHeight = 'none';
                    modal.style.borderRadius = '0';
                }
            });
        }
    }

    adaptModalsForTablet() {
        // Standard modal behavior for tablet
        const activeModals = DOMUtils.queryAll('.modal.show');
        activeModals.forEach(modal => {
            modal.classList.remove('mobile-fullscreen');
            modal.style.width = '';
            modal.style.height = '';
            modal.style.maxWidth = '90vw';
            modal.style.maxHeight = '90vh';
            modal.style.borderRadius = '';
        });
    }

    adaptModalsForDesktop() {
        // Standard modal behavior for desktop
        this.adaptModalsForTablet();
    }

    // Layout optimization methods

    adjustGridLayouts() {
        // Dynamically adjust grid layouts based on viewport
        const grids = DOMUtils.queryAll('.books-grid, .search-results-grid');
        grids.forEach(grid => {
            const viewportInfo = this.breakpointManager.getViewportInfo();

            if (viewportInfo.isMobile) {
                grid.style.gridTemplateColumns = '1fr';
            } else if (viewportInfo.isTablet) {
                grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            } else {
                grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
            }
        });
    }

    adjustTextSizes() {
        // Adjust text sizes for optimal readability
        const viewport = this.breakpointManager.getCurrentViewport();

        if (this.breakpointManager.isMobile()) {
            document.documentElement.style.fontSize = '16px';
        } else if (this.breakpointManager.isTablet()) {
            document.documentElement.style.fontSize = '16px';
        } else {
            document.documentElement.style.fontSize = '16px';
        }
    }

    adjustSpacing() {
        // Adjust spacing based on screen size
        const spacing = this.breakpointManager.isMobile() ? '0.5rem' :
            this.breakpointManager.isTablet() ? '1rem' : '1.5rem';

        document.documentElement.style.setProperty('--responsive-spacing', spacing);
    }

    // Optimization methods for specific views

    optimizeLibraryView() {
        // Apply library-specific optimizations
        const libraryView = DOMUtils.query('#library-view');
        if (libraryView) {
            const viewInfo = this.breakpointManager.getViewportInfo();

            if (viewInfo.isMobile) {
                this.optimizeLibraryForMobile(libraryView);
            }
        }
    }

    optimizeSearchView() {
        // Apply search-specific optimizations
        const searchView = DOMUtils.query('#search-view');
        if (searchView && this.breakpointManager.isMobile()) {
            // Collapse search filters by default on mobile
            const filtersSection = DOMUtils.query('.search-filters', searchView);
            if (filtersSection) {
                filtersSection.classList.add('collapsed-mobile');
            }
        }
    }

    optimizeReadingView() {
        // Apply reading-specific optimizations
        const readingView = DOMUtils.query('#reading-view');
        if (readingView && this.breakpointManager.isMobile()) {
            // Hide reading controls initially on mobile
            const controls = DOMUtils.query('.reading-controls', readingView);
            if (controls) {
                controls.classList.add('mobile-hidden');
            }
        }
    }

    optimizeLibraryForMobile(libraryView) {
        // Hide library stats on mobile to save space
        const stats = DOMUtils.query('#library-stats', libraryView);
        if (stats && this.breakpointManager.getCurrentViewport().height < 600) {
            stats.classList.add('mobile-collapsed');
        }
    }

    // Component notification methods

    notifyComponentsOfBreakpointChange(fromBreakpoint, toBreakpoint) {
        // Notify specific components that care about breakpoint changes
        eventBus.emit('responsive:componentUpdate', {
            type: 'breakpointChange',
            from: fromBreakpoint,
            to: toBreakpoint,
            viewportInfo: this.breakpointManager.getViewportInfo()
        });
    }

    adaptModalBehavior(breakpoint) {
        // Update future modal behavior based on breakpoint
        if (this.modalManager) {
            const isMobile = breakpoint === 'mobile';

            // Store responsive preference for modal manager
            this.modalManager.responsiveMode = {
                breakpoint,
                isMobile,
                fullscreenOnMobile: isMobile
            };
        }
    }

    // Public API methods

    getCurrentBreakpoint() {
        return this.currentBreakpoint;
    }

    getViewportInfo() {
        return this.breakpointManager.getViewportInfo();
    }

    isMobileLayout() {
        return this.breakpointManager.isMobile();
    }

    isTabletLayout() {
        return this.breakpointManager.isTablet();
    }

    isDesktopLayout() {
        return this.breakpointManager.isDesktop();
    }

    getAvailableFeatures() {
        return {
            touchGestures: this.touchGestureHandler?.isEnabled() || false,
            mobileNavigation: this.mobileNavigationController?.isEnabled() || false,
            responsiveGrids: true,
            adaptiveModals: true
        };
    }

    // Manual adaptation triggers

    triggerAdaptation(adaptationName) {
        const rules = this.adaptationRules.get(adaptationName);
        if (rules && rules[this.currentBreakpoint]) {
            rules[this.currentBreakpoint]();
        }
    }

    refreshAllAdaptations() {
        this.applyResponsiveAdaptations();
    }

    // Debug methods

    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            currentBreakpoint: this.currentBreakpoint,
            viewport: this.breakpointManager.getCurrentViewport(),
            adaptationRules: Array.from(this.adaptationRules.keys()),
            features: this.getAvailableFeatures()
        };
    }

    // Cleanup

    destroy() {
        if (this.breakpointManager) {
            this.breakpointManager.destroy();
        }

        if (this.mobileNavigationController) {
            this.mobileNavigationController.destroy();
        }

        if (this.touchGestureHandler) {
            this.touchGestureHandler.destroy();
        }

        console.log('🗑️ ResponsiveLayoutManager destroyed');
    }
}