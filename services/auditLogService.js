import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import dataEncryptionService from './dataEncryptionService';
import permissionService from './permissionService';

class AuditLogService {
  constructor() {
    this.logQueue = [];
    this.maxQueueSize = 100;
    this.syncInterval = 30000; // 30 seconds
    this.syncTimer = null;
    this.isOnline = true;
    this.sensitiveActions = [
      'view_patient_data',
      'edit_patient_data',
      'delete_patient_data',
      'view_clinical_record',
      'create_clinical_record',
      'edit_clinical_record',
      'delete_clinical_record',
      'share_clinical_record',
      'view_prescription',
      'create_prescription',
      'edit_prescription',
      'login',
      'logout',
      'permission_change',
      'data_export',
      'data_import'
    ];
  }

  /**
   * Initialize audit logging service
   */
  async initialize() {
    try {
      // Load queued logs from storage
      await this.loadQueuedLogs();
      
      // Start sync timer
      this.startSyncTimer();
      
      // Log service initialization
      await this.logAction('audit_service_initialized', {
        platform: Platform.OS,
        version: Platform.Version,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error initializing audit log service:', error);
      return false;
    }
  }

  /**
   * Log user action
   */
  async logAction(action, details = {}, resourceType = null, resourceId = null) {
    try {
      const logEntry = {
        id: this.generateLogId(),
        action,
        resourceType,
        resourceId,
        userId: permissionService.getUserId(),
        userRole: permissionService.getUserRole(),
        tenantId: permissionService.getTenantId(),
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        deviceInfo: {
          os: Platform.OS,
          version: Platform.Version
        },
        details: details || {},
        ipAddress: await this.getDeviceIP(),
        sessionId: await this.getSessionId(),
        isSensitive: this.isSensitiveAction(action)
      };

      // Encrypt sensitive log entries
      if (logEntry.isSensitive) {
        logEntry.details = await dataEncryptionService.encryptSensitiveData(
          logEntry.details,
          'audit_log'
        );
      }

      // Add to queue
      this.logQueue.push(logEntry);

      // Maintain queue size
      if (this.logQueue.length > this.maxQueueSize) {
        this.logQueue.shift();
      }

      // Store queue
      await this.storeQueuedLogs();

      // Try immediate sync if online
      if (this.isOnline) {
        await this.syncLogs();
      }

      return true;
    } catch (error) {
      console.error('Error logging action:', error);
      return false;
    }
  }

  /**
   * Log authentication events
   */
  async logAuthentication(event, details = {}) {
    const authDetails = {
      event,
      biometricUsed: details.biometricUsed || false,
      authMethod: details.authMethod || 'password',
      success: details.success || false,
      failureReason: details.failureReason || null,
      ...details
    };

    return await this.logAction('authentication', authDetails);
  }

  /**
   * Log data access events
   */
  async logDataAccess(resourceType, resourceId, action, details = {}) {
    const accessDetails = {
      accessType: action,
      dataClassification: this.classifyData(resourceType),
      recordCount: details.recordCount || 1,
      searchQuery: details.searchQuery || null,
      filters: details.filters || null,
      ...details
    };

    return await this.logAction(
      `${action}_${resourceType}`,
      accessDetails,
      resourceType,
      resourceId
    );
  }

  /**
   * Log permission changes
   */
  async logPermissionChange(targetUserId, oldPermissions, newPermissions, details = {}) {
    const permissionDetails = {
      targetUserId,
      oldPermissions,
      newPermissions,
      changedBy: permissionService.getUserId(),
      changeReason: details.reason || null,
      ...details
    };

    return await this.logAction('permission_change', permissionDetails);
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventType, details = {}) {
    const securityDetails = {
      eventType,
      severity: details.severity || 'medium',
      threatLevel: details.threatLevel || 'low',
      mitigationAction: details.mitigationAction || null,
      ...details
    };

    return await this.logAction('security_event', securityDetails);
  }

  /**
   * Log data sharing events
   */
  async logDataSharing(resourceType, resourceId, shareMethod, recipient, details = {}) {
    const sharingDetails = {
      shareMethod,
      recipient,
      expirationTime: details.expirationTime || null,
      accessLevel: details.accessLevel || 'read',
      shareToken: details.shareToken || null,
      ...details
    };

    return await this.logAction(
      'share_data',
      sharingDetails,
      resourceType,
      resourceId
    );
  }

  /**
   * Log error events
   */
  async logError(error, context = {}) {
    const errorDetails = {
      errorMessage: error.message || 'Unknown error',
      errorStack: error.stack || null,
      errorCode: error.code || null,
      context,
      timestamp: new Date().toISOString()
    };

    return await this.logAction('error', errorDetails);
  }

  /**
   * Sync logs with backend
   */
  async syncLogs() {
    try {
      if (this.logQueue.length === 0) {
        return true;
      }

      // Get logs to sync
      const logsToSync = [...this.logQueue];
      
      // Here you would send logs to your backend API
      // For now, we'll simulate the sync
      const response = await this.sendLogsToBackend(logsToSync);

      if (response.success) {
        // Clear synced logs from queue
        this.logQueue = [];
        await this.storeQueuedLogs();
        
        console.log(`Synced ${logsToSync.length} audit logs`);
        return true;
      } else {
        console.warn('Failed to sync audit logs:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error syncing audit logs:', error);
      return false;
    }
  }

  /**
   * Send logs to backend (placeholder)
   */
  async sendLogsToBackend(logs) {
    try {
      // This would be replaced with actual API call
      // const response = await fetch('/api/audit-logs', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${await secureTokenService.getAccessToken()}`
      //   },
      //   body: JSON.stringify({ logs })
      // });
      
      // For now, simulate success
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Load queued logs from storage
   */
  async loadQueuedLogs() {
    try {
      const storedLogs = await AsyncStorage.getItem('audit_log_queue');
      if (storedLogs) {
        this.logQueue = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.error('Error loading queued logs:', error);
      this.logQueue = [];
    }
  }

  /**
   * Store queued logs to storage
   */
  async storeQueuedLogs() {
    try {
      await AsyncStorage.setItem('audit_log_queue', JSON.stringify(this.logQueue));
    } catch (error) {
      console.error('Error storing queued logs:', error);
    }
  }

  /**
   * Start sync timer
   */
  startSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (this.isOnline && this.logQueue.length > 0) {
        await this.syncLogs();
      }
    }, this.syncInterval);
  }

  /**
   * Stop sync timer
   */
  stopSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Check if action is sensitive
   */
  isSensitiveAction(action) {
    return this.sensitiveActions.some(sensitiveAction => 
      action.includes(sensitiveAction)
    );
  }

  /**
   * Classify data sensitivity
   */
  classifyData(resourceType) {
    const sensitiveTypes = [
      'clinical_record',
      'patient',
      'prescription',
      'lab_result',
      'medical_history'
    ];

    return sensitiveTypes.includes(resourceType) ? 'sensitive' : 'general';
  }

  /**
   * Generate unique log ID
   */
  generateLogId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device IP address (placeholder)
   */
  async getDeviceIP() {
    try {
      // This would be replaced with actual IP detection
      return 'mobile_device';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get current session ID
   */
  async getSessionId() {
    try {
      const sessionId = await AsyncStorage.getItem('current_session_id');
      return sessionId || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Set online status
   */
  setOnlineStatus(isOnline) {
    this.isOnline = isOnline;
    
    if (isOnline && this.logQueue.length > 0) {
      // Try to sync when coming online
      setTimeout(() => this.syncLogs(), 1000);
    }
  }

  /**
   * Get audit log statistics
   */
  async getLogStatistics() {
    try {
      return {
        queuedLogs: this.logQueue.length,
        sensitiveLogsQueued: this.logQueue.filter(log => log.isSensitive).length,
        oldestLogTimestamp: this.logQueue.length > 0 ? this.logQueue[0].timestamp : null,
        newestLogTimestamp: this.logQueue.length > 0 ? 
          this.logQueue[this.logQueue.length - 1].timestamp : null,
        isOnline: this.isOnline,
        syncInterval: this.syncInterval
      };
    } catch (error) {
      console.error('Error getting log statistics:', error);
      return null;
    }
  }

  /**
   * Clear all logs (admin only)
   */
  async clearAllLogs() {
    try {
      if (!permissionService.isAdmin()) {
        throw new Error('Insufficient permissions to clear audit logs');
      }

      this.logQueue = [];
      await AsyncStorage.removeItem('audit_log_queue');
      
      // Log the clearing action
      await this.logAction('audit_logs_cleared', {
        clearedBy: permissionService.getUserId(),
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error clearing audit logs:', error);
      return false;
    }
  }

  /**
   * Export logs for compliance (admin only)
   */
  async exportLogs(startDate, endDate) {
    try {
      if (!permissionService.isAdmin()) {
        throw new Error('Insufficient permissions to export audit logs');
      }

      const filteredLogs = this.logQueue.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate && logDate <= endDate;
      });

      // Log the export action
      await this.logAction('audit_logs_exported', {
        exportedBy: permissionService.getUserId(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        recordCount: filteredLogs.length
      });

      return filteredLogs;
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      return null;
    }
  }

  /**
   * Cleanup on app termination
   */
  async cleanup() {
    try {
      this.stopSyncTimer();
      
      // Final sync attempt
      if (this.isOnline && this.logQueue.length > 0) {
        await this.syncLogs();
      }
      
      // Store any remaining logs
      await this.storeQueuedLogs();
      
      return true;
    } catch (error) {
      console.error('Error during audit log cleanup:', error);
      return false;
    }
  }
}

export default new AuditLogService();