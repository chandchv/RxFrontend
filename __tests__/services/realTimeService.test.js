/**
 * Real-time Service Tests
 * 
 * Tests for real-time data synchronization, update handling,
 * and integration with WebSocket service.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import realTimeService from '../../services/realTimeService';
import websocketService from '../../services/websocketService';
import mobileApiService from '../../services/mobileApiService';

// Mock dependencies
jest.mock('../../services/websocketService');
jest.mock('../../services/mobileApiService');
jest.mock('@react-native-async-storage/async-storage');

describe('RealTimeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AsyncStorage
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
    
    // Mock WebSocket service
    websocketService.connect.mockResolvedValue();
    websocketService.disconnect.mockImplementation(() => {});
    websocketService.subscribe.mockReturnValue(true);
    websocketService.addConnectionListener.mockImplementation(() => {});
    websocketService.addErrorListener.mockImplementation(() => {});
    websocketService.addMessageListener.mockImplementation(() => {});
    
    // Mock mobile API service
    mobileApiService.getRealTimeUpdates.mockResolvedValue({
      data: {
        has_updates: false,
        current_time: new Date().toISOString(),
        updates: {}
      }
    });
    
    // Reset service state
    realTimeService.stop();
  });

  afterEach(() => {
    realTimeService.stop();
  });

  describe('Service Lifecycle', () => {
    test('should start real-time service successfully', async () => {
      await realTimeService.start();
      
      expect(realTimeService.isActive).toBe(true);
      expect(websocketService.connect).toHaveBeenCalled();
      expect(websocketService.subscribe).toHaveBeenCalled();
    });

    test('should not start if already active', async () => {
      await realTimeService.start();
      
      // Try to start again
      await realTimeService.start();
      
      // Should only connect once
      expect(websocketService.connect).toHaveBeenCalledTimes(1);
    });

    test('should stop real-time service', async () => {
      await realTimeService.start();
      realTimeService.stop();
      
      expect(realTimeService.isActive).toBe(false);
      expect(websocketService.disconnect).toHaveBeenCalled();
    });

    test('should handle start errors', async () => {
      const error = new Error('Connection failed');
      websocketService.connect.mockRejectedValue(error);
      
      await expect(realTimeService.start()).rejects.toThrow('Connection failed');
      expect(realTimeService.isActive).toBe(false);
    });
  });

  describe('WebSocket Integration', () => {
    test('should set up WebSocket listeners', async () => {
      await realTimeService.start();
      
      expect(websocketService.addConnectionListener).toHaveBeenCalled();
      expect(websocketService.addErrorListener).toHaveBeenCalled();
      expect(websocketService.addMessageListener).toHaveBeenCalledWith('notification', expect.any(Function));
      expect(websocketService.addMessageListener).toHaveBeenCalledWith('alert', expect.any(Function));
      expect(websocketService.addMessageListener).toHaveBeenCalledWith('update', expect.any(Function));
    });

    test('should subscribe to notification types', async () => {
      await realTimeService.start();
      
      expect(websocketService.subscribe).toHaveBeenCalledWith([
        'appointment_created',
        'appointment_updated',
        'appointment_cancelled',
        'clinical_record_created',
        'clinical_record_updated',
        'document_processed',
        'prescription_created',
        'prescription_updated',
        'system_alert',
        'dashboard_metric_updated'
      ]);
    });
  });

  describe('Periodic Sync', () => {
    test('should start periodic sync', async () => {
      await realTimeService.start();
      
      expect(realTimeService.syncInterval).toBeTruthy();
    });

    test('should stop periodic sync on service stop', async () => {
      await realTimeService.start();
      const intervalId = realTimeService.syncInterval;
      
      realTimeService.stop();
      
      expect(realTimeService.syncInterval).toBe(null);
    });

    test('should perform periodic sync', async () => {
      mobileApiService.getRealTimeUpdates.mockResolvedValue({
        data: {
          has_updates: true,
          current_time: new Date().toISOString(),
          updates: {
            dashboard_metrics: {
              total_patients: 150,
              appointments_today: 12
            }
          }
        }
      });

      await realTimeService.start();
      await realTimeService.performPeriodicSync();
      
      expect(mobileApiService.getRealTimeUpdates).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('lastSyncTime', expect.any(String));
    });

    test('should handle periodic sync errors', async () => {
      const error = new Error('Sync failed');
      mobileApiService.getRealTimeUpdates.mockRejectedValue(error);
      
      const errorListener = jest.fn();
      realTimeService.addErrorListener(errorListener);
      
      await realTimeService.start();
      await realTimeService.performPeriodicSync();
      
      expect(errorListener).toHaveBeenCalledWith(error);
    });
  });

  describe('Data Updates', () => {
    beforeEach(async () => {
      await realTimeService.start();
    });

    test('should process dashboard metrics updates', async () => {
      const updateData = {
        total_patients: 150,
        appointments_today: 12,
        revenue_today: 2500
      };

      await realTimeService.processDataTypeUpdate('dashboard_metrics', updateData);
      
      const cachedData = realTimeService.getCachedData('dashboard_metrics');
      expect(cachedData).toMatchObject(updateData);
      expect(cachedData.last_updated).toBeDefined();
    });

    test('should process clinical records create update', async () => {
      const updateData = {
        action: 'create',
        record: {
          id: 1,
          patient_name: 'John Doe',
          record_type: 'consultation',
          created_at: new Date().toISOString()
        }
      };

      await realTimeService.processDataTypeUpdate('clinical_records', updateData);
      
      const cachedData = realTimeService.getCachedData('clinical_records');
      expect(cachedData.records).toHaveLength(1);
      expect(cachedData.records[0]).toMatchObject(updateData.record);
    });

    test('should process clinical records update', async () => {
      // First create a record
      await realTimeService.processDataTypeUpdate('clinical_records', {
        action: 'create',
        record: { id: 1, patient_name: 'John Doe', status: 'pending' }
      });

      // Then update it
      const updateData = {
        action: 'update',
        record: { id: 1, status: 'completed' }
      };

      await realTimeService.processDataTypeUpdate('clinical_records', updateData);
      
      const cachedData = realTimeService.getCachedData('clinical_records');
      expect(cachedData.records[0].status).toBe('completed');
    });

    test('should process clinical records delete update', async () => {
      // First create a record
      await realTimeService.processDataTypeUpdate('clinical_records', {
        action: 'create',
        record: { id: 1, patient_name: 'John Doe' }
      });

      // Then delete it
      const updateData = {
        action: 'delete',
        record_id: 1
      };

      await realTimeService.processDataTypeUpdate('clinical_records', updateData);
      
      const cachedData = realTimeService.getCachedData('clinical_records');
      expect(cachedData.records).toHaveLength(0);
    });

    test('should process appointments updates', async () => {
      const updateData = {
        action: 'create',
        appointment: {
          id: 1,
          patient_name: 'Jane Smith',
          appointment_time: '2024-01-15T10:00:00Z',
          status: 'scheduled'
        }
      };

      await realTimeService.processDataTypeUpdate('appointments', updateData);
      
      const cachedData = realTimeService.getCachedData('appointments');
      expect(cachedData.appointments).toHaveLength(1);
      expect(cachedData.appointments[0]).toMatchObject(updateData.appointment);
    });

    test('should process appointment cancellation', async () => {
      // First create an appointment
      await realTimeService.processDataTypeUpdate('appointments', {
        action: 'create',
        appointment: { id: 1, status: 'scheduled' }
      });

      // Then cancel it
      const updateData = {
        action: 'cancel',
        appointment_id: 1,
        cancelled_at: new Date().toISOString()
      };

      await realTimeService.processDataTypeUpdate('appointments', updateData);
      
      const cachedData = realTimeService.getCachedData('appointments');
      expect(cachedData.appointments[0].status).toBe('cancelled');
      expect(cachedData.appointments[0].cancelled_at).toBeDefined();
    });

    test('should process notifications updates', async () => {
      const updateData = {
        action: 'create',
        notification: {
          id: 1,
          title: 'New Appointment',
          message: 'You have a new appointment scheduled',
          is_read: false
        }
      };

      await realTimeService.processDataTypeUpdate('notifications', updateData);
      
      const cachedData = realTimeService.getCachedData('notifications');
      expect(cachedData.notifications).toHaveLength(1);
      expect(cachedData.unread_count).toBe(1);
    });

    test('should process mark notifications as read', async () => {
      // First create notifications
      await realTimeService.processDataTypeUpdate('notifications', {
        action: 'create',
        notification: { id: 1, is_read: false }
      });
      await realTimeService.processDataTypeUpdate('notifications', {
        action: 'create',
        notification: { id: 2, is_read: false }
      });

      // Then mark as read
      const updateData = {
        action: 'mark_read',
        notification_ids: [1, 2]
      };

      await realTimeService.processDataTypeUpdate('notifications', updateData);
      
      const cachedData = realTimeService.getCachedData('notifications');
      expect(cachedData.notifications[0].is_read).toBe(true);
      expect(cachedData.notifications[1].is_read).toBe(true);
      expect(cachedData.unread_count).toBe(0);
    });

    test('should cache data to AsyncStorage', async () => {
      const updateData = {
        total_patients: 150,
        appointments_today: 12
      };

      await realTimeService.processDataTypeUpdate('dashboard_metrics', updateData);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'cache_dashboard_metrics',
        expect.stringContaining('"total_patients":150')
      );
    });
  });

  describe('Event Handlers', () => {
    beforeEach(async () => {
      await realTimeService.start();
    });

    test('should handle connection changes', () => {
      const connectionListener = jest.fn();
      realTimeService.addConnectionListener(connectionListener);
      
      realTimeService.handleConnectionChange(true);
      
      expect(connectionListener).toHaveBeenCalledWith(true);
      expect(websocketService.subscribe).toHaveBeenCalled();
    });

    test('should handle connection errors', () => {
      const errorListener = jest.fn();
      realTimeService.addErrorListener(errorListener);
      
      const error = new Error('Connection lost');
      realTimeService.handleConnectionError(error);
      
      expect(errorListener).toHaveBeenCalledWith(error);
    });

    test('should handle notification updates', async () => {
      const updateListener = jest.fn();
      realTimeService.addUpdateListener('notifications', updateListener);
      
      const notificationData = {
        id: 1,
        title: 'Test Notification',
        message: 'This is a test'
      };

      realTimeService.handleNotificationUpdate({ data: notificationData });
      
      expect(updateListener).toHaveBeenCalledWith({
        action: 'create',
        notification: notificationData
      });
    });

    test('should handle alert updates', async () => {
      const updateListener = jest.fn();
      realTimeService.addUpdateListener('alerts', updateListener);
      
      const alertData = {
        id: 1,
        title: 'System Alert',
        message: 'System maintenance scheduled'
      };

      realTimeService.handleAlertUpdate({ data: alertData });
      
      expect(updateListener).toHaveBeenCalledWith({
        action: 'create',
        alert: alertData
      });
    });
  });

  describe('Listener Management', () => {
    test('should add and remove update listeners', () => {
      const callback = jest.fn();
      
      realTimeService.addUpdateListener('dashboard_metrics', callback);
      realTimeService.removeUpdateListener('dashboard_metrics', callback);
      
      realTimeService.notifyUpdateListeners('dashboard_metrics', { test: 'data' });
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('should notify multiple listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      realTimeService.addUpdateListener('dashboard_metrics', callback1);
      realTimeService.addUpdateListener('dashboard_metrics', callback2);
      
      const updateData = { test: 'data' };
      realTimeService.notifyUpdateListeners('dashboard_metrics', updateData);
      
      expect(callback1).toHaveBeenCalledWith(updateData);
      expect(callback2).toHaveBeenCalledWith(updateData);
    });

    test('should handle listener errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodCallback = jest.fn();
      
      realTimeService.addUpdateListener('dashboard_metrics', errorCallback);
      realTimeService.addUpdateListener('dashboard_metrics', goodCallback);
      
      realTimeService.notifyUpdateListeners('dashboard_metrics', { test: 'data' });
      
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    test('should get cached data', async () => {
      const testData = { test: 'data' };
      await realTimeService.processDataTypeUpdate('dashboard_metrics', testData);
      
      const cachedData = realTimeService.getCachedData('dashboard_metrics');
      expect(cachedData).toMatchObject(testData);
    });

    test('should clear cached data', async () => {
      await realTimeService.processDataTypeUpdate('dashboard_metrics', { test: 'data' });
      
      realTimeService.clearCachedData('dashboard_metrics');
      
      const cachedData = realTimeService.getCachedData('dashboard_metrics');
      expect(cachedData).toBeUndefined();
    });

    test('should clear all cached data', async () => {
      await realTimeService.processDataTypeUpdate('dashboard_metrics', { test: 'data1' });
      await realTimeService.processDataTypeUpdate('clinical_records', { test: 'data2' });
      
      realTimeService.clearCachedData();
      
      expect(realTimeService.getCachedData('dashboard_metrics')).toBeUndefined();
      expect(realTimeService.getCachedData('clinical_records')).toBeUndefined();
    });

    test('should get connection status', async () => {
      await realTimeService.start();
      
      const status = realTimeService.getConnectionStatus();
      
      expect(status).toMatchObject({
        isActive: true,
        websocketStatus: expect.any(Object),
        lastSyncTime: expect.any(String),
        cacheSize: expect.any(Number)
      });
    });

    test('should force refresh data', async () => {
      mobileApiService.getRealTimeUpdates.mockResolvedValue({
        data: {
          has_updates: true,
          current_time: new Date().toISOString(),
          updates: {
            dashboard_metrics: { test: 'refreshed' }
          }
        }
      });

      await realTimeService.start();
      await realTimeService.forceRefresh(['dashboard_metrics']);
      
      expect(mobileApiService.getRealTimeUpdates).toHaveBeenCalledWith(
        null,
        ['dashboard_metrics']
      );
    });

    test('should handle force refresh errors', async () => {
      const error = new Error('Refresh failed');
      mobileApiService.getRealTimeUpdates.mockRejectedValue(error);
      
      await realTimeService.start();
      
      await expect(realTimeService.forceRefresh()).rejects.toThrow('Refresh failed');
    });
  });
});