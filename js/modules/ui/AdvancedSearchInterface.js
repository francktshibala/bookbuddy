/**
 * AdvancedSearchInterface - Component 10.4
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
                        <span class="history-count">(${this.searchHistory.length})</span>
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
                        <span class="saved-count">(${this.savedSearches.length})</span>
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
            
            input.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.handleAutoComplete(e.target);
                }, this.searchConfig.debounceDelay);
            });

            input.addEventListener('focus', (e) => {
                this.showSuggestions(e.target);
            });

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