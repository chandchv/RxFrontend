/**
 * Push Notification Manager Tests
 * 
 * Tests for push notification registration, handling, preferences,
 * and integration with the backend API.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import pushNotificationManager from '../../services/pushNotificationManager';
import mobileApiService from '../../services/mobileApiService';
import realTimeService from '../../services/realTimeService';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '14.0',
  },
}));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../services/mobileApiService');
jest.mock('../../services/realTimeService');

describe('PushNotificationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Device
    Device.isDevice = true;
    Device.deviceName = 'Test Device';
    Device.modelName = 'Test Model';
    
    // Mock Notifications
    Notifications.setNotificationHandler.mockImplementation(() => {});
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[test-token]' });
    Notifications.setNotificationChannelAsync.mockResolvedValue();
    Notifications.setNotificationCategoryAsync.mockResolvedValue();
    Notifications.addNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
    Notifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
    Notifications.scheduleNotificationAsync.mockResolvedValue('notification-id');
    Notifications.setBadgeCountAsync.mockResolvedValue();
    Notifications.dismissAllNotificationsAsync.mockResolvedValue();
    
    // Mock AsyncStorage
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
    AsyncStorage.removeItem.mockResolvedValue();
    
    // Mock mobile API service
    mobileApiService.registerPushToken.mockResolvedValue({ success: true });
    mobileApiService.unregisterPushToken.mockResolvedValue({ success: true });
    mobileApiService.getNotificationPreferences.mockResolvedValue({
      data: {
        push_notifications: true,
        sound_enabled: true,
        notification_types: {
          appointments: true,
          prescriptions: true,
          clinical_records: true,
        },
        quiet_hours: {
          enabled: false,
          start_time: '22:00',
          end_time: '08:00',
        },
      }
    });
    mobileApiService.updateNotificationPreferences.mockResolvedValue({
      data: { success: true }
    });
    mobileApiService.getNotificationSummary.mockResolvedValue({
      data: { unread_count: 5 }
    });
    mobileApiService.markNotificationsRead.mockResolvedValue({ success: true });
    
    // Mock real-time service
    realTimeService.addUpdateListener.mockImplementation(() => {});
    
    // Reset manager state
    pushNotificationManager.isInitialized = false;
    pushNotificationManager.expoPushToken = null;
    pushNotificationManager.deviceId = null;
  });

  describe('Initialization', () => {
    test('should initialize successfully on physical device', async () => {
      const result = await pushNotificationManager.initialize();
      
      expect(result).toBe(true);
      expect(pushNotificationManager.isInitialized).toBe(true);
      expect(Notifications.setNotificationHandler).toHaveBeenCalled();
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(mobileApiService.registerPushToken).toHaveBeenCalled();
    });

    test('should fail initialization on simulator', async () => {
      Device.isDevice = false;
      
      const result = await pushNotificationManager.initialize();
      
      expect(result).toBe(false);
      expect(pushNotificationManager.isInitialized).toBe(false);
    });

    test('should fail initialization without permissions', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
      
      const result = await pushNotificationManager.initialize();
      
      expect(result).toBe(false);
      expect(pushNotificationManager.isInitialized).toBe(false);
    });

    test('should not initialize twice', async () => {
      await pushNotificationManager.initialize();
      
      // Try to initialize again
      const result = await pushNotificationManager.initialize();
      
      expect(result).toBe(true);
      expect(mobileApiService.registerPushToken).toHaveBeenCalledTimes(1);
    });

    test('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      Notifications.getPermissionsAsync.mockRejectedValue(error);
      
      const result = await pushNotificationManager.initialize();
      
      expect(result).toBe(false);
      expect(pushNotificationManager.isInitialized).toBe(false);
    });
  });

  describe('Permission Management', () => {
    test('should request permissions successfully', async () => {
      const result = await pushNotificationManager.requestPermissions();
      
      expect(result).toBe(true);
      expect(pushNotificationManager.permissionStatus).toBe('granted');
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    });

    test('should request permissions when not granted', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      
      const result = await pushNotificationManager.requestPermissions();
      
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    test('should handle permission denial', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
      
      const result = await pushNotificationManager.requestPermissions();
      
      expect(result).toBe(false);
      expect(pushNotificationManager.permissionStatus).toBe('denied');
    });

    test('should set up Android channels', async () => {
      Platform.OS = 'android';
      
      await pushNotificationManager.requestPermissions();
      
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(5);
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          name: 'default',
          importance: expect.any(Number),
        })
      );
    });
  });

  describe('Registration', () => {
    beforeEach(async () => {
      pushNotificationManager.permissionStatus = 'granted';
    });

    test('should register for push notifications', async () => {
      const result = await pushNotificationManager.registerForPushNotifications();
      
      expect(result).toBe(true);
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
      expect(mobileApiService.registerPushToken).toHaveBeenCalledWith({
        token: 'ExponentPushToken[test-token]',
        platform: 'expo',
        device_id: expect.any(String),
        app_version: '1.0.0',
        device_info: expect.objectContaining({
          os: 'ios',
          os_version: '14.0',
        }),
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('expoPushToken', 'ExponentPushToken[test-token]');
    });

    test('should not register without permissions', async () => {
      pushNotificationManager.permissionStatus = 'denied';
      
      const result = await pushNotificationManager.registerForPushNotifications();
      
      expect(result).toBe(false);
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    test('should handle registration errors', async () => {
      const error = new Error('Registration failed');
      Notifications.getExpoPushTokenAsync.mockRejectedValue(error);
      
      const result = await pushNotificationManager.registerForPushNotifications();
      
      expect(result).toBe(false);
    });

    test('should handle backend registration failure', async () => {
      mobileApiService.registerPushToken.mockResolvedValue({
        success: false,
        error: 'Backend error'
      });
      
      const result = await pushNotificationManager.registerForPushNotifications();
      
      expect(result).toBe(false);
    });
  });

  describe('Unregistration', () => {
    beforeEach(async () => {
      pushNotificationManager.deviceId = 'test-device-id';
      pushNotificationManager.expoPushToken = 'test-token';
    });

    test('should unregister successfully', async () => {
      const result = await pushNotificationManager.unregister();
      
      expect(result).toBe(true);
      expect(mobileApiService.unregisterPushToken).toHaveBeenCalledWith('test-device-id');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('expoPushToken');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('deviceId');
      expect(pushNotificationManager.expoPushToken).toBe(null);
      expect(pushNotificationManager.deviceId).toBe(null);
    });

    test('should handle unregistration errors', async () => {
      const error = new Error('Unregistration failed');
      mobileApiService.unregisterPushToken.mockRejectedValue(error);
      
      const result = await pushNotificationManager.unregister();
      
      expect(result).toBe(false);
    });
  });

  describe('Notification Handling', () => {
    beforeEach(async () => {
      await pushNotificationManager.initialize();
    });

    test('should handle received notifications', () => {
      const mockNotification = {
        request: {
          identifier: 'test-id',
          content: {
            title: 'Test Notification',
            body: 'Test message',
            data: { type: 'appointment', id: 1 }
          }
        }
      };

      pushNotificationManager.handleNotificationReceived(mockNotification);
      
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalled();
    });

    test('should handle notification responses', () => {
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'appointment', id: 1, notification_id: 123 }
            }
          }
        },
        actionIdentifier: 'view'
      };

      const emitSpy = jest.spyOn(pushNotificationManager, 'emitNotificationEvent');
      
      pushNotificationManager.handleNotificationResponse(mockResponse);
      
      expect(emitSpy).toHaveBeenCalledWith('navigate', {
        type: 'appointment',
        id: 1,
        action: 'view'
      });
      expect(mobileApiService.markNotificationsRead).toHaveBeenCalledWith([123]);
    });

    test('should handle different action types', () => {
      const emitSpy = jest.spyOn(pushNotificationManager, 'emitNotificationEvent');
      
      // Test reschedule action
      pushNotificationManager.handleRescheduleAction({ appointment_id: 1 });
      expect(emitSpy).toHaveBeenCalledWith('navigate', {
        type: 'appointment',
        id: 1,
        action: 'reschedule'
      });
      
      // Test share action
      pushNotificationManager.handleShareAction({ record_id: 2 });
      expect(emitSpy).toHaveBeenCalledWith('navigate', {
        type: 'clinical_record',
        id: 2,
        action: 'share'
      });
      
      // Test refill action
      pushNotificationManager.handleRefillAction({ prescription_id: 3 });
      expect(emitSpy).toHaveBeenCalledWith('navigate', {
        type: 'prescription',
        id: 3,
        action: 'refill'
      });
    });
  });

  describe('Local Notifications', () => {
    beforeEach(async () => {
      await pushNotificationManager.initialize();
    });

    test('should show local notification', async () => {
      const notificationId = await pushNotificationManager.showLocalNotification(
        'Test Title',
        'Test Body',
        { type: 'test' }
      );
      
      expect(notificationId).toBe('notification-id');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: { type: 'test' },
          categoryIdentifier: 'test',
        },
        trigger: null,
      });
    });

    test('should handle local notification errors', async () => {
      const error = new Error('Notification failed');
      Notifications.scheduleNotificationAsync.mockRejectedValue(error);
      
      const notificationId = await pushNotificationManager.showLocalNotification(
        'Test Title',
        'Test Body'
      );
      
      expect(notificationId).toBe(null);
    });
  });

  describe('Badge Management', () => {
    beforeEach(async () => {
      await pushNotificationManager.initialize();
    });

    test('should update badge count', async () => {
      await pushNotificationManager.updateBadgeCount();
      
      expect(mobileApiService.getNotificationSummary).toHaveBeenCalled();
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    test('should handle badge count errors', async () => {
      const error = new Error('Badge update failed');
      mobileApiService.getNotificationSummary.mockRejectedValue(error);
      
      await pushNotificationManager.updateBadgeCount();
      
      // Should not throw error
      expect(Notifications.setBadgeCountAsync).not.toHaveBeenCalled();
    });
  });

  describe('Preferences Management', () => {
    beforeEach(async () => {
      await pushNotificationManager.initialize();
    });

    test('should load preferences', async () => {
      const preferences = await pushNotificationManager.loadPreferences();
      
      expect(mobileApiService.getNotificationPreferences).toHaveBeenCalled();
      expect(preferences).toMatchObject({
        push_notifications: true,
        sound_enabled: true,
        notification_types: expect.any(Object),
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_preferences',
        expect.any(String)
      );
    });

    test('should load preferences from storage on API failure', async () => {
      const error = new Error('API failed');
      mobileApiService.getNotificationPreferences.mockRejectedValue(error);
      
      const storedPrefs = { push_notifications: false };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedPrefs));
      
      const preferences = await pushNotificationManager.loadPreferences();
      
      expect(preferences).toMatchObject(storedPrefs);
    });

    test('should update preferences', async () => {
      const newPreferences = {
        push_notifications: false,
        sound_enabled: false,
      };
      
      const result = await pushNotificationManager.updatePreferences(newPreferences);
      
      expect(mobileApiService.updateNotificationPreferences).toHaveBeenCalledWith(newPreferences);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_preferences',
        expect.any(String)
      );
    });

    test('should re-register when push notifications enabled', async () => {
      pushNotificationManager.preferences = { push_notifications: false };
      
      const registerSpy = jest.spyOn(pushNotificationManager, 'registerForPushNotifications');
      
      await pushNotificationManager.updatePreferences({
        push_notifications: true
      });
      
      expect(registerSpy).toHaveBeenCalled();
    });

    test('should unregister when push notifications disabled', async () => {
      pushNotificationManager.preferences = { push_notifications: true };
      
      const unregisterSpy = jest.spyOn(pushNotificationManager, 'unregister');
      
      await pushNotificationManager.updatePreferences({
        push_notifications: false
      });
      
      expect(unregisterSpy).toHaveBeenCalled();
    });
  });

  describe('Real-time Integration', () => {
    beforeEach(async () => {
      await pushNotificationManager.initialize();
    });

    test('should integrate with real-time service', () => {
      expect(realTimeService.addUpdateListener).toHaveBeenCalledWith(
        'notifications',
        expect.any(Function)
      );
      expect(realTimeService.addUpdateListener).toHaveBeenCalledWith(
        'alerts',
        expect.any(Function)
      );
    });

    test('should handle real-time notifications', async () => {
      const showLocalSpy = jest.spyOn(pushNotificationManager, 'showLocalNotification');
      
      const notification = {
        id: 1,
        title: 'New Appointment',
        message: 'You have a new appointment',
        type: 'appointment'
      };
      
      await pushNotificationManager.handleRealTimeNotification(notification);
      
      expect(showLocalSpy).toHaveBeenCalledWith(
        'New Appointment',
        'You have a new appointment',
        {
          type: 'appointment',
          id: 1,
          notification_id: 1
        }
      );
    });

    test('should handle real-time alerts', async () => {
      const showLocalSpy = jest.spyOn(pushNotificationManager, 'showLocalNotification');
      
      const alert = {
        id: 1,
        title: 'System Alert',
        message: 'System maintenance scheduled',
        priority: 'high'
      };
      
      await pushNotificationManager.handleRealTimeAlert(alert);
      
      expect(showLocalSpy).toHaveBeenCalledWith(
        'System Alert',
        'System maintenance scheduled',
        {
          type: 'alert',
          id: 1,
          priority: 'high'
        },
        'alerts'
      );
    });
  });

  describe('Utility Functions', () => {
    test('should generate device ID', async () => {
      const deviceId = await pushNotificationManager.getDeviceId();
      
      expect(deviceId).toMatch(/^ios_\d+_[a-z0-9]+$/);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('deviceId', deviceId);
    });

    test('should use stored device ID', async () => {
      const storedId = 'stored-device-id';
      AsyncStorage.getItem.mockResolvedValue(storedId);
      
      const deviceId = await pushNotificationManager.getDeviceId();
      
      expect(deviceId).toBe(storedId);
    });

    test('should get registration status', () => {
      pushNotificationManager.isInitialized = true;
      pushNotificationManager.permissionStatus = 'granted';
      pushNotificationManager.expoPushToken = 'test-token';
      pushNotificationManager.deviceId = 'test-device';
      
      const status = pushNotificationManager.getRegistrationStatus();
      
      expect(status).toEqual({
        isInitialized: true,
        hasPermission: true,
        isRegistered: true,
        deviceId: 'test-device',
        expoPushToken: 'test-token',
      });
    });

    test('should clear all notifications', async () => {
      await pushNotificationManager.clearAllNotifications();
      
      expect(Notifications.dismissAllNotificationsAsync).toHaveBeenCalled();
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('local_notifications');
    });

    test('should cleanup resources', () => {
      const mockListener = { remove: jest.fn() };
      pushNotificationManager.notificationListeners = [mockListener];
      pushNotificationManager.responseListeners = [mockListener];
      
      pushNotificationManager.cleanup();
      
      expect(mockListener.remove).toHaveBeenCalledTimes(2);
      expect(pushNotificationManager.isInitialized).toBe(false);
    });
  });

  describe('Notification Categories', () => {
    test('should set up notification categories', async () => {
      await pushNotificationManager.setupNotificationCategories();
      
      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledTimes(4);
      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
        'appointment',
        expect.arrayContaining([
          expect.objectContaining({
            identifier: 'view',
            buttonTitle: 'View',
          }),
          expect.objectContaining({
            identifier: 'reschedule',
            buttonTitle: 'Reschedule',
          }),
        ])
      );
    });
  });
});