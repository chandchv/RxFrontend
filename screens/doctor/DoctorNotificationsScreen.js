import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Switch,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const DoctorNotificationsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({
    appointmentRequests: true,
    patientMessages: true,
    prescriptionReminders: true,
    systemAlerts: true,
    emergencyAlerts: true,
  });

  useEffect(() => {
    fetchNotifications();
    fetchNotificationSettings();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/users/api/doctor/notifications/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setNotifications(data.notifications || []);

    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/doctor/notification-settings/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || settings);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const updateNotificationSettings = async (key, value) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const newSettings = { ...settings, [key]: value };
      
      const response = await fetch(`${API_URL}/users/api/doctor/notification-settings/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (response.ok) {
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/doctor/notifications/${notificationId}/mark-read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(notifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationAction = async (notification) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/doctor/notifications/${notification.id}/action/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: notification.action_type,
          data: notification.action_data
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Action completed successfully!');
        fetchNotifications(); // Refresh notifications
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
      Alert.alert('Error', 'Failed to complete action. Please try again.');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_request': return 'event';
      case 'patient_message': return 'message';
      case 'prescription_reminder': return 'description';
      case 'system_alert': return 'info';
      case 'emergency': return 'warning';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'high' || type === 'emergency') return '#F44336';
    if (type === 'appointment_request') return '#4CAF50';
    if (type === 'patient_message') return '#2196F3';
    if (type === 'prescription_reminder') return '#FF9800';
    return '#666';
  };

  const renderNotificationItem = ({ item: notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.is_read && styles.unreadNotification
      ]}
      onPress={() => markAsRead(notification.id)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIconContainer}>
          <Icon 
            name={getNotificationIcon(notification.type)} 
            size={24} 
            color={getNotificationColor(notification.type, notification.priority)} 
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <Text style={styles.notificationDate}>{notification.created_at}</Text>
        </View>
        {!notification.is_read && (
          <View style={styles.unreadIndicator} />
        )}
      </View>
      
      {notification.action_type && (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleNotificationAction(notification)}
        >
          <Text style={styles.actionButtonText}>
            {notification.action_type === 'approve' ? 'Approve' : 
             notification.action_type === 'view' ? 'View Details' : 'Take Action'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderSettingItem = (title, description, key, icon) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <Icon name={icon} size={24} color="#0066cc" />
          <Text style={styles.settingTitle}>{title}</Text>
        </View>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(value) => updateNotificationSettings(key, value)}
        trackColor={{ false: '#767577', true: '#81b0ff' }}
        thumbColor={settings[key] ? '#0066cc' : '#f4f3f4'}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.markAllReadButton}>
          <Text style={styles.markAllReadText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <View style={styles.notificationsContainer}>
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.notificationsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noDataContainer}>
              <Icon name="notifications-none" size={64} color="#ccc" />
              <Text style={styles.noDataText}>No notifications</Text>
              <Text style={styles.noDataSubtext}>You're all caught up!</Text>
            </View>
          }
        />
      </View>

      {/* Notification Settings */}
      <View style={styles.settingsContainer}>
        <Text style={styles.settingsTitle}>Notification Settings</Text>
        
        {renderSettingItem(
          'Appointment Requests',
          'Get notified about new appointment requests',
          'appointmentRequests',
          'event'
        )}
        
        {renderSettingItem(
          'Patient Messages',
          'Notifications when patients send messages',
          'patientMessages',
          'message'
        )}
        
        {renderSettingItem(
          'Prescription Reminders',
          'Reminders for prescription renewals',
          'prescriptionReminders',
          'description'
        )}
        
        {renderSettingItem(
          'System Alerts',
          'General system updates and maintenance',
          'systemAlerts',
          'info'
        )}
        
        {renderSettingItem(
          'Emergency Alerts',
          'Critical alerts and emergencies',
          'emergencyAlerts',
          'warning'
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="test-tube" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Test Notification</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="settings" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Advanced Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  markAllReadButton: {
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
  },
  markAllReadText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '500',
  },
  notificationsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadNotification: {
    backgroundColor: '#f8f9fa',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 12,
    color: '#999',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0066cc',
    marginLeft: 8,
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#0066cc',
    padding: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 36,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DoctorNotificationsScreen;
