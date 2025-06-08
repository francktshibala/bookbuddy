/**
 * BookListRenderer - Handles rendering of book lists and cards
 */
import { DateUtils, StringUtils } from '../../utils/Helpers.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';

export default class BookListRenderer {
    constructor(library) {  
        this.library = library;  
        this.renderMode = 'cards';
        this.sortBy = 'uploadDate';
        this.sortOrder = 'desc';
    }

    renderBookCards(books) {
        if (!Array.isArray(books) || books.length === 0) {
            return this.renderEmptyState();
        }

        const sortedBooks = this.sortBooks(books);
        
        return sortedBooks.map(book => this.renderBookCard(book)).join('');
    }

    renderBookCard(book) {
        const progress = book.getProgress();
        const stats = book.getReadingStats();
        
        return `
            <div class="book-card" data-book-id="${book.id}">
                <div class="book-header">
                    <div class="book-title">${StringUtils.escapeHtml(book.title)}</div>
                    <div class="book-menu">
                        <button class="btn-menu" title="More options">⋯</button>
                    </div>
                </div>
                
                <div class="book-meta">
                    <div class="book-filename">📄 ${StringUtils.escapeHtml(book.filename)}</div>
                    <div class="book-stats">
                        <span class="word-count">${book.wordCount.toLocaleString()} words</span>
                        ${book.lastRead ? `<span class="last-read">Last read ${DateUtils.getRelativeTime(book.lastRead)}</span>` : ''}
                    </div>
                </div>

                <div class="book-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress * 100}%"></div>
                    </div>
                    <div class="progress-text">
                        ${stats.progressPercent}% complete • ${stats.wordsRemaining.toLocaleString()} words remaining
                        ${stats.estimatedTimeRemaining > 0 ? `• ~${stats.estimatedTimeRemaining} min` : ''}
                    </div>
                </div>

                <div class="book-status">
                    ${this.getStatusBadge(progress)}
                    <span class="upload-date">Added ${DateUtils.formatDate(book.uploadDate)}</span>
                </div>

                <div class="book-actions">
                    <button class="btn btn-sm btn-primary btn-read" title="Continue reading">
                        ${progress > 0 ? '📖 Continue' : '📖 Start Reading'}
                    </button>
                    <button class="btn btn-sm btn-outline btn-details" title="View details">
                        📋 Details
                    </button>
                    <button class="btn btn-sm btn-outline-primary ai-analysis-btn" 
                            data-book-id="${book.id}" 
                            title="AI Analysis">
                        🤖 AI Analysis
                    </button>
                    <button class="btn btn-sm btn-outline btn-delete" title="Delete book">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    renderBookList(books) {
        if (!Array.isArray(books) || books.length === 0) {
            return this.renderEmptyState();
        }

        const sortedBooks = this.sortBooks(books);
        
        return `
            <div class="book-list">
                <div class="list-header">
                    <div class="list-title">Title</div>
                    <div class="list-progress">Progress</div>
                    <div class="list-words">Words</div>
                    <div class="list-date">Added</div>
                    <div class="list-actions">Actions</div>
                </div>
                ${sortedBooks.map(book => this.renderBookListItem(book)).join('')}
            </div>
        `;
    }

    renderBookListItem(book) {
        const progress = book.getProgress();
        const stats = book.getReadingStats();
        
        return `
            <div class="book-list-item" data-book-id="${book.id}">
                <div class="list-title">
                    <div class="book-title">${StringUtils.escapeHtml(book.title)}</div>
                    <div class="book-filename">${StringUtils.escapeHtml(book.filename)}</div>
                </div>
                <div class="list-progress">
                    <div class="progress-bar-small">
                        <div class="progress-fill" style="width: ${progress * 100}%"></div>
                    </div>
                    <span>${stats.progressPercent}%</span>
                </div>
                <div class="list-words">${book.wordCount.toLocaleString()}</div>
                <div class="list-date">${DateUtils.formatDate(book.uploadDate)}</div>
                <div class="list-actions">
                    <button class="btn btn-sm btn-primary btn-read">
                        ${progress > 0 ? 'Continue' : 'Start'}
                    </button>
                    <button class="btn btn-sm btn-outline btn-delete">Delete</button>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>No books found</h3>
                <p>Your library is empty or no books match your current filter.</p>
                <button class="btn btn-primary" onclick="document.getElementById('upload-book-btn').click()">
                    📤 Upload Your First Book
                </button>
            </div>
        `;
    }

    // Enhanced renderSearchResults method - ADD THIS TO BookListRenderer.js
    renderSearchResults(results) {
        if (!Array.isArray(results) || results.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No search results</h3>
                    <p>Try different search terms like:</p>
                    <ul style="text-align: left; display: inline-block; margin: 1rem 0;">
                        <li>"javascript programming"</li>
                        <li>"python cookbook"</li>
                        <li>"agatha christie"</li>
                        <li>"science fiction"</li>
                    </ul>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">
                        Make sure you have an internet connection.
                    </p>
                </div>
            `;
        }

        return results.map(result => this.renderSearchResultCard(result)).join('');
    }

    // Enhanced renderSearchResultCard method - ADD THIS TO BookListRenderer.js
    renderSearchResultCard(result) {
        return `
            <div class="search-result-card">
                <div class="result-header">
                    <div class="result-title">${StringUtils.escapeHtml(result.title)}</div>
                    <div class="result-source">${result.source}</div>
                </div>
                
                ${result.authors ? `
                    <div class="result-authors">
                        by ${result.authors.join(', ')}
                    </div>
                ` : ''}
                
                ${result.description ? `
                    <div class="result-description">
                        ${StringUtils.truncate(StringUtils.escapeHtml(result.description), 200)}
                    </div>
                ` : ''}
                
                <div class="result-meta">
                    ${result.publishedDate ? `<span>📅 ${result.publishedDate}</span>` : ''}
                    ${result.pageCount ? `<span>📄 ${result.pageCount} pages</span>` : ''}
                    ${result.language && result.language !== 'en' ? `<span>🌐 ${result.language.toUpperCase()}</span>` : ''}
                </div>
                
                <div class="result-actions">
                    <button class="btn btn-add-book btn-add-book" data-book-info='${JSON.stringify(result).replace(/'/g, "&apos;")}'>
                        📚 Add to Library
                    </button>
                    ${result.previewLink ? `
                        <a href="${result.previewLink}" target="_blank" class="btn btn-outline">
                            👁️ Preview
                        </a>
                    ` : ''}
                    ${result.infoLink ? `
                        <a href="${result.infoLink}" target="_blank" class="btn btn-outline">
                            ℹ️ More Info
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getStatusBadge(progress) {
        if (progress === 0) {
            return '<span class="status-badge status-unread">📋 Unread</span>';
        } else if (progress >= 1) {
            return '<span class="status-badge status-finished">✅ Finished</span>';
        } else {
            return '<span class="status-badge status-reading">📖 Reading</span>';
        }
    }

    sortBooks(books) {
        const sorted = [...books];
        
        sorted.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortBy) {
                case 'title':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'progress':
                    aValue = a.getProgress();
                    bValue = b.getProgress();
                    break;
                case 'wordCount':
                    aValue = a.wordCount;
                    bValue = b.wordCount;
                    break;
                case 'uploadDate':
                default:
                    aValue = new Date(a.uploadDate);
                    bValue = new Date(b.uploadDate);
                    break;
            }
            
            if (this.sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
        
        return sorted;
    }

    setSortOptions(sortBy, sortOrder = 'desc') {
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
    }

    setRenderMode(mode) {
        this.renderMode = mode;
    }

    renderSortControls() {
        return `
            <div class="sort-controls">
                <select class="sort-select" id="sort-by">
                    <option value="uploadDate" ${this.sortBy === 'uploadDate' ? 'selected' : ''}>Upload Date</option>
                    <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Title</option>
                    <option value="progress" ${this.sortBy === 'progress' ? 'selected' : ''}>Progress</option>
                    <option value="wordCount" ${this.sortBy === 'wordCount' ? 'selected' : ''}>Word Count</option>
                </select>
                <button class="sort-order-btn" id="sort-order" title="Toggle sort order">
                    ${this.sortOrder === 'asc' ? '↑' : '↓'}
                </button>
                <button class="view-mode-btn" id="view-mode" title="Toggle view mode">
                    ${this.renderMode === 'cards' ? '📋' : '📊'}
                </button>
            </div>
        `;
    }

    renderBookStats(books) {
        if (!Array.isArray(books) || books.length === 0) {
            return '';
        }

        const totalBooks = books.length;
        const totalWords = books.reduce((sum, book) => sum + book.wordCount, 0);
        const avgProgress = books.reduce((sum, book) => sum + book.getProgress(), 0) / totalBooks;
        const booksRead = books.filter(book => book.getProgress() >= 1).length;
        const booksReading = books.filter(book => {
            const progress = book.getProgress();
            return progress > 0 && progress < 1;
        }).length;

        return `
            <div class="books-stats">
                <div class="stat-item">
                    <span class="stat-value">${totalBooks}</span>
                    <span class="stat-label">Books</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${totalWords.toLocaleString()}</span>
                    <span class="stat-label">Words</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${Math.round(avgProgress * 100)}%</span>
                    <span class="stat-label">Avg Progress</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${booksRead}</span>
                    <span class="stat-label">Finished</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${booksReading}</span>
                    <span class="stat-label">Reading</span>
                </div>
            </div>
        `;
    }

    // Helper method to create book card with loading state
    renderBookCardSkeleton() {
        return `
            <div class="book-card skeleton">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-meta"></div>
                <div class="skeleton-progress"></div>
                <div class="skeleton-actions"></div>
            </div>
        `;
    }

    // Method to render loading state while books are being fetched
    renderLoadingState(count = 6) {
        return Array(count).fill(0).map(() => this.renderBookCardSkeleton()).join('');
    }
    createEnhancedBookCard(book) {
    const card = document.createElement('div');
    card.className = `book-card ${book.enriched ? 'enriched-book' : 'standard-book'}`;
    card.dataset.bookId = book.id;
    
    card.innerHTML = `
        <div class="book-card-header">
            ${this.renderEnrichmentBadge(book)}
            ${this.renderDataQualityBadge(book)}
        </div>
        
        <div class="book-cover-container">
            <img class="book-cover" 
                 src="${book.thumbnail || '/assets/default-book-cover.svg'}" 
                 alt="${book.title}"
                 onerror="this.src='/assets/default-book-cover.svg'">
            ${book.enriched ? '<div class="enriched-overlay">✨</div>' : ''}
        </div>
        
        <div class="book-info">
            <h3 class="book-title">${this.escapeHtml(book.title)}</h3>
            <p class="book-authors">${this.formatAuthors(book.authors)}</p>
            
            ${book.enriched ? this.renderEnrichedMetadata(book) : ''}
            ${this.renderSourceBadges(book)}
        </div>  
        <div class="book-actions">
            <button class="btn btn-sm btn-primary btn-read" title="Continue reading">
                ${progress > 0 ? '📖 Continue' : '📖 Start Reading'}
            </button>
            <button class="btn btn-sm btn-outline btn-details" title="View details">
                📋 Details
            </button>
            ${!book.enriched ? `
                <button class="btn btn-sm btn-secondary btn-enrich" title="Enhance with online data">
                    ✨ Enrich
                </button>
            ` : `
                <div class="enriched-badge" title="Enhanced with data from ${(book.sources || []).join(' and ')}">
                    ✨ Enhanced
                </div>
            `}
            <button class="btn btn-sm btn-outline btn-delete" title="Delete book">
                🗑️ Delete
            </button>

        </div>
    `;
    
    return card;
}

renderEnrichmentBadge(book) {
    if (!book.enriched) return '';
    
    const badgeClass = book.sources && book.sources.length > 1 ? 
        'enriched-multiple' : 'enriched-single';
    
    return `
        <div class="enriched-indicator ${badgeClass}" title="Enhanced with data from multiple sources">
            <span class="enriched-icon">✨</span>
            <span class="enriched-text">Enhanced</span>
        </div>
    `;
}

renderDataQualityBadge(book) {
    if (!book.dataQuality) return '';
    
    const quality = book.dataQuality.completeness || 'Unknown';
    const percentage = book.dataQuality.percentage || 0;
    
    const qualityClass = {
        'Good': 'quality-good', 
        'Fair': 'quality-fair',
        'Poor': 'quality-poor'
    }[quality] || 'quality-unknown';
    
    return `
        <div class="data-quality-badge ${qualityClass}" 
             title="Data quality: ${quality} (${percentage}%)">
            <span class="quality-text">${quality}</span>
        </div>
    `;
}

renderSourceBadges(book) {
    if (!book.sources || book.sources.length === 0) return '';
    
    const badges = book.sources.map(source => {
        const sourceIcon = {
            'Google Books': '📚',
            'OpenLibrary': '📖'
        }[source] || '📄';
        
        return `<span class="source-badge">${sourceIcon} ${source}</span>`;
    }).join('');
    
    return `<div class="source-badges">${badges}</div>`;
}

renderEnrichedMetadata(book) {
    if (!book.enriched) return '';
    
    return `
        <div class="enriched-metadata">
            <div class="metadata-item">Enhanced: ${new Date(book.mergedAt).toLocaleDateString()}</div>
        </div>
    `;
}

// Add this method to setup AI analysis listeners
setupAIAnalysisListeners() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('ai-analysis-btn')) {
            const bookId = e.target.dataset.bookId;
            this.requestAIAnalysis(bookId);
        }
    });
}

async requestAIAnalysis(bookId) {
    try {
        const book = this.library.getBook(bookId);
        if (!book) return;

        // Show loading state
        eventBus.emit(EVENTS.LOADING_STATE_CHANGED, {
            isLoading: true,
            message: 'Generating AI analysis...'
        });

        // Request AI analysis
        eventBus.emit('ai:analysis:requested', {
            category: 'analysis',
            name: 'summary',
            bookData: book,
            options: {
                analysisDepth: 'detailed',
                includeQuotes: true
            }
        });

    } catch (error) {
        console.error('❌ AI analysis request failed:', error);
        eventBus.emit(EVENTS.ERROR_OCCURRED, {
            message: 'Failed to request AI analysis',
            error: error.message
        });
    }
}
}