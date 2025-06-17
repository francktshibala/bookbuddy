/**
 * BaseRenderer - Shared utilities for analysis result rendering
 * File: js/modules/ui/renderers/BaseRenderer.js
 */

export default class BaseRenderer {
    constructor() {
        this.defaultOptions = {
            maxLength: 500,
            preserveLineBreaks: true,
            allowBasicHTML: false
        };
        
        console.log('🔧 BaseRenderer initialized');
    }
    
    /**
     * Sanitize text by removing HTML tags and handling special cases
     */
    sanitizeText(text) {
        if (text === null || text === undefined || text === '') {
            return '';
        }
        
        // Convert to string if it's not already
        const str = String(text);
        
        // Remove HTML tags but preserve content
        const withoutTags = str.replace(/<[^>]*>/g, '');
        
        return withoutTags;
    }
    
    /**
     * Format text as HTML with paragraphs
     */
    formatAsHTML(text) {
        if (!text) return '<p><em>No content available</em></p>';
        
        const sanitized = this.sanitizeText(text);
        
        // Split by double line breaks to create paragraphs
        const paragraphs = sanitized.split(/\n\s*\n/)
            .filter(p => p.trim().length > 0)
            .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
            .join('');
        
        return paragraphs || '<p><em>No content available</em></p>';
    }
    
    /**
     * Truncate text to specified length with ellipsis
     */
    truncateText(text, maxLength = this.defaultOptions.maxLength) {
        if (!text) return '';
        
        const str = String(text);
        if (str.length <= maxLength) return str;
        
        return str.substring(0, maxLength - 3).trim() + '...';
    }
    
    /**
     * Format array as HTML list
     */
    formatList(items, options = {}) {
        if (!Array.isArray(items) || items.length === 0) {
            return '<p><em>No items available</em></p>';
        }
        
        const listType = options.ordered ? 'ol' : 'ul';
        const listItems = items
            .filter(item => item !== null && item !== undefined)
            .map(item => `<li>${this.sanitizeText(item)}</li>`)
            .join('');
        
        return `<${listType}>${listItems}</${listType}>`;
    }
    
    /**
     * Generate CSS-friendly class names
     */
    generateCSSClass(text) {
        if (!text) return 'unknown';
        
        return String(text)
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .trim();
    }
    
    /**
     * Validate analysis data structure
     */
    validateAnalysisData(data) {
        if (!data || typeof data !== 'object') return false;
        
        // Required fields for analysis data
        const requiredFields = ['type', 'content'];
        
        return requiredFields.every(field => {
            const hasField = data.hasOwnProperty(field);
            const isNotEmpty = data[field] !== null && data[field] !== undefined && data[field] !== '';
            return hasField && isNotEmpty;
        });
    }
    
    /**
     * Create error message HTML
     */
    createErrorMessage(message) {
        const safeMessage = this.sanitizeText(message) || 'An unknown error occurred';
        return `
            <div class="analysis-error" style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">⚠️</span>
                    <strong>Analysis Error</strong>
                </div>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">${safeMessage}</p>
            </div>
        `;
    }
    
    /**
     * Create loading state HTML
     */
    createLoadingState(message = 'Processing analysis...') {
        const safeMessage = this.sanitizeText(message);
        return `
            <div class="analysis-loading" style="background: #f0f9ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <div style="width: 20px; height: 20px; border: 2px solid #bfdbfe; border-top: 2px solid #1e40af; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span>${safeMessage}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Get default styling for rendered content
     */
    getDefaultStyles() {
        return `
            .analysis-content { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
            .analysis-content p { margin-bottom: 1rem; }
            .analysis-content ul, .analysis-content ol { margin-bottom: 1rem; padding-left: 1.5rem; }
            .analysis-content li { margin-bottom: 0.25rem; }
            .analysis-content h3 { color: var(--text-primary); font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
            .analysis-content em { color: var(--text-secondary); font-style: italic; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `;
    }
}