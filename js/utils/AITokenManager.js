/**
 * AITokenManager - Token counting, chunking, and cost estimation for OpenAI API
 * Follows Book Buddy architecture patterns and handles all token-related operations
 */

export default class AITokenManager {
    constructor(options = {}) {
        // Token estimation constants (based on OpenAI documentation)
        this.tokensPerWord = options.tokensPerWord || 1.3;
        this.tokensPerCharacter = options.tokensPerCharacter || 0.25;
        
        // Model token limits
        this.modelLimits = {
            'gpt-4': 8192,
            'gpt-4-turbo': 128000,
            'gpt-3.5-turbo': 4096,
            'gpt-3.5-turbo-16k': 16384,
            'text-davinci-003': 4097,
            'text-curie-001': 2049
        };
        
        // Cost per token (in USD) - Updated as of 2025
        this.costPerToken = {
            'gpt-4': 0.00003,           // $0.03 per 1K tokens
            'gpt-4-turbo': 0.00001,     // $0.01 per 1K tokens  
            'gpt-3.5-turbo': 0.000002,  // $0.002 per 1K tokens
            'gpt-3.5-turbo-16k': 0.000004,
            'text-davinci-003': 0.00002,
            'text-curie-001': 0.000002
        };
        
        // Usage tracking
        this.usageStats = {
            totalTokens: 0,
            totalCost: 0,
            requests: [],
            categories: {},
            sessions: [],
            limits: {
                dailyTokens: options.dailyTokenLimit || 100000,
                dailyCost: options.dailyCostLimit || 10.00, // $10 daily limit
                sessionTokens: options.sessionTokenLimit || 50000
            }
        };
        
        // Performance optimization
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.maxCacheSize = 1000;
        
        // Chunking options
        this.chunkingOptions = {
            overlap: 100, // Token overlap between chunks
            preserveSentences: true,
            preserveParagraphs: true,
            minChunkSize: 50 // Minimum tokens per chunk
        };
        
        console.log('🧠 AITokenManager initialized with cost tracking and optimization');
    }

    /**
     * Count tokens in text content
     * Uses improved estimation algorithm for better accuracy
     */
    async countTokens(content) {
        if (!content || typeof content !== 'string') {
            return 0;
        }
        
        // Check cache first
        const cacheKey = `tokens:${this.hashContent(content)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached !== null) {
            return cached;
        }
        
        try {
            // Enhanced token counting algorithm
            let tokenCount = 0;
            
            // Split into words and analyze
            const words = content.trim().split(/\s+/).filter(word => word.length > 0);
            
            for (const word of words) {
                // Different token counts for different word types
                if (this.isCodeToken(word)) {
                    // Code tokens tend to use more tokens
                    tokenCount += Math.max(1.5, Math.ceil(word.length * 0.4));
                } else if (this.isSpecialCharToken(word)) {
                    // Special characters and unicode
                    tokenCount += Math.ceil(word.length * 0.3);
                } else if (word.length > 10) {
                    // Long words typically use more tokens
                    tokenCount += Math.ceil(word.length * 0.25);
                } else {
                    // Regular words
                    tokenCount += this.tokensPerWord;
                }
            }
            
            // Add tokens for punctuation and formatting
            const punctuationMatches = content.match(/[.,!?;:(){}[\]"'`~]/g);
            if (punctuationMatches) {
                tokenCount += punctuationMatches.length * 0.5;
            }
            
            // Round to whole number
            tokenCount = Math.ceil(tokenCount);
            
            // Ensure minimum token count for non-empty content
            if (content.trim().length > 0 && tokenCount === 0) {
                tokenCount = 1;
            }
            
            // Cache the result
            this.setCache(cacheKey, tokenCount);
            
            return tokenCount;
            
        } catch (error) {
            console.error('❌ Token counting error:', error);
            // Fallback to simple estimation
            const words = content.trim().split(/\s+/).length;
            return Math.ceil(words * this.tokensPerWord);
        }
    }

    /**
     * Chunk text into smaller pieces that fit within token limits
     * Preserves sentence and paragraph boundaries when possible
     */
    async chunkText(content, tokenLimit, options = {}) {
        if (!content || typeof content !== 'string') {
            return [];
        }
        
        const totalTokens = await this.countTokens(content);
        
        // If content fits within limit, return as single chunk
        if (totalTokens <= tokenLimit) {
            return [content];
        }
        
        const chunkOptions = { ...this.chunkingOptions, ...options };
        const chunks = [];
        
        try {
            // Strategy 1: Try paragraph-based chunking
            if (chunkOptions.preserveParagraphs) {
                const paragraphs = content.split(/\n\s*\n/);
                const paragraphChunks = await this.chunkByParagraphs(paragraphs, tokenLimit, chunkOptions);
                
                if (paragraphChunks.length > 1) {
                    return paragraphChunks;
                }
            }
            
            // Strategy 2: Sentence-based chunking
            if (chunkOptions.preserveSentences) {
                const sentences = this.splitIntoSentences(content);
                const sentenceChunks = await this.chunkBySentences(sentences, tokenLimit, chunkOptions);
                
                if (sentenceChunks.length > 1) {
                    return sentenceChunks;
                }
            }
            
            // Strategy 3: Word-based chunking (fallback)
            return await this.chunkByWords(content, tokenLimit, chunkOptions);
            
        } catch (error) {
            console.error('❌ Chunking error:', error);
            // Simple fallback chunking
            return await this.simpleChunk(content, tokenLimit);
        }
    }

    /**
     * Estimate cost for processing content with specific model
     */
    async estimateCost(content, model = 'gpt-3.5-turbo') {
        if (!content || typeof content !== 'string') {
            return 0;
        }
        
        const tokenCount = await this.countTokens(content);
        const costPerToken = this.costPerToken[model] || this.costPerToken['gpt-3.5-turbo'];
        
        return parseFloat((tokenCount * costPerToken).toFixed(6));
    }

    /**
     * Estimate cost for batch processing multiple contents
     */
    async estimateBatchCost(contents, model = 'gpt-3.5-turbo') {
        if (!Array.isArray(contents)) {
            return { total: 0, individual: [] };
        }
        
        const individual = [];
        let total = 0;
        
        for (const content of contents) {
            const cost = await this.estimateCost(content, model);
            individual.push(cost);
            total += cost;
        }
        
        return {
            total: parseFloat(total.toFixed(6)),
            individual
        };
    }

    /**
     * Record API usage for tracking and billing
     */
    recordUsage(tokens, cost, model, category = 'general') {
        const usage = {
            tokens,
            cost,
            model,
            category,
            timestamp: new Date().toISOString(),
            id: `usage_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        };
        
        // Update totals
        this.usageStats.totalTokens += tokens;
        this.usageStats.totalCost += cost;
        
        // Add to requests log
        this.usageStats.requests.push(usage);
        
        // Update category stats
        if (!this.usageStats.categories[category]) {
            this.usageStats.categories[category] = { tokens: 0, cost: 0, requests: 0 };
        }
        
        this.usageStats.categories[category].tokens += tokens;
        this.usageStats.categories[category].cost += cost;
        this.usageStats.categories[category].requests += 1;
        
        // Trim old requests (keep last 1000)
        if (this.usageStats.requests.length > 1000) {
            this.usageStats.requests = this.usageStats.requests.slice(-1000);
        }
        
        console.log(`📊 Usage recorded: ${tokens} tokens, $${cost.toFixed(4)} for ${model} (${category})`);
        
        return usage;
    }

    /**
     * Get current usage statistics
     */
    getUsageStats() {
        return {
            totalTokens: this.usageStats.totalTokens,
            totalCost: parseFloat(this.usageStats.totalCost.toFixed(6)),
            requests: [...this.usageStats.requests],
            requestCount: this.usageStats.requests.length,
            averageCostPerRequest: this.usageStats.requests.length > 0 
                ? parseFloat((this.usageStats.totalCost / this.usageStats.requests.length).toFixed(6))
                : 0,
            limits: { ...this.usageStats.limits }
        };
    }

    /**
     * Get usage statistics by category
     */
    getUsageByCategory() {
        const categories = {};
        
        for (const [category, stats] of Object.entries(this.usageStats.categories)) {
            categories[category] = {
                tokens: stats.tokens,
                cost: parseFloat(stats.cost.toFixed(6)),
                requests: stats.requests,
                averageCostPerRequest: stats.requests > 0 
                    ? parseFloat((stats.cost / stats.requests).toFixed(6))
                    : 0
            };
        }
        
        return categories;
    }

    /**
     * Check if usage is approaching or over limits
     */
    checkUsageLimit(limitCents) {
        const currentCostCents = Math.round(this.usageStats.totalCost * 100);
        return currentCostCents > limitCents;
    }

    /**
     * Reset usage statistics
     */
    resetUsageStats() {
        // Store old values for comparison in tests
        const previousStats = { ...this.usageStats };
        
        this.usageStats = {
            totalTokens: 0,
            totalCost: 0,
            requests: [],
            categories: {},
            sessions: [],
            limits: { ...this.usageStats.limits }
        };
        
        console.log('🔄 Usage statistics reset');
        return { 
            success: true, 
            message: 'Usage statistics reset successfully',
            previousStats 
        };
    }

    /**
     * Get token limit for specific model
     */
    getTokenLimit(model) {
        return this.modelLimits[model] || this.modelLimits['gpt-3.5-turbo'];
    }

    /**
     * Optimize chunks for specific analysis types
     */
    async optimizeChunksForAnalysis(content, analysisType, tokenLimit) {
        if (!content) return [];
        
        let optimizationStrategy = {};
        
        // Different strategies for different analysis types
        switch (analysisType) {
            case 'summary':
                optimizationStrategy = {
                    preserveParagraphs: true,
                    preserveSentences: true,
                    overlap: 50,
                    prioritizeBeginning: true
                };
                break;
                
            case 'themes':
                optimizationStrategy = {
                    preserveParagraphs: true,
                    overlap: 100,
                    extractKeyPhrases: true
                };
                break;
                
            case 'characters':
                optimizationStrategy = {
                    preserveDialogue: true,
                    overlap: 150,
                    focusOnNames: true
                };
                break;
                
            case 'difficulty':
                optimizationStrategy = {
                    preserveSentences: true,
                    sampleEvenly: true,
                    overlap: 25
                };
                break;
                
            default:
                optimizationStrategy = this.chunkingOptions;
        }
        
        const chunks = await this.chunkText(content, tokenLimit, optimizationStrategy);
        
        // Post-process chunks for analysis type
        return chunks.map(chunk => this.preprocessForAI(chunk, analysisType));
    }

    /**
     * Preprocess content for AI analysis
     */
    preprocessForAI(content, analysisType = 'general') {
        if (!content || typeof content !== 'string') {
            return '';
        }
        
        let processed = content;
        
        // Common preprocessing
        processed = processed
            .replace(/\s+/g, ' ')                    // Normalize whitespace
            .replace(/\n{3,}/g, '\n\n')             // Limit consecutive newlines
            .trim();                                 // Remove leading/trailing space
        
        // Analysis-specific preprocessing
        switch (analysisType) {
            case 'summary':
                // Keep structure for summaries
                processed = processed.replace(/([.!?])\s+/g, '$1\n');
                break;
                
            case 'themes':
                // Preserve paragraph structure for theme analysis
                break;
                
            case 'difficulty':
                // Sample sentences evenly for difficulty analysis
                const sentences = this.splitIntoSentences(processed);
                if (sentences.length > 20) {
                    const sampleSize = 15;
                    const step = Math.floor(sentences.length / sampleSize);
                    const sampledSentences = [];
                    for (let i = 0; i < sentences.length; i += step) {
                        sampledSentences.push(sentences[i]);
                    }
                    processed = sampledSentences.join(' ');
                }
                break;
        }
        
        return processed;
    }

    // Helper methods for token analysis
    isCodeToken(word) {
        return /^[<>=!&|(){}\[\];,.:]+$/.test(word) || 
               /^(function|class|const|let|var|if|else|for|while|return)$/.test(word) ||
               word.includes('()') || word.includes('{}');
    }

    isSpecialCharToken(word) {
        return /[^\x00-\x7F]/.test(word) || // Non-ASCII characters
               /[éñüßáàâäčćđšžćčđžš中文한국어日本語]/.test(word); // Common international chars
    }

    // Helper methods for chunking
    async chunkByParagraphs(paragraphs, tokenLimit, options) {
        const chunks = [];
        let currentChunk = '';
        
        for (const paragraph of paragraphs) {
            const testChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
            const testTokens = await this.countTokens(testChunk);
            
            if (testTokens <= tokenLimit) {
                currentChunk = testChunk;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                }
                
                // If single paragraph is too large, split it further
                const paragraphTokens = await this.countTokens(paragraph);
                if (paragraphTokens > tokenLimit) {
                    const subChunks = await this.chunkBySentences(
                        this.splitIntoSentences(paragraph), 
                        tokenLimit, 
                        options
                    );
                    chunks.push(...subChunks);
                    currentChunk = '';
                } else {
                    currentChunk = paragraph;
                }
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    async chunkBySentences(sentences, tokenLimit, options) {
        const chunks = [];
        let currentChunk = '';
        
        for (const sentence of sentences) {
            const testChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
            const testTokens = await this.countTokens(testChunk);
            
            if (testTokens <= tokenLimit) {
                currentChunk = testChunk;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                }
                
                // If single sentence is too large, split by words
                const sentenceTokens = await this.countTokens(sentence);
                if (sentenceTokens > tokenLimit) {
                    const wordChunks = await this.chunkByWords(sentence, tokenLimit, options);
                    chunks.push(...wordChunks);
                    currentChunk = '';
                } else {
                    currentChunk = sentence;
                }
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    async chunkByWords(content, tokenLimit, options) {
        const words = content.trim().split(/\s+/);
        const chunks = [];
        let currentChunk = '';
        
        // Estimate words per chunk based on token limit
        const avgTokensPerWord = this.tokensPerWord;
        const roughWordsPerChunk = Math.max(1, Math.floor(tokenLimit / avgTokensPerWord));
        
        for (let i = 0; i < words.length; i += roughWordsPerChunk) {
            const chunkWords = words.slice(i, i + roughWordsPerChunk);
            const chunk = chunkWords.join(' ');
            
            // Verify chunk size
            const chunkTokens = await this.countTokens(chunk);
            if (chunkTokens <= tokenLimit) {
                chunks.push(chunk);
            } else {
                // If still too large, make smaller chunks
                const smallerSize = Math.floor(roughWordsPerChunk * 0.8);
                for (let j = 0; j < chunkWords.length; j += smallerSize) {
                    const smallChunk = chunkWords.slice(j, j + smallerSize).join(' ');
                    if (smallChunk.trim()) {
                        chunks.push(smallChunk);
                    }
                }
            }
        }
        
        return chunks.filter(chunk => chunk.trim().length > 0);
    }

    async simpleChunk(content, tokenLimit) {
        const words = content.trim().split(/\s+/);
        const chunks = [];
        const wordsPerChunk = Math.max(1, Math.floor(tokenLimit / this.tokensPerWord));
        
        for (let i = 0; i < words.length; i += wordsPerChunk) {
            const chunk = words.slice(i, i + wordsPerChunk).join(' ');
            if (chunk.trim()) {
                chunks.push(chunk);
            }
        }
        
        return chunks;
    }

    splitIntoSentences(text) {
        // Enhanced sentence splitting that handles edge cases
        return text
            .split(/(?<=[.!?])\s+(?=[A-Z])/)
            .map(sentence => sentence.trim())
            .filter(sentence => sentence.length > 0);
    }

    // Cache management
    hashContent(content) {
        // Simple hash for caching
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.value;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, value) {
        // Clean cache if too large
        if (this.cache.size >= this.maxCacheSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    /**
     * Get performance and health metrics
     */
    getHealthMetrics() {
        return {
            cacheSize: this.cache.size,
            cacheHitRate: this.calculateCacheHitRate(),
            totalRequests: this.usageStats.requests.length,
            averageTokensPerRequest: this.usageStats.requests.length > 0 
                ? Math.round(this.usageStats.totalTokens / this.usageStats.requests.length)
                : 0,
            costEfficiency: this.calculateCostEfficiency(),
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    calculateCacheHitRate() {
        // This would need to be tracked over time in a real implementation
        return Math.min(0.85, this.cache.size / 100); // Simulated cache hit rate
    }

    calculateCostEfficiency() {
        const totalRequests = this.usageStats.requests.length;
        if (totalRequests === 0) return 1;
        
        const avgCost = this.usageStats.totalCost / totalRequests;
        return Math.max(0, 1 - (avgCost / 0.01)); // Efficiency relative to 1 cent per request
    }

    estimateMemoryUsage() {
        // Rough estimation in MB
        const cacheMemory = this.cache.size * 0.001; // ~1KB per cache entry
        const statsMemory = this.usageStats.requests.length * 0.0005; // ~0.5KB per request
        return Math.round((cacheMemory + statsMemory) * 100) / 100;
    }

    /**
     * Export usage data for analysis
     */
    exportUsageData() {
        return {
            summary: this.getUsageStats(),
            categories: this.getUsageByCategory(),
            requests: this.usageStats.requests,
            health: this.getHealthMetrics(),
            exportedAt: new Date().toISOString()
        };
    }
}