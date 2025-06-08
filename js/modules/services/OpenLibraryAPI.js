/**
 * OpenLibraryAPI - Component 10.5a
 * OpenLibrary.org API integration following GoogleBooksAPI patterns
 */
import APIService from './APIService.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';

export default class OpenLibraryAPI extends APIService {
    constructor() {
        super('https://openlibrary.org', {
            timeout: 8000,
            retries: 2,
            rateLimit: {
                requests: 100, // OpenLibrary is more permissive
                window: 60000
            },
            headers: {
                // Remove Content-Type to avoid CORS preflight
            }
        });
        
        this.maxResults = 20;
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        
        console.log('📚 OpenLibraryAPI initialized');
    }

    /**
     * Search by ISBN with enhanced validation
     */
    async searchByISBN(isbn, options = {}) {
        if (!isbn || isbn.trim().length === 0) {
            return this.createErrorResponse('ISBN is required');
        }

        const cleanISBN = this.normalizeISBN(isbn);
        
        if (!this.isValidISBN(cleanISBN)) {
            return this.createErrorResponse(`Invalid ISBN format: ${isbn}`);
        }

        console.log(`📚 Searching OpenLibrary by ISBN: ${cleanISBN}`);
        
        // Check cache first
        const cacheKey = `isbn:${cleanISBN}`;
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
            console.log(`📦 Using cached OpenLibrary result for ISBN: ${cleanISBN}`);
            return cachedResult;
        }

        try {
            const endpoint = `/isbn/${cleanISBN}.json`;
            const result = await this.request(endpoint);
            
            if (result.success && result.data) {
                const book = this.formatBookData(result.data);
                
                const searchResult = {
                    success: true,
                    book,
                    source: 'OpenLibrary',
                    searchType: 'isbn',
                    isbn: cleanISBN,
                    timestamp: new Date().toISOString()
                };
                
                // Cache the result
                this.cacheResult(cacheKey, searchResult);
                
                return searchResult;
            } else {
                return this.createErrorResponse(
                    result.userMessage || result.message || 'ISBN not found',
                    cleanISBN
                );
            }
            
        } catch (error) {
            console.error('❌ OpenLibrary ISBN search error:', error);
            return this.createErrorResponse(`ISBN search failed: ${error.message}`, cleanISBN);
        }
    }

    /**
     * Search by title with options
     */
    async searchByTitle(title, options = {}) {
        if (!title || title.trim().length === 0) {
            return this.createErrorResponse('Title is required');
        }

        const searchOptions = {
            maxResults: options.maxResults || this.maxResults,
            limit: Math.min(options.maxResults || this.maxResults, 100), // OpenLibrary limit
            ...options
        };

        console.log(`📖 Searching OpenLibrary by title: "${title}"`);
        
        // Check cache
        const cacheKey = `title:${title}:${JSON.stringify(searchOptions)}`;
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
            console.log(`📦 Using cached OpenLibrary result for title: "${title}"`);
            return cachedResult;
        }

        try {
            const params = new URLSearchParams({
                title: title.trim(),
                limit: searchOptions.limit
            });

            const endpoint = `/search.json?${params}`;
            const result = await this.request(endpoint);
            
            if (result.success && result.data) {
                const books = this.processSearchResponse(result.data);
                
                const searchResult = {
                    success: true,
                    books,
                    totalItems: result.data.numFound || 0,
                    query: title,
                    searchOptions,
                    source: 'OpenLibrary',
                    searchType: 'title',
                    timestamp: new Date().toISOString()
                };
                
                // Cache the result
                this.cacheResult(cacheKey, searchResult);
                
                console.log(`✅ Found ${books.length} books on OpenLibrary for "${title}"`);
                return searchResult;
            } else {
                return this.createErrorResponse(
                    result.userMessage || result.message || 'Title search failed',
                    title
                );
            }
            
        } catch (error) {
            console.error('❌ OpenLibrary title search error:', error);
            return this.createErrorResponse(`Title search failed: ${error.message}`, title);
        }
    }

    /**
     * Search by author
     */
    async searchByAuthor(author, options = {}) {
        if (!author || author.trim().length === 0) {
            return this.createErrorResponse('Author name is required');
        }

        console.log(`👤 Searching OpenLibrary by author: "${author}"`);
        
        try {
            const params = new URLSearchParams({
                author: author.trim(),
                limit: Math.min(options.maxResults || this.maxResults, 100)
            });

            const endpoint = `/search.json?${params}`;
            const result = await this.request(endpoint);
            
            if (result.success && result.data) {
                const books = this.processSearchResponse(result.data);
                
                return {
                    success: true,
                    books,
                    totalItems: result.data.numFound || 0,
                    query: author,
                    source: 'OpenLibrary',
                    searchType: 'author',
                    timestamp: new Date().toISOString()
                };
            } else {
                return this.createErrorResponse(
                    result.userMessage || result.message || 'Author search failed',
                    author
                );
            }
            
        } catch (error) {
            console.error('❌ OpenLibrary author search error:', error);
            return this.createErrorResponse(`Author search failed: ${error.message}`, author);
        }
    }

    /**
     * Process OpenLibrary search response into book array
     */
    processSearchResponse(data) {
        if (!data.docs || !Array.isArray(data.docs)) {
            console.warn('⚠️ No docs found in OpenLibrary response');
            return [];
        }

        return data.docs
            .map(doc => this.formatBookData(doc))
            .filter(book => {
                // Filter out books without essential information
                return book.title && 
                       book.title !== 'Unknown Title' && 
                       book.authors.length > 0;
            });
    }

    /**
     * Format OpenLibrary response into standardized book format
     */
    formatBookData(item) {
        // Handle both ISBN lookup format and search format
        const isISBNLookup = !item.docs; // ISBN lookup returns direct object
        const data = isISBNLookup ? item : item;

        const book = {
            // Basic info
            id: this.generateBookId(data),
            title: data.title || 'Unknown Title',
            subtitle: data.subtitle || '',
            authors: this.extractAuthors(data),
            publisher: this.extractPublisher(data),
            publishedDate: this.extractPublishedDate(data),
            description: this.extractDescription(data),
            
            // Content info
            pageCount: data.number_of_pages || data.number_of_pages_median || 0,
            categories: this.extractSubjects(data),
            language: data.language || 'en',
            
            // Images
            thumbnail: this.buildCoverURL(data.cover_i || (data.covers && data.covers[0])),
            smallThumbnail: this.buildCoverURL(data.cover_i || (data.covers && data.covers[0]), 'S'),
            mediumThumbnail: this.buildCoverURL(data.cover_i || (data.covers && data.covers[0]), 'M'),
            largeThumbnail: this.buildCoverURL(data.cover_i || (data.covers && data.covers[0]), 'L'),
            
            // Identifiers
            isbn10: this.extractISBN(data, 'isbn_10'),
            isbn13: this.extractISBN(data, 'isbn_13'),
            
            // Enhanced metadata
            releaseYear: this.extractYear(data.first_publish_year || data.publish_date),
            wordCount: this.estimateWordCount(data.number_of_pages || data.number_of_pages_median),
            readingTime: this.estimateReadingTime(data.number_of_pages || data.number_of_pages_median),
            
            // Source and tracking
            source: 'OpenLibrary',
            sourceId: data.key || data.work_key || this.generateBookId(data),
            lastUpdated: new Date().toISOString(),
            openLibraryKey: data.key || data.work_key
        };

        return book;
    }

    /**
     * Utility Methods
     */
    
    generateBookId(data) {
        // Use OpenLibrary key if available, otherwise generate ID
        if (data.key) return data.key.replace('/works/', 'ol_work_');
        if (data.work_key) return data.work_key.replace('/works/', 'ol_work_');
        
        // Fallback to generated ID
        const isbn = this.extractISBN(data, 'isbn_13') || this.extractISBN(data, 'isbn_10');
        if (isbn) return `ol_isbn_${isbn}`;
        
        const title = (data.title || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '_');
        return `ol_${title}_${Date.now()}`;
    }

    extractAuthors(data) {
        // Handle different author formats
        if (data.authors && Array.isArray(data.authors)) {
            return data.authors.map(author => author.name || author).filter(Boolean);
        }
        
        if (data.author_name && Array.isArray(data.author_name)) {
            return data.author_name;
        }
        
        if (typeof data.author_name === 'string') {
            return [data.author_name];
        }
        
        return ['Unknown Author'];
    }

    extractPublisher(data) {
        if (data.publishers && Array.isArray(data.publishers)) {
            return data.publishers[0] || '';
        }
        
        if (data.publisher && Array.isArray(data.publisher)) {
            return data.publisher[0] || '';
        }
        
        return data.publisher || '';
    }

    extractPublishedDate(data) {
        return data.publish_date || 
               (data.first_publish_year ? data.first_publish_year.toString() : '') ||
               '';
    }

    extractDescription(data) {
        if (data.description) {
            if (typeof data.description === 'string') {
                return data.description;
            }
            if (data.description.value) {
                return data.description.value;
            }
        }
        
        return 'No description available.';
    }

    extractSubjects(data) {
        if (data.subjects && Array.isArray(data.subjects)) {
            return data.subjects.slice(0, 10); // Limit to first 10 subjects
        }
        
        if (data.subject && Array.isArray(data.subject)) {
            return data.subject.slice(0, 10);
        }
        
        return [];
    }

    extractISBN(data, type) {
        const field = type === 'isbn_13' ? 'isbn_13' : 'isbn_10';
        
        if (data[field] && Array.isArray(data[field])) {
            return data[field][0] || '';
        }
        
        // Check in isbn array
        if (data.isbn && Array.isArray(data.isbn)) {
            const isbn = data.isbn.find(isbn => {
                const clean = isbn.replace(/[-\s]/g, '');
                return type === 'isbn_13' ? clean.length === 13 : clean.length === 10;
            });
            return isbn || '';
        }
        
        return '';
    }

    buildCoverURL(coverId, size = 'M') {
        if (!coverId) return '';
        return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
    }

    normalizeISBN(isbn) {
        return isbn.replace(/[-\s]/g, '');
    }

    isValidISBN(isbn) {
        return /^(978|979)?\d{9}[\dX]$/.test(isbn) || /^\d{9}[\dX]$/.test(isbn);
    }

    extractYear(dateString) {
        if (typeof dateString === 'number') return dateString;
        if (!dateString) return null;
        const match = dateString.toString().match(/(\d{4})/);
        return match ? parseInt(match[1]) : null;
    }

    estimateWordCount(pageCount) {
        return pageCount ? Math.round(pageCount * 250) : 0; // ~250 words per page
    }

    estimateReadingTime(pageCount) {
        const wordCount = this.estimateWordCount(pageCount);
        return wordCount ? Math.round(wordCount / 250) : 0; // ~250 words per minute
    }

    /**
     * Caching Methods (following GoogleBooksAPI pattern)
     */
    
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
        if (this.cache.size > 50) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Error Response Helper
     */
    createErrorResponse(message, query = null) {
        return {
            success: false,
            message,
            userMessage: message,
            query,
            source: 'OpenLibrary',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get service statistics
     */
    getStats() {
        const baseStats = super.getStats();
        
        return {
            ...baseStats,
            cacheSize: this.cache.size,
            serviceName: 'OpenLibrary'
        };
    }
}