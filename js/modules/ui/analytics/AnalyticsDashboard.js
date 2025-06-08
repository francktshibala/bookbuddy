/**
 * AnalyticsDashboard - Main Analytics UI Component
 * Integrates ChartRenderer + AnalyticsDataCollector into complete dashboard
 * File: js/modules/ui/analytics/AnalyticsDashboard.js
 */

import { eventBus, EVENTS } from '../../../utils/EventBus.js';
import { DOMUtils, DateUtils } from '../../../utils/Helpers.js';

export default class AnalyticsDashboard {
    constructor(library, chartRenderer = null, analyticsDataCollector = null) {
        this.library = library;
        this.chartRenderer = chartRenderer;
        this.analyticsDataCollector = analyticsDataCollector;
        this.currentTimePeriod = '30days';
        this.isInitialized = false;
        this.container = null;
        
        this.timePeriods = {
            '7days': { label: '7 Days', days: 7 },
            '30days': { label: '30 Days', days: 30 },
            '90days': { label: '3 Months', days: 90 },
            '1year': { label: '1 Year', days: 365 },
            'all': { label: 'All Time', days: null }
        };
        
        this.setupEventListeners();
        console.log('📊 AnalyticsDashboard initialized');
    }
    
    setupEventListeners() {
        // Listen for library changes to refresh analytics
        eventBus.on(EVENTS.BOOK_ADDED, () => this.refreshDashboard());
        eventBus.on(EVENTS.BOOK_UPDATED, () => this.refreshDashboard());
        eventBus.on(EVENTS.BOOK_DELETED, () => this.refreshDashboard());
        
        // Listen for view changes
        eventBus.on(EVENTS.UI_VIEW_CHANGED, (data) => {
            if (data.to === 'analytics' || data.to === 'statistics') {
                this.refreshDashboard();
            }
        });
    }
    
    /**
     * Initialize dashboard - TDD Test 4.1
     * @param {String} containerId - Container element ID
     * @returns {Object} - {success: boolean}
     */
    initialize(containerId) {
        try {
            console.log(`📊 Initializing AnalyticsDashboard in ${containerId}`);
            
            this.container = document.querySelector(containerId);
            if (!this.container) {
                throw new Error(`Container ${containerId} not found`);
            }
            
            // Create dashboard structure
            this.createDashboardStructure();
            
            // Setup event listeners for dashboard controls
            this.setupDashboardEventListeners();
            
            this.isInitialized = true;
            
            console.log('✅ AnalyticsDashboard initialized successfully');
            
            return {
                success: true,
                components: ['header', 'charts', 'stats']
            };
            
        } catch (error) {
            console.error('❌ AnalyticsDashboard initialization error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Render complete dashboard - TDD Test 4.2
     * @returns {Object} - {success: boolean, componentsRendered: Array}
     */
    renderDashboard() {
        try {
            console.log('🎨 Rendering AnalyticsDashboard...');
            
            if (!this.isInitialized) {
                throw new Error('Dashboard not initialized. Call initialize() first.');
            }
            
            // Render overview stats
            this.renderOverviewStats();
            
            // Render charts
            this.renderCharts();
            
            // Render insights
            this.renderInsights();
            
            console.log('✅ Dashboard rendered successfully');
            
            return {
                success: true,
                componentsRendered: ['overview', 'charts', 'insights']
            };
            
        } catch (error) {
            console.error('❌ Dashboard rendering error:', error);
            return {
                success: false,
                error: error.message,
                componentsRendered: []
            };
        }
    }
    
    /**
     * Filter by time period - TDD Test 4.3
     * @param {String} period - Time period ('7days', '30days', etc.)
     * @returns {Object} - {success: boolean, period: string}
     */
    filterByTimePeriod(period) {
        try {
            console.log(`📅 Filtering by time period: ${period}`);
            
            if (!this.timePeriods[period]) {
                throw new Error(`Invalid time period: ${period}`);
            }
            
            this.currentTimePeriod = period;
            
            // Update active filter button
            this.updateFilterButtons(period);
            
            // Re-render dashboard with new time period
            if (this.isInitialized) {
                this.renderDashboard();
            }
            
            console.log(`✅ Time period filter applied: ${period}`);
            
            return {
                success: true,
                period: period
            };
            
        } catch (error) {
            console.error('❌ Time period filter error:', error);
            return {
                success: false,
                error: error.message,
                period: this.currentTimePeriod
            };
        }
    }
    
    /**
     * Update dashboard data - TDD Test 4.4
     * @returns {Object} - {success: boolean, updated: Array}
     */
    updateDashboard() {
        try {
            console.log('🔄 Updating AnalyticsDashboard data...');
            
            const updated = [];
            
            if (this.isInitialized) {
                // Update stats
                this.renderOverviewStats();
                updated.push('stats');
                
                // Update charts
                this.renderCharts();
                updated.push('charts');
                
                // Update insights
                this.renderInsights();
                updated.push('insights');
            }
            
            console.log('✅ Dashboard data updated');
            
            return {
                success: true,
                updated: updated
            };
            
        } catch (error) {
            console.error('❌ Dashboard update error:', error);
            return {
                success: false,
                error: error.message,
                updated: []
            };
        }
    }
    
    // ========================================================================
    // DASHBOARD CREATION METHODS
    // ========================================================================
    
    createDashboardStructure() {
        this.container.innerHTML = `
            <div class="analytics-dashboard">
                <!-- Dashboard Header -->
                <div class="analytics-header" style="margin-bottom: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="margin: 0; color: var(--text-primary, #2c3e50); font-size: 1.75rem;">
                            📊 Reading Analytics
                        </h2>
                        <div class="time-period-filters" style="display: flex; gap: 0.5rem;">
                            ${Object.entries(this.timePeriods).map(([key, config]) => `
                                <button class="filter-btn ${key === this.currentTimePeriod ? 'active' : ''}" 
                                        data-period="${key}"
                                        style="padding: 0.5rem 1rem; border: 1px solid var(--border-color, #e1e8ed); 
                                               background: ${key === this.currentTimePeriod ? 'var(--primary-color, #667eea)' : 'var(--card-background, #ffffff)'};
                                               color: ${key === this.currentTimePeriod ? 'white' : 'var(--text-primary, #2c3e50)'};
                                               border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; transition: all 0.2s;">
                                    ${config.label}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Overview Stats -->
                <div class="analytics-stats" id="overview-stats" style="margin-bottom: 2rem;">
                    <!-- Stats will be rendered here -->
                </div>
                
                <!-- Charts Section -->
                <div class="analytics-charts" id="analytics-charts" style="margin-bottom: 2rem;">
                    <!-- Charts will be rendered here -->
                </div>
                
                <!-- Insights Section -->
                <div class="analytics-insights" id="analytics-insights">
                    <!-- Insights will be rendered here -->
                </div>
            </div>
        `;
    }
    
    setupDashboardEventListeners() {
        // Time period filter buttons
        const filterButtons = this.container.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const period = e.target.dataset.period;
                this.filterByTimePeriod(period);
            });
            
            // Add hover effects
            button.addEventListener('mouseenter', (e) => {
                if (!e.target.classList.contains('active')) {
                    e.target.style.backgroundColor = 'var(--hover-color, #f8f9fa)';
                }
            });
            
            button.addEventListener('mouseleave', (e) => {
                if (!e.target.classList.contains('active')) {
                    e.target.style.backgroundColor = 'var(--card-background, #ffffff)';
                }
            });
        });
    }
    
    updateFilterButtons(activePeriod) {
        const filterButtons = this.container.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            const isActive = button.dataset.period === activePeriod;
            button.classList.toggle('active', isActive);
            
            if (isActive) {
                button.style.backgroundColor = 'var(--primary-color, #667eea)';
                button.style.color = 'white';
            } else {
                button.style.backgroundColor = 'var(--card-background, #ffffff)';
                button.style.color = 'var(--text-primary, #2c3e50)';
            }
        });
    }
    
    // ========================================================================
    // RENDERING METHODS
    // ========================================================================
    
    renderOverviewStats() {
        const statsContainer = this.container.querySelector('#overview-stats');
        if (!statsContainer) return;
        
        // Get data from AnalyticsDataCollector or create mock data
        let stats;
        if (this.analyticsDataCollector) {
            stats = this.analyticsDataCollector.getBasicStats();
        } else {
            // Fallback to library stats
            const books = this.library.getAllBooks();
            stats = {
                totalBooks: books.length,
                totalWords: books.reduce((sum, book) => sum + (book.wordCount || 0), 0),
                averageProgress: books.length > 0 ? Math.round((books.reduce((sum, book) => sum + book.getProgress(), 0) / books.length) * 100) : 0,
                readingStatus: {
                    unread: books.filter(book => book.getProgress() === 0).length,
                    reading: books.filter(book => book.getProgress() > 0 && book.getProgress() < 1).length,
                    completed: books.filter(book => book.getProgress() === 1).length
                }
            };
        }
        
        statsContainer.innerHTML = `
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                <div class="stat-card" style="background: var(--card-background, #ffffff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #e1e8ed);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <div style="font-size: 1.5rem;">📚</div>
                        <div style="color: var(--text-secondary, #666); font-size: 0.875rem; font-weight: 500;">Total Books</div>
                    </div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary, #2c3e50);">${stats.totalBooks}</div>
                </div>
                
                <div class="stat-card" style="background: var(--card-background, #ffffff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #e1e8ed);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <div style="font-size: 1.5rem;">📝</div>
                        <div style="color: var(--text-secondary, #666); font-size: 0.875rem; font-weight: 500;">Total Words</div>
                    </div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary, #2c3e50);">${stats.totalWords.toLocaleString()}</div>
                </div>
                
                <div class="stat-card" style="background: var(--card-background, #ffffff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #e1e8ed);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <div style="font-size: 1.5rem;">📈</div>
                        <div style="color: var(--text-secondary, #666); font-size: 0.875rem; font-weight: 500;">Average Progress</div>
                    </div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--success-color, #27ae60);">${stats.averageProgress}%</div>
                </div>
                
                <div class="stat-card" style="background: var(--card-background, #ffffff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #e1e8ed);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <div style="font-size: 1.5rem;">✅</div>
                        <div style="color: var(--text-secondary, #666); font-size: 0.875rem; font-weight: 500;">Completed Books</div>
                    </div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--primary-color, #667eea);">${stats.readingStatus.completed || 0}</div>
                </div>
            </div>
            
            <!-- Reading Status Breakdown -->
            <div class="reading-status" style="margin-top: 1.5rem; background: var(--card-background, #ffffff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #e1e8ed);">
                <h3 style="margin: 0 0 1rem 0; color: var(--text-primary, #2c3e50); font-size: 1.1rem;">📊 Reading Status Breakdown</h3>
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; background: #e74c3c; border-radius: 50%;"></div>
                        <span style="color: var(--text-secondary, #666); font-size: 0.875rem;">Unread: ${stats.readingStatus.unread || 0}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; background: #f39c12; border-radius: 50%;"></div>
                        <span style="color: var(--text-secondary, #666); font-size: 0.875rem;">Reading: ${stats.readingStatus.reading || 0}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; background: #27ae60; border-radius: 50%;"></div>
                        <span style="color: var(--text-secondary, #666); font-size: 0.875rem;">Completed: ${stats.readingStatus.completed || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCharts() {
        const chartsContainer = this.container.querySelector('#analytics-charts');
        if (!chartsContainer) return;
        
        // Create charts layout
        chartsContainer.innerHTML = `
            <div class="charts-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                <div id="progress-chart-container" style="background: var(--card-background, #ffffff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #e1e8ed); min-height: 300px;"></div>
                <div id="session-distribution-container" style="background: var(--card-background, #ffffff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #e1e8ed); min-height: 300px;"></div>
            </div>
            <div id="heatmap-container" style="background: var(--card-background, #ffffff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #e1e8ed); margin-bottom: 1.5rem; min-height: 200px;"></div>
            <div id="timeline-container" style="background: var(--card-background, #ffffff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #e1e8ed); min-height: 300px;"></div>
        `;
        
        // Render charts if ChartRenderer is available
        if (this.chartRenderer) {
            // Get chart data
            let chartData;
            if (this.analyticsDataCollector) {
                chartData = this.analyticsDataCollector.getChartData();
            } else {
                // Create mock chart data
                chartData = this.createMockChartData();
            }
            
            // Render individual charts
            this.chartRenderer.renderProgressChart(chartData.progressOverTime || [], '#progress-chart-container');
            this.chartRenderer.renderSessionDistribution(chartData.sessionDistribution || [], '#session-distribution-container');
            this.chartRenderer.renderReadingHeatmap(chartData.readingHeatmap || [], '#heatmap-container');
            this.chartRenderer.renderCompletionTimeline(this.getCompletedBooks(), '#timeline-container');
            
        } else {
            // Show placeholder if ChartRenderer not available
            this.renderChartPlaceholders(chartsContainer);
        }
    }
    
    renderInsights() {
        const insightsContainer = this.container.querySelector('#analytics-insights');
        if (!insightsContainer) return;
        
        // Get insights data
        let insights;
        if (this.analyticsDataCollector && typeof this.analyticsDataCollector.getReadingInsights === 'function') {
            insights = this.analyticsDataCollector.getReadingInsights();
        } else {
            insights = this.createMockInsights();
        }
        
        insightsContainer.innerHTML = `
            <div class="insights-section" style="background: var(--card-background, #ffffff); padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #e1e8ed);">
                <h3 style="margin: 0 0 1rem 0; color: var(--text-primary, #2c3e50); font-size: 1.1rem;">💡 Reading Insights</h3>
                
                <div class="insights-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                    <div class="insight-card" style="padding: 1rem; background: var(--background-color, #f8f9fa); border-radius: 0.375rem; border: 1px solid var(--border-color, #e1e8ed);">
                        <div style="font-weight: 600; color: var(--text-primary, #2c3e50); margin-bottom: 0.5rem;">📊 Current Reading Streak</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color, #667eea); margin-bottom: 0.25rem;">${insights.currentStreak || 0} days</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary, #666);">Keep it up! 🔥</div>
                    </div>
                    
                    <div class="insight-card" style="padding: 1rem; background: var(--background-color, #f8f9fa); border-radius: 0.375rem; border: 1px solid var(--border-color, #e1e8ed);">
                        <div style="font-weight: 600; color: var(--text-primary, #2c3e50); margin-bottom: 0.5rem;">📈 Reading Velocity</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success-color, #27ae60); margin-bottom: 0.25rem;">${insights.velocityTrend || 'Stable'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary, #666);">Trend over last week</div>
                    </div>
                    
                    <div class="insight-card" style="padding: 1rem; background: var(--background-color, #f8f9fa); border-radius: 0.375rem; border: 1px solid var(--border-color, #e1e8ed);">
                        <div style="font-weight: 600; color: var(--text-primary, #2c3e50); margin-bottom: 0.5rem;">🏆 Longest Streak</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning-color, #f39c12); margin-bottom: 0.25rem;">${insights.longestStreak || 0} days</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary, #666);">Personal best!</div>
                    </div>
                    
                    <div class="insight-card" style="padding: 1rem; background: var(--background-color, #f8f9fa); border-radius: 0.375rem; border: 1px solid var(--border-color, #e1e8ed);">
                        <div style="font-weight: 600; color: var(--text-primary, #2c3e50); margin-bottom: 0.5rem;">📚 Average Session</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--info-color, #3498db); margin-bottom: 0.25rem;">${insights.averageSessionLength || 0} min</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary, #666);">Per reading session</div>
                    </div>
                </div>
                
                <!-- Goal Progress -->
                ${insights.readingGoalProgress ? `
                    <div class="goal-progress" style="margin-top: 1.5rem; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0.375rem; color: white;">
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">🎯 Monthly Reading Goal</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span>${insights.readingGoalProgress.completed}/${insights.readingGoalProgress.goal} books</span>
                            <span>${insights.readingGoalProgress.progress}%</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); border-radius: 0.25rem; height: 8px; overflow: hidden;">
                            <div style="background: rgba(255,255,255,0.8); height: 100%; width: ${insights.readingGoalProgress.progress}%; border-radius: 0.25rem; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="font-size: 0.875rem; margin-top: 0.5rem; opacity: 0.9;">${insights.readingGoalProgress.daysLeft} days left this month</div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // ========================================================================
    // HELPER METHODS
    // ========================================================================
    
    createMockChartData() {
        // Create mock data that matches your AnalyticsDataCollector format
        const today = new Date();
        const progressOverTime = [];
        const readingHeatmap = [];
        
        // Generate 30 days of mock progress data
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            progressOverTime.push({
                date: dateStr,
                words: Math.floor(Math.random() * 1000) + 200,
                minutes: Math.floor(Math.random() * 60) + 15,
                books: Math.floor(Math.random() * 3) + 1
            });
            
            readingHeatmap.push({
                date: dateStr,
                value: Math.floor(Math.random() * 90),
                level: Math.floor(Math.random() * 5)
            });
        }
        
        return {
            progressOverTime,
            readingHeatmap,
            sessionDistribution: [
                { period: 'Morning', count: 8, percentage: 25 },
                { period: 'Afternoon', count: 12, percentage: 35 },
                { period: 'Evening', count: 10, percentage: 30 },
                { period: 'Night', count: 3, percentage: 10 }
            ],
            bookProgress: this.library.getAllBooks().map(book => ({
                title: book.title,
                progress: Math.round(book.getProgress() * 100),
                wordCount: book.wordCount
            }))
        };
    }
    
    createMockInsights() {
        return {
            currentStreak: 3,
            longestStreak: 7,
            velocityTrend: 'improving',
            averageSessionLength: 25,
            readingGoalProgress: {
                goal: 2,
                completed: 1,
                progress: 50,
                daysLeft: 15
            }
        };
    }
    
    getCompletedBooks() {
        const books = this.library.getAllBooks();
        return books
            .filter(book => book.getProgress() === 1)
            .map(book => ({
                bookTitle: book.title,
                completedDate: book.lastRead || book.uploadDate,
                wordCount: book.wordCount || 0
            }));
    }
    
    renderChartPlaceholders(container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary, #666);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                <h3>Charts Coming Soon!</h3>
                <p>ChartRenderer is not available. Import and initialize ChartRenderer to see beautiful analytics charts.</p>
            </div>
        `;
    }
    
    refreshDashboard() {
        if (this.isInitialized) {
            console.log('🔄 Refreshing analytics dashboard...');
            this.renderDashboard();
        }
    }
    
    /**
     * Setup navigation integration
     * @returns {Object} - {success: boolean}
     */
    setupNavigation() {
        try {
            // This method can be used to integrate with NavigationController
            console.log('🔗 Setting up AnalyticsDashboard navigation integration');
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Navigation setup error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Save analytics data to storage
     * @returns {Object} - {success: boolean}
     */
    saveAnalyticsData() {
        try {
            const analyticsData = {
                currentTimePeriod: this.currentTimePeriod,
                lastUpdated: new Date().toISOString(),
                preferences: {
                    defaultTimePeriod: this.currentTimePeriod
                }
            };
            
            // Use library's storage manager if available
            if (this.library && this.library.storage) {
                const result = this.library.storage.save('analytics_preferences', analyticsData);
                return result;
            }
            
            // Fallback to localStorage
            localStorage.setItem('bookBuddy_analytics', JSON.stringify(analyticsData));
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Save analytics data error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Load analytics data from storage
     * @returns {Object} - {success: boolean}
     */
    loadAnalyticsData() {
        try {
            let analyticsData = null;
            
            // Try library's storage manager first
            if (this.library && this.library.storage) {
                const result = this.library.storage.load('analytics_preferences');
                if (result.success) {
                    analyticsData = result.data;
                }
            }
            
            // Fallback to localStorage
            if (!analyticsData) {
                const stored = localStorage.getItem('bookBuddy_analytics');
                if (stored) {
                    analyticsData = JSON.parse(stored);
                }
            }
            
            // Apply loaded preferences
            if (analyticsData) {
                if (analyticsData.currentTimePeriod) {
                    this.currentTimePeriod = analyticsData.currentTimePeriod;
                }
            }
            
            return { success: true, data: analyticsData };
            
        } catch (error) {
            console.error('❌ Load analytics data error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Export analytics data for backup
     * @returns {String} - JSON string of analytics data
     */
    exportAnalyticsData() {
        try {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                timePeriod: this.currentTimePeriod,
                libraryStats: this.library.getLibraryStats(),
                books: this.library.getAllBooks().map(book => ({
                    id: book.id,
                    title: book.title,
                    progress: book.getProgress(),
                    wordCount: book.wordCount,
                    uploadDate: book.uploadDate,
                    lastRead: book.lastRead
                }))
            };
            
            // Add analytics data if collector is available
            if (this.analyticsDataCollector) {
                exportData.analyticsData = {
                    basicStats: this.analyticsDataCollector.getBasicStats(),
                    chartData: this.analyticsDataCollector.getChartData()
                };
                
                if (typeof this.analyticsDataCollector.getReadingInsights === 'function') {
                    exportData.analyticsData.insights = this.analyticsDataCollector.getReadingInsights();
                }
            }
            
            return JSON.stringify(exportData, null, 2);
            
        } catch (error) {
            console.error('❌ Export analytics data error:', error);
            return null;
        }
    }
    
    /**
     * Get dashboard performance metrics
     * @returns {Object} - Performance metrics
     */
    getPerformanceMetrics() {
        return {
            isInitialized: this.isInitialized,
            currentTimePeriod: this.currentTimePeriod,
            hasChartRenderer: !!this.chartRenderer,
            hasAnalyticsCollector: !!this.analyticsDataCollector,
            containerFound: !!this.container,
            booksCount: this.library ? this.library.getAllBooks().length : 0,
            renderTime: this.lastRenderTime || 0
        };
    }
    
    /**
     * Cleanup dashboard resources
     */
    destroy() {
        console.log('🗑️ Cleaning up AnalyticsDashboard...');
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Remove event listeners
        eventBus.off(EVENTS.BOOK_ADDED);
        eventBus.off(EVENTS.BOOK_UPDATED);
        eventBus.off(EVENTS.BOOK_DELETED);
        eventBus.off(EVENTS.UI_VIEW_CHANGED);
        
        // Cleanup chart renderer if available
        if (this.chartRenderer && typeof this.chartRenderer.destroy === 'function') {
            this.chartRenderer.destroy();
        }
        
        // Reset state
        this.isInitialized = false;
        this.container = null;
        
        console.log('✅ AnalyticsDashboard cleanup completed');
    }
}

// Make globally available for testing
if (typeof window !== 'undefined') {
    window.AnalyticsDashboard = AnalyticsDashboard;
}