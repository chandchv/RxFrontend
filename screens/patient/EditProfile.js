import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import DateTimePicker from '@react-native-community/datetimepicker';

const EditProfile = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: new Date(),
    address: '',
    emergency_contact: '',
    blood_group: '',
    allergies: '',
    medical_conditions: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/patient/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile({
        ...data,
        date_of_birth: new Date(data.date_of_birth),
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/patient/profile/update/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profile,
          date_of_birth: profile.date_of_birth.toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      Alert.alert(
        'Success',
        'Profile updated successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TextInput
          label="First Name"
          value={profile.first_name}
          onChangeText={(text) => setProfile({ ...profile, first_name: text })}
          style={styles.input}
        />

        <TextInput
          label="Last Name"
          value={profile.last_name}
          onChangeText={(text) => setProfile({ ...profile, last_name: text })}
          style={styles.input}
        />

        <TextInput
          label="Email"
          value={profile.email}
          onChangeText={(text) => setProfile({ ...profile, email: text })}
          keyboardType="email-address"
          style={styles.input}
        />

        <TextInput
          label="Phone Number"
          value={profile.phone_number}
          onChangeText={(text) => setProfile({ ...profile, phone_number: text })}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <TextInput
            label="Date of Birth"
            value={profile.date_of_birth.toLocaleDateString()}
            editable={false}
            style={styles.input}
          />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={profile.date_of_birth}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setProfile({ ...profile, date_of_birth: selectedDate });
              }
            }}
          />
        )}

        <TextInput
          label="Address"
          value={profile.address}
          onChangeText={(text) => setProfile({ ...profile, address: text })}
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <TextInput
          label="Emergency Contact"
          value={profile.emergency_contact}
          onChangeText={(text) => setProfile({ ...profile, emergency_contact: text })}
          style={styles.input}
        />

        <TextInput
          label="Blood Group"
          value={profile.blood_group}
          onChangeText={(text) => setProfile({ ...profile, blood_group: text })}
          style={styles.input}
        />

        <TextInput
          label="Allergies"
          value={profile.allergies}
          onChangeText={(text) => setProfile({ ...profile, allergies: text })}
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <TextInput
          label="Medical Conditions"
          value={profile.medical_conditions}
          onChangeText={(text) => setProfile({ ...profile, medical_conditions: text })}
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.button}
        >
          Save Changes
        </Button>
      </View>
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
  form: {
    padding: 20,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  dateButton: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
  },
});

export default EditProfile; 