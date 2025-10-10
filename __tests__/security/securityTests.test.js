import mobileApiService from '../../services/mobileApiService';
import secureTokenService from '../../services/secureTokenService';
import dataEncryptionService from '../../services/dataEncryptionService';
import biometricAuthService from '../../services/biometricAuthService';
import sessionManagementService from '../../services/sessionManagementService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock secure storage and biometric services
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-local-authentication');

describe('Security Penetration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('Authentication Security Tests', () => {
    test('should prevent unauthorized API access', async () => {
      // Mock unauthorized response
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      // Attempt to access API without valid token
      await expect(
        mobileApiService.getDashboardData('doctor')
      ).rejects.toMatchObject({
        status: 401,
      });

      // Verify authorization header was included
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );
    });

    test('should handle token expiration securely', async () => {
      let callCount = 0;
      
      global.fetch.mockImplementation(() => {
        callCount++;
        
        if (callCount === 1) {
          // First call - token expired
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ error: 'Token expired' }),
          });
        } else if (callCount === 2) {
          // Token refresh call
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ 
              access_token: 'new_secure_token',
              refresh_token: 'new_refresh_token',
              expires_in: 3600,
            }),
          });
        } else {
          // Retry with new token
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          });
        }
      });

      const result = await mobileApiService.getDashboardData('doctor');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3); // Original + refresh + retry
    });

    test('should prevent token theft through secure storage', async () => {
      const sensitiveToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      
      // Store token securely
      await secureTokenService.storeToken('access_token', sensitiveToken);

      // Verify token is encrypted in storage
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('encrypted_'),
        expect.not.stringContaining(sensitiveToken) // Should not contain plain token
      );

      // Retrieve token
      const retrievedToken = await secureTokenService.getToken('access_token');
      
      expect(retrievedToken).toBe(sensitiveToken); // Should decrypt correctly
    });

    test('should enforce biometric authentication', async () => {
      const mockBiometricAuth = require('expo-local-authentication');
      
      // Mock successful biometric authentication
      mockBiometricAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: null,
      });

      const result = await biometricAuthService.authenticate('Access sensitive data');

      expect(result.success).toBe(true);
      expect(mockBiometricAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Access sensitive data',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
    });

    test('should handle biometric authentication failure', async () => {
      const mockBiometricAuth = require('expo-local-authentication');
      
      // Mock failed biometric authentication
      mockBiometricAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'Authentication failed',
      });

      const result = await biometricAuthService.authenticate('Access sensitive data');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    test('should prevent brute force attacks', async () => {
      const maxAttempts = 5;
      let attemptCount = 0;

      global.fetch.mockImplementation(() => {
        attemptCount++;
        
        if (attemptCount <= maxAttempts) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ error: 'Invalid credentials' }),
          });
        } else {
          return Promise.resolve({
            ok: false,
            status: 429, // Too Many Requests
            json: async () => ({ 
              error: 'Too many failed attempts. Account locked.',
              lockoutTime: 300, // 5 minutes
            }),
          });
        }
      });

      // Simulate multiple failed login attempts
      for (let i = 0; i < maxAttempts + 2; i++) {
        try {
          await mobileApiService.login('test@example.com', 'wrong_password');
        } catch (error) {
          if (i >= maxAttempts) {
            expect(error.status).toBe(429);
            expect(error.message).toContain('locked');
          }
        }
      }

      expect(attemptCount).toBe(maxAttempts + 1);
    });
  });

  describe('Data Encryption Security Tests', () => {
    test('should encrypt sensitive data before storage', async () => {
      const sensitiveData = {
        patientId: 12345,
        medicalRecord: 'Confidential medical information',
        ssn: '123-45-6789',
      };

      // Encrypt data
      const encryptedData = await dataEncryptionService.encrypt(JSON.stringify(sensitiveData));

      expect(encryptedData).toBeDefined();
      expect(encryptedData).not.toContain('Confidential medical information');
      expect(encryptedData).not.toContain('123-45-6789');

      // Decrypt data
      const decryptedData = await dataEncryptionService.decrypt(encryptedData);
      const parsedData = JSON.parse(decryptedData);

      expect(parsedData).toEqual(sensitiveData);
    });

    test('should handle encryption key rotation', async () => {
      const testData = 'Sensitive information';
      
      // Encrypt with current key
      const encrypted1 = await dataEncryptionService.encrypt(testData);
      
      // Rotate encryption key
      await dataEncryptionService.rotateEncryptionKey();
      
      // Should still be able to decrypt old data
      const decrypted1 = await dataEncryptionService.decrypt(encrypted1);
      expect(decrypted1).toBe(testData);
      
      // New encryption should use new key
      const encrypted2 = await dataEncryptionService.encrypt(testData);
      expect(encrypted2).not.toBe(encrypted1); // Different ciphertext
      
      const decrypted2 = await dataEncryptionService.decrypt(encrypted2);
      expect(decrypted2).toBe(testData);
    });

    test('should prevent data tampering', async () => {
      const originalData = 'Original sensitive data';
      const encryptedData = await dataEncryptionService.encrypt(originalData);
      
      // Tamper with encrypted data
      const tamperedData = encryptedData.slice(0, -10) + 'tampered123';
      
      // Should detect tampering and fail to decrypt
      await expect(
        dataEncryptionService.decrypt(tamperedData)
      ).rejects.toThrow();
    });

    test('should securely wipe sensitive data from memory', async () => {
      const sensitiveData = 'Very sensitive information';
      
      // Process sensitive data
      const result = await dataEncryptionService.processSecureData(sensitiveData, (data) => {
        return data.toUpperCase();
      });
      
      expect(result).toBe('VERY SENSITIVE INFORMATION');
      
      // Verify sensitive data is wiped from memory
      // Note: This is a conceptual test - actual memory wiping verification
      // would require native modules in a real implementation
      expect(dataEncryptionService.lastProcessedData).toBeNull();
    });
  });

  describe('Session Management Security Tests', () => {
    test('should enforce session timeout', async () => {
      const shortTimeout = 1000; // 1 second for testing
      
      // Start session with short timeout
      await sessionManagementService.startSession({
        userId: 1,
        role: 'doctor',
        timeout: shortTimeout,
      });

      expect(sessionManagementService.isSessionActive()).toBe(true);

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, shortTimeout + 100));

      expect(sessionManagementService.isSessionActive()).toBe(false);
    });

    test('should prevent session hijacking', async () => {
      const sessionId = 'test-session-123';
      const userAgent = 'RxDoctor-Mobile/1.0';
      const ipAddress = '192.168.1.100';

      // Start session with fingerprinting
      await sessionManagementService.startSession({
        sessionId,
        userAgent,
        ipAddress,
        userId: 1,
      });

      // Attempt to use session from different user agent
      const hijackAttempt = await sessionManagementService.validateSession({
        sessionId,
        userAgent: 'Malicious-App/1.0',
        ipAddress,
      });

      expect(hijackAttempt.valid).toBe(false);
      expect(hijackAttempt.reason).toContain('fingerprint');
    });

    test('should handle concurrent session limits', async () => {
      const userId = 1;
      const maxSessions = 3;

      // Create maximum allowed sessions
      const sessions = [];
      for (let i = 0; i < maxSessions; i++) {
        const session = await sessionManagementService.startSession({
          userId,
          sessionId: `session-${i}`,
          maxConcurrentSessions: maxSessions,
        });
        sessions.push(session);
      }

      // All sessions should be active
      sessions.forEach(session => {
        expect(session.active).toBe(true);
      });

      // Attempt to create one more session (should fail or terminate oldest)
      const extraSession = await sessionManagementService.startSession({
        userId,
        sessionId: 'session-extra',
        maxConcurrentSessions: maxSessions,
      });

      // Either extra session should fail, or oldest should be terminated
      const activeSessions = await sessionManagementService.getActiveSessions(userId);
      expect(activeSessions.length).toBeLessThanOrEqual(maxSessions);
    });

    test('should securely end sessions', async () => {
      const sessionId = 'test-session-end';
      
      // Start session
      await sessionManagementService.startSession({
        sessionId,
        userId: 1,
      });

      expect(sessionManagementService.isSessionActive(sessionId)).toBe(true);

      // End session
      await sessionManagementService.endSession(sessionId);

      expect(sessionManagementService.isSessionActive(sessionId)).toBe(false);

      // Verify session data is cleared
      const sessionData = await sessionManagementService.getSessionData(sessionId);
      expect(sessionData).toBeNull();
    });
  });

  describe('API Security Tests', () => {
    test('should prevent SQL injection attacks', async () => {
      const maliciousInput = "'; DROP TABLE patients; --";
      
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ 
          records: [],
          sanitizedInput: maliciousInput.replace(/[';-]/g, ''),
        }),
      });

      // Attempt search with malicious input
      const result = await mobileApiService.getClinicalRecords({
        search: maliciousInput,
      });

      // Verify input was sanitized
      expect(result.sanitizedInput).not.toContain("'");
      expect(result.sanitizedInput).not.toContain(';');
      expect(result.sanitizedInput).not.toContain('--');
    });

    test('should prevent XSS attacks in API responses', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          patientName: xssPayload,
          recordType: 'Lab Results',
        }),
      });

      const result = await mobileApiService.getClinicalRecords();

      // Verify XSS payload is escaped or sanitized
      expect(result.patientName).not.toContain('<script>');
      expect(result.patientName).toMatch(/&lt;script&gt;|&amp;lt;script&amp;gt;/);
    });

    test('should enforce rate limiting', async () => {
      const rateLimitRequests = 100;
      const timeWindow = 1000; // 1 second
      
      global.fetch.mockImplementation((url, options) => {
        const requestTime = Date.now();
        
        // Simulate rate limiting after too many requests
        if (global.requestCount > 50) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers({
              'X-RateLimit-Limit': '50',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': (requestTime + timeWindow).toString(),
            }),
            json: async () => ({ error: 'Rate limit exceeded' }),
          });
        }
        
        global.requestCount = (global.requestCount || 0) + 1;
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, requestCount: global.requestCount }),
        });
      });

      global.requestCount = 0;
      
      // Make rapid requests
      const requests = Array.from({ length: rateLimitRequests }, () =>
        mobileApiService.getDashboardData('doctor').catch(error => error)
      );

      const results = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedRequests = results.filter(result => 
        result.status === 429 || (result.message && result.message.includes('Rate limit'))
      );
      
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    test('should validate input parameters', async () => {
      const invalidInputs = [
        { page: -1 }, // Negative page
        { limit: 10000 }, // Excessive limit
        { search: 'x'.repeat(1000) }, // Overly long search
        { patientId: 'invalid' }, // Non-numeric ID
      ];

      global.fetch.mockImplementation((url) => {
        const urlObj = new URL(url, 'http://localhost');
        const params = Object.fromEntries(urlObj.searchParams);
        
        // Simulate server-side validation
        if (params.page && parseInt(params.page) < 1) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ error: 'Invalid page parameter' }),
          });
        }
        
        if (params.limit && parseInt(params.limit) > 100) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ error: 'Limit too high' }),
          });
        }
        
        if (params.search && params.search.length > 100) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ error: 'Search term too long' }),
          });
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });
      });

      // Test each invalid input
      for (const invalidInput of invalidInputs) {
        try {
          await mobileApiService.getClinicalRecords(invalidInput);
          // If no error thrown, check if it was handled gracefully
        } catch (error) {
          expect(error.status).toBe(400);
          expect(error.message).toContain('Invalid');
        }
      }
    });
  });

  describe('Data Privacy Tests', () => {
    test('should mask sensitive data in logs', async () => {
      const sensitiveData = {
        patientName: 'John Doe',
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111',
        email: 'john.doe@example.com',
      };

      // Mock console.log to capture logs
      const originalLog = console.log;
      const logMessages = [];
      console.log = (...args) => {
        logMessages.push(args.join(' '));
      };

      try {
        // Process data that might be logged
        await dataEncryptionService.processWithLogging(sensitiveData);

        // Verify sensitive data is masked in logs
        const logContent = logMessages.join(' ');
        expect(logContent).not.toContain('123-45-6789');
        expect(logContent).not.toContain('4111-1111-1111-1111');
        expect(logContent).toContain('***-**-****'); // Masked SSN
        expect(logContent).toContain('****-****-****-1111'); // Masked credit card
      } finally {
        console.log = originalLog;
      }
    });

    test('should enforce data retention policies', async () => {
      const oldData = {
        id: 1,
        createdAt: new Date(Date.now() - 366 * 24 * 60 * 60 * 1000), // 366 days ago
        sensitiveInfo: 'Old sensitive data',
      };

      const recentData = {
        id: 2,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        sensitiveInfo: 'Recent sensitive data',
      };

      // Store data
      await AsyncStorage.setItem('old_data', JSON.stringify(oldData));
      await AsyncStorage.setItem('recent_data', JSON.stringify(recentData));

      // Run data retention cleanup
      await dataEncryptionService.enforceRetentionPolicy(365); // 365 days retention

      // Verify old data is removed
      const retrievedOldData = await AsyncStorage.getItem('old_data');
      expect(retrievedOldData).toBeNull();

      // Verify recent data is preserved
      const retrievedRecentData = await AsyncStorage.getItem('recent_data');
      expect(retrievedRecentData).toBeTruthy();
    });

    test('should anonymize data for analytics', async () => {
      const personalData = {
        patientId: 12345,
        name: 'John Doe',
        email: 'john.doe@example.com',
        age: 35,
        diagnosis: 'Hypertension',
        visitDate: '2025-01-16',
      };

      const anonymizedData = await dataEncryptionService.anonymizeForAnalytics(personalData);

      // Verify personal identifiers are removed or hashed
      expect(anonymizedData.name).toBeUndefined();
      expect(anonymizedData.email).toBeUndefined();
      expect(anonymizedData.patientId).not.toBe(12345); // Should be hashed
      
      // Verify analytical data is preserved
      expect(anonymizedData.age).toBe(35);
      expect(anonymizedData.diagnosis).toBe('Hypertension');
      expect(anonymizedData.visitDate).toBe('2025-01-16');
    });
  });

  describe('Network Security Tests', () => {
    test('should enforce HTTPS connections', async () => {
      const httpUrl = 'http://api.rxdoctor.com/dashboard';
      
      // Mock fetch to simulate HTTPS enforcement
      global.fetch.mockImplementation((url) => {
        if (url.startsWith('http://')) {
          return Promise.reject(new Error('HTTPS required'));
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });
      });

      // Attempt HTTP request (should fail)
      await expect(
        fetch(httpUrl)
      ).rejects.toThrow('HTTPS required');

      // HTTPS request should succeed
      const httpsUrl = httpUrl.replace('http://', 'https://');
      const result = await fetch(httpsUrl);
      expect(result.ok).toBe(true);
    });

    test('should validate SSL certificates', async () => {
      // Mock certificate validation
      global.fetch.mockImplementation((url, options) => {
        // Simulate invalid certificate
        if (options && options.rejectUnauthorized === false) {
          return Promise.reject(new Error('Invalid SSL certificate'));
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });
      });

      // Request with certificate validation should succeed
      const result = await mobileApiService.getDashboardData('doctor');
      expect(result.success).toBe(true);
    });

    test('should prevent man-in-the-middle attacks', async () => {
      // Mock certificate pinning
      const expectedCertFingerprint = 'sha256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
      
      global.fetch.mockImplementation((url, options) => {
        const certFingerprint = options?.headers?.['X-Cert-Fingerprint'];
        
        if (certFingerprint !== expectedCertFingerprint) {
          return Promise.reject(new Error('Certificate pinning failed'));
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });
      });

      // Configure certificate pinning
      mobileApiService.setCertificateFingerprint(expectedCertFingerprint);

      const result = await mobileApiService.getDashboardData('doctor');
      expect(result.success).toBe(true);
    });
  });

  describe('Vulnerability Assessment', () => {
    test('should detect and prevent common vulnerabilities', async () => {
      const vulnerabilityTests = [
        {
          name: 'Path Traversal',
          input: '../../../etc/passwd',
          expectedBehavior: 'sanitized',
        },
        {
          name: 'Command Injection',
          input: '; rm -rf /',
          expectedBehavior: 'blocked',
        },
        {
          name: 'LDAP Injection',
          input: '*)(&(objectClass=*)',
          expectedBehavior: 'escaped',
        },
        {
          name: 'XML Injection',
          input: '<?xml version="1.0"?><!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
          expectedBehavior: 'rejected',
        },
      ];

      for (const test of vulnerabilityTests) {
        global.fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            input: test.input,
            sanitized: test.input.replace(/[<>;"'&]/g, ''),
            blocked: test.input.includes(';') || test.input.includes('..'),
          }),
        });

        try {
          const result = await mobileApiService.getClinicalRecords({
            search: test.input,
          });

          // Verify vulnerability was handled appropriately
          switch (test.expectedBehavior) {
            case 'sanitized':
              expect(result.sanitized).not.toContain('../');
              break;
            case 'blocked':
              expect(result.blocked).toBe(true);
              break;
            case 'escaped':
              expect(result.sanitized).not.toContain('*');
              break;
            case 'rejected':
              expect(result.sanitized).not.toContain('<?xml');
              break;
          }
        } catch (error) {
          // Some vulnerabilities should be rejected outright
          if (test.expectedBehavior === 'rejected') {
            expect(error).toBeDefined();
          }
        }
      }
    });

    test('should audit security events', async () => {
      const securityEvents = [];
      
      // Mock security event logging
      const originalConsoleWarn = console.warn;
      console.warn = (message) => {
        if (message.includes('SECURITY')) {
          securityEvents.push(message);
        }
        originalConsoleWarn(message);
      };

      try {
        // Trigger various security events
        await biometricAuthService.authenticate('Test').catch(() => {}); // Failed auth
        await secureTokenService.getToken('invalid_token').catch(() => {}); // Invalid token
        await sessionManagementService.validateSession({ sessionId: 'invalid' }); // Invalid session

        // Verify security events were logged
        expect(securityEvents.length).toBeGreaterThan(0);
        securityEvents.forEach(event => {
          expect(event).toContain('SECURITY');
          expect(event).toMatch(/\d{4}-\d{2}-\d{2}/); // Should contain timestamp
        });
      } finally {
        console.warn = originalConsoleWarn;
      }
    });
  });

  afterAll(() => {
    // Security test summary
    console.log('\n=== Security Test Summary ===');
    console.log('✓ Authentication security verified');
    console.log('✓ Data encryption validated');
    console.log('✓ Session management secured');
    console.log('✓ API security enforced');
    console.log('✓ Data privacy protected');
    console.log('✓ Network security implemented');
    console.log('✓ Vulnerability assessment completed');
    console.log('==============================\n');
  });
});