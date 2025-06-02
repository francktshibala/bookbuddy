/**
 * Component 10.1 Test Suite - Enhanced GoogleBooksAPI
 * Comprehensive tests for the enhanced Google Books API service
 */

async function testComponent10_1() {
    console.log('🧪 Testing Component 10.1: Enhanced GoogleBooksAPI...\n');
    
    const results = {
        basicTests: {},
        enhancedTests: {},
        advancedTests: {},
        performanceTests: {}
    };
    
    // Initialize the enhanced API
    const api = window.bookBuddyApp?.googleBooksAPI;
    if (!api) {
        console.error('❌ GoogleBooksAPI not found. Make sure the app is loaded.');
        return;
    }
    
    console.log('🚀 Starting Enhanced GoogleBooksAPI Tests...\n');
    
    // Test 1: Basic Enhanced Search
    console.log('1️⃣ Testing Enhanced Search...');
    try {
        const result = await api.searchBooks('javascript programming', { maxResults: 5 });
        results.basicTests.enhancedSearch = result.success && result.books.length > 0 && result.enhanced;
        console.log(`   ${results.basicTests.enhancedSearch ? '✅' : '❌'} Enhanced search: ${result.books.length} books found`);
        
        if (result.success && result.books.length > 0) {
            console.log(`   📚 Sample: "${result.books[0].title}" by ${result.books[0].authors.join(', ')}`);
            console.log(`   🎯 Relevance score: ${result.books[0].relevanceScore || 'N/A'}`);
        }
    } catch (error) {
        results.basicTests.enhancedSearch = false;
        console.log(`   ❌ Enhanced search failed: ${error.message}`);
    }
    
    // Test 2: ISBN Search
    console.log('\n2️⃣ Testing ISBN Search...');
    try {
        // Test with a known ISBN (JavaScript: The Good Parts)
        const result = await api.searchByISBN('9780596517748');
        results.basicTests.isbnSearch = result.success;
        console.log(`   ${results.basicTests.isbnSearch ? '✅' : '❌'} ISBN search: ${result.success ? 'Found book' : 'Failed'}`);
        
        if (result.success && result.books.length > 0) {
            console.log(`   📖 Found: "${result.books[0].title}"`);
            console.log(`   🔍 Exact match: ${result.exactMatch ? 'Yes' : 'No'}`);
        }
    } catch (error) {
        results.basicTests.isbnSearch = false;
        console.log(`   ❌ ISBN search failed: ${error.message}`);
    }
    
    // Test 3: Author Search
    console.log('\n3️⃣ Testing Author Search...');
    try {
        const result = await api.searchByAuthor('Douglas Crockford', { maxResults: 3 });
        results.basicTests.authorSearch = result.success && result.books.length > 0;
        console.log(`   ${results.basicTests.authorSearch ? '✅' : '❌'} Author search: ${result.books.length} books found`);
        
        if (result.success && result.books.length > 0) {
            console.log(`   👤 Books by Douglas Crockford: ${result.books.map(b => b.title).join(', ')}`);
        }
    } catch (error) {
        results.basicTests.authorSearch = false;
        console.log(`   ❌ Author search failed: ${error.message}`);
    }
    
    // Test 4: Title Search
    console.log('\n4️⃣ Testing Title Search...');
    try {
        const result = await api.searchByTitle('Clean Code', { maxResults: 3 });
        results.basicTests.titleSearch = result.success;
        console.log(`   ${results.basicTests.titleSearch ? '✅' : '❌'} Title search: ${result.books.length} books found`);
        
        if (result.success && result.books.length > 0) {
            console.log(`   📚 Top result: "${result.books[0].title}" by ${result.books[0].authors.join(', ')}`);
        }
    } catch (error) {
        results.basicTests.titleSearch = false;
        console.log(`   ❌ Title search failed: ${error.message}`);
    }
    
    // Test 5: Subject Search
    console.log('\n5️⃣ Testing Subject Search...');
    try {
        const result = await api.searchBySubject('programming', { maxResults: 3 });
        results.basicTests.subjectSearch = result.success && result.books.length > 0;
        console.log(`   ${results.basicTests.subjectSearch ? '✅' : '❌'} Subject search: ${result.books.length} books found`);
    } catch (error) {
        results.basicTests.subjectSearch = false;
        console.log(`   ❌ Subject search failed: ${error.message}`);
    }
    
    // Test 6: Advanced Search
    console.log('\n6️⃣ Testing Advanced Search...');
    try {
        const criteria = {
            title: 'Python',
            author: 'Mark Lutz',
            subject: 'programming'
        };
        const result = await api.advancedSearch(criteria, { maxResults: 3 });
        results.enhancedTests.advancedSearch = result.success;
        console.log(`   ${results.enhancedTests.advancedSearch ? '✅' : '❌'} Advanced search: ${result.books.length} books found`);
        
        if (result.success && result.books.length > 0) {
            console.log(`   🎯 Advanced result: "${result.books[0].title}"`);
        }
    } catch (error) {
        results.enhancedTests.advancedSearch = false;
        console.log(`   ❌ Advanced search failed: ${error.message}`);
    }
    
    // Test 7: Batch Search
    console.log('\n7️⃣ Testing Batch Search...');
    try {
        const queries = ['React', 'Vue.js', 'Angular'];
        const result = await api.batchSearch(queries, { maxResults: 2 });
        results.enhancedTests.batchSearch = result.success && result.batchSearch;
        console.log(`   ${results.enhancedTests.batchSearch ? '✅' : '❌'} Batch search: ${result.totalResults} books from ${result.totalQueries} queries`);
        
        if (result.success) {
            console.log(`   📦 Batch results: ${result.books.slice(0, 3).map(b => b.title).join(', ')}...`);
        }
    } catch (error) {
        results.enhancedTests.batchSearch = false;
        console.log(`   ❌ Batch search failed: ${error.message}`);
    }
    
    // Test 8: Trending Books
    console.log('\n8️⃣ Testing Trending Books...');
    try {
        const result = await api.getTrendingBooks('fiction', { maxResults: 3 });
        results.enhancedTests.trendingBooks = result.success && result.batchSearch;
        console.log(`   ${results.enhancedTests.trendingBooks ? '✅' : '❌'} Trending books: ${result.totalResults} books found`);
    } catch (error) {
        results.enhancedTests.trendingBooks = false;
        console.log(`   ❌ Trending books failed: ${error.message}`);
    }
    
    // Test 9: Enhanced Book Details
    console.log('\n9️⃣ Testing Enhanced Book Details...');
    try {
        // Use a known book ID
        const result = await api.getEnhancedBookDetails('jAUODAAAQBAJ'); // Clean Code book ID
        results.enhancedTests.enhancedDetails = result.success && result.book.enhanced;
        console.log(`   ${results.enhancedTests.enhancedDetails ? '✅' : '❌'} Enhanced details: ${result.success ? 'Retrieved' : 'Failed'}`);
        
        if (result.success) {
            console.log(`   📋 Enhanced book: "${result.book.title}"`);
            console.log(`   ⏱️ Estimated reading time: ${result.book.readingTime} minutes`);
        }
    } catch (error) {
        results.enhancedTests.enhancedDetails = false;
        console.log(`   ❌ Enhanced details failed: ${error.message}`);
    }
    
    // Test 10: Caching System
    console.log('\n🔟 Testing Caching System...');
    try {
        const query = 'test caching query';
        
        // First search (should hit API)
        const startTime1 = Date.now();
        const result1 = await api.searchBooks(query, { maxResults: 1 });
        const time1 = Date.now() - startTime1;
        
        // Second search (should use cache)
        const startTime2 = Date.now();
        const result2 = await api.searchBooks(query, { maxResults: 1 });
        const time2 = Date.now() - startTime2;
        
        results.enhancedTests.caching = result1.success && result2.success && time2 < time1;
        console.log(`   ${results.enhancedTests.caching ? '✅' : '❌'} Caching: First: ${time1}ms, Second: ${time2}ms`);
    } catch (error) {
        results.enhancedTests.caching = false;
        console.log(`   ❌ Caching test failed: ${error.message}`);
    }
    
    // Test 11: Search History
    console.log('\n1️⃣1️⃣ Testing Search History...');
    try {
        const historyBefore = api.getSearchHistory();
        await api.searchBooks('history test query', { maxResults: 1 });
        const historyAfter = api.getSearchHistory();
        
        results.enhancedTests.searchHistory = historyAfter.length > historyBefore.length;
        console.log(`   ${results.enhancedTests.searchHistory ? '✅' : '❌'} Search history: ${historyAfter.length} entries tracked`);
        
        if (historyAfter.length > 0) {
            console.log(`   📝 Latest search: "${historyAfter[0].query}"`);
        }
    } catch (error) {
        results.enhancedTests.searchHistory = false;
        console.log(`   ❌ Search history failed: ${error.message}`);
    }
    
    // Test 12: Enhanced Statistics
    console.log('\n1️⃣2️⃣ Testing Enhanced Statistics...');
    try {
        const stats = api.getEnhancedStats();
        results.enhancedTests.enhancedStats = stats && typeof stats.cacheSize !== 'undefined';
        console.log(`   ${results.enhancedTests.enhancedStats ? '✅' : '❌'} Enhanced stats available`);
        
        if (stats) {
            console.log(`   📊 Cache size: ${stats.cacheSize}, History: ${stats.searchHistorySize}`);
            console.log(`   🌐 Requests: ${stats.requests}, Success rate: ${stats.successRate}`);
        }
    } catch (error) {
        results.enhancedTests.enhancedStats = false;
        console.log(`   ❌ Enhanced stats failed: ${error.message}`);
    }
    
    // Test 13: Error Handling
    console.log('\n1️⃣3️⃣ Testing Error Handling...');
    try {
        // Test with empty query
        const emptyResult = await api.searchBooks('');
        const emptyHandled = !emptyResult.success && emptyResult.message.includes('required');
        
        // Test with invalid ISBN
        const invalidISBN = await api.searchByISBN('invalid-isbn');
        const isbnHandled = !invalidISBN.success && invalidISBN.message.includes('Invalid ISBN');
        
        results.enhancedTests.errorHandling = emptyHandled && isbnHandled;
        console.log(`   ${results.enhancedTests.errorHandling ? '✅' : '❌'} Error handling: Empty query and invalid ISBN handled`);
    } catch (error) {
        results.enhancedTests.errorHandling = false;
        console.log(`   ❌ Error handling test failed: ${error.message}`);
    }
    
    // Test 14: Data Enhancement
    console.log('\n1️⃣4️⃣ Testing Data Enhancement...');
    try {
        const result = await api.searchBooks('programming', { maxResults: 1 });
        if (result.success && result.books.length > 0) {
            const book = result.books[0];
            const hasEnhancements = book.wordCount !== undefined && 
                                  book.readingTime !== undefined && 
                                  book.relevanceScore !== undefined &&
                                  book.releaseYear !== undefined;
            
            results.enhancedTests.dataEnhancement = hasEnhancements;
            console.log(`   ${results.enhancedTests.dataEnhancement ? '✅' : '❌'} Data enhancement: Enhanced fields present`);
            
            if (hasEnhancements) {
                console.log(`   📚 Enhanced data: ${book.wordCount} words, ${book.readingTime}min read, score: ${book.relevanceScore}`);
            }
        } else {
            results.enhancedTests.dataEnhancement = false;
            console.log(`   ❌ Data enhancement: No books to test`);
        }
    } catch (error) {
        results.enhancedTests.dataEnhancement = false;
        console.log(`   ❌ Data enhancement failed: ${error.message}`);
    }
    
    // Test 15: Performance Test
    console.log('\n1️⃣5️⃣ Testing Performance...');
    try {
        const iterations = 3;
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            await api.searchBooks(`performance test ${i}`, { maxResults: 1 });
            times.push(Date.now() - start);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        results.performanceTests.averageResponseTime = avgTime;
        results.performanceTests.performanceAcceptable = avgTime < 5000; // Under 5 seconds
        
        console.log(`   ${results.performanceTests.performanceAcceptable ? '✅' : '❌'} Performance: Average ${avgTime.toFixed(0)}ms`);
        console.log(`   ⚡ Times: ${times.map(t => t + 'ms').join(', ')}`);
    } catch (error) {
        results.performanceTests.performanceAcceptable = false;
        console.log(`   ❌ Performance test failed: ${error.message}`);
    }
    
    // Summary
    console.log('\n📊 Component 10.1 Test Summary:');
    console.log('═'.repeat(60));
    
    const basicPassed = Object.values(results.basicTests).filter(Boolean).length;
    const enhancedPassed = Object.values(results.enhancedTests).filter(Boolean).length;
    const performancePassed = Object.values(results.performanceTests).filter(Boolean).length;
    
    console.log(`🔧 Basic Tests: ${basicPassed}/5 passed`);
    console.log(`⚡ Enhanced Tests: ${enhancedPassed}/9 passed`);
    console.log(`🚀 Performance Tests: ${performancePassed}/2 passed`);
    
    const totalPassed = basicPassed + enhancedPassed + performancePassed;
    const totalTests = 5 + 9 + 2;
    const successRate = Math.round((totalPassed / totalTests) * 100);
    
    console.log(`\n🎯 Overall Success Rate: ${successRate}% (${totalPassed}/${totalTests})`);
    
    // Detailed results breakdown
    console.log('\n📋 Detailed Results:');
    console.log('Basic Tests:', results.basicTests);
    console.log('Enhanced Tests:', results.enhancedTests);
    console.log('Performance Tests:', results.performanceTests);
    
    if (successRate >= 90) {
        console.log('🎉 Component 10.1: EXCELLENT! Enhanced GoogleBooksAPI working perfectly!');
    } else if (successRate >= 80) {
        console.log('✅ Component 10.1: GOOD! Minor issues to address.');
    } else if (successRate >= 70) {
        console.log('⚠️ Component 10.1: NEEDS IMPROVEMENT. Several features not working.');
    } else {
        console.log('❌ Component 10.1: FAILED. Major issues need fixing.');
    }
    
    return results;
}

// Quick test for specific features
function quickTestEnhancedAPI() {
    console.log('🚀 Quick Enhanced API Test...');
    
    const api = window.bookBuddyApp?.googleBooksAPI;
    if (!api) {
        console.error('❌ API not found');
        return;
    }
    
    // Test enhanced search
    api.searchBooks('javascript', { maxResults: 3 }).then(result => {
        if (result.success) {
            console.log('✅ Enhanced search working');
            console.log(`📚 Found ${result.books.length} books`);
            if (result.books.length > 0) {
                console.log(`📖 Sample: "${result.books[0].title}"`);
                console.log(`🎯 Enhanced: ${result.enhanced ? 'Yes' : 'No'}`);
            }
        } else {
            console.log('❌ Enhanced search failed:', result.message);
        }
    }).catch(error => {
        console.log('❌ Enhanced search error:', error.message);
    });
}

// Test specific search types
async function testSearchTypes() {
    console.log('🔍 Testing All Search Types...');
    
    const api = window.bookBuddyApp?.googleBooksAPI;
    if (!api) {
        console.error('❌ API not found');
        return;
    }
    
    const tests = [
        { name: 'Basic Search', fn: () => api.searchBooks('python programming') },
        { name: 'ISBN Search', fn: () => api.searchByISBN('9781449355739') },
        { name: 'Author Search', fn: () => api.searchByAuthor('Robert Martin') },
        { name: 'Title Search', fn: () => api.searchByTitle('Clean Architecture') },
        { name: 'Subject Search', fn: () => api.searchBySubject('computer science') }
    ];
    
    for (const test of tests) {
        try {
            console.log(`🧪 Testing ${test.name}...`);
            const result = await test.fn();
            console.log(`   ${result.success ? '✅' : '❌'} ${test.name}: ${result.success ? result.books.length + ' books' : result.message}`);
        } catch (error) {
            console.log(`   ❌ ${test.name} error: ${error.message}`);
        }
    }
}

// Test caching effectiveness
async function testCaching() {
    console.log('📦 Testing Caching System...');
    
    const api = window.bookBuddyApp?.googleBooksAPI;
    if (!api) {
        console.error('❌ API not found');
        return;
    }
    
    const query = 'caching test query';
    
    console.log('🔄 First request (should hit API)...');
    const start1 = Date.now();
    const result1 = await api.searchBooks(query, { maxResults: 1 });
    const time1 = Date.now() - start1;
    
    console.log('🔄 Second request (should use cache)...');
    const start2 = Date.now();
    const result2 = await api.searchBooks(query, { maxResults: 1 });
    const time2 = Date.now() - start2;
    
    console.log(`⏱️ First: ${time1}ms, Second: ${time2}ms`);
    console.log(`📈 Speed improvement: ${time2 < time1 ? 'Yes' : 'No'} (${Math.round((time1 - time2) / time1 * 100)}%)`);
    
    const stats = api.getEnhancedStats();
    console.log(`💾 Cache size: ${stats.cacheSize} entries`);
}

// Integration test with the main app
async function testAppIntegration() {
    console.log('🔗 Testing App Integration...');
    
    const app = window.bookBuddyApp;
    if (!app) {
        console.error('❌ App not found');
        return;
    }
    
    try {
        // Test the app's searchOnlineBooks method
        console.log('🔍 Testing app.searchOnlineBooks...');
        const result = await app.searchOnlineBooks('react programming');
        
        if (result.success) {
            console.log('✅ App integration working');
            console.log(`📚 App found ${result.books.length} books`);
        } else {
            console.log('❌ App integration failed:', result.message);
        }
        
        // Test if results appear in UI
        const searchResults = document.querySelector('#search-results');
        if (searchResults && searchResults.children.length > 0) {
            console.log('✅ UI integration: Results displayed in DOM');
        } else {
            console.log('⚠️ UI integration: No results in DOM');
        }
        
    } catch (error) {
        console.log('❌ App integration error:', error.message);
    }
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.testComponent10_1 = testComponent10_1;
    window.quickTestEnhancedAPI = quickTestEnhancedAPI;
    window.testSearchTypes = testSearchTypes;
    window.testCaching = testCaching;
    window.testAppIntegration = testAppIntegration;
    
    // Auto-run quick test after delay
    setTimeout(() => {
        console.log('🧪 Component 10.1 Test Suite Loaded');
        console.log('Available functions:');
        console.log('  • testComponent10_1() - Full comprehensive test');
        console.log('  • quickTestEnhancedAPI() - Quick functionality test');
        console.log('  • testSearchTypes() - Test all search methods');
        console.log('  • testCaching() - Test caching system');
        console.log('  • testAppIntegration() - Test app integration');
        console.log('\nRun testComponent10_1() for full testing!');
    }, 1000);
}

console.log('📋 Component 10.1 Test Suite Ready');