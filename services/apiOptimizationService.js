import NetInfo from '@react-native-community/netinfo';
import dataCachingService from './dataCachingService';

/**
 * API Optimization Service
 * Optimizes API calls and reduces data usage through intelligent request management
 */
class ApiOptimizationService {
  constructor() {
    this.requestQueue = [];
    this.activeRequests = new Map();
    this.requestCache = new Map();
    this.networkInfo = { isConnected: true, type: 'wifi' };
    this.batchRequests = new Map();
    this.compressionEnabled = true;
    this.maxConcurrentRequests = 5;
    this.requestTimeout = 30000; // 30 seconds
    
    this.initializeNetworkMonitoring();
  }

  /**
   * Initialize network monitoring
   */
  initializeNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      this.networkInfo = {
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      };
      
      console.log('Network state updated:', this.networkInfo);
      
      // Adjust optimization strategy based on network type
      this.adjustOptimizationStrategy();
    });
  }

  /**
   * Adjust optimization strategy based on network conditions
   */
  adjustOptimizationStrategy() {
    const { type, isConnected } = this.networkInfo;
    
    if (!isConnected) {
      // Offline - pause all non-critical requests
      this.pauseNonCriticalRequests();
      return;
    }
    
    switch (type) {
      case 'cellular':
        // Cellular connection - aggressive optimization
        this.maxConcurrentRequests = 2;
        this.compressionEnabled = true;
        this.enableDataSaving();
        break;
      case 'wifi':
        // WiFi connection - normal optimization
        this.maxConcurrentRequests = 5;
        this.compressionEnabled = false;
        this.disableDataSaving();
        break;
      default:
        // Unknown connection - conservative approach
        this.maxConcurrentRequests = 3;
        this.compressionEnabled = true;
        break;
    }
    
    console.log(`Optimization strategy adjusted for ${type} connection`);
  }

  /**
   * Optimized API request with caching and deduplication
   */
  async optimizedRequest(url, options = {}) {
    const requestKey = this.generateRequestKey(url, options);
    
    try {
      // Check if request is already in progress
      if (this.activeRequests.has(requestKey)) {
        console.log(`Deduplicating request: ${requestKey}`);
        return await this.activeRequests.get(requestKey);
      }
      
      // Check cache first for GET requests
      if ((!options.method || options.method === 'GET') && !options.skipCache) {
        const cachedResponse = await this.getCachedResponse(requestKey);
        if (cachedResponse) {
          console.log(`Cache hit for request: ${requestKey}`);
          return cachedResponse;
        }
      }
      
      // Create optimized request
      const requestPromise = this.executeOptimizedRequest(url, options);
      
      // Store active request for deduplication
      this.activeRequests.set(requestKey, requestPromise);
      
      try {
        const response = await requestPromise;
        
        // Cache successful GET responses
        if ((!options.method || options.method === 'GET') && response.ok) {
          await this.cacheResponse(requestKey, response.clone(), options.cacheTTL);
        }
        
        return response;
      } finally {
        // Remove from active requests
        this.activeRequests.delete(requestKey);
      }
    } catch (error) {
      console.error(`Optimized request failed: ${requestKey}`, error);
      
      // Try to return cached response as fallback
      if (!options.method || options.method === 'GET') {
        const fallbackResponse = await this.getCachedResponse(requestKey);
        if (fallbackResponse) {
          console.log(`Using cached fallback for: ${requestKey}`);
          return fallbackResponse;
        }
      }
      
      throw error;
    }
  }

  /**
   * Execute optimized request with network-specific optimizations
   */
  async executeOptimizedRequest(url, options = {}) {
    // Apply network-specific optimizations
    const optimizedOptions = this.applyNetworkOptimizations(options);
    
    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
    
    try {
      const response = await fetch(url, {
        ...optimizedOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout: ${url}`);
      }
      
      throw error;
    }
  }

  /**
   * Apply network-specific optimizations to request options
   */
  applyNetworkOptimizations(options) {
    const optimized = { ...options };
    
    // Add compression headers if enabled
    if (this.compressionEnabled) {
      optimized.headers = {
        'Accept-Encoding': 'gzip, deflate, br',
        ...optimized.headers,
      };
    }
    
    // Add data saving headers for cellular connections
    if (this.networkInfo.type === 'cellular') {
      optimized.headers = {
        'Save-Data': 'on',
        ...optimized.headers,
      };
    }
    
    // Optimize for mobile
    optimized.headers = {
      'User-Agent': 'RxDoctor-Mobile/1.0',
      'Accept': 'application/json',
      ...optimized.headers,
    };
    
    return optimized;
  }

  /**
   * Batch multiple requests together
   */
  async batchRequests(requests, options = {}) {
    const batchId = Date.now().toString();
    const batchTimeout = options.timeout || 5000; // 5 seconds
    
    console.log(`Starting batch request: ${batchId} with ${requests.length} requests`);
    
    // Group requests by priority
    const highPriority = requests.filter(req => req.priority === 'high');
    const normalPriority = requests.filter(req => req.priority !== 'high' && req.priority !== 'low');
    const lowPriority = requests.filter(req => req.priority === 'low');
    
    const results = [];
    
    try {
      // Execute high priority requests first
      if (highPriority.length > 0) {
        const highResults = await this.executeBatch(highPriority, { timeout: batchTimeout / 3 });
        results.push(...highResults);
      }
      
      // Execute normal priority requests
      if (normalPriority.length > 0) {
        const normalResults = await this.executeBatch(normalPriority, { timeout: batchTimeout / 2 });
        results.push(...normalResults);
      }
      
      // Execute low priority requests
      if (lowPriority.length > 0) {
        const lowResults = await this.executeBatch(lowPriority, { timeout: batchTimeout });
        results.push(...lowResults);
      }
      
      console.log(`Batch request completed: ${batchId}`);
      return results;
    } catch (error) {
      console.error(`Batch request failed: ${batchId}`, error);
      throw error;
    }
  }

  /**
   * Execute a batch of requests with concurrency control
   */
  async executeBatch(requests, options = {}) {
    const results = [];
    const chunks = this.chunkArray(requests, this.maxConcurrentRequests);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (request) => {
        try {
          const response = await this.optimizedRequest(request.url, request.options);
          return { success: true, data: response, request };
        } catch (error) {
          return { success: false, error, request };
        }
      });
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      results.push(...chunkResults.map(result => result.value || result.reason));
      
      // Small delay between chunks to avoid overwhelming the server
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Intelligent prefetching based on user behavior
   */
  async prefetchData(prefetchConfig) {
    if (!this.networkInfo.isConnected) {
      console.log('Skipping prefetch - offline');
      return;
    }
    
    // Don't prefetch on cellular unless explicitly allowed
    if (this.networkInfo.type === 'cellular' && !prefetchConfig.allowCellular) {
      console.log('Skipping prefetch - cellular connection');
      return;
    }
    
    console.log('Starting intelligent prefetch');
    
    const prefetchRequests = [];
    
    // Prefetch dashboard data
    if (prefetchConfig.dashboard) {
      prefetchRequests.push({
        url: '/api/mobile/dashboard/',
        options: { priority: 'low' },
        type: 'dashboard',
      });
    }
    
    // Prefetch clinical records
    if (prefetchConfig.clinicalRecords) {
      prefetchRequests.push({
        url: '/api/mobile/clinical-records/?page=1&limit=10',
        options: { priority: 'low' },
        type: 'clinical_records',
      });
    }
    
    // Prefetch appointments
    if (prefetchConfig.appointments) {
      prefetchRequests.push({
        url: '/api/mobile/appointments/?status=upcoming',
        options: { priority: 'low' },
        type: 'appointments',
      });
    }
    
    // Execute prefetch requests
    try {
      await this.batchRequests(prefetchRequests, { timeout: 10000 });
      console.log('Prefetch completed successfully');
    } catch (error) {
      console.error('Prefetch failed:', error);
    }
  }

  /**
   * Generate unique key for request caching and deduplication
   */
  generateRequestKey(url, options) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    const headers = options.headers ? JSON.stringify(options.headers) : '';
    
    return `${method}:${url}:${body}:${headers}`;
  }

  /**
   * Cache response for future use
   */
  async cacheResponse(requestKey, response, ttl = 300000) { // 5 minutes default
    try {
      const responseData = await response.json();
      const cacheEntry = {
        data: responseData,
        timestamp: Date.now(),
        ttl,
        headers: Object.fromEntries(response.headers.entries()),
        status: response.status,
        statusText: response.statusText,
      };
      
      this.requestCache.set(requestKey, cacheEntry);
      
      // Also store in persistent cache
      await dataCachingService.cacheData('api_responses', requestKey, cacheEntry);
    } catch (error) {
      console.error('Error caching response:', error);
    }
  }

  /**
   * Get cached response
   */
  async getCachedResponse(requestKey) {
    try {
      // Check memory cache first
      let cacheEntry = this.requestCache.get(requestKey);
      
      // Check persistent cache if not in memory
      if (!cacheEntry) {
        cacheEntry = await dataCachingService.getData('api_responses', requestKey);
      }
      
      if (!cacheEntry) return null;
      
      // Check if cache is still valid
      const now = Date.now();
      if (now - cacheEntry.timestamp > cacheEntry.ttl) {
        this.requestCache.delete(requestKey);
        return null;
      }
      
      // Create mock Response object
      const response = new Response(JSON.stringify(cacheEntry.data), {
        status: cacheEntry.status,
        statusText: cacheEntry.statusText,
        headers: cacheEntry.headers,
      });
      
      return response;
    } catch (error) {
      console.error('Error getting cached response:', error);
      return null;
    }
  }

  /**
   * Pause non-critical requests when offline
   */
  pauseNonCriticalRequests() {
    console.log('Pausing non-critical requests - offline mode');
    // Implementation would pause queued requests with low priority
  }

  /**
   * Enable data saving mode
   */
  enableDataSaving() {
    console.log('Data saving mode enabled');
    // Reduce image quality, limit prefetching, etc.
  }

  /**
   * Disable data saving mode
   */
  disableDataSaving() {
    console.log('Data saving mode disabled');
    // Normal quality settings
  }

  /**
   * Chunk array into smaller arrays
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get API optimization statistics
   */
  getOptimizationStats() {
    return {
      networkInfo: this.networkInfo,
      activeRequests: this.activeRequests.size,
      cachedResponses: this.requestCache.size,
      maxConcurrentRequests: this.maxConcurrentRequests,
      compressionEnabled: this.compressionEnabled,
      requestTimeout: this.requestTimeout,
    };
  }

  /**
   * Clear request cache
   */
  clearRequestCache() {
    this.requestCache.clear();
    console.log('Request cache cleared');
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests() {
    // Note: In a real implementation, you'd need to track AbortControllers
    console.log('All active requests cancelled');
  }

  /**
   * Set optimization configuration
   */
  setOptimizationConfig(config) {
    if (config.maxConcurrentRequests) {
      this.maxConcurrentRequests = config.maxConcurrentRequests;
    }
    
    if (config.requestTimeout) {
      this.requestTimeout = config.requestTimeout;
    }
    
    if (config.compressionEnabled !== undefined) {
      this.compressionEnabled = config.compressionEnabled;
    }
    
    console.log('API optimization configuration updated:', config);
  }
}

export default new ApiOptimizationService();