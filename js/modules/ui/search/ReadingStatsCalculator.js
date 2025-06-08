/**
 * AnalyticsDataCollector - Component for Reading Analytics Dashboard
 * Collects and processes reading data from the library
 */
import { DateUtils } from '../../utils/Helpers.js';

export default class AnalyticsDataCollector {
    constructor(library) {
        this.library = library;
        console.log('📊 AnalyticsDataCollector initialized');
    }

    /**
     * Get basic reading statistics
     */
    getBasicStats() {
        const books = this.library.getAllBooks();
        
        if (books.length === 0) {
            return {
                totalBooks: 0,
                totalWords: 0,
                averageProgress: 0,
                readingStatus: {
                    unread: 0,
                    reading: 0,
                    completed: 0
                },
                totalReadingTime: 0,
                booksThisMonth: 0
            };
        }

        const totalWords = books.reduce((sum, book) => sum + (book.wordCount || 0), 0);
        const totalProgress = books.reduce((sum, book) => sum + book.getProgress(), 0);
        const averageProgress = Math.round((totalProgress / books.length) * 100);

        // Categorize books by reading status
        const unread = books.filter(book => book.getProgress() === 0).length;
        const reading = books.filter(book => {
            const progress = book.getProgress();
            return progress > 0 && progress < 1;
        }).length;
        const completed = books.filter(book => book.getProgress() === 1).length;

        // Calculate books added this month
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        
        const booksThisMonth = books.filter(book => {
            const uploadDate = new Date(book.uploadDate);
            return uploadDate >= thisMonth;
        }).length;

        // Estimate total reading time (approximate)
        const estimatedReadingTime = books.reduce((total, book) => {
            const wordsRead = book.wordCount * book.getProgress();
            const estimatedMinutes = wordsRead / 250; // 250 words per minute average
            return total + estimatedMinutes;
        }, 0);

        return {
            totalBooks: books.length,
            totalWords,
            averageProgress,
            readingStatus: {
                unread,
                reading, 
                completed
            },
            totalReadingTime: Math.round(estimatedReadingTime),
            booksThisMonth
        };
    }

    /**
     * Get reading sessions data (simulated for now)
     * In real implementation, this would come from ProgressTracker
     */
    getReadingSessions(days = 30) {
        const books = this.library.getAllBooks();
        const sessions = [];
        
        // Generate simulated sessions based on books with progress or lastRead
        books.forEach(book => {
            if (book.lastRead || book.getProgress() > 0) {
                // Create simulated reading sessions
                const sessionCount = Math.floor(book.getProgress() * 5) + 1; // 1-5 sessions per book
                
                for (let i = 0; i < sessionCount; i++) {
                    const daysAgo = Math.floor(Math.random() * days);
                    const sessionDate = new Date();
                    sessionDate.setDate(sessionDate.getDate() - daysAgo);
                    
                    const wordsInSession = Math.floor((book.wordCount * book.getProgress()) / sessionCount);
                    const estimatedDuration = Math.max(5, Math.floor(wordsInSession / 250) * 60); // Convert to minutes
                    
                    sessions.push({
                        date: sessionDate.toISOString().split('T')[0],
                        bookId: book.id,
                        bookTitle: book.title,
                        duration: estimatedDuration + Math.floor(Math.random() * 10), // Add some variance
                        wordsRead: wordsInSession + Math.floor(Math.random() * 100),
                        startPosition: Math.floor(Math.random() * book.wordCount),
                        endPosition: Math.floor(Math.random() * book.wordCount)
                    });
                }
            }
        });

        // Sort by date (newest first)
        return sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Get reading trends over time
     */
    getReadingTrends(days = 7) {
        const sessions = this.getReadingSessions(days);
        const trends = [];
        
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            
            const daySessions = sessions.filter(session => session.date === dateString);
            
            const totalMinutes = daySessions.reduce((sum, session) => sum + session.duration, 0);
            const wordsRead = daySessions.reduce((sum, session) => sum + session.wordsRead, 0);
            const uniqueBooks = new Set(daySessions.map(session => session.bookId)).size;
            const booksStarted = daySessions.filter(session => session.startPosition === 0).length;
            
            trends.unshift({ // Add to beginning to maintain chronological order
                date: dateString,
                displayDate: DateUtils.formatDate(date.toISOString()),
                totalMinutes,
                wordsRead,
                sessionsCount: daySessions.length,
                uniqueBooks,
                booksStarted
            });
        }
        
        return trends;
    }

    /**
     * Get analytics for a specific book
     */
    getBookAnalytics(bookId) {
        const book = this.library.getBook(bookId);
        if (!book) {
            return null;
        }

        const sessions = this.getReadingSessions(365).filter(session => session.bookId === bookId);
        const totalReadingTime = sessions.reduce((sum, session) => sum + session.duration, 0);
        const averageSessionLength = sessions.length > 0 ? totalReadingTime / sessions.length : 0;
        
        const progress = book.getProgress();
        const wordsRead = book.wordCount * progress;
        const wordsRemaining = book.wordCount - wordsRead;
        
        // Calculate estimated completion time
        const averageSpeed = sessions.length > 0 ? 
            sessions.reduce((sum, session) => sum + (session.wordsRead / session.duration), 0) / sessions.length :
            250; // Default 250 words per minute
            
        const estimatedTimeToComplete = wordsRemaining / averageSpeed;

        return {
            bookId: book.id,
            title: book.title,
            wordCount: book.wordCount,
            progress,
            wordsRead,
            wordsRemaining,
            totalReadingTime,
            sessionsCount: sessions.length,
            averageSessionLength: Math.round(averageSessionLength),
            averageReadingSpeed: Math.round(averageSpeed),
            estimatedTimeToComplete: Math.round(estimatedTimeToComplete),
            lastRead: book.lastRead,
            firstRead: sessions.length > 0 ? sessions[sessions.length - 1].date : null
        };
    }

    /**
     * Get reading patterns and insights
     */
    getReadingInsights() {
        const books = this.library.getAllBooks();
        const sessions = this.getReadingSessions(30);
        
        // Find most productive reading times
        const hourlyDistribution = {};
        sessions.forEach(session => {
            // Simulate hour distribution
            const hour = Math.floor(Math.random() * 24);
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
        });
        
        const mostProductiveHour = Object.entries(hourlyDistribution)
            .sort(([,a], [,b]) => b - a)[0];

        // Calculate reading velocity trends
        const last7Days = this.getReadingTrends(7);
        const last7DaysWords = last7Days.reduce((sum, day) => sum + day.wordsRead, 0);
        const previous7Days = this.getReadingTrends(14).slice(0, 7);
        const previous7DaysWords = previous7Days.reduce((sum, day) => sum + day.wordsRead, 0);
        
        const velocityTrend = last7DaysWords > previous7DaysWords ? 'improving' : 
                             last7DaysWords < previous7DaysWords ? 'declining' : 'stable';

        // Find reading streaks
        const readingDays = sessions.map(s => s.date).filter((date, index, arr) => arr.indexOf(date) === index);
        const streaks = this.calculateStreaks(readingDays);

        return {
            totalSessions: sessions.length,
            averageSessionLength: sessions.length > 0 ? 
                Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length) : 0,
            mostProductiveHour: mostProductiveHour ? {
                hour: parseInt(mostProductiveHour[0]),
                sessions: mostProductiveHour[1]
            } : null,
            velocityTrend,
            currentStreak: streaks.current,
            longestStreak: streaks.longest,
            averageWordsPerDay: Math.round(last7DaysWords / 7),
            favoriteGenres: this.analyzeFavoriteGenres(books),
            readingGoalProgress: this.calculateGoalProgress(books)
        };
    }

    /**
     * Calculate reading streaks from reading days
     */
    calculateStreaks(readingDays) {
        if (readingDays.length === 0) {
            return { current: 0, longest: 0 };
        }

        const sortedDays = readingDays.sort((a, b) => new Date(a) - new Date(b));
        let currentStreak = 1;
        let longestStreak = 1;
        let currentCount = 1;

        for (let i = 1; i < sortedDays.length; i++) {
            const prevDate = new Date(sortedDays[i - 1]);
            const currDate = new Date(sortedDays[i]);
            const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);

            if (dayDiff === 1) {
                currentCount++;
                longestStreak = Math.max(longestStreak, currentCount);
            } else {
                currentCount = 1;
            }
        }

        // Check if current streak is still active (last reading was yesterday or today)
        const lastReadingDate = new Date(sortedDays[sortedDays.length - 1]);
        const today = new Date();
        const daysSinceLastReading = (today - lastReadingDate) / (1000 * 60 * 60 * 24);
        
        currentStreak = daysSinceLastReading <= 1 ? currentCount : 0;

        return { current: currentStreak, longest: longestStreak };
    }

    /**
     * Analyze favorite genres (basic implementation)
     */
    analyzeFavoriteGenres(books) {
        const genres = {};
        books.forEach(book => {
            // Extract genre from categories if available
            const categories = book.categories || [];
            categories.forEach(category => {
                genres[category] = (genres[category] || 0) + 1;
            });
        });

        return Object.entries(genres)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([genre, count]) => ({ genre, count }));
    }

    /**
     * Calculate reading goal progress (example: books per month)
     */
    calculateGoalProgress(books) {
        const monthlyGoal = 2; // Example goal: 2 books per month
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        
        const booksCompletedThisMonth = books.filter(book => {
            // For this example, we'll count books that have been read
            return book.getProgress() === 1;
        }).length;

        return {
            goal: monthlyGoal,
            completed: booksCompletedThisMonth,
            progress: Math.round((booksCompletedThisMonth / monthlyGoal) * 100),
            daysLeft: new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).getDate() - new Date().getDate()
        };
    }

    /**
     * Get summary for dashboard overview
     */
    getDashboardSummary() {
        const basicStats = this.getBasicStats();
        const trends = this.getReadingTrends(7);
        const insights = this.getReadingInsights();
        
        const todaysReading = trends.find(trend => {
            const today = new Date().toISOString().split('T')[0];
            return trend.date === today;
        });

        return {
            ...basicStats,
            todaysReading: {
                minutes: todaysReading?.totalMinutes || 0,
                words: todaysReading?.wordsRead || 0,
                sessions: todaysReading?.sessionsCount || 0
            },
            weeklyTrend: {
                totalMinutes: trends.reduce((sum, day) => sum + day.totalMinutes, 0),
                totalWords: trends.reduce((sum, day) => sum + day.wordsRead, 0),
                averageDaily: Math.round(trends.reduce((sum, day) => sum + day.totalMinutes, 0) / 7)
            },
            insights: {
                currentStreak: insights.currentStreak,
                velocityTrend: insights.velocityTrend,
                goalProgress: insights.readingGoalProgress
            }
        };
    }

    /**
     * Export analytics data for backup/analysis
     */
    exportAnalyticsData() {
        return {
            basicStats: this.getBasicStats(),
            sessions: this.getReadingSessions(365),
            trends: this.getReadingTrends(30),
            insights: this.getReadingInsights(),
            bookAnalytics: this.library.getAllBooks().map(book => this.getBookAnalytics(book.id)),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * Get data formatted for charts
     */
    getChartData() {
        const trends = this.getReadingTrends(30);
        const sessions = this.getReadingSessions(30);
        
        return {
            progressOverTime: trends.map(trend => ({
                date: trend.date,
                words: trend.wordsRead,
                minutes: trend.totalMinutes,
                books: trend.uniqueBooks
            })),
            readingHeatmap: trends.map(trend => ({
                date: trend.date,
                value: trend.totalMinutes,
                level: this.getHeatmapLevel(trend.totalMinutes)
            })),
            sessionDistribution: this.getSessionDistribution(sessions),
            bookProgress: this.library.getAllBooks().map(book => ({
                title: book.title,
                progress: book.getProgress() * 100,
                wordCount: book.wordCount
            }))
        };
    }

    /**
     * Get heatmap intensity level
     */
    getHeatmapLevel(minutes) {
        if (minutes === 0) return 0;
        if (minutes < 15) return 1;
        if (minutes < 30) return 2;
        if (minutes < 60) return 3;
        return 4;
    }

    /**
     * Get session distribution data
     */
    getSessionDistribution(sessions) {
        const distribution = {
            morning: 0,   // 6-12
            afternoon: 0, // 12-18
            evening: 0,   // 18-22
            night: 0      // 22-6
        };

        sessions.forEach(session => {
            // Simulate time of day
            const hour = Math.floor(Math.random() * 24);
            if (hour >= 6 && hour < 12) distribution.morning++;
            else if (hour >= 12 && hour < 18) distribution.afternoon++;
            else if (hour >= 18 && hour < 22) distribution.evening++;
            else distribution.night++;
        });

        return Object.entries(distribution).map(([period, count]) => ({
            period,
            count,
            percentage: sessions.length > 0 ? Math.round((count / sessions.length) * 100) : 0
        }));
    }
}