/**
 * Library Manager - Handles collection of books and library operations
 */
import Book from './Book.js';
import { eventBus, EVENTS } from '../utils/EventBus.js';

export default class Library {
    constructor(storageManager) {
        this.storage = storageManager;
        this.books = new Map();
        this.metadata = {
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            version: '2.0'
        };
        
        this.loadLibrary();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for storage errors
        eventBus.on(EVENTS.STORAGE_ERROR, (error) => {
            console.error('Library storage error:', error);
        });
    }

    async addBook(bookData) {
        try {
            const book = new Book(bookData);
            
            // Save to storage
            const saveResult = this.storage.save(`book_${book.id}`, book.toJSON());
            if (!saveResult.success) {
                return { success: false, message: saveResult.message };
            }
            
            // Add to memory
            this.books.set(book.id, book);
            this.updateMetadata();
            
            // Emit event
            eventBus.emit(EVENTS.BOOK_ADDED, { book });
            
            return { success: true, book };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    removeBook(bookId) {
        try {
            const book = this.books.get(bookId);
            if (!book) {
                return { success: false, message: 'Book not found' };
            }
            
            // Remove from storage
            const removeResult = this.storage.remove(`book_${bookId}`);
            if (!removeResult.success) {
                return { success: false, message: removeResult.message };
            }
            
            // Remove from memory
            this.books.delete(bookId);
            this.updateMetadata();
            
            // Emit event
            eventBus.emit(EVENTS.BOOK_DELETED, { bookId, book });
            
            return { success: true, book };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    updateBook(bookId, updates) {
        try {
            const book = this.books.get(bookId);
            if (!book) {
                return { success: false, message: 'Book not found' };
            }
            
            // Apply updates
            Object.assign(book, updates);
            
            // Save to storage
            const saveResult = this.storage.save(`book_${book.id}`, book.toJSON());
            if (!saveResult.success) {
                return { success: false, message: saveResult.message };
            }
            
            this.updateMetadata();
            
            // Emit event
            eventBus.emit(EVENTS.BOOK_UPDATED, { book, updates });
            
            return { success: true, book };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    getBook(bookId) {
        return this.books.get(bookId);
    }

    getAllBooks() {
        return Array.from(this.books.values());
    }

    searchBooks(query) {
        const searchTerm = query.toLowerCase();
        return this.getAllBooks().filter(book => 
            book.title.toLowerCase().includes(searchTerm) ||
            book.filename.toLowerCase().includes(searchTerm) ||
            book.content.toLowerCase().includes(searchTerm)
        );
    }

    getBooksByStatus(status) {
        return this.getAllBooks().filter(book => {
            const progress = book.getProgress();
            switch (status) {
                case 'unread':
                    return progress === 0;
                case 'reading':
                    return progress > 0 && progress < 1;
                case 'finished':
                    return progress >= 1;
                default:
                    return true;
            }
        });
    }

    getRecentBooks(limit = 5) {
        return this.getAllBooks()
            .sort((a, b) => new Date(b.lastRead || b.uploadDate) - new Date(a.lastRead || a.uploadDate))
            .slice(0, limit);
    }

    getLibraryStats() {
        const books = this.getAllBooks();
        const totalBooks = books.length;
        const totalWords = books.reduce((sum, book) => sum + book.wordCount, 0);
        const avgProgress = totalBooks > 0 
            ? books.reduce((sum, book) => sum + book.getProgress(), 0) / totalBooks
            : 0;
        const booksRead = books.filter(book => book.getProgress() >= 1).length;
        const booksReading = books.filter(book => {
            const progress = book.getProgress();
            return progress > 0 && progress < 1;
        }).length;
        const booksUnread = books.filter(book => book.getProgress() === 0).length;
        
        return {
            totalBooks,
            totalWords,
            avgProgress,
            booksRead,
            booksReading,
            booksUnread,
            totalNotes: books.reduce((sum, book) => sum + book.notes.length, 0),
            totalHighlights: books.reduce((sum, book) => sum + book.highlights.length, 0)
        };
    }

    loadLibrary() {
        try {
            // Load metadata
            const metadataResult = this.storage.load('library_metadata', this.metadata);
            if (metadataResult.success) {
                this.metadata = { ...this.metadata, ...metadataResult.data };
            }
            
            // Load all books
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('book-buddy_book_')) {
                    const bookKey = key.replace('book-buddy_', '');
                    const result = this.storage.load(bookKey);
                    if (result.success && result.data) {
                        const book = Book.fromJSON(result.data);
                        this.books.set(book.id, book);
                    }
                }
            }
            
            console.log(`Library loaded: ${this.books.size} books`);
        } catch (error) {
            console.error('Error loading library:', error);
            eventBus.emit(EVENTS.STORAGE_ERROR, { error, context: 'loadLibrary' });
        }
    }

    updateMetadata() {
        this.metadata.lastUpdated = new Date().toISOString();
        this.storage.save('library_metadata', this.metadata);
    }

    exportLibrary() {
        const exportData = {
            metadata: this.metadata,
            books: this.getAllBooks().map(book => book.toJSON())
        };
        return JSON.stringify(exportData, null, 2);
    }

    async importLibrary(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            const results = {
                imported: 0,
                skipped: 0,
                errors: []
            };
            
            for (const bookData of importData.books) {
                const result = await this.addBook(bookData);
                if (result.success) {
                    results.imported++;
                } else {
                    results.skipped++;
                    results.errors.push(result.message);
                }
            }
            
            return { success: true, results };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    clear() {
        // Remove all books from storage
        const bookIds = Array.from(this.books.keys());
        bookIds.forEach(bookId => {
            this.storage.remove(`book_${bookId}`);
        });
        
        // Clear memory
        this.books.clear();
        
        // Reset metadata
        this.metadata = {
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            version: '2.0'
        };
        this.storage.save('library_metadata', this.metadata);
        
        return { success: true, message: `Cleared library` };
    }
}