/**
 * BookAnalysisService Tests - Phase 2.2: Analysis Type Handlers (TDD)
 * File: tests/BookAnalysisService.test.js
 * 
 * Comprehensive test suite for all analysis types following your TDD patterns
 */

// Test setup and mocks
const mockBook = {
    id: 'test-book-1',
    title: 'The Great Gatsby',
    content: `In my younger and more vulnerable years my father gave me some advice that I've carried with me ever since. "Whenever you feel like criticizing anyone," he told me, "just remember that all the people in this world haven't had the advantages that you've had." He didn't say any more, but we've always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that. In consequence, I'm inclined to reserve all judgments, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores.`,
    wordCount: 1500,
    metadata: {
        authors: ['F. Scott Fitzgerald'],
        publishedDate: '1925',
        genre: 'Classic Literature'
    }
};

const mockOpenAIService = {
    async analyzeText(prompt, content, options = {}) {
        // Mock successful AI response based on analysis type
        const analysisType = options.analysisType;
        
        switch (analysisType) {
            case 'summary':
                return {
                    success: true,
                    result: {
                        summary: 'A story about Nick Carraway observing the mysterious Jay Gatsby.',
                        keyPoints: ['American Dream', 'Social class', 'Love and obsession'],
                        length: 'short'
                    },
                    tokensUsed: 150,
                    cost: 0.002
                };
                
            case 'themes':
                return {
                    success: true,
                    result: {
                        primaryThemes: ['The American Dream', 'Social Class', 'Moral Decay'],
                        secondaryThemes: ['Love and Obsession', 'Past vs Present'],
                        themeAnalysis: {
                            'The American Dream': 'Central theme exploring the corruption of the American Dream',
                            'Social Class': 'Examination of class differences in 1920s America'
                        }
                    },
                    tokensUsed: 200,
                    cost: 0.003
                };
                
            case 'characters':
                return {
                    success: true,
                    result: {
                        mainCharacters: [
                            {
                                name: 'Jay Gatsby',
                                role: 'Protagonist',
                                traits: ['mysterious', 'wealthy', 'romantic'],
                                significance: 'Represents the American Dream'
                            },
                            {
                                name: 'Nick Carraway',
                                role: 'Narrator',
                                traits: ['observant', 'moral', 'Midwestern'],
                                significance: 'Moral compass and observer'
                            }
                        ],
                        characterCount: 2,
                        relationshipDynamics: 'Complex web of relationships centered around Gatsby'
                    },
                    tokensUsed: 250,
                    cost: 0.004
                };
                
            case 'difficulty':
                return {
                    success: true,
                    result: {
                        readingLevel: 'Intermediate',
                        complexity: 7.5,
                        vocabulary: 'Moderate',
                        sentenceStructure: 'Complex',
                        recommendedAge: '16+',
                        estimatedReadingTime: 45
                    },
                    tokensUsed: 100,
                    cost: 0.001
                };
                
            case 'sentiment':
                return {
                    success: true,
                    result: {
                        overallSentiment: 'Melancholic',
                        sentimentScore: -0.3,
                        emotionalTone: ['nostalgic', 'tragic', 'hopeful'],
                        moodProgression: 'Starts hopeful, becomes increasingly tragic',
                        intensity: 'Medium-High'
                    },
                    tokensUsed: 120,
                    cost: 0.002
                };
                
            case 'style':
                return {
                    success: true,
                    result: {
                        writingStyle: 'Literary Fiction',
                        narrativeVoice: 'First Person',
                        literaryDevices: ['symbolism', 'metaphor', 'irony'],
                        proseStyle: 'Lyrical and descriptive',
                        authorVoice: 'Sophisticated and reflective'
                    },
                    tokensUsed: 130,
                    cost: 0.002
                };
                
            default:
                return {
                    success: false,
                    error: `Unknown analysis type: ${analysisType}`
                };
        }
    }
};

const mockStorage = {
    data: new Map(),
    save(key, data) {
        this.data.set(key, JSON.stringify(data));
        return { success: true };
    },
    load(key) {
        const data = this.data.get(key);
        return data ? { success: true, data: JSON.parse(data) } : { success: false };
    }
};

const mockEventBus = {
    events: [],
    emit(event, data) {
        this.events.push({ event, data, timestamp: Date.now() });
    },
    clear() {
        this.events = [];
    }
};

// Test Suite
describe('BookAnalysisService - Analysis Type Handlers', () => {
    let bookAnalysisService;
    
    beforeEach(() => {
        // Reset mocks
        mockStorage.data.clear();
        mockEventBus.clear();
        
        // Create service instance
        bookAnalysisService = new BookAnalysisService(
            mockOpenAIService,
            mockStorage,
            mockEventBus,
            {
                maxCacheSize: 50,
                enableProgressTracking: true,
                enableCaching: true
            }
        );
    });

    // ✅ TEST 1: Summary Generation
    describe('Summary Generation', () => {
        it('should generate a basic summary successfully', async () => {
            const result = await bookAnalysisService.generateSummary(mockBook, {
                length: 'short',
                includeKeyPoints: true
            });
            
            expect(result.success).toBe(true);
            expect(result.analysis).toBeDefined();
            expect(result.analysis.summary).toContain('Nick Carraway');
            expect(result.analysis.keyPoints).toBeInstanceOf(Array);
            expect(result.analysis.keyPoints.length).toBeGreaterThan(0);
            expect(result.tokensUsed).toBeGreaterThan(0);
            expect(result.analysisType).toBe('summary');
        });

        it('should generate different summary lengths', async () => {
            const shortResult = await bookAnalysisService.generateSummary(mockBook, { length: 'short' });
            const longResult = await bookAnalysisService.generateSummary(mockBook, { length: 'detailed' });
            
            expect(shortResult.success).toBe(true);
            expect(longResult.success).toBe(true);
            expect(shortResult.options.length).toBe('short');
            expect(longResult.options.length).toBe('detailed');
        });

        it('should handle summary generation errors gracefully', async () => {
            // Mock OpenAI service to return error
            const errorService = {
                async analyzeText() {
                    return { success: false, error: 'API rate limit exceeded' };
                }
            };
            
            const serviceWithError = new BookAnalysisService(errorService, mockStorage, mockEventBus);
            const result = await serviceWithError.generateSummary(mockBook);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('rate limit');
        });

        it('should cache summary results', async () => {
            await bookAnalysisService.generateSummary(mockBook);
            
            // Check that result was cached
            const cacheKey = bookAnalysisService._createCacheKey(mockBook.id, 'summary', {});
            const cachedResult = bookAnalysisService._getCachedResult(cacheKey);
            
            expect(cachedResult).toBeDefined();
            expect(cachedResult.analysisType).toBe('summary');
        });
    });

    // ✅ TEST 2: Theme Extraction
    describe('Theme Extraction', () => {
        it('should extract primary and secondary themes', async () => {
            const result = await bookAnalysisService.extractThemes(mockBook, {
                includeAnalysis: true,
                maxThemes: 5
            });
            
            expect(result.success).toBe(true);
            expect(result.analysis.primaryThemes).toBeInstanceOf(Array);
            expect(result.analysis.secondaryThemes).toBeInstanceOf(Array);
            expect(result.analysis.themeAnalysis).toBeDefined();
            expect(result.analysis.primaryThemes).toContain('The American Dream');
            expect(result.analysisType).toBe('themes');
        });

        it('should respect maxThemes option', async () => {
            const result = await bookAnalysisService.extractThemes(mockBook, { maxThemes: 3 });
            
            expect(result.success).toBe(true);
            expect(result.options.maxThemes).toBe(3);
        });

        it('should emit progress events during theme extraction', async () => {
            await bookAnalysisService.extractThemes(mockBook);
            
            const progressEvents = mockEventBus.events.filter(e => e.event === 'ai:analysisProgress');
            expect(progressEvents.length).toBeGreaterThan(0);
        });
    });

    // ✅ TEST 3: Character Analysis
    describe('Character Analysis', () => {
        it('should identify main characters and their traits', async () => {
            const result = await bookAnalysisService.analyzeCharacters(mockBook, {
                includeTraits: true,
                includeRelationships: true
            });
            
            expect(result.success).toBe(true);
            expect(result.analysis.mainCharacters).toBeInstanceOf(Array);
            expect(result.analysis.mainCharacters.length).toBeGreaterThan(0);
            
            const gatsby = result.analysis.mainCharacters.find(c => c.name === 'Jay Gatsby');
            expect(gatsby).toBeDefined();
            expect(gatsby.traits).toBeInstanceOf(Array);
            expect(gatsby.role).toBe('Protagonist');
            expect(result.analysisType).toBe('characters');
        });

        it('should analyze character relationships when requested', async () => {
            const result = await bookAnalysisService.analyzeCharacters(mockBook, { 
                includeRelationships: true 
            });
            
            expect(result.success).toBe(true);
            expect(result.analysis.relationshipDynamics).toBeDefined();
        });

        it('should handle books with no clear characters', async () => {
            const nonFictionBook = {
                ...mockBook,
                content: 'This is a technical manual about programming concepts.',
                title: 'Programming Guide'
            };
            
            const result = await bookAnalysisService.analyzeCharacters(nonFictionBook);
            
            // Should still succeed but with different results
            expect(result.success).toBe(true);
        });
    });

    // ✅ TEST 4: Difficulty Assessment
    describe('Difficulty Assessment', () => {
        it('should assess reading difficulty accurately', async () => {
            const result = await bookAnalysisService.assessDifficulty(mockBook, {
                includeAgeRecommendation: true,
                includeReadingTime: true
            });
            
            expect(result.success).toBe(true);
            expect(result.analysis.readingLevel).toBeDefined();
            expect(result.analysis.complexity).toBeGreaterThan(0);
            expect(result.analysis.complexity).toBeLessThanOrEqual(10);
            expect(result.analysis.recommendedAge).toBeDefined();
            expect(result.analysis.estimatedReadingTime).toBeGreaterThan(0);
            expect(result.analysisType).toBe('difficulty');
        });

        it('should provide vocabulary and structure analysis', async () => {
            const result = await bookAnalysisService.assessDifficulty(mockBook);
            
            expect(result.success).toBe(true);
            expect(result.analysis.vocabulary).toBeDefined();
            expect(result.analysis.sentenceStructure).toBeDefined();
        });

        it('should calculate reading time based on word count', async () => {
            const result = await bookAnalysisService.assessDifficulty(mockBook);
            
            expect(result.success).toBe(true);
            expect(result.analysis.estimatedReadingTime).toBeGreaterThan(0);
            // Should be roughly wordCount / reading speed
            expect(result.analysis.estimatedReadingTime).toBeLessThan(120); // reasonable for test book
        });
    });

    // ✅ TEST 5: Sentiment Analysis
    describe('Sentiment Analysis', () => {
        it('should analyze overall sentiment and emotional tone', async () => {
            const result = await bookAnalysisService.analyzeSentiment(mockBook, {
                includeEmotionalTone: true,
                includeMoodProgression: true
            });
            
            expect(result.success).toBe(true);
            expect(result.analysis.overallSentiment).toBeDefined();
            expect(result.analysis.sentimentScore).toBeGreaterThanOrEqual(-1);
            expect(result.analysis.sentimentScore).toBeLessThanOrEqual(1);
            expect(result.analysis.emotionalTone).toBeInstanceOf(Array);
            expect(result.analysis.moodProgression).toBeDefined();
            expect(result.analysisType).toBe('sentiment');
        });

        it('should provide sentiment intensity assessment', async () => {
            const result = await bookAnalysisService.analyzeSentiment(mockBook);
            
            expect(result.success).toBe(true);
            expect(result.analysis.intensity).toBeDefined();
            expect(['Low', 'Medium', 'High', 'Medium-High']).toContain(result.analysis.intensity);
        });
    });

    // ✅ TEST 6: Style Analysis
    describe('Style Analysis', () => {
        it('should identify writing style and narrative voice', async () => {
            const result = await bookAnalysisService.analyzeStyle(mockBook, {
                includeLiteraryDevices: true,
                includeProseStyle: true
            });
            
            expect(result.success).toBe(true);
            expect(result.analysis.writingStyle).toBeDefined();
            expect(result.analysis.narrativeVoice).toBeDefined();
            expect(result.analysis.literaryDevices).toBeInstanceOf(Array);
            expect(result.analysis.proseStyle).toBeDefined();
            expect(result.analysis.authorVoice).toBeDefined();
            expect(result.analysisType).toBe('style');
        });

        it('should identify literary devices used', async () => {
            const result = await bookAnalysisService.analyzeStyle(mockBook);
            
            expect(result.success).toBe(true);
            expect(result.analysis.literaryDevices).toBeInstanceOf(Array);
            expect(result.analysis.literaryDevices.length).toBeGreaterThan(0);
        });
    });

    // ✅ TEST 7: Batch Analysis
    describe('Batch Analysis', () => {
        it('should run multiple analysis types in batch', async () => {
            const analysisTypes = ['summary', 'themes', 'difficulty'];
            const result = await bookAnalysisService.performBatchAnalysis(mockBook, analysisTypes);
            
            expect(result.success).toBe(true);
            expect(result.analyses).toBeDefined();
            expect(Object.keys(result.analyses)).toHaveLength(3);
            expect(result.analyses.summary).toBeDefined();
            expect(result.analyses.themes).toBeDefined();
            expect(result.analyses.difficulty).toBeDefined();
            expect(result.totalTokensUsed).toBeGreaterThan(0);
            expect(result.totalCost).toBeGreaterThan(0);
        });

        it('should handle partial failures in batch analysis', async () => {
            // Mock service with intermittent failures
            const partialFailureService = {
                async analyzeText(prompt, content, options) {
                    if (options.analysisType === 'themes') {
                        return { success: false, error: 'Themes analysis failed' };
                    }
                    return mockOpenAIService.analyzeText(prompt, content, options);
                }
            };
            
            const serviceWithFailures = new BookAnalysisService(partialFailureService, mockStorage, mockEventBus);
            const result = await serviceWithFailures.performBatchAnalysis(mockBook, ['summary', 'themes', 'difficulty']);
            
            expect(result.success).toBe(true); // Should succeed overall
            expect(result.analyses.summary.success).toBe(true);
            expect(result.analyses.themes.success).toBe(false);
            expect(result.analyses.difficulty.success).toBe(true);
            expect(result.partialFailures).toBe(1);
        });

        it('should emit progress events during batch analysis', async () => {
            await bookAnalysisService.performBatchAnalysis(mockBook, ['summary', 'themes']);
            
            const startEvent = mockEventBus.events.find(e => e.event === 'ai:batchAnalysisStarted');
            const progressEvents = mockEventBus.events.filter(e => e.event === 'ai:analysisProgress');
            const completeEvent = mockEventBus.events.find(e => e.event === 'ai:batchAnalysisCompleted');
            
            expect(startEvent).toBeDefined();
            expect(progressEvents.length).toBeGreaterThan(0);
            expect(completeEvent).toBeDefined();
        });
    });

    // ✅ TEST 8: Error Handling
    describe('Error Handling', () => {
        it('should handle OpenAI API failures gracefully', async () => {
            const errorService = {
                async analyzeText() {
                    throw new Error('API connection failed');
                }
            };
            
            const serviceWithErrors = new BookAnalysisService(errorService, mockStorage, mockEventBus);
            const result = await serviceWithErrors.generateSummary(mockBook);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('API connection failed');
        });

        it('should handle invalid book data', async () => {
            const invalidBook = { title: 'Test', content: '' };
            const result = await bookAnalysisService.generateSummary(invalidBook);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('content');
        });

        it('should handle unsupported analysis types', async () => {
            const result = await bookAnalysisService.performAnalysis(mockBook, 'unsupported_type');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Unsupported analysis type');
        });
    });

    // ✅ TEST 9: Caching System
    describe('Caching System', () => {
        it('should cache analysis results', async () => {
            const result1 = await bookAnalysisService.generateSummary(mockBook);
            const result2 = await bookAnalysisService.generateSummary(mockBook);
            
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(result2.fromCache).toBe(true);
        });

        it('should respect cache expiry', async () => {
            // Mock expired cache
            const expiredService = new BookAnalysisService(mockOpenAIService, mockStorage, mockEventBus, {
                cacheExpiry: 1 // 1ms
            });
            
            await expiredService.generateSummary(mockBook);
            
            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 5));
            
            const result = await expiredService.generateSummary(mockBook);
            expect(result.fromCache).toBeFalsy();
        });

        it('should handle cache storage failures', async () => {
            const failingStorage = {
                save() { return { success: false, error: 'Storage full' }; },
                load() { return { success: false }; }
            };
            
            const serviceWithFailingStorage = new BookAnalysisService(mockOpenAIService, failingStorage, mockEventBus);
            const result = await serviceWithFailingStorage.generateSummary(mockBook);
            
            // Should still work, just without caching
            expect(result.success).toBe(true);
        });
    });

    // ✅ TEST 10: Progress Tracking
    describe('Progress Tracking', () => {
        it('should emit progress events during analysis', async () => {
            await bookAnalysisService.generateSummary(mockBook);
            
            const progressEvents = mockEventBus.events.filter(e => e.event === 'ai:analysisProgress');
            expect(progressEvents.length).toBeGreaterThan(0);
            
            const startedEvent = mockEventBus.events.find(e => e.event === 'ai:analysisStarted');
            const completedEvent = mockEventBus.events.find(e => e.event === 'ai:analysisCompleted');
            
            expect(startedEvent).toBeDefined();
            expect(completedEvent).toBeDefined();
        });

        it('should track token usage and costs', async () => {
            const result = await bookAnalysisService.generateSummary(mockBook);
            
            expect(result.success).toBe(true);
            expect(result.tokensUsed).toBeGreaterThan(0);
            expect(result.cost).toBeGreaterThan(0);
            expect(typeof result.tokensUsed).toBe('number');
            expect(typeof result.cost).toBe('number');
        });
    });
});

// ✅ Integration Tests
describe('BookAnalysisService - Integration Tests', () => {
    let bookAnalysisService;
    
    beforeEach(() => {
        bookAnalysisService = new BookAnalysisService(
            mockOpenAIService,
            mockStorage,
            mockEventBus
        );
    });

    it('should perform full book analysis workflow', async () => {
        const analysisTypes = ['summary', 'themes', 'characters', 'difficulty', 'sentiment', 'style'];
        const result = await bookAnalysisService.performFullAnalysis(mockBook);
        
        expect(result.success).toBe(true);
        expect(result.analyses).toBeDefined();
        expect(Object.keys(result.analyses)).toHaveLength(6);
        expect(result.metadata.analysisDate).toBeDefined();
        expect(result.metadata.totalDuration).toBeGreaterThan(0);
    });

    it('should save and load analysis results', async () => {
        await bookAnalysisService.generateSummary(mockBook);
        
        const savedAnalyses = await bookAnalysisService.getBookAnalyses(mockBook.id);
        expect(savedAnalyses.success).toBe(true);
        expect(savedAnalyses.analyses.length).toBeGreaterThan(0);
    });

    it('should handle concurrent analysis requests', async () => {
        const promises = [
            bookAnalysisService.generateSummary(mockBook),
            bookAnalysisService.extractThemes(mockBook),
            bookAnalysisService.assessDifficulty(mockBook)
        ];
        
        const results = await Promise.all(promises);
        
        results.forEach(result => {
            expect(result.success).toBe(true);
        });
    });
});

console.log('📋 BookAnalysisService TDD Test Suite Complete');
console.log('✅ Ready for implementation phase');
console.log('🎯 Next: Implement the analysis handlers to pass these tests');