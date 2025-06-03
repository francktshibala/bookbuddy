// js/modules/ui/AdvancedSearchInterface.js - Simplified version
import SearchStateManager from './search/SearchStateManager.js';
import SearchHistoryManager from './search/SearchHistoryManager.js';
import SearchUIRenderer from './search/SearchUIRenderer.js';
import SearchAutoComplete from './search/SearchAutoComplete.js';
import SearchQueryBuilder from './search/SearchQueryBuilder.js';
import SearchExportManager from './search/SearchExportManager.js';

export default class AdvancedSearchInterface {
    constructor(googleBooksAPI, storage, modalManager) {
        this.googleBooksAPI = googleBooksAPI;
        this.storage = storage;
        this.modalManager = modalManager;
        this.containerElement = null;
        
        // Initialize sub-components
        this.stateManager = new SearchStateManager();
        this.historyManager = new SearchHistoryManager(storage);
        this.uiRenderer = new SearchUIRenderer();
        this.autoComplete = new SearchAutoComplete();
        this.queryBuilder = new SearchQueryBuilder();
        this.exportManager = new SearchExportManager();
        
        console.log('🎛️ AdvancedSearchInterface initialized');
    }

    async initialize(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) {
            throw new Error(`Container not found: ${containerSelector}`);
        }
        
        this.containerElement = container;
        this.render();
        this.setupEventListeners();
    }

    render() {
        if (!this.containerElement) return;
        
        const html = `
            <div class="advanced-search-interface">
                ${this.uiRenderer.renderSearchHeader()}
                ${this.uiRenderer.renderSearchTabs(this.stateManager.activeTab)}
                <form class="search-form" id="advanced-search-form">
                    ${this.renderTabContent()}
                </form>
                ${this.renderSearchActions()}
            </div>
        `;
        
        this.containerElement.innerHTML = html;
    }

    renderTabContent() {
        const { criteria } = this.stateManager.currentSearch;
        
        switch (this.stateManager.activeTab) {
            case 'basic':
                return this.uiRenderer.renderBasicSearchFields(criteria);
            case 'advanced':
                // Add advanced fields rendering
                return '<div>Advanced search fields coming soon...</div>';
            case 'expert':
                // Add expert query rendering
                return '<div>Expert query builder coming soon...</div>';
            default:
                return '';
        }
    }

    renderSearchActions() {
        return `
            <div class="search-actions">
                <div class="primary-actions">
                    <button type="submit" 
                            class="btn btn-primary btn-lg search-btn" 
                            id="perform-search">
                        <span class="btn-icon">🔍</span>
                        <span class="btn-text">Search Books</span>
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        if (!this.containerElement) return;

        // Tab switching
        const tabButtons = this.containerElement.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.stateManager.activeTab = button.dataset.tab;
                this.render();
                this.setupEventListeners();
            });
        });

        // Form submission
        const form = this.containerElement.querySelector('#advanced-search-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }

        // Clear search
        const clearBtn = this.containerElement.querySelector('#clear-search');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.stateManager.reset();
                this.render();
                this.setupEventListeners();
            });
        }

        // Setup auto-complete
        const searchInputs = this.containerElement.querySelectorAll('.search-input');
        searchInputs.forEach(input => {
            this.autoComplete.setupAutoComplete(input, (value) => {
                // Handle suggestion selection
                const field = input.dataset.field || 'query';
                this.stateManager.updateCriteria({ [field]: value });
            });
        });
    }

    async performSearch() {
        const { criteria, filters } = this.stateManager.currentSearch;
        
        // Validate
        const validation = this.queryBuilder.validateSearchCriteria(
            criteria, 
            this.stateManager.activeTab
        );
        
        if (!validation.valid) {
            this.modalManager.showAlert('Invalid Search', validation.message);
            return;
        }

        // Build query
        const query = this.queryBuilder.buildSearchQuery(
            criteria, 
            this.stateManager.activeTab
        );
        const options = this.queryBuilder.buildSearchOptions(filters);

        // Set searching state
        this.stateManager.currentSearch.isSearching = true;
        this.updateSearchButton(true);

        try {
            const results = await this.googleBooksAPI.searchBooks(query, options);
            
            if (results.success) {
                this.stateManager.currentSearch.results = results.books || [];
                this.stateManager.currentSearch.lastSearchTime = new Date().toISOString();
                
                // Add to history
                this.historyManager.addToHistory(
                    query,
                    criteria,
                    filters,
                    results.books.length
                );
                
                // Emit event for results
                window.eventBus.emit('search:performed', {
                    query,
                    options,
                    results,
                    source: 'advanced-search'
                });
            } else {
                this.modalManager.showAlert('Search Failed', results.message);
            }
        } catch (error) {
            this.modalManager.showAlert('Search Error', error.message);
        } finally {
            this.stateManager.currentSearch.isSearching = false;
            this.updateSearchButton(false);
        }
    }

    updateSearchButton(isSearching) {
        const searchBtn = this.containerElement.querySelector('#perform-search');
        if (searchBtn) {
            searchBtn.disabled = isSearching;
            searchBtn.innerHTML = isSearching 
                ? '<span class="btn-icon">⏳</span><span class="btn-text">Searching...</span>'
                : '<span class="btn-icon">🔍</span><span class="btn-text">Search Books</span>';
        }
    }
}