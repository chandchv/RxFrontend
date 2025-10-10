/**
 * Notification Context
 * 
 * This context manages push notifications, real-time updates, and notification preferences
 * for the mobile app.
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import mobileApiService from '../services/mobileApiService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationContext = createContext({});

export const NotificationProvider = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  
  // Notification state
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationPreferences, setNotificationPreferences] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  
  // Real-time state
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  
  // Loading states
  const [loading, setLoading] = useState({
    permissions: false,
    registration: false,
    preferences: false,
  });

  // Initialize notifications when user logs in
  useEffect(() => {
    if (isLoggedIn && user) {
      initializeNotifications();
    }
  }, [isLoggedIn, user]);

  // Set up notification listeners
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      handleNotificationReceived
    );
    
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // Initialize notification system
  const initializeNotifications = async () => {
    try {
      await requestPermissions();
      await registerForPushNotifications();
      await loadNotificationPreferences();
    } catch (error) {
      console.error('Notification initialization error:', error);
    }
  };

  // Request notification permissions
  const requestPermissions = async () => {
    try {
      setLoading(prev => ({ ...prev, permissions: true }));
      
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        setPermissionStatus('unavailable');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission denied');
        setPermissionStatus('denied');
        return false;
      }

      setPermissionStatus('granted');
      
      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      setPermissionStatus('error');
      return false;
    } finally {
      setLoading(prev => ({ ...prev, permissions: false }));
    }
  };

  // Register for push notifications
  const registerForPushNotifications = async () => {
    try {
      setLoading(prev => ({ ...prev, registration: true }));
      
      if (permissionStatus !== 'granted') {
        console.warn('Cannot register without permission');
        return false;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with your actual project ID
      });
      
      const token = tokenData.data;
      setExpoPushToken(token);

      // Get device info
      const deviceId = await getDeviceId();

      // Register token with backend
      const registrationData = {
        token: token,
        platform: 'expo',
        device_id: deviceId,
        app_version: '1.0.0',
      };

      await mobileApiService.registerPushToken(registrationData);
      
      // Store token locally
      await AsyncStorage.setItem('expoPushToken', token);
      await AsyncStorage.setItem('deviceId', deviceId);

      console.log('Push notification registration successful');
      return true;
    } catch (error) {
      console.error('Push notification registration error:', error);
      return false;
    } finally {
      setLoading(prev => ({ ...prev, registration: false }));
    }
  };

  // Unregister push notifications
  const unregisterPushNotifications = async () => {
    try {
      const deviceId = await AsyncStorage.getItem('deviceId');
      if (deviceId) {
        await mobileApiService.unregisterPushToken(deviceId);
        await AsyncStorage.removeItem('expoPushToken');
        await AsyncStorage.removeItem('deviceId');
        setExpoPushToken(null);
      }
      return true;
    } catch (error) {
      console.error('Push notification unregistration error:', error);
      return false;
    }
  };

  // Get device ID
  const getDeviceId = async () => {
    try {
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        // Generate a unique device ID
        deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        await AsyncStorage.setItem('deviceId', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Device ID generation error:', error);
      return `fallback_${Date.now()}`;
    }
  };

  // Handle received notification
  const handleNotificationReceived = (notification) => {
    console.log('Notification received:', notification);
    
    // Add to local notifications list
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
    
    // Update badge count
    const badgeCount = notifications.filter(n => !n.request.content.data?.read).length + 1;
    Notifications.setBadgeCountAsync(badgeCount);
  };

  // Handle notification response (when user taps notification)
  const handleNotificationResponse = (response) => {
    console.log('Notification response:', response);
    
    const { notification } = response;
    const data = notification.request.content.data;
    
    // Handle different notification types
    if (data?.type) {
      handleNotificationAction(data.type, data);
    }
  };

  // Handle notification actions
  const handleNotificationAction = (type, notificationData) => {
    switch (type) {
      case 'appointment':
        // Navigate to appointment details
        // navigation.navigate('AppointmentDetail', { id: notificationData.appointment_id });
        break;
      case 'clinical_record':
        // Navigate to clinical record
        // navigation.navigate('ClinicalRecordDetail', { id: notificationData.record_id });
        break;
      case 'prescription':
        // Navigate to prescription
        // navigation.navigate('PrescriptionDetail', { id: notificationData.prescription_id });
        break;
      default:
        // Navigate to notifications list
        // navigation.navigate('Notifications');
        break;
    }
  };

  // Load notification preferences
  const loadNotificationPreferences = async () => {
    try {
      setLoading(prev => ({ ...prev, preferences: true }));
      
      const preferences = await mobileApiService.getNotificationPreferences();
      setNotificationPreferences(preferences.data);
      
      return preferences.data;
    } catch (error) {
      console.error('Load notification preferences error:', error);
      // Set default preferences
      const defaultPreferences = {
        push_notifications: true,
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
      setNotificationPreferences(defaultPreferences);
      return defaultPreferences;
    } finally {
      setLoading(prev => ({ ...prev, preferences: false }));
    }
  };

  // Update notification preferences
  const updateNotificationPreferences = async (newPreferences) => {
    try {
      const updatedPreferences = await mobileApiService.updateNotificationPreferences(newPreferences);
      setNotificationPreferences(updatedPreferences.data);
      
      // If push notifications were disabled, unregister
      if (!newPreferences.push_notifications && expoPushToken) {
        await unregisterPushNotifications();
      }
      // If push notifications were enabled, register
      else if (newPreferences.push_notifications && !expoPushToken) {
        await registerForPushNotifications();
      }
      
      return updatedPreferences.data;
    } catch (error) {
      console.error('Update notification preferences error:', error);
      throw error;
    }
  };

  // Send local notification (for testing or offline scenarios)
  const sendLocalNotification = async (title, body, data = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Local notification error:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
      setNotifications([]);
    } catch (error) {
      console.error('Clear notifications error:', error);
    }
  };

  // Get notification count
  const getNotificationCount = () => {
    return notifications.filter(n => !n.request.content.data?.read).length;
  };

  // Mark notification as read
  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.request.identifier === notificationId
          ? {
              ...n,
              request: {
                ...n.request,
                content: {
                  ...n.request.content,
                  data: { ...n.request.content.data, read: true }
                }
              }
            }
          : n
      )
    );
  };

  // Check connection status
  const checkConnectionStatus = useCallback(async () => {
    try {
      const isOnline = await mobileApiService.isOnline();
      setConnectionStatus(isOnline ? 'connected' : 'offline');
      return isOnline;
    } catch (error) {
      setConnectionStatus('error');
      return false;
    }
  }, []);

  // Start real-time updates
  const startRealTimeUpdates = useCallback(() => {
    if (!isRealTimeEnabled) return;
    
    const interval = setInterval(async () => {
      try {
        const isOnline = await checkConnectionStatus();
        if (!isOnline) return;
        
        const updates = await mobileApiService.getRealTimeUpdates(
          lastUpdateCheck,
          ['notifications', 'alerts']
        );
        
        if (updates.data.has_updates) {
          // Show local notification for new updates
          const { updates: updateData } = updates.data;
          
          if (updateData.notifications) {
            await sendLocalNotification(
              'New Notifications',
              `You have ${updateData.notifications.count} new notifications`,
              { type: 'notification_update' }
            );
          }
          
          if (updateData.alerts) {
            await sendLocalNotification(
              'New Alerts',
              `You have ${updateData.alerts.count} new alerts`,
              { type: 'alert_update' }
            );
          }
        }
        
        setLastUpdateCheck(updates.data.current_time);
        
      } catch (error) {
        console.error('Real-time updates error:', error);
        setConnectionStatus('error');
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [lastUpdateCheck, isRealTimeEnabled, checkConnectionStatus]);

  // Stop real-time updates
  const stopRealTimeUpdates = () => {
    setIsRealTimeEnabled(false);
  };

  const contextValue = {
    // State
    expoPushToken,
    notifications,
    notificationPreferences,
    permissionStatus,
    isRealTimeEnabled,
    lastUpdateCheck,
    connectionStatus,
    loading,
    
    // Actions
    requestPermissions,
    registerForPushNotifications,
    unregisterPushNotifications,
    loadNotificationPreferences,
    updateNotificationPreferences,
    sendLocalNotification,
    clearAllNotifications,
    markNotificationAsRead,
    startRealTimeUpdates,
    stopRealTimeUpdates,
    checkConnectionStatus,
    
    // Utilities
    getNotificationCount,
    
    // Computed values
    hasPermission: permissionStatus === 'granted',
    isRegistered: !!expoPushToken,
    unreadCount: getNotificationCount(),
    isOnline: connectionStatus === 'connected',
    canReceiveNotifications: permissionStatus === 'granted' && !!expoPushToken,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;