/**
 * Push Notification Manager
 * 
 * This service manages push notification registration, handling, and preferences
 * with integration to the real-time system and backend APIs.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileApiService from './mobileApiService';
import realTimeService from './realTimeService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const preferences = await getStoredPreferences();
    
    // Check if notification type is enabled
    const notificationType = data?.type || 'general';
    const typeEnabled = preferences?.notification_types?.[notificationType] !== false;
    
    // Check quiet hours
    const isQuietHours = checkQuietHours(preferences);
    
    return {
      shouldShowAlert: typeEnabled && !isQuietHours,
      shouldPlaySound: typeEnabled && !isQuietHours && preferences?.sound_enabled !== false,
      shouldSetBadge: typeEnabled,
    };
  },
});

class PushNotificationManager {
  constructor() {
    this.isInitialized = false;
    this.expoPushToken = null;
    this.deviceId = null;
    this.notificationListeners = [];
    this.responseListeners = [];
    this.preferences = null;
    this.permissionStatus = null;
    
    // Notification categories for better organization
    this.notificationCategories = {
      appointment: {
        identifier: 'appointment',
        actions: [
          {
            identifier: 'view',
            buttonTitle: 'View',
            options: { opensAppToForeground: true }
          },
          {
            identifier: 'reschedule',
            buttonTitle: 'Reschedule',
            options: { opensAppToForeground: true }
          }
        ]
      },
      clinical_record: {
        identifier: 'clinical_record',
        actions: [
          {
            identifier: 'view',
            buttonTitle: 'View Record',
            options: { opensAppToForeground: true }
          },
          {
            identifier: 'share',
            buttonTitle: 'Share',
            options: { opensAppToForeground: true }
          }
        ]
      },
      prescription: {
        identifier: 'prescription',
        actions: [
          {
            identifier: 'view',
            buttonTitle: 'View',
            options: { opensAppToForeground: true }
          },
          {
            identifier: 'refill',
            buttonTitle: 'Request Refill',
            options: { opensAppToForeground: true }
          }
        ]
      },
      alert: {
        identifier: 'alert',
        actions: [
          {
            identifier: 'acknowledge',
            buttonTitle: 'OK',
            options: { opensAppToForeground: false }
          }
        ]
      }
    };
  }

  /**
   * Initialize push notification system
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('Push notification manager already initialized');
      return true;
    }

    try {
      console.log('Initializing push notification manager');
      
      // Check device compatibility
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      // Set up notification categories
      await this.setupNotificationCategories();
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Push notification permissions denied');
        return false;
      }

      // Get or generate device ID
      this.deviceId = await this.getDeviceId();
      
      // Load preferences
      await this.loadPreferences();
      
      // Register for push notifications
      const registered = await this.registerForPushNotifications();
      if (!registered) {
        console.warn('Failed to register for push notifications');
        return false;
      }

      // Set up listeners
      this.setupNotificationListeners();
      
      // Integrate with real-time service
      this.integrateWithRealTimeService();
      
      this.isInitialized = true;
      console.log('Push notification manager initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Error initializing push notification manager:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      this.permissionStatus = finalStatus;
      
      if (finalStatus !== 'granted') {
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Set up Android notification channels
   */
  async setupAndroidChannels() {
    const channels = [
      {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        description: 'Default notifications'
      },
      {
        name: 'appointments',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
        description: 'Appointment notifications'
      },
      {
        name: 'clinical_records',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#4CAF50',
        description: 'Clinical record notifications'
      },
      {
        name: 'prescriptions',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF9800',
        description: 'Prescription notifications'
      },
      {
        name: 'alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#F44336',
        description: 'System alerts'
      }
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.name, channel);
    }
  }

  /**
   * Set up notification categories with actions
   */
  async setupNotificationCategories() {
    try {
      for (const category of Object.values(this.notificationCategories)) {
        await Notifications.setNotificationCategoryAsync(
          category.identifier,
          category.actions
        );
      }
    } catch (error) {
      console.error('Error setting up notification categories:', error);
    }
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications() {
    try {
      if (this.permissionStatus !== 'granted') {
        console.warn('Cannot register without permission');
        return false;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with your actual project ID
      });
      
      this.expoPushToken = tokenData.data;

      // Register token with backend
      const registrationData = {
        token: this.expoPushToken,
        platform: 'expo',
        device_id: this.deviceId,
        app_version: '1.0.0',
        device_info: {
          os: Platform.OS,
          os_version: Platform.Version,
          device_name: Device.deviceName,
          device_model: Device.modelName,
        }
      };

      const result = await mobileApiService.registerPushToken(registrationData);
      
      if (result.success) {
        // Store token locally
        await AsyncStorage.setItem('expoPushToken', this.expoPushToken);
        await AsyncStorage.setItem('deviceId', this.deviceId);
        
        console.log('Push notification registration successful');
        return true;
      } else {
        console.error('Backend registration failed:', result.error);
        return false;
      }
      
    } catch (error) {
      console.error('Push notification registration error:', error);
      return false;
    }
  }

  /**
   * Unregister push notifications
   */
  async unregister() {
    try {
      if (this.deviceId) {
        await mobileApiService.unregisterPushToken(this.deviceId);
        await AsyncStorage.removeItem('expoPushToken');
        await AsyncStorage.removeItem('deviceId');
        
        this.expoPushToken = null;
        this.deviceId = null;
        
        console.log('Push notifications unregistered successfully');
      }
      return true;
    } catch (error) {
      console.error('Push notification unregistration error:', error);
      return false;
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Notification received listener
    const notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );
    
    // Notification response listener (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    this.notificationListeners.push(notificationListener);
    this.responseListeners.push(responseListener);
  }

  /**
   * Handle received notification
   */
  handleNotificationReceived(notification) {
    console.log('Push notification received:', notification);
    
    const { title, body, data } = notification.request.content;
    
    // Update badge count
    this.updateBadgeCount();
    
    // Store notification locally for history
    this.storeNotificationLocally(notification);
    
    // Emit event for other parts of the app
    this.emitNotificationEvent('received', {
      notification,
      title,
      body,
      data
    });
  }

  /**
   * Handle notification response (user interaction)
   */
  handleNotificationResponse(response) {
    console.log('Push notification response:', response);
    
    const { notification, actionIdentifier } = response;
    const data = notification.request.content.data;
    
    // Handle different action types
    if (actionIdentifier === 'view') {
      this.handleViewAction(data);
    } else if (actionIdentifier === 'reschedule') {
      this.handleRescheduleAction(data);
    } else if (actionIdentifier === 'share') {
      this.handleShareAction(data);
    } else if (actionIdentifier === 'refill') {
      this.handleRefillAction(data);
    } else if (actionIdentifier === 'acknowledge') {
      this.handleAcknowledgeAction(data);
    } else {
      // Default action (tap notification)
      this.handleDefaultAction(data);
    }
    
    // Mark notification as read
    if (data?.notification_id) {
      this.markNotificationAsRead(data.notification_id);
    }
    
    // Emit event
    this.emitNotificationEvent('response', {
      notification,
      actionIdentifier,
      data
    });
  }

  /**
   * Handle different notification actions
   */
  handleViewAction(data) {
    const { type, id } = data;
    // Navigation will be handled by the app's navigation system
    this.emitNotificationEvent('navigate', { type, id, action: 'view' });
  }

  handleRescheduleAction(data) {
    this.emitNotificationEvent('navigate', { 
      type: 'appointment', 
      id: data.appointment_id, 
      action: 'reschedule' 
    });
  }

  handleShareAction(data) {
    this.emitNotificationEvent('navigate', { 
      type: 'clinical_record', 
      id: data.record_id, 
      action: 'share' 
    });
  }

  handleRefillAction(data) {
    this.emitNotificationEvent('navigate', { 
      type: 'prescription', 
      id: data.prescription_id, 
      action: 'refill' 
    });
  }

  handleAcknowledgeAction(data) {
    // Just mark as acknowledged, no navigation needed
    console.log('Alert acknowledged:', data);
  }

  handleDefaultAction(data) {
    const { type, id } = data;
    if (type && id) {
      this.emitNotificationEvent('navigate', { type, id, action: 'view' });
    } else {
      // Navigate to notifications list
      this.emitNotificationEvent('navigate', { type: 'notifications' });
    }
  }

  /**
   * Integrate with real-time service
   */
  integrateWithRealTimeService() {
    // Listen for real-time notifications and show local notifications if needed
    realTimeService.addUpdateListener('notifications', (updateData) => {
      if (updateData.action === 'create' && updateData.notification) {
        this.handleRealTimeNotification(updateData.notification);
      }
    });

    realTimeService.addUpdateListener('alerts', (updateData) => {
      if (updateData.action === 'create' && updateData.alert) {
        this.handleRealTimeAlert(updateData.alert);
      }
    });
  }

  /**
   * Handle real-time notifications
   */
  async handleRealTimeNotification(notification) {
    // Show local notification if app is in foreground
    const appState = await this.getAppState();
    
    if (appState === 'active') {
      await this.showLocalNotification(
        notification.title,
        notification.message,
        {
          type: notification.type,
          id: notification.id,
          notification_id: notification.id
        }
      );
    }
  }

  /**
   * Handle real-time alerts
   */
  async handleRealTimeAlert(alert) {
    // Always show alerts as local notifications
    await this.showLocalNotification(
      alert.title,
      alert.message,
      {
        type: 'alert',
        id: alert.id,
        priority: alert.priority || 'high'
      },
      'alerts'
    );
  }

  /**
   * Show local notification
   */
  async showLocalNotification(title, body, data = {}, channelId = 'default') {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          categoryIdentifier: data.type || 'default',
        },
        trigger: null, // Show immediately
      });
      
      return notificationId;
    } catch (error) {
      console.error('Error showing local notification:', error);
      return null;
    }
  }

  /**
   * Update badge count
   */
  async updateBadgeCount() {
    try {
      // Get unread count from API or local storage
      const unreadCount = await this.getUnreadNotificationCount();
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount() {
    try {
      const summary = await mobileApiService.getNotificationSummary();
      return summary.data?.unread_count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Get notification history from local storage
   */
  async getNotificationHistory() {
    try {
      const stored = await AsyncStorage.getItem('local_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  /**
   * Clear notification history
   */
  async clearNotificationHistory() {
    try {
      await AsyncStorage.removeItem('local_notifications');
      console.log('Notification history cleared');
    } catch (error) {
      console.error('Error clearing notification history:', error);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStatistics() {
    try {
      const history = await this.getNotificationHistory();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = {
        total: history.length,
        unread: history.filter(n => !n.read).length,
        today: history.filter(n => new Date(n.received_at) >= today).length,
        thisWeek: history.filter(n => new Date(n.received_at) >= thisWeek).length,
        thisMonth: history.filter(n => new Date(n.received_at) >= thisMonth).length,
        byType: {}
      };

      // Count by notification type
      history.forEach(notification => {
        const type = notification.data?.type || 'general';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting notification statistics:', error);
      return {
        total: 0,
        unread: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        byType: {}
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId) {
    try {
      await mobileApiService.markNotificationsRead([notificationId]);
      await this.updateBadgeCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Store notification locally for history
   */
  async storeNotificationLocally(notification) {
    try {
      const key = 'local_notifications';
      const stored = await AsyncStorage.getItem(key);
      const notifications = stored ? JSON.parse(stored) : [];
      
      notifications.unshift({
        id: notification.request.identifier,
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        received_at: new Date().toISOString(),
        read: false
      });
      
      // Keep only last 100 notifications
      const trimmed = notifications.slice(0, 100);
      
      await AsyncStorage.setItem(key, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error storing notification locally:', error);
    }
  }

  /**
   * Load notification preferences
   */
  async loadPreferences() {
    try {
      const result = await mobileApiService.getNotificationPreferences();
      this.preferences = result.data;
      
      // Store locally for offline access
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
      
      return this.preferences;
    } catch (error) {
      console.error('Error loading preferences:', error);
      
      // Load from local storage as fallback
      const stored = await AsyncStorage.getItem('notification_preferences');
      this.preferences = stored ? JSON.parse(stored) : this.getDefaultPreferences();
      
      return this.preferences;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(newPreferences) {
    try {
      const result = await mobileApiService.updateNotificationPreferences(newPreferences);
      this.preferences = result.data;
      
      // Store locally
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
      
      // Re-register if push notifications were enabled/disabled
      if (newPreferences.push_notifications !== this.preferences?.push_notifications) {
        if (newPreferences.push_notifications) {
          await this.registerForPushNotifications();
        } else {
          await this.unregister();
        }
      }
      
      return this.preferences;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Get default preferences
   */
  getDefaultPreferences() {
    return {
      push_notifications: true,
      sound_enabled: true,
      vibration_enabled: true,
      notification_types: {
        appointments: true,
        prescriptions: true,
        clinical_records: true,
        billing: true,
        system: false,
      },
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00',
      },
    };
  }

  /**
   * Get or generate device ID
   */
  async getDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        await AsyncStorage.setItem('deviceId', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Device ID generation error:', error);
      return `fallback_${Date.now()}`;
    }
  }

  /**
   * Get current app state
   */
  async getAppState() {
    // This would need to be implemented based on your app state management
    return 'active'; // Placeholder
  }

  /**
   * Emit notification events for other parts of the app
   */
  emitNotificationEvent(type, data) {
    // This would integrate with your app's event system
    console.log(`Notification event: ${type}`, data);
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
      await AsyncStorage.removeItem('local_notifications');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Get registration status
   */
  getRegistrationStatus() {
    return {
      isInitialized: this.isInitialized,
      hasPermission: this.permissionStatus === 'granted',
      isRegistered: !!this.expoPushToken,
      deviceId: this.deviceId,
      expoPushToken: this.expoPushToken,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Remove listeners
    this.notificationListeners.forEach(listener => listener.remove());
    this.responseListeners.forEach(listener => listener.remove());
    
    this.notificationListeners = [];
    this.responseListeners = [];
    this.isInitialized = false;
  }
}

// Helper functions
async function getStoredPreferences() {
  try {
    const stored = await AsyncStorage.getItem('notification_preferences');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
}

function checkQuietHours(preferences) {
  if (!preferences?.quiet_hours?.enabled) {
    return false;
  }

  try {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const startTime = parseTimeString(preferences.quiet_hours.start_time);
    const endTime = parseTimeString(preferences.quiet_hours.end_time);
    
    // Handle overnight quiet hours
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  } catch (error) {
    console.error('Error checking quiet hours:', error);
    return false;
  }
}

function parseTimeString(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Create singleton instance
const pushNotificationManager = new PushNotificationManager();

export default pushNotificationManager;