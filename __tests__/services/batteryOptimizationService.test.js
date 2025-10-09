import batteryOptimizationService from '../../services/batteryOptimizationService';
import performanceOptimizationService from '../../services/performanceOptimizationService';
import apiOptimizationService from '../../services/apiOptimizationService';
import imageCachingService from '../../services/imageCachingService';
import { AppState } from 'react-native';

// Mock dependencies
jest.mock('../../services/performanceOptimizationService');
jest.mock('../../services/apiOptimizationService');
jest.mock('../../services/imageCachingService');
jest.mock('@react-native-community/netinfo');
jest.mock('expo-device');
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    Version: '14.0',
  },
}));

describe('BatteryOptimizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    batteryOptimizationService.reset();
  });

  afterEach(() => {
    batteryOptimizationService.stopMonitoring();
  });

  describe('Initialization', () => {
    test('should initialize battery monitoring', () => {
      expect(AppState.addEventListener).toHaveBeenCalled();
      expect(batteryOptimizationService.batteryOptimizationEnabled).toBe(false);
      expect(batteryOptimizationService.batteryLevel).toBe(1.0);
      expect(batteryOptimizationService.isCharging).toBe(false);
    });

    test('should setup device-specific optimizations', () => {
      // The service should have been initialized with device-specific settings
      expect(batteryOptimizationService.optimizationSettings.lowBattery.enableLowPowerMode).toBe(true);
      expect(batteryOptimizationService.optimizationSettings.criticalBattery.enableLowPowerMode).toBe(true);
    });
  });

  describe('Battery Level Management', () => {
    test('should set battery level and trigger optimization check', () => {
      jest.spyOn(batteryOptimizationService, 'checkBatteryOptimization');

      batteryOptimizationService.setBatteryLevel(0.15, false); // 15%, not charging

      expect(batteryOptimizationService.batteryLevel).toBe(0.15);
      expect(batteryOptimizationService.isCharging).toBe(false);
      expect(batteryOptimizationService.checkBatteryOptimization).toHaveBeenCalled();
    });

    test('should clamp battery level between 0 and 1', () => {
      batteryOptimizationService.setBatteryLevel(-0.5);
      expect(batteryOptimizationService.batteryLevel).toBe(0);

      batteryOptimizationService.setBatteryLevel(1.5);
      expect(batteryOptimizationService.batteryLevel).toBe(1);
    });

    test('should set power save mode', () => {
      jest.spyOn(batteryOptimizationService, 'checkBatteryOptimization');

      batteryOptimizationService.setPowerSaveMode(true);

      expect(batteryOptimizationService.powerSaveMode).toBe(true);
      expect(batteryOptimizationService.checkBatteryOptimization).toHaveBeenCalled();
    });
  });

  describe('Battery Optimization Levels', () => {
    test('should enable low battery optimization', async () => {
      jest.spyOn(batteryOptimizationService, 'reduceAnimations').mockResolvedValue();
      jest.spyOn(batteryOptimizationService, 'limitBackgroundTasks').mockResolvedValue();
      jest.spyOn(batteryOptimizationService, 'reducePollingFrequency').mockResolvedValue();
      jest.spyOn(batteryOptimizationService, 'lowerImageQuality').mockResolvedValue();
      jest.spyOn(batteryOptimizationService, 'disableNonEssentialFeatures').mockResolvedValue();

      await batteryOptimizationService.enableBatteryOptimization('low');

      expect(batteryOptimizationService.batteryOptimizationEnabled).toBe(true);
      expect(batteryOptimizationService.currentOptimizationLevel).toBe('low');
      expect(batteryOptimizationService.reduceAnimations).toHaveBeenCalled();
      expect(batteryOptimizationService.limitBackgroundTasks).toHaveBeenCalled();
      expect(batteryOptimizationService.reducePollingFrequency).toHaveBeenCalled();
      expect(batteryOptimizationService.lowerImageQuality).toHaveBeenCalled();
      expect(batteryOptimizationService.disableNonEssentialFeatures).toHaveBeenCalled();
      expect(performanceOptimizationService.enableBatteryOptimization).toHaveBeenCalled();
    });

    test('should enable critical battery optimization', async () => {
      jest.spyOn(batteryOptimizationService, 'enableAggressiveCaching').mockResolvedValue();
      jest.spyOn(batteryOptimizationService, 'limitNetworkRequests').mockResolvedValue();

      await batteryOptimizationService.enableBatteryOptimization('critical');

      expect(batteryOptimizationService.currentOptimizationLevel).toBe('critical');
      expect(batteryOptimizationService.enableAggressiveCaching).toHaveBeenCalled();
      expect(batteryOptimizationService.limitNetworkRequests).toHaveBeenCalled();
    });

    test('should enable power save mode optimization', async () => {
      await batteryOptimizationService.enableBatteryOptimization('powerSave');

      expect(batteryOptimizationService.currentOptimizationLevel).toBe('powerSave');
    });

    test('should not re-enable if already enabled at same level', async () => {
      jest.spyOn(batteryOptimizationService, 'reduceAnimations').mockResolvedValue();

      await batteryOptimizationService.enableBatteryOptimization('low');
      await batteryOptimizationService.enableBatteryOptimization('low');

      expect(batteryOptimizationService.reduceAnimations).toHaveBeenCalledTimes(1);
    });

    test('should disable battery optimization', async () => {
      jest.spyOn(batteryOptimizationService, 'restoreAnimations').mockResolvedValue();
      jest.spyOn(batteryOptimizationService, 'restoreBackgroundTasks').mockResolvedValue();
      jest.spyOn(batteryOptimizationService, 'restorePollingFrequency').mockResolvedValue();
      jest.spyOn(batteryOptimizationService, 'restoreImageQuality').mockResolvedValue();
      jest.spyOn(batteryOptimizationService, 'enableNonEssentialFeatures').mockResolvedValue();
      jest.spyOn(batteryOptimizationService, 'disableAggressiveCaching').mockResolvedValue();
      jest.spyOn(batteryOptimizationService, 'restoreNetworkRequests').mockResolvedValue();

      // First enable optimization
      await batteryOptimizationService.enableBatteryOptimization('low');

      // Then disable it
      await batteryOptimizationService.disableBatteryOptimization();

      expect(batteryOptimizationService.batteryOptimizationEnabled).toBe(false);
      expect(batteryOptimizationService.currentOptimizationLevel).toBeNull();
      expect(batteryOptimizationService.restoreAnimations).toHaveBeenCalled();
      expect(batteryOptimizationService.restoreBackgroundTasks).toHaveBeenCalled();
      expect(batteryOptimizationService.restorePollingFrequency).toHaveBeenCalled();
      expect(batteryOptimizationService.restoreImageQuality).toHaveBeenCalled();
      expect(batteryOptimizationService.enableNonEssentialFeatures).toHaveBeenCalled();
      expect(performanceOptimizationService.disableBatteryOptimization).toHaveBeenCalled();
    });

    test('should not disable if already disabled', async () => {
      jest.spyOn(batteryOptimizationService, 'restoreAnimations').mockResolvedValue();

      await batteryOptimizationService.disableBatteryOptimization();

      expect(batteryOptimizationService.restoreAnimations).not.toHaveBeenCalled();
    });
  });

  describe('Automatic Battery Optimization', () => {
    test('should trigger critical optimization for very low battery', () => {
      jest.spyOn(batteryOptimizationService, 'enableBatteryOptimization');

      batteryOptimizationService.batteryLevel = 0.05; // 5%
      batteryOptimizationService.checkBatteryOptimization();

      expect(batteryOptimizationService.enableBatteryOptimization).toHaveBeenCalledWith('critical');
    });

    test('should trigger low optimization for low battery', () => {
      jest.spyOn(batteryOptimizationService, 'enableBatteryOptimization');

      batteryOptimizationService.batteryLevel = 0.15; // 15%
      batteryOptimizationService.checkBatteryOptimization();

      expect(batteryOptimizationService.enableBatteryOptimization).toHaveBeenCalledWith('low');
    });

    test('should trigger power save optimization when power save mode is enabled', () => {
      jest.spyOn(batteryOptimizationService, 'enableBatteryOptimization');

      batteryOptimizationService.batteryLevel = 0.5; // 50%
      batteryOptimizationService.powerSaveMode = true;
      batteryOptimizationService.checkBatteryOptimization();

      expect(batteryOptimizationService.enableBatteryOptimization).toHaveBeenCalledWith('powerSave');
    });

    test('should disable optimization for high battery level', () => {
      jest.spyOn(batteryOptimizationService, 'disableBatteryOptimization');

      // First enable optimization
      batteryOptimizationService.batteryOptimizationEnabled = true;
      batteryOptimizationService.batteryLevel = 0.8; // 80%
      batteryOptimizationService.powerSaveMode = false;
      
      batteryOptimizationService.checkBatteryOptimization();

      expect(batteryOptimizationService.disableBatteryOptimization).toHaveBeenCalled();
    });
  });

  describe('Background Task Management', () => {
    test('should register background task', () => {
      const callback = jest.fn();
      const taskId = 'test-task';
      const interval = 5000;

      batteryOptimizationService.registerBackgroundTask(taskId, callback, interval, 'high');

      const task = batteryOptimizationService.backgroundTasks.get(taskId);
      expect(task).toBeDefined();
      expect(task.callback).toBe(callback);
      expect(task.originalInterval).toBe(interval);
      expect(task.priority).toBe('high');
      expect(task.paused).toBe(false);
    });

    test('should unregister background task', () => {
      const callback = jest.fn();
      const taskId = 'test-task';

      batteryOptimizationService.registerBackgroundTask(taskId, callback, 5000);
      expect(batteryOptimizationService.backgroundTasks.has(taskId)).toBe(true);

      batteryOptimizationService.unregisterBackgroundTask(taskId);
      expect(batteryOptimizationService.backgroundTasks.has(taskId)).toBe(false);
    });

    test('should limit background tasks during optimization', async () => {
      const callback = jest.fn();
      batteryOptimizationService.registerBackgroundTask('low-priority', callback, 5000, 'low');
      batteryOptimizationService.registerBackgroundTask('high-priority', callback, 5000, 'high');

      await batteryOptimizationService.limitBackgroundTasks();

      const lowPriorityTask = batteryOptimizationService.backgroundTasks.get('low-priority');
      const highPriorityTask = batteryOptimizationService.backgroundTasks.get('high-priority');

      expect(lowPriorityTask.paused).toBe(true);
      expect(highPriorityTask.paused).toBe(false);
    });

    test('should restore background tasks', async () => {
      const callback = jest.fn();
      batteryOptimizationService.registerBackgroundTask('test-task', callback, 5000);

      const task = batteryOptimizationService.backgroundTasks.get('test-task');
      task.paused = true;
      task.originalInterval = 5000;

      await batteryOptimizationService.restoreBackgroundTasks();

      expect(task.paused).toBe(false);
    });
  });

  describe('Polling Interval Management', () => {
    test('should register polling interval', () => {
      const callback = jest.fn();
      const intervalId = 'test-interval';
      const interval = 10000;

      batteryOptimizationService.registerPollingInterval(intervalId, callback, interval, true);

      const pollingInterval = batteryOptimizationService.pollingIntervals.get(intervalId);
      expect(pollingInterval).toBeDefined();
      expect(pollingInterval.callback).toBe(callback);
      expect(pollingInterval.originalInterval).toBe(interval);
      expect(pollingInterval.currentInterval).toBe(interval);
      expect(pollingInterval.canOptimize).toBe(true);
    });

    test('should unregister polling interval', () => {
      const callback = jest.fn();
      const intervalId = 'test-interval';

      batteryOptimizationService.registerPollingInterval(intervalId, callback, 10000);
      expect(batteryOptimizationService.pollingIntervals.has(intervalId)).toBe(true);

      batteryOptimizationService.unregisterPollingInterval(intervalId);
      expect(batteryOptimizationService.pollingIntervals.has(intervalId)).toBe(false);
    });

    test('should reduce polling frequency during optimization', async () => {
      const callback = jest.fn();
      batteryOptimizationService.registerPollingInterval('optimizable', callback, 5000, true);
      batteryOptimizationService.registerPollingInterval('non-optimizable', callback, 5000, false);

      await batteryOptimizationService.reducePollingFrequency();

      const optimizableInterval = batteryOptimizationService.pollingIntervals.get('optimizable');
      const nonOptimizableInterval = batteryOptimizationService.pollingIntervals.get('non-optimizable');

      expect(optimizableInterval.currentInterval).toBe(10000); // Doubled
      expect(nonOptimizableInterval.currentInterval).toBe(5000); // Unchanged
    });

    test('should restore polling frequency', async () => {
      const callback = jest.fn();
      batteryOptimizationService.registerPollingInterval('test-interval', callback, 5000);

      const interval = batteryOptimizationService.pollingIntervals.get('test-interval');
      interval.currentInterval = 10000; // Simulate reduced frequency

      await batteryOptimizationService.restorePollingFrequency();

      expect(interval.currentInterval).toBe(5000); // Restored to original
    });
  });

  describe('App State Handling', () => {
    test('should enable background optimizations when app goes to background', () => {
      jest.spyOn(batteryOptimizationService, 'limitBackgroundTasks');
      jest.spyOn(batteryOptimizationService, 'reducePollingFrequency');

      batteryOptimizationService.handleAppStateChange('background');

      expect(batteryOptimizationService.limitBackgroundTasks).toHaveBeenCalled();
      expect(batteryOptimizationService.reducePollingFrequency).toHaveBeenCalled();
    });

    test('should disable background optimizations when app becomes active', () => {
      jest.spyOn(batteryOptimizationService, 'restoreBackgroundTasks');
      jest.spyOn(batteryOptimizationService, 'restorePollingFrequency');

      batteryOptimizationService.batteryOptimizationEnabled = false;
      batteryOptimizationService.handleAppStateChange('active');

      expect(batteryOptimizationService.restoreBackgroundTasks).toHaveBeenCalled();
      expect(batteryOptimizationService.restorePollingFrequency).toHaveBeenCalled();
    });

    test('should not restore when app becomes active if battery optimization is enabled', () => {
      jest.spyOn(batteryOptimizationService, 'restoreBackgroundTasks');
      jest.spyOn(batteryOptimizationService, 'restorePollingFrequency');

      batteryOptimizationService.batteryOptimizationEnabled = true;
      batteryOptimizationService.handleAppStateChange('active');

      expect(batteryOptimizationService.restoreBackgroundTasks).not.toHaveBeenCalled();
      expect(batteryOptimizationService.restorePollingFrequency).not.toHaveBeenCalled();
    });
  });

  describe('Network Handling', () => {
    test('should enable cellular optimizations', () => {
      jest.spyOn(batteryOptimizationService, 'lowerImageQuality');
      jest.spyOn(batteryOptimizationService, 'limitNetworkRequests');

      batteryOptimizationService.batteryOptimizationEnabled = true;
      batteryOptimizationService.handleNetworkChange({ type: 'cellular' });

      expect(batteryOptimizationService.networkType).toBe('cellular');
      expect(batteryOptimizationService.lowerImageQuality).toHaveBeenCalled();
      expect(batteryOptimizationService.limitNetworkRequests).toHaveBeenCalled();
    });

    test('should disable cellular optimizations on WiFi', () => {
      jest.spyOn(batteryOptimizationService, 'restoreImageQuality');
      jest.spyOn(batteryOptimizationService, 'restoreNetworkRequests');

      batteryOptimizationService.batteryOptimizationEnabled = false;
      batteryOptimizationService.handleNetworkChange({ type: 'wifi' });

      expect(batteryOptimizationService.networkType).toBe('wifi');
      expect(batteryOptimizationService.restoreImageQuality).toHaveBeenCalled();
      expect(batteryOptimizationService.restoreNetworkRequests).toHaveBeenCalled();
    });
  });

  describe('Optimization Actions', () => {
    test('should lower image quality', async () => {
      await batteryOptimizationService.lowerImageQuality();

      expect(imageCachingService.setImageQuality).toHaveBeenCalledWith(0.6);
    });

    test('should restore image quality', async () => {
      await batteryOptimizationService.restoreImageQuality();

      expect(imageCachingService.setImageQuality).toHaveBeenCalledWith(0.9);
    });

    test('should limit network requests', async () => {
      await batteryOptimizationService.limitNetworkRequests();

      expect(apiOptimizationService.setOptimizationConfig).toHaveBeenCalledWith({
        maxConcurrentRequests: 1,
        requestTimeout: 10000,
        compressionEnabled: true,
      });
    });

    test('should restore network requests', async () => {
      await batteryOptimizationService.restoreNetworkRequests();

      expect(apiOptimizationService.setOptimizationConfig).toHaveBeenCalledWith({
        maxConcurrentRequests: 5,
        requestTimeout: 30000,
        compressionEnabled: false,
      });
    });
  });

  describe('Callbacks', () => {
    test('should add and remove optimization callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      batteryOptimizationService.addOptimizationCallback(callback1);
      batteryOptimizationService.addOptimizationCallback(callback2);

      expect(batteryOptimizationService.optimizationCallbacks).toHaveLength(2);

      batteryOptimizationService.removeOptimizationCallback(callback1);

      expect(batteryOptimizationService.optimizationCallbacks).toHaveLength(1);
      expect(batteryOptimizationService.optimizationCallbacks[0]).toBe(callback2);
    });

    test('should notify callbacks when optimization is enabled', async () => {
      const callback = jest.fn();
      batteryOptimizationService.addOptimizationCallback(callback);

      await batteryOptimizationService.enableBatteryOptimization('low');

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'enabled',
        level: 'low',
        batteryLevel: expect.any(Number),
        settings: expect.any(Object),
      }));
    });

    test('should notify callbacks when optimization is disabled', async () => {
      const callback = jest.fn();
      batteryOptimizationService.addOptimizationCallback(callback);

      await batteryOptimizationService.enableBatteryOptimization('low');
      await batteryOptimizationService.disableBatteryOptimization();

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'disabled',
        batteryLevel: expect.any(Number),
      }));
    });

    test('should handle callback errors gracefully', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();

      batteryOptimizationService.addOptimizationCallback(errorCallback);
      batteryOptimizationService.addOptimizationCallback(goodCallback);

      // Should not throw despite callback error
      await expect(batteryOptimizationService.enableBatteryOptimization('low')).resolves.toBeUndefined();

      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('Status and Configuration', () => {
    test('should get battery optimization status', () => {
      batteryOptimizationService.batteryOptimizationEnabled = true;
      batteryOptimizationService.currentOptimizationLevel = 'low';
      batteryOptimizationService.batteryLevel = 0.15;
      batteryOptimizationService.isCharging = false;
      batteryOptimizationService.powerSaveMode = true;
      batteryOptimizationService.networkType = 'cellular';

      const status = batteryOptimizationService.getBatteryOptimizationStatus();

      expect(status).toEqual({
        enabled: true,
        level: 'low',
        batteryLevel: 0.15,
        isCharging: false,
        powerSaveMode: true,
        networkType: 'cellular',
        backgroundTasks: 0,
        pollingIntervals: 0,
        batteryHistory: expect.any(Array),
      });
    });

    test('should update optimization settings', () => {
      const newSettings = {
        lowBattery: {
          threshold: 0.25,
          reduceAnimations: false,
        },
      };

      batteryOptimizationService.updateOptimizationSettings(newSettings);

      expect(batteryOptimizationService.optimizationSettings.lowBattery.threshold).toBe(0.25);
      expect(batteryOptimizationService.optimizationSettings.lowBattery.reduceAnimations).toBe(false);
    });
  });

  describe('Service Lifecycle', () => {
    test('should stop monitoring', () => {
      batteryOptimizationService.registerBackgroundTask('task1', jest.fn(), 5000);
      batteryOptimizationService.registerPollingInterval('interval1', jest.fn(), 10000);

      batteryOptimizationService.stopMonitoring();

      expect(batteryOptimizationService.backgroundTasks.size).toBe(0);
      expect(batteryOptimizationService.pollingIntervals.size).toBe(0);
    });

    test('should reset service', () => {
      batteryOptimizationService.batteryOptimizationEnabled = true;
      batteryOptimizationService.currentOptimizationLevel = 'low';
      batteryOptimizationService.batteryLevel = 0.5;
      batteryOptimizationService.batteryHistory.push({ timestamp: Date.now(), level: 0.5 });
      batteryOptimizationService.addOptimizationCallback(jest.fn());

      batteryOptimizationService.reset();

      expect(batteryOptimizationService.batteryOptimizationEnabled).toBe(false);
      expect(batteryOptimizationService.currentOptimizationLevel).toBeNull();
      expect(batteryOptimizationService.batteryLevel).toBe(1.0);
      expect(batteryOptimizationService.isCharging).toBe(false);
      expect(batteryOptimizationService.powerSaveMode).toBe(false);
      expect(batteryOptimizationService.batteryHistory).toHaveLength(0);
      expect(batteryOptimizationService.optimizationCallbacks).toHaveLength(0);
    });
  });

  describe('Battery Simulation', () => {
    test('should simulate battery drain when not charging', () => {
      const initialLevel = batteryOptimizationService.batteryLevel;
      batteryOptimizationService.isCharging = false;

      batteryOptimizationService.simulateBatteryCheck();

      expect(batteryOptimizationService.batteryLevel).toBeLessThan(initialLevel);
    });

    test('should simulate battery charging when charging', () => {
      batteryOptimizationService.batteryLevel = 0.5;
      batteryOptimizationService.isCharging = true;

      batteryOptimizationService.simulateBatteryCheck();

      expect(batteryOptimizationService.batteryLevel).toBeGreaterThan(0.5);
    });

    test('should not drain battery below 0', () => {
      batteryOptimizationService.batteryLevel = 0.005;
      batteryOptimizationService.isCharging = false;

      batteryOptimizationService.simulateBatteryCheck();

      expect(batteryOptimizationService.batteryLevel).toBeGreaterThanOrEqual(0);
    });

    test('should not charge battery above 1', () => {
      batteryOptimizationService.batteryLevel = 0.99;
      batteryOptimizationService.isCharging = true;

      batteryOptimizationService.simulateBatteryCheck();

      expect(batteryOptimizationService.batteryLevel).toBeLessThanOrEqual(1);
    });

    test('should store battery history', () => {
      batteryOptimizationService.simulateBatteryCheck();

      expect(batteryOptimizationService.batteryHistory).toHaveLength(1);
      expect(batteryOptimizationService.batteryHistory[0]).toEqual({
        timestamp: expect.any(Number),
        level: expect.any(Number),
        isCharging: expect.any(Boolean),
      });
    });

    test('should limit battery history to 100 entries', () => {
      // Add 105 entries
      for (let i = 0; i < 105; i++) {
        batteryOptimizationService.simulateBatteryCheck();
      }

      expect(batteryOptimizationService.batteryHistory).toHaveLength(100);
    });
  });
});