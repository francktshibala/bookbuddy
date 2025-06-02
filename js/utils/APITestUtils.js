/**
 * APITestUtils - Testing utilities for API services
 * Provides mock responses, error simulation, and testing helpers
 */
import { AsyncUtils } from './Helpers.js';

export default class APITestUtils {
    constructor() {
        this.mockResponses = new Map();
        this.interceptedFetch = null;
        this.isIntercepting = false;
        this.requestHistory = [];
        this.scenarios = new Map();
        
        this.setupDefaultScenarios();
        console.log('🧪 APITestUtils initialized');
    }

    /**
     * Setup default testing scenarios
     */
    setupDefaultScenarios() {
        // Success scenarios
        this.addScenario('google-books-success', {
            type: 'success',
            delay: 500,
            response: {
                kind: 'books#volumes',
                totalItems: 1,
                items: [{
                    id: 'test-book-id',
                    volumeInfo: {
                        title: 'Test Book',
                        authors: ['Test Author'],
                        description: 'A test book for API testing',
                        publishedDate: '2023',
                        pageCount: 200,
                        imageLinks: {
                            thumbnail: 'https://via.placeholder.com/128x192/2563eb/ffffff?text=Test+Book'
                        }
                    }
                }]
            }
        });

        // Error scenarios
        this.addScenario('network-error', {
            type: 'error',
            delay: 2000,
            error: new Error('Network error')
        });

        this.addScenario('timeout-error', {
            type: 'error',
            delay: 15000,
            error: new Error('Request timeout')
        });

        this.addScenario('rate-limit-error', {
            type: 'error',
            delay: 300,
            status: 429,
            response: { error: 'Rate limit exceeded' }
        });

        this.addScenario('server-error', {
            type: 'error',
            delay: 1000,
            status: 500,
            response: { error: 'Internal server error' }
        });

        this.addScenario('not-found-error', {
            type: 'error',
            delay: 500,
            status: 404,
            response: { error: 'Not found' }
        });

        // Slow response scenario
        this.addScenario('slow-response', {
            type: 'success',
            delay: 5000,
            response: { message: 'This was a slow response' }
        });
    }

    /**
     * Add a custom testing scenario
     */
    addScenario(name, scenario) {
        this.scenarios.set(name, {
            delay: 1000,
            type: 'success',
            ...scenario
        });
    }

    /**
     * Start intercepting fetch requests
     */
    startInterception() {
        if (this.isIntercepting) return;

        this.interceptedFetch = window.fetch;
        this.isIntercepting = true;

        window.fetch = async (url, options) => {
            return this.mockFetch(url, options);
        };

        console.log('🎯 API interception started');
    }

    /**
     * Stop intercepting fetch requests
     */
    stopInterception() {
        if (!this.isIntercepting) return;

        window.fetch = this.interceptedFetch;
        this.isIntercepting = false;
        this.interceptedFetch = null;

        console.log('🎯 API interception stopped');
    }

    /**
     * Mock fetch implementation
     */
    async mockFetch(url, options = {}) {
        // Record request
        const request = {
            url: url.toString(),
            method: options.method || 'GET',
            headers: options.headers || {},
            timestamp: new Date().toISOString()
        };
        this.requestHistory.push(request);

        // Check for specific mock response
        const mockResponse = this.findMockResponse(url, options);
        
        if (mockResponse) {
            console.log(`🎭 Using mock response for ${url}`);
            return this.createMockResponse(mockResponse, url);
        }

        // Check for scenario-based response
        const scenario = this.findScenario(url);
        
        if (scenario) {
            console.log(`🎬 Using scenario '${scenario.name}' for ${url}`);
            return this.executeScenario(scenario, url);
        }

        // Fallback to real fetch if no mock found
        console.log(`🌐 No mock found, using real fetch for ${url}`);
        return this.interceptedFetch(url, options);
    }

    /**
     * Find mock response for URL
     */
    findMockResponse(url, options) {
        const key = `${options.method || 'GET'} ${url}`;
        return this.mockResponses.get(key) || this.mockResponses.get(url.toString());
    }

    /**
     * Find scenario for URL
     */
    findScenario(url) {
        const urlString = url.toString();
        
        // Check for specific scenario mappings
        if (urlString.includes('googleapis.com/books')) {
            return { name: 'google-books', ...this.scenarios.get('google-books-success') };
        }
        
        if (urlString.includes('error-test')) {
            return { name: 'network-error', ...this.scenarios.get('network-error') };
        }
        
        if (urlString.includes('timeout-test')) {
            return { name: 'timeout-error', ...this.scenarios.get('timeout-error') };
        }
        
        if (urlString.includes('rate-limit-test')) {
            return { name: 'rate-limit-error', ...this.scenarios.get('rate-limit-error') };
        }
        
        if (urlString.includes('slow-test')) {
            return { name: 'slow-response', ...this.scenarios.get('slow-response') };
        }

        return null;
    }

    /**
     * Execute a testing scenario
     */
    async executeScenario(scenario, url) {
        // Add delay
        if (scenario.delay > 0) {
            await AsyncUtils.delay(scenario.delay);
        }

        if (scenario.type === 'error') {
            if (scenario.error) {
                throw scenario.error;
            } else {
                return this.createErrorResponse(scenario.status || 500, scenario.response);
            }
        }

        return this.createSuccessResponse(scenario.response);
    }

    /**
     * Create mock response object
     */
    createMockResponse(mockData, url) {
        if (mockData.error) {
            throw new Error(mockData.error);
        }

        return this.createSuccessResponse(mockData.response || mockData);
    }

    /**
     * Create success response
     */
    createSuccessResponse(data) {
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Map([
                ['content-type', 'application/json']
            ]),
            json: async () => data,
            text: async () => JSON.stringify(data),
            blob: async () => new Blob([JSON.stringify(data)]),
            clone: () => this.createSuccessResponse(data)
        };
    }

    /**
     * Create error response
     */
    createErrorResponse(status, data) {
        return {
            ok: false,
            status,
            statusText: this.getStatusText(status),
            headers: new Map([
                ['content-type', 'application/json']
            ]),
            json: async () => data,
            text: async () => JSON.stringify(data),
            blob: async () => new Blob([JSON.stringify(data)]),
            clone: () => this.createErrorResponse(status, data)
        };
    }

    /**
     * Get status text for HTTP status code
     */
    getStatusText(status) {
        const statusTexts = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable'
        };

        return statusTexts[status] || 'Error';
    }

    /**
     * Mock specific URL with response
     */
    mockURL(url, response, options = {}) {
        const method = options.method || 'GET';
        const key = `${method} ${url}`;
        
        this.mockResponses.set(key, {
            response,
            delay: options.delay || 500,
            error: options.error
        });

        console.log(`🎭 Mocked ${method} ${url}`);
    }

    /**
     * Remove mock for URL
     */
    unmockURL(url, method = 'GET') {
        const key = `${method} ${url}`;
        this.mockResponses.delete(key);
        console.log(`🚫 Unmocked ${method} ${url}`);
    }

    /**
     * Clear all mocks
     */
    clearMocks() {
        this.mockResponses.clear();
        console.log('🧹 All mocks cleared');
    }

    /**
     * Test API service with various scenarios
     */
    async testAPIService(apiService, testOptions = {}) {
        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };

        const tests = [
            {
                name: 'Successful Request',
                url: '/test-success',
                mock: { data: 'success' },
                expectSuccess: true
            },
            {
                name: 'Network Error',
                url: '/error-test',
                expectSuccess: false
            },
            {
                name: 'Rate Limit Handling',
                url: '/rate-limit-test',
                expectSuccess: false
            },
            {
                name: 'Timeout Handling',
                url: '/timeout-test',
                expectSuccess: false
            },
            {
                name: 'Slow Response',
                url: '/slow-test',
                expectSuccess: true
            }
        ];

        this.startInterception();

        for (const test of tests) {
            try {
                console.log(`🧪 Running test: ${test.name}`);
                
                if (test.mock) {
                    this.mockURL(test.url, test.mock);
                }

                const startTime = Date.now();
                const result = await apiService.request(test.url);
                const duration = Date.now() - startTime;

                const testResult = {
                    name: test.name,
                    passed: result.success === test.expectSuccess,
                    duration,
                    result
                };

                if (testResult.passed) {
                    results.passed++;
                    console.log(`✅ ${test.name} - ${duration}ms`);
                } else {
                    results.failed++;
                    console.log(`❌ ${test.name} - Expected success: ${test.expectSuccess}, Got: ${result.success}`);
                }

                results.tests.push(testResult);

            } catch (error) {
                results.failed++;
                results.tests.push({
                    name: test.name,
                    passed: false,
                    error: error.message,
                    result: null
                });
                console.log(`❌ ${test.name} - Error: ${error.message}`);
            }
        }

        this.stopInterception();
        this.clearMocks();

        console.log(`\n📊 Test Results: ${results.passed} passed, ${results.failed} failed`);
        return results;
    }

    /**
     * Test error notification system
     */
    async testErrorNotifications(errorManager) {
        console.log('🧪 Testing Error Notification System...');

        const testErrors = [
            {
                name: 'API Error',
                data: {
                    error: 'Connection failed',
                    url: 'https://api.example.com/test',
                    requestId: 'test-001',
                    timestamp: new Date().toISOString()
                }
            },
            {
                name: 'Storage Error',
                data: {
                    error: { message: 'Storage quota exceeded' },
                    context: 'saving book data'
                }
            }
        ];

        for (const test of testErrors) {
            console.log(`🔔 Testing ${test.name}`);
            
            if (test.name === 'API Error') {
                errorManager.handleAPIError(test.data);
            } else if (test.name === 'Storage Error') {
                errorManager.handleStorageError(test.data);
            }

            await AsyncUtils.delay(2000); // Wait to see notification
        }

        console.log('✅ Error notification tests completed');
    }

    /**
     * Test loading state manager
     */
    async testLoadingStates(loadingManager) {
        console.log('🧪 Testing Loading State Manager...');

        const tests = [
            {
                name: 'Global Loading',
                action: () => {
                    loadingManager.startLoading('global-test', {
                        message: 'Testing global loading...',
                        showGlobal: true
                    });
                    setTimeout(() => loadingManager.stopLoading('global-test'), 3000);
                }
            },
            {
                name: 'Target Loading',
                action: () => {
                    const target = document.querySelector('#books-grid') || document.body;
                    loadingManager.startLoading('target-test', {
                        message: 'Testing target loading...',
                        target: target,
                        showGlobal: false
                    });
                    setTimeout(() => loadingManager.stopLoading('target-test'), 2000);
                }
            },
            {
                name: 'Button Loading',
                action: () => {
                    const button = document.querySelector('#upload-book-btn');
                    if (button) {
                        loadingManager.showButtonLoading(button);
                        setTimeout(() => loadingManager.hideButtonLoading(button), 2500);
                    }
                }
            },
            {
                name: 'Progress Loading',
                action: async () => {
                    loadingManager.startLoading('progress-test', {
                        message: 'Testing progress...',
                        showProgress: true
                    });
                    
                    for (let i = 0; i <= 100; i += 10) {
                        loadingManager.updateProgress('progress-test', i, `Progress: ${i}%`);
                        await AsyncUtils.delay(200);
                    }
                    
                    loadingManager.stopLoading('progress-test');
                }
            }
        ];

        for (const test of tests) {
            console.log(`⏳ Testing ${test.name}`);
            await test.action();
            await AsyncUtils.delay(1000);
        }

        console.log('✅ Loading state tests completed');
    }

    /**
     * Run comprehensive API foundation tests
     */
    async runComprehensiveTests(apiService, errorManager, loadingManager) {
        console.log('🚀 Running Comprehensive API Foundation Tests...\n');

        const results = {
            apiService: null,
            errorNotifications: 'completed',
            loadingStates: 'completed',
            overall: 'success'
        };

        try {
            // Test API Service
            console.log('1️⃣ Testing API Service...');
            results.apiService = await this.testAPIService(apiService);

            // Test Error Notifications
            console.log('\n2️⃣ Testing Error Notifications...');
            await this.testErrorNotifications(errorManager);

            // Test Loading States
            console.log('\n3️⃣ Testing Loading States...');
            await this.testLoadingStates(loadingManager);

            console.log('\n🎉 All tests completed successfully!');

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            results.overall = 'failed';
        }

        return results;
    }

    /**
     * Get request history
     */
    getRequestHistory() {
        return [...this.requestHistory];
    }

    /**
     * Clear request history
     */
    clearRequestHistory() {
        this.requestHistory = [];
    }

    /**
     * Generate test data for different scenarios
     */
    generateTestData() {
        return {
            books: [
                {
                    id: 'test-1',
                    title: 'Test Book 1',
                    authors: ['Test Author 1'],
                    description: 'A test book for testing purposes',
                    publishedDate: '2023',
                    pageCount: 200
                },
                {
                    id: 'test-2',
                    title: 'Test Book 2',
                    authors: ['Test Author 2', 'Co-Author'],
                    description: 'Another test book with multiple authors',
                    publishedDate: '2022',
                    pageCount: 350
                }
            ],
            searchResults: {
                kind: 'books#volumes',
                totalItems: 2,
                items: [
                    // Books data above
                ]
            },
            errors: {
                network: new Error('Network connection failed'),
                timeout: new Error('Request timeout'),
                rateLimit: { status: 429, message: 'Rate limit exceeded' },
                serverError: { status: 500, message: 'Internal server error' }
            }
        };
    }

    /**
     * Create performance benchmarks
     */
    async benchmarkAPIService(apiService, iterations = 10) {
        console.log(`📊 Benchmarking API Service (${iterations} iterations)...`);

        this.startInterception();
        this.mockURL('/benchmark-test', { data: 'benchmark' }, { delay: 100 });

        const results = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            await apiService.request('/benchmark-test');
            const endTime = performance.now();
            
            results.push(endTime - startTime);
        }

        this.stopInterception();
        this.clearMocks();

        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        const min = Math.min(...results);
        const max = Math.max(...results);

        console.log(`📊 Benchmark Results:
        Average: ${avg.toFixed(2)}ms
        Min: ${min.toFixed(2)}ms
        Max: ${max.toFixed(2)}ms`);

        return { avg, min, max, results };
    }
}

// Export utility functions for easy testing
export const testHelpers = {
    /**
     * Quick test for API service
     */
    async quickTest(apiService) {
        const tester = new APITestUtils();
        return await tester.testAPIService(apiService);
    },

    /**
     * Mock Google Books API response
     */
    mockGoogleBooks(query = 'test') {
        const tester = new APITestUtils();
        tester.startInterception();
        
        const mockResponse = {
            kind: 'books#volumes',
            totalItems: 1,
            items: [{
                id: 'mock-book-id',
                volumeInfo: {
                    title: `Mock Book for "${query}"`,
                    authors: ['Mock Author'],
                    description: 'A mocked book response for testing',
                    publishedDate: '2023',
                    pageCount: 250,
                    imageLinks: {
                        thumbnail: 'https://via.placeholder.com/128x192?text=Mock+Book'
                    }
                }
            }]
        };

        tester.mockURL(`https://www.googleapis.com/books/v1/volumes?q=${query}`, mockResponse);
        
        return () => tester.stopInterception();
    },

    /**
     * Simulate network errors
     */
    simulateNetworkError(duration = 5000) {
        const tester = new APITestUtils();
        tester.startInterception();
        
        // Mock all requests to fail
        const originalFind = tester.findScenario;
        tester.findScenario = () => ({ name: 'network-error', ...tester.scenarios.get('network-error') });
        
        setTimeout(() => {
            tester.findScenario = originalFind;
            tester.stopInterception();
        }, duration);
        
        return tester;
    }
};