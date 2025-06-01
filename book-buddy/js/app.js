/**
 * Book Buddy - Main Application Controller (Modular Version)
 * Coordinates all modules and manages application state
 */

// Import all modules
import StorageManager from './modules/storage/StorageManager.js';
import Book from './modules/models/Book.js';
import Library from './modules/models/Library.js';
import FileProcessor from './modules/utils/FileProcessor.js';
import NavigationController from './modules/ui/NavigationController.js';
import ModalManager from './modules/ui/ModalManager.js';
import BookListRenderer from './modules/ui/BookListRenderer.js';
import ReadingInterface from './modules/ui/ReadingInterface.js';
import { eventBus, EVENTS } from './modules/utils/EventBus.js';
import { DOMUtils, DateUtils, StringUtils } from './modules/utils/Helpers.js';

class BookBuddyApp {
    constructor() {
        this.storage = new StorageManager('book-buddy');
        this.library = new Library(this.storage);
        this.fileProcessor = new FileProcessor();
        this.navigationController = new NavigationController();
        this.modalManager = new ModalManager();
        this.bookListRenderer = new BookListRenderer();
        this.readingInterface = new ReadingInterface();
        
        this.currentBook = null;
        this.appState = {
            initialized: false,
            currentView: 'library',
            theme: 'light',
            settings: {
                readingSpeed: 250,
                autoSave: true,
                notifications: true
            }
        };
        
        this.initialize();
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Book Buddy (Modular Version)...');
            
            // Load app settings
            await this.loadAppSettings();
            
            // Setup UI
            this.setupUI();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize views
            this.initializeViews();
            
            // Setup file upload
            this.setupFileUpload();
            
            this.appState.initialized = true;
            console.log('✅ Book Buddy initialized successfully!');
            
            // Show welcome message if no books
            this.checkForFirstTimeUser();
            
        } catch (error) {
            console.error('❌ Failed to initialize Book Buddy:', error);
            this.modalManager.showAlert(
                'Initialization Error',
                'Failed to initialize the application. Please refresh the page and try again.'
            );
        }
    }

    async loadAppSettings() {
        const settingsResult = this.storage.load('app_settings', this.appState.settings);
        
        if (settingsResult.success) {
            this.appState.settings = { ...this.appState.settings, ...settingsResult.data };
            
            // Apply theme
            if (settingsResult.data.theme) {
                document.body.classList.add(`theme-${settingsResult.data.theme}`);
            }
        }
    }

    setupUI() {
        // Register views with navigation controller
        this.navigationController.registerView('library', DOMUtils.query('#library-view'));
        this.navigationController.registerView('search', DOMUtils.query('#search-view'));
        this.navigationController.registerView('reading', DOMUtils.query('#reading-view'));
        this.navigationController.registerView('statistics', DOMUtils.query('#statistics-view'));
        this.navigationController.registerView('settings', DOMUtils.query('#settings-view'));
    }

    setupEventListeners() {
        // Upload book button
        const uploadBtn = DOMUtils.query('#upload-book-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.showUploadModal());
        }

        // Search online button
        const searchOnlineBtn = DOMUtils.query('#search-online-btn');
        if (searchOnlineBtn) {
            searchOnlineBtn.addEventListener('click', () => {
                this.navigationController.navigateToView('search');
            });
        }

        // Library search
        const searchInput = DOMUtils.query('#library-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchLibrary(e.target.value);
                }, 300);
            });
        }

        // Book filters
        const filterButtons = DOMUtils.queryAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Update active filter
                filterButtons.forEach(btn => DOMUtils.removeClass(btn, 'active'));
                DOMUtils.addClass(e.target, 'active');
                
                // Filter books
                this.filterBooks(e.target.dataset.filter);
            });
        });

        // Book events
        eventBus.on(EVENTS.BOOK_ADDED, (data) => {
            this.refreshLibraryView();
            this.modalManager.showAlert(
                'Book Added',
                `"${data.book.title}" has been added to your library!`
            );
        });

        eventBus.on(EVENTS.BOOK_UPDATED, () => {
            this.refreshLibraryView();
        });

        eventBus.on(EVENTS.BOOK_DELETED, (data) => {
            this.refreshLibraryView();
            this.modalManager.showAlert(
                'Book Removed',
                `"${data.book.title}" has been removed from your library.`
            );
        });

        // View change events
        eventBus.on(EVENTS.UI_VIEW_CHANGED, (data) => {
            this.handleViewChange(data.to);
        });

        // Reading events
        eventBus.on(EVENTS.BOOK_OPENED, (data) => {
            this.currentBook = data.book;
            this.readingInterface.loadBook(data.book);
            this.navigationController.navigateToView('reading');
        });
    }

    initializeViews() {
        // Initialize library view
        this.refreshLibraryView();
        
        // Initialize other views
        this.initializeStatisticsView();
        this.initializeSettingsView();
    }

    setupFileUpload() {
        // Setup drag and drop for the entire library view
        const libraryView = DOMUtils.query('#library-view');
        if (libraryView) {
            this.fileProcessor.setupDragAndDrop(libraryView, (result) => {
                if (result.success) {
                    this.library.addBook(result.bookData);
                } else {
                    this.modalManager.showAlert('Upload Error', result.message);
                }
            });
        }
    }

    showUploadModal() {
        this.modalManager.showBookUpload(async (file) => {
            try {
                // Show processing message
                const processingModal = this.modalManager.showModal({
                    title: 'Processing File',
                    content: '<div class="loading-modal"><div class="loading-spinner"></div><p class="loading-text">Processing your book file...</p></div>',
                    closable: false
                });

                // Process file
                const result = await this.fileProcessor.processFile(file);
                
                // Close processing modal
                processingModal.close();

                if (result.success) {
                    // Add book to library
                    const addResult = await this.library.addBook(result.bookData);
                    
                    if (!addResult.success) {
                        this.modalManager.showAlert('Error', addResult.message);
                    }
                } else {
                    this.modalManager.showAlert('Upload Error', result.message);
                }
            } catch (error) {
                this.modalManager.showAlert('Error', 'Failed to process file: ' + error.message);
            }
        });
    }

    refreshLibraryView() {
        this.updateLibraryStats();
        this.renderBooks();
    }

    updateLibraryStats() {
        const stats = this.library.getLibraryStats();
        const statsElement = DOMUtils.query('#library-stats');
        
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${stats.totalBooks}</div>
                    <div class="stat-label">Total Books</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.booksRead}</div>
                    <div class="stat-label">Books Read</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.booksReading}</div>
                    <div class="stat-label">Currently Reading</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalWords.toLocaleString()}</div>
                    <div class="stat-label">Total Words</div>
                </div>
            `;
        }
    }

    renderBooks(books = null) {
        const booksToRender = books || this.library.getAllBooks();
        const gridElement = DOMUtils.query('#books-grid');
        
        if (!gridElement) return;

        if (booksToRender.length === 0) {
            gridElement.innerHTML = this.bookListRenderer.renderEmptyState();
            return;
        }

        gridElement.innerHTML = this.bookListRenderer.renderBookCards(booksToRender);
        
        // Setup book card event listeners
        this.setupBookCardListeners();
    }

    setupBookCardListeners() {
        const bookCards = DOMUtils.queryAll('.book-card');
        bookCards.forEach(card => {
            const bookId = card.dataset.bookId;
            
            // Open book for reading
            const readBtn = card.querySelector('.btn-read');
            if (readBtn) {
                readBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const book = this.library.getBook(bookId);
                    if (book) {
                        eventBus.emit(EVENTS.BOOK_OPENED, { book });
                    }
                });
            }
            
            // Delete book
            const deleteBtn = card.querySelector('.btn-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const book = this.library.getBook(bookId);
                    if (book) {
                        const confirmed = await this.modalManager.showConfirm(
                            'Delete Book',
                            `Are you sure you want to delete "${book.title}"? This action cannot be undone.`,
                            'Delete',
                            'Cancel'
                        );
                        
                        if (confirmed) {
                            this.library.removeBook(bookId);
                        }
                    }
                });
            }

            // Show details
            const detailsBtn = card.querySelector('.btn-details');
            if (detailsBtn) {
                detailsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const book = this.library.getBook(bookId);
                    if (book) {
                        this.showBookDetails(book);
                    }
                });
            }
        });
    }

    showBookDetails(book) {
        const stats = book.getReadingStats();
        
        this.modalManager.showModal({
            title: `📖 ${book.title}`,
            content: `
                <div class="book-details">
                    <div class="detail-row">
                        <strong>Filename:</strong> ${book.filename}
                    </div>
                    <div class="detail-row">
                        <strong>Word Count:</strong> ${book.wordCount.toLocaleString()} words
                    </div>
                    <div class="detail-row">
                        <strong>Progress:</strong> ${stats.progressPercent}% complete
                    </div>
                    <div class="detail-row">
                        <strong>Added:</strong> ${DateUtils.formatDateTime(book.uploadDate)}
                    </div>
                    ${book.lastRead ? `
                        <div class="detail-row">
                            <strong>Last Read:</strong> ${DateUtils.formatDateTime(book.lastRead)}
                        </div>
                    ` : ''}
                    <div class="detail-row">
                        <strong>Notes:</strong> ${book.notes.length}
                    </div>
                    <div class="detail-row">
                        <strong>Highlights:</strong> ${book.highlights.length}
                    </div>
                    ${stats.estimatedTimeRemaining > 0 ? `
                        <div class="detail-row">
                            <strong>Time Remaining:</strong> ~${stats.estimatedTimeRemaining} minutes
                        </div>
                    ` : ''}
                </div>
            `,
            buttons: [
                {
                    text: 'Start Reading',
                    action: 'read',
                    className: 'btn-primary'
                },
                {
                    text: 'Close',
                    action: 'close',
                    className: 'btn-outline'
                }
            ],
            onAction: (action) => {
                if (action === 'read') {
                    eventBus.emit(EVENTS.BOOK_OPENED, { book });
                }
                return true;
            }
        });
    }

    searchLibrary(query) {
        if (!query.trim()) {
            this.renderBooks();
            return;
        }
        
        const results = this.library.searchBooks(query);
        this.renderBooks(results);
    }

    filterBooks(filter) {
        let books;
        
        switch (filter) {
            case 'unread':
                books = this.library.getBooksByStatus('unread');
                break;
            case 'reading':
                books = this.library.getBooksByStatus('reading');
                break;
            case 'finished':
                books = this.library.getBooksByStatus('finished');
                break;
            default:
                books = this.library.getAllBooks();
        }
        
        this.renderBooks(books);
    }

    handleViewChange(viewName) {
        switch (viewName) {
            case 'library':
                this.refreshLibraryView();
                break;
            case 'statistics':
                this.updateStatisticsView();
                break;
            case 'settings':
                this.updateSettingsView();
                break;
        }
    }

    initializeStatisticsView() {
        const content = DOMUtils.query('#statistics-content');
        if (content) {
            content.innerHTML = `
                <div class="empty-state">
                    <h3>📊 Reading Statistics</h3>
                    <p>Detailed statistics will be available in Week 2 Phase 3!</p>
                </div>
            `;
        }
    }

    updateStatisticsView() {
        const stats = this.library.getLibraryStats();
        const content = DOMUtils.query('#statistics-content');
        
        if (content) {
            content.innerHTML = `
                <div class="stats-overview">
                    <div class="library-stats">
                        ${this.bookListRenderer.renderBookStats(this.library.getAllBooks())}
                    </div>
                </div>
            `;
        }
    }

    initializeSettingsView() {
        const content = DOMUtils.query('#settings-content');
        if (content) {
            content.innerHTML = `
                <div class="settings-form">
                    <div class="form-group">
                        <label for="reading-speed">Reading Speed (words per minute)</label>
                        <input type="number" 
                               id="reading-speed" 
                               class="form-input"
                               value="${this.appState.settings.readingSpeed}" 
                               min="100" 
                               max="1000">
                    </div>
                    
                    <div class="form-group">
                        <div class="form-checkbox">
                            <input type="checkbox" 
                                   id="auto-save" 
                                   ${this.appState.settings.autoSave ? 'checked' : ''}>
                            <label for="auto-save">Auto-save reading progress</label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="form-checkbox">
                            <input type="checkbox" 
                                   id="notifications" 
                                   ${this.appState.settings.notifications ? 'checked' : ''}>
                            <label for="notifications">Enable notifications</label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <button class="btn btn-primary" id="save-settings">Save Settings</button>
                        <button class="btn btn-outline" id="export-library">Export Library</button>
                        <button class="btn btn-outline" id="import-library">Import Library</button>
                        <button class="btn btn-outline" id="clear-library">Clear Library</button>
                    </div>
                </div>
            `;
            
            this.setupSettingsListeners();
        }
    }

    updateSettingsView() {
        this.initializeSettingsView();
    }

    setupSettingsListeners() {
        const saveBtn = DOMUtils.query('#save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        const exportBtn = DOMUtils.query('#export-library');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportLibrary());
        }

        const importBtn = DOMUtils.query('#import-library');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importLibrary());
        }

        const clearBtn = DOMUtils.query('#clear-library');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLibrary());
        }
    }

    saveSettings() {
        const readingSpeed = parseInt(DOMUtils.query('#reading-speed')?.value) || 250;
        const autoSave = DOMUtils.query('#auto-save')?.checked || false;
        const notifications = DOMUtils.query('#notifications')?.checked || false;

        this.appState.settings = {
            readingSpeed,
            autoSave,
            notifications
        };

        const result = this.storage.save('app_settings', this.appState.settings);
        
        if (result.success) {
            this.modalManager.showAlert('Settings Saved', 'Your settings have been saved successfully!');
        } else {
            this.modalManager.showAlert('Error', 'Failed to save settings: ' + result.message);
        }
    }

    exportLibrary() {
        try {
            const exportData = this.library.exportLibrary();
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `book-buddy-library-${DateUtils.formatDate(new Date().toISOString()).replace(/\s/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.modalManager.showAlert('Export Complete', 'Your library has been exported successfully!');
        } catch (error) {
            this.modalManager.showAlert('Export Error', 'Failed to export library: ' + error.message);
        }
    }

    async importLibrary() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const result = await this.library.importLibrary(text);
                
                if (result.success) {
                    this.modalManager.showAlert(
                        'Import Complete', 
                        `Successfully imported ${result.results.imported} books!`
                    );
                    this.refreshLibraryView();
                } else {
                    this.modalManager.showAlert('Import Error', result.message);
                }
            } catch (error) {
                this.modalManager.showAlert('Import Error', 'Failed to import library: ' + error.message);
            }
        };
        
        input.click();
    }

    async clearLibrary() {
        const confirmed = await this.modalManager.showConfirm(
            'Clear Library',
            'Are you sure you want to clear your entire library? This action cannot be undone.',
            'Clear All',
            'Cancel'
        );
        
        if (confirmed) {
            const result = this.library.clear();
            if (result.success) {
                this.modalManager.showAlert('Library Cleared', 'Your library has been cleared successfully!');
                this.refreshLibraryView();
            } else {
                this.modalManager.showAlert('Error', 'Failed to clear library: ' + result.message);
            }
        }
    }

    checkForFirstTimeUser() {
        const books = this.library.getAllBooks();
        if (books.length === 0) {
            setTimeout(() => {
                this.modalManager.showModal({
                    title: '👋 Welcome to Book Buddy!',
                    content: `
                        <div style="text-align: center; padding: 1rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
                            <h3>Your Personal Digital Library</h3>
                            <p style="margin: 1rem 0;">Get started by uploading your first book or searching for books online.</p>
                            <div style="margin: 1.5rem 0; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                                <button class="btn btn-primary" id="welcome-upload">📤 Upload a Book</button>
                                <button class="btn btn-outline" id="welcome-search">🔍 Search Online</button>
                            </div>
                        </div>
                    `,
                    buttons: [
                        {
                            text: 'Get Started',
                            action: 'close',
                            className: 'btn-primary'
                        }
                    ],
                    onAction: (action) => {
                        return true; // Close modal
                    }
                });

                // Setup welcome modal buttons
                setTimeout(() => {
                    const uploadBtn = DOMUtils.query('#welcome-upload');
                    const searchBtn = DOMUtils.query('#welcome-search');
                    
                    if (uploadBtn) {
                        uploadBtn.addEventListener('click', () => {
                            this.modalManager.closeAllModals();
                            this.showUploadModal();
                        });
                    }
                    
                    if (searchBtn) {
                        searchBtn.addEventListener('click', () => {
                            this.modalManager.closeAllModals();
                            this.navigationController.navigateToView('search');
                        });
                    }
                }, 100);
            }, 1000);
        }
    }
}

// Export the main app class for use in index.html
export default BookBuddyApp;