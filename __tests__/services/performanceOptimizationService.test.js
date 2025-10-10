import performanceOptimizationService from '../../services/performanceOptimizationService';
import dataCachingService from '../../services/dataCachingService';
import imageCachingService from '../../services/imageCachingService';

// Mock dependencies
jest.mock('../../services/dataCachingService');
jest.mock('../../services/imageCachingService');
jest.mock('@react-native-community/netinfo');
jest.mock('expo-device');

describe('PerformanceOptimizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    performanceOptimizationService.resetPerformanceData();
  });

  afterEach(() => {
    performanceOptimizationService.stopMonitoring();
  });

  describe('Lazy Component Management', () => {
    test('should register lazy component', () => {
      const componentId = 'test-component';
      const loadFunction = jest.fn().mockResolvedValue({ default: () => null });

      performanceOptimizationService.registerLazyComponent(componentId, loadFunction);

      const registry = performanceOptimizationService.lazyLoadingRegistry;
      expect(registry.has(componentId)).toBe(true);
      expect(registry.get(componentId).loadFunction).toBe(loadFunction);
    });

    test('should load lazy component successfully', async () => {
      const componentId = 'test-component';
      const mockComponent = () => null;
      const loadFunction = jest.fn().mockResolvedValue({ default: mockComponent });

      performanceOptimizationService.registerLazyComponent(componentId, loadFunction);

      const result = await performanceOptimizationService.loadLazyComponent(componentId);

      expect(loadFunction).toHaveBeenCalled();
      expect(result).toBe(mockComponent);

      const componentData = performanceOptimizationService.lazyLoadingRegistry.get(componentId);
      expect(componentData.isLoaded).toBe(true);
      expect(componentData.isActive).toBe(true);
    });

    test('should handle lazy component loading error', async () => {
      const componentId = 'test-component';
      const error = new Error('Load failed');
      const loadFunction = jest.fn().mockRejectedValue(error);

      performanceOptimizationService.registerLazyComponent(componentId, loadFunction);

      await expect(
        performanceOptimizationService.loadLazyComponent(componentId)
      ).rejects.toThrow('Load failed');

      const componentData = performanceOptimizationService.lazyLoadingRegistry.get(componentId);
      expect(componentData.isLoaded).toBe(false);
      expect(componentData.isLoading).toBe(false);
    });

    test('should return existing component if already loaded', async () => {
      const componentId = 'test-component';
      const mockComponent = () => null;
      const loadFunction = jest.fn().mockResolvedValue({ default: mockComponent });

      performanceOptimizationService.registerLazyComponent(componentId, loadFunction);

      // Load component first time
      await performanceOptimizationService.loadLazyComponent(componentId);

      // Load component second time
      const result = await performanceOptimizationService.loadLazyComponent(componentId);

      expect(loadFunction).toHaveBeenCalledTimes(1); // Should only be called once
      expect(result).toBe(mockComponent);
    });

    test('should unload lazy component', () => {
      const componentId = 'test-component';
      const loadFunction = jest.fn();

      performanceOptimizationService.registerLazyComponent(componentId, loadFunction);

      const componentData = performanceOptimizationService.lazyLoadingRegistry.get(componentId);
      componentData.isLoaded = true;
      componentData.component = () => null;

      performanceOptimizationService.unloadLazyComponent(componentId);

      expect(componentData.isLoaded).toBe(false);
      expect(componentData.component).toBeNull();
      expect(componentData.isActive).toBe(false);
    });
  });

  describe('Performance Tracking', () => {
    test('should track render time', () => {
      const componentName = 'TestComponent';
      const renderTime = 150;

      performanceOptimizationService.trackRenderTime(componentName, renderTime);

      const renderTimes = performanceOptimizationService.componentRenderTimes.get(componentName);
      expect(renderTimes).toHaveLength(1);
      expect(renderTimes[0].renderTime).toBe(renderTime);

      const metrics = performanceOptimizationService.performanceMetrics.renderTimes;
      expect(metrics).toHaveLength(1);
      expect(metrics[0].componentName).toBe(componentName);
      expect(metrics[0].renderTime).toBe(renderTime);
    });

    test('should track navigation time', () => {
      const fromScreen = 'HomeScreen';
      const toScreen = 'ProfileScreen';
      const navigationTime = 300;

      performanceOptimizationService.trackNavigationTime(fromScreen, toScreen, navigationTime);

      const metrics = performanceOptimizationService.performanceMetrics.navigationTimes;
      expect(metrics).toHaveLength(1);
      expect(metrics[0].fromScreen).toBe(fromScreen);
      expect(metrics[0].toScreen).toBe(toScreen);
      expect(metrics[0].navigationTime).toBe(navigationTime);
    });

    test('should track API response time', () => {
      const endpoint = '/api/users';
      const responseTime = 1200;
      const success = true;

      performanceOptimizationService.trackAPIResponseTime(endpoint, responseTime, success);

      const metrics = performanceOptimizationService.performanceMetrics.apiResponseTimes;
      expect(metrics).toHaveLength(1);
      expect(metrics[0].endpoint).toBe(endpoint);
      expect(metrics[0].responseTime).toBe(responseTime);
      expect(metrics[0].success).toBe(success);
    });

    test('should limit render time history per component', () => {
      const componentName = 'TestComponent';

      // Add 60 render times (more than the 50 limit)
      for (let i = 0; i < 60; i++) {
        performanceOptimizationService.trackRenderTime(componentName, 100 + i);
      }

      const renderTimes = performanceOptimizationService.componentRenderTimes.get(componentName);
      expect(renderTimes).toHaveLength(50); // Should be limited to 50
      expect(renderTimes[0].renderTime).toBe(110); // First 10 should be removed
    });
  });

  describe('Memory Optimization', () => {
    test('should estimate memory usage', () => {
      // Register some components
      performanceOptimizationService.registerLazyComponent('comp1', jest.fn());
      performanceOptimizationService.registerLazyComponent('comp2', jest.fn());

      // Track some render times
      performanceOptimizationService.trackRenderTime('TestComponent', 100);

      const memoryUsage = performanceOptimizationService.estimateMemoryUsage();

      expect(memoryUsage).toBeGreaterThan(0);
      expect(typeof memoryUsage).toBe('number');
    });

    test('should clear old metrics', () => {
      // Add some old metrics
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      performanceOptimizationService.performanceMetrics.renderTimes.push({
        timestamp: oldTimestamp,
        componentName: 'OldComponent',
        renderTime: 100,
      });

      // Add some recent metrics
      performanceOptimizationService.trackRenderTime('NewComponent', 150);

      performanceOptimizationService.clearOldMetrics();

      const renderTimes = performanceOptimizationService.performanceMetrics.renderTimes;
      expect(renderTimes).toHaveLength(1);
      expect(renderTimes[0].componentName).toBe('NewComponent');
    });

    test('should clear unused lazy components', () => {
      const componentId = 'old-component';
      performanceOptimizationService.registerLazyComponent(componentId, jest.fn());

      const componentData = performanceOptimizationService.lazyLoadingRegistry.get(componentId);
      componentData.lastAccessed = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      componentData.isActive = false;

      performanceOptimizationService.clearUnusedLazyComponents();

      expect(performanceOptimizationService.lazyLoadingRegistry.has(componentId)).toBe(false);
    });

    test('should not clear active lazy components', () => {
      const componentId = 'active-component';
      performanceOptimizationService.registerLazyComponent(componentId, jest.fn());

      const componentData = performanceOptimizationService.lazyLoadingRegistry.get(componentId);
      componentData.lastAccessed = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      componentData.isActive = true; // Still active

      performanceOptimizationService.clearUnusedLazyComponents();

      expect(performanceOptimizationService.lazyLoadingRegistry.has(componentId)).toBe(true);
    });
  });

  describe('Battery Optimization', () => {
    test('should enable battery optimization', () => {
      performanceOptimizationService.enableBatteryOptimization();

      const metrics = performanceOptimizationService.performanceMetrics.batteryOptimizations;
      expect(metrics).toHaveLength(1);
      expect(metrics[0].action).toBe('enabled');
    });

    test('should disable battery optimization', () => {
      performanceOptimizationService.enableBatteryOptimization();
      performanceOptimizationService.disableBatteryOptimization();

      const metrics = performanceOptimizationService.performanceMetrics.batteryOptimizations;
      expect(metrics).toHaveLength(2);
      expect(metrics[1].action).toBe('disabled');
    });
  });

  describe('Performance Metrics Collection', () => {
    test('should collect comprehensive performance metrics', async () => {
      // Mock cache stats
      dataCachingService.getCacheStats.mockResolvedValue({
        storage: { totalSize: 1024 * 1024 },
      });
      imageCachingService.getImageCacheStats.mockResolvedValue({
        totalSize: 2 * 1024 * 1024,
      });

      // Add some performance data
      performanceOptimizationService.registerLazyComponent('comp1', jest.fn());
      performanceOptimizationService.trackRenderTime('TestComponent', 100);
      performanceOptimizationService.trackNavigationTime('Screen1', 'Screen2', 200);
      performanceOptimizationService.trackAPIResponseTime('/api/test', 300);

      const metrics = await performanceOptimizationService.collectPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.lazyComponentsTotal).toBe(1);
      expect(metrics.averageRenderTime).toBe(100);
      expect(metrics.averageNavigationTime).toBe(200);
      expect(metrics.averageAPIResponseTime).toBe(300);
      expect(metrics.cacheStats).toBeDefined();
      expect(metrics.deviceInfo).toBeDefined();
    });

    test('should calculate average render time correctly', () => {
      performanceOptimizationService.trackRenderTime('Component1', 100);
      performanceOptimizationService.trackRenderTime('Component2', 200);
      performanceOptimizationService.trackRenderTime('Component3', 300);

      const average = performanceOptimizationService.calculateAverageRenderTime();
      expect(average).toBe(200);
    });

    test('should return 0 for average when no data', () => {
      const average = performanceOptimizationService.calculateAverageRenderTime();
      expect(average).toBe(0);
    });
  });

  describe('Memory Warning Callbacks', () => {
    test('should add and remove memory warning callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      performanceOptimizationService.addMemoryWarningCallback(callback1);
      performanceOptimizationService.addMemoryWarningCallback(callback2);

      expect(performanceOptimizationService.memoryWarningCallbacks).toHaveLength(2);

      performanceOptimizationService.removeMemoryWarningCallback(callback1);

      expect(performanceOptimizationService.memoryWarningCallbacks).toHaveLength(1);
      expect(performanceOptimizationService.memoryWarningCallbacks[0]).toBe(callback2);
    });
  });

  describe('Configuration', () => {
    test('should update optimization configuration', () => {
      const newConfig = {
        enableLazyLoading: false,
        maxMemoryThreshold: 200 * 1024 * 1024,
      };

      performanceOptimizationService.updateOptimizationConfig(newConfig);

      expect(performanceOptimizationService.optimizationConfig.enableLazyLoading).toBe(false);
      expect(performanceOptimizationService.optimizationConfig.maxMemoryThreshold).toBe(200 * 1024 * 1024);
    });

    test('should get performance report', () => {
      performanceOptimizationService.registerLazyComponent('comp1', jest.fn());
      performanceOptimizationService.trackRenderTime('TestComponent', 100);

      const report = performanceOptimizationService.getPerformanceReport();

      expect(report).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.config).toBeDefined();
      expect(report.lazyComponents).toBeDefined();
      expect(report.averages).toBeDefined();
      expect(report.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Service Lifecycle', () => {
    test('should stop monitoring', () => {
      performanceOptimizationService.initializePerformanceMonitoring();
      
      expect(performanceOptimizationService.isMonitoring).toBe(true);
      
      performanceOptimizationService.stopMonitoring();
      
      expect(performanceOptimizationService.isMonitoring).toBe(false);
    });

    test('should reset performance data', () => {
      performanceOptimizationService.registerLazyComponent('comp1', jest.fn());
      performanceOptimizationService.trackRenderTime('TestComponent', 100);

      performanceOptimizationService.resetPerformanceData();

      expect(performanceOptimizationService.performanceMetrics.renderTimes).toHaveLength(0);
      expect(performanceOptimizationService.componentRenderTimes.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in memory optimization gracefully', async () => {
      // Mock cache services to throw errors
      dataCachingService.getCacheStats.mockRejectedValue(new Error('Cache error'));
      imageCachingService.getImageCacheStats.mockRejectedValue(new Error('Image cache error'));

      // Should not throw
      await expect(
        performanceOptimizationService.collectPerformanceMetrics()
      ).resolves.toBeNull();
    });

    test('should handle errors in memory warning callbacks', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();

      performanceOptimizationService.addMemoryWarningCallback(errorCallback);
      performanceOptimizationService.addMemoryWarningCallback(goodCallback);

      // Trigger memory optimization (which calls callbacks)
      await performanceOptimizationService.optimizeMemoryUsage();

      // Good callback should still be called despite error in first callback
      expect(goodCallback).toHaveBeenCalled();
    });
  });
});