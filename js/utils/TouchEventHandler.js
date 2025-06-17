// File: js/utils/TouchEventHandler.js
export class TouchEventHandler {
    static optimizeForTouch(element, options = {}) {
        if (!element || element.offsetParent === null) return; // Skip hidden elements
        
        element.style.touchAction = 'manipulation';
        element.style.userSelect = 'none';
        element.style.webkitUserSelect = 'none';
        
        // Ensure minimum touch target size
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.height < 44) {
            element.style.minHeight = '44px';
            element.style.display = 'flex';
            element.style.alignItems = 'center';
        }
        
        element.addEventListener('touchstart', (e) => {
            element.classList.add('touch-active');
            if (options.haptic && navigator.vibrate) navigator.vibrate(10);
        }, { passive: true });
        
        element.addEventListener('touchend', () => {
            setTimeout(() => element.classList.remove('touch-active'), 150);
        }, { passive: true });
    }
    
    static optimizeButtons() {
        const buttons = document.querySelectorAll('button:not([style*="display: none"]), .btn:not([style*="display: none"]), .nav-link');
        buttons.forEach(btn => {
            if (btn.offsetParent !== null) { // Only visible elements
                this.optimizeForTouch(btn, { haptic: true });
            }
        });
    }
}