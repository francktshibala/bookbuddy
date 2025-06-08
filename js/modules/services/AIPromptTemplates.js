/**
 * AIPromptTemplates.js - AI Prompt Template Management Service
 * Part of Book Buddy - Component 11: AI-Powered Book Analysis
 * 
 * Manages AI prompt templates for book analysis, theme extraction, 
 * difficulty assessment, and other AI-powered features.
 * 
 * @author Book Buddy Development Team
 * @version 1.0.0
 */

import { eventBus, EVENTS } from '../../utils/EventBus.js';

/**
 * AIPromptTemplates - Template management service for AI prompts
 * Follows Book Buddy's established service patterns
 */
export default class AIPromptTemplates {
    constructor(options = {}) {
        this.options = {
            cacheEnabled: true,
            maxCacheSize: 100,
            validateSecurity: true,
            ...options
        };

        // Template storage
        this.templates = new Map();
        this.cache = new Map();
        this.stats = {
            templatesLoaded: 0,
            promptsGenerated: 0,
            cacheHits: 0,
            cacheMisses: 0
        };

        // Performance tracking
        this.compiledTemplates = new Map();
        this.templateVersions = new Map();

        this.initializeDefaultTemplates();
        this.setupEventListeners();

        console.log('🤖 AIPromptTemplates service initialized');
    }

    /**
     * Initialize default templates for book analysis
     */
    initializeDefaultTemplates() {
        const defaultTemplates = this.createDefaultTemplates();
        
        Object.entries(defaultTemplates).forEach(([category, templates]) => {
            Object.entries(templates).forEach(([name, template]) => {
                this.registerTemplate({
                    ...template,
                    category,
                    name,
                    isDefault: true
                });
            });
        });

        this.stats.templatesLoaded = this.templates.size;
        console.log(`📚 Loaded ${this.stats.templatesLoaded} default templates`);
    }

    /**
     * Create comprehensive default template library
     */
    createDefaultTemplates() {
        return {
            analysis: {
                summary: {
                    description: 'Generate comprehensive book summary',
                    template: `Analyze the book "{title}" by {author}.

{?genre}This is a {genre} book. {/genre}Provide a {length} summary that covers:

1. Main plot or central concepts
2. Key characters (if fiction) or main topics (if non-fiction)  
3. Setting and context
4. Major themes and messages
5. Writing style and tone

{?contentPreview}Based on this excerpt: "{contentPreview}"{/contentPreview}

{?targetAudience}Tailor for: {targetAudience}{/targetAudience}
{?includeQuotes}Include 1-2 representative quotes.{/includeQuotes}

Word count: approximately {wordCount} words.
Format: {outputFormat}`,
                    variables: ['title', 'author', 'genre', 'length', 'contentPreview', 'targetAudience', 'includeQuotes', 'wordCount', 'outputFormat'],
                    defaultValues: {
                        length: 'comprehensive',
                        outputFormat: 'structured paragraphs',
                        wordCount: 50000
                    }
                },

                themes: {
                    description: 'Extract and analyze major themes',
                    template: `Identify and analyze the major themes in "{title}" by {author}.

{?genre}Genre context: {genre}{/genre}

Please analyze:
1. Primary themes (3-5 main themes)
2. How themes are developed throughout the book
3. Literary devices used to convey themes
4. Connections between themes
5. Cultural/historical context of themes

{?contentSample}Base analysis on: "{contentSample}"{/contentSample}

Provide examples and evidence for each theme identified.
{?analysisDepth}Analysis level: {analysisDepth}{/analysisDepth}`,
                    variables: ['title', 'author', 'genre', 'contentSample', 'analysisDepth'],
                    defaultValues: {
                        analysisDepth: 'detailed'
                    }
                },

                characters: {
                    description: 'Analyze character development and relationships',
                    template: `Analyze the characters in "{title}" by {author}.

Focus on:
1. Main characters - development, motivations, conflicts
2. Supporting characters - roles and significance  
3. Character relationships and dynamics
4. Character arcs and growth throughout the story
5. How characters serve the themes

{?genre}Consider {genre} genre conventions.{/genre}
{?characterFocus}Pay special attention to: {characterFocus}{/characterFocus}

Provide specific examples of character development with page references where possible.`,
                    variables: ['title', 'author', 'genre', 'characterFocus'],
                    defaultValues: {}
                },

                difficulty: {
                    description: 'Assess reading difficulty and complexity',
                    template: `Assess the reading difficulty of "{title}" by {author}.

Evaluate:
1. Vocabulary complexity and technical terms
2. Sentence structure and length
3. Concept difficulty and abstract thinking required
4. Background knowledge needed
5. Recommended reading level and age group

{?wordCount}Book length: {wordCount} words{/wordCount}
{?genre}Genre: {genre}{/genre}
{?targetAudience}Intended for: {targetAudience}{/targetAudience}

Provide:
- Flesch-Kincaid grade level estimate
- Recommended age range
- Prerequisites or background knowledge needed
- Strategies for different reading levels`,
                    variables: ['title', 'author', 'wordCount', 'genre', 'targetAudience'],
                    defaultValues: {}
                },

                sentiment: {
                    description: 'Analyze emotional tone and mood',
                    template: `Analyze the emotional tone and sentiment of "{title}" by {author}.

Examine:
1. Overall emotional tone (positive, negative, neutral, mixed)
2. Mood progression throughout the book
3. Emotional impact on readers
4. Author's attitude toward subjects/characters
5. Techniques used to create emotional responses

{?contentSample}Based on: "{contentSample}"{/contentSample}

Consider both explicit emotional content and subtle undertones.
Rate overall sentiment on a scale and explain the reasoning.`,
                    variables: ['title', 'author', 'contentSample'],
                    defaultValues: {}
                }
            },

            enhancement: {
                grammar: {
                    description: 'Analyze and suggest grammar improvements',
                    template: `Review the writing quality and grammar in "{title}" by {author}.

Focus on:
1. Grammar accuracy and consistency
2. Sentence structure variety
3. Punctuation usage
4. Style consistency
5. Clarity and readability

{?contentSample}Sample text: "{contentSample}"{/contentSample}

Provide constructive feedback and specific improvement suggestions.`,
                    variables: ['title', 'author', 'contentSample'],
                    defaultValues: {}
                },

                style: {
                    description: 'Analyze writing style and voice',
                    template: `Analyze the writing style and voice in "{title}" by {author}.

Examine:
1. Narrative voice and perspective
2. Prose style and rhythm
3. Use of literary devices
4. Dialogue quality (if applicable)
5. Distinctive stylistic features

{?genre}Genre context: {genre}{/genre}
Compare to other works in the same genre where relevant.`,
                    variables: ['title', 'author', 'genre'],
                    defaultValues: {}
                }
            },

            generation: {
                outline: {
                    description: 'Generate detailed book outline',
                    template: `Create a detailed outline for "{title}" by {author}.

Structure:
1. Chapter-by-chapter breakdown
2. Key plot points or topic progression
3. Character introductions and development
4. Thematic elements
5. Climax and resolution structure

{?chapters}Number of chapters: {chapters}{/chapters}
{?genre}Genre: {genre}{/genre}

Format as a hierarchical outline with main points and sub-points.`,
                    variables: ['title', 'author', 'chapters', 'genre'],
                    defaultValues: {}
                },

                questions: {
                    description: 'Generate discussion questions',
                    template: `Create thoughtful discussion questions for "{title}" by {author}.

Generate {questionCount} questions covering:
1. Plot comprehension and analysis
2. Character motivations and development
3. Themes and deeper meanings
4. Historical/cultural context
5. Personal connections and opinions

{?targetAudience}Appropriate for: {targetAudience}{/targetAudience}
{?discussionFormat}Format: {discussionFormat}{/discussionFormat}

Make questions thought-provoking and suitable for group discussion.`,
                    variables: ['title', 'author', 'questionCount', 'targetAudience', 'discussionFormat'],
                    defaultValues: {
                        questionCount: '10-12',
                        discussionFormat: 'book club discussion'
                    }
                }
            },

            evaluation: {
                rating: {
                    description: 'Provide comprehensive book rating',
                    template: `Provide a comprehensive evaluation and rating for "{title}" by {author}.

Rate on a scale of 1-10 and evaluate:
1. Plot/Content quality
2. Character development (if applicable)
3. Writing style and prose
4. Originality and creativity
5. Overall impact and value

{?genre}Consider {genre} genre standards.{/genre}
{?comparisonBooks}Compare to: {comparisonBooks}{/comparisonBooks}

Provide detailed reasoning for each rating and an overall assessment.
Include both strengths and areas for improvement.`,
                    variables: ['title', 'author', 'genre', 'comparisonBooks'],
                    defaultValues: {}
                },

                recommendation: {
                    description: 'Generate personalized recommendations',
                    template: `Based on "{title}" by {author}, provide reading recommendations.

Consider readers who enjoyed this book would also like:
1. Similar themes and topics
2. Comparable writing styles  
3. Related genres and sub-genres
4. Same time period or setting
5. Authors with similar approaches

{?userPreferences}Reader preferences: {userPreferences}{/userPreferences}
{?readingHistory}Previous books enjoyed: {readingHistory}{/readingHistory}

Provide 5-8 specific recommendations with brief explanations of why each book would appeal to fans of this title.`,
                    variables: ['title', 'author', 'userPreferences', 'readingHistory'],
                    defaultValues: {}
                }
            }
        };
    }

    /**
     * Set up EventBus listeners for integration with Book Buddy
     */
    setupEventListeners() {
        eventBus.on(EVENTS.BOOK_ADDED, (data) => {
            this.handleBookAdded(data.book);
        });

        eventBus.on('ai:analysis:requested', (data) => {
            this.handleAnalysisRequest(data);
        });

        eventBus.on('template:refresh:requested', () => {
            this.clearCache();
            eventBus.emit('template:cache:cleared');
        });
    }

    /**
     * Handle new book added - prepare for potential analysis
     */
    handleBookAdded(book) {
        console.log(`📖 Book added, templates ready for analysis: ${book.title}`);
        
        // Pre-compile frequently used templates for this book
        this.precompileTemplatesForBook(book);
    }

    /**
     * Handle analysis request from other components
     */
    handleAnalysisRequest(data) {
        const { category, name, bookData, options } = data;
        
        try {
            const prompt = this.generatePrompt(category, name, bookData, options);
            eventBus.emit('ai:prompt:generated', {
                category,
                name,
                prompt,
                bookData,
                success: true
            });
        } catch (error) {
            console.error('❌ Error generating prompt:', error);
            eventBus.emit('ai:prompt:error', {
                category,
                name,
                error: error.message,
                success: false
            });
        }
    }

    /**
     * Pre-compile templates for faster generation
     */
    precompileTemplatesForBook(book) {
        const commonTemplates = [
            ['analysis', 'summary'],
            ['analysis', 'themes'],
            ['analysis', 'difficulty']
        ];

        commonTemplates.forEach(([category, name]) => {
            const template = this.getTemplate(category, name);
            if (template) {
                this.compileTemplate(template);
            }
        });
    }

    /**
     * Register a new template
     */
    registerTemplate(template) {
        try {
            const validation = this.validateTemplate(template);
            if (!validation.valid) {
                return {
                    success: false,
                    error: 'Template validation failed',
                    details: validation.errors
                };
            }

            const key = `${template.category}:${template.name}`;
            this.templates.set(key, {
                ...template,
                registeredAt: new Date(),
                version: template.version || '1.0'
            });

            // Clear related cache entries
            this.clearCacheForTemplate(template.category, template.name);

            console.log(`✅ Template registered: ${key}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Error registering template:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get template by category and name
     */
    getTemplate(category, name) {
        const key = `${category}:${name}`;
        return this.templates.get(key) || null;
    }

    /**
     * List templates in a category
     */
    listTemplates(category) {
        const templates = [];
        for (const [key, template] of this.templates) {
            if (template.category === category) {
                templates.push(template.name);
            }
        }
        return templates;
    }

    /**
     * Remove a template
     */
    removeTemplate(category, name) {
        const key = `${category}:${name}`;
        const existed = this.templates.has(key);
        
        if (existed) {
            this.templates.delete(key);
            this.clearCacheForTemplate(category, name);
            console.log(`🗑️ Template removed: ${key}`);
        }

        return { success: existed };
    }

    /**
     * Generate prompt from template
     */
    generatePrompt(category, name, bookData, options = {}) {
        if (!bookData) {
            throw new Error('Book data is required for prompt generation');
        }

        const cacheKey = this.getCacheKey(category, name, bookData, options);
        
        // Check cache first
        if (this.options.cacheEnabled && this.cache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.cache.get(cacheKey);
        }

        this.stats.cacheMisses++;
        
        const template = this.getTemplate(category, name);
        if (!template) {
            throw new Error(`Template not found: ${category}/${name}`);
        }

        try {
            // Prepare variables for substitution
            const variables = this.prepareVariables(bookData, options);
            
            // Generate the prompt
            const prompt = this.substituteVariables(
                template.template, 
                variables, 
                template.defaultValues || {}
            );

            const result = this.postProcessPrompt(prompt, options);

            // Cache the result
            if (this.options.cacheEnabled) {
                this.cacheResult(cacheKey, result);
            }

            this.stats.promptsGenerated++;
            
            console.log(`🤖 Generated prompt: ${category}/${name}`);
            return result;

        } catch (error) {
            console.error(`❌ Error generating prompt ${category}/${name}:`, error);
            throw error;
        }
    }

    /**
     * Generate custom prompt with user preferences
     */
    generateCustomPrompt(category, name, bookData, userPrefs = {}) {
        const baseOptions = {
            analysisDepth: userPrefs.analysisDepth || 'standard',
            outputFormat: userPrefs.outputFormat || 'structured paragraphs',
            includeQuotes: userPrefs.includeQuotes || false,
            targetAudience: userPrefs.targetAudience || 'general readers',
            focusAreas: userPrefs.focusAreas || []
        };

        return this.generatePrompt(category, name, bookData, baseOptions);
    }

    /**
     * Prepare variables from book data and options
     */
    prepareVariables(bookData, options) {
        const variables = {
            // Book data
            title: bookData.title || 'Unknown Title',
            author: bookData.author || 'Unknown Author',
            genre: bookData.genre || 'Unknown',
            wordCount: bookData.wordCount || 0,
            chapters: bookData.chapters || 'Unknown',
            
            // Content samples
            content: bookData.content || '',
            contentPreview: bookData.content ? bookData.content.substring(0, 1000) : '',
            contentSample: bookData.content ? bookData.content.substring(0, 2000) : '',
            
            // Options
            ...options
        };

        // Add computed variables
        if (variables.wordCount > 0) {
            variables.estimatedReadingTime = Math.ceil(variables.wordCount / 250) + ' minutes';
        }

        return variables;
    }

    /**
     * Substitute variables in template
     */
    substituteVariables(template, variables, defaults = {}) {
        let result = template;
        const allVars = { ...defaults, ...variables };

        // Handle conditional blocks {?var}content{/var}
        result = result.replace(/{?\?(\w+)}(.*?){\/\1}/gs, (match, varName, content) => {
            const value = allVars[varName];
            return (value !== undefined && value !== null && value !== '') ? content : '';
        });

        // Handle regular variables {var}
        result = result.replace(/{(\w+)}/g, (match, varName) => {
            const value = allVars[varName];
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    return value.join(', ');
                }
                if (value instanceof Date) {
                    return value.toISOString().split('T')[0];
                }
                return String(value);
            }
            return match; // Leave unreplaced if not found
        });

        return result;
    }

    /**
     * Validate template structure and content
     */
    validateTemplate(template) {
        const errors = [];

        // Required fields
        if (!template.name) errors.push('Template name is required');
        if (!template.category) errors.push('Template category is required');
        if (!template.template) errors.push('Template content is required');

        // Template size limits
        if (template.template && template.template.length > 50000) {
            errors.push('Template content exceeds maximum size (50KB)');
        }

        // Variable consistency
        if (template.template && template.variables) {
            const templateVars = this.extractVariables(template.template);
            templateVars.forEach(varName => {
                if (!template.variables.includes(varName)) {
                    errors.push(`Variable '${varName}' used in template but not declared`);
                }
            });
        }

        // Security validation
        if (this.options.validateSecurity) {
            const securityIssues = this.validateTemplateSecurity(template);
            if (!securityIssues.safe) {
                errors.push(...securityIssues.risks);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Extract variables from template content
     */
    extractVariables(template) {
        const variables = new Set();
        
        // Regular variables {var}
        const regularMatches = template.match(/{(\w+)}/g) || [];
        regularMatches.forEach(match => {
            const varName = match.slice(1, -1);
            variables.add(varName);
        });

        // Conditional variables {?var}
        const conditionalMatches = template.match(/{?\?(\w+)}/g) || [];
        conditionalMatches.forEach(match => {
            const varName = match.includes('?') ? match.slice(2, -1) : match.slice(1, -1);
            variables.add(varName);
        });

        return Array.from(variables);
    }

    /**
     * Validate template security
     */
    validateTemplateSecurity(template) {
        const risks = [];
        const content = template.template.toLowerCase();

        // Check for potential prompt injection patterns
        const dangerousPatterns = [
            'ignore previous instructions',
            'ignore the above',
            'disregard',
            'forget everything',
            'new instructions',
            'system:',
            'sudo',
            'rm -rf',
            '<script',
            'javascript:',
            'eval(',
            'function('
        ];

        dangerousPatterns.forEach(pattern => {
            if (content.includes(pattern)) {
                risks.push(`Potential security risk: contains '${pattern}'`);
            }
        });

        return {
            safe: risks.length === 0,
            risks
        };
    }

    /**
     * Post-process generated prompt
     */
    postProcessPrompt(prompt, options = {}) {
        let result = prompt;

        // Clean up extra whitespace
        result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
        result = result.trim();

        // Apply formatting options
        if (options.outputFormat === 'json') {
            result = this.addJsonInstructions(result, options);
        } else if (options.outputFormat === 'bullet points') {
            result += '\n\nFormat your response as clear bullet points.';
        }

        // Add token optimization if needed
        if (options.maxTokens) {
            result = this.optimizeForTokenLimit(result, options.maxTokens);
        }

        return result;
    }

    /**
     * Add JSON formatting instructions
     */
    addJsonInstructions(prompt, options) {
        const jsonInstructions = '\n\nRespond in valid JSON format with the following structure:';
        
        if (options.schema) {
            return prompt + jsonInstructions + '\n' + JSON.stringify(options.schema, null, 2);
        }
        
        return prompt + jsonInstructions + '\n{"analysis": "your analysis here", "confidence": 0.95}';
    }

    /**
     * Optimize prompt for token limits
     */
    optimizeForTokenLimit(prompt, maxTokens) {
        const estimatedTokens = this.estimateTokens(prompt);
        
        if (estimatedTokens <= maxTokens) {
            return prompt;
        }

        // Truncate and add continuation instruction
        const maxLength = Math.floor(maxTokens * 3.5); // Rough char to token ratio
        const truncated = prompt.substring(0, maxLength);
        const lastSentence = truncated.lastIndexOf('.');
        
        if (lastSentence > maxLength * 0.8) {
            return truncated.substring(0, lastSentence + 1) + '\n\n[Continue analysis within token limit]';
        }
        
        return truncated + '...\n\n[Continue analysis within token limit]';
    }

    /**
     * Estimate token count for text
     */
    estimateTokens(text) {
        // Rough estimation: ~4 characters per token for English text
        return Math.ceil(text.length / 4);
    }

    /**
     * Compile template for faster execution
     */
    compileTemplate(template) {
        const key = `${template.category}:${template.name}`;
        
        if (this.compiledTemplates.has(key)) {
            return this.compiledTemplates.get(key);
        }

        const compiled = {
            ...template,
            variables: this.extractVariables(template.template),
            compiledAt: new Date(),
            hasConditionals: template.template.includes('{?'),
            estimatedComplexity: this.calculateTemplateComplexity(template)
        };

        this.compiledTemplates.set(key, compiled);
        return compiled;
    }

    /**
     * Calculate template complexity score
     */
    calculateTemplateComplexity(template) {
        let score = 0;
        
        score += template.template.length / 1000; // Base complexity from length
        score += (template.template.match(/{/g) || []).length * 0.1; // Variable complexity
        score += (template.template.match(/{?\?/g) || []).length * 0.2; // Conditional complexity
        
        return Math.min(score, 10); // Cap at 10
    }

    /**
     * Generate cache key for prompt
     */
    getCacheKey(category, name, bookData, options) {
        const keyData = {
            category,
            name,
            title: bookData.title,
            author: bookData.author,
            contentHash: this.hashString((bookData.content || '').substring(0, 100)),
            options: Object.keys(options).sort().reduce((obj, key) => {
                obj[key] = options[key];
                return obj;
            }, {})
        };
        
        return this.hashString(JSON.stringify(keyData));
    }

    /**
     * Simple string hashing for cache keys
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Cache result with size management
     */
    cacheResult(key, result) {
        // Manage cache size
        if (this.cache.size >= this.options.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, result);
    }

    /**
     * Clear cache for specific template
     */
    clearCacheForTemplate(category, name) {
        const prefix = `${category}:${name}`;
        for (const key of this.cache.keys()) {
            if (key.includes(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clear();
        this.compiledTemplates.clear();
        console.log('🧹 Template caches cleared');
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            ...this.stats,
            templatesStored: this.templates.size,
            cacheSize: this.cache.size,
            compiledTemplates: this.compiledTemplates.size,
            cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0
        };
    }

    /**
     * Export template for backup/sharing
     */
    exportTemplate(category, name) {
        const template = this.getTemplate(category, name);
        if (!template) {
            throw new Error(`Template not found: ${category}/${name}`);
        }

        return {
            exportFormat: 'json',
            version: '1.0',
            exportDate: new Date().toISOString(),
            template: {
                ...template,
                registeredAt: undefined // Remove internal metadata
            }
        };
    }

    /**
     * Export all templates in category
     */
    exportTemplates(category) {
        const templates = [];
        
        for (const [key, template] of this.templates) {
            if (template.category === category) {
                templates.push({
                    ...template,
                    registeredAt: undefined
                });
            }
        }

        return {
            category,
            templates,
            exportDate: new Date().toISOString(),
            count: templates.length
        };
    }

    /**
     * Import templates from export data
     */
    importTemplates(importData, options = {}) {
        const results = {
            success: false,
            imported: [],
            errors: [],
            skipped: []
        };

        try {
            if (!importData.templates || !Array.isArray(importData.templates)) {
                results.errors.push('Invalid import format: templates array required');
                return results;
            }

            importData.templates.forEach((template, index) => {
                try {
                    const registerResult = this.registerTemplate(template);
                    if (registerResult.success) {
                        results.imported.push(template.name);
                    } else {
                        results.errors.push(`Template ${index}: ${registerResult.error}`);
                    }
                } catch (error) {
                    results.errors.push(`Template ${index}: ${error.message}`);
                }
            });

            results.success = results.imported.length > 0;
            console.log(`📥 Import completed: ${results.imported.length} templates imported`);

        } catch (error) {
            results.errors.push(`Import failed: ${error.message}`);
        }

        return results;
    }
}

// Global export for Book Buddy integration
if (typeof window !== 'undefined') {
    window.AIPromptTemplates = AIPromptTemplates;
}