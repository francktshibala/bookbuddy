/**
 * AIAnalysisPanel TDD Tests
 * File: tests/AIAnalysisPanel.test.js
 * 
 * Comprehensive test suite following your existing patterns
 */

// Mock dependencies
const mockBook = {
    id: 'test-book-1',
    title: 'The Great Gatsby',
    authors: ['F. Scott Fitzgerald'],
    content: 'Sample book content for testing...',
    wordCount: 1500
};

const mockModalManager = {
    modals: [],
    showModal(config) {
        const modal = { id: `modal-${Date.now()}`, config, closed: false };
        this.modals.push(modal);
        return {
            id: modal.id,
            close: () => { modal.closed = true; },
            updateContent: (content) => { modal.config.content = content; },
            updateTitle: (title) => { modal.config.title = title; }
        };
    },
    closeModal(id) {
        const modal = this.modals.find(m => m.id === id);
        if (modal) modal.closed = true;
    },
    getActiveModals() {
        return this.modals.filter(m => !m.closed);
    },
    clear() {
        this.modals = [];
    }
};

const mockBookAnalysisService = {
    results: new Map(),
    setMockResult(analysisType, result) {
        this.results.set(analysisType, result);
    },
    async generateSummary(book, options = {}) {
        const result = this.results.get('summary') || {
            success: true,
            analysisType: 'summary',
            analysis: {
                summary: 'A compelling story about the American Dream.',
                keyPoints: ['American Dream', 'Social class', 'Love'],
                length: options.length || 'medium'
            },
            tokensUsed: 150,
            cost: 0.002
        };
        return result;
    },
    async extractThemes(book, options = {}) {
        const result = this.results.get('themes') || {
            success: true,
            analysisType: 'themes',
            analysis: {
                primaryThemes: ['The American Dream', 'Social Class'],
                secondaryThemes: ['Love and Obsession'],
                themeAnalysis: {
                    'The American Dream': 'Central theme exploring corruption'
                }
            },
            tokensUsed: 200,
            cost: 0.003
        };
        return result;
    },
    async analyzeCharacters(book, options = {}) {
        const result = this.results.get('characters') || {
            success: true,
            analysisType: 'characters',
            analysis: {
                mainCharacters: [
                    {
                        name: 'Jay Gatsby',
                        role: 'Protagonist',
                        traits: ['mysterious', 'wealthy'],
                        significance: 'Represents the American Dream'
                    }
                ],
                characterCount: 1
            },
            tokensUsed: 250,
            cost: 0.004
        };
        return result;
    },
    async assessDifficulty(book, options = {}) {
        const result = this.results.get('difficulty') || {
            success: true,
            analysisType: 'difficulty',
            analysis: {
                readingLevel: 'Intermediate',
                complexity: 7.5,
                vocabulary: 'Moderate',
                recommendedAge: '16+',
                estimatedReadingTime: 45
            },
            tokensUsed: 100,
            cost: 0.001
        };
        return result;
    },
    async analyzeSentiment(book, options = {}) {
        const result = this.results.get('sentiment') || {
            success: true,
            analysisType: 'sentiment',
            analysis: {
                overallSentiment: 'Melancholic',
                sentimentScore: -0.3,
                emotionalTone: ['nostalgic', 'tragic'],
                intensity: 'Medium-High'
            },
            tokensUsed: 120,
            cost: 0.002
        };
        return result;
    },
    async analyzeStyle(book, options = {}) {
        const result = this.results.get('style') || {
            success: true,
            analysisType: 'style',
            analysis: {
                writingStyle: 'Literary Fiction',
                narrativeVoice: 'First Person',
                literaryDevices: ['symbolism', 'metaphor'],
                proseStyle: 'Lyrical and descriptive'
            },
            tokensUsed: 130,
            cost: 0.002
        };
        return result;
    },
    async performBatchAnalysis(book, analysisTypes) {
        const analyses = {};
        for (const type of analysisTypes) {
            analyses[type] = await this[this.getMethodName(type)](book);
        }
        return {
            success: true,
            analyses,
            totalTokensUsed: 850,
            totalCost: 0.012,
            bookId: book.id
        };
    },
    getMethodName(type) {
        const methods = {
            summary: 'generateSummary',
            themes: 'extractThemes',
            characters: 'analyzeCharacters',
            difficulty: 'assessDifficulty',
            sentiment: 'analyzeSentiment',
            style: 'analyzeStyle'
        };
        return methods[type];
    }
};

const mockEventBus = {
    events: [],
    emit(event, data) {
        this.events.push({ event, data, timestamp: Date.now() });
    },
    on(event, handler) {
        // Store for later verification
    },
    clear() {
        this.events = [];
    },
    getEvents(eventName) {
        return this.events.filter(e => e.event === eventName);
    }
};

const mockLoadingStateManager = {
    loadingStates: new Map(),
    startLoading(id, options) {
        this.loadingStates.set(id, { ...options, startTime: Date.now() });
    },
    stopLoading(id) {
        this.loadingStates.delete(id);
    },
    isLoading(id) {
        return this.loadingStates.has(id);
    },
    clear() {
        this.loadingStates.clear();
    }
};

// Test Suite
describe('AIAnalysisPanel Component', () => {
    let aiAnalysisPanel;
    
    beforeEach(() => {
        // Reset all mocks
        mockModalManager.clear();
        mockEventBus.clear();
        mockLoadingStateManager.clear();
        mockBookAnalysisService.results.clear();
        
        // Create fresh instance
        aiAnalysisPanel = new AIAnalysisPanel(
            mockModalManager,
            mockBookAnalysisService,
            mockEventBus,
            mockLoadingStateManager
        );
    });

    // ✅ TEST 1: Component Initialization
    describe('Component Initialization', () => {
        it('should initialize with all required dependencies', () => {
            expect(aiAnalysisPanel.modalManager).toBe(mockModalManager);
            expect(aiAnalysisPanel.bookAnalysisService).toBe(mockBookAnalysisService);
            expect(aiAnalysisPanel.eventBus).toBe(mockEventBus);
            expect(aiAnalysisPanel.loadingStateManager).toBe(mockLoadingStateManager);
        });

        it('should have default configuration', () => {
            expect(aiAnalysisPanel.config.defaultAnalysisType).toBe('summary');
            expect(aiAnalysisPanel.config.showProgress).toBe(true);
            expect(aiAnalysisPanel.config.enableBatchAnalysis).toBe(true);
            expect(Array.isArray(aiAnalysisPanel.config.availableTypes)).toBe(true);
        });

        it('should initialize with empty state', () => {
            expect(aiAnalysisPanel.state.currentBook).toBe(null);
            expect(aiAnalysisPanel.state.activeAnalysis).toBe(null);
            expect(aiAnalysisPanel.state.results.size).toBe(0);
        });
    });

    // ✅ TEST 2: Analysis Panel Display
    describe('Analysis Panel Display', () => {
        it('should show analysis panel for a book', () => {
            const result = aiAnalysisPanel.showAnalysisPanel(mockBook);
            
            expect(result.success).toBe(true);
            expect(result.modalId).toBeDefined();
            expect(mockModalManager.getActiveModals().length).toBe(1);
            
            const modal = mockModalManager.getActiveModals()[0];
            expect(modal.config.title).toContain('AI Analysis');
            expect(modal.config.title).toContain(mockBook.title);
        });

        it('should display all available analysis types', () => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
            
            const modal = mockModalManager.getActiveModals()[0];
            const content = modal.config.content;
            
            expect(content).toContain('Summary');
            expect(content).toContain('Themes');
            expect(content).toContain('Characters');
            expect(content).toContain('Difficulty');
            expect(content).toContain('Sentiment');
            expect(content).toContain('Style');
        });

        it('should show book information in panel', () => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
            
            const modal = mockModalManager.getActiveModals()[0];
            const content = modal.config.content;
            
            expect(content).toContain(mockBook.title);
            expect(content).toContain(mockBook.authors[0]);
            expect(content).toContain(mockBook.wordCount.toString());
        });

        it('should handle books without complete metadata', () => {
            const incompleteBook = {
                id: 'incomplete',
                title: 'Untitled Book',
                content: 'Some content'
            };
            
            const result = aiAnalysisPanel.showAnalysisPanel(incompleteBook);
            
            expect(result.success).toBe(true);
            expect(mockModalManager.getActiveModals().length).toBe(1);
        });
    });

    // ✅ TEST 3: Single Analysis Execution
    describe('Single Analysis Execution', () => {
        beforeEach(() => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
        });

        it('should perform summary analysis successfully', async () => {
            const result = await aiAnalysisPanel.performAnalysis('summary');
            
            expect(result.success).toBe(true);
            expect(result.analysisType).toBe('summary');
            expect(result.analysis.summary).toContain('American Dream');
            expect(result.tokensUsed).toBeGreaterThan(0);
        });

        it('should perform themes analysis successfully', async () => {
            const result = await aiAnalysisPanel.performAnalysis('themes');
            
            expect(result.success).toBe(true);
            expect(result.analysisType).toBe('themes');
            expect(result.analysis.primaryThemes).toContain('The American Dream');
            expect(typeof result.analysis.themeAnalysis).toBe('object');
        });

        it('should perform character analysis successfully', async () => {
            const result = await aiAnalysisPanel.performAnalysis('characters');
            
            expect(result.success).toBe(true);
            expect(result.analysisType).toBe('characters');
            expect(result.analysis.mainCharacters.length).toBeGreaterThan(0);
            expect(result.analysis.mainCharacters[0].name).toBe('Jay Gatsby');
        });

        it('should handle analysis errors gracefully', async () => {
            // Mock service to return error
            mockBookAnalysisService.setMockResult('summary', {
                success: false,
                error: 'API rate limit exceeded'
            });
            
            const result = await aiAnalysisPanel.performAnalysis('summary');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('rate limit');
        });

        it('should show loading state during analysis', async () => {
            const analysisPromise = aiAnalysisPanel.performAnalysis('summary');
            
            // Check loading state is active
            expect(mockLoadingStateManager.isLoading('ai-analysis')).toBe(true);
            
            await analysisPromise;
            
            // Check loading state is cleared
            expect(mockLoadingStateManager.isLoading('ai-analysis')).toBe(false);
        });

        it('should emit progress events during analysis', async () => {
            await aiAnalysisPanel.performAnalysis('summary');
            
            const progressEvents = mockEventBus.getEvents('ai:analysisProgress');
            const startEvents = mockEventBus.getEvents('ai:analysisStarted');
            const completeEvents = mockEventBus.getEvents('ai:analysisCompleted');
            
            expect(startEvents.length).toBeGreaterThan(0);
            expect(completeEvents.length).toBeGreaterThan(0);
        });
    });

    // ✅ TEST 4: Batch Analysis
    describe('Batch Analysis', () => {
        beforeEach(() => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
        });

        it('should perform batch analysis for multiple types', async () => {
            const analysisTypes = ['summary', 'themes', 'characters'];
            const result = await aiAnalysisPanel.performBatchAnalysis(analysisTypes);
            
            expect(result.success).toBe(true);
            expect(Object.keys(result.analyses)).toHaveLength(3);
            expect(result.analyses.summary.success).toBe(true);
            expect(result.analyses.themes.success).toBe(true);
            expect(result.analyses.characters.success).toBe(true);
            expect(result.totalTokensUsed).toBeGreaterThan(0);
        });

        it('should handle partial failures in batch analysis', async () => {
            // Mock one analysis to fail
            mockBookAnalysisService.setMockResult('themes', {
                success: false,
                error: 'Analysis failed'
            });
            
            const result = await aiAnalysisPanel.performBatchAnalysis(['summary', 'themes']);
            
            expect(result.success).toBe(true);
            expect(result.analyses.summary.success).toBe(true);
            expect(result.analyses.themes.success).toBe(false);
        });

        it('should show batch progress updates', async () => {
            const progressSpy = jest.fn();
            aiAnalysisPanel.onBatchProgress = progressSpy;
            
            await aiAnalysisPanel.performBatchAnalysis(['summary', 'themes']);
            
            expect(progressSpy).toHaveBeenCalledWith(expect.objectContaining({
                current: expect.any(Number),
                total: 2,
                currentType: expect.any(String)
            }));
        });
    });

    // ✅ TEST 5: Result Display and Formatting
    describe('Result Display and Formatting', () => {
        beforeEach(() => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
        });

        it('should format summary results correctly', async () => {
            const result = await aiAnalysisPanel.performAnalysis('summary');
            const formatted = aiAnalysisPanel.formatAnalysisResult(result);
            
            expect(formatted).toContain('Summary');
            expect(formatted).toContain(result.analysis.summary);
            expect(formatted).toContain('Key Points');
        });

        it('should format themes results correctly', async () => {
            const result = await aiAnalysisPanel.performAnalysis('themes');
            const formatted = aiAnalysisPanel.formatAnalysisResult(result);
            
            expect(formatted).toContain('Primary Themes');
            expect(formatted).toContain('The American Dream');
            expect(formatted).toContain('Theme Analysis');
        });

        it('should format character results correctly', async () => {
            const result = await aiAnalysisPanel.performAnalysis('characters');
            const formatted = aiAnalysisPanel.formatAnalysisResult(result);
            
            expect(formatted).toContain('Main Characters');
            expect(formatted).toContain('Jay Gatsby');
            expect(formatted).toContain('Protagonist');
        });

        it('should display metadata and costs', async () => {
            const result = await aiAnalysisPanel.performAnalysis('summary');
            const formatted = aiAnalysisPanel.formatAnalysisResult(result);
            
            expect(formatted).toContain('Tokens Used');
            expect(formatted).toContain('Cost');
            expect(formatted).toContain('150');
        });

        it('should handle missing or incomplete results', () => {
            const incompleteResult = {
                success: true,
                analysisType: 'summary',
                analysis: {}
            };
            
            const formatted = aiAnalysisPanel.formatAnalysisResult(incompleteResult);
            
            expect(formatted).toContain('Analysis completed');
            expect(formatted).not.toContain('undefined');
        });
    });

    // ✅ TEST 6: Analysis Type Selection
    describe('Analysis Type Selection', () => {
        beforeEach(() => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
        });

        it('should allow single analysis type selection', () => {
            const result = aiAnalysisPanel.selectAnalysisType('themes');
            
            expect(result.success).toBe(true);
            expect(aiAnalysisPanel.state.selectedTypes).toContain('themes');
        });

        it('should allow multiple analysis type selection', () => {
            aiAnalysisPanel.selectAnalysisType('summary');
            aiAnalysisPanel.selectAnalysisType('themes');
            
            expect(aiAnalysisPanel.state.selectedTypes).toContain('summary');
            expect(aiAnalysisPanel.state.selectedTypes).toContain('themes');
        });

        it('should deselect analysis types', () => {
            aiAnalysisPanel.selectAnalysisType('summary');
            aiAnalysisPanel.deselectAnalysisType('summary');
            
            expect(aiAnalysisPanel.state.selectedTypes).not.toContain('summary');
        });

        it('should validate analysis type selection', () => {
            const result = aiAnalysisPanel.selectAnalysisType('invalid_type');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid analysis type');
        });

        it('should get analysis type descriptions', () => {
            const description = aiAnalysisPanel.getAnalysisTypeDescription('summary');
            
            expect(typeof description).toBe('string');
            expect(description.length).toBeGreaterThan(0);
            expect(description).toContain('summary');
        });
    });

    // ✅ TEST 7: Progress Tracking
    describe('Progress Tracking', () => {
        beforeEach(() => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
        });

        it('should track single analysis progress', async () => {
            const progressUpdates = [];
            aiAnalysisPanel.onProgress = (progress) => progressUpdates.push(progress);
            
            await aiAnalysisPanel.performAnalysis('summary');
            
            expect(progressUpdates.length).toBeGreaterThan(0);
            expect(progressUpdates[0]).toMatchObject({
                type: 'summary',
                stage: expect.any(String),
                progress: expect.any(Number)
            });
        });

        it('should track batch analysis progress', async () => {
            const progressUpdates = [];
            aiAnalysisPanel.onBatchProgress = (progress) => progressUpdates.push(progress);
            
            await aiAnalysisPanel.performBatchAnalysis(['summary', 'themes']);
            
            expect(progressUpdates.length).toBeGreaterThan(0);
            expect(progressUpdates[progressUpdates.length - 1].current).toBe(2);
        });

        it('should show progress in modal content', async () => {
            const analysisPromise = aiAnalysisPanel.performAnalysis('summary');
            
            // Check modal content shows progress
            const modal = mockModalManager.getActiveModals()[0];
            expect(modal.config.content).toContain('progress');
            
            await analysisPromise;
        });
    });

    // ✅ TEST 8: Error Handling
    describe('Error Handling', () => {
        beforeEach(() => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
        });

        it('should handle API errors gracefully', async () => {
            mockBookAnalysisService.setMockResult('summary', {
                success: false,
                error: 'OpenAI API error: Rate limit exceeded'
            });
            
            const result = await aiAnalysisPanel.performAnalysis('summary');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Rate limit exceeded');
        });

        it('should display error messages in modal', async () => {
            mockBookAnalysisService.setMockResult('summary', {
                success: false,
                error: 'Network connection failed'
            });
            
            await aiAnalysisPanel.performAnalysis('summary');
            
            const modal = mockModalManager.getActiveModals()[0];
            expect(modal.config.content).toContain('error');
            expect(modal.config.content).toContain('Network connection failed');
        });

        it('should handle missing book data', () => {
            const result = aiAnalysisPanel.showAnalysisPanel(null);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Book data is required');
        });

        it('should handle service unavailability', async () => {
            aiAnalysisPanel.bookAnalysisService = null;
            
            const result = await aiAnalysisPanel.performAnalysis('summary');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Analysis service not available');
        });
    });

    // ✅ TEST 9: Modal Integration
    describe('Modal Integration', () => {
        it('should create modal with correct configuration', () => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
            
            const modal = mockModalManager.getActiveModals()[0];
            
            expect(modal.config.title).toContain('AI Analysis');
            expect(modal.config.className).toContain('ai-analysis-modal');
            expect(modal.config.buttons.length).toBeGreaterThan(0);
        });

        it('should handle modal close events', () => {
            const modalResult = aiAnalysisPanel.showAnalysisPanel(mockBook);
            
            modalResult.close();
            
            expect(aiAnalysisPanel.state.currentBook).toBe(null);
            expect(aiAnalysisPanel.state.activeAnalysis).toBe(null);
        });

        it('should update modal content during analysis', async () => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
            
            await aiAnalysisPanel.performAnalysis('summary');
            
            const modal = mockModalManager.getActiveModals()[0];
            expect(modal.config.content).toContain('Analysis completed');
        });

        it('should provide modal action handlers', () => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
            
            const modal = mockModalManager.getActiveModals()[0];
            
            expect(typeof modal.config.onAction).toBe('function');
        });
    });

    // ✅ TEST 10: State Management
    describe('State Management', () => {
        it('should maintain analysis results state', async () => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
            
            const result = await aiAnalysisPanel.performAnalysis('summary');
            
            expect(aiAnalysisPanel.state.results.has('summary')).toBe(true);
            expect(aiAnalysisPanel.state.results.get('summary')).toBe(result);
        });

        it('should clear state when starting new analysis', () => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
            
            // Add some state
            aiAnalysisPanel.state.results.set('summary', { test: 'data' });
            
            // Show panel for different book
            const newBook = { ...mockBook, id: 'different-book' };
            aiAnalysisPanel.showAnalysisPanel(newBook);
            
            expect(aiAnalysisPanel.state.results.size).toBe(0);
            expect(aiAnalysisPanel.state.currentBook.id).toBe('different-book');
        });

        it('should track active analysis state', async () => {
            aiAnalysisPanel.showAnalysisPanel(mockBook);
            
            const analysisPromise = aiAnalysisPanel.performAnalysis('summary');
            
            expect(aiAnalysisPanel.state.activeAnalysis).toBe('summary');
            
            await analysisPromise;
            
            expect(aiAnalysisPanel.state.activeAnalysis).toBe(null);
        });
    });
});

// ✅ Integration Tests
describe('AIAnalysisPanel Integration Tests', () => {
    let aiAnalysisPanel;
    
    beforeEach(() => {
        mockModalManager.clear();
        mockEventBus.clear();
        mockLoadingStateManager.clear();
        
        aiAnalysisPanel = new AIAnalysisPanel(
            mockModalManager,
            mockBookAnalysisService,
            mockEventBus,
            mockLoadingStateManager
        );
    });

    it('should complete full analysis workflow', async () => {
        // Show panel
        const panelResult = aiAnalysisPanel.showAnalysisPanel(mockBook);
        expect(panelResult.success).toBe(true);
        
        // Perform analysis
        const analysisResult = await aiAnalysisPanel.performAnalysis('summary');
        expect(analysisResult.success).toBe(true);
        
        // Verify state updates
        expect(aiAnalysisPanel.state.results.has('summary')).toBe(true);
        
        // Verify events emitted
        const startEvents = mockEventBus.getEvents('ai:analysisStarted');
        const completeEvents = mockEventBus.getEvents('ai:analysisCompleted');
        expect(startEvents.length).toBe(1);
        expect(completeEvents.length).toBe(1);
    });

    it('should handle concurrent analyses', async () => {
        aiAnalysisPanel.showAnalysisPanel(mockBook);
        
        const promises = [
            aiAnalysisPanel.performAnalysis('summary'),
            aiAnalysisPanel.performAnalysis('themes')
        ];
        
        const results = await Promise.all(promises);
        
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(true);
        expect(aiAnalysisPanel.state.results.size).toBe(2);
    });

    it('should save and restore analysis results', async () => {
        aiAnalysisPanel.showAnalysisPanel(mockBook);
        
        await aiAnalysisPanel.performAnalysis('summary');
        await aiAnalysisPanel.performAnalysis('themes');
        
        const savedResults = aiAnalysisPanel.exportResults();
        
        // Clear and restore
        aiAnalysisPanel.clearResults();
        expect(aiAnalysisPanel.state.results.size).toBe(0);
        
        aiAnalysisPanel.importResults(savedResults);
        expect(aiAnalysisPanel.state.results.size).toBe(2);
    });
});

console.log('📋 AIAnalysisPanel TDD Test Suite Complete');
console.log('✅ Ready for component implementation');
console.log('🎯 Tests cover: Display, Analysis, Results, State, Modals, Errors');