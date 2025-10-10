import dataCachingService from '../../services/dataCachingService';
import offlineStorageService from '../../services/offlineStorageService';
import mobileApiService from '../../services/mobileApiService';

// Mock dependencies
jest.mock('../../services/offlineStorageService');
jest.mock('../../services/mobileApiService');

describe('DataCachingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset service state
    dataCachingService.accessPatterns.clear();
    dataCachingService.cacheHitRates.clear();
    dataCachingService.prefetchQueue = [];
    dataCachingService.isOptimizing = false;
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('Cache Strategies', () => {
    it('should have predefined cache strategies', () => {
      const strategies = dataCachingService.cacheStrategies;
      
      expect(strategies.has('dashboard')).toBe(true);
      expect(strategies.has('clinical_records')).toBe(true);
      expect(strategies.has('appointments')).toBe(true);
      expect(strategies.has('prescriptions')).toBe(true);
      expect(strategies.has('media')).toBe(true);
      expect(strategies.has('user_profiles')).toBe(true);
      
      // Check dashboard strategy
      const dashboardStrategy = strategies.get('dashboard');
      expect(dashboardStrategy.priority).toBe('medium');
      expect(dashboardStrategy.ttl).toBe(30 * 60 * 1000); // 30 minutes
      expect(dashboardStrategy.prefetch).toBe(true);
    });
  });

  describe('getCachedData', () => {
    it('should return cached data when valid', async () => {
      const cachedData = { test: 'data' };
      const fetchFunction = jest.fn();
      
      offlineStorageService.getData.mockResolvedValue(cachedData);
      
      // Mock cache validity
      jest.spyOn(dataCachingService, 'isCacheValid').mockReturnValue(true);
      
      const result = await dataCachingService.getCachedData(
        'dashboard',
        'doctor',
        fetchFunction
      );
      
      expect(result).toEqual(cachedData);
      expect(fetchFunction).not.toHaveBeenCalled();
      expect(offlineStorageService.getData).toHaveBeenCalledWith('dashboard_doctor');
    });

    it('should fetch fresh data when cache is invalid', async () => {
      const freshData = { fresh: 'data' };
      const fetchFunction = jest.fn().mockResolvedValue(freshData);
      
      offlineStorageService.getData.mockResolvedValue(null);
      offlineStorageService.storeData.mockResolvedValue(true);
      
      const result = await dataCachingService.getCachedData(
        'dashboard',
        'doctor',
        fetchFunction
      );
      
      expect(result).toEqual(freshData);
      expect(fetchFunction).toHaveBeenCalled();
      expect(offlineStorageService.storeData).toHaveBeenCalled();
    });

    it('should track access patterns', async () => {
      const cachedData = { test: 'data' };
      const fetchFunction = jest.fn();
      
      offlineStorageService.getData.mockResolvedValue(cachedData);
      jest.spyOn(dataCachingService, 'isCacheValid').mockReturnValue(true);
      
      await dataCachingService.getCachedData('dashboard', 'doctor', fetchFunction);
      
      const pattern = dataCachingService.accessPatterns.get('dashboard_doctor');
      expect(pattern).toBeDefined();
      expect(pattern.count).toBe(1);
      expect(pattern.lastAccess).toBeGreaterThan(0);
    });

    it('should record cache hits and misses', async () => {
      const fetchFunction = jest.fn().mockResolvedValue({ data: 'fresh' });
      
      // Cache miss
      offlineStorageService.getData.mockResolvedValue(null);
      offlineStorageService.storeData.mockResolvedValue(true);
      
      await dataCachingService.getCachedData('dashboard', 'doctor', fetchFunction);
      
      let hitRate = dataCachingService.getCacheHitRate('dashboard');
      expect(hitRate).toBe(0); // 0 hits, 1 miss
      
      // Cache hit
      offlineStorageService.getData.mockResolvedValue({ data: 'cached' });
      jest.spyOn(dataCachingService, 'isCacheValid').mockReturnValue(true);
      
      await dataCachingService.getCachedData('dashboard', 'doctor', fetchFunction);
      
      hitRate = dataCachingService.getCacheHitRate('dashboard');
      expect(hitRate).toBe(0.5); // 1 hit, 1 miss
    });

    it('should return stale data as fallback on error', async () => {
      const staleData = { stale: 'data' };
      const fetchFunction = jest.fn().mockRejectedValue(new Error('Network error'));
      
      offlineStorageService.getData
        .mockResolvedValueOnce(null) // First call for fresh data
        .mockResolvedValueOnce(staleData); // Second call for fallback
      
      const result = await dataCachingService.getCachedData(
        'dashboard',
        'doctor',
        fetchFunction
      );
      
      expect(result).toEqual(staleData);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Returning stale data')
      );
    });
  });

  describe('Cache Validation', () => {
    it('should validate cache based on TTL', () => {
      const strategy = { ttl: 60000 }; // 1 minute
      const now = Date.now();
      
      // Valid cache
      const validData = { timestamp: now - 30000 }; // 30 seconds ago
      expect(dataCachingService.isCacheValid(validData, strategy)).toBe(true);
      
      // Expired cache
      const expiredData = { timestamp: now - 120000 }; // 2 minutes ago
      expect(dataCachingService.isCacheValid(expiredData, strategy)).toBe(false);
    });

    it('should consider cache valid when no TTL is set', () => {
      const strategy = {}; // No TTL
      const data = { timestamp: Date.now() - 3600000 }; // 1 hour ago
      
      expect(dataCachingService.isCacheValid(data, strategy)).toBe(true);
    });
  });

  describe('Cache Size Management', () => {
    it('should enforce maximum cache size', async () => {
      const strategy = { maxSize: 2, strategy: 'lru' };
      
      offlineStorageService.getAllKeys.mockResolvedValue([
        'dashboard_doctor',
        'dashboard_patient',
        'dashboard_admin',
      ]);
      
      offlineStorageService.removeData.mockResolvedValue(true);
      
      jest.spyOn(dataCachingService, 'selectKeysForEviction')
        .mockResolvedValue(['dashboard_doctor']);
      
      await dataCachingService.enforceMaxSize('dashboard', strategy);
      
      expect(offlineStorageService.removeData).toHaveBeenCalledWith('dashboard_doctor');
    });

    it('should select keys for eviction based on LRU strategy', async () => {
      const keys = ['key1', 'key2', 'key3'];
      
      // Mock access patterns
      dataCachingService.accessPatterns.set('key1', { count: 5, lastAccess: 1000 });
      dataCachingService.accessPatterns.set('key2', { count: 3, lastAccess: 2000 });
      dataCachingService.accessPatterns.set('key3', { count: 1, lastAccess: 3000 });
      
      offlineStorageService.getData
        .mockResolvedValueOnce({ timestamp: 1000 })
        .mockResolvedValueOnce({ timestamp: 2000 })
        .mockResolvedValueOnce({ timestamp: 3000 });
      
      const keysToEvict = await dataCachingService.selectKeysForEviction(keys, 'lru', 1);
      
      expect(keysToEvict).toEqual(['key1']); // Least recently used
    });

    it('should select keys for eviction based on LFU strategy', async () => {
      const keys = ['key1', 'key2', 'key3'];
      
      // Mock access patterns
      dataCachingService.accessPatterns.set('key1', { count: 1, lastAccess: 3000 });
      dataCachingService.accessPatterns.set('key2', { count: 5, lastAccess: 2000 });
      dataCachingService.accessPatterns.set('key3', { count: 3, lastAccess: 1000 });
      
      offlineStorageService.getData
        .mockResolvedValueOnce({ timestamp: 1000 })
        .mockResolvedValueOnce({ timestamp: 2000 })
        .mockResolvedValueOnce({ timestamp: 3000 });
      
      const keysToEvict = await dataCachingService.selectKeysForEviction(keys, 'lfu', 1);
      
      expect(keysToEvict).toEqual(['key1']); // Least frequently used
    });
  });

  describe('Prefetching', () => {
    it('should determine when to prefetch based on access patterns', () => {
      const cacheKey = 'dashboard_doctor';
      const now = Date.now();
      
      // High access count and recent access
      dataCachingService.accessPatterns.set(cacheKey, {
        count: 5,
        lastAccess: now - 60000, // 1 minute ago
      });
      
      expect(dataCachingService.shouldPrefetch(cacheKey)).toBe(true);
      
      // Low access count
      dataCachingService.accessPatterns.set(cacheKey, {
        count: 2,
        lastAccess: now - 60000,
      });
      
      expect(dataCachingService.shouldPrefetch(cacheKey)).toBe(false);
      
      // Old access
      dataCachingService.accessPatterns.set(cacheKey, {
        count: 5,
        lastAccess: now - 600000, // 10 minutes ago
      });
      
      expect(dataCachingService.shouldPrefetch(cacheKey)).toBe(false);
    });

    it('should schedule prefetch operations', () => {
      const fetchFunction = jest.fn();
      
      dataCachingService.schedulePrefetch('dashboard', 'doctor', fetchFunction);
      
      expect(dataCachingService.prefetchQueue).toHaveLength(1);
      expect(dataCachingService.prefetchQueue[0]).toMatchObject({
        dataType: 'dashboard',
        key: 'doctor',
        fetchFunction,
      });
    });

    it('should process prefetch queue', async () => {
      const fetchFunction = jest.fn().mockResolvedValue({ data: 'prefetched' });
      
      dataCachingService.prefetchQueue.push({
        dataType: 'dashboard',
        key: 'doctor',
        fetchFunction,
        scheduledAt: Date.now(),
      });
      
      offlineStorageService.storeData.mockResolvedValue(true);
      
      await dataCachingService.processPrefetchQueue();
      
      expect(fetchFunction).toHaveBeenCalled();
      expect(offlineStorageService.storeData).toHaveBeenCalled();
      expect(dataCachingService.prefetchQueue).toHaveLength(0);
    });
  });

  describe('Cache Optimization', () => {
    it('should optimize cache by clearing expired entries', async () => {
      offlineStorageService.clearExpiredCache.mockResolvedValue(true);
      
      jest.spyOn(dataCachingService, 'analyzeAndAdjustStrategies')
        .mockResolvedValue();
      jest.spyOn(dataCachingService, 'prefetchFrequentData')
        .mockResolvedValue();
      
      await dataCachingService.optimizeCache();
      
      expect(offlineStorageService.clearExpiredCache).toHaveBeenCalled();
      expect(dataCachingService.analyzeAndAdjustStrategies).toHaveBeenCalled();
      expect(dataCachingService.prefetchFrequentData).toHaveBeenCalled();
    });

    it('should adjust strategies based on hit rates', async () => {
      // Set up low hit rate
      dataCachingService.cacheHitRates.set('dashboard', { hits: 1, misses: 9 });
      
      const originalTTL = dataCachingService.cacheStrategies.get('dashboard').ttl;
      
      await dataCachingService.analyzeAndAdjustStrategies();
      
      const newTTL = dataCachingService.cacheStrategies.get('dashboard').ttl;
      expect(newTTL).toBeGreaterThan(originalTTL);
    });
  });

  describe('Cache Statistics', () => {
    it('should return comprehensive cache statistics', async () => {
      const storageStats = { totalSize: 1000, totalKeys: 10 };
      
      offlineStorageService.getStorageStats.mockResolvedValue(storageStats);
      
      // Set up some test data
      dataCachingService.cacheHitRates.set('dashboard', { hits: 8, misses: 2 });
      dataCachingService.accessPatterns.set('key1', { count: 5, lastAccess: Date.now() });
      
      const stats = await dataCachingService.getCacheStats();
      
      expect(stats.storage).toEqual(storageStats);
      expect(stats.hitRates.dashboard).toBe(0.8);
      expect(stats.accessPatterns.key1).toBeDefined();
      expect(stats.strategies).toBeDefined();
      expect(stats.prefetchQueueSize).toBe(0);
      expect(stats.isOptimizing).toBe(false);
    });

    it('should calculate hit rates correctly', () => {
      dataCachingService.cacheHitRates.set('test', { hits: 7, misses: 3 });
      
      const hitRate = dataCachingService.getCacheHitRate('test');
      expect(hitRate).toBe(0.7);
      
      // Test with no data
      const noDataHitRate = dataCachingService.getCacheHitRate('nonexistent');
      expect(noDataHitRate).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache for specific data type', async () => {
      offlineStorageService.getAllKeys.mockResolvedValue([
        'dashboard_doctor',
        'dashboard_patient',
        'clinical_records_1',
      ]);
      
      offlineStorageService.removeData.mockResolvedValue(true);
      
      // Set up access patterns
      dataCachingService.accessPatterns.set('dashboard_doctor', { count: 1 });
      dataCachingService.accessPatterns.set('clinical_records_1', { count: 1 });
      dataCachingService.cacheHitRates.set('dashboard', { hits: 1, misses: 0 });
      
      const result = await dataCachingService.clearCacheForType('dashboard');
      
      expect(result).toBe(true);
      expect(offlineStorageService.removeData).toHaveBeenCalledWith('dashboard_doctor');
      expect(offlineStorageService.removeData).toHaveBeenCalledWith('dashboard_patient');
      expect(offlineStorageService.removeData).not.toHaveBeenCalledWith('clinical_records_1');
      
      expect(dataCachingService.accessPatterns.has('dashboard_doctor')).toBe(false);
      expect(dataCachingService.cacheHitRates.has('dashboard')).toBe(false);
    });

    it('should invalidate specific cache entry', async () => {
      offlineStorageService.removeData.mockResolvedValue(true);
      
      dataCachingService.accessPatterns.set('dashboard_doctor', { count: 1 });
      
      const result = await dataCachingService.invalidateCache('dashboard', 'doctor');
      
      expect(result).toBe(true);
      expect(offlineStorageService.removeData).toHaveBeenCalledWith('dashboard_doctor');
      expect(dataCachingService.accessPatterns.has('dashboard_doctor')).toBe(false);
    });
  });

  describe('Cache Warm-up', () => {
    it('should warm up cache with essential data', async () => {
      const dashboardData = { metrics: [] };
      const clinicalRecords = { results: [] };
      const appointments = [];
      
      mobileApiService.getDashboardData.mockResolvedValue(dashboardData);
      mobileApiService.getClinicalRecords.mockResolvedValue(clinicalRecords);
      mobileApiService.getAppointments.mockResolvedValue(appointments);
      
      offlineStorageService.getData.mockResolvedValue(null);
      offlineStorageService.storeData.mockResolvedValue(true);
      
      await dataCachingService.warmUpCache('doctor');
      
      expect(mobileApiService.getDashboardData).toHaveBeenCalledWith('doctor');
      expect(mobileApiService.getClinicalRecords).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(mobileApiService.getAppointments).toHaveBeenCalledWith({ status: 'upcoming' });
    });
  });
});