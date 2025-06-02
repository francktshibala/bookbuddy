/**
 * Enhanced GoogleBooksAPI - Component 10.1
 * Advanced Google Books API integration with caching, batch search, and enhanced features
 */
import APIService from './APIService.js';
import { AsyncUtils } from '../../utils/Helpers.js';

export default class GoogleBooksAPI extends APIService {
    constructor() {
        super('https://www.googleapis.com/books/v1', {
            timeout: 8000,
            retries: 2,
            rateLimit: {
                requests: 50, // Google Books allows more requests
                window: 60000
            }
        });
        
        this.maxResults = 20;
        this.cache = new Map(); // Search result cache
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.searchHistory = [];
        this.maxHistorySize = 100;
        
        // Enhanced search capabilities
        this.searchFilters = {
            subjects: [],
            languages: [],
            printTypes: ['books', 'magazines'],
            orderBy: ['relevance', 'newest']
        };
        
        console.log('🚀 Enhanced GoogleBooksAPI initialized');
    }

    /**
     * Enhanced search with caching and advanced options
     */
    async searchBooks(query, options = {}) {
        if (!query || query.trim().length === 0) {
            return this.createErrorResponse('Search query is required');
        }

        const searchOptions = {
            maxResults: options.maxResults || this.maxResults,
            startIndex: options.startIndex || 0,
            orderBy: options.orderBy || 'relevance',
            printType: options.printType || 'books',
            langRestrict: options.language || null,
            ...options
        };

        // Create cache key
        const cacheKey = this.createCacheKey(query, searchOptions);
        
        // Check cache first
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
            console.log(`📦 Using cached result for: "${query}"`);
            return cachedResult;
        }

        try {
            console.log(`🔍 Enhanced search for: "${query}"`);
            
            // Build search parameters
            const params = this.buildSearchParams(query, searchOptions);
            const endpoint = `/volumes?${params}`;
            
            // Add to search history
            this.addToSearchHistory(query, searchOptions);
            
            // Make API request
            const result = await this.request(endpoint);
            
            if (result.success && result.data) {
                const searchResult = this.processSearchResult(result.data, query, searchOptions);
                
                // Cache the result
                this.cacheResult(cacheKey, searchResult);
                
                return searchResult;
            } else {
                return this.createErrorResponse(result.userMessage || result.message || 'Search failed', query);
            }
            
        } catch (error) {
            console.error('❌ Enhanced Google Books search error:', error);
            return this.createErrorResponse(`Search failed: ${error.message}`, query);
        }
    }

    /**
     * Search by ISBN with enhanced validation
     */
    async searchByISBN(isbn, options = {}) {
        const cleanISBN = this.normalizeISBN(isbn);
        
        if (!this.isValidISBN(cleanISBN)) {
            return this.createErrorResponse(`Invalid ISBN format: ${isbn}`);
        }

        console.log(`📚 Searching by ISBN: ${cleanISBN}`);
        
        const searchQuery = `isbn:${cleanISBN}`;
        const result = await this.searchBooks(searchQuery, {
            ...options,
            maxResults: 5, // ISBNs should return few results
            orderBy: 'relevance'
        });

        if (result.success && result.books.length > 0) {
            // Find exact ISBN match
            const exactMatch = result.books.find(book => 
                book.isbn10 === cleanISBN || book.isbn13 === cleanISBN
            );
            
            if (exactMatch) {
                return {
                    ...result,
                    books: [exactMatch, ...result.books.filter(b => b !== exactMatch)],
                    exactMatch: true
                };
            }
        }

        return result;
    }

    /**
     * Search by author with smart name handling
     */
    async searchByAuthor(author, options = {}) {
        if (!author || author.trim().length === 0) {
            return this.createErrorResponse('Author name is required');
        }

        const normalizedAuthor = this.normalizeAuthorName(author);
        console.log(`👤 Searching by author: ${normalizedAuthor}`);
        
        const searchQuery = `inauthor:"${normalizedAuthor}"`;
        return await this.searchBooks(searchQuery, {
            ...options,
            orderBy: options.orderBy || 'newest'
        });
    }

    /**
     * Search by title with fuzzy matching
     */
    async searchByTitle(title, options = {}) {
        if (!title || title.trim().length === 0) {
            return this.createErrorResponse('Title is required');
        }

        console.log(`📖 Searching by title: ${title}`);
        
        // Try exact title first
        let searchQuery = `intitle:"${title}"`;
        let result = await this.searchBooks(searchQuery, options);
        
        // If no exact matches, try fuzzy search
        if (result.success && result.books.length === 0) {
            console.log(`🔄 No exact matches, trying fuzzy search for: ${title}`);
            searchQuery = `intitle:${title}`;
            result = await this.searchBooks(searchQuery, options);
        }

        return result;
    }

    /**
     * Search by subject/category
     */
    async searchBySubject(subject, options = {}) {
        if (!subject || subject.trim().length === 0) {
            return this.createErrorResponse('Subject is required');
        }

        console.log(`🏷️ Searching by subject: ${subject}`);
        
        const searchQuery = `subject:"${subject}"`;
        return await this.searchBooks(searchQuery, {
            ...options,
            orderBy: options.orderBy || 'relevance'
        });
    }

    /**
     * Advanced multi-criteria search
     */
    async advancedSearch(criteria, options = {}) {
        const queryParts = [];
        
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
            const cleanISBN = this.normalizeISBN(criteria.isbn);
            queryParts.push(`isbn:${cleanISBN}`);
        }
        
        if (criteria.publisher) {
            queryParts.push(`inpublisher:"${criteria.publisher}"`);
        }
        
        if (criteria.keywords) {
            queryParts.push(criteria.keywords);
        }
        
        if (queryParts.length === 0) {
            return this.createErrorResponse('At least one search criteria is required');
        }
        
        const searchQuery = queryParts.join(' ');
        console.log(`🎯 Advanced search: ${searchQuery}`);
        
        return await this.searchBooks(searchQuery, options);
    }

    /**
     * Batch search for multiple queries
     */
    async batchSearch(queries, options = {}) {
        if (!Array.isArray(queries) || queries.length === 0) {
            return this.createErrorResponse('Queries array is required');
        }

        console.log(`📚 Batch searching ${queries.length} queries`);
        
        const results = [];
        const batchOptions = { 
            ...options, 
            maxResults: Math.min(options.maxResults || 5, 10) // Limit per query
        };
        
        // Process queries with rate limiting
        for (let i = 0; i < queries.length; i++) {
            try {
                console.log(`🔍 Batch ${i + 1}/${queries.length}: "${queries[i]}"`);
                
                const result = await this.searchBooks(queries[i], batchOptions);
                
                if (result.success && result.books.length > 0) {
                    results.push(...result.books.map(book => ({
                        ...book,
                        batchQuery: queries[i],
                        batchIndex: i
                    })));
                }
                
                // Add small delay to avoid rate limiting
                if (i < queries.length - 1) {
                    await AsyncUtils.delay(200);
                }
                
            } catch (error) {
                console.warn(`⚠️ Batch search failed for "${queries[i]}":`, error.message);
            }
        }
        
        // Remove duplicates by ID
        const uniqueBooks = this.removeDuplicateBooks(results);
        
        return {
            success: true,
            books: uniqueBooks,
            totalQueries: queries.length,
            totalResults: uniqueBooks.length,
            source: 'Google Books Batch',
            batchSearch: true
        };
    }

    /**
     * Get trending/popular books
     */
    async getTrendingBooks(category = null, options = {}) {
        const queries = category ? 
            [`subject:"${category}"`, `${category} bestseller`] :
            ['bestseller', 'popular fiction', 'trending books'];
        
        console.log(`📈 Getting trending books${category ? ` in ${category}` : ''}`);
        
        return await this.batchSearch(queries, {
            ...options,
            orderBy: 'newest',
            maxResults: 5
        });
    }

    /**
     * Enhanced book details with additional metadata
     */
    async getEnhancedBookDetails(bookId) {
        try {
            console.log(`📋 Getting enhanced details for book: ${bookId}`);
            
            const result = await this.request(`/volumes/${bookId}`);
            
            if (result.success && result.data) {
                const book = this.formatBookData(result.data);
                
                // Enhance with additional data
                book.enhanced = true;
                book.retrievedAt = new Date().toISOString();
                
                return {
                    success: true,
                    book,
                    source: 'Google Books Enhanced'
                };
            } else {
                return {
                    success: false,
                    message: result.userMessage || result.message || 'Failed to get book details',
                    source: 'Google Books Enhanced'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Failed to get enhanced book details: ${error.message}`,
                source: 'Google Books Enhanced'
            };
        }
    }

    /**
     * Build search parameters with enhanced options
     */
    buildSearchParams(query, options) {
        const params = new URLSearchParams({
            q: query.trim(),
            maxResults: Math.min(options.maxResults, 40), // Google Books limit
            startIndex: options.startIndex || 0,
            orderBy: options.orderBy || 'relevance',
            printType: options.printType || 'books'
        });

        if (options.langRestrict) {
            params.append('langRestrict', options.langRestrict);
        }

        if (options.filter) {
            params.append('filter', options.filter);
        }

        return params.toString();
    }

    /**
     * Process and enhance search results
     */
    processSearchResult(data, query, options) {
        const books = data.items ? data.items.map(item => this.formatBookData(item)) : [];
        
        // Sort by relevance score if available
        books.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        
        console.log(`✅ Processed ${books.length} books for "${query}"`);
        
        return {
            success: true,
            books,
            totalItems: data.totalItems || 0,
            query,
            searchOptions: options,
            source: 'Google Books Enhanced',
            enhanced: true,
            searchedAt: new Date().toISOString()
        };
    }

    /**
     * Enhanced book data formatting with additional fields
     */
    formatBookData(item) {
        const volumeInfo = item.volumeInfo || {};
        const saleInfo = item.saleInfo || {};
        const accessInfo = item.accessInfo || {};

        const book = {
            // Basic info
            id: item.id,
            title: volumeInfo.title || 'Unknown Title',
            subtitle: volumeInfo.subtitle || '',
            authors: volumeInfo.authors || ['Unknown Author'],
            publisher: volumeInfo.publisher || '',
            publishedDate: volumeInfo.publishedDate || '',
            description: volumeInfo.description || 'No description available.',
            
            // Content info
            pageCount: volumeInfo.pageCount || 0,
            categories: volumeInfo.categories || [],
            language: volumeInfo.language || 'en',
            maturityRating: volumeInfo.maturityRating || 'NOT_MATURE',
            
            // Images with fallbacks
            thumbnail: this.getBestThumbnail(volumeInfo.imageLinks),
            smallThumbnail: volumeInfo.imageLinks?.smallThumbnail || '',
            mediumThumbnail: volumeInfo.imageLinks?.medium || '',
            largeThumbnail: volumeInfo.imageLinks?.large || '',
            
            // Identifiers
            industryIdentifiers: volumeInfo.industryIdentifiers || [],
            isbn10: this.extractISBN(volumeInfo.industryIdentifiers, 'ISBN_10'),
            isbn13: this.extractISBN(volumeInfo.industryIdentifiers, 'ISBN_13'),
            
            // Links
            previewLink: volumeInfo.previewLink || '',
            infoLink: volumeInfo.infoLink || '',
            canonicalVolumeLink: volumeInfo.canonicalVolumeLink || '',
            
            // Access and availability
            viewability: accessInfo.viewability || 'NO_PAGES',
            embeddable: accessInfo.embeddable || false,
            publicDomain: accessInfo.publicDomain || false,
            
            // Sales info
            saleability: saleInfo.saleability || 'NOT_FOR_SALE',
            isEbook: saleInfo.isEbook || false,
            
            // Ratings and reviews
            averageRating: volumeInfo.averageRating || 0,
            ratingsCount: volumeInfo.ratingsCount || 0,
            
            // Enhanced metadata
            wordCount: this.estimateWordCount(volumeInfo.pageCount),
            readingTime: this.estimateReadingTime(volumeInfo.pageCount),
            releaseYear: this.extractYear(volumeInfo.publishedDate),
            
            // Source and tracking
            source: 'Google Books',
            sourceId: item.id,
            lastUpdated: new Date().toISOString(),
            relevanceScore: this.calculateRelevanceScore(item)
        };

        return book;
    }

    /**
     * Utility Methods
     */
    
    getBestThumbnail(imageLinks) {
        if (!imageLinks) return '';
        return imageLinks.thumbnail || 
               imageLinks.smallThumbnail || 
               imageLinks.medium || 
               imageLinks.small || '';
    }

    normalizeISBN(isbn) {
        return isbn.replace(/[-\s]/g, '');
    }

    isValidISBN(isbn) {
        return /^(978|979)?\d{9}[\dX]$/.test(isbn) || /^\d{9}[\dX]$/.test(isbn);
    }

    normalizeAuthorName(author) {
        return author.trim()
            .replace(/\s+/g, ' ')
            .replace(/,?\s*(Jr\.?|Sr\.?|III?|IV)$/i, '');
    }

    extractYear(dateString) {
        if (!dateString) return null;
        const match = dateString.match(/(\d{4})/);
        return match ? parseInt(match[1]) : null;
    }

    estimateWordCount(pageCount) {
        return pageCount ? Math.round(pageCount * 250) : 0; // ~250 words per page
    }

    estimateReadingTime(pageCount) {
        const wordCount = this.estimateWordCount(pageCount);
        return wordCount ? Math.round(wordCount / 250) : 0; // ~250 words per minute
    }

    calculateRelevanceScore(item) {
        let score = 0;
        const volumeInfo = item.volumeInfo || {};
        
        // Boost score for books with ratings
        if (volumeInfo.averageRating) {
            score += volumeInfo.averageRating * 2;
        }
        
        // Boost for number of ratings
        if (volumeInfo.ratingsCount) {
            score += Math.min(volumeInfo.ratingsCount / 100, 5);
        }
        
        // Boost for recent publications
        const year = this.extractYear(volumeInfo.publishedDate);
        if (year && year > 2000) {
            score += (year - 2000) / 10;
        }
        
        return Math.round(score * 10) / 10;
    }

    removeDuplicateBooks(books) {
        const seen = new Set();
        return books.filter(book => {
            if (seen.has(book.id)) return false;
            seen.add(book.id);
            return true;
        });
    }

    /**
     * Caching Methods
     */
    
    createCacheKey(query, options) {
        return `search:${query}:${JSON.stringify(options)}`;
    }

    getCachedResult(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.result;
        }
        this.cache.delete(key);
        return null;
    }

    cacheResult(key, result) {
        this.cache.set(key, {
            result,
            timestamp: Date.now()
        });
        
        // Clean old cache entries
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Search History Methods
     */
    
    addToSearchHistory(query, options) {
        const historyEntry = {
            query,
            options,
            timestamp: Date.now()
        };
        
        this.searchHistory.unshift(historyEntry);
        
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
    }

    getSearchHistory(limit = 10) {
        return this.searchHistory.slice(0, limit);
    }

    clearSearchHistory() {
        this.searchHistory = [];
    }

    /**
     * Helper Methods
     */
    
    createErrorResponse(message, query = null) {
        return {
            success: false,
            message,
            books: [],
            query,
            source: 'Google Books Enhanced'
        };
    }

    /**
     * Get enhanced statistics
     */
    getEnhancedStats() {
        const baseStats = this.getStats();
        
        return {
            ...baseStats,
            cacheSize: this.cache.size,
            searchHistorySize: this.searchHistory.length,
            cacheHitRate: this.calculateCacheHitRate()
        };
    }

    calculateCacheHitRate() {
        // This would need to be tracked over time
        return 'Not implemented';
    }
}