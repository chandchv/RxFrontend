import offlineStorageService from './offlineStorageService';
import mobileApiService from './mobileApiService';

/**
 * Data Caching Service
 * Implements intelligent caching strategies for frequently accessed data
 */
class DataCachingService {
  constructor() {
    this.cacheStrategies = new Map();
    this.accessPatterns = new Map();
    this.cacheHitRates = new Map();
    this.prefetchQueue = [];
    this.isOptimizing = false;
    
    this.initializeCacheStrategies();
  }

  /**
   * Initialize cache strategies for different data types
   */
  initializeCacheStrategies() {
    // Dashboard data - cache with medium priority, refresh every 30 minutes
    this.cacheStrategies.set('dashboard', {
      priority: 'medium',
      ttl: 30 * 60 * 1000, // 30 minutes
      maxSize: 10, // Max 10 dashboard variants
      prefetch: true,
      strategy: 'lru', // Least Recently Used
    });

    // Clinical records - cache with high priority, refresh every hour
    this.cacheStrategies.set('clinical_records', {
      priority: 'high',
      ttl: 60 * 60 * 1000, // 1 hour
      maxSize: 100, // Max 100 records
      prefetch: true,
      strategy: 'lfu', // Least Frequently Used
    });

    // Appointments - cache with high priority, refresh every 15 minutes
    this.cacheStrategies.set('appointments', {
      priority: 'high',
      ttl: 15 * 60 * 1000, // 15 minutes
      maxSize: 50, // Max 50 appointments
      prefetch: true,
      strategy: 'fifo', // First In First Out
    });

    // Prescriptions - cache with medium priority, refresh every 30 minutes
    this.cacheStrategies.set('prescriptions', {
      priority: 'medium',
      ttl: 30 * 60 * 1000, // 30 minutes
      maxSize: 50, // Max 50 prescriptions
      prefetch: false,
      strategy: 'lru',
    });

    // Images and documents - cache with low priority, refresh every 24 hours
    this.cacheStrategies.set('media', {
      priority: 'low',
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 200, // Max 200 media files
      prefetch: false,
      strategy: 'lru',
    });

    // User profiles - cache with medium priority, refresh every 4 hours
    this.cacheStrategies.set('user_profiles', {
      priority: 'medium',
      ttl: 4 * 60 * 60 * 1000, // 4 hours
      maxSize: 20, // Max 20 user profiles
      prefetch: false,
      strategy: 'lru',
    });
  }

  /**
   * Get data with intelligent caching
   */
  async getCachedData(dataType, key, fetchFunction, options = {}) {
    const cacheKey = `${dataType}_${key}`;
    const strategy = this.cacheStrategies.get(dataType);
    
    // Track access pattern
    this.trackAccess(cacheKey);
    
    try {
      // Try to get from cache first
      const cachedData = await offlineStorageService.getData(cacheKey);
      
      if (cachedData && this.isCacheValid(cachedData, strategy)) {
        console.log(`Cache hit for ${cacheKey}`);
        this.recordCacheHit(dataType, true);
        
        // Prefetch if needed
        if (strategy?.prefetch && this.shouldPrefetch(cacheKey)) {
          this.schedulePrefetch(dataType, key, fetchFunction);
        }
        
        return cachedData;
      }
      
      console.log(`Cache miss for ${cacheKey}`);
      this.recordCacheHit(dataType, false);
      
      // Fetch fresh data
      const freshData = await fetchFunction();
      
      // Cache the fresh data
      await this.cacheData(dataType, key, freshData, strategy);
      
      return freshData;
    } catch (error) {
      console.error(`Error getting cached data for ${cacheKey}:`, error);
      
      // Try to return stale cache data as fallback
      const staleData = await offlineStorageService.getData(cacheKey);
      if (staleData) {
        console.log(`Returning stale data for ${cacheKey}`);
        return staleData;
      }
      
      throw error;
    }
  }

  /**
   * Cache data with strategy-specific logic
   */
  async cacheData(dataType, key, data, strategy) {
    const cacheKey = `${dataType}_${key}`;
    
    try {
      // Check cache size limits
      await this.enforceMaxSize(dataType, strategy);
      
      // Store data with TTL
      const success = await offlineStorageService.storeData(
        cacheKey,
        data,
        strategy?.ttl || null
      );
      
      if (success) {
        console.log(`Cached data for ${cacheKey} with TTL ${strategy?.ttl}`);
      }
      
      return success;
    } catch (error) {
      console.error(`Error caching data for ${cacheKey}:`, error);
      return false;
    }
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(cachedData, strategy) {
    if (!strategy?.ttl) return true;
    
    const now = Date.now();
    const cacheTime = cachedData.timestamp || 0;
    const age = now - cacheTime;
    
    return age < strategy.ttl;
  }

  /**
   * Enforce maximum cache size for a data type
   */
  async enforceMaxSize(dataType, strategy) {
    if (!strategy?.maxSize) return;
    
    try {
      const allKeys = await offlineStorageService.getAllKeys();
      const typeKeys = allKeys.filter(key => key.startsWith(`${dataType}_`));
      
      if (typeKeys.length >= strategy.maxSize) {
        const keysToRemove = await this.selectKeysForEviction(
          typeKeys,
          strategy.strategy,
          typeKeys.length - strategy.maxSize + 1
        );
        
        for (const key of keysToRemove) {
          await offlineStorageService.removeData(key);
          console.log(`Evicted cache key: ${key}`);
        }
      }
    } catch (error) {
      console.error(`Error enforcing max size for ${dataType}:`, error);
    }
  }

  /**
   * Select keys for eviction based on strategy
   */
  async selectKeysForEviction(keys, strategy, count) {
    const keyMetadata = [];
    
    for (const key of keys) {
      const data = await offlineStorageService.getData(key);
      const accessPattern = this.accessPatterns.get(key) || { count: 0, lastAccess: 0 };
      
      keyMetadata.push({
        key,
        timestamp: data?.timestamp || 0,
        accessCount: accessPattern.count,
        lastAccess: accessPattern.lastAccess,
      });
    }
    
    let sortedKeys;
    
    switch (strategy) {
      case 'lru': // Least Recently Used
        sortedKeys = keyMetadata.sort((a, b) => a.lastAccess - b.lastAccess);
        break;
      case 'lfu': // Least Frequently Used
        sortedKeys = keyMetadata.sort((a, b) => a.accessCount - b.accessCount);
        break;
      case 'fifo': // First In First Out
        sortedKeys = keyMetadata.sort((a, b) => a.timestamp - b.timestamp);
        break;
      default:
        sortedKeys = keyMetadata.sort((a, b) => a.lastAccess - b.lastAccess);
    }
    
    return sortedKeys.slice(0, count).map(item => item.key);
  }

  /**
   * Track data access patterns
   */
  trackAccess(cacheKey) {
    const now = Date.now();
    const pattern = this.accessPatterns.get(cacheKey) || { count: 0, lastAccess: 0 };
    
    pattern.count += 1;
    pattern.lastAccess = now;
    
    this.accessPatterns.set(cacheKey, pattern);
  }

  /**
   * Record cache hit/miss for analytics
   */
  recordCacheHit(dataType, isHit) {
    const stats = this.cacheHitRates.get(dataType) || { hits: 0, misses: 0 };
    
    if (isHit) {
      stats.hits += 1;
    } else {
      stats.misses += 1;
    }
    
    this.cacheHitRates.set(dataType, stats);
  }

  /**
   * Check if data should be prefetched
   */
  shouldPrefetch(cacheKey) {
    const pattern = this.accessPatterns.get(cacheKey);
    if (!pattern) return false;
    
    // Prefetch if accessed more than 3 times and recently
    const recentlyAccessed = Date.now() - pattern.lastAccess < 5 * 60 * 1000; // 5 minutes
    return pattern.count > 3 && recentlyAccessed;
  }

  /**
   * Schedule data prefetching
   */
  schedulePrefetch(dataType, key, fetchFunction) {
    const prefetchItem = {
      dataType,
      key,
      fetchFunction,
      scheduledAt: Date.now(),
    };
    
    this.prefetchQueue.push(prefetchItem);
    
    // Process prefetch queue if not already processing
    if (!this.isOptimizing) {
      setTimeout(() => this.processPrefetchQueue(), 1000);
    }
  }

  /**
   * Process prefetch queue
   */
  async processPrefetchQueue() {
    if (this.isOptimizing || this.prefetchQueue.length === 0) return;
    
    this.isOptimizing = true;
    
    try {
      while (this.prefetchQueue.length > 0) {
        const item = this.prefetchQueue.shift();
        
        try {
          console.log(`Prefetching ${item.dataType}_${item.key}`);
          const data = await item.fetchFunction();
          const strategy = this.cacheStrategies.get(item.dataType);
          await this.cacheData(item.dataType, item.key, data, strategy);
        } catch (error) {
          console.error(`Error prefetching ${item.dataType}_${item.key}:`, error);
        }
        
        // Small delay between prefetch operations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Optimize cache based on usage patterns
   */
  async optimizeCache() {
    console.log('Starting cache optimization...');
    
    try {
      // Clear expired entries
      await offlineStorageService.clearExpiredCache();
      
      // Analyze access patterns and adjust strategies
      await this.analyzeAndAdjustStrategies();
      
      // Prefetch frequently accessed data
      await this.prefetchFrequentData();
      
      console.log('Cache optimization completed');
    } catch (error) {
      console.error('Error during cache optimization:', error);
    }
  }

  /**
   * Analyze access patterns and adjust cache strategies
   */
  async analyzeAndAdjustStrategies() {
    for (const [dataType, strategy] of this.cacheStrategies.entries()) {
      const hitRate = this.getCacheHitRate(dataType);
      
      // Adjust TTL based on hit rate
      if (hitRate < 0.5) {
        // Low hit rate, increase TTL
        strategy.ttl = Math.min(strategy.ttl * 1.5, 24 * 60 * 60 * 1000);
        console.log(`Increased TTL for ${dataType} to ${strategy.ttl}ms`);
      } else if (hitRate > 0.9) {
        // Very high hit rate, can reduce TTL to save space
        strategy.ttl = Math.max(strategy.ttl * 0.8, 5 * 60 * 1000);
        console.log(`Decreased TTL for ${dataType} to ${strategy.ttl}ms`);
      }
    }
  }

  /**
   * Prefetch frequently accessed data
   */
  async prefetchFrequentData() {
    const frequentKeys = Array.from(this.accessPatterns.entries())
      .filter(([key, pattern]) => pattern.count > 5)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10) // Top 10 most accessed
      .map(([key]) => key);
    
    for (const key of frequentKeys) {
      const [dataType] = key.split('_');
      const strategy = this.cacheStrategies.get(dataType);
      
      if (strategy?.prefetch) {
        // Check if data is stale and needs refresh
        const cachedData = await offlineStorageService.getData(key);
        if (!cachedData || !this.isCacheValid(cachedData, strategy)) {
          // Schedule for prefetch
          console.log(`Scheduling prefetch for frequently accessed key: ${key}`);
          // Note: Would need specific fetch functions for each data type
        }
      }
    }
  }

  /**
   * Get cache hit rate for a data type
   */
  getCacheHitRate(dataType) {
    const stats = this.cacheHitRates.get(dataType);
    if (!stats || (stats.hits + stats.misses) === 0) return 0;
    
    return stats.hits / (stats.hits + stats.misses);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    const storageStats = await offlineStorageService.getStorageStats();
    const hitRates = {};
    
    for (const [dataType, stats] of this.cacheHitRates.entries()) {
      hitRates[dataType] = this.getCacheHitRate(dataType);
    }
    
    return {
      storage: storageStats,
      hitRates,
      accessPatterns: Object.fromEntries(this.accessPatterns),
      strategies: Object.fromEntries(this.cacheStrategies),
      prefetchQueueSize: this.prefetchQueue.length,
      isOptimizing: this.isOptimizing,
    };
  }

  /**
   * Clear cache for specific data type
   */
  async clearCacheForType(dataType) {
    try {
      const allKeys = await offlineStorageService.getAllKeys();
      const typeKeys = allKeys.filter(key => key.startsWith(`${dataType}_`));
      
      for (const key of typeKeys) {
        await offlineStorageService.removeData(key);
      }
      
      // Clear access patterns for this type
      for (const key of this.accessPatterns.keys()) {
        if (key.startsWith(`${dataType}_`)) {
          this.accessPatterns.delete(key);
        }
      }
      
      // Reset hit rate stats
      this.cacheHitRates.delete(dataType);
      
      console.log(`Cleared cache for data type: ${dataType}`);
      return true;
    } catch (error) {
      console.error(`Error clearing cache for ${dataType}:`, error);
      return false;
    }
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidateCache(dataType, key) {
    const cacheKey = `${dataType}_${key}`;
    
    try {
      await offlineStorageService.removeData(cacheKey);
      this.accessPatterns.delete(cacheKey);
      
      console.log(`Invalidated cache for: ${cacheKey}`);
      return true;
    } catch (error) {
      console.error(`Error invalidating cache for ${cacheKey}:`, error);
      return false;
    }
  }

  /**
   * Warm up cache with essential data
   */
  async warmUpCache(userRole) {
    console.log(`Warming up cache for user role: ${userRole}`);
    
    try {
      // Warm up dashboard data
      await this.getCachedData(
        'dashboard',
        userRole,
        () => mobileApiService.getDashboardData(userRole)
      );
      
      // Warm up recent clinical records
      await this.getCachedData(
        'clinical_records',
        'recent',
        () => mobileApiService.getClinicalRecords({ page: 1, limit: 10 })
      );
      
      // Warm up upcoming appointments
      await this.getCachedData(
        'appointments',
        'upcoming',
        () => mobileApiService.getAppointments({ status: 'upcoming' })
      );
      
      console.log('Cache warm-up completed');
    } catch (error) {
      console.error('Error during cache warm-up:', error);
    }
  }
}

export default new DataCachingService();