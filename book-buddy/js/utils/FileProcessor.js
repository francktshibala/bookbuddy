/**
 * File Processor - Handles file upload, validation, and content extraction
 */
import { eventBus, EVENTS } from './EventBus.js';

export default class FileProcessor {
    constructor() {
        this.allowedTypes = ['text/plain'];
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.supportedEncodings = ['utf-8', 'utf-16', 'ascii'];
    }

    validateFile(file) {
        const errors = [];
        
        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            errors.push(`Unsupported file type: ${file.type}. Allowed types: ${this.allowedTypes.join(', ')}`);
        }
        
        // Check file size
        if (file.size > this.maxFileSize) {
            errors.push(`File too large: ${this.formatFileSize(file.size)}. Maximum size: ${this.formatFileSize(this.maxFileSize)}`);
        }
        
        // Check file name
        if (!file.name || file.name.trim().length === 0) {
            errors.push('File must have a valid name');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    async processFile(file) {
        try {
            // Validate file first
            const validation = this.validateFile(file);
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.errors.join(', '),
                    errors: validation.errors
                };
            }

            // Read file content
            const content = await this.readFileContent(file);
            
            // Extract metadata
            const metadata = this.extractMetadata(file, content);
            
            // Process content
            const processedContent = this.processContent(content);
            
            const result = {
                success: true,
                bookData: {
                    title: metadata.title,
                    filename: file.name,
                    content: processedContent,
                    wordCount: this.countWords(processedContent),
                    metadata: metadata
                }
            };
            
            eventBus.emit(EVENTS.API_REQUEST_COMPLETED, { 
                type: 'file_processing',
                result 
            });
            
            return result;
            
        } catch (error) {
            const errorResult = {
                success: false,
                message: `Failed to process file: ${error.message}`,
                error
            };
            
            eventBus.emit(EVENTS.API_REQUEST_FAILED, {
                type: 'file_processing',
                error: errorResult
            });
            
            return errorResult;
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            // Try UTF-8 first, fallback to other encodings if needed
            reader.readAsText(file, 'UTF-8');
        });
    }

    extractMetadata(file, content) {
        const title = this.extractTitle(file.name, content);
        const author = this.extractAuthor(content);
        const estimatedReadingTime = this.estimateReadingTime(content);
        
        return {
            title,
            author,
            originalFilename: file.name,
            fileSize: file.size,
            uploadDate: new Date().toISOString(),
            estimatedReadingTime,
            chapters: this.detectChapters(content)
        };
    }

    extractTitle(filename, content) {
        // Try to extract title from filename first
        let title = filename.replace(/\.[^/.]+$/, ""); // Remove extension
        title = title.replace(/[-_]/g, ' '); // Replace hyphens and underscores with spaces
        title = this.toTitleCase(title);
        
        // Try to find a better title in the content
        const lines = content.split('\n').slice(0, 10); // Check first 10 lines
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 0 && trimmed.length < 100) {
                // Look for potential title patterns
                if (this.looksLikeTitle(trimmed)) {
                    return trimmed;
                }
            }
        }
        
        return title || 'Untitled';
    }

    extractAuthor(content) {
        const authorPatterns = [
            /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
            /author:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
            /written\s+by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
        ];
        
        const firstParagraph = content.substring(0, 1000);
        
        for (const pattern of authorPatterns) {
            const match = firstParagraph.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    detectChapters(content) {
        const chapterPatterns = [
            /^Chapter\s+\d+/im,
            /^Ch\.\s*\d+/im,
            /^\d+\.\s+/im,
            /^Part\s+\d+/im
        ];
        
        const lines = content.split('\n');
        const chapters = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            for (const pattern of chapterPatterns) {
                if (pattern.test(line)) {
                    chapters.push({
                        title: line,
                        startLine: i,
                        position: content.indexOf(lines[i])
                    });
                    break;
                }
            }
        }
        
        return chapters;
    }

    processContent(content) {
        // Clean up content
        let processed = content;
        
        // Normalize line endings
        processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Remove excessive whitespace but preserve paragraph breaks
        processed = processed.replace(/\n{3,}/g, '\n\n');
        
        // Trim whitespace from lines
        processed = processed.split('\n').map(line => line.trim()).join('\n');
        
        return processed;
    }

    countWords(content) {
        if (!content) return 0;
        return content.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    estimateReadingTime(content, wordsPerMinute = 250) {
        const wordCount = this.countWords(content);
        return Math.ceil(wordCount / wordsPerMinute);
    }

    looksLikeTitle(text) {
        // Title heuristics
        return (
            text.length > 3 && 
            text.length < 100 && 
            /^[A-Z]/.test(text) && // Starts with capital
            !text.includes('.') && // Doesn't contain periods
            text.split(' ').length <= 10 // Not too many words
        );
    }

    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Drag and drop support
    setupDragAndDrop(dropZoneElement, onFileProcessed) {
        if (!dropZoneElement) return;

        dropZoneElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZoneElement.classList.add('drag-over');
        });

        dropZoneElement.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZoneElement.classList.remove('drag-over');
        });

        dropZoneElement.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZoneElement.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            
            for (const file of files) {
                const result = await this.processFile(file);
                if (onFileProcessed) {
                    onFileProcessed(result);
                }
            }
        });
    }
}