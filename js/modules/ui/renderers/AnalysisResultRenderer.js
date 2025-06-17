/**
 * AnalysisResultRenderer - Enhanced Analysis Display
 * File: js/modules/ui/renderers/AnalysisResultRenderer.js
 */

import BaseRenderer from './BaseRenderer.js';

export default class AnalysisResultRenderer {
    constructor(baseRenderer) {
        this.baseRenderer = baseRenderer || new BaseRenderer();
        this.renderers = new Map();
        this.defaultConfig = {
            showMetadata: true,
            showConfidence: true,
            enableInteractivity: true,
            maxContentLength: 1000
        };
        
        // Register built-in renderers
        this.initializeBuiltInRenderers();
        
        console.log('🎨 AnalysisResultRenderer initialized');
    }
    
    /**
     * Initialize built-in analysis type renderers
     */
    initializeBuiltInRenderers() {
        this.registerRenderer('summary', { render: (data) => this.renderSummary(data) });
        this.registerRenderer('themes', { render: (data) => this.renderThemes(data) });
        this.registerRenderer('characters', { render: (data) => this.renderCharacters(data) });
        this.registerRenderer('difficulty', { render: (data) => this.renderDifficulty(data) });
        this.registerRenderer('sentiment', { render: (data) => this.renderSentiment(data) });
        this.registerRenderer('style', { render: (data) => this.renderStyle(data) });
    }
    
    /**
     * Register a renderer for a specific analysis type
     */
    registerRenderer(type, renderer) {
        if (!type || !renderer || typeof renderer.render !== 'function') {
            throw new Error('Invalid renderer: must have a render method');
        }
        
        this.renderers.set(type, renderer);
        console.log(`✅ Registered renderer for type: ${type}`);
    }
    
    /**
     * Check if renderer exists for type
     */
    hasRenderer(type) {
        return this.renderers.has(type);
    }
    
    /**
     * Main render method - routes to appropriate renderer
     */
    render(analysisData, options = {}) {
        try {
            // Handle different data structures from your existing code
            const normalizedData = this.normalizeAnalysisData(analysisData);
            
            // Validate input
            if (!this.baseRenderer.validateAnalysisData(normalizedData)) {
                return this.baseRenderer.createErrorMessage('Invalid analysis data provided');
            }
            
            const config = { ...this.defaultConfig, ...options };
            const { type } = normalizedData;
            
            // Get appropriate renderer
            const renderer = this.renderers.get(type);
            if (!renderer) {
                return this.renderUnknownType(normalizedData);
            }
            
            // Render content
            const content = renderer.render(normalizedData);
            
            // Wrap in container with metadata
            return this.wrapWithContainer(content, normalizedData, config);
            
        } catch (error) {
            console.error('❌ AnalysisResultRenderer error:', error);
            return this.baseRenderer.createErrorMessage(`Rendering failed: ${error.message}`);
        }
    }
    
    /**
     * Normalize analysis data from different sources
     */
    normalizeAnalysisData(data) {
        if (!data) return null;
        
        // Handle your existing AIAnalysisPanel result structure
        const content = data.content || data.analysis || data.summary || data.text || '';
        const type = data.analysisType || data.type || 'unknown';
        
        return {
            type: type,
            content: content,
            confidence: data.confidence || data.metadata?.confidence,
            timestamp: data.timestamp || data.generatedAt || new Date().toISOString(),
            // Copy any additional fields from original data
            ...data
        };
    }
    
    /**
     * Render batch of analyses
     */
    renderBatch(analysesArray, options = {}) {
        if (!Array.isArray(analysesArray) || analysesArray.length === 0) {
            return this.baseRenderer.createErrorMessage('No analyses provided for batch rendering');
        }
        
        const renderedItems = analysesArray
            .map(analysis => this.render(analysis, options))
            .join('\n');
        
        return `
            <div class="analysis-batch-container">
                <div class="analysis-batch-header">
                    <h3>📊 Analysis Results (${analysesArray.length} items)</h3>
                </div>
                ${renderedItems}
            </div>
        `;
    }
    
    /**
     * Render summary analysis
     */
    renderSummary(data) {
        const content = this.baseRenderer.formatAsHTML(data.content);
        
        // Handle keyPoints from your existing structure
        const keyPoints = data.keyPoints || data.summary?.keyPoints || [];
        const keyPointsHTML = keyPoints.length > 0 ? this.baseRenderer.formatList(keyPoints) : '';
        
        return `
            <div class="analysis-summary">
                <h4>📝 Summary</h4>
                ${content}
                ${keyPointsHTML ? `<div class="key-points"><h5>Key Points:</h5>${keyPointsHTML}</div>` : ''}
            </div>
        `;
    }
    
    /**
     * Render themes analysis
     */
    renderThemes(data) {
        const content = this.baseRenderer.formatAsHTML(data.content);
        
        let themesHTML = '';
        const themes = data.themes || data.primaryThemes || [];
        
        if (themes && themes.length > 0) {
            themesHTML = themes.map(theme => {
                // Handle both string and object themes
                const themeName = typeof theme === 'string' ? theme : theme.name || 'Unknown Theme';
                const confidence = typeof theme === 'object' ? theme.confidence : null;
                const description = typeof theme === 'object' ? theme.description : '';
                
                return `
                    <div class="theme-item" style="margin-bottom: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 0.5rem; border-left: 4px solid #3b82f6;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                            <strong style="color: #1e40af;">${this.baseRenderer.sanitizeText(themeName)}</strong>
                            ${confidence ? `<span style="font-size: 0.8rem; color: #64748b;">Confidence: ${Math.round(confidence * 100)}%</span>` : ''}
                        </div>
                        ${description ? `<p style="margin: 0; font-size: 0.9rem; color: #475569;">${this.baseRenderer.sanitizeText(description)}</p>` : ''}
                    </div>
                `;
            }).join('');
        }
        
        return `
            <div class="analysis-themes">
                <h4>🎭 Themes</h4>
                ${content}
                ${themesHTML ? `<div class="themes-list">${themesHTML}</div>` : ''}
            </div>
        `;
    }
    
    /**
     * Render characters analysis
     */
    renderCharacters(data) {
        const content = this.baseRenderer.formatAsHTML(data.content);
        
        let charactersHTML = '';
        const characters = data.characters || data.mainCharacters || [];
        
        if (characters && characters.length > 0) {
            charactersHTML = characters.map(char => {
                const name = char.name || 'Unknown Character';
                const role = char.role || 'Character';
                const traits = char.traits || [];
                
                return `
                    <div class="character-item" style="margin-bottom: 1rem; padding: 0.75rem; background: #f0fdf4; border-radius: 0.5rem; border-left: 4px solid #22c55e;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                            <strong style="color: #15803d;">${this.baseRenderer.sanitizeText(name)}</strong>
                            <span style="font-size: 0.8rem; color: #65a30d; background: #dcfce7; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">${this.baseRenderer.sanitizeText(role)}</span>
                        </div>
                        ${traits.length > 0 ? `<div style="margin-top: 0.5rem;">Traits: ${traits.map(trait => `<span style="background: #e0f2fe; color: #0369a1; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.8rem; margin-right: 0.25rem;">${this.baseRenderer.sanitizeText(trait)}</span>`).join('')}</div>` : ''}
                    </div>
                `;
            }).join('');
        }
        
        // Handle relationships if available
        let relationshipsHTML = '';
        const relationships = data.relationships || [];
        if (relationships && relationships.length > 0) {
            relationshipsHTML = `
                <div class="relationships-section" style="margin-top: 1rem;">
                    <h5>🔗 Relationships</h5>
                    ${relationships.map(rel => `
                        <div style="font-size: 0.9rem; margin-bottom: 0.25rem;">
                            <strong>${this.baseRenderer.sanitizeText(rel.from)}</strong> 
                            <span style="color: #64748b;">→ ${this.baseRenderer.sanitizeText(rel.type)} →</span> 
                            <strong>${this.baseRenderer.sanitizeText(rel.to)}</strong>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        return `
            <div class="analysis-characters">
                <h4>👤 Characters</h4>
                ${content}
                ${charactersHTML ? `<div class="characters-list">${charactersHTML}</div>` : ''}
                ${relationshipsHTML}
            </div>
        `;
    }
    
    /**
     * Render difficulty analysis
     */
    renderDifficulty(data) {
        const content = this.baseRenderer.formatAsHTML(data.content);
        const level = data.readingLevel || data.level || 'Unknown';
        const complexity = data.complexity || data.complexityScore || 0;
        
        return `
            <div class="analysis-difficulty">
                <h4>📊 Reading Difficulty</h4>
                ${content}
                <div style="margin-top: 1rem; padding: 0.75rem; background: #fef3c7; border-radius: 0.5rem;">
                    <div><strong>Reading Level:</strong> ${this.baseRenderer.sanitizeText(level)}</div>
                    <div><strong>Complexity Score:</strong> ${complexity}/10</div>
                    ${data.ageRecommendation || data.recommendedAge ? `<div><strong>Recommended Age:</strong> ${this.baseRenderer.sanitizeText(data.ageRecommendation || data.recommendedAge)}</div>` : ''}
                    ${data.estimatedReadingTime ? `<div><strong>Reading Time:</strong> ${data.estimatedReadingTime} minutes</div>` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Render sentiment analysis
     */
    renderSentiment(data) {
        const content = this.baseRenderer.formatAsHTML(data.content);
        const sentiment = data.overallSentiment || data.sentiment || 'neutral';
        const intensity = data.intensity || data.sentimentScore || 0.5;
        
        return `
            <div class="analysis-sentiment">
                <h4>💭 Sentiment Analysis</h4>
                ${content}
                <div style="margin-top: 1rem; padding: 0.75rem; background: #e0e7ff; border-radius: 0.5rem;">
                    <div><strong>Overall Sentiment:</strong> ${this.baseRenderer.sanitizeText(sentiment)}</div>
                    <div><strong>Intensity:</strong> ${Math.round(intensity * 100)}%</div>
                    ${data.emotionalTone ? `<div><strong>Emotional Tone:</strong> ${Array.isArray(data.emotionalTone) ? data.emotionalTone.join(', ') : data.emotionalTone}</div>` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Render style analysis
     */
    renderStyle(data) {
        const content = this.baseRenderer.formatAsHTML(data.content);
        
        return `
            <div class="analysis-style">
                <h4>✍️ Writing Style</h4>
                ${content}
                ${data.narrative || data.narrativeVoice ? `<div><strong>Narrative Style:</strong> ${this.baseRenderer.sanitizeText(data.narrative || data.narrativeVoice)}</div>` : ''}
                ${data.voice || data.writingStyle ? `<div><strong>Voice:</strong> ${this.baseRenderer.sanitizeText(data.voice || data.writingStyle)}</div>` : ''}
                ${data.literaryDevices && Array.isArray(data.literaryDevices) ? `<div><strong>Literary Devices:</strong> ${data.literaryDevices.join(', ')}</div>` : ''}
            </div>
        `;
    }
    
    /**
     * Handle unknown analysis types
     */
    renderUnknownType(data) {
        const content = this.baseRenderer.formatAsHTML(data.content);
        
        return `
            <div class="analysis-unknown">
                <h4>❓ Unknown Analysis Type: ${this.baseRenderer.sanitizeText(data.type)}</h4>
                ${content}
                <p style="color: #64748b; font-style: italic;">This analysis type is not yet supported by the renderer.</p>
            </div>
        `;
    }
    
    /**
     * Wrap content with container and metadata
     */
    wrapWithContainer(content, data, config) {
        const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown';
        const confidence = data.confidence ? Math.round(data.confidence * 100) : null;
        const cssClass = this.baseRenderer.generateCSSClass(`analysis-type-${data.type}`);
        
        let metadataHTML = '';
        if (config.showMetadata) {
            metadataHTML = `
                <div class="analysis-metadata" style="font-size: 0.8rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 0.5rem; margin-top: 1rem;">
                    <span>📅 ${timestamp}</span>
                    ${confidence && config.showConfidence ? `<span style="margin-left: 1rem;">🎯 Confidence: ${confidence}%</span>` : ''}
                    ${data.tokensUsed ? `<span style="margin-left: 1rem;">🔧 Tokens: ${data.tokensUsed}</span>` : ''}
                    ${data.cost ? `<span style="margin-left: 1rem;">💰 Cost: $${data.cost.toFixed(4)}</span>` : ''}
                </div>
            `;
        }
        
        return `
            <div class="analysis-container ${cssClass}" style="background: var(--card-background); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 1.5rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm);">
                ${content}
                ${metadataHTML}
            </div>
        `;
    }
}

export { AnalysisResultRenderer };