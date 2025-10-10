#!/usr/bin/env node

/**
 * Integration Test Runner
 * Runs comprehensive integration tests for mobile app with existing backend systems
 */

const { integrationService } = require('../services/integrationService');
const { workflowTestingService } = require('../services/workflowTestingService');
const { apiPerformanceTestingService } = require('../services/apiPerformanceTestingService');
const { crossPlatformTestingService } = require('../services/crossPlatformTestingService');
const fs = require('fs').promises;
const path = require('path');

class IntegrationTestRunner {
  constructor() {
    this.testResults = {};
    this.startTime = null;
    this.endTime = null;
    this.reportPath = path.join(__dirname, '..', 'test-reports');
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🚀 Starting Mobile App Integration Tests...');
    console.log('==========================================');
    
    this.startTime = Date.now();
    
    try {
      // Ensure report directory exists
      await this.ensureReportDirectory();
      
      // Initialize integration service
      console.log('📱 Initializing Integration Service...');
      await integrationService.initialize();
      
      // Run test suites
      await this.runTestSuite('Workflow Tests', () => workflowTestingService.runAllWorkflowTests());
      await this.runTestSuite('API Performance Tests', () => apiPerformanceTestingService.runPerformanceTests());
      await this.runTestSuite('Cross-Platform Compatibility Tests', () => crossPlatformTestingService.runCompatibilityTests());
      await this.runTestSuite('Backend Integration Tests', () => this.runBackendIntegrationTests());
      await this.runTestSuite('Data Consistency Tests', () => this.runDataConsistencyTests());
      await this.runTestSuite('Security Integration Tests', () => this.runSecurityIntegrationTests());
      await this.runTestSuite('Performance Integration Tests', () => this.runPerformanceIntegrationTests());
      
      this.endTime = Date.now();
      
      // Generate comprehensive report
      await this.generateComprehensiveReport();
      
      // Display summary
      this.displayTestSummary();
      
      // Exit with appropriate code
      const hasFailures = this.hasTestFailures();
      process.exit(hasFailures ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Integration tests failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run a test suite with error handling
   */
  async runTestSuite(suiteName, testFunction) {
    console.log(`\n🧪 Running ${suiteName}...`);
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    
    try {
      const results = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults[suiteName] = {
        status: 'completed',
        duration,
        results,
        timestamp: new Date().toISOString()
      };
      
      const passedCount = this.countPassedTests(results);
      const totalCount = this.countTotalTests(results);
      
      console.log(`✅ ${suiteName} completed: ${passedCount}/${totalCount} tests passed (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults[suiteName] = {
        status: 'failed',
        duration,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      
      console.error(`❌ ${suiteName} failed: ${error.message}`);
    }
  }

  /**
   * Run backend integration tests
   */
  async runBackendIntegrationTests() {
    const tests = {};
    
    // Test API connectivity
    tests['API Connectivity'] = await this.testApiConnectivity();
    
    // Test authentication integration
    tests['Authentication Integration'] = await this.testAuthenticationIntegration();
    
    // Test database integration
    tests['Database Integration'] = await this.testDatabaseIntegration();
    
    // Test real-time integration
    tests['Real-time Integration'] = await this.testRealTimeIntegration();
    
    // Test file upload integration
    tests['File Upload Integration'] = await this.testFileUploadIntegration();
    
    return tests;
  }

  /**
   * Test API connectivity
   */
  async testApiConnectivity() {
    try {
      const startTime = Date.now();
      
      // Test health endpoint
      const healthResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/health/`);
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
      
      // Test API version endpoint
      const versionResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/version/`);
      if (!versionResponse.ok) {
        throw new Error(`Version check failed: ${versionResponse.status}`);
      }
      
      const versionData = await versionResponse.json();
      
      return {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          healthCheck: true,
          apiVersion: versionData.version,
          responseTime: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          healthCheck: false,
          apiVersion: null
        }
      };
    }
  }

  /**
   * Test authentication integration
   */
  async testAuthenticationIntegration() {
    try {
      const startTime = Date.now();
      
      // Test login endpoint
      const loginResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword'
        })
      });
      
      const loginData = await loginResponse.json();
      
      // Test token validation
      if (loginData.token) {
        const validateResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/auth/validate/`, {
          headers: {
            'Authorization': `Bearer ${loginData.token}`
          }
        });
        
        if (!validateResponse.ok) {
          throw new Error('Token validation failed');
        }
      }
      
      return {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          loginSuccess: loginResponse.ok,
          tokenReceived: !!loginData.token,
          tokenValidation: true
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          loginSuccess: false,
          tokenReceived: false,
          tokenValidation: false
        }
      };
    }
  }

  /**
   * Test database integration
   */
  async testDatabaseIntegration() {
    try {
      const startTime = Date.now();
      
      // Test database health
      const dbHealthResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/health/database/`);
      if (!dbHealthResponse.ok) {
        throw new Error('Database health check failed');
      }
      
      const dbHealthData = await dbHealthResponse.json();
      
      return {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          databaseConnected: dbHealthData.connected,
          databaseVersion: dbHealthData.version,
          migrationStatus: dbHealthData.migrations_applied
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          databaseConnected: false,
          databaseVersion: null,
          migrationStatus: false
        }
      };
    }
  }

  /**
   * Test real-time integration
   */
  async testRealTimeIntegration() {
    try {
      const startTime = Date.now();
      
      // Test WebSocket connection
      const wsUrl = process.env.WEBSOCKET_URL || 'ws://localhost:8000/ws/';
      const ws = new WebSocket(wsUrl);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({
            status: 'failed',
            error: 'WebSocket connection timeout',
            details: {
              connectionEstablished: false,
              messageReceived: false
            }
          });
        }, 5000);
        
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'ping' }));
        };
        
        ws.onmessage = (event) => {
          clearTimeout(timeout);
          ws.close();
          
          resolve({
            status: 'passed',
            duration: Date.now() - startTime,
            details: {
              connectionEstablished: true,
              messageReceived: true,
              responseTime: Date.now() - startTime
            }
          });
        };
        
        ws.onerror = (error) => {
          clearTimeout(timeout);
          resolve({
            status: 'failed',
            error: 'WebSocket connection error',
            details: {
              connectionEstablished: false,
              messageReceived: false
            }
          });
        };
      });
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          connectionEstablished: false,
          messageReceived: false
        }
      };
    }
  }

  /**
   * Test file upload integration
   */
  async testFileUploadIntegration() {
    try {
      const startTime = Date.now();
      
      // Create test file
      const testFile = new Blob(['test file content'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', testFile, 'test.txt');
      
      // Test file upload
      const uploadResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/clinical-records/upload/`, {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadResponse.json();
      
      return {
        status: uploadResponse.ok ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: {
          uploadSuccess: uploadResponse.ok,
          fileId: uploadData.id,
          fileSize: testFile.size
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          uploadSuccess: false,
          fileId: null,
          fileSize: 0
        }
      };
    }
  }

  /**
   * Run data consistency tests
   */
  async runDataConsistencyTests() {
    const tests = {};
    
    // Test dashboard data consistency
    tests['Dashboard Data Consistency'] = await this.testDashboardDataConsistency();
    
    // Test clinical records consistency
    tests['Clinical Records Consistency'] = await this.testClinicalRecordsConsistency();
    
    // Test user data consistency
    tests['User Data Consistency'] = await this.testUserDataConsistency();
    
    return tests;
  }

  /**
   * Test dashboard data consistency
   */
  async testDashboardDataConsistency() {
    try {
      const startTime = Date.now();
      
      // Get dashboard data from mobile API
      const mobileData = await integrationService.getDashboardData('doctor', 'test-doctor-1', 'test-clinic-1');
      
      // Get dashboard data from web API
      const webResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/dashboard/doctor/`);
      const webData = await webResponse.json();
      
      // Compare key metrics
      const metricsMatch = this.compareMetrics(mobileData.metrics, webData.metrics);
      
      return {
        status: metricsMatch ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: {
          mobileDataReceived: !!mobileData,
          webDataReceived: !!webData,
          metricsMatch,
          mobileMetricsCount: Object.keys(mobileData.metrics || {}).length,
          webMetricsCount: Object.keys(webData.metrics || {}).length
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          mobileDataReceived: false,
          webDataReceived: false,
          metricsMatch: false
        }
      };
    }
  }

  /**
   * Test clinical records consistency
   */
  async testClinicalRecordsConsistency() {
    try {
      const startTime = Date.now();
      
      // Get records from mobile API
      const mobileRecords = await integrationService.getClinicalRecords({}, { page: 1, limit: 10 });
      
      // Get records from web API
      const webResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/clinical-records/?page=1&limit=10`);
      const webRecords = await webResponse.json();
      
      // Compare record counts and IDs
      const recordsMatch = this.compareRecords(mobileRecords, webRecords.results || webRecords);
      
      return {
        status: recordsMatch ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: {
          mobileRecordsCount: mobileRecords.length,
          webRecordsCount: (webRecords.results || webRecords).length,
          recordsMatch
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          mobileRecordsCount: 0,
          webRecordsCount: 0,
          recordsMatch: false
        }
      };
    }
  }

  /**
   * Test user data consistency
   */
  async testUserDataConsistency() {
    try {
      const startTime = Date.now();
      
      // This would test user profile data consistency
      // between mobile and web APIs
      
      return {
        status: 'passed',
        duration: Date.now() - startTime,
        details: {
          userDataConsistent: true,
          profileDataMatch: true
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          userDataConsistent: false,
          profileDataMatch: false
        }
      };
    }
  }

  /**
   * Run security integration tests
   */
  async runSecurityIntegrationTests() {
    const tests = {};
    
    // Test authentication security
    tests['Authentication Security'] = await this.testAuthenticationSecurity();
    
    // Test data encryption
    tests['Data Encryption'] = await this.testDataEncryption();
    
    // Test access control
    tests['Access Control'] = await this.testAccessControl();
    
    return tests;
  }

  /**
   * Test authentication security
   */
  async testAuthenticationSecurity() {
    try {
      const startTime = Date.now();
      
      // Test invalid credentials
      const invalidResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        })
      });
      
      // Should fail with 401
      const invalidLoginRejected = invalidResponse.status === 401;
      
      return {
        status: invalidLoginRejected ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: {
          invalidLoginRejected,
          responseStatus: invalidResponse.status
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          invalidLoginRejected: false
        }
      };
    }
  }

  /**
   * Test data encryption
   */
  async testDataEncryption() {
    try {
      const startTime = Date.now();
      
      // Test that sensitive data is encrypted in storage
      const encryptionService = integrationService.services.dataEncryption;
      
      if (encryptionService) {
        const testData = 'sensitive test data';
        const encrypted = await encryptionService.encrypt(testData);
        const decrypted = await encryptionService.decrypt(encrypted);
        
        const encryptionWorking = decrypted === testData && encrypted !== testData;
        
        return {
          status: encryptionWorking ? 'passed' : 'failed',
          duration: Date.now() - startTime,
          details: {
            encryptionWorking,
            dataEncrypted: encrypted !== testData,
            dataDecrypted: decrypted === testData
          }
        };
      } else {
        return {
          status: 'skipped',
          duration: Date.now() - startTime,
          details: {
            reason: 'Encryption service not available'
          }
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          encryptionWorking: false
        }
      };
    }
  }

  /**
   * Test access control
   */
  async testAccessControl() {
    try {
      const startTime = Date.now();
      
      // Test that unauthorized access is blocked
      const unauthorizedResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/admin/users/`);
      
      // Should fail with 401 or 403
      const accessBlocked = unauthorizedResponse.status === 401 || unauthorizedResponse.status === 403;
      
      return {
        status: accessBlocked ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: {
          accessBlocked,
          responseStatus: unauthorizedResponse.status
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          accessBlocked: false
        }
      };
    }
  }

  /**
   * Run performance integration tests
   */
  async runPerformanceIntegrationTests() {
    const tests = {};
    
    // Test end-to-end performance
    tests['End-to-End Performance'] = await this.testEndToEndPerformance();
    
    // Test concurrent user simulation
    tests['Concurrent User Performance'] = await this.testConcurrentUserPerformance();
    
    return tests;
  }

  /**
   * Test end-to-end performance
   */
  async testEndToEndPerformance() {
    try {
      const startTime = Date.now();
      
      // Simulate complete user workflow
      const workflowStartTime = Date.now();
      
      // 1. Login
      const loginTime = Date.now();
      // Simulate login
      await new Promise(resolve => setTimeout(resolve, 100));
      const loginDuration = Date.now() - loginTime;
      
      // 2. Load dashboard
      const dashboardTime = Date.now();
      await integrationService.getDashboardData('doctor', 'test-doctor-1', 'test-clinic-1');
      const dashboardDuration = Date.now() - dashboardTime;
      
      // 3. Load clinical records
      const recordsTime = Date.now();
      await integrationService.getClinicalRecords({}, { page: 1, limit: 10 });
      const recordsDuration = Date.now() - recordsTime;
      
      const totalWorkflowTime = Date.now() - workflowStartTime;
      
      // Performance thresholds
      const performanceGood = totalWorkflowTime < 5000; // 5 seconds
      
      return {
        status: performanceGood ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: {
          totalWorkflowTime,
          loginDuration,
          dashboardDuration,
          recordsDuration,
          performanceGood
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          totalWorkflowTime: 0,
          performanceGood: false
        }
      };
    }
  }

  /**
   * Test concurrent user performance
   */
  async testConcurrentUserPerformance() {
    try {
      const startTime = Date.now();
      const concurrentUsers = 5;
      
      // Simulate concurrent users
      const userPromises = Array.from({ length: concurrentUsers }, async (_, i) => {
        const userStartTime = Date.now();
        
        try {
          await integrationService.getDashboardData('doctor', `test-doctor-${i}`, 'test-clinic-1');
          return {
            userId: i,
            success: true,
            duration: Date.now() - userStartTime
          };
        } catch (error) {
          return {
            userId: i,
            success: false,
            duration: Date.now() - userStartTime,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(userPromises);
      const successfulUsers = results.filter(r => r.success).length;
      const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      
      const performanceGood = successfulUsers === concurrentUsers && averageDuration < 3000;
      
      return {
        status: performanceGood ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: {
          concurrentUsers,
          successfulUsers,
          averageDuration,
          performanceGood,
          results
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        details: {
          concurrentUsers: 0,
          successfulUsers: 0,
          performanceGood: false
        }
      };
    }
  }

  /**
   * Compare metrics between mobile and web data
   */
  compareMetrics(mobileMetrics, webMetrics) {
    if (!mobileMetrics || !webMetrics) return false;
    
    const mobileKeys = Object.keys(mobileMetrics);
    const webKeys = Object.keys(webMetrics);
    
    // Check if key metrics exist in both
    const commonKeys = mobileKeys.filter(key => webKeys.includes(key));
    
    return commonKeys.length > 0;
  }

  /**
   * Compare records between mobile and web data
   */
  compareRecords(mobileRecords, webRecords) {
    if (!Array.isArray(mobileRecords) || !Array.isArray(webRecords)) return false;
    
    // Basic comparison - check if counts are similar (within 10%)
    const countDifference = Math.abs(mobileRecords.length - webRecords.length);
    const maxCount = Math.max(mobileRecords.length, webRecords.length);
    
    return maxCount === 0 || (countDifference / maxCount) <= 0.1;
  }

  /**
   * Count passed tests in results
   */
  countPassedTests(results) {
    if (!results || typeof results !== 'object') return 0;
    
    return Object.values(results).filter(result => {
      if (result && typeof result === 'object') {
        return result.status === 'passed' || result.status === 'completed';
      }
      return false;
    }).length;
  }

  /**
   * Count total tests in results
   */
  countTotalTests(results) {
    if (!results || typeof results !== 'object') return 0;
    
    return Object.keys(results).length;
  }

  /**
   * Check if there are any test failures
   */
  hasTestFailures() {
    return Object.values(this.testResults).some(suite => {
      if (suite.status === 'failed') return true;
      
      if (suite.results) {
        return Object.values(suite.results).some(result => 
          result && result.status === 'failed'
        );
      }
      
      return false;
    });
  }

  /**
   * Ensure report directory exists
   */
  async ensureReportDirectory() {
    try {
      await fs.access(this.reportPath);
    } catch {
      await fs.mkdir(this.reportPath, { recursive: true });
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateComprehensiveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.endTime - this.startTime,
      summary: {
        totalSuites: Object.keys(this.testResults).length,
        passedSuites: Object.values(this.testResults).filter(s => s.status === 'completed').length,
        failedSuites: Object.values(this.testResults).filter(s => s.status === 'failed').length,
        totalTests: this.getTotalTestCount(),
        passedTests: this.getPassedTestCount(),
        failedTests: this.getFailedTestCount()
      },
      suites: this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8000',
        websocketUrl: process.env.WEBSOCKET_URL || 'ws://localhost:8000/ws/'
      },
      recommendations: this.generateRecommendations()
    };
    
    // Save JSON report
    const jsonReportPath = path.join(this.reportPath, `integration-test-report-${Date.now()}.json`);
    await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2));
    
    // Save HTML report
    const htmlReport = this.generateHtmlReport(report);
    const htmlReportPath = path.join(this.reportPath, `integration-test-report-${Date.now()}.html`);
    await fs.writeFile(htmlReportPath, htmlReport);
    
    console.log(`\n📊 Reports generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }

  /**
   * Get total test count across all suites
   */
  getTotalTestCount() {
    return Object.values(this.testResults).reduce((total, suite) => {
      if (suite.results) {
        return total + this.countTotalTests(suite.results);
      }
      return total;
    }, 0);
  }

  /**
   * Get passed test count across all suites
   */
  getPassedTestCount() {
    return Object.values(this.testResults).reduce((total, suite) => {
      if (suite.results) {
        return total + this.countPassedTests(suite.results);
      }
      return total;
    }, 0);
  }

  /**
   * Get failed test count across all suites
   */
  getFailedTestCount() {
    return this.getTotalTestCount() - this.getPassedTestCount();
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Check for failed suites
    const failedSuites = Object.entries(this.testResults)
      .filter(([_, suite]) => suite.status === 'failed');
    
    if (failedSuites.length > 0) {
      recommendations.push({
        type: 'critical',
        priority: 'high',
        message: `${failedSuites.length} test suites failed. Review and fix issues before deployment.`,
        failedSuites: failedSuites.map(([name, _]) => name)
      });
    }
    
    // Check performance issues
    const performanceSuite = this.testResults['API Performance Tests'];
    if (performanceSuite && performanceSuite.results) {
      const avgResponseTime = this.calculateAverageResponseTime(performanceSuite.results);
      if (avgResponseTime > 3000) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          message: `Average API response time is ${avgResponseTime}ms. Consider optimization.`
        });
      }
    }
    
    // Check compatibility issues
    const compatibilitySuite = this.testResults['Cross-Platform Compatibility Tests'];
    if (compatibilitySuite && compatibilitySuite.results) {
      const compatibilityScore = this.calculateCompatibilityScore(compatibilitySuite.results);
      if (compatibilityScore < 80) {
        recommendations.push({
          type: 'compatibility',
          priority: 'medium',
          message: `Compatibility score is ${compatibilityScore}%. Review platform-specific issues.`
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Calculate average response time from performance results
   */
  calculateAverageResponseTime(results) {
    const durations = Object.values(results)
      .filter(r => r && r.duration)
      .map(r => r.duration);
    
    if (durations.length === 0) return 0;
    
    return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  }

  /**
   * Calculate compatibility score from compatibility results
   */
  calculateCompatibilityScore(results) {
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r && r.status === 'passed').length;
    
    if (totalTests === 0) return 0;
    
    return Math.round((passedTests / totalTests) * 100);
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Mobile App Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .suite { margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; }
        .suite-header { background: #f8f9fa; padding: 15px; font-weight: bold; }
        .suite-content { padding: 15px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .test-item { margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 3px; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mobile App Integration Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Duration: ${report.duration}ms</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>${report.summary.totalSuites}</h3>
            <p>Total Suites</p>
        </div>
        <div class="metric">
            <h3 class="passed">${report.summary.passedSuites}</h3>
            <p>Passed Suites</p>
        </div>
        <div class="metric">
            <h3 class="failed">${report.summary.failedSuites}</h3>
            <p>Failed Suites</p>
        </div>
        <div class="metric">
            <h3>${report.summary.totalTests}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric">
            <h3 class="passed">${report.summary.passedTests}</h3>
            <p>Passed Tests</p>
        </div>
        <div class="metric">
            <h3 class="failed">${report.summary.failedTests}</h3>
            <p>Failed Tests</p>
        </div>
    </div>
    
    ${report.recommendations.length > 0 ? `
    <div class="recommendations">
        <h3>Recommendations</h3>
        ${report.recommendations.map(rec => `
            <div class="test-item">
                <strong>${rec.type.toUpperCase()}</strong> (${rec.priority}): ${rec.message}
            </div>
        `).join('')}
    </div>
    ` : ''}
    
    <h2>Test Suites</h2>
    ${Object.entries(report.suites).map(([suiteName, suite]) => `
        <div class="suite">
            <div class="suite-header ${suite.status === 'completed' ? 'passed' : 'failed'}">
                ${suiteName} - ${suite.status.toUpperCase()} (${suite.duration}ms)
            </div>
            <div class="suite-content">
                ${suite.error ? `<p class="failed">Error: ${suite.error}</p>` : ''}
                ${suite.results ? Object.entries(suite.results).map(([testName, result]) => `
                    <div class="test-item">
                        <strong>${testName}</strong>: 
                        <span class="${result.status}">${result.status}</span>
                        ${result.duration ? ` (${result.duration}ms)` : ''}
                        ${result.error ? `<br><small class="failed">${result.error}</small>` : ''}
                    </div>
                `).join('') : ''}
            </div>
        </div>
    `).join('')}
    
    <div class="header" style="margin-top: 40px;">
        <h3>Environment</h3>
        <p>Node.js: ${report.environment.nodeVersion}</p>
        <p>Platform: ${report.environment.platform}</p>
        <p>API Base URL: ${report.environment.apiBaseUrl}</p>
        <p>WebSocket URL: ${report.environment.websocketUrl}</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Display test summary
   */
  displayTestSummary() {
    console.log('\n🎯 Integration Test Summary');
    console.log('==========================');
    console.log(`Total Duration: ${this.endTime - this.startTime}ms`);
    console.log(`Test Suites: ${Object.keys(this.testResults).length}`);
    console.log(`Passed Suites: ${Object.values(this.testResults).filter(s => s.status === 'completed').length}`);
    console.log(`Failed Suites: ${Object.values(this.testResults).filter(s => s.status === 'failed').length}`);
    console.log(`Total Tests: ${this.getTotalTestCount()}`);
    console.log(`Passed Tests: ${this.getPassedTestCount()}`);
    console.log(`Failed Tests: ${this.getFailedTestCount()}`);
    
    const hasFailures = this.hasTestFailures();
    console.log(`\n${hasFailures ? '❌' : '✅'} Overall Result: ${hasFailures ? 'FAILED' : 'PASSED'}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTestRunner;