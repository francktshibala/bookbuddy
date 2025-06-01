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
    },

    isToday(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    isThisWeek(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo && date <= today;
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
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    unescapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent || div.innerText || '';
    },

    capitalizeFirstLetter(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    capitalizeWords(str) {
        if (!str) return '';
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    },

    toCamelCase(str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
    },

    toKebabCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    },

    stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    },

    highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
};

export const NumberUtils = {
    formatNumber(num, locale = 'en-US') {
        return new Intl.NumberFormat(locale).format(num);
    },

    formatPercentage(value, decimals = 0) {
        return `${(value * 100).toFixed(decimals)}%`;
    },

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    roundToDecimals(value, decimals) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    },

    isEven(num) {
        return num % 2 === 0;
    },

    isOdd(num) {
        return num % 2 !== 0;
    },

    sum(numbers) {
        return numbers.reduce((total, num) => total + num, 0);
    },

    average(numbers) {
        return numbers.length ? this.sum(numbers) / numbers.length : 0;
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
    },

    sortBy(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = typeof key === 'function' ? key(a) : a[key];
            const bVal = typeof key === 'function' ? key(b) : b[key];
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    },

    flatten(array) {
        return array.reduce((flat, item) => 
            flat.concat(Array.isArray(item) ? this.flatten(item) : item), []);
    },

    last(array) {
        return array[array.length - 1];
    },

    first(array) {
        return array[0];
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
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
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
    },

    getOffset(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset,
            width: rect.width,
            height: rect.height
        };
    },

    isVisible(element) {
        return element && element.offsetParent !== null;
    },

    scrollTo(element, options = {}) {
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', ...options });
        }
    },

    removeElement(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    },

    insertAfter(newElement, targetElement) {
        targetElement.parentNode.insertBefore(newElement, targetElement.nextSibling);
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
    },

    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    },

    getUsage() {
        if (!this.isAvailable()) return null;
        
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        
        return {
            used: totalSize,
            usedFormatted: NumberUtils.formatBytes(totalSize * 2) // Rough estimate
        };
    }
};

export const DebugUtils = {
    log(message, data = null, level = 'info') {
        // Only log in development mode
        if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production') return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        const styles = {
            info: 'color: #2563eb',
            warn: 'color: #f59e0b',
            error: 'color: #ef4444',
            success: 'color: #10b981'
        };
        
        if (data) {
            console.group(`%c${prefix} ${message}`, styles[level] || styles.info);
            console.log(data);
            console.groupEnd();
        } else {
            console.log(`%c${prefix} ${message}`, styles[level] || styles.info);
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
    },

    table(data, columns = null) {
        if (Array.isArray(data) && data.length > 0) {
            console.table(data, columns);
        } else {
            console.log('No data to display in table');
        }
    }
};

export const ValidationUtils = {
    isEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    isUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },

    isValidBookFile(file) {
        const validTypes = ['text/plain'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        return {
            valid: validTypes.includes(file.type) && file.size <= maxSize,
            errors: [
                ...(validTypes.includes(file.type) ? [] : ['Invalid file type. Only .txt files are supported.']),
                ...(file.size <= maxSize ? [] : ['File too large. Maximum size is 10MB.'])
            ]
        };
    },

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .trim();
    }
};

export const AsyncUtils = {
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    timeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Operation timed out')), ms)
            )
        ]);
    },

    retry(fn, attempts = 3, delay = 1000) {
        return new Promise((resolve, reject) => {
            fn().then(resolve).catch(error => {
                if (attempts > 1) {
                    setTimeout(() => {
                        this.retry(fn, attempts - 1, delay).then(resolve).catch(reject);
                    }, delay);
                } else {
                    reject(error);
                }
            });
        });
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Export all utilities as a single object for convenience
export default {
    DateUtils,
    StringUtils,
    NumberUtils,
    ArrayUtils,
    DOMUtils,
    StorageUtils,
    DebugUtils,
    ValidationUtils,
    AsyncUtils
};