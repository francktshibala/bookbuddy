/**
 * AdvancedSearchInterface - Component 10.4 - Complete Implementation
 * Enhanced search interface with 17 micro-components for comprehensive book searching
 */
import SearchStateManager from './search/SearchStateManager.js';
import SearchHistoryManager from './search/SearchHistoryManager.js';
import SearchUIRenderer from './search/SearchUIRenderer.js';
import SearchAutoComplete from './search/SearchAutoComplete.js';
import SearchQueryBuilder from './search/SearchQueryBuilder.js';
import SearchExportManager from './search/SearchExportManager.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { DOMUtils, StringUtils, DateUtils } from '../../utils/Helpers.js';

export default class AdvancedSearchInterface {
    constructor(googleBooksAPI, storage, modalManager) {
        this.googleBooksAPI = googleBooksAPI;
        this.storage = storage;
        this.modalManager = modalManager;
        this.containerElement = null;
        this.isSearching = false;
        this.currentResults = [];
        
        // Initialize sub-components
        this.stateManager = new SearchStateManager();
        this.historyManager = new SearchHistoryManager(storage);
        this.uiRenderer = new SearchUIRenderer();
        this.autoComplete = new SearchAutoComplete();
        this.queryBuilder = new SearchQueryBuilder();
        this.exportManager = new SearchExportManager();
        
        // Bind methods to preserve context
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.handleTabSwitch = this.handleTabSwitch.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        
        console.log('🎛️ AdvancedSearchInterface initialized with 17 micro-components');
    }

    // =============================================================================
    // CORE METHODS (5 components)
    // =============================================================================

    /**
     * Micro-Component #1: Initialize the complete interface
     */
    initialize(containerSelector) {
        try {
            console.log('🚀 Initializing AdvancedSearchInterface...');
            
            this.containerElement = DOMUtils.query(containerSelector);
            if (!this.containerElement) {
                throw new Error(`Container element not found: ${containerSelector}`);
            }
            
            // Load saved state
            this.loadSavedState();
            
            // Render the complete interface
            this.render();
            
            // Setup all event listeners
            this.setupEventListeners();
            
            // Initialize auto-complete
            this.initializeAutoComplete();
            
            // Emit initialization event
            eventBus.emit('search:interfaceInitialized', {
                container: containerSelector,
                activeTab: this.stateManager.activeTab
            });
            
            console.log('✅ AdvancedSearchInterface initialization complete');
            return { success: true, message: 'Interface initialized successfully' };
            
        } catch (error) {
            console.error('❌ Failed to initialize AdvancedSearchInterface:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Micro-Component #2: Main UI structure generation
     */
    render() {
        if (!this.containerElement) {
            console.error('❌ Cannot render: container element not found');
            return;
        }

        const html = `
            <div class="advanced-search-interface">
                ${this.renderSearchHeader()}
                ${this.renderSearchTabs()}
                ${this.renderTabIndicator()}
                ${this.renderSearchForm()}
                ${this.renderSearchActions()}
                ${this.renderSearchError()}
            </div>
        `;

        this.containerElement.innerHTML = html;
        
        // Apply current state to UI
        this.applyStateToUI();
        
        console.log('🎨 Advanced search interface rendered');
    }

    /**
     * Micro-Component #3: All event handling setup
     */
    setupEventListeners() {
        if (!this.containerElement) return;

        // Tab switching
        const tabButtons = DOMUtils.queryAll('.tab-btn', this.containerElement);
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.closest('.tab-btn').dataset.tab;
                this.handleTabSwitch(tabId);
            });
        });

        // Form submission
        const searchForm = DOMUtils.query('.search-form', this.containerElement);
        if (searchForm) {
            searchForm.addEventListener('submit', this.handleFormSubmit);
        }

        // Input changes for auto-save
        const inputs = DOMUtils.queryAll('input, select, textarea', this.containerElement);
        inputs.forEach(input => {
            input.addEventListener('input', this.handleInputChange);
            input.addEventListener('change', this.handleInputChange);
        });

        // Header action buttons
        this.setupHeaderActionListeners();

        // Section toggle buttons
        this.setupSectionToggleListeners();

        // Filter and option changes
        this.setupFilterChangeListeners();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();

        console.log('🎯 All event listeners configured');
    }

    /**
     * Micro-Component #4: Auto-complete setup for all inputs
     */
    initializeAutoComplete() {
        // Basic search input
        const basicInput = DOMUtils.query('#basic-query', this.containerElement);
        if (basicInput) {
            this.autoComplete.setupAutoComplete(basicInput, (suggestion) => {
                this.handleAutoCompleteSuggestion('query', suggestion);
            });
        }

        // Advanced search inputs
        const advancedInputs = [
            { id: '#advanced-title', field: 'title' },
            { id: '#advanced-author', field: 'author' },
            { id: '#advanced-subject', field: 'subject' },
            { id: '#advanced-publisher', field: 'publisher' }
        ];

        advancedInputs.forEach(({ id, field }) => {
            const input = DOMUtils.query(id, this.containerElement);
            if (input) {
                input.dataset.field = field;
                this.autoComplete.setupAutoComplete(input, (suggestion) => {
                    this.handleAutoCompleteSuggestion(field, suggestion);
                });
            }
        });

        console.log('🔤 Auto-complete initialized for all search inputs');
    }

    /**
     * Micro-Component #5: State persistence
     */
    saveCurrentState() {
        try {
            const currentState = {
                activeTab: this.stateManager.activeTab,
                criteria: { ...this.stateManager.currentSearch.criteria },
                filters: { ...this.stateManager.currentSearch.filters },
                expandedSections: Array.from(this.stateManager.expandedSections),
                lastSaved: new Date().toISOString()
            };

            const result = this.storage.save('advanced_search_state', currentState);
            
            if (result.success) {
                console.log('💾 Search state saved successfully');
                this.showSaveIndicator();
            } else {
                console.warn('⚠️ Failed to save search state:', result.message);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Error saving search state:', error);
            return { success: false, message: error.message };
        }
    }

    // =============================================================================
    // TAB CONTENT RENDERING (3 components)
    // =============================================================================

    /**
     * Micro-Component #6: Basic search form rendering
     */
    renderBasicTab() {
        return `
            <div class="tab-panel ${this.stateManager.activeTab === 'basic' ? 'active' : ''}" 
                 id="basic-panel">
                <div class="search-section">
                    <div class="section-header" data-section="basic-search">
                        <h4 class="section-title">
                            <span class="section-icon">🔍</span>
                            Basic Search
                        </h4>
                        <div class="section-actions">
                            <button class="section-toggle" data-toggle="basic-search">
                                <span class="toggle-icon">${this.stateManager.expandedSections.has('basic-search') ? '▼' : '▶'}</span>
                            </button>
                        </div>
                    </div>
                    <div class="section-content ${this.stateManager.expandedSections.has('basic-search') ? 'expanded' : ''}">
                        <div class="form-group">
                            <label for="basic-query">Search for books, authors, or topics</label>
                            <div class="input-with-suggestions">
                                <input type="text" 
                                       id="basic-query" 
                                       name="query"
                                       class="form-input search-input"
                                       placeholder='Try: "JavaScript programming", "Agatha Christie", or "science fiction"'
                                       value="${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.query || '')}"
                                       autocomplete="off">
                                <div class="suggestions-dropdown" id="basic-suggestions"></div>
                            </div>
                            <div class="field-help">
                                Enter any combination of book titles, author names, subjects, or keywords. 
                                Use quotes for exact phrases like <code>"machine learning"</code>.
                            </div>
                        </div>
                        
                        ${this.renderQuickSuggestions()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Micro-Component #7: Advanced multi-field form rendering
     */
    renderAdvancedTab() {
        return `
            <div class="tab-panel ${this.stateManager.activeTab === 'advanced' ? 'active' : ''}" 
                 id="advanced-panel">
                <div class="search-section">
                    <div class="section-header" data-section="advanced-fields">
                        <h4 class="section-title">
                            <span class="section-icon">🎯</span>
                            Search Fields
                        </h4>
                        <div class="section-actions">
                            <button class="section-toggle" data-toggle="advanced-fields">
                                <span class="toggle-icon">${this.stateManager.expandedSections.has('advanced-fields') ? '▼' : '▶'}</span>
                            </button>
                        </div>
                    </div>
                    <div class="section-content ${this.stateManager.expandedSections.has('advanced-fields') ? 'expanded' : ''}">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="advanced-title">Title</label>
                                <div class="input-with-suggestions">
                                    <input type="text" 
                                           id="advanced-title" 
                                           name="title"
                                           class="form-input"
                                           placeholder="e.g., Clean Code"
                                           value="${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.title || '')}"
                                           autocomplete="off">
                                    <div class="suggestions-dropdown"></div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="advanced-author">Author</label>
                                <div class="input-with-suggestions">
                                    <input type="text" 
                                           id="advanced-author" 
                                           name="author"
                                           class="form-input"
                                           placeholder="e.g., Robert C. Martin"
                                           value="${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.author || '')}"
                                           autocomplete="off">
                                    <div class="suggestions-dropdown"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="advanced-subject">Subject/Category</label>
                                <div class="input-with-suggestions">
                                    <input type="text" 
                                           id="advanced-subject" 
                                           name="subject"
                                           class="form-input"
                                           placeholder="e.g., Programming, Fiction"
                                           value="${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.subject || '')}"
                                           autocomplete="off">
                                    <div class="suggestions-dropdown"></div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="advanced-isbn">ISBN</label>
                                <input type="text" 
                                       id="advanced-isbn" 
                                       name="isbn"
                                       class="form-input"
                                       placeholder="e.g., 978-0-13-235088-4"
                                       value="${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.isbn || '')}">
                                <div class="field-help">
                                    Enter ISBN-10 or ISBN-13 (with or without hyphens)
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="advanced-publisher">Publisher</label>
                                <div class="input-with-suggestions">
                                    <input type="text" 
                                           id="advanced-publisher" 
                                           name="publisher"
                                           class="form-input"
                                           placeholder="e.g., O'Reilly Media"
                                           value="${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.publisher || '')}"
                                           autocomplete="off">
                                    <div class="suggestions-dropdown"></div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="advanced-keywords">Additional Keywords</label>
                                <input type="text" 
                                       id="advanced-keywords" 
                                       name="keywords"
                                       class="form-input"
                                       placeholder="e.g., tutorial, beginner, advanced"
                                       value="${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.keywords || '')}">
                            </div>
                        </div>
                    </div>
                </div>
                
                ${this.renderAdvancedFilters()}
            </div>
        `;
    }

    /**
     * Micro-Component #8: Expert query builder rendering
     */
    renderExpertTab() {
        return `
            <div class="tab-panel ${this.stateManager.activeTab === 'expert' ? 'active' : ''}" 
                 id="expert-panel">
                <div class="search-section">
                    <div class="section-header" data-section="expert-query">
                        <h4 class="section-title">
                            <span class="section-icon">⚡</span>
                            Expert Query Builder
                        </h4>
                        <div class="section-actions">
                            <button class="section-toggle" data-toggle="expert-query">
                                <span class="toggle-icon">${this.stateManager.expandedSections.has('expert-query') ? '▼' : '▶'}</span>
                            </button>
                        </div>
                    </div>
                    <div class="section-content ${this.stateManager.expandedSections.has('expert-query') ? 'expanded' : ''}">
                        <div class="form-group">
                            <label for="expert-query-input">Google Books API Query</label>
                            <textarea id="expert-query-input" 
                                      name="expertQuery"
                                      class="form-textarea expert-textarea"
                                      placeholder='Example: intitle:"clean code" inauthor:"martin" subject:"programming"'
                                      rows="6">${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.expertQuery || '')}</textarea>
                            <div class="field-help">
                                Build advanced queries using Google Books search operators:
                                <br>• <code>intitle:"exact title"</code> - Search in title
                                <br>• <code>inauthor:"author name"</code> - Search by author
                                <br>• <code>subject:"category"</code> - Search by subject
                                <br>• <code>isbn:1234567890</code> - Search by ISBN
                                <br>• <code>inpublisher:"publisher"</code> - Search by publisher
                                <br>• Use quotes for exact phrases, combine with AND/OR
                            </div>
                        </div>
                        
                        ${this.renderQueryBuilder()}
                        ${this.renderQueryPreview()}
                    </div>
                </div>
            </div>
        `;
    }

    // =============================================================================
    // SEARCH OPERATIONS (4 components)
    // =============================================================================

    /**
     * Micro-Component #9: Execute search with loading states
     */
    async performSearch() {
        if (this.isSearching) {
            console.log('⏳ Search already in progress, ignoring duplicate request');
            return { success: false, message: 'Search already in progress' };
        }

        try {
            console.log('🔍 Starting advanced search...');
            
            // Validate search criteria
            const validation = this.validateSearchCriteria();
            if (!validation.valid) {
                this.showSearchError(validation.message);
                return { success: false, message: validation.message };
            }

            // Set loading state
            this.setSearchingState(true);
            
            // Build search query and options
            const query = this.queryBuilder.buildSearchQuery(
                this.stateManager.currentSearch.criteria,
                this.stateManager.activeTab
            );
            
            const options = this.queryBuilder.buildSearchOptions(
                this.stateManager.currentSearch.filters
            );

            console.log(`🎯 Executing search: "${query}" with options:`, options);

            // Add to search history
            this.historyManager.addToHistory(
                query,
                this.stateManager.currentSearch.criteria,
                this.stateManager.currentSearch.filters,
                0 // Will be updated after search
            );

            // Perform the actual search
            const result = await this.googleBooksAPI.searchBooks(query, options);
            
            if (result.success) {
                // Update history with result count
                const history = this.historyManager.searchHistory;
                if (history.length > 0) {
                    history[0].resultsCount = result.books.length;
                    this.historyManager.saveSearchHistory();
                }
                
                return await this.handleSearchResults(result);
            } else {
                return this.handleSearchError(result);
            }

        } catch (error) {
            console.error('❌ Search execution failed:', error);
            return this.handleSearchError({ 
                success: false, 
                message: error.message,
                error 
            });
        } finally {
            this.setSearchingState(false);
        }
    }

    /**
     * Micro-Component #10: Process and display search results
     */
    async handleSearchResults(result) {
        try {
            console.log(`✅ Search completed: ${result.books.length} books found`);
            
            // Store results
            this.currentResults = result.books;
            this.stateManager.currentSearch.results = result.books;
            this.stateManager.currentSearch.lastSearchTime = new Date().toISOString();
            
            // Clear any previous error
            this.hideSearchError();
            
            // Enable export button
            this.enableExportButton();
            
            // Emit search completion event
            eventBus.emit('search:completed', {
                query: result.query,
                totalResults: result.books.length,
                source: result.source,
                timestamp: new Date().toISOString()
            });
            
            // Save current state
            this.saveCurrentState();
            
            // Show success message
            this.showSearchSuccess(result.books.length, result.query);
            
            return {
                success: true,
                results: result.books,
                totalResults: result.totalItems || result.books.length,
                message: `Found ${result.books.length} books`
            };
            
        } catch (error) {
            console.error('❌ Error handling search results:', error);
            return this.handleSearchError({
                success: false,
                message: 'Failed to process search results',
                error
            });
        }
    }

    /**
     * Micro-Component #11: Error handling and recovery
     */
    handleSearchError(errorResult) {
        console.error('🚨 Search error:', errorResult);
        
        // Determine user-friendly error message
        let userMessage = 'Search failed. Please try again.';
        
        if (errorResult.message) {
            if (errorResult.message.includes('network') || errorResult.message.includes('timeout')) {
                userMessage = 'Network error. Please check your connection and try again.';
            } else if (errorResult.message.includes('rate limit')) {
                userMessage = 'Too many requests. Please wait a moment before searching again.';
            } else if (errorResult.message.includes('invalid') || errorResult.message.includes('required')) {
                userMessage = errorResult.message;
            } else {
                userMessage = `Search failed: ${errorResult.message}`;
            }
        }
        
        // Show error to user
        this.showSearchError(userMessage);
        
        // Emit error event
        eventBus.emit('search:error', {
            error: errorResult,
            userMessage,
            timestamp: new Date().toISOString()
        });
        
        // Suggest recovery actions
        this.showRecoveryOptions(errorResult);
        
        return {
            success: false,
            message: userMessage,
            error: errorResult
        };
    }

    /**
     * Micro-Component #12: Reset functionality
     */
    clearSearch() {
        try {
            console.log('🧹 Clearing search interface...');
            
            // Reset state
            this.stateManager.reset();
            
            // Clear results
            this.currentResults = [];
            
            // Clear form inputs
            this.clearFormInputs();
            
            // Hide error messages
            this.hideSearchError();
            
            // Disable export button
            this.disableExportButton();
            
            // Re-render to apply changes
            this.render();
            
            // Re-initialize auto-complete
            this.initializeAutoComplete();
            
            // Save cleared state
            this.saveCurrentState();
            
            // Emit clear event
            eventBus.emit('search:cleared', {
                timestamp: new Date().toISOString()
            });
            
            console.log('✅ Search interface cleared');
            return { success: true, message: 'Search cleared successfully' };
            
        } catch (error) {
            console.error('❌ Error clearing search:', error);
            return { success: false, message: error.message };
        }
    }

    // =============================================================================
    // UI INTERACTIONS (3 components)
    // =============================================================================

    /**
     * Micro-Component #13: Tab switching logic
     */
    handleTabSwitch(tabId) {
        if (!tabId || tabId === this.stateManager.activeTab) {
            return;
        }

        console.log(`🔄 Switching to tab: ${tabId}`);
        
        try {
            // Save current form data before switching
            this.captureCurrentFormData();
            
            // Update state
            this.stateManager.activeTab = tabId;
            
            // Update UI
            this.updateTabUI(tabId);
            
            // Re-initialize auto-complete for new tab
            this.initializeAutoComplete();
            
            // Save state
            this.saveCurrentState();
            
            // Emit tab change event
            eventBus.emit('search:tabChanged', {
                from: this.stateManager.activeTab,
                to: tabId,
                timestamp: new Date().toISOString()
            });
            
            console.log(`✅ Tab switched to: ${tabId}`);
            
        } catch (error) {
            console.error('❌ Error switching tabs:', error);
        }
    }

    /**
     * Micro-Component #14: Form submission handling
     */
    handleFormSubmit(event) {
        event.preventDefault();
        
        console.log('📝 Form submitted, starting search...');
        
        try {
            // Capture all form data
            this.captureCurrentFormData();
            
            // Validate and perform search
            this.performSearch();
            
        } catch (error) {
            console.error('❌ Error handling form submission:', error);
            this.showSearchError(`Form submission failed: ${error.message}`);
        }
    }

    /**
     * Micro-Component #15: Help/tips modal
     */
    showSearchTips() {
        this.modalManager.showModal({
            title: '💡 Search Tips & Help',
            content: this.renderSearchTipsContent(),
            className: 'modal-lg search-tips-modal',
            buttons: [
                {
                    text: 'Got it!',
                    action: 'close',
                    className: 'btn-primary'
                }
            ]
        });
    }

    // =============================================================================
    // INTEGRATION METHODS (2 components)
    // =============================================================================

    /**
     * Micro-Component #16: Export functionality
     */
    exportResults() {
        if (!this.currentResults || this.currentResults.length === 0) {
            this.modalManager.showAlert(
                'No Results to Export',
                'Please perform a search first to generate results for export.'
            );
            return;
        }

        this.modalManager.showModal({
            title: '📤 Export Search Results',
            content: this.renderExportOptions(),
            buttons: [
                {
                    text: 'Cancel',
                    action: 'cancel',
                    className: 'btn-outline'
                },
                {
                    text: 'Export',
                    action: 'export',
                    className: 'btn-primary'
                }
            ],
            onAction: (action) => {
                if (action === 'export') {
                    this.handleExportAction();
                }
                return true;
            }
        });
    }

    /**
     * Micro-Component #17: Cleanup method
     */
    destroy() {
        try {
            console.log('🗑️ Destroying AdvancedSearchInterface...');
            
            // Save final state
            this.saveCurrentState();
            
            // Remove event listeners
            this.removeAllEventListeners();
            
            // Clear timers and intervals
            this.clearAllTimers();
            
            // Clear container
            if (this.containerElement) {
                this.containerElement.innerHTML = '';
            }
            
            // Clean up sub-components
            this.autoComplete = null;
            this.queryBuilder = null;
            this.exportManager = null;
            this.stateManager = null;
            this.historyManager = null;
            this.uiRenderer = null;
            
            // Emit destruction event
            eventBus.emit('search:interfaceDestroyed', {
                timestamp: new Date().toISOString()
            });
            
            console.log('✅ AdvancedSearchInterface destroyed successfully');
            
        } catch (error) {
            console.error('❌ Error during destruction:', error);
        }
    }

    // =============================================================================
    // HELPER METHODS (Supporting the 17 micro-components)
    // =============================================================================

    loadSavedState() {
        try {
            const result = this.storage.load('advanced_search_state');
            if (result.success && result.data) {
                const state = result.data;
                
                this.stateManager.activeTab = state.activeTab || 'basic';
                this.stateManager.currentSearch.criteria = { 
                    ...this.stateManager.getDefaultCriteria(), 
                    ...state.criteria 
                };
                this.stateManager.currentSearch.filters = { 
                    ...this.stateManager.getDefaultFilters(), 
                    ...state.filters 
                };
                this.stateManager.expandedSections = new Set(state.expandedSections || ['basic-search']);
                
                console.log('📂 Previous search state loaded');
            }
        } catch (error) {
            console.warn('⚠️ Could not load saved state:', error);
        }
    }

    renderSearchHeader() {
        return `
            <div class="search-header">
                <div class="search-title-section">
                    <h3 class="search-title">
                        <span class="search-icon">🔍</span>
                        Advanced Book Search
                    </h3>
                    <p class="search-subtitle">
                        Find books across multiple sources with powerful search criteria and filters
                    </p>
                </div>
                
                <div class="search-header-actions">
                    <button class="btn btn-sm btn-outline" id="clear-search" title="Clear all fields">
                        <span class="btn-icon">🧹</span>
                        Clear All
                    </button>
                    <button class="btn btn-sm btn-outline" id="save-search" title="Save current search">
                        <span class="btn-icon">💾</span>
                        Save Search
                    </button>
                    <button class="btn btn-sm btn-outline" id="search-history" title="View search history">
                        <span class="btn-icon">📜</span>
                        History
                    </button>
                    <button class="btn btn-sm btn-outline" id="search-tips" title="Show search tips">
                        <span class="btn-icon">💡</span>
                        Tips
                    </button>
                    <button class="btn btn-sm btn-outline" id="export-results" title="Export search results" disabled>
                        <span class="btn-icon">📤</span>
                        Export
                    </button>
                </div>
            </div>
        `;
    }

    renderSearchTabs() {
        const tabs = [
            { id: 'basic', label: 'Basic Search', icon: '🔍', description: 'Simple keyword search' },
            { id: 'advanced', label: 'Advanced Search', icon: '🎯', description: 'Multi-field search' },
            { id: 'expert', label: 'Expert Query', icon: '⚡', description: 'Custom query builder' }
        ];
        
        return `
            <div class="search-tabs">
                <div class="tab-buttons">
                    ${tabs.map(tab => `
                        <button class="tab-btn ${this.stateManager.activeTab === tab.id ? 'active' : ''}" 
                                data-tab="${tab.id}"
                                title="${tab.description}">
                            <span class="tab-icon">${tab.icon}</span>
                            <span class="tab-label">${tab.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderTabIndicator() {
        return `
            <div class="tab-indicator">
                <div class="search-progress">
                    <span class="progress-text" id="search-status">Ready to search</span>
                    <div class="progress-bar" id="search-progress">
                        <div class="progress-fill"></div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSearchForm() {
        return `
            <div class="search-form">
                <form id="advanced-search-form" novalidate>
                    <div class="tab-content">
                        ${this.renderBasicTab()}
                        ${this.renderAdvancedTab()}
                        ${this.renderExpertTab()}
                    </div>
                </form>
            </div>
        `;
    }

    renderSearchActions() {
        return `
            <div class="search-actions">
                <div class="primary-actions">
                    <button type="submit" class="btn btn-primary search-btn" id="perform-search">
                        <span class="btn-icon">🔍</span>
                        <span class="btn-text">Search Books</span>
                    </button>
                    <button type="button" class="btn btn-outline" id="preview-query">
                        <span class="btn-icon">👁️</span>
                        <span class="btn-text">Preview Query</span>
                    </button>
                </div>
                
                <div class="secondary-actions">
                    <button type="button" class="btn btn-sm btn-outline" id="load-saved-search">
                        <span class="btn-icon">📂</span>
                        Load Saved
                    </button>
                    <button type="button" class="btn btn-sm btn-outline" id="random-search">
                        <span class="btn-icon">🎲</span>
                        Surprise Me
                    </button>
                </div>
            </div>
        `;
    }

    renderSearchError() {
        return `
            <div class="search-error" id="search-error" style="display: none;">
                <div class="error-content">
                    <span class="error-icon">⚠️</span>
                    <span class="error-message" id="error-message"></span>
                    <button class="error-close" id="close-error" aria-label="Close error">&times;</button>
                </div>
            </div>
        `;
    }

    renderQuickSuggestions() {
        const suggestions = [
            'JavaScript programming',
            'Python tutorial',
            'Science fiction',
            'Agatha Christie',
            'Machine learning',
            'React development',
            'Historical fiction',
            'Data science'
        ];

        return `
            <div class="quick-suggestions">
                <span class="suggestions-label">Popular searches:</span>
                <div class="suggestion-tags">
                    ${suggestions.map(suggestion => `
                        <button class="suggestion-tag" data-suggestion="${StringUtils.escapeHtml(suggestion)}">
                            ${StringUtils.escapeHtml(suggestion)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderAdvancedFilters() {
        return `
            <div class="search-section">
                <div class="section-header" data-section="advanced-filters">
                    <h4 class="section-title">
                        <span class="section-icon">🔧</span>
                        Search Filters
                    </h4>
                    <div class="section-actions">
                        <button class="section-toggle" data-toggle="advanced-filters">
                            <span class="toggle-icon">${this.stateManager.expandedSections.has('advanced-filters') ? '▼' : '▶'}</span>
                        </button>
                    </div>
                </div>
                <div class="section-content ${this.stateManager.expandedSections.has('advanced-filters') ? 'expanded' : ''}">
                    <div class="filters-grid">
                        <div class="filter-group">
                            <label for="filter-language">Language</label>
                            <select id="filter-language" name="language" class="form-select">
                                <option value="all">All Languages</option>
                                <option value="en" ${this.stateManager.currentSearch.filters.language === 'en' ? 'selected' : ''}>English</option>
                                <option value="es" ${this.stateManager.currentSearch.filters.language === 'es' ? 'selected' : ''}>Spanish</option>
                                <option value="fr" ${this.stateManager.currentSearch.filters.language === 'fr' ? 'selected' : ''}>French</option>
                                <option value="de" ${this.stateManager.currentSearch.filters.language === 'de' ? 'selected' : ''}>German</option>
                                <option value="it" ${this.stateManager.currentSearch.filters.language === 'it' ? 'selected' : ''}>Italian</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label>Publication Year</label>
                            <div class="year-range">
                                <input type="number" 
                                       id="filter-year-from" 
                                       name="yearFrom"
                                       class="form-input year-input" 
                                       placeholder="From"
                                       min="1400"
                                       max="${new Date().getFullYear()}"
                                       value="${this.stateManager.currentSearch.filters.yearFrom || ''}">
                                <span class="range-separator">to</span>
                                <input type="number" 
                                       id="filter-year-to" 
                                       name="yearTo"
                                       class="form-input year-input" 
                                       placeholder="To"
                                       min="1400"
                                       max="${new Date().getFullYear()}"
                                       value="${this.stateManager.currentSearch.filters.yearTo || ''}">
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label for="filter-print-type">Content Type</label>
                            <select id="filter-print-type" name="printType" class="form-select">
                                <option value="">All Types</option>
                                <option value="books" ${this.stateManager.currentSearch.filters.printType === 'books' ? 'selected' : ''}>Books</option>
                                <option value="magazines" ${this.stateManager.currentSearch.filters.printType === 'magazines' ? 'selected' : ''}>Magazines</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="filter-order-by">Sort Results By</label>
                            <select id="filter-order-by" name="orderBy" class="form-select">
                                <option value="relevance" ${this.stateManager.currentSearch.filters.orderBy === 'relevance' ? 'selected' : ''}>Relevance</option>
                                <option value="newest" ${this.stateManager.currentSearch.filters.orderBy === 'newest' ? 'selected' : ''}>Newest First</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="filter-max-results">Results Limit</label>
                            <select id="filter-max-results" name="maxResults" class="form-select">
                                <option value="10" ${this.stateManager.currentSearch.filters.maxResults === 10 ? 'selected' : ''}>10 results</option>
                                <option value="20" ${this.stateManager.currentSearch.filters.maxResults === 20 ? 'selected' : ''}>20 results</option>
                                <option value="40" ${this.stateManager.currentSearch.filters.maxResults === 40 ? 'selected' : ''}>40 results</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   id="filter-preview-available" 
                                   name="previewAvailable"
                                   ${this.stateManager.currentSearch.filters.previewAvailable ? 'checked' : ''}>
                            <span class="checkbox-text">Only books with preview available</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   id="filter-free-ebooks" 
                                   name="freeEbooks"
                                   ${this.stateManager.currentSearch.filters.freeEbooks ? 'checked' : ''}>
                            <span class="checkbox-text">Only free ebooks</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    renderQueryBuilder() {
        return `
            <div class="query-builder">
                <div class="builder-header">
                    <span class="builder-title">Visual Query Builder</span>
                    <button type="button" class="btn btn-sm btn-outline" id="add-query-part">
                        <span class="btn-icon">➕</span>
                        Add Condition
                    </button>
                </div>
                <div class="query-parts" id="query-parts">
                    <p style="color: var(--text-secondary); font-style: italic;">
                        Drag query parts here or use the text area above for manual entry
                    </p>
                </div>
            </div>
        `;
    }

    renderQueryPreview() {
        return `
            <div class="query-preview">
                <label for="query-preview-code">Generated Query Preview:</label>
                <code class="query-code" id="query-preview-code">
                    ${this.generateQueryPreview()}
                </code>
            </div>
        `;
    }

    renderSearchTipsContent() {
        return `
            <div class="search-tips">
                <div class="tip-section">
                    <h4>Basic Search Tips</h4>
                    <ul>
                        <li>Use quotes for exact phrases: <code>"machine learning"</code></li>
                        <li>Search by author name: <code>Robert C. Martin</code></li>
                        <li>Include multiple keywords: <code>JavaScript React tutorial</code></li>
                        <li>Use specific terms for better results</li>
                    </ul>
                </div>
                
                <div class="tip-section">
                    <h4>Advanced Search Features</h4>
                    <ul>
                        <li>Fill in specific fields for targeted searches</li>
                        <li>Use ISBN for exact book matching</li>
                        <li>Filter by publication year range</li>
                        <li>Sort results by relevance or date</li>
                    </ul>
                </div>
                
                <div class="tip-section">
                    <h4>Expert Query Operators</h4>
                    <ul>
                        <li><code>intitle:"exact title"</code> - Search within book titles</li>
                        <li><code>inauthor:"author name"</code> - Search by specific author</li>
                        <li><code>subject:"programming"</code> - Search by subject category</li>
                        <li><code>isbn:9781234567890</code> - Search by ISBN number</li>
                        <li><code>inpublisher:"O'Reilly"</code> - Search by publisher</li>
                    </ul>
                </div>
                
                <div class="tip-section">
                    <h4>Search Examples</h4>
                    <ul>
                        <li>Fiction by specific author: <code>inauthor:"Agatha Christie" subject:"fiction"</code></li>
                        <li>Programming books: <code>intitle:"JavaScript" OR intitle:"Python" subject:"programming"</code></li>
                        <li>Recent technical books: <code>subject:"computer science" published:2020..2024</code></li>
                    </ul>
                </div>
            </div>
        `;
    }

    renderExportOptions() {
        return `
            <div class="export-dialog">
                <p>Choose export format for ${this.currentResults.length} search results:</p>
                
                <div class="export-options">
                    <div class="format-group">
                        <label class="format-option">
                            <input type="radio" name="export-format" value="json" checked>
                            <div class="format-label">
                                <strong>JSON Format</strong>
                                <small>Complete data with all metadata (recommended for backup)</small>
                            </div>
                        </label>
                        
                        <label class="format-option">
                            <input type="radio" name="export-format" value="csv">
                            <div class="format-label">
                                <strong>CSV Format</strong>
                                <small>Spreadsheet-compatible format for analysis</small>
                            </div>
                        </label>
                        
                        <label class="format-option">
                            <input type="radio" name="export-format" value="txt">
                            <div class="format-label">
                                <strong>Text Format</strong>
                                <small>Human-readable list format</small>
                            </div>
                        </label>
                    </div>
                    
                    <div class="export-options-group">
                        <label class="export-checkbox">
                            <input type="checkbox" id="include-descriptions" checked>
                            Include book descriptions
                        </label>
                        <label class="export-checkbox">
                            <input type="checkbox" id="include-metadata" checked>
                            Include publication metadata
                        </label>
                        <label class="export-checkbox">
                            <input type="checkbox" id="include-links">
                            Include preview/info links
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    // Event Handler Setup Methods
    setupHeaderActionListeners() {
        const clearBtn = DOMUtils.query('#clear-search', this.containerElement);
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSearch());
        }

        const saveBtn = DOMUtils.query('#save-search', this.containerElement);
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.showSaveSearchDialog());
        }

        const historyBtn = DOMUtils.query('#search-history', this.containerElement);
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.showSearchHistory());
        }

        const tipsBtn = DOMUtils.query('#search-tips', this.containerElement);
        if (tipsBtn) {
            tipsBtn.addEventListener('click', () => this.showSearchTips());
        }

        const exportBtn = DOMUtils.query('#export-results', this.containerElement);
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResults());
        }
    }

    setupSectionToggleListeners() {
        const toggleButtons = DOMUtils.queryAll('.section-toggle', this.containerElement);
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const sectionId = e.target.closest('.section-toggle').dataset.toggle;
                this.toggleSection(sectionId);
            });
        });
    }

    setupFilterChangeListeners() {
        const suggestionTags = DOMUtils.queryAll('.suggestion-tag', this.containerElement);
        suggestionTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                const suggestion = e.target.dataset.suggestion;
                this.applySuggestion(suggestion);
            });
        });

        const performSearchBtn = DOMUtils.query('#perform-search', this.containerElement);
        if (performSearchBtn) {
            performSearchBtn.addEventListener('click', () => this.performSearch());
        }

        const previewQueryBtn = DOMUtils.query('#preview-query', this.containerElement);
        if (previewQueryBtn) {
            previewQueryBtn.addEventListener('click', () => this.showQueryPreview());
        }

        const randomSearchBtn = DOMUtils.query('#random-search', this.containerElement);
        if (randomSearchBtn) {
            randomSearchBtn.addEventListener('click', () => this.performRandomSearch());
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when interface is visible
            if (!this.containerElement || this.containerElement.style.display === 'none') return;

            // Ctrl/Cmd + Enter to search
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.performSearch();
            }

            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.focusSearchInput();
            }

            // Escape to clear
            if (e.key === 'Escape') {
                this.hideSearchError();
            }
        });
    }

    // UI State Management Methods
    applyStateToUI() {
        // Apply active tab
        this.updateTabUI(this.stateManager.activeTab);
        
        // Apply expanded sections
        this.updateSectionStates();
        
        // Update progress indicator
        this.updateProgressIndicator();
    }

    updateTabUI(tabId) {
        // Update tab buttons
        const tabButtons = DOMUtils.queryAll('.tab-btn', this.containerElement);
        tabButtons.forEach(button => {
            DOMUtils.removeClass(button, 'active');
            if (button.dataset.tab === tabId) {
                DOMUtils.addClass(button, 'active');
            }
        });

        // Update tab panels
        const tabPanels = DOMUtils.queryAll('.tab-panel', this.containerElement);
        tabPanels.forEach(panel => {
            DOMUtils.removeClass(panel, 'active');
            if (panel.id === `${tabId}-panel`) {
                DOMUtils.addClass(panel, 'active');
            }
        });
    }

    updateSectionStates() {
        this.stateManager.expandedSections.forEach(sectionId => {
            const content = DOMUtils.query(`[data-section="${sectionId}"] + .section-content`, this.containerElement);
            const toggle = DOMUtils.query(`[data-toggle="${sectionId}"] .toggle-icon`, this.containerElement);
            
            if (content) DOMUtils.addClass(content, 'expanded');
            if (toggle) toggle.textContent = '▼';
        });
    }

    // Form Data Management
    captureCurrentFormData() {
        const form = DOMUtils.query('#advanced-search-form', this.containerElement);
        if (!form) return;

        const formData = new FormData(form);
        const criteria = this.stateManager.currentSearch.criteria;
        const filters = this.stateManager.currentSearch.filters;

        // Capture criteria
        criteria.query = formData.get('query') || '';
        criteria.title = formData.get('title') || '';
        criteria.author = formData.get('author') || '';
        criteria.subject = formData.get('subject') || '';
        criteria.isbn = formData.get('isbn') || '';
        criteria.publisher = formData.get('publisher') || '';
        criteria.keywords = formData.get('keywords') || '';
        criteria.expertQuery = formData.get('expertQuery') || '';

        // Capture filters
        filters.language = formData.get('language') || 'all';
        filters.yearFrom = formData.get('yearFrom') ? parseInt(formData.get('yearFrom')) : null;
        filters.yearTo = formData.get('yearTo') ? parseInt(formData.get('yearTo')) : null;
        filters.printType = formData.get('printType') || '';
        filters.orderBy = formData.get('orderBy') || 'relevance';
        filters.maxResults = parseInt(formData.get('maxResults')) || 20;
        filters.previewAvailable = formData.has('previewAvailable');
        filters.freeEbooks = formData.has('freeEbooks');
    }

    clearFormInputs() {
        const form = DOMUtils.query('#advanced-search-form', this.containerElement);
        if (form) {
            form.reset();
        }
    }

    // Validation and Error Handling
    validateSearchCriteria() {
        return this.queryBuilder.validateSearchCriteria(
            this.stateManager.currentSearch.criteria,
            this.stateManager.activeTab
        );
    }

    showSearchError(message) {
        const errorElement = DOMUtils.query('#search-error', this.containerElement);
        const messageElement = DOMUtils.query('#error-message', this.containerElement);
        
        if (errorElement && messageElement) {
            messageElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Auto-hide after 10 seconds
            setTimeout(() => this.hideSearchError(), 10000);
        }
    }

    hideSearchError() {
        const errorElement = DOMUtils.query('#search-error', this.containerElement);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    showSearchSuccess(count, query) {
        this.updateSearchStatus(`Found ${count} books for "${query}"`);
    }

    updateSearchStatus(message) {
        const statusElement = DOMUtils.query('#search-status', this.containerElement);
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    // Helper Methods
    generateQueryPreview() {
        const query = this.queryBuilder.buildSearchQuery(
            this.stateManager.currentSearch.criteria,
            this.stateManager.activeTab
        );
        return query || 'Enter search criteria to see query preview';
    }

    setSearchingState(isSearching) {
        this.isSearching = isSearching;
        const searchBtn = DOMUtils.query('#perform-search', this.containerElement);
        const progressBar = DOMUtils.query('#search-progress', this.containerElement);
        
        if (searchBtn) {
            searchBtn.disabled = isSearching;
            searchBtn.textContent = isSearching ? 'Searching...' : 'Search Books';
        }
        
        if (progressBar) {
            progressBar.style.display = isSearching ? 'block' : 'none';
        }
        
        this.updateSearchStatus(isSearching ? 'Searching...' : 'Ready to search');
    }

    enableExportButton() {
        const exportBtn = DOMUtils.query('#export-results', this.containerElement);
        if (exportBtn) {
            exportBtn.disabled = false;
        }
    }

    disableExportButton() {
        const exportBtn = DOMUtils.query('#export-results', this.containerElement);
        if (exportBtn) {
            exportBtn.disabled = true;
        }
    }

    // Event Handlers for Additional Features
    handleInputChange(event) {
        // Auto-save on input changes with debouncing
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.captureCurrentFormData();
            this.saveCurrentState();
        }, 1000);
    }

    handleAutoCompleteSuggestion(field, suggestion) {
        console.log(`🎯 Auto-complete suggestion for ${field}: ${suggestion}`);
        
        if (field === 'query') {
            const input = DOMUtils.query('#basic-query', this.containerElement);
            if (input) input.value = suggestion;
        } else {
            const input = DOMUtils.query(`#advanced-${field}`, this.containerElement);
            if (input) input.value = suggestion;
        }
        
        this.captureCurrentFormData();
    }

    toggleSection(sectionId) {
        const isExpanded = this.stateManager.expandedSections.has(sectionId);
        
        if (isExpanded) {
            this.stateManager.expandedSections.delete(sectionId);
        } else {
            this.stateManager.expandedSections.add(sectionId);
        }
        
        this.updateSectionStates();
        this.saveCurrentState();
    }

    applySuggestion(suggestion) {
        const activeTab = this.stateManager.activeTab;
        
        if (activeTab === 'basic') {
            const input = DOMUtils.query('#basic-query', this.containerElement);
            if (input) {
                input.value = suggestion;
                input.focus();
            }
        }
        
        this.captureCurrentFormData();
    }

    focusSearchInput() {
        const activeTab = this.stateManager.activeTab;
        let input;
        
        if (activeTab === 'basic') {
            input = DOMUtils.query('#basic-query', this.containerElement);
        } else if (activeTab === 'advanced') {
            input = DOMUtils.query('#advanced-title', this.containerElement);
        } else if (activeTab === 'expert') {
            input = DOMUtils.query('#expert-query-input', this.containerElement);
        }
        
        if (input) {
            input.focus();
            input.select();
        }
    }

    showQueryPreview() {
        const query = this.generateQueryPreview();
        this.modalManager.showAlert('Query Preview', `Generated query: <code>${query}</code>`);
    }

    async performRandomSearch() {
        const randomQueries = [
            'fiction bestseller',
            'programming tutorial',
            'historical biography',
            'science fiction',
            'self help',
            'mystery novel',
            'cooking recipes',
            'travel guide'
        ];
        
        const randomQuery = randomQueries[Math.floor(Math.random() * randomQueries.length)];
        
        // Set the random query
        this.stateManager.currentSearch.criteria.query = randomQuery;
        
        // Update UI
        const input = DOMUtils.query('#basic-query', this.containerElement);
        if (input) input.value = randomQuery;
        
        // Switch to basic tab if needed
        if (this.stateManager.activeTab !== 'basic') {
            this.handleTabSwitch('basic');
        }
        
        // Perform search
        await this.performSearch();
    }

    showSaveSearchDialog() {
        this.modalManager.showPrompt(
            'Save Search',
            'Enter a name for this search:',
            '',
            'My Search'
        ).then(name => {
            if (name && name.trim()) {
                this.saveSearch(name.trim());
            }
        });
    }

    saveSearch(name) {
        const query = this.queryBuilder.buildSearchQuery(
            this.stateManager.currentSearch.criteria,
            this.stateManager.activeTab
        );
        
        const result = this.historyManager.saveSearch(
            name,
            this.stateManager.currentSearch.criteria,
            this.stateManager.currentSearch.filters,
            query
        );
        
        if (result) {
            this.modalManager.showAlert('Search Saved', `Search "${name}" has been saved successfully!`);
        }
    }

    showSearchHistory() {
        const history = this.historyManager.searchHistory;
        const saved = this.historyManager.savedSearches;
        
        let content = '<div class="search-history-dialog">';
        
        if (saved.length > 0) {
            content += '<h4>Saved Searches</h4>';
            content += '<div class="saved-list">';
            saved.slice(0, 5).forEach(search => {
                content += `
                    <div class="saved-item" data-search-id="${search.id}">
                        <div class="saved-main">
                            <div class="saved-name">${StringUtils.escapeHtml(search.name)}</div>
                            <div class="saved-query">${StringUtils.escapeHtml(search.displayQuery)}</div>
                            <div class="saved-meta">
                                Saved ${DateUtils.getRelativeTime(search.savedAt)}
                            </div>
                        </div>
                        <div class="saved-actions">
                            <button class="btn btn-xs btn-primary" data-action="load">Load</button>
                            <button class="btn btn-xs btn-outline" data-action="delete">Delete</button>
                        </div>
                    </div>
                `;
            });
            content += '</div>';
        }
        
        if (history.length > 0) {
            content += '<h4>Recent Searches</h4>';
            content += '<div class="history-list">';
            history.slice(0, 10).forEach(item => {
                content += `
                    <div class="history-item" data-history-id="${item.id}">
                        <div class="history-main">
                            <div class="history-query">${StringUtils.escapeHtml(item.displayQuery)}</div>
                            <div class="history-meta">
                                ${DateUtils.getRelativeTime(item.timestamp)} • ${item.resultsCount} results
                            </div>
                        </div>
                        <div class="history-actions">
                            <button class="btn btn-xs btn-outline" data-action="repeat">Repeat</button>
                        </div>
                    </div>
                `;
            });
            content += '</div>';
        }
        
        if (history.length === 0 && saved.length === 0) {
            content += '<p>No search history available.</p>';
        }
        
        content += '</div>';
        
        this.modalManager.showModal({
            title: '📜 Search History',
            content,
            className: 'modal-lg',
            buttons: [
                {
                    text: 'Clear History',
                    action: 'clear',
                    className: 'btn-outline'
                },
                {
                    text: 'Close',
                    action: 'close',
                    className: 'btn-primary'
                }
            ],
            onAction: (action) => {
                if (action === 'clear') {
                    this.clearSearchHistory();
                    return false; // Don't close modal
                }
                return true;
            }
        });
    }

    clearSearchHistory() {
        this.historyManager.searchHistory = [];
        this.historyManager.saveSearchHistory();
        this.modalManager.showAlert('History Cleared', 'Search history has been cleared.');
    }

    showRecoveryOptions(errorResult) {
        // Could show a recovery dialog with suggestions
        console.log('🔧 Recovery options for error:', errorResult);
    }

    handleExportAction() {
        const formatRadios = DOMUtils.queryAll('input[name="export-format"]');
        let format = 'json';
        
        formatRadios.forEach(radio => {
            if (radio.checked) format = radio.value;
        });
        
        const includeDescriptions = DOMUtils.query('#include-descriptions')?.checked || false;
        const includeMetadata = DOMUtils.query('#include-metadata')?.checked || false;
        const includeLinks = DOMUtils.query('#include-links')?.checked || false;
        
        try {
            this.exportManager.exportResults(this.currentResults, format, {
                includeDescriptions,
                includeMetadata,
                includeLinks
            });
            
            this.modalManager.showAlert(
                'Export Complete',
                `Successfully exported ${this.currentResults.length} search results in ${format.toUpperCase()} format.`
            );
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.modalManager.showAlert(
                'Export Failed',
                `Failed to export results: ${error.message}`
            );
        }
    }

    showSaveIndicator() {
        // Show a brief save indicator
        const indicator = DOMUtils.createElement('div', {
            className: 'save-indicator',
            textContent: '💾 Saved',
            style: `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--success-color);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: var(--border-radius);
                font-size: 0.875rem;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            `
        });
        
        document.body.appendChild(indicator);
        
        // Animate in
        requestAnimationFrame(() => {
            indicator.style.opacity = '1';
        });
        
        // Remove after 2 seconds
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 300);
        }, 2000);
    }

    updateProgressIndicator() {
        const statusElement = DOMUtils.query('#search-status', this.containerElement);
        if (statusElement) {
            if (this.currentResults.length > 0) {
                statusElement.textContent = `${this.currentResults.length} results from last search`;
            } else if (this.isSearching) {
                statusElement.textContent = 'Searching...';
            } else {
                statusElement.textContent = 'Ready to search';
            }
        }
    }

    removeAllEventListeners() {
        // Remove form submission listener
        const searchForm = DOMUtils.query('.search-form', this.containerElement);
        if (searchForm) {
            searchForm.removeEventListener('submit', this.handleFormSubmit);
        }
        
        // Clear auto-save timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        // Remove keyboard event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
    }

    clearAllTimers() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }
        
        if (this.progressUpdateInterval) {
            clearInterval(this.progressUpdateInterval);
            this.progressUpdateInterval = null;
        }
    }

    // =============================================================================
    // PUBLIC API METHODS
    // =============================================================================

    /**
     * Public method to get current search state
     */
    getCurrentState() {
        return {
            activeTab: this.stateManager.activeTab,
            criteria: { ...this.stateManager.currentSearch.criteria },
            filters: { ...this.stateManager.currentSearch.filters },
            results: [...this.currentResults],
            isSearching: this.isSearching,
            expandedSections: Array.from(this.stateManager.expandedSections)
        };
    }

    /**
     * Public method to set search criteria programmatically
     */
    setCriteria(criteria) {
        this.stateManager.updateCriteria(criteria);
        this.applyStateToUI();
        this.saveCurrentState();
    }

    /**
     * Public method to set search filters programmatically
     */
    setFilters(filters) {
        this.stateManager.updateFilters(filters);
        this.applyStateToUI();
        this.saveCurrentState();
    }

    /**
     * Public method to switch tabs programmatically
     */
    switchToTab(tabId) {
        this.handleTabSwitch(tabId);
    }

    /**
     * Public method to get search history
     */
    getSearchHistory() {
        return {
            recent: this.historyManager.searchHistory,
            saved: this.historyManager.savedSearches
        };
    }

    /**
     * Public method to trigger search programmatically
     */
    async search(criteria = null, filters = null) {
        if (criteria) this.setCriteria(criteria);
        if (filters) this.setFilters(filters);
        
        return await this.performSearch();
    }

    /**
     * Public method to get current results
     */
    getResults() {
        return [...this.currentResults];
    }

    /**
     * Public method to check if interface is ready
     */
    isReady() {
        return !!this.containerElement && !this.isSearching;
    }

    /**
     * Public method to get interface statistics
     */
    getStats() {
        return {
            totalSearches: this.historyManager.searchHistory.length,
            savedSearches: this.historyManager.savedSearches.length,
            currentResults: this.currentResults.length,
            activeTab: this.stateManager.activeTab,
            isSearching: this.isSearching,
            expandedSections: this.stateManager.expandedSections.size
        };
    }

    // =============================================================================
    // HELPER METHODS FOR ADVANCED FEATURES
    // =============================================================================

    loadSavedSearch(searchId) {
        const savedSearch = this.historyManager.savedSearches.find(s => s.id === searchId);
        if (savedSearch) {
            this.stateManager.currentSearch.criteria = { ...savedSearch.criteria };
            this.stateManager.currentSearch.filters = { ...savedSearch.filters };
            this.render();
            this.initializeAutoComplete();
            this.saveCurrentState();
            
            console.log(`📂 Loaded saved search: ${savedSearch.name}`);
            return true;
        }
        return false;
    }

    repeatSearch(historyId) {
        const historyItem = this.historyManager.searchHistory.find(h => h.id === historyId);
        if (historyItem) {
            this.stateManager.currentSearch.criteria = { ...historyItem.criteria };
            this.stateManager.currentSearch.filters = { ...historyItem.filters };
            this.render();
            this.initializeAutoComplete();
            this.performSearch();
            
            console.log(`🔄 Repeating search: ${historyItem.displayQuery}`);
            return true;
        }
        return false;
    }

    exportSearchHistory() {
        const historyData = {
            exported: new Date().toISOString(),
            searchHistory: this.historyManager.searchHistory,
            savedSearches: this.historyManager.savedSearches
        };
        
        try {
            this.exportManager.exportResults([historyData], 'json');
            this.modalManager.showAlert(
                'History Exported',
                'Search history has been exported successfully.'
            );
        } catch (error) {
            this.modalManager.showAlert(
                'Export Failed',
                `Failed to export history: ${error.message}`
            );
        }
    }

    importSearchHistory(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.searchHistory) {
                this.historyManager.searchHistory = data.searchHistory;
                this.historyManager.saveSearchHistory();
            }
            
            if (data.savedSearches) {
                this.historyManager.savedSearches = data.savedSearches;
                this.historyManager.saveSavedSearches();
            }
            
            this.modalManager.showAlert(
                'History Imported',
                'Search history has been imported successfully.'
            );
            
            return true;
        } catch (error) {
            this.modalManager.showAlert(
                'Import Failed',
                `Failed to import history: ${error.message}`
            );
            return false;
        }
    }

    // =============================================================================
    // ADVANCED SEARCH FEATURES
    // =============================================================================

    async performBatchSearch(queries) {
        if (!Array.isArray(queries) || queries.length === 0) {
            return { success: false, message: 'No queries provided for batch search' };
        }

        console.log(`🔄 Starting batch search for ${queries.length} queries...`);
        
        const results = [];
        const errors = [];
        
        for (let i = 0; i < queries.length; i++) {
            try {
                this.updateSearchStatus(`Batch search ${i + 1}/${queries.length}: "${queries[i]}"`);
                
                const result = await this.googleBooksAPI.searchBooks(queries[i], {
                    maxResults: 5 // Limit results per query in batch
                });
                
                if (result.success) {
                    results.push(...result.books.map(book => ({
                        ...book,
                        batchQuery: queries[i],
                        batchIndex: i
                    })));
                } else {
                    errors.push({ query: queries[i], error: result.message });
                }
                
                // Small delay between requests
                if (i < queries.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
            } catch (error) {
                errors.push({ query: queries[i], error: error.message });
            }
        }
        
        this.currentResults = results;
        this.updateSearchStatus(`Batch search complete: ${results.length} total results`);
        
        if (errors.length > 0) {
            console.warn(`⚠️ Batch search had ${errors.length} errors:`, errors);
        }
        
        return {
            success: true,
            results,
            totalResults: results.length,
            errors,
            queriesProcessed: queries.length
        };
    }

    async performSimilarBookSearch(bookId) {
        try {
            const book = this.currentResults.find(b => b.id === bookId);
            if (!book) {
                throw new Error('Book not found in current results');
            }
            
            // Build a similarity query based on the book's attributes
            const similarityQueries = [];
            
            if (book.authors && book.authors.length > 0) {
                similarityQueries.push(`inauthor:"${book.authors[0]}"`);
            }
            
            if (book.categories && book.categories.length > 0) {
                similarityQueries.push(`subject:"${book.categories[0]}"`);
            }
            
            // Extract keywords from title
            const titleWords = book.title.split(' ')
                .filter(word => word.length > 3)
                .slice(0, 3);
            if (titleWords.length > 0) {
                similarityQueries.push(titleWords.join(' '));
            }
            
            const query = similarityQueries.join(' OR ');
            console.log(`🔍 Finding similar books to "${book.title}" with query: ${query}`);
            
            const result = await this.googleBooksAPI.searchBooks(query, {
                maxResults: 10
            });
            
            if (result.success) {
                // Filter out the original book
                const similarBooks = result.books.filter(b => b.id !== bookId);
                
                this.currentResults = similarBooks;
                this.updateSearchStatus(`Found ${similarBooks.length} similar books`);
                
                return {
                    success: true,
                    results: similarBooks,
                    originalBook: book,
                    query
                };
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('❌ Similar book search failed:', error);
            return this.handleSearchError({
                success: false,
                message: `Similar book search failed: ${error.message}`,
                error
            });
        }
    }

    // =============================================================================
    // DEBUGGING AND DEVELOPMENT HELPERS
    // =============================================================================

    /**
     * Development method to get debug information
     */
    getDebugInfo() {
        return {
            version: '10.4.0',
            initialized: !!this.containerElement,
            isSearching: this.isSearching,
            currentTab: this.stateManager.activeTab,
            expandedSections: Array.from(this.stateManager.expandedSections),
            criteria: this.stateManager.currentSearch.criteria,
            filters: this.stateManager.currentSearch.filters,
            resultsCount: this.currentResults.length,
            historyCount: this.historyManager.searchHistory.length,
            savedCount: this.historyManager.savedSearches.length,
            autoSaveActive: !!this.autoSaveTimeout,
            lastSavedState: this.storage.load('advanced_search_state')
        };
    }

    /**
     * Development method to simulate various states
     */
    simulateState(stateName) {
        switch (stateName) {
            case 'searching':
                this.setSearchingState(true);
                setTimeout(() => this.setSearchingState(false), 3000);
                break;
                
            case 'error':
                this.showSearchError('Simulated error for testing purposes');
                break;
                
            case 'results':
                this.currentResults = [
                    {
                        id: 'sim1',
                        title: 'Simulated Book 1',
                        authors: ['Test Author'],
                        description: 'A simulated book for testing'
                    }
                ];
                this.enableExportButton();
                this.updateProgressIndicator();
                break;
                
            default:
                console.warn(`Unknown simulation state: ${stateName}`);
        }
    }

    /**
     * Development method to validate component integrity
     */
    validateIntegrity() {
        const checks = {
            containerExists: !!this.containerElement,
            subComponentsInitialized: !!(this.stateManager && this.historyManager && this.uiRenderer),
            eventListenersAttached: !!this.handleFormSubmit,
            storageWorking: this.storage.isAvailable,
            apiAvailable: !!this.googleBooksAPI,
            modalManagerWorking: !!this.modalManager
        };
        
        const allPassed = Object.values(checks).every(Boolean);
        
        console.log('🔍 Component Integrity Check:', checks);
        console.log(`Overall Status: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
        
        return { passed: allPassed, checks };
    }
}

// =============================================================================
// EXPORT AND USAGE EXAMPLES
// =============================================================================

/**
 * Usage Example:
 * 
 * const searchInterface = new AdvancedSearchInterface(
 *     googleBooksAPI,
 *     storageManager,
 *     modalManager
 * );
 * 
 * // Initialize
 * await searchInterface.initialize('#search-container');
 * 
 * // Programmatic search
 * const results = await searchInterface.search({
 *     query: 'JavaScript programming'
 * });
 * 
 * // Get current state
 * const state = searchInterface.getCurrentState();
 * 
 * // Switch tabs
 * searchInterface.switchToTab('advanced');
 * 
 * // Clean up
 * searchInterface.destroy();
 */

export default AdvancedSearchInterface;