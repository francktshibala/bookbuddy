/**
 * Book Model - Represents a single book with all its metadata and functionality
 */
export default class Book {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.title = data.title || 'Untitled';
        this.filename = data.filename || '';
        this.content = data.content || '';
        this.wordCount = data.wordCount || this.calculateWordCount();
        this.uploadDate = data.uploadDate || new Date().toISOString();
        this.lastRead = data.lastRead || null;
        this.currentPosition = data.currentPosition || 0;
        this.readingTime = data.readingTime || 0;
        this.notes = data.notes || [];
        this.highlights = data.highlights || [];
        this.enriched = data.enriched || false;
        this.sources = data.sources || [];
        this.dataQuality = data.dataQuality || null;
        this.mergedAt = data.mergedAt || null;
        this.originalData = data.originalData || null;
        this.enrichmentMetadata = data.enrichmentMetadata || null;
            // ✅ NEW: AI Analysis Properties
        this.aiAnalysis = data.aiAnalysis || {};
        this.analysisMetadata = data.analysisMetadata || {
            hasAnalysis: false,
            analysisCount: 0,
            lastAnalyzed: null,
            analysisTypes: [],
            totalTokensUsed: 0,
            averageConfidence: null,
            analysisVersion: '1.0'
        };
            // ✅ NEW: Analysis timestamps for caching
        this.analysisTimestamp = data.analysisTimestamp || null;
    }

    generateId() {
        return `book_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    calculateWordCount() {
        if (!this.content) return 0;
        return this.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    getProgress() {
        if (!this.content || this.content.length === 0) return 0;
        return Math.max(0, Math.min(1, this.currentPosition / this.content.length));
    }

    updatePosition(position) {
        this.currentPosition = Math.max(0, Math.min(this.content.length, position));
        this.lastRead = new Date().toISOString();
        return this;
    }

    addNote(position, text) {
        const note = {
            id: `note_${Date.now()}`,
            position,
            text,
            timestamp: new Date().toISOString()
        };
        this.notes.push(note);
        return note;
    }

    addHighlight(startPosition, endPosition, color = 'yellow') {
        const highlight = {
            id: `highlight_${Date.now()}`,
            startPosition,
            endPosition,
            color,
            timestamp: new Date().toISOString()
        };
        this.highlights.push(highlight);
        return highlight;
    }

    getReadingStats() {
        return {
            progress: this.getProgress(),
            progressPercent: Math.round(this.getProgress() * 100),
            wordsRead: Math.round(this.wordCount * this.getProgress()),
            wordsRemaining: this.wordCount - Math.round(this.wordCount * this.getProgress()),
            estimatedTimeRemaining: this.getEstimatedTimeRemaining()
        };
    }

    getEstimatedTimeRemaining(wordsPerMinute = 250) {
        const wordsRemaining = this.wordCount - Math.round(this.wordCount * this.getProgress());
        return Math.ceil(wordsRemaining / wordsPerMinute);
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            filename: this.filename,
            content: this.content,
            wordCount: this.wordCount,
            uploadDate: this.uploadDate,
            lastRead: this.lastRead,
            currentPosition: this.currentPosition,
            readingTime: this.readingTime,
            notes: this.notes,
            highlights: this.highlights,
            enriched: this.enriched,
            sources: this.sources,
            dataQuality: this.dataQuality,
            mergedAt: this.mergedAt,
            originalData: this.originalData,
            enrichmentMetadata: this.enrichmentMetadata
                    };
    }

    /**
 * Store AI analysis result
 */
addAnalysis(analysisType, analysisResult) {
    if (!this.aiAnalysis) {
        this.aiAnalysis = {};
    }
    
    this.aiAnalysis[analysisType] = {
        ...analysisResult,
        storedAt: new Date().toISOString()
    };
    
    this.updateAnalysisMetadata();
    return this;
}

/**
 * Get specific analysis result
 */
getAnalysis(analysisType) {
    return this.aiAnalysis?.[analysisType] || null;
}

/**
 * Check if book has specific analysis
 */
hasAnalysis(analysisType) {
    return !!(this.aiAnalysis?.[analysisType]);
}

/**
 * Get all available analysis types for this book
 */
getAvailableAnalysisTypes() {
    return Object.keys(this.aiAnalysis || {});
}

/**
 * Remove specific analysis
 */
removeAnalysis(analysisType) {
    if (this.aiAnalysis?.[analysisType]) {
        delete this.aiAnalysis[analysisType];
        this.updateAnalysisMetadata();
    }
    return this;
}

/**
 * Clear all AI analyses
 */
clearAllAnalyses() {
    this.aiAnalysis = {};
    this.analysisMetadata = {
        hasAnalysis: false,
        analysisCount: 0,
        lastAnalyzed: null,
        analysisTypes: [],
        totalTokensUsed: 0,
        averageConfidence: null,
        analysisVersion: '1.0'
    };
    return this;
}

/**
 * Update analysis metadata based on current analyses
 */
updateAnalysisMetadata() {
    const analyses = this.aiAnalysis || {};
    const analysisTypes = Object.keys(analyses);
    
    // Calculate metadata
    const confidences = Object.values(analyses)
        .map(a => a.confidence)
        .filter(c => typeof c === 'number');
    
    const totalTokens = Object.values(analyses)
        .reduce((sum, a) => sum + (a.metadata?.tokens || 0), 0);
    
    const dates = Object.values(analyses)
        .map(a => a.generatedAt || a.storedAt)
        .filter(d => d)
        .sort()
        .reverse();
    
    this.analysisMetadata = {
        hasAnalysis: analysisTypes.length > 0,
        analysisCount: analysisTypes.length,
        lastAnalyzed: dates[0] || null,
        analysisTypes: analysisTypes.sort(),
        totalTokensUsed: totalTokens,
        averageConfidence: confidences.length > 0 
            ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length 
            : null,
        analysisVersion: '1.0',
        updatedAt: new Date().toISOString()
    };
    
    this.analysisTimestamp = Date.now();
}

/**
 * Get analysis summary for display
 */
getAnalysisSummary() {
    if (!this.analysisMetadata.hasAnalysis) {
        return {
            hasAnalysis: false,
            message: 'No AI analysis available'
        };
    }
    
    const { analysisCount, analysisTypes, lastAnalyzed, averageConfidence } = this.analysisMetadata;
    
    return {
        hasAnalysis: true,
        count: analysisCount,
        types: analysisTypes,
        lastAnalyzed,
        confidence: averageConfidence ? `${Math.round(averageConfidence * 100)}%` : 'Unknown',
        message: `${analysisCount} analysis${analysisCount > 1 ? 'es' : ''} available: ${analysisTypes.join(', ')}`
    };
}

/**
 * Check if analyses need refresh (older than 24 hours)
 */
needsAnalysisRefresh(maxAgeHours = 24) {
    if (!this.analysisMetadata.lastAnalyzed) return true;
    
    const lastAnalyzed = new Date(this.analysisMetadata.lastAnalyzed);
    const ageHours = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60);
    
    return ageHours > maxAgeHours;
}

/**
 * Validate analysis data structure
 */
validateAnalysisData() {
    const errors = [];
    
    if (this.aiAnalysis && typeof this.aiAnalysis !== 'object') {
        errors.push('aiAnalysis must be an object');
    }
    
    if (this.analysisMetadata && typeof this.analysisMetadata !== 'object') {
        errors.push('analysisMetadata must be an object');
    }
    
    // Validate each analysis
    Object.entries(this.aiAnalysis || {}).forEach(([type, analysis]) => {
        if (!analysis.content) {
            errors.push(`Analysis ${type} missing content`);
        }
        if (!analysis.analysisType || analysis.analysisType !== type) {
            errors.push(`Analysis ${type} has incorrect analysisType`);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Export analysis data for backup/sharing
 */
exportAnalysisData() {
    return {
        bookId: this.id,
        bookTitle: this.title,
        analyses: this.aiAnalysis || {},
        metadata: this.analysisMetadata,
        exportedAt: new Date().toISOString(),
        version: '1.0'
    };
}

/**
 * Import analysis data from backup
 */
importAnalysisData(analysisData, options = {}) {
    if (!analysisData || typeof analysisData !== 'object') {
        throw new Error('Invalid analysis data');
    }
    
    const merge = options.merge !== false;
    
    if (!merge) {
        this.clearAllAnalyses();
    }
    
    // Import analyses
    Object.entries(analysisData.analyses || {}).forEach(([type, analysis]) => {
        if (merge && this.hasAnalysis(type) && !options.overwrite) {
            return; // Skip existing analyses if not overwriting
        }
        
        this.addAnalysis(type, analysis);
    });
    
    return this;
}

// ✅ UPDATE EXISTING toJSON METHOD: Add these properties to your existing toJSON method
toJSON() {
    return {
        // ... existing properties ...
        
        // ✅ NEW: Include AI analysis data
        aiAnalysis: this.aiAnalysis,
        analysisMetadata: this.analysisMetadata,
        analysisTimestamp: this.analysisTimestamp
    };
}

// ✅ UPDATE EXISTING fromJSON METHOD: Handle AI analysis data
static fromJSON(data) {
    const book = new Book(data);
    
    // ✅ NEW: Ensure analysis metadata is up to date
    if (book.aiAnalysis && Object.keys(book.aiAnalysis).length > 0) {
        book.updateAnalysisMetadata();
    }
    
    return book;
}


    static fromJSON(data) {
        return new Book(data);
    }
}