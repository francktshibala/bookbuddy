/**
 * AdvancedSearchInterface - Component 10.4 - FIXED VERSION
 * Simplified but functional implementation with proper error handling
 */
import SearchStateManager from './search/SearchStateManager.js';
import SearchHistoryManager from './search/SearchHistoryManager.js';
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
        this.autoComplete = new SearchAutoComplete();
        this.queryBuilder = new SearchQueryBuilder();
        this.exportManager = new SearchExportManager();
        
        // Bind methods to preserve context
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.handleTabSwitch = this.handleTabSwitch.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        
        console.log('🎛️ AdvancedSearchInterface initialized (FIXED VERSION)');
    }

    /**
     * Initialize the complete interface
     */
    async initialize(containerSelector) {
        try {
            console.log('🚀 Initializing AdvancedSearchInterface (FIXED)...');
            
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
     * Main UI structure generation
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
        
        console.log('🎨 Advanced search interface rendered (FIXED)');
    }

    /**
     * Setup event listeners
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
        const searchForm = DOMUtils.query('#advanced-search-form', this.containerElement);
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

        // Error close button
        const closeErrorBtn = DOMUtils.query('#close-error', this.containerElement);
        if (closeErrorBtn) {
            closeErrorBtn.addEventListener('click', () => this.hideSearchError());
        }

        console.log('🎯 All event listeners configured (FIXED)');
    }

    /**
     * Execute search with loading states
     */
    async performSearch() {
        if (this.isSearching) {
            console.log('⏳ Search already in progress, ignoring duplicate request');
            return { success: false, message: 'Search already in progress' };
        }

        try {
            console.log('🔍 Starting advanced search (FIXED)...');
            
            // Validate search criteria
            const validation = this.validateSearchCriteria();
            if (!validation.valid) {
                this.showSearchError(validation.message);
                return { success: false, message: validation.message };
            }

            // Set loading state
            this.setSearchingState(true);
            
            // Capture current form data
            this.captureCurrentFormData();
            
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
     * Process and display search results
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
            
            // Emit search completion event with proper data structure
            eventBus.emit('search:completed', {
                query: result.query || 'search query',
                totalResults: result.books.length,
                results: result.books,
                books: result.books, // Add this for compatibility
                source: result.source || 'Google Books',
                timestamp: new Date().toISOString()
            });
            
            // Save current state
            this.saveCurrentState();
            
            // Show success message
            this.showSearchSuccess(result.books.length, result.query || 'search');
            
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
     * Handle search errors
     */
    handleSearchError(errorResult) {
        console.error('🚨 Search error:', errorResult);
        
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
        
        return {
            success: false,
            message: userMessage,
            error: errorResult
        };
    }

    /**
     * Clear search functionality
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

    // === RENDERING METHODS ===

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
                            <button type="button" class="section-toggle" data-toggle="basic-search">
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
                            <button type="button" class="section-toggle" data-toggle="advanced-fields">
                                <span class="toggle-icon">${this.stateManager.expandedSections.has('advanced-fields') ? '▼' : '▶'}</span>
                            </button>
                        </div>
                    </div>
                    <div class="section-content ${this.stateManager.expandedSections.has('advanced-fields') ? 'expanded' : ''}">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="advanced-title">Title</label>
                                <input type="text" 
                                       id="advanced-title" 
                                       name="title"
                                       class="form-input"
                                       placeholder="e.g., Clean Code"
                                       value="${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.title || '')}"
                                       autocomplete="off">
                            </div>
                            <div class="form-group">
                                <label for="advanced-author">Author</label>
                                <input type="text" 
                                       id="advanced-author" 
                                       name="author"
                                       class="form-input"
                                       placeholder="e.g., Robert C. Martin"
                                       value="${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.author || '')}"
                                       autocomplete="off">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="advanced-subject">Subject/Category</label>
                                <input type="text" 
                                       id="advanced-subject" 
                                       name="subject"
                                       class="form-input"
                                       placeholder="e.g., Programming, Fiction"
                                       value="${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.subject || '')}"
                                       autocomplete="off">
                            </div>
                            <div class="form-group">
                                <label for="advanced-isbn">ISBN</label>
                                <input type="text" 
                                       id="advanced-isbn" 
                                       name="isbn"
                                       class="form-input"
                                       placeholder="e.g., 978-0-13-235088-4"
                                       value="${StringUtils.escapeHtml(this.stateManager.currentSearch.criteria.isbn || '')}">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

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
                            <button type="button" class="section-toggle" data-toggle="expert-query">
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
                            </div>
                        </div>
                    </div>
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
            'React development'
        ];

        return `
            <div class="quick-suggestions">
                <span class="suggestions-label">Popular searches:</span>
                <div class="suggestion-tags">
                    ${suggestions.map(suggestion => `
                        <button type="button" class="suggestion-tag" data-suggestion="${StringUtils.escapeHtml(suggestion)}">
                            ${StringUtils.escapeHtml(suggestion)}
                        </button>
                    `).join('')}
                </div>
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

    // === HELPER METHODS ===

    setupHeaderActionListeners() {
        const clearBtn = DOMUtils.query('#clear-search', this.containerElement);
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSearch());
        }

        const saveBtn = DOMUtils.query('#save-search', this.containerElement);
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.showSaveSearchDialog());
        }

        const tipsBtn = DOMUtils.query('#search-tips', this.containerElement);
        if (tipsBtn) {
            tipsBtn.addEventListener('click', () => this.showSearchTips());
        }

        const exportBtn = DOMUtils.query('#export-results', this.containerElement);
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResults());
        }

        const previewBtn = DOMUtils.query('#preview-query', this.containerElement);
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.showQueryPreview());
        }

        // Quick suggestion buttons
        const suggestionButtons = DOMUtils.queryAll('.suggestion-tag', this.containerElement);
        suggestionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const suggestion = e.target.dataset.suggestion;
                this.applySuggestion(suggestion);
            });
        });
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

    initializeAutoComplete() {
        // Basic search input
        const basicInput = DOMUtils.query('#basic-query', this.containerElement);
        if (basicInput) {
            this.autoComplete.setupAutoComplete(basicInput, (suggestion) => {
                this.handleAutoCompleteSuggestion('query', suggestion);
            });
        }

        console.log('🔤 Auto-complete initialized for search inputs');
    }

    validateSearchCriteria() {
        return this.queryBuilder.validateSearchCriteria(
            this.stateManager.currentSearch.criteria,
            this.stateManager.activeTab
        );
    }

    captureCurrentFormData() {
        const form = DOMUtils.query('#advanced-search-form', this.containerElement);
        if (!form) return;

        const formData = new FormData(form);
        const criteria = this.stateManager.currentSearch.criteria;

        // Capture criteria
        criteria.query = formData.get('query') || '';
        criteria.title = formData.get('title') || '';
        criteria.author = formData.get('author') || '';
        criteria.subject = formData.get('subject') || '';
        criteria.isbn = formData.get('isbn') || '';
        criteria.expertQuery = formData.get('expertQuery') || '';
    }

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
                this.stateManager.expandedSections = new Set(state.expandedSections || ['basic-search']);
                
                console.log('📂 Previous search state loaded');
            }
        } catch (error) {
            console.warn('⚠️ Could not load saved state:', error);
        }
    }

    saveCurrentState() {
        try {
            const currentState = {
                activeTab: this.stateManager.activeTab,
                criteria: { ...this.stateManager.currentSearch.criteria },
                expandedSections: Array.from(this.stateManager.expandedSections),
                lastSaved: new Date().toISOString()
            };

            const result = this.storage.save('advanced_search_state', currentState);
            
            if (result.success) {
                console.log('💾 Search state saved successfully');
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Error saving search state:', error);
            return { success: false, message: error.message };
        }
    }

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

    clearFormInputs() {
        const form = DOMUtils.query('#advanced-search-form', this.containerElement);
        if (form) {
            form.reset();
        }
    }

    setSearchingState(isSearching) {
        this.isSearching = isSearching;
        const searchBtn = DOMUtils.query('#perform-search', this.containerElement);
        const progressBar = DOMUtils.query('#search-progress', this.containerElement);
        
        if (searchBtn) {
            searchBtn.disabled = isSearching;
            const btnText = searchBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = isSearching ? 'Searching...' : 'Search Books';
            }
        }
        
        if (progressBar) {
            if (isSearching) {
                DOMUtils.addClass(progressBar, 'active');
            } else {
                DOMUtils.removeClass(progressBar, 'active');
            }
        }
        
        this.updateSearchStatus(isSearching ? 'Searching...' : 'Ready to search');
    }

    updateSearchStatus(message) {
        const statusElement = DOMUtils.query('#search-status', this.containerElement);
        if (statusElement) {
            statusElement.textContent = message;
        }
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

    // === EVENT HANDLERS ===

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

    showQueryPreview() {
        const query = this.queryBuilder.buildSearchQuery(
            this.stateManager.currentSearch.criteria,
            this.stateManager.activeTab
        );
        
        if (this.modalManager) {
            this.modalManager.showAlert('Query Preview', `Generated query: <code>${query || 'No query generated'}</code>`);
        } else {
            alert(`Generated query: ${query || 'No query generated'}`);
        }
    }

    showSearchTips() {
        const tipsContent = `
            <div class="search-tips">
                <h4>Basic Search Tips</h4>
                <ul>
                    <li>Use quotes for exact phrases: "machine learning"</li>
                    <li>Search by author name: Robert C. Martin</li>
                    <li>Include multiple keywords: JavaScript React tutorial</li>
                </ul>
                
                <h4>Advanced Search Features</h4>
                <ul>
                    <li>Fill in specific fields for targeted searches</li>
                    <li>Use ISBN for exact book matching</li>
                    <li>Combine multiple search criteria</li>
                </ul>
                
                <h4>Expert Query Examples</h4>
                <ul>
                    <li>intitle:"JavaScript" - Search within book titles</li>
                    <li>inauthor:"Martin Fowler" - Search by specific author</li>
                    <li>subject:"programming" - Search by subject category</li>
                </ul>
            </div>
        `;
        
        if (this.modalManager) {
            this.modalManager.showModal({
                title: '💡 Search Tips & Help',
                content: tipsContent,
                buttons: [
                    {
                        text: 'Got it!',
                        action: 'close',
                        className: 'btn-primary'
                    }
                ]
            });
        } else {
            alert('Search Tips: Use quotes for exact phrases, fill in specific fields for better results, and try the expert query tab for advanced searches.');
        }
    }

    showSaveSearchDialog() {
        if (this.modalManager) {
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
        } else {
            const name = prompt('Enter a name for this search:', 'My Search');
            if (name && name.trim()) {
                this.saveSearch(name.trim());
            }
        }
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
            if (this.modalManager) {
                this.modalManager.showAlert('Search Saved', `Search "${name}" has been saved successfully!`);
            } else {
                alert(`Search "${name}" has been saved successfully!`);
            }
        }
    }

    exportResults() {
        if (!this.currentResults || this.currentResults.length === 0) {
            if (this.modalManager) {
                this.modalManager.showAlert(
                    'No Results to Export',
                    'Please perform a search first to generate results for export.'
                );
            } else {
                alert('No Results to Export. Please perform a search first.');
            }
            return;
        }

        try {
            this.exportManager.exportResults(this.currentResults, 'json');
            
            if (this.modalManager) {
                this.modalManager.showAlert(
                    'Export Complete',
                    `Successfully exported ${this.currentResults.length} search results.`
                );
            } else {
                alert(`Successfully exported ${this.currentResults.length} search results.`);
            }
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            if (this.modalManager) {
                this.modalManager.showAlert(
                    'Export Failed',
                    `Failed to export results: ${error.message}`
                );
            } else {
                alert(`Failed to export results: ${error.message}`);
            }
        }
    }

    // === PUBLIC API METHODS ===

    getCurrentState() {
        return {
            activeTab: this.stateManager.activeTab,
            criteria: { ...this.stateManager.currentSearch.criteria },
            results: [...this.currentResults],
            isSearching: this.isSearching,
            expandedSections: Array.from(this.stateManager.expandedSections)
        };
    }

    setCriteria(criteria) {
        this.stateManager.updateCriteria(criteria);
        this.applyStateToUI();
        this.saveCurrentState();
    }

    switchToTab(tabId) {
        this.handleTabSwitch(tabId);
    }

    async search(criteria = null) {
        if (criteria) this.setCriteria(criteria);
        return await this.performSearch();
    }

    getResults() {
        return [...this.currentResults];
    }

    isReady() {
        return !!this.containerElement && !this.isSearching;
    }

    /**
     * Cleanup method
     */
    destroy() {
        try {
            console.log('🗑️ Destroying AdvancedSearchInterface...');
            
            // Save final state
            this.saveCurrentState();
            
            // Clear timers
            if (this.autoSaveTimeout) {
                clearTimeout(this.autoSaveTimeout);
            }
            
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
            
            // Emit destruction event
            eventBus.emit('search:interfaceDestroyed', {
                timestamp: new Date().toISOString()
            });
            
            console.log('✅ AdvancedSearchInterface destroyed successfully');
            
        } catch (error) {
            console.error('❌ Error during destruction:', error);
        }
    }
}