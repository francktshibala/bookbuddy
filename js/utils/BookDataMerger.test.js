/**
 * TDD Test Suite for BookDataMerger - Component 10.5b
 * Simple field-by-field data merging utility
 * Run this BEFORE implementing BookDataMerger.js
 */

class BookDataMergerTestSuite {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        console.log('🧪 BookDataMerger TDD Test Suite Initialized');
        this.setupTestData();
    }

    /**
     * Setup mock data for testing
     */
    setupTestData() {
        // Mock Google Books response
        this.googleBooksData = {
            id: 'google_123',
            title: 'The Great Gatsby',
            authors: ['F. Scott Fitzgerald'],
            description: 'A classic American novel about the Jazz Age.',
            publishedDate: '1925',
            pageCount: 180,
            thumbnail: 'https://books.google.com/covers/123.jpg',
            isbn13: '9780743273565',
            isbn10: '0743273565',
            categories: ['Fiction'],
            publisher: 'Scribner',
            language: 'en',
            averageRating: 4.2,
            ratingsCount: 1250,
            source: 'Google Books',
            lastUpdated: '2025-06-07T10:00:00Z'
        };

        // Mock OpenLibrary response  
        this.openLibraryData = {
            id: 'ol_work_123',
            title: 'The Great Gatsby',
            authors: ['F. Scott Fitzgerald'],
            description: 'A masterpiece of American literature set in the Roaring Twenties.',
            publishedDate: '1925-04-10',
            pageCount: 180,
            thumbnail: 'https://covers.openlibrary.org/b/id/123-M.jpg',
            isbn13: '9780743273565',
            categories: ['Fiction', 'American literature', 'Classics'],
            publisher: "Charles Scribner's Sons",
            language: 'en',
            source: 'OpenLibrary',
            lastUpdated: '2025-06-07T11:00:00Z',
            openLibraryKey: '/works/OL456M'
        };

        // Mock partial data scenarios
        this.partialGoogleData = {
            id: 'google_456',
            title: 'Incomplete Book',
            authors: ['Author Name'],
            publishedDate: '2023',
            source: 'Google Books'
        };

        this.partialOpenLibraryData = {
            id: 'ol_work_456', 
            title: 'Incomplete Book',
            authors: ['Author Name'],
            description: 'A detailed description from OpenLibrary.',
            pageCount: 250,
            categories: ['Non-fiction', 'Biography'],
            source: 'OpenLibrary'
        };
    }

    /**
     * Run all TDD tests
     */
    async runAllTests() {
        console.log('🚀 Starting BookDataMerger TDD Tests...\n');
        
        await this.testClassExists();
        await this.testBasicMerge();
        await this.testFieldPrioritization();
        await this.testArrayMerging();
        await this.testPartialDataHandling();
        await this.testSourceTracking();
        await this.testErrorHandling();
        await this.testPerformance();
        
        this.printTestResults();
        return this.results;
    }

    /**
     * Test 1: Class exists and has required methods
     */
    async testClassExists() {
        await this.runTest('Class Structure', async () => {
            const BookDataMerger = window.BookDataMerger;
            
            if (!BookDataMerger) {
                throw new Error('BookDataMerger class not found - needs implementation');
            }

            const merger = new BookDataMerger();
            
            // Test required methods
            const requiredMethods = ['merge', 'mergeBooks', 'prioritizeField'];
            for (const method of requiredMethods) {
                if (!merger[method] || typeof merger[method] !== 'function') {
                    throw new Error(`Missing required method: ${method}`);
                }
            }

            return 'BookDataMerger class has all required methods';
        });
    }

    /**
     * Test 2: Basic merge functionality
     */
    async testBasicMerge() {
        await this.runTest('Basic Merge', async () => {
            const BookDataMerger = window.BookDataMerger;
            if (!BookDataMerger) throw new Error('BookDataMerger not implemented');

            const merger = new BookDataMerger();
            
            // Test merging complete data
            const result = merger.merge(this.googleBooksData, this.openLibraryData);
            
            // Validate result structure
            if (!result || typeof result !== 'object') {
                throw new Error('merge() should return an object');
            }

            // Should have essential fields
            if (!result.title || !result.authors || !result.id) {
                throw new Error('Merged result missing essential fields');
            }

            // Should preserve both sources
            if (!result.title === 'The Great Gatsby') {
                throw new Error('Should preserve title correctly');
            }

            if (!Array.isArray(result.authors) || result.authors.length === 0) {
                throw new Error('Should preserve authors as array');
            }

            return 'Basic merge produces valid result with essential fields';
        });
    }

    /**
     * Test 3: Field prioritization rules
     */
    async testFieldPrioritization() {
        await this.runTest('Field Prioritization', async () => {
            const BookDataMerger = window.BookDataMerger;
            if (!BookDataMerger) throw new Error('BookDataMerger not implemented');

            const merger = new BookDataMerger();
            const result = merger.merge(this.googleBooksData, this.openLibraryData);
            
            // OpenLibrary should win for description (more detailed)
            if (result.description === this.googleBooksData.description) {
                throw new Error('Should prioritize OpenLibrary description when more detailed');
            }

            // Google Books should win for ratings (only source with ratings)
            if (!result.averageRating || result.averageRating !== 4.2) {
                throw new Error('Should preserve Google Books ratings when unique');
            }

            // More recent timestamp should win for lastUpdated
            if (result.lastUpdated !== this.openLibraryData.lastUpdated) {
                throw new Error('Should use more recent lastUpdated timestamp');
            }

            return 'Field prioritization follows logical rules';
        });
    }

    /**
     * Test 4: Array field merging (categories, authors)
     */
    async testArrayMerging() {
        await this.runTest('Array Merging', async () => {
            const BookDataMerger = window.BookDataMerger;
            if (!BookDataMerger) throw new Error('BookDataMerger not implemented');

            const merger = new BookDataMerger();
            const result = merger.merge(this.googleBooksData, this.openLibraryData);
            
            // Categories should be merged and deduplicated
            if (!Array.isArray(result.categories)) {
                throw new Error('Categories should be an array');
            }

            const expectedCategories = ['Fiction', 'American literature', 'Classics'];
            const hasAllCategories = expectedCategories.every(cat => 
                result.categories.includes(cat)
            );
            
            if (!hasAllCategories) {
                throw new Error('Should merge all unique categories from both sources');
            }

            // Should not have duplicates
            const uniqueCategories = [...new Set(result.categories)];
            if (result.categories.length !== uniqueCategories.length) {
                throw new Error('Should remove duplicate categories');
            }

            return 'Array fields merged correctly with deduplication';
        });
    }

    /**
     * Test 5: Partial data handling
     */
    async testPartialDataHandling() {
        await this.runTest('Partial Data Handling', async () => {
            const BookDataMerger = window.BookDataMerger;
            if (!BookDataMerger) throw new Error('BookDataMerger not implemented');

            const merger = new BookDataMerger();
            const result = merger.merge(this.partialGoogleData, this.partialOpenLibraryData);
            
            // Should combine data from both sources
            if (!result.description) {
                throw new Error('Should get description from OpenLibrary when Google Books lacks it');
            }

            if (!result.pageCount) {
                throw new Error('Should get pageCount from OpenLibrary when Google Books lacks it');
            }

            if (!result.publishedDate) {
                throw new Error('Should get publishedDate from Google Books when OpenLibrary lacks it');
            }

            // Should handle missing categories gracefully
            if (!Array.isArray(result.categories)) {
                throw new Error('Should handle missing categories from one source');
            }

            return 'Partial data merged successfully from both sources';
        });
    }

    /**
     * Test 6: Source tracking and metadata
     */
    async testSourceTracking() {
        await this.runTest('Source Tracking', async () => {
            const BookDataMerger = window.BookDataMerger;
            if (!BookDataMerger) throw new Error('BookDataMerger not implemented');

            const merger = new BookDataMerger();
            const result = merger.merge(this.googleBooksData, this.openLibraryData);
            
            // Should track which sources were used
            if (!result.sources || !Array.isArray(result.sources)) {
                throw new Error('Should track sources in array format');
            }

            const expectedSources = ['Google Books', 'OpenLibrary'];
            const hasAllSources = expectedSources.every(source => 
                result.sources.includes(source)
            );
            
            if (!hasAllSources) {
                throw new Error('Should track all source APIs used');
            }

            // Should include merge metadata
            if (!result.mergedAt || !result.mergeVersion) {
                throw new Error('Should include merge timestamp and version');
            }

            if (!result.dataQuality || typeof result.dataQuality !== 'object') {
                throw new Error('Should include data quality assessment');
            }

            return 'Source tracking and metadata included correctly';
        });
    }

    /**
     * Test 7: Error handling
     */
    async testErrorHandling() {
        await this.runTest('Error Handling', async () => {
            const BookDataMerger = window.BookDataMerger;
            if (!BookDataMerger) throw new Error('BookDataMerger not implemented');

            const merger = new BookDataMerger();
            
            // Test with null/undefined inputs
            let result = merger.merge(null, this.openLibraryData);
            if (!result || !result.title) {
                throw new Error('Should handle null first parameter gracefully');
            }

            result = merger.merge(this.googleBooksData, null);
            if (!result || !result.title) {
                throw new Error('Should handle null second parameter gracefully');
            }

            result = merger.merge(null, null);
            if (result !== null) {
                throw new Error('Should return null when both inputs are null');
            }

            // Test with empty objects
            result = merger.merge({}, this.openLibraryData);
            if (!result || !result.title) {
                throw new Error('Should handle empty first object gracefully');
            }

            return 'Error handling works for null/undefined/empty inputs';
        });
    }

    /**
     * Test 8: Performance requirements
     */
    async testPerformance() {
        await this.runTest('Performance', async () => {
            const BookDataMerger = window.BookDataMerger;
            if (!BookDataMerger) throw new Error('BookDataMerger not implemented');

            const merger = new BookDataMerger();
            
            // Test merge speed (should be very fast for simple operation)
            const startTime = performance.now();
            
            for (let i = 0; i < 100; i++) {
                merger.merge(this.googleBooksData, this.openLibraryData);
            }
            
            const endTime = performance.now();
            const avgTime = (endTime - startTime) / 100;
            
            if (avgTime > 10) { // 10ms per merge seems reasonable
                throw new Error(`Merge operation too slow: ${avgTime.toFixed(2)}ms average`);
            }

            // Test memory efficiency (should not create huge objects)
            const result = merger.merge(this.googleBooksData, this.openLibraryData);
            const resultSize = JSON.stringify(result).length;
            
            if (resultSize > 10000) { // Reasonable size limit
                throw new Error(`Merged result too large: ${resultSize} characters`);
            }

            return `Performance acceptable: ${avgTime.toFixed(2)}ms avg, ${resultSize} chars`;
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
        console.log('\n📊 BookDataMerger TDD Test Results:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📋 Total: ${this.results.tests.length}`);
        
        if (this.results.failed > 0) {
            console.log('\n🎯 Implementation Requirements:');
            console.log('1. Create js/utils/BookDataMerger.js with:');
            console.log('   - merge(googleData, openLibraryData) method');
            console.log('   - mergeBooks(book1, book2) method (alias)');
            console.log('   - prioritizeField(field, value1, value2) method');
            console.log('   - Smart field prioritization logic');
            console.log('   - Array merging with deduplication');
            console.log('   - Source tracking and metadata');
            console.log('   - Error handling for null/empty inputs');
            console.log('\n2. Re-run tests to verify implementation');
        } else {
            console.log('\n🎉 All tests passed! BookDataMerger implementation is complete!');
        }
    }
}

// Export test runner
export default function runBookDataMergerTDD() {
    console.log(`
🧪 BookDataMerger TDD Test Suite
===============================

This defines requirements for Component 10.5b.
Expected: ALL TESTS WILL FAIL initially (TDD approach!)

Starting tests...
`);

    const testSuite = new BookDataMergerTestSuite();
    return testSuite.runAllTests();
}

// Make globally available
if (typeof window !== 'undefined') {
    window.runBookDataMergerTDD = runBookDataMergerTDD;
    window.BookDataMergerTestSuite = BookDataMergerTestSuite;
}

console.log('BookDataMerger TDD Suite loaded. Run runBookDataMergerTDD() to start testing.');