/**
 * AIAnalysisPanel - AI Analysis Interface Component
 * File: js/modules/ui/AIAnalysisPanel.js
 * 
 * Modal-based interface for AI book analysis following your existing patterns
 */

import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { DOMUtils, StringUtils } from '../../utils/Helpers.js';

export default class AIAnalysisPanel {
    constructor(modalManager, bookAnalysisService, eventBusInstance = null, loadingStateManager = null) {
        // Inject dependencies following your pattern
        this.modalManager = modalManager;
        this.bookAnalysisService = bookAnalysisService;
        this.eventBus = eventBusInstance || eventBus;
        this.loadingStateManager = loadingStateManager;
        
        // Configuration
        this.config = {
            defaultAnalysisType: 'summary',
            showProgress: true,
            enableBatchAnalysis: true,
            autoCloseAfterAnalysis: false,
            availableTypes: [
                { 
                    id: 'summary', 
                    name: 'Summary', 
                    icon: '📝', 
                    description: 'Generate a concise summary with key points',
                    estimatedTime: '30-60 seconds'
                },
                { 
                    id: 'themes', 
                    name: 'Themes', 
                    icon: '🎭', 
                    description: 'Extract primary and secondary themes',
                    estimatedTime: '45-90 seconds'
                },
                { 
                    id: 'characters', 
                    name: 'Characters', 
                    icon: '👤', 
                    description: 'Analyze main characters and relationships',
                    estimatedTime: '60-120 seconds'
                },
                { 
                    id: 'difficulty', 
                    name: 'Difficulty', 
                    icon: '📊', 
                    description: 'Assess reading level and complexity',
                    estimatedTime: '20-40 seconds'
                },
                { 
                    id: 'sentiment', 
                    name: 'Sentiment', 
                    icon: '💭', 
                    description: 'Analyze emotional tone and mood',
                    estimatedTime: '30-60 seconds'
                },
                { 
                    id: 'style', 
                    name: 'Style', 
                    icon: '✍️', 
                    description: 'Examine writing style and techniques',
                    estimatedTime: '45-75 seconds'
                }
            ]
        };
        
        // Component state
        this.state = {
            currentBook: null,
            activeAnalysis: null,
            selectedTypes: [],
            results: new Map(),
            isProcessing: false,
            currentProgress: 0
        };
        
        // Progress tracking callbacks
        this.onProgress = null;
        this.onBatchProgress = null;
        
        this.init();
    }
    
    init() {
        console.log('🤖 AIAnalysisPanel initialized');
        this.bindEvents();
    }
    
    bindEvents() {
        // Listen for analysis events
        this.eventBus.on(EVENTS.AI_ANALYSIS_STARTED, this.handleAnalysisStarted.bind(this));
        this.eventBus.on(EVENTS.AI_ANALYSIS_PROGRESS, this.handleAnalysisProgress.bind(this));
        this.eventBus.on(EVENTS.AI_ANALYSIS_COMPLETED, this.handleAnalysisCompleted.bind(this));
    }
    
    /**
     * Show analysis panel for a book
     * @param {Object} book - Book data
     * @returns {Object} Modal result with success status and modal ID
     */
    showAnalysisPanel(book) {
        if (!book) {
            return { success: false, error: 'Book data is required' };
        }
        
        try {
            // Reset state for new book
            this.state.currentBook = book;
            this.state.selectedTypes = [];
            this.state.results.clear();
            this.state.isProcessing = false;
            
            const modal = this.modalManager.showModal({
                title: `🤖 AI Analysis - ${book.title}`,
                content: this.generatePanelContent(),
                className: 'ai-analysis-modal large-modal',
                buttons: this.generateActionButtons(),
                onAction: this.handleModalAction.bind(this),
                onClose: this.handleModalClose.bind(this)
            });
            
            console.log('📊 AI Analysis panel opened for:', book.title);
            
            return {
                success: true,
                modalId: modal.id,
                close: modal.close.bind(modal),
                updateContent: modal.updateContent.bind(modal),
                updateTitle: modal.updateTitle.bind(modal)
            };
            
        } catch (error) {
            console.error('❌ Error showing analysis panel:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Generate the main panel content HTML
     * @returns {string} HTML content
     */
    generatePanelContent() {
        const book = this.state.currentBook;
        
        return `
            <div class="ai-analysis-content">
                <!-- Book Information -->
                <div class="book-info-section">
                    <div class="book-meta">
                        <h3>${StringUtils.escapeHtml(book.title)}</h3>
                        <p class="authors">${this.formatAuthors(book.authors)}</p>
                        <div class="book-stats">
                            <span class="word-count">📄 ${this.formatWordCount(book.wordCount)} words</span>
                            ${book.pageCount ? `<span class="page-count">📖 ${book.pageCount} pages</span>` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Analysis Type Selection -->
                <div class="analysis-types-section">
                    <h4>🎯 Choose Analysis Types</h4>
                    <div class="analysis-types-grid">
                        ${this.generateAnalysisTypeOptions()}
                    </div>
                </div>
                
                <!-- Progress Section -->
                <div class="progress-section" id="analysis-progress" style="display: none;">
                    <h4>⚡ Analysis Progress</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">Ready to start...</div>
                </div>
                
                <!-- Results Section -->
                <div class="results-section" id="analysis-results">
                    ${this.generateResultsDisplay()}
                </div>
            </div>
        `;
    }
    
    /**
     * Generate analysis type selection options
     * @returns {string} HTML for analysis type options
     */
    generateAnalysisTypeOptions() {
        return this.config.availableTypes.map(type => `
            <div class="analysis-type-option" data-type="${type.id}">
                <input type="checkbox" id="type-${type.id}" class="analysis-type-checkbox">
                <label for="type-${type.id}" class="analysis-type-label">
                    <div class="type-header">
                        <span class="type-icon">${type.icon}</span>
                        <span class="type-name">${type.name}</span>
                    </div>
                    <div class="type-description">${type.description}</div>
                    <div class="type-time">⏱️ ${type.estimatedTime}</div>
                </label>
            </div>
        `).join('');
    }
    
    /**
     * Generate action buttons for modal
     * @returns {Array} Button configurations
     */
    generateActionButtons() {
        return [
            {
                text: '🚀 Start Analysis',
                className: 'btn-primary',
                action: 'start-analysis'
            },
            {
                text: '📁 Batch Analysis',
                className: 'btn-secondary',
                action: 'batch-analysis'
            },
            {
                text: '❌ Cancel',
                className: 'btn-cancel',
                action: 'cancel'
            }
        ];
    }
    
    /**
     * Handle modal actions
     * @param {string} action - Action identifier
     * @param {Event} event - DOM event
     */
    async handleModalAction(action, event) {
        const selectedTypes = this.getSelectedAnalysisTypes();
        
        switch (action) {
            case 'start-analysis':
                if (selectedTypes.length === 0) {
                    this.showError('Please select at least one analysis type');
                    return;
                }
                
                if (selectedTypes.length === 1) {
                    await this.performAnalysis(selectedTypes[0]);
                } else {
                    await this.performBatchAnalysis(selectedTypes);
                }
                break;
                
            case 'batch-analysis':
                if (selectedTypes.length < 2) {
                    this.showError('Batch analysis requires at least 2 analysis types');
                    return;
                }
                await this.performBatchAnalysis(selectedTypes);
                break;
                
            case 'cancel':
                this.handleModalClose();
                break;
        }
    }
    
    /**
     * Perform single analysis
     * @param {string} analysisType - Type of analysis to perform
     * @returns {Object} Analysis result
     */
    async performAnalysis(analysisType) {
        if (!this.bookAnalysisService) {
            return { success: false, error: 'Analysis service not available' };
        }
        
        try {
            this.state.activeAnalysis = analysisType;
            this.state.isProcessing = true;
            this.showProgressSection();
            
            // Start loading state
            if (this.loadingStateManager) {
                this.loadingStateManager.startLoading('ai-analysis', {
                    message: `Analyzing ${analysisType}...`,
                    type: 'ai-analysis'
                });
            }
            
            // Emit start event
            this.eventBus.emit(EVENTS.AI_ANALYSIS_STARTED, {
                bookId: this.state.currentBook.id,
                analysisType: analysisType
            });
            
            // Perform analysis based on type
            let result;
            const methodMap = {
                summary: 'generateSummary',
                themes: 'extractThemes',
                characters: 'analyzeCharacters',
                difficulty: 'assessDifficulty',
                sentiment: 'analyzeSentiment',
                style: 'analyzeStyle'
            };
            
            const method = methodMap[analysisType];
            if (!method || !this.bookAnalysisService[method]) {
                throw new Error(`Unsupported analysis type: ${analysisType}`);
            }
            
            result = await this.bookAnalysisService[method](this.state.currentBook);
            
            // Store result
            this.state.results.set(analysisType, result);
            
            // Update UI
            this.updateResultsDisplay();
            this.hideProgressSection();
            
            // Emit completion event
            this.eventBus.emit(EVENTS.AI_ANALYSIS_COMPLETED, {
                bookId: this.state.currentBook.id,
                analysisType: analysisType,
                result: result
            });
            
            console.log(`✅ ${analysisType} analysis completed for:`, this.state.currentBook.title);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Error performing ${analysisType} analysis:`, error);
            this.showError(`Analysis failed: ${error.message}`);
            
            return { success: false, error: error.message };
            
        } finally {
            this.state.activeAnalysis = null;
            this.state.isProcessing = false;
            
            // Stop loading state
            if (this.loadingStateManager) {
                this.loadingStateManager.stopLoading('ai-analysis');
            }
        }
    }
    
    /**
     * Perform batch analysis for multiple types
     * @param {Array} analysisTypes - Array of analysis types
     * @returns {Object} Batch analysis result
     */
    async performBatchAnalysis(analysisTypes) {
        if (!this.bookAnalysisService || !this.bookAnalysisService.performBatchAnalysis) {
            // Fallback to sequential analysis
            return await this.performSequentialAnalysis(analysisTypes);
        }
        
        try {
            this.state.isProcessing = true;
            this.showProgressSection();
            
            console.log('🔄 Starting batch analysis for:', analysisTypes);
            
            const result = await this.bookAnalysisService.performBatchAnalysis(
                this.state.currentBook, 
                analysisTypes
            );
            
            // Store individual results
            if (result.success && result.analyses) {
                Object.entries(result.analyses).forEach(([type, analysis]) => {
                    this.state.results.set(type, analysis);
                });
            }
            
            this.updateResultsDisplay();
            this.hideProgressSection();
            
            console.log('✅ Batch analysis completed');
            
            return result;
            
        } catch (error) {
            console.error('❌ Batch analysis error:', error);
            this.showError(`Batch analysis failed: ${error.message}`);
            
            return { success: false, error: error.message };
            
        } finally {
            this.state.isProcessing = false;
        }
    }
    
    /**
     * Perform sequential analysis as fallback
     * @param {Array} analysisTypes - Array of analysis types
     * @returns {Object} Sequential analysis result
     */
    async performSequentialAnalysis(analysisTypes) {
        const results = {};
        let totalTokens = 0;
        let totalCost = 0;
        
        for (let i = 0; i < analysisTypes.length; i++) {
            const type = analysisTypes[i];
            
            // Update batch progress
            if (this.onBatchProgress) {
                this.onBatchProgress({
                    current: i + 1,
                    total: analysisTypes.length,
                    currentType: type,
                    progress: ((i + 1) / analysisTypes.length) * 100
                });
            }
            
            const result = await this.performAnalysis(type);
            results[type] = result;
            
            if (result.success) {
                totalTokens += result.tokensUsed || 0;
                totalCost += result.cost || 0;
            }
        }
        
        return {
            success: true,
            analyses: results,
            totalTokensUsed: totalTokens,
            totalCost: totalCost,
            bookId: this.state.currentBook.id
        };
    }
    
    /**
     * Get selected analysis types from UI
     * @returns {Array} Selected analysis type IDs
     */
    getSelectedAnalysisTypes() {
        const checkboxes = document.querySelectorAll('.analysis-type-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.id.replace('type-', ''));
    }
    
    /**
     * Select an analysis type
     * @param {string} type - Analysis type to select
     * @returns {Object} Selection result
     */
    selectAnalysisType(type) {
        if (!this.config.availableTypes.find(t => t.id === type)) {
            return { success: false, error: 'Invalid analysis type' };
        }
        
        if (!this.state.selectedTypes.includes(type)) {
            this.state.selectedTypes.push(type);
        }
        
        return { success: true };
    }
    
    /**
     * Deselect an analysis type
     * @param {string} type - Analysis type to deselect
     * @returns {Object} Deselection result
     */
    deselectAnalysisType(type) {
        this.state.selectedTypes = this.state.selectedTypes.filter(t => t !== type);
        return { success: true };
    }
    
    /**
     * Get description for analysis type
     * @param {string} type - Analysis type
     * @returns {string} Description
     */
    getAnalysisTypeDescription(type) {
        const typeConfig = this.config.availableTypes.find(t => t.id === type);
        return typeConfig ? typeConfig.description : 'Unknown analysis type';
    }
    
    /**
     * Format analysis result for display
     * @param {Object} result - Analysis result
     * @returns {string} Formatted HTML
     */
    formatAnalysisResult(result) {
        if (!result || !result.success) {
            return `<div class="analysis-error">❌ Analysis failed: ${result?.error || 'Unknown error'}</div>`;
        }
        
        const analysis = result.analysis || {};
        const type = result.analysisType;
        
        let html = `<div class="analysis-result" data-type="${type}">`;
        html += `<h5>📊 ${this.getAnalysisTypeName(type)} Analysis</h5>`;
        
        switch (type) {
            case 'summary':
                html += this.formatSummaryResult(analysis);
                break;
            case 'themes':
                html += this.formatThemesResult(analysis);
                break;
            case 'characters':
                html += this.formatCharactersResult(analysis);
                break;
            case 'difficulty':
                html += this.formatDifficultyResult(analysis);
                break;
            case 'sentiment':
                html += this.formatSentimentResult(analysis);
                break;
            case 'style':
                html += this.formatStyleResult(analysis);
                break;
            default:
                html += `<div class="generic-result">${JSON.stringify(analysis, null, 2)}</div>`;
        }
        
        // Add metadata
        html += this.formatResultMetadata(result);
        html += '</div>';
        
        return html;
    }

    /**
 * Enhanced format analysis result using AnalysisResultRenderer
 * @param {Object} result - Analysis result
 * @returns {string} Formatted HTML
 */
formatAnalysisResultEnhanced(result) {
    if (this.analysisResultRenderer) {
        try {
            return this.analysisResultRenderer.render(result);
        } catch (error) {
            console.error('❌ Enhanced renderer error, falling back:', error);
            // Fall back to your existing method
            return this.formatAnalysisResult(result);
        }
    }
    // Fall back to your existing method if renderer not available
    return this.formatAnalysisResult(result);
}

    /**
 * Enhanced format analysis result that handles missing content
 * @param {Object} result - Analysis result
 * @returns {string} Formatted HTML
 */
formatAnalysisResult(result) {
    if (!result || !result.success) {
        return `<div class="analysis-error">❌ Analysis failed: ${result?.error || 'Unknown error'}</div>`;
    }
    
    // Handle different result structures
    const content = result.content || result.analysis || result.text || '';
    const type = result.analysisType || result.type || 'unknown';
    const confidence = result.confidence || result.metadata?.confidence;
    
    let html = `<div class="analysis-result" data-type="${type}">`;
    html += `<h5>${this.getAnalysisTypeIcon(type)} ${this.getAnalysisTypeName(type)} Analysis</h5>`;
    
    // Main content
    if (content) {
        html += `<div class="analysis-content">
            <div class="content-text">${this.escapeHtml(content)}</div>
        </div>`;
    }
    
    // Confidence score if available
    if (confidence !== undefined) {
        html += `<div class="confidence-score">
            <strong>🎯 Confidence:</strong> ${Math.round(confidence * 100)}%
        </div>`;
    }
    
    // Add metadata
    html += this.formatResultMetadata(result);
    html += '</div>';
    
    return html;
}

/**
 * Get icon for analysis type
 * @param {string} type - Analysis type
 * @returns {string} Icon
 */
getAnalysisTypeIcon(type) {
    const iconMap = {
        'summary': '📝',
        'themes': '🎭', 
        'characters': '👤',
        'difficulty': '📊',
        'sentiment': '💭',
        'style': '✍️'
    };
    return iconMap[type] || '📊';
}

/**
 * Escape HTML for safe display
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
    
    /**
     * Format summary analysis result
     * @param {Object} analysis - Summary analysis data
     * @returns {string} Formatted HTML
     */
    formatSummaryResult(analysis) {
        let html = '';
        
        if (analysis.summary) {
            html += `<div class="summary-text">
                <h6>📝 Summary</h6>
                <p>${StringUtils.escapeHtml(analysis.summary)}</p>
            </div>`;
        }
        
        if (analysis.keyPoints && analysis.keyPoints.length > 0) {
            html += `<div class="key-points">
                <h6>🎯 Key Points</h6>
                <ul>
                    ${analysis.keyPoints.map(point => 
                        `<li>${StringUtils.escapeHtml(point)}</li>`
                    ).join('')}
                </ul>
            </div>`;
        }
        
        return html;
    }
    
    /**
     * Format themes analysis result
     * @param {Object} analysis - Themes analysis data
     * @returns {string} Formatted HTML
     */
    formatThemesResult(analysis) {
        let html = '';
        
        if (analysis.primaryThemes && analysis.primaryThemes.length > 0) {
            html += `<div class="primary-themes">
                <h6>🎭 Primary Themes</h6>
                <ul>
                    ${analysis.primaryThemes.map(theme => 
                        `<li>${StringUtils.escapeHtml(theme)}</li>`
                    ).join('')}
                </ul>
            </div>`;
        }
        
        if (analysis.secondaryThemes && analysis.secondaryThemes.length > 0) {
            html += `<div class="secondary-themes">
                <h6>🎨 Secondary Themes</h6>
                <ul>
                    ${analysis.secondaryThemes.map(theme => 
                        `<li>${StringUtils.escapeHtml(theme)}</li>`
                    ).join('')}
                </ul>
            </div>`;
        }
        
        if (analysis.themeAnalysis) {
            html += `<div class="theme-analysis">
                <h6>📖 Theme Analysis</h6>
                ${Object.entries(analysis.themeAnalysis).map(([theme, description]) => 
                    `<div class="theme-detail">
                        <strong>${StringUtils.escapeHtml(theme)}:</strong>
                        <p>${StringUtils.escapeHtml(description)}</p>
                    </div>`
                ).join('')}
            </div>`;
        }
        
        return html;
    }
    
    /**
     * Format characters analysis result
     * @param {Object} analysis - Characters analysis data
     * @returns {string} Formatted HTML
     */
    formatCharactersResult(analysis) {
        let html = '';
        
        if (analysis.mainCharacters && analysis.mainCharacters.length > 0) {
            html += `<div class="main-characters">
                <h6>👤 Main Characters</h6>
                ${analysis.mainCharacters.map(character => `
                    <div class="character-card">
                        <h7>${StringUtils.escapeHtml(character.name)}</h7>
                        <p class="character-role">${StringUtils.escapeHtml(character.role || 'Character')}</p>
                        ${character.traits ? `
                            <div class="character-traits">
                                <strong>Traits:</strong> ${character.traits.map(trait => 
                                    StringUtils.escapeHtml(trait)
                                ).join(', ')}
                            </div>
                        ` : ''}
                        ${character.significance ? `
                            <div class="character-significance">
                                <strong>Significance:</strong> ${StringUtils.escapeHtml(character.significance)}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>`;
        }
        
        return html;
    }
    
    /**
     * Format difficulty analysis result
     * @param {Object} analysis - Difficulty analysis data
     * @returns {string} Formatted HTML
     */
    formatDifficultyResult(analysis) {
        let html = '';
        
        if (analysis.readingLevel) {
            html += `<div class="reading-level">
                <h6>📊 Reading Level</h6>
                <div class="level-badge level-${analysis.readingLevel.toLowerCase()}">
                    ${StringUtils.escapeHtml(analysis.readingLevel)}
                </div>
            </div>`;
        }
        
        if (analysis.complexity) {
            html += `<div class="complexity-score">
                <h6>🎯 Complexity Score</h6>
                <div class="score-display">
                    <span class="score">${analysis.complexity}/10</span>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${analysis.complexity * 10}%"></div>
                    </div>
                </div>
            </div>`;
        }
        
        if (analysis.vocabulary) {
            html += `<div class="vocabulary-level">
                <strong>📚 Vocabulary:</strong> ${StringUtils.escapeHtml(analysis.vocabulary)}
            </div>`;
        }
        
        if (analysis.recommendedAge) {
            html += `<div class="recommended-age">
                <strong>👥 Recommended Age:</strong> ${StringUtils.escapeHtml(analysis.recommendedAge)}
            </div>`;
        }
        
        if (analysis.estimatedReadingTime) {
            html += `<div class="reading-time">
                <strong>⏰ Estimated Reading Time:</strong> ${analysis.estimatedReadingTime} minutes
            </div>`;
        }
        
        return html;
    }
    
    /**
     * Format sentiment analysis result
     * @param {Object} analysis - Sentiment analysis data
     * @returns {string} Formatted HTML
     */
    formatSentimentResult(analysis) {
        let html = '';
        
        if (analysis.overallSentiment) {
            html += `<div class="overall-sentiment">
                <h6>💭 Overall Sentiment</h6>
                <div class="sentiment-badge sentiment-${analysis.overallSentiment.toLowerCase()}">
                    ${StringUtils.escapeHtml(analysis.overallSentiment)}
                </div>
            </div>`;
        }
        
        if (analysis.sentimentScore !== undefined) {
            html += `<div class="sentiment-score">
                <h6>📈 Sentiment Score</h6>
                <div class="score-display">
                    <span class="score">${analysis.sentimentScore}</span>
                    <div class="score-description">
                        ${analysis.sentimentScore > 0 ? 'Positive' : 
                          analysis.sentimentScore < 0 ? 'Negative' : 'Neutral'}
                    </div>
                </div>
            </div>`;
        }
        
        if (analysis.emotionalTone && analysis.emotionalTone.length > 0) {
            html += `<div class="emotional-tone">
                <h6>🎭 Emotional Tone</h6>
                <div class="tone-tags">
                    ${analysis.emotionalTone.map(tone => 
                        `<span class="tone-tag">${StringUtils.escapeHtml(tone)}</span>`
                    ).join('')}
                </div>
            </div>`;
        }
        
        if (analysis.intensity) {
            html += `<div class="intensity-level">
                <strong>🌡️ Intensity:</strong> ${StringUtils.escapeHtml(analysis.intensity)}
            </div>`;
        }
        
        return html;
    }
    
    /**
     * Format style analysis result
     * @param {Object} analysis - Style analysis data
     * @returns {string} Formatted HTML
     */
    formatStyleResult(analysis) {
        let html = '';
        
        if (analysis.writingStyle) {
            html += `<div class="writing-style">
                <h6>✍️ Writing Style</h6>
                <p>${StringUtils.escapeHtml(analysis.writingStyle)}</p>
            </div>`;
        }
        
        if (analysis.narrativeVoice) {
            html += `<div class="narrative-voice">
                <strong>🗣️ Narrative Voice:</strong> ${StringUtils.escapeHtml(analysis.narrativeVoice)}
            </div>`;
        }
        
        if (analysis.literaryDevices && analysis.literaryDevices.length > 0) {
            html += `<div class="literary-devices">
                <h6>🎨 Literary Devices</h6>
                <div class="device-tags">
                    ${analysis.literaryDevices.map(device => 
                        `<span class="device-tag">${StringUtils.escapeHtml(device)}</span>`
                    ).join('')}
                </div>
            </div>`;
        }
        
        if (analysis.proseStyle) {
            html += `<div class="prose-style">
                <strong>📝 Prose Style:</strong> ${StringUtils.escapeHtml(analysis.proseStyle)}
            </div>`;
        }
        
        return html;
    }
    
    /**
     * Format result metadata
     * @param {Object} result - Analysis result
     * @returns {string} Formatted HTML
     */
    formatResultMetadata(result) {
        return `
            <div class="result-metadata">
                <div class="metadata-item">
                    <strong>🔧 Tokens Used:</strong> ${result.tokensUsed || 0}
                </div>
                <div class="metadata-item">
                    <strong>💰 Cost:</strong> $${(result.cost || 0).toFixed(4)}
                </div>
                <div class="metadata-item">
                    <strong>⏱️ Completed:</strong> ${new Date().toLocaleTimeString()}
                </div>
            </div>
        `;
    }
    
    /**
     * Get analysis type name by ID
     * @param {string} typeId - Analysis type ID
     * @returns {string} Type name
     */
    getAnalysisTypeName(typeId) {
        const type = this.config.availableTypes.find(t => t.id === typeId);
        return type ? type.name : typeId;
    }
    
    /**
     * Show progress section
     */
    showProgressSection() {
        const progressSection = document.getElementById('analysis-progress');
        if (progressSection) {
            progressSection.style.display = 'block';
        }
    }
    
    /**
     * Hide progress section
     */
    hideProgressSection() {
        const progressSection = document.getElementById('analysis-progress');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }
    
    /**
     * Update progress display
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} message - Progress message
     */
    updateProgress(progress, message) {
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = message || `${progress}% complete`;
        }
    }
    
    /**
     * Generate results display HTML
     * @returns {string} Results HTML
     */
    generateResultsDisplay() {
        if (this.state.results.size === 0) {
            return `<div class="no-results">
                <p>📊 Analysis results will appear here after completion.</p>
            </div>`;
        }
        
        let html = '<div class="analysis-results">';
        
        for (const [type, result] of this.state.results) {
            html += this.formatAnalysisResult(result);
        }
        
        html += '</div>';
        return html;
    }
    
    /**
     * Update results display in modal
     */
    updateResultsDisplay() {
        const resultsSection = document.getElementById('analysis-results');
        if (resultsSection) {
            resultsSection.innerHTML = this.generateResultsDisplay();
        }
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'analysis-error';
        errorDiv.innerHTML = `❌ ${StringUtils.escapeHtml(message)}`;
        
        const contentDiv = document.querySelector('.ai-analysis-content');
        if (contentDiv) {
            contentDiv.insertBefore(errorDiv, contentDiv.firstChild);
            
            // Auto-remove error after 5 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 5000);
        }
    }
    
    /**
     * Format authors array for display
     * @param {Array} authors - Authors array
     * @returns {string} Formatted authors string
     */
    formatAuthors(authors) {
        if (!authors || authors.length === 0) {
            return 'Unknown Author';
        }
        
        if (authors.length === 1) {
            return StringUtils.escapeHtml(authors[0]);
        }
        
        if (authors.length === 2) {
            return `${StringUtils.escapeHtml(authors[0])} and ${StringUtils.escapeHtml(authors[1])}`;
        }
        
        return `${StringUtils.escapeHtml(authors[0])} et al.`;
    }
    
    /**
     * Format word count for display
     * @param {number} wordCount - Word count
     * @returns {string} Formatted word count
     */
    formatWordCount(wordCount) {
        if (!wordCount || wordCount === 0) {
            return 'Unknown';
        }
        
        if (wordCount >= 1000000) {
            return `${(wordCount / 1000000).toFixed(1)}M`;
        }
        
        if (wordCount >= 1000) {
            return `${(wordCount / 1000).toFixed(1)}K`;
        }
        
        return wordCount.toString();
    }
    
    /**
     * Handle modal close event
     */
    handleModalClose() {
        // Reset state
        this.state.currentBook = null;
        this.state.activeAnalysis = null;
        this.state.selectedTypes = [];
        this.state.isProcessing = false;
        this.state.currentProgress = 0;
        
        console.log('📋 AI Analysis panel closed');
    }
    
    /**
     * Handle analysis started event
     * @param {Object} data - Event data
     */
    handleAnalysisStarted(data) {
        console.log('🚀 Analysis started:', data);
        
        if (data.bookId === this.state.currentBook?.id) {
            this.updateProgress(10, `Starting ${data.analysisType} analysis...`);
            
            // Trigger progress callback if set
            if (this.onProgress) {
                this.onProgress({
                    type: data.analysisType,
                    stage: 'started',
                    progress: 10
                });
            }
        }
    }
    
    /**
     * Handle analysis progress event
     * @param {Object} data - Event data
     */
    handleAnalysisProgress(data) {
        console.log('📊 Analysis progress:', data);
        
        if (data.bookId === this.state.currentBook?.id) {
            const progress = Math.round(data.progress || 0);
            this.updateProgress(progress, data.message || `${progress}% complete`);
            
            // Trigger progress callback if set
            if (this.onProgress) {
                this.onProgress({
                    type: data.analysisType,
                    stage: data.stage,
                    progress: progress
                });
            }
        }
    }
    
    /**
     * Handle analysis completed event
     * @param {Object} data - Event data
     */
    handleAnalysisCompleted(data) {
        console.log('✅ Analysis completed:', data);
        
        if (data.bookId === this.state.currentBook?.id) {
            this.updateProgress(100, `${data.analysisType} analysis complete!`);
            
            // Hide progress after a short delay
            setTimeout(() => {
                this.hideProgressSection();
            }, 2000);
        }
    }
    
    /**
     * Export analysis results
     * @returns {Object} Exported results data
     */
    exportResults() {
        const resultsData = {};
        
        for (const [type, result] of this.state.results) {
            resultsData[type] = result;
        }
        
        return {
            bookId: this.state.currentBook?.id,
            bookTitle: this.state.currentBook?.title,
            results: resultsData,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    }
    
    /**
     * Import analysis results
     * @param {Object} data - Imported results data
     * @returns {boolean} Success status
     */
    importResults(data) {
        try {
            if (!data || !data.results) {
                throw new Error('Invalid import data');
            }
            
            // Clear existing results
            this.state.results.clear();
            
            // Import results
            Object.entries(data.results).forEach(([type, result]) => {
                this.state.results.set(type, result);
            });
            
            // Update display
            this.updateResultsDisplay();
            
            console.log('📥 Analysis results imported successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error importing results:', error);
            this.showError(`Import failed: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Clear all analysis results
     */
    clearResults() {
        this.state.results.clear();
        this.updateResultsDisplay();
        console.log('🗑️ Analysis results cleared');
    }
    
    /**
     * Get result by analysis type
     * @param {string} type - Analysis type
     * @returns {Object|null} Analysis result
     */
    getResult(type) {
        return this.state.results.get(type) || null;
    }
    
    /**
     * Check if analysis type has completed result
     * @param {string} type - Analysis type
     * @returns {boolean} Has result
     */
    hasResult(type) {
        const result = this.state.results.get(type);
        return result && result.success;
    }
    
    /**
     * Get all completed analysis types
     * @returns {Array} Array of completed analysis type IDs
     */
    getCompletedTypes() {
        const completed = [];
        
        for (const [type, result] of this.state.results) {
            if (result && result.success) {
                completed.push(type);
            }
        }
        
        return completed;
    }
    
    /**
     * Get total tokens used across all analyses
     * @returns {number} Total tokens used
     */
    getTotalTokensUsed() {
        let total = 0;
        
        for (const [, result] of this.state.results) {
            if (result && result.success && result.tokensUsed) {
                total += result.tokensUsed;
            }
        }
        
        return total;
    }
    
    /**
     * Get total cost across all analyses
     * @returns {number} Total cost
     */
    getTotalCost() {
        let total = 0;
        
        for (const [, result] of this.state.results) {
            if (result && result.success && result.cost) {
                total += result.cost;
            }
        }
        
        return total;
    }
    
    /**
     * Generate summary of all analyses
     * @returns {Object} Analysis summary
     */
    generateAnalysisSummary() {
        const completed = this.getCompletedTypes();
        const totalTokens = this.getTotalTokensUsed();
        const totalCost = this.getTotalCost();
        
        return {
            bookId: this.state.currentBook?.id,
            bookTitle: this.state.currentBook?.title,
            completedAnalyses: completed,
            totalAnalyses: completed.length,
            totalTokensUsed: totalTokens,
            totalCost: totalCost,
            analysisDate: new Date().toISOString(),
            results: Object.fromEntries(this.state.results)
        };
    }
    
    /**
     * Validate analysis configuration
     * @returns {Object} Validation result
     */
    validateConfiguration() {
        const errors = [];
        
        if (!this.modalManager) {
            errors.push('Modal manager is required');
        }
        
        if (!this.bookAnalysisService) {
            errors.push('Book analysis service is required');
        }
        
        if (!this.eventBus) {
            errors.push('Event bus is required');
        }
        
        if (!this.config.availableTypes || this.config.availableTypes.length === 0) {
            errors.push('No analysis types configured');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Get component state for debugging
     * @returns {Object} Current state
     */
    getState() {
        return {
            currentBook: this.state.currentBook,
            activeAnalysis: this.state.activeAnalysis,
            selectedTypes: [...this.state.selectedTypes],
            resultCount: this.state.results.size,
            isProcessing: this.state.isProcessing,
            currentProgress: this.state.currentProgress,
            config: { ...this.config }
        };
    }
    
    /**
     * Destroy component and cleanup
     */
    destroy() {
        // Cleanup event listeners
        if (this.eventBus) {
            this.eventBus.off(EVENTS.AI_ANALYSIS_STARTED, this.handleAnalysisStarted.bind(this));
            this.eventBus.off(EVENTS.AI_ANALYSIS_PROGRESS, this.handleAnalysisProgress.bind(this));
            this.eventBus.off(EVENTS.AI_ANALYSIS_COMPLETED, this.handleAnalysisCompleted.bind(this));
        }
        
        // Clear state
        this.state.results.clear();
        this.state.currentBook = null;
        this.state.activeAnalysis = null;
        this.state.selectedTypes = [];
        
        // Clear callbacks
        this.onProgress = null;
        this.onBatchProgress = null;
        
        console.log('🧹 AIAnalysisPanel destroyed and cleaned up');
    }
}

