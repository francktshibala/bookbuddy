// js/modules/ui/search/SearchHistoryManager.js
export default class SearchHistoryManager {
    constructor(storage) {
        this.storage = storage;
        this.maxHistoryItems = 50;
        this.searchHistory = this.loadSearchHistory();
        this.savedSearches = this.loadSavedSearches();
    }

    loadSearchHistory() {
        const result = this.storage.load('advanced_search_history', []);
        return result.success ? result.data : [];
    }

    loadSavedSearches() {
        const result = this.storage.load('advanced_saved_searches', []);
        return result.success ? result.data : [];
    }

    addToHistory(query, criteria, filters, resultsCount) {
        const historyEntry = {
            id: `history_${Date.now()}`,
            displayQuery: query,
            criteria: { ...criteria },
            filters: { ...filters },
            resultsCount: resultsCount,
            timestamp: new Date().toISOString()
        };

        this.searchHistory.unshift(historyEntry);
        
        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }

        this.saveSearchHistory();
        return historyEntry;
    }

    saveSearch(name, criteria, filters, query) {
        const savedSearch = {
            id: `saved_${Date.now()}`,
            name: name.trim(),
            criteria: { ...criteria },
            filters: { ...filters },
            displayQuery: query,
            savedAt: new Date().toISOString()
        };

        this.savedSearches.unshift(savedSearch);
        this.saveSavedSearches();
        return savedSearch;
    }

    saveSearchHistory() {
        this.storage.save('advanced_search_history', this.searchHistory);
    }

    saveSavedSearches() {
        this.storage.save('advanced_saved_searches', this.savedSearches);
    }
}