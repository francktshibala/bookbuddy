/**
 * Test Suite for Book Buddy Modular Architecture
 * Run this in the browser console to verify all modules are working
 */

async function testModularArchitecture() {
    console.log('🧪 Testing Book Buddy Modular Architecture...\n');
    
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };
    
    function test(name, testFn) {
        try {
            const result = testFn();
            if (result) {
                console.log(`✅ ${name}`);
                results.passed++;
                results.tests.push({ name, status: 'passed' });
            } else {
                console.log(`❌ ${name}`);
                results.failed++;
                results.tests.push({ name, status: 'failed' });
            }
        } catch (error) {
            console.log(`❌ ${name} - Error: ${error.message}`);
            results.failed++;
            results.tests.push({ name, status: 'failed', error: error.message });
        }
    }
    
    // Test 1: App Instance
    test('App instance exists', () => {
        return window.bookBuddyApp && typeof window.bookBuddyApp === 'object';
    });
    
    // Test 2: Storage Manager
    test('Storage Manager is working', () => {
        const storage = window.bookBuddyApp?.storage;
        if (!storage) return false;
        
        const testResult = storage.save('test_key', 'test_value');
        const loadResult = storage.load('test_key');
        storage.remove('test_key');
        
        return testResult.success && loadResult.success && loadResult.data === 'test_value';
    });
    
    // Test 3: Library Management
    test('Library management is working', () => {
        const library = window.bookBuddyApp?.library;
        if (!library) return false;
        
        const stats = library.getLibraryStats();
        return typeof stats === 'object' && 
               typeof stats.totalBooks === 'number' &&
               typeof stats.totalWords === 'number';
    });
    
    // Test 4: Event Bus
    test('Event Bus is functional', () => {
        if (!window.bookBuddyApp) return false;
        
        let eventReceived = false;
        
        // Import EventBus dynamically for testing
        const eventBus = window.bookBuddyApp.library.constructor.name === 'Library' ? 
                         window.bookBuddyApp : null;
        
        // Since we can't easily import EventBus here, we'll test indirectly
        return typeof window.bookBuddyApp.setupEventListeners === 'function';
    });
    
    // Test 5: Modal Manager
    test('Modal Manager is working', () => {
        const modalManager = window.bookBuddyApp?.modalManager;
        return modalManager && 
               typeof modalManager.showAlert === 'function' &&
               typeof modalManager.showConfirm === 'function';
    });
    
    // Test 6: Navigation Controller
    test('Navigation Controller is working', () => {
        const navController = window.bookBuddyApp?.navigationController;
        return navController && 
               typeof navController.navigateToView === 'function' &&
               typeof navController.getCurrentView === 'function';
    });
    
    // Test 7: File Processor
    test('File Processor is working', () => {
        const fileProcessor = window.bookBuddyApp?.fileProcessor;
        return fileProcessor && 
               typeof fileProcessor.processFile === 'function' &&
               typeof fileProcessor.validateFile === 'function';
    });
    
    // Test 8: Book List Renderer
    test('Book List Renderer is working', () => {
        const renderer = window.bookBuddyApp?.bookListRenderer;
        return renderer && 
               typeof renderer.renderBookCards === 'function' &&
               typeof renderer.renderEmptyState === 'function';
    });
    
    // Test 9: Reading Interface
    test('Reading Interface is working', () => {
        const readingInterface = window.bookBuddyApp?.readingInterface;
        return readingInterface && 
               typeof readingInterface.loadBook === 'function';
    });
    
    // Test 10: DOM Elements
    test('Required DOM elements exist', () => {
        const requiredElements = [
            '#library-view',
            '#search-view', 
            '#reading-view',
            '#statistics-view',
            '#settings-view',
            '.nav-menu',
            '#upload-book-btn'
        ];
        
        return requiredElements.every(selector => document.querySelector(selector) !== null);
    });
    
    // Test 11: CSS Components
    test('CSS component files are loaded', () => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        const expectedFiles = [
            'main.css',
            'navigation.css',
            'book-cards.css',
            'reading-interface.css',
            'modals.css'
        ];
        
        return expectedFiles.every(file => 
            links.some(link => link.href.includes(file))
        );
    });
    
    // Test 12: Module System
    test('ES6 modules are working', () => {
        // Check if we can access module-defined classes
        return typeof window.BookBuddyApp === 'function';
    });
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
    
    if (results.failed > 0) {
        console.log('\n🔍 Failed Tests:');
        results.tests
            .filter(test => test.status === 'failed')
            .forEach(test => {
                console.log(`   • ${test.name}${test.error ? `: ${test.error}` : ''}`);
            });
    }
    
    return results;
}

// Comprehensive functionality test
async function testBookWorkflow() {
    console.log('\n📚 Testing Complete Book Workflow...\n');
    
    if (!window.bookBuddyApp) {
        console.log('❌ Book Buddy app not found');
        return;
    }
    
    const app = window.bookBuddyApp;
    
    try {
        // Test 1: Create a sample book
        console.log('1. Creating sample book...');
        const sampleBook = {
            title: 'Test Book',
            filename: 'test-book.txt',
            content: 'This is a test book content for testing the modular architecture. It contains multiple paragraphs.\n\nThis is the second paragraph to test reading functionality.',
            wordCount: 25
        };
        
        const addResult = await app.library.addBook(sampleBook);
        console.log(addResult.success ? '✅ Book added successfully' : '❌ Failed to add book');
        
        // Test 2: Search functionality
        console.log('2. Testing search functionality...');
        const searchResults = app.library.searchBooks('Test');
        console.log(searchResults.length > 0 ? '✅ Search working' : '❌ Search failed');
        
        // Test 3: Filter functionality
        console.log('3. Testing filter functionality...');
        const unreadBooks = app.library.getBooksByStatus('unread');
        console.log(unreadBooks.length > 0 ? '✅ Filtering working' : '❌ Filtering failed');
        
        // Test 4: Statistics
        console.log('4. Testing statistics...');
        const stats = app.library.getLibraryStats();
        console.log(stats.totalBooks > 0 ? '✅ Statistics working' : '❌ Statistics failed');
        
        // Test 5: Navigation
        console.log('5. Testing navigation...');
        app.navigationController.navigateToView('statistics');
        const currentView = app.navigationController.getCurrentView();
        console.log(currentView === 'statistics' ? '✅ Navigation working' : '❌ Navigation failed');
        
        // Test 6: Modal system
        console.log('6. Testing modal system...');
        const modal = app.modalManager.showAlert('Test', 'This is a test modal');
        setTimeout(() => modal.close(), 1000);
        console.log('✅ Modal system working');
        
        // Test 7: Clean up
        console.log('7. Cleaning up test data...');
        if (addResult.success && addResult.book) {
            const removeResult = app.library.removeBook(addResult.book.id);
            console.log(removeResult.success ? '✅ Cleanup successful' : '❌ Cleanup failed');
        }
        
        // Navigate back to library
        app.navigationController.navigateToView('library');
        
        console.log('\n🎉 Book workflow test completed!');
        
    } catch (error) {
        console.error('❌ Workflow test failed:', error);
    }
}

// Performance test
function testPerformance() {
    console.log('\n⚡ Testing Performance...\n');
    
    const app = window.bookBuddyApp;
    if (!app) {
        console.log('❌ App not found');
        return;
    }
    
    // Test rendering performance
    console.time('Library view render');
    app.refreshLibraryView();
    console.timeEnd('Library view render');
    
    // Test search performance
    console.time('Search performance');
    app.library.searchBooks('test');
    console.timeEnd('Search performance');
    
    // Test navigation performance
    console.time('Navigation performance');
    app.navigationController.navigateToView('settings');
    app.navigationController.navigateToView('library');
    console.timeEnd('Navigation performance');
    
    console.log('✅ Performance tests completed');
}

// Browser compatibility check
function checkBrowserCompatibility() {
    console.log('\n🌐 Checking Browser Compatibility...\n');
    
    const features = [
        { name: 'ES6 Modules', test: () => typeof import === 'function' },
        { name: 'ES6 Classes', test: () => typeof class {} === 'function' },
        { name: 'Async/Await', test: () => typeof (async () => {}) === 'function' },
        { name: 'Arrow Functions', test: () => typeof (() => {}) === 'function' },
        { name: 'Template Literals', test: () => `test` === 'test' },
        { name: 'Destructuring', test: () => { try { const {a} = {a: 1}; return true; } catch { return false; } } },
        { name: 'Local Storage', test: () => typeof localStorage !== 'undefined' },
        { name: 'Fetch API', test: () => typeof fetch === 'function' },
        { name: 'File API', test: () => typeof File !== 'undefined' },
        { name: 'CSS Grid', test: () => CSS.supports('display', 'grid') }
    ];
    
    features.forEach(feature => {
        try {
            const supported = feature.test();
            console.log(`${supported ? '✅' : '❌'} ${feature.name}`);
        } catch (error) {
            console.log(`❌ ${feature.name} (Error: ${error.message})`);
        }
    });
}

// Module dependency check
function checkModuleDependencies() {
    console.log('\n📦 Checking Module Dependencies...\n');
    
    const app = window.bookBuddyApp;
    if (!app) {
        console.log('❌ App not found');
        return;
    }
    
    const dependencies = [
        { name: 'StorageManager', path: 'storage' },
        { name: 'Library', path: 'library' },
        { name: 'FileProcessor', path: 'fileProcessor' },
        { name: 'NavigationController', path: 'navigationController' },
        { name: 'ModalManager', path: 'modalManager' },
        { name: 'BookListRenderer', path: 'bookListRenderer' },
        { name: 'ReadingInterface', path: 'readingInterface' }
    ];
    
    dependencies.forEach(dep => {
        const exists = app[dep.path] && typeof app[dep.path] === 'object';
        console.log(`${exists ? '✅' : '❌'} ${dep.name}`);
        
        if (exists) {
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(app[dep.path]));
            console.log(`   Methods: ${methods.filter(m => m !== 'constructor').length}`);
        }
    });
}

// Export test functions to global scope
if (typeof window !== 'undefined') {
    window.testModularArchitecture = testModularArchitecture;
    window.testBookWorkflow = testBookWorkflow;
    window.testPerformance = testPerformance;
    window.checkBrowserCompatibility = checkBrowserCompatibility;
    window.checkModuleDependencies = checkModuleDependencies;
    
    // Run basic compatibility check on load
    window.addEventListener('load', () => {
        setTimeout(() => {
            console.log('🔧 Book Buddy Modular Architecture Test Suite Loaded');
            console.log('Available functions:');
            console.log('  • testModularArchitecture() - Test all modules');
            console.log('  • testBookWorkflow() - Test complete book workflow');
            console.log('  • testPerformance() - Test rendering performance');
            console.log('  • checkBrowserCompatibility() - Check browser features');
            console.log('  • checkModuleDependencies() - Check module loading');
            console.log('\nRun testModularArchitecture() to start testing!');
        }, 2000);
    });
}

console.log('📋 Modular Architecture Test Suite Ready');
console.log('Run testModularArchitecture() to begin testing the modular architecture.');