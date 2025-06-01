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
import { eventBus, EVENTS } from './modules/utils/EventBus.js';
import { DOMUtils, DateUtils, StringUtils } from './modules/utils/Helpers.js';

class BookBuddyApp {
    constructor() {
        this.storage = new StorageManager('book-buddy');
        this.library = new Library(this.storage);
        this.fileProcessor = new FileProcessor();
        this.navigationController = new NavigationController();
        this.modalManager = new ModalManager();
        
        this.currentBook = null;
        this.appState = {
            initialized: false,
            currentView: 'library',
            theme: 'light',
            settings: {}
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
        const settingsResult = this.storage.load('app_settings', {
            theme: 'light',
            readingSpeed: 250, // words per minute
            autoSave: true,
            notifications: true
        });
        
        if (settingsResult.success) {
            this.appState.settings = settingsResult.data;
            
            // Apply theme
            if (settingsResult.data.theme) {
                document.body.classList.add(`theme-${settingsResult.data.theme}`);
            }
        }
    }

    setupUI() {
        // Create main app structure
        const appHTML = `
            <div class="app-container">
                <!-- Navigation is inserted by NavigationController -->
                
                <main class="main-content">
                    <!-- Library View -->
                    <div class="view" id="library-view">
                        <div class="view-header">
                            <h2 class="view-title">📚 My Library</h2>
                            <div class="view-actions">
                                <button class="btn btn-primary" id="upload-book-btn">
                                    📤 Upload Book
                                </button>
                            </div>
                        </div>
                        
                        <div class="library-stats" id="library-stats">
                            <!-- Stats will be populated dynamically -->
                        </div>
                        
                        <div class="search-bar">
                            <input type="text" 
                                   id="library-search" 
                                   placeholder="Search your library..." 
                                   class="search-input">
                        </div>
                        
                        <div class="book-filters">
                            <button class="filter-btn active" data-filter="all">All Books</button>
                            <button class="filter-btn" data-filter="unread">Unread</button>
                            <button class="filter-btn" data-filter="reading">Currently Reading</button>
                            <button class="filter-btn" data-filter="finished">Finished</button>
                        </div>
                        
                        <div class="books-grid" id="books-grid">
                            <!-- Books will be populated dynamically -->
                        </div>
                    </div>

                    <!-- Search View -->
                    <div class="view" id="search-view" style="display: none;">
                        <div class="view-header">
                            <h2 class="view-title">🔍 Search Books</h2>
                        </div>
                        <p>API book search will be implemented in Week 2 Phase 2</p>
                    </div>

                    <!-- Reading View -->
                    <div class="view" id="reading-view" style="display: none;">
                        <div class="view-header">
                            <h2 class="view-title">📖 Reading</h2>
                        </div>
                        <div id="reading-content">
                            <!-- Reading interface will be populated dynamically -->
                        </div>
                    </div>

                    <!-- Statistics View -->
                    <div class="view" id="statistics-view" style="display: none;">
                        <div class="view-header">
                            <h2 class="view-title">📊 Reading Statistics</h2>
                        </div>
                        <div id="statistics-content">
                            <!-- Statistics will be populated dynamically -->
                        </div>
                    </div>

                    <!-- Settings View -->
                    <div class="view" id="settings-view" style="display: none;">
                        <div class="view-header">
                            <h2 class="view-title">⚙️ Settings</h2>
                        </div>
                        <div id="settings-content">
                            <!-- Settings will be populated dynamically -->
                        </div>
                    </div>
                </main>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', appHTML);
        
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
                    content: '<p>Processing your book file...</p>',
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
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value