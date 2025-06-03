// js/modules/ui/search/SearchQueryBuilder.js
export default class SearchQueryBuilder {
    buildSearchQuery(criteria, activeTab) {
        if (activeTab === 'expert' && criteria.expertQuery) {
            return criteria.expertQuery;
        }
        
        if (activeTab === 'basic' && criteria.query) {
            return criteria.query;
        }

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
            queryParts.push(`isbn:${criteria.isbn.replace(/[-\s]/g, '')}`);
        }

        if (criteria.publisher) {
            queryParts.push(`inpublisher:"${criteria.publisher}"`);
        }

        if (criteria.keywords) {
            queryParts.push(criteria.keywords);
        }

        return queryParts.join(' ');
    }

    buildSearchOptions(filters) {
        const options = {};

        if (filters.maxResults) {
            options.maxResults = parseInt(filters.maxResults);
        }

        if (filters.orderBy) {
            options.orderBy = filters.orderBy;
        }

        if (filters.printType) {
            options.printType = filters.printType;
        }

        if (filters.language && filters.language !== 'all') {
            options.langRestrict = filters.language;
        }

        return options;
    }

    validateSearchCriteria(criteria, activeTab) {
        if (activeTab === 'expert') {
            if (!criteria.expertQuery || criteria.expertQuery.trim().length === 0) {
                return { valid: false, message: 'Expert query is required' };
            }
        } else {
            const hasBasicQuery = criteria.query && criteria.query.trim().length > 0;
            const hasAdvancedFields = criteria.title || criteria.author || 
                                     criteria.subject || criteria.isbn || 
                                     criteria.publisher || criteria.keywords;
            
            if (!hasBasicQuery && !hasAdvancedFields) {
                return { valid: false, message: 'Please enter search criteria' };
            }
        }

        return { valid: true };
    }
}