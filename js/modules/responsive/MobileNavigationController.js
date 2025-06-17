/**
 * MobileNavigationController - Enhanced mobile navigation for BookBuddy
 * Extends existing NavigationController with mobile-specific features
 */
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { DOMUtils } from '../../utils/Helpers.js';

export default class MobileNavigationController {
    constructor(navigationController, breakpointManager) {
        this.navigationController = navigationController;
        this.breakpointManager = breakpointManager;
        
        this.isEnabled = false;
        this.mobileMenuOpen = false;
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.swipeThreshold = 50;
        
        console.log('📱 MobileNavigationController initializing...');
        this.initialize();
    }

    initialize() {
        // Only activate on mobile/tablet
        if (this.breakpointManager.isMobile() || this.breakpointManager.isTablet()) {
            this.enable();
        }
        
        // Listen for breakpoint changes
        eventBus.on('responsive:breakpointChanged', (data) => {
            this.handleBreakpointChange(data.to);
        });
        
        this.setupMobileEnhancements();
        this.setupSwipeGestures();
        
        console.log('✅ MobileNavigationController initialized');
    }

    enable() {
        if (this.isEnabled) return;
        
        this.isEnabled = true;
        this.enhanceNavigationForMobile();
        console.log('📱 Mobile navigation features enabled');
    }

    disable() {
        if (!this.isEnabled) return;
        
        this.isEnabled = false;
        this.restoreDesktopNavigation();
        console.log('🖥️ Mobile navigation features disabled');
    }

    handleBreakpointChange(newBreakpoint) {
        if (newBreakpoint === 'mobile' || newBreakpoint === 'tablet') {
            this.enable();
        } else {
            this.disable();
        }
    }

    setupMobileEnhancements() {
        // Enhance the existing navigation toggle
        this.enhanceNavigationToggle();
        
        // Add mobile-specific navigation features
        this.addMobileNavigationFeatures();
        
        // Setup backdrop for mobile menu
        this.setupMobileMenuBackdrop();
    }

    enhanceNavigationToggle() {
        const navToggle = DOMUtils.query('.nav-toggle');
        if (navToggle) {
            // Enhanced touch handling for toggle button
            navToggle.addEventListener('touchstart', this.handleToggleTouch.bind(this), { passive: true });
            navToggle.addEventListener('click', this.handleToggleClick.bind(this));
            
            // Add visual feedback for touch
            navToggle.style.touchAction = 'manipulation';
            navToggle.style.userSelect = 'none';
        }
    }

    handleToggleTouch(e) {
        // Add visual feedback on touch
        const toggle = e.currentTarget;
        toggle.classList.add('touch-active');
        
        setTimeout(() => {
            toggle.classList.remove('touch-active');
        }, 150);
    }

    handleToggleClick(e) {
        e.preventDefault();
        this.toggleMobileMenu();
    }

    toggleMobileMenu() {
        const navMenu = DOMUtils.query('.nav-menu');
        const navToggle = DOMUtils.query('.nav-toggle');
        
        if (!navMenu || !navToggle) return;
        
        this.mobileMenuOpen = !this.mobileMenuOpen;
        
        if (this.mobileMenuOpen) {
            this.openMobileMenu(navMenu, navToggle);
        } else {
            this.closeMobileMenu(navMenu, navToggle);
        }
        
        // Emit navigation state change
        eventBus.emit('responsive:mobileMenuToggled', {
            isOpen: this.mobileMenuOpen
        });
    }

    openMobileMenu(navMenu, navToggle) {
        // Add active classes
        DOMUtils.addClass(navMenu, 'active');
        DOMUtils.addClass(navToggle, 'active');
        DOMUtils.addClass(document.body, 'mobile-menu-open');
        
        // Show backdrop
        this.showMobileMenuBackdrop();
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
        
        // Focus management for accessibility
        this.focusFirstMenuItem();
        
        console.log('📱 Mobile menu opened');
    }

    closeMobileMenu(navMenu, navToggle) {
        // Remove active classes
        DOMUtils.removeClass(navMenu, 'active');
        DOMUtils.removeClass(navToggle, 'active');
        DOMUtils.removeClass(document.body, 'mobile-menu-open');
        
        // Hide backdrop
        this.hideMobileMenuBackdrop();
        
        // Restore body scrolling
        document.body.style.overflow = '';
        
        console.log('📱 Mobile menu closed');
    }

    addMobileNavigationFeatures() {
        // Add swipe-to-navigate functionality
        this.setupNavigationSwipes();
        
        // Add navigation breadcrumbs for mobile
        this.addMobileBreadcrumbs();
        
        // Enhance navigation links for touch
        this.enhanceNavigationLinks();
    }

    setupNavigationSwipes() {
        const navMenu = DOMUtils.query('.nav-menu');
        if (!navMenu) return;
        
        // Add swipe gesture support to navigation menu
        navMenu.addEventListener('touchstart', this.handleNavTouchStart.bind(this), { passive: true });
        navMenu.addEventListener('touchmove', this.handleNavTouchMove.bind(this), { passive: true });
        navMenu.addEventListener('touchend', this.handleNavTouchEnd.bind(this), { passive: true });
    }

    handleNavTouchStart(e) {
        if (e.touches.length === 1) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }
    }

    handleNavTouchMove(e) {
        // Prevent overscroll behavior on mobile menu
        if (this.mobileMenuOpen) {
            const touch = e.touches[0];
            const deltaY = touch.clientY - this.touchStartY;
            
            // Prevent scroll if at boundaries
            const navMenu = DOMUtils.query('.nav-menu');
            if (navMenu) {
                const { scrollTop, scrollHeight, clientHeight } = navMenu;
                
                // At top and trying to scroll up
                if (scrollTop === 0 && deltaY > 0) {
                    e.preventDefault();
                }
                
                // At bottom and trying to scroll down
                if (scrollTop + clientHeight >= scrollHeight && deltaY < 0) {
                    e.preventDefault();
                }
            }
        }
    }

    handleNavTouchEnd(e) {
        if (!this.mobileMenuOpen) return;
        
        const deltaX = e.changedTouches[0].clientX - this.touchStartX;
        
        // Swipe right to close menu (if swiping from left edge)
        if (deltaX > this.swipeThreshold && this.touchStartX < 50) {
            this.closeMobileMenu(
                DOMUtils.query('.nav-menu'),
                DOMUtils.query('.nav-toggle')
            );
        }
    }

    enhanceNavigationLinks() {
        const navLinks = DOMUtils.queryAll('.nav-link');
        
        navLinks.forEach(link => {
            // Enhance for touch
            link.style.touchAction = 'manipulation';
            link.style.userSelect = 'none';
            
            // Add touch feedback
            link.addEventListener('touchstart', (e) => {
                link.classList.add('touch-active');
            }, { passive: true });
            
            link.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    link.classList.remove('touch-active');
                }, 150);
            }, { passive: true });
            
            // Close mobile menu on navigation
            link.addEventListener('click', () => {
                if (this.mobileMenuOpen) {
                    setTimeout(() => {
                        this.closeMobileMenu(
                            DOMUtils.query('.nav-menu'),
                            DOMUtils.query('.nav-toggle')
                        );
                    }, 100);
                }
            });
        });
    }

    addMobileBreadcrumbs() {
        // Add breadcrumb navigation for mobile context
        const navContainer = DOMUtils.query('.nav-container');
        if (!navContainer) return;
        
        const breadcrumbContainer = DOMUtils.createElement('div', {
            className: 'mobile-breadcrumbs',
            style: 'display: none;'
        });
        
        navContainer.appendChild(breadcrumbContainer);
        
        // Update breadcrumbs when view changes
        eventBus.on(EVENTS.UI_VIEW_CHANGED, (data) => {
            this.updateMobileBreadcrumbs(data.to);
        });
    }

    updateMobileBreadcrumbs(currentView) {
        if (!this.isEnabled) return;
        
        const breadcrumbContainer = DOMUtils.query('.mobile-breadcrumbs');
        if (!breadcrumbContainer) return;
        
        const viewNames = {
            library: 'Library',
            search: 'Search Books',
            reading: 'Reading',
            statistics: 'Statistics',
            settings: 'Settings'
        };
        
        const currentViewName = viewNames[currentView] || currentView;
        
        breadcrumbContainer.innerHTML = `
            <div class="breadcrumb-item">
                <span class="breadcrumb-icon">📚</span>
                <span class="breadcrumb-text">${currentViewName}</span>
            </div>
        `;
        
        // Show breadcrumbs on mobile
        if (this.breakpointManager.isMobile()) {
            breadcrumbContainer.style.display = 'flex';
        }
    }

    setupMobileMenuBackdrop() {
        // Create backdrop element if it doesn't exist
        let backdrop = DOMUtils.query('.mobile-menu-backdrop');
        if (!backdrop) {
            backdrop = DOMUtils.createElement('div', {
                className: 'mobile-menu-backdrop',
                style: `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 999;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.3s ease, visibility 0.3s ease;
                    backdrop-filter: blur(2px);
                `
            });
            
            document.body.appendChild(backdrop);
            
            // Close menu when backdrop is clicked
            backdrop.addEventListener('click', () => {
                if (this.mobileMenuOpen) {
                    this.closeMobileMenu(
                        DOMUtils.query('.nav-menu'),
                        DOMUtils.query('.nav-toggle')
                    );
                }
            });
        }
    }

    showMobileMenuBackdrop() {
        const backdrop = DOMUtils.query('.mobile-menu-backdrop');
        if (backdrop) {
            backdrop.style.opacity = '1';
            backdrop.style.visibility = 'visible';
        }
    }

    hideMobileMenuBackdrop() {
        const backdrop = DOMUtils.query('.mobile-menu-backdrop');
        if (backdrop) {
            backdrop.style.opacity = '0';
            backdrop.style.visibility = 'hidden';
        }
    }

    setupSwipeGestures() {
        // Setup global swipe gestures for navigation
        let touchStartX = 0;
        let touchStartY = 0;
        const swipeThreshold = 75;
        const swipeVelocityThreshold = 0.3;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                this.swipeStartTime = Date.now();
            }
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (!this.isEnabled || e.changedTouches.length !== 1) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const swipeTime = Date.now() - this.swipeStartTime;
            const velocity = Math.abs(deltaX) / swipeTime;
            
            // Only handle horizontal swipes that are fast enough
            if (Math.abs(deltaX) > Math.abs(deltaY) && 
                Math.abs(deltaX) > swipeThreshold && 
                velocity > swipeVelocityThreshold) {
                
                // Swipe from left edge to open menu
                if (deltaX > 0 && touchStartX < 20 && !this.mobileMenuOpen) {
                    this.toggleMobileMenu();
                }
                // Swipe left to close menu
                else if (deltaX < 0 && this.mobileMenuOpen) {
                    this.toggleMobileMenu();
                }
            }
        }, { passive: true });
    }

    enhanceNavigationForMobile() {
        const navigation = DOMUtils.query('.main-nav');
        if (!navigation) return;
        
        // Add mobile-specific classes and styles
        navigation.classList.add('mobile-enhanced');
        
        // Adjust navigation height for mobile
        if (this.breakpointManager.isMobile()) {
            navigation.style.minHeight = '60px';
        }
        
        // Enhance navigation items
        this.enhanceNavigationItems();
    }

    enhanceNavigationItems() {
        const navItems = DOMUtils.queryAll('.nav-item');
        
        navItems.forEach(item => {
            // Add touch-friendly spacing
            if (this.breakpointManager.isMobile()) {
                const link = item.querySelector('.nav-link');
                if (link) {
                    link.style.padding = '1rem 1.5rem';
                    link.style.minHeight = '44px';
                    link.style.display = 'flex';
                    link.style.alignItems = 'center';
                }
            }
        });
    }

    restoreDesktopNavigation() {
        const navigation = DOMUtils.query('.main-nav');
        if (navigation) {
            navigation.classList.remove('mobile-enhanced');
            navigation.style.minHeight = '';
        }
        
        // Close mobile menu if open
        if (this.mobileMenuOpen) {
            this.closeMobileMenu(
                DOMUtils.query('.nav-menu'),
                DOMUtils.query('.nav-toggle')
            );
        }
        
        // Hide breadcrumbs on desktop
        const breadcrumbs = DOMUtils.query('.mobile-breadcrumbs');
        if (breadcrumbs) {
            breadcrumbs.style.display = 'none';
        }
    }

    focusFirstMenuItem() {
        // Focus the first menu item for accessibility
        const firstMenuItem = DOMUtils.query('.nav-menu .nav-link');
        if (firstMenuItem) {
            firstMenuItem.focus();
        }
    }

    // Public API methods
    isMobileMenuOpen() {
        return this.mobileMenuOpen;
    }

    isEnabled() {
        return this.isEnabled;
    }

    forceMobileMenuClose() {
        if (this.mobileMenuOpen) {
            this.closeMobileMenu(
                DOMUtils.query('.nav-menu'),
                DOMUtils.query('.nav-toggle')
            );
        }
    }

    // Debug methods
    getDebugInfo() {
        return {
            isEnabled: this.isEnabled,
            mobileMenuOpen: this.mobileMenuOpen,
            breakpoint: this.breakpointManager.getCurrentBreakpoint(),
            hasBackdrop: !!DOMUtils.query('.mobile-menu-backdrop')
        };
    }

    // Cleanup
    destroy() {
        // Remove backdrop
        const backdrop = DOMUtils.query('.mobile-menu-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        
        // Remove mobile classes
        const navigation = DOMUtils.query('.main-nav');
        if (navigation) {
            navigation.classList.remove('mobile-enhanced');
        }
        
        // Close menu if open
        this.forceMobileMenuClose();
        
        console.log('🗑️ MobileNavigationController destroyed');
    }
}