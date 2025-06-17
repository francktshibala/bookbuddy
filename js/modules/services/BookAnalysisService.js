/**
 * BookAnalysisService.js - AI-Powered Book Analysis Orchestration
 * Part of Book Buddy - Phase 2.1: Analysis Layer Implementation
 * 
 * @author Book Buddy Development Team
 * @version 1.0.0
 */

/**
 * BookAnalysisService - Main orchestration service for AI book analysis
 * Coordinates between OpenAI service, storage, and UI components
 */
export default class BookAnalysisService {
    constructor(openAIService, storageManager, eventBus, options = {}) {
        // Validate dependencies
        if (!openAIService) {
            throw new Error('OpenAI service is required');
        }
        if (!storageManager) {
            throw new Error('Storage manager is required'); 
        }

        // Inject dependencies
        this.openAIService = openAIService;
        this.storageManager = storageManager;
        this.eventBus = eventBus;

        // Configuration with defaults
        this.config = {
            maxCacheSize: options.maxCacheSize || 100,
            defaultTimeout: options.timeout || 30000,
            maxRetries: options.maxRetries || 2,
            enableProgressTracking: options.enableProgressTracking !== false,
            enableCaching: options.enableCaching !== false,
            enablePersistence: options.enablePersistence !== false,
            
            // Analysis configuration
            defaultAnalysisOptions: {
                analysisDepth: 'standard',
                includeQuotes: false,
                targetAudience: 'general',
                maxTokens: 1000,
                ...options.defaultAnalysisOptions
            },
            
            // Chunking configuration
            chunkingOptions: {
                maxTokensPerChunk: 3000,
                overlapTokens: 200,
                preserveSentences: true,
                ...options.chunkingOptions
            }
        };

        // Internal state
        this.state = {
            initialized: false,
            cache: new Map(),
            activeAnalyses: new Set(),
            
            // Statistics
            stats: {
                totalAnalyses: 0,
                successfulAnalyses: 0,
                failedAnalyses: 0,
                cacheHits: 0,
                cacheMisses: 0,
                cacheSize: 0,
                averageAnalysisTime: 0,
                isHealthy: true
            }
        };

        this.initialize();
        console.log('🤖 BookAnalysisService initialized');
    }

    /**
     * Initialize the service and setup event listeners
     */
    initialize() {
        try {
            this.setupEventListeners();
            this.validateConfiguration();
            this.initializeCache();
            
            this.state.initialized = true;
            console.log('✅ BookAnalysisService ready for analysis');
            
            // Emit service initialization event
            if (this.eventBus && this.eventBus.emit) {
                this.eventBus.emit('ai:service:ready', {
                    service: 'BookAnalysisService',
                    supportedTypes: this.getSupportedAnalysisTypes(),
                    config: this.getPublicConfig()
                });
            }

        } catch (error) {
            console.error('❌ BookAnalysisService initialization failed:', error);
            this.state.stats.isHealthy = false;
            throw error;
        }
    }

    /**
     * Setup EventBus listeners for Book Buddy integration
     */
    setupEventListeners() {
        if (!this.eventBus || !this.eventBus.on) {
            console.warn('⚠️ EventBus not available, skipping event listeners');
            return;
        }

        // Listen for book analysis requests from UI
        this.eventBus.on('BOOK_ANALYSIS_REQUESTED', async (data) => {
            await this.handleAnalysisRequest(data);
        });

        // Listen for batch analysis requests
        this.eventBus.on('ai:batch:requested', async (data) => {
            await this.handleBatchRequest(data);
        });

        // Listen for cache management events
        this.eventBus.on('ai:cache:clear', () => {
            this.clearCache();
        });

        console.log('🔗 BookAnalysisService event listeners configured');
    }

    /**
     * Core method: Analyze a single book with specified analysis type
     */
    async analyzeBook(bookData, analysisType, options = {}) {
        const analysisId = this.generateAnalysisId(bookData.id, analysisType);
        
        try {
            // Validate inputs
            const inputValidation = this.validateAnalysisRequest(bookData, analysisType, options);
            if (!inputValidation.valid) {
                return this.createErrorResponse(inputValidation.error, analysisId);
            }

            // Check cache first
            if (this.config.enableCaching) {
                const cachedResult = await this.getCachedResult(bookData.id, analysisType);
                if (cachedResult) {
                    console.log(`💾 Cache hit for ${bookData.title} - ${analysisType}`);
                    this.state.stats.cacheHits++;
                    return { ...cachedResult, fromCache: true };
                }
                this.state.stats.cacheMisses++;
            }

            // Start analysis tracking
            const startTime = Date.now();
            this.state.activeAnalyses.add(analysisId);

            // Emit analysis started event
            if (this.eventBus && this.eventBus.emit) {
                this.eventBus.emit('AI_ANALYSIS_STARTED', {
                    analysisId,
                    bookId: bookData.id,
                    bookTitle: bookData.title,
                    analysisType,
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`🚀 Starting ${analysisType} analysis for "${bookData.title}"`);

            // Prepare analysis request with merged options
            const analysisOptions = this.mergeAnalysisOptions(options);
            
            // Handle large books with chunking
            const chunks = this.chunkBookContent(bookData, {
                maxTokens: analysisOptions.maxTokensPerChunk || this.config.chunkingOptions.maxTokensPerChunk
            });

            let analysisResult;
            
            if (chunks.length === 1) {
                // Single chunk analysis
                analysisResult = await this.performSingleAnalysis(
                    bookData, 
                    analysisType, 
                    analysisOptions,
                    analysisId
                );
            } else {
                // Multi-chunk analysis
                analysisResult = await this.performChunkedAnalysis(
                    bookData,
                    chunks,
                    analysisType,
                    analysisOptions,
                    analysisId
                );
            }

            // Validate and enhance result
            const resultValidation = this.validateAnalysisResult(analysisResult);
            if (!resultValidation.valid) {
                throw new Error(`Invalid analysis result: ${resultValidation.errors.join(', ')}`);
            }

            const enhancedResult = this.enhanceAnalysisResult(analysisResult, bookData, {
                analysisId,
                processingTime: Date.now() - startTime,
                chunksProcessed: chunks.length
            });

            // Cache the result
            if (this.config.enableCaching) {
                await this.cacheResult(bookData.id, analysisType, enhancedResult);
            }

            // Update statistics
            this.updateAnalysisStats(startTime, true);

            // Emit completion event
            if (this.eventBus && this.eventBus.emit) {
                this.eventBus.emit('AI_ANALYSIS_COMPLETED', {
                    analysisId,
                    bookId: bookData.id,
                    analysisType,
                    success: true,
                    processingTime: Date.now() - startTime,
                    fromCache: false
                });
            }

            console.log(`✅ Completed ${analysisType} analysis for "${bookData.title}" in ${Date.now() - startTime}ms`);

            return enhancedResult;

        } catch (error) {
            return await this.handleAnalysisError(error, bookData, analysisType, analysisId);
        } finally {
            // Cleanup tracking
            this.state.activeAnalyses.delete(analysisId);
        }
    }

    /**
     * Chunk book content for large books that exceed token limits
     */
    chunkBookContent(bookData, options = {}) {
        const content = bookData.content || '';
        const maxTokens = options.maxTokens || this.config.chunkingOptions.maxTokensPerChunk;

        // Quick exit for empty content
        if (!content.trim()) {
            return [{
                content: '',
                chunkIndex: 0,
                totalChunks: 1,
                metadata: {
                    startPosition: 0,
                    endPosition: 0,
                    estimatedTokens: 0,
                    isEmpty: true
                }
            }];
        }

        // Estimate total tokens
        const totalTokens = this.estimateChunkTokens(content);
        
        // Single chunk if under limit
        if (totalTokens <= maxTokens) {
            return [{
                content: content,
                chunkIndex: 0,
                totalChunks: 1,
                metadata: {
                    startPosition: 0,
                    endPosition: content.length,
                    estimatedTokens: totalTokens,
                    isSingleChunk: true
                }
            }];
        }

        console.log(`📄 Chunking large book: ${totalTokens} tokens → ${maxTokens} per chunk`);

        // Calculate chunk size in characters (rough estimation)
        const avgCharsPerToken = content.length / totalTokens;
        const chunkSizeChars = Math.floor(maxTokens * avgCharsPerToken);

        const chunks = [];
        let position = 0;
        let chunkIndex = 0;

        while (position < content.length) {
            const endPosition = Math.min(position + chunkSizeChars, content.length);
            const chunkContent = content.substring(position, endPosition);

            const chunk = {
                content: chunkContent,
                chunkIndex: chunkIndex++,
                totalChunks: Math.ceil(content.length / chunkSizeChars),
                metadata: {
                    startPosition: position,
                    endPosition: position + chunkContent.length,
                    estimatedTokens: this.estimateChunkTokens(chunkContent)
                }
            };

            chunks.push(chunk);
            position = endPosition;
        }

        // Update total chunks count
        chunks.forEach(chunk => {
            chunk.totalChunks = chunks.length;
        });

        console.log(`📄 Created ${chunks.length} chunks for analysis`);
        return chunks;
    }

    /**
     * Estimate token count for text content
     */
    estimateChunkTokens(content) {
        if (!content) return 0;
        
        const words = content.trim().split(/\s+/).filter(word => word.length > 0);
        const characters = content.length;
        
        // Rough estimation: Average 4 characters per token for English
        const baseEstimate = Math.ceil(characters / 4);
        const wordBasedEstimate = Math.ceil(words.length * 1.3);
        
        return Math.max(baseEstimate, wordBasedEstimate);
    }

    /**
     * Perform analysis on a single chunk/book
     */
    async performSingleAnalysis(bookData, analysisType, options, analysisId) {
    try {
        this.eventBus.emit(EVENTS.AI_ANALYSIS_PROGRESS, {
            bookId: bookData.id, analysisType, progress: 25, stage: 'sending', message: 'Sending request to AI...'
        });
        
        const analysisResult = await this.openAIService.analyzeBook(bookData, analysisType, options);

        if (!analysisResult.success) {
            throw new Error(`OpenAI analysis failed: ${analysisResult.error}`);
        }

        // Move this BEFORE return
        this.eventBus.emit(EVENTS.AI_ANALYSIS_PROGRESS, {
            bookId: bookData.id, analysisType, progress: 90, stage: 'processing', message: 'Processing AI response...'
        });

        return {
            success: true,
            content: analysisResult.content,
            // ... rest of return object
        };
    } catch (error) {
        console.error(`❌ Single analysis failed:`, error);
        throw error;
    }
}

    /**
     * Perform analysis on chunked content
     */
    async performChunkedAnalysis(bookData, chunks, analysisType, options, analysisId) {
        try {
            console.log(`📄 Processing ${chunks.length} chunks for ${analysisType} analysis`);

            const chunkResults = [];
            let totalTokens = 0;
            let totalCost = 0;

            // Process each chunk
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];

                // Create chunk-specific book data
                const chunkBookData = {
                    ...bookData,
                    content: chunk.content,
                    wordCount: chunk.content.split(/\s+/).length,
                    chunkInfo: {
                        index: chunk.chunkIndex,
                        total: chunk.totalChunks,
                        position: `${chunk.metadata.startPosition}-${chunk.metadata.endPosition}`
                    }
                };

                // Analyze this chunk
                const chunkResult = await this.performSingleAnalysis(
                    chunkBookData, 
                    analysisType, 
                    { ...options, isChunk: true },
                    `${analysisId}_chunk_${i}`
                );

                if (chunkResult.success) {
                    chunkResults.push({
                        ...chunkResult,
                        chunkIndex: i,
                        chunkMetadata: chunk.metadata
                    });

                    totalTokens += chunkResult.metadata.tokens || 0;
                    totalCost += chunkResult.metadata.cost || 0;
                } else {
                    console.warn(`⚠️ Chunk ${i} analysis failed, continuing with remaining chunks`);
                }

                // Small delay between chunks to respect rate limits
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            // Merge chunk results into final analysis
            const mergedContent = await this.mergeChunkResults(chunkResults, analysisType, options);

            return {
                success: true,
                content: mergedContent,
                analysisType,
                confidence: this.calculateAverageConfidence(chunkResults),
                metadata: {
                    model: chunkResults[0]?.metadata?.model || 'gpt-3.5-turbo',
                    tokens: totalTokens,
                    cost: totalCost,
                    processingMethod: 'chunked',
                    chunksProcessed: chunkResults.length,
                    totalChunks: chunks.length
                }
            };

        } catch (error) {
            console.error('❌ Chunked analysis failed:', error);
            throw error;
        }
    }

    /**
     * Merge results from multiple chunks into coherent analysis
     */
    async mergeChunkResults(chunkResults, analysisType, options) {
        if (chunkResults.length === 0) {
            throw new Error('No chunk results to merge');
        }

        if (chunkResults.length === 1) {
            return chunkResults[0].content;
        }

        try {
            // Strategy depends on analysis type
            switch (analysisType) {
                case 'summary':
                    return this.mergeSummaryChunks(chunkResults);
                
                case 'themes':
                    return this.mergeThemeChunks(chunkResults);
                
                case 'characters':
                    return this.mergeCharacterChunks(chunkResults);
                
                case 'difficulty':
                    return this.mergeDifficultyChunks(chunkResults);
                
                default:
                    return this.mergeGenericChunks(chunkResults, analysisType);
            }

        } catch (error) {
            console.error('❌ Chunk merging failed:', error);
            // Fallback: concatenate results with separators
            return chunkResults.map((result, index) => 
                `--- Chunk ${index + 1} ---\n${result.content}`
            ).join('\n\n');
        }
    }

    /**
     * Merge summary chunks into coherent overall summary
     */
    mergeSummaryChunks(chunkResults) {
        const summaries = chunkResults.map(r => r.content);
        
        const introduction = summaries[0].split('\n')[0] || '';
        const keyPoints = summaries.map(summary => {
            const sentences = summary.split('.').filter(s => s.trim().length > 20);
            return sentences.slice(0, 2).join('.');
        }).filter(point => point.trim());

        const conclusion = summaries[summaries.length - 1].split('\n').pop() || '';

        return `${introduction}\n\nKey developments across the work:\n${keyPoints.map(point => `• ${point.trim()}`).join('\n')}\n\n${conclusion}`;
    }

    /**
     * Merge theme analysis chunks
     */
    mergeThemeChunks(chunkResults) {
        return `Major themes identified across the work:\n\n${chunkResults.map(r => r.content).join('\n\n')}`;
    }

    /**
     * Merge character analysis chunks
     */
    mergeCharacterChunks(chunkResults) {
        return `Character analysis across the complete work:\n\n${chunkResults.map((result, index) => 
            `Section ${index + 1} Analysis:\n${result.content}`
        ).join('\n\n')}`;
    }

    /**
     * Merge difficulty assessment chunks
     */
    mergeDifficultyChunks(chunkResults) {
        return `Overall reading difficulty assessment:\n\n${chunkResults.map(r => r.content).join('\n\n')}`;
    }

    /**
     * Generic chunk merging for other analysis types
     */
    mergeGenericChunks(chunkResults, analysisType) {
        return `${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} analysis:\n\n${chunkResults.map((result, index) => 
            `Part ${index + 1}:\n${result.content}`
        ).join('\n\n')}`;
    }

    /**
     * Calculate average confidence from chunk results
     */
    calculateAverageConfidence(chunkResults) {
        if (chunkResults.length === 0) return 0;
        
        const confidences = chunkResults.map(r => r.confidence || 0.85);
        return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    }

    /**
     * Cache management methods
     */
    async getCachedResult(bookId, analysisType) {
        if (!this.config.enableCaching) return null;

        const cacheKey = `${bookId}_${analysisType}`;
        
        if (this.state.cache.has(cacheKey)) {
            const cached = this.state.cache.get(cacheKey);
            
            // Check if cache entry is still valid (24 hours)
            const ageMs = Date.now() - cached.timestamp;
            if (ageMs < 24 * 60 * 60 * 1000) {
                return cached.result;
            } else {
                // Remove expired entry
                this.state.cache.delete(cacheKey);
                this.state.stats.cacheSize = this.state.cache.size;
            }
        }

        return null;
    }

    async cacheResult(bookId, analysisType, result) {
        if (!this.config.enableCaching) return;

        const cacheKey = `${bookId}_${analysisType}`;
        
        // Check cache size limits
        if (this.state.cache.size >= this.config.maxCacheSize) {
            this.evictLeastRecentlyUsed();
        }

        this.state.cache.set(cacheKey, {
            result: { ...result },
            timestamp: Date.now(),
            accessCount: 1
        });

        this.state.stats.cacheSize = this.state.cache.size;
    }

    clearCache() {
        this.state.cache.clear();
        this.state.stats.cacheSize = 0;
        this.state.stats.cacheHits = 0;
        this.state.stats.cacheMisses = 0;
        console.log('🗑️ Analysis cache cleared');
    }

    evictLeastRecentlyUsed() {
        if (this.state.cache.size === 0) return;

        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, entry] of this.state.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.state.cache.delete(oldestKey);
            console.log(`🗑️ Evicted cache entry: ${oldestKey}`);
        }
    }

    /**
     * Result validation and enhancement
     */
    validateAnalysisResult(result) {
        const errors = [];

        if (!result) {
            errors.push('Result is null or undefined');
            return { valid: false, errors };
        }

        if (!result.content || typeof result.content !== 'string') {
            errors.push('Missing or invalid content');
        }

        if (!result.analysisType || typeof result.analysisType !== 'string') {
            errors.push('Missing or invalid analysis type');
        }

        return { valid: errors.length === 0, errors };
    }

    enhanceAnalysisResult(result, bookData, additionalMetadata = {}) {
        return {
            ...result,
            analysisId: additionalMetadata.analysisId || this.generateAnalysisId(bookData.id, result.analysisType),
            bookData: {
                id: bookData.id,
                title: bookData.title,
                author: bookData.author,
                wordCount: bookData.wordCount
            },
            generatedAt: new Date().toISOString(),
            enhanced: true,
            metadata: {
                ...result.metadata,
                ...additionalMetadata,
                serviceVersion: '1.0.0'
            }
        };
    }

    /**
     * Configuration and utility methods
     */
    getSupportedAnalysisTypes() {
        return ['summary', 'themes', 'characters', 'difficulty', 'sentiment', 'style'];
    }

    getPublicConfig() {
        return {
            supportedAnalysisTypes: this.getSupportedAnalysisTypes(),
            cacheEnabled: this.config.enableCaching,
            progressTracking: this.config.enableProgressTracking,
            chunkingEnabled: true,
            maxCacheSize: this.config.maxCacheSize
        };
    }

    /**
     * Statistics and monitoring
     */
    getStats() {
        return {
            ...this.state.stats,
            activeAnalyses: this.state.activeAnalyses.size,
            uptime: this.state.initialized ? Date.now() - this.startTime : 0
        };
    }

    /**
     * Error handling
     */
    async handleAnalysisError(error, bookData, analysisType, analysisId) {
        console.error(`❌ Analysis failed for "${bookData?.title}" - ${analysisType}:`, error);

        // Update statistics
        this.updateAnalysisStats(0, false);

        // Emit error event
        if (this.eventBus && this.eventBus.emit) {
            this.eventBus.emit('AI_ANALYSIS_ERROR', {
                analysisId,
                bookId: bookData?.id,
                analysisType,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        return this.createErrorResponse(error.message, analysisId);
    }

    createErrorResponse(message, analysisId = null) {
        return {
            success: false,
            error: message,
            analysisId,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Request validation
     */
    validateAnalysisRequest(bookData, analysisType, options) {
        const errors = [];

        // Validate book data
        if (!bookData) {
            errors.push('Book data is required');
        } else {
            if (!bookData.id) errors.push('Book ID is required');
            if (!bookData.title) errors.push('Book title is required');
            if (!bookData.content && !options.allowEmptyContent) errors.push('Book content is required');
        }

        // Validate analysis type
        if (!analysisType) {
            errors.push('Analysis type is required');
        } else if (!this.getSupportedAnalysisTypes().includes(analysisType)) {
            errors.push(`Unsupported analysis type: ${analysisType}`);
        }

        return { valid: errors.length === 0, error: errors.join('; ') };
    }

    validateConfiguration() {
        if (this.config.maxCacheSize < 1) {
            throw new Error('maxCacheSize must be at least 1');
        }

        if (this.config.defaultTimeout < 1000) {
            throw new Error('defaultTimeout must be at least 1000ms');
        }

        if (this.config.chunkingOptions.maxTokensPerChunk < 100) {
            throw new Error('maxTokensPerChunk must be at least 100');
        }
    }

    /**
     * Event handlers
     */
    async handleAnalysisRequest(data) {
        try {
            const { bookData, analysisType, options = {} } = data;
            const result = await this.analyzeBook(bookData, analysisType, options);
            
            if (this.eventBus && this.eventBus.emit) {
                this.eventBus.emit('ai:analysis:response', {
                    requestId: data.requestId,
                    result
                });
            }

        } catch (error) {
            console.error('❌ Analysis request handler error:', error);
            if (this.eventBus && this.eventBus.emit) {
                this.eventBus.emit('ai:analysis:response', {
                    requestId: data.requestId,
                    result: this.createErrorResponse(error.message)
                });
            }
        }
    }

    async handleBatchRequest(data) {
        try {
            const { bookData, analysisTypes, options = {} } = data;
            const result = await this.analyzeBatch(bookData, analysisTypes, options);
            
            if (this.eventBus && this.eventBus.emit) {
                this.eventBus.emit('ai:batch:response', {
                    requestId: data.requestId,
                    result
                });
            }

        } catch (error) {
            console.error('❌ Batch request handler error:', error);
            if (this.eventBus && this.eventBus.emit) {
                this.eventBus.emit('ai:batch:response', {
                    requestId: data.requestId,
                    result: { success: false, error: error.message }
                });
            }
        }
    }

    /**
     * Utility methods
     */
    generateAnalysisId(bookId, analysisType) {
        return `analysis_${bookId}_${analysisType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    mergeAnalysisOptions(options) {
        return {
            ...this.config.defaultAnalysisOptions,
            ...options,
            timeout: options.timeout || this.config.defaultTimeout
        };
    }

    updateAnalysisStats(startTime, success) {
        this.state.stats.totalAnalyses++;
        
        if (success) {
            this.state.stats.successfulAnalyses++;
        } else {
            this.state.stats.failedAnalyses++;
        }

        // Update health status
        const errorRate = this.state.stats.failedAnalyses / this.state.stats.totalAnalyses;
        this.state.stats.isHealthy = errorRate < 0.1;
    }

    initializeCache() {
        this.state.cache = new Map();
        this.state.stats.cacheSize = 0;
        this.startTime = Date.now();
    }

    // ADD THESE METHODS to your existing BookAnalysisService.js file:

/**
 * ✅ ANALYSIS HANDLER 1: Summary Generation
 */
async generateSummary(book, options = {}) {
    return await this.analyzeBook(book, 'summary', {
        length: options.length || 'medium',
        includeKeyPoints: options.includeKeyPoints !== false,
        ...options
    });
}

/**
 * ✅ ANALYSIS HANDLER 2: Theme Extraction  
 */
async extractThemes(book, options = {}) {
    return await this.analyzeBook(book, 'themes', {
        maxThemes: options.maxThemes || 5,
        includeAnalysis: options.includeAnalysis !== false,
        ...options
    });
}

/**
 * ✅ ANALYSIS HANDLER 3: Character Analysis
 */
async analyzeCharacters(book, options = {}) {
    return await this.analyzeBook(book, 'characters', {
        includeTraits: options.includeTraits !== false,
        includeRelationships: options.includeRelationships !== false,
        ...options
    });
}

/**
 * ✅ ANALYSIS HANDLER 4: Difficulty Assessment
 */
async assessDifficulty(book, options = {}) {
    return await this.analyzeBook(book, 'difficulty', {
        includeAgeRecommendation: options.includeAgeRecommendation !== false,
        includeReadingTime: options.includeReadingTime !== false,
        ...options
    });
}

/**
 * ✅ ANALYSIS HANDLER 5: Sentiment Analysis
 */
async analyzeSentiment(book, options = {}) {
    return await this.analyzeBook(book, 'sentiment', {
        includeEmotionalTone: options.includeEmotionalTone !== false,
        includeMoodProgression: options.includeMoodProgression !== false,
        ...options
    });
}

/**
 * ✅ ANALYSIS HANDLER 6: Style Analysis
 */
async analyzeStyle(book, options = {}) {
    return await this.analyzeBook(book, 'style', {
        includeLiteraryDevices: options.includeLiteraryDevices !== false,
        includeProseStyle: options.includeProseStyle !== false,
        ...options
    });
}
}

// Global export for development/testing
if (typeof window !== 'undefined') {
    window.BookAnalysisService = BookAnalysisService;
}

