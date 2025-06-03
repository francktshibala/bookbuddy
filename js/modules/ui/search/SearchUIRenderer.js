// js/modules/ui/search/SearchUIRenderer.js
export default class SearchUIRenderer {
    renderSearchHeader() {
        return `
            <div class="search-header">
                <div class="search-title-section">
                    <h3 class="search-title">
                        <span class="search-icon">🔍</span>
                        Advanced Book Search
                    </h3>
                    <p class="search-subtitle">
                        Find books across multiple sources with powerful search criteria
                    </p>
                </div>
                
                <div class="search-header-actions">
                    <button class="btn btn-sm btn-outline" id="clear-search">
                        <span class="btn-icon">🧹</span>
                        Clear All
                    </button>
                    <button class="btn btn-sm btn-outline" id="save-search">
                        <span class="btn-icon">💾</span>
                        Save Search
                    </button>
                    <button class="btn btn-sm btn-outline" id="export-results" disabled>
                        <span class="btn-icon">📤</span>
                        Export
                    </button>
                </div>
            </div>
        `;
    }

    renderSearchTabs(activeTab) {
        const tabs = [
            { id: 'basic', label: 'Basic Search', icon: '🔍' },
            { id: 'advanced', label: 'Advanced Search', icon: '🎯' },
            { id: 'expert', label: 'Expert Query', icon: '⚡' }
        ];
        
        return `
            <div class="search-tabs">
                <div class="tab-buttons">
                    ${tabs.map(tab => `
                        <button class="tab-btn ${activeTab === tab.id ? 'active' : ''}" 
                                data-tab="${tab.id}">
                            <span class="tab-icon">${tab.icon}</span>
                            <span class="tab-label">${tab.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderBasicSearchFields(criteria) {
        return `
            <div class="form-group">
                <label for="basic-query">Search for books, authors, or topics</label>
                <div class="input-with-suggestions">
                    <input type="text" 
                           id="basic-query" 
                           class="form-input search-input"
                           placeholder="e.g., 'JavaScript programming'"
                           value="${criteria.query || ''}"
                           autocomplete="off">
                    <div class="suggestions-dropdown" id="basic-suggestions"></div>
                </div>
            </div>
        `;
    }
}