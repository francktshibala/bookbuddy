/**
 * GoogleBooksAPI - Integration with Google Books API
 * Handles book search and metadata retrieval
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
            const response = await this.request(`/volumes?${params}`);
            
            if (response.items) {
                const books = response.items.map(item => this.formatBookData(item));
                return {
                    success: true,
                    books,
                    totalItems: response.totalItems || 0,
                    query,
                    source: 'Google Books'
                };
            } else {
                return {
                    success: true,
                    books: [],
                    totalItems: 0,
                    query,
                    source: 'Google Books',
                    message: 'No books found'
                };
            }
        } catch (error) {
            console.error('Google Books API error:', error);
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
            const response = await this.request(`/volumes/${bookId}`);
            return {
                success: true,
                book: this.formatBookData(response),
                source: 'Google Books'
            };
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
            description: volumeInfo.description || '',
            pageCount: volumeInfo.pageCount || 0,
            categories: volumeInfo.categories || [],
            language: volumeInfo.language || 'en',
            
            // Images
            thumbnail: volumeInfo.imageLinks?.thumbnail || '',
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
}