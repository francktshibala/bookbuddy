/**
 * Navigation Controller - Handles app navigation and view management
 */
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { DOMUtils } from '../../utils/Helpers.js';
import { TouchEventHandler } from '../../utils/TouchEventHandler.js';

export default class NavigationController {
    constructor() {
        this.currentView = 'library';
        this.views = new Map();
        this.navigationElement = null;
        
        this.setupNavigation();
        this.setupEventListeners();       
    }

    setupNavigation() {
        this.createNavigationHTML();
        this.setupMobileMenu();
    }

    createNavigationHTML() {
    // ✅ CHECK IF NAVIGATION ALREADY EXISTS
    if (document.querySelector('.main-nav')) {
        console.log('Navigation already exists, skipping creation');
        this.navigationElement = document.querySelector('.main-nav');
        return;
    }

    const navHTML = `
        <nav class="main-nav">
            <div class="nav-container">
                <div class="nav-brand">
                    <div class="nav-logo">📚</div>
                    <h2>Book Buddy</h2>
                </div>
                <button class="nav-toggle" aria-label="Toggle navigation">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <ul class="nav-menu">
                    <li class="nav-item">
                        <a href="#" class="nav-link active" data-view="library">
                            📚 Library
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#" class="nav-link" data-view="search">
                            🔍 Search Books
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#" class="nav-link" data-view="reading">
                            📖 Reading
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#" class="nav-link" data-view="statistics">
                            📊 Statistics
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#" class="nav-link" data-view="settings">
                            ⚙️ Settings
                        </a>
                    </li>
                </ul>
            </div>
        </nav>
    `;

    // Insert navigation at the beginning of body
    document.body.insertAdjacentHTML('afterbegin', navHTML);
    this.navigationElement = DOMUtils.query('.main-nav');
    console.log('Navigation created successfully');
}

    setupMobileMenu() {
    const toggleButton = DOMUtils.query('.nav-toggle');
    const navMenu = DOMUtils.query('.nav-menu');

    if (toggleButton && navMenu) {
        // Add touch support
        toggleButton.addEventListener('touchstart', (e) => {
            toggleButton.classList.add('touch-active');
            setTimeout(() => toggleButton.classList.remove('touch-active'), 150);
        }, { passive: true });
        
        // Single enhanced click handler
        toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            DOMUtils.toggleClass(navMenu, 'active');
            DOMUtils.toggleClass(toggleButton, 'active');
        });
    }
}

    setupEventListeners() {
        // Navigation click handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-link')) {
                e.preventDefault();
                const view = e.target.dataset.view;
                if (view) {
                    this.navigateToView(view);
                }
            }
        });
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            const navMenu = DOMUtils.query('.nav-menu');
            const navToggle = DOMUtils.query('.nav-toggle');
            
            if (navMenu && navToggle && 
                !navMenu.contains(e.target) && 
                !navToggle.contains(e.target)) {
                DOMUtils.removeClass(navMenu, 'active');
                DOMUtils.removeClass(navToggle, 'active');
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const view = e.state?.view || 'library';
            this.navigateToView(view, false);
        });

            // NEW: Optimize all navigation elements for touch
        TouchEventHandler.optimizeButtons();
        
        // NEW: Add touch handlers for nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('touchstart', (e) => {
                link.style.transform = 'scale(0.98)';
            }, { passive: true });
            
            link.addEventListener('touchend', () => {
                setTimeout(() => {
                    link.style.transform = '';
                }, 100);
            }, { passive: true });
        });
    }

    navigateToView(viewName, updateHistory = true) {
        if (this.currentView === viewName) return;

        const oldView = this.currentView;
        
        // Hide current view
        this.hideView(this.currentView);
        
        // Show new view
        this.showView(viewName);
        
        // Update navigation state
        this.updateNavigationState(viewName);
        
        // Update browser history
        if (updateHistory) {
            history.pushState({ view: viewName }, '', `#${viewName}`);
        }
        
        // Update current view
        this.currentView = viewName;
        
        // Emit navigation event
        eventBus.emit(EVENTS.UI_VIEW_CHANGED, { 
            from: oldView, 
            to: viewName 
        });
    }

    registerView(viewName, viewElement) {
        this.views.set(viewName, viewElement);
        
        // Hide view by default (except library which is active)
        if (viewElement && viewName !== 'library') {
            viewElement.style.display = 'none';
        }
    }

    showView(viewName) {
        const viewElement = this.views.get(viewName);
        if (viewElement) {
            // Hide all other views first
            this.views.forEach((element, name) => {
                if (name !== viewName) {
                    element.style.display = 'none';
                }
            });
            
            // Show the target view
            viewElement.style.display = 'block';
            
            // Trigger view-specific initialization if needed
            const initEvent = new CustomEvent('viewShown', { 
                detail: { viewName } 
            });
            viewElement.dispatchEvent(initEvent);
        }
    }

    hideView(viewName) {
        const viewElement = this.views.get(viewName);
        if (viewElement) {
            viewElement.style.display = 'none';
        }
    }

    updateNavigationState(activeView) {
        // Remove active class from all nav links
        const navLinks = DOMUtils.queryAll('.nav-link');
        navLinks.forEach(link => DOMUtils.removeClass(link, 'active'));
        
        // Add active class to current view link
        const activeLink = DOMUtils.query(`.nav-link[data-view="${activeView}"]`);
        if (activeLink) {
            DOMUtils.addClass(activeLink, 'active');
        }
    }

    getCurrentView() {
        return this.currentView;
    }

    setViewTitle(viewName, title) {
        const viewElement = this.views.get(viewName);
        if (viewElement) {
            const titleElement = DOMUtils.query('.view-title', viewElement);
            if (titleElement) {
                titleElement.textContent = title;
            }
        }
    }

    showLoadingState(viewName) {
        const viewElement = this.views.get(viewName);
        if (viewElement) {
            DOMUtils.addClass(viewElement, 'loading');
        }
    }

    hideLoadingState(viewName) {
        const viewElement = this.views.get(viewName);
        if (viewElement) {
            DOMUtils.removeClass(viewElement, 'loading');
        }
    }
}