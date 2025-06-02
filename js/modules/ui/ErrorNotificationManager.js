/**
 * ErrorNotificationManager - Centralized error handling and user notifications
 * Integrates with APIService and ModalManager to show user-friendly error messages
 */
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { DOMUtils, DateUtils } from '../../utils/Helpers.js';

export default class ErrorNotificationManager {
    constructor(modalManager) {
        this.modalManager = modalManager;
        this.errorHistory = [];
        this.maxHistorySize = 50;
        this.notificationQueue = [];
        this.isProcessingQueue = false;
        this.errorCounts = new Map(); // Track error frequency
        
        // Notification settings
        this.settings = {
            showToasts: true,
            autoHideDelay: 5000,
            maxToastsVisible: 3,
            groupSimilarErrors: true,
            suppressRepeatedErrors: true
        };
        
        this.setupEventListeners();
        this.createToastContainer();
        
        console.log('🚨 ErrorNotificationManager initialized');
    }

    /**
     * Setup event listeners for API errors
     */
    setupEventListeners() {
        // Listen for API request failures
        eventBus.on(EVENTS.API_REQUEST_FAILED, (data) => {
            this.handleAPIError(data);
        });

        // Listen for storage errors
        eventBus.on(EVENTS.STORAGE_ERROR, (data) => {
            this.handleStorageError(data);
        });

        // Listen for general application errors
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event);
        });

        // Listen for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleUnhandledRejection(event);
        });
    }

    /**
     * Create toast notification container
     */
    createToastContainer() {
        if (DOMUtils.query('.toast-container')) return;

        const container = DOMUtils.createElement('div', {
            className: 'toast-container',
            innerHTML: ''
        });

        document.body.appendChild(container);

        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }

            .toast {
                background: var(--card-background, white);
                border-radius: var(--border-radius, 8px);
                box-shadow: var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.15));
                padding: 16px;
                min-width: 300px;
                max-width: 400px;
                border-left: 4px solid var(--error-color, #ef4444);
                pointer-events: all;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                position: relative;
            }

            .toast.show {
                transform: translateX(0);
                opacity: 1;
            }

            .toast.toast-warning {
                border-left-color: var(--warning-color, #f59e0b);
            }

            .toast.toast-info {
                border-left-color: var(--primary-color, #2563eb);
            }

            .toast.toast-success {
                border-left-color: var(--success-color, #10b981);
            }

            .toast-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .toast-title {
                font-weight: 600;
                color: var(--text-primary, #1e293b);
                font-size: 14px;
            }

            .toast-close {
                background: none;
                border: none;
                color: var(--text-secondary, #64748b);
                cursor: pointer;
                font-size: 16px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s;
            }

            .toast-close:hover {
                background: var(--border-color, #e2e8f0);
            }

            .toast-message {
                color: var(--text-secondary, #64748b);
                font-size: 13px;
                line-height: 1.4;
                margin-bottom: 8px;
            }

            .toast-details {
                font-size: 11px;
                color: var(--text-secondary, #94a3b8);
                opacity: 0.8;
            }

            .toast-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }

            .toast-btn {
                background: var(--primary-color, #2563eb);
                color: white;
                border: none;
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .toast-btn:hover {
                background: var(--primary-color-dark, #1d4ed8);
            }

            .toast-btn-outline {
                background: transparent;
                color: var(--primary-color, #2563eb);
                border: 1px solid var(--primary-color, #2563eb);
            }

            @media (max-width: 768px) {
                .toast-container {
                    left: 20px;
                    right: 20px;
                    top: 80px;
                }

                .toast {
                    min-width: auto;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Handle API request errors
     */
    handleAPIError(errorData) {
        const { error, url, requestId, timestamp } = errorData;
        
        // Track error for frequency analysis
        this.trackError('api', error);
        
        // Create error record
        const errorRecord = {
            id: requestId || `error_${Date.now()}`,
            type: 'api',
            message: error,
            url,
            timestamp,
            severity: this.determineSeverity(error),
            userMessage: this.createUserFriendlyMessage('api', error)
        };
        
        this.addToHistory(errorRecord);
        
        // Show notification based on severity
        if (errorRecord.severity === 'high' || !this.isRepeatedError(errorRecord)) {
            this.showNotification(errorRecord);
        }
    }

    /**
     * Handle storage errors
     */
    handleStorageError(errorData) {
        const { error, context } = errorData;
        
        this.trackError('storage', error.message);
        
        const errorRecord = {
            id: `storage_${Date.now()}`,
            type: 'storage',
            message: error.message,
            context,
            timestamp: new Date().toISOString(),
            severity: 'medium',
            userMessage: this.createUserFriendlyMessage('storage', error.message)
        };
        
        this.addToHistory(errorRecord);
        this.showNotification(errorRecord);
    }

    /**
     * Handle global JavaScript errors
     */
    handleGlobalError(event) {
        const error = {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        };
        
        this.trackError('javascript', error.message);
        
        const errorRecord = {
            id: `js_${Date.now()}`,
            type: 'javascript',
            message: error.message,
            filename: error.filename,
            line: error.lineno,
            timestamp: new Date().toISOString(),
            severity: 'high',
            userMessage: 'An unexpected error occurred. Please refresh the page and try again.'
        };
        
        this.addToHistory(errorRecord);
        
        // Only show critical JavaScript errors to users
        if (this.isCriticalError(error.message)) {
            this.showNotification(errorRecord);
        }
    }

    /**
     * Handle unhandled promise rejections
     */
    handleUnhandledRejection(event) {
        const error = event.reason;
        
        this.trackError('promise', error?.message || 'Unhandled promise rejection');
        
        const errorRecord = {
            id: `promise_${Date.now()}`,
            type: 'promise',
            message: error?.message || 'Unhandled promise rejection',
            timestamp: new Date().toISOString(),
            severity: 'medium',
            userMessage: 'A background operation failed. Some features may not work properly.'
        };
        
        this.addToHistory(errorRecord);
        
        // Show notification for promise rejections that might affect user experience
        if (this.affectsUserExperience(error)) {
            this.showNotification(errorRecord);
        }
    }

    /**
     * Show notification to user
     */
    showNotification(errorRecord) {
        if (!this.settings.showToasts) return;
        
        // Add to queue
        this.notificationQueue.push(errorRecord);
        
        // Process queue
        this.processNotificationQueue();
    }

    /**
     * Process notification queue
     */
    async processNotificationQueue() {
        if (this.isProcessingQueue || this.notificationQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        
        while (this.notificationQueue.length > 0) {
            const errorRecord = this.notificationQueue.shift();
            
            // Check if we have too many toasts visible
            const visibleToasts = DOMUtils.queryAll('.toast.show');
            if (visibleToasts.length >= this.settings.maxToastsVisible) {
                // Wait for a toast to disappear
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            
            this.createToast(errorRecord);
            
            // Small delay between toasts
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        this.isProcessingQueue = false;
    }

    /**
     * Create and show toast notification
     */
    createToast(errorRecord) {
        const container = DOMUtils.query('.toast-container');
        if (!container) return;

        const toast = DOMUtils.createElement('div', {
            className: `toast toast-${errorRecord.severity === 'high' ? 'error' : 'warning'}`,
            innerHTML: `
                <div class="toast-header">
                    <div class="toast-title">
                        ${this.getErrorIcon(errorRecord.type)} ${this.getErrorTitle(errorRecord.type)}
                    </div>
                    <button class="toast-close" aria-label="Close notification">&times;</button>
                </div>
                <div class="toast-message">${errorRecord.userMessage}</div>
                <div class="toast-details">
                    ${DateUtils.formatTime(errorRecord.timestamp)}
                    ${errorRecord.url ? ` • ${new URL(errorRecord.url).hostname}` : ''}
                </div>
                ${this.shouldShowActions(errorRecord) ? `
                    <div class="toast-actions">
                        <button class="toast-btn toast-btn-outline" data-action="details">Details</button>
                        <button class="toast-btn" data-action="retry">Retry</button>
                    </div>
                ` : ''}
            `
        });

        // Setup event listeners
        const closeBtn = DOMUtils.query('.toast-close', toast);
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideToast(toast));
        }

        // Setup action buttons
        const actionButtons = DOMUtils.queryAll('[data-action]', toast);
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleToastAction(action, errorRecord);
                this.hideToast(toast);
            });
        });

        // Add to container
        container.appendChild(toast);

        // Show with animation
        requestAnimationFrame(() => {
            DOMUtils.addClass(toast, 'show');
        });

        // Auto-hide
        if (this.settings.autoHideDelay > 0) {
            setTimeout(() => {
                if (toast.parentNode) {
                    this.hideToast(toast);
                }
            }, this.settings.autoHideDelay);
        }
    }

    /**
     * Hide toast notification
     */
    hideToast(toast) {
        DOMUtils.removeClass(toast, 'show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Handle toast action button clicks
     */
    handleToastAction(action, errorRecord) {
        switch (action) {
            case 'details':
                this.showErrorDetails(errorRecord);
                break;
            case 'retry':
                this.retryFailedOperation(errorRecord);
                break;
        }
    }

    /**
     * Show detailed error information in modal
     */
    showErrorDetails(errorRecord) {
        this.modalManager.showModal({
            title: `🚨 Error Details - ${this.getErrorTitle(errorRecord.type)}`,
            content: `
                <div class="error-details">
                    <div class="detail-row">
                        <strong>Time:</strong> ${DateUtils.formatDateTime(errorRecord.timestamp)}
                    </div>
                    <div class="detail-row">
                        <strong>Type:</strong> ${errorRecord.type}
                    </div>
                    <div class="detail-row">
                        <strong>Message:</strong> ${errorRecord.message}
                    </div>
                    ${errorRecord.url ? `
                        <div class="detail-row">
                            <strong>URL:</strong> ${errorRecord.url}
                        </div>
                    ` : ''}
                    ${errorRecord.context ? `
                        <div class="detail-row">
                            <strong>Context:</strong> ${errorRecord.context}
                        </div>
                    ` : ''}
                    <div class="detail-row">
                        <strong>ID:</strong> ${errorRecord.id}
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Copy Error Info',
                    action: 'copy',
                    className: 'btn-outline'
                },
                {
                    text: 'Close',
                    action: 'close',
                    className: 'btn-primary'
                }
            ],
            onAction: (action) => {
                if (action === 'copy') {
                    navigator.clipboard.writeText(JSON.stringify(errorRecord, null, 2));
                    return false; // Don't close modal
                }
                return true;
            }
        });
    }

    /**
     * Retry failed operation
     */
    retryFailedOperation(errorRecord) {
        // Emit retry event
        eventBus.emit('error:retry', errorRecord);
        
        // Show feedback
        this.showNotification({
            type: 'info',
            severity: 'low',
            userMessage: 'Retrying operation...',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Utility methods
     */
    addToHistory(errorRecord) {
        this.errorHistory.unshift(errorRecord);
        
        // Limit history size
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
        }
    }

    trackError(type, message) {
        const key = `${type}:${message}`;
        this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }

    isRepeatedError(errorRecord) {
        if (!this.settings.suppressRepeatedErrors) return false;
        
        const key = `${errorRecord.type}:${errorRecord.message}`;
        return (this.errorCounts.get(key) || 0) > 1;
    }

    determineSeverity(error) {
        if (error.includes('timeout') || error.includes('network')) return 'medium';
        if (error.includes('404') || error.includes('not found')) return 'low';
        if (error.includes('500') || error.includes('server')) return 'high';
        if (error.includes('quota') || error.includes('limit')) return 'high';
        return 'medium';
    }

    isCriticalError(message) {
        const criticalPatterns = [
            'chunk load',
            'script error',
            'module not found',
            'cannot read property',
            'undefined is not a function'
        ];
        
        return criticalPatterns.some(pattern => 
            message.toLowerCase().includes(pattern)
        );
    }

    affectsUserExperience(error) {
        if (!error?.message) return false;
        
        const uxPatterns = [
            'fetch',
            'api',
            'storage',
            'upload',
            'save',
            'load'
        ];
        
        return uxPatterns.some(pattern => 
            error.message.toLowerCase().includes(pattern)
        );
    }

    shouldShowActions(errorRecord) {
        return errorRecord.type === 'api' || errorRecord.type === 'storage';
    }

    createUserFriendlyMessage(type, error) {
        const messages = {
            api: {
                timeout: 'Connection timed out. Please check your internet and try again.',
                network: 'Network error. Please check your connection.',
                'rate limit': 'Too many requests. Please wait a moment.',
                '404': 'The requested information was not found.',
                '500': 'Server error. Please try again later.',
                default: 'Unable to connect to the service. Please try again.'
            },
            storage: {
                quota: 'Storage space is full. Please free up some space.',
                security: 'Unable to save data. Please check your browser settings.',
                default: 'Unable to save your data. Please try again.'
            }
        };

        const typeMessages = messages[type] || messages.api;
        
        for (const [key, message] of Object.entries(typeMessages)) {
            if (key !== 'default' && error.toLowerCase().includes(key)) {
                return message;
            }
        }
        
        return typeMessages.default;
    }

    getErrorIcon(type) {
        const icons = {
            api: '🌐',
            storage: '💾',
            javascript: '⚠️',
            promise: '🔄',
            default: '❌'
        };
        
        return icons[type] || icons.default;
    }

    getErrorTitle(type) {
        const titles = {
            api: 'Connection Error',
            storage: 'Storage Error',
            javascript: 'Application Error',
            promise: 'Operation Failed',
            default: 'Error'
        };
        
        return titles[type] || titles.default;
    }

    /**
     * Get error history and statistics
     */
    getErrorStats() {
        return {
            totalErrors: this.errorHistory.length,
            errorsByType: this.getErrorsByType(),
            recentErrors: this.errorHistory.slice(0, 10),
            topErrors: this.getTopErrors()
        };
    }

    getErrorsByType() {
        const types = {};
        this.errorHistory.forEach(error => {
            types[error.type] = (types[error.type] || 0) + 1;
        });
        return types;
    }

    getTopErrors() {
        return Array.from(this.errorCounts.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([error, count]) => ({ error, count }));
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
        this.errorCounts.clear();
    }
}