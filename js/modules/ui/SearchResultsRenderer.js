/**
 * SearchResultsRenderer - Component 10.3
 * Enhanced search result card layouts with book covers, filtering, sorting, and actions
 */
import { DOMUtils, StringUtils, DateUtils } from '../../utils/Helpers.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';

export default class SearchResultsRenderer {
    constructor(bookCoverManager = null) {
        this.bookCoverManager = bookCoverManager;
        this.currentResults = [];
        this.filteredResults = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.sortBy = 'relevance'; // 'relevance', 'title', 'publishedDate', 'pageCount', 'rating'
        this.sortOrder = 'desc'; // 'asc', 'desc'
        this.filters = {
            language: 'all',
            publishedAfter: null,
            publishedBefore: null,
            minPages: 0,
            maxPages: null,
            hasPreview: false,
            categories: []
        };
        this.viewMode = 'cards'; // 'cards', 'list', 'compact'
        
        console.log('🔍 SearchResultsRenderer initialized');
    }

    /**
     * Render search results with enhanced features
     */
    renderSearchResults(results, options = {}) {
        const {
            showFilters = true,
            showSorting = true,
            showPagination = true,
            targetContainer = '#search-results'
        } = options;

        this.currentResults = results || [];
        this.applyFilters();
        this.applySorting();

        const container = DOMUtils.query(targetContainer);
        if (!container) {
            console.error('SearchResultsRenderer: Target container not found:', targetContainer);
            return;
        }

        if (this.currentResults.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        const html = `
            <div class="search-results-container">
                ${showFilters ? this.renderFilters() : ''}
                ${showSorting ? this.renderSortingControls() : ''}
                <div class="search-results-summary">
                    ${this.renderResultsSummary()}
                </div>
                <div class="search-results-grid" data-view-mode="${this.viewMode}">
                    ${this.renderResults()}
                </div>
                ${showPagination ? this.renderPagination() : ''}
            </div>
        `;

        container.innerHTML = html;
        this.setupEventListeners(container);
        this.loadBookCovers();

        // Emit event
        eventBus.emit('search:resultsRendered', {
            totalResults: this.currentResults.length,
            filteredResults: this.filteredResults.length,
            page: this.currentPage
        });
    }

    /**
     * Render enhanced search result cards
     */
    renderResults() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageResults = this.filteredResults.slice(startIndex, endIndex);

        if (pageResults.length === 0) {
            return this.renderNoResultsForFilter();
        }

        switch (this.viewMode) {
            case 'list':
                return this.renderListView(pageResults);
            case 'compact':
                return this.renderCompactView(pageResults);
            case 'cards':
            default:
                return this.renderCardView(pageResults);
        }
    }

    /**
     * Render card view with book covers
     */
    renderCardView(results) {
        return results.map(result => this.renderSearchResultCard(result)).join('');
    }

    /**
     * Enhanced search result card with book cover and metadata
     */
    renderSearchResultCard(result) {
        const bookId = `search-result-${result.id}`;
        const coverUrl = this.getBestCoverImage(result);
        const rating = this.formatRating(result.averageRating, result.ratingsCount);
        const publishedYear = this.extractYear(result.publishedDate);
        const categories = this.formatCategories(result.categories);

        return `
            <div class="search-result-card enhanced" data-book-id="${result.id}">
                <div class="result-cover-section">
                    <div class="result-cover-container">
                        ${this.renderBookCover(result, coverUrl, bookId)}
                        ${result.previewLink ? '<div class="cover-overlay"><span class="preview-icon">👁️</span></div>' : ''}
                    </div>
                </div>
                
                <div class="result-content-section">
                    <div class="result-header">
                        <div class="result-title-container">
                            <h3 class="result-title">${StringUtils.escapeHtml(result.title)}</h3>
                            ${result.subtitle ? `<p class="result-subtitle">${StringUtils.escapeHtml(result.subtitle)}</p>` : ''}
                        </div>
                        <div class="result-source-badge">
                            <span class="source-label">${result.source || 'Unknown'}</span>
                        </div>
                    </div>
                    
                    ${result.authors && result.authors.length > 0 ? `
                        <div class="result-authors">
                            <span class="authors-label">by</span>
                            <span class="authors-list">${result.authors.join(', ')}</span>
                        </div>
                    ` : ''}
                    
                    <div class="result-metadata">
                        <div class="metadata-row">
                            ${publishedYear ? `<span class="metadata-item"><span class="metadata-icon">📅</span>${publishedYear}</span>` : ''}
                            ${result.pageCount ? `<span class="metadata-item"><span class="metadata-icon">📄</span>${result.pageCount} pages</span>` : ''}
                            ${result.language && result.language !== 'en' ? `<span class="metadata-item"><span class="metadata-icon">🌐</span>${result.language.toUpperCase()}</span>` : ''}
                        </div>
                        ${rating.display ? `
                            <div class="metadata-row">
                                <span class="metadata-item rating">
                                    <span class="rating-stars">${rating.stars}</span>
                                    <span class="rating-text">${rating.display}</span>
                                </span>
                            </div>
                        ` : ''}
                        ${categories ? `
                            <div class="metadata-row">
                                <span class="metadata-item categories">
                                    <span class="metadata-icon">🏷️</span>${categories}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${result.description ? `
                        <div class="result-description">
                            <p>${StringUtils.truncate(StringUtils.escapeHtml(result.description), 200)}</p>
                            ${result.description.length > 200 ? '<button class="btn-expand" data-action="expand-description">Read more</button>' : ''}
                        </div>
                    ` : ''}
                    
                    <div class="result-actions">
                        <button class="btn btn-primary btn-add-book" 
                                data-book-info='${this.escapeForAttribute(JSON.stringify(result))}'
                                data-action="add-to-library">
                            <span class="btn-icon">📚</span>
                            <span class="btn-text">Add to Library</span>
                        </button>
                        ${result.previewLink ? `
                            <a href="${result.previewLink}" 
                               target="_blank" 
                               class="btn btn-outline btn-preview"
                               data-action="preview">
                                <span class="btn-icon">👁️</span>
                                <span class="btn-text">Preview</span>
                            </a>
                        ` : ''}
                        ${result.infoLink ? `
                            <a href="${result.infoLink}" 
                               target="_blank" 
                               class="btn btn-outline btn-info"
                               data-action="more-info">
                                <span class="btn-icon">ℹ️</span>
                                <span class="btn-text">More Info</span>
                            </a>
                        ` : ''}
                        <button class="btn btn-outline btn-compare" 
                                data-book-id="${result.id}"
                                data-action="compare">
                            <span class="btn-icon">⚖️</span>
                            <span class="btn-text">Compare</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render book cover with fallback
     */
    renderBookCover(result, coverUrl, bookId) {
        if (this.bookCoverManager && coverUrl) {
            // Use BookCoverManager for advanced cover handling
            const coverElement = this.bookCoverManager.createImageElement(result, 'medium', {
                className: 'result-cover-image',
                lazy: true,
                onClick: (bookData, img) => this.handleCoverClick(bookData, img)
            });
            return coverElement.outerHTML;
        } else if (coverUrl) {
            // Fallback to simple image
            return `
                <img src="${coverUrl}" 
                     alt="Cover for ${StringUtils.escapeHtml(result.title)}"
                     class="result-cover-image"
                     loading="lazy"
                     onerror="this.src='data:image/svg+xml;base64,${btoa(this.generateFallbackSVG(result.title))}'">
            `;
        } else {
            // No cover available
            return `
                <div class="result-cover-placeholder">
                    <span class="cover-placeholder-icon">📚</span>
                    <span class="cover-placeholder-text">No Cover</span>
                </div>
            `;
        }
    }

    /**
     * Render list view (compact horizontal layout)
     */
    renderListView(results) {
        return `
            <div class="search-results-list">
                ${results.map(result => this.renderListItem(result)).join('')}
            </div>
        `;
    }

    /**
     * Render individual list item
     */
    renderListItem(result) {
        const rating = this.formatRating(result.averageRating, result.ratingsCount);
        const publishedYear = this.extractYear(result.publishedDate);

        return `
            <div class="search-result-list-item" data-book-id="${result.id}">
                <div class="list-item-cover">
                    ${this.renderBookCover(result, this.getBestCoverImage(result), `list-${result.id}`)}
                </div>
                <div class="list-item-content">
                    <div class="list-item-header">
                        <h4 class="list-item-title">${StringUtils.escapeHtml(result.title)}</h4>
                        <span class="list-item-source">${result.source || 'Unknown'}</span>
                    </div>
                    <div class="list-item-authors">
                        ${result.authors ? result.authors.join(', ') : 'Unknown Author'}
                    </div>
                    <div class="list-item-metadata">
                        ${publishedYear ? `${publishedYear} • ` : ''}
                        ${result.pageCount ? `${result.pageCount} pages • ` : ''}
                        ${rating.display || 'No rating'}
                    </div>
                    <div class="list-item-description">
                        ${StringUtils.truncate(result.description || 'No description available.', 120)}
                    </div>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-sm btn-primary btn-add-book" 
                            data-book-info='${this.escapeForAttribute(JSON.stringify(result))}'
                            data-action="add-to-library">
                        Add to Library
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render compact view (minimal cards)
     */
    renderCompactView(results) {
        return `
            <div class="search-results-compact">
                ${results.map(result => this.renderCompactCard(result)).join('')}
            </div>
        `;
    }

    /**
     * Render compact card
     */
    renderCompactCard(result) {
        return `
            <div class="search-result-compact-card" data-book-id="${result.id}">
                <div class="compact-cover">
                    ${this.renderBookCover(result, this.getBestCoverImage(result), `compact-${result.id}`)}
                </div>
                <div class="compact-content">
                    <h5 class="compact-title">${StringUtils.truncate(result.title, 40)}</h5>
                    <p class="compact-author">${result.authors ? result.authors[0] : 'Unknown'}</p>
                    <button class="btn btn-xs btn-primary btn-add-book" 
                            data-book-info='${this.escapeForAttribute(JSON.stringify(result))}'
                            data-action="add-to-library">
                        Add
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render search filters
     */
    renderFilters() {
        const availableLanguages = this.getAvailableLanguages();
        const availableCategories = this.getAvailableCategories();
        const publishedYearRange = this.getPublishedYearRange();

        return `
            <div class="search-filters">
                <div class="filters-header">
                    <h4 class="filters-title">Filter Results</h4>
                    <button class="btn btn-sm btn-outline" data-action="reset-filters">
                        Reset Filters
                    </button>
                </div>
                
                <div class="filters-content">
                    <div class="filter-group">
                        <label class="filter-label">Language</label>
                        <select class="filter-select" data-filter="language">
                            <option value="all">All Languages</option>
                            ${availableLanguages.map(lang => `
                                <option value="${lang.code}" ${this.filters.language === lang.code ? 'selected' : ''}>
                                    ${lang.name} (${lang.count})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Published Year</label>
                        <div class="filter-range">
                            <input type="number" 
                                   class="filter-input" 
                                   data-filter="publishedAfter"
                                   placeholder="From"
                                   min="${publishedYearRange.min}"
                                   max="${publishedYearRange.max}"
                                   value="${this.filters.publishedAfter || ''}">
                            <span class="range-separator">to</span>
                            <input type="number" 
                                   class="filter-input" 
                                   data-filter="publishedBefore"
                                   placeholder="To"
                                   min="${publishedYearRange.min}"
                                   max="${publishedYearRange.max}"
                                   value="${this.filters.publishedBefore || ''}">
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Page Count</label>
                        <div class="filter-range">
                            <input type="number" 
                                   class="filter-input" 
                                   data-filter="minPages"
                                   placeholder="Min"
                                   min="0"
                                   value="${this.filters.minPages || ''}">
                            <span class="range-separator">to</span>
                            <input type="number" 
                                   class="filter-input" 
                                   data-filter="maxPages"
                                   placeholder="Max"
                                   min="0"
                                   value="${this.filters.maxPages || ''}">
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-checkbox">
                            <input type="checkbox" 
                                   data-filter="hasPreview"
                                   ${this.filters.hasPreview ? 'checked' : ''}>
                            <span class="checkbox-label">Has Preview Available</span>
                        </label>
                    </div>
                    
                    ${availableCategories.length > 0 ? `
                        <div class="filter-group">
                            <label class="filter-label">Categories</label>
                            <div class="filter-categories">
                                ${availableCategories.slice(0, 8).map(category => `
                                    <label class="category-tag">
                                        <input type="checkbox" 
                                               data-filter="category"
                                               value="${category.name}"
                                               ${this.filters.categories.includes(category.name) ? 'checked' : ''}>
                                        <span class="tag-label">${category.name} (${category.count})</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render sorting controls
     */
    renderSortingControls() {
        return `
            <div class="search-sorting">
                <div class="sorting-controls">
                    <div class="sort-group">
                        <label class="sort-label">Sort by:</label>
                        <select class="sort-select" data-sort="field">
                            <option value="relevance" ${this.sortBy === 'relevance' ? 'selected' : ''}>Relevance</option>
                            <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Title</option>
                            <option value="publishedDate" ${this.sortBy === 'publishedDate' ? 'selected' : ''}>Published Date</option>
                            <option value="pageCount" ${this.sortBy === 'pageCount' ? 'selected' : ''}>Page Count</option>
                            <option value="rating" ${this.sortBy === 'rating' ? 'selected' : ''}>Rating</option>
                        </select>
                    </div>
                    
                    <button class="btn btn-sm btn-outline sort-order-btn" 
                            data-sort="order"
                            title="Toggle sort order">
                        ${this.sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                    </button>
                    
                    <div class="view-mode-controls">
                        <button class="btn btn-sm ${this.viewMode === 'cards' ? 'btn-primary' : 'btn-outline'}"
                                data-view-mode="cards"
                                title="Card view">
                            <span class="view-icon">⊞</span>
                        </button>
                        <button class="btn btn-sm ${this.viewMode === 'list' ? 'btn-primary' : 'btn-outline'}"
                                data-view-mode="list"
                                title="List view">
                            <span class="view-icon">☰</span>
                        </button>
                        <button class="btn btn-sm ${this.viewMode === 'compact' ? 'btn-primary' : 'btn-outline'}"
                                data-view-mode="compact"
                                title="Compact view">
                            <span class="view-icon">⊡</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render results summary
     */
    renderResultsSummary() {
        const total = this.currentResults.length;
        const filtered = this.filteredResults.length;
        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(startIndex + this.itemsPerPage - 1, filtered);

        return `
            <div class="results-summary">
                <span class="results-count">
                    Showing ${startIndex}-${endIndex} of ${filtered} results
                    ${total !== filtered ? ` (${total} total)` : ''}
                </span>
                <span class="results-info">
                    • Page ${this.currentPage} of ${Math.ceil(filtered / this.itemsPerPage)}
                    • ${this.viewMode} view
                </span>
            </div>
        `;
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        const totalPages = Math.ceil(this.filteredResults.length / this.itemsPerPage);
        
        if (totalPages <= 1) return '';

        const currentPage = this.currentPage;
        const maxVisible = 5;
        const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        const endPage = Math.min(totalPages, startPage + maxVisible - 1);

        let paginationHTML = `
            <div class="search-pagination">
                <button class="btn btn-outline pagination-btn" 
                        data-page="1"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    « First
                </button>
                <button class="btn btn-outline pagination-btn" 
                        data-page="${currentPage - 1}"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    ‹ Previous
                </button>
        `;

        for (let page = startPage; page <= endPage; page++) {
            paginationHTML += `
                <button class="btn pagination-btn ${page === currentPage ? 'btn-primary' : 'btn-outline'}" 
                        data-page="${page}">
                    ${page}
                </button>
            `;
        }

        paginationHTML += `
                <button class="btn btn-outline pagination-btn" 
                        data-page="${currentPage + 1}"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    Next ›
                </button>
                <button class="btn btn-outline pagination-btn" 
                        data-page="${totalPages}"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    Last »
                </button>
            </div>
        `;

        return paginationHTML;
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="search-empty-state">
                <div class="empty-state-icon">🔍</div>
                <h3 class="empty-state-title">No Search Results</h3>
                <p class="empty-state-message">
                    We couldn't find any books matching your search criteria.
                </p>
                <div class="empty-state-suggestions">
                    <h4>Try:</h4>
                    <ul>
                        <li>Using different or fewer keywords</li>
                        <li>Checking your spelling</li>
                        <li>Removing some filters</li>
                        <li>Searching for author names or book titles</li>
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Render no results for current filter
     */
    renderNoResultsForFilter() {
        return `
            <div class="search-filter-empty">
                <div class="filter-empty-icon">🚫</div>
                <h4 class="filter-empty-title">No Results for Current Filters</h4>
                <p class="filter-empty-message">
                    Try adjusting your filters to see more results.
                </p>
                <button class="btn btn-primary" data-action="reset-filters">
                    Reset All Filters
                </button>
            </div>
        `;
    }

    /**
     * Setup event listeners for search results
     */
    setupEventListeners(container) {
        // Add to library buttons
        const addButtons = DOMUtils.queryAll('.btn-add-book', container);
        addButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleAddToLibrary(e));
        });

        // Expand description buttons
        const expandButtons = DOMUtils.queryAll('.btn-expand', container);
        expandButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleExpandDescription(e));
        });

        // Filter controls
        const filterInputs = DOMUtils.queryAll('[data-filter]', container);
        filterInputs.forEach(input => {
            const eventType = input.type === 'checkbox' ? 'change' : 'input';
            input.addEventListener(eventType, (e) => this.handleFilterChange(e));
        });

        // Sort controls
        const sortControls = DOMUtils.queryAll('[data-sort]', container);
        sortControls.forEach(control => {
            control.addEventListener('change', (e) => this.handleSortChange(e));
        });

        // View mode controls
        const viewModeButtons = DOMUtils.queryAll('[data-view-mode]', container);
        viewModeButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleViewModeChange(e));
        });

        // Pagination
        const paginationButtons = DOMUtils.queryAll('.pagination-btn', container);
        paginationButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handlePaginationClick(e));
        });

        // Reset filters
        const resetButton = DOMUtils.query('[data-action="reset-filters"]', container);
        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetFilters());
        }

        // Compare buttons
        const compareButtons = DOMUtils.queryAll('[data-action="compare"]', container);
        compareButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleCompareClick(e));
        });
    }

    /**
     * Handle add to library action
     */
    handleAddToLibrary(event) {
        const button = event.target.closest('.btn-add-book');
        const bookInfo = JSON.parse(button.dataset.bookInfo);
        
        // Emit event for app to handle
        eventBus.emit('search:addToLibrary', { 
            book: bookInfo, 
            button: button 
        });
    }

    /**
     * Handle expand description
     */
    handleExpandDescription(event) {
        const button = event.target;
        const description = button.closest('.result-description');
        const bookId = button.closest('[data-book-id]').dataset.bookId;
        const book = this.currentResults.find(b => b.id === bookId);
        
        if (book && description) {
            const paragraph = description.querySelector('p');
            paragraph.innerHTML = StringUtils.escapeHtml(book.description);
            button.remove();
        }
    }

    /**
     * Handle filter changes
     */
    handleFilterChange(event) {
        const input = event.target;
        const filterType = input.dataset.filter;
        
        if (filterType === 'category') {
            if (input.checked) {
                this.filters.categories.push(input.value);
            } else {
                this.filters.categories = this.filters.categories.filter(cat => cat !== input.value);
            }
        } else if (input.type === 'checkbox') {
            this.filters[filterType] = input.checked;
        } else {
            const value = input.value;
            this.filters[filterType] = value === '' ? null : (isNaN(value) ? value : parseInt(value));
        }
        
        this.currentPage = 1; // Reset to first page when filtering
        this.applyFilters();
        this.refreshResults();
    }

    /**
     * Handle sort changes
     */
    handleSortChange(event) {
        const control = event.target;
        const sortType = control.dataset.sort;
        
        if (sortType === 'field') {
            this.sortBy = control.value;
        } else if (sortType === 'order') {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            control.textContent = this.sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending';
        }
        
        this.applySorting();
        this.refreshResults();
    }

    /**
     * Handle view mode changes
     */
    handleViewModeChange(event) {
        const button = event.target.closest('[data-view-mode]');
        const newViewMode = button.dataset.viewMode;
        
        if (newViewMode !== this.viewMode) {
            this.viewMode = newViewMode;
            this.refreshResults();
        }
    }

    /**
     * Handle pagination clicks
     */
    handlePaginationClick(event) {
        const button = event.target.closest('.pagination-btn');
        if (button.disabled) return;
        
        const newPage = parseInt(button.dataset.page);
        if (newPage !== this.currentPage) {
            this.currentPage = newPage;
            this.refreshResults();
            this.scrollToTop();
        }
    }

    /**
     * Handle compare button clicks
     */
    handleCompareClick(event) {
        const button = event.target.closest('[data-action="compare"]');
        const bookId = button.dataset.bookId;
        
        eventBus.emit('search:compareBook', { bookId });
    }

    /**
     * Apply current filters to results
     */
    applyFilters() {
        this.filteredResults = this.currentResults.filter(result => {
            // Language filter
            if (this.filters.language !== 'all' && result.language !== this.filters.language) {
                return false;
            }
            
            // Published year filters
            const publishedYear = this.extractYear(result.publishedDate);
            if (publishedYear) {
                if (this.filters.publishedAfter && publishedYear < this.filters.publishedAfter) {
                    return false;
                }
                if (this.filters.publishedBefore && publishedYear > this.filters.publishedBefore) {
                    return false;
                }
            }
            
            // Page count filters
            if (result.pageCount) {
                if (this.filters.minPages && result.pageCount < this.filters.minPages) {
                    return false;
                }
                if (this.filters.maxPages && result.pageCount > this.filters.maxPages) {
                    return false;
                }
            }
            
            // Preview availability filter
            if (this.filters.hasPreview && !result.previewLink) {
                return false;
            }
            
            // Categories filter
            if (this.filters.categories.length > 0) {
                const resultCategories = result.categories || [];
                const hasMatchingCategory = this.filters.categories.some(filterCat => 
                    resultCategories.some(resultCat => 
                        resultCat.toLowerCase().includes(filterCat.toLowerCase())
                    )
                );
                if (!hasMatchingCategory) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Apply current sorting to filtered results
     */
    applySorting() {
        this.filteredResults.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortBy) {
                case 'title':
                    aValue = a.title?.toLowerCase() || '';
                    bValue = b.title?.toLowerCase() || '';
                    break;
                case 'publishedDate':
                    aValue = this.extractYear(a.publishedDate) || 0;
                    bValue = this.extractYear(b.publishedDate) || 0;
                    break;
                case 'pageCount':
                    aValue = a.pageCount || 0;
                    bValue = b.pageCount || 0;
                    break;
                case 'rating':
                    aValue = a.averageRating || 0;
                    bValue = b.averageRating || 0;
                    break;
                case 'relevance':
                default:
                    aValue = a.relevanceScore || 0;
                    bValue = b.relevanceScore || 0;
                    break;
            }
            
            if (this.sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
    }

    /**
     * Refresh the current results display
     */
    refreshResults() {
        const container = DOMUtils.query('.search-results-container');
        if (container) {
            const resultsGrid = DOMUtils.query('.search-results-grid', container);
            const summary = DOMUtils.query('.search-results-summary', container);
            const pagination = DOMUtils.query('.search-pagination', container);
            
            if (resultsGrid) {
                resultsGrid.innerHTML = this.renderResults();
                resultsGrid.dataset.viewMode = this.viewMode;
                this.loadBookCovers();
            }
            
            if (summary) {
                summary.innerHTML = this.renderResultsSummary();
            }
            
            if (pagination) {
                pagination.outerHTML = this.renderPagination();
                this.setupPaginationListeners();
            }
            
            // Update view mode buttons
            const viewModeButtons = DOMUtils.queryAll('[data-view-mode]', container);
            viewModeButtons.forEach(button => {
                const isActive = button.dataset.viewMode === this.viewMode;
                button.className = `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`;
            });
        }
    }

    /**
     * Setup pagination listeners after refresh
     */
    setupPaginationListeners() {
        const paginationButtons = DOMUtils.queryAll('.pagination-btn');
        paginationButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handlePaginationClick(e));
        });
    }

    /**
     * Reset all filters to default values
     */
    resetFilters() {
        this.filters = {
            language: 'all',
            publishedAfter: null,
            publishedBefore: null,
            minPages: 0,
            maxPages: null,
            hasPreview: false,
            categories: []
        };
        
        this.currentPage = 1;
        this.applyFilters();
        this.refreshResults();
        
        // Reset filter UI
        const container = DOMUtils.query('.search-results-container');
        if (container) {
            // Reset select elements
            const selects = DOMUtils.queryAll('select[data-filter]', container);
            selects.forEach(select => {
                if (select.dataset.filter === 'language') {
                    select.value = 'all';
                }
            });
            
            // Reset input elements
            const inputs = DOMUtils.queryAll('input[data-filter]', container);
            inputs.forEach(input => {
                if (input.type === 'checkbox') {
                    input.checked = false;
                } else {
                    input.value = '';
                }
            });
        }
    }

    /**
     * Load book covers using BookCoverManager
     */
    loadBookCovers() {
        if (!this.bookCoverManager) return;
        
        const bookElements = DOMUtils.queryAll('[data-book-id]');
        bookElements.forEach(element => {
            const bookId = element.dataset.bookId;
            const book = this.currentResults.find(b => b.id === bookId);
            if (book) {
                // Cover loading is handled by BookCoverManager in renderBookCover
                console.log(`📖 Cover loaded for: ${book.title}`);
            }
        });
    }

    /**
     * Utility methods
     */
    
    getBestCoverImage(result) {
        return result.thumbnail || 
               result.smallThumbnail || 
               result.mediumThumbnail || 
               result.largeThumbnail || 
               (result.imageLinks?.thumbnail) ||
               (result.imageLinks?.smallThumbnail) ||
               null;
    }

    formatRating(rating, count) {
        if (!rating || rating === 0) {
            return { display: null, stars: '' };
        }
        
        const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
        const display = `${rating.toFixed(1)}${count ? ` (${count} reviews)` : ''}`;
        
        return { display, stars };
    }

    extractYear(dateString) {
        if (!dateString) return null;
        const match = dateString.match(/(\d{4})/);
        return match ? parseInt(match[1]) : null;
    }

    formatCategories(categories) {
        if (!categories || categories.length === 0) return null;
        return categories.slice(0, 3).join(', ') + (categories.length > 3 ? '...' : '');
    }

    escapeForAttribute(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    generateFallbackSVG(title) {
        const shortTitle = title.substring(0, 10);
        return `<svg width="128" height="192" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#e5e7eb"/>
            <text x="50%" y="50%" text-anchor="middle" font-size="12" fill="#6b7280">
                ${shortTitle}
            </text>
        </svg>`;
    }

    getAvailableLanguages() {
        const languageCounts = {};
        this.currentResults.forEach(result => {
            const lang = result.language || 'unknown';
            languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        });
        
        const languageNames = {
            'en': 'English',
            'es': 'Spanish', 
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'unknown': 'Unknown'
        };
        
        return Object.entries(languageCounts)
            .map(([code, count]) => ({
                code,
                name: languageNames[code] || code.toUpperCase(),
                count
            }))
            .sort((a, b) => b.count - a.count);
    }

    getAvailableCategories() {
        const categoryCounts = {};
        this.currentResults.forEach(result => {
            if (result.categories) {
                result.categories.forEach(category => {
                    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                });
            }
        });
        
        return Object.entries(categoryCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    getPublishedYearRange() {
        const years = this.currentResults
            .map(result => this.extractYear(result.publishedDate))
            .filter(year => year !== null);
        
        return {
            min: years.length > 0 ? Math.min(...years) : 1900,
            max: years.length > 0 ? Math.max(...years) : new Date().getFullYear()
        };
    }

    handleCoverClick(bookData, img) {
        // Emit event for cover click
        eventBus.emit('search:coverClicked', { book: bookData, element: img });
    }

    scrollToTop() {
        const container = DOMUtils.query('.search-results-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Public API methods for external control
     */
    
    setResults(results) {
        this.currentResults = results || [];
        this.currentPage = 1;
        this.applyFilters();
        this.applySorting();
    }

    addResult(result) {
        this.currentResults.push(result);
        this.applyFilters();
        this.applySorting();
    }

    removeResult(bookId) {
        this.currentResults = this.currentResults.filter(r => r.id !== bookId);
        this.applyFilters();
        this.applySorting();
    }

    setSortBy(field, order = 'desc') {
        this.sortBy = field;
        this.sortOrder = order;
        this.applySorting();
    }

    setViewMode(mode) {
        if (['cards', 'list', 'compact'].includes(mode)) {
            this.viewMode = mode;
        }
    }

    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.currentPage = 1;
        this.applyFilters();
    }

    getCurrentResults() {
        return this.filteredResults;
    }

    getStats() {
        return {
            totalResults: this.currentResults.length,
            filteredResults: this.filteredResults.length,
            currentPage: this.currentPage,
            totalPages: Math.ceil(this.filteredResults.length / this.itemsPerPage),
            viewMode: this.viewMode,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            activeFilters: Object.entries(this.filters).filter(([key, value]) => {
                if (Array.isArray(value)) return value.length > 0;
                if (key === 'language') return value !== 'all';
                if (key === 'minPages') return value > 0;
                return value !== null && value !== false;
            }).length
        };
    }
}