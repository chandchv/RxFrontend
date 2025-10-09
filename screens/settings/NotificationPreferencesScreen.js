/**
 * Notification Preferences Screen
 * 
 * This screen allows users to manage their push notification preferences,
 * including notification types, quiet hours, and sound settings.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import pushNotificationManager from '../../services/pushNotificationManager';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const NotificationPreferencesScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { 
    notificationPreferences, 
    updateNotificationPreferences,
    hasPermission,
    requestPermissions 
  } = useNotifications();
  
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      let prefs = notificationPreferences;
      if (!prefs) {
        prefs = await pushNotificationManager.loadPreferences();
      }
      
      setPreferences(prefs || getDefaultPreferences());
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
      setPreferences(getDefaultPreferences());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPreferences = () => ({
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
  });

  const savePreferences = async () => {
    try {
      setSaving(true);
      
      // Check permissions if enabling push notifications
      if (preferences.push_notifications && !hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Push notifications require permission. Please enable notifications in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => {/* Open settings */} }
            ]
          );
          return;
        }
      }
      
      await updateNotificationPreferences(preferences);
      await pushNotificationManager.updatePreferences(preferences);
      
      Alert.alert('Success', 'Notification preferences updated successfully');
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateNotificationType = (type, enabled) => {
    setPreferences(prev => ({
      ...prev,
      notification_types: {
        ...prev.notification_types,
        [type]: enabled
      }
    }));
  };

  const updateQuietHours = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        [key]: value
      }
    }));
  };

  const handleTimeChange = (event, selectedTime, type) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
    }
    
    if (selectedTime) {
      const timeString = selectedTime.toTimeString().slice(0, 5);
      updateQuietHours(type, timeString);
    }
  };

  const parseTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const testNotification = async () => {
    try {
      await pushNotificationManager.showLocalNotification(
        'Test Notification',
        'This is a test notification to verify your settings.',
        { type: 'test' }
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message="Loading preferences..." />
      </View>
    );
  }

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Push Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Enable Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications on your device
              </Text>
            </View>
            <Switch
              value={preferences.push_notifications}
              onValueChange={(value) => updatePreference('push_notifications', value)}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              thumbColor={preferences.push_notifications ? theme.colors.surface : theme.colors.textSecondary}
            />
          </View>

          {preferences.push_notifications && (
            <>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Sound</Text>
                  <Text style={styles.settingDescription}>
                    Play sound for notifications
                  </Text>
                </View>
                <Switch
                  value={preferences.sound_enabled}
                  onValueChange={(value) => updatePreference('sound_enabled', value)}
                  trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                  thumbColor={preferences.sound_enabled ? theme.colors.surface : theme.colors.textSecondary}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Vibration</Text>
                  <Text style={styles.settingDescription}>
                    Vibrate for notifications
                  </Text>
                </View>
                <Switch
                  value={preferences.vibration_enabled}
                  onValueChange={(value) => updatePreference('vibration_enabled', value)}
                  trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                  thumbColor={preferences.vibration_enabled ? theme.colors.surface : theme.colors.textSecondary}
                />
              </View>
            </>
          )}
        </View>

        {/* Notification Types Section */}
        {preferences.push_notifications && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Types</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Appointments</Text>
                <Text style={styles.settingDescription}>
                  Appointment reminders and updates
                </Text>
              </View>
              <Switch
                value={preferences.notification_types.appointments}
                onValueChange={(value) => updateNotificationType('appointments', value)}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={preferences.notification_types.appointments ? theme.colors.surface : theme.colors.textSecondary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Prescriptions</Text>
                <Text style={styles.settingDescription}>
                  Prescription updates and refill reminders
                </Text>
              </View>
              <Switch
                value={preferences.notification_types.prescriptions}
                onValueChange={(value) => updateNotificationType('prescriptions', value)}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={preferences.notification_types.prescriptions ? theme.colors.surface : theme.colors.textSecondary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Clinical Records</Text>
                <Text style={styles.settingDescription}>
                  New records and document processing updates
                </Text>
              </View>
              <Switch
                value={preferences.notification_types.clinical_records}
                onValueChange={(value) => updateNotificationType('clinical_records', value)}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={preferences.notification_types.clinical_records ? theme.colors.surface : theme.colors.textSecondary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Billing</Text>
                <Text style={styles.settingDescription}>
                  Payment reminders and billing updates
                </Text>
              </View>
              <Switch
                value={preferences.notification_types.billing}
                onValueChange={(value) => updateNotificationType('billing', value)}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={preferences.notification_types.billing ? theme.colors.surface : theme.colors.textSecondary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>System Notifications</Text>
                <Text style={styles.settingDescription}>
                  System maintenance and updates
                </Text>
              </View>
              <Switch
                value={preferences.notification_types.system}
                onValueChange={(value) => updateNotificationType('system', value)}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={preferences.notification_types.system ? theme.colors.surface : theme.colors.textSecondary}
              />
            </View>
          </View>
        )}

        {/* Quiet Hours Section */}
        {preferences.push_notifications && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quiet Hours</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Enable Quiet Hours</Text>
                <Text style={styles.settingDescription}>
                  Silence notifications during specified hours
                </Text>
              </View>
              <Switch
                value={preferences.quiet_hours.enabled}
                onValueChange={(value) => updateQuietHours('enabled', value)}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={preferences.quiet_hours.enabled ? theme.colors.surface : theme.colors.textSecondary}
              />
            </View>

            {preferences.quiet_hours.enabled && (
              <>
                <TouchableOpacity
                  style={styles.timeSettingRow}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Start Time</Text>
                    <Text style={styles.timeValue}>{preferences.quiet_hours.start_time}</Text>
                  </View>
                  <MaterialIcons name="access-time" size={24} color={theme.colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.timeSettingRow}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>End Time</Text>
                    <Text style={styles.timeValue}>{preferences.quiet_hours.end_time}</Text>
                  </View>
                  <MaterialIcons name="access-time" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Test Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test</Text>
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={testNotification}
            disabled={!preferences.push_notifications}
          >
            <MaterialIcons 
              name="notifications" 
              size={24} 
              color={preferences.push_notifications ? theme.colors.primary : theme.colors.disabled} 
            />
            <Text style={[
              styles.testButtonText,
              { color: preferences.push_notifications ? theme.colors.primary : theme.colors.disabled }
            ]}>
              Send Test Notification
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={savePreferences}
          disabled={saving}
        >
          {saving ? (
            <LoadingSpinner size="small" color={theme.colors.surface} />
          ) : (
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={parseTime(preferences.quiet_hours.start_time)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, time) => handleTimeChange(event, time, 'start_time')}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={parseTime(preferences.quiet_hours.end_time)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, time) => handleTimeChange(event, time, 'end_time')}
        />
      )}
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  timeSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  timeValue: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  saveButtonContainer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.surface,
  },
});

export default NotificationPreferencesScreen;