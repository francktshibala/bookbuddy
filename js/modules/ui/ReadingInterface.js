/**
 * ReadingInterface - Handles the book reading experience
 */
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { DOMUtils, DateUtils } from '../../utils/Helpers.js';
export default class ReadingInterface {
    constructor() {
        this.currentBook = null;
        this.currentChapter = 0;
        this.readingSettings = {
            fontSize: 16,
            lineHeight: 1.6,
            fontFamily: 'Georgia',
            theme: 'light',
            wordsPerMinute: 250,
            autoScroll: false,
            autoScrollSpeed: 50
        };
        
        this.readingSession = {
            startTime: null,
            wordsRead: 0,
            sessionDuration: 0
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for reading progress updates
        eventBus.on(EVENTS.READING_PROGRESS_UPDATED, (data) => {
            this.updateProgressDisplay();
            this.saveReadingProgress();
        });

        // Listen for settings changes
        eventBus.on(EVENTS.UI_THEME_CHANGED, (data) => {
            this.applyTheme(data.theme);
        });
    }

    loadBook(book) {
        this.currentBook = book;
        this.loadReadingSettings();
        this.startReadingSession();
        this.renderReadingInterface();
        this.scrollToCurrentPosition();
    }

    renderReadingInterface() {
        const container = DOMUtils.query('#reading-content');
        if (!container || !this.currentBook) return;

        container.innerHTML = `
            <div class="reading-interface">
                ${this.renderReadingHeader()}
                ${this.renderReadingControls()}
                <div class="reading-content-wrapper">
                    ${this.renderBookContent()}
                </div>
                ${this.renderReadingFooter()}
            </div>
        `;

        this.setupReadingEventListeners();
        this.applyReadingSettings();
    }

    renderReadingHeader() {
        const stats = this.currentBook.getReadingStats();
        
        return `
            <div class="reading-header">
                <div class="book-info">
                    <h2 class="reading-title">${this.currentBook.title}</h2>
                    <div class="reading-meta">
                        ${this.currentBook.filename} • ${this.currentBook.wordCount.toLocaleString()} words
                    </div>
                </div>
                
                <div class="reading-progress-info">
                    <div class="progress-stats">
                        <span class="progress-percent">${stats.progressPercent}%</span>
                        <span class="words-remaining">${stats.wordsRemaining.toLocaleString()} words left</span>
                        <span class="time-remaining">~${stats.estimatedTimeRemaining} min</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${stats.progress * 100}%"></div>
                    </div>
                </div>
            </div>
        `;
    }

    renderReadingControls() {
        return `
            <div class="reading-controls">
                <div class="reading-actions">
                    <button class="btn btn-outline" id="reading-settings" title="Reading Settings">
                        ⚙️ Settings
                    </button>
                    <button class="btn btn-outline" id="toggle-fullscreen" title="Toggle Fullscreen">
                        📺 Fullscreen
                    </button>
                    <button class="btn btn-outline" id="add-bookmark" title="Add Bookmark">
                        🔖 Bookmark
                    </button>
                    <button class="btn btn-outline" id="add-note" title="Add Note">
                        📝 Note
                    </button>
                </div>
                
                <div class="reading-navigation">
                    <button class="btn btn-outline" id="prev-chapter" title="Previous Chapter">
                        ← Previous
                    </button>
                    <span class="chapter-info" id="chapter-info">Chapter 1 of 1</span>
                    <button class="btn btn-outline" id="next-chapter" title="Next Chapter">
                        Next →
                    </button>
                </div>
            </div>
        `;
    }

    renderBookContent() {
        if (!this.currentBook) return '';

        const content = this.currentBook.content;
        const chapters = this.detectChapters(content);
        
        if (chapters.length > 1) {
            return this.renderChapteredContent(chapters);
        } else {
            return this.renderContinuousContent(content);
        }
    }

    renderContinuousContent(content) {
        // Split content into paragraphs for better reading experience
        const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
        
        return `
            <div class="book-content continuous" id="book-content">
                ${paragraphs.map((paragraph, index) => 
                    `<p class="content-paragraph" data-paragraph="${index}">${this.formatParagraph(paragraph.trim())}</p>`
                ).join('')}
            </div>
        `;
    }

    renderChapteredContent(chapters) {
        const currentChapter = chapters[this.currentChapter] || chapters[0];
        
        return `
            <div class="book-content chaptered" id="book-content">
                <div class="chapter-header">
                    <h3 class="chapter-title">${currentChapter.title}</h3>
                </div>
                <div class="chapter-content">
                    ${this.formatChapterContent(currentChapter.content)}
                </div>
            </div>
        `;
    }

    renderReadingFooter() {
        return `
            <div class="reading-footer">
                <div class="session-info">
                    <span class="session-time">Session: ${this.formatSessionTime()}</span>
                    <span class="words-read">Words read: ${this.readingSession.wordsRead}</span>
                </div>
                
                <div class="page-navigation">
                    <button class="btn btn-outline" id="scroll-to-top" title="Scroll to top">
                        ↑ Top
                    </button>
                    <button class="btn btn-outline" id="scroll-to-position" title="Go to saved position">
                        📍 Saved Position
                    </button>
                    <button class="btn btn-outline" id="scroll-to-bottom" title="Scroll to bottom">
                        ↓ Bottom
                    </button>
                </div>
            </div>
        `;
    }

    setupReadingEventListeners() {
        // Reading settings
        const settingsBtn = DOMUtils.query('#reading-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showReadingSettings());
        }

        // Fullscreen toggle
        const fullscreenBtn = DOMUtils.query('#toggle-fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Bookmark functionality
        const bookmarkBtn = DOMUtils.query('#add-bookmark');
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', () => this.addBookmark());
        }

        // Note functionality
        const noteBtn = DOMUtils.query('#add-note');
        if (noteBtn) {
            noteBtn.addEventListener('click', () => this.addNote());
        }

        // Chapter navigation
        const prevBtn = DOMUtils.query('#prev-chapter');
        const nextBtn = DOMUtils.query('#next-chapter');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousChapter());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextChapter());
        }

        // Scroll controls
        const scrollTopBtn = DOMUtils.query('#scroll-to-top');
        const scrollPositionBtn = DOMUtils.query('#scroll-to-position');
        const scrollBottomBtn = DOMUtils.query('#scroll-to-bottom');

        if (scrollTopBtn) {
            scrollTopBtn.addEventListener('click', () => this.scrollToTop());
        }
        
        if (scrollPositionBtn) {
            scrollPositionBtn.addEventListener('click', () => this.scrollToCurrentPosition());
        }
        
        if (scrollBottomBtn) {
            scrollBottomBtn.addEventListener('click', () => this.scrollToBottom());
        }

        // Track reading progress while scrolling
        const contentWrapper = DOMUtils.query('.reading-content-wrapper');
        if (contentWrapper) {
            let scrollTimeout;
            contentWrapper.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.updateReadingPosition();
                }, 300);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (DOMUtils.query('#reading-view').style.display !== 'none') {
                this.handleKeyboardShortcuts(e);
            }
        });

        // Text selection for notes and highlights
        document.addEventListener('mouseup', () => {
            const selection = window.getSelection();
            if (selection.toString().length > 0) {
                this.handleTextSelection(selection);
            }
        });
    }

    showReadingSettings() {
        const modalManager = window.bookBuddyApp?.modalManager;
        if (!modalManager) return;

        modalManager.showModal({
            title: '📖 Reading Settings',
            content: `
                <div class="reading-settings-form">
                    <div class="setting-group">
                        <label for="font-size">Font Size</label>
                        <input type="range" id="font-size" min="12" max="24" value="${this.readingSettings.fontSize}">
                        <span class="setting-value">${this.readingSettings.fontSize}px</span>
                    </div>
                    
                    <div class="setting-group">
                        <label for="line-height">Line Height</label>
                        <input type="range" id="line-height" min="1.2" max="2.0" step="0.1" value="${this.readingSettings.lineHeight}">
                        <span class="setting-value">${this.readingSettings.lineHeight}</span>
                    </div>
                    
                    <div class="setting-group">
                        <label for="font-family">Font Family</label>
                        <select id="font-family">
                            <option value="Georgia" ${this.readingSettings.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option>
                            <option value="Times New Roman" ${this.readingSettings.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                            <option value="Arial" ${this.readingSettings.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                            <option value="Helvetica" ${this.readingSettings.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                            <option value="Verdana" ${this.readingSettings.fontFamily === 'Verdana' ? 'selected' : ''}>Verdana</option>
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label for="reading-theme">Theme</label>
                        <select id="reading-theme">
                            <option value="light" ${this.readingSettings.theme === 'light' ? 'selected' : ''}>Light</option>
                            <option value="dark" ${this.readingSettings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="sepia" ${this.readingSettings.theme === 'sepia' ? 'selected' : ''}>Sepia</option>
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label for="reading-speed">Reading Speed (WPM)</label>
                        <input type="number" id="reading-speed" min="100" max="1000" value="${this.readingSettings.wordsPerMinute}">
                    </div>
                    
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="auto-scroll" ${this.readingSettings.autoScroll ? 'checked' : ''}>
                            Auto-scroll
                        </label>
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Cancel',
                    action: 'cancel',
                    className: 'btn-outline'
                },
                {
                    text: 'Apply',
                    action: 'apply',
                    className: 'btn-primary'
                }
            ],
            onAction: (action) => {
                if (action === 'apply') {
                    this.applySettingsFromModal();
                }
                return true;
            }
        });
    }

    applySettingsFromModal() {
        this.readingSettings.fontSize = parseInt(DOMUtils.query('#font-size')?.value) || 16;
        this.readingSettings.lineHeight = parseFloat(DOMUtils.query('#line-height')?.value) || 1.6;
        this.readingSettings.fontFamily = DOMUtils.query('#font-family')?.value || 'Georgia';
        this.readingSettings.theme = DOMUtils.query('#reading-theme')?.value || 'light';
        this.readingSettings.wordsPerMinute = parseInt(DOMUtils.query('#reading-speed')?.value) || 250;
        this.readingSettings.autoScroll = DOMUtils.query('#auto-scroll')?.checked || false;

        this.applyReadingSettings();
        this.saveReadingSettings();
    }

    applyReadingSettings() {
        const content = DOMUtils.query('#book-content');
        if (!content) return;

        content.style.fontSize = `${this.readingSettings.fontSize}px`;
        content.style.lineHeight = this.readingSettings.lineHeight;
        content.style.fontFamily = this.readingSettings.fontFamily;
        
        // Apply theme
        const readingInterface = DOMUtils.query('.reading-interface');
        if (readingInterface) {
            readingInterface.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
            readingInterface.classList.add(`theme-${this.readingSettings.theme}`);
        }
    }

    toggleFullscreen() {
        const readingInterface = DOMUtils.query('.reading-interface');
        if (!readingInterface) return;

        if (!document.fullscreenElement) {
            readingInterface.requestFullscreen().catch(err => {
                console.warn('Could not enter fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    addBookmark() {
        if (!this.currentBook) return;

        const position = this.getCurrentReadingPosition();
        const bookmark = {
            id: `bookmark_${Date.now()}`,
            position,
            timestamp: new Date().toISOString(),
            note: ''
        };

        // Add bookmark to book
        if (!this.currentBook.bookmarks) {
            this.currentBook.bookmarks = [];
        }
        
        this.currentBook.bookmarks.push(bookmark);
        this.saveBookProgress();

        // Show success message
        const modalManager = window.bookBuddyApp?.modalManager;
        if (modalManager) {
            modalManager.showAlert('Bookmark Added', 'Your current position has been bookmarked!');
        }
    }

    addNote() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        const modalManager = window.bookBuddyApp?.modalManager;
        if (!modalManager) return;

        modalManager.showPrompt(
            '📝 Add Note',
            selectedText ? `Add a note for: "${selectedText.substring(0, 50)}..."` : 'Add a note at current position:',
            '',
            'Enter your note...'
        ).then(noteText => {
            if (noteText && noteText.trim()) {
                const position = this.getCurrentReadingPosition();
                const note = this.currentBook.addNote(position, noteText.trim());
                
                if (selectedText) {
                    note.selectedText = selectedText;
                }
                
                this.saveBookProgress();
                modalManager.showAlert('Note Added', 'Your note has been saved!');
            }
        });
    }

    handleTextSelection(selection) {
        const selectedText = selection.toString().trim();
        if (selectedText.length < 3) return;

        // Show quick actions for selected text
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        this.showSelectionActions(rect, selectedText);
    }

    showSelectionActions(rect, selectedText) {
        // Remove existing selection popup
        const existingPopup = DOMUtils.query('.selection-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        const popup = DOMUtils.createElement('div', {
            className: 'selection-popup',
            innerHTML: `
                <button class="selection-btn" data-action="note">📝 Note</button>
                <button class="selection-btn" data-action="highlight">🖍️ Highlight</button>
                <button class="selection-btn" data-action="search">🔍 Search</button>
            `
        });

        popup.style.position = 'fixed';
        popup.style.top = `${rect.top - 40}px`;
        popup.style.left = `${rect.left + (rect.width / 2)}px`;
        popup.style.transform = 'translateX(-50%)';
        popup.style.zIndex = '1000';

        document.body.appendChild(popup);

        // Setup action listeners
        popup.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleSelectionAction(action, selectedText);
                popup.remove();
            }
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 5000);
    }

    handleSelectionAction(action, selectedText) {
        switch (action) {
            case 'note':
                this.addNoteForSelection(selectedText);
                break;
            case 'highlight':
                this.addHighlight(selectedText);
                break;
            case 'search':
                this.searchForText(selectedText);
                break;
        }
    }

    addNoteForSelection(selectedText) {
        const modalManager = window.bookBuddyApp?.modalManager;
        if (!modalManager) return;

        modalManager.showPrompt(
            '📝 Add Note',
            `Add a note for: "${selectedText.substring(0, 50)}..."`,
            '',
            'Enter your note...'
        ).then(noteText => {
            if (noteText && noteText.trim()) {
                const position = this.getCurrentReadingPosition();
                const note = this.currentBook.addNote(position, noteText.trim());
                note.selectedText = selectedText;
                
                this.saveBookProgress();
                modalManager.showAlert('Note Added', 'Your note has been saved!');
            }
        });
    }

    addHighlight(selectedText) {
        if (!this.currentBook) return;

        const position = this.getCurrentReadingPosition();
        const highlight = this.currentBook.addHighlight(
            position,
            position + selectedText.length,
            'yellow'
        );
        highlight.text = selectedText;

        this.saveBookProgress();
        
        const modalManager = window.bookBuddyApp?.modalManager;
        if (modalManager) {
            modalManager.showAlert('Text Highlighted', 'Your selection has been highlighted!');
        }
    }

    searchForText(selectedText) {
        // Navigate to search view with the selected text
        const searchInput = DOMUtils.query('#library-search');
        if (searchInput) {
            searchInput.value = selectedText;
            // Trigger search
            const event = new Event('input');
            searchInput.dispatchEvent(event);
        }
    }

    handleKeyboardShortcuts(e) {
        // Don't interfere with input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key) {
            case 'ArrowUp':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.scrollToTop();
                }
                break;
            case 'ArrowDown':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.scrollToBottom();
                }
                break;
            case 'ArrowLeft':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.previousChapter();
                }
                break;
            case 'ArrowRight':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.nextChapter();
                }
                break;
            case 'b':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.addBookmark();
                }
                break;
            case 'n':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.addNote();
                }
                break;
            case 'f':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.toggleFullscreen();
                }
                break;
            case 'Escape':
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                break;
        }
    }

    updateReadingPosition() {
        if (!this.currentBook) return;

        const contentWrapper = DOMUtils.query('.reading-content-wrapper');
        if (!contentWrapper) return;

        const scrollTop = contentWrapper.scrollTop;
        const scrollHeight = contentWrapper.scrollHeight;
        const clientHeight = contentWrapper.clientHeight;

        // Calculate position as percentage of content
        const scrollProgress = scrollTop / (scrollHeight - clientHeight);
        const position = Math.floor(this.currentBook.content.length * scrollProgress);

        // Update book position
        this.currentBook.updatePosition(position);
        
        // Update reading session
        this.updateReadingSession();
        
        // Emit progress update event
        eventBus.emit(EVENTS.READING_PROGRESS_UPDATED, {
            book: this.currentBook,
            position,
            progress: scrollProgress
        });
    }

    getCurrentReadingPosition() {
        return this.currentBook ? this.currentBook.currentPosition : 0;
    }

    scrollToCurrentPosition() {
        if (!this.currentBook) return;

        const contentWrapper = DOMUtils.query('.reading-content-wrapper');
        if (!contentWrapper) return;

        const progress = this.currentBook.getProgress();
        const scrollHeight = contentWrapper.scrollHeight;
        const clientHeight = contentWrapper.clientHeight;
        const scrollTop = progress * (scrollHeight - clientHeight);

        contentWrapper.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });
    }

    scrollToTop() {
        const contentWrapper = DOMUtils.query('.reading-content-wrapper');
        if (contentWrapper) {
            contentWrapper.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    scrollToBottom() {
        const contentWrapper = DOMUtils.query('.reading-content-wrapper');
        if (contentWrapper) {
            contentWrapper.scrollTo({ 
                top: contentWrapper.scrollHeight, 
                behavior: 'smooth' 
            });
        }
    }

    previousChapter() {
        if (this.currentChapter > 0) {
            this.currentChapter--;
            this.renderBookContent();
        }
    }

    nextChapter() {
        const chapters = this.detectChapters(this.currentBook.content);
        if (this.currentChapter < chapters.length - 1) {
            this.currentChapter++;
            this.renderBookContent();
        }
    }

    detectChapters(content) {
        // Simple chapter detection
        const chapterPatterns = [
            /^Chapter\s+\d+/gm,
            /^Ch\.\s*\d+/gm,
            /^\d+\.\s+/gm,
            /^Part\s+\d+/gm
        ];

        let chapters = [];
        
        for (const pattern of chapterPatterns) {
            const matches = [...content.matchAll(pattern)];
            if (matches.length > 1) {
                chapters = matches.map((match, index) => {
                    const start = match.index;
                    const end = matches[index + 1] ? matches[index + 1].index : content.length;
                    
                    return {
                        title: match[0],
                        content: content.substring(start, end),
                        startPosition: start,
                        endPosition: end
                    };
                });
                break;
            }
        }

        // If no chapters found, treat entire content as one chapter
        if (chapters.length === 0) {
            chapters = [{
                title: this.currentBook.title,
                content: content,
                startPosition: 0,
                endPosition: content.length
            }];
        }

        return chapters;
    }

    formatParagraph(paragraph) {
        // Basic paragraph formatting
        return paragraph
            .replace(/\n/g, '<br>')
            .replace(/\s{2,}/g, ' ');
    }

    formatChapterContent(content) {
        return content
            .split('\n\n')
            .filter(p => p.trim())
            .map(p => `<p class="content-paragraph">${this.formatParagraph(p.trim())}</p>`)
            .join('');
    }

    startReadingSession() {
        this.readingSession = {
            startTime: Date.now(),
            wordsRead: 0,
            sessionDuration: 0
        };
    }

    updateReadingSession() {
        if (!this.readingSession.startTime) return;

        this.readingSession.sessionDuration = Date.now() - this.readingSession.startTime;
        
        // Estimate words read based on time and reading speed
        const minutesElapsed = this.readingSession.sessionDuration / (1000 * 60);
        this.readingSession.wordsRead = Math.floor(minutesElapsed * this.readingSettings.wordsPerMinute);
    }

    formatSessionTime() {
        const duration = this.readingSession.sessionDuration;
        const minutes = Math.floor(duration / (1000 * 60));
        const seconds = Math.floor((duration % (1000 * 60)) / 1000);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateProgressDisplay() {
        if (!this.currentBook) return;

        const stats = this.currentBook.getReadingStats();
        
        // Update progress bar
        const progressFill = DOMUtils.query('.reading-header .progress-fill');
        if (progressFill) {
            progressFill.style.width = `${stats.progress * 100}%`;
        }
        
        // Update progress text
        const progressPercent = DOMUtils.query('.progress-percent');
        if (progressPercent) {
            progressPercent.textContent = `${stats.progressPercent}%`;
        }
        
        const wordsRemaining = DOMUtils.query('.words-remaining');
        if (wordsRemaining) {
            wordsRemaining.textContent = `${stats.wordsRemaining.toLocaleString()} words left`;
        }
        
        const timeRemaining = DOMUtils.query('.time-remaining');
        if (timeRemaining) {
            timeRemaining.textContent = `~${stats.estimatedTimeRemaining} min`;
        }
    }

    saveReadingProgress() {
        if (!this.currentBook) return;

        // Save to storage
        const storage = window.bookBuddyApp?.storage;
        if (storage) {
            storage.save(`book_${this.currentBook.id}`, this.currentBook.toJSON());
        }
    }

    saveBookProgress() {
        // Alias for saveReadingProgress for consistency
        this.saveReadingProgress();
    }

    loadReadingSettings() {
        const storage = window.bookBuddyApp?.storage;
        if (storage) {
            const result = storage.load('reading_settings', this.readingSettings);
            if (result.success) {
                this.readingSettings = { ...this.readingSettings, ...result.data };
            }
        }
    }

    saveReadingSettings() {
        const storage = window.bookBuddyApp?.storage;
        if (storage) {
            storage.save('reading_settings', this.readingSettings);
        }
    }

    applyTheme(theme) {
        this.readingSettings.theme = theme;
        this.applyReadingSettings();
        this.saveReadingSettings();
    }
}