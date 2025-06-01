/**
 * APIService - Base class for API integrations
 * Provides common functionality for all API services
 */
export default class APIService {
    constructor(baseURL, options = {}) {
        this.baseURL = baseURL;
        this.defaultOptions = {
            timeout: 10000,
            retries: 3,
            retryDelay: 1000,
            ...options
        };
        this.requestCount = 0;
        this.errorCount = 0;
    }

    async request(endpoint, options = {}) {
        const url = this.buildURL(endpoint);
        const requestOptions = this.buildRequestOptions(options);
        
        this.requestCount++;
        
        try {
            const response = await this.executeRequest(url, requestOptions);
            return this.handleResponse(response);
        } catch (error) {
            this.errorCount++;
            return this.handleError(error, url, requestOptions);
        }
    }

    buildURL(endpoint) {
        if (endpoint.startsWith('http')) {
            return endpoint;
        }
        return `${this.baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    }

    buildRequestOptions(options) {
        return {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...this.defaultOptions.headers,
                ...options.headers
            },
            ...this.defaultOptions,
            ...options
        };
    }

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
            throw error;
        }
    }

    async handleResponse(response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return await response.text();
    }

    async handleError(error, url, options) {
        console.error(`API Request failed: ${url}`, error);
        
        // Return standardized error response
        return {
            success: false,
            error: error.message,
            url,
            timestamp: new Date().toISOString()
        };
    }

    // Rate limiting helper
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Retry logic for failed requests
    async requestWithRetry(endpoint, options = {}, retries = this.defaultOptions.retries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const result = await this.request(endpoint, options);
                if (result.success !== false) {
                    return result;
                }
                
                if (attempt === retries) {
                    return result; // Return last error
                }
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                await this.delay(this.defaultOptions.retryDelay * attempt);
            }
        }
    }

    // Get service statistics
    getStats() {
        return {
            requests: this.requestCount,
            errors: this.errorCount,
            successRate: this.requestCount > 0 ? 
                ((this.requestCount - this.errorCount) / this.requestCount * 100).toFixed(2) + '%' : 
                '0%'
        };
    }
}