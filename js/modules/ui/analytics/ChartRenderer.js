/**
 * ChartRenderer - Reading Analytics Charts Component
 * Integrates perfectly with your existing AnalyticsDataCollector
 * File: js/modules/ui/analytics/ChartRenderer.js
 */

export default class ChartRenderer {
    constructor() {
        this.charts = new Map(); // Store chart instances for cleanup
        this.colors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#27ae60',
            warning: '#f39c12',
            danger: '#e74c3c',
            info: '#3498db',
            light: '#ecf0f1',
            dark: '#2c3e50'
        };
        
        this.currentTheme = 'light';
        this.setupResponsiveHandler();
        
        console.log('📊 ChartRenderer initialized');
    }
    
    setupResponsiveHandler() {
        // Handle window resize for responsive charts
        window.addEventListener('resize', () => {
            this.resizeAllCharts();
        });
    }
    
    /**
     * Render reading progress chart - TDD Test 3.1
     * @param {Array} progressData - Array of {date, totalProgress} or your format
     * @param {String} containerId - Container element ID
     * @returns {Object} - {success: boolean, chartType: string}
     */
    renderProgressChart(progressData, containerId) {
        try {
            console.log(`📈 Rendering progress chart in ${containerId}`);
            
            const container = document.querySelector(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} not found`);
            }
            
            // Create canvas element
            const canvas = this.createChartCanvas(containerId, 'progress-chart');
            
            // Convert your data format to chart format
            const chartData = this.prepareProgressData(progressData);
            
            // Create the chart using Chart.js-like API (simplified version)
            const chart = this.createLineChart(canvas, {
                data: chartData,
                options: {
                    title: 'Reading Progress Over Time',
                    yAxisLabel: 'Progress (%)',
                    xAxisLabel: 'Date',
                    color: this.colors.primary
                }
            });
            
            this.charts.set('progress-chart', chart);
            
            console.log('✅ Progress chart rendered successfully');
            return {
                success: true,
                chartType: 'line'
            };
            
        } catch (error) {
            console.error('❌ Progress chart error:', error);
            return {
                success: false,
                chartType: 'line',
                error: error.message
            };
        }
    }
    
    /**
     * Render reading time heatmap - TDD Test 3.2
     * @param {Array} heatmapData - Array of {date, minutes} or your format
     * @param {String} containerId - Container element ID
     * @returns {Object} - {success: boolean, chartType: string}
     */
    renderReadingHeatmap(heatmapData, containerId) {
        try {
            console.log(`🔥 Rendering heatmap in ${containerId}`);
            
            const container = document.querySelector(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} not found`);
            }
            
            // Create heatmap container
            const heatmapDiv = this.createHeatmapContainer(containerId, 'reading-heatmap');
            
            // Convert your data to heatmap format
            const processedData = this.prepareHeatmapData(heatmapData);
            
            // Create GitHub-style heatmap
            this.createHeatmapGrid(heatmapDiv, processedData);
            
            console.log('✅ Heatmap rendered successfully');
            return {
                success: true,
                chartType: 'heatmap'
            };
            
        } catch (error) {
            console.error('❌ Heatmap error:', error);
            return {
                success: false,
                chartType: 'heatmap',
                error: error.message
            };
        }
    }
    
    /**
     * Render book completion timeline - TDD Test 3.3
     * @param {Array} completionData - Array of {bookTitle, completedDate, wordCount}
     * @param {String} containerId - Container element ID
     * @returns {Object} - {success: boolean, chartType: string}
     */
    renderCompletionTimeline(completionData, containerId) {
        try {
            console.log(`📚 Rendering timeline in ${containerId}`);
            
            const container = document.querySelector(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} not found`);
            }
            
            // Create timeline container
            const timelineDiv = this.createTimelineContainer(containerId, 'completion-timeline');
            
            // Process completion data
            const processedData = this.prepareTimelineData(completionData);
            
            // Create timeline visualization
            this.createTimelineVisualization(timelineDiv, processedData);
            
            console.log('✅ Timeline rendered successfully');
            return {
                success: true,
                chartType: 'timeline'
            };
            
        } catch (error) {
            console.error('❌ Timeline error:', error);
            return {
                success: false,
                chartType: 'timeline',
                error: error.message
            };
        }
    }
    
    /**
     * Make chart responsive - TDD Test 3.4
     * @param {String} containerId - Container element ID
     * @returns {Object} - {success: boolean}
     */
    makeChartResponsive(containerId) {
        try {
            const container = document.querySelector(containerId);
            if (!container) {
                return { success: false, error: 'Container not found' };
            }
            
            // Add responsive classes and styles
            container.style.width = '100%';
            container.style.height = 'auto';
            container.style.minHeight = '300px';
            
            // Setup ResizeObserver if available
            if (window.ResizeObserver) {
                const resizeObserver = new ResizeObserver(() => {
                    this.refreshChart(containerId);
                });
                resizeObserver.observe(container);
            }
            
            return { success: true };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // ========================================================================
    // HELPER METHODS
    // ========================================================================
    
    createChartCanvas(containerId, chartId) {
        const container = document.querySelector(containerId);
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.id = chartId;
        canvas.width = container.offsetWidth || 600;
        canvas.height = 400;
        canvas.style.width = '100%';
        canvas.style.height = '400px';
        
        container.appendChild(canvas);
        return canvas;
    }
    
    createHeatmapContainer(containerId, heatmapId) {
        const container = document.querySelector(containerId);
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create heatmap div
        const heatmapDiv = document.createElement('div');
        heatmapDiv.id = heatmapId;
        heatmapDiv.className = 'reading-heatmap';
        heatmapDiv.style.cssText = `
            width: 100%;
            padding: 20px;
            background: var(--card-background, #ffffff);
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        
        container.appendChild(heatmapDiv);
        return heatmapDiv;
    }
    
    createTimelineContainer(containerId, timelineId) {
        const container = document.querySelector(containerId);
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create timeline div
        const timelineDiv = document.createElement('div');
        timelineDiv.id = timelineId;
        timelineDiv.className = 'completion-timeline';
        timelineDiv.style.cssText = `
            width: 100%;
            padding: 20px;
            background: var(--card-background, #ffffff);
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        
        container.appendChild(timelineDiv);
        return timelineDiv;
    }
    
    prepareProgressData(rawData) {
        // Handle your AnalyticsDataCollector format: progressOverTime array
        if (Array.isArray(rawData) && rawData.length > 0) {
            const sample = rawData[0];
            
            // Your format: {date, words, minutes, books}
            if ('words' in sample) {
                return rawData.map(item => ({
                    date: this.formatDate(item.date),
                    value: item.words || 0,
                    label: `${item.words || 0} words`
                }));
            }
            
            // TDD test format: {date, totalProgress}
            if ('totalProgress' in sample) {
                return rawData.map(item => ({
                    date: this.formatDate(item.date),
                    value: item.totalProgress || 0,
                    label: `${item.totalProgress || 0}%`
                }));
            }
        }
        
        return [];
    }
    
    prepareHeatmapData(rawData) {
        // Handle your format: {date, value, level} or {date, minutes}
        const processedData = {};
        const now = new Date();
        
        // Create 365 days of data
        for (let i = 364; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            processedData[dateStr] = {
                date: dateStr,
                value: 0,
                level: 0
            };
        }
        
        // Fill with actual data
        if (Array.isArray(rawData)) {
            rawData.forEach(item => {
                if (item.date && processedData[item.date]) {
                    const minutes = item.value || item.minutes || 0;
                    processedData[item.date] = {
                        date: item.date,
                        value: minutes,
                        level: this.getHeatmapLevel(minutes)
                    };
                }
            });
        }
        
        return Object.values(processedData);
    }
    
    prepareTimelineData(rawData) {
        if (!Array.isArray(rawData)) return [];
        
        return rawData
            .filter(item => item.completedDate && item.bookTitle)
            .sort((a, b) => new Date(a.completedDate) - new Date(b.completedDate))
            .map(item => ({
                title: item.bookTitle,
                date: this.formatDate(item.completedDate),
                wordCount: item.wordCount || 0,
                displayDate: this.formatDisplayDate(item.completedDate)
            }));
    }
    
    getHeatmapLevel(minutes) {
        if (minutes === 0) return 0;
        if (minutes < 15) return 1;
        if (minutes < 30) return 2;
        if (minutes < 60) return 3;
        return 4;
    }
    
    // ========================================================================
    // VISUALIZATION CREATION METHODS
    // ========================================================================
    
    createLineChart(canvas, config) {
        const ctx = canvas.getContext('2d');
        const data = config.data;
        
        if (data.length === 0) {
            this.drawEmptyChart(ctx, canvas, 'No progress data available');
            return { empty: true };
        }
        
        // Simple line chart implementation
        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate scales
        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const valueRange = maxValue - minValue || 1;
        
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);
        
        // Draw grid lines
        ctx.strokeStyle = '#e1e8ed';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        // Vertical grid lines
        const stepX = chartWidth / (data.length - 1 || 1);
        for (let i = 0; i < data.length; i++) {
            const x = padding + stepX * i;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }
        
        // Draw line
        ctx.strokeStyle = config.options.color || this.colors.primary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
            const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = config.options.color || this.colors.primary;
        data.forEach((point, index) => {
            const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
            const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw labels
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        // X-axis labels (dates)
        data.forEach((point, index) => {
            const x = padding + (chartWidth / (data.length - 1 || 1)) * index;
            ctx.fillText(point.date, x, height - padding + 20);
        });
        
        // Y-axis labels (values)
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = minValue + (valueRange / 5) * (5 - i);
            const y = padding + (chartHeight / 5) * i;
            ctx.fillText(Math.round(value), padding - 10, y + 4);
        }
        
        // Draw title
        ctx.textAlign = 'center';
        ctx.font = '16px Arial';
        ctx.fillText(config.options.title || 'Chart', width / 2, 30);
        
        return { canvas, ctx, data };
    }
    
    createHeatmapGrid(container, data) {
        const title = document.createElement('h3');
        title.textContent = 'Reading Activity Heatmap';
        title.style.cssText = 'margin: 0 0 20px 0; color: var(--text-primary, #2c3e50);';
        container.appendChild(title);
        
        // Create grid container
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(53, 1fr);
            gap: 2px;
            max-width: 100%;
            overflow-x: auto;
        `;
        
        // Color scale
        const colors = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
        
        data.forEach(day => {
            const cell = document.createElement('div');
            cell.style.cssText = `
                width: 12px;
                height: 12px;
                background-color: ${colors[day.level] || colors[0]};
                border-radius: 2px;
                cursor: pointer;
            `;
            cell.title = `${day.date}: ${day.value} minutes`;
            
            // Add hover effect
            cell.addEventListener('mouseenter', () => {
                cell.style.transform = 'scale(1.2)';
                cell.style.zIndex = '10';
            });
            
            cell.addEventListener('mouseleave', () => {
                cell.style.transform = 'scale(1)';
                cell.style.zIndex = '1';
            });
            
            grid.appendChild(cell);
        });
        
        container.appendChild(grid);
        
        // Add legend
        const legend = document.createElement('div');
        legend.style.cssText = 'margin-top: 20px; display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-secondary, #666);';
        legend.innerHTML = `
            <span>Less</span>
            ${colors.map(color => `<div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></div>`).join('')}
            <span>More</span>
        `;
        container.appendChild(legend);
    }
    
    createTimelineVisualization(container, data) {
        const title = document.createElement('h3');
        title.textContent = 'Book Completion Timeline';
        title.style.cssText = 'margin: 0 0 20px 0; color: var(--text-primary, #2c3e50);';
        container.appendChild(title);
        
        if (data.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'No completed books yet. Keep reading!';
            emptyMsg.style.cssText = 'text-align: center; color: var(--text-secondary, #666); font-style: italic;';
            container.appendChild(emptyMsg);
            return;
        }
        
        const timeline = document.createElement('div');
        timeline.style.cssText = 'position: relative; padding-left: 30px;';
        
        // Draw timeline line
        const line = document.createElement('div');
        line.style.cssText = `
            position: absolute;
            left: 15px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, ${this.colors.primary}, ${this.colors.secondary});
        `;
        timeline.appendChild(line);
        
        data.forEach((book, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                position: relative;
                margin-bottom: 30px;
                padding: 15px;
                background: var(--card-background, #ffffff);
                border: 1px solid var(--border-color, #e1e8ed);
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;
            
            // Timeline dot
            const dot = document.createElement('div');
            dot.style.cssText = `
                position: absolute;
                left: -45px;
                top: 20px;
                width: 12px;
                height: 12px;
                background: ${this.colors.success};
                border: 3px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 0 0 2px ${this.colors.success};
            `;
            item.appendChild(dot);
            
            // Book info
            const content = document.createElement('div');
            content.innerHTML = `
                <div style="font-weight: 600; color: var(--text-primary, #2c3e50); margin-bottom: 5px;">
                    📖 ${book.title}
                </div>
                <div style="font-size: 14px; color: var(--text-secondary, #666); margin-bottom: 5px;">
                    Completed: ${book.displayDate}
                </div>
                ${book.wordCount > 0 ? `
                    <div style="font-size: 12px; color: var(--text-secondary, #666);">
                        ${book.wordCount.toLocaleString()} words
                    </div>
                ` : ''}
            `;
            item.appendChild(content);
            
            timeline.appendChild(item);
        });
        
        container.appendChild(timeline);
    }
    
    drawEmptyChart(ctx, canvas, message) {
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }
    
    // ========================================================================
    // UTILITY METHODS
    // ========================================================================
    
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    formatDisplayDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    resizeAllCharts() {
        // Re-render all active charts to handle resize
        this.charts.forEach((chart, id) => {
            if (chart && !chart.empty) {
                const container = document.querySelector(`#${id}`);
                if (container) {
                    this.refreshChart(`#${id}`);
                }
            }
        });
    }
    
    refreshChart(containerId) {
        // Basic refresh implementation
        const container = document.querySelector(containerId);
        if (container) {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                canvas.width = container.offsetWidth || 600;
                canvas.height = 400;
            }
        }
    }
    
    /**
     * Render charts using your AnalyticsDataCollector data
     * @param {Object} analyticsData - Data from your AnalyticsDataCollector.getChartData()
     * @param {String} containerId - Container for all charts
     */
    renderAnalyticsDashboard(analyticsData, containerId) {
        const container = document.querySelector(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return { success: false };
        }
        
        // Create dashboard layout
        container.innerHTML = `
            <div class="analytics-dashboard" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div id="progress-chart-container" style="background: var(--card-background, #fff); padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div id="session-distribution-container" style="background: var(--card-background, #fff); padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
            </div>
            <div id="heatmap-container" style="background: var(--card-background, #fff); padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px;"></div>
            <div id="timeline-container" style="background: var(--card-background, #fff); padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
        `;
        
        // Render individual charts
        try {
            this.renderProgressChart(analyticsData.progressOverTime || [], '#progress-chart-container');
            this.renderSessionDistribution(analyticsData.sessionDistribution || [], '#session-distribution-container');
            this.renderReadingHeatmap(analyticsData.readingHeatmap || [], '#heatmap-container');
            
            // Use completed books for timeline
            const completedBooks = (analyticsData.bookProgress || [])
                .filter(book => book.progress >= 100)
                .map(book => ({
                    bookTitle: book.title,
                    completedDate: new Date().toISOString(), // Placeholder date
                    wordCount: book.wordCount
                }));
            
            this.renderCompletionTimeline(completedBooks, '#timeline-container');
            
            return { success: true };
            
        } catch (error) {
            console.error('Dashboard rendering error:', error);
            return { success: false, error: error.message };
        }
    }
    
    renderSessionDistribution(distributionData, containerId) {
        const container = document.querySelector(containerId);
        if (!container) return;
        
        const title = document.createElement('h3');
        title.textContent = 'Reading Sessions by Time of Day';
        title.style.cssText = 'margin: 0 0 20px 0; color: var(--text-primary, #2c3e50);';
        container.appendChild(title);
        
        if (!Array.isArray(distributionData) || distributionData.length === 0) {
            container.innerHTML += '<p style="text-align: center; color: var(--text-secondary, #666);">No session data available</p>';
            return;
        }
        
        const chart = document.createElement('div');
        chart.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
        
        distributionData.forEach(period => {
            const bar = document.createElement('div');
            bar.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 0;
            `;
            
            const maxCount = Math.max(...distributionData.map(p => p.count));
            const width = (period.count / maxCount) * 100;
            
            bar.innerHTML = `
                <div style="min-width: 80px; font-weight: 500; color: var(--text-primary, #2c3e50);">
                    ${period.period}
                </div>
                <div style="flex: 1; background: var(--border-color, #e1e8ed); border-radius: 4px; height: 20px; position: relative;">
                    <div style="width: ${width}%; height: 100%; background: ${this.colors.primary}; border-radius: 4px; position: relative;">
                        <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: white; font-size: 12px; font-weight: 500;">
                            ${period.count}
                        </span>
                    </div>
                </div>
                <div style="min-width: 40px; text-align: right; font-size: 12px; color: var(--text-secondary, #666);">
                    ${period.percentage}%
                </div>
            `;
            
            chart.appendChild(bar);
        });
        
        container.appendChild(chart);
    }
    
    /**
     * Clean up all charts and event listeners
     */
    destroy() {
        this.charts.clear();
        window.removeEventListener('resize', this.resizeAllCharts);
        console.log('📊 ChartRenderer destroyed');
    }
}

// Make globally available for testing
if (typeof window !== 'undefined') {
    window.ChartRenderer = ChartRenderer;
}