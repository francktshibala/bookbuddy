/**
 * Development Configuration for Book Buddy
 * Copy this file to dev-config.js and add your actual API keys
 * This file is excluded from git for security
 */

// 🔧 Development Configuration (NOT COMMITTED TO GIT)
window.DEV_CONFIG = {
    // OpenAI API Key for development
    OPENAI_API_KEY: 'sk-your-actual-openai-api-key-here',
    
    // Google Books API Key (optional)
    GOOGLE_BOOKS_API_KEY: 'your-google-books-api-key-here',
    
    // Development flags
    DEBUG_MODE: true,
    ENABLE_CONSOLE_LOGS: true,
    ENABLE_API_MOCKING: false,
    
    // Test settings
    ENABLE_TEST_DATA: true,
    MOCK_AI_RESPONSES: false,
    
    // Performance settings
    API_TIMEOUT: 15000,
    MAX_RETRIES: 2,
    
    // Cost limits for development
    MAX_COST_PER_REQUEST: 0.10,
    MAX_COST_PER_HOUR: 2.00,
    MAX_COST_PER_DAY: 10.00
};

console.log('🔧 Development configuration loaded');

/**
 * SETUP INSTRUCTIONS:
 * 
 * 1. Copy this file to: dev-config.js
 * 2. Add your real API keys above
 * 3. Include in your HTML before app.js:
 *    <script src="js/config/dev-config.js"></script>
 * 4. dev-config.js is automatically ignored by git
 */