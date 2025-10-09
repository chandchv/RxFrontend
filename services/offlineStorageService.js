import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline Storage Service
 * Manages local data caching and synchronization for offline capabilities
 */
class OfflineStorageService {
  constructor() {
    this.STORAGE_KEYS = {
      DASHBOARD_DATA: 'dashboard_data',
      CLINICAL_RECORDS: 'clinical_records',
      APPOINTMENTS: 'appointments',
      PRESCRIPTIONS: 'prescriptions',
      USER_PROFILE: 'user_profile',
      OFFLINE_ACTIONS: 'offline_actions',
      SYNC_METADATA: 'sync_metadata',
      CACHED_IMAGES: 'cached_images',
    };
    
    this.CACHE_EXPIRY = {
      DASHBOARD: 30 * 60 * 1000, // 30 minutes
      CLINICAL_RECORDS: 60 * 60 * 1000, // 1 hour
      APPOINTMENTS: 15 * 60 * 1000, // 15 minutes
      PRESCRIPTIONS: 30 * 60 * 1000, // 30 minutes
      USER_PROFILE: 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  /**
   * Store data with expiry timestamp
   */
  async storeData(key, data, expiryTime = null) {
    try {
      const storageData = {
        data,
        timestamp: Date.now(),
        expiry: expiryTime ? Date.now() + expiryTime : null,
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(storageData));
      console.log(`Data stored for key: ${key}`);
      return true;
    } catch (error) {
      console.error('Error storing data:', error);
      return false;
    }
  }

  /**
   * Retrieve data with expiry check
   */
  async getData(key) {
    try {
      const storedData = await AsyncStorage.getItem(key);
      if (!storedData) return null;

      const parsedData = JSON.parse(storedData);
      
      // Check if data has expired
      if (parsedData.expiry && Date.now() > parsedData.expiry) {
        await this.removeData(key);
        return null;
      }

      return parsedData.data;
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  }

  /**
   * Remove data from storage
   */
  async removeData(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing data:', error);
      return false;
    }
  }

  /**
   * Store dashboard data with role-specific caching
   */
  async storeDashboardData(role, data) {
    const key = `${this.STORAGE_KEYS.DASHBOARD_DATA}_${role}`;
    return await this.storeData(key, data, this.CACHE_EXPIRY.DASHBOARD);
  }

  /**
   * Get dashboard data for specific role
   */
  async getDashboardData(role) {
    const key = `${this.STORAGE_KEYS.DASHBOARD_DATA}_${role}`;
    return await this.getData(key);
  }

  /**
   * Store clinical records with pagination support
   */
  async storeClinicalRecords(records, page = 1) {
    const key = `${this.STORAGE_KEYS.CLINICAL_RECORDS}_page_${page}`;
    return await this.storeData(key, records, this.CACHE_EXPIRY.CLINICAL_RECORDS);
  }

  /**
   * Get clinical records for specific page
   */
  async getClinicalRecords(page = 1) {
    const key = `${this.STORAGE_KEYS.CLINICAL_RECORDS}_page_${page}`;
    return await this.getData(key);
  }

  /**
   * Store individual clinical record
   */
  async storeClinicalRecord(recordId, record) {
    const key = `clinical_record_${recordId}`;
    return await this.storeData(key, record, this.CACHE_EXPIRY.CLINICAL_RECORDS);
  }

  /**
   * Get individual clinical record
   */
  async getClinicalRecord(recordId) {
    const key = `clinical_record_${recordId}`;
    return await this.getData(key);
  }

  /**
   * Store appointments
   */
  async storeAppointments(appointments) {
    return await this.storeData(
      this.STORAGE_KEYS.APPOINTMENTS,
      appointments,
      this.CACHE_EXPIRY.APPOINTMENTS
    );
  }

  /**
   * Get appointments
   */
  async getAppointments() {
    return await this.getData(this.STORAGE_KEYS.APPOINTMENTS);
  }

  /**
   * Store prescriptions
   */
  async storePrescriptions(prescriptions) {
    return await this.storeData(
      this.STORAGE_KEYS.PRESCRIPTIONS,
      prescriptions,
      this.CACHE_EXPIRY.PRESCRIPTIONS
    );
  }

  /**
   * Get prescriptions
   */
  async getPrescriptions() {
    return await this.getData(this.STORAGE_KEYS.PRESCRIPTIONS);
  }

  /**
   * Store user profile
   */
  async storeUserProfile(profile) {
    return await this.storeData(
      this.STORAGE_KEYS.USER_PROFILE,
      profile,
      this.CACHE_EXPIRY.USER_PROFILE
    );
  }

  /**
   * Get user profile
   */
  async getUserProfile() {
    return await this.getData(this.STORAGE_KEYS.USER_PROFILE);
  }

  /**
   * Store offline actions for later sync
   */
  async storeOfflineAction(action) {
    try {
      const existingActions = await this.getOfflineActions() || [];
      const actionWithId = {
        ...action,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      
      existingActions.push(actionWithId);
      return await this.storeData(this.STORAGE_KEYS.OFFLINE_ACTIONS, existingActions);
    } catch (error) {
      console.error('Error storing offline action:', error);
      return false;
    }
  }

  /**
   * Get all offline actions
   */
  async getOfflineActions() {
    return await this.getData(this.STORAGE_KEYS.OFFLINE_ACTIONS);
  }

  /**
   * Remove processed offline action
   */
  async removeOfflineAction(actionId) {
    try {
      const actions = await this.getOfflineActions() || [];
      const filteredActions = actions.filter(action => action.id !== actionId);
      return await this.storeData(this.STORAGE_KEYS.OFFLINE_ACTIONS, filteredActions);
    } catch (error) {
      console.error('Error removing offline action:', error);
      return false;
    }
  }

  /**
   * Clear all offline actions
   */
  async clearOfflineActions() {
    return await this.removeData(this.STORAGE_KEYS.OFFLINE_ACTIONS);
  }

  /**
   * Store sync metadata
   */
  async storeSyncMetadata(metadata) {
    return await this.storeData(this.STORAGE_KEYS.SYNC_METADATA, metadata);
  }

  /**
   * Get sync metadata
   */
  async getSyncMetadata() {
    return await this.getData(this.STORAGE_KEYS.SYNC_METADATA);
  }

  /**
   * Cache image data
   */
  async cacheImage(imageUrl, imageData) {
    try {
      const cachedImages = await this.getData(this.STORAGE_KEYS.CACHED_IMAGES) || {};
      cachedImages[imageUrl] = {
        data: imageData,
        timestamp: Date.now(),
      };
      return await this.storeData(this.STORAGE_KEYS.CACHED_IMAGES, cachedImages);
    } catch (error) {
      console.error('Error caching image:', error);
      return false;
    }
  }

  /**
   * Get cached image
   */
  async getCachedImage(imageUrl) {
    try {
      const cachedImages = await this.getData(this.STORAGE_KEYS.CACHED_IMAGES) || {};
      return cachedImages[imageUrl]?.data || null;
    } catch (error) {
      console.error('Error getting cached image:', error);
      return null;
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const now = Date.now();
      
      for (const key of allKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          try {
            const parsedData = JSON.parse(data);
            if (parsedData.expiry && now > parsedData.expiry) {
              await AsyncStorage.removeItem(key);
              console.log(`Removed expired cache: ${key}`);
            }
          } catch (parseError) {
            // Skip non-JSON data
            continue;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return false;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      const stats = {};

      for (const key of allKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const size = new Blob([data]).size;
          totalSize += size;
          
          // Categorize by storage key type
          const category = Object.values(this.STORAGE_KEYS).find(storageKey => 
            key.includes(storageKey)
          ) || 'other';
          
          stats[category] = (stats[category] || 0) + size;
        }
      }

      return {
        totalSize,
        totalKeys: allKeys.length,
        categories: stats,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  async clearAllCache() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(allKeys);
      console.log('All cache cleared');
      return true;
    } catch (error) {
      console.error('Error clearing all cache:', error);
      return false;
    }
  }
}

export default new OfflineStorageService();