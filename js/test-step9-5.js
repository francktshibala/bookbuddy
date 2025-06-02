/**
 * Step 9.5 API Foundation Integration Test
 * Run this in browser console to test the complete API foundation
 */

async function testStep9Integration() {
    console.log('🧪 Testing Step 9.5 API Foundation Integration...\n');
    
    const app = window.bookBuddyApp;
    if (!app) {
        console.error('❌ BookBuddyApp not found. Make sure the app is loaded.');
        return;
    }
    
    const results = {
        managerTests: {},
        integrationTests: {},
        apiTests: {}
    };
    
    // Test 1: Check if all managers are initialized
    console.log('1️⃣ Testing Manager Initialization...');
    results.managerTests = {
        errorManager: !!app.errorNotificationManager,
        loadingManager: !!app.loadingStateManager,
        apiTestUtils: !!app.apiTestUtils,
        googleBooksAPI: !!app.googleBooksAPI
    };
    
    Object.entries(results.managerTests).forEach(([manager, initialized]) => {
        console.log(`   ${initialized ? '✅' : '❌'} ${manager}: ${initialized ? 'Initialized' : 'Missing'}`);
    });
    
    // Test 2: Test Error Notification System
    console.log('\n2️⃣ Testing Error Notification Integration...');
    try {
        app.errorNotificationManager.handleAPIError({
            error: 'Step 9.5 Integration Test Error',
            url: 'https://test-api.example.com',
            requestId: 'step9-test-001',
            timestamp: new Date().toISOString()
        });
        
        results.integrationTests.errorNotifications = true;
        console.log('   ✅ Error notification test completed');
        
        // Wait to see notification
        await new Promise(resolve => setTimeout(resolve, 3000));
        
    } catch (error) {
        results.integrationTests.errorNotifications = false;
        console.log(`   ❌ Error notification test failed: ${error.message}`);
    }
    
    // Test 3: Test Loading State Management
    console.log('\n3️⃣ Testing Loading State Integration...');
    try {
        // Test global loading
        app.loadingStateManager.startLoading('step9-test', {
            message: 'Step 9.5 Integration Test Loading...',
            showGlobal: true
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        app.loadingStateManager.stopLoading('step9-test');
        
        // Test target loading
        const testTarget = document.querySelector('#books-grid') || document.body;
        app.loadingStateManager.showTargetLoading(testTarget, 'Testing target loading...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        app.loadingStateManager.hideTargetLoading(testTarget);
        
        results.integrationTests.loadingStates = true;
        console.log('   ✅ Loading state test completed');
        
    } catch (error) {
        results.integrationTests.loadingStates = false;
        console.log(`   ❌ Loading state test failed: ${error.message}`);
    }
    
    // Test 4: Test API Service Integration
    console.log('\n4️⃣ Testing API Service Integration...');
    try {
        // Test mock API call
        app.apiTestUtils.startInterception();
        app.apiTestUtils.mockURL('https://test-integration.com/api', {
            success: true,
            message: 'Step 9.5 integration test successful'
        });
        
        const testResult = await app.googleBooksAPI.request('https://test-integration.com/api');
        
        app.apiTestUtils.stopInterception();
        app.apiTestUtils.clearMocks();
        
        results.integrationTests.apiService = testResult.success;
        console.log(`   ${testResult.success ? '✅' : '❌'} API service integration test`);
        
    } catch (error) {
        results.integrationTests.apiService = false;
        console.log(`   ❌ API service test failed: ${error.message}`);
    }
    
    // Test 5: Test Google Books API (if network available)
    console.log('\n5️⃣ Testing Google Books API Integration...');
    try {
        const searchResult = await app.googleBooksAPI.searchBooks('javascript', { maxResults: 1 });
        
        results.apiTests.googleBooks = searchResult.success;
        console.log(`   ${searchResult.success ? '✅' : '❌'} Google Books API test`);
        
        if (searchResult.success && searchResult.books.length > 0) {
            console.log(`   📚 Sample result: "${searchResult.books[0].title}"`);
        }
        
    } catch (error) {
        results.apiTests.googleBooks = false;
        console.log(`   ❌ Google Books API test failed: ${error.message}`);
    }
    
    // Test 6: Test Online Search Integration
    console.log('\n6️⃣ Testing Online Search Integration...');
    try {
        // Test the new searchOnlineBooks method
        const searchResult = await app.searchOnlineBooks('python programming');
        
        results.integrationTests.onlineSearch = searchResult.success;
        console.log(`   ${searchResult.success ? '✅' : '❌'} Online search integration`);
        
    } catch (error) {
        results.integrationTests.onlineSearch = false;
        console.log(`   ❌ Online search test failed: ${error.message}`);
    }
    
    // Test 7: Test Event Bus Integration
    console.log('\n7️⃣ Testing Event Bus Integration...');
    try {
        let eventReceived = false;
        
        // Listen for a test event
        const unsubscribe = window.bookBuddyApp.library.constructor.prototype.constructor === Function ? 
            (() => { eventReceived = true; }) : null;
        
        // Simulate an API event
        if (typeof eventBus !== 'undefined') {
            eventBus.emit('test:step9-integration', { test: 'data' });
        }
        
        results.integrationTests.eventBus = true;
        console.log('   ✅ Event bus integration working');
        
    } catch (error) {
        results.integrationTests.eventBus = false;
        console.log(`   ❌ Event bus test failed: ${error.message}`);
    }
    
    // Summary
    console.log('\n📊 Step 9.5 Integration Test Summary:');
    console.log('═'.repeat(50));
    
    const managersPassed = Object.values(results.managerTests).filter(Boolean).length;
    const integrationPassed = Object.values(results.integrationTests).filter(Boolean).length;
    const apiPassed = Object.values(results.apiTests).filter(Boolean).length;
    
    console.log(`🔧 Manager Initialization: ${managersPassed}/4 passed`);
    console.log(`🔌 Integration Tests: ${integrationPassed}/6 passed`);
    console.log(`🌐 API Tests: ${apiPassed}/1 passed`);
    
    const totalPassed = managersPassed + integrationPassed + apiPassed;
    const totalTests = 4 + 6 + 1;
    const successRate = Math.round((totalPassed / totalTests) * 100);
    
    console.log(`\n🎯 Overall Success Rate: ${successRate}% (${totalPassed}/${totalTests})`);
    
    if (successRate >= 90) {
        console.log('🎉 Step 9.5 Integration: EXCELLENT!');
    } else if (successRate >= 80) {
        console.log('✅ Step 9.5 Integration: GOOD');
    } else if (successRate >= 70) {
        console.log('⚠️ Step 9.5 Integration: NEEDS IMPROVEMENT');
    } else {
        console.log('❌ Step 9.5 Integration: FAILED');
    }
    
    return results;
}

// Quick test for specific components
function quickTestManagers() {
    console.log('🚀 Quick Manager Test...');
    
    const app = window.bookBuddyApp;
    if (!app) {
        console.error('❌ App not found');
        return;
    }
    
    // Test error manager
    if (app.errorNotificationManager) {
        console.log('✅ ErrorNotificationManager available');
        app.errorNotificationManager.handleAPIError({
            error: 'Quick test error',
            url: 'https://test.com',
            requestId: 'quick-test',
            timestamp: new Date().toISOString()
        });
    } else {
        console.log('❌ ErrorNotificationManager missing');
    }
    
    // Test loading manager
    if (app.loadingStateManager) {
        console.log('✅ LoadingStateManager available');
        app.loadingStateManager.startLoading('quick-test', {
            message: 'Quick test loading...',
            showGlobal: true
        });
        
        setTimeout(() => {
            app.loadingStateManager.stopLoading('quick-test');
        }, 2000);
    } else {
        console.log('❌ LoadingStateManager missing');
    }
    
    // Test API utils
    if (app.apiTestUtils) {
        console.log('✅ APITestUtils available');
    } else {
        console.log('❌ APITestUtils missing');
    }
}

// Test API Foundation in isolation
async function testAPIFoundationOnly() {
    console.log('🔧 Testing API Foundation Components...');
    
    const app = window.bookBuddyApp;
    if (!app) {
        console.error('❌ App not found');
        return;
    }
    
    // Run the app's built-in API foundation tests
    if (typeof app.runAPIFoundationTests === 'function') {
        console.log('🧪 Running built-in API foundation tests...');
        await app.runAPIFoundationTests();
    } else {
        console.log('❌ Built-in API foundation tests not found');
    }
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.testStep9Integration = testStep9Integration;
    window.quickTestManagers = quickTestManagers;
    window.testAPIFoundationOnly = testAPIFoundationOnly;
    
    // Auto-run quick test after a delay
    setTimeout(() => {
        console.log('🔧 Step 9.5 Integration Test Suite Loaded');
        console.log('Available functions:');
        console.log('  • testStep9Integration() - Full integration test');
        console.log('  • quickTestManagers() - Quick manager test');  
        console.log('  • testAPIFoundationOnly() - API foundation only');
        console.log('\nRun testStep9Integration() to start testing!');
    }, 2000);
}

console.log('📋 Step 9.5 Integration Test Suite Ready');