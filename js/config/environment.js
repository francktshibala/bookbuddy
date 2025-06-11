/**
 * Environment Configuration for Book Buddy
 * Handles environment variables and API key management
 */

// 🔧 Environment Configuration Module
class EnvironmentConfig {
    constructor() {
        this.environment = this.detectEnvironment();
        this.config = this.loadConfiguration();
        
        console.log(`🌍 Environment detected: ${this.environment}`);
    }

    /**
     * Detect current environment
     */
    detectEnvironment() {
        // Development indicators
        const isDevelopment = 
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.port !== '' ||
            window.location.protocol === 'file:' ||
            window.location.search.includes('dev=true');

        // GitHub Pages indicators
        const isGitHubPages = 
            window.location.hostname.includes('.github.io') ||
            window.location.hostname.includes('pages.github.com');

        // Production indicators
        const isProduction = 
            !isDevelopment && 
            (window.location.protocol === 'https:' || isGitHubPages);

        if (isDevelopment) return 'development';
        if (isGitHubPages) return 'github-pages';
        if (isProduction) return 'production';
        
        return 'unknown';
    }

    /**
     * Load environment-specific configuration
     */
    loadConfiguration() {
        const baseConfig = {
            appName: 'Book Buddy',
            version: '1.0.0',
            features: {
                aiAnalysis: true,
                onlineSearch: true,
                exportImport: true,
                analytics: true
            }
        };

        const envConfigs = {
            development: {
                ...baseConfig,
                debug: true,
                apiTimeout: 15000,
                maxRetries: 2,
                enableMocking: true,
                enableTestData: true,
                logLevel: 'debug'
            },
            production: {
                ...baseConfig,
                debug: false,
                apiTimeout: 30000,
                maxRetries: 3,
                enableMocking: false,
                enableTestData: false,
                logLevel: 'info'
            },
            'github-pages': {
                ...baseConfig,
                debug: false,
                apiTimeout: 30000,
                maxRetries: 3,
                enableMocking: false,
                enableTestData: false,
                logLevel: 'info'
            }
        };

        return envConfigs[this.environment] || envConfigs.production;
    }

    /**
     * Get OpenAI API Key from multiple sources
     */
    getOpenAIKey() {
        // Priority order for API key sources:
        
        // 1. Environment variable (for development with build tools)
        if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY) {
            console.log('🔑 Using OpenAI key from environment variable');
            return process.env.OPENAI_API_KEY;
        }

        // 2. Window environment (for runtime injection)
        if (typeof window !== 'undefined' && window.OPENAI_API_KEY) {
            console.log('🔑 Using OpenAI key from window environment');
            return window.OPENAI_API_KEY;
        }

        // 3. User settings in localStorage
        const savedKey = localStorage.getItem('book-buddy-openai-key');
        if (savedKey && savedKey.trim().length > 0) {
            console.log('🔑 Using OpenAI key from user settings');
            return savedKey;
        }

        // 4. Development fallback (for local testing)
        if (this.environment === 'development') {
            const devKey = this.getDevelopmentKey();
            if (devKey) {
                console.log('🔑 Using development fallback key');
                return devKey;
            }
        }

        // 5. No key available
        console.warn('⚠️ No OpenAI API key configured');
        return null;
    }

    /**
     * Get development key from secure local sources
     */
    getDevelopmentKey() {
        // Check for development config file (not committed)
        if (typeof window !== 'undefined' && window.DEV_CONFIG?.OPENAI_API_KEY) {
            return window.DEV_CONFIG.OPENAI_API_KEY;
        }

        // Check for development placeholder
        const placeholder = 'sk-development-key-placeholder';
        return placeholder;
    }

    /**
     * Validate API key format
     */
    validateAPIKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return { valid: false, message: 'API key is required' };
        }

        if (apiKey.length < 20) {
            return { valid: false, message: 'API key is too short' };
        }

        if (!apiKey.startsWith('sk-')) {
            return { valid: false, message: 'API key must start with "sk-"' };
        }

        if (apiKey === 'sk-development-key-placeholder') {
            return { 
                valid: false, 
                message: 'Development placeholder - add real API key',
                isDevelopmentPlaceholder: true
            };
        }

        return { valid: true, message: 'API key format is valid' };
    }

    /**
     * Get environment-specific configuration
     */
    getConfig(key = null) {
        if (key) {
            return this.config[key];
        }
        return { ...this.config };
    }

    /**
     * Get current environment info
     */
    getEnvironmentInfo() {
        return {
            environment: this.environment,
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            port: window.location.port,
            debug: this.config.debug,
            features: this.config.features
        };
    }

    /**
     * Set API key at runtime (for user input)
     */
    setUserAPIKey(apiKey) {
        const validation = this.validateAPIKey(apiKey);
        
        if (!validation.valid) {
            return {
                success: false,
                message: validation.message,
                isDevelopmentPlaceholder: validation.isDevelopmentPlaceholder
            };
        }

        // Save to localStorage
        localStorage.setItem('book-buddy-openai-key', apiKey);
        
        console.log('✅ OpenAI API key saved to user settings');
        
        return {
            success: true,
            message: 'API key saved successfully'
        };
    }

    /**
     * Remove user API key
     */
    clearUserAPIKey() {
        localStorage.removeItem('book-buddy-openai-key');
        console.log('🗑️ User API key cleared');
        
        return {
            success: true,
            message: 'API key cleared successfully'
        };
    }

    /**
     * Get API key status for UI
     */
    getAPIKeyStatus() {
        const apiKey = this.getOpenAIKey();
        const validation = this.validateAPIKey(apiKey);
        
        const status = {
            hasKey: !!apiKey,
            isValid: validation.valid,
            message: validation.message,
            source: this.getKeySource(apiKey),
            environment: this.environment,
            isDevelopmentPlaceholder: validation.isDevelopmentPlaceholder || false
        };

        if (apiKey && validation.valid) {
            status.keyPreview = apiKey.substring(0, 7) + '...' + apiKey.slice(-4);
        }

        return status;
    }

    /**
     * Determine the source of the API key
     */
    getKeySource(apiKey) {
        if (!apiKey) return 'none';
        
        if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY === apiKey) {
            return 'environment';
        }
        
        if (typeof window !== 'undefined' && window.OPENAI_API_KEY === apiKey) {
            return 'window';
        }
        
        if (localStorage.getItem('book-buddy-openai-key') === apiKey) {
            return 'user-settings';
        }
        
        if (apiKey === 'sk-development-key-placeholder') {
            return 'development-placeholder';
        }
        
        return 'unknown';
    }

    /**
     * Test API key by making a minimal request
     */
    async testAPIKey(apiKey = null) {
        const keyToTest = apiKey || this.getOpenAIKey();
        const validation = this.validateAPIKey(keyToTest);
        
        if (!validation.valid) {
            return {
                success: false,
                message: validation.message,
                isDevelopmentPlaceholder: validation.isDevelopmentPlaceholder
            };
        }

        try {
            // Make a minimal test request
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${keyToTest}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    message: 'API key is valid and working',
                    modelCount: data.data?.length || 0
                };
            } else {
                return {
                    success: false,
                    message: `API key test failed: ${response.status} ${response.statusText}`
                };
            }

        } catch (error) {
            return {
                success: false,
                message: `API key test error: ${error.message}`
            };
        }
    }

    /**
     * Get deployment configuration
     */
    getDeploymentConfig() {
        return {
            environment: this.environment,
            buildTime: new Date().toISOString(),
            features: this.config.features,
            apiKeyRequired: true,
            apiKeySource: this.getKeySource(this.getOpenAIKey()),
            setupInstructions: this.getSetupInstructions()
        };
    }

    /**
     * Get setup instructions based on environment
     */
    getSetupInstructions() {
        const instructions = {
            development: [
                'Create a .env file in your project root',
                'Add: OPENAI_API_KEY=your_api_key_here',
                'Restart your development server',
                'Or use the Settings UI to add your key'
            ],
            production: [
                'Go to Settings in the app',
                'Enter your OpenAI API key',
                'Your key is stored locally and never shared',
                'Get your key from: https://platform.openai.com/api-keys'
            ],
            'github-pages': [
                'Go to Settings in the app',
                'Enter your OpenAI API key',
                'Your key is stored locally and never shared',
                'Get your key from: https://platform.openai.com/api-keys'
            ]
        };

        return instructions[this.environment] || instructions.production;
    }
}

// Create singleton instance
const environmentConfig = new EnvironmentConfig();

// Export for ES6 modules
export default environmentConfig;

// Export class for advanced usage
export { EnvironmentConfig };

// Global access for non-module usage
if (typeof window !== 'undefined') {
    window.EnvironmentConfig = EnvironmentConfig;
    window.environmentConfig = environmentConfig;
}

/**
 * USAGE EXAMPLES:
 * 
 * // Get API key
 * const apiKey = environmentConfig.getOpenAIKey();
 * 
 * // Check API key status
 * const status = environmentConfig.getAPIKeyStatus();
 * 
 * // Set user API key
 * const result = environmentConfig.setUserAPIKey('sk-your-key-here');
 * 
 * // Test API key
 * const testResult = await environmentConfig.testAPIKey();
 * 
 * // Get environment config
 * const config = environmentConfig.getConfig();
 * 
 * // Get setup instructions
 * const instructions = environmentConfig.getSetupInstructions();
 */