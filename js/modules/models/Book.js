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

    static fromJSON(data) {
        return new Book(data);
    }
}