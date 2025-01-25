import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';

const ClinicSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    clinic_name: '',
    address: '',
    phone: '',
    email: '',
    tax_id: '',
    currency: 'USD',
    time_zone: 'UTC',
    working_hours: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '09:00', end: '13:00', enabled: true },
      sunday: { start: '00:00', end: '00:00', enabled: false },
    },
    appointment_duration: 30,
    break_duration: 15,
    online_booking: true,
    sms_reminders: true,
    email_notifications: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/clinic-admin/settings/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load clinic settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/clinic-admin/settings/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <TextInput
          style={styles.input}
          value={settings.clinic_name}
          onChangeText={(text) => setSettings({ ...settings, clinic_name: text })}
          placeholder="Clinic Name"
        />
        <TextInput
          style={styles.input}
          value={settings.address}
          onChangeText={(text) => setSettings({ ...settings, address: text })}
          placeholder="Address"
          multiline
        />
        <TextInput
          style={styles.input}
          value={settings.phone}
          onChangeText={(text) => setSettings({ ...settings, phone: text })}
          placeholder="Phone"
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          value={settings.email}
          onChangeText={(text) => setSettings({ ...settings, email: text })}
          placeholder="Email"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Working Hours</Text>
        {Object.entries(settings.working_hours).map(([day, hours]) => (
          <View key={day} style={styles.workingHoursRow}>
            <Text style={styles.dayLabel}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
            <Switch
              value={hours.enabled}
              onValueChange={(value) => 
                setSettings({
                  ...settings,
                  working_hours: {
                    ...settings.working_hours,
                    [day]: { ...hours, enabled: value }
                  }
                })
              }
            />
            {hours.enabled && (
              <View style={styles.hoursInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={hours.start}
                  onChangeText={(text) =>
                    setSettings({
                      ...settings,
                      working_hours: {
                        ...settings.working_hours,
                        [day]: { ...hours, start: text }
                      }
                    })
                  }
                  placeholder="09:00"
                />
                <Text style={styles.toText}>to</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hours.end}
                  onChangeText={(text) =>
                    setSettings({
                      ...settings,
                      working_hours: {
                        ...settings.working_hours,
                        [day]: { ...hours, end: text }
                      }
                    })
                  }
                  placeholder="17:00"
                />
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appointment Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Appointment Duration (min)</Text>
          <TextInput
            style={styles.numberInput}
            value={String(settings.appointment_duration)}
            onChangeText={(text) => setSettings({ ...settings, appointment_duration: parseInt(text) || 0 })}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Break Duration (min)</Text>
          <TextInput
            style={styles.numberInput}
            value={String(settings.break_duration)}
            onChangeText={(text) => setSettings({ ...settings, break_duration: parseInt(text) || 0 })}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Online Booking</Text>
          <Switch
            value={settings.online_booking}
            onValueChange={(value) => setSettings({ ...settings, online_booking: value })}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>SMS Reminders</Text>
          <Switch
            value={settings.sms_reminders}
            onValueChange={(value) => setSettings({ ...settings, sms_reminders: value })}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Email Notifications</Text>
          <Switch
            value={settings.email_notifications}
            onValueChange={(value) => setSettings({ ...settings, email_notifications: value })}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.savingButton]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  workingHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    width: 100,
    fontSize: 16,
    color: '#333',
  },
  hoursInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: 'center',
  },
  toText: {
    marginHorizontal: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  savingButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ClinicSettings; 