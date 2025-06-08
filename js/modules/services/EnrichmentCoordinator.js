/**
 * EnrichmentCoordinator - Component 10.5c
 * Orchestrates GoogleBooks → OpenLibrary → BookDataMerger flow
 */
import { eventBus, EVENTS } from '../../utils/EventBus.js';

export default class EnrichmentCoordinator {
    constructor(googleBooksAPI, openLibraryAPI, bookDataMerger) {
        this.googleBooksAPI = googleBooksAPI;
        this.openLibraryAPI = openLibraryAPI;
        this.bookDataMerger = bookDataMerger;
        
        // Statistics tracking
        this.stats = {
            enrichments: 0,
            successes: 0,
            failures: 0,
            partialSuccesses: 0
        };
        
        // Enrichment-level caching (Component 10.5d)
        this.enrichmentCache = new Map();
        this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
        this.cacheLimit = 100; // Maximum cached entries
        this.cacheStats = {
            hits: 0,
            misses: 0,
            totalRequests: 0
        };
        
        console.log('🎯 EnrichmentCoordinator initialized with caching');
    }

    /**
     * Enrich book data by ISBN
     */
    async enrichByISBN(isbn, options = {}) {
        if (!isbn || isbn.trim().length === 0) {
            return this.createErrorResponse('ISBN is required');
        }

        console.log(`📚 Enriching book data for ISBN: ${isbn}`);
        
        // Check cache first (Component 10.5d)
        const cacheKey = this.createCacheKey(isbn, 'isbn');
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
            console.log(`📦 Using cached enrichment result for ISBN: ${isbn}`);
            this.cacheStats.hits++;
            this.cacheStats.totalRequests++;
            return cachedResult;
        }
        
        this.cacheStats.misses++;
        this.cacheStats.totalRequests++;
        
        // Emit enrichment started event
        eventBus.emit(EVENTS.API_REQUEST_STARTED, {
            type: 'enrichment',
            isbn,
            timestamp: new Date().toISOString()
        });

        try {
            this.stats.enrichments++;
            
            // Step 1: Get data from Google Books
            console.log('🔍 Step 1: Searching Google Books...');
            const googleResult = await this.googleBooksAPI.searchByISBN(isbn);
            
            // Step 2: Get data from OpenLibrary
            console.log('🔍 Step 2: Searching OpenLibrary...');
            const openLibraryResult = await this.openLibraryAPI.searchByISBN(isbn);
            
            // Step 3: Merge the data
            console.log('🔀 Step 3: Merging data sources...');
            const enrichmentResult = this.processEnrichmentResults(
                googleResult,
                openLibraryResult,
                { query: isbn, type: 'isbn' }
            );
            
            // Cache the result (Component 10.5d)
            if (enrichmentResult.success || enrichmentResult.partialSuccess) {
                this.cacheResult(cacheKey, enrichmentResult);
            }
            
            // Update statistics
            if (enrichmentResult.success) {
                this.stats.successes++;
            } else if (enrichmentResult.partialSuccess) {
                this.stats.partialSuccesses++;
            } else {
                this.stats.failures++;
            }
            
            // Emit completion event
            eventBus.emit(EVENTS.API_REQUEST_COMPLETED, {
                type: 'enrichment',
                isbn,
                success: enrichmentResult.success,
                timestamp: new Date().toISOString()
            });
            
            return enrichmentResult;
            
        } catch (error) {
            this.stats.failures++;
            console.error('❌ Enrichment error:', error);
            
            eventBus.emit(EVENTS.API_REQUEST_FAILED, {
                type: 'enrichment',
                isbn,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            return this.createErrorResponse(`Enrichment failed: ${error.message}`, isbn);
        }
    }

    /**
     * Enrich book data by title
     */
    async enrichByTitle(title, options = {}) {
        if (!title || title.trim().length === 0) {
            return this.createErrorResponse('Title is required');
        }

        console.log(`📖 Enriching book data for title: "${title}"`);
        
        const searchOptions = {
            maxResults: Math.min(options.maxResults || 5, 10), // Limit for enrichment
            ...options
        };

        // Check cache first (Component 10.5d)
        const cacheKey = this.createCacheKey(title, 'title', searchOptions);
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
            console.log(`📦 Using cached enrichment result for title: "${title}"`);
            this.cacheStats.hits++;
            this.cacheStats.totalRequests++;
            return cachedResult;
        }
        
        this.cacheStats.misses++;
        this.cacheStats.totalRequests++;

        try {
            this.stats.enrichments++;
            
            // Step 1: Get data from Google Books
            console.log('🔍 Step 1: Searching Google Books...');
            const googleResult = await this.googleBooksAPI.searchByTitle(title, searchOptions);
            
            // Step 2: Get data from OpenLibrary
            console.log('🔍 Step 2: Searching OpenLibrary...');
            const openLibraryResult = await this.openLibraryAPI.searchByTitle(title, searchOptions);
            
            // Step 3: Process and merge results
            console.log('🔀 Step 3: Processing and enriching results...');
            const enrichmentResult = this.processMultipleResults(
                googleResult,
                openLibraryResult,
                { query: title, type: 'title' }
            );
            
            // Cache the result (Component 10.5d)
            if (enrichmentResult.success || enrichmentResult.partialSuccess) {
                this.cacheResult(cacheKey, enrichmentResult);
            }
            
            // Update statistics
            if (enrichmentResult.success) {
                this.stats.successes++;
            } else if (enrichmentResult.partialSuccess) {
                this.stats.partialSuccesses++;
            } else {
                this.stats.failures++;
            }
            
            return enrichmentResult;
            
        } catch (error) {
            this.stats.failures++;
            console.error('❌ Title enrichment error:', error);
            return this.createErrorResponse(`Title enrichment failed: ${error.message}`, title);
        }
    }

    /**
     * Generic enrichment method
     */
    async enrichBook(query, type = 'isbn', options = {}) {
        switch (type.toLowerCase()) {
            case 'isbn':
                return await this.enrichByISBN(query, options);
            case 'title':
                return await this.enrichByTitle(query, options);
            default:
                return this.createErrorResponse(`Unsupported enrichment type: ${type}`);
        }
    }

    /**
     * Process enrichment results for single book (ISBN search)
     */
    processEnrichmentResults(googleResult, openLibraryResult, metadata) {
        const hasGoogleData = googleResult.success && googleResult.book;
        const hasOpenLibraryData = openLibraryResult.success && openLibraryResult.book;
        
        if (!hasGoogleData && !hasOpenLibraryData) {
            return {
                success: false,
                message: 'No data found from either source',
                sources: [],
                query: metadata.query,
                type: metadata.type,
                timestamp: new Date().toISOString()
            };
        }
        
        let enrichedBook;
        let sources = [];
        
        if (hasGoogleData && hasOpenLibraryData) {
            // Merge data from both sources
            console.log('🎯 Merging data from both Google Books and OpenLibrary');
            enrichedBook = this.bookDataMerger.merge(
                googleResult.book,
                openLibraryResult.book
            );
            sources = ['Google Books', 'OpenLibrary'];
            
        } else if (hasGoogleData) {
            // Only Google Books data available
            console.log('📘 Using Google Books data only');
            enrichedBook = this.bookDataMerger.addMergeMetadata(
                googleResult.book,
                ['Google Books']
            );
            sources = ['Google Books'];
            
        } else {
            // Only OpenLibrary data available
            console.log('📚 Using OpenLibrary data only');
            enrichedBook = this.bookDataMerger.addMergeMetadata(
                openLibraryResult.book,
                ['OpenLibrary']
            );
            sources = ['OpenLibrary'];
        }
        
        const success = hasGoogleData && hasOpenLibraryData;
        const partialSuccess = !success && (hasGoogleData || hasOpenLibraryData);
        
        console.log(`✅ Enrichment ${success ? 'completed' : partialSuccess ? 'partially completed' : 'failed'}`);
        console.log(`📊 Data quality: ${enrichedBook.dataQuality?.completeness || 'N/A'}`);
        
        return {
            success,
            partialSuccess,
            enrichedBook,
            sources,
            metadata: {
                ...metadata,
                googleBooksSuccess: hasGoogleData,
                openLibrarySuccess: hasOpenLibraryData,
                mergeQuality: enrichedBook.dataQuality
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Process multiple results for title searches
     */
    processMultipleResults(googleResult, openLibraryResult, metadata) {
        const googleBooks = googleResult.success ? googleResult.books || [] : [];
        const openLibraryBooks = openLibraryResult.success ? openLibraryResult.books || [] : [];
        
        if (googleBooks.length === 0 && openLibraryBooks.length === 0) {
            return {
                success: false,
                message: 'No books found from either source',
                enrichedBooks: [],
                query: metadata.query,
                type: metadata.type,
                timestamp: new Date().toISOString()
            };
        }
        
        console.log(`🔄 Processing ${googleBooks.length} Google Books + ${openLibraryBooks.length} OpenLibrary books`);
        
        const enrichedBooks = [];
        const processedISBNs = new Set();
        
        // Process Google Books first
        for (const googleBook of googleBooks) {
            const isbn = googleBook.isbn13 || googleBook.isbn10;
            
            // Find matching OpenLibrary book by ISBN or title
            const matchingOpenLibraryBook = this.findMatchingBook(googleBook, openLibraryBooks);
            
            let enrichedBook;
            if (matchingOpenLibraryBook) {
                // Merge the matching books
                enrichedBook = this.bookDataMerger.merge(googleBook, matchingOpenLibraryBook);
                console.log(`🔗 Merged: "${googleBook.title}" from both sources`);
            } else {
                // Use only Google Books data
                enrichedBook = this.bookDataMerger.addMergeMetadata(googleBook, ['Google Books']);
            }
            
            enrichedBooks.push(enrichedBook);
            
            if (isbn) {
                processedISBNs.add(isbn);
            }
        }
        
        // Add remaining OpenLibrary books that weren't matched
        for (const openLibraryBook of openLibraryBooks) {
            const isbn = openLibraryBook.isbn13 || openLibraryBook.isbn10;
            
            // Skip if already processed by ISBN
            if (isbn && processedISBNs.has(isbn)) {
                continue;
            }
            
            // Skip if already processed by title similarity
            const alreadyProcessed = enrichedBooks.some(book => 
                this.calculateTitleSimilarity(book.title, openLibraryBook.title) > 0.8
            );
            
            if (!alreadyProcessed) {
                const enrichedBook = this.bookDataMerger.addMergeMetadata(
                    openLibraryBook, 
                    ['OpenLibrary']
                );
                enrichedBooks.push(enrichedBook);
                console.log(`📚 Added: "${openLibraryBook.title}" from OpenLibrary only`);
            }
        }
        
        // Sort by data quality
        enrichedBooks.sort((a, b) => 
            (b.dataQuality?.percentage || 0) - (a.dataQuality?.percentage || 0)
        );
        
        const success = googleBooks.length > 0 && openLibraryBooks.length > 0;
        const partialSuccess = !success && enrichedBooks.length > 0;
        
        console.log(`✅ Processed ${enrichedBooks.length} enriched books`);
        
        return {
            success,
            partialSuccess,
            enrichedBooks,
            totalResults: enrichedBooks.length,
            sources: this.getUniqueSources(enrichedBooks),
            metadata: {
                ...metadata,
                googleBooksResults: googleBooks.length,
                openLibraryResults: openLibraryBooks.length,
                mergedResults: enrichedBooks.filter(book => book.sources.length > 1).length
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Find matching book between sources
     */
    findMatchingBook(targetBook, candidateBooks) {
        // Try exact ISBN match first
        const targetISBN = targetBook.isbn13 || targetBook.isbn10;
        if (targetISBN) {
            const isbnMatch = candidateBooks.find(book => 
                book.isbn13 === targetISBN || book.isbn10 === targetISBN
            );
            if (isbnMatch) return isbnMatch;
        }
        
        // Try title similarity matching
        let bestMatch = null;
        let bestSimilarity = 0;
        
        for (const candidate of candidateBooks) {
            const similarity = this.calculateTitleSimilarity(targetBook.title, candidate.title);
            if (similarity > 0.8 && similarity > bestSimilarity) {
                bestMatch = candidate;
                bestSimilarity = similarity;
            }
        }
        
        return bestMatch;
    }

    /**
     * Calculate title similarity (simple implementation)
     */
    calculateTitleSimilarity(title1, title2) {
        if (!title1 || !title2) return 0;
        
        const normalize = (str) => str.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        const norm1 = normalize(title1);
        const norm2 = normalize(title2);
        
        if (norm1 === norm2) return 1;
        
        // Simple word overlap calculation
        const words1 = norm1.split(' ');
        const words2 = norm2.split(' ');
        const intersection = words1.filter(word => words2.includes(word));
        
        return intersection.length / Math.max(words1.length, words2.length);
    }

    /**
     * Get unique sources from enriched books array
     */
    getUniqueSources(enrichedBooks) {
        const sources = new Set();
        enrichedBooks.forEach(book => {
            if (book.sources) {
                book.sources.forEach(source => sources.add(source));
            }
        });
        return Array.from(sources);
    }

    /**
     * Create error response
     */
    createErrorResponse(message, query = null) {
        return {
            success: false,
            message,
            query,
            timestamp: new Date().toISOString(),
            source: 'EnrichmentCoordinator'
        };
    }

    /**
     * Get enrichment statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.enrichments > 0 ? 
                Math.round((this.stats.successes / this.stats.enrichments) * 100) : 0,
            partialSuccessRate: this.stats.enrichments > 0 ? 
                Math.round((this.stats.partialSuccesses / this.stats.enrichments) * 100) : 0
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            enrichments: 0,
            successes: 0,
            failures: 0,
            partialSuccesses: 0
        };
    }

    /**
     * Component 10.5d - Caching Methods
     */
    
    /**
     * Create cache key for storing enrichment results
     */
    createCacheKey(query, type, options = {}) {
        const optionsStr = Object.keys(options).length > 0 ? 
            JSON.stringify(options) : '';
        return `${type}:${query}:${optionsStr}`;
    }

    /**
     * Get cached enrichment result
     */
    getCachedResult(cacheKey) {
        const cached = this.enrichmentCache.get(cacheKey);
        if (!cached) return null;
        
        // Check if expired
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.enrichmentCache.delete(cacheKey);
            return null;
        }
        
        return cached.result;
    }

    /**
     * Cache enrichment result
     */
    cacheResult(cacheKey, result) {
        // Check cache size limit
        if (this.enrichmentCache.size >= this.cacheLimit) {
            // Remove oldest entry
            const firstKey = this.enrichmentCache.keys().next().value;
            this.enrichmentCache.delete(firstKey);
        }
        
        this.enrichmentCache.set(cacheKey, {
            result: {
                ...result,
                fromCache: true,
                cachedAt: new Date().toISOString()
            },
            timestamp: Date.now()
        });
        
        console.log(`💾 Cached enrichment result: ${cacheKey}`);
    }

    /**
     * Check if query is cached
     */
    isCached(query, type, options = {}) {
        const cacheKey = this.createCacheKey(query, type, options);
        return this.getCachedResult(cacheKey) !== null;
    }

    /**
     * Clear enrichment cache
     */
    clearCache() {
        const oldSize = this.enrichmentCache.size;
        this.enrichmentCache.clear();
        console.log(`🧹 Cleared enrichment cache (${oldSize} entries)`);
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const hitRate = this.cacheStats.totalRequests > 0 ? 
            (this.cacheStats.hits / this.cacheStats.totalRequests) * 100 : 0;
            
        return {
            size: this.enrichmentCache.size,
            limit: this.cacheLimit,
            hits: this.cacheStats.hits,
            misses: this.cacheStats.misses,
            totalRequests: this.cacheStats.totalRequests,
            hitRate: Math.round(hitRate * 10) / 10, // Round to 1 decimal
            expiryMs: this.cacheExpiry
        };
    }

    /**
     * Set cache expiry time
     */
    setCacheExpiry(milliseconds) {
        this.cacheExpiry = milliseconds;
        console.log(`⏰ Cache expiry set to ${milliseconds}ms`);
    }

    /**
     * Get cache entries (for debugging)
     */
    getCacheEntries() {
        const entries = [];
        this.enrichmentCache.forEach((value, key) => {
            entries.push({
                key,
                timestamp: value.timestamp,
                age: Date.now() - value.timestamp,
                expired: Date.now() - value.timestamp > this.cacheExpiry
            });
        });
        return entries;
    }
}