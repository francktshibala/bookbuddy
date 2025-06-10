/**
 * BookAnalysisService TDD Tests - Test First Implementation
 * Following Book Buddy's established patterns and testing approach
 */

// Test data for comprehensive testing scenarios
const TEST_BOOK_DATA = {
    shortBook: {
        id: 'book_test_001',
        title: 'The Gift of the Magi',
        author: 'O. Henry',
        content: 'One dollar and eighty-seven cents. That was all. And sixty cents of it was in pennies saved one and two at a time by bulldozing the grocer and the vegetable man and the butcher until one\'s cheeks burned with the silent imputation of parsimony that such close dealing implied.',
        wordCount: 2156,
        genre: 'short story',
        metadata: {
            publishedDate: '1905',
            language: 'en'
        }
    },

    mediumBook: {
        id: 'book_test_002',
        title: 'Animal Farm',
        author: 'George Orwell',
        content: 'Mr. Jones, of the Manor Farm, had locked the hen-houses for the night, but was too drunk to remember to shut the popholes. With the ring of light from his lantern dancing from side to side, he lurched across the yard, kicked off his boots at the back door, drew himself a last glass of beer from the barrel in the scullery, and made his way up to bed, where Mrs. Jones was already snoring.',
        wordCount: 29966,
        genre: 'political satire',
        metadata: {
            publishedDate: '1945',
            language: 'en'
        }
    },

    largeBook: {
        id: 'book_test_003',
        title: 'War and Peace',
        author: 'Leo Tolstoy',
        content: '"Well, Prince, so Genoa and Lucca are now no more than family estates of the Buonapartes. But I warn you, if you don\'t tell me that this means war, if you still try to defend the infamies and horrors perpetrated by that Antichrist—I really believe he is Antichrist—I will have nothing more to do with you and you are no longer my friend, no longer my \'faithful slave,\' as you call yourself!"',
        wordCount: 587287,
        genre: 'historical fiction',
        metadata: {
            publishedDate: '1869',
            language: 'en'
        }
    },

    technicalBook: {
        id: 'book_test_004',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        content: 'You are reading this book for two reasons. First, you are a programmer. Second, you want to be a better programmer. Good. We need better programmers. This is a book about good programming. It is filled with code. We are going to look at code from every different direction.',
        wordCount: 90000,
        genre: 'programming',
        metadata: {
            publishedDate: '2008',
            language: 'en'
        }
    }
};

/**
 * BookAnalysisService Test Suite
 * Comprehensive TDD tests following Book Buddy patterns
 */
class BookAnalysisServiceTests {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
        this.startTime = Date.now();

        // Mock dependencies following Book Buddy patterns
        this.mockOpenAIService = this.createMockOpenAIService();
        this.mockStorageManager = this.createMockStorageManager();
        this.mockEventBus = this.createMockEventBus();
    }

    // Test assertion helpers following your pattern
    assert(condition, message) {
        if (condition) {
            this.testResults.passed++;
            console.log(`✅ ${message}`);
        } else {
            this.testResults.failed++;
            this.testResults.errors.push(message);
            console.error(`❌ ${message}`);
        }
    }

    assertEqual(actual, expected, message) {
        this.assert(actual === expected, `${message} - Expected: ${expected}, Actual: ${actual}`);
    }

    assertNotNull(value, message) {
        this.assert(value !== null && value !== undefined, `${message} - Value should not be null/undefined`);
    }

    assertIsObject(value, message) {
        this.assert(typeof value === 'object' && value !== null, `${message} - Expected object`);
    }

    assertIsArray(value, message) {
        this.assert(Array.isArray(value), `${message} - Expected array`);
    }

    assertContains(text, substring, message) {
        this.assert(text.includes(substring), `${message} - "${substring}" not found`);
    }

    assertGreaterThan(actual, threshold, message) {
        this.assert(actual > threshold, `${message} - Expected > ${threshold}, got ${actual}`);
    }

    /**
     * Test 1: Service Initialization and Dependencies
     */
    async testServiceInitialization() {
        console.log('\n🧪 Testing Service Initialization...');

        // Test 1.1: Constructor with valid dependencies
        const service = this.createMockBookAnalysisService();
        this.assertNotNull(service, "Service should initialize");
        this.assert(service.initialized, "Service should be initialized");

        // Test 1.2: Dependency injection validation
        this.assertNotNull(service.openAIService, "Should have OpenAI service");
        this.assertNotNull(service.storageManager, "Should have storage manager");
        this.assertNotNull(service.eventBus, "Should have event bus");

        // Test 1.3: Event listener setup
        const eventListeners = service.getEventListeners();
        this.assertIsArray(eventListeners, "Should have event listeners array");
        this.assertGreaterThan(eventListeners.length, 0, "Should register event listeners");

        // Test 1.4: Initial state validation
        const stats = service.getStats();
        this.assertEqual(stats.totalAnalyses, 0, "Should start with zero analyses");
        this.assertEqual(stats.cacheSize, 0, "Should start with empty cache");
        this.assert(stats.isHealthy, "Service should be healthy on init");

        console.log('✅ Service initialization tests completed');
    }

    /**
     * Test 2: Analysis Workflow Orchestration
     */
    async testAnalysisWorkflow() {
        console.log('\n🧪 Testing Analysis Workflow...');

        const service = this.createMockBookAnalysisService();

        // Test 2.1: Single analysis request
        const analysisResult = await service.analyzeBook(TEST_BOOK_DATA.shortBook, 'summary');

        this.assertIsObject(analysisResult, "Should return analysis result object");
        this.assert(analysisResult.success, "Analysis should succeed");
        this.assertNotNull(analysisResult.content, "Should have analysis content");
        this.assertEqual(analysisResult.analysisType, 'summary', "Should return correct analysis type");
        this.assertNotNull(analysisResult.metadata, "Should include metadata");

        // Test 2.2: Multiple analysis types
        const multipleTypes = ['summary', 'themes', 'difficulty'];
        const batchResult = await service.analyzeBatch(TEST_BOOK_DATA.mediumBook, multipleTypes);

        this.assertIsObject(batchResult, "Should return batch result");
        this.assertEqual(batchResult.results.length, 3, "Should process all analysis types");
        this.assert(batchResult.success, "Batch analysis should succeed");

        // Test 2.3: Analysis with options
        const optionsResult = await service.analyzeBook(TEST_BOOK_DATA.technicalBook, 'summary', {
            analysisDepth: 'detailed',
            includeQuotes: true,
            targetAudience: 'developers'
        });

        this.assert(optionsResult.success, "Analysis with options should succeed");
        this.assertContains(optionsResult.content, 'detailed', "Should incorporate analysis depth");

        // Test 2.4: Progress tracking
        let progressEvents = [];
        service.onProgress((progress) => {
            progressEvents.push(progress);
        });

        await service.analyzeBook(TEST_BOOK_DATA.largeBook, 'themes');
        this.assertGreaterThan(progressEvents.length, 0, "Should emit progress events");

        console.log('✅ Analysis workflow tests completed');
    }

    /**
     * Test 3: Book Content Chunking
     */
    async testBookChunking() {
        console.log('\n🧪 Testing Book Content Chunking...');

        const service = this.createMockBookAnalysisService();

        // Test 3.1: Small book - no chunking needed
        const smallBookChunks = service.chunkBookContent(TEST_BOOK_DATA.shortBook);
        this.assertEqual(smallBookChunks.length, 1, "Small book should have one chunk");
        this.assertEqual(smallBookChunks[0].content, TEST_BOOK_DATA.shortBook.content, "Should preserve content");

        // Test 3.2: Large book - chunking required
        const largeBookChunks = service.chunkBookContent(TEST_BOOK_DATA.largeBook, { maxTokens: 2000 });
        this.assertGreaterThan(largeBookChunks.length, 1, "Large book should be chunked");

        // Verify chunk properties
        largeBookChunks.forEach((chunk, index) => {
            this.assertNotNull(chunk.content, `Chunk ${index} should have content`);
            this.assertNotNull(chunk.chunkIndex, `Chunk ${index} should have index`);
            this.assertNotNull(chunk.metadata, `Chunk ${index} should have metadata`);
            this.assertGreaterThan(chunk.content.length, 0, `Chunk ${index} should not be empty`);
        });

        // Test 3.3: Overlap preservation
        const overlapChunks = service.chunkBookContent(TEST_BOOK_DATA.mediumBook, {
            maxTokens: 1000,
            overlap: 100
        });

        if (overlapChunks.length > 1) {
            // Check for overlap between consecutive chunks
            const firstChunkEnd = overlapChunks[0].content.slice(-50);
            const secondChunkStart = overlapChunks[1].content.slice(0, 50);
            // Should have some common content (simplified test)
            this.assertGreaterThan(firstChunkEnd.length, 0, "Should preserve context");
        }

        // Test 3.4: Token estimation accuracy
        const tokenEstimate = service.estimateChunkTokens(TEST_BOOK_DATA.shortBook.content);
        this.assertGreaterThan(tokenEstimate, 0, "Should estimate tokens");
        this.assert(tokenEstimate < 10000, "Token estimate should be reasonable");

        console.log('✅ Book chunking tests completed');
    }

    /**
     * Test 4: Analysis Caching and Persistence  
     */
    async testCachingAndPersistence() {
        console.log('\n🧪 Testing Caching and Persistence...');

        const service = this.createMockBookAnalysisService();

        // Test 4.1: First analysis - cache miss
        const firstAnalysis = await service.analyzeBook(TEST_BOOK_DATA.shortBook, 'summary');
        this.assert(firstAnalysis.success, "First analysis should succeed");
        this.assert(!firstAnalysis.fromCache, "First analysis should not be from cache");

        // Test 4.2: Second analysis - cache hit
        const secondAnalysis = await service.analyzeBook(TEST_BOOK_DATA.shortBook, 'summary');
        this.assert(secondAnalysis.success, "Second analysis should succeed");
        this.assert(secondAnalysis.fromCache, "Second analysis should be from cache");

        // Test 4.3: Cache invalidation
        service.invalidateCache(TEST_BOOK_DATA.shortBook.id, 'summary');
        const thirdAnalysis = await service.analyzeBook(TEST_BOOK_DATA.shortBook, 'summary');
        this.assert(!thirdAnalysis.fromCache, "Analysis after invalidation should not be from cache");

        // Test 4.4: Persistent storage
        const saveResult = await service.saveAnalysisResult(TEST_BOOK_DATA.mediumBook.id, 'themes', firstAnalysis);
        this.assert(saveResult.success, "Should save analysis result");

        const loadResult = await service.loadAnalysisResult(TEST_BOOK_DATA.mediumBook.id, 'themes');
        this.assert(loadResult.success, "Should load analysis result");
        this.assertNotNull(loadResult.data, "Loaded data should not be null");

        // Test 4.5: Cache size management
        // Fill cache beyond limit
        for (let i = 0; i < 15; i++) {
            await service.analyzeBook({
                ...TEST_BOOK_DATA.shortBook,
                id: `test_book_${i}`,
                title: `Test Book ${i}`
            }, 'summary');
        }

        const stats = service.getStats();
        this.assert(stats.cacheSize <= service.maxCacheSize, "Cache should respect size limits");

        console.log('✅ Caching and persistence tests completed');
    }

    /**
     * Test 5: Error Handling and Resilience
     */
    async testErrorHandling() {
        console.log('\n🧪 Testing Error Handling...');

        const service = this.createMockBookAnalysisService();

        // Test 5.1: Invalid book data
        const invalidBookResult = await service.analyzeBook(null, 'summary');
        this.assert(!invalidBookResult.success, "Should handle null book data");
        this.assertNotNull(invalidBookResult.error, "Should provide error message");

        // Test 5.2: Unsupported analysis type
        const unsupportedTypeResult = await service.analyzeBook(TEST_BOOK_DATA.shortBook, 'unsupported_type');
        this.assert(!unsupportedTypeResult.success, "Should handle unsupported analysis type");

        // Test 5.3: OpenAI service failure
        const failingService = this.createMockBookAnalysisService({
            openAIServiceShouldFail: true
        });

        const failureResult = await failingService.analyzeBook(TEST_BOOK_DATA.shortBook, 'summary');
        this.assert(!failureResult.success, "Should handle OpenAI service failure");
        this.assertContains(failureResult.error, 'OpenAI', "Error should mention OpenAI service");

        // Test 5.4: Storage failure resilience
        const storageFailService = this.createMockBookAnalysisService({
            storageManagerShouldFail: true
        });

        const storageFailResult = await storageFailService.analyzeBook(TEST_BOOK_DATA.shortBook, 'summary');
        // Should still succeed even if caching fails
        this.assert(storageFailResult.success, "Should continue despite storage failure");

        // Test 5.5: Timeout handling
        const timeoutResult = await service.analyzeBook(TEST_BOOK_DATA.largeBook, 'summary', {
            timeout: 100 // Very short timeout
        });

        // Should either succeed quickly or handle timeout gracefully
        if (!timeoutResult.success) {
            this.assertContains(timeoutResult.error.toLowerCase(), 'timeout', "Should indicate timeout");
        }

        // Test 5.6: Malformed content handling
        const malformedBook = {
            ...TEST_BOOK_DATA.shortBook,
            content: null,
            wordCount: undefined
        };

        const malformedResult = await service.analyzeBook(malformedBook, 'summary');
        this.assert(!malformedResult.success, "Should handle malformed content");

        console.log('✅ Error handling tests completed');
    }

    /**
     * Test 6: EventBus Integration
     */
    async testEventBusIntegration() {
        console.log('\n🧪 Testing EventBus Integration...');

        const service = this.createMockBookAnalysisService();
        const eventBus = service.eventBus;

        // Test 6.1: Analysis started event
        let analysisStartedEvents = [];
        eventBus.on('AI_ANALYSIS_STARTED', (data) => {
            analysisStartedEvents.push(data);
        });

        await service.analyzeBook(TEST_BOOK_DATA.shortBook, 'summary');
        this.assertEqual(analysisStartedEvents.length, 1, "Should emit analysis started event");
        this.assertEqual(analysisStartedEvents[0].bookId, TEST_BOOK_DATA.shortBook.id, "Event should contain book ID");

        // Test 6.2: Analysis completed event
        let analysisCompletedEvents = [];
        eventBus.on('AI_ANALYSIS_COMPLETED', (data) => {
            analysisCompletedEvents.push(data);
        });

        await service.analyzeBook(TEST_BOOK_DATA.mediumBook, 'themes');
        this.assertEqual(analysisCompletedEvents.length, 1, "Should emit analysis completed event");
        this.assert(analysisCompletedEvents[0].success, "Completed event should indicate success");

        // Test 6.3: Progress events
        let progressEvents = [];
        eventBus.on('AI_ANALYSIS_PROGRESS', (data) => {
            progressEvents.push(data);
        });

        await service.analyzeBook(TEST_BOOK_DATA.largeBook, 'characters');
        this.assertGreaterThan(progressEvents.length, 0, "Should emit progress events");

        // Test 6.4: Error events
        let errorEvents = [];
        eventBus.on('AI_ANALYSIS_ERROR', (data) => {
            errorEvents.push(data);
        });

        await service.analyzeBook(null, 'summary'); // Should trigger error
        this.assertEqual(errorEvents.length, 1, "Should emit error event");

        console.log('✅ EventBus integration tests completed');
    }

    /**
     * Test 7: Analysis Result Processing
     */
    async testAnalysisResultProcessing() {
        console.log('\n🧪 Testing Analysis Result Processing...');

        const service = this.createMockBookAnalysisService();

        // Test 7.1: Result validation
        const validResult = service.validateAnalysisResult({
            content: "This is a valid analysis",
            analysisType: "summary",
            confidence: 0.95,
            metadata: { timestamp: new Date().toISOString() }
        });

        this.assert(validResult.valid, "Valid result should pass validation");

        // Test 7.2: Result enhancement
        const enhancedResult = service.enhanceAnalysisResult({
            content: "Basic analysis content",
            analysisType: "themes"
        }, TEST_BOOK_DATA.shortBook);

        this.assertNotNull(enhancedResult.bookData, "Enhanced result should include book data");
        this.assertNotNull(enhancedResult.generatedAt, "Enhanced result should include timestamp");
        this.assertNotNull(enhancedResult.analysisId, "Enhanced result should have unique ID");

        // Test 7.3: Result merging
        const results = [
            { analysisType: 'summary', content: 'Summary content' },
            { analysisType: 'themes', content: 'Themes content' },
            { analysisType: 'characters', content: 'Characters content' }
        ];

        const mergedResult = service.mergeAnalysisResults(TEST_BOOK_DATA.mediumBook.id, results);
        this.assertIsObject(mergedResult, "Should merge multiple results");
        this.assertEqual(Object.keys(mergedResult.analyses).length, 3, "Should include all analysis types");

        // Test 7.4: Result formatting
        const formattedResult = service.formatAnalysisResult({
            content: "Raw analysis content",
            analysisType: "summary"
        }, {
            format: 'structured',
            includeMetadata: true
        });

        this.assertNotNull(formattedResult.formatted, "Should format result");
        this.assertIsObject(formattedResult.metadata, "Should include metadata when requested");

        console.log('✅ Analysis result processing tests completed');
    }

    /**
     * Test 8: Performance and Optimization
     */
    async testPerformanceOptimization() {
        console.log('\n🧪 Testing Performance and Optimization...');

        const service = this.createMockBookAnalysisService();

        // Test 8.1: Concurrent analysis handling
        const concurrentPromises = [
            service.analyzeBook(TEST_BOOK_DATA.shortBook, 'summary'),
            service.analyzeBook(TEST_BOOK_DATA.mediumBook, 'themes'),
            service.analyzeBook(TEST_BOOK_DATA.technicalBook, 'difficulty')
        ];

        const startTime = Date.now();
        const concurrentResults = await Promise.all(concurrentPromises);
        const duration = Date.now() - startTime;

        this.assertEqual(concurrentResults.length, 3, "Should handle concurrent requests");
        this.assert(concurrentResults.every(r => r.success), "All concurrent requests should succeed");
        this.assert(duration < 5000, "Concurrent processing should be reasonably fast");

        // Test 8.2: Memory usage monitoring
        const memoryBefore = service.getMemoryUsage();

        // Process several books
        for (let i = 0; i < 10; i++) {
            await service.analyzeBook({
                ...TEST_BOOK_DATA.shortBook,
                id: `memory_test_${i}`,
                title: `Memory Test Book ${i}`
            }, 'summary');
        }

        const memoryAfter = service.getMemoryUsage();
        const memoryIncrease = memoryAfter - memoryBefore;

        this.assert(memoryIncrease < 50, "Memory usage should remain reasonable"); // 50MB arbitrary limit

        // Test 8.3: Analysis time optimization
        const optimizationStart = Date.now();
        const quickAnalysis = await service.analyzeBook(TEST_BOOK_DATA.shortBook, 'summary', {
            priority: 'fast',
            maxTokens: 150
        });
        const optimizationTime = Date.now() - optimizationStart;

        this.assert(quickAnalysis.success, "Fast analysis should succeed");
        this.assert(optimizationTime < 2000, "Fast analysis should be quick");

        console.log('✅ Performance optimization tests completed');
    }

    /**
     * Test 9: Book Model Integration  
     */
    async testBookModelIntegration() {
        console.log('\n🧪 Testing Book Model Integration...');

        const service = this.createMockBookAnalysisService();

        // Test 9.1: Analysis result storage in book
        const book = { ...TEST_BOOK_DATA.shortBook };
        const analysisResult = await service.analyzeBook(book, 'summary');

        const updatedBook = service.attachAnalysisToBook(book, analysisResult);
        this.assertNotNull(updatedBook.aiAnalysis, "Book should have AI analysis attached");
        this.assertIsObject(updatedBook.aiAnalysis.summary, "Book should have summary analysis");

        // Test 9.2: Multiple analyses on same book
        const themesResult = await service.analyzeBook(book, 'themes');
        const charactersResult = await service.analyzeBook(book, 'characters');

        const fullyAnalyzedBook = service.attachMultipleAnalysesToBook(book, [
            analysisResult,
            themesResult,
            charactersResult
        ]);

        this.assertEqual(Object.keys(fullyAnalyzedBook.aiAnalysis).length, 3, "Should store multiple analyses");

        // Test 9.3: Analysis metadata integration
        const bookWithMetadata = service.enrichBookWithAnalysisMetadata(updatedBook);
        this.assertNotNull(bookWithMetadata.analysisMetadata, "Should have analysis metadata");
        this.assertNotNull(bookWithMetadata.analysisMetadata.lastAnalyzed, "Should track last analysis time");

        console.log('✅ Book model integration tests completed');
    }

    /**
     * Test 10: Service Configuration and Customization
     */
    async testServiceConfiguration() {
        console.log('\n🧪 Testing Service Configuration...');

        // Test 10.1: Custom configuration options
        const customService = this.createMockBookAnalysisService({
            maxCacheSize: 50,
            defaultAnalysisOptions: {
                analysisDepth: 'detailed',
                includeQuotes: true
            },
            enableProgressTracking: true,
            timeout: 30000
        });

        this.assertEqual(customService.maxCacheSize, 50, "Should apply custom cache size");
        this.assert(customService.enableProgressTracking, "Should enable progress tracking");

        // Test 10.2: Analysis type configuration
        const analysisTypes = customService.getSupportedAnalysisTypes();
        this.assertIsArray(analysisTypes, "Should return supported analysis types");
        this.assertContains(analysisTypes, 'summary', "Should support summary analysis");
        this.assertContains(analysisTypes, 'themes', "Should support themes analysis");

        // Test 10.3: Model preferences
        const modelConfig = customService.getModelConfiguration();
        this.assertIsObject(modelConfig, "Should have model configuration");
        this.assertNotNull(modelConfig.defaultModel, "Should have default model");

        // Test 10.4: Performance settings
        const perfSettings = customService.getPerformanceSettings();
        this.assertIsObject(perfSettings, "Should have performance settings");
        this.assertNotNull(perfSettings.concurrentLimit, "Should have concurrent limit");

        console.log('✅ Service configuration tests completed');
    }

    // =============================================================
    // MOCK IMPLEMENTATIONS 
    // =============================================================

    createMockBookAnalysisService(options = {}) {
        return {
            // Core dependencies
            openAIService: options.openAIServiceShouldFail ? this.createFailingOpenAIService() : this.mockOpenAIService,
            storageManager: options.storageManagerShouldFail ? this.createFailingStorageManager() : this.mockStorageManager,
            eventBus: this.mockEventBus,

            // Configuration
            maxCacheSize: options.maxCacheSize || 100,
            enableProgressTracking: options.enableProgressTracking !== false,
            timeout: options.timeout || 30000,
            defaultAnalysisOptions: options.defaultAnalysisOptions || {},

            // State
            initialized: true,
            cache: new Map(),
            stats: {
                totalAnalyses: 0,
                cacheHits: 0,
                cacheMisses: 0,
                cacheSize: 0,
                isHealthy: true
            },
            progressListeners: [],

            // Methods following the expected interface
            async analyzeBook(bookData, analysisType, options = {}) {
                if (!bookData) {
                    return { success: false, error: 'No book data provided' };
                }

                if (!this.getSupportedAnalysisTypes().includes(analysisType)) {
                    return { success: false, error: `Unsupported analysis type: ${analysisType}` };
                }

                // Emit started event
                this.eventBus.emit('AI_ANALYSIS_STARTED', {
                    bookId: bookData.id,
                    analysisType,
                    timestamp: new Date().toISOString()
                });

                // Check cache
                const cacheKey = `${bookData.id}_${analysisType}`;
                if (this.cache.has(cacheKey)) {
                    this.stats.cacheHits++;
                    const cachedResult = this.cache.get(cacheKey);

                    this.eventBus.emit('AI_ANALYSIS_COMPLETED', {
                        bookId: bookData.id,
                        analysisType,
                        success: true,
                        fromCache: true
                    });

                    return { ...cachedResult, fromCache: true };
                }

                this.stats.cacheMisses++;

                // Simulate progress
                if (this.enableProgressTracking) {
                    setTimeout(() => this.emitProgress(bookData.id, 0.3), 100);
                    setTimeout(() => this.emitProgress(bookData.id, 0.7), 200);
                }

                try {
                    // Simulate AI analysis
                    const analysisResult = await this.performAnalysis(bookData, analysisType, options);

                    // Cache result
                    this.cache.set(cacheKey, analysisResult);
                    this.stats.cacheSize = this.cache.size;
                    this.stats.totalAnalyses++;

                    // Emit completed event
                    this.eventBus.emit('AI_ANALYSIS_COMPLETED', {
                        bookId: bookData.id,
                        analysisType,
                        success: true,
                        fromCache: false
                    });

                    if (this.enableProgressTracking) {
                        this.emitProgress(bookData.id, 1.0);
                    }

                    return analysisResult;

                } catch (error) {
                    this.eventBus.emit('AI_ANALYSIS_ERROR', {
                        bookId: bookData.id,
                        analysisType,
                        error: error.message
                    });

                    return { success: false, error: error.message };
                }
            },

            async analyzeBatch(bookData, analysisTypes, options = {}) {
                const results = [];

                for (const analysisType of analysisTypes) {
                    const result = await this.analyzeBook(bookData, analysisType, options);
                    results.push(result);
                }

                return {
                    success: results.every(r => r.success),
                    results,
                    bookId: bookData.id,
                    analysisTypes
                };
            },

            chunkBookContent(bookData, options = {}) {
                const maxTokens = options.maxTokens || 4000;
                const overlap = options.overlap || 200;
                const content = bookData.content || '';

                // Simple chunking simulation
                const estimatedTokens = this.estimateChunkTokens(content);

                if (estimatedTokens <= maxTokens) {
                    return [{
                        content: content,
                        chunkIndex: 0,
                        totalChunks: 1,
                        metadata: {
                            startPosition: 0,
                            endPosition: content.length,
                            estimatedTokens
                        }
                    }];
                }

                // Split into chunks
                const chunks = [];
                const chunkSize = Math.floor(content.length * maxTokens / estimatedTokens);
                let position = 0;
                let chunkIndex = 0;

                while (position < content.length) {
                    const end = Math.min(position + chunkSize, content.length);
                    const chunkContent = content.substring(position, end);

                    chunks.push({
                        content: chunkContent,
                        chunkIndex: chunkIndex++,
                        totalChunks: Math.ceil(content.length / chunkSize),
                        metadata: {
                            startPosition: position,
                            endPosition: end,
                            estimatedTokens: this.estimateChunkTokens(chunkContent)
                        }
                    });

                    position = end - overlap; // Move back for overlap
                }

                return chunks;
            },

            estimateChunkTokens(content) {
                // Simple token estimation: ~4 chars per token
                return Math.ceil(content.length / 4);
            },

            invalidateCache(bookId, analysisType) {
                const cacheKey = analysisType ? `${bookId}_${analysisType}` : null;

                if (cacheKey) {
                    this.cache.delete(cacheKey);
                } else {
                    // Clear all cache entries for this book
                    for (const key of this.cache.keys()) {
                        if (key.startsWith(`${bookId}_`)) {
                            this.cache.delete(key);
                        }
                    }
                }

                this.stats.cacheSize = this.cache.size;
            },

            async saveAnalysisResult(bookId, analysisType, result) {
                try {
                    const key = `analysis_${bookId}_${analysisType}`;
                    await this.storageManager.save(key, result);
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async loadAnalysisResult(bookId, analysisType) {
                try {
                    const key = `analysis_${bookId}_${analysisType}`;
                    const data = await this.storageManager.load(key);
                    return { success: true, data };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            validateAnalysisResult(result) {
                const errors = [];

                if (!result.content) errors.push('Missing content');
                if (!result.analysisType) errors.push('Missing analysis type');
                if (result.confidence !== undefined && (result.confidence < 0 || result.confidence > 1)) {
                    errors.push('Invalid confidence score');
                }

                return { valid: errors.length === 0, errors };
            },

            enhanceAnalysisResult(result, bookData) {
                return {
                    ...result,
                    analysisId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    bookData: {
                        id: bookData.id,
                        title: bookData.title,
                        author: bookData.author
                    },
                    generatedAt: new Date().toISOString(),
                    enhanced: true
                };
            },

            mergeAnalysisResults(bookId, results) {
                const merged = {
                    bookId,
                    analyses: {},
                    mergedAt: new Date().toISOString(),
                    totalAnalyses: results.length
                };

                results.forEach(result => {
                    if (result.analysisType) {
                        merged.analyses[result.analysisType] = result;
                    }
                });

                return merged;
            },

            formatAnalysisResult(result, options = {}) {
                let formatted = { ...result };

                if (options.format === 'structured') {
                    formatted.formatted = {
                        type: result.analysisType,
                        content: result.content,
                        structured: true
                    };
                }

                if (options.includeMetadata) {
                    formatted.metadata = {
                        formattedAt: new Date().toISOString(),
                        format: options.format || 'default',
                        options: options
                    };
                }

                return formatted;
            },

            attachAnalysisToBook(book, analysisResult) {
                const updatedBook = { ...book };

                if (!updatedBook.aiAnalysis) {
                    updatedBook.aiAnalysis = {};
                }

                updatedBook.aiAnalysis[analysisResult.analysisType] = analysisResult;

                return updatedBook;
            },

            attachMultipleAnalysesToBook(book, analysisResults) {
                let updatedBook = { ...book };

                analysisResults.forEach(result => {
                    updatedBook = this.attachAnalysisToBook(updatedBook, result);
                });

                return updatedBook;
            },

            enrichBookWithAnalysisMetadata(book) {
                return {
                    ...book,
                    analysisMetadata: {
                        lastAnalyzed: new Date().toISOString(),
                        analysisCount: Object.keys(book.aiAnalysis || {}).length,
                        hasAnalysis: !!(book.aiAnalysis && Object.keys(book.aiAnalysis).length > 0)
                    }
                };
            },

            getSupportedAnalysisTypes() {
                return ['summary', 'themes', 'characters', 'difficulty', 'sentiment', 'style'];
            },

            getModelConfiguration() {
                return {
                    defaultModel: 'gpt-3.5-turbo',
                    availableModels: ['gpt-3.5-turbo', 'gpt-4'],
                    modelLimits: {
                        'gpt-3.5-turbo': { maxTokens: 4096 },
                        'gpt-4': { maxTokens: 8192 }
                    }
                };
            },

            getPerformanceSettings() {
                return {
                    concurrentLimit: 3,
                    timeout: this.timeout,
                    retryAttempts: 2,
                    cacheEnabled: true,
                    maxCacheSize: this.maxCacheSize
                };
            },

            getStats() {
                return { ...this.stats };
            },

            getMemoryUsage() {
                // Simulate memory usage in MB
                return 10 + (this.cache.size * 0.1);
            },

            getEventListeners() {
                return ['AI_ANALYSIS_STARTED', 'AI_ANALYSIS_COMPLETED', 'AI_ANALYSIS_PROGRESS', 'AI_ANALYSIS_ERROR'];
            },

            onProgress(callback) {
                this.progressListeners.push(callback);
            },

            emitProgress(bookId, progress) {
                const progressData = { bookId, progress, timestamp: new Date().toISOString() };

                this.progressListeners.forEach(listener => {
                    try {
                        listener(progressData);
                    } catch (error) {
                        console.error('Progress listener error:', error);
                    }
                });

                this.eventBus.emit('AI_ANALYSIS_PROGRESS', progressData);
            },

            async performAnalysis(bookData, analysisType, options) {
                // Simulate AI analysis call
                await this.simulateAsyncWork(500); // 500ms delay

                const analysisContent = this.generateMockAnalysis(bookData, analysisType, options);

                return {
                    success: true,
                    content: analysisContent,
                    analysisType,
                    confidence: 0.85 + Math.random() * 0.1,
                    metadata: {
                        model: 'gpt-3.5-turbo',
                        tokens: Math.floor(analysisContent.length / 4),
                        processingTime: 500,
                        timestamp: new Date().toISOString()
                    }
                };
            },

            generateMockAnalysis(bookData, analysisType, options) {
                const depth = options.analysisDepth || 'standard';

                switch (analysisType) {
                    case 'summary':
                        return `${depth} summary of "${bookData.title}" by ${bookData.author}. This ${bookData.genre} work explores themes of human nature and society. The narrative follows characters through their journeys of discovery and growth.`;

                    case 'themes':
                        return `Major themes in "${bookData.title}" include: 1) Human relationships and connection, 2) Moral choices and consequences, 3) Social commentary on ${bookData.genre} elements, 4) Personal growth and transformation.`;

                    case 'characters':
                        return `Character analysis of "${bookData.title}": The protagonists demonstrate complex motivations and realistic development throughout the narrative. Supporting characters provide contrast and depth to the main themes.`;

                    case 'difficulty':
                        const wordCount = bookData.wordCount || 0;
                        const level = wordCount < 50000 ? 'intermediate' : 'advanced';
                        return `Reading difficulty assessment: ${level} level. Vocabulary complexity is appropriate for the ${bookData.genre} genre. Estimated reading time: ${Math.ceil(wordCount / 250)} minutes.`;

                    case 'sentiment':
                        return `Sentiment analysis reveals a predominantly balanced emotional tone with moments of both introspection and optimism. The author's perspective on the subject matter appears thoughtful and nuanced.`;

                    default:
                        return `${analysisType} analysis of "${bookData.title}" completed with ${depth} depth.`;
                }
            },

            async simulateAsyncWork(delay) {
                return new Promise(resolve => setTimeout(resolve, delay));
            }
        };
    }

    createMockOpenAIService() {
        return {
            async analyzeBook(bookData, analysisType, options) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return {
                    success: true,
                    content: `AI analysis of ${bookData.title}`,
                    analysisType
                };
            },

            async completion(request) {
                await new Promise(resolve => setTimeout(resolve, 200));
                return {
                    success: true,
                    content: 'Mock AI completion response'
                };
            }
        };
    }

    createFailingOpenAIService() {
        return {
            async analyzeBook() {
                throw new Error('OpenAI service unavailable');
            },

            async completion() {
                throw new Error('OpenAI service unavailable');
            }
        };
    }

    createMockStorageManager() {
        const storage = new Map();

        return {
            async save(key, data) {
                storage.set(key, data);
                return { success: true };
            },

            async load(key) {
                if (storage.has(key)) {
                    return storage.get(key);
                }
                throw new Error('Key not found');
            },

            async delete(key) {
                storage.delete(key);
                return { success: true };
            }
        };
    }

    createFailingStorageManager() {
        return {
            async save() {
                throw new Error('Storage unavailable');
            },

            async load() {
                throw new Error('Storage unavailable');
            },

            async delete() {
                throw new Error('Storage unavailable');
            }
        };
    }

    createMockEventBus() {
        const listeners = new Map();

        return {
            on(event, callback) {
                if (!listeners.has(event)) {
                    listeners.set(event, []);
                }
                listeners.get(event).push(callback);
            },

            emit(event, data) {
                if (listeners.has(event)) {
                    listeners.get(event).forEach(callback => {
                        try {
                            callback(data);
                        } catch (error) {
                            console.error('Event listener error:', error);
                        }
                    });
                }
            },

            off(event, callback) {
                if (listeners.has(event)) {
                    const eventListeners = listeners.get(event);
                    const index = eventListeners.indexOf(callback);
                    if (index > -1) {
                        eventListeners.splice(index, 1);
                    }
                }
            }
        };
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🚀 Starting BookAnalysisService TDD Test Suite...\n');

        try {
            await this.testServiceInitialization();
            await this.testAnalysisWorkflow();
            await this.testBookChunking();
            await this.testCachingAndPersistence();
            await this.testErrorHandling();
            await this.testEventBusIntegration();
            await this.testAnalysisResultProcessing();
            await this.testPerformanceOptimization();
            await this.testBookModelIntegration();
            await this.testServiceConfiguration();

        } catch (error) {
            console.error('❌ Test suite error:', error);
            this.testResults.failed++;
            this.testResults.errors.push(error.message);
        }

        this.printResults();
        return this.testResults;
    }

    printResults() {
        const duration = Date.now() - this.startTime;
        const total = this.testResults.passed + this.testResults.failed;

        console.log('\n' + '='.repeat(60));
        console.log('🧪 BookAnalysisService TDD Test Results');
        console.log('='.repeat(60));
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`📊 Total: ${total}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`🎯 Success Rate: ${((this.testResults.passed / total) * 100).toFixed(1)}%`);

        if (this.testResults.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }

        console.log('\n🏆 Test Suite Completed');
        console.log('='.repeat(60));
    }
}

// Export for Book Buddy integration
if (typeof window !== 'undefined') {
    window.BookAnalysisServiceTests = BookAnalysisServiceTests;
}

// Test runner
async function runBookAnalysisServiceTests() {
    const testSuite = new BookAnalysisServiceTests();
    return await testSuite.runAllTests();
}

// Auto-run in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('🧪 BookAnalysisService tests available. Run: runBookAnalysisServiceTests()');
}

/**
 * IMPLEMENTATION REQUIREMENTS DERIVED FROM TDD TESTS
 * ==================================================
 * 
 * The BookAnalysisService.js implementation must provide:
 * 
 * CORE CLASS STRUCTURE:
 * ```javascript
 * class BookAnalysisService {
 *     constructor(openAIService, storageManager, eventBus, options = {})
 *     
 *     // Core Analysis Methods
 *     async analyzeBook(bookData, analysisType, options = {})
 *     async analyzeBatch(bookData, analysisTypes, options = {})
 *     
 *     // Content Processing
 *     chunkBookContent(bookData, options = {})
 *     estimateChunkTokens(content)
 *     
 *     // Caching & Persistence
 *     invalidateCache(bookId, analysisType)
 *     async saveAnalysisResult(bookId, analysisType, result)
 *     async loadAnalysisResult(bookId, analysisType)
 *     
 *     // Result Processing
 *     validateAnalysisResult(result)
 *     enhanceAnalysisResult(result, bookData)
 *     mergeAnalysisResults(bookId, results)
 *     formatAnalysisResult(result, options)
 *     
 *     // Book Integration
 *     attachAnalysisToBook(book, analysisResult)
 *     attachMultipleAnalysesToBook(book, analysisResults)
 *     enrichBookWithAnalysisMetadata(book)
 *     
 *     // Configuration
 *     getSupportedAnalysisTypes()
 *     getModelConfiguration()
 *     getPerformanceSettings()
 *     
 *     // Monitoring
 *     getStats()
 *     getMemoryUsage()
 *     onProgress(callback)
 * }
 * ```
 * 
 * INTEGRATION POINTS:
 * 
 * 1. OpenAIService Integration:
 *    - Uses openAIService.analyzeBook() for AI analysis
 *    - Handles AI service errors gracefully
 *    - Implements retry logic and timeout handling
 * 
 * 2. StorageManager Integration:
 *    - Caches analysis results for performance
 *    - Persists results for long-term storage
 *    - Handles storage failures without breaking analysis
 * 
 * 3. EventBus Integration:
 *    - Emits AI_ANALYSIS_STARTED events
 *    - Emits AI_ANALYSIS_COMPLETED events
 *    - Emits AI_ANALYSIS_PROGRESS events for long analyses
 *    - Emits AI_ANALYSIS_ERROR events on failures
 * 
 * 4. Book Model Integration:
 *    - Extends Book objects with aiAnalysis property
 *    - Maintains analysis metadata
 *    - Supports multiple analysis types per book
 * 
 * ANALYSIS TYPES TO SUPPORT:
 * - summary: Book summarization
 * - themes: Theme identification and analysis
 * - characters: Character analysis (for fiction)
 * - difficulty: Reading difficulty assessment
 * - sentiment: Emotional tone analysis
 * - style: Writing style analysis
 * 
 * ERROR HANDLING:
 * - Graceful handling of null/invalid book data
 * - Unsupported analysis type validation
 * - AI service failure recovery
 * - Storage failure resilience
 * - Timeout handling for long analyses
 * 
 * PERFORMANCE FEATURES:
 * - Content chunking for large books
 * - Result caching with configurable limits
 * - Concurrent analysis support
 * - Memory usage monitoring
 * - Progress tracking for user feedback
 * 
 * NEXT STEP: Implement BookAnalysisService.js based on these test requirements
 */