/**
 * TouchGestureHandler - Advanced touch and gesture support for BookBuddy
 * Adds swipe, pinch, and other touch interactions to enhance mobile experience
 */
import { eventBus, EVENTS } from '../../../utils/EventBus.js';
import { DOMUtils } from '../../../utils/Helpers.js';

export default class TouchGestureHandler {
    constructor(breakpointManager) {
        this.breakpointManager = breakpointManager;

        // Touch state tracking
        this.touches = new Map();
        this.isEnabled = false;
        this.gestureThresholds = {
            swipeDistance: 50,
            swipeVelocity: 0.3,
            pinchScale: 0.1,
            longPressTime: 500,
            doubleTapTime: 300
        };

        // Gesture recognition state
        this.lastTap = 0;
        this.longPressTimer = null;
        this.isPinching = false;
        this.initialPinchDistance = 0;

        console.log('👆 TouchGestureHandler initializing...');
        this.initialize();
    }

    initialize() {
        // Only enable on touch devices
        if (this.isTouchDevice()) {
            this.enable();
        }

        // Listen for breakpoint changes
        eventBus.on('responsive:breakpointChanged', (data) => {
            this.handleBreakpointChange(data.to);
        });

        console.log('✅ TouchGestureHandler initialized');
    }

    enable() {
        if (this.isEnabled) return;

        this.isEnabled = true;
        this.setupGlobalTouchHandlers();
        this.setupBookBuddyGestures();

        console.log('👆 Touch gestures enabled');
    }

    disable() {
        if (!this.isEnabled) return;

        this.isEnabled = false;
        this.removeGlobalTouchHandlers();

        console.log('🚫 Touch gestures disabled');
    }

    handleBreakpointChange(breakpoint) {
        if (breakpoint === 'mobile' || breakpoint === 'tablet') {
            if (this.isTouchDevice()) {
                this.enable();
            }
        }
    }

    isTouchDevice() {
        return 'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0;
    }

    setupGlobalTouchHandlers() {
        // Global touch event listeners
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });

        console.log('🔗 Global touch handlers setup');
    }

    removeGlobalTouchHandlers() {
        document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        document.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
    }

    setupBookBuddyGestures() {
        // Setup gestures for specific BookBuddy components
        this.setupLibraryGestures();
        this.setupSearchGestures();
        this.setupReadingGestures();
        this.setupModalGestures();
    }

    setupLibraryGestures() {
        // Book card swipe gestures
        this.setupBookCardGestures();

        // Library navigation gestures
        this.setupLibraryNavigationGestures();
    }

    setupBookCardGestures() {
        // Delegate touch events for book cards
        document.addEventListener('touchstart', (e) => {
            const bookCard = e.target.closest('.book-card');
            if (bookCard && this.isEnabled) {
                this.handleBookCardTouchStart(e, bookCard);
            }
        }, { passive: true });
    }

    handleBookCardTouchStart(e, bookCard) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const touchData = {
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now(),
                element: bookCard
            };

            this.touches.set('bookCard', touchData);

            // Setup temporary listeners for this gesture
            const handleMove = (e) => this.handleBookCardTouchMove(e, touchData);
            const handleEnd = (e) => this.handleBookCardTouchEnd(e, touchData, handleMove, handleEnd);

            document.addEventListener('touchmove', handleMove, { passive: true });
            document.addEventListener('touchend', handleEnd, { passive: true });
        }
    }

    handleBookCardTouchMove(e, touchData) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchData.startX;
            const deltaY = touch.clientY - touchData.startY;

            // Add visual feedback for horizontal swipes
            if (Math.abs(deltaX) > 20 && Math.abs(deltaX) > Math.abs(deltaY)) {
                touchData.element.style.transform = `translateX(${deltaX * 0.3}px)`;
                touchData.element.style.transition = 'none';
            }
        }
    }

    handleBookCardTouchEnd(e, touchData, moveHandler, endHandler) {
        // Clean up listeners
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', endHandler);

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchData.startX;
        const deltaY = touch.clientY - touchData.startY;
        const deltaTime = Date.now() - touchData.startTime;
        const velocity = Math.abs(deltaX) / deltaTime;

        // Reset card position
        touchData.element.style.transform = '';
        touchData.element.style.transition = '';

        // Detect swipe gestures
        if (Math.abs(deltaX) > this.gestureThresholds.swipeDistance &&
            velocity > this.gestureThresholds.swipeVelocity &&
            Math.abs(deltaX) > Math.abs(deltaY)) {

            if (deltaX > 0) {
                this.handleBookCardSwipeRight(touchData.element);
            } else {
                this.handleBookCardSwipeLeft(touchData.element);
            }
        }

        this.touches.delete('bookCard');
    }

    handleBookCardSwipeRight(bookCard) {
        // Swipe right - Quick read action
        console.log('👆 Book card swiped right - opening for reading');

        const readBtn = bookCard.querySelector('.btn-read');
        if (readBtn) {
            // Visual feedback
            this.showSwipeAction(bookCard, 'Read', 'right');

            // Trigger read action
            setTimeout(() => {
                readBtn.click();
            }, 200);
        }
    }

    handleBookCardSwipeLeft(bookCard) {
        // Swipe left - Quick action menu
        console.log('👆 Book card swiped left - showing quick actions');

        this.showSwipeAction(bookCard, 'Actions', 'left');
        this.showBookCardActions(bookCard);
    }

    showSwipeAction(element, actionName, direction) {
        // Create temporary action indicator
        const indicator = DOMUtils.createElement('div', {
            className: 'swipe-action-indicator',
            textContent: actionName,
            style: `
                position: absolute;
                top: 50%;
                ${direction}: 10px;
                transform: translateY(-50%);
                background: var(--primary-color);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 500;
                z-index: 1000;
                opacity: 0;
                animation: swipeActionShow 0.3s ease forwards;
            `
        });

        // Add animation keyframes if not exists
        if (!document.querySelector('#swipe-action-styles')) {
            const style = document.createElement('style');
            style.id = 'swipe-action-styles';
            style.textContent = `
                @keyframes swipeActionShow {
                    from { opacity: 0; transform: translateY(-50%) scale(0.8); }
                    to { opacity: 1; transform: translateY(-50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        element.style.position = 'relative';
        element.appendChild(indicator);

        // Remove indicator after animation
        setTimeout(() => {
            indicator.remove();
        }, 1000);
    }

    showBookCardActions(bookCard) {
        // Create quick action overlay
        const actionsOverlay = DOMUtils.createElement('div', {
            className: 'book-card-quick-actions',
            style: `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 1rem;
                z-index: 1001;
                border-radius: var(--border-radius);
                animation: fadeIn 0.2s ease;
            `
        });

        // Add action buttons
        const actions = [
            { icon: '📋', text: 'Details', class: 'btn-details' },
            { icon: '🤖', text: 'AI Analysis', class: 'ai-analysis-btn' },
            { icon: '🗑️', text: 'Delete', class: 'btn-delete' }
        ];

        actions.forEach(action => {
            const btn = DOMUtils.createElement('button', {
                className: `quick-action-btn ${action.class}`,
                innerHTML: `${action.icon}<br><span style="font-size: 0.7rem;">${action.text}</span>`,
                style: `
                    background: var(--card-background);
                    border: 1px solid var(--border-color);
                    border-radius: 50%;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: var(--transition);
                `
            });

            // Copy data attributes from original button
            const originalBtn = bookCard.querySelector(`.${action.class}`);
            if (originalBtn) {
                Array.from(originalBtn.attributes).forEach(attr => {
                    if (attr.name.startsWith('data-')) {
                        btn.setAttribute(attr.name, attr.value);
                    }
                });

                // Add click handler
                btn.addEventListener('click', () => {
                    actionsOverlay.remove();
                    originalBtn.click();
                });
            }

            actionsOverlay.appendChild(btn);
        });

        // Add close button
        const closeBtn = DOMUtils.createElement('button', {
            textContent: '✕',
            style: `
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            `
        });

        closeBtn.addEventListener('click', () => actionsOverlay.remove());
        actionsOverlay.appendChild(closeBtn);

        bookCard.style.position = 'relative';
        bookCard.appendChild(actionsOverlay);

        // Auto-close after 3 seconds
        setTimeout(() => {
            if (actionsOverlay.parentNode) {
                actionsOverlay.remove();
            }
        }, 3000);
    }

    setupLibraryNavigationGestures() {
        // Pull-to-refresh gesture for library
        const libraryView = DOMUtils.query('#library-view');
        if (libraryView) {
            this.setupPullToRefresh(libraryView);
        }
    }

    setupPullToRefresh(container) {
        let startY = 0;
        let currentY = 0;
        let isPulling = false;
        const pullThreshold = 80;

        container.addEventListener('touchstart', (e) => {
            if (container.scrollTop === 0 && e.touches.length === 1) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!isPulling) return;

            currentY = e.touches[0].clientY;
            const pullDistance = Math.max(0, currentY - startY);

            if (pullDistance > 0 && container.scrollTop === 0) {
                e.preventDefault();

                // Show pull indicator
                this.updatePullIndicator(container, pullDistance, pullThreshold);
            }
        }, { passive: false });

        container.addEventListener('touchend', (e) => {
            if (!isPulling) return;

            const pullDistance = currentY - startY;

            if (pullDistance > pullThreshold) {
                this.triggerRefresh(container);
            }

            this.hidePullIndicator(container);
            isPulling = false;
        }, { passive: true });
    }

    updatePullIndicator(container, distance, threshold) {
        let indicator = container.querySelector('.pull-refresh-indicator');

        if (!indicator) {
            indicator = DOMUtils.createElement('div', {
                className: 'pull-refresh-indicator',
                innerHTML: '🔄 Pull to refresh',
                style: `
                    position: absolute;
                    top: -50px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--primary-color);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                    z-index: 1000;
                `
            });
            container.style.position = 'relative';
            container.appendChild(indicator);
        }

        const progress = Math.min(distance / threshold, 1);
        indicator.style.top = `${Math.max(-50, -50 + distance * 0.5)}px`;
        indicator.style.opacity = progress;

        if (progress >= 1) {
            indicator.innerHTML = '🔄 Release to refresh';
            indicator.style.background = 'var(--success-color)';
        }
    }

    hidePullIndicator(container) {
        const indicator = container.querySelector('.pull-refresh-indicator');
        if (indicator) {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 200);
        }
    }

    triggerRefresh(container) {
        console.log('🔄 Pull-to-refresh triggered');

        // Emit refresh event
        eventBus.emit('responsive:pullToRefresh', {
            container: container.id,
            timestamp: Date.now()
        });

        // Show loading state
        const indicator = container.querySelector('.pull-refresh-indicator');
        if (indicator) {
            indicator.innerHTML = '🔄 Refreshing...';
            indicator.style.background = 'var(--primary-color)';
        }
    }

    setupSearchGestures() {
        // Enhanced search result navigation
        this.setupSearchResultGestures();

        // Search filter gestures
        this.setupSearchFilterGestures();
    }

    setupSearchResultGestures() {
        // Swipe gestures on search results
        document.addEventListener('touchstart', (e) => {
            const searchCard = e.target.closest('.search-result-card');
            if (searchCard && this.isEnabled) {
                this.handleSearchCardTouchStart(e, searchCard);
            }
        }, { passive: true });
    }

    handleSearchCardTouchStart(e, searchCard) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const touchData = {
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now(),
                element: searchCard
            };

            // Setup temporary listeners
            const handleMove = (e) => this.handleSearchCardTouchMove(e, touchData);
            const handleEnd = (e) => this.handleSearchCardTouchEnd(e, touchData, handleMove, handleEnd);

            document.addEventListener('touchmove', handleMove, { passive: true });
            document.addEventListener('touchend', handleEnd, { passive: true });
        }
    }

    handleSearchCardTouchMove(e, touchData) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchData.startX;

            // Visual feedback for swipe to add
            if (deltaX > 20) {
                touchData.element.style.transform = `translateX(${Math.min(deltaX * 0.3, 50)}px)`;
                touchData.element.style.background = 'rgba(16, 185, 129, 0.1)';
                touchData.element.style.transition = 'none';
            }
        }
    }

    handleSearchCardTouchEnd(e, touchData, moveHandler, endHandler) {
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', endHandler);

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchData.startX;
        const velocity = Math.abs(deltaX) / (Date.now() - touchData.startTime);

        // Reset visual state
        touchData.element.style.transform = '';
        touchData.element.style.background = '';
        touchData.element.style.transition = '';

        // Swipe right to add to library
        if (deltaX > this.gestureThresholds.swipeDistance &&
            velocity > this.gestureThresholds.swipeVelocity) {

            const addBtn = touchData.element.querySelector('.btn-add-book');
            if (addBtn && !addBtn.disabled) {
                this.showSwipeAction(touchData.element, 'Added!', 'right');
                setTimeout(() => addBtn.click(), 200);
            }
        }
    }

    setupSearchFilterGestures() {
        // Swipe to toggle filter panels
        const filtersContainer = DOMUtils.query('.search-filters');
        if (filtersContainer) {
            this.setupFilterPanelSwipe(filtersContainer);
        }
    }

    setupFilterPanelSwipe(container) {
        let startY = 0;
        let isCollapsed = false;

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startY = e.touches[0].clientY;
            }
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            const deltaY = e.changedTouches[0].clientY - startY;

            // Swipe up to collapse, down to expand
            if (Math.abs(deltaY) > this.gestureThresholds.swipeDistance) {
                if (deltaY < 0 && !isCollapsed) {
                    this.collapseFilterPanel(container);
                    isCollapsed = true;
                } else if (deltaY > 0 && isCollapsed) {
                    this.expandFilterPanel(container);
                    isCollapsed = false;
                }
            }
        }, { passive: true });
    }

    collapseFilterPanel(container) {
        container.style.height = '60px';
        container.style.overflow = 'hidden';
        container.classList.add('collapsed');

        // Add expand hint
        if (!container.querySelector('.expand-hint')) {
            const hint = DOMUtils.createElement('div', {
                className: 'expand-hint',
                textContent: '↓ Swipe down to expand filters',
                style: `
                    position: absolute;
                    bottom: 5px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    opacity: 0.7;
                `
            });
            container.style.position = 'relative';
            container.appendChild(hint);
        }
    }

    expandFilterPanel(container) {
        container.style.height = '';
        container.style.overflow = '';
        container.classList.remove('collapsed');

        const hint = container.querySelector('.expand-hint');
        if (hint) {
            hint.remove();
        }
    }

    setupReadingGestures() {
        // Enhanced reading interface gestures
        this.setupReadingNavigationGestures();
        this.setupReadingZoomGestures();
    }

    setupReadingNavigationGestures() {
        const readingContent = DOMUtils.query('.reading-content-wrapper');
        if (!readingContent) return;

        let startX = 0;
        let startY = 0;

        readingContent.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }
        }, { passive: true });

        readingContent.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            const velocity = Math.abs(deltaX) / 300; // Approximate time

            // Horizontal swipes for page navigation
            if (Math.abs(deltaX) > Math.abs(deltaY) &&
                Math.abs(deltaX) > this.gestureThresholds.swipeDistance &&
                velocity > this.gestureThresholds.swipeVelocity) {

                if (deltaX > 0) {
                    this.handleReadingSwipeRight();
                } else {
                    this.handleReadingSwipeLeft();
                }
            }

            // Vertical swipes for menu toggle
            else if (Math.abs(deltaY) > this.gestureThresholds.swipeDistance) {
                if (deltaY < 0) {
                    this.hideReadingControls();
                } else {
                    this.showReadingControls();
                }
            }
        }, { passive: true });
    }

    handleReadingSwipeRight() {
        // Previous page/chapter
        console.log('👆 Reading swipe right - previous page');
        const prevBtn = DOMUtils.query('.btn-prev-page, .btn-prev-chapter');
        if (prevBtn && !prevBtn.disabled) {
            this.showReadingGestureIndicator('← Previous');
            prevBtn.click();
        }
    }

    handleReadingSwipeLeft() {
        // Next page/chapter
        console.log('👆 Reading swipe left - next page');
        const nextBtn = DOMUtils.query('.btn-next-page, .btn-next-chapter');
        if (nextBtn && !nextBtn.disabled) {
            this.showReadingGestureIndicator('Next →');
            nextBtn.click();
        }
    }

    showReadingGestureIndicator(text) {
        const readingInterface = DOMUtils.query('.reading-interface');
        if (!readingInterface) return;

        const indicator = DOMUtils.createElement('div', {
            className: 'reading-gesture-indicator',
            textContent: text,
            style: `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--primary-color);
                color: white;
                padding: 1rem 2rem;
                border-radius: 30px;
                font-size: 1rem;
                font-weight: 500;
                z-index: 1000;
                opacity: 0;
                animation: gestureIndicatorShow 0.5s ease forwards;
            `
        });

        document.body.appendChild(indicator);

        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 200);
        }, 1000);
    }

    hideReadingControls() {
        const controls = DOMUtils.query('.reading-controls');
        if (controls) {
            controls.classList.add('gesture-hidden');
            controls.style.transform = 'translateY(-100%)';
        }
    }

    showReadingControls() {
        const controls = DOMUtils.query('.reading-controls');
        if (controls) {
            controls.classList.remove('gesture-hidden');
            controls.style.transform = '';
        }
    }

    setupReadingZoomGestures() {
        const readingContent = DOMUtils.query('.book-content');
        if (!readingContent) return;

        let initialDistance = 0;
        let initialFontSize = 16;

        readingContent.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                this.isPinching = true;
                initialDistance = this.getDistance(e.touches[0], e.touches[1]);

                // Get current font size
                const currentSize = window.getComputedStyle(readingContent).fontSize;
                initialFontSize = parseFloat(currentSize);
            }
        }, { passive: true });

        readingContent.addEventListener('touchmove', (e) => {
            if (this.isPinching && e.touches.length === 2) {
                e.preventDefault();

                const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
                const scale = currentDistance / initialDistance;

                // Calculate new font size with limits
                const newFontSize = Math.max(12, Math.min(24, initialFontSize * scale));
                readingContent.style.fontSize = `${newFontSize}px`;

                // Show zoom indicator
                this.showZoomIndicator(Math.round(newFontSize));
            }
        }, { passive: false });

        readingContent.addEventListener('touchend', (e) => {
            if (this.isPinching) {
                this.isPinching = false;

                // Hide zoom indicator
                this.hideZoomIndicator();

                // Save font size preference
                const finalSize = parseFloat(readingContent.style.fontSize);
                eventBus.emit('reading:fontSizeChanged', { fontSize: finalSize });
            }
        }, { passive: true });
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    showZoomIndicator(fontSize) {
        let indicator = DOMUtils.query('.zoom-indicator');

        if (!indicator) {
            indicator = DOMUtils.createElement('div', {
                className: 'zoom-indicator',
                style: `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    z-index: 1001;
                    transition: opacity 0.2s ease;
                `
            });
            document.body.appendChild(indicator);
        }

        indicator.textContent = `${fontSize}px`;
        indicator.style.opacity = '1';
    }

    hideZoomIndicator() {
        const indicator = DOMUtils.query('.zoom-indicator');
        if (indicator) {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 200);
        }
    }

    setupModalGestures() {
        // Swipe down to dismiss modals
        document.addEventListener('touchstart', (e) => {
            const modal = e.target.closest('.modal');
            if (modal && this.isEnabled) {
                this.handleModalTouchStart(e, modal);
            }
        }, { passive: true });
    }

    handleModalTouchStart(e, modal) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const touchData = {
                startY: touch.clientY,
                startTime: Date.now(),
                element: modal
            };

            const handleMove = (e) => this.handleModalTouchMove(e, touchData);
            const handleEnd = (e) => this.handleModalTouchEnd(e, touchData, handleMove, handleEnd);

            document.addEventListener('touchmove', handleMove, { passive: true });
            document.addEventListener('touchend', handleEnd, { passive: true });
        }
    }

    handleModalTouchMove(e, touchData) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaY = touch.clientY - touchData.startY;

            // Only allow downward swipes
            if (deltaY > 0) {
                const progress = Math.min(deltaY / 200, 1);
                touchData.element.style.transform = `translateY(${deltaY * 0.5}px)`;
                touchData.element.style.opacity = 1 - (progress * 0.3);
            }
        }
    }

    handleModalTouchEnd(e, touchData, moveHandler, endHandler) {
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', endHandler);

        const touch = e.changedTouches[0];
        const deltaY = touch.clientY - touchData.startY;
        const velocity = deltaY / (Date.now() - touchData.startTime);

        // Reset modal position
        touchData.element.style.transform = '';
        touchData.element.style.opacity = '';

        // Dismiss modal if swiped down significantly
        if (deltaY > 100 || velocity > 0.5) {
            const closeBtn = touchData.element.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.click();
            }
        }
    }

    // Global touch event handlers
    handleTouchStart(e) {
        // Track all touches for gesture recognition
        Array.from(e.touches).forEach((touch, index) => {
            this.touches.set(`touch_${index}`, {
                id: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now()
            });
        });

        // Setup long press detection for single touch
        if (e.touches.length === 1) {
            this.setupLongPressDetection(e.touches[0]);
        }
    }

    handleTouchMove(e) {
        // Clear long press if moving
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    handleTouchEnd(e) {
        // Clear long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        // Detect double tap
        if (e.changedTouches.length === 1) {
            this.detectDoubleTap(e.changedTouches[0]);
        }

        // Clean up touch tracking
        Array.from(e.changedTouches).forEach((touch, index) => {
            this.touches.delete(`touch_${index}`);
        });
    }

    handleTouchCancel(e) {
        // Clean up on touch cancel
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        this.touches.clear();
        this.isPinching = false;
    }

    setupLongPressDetection(touch) {
        this.longPressTimer = setTimeout(() => {
            this.handleLongPress(touch);
        }, this.gestureThresholds.longPressTime);
    }

    handleLongPress(touch) {
        console.log('👆 Long press detected');

        // Find element under touch
        const element = document.elementFromPoint(touch.clientX, touch.clientY);

        // Emit long press event
        eventBus.emit('responsive:longPress', {
            element,
            x: touch.clientX,
            y: touch.clientY
        });

        // Provide haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    detectDoubleTap(touch) {
        const now = Date.now();

        if (now - this.lastTap < this.gestureThresholds.doubleTapTime) {
            console.log('👆 Double tap detected');

            const element = document.elementFromPoint(touch.clientX, touch.clientY);

            eventBus.emit('responsive:doubleTap', {
                element,
                x: touch.clientX,
                y: touch.clientY
            });
        }

        this.lastTap = now;
    }

    // Public API methods
    getTouchEnabled() {
        return this.isEnabled;
    }

    getGestureThresholds() {
        return { ...this.gestureThresholds };
    }

    setGestureThresholds(newThresholds) {
        this.gestureThresholds = { ...this.gestureThresholds, ...newThresholds };
    }

    // Debug methods
    getDebugInfo() {
        return {
            isEnabled: this.isEnabled,
            isTouchDevice: this.isTouchDevice(),
            activeTouches: this.touches.size,
            isPinching: this.isPinching,
            gestureThresholds: this.gestureThresholds
        };
    }

    // Cleanup
    destroy() {
        this.disable();

        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }

        this.touches.clear();

        console.log('🗑️ TouchGestureHandler destroyed');
    }
}