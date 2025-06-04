// js/modules/ui/search/SearchStateManager.js
export default class SearchStateManager {
    constructor() {
        this.currentSearch = {
            criteria: this.getDefaultCriteria(),
            filters: this.getDefaultFilters(),
            results: [],
            isSearching: false,
            lastSearchTime: null
        };
        
        this.activeTab = 'basic';
        this.expandedSections = new Set(['basic-search', 'advanced-fields']); // Ensure sections are expanded by default
    }

    getDefaultCriteria() {
        return {
            query: '',
            title: '',
            author: '',
            subject: '',
            isbn: '',
            publisher: '',
            keywords: '',
            expertQuery: ''
        };
    }

    getDefaultFilters() {
        return {
            language: 'all',
            yearFrom: null,
            yearTo: null,
            printType: '',
            orderBy: 'relevance',
            maxResults: 20,
            previewAvailable: false,
            freeEbooks: false
        };
    }

    updateCriteria(updates) {
        this.currentSearch.criteria = { ...this.currentSearch.criteria, ...updates };
    }

    updateFilters(updates) {
        this.currentSearch.filters = { ...this.currentSearch.filters, ...updates };
    }

    reset() {
        this.currentSearch.criteria = this.getDefaultCriteria();
        this.currentSearch.filters = this.getDefaultFilters();
        this.currentSearch.results = [];
        this.activeTab = 'basic';
        this.expandedSections = new Set(['basic-search', 'advanced-fields']);
    }

    // Helper methods for the main component
    isExpanded(sectionId) {
        return this.expandedSections.has(sectionId);
    }

    toggleSection(sectionId) {
        if (this.expandedSections.has(sectionId)) {
            this.expandedSections.delete(sectionId);
        } else {
            this.expandedSections.add(sectionId);
        }
    }
}