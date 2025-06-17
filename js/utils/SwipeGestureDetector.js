// File: js/utils/SwipeGestureDetector.js
export class SwipeGestureDetector {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            threshold: options.threshold || 50,
            restraint: options.restraint || 100,
            allowedTime: options.allowedTime || 300,
            ...options
        };
        
        this.startX = 0;
        this.startY = 0;
        this.startTime = 0;
        this.callbacks = {};
        
        this.initialize();
    }
    
    initialize() {
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }
    
    handleTouchStart(e) {
        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.startTime = Date.now();
    }
    
    handleTouchMove(e) {
        // Prevent default to avoid scrolling during swipe detection
        if (Math.abs(e.touches[0].clientX - this.startX) > 30) {
            e.preventDefault();
        }
    }
    
    handleTouchEnd(e) {
        const touch = e.changedTouches[0];
        const endX = touch.clientX;
        const endY = touch.clientY;
        const endTime = Date.now();
        
        const distX = endX - this.startX;
        const distY = endY - this.startY;
        const elapsedTime = endTime - this.startTime;
        
        if (elapsedTime <= this.options.allowedTime) {
            if (Math.abs(distX) >= this.options.threshold && Math.abs(distY) <= this.options.restraint) {
                const direction = distX < 0 ? 'left' : 'right';
                this.triggerSwipe(direction, { distX, distY, elapsedTime });
            } else if (Math.abs(distY) >= this.options.threshold && Math.abs(distX) <= this.options.restraint) {
                const direction = distY < 0 ? 'up' : 'down';
                this.triggerSwipe(direction, { distX, distY, elapsedTime });
            }
        }
    }
    
    triggerSwipe(direction, details) {
        if (this.callbacks[direction]) {
            this.callbacks[direction](details);
        }
        if (this.callbacks.any) {
            this.callbacks.any(direction, details);
        }
    }
    
    onSwipe(direction, callback) {
        this.callbacks[direction] = callback;
        return this;
    }
    
    onAnySwipe(callback) {
        this.callbacks.any = callback;
        return this;
    }
    
    destroy() {
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
    }
}