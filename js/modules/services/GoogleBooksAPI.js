/**
 * GoogleBooksAPI - Enhanced Integration with Google Books API
 * Fixed version that properly handles book search and metadata retrieval
 */
import APIService from './APIService.js';

export default class GoogleBooksAPI extends APIService {
    constructor() {
        super('https://www.googleapis.com/books/v1', {
            timeout: 8000,
            retries: 2
        });
        this.maxResults = 20;
    }

    async searchBooks(query, options = {}) {
        if (!query || query.trim().length === 0) {
            return {
                success: false,
                message: 'Search query is required',
                books: []
            };
        }

        const params = new URLSearchParams({
            q: query.trim(),
            maxResults: options.maxResults || this.maxResults,
            startIndex: options.startIndex || 0,
            orderBy: options.orderBy || 'relevance',
            printType: options.printType || 'books'
        });

        try {
            console.log(`🔍 Searching Google Books for: "${query}"`);
            const endpoint = `/volumes?${params}`;
            
            // Use the enhanced request method from APIService
            const result = await this.request(endpoint);
            
            if (result.success && result.data) {
                const data = result.data;
                
                if (data.items && data.items.length > 0) {
                    const books = data.items.map(item => this.formatBookData(item));
                    console.log(`✅ Successfully formatted ${books.length} books`);
                    
                    return {
                        success: true,
                        books,
                        totalItems: data.totalItems || 0,
                        query,
                        source: 'Google Books'
                    };
                } else {
                    console.log('⚠️ No books found in API response');
                    return {
                        success: true,
                        books: [],
                        totalItems: 0,
                        query,
                        source: 'Google Books',
                        message: 'No books found'
                    };
                }
            } else {
                console.warn('⚠️ API request failed:', result.message);
                return {
                    success: false,
                    message: result.userMessage || result.message || 'Search failed',
                    books: [],
                    query,
                    source: 'Google Books'
                };
            }
        } catch (error) {
            console.error('❌ Google Books API error:', error);
            return {
                success: false,
                message: `Search failed: ${error.message}`,
                books: [],
                query,
                source: 'Google Books'
            };
        }
    }

    async getBookDetails(bookId) {
        try {
            const result = await this.request(`/volumes/${bookId}`);
            
            if (result.success && result.data) {
                return {
                    success: true,
                    book: this.formatBookData(result.data),
                    source: 'Google Books'
                };
            } else {
                return {
                    success: false,
                    message: result.userMessage || result.message || 'Failed to get book details',
                    source: 'Google Books'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Failed to get book details: ${error.message}`,
                source: 'Google Books'
            };
        }
    }

    formatBookData(item) {
        const volumeInfo = item.volumeInfo || {};
        const saleInfo = item.saleInfo || {};
        const accessInfo = item.accessInfo || {};

        return {
            id: item.id,
            title: volumeInfo.title || 'Unknown Title',
            subtitle: volumeInfo.subtitle || '',
            authors: volumeInfo.authors || ['Unknown Author'],
            publisher: volumeInfo.publisher || '',
            publishedDate: volumeInfo.publishedDate || '',
            description: volumeInfo.description || 'No description available.',
            pageCount: volumeInfo.pageCount || 0,
            categories: volumeInfo.categories || [],
            language: volumeInfo.language || 'en',
            
            // Images - handle both thumbnail and smallThumbnail
            thumbnail: volumeInfo.imageLinks?.thumbnail || 
                      volumeInfo.imageLinks?.smallThumbnail || 
                      '',
            smallThumbnail: volumeInfo.imageLinks?.smallThumbnail || '',
            
            // Identifiers
            industryIdentifiers: volumeInfo.industryIdentifiers || [],
            isbn10: this.extractISBN(volumeInfo.industryIdentifiers, 'ISBN_10'),
            isbn13: this.extractISBN(volumeInfo.industryIdentifiers, 'ISBN_13'),
            
            // Links
            previewLink: volumeInfo.previewLink || '',
            infoLink: volumeInfo.infoLink || '',
            canonicalVolumeLink: volumeInfo.canonicalVolumeLink || '',
            
            // Access info
            viewability: accessInfo.viewability || 'NO_PAGES',
            embeddable: accessInfo.embeddable || false,
            publicDomain: accessInfo.publicDomain || false,
            
            // Sale info
            saleability: saleInfo.saleability || 'NOT_FOR_SALE',
            isEbook: saleInfo.isEbook || false,
            
            // Ratings
            averageRating: volumeInfo.averageRating || 0,
            ratingsCount: volumeInfo.ratingsCount || 0,
            
            // Source metadata
            source: 'Google Books',
            sourceId: item.id,
            lastUpdated: new Date().toISOString()
        };
    }

    extractISBN(identifiers, type) {
        if (!identifiers) return '';
        const identifier = identifiers.find(id => id.type === type);
        return identifier ? identifier.identifier : '';
    }

    async searchByISBN(isbn) {
        const cleanISBN = isbn.replace(/[-\s]/g, '');
        return await this.searchBooks(`isbn:${cleanISBN}`);
    }

    async searchByAuthor(author) {
        return await this.searchBooks(`inauthor:${author}`);
    }

    async searchByTitle(title) {
        return await this.searchBooks(`intitle:${title}`);
    }

    async searchBySubject(subject) {
        return await this.searchBooks(`subject:${subject}`);
    }

    // Helper method to get book cover URL
    getBookCoverUrl(book, size = 'thumbnail') {
        if (size === 'small' && book.smallThumbnail) {
            return book.smallThumbnail;
        }
        return book.thumbnail || book.smallThumbnail || '';
    }

    // Helper method to format authors for display
    formatAuthors(authors) {
        if (!authors || authors.length === 0) return 'Unknown Author';
        if (authors.length === 1) return authors[0];
        if (authors.length === 2) return authors.join(' and ');
        return `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`;
    }

    // Helper method to get book year
    getPublicationYear(publishedDate) {
        if (!publishedDate) return '';
        return publishedDate.split('-')[0];
    }

    // Enhanced search with better error handling
    async enhancedSearch(query, options = {}) {
        console.log(`🚀 Enhanced search for: "${query}"`);
        
        // First try the standard search
        let result = await this.searchBooks(query, options);
        
        // If no results, try simplified search terms
        if (result.success && result.books.length === 0) {
            console.log('🔄 No results, trying simplified search...');
            
            // Extract key terms from query
            const simplifiedQuery = query.split(' ').slice(0, 2).join(' ');
            if (simplifiedQuery !== query) {
                result = await this.searchBooks(simplifiedQuery, options);
            }
        }
        
        return result;
    }

    // Batch search for multiple queries
    async batchSearch(queries, options = {}) {
        console.log(`📚 Batch searching ${queries.length} queries`);
        
        const results = [];
        for (const query of queries) {
            try {
                const result = await this.searchBooks(query, { ...options, maxResults: 5 });
                if (result.success && result.books.length > 0) {
                    results.push(...result.books);
                }
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.warn(`⚠️ Batch search failed for "${query}":`, error.message);
            }
        }
        
        // Remove duplicates by ID
        const uniqueBooks = results.filter((book, index, arr) => 
            arr.findIndex(b => b.id === book.id) === index
        );
        
        return {
            success: true,
            books: uniqueBooks,
            totalQueries: queries.length,
            source: 'Google Books'
        };
    }
}