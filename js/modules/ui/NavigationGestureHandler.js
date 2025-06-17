/**
 * Navigation Gesture Handler - Adds swipe gestures to existing NavigationController
 */
import { SwipeGestureDetector } from '../../utils/SwipeGestureDetector.js';

export class NavigationGestureHandler {
    constructor(navigationController) {
        this.navigationController = navigationController;
        this.swipeDetector = null;
        this.views = ['library', 'search', 'reading', 'statistics', 'settings'];
        
        this.initialize();
    }
    
    initialize() {
        // Add swipe navigation to main content area
        const mainContent = document.querySelector('main') || document.body;
        
        this.swipeDetector = new SwipeGestureDetector(mainContent, {
            threshold: 80,
            restraint: 150,
            allowedTime: 400
        });
        
        // Setup swipe handlers
        this.swipeDetector
            .onSwipe('left', () => this.handleSwipeLeft())
            .onSwipe('right', () => this.handleSwipeRight())
            .onSwipe('up', () => this.handleSwipeUp())
            .onSwipe('down', () => this.handleSwipeDown());
        
        console.log('👆 Navigation gesture handler initialized');
    }
    
    handleSwipeLeft() {
        // Navigate to next view
        const currentIndex = this.views.indexOf(this.navigationController.currentView);
        const nextIndex = (currentIndex + 1) % this.views.length;
        this.navigationController.navigateToView(this.views[nextIndex]);
        
        console.log(`👆 Swiped left: ${this.navigationController.currentView} → ${this.views[nextIndex]}`);
    }
    
    handleSwipeRight() {
        // Navigate to previous view
        const currentIndex = this.views.indexOf(this.navigationController.currentView);
        const prevIndex = currentIndex === 0 ? this.views.length - 1 : currentIndex - 1;
        this.navigationController.navigateToView(this.views[prevIndex]);
        
        console.log(`👆 Swiped right: ${this.navigationController.currentView} → ${this.views[prevIndex]}`);
    }
    
    handleSwipeUp() {
        // Close mobile menu if open
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu?.classList.contains('active')) {
            navMenu.classList.remove('active');
            document.querySelector('.nav-toggle')?.classList.remove('active');
            console.log('👆 Swiped up: Menu closed');
        }
    }
    
    handleSwipeDown() {
        // Open mobile menu
        const navMenu = document.querySelector('.nav-menu');
        const navToggle = document.querySelector('.nav-toggle');
        if (navMenu && !navMenu.classList.contains('active')) {
            navMenu.classList.add('active');
            navToggle?.classList.add('active');
            console.log('👆 Swiped down: Menu opened');
        }
    }
    
    destroy() {
        if (this.swipeDetector) {
            this.swipeDetector.destroy();
        }
    }
}