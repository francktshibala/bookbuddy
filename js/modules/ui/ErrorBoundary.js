/**
 * ErrorBoundary.js - Simple Error Handling Component (No Syntax Errors)
 * Part of Book Buddy - Safe to import
 */

import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { StringUtils } from '../../utils/Helpers.js';

export default class ErrorBoundary {
    constructor(options = {}) {
        this.config = {
            showUserFriendlyMessages: options.showUserFriendlyMessages !== false,
            catchGlobalErrors: options.catchGlobalErrors !== false,
            enableRecovery: options.enableRecovery !== false
        };

        this.state = {
            errors: [],
            errorCount: 0,
            isActive: false
        };

        this.initialize();
        console.log('🛡️ ErrorBoundary initialized');
    }

    initialize() {
        this.setupGlobalErrorHandlers();
        this.setupEventListeners();
        this.createErrorDisplay();
        this.state.isActive = true;
        console.log('✅ ErrorBoundary ready');
    }

    setupGlobalErrorHandlers() {
        if (!this.config.catchGlobalErrors) return;

        window.addEventListener('error', (event) => {
            this.handleError({
                message: event.message,
                filename: event.filename,
                error: event.error,
                type: 'runtime'
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                message: event.reason?.message || 'Promise rejection',
                error: event.reason,
                type: 'promise'
            });
            event.preventDefault();
        });
    }

    setupEventListeners() {
        eventBus.on(EVENTS.API_REQUEST_FAILED, (data) => {
            this.handleError({
                message: 'API request failed',
                error: data.error,
                type: 'api'
            });
        });

        eventBus.on(EVENTS.STORAGE_ERROR, (data) => {
            this.handleError({
                message: 'Storage error occurred',
                error: data.error,
                type: 'storage'
            });
        });
    }

    createErrorDisplay() {
        const existing = document.getElementById('error-boundary-display');
        if (existing) existing.remove();

        const errorDisplay = document.createElement('div');
        errorDisplay.id = 'error-boundary-display';
        errorDisplay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 10000;
            display: none;
        `;
        document.body.appendChild(errorDisplay);
        this.errorDisplay = errorDisplay;
    }

    handleError(errorData) {
        console.error('🚨 ErrorBoundary caught:', errorData.message);
        
        this.state.errorCount++;
        this.state.errors.push({
            ...errorData,
            timestamp: new Date().toISOString(),
            id: Date.now()
        });

        if (this.config.showUserFriendlyMessages) {
            this.showErrorMessage(errorData);
        }
    }

    showErrorMessage(errorData) {
        const message = document.createElement('div');
        message.className = 'error-message';
        message.style.cssText = `
            background: #fee;
            color: #c00;
            padding: 1rem;
            margin: 0.5rem;
            border: 1px solid #fcc;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        message.innerHTML = `
            <div>
                <strong>⚠️ Error:</strong> ${StringUtils.escapeHtml(errorData.message)}
            </div>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">&times;</button>
        `;

        this.errorDisplay.appendChild(message);
        this.errorDisplay.style.display = 'block';

        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
                if (this.errorDisplay.children.length === 0) {
                    this.errorDisplay.style.display = 'none';
                }
            }
        }, 5000);
    }

    wrapComponent(componentFunction, options = {}) {
        const componentName = options.name || 'Component';
        
        return (...args) => {
            try {
                return componentFunction.apply(this, args);
            } catch (error) {
                this.handleError({
                    message: `${componentName} error: ${error.message}`,
                    error,
                    type: 'component'
                });
                return null;
            }
        };
    }

    wrapAsync(asyncFunction, options = {}) {
        const functionName = options.name || 'AsyncFunction';
        
        return async (...args) => {
            try {
                return await asyncFunction.apply(this, args);
            } catch (error) {
                this.handleError({
                    message: `${functionName} error: ${error.message}`,
                    error,
                    type: 'async'
                });
                throw error;
            }
        };
    }

    getErrorStats() {
        return {
            totalErrors: this.state.errorCount,
            recentErrors: this.state.errors.length,
            isActive: this.state.isActive
        };
    }

    clearErrors() {
        this.state.errors = [];
        this.state.errorCount = 0;
        if (this.errorDisplay) {
            this.errorDisplay.innerHTML = '';
            this.errorDisplay.style.display = 'none';
        }
    }

    reportError(error, context = {}) {
        this.handleError({
            message: error.message || 'Manual error report',
            error,
            type: context.type || 'manual',
            context
        });
    }

    destroy() {
        if (this.errorDisplay) {
            this.errorDisplay.remove();
        }
        this.state.isActive = false;
        console.log('🧹 ErrorBoundary destroyed');
    }
}

// Global export for testing
if (typeof window !== 'undefined') {
    window.ErrorBoundary = ErrorBoundary;
}