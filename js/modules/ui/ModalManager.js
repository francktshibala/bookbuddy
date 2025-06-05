/**
 * Modal Manager - Handles modal dialogs and overlays
 */
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { DOMUtils } from '../../utils/Helpers.js';

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

    // ✅ Replace the existing showBookUpload method in ModalManager.js with this:

showBookUpload(onUpload) {
    console.log('📤 Showing enhanced book upload modal...');
    
    const modalResult = this.showModal({
        title: '📤 Upload Book',
        content: `
            <div class="upload-area" id="upload-area">
                <div class="upload-icon">📚</div>
                <h4>Upload Your Book File</h4>
                <p>Drag and drop your book file here, or click to browse</p>
                <p class="upload-formats" style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem;">
                    Supported formats: TXT files only
                </p>
                <input type="file" id="book-file-input" accept=".txt" style="display: none;">
                <button class="btn btn-outline" id="browse-files-btn">
                    📁 Choose File
                </button>
            </div>
            <div id="file-info" class="file-info" style="display: none;">
                <h5>Selected File:</h5>
                <p id="file-name"></p>
                <p id="file-size"></p>
                <p id="file-type"></p>
            </div>
        `,
        buttons: [
            {
                text: 'Cancel',
                action: 'cancel',
                className: 'btn-outline'
            },
            {
                text: 'Upload Book',
                action: 'upload',
                className: 'btn-primary',
                disabled: true
            }
        ],
        className: 'upload-modal',
        onAction: (action, modalId) => {
            if (action === 'upload') {
                const fileInput = document.getElementById('book-file-input');
                const file = fileInput?.files[0];
                if (file && onUpload) {
                    console.log('📁 File selected for upload:', file.name);
                    onUpload(file);
                    return true; // Close modal
                } else {
                    console.warn('⚠️ No file selected');
                    return false; // Keep modal open
                }
            }
            return true; // Close modal for other actions
        }
    });

    // Setup file handling after modal is shown
    setTimeout(() => {
        this.setupUploadModalHandlers(onUpload);
    }, 100);

    return modalResult;
}

// ✅ ADD this new method to ModalManager.js as well:
setupUploadModalHandlers(onUpload) {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('book-file-input');
    const browseBtn = document.getElementById('browse-files-btn');
    const fileInfo = document.getElementById('file-info');
    const uploadBtn = document.querySelector('.modal-footer .btn-primary');

    if (!uploadArea || !fileInput || !browseBtn) {
        console.error('❌ Upload modal elements not found');
        return;
    }

    console.log('🔧 Setting up upload modal handlers...');

    // Browse files button
    browseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('📁 Browse button clicked');
        fileInput.click();
    });

    // Click upload area to browse
    uploadArea.addEventListener('click', (e) => {
        if (e.target === uploadArea || e.target.closest('.upload-area')) {
            console.log('📁 Upload area clicked');
            fileInput.click();
        }
    });

    // File selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log('📄 File selected:', file.name, file.type, file.size);
            this.displayFileInfo(file);
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload Book';
            }
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            console.log('📄 File dropped:', file.name);
            fileInput.files = files;
            this.displayFileInfo(file);
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload Book';
            }
        }
    });
}

// ✅ ADD this method to ModalManager.js as well:
displayFileInfo(file) {
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const fileType = document.getElementById('file-type');

    if (fileInfo && fileName && fileSize && fileType) {
        fileName.textContent = file.name;
        fileSize.textContent = `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        fileType.textContent = `Type: ${file.type || 'text/plain'}`;
        fileInfo.style.display = 'block';
        console.log('📋 File info displayed:', file.name);
    }
}
}