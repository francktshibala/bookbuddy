/**
 * BookDataMerger - Component 10.5b
 * Simple field-by-field data merging utility for Google Books + OpenLibrary
 */
export default class BookDataMerger {
    constructor() {
        this.version = '1.0.0';
        
        // Field prioritization rules
        this.priorityRules = {
            // OpenLibrary typically has better descriptions
            description: ['OpenLibrary', 'Google Books'],
            
            // Google Books has ratings data
            averageRating: ['Google Books', 'OpenLibrary'],
            ratingsCount: ['Google Books', 'OpenLibrary'],
            
            // OpenLibrary often has more detailed publisher info
            publisher: ['OpenLibrary', 'Google Books'],
            
            // OpenLibrary has more comprehensive categories
            categories: 'merge', // Special handling for arrays
            
            // Google Books usually has better image URLs
            thumbnail: ['Google Books', 'OpenLibrary'],
            
            // Prefer more recent timestamps
            lastUpdated: 'newest',
            
            // Default: first source wins (Google Books first)
            default: ['Google Books', 'OpenLibrary']
        };
        
        console.log('🔀 BookDataMerger initialized');
    }

    /**
     * Main merge method - combines data from two book sources
     */
    merge(googleBooksData, openLibraryData) {
        // Handle null/undefined inputs
        if (!googleBooksData && !openLibraryData) {
            return null;
        }
        
        if (!googleBooksData) {
            return this.addMergeMetadata(openLibraryData, ['OpenLibrary']);
        }
        
        if (!openLibraryData) {
            return this.addMergeMetadata(googleBooksData, ['Google Books']);
        }

        console.log('🔀 Merging book data from Google Books + OpenLibrary');
        
        // Start with base structure
        const merged = {
            // Generate new merged ID
            id: this.generateMergedId(googleBooksData, openLibraryData),
        };

        // Get all unique fields from both sources
        const allFields = new Set([
            ...Object.keys(googleBooksData),
            ...Object.keys(openLibraryData)
        ]);

        // Merge each field according to priority rules
        for (const field of allFields) {
            merged[field] = this.prioritizeField(
                field,
                googleBooksData[field],
                openLibraryData[field]
            );
        }

        // Special handling for array fields
        merged.categories = this.mergeArrays(
            googleBooksData.categories || [],
            openLibraryData.categories || []
        );

        merged.authors = this.mergeArrays(
            googleBooksData.authors || [],
            openLibraryData.authors || []
        );

        // Add merge metadata
        const sources = [
            googleBooksData.source || 'Google Books',
            openLibraryData.source || 'OpenLibrary'
        ];

        return this.addMergeMetadata(merged, sources);
    }

    /**
     * Alias for merge method (for consistency with test requirements)
     */
    mergeBooks(book1, book2) {
        return this.merge(book1, book2);
    }

    /**
     * Prioritize field values based on source and rules
     */
    prioritizeField(field, googleValue, openLibraryValue) {
        // Handle undefined/null values
        if (googleValue === undefined || googleValue === null) {
            return openLibraryValue;
        }
        
        if (openLibraryValue === undefined || openLibraryValue === null) {
            return googleValue;
        }

        // Skip source fields - don't merge these
        if (field === 'source') {
            return googleValue; // Keep original source
        }

        // Get priority rule for this field
        const rule = this.priorityRules[field] || this.priorityRules.default;

        if (Array.isArray(rule)) {
            // Use source priority order
            if (rule[0] === 'Google Books') {
                return googleValue;
            } else if (rule[0] === 'OpenLibrary') {
                return openLibraryValue;
            }
        }

        if (rule === 'newest') {
            // Compare timestamps and use newest
            return this.selectNewestValue(googleValue, openLibraryValue);
        }

        if (rule === 'merge') {
            // This is handled separately for arrays
            return googleValue;
        }

        // Special logic for specific fields
        switch (field) {
            case 'description':
                // Prefer longer, more detailed descriptions
                return this.selectBetterDescription(googleValue, openLibraryValue);
                
            case 'publishedDate':
                // Prefer more specific dates
                return this.selectBetterDate(googleValue, openLibraryValue);
                
            case 'pageCount':
                // Prefer non-zero values
                return (openLibraryValue && openLibraryValue > 0) ? openLibraryValue : googleValue;
                
            default:
                // Default: Google Books wins (first source)
                return googleValue;
        }
    }

    /**
     * Merge arrays and remove duplicates
     */
    mergeArrays(array1, array2) {
        if (!Array.isArray(array1)) array1 = [];
        if (!Array.isArray(array2)) array2 = [];
        
        // Combine and deduplicate
        const combined = [...array1, ...array2];
        return [...new Set(combined)].filter(item => 
            item && item.toString().trim().length > 0
        );
    }

    /**
     * Select better description based on length and content
     */
    selectBetterDescription(desc1, desc2) {
        if (!desc1) return desc2;
        if (!desc2) return desc1;
        
        // Remove HTML tags for comparison
        const clean1 = desc1.replace(/<[^>]*>/g, '').trim();
        const clean2 = desc2.replace(/<[^>]*>/g, '').trim();
        
        // Prefer longer, more detailed descriptions
        if (clean2.length > clean1.length * 1.5) {
            return desc2;
        }
        
        return desc1;
    }

    /**
     * Select better date (more specific)
     */
    selectBetterDate(date1, date2) {
        if (!date1) return date2;
        if (!date2) return date1;
        
        // Prefer more specific dates (YYYY-MM-DD over YYYY)
        if (date2.includes('-') && !date1.includes('-')) {
            return date2;
        }
        
        if (date1.includes('-') && !date2.includes('-')) {
            return date1;
        }
        
        return date1; // Default to first
    }

    /**
     * Select newest timestamp value
     */
    selectNewestValue(value1, value2) {
        try {
            const date1 = new Date(value1);
            const date2 = new Date(value2);
            
            return date1 > date2 ? value1 : value2;
        } catch {
            return value1; // Fallback to first value
        }
    }

    /**
     * Generate merged book ID
     */
    generateMergedId(googleData, openLibraryData) {
        // Try to use ISBN if available
        const isbn = googleData.isbn13 || openLibraryData.isbn13 || 
                    googleData.isbn10 || openLibraryData.isbn10;
        
        if (isbn) {
            return `merged_isbn_${isbn}`;
        }
        
        // Fallback to title-based ID
        const title = (googleData.title || openLibraryData.title || 'unknown')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .substring(0, 50);
            
        return `merged_${title}_${Date.now()}`;
    }

    /**
     * Add merge metadata to result
     */
    addMergeMetadata(bookData, sources) {
        return {
            ...bookData,
            sources: sources.filter(Boolean),
            mergedAt: new Date().toISOString(),
            mergeVersion: this.version,
            dataQuality: this.assessDataQuality(bookData),
            enriched: true
        };
    }

    /**
     * Assess data quality of merged result
     */
    assessDataQuality(bookData) {
        const requiredFields = ['title', 'authors', 'description'];
        const optionalFields = ['publishedDate', 'pageCount', 'categories', 'publisher'];
        const enhancedFields = ['thumbnail', 'isbn13', 'averageRating'];
        
        let score = 0;
        let maxScore = 0;
        
        // Required fields (high weight)
        for (const field of requiredFields) {
            maxScore += 3;
            if (bookData[field] && bookData[field].toString().trim().length > 0) {
                score += 3;
            }
        }
        
        // Optional fields (medium weight)
        for (const field of optionalFields) {
            maxScore += 2;
            if (bookData[field] && bookData[field].toString().trim().length > 0) {
                score += 2;
            }
        }
        
        // Enhanced fields (low weight)
        for (const field of enhancedFields) {
            maxScore += 1;
            if (bookData[field] && bookData[field].toString().trim().length > 0) {
                score += 1;
            }
        }
        
        const percentage = Math.round((score / maxScore) * 100);
        
        return {
            score,
            maxScore,
            percentage,
            completeness: this.getCompletenessLevel(percentage),
            missingFields: this.findMissingFields(bookData, [...requiredFields, ...optionalFields])
        };
    }

    /**
     * Get completeness level description
     */
    getCompletenessLevel(percentage) {
        if (percentage >= 90) return 'Excellent';
        if (percentage >= 75) return 'Good';
        if (percentage >= 60) return 'Fair';
        if (percentage >= 40) return 'Poor';
        return 'Incomplete';
    }

    /**
     * Find missing important fields
     */
    findMissingFields(bookData, importantFields) {
        return importantFields.filter(field => 
            !bookData[field] || bookData[field].toString().trim().length === 0
        );
    }

    /**
     * Get merger statistics
     */
    getStats() {
        return {
            version: this.version,
            priorityRules: Object.keys(this.priorityRules).length,
            supportedSources: ['Google Books', 'OpenLibrary']
        };
    }

    /**
     * Validate merged result
     */
    validateMergedData(mergedData) {
        const issues = [];
        
        if (!mergedData.title) {
            issues.push('Missing title');
        }
        
        if (!mergedData.authors || mergedData.authors.length === 0) {
            issues.push('Missing authors');
        }
        
        if (!mergedData.sources || mergedData.sources.length === 0) {
            issues.push('Missing source tracking');
        }
        
        return {
            isValid: issues.length === 0,
            issues
        };
    }
}