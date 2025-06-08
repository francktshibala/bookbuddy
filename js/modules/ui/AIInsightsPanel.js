import { eventBus, EVENTS } from '../../utils/EventBus.js';

export default class AIInsightsPanel {
    constructor() {
        this.currentAnalysis = null;
        this.setupEventListeners();
        console.log('🤖 AIInsightsPanel initialized');
    }

    setupEventListeners() {
        eventBus.on('ai:prompt:generated', (data) => {
            this.handlePromptGenerated(data);
        });

        eventBus.on('ai:analysis:completed', (data) => {
            this.displayAnalysis(data);
        });

        eventBus.on('ai:prompt:error', (data) => {
            this.handleAnalysisError(data);
        });
    }

    handlePromptGenerated(data) {
        if (data.success) {
            console.log('🤖 AI prompt generated successfully');
            
            // For now, just display the prompt
            // Later this will be sent to OpenAI
            this.displayPrompt(data);
            
            // Hide loading state
            eventBus.emit(EVENTS.LOADING_STATE_CHANGED, {
                isLoading: false
            });
        } else {
            this.handleAnalysisError(data);
        }
    }

    displayPrompt(data) {
        // Create modal to show the generated prompt
        const modalContent = `
            <div class="ai-prompt-display">
                <h4>🤖 Generated AI Analysis Prompt</h4>
                <div class="book-info">
                    <strong>Book:</strong> ${data.bookData.title} by ${data.bookData.author}
                </div>
                <div class="analysis-type">
                    <strong>Analysis Type:</strong> ${data.category}/${data.name}
                </div>
                <div class="prompt-content">
                    <h5>Prompt:</h5>
                    <pre class="prompt-text">${data.prompt}</pre>
                </div>
                <div class="ai-note">
                    <small><em>📝 Note: This prompt will be sent to OpenAI when the AI service is connected.</em></small>
                </div>
            </div>
        `;

        eventBus.emit(EVENTS.MODAL_SHOW, {
            title: 'AI Analysis Prompt Generated',
            content: modalContent,
            size: 'large'
        });
    }

    handleAnalysisError(data) {
        console.error('❌ AI analysis error:', data.error);
        
        eventBus.emit(EVENTS.LOADING_STATE_CHANGED, {
            isLoading: false
        });

        eventBus.emit(EVENTS.ERROR_OCCURRED, {
            message: 'AI analysis failed',
            error: data.error
        });
    }

    displayAnalysis(analysisData) {
        // This will be implemented when we add OpenAI integration
        console.log('📊 AI analysis completed:', analysisData);
    }
}