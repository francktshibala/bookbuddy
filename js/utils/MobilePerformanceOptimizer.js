/**
 * Mobile Performance Optimizer - Removes heavy DOM operations on mobile
 */
export class MobilePerformanceOptimizer {
    static optimizeForMobile() {
        // Remove expensive CSS properties
        this.removeExpensiveStyles();
        // Reduce animation complexity
        this.simplifyAnimations();
        // Optimize images
        this.optimizeImages();
        // Reduce DOM complexity
        this.optimizeDOMStructure();
    }
    
    static removeExpensiveStyles() {
        const expensiveSelectors = [
            '.modal-backdrop', '.book-card', '.search-result-card', 
            '.nav-link', '.btn', '.loading-overlay'
        ];
        
        expensiveSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                // Remove expensive properties
                el.style.boxShadow = 'none';
                el.style.filter = 'none';
                el.style.backdropFilter = 'none';
                el.style.textShadow = 'none';
            });
        });
    }
    
    static simplifyAnimations() {
        // Disable complex animations on mobile
        if (window.innerWidth <= 768) {
            document.body.classList.add('mobile-performance-mode');
        }
    }
    
    static optimizeImages() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.loading) img.loading = 'lazy';
            img.style.willChange = 'auto';
        });
    }
    
    static optimizeDOMStructure() {
        // Hide non-essential elements on mobile
        if (window.innerWidth <= 480) {
            const nonEssential = document.querySelectorAll('.decorative, .optional-mobile');
            nonEssential.forEach(el => el.style.display = 'none');
        }
    }
}