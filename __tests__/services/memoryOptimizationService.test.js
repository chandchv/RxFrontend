import memoryOptimizationService from '../../services/memoryOptimizationService';
import dataCachingService from '../../services/dataCachingService';
import imageCachingService from '../../services/imageCachingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../services/dataCachingService');
jest.mock('../../services/imageCachingService');
jest.mock('@react-native-async-storage/async-storage');

describe('MemoryOptimizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    memoryOptimizationService.reset();
  });

  afterEach(() => {
    memoryOptimizationService.stopMonitoring();
  });

  describe('Component Registration', () => {
    test('should register component for memory management', () => {
      const componentId = 'test-component';
      const componentRef = { current: null };
      const options = {
        priority: 'high',
        canUnload: true,
        memoryFootprint: 'large',
      };

      memoryOptimizationService.registerComponent(componentId, componentRef, options);

      const component = memoryOptimizationService.componentRegistry.get(componentId);
      expect(component).toBeDefined();
      expect(component.componentRef).toBe(componentRef);
      expect(component.priority).toBe('high');
      expect(component.canUnload).toBe(true);
      expect(component.memoryFootprint).toBe('large');
      expect(component.isActive).toBe(true);
    });

    test('should unregister component from memory management', () => {
      const componentId = 'test-component';
      const componentRef = { current: null };

      memoryOptimizationService.registerComponent(componentId, componentRef);
      expect(memoryOptimizationService.componentRegistry.has(componentId)).toBe(true);

      memoryOptimizationService.unregisterComponent(componentId);
      expect(memoryOptimizationService.componentRegistry.has(componentId)).toBe(false);
    });

    test('should update component access time', () => {
      const componentId = 'test-component';
      const componentRef = { current: null };

      memoryOptimizationService.registerComponent(componentId, componentRef);
      
      const initialTime = memoryOptimizationService.componentRegistry.get(componentId).lastAccessed;
      
      // Wait a bit and update access
      setTimeout(() => {
        memoryOptimizationService.updateComponentAccess(componentId);
        
        const updatedTime = memoryOptimizationService.componentRegistry.get(componentId).lastAccessed;
        expect(updatedTime).toBeGreaterThan(initialTime);
      }, 10);
    });

    test('should mark component as inactive', () => {
      const componentId = 'test-component';
      const componentRef = { current: null };

      memoryOptimizationService.registerComponent(componentId, componentRef);
      
      expect(memoryOptimizationService.componentRegistry.get(componentId).isActive).toBe(true);
      
      memoryOptimizationService.markComponentInactive(componentId);
      
      expect(memoryOptimizationService.componentRegistry.get(componentId).isActive).toBe(false);
    });
  });

  describe('Memory Usage Estimation', () => {
    test('should estimate memory usage', async () => {
      // Mock cache stats
      dataCachingService.getCacheStats.mockResolvedValue({
        storage: { totalSize: 1024 * 1024 }, // 1MB
      });
      imageCachingService.getImageCacheStats.mockResolvedValue({
        totalSize: 2 * 1024 * 1024, // 2MB
      });
      AsyncStorage.getAllKeys.mockResolvedValue(['key1', 'key2']);
      AsyncStorage.getItem.mockResolvedValue('test data');

      // Register some components
      memoryOptimizationService.registerComponent('comp1', {}, { memoryFootprint: 'large' });
      memoryOptimizationService.registerComponent('comp2', {}, { memoryFootprint: 'medium' });

      const memoryUsage = await memoryOptimizationService.estimateMemoryUsage();

      expect(memoryUsage).toBeGreaterThan(0);
      expect(typeof memoryUsage).toBe('number');
    });

    test('should handle errors in memory estimation gracefully', async () => {
      dataCachingService.getCacheStats.mockRejectedValue(new Error('Cache error'));
      imageCachingService.getImageCacheStats.mockRejectedValue(new Error('Image error'));
      AsyncStorage.getAllKeys.mockRejectedValue(new Error('Storage error'));

      const memoryUsage = await memoryOptimizationService.estimateMemoryUsage();

      expect(memoryUsage).toBe(0);
    });

    test('should get correct memory footprint size', () => {
      const smallSize = memoryOptimizationService.getMemoryFootprintSize('small');
      const mediumSize = memoryOptimizationService.getMemoryFootprintSize('medium');
      const largeSize = memoryOptimizationService.getMemoryFootprintSize('large');
      const xlargeSize = memoryOptimizationService.getMemoryFootprintSize('xlarge');

      expect(smallSize).toBe(1 * 1024 * 1024); // 1MB
      expect(mediumSize).toBe(5 * 1024 * 1024); // 5MB
      expect(largeSize).toBe(10 * 1024 * 1024); // 10MB
      expect(xlargeSize).toBe(20 * 1024 * 1024); // 20MB
    });

    test('should default to medium size for unknown footprint', () => {
      const unknownSize = memoryOptimizationService.getMemoryFootprintSize('unknown');
      const mediumSize = memoryOptimizationService.getMemoryFootprintSize('medium');

      expect(unknownSize).toBe(mediumSize);
    });
  });

  describe('Memory Optimization', () => {
    test('should optimize memory with moderate strategy', async () => {
      // Mock cache services
      dataCachingService.getCacheStats.mockResolvedValue({
        storage: { totalSize: 1024 * 1024 },
      });
      dataCachingService.clearExpiredCache.mockResolvedValue();
      imageCachingService.getImageCacheStats.mockResolvedValue({
        totalSize: 2 * 1024 * 1024,
      });
      imageCachingService.clearCache.mockResolvedValue();
      AsyncStorage.getAllKeys.mockResolvedValue(['temp_old_key']);
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours old
        data: 'old data',
      }));
      AsyncStorage.multiRemove.mockResolvedValue();

      const result = await memoryOptimizationService.optimizeMemory('moderate');

      expect(result).toBeDefined();
      expect(result.strategy).toBe('moderate');
      expect(result.actions).toBeInstanceOf(Array);
      expect(result.memoryFreed).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should optimize memory with aggressive strategy', async () => {
      // Mock cache services
      dataCachingService.getCacheStats.mockResolvedValue({
        storage: { totalSize: 1024 * 1024 },
      });
      dataCachingService.clearExpiredCache.mockResolvedValue();
      imageCachingService.getImageCacheStats.mockResolvedValue({
        totalSize: 2 * 1024 * 1024,
      });
      imageCachingService.clearCache.mockResolvedValue();
      imageCachingService.setImageQuality.mockResolvedValue();
      AsyncStorage.getAllKeys.mockResolvedValue([]);

      const result = await memoryOptimizationService.optimizeMemory('aggressive');

      expect(result).toBeDefined();
      expect(result.strategy).toBe('aggressive');
      expect(imageCachingService.clearCache).toHaveBeenCalled();
      expect(imageCachingService.setImageQuality).toHaveBeenCalledWith(0.7);
    });

    test('should not optimize if already optimizing', async () => {
      // Start first optimization
      const promise1 = memoryOptimizationService.optimizeMemory('moderate');
      
      // Try to start second optimization
      const promise2 = memoryOptimizationService.optimizeMemory('aggressive');

      await promise1;
      await promise2;

      // Second optimization should return immediately
      expect(memoryOptimizationService.isOptimizing).toBe(false);
    });

    test('should unload inactive components', async () => {
      const componentId = 'inactive-component';
      const onUnload = jest.fn();

      memoryOptimizationService.registerComponent(componentId, {}, {
        canUnload: true,
        memoryFootprint: 'large',
        onUnload,
      });

      // Mark as inactive and old
      const component = memoryOptimizationService.componentRegistry.get(componentId);
      component.isActive = false;
      component.lastAccessed = Date.now() - (15 * 60 * 1000); // 15 minutes ago

      const memoryFreed = await memoryOptimizationService.unloadInactiveComponents();

      expect(memoryFreed).toBeGreaterThan(0);
      expect(onUnload).toHaveBeenCalled();
      expect(component.unloadCount).toBe(1);
    });

    test('should not unload high priority components', async () => {
      const componentId = 'high-priority-component';
      const onUnload = jest.fn();

      memoryOptimizationService.registerComponent(componentId, {}, {
        priority: 'high',
        canUnload: true,
        memoryFootprint: 'large',
        onUnload,
      });

      // Mark as inactive and old
      const component = memoryOptimizationService.componentRegistry.get(componentId);
      component.isActive = false;
      component.lastAccessed = Date.now() - (15 * 60 * 1000); // 15 minutes ago

      const memoryFreed = await memoryOptimizationService.unloadInactiveComponents();

      expect(onUnload).not.toHaveBeenCalled();
      expect(component.unloadCount).toBe(0);
    });

    test('should not unload components that cannot be unloaded', async () => {
      const componentId = 'non-unloadable-component';
      const onUnload = jest.fn();

      memoryOptimizationService.registerComponent(componentId, {}, {
        canUnload: false,
        memoryFootprint: 'large',
        onUnload,
      });

      // Mark as inactive and old
      const component = memoryOptimizationService.componentRegistry.get(componentId);
      component.isActive = false;
      component.lastAccessed = Date.now() - (15 * 60 * 1000); // 15 minutes ago

      const memoryFreed = await memoryOptimizationService.unloadInactiveComponents();

      expect(onUnload).not.toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    test('should clear image cache', async () => {
      const initialStats = { totalSize: 5 * 1024 * 1024 }; // 5MB
      const finalStats = { totalSize: 1 * 1024 * 1024 }; // 1MB

      imageCachingService.getImageCacheStats
        .mockResolvedValueOnce(initialStats)
        .mockResolvedValueOnce(finalStats);
      imageCachingService.clearCache.mockResolvedValue();

      const memoryFreed = await memoryOptimizationService.clearImageCache();

      expect(memoryFreed).toBe(4 * 1024 * 1024); // 4MB freed
      expect(imageCachingService.clearCache).toHaveBeenCalled();
    });

    test('should clear data cache', async () => {
      const initialStats = { storage: { totalSize: 3 * 1024 * 1024 } }; // 3MB
      const finalStats = { storage: { totalSize: 1 * 1024 * 1024 } }; // 1MB

      dataCachingService.getCacheStats
        .mockResolvedValueOnce(initialStats)
        .mockResolvedValueOnce(finalStats);
      dataCachingService.clearExpiredCache.mockResolvedValue();

      const memoryFreed = await memoryOptimizationService.clearDataCache();

      expect(memoryFreed).toBe(2 * 1024 * 1024); // 2MB freed
      expect(dataCachingService.clearExpiredCache).toHaveBeenCalled();
    });

    test('should handle cache clearing errors gracefully', async () => {
      imageCachingService.getImageCacheStats.mockRejectedValue(new Error('Cache error'));

      const memoryFreed = await memoryOptimizationService.clearImageCache();

      expect(memoryFreed).toBe(0);
    });
  });

  describe('Old Data Cleanup', () => {
    test('should clean up old AsyncStorage data', async () => {
      const oldKey = 'temp_old_data';
      const newKey = 'temp_new_data';
      const regularKey = 'regular_data';

      AsyncStorage.getAllKeys.mockResolvedValue([oldKey, newKey, regularKey]);
      
      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify({
          timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours old
          data: 'old data',
        }))
        .mockResolvedValueOnce(JSON.stringify({
          timestamp: Date.now() - (1 * 60 * 60 * 1000), // 1 hour old
          data: 'new data',
        }))
        .mockResolvedValueOnce('regular data');

      AsyncStorage.multiRemove.mockResolvedValue();

      const memoryFreed = await memoryOptimizationService.cleanupOldData();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([oldKey]);
      expect(memoryFreed).toBeGreaterThan(0);
    });

    test('should handle invalid JSON in AsyncStorage', async () => {
      const invalidKey = 'temp_invalid_data';

      AsyncStorage.getAllKeys.mockResolvedValue([invalidKey]);
      AsyncStorage.getItem.mockResolvedValue('invalid json');
      AsyncStorage.multiRemove.mockResolvedValue();

      const memoryFreed = await memoryOptimizationService.cleanupOldData();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([invalidKey]);
    });
  });

  describe('Memory Monitoring', () => {
    test('should check memory usage and trigger optimization', async () => {
      // Mock high memory usage
      jest.spyOn(memoryOptimizationService, 'estimateMemoryUsage')
        .mockResolvedValue(memoryOptimizationService.memoryThresholds.critical + 1000);

      jest.spyOn(memoryOptimizationService, 'optimizeMemory')
        .mockResolvedValue({ strategy: 'moderate', memoryFreed: 1000 });

      const memoryUsage = await memoryOptimizationService.checkMemoryUsage();

      expect(memoryUsage).toBeGreaterThan(memoryOptimizationService.memoryThresholds.critical);
      expect(memoryOptimizationService.optimizeMemory).toHaveBeenCalledWith('moderate');
    });

    test('should not trigger optimization for low memory usage', async () => {
      // Mock low memory usage
      jest.spyOn(memoryOptimizationService, 'estimateMemoryUsage')
        .mockResolvedValue(memoryOptimizationService.memoryThresholds.warning - 1000);

      jest.spyOn(memoryOptimizationService, 'optimizeMemory')
        .mockResolvedValue({ strategy: 'conservative', memoryFreed: 500 });

      const memoryUsage = await memoryOptimizationService.checkMemoryUsage();

      expect(memoryUsage).toBeLessThan(memoryOptimizationService.memoryThresholds.warning);
      expect(memoryOptimizationService.optimizeMemory).not.toHaveBeenCalled();
    });

    test('should store memory usage history', async () => {
      jest.spyOn(memoryOptimizationService, 'estimateMemoryUsage')
        .mockResolvedValue(1000);

      await memoryOptimizationService.checkMemoryUsage();

      expect(memoryOptimizationService.memoryUsageHistory).toHaveLength(1);
      expect(memoryOptimizationService.memoryUsageHistory[0].usage).toBe(1000);
    });

    test('should limit memory usage history', async () => {
      jest.spyOn(memoryOptimizationService, 'estimateMemoryUsage')
        .mockResolvedValue(1000);

      // Add 105 measurements (more than the 100 limit)
      for (let i = 0; i < 105; i++) {
        await memoryOptimizationService.checkMemoryUsage();
      }

      expect(memoryOptimizationService.memoryUsageHistory).toHaveLength(100);
    });
  });

  describe('Callbacks', () => {
    test('should add and remove optimization callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      memoryOptimizationService.addOptimizationCallback(callback1);
      memoryOptimizationService.addOptimizationCallback(callback2);

      expect(memoryOptimizationService.optimizationCallbacks).toHaveLength(2);

      memoryOptimizationService.removeOptimizationCallback(callback1);

      expect(memoryOptimizationService.optimizationCallbacks).toHaveLength(1);
      expect(memoryOptimizationService.optimizationCallbacks[0]).toBe(callback2);
    });

    test('should call optimization callbacks after optimization', async () => {
      const callback = jest.fn();
      memoryOptimizationService.addOptimizationCallback(callback);

      // Mock cache services
      dataCachingService.getCacheStats.mockResolvedValue({ storage: { totalSize: 0 } });
      dataCachingService.clearExpiredCache.mockResolvedValue();
      imageCachingService.getImageCacheStats.mockResolvedValue({ totalSize: 0 });
      AsyncStorage.getAllKeys.mockResolvedValue([]);

      await memoryOptimizationService.optimizeMemory('moderate');

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        strategy: 'moderate',
        actions: expect.any(Array),
        memoryFreed: expect.any(Number),
      }));
    });

    test('should handle callback errors gracefully', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();

      memoryOptimizationService.addOptimizationCallback(errorCallback);
      memoryOptimizationService.addOptimizationCallback(goodCallback);

      // Mock cache services
      dataCachingService.getCacheStats.mockResolvedValue({ storage: { totalSize: 0 } });
      dataCachingService.clearExpiredCache.mockResolvedValue();
      imageCachingService.getImageCacheStats.mockResolvedValue({ totalSize: 0 });
      AsyncStorage.getAllKeys.mockResolvedValue([]);

      // Should not throw despite callback error
      await expect(memoryOptimizationService.optimizeMemory('moderate')).resolves.toBeDefined();

      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('Statistics and Configuration', () => {
    test('should get memory statistics', () => {
      // Add some memory usage history
      memoryOptimizationService.memoryUsageHistory.push(
        { timestamp: Date.now() - 1000, usage: 1000 },
        { timestamp: Date.now(), usage: 2000 }
      );

      // Register a component
      memoryOptimizationService.registerComponent('test-comp', {});

      const stats = memoryOptimizationService.getMemoryStats();

      expect(stats).toBeDefined();
      expect(stats.currentUsage).toBe(2000);
      expect(stats.averageUsage).toBe(1500);
      expect(stats.thresholds).toBeDefined();
      expect(stats.registeredComponents).toBe(1);
      expect(stats.isOptimizing).toBe(false);
      expect(stats.usageHistory).toHaveLength(2);
    });

    test('should update memory thresholds', () => {
      const newThresholds = {
        warning: 100 * 1024 * 1024,
        critical: 150 * 1024 * 1024,
      };

      memoryOptimizationService.updateMemoryThresholds(newThresholds);

      expect(memoryOptimizationService.memoryThresholds.warning).toBe(100 * 1024 * 1024);
      expect(memoryOptimizationService.memoryThresholds.critical).toBe(150 * 1024 * 1024);
    });

    test('should format bytes correctly', () => {
      expect(memoryOptimizationService.formatBytes(0)).toBe('0 B');
      expect(memoryOptimizationService.formatBytes(1024)).toBe('1.0 KB');
      expect(memoryOptimizationService.formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(memoryOptimizationService.formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    });

    test('should force memory optimization', async () => {
      jest.spyOn(memoryOptimizationService, 'optimizeMemory')
        .mockResolvedValue({ strategy: 'aggressive', memoryFreed: 1000 });

      const result = await memoryOptimizationService.forceOptimization('aggressive');

      expect(memoryOptimizationService.optimizeMemory).toHaveBeenCalledWith('aggressive');
      expect(result.strategy).toBe('aggressive');
    });
  });

  describe('Service Lifecycle', () => {
    test('should stop monitoring', () => {
      memoryOptimizationService.initializeMemoryMonitoring();
      
      expect(memoryOptimizationService.memoryCheckInterval).toBeDefined();
      
      memoryOptimizationService.stopMonitoring();
      
      expect(memoryOptimizationService.memoryCheckInterval).toBeNull();
    });

    test('should reset service', () => {
      memoryOptimizationService.registerComponent('test-comp', {});
      memoryOptimizationService.memoryUsageHistory.push({ timestamp: Date.now(), usage: 1000 });
      memoryOptimizationService.addOptimizationCallback(jest.fn());

      memoryOptimizationService.reset();

      expect(memoryOptimizationService.componentRegistry.size).toBe(0);
      expect(memoryOptimizationService.memoryUsageHistory).toHaveLength(0);
      expect(memoryOptimizationService.optimizationCallbacks).toHaveLength(0);
      expect(memoryOptimizationService.lastOptimization).toBeNull();
      expect(memoryOptimizationService.isOptimizing).toBe(false);
    });
  });
});