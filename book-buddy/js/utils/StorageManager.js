/**
 * StorageManager - Reliable localStorage handling for Book Buddy
 * Handles JSON parsing errors, storage limits, and provides clean API
 */

class StorageManager {
    constructor(appPrefix = 'book-buddy') {
        this.prefix = appPrefix;
        this.maxStorageSize = 5 * 1024 * 1024; // 5MB limit
        this.warningThreshold = 0.8; // Warn at 80% capacity
        
        // Test localStorage availability on initialization
        this.isAvailable = this._testStorageAvailability();
        
        if (!this.isAvailable) {
            console.warn('localStorage is not available. Data will not persist.');
        }
    }

    /**
     * Save data to localStorage with error handling
     * @param {string} key - Storage key (will be prefixed)
     * @param {*} data - Data to store (will be JSON stringified)
     * @returns {Object} - Success/error result
     */
    save(key, data) {
        try {
            if (!this.isAvailable) {
                return this._createResult(false, 'localStorage not available');
            }

            const prefixedKey = this._getPrefixedKey(key);
            const jsonData = JSON.stringify(data);
            
            // Check storage size before saving
            const sizeCheck = this._checkStorageSize(jsonData);
            if (!sizeCheck.success) {
                return sizeCheck;
            }

            localStorage.setItem(prefixedKey, jsonData);
            
            // Check if we're approaching storage limit after save
            this._checkStorageWarning();
            
            return this._createResult(true, 'Data saved successfully', data);

        } catch (error) {
            return this._handleSaveError(error, key, data);
        }
    }

    /**
     * Load data from localStorage with error handling
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {Object} - Success/error result with data
     */
    load(key, defaultValue = null) {
        try {
            if (!this.isAvailable) {
                return this._createResult(true, 'localStorage not available', defaultValue);
            }

            const prefixedKey = this._getPrefixedKey(key);
            const rawData = localStorage.getItem(prefixedKey);
            
            // Handle missing key
            if (rawData === null) {
                return this._createResult(true, 'Key not found', defaultValue);
            }

            // Parse JSON data
            const parsedData = JSON.parse(rawData);
            return this._createResult(true, 'Data loaded successfully', parsedData);

        } catch (error) {
            return this._handleLoadError(error, key, defaultValue);
        }
    }

    /**
     * Remove specific key from localStorage
     * @param {string} key - Storage key to remove
     * @returns {Object} - Success/error result
     */
    remove(key) {
        try {
            if (!this.isAvailable) {
                return this._createResult(false, 'localStorage not available');
            }

            const prefixedKey = this._getPrefixedKey(key);
            
            // Check if key exists before removing
            const exists = localStorage.getItem(prefixedKey) !== null;
            
            localStorage.removeItem(prefixedKey);
            
            const message = exists ? 'Key removed successfully' : 'Key did not exist';
            return this._createResult(true, message);

        } catch (error) {
            console.error('StorageManager remove error:', error);
            return this._createResult(false, `Failed to remove key: ${error.message}`);
        }
    }

    /**
     * Clear all app data from localStorage
     * @returns {Object} - Success/error result
     */
    clear() {
        try {
            if (!this.isAvailable) {
                return this._createResult(false, 'localStorage not available');
            }

            const keysToRemove = [];
            
            // Find all keys with our prefix
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix + '_')) {
                    keysToRemove.push(key);
                }
            }

            // Remove all app keys
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            return this._createResult(true, `Cleared ${keysToRemove.length} keys`);

        } catch (error) {
            console.error('StorageManager clear error:', error);
            return this._createResult(false, `Failed to clear storage: ${error.message}`);
        }
    }

    /**
     * Get all app keys from localStorage
     * @returns {Array} - Array of unprefixed key names
     */
    getAllKeys() {
        if (!this.isAvailable) return [];

        const appKeys = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix + '_')) {
                    appKeys.push(key.substring(this.prefix.length + 1));
                }
            }
        } catch (error) {
            console.error('StorageManager getAllKeys error:', error);
        }
        
        return appKeys;
    }

    /**
     * Get storage usage information
     * @returns {Object} - Storage usage stats
     */
    getStorageInfo() {
        if (!this.isAvailable) {
            return { available: false, message: 'localStorage not available' };
        }

        try {
            let totalSize = 0;
            let appSize = 0;
            let appKeys = 0;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                const itemSize = (key.length + value.length) * 2; // Rough byte estimate
                
                totalSize += itemSize;
                
                if (key.startsWith(this.prefix + '_')) {
                    appSize += itemSize;
                    appKeys++;
                }
            }

            return {
                available: true,
                totalSize: totalSize,
                appSize: appSize,
                appKeys: appKeys,
                maxSize: this.maxStorageSize,
                percentUsed: Math.round((totalSize / this.maxStorageSize) * 100),
                appPercentUsed: Math.round((appSize / this.maxStorageSize) * 100)
            };

        } catch (error) {
            console.error('StorageManager getStorageInfo error:', error);
            return { available: false, error: error.message };
        }
    }

    // Private helper methods

    _getPrefixedKey(key) {
        return `${this.prefix}_${key}`;
    }

    _createResult(success, message, data = null) {
        return { success, message, data };
    }

    _testStorageAvailability() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    _checkStorageSize(newData) {
        try {
            const currentSize = JSON.stringify(localStorage).length * 2; // Rough estimate
            const newDataSize = newData.length * 2;
            const projectedSize = currentSize + newDataSize;

            if (projectedSize > this.maxStorageSize) {
                return this._createResult(false, 'Storage quota would be exceeded');
            }

            return this._createResult(true, 'Storage size OK');

        } catch (error) {
            // If we can't check size, allow the save attempt
            return this._createResult(true, 'Could not verify storage size');
        }
    }

    _checkStorageWarning() {
        const info = this.getStorageInfo();
        if (info.available && info.percentUsed > (this.warningThreshold * 100)) {
            console.warn(`Storage usage high: ${info.percentUsed}% used`);
        }
    }

    _handleSaveError(error, key, data) {
        console.error('StorageManager save error:', error);

        // Handle specific error types
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            return this._createResult(false, 'Storage quota exceeded. Please free up space.');
        }

        if (error.name === 'SecurityError') {
            return this._createResult(false, 'Storage access denied. Check privacy settings.');
        }

        // Try to save without some data if object is too large
        if (typeof data === 'object' && data !== null) {
            try {
                const simplifiedData = this._simplifyData(data);
                const jsonData = JSON.stringify(simplifiedData);
                localStorage.setItem(this._getPrefixedKey(key), jsonData);
                return this._createResult(true, 'Data saved with reduced content', simplifiedData);
            } catch (simplifyError) {
                return this._createResult(false, `Failed to save even simplified data: ${error.message}`);
            }
        }

        return this._createResult(false, `Save failed: ${error.message}`);
    }

    _handleLoadError(error, key, defaultValue) {
        console.error('StorageManager load error:', error);

        // Handle JSON parsing errors
        if (error instanceof SyntaxError) {
            // Data is corrupted, remove it and return default
            this.remove(key);
            return this._createResult(true, 'Corrupted data removed, using default', defaultValue);
        }

        return this._createResult(false, `Load failed: ${error.message}`, defaultValue);
    }

    _simplifyData(data) {
        // Create a simplified version of complex objects to save space
        if (Array.isArray(data)) {
            return data.slice(0, 100); // Limit arrays to 100 items
        }

        if (typeof data === 'object') {
            const simplified = {};
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'string' && value.length > 1000) {
                    simplified[key] = value.substring(0, 1000) + '... [truncated]';
                } else {
                    simplified[key] = value;
                }
            }
            return simplified;
        }

        return data;
    }
}

// Export for use in other modules
export default StorageManager;

// For testing purposes, also make it available globally
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}