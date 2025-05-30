// In your app.js or other modules
import StorageManager from './utils/StorageManager.js';

// Initialize storage manager
const storage = new StorageManager('book-buddy');

// Save data
const result = storage.save('user_books', bookArray);
if (result.success) {
    console.log('Books saved!');
} else {
    console.error('Save failed:', result.message);
}

// Load data
const loadResult = storage.load('user_books', []);
const books = loadResult.data; // Will be [] if no data exists