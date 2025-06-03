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
        this.expandedSections = new Set(['basic-search']);
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
    }
}