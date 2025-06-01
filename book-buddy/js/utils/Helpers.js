/**
 * Helper Utilities - Common utility functions used across the application
 */

export const DateUtils = {
    formatDate(dateString, options = {}) {
        const date = new Date(dateString);
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
    },

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
    },

    formatDateTime(dateString) {
        return `${this.formatDate(dateString)} at ${this.formatTime(dateString)}`;
    },

    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        
        return this.formatDate(dateString);
    }
};

export const StringUtils = {
    truncate(str, maxLength, suffix = '...') {
        if (!str || str.length <= maxLength) return str;
        return str.substring(0, maxLength - suffix.length) + suffix;
    },

    slugify(str) {
        return str
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    unescapeHtml(str) {
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent || div.innerText || '';
    },

    capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    toCamelCase(str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
    }
};

export const NumberUtils = {
    formatNumber(num, locale = 'en-US') {
        return new Intl.NumberFormat(locale).format(num);
    },

    formatPercentage(value, decimals = 0) {
        return `${(value * 100).toFixed(decimals)}%`;
    },

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    roundToDecimals(value, decimals) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }
};

export const ArrayUtils = {
    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },

    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    unique(array, key = null) {
        if (key) {
            const seen = new Set();
            return array.filter(item => {
                const value = typeof key === 'function' ? key(item) : item[key];
                if (seen.has(value)) return false;
                seen.add(value);
                return true;
            });
        }
        return [...new Set(array)];
    },

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = typeof key === 'function' ? key(item) : item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }
};

export const DOMUtils = {
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else {
                element[key] = value;
            }
        });
        
        // Add children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Element) {
                element.appendChild(child);
            }
        });
        
        return element;
    },

    query(selector, parent = document) {
        return parent.querySelector(selector);
    },

    queryAll(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    },

    addClass(element, className) {
        if (element && className) {
            element.classList.add(className);
        }
    },

    removeClass(element, className) {
        if (element && className) {
            element.classList.remove(className);
        }
    },

    toggleClass(element, className) {
        if (element && className) {
            element.classList.toggle(className);
        }
    },

    hasClass(element, className) {
        return element && className && element.classList.contains(className);
    }
};

export const StorageUtils = {
    setWithExpiry(key, value, ttl) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttl
        };
        localStorage.setItem(key, JSON.stringify(item));
    },

    getWithExpiry(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;

        try {
            const item = JSON.parse(itemStr);
            const now = new Date();
            
            if (now.getTime() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch {
            return null;
        }
    }
};

export const DebugUtils = {
    log(message, data = null, level = 'info') {
        if (process?.env?.NODE_ENV === 'production') return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        if (data) {
            console.group(`${prefix} ${message}`);
            console.log(data);
            console.groupEnd();
        } else {
            console.log(`${prefix} ${message}`);
        }
    },

    measure(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        this.log(`Performance: ${name}`, `${(end - start).toFixed(2)}ms`);
        return result;
    },

    async measureAsync(name, fn) {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        this.log(`Performance: ${name}`, `${(end - start).toFixed(2)}ms`);
        return result;
    }
};

---

## 📋 **Day 9 Morning: UI Components Extraction**

### **Step 7: Extract Navigation Controller (45 minutes)**

**File: `js/modules/ui/NavigationController.js`**
```javascript
/**
 * Navigation Controller - Handles app navigation and view management
 */
import { eventBus, EVENTS } from '../utils/EventBus.js';
import { DOMUtils } from '../utils/Helpers.js';

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
        const navHTML = `
            <nav class="main-nav">
                <div class="nav-brand">
                    <h2>📚 Book Buddy</h2>
                    <button class="nav-toggle" aria-label="Toggle navigation">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
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
            </nav>
        `;

        // Insert navigation at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', navHTML);
        this.navigationElement = DOMUtils.query('.main-nav');
    }

    setupMobileMenu() {
        const toggleButton = DOMUtils.query('.nav-toggle');
        const navMenu = DOMUtils.query('.nav-menu');

        if (toggleButton && navMenu) {
            toggleButton.addEventListener('click', () => {
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
    }

    navigateToView(viewName, updateHistory = true) {
        if (this.currentView === viewName) return;

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
            from: this.currentView, 
            to: viewName 
        });
    }

    registerView(viewName, viewElement) {
        this.views.set(viewName, viewElement);
        
        // Hide view by default
        if (viewElement) {
            viewElement.style.display = 'none';
        }
    }

    showView(viewName) {
        const viewElement = this.views.get(viewName);
        if (viewElement) {
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