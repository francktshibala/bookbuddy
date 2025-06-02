/**
 * BookCoverManager - Component 10.2
 * Handles book cover image loading, caching, fallbacks, and lazy loading
 */
import { DOMUtils, AsyncUtils } from '../../utils/Helpers.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';

export default class BookCoverManager {
    constructor() {
        this.cache = new Map(); // Image cache
        this.loadingQueue = new Set(); // Track images being loaded
        this.observerInstance = null; // Intersection Observer for lazy loading
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        this.maxCacheSize = 100; // Maximum cached images
        
        // Image size configurations
        this.imageSizes = {
            thumbnail: { width: 128, height: 192, quality: 'thumbnail' },
            small: { width: 200, height: 300, quality: 'small' },
            medium: { width: 300, height: 450, quality: 'medium' },
            large: { width: 400, height: 600, quality: 'large' }
        };
        
        // Fallback images
        this.fallbackImages = {
            default: this.generateFallbackImage('📚', '#2563eb'),
            loading: this.generateFallbackImage('⏳', '#64748b'),
            error: this.generateFallbackImage('❌', '#ef4444'),
            noImage: this.generateFallbackImage('📖', '#94a3b8')
        };
        
        this.setupLazyLoading();
        this.setupStorageCleanup();
        
        console.log('📖 BookCoverManager initialized');
    }

    /**
     * Get book cover with caching and fallback support
     */
    async getCover(bookData, size = 'thumbnail', options = {}) {
        const {
            lazy = false,
            placeholder = true,
            fallback = 'default',
            forceRefresh = false
        } = options;

        try {
            // Extract image URLs from book data
            const imageUrls = this.extractImageUrls(bookData);
            const bestUrl = this.selectBestImage(imageUrls, size);
            
            if (!bestUrl) {
                return this.getFallbackImage(fallback);
            }

            // Create cache key
            const cacheKey = this.createCacheKey(bestUrl, size);
            
            // Check cache first (unless force refresh)
            if (!forceRefresh) {
                const cachedImage = this.getCachedImage(cacheKey);
                if (cachedImage) {
                    console.log(`📦 Using cached cover: ${bookData.title}`);
                    return cachedImage;
                }
            }

            // Return placeholder for lazy loading
            if (lazy && placeholder) {
                this.queueLazyLoad(bestUrl, size, cacheKey);
                return this.getFallbackImage('loading');
            }

            // Load image immediately
            return await this.loadAndCacheImage(bestUrl, size, cacheKey, bookData.title);

        } catch (error) {
            console.error('❌ Error getting book cover:', error);
            return this.getFallbackImage('error');
        }
    }

    /**
     * Load multiple covers in batch
     */
    async loadCoversInBatch(books, size = 'thumbnail', options = {}) {
        const { 
            batchSize = 5,
            delay = 100,
            onProgress = null
        } = options;

        console.log(`📚 Loading ${books.length} covers in batches of ${batchSize}`);
        
        const results = new Map();
        const batches = this.createBatches(books, batchSize);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`📦 Processing batch ${i + 1}/${batches.length}`);
            
            // Process batch concurrently
            const batchPromises = batch.map(async (book) => {
                try {
                    const cover = await this.getCover(book, size, { lazy: false });
                    results.set(book.id, cover);
                    return { bookId: book.id, success: true, cover };
                } catch (error) {
                    const fallback = this.getFallbackImage('error');
                    results.set(book.id, fallback);
                    return { bookId: book.id, success: false, error: error.message, cover: fallback };
                }
            });
            
            await Promise.all(batchPromises);
            
            // Progress callback
            if (onProgress) {
                const processed = (i + 1) * batchSize;
                const total = books.length;
                onProgress(Math.min(processed, total), total, results);
            }
            
            // Small delay between batches
            if (i < batches.length - 1) {
                await AsyncUtils.delay(delay);
            }
        }
        
        console.log(`✅ Loaded ${results.size} covers`);
        return results;
    }

    /**
     * Setup lazy loading with Intersection Observer
     */
    setupLazyLoading() {
        if (!('IntersectionObserver' in window)) {
            console.warn('⚠️ Intersection Observer not supported, lazy loading disabled');
            return;
        }

        this.observerInstance = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                rootMargin: '50px',
                threshold: 0.1
            }
        );

        console.log('👁️ Lazy loading setup complete');
    }

    /**
     * Handle intersection observer entries
     */
    async handleIntersection(entries) {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                const img = entry.target;
                const { url, size, cacheKey, title } = img.dataset;
                
                if (url && !this.loadingQueue.has(cacheKey)) {
                    try {
                        this.loadingQueue.add(cacheKey);
                        const coverData = await this.loadAndCacheImage(url, size, cacheKey, title);
                        
                        // Update image element
                        if (coverData.success) {
                            img.src = coverData.url;
                            img.classList.add('loaded');
                        }
                        
                    } catch (error) {
                        console.error('❌ Lazy load failed:', error);
                        img.src = this.getFallbackImage('error').url;
                    } finally {
                        this.loadingQueue.delete(cacheKey);
                        this.observerInstance.unobserve(img);
                    }
                }
            }
        }
    }

    /**
     * Create image element with lazy loading support
     */
    createImageElement(bookData, size = 'thumbnail', options = {}) {
        const {
            className = 'book-cover',
            alt = bookData.title || 'Book cover',
            lazy = true,
            onClick = null
        } = options;

        const img = document.createElement('img');
        img.className = className;
        img.alt = alt;
        
        if (lazy) {
            // Setup lazy loading
            const imageUrls = this.extractImageUrls(bookData);
            const bestUrl = this.selectBestImage(imageUrls, size);
            
            if (bestUrl) {
                const cacheKey = this.createCacheKey(bestUrl, size);
                
                // Set placeholder
                img.src = this.getFallbackImage('loading').url;
                
                // Store data for lazy loading
                img.dataset.url = bestUrl;
                img.dataset.size = size;
                img.dataset.cacheKey = cacheKey;
                img.dataset.title = bookData.title;
                
                // Start observing
                this.observerInstance.observe(img);
            } else {
                img.src = this.getFallbackImage('noImage').url;
            }
        } else {
            // Load immediately
            this.getCover(bookData, size, { lazy: false }).then(coverData => {
                img.src = coverData.url;
                img.classList.add('loaded');
            });
        }

        // Click handler
        if (onClick) {
            img.addEventListener('click', () => onClick(bookData, img));
        }

        return img;
    }

    /**
     * Preload covers for better performance
     */
    async preloadCovers(books, size = 'thumbnail') {
        console.log(`🚀 Preloading ${books.length} covers`);
        
        const preloadPromises = books.map(book => 
            this.getCover(book, size, { lazy: false, placeholder: false })
        );
        
        const results = await Promise.allSettled(preloadPromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        console.log(`✅ Preloaded ${successful}/${books.length} covers`);
        return results;
    }

    /**
     * Load and cache image
     */
    async loadAndCacheImage(url, size, cacheKey, title = 'Unknown') {
        try {
            console.log(`🖼️ Loading cover: ${title}`);
            
            const img = new Image();
            img.crossOrigin = 'anonymous'; // For CORS support
            
            const loadPromise = new Promise((resolve, reject) => {
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Image load failed'));
                
                // Set timeout for slow images
                setTimeout(() => reject(new Error('Image load timeout')), 10000);
            });
            
            img.src = url;
            await loadPromise;
            
            // Create cover data
            const coverData = {
                url: url,
                width: img.width,
                height: img.height,
                size: size,
                timestamp: Date.now(),
                success: true
            };
            
            // Cache the result
            this.cacheImage(cacheKey, coverData);
            
            console.log(`✅ Loaded cover: ${title} (${img.width}x${img.height})`);
            return coverData;
            
        } catch (error) {
            console.warn(`⚠️ Failed to load cover for ${title}:`, error.message);
            
            const fallbackData = this.getFallbackImage('error');
            this.cacheImage(cacheKey, { ...fallbackData, success: false });
            
            return fallbackData;
        }
    }

    /**
     * Extract image URLs from book data
     */
    extractImageUrls(bookData) {
        const urls = {};
        
        // Google Books image links
        if (bookData.imageLinks) {
            urls.thumbnail = bookData.imageLinks.thumbnail;
            urls.smallThumbnail = bookData.imageLinks.smallThumbnail;
            urls.small = bookData.imageLinks.small;
            urls.medium = bookData.imageLinks.medium;
            urls.large = bookData.imageLinks.large;
        }
        
        // Direct image properties
        urls.thumbnail = urls.thumbnail || bookData.thumbnail;
        urls.small = urls.small || bookData.smallThumbnail;
        urls.medium = urls.medium || bookData.mediumThumbnail;
        urls.large = urls.large || bookData.largeThumbnail;
        
        // Clean up undefined values
        Object.keys(urls).forEach(key => {
            if (!urls[key]) delete urls[key];
        });
        
        return urls;
    }

    /**
     * Select best image for requested size
     */
    selectBestImage(imageUrls, requestedSize) {
        // Size priority order
        const sizeOrder = {
            thumbnail: ['thumbnail', 'smallThumbnail', 'small', 'medium', 'large'],
            small: ['small', 'medium', 'thumbnail', 'large', 'smallThumbnail'],
            medium: ['medium', 'large', 'small', 'thumbnail', 'smallThumbnail'],
            large: ['large', 'medium', 'small', 'thumbnail', 'smallThumbnail']
        };
        
        const priorities = sizeOrder[requestedSize] || sizeOrder.thumbnail;
        
        for (const size of priorities) {
            if (imageUrls[size]) {
                return imageUrls[size];
            }
        }
        
        return null;
    }


/**
 * Generate fallback images (SVG data URLs) - FIXED VERSION
 */
generateFallbackImage(emoji, color = '#64748b', size = 128) {
    try {
        // Use simple text instead of emoji to avoid encoding issues
        const fallbackText = this.getSimpleFallbackText(emoji);
        
        const svg = `<svg width="${size}" height="${Math.round(size * 1.5)}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="${color}" opacity="0.1"/>
            <text x="50%" y="50%" text-anchor="middle" dy="0.3em" 
                  font-size="${size * 0.3}" font-family="Arial, sans-serif" fill="${color}">
                ${fallbackText}
            </text>
        </svg>`;
        
        // Use encodeURIComponent instead of btoa to avoid Latin1 issues
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        
        return {
            url: dataUrl,
            width: size,
            height: Math.round(size * 1.5),
            isFallback: true,
            success: true
        };
    } catch (error) {
        console.warn('⚠️ Fallback image generation failed, using simple placeholder:', error);
        
        // Ultra-simple fallback if SVG generation fails
        return {
            url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="192"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="14" fill="#6b7280">No Image</text></svg>')}`,
            width: size,
            height: Math.round(size * 1.5),
            isFallback: true,
            success: true
        };
    }
}

/**
 * Get simple text alternatives for emojis
 */
getSimpleFallbackText(emoji) {
    const textMap = {
        '📚': 'BOOK',
        '⏳': 'LOAD',
        '❌': 'ERROR', 
        '📖': 'READ'
    };
    
    return textMap[emoji] || 'BOOK';
}

    /**
     * Cache management
     */
    createCacheKey(url, size) {
        return `${size}:${url}`;
    }

    cacheImage(key, data) {
        // Remove oldest entries if cache is full
        if (this.cache.size >= this.maxCacheSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, {
            ...data,
            cachedAt: Date.now()
        });
    }

    getCachedImage(key) {
        const cached = this.cache.get(key);
        
        if (!cached) return null;
        
        // Check if expired
        if (Date.now() - cached.cachedAt > this.cacheExpiry) {
            this.cache.delete(key);
            return null;
        }
        
        return cached;
    }

    getFallbackImage(type = 'default') {
        return this.fallbackImages[type] || this.fallbackImages.default;
    }

    /**
     * Utility methods
     */
    createBatches(array, size) {
        const batches = [];
        for (let i = 0; i < array.length; i += size) {
            batches.push(array.slice(i, i + size));
        }
        return batches;
    }

    queueLazyLoad(url, size, cacheKey) {
        // This could be enhanced with a priority queue
        console.log(`📋 Queued for lazy load: ${cacheKey}`);
    }

    setupStorageCleanup() {
        // Clean up expired cache entries periodically
        setInterval(() => {
            const now = Date.now();
            let cleaned = 0;
            
            for (const [key, data] of this.cache.entries()) {
                if (now - data.cachedAt > this.cacheExpiry) {
                    this.cache.delete(key);
                    cleaned++;
                }
            }
            
            if (cleaned > 0) {
                console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
            }
        }, 60000); // Check every minute
    }

    /**
     * Get cover manager statistics
     */
    getStats() {
        const cacheEntries = Array.from(this.cache.values());
        const successfulEntries = cacheEntries.filter(entry => entry.success);
        
        return {
            cacheSize: this.cache.size,
            maxCacheSize: this.maxCacheSize,
            successfulEntries: successfulEntries.length,
            failedEntries: cacheEntries.length - successfulEntries.length,
            cacheHitRate: this.calculateCacheHitRate(),
            loadingQueue: this.loadingQueue.size,
            lazyLoadingEnabled: !!this.observerInstance
        };
    }

    calculateCacheHitRate() {
        // This would need request tracking to be accurate
        return 'Not implemented';
    }

    /**
     * Clear cache
     */
    clearCache() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`🧹 Cleared ${size} cached images`);
        return size;
    }

    /**
     * Destroy instance and cleanup
     */
    destroy() {
        if (this.observerInstance) {
            this.observerInstance.disconnect();
        }
        this.clearCache();
        this.loadingQueue.clear();
        console.log('🗑️ BookCoverManager destroyed');
    }
}