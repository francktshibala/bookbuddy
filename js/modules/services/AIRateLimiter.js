/**
 * AIRateLimiter - Advanced rate limiting and request queue management for OpenAI API
 * Handles request/token limits, cost control, model-specific limits, and intelligent queueing
 */

export default class AIRateLimiter {
    constructor(config = {}) {
        // Default OpenAI API limits (conservative estimates)
        this.defaultLimits = {
            'gpt-4': {
                requestsPerMinute: 200,
                tokensPerMinute: 10000,
                requestsPerDay: 10000,
                tokensPerDay: 300000,
                costPerToken: 0.00003
            },
            'gpt-4-turbo': {
                requestsPerMinute: 500,
                tokensPerMinute: 30000,
                requestsPerDay: 10000,
                tokensPerDay: 2000000,
                costPerToken: 0.00001
            },
            'gpt-3.5-turbo': {
                requestsPerMinute: 3500,
                tokensPerMinute: 90000,
                requestsPerDay: 10000,
                tokensPerDay: 2000000,
                costPerToken: 0.000002
            }
        };

        // Configuration
        this.config = {
            // Model-specific limits (can override defaults)
            modelLimits: config.modelLimits || {},
            
            // Global fallback limits
            defaultRequestsPerMinute: config.defaultRequestsPerMinute || 60,
            defaultTokensPerMinute: config.defaultTokensPerMinute || 10000,
            
            // Cost control
            costLimits: {
                perMinute: config.costLimits?.perMinute || 0.50,   // $0.50 per minute
                perHour: config.costLimits?.perHour || 5.00,      // $5 per hour
                perDay: config.costLimits?.perDay || 50.00,       // $50 per day
                perRequest: config.costLimits?.perRequest || 1.00  // $1 per request max
            },
            
            // Queue settings
            enableQueue: config.enableQueue !== false,
            maxQueueSize: config.maxQueueSize || 100,
            queueTimeout: config.queueTimeout || 30000, // 30 seconds
            priorityLevels: config.priorityLevels || ['high', 'normal', 'low'],
            
            // Burst and smoothing
            burstAllowance: config.burstAllowance || 10,
            burstWindowMs: config.burstWindowMs || 5000,
            enableSmoothing: config.enableSmoothing || false,
            targetInterval: config.targetInterval || 1000,
            
            // Adaptive behavior
            adaptiveRates: config.adaptiveRates || false,
            errorThreshold: config.errorThreshold || 0.1, // 10% error rate
            
            // Time windows
            windowType: config.windowType || 'sliding', // 'sliding' or 'fixed'
            
            // User-specific limits
            userLimits: config.userLimits || {},
            defaultUserTier: config.defaultUserTier || 'basic',
            
            // Features
            features: {
                enableQueueing: config.features?.enableQueueing !== false,
                enableBursts: config.features?.enableBursts !== false,
                enableAdaptiveRates: config.features?.enableAdaptiveRates || false,
                enableCostTracking: config.features?.enableCostTracking !== false,
                enableMetrics: config.features?.enableMetrics !== false
            },
            
            // Monitoring
            monitoring: {
                alertThresholds: {
                    usage: config.monitoring?.alertThresholds?.usage || 0.8,
                    errors: config.monitoring?.alertThresholds?.errors || 0.1,
                    queueSize: config.monitoring?.alertThresholds?.queueSize || 50
                },
                enableLogging: config.monitoring?.enableLogging !== false
            }
        };

        // Internal state
        this.state = {
            // Request tracking
            requests: new Map(), // keyed by model
            tokens: new Map(),   // keyed by model
            costs: [],
            
            // Queue management
            queue: [],
            processing: false,
            
            // Window tracking
            windows: {
                second: new Map(),
                minute: new Map(), 
                hour: new Map(),
                day: new Map()
            },
            
            // Performance metrics
            metrics: {
                totalRequests: 0,
                totalTokens: 0,
                totalCost: 0,
                averageLatency: 0,
                errorRate: 0,
                queueWaitTimes: []
            },
            
            // Adaptive state
            adaptive: {
                currentRates: new Map(),
                errorCounts: new Map(),
                lastAdjustment: Date.now()
            },
            
            // Alerts
            alerts: [],
            lastCleanup: Date.now()
        };

        // Initialize model tracking
        this.initializeModelTracking();
        
        // Start background processes
        this.startQueueProcessor();
        this.startCleanupProcess();
        
        console.log('🚦 AIRateLimiter initialized with advanced features');
    }

    /**
     * Initialize tracking for all configured models
     */
    initializeModelTracking() {
        const allModels = new Set([
            ...Object.keys(this.defaultLimits),
            ...Object.keys(this.config.modelLimits)
        ]);

        for (const model of allModels) {
            this.state.requests.set(model, []);
            this.state.tokens.set(model, []);
            
            if (this.config.adaptiveRates) {
                this.state.adaptive.currentRates.set(model, this.getModelLimits(model));
                this.state.adaptive.errorCounts.set(model, []);
            }
        }
    }

    /**
     * Get effective limits for a specific model
     */
    getModelLimits(model) {
        const defaultLimits = this.defaultLimits[model] || {
            requestsPerMinute: this.config.defaultRequestsPerMinute,
            tokensPerMinute: this.config.defaultTokensPerMinute,
            costPerToken: 0.000002
        };

        const configLimits = this.config.modelLimits[model] || {};
        
        return { ...defaultLimits, ...configLimits };
    }

    /**
     * Check if a request can be processed immediately
     */
    async checkRequest(request) {
        const now = Date.now();
        const model = request.model || 'gpt-3.5-turbo';
        const tokens = request.tokens || 0;
        const userId = request.userId || 'default';

        try {
            // Get applicable limits
            const limits = this.getEffectiveLimits(model, userId);
            
            // Check all rate limiting conditions
            const checks = {
                requests: this.checkRequestRate(model, limits, now),
                tokens: this.checkTokenRate(model, tokens, limits, now),
                cost: await this.checkCostLimits(request, now),
                burst: this.checkBurstLimits(model, now),
                user: this.checkUserLimits(userId, now)
            };

            // Determine if request is allowed
            const allowed = Object.values(checks).every(check => check.allowed);
            
            // Calculate retry time if blocked
            const retryAfter = allowed ? 0 : this.calculateRetryTime(checks, now);
            
            // Determine blocking reason
            const reason = allowed ? null : this.getBlockingReason(checks);

            const result = {
                allowed,
                reason,
                retryAfter,
                remainingRequests: checks.requests.remaining,
                remainingTokens: checks.tokens.remaining,
                remainingBudget: checks.cost.remaining,
                queueSize: this.state.queue.length,
                estimatedQueueTime: this.estimateQueueTime()
            };

            // Log check if monitoring enabled
            if (this.config.monitoring.enableLogging) {
                console.log(`🚦 Rate check for ${model}: ${allowed ? 'ALLOWED' : 'BLOCKED'} - ${reason || 'OK'}`);
            }

            return result;

        } catch (error) {
            console.error('❌ Rate limiting check error:', error);
            return {
                allowed: false,
                reason: 'Rate limiter error',
                retryAfter: 60,
                error: error.message
            };
        }
    }

    /**
     * Process a request (record usage and update state)
     */
    async makeRequest(request) {
        const checkResult = await this.checkRequest(request);
        
        if (!checkResult.allowed) {
            // Update metrics for blocked request
            this.updateErrorMetrics(request.model, 'rate_limited');
            return {
                success: false,
                processed: false,
                ...checkResult
            };
        }

        try {
            // Record the request
            await this.recordRequest(request);
            
            // Update metrics
            this.updateSuccessMetrics(request);
            
            // Check for alerts
            this.checkAlertConditions();

            return {
                success: true,
                processed: true,
                timestamp: Date.now(),
                model: request.model,
                tokens: request.tokens,
                cost: request.estimatedCost || 0
            };

        } catch (error) {
            console.error('❌ Request processing error:', error);
            this.updateErrorMetrics(request.model, 'processing_error');
            
            return {
                success: false,
                processed: false,
                error: error.message
            };
        }
    }

    /**
     * Queue a request for later processing
     */
    async queueRequest(request) {
        if (!this.config.enableQueue) {
            return {
                success: false,
                queued: false,
                reason: 'Queueing disabled'
            };
        }

        if (this.state.queue.length >= this.config.maxQueueSize) {
            return {
                success: false,
                queued: false,
                rejected: true,
                reason: 'Queue full'
            };
        }

        const queueItem = {
            ...request,
            id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            queuedAt: Date.now(),
            priority: request.priority || 'normal',
            timeout: Date.now() + this.config.queueTimeout
        };

        // Insert with priority ordering
        this.insertWithPriority(queueItem);

        console.log(`📋 Queued request: ${queueItem.id} (${queueItem.priority} priority)`);

        return {
            success: true,
            queued: true,
            queueId: queueItem.id,
            position: this.getQueuePosition(queueItem.id),
            estimatedWait: this.estimateQueueTime()
        };
    }

    /**
     * Request with automatic fallback to other models
     */
    async requestWithFallback(request) {
        const preferredModel = request.preferredModel || request.model;
        const fallbackModels = request.fallbackModels || [];

        // Try preferred model first
        let result = await this.makeRequest({
            ...request,
            model: preferredModel
        });

        if (result.success) {
            return {
                ...result,
                actualModel: preferredModel,
                usedFallback: false
            };
        }

        // Try fallback models
        for (const fallbackModel of fallbackModels) {
            result = await this.makeRequest({
                ...request,
                model: fallbackModel
            });

            if (result.success) {
                console.log(`🔄 Used fallback model: ${fallbackModel} (preferred: ${preferredModel})`);
                return {
                    ...result,
                    actualModel: fallbackModel,
                    usedFallback: true,
                    fallbackReason: 'Preferred model rate limited'
                };
            }
        }

        // If all models failed, try queueing with preferred model
        if (this.config.enableQueue) {
            const queueResult = await this.queueRequest({
                ...request,
                model: preferredModel
            });

            if (queueResult.success) {
                return {
                    success: true,
                    processed: false,
                    queued: true,
                    actualModel: preferredModel,
                    ...queueResult
                };
            }
        }

        return {
            success: false,
            processed: false,
            reason: 'All models rate limited and queue unavailable'
        };
    }

    /**
     * Check request rate limits for a model
     */
    checkRequestRate(model, limits, now) {
        const modelRequests = this.state.requests.get(model) || [];
        const recentRequests = modelRequests.filter(req => now - req.timestamp < 60000);
        
        const allowed = recentRequests.length < limits.requestsPerMinute;
        const remaining = Math.max(0, limits.requestsPerMinute - recentRequests.length);

        return { allowed, remaining, limit: limits.requestsPerMinute };
    }

    /**
     * Check token rate limits for a model
     */
    checkTokenRate(model, requestTokens, limits, now) {
        const modelTokens = this.state.tokens.get(model) || [];
        const recentTokens = modelTokens.filter(entry => now - entry.timestamp < 60000)
            .reduce((sum, entry) => sum + entry.tokens, 0);
        
        const allowed = (recentTokens + requestTokens) <= limits.tokensPerMinute;
        const remaining = Math.max(0, limits.tokensPerMinute - recentTokens);

        return { allowed, remaining, limit: limits.tokensPerMinute };
    }

    /**
     * Check cost limits across all time windows
     */
    async checkCostLimits(request, now) {
        if (!this.config.features.enableCostTracking) {
            return { allowed: true, remaining: Infinity };
        }

        const estimatedCost = request.estimatedCost || 0;
        
        // Check per-request limit
        if (estimatedCost > this.config.costLimits.perRequest) {
            return {
                allowed: false,
                remaining: 0,
                reason: 'Request cost exceeds per-request limit'
            };
        }

        // Check time-based limits
        const costs = {
            minute: this.getCostInWindow(now - 60000, now),
            hour: this.getCostInWindow(now - 3600000, now),
            day: this.getCostInWindow(now - 86400000, now)
        };

        const limits = this.config.costLimits;
        
        if (costs.minute + estimatedCost > limits.perMinute) {
            return { allowed: false, remaining: limits.perMinute - costs.minute, reason: 'Minute cost limit' };
        }
        
        if (costs.hour + estimatedCost > limits.perHour) {
            return { allowed: false, remaining: limits.perHour - costs.hour, reason: 'Hour cost limit' };
        }
        
        if (costs.day + estimatedCost > limits.perDay) {
            return { allowed: false, remaining: limits.perDay - costs.day, reason: 'Day cost limit' };
        }

        return {
            allowed: true,
            remaining: Math.min(
                limits.perMinute - costs.minute,
                limits.perHour - costs.hour,
                limits.perDay - costs.day
            )
        };
    }

    /**
     * Check burst limits
     */
    checkBurstLimits(model, now) {
        if (!this.config.features.enableBursts) {
            return { allowed: true };
        }

        const modelRequests = this.state.requests.get(model) || [];
        const burstWindow = now - this.config.burstWindowMs;
        const burstRequests = modelRequests.filter(req => req.timestamp > burstWindow);

        const allowed = burstRequests.length < this.config.burstAllowance;
        
        return { allowed, burstUsed: burstRequests.length, burstLimit: this.config.burstAllowance };
    }

    /**
     * Check user-specific limits
     */
    checkUserLimits(userId, now) {
        const userConfig = this.config.userLimits[userId];
        if (!userConfig) {
            return { allowed: true };
        }

        // Implementation would check user-specific request/token/cost limits
        // For now, return allowed
        return { allowed: true };
    }

    /**
     * Get effective limits considering user tier and model
     */
    getEffectiveLimits(model, userId) {
        const baseLimits = this.getModelLimits(model);
        const userConfig = this.config.userLimits[userId];
        
        if (!userConfig) {
            return baseLimits;
        }

        // Apply user-specific multipliers or overrides
        return {
            ...baseLimits,
            requestsPerMinute: userConfig.requestsPerMinute || baseLimits.requestsPerMinute,
            tokensPerMinute: userConfig.tokensPerMinute || baseLimits.tokensPerMinute
        };
    }

    /**
     * Record a successful request
     */
    async recordRequest(request) {
        const now = Date.now();
        const model = request.model || 'gpt-3.5-turbo';
        const tokens = request.tokens || 0;
        const cost = request.estimatedCost || 0;

        // Record request
        const modelRequests = this.state.requests.get(model) || [];
        modelRequests.push({ timestamp: now, tokens, cost });
        this.state.requests.set(model, modelRequests);

        // Record tokens
        const modelTokens = this.state.tokens.get(model) || [];
        modelTokens.push({ timestamp: now, tokens });
        this.state.tokens.set(model, modelTokens);

        // Record cost
        if (cost > 0) {
            this.state.costs.push({ timestamp: now, amount: cost, model });
        }

        // Update metrics
        this.state.metrics.totalRequests++;
        this.state.metrics.totalTokens += tokens;
        this.state.metrics.totalCost += cost;

        // Cleanup old entries
        this.cleanupOldEntries(model);
    }

    /**
     * Background queue processor
     */
    startQueueProcessor() {
        if (!this.config.enableQueue) return;

        const processQueue = async () => {
            if (this.state.processing || this.state.queue.length === 0) {
                return;
            }

            this.state.processing = true;

            try {
                // Remove expired items
                const now = Date.now();
                this.state.queue = this.state.queue.filter(item => item.timeout > now);

                // Process items in priority order
                for (let i = 0; i < this.state.queue.length; i++) {
                    const item = this.state.queue[i];
                    const result = await this.checkRequest(item);

                    if (result.allowed) {
                        // Remove from queue and process
                        this.state.queue.splice(i, 1);
                        await this.recordRequest(item);
                        
                        // Emit processed event (if callback provided)
                        if (item.onProcessed) {
                            item.onProcessed({
                                success: true,
                                processed: true,
                                waitTime: now - item.queuedAt
                            });
                        }

                        console.log(`✅ Processed queued request: ${item.id}`);
                        break; // Process one item per cycle
                    }
                }

            } catch (error) {
                console.error('❌ Queue processing error:', error);
            } finally {
                this.state.processing = false;
            }
        };

        // Process queue every second
        setInterval(processQueue, 1000);
    }

    /**
     * Background cleanup process
     */
    startCleanupProcess() {
        const cleanup = () => {
            const now = Date.now();
            
            // Only cleanup every 5 minutes
            if (now - this.state.lastCleanup < 300000) {
                return;
            }

            try {
                // Cleanup old request records (keep last 24 hours)
                const cutoff = now - 86400000;
                
                for (const [model, requests] of this.state.requests) {
                    const filtered = requests.filter(req => req.timestamp > cutoff);
                    this.state.requests.set(model, filtered);
                }

                for (const [model, tokens] of this.state.tokens) {
                    const filtered = tokens.filter(entry => entry.timestamp > cutoff);
                    this.state.tokens.set(model, filtered);
                }

                // Cleanup old costs
                this.state.costs = this.state.costs.filter(cost => cost.timestamp > cutoff);

                // Cleanup old alerts
                this.state.alerts = this.state.alerts.filter(alert => 
                    now - alert.timestamp < 3600000 // Keep alerts for 1 hour
                );

                this.state.lastCleanup = now;
                console.log('🧹 Rate limiter cleanup completed');

            } catch (error) {
                console.error('❌ Cleanup error:', error);
            }
        };

        // Cleanup every 5 minutes
        setInterval(cleanup, 300000);
    }

    /**
     * Helper methods
     */
    
    cleanupOldEntries(model) {
        const now = Date.now();
        const cutoff = now - 3600000; // Keep last hour

        const requests = this.state.requests.get(model) || [];
        this.state.requests.set(model, requests.filter(req => req.timestamp > cutoff));

        const tokens = this.state.tokens.get(model) || [];
        this.state.tokens.set(model, tokens.filter(entry => entry.timestamp > cutoff));
    }

    insertWithPriority(queueItem) {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const itemPriority = priorityOrder[queueItem.priority] || 2;

        let insertIndex = this.state.queue.length;
        
        for (let i = 0; i < this.state.queue.length; i++) {
            const existingPriority = priorityOrder[this.state.queue[i].priority] || 2;
            if (itemPriority > existingPriority) {
                insertIndex = i;
                break;
            }
        }

        this.state.queue.splice(insertIndex, 0, queueItem);
    }

    getQueuePosition(queueId) {
        return this.state.queue.findIndex(item => item.id === queueId) + 1;
    }

    estimateQueueTime() {
        // Estimate based on current processing rate
        return this.state.queue.length * 1000; // 1 second per item estimate
    }

    getCostInWindow(startTime, endTime) {
        return this.state.costs
            .filter(cost => cost.timestamp >= startTime && cost.timestamp <= endTime)
            .reduce((sum, cost) => sum + cost.amount, 0);
    }

    calculateRetryTime(checks, now) {
        const retryTimes = [];

        if (!checks.requests.allowed) {
            retryTimes.push(60 - ((now % 60000) / 1000)); // Seconds until next minute
        }

        if (!checks.tokens.allowed) {
            retryTimes.push(60 - ((now % 60000) / 1000));
        }

        if (!checks.cost.allowed) {
            retryTimes.push(60); // Conservative 1 minute for cost limits
        }

        return Math.ceil(Math.min(...retryTimes, 300)); // Max 5 minutes
    }

    getBlockingReason(checks) {
        if (!checks.requests.allowed) return 'Request rate limit exceeded';
        if (!checks.tokens.allowed) return 'Token rate limit exceeded';
        if (!checks.cost.allowed) return checks.cost.reason || 'Cost limit exceeded';
        if (!checks.burst.allowed) return 'Burst limit exceeded';
        if (!checks.user.allowed) return 'User limit exceeded';
        return 'Rate limited';
    }

    updateSuccessMetrics(request) {
        // Update adaptive rates if enabled
        if (this.config.adaptiveRates) {
            const model = request.model || 'gpt-3.5-turbo';
            const errorCounts = this.state.adaptive.errorCounts.get(model) || [];
            
            // Add success (false = no error)
            errorCounts.push({ timestamp: Date.now(), error: false });
            this.state.adaptive.errorCounts.set(model, errorCounts);
        }
    }

    updateErrorMetrics(model, errorType) {
        if (this.config.adaptiveRates) {
            const errorCounts = this.state.adaptive.errorCounts.get(model) || [];
            
            // Add error (true = error)
            errorCounts.push({ timestamp: Date.now(), error: true, type: errorType });
            this.state.adaptive.errorCounts.set(model, errorCounts);

            // Check if we need to adjust rates
            this.checkAdaptiveRateAdjustment(model);
        }
    }

    checkAdaptiveRateAdjustment(model) {
        const now = Date.now();
        const fiveMinutesAgo = now - 300000;
        
        const errorCounts = this.state.adaptive.errorCounts.get(model) || [];
        const recentEvents = errorCounts.filter(event => event.timestamp > fiveMinutesAgo);
        
        if (recentEvents.length < 10) return; // Need sufficient data

        const errorRate = recentEvents.filter(event => event.error).length / recentEvents.length;
        
        if (errorRate > this.config.errorThreshold) {
            // Reduce rate by 20%
            const currentLimits = this.state.adaptive.currentRates.get(model);
            const newLimits = {
                ...currentLimits,
                requestsPerMinute: Math.floor(currentLimits.requestsPerMinute * 0.8),
                tokensPerMinute: Math.floor(currentLimits.tokensPerMinute * 0.8)
            };
            
            this.state.adaptive.currentRates.set(model, newLimits);
            console.log(`📉 Reduced rate for ${model} due to high error rate (${Math.round(errorRate * 100)}%)`);
        }
    }

    checkAlertConditions() {
        const now = Date.now();
        const thresholds = this.config.monitoring.alertThresholds;

        // Check usage threshold
        const totalRequests = Array.from(this.state.requests.values())
            .flat()
            .filter(req => now - req.timestamp < 60000).length;
        
        const maxRequestsPerMinute = Math.max(...Array.from(this.state.requests.keys())
            .map(model => this.getModelLimits(model).requestsPerMinute));
        
        const usageRate = totalRequests / maxRequestsPerMinute;
        
        if (usageRate > thresholds.usage) {
            this.addAlert({
                type: 'usage_threshold',
                severity: 'warning',
                message: `Usage at ${Math.round(usageRate * 100)}%`,
                timestamp: now
            });
        }

        // Check queue size
        if (this.state.queue.length > thresholds.queueSize) {
            this.addAlert({
                type: 'queue_size',
                severity: 'warning',
                message: `Queue size: ${this.state.queue.length}`,
                timestamp: now
            });
        }
    }

    addAlert(alert) {
        // Avoid duplicate alerts within 5 minutes
        const fiveMinutesAgo = Date.now() - 300000;
        const existingAlert = this.state.alerts.find(a => 
            a.type === alert.type && a.timestamp > fiveMinutesAgo
        );

        if (!existingAlert) {
            this.state.alerts.push(alert);
            console.log(`🚨 Alert: ${alert.type} - ${alert.message}`);
        }
    }

    /**
     * Public API methods for getting status and statistics
     */

    getRateStatus(model = null) {
        const now = Date.now();
        
        if (model) {
            const requests = this.state.requests.get(model) || [];
            const recentRequests = requests.filter(req => now - req.timestamp < 60000);
            const limits = this.getModelLimits(model);
            
            return {
                model,
                requestsUsed: recentRequests.length,
                requestsRemaining: Math.max(0, limits.requestsPerMinute - recentRequests.length),
                tokensUsed: recentRequests.reduce((sum, req) => sum + (req.tokens || 0), 0),
                tokensRemaining: Math.max(0, limits.tokensPerMinute - recentRequests.reduce((sum, req) => sum + (req.tokens || 0), 0)),
                currentRate: recentRequests.length,
                windowResetTime: now + (60000 - (now % 60000))
            };
        }

        // Global status
        const allRequests = Array.from(this.state.requests.values()).flat()
            .filter(req => now - req.timestamp < 60000);
        
        return {
            globalRequestsUsed: allRequests.length,
            queueSize: this.state.queue.length,
            totalCost: this.state.metrics.totalCost,
            activeModels: Array.from(this.state.requests.keys()).filter(model => 
                (this.state.requests.get(model) || []).some(req => now - req.timestamp < 60000)
            )
        };
    }

    getQueueStatus() {
        return {
            queueSize: this.state.queue.length,
            isProcessing: this.state.processing,
            estimatedWaitTime: this.estimateQueueTime(),
            priorityBreakdown: this.getPriorityBreakdown()
        };
    }

    getPriorityBreakdown() {
        const breakdown = { high: 0, normal: 0, low: 0 };
        this.state.queue.forEach(item => {
            breakdown[item.priority] = (breakdown[item.priority] || 0) + 1;
        });
        return breakdown;
    }

    getCostStatus() {
        const now = Date.now();
        return {
            totalCost: this.state.metrics.totalCost,
            minuteCost: this.getCostInWindow(now - 60000, now),
            hourCost: this.getCostInWindow(now - 3600000, now),
            dayCost: this.getCostInWindow(now - 86400000, now),
            remainingBudgets: {
                minute: Math.max(0, this.config.costLimits.perMinute - this.getCostInWindow(now - 60000, now)),
                hour: Math.max(0, this.config.costLimits.perHour - this.getCostInWindow(now - 3600000, now)),
                day: Math.max(0, this.config.costLimits.perDay - this.getCostInWindow(now - 86400000, now))
            }
        };
    }

    getModelStatus(model) {
        const now = Date.now();
        const requests = this.state.requests.get(model) || [];
        const recentRequests = requests.filter(req => now - req.timestamp < 60000);
        const limits = this.getModelLimits(model);
        
        return {
            model,
            requestsUsed: recentRequests.length,
            requestsRemaining: Math.max(0, limits.requestsPerMinute - recentRequests.length),
            tokensUsed: recentRequests.reduce((sum, req) => sum + (req.tokens || 0), 0),
            tokensRemaining: Math.max(0, limits.tokensPerMinute - recentRequests.reduce((sum, req) => sum + (req.tokens || 0), 0)),
            costUsed: recentRequests.reduce((sum, req) => sum + (req.cost || 0), 0),
            averageTokensPerRequest: recentRequests.length > 0 
                ? Math.round(recentRequests.reduce((sum, req) => sum + (req.tokens || 0), 0) / recentRequests.length)
                : 0,
            isActive: recentRequests.length > 0
        };
    }

    getQueueOrder() {
        return this.state.queue.map((item, index) => ({
            id: item.id,
            priority: item.priority,
            model: item.model,
            tokens: item.tokens,
            queuedAt: item.queuedAt,
            position: index + 1,
            waitTime: Date.now() - item.queuedAt,
            estimatedProcessTime: this.estimateQueueTime() - (index * 1000)
        }));
    }

    getWindowStats() {
        const now = Date.now();
        const windows = {
            second: { requests: 0, tokens: 0 },
            minute: { requests: 0, tokens: 0 },
            hour: { requests: 0, tokens: 0 }
        };

        // Aggregate across all models
        for (const [model, requests] of this.state.requests) {
            const secondRequests = requests.filter(r => r.timestamp > now - 1000);
            const minuteRequests = requests.filter(r => r.timestamp > now - 60000);
            const hourRequests = requests.filter(r => r.timestamp > now - 3600000);

            windows.second.requests += secondRequests.length;
            windows.second.tokens += secondRequests.reduce((sum, r) => sum + (r.tokens || 0), 0);
            
            windows.minute.requests += minuteRequests.length;
            windows.minute.tokens += minuteRequests.reduce((sum, r) => sum + (r.tokens || 0), 0);
            
            windows.hour.requests += hourRequests.length;
            windows.hour.tokens += hourRequests.reduce((sum, r) => sum + (r.tokens || 0), 0);
        }

        return {
            windows: ['second', 'minute', 'hour'],
            currentSecond: windows.second,
            currentMinute: windows.minute,
            currentHour: windows.hour,
            windowType: this.config.windowType
        };
    }

    getActiveAlerts() {
        const now = Date.now();
        return this.state.alerts.filter(alert => now - alert.timestamp < 3600000); // Last hour
    }

    getFeatureStatus() {
        return {
            queueingEnabled: this.config.features.enableQueueing,
            burstsEnabled: this.config.features.enableBursts,
            adaptiveRatesEnabled: this.config.features.enableAdaptiveRates,
            costTrackingEnabled: this.config.features.enableCostTracking,
            metricsEnabled: this.config.features.enableMetrics,
            smoothingEnabled: this.config.enableSmoothing
        };
    }

    getHealthMetrics() {
        const now = Date.now();
        const recentRequests = Array.from(this.state.requests.values())
            .flat()
            .filter(req => now - req.timestamp < 3600000); // Last hour

        return {
            uptime: now - (this.state.startTime || now),
            totalRequests: this.state.metrics.totalRequests,
            totalTokens: this.state.metrics.totalTokens,
            totalCost: parseFloat(this.state.metrics.totalCost.toFixed(6)),
            averageLatency: this.state.metrics.averageLatency,
            errorRate: this.calculateErrorRate(),
            queueHealth: {
                currentSize: this.state.queue.length,
                maxSize: this.config.maxQueueSize,
                utilizationPercent: Math.round((this.state.queue.length / this.config.maxQueueSize) * 100),
                averageWaitTime: this.calculateAverageWaitTime()
            },
            memoryUsage: this.estimateMemoryUsage(),
            alertCount: this.state.alerts.filter(a => now - a.timestamp < 3600000).length
        };
    }

    calculateErrorRate() {
        if (!this.config.adaptiveRates) return 0;

        const now = Date.now();
        const allErrors = Array.from(this.state.adaptive.errorCounts.values())
            .flat()
            .filter(event => now - event.timestamp < 3600000); // Last hour

        if (allErrors.length === 0) return 0;

        const errorCount = allErrors.filter(event => event.error).length;
        return Math.round((errorCount / allErrors.length) * 100) / 100; // Return as decimal
    }

    calculateAverageWaitTime() {
        if (this.state.metrics.queueWaitTimes.length === 0) return 0;
        
        const sum = this.state.metrics.queueWaitTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.state.metrics.queueWaitTimes.length);
    }

    estimateMemoryUsage() {
        // Rough estimation in MB
        let totalEntries = 0;
        
        for (const requests of this.state.requests.values()) {
            totalEntries += requests.length;
        }
        
        for (const tokens of this.state.tokens.values()) {
            totalEntries += tokens.length;
        }
        
        totalEntries += this.state.costs.length;
        totalEntries += this.state.queue.length;
        totalEntries += this.state.alerts.length;

        return Math.round((totalEntries * 0.0005 + 2) * 100) / 100; // ~0.5KB per entry + 2MB base
    }

    /**
     * Configuration and management methods
     */

    updateConfiguration(newConfig) {
        try {
            // Merge new configuration
            this.config = {
                ...this.config,
                ...newConfig,
                costLimits: { ...this.config.costLimits, ...newConfig.costLimits },
                features: { ...this.config.features, ...newConfig.features },
                monitoring: { ...this.config.monitoring, ...newConfig.monitoring }
            };

            // Reinitialize model tracking if model limits changed
            if (newConfig.modelLimits) {
                this.initializeModelTracking();
            }

            console.log('⚙️ Rate limiter configuration updated');
            
            return { success: true, message: 'Configuration updated successfully' };
        } catch (error) {
            console.error('❌ Configuration update error:', error);
            return { success: false, message: error.message };
        }
    }

    resetCostTracking(window = 'all') {
        const now = Date.now();
        
        switch (window) {
            case 'minute':
                this.state.costs = this.state.costs.filter(cost => cost.timestamp <= now - 60000);
                break;
            case 'hour':
                this.state.costs = this.state.costs.filter(cost => cost.timestamp <= now - 3600000);
                break;
            case 'day':
                this.state.costs = this.state.costs.filter(cost => cost.timestamp <= now - 86400000);
                break;
            case 'all':
                this.state.costs = [];
                this.state.metrics.totalCost = 0;
                break;
        }

        console.log(`💰 Cost tracking reset for window: ${window}`);
        return { success: true, message: `Cost tracking reset for ${window}` };
    }

    resetAllLimits() {
        // Clear all tracked requests, tokens, costs
        for (const model of this.state.requests.keys()) {
            this.state.requests.set(model, []);
            this.state.tokens.set(model, []);
        }
        
        this.state.costs = [];
        this.state.queue = [];
        this.state.alerts = [];
        
        // Reset metrics
        this.state.metrics = {
            totalRequests: 0,
            totalTokens: 0,
            totalCost: 0,
            averageLatency: 0,
            errorRate: 0,
            queueWaitTimes: []
        };

        console.log('🔄 All rate limits and tracking reset');
        return { success: true, message: 'All limits reset successfully' };
    }

    pauseProcessing() {
        this.state.processing = true; // This will pause queue processing
        console.log('⏸️ Rate limiter processing paused');
        return { success: true, message: 'Processing paused' };
    }

    resumeProcessing() {
        this.state.processing = false;
        console.log('▶️ Rate limiter processing resumed');
        return { success: true, message: 'Processing resumed' };
    }

    clearQueue() {
        const clearedCount = this.state.queue.length;
        this.state.queue = [];
        console.log(`🗑️ Cleared ${clearedCount} items from queue`);
        return { success: true, message: `Cleared ${clearedCount} queued requests` };
    }

    /**
     * Export data for analysis and debugging
     */
    exportLimiterData() {
        const now = Date.now();
        
        return {
            metadata: {
                exportedAt: new Date(now).toISOString(),
                uptime: now - (this.state.startTime || now),
                version: '1.0.0'
            },
            configuration: {
                ...this.config,
                // Don't export sensitive data
                userLimits: Object.keys(this.config.userLimits || {}).length
            },
            currentStatus: {
                global: this.getRateStatus(),
                models: Array.from(this.state.requests.keys()).map(model => this.getModelStatus(model)),
                queue: this.getQueueStatus(),
                costs: this.getCostStatus(),
                windows: this.getWindowStats(),
                health: this.getHealthMetrics()
            },
            alerts: this.getActiveAlerts(),
            features: this.getFeatureStatus(),
            statistics: {
                requestsByModel: this.getRequestsByModel(),
                costsByModel: this.getCostsByModel(),
                errorsByType: this.getErrorsByType(),
                queueStatistics: this.getQueueStatistics()
            }
        };
    }

    /**
     * Statistics helper methods
     */
    getRequestsByModel() {
        const stats = {};
        const now = Date.now();
        
        for (const [model, requests] of this.state.requests) {
            const recentRequests = requests.filter(req => now - req.timestamp < 86400000); // Last 24 hours
            stats[model] = {
                total: recentRequests.length,
                tokens: recentRequests.reduce((sum, req) => sum + (req.tokens || 0), 0),
                cost: recentRequests.reduce((sum, req) => sum + (req.cost || 0), 0)
            };
        }
        
        return stats;
    }

    getCostsByModel() {
        const stats = {};
        const now = Date.now();
        const recentCosts = this.state.costs.filter(cost => now - cost.timestamp < 86400000);
        
        for (const cost of recentCosts) {
            if (!stats[cost.model]) {
                stats[cost.model] = { total: 0, count: 0 };
            }
            stats[cost.model].total += cost.amount;
            stats[cost.model].count += 1;
        }
        
        return stats;
    }

    getErrorsByType() {
        if (!this.config.adaptiveRates) return {};
        
        const stats = {};
        const now = Date.now();
        
        for (const [model, errorCounts] of this.state.adaptive.errorCounts) {
            const recentErrors = errorCounts.filter(event => 
                event.error && now - event.timestamp < 86400000
            );
            
            stats[model] = {};
            for (const error of recentErrors) {
                const type = error.type || 'unknown';
                stats[model][type] = (stats[model][type] || 0) + 1;
            }
        }
        
        return stats;
    }

    getQueueStatistics() {
        return {
            currentSize: this.state.queue.length,
            maxSize: this.config.maxQueueSize,
            averageWaitTime: this.calculateAverageWaitTime(),
            priorityDistribution: this.getPriorityBreakdown(),
            timeoutRate: this.calculateTimeoutRate()
        };
    }

    calculateTimeoutRate() {
        // This would need to be tracked over time in a real implementation
        return 0; // Placeholder
    }

    /**
     * Advanced user methods
     */
    async checkUserRequest(request) {
        const userId = request.userId || 'default';
        const userLimits = this.getEffectiveLimits(request.model, userId);
        
        return await this.checkRequest({
            ...request,
            _userLimits: userLimits
        });
    }

    setUserLimits(userId, limits) {
        this.config.userLimits[userId] = limits;
        console.log(`👤 Updated limits for user: ${userId}`);
        return { success: true, message: `User limits updated for ${userId}` };
    }

    getUserStatus(userId) {
        const now = Date.now();
        const userRequests = [];
        
        // Collect all requests for this user across all models
        for (const [model, requests] of this.state.requests) {
            const modelRequests = requests.filter(req => 
                req.userId === userId && now - req.timestamp < 60000
            );
            userRequests.push(...modelRequests);
        }
        
        const userLimits = this.config.userLimits[userId] || {};
        
        return {
            userId,
            tier: userLimits.tier || this.config.defaultUserTier,
            requestsUsed: userRequests.length,
            tokensUsed: userRequests.reduce((sum, req) => sum + (req.tokens || 0), 0),
            costUsed: userRequests.reduce((sum, req) => sum + (req.cost || 0), 0),
            limits: userLimits,
            isActive: userRequests.length > 0
        };
    }

    /**
     * Monitoring and observability
     */
    enableMonitoring(callback) {
        this.monitoringCallback = callback;
        console.log('📊 Monitoring enabled');
    }

    disableMonitoring() {
        this.monitoringCallback = null;
        console.log('📊 Monitoring disabled');
    }

    emitMetrics() {
        if (this.monitoringCallback) {
            const metrics = {
                timestamp: Date.now(),
                rates: this.getRateStatus(),
                queue: this.getQueueStatus(),
                costs: this.getCostStatus(),
                health: this.getHealthMetrics(),
                alerts: this.getActiveAlerts()
            };
            
            this.monitoringCallback(metrics);
        }
    }

    /**
     * Cleanup and shutdown
     */
    shutdown() {
        console.log('🛑 AIRateLimiter shutting down...');
        
        // Clear intervals (if we stored references)
        // clearInterval(this.queueProcessorInterval);
        // clearInterval(this.cleanupInterval);
        
        // Clear state
        this.state.queue = [];
        this.state.processing = false;
        
        // Export final statistics
        const finalStats = this.exportLimiterData();
        console.log('📊 Final statistics:', {
            totalRequests: finalStats.currentStatus.health.totalRequests,
            totalCost: finalStats.currentStatus.health.totalCost,
            uptime: finalStats.metadata.uptime
        });
        
        return { success: true, message: 'Rate limiter shutdown complete', finalStats };
    }
}

// Helper function for testing and development
export function createRateLimiterProfile(profileName) {
    const profiles = {
        development: {
            defaultRequestsPerMinute: 10,
            defaultTokensPerMinute: 2000,
            costLimits: { perDay: 1.00, perHour: 0.25, perMinute: 0.05 },
            enableQueue: true,
            maxQueueSize: 20,
            monitoring: { enableLogging: true }
        },
        testing: {
            defaultRequestsPerMinute: 100,
            defaultTokensPerMinute: 10000,
            costLimits: { perDay: 5.00, perHour: 1.00, perMinute: 0.20 },
            enableQueue: true,
            maxQueueSize: 50,
            features: { enableAdaptiveRates: true }
        },
        production: {
            defaultRequestsPerMinute: 500,
            defaultTokensPerMinute: 50000,
            costLimits: { perDay: 100.00, perHour: 10.00, perMinute: 2.00 },
            enableQueue: true,
            maxQueueSize: 200,
            features: { 
                enableAdaptiveRates: true,
                enableMetrics: true,
                enableBursts: true
            },
            monitoring: { 
                enableLogging: true,
                alertThresholds: { usage: 0.8, errors: 0.05, queueSize: 150 }
            }
        },
        enterprise: {
            defaultRequestsPerMinute: 2000,
            defaultTokensPerMinute: 200000,
            costLimits: { perDay: 1000.00, perHour: 100.00, perMinute: 10.00 },
            enableQueue: true,
            maxQueueSize: 1000,
            features: {
                enableAdaptiveRates: true,
                enableMetrics: true,
                enableBursts: true,
                enableCostTracking: true
            },
            burstAllowance: 50,
            userLimits: {
                'premium': { requestsPerMinute: 1000, tokensPerMinute: 100000 },
                'standard': { requestsPerMinute: 200, tokensPerMinute: 20000 },
                'basic': { requestsPerMinute: 50, tokensPerMinute: 5000 }
            }
        }
    };

    return profiles[profileName] || profiles.development;
}