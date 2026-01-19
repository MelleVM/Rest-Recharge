import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage Service - A wrapper around AsyncStorage with error handling
 * and fallback mechanisms to prevent app crashes due to AsyncStorage issues
 */
class StorageService {
  constructor() {
    this.memoryCache = {};
    this.isAsyncStorageAvailable = true;
    this.checkAsyncStorage();
  }

  /**
   * Check if AsyncStorage is available
   */
  async checkAsyncStorage() {
    try {
      await AsyncStorage.setItem('__storage_test__', 'test');
      await AsyncStorage.removeItem('__storage_test__');
      this.isAsyncStorageAvailable = true;
      console.log('AsyncStorage is available');
    } catch (error) {
      this.isAsyncStorageAvailable = false;
      console.warn('AsyncStorage is not available, using memory cache as fallback', error);
    }
  }

  /**
   * Get an item from storage
   * @param {string} key - The key to retrieve
   * @returns {Promise<any>} - The stored value or null
   */
  async getItem(key) {
    try {
      if (!this.isAsyncStorageAvailable) {
        return this.memoryCache[key] || null;
      }
      
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn(`Error getting item ${key} from storage:`, error);
      return this.memoryCache[key] || null;
    }
  }

  /**
   * Set an item in storage
   * @param {string} key - The key to store
   * @param {any} value - The value to store
   * @returns {Promise<boolean>} - Success status
   */
  async setItem(key, value) {
    try {
      // Always update memory cache
      this.memoryCache[key] = value;
      
      if (!this.isAsyncStorageAvailable) {
        return true;
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Error setting item ${key} in storage:`, error);
      return false;
    }
  }

  /**
   * Remove an item from storage
   * @param {string} key - The key to remove
   * @returns {Promise<boolean>} - Success status
   */
  async removeItem(key) {
    try {
      // Always update memory cache
      delete this.memoryCache[key];
      
      if (!this.isAsyncStorageAvailable) {
        return true;
      }
      
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Error removing item ${key} from storage:`, error);
      return false;
    }
  }

  /**
   * Clear all storage
   * @returns {Promise<boolean>} - Success status
   */
  async clear() {
    try {
      // Always clear memory cache
      this.memoryCache = {};
      
      if (!this.isAsyncStorageAvailable) {
        return true;
      }
      
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.warn('Error clearing storage:', error);
      return false;
    }
  }

  /**
   * Get all keys in storage
   * @returns {Promise<string[]>} - Array of keys
   */
  async getAllKeys() {
    try {
      if (!this.isAsyncStorageAvailable) {
        return Object.keys(this.memoryCache);
      }
      
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.warn('Error getting all keys from storage:', error);
      return Object.keys(this.memoryCache);
    }
  }
}

export default new StorageService();
