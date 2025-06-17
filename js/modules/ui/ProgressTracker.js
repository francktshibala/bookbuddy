/**
 * ProgressTracker.js - Real-time Progress Display for AI Analysis Operations
 * Part of Book Buddy - Follows established architecture patterns
 * 
 * @author Book Buddy Development Team
 * @version 1.0.0
 */

import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { DOMUtils, StringUtils } from '../../utils/Helpers.js';

export default class ProgressTracker {
    constructor(options = {}) {
        // Configuration with defaults
        this.config = {
            autoHide: options.autoHide !== false,
            autoHideDelay: options.autoHideDelay || 3000,
            showPercentage: options.showPercentage !== false,
            showTimeEstimate: options.showTimeEstimate !== false,
            showStageInfo: options.showStageInfo !== false,
            animationDuration: options.animationDuration || 300,
            updateThrottle: options.updateThrottle || 100,
            enableSounds: options.enableSounds || false,
            
            // Progress bar styling
            progressBarHeight: options.progressBarHeight || '8px',
            progressBarRadius: options.progressBarRadius || '4px',
            
            // Colors
            colors: {
                primary: options.primaryColor || 'var(--primary-color)',
                success: options.successColor || 'var(--success-color)',
                warning: options.warningColor || 'var(--warning-color)',
                error: options.errorColor || 'var(--error-color)',
                background: options.backgroundColor || 'var(--border-color)'
            }
        };

        // Component state
        this.state = {
            activeTrackers: new Map(),
            globalTracker: null,
            lastUpdate: 0,
            totalOperations: 0,
            completedOperations: 0,
            isVisible: false
        };

        // Performance tracking
        this.performance = {
            startTimes: new Map(),
            updateCount: 0,
            throttledUpdates: 0
        };

        this.initialize();
        console.log('📊 ProgressTracker initialized');
    }

    /**
     * Initialize the progress tracker
     */
    initialize() {
        try {
            this.setupEventListeners();
            this.createGlobalTracker();
            this.setupThrottling();
            
            console.log('✅ ProgressTracker ready for progress tracking');
            
            // Emit initialization event
            eventBus.emit('progress:tracker:ready', {
                component: 'ProgressTracker',
                config: this.getPublicConfig()
            });

        } catch (error) {
            console.error('❌ ProgressTracker initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup EventBus listeners for progress events
     */
    setupEventListeners() {
        // AI Analysis progress events
        eventBus.on(EVENTS.AI_ANALYSIS_STARTED, this.handleAnalysisStarted.bind(this));
        eventBus.on(EVENTS.AI_ANALYSIS_PROGRESS, this.handleAnalysisProgress.bind(this));
        eventBus.on(EVENTS.AI_ANALYSIS_COMPLETED, this.handleAnalysisCompleted.bind(this));
        eventBus.on(EVENTS.AI_ANALYSIS_ERROR, this.handleAnalysisError.bind(this));

        // API request progress events
        eventBus.on(EVENTS.API_REQUEST_STARTED, this.handleAPIRequestStarted.bind(this));
        eventBus.on(EVENTS.API_REQUEST_COMPLETED, this.handleAPIRequestCompleted.bind(this));
        eventBus.on(EVENTS.API_REQUEST_FAILED, this.handleAPIRequestFailed.bind(this));

        // Custom progress events
        eventBus.on('progress:start', this.startProgress.bind(this));
        eventBus.on('progress:update', this.updateProgress.bind(this));
        eventBus.on('progress:complete', this.completeProgress.bind(this));
        eventBus.on('progress:error', this.errorProgress.bind(this));

        console.log('🔗 ProgressTracker event listeners configured');
    }

    /**
     * Create global progress tracker element
     */
    createGlobalTracker() {
        const trackerId = 'global-progress-tracker';
        
        // Remove existing global tracker
        const existing = document.getElementById(trackerId);
        if (existing) {
            existing.remove();
        }

        const tracker = document.createElement('div');
        tracker.id = trackerId;
        tracker.className = 'progress-tracker global-tracker';
        tracker.innerHTML = this.generateTrackerHTML('global', {
            title: 'Processing...',
            message: 'Initializing...',
            progress: 0,
            stage: 'starting'
        });

        // Add to document
        document.body.appendChild(tracker);
        
        this.state.globalTracker = tracker;
        this.hideTracker('global');
        
        console.log('🌐 Global progress tracker created');
    }

    /**
     * Start tracking progress for an operation
     * @param {string} operationId - Unique operation identifier
     * @param {Object} options - Progress options
     * @returns {Object} Tracker control object
     */
    startProgress(operationId, options = {}) {
        try {
            const startTime = Date.now();
            this.performance.startTimes.set(operationId, startTime);

            const trackerConfig = {
                id: operationId,
                title: options.title || 'Processing',
                message: options.message || 'Starting operation...',
                progress: options.initialProgress || 0,
                stage: options.stage || 'starting',
                target: options.target || null,
                showInGlobal: options.showInGlobal !== false,
                autoHide: options.autoHide !== false,
                color: options.color || this.config.colors.primary,
                estimatedDuration: options.estimatedDuration || null,
                metadata: options.metadata || {}
            };

            // Create or update tracker element
            let tracker;
            if (trackerConfig.target) {
                tracker = this.createTargetTracker(trackerConfig);
            } else if (trackerConfig.showInGlobal) {
                tracker = this.updateGlobalTracker(trackerConfig);
            } else {
                tracker = this.createStandaloneTracker(trackerConfig);
            }

            // Store tracker state
            this.state.activeTrackers.set(operationId, {
                ...trackerConfig,
                element: tracker,
                startTime,
                lastUpdate: startTime,
                updates: 0
            });

            this.state.totalOperations++;
            this.showTracker(operationId);

            console.log(`📈 Progress tracking started: ${operationId}`);

            // Emit start event
            eventBus.emit('progress:started', {
                operationId,
                startTime,
                config: trackerConfig
            });

            return this.createTrackerController(operationId);

        } catch (error) {
            console.error(`❌ Failed to start progress tracking for ${operationId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update progress for an operation
     * @param {string} operationId - Operation identifier
     * @param {Object} update - Progress update data
     */
    updateProgress(operationId, update = {}) {
        // Throttle updates for performance
        const now = Date.now();
        if (now - this.state.lastUpdate < this.config.updateThrottle) {
            this.performance.throttledUpdates++;
            return;
        }
        this.state.lastUpdate = now;

        try {
            const tracker = this.state.activeTrackers.get(operationId);
            if (!tracker) {
                console.warn(`⚠️ No tracker found for operation: ${operationId}`);
                return;
            }

            // Update tracker state
            const updatedTracker = {
                ...tracker,
                progress: Math.max(0, Math.min(100, update.progress || tracker.progress)),
                message: update.message || tracker.message,
                stage: update.stage || tracker.stage,
                lastUpdate: now,
                updates: tracker.updates + 1
            };

            // Calculate time estimates
            if (this.config.showTimeEstimate && updatedTracker.progress > 0) {
                const elapsed = now - tracker.startTime;
                const estimatedTotal = (elapsed / updatedTracker.progress) * 100;
                const remaining = Math.max(0, estimatedTotal - elapsed);
                updatedTracker.timeRemaining = remaining;
                updatedTracker.estimatedCompletion = new Date(now + remaining);
            }

            this.state.activeTrackers.set(operationId, updatedTracker);

            // Update UI
            this.updateTrackerDisplay(operationId, updatedTracker);
            this.performance.updateCount++;

            // Emit update event
            eventBus.emit('progress:updated', {
                operationId,
                progress: updatedTracker.progress,
                stage: updatedTracker.stage,
                timeRemaining: updatedTracker.timeRemaining
            });

            console.log(`📊 Progress updated: ${operationId} (${updatedTracker.progress}%)`);

        } catch (error) {
            console.error(`❌ Failed to update progress for ${operationId}:`, error);
        }
    }

    /**
     * Complete progress tracking for an operation
     * @param {string} operationId - Operation identifier
     * @param {Object} completion - Completion data
     */
    completeProgress(operationId, completion = {}) {
        try {
            const tracker = this.state.activeTrackers.get(operationId);
            if (!tracker) {
                console.warn(`⚠️ No tracker found to complete: ${operationId}`);
                return;
            }

            const completionTime = Date.now();
            const duration = completionTime - tracker.startTime;

            // Final update to 100%
            const finalUpdate = {
                progress: 100,
                message: completion.message || 'Completed!',
                stage: 'completed',
                duration,
                result: completion.result || null
            };

            this.updateTrackerDisplay(operationId, { ...tracker, ...finalUpdate });
            this.state.completedOperations++;

            // Auto-hide if configured
            if (tracker.autoHide && this.config.autoHide) {
                setTimeout(() => {
                    this.hideTracker(operationId);
                    this.removeTracker(operationId);
                }, this.config.autoHideDelay);
            }

            // Emit completion event
            eventBus.emit('progress:completed', {
                operationId,
                duration,
                updates: tracker.updates,
                result: completion.result
            });

            console.log(`✅ Progress completed: ${operationId} (${duration}ms)`);

        } catch (error) {
            console.error(`❌ Failed to complete progress for ${operationId}:`, error);
        }
    }

    /**
     * Handle progress error
     * @param {string} operationId - Operation identifier
     * @param {Object} error - Error data
     */
    errorProgress(operationId, error = {}) {
        try {
            const tracker = this.state.activeTrackers.get(operationId);
            if (!tracker) {
                console.warn(`⚠️ No tracker found for error: ${operationId}`);
                return;
            }

            const errorUpdate = {
                ...tracker,
                progress: tracker.progress,
                message: error.message || 'Operation failed',
                stage: 'error',
                error: error.error || true,
                color: this.config.colors.error
            };

            this.updateTrackerDisplay(operationId, errorUpdate);

            // Auto-hide after longer delay for errors
            if (tracker.autoHide && this.config.autoHide) {
                setTimeout(() => {
                    this.hideTracker(operationId);
                    this.removeTracker(operationId);
                }, this.config.autoHideDelay * 2);
            }

            // Emit error event
            eventBus.emit('progress:error', {
                operationId,
                error: error.error,
                message: error.message
            });

            console.log(`❌ Progress error: ${operationId} - ${error.message}`);

        } catch (err) {
            console.error(`❌ Failed to handle progress error for ${operationId}:`, err);
        }
    }

    /**
     * Create target-specific progress tracker
     * @param {Object} config - Tracker configuration
     * @returns {Element} Tracker element
     */
    createTargetTracker(config) {
        const trackerId = `progress-${config.id}`;
        
        // Remove existing tracker in target
        const existing = config.target.querySelector(`#${trackerId}`);
        if (existing) {
            existing.remove();
        }

        const tracker = document.createElement('div');
        tracker.id = trackerId;
        tracker.className = 'progress-tracker target-tracker';
        tracker.innerHTML = this.generateTrackerHTML(config.id, config);

        // Insert at beginning of target
        config.target.insertBefore(tracker, config.target.firstChild);

        return tracker;
    }

    /**
     * Update global progress tracker
     * @param {Object} config - Tracker configuration
     * @returns {Element} Global tracker element
     */
    updateGlobalTracker(config) {
        const tracker = this.state.globalTracker;
        if (tracker) {
            tracker.innerHTML = this.generateTrackerHTML('global', config);
        }
        return tracker;
    }

    /**
     * Create standalone progress tracker
     * @param {Object} config - Tracker configuration
     * @returns {Element} Tracker element
     */
    createStandaloneTracker(config) {
        const trackerId = `progress-${config.id}-standalone`;
        
        const tracker = document.createElement('div');
        tracker.id = trackerId;
        tracker.className = 'progress-tracker standalone-tracker';
        tracker.innerHTML = this.generateTrackerHTML(config.id, config);

        // Position in bottom-right corner
        tracker.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 300px;
        `;

        document.body.appendChild(tracker);

        return tracker;
    }

    /**
     * Generate HTML for progress tracker
     * @param {string} id - Tracker ID
     * @param {Object} config - Tracker configuration
     * @returns {string} HTML string
     */
    generateTrackerHTML(id, config) {
        const progressPercent = Math.max(0, Math.min(100, config.progress || 0));
        const showPercentage = this.config.showPercentage;
        const showStageInfo = this.config.showStageInfo;
        const showTimeEstimate = this.config.showTimeEstimate && config.timeRemaining;

        return `
            <div class="progress-tracker-content">
                <div class="progress-header">
                    <div class="progress-title">
                        ${this.getStageIcon(config.stage)} ${StringUtils.escapeHtml(config.title)}
                    </div>
                    ${showPercentage ? `
                        <div class="progress-percentage">
                            ${Math.round(progressPercent)}%
                        </div>
                    ` : ''}
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-bar" style="
                        height: ${this.config.progressBarHeight};
                        border-radius: ${this.config.progressBarRadius};
                        background: ${this.config.colors.background};
                        overflow: hidden;
                        position: relative;
                    ">
                        <div class="progress-fill" style="
                            width: ${progressPercent}%;
                            height: 100%;
                            background: ${config.color || this.config.colors.primary};
                            border-radius: ${this.config.progressBarRadius};
                            transition: width ${this.config.animationDuration}ms ease;
                            position: relative;
                        ">
                            <div class="progress-shimmer" style="
                                position: absolute;
                                top: 0;
                                left: 0;
                                bottom: 0;
                                right: 0;
                                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                                animation: shimmer 1.5s infinite;
                            "></div>
                        </div>
                    </div>
                </div>
                
                <div class="progress-info">
                    <div class="progress-message">
                        ${StringUtils.escapeHtml(config.message || '')}
                    </div>
                    
                    ${showStageInfo && config.stage ? `
                        <div class="progress-stage">
                            Stage: ${StringUtils.escapeHtml(config.stage)}
                        </div>
                    ` : ''}
                    
                    ${showTimeEstimate ? `
                        <div class="progress-time">
                            ~${this.formatTimeRemaining(config.timeRemaining)} remaining
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Update tracker display
     * @param {string} operationId - Operation identifier
     * @param {Object} tracker - Tracker data
     */
    updateTrackerDisplay(operationId, tracker) {
        if (!tracker.element) return;

        try {
            tracker.element.innerHTML = this.generateTrackerHTML(operationId, tracker);

            // Update colors for different states
            if (tracker.error) {
                tracker.element.classList.add('progress-error');
            } else if (tracker.progress >= 100) {
                tracker.element.classList.add('progress-complete');
            } else {
                tracker.element.classList.remove('progress-error', 'progress-complete');
            }

        } catch (error) {
            console.error(`❌ Failed to update tracker display for ${operationId}:`, error);
        }
    }

    /**
     * Show progress tracker
     * @param {string} operationId - Operation identifier
     */
    showTracker(operationId) {
        const tracker = this.state.activeTrackers.get(operationId);
        if (!tracker || !tracker.element) return;

        tracker.element.style.display = 'block';
        tracker.element.classList.add('progress-visible');
        
        if (operationId === 'global' || tracker.showInGlobal) {
            this.state.isVisible = true;
        }

        // Animate in
        requestAnimationFrame(() => {
            tracker.element.style.opacity = '1';
            tracker.element.style.transform = 'translateY(0)';
        });
    }

    /**
     * Hide progress tracker
     * @param {string} operationId - Operation identifier
     */
    hideTracker(operationId) {
        const tracker = this.state.activeTrackers.get(operationId);
        if (!tracker || !tracker.element) return;

        tracker.element.style.opacity = '0';
        tracker.element.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            if (tracker.element) {
                tracker.element.style.display = 'none';
                tracker.element.classList.remove('progress-visible');
            }
        }, this.config.animationDuration);

        if (operationId === 'global' || tracker.showInGlobal) {
            this.state.isVisible = false;
        }
    }

    /**
     * Remove progress tracker
     * @param {string} operationId - Operation identifier
     */
    removeTracker(operationId) {
        const tracker = this.state.activeTrackers.get(operationId);
        if (!tracker) return;

        // Remove from DOM (except global tracker)
        if (tracker.element && operationId !== 'global') {
            tracker.element.remove();
        }

        // Clean up state
        this.state.activeTrackers.delete(operationId);
        this.performance.startTimes.delete(operationId);

        console.log(`🗑️ Progress tracker removed: ${operationId}`);
    }

    /**
     * Event handlers for AI analysis
     */
    handleAnalysisStarted(data) {
        const operationId = `analysis_${data.bookId}_${data.analysisType}`;
        
        this.startProgress(operationId, {
            title: `AI Analysis: ${data.analysisType}`,
            message: `Starting ${data.analysisType} analysis...`,
            stage: 'preparing',
            showInGlobal: true,
            estimatedDuration: this.getEstimatedDuration(data.analysisType),
            metadata: { bookId: data.bookId, analysisType: data.analysisType }
        });
    }

    handleAnalysisProgress(data) {
        const operationId = `analysis_${data.bookId}_${data.analysisType}`;
        
        this.updateProgress(operationId, {
            progress: data.progress || 0,
            message: data.message || `Processing ${data.analysisType}...`,
            stage: data.stage || 'processing'
        });
    }

    handleAnalysisCompleted(data) {
        const operationId = `analysis_${data.bookId}_${data.analysisType}`;
        
        this.completeProgress(operationId, {
            message: `${data.analysisType} analysis completed!`,
            result: data.result
        });
    }

    handleAnalysisError(data) {
        const operationId = `analysis_${data.bookId}_${data.analysisType}`;
        
        this.errorProgress(operationId, {
            message: `${data.analysisType} analysis failed`,
            error: data.error
        });
    }

    /**
     * Event handlers for API requests
     */
    handleAPIRequestStarted(data) {
        if (data.hideProgress) return;

        const operationId = `api_${data.requestId || Date.now()}`;
        
        this.startProgress(operationId, {
            title: 'API Request',
            message: data.message || 'Making API request...',
            stage: 'sending',
            showInGlobal: false,
            target: data.target || null
        });
    }

    handleAPIRequestCompleted(data) {
        const operationId = `api_${data.requestId || 'unknown'}`;
        
        this.completeProgress(operationId, {
            message: 'Request completed successfully',
            result: data.result
        });
    }

    handleAPIRequestFailed(data) {
        const operationId = `api_${data.requestId || 'unknown'}`;
        
        this.errorProgress(operationId, {
            message: 'API request failed',
            error: data.error
        });
    }

    /**
     * Utility methods
     */
    getStageIcon(stage) {
        const icons = {
            starting: '🚀',
            preparing: '⚙️',
            processing: '⚡',
            analyzing: '🧠',
            completing: '🔄',
            completed: '✅',
            error: '❌',
            waiting: '⏳'
        };
        return icons[stage] || '📊';
    }

    getEstimatedDuration(analysisType) {
        const durations = {
            summary: 45000,      // 45 seconds
            themes: 60000,       // 60 seconds
            characters: 90000,   // 90 seconds
            difficulty: 30000,   // 30 seconds
            sentiment: 45000,    // 45 seconds
            style: 60000         // 60 seconds
        };
        return durations[analysisType] || 60000;
    }

    formatTimeRemaining(milliseconds) {
        if (!milliseconds || milliseconds <= 0) return '0s';
        
        const seconds = Math.ceil(milliseconds / 1000);
        
        if (seconds < 60) {
            return `${seconds}s`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (remainingSeconds === 0) {
            return `${minutes}m`;
        }
        
        return `${minutes}m ${remainingSeconds}s`;
    }

    setupThrottling() {
        // Setup update throttling for performance
        this.throttledUpdate = this.throttle(
            this.updateProgress.bind(this), 
            this.config.updateThrottle
        );
    }

    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    /**
     * Create tracker controller object
     * @param {string} operationId - Operation identifier
     * @returns {Object} Controller object
     */
    createTrackerController(operationId) {
        return {
            success: true,
            operationId,
            
            update: (progress, message, stage) => {
                this.updateProgress(operationId, { progress, message, stage });
            },
            
            complete: (message, result) => {
                this.completeProgress(operationId, { message, result });
            },
            
            error: (error, message) => {
                this.errorProgress(operationId, { error, message });
            },
            
            hide: () => {
                this.hideTracker(operationId);
            },
            
            remove: () => {
                this.removeTracker(operationId);
            },
            
            getState: () => {
                return this.state.activeTrackers.get(operationId);
            }
        };
    }

    /**
     * Public API methods
     */
    getActiveTrackers() {
        return Array.from(this.state.activeTrackers.keys());
    }

    getTrackerState(operationId) {
        return this.state.activeTrackers.get(operationId) || null;
    }

    getOverallProgress() {
        const activeTrackers = Array.from(this.state.activeTrackers.values());
        if (activeTrackers.length === 0) return 0;

        const totalProgress = activeTrackers.reduce((sum, tracker) => {
            return sum + (tracker.progress || 0);
        }, 0);

        return totalProgress / activeTrackers.length;
    }

    getStats() {
        return {
            totalOperations: this.state.totalOperations,
            completedOperations: this.state.completedOperations,
            activeOperations: this.state.activeTrackers.size,
            updateCount: this.performance.updateCount,
            throttledUpdates: this.performance.throttledUpdates,
            isVisible: this.state.isVisible
        };
    }

    getPublicConfig() {
        return {
            autoHide: this.config.autoHide,
            autoHideDelay: this.config.autoHideDelay,
            showPercentage: this.config.showPercentage,
            showTimeEstimate: this.config.showTimeEstimate,
            showStageInfo: this.config.showStageInfo,
            animationDuration: this.config.animationDuration
        };
    }

    /**
     * Clear all active trackers
     */
    clearAll() {
        const activeIds = Array.from(this.state.activeTrackers.keys());
        
        activeIds.forEach(id => {
            this.hideTracker(id);
            this.removeTracker(id);
        });

        console.log('🧹 All progress trackers cleared');
    }

    /**
     * Destroy component and cleanup
     */
    destroy() {
        try {
            // Clear all trackers
            this.clearAll();

            // Remove global tracker
            if (this.state.globalTracker) {
                this.state.globalTracker.remove();
                this.state.globalTracker = null;
            }

            // Remove event listeners
            eventBus.off(EVENTS.AI_ANALYSIS_STARTED, this.handleAnalysisStarted.bind(this));
            eventBus.off(EVENTS.AI_ANALYSIS_PROGRESS, this.handleAnalysisProgress.bind(this));
            eventBus.off(EVENTS.AI_ANALYSIS_COMPLETED, this.handleAnalysisCompleted.bind(this));
            eventBus.off(EVENTS.AI_ANALYSIS_ERROR, this.handleAnalysisError.bind(this));
            eventBus.off(EVENTS.API_REQUEST_STARTED, this.handleAPIRequestStarted.bind(this));
            eventBus.off(EVENTS.API_REQUEST_COMPLETED, this.handleAPIRequestCompleted.bind(this));
            eventBus.off(EVENTS.API_REQUEST_FAILED, this.handleAPIRequestFailed.bind(this));

            // Clear state
            this.state.activeTrackers.clear();
            this.performance.startTimes.clear();

            console.log('🧹 ProgressTracker destroyed and cleaned up');

        } catch (error) {
            console.error('❌ Error during ProgressTracker cleanup:', error);
        }
    }
}

// Export for global access in development/testing
if (typeof window !== 'undefined') {
    window.ProgressTracker = ProgressTracker;
}