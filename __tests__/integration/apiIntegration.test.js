import mobileApiService from '../../services/mobileApiService';
import apiOptimizationService from '../../services/apiOptimizationService';
import dataCachingService from '../../services/dataCachingService';
import offlineStorageService from '../../services/offlineStorageService';

// Mock fetch for controlled testing
global.fetch = jest.fn();

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  describe('Mobile API Service Integration', () => {
    test('should successfully fetch dashboard data', async () => {
      const mockDashboardData = {
        metrics: {
          totalPatients: 150,
          todayAppointments: 8,
          pendingRecords: 5,
        },
        recentActivity: [
          {
            id: 1,
            type: 'clinical_record',
            title: 'Lab Results - John Doe',
            timestamp: '2025-01-16T10:00:00Z',
          },
        ],
        quickActions: [
          { id: 'view_records', title: 'View Clinical Records', icon: 'folder' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockDashboardData,
        headers: new Headers({
          'content-type': 'application/json',
        }),
      });

      const startTime = Date.now();
      const result = await mobileApiService.getDashboardData('doctor');
      const responseTime = Date.now() - startTime;

      expect(result).toEqual(mockDashboardData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mobile/dashboard/'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      // Track API performance
      global.trackTestPerformance('apiResponse', responseTime, {
        endpoint: '/api/mobile/dashboard/',
        method: 'GET',
      });

      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    test('should handle API errors gracefully', async () => {
      const errorResponse = {
        error: 'Internal Server Error',
        message: 'Database connection failed',
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => errorResponse,
        statusText: 'Internal Server Error',
      });

      await expect(mobileApiService.getDashboardData('doctor')).rejects.toThrow();
    });

    test('should handle network timeouts', async () => {
      global.fetch.mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const startTime = Date.now();
      
      await expect(mobileApiService.getDashboardData('doctor')).rejects.toThrow('Network timeout');
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeGreaterThan(90); // Should have waited for timeout
    });

    test('should retry failed requests', async () => {
      global.fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      const result = await mobileApiService.getDashboardData('doctor');

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial call + retry
    });

    test('should handle authentication errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
        statusText: 'Unauthorized',
      });

      await expect(mobileApiService.getDashboardData('doctor')).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe('Clinical Records API Integration', () => {
    test('should fetch clinical records with pagination', async () => {
      const mockRecordsData = {
        records: [
          {
            id: 1,
            patientName: 'John Doe',
            recordType: 'Lab Results',
            date: '2025-01-16T10:00:00Z',
            status: 'completed',
          },
          {
            id: 2,
            patientName: 'Jane Smith',
            recordType: 'X-Ray',
            date: '2025-01-15T14:30:00Z',
            status: 'pending',
          },
        ],
        totalCount: 25,
        hasMore: true,
        nextPage: 2,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRecordsData,
      });

      const result = await mobileApiService.getClinicalRecords({
        page: 1,
        limit: 10,
        search: '',
      });

      expect(result).toEqual(mockRecordsData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mobile/clinical-records/'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    test('should upload clinical documents with progress tracking', async () => {
      const mockFile = {
        uri: 'file://test-document.pdf',
        type: 'application/pdf',
        name: 'test-document.pdf',
        size: 1024 * 1024, // 1MB
      };

      const mockUploadResponse = {
        id: 1,
        filename: 'test-document.pdf',
        status: 'processing',
        uploadProgress: 100,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockUploadResponse,
      });

      const result = await mobileApiService.uploadDocument(mockFile, {
        patientId: 1,
        recordType: 'Lab Results',
      });

      expect(result).toEqual(mockUploadResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mobile/clinical-records/upload/'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    test('should handle large file uploads', async () => {
      const largeFile = {
        uri: 'file://large-document.pdf',
        type: 'application/pdf',
        name: 'large-document.pdf',
        size: 50 * 1024 * 1024, // 50MB
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 1,
          filename: 'large-document.pdf',
          status: 'processing',
          uploadProgress: 100,
        }),
      });

      const startTime = Date.now();
      const result = await mobileApiService.uploadDocument(largeFile);
      const uploadTime = Date.now() - startTime;

      expect(result).toBeDefined();
      
      // Large file uploads should complete within reasonable time
      expect(uploadTime).toBeLessThan(30000); // 30 seconds max for test
      
      global.trackTestPerformance('apiResponse', uploadTime, {
        endpoint: '/api/mobile/clinical-records/upload/',
        method: 'POST',
        fileSize: largeFile.size,
      });
    });
  });

  describe('API Optimization Integration', () => {
    test('should use request deduplication', async () => {
      const mockResponse = { data: 'test' };
      
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // Make multiple identical requests simultaneously
      const requests = [
        apiOptimizationService.optimizedRequest('/api/test'),
        apiOptimizationService.optimizedRequest('/api/test'),
        apiOptimizationService.optimizedRequest('/api/test'),
      ];

      const results = await Promise.all(requests);

      // All requests should return the same result
      results.forEach(result => {
        expect(result.ok).toBe(true);
      });

      // But only one actual network request should be made
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should cache GET requests', async () => {
      const mockResponse = { data: 'cached data' };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        clone: () => ({
          json: async () => mockResponse,
        }),
      });

      // First request
      const result1 = await apiOptimizationService.optimizedRequest('/api/cacheable');
      
      // Second request (should use cache)
      const result2 = await apiOptimizationService.optimizedRequest('/api/cacheable');

      expect(global.fetch).toHaveBeenCalledTimes(1); // Only one network request
      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
    });

    test('should batch multiple requests', async () => {
      const requests = [
        { url: '/api/endpoint1', options: { priority: 'high' } },
        { url: '/api/endpoint2', options: { priority: 'normal' } },
        { url: '/api/endpoint3', options: { priority: 'low' } },
      ];

      global.fetch.mockImplementation((url) => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ url }),
        })
      );

      const startTime = Date.now();
      const results = await apiOptimizationService.batchRequests(requests);
      const batchTime = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every(result => result.success)).toBe(true);
      
      global.trackTestPerformance('apiResponse', batchTime, {
        type: 'batch',
        requestCount: requests.length,
      });
    });

    test('should handle network type changes', async () => {
      // Simulate cellular network
      apiOptimizationService.networkInfo = { type: 'cellular', isConnected: true };
      apiOptimizationService.adjustOptimizationStrategy();

      expect(apiOptimizationService.maxConcurrentRequests).toBe(2); // Reduced for cellular
      expect(apiOptimizationService.compressionEnabled).toBe(true);

      // Simulate WiFi network
      apiOptimizationService.networkInfo = { type: 'wifi', isConnected: true };
      apiOptimizationService.adjustOptimizationStrategy();

      expect(apiOptimizationService.maxConcurrentRequests).toBe(5); // Normal for WiFi
      expect(apiOptimizationService.compressionEnabled).toBe(false);
    });
  });

  describe('Offline Storage Integration', () => {
    test('should store data offline when network is unavailable', async () => {
      const testData = { id: 1, name: 'Test Data' };
      
      // Mock network unavailable
      global.fetch.mockRejectedValue(new Error('Network unavailable'));

      // Store data offline
      await offlineStorageService.storeOfflineData('test_key', testData);

      // Retrieve data
      const retrievedData = await offlineStorageService.getOfflineData('test_key');

      expect(retrievedData).toEqual(testData);
    });

    test('should sync offline data when network becomes available', async () => {
      const offlineData = [
        { id: 1, action: 'create', data: { name: 'Offline Record 1' } },
        { id: 2, action: 'update', data: { id: 2, name: 'Updated Record' } },
      ];

      // Store offline data
      await offlineStorageService.storeOfflineActions(offlineData);

      // Mock successful sync
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      // Sync offline data
      const syncResults = await offlineStorageService.syncOfflineData();

      expect(syncResults.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(offlineData.length);
    });

    test('should handle sync conflicts', async () => {
      const conflictData = {
        id: 1,
        localVersion: { name: 'Local Update', version: 1 },
        serverVersion: { name: 'Server Update', version: 2 },
      };

      // Mock conflict response
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409, // Conflict
        json: async () => ({
          error: 'Conflict',
          serverData: conflictData.serverVersion,
        }),
      });

      const syncResult = await offlineStorageService.syncOfflineData();

      expect(syncResult.conflicts).toBeDefined();
      expect(syncResult.conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Data Caching Integration', () => {
    test('should cache API responses efficiently', async () => {
      const testData = { id: 1, data: 'test' };
      
      // Cache data
      await dataCachingService.cacheData('api_responses', 'test_endpoint', testData);

      // Retrieve cached data
      const cachedData = await dataCachingService.getData('api_responses', 'test_endpoint');

      expect(cachedData).toEqual(testData);
    });

    test('should respect cache TTL', async () => {
      const testData = { id: 1, data: 'test' };
      const shortTTL = 100; // 100ms

      // Cache data with short TTL
      await dataCachingService.cacheData('api_responses', 'short_ttl_test', testData, shortTTL);

      // Immediately retrieve (should be available)
      let cachedData = await dataCachingService.getData('api_responses', 'short_ttl_test');
      expect(cachedData).toEqual(testData);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Retrieve again (should be null/expired)
      cachedData = await dataCachingService.getData('api_responses', 'short_ttl_test');
      expect(cachedData).toBeNull();
    });

    test('should handle cache size limits', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `Large data item ${i}`,
        content: 'x'.repeat(1000), // 1KB per item
      }));

      // Cache large amount of data
      for (let i = 0; i < largeData.length; i++) {
        await dataCachingService.cacheData('large_cache', `item_${i}`, largeData[i]);
      }

      // Check cache stats
      const cacheStats = await dataCachingService.getCacheStats();
      
      expect(cacheStats).toBeDefined();
      expect(cacheStats.storage.totalSize).toBeGreaterThan(0);
      
      // Cache should manage size automatically
      expect(cacheStats.storage.totalSize).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('Performance Under Load', () => {
    test('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 20;
      const mockResponse = { success: true };

      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        })
      );

      const startTime = Date.now();
      
      // Make concurrent requests
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        mobileApiService.getDashboardData('doctor', { requestId: i })
      );

      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentRequests);
      expect(results.every(result => result.success)).toBe(true);
      
      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
      
      global.trackTestPerformance('apiResponse', totalTime, {
        type: 'concurrent',
        requestCount: concurrentRequests,
      });
    });

    test('should maintain performance with large response payloads', async () => {
      const largePayload = {
        records: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          patientName: `Patient ${i}`,
          recordType: 'Lab Results',
          date: new Date().toISOString(),
          data: 'x'.repeat(1000), // 1KB per record
        })),
        totalCount: 1000,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => largePayload,
      });

      const startTime = Date.now();
      const result = await mobileApiService.getClinicalRecords({ limit: 1000 });
      const responseTime = Date.now() - startTime;

      expect(result.records).toHaveLength(1000);
      expect(responseTime).toBeLessThan(3000); // Should handle large payloads within 3 seconds
      
      global.trackTestPerformance('apiResponse', responseTime, {
        endpoint: '/api/mobile/clinical-records/',
        payloadSize: JSON.stringify(largePayload).length,
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from temporary network failures', async () => {
      let callCount = 0;
      
      global.fetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, attempt: callCount }),
        });
      });

      const result = await mobileApiService.getDashboardData('doctor');

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(3); // Should succeed on third attempt
      expect(callCount).toBe(3);
    });

    test('should handle rate limiting gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429, // Too Many Requests
        headers: new Headers({
          'Retry-After': '1', // 1 second
        }),
        json: async () => ({ error: 'Rate limited' }),
      });

      const startTime = Date.now();
      
      await expect(mobileApiService.getDashboardData('doctor')).rejects.toMatchObject({
        status: 429,
      });
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should fail quickly, not wait for retry
    });

    test('should handle malformed JSON responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        text: async () => 'Invalid JSON response',
      });

      await expect(mobileApiService.getDashboardData('doctor')).rejects.toThrow();
    });
  });

  describe('Security and Authentication', () => {
    test('should include authentication headers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await mobileApiService.getDashboardData('doctor');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/Bearer .+/),
          }),
        })
      );
    });

    test('should handle token refresh', async () => {
      // First request fails with 401
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Token expired' }),
        })
        // Token refresh succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'new_token' }),
        })
        // Retry original request succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      const result = await mobileApiService.getDashboardData('doctor');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3); // Original + refresh + retry
    });
  });
});