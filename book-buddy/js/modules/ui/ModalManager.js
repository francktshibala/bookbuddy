/**
 * Modal Manager - Handles modal dialogs and overlays
 */
import { eventBus, EVENTS } from '../utils/EventBus.js';
import { DOMUtils } from '../utils/Helpers.js';

export default class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.modalContainer = null;
        this.setupModalContainer();
        this.setupEventListeners();
    }

    setupModalContainer() {
        this.modalContainer = DOMUtils.createElement('div', {
            className: 'modal-container',
            id: 'modal-container'
        });
        document.body.appendChild(this.modalContainer);
    }

    setupEventListeners() {
        // Close modal on backdrop click
        this.modalContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeTopModal();
            }
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.size > 0) {
                this.closeTopModal();
            }
        });
    }

    showModal(modalConfig) {
        const {
            id = `modal-${Date.now()}`,
            title = '',
            content = '',
            buttons = [],
            className = '',
            closable = true,
            backdrop = true
        } = modalConfig;

        const modalHTML = `
            <div class="modal-backdrop ${backdrop ? 'backdrop-blur' : ''}" data-modal-id="${id}">
                <div class="modal ${className}" role="dialog" aria-labelledby="modal-title-${id}">
                    <div class="modal-header">
                        <h3 class="modal-title" id="modal-title-${id}">${title}</h3>
                        ${closable ? '<button class="modal-close" aria-label="Close modal">&times;</button>' : ''}
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${buttons.length > 0 ? `
                        <div class="modal-footer">
                            ${buttons.map(button => `
                                <button class="btn ${button.className || 'btn-primary'}" 
                                        data-action="${button.action || ''}"
                                        ${button.disabled ? 'disabled' : ''}>
                                    ${button.text}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        this.modalContainer.insertAdjacentHTML('beforeend', modalHTML);
        
        const modalElement = DOMUtils.query(`[data-modal-id="${id}"]`);
        
        // Setup modal event handlers
        this.setupModalEventHandlers(modalElement, id, modalConfig);
        
        // Track active modal
        this.activeModals.add(id);
        
        // Show modal with animation
        requestAnimationFrame(() => {
            DOMUtils.addClass(modalElement, 'show');
        });

        // Emit event
        eventBus.emit(EVENTS.UI_MODAL_OPENED, { id, config: modalConfig });

        return {
            id,
            element: modalElement,
            close: () => this.closeModal(id),
            updateContent: (newContent) => this.updateModalContent(id, newContent),
            updateTitle: (newTitle) => this.updateModalTitle(id, newTitle)
        };
    }

    setupModalEventHandlers(modalElement, modalId, config) {
        // Close button handler
        const closeButton = DOMUtils.query('.modal-close', modalElement);
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeModal(modalId));
        }

        // Button action handlers
        const actionButtons = DOMUtils.queryAll('[data-action]', modalElement);
        actionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                if (config.onAction && typeof config.onAction === 'function') {
                    const result = config.onAction(action, modalId);
                    
                    // Close modal if action handler returns true
                    if (result === true || result?.close === true) {
                        this.closeModal(modalId);
                    }
                }
            });
        });
    }

    closeModal(modalId) {
        const modalElement = DOMUtils.query(`[data-modal-id="${modalId}"]`);
        if (!modalElement) return;

        // Add closing animation
        DOMUtils.removeClass(modalElement, 'show');
        DOMUtils.addClass(modalElement, 'hiding');

        // Remove from DOM after animation
        setTimeout(() => {
            modalElement.remove();
            this.activeModals.delete(modalId);
            
            // Emit event
            eventBus.emit(EVENTS.UI_MODAL_CLOSED, { id: modalId });
        }, 300);
    }

    closeTopModal() {
        if (this.activeModals.size > 0) {
            const topModalId = Array.from(this.activeModals).pop();
            this.closeModal(topModalId);
        }
    }

    closeAllModals() {
        Array.from(this.activeModals).forEach(modalId => {
            this.closeModal(modalId);
        });
    }

    updateModalContent(modalId, newContent) {
        const modalElement = DOMUtils.query(`[data-modal-id="${modalId}"]`);
        if (modalElement) {
            const bodyElement = DOMUtils.query('.modal-body', modalElement);
            if (bodyElement) {
                bodyElement.innerHTML = newContent;
            }
        }
    }

    updateModalTitle(modalId, newTitle) {
        const modalElement = DOMUtils.query(`[data-modal-id="${modalId}"]`);
        if (modalElement) {
            const titleElement = DOMUtils.query('.modal-title', modalElement);
            if (titleElement) {
                titleElement.textContent = newTitle;
            }
        }
    }

    // Predefined modal types
    showAlert(title, message, buttonText = 'OK') {
        return this.showModal({
            title,
            content: `<p>${message}</p>`,
            buttons: [
                {
                    text: buttonText,
                    action: 'confirm',
                    className: 'btn-primary'
                }
            ],
            onAction: () => true // Auto-close
        });
    }

    showConfirm(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
        return new Promise((resolve) => {
            this.showModal({
                title,
                content: `<p>${message}</p>`,
                buttons: [
                    {
                        text: cancelText,
                        action: 'cancel',
                        className: 'btn-secondary'
                    },
                    {
                        text: confirmText,
                        action: 'confirm',
                        className: 'btn-primary'
                    }
                ],
                onAction: (action) => {
                    resolve(action === 'confirm');
                    return true; // Close modal
                }
            });
        });
    }

    showPrompt(title, message, defaultValue = '', placeholder = '') {
        return new Promise((resolve) => {
            const inputId = `prompt-input-${Date.now()}`;
            this.showModal({
                title,
                content: `
                    <p>${message}</p>
                    <input type="text" 
                           id="${inputId}" 
                           class="form-input" 
                           value="${defaultValue}" 
                           placeholder="${placeholder}"
                           autofocus>
                `,
                buttons: [
                    {
                        text: 'Cancel',
                        action: 'cancel',
                        className: 'btn-secondary'
                    },
                    {
                        text: 'OK',
                        action: 'confirm',
                        className: 'btn-primary'
                    }
                ],
                onAction: (action) => {
                    if (action === 'confirm') {
                        const input = document.getElementById(inputId);
                        resolve(input ? input.value : null);
                    } else {
                        resolve(null);
                    }
                    return true;
                }
            });
        });
    }

    showBookUpload(onUpload) {
        return this.showModal({
            title: '📤 Upload Book',
            content: `
                <div class="upload-area" id="upload-area">
                    <div class="upload-icon">📁</div>
                    <h4>Drop your book file here</h4>
                    <p>Or click to select a file</p>
                    <input type="file" id="file-input" accept=".txt" style="display: none;">
                    <button class="btn btn-outline" onclick="document.getElementById('file-input').click()">
                        Choose File
                    </button>
                </div>
                <div class="file-info" id="file-info" style="display: none;">
                    <h5>Selected File:</h5>
                    <p id="file-name"></p>
                    <p id="file-size"></p>
                </div>
            `,
            buttons: [
                {
                    text: 'Cancel',
                    action: 'cancel',
                    className: 'btn-secondary'
                },
                {
                    text: 'Upload',
                    action: 'upload',
                    className: 'btn-primary',
                    disabled: true
                }
            ],
            className: 'upload-modal',
            onAction: (action, modalId) => {
                if (action === 'upload') {
                    const fileInput = document.getElementById('file-input');
                    if (fileInput && fileInput.files[0]) {
                        onUpload(fileInput.files[0]);
                    }
                }
                return true;
            }
        });
    }
}