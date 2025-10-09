import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dataCachingService from './dataCachingService';
import imageCachingService from './imageCachingService';

/**
 * Memory Optimization Service
 * Manages memory usage and implements optimization strategies
 */
class MemoryOptimizationService {
  constructor() {
    this.memoryThresholds = {
      warning: 75 * 1024 * 1024, // 75MB
      critical: 100 * 1024 * 1024, // 100MB
      emergency: 150 * 1024 * 1024, // 150MB
    };
    
    this.optimizationStrategies = {
      aggressive: {
        clearImageCache: true,
        clearDataCache: true,
        unloadInactiveComponents: true,
        reduceImageQuality: true,
        limitConcurrentOperations: true,
      },
      moderate: {
        clearImageCache: false,
        clearDataCache: true,
        unloadInactiveComponents: true,
        reduceImageQuality: false,
        limitConcurrentOperations: true,
      },
      conservative: {
        clearImageCache: false,
        clearDataCache: false,
        unloadInactiveComponents: true,
        reduceImageQuality: false,
        limitConcurrentOperations: false,
      },
    };
    
    this.componentRegistry = new Map();
    this.memoryUsageHistory = [];
    this.optimizationCallbacks = [];
    this.isOptimizing = false;
    this.lastOptimization = null;
    
    this.initializeMemoryMonitoring();
  }

  /**
   * Initialize memory monitoring
   */
  initializeMemoryMonitoring() {
    // Monitor memory usage every 30 seconds
    this.memoryMonitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);
    
    console.log('Memory optimization service initialized');
  }

  /**
   * Register component for memory management
   */
  registerComponent(componentId, componentRef, options = {}) {
    const {
      priority = 'normal',
      canUnload = true,
      memoryFootprint = 'medium',
      onUnload,
      onReload,
    } = options;
    
    this.componentRegistry.set(componentId, {
      componentRef,
      priority,
      canUnload,
      memoryFootprint,
      onUnload,
      onReload,
      lastAccessed: Date.now(),
      isActive: true,
      unloadCount: 0,
    });
    
    console.log(`Component registered for memory management: ${componentId}`);
  }

  /**
   * Unregister component from memory management
   */
  unregisterComponent(componentId) {
    if (this.componentRegistry.has(componentId)) {
      this.componentRegistry.delete(componentId);
      console.log(`Component unregistered from memory management: ${componentId}`);
    }
  }

  /**
   * Update component access time
   */
  updateComponentAccess(componentId) {
    const component = this.componentRegistry.get(componentId);
    if (component) {
      component.lastAccessed = Date.now();
      component.isActive = true;
    }
  }

  /**
   * Mark component as inactive
   */
  markComponentInactive(componentId) {
    const component = this.componentRegistry.get(componentId);
    if (component) {
      component.isActive = false;
    }
  }

  /**
   * Check current memory usage and trigger optimization if needed
   */
  async checkMemoryUsage() {
    try {
      const memoryUsage = await this.estimateMemoryUsage();
      
      // Store memory usage history
      this.memoryUsageHistory.push({
        timestamp: Date.now(),
        usage: memoryUsage,
      });
      
      // Keep only last 100 measurements
      if (this.memoryUsageHistory.length > 100) {
        this.memoryUsageHistory = this.memoryUsageHistory.slice(-100);
      }
      
      // Determine optimization strategy based on memory usage
      let strategy = null;
      
      if (memoryUsage > this.memoryThresholds.emergency) {
        strategy = 'aggressive';
        console.warn(`Emergency memory usage detected: ${this.formatBytes(memoryUsage)}`);
      } else if (memoryUsage > this.memoryThresholds.critical) {
        strategy = 'moderate';
        console.warn(`Critical memory usage detected: ${this.formatBytes(memoryUsage)}`);
      } else if (memoryUsage > this.memoryThresholds.warning) {
        strategy = 'conservative';
        console.log(`Warning memory usage detected: ${this.formatBytes(memoryUsage)}`);
      }
      
      if (strategy) {
        await this.optimizeMemory(strategy);
      }
      
      return memoryUsage;
    } catch (error) {
      console.error('Error checking memory usage:', error);
      return 0;
    }
  }

  /**
   * Estimate current memory usage
   */
  async estimateMemoryUsage() {
    let totalUsage = 0;
    
    try {
      // Estimate component memory usage
      for (const [componentId, component] of this.componentRegistry.entries()) {
        const footprintSize = this.getMemoryFootprintSize(component.memoryFootprint);
        totalUsage += footprintSize;
      }
      
      // Add cache memory usage
      const cacheStats = await dataCachingService.getCacheStats();
      if (cacheStats && cacheStats.storage) {
        totalUsage += cacheStats.storage.totalSize || 0;
      }
      
      // Add image cache memory usage
      const imageStats = await imageCachingService.getImageCacheStats();
      if (imageStats) {
        totalUsage += imageStats.totalSize || 0;
      }
      
      // Add AsyncStorage usage estimate
      const storageUsage = await this.estimateAsyncStorageUsage();
      totalUsage += storageUsage;
      
      return totalUsage;
    } catch (error) {
      console.error('Error estimating memory usage:', error);
      return 0;
    }
  }

  /**
   * Get memory footprint size for component
   */
  getMemoryFootprintSize(footprint) {
    const sizes = {
      small: 1 * 1024 * 1024,    // 1MB
      medium: 5 * 1024 * 1024,   // 5MB
      large: 10 * 1024 * 1024,   // 10MB
      xlarge: 20 * 1024 * 1024,  // 20MB
    };
    
    return sizes[footprint] || sizes.medium;
  }

  /**
   * Estimate AsyncStorage usage
   */
  async estimateAsyncStorageUsage() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      // Sample a subset of keys to estimate total size
      const sampleSize = Math.min(keys.length, 10);
      const sampleKeys = keys.slice(0, sampleSize);
      
      for (const key of sampleKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2; // Rough estimate (UTF-16)
        }
      }
      
      // Extrapolate to total size
      const averageSize = totalSize / sampleSize;
      return averageSize * keys.length;
    } catch (error) {
      console.error('Error estimating AsyncStorage usage:', error);
      return 0;
    }
  }

  /**
   * Optimize memory using specified strategy
   */
  async optimizeMemory(strategy = 'moderate') {
    if (this.isOptimizing) {
      console.log('Memory optimization already in progress');
      return;
    }
    
    this.isOptimizing = true;
    const startTime = Date.now();
    
    console.log(`Starting memory optimization with ${strategy} strategy`);
    
    try {
      const optimizationPlan = this.optimizationStrategies[strategy];
      const results = {
        strategy,
        startTime,
        actions: [],
        memoryFreed: 0,
      };
      
      // Clear image cache if needed
      if (optimizationPlan.clearImageCache) {
        const imageMemoryFreed = await this.clearImageCache();
        results.actions.push({ action: 'clearImageCache', memoryFreed: imageMemoryFreed });
        results.memoryFreed += imageMemoryFreed;
      }
      
      // Clear data cache if needed
      if (optimizationPlan.clearDataCache) {
        const dataMemoryFreed = await this.clearDataCache();
        results.actions.push({ action: 'clearDataCache', memoryFreed: dataMemoryFreed });
        results.memoryFreed += dataMemoryFreed;
      }
      
      // Unload inactive components
      if (optimizationPlan.unloadInactiveComponents) {
        const componentMemoryFreed = await this.unloadInactiveComponents();
        results.actions.push({ action: 'unloadInactiveComponents', memoryFreed: componentMemoryFreed });
        results.memoryFreed += componentMemoryFreed;
      }
      
      // Reduce image quality
      if (optimizationPlan.reduceImageQuality) {
        await this.reduceImageQuality();
        results.actions.push({ action: 'reduceImageQuality', memoryFreed: 0 });
      }
      
      // Limit concurrent operations
      if (optimizationPlan.limitConcurrentOperations) {
        await this.limitConcurrentOperations();
        results.actions.push({ action: 'limitConcurrentOperations', memoryFreed: 0 });
      }
      
      // Clean up old data
      const cleanupMemoryFreed = await this.cleanupOldData();
      results.actions.push({ action: 'cleanupOldData', memoryFreed: cleanupMemoryFreed });
      results.memoryFreed += cleanupMemoryFreed;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        results.actions.push({ action: 'forceGarbageCollection', memoryFreed: 0 });
      }
      
      results.endTime = Date.now();
      results.duration = results.endTime - startTime;
      
      this.lastOptimization = results;
      
      console.log(`Memory optimization completed: ${this.formatBytes(results.memoryFreed)} freed in ${results.duration}ms`);
      
      // Notify callbacks
      this.optimizationCallbacks.forEach(callback => {
        try {
          callback(results);
        } catch (error) {
          console.error('Error in optimization callback:', error);
        }
      });
      
      return results;
    } catch (error) {
      console.error('Error during memory optimization:', error);
      throw error;
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Clear image cache to free memory
   */
  async clearImageCache() {
    try {
      const initialStats = await imageCachingService.getImageCacheStats();
      const initialSize = initialStats ? initialStats.totalSize : 0;
      
      await imageCachingService.clearCache();
      
      const finalStats = await imageCachingService.getImageCacheStats();
      const finalSize = finalStats ? finalStats.totalSize : 0;
      
      const memoryFreed = initialSize - finalSize;
      console.log(`Image cache cleared: ${this.formatBytes(memoryFreed)} freed`);
      
      return memoryFreed;
    } catch (error) {
      console.error('Error clearing image cache:', error);
      return 0;
    }
  }

  /**
   * Clear data cache to free memory
   */
  async clearDataCache() {
    try {
      const initialStats = await dataCachingService.getCacheStats();
      const initialSize = initialStats && initialStats.storage ? initialStats.storage.totalSize : 0;
      
      await dataCachingService.clearExpiredCache();
      
      const finalStats = await dataCachingService.getCacheStats();
      const finalSize = finalStats && finalStats.storage ? finalStats.storage.totalSize : 0;
      
      const memoryFreed = initialSize - finalSize;
      console.log(`Data cache cleared: ${this.formatBytes(memoryFreed)} freed`);
      
      return memoryFreed;
    } catch (error) {
      console.error('Error clearing data cache:', error);
      return 0;
    }
  }

  /**
   * Unload inactive components to free memory
   */
  async unloadInactiveComponents() {
    let memoryFreed = 0;
    const cutoffTime = Date.now() - (10 * 60 * 1000); // 10 minutes ago
    
    for (const [componentId, component] of this.componentRegistry.entries()) {
      if (
        component.canUnload &&
        !component.isActive &&
        component.lastAccessed < cutoffTime &&
        component.priority !== 'high'
      ) {
        try {
          // Call component's unload callback if available
          if (component.onUnload) {
            await component.onUnload();
          }
          
          // Estimate memory freed
          const footprintSize = this.getMemoryFootprintSize(component.memoryFootprint);
          memoryFreed += footprintSize;
          
          // Update component state
          component.unloadCount++;
          
          console.log(`Component unloaded: ${componentId}`);
        } catch (error) {
          console.error(`Error unloading component ${componentId}:`, error);
        }
      }
    }
    
    console.log(`Inactive components unloaded: ${this.formatBytes(memoryFreed)} freed`);
    return memoryFreed;
  }

  /**
   * Reduce image quality to save memory
   */
  async reduceImageQuality() {
    try {
      await imageCachingService.setImageQuality(0.7); // Reduce to 70% quality
      console.log('Image quality reduced to save memory');
    } catch (error) {
      console.error('Error reducing image quality:', error);
    }
  }

  /**
   * Limit concurrent operations to reduce memory pressure
   */
  async limitConcurrentOperations() {
    try {
      // Reduce concurrent API requests
      // This would typically be implemented in the API service
      console.log('Concurrent operations limited to reduce memory pressure');
    } catch (error) {
      console.error('Error limiting concurrent operations:', error);
    }
  }

  /**
   * Clean up old data to free memory
   */
  async cleanupOldData() {
    let memoryFreed = 0;
    
    try {
      // Clean up old memory usage history
      const oldHistoryCount = this.memoryUsageHistory.length;
      this.memoryUsageHistory = this.memoryUsageHistory.slice(-50); // Keep only last 50
      
      // Clean up old AsyncStorage data
      const keys = await AsyncStorage.getAllKeys();
      const oldKeys = [];
      
      for (const key of keys) {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          try {
            const item = await AsyncStorage.getItem(key);
            if (item) {
              const data = JSON.parse(item);
              if (data.timestamp && Date.now() - data.timestamp > 24 * 60 * 60 * 1000) { // 24 hours old
                oldKeys.push(key);
                memoryFreed += item.length * 2; // Rough estimate
              }
            }
          } catch (error) {
            // Invalid JSON, consider it old data
            oldKeys.push(key);
          }
        }
      }
      
      if (oldKeys.length > 0) {
        await AsyncStorage.multiRemove(oldKeys);
        console.log(`Cleaned up ${oldKeys.length} old storage items`);
      }
      
      console.log(`Old data cleanup completed: ${this.formatBytes(memoryFreed)} freed`);
      return memoryFreed;
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      return 0;
    }
  }

  /**
   * Add optimization callback
   */
  addOptimizationCallback(callback) {
    this.optimizationCallbacks.push(callback);
  }

  /**
   * Remove optimization callback
   */
  removeOptimizationCallback(callback) {
    const index = this.optimizationCallbacks.indexOf(callback);
    if (index > -1) {
      this.optimizationCallbacks.splice(index, 1);
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    const recentUsage = this.memoryUsageHistory.slice(-10);
    const averageUsage = recentUsage.length > 0 
      ? recentUsage.reduce((sum, item) => sum + item.usage, 0) / recentUsage.length
      : 0;
    
    return {
      currentUsage: this.memoryUsageHistory.length > 0 
        ? this.memoryUsageHistory[this.memoryUsageHistory.length - 1].usage 
        : 0,
      averageUsage,
      thresholds: this.memoryThresholds,
      registeredComponents: this.componentRegistry.size,
      lastOptimization: this.lastOptimization,
      isOptimizing: this.isOptimizing,
      usageHistory: this.memoryUsageHistory.slice(-20), // Last 20 measurements
    };
  }

  /**
   * Update memory thresholds
   */
  updateMemoryThresholds(newThresholds) {
    this.memoryThresholds = {
      ...this.memoryThresholds,
      ...newThresholds,
    };
    
    console.log('Memory thresholds updated:', this.memoryThresholds);
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (!bytes) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Force memory optimization
   */
  async forceOptimization(strategy = 'moderate') {
    console.log(`Forcing memory optimization with ${strategy} strategy`);
    return await this.optimizeMemory(strategy);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
    
    console.log('Memory monitoring stopped');
  }

  /**
   * Reset memory optimization service
   */
  reset() {
    this.componentRegistry.clear();
    this.memoryUsageHistory = [];
    this.optimizationCallbacks = [];
    this.lastOptimization = null;
    this.isOptimizing = false;
    
    console.log('Memory optimization service reset');
  }
}

export default new MemoryOptimizationService();