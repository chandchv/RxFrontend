import auditLogService from '../../services/auditLogService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dataEncryptionService from '../../services/dataEncryptionService';
import permissionService from '../../services/permissionService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '14.0'
  }
}));
jest.mock('../../services/dataEncryptionService');
jest.mock('../../services/permissionService');

describe('AuditLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset service state
    auditLogService.logQueue = [];
    auditLogService.isOnline = true;
    auditLogService.syncTimer = null;
    
    // Mock permission service
    permissionService.getUserId = jest.fn().mockReturnValue('user_123');
    permissionService.getUserRole = jest.fn().mockReturnValue('doctor');
    permissionService.getTenantId = jest.fn().mockReturnValue('clinic_123');
    permissionService.isAdmin = jest.fn().mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialize', () => {
    it('should initialize audit log service successfully', async () => {
      AsyncStorage.getItem.mockResolvedValue('[]');

      const result = await auditLogService.initialize();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('audit_log_queue');
    });

    it('should load existing queued logs', async () => {
      const existingLogs = [
        { id: '1', action: 'test_action', timestamp: new Date().toISOString() }
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingLogs));

      await auditLogService.initialize();

      expect(auditLogService.logQueue).toEqual(existingLogs);
    });

    it('should handle initialization errors', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await auditLogService.initialize();

      expect(result).toBe(false);
      expect(auditLogService.logQueue).toEqual([]);
    });
  });

  describe('logAction', () => {
    beforeEach(() => {
      AsyncStorage.setItem.mockResolvedValue();
      dataEncryptionService.encryptSensitiveData.mockResolvedValue('encrypted_data');
    });

    it('should log action successfully', async () => {
      const action = 'view_patient_data';
      const details = { patientId: 'patient_123' };

      const result = await auditLogService.logAction(action, details, 'patient', 'patient_123');

      expect(result).toBe(true);
      expect(auditLogService.logQueue).toHaveLength(1);
      
      const logEntry = auditLogService.logQueue[0];
      expect(logEntry.action).toBe(action);
      expect(logEntry.resourceType).toBe('patient');
      expect(logEntry.resourceId).toBe('patient_123');
      expect(logEntry.userId).toBe('user_123');
      expect(logEntry.userRole).toBe('doctor');
      expect(logEntry.tenantId).toBe('clinic_123');
      expect(logEntry.platform).toBe('ios');
      expect(logEntry.isSensitive).toBe(true);
    });

    it('should encrypt sensitive log entries', async () => {
      const action = 'view_patient_data';
      const details = { patientId: 'patient_123', medicalData: 'sensitive_info' };

      await auditLogService.logAction(action, details, 'patient', 'patient_123');

      expect(dataEncryptionService.encryptSensitiveData).toHaveBeenCalledWith(
        details,
        'audit_log'
      );
    });

    it('should handle non-sensitive actions without encryption', async () => {
      const action = 'login';
      const details = { timestamp: new Date().toISOString() };

      await auditLogService.logAction(action, details);

      expect(dataEncryptionService.encryptSensitiveData).not.toHaveBeenCalled();
      
      const logEntry = auditLogService.logQueue[0];
      expect(logEntry.isSensitive).toBe(false);
    });

    it('should handle logging errors gracefully', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const result = await auditLogService.logAction('test_action', {});

      expect(result).toBe(false);
    });
  });

  describe('logAuthentication', () => {
    it('should log authentication events', async () => {
      const event = 'login_success';
      const details = { 
        biometricUsed: true,
        authMethod: 'fingerprint'
      };

      const result = await auditLogService.logAuthentication(event, details);

      expect(result).toBe(true);
      
      const logEntry = auditLogService.logQueue[0];
      expect(logEntry.action).toBe('authentication');
      expect(logEntry.details.event).toBe(event);
      expect(logEntry.details.biometricUsed).toBe(true);
      expect(logEntry.details.authMethod).toBe('fingerprint');
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events', async () => {
      const eventType = 'unauthorized_access_attempt';
      const details = { 
        attemptedResource: 'patient_data',
        ipAddress: '192.168.1.1'
      };

      const result = await auditLogService.logSecurityEvent(eventType, details);

      expect(result).toBe(true);
      
      const logEntry = auditLogService.logQueue[0];
      expect(logEntry.action).toBe('security_event');
      expect(logEntry.details.eventType).toBe(eventType);
      expect(logEntry.isSensitive).toBe(true);
    });
  });

  describe('syncLogs', () => {
    beforeEach(() => {
      auditLogService.sendLogsToBackend = jest.fn();
      auditLogService.logQueue = [
        { id: '1', action: 'test_action' },
        { id: '2', action: 'test_action_2' }
      ];
    });

    it('should sync logs successfully', async () => {
      auditLogService.sendLogsToBackend.mockResolvedValue({ success: true });

      const result = await auditLogService.syncLogs();

      expect(result).toBe(true);
      expect(auditLogService.logQueue).toHaveLength(0);
    });

    it('should handle sync failures', async () => {
      auditLogService.sendLogsToBackend.mockResolvedValue({ 
        success: false, 
        error: 'Network error' 
      });

      const result = await auditLogService.syncLogs();

      expect(result).toBe(false);
      expect(auditLogService.logQueue).toHaveLength(2);
    });
  });

  describe('getLogStatistics', () => {
    beforeEach(() => {
      auditLogService.logQueue = [
        {
          id: '1',
          action: 'view_patient',
          timestamp: '2024-01-01T10:00:00Z',
          userId: 'user_123',
          isSensitive: true
        },
        {
          id: '2',
          action: 'create_record',
          timestamp: '2024-01-01T11:00:00Z',
          userId: 'user_456',
          isSensitive: false
        }
      ];
    });

    it('should return log statistics', async () => {
      const stats = await auditLogService.getLogStatistics();

      expect(stats.queuedLogs).toBe(2);
      expect(stats.sensitiveLogsQueued).toBe(1);
      expect(stats.oldestLogTimestamp).toBe('2024-01-01T10:00:00Z');
      expect(stats.newestLogTimestamp).toBe('2024-01-01T11:00:00Z');
      expect(stats.isOnline).toBe(true);
    });
  });

  describe('clearAllLogs', () => {
    beforeEach(() => {
      auditLogService.logQueue = [
        { id: '1', action: 'test_action' },
        { id: '2', action: 'test_action_2' }
      ];
    });

    it('should clear all logs for admin users', async () => {
      permissionService.isAdmin = jest.fn().mockReturnValue(true);
      AsyncStorage.removeItem.mockResolvedValue();

      const result = await auditLogService.clearAllLogs();

      expect(result).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('audit_log_queue');
    });

    it('should deny clearing for non-admin users', async () => {
      permissionService.isAdmin = jest.fn().mockReturnValue(false);

      const result = await auditLogService.clearAllLogs();

      expect(result).toBe(false);
      expect(auditLogService.logQueue).toHaveLength(2);
    });
  });

  describe('setOnlineStatus', () => {
    it('should update online status', () => {
      auditLogService.setOnlineStatus(false);
      expect(auditLogService.isOnline).toBe(false);

      auditLogService.setOnlineStatus(true);
      expect(auditLogService.isOnline).toBe(true);
    });
  });
});impo
rt auditLogService from '../../services/auditLogService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dataEncryptionService from '../../services/dataEncryptionService';
import permissionService from '../../services/permissionService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '14.0'
  }
}));
jest.mock('../../services/dataEncryptionService');
jest.mock('../../services/permissionService');

describe('AuditLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset service state
    auditLogService.logQueue = [];
    auditLogService.isOnline = true;
    auditLogService.syncTimer = null;
    
    // Mock permission service
    permissionService.getUserId = jest.fn().mockReturnValue('user_123');
    permissionService.getUserRole = jest.fn().mockReturnValue('doctor');
    permissionService.getTenantId = jest.fn().mockReturnValue('clinic_123');
    permissionService.isAdmin = jest.fn().mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialize', () => {
    it('should initialize audit log service successfully', async () => {
      AsyncStorage.getItem.mockResolvedValue('[]');

      const result = await auditLogService.initialize();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('audit_log_queue');
    });

    it('should load existing queued logs', async () => {
      const existingLogs = [
        { id: '1', action: 'test_action', timestamp: new Date().toISOString() }
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingLogs));

      await auditLogService.initialize();

      expect(auditLogService.logQueue).toEqual(existingLogs);
    });

    it('should handle initialization errors', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await auditLogService.initialize();

      expect(result).toBe(false);
      expect(auditLogService.logQueue).toEqual([]);
    });
  });

  describe('logAction', () => {
    beforeEach(() => {
      AsyncStorage.setItem.mockResolvedValue();
      dataEncryptionService.encryptSensitiveData.mockResolvedValue('encrypted_data');
    });

    it('should log action successfully', async () => {
      const action = 'view_patient_data';
      const details = { patientId: 'patient_123' };

      const result = await auditLogService.logAction(action, details, 'patient', 'patient_123');

      expect(result).toBe(true);
      expect(auditLogService.logQueue).toHaveLength(1);
      
      const logEntry = auditLogService.logQueue[0];
      expect(logEntry.action).toBe(action);
      expect(logEntry.resourceType).toBe('patient');
      expect(logEntry.resourceId).toBe('patient_123');
      expect(logEntry.userId).toBe('user_123');
      expect(logEntry.userRole).toBe('doctor');
      expect(logEntry.tenantId).toBe('clinic_123');
      expect(logEntry.platform).toBe('ios');
      expect(logEntry.isSensitive).toBe(true);
    });

    it('should encrypt sensitive log entries', async () => {
      const action = 'view_patient_data';
      const details = { patientId: 'patient_123', medicalData: 'sensitive_info' };

      await auditLogService.logAction(action, details, 'patient', 'patient_123');

      expect(dataEncryptionService.encryptSensitiveData).toHaveBeenCalledWith(
        details,
        'audit_log'
      );
    });

    it('should handle non-sensitive actions without encryption', async () => {
      const action = 'login';
      const details = { timestamp: new Date().toISOString() };

      await auditLogService.logAction(action, details);

      expect(dataEncryptionService.encryptSensitiveData).not.toHaveBeenCalled();
      
      const logEntry = auditLogService.logQueue[0];
      expect(logEntry.isSensitive).toBe(false);
    });

    it('should handle logging errors gracefully', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const result = await auditLogService.logAction('test_action', {});

      expect(result).toBe(false);
    });
  });

  describe('logAuthentication', () => {
    it('should log authentication events', async () => {
      const event = 'login_success';
      const details = { 
        biometricUsed: true,
        authMethod: 'fingerprint'
      };

      const result = await auditLogService.logAuthentication(event, details);

      expect(result).toBe(true);
      
      const logEntry = auditLogService.logQueue[0];
      expect(logEntry.action).toBe('authentication');
      expect(logEntry.details.event).toBe(event);
      expect(logEntry.details.biometricUsed).toBe(true);
      expect(logEntry.details.authMethod).toBe('fingerprint');
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events', async () => {
      const eventType = 'unauthorized_access_attempt';
      const details = { 
        attemptedResource: 'patient_data',
        ipAddress: '192.168.1.1'
      };

      const result = await auditLogService.logSecurityEvent(eventType, details);

      expect(result).toBe(true);
      
      const logEntry = auditLogService.logQueue[0];
      expect(logEntry.action).toBe('security_event');
      expect(logEntry.details.eventType).toBe(eventType);
      expect(logEntry.isSensitive).toBe(true);
    });
  });

  describe('syncLogs', () => {
    beforeEach(() => {
      auditLogService.sendLogsToBackend = jest.fn();
      auditLogService.logQueue = [
        { id: '1', action: 'test_action' },
        { id: '2', action: 'test_action_2' }
      ];
    });

    it('should sync logs successfully', async () => {
      auditLogService.sendLogsToBackend.mockResolvedValue({ success: true });

      const result = await auditLogService.syncLogs();

      expect(result).toBe(true);
      expect(auditLogService.logQueue).toHaveLength(0);
    });

    it('should handle sync failures', async () => {
      auditLogService.sendLogsToBackend.mockResolvedValue({ 
        success: false, 
        error: 'Network error' 
      });

      const result = await auditLogService.syncLogs();

      expect(result).toBe(false);
      expect(auditLogService.logQueue).toHaveLength(2);
    });
  });

  describe('getLogStatistics', () => {
    beforeEach(() => {
      auditLogService.logQueue = [
        {
          id: '1',
          action: 'view_patient',
          timestamp: '2024-01-01T10:00:00Z',
          userId: 'user_123',
          isSensitive: true
        },
        {
          id: '2',
          action: 'create_record',
          timestamp: '2024-01-01T11:00:00Z',
          userId: 'user_456',
          isSensitive: false
        }
      ];
    });

    it('should return log statistics', async () => {
      const stats = await auditLogService.getLogStatistics();

      expect(stats.queuedLogs).toBe(2);
      expect(stats.sensitiveLogsQueued).toBe(1);
      expect(stats.oldestLogTimestamp).toBe('2024-01-01T10:00:00Z');
      expect(stats.newestLogTimestamp).toBe('2024-01-01T11:00:00Z');
      expect(stats.isOnline).toBe(true);
    });
  });

  describe('clearAllLogs', () => {
    beforeEach(() => {
      auditLogService.logQueue = [
        { id: '1', action: 'test_action' },
        { id: '2', action: 'test_action_2' }
      ];
    });

    it('should clear all logs for admin users', async () => {
      permissionService.isAdmin = jest.fn().mockReturnValue(true);
      AsyncStorage.removeItem.mockResolvedValue();

      const result = await auditLogService.clearAllLogs();

      expect(result).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('audit_log_queue');
    });

    it('should deny clearing for non-admin users', async () => {
      permissionService.isAdmin = jest.fn().mockReturnValue(false);

      const result = await auditLogService.clearAllLogs();

      expect(result).toBe(false);
      expect(auditLogService.logQueue).toHaveLength(2);
    });
  });

  describe('setOnlineStatus', () => {
    it('should update online status', () => {
      auditLogService.setOnlineStatus(false);
      expect(auditLogService.isOnline).toBe(false);

      auditLogService.setOnlineStatus(true);
      expect(auditLogService.isOnline).toBe(true);
    });
  });
});