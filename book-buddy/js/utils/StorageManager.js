/**
 * StorageManager - Reliable localStorage handling for Book Buddy.
 * Provides a clean API with JSON parsing, error handling, and quota checks.
 */
class StorageManager {
  constructor(appPrefix = 'book-buddy') {
    this.prefix = appPrefix;
    this.maxStorageSize = 5 * 1024 * 1024;      // 5 MB quota limit (approximate)
    this.warningThreshold = 0.8;                // Warn at 80% of quota usage

    // Check if localStorage is available and functional
    this.isAvailable = this._testStorageAvailability();
    if (!this.isAvailable) {
      console.warn('Warning: localStorage is not available. Data will not persist.');
    }
  }

  /**
   * Save data to localStorage with error handling.
   * @param {string} key - Key name to save (will be prefixed internally).
   * @param {*} data - The data to store (will be JSON-stringified).
   * @returns {Object} Result object with `success` (bool), `message` (string), and `data` (the stored data or null on failure).
   */
  save(key, data) {
    try {
      if (!this.isAvailable) {
        return this._createResult(false, 'localStorage not available');
      }
      const prefixedKey = this._getPrefixedKey(key);
      const jsonData = JSON.stringify(data);

      // Check if adding this data would exceed storage quota
      const sizeCheck = this._checkStorageSize(jsonData);
      if (!sizeCheck.success) {
        // If quota would be exceeded, do not save and return the warning result
        return sizeCheck;
      }

      localStorage.setItem(prefixedKey, jsonData);
      // After saving, warn if storage usage is above threshold
      this._checkStorageWarning();
      return this._createResult(true, 'Data saved successfully', data);

    } catch (error) {
      // Handle exceptions (e.g., quota exceeded, security error)
      return this._handleSaveError(error, key, data);
    }
  }

  /**
   * Load data from localStorage with error handling.
   * @param {string} key - Key name to load (without prefix).
   * @param {*} [defaultValue=null] - Default value to return if key is missing or on error.
   * @returns {Object} Result object with `success`, `message`, and `data` (loaded data or default).
   */
  load(key, defaultValue = null) {
    try {
      if (!this.isAvailable) {
        // Storage not available: return default value as a successful result (since there's nothing to load)
        return this._createResult(true, 'localStorage not available', defaultValue);
      }
      const prefixedKey = this._getPrefixedKey(key);
      const rawData = localStorage.getItem(prefixedKey);
      if (rawData === null) {
        // Key not found: return default value (treated as a successful load of default)
        return this._createResult(true, 'Key not found', defaultValue);
      }
      // Parse the JSON string from storage
      const parsedData = JSON.parse(rawData);
      return this._createResult(true, 'Data loaded successfully', parsedData);

    } catch (error) {
      // Handle JSON parse errors or other exceptions during load
      return this._handleLoadError(error, key, defaultValue);
    }
  }

  /**
   * Remove an item from localStorage.
   * @param {string} key - Key name to remove (without prefix).
   * @returns {Object} Result object indicating success or failure.
   */
  remove(key) {
    try {
      if (!this.isAvailable) {
        return this._createResult(false, 'localStorage not available');
      }
      const prefixedKey = this._getPrefixedKey(key);
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
   * Clear all Book Buddy data from localStorage (removes keys with the specified prefix).
   * @returns {Object} Result object indicating success or failure.
   */
  clear() {
    try {
      if (!this.isAvailable) {
        return this._createResult(false, 'localStorage not available');
      }
      // Collect all keys that belong to this app (matching the prefix)
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix + '_')) {
          keysToRemove.push(key);
        }
      }
      // Remove each collected key
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return this._createResult(true, `Cleared ${keysToRemove.length} keys`);
    } catch (error) {
      console.error('StorageManager clear error:', error);
      return this._createResult(false, `Failed to clear storage: ${error.message}`);
    }
  }

  /**
   * Get a list of all keys used by this app in localStorage.
   * @returns {string[]} Array of key names (without prefix) currently stored for this app.
   */
  getAllKeys() {
    if (!this.isAvailable) {
      return [];
    }
    const appKeys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix + '_')) {
          // Strip the prefix before returning the key name
          appKeys.push(key.substring(this.prefix.length + 1));
        }
      }
    } catch (error) {
      console.error('StorageManager getAllKeys error:', error);
    }
    return appKeys;
  }

  /**
   * Get current storage usage statistics (overall and for this app).
   * @returns {Object} Info object with usage details.
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
        // Rough estimate: 2 bytes per character (for UTF-16 encoding)
        const itemSize = (key.length + value.length) * 2;
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

  // === Internal Helper Methods ===

  /** Create a prefixed key to avoid collisions in storage. */
  _getPrefixedKey(key) {
    return `${this.prefix}_${key}`;
  }

  /** Create a standardized result object for API responses. */
  _createResult(success, message, data = null) {
    return { success, message, data };
  }

  /** Test if localStorage is available (e.g., not in private mode or blocked by user). */
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

  /** Check if adding data of given size would exceed the storage quota. */
  _checkStorageSize(newDataStr) {
    try {
      // Estimate current storage usage
      const currentSize = JSON.stringify(localStorage).length * 2;
      const newDataSize = newDataStr.length * 2;
      const projectedSize = currentSize + newDataSize;
      if (projectedSize > this.maxStorageSize) {
        return this._createResult(false, 'Storage quota would be exceeded');
      }
      return this._createResult(true, 'Storage size OK');
    } catch (error) {
      // If unable to calculate size, assume OK (fail-safe)
      return this._createResult(true, 'Could not verify storage size');
    }
  }

  /** Check current storage usage and log a warning if above threshold. */
  _checkStorageWarning() {
    const info = this.getStorageInfo();
    if (info.available && info.percentUsed > this.warningThreshold * 100) {
      console.warn(`Warning: Storage usage is high (${info.percentUsed}% of quota used).`);
    }
  }

  /** Handle errors during save operation (quota exceeded, security, etc.). */
  _handleSaveError(error, key, data) {
    console.error('StorageManager save error:', error);
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      // Storage quota exceeded (out of space)
      return this._createResult(false, 'Storage quota exceeded. Please free up space.');
    }
    if (error.name === 'SecurityError') {
      // Access denied (possibly in private mode or storage disabled)
      return this._createResult(false, 'Storage access denied. Check browser settings.');
    }
    // For large objects, attempt to save a simplified version (to handle large data)
    if (typeof data === 'object' && data !== null) {
      try {
        const simplifiedData = this._simplifyData(data);
        const jsonData = JSON.stringify(simplifiedData);
        localStorage.setItem(this._getPrefixedKey(key), jsonData);
        return this._createResult(true, 'Data saved with reduced content', simplifiedData);
      } catch {
        // If even the simplified save fails, fall through to final return
      }
    }
    // Generic fallback for other errors
    return this._createResult(false, `Save failed: ${error.message}`);
  }

  /** Handle errors during load operation (e.g., JSON parse errors). */
  _handleLoadError(error, key, defaultValue) {
    console.error('StorageManager load error:', error);
    if (error instanceof SyntaxError) {
      // Corrupted JSON data encountered; remove the bad item and return default
      this.remove(key);
      return this._createResult(true, 'Corrupted data removed, using default', defaultValue);
    }
    // Other errors: return failure with message and default data
    return this._createResult(false, `Load failed: ${error.message}`, defaultValue);
  }

  /** Simplify a complex data object to a smaller version (to save space if needed). */
  _simplifyData(data) {
    if (Array.isArray(data)) {
      // If it's an array, truncate to first 100 items
      return data.slice(0, 100);
    }
    if (typeof data === 'object' && data !== null) {
      const simplified = {};
      for (const [k, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.length > 1000) {
          // Truncate long strings to 1000 characters
          simplified[k] = value.substring(0, 1000) + '... [truncated]';
        } else {
          simplified[k] = value;
        }
      }
      return simplified;
    }
    // If it's a primitive (number, string short enough, boolean, etc.), return as is
    return data;
  }
}

// Export the class as an ES6 module
export default StorageManager;
