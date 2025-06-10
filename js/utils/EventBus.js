/**
 * EventBus - Central event system for component communication
 * Allows loose coupling between modules
 */
export default class EventBus {
    constructor() {
        this.events = new Map();
    }

    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName).push(callback);
        
        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }

    off(eventName, callback) {
        if (!this.events.has(eventName)) return;
        
        const callbacks = this.events.get(eventName);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
        
        if (callbacks.length === 0) {
            this.events.delete(eventName);
        }
    }

    emit(eventName, data = null) {
        if (!this.events.has(eventName)) return;
        
        const callbacks = this.events.get(eventName);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${eventName}:`, error);
            }
        });
    }

    once(eventName, callback) {
        const unsubscribe = this.on(eventName, (data) => {
            unsubscribe();
            callback(data);
        });
        return unsubscribe;
    }

    clear(eventName = null) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
        }
    }

    getEventNames() {
        return Array.from(this.events.keys());
    }

    getListenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }
}

// Create global instance
export const eventBus = new EventBus();

// Event name constants to avoid typos
export const EVENTS = {
    // Book events
    BOOK_ADDED: 'book:added',
    BOOK_UPDATED: 'book:updated',
    BOOK_DELETED: 'book:deleted',
    BOOK_OPENED: 'book:opened',
    
    // Reading events
    READING_PROGRESS_UPDATED: 'reading:progressUpdated',
    READING_STARTED: 'reading:started',
    READING_PAUSED: 'reading:paused',
    
    // UI events
    UI_THEME_CHANGED: 'ui:themeChanged',
    UI_VIEW_CHANGED: 'ui:viewChanged',
    UI_MODAL_OPENED: 'ui:modalOpened',
    UI_MODAL_CLOSED: 'ui:modalClosed',
    
    // Storage events
    STORAGE_ERROR: 'storage:error',
    STORAGE_QUOTA_WARNING: 'storage:quotaWarning',
    
    // API events
    API_REQUEST_STARTED: 'api:requestStarted',
    API_REQUEST_COMPLETED: 'api:requestCompleted',
    API_REQUEST_FAILED: 'api:requestFailed',

    // AI analysis events
    AI_ANALYSIS_STARTED: 'AI_ANALYSIS_STARTED',
    AI_ANALYSIS_COMPLETED: 'AI_ANALYSIS_COMPLETED', 
    AI_ANALYSIS_PROGRESS: 'AI_ANALYSIS_PROGRESS',
    AI_ANALYSIS_ERROR: 'AI_ANALYSIS_ERROR',
    BOOK_ANALYSIS_REQUESTED: 'BOOK_ANALYSIS_REQUESTED'
};