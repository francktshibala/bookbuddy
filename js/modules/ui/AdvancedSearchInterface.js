/**
 * AdvancedSearchInterface - Component 10.4 - COMPLETE IMPLEMENTATION
 * Provides advanced search form with multiple criteria, filters, history, and auto-complete
 */
import { DOMUtils, StringUtils, DateUtils, AsyncUtils } from '../../utils/Helpers.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';

export default class AdvancedSearchInterface {
    constructor(googleBooksAPI, openLibraryAPI = null) {
        this.googleBooksAPI = googleBooksAPI;
        this.openLibraryAPI = openLibraryAPI;
        this.containerElement = null;
        this.isVisible = false;
        
        // Search configuration
        this.searchConfig = {
            maxSuggestions: 8,
            debounceDelay: 300,
            maxHistoryItems: 50,
            autoCompleteMinLength: 2,
            exportFormats: ['json', 'csv', 'txt']
        };
        
        // Search state
        this.currentSearch = {
            criteria: this.getDefaultCriteria(),
            filters: this.getDefaultFilters(),
            results: [],
            isSearching: false,
            lastSearchTime: null
        };
        
        // Search history and suggestions
        this.searchHistory = this.loadSearchHistory();
        this.savedSearches = this.loadSavedSearches();
        this.suggestionCache = new Map();
        
        // UI state
        this.activeTab = 'basic'; // 'basic', 'advanced', 'expert'
        this.expandedSections = new Set(['basic-search']);
        
        this.setupEventListeners();
        console.log('🎛️ AdvancedSearchInterface initialized');
    }

    /**
     * Initialize the advanced search interface
     */
    async initialize(containerSelector) {
        const container = DOMUtils.query(containerSelector);
        if (!container) {
            throw new Error(`Container not found: ${containerSelector}`);
        }
        
        this.containerElement = container;
        this.render();
        this.setupFormEventListeners();
        this.loadAutoCompleteSuggestions();
        
        console.log('🎛️ AdvancedSearchInterface initialized in', containerSelector);
    }

    /**
     * Get default search criteria
     */
    getDefaultCriteria() {
        return {
            query: '',
            title: '',
            author: '',
            subject: '',
            isbn: '',
            publisher: '',
            keywords: '',
            expertQuery: ''
        };
    }

    /**
     * Get default filters
     */
    getDefaultFilters() {
        return {
            language: 'all',
            yearFrom: null,
            yearTo: null,
            printType: '',
            orderBy: 'relevance',
            maxResults: 20,
            previewAvailable: false,
            freeEbooks: false
        };
    }

    /**
     * Render the complete advanced search interface
     */
    render() {
        if (!this.containerElement) return;
        
        const html = `
            <div class="advanced-search-interface">
                ${this.renderSearchHeader()}
                ${this.renderSearchTabs()}
                ${this.renderSearchForm()}
                ${this.renderSearchActions()}
                ${this.renderSearchHistory()}
                ${this.renderSavedSearches()}
            </div>
        `;
        
        this.containerElement.innerHTML = html;
        this.applySearchState();
    }

    /**
     * Render search header with title and controls
     */
    renderSearchHeader() {
        return `
            <div class="search-header">
                <div class="search-title-section">
                    <h3 class="search-title">
                        <span class="search-icon">🔍</span>
                        Advanced Book Search
                    </h3>
                    <p class="search-subtitle">
                        Find books across multiple sources with powerful search criteria
                    </p>
                </div>
                
                <div class="search-header-actions">
                    <button class="btn btn-sm btn-outline" id="clear-search" title="Clear all criteria">
                        <span class="btn-icon">🧹</span>
                        Clear All
                    </button>
                    <button class="btn btn-sm btn-outline" id="save-search" title="Save current search">
                        <span class="btn-icon">💾</span>
                        Save Search
                    </button>
                    <button class="btn btn-sm btn-outline" id="export-results" title="Export search results" disabled>
                        <span class="btn-icon">📤</span>
                        Export
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render search mode tabs
     */
    renderSearchTabs() {
        const tabs = [
            { id: 'basic', label: 'Basic Search', icon: '🔍' },
            { id: 'advanced', label: 'Advanced Search', icon: '🎯' },
            { id: 'expert', label: 'Expert Query', icon: '⚡' }
        ];
        
        return `
            <div class="search-tabs">
                <div class="tab-buttons">
                    ${tabs.map(tab => `
                        <button class="tab-btn ${this.activeTab === tab.id ? 'active' : ''}" 
                                data-tab="${tab.id}">
                            <span class="tab-icon">${tab.icon}</span>
                            <span class="tab-label">${tab.label}</span>
                        </button>
                    `).join('')}
                </div>
                
                <div class="tab-indicator">
                    <div class="search-progress">
                        <div class="progress-text">
                            ${this.currentSearch.isSearching ? 'Searching...' : 'Ready to search'}
                        </div>
                        <div class="progress-bar ${this.currentSearch.isSearching ? 'active' : ''}">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render the main search form
     */
    renderSearchForm() {
        return `
            <form class="search-form" id="advanced-search-form">
                <div class="tab-content">
                    <div class="tab-panel ${this.activeTab === 'basic' ? 'active' : ''}" data-tab="basic">
                        ${this.renderBasicSearchPanel()}
                    </div>
                    <div class="tab-panel ${this.activeTab === 'advanced' ? 'active' : ''}" data-tab="advanced">
                        ${this.renderAdvancedSearchPanel()}
                    </div>
                    <div class="tab-panel ${this.activeTab === 'expert' ? 'active' : ''}" data-tab="expert">
                        ${this.renderExpertSearchPanel()}
                    </div>
                </div>
                
                ${this.renderSearchFilters()}
            </form>
        `;
    }

    /**
     * Render basic search panel
     */
    renderBasicSearchPanel() {
        return `
            <div class="search-panel basic-search-panel">
                <div class="search-section" data-section="basic-search">
                    <div class="section-header">
                        <h4 class="section-title">
                            <span class="section-icon">📝</span>
                            Quick Search
                        </h4>
                        <button type="button" class="section-toggle" data-section="basic-search">
                            <span class="toggle-icon">${this.expandedSections.has('basic-search') ? '−' : '+'}</span>
                        </button>
                    </div>
                    
                    <div class="section-content ${this.expandedSections.has('basic-search') ? 'expanded' : ''}">
                        <div class="form-group">
                            <label for="basic-query">Search for books, authors, or topics</label>
                            <div class="input-with-suggestions">
                                <input type="text" 
                                       id="basic-query" 
                                       class="form-input search-input"
                                       placeholder="e.g., 'JavaScript programming', 'Agatha Christie', 'science fiction'"
                                       value="${this.currentSearch.criteria.query || ''}"
                                       autocomplete="off">
                                <div class="suggestions-dropdown" id="basic-suggestions"></div>
                            </div>
                        </div>
                        
                        <div class="quick-suggestions">
                            <span class="suggestions-label">Popular searches:</span>
                            <div class="suggestion-tags">
                                ${this.getPopularSearches().map(search => `
                                    <button type="button" class="suggestion-tag" data-suggestion="${search}">
                                        ${search}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render advanced search panel
     */
    renderAdvancedSearchPanel() {
        return `
            <div class="search-panel advanced-search-panel">
                <div class="search-section" data-section="field-search">
                    <div class="section-header">
                        <h4 class="section-title">
                            <span class="section-icon">🎯</span>
                            Field-Specific Search
                        </h4>
                        <button type="button" class="section-toggle" data-section="field-search">
                            <span class="toggle-icon">${this.expandedSections.has('field-search') ? '−' : '+'}</span>
                        </button>
                    </div>
                    
                    <div class="section-content ${this.expandedSections.has('field-search') ? 'expanded' : ''}">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="title-field">Title</label>
                                <div class="input-with-suggestions">
                                    <input type="text" 
                                           id="title-field" 
                                           class="form-input search-input"
                                           placeholder="Book title"
                                           value="${this.currentSearch.criteria.title || ''}"
                                           data-field="title">
                                    <div class="suggestions-dropdown" id="title-suggestions"></div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="author-field">Author</label>
                                <div class="input-with-suggestions">
                                    <input type="text" 
                                           id="author-field" 
                                           class="form-input search-input"
                                           placeholder="Author name"
                                           value="${this.currentSearch.criteria.author || ''}"
                                           data-field="author">
                                    <div class="suggestions-dropdown" id="author-suggestions"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="subject-field">Subject/Genre</label>
                                <div class="input-with-suggestions">
                                    <input type="text" 
                                           id="subject-field" 
                                           class="form-input search-input"
                                           placeholder="e.g., fiction, programming, history"
                                           value="${this.currentSearch.criteria.subject || ''}"
                                           data-field="subject">
                                    <div class="suggestions-dropdown" id="subject-suggestions"></div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="isbn-field">ISBN</label>
                                <input type="text" 
                                       id="isbn-field" 
                                       class="form-input"
                                       placeholder="978-0-123456-78-9"
                                       value="${this.currentSearch.criteria.isbn || ''}"
                                       pattern="[0-9\\-X]{10,17}">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="publisher-field">Publisher</label>
                                <div class="input-with-suggestions">
                                    <input type="text" 
                                           id="publisher-field" 
                                           class="form-input search-input"
                                           placeholder="Publisher name"
                                           value="${this.currentSearch.criteria.publisher || ''}"
                                           data-field="publisher">
                                    <div class="suggestions-dropdown" id="publisher-suggestions"></div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="keywords-field">Keywords</label>
                                <input type="text" 
                                       id="keywords-field" 
                                       class="form-input"
                                       placeholder="Additional keywords"
                                       value="${this.currentSearch.criteria.keywords || ''}">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render expert search panel
     */
    renderExpertSearchPanel() {
        return `
            <div class="search-panel expert-search-panel">
                <div class="search-section" data-section="expert-query">
                    <div class="section-header">
                        <h4 class="section-title">
                            <span class="section-icon">⚡</span>
                            Expert Query Builder
                        </h4>
                        <button type="button" class="section-toggle" data-section="expert-query">
                            <span class="toggle-icon">${this.expandedSections.has('expert-query') ? '−' : '+'}</span>
                        </button>
                    </div>
                    
                    <div class="section-content ${this.expandedSections.has('expert-query') ? 'expanded' : ''}">
                        <div class="form-group">
                            <label for="expert-query">Custom Search Query</label>
                            <textarea id="expert-query" 
                                      class="form-textarea expert-textarea"
                                      placeholder="Enter advanced search syntax, e.g.:
intitle:&quot;JavaScript&quot; inauthor:&quot;Douglas Crockford&quot; subject:programming"
                                      rows="4">${this.currentSearch.criteria.expertQuery || ''}</textarea>
                            <div class="field-help">
                                <strong>Query Syntax:</strong>
                                <code>intitle:"title"</code> • <code>inauthor:"author"</code> • 
                                <code>subject:"topic"</code> • <code>isbn:1234567890</code> • 
                                <code>inpublisher:"publisher"</code>
                            </div>
                        </div>
                        
                        <div class="query-builder">
                            <div class="builder-header">
                                <span class="builder-title">Query Builder</span>
                                <button type="button" class="btn btn-sm btn-outline" id="build-query">
                                    <span class="btn-icon">🔧</span>
                                    Build Query
                                </button>
                            </div>
                            
                            <div class="query-parts" id="query-parts">
                                <!-- Dynamic query parts will be inserted here -->
                            </div>
                            
                            <div class="query-preview">
                                <label>Generated Query:</label>
                                <code id="generated-query" class="query-code"></code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render search filters section
     */
    renderSearchFilters() {
        return `
            <div class="search-section" data-section="filters">
                <div class="section-header">
                    <h4 class="section-title">
                        <span class="section-icon">🔧</span>
                        Search Filters
                    </h4>
                    <button type="button" class="section-toggle" data-section="filters">
                        <span class="toggle-icon">${this.expandedSections.has('filters') ? '−' : '+'}</span>
                    </button>
                </div>
                
                <div class="section-content ${this.expandedSections.has('filters') ? 'expanded' : ''}">
                    <div class="filters-grid">
                        <div class="filter-group">
                            <label for="language-filter">Language</label>
                            <select id="language-filter" class="form-select">
                                <option value="">Any Language</option>
                                <option value="en" ${this.currentSearch.filters.language === 'en' ? 'selected' : ''}>English</option>
                                <option value="es" ${this.currentSearch.filters.language === 'es' ? 'selected' : ''}>Spanish</option>
                                <option value="fr" ${this.currentSearch.filters.language === 'fr' ? 'selected' : ''}>French</option>
                                <option value="de" ${this.currentSearch.filters.language === 'de' ? 'selected' : ''}>German</option>
                                <option value="it" ${this.currentSearch.filters.language === 'it' ? 'selected' : ''}>Italian</option>
                                <option value="pt" ${this.currentSearch.filters.language === 'pt' ? 'selected' : ''}>Portuguese</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="year-from">Published Year</label>
                            <div class="year-range">
                                <input type="number" 
                                       id="year-from" 
                                       class="form-input year-input"
                                       placeholder="From"
                                       min="1400" 
                                       max="${new Date().getFullYear()}"
                                       value="${this.currentSearch.filters.yearFrom || ''}">
                                <span class="range-separator">to</span>
                                <input type="number" 
                                       id="year-to" 
                                       class="form-input year-input"
                                       placeholder="To"
                                       min="1400" 
                                       max="${new Date().getFullYear()}"
                                       value="${this.currentSearch.filters.yearTo || ''}">
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label for="print-type">Content Type</label>
                            <select id="print-type" class="form-select">
                                <option value="" ${!this.currentSearch.filters.printType ? 'selected' : ''}>All Content</option>
                                <option value="books" ${this.currentSearch.filters.printType === 'books' ? 'selected' : ''}>Books Only</option>
                                <option value="magazines" ${this.currentSearch.filters.printType === 'magazines' ? 'selected' : ''}>Magazines Only</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="sort-order">Sort Results</label>
                            <select id="sort-order" class="form-select">
                                <option value="relevance" ${this.currentSearch.filters.orderBy === 'relevance' ? 'selected' : ''}>Most Relevant</option>
                                <option value="newest" ${this.currentSearch.filters.orderBy === 'newest' ? 'selected' : ''}>Newest First</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="max-results">Results Limit</label>
                            <select id="max-results" class="form-select">
                                <option value="10" ${this.currentSearch.filters.maxResults === 10 ? 'selected' : ''}>10 results</option>
                                <option value="20" ${this.currentSearch.filters.maxResults === 20 ? 'selected' : ''}>20 results</option>
                                <option value="40" ${this.currentSearch.filters.maxResults === 40 ? 'selected' : ''}>40 results</option>
                            </select>
                        </div>
                        
                        <div class="filter-group checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" 
                                       id="preview-available"
                                       ${this.currentSearch.filters.previewAvailable ? 'checked' : ''}>
                                <span class="checkbox-text">Preview Available</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" 
                                       id="free-ebooks"
                                       ${this.currentSearch.filters.freeEbooks ? 'checked' : ''}>
                                <span class="checkbox-text">Free eBooks Only</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render search action buttons
     */
    renderSearchActions() {
        return `
            <div class="search-actions">
                <div class="primary-actions">
                    <button type="submit" 
                            class="btn btn-primary btn-lg search-btn" 
                            id="perform-search"
                            ${this.currentSearch.isSearching ? 'disabled' : ''}>
                        <span class="btn-icon">${this.currentSearch.isSearching ? '⏳' : '🔍'}</span>
                        <span class="btn-text">${this.currentSearch.isSearching ? 'Searching...' : 'Search Books'}</span>
                    </button>
                    
                    <button type="button" 
                            class="btn btn-outline btn-lg" 
                            id="search-preview"
                            ${this.currentSearch.isSearching ? 'disabled' : ''}>
                        <span class="btn-icon">👁️</span>
                        <span class="btn-text">Preview Query</span>
                    </button>
                </div>
                
                <div class="secondary-actions">
                    <button type="button" class="btn btn-sm btn-outline" id="load-search">
                        <span class="btn-icon">📂</span>
                        Load Saved
                    </button>
                    <button type="button" class="btn btn-sm btn-outline" id="search-tips">
                        <span class="btn-icon">💡</span>
                        Search Tips
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render search history section
     */
    renderSearchHistory() {
        const recentSearches = this.searchHistory.slice(0, 5);
        
        return `
            <div class="search-section search-history-section" data-section="history">
                <div class="section-header">
                    <h4 class="section-title">
                        <span class="section-icon">🕒</span>
                        Recent Searches
                        <span class="history-count">${this.searchHistory.length}</span>
                    </h4>
                    <div class="section-actions">
                        <button type="button" class="btn btn-xs btn-outline" id="clear-history">
                            Clear History
                        </button>
                        <button type="button" class="section-toggle" data-section="history">
                            <span class="toggle-icon">${this.expandedSections.has('history') ? '−' : '+'}</span>
                        </button>
                    </div>
                </div>
                
                <div class="section-content ${this.expandedSections.has('history') ? 'expanded' : ''}">
                    ${recentSearches.length > 0 ? `
                        <div class="history-list">
                            ${recentSearches.map(search => `
                                <div class="history-item" data-search-id="${search.id}">
                                    <div class="history-main">
                                        <div class="history-query">${StringUtils.escapeHtml(search.displayQuery)}</div>
                                        <div class="history-meta">
                                            <span class="history-time">${DateUtils.getRelativeTime(search.timestamp)}</span>
                                            <span class="history-results">${search.resultsCount} results</span>
                                        </div>
                                    </div>
                                    <div class="history-actions">
                                        <button class="btn btn-xs btn-outline history-load" title="Load this search">
                                            <span class="btn-icon">📂</span>
                                        </button>
                                        <button class="btn btn-xs btn-outline history-delete" title="Remove from history">
                                            <span class="btn-icon">🗑️</span>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        ${this.searchHistory.length > 5 ? `
                            <div class="history-footer">
                                <button class="btn btn-sm btn-outline" id="view-all-history">
                                    View All History (${this.searchHistory.length})
                                </button>
                            </div>
                        ` : ''}
                    ` : `
                        <div class="empty-history">
                            <div class="empty-icon">🕒</div>
                            <div class="empty-text">No recent searches</div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * Render saved searches section
     */
    renderSavedSearches() {
        return `
            <div class="search-section saved-searches-section" data-section="saved">
                <div class="section-header">
                    <h4 class="section-title">
                        <span class="section-icon">💾</span>
                        Saved Searches
                        <span class="saved-count">${this.savedSearches.length}</span>
                    </h4>
                    <button type="button" class="section-toggle" data-section="saved">
                        <span class="toggle-icon">${this.expandedSections.has('saved') ? '−' : '+'}</span>
                    </button>
                </div>
                
                <div class="section-content ${this.expandedSections.has('saved') ? 'expanded' : ''}">
                    ${this.savedSearches.length > 0 ? `
                        <div class="saved-list">
                            ${this.savedSearches.map(search => `
                                <div class="saved-item" data-search-id="${search.id}">
                                    <div class="saved-main">
                                        <div class="saved-name">${StringUtils.escapeHtml(search.name)}</div>
                                        <div class="saved-query">${StringUtils.escapeHtml(search.displayQuery)}</div>
                                        <div class="saved-meta">
                                            Saved ${DateUtils.getRelativeTime(search.savedAt)}
                                        </div>
                                    </div>
                                    <div class="saved-actions">
                                        <button class="btn btn-xs btn-primary saved-load" title="Load this search">
                                            <span class="btn-icon">📂</span>
                                        </button>
                                        <button class="btn btn-xs btn-outline saved-edit" title="Edit search name">
                                            <span class="btn-icon">✏️</span>
                                        </button>
                                        <button class="btn btn-xs btn-outline saved-delete" title="Delete saved search">
                                            <span class="btn-icon">🗑️</span>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-saved">
                            <div class="empty-icon">💾</div>
                            <div class="empty-text">No saved searches</div>
                            <div class="empty-help">Use "Save Search" to save your current criteria</div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for the interface
     */
    setupEventListeners() {
        // Listen for search events
        eventBus.on('search:performed', (data) => {
            this.handleSearchPerformed(data);
        });

        eventBus.on('search:resultsUpdated', (data) => {
            this.currentSearch.results = data.results || [];
            this.updateExportButton();
        });
    }

    /**
     * Setup form-specific event listeners
     */
    setupFormEventListeners() {
        if (!this.containerElement) return;

        // Tab switching
        const tabButtons = DOMUtils.queryAll('.tab-btn', this.containerElement);
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });

        // Section toggles
        const sectionToggles = DOMUtils.queryAll('.section-toggle', this.containerElement);
        sectionToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                this.toggleSection(toggle.dataset.section);
            });
        });

        // Form submission
        const form = DOMUtils.query('#advanced-search-form', this.containerElement);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }

        // Auto-complete for search inputs
        this.setupAutoComplete();

        // Header action buttons
        this.setupHeaderActions();

        // Search action buttons
        this.setupSearchActions();

        // History and saved search actions
        this.setupHistoryActions();

        // Filter change handlers
        this.setupFilterHandlers();

        // Query builder
        this.setupQueryBuilder();

        // Suggestion tags
        this.setupSuggestionTags();
    }

    /**
     * Setup auto-complete functionality
     */
    setupAutoComplete() {
        const searchInputs = DOMUtils.queryAll('.search-input', this.containerElement);
        
        searchInputs.forEach(input => {
            let debounceTimer;
            
            input.addEventListener('blur', (e) => {
                // Delay hiding to allow clicking on suggestions
                setTimeout(() => this.hideSuggestions(e.target), 200);
            });

            input.addEventListener('keydown', (e) => {
                this.handleInputKeydown(e);
            });
        });
    }

    /**
     * Handle auto-complete suggestions
     */
    async handleAutoComplete(input) {
        const query = input.value.trim();
        const field = input.dataset.field || 'query';
        
        if (query.length < this.searchConfig.autoCompleteMinLength) {
            this.hideSuggestions(input);
            return;
        }

        try {
            const suggestions = await this.getSuggestions(query, field);
            this.showSuggestionDropdown(input, suggestions);
        } catch (error) {
            console.error('Auto-complete error:', error);
        }
    }

    /**
     * Get suggestions for a query and field
     */
    async getSuggestions(query, field) {
        const cacheKey = `${field}:${query}`;
        
        // Check cache first
        if (this.suggestionCache.has(cacheKey)) {
            return this.suggestionCache.get(cacheKey);
        }

        const suggestions = [];

        // Add suggestions from search history
        const historySuggestions = this.getHistorySuggestions(query, field);
        suggestions.push(...historySuggestions);

        // Add popular suggestions
        const popularSuggestions = this.getPopularSuggestions(query, field);
        suggestions.push(...popularSuggestions);

        // Limit and cache results
        const limitedSuggestions = suggestions.slice(0, this.searchConfig.maxSuggestions);
        this.suggestionCache.set(cacheKey, limitedSuggestions);

        return limitedSuggestions;
    }

    /**
     * Show suggestion dropdown
     */
    showSuggestionDropdown(input, suggestions) {
        const dropdown = this.getSuggestionDropdown(input);
        if (!dropdown) return;

        if (suggestions.length === 0) {
            dropdown.classList.remove('show');
            return;
        }

        dropdown.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" data-suggestion="${StringUtils.escapeHtml(suggestion.text)}">
                <span class="suggestion-text">${StringUtils.escapeHtml(suggestion.text)}</span>
                <span class="suggestion-source">${suggestion.source}</span>
            </div>
        `).join('');

        // Setup click handlers
        const items = DOMUtils.queryAll('.suggestion-item', dropdown);
        items.forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.suggestion;
                this.hideSuggestions(input);
            });
        });

        dropdown.classList.add('show');
    }

    /**
     * Get suggestion dropdown for input
     */
    getSuggestionDropdown(input) {
        const container = input.closest('.input-with-suggestions');
        return container ? DOMUtils.query('.suggestions-dropdown', container) : null;
    }

    /**
     * Hide suggestions for input
     */
    hideSuggestions(input) {
        const dropdown = this.getSuggestionDropdown(input);
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    /**
     * Show existing suggestions
     */
    showSuggestions(input) {
        if (input.value.length >= this.searchConfig.autoCompleteMinLength) {
            this.handleAutoComplete(input);
        }
    }

    /**
     * Handle keyboard navigation in inputs
     */
    handleInputKeydown(e) {
        const dropdown = this.getSuggestionDropdown(e.target);
        if (!dropdown || !dropdown.classList.contains('show')) return;

        const items = DOMUtils.queryAll('.suggestion-item', dropdown);
        const activeItem = DOMUtils.query('.suggestion-item.active', dropdown);
        let activeIndex = activeItem ? Array.from(items).indexOf(activeItem) : -1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                this.setActiveSuggestion(items, activeIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                this.setActiveSuggestion(items, activeIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (activeItem) {
                    e.target.value = activeItem.dataset.suggestion;
                    this.hideSuggestions(e.target);
                }
                break;
            case 'Escape':
                this.hideSuggestions(e.target);
                break;
        }
    }

    /**
     * Set active suggestion item
     */
    setActiveSuggestion(items, activeIndex) {
        items.forEach((item, index) => {
            if (index === activeIndex) {
                DOMUtils.addClass(item, 'active');
            } else {
                DOMUtils.removeClass(item, 'active');
            }
        });
    }

    /**
     * Setup header action buttons
     */
    setupHeaderActions() {
        const clearBtn = DOMUtils.query('#clear-search', this.containerElement);
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSearch());
        }

        const saveBtn = DOMUtils.query('#save-search', this.containerElement);
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCurrentSearch());
        }

        const exportBtn = DOMUtils.query('#export-results', this.containerElement);
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResults());
        }
    }

    /**
     * Setup search action buttons
     */
    setupSearchActions() {
        const searchBtn = DOMUtils.query('#perform-search', this.containerElement);
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }

        const previewBtn = DOMUtils.query('#search-preview', this.containerElement);
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewQuery());
        }

        const loadBtn = DOMUtils.query('#load-search', this.containerElement);
        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.showLoadSearchDialog());
        }

        const tipsBtn = DOMUtils.query('#search-tips', this.containerElement);
        if (tipsBtn) {
            tipsBtn.addEventListener('click', () => this.showSearchTips());
        }
    }

    /**
     * Setup history and saved search actions
     */
    setupHistoryActions() {
        // History actions
        const historyLoadBtns = DOMUtils.queryAll('.history-load', this.containerElement);
        historyLoadBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const searchId = e.target.closest('.history-item').dataset.searchId;
                this.loadHistorySearch(searchId);
            });
        });

        const historyDeleteBtns = DOMUtils.queryAll('.history-delete', this.containerElement);
        historyDeleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const searchId = e.target.closest('.history-item').dataset.searchId;
                this.deleteHistorySearch(searchId);
            });
        });

        // Saved search actions
        const savedLoadBtns = DOMUtils.queryAll('.saved-load', this.containerElement);
        savedLoadBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const searchId = e.target.closest('.saved-item').dataset.searchId;
                this.loadSavedSearch(searchId);
            });
        });

        const savedDeleteBtns = DOMUtils.queryAll('.saved-delete', this.containerElement);
        savedDeleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const searchId = e.target.closest('.saved-item').dataset.searchId;
                this.deleteSavedSearch(searchId);
            });
        });

        // Clear history
        const clearHistoryBtn = DOMUtils.query('#clear-history', this.containerElement);
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => this.clearSearchHistory());
        }
    }

    /**
     * Setup filter change handlers
     */
    setupFilterHandlers() {
        const filterInputs = DOMUtils.queryAll('#language-filter, #year-from, #year-to, #print-type, #sort-order, #max-results, #preview-available, #free-ebooks', this.containerElement);
        
        filterInputs.forEach(input => {
            const eventType = input.type === 'checkbox' ? 'change' : 'input';
            input.addEventListener(eventType, () => {
                this.updateFiltersFromForm();
            });
        });
    }

    /**
     * Setup query builder
     */
    setupQueryBuilder() {
        const buildBtn = DOMUtils.query('#build-query', this.containerElement);
        if (buildBtn) {
            buildBtn.addEventListener('click', () => this.buildQueryFromFields());
        }
    }

    /**
     * Setup suggestion tags
     */
    setupSuggestionTags() {
        const suggestionTags = DOMUtils.queryAll('.suggestion-tag', this.containerElement);
        suggestionTags.forEach(tag => {
            tag.addEventListener('click', () => {
                const suggestion = tag.dataset.suggestion;
                const basicQueryInput = DOMUtils.query('#basic-query', this.containerElement);
                if (basicQueryInput) {
                    basicQueryInput.value = suggestion;
                }
            });
        });
    }

    /**
     * Switch active tab
     */
    switchTab(tabId) {
        if (this.activeTab === tabId) return;

        this.activeTab = tabId;

        // Update tab buttons
        const tabButtons = DOMUtils.queryAll('.tab-btn', this.containerElement);
        tabButtons.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                DOMUtils.addClass(btn, 'active');
            } else {
                DOMUtils.removeClass(btn, 'active');
            }
        });

        // Update tab panels
        const tabPanels = DOMUtils.queryAll('.tab-panel', this.containerElement);
        tabPanels.forEach(panel => {
            if (panel.dataset.tab === tabId) {
                DOMUtils.addClass(panel, 'active');
            } else {
                DOMUtils.removeClass(panel, 'active');
            }
        });
    }

    /**
     * Toggle section expansion
     */
    toggleSection(sectionId) {
        const section = DOMUtils.query(`[data-section="${sectionId}"]`, this.containerElement);
        if (!section) return;

        const content = DOMUtils.query('.section-content', section);
        const toggle = DOMUtils.query('.section-toggle', section);
        const icon = DOMUtils.query('.toggle-icon', toggle);

        if (this.expandedSections.has(sectionId)) {
            this.expandedSections.delete(sectionId);
            DOMUtils.removeClass(content, 'expanded');
            icon.textContent = '+';
        } else {
            this.expandedSections.add(sectionId);
            DOMUtils.addClass(content, 'expanded');
            icon.textContent = '−';
        }
    }

    /**
     * Perform search with current criteria
     */
    async performSearch() {
        if (this.currentSearch.isSearching) return;

        this.updateCriteriaFromForm();
        this.updateFiltersFromForm();

        // Validate search criteria
        const validation = this.validateSearchCriteria();
        if (!validation.valid) {
            this.showError(validation.message);
            return;
        }

        this.currentSearch.isSearching = true;
        this.updateSearchState();

        try {
            const query = this.buildSearchQuery();
            const options = this.buildSearchOptions();

            console.log('🔍 Performing advanced search:', query, options);

            let results;
            if (this.activeTab === 'expert' && this.currentSearch.criteria.expertQuery) {
                // Use expert query directly
                results = await this.googleBooksAPI.searchBooks(this.currentSearch.criteria.expertQuery, options);
            } else {
                // Use built query
                results = await this.googleBooksAPI.searchBooks(query, options);
            }

            this.currentSearch.results = results.books || [];
            this.currentSearch.lastSearchTime = new Date().toISOString();

            // Add to search history
            this.addToSearchHistory(query, results);

            // Emit search performed event
            eventBus.emit('search:performed', {
                query,
                options,
                results,
                source: 'advanced-search'
            });

            console.log(`✅ Advanced search completed: ${this.currentSearch.results.length} results`);

        } catch (error) {
            console.error('❌ Advanced search failed:', error);
            this.showError(`Search failed: ${error.message}`);
        } finally {
            this.currentSearch.isSearching = false;
            this.updateSearchState();
        }
    }

    /**
     * Build search query from current criteria
     */
    buildSearchQuery() {
        const criteria = this.currentSearch.criteria;
        const queryParts = [];

        if (this.activeTab === 'basic' && criteria.query) {
            return criteria.query;
        }

        if (criteria.title) {
            queryParts.push(`intitle:"${criteria.title}"`);
        }

        if (criteria.author) {
            queryParts.push(`inauthor:"${criteria.author}"`);
        }

        if (criteria.subject) {
            queryParts.push(`subject:"${criteria.subject}"`);
        }

        if (criteria.isbn) {
            queryParts.push(`isbn:${criteria.isbn.replace(/[-\s]/g, '')}`);
        }

        if (criteria.publisher) {
            queryParts.push(`inpublisher:"${criteria.publisher}"`);
        }

        if (criteria.keywords) {
            queryParts.push(criteria.keywords);
        }

        return queryParts.length > 0 ? queryParts.join(' ') : criteria.query || '';
    }

    /**
     * Build search options from current filters
     */
    buildSearchOptions() {
        const filters = this.currentSearch.filters;
        const options = {};

        if (filters.maxResults) {
            options.maxResults = parseInt(filters.maxResults);
        }

        if (filters.orderBy) {
            options.orderBy = filters.orderBy;
        }

        if (filters.printType) {
            options.printType = filters.printType;
        }

        if (filters.language && filters.language !== 'all') {
            options.langRestrict = filters.language;
        }

        return options;
    }

    /**
     * Validate search criteria
     */
    validateSearchCriteria() {
        const criteria = this.currentSearch.criteria;
        
        if (this.activeTab === 'expert') {
            if (!criteria.expertQuery || criteria.expertQuery.trim().length === 0) {
                return { valid: false, message: 'Expert query is required' };
            }
        } else {
            const hasBasicQuery = criteria.query && criteria.query.trim().length > 0;
            const hasAdvancedFields = criteria.title || criteria.author || criteria.subject || 
                                     criteria.isbn || criteria.publisher || criteria.keywords;
            
            if (!hasBasicQuery && !hasAdvancedFields) {
                return { valid: false, message: 'Please enter search criteria' };
            }
        }

        return { valid: true };
    }

    /**
     * Update criteria from form inputs
     */
    updateCriteriaFromForm() {
        if (!this.containerElement) return;

        this.currentSearch.criteria = {
            query: DOMUtils.query('#basic-query', this.containerElement)?.value || '',
            title: DOMUtils.query('#title-field', this.containerElement)?.value || '',
            author: DOMUtils.query('#author-field', this.containerElement)?.value || '',
            subject: DOMUtils.query('#subject-field', this.containerElement)?.value || '',
            isbn: DOMUtils.query('#isbn-field', this.containerElement)?.value || '',
            publisher: DOMUtils.query('#publisher-field', this.containerElement)?.value || '',
            keywords: DOMUtils.query('#keywords-field', this.containerElement)?.value || '',
            expertQuery: DOMUtils.query('#expert-query', this.containerElement)?.value || ''
        };
    }

    /**
     * Update filters from form inputs
     */
    updateFiltersFromForm() {
        if (!this.containerElement) return;

        this.currentSearch.filters = {
            language: DOMUtils.query('#language-filter', this.containerElement)?.value || 'all',
            yearFrom: parseInt(DOMUtils.query('#year-from', this.containerElement)?.value) || null,
            yearTo: parseInt(DOMUtils.query('#year-to', this.containerElement)?.value) || null,
            printType: DOMUtils.query('#print-type', this.containerElement)?.value || '',
            orderBy: DOMUtils.query('#sort-order', this.containerElement)?.value || 'relevance',
            maxResults: parseInt(DOMUtils.query('#max-results', this.containerElement)?.value) || 20,
            previewAvailable: DOMUtils.query('#preview-available', this.containerElement)?.checked || false,
            freeEbooks: DOMUtils.query('#free-ebooks', this.containerElement)?.checked || false
        };
    }

    /**
     * Apply current search state to form
     */
    applySearchState() {
        if (!this.containerElement) return;

        // Apply criteria
        const basicQuery = DOMUtils.query('#basic-query', this.containerElement);
        if (basicQuery) basicQuery.value = this.currentSearch.criteria.query || '';

        const titleField = DOMUtils.query('#title-field', this.containerElement);
        if (titleField) titleField.value = this.currentSearch.criteria.title || '';

        // Apply filters
        const languageFilter = DOMUtils.query('#language-filter', this.containerElement);
        if (languageFilter) languageFilter.value = this.currentSearch.filters.language || 'all';

        // Update search state UI
        this.updateSearchState();
    }

    /**
     * Update search state in UI
     */
    updateSearchState() {
        const progressBar = DOMUtils.query('.progress-bar', this.containerElement);
        const progressText = DOMUtils.query('.progress-text', this.containerElement);
        const searchBtn = DOMUtils.query('#perform-search', this.containerElement);
        const previewBtn = DOMUtils.query('#search-preview', this.containerElement);

        if (this.currentSearch.isSearching) {
            DOMUtils.addClass(progressBar, 'active');
            progressText.textContent = 'Searching...';
            searchBtn.disabled = true;
            previewBtn.disabled = true;
            searchBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Searching...</span>';
        } else {
            DOMUtils.removeClass(progressBar, 'active');
            progressText.textContent = 'Ready to search';
            searchBtn.disabled = false;
            previewBtn.disabled = false;
            searchBtn.innerHTML = '<span class="btn-icon">🔍</span><span class="btn-text">Search Books</span>';
        }

        this.updateExportButton();
    }

    /**
     * Update export button state
     */
    updateExportButton() {
        const exportBtn = DOMUtils.query('#export-results', this.containerElement);
        if (exportBtn) {
            exportBtn.disabled = this.currentSearch.results.length === 0;
        }
    }

    /**
     * Clear all search criteria and filters
     */
    clearSearch() {
        this.currentSearch.criteria = this.getDefaultCriteria();
        this.currentSearch.filters = this.getDefaultFilters();
        this.currentSearch.results = [];
        
        this.applySearchState();
        console.log('🧹 Search criteria cleared');
    }

    /**
     * Save current search
     */
    async saveCurrentSearch() {
        const modalManager = window.bookBuddyApp?.modalManager;
        if (!modalManager) return;

        this.updateCriteriaFromForm();
        this.updateFiltersFromForm();

        const searchName = await modalManager.showPrompt(
            'Save Search',
            'Enter a name for this search:',
            '',
            'My Advanced Search'
        );

        if (searchName && searchName.trim()) {
            const savedSearch = {
                id: `saved_${Date.now()}`,
                name: searchName.trim(),
                criteria: { ...this.currentSearch.criteria },
                filters: { ...this.currentSearch.filters },
                displayQuery: this.buildSearchQuery(),
                savedAt: new Date().toISOString()
            };

            this.savedSearches.unshift(savedSearch);
            this.saveSavedSearches();
            this.refreshSavedSearches();

            modalManager.showAlert('Search Saved', `Search "${searchName}" has been saved!`);
            console.log('💾 Search saved:', searchName);
        }
    }

    /**
     * Load and apply saved search
     */
    loadSavedSearch(searchId) {
        const savedSearch = this.savedSearches.find(s => s.id === searchId);
        if (!savedSearch) return;

        this.currentSearch.criteria = { ...savedSearch.criteria };
        this.currentSearch.filters = { ...savedSearch.filters };
        this.applySearchState();

        console.log('📂 Loaded saved search:', savedSearch.name);
    }

    /**
     * Delete saved search
     */
    deleteSavedSearch(searchId) {
        this.savedSearches = this.savedSearches.filter(s => s.id !== searchId);
        this.saveSavedSearches();
        this.refreshSavedSearches();
        console.log('🗑️ Deleted saved search');
    }

    /**
     * Load search from history
     */
    loadHistorySearch(searchId) {
        const historySearch = this.searchHistory.find(s => s.id === searchId);
        if (!historySearch) return;

        // Apply the search from history
        if (historySearch.criteria) {
            this.currentSearch.criteria = { ...historySearch.criteria };
        }
        if (historySearch.filters) {
            this.currentSearch.filters = { ...historySearch.filters };
        }

        this.applySearchState();
        console.log('📂 Loaded search from history');
    }

    /**
     * Delete search from history
     */
    deleteHistorySearch(searchId) {
        this.searchHistory = this.searchHistory.filter(s => s.id !== searchId);
        this.saveSearchHistory();
        this.refreshSearchHistory();
        console.log('🗑️ Deleted search from history');
    }

    /**
     * Clear search history
     */
    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
        this.refreshSearchHistory();
        console.log('🧹 Search history cleared');
    }

    /**
     * Preview query without performing search
     */
    previewQuery() {
        this.updateCriteriaFromForm();
        this.updateFiltersFromForm();

        const query = this.buildSearchQuery();
        const options = this.buildSearchOptions();

        const modalManager = window.bookBuddyApp?.modalManager;
        if (modalManager) {
            modalManager.showModal({
                title: '👁️ Search Query Preview',
                content: `
                    <div class="query-preview-content">
                        <div class="preview-section">
                            <h4>Generated Query:</h4>
                            <code class="query-code">${StringUtils.escapeHtml(query || 'No query generated')}</code>
                        </div>
                        
                        <div class="preview-section">
                            <h4>Search Options:</h4>
                            <pre><code>${JSON.stringify(options, null, 2)}</code></pre>
                        </div>
                        
                        <div class="preview-section">
                            <h4>Active Tab:</h4>
                            <p>${this.activeTab.charAt(0).toUpperCase() + this.activeTab.slice(1)} Search</p>
                        </div>
                    </div>
                `,
                buttons: [
                    {
                        text: 'Perform Search',
                        action: 'search',
                        className: 'btn-primary'
                    },
                    {
                        text: 'Close',
                        action: 'close',
                        className: 'btn-outline'
                    }
                ],
                onAction: (action) => {
                    if (action === 'search') {
                        this.performSearch();
                    }
                    return true;
                }
            });
        }
    }

    /**
     * Show search tips modal
     */
    showSearchTips() {
        const modalManager = window.bookBuddyApp?.modalManager;
        if (!modalManager) return;

        modalManager.showModal({
            title: '💡 Advanced Search Tips',
            content: `
                <div class="search-tips">
                    <div class="tip-section">
                        <h4>Basic Search</h4>
                        <ul>
                            <li>Use quotes for exact phrases: <code>"clean code"</code></li>
                            <li>Use OR for alternatives: <code>python OR javascript</code></li>
                            <li>Use minus to exclude: <code>programming -java</code></li>
                        </ul>
                    </div>
                    
                    <div class="tip-section">
                        <h4>Advanced Fields</h4>
                        <ul>
                            <li><strong>Title:</strong> Search specifically in book titles</li>
                            <li><strong>Author:</strong> Find books by specific authors</li>
                            <li><strong>Subject:</strong> Search by genre or topic</li>
                            <li><strong>ISBN:</strong> Find exact books by ISBN</li>
                        </ul>
                    </div>
                    
                    <div class="tip-section">
                        <h4>Expert Query Syntax</h4>
                        <ul>
                            <li><code>intitle:"title"</code> - Search in titles</li>
                            <li><code>inauthor:"author"</code> - Search by author</li>
                            <li><code>subject:"topic"</code> - Search by subject</li>
                            <li><code>isbn:1234567890</code> - Search by ISBN</li>
                            <li><code>inpublisher:"publisher"</code> - Search by publisher</li>
                        </ul>
                    </div>
                    
                    <div class="tip-section">
                        <h4>Filters</h4>
                        <ul>
                            <li>Use language filters to find books in specific languages</li>
                            <li>Set year ranges to find books from specific time periods</li>
                            <li>Use content type to filter books vs magazines</li>
                        </ul>
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Got it!',
                    action: 'close',
                    className: 'btn-primary'
                }
            ]
        });
    }

    /**
     * Build query from advanced fields
     */
    buildQueryFromFields() {
        this.updateCriteriaFromForm();
        const query = this.buildSearchQuery();
        
        const expertQueryField = DOMUtils.query('#expert-query', this.containerElement);
        if (expertQueryField) {
            expertQueryField.value = query;
        }

        const generatedQuery = DOMUtils.query('#generated-query', this.containerElement);
        if (generatedQuery) {
            generatedQuery.textContent = query;
        }

        console.log('🔧 Built query from fields:', query);
    }

    /**
     * Export search results
     */
    exportResults() {
        if (this.currentSearch.results.length === 0) {
            const modalManager = window.bookBuddyApp?.modalManager;
            if (modalManager) {
                modalManager.showAlert('No Results', 'No search results to export. Please perform a search first.');
            }
            return;
        }

        const modalManager = window.bookBuddyApp?.modalManager;
        if (!modalManager) return;

        modalManager.showModal({
            title: '📤 Export Search Results',
            content: `
                <div class="export-dialog">
                    <p>Export ${this.currentSearch.results.length} search results:</p>
                    
                    <div class="export-options">
                        <div class="format-group">
                            <div class="format-option">
                                <input type="radio" name="export-format" value="json" id="export-json" checked>
                                <label for="export-json" class="format-label">
                                    <strong>JSON</strong>
                                    <small>Complete data with all metadata</small>
                                </label>
                            </div>
                            
                            <div class="format-option">
                                <input type="radio" name="export-format" value="csv" id="export-csv">
                                <label for="export-csv" class="format-label">
                                    <strong>CSV</strong>
                                    <small>Spreadsheet format with key fields</small>
                                </label>
                            </div>
                            
                            <div class="format-option">
                                <input type="radio" name="export-format" value="txt" id="export-txt">
                                <label for="export-txt" class="format-label">
                                    <strong>Text</strong>
                                    <small>Simple text list</small>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Export',
                    action: 'export',
                    className: 'btn-primary'
                },
                {
                    text: 'Cancel',
                    action: 'close',
                    className: 'btn-outline'
                }
            ],
            onAction: (action) => {
                if (action === 'export') {
                    const format = DOMUtils.query('input[name="export-format"]:checked')?.value || 'json';
                    this.performExport(format);
                }
                return true;
            }
        });
    }

    /**
     * Perform actual export
     */
    performExport(format) {
        const results = this.currentSearch.results;
        const timestamp = DateUtils.formatDate(new Date().toISOString()).replace(/\s/g, '-');
        
        let content, filename, mimeType;

        switch (format) {
            case 'json':
                content = JSON.stringify(results, null, 2);
                filename = `book-search-results-${timestamp}.json`;
                mimeType = 'application/json';
                break;
            case 'csv':
                content = this.convertToCSV(results);
                filename = `book-search-results-${timestamp}.csv`;
                mimeType = 'text/csv';
                break;
            case 'txt':
                content = this.convertToText(results);
                filename = `book-search-results-${timestamp}.txt`;
                mimeType = 'text/plain';
                break;
            default:
                return;
        }

        this.downloadFile(content, filename, mimeType);
        console.log(`📤 Exported ${results.length} results as ${format.toUpperCase()}`);
    }

    /**
     * Convert results to CSV format
     */
    convertToCSV(results) {
        const headers = ['Title', 'Authors', 'Publisher', 'Published Date', 'Page Count', 'Categories', 'Language', 'Preview Link'];
        const rows = [headers];

        results.forEach(book => {
            const row = [
                this.escapeCSV(book.title || ''),
                this.escapeCSV((book.authors || []).join('; ')),
                this.escapeCSV(book.publisher || ''),
                this.escapeCSV(book.publishedDate || ''),
                book.pageCount || '',
                this.escapeCSV((book.categories || []).join('; ')),
                book.language || '',
                book.previewLink || ''
            ];
            rows.push(row);
        });

        return rows.map(row => row.join(',')).join('\n');
    }

    /**
     * Convert results to text format
     */
    convertToText(results) {
        return results.map((book, index) => {
            const lines = [
                `${index + 1}. ${book.title || 'Unknown Title'}`,
                `   Authors: ${(book.authors || []).join(', ') || 'Unknown'}`,
                `   Publisher: ${book.publisher || 'Unknown'}`,
                `   Published: ${book.publishedDate || 'Unknown'}`,
                `   Pages: ${book.pageCount || 'Unknown'}`,
                `   Language: ${book.language || 'Unknown'}`,
                `   Categories: ${(book.categories || []).join(', ') || 'None'}`,
                book.previewLink ? `   Preview: ${book.previewLink}` : '',
                ''
            ];
            return lines.filter(line => line).join('\n');
        }).join('\n');
    }

    /**
     * Escape CSV values
     */
    escapeCSV(value) {
        if (typeof value !== 'string') return value;
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    /**
     * Download file
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Add search to history
     */
    addToSearchHistory(query, results) {
        const historyEntry = {
            id: `history_${Date.now()}`,
            displayQuery: query,
            criteria: { ...this.currentSearch.criteria },
            filters: { ...this.currentSearch.filters },
            resultsCount: results.books ? results.books.length : 0,
            timestamp: new Date().toISOString()
        };

        this.searchHistory.unshift(historyEntry);
        
        if (this.searchHistory.length > this.searchConfig.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.searchConfig.maxHistoryItems);
        }

        this.saveSearchHistory();
        this.refreshSearchHistory();
    }

    /**
     * Handle search performed event
     */
    handleSearchPerformed(data) {
        this.currentSearch.results = data.results?.books || [];
        this.updateExportButton();
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorContainer = DOMUtils.query('.search-error', this.containerElement);
        if (errorContainer) {
            errorContainer.remove();
        }

        const form = DOMUtils.query('.search-form', this.containerElement);
        if (form) {
            const errorHTML = `
                <div class="search-error">
                    <div class="error-content">
                        <span class="error-icon">⚠️</span>
                        <span class="error-message">${StringUtils.escapeHtml(message)}</span>
                        <button class="error-close" type="button">&times;</button>
                    </div>
                </div>
            `;
            
            form.insertAdjacentHTML('afterbegin', errorHTML);
            
            const closeBtn = DOMUtils.query('.error-close', form);
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    DOMUtils.query('.search-error', form)?.remove();
                });
            }

            // Auto-remove after 5 seconds
            setTimeout(() => {
                DOMUtils.query('.search-error', form)?.remove();
            }, 5000);
        }
    }

    /**
     * Get popular search suggestions
     */
    getPopularSearches() {
        return [
            'JavaScript programming',
            'Python cookbook',
            'Machine learning',
            'Web development',
            'Data science',
            'Science fiction',
            'Historical fiction',
            'Biography'
        ];
    }

    /**
     * Get suggestions from search history
     */
    getHistorySuggestions(query, field) {
        const suggestions = [];
        const queryLower = query.toLowerCase();

        this.searchHistory.forEach(search => {
            if (field === 'query' && search.displayQuery && 
                search.displayQuery.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    text: search.displayQuery,
                    source: 'history'
                });
            } else if (search.criteria && search.criteria[field] && 
                       search.criteria[field].toLowerCase().includes(queryLower)) {
                suggestions.push({
                    text: search.criteria[field],
                    source: 'history'
                });
            }
        });

        return suggestions.slice(0, 3);
    }

    /**
     * Get popular suggestions for field
     */
    getPopularSuggestions(query, field) {
        const popularSuggestions = {
            query: [
                'JavaScript programming',
                'Python tutorial',
                'Machine learning basics',
                'Web development guide',
                'Data structures algorithms'
            ],
            author: [
                'Robert C. Martin',
                'Martin Fowler',
                'Eric Evans',
                'Gang of Four',
                'Steve McConnell'
            ],
            subject: [
                'Programming',
                'Computer Science',
                'Software Engineering',
                'Web Development',
                'Data Science',
                'Fiction',
                'Biography',
                'History'
            ],
            publisher: [
                'O\'Reilly Media',
                'Addison-Wesley',
                'Manning Publications',
                'Pearson',
                'MIT Press'
            ]
        };

        const suggestions = popularSuggestions[field] || [];
        const queryLower = query.toLowerCase();

        return suggestions
            .filter(suggestion => suggestion.toLowerCase().includes(queryLower))
            .slice(0, 5)
            .map(text => ({ text, source: 'popular' }));
    }

    /**
     * Load auto-complete suggestions
     */
    async loadAutoCompleteSuggestions() {
        // Pre-load common suggestions into cache
        const commonQueries = this.getPopularSearches();
        commonQueries.forEach(query => {
            this.suggestionCache.set(`query:${query.toLowerCase()}`, [
                { text: query, source: 'popular' }
            ]);
        });
    }

    /**
     * Refresh search history display
     */
    refreshSearchHistory() {
        const historySection = DOMUtils.query('[data-section="history"]', this.containerElement);
        if (historySection) {
            const newContent = this.renderSearchHistory();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newContent;
            const newHistorySection = tempDiv.firstElementChild;
            
            historySection.parentNode.replaceChild(newHistorySection, historySection);
            this.setupHistoryActions();
        }
    }

    /**
     * Refresh saved searches display
     */
    refreshSavedSearches() {
        const savedSection = DOMUtils.query('[data-section="saved"]', this.containerElement);
        if (savedSection) {
            const newContent = this.renderSavedSearches();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newContent;
            const newSavedSection = tempDiv.firstElementChild;
            
            savedSection.parentNode.replaceChild(newSavedSection, savedSection);
            this.setupHistoryActions();
        }
    }

    /**
     * Load search history from storage
     */
    loadSearchHistory() {
        const storage = window.bookBuddyApp?.storage;
        if (storage) {
            const result = storage.load('advanced_search_history', []);
            return result.success ? result.data : [];
        }
        return [];
    }

    /**
     * Save search history to storage
     */
    saveSearchHistory() {
        const storage = window.bookBuddyApp?.storage;
        if (storage) {
            storage.save('advanced_search_history', this.searchHistory);
        }
    }

    /**
     * Load saved searches from storage
     */
    loadSavedSearches() {
        const storage = window.bookBuddyApp?.storage;
        if (storage) {
            const result = storage.load('advanced_saved_searches', []);
            return result.success ? result.data : [];
        }
        return [];
    }

    /**
     * Save saved searches to storage
     */
    saveSavedSearches() {
        const storage = window.bookBuddyApp?.storage;
        if (storage) {
            storage.save('advanced_saved_searches', this.savedSearches);
        }
    }

    /**
     * Show/hide the interface
     */
    show() {
        if (this.containerElement) {
            this.containerElement.style.display = 'block';
            this.isVisible = true;
        }
    }

    hide() {
        if (this.containerElement) {
            this.containerElement.style.display = 'none';
            this.isVisible = false;
        }
    }

    /**
     * Get current search state
     */
    getCurrentSearch() {
        return {
            ...this.currentSearch,
            activeTab: this.activeTab,
            expandedSections: Array.from(this.expandedSections)
        };
    }

    /**
     * Set search state
     */
    setSearchState(state) {
        if (state.criteria) {
            this.currentSearch.criteria = { ...state.criteria };
        }
        if (state.filters) {
            this.currentSearch.filters = { ...state.filters };
        }
        if (state.activeTab) {
            this.activeTab = state.activeTab;
        }
        if (state.expandedSections) {
            this.expandedSections = new Set(state.expandedSections);
        }
        
        this.applySearchState();
    }

    /**
     * Destroy the interface and cleanup
     */
    destroy() {
        if (this.containerElement) {
            this.containerElement.innerHTML = '';
        }
        this.suggestionCache.clear();
        eventBus.off('search:performed');
        eventBus.off('search:resultsUpdated');
        console.log('🗑️ AdvancedSearchInterface destroyed');
    }
}input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.handleAutoComplete(e.target);
                }, this.searchConfig.debounceDelay);
            });

            input.addEventListener('focus', (e) => {
                this.showSuggestions(e.target);
            });

            input.addEventListener('