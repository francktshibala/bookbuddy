// js/app.js - Main entry point for the Book Buddy application.
// This script initializes the StorageManager and demonstrates basic usage.

import StorageManager from './utils/StorageManager.js';

// Initialize storage manager with a custom prefix for keys
const storage = new StorageManager('book-buddy');

// Update the page content to indicate storage availability
const statusElement = document.getElementById('welcome-msg');
if (statusElement) {
  statusElement.textContent = `Hello Book Buddy! Storage available: ${storage.isAvailable ? '✅' : '❌'}`;
}

// Example usage of StorageManager methods with console output:

// 1. Save a simple value (string) and log the result
let saveResult = storage.save('greeting', 'Welcome to Book Buddy');
console.log('Save result:', saveResult);

// 2. Load the value back and log the result
let loadResult = storage.load('greeting');
console.log('Load result:', loadResult);

// 3. Remove the value and verify removal
let removeResult = storage.remove('greeting');
console.log('Remove result:', removeResult);
let afterRemove = storage.load('greeting', 'not found');
console.log('After remove (should get default):', afterRemove);

// 4. Try loading a non-existent key (with a default value)
let missingResult = storage.load('nonexistentKey', 'default value');
console.log('Load missing key result:', missingResult);

// 5. Demonstrate error handling: simulate corrupted JSON data in localStorage
if (storage.isAvailable) {
  // Manually insert invalid JSON under the app's storage key
  localStorage.setItem('book-buddy_corruptedKey', '{ broken JSON');
}
let corruptLoadResult = storage.load('corruptedKey', 'fallback value');
console.log('Corrupted data load result:', corruptLoadResult);

// 6. Clear all Book Buddy data from storage and log the result
let clearResult = storage.clear();
console.log('Clear result:', clearResult);
