// js/modules/ui/AdvancedSearchInterface.js - Component 10.4 Complete Implementation
import SearchStateManager from './search/SearchStateManager.js';
import SearchHistoryManager from './search/SearchHistoryManager.js';
import SearchUIRenderer from './search/SearchUIRenderer.js';
import SearchAutoComplete from './search/SearchAutoComplete.js';
import SearchQueryBuilder from './search/SearchQueryBuilder.js';
import SearchExportManager from './search/SearchExportManager.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { DOMUtils } from '../../utils/Helpers.js';

export default class AdvancedSearchInterface {
    constructor(googleBooksAPI, storage, modalManager) {
        this.googleBooksAPI = googleBooksAPI;
        this.storage = storage;
        this.modalManager = modalManager;
        this.containerElement = null;
        this.isSearching = false;
        this.currentResults = [];
        
        // Initialize sub-components
        this.stateManager = new SearchStateManager();
        this.historyManager = new SearchHistoryManager(storage);
        this.uiRenderer = new SearchUIRenderer();
        this.autoComplete = new SearchAutoComplete();
        this.queryBuilder = new SearchQueryBuilder();
        this.exportManager = new SearchExportManager();
        
        // Bind methods to preserve context
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.handleTabSwitch = this.handleTabSwitch.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        
        console.log('🎛️ AdvancedSearchInterface initialized');
    }