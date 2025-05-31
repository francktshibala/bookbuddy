// js/app.js
import StorageManager from './utils/StorageManager.js';

// Initialize storage manager
const storage = new StorageManager('book-buddy');

// Test with sample data
console.log('📚 Book Buddy initialized!');
console.log('Storage available:', storage.isAvailable);

// Update status message
const statusElement = document.getElementById('status-message');
if (statusElement) {
    statusElement.textContent = `Hello Book Buddy! Storage available: ${storage.isAvailable ? '✅' : '❌'}`;
}

// Example usage (replace bookArray with actual data later)
const sampleBooks = [
    { id: 1, title: 'Sample Book', author: 'Test Author' }
];

const result = storage.save('user_books', sampleBooks);
if (result.success) {
    console.log('✅ Sample books saved!');
} else {
    console.error('❌ Save failed:', result.message);
}

// Load data
const loadResult = storage.load('user_books', []);
console.log('📖 Loaded books:', loadResult.data);