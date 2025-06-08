/**
 * TDD Test Suite for EnrichmentCoordinator Caching - Component 10.5d
 * Tests coordinator-level caching for enriched book results
 * Save as: js/utils/EnrichmentCaching.test.js
 */

class EnrichmentCachingTestSuite {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        console.log('🧪 EnrichmentCaching TDD Test Suite Initialized');
    }

    /**
     * Run all TDD tests for caching layer
     */
    async runAllTests() {
        console.log('🚀 Starting EnrichmentCaching TDD Tests...\n');
        
        await this.testCacheProperties();
        await this.testCachePerformance();
        await this.testCacheMethods();
        await this.testCacheExpiry();
        await this.testCacheCapacity();
        await this.testCacheClearing();
        await this.testCacheStats();
        
        this.printTestResults();
        return this.results;
    }

    /**
     * Test 1: Cache properties exist
     */
    async testCacheProperties() {
        await this.runTest('Cache Properties', async () => {
            const coordinator = window.app?.enrichmentCoordinator;
            
            if (!coordinator) {
                throw new Error('EnrichmentCoordinator not found');
            }

            // Test cache storage exists
            if (!coordinator.enrichmentCache) {
                throw new Error('enrichmentCache property missing');
            }

            if (typeof coordinator.enrichmentCache !== 'object') {
                throw new Error('enrichmentCache should be Map or object');
            }

            // Test cache configuration exists
            if (!coordinator.cacheExpiry || coordinator.cacheExpiry < 60000) {
                throw new Error('cacheExpiry should be set (minimum 1 minute)');
            }

            if (!coordinator.cacheLimit || coordinator.cacheLimit < 10) {
                throw new Error('cacheLimit should be set (minimum 10 entries)');
            }

            return 'Cache properties configured correctly';
        });
    }

    /**
     * Test 2: Cache performance improvement
     */
    async testCachePerformance() {
        await this.runTest('Cache Performance', async () => {
            const coordinator = window.app?.enrichmentCoordinator;
            if (!coordinator) throw new Error('EnrichmentCoordinator not found');

            const isbn = '9780743273565';
            
            // Clear cache to ensure clean test
            if (coordinator.clearCache) {
                coordinator.clearCache();
            }

            // First call (uncached)
            const start1 = performance.now();
            const result1 = await coordinator.enrichByISBN(isbn);
            const time1 = performance.now() - start1;

            if (!result1.success && !result1.partialSuccess) {
                throw new Error('First enrichment call failed');
            }

            // Second call (should be cached)
            const start2 = performance.now();
            const result2 = await coordinator.enrichByISBN(isbn);
            const time2 = performance.now() - start2;

            if (!result2.success && !result2.partialSuccess) {
                throw new Error('Second enrichment call failed');
            }

            // Performance improvement check
            const speedup = time1 / time2;
            
            if (speedup < 2) {
                throw new Error(`Insufficient cache speedup: ${speedup.toFixed(1)}x (expected 2x+)`);
            }

            // Results should be identical
            if (result1.enrichedBook.title !== result2.enrichedBook.title) {
                throw new Error('Cached result differs from original');
            }

            return `Cache speedup: ${speedup.toFixed(1)}x (${time1.toFixed(0)}ms → ${time2.toFixed(0)}ms)`;
        });
    }

    /**
     * Test 3: Cache management methods
     */
    async testCacheMethods() {
        await this.runTest('Cache Methods', async () => {
            const coordinator = window.app?.enrichmentCoordinator;
            if (!coordinator) throw new Error('EnrichmentCoordinator not found');

            // Test clearCache method
            if (typeof coordinator.clearCache !== 'function') {
                throw new Error('clearCache method missing');
            }

            // Test getCacheStats method
            if (typeof coordinator.getCacheStats !== 'function') {
                throw new Error('getCacheStats method missing');
            }

            // Test isCached method
            if (typeof coordinator.isCached !== 'function') {
                throw new Error('isCached method missing');
            }

            // Test cache stats return format
            const stats = coordinator.getCacheStats();
            if (!stats || typeof stats !== 'object') {
                throw new Error('getCacheStats should return stats object');
            }

            if (typeof stats.size !== 'number' || typeof stats.hitRate !== 'number') {
                throw new Error('Cache stats missing size or hitRate');
            }

            return 'All cache management methods exist with correct signatures';
        });
    }

    /**
     * Test 4: Cache expiry functionality
     */
    async testCacheExpiry() {
        await this.runTest('Cache Expiry', async () => {
            const coordinator = window.app?.enrichmentCoordinator;
            if (!coordinator) throw new Error('EnrichmentCoordinator not found');

            // Test with short expiry (if configurable)
            if (coordinator.setCacheExpiry) {
                const originalExpiry = coordinator.cacheExpiry;
                
                // Set very short expiry for testing
                coordinator.setCacheExpiry(100); // 100ms
                
                const isbn = '9780451524935'; // Different ISBN for clean test
                
                // First call
                await coordinator.enrichByISBN(isbn);
                
                // Wait for expiry
                await new Promise(resolve => setTimeout(resolve, 150));
                
                // Check if expired
                const isCached = coordinator.isCached(isbn, 'isbn');
                
                // Restore original expiry
                coordinator.setCacheExpiry(originalExpiry);
                
                if (isCached) {
                    throw new Error('Cache entry should have expired');
                }
                
                return 'Cache expiry working correctly';
            } else {
                // If expiry is not configurable, just verify it exists
                if (!coordinator.cacheExpiry) {
                    throw new Error('Cache expiry not configured');
                }
                
                return 'Cache expiry configured (not testable without setCacheExpiry method)';
            }
        });
    }

    /**
     * Test 5: Cache capacity limits
     */
    async testCacheCapacity() {
        await this.runTest('Cache Capacity', async () => {
            const coordinator = window.app?.enrichmentCoordinator;
            if (!coordinator) throw new Error('EnrichmentCoordinator not found');

            // Clear cache first
            coordinator.clearCache();
            
            const initialStats = coordinator.getCacheStats();
            
            if (initialStats.size !== 0) {
                throw new Error('Cache should be empty after clearing');
            }

            // Test that cache has a reasonable capacity limit
            if (coordinator.cacheLimit < 10) {
                throw new Error('Cache limit too small (should be at least 10)');
            }

            if (coordinator.cacheLimit > 1000) {
                throw new Error('Cache limit too large (should be reasonable for memory)');
            }

            return `Cache capacity appropriately set: ${coordinator.cacheLimit} entries`;
        });
    }

    /**
     * Test 6: Cache clearing functionality
     */
    async testCacheClearing() {
        await this.runTest('Cache Clearing', async () => {
            const coordinator = window.app?.enrichmentCoordinator;
            if (!coordinator) throw new Error('EnrichmentCoordinator not found');

            // Add something to cache
            await coordinator.enrichByISBN('9780743273565');
            
            let stats = coordinator.getCacheStats();
            if (stats.size === 0) {
                throw new Error('Cache should have entries before clearing');
            }

            // Clear cache
            coordinator.clearCache();
            
            stats = coordinator.getCacheStats();
            if (stats.size !== 0) {
                throw new Error('Cache should be empty after clearing');
            }

            return 'Cache clearing works correctly';
        });
    }

    /**
     * Test 7: Cache statistics tracking
     */
    async testCacheStats() {
        await this.runTest('Cache Statistics', async () => {
            const coordinator = window.app?.enrichmentCoordinator;
            if (!coordinator) throw new Error('EnrichmentCoordinator not found');

            coordinator.clearCache();
            
            const isbn = '9780743273565';
            
            // First call (miss)
            await coordinator.enrichByISBN(isbn);
            
            // Second call (hit)
            await coordinator.enrichByISBN(isbn);
            
            const stats = coordinator.getCacheStats();
            
            // Validate stats structure
            const requiredFields = ['size', 'hits', 'misses', 'hitRate', 'totalRequests'];
            for (const field of requiredFields) {
                if (typeof stats[field] !== 'number') {
                    throw new Error(`Missing or invalid stats field: ${field}`);
                }
            }

            if (stats.hits < 1) {
                throw new Error('Should have at least 1 cache hit');
            }

            if (stats.misses < 1) {
                throw new Error('Should have at least 1 cache miss');
            }

            if (stats.hitRate <= 0 || stats.hitRate > 100) {
                throw new Error('Hit rate should be between 0-100%');
            }

            return `Cache stats tracking: ${stats.hits} hits, ${stats.misses} misses, ${stats.hitRate.toFixed(1)}% hit rate`;
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
        console.log('\n📊 EnrichmentCaching TDD Test Results:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📋 Total: ${this.results.tests.length}`);
        
        if (this.results.failed > 0) {
            console.log('\n🎯 Implementation Requirements for 10.5d:');
            console.log('1. Add caching properties to EnrichmentCoordinator:');
            console.log('   - enrichmentCache: Map() for storing results');
            console.log('   - cacheExpiry: number (milliseconds)');
            console.log('   - cacheLimit: number (max entries)');
            console.log('   - cacheStats: object for tracking hits/misses');
            console.log('\n2. Add caching methods:');
            console.log('   - clearCache() - clear all cached entries');
            console.log('   - getCacheStats() - return cache statistics');
            console.log('   - isCached(query, type) - check if query is cached');
            console.log('   - setCacheExpiry(ms) - configure cache expiry');
            console.log('\n3. Modify enrichByISBN/enrichByTitle to:');
            console.log('   - Check cache before API calls');
            console.log('   - Store results in cache after enrichment');
            console.log('   - Track cache hits/misses');
            console.log('   - Respect cache expiry and capacity limits');
            console.log('\n4. Re-run tests to verify implementation');
        } else {
            console.log('\n🎉 All tests passed! EnrichmentCaching layer is complete!');
        }
    }
}

// Export test runner
export default function runEnrichmentCachingTDD() {
    console.log(`
🧪 EnrichmentCaching TDD Test Suite
=================================

Tests coordinator-level caching for Component 10.5d.
Expected: Most tests will FAIL initially (TDD approach!)

Starting tests...
`);

    const testSuite = new EnrichmentCachingTestSuite();
    return testSuite.runAllTests();
}

// Make globally available
if (typeof window !== 'undefined') {
    window.runEnrichmentCachingTDD = runEnrichmentCachingTDD;
    window.EnrichmentCachingTestSuite = EnrichmentCachingTestSuite;
}

console.log('EnrichmentCaching TDD Suite loaded. Run runEnrichmentCachingTDD() for testing.');