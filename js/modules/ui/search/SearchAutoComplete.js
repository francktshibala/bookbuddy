// js/modules/ui/search/SearchAutoComplete.js
export default class SearchAutoComplete {
    constructor() {
        this.searchConfig = {
            maxSuggestions: 8,
            debounceDelay: 300,
            autoCompleteMinLength: 2
        };
        
        this.suggestionCache = new Map();
        this.debounceTimers = new Map();
    }

    async getSuggestions(query, field) {
        const cacheKey = `${field}:${query}`;
        
        if (this.suggestionCache.has(cacheKey)) {
            return this.suggestionCache.get(cacheKey);
        }

        const suggestions = [];
        
        // Add suggestions from different sources
        const historySuggestions = this.getHistorySuggestions(query, field);
        const popularSuggestions = this.getPopularSuggestions(query, field);
        
        suggestions.push(...historySuggestions);
        suggestions.push(...popularSuggestions);
        
        const limitedSuggestions = suggestions.slice(0, this.searchConfig.maxSuggestions);
        this.suggestionCache.set(cacheKey, limitedSuggestions);
        
        return limitedSuggestions;
    }

    getPopularSuggestions(query, field) {
        const popularSuggestions = {
            query: [
                'JavaScript programming',
                'Python tutorial',
                'Machine learning basics'
            ],
            author: [
                'Robert C. Martin',
                'Martin Fowler',
                'Eric Evans'
            ],
            subject: [
                'Programming',
                'Computer Science',
                'Fiction'
            ]
        };

        const suggestions = popularSuggestions[field] || [];
        const queryLower = query.toLowerCase();

        return suggestions
            .filter(suggestion => suggestion.toLowerCase().includes(queryLower))
            .slice(0, 5)
            .map(text => ({ text, source: 'popular' }));
    }

    getHistorySuggestions(query, field) {
        // This would integrate with SearchHistoryManager
        return [];
    }

    setupAutoComplete(input, onSelect) {
        let debounceTimer;
        
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            
            if (e.target.value.length < this.searchConfig.autoCompleteMinLength) {
                this.hideSuggestions(e.target);
                return;
            }
            
            debounceTimer = setTimeout(async () => {
                const suggestions = await this.getSuggestions(
                    e.target.value,
                    e.target.dataset.field || 'query'
                );
                this.showSuggestions(e.target, suggestions, onSelect);
            }, this.searchConfig.debounceDelay);
        });

        input.addEventListener('blur', (e) => {
            setTimeout(() => this.hideSuggestions(e.target), 200);
        });
    }

    showSuggestions(input, suggestions, onSelect) {
        const dropdown = this.getSuggestionDropdown(input);
        if (!dropdown || suggestions.length === 0) return;

        dropdown.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" data-suggestion="${this.escapeHtml(suggestion.text)}">
                <span class="suggestion-text">${this.escapeHtml(suggestion.text)}</span>
                <span class="suggestion-source">${suggestion.source}</span>
            </div>
        `).join('');

        const items = dropdown.querySelectorAll('.suggestion-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.suggestion;
                this.hideSuggestions(input);
                if (onSelect) onSelect(item.dataset.suggestion);
            });
        });

        dropdown.classList.add('show');
    }

    hideSuggestions(input) {
        const dropdown = this.getSuggestionDropdown(input);
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    getSuggestionDropdown(input) {
        const container = input.closest('.input-with-suggestions');
        return container ? container.querySelector('.suggestions-dropdown') : null;
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}