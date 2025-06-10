/**
 * BookAnalysisService.js - AI-Powered Book Analysis Orchestration
 * Part of Book Buddy - Phase 2.1: Analysis Layer Implementation
 * 
 * Orchestrates AI analysis workflows for books, manages chunking for large content,
 * coordinates multiple analysis types, and implements caching and result persistence.
 * 
 * Follows Book Buddy's established patterns:
 * ✅ Service classes with dependency injection
 * ✅ EventBus for component communication  
 * ✅ Comprehensive error handling
 * ✅ TDD implementation approach
 * ✅ Console logging with emoji prefixes
 * ✅ Async/await patterns
 * 
 * @author Book Buddy Development Team
 * @version 1.0.0
 */

import { eventBus, EVENTS } from '../../utils/EventBus.js';

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
        if (!eventBus) {
            throw new Error('EventBus is required');
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
            },
            
            // Performance settings
            performance: {
                concurrentLimit: options.concurrentLimit || 3,
                memoryLimit: options.memoryLimit || 100, // MB
                cacheEvictionThreshold: options.cacheEvictionThreshold || 0.8,
                ...options.performance
            }
        };

        // Internal state
        this.state = {
            initialized: false,
            cache: new Map(),
            activeAnalyses: new Set(),
            progressListeners: [],
            
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
            },
            
            // Performance tracking
            performance: {
                analysisTimings: [],
                memoryUsage: 0,
                peakMemoryUsage: 0,
                concurrentAnalyses: 0
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
            this.eventBus.emit('ai:service:ready', {
                service: 'BookAnalysisService',
                supportedTypes: this.getSupportedAnalysisTypes(),
                config: this.getPublicConfig()
            });

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
        // Listen for book analysis requests from UI
        this.eventBus.on(EVENTS.BOOK_ANALYSIS_REQUESTED, async (data) => {
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

        // Listen for memory pressure events
        this.eventBus.on('system:memory:pressure', () => {
            this.handleMemoryPressure();
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
            const validation = this.validateAnalysisRequest(bookData, analysisType, options);
            if (!validation.valid) {
                return this.createErrorResponse(validation.error, analysisId);
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
            this.state.performance.concurrentAnalyses++;

            // Emit analysis started event
            this.eventBus.emit(EVENTS.AI_ANALYSIS_STARTED, {
                analysisId,
                bookId: bookData.id,
                bookTitle: bookData.title,
                analysisType,
                timestamp: new Date().toISOString()
            });

            console.log(`🚀 Starting ${analysisType} analysis for "${bookData.title}"`);

            // Progress tracking setup
            if (this.config.enableProgressTracking) {
                this.emitProgress(analysisId, bookData.id, 0.1, 'Analysis started');
            }

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
            const validation = this.validateAnalysisResult(analysisResult);
            if (!validation.valid) {
                throw new Error(`Invalid analysis result: ${validation.errors.join(', ')}`);
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

            // Persist result if enabled
            if (this.config.enablePersistence) {
                await this.saveAnalysisResult(bookData.id, analysisType, enhancedResult);
            }

            // Update statistics
            this.updateAnalysisStats(startTime, true);

            // Emit completion event
            this.eventBus.emit(EVENTS.AI_ANALYSIS_COMPLETED, {
                analysisId,
                bookId: bookData.id,
                analysisType,
                success: true,
                processingTime: Date.now() - startTime,
                fromCache: false
            });

            if (this.config.enableProgressTracking) {
                this.emitProgress(analysisId, bookData.id, 1.0, 'Analysis completed');
            }

            console.log(`✅ Completed ${analysisType} analysis for "${bookData.title}" in ${Date.now() - startTime}ms`);

            return enhancedResult;

        } catch (error) {
            return await this.handleAnalysisError(error, bookData, analysisType, analysisId);
        } finally {
            // Cleanup tracking
            this.state.activeAnalyses.delete(analysisId);
            this.state.performance.concurrentAnalyses--;
        }
    }

    /**
     * Analyze book with multiple analysis types
     */
    async analyzeBatch(bookData, analysisTypes, options = {}) {
        const batchId = this.generateBatchId(bookData.id);
        const startTime = Date.now();

        try {
            console.log(`🔄 Starting batch analysis for "${bookData.title}": ${analysisTypes.join(', ')}`);

            const results = [];
            const batchOptions = { ...options, batchId };

            // Process each analysis type
            for (let i = 0; i < analysisTypes.length; i++) {
                const analysisType = analysisTypes[i];
                
                try {
                    const result = await this.analyzeBook(bookData, analysisType, batchOptions);
                    results.push(result);
                    
                    // Emit batch progress
                    this.eventBus.emit('ai:batch:progress', {
                        batchId,
                        bookId: bookData.id,
                        completed: i + 1,
                        total: analysisTypes.length,
                        currentType: analysisType,
                        progress: (i + 1) / analysisTypes.length
                    });

                } catch (error) {
                    console.error(`❌ Batch analysis failed for ${analysisType}:`, error);
                    results.push({
                        success: false,
                        analysisType,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const batchResult = {
                success: successCount > 0,
                batchId,
                bookId: bookData.id,
                analysisTypes,
                results,
                successCount,
                failureCount: results.length - successCount,
                processingTime: Date.now() - startTime
            };

            // Emit batch completion
            this.eventBus.emit('ai:batch:completed', batchResult);

            console.log(`✅ Batch analysis completed: ${successCount}/${analysisTypes.length} successful`);

            return batchResult;

        } catch (error) {
            console.error('❌ Batch analysis failed:', error);
            
            return {
                success: false,
                batchId,
                bookId: bookData.id,
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * Chunk book content for large books that exceed token limits
     */
    chunkBookContent(bookData, options = {}) {
        const content = bookData.content || '';
        const maxTokens = options.maxTokens || this.config.chunkingOptions.maxTokensPerChunk;
        const overlap = options.overlap || this.config.chunkingOptions.overlapTokens;
        const preserveSentences = options.preserveSentences !== false;

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
        const overlapChars = Math.floor(overlap * avgCharsPerToken);

        const chunks = [];
        let position = 0;
        let chunkIndex = 0;

        while (position < content.length) {
            const endPosition = Math.min(position + chunkSizeChars, content.length);
            let chunkContent = content.substring(position, endPosition);

            // Preserve sentence boundaries if enabled
            if (preserveSentences && endPosition < content.length) {
                const lastSentenceEnd = this.findLastSentenceEnd(chunkContent);
                if (lastSentenceEnd > chunkContent.length * 0.7) { // Only if we don't lose too much
                    chunkContent = chunkContent.substring(0, lastSentenceEnd);
                }
            }

            const chunk = {
                content: chunkContent,
                chunkIndex: chunkIndex++,
                totalChunks: Math.ceil(content.length / (chunkSizeChars - overlapChars)),
                metadata: {
                    startPosition: position,
                    endPosition: position + chunkContent.length,
                    estimatedTokens: this.estimateChunkTokens(chunkContent),
                    hasOverlap: position > 0,
                    overlapSize: position > 0 ? overlapChars : 0
                }
            };

            chunks.push(chunk);

            // Move position forward, accounting for overlap
            position += chunkContent.length - (position > 0 ? overlapChars : 0);
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
        
        // More sophisticated token estimation
        // Account for whitespace, punctuation, and average word length
        const words = content.trim().split(/\s+/).filter(word => word.length > 0);
        const characters = content.length;
        
        // Rough estimation: 
        // - Average 4 characters per token for English
        // - Adjust for punctuation and special characters
        const baseEstimate = Math.ceil(characters / 4);
        const wordBasedEstimate = Math.ceil(words.length * 1.3); // Account for subwords
        
        // Use the higher estimate to be conservative
        return Math.max(baseEstimate, wordBasedEstimate);
    }

    /**
     * Find the last complete sentence ending in text
     */
    findLastSentenceEnd(text) {
        const sentenceEnders = /[.!?]\s/g;
        let lastMatch = -1;
        let match;
        
        while ((match = sentenceEnders.exec(text)) !== null) {
            lastMatch = match.index + 1;
        }
        
        return lastMatch > 0 ? lastMatch : text.length;
    }

    /**
     * Perform analysis on a single chunk/book
     */
    async performSingleAnalysis(bookData, analysisType, options, analysisId) {
        try {
            // Emit progress
            if (this.config.enableProgressTracking) {
                this.emitProgress(analysisId, bookData.id, 0.3, 'Preparing analysis request');
            }

            // Generate analysis prompt using OpenAI service
            const analysisResult = await this.openAIService.analyzeBook(bookData, analysisType, options);

            if (!analysisResult.success) {
                throw new Error(`OpenAI analysis failed: ${analysisResult.error}`);
            }

            if (this.config.enableProgressTracking) {
                this.emitProgress(analysisId, bookData.id, 0.9, 'Processing results');
            }

            return {
                success: true,
                content: analysisResult.content,
                analysisType,
                confidence: analysisResult.confidence || 0.85,
                metadata: {
                    model: analysisResult.model || 'gpt-3.5-turbo',
                    tokens: analysisResult.usage?.totalTokens || 0,
                    cost: analysisResult.usage?.cost || 0,
                    processingMethod: 'single_chunk',
                    ...analysisResult.metadata
                }
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
                
                if (this.config.enableProgressTracking) {
                    const progress = 0.2 + (i / chunks.length) * 0.6; // 20-80% for chunk processing
                    this.emitProgress(analysisId, bookData.id, progress, `Processing chunk ${i + 1}/${chunks.length}`);
                }

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

            if (this.config.enableProgressTracking) {
                this.emitProgress(analysisId, bookData.id, 0.85, 'Merging chunk results');
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
                    totalChunks: chunks.length,
                    chunkResults: chunkResults.map(r => ({
                        chunkIndex: r.chunkIndex,
                        tokens: r.metadata.tokens,
                        confidence: r.confidence
                    }))
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
                
                case 'sentiment':
                    return this.mergeSentimentChunks(chunkResults);
                
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
        
        // Extract key points from each chunk summary
        const introduction = summaries[0].split('\n')[0] || '';
        const keyPoints = summaries.map(summary => {
            // Extract main points (simplified)
            const sentences = summary.split('.').filter(s => s.trim().length > 20);
            return sentences.slice(0, 2).join('.'); // Take first 2 substantial sentences
        }).filter(point => point.trim());

        const conclusion = summaries[summaries.length - 1].split('\n').pop() || '';

        return `${introduction}\n\nKey developments across the work:\n${keyPoints.map(point => `• ${point.trim()}`).join('\n')}\n\n${conclusion}`;
    }

    /**
     * Merge theme analysis chunks
     */
    mergeThemeChunks(chunkResults) {
        const themes = new Map();
        
        chunkResults.forEach(result => {
            // Extract themes mentioned in this chunk (simplified)
            const content = result.content.toLowerCase();
            const commonThemes = ['love', 'death', 'power', 'freedom', 'identity', 'family', 'society', 'nature', 'time', 'truth'];
            
            commonThemes.forEach(theme => {
                if (content.includes(theme)) {
                    if (!themes.has(theme)) {
                        themes.set(theme, []);
                    }
                    themes.get(theme).push(result.chunkIndex);
                }
            });
        });

        const themeAnalysis = Array.from(themes.entries())
            .filter(([theme, chunks]) => chunks.length > 1) // Themes appearing in multiple chunks
            .map(([theme, chunks]) => `${theme.charAt(0).toUpperCase() + theme.slice(1)}: Appears throughout the work (chunks ${chunks.join(', ')})`)
            .join('\n');

        return `Major themes identified across the work:\n\n${themeAnalysis}\n\nDetailed analysis:\n${chunkResults.map(r => r.content).join('\n\n')}`;
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
        const difficulties = chunkResults.map(r => {
            // Extract difficulty level (simplified)
            const content = r.content.toLowerCase();
            if (content.includes('advanced') || content.includes('difficult')) return 3;
            if (content.includes('intermediate') || content.includes('moderate')) return 2;
            return 1;
        });

        const avgDifficulty = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
        const difficultyLevel = avgDifficulty > 2.5 ? 'Advanced' : avgDifficulty > 1.5 ? 'Intermediate' : 'Beginner';

        return `Overall Reading Difficulty: ${difficultyLevel}\n\nAnalysis varies across sections:\n${chunkResults.map(r => r.content).join('\n\n')}`;
    }

    /**
     * Merge sentiment analysis chunks
     */
    mergeSentimentChunks(chunkResults) {
        return `Sentiment analysis across the complete work:\n\n${chunkResults.map((result, index) => 
            `Section ${index + 1}:\n${result.content}`
        ).join('\n\n')}`;
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

    invalidateCache(bookId, analysisType = null) {
        if (analysisType) {
            // Clear specific analysis
            const cacheKey = `${bookId}_${analysisType}`;
            this.state.cache.delete(cacheKey);
        } else {
            // Clear all analyses for this book
            for (const key of this.state.cache.keys()) {
                if (key.startsWith(`${bookId}_`)) {
                    this.state.cache.delete(key);
                }
            }
        }
        
        this.state.stats.cacheSize = this.state.cache.size;
        console.log(`🗑️ Cache invalidated for book ${bookId}${analysisType ? ` - ${analysisType}` : ''}`);
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
     * Persistence methods
     */
    async saveAnalysisResult(bookId, analysisType, result) {
        if (!this.config.enablePersistence) return { success: true };

        try {
            const key = `analysis_${bookId}_${analysisType}`;
            const saveResult = await this.storageManager.save(key, {
                ...result,
                savedAt: new Date().toISOString()
            });
            
            return saveResult;
        } catch (error) {
            console.warn('⚠️ Failed to persist analysis result:', error);
            return { success: false, error: error.message };
        }
    }

    async loadAnalysisResult(bookId, analysisType) {
        if (!this.config.enablePersistence) return { success: false, error: 'Persistence disabled' };

        try {
            const key = `analysis_${bookId}_${analysisType}`;
            const loadResult = await this.storageManager.load(key);
            
            if (loadResult.success) {
                return { success: true, data: loadResult.data };
            } else {
                return { success: false, error: 'Analysis not found' };
            }
        } catch (error) {
            console.warn('⚠️ Failed to load analysis result:', error);
            return { success: false, error: error.message };
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

        if (result.confidence !== undefined && (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1)) {
            errors.push('Invalid confidence score');
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

    mergeAnalysisResults(bookId, results) {
        const merged = {
            bookId,
            analyses: {},
            mergedAt: new Date().toISOString(),
            totalAnalyses: results.length,
            successfulAnalyses: results.filter(r => r.success).length
        };

        results.forEach(result => {
            if (result.success && result.analysisType) {
                merged.analyses[result.analysisType] = result;
            }
        });

        return merged;
    }

    formatAnalysisResult(result, options = {}) {
        let formatted = { ...result };

        if (options.format === 'structured') {
            formatted.formatted = {
                type: result.analysisType,
                content: result.content,
                structured: true,
                sections: this.extractSections(result.content)
            };
        }

        if (options.includeMetadata) {
            formatted.displayMetadata = {
                formattedAt: new Date().toISOString(),
                format: options.format || 'default',
                confidence: `${Math.round((result.confidence || 0.85) * 100)}%`,
                processingTime: result.metadata?.processingTime ? `${result.metadata.processingTime}ms` : 'Unknown'
            };
        }

        return formatted;
    }

    extractSections(content) {
        // Simple section extraction based on common patterns
        const lines = content.split('\n').filter(line => line.trim());
        const sections = [];
        let currentSection = null;

        lines.forEach(line => {
            // Check if line looks like a header (starts with number, bullet, or is short and ends with colon)
            if (line.match(/^\d+\./) || line.match(/^[•\-\*]/) || (line.length < 50 && line.endsWith(':'))) {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    header: line.replace(/^[•\-\*\d\.\s]+/, '').replace(/:$/, ''),
                    content: []
                };
            } else if (currentSection) {
                currentSection.content.push(line);
            }
        });

        if (currentSection) {
            sections.push(currentSection);
        }

        return sections;
    }

    /**
     * Book model integration methods
     */
    attachAnalysisToBook(book, analysisResult) {
        const updatedBook = { ...book };

        if (!updatedBook.aiAnalysis) {
            updatedBook.aiAnalysis = {};
        }

        updatedBook.aiAnalysis[analysisResult.analysisType] = {
            ...analysisResult,
            attachedAt: new Date().toISOString()
        };

        return updatedBook;
    }

    attachMultipleAnalysesToBook(book, analysisResults) {
        let updatedBook = { ...book };

        analysisResults.forEach(result => {
            if (result.success) {
                updatedBook = this.attachAnalysisToBook(updatedBook, result);
            }
        });

        return updatedBook;
    }

    enrichBookWithAnalysisMetadata(book) {
        const aiAnalysis = book.aiAnalysis || {};
        const analysisTypes = Object.keys(aiAnalysis);

        return {
            ...book,
            analysisMetadata: {
                hasAnalysis: analysisTypes.length > 0,
                analysisCount: analysisTypes.length,
                analysisTypes: analysisTypes,
                lastAnalyzed: this.getLastAnalysisDate(aiAnalysis),
                averageConfidence: this.calculateBookAverageConfidence(aiAnalysis),
                totalTokensUsed: this.calculateTotalTokens(aiAnalysis),
                enrichedAt: new Date().toISOString()
            }
        };
    }

    getLastAnalysisDate(aiAnalysis) {
        const dates = Object.values(aiAnalysis)
            .map(analysis => analysis.generatedAt || analysis.attachedAt)
            .filter(date => date)
            .sort()
            .reverse();

        return dates[0] || null;
    }

    calculateBookAverageConfidence(aiAnalysis) {
        const confidences = Object.values(aiAnalysis)
            .map(analysis => analysis.confidence)
            .filter(conf => typeof conf === 'number');

        if (confidences.length === 0) return null;

        return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    }

    calculateTotalTokens(aiAnalysis) {
        return Object.values(aiAnalysis)
            .reduce((total, analysis) => {
                return total + (analysis.metadata?.tokens || 0);
            }, 0);
    }

    /**
     * Configuration and utility methods
     */
    getSupportedAnalysisTypes() {
        return ['summary', 'themes', 'characters', 'difficulty', 'sentiment', 'style'];
    }

    getModelConfiguration() {
        return {
            defaultModel: 'gpt-3.5-turbo',
            availableModels: ['gpt-3.5-turbo', 'gpt-4'],
            modelLimits: {
                'gpt-3.5-turbo': { maxTokens: 4096 },
                'gpt-4': { maxTokens: 8192 }
            }
        };
    }

    getPerformanceSettings() {
        return {
            concurrentLimit: this.config.performance.concurrentLimit,
            timeout: this.config.defaultTimeout,
            maxRetries: this.config.maxRetries,
            cacheEnabled: this.config.enableCaching,
            maxCacheSize: this.config.maxCacheSize,
            chunkingEnabled: true,
            maxTokensPerChunk: this.config.chunkingOptions.maxTokensPerChunk
        };
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
            memoryUsage: this.getMemoryUsage(),
            uptime: this.state.initialized ? Date.now() - this.startTime : 0
        };
    }

    getMemoryUsage() {
        // Estimate memory usage based on cache size and active analyses
        const cacheMemory = this.state.cache.size * 0.1; // ~100KB per cached analysis
        const activeMemory = this.state.activeAnalyses.size * 0.5; // ~500KB per active analysis
        const baseMemory = 5; // Base service memory

        return Math.round(baseMemory + cacheMemory + activeMemory);
    }

    /**
     * Progress tracking
     */
    onProgress(callback) {
        if (typeof callback === 'function') {
            this.state.progressListeners.push(callback);
        }
    }

    emitProgress(analysisId, bookId, progress, message = '') {
        if (!this.config.enableProgressTracking) return;

        const progressData = {
            analysisId,
            bookId,
            progress: Math.max(0, Math.min(1, progress)),
            message,
            timestamp: new Date().toISOString()
        };

        // Notify registered listeners
        this.state.progressListeners.forEach(listener => {
            try {
                listener(progressData);
            } catch (error) {
                console.error('❌ Progress listener error:', error);
            }
        });

        // Emit via EventBus
        this.eventBus.emit(EVENTS.AI_ANALYSIS_PROGRESS, progressData);
    }

    /**
     * Error handling
     */
    async handleAnalysisError(error, bookData, analysisType, analysisId) {
        console.error(`❌ Analysis failed for "${bookData?.title}" - ${analysisType}:`, error);

        // Update statistics
        this.updateAnalysisStats(0, false);

        // Emit error event
        this.eventBus.emit(EVENTS.AI_ANALYSIS_ERROR, {
            analysisId,
            bookId: bookData?.id,
            analysisType,
            error: error.message,
            timestamp: new Date().toISOString()
        });

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

        // Validate options
        if (options.timeout && options.timeout < 1000) {
            errors.push('Timeout must be at least 1000ms');
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
            
            this.eventBus.emit('ai:analysis:response', {
                requestId: data.requestId,
                result
            });

        } catch (error) {
            console.error('❌ Analysis request handler error:', error);
            this.eventBus.emit('ai:analysis:response', {
                requestId: data.requestId,
                result: this.createErrorResponse(error.message)
            });
        }
    }

    async handleBatchRequest(data) {
        try {
            const { bookData, analysisTypes, options = {} } = data;
            const result = await this.analyzeBatch(bookData, analysisTypes, options);
            
            this.eventBus.emit('ai:batch:response', {
                requestId: data.requestId,
                result
            });

        } catch (error) {
            console.error('❌ Batch request handler error:', error);
            this.eventBus.emit('ai:batch:response', {
                requestId: data.requestId,
                result: { success: false, error: error.message }
            });
        }
    }

    handleMemoryPressure() {
        console.log('💾 Handling memory pressure - clearing cache');
        
        // Clear half the cache, keeping most recent entries
        const cacheEntries = Array.from(this.state.cache.entries());
        cacheEntries.sort((a, b) => b[1].timestamp - a[1].timestamp); // Sort by timestamp desc
        
        const keepCount = Math.floor(cacheEntries.length / 2);
        this.state.cache.clear();
        
        // Keep most recent entries
        cacheEntries.slice(0, keepCount).forEach(([key, value]) => {
            this.state.cache.set(key, value);
        });
        
        this.state.stats.cacheSize = this.state.cache.size;
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
    }

    /**
     * Utility methods
     */
    generateAnalysisId(bookId, analysisType) {
        return `analysis_${bookId}_${analysisType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateBatchId(bookId) {
        return `batch_${bookId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
            
            // Update timing statistics
            const duration = Date.now() - startTime;
            this.state.performance.analysisTimings.push(duration);
            
            // Keep only last 100 timings
            if (this.state.performance.analysisTimings.length > 100) {
                this.state.performance.analysisTimings.shift();
            }
            
            // Calculate average
            const timings = this.state.performance.analysisTimings;
            this.state.stats.averageAnalysisTime = Math.round(
                timings.reduce((sum, time) => sum + time, 0) / timings.length
            );
        } else {
            this.state.stats.failedAnalyses++;
        }

        // Update health status
        const errorRate = this.state.stats.failedAnalyses / this.state.stats.totalAnalyses;
        this.state.stats.isHealthy = errorRate < 0.1; // Healthy if less than 10% error rate
    }

    initializeCache() {
        this.state.cache = new Map();
        this.state.stats.cacheSize = 0;
        this.startTime = Date.now();
    }

    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        try {
            console.log('🛑 Shutting down BookAnalysisService...');
            
            // Wait for active analyses to complete (with timeout)
            const shutdownTimeout = 30000; // 30 seconds
            const startTime = Date.now();
            
            while (this.state.activeAnalyses.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
                console.log(`⏳ Waiting for ${this.state.activeAnalyses.size} active analyses to complete...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Force cleanup if timeout reached
            if (this.state.activeAnalyses.size > 0) {
                console.warn('⚠️ Forcing shutdown with active analyses');
                this.state.activeAnalyses.clear();
            }
            
            // Clear cache and listeners
            this.clearCache();
            this.state.progressListeners = [];
            
            // Export final statistics
            const finalStats = this.getStats();
            
            console.log('✅ BookAnalysisService shutdown completed', finalStats);
            
            return { success: true, finalStats };

        } catch (error) {
            console.error('❌ Shutdown error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Health check and diagnostics
     */
    async runHealthCheck() {
        const startTime = Date.now();
        
        try {
            // Test basic functionality with minimal book data
            const testBook = {
                id: 'health_check_book',
                title: 'Health Check Test',
                author: 'System',
                content: 'This is a test book for health check purposes.',
                wordCount: 10
            };
            
            const testResult = await this.analyzeBook(testBook, 'summary', {
                maxTokens: 50,
                priority: 'health_check'
            });
            
            const responseTime = Date.now() - startTime;
            
            // Check result validity
            const isHealthy = testResult.success && 
                             testResult.content && 
                             testResult.analysisType === 'summary' &&
                             responseTime < 10000; // Less than 10 seconds
            
            return {
                healthy: isHealthy,
                responseTime,
                testResult: {
                    success: testResult.success,
                    hasContent: !!testResult.content,
                    correctType: testResult.analysisType === 'summary'
                },
                timestamp: new Date().toISOString(),
                stats: this.getStats()
            };

        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Development and debugging utilities
     */
    enableDebugMode() {
        this.debugMode = true;
        console.log('🔧 BookAnalysisService debug mode enabled');
    }

    disableDebugMode() {
        this.debugMode = false;
        console.log('🔧 BookAnalysisService debug mode disabled');
    }

    getDebugInfo() {
        if (!this.debugMode) {
            return { debugMode: false };
        }

        return {
            debugMode: true,
            state: {
                initialized: this.state.initialized,
                activeAnalyses: Array.from(this.state.activeAnalyses),
                cacheKeys: Array.from(this.state.cache.keys()),
                stats: this.state.stats
            },
            config: {
                maxCacheSize: this.config.maxCacheSize,
                enableCaching: this.config.enableCaching,
                enableProgressTracking: this.config.enableProgressTracking,
                supportedTypes: this.getSupportedAnalysisTypes()
            },
            dependencies: {
                openAIService: !!this.openAIService,
                storageManager: !!this.storageManager,
                eventBus: !!this.eventBus
            },
            performance: this.state.performance
        };
    }

    /**
     * Export service data for analysis
     */
    async exportServiceData() {
    return {
        metadata: {
            exportedAt: new Date().toISOString(),
            serviceVersion: '1.0.0',
            uptime: Date.now() - this.startTime
        },
        configuration: {
            maxCacheSize: this.config.maxCacheSize,
            enableCaching: this.config.enableCaching,
            enableProgressTracking: this.config.enableProgressTracking,
            supportedAnalysisTypes: this.getSupportedAnalysisTypes()
        },
        statistics: this.getStats(),
        performance: this.state.performance,
        health: 'Available via runHealthCheck()'
    };
}

}

// Global export for development/testing
if (typeof window !== 'undefined') {
    window.BookAnalysisService = BookAnalysisService;
}

/**
 * INTEGRATION INSTRUCTIONS FOR BOOK BUDDY
 * =======================================
 * 
 * 1. Add to app.js imports:
 * ```javascript
 * import BookAnalysisService from './modules/services/BookAnalysisService.js';
 * ```
 * 
 * 2. Add to app.js constructor (after existing AI services):
 * ```javascript
 * // Initialize BookAnalysisService
 * this.bookAnalysisService = new BookAnalysisService(
 *     this.openAIService,
 *     this.storage,
 *     eventBus,
 *     {
 *         maxCacheSize: 50,
 *         enableProgressTracking: true,
 *         enableCaching: true,
 *         defaultAnalysisOptions: {
 *             analysisDepth: 'standard',
 *             includeQuotes: false
 *         }
 *     }
 * );
 * ```
 * 
 * 3. Add to global exports at bottom of app.js:
 * ```javascript
 * window.BookAnalysisService = BookAnalysisService;
 * window.bookAnalysisService = app.bookAnalysisService;
 * ```
 * 
 * 4. Usage examples:
 * ```javascript
 * // Single analysis
 * const summary = await this.bookAnalysisService.analyzeBook(book, 'summary');
 * 
 * // Multiple analyses
 * const batchResult = await this.bookAnalysisService.analyzeBatch(
 *     book, 
 *     ['summary', 'themes', 'difficulty']
 * );
 * 
 * // With custom options
 * const detailedAnalysis = await this.bookAnalysisService.analyzeBook(book, 'themes', {
 *     analysisDepth: 'detailed',
 *     includeQuotes: true,
 *     targetAudience: 'academic'
 * });
 * ```
 * 
 * 5. Event handling in UI components:
 * ```javascript
 * eventBus.on(EVENTS.AI_ANALYSIS_COMPLETED, (data) => {
 *     console.log(`Analysis completed for ${data.bookId}: ${data.analysisType}`);
 *     // Update UI with results
 * });
 * 
 * eventBus.on(EVENTS.AI_ANALYSIS_PROGRESS, (data) => {
 *     updateProgressBar(data.progress);
 * });
 * ```
 * 
 * FEATURES PROVIDED:
 * ✅ AI-powered book analysis (summary, themes, characters, difficulty, sentiment)
 * ✅ Intelligent content chunking for large books
 * ✅ Result caching for performance
 * ✅ Progress tracking for long analyses
 * ✅ Batch processing support
 * ✅ Error handling and resilience
 * ✅ EventBus integration
 * ✅ Book model integration
 * ✅ Performance monitoring
 * ✅ Memory management
 * ✅ Comprehensive TDD test coverage
 * 
 * Ready for immediate integration with your existing Book Buddy architecture!
 */