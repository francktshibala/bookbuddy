/**
 * Book Buddy - Main Application Controller (Step 9.5 Integration)
 * Now includes ErrorNotificationManager and LoadingStateManager
 */

// Import all modules with CORRECTED PATHS
import StorageManager from './utils/StorageManager.js';
import Book from './modules/models/Book.js';
import Library from './modules/models/Library.js';
import FileProcessor from './utils/FileProcessor.js';
import APIService from './modules/services/APIService.js';
import GoogleBooksAPI from './modules/services/GoogleBooksAPI.js';
import NavigationController from './modules/ui/NavigationController.js';
import ModalManager from './modules/ui/ModalManager.js';
import BookListRenderer from './modules/ui/BookListRenderer.js';
import ReadingInterface from './modules/ui/ReadingInterface.js';
// ✅ NEW: Import Step 9 components
import ErrorNotificationManager from './modules/ui/ErrorNotificationManager.js';
import LoadingStateManager from './modules/ui/LoadingStateManager.js';
import APITestUtils from './utils/APITestUtils.js';
import { eventBus, EVENTS } from './utils/EventBus.js';
import { DOMUtils, DateUtils, StringUtils } from './utils/Helpers.js';

class BookBuddyApp {
    constructor() {
        this.storage = new StorageManager('book-buddy');
        this.library = new Library(this.storage);
        this.fileProcessor = new FileProcessor();
        this.navigationController = new NavigationController();
        this.modalManager = new ModalManager();
        this.bookListRenderer = new BookListRenderer();
        this.readingInterface = new ReadingInterface();
        
        // ✅ NEW: Initialize Step 9 components
        this.errorNotificationManager = new ErrorNotificationManager(this.modalManager);
        this.loadingStateManager = new LoadingStateManager();
        this.apiTestUtils = new APITestUtils();
        
        // Initialize API services
        this.googleBooksAPI = new GoogleBooksAPI();
        
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
            console.log('🚀 Initializing Book Buddy (Step 9.5 - API Foundation)...');
            
            // Load app settings
            await this.loadAppSettings();
            
            // Setup UI
            this.setupUI();
            
            // ✅ NEW: Setup Step 9 event listeners
            this.setupStep9EventListeners();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize views
            this.initializeViews();
            
            // Setup file upload
            this.setupFileUpload();
            
            this.appState.initialized = true;
            console.log('✅ Book Buddy initialized successfully with API Foundation!');
            
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

    // ✅ NEW: Setup Step 9 specific event listeners
    setupStep9EventListeners() {
        // Listen for API errors to show user notifications
        eventBus.on(EVENTS.API_REQUEST_FAILED, (data) => {
            console.log('🚨 API Request failed, showing user notification');
        });

        // Listen for API loading states
        eventBus.on(EVENTS.API_REQUEST_STARTED, (data) => {
            if (data.isLoading !== undefined) {
                // Global loading state change
                console.log(`⏳ Global loading: ${data.isLoading ? 'started' : 'stopped'}`);
            }
        });

        // Test API foundation on app start (in development)
        if (this.isDevelopmentMode()) {
            setTimeout(() => {
                this.runAPIFoundationTests();
            }, 3000);
        }
    }

    // ✅ NEW: Test the complete API foundation
    async runAPIFoundationTests() {
        console.log('🧪 Running API Foundation Tests...');
        
        // Create a test button in the UI for manual testing
        this.addTestingControls();
        
        try {
            // Test 1: Basic API Service functionality
            await this.testAPIService();
            
            // Test 2: Error notification system
            await this.testErrorNotifications();
            
            // Test 3: Loading state management
            await this.testLoadingStates();
            
            // Test 4: Google Books API integration
            await this.testGoogleBooksAPI();
            
            console.log('✅ All API Foundation tests completed successfully!');
            
        } catch (error) {
            console.error('❌ API Foundation tests failed:', error);
        }
    }

    // ✅ NEW: Test APIService with mock scenarios
    async testAPIService() {
        console.log('🔧 Testing APIService...');
        
        // Use APITestUtils to run comprehensive tests
        const results = await this.apiTestUtils.testAPIService(this.googleBooksAPI);
        
        console.log(`📊 APIService Test Results: ${results.passed} passed, ${results.failed} failed`);
        
        if (results.failed > 0) {
            console.warn('⚠️ Some API tests failed - check network connectivity');
        }
        
        return results;
    }

    // ✅ NEW: Test error notification system
    async testErrorNotifications() {
        console.log('🔔 Testing Error Notifications...');
        
        // Simulate different types of errors
        const testErrors = [
            {
                type: 'api',
                data: {
                    error: 'Test API connection error',
                    url: 'https://test-api.example.com',
                    requestId: 'test-001',
                    timestamp: new Date().toISOString()
                }
            },
            {
                type: 'storage',
                data: {
                    error: { message: 'Test storage quota warning' },
                    context: 'testing error notifications'
                }
            }
        ];

        for (const testError of testErrors) {
            console.log(`🧪 Testing ${testError.type} error notification...`);
            
            if (testError.type === 'api') {
                this.errorNotificationManager.handleAPIError(testError.data);
            } else if (testError.type === 'storage') {
                this.errorNotificationManager.handleStorageError(testError.data);
            }
            
            // Wait to see the notification
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('✅ Error notification tests completed');
    }

    // ✅ NEW: Test loading state management
    async testLoadingStates() {
        console.log('⏳ Testing Loading States...');
        
        // Test global loading
        this.loadingStateManager.startLoading('test-global', {
            message: 'Testing global loading state...',
            showGlobal: true
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.loadingStateManager.stopLoading('test-global');
        
        // Test target loading on books grid
        const booksGrid = DOMUtils.query('#books-grid');
        if (booksGrid) {
            this.loadingStateManager.startLoading('test-target', {
                message: 'Testing target loading...',
                target: booksGrid,
                showGlobal: false
            });
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            this.loadingStateManager.stopLoading('test-target');
        }
        
        // Test button loading
        const uploadBtn = DOMUtils.query('#upload-book-btn');
        if (uploadBtn) {
            this.loadingStateManager.showButtonLoading(uploadBtn, 'Upload Book');
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.loadingStateManager.hideButtonLoading(uploadBtn);
        }
        
        console.log('✅ Loading state tests completed');
    }

    // ✅ NEW: Test Google Books API integration
    async testGoogleBooksAPI() {
        console.log('📚 Testing Google Books API...');
        
        try {
            // Test search functionality
            const searchResults = await this.googleBooksAPI.searchBooks('javascript programming', {
                maxResults: 3
            });
            
            if (searchResults.success && searchResults.books.length > 0) {
                console.log(`✅ Google Books API working - found ${searchResults.books.length} books`);
                console.log('📖 Sample book:', searchResults.books[0].title);
            } else {
                console.warn('⚠️ Google Books API returned no results');
            }
            
        } catch (error) {
            console.error('❌ Google Books API test failed:', error);
        }
    }

    // ✅ NEW: Add testing controls to the UI
    addTestingControls() {
        // Only add in development mode
        if (!this.isDevelopmentMode()) return;
        
        const existingControls = DOMUtils.query('#api-testing-controls');
        if (existingControls) return; // Already added
        
        const testingHTML = `
            <div id="api-testing-controls" style="
                position: fixed; 
                bottom: 20px; 
                right: 20px; 
                background: var(--card-background); 
                padding: 1rem; 
                border-radius: var(--border-radius);
                box-shadow: var(--shadow-lg);
                border: 1px solid var(--border-color);
                z-index: 999;
                min-width: 200px;
            ">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">🧪 API Testing</h4>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-sm btn-outline" id="test-api-service">Test API Service</button>
                    <button class="btn btn-sm btn-outline" id="test-error-notifications">Test Errors</button>
                    <button class="btn btn-sm btn-outline" id="test-loading-states">Test Loading</button>
                    <button class="btn btn-sm btn-outline" id="test-google-books">Test Google Books</button>
                    <button class="btn btn-sm btn-outline" id="hide-testing-controls">Hide</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', testingHTML);
        
        // Setup event listeners for test buttons
        DOMUtils.query('#test-api-service')?.addEventListener('click', () => this.testAPIService());
        DOMUtils.query('#test-error-notifications')?.addEventListener('click', () => this.testErrorNotifications());
        DOMUtils.query('#test-loading-states')?.addEventListener('click', () => this.testLoadingStates());
        DOMUtils.query('#test-google-books')?.addEventListener('click', () => this.testGoogleBooksAPI());
        DOMUtils.query('#hide-testing-controls')?.addEventListener('click', () => {
            DOMUtils.query('#api-testing-controls')?.remove();
        });
    }

    // ✅ NEW: Check if in development mode
    isDevelopmentMode() {
        // Simple check - you can enhance this
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.search.includes('debug=true');
    }

    // ✅ ENHANCED: Improved search functionality with API integration
    async searchOnlineBooks(query) {
        if (!query || query.trim().length === 0) {
            return { success: false, message: 'Search query is required' };
        }

        console.log(`🔍 Searching for books: "${query}"`);
        
        // Show loading state
        this.loadingStateManager.startLoading('online-search', {
            message: `Searching for "${query}"...`,
            showGlobal: true
        });

        try {
            const results = await this.googleBooksAPI.searchBooks(query, {
                maxResults: 10
            });
            
            this.loadingStateManager.stopLoading('online-search');
            
            if (results.success) {
                console.log(`✅ Found ${results.books.length} books`);
                this.displaySearchResults(results.books);
                return results;
            } else {
                console.warn('⚠️ Search failed:', results.message);
                return results;
            }
            
        } catch (error) {
            this.loadingStateManager.stopLoading('online-search');
            console.error('❌ Search error:', error);
            return { success: false, message: error.message };
        }
    }

    // ✅ NEW: Display search results in the UI
    displaySearchResults(books) {
        const searchResultsContainer = DOMUtils.query('#search-results');
        if (!searchResultsContainer) return;

        if (books.length === 0) {
            searchResultsContainer.innerHTML = this.bookListRenderer.renderEmptyState();
            return;
        }

        const resultsHTML = this.bookListRenderer.renderSearchResults(books);
        searchResultsContainer.innerHTML = resultsHTML;

        // Setup event listeners for "Add to Library" buttons
        this.setupSearchResultListeners();
    }

    // ✅ NEW: Setup event listeners for search results
    setupSearchResultListeners() {
        const addButtons = DOMUtils.queryAll('.btn-add-book');
        addButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const bookInfo = JSON.parse(e.target.dataset.bookInfo);
                await this.addBookFromSearch(bookInfo);
            });
        });
    }

    // ✅ NEW: Add book from search results to library
    async addBookFromSearch(bookInfo) {
        try {
            console.log(`📚 Adding book to library: ${bookInfo.title}`);
            
            // Show loading on the specific button
            const button = event.target;
            this.loadingStateManager.showButtonLoading(button, 'Add to Library');
            
            // Create book data from search result
            const bookData = {
                title: bookInfo.title,
                filename: `${bookInfo.title}.txt`,
                content: bookInfo.description || 'No content available for this book.',
                metadata: {
                    authors: bookInfo.authors || [],
                    publisher: bookInfo.publisher || '',
                    publishedDate: bookInfo.publishedDate || '',
                    thumbnail: bookInfo.thumbnail || '',
                    source: 'Google Books',
                    sourceId: bookInfo.id
                }
            };
            
            const result = await this.library.addBook(bookData);
            
            this.loadingStateManager.hideButtonLoading(button);
            
            if (result.success) {
                this.modalManager.showAlert(
                    'Book Added',
                    `"${bookInfo.title}" has been added to your library!`
                );
                
                // Refresh library view if we're on that view
                if (this.navigationController.getCurrentView() === 'library') {
                    this.refreshLibraryView();
                }
            } else {
                this.modalManager.showAlert('Error', `Failed to add book: ${result.message}`);
            }
            
        } catch (error) {
            console.error('❌ Error adding book from search:', error);
            this.modalManager.showAlert('Error', `Failed to add book: ${error.message}`);
        }
    }

    // ✅ ENHANCED: Enhanced search online button handler
    setupEventListeners() {
        // Upload book button
        const uploadBtn = DOMUtils.query('#upload-book-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.showUploadModal());
        }

        // ✅ ENHANCED: Search online button with API integration
        const searchOnlineBtn = DOMUtils.query('#search-online-btn');
        if (searchOnlineBtn) {
            searchOnlineBtn.addEventListener('click', () => {
                this.navigationController.navigateToView('search');
            });
        }

        // ✅ NEW: Online search functionality
        const onlineSearchInput = DOMUtils.query('#online-search');
        const searchBtn = DOMUtils.query('#search-btn');
        
        if (onlineSearchInput && searchBtn) {
            const performSearch = () => {
                const query = onlineSearchInput.value.trim();
                if (query) {
                    this.searchOnlineBooks(query);
                }
            };
            
            searchBtn.addEventListener('click', performSearch);
            onlineSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
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

    // Rest of your existing methods remain the same...
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
                // Show processing message with loading manager
                this.loadingStateManager.startLoading('file-processing', {
                    message: 'Processing your book file...',
                    showGlobal: true
                });

                // Process file
                const result = await this.fileProcessor.processFile(file);
                
                // Stop loading
                this.loadingStateManager.stopLoading('file-processing');

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
                this.loadingStateManager.stopLoading('file-processing');
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
                            <p style="font-size: 0.9rem; color: var(--text-secondary);">
                                ✨ New: Enhanced with API Foundation for better performance!
                            </p>
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