/**
 * StorageManager Test Suite
 * Run this in your browser console to test all functionality
 */

// Test StorageManager functionality
function testStorageManager() {
    console.log('🧪 Starting StorageManager Tests...\n');
    
    // Initialize StorageManager
    const storage = new StorageManager('test-app');
    
    // Test 1: Basic Save/Load
    console.log('📝 Test 1: Basic Save/Load');
    testBasicSaveLoad(storage);
    
    // Test 2: Error Handling
    console.log('\n🚫 Test 2: Error Handling');
    testErrorHandling(storage);
    
    // Test 3: Complex Data
    console.log('\n📊 Test 3: Complex Data');
    testComplexData(storage);
    
    // Test 4: Storage Management
    console.log('\n🗂️ Test 4: Storage Management');
    testStorageManagement(storage);
    
    // Test 5: Edge Cases
    console.log('\n⚠️ Test 5: Edge Cases');
    testEdgeCases(storage);
    
    console.log('\n✅ All tests completed!');
}

function testBasicSaveLoad(storage) {
    // Test string data
    let result = storage.save('username', 'john_doe');
    console.log('Save string:', result.success ? '✅' : '❌', result.message);
    
    result = storage.load('username');
    console.log('Load string:', result.success && result.data === 'john_doe' ? '✅' : '❌', 
                `Expected: john_doe, Got: ${result.data}`);
    
    // Test number data
    storage.save('user_age', 25);
    result = storage.load('user_age');
    console.log('Load number:', result.success && result.data === 25 ? '✅' : '❌',
                `Expected: 25, Got: ${result.data}`);
    
    // Test boolean data
    storage.save('is_premium', true);
    result = storage.load('is_premium');
    console.log('Load boolean:', result.success && result.data === true ? '✅' : '❌',
                `Expected: true, Got: ${result.data}`);
    
    // Test default values
    result = storage.load('nonexistent', 'default_value');
    console.log('Default value:', result.success && result.data === 'default_value' ? '✅' : '❌',
                `Expected: default_value, Got: ${result.data}`);
}

function testErrorHandling(storage) {
    // Test corrupted JSON (simulate by manually breaking localStorage)
    const testKey = 'test-app_corrupted_data';
    localStorage.setItem(testKey, '{invalid json');
    
    const result = storage.load('corrupted_data', 'fallback');
    console.log('Corrupted JSON handling:', result.success && result.data === 'fallback' ? '✅' : '❌',
                result.message);
    
    // Verify corrupted data was removed
    const exists = localStorage.getItem(testKey) === null;
    console.log('Corrupted data cleanup:', exists ? '✅' : '❌');
}

function testComplexData(storage) {
    // Test object data
    const bookData = {
        id: 'book_1',
        title: 'Test Book',
        author: 'Test Author',
        content: 'This is a test book content.',
        metadata: {
            pages: 100,
            genre: 'Fiction',
            published: 2023
        }
    };
    
    let result = storage.save('book_data', bookData);
    console.log('Save object:', result.success ? '✅' : '❌', result.message);
    
    result = storage.load('book_data');
    const loadedCorrectly = result.success && 
                           result.data.title === bookData.title &&
                           result.data.metadata.pages === bookData.metadata.pages;
    console.log('Load object:', loadedCorrectly ? '✅' : '❌');
    
    // Test array data
    const bookList = [
        { id: 1, title: 'Book 1' },
        { id: 2, title: 'Book 2' },
        { id: 3, title: 'Book 3' }
    ];
    
    storage.save('book_list', bookList);
    result = storage.load('book_list');
    console.log('Array data:', result.success && Array.isArray(result.data) && 
                result.data.length === 3 ? '✅' : '❌');
}

function testStorageManagement(storage) {
    // Test getting all keys
    const keys = storage.getAllKeys();
    console.log('Get all keys:', keys.length > 0 ? '✅' : '❌', 
                `Found ${keys.length} keys:`, keys);
    
    // Test storage info
    const info = storage.getStorageInfo();
    console.log('Storage info:', info.available ? '✅' : '❌',
                `App using ${info.appSize} bytes (${info.appPercentUsed}%)`);
    
    // Test remove specific key
    storage.save('temp_data', 'temporary');
    let result = storage.remove('temp_data');
    console.log('Remove key:', result.success ? '✅' : '❌', result.message);
    
    // Verify removal
    result = storage.load('temp_data', 'not_found');
    console.log('Verify removal:', result.data === 'not_found' ? '✅' : '❌');
}

function testEdgeCases(storage) {
    // Test empty string
    let result = storage.save('empty_string', '');
    console.log('Empty string save:', result.success ? '✅' : '❌');
    
    result = storage.load('empty_string');
    console.log('Empty string load:', result.success && result.data === '' ? '✅' : '❌');
    
    // Test null value
    storage.save('null_value', null);
    result = storage.load('null_value');
    console.log('Null value:', result.success && result.data === null ? '✅' : '❌');
    
    // Test undefined (should be converted to null)
    storage.save('undefined_value', undefined);
    result = storage.load('undefined_value');
    console.log('Undefined value:', result.success && result.data === null ? '✅' : '❌');
    
    // Test very long string (but not too long to break)
    const longString = 'x'.repeat(1000);
    result = storage.save('long_string', longString);
    console.log('Long string save:', result.success ? '✅' : '❌');
    
    result = storage.load('long_string');
    console.log('Long string load:', result.success && result.data.length === 1000 ? '✅' : '❌');
}

// Cleanup function for testing
function cleanupTestData() {
    const storage = new StorageManager('test-app');
    const result = storage.clear();
    console.log('🧹 Cleanup completed:', result.success ? '✅' : '❌', result.message);
}

// Usage demonstration
function demonstrateUsage() {
    console.log('📚 Book Buddy StorageManager Usage Examples:\n');
    
    const storage = new StorageManager('book-buddy');
    
    // Example 1: Save/Load a book
    console.log('💾 Saving a book...');
    const book = {
        id: 'book_001',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        content: 'In my younger and more vulnerable years...',
        progress: 0.3,
        notes: ['Great opening line', 'Symbolism of green light']
    };
    
    let result = storage.save('current_book', book);
    console.log('Save result:', result.message);
    
    // Example 2: Load the book
    console.log('\n📖 Loading the book...');
    result = storage.load('current_book');
    if (result.success) {
        console.log('Loaded book:', result.data.title, 'by', result.data.author);
        console.log('Progress:', Math.round(result.data.progress * 100) + '%');
    }
    
    // Example 3: Save user preferences
    console.log('\n⚙️ Saving user preferences...');
    const preferences = {
        theme: 'dark',
        fontSize: 16,
        readingGoal: 12, // books per year
        notifications: true
    };
    
    storage.save('user_preferences', preferences);
    
    // Example 4: Check storage usage
    console.log('\n📊 Storage usage:');
    const info = storage.getStorageInfo();
    console.log(`Using ${info.appSize} bytes (${info.appPercentUsed}% of limit)`);
    console.log(`Total app keys: ${info.appKeys}`);
    
    // Example 5: Error handling
    console.log('\n🚫 Error handling example:');
    result = storage.load('book_that_doesnt_exist', { title: 'No book selected' });
    console.log('Missing book fallback:', result.data.title);
    
    console.log('\n✨ Usage examples completed!');
}

// Make functions available globally for testing
if (typeof window !== 'undefined') {
    window.testStorageManager = testStorageManager;
    window.cleanupTestData = cleanupTestData;
    window.demonstrateUsage = demonstrateUsage;
}

// Auto-run basic test if this file is loaded
console.log('StorageManager test suite loaded. Run testStorageManager() to start testing.');
console.log('Available functions: testStorageManager(), demonstrateUsage(), cleanupTestData()');