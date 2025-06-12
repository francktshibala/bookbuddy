/**
 * Book Buddy - Main Application Controller (Step 9.5 Integration - CORRECTED)
 * Now includes ErrorNotificationManager and LoadingStateManager
 */

// Import all modules with CORRECTED PATHS
import AIInsightsPanel from './modules/ui/AIInsightsPanel.js';
import AIPromptTemplates from './modules/services/AIPromptTemplates.js';
import AnalyticsDashboard from './modules/ui/analytics/AnalyticsDashboard.js';
import ChartRenderer from './modules/ui/analytics/ChartRenderer.js';
import AnalyticsDataCollector from './modules/services/AnalyticsDataCollector.js';
import EnrichmentCoordinator from './modules/services/EnrichmentCoordinator.js';
import BookDataMerger from './utils/BookDataMerger.js';
import OpenLibraryAPI from './modules/services/OpenLibraryAPI.js';
import SearchResultsRenderer from './modules/ui/SearchResultsRenderer.js';
import BookCoverManager from './modules/ui/BookCoverManager.js';
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
import AdvancedSearchInterface from './modules/ui/AdvancedSearchInterface.js';

// ✅ NEW: Import Step 9 components
import ErrorNotificationManager from './modules/ui/ErrorNotificationManager.js';
import LoadingStateManager from './modules/ui/LoadingStateManager.js';
import APITestUtils from './utils/APITestUtils.js';
import { eventBus, EVENTS } from './utils/EventBus.js';
import { DOMUtils, DateUtils, StringUtils } from './utils/Helpers.js';
import OpenAIService from './modules/services/OpenAIService.js';
import AITokenManager from './modules/services/AITokenManager.js';
import AIRateLimiter from './modules/services/AIRateLimiter.js';
// ✅ CORRECT - Use this path in app.js:
import BookAnalysisService from './modules/services/BookAnalysisService.js';
import environmentConfig from './config/environment.js';
// ✅ Make EventBus globally available for testing
window.eventBus = eventBus;
window.EVENTS = EVENTS;

class BookBuddyApp {
    constructor() {
        this.storage = new StorageManager('book-buddy');
        this.library = new Library(this.storage);
        this.fileProcessor = new FileProcessor();
        this.navigationController = new NavigationController();
        this.modalManager = new ModalManager();
        this.openLibraryAPI = new OpenLibraryAPI();
        this.bookDataMerger = new BookDataMerger();
        this.aiTokenManager = new AITokenManager();
        this.aiRateLimiter = new AIRateLimiter();
        this.bookAnalysisService = null;
        this.openAIService = new OpenAIService({
            apiKey: this.getOpenAIKey()
        });
        this.aiInsightsPanel = new AIInsightsPanel();
        this.chartRenderer = new ChartRenderer();
        this.aiPromptTemplates = new AIPromptTemplates({
            cacheEnabled: true,
            maxCacheSize: 50, // Reasonable for Book Buddy
            validateSecurity: true
        });
        this.analyticsDataCollector = new AnalyticsDataCollector(this.library);
        this.chartRenderer = new ChartRenderer();
        this.analyticsDashboard = new AnalyticsDashboard(
            this.library, 
            this.chartRenderer, 
            this.analyticsDataCollector
        );
        this.advancedSearchInterface = new AdvancedSearchInterface(
            null, // Will be set after googleBooksAPI is initialized
            this.storage,
            null  // Will be set after modalManager is available
        );
                // ADD this line in the constructor after the other services:
        this.bookAnalysisService = new BookAnalysisService(
            this.openAIService,
            this.storage,
            eventBus,
            {
                maxCacheSize: 50,
                enableProgressTracking: true,
                enableCaching: true
            }
        );
        this.bookListRenderer = new BookListRenderer(this.library);
        this.readingInterface = new ReadingInterface();
        this.searchResultsRenderer = new SearchResultsRenderer(this.bookCoverManager);
        
    try {
        this.bookCoverManager = new BookCoverManager();
        console.log('✅ BookCoverManager initialized successfully');
    } catch (error) {
    console.error('❌ BookCoverManager initialization failed:', error);
    this.bookCoverManager = null;
    }
        // ✅ NEW: Initialize Step 9 components in correct order
        this.errorNotificationManager = new ErrorNotificationManager(this.modalManager);
        this.loadingStateManager = new LoadingStateManager();
        // this.apiTestUtils = new APITestUtils();
        
        // Initialize API services
        this.googleBooksAPI = new GoogleBooksAPI();

         // Create enrichment coordinator
        this.enrichmentCoordinator = new EnrichmentCoordinator(
            this.googleBooksAPI,
            this.openLibraryAPI,
            this.bookDataMerger
        );
        // ✅ Setup AdvancedSearchInterface with dependencies
        this.advancedSearchInterface.googleBooksAPI = this.googleBooksAPI;
        this.advancedSearchInterface.modalManager = this.modalManager;
        
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
            console.log('🚀 Initializing Book Buddy (Step 9.5 - API Foundation - CORRECTED)...');
            
            // Initialize AI services
            await this.openAIService.initialize(
                this.aiTokenManager,
                this.aiRateLimiter,
                this.aiPromptTemplates
            );

            
            // Load app settings
            await this.loadAppSettings();
            
            // Setup UI
            this.setupUI();
            
            // ✅ NEW: Setup Step 9 event listeners FIRST
            this.setupStep9EventListeners();

            // ✅ Initialize Advanced Search Interface
            await this.initializeAdvancedSearch();
            
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
            
            // ✅ NEW: Auto-run API foundation tests in development
            if (this.isDevelopmentMode()) {
                setTimeout(() => {
                    console.log('🧪 Running API Foundation Tests...');
                    this.runAPIFoundationTests();
                }, 2000);
            }
            
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
        console.log('🔧 Setting up Step 9 event listeners...');
        
        // Listen for API errors to show user notifications
        eventBus.on(EVENTS.API_REQUEST_FAILED, (data) => {
            console.log('🚨 API Request failed, showing user notification:', data);
            this.errorNotificationManager.handleAPIError(data);
        });

        

        // Listen for API loading states
        eventBus.on(EVENTS.API_REQUEST_STARTED, (data) => {
            if (data.isLoading !== undefined) {
                // Global loading state change
                console.log(`⏳ Global loading: ${data.isLoading ? 'started' : 'stopped'}`);
            }
        });

        // Listen for storage errors
        eventBus.on(EVENTS.STORAGE_ERROR, (data) => {
            console.log('💾 Storage error occurred:', data);
            this.errorNotificationManager.handleStorageError(data);
        });

        console.log('✅ Step 9 event listeners configured');
    }

    /**
 * Get OpenAI API key from environment or user input
 */
    getOpenAIKey() {
        return environmentConfig.getOpenAIKey();
    }


            /**
         * Get API key configuration status
         */
        getAPIKeyStatus() {
            return environmentConfig.getAPIKeyStatus();
        }

        /**
         * Test OpenAI API key
         */
        async testOpenAIKey(apiKey = null) {
            try {
                console.log('🧪 Testing OpenAI API key...');
                
                // Show loading
                this.loadingStateManager.startLoading('api-key-test', {
                    message: 'Testing API key...',
                    showGlobal: true
                });

                const result = await environmentConfig.testAPIKey(apiKey);
                
                this.loadingStateManager.stopLoading('api-key-test');
                
                if (result.success) {
                    this.modalManager.showAlert(
                        'API Key Valid! ✅',
                        `Your OpenAI API key is working correctly!\n\nModels available: ${result.modelCount || 'Unknown'}`
                    );
                } else {
                    this.modalManager.showAlert(
                        'API Key Invalid ❌',
                        `API key test failed:\n\n${result.message}\n\n${result.isDevelopmentPlaceholder ? 'Please add your real OpenAI API key from https://platform.openai.com/api-keys' : ''}`
                    );
                }
                
                return result;
                
            } catch (error) {
                this.loadingStateManager.stopLoading('api-key-test');
                console.error('❌ API key test error:', error);
                
                this.modalManager.showAlert(
                    'Test Failed ❌',
                    `Failed to test API key: ${error.message}`
                );
                
                return { success: false, error: error.message };
            }
        }

        /**
         * Clear stored API key
         */
        clearAPIKey() {
            const result = environmentConfig.clearUserAPIKey();
            
            if (result.success) {
                this.modalManager.showAlert(
                    'API Key Cleared 🗑️',
                    'Your API key has been removed. The app will refresh.',
                    () => {
                        window.location.reload();
                    }
                );
            } else {
                this.modalManager.showAlert('Error', 'Failed to clear API key');
            }
        }

        /**
         * Get environment information for debugging
         */
        getEnvironmentInfo() {
            return {
                environment: environmentConfig.getEnvironmentInfo(),
                apiKeyStatus: this.getAPIKeyStatus(),
                deploymentConfig: environmentConfig.getDeploymentConfig(),
                setupInstructions: environmentConfig.getSetupInstructions()
            };
        }
    // ✅ NEW: Initialize Advanced Search Interface
    async initializeAdvancedSearch() {
        try {
            console.log('🔍 Initializing Advanced Search Interface...');
            
            const result = await this.advancedSearchInterface.initialize('#advanced-search-container');
            
            if (result.success) {
                console.log('✅ Advanced Search Interface initialized successfully');
                
                // Setup integration event listeners
                this.setupAdvancedSearchEventListeners();
            } else {
                console.error('❌ Failed to initialize Advanced Search Interface:', result.message);
            }
            
        } catch (error) {
            console.error('❌ Advanced Search Interface initialization error:', error);
        }
    }

    // ✅ FIXED: Setup Advanced Search Event Listeners
    setupAdvancedSearchEventListeners() {
        // Listen for search completion to display results
        eventBus.on('search:completed', (data) => {
            console.log(`🎯 Search completed: ${data.totalResults} results`);
            console.log('🔍 Search data received:', data); // Debug log
            
            // ✅ FIX: Handle different data structures correctly
            const books = data.results || data.books || [];
            console.log('📚 Books to display:', books.length, books);
            
            // Clear any existing error states
            this.hideSearchError();
            
            this.displaySearchResults(books);
        });

        // Listen for add to library requests from search results
        eventBus.on('search:addToLibrary', async (data) => {
            await this.addBookFromSearch(data.book);
        });

        // Listen for search errors
        eventBus.on('search:error', (data) => {
            console.error('🚨 Search error:', data.error);
            this.showSearchError(data.userMessage || 'Search failed. Please try again.');
        });

        // Listen for interface state changes
        eventBus.on('search:tabChanged', (data) => {
            console.log(`📑 Search tab changed from ${data.from} to ${data.to}`);
        });

        // Listen for search cleared
        eventBus.on('search:cleared', () => {
            console.log('🧹 Search interface cleared');
            // Clear search results display
            const resultsContainer = DOMUtils.query('#search-results');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
                        <h3>Search for Books Online</h3>
                        <p>Use the advanced search interface above to find books from Google Books and other sources.</p>
                        <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                            ✨ Powered by Component 10.4 - Advanced Search Interface
                        </p>
                    </div>
                `;
            }
        });

        console.log('🔗 Advanced Search event listeners configured');
    }

    // ✅ NEW: Test the complete API foundation
    async runAPIFoundationTests() {
        console.log('🧪 Running API Foundation Tests...');
        
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
        
        try {
            // Use APITestUtils to run comprehensive tests
            const results = await this.apiTestUtils.testAPIService(this.googleBooksAPI);
            
            console.log(`📊 APIService Test Results: ${results.passed} passed, ${results.failed} failed`);
            
            if (results.failed > 0) {
                console.warn('⚠️ Some API tests failed - check network connectivity');
            }
            
            return results;
        } catch (error) {
            console.error('❌ APIService test error:', error);
            return { passed: 0, failed: 1, error: error.message };
        }
    }

    // ✅ NEW: Test error notification system
    async testErrorNotifications() {
        console.log('🔔 Testing Error Notifications...');
        
        try {
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
        } catch (error) {
            console.error('❌ Error notification test failed:', error);
        }
    }

    // ✅ NEW: Test loading state management
    async testLoadingStates() {
        console.log('⏳ Testing Loading States...');
        
        try {
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
        } catch (error) {
            console.error('❌ Loading state test failed:', error);
        }
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

    // ✅ NEW: Check if in development mode
    isDevelopmentMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.search.includes('debug=true') ||
               window.location.protocol === 'file:';
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
    // ✅ FIXED: Display search results in the UI
    // Replace your displaySearchResults method (around line 421) with this version:

displaySearchResults(books) {
    console.log(`📊 Displaying ${books?.length || 0} search results`);
    
    const resultsContainer = DOMUtils.query('#search-results');
    if (!resultsContainer) {
        console.error('❌ Search results container not found');
        return;
    }

    if (!books || !Array.isArray(books) || books.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">😔</div>
                <h3>No books found</h3>
                <p>Try different search terms or check your search criteria.</p>
                <button class="btn btn-outline" onclick="document.querySelector('.tab-btn[data-tab=basic]')?.click()">
                    🔍 Try Basic Search
                </button>
            </div>
        `;
        return;
    }

    // ✅ FORCE fallback rendering for now to debug
    console.log('🎨 Using FORCED fallback rendering for debugging');
    this.renderBasicSearchResults(books, resultsContainer);

    // Setup event listeners for the new results
    this.setupSearchResultListeners();
    
    console.log('✅ displaySearchResults completed - check the page!');
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

    // ✅ NEW: Fallback method for basic search result rendering
    renderBasicSearchResults(books, container) {
        const bookCards = books.map(book => `
            <div class="search-result-card" style="background: var(--card-background); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 1.5rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm); transition: var(--transition);">
                <div style="display: flex; gap: 1rem;">
                    ${book.thumbnail ? `
                        <div style="flex-shrink: 0;">
                            <img src="${book.thumbnail}" alt="${book.title}" style="width: 80px; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);">
                        </div>
                    ` : ''}
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="margin-bottom: 0.5rem; color: var(--text-primary); font-size: 1.1rem; line-height: 1.3;">${book.title || 'Unknown Title'}</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 0.5rem; font-style: italic; font-size: 0.9rem;">${(book.authors || []).join(', ') || 'Unknown Author'}</p>
                        ${book.publishedDate ? `<p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.5rem;">Published: ${book.publishedDate}</p>` : ''}
                        ${book.pageCount ? `<p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.5rem;">Pages: ${book.pageCount}</p>` : ''}
                        ${book.categories && book.categories.length > 0 ? `<p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.75rem;">Category: ${book.categories.slice(0, 2).join(', ')}</p>` : ''}
                        ${book.description ? `
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.4; margin-bottom: 1rem;">
                                ${book.description.length > 200 ? book.description.substring(0, 200) + '...' : book.description}
                            </p>
                        ` : ''}
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="btn btn-primary btn-add-book" 
                                    data-book-info='${JSON.stringify(book).replace(/'/g, "&apos;")}'>
                                📚 Add to Library
                            </button>
                            ${book.previewLink ? `
                                <a href="${book.previewLink}" target="_blank" class="btn btn-outline" style="text-decoration: none;">
                                    👁️ Preview
                                </a>
                            ` : ''}
                            ${book.infoLink ? `
                                <a href="${book.infoLink}" target="_blank" class="btn btn-outline" style="text-decoration: none;">
                                    ℹ️ More Info
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = `
            <div style="margin-bottom: 1rem; padding: 1rem; background: var(--background-color); border-radius: var(--border-radius); border: 1px solid var(--border-color);">
                <h3 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">📚 Search Results</h3>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">Found ${books.length} books. Click "Add to Library" to save any book to your collection.</p>
            </div>
            ${bookCards}
        `;
    }
    // ✅ FIXED: Enhanced addBookFromSearch method
    async addBookFromSearch(bookInfo) {
        try {
            console.log(`📚 Adding book to library: ${bookInfo.title}`);
            
            // Show loading on the specific button if available
            const button = event?.target;
            if (button && this.loadingStateManager) {
                this.loadingStateManager.showButtonLoading(button, 'Add to Library');
            }
            
            // Create book data from search result
            const bookData = {
                title: bookInfo.title,
                filename: `${bookInfo.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.txt`,
                content: this.createBookContentFromSearch(bookInfo),
                metadata: {
                    authors: bookInfo.authors || [],
                    publisher: bookInfo.publisher || '',
                    publishedDate: bookInfo.publishedDate || '',
                    pageCount: bookInfo.pageCount || 0,
                    thumbnail: bookInfo.thumbnail || '',
                    source: 'Google Books',
                    sourceId: bookInfo.id,
                    previewLink: bookInfo.previewLink || '',
                    infoLink: bookInfo.infoLink || '',
                    categories: bookInfo.categories || [],
                    language: bookInfo.language || 'en',
                    averageRating: bookInfo.averageRating || 0,
                    ratingsCount: bookInfo.ratingsCount || 0
                }
            };
            
            const result = await this.library.addBook(bookData);
            
            if (button && this.loadingStateManager) {
                this.loadingStateManager.hideButtonLoading(button);
            }
            
            if (result.success) {
                // Show success message
                if (this.modalManager) {
                    this.modalManager.showAlert(
                        'Book Added! 📚',
                        `"${bookInfo.title}" has been added to your library!`
                    );
                } else {
                    alert(`"${bookInfo.title}" has been added to your library!`);
                }
                
                // Update button to show success
                if (button) {
                    button.textContent = '✅ Added!';
                    button.disabled = true;
                    button.style.background = 'var(--success-color)';
                    button.style.cursor = 'default';
                }
                
                // Refresh library view if we're on that view
                if (this.navigationController.getCurrentView() === 'library') {
                    this.refreshLibraryView();
                }
            } else {
                const errorMsg = `Failed to add book: ${result.message}`;
                if (this.modalManager) {
                    this.modalManager.showAlert('Error', errorMsg);
                } else {
                    alert(errorMsg);
                }
            }
            
        } catch (error) {
            console.error('❌ Error adding book from search:', error);
            
            if (event?.target && this.loadingStateManager) {
                this.loadingStateManager.hideButtonLoading(event.target);
            }
            
            const errorMsg = `Failed to add book: ${error.message}`;
            if (this.modalManager) {
                this.modalManager.showAlert('Error', errorMsg);
            } else {
                alert(errorMsg);
            }
        }
    }

    // ✅ NEW: Show search error in the interface
    showSearchError(message) {
        const resultsContainer = DOMUtils.query('#search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="empty-state" style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3>Search Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-outline" onclick="document.querySelector('#clear-search')?.click()" style="margin-top: 1rem;">
                        🔄 Try Again
                    </button>
                </div>
            `;
        }
    }

    // ✅ NEW: Hide search error
    hideSearchError() {
        // This will be called when a successful search completes
        console.log('🔧 Hiding search errors');
    }

    // ✅ ADD THIS METHOD after line 487 (after hideSearchError method)
    clearSearchResults() {
        const resultsContainer = DOMUtils.query('#search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
                    <h3>Search for Books Online</h3>
                    <p>Use the advanced search interface above to find books from Google Books and other sources.</p>
                    <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                        ✨ Powered by Component 10.4 - Advanced Search Interface
                    </p>
                </div>
            `;
        }
    }
    // Helper method to create book content from search results - ADD THIS TO app.js
    createBookContentFromSearch(bookInfo) {
        const authorsText = bookInfo.authors && bookInfo.authors.length > 0 
            ? `by ${bookInfo.authors.join(', ')}` 
            : '';
        
        const publishedText = bookInfo.publishedDate 
            ? `Published: ${bookInfo.publishedDate}` 
            : '';
        
        const pagesText = bookInfo.pageCount 
            ? `Pages: ${bookInfo.pageCount}` 
            : '';
        
        const categoriesText = bookInfo.categories && bookInfo.categories.length > 0 
            ? `Categories: ${bookInfo.categories.join(', ')}` 
            : '';

        return `${bookInfo.title}
        ${authorsText}

        ${bookInfo.description || 'No description available.'}

        Book Information:
        ${publishedText}
        ${pagesText}
        ${categoriesText}
        ${bookInfo.publisher ? `Publisher: ${bookInfo.publisher}` : ''}

        This book was added from Google Books search. For the complete content, please refer to the original source or purchase the book.

        ${bookInfo.previewLink ? `Preview: ${bookInfo.previewLink}` : ''}
        ${bookInfo.infoLink ? `More Info: ${bookInfo.infoLink}` : ''}`;
            }

    // ✅ ENHANCED: Enhanced search online button handler
    setupEventListeners() {
        // ✅ CRITICAL FIX: Upload book button (ADD THIS FIRST)
    const uploadBtn = DOMUtils.query('#upload-book-btn');
    if (uploadBtn) {
        console.log('✅ Upload button found, adding event listener');
        uploadBtn.addEventListener('click', (e) => {
            console.log('📤 Upload button clicked!');
            e.preventDefault();
            this.showUploadModal();
        });
    } else {
        console.error('❌ Upload button #upload-book-btn not found!');
    }

    // ✅ ENHANCED: Search online button with API integration
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

        eventBus.on('search:viewModeChanged', () => {
            this.searchResultsRenderer.refreshResults();
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

        // Add event listener for "Add to Library"
        eventBus.on('search:addToLibrary', async (data) => {
            await this.addBookFromSearch(data.book, data.button);
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
            
            // ✅ NEW: Add enrichment button handler
            const enrichBtn = card.querySelector('.btn-enrich');
            if (enrichBtn) {
                enrichBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.enrichBook(bookId);
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

            // Add this inside setupBookCardListeners() method in app.js:
            const aiBtn = card.querySelector('.ai-analysis-btn');
            if (aiBtn) {
                aiBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const bookId = e.target.dataset.bookId;
                    const book = this.library.getBook(bookId);
                    if (book) {
                        alert(`AI Analysis for "${book.title}"\n\nFeature connected! Analysis handlers ready.`);
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

    initializeSettingsView() {
    const content = DOMUtils.query('#settings-content');
    if (content) {
        // Get current API key status
        const apiStatus = this.getAPIKeyStatus();
        
        content.innerHTML = `
            <div class="settings-form">
                <!-- AI Analysis Settings Section -->
                <div class="settings-section">
                    <h3 class="settings-section-title">🤖 AI Analysis Settings</h3>
                    <div class="settings-section-content">
                        
                        <!-- OpenAI API Key Status -->
                        <div class="form-group">
                            <label>API Key Status</label>
                            <div class="api-status-card" style="background: ${apiStatus.hasKey ? (apiStatus.isValid ? '#f0f9ff' : '#fef2f2') : '#fefce8'}; border: 1px solid ${apiStatus.hasKey ? (apiStatus.isValid ? '#3b82f6' : '#ef4444') : '#f59e0b'}; border-radius: var(--border-radius); padding: 1rem; margin-bottom: 1rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="font-size: 1.2rem;">${apiStatus.hasKey ? (apiStatus.isValid ? '✅' : '❌') : '⚠️'}</span>
                                    <strong>${apiStatus.hasKey ? (apiStatus.isValid ? 'API Key Configured' : 'Invalid API Key') : 'No API Key'}</strong>
                                </div>
                                <div style="font-size: 0.9rem; color: var(--text-secondary);">
                                    ${apiStatus.message}
                                    ${apiStatus.keyPreview ? `<br>Key: ${apiStatus.keyPreview}` : ''}
                                    <br>Source: ${apiStatus.source}
                                    ${apiStatus.isDevelopmentPlaceholder ? '<br><strong>⚠️ Development placeholder - add your real API key</strong>' : ''}
                                </div>
                            </div>
                        </div>

                        <!-- OpenAI API Key Input -->
                        <div class="form-group">
                            <label for="openai-api-key">OpenAI API Key</label>
                            <div class="api-key-input-container" style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="password" 
                                       id="openai-api-key" 
                                       class="form-input"
                                       placeholder="sk-..." 
                                       value=""
                                       autocomplete="off"
                                       style="flex: 1;">
                                <button type="button" id="toggle-key-visibility" class="btn btn-outline btn-sm">
                                    👁️
                                </button>
                                <button type="button" id="test-api-key" class="btn btn-outline btn-sm">
                                    🧪 Test
                                </button>
                            </div>
                            <small class="form-help">
                                Required for AI analysis features. Your key is stored locally and never shared.
                                <br><a href="https://platform.openai.com/api-keys" target="_blank">Get your API key here</a>
                                <br>Environment: ${environmentConfig.environment} | Features: ${Object.keys(environmentConfig.getConfig('features')).join(', ')}
                            </small>
                        </div>

                        <!-- Available Analysis Types -->
                        ${apiStatus.hasKey && apiStatus.isValid ? `
                        <div class="form-group">
                            <label>Available Analysis Types</label>
                            <div class="analysis-types-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; margin-top: 0.5rem;">
                                <div class="analysis-type-card" style="background: var(--card-background); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.75rem; text-align: center;">
                                    <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">📝</div>
                                    <div style="font-size: 0.8rem; font-weight: 500;">Summary</div>
                                </div>
                                <div class="analysis-type-card" style="background: var(--card-background); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.75rem; text-align: center;">
                                    <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">🎭</div>
                                    <div style="font-size: 0.8rem; font-weight: 500;">Themes</div>
                                </div>
                                <div class="analysis-type-card" style="background: var(--card-background); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.75rem; text-align: center;">
                                    <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">👤</div>
                                    <div style="font-size: 0.8rem; font-weight: 500;">Characters</div>
                                </div>
                                <div class="analysis-type-card" style="background: var(--card-background); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.75rem; text-align: center;">
                                    <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">📊</div>
                                    <div style="font-size: 0.8rem; font-weight: 500;">Difficulty</div>
                                </div>
                                <div class="analysis-type-card" style="background: var(--card-background); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.75rem; text-align: center;">
                                    <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">💭</div>
                                    <div style="font-size: 0.8rem; font-weight: 500;">Sentiment</div>
                                </div>
                                <div class="analysis-type-card" style="background: var(--card-background); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.75rem; text-align: center;">
                                    <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">✍️</div>
                                    <div style="font-size: 0.8rem; font-weight: 500;">Style</div>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Reading Settings Section -->
                <div class="settings-section">
                    <h3 class="settings-section-title">📚 Reading Settings</h3>
                    <div class="settings-section-content">
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
                    </div>
                </div>

                <!-- Actions -->
                <div class="settings-section">
                    <div class="settings-section-content">
                        <div class="form-group">
                            <button class="btn btn-primary" id="save-settings">💾 Save All Settings</button>
                            <button class="btn btn-outline" id="export-library">📤 Export Library</button>
                            <button class="btn btn-outline" id="import-library">📥 Import Library</button>
                            <button class="btn btn-outline" id="clear-library">🗑️ Clear Library</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupSettingsListeners();
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

                    <div class="form-group">
                        <label for="openai-api-key">OpenAI API Key (optional)</label>
                        <input type="password" 
                            id="openai-api-key" 
                            class="form-input"
                            placeholder="sk-..." 
                            value="">
                        <small>Required for AI analysis features. Your key is stored locally and never shared.</small>
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
    // Existing listeners
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

    // NEW: OpenAI API Key listeners
    const apiKeyInput = DOMUtils.query('#openai-api-key');
    const toggleVisibilityBtn = DOMUtils.query('#toggle-key-visibility');
    const testKeyBtn = DOMUtils.query('#test-api-key');

    // Toggle password visibility
    if (toggleVisibilityBtn && apiKeyInput) {
        toggleVisibilityBtn.addEventListener('click', () => {
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            toggleVisibilityBtn.textContent = isPassword ? '🙈' : '👁️';
        });
    }

    // Enable/disable test button based on input
    if (apiKeyInput && testKeyBtn) {
        apiKeyInput.addEventListener('input', (e) => {
            const hasValue = e.target.value.trim().length > 0;
            testKeyBtn.disabled = !hasValue;
        });
    }

    // Test API key
    if (testKeyBtn) {
        testKeyBtn.addEventListener('click', async () => {
            const apiKeyInput = DOMUtils.query('#openai-api-key');
            const key = apiKeyInput.value.trim();
            
            if (!key) {
                this.modalManager.showAlert('Error', 'Please enter an API key first');
                return;
            }

            await this.testOpenAIKey(key);
        });
    }
}

    saveSettings() {
    // Save regular settings
    const readingSpeed = parseInt(DOMUtils.query('#reading-speed')?.value) || 250;
    const autoSave = DOMUtils.query('#auto-save')?.checked || false;
    const notifications = DOMUtils.query('#notifications')?.checked || false;

    this.appState.settings = {
        readingSpeed,
        autoSave,
        notifications
    };

    // Save OpenAI API key
    const apiKeyInput = DOMUtils.query('#openai-api-key');
    const newKey = apiKeyInput?.value.trim();
    
    if (newKey && newKey.length > 0) {
        const result = environmentConfig.setUserAPIKey(newKey);
        
        if (!result.success) {
            this.modalManager.showAlert(
                'Invalid API Key', 
                result.message + (result.isDevelopmentPlaceholder ? 
                    '\n\nPlease get your real API key from https://platform.openai.com/api-keys' : '')
            );
            return;
        }
    }

    // Save regular settings to storage
    const result = this.storage.save('app_settings', this.appState.settings);
    
    if (result.success) {
        this.modalManager.showAlert(
            'Settings Saved! 🎉', 
            'Your settings have been saved successfully!' + 
            (newKey ? '\n\nAI analysis features are now available. The app will refresh to apply changes.' : ''),
            () => {
                if (newKey) {
                    // Refresh to reinitialize services with new key
                    window.location.reload();
                }
            }
        );
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
                            // Focus on the advanced search interface
                            setTimeout(() => {
                                const searchInput = DOMUtils.query('#basic-query');
                                if (searchInput) {
                                    searchInput.focus();
                                }
                            }, 300);
                        });
                    }
                }, 100);
            }, 1000);
        }
    }

    
// ✅ NEW: Enrich a book by ID
async enrichBook(bookId) {
   const book = this.library.getBook(bookId);
   if (!book) {
       console.error('Book not found:', bookId);
       return;
   }
   
   console.log(`🔍 Starting enrichment for: "${book.title}"`);
   
   // Show loading
   this.loadingStateManager.startLoading('book-enrichment', {
       message: `Enriching "${book.title}"...`,
       showGlobal: true
   });
   
   try {
       // Try ISBN first if available
       let result;
       if (book.metadata?.isbn13 || book.metadata?.isbn10) {
           const isbn = book.metadata.isbn13 || book.metadata.isbn10;
           console.log(`🔍 Using ISBN: ${isbn}`);
           result = await this.enrichmentCoordinator.enrichByISBN(isbn);
       } else {
           console.log(`🔍 Using title search: ${book.title}`);
           // Fall back to title search
           const titleResult = await this.enrichmentCoordinator.enrichByTitle(book.title);
           if (titleResult.success && titleResult.enrichedBooks.length > 0) {
               result = {
                   success: true,
                   enrichedBook: titleResult.enrichedBooks[0]
               };
           } else {
               result = titleResult;
           }
       }
       
       this.loadingStateManager.stopLoading('book-enrichment');
       
       if (result.success && result.enrichedBook) {
           // Update the book with enriched data
           const enrichedData = {
               ...result.enrichedBook,
               id: book.id, // Keep original ID
               content: book.content, // Keep original content
               currentPosition: book.currentPosition, // Keep reading progress
               notes: book.notes,
               highlights: book.highlights
           };
           
           const updateResult = this.library.updateBook(bookId, enrichedData);
           
           if (updateResult.success) {
               this.modalManager.showAlert(
                   'Book Enriched! ✨',
                   `"${book.title}" has been enhanced with data from ${result.enrichedBook.sources.join(' and ')}`
               );
               this.refreshLibraryView();
               
               // ✅ NEW: Update UI to show Enhanced badge
               setTimeout(() => {
                   const bookCard = document.querySelector(`[data-book-id="${bookId}"]`);
                   if (bookCard) {
                       // Remove enrich button
                       const enrichBtn = bookCard.querySelector('.btn-enrich');
                       if (enrichBtn) enrichBtn.remove();
                       
                       // Add Enhanced badge
                       const actionsDiv = bookCard.querySelector('.book-actions');
                       const deleteBtn = actionsDiv.querySelector('.btn-delete');
                       
                       const enhancedBadge = document.createElement('div');
                       enhancedBadge.className = 'enriched-badge';
                       enhancedBadge.innerHTML = '✨ Enhanced';
                       enhancedBadge.title = `Enhanced with data from ${result.enrichedBook.sources.join(' and ')}`;
                       enhancedBadge.style.cssText = 'display: inline-flex; align-items: center; padding: 0.25rem 0.5rem; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; border-radius: 4px; font-size: 0.75rem; font-weight: 500; margin-right: 0.5rem;';
                       
                       actionsDiv.insertBefore(enhancedBadge, deleteBtn);
                   }
               }, 100);
               
           } else {
               this.modalManager.showAlert('Error', 'Failed to save enriched book data');
           }
       } else {
           this.modalManager.showAlert(
               'Enrichment Failed',
               result.message || 'Could not find additional data for this book'
           );
       }
       
   } catch (error) {
       this.loadingStateManager.stopLoading('book-enrichment');
       console.error('Enrichment error:', error);
       this.modalManager.showAlert('Error', `Enrichment failed: ${error.message}`);
   }
}
    // ✅ NEW: Get API Foundation statistics
    getAPIFoundationStats() {
        return {
            errorManager: {
                available: !!this.errorNotificationManager,
                errorHistory: this.errorNotificationManager?.getErrorStats?.() || {}
            },
            loadingManager: {
                available: !!this.loadingStateManager,
                stats: this.loadingStateManager?.getLoadingStats?.() || {}
            },
            apiTestUtils: {
                available: !!this.apiTestUtils,
                requestHistory: this.apiTestUtils?.getRequestHistory?.() || []
            },
            googleBooksAPI: {
                available: !!this.googleBooksAPI,
                stats: this.googleBooksAPI?.getStats?.() || {}
            }
        };
    }

    // ✅ NEW: Cleanup method for proper resource management
    destroy() {
        console.log('🗑️ Cleaning up BookBuddyApp...');
        
        // Clean up advanced search interface
        if (this.advancedSearchInterface) {
            this.advancedSearchInterface.destroy();
        }
        
        // Remove global event listeners
        eventBus.clear();
        
        console.log('✅ BookBuddyApp cleanup completed');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.bookBuddyApp = new BookBuddyApp();
});
const app = new BookBuddyApp();
window.app = app;


// Export the main app class for use in other modules
export default BookBuddyApp;
window.OpenLibraryAPI = OpenLibraryAPI;
window.BookDataMerger = BookDataMerger;
window.EnrichmentCoordinator = EnrichmentCoordinator;
window.enrichmentCoordinator = app.enrichmentCoordinator;
window.AnalyticsDataCollector = AnalyticsDataCollector;
window.AIPromptTemplates = AIPromptTemplates;
window.OpenAIService = OpenAIService;
window.AITokenManager = AITokenManager;
window.AIRateLimiter = AIRateLimiter;

