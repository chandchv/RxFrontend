import { InteractionManager, Dimensions, Platform } from 'react-native';
import * as Device from 'expo-device';
import dataCachingService from './dataCachingService';
import imageCachingService from './imageCachingService';
import apiOptimizationService from './apiOptimizationService';

/**
 * Performance Optimization Service
 * Comprehensive performance monitoring and optimization for React Native app
 */
class PerformanceOptimizationService {
  constructor() {
    this.performanceMetrics = {
      memoryUsage: [],
      renderTimes: [],
      navigationTimes: [],
      apiResponseTimes: [],
      batteryOptimizations: [],
    };
    
    this.optimizationConfig = {
      enableLazyLoading: true,
      enableMemoryOptimization: true,
      enableBatteryOptimization: true,
      maxMemoryThreshold: 100 * 1024 * 1024, // 100MB
      performanceMonitoringInterval: 30000, // 30 seconds
      lowMemoryThreshold: 50 * 1024 * 1024, // 50MB
    };
    
    this.lazyLoadingRegistry = new Map();
    this.componentRenderTimes = new Map();
    this.memoryWarningCallbacks = [];
    this.isMonitoring = false;
    
    this.initializePerformanceMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  initializePerformanceMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Performance monitoring initialized');
    
    // Start periodic performance checks
    this.performanceInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, this.optimizationConfig.performanceMonitoringInterval);
    
    // Monitor memory warnings
    this.setupMemoryWarningHandlers();
    
    // Setup device-specific optimizations
    this.setupDeviceOptimizations();
  }

  /**
   * Setup device-specific optimizations
   */
  setupDeviceOptimizations() {
    const deviceInfo = {
      brand: Device.brand,
      modelName: Device.modelName,
      totalMemory: Device.totalMemory,
      platform: Platform.OS,
      version: Platform.Version,
    };
    
    console.log('Device info:', deviceInfo);
    
    // Adjust optimization settings based on device capabilities
    if (deviceInfo.totalMemory && deviceInfo.totalMemory < 2 * 1024 * 1024 * 1024) { // Less than 2GB RAM
      this.optimizationConfig.maxMemoryThreshold = 50 * 1024 * 1024; // 50MB
      this.optimizationConfig.lowMemoryThreshold = 25 * 1024 * 1024; // 25MB
      console.log('Low-memory device detected, adjusting thresholds');
    }
    
    // Platform-specific optimizations
    if (Platform.OS === 'android') {
      this.setupAndroidOptimizations();
    } else if (Platform.OS === 'ios') {
      this.setupIOSOptimizations();
    }
  }

  /**
   * Setup Android-specific optimizations
   */
  setupAndroidOptimizations() {
    console.log('Setting up Android optimizations');
    
    // Enable hardware acceleration optimizations
    this.optimizationConfig.enableHardwareAcceleration = true;
    
    // Optimize for different Android versions
    if (Platform.Version >= 28) {
      this.optimizationConfig.enableAdvancedMemoryManagement = true;
    }
  }

  /**
   * Setup iOS-specific optimizations
   */
  setupIOSOptimizations() {
    console.log('Setting up iOS optimizations');
    
    // Enable iOS-specific memory optimizations
    this.optimizationConfig.enableIOSMemoryOptimization = true;
    
    // Optimize for different iOS versions
    if (parseFloat(Platform.Version) >= 14.0) {
      this.optimizationConfig.enableAdvancedIOSFeatures = true;
    }
  }

  /**
   * Setup memory warning handlers
   */
  setupMemoryWarningHandlers() {
    // Note: React Native doesn't have direct memory warning events
    // This is a simulation of memory monitoring
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Check current memory usage and trigger optimizations if needed
   */
  async checkMemoryUsage() {
    try {
      // Simulate memory usage check (in a real app, you'd use native modules)
      const estimatedMemoryUsage = this.estimateMemoryUsage();
      
      this.performanceMetrics.memoryUsage.push({
        timestamp: Date.now(),
        usage: estimatedMemoryUsage,
      });
      
      // Keep only last 100 measurements
      if (this.performanceMetrics.memoryUsage.length > 100) {
        this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-100);
      }
      
      // Trigger memory optimization if threshold exceeded
      if (estimatedMemoryUsage > this.optimizationConfig.lowMemoryThreshold) {
        console.log('Memory threshold exceeded, triggering optimizations');
        await this.optimizeMemoryUsage();
      }
    } catch (error) {
      console.error('Error checking memory usage:', error);
    }
  }

  /**
   * Estimate current memory usage
   */
  estimateMemoryUsage() {
    // This is a rough estimation based on cached data and component registry
    let estimatedUsage = 0;
    
    // Add cache sizes
    estimatedUsage += this.lazyLoadingRegistry.size * 1024; // Rough estimate per component
    estimatedUsage += this.componentRenderTimes.size * 512; // Render time data
    
    // Add estimated image cache size
    estimatedUsage += 10 * 1024 * 1024; // Rough estimate for image cache
    
    // Add estimated data cache size
    estimatedUsage += 5 * 1024 * 1024; // Rough estimate for data cache
    
    return estimatedUsage;
  }

  /**
   * Optimize memory usage when threshold is exceeded
   */
  async optimizeMemoryUsage() {
    console.log('Starting memory optimization');
    
    try {
      // Clear old performance metrics
      this.clearOldMetrics();
      
      // Optimize image cache
      await imageCachingService.optimizeCache();
      
      // Optimize data cache
      await dataCachingService.optimizeCache();
      
      // Clear unused lazy loading components
      this.clearUnusedLazyComponents();
      
      // Trigger garbage collection hint (if available)
      if (global.gc) {
        global.gc();
      }
      
      console.log('Memory optimization completed');
      
      // Notify callbacks
      this.memoryWarningCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in memory warning callback:', error);
        }
      });
    } catch (error) {
      console.error('Error during memory optimization:', error);
    }
  }

  /**
   * Clear old performance metrics to free memory
   */
  clearOldMetrics() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage
      .filter(metric => metric.timestamp > cutoffTime);
    
    this.performanceMetrics.renderTimes = this.performanceMetrics.renderTimes
      .filter(metric => metric.timestamp > cutoffTime);
    
    this.performanceMetrics.navigationTimes = this.performanceMetrics.navigationTimes
      .filter(metric => metric.timestamp > cutoffTime);
    
    this.performanceMetrics.apiResponseTimes = this.performanceMetrics.apiResponseTimes
      .filter(metric => metric.timestamp > cutoffTime);
  }

  /**
   * Clear unused lazy loading components
   */
  clearUnusedLazyComponents() {
    const cutoffTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago
    
    for (const [componentId, data] of this.lazyLoadingRegistry.entries()) {
      if (data.lastAccessed < cutoffTime && !data.isActive) {
        this.lazyLoadingRegistry.delete(componentId);
      }
    }
    
    console.log(`Cleared ${this.lazyLoadingRegistry.size} unused lazy components`);
  }

  /**
   * Register component for lazy loading
   */
  registerLazyComponent(componentId, loadFunction, priority = 'normal') {
    this.lazyLoadingRegistry.set(componentId, {
      loadFunction,
      priority,
      isLoaded: false,
      isLoading: false,
      isActive: false,
      lastAccessed: Date.now(),
      loadTime: null,
    });
    
    console.log(`Registered lazy component: ${componentId}`);
  }

  /**
   * Load component lazily with optimization
   */
  async loadLazyComponent(componentId) {
    const componentData = this.lazyLoadingRegistry.get(componentId);
    
    if (!componentData) {
      throw new Error(`Lazy component not registered: ${componentId}`);
    }
    
    if (componentData.isLoaded) {
      componentData.lastAccessed = Date.now();
      componentData.isActive = true;
      return componentData.component;
    }
    
    if (componentData.isLoading) {
      // Wait for existing load to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (componentData.isLoaded) {
            clearInterval(checkInterval);
            resolve(componentData.component);
          }
        }, 100);
      });
    }
    
    componentData.isLoading = true;
    const startTime = Date.now();
    
    try {
      console.log(`Loading lazy component: ${componentId}`);
      
      // Use InteractionManager to defer loading until after interactions
      await InteractionManager.runAfterInteractions();
      
      const component = await componentData.loadFunction();
      
      const loadTime = Date.now() - startTime;
      
      componentData.component = component;
      componentData.isLoaded = true;
      componentData.isLoading = false;
      componentData.isActive = true;
      componentData.lastAccessed = Date.now();
      componentData.loadTime = loadTime;
      
      console.log(`Lazy component loaded: ${componentId} (${loadTime}ms)`);
      
      return component;
    } catch (error) {
      componentData.isLoading = false;
      console.error(`Error loading lazy component: ${componentId}`, error);
      throw error;
    }
  }

  /**
   * Unload lazy component to free memory
   */
  unloadLazyComponent(componentId) {
    const componentData = this.lazyLoadingRegistry.get(componentId);
    
    if (componentData && componentData.isLoaded) {
      componentData.component = null;
      componentData.isLoaded = false;
      componentData.isActive = false;
      
      console.log(`Unloaded lazy component: ${componentId}`);
    }
  }

  /**
   * Track component render time
   */
  trackRenderTime(componentName, renderTime) {
    if (!this.componentRenderTimes.has(componentName)) {
      this.componentRenderTimes.set(componentName, []);
    }
    
    const renderTimes = this.componentRenderTimes.get(componentName);
    renderTimes.push({
      timestamp: Date.now(),
      renderTime,
    });
    
    // Keep only last 50 render times per component
    if (renderTimes.length > 50) {
      renderTimes.splice(0, renderTimes.length - 50);
    }
    
    this.performanceMetrics.renderTimes.push({
      timestamp: Date.now(),
      componentName,
      renderTime,
    });
    
    // Log slow renders
    if (renderTime > 100) { // More than 100ms
      console.warn(`Slow render detected: ${componentName} (${renderTime}ms)`);
    }
  }

  /**
   * Track navigation time
   */
  trackNavigationTime(fromScreen, toScreen, navigationTime) {
    this.performanceMetrics.navigationTimes.push({
      timestamp: Date.now(),
      fromScreen,
      toScreen,
      navigationTime,
    });
    
    console.log(`Navigation: ${fromScreen} -> ${toScreen} (${navigationTime}ms)`);
    
    // Log slow navigation
    if (navigationTime > 500) { // More than 500ms
      console.warn(`Slow navigation detected: ${fromScreen} -> ${toScreen} (${navigationTime}ms)`);
    }
  }

  /**
   * Track API response time
   */
  trackAPIResponseTime(endpoint, responseTime, success = true) {
    this.performanceMetrics.apiResponseTimes.push({
      timestamp: Date.now(),
      endpoint,
      responseTime,
      success,
    });
    
    // Log slow API responses
    if (responseTime > 2000) { // More than 2 seconds
      console.warn(`Slow API response: ${endpoint} (${responseTime}ms)`);
    }
  }

  /**
   * Enable battery optimization
   */
  enableBatteryOptimization() {
    console.log('Enabling battery optimization');
    
    // Reduce background processing
    this.optimizationConfig.performanceMonitoringInterval = 60000; // 1 minute
    
    // Reduce image quality for battery saving
    imageCachingService.setBatteryOptimization(true);
    
    // Reduce API polling frequency
    apiOptimizationService.setOptimizationConfig({
      maxConcurrentRequests: 2,
      requestTimeout: 15000,
    });
    
    this.performanceMetrics.batteryOptimizations.push({
      timestamp: Date.now(),
      action: 'enabled',
    });
  }

  /**
   * Disable battery optimization
   */
  disableBatteryOptimization() {
    console.log('Disabling battery optimization');
    
    // Restore normal performance monitoring
    this.optimizationConfig.performanceMonitoringInterval = 30000; // 30 seconds
    
    // Restore normal image quality
    imageCachingService.setBatteryOptimization(false);
    
    // Restore normal API settings
    apiOptimizationService.setOptimizationConfig({
      maxConcurrentRequests: 5,
      requestTimeout: 30000,
    });
    
    this.performanceMetrics.batteryOptimizations.push({
      timestamp: Date.now(),
      action: 'disabled',
    });
  }

  /**
   * Collect comprehensive performance metrics
   */
  async collectPerformanceMetrics() {
    try {
      const metrics = {
        timestamp: Date.now(),
        memoryUsage: this.estimateMemoryUsage(),
        lazyComponentsLoaded: Array.from(this.lazyLoadingRegistry.values())
          .filter(comp => comp.isLoaded).length,
        lazyComponentsTotal: this.lazyLoadingRegistry.size,
        averageRenderTime: this.calculateAverageRenderTime(),
        averageNavigationTime: this.calculateAverageNavigationTime(),
        averageAPIResponseTime: this.calculateAverageAPIResponseTime(),
        cacheStats: await this.getCacheStats(),
        deviceInfo: this.getDeviceInfo(),
      };
      
      // Store metrics for analysis
      await dataCachingService.cacheData('performance_metrics', 'latest', metrics);
      
      return metrics;
    } catch (error) {
      console.error('Error collecting performance metrics:', error);
      return null;
    }
  }

  /**
   * Calculate average render time
   */
  calculateAverageRenderTime() {
    const recentRenderTimes = this.performanceMetrics.renderTimes
      .filter(metric => Date.now() - metric.timestamp < 300000) // Last 5 minutes
      .map(metric => metric.renderTime);
    
    if (recentRenderTimes.length === 0) return 0;
    
    return recentRenderTimes.reduce((sum, time) => sum + time, 0) / recentRenderTimes.length;
  }

  /**
   * Calculate average navigation time
   */
  calculateAverageNavigationTime() {
    const recentNavigationTimes = this.performanceMetrics.navigationTimes
      .filter(metric => Date.now() - metric.timestamp < 300000) // Last 5 minutes
      .map(metric => metric.navigationTime);
    
    if (recentNavigationTimes.length === 0) return 0;
    
    return recentNavigationTimes.reduce((sum, time) => sum + time, 0) / recentNavigationTimes.length;
  }

  /**
   * Calculate average API response time
   */
  calculateAverageAPIResponseTime() {
    const recentAPITimes = this.performanceMetrics.apiResponseTimes
      .filter(metric => Date.now() - metric.timestamp < 300000) // Last 5 minutes
      .map(metric => metric.responseTime);
    
    if (recentAPITimes.length === 0) return 0;
    
    return recentAPITimes.reduce((sum, time) => sum + time, 0) / recentAPITimes.length;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const [dataCache, imageCache, apiCache] = await Promise.all([
        dataCachingService.getCacheStats(),
        imageCachingService.getImageCacheStats(),
        apiOptimizationService.getOptimizationStats(),
      ]);
      
      return {
        dataCache,
        imageCache,
        apiCache,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    const { width, height } = Dimensions.get('window');
    
    return {
      platform: Platform.OS,
      version: Platform.Version,
      screenWidth: width,
      screenHeight: height,
      brand: Device.brand,
      modelName: Device.modelName,
      totalMemory: Device.totalMemory,
    };
  }

  /**
   * Add memory warning callback
   */
  addMemoryWarningCallback(callback) {
    this.memoryWarningCallbacks.push(callback);
  }

  /**
   * Remove memory warning callback
   */
  removeMemoryWarningCallback(callback) {
    const index = this.memoryWarningCallbacks.indexOf(callback);
    if (index > -1) {
      this.memoryWarningCallbacks.splice(index, 1);
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    return {
      metrics: this.performanceMetrics,
      config: this.optimizationConfig,
      lazyComponents: {
        total: this.lazyLoadingRegistry.size,
        loaded: Array.from(this.lazyLoadingRegistry.values()).filter(comp => comp.isLoaded).length,
        active: Array.from(this.lazyLoadingRegistry.values()).filter(comp => comp.isActive).length,
      },
      averages: {
        renderTime: this.calculateAverageRenderTime(),
        navigationTime: this.calculateAverageNavigationTime(),
        apiResponseTime: this.calculateAverageAPIResponseTime(),
      },
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Update optimization configuration
   */
  updateOptimizationConfig(newConfig) {
    this.optimizationConfig = {
      ...this.optimizationConfig,
      ...newConfig,
    };
    
    console.log('Performance optimization config updated:', newConfig);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  /**
   * Reset all performance data
   */
  resetPerformanceData() {
    this.performanceMetrics = {
      memoryUsage: [],
      renderTimes: [],
      navigationTimes: [],
      apiResponseTimes: [],
      batteryOptimizations: [],
    };
    
    this.componentRenderTimes.clear();
    console.log('Performance data reset');
  }
}

export default new PerformanceOptimizationService();