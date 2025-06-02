/**
 * LoadingStateManager - Centralized loading state management for API operations
 * Shows loading indicators, progress bars, and manages UI state during async operations
 */
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { DOMUtils } from '../../utils/Helpers.js';

export default class LoadingStateManager {
    constructor() {
        this.activeOperations = new Map();
        this.loadingElements = new Map();
        this.globalLoadingState = false;
        
        // Loading settings
        this.settings = {
            showGlobalLoader: true,
            showProgressBars: true,
            showSkeletons: true,
            minimumLoadingTime: 300, // Prevent flash for very fast operations
            animationDuration: 200
        };
        
        this.setupEventListeners();
        this.createLoadingElements();
        
        console.log('⏳ LoadingStateManager initialized');
    }

    /**
     * Setup event listeners for API operations
     */
    setupEventListeners() {
        // Listen for API request events
        eventBus.on(EVENTS.API_REQUEST_STARTED, (data) => {
            this.handleRequestStarted(data);
        });

        eventBus.on(EVENTS.API_REQUEST_COMPLETED, (data) => {
            this.handleRequestCompleted(data);
        });

        eventBus.on(EVENTS.API_REQUEST_FAILED, (data) => {
            this.handleRequestCompleted(data);
        });

        // Listen for custom loading events
        eventBus.on('loading:start', (data) => {
            this.startLoading(data.id, data.options);
        });

        eventBus.on('loading:stop', (data) => {
            this.stopLoading(data.id);
        });

        eventBus.on('loading:progress', (data) => {
            this.updateProgress(data.id, data.progress, data.message);
        });
    }

    /**
     * Create global loading elements
     */
    createLoadingElements() {
        this.createGlobalLoader();
        this.createProgressBar();
        this.injectLoadingCSS();
    }

    /**
     * Create global loading overlay
     */
    createGlobalLoader() {
        if (DOMUtils.query('.global-loader')) return;

        const loader = DOMUtils.createElement('div', {
            className: 'global-loader',
            innerHTML: `
                <div class="global-loader-backdrop"></div>
                <div class="global-loader-content">
                    <div class="loader-spinner"></div>
                    <div class="loader-message">Loading...</div>
                    <div class="loader-details"></div>
                </div>
            `
        });

        document.body.appendChild(loader);
        this.loadingElements.set('global', loader);
    }

    /**
     * Create global progress bar
     */
    createProgressBar() {
        if (DOMUtils.query('.global-progress')) return;

        const progressBar = DOMUtils.createElement('div', {
            className: 'global-progress',
            innerHTML: `
                <div class="progress-bar-fill"></div>
            `
        });

        document.body.appendChild(progressBar);
        this.loadingElements.set('progress', progressBar);
    }

    /**
     * Inject loading-related CSS
     */
    injectLoadingCSS() {
        if (DOMUtils.query('#loading-styles')) return;

        const style = document.createElement('style');
        style.id = 'loading-styles';
        style.textContent = `
            /* Global Loader */
            .global-loader {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                display: none;
                align-items: center;
                justify-content: center;
            }

            .global-loader.show {
                display: flex;
            }

            .global-loader-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(2px);
            }

            .global-loader-content {
                position: relative;
                background: var(--card-background, white);
                border-radius: var(--border-radius, 8px);
                padding: 2rem;
                box-shadow: var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.15));
                text-align: center;
                min-width: 200px;
                max-width: 400px;
            }

            /* Spinner Animation */
            .loader-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid var(--border-color, #e2e8f0);
                border-top: 3px solid var(--primary-color, #2563eb);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loader-message {
                font-weight: 500;
                color: var(--text-primary, #1e293b);
                margin-bottom: 0.5rem;
            }

            .loader-details {
                font-size: 0.875rem;
                color: var(--text-secondary, #64748b);
            }

            /* Global Progress Bar */
            .global-progress {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                z-index: 9998;
                background: transparent;
                display: none;
            }

            .global-progress.show {
                display: block;
            }

            .progress-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--primary-color, #2563eb), var(--success-color, #10b981));
                width: 0%;
                transition: width 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .progress-bar-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: shimmer 1.5s infinite;
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            /* Local Loading States */
            .loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100;
                border-radius: inherit;
            }

            .loading-spinner {
                width: 24px;
                height: 24px;
                border: 2px solid var(--border-color, #e2e8f0);
                border-top: 2px solid var(--primary-color, #2563eb);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .loading-text {
                margin-left: 0.5rem;
                color: var(--text-secondary, #64748b);
                font-size: 0.875rem;
            }

            /* Button Loading States */
            .btn.loading {
                position: relative;
                color: transparent !important;
                pointer-events: none;
            }

            .btn.loading::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 16px;
                height: 16px;
                border: 2px solid currentColor;
                border-top: 2px solid transparent;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                opacity: 0.7;
            }

            /* Skeleton Loading */
            .skeleton {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 4px;
            }

            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            .skeleton-text {
                height: 1rem;
                margin-bottom: 0.5rem;
            }

            .skeleton-text:last-child {
                margin-bottom: 0;
                width: 60%;
            }

            .skeleton-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
            }

            .skeleton-card {
                height: 200px;
                margin-bottom: 1rem;
            }

            /* Dark theme support */
            @media (prefers-color-scheme: dark) {
                .loading-overlay {
                    background: rgba(0, 0, 0, 0.8);
                }

                .skeleton {
                    background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
                    background-size: 200% 100%;
                }
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .loader-spinner,
                .loading-spinner,
                .btn.loading::after {
                    animation: none;
                    border-top-color: var(--primary-color, #2563eb);
                }

                .skeleton {
                    animation: none;
                    background: #f0f0f0;
                }

                .progress-bar-fill::after {
                    animation: none;
                }
            }

            /* Mobile optimizations */
            @media (max-width: 768px) {
                .global-loader-content {
                    margin: 1rem;
                    padding: 1.5rem;
                    min-width: auto;
                    max-width: none;
                }

                .loader-spinner {
                    width: 32px;
                    height: 32px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Handle API request started
     */
    handleRequestStarted(data) {
        const { requestId, url, attempt, maxAttempts, isLoading } = data;

        if (isLoading !== undefined) {
            // This is a loading state change from APIService
            if (isLoading) {
                this.showGlobalProgress();
            } else {
                this.hideGlobalProgress();
            }
            return;
        }

        if (requestId) {
            const operation = {
                id: requestId,
                type: 'api',
                url,
                attempt: attempt || 1,
                maxAttempts: maxAttempts || 1,
                startTime: Date.now(),
                message: this.getLoadingMessage(url, attempt, maxAttempts)
            };

            this.activeOperations.set(requestId, operation);
            this.updateLoadingState();
        }
    }

    /**
     * Handle API request completed/failed
     */
    handleRequestCompleted(data) {
        const { requestId } = data;

        if (requestId && this.activeOperations.has(requestId)) {
            this.activeOperations.delete(requestId);
            this.updateLoadingState();
        }
    }

    /**
     * Start loading for a specific operation
     */
    startLoading(operationId, options = {}) {
        const operation = {
            id: operationId,
            type: options.type || 'custom',
            message: options.message || 'Loading...',
            showGlobal: options.showGlobal !== false,
            showProgress: options.showProgress !== false,
            target: options.target,
            startTime: Date.now(),
            minimumTime: options.minimumTime || this.settings.minimumLoadingTime
        };

        this.activeOperations.set(operationId, operation);

        // Show target-specific loading if specified
        if (operation.target) {
            this.showTargetLoading(operation.target, operation.message);
        }

        this.updateLoadingState();
    }

    /**
     * Stop loading for a specific operation
     */
    stopLoading(operationId) {
        const operation = this.activeOperations.get(operationId);
        
        if (!operation) return;

        const elapsed = Date.now() - operation.startTime;
        const remaining = Math.max(0, operation.minimumTime - elapsed);

        const finishLoading = () => {
            this.activeOperations.delete(operationId);

            // Hide target-specific loading
            if (operation.target) {
                this.hideTargetLoading(operation.target);
            }

            this.updateLoadingState();
        };

        if (remaining > 0) {
            setTimeout(finishLoading, remaining);
        } else {
            finishLoading();
        }
    }

    /**
     * Update progress for a specific operation
     */
    updateProgress(operationId, progress, message) {
        const operation = this.activeOperations.get(operationId);
        
        if (!operation) return;

        operation.progress = Math.max(0, Math.min(100, progress));
        if (message) operation.message = message;

        this.updateProgressDisplay(operation);
    }

    /**
     * Show loading overlay on specific element
     */
    showTargetLoading(target, message = 'Loading...') {
        const element = typeof target === 'string' ? DOMUtils.query(target) : target;
        
        if (!element) return;

        // Remove existing overlay
        this.hideTargetLoading(element);

        // Make sure element has relative positioning
        const position = window.getComputedStyle(element).position;
        if (position === 'static') {
            element.style.position = 'relative';
        }

        const overlay = DOMUtils.createElement('div', {
            className: 'loading-overlay',
            innerHTML: `
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            `
        });

        element.appendChild(overlay);
    }

    /**
     * Hide loading overlay from specific element
     */
    hideTargetLoading(target) {
        const element = typeof target === 'string' ? DOMUtils.query(target) : target;
        
        if (!element) return;

        const overlay = DOMUtils.query('.loading-overlay', element);
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Show button loading state
     */
    showButtonLoading(button, originalText) {
        const element = typeof button === 'string' ? DOMUtils.query(button) : button;
        
        if (!element) return;

        element.dataset.originalText = originalText || element.textContent;
        element.disabled = true;
        DOMUtils.addClass(element, 'loading');
    }

    /**
     * Hide button loading state
     */
    hideButtonLoading(button) {
        const element = typeof button === 'string' ? DOMUtils.query(button) : button;
        
        if (!element) return;

        element.disabled = false;
        DOMUtils.removeClass(element, 'loading');
        
        if (element.dataset.originalText) {
            element.textContent = element.dataset.originalText;
            delete element.dataset.originalText;
        }
    }

    /**
     * Create skeleton loading for element
     */
    showSkeleton(target, type = 'card') {
        const element = typeof target === 'string' ? DOMUtils.query(target) : target;
        
        if (!element) return;

        element.dataset.originalContent = element.innerHTML;

        const skeletonHTML = this.generateSkeletonHTML(type);
        element.innerHTML = skeletonHTML;
    }

    /**
     * Hide skeleton loading
     */
    hideSkeleton(target) {
        const element = typeof target === 'string' ? DOMUtils.query(target) : target;
        
        if (!element) return;

        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
            delete element.dataset.originalContent;
        }
    }

    /**
     * Generate skeleton HTML based on type
     */
    generateSkeletonHTML(type) {
        const skeletons = {
            card: `
                <div class="skeleton skeleton-card"></div>
            `,
            text: `
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            `,
            list: `
                <div class="skeleton skeleton-text" style="height: 2rem; margin-bottom: 1rem;"></div>
                <div class="skeleton skeleton-text" style="height: 2rem; margin-bottom: 1rem;"></div>
                <div class="skeleton skeleton-text" style="height: 2rem; margin-bottom: 1rem;"></div>
            `,
            avatar: `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="skeleton skeleton-avatar"></div>
                    <div style="flex: 1;">
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text"></div>
                    </div>
                </div>
            `
        };

        return skeletons[type] || skeletons.card;
    }

    /**
     * Update overall loading state
     */
    updateLoadingState() {
        const hasActiveOperations = this.activeOperations.size > 0;
        
        if (hasActiveOperations !== this.globalLoadingState) {
            this.globalLoadingState = hasActiveOperations;
            
            if (hasActiveOperations) {
                this.showGlobalLoader();
            } else {
                this.hideGlobalLoader();
                this.hideGlobalProgress();
            }
        }

        // Update global loader message with current operation
        if (hasActiveOperations) {
            const operations = Array.from(this.activeOperations.values());
            const primaryOperation = operations[0];
            this.updateGlobalLoaderMessage(primaryOperation.message, operations.length);
        }
    }

    /**
     * Show global loader
     */
    showGlobalLoader() {
        if (!this.settings.showGlobalLoader) return;

        const loader = this.loadingElements.get('global');
        if (loader) {
            DOMUtils.addClass(loader, 'show');
        }
    }

    /**
     * Hide global loader
     */
    hideGlobalLoader() {
        const loader = this.loadingElements.get('global');
        if (loader) {
            DOMUtils.removeClass(loader, 'show');
        }
    }

    /**
     * Show global progress bar
     */
    showGlobalProgress() {
        if (!this.settings.showProgressBars) return;

        const progress = this.loadingElements.get('progress');
        if (progress) {
            DOMUtils.addClass(progress, 'show');
        }
    }

    /**
     * Hide global progress bar
     */
    hideGlobalProgress() {
        const progress = this.loadingElements.get('progress');
        if (progress) {
            DOMUtils.removeClass(progress, 'show');
            const fill = DOMUtils.query('.progress-bar-fill', progress);
            if (fill) {
                fill.style.width = '0%';
            }
        }
    }

    /**
     * Update global loader message
     */
    updateGlobalLoaderMessage(message, operationCount = 1) {
        const loader = this.loadingElements.get('global');
        if (!loader) return;

        const messageEl = DOMUtils.query('.loader-message', loader);
        const detailsEl = DOMUtils.query('.loader-details', loader);

        if (messageEl) {
            messageEl.textContent = message;
        }

        if (detailsEl && operationCount > 1) {
            detailsEl.textContent = `${operationCount} operations in progress`;
        } else if (detailsEl) {
            detailsEl.textContent = '';
        }
    }

    /**
     * Update progress display
     */
    updateProgressDisplay(operation) {
        if (operation.progress !== undefined) {
            const progress = this.loadingElements.get('progress');
            if (progress) {
                const fill = DOMUtils.query('.progress-bar-fill', progress);
                if (fill) {
                    fill.style.width = `${operation.progress}%`;
                }
            }
        }
    }

    /**
     * Get loading message for URL
     */
    getLoadingMessage(url, attempt = 1, maxAttempts = 1) {
        try {
            const domain = new URL(url).hostname;
            let message = `Connecting to ${domain}...`;
            
            if (attempt > 1) {
                message = `Retrying connection to ${domain} (${attempt}/${maxAttempts})...`;
            }
            
            return message;
        } catch {
            return attempt > 1 ? `Retrying request (${attempt}/${maxAttempts})...` : 'Loading...';
        }
    }

    /**
     * Get current loading statistics
     */
    getLoadingStats() {
        const operations = Array.from(this.activeOperations.values());
        
        return {
            isLoading: this.globalLoadingState,
            activeOperations: operations.length,
            operations: operations.map(op => ({
                id: op.id,
                type: op.type,
                message: op.message,
                duration: Date.now() - op.startTime
            }))
        };
    }

    /**
     * Clear all loading states
     */
    clearAllLoading() {
        this.activeOperations.clear();
        this.hideGlobalLoader();
        this.hideGlobalProgress();
        
        // Remove all loading overlays
        const overlays = DOMUtils.queryAll('.loading-overlay');
        overlays.forEach(overlay => overlay.remove());
        
        // Remove all button loading states
        const loadingButtons = DOMUtils.queryAll('.btn.loading');
        loadingButtons.forEach(button => this.hideButtonLoading(button));
    }
}