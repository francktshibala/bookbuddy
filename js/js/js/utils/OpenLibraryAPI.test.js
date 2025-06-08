/**
 * TDD Test Suite for OpenLibraryAPI - Component 10.5a
 * Run this BEFORE implementing OpenLibraryAPI.js
 * Tests based on your existing APIService and GoogleBooksAPI patterns
 */

import APITestUtils from '../../../utils/APITestUtils.js';
import { eventBus, EVENTS } from '../../../utils/EventBus.js';

class OpenLibraryAPITestSuite {
    constructor() {
        this.testUtils = new APITestUtils();
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        console.log('🧪 OpenLibraryAPI TDD Test Suite Initialized');
        this.setupMockResponses();
    }

    /**
     * Setup mock responses for OpenLibrary API
     */
    setupMockResponses() {
        // Mock successful ISBN search
        this.testUtils.addScenario('openlibrary-isbn-success', {
            type: 'success',
            delay: 600,
            response: {
                title: "The Great Gatsby",
                authors: [{ name: "F. Scott Fitzgerald" }],
                publish_date: "1925",
                number_of_pages: 180,
                covers: [12345],
                subjects: ["Fiction", "American literature"],
                publishers: ["Charles Scribner's Sons"],
                isbn_10: ["0743273565"],
                isbn_13: ["9780743273565"],
                description: { value: "A classic American novel" }
            }
        });

        // Mock successful title search
        this.testUtils.addScenario('openlibrary-search-success', {
            type: 'success',
            delay: 800,
            response: {
                numFound: 2,
                docs: [
                    {
                        title: "The Great Gatsby",
                        author_name: ["F. Scott Fitzgerald"],
                        first_publish_year: 1925,
                        number_of_pages_median: 180,
                        cover_i: 12345,
                        subject: ["Fiction", "American literature"],
                        publisher: ["Charles Scribner's Sons"],
                        isbn: ["9780743273565", "0743273565"]
                    },
                    {
                        title: "Gatsby: The Cultural History",
                        author_name: ["Bob Batchelor"],
                        first_publish_year: 2014,
                        number_of_pages_median: 256,
                        cover_i: 67890
                    }
                ]
            }
        });

        // Mock rate limit error
        this.testUtils.addScenario('openlibrary-rate-limit', {
            type: 'error',
            status: 429,
            delay: 300,
            response: { error: 'Rate limit exceeded' }
        });

        // Mock not found error
        this.testUtils.addScenario('openlibrary-not-found', {
            type: 'error',
            status: 404,
            delay: 500,
            response: { error: 'Book not found' }
        });
    }

    /**
     * Run all tests - call this BEFORE implementing OpenLibraryAPI
     */
    async runAllTests() {
        console.log('🚀 Starting OpenLibraryAPI TDD Tests...\n');
        
        // These tests will fail initially - that's expected in TDD!
        await this.testConstructorAndInheritance();
        await this.testISBNSearch();
        await this.testTitleSearch();
        await this.testErrorHandling();
        await this.testEventBusIntegration();
        await this.testResponseFormatting();
        await this.testCaching();
        await this.testPerformanceRequirements();
        
        this.printTestResults();
        return this.results;
    }

    /**
     * Test 1: Constructor and APIService Inheritance
     */
    async testConstructorAndInheritance() {
        await this.runTest('Constructor and Inheritance', async () => {
            // This will fail until OpenLibraryAPI is implemented
            const OpenLibraryAPI = window.OpenLibraryAPI;
            
            if (!OpenLibraryAPI) {
                throw new Error('OpenLibraryAPI class not found - needs implementation');
            }

            const api = new OpenLibraryAPI();
            
            // Test inheritance from APIService
            if (!api.request || typeof api.request !== 'function') {
                throw new Error('Must extend APIService base class');
            }

            // Test correct base URL
            if (!api.baseURL || !api.baseURL.includes('openlibrary.org')) {
                throw new Error('Must use OpenLibrary.org base URL');
            }

            // Test proper timeout configuration (like GoogleBooksAPI)
            if (!api.defaultOptions || api.defaultOptions.timeout < 5000) {
                throw new Error('Should have appropriate timeout (8000ms like GoogleBooksAPI)');
            }

            return 'Constructor properly extends APIService with correct configuration';
        });
    }

    /**
     * Test 2: ISBN Search Functionality
     */
    async testISBNSearch() {
        await this.runTest('ISBN Search', async () => {
            const OpenLibraryAPI = window.OpenLibraryAPI;
            if (!OpenLibraryAPI) throw new Error('OpenLibraryAPI not implemented');

            const api = new OpenLibraryAPI();
            
            // Test method exists
            if (!api.searchByISBN || typeof api.searchByISBN !== 'function') {
                throw new Error('searchByISBN method not implemented');
            }

            // Mock the API call
            this.testUtils.startInterception();
            this.testUtils.mockURL('https://openlibrary.org/isbn/9780743273565.json', 
                this.testUtils.scenarios.get('openlibrary-isbn-success').response);

            // Test ISBN search
            const result = await api.searchByISBN('9780743273565');

            this.testUtils.stopInterception();

            // Validate response format (matching your GoogleBooksAPI pattern)
            if (!result.success) {
                throw new Error('ISBN search should return success: true');
            }

            if (!result.book || !result.book.title) {
                throw new Error('Should return formatted book object');
            }

            if (result.book.title !== "The Great Gatsby") {
                throw new Error('Should properly parse book title');
            }

            if (!result.source || !result.source.includes('OpenLibrary')) {
                throw new Error('Should include source attribution');
            }

            return 'ISBN search works with proper response formatting';
        });
    }

    /**
     * Test 3: Title Search Functionality
     */
    async testTitleSearch() {
        await this.runTest('Title Search', async () => {
            const OpenLibraryAPI = window.OpenLibraryAPI;
            if (!OpenLibraryAPI) throw new Error('OpenLibraryAPI not implemented');

            const api = new OpenLibraryAPI();
            
            // Test method exists
            if (!api.searchByTitle || typeof api.searchByTitle !== 'function') {
                throw new Error('searchByTitle method not implemented');
            }

            // Mock the search API
            this.testUtils.startInterception();
            this.testUtils.mockURL('https://openlibrary.org/search.json?title=gatsby&limit=5', 
                this.testUtils.scenarios.get('openlibrary-search-success').response);

            const result = await api.searchByTitle('gatsby');

            this.testUtils.stopInterception();

            // Validate response format
            if (!result.success) {
                throw new Error('Title search should return success: true');
            }

            if (!result.books || !Array.isArray(result.books)) {
                throw new Error('Should return books array (matching GoogleBooksAPI pattern)');
            }

            if (result.books.length === 0) {
                throw new Error('Should find books for test query');
            }

            // Check first book format
            const book = result.books[0];
            if (!book.id || !book.title || !book.authors) {
                throw new Error('Books should have standardized format (id, title, authors)');
            }

            return 'Title search returns properly formatted book array';
        });
    }

    /**
     * Test 4: Error Handling (following your APIService patterns)
     */
    async testErrorHandling() {
        await this.runTest('Error Handling', async () => {
            const OpenLibraryAPI = window.OpenLibraryAPI;
            if (!OpenLibraryAPI) throw new Error('OpenLibraryAPI not implemented');

            const api = new OpenLibraryAPI();

            // Test invalid ISBN handling
            const invalidResult = await api.searchByISBN('invalid-isbn');
            if (invalidResult.success !== false) {
                throw new Error('Should return success: false for invalid ISBN');
            }

            if (!invalidResult.message || !invalidResult.userMessage) {
                throw new Error('Should provide error messages (following APIService pattern)');
            }

            // Test network error handling
            this.testUtils.startInterception();
            this.testUtils.mockURL('https://openlibrary.org/isbn/test.json', null, { 
                error: 'Network error' 
            });

            const networkResult = await api.searchByISBN('1234567890');
            this.testUtils.stopInterception();

            if (networkResult.success !== false) {
                throw new Error('Should handle network errors gracefully');
            }

            if (!networkResult.source) {
                throw new Error('Error responses should include source attribution');
            }

            return 'Error handling follows APIService patterns';
        });
    }

    /**
     * Test 5: EventBus Integration
     */
    async testEventBusIntegration() {
        await this.runTest('EventBus Integration', async () => {
            const OpenLibraryAPI = window.OpenLibraryAPI;
            if (!OpenLibraryAPI) throw new Error('OpenLibraryAPI not implemented');

            let eventsEmitted = [];
            
            // Listen for API events
            const unsubscribes = [
                eventBus.on(EVENTS.API_REQUEST_STARTED, (data) => {
                    eventsEmitted.push({ event: 'started', data });
                }),
                eventBus.on(EVENTS.API_REQUEST_COMPLETED, (data) => {
                    eventsEmitted.push({ event: 'completed', data });
                })
            ];

            const api = new OpenLibraryAPI();

            // Mock successful request
            this.testUtils.startInterception();
            this.testUtils.mockURL('https://openlibrary.org/isbn/test.json', { title: 'Test' });

            await api.searchByISBN('test');

            this.testUtils.stopInterception();

            // Clean up event listeners
            unsubscribes.forEach(fn => fn());

            // Verify events were emitted
            const startedEvents = eventsEmitted.filter(e => e.event === 'started');
            const completedEvents = eventsEmitted.filter(e => e.event === 'completed');

            if (startedEvents.length === 0) {
                throw new Error('Should emit API_REQUEST_STARTED events');
            }

            if (completedEvents.length === 0) {
                throw new Error('Should emit API_REQUEST_COMPLETED events');
            }

            return 'EventBus integration works correctly';
        });
    }

    /**
     * Test 6: Response Formatting (matching your Book model)
     */
    async testResponseFormatting() {
        await this.runTest('Response Formatting', async () => {
            const OpenLibraryAPI = window.OpenLibraryAPI;
            if (!OpenLibraryAPI) throw new Error('OpenLibraryAPI not implemented');

            const api = new OpenLibraryAPI();

            // Test that response formatting creates Book-compatible objects
            if (!api.formatBookData || typeof api.formatBookData !== 'function') {
                throw new Error('Should have formatBookData method (like GoogleBooksAPI)');
            }

            // Test with mock OpenLibrary response
            const mockResponse = {
                title: "Test Book",
                authors: [{ name: "Test Author" }],
                publish_date: "2023",
                number_of_pages: 200,
                covers: [12345],
                isbn_10: ["1234567890"],
                isbn_13: ["9781234567890"]
            };

            const formatted = api.formatBookData(mockResponse);

            // Verify required Book model fields
            if (!formatted.id || !formatted.title || !formatted.authors) {
                throw new Error('Formatted data must include id, title, authors');
            }

            if (!Array.isArray(formatted.authors)) {
                throw new Error('Authors should be array format (matching Book model)');
            }

            if (!formatted.source || !formatted.source.includes('OpenLibrary')) {
                throw new Error('Should include source attribution');
            }

            if (!formatted.lastUpdated) {
                throw new Error('Should include timestamp (matching GoogleBooksAPI pattern)');
            }

            return 'Response formatting matches Book model requirements';
        });
    }

    /**
     * Test 7: Caching (optional but recommended)
     */
    async testCaching() {
        await this.runTest('Caching', async () => {
            const OpenLibraryAPI = window.OpenLibraryAPI;
            if (!OpenLibraryAPI) throw new Error('OpenLibraryAPI not implemented');

            const api = new OpenLibraryAPI();

            // Check if caching is implemented (like GoogleBooksAPI)
            if (!api.cache) {
                console.warn('⚠️ Caching not implemented - recommended for performance');
                return 'Caching not implemented (optional for initial version)';
            }

            // If caching exists, test it
            this.testUtils.startInterception();
            this.testUtils.mockURL('https://openlibrary.org/isbn/cached-test.json', { title: 'Cached Book' });

            // First request
            await api.searchByISBN('cached-test');
            
            // Second request should hit cache
            const cachedResult = await api.searchByISBN('cached-test');

            this.testUtils.stopInterception();

            if (!cachedResult.success) {
                throw new Error('Cached requests should succeed');
            }

            return 'Caching works correctly';
        });
    }

    /**
     * Test 8: Performance Requirements
     */
    async testPerformanceRequirements() {
        await this.runTest('Performance Requirements', async () => {
            const OpenLibraryAPI = window.OpenLibraryAPI;
            if (!OpenLibraryAPI) throw new Error('OpenLibraryAPI not implemented');

            const api = new OpenLibraryAPI();

            // Test request timeout configuration
            if (api.defaultOptions.timeout < 5000) {
                throw new Error('Timeout should be reasonable (5000ms+) for external API');
            }

            // Test retry configuration
            if (!api.defaultOptions.retries || api.defaultOptions.retries < 1) {
                throw new Error('Should have retry logic for reliability');
            }

            // Test that methods exist for batch operations (future extension)
            const expectedMethods = ['searchByISBN', 'searchByTitle', 'formatBookData'];
            for (const method of expectedMethods) {
                if (!api[method] || typeof api[method] !== 'function') {
                    throw new Error(`Missing required method: ${method}`);
                }
            }

            return 'Performance configuration meets requirements';
        });
    }

    /**
     * Helper method to run individual tests
     */
    async runTest(testName, testFunction) {
        console.log(`🧪 Running: ${testName}`);
        
        try {
            const result = await testFunction();
            this.results.passed++;
            this.results.tests.push({
                name: testName,
                status: 'PASSED',
                message: result
            });
            console.log(`✅ ${testName}: PASSED`);
        } catch (error) {
            this.results.failed++;
            this.results.tests.push({
                name: testName,
                status: 'FAILED',
                message: error.message
            });
            console.log(`❌ ${testName}: FAILED - ${error.message}`);
        }
    }

    /**
     * Print final test results
     */
    printTestResults() {
        console.log('\n📊 OpenLibraryAPI TDD Test Results:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📋 Total: ${this.results.tests.length}`);
        
        if (this.results.failed > 0) {
            console.log('\n🎯 Next Steps:');
            console.log('1. Implement OpenLibraryAPI.js with these requirements:');
            console.log('   - Extend APIService base class');
            console.log('   - Use https://openlibrary.org as base URL');
            console.log('   - Implement searchByISBN(isbn) method');
            console.log('   - Implement searchByTitle(title, options) method');
            console.log('   - Implement formatBookData(response) method');
            console.log('   - Follow GoogleBooksAPI patterns for consistency');
            console.log('\n2. Re-run tests to verify implementation');
            console.log('\n3. All tests should pass before proceeding to 10.5b');
        } else {
            console.log('\n🎉 All tests passed! OpenLibraryAPI implementation is complete!');
        }
    }

    /**
     * Generate implementation hints based on failed tests
     */
    generateImplementationHints() {
        const failedTests = this.results.tests.filter(t => t.status === 'FAILED');
        
        if (failedTests.length === 0) return 'All tests passed!';
        
        console.log('\n💡 Implementation Hints:');
        
        failedTests.forEach(test => {
            switch (test.name) {
                case 'Constructor and Inheritance':
                    console.log('🔧 Create class that extends APIService');
                    console.log('   - Use super("https://openlibrary.org", { timeout: 8000, retries: 2 })');
                    break;
                case 'ISBN Search':
                    console.log('🔧 Implement searchByISBN method');
                    console.log('   - Clean ISBN: isbn.replace(/[-\\s]/g, "")');
                    console.log('   - Use endpoint: `/isbn/${cleanISBN}.json`');
                    break;
                case 'Title Search':
                    console.log('🔧 Implement searchByTitle method');
                    console.log('   - Use endpoint: `/search.json?title=${title}&limit=${limit}`');
                    break;
                case 'Response Formatting':
                    console.log('🔧 Implement formatBookData method');
                    console.log('   - Convert OpenLibrary format to Book model format');
                    break;
            }
        });
    }
}

// Usage Instructions and Test Runner
export default function runOpenLibraryTDD() {
    console.log(`
🧪 OpenLibraryAPI TDD Test Suite
================================

This test suite defines the requirements for Component 10.5a.
Run this BEFORE implementing OpenLibraryAPI.js

Expected Result: ALL TESTS WILL FAIL initially (that's TDD!)

After implementing OpenLibraryAPI.js, run tests again to verify.

Starting tests...
`);

    const testSuite = new OpenLibraryAPITestSuite();
    return testSuite.runAllTests();
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
    window.runOpenLibraryTDD = runOpenLibraryTDD;
    window.OpenLibraryAPITestSuite = OpenLibraryAPITestSuite;
}

// Auto-run message
console.log('OpenLibraryAPI TDD Suite loaded. Run runOpenLibraryTDD() to start testing.');
// Make it globally available (add this to the end of the file)
window.runOpenLibraryTDD = runOpenLibraryTDD;