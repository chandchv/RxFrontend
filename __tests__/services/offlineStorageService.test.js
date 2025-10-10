import AsyncStorage from '@react-native-async-storage/async-storage';
import offlineStorageService from '../../services/offlineStorageService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('OfflineStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('storeData', () => {
    it('should store data with timestamp', async () => {
      const testData = { test: 'data' };
      const key = 'test_key';
      
      AsyncStorage.setItem.mockResolvedValue();
      
      const result = await offlineStorageService.storeData(key, testData);
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        key,
        expect.stringContaining('"data":{"test":"data"}')
      );
    });

    it('should store data with expiry time', async () => {
      const testData = { test: 'data' };
      const key = 'test_key';
      const expiryTime = 60000; // 1 minute
      
      AsyncStorage.setItem.mockResolvedValue();
      
      const result = await offlineStorageService.storeData(key, testData, expiryTime);
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        key,
        expect.stringContaining('"expiry":')
      );
    });

    it('should handle storage errors', async () => {
      const testData = { test: 'data' };
      const key = 'test_key';
      
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      const result = await offlineStorageService.storeData(key, testData);
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error storing data:', expect.any(Error));
    });
  });

  describe('getData', () => {
    it('should retrieve valid data', async () => {
      const testData = { test: 'data' };
      const storedData = {
        data: testData,
        timestamp: Date.now(),
        expiry: null,
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedData));
      
      const result = await offlineStorageService.getData('test_key');
      
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent data', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await offlineStorageService.getData('test_key');
      
      expect(result).toBeNull();
    });

    it('should remove and return null for expired data', async () => {
      const testData = { test: 'data' };
      const storedData = {
        data: testData,
        timestamp: Date.now() - 120000, // 2 minutes ago
        expiry: Date.now() - 60000, // Expired 1 minute ago
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedData));
      AsyncStorage.removeItem.mockResolvedValue();
      
      const result = await offlineStorageService.getData('test_key');
      
      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('test_key');
    });

    it('should handle retrieval errors', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Retrieval error'));
      
      const result = await offlineStorageService.getData('test_key');
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error retrieving data:', expect.any(Error));
    });
  });

  describe('storeDashboardData', () => {
    it('should store dashboard data with role-specific key', async () => {
      const dashboardData = { metrics: [], widgets: [] };
      const role = 'doctor';
      
      AsyncStorage.setItem.mockResolvedValue();
      
      const result = await offlineStorageService.storeDashboardData(role, dashboardData);
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'dashboard_data_doctor',
        expect.any(String)
      );
    });
  });

  describe('getDashboardData', () => {
    it('should retrieve dashboard data for specific role', async () => {
      const dashboardData = { metrics: [], widgets: [] };
      const role = 'doctor';
      const storedData = {
        data: dashboardData,
        timestamp: Date.now(),
        expiry: Date.now() + 60000,
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedData));
      
      const result = await offlineStorageService.getDashboardData(role);
      
      expect(result).toEqual(dashboardData);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('dashboard_data_doctor');
    });
  });

  describe('storeClinicalRecords', () => {
    it('should store clinical records with pagination', async () => {
      const records = [{ id: 1, title: 'Record 1' }];
      const page = 2;
      
      AsyncStorage.setItem.mockResolvedValue();
      
      const result = await offlineStorageService.storeClinicalRecords(records, page);
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'clinical_records_page_2',
        expect.any(String)
      );
    });
  });

  describe('storeOfflineAction', () => {
    it('should store offline action with ID and timestamp', async () => {
      const action = { type: 'CREATE_RECORD', data: { title: 'Test' } };
      const existingActions = [];
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        data: existingActions,
        timestamp: Date.now(),
        expiry: null,
      }));
      AsyncStorage.setItem.mockResolvedValue();
      
      const result = await offlineStorageService.storeOfflineAction(action);
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_actions',
        expect.stringContaining('"type":"CREATE_RECORD"')
      );
    });

    it('should append to existing offline actions', async () => {
      const action = { type: 'UPDATE_RECORD', data: { id: 1 } };
      const existingActions = [{ id: '1', type: 'CREATE_RECORD' }];
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        data: existingActions,
        timestamp: Date.now(),
        expiry: null,
      }));
      AsyncStorage.setItem.mockResolvedValue();
      
      const result = await offlineStorageService.storeOfflineAction(action);
      
      expect(result).toBe(true);
      
      const setItemCall = AsyncStorage.setItem.mock.calls[0];
      const storedData = JSON.parse(setItemCall[1]);
      expect(storedData.data).toHaveLength(2);
    });
  });

  describe('removeOfflineAction', () => {
    it('should remove specific offline action', async () => {
      const actions = [
        { id: '1', type: 'CREATE_RECORD' },
        { id: '2', type: 'UPDATE_RECORD' },
      ];
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        data: actions,
        timestamp: Date.now(),
        expiry: null,
      }));
      AsyncStorage.setItem.mockResolvedValue();
      
      const result = await offlineStorageService.removeOfflineAction('1');
      
      expect(result).toBe(true);
      
      const setItemCall = AsyncStorage.setItem.mock.calls[0];
      const storedData = JSON.parse(setItemCall[1]);
      expect(storedData.data).toHaveLength(1);
      expect(storedData.data[0].id).toBe('2');
    });
  });

  describe('cacheImage', () => {
    it('should cache image data with URL as key', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const imageData = 'base64imagedata';
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        data: {},
        timestamp: Date.now(),
        expiry: null,
      }));
      AsyncStorage.setItem.mockResolvedValue();
      
      const result = await offlineStorageService.cacheImage(imageUrl, imageData);
      
      expect(result).toBe(true);
      
      const setItemCall = AsyncStorage.setItem.mock.calls[0];
      const storedData = JSON.parse(setItemCall[1]);
      expect(storedData.data[imageUrl]).toBeDefined();
      expect(storedData.data[imageUrl].data).toBe(imageData);
    });
  });

  describe('getCachedImage', () => {
    it('should retrieve cached image data', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const imageData = 'base64imagedata';
      const cachedImages = {
        [imageUrl]: {
          data: imageData,
          timestamp: Date.now(),
        },
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        data: cachedImages,
        timestamp: Date.now(),
        expiry: null,
      }));
      
      const result = await offlineStorageService.getCachedImage(imageUrl);
      
      expect(result).toBe(imageData);
    });

    it('should return null for non-cached image', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        data: {},
        timestamp: Date.now(),
        expiry: null,
      }));
      
      const result = await offlineStorageService.getCachedImage('https://example.com/missing.jpg');
      
      expect(result).toBeNull();
    });
  });

  describe('clearExpiredCache', () => {
    it('should remove expired cache entries', async () => {
      const now = Date.now();
      const expiredData = {
        data: { test: 'data' },
        timestamp: now - 120000,
        expiry: now - 60000, // Expired
      };
      const validData = {
        data: { test: 'data' },
        timestamp: now,
        expiry: now + 60000, // Valid
      };
      
      AsyncStorage.getAllKeys.mockResolvedValue(['expired_key', 'valid_key', 'non_json_key']);
      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(expiredData))
        .mockResolvedValueOnce(JSON.stringify(validData))
        .mockResolvedValueOnce('non-json-data');
      AsyncStorage.removeItem.mockResolvedValue();
      
      const result = await offlineStorageService.clearExpiredCache();
      
      expect(result).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('expired_key');
      expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith('valid_key');
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      const keys = ['dashboard_data_doctor', 'clinical_records_page_1', 'other_key'];
      const data1 = JSON.stringify({ test: 'data1' });
      const data2 = JSON.stringify({ test: 'data2' });
      const data3 = JSON.stringify({ test: 'data3' });
      
      AsyncStorage.getAllKeys.mockResolvedValue(keys);
      AsyncStorage.getItem
        .mockResolvedValueOnce(data1)
        .mockResolvedValueOnce(data2)
        .mockResolvedValueOnce(data3);
      
      // Mock Blob constructor
      global.Blob = jest.fn().mockImplementation((data) => ({
        size: data[0].length,
      }));
      
      const result = await offlineStorageService.getStorageStats();
      
      expect(result).toBeDefined();
      expect(result.totalKeys).toBe(3);
      expect(result.totalSize).toBeGreaterThan(0);
      expect(result.categories).toBeDefined();
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cached data', async () => {
      const keys = ['key1', 'key2', 'key3'];
      
      AsyncStorage.getAllKeys.mockResolvedValue(keys);
      AsyncStorage.multiRemove.mockResolvedValue();
      
      const result = await offlineStorageService.clearAllCache();
      
      expect(result).toBe(true);
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(keys);
    });

    it('should handle clear errors', async () => {
      AsyncStorage.getAllKeys.mockRejectedValue(new Error('Clear error'));
      
      const result = await offlineStorageService.clearAllCache();
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error clearing all cache:', expect.any(Error));
    });
  });
});