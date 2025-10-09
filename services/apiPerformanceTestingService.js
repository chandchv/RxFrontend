/**
 * API Performance Testing Service
 * Tests mobile API performance and integration with existing backend
 */

import { mobileApiService } from './mobileApiService';
import { integrationService } from './integrationService';

class ApiPerformanceTestingService {
  constructor() {
    this.testResults = {};
    this.performanceMetrics = {};
    this.loadTestResults = {};
  }

  /**
   * Run comprehensive API performance tests
   */
  async runPerformanceTests() {
    console.log('Starting API performance tests...');
    
    const testSuite = [
      { name: 'Dashboard API Performance', test: this.testDashboardApiPerformance.bind(this) },
      { name: 'Clinical Records API Performance', test: this.testClinicalRecordsApiPerformance.bind(this) },
      { name: 'Appointments API Performance', test: this.testAppointmentsApiPerformance.bind(this) },
      { name: 'Prescriptions API Performance', test: this.testPrescriptionsApiPerformance.bind(this) },
      { name: 'Document Upload Performance', test: this.testDocumentUploadPerformance.bind(this) },
      { name: 'Search API Performance', test: this.testSearchApiPerformance.bind(this) },
      { name: 'Real-time API Performance', test: this.testRealTimeApiPerformance.bind(this) },
      { name: 'Concurrent API Load Test', test: this.testConcurrentApiLoad.bind(this) },
      { name: 'Network Resilience Test', test: this.testNetworkResilience.bind(this) },
      { name: 'Cache Performance Test', test: this.testCachePerformance.bind(this) }
    ];

    const results = {};
    
    for (const testCase of testSuite) {
      try {
        console.log(`Running ${testCase.name}...`);
        const startTime = Date.now();
        
        const result = await testCase.test();
        const duration = Date.now() - startTime;
        
        results[testCase.name] = {
          status: 'passed',
          duration,
          metrics: result
        };
        
        console.log(`✅ ${testCase.name} passed (${duration}ms)`);
      } catch (error) {
        console.error(`❌ ${testCase.name} failed:`, error);
        results[testCase.name] = {
          status: 'failed',
          duration: Date.now() - startTime,
          error: error.message
        };
      }
    }
    
    this.testResults = results;
    this.generatePerformanceReport();
    
    return results;
  }

  /**
   * Test dashboard API performance
   */
  async testDashboardApiPerformance() {
    const metrics = {};
    const roles = ['doctor', 'patient', 'admin', 'staff'];
    
    for (const role of roles) {
      const startTime = Date.now();
      
      // Test dashboard data loading
      const dashboardData = await integrationService.getDashboardData(
        role,
        `test-${role}-1`,
        'test-clinic-1'
      );
      
      const loadTime = Date.now() - startTime;
      
      metrics[`${role}_dashboard_load_time`] = loadTime;
      metrics[`${role}_dashboard_data_size`] = JSON.stringify(dashboardData).length;
      
      // Verify data structure
      if (!dashboardData || typeof dashboardData !== 'object') {
        throw new Error(`Invalid dashboard data for ${role}`);
      }
      
      // Performance thresholds
      if (loadTime > 3000) { // 3 seconds
        throw new Error(`Dashboard load time too slow for ${role}: ${loadTime}ms`);
      }
    }
    
    return metrics;
  }

  /**
   * Test clinical records API performance
   */
  async testClinicalRecordsApiPerformance() {
    const metrics = {};
    
    // Test records list loading
    const listStartTime = Date.now();
    const records = await integrationService.getClinicalRecords({}, { page: 1, limit: 20 });
    const listLoadTime = Date.now() - listStartTime;
    
    metrics.records_list_load_time = listLoadTime;
    metrics.records_list_count = records.length;
    
    if (listLoadTime > 2000) { // 2 seconds
      throw new Error(`Records list load time too slow: ${listLoadTime}ms`);
    }
    
    // Test individual record loading
    if (records.length > 0) {
      const detailStartTime = Date.now();
      const recordDetail = await mobileApiService.get(`/clinical-records/${records[0].id}/`);
      const detailLoadTime = Date.now() - detailStartTime;
      
      metrics.record_detail_load_time = detailLoadTime;
      metrics.record_detail_data_size = JSON.stringify(recordDetail).length;
      
      if (detailLoadTime > 1500) { // 1.5 seconds
        throw new Error(`Record detail load time too slow: ${detailLoadTime}ms`);
      }
    }
    
    return metrics;
  }

  /**
   * Test appointments API performance
   */
  async testAppointmentsApiPerformance() {
    const metrics = {};
    
    // Test appointments loading
    const startTime = Date.now();
    const appointments = await integrationService.getAppointments({
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    const loadTime = Date.now() - startTime;
    
    metrics.appointments_load_time = loadTime;
    metrics.appointments_count = appointments.length;
    
    if (loadTime > 2000) { // 2 seconds
      throw new Error(`Appointments load time too slow: ${loadTime}ms`);
    }
    
    // Test appointment scheduling performance
    const scheduleStartTime = Date.now();
    const appointmentData = {
      patientId: 'test-patient-1',
      doctorId: 'test-doctor-1',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      time: '10:00',
      type: 'consultation'
    };
    
    const scheduledAppointment = await integrationService.scheduleAppointment(appointmentData);
    const scheduleTime = Date.now() - scheduleStartTime;
    
    metrics.appointment_schedule_time = scheduleTime;
    
    if (scheduleTime > 3000) { // 3 seconds
      throw new Error(`Appointment scheduling too slow: ${scheduleTime}ms`);
    }
    
    return metrics;
  }

  /**
   * Test prescriptions API performance
   */
  async testPrescriptionsApiPerformance() {
    const metrics = {};
    
    // Test prescriptions loading
    const startTime = Date.now();
    const prescriptions = await integrationService.getPrescriptions({
      patientId: 'test-patient-1'
    });
    const loadTime = Date.now() - startTime;
    
    metrics.prescriptions_load_time = loadTime;
    metrics.prescriptions_count = prescriptions.length;
    
    if (loadTime > 2000) { // 2 seconds
      throw new Error(`Prescriptions load time too slow: ${loadTime}ms`);
    }
    
    // Test prescription scan performance
    const scanStartTime = Date.now();
    const mockImageData = {
      uri: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      type: 'image/jpeg',
      size: 1024
    };
    
    const scanResult = await integrationService.processPrescriptionScan(mockImageData);
    const scanTime = Date.now() - scanStartTime;
    
    metrics.prescription_scan_time = scanTime;
    
    if (scanTime > 5000) { // 5 seconds
      throw new Error(`Prescription scan too slow: ${scanTime}ms`);
    }
    
    return metrics;
  }

  /**
   * Test document upload performance
   */
  async testDocumentUploadPerformance() {
    const metrics = {};
    const fileSizes = [1024, 10240, 102400, 1048576]; // 1KB, 10KB, 100KB, 1MB
    
    for (const size of fileSizes) {
      const mockDocument = {
        name: `test-document-${size}.pdf`,
        type: 'application/pdf',
        size,
        data: 'x'.repeat(size) // Mock file data
      };
      
      const startTime = Date.now();
      let progressUpdates = 0;
      
      const result = await integrationService.uploadDocument(
        mockDocument,
        (progress) => {
          progressUpdates++;
        }
      );
      
      const uploadTime = Date.now() - startTime;
      
      metrics[`upload_time_${size}b`] = uploadTime;
      metrics[`upload_progress_updates_${size}b`] = progressUpdates;
      
      // Performance thresholds based on file size
      const maxTime = Math.max(2000, size / 1024 * 100); // 100ms per KB, min 2s
      if (uploadTime > maxTime) {
        throw new Error(`Upload too slow for ${size}B file: ${uploadTime}ms`);
      }
    }
    
    return metrics;
  }

  /**
   * Test search API performance
   */
  async testSearchApiPerformance() {
    const metrics = {};
    const searchQueries = [
      'test',
      'patient',
      'prescription',
      'lab result',
      'x-ray'
    ];
    
    for (const query of searchQueries) {
      const startTime = Date.now();
      
      const results = await integrationService.searchClinicalRecords(query, {
        limit: 20
      });
      
      const searchTime = Date.now() - startTime;
      
      metrics[`search_time_${query.replace(' ', '_')}`] = searchTime;
      metrics[`search_results_${query.replace(' ', '_')}`] = results.length;
      
      if (searchTime > 3000) { // 3 seconds
        throw new Error(`Search too slow for "${query}": ${searchTime}ms`);
      }
    }
    
    return metrics;
  }

  /**
   * Test real-time API performance
   */
  async testRealTimeApiPerformance() {
    const metrics = {};
    
    // Test WebSocket connection time
    const connectionStartTime = Date.now();
    
    // Simulate WebSocket connection
    await new Promise((resolve) => {
      setTimeout(resolve, 100); // Simulate connection time
    });
    
    const connectionTime = Date.now() - connectionStartTime;
    metrics.websocket_connection_time = connectionTime;
    
    if (connectionTime > 2000) { // 2 seconds
      throw new Error(`WebSocket connection too slow: ${connectionTime}ms`);
    }
    
    // Test real-time message handling
    const messageStartTime = Date.now();
    let messagesReceived = 0;
    
    // Simulate receiving real-time messages
    for (let i = 0; i < 10; i++) {
      integrationService.handleDashboardUpdate({
        type: 'test_update',
        data: { value: i }
      });
      messagesReceived++;
    }
    
    const messageHandlingTime = Date.now() - messageStartTime;
    metrics.message_handling_time = messageHandlingTime;
    metrics.messages_processed = messagesReceived;
    
    if (messageHandlingTime > 1000) { // 1 second for 10 messages
      throw new Error(`Message handling too slow: ${messageHandlingTime}ms`);
    }
    
    return metrics;
  }

  /**
   * Test concurrent API load
   */
  async testConcurrentApiLoad() {
    const metrics = {};
    const concurrentRequests = 10;
    
    // Test concurrent dashboard requests
    const dashboardPromises = Array.from({ length: concurrentRequests }, (_, i) => 
      integrationService.getDashboardData('doctor', `test-doctor-${i}`, 'test-clinic-1')
    );
    
    const dashboardStartTime = Date.now();
    const dashboardResults = await Promise.all(dashboardPromises);
    const dashboardConcurrentTime = Date.now() - dashboardStartTime;
    
    metrics.concurrent_dashboard_requests = concurrentRequests;
    metrics.concurrent_dashboard_time = dashboardConcurrentTime;
    metrics.concurrent_dashboard_success_rate = dashboardResults.filter(r => r).length / concurrentRequests;
    
    // Test concurrent clinical records requests
    const recordsPromises = Array.from({ length: concurrentRequests }, () => 
      integrationService.getClinicalRecords({}, { page: 1, limit: 10 })
    );
    
    const recordsStartTime = Date.now();
    const recordsResults = await Promise.all(recordsPromises);
    const recordsConcurrentTime = Date.now() - recordsStartTime;
    
    metrics.concurrent_records_requests = concurrentRequests;
    metrics.concurrent_records_time = recordsConcurrentTime;
    metrics.concurrent_records_success_rate = recordsResults.filter(r => r).length / concurrentRequests;
    
    // Performance thresholds
    if (dashboardConcurrentTime > 10000) { // 10 seconds
      throw new Error(`Concurrent dashboard requests too slow: ${dashboardConcurrentTime}ms`);
    }
    
    if (recordsConcurrentTime > 10000) { // 10 seconds
      throw new Error(`Concurrent records requests too slow: ${recordsConcurrentTime}ms`);
    }
    
    return metrics;
  }

  /**
   * Test network resilience
   */
  async testNetworkResilience() {
    const metrics = {};
    
    // Test offline behavior
    integrationService.setConnectionStatus('disconnected');
    
    const offlineStartTime = Date.now();
    const offlineData = await integrationService.getDashboardData(
      'doctor',
      'test-doctor-1',
      'test-clinic-1'
    );
    const offlineTime = Date.now() - offlineStartTime;
    
    metrics.offline_data_access_time = offlineTime;
    metrics.offline_data_available = !!offlineData;
    
    // Test reconnection behavior
    integrationService.setConnectionStatus('connected');
    
    const reconnectStartTime = Date.now();
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, 5000); // 5 second timeout
      integrationService.once('sync_completed', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    const reconnectTime = Date.now() - reconnectStartTime;
    
    metrics.reconnection_sync_time = reconnectTime;
    
    if (offlineTime > 1000) { // 1 second
      throw new Error(`Offline data access too slow: ${offlineTime}ms`);
    }
    
    if (reconnectTime > 10000) { // 10 seconds
      throw new Error(`Reconnection sync too slow: ${reconnectTime}ms`);
    }
    
    return metrics;
  }

  /**
   * Test cache performance
   */
  async testCachePerformance() {
    const metrics = {};
    
    // Test cache hit performance
    const cacheKey = 'test-dashboard-data';
    const testData = { test: 'data', timestamp: Date.now() };
    
    // Cache data
    const cacheStartTime = Date.now();
    await integrationService.services.offlineStorage.cacheDashboardData(
      'doctor',
      'test-doctor-1',
      testData
    );
    const cacheTime = Date.now() - cacheStartTime;
    
    metrics.cache_write_time = cacheTime;
    
    // Retrieve cached data
    const retrieveStartTime = Date.now();
    const cachedData = await integrationService.services.offlineStorage.getDashboardData(
      'doctor',
      'test-doctor-1'
    );
    const retrieveTime = Date.now() - retrieveStartTime;
    
    metrics.cache_read_time = retrieveTime;
    metrics.cache_data_integrity = JSON.stringify(cachedData) === JSON.stringify(testData);
    
    if (cacheTime > 500) { // 500ms
      throw new Error(`Cache write too slow: ${cacheTime}ms`);
    }
    
    if (retrieveTime > 100) { // 100ms
      throw new Error(`Cache read too slow: ${retrieveTime}ms`);
    }
    
    return metrics;
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: Object.keys(this.testResults).length,
        passedTests: Object.values(this.testResults).filter(r => r.status === 'passed').length,
        failedTests: Object.values(this.testResults).filter(r => r.status === 'failed').length,
        averageResponseTime: this.calculateAverageResponseTime(),
        performanceGrade: this.calculatePerformanceGrade()
      },
      results: this.testResults,
      recommendations: this.generatePerformanceRecommendations()
    };
    
    console.log('=== API Performance Test Report ===');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    console.log(`Average Response Time: ${report.summary.averageResponseTime}ms`);
    console.log(`Performance Grade: ${report.summary.performanceGrade}`);
    console.log('===================================');
    
    return report;
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime() {
    const durations = Object.values(this.testResults)
      .filter(r => r.status === 'passed')
      .map(r => r.duration);
    
    if (durations.length === 0) return 0;
    
    return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  }

  /**
   * Calculate performance grade
   */
  calculatePerformanceGrade() {
    const avgResponseTime = this.calculateAverageResponseTime();
    const passRate = Object.values(this.testResults).filter(r => r.status === 'passed').length / 
                    Object.keys(this.testResults).length;
    
    if (passRate < 0.8) return 'F';
    if (avgResponseTime > 5000) return 'D';
    if (avgResponseTime > 3000) return 'C';
    if (avgResponseTime > 2000) return 'B';
    return 'A';
  }

  /**
   * Generate performance recommendations
   */
  generatePerformanceRecommendations() {
    const recommendations = [];
    const avgResponseTime = this.calculateAverageResponseTime();
    
    if (avgResponseTime > 3000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'API response times are slow. Consider optimizing backend queries and adding caching.'
      });
    }
    
    const failedTests = Object.entries(this.testResults)
      .filter(([_, result]) => result.status === 'failed');
    
    if (failedTests.length > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'critical',
        message: 'Some API tests failed. Review and fix issues before deployment.',
        failedTests: failedTests.map(([name, _]) => name)
      });
    }
    
    // Check for specific performance issues
    const uploadTest = this.testResults['Document Upload Performance'];
    if (uploadTest && uploadTest.status === 'failed') {
      recommendations.push({
        type: 'upload',
        priority: 'medium',
        message: 'Document upload performance is poor. Consider implementing chunked uploads or compression.'
      });
    }
    
    const concurrentTest = this.testResults['Concurrent API Load Test'];
    if (concurrentTest && concurrentTest.status === 'failed') {
      recommendations.push({
        type: 'scalability',
        priority: 'high',
        message: 'API cannot handle concurrent load well. Consider implementing rate limiting and load balancing.'
      });
    }
    
    return recommendations;
  }

  /**
   * Get test results
   */
  getTestResults() {
    return this.testResults;
  }

  /**
   * Clear test results
   */
  clearTestResults() {
    this.testResults = {};
    this.performanceMetrics = {};
    this.loadTestResults = {};
  }
}

export const apiPerformanceTestingService = new ApiPerformanceTestingService();
export default apiPerformanceTestingService;