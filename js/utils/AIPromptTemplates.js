/**
 * AIPromptTemplates - Template management and prompt generation for AI analysis
 * Part of Book Buddy - Phase 2.1: Analysis Layer Implementation
 */

export default class AIPromptTemplates {
    constructor(options = {}) {
        this.config = {
            cacheEnabled: options.cacheEnabled !== false,
            maxCacheSize: options.maxCacheSize || 50,
            validateSecurity: options.validateSecurity !== false
        };

        this.cache = new Map();
        this.templates = this.initializeDefaultTemplates();
        
        console.log('📝 AIPromptTemplates initialized with default templates');
    }

    /**
     * Initialize default templates for book analysis
     */
    initializeDefaultTemplates() {
        return {
            analysis: {
                summary: {
                    name: 'summary',
                    template: `Please provide a comprehensive summary of "{title}" by {author}.

Content preview: {contentPreview}

Create a summary that includes:
- Main plot points or key arguments
- Primary themes or concepts
- Important characters or figures (if applicable)
- Conclusion or resolution

Keep the summary concise but informative, approximately 150-200 words.`,
                    variables: ['title', 'author', 'contentPreview']
                },

                themes: {
                    name: 'themes',
                    template: `Analyze the major themes in "{title}" by {author}.

Content sample: {contentSample}

Please identify and explain:
1. Primary themes (2-3 main themes)
2. Secondary themes (2-3 supporting themes)
3. How these themes are developed throughout the work
4. Examples or evidence from the text

Provide detailed analysis for each theme identified.`,
                    variables: ['title', 'author', 'contentSample']
                },

                characters: {
                    name: 'characters',
                    template: `Analyze the main characters in "{title}" by {author}.

Content: {contentPreview}

For each major character, provide:
- Character name and role
- Key personality traits
- Character development/arc
- Relationships with other characters
- Significance to the overall story

Focus on the most important characters that drive the narrative.`,
                    variables: ['title', 'author', 'contentPreview']
                },

                difficulty: {
                    name: 'difficulty',
                    template: `Assess the reading difficulty and complexity of "{title}" by {author}.

Sample content: {contentPreview}
Word count: {wordCount}

Please evaluate:
- Reading level (elementary, middle school, high school, college, graduate)
- Vocabulary complexity
- Sentence structure complexity
- Conceptual difficulty
- Recommended age range
- Estimated reading time for average reader

Provide specific reasoning for your assessment.`,
                    variables: ['title', 'author', 'contentPreview', 'wordCount']
                },

                sentiment: {
                    name: 'sentiment',
                    template: `Analyze the emotional tone and sentiment of "{title}" by {author}.

Content sample: {contentPreview}

Please analyze:
- Overall emotional tone (positive, negative, neutral, mixed)
- Dominant emotions conveyed
- Mood progression throughout the work
- Author's attitude toward the subject
- Emotional impact on readers

Provide specific examples from the text to support your analysis.`,
                    variables: ['title', 'author', 'contentPreview']
                },

                style: {
                    name: 'style',
                    template: `Analyze the writing style and literary techniques used in "{title}" by {author}.

Content sample: {contentPreview}

Please examine:
- Narrative voice and point of view
- Writing style (formal, informal, descriptive, etc.)
- Literary devices used
- Prose style and sentence structure
- Unique stylistic elements
- Comparison to author's typical style (if known)

Provide specific examples to illustrate each point.`,
                    variables: ['title', 'author', 'contentPreview']
                }
            }
        };
    }

    /**
     * Generate a prompt from a template
     */
    generatePrompt(category, name, variables) {
        try {
            const template = this.getTemplate(category, name);
            if (!template) {
                throw new Error(`Template not found: ${category}/${name}`);
            }

            // Check cache
            const cacheKey = `${category}_${name}_${this.hashVariables(variables)}`;
            if (this.config.cacheEnabled) {
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    return cached;
                }
            }

            // Substitute variables
            let prompt = template.template;
            for (const [key, value] of Object.entries(variables)) {
                const placeholder = `{${key}}`;
                const replacement = value || '';
                prompt = prompt.replace(new RegExp(placeholder, 'g'), replacement);
            }

            // Cache result
            if (this.config.cacheEnabled) {
                this.setCache(cacheKey, prompt);
            }

            return prompt;

        } catch (error) {
            console.error('❌ Prompt generation error:', error);
            return `Error generating prompt: ${error.message}`;
        }
    }

    /**
     * Get a template by category and name
     */
    getTemplate(category, name) {
        return this.templates[category]?.[name] || null;
    }

    /**
     * Register a new template
     */
    registerTemplate(category, template) {
        if (!this.templates[category]) {
            this.templates[category] = {};
        }
        
        this.templates[category][template.name] = template;
        console.log(`📝 Registered template: ${category}/${template.name}`);
        
        return { success: true };
    }

    /**
     * List all templates in a category
     */
    listTemplates(category) {
        return Object.keys(this.templates[category] || {});
    }

    /**
     * Generate hash for variables (for caching)
     */
    hashVariables(variables) {
        const str = JSON.stringify(variables);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Cache management
     */
    setCache(key, value) {
        if (this.cache.size >= this.config.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Template cache cleared');
    }

    /**
     * Get template statistics
     */
    getStats() {
        const stats = {};
        for (const [category, templates] of Object.entries(this.templates)) {
            stats[category] = Object.keys(templates).length;
        }
        
        return {
            categories: stats,
            totalTemplates: Object.values(stats).reduce((sum, count) => sum + count, 0),
            cacheSize: this.cache.size,
            cacheEnabled: this.config.cacheEnabled
        };
    }
}