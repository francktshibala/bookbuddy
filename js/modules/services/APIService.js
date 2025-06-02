/**
 * APIService - Enhanced base class for API integrations
 * Provides retry logic, timeout handling, and error recovery
 */
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { AsyncUtils } from '../../utils/Helpers.js';

export default class APIService {
    constructor(baseURL, options = {}) {
        this.baseURL = baseURL;
        this.defaultOptions = {
            timeout: 10000,
            retries: 3,
            retryDelay: 1000,
            retryMultiplier: 1.5, // Exponential backoff
            rateLimit: {
                requests: 10,
                window: 60000 // 10 requests per minute
            },
            headers: {
                'Content-Type': 'application/json'
            },
            ...options
        };
        
        // Request tracking
        this.requestCount = 0;
        this.errorCount = 0;
        this.lastRequestTime = 0;
        this.requestQueue = [];
        this.isRateLimited = false;
        
        // Loading state management
        this.activeRequests = new Set();
        
        console.log(`🔌 APIService initialized for ${baseURL}`);
    }

    /**
     * Main request method with full error handling and retry logic
     */
    async request(endpoint, options = {}) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const url = this.buildURL(endpoint);
        const requestOptions = this.buildRequestOptions(options);
        
        // Add to active requests for loading state
        this.activeRequests.add(requestId);
        this.emitLoadingState(true);
        
        try {
            // Check rate limiting
            await this.checkRateLimit();
            
            // Execute request with retry logic
            const result = await this.executeWithRetry(url, requestOptions, requestId);
            
            // Track successful request
            this.requestCount++;
            this.lastRequestTime = Date.now();
            
            // Emit success event
            eventBus.emit(EVENTS.API_REQUEST_COMPLETED, {
                requestId,
                url,
                success: true,
                timestamp: new Date().toISOString()
            });
            
            return {
                success: true,
                data: result,
                requestId,
                timestamp: new Date().toISOString(),
                source: this.constructor.name
            };
            
        } catch (error) {
            this.errorCount++;
            
            // Emit error event
            eventBus.emit(EVENTS.API_REQUEST_FAILED, {
                requestId,
                url,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            return this.handleError(error, url, requestOptions, requestId);
            
        } finally {
            // Remove from active requests
            this.activeRequests.delete(requestId);
            if (this.activeRequests.size === 0) {
                this.emitLoadingState(false);
            }
        }
    }

    /**
     * Execute request with automatic retry logic
     */
    async executeWithRetry(url, options, requestId) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.defaultOptions.retries; attempt++) {
            try {
                // Emit attempt event
                eventBus.emit(EVENTS.API_REQUEST_STARTED, {
                    requestId,
                    url,
                    attempt,
                    maxAttempts: this.defaultOptions.retries
                });
                
                const response = await this.executeRequest(url, options);
                
                // If we get here, request succeeded
                return await this.handleResponse(response);
                
            } catch (error) {
                lastError = error;
                
                // Don't retry on certain errors
                if (this.shouldNotRetry(error)) {
                    throw error;
                }
                
                // If this was the last attempt, throw the error
                if (attempt === this.defaultOptions.retries) {
                    throw error;
                }
                
                // Calculate delay with exponential backoff
                const delay = this.calculateRetryDelay(attempt);
                console.warn(`🔄 API request failed (attempt ${attempt}/${this.defaultOptions.retries}), retrying in ${delay}ms:`, error.message);
                
                await AsyncUtils.delay(delay);
            }
        }
        
        throw lastError;
    }

    /**
     * Execute the actual HTTP request with timeout
     */
    async executeRequest(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${options.timeout}ms`);
            }
            
            throw error;
        }
    }

    /**
     * Handle and parse API response
     */
    async handleResponse(response) {
        // Handle rate limiting
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
            
            this.isRateLimited = true;
            setTimeout(() => {
                this.isRateLimited = false;
            }, delay);
            
            throw new Error(`Rate limited. Retry after ${delay}ms`);
        }

        // Handle other HTTP errors
        if (!response.ok) {
            const errorMessage = await this.extractErrorMessage(response);
            throw new Error(`HTTP ${response.status}: ${errorMessage}`);
        }

        // Parse response based on content type
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            return await response.json();
        } else if (contentType.includes('text/')) {
            return await response.text();
        } else {
            return await response.blob();
        }
    }

    /**
     * Extract meaningful error message from response
     */
    async extractErrorMessage(response) {
        try {
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                const errorData = await response.json();
                return errorData.message || errorData.error || response.statusText;
            } else {
                const text = await response.text();
                return text || response.statusText;
            }
        } catch {
            return response.statusText || 'Unknown error';
        }
    }

    /**
     * Build complete URL from endpoint
     */
    buildURL(endpoint) {
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
            return endpoint;
        }
        
        const baseURL = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        return `${baseURL}${path}`;
    }

    /**
     * Build request options with defaults
     */
    buildRequestOptions(options) {
        return {
            method: 'GET',
            ...this.defaultOptions,
            ...options,
            headers: {
                ...this.defaultOptions.headers,
                ...options.headers
            }
        };
    }

    /**
     * Check if we're rate limited and wait if necessary
     */
    async checkRateLimit() {
        if (this.isRateLimited) {
            throw new Error('Rate limited. Please wait before making more requests.');
        }
        
        // Simple rate limiting logic
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minInterval = this.defaultOptions.rateLimit.window / this.defaultOptions.rateLimit.requests;
        
        if (timeSinceLastRequest < minInterval) {
            const waitTime = minInterval - timeSinceLastRequest;
            await AsyncUtils.delay(waitTime);
        }
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    calculateRetryDelay(attempt) {
        return Math.min(
            this.defaultOptions.retryDelay * Math.pow(this.defaultOptions.retryMultiplier, attempt - 1),
            30000 // Max 30 seconds
        );
    }

    /**
     * Determine if error should not be retried
     */
    shouldNotRetry(error) {
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.message.includes('HTTP 4') && !error.message.includes('HTTP 429')) {
            return true;
        }
        
        // Don't retry on timeout if it's the final timeout
        if (error.message.includes('timeout') && error.message.includes('final')) {
            return true;
        }
        
        return false;
    }

    /**
     * Handle errors and create standardized error response
     */
    handleError(error, url, options, requestId) {
        console.error(`❌ API request failed [${requestId}]:`, error.message);
        
        let userMessage = 'An error occurred while fetching data.';
        
        if (error.message.includes('timeout')) {
            userMessage = 'Request timed out. Please check your connection and try again.';
        } else if (error.message.includes('Rate limited')) {
            userMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('Network')) {
            userMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('HTTP 404')) {
            userMessage = 'The requested resource was not found.';
        } else if (error.message.includes('HTTP 500')) {
            userMessage = 'Server error. Please try again later.';
        }
        
        return {
            success: false,
            error: error.message,
            userMessage,
            requestId,
            url,
            timestamp: new Date().toISOString(),
            source: this.constructor.name
        };
    }

    /**
     * Emit loading state changes
     */
    emitLoadingState(isLoading) {
        eventBus.emit(EVENTS.API_REQUEST_STARTED, {
            isLoading,
            activeRequests: this.activeRequests.size,
            source: this.constructor.name
        });
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            requests: this.requestCount,
            errors: this.errorCount,
            successRate: this.requestCount > 0 ? 
                ((this.requestCount - this.errorCount) / this.requestCount * 100).toFixed(2) + '%' : 
                '0%',
            activeRequests: this.activeRequests.size,
            isRateLimited: this.isRateLimited,
            lastRequestTime: this.lastRequestTime
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.requestCount = 0;
        this.errorCount = 0;
        this.lastRequestTime = 0;
        this.activeRequests.clear();
        this.isRateLimited = false;
    }
}