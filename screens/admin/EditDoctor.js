import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { API_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EditDoctor = ({ route, navigation }) => {
  const { doctorId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    pincode: '',
    is_active: true
  });

  useEffect(() => {
    fetchDoctor();
  }, []);

  const fetchDoctor = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('Fetching doctor:', doctorId);
      
      const response = await fetch(`${API_URL}/api/clinic-admin/doctors/${doctorId}/detail/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch doctor details');
      }
      
      const data = await response.json();
      console.log('Doctor data:', data);
      setDoctor(data);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load doctor details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/clinic-admin/doctors/${doctorId}/detail/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: doctor.email,
          phone_number: doctor.phone_number,
          address: doctor.address,
          pincode: doctor.pincode
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update doctor');
      }

      Alert.alert('Success', 'Doctor updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update doctor');
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
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.staticText}>Dr. {doctor.name || 'Not Available'}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={doctor.email}
            onChangeText={(text) => setDoctor({ ...doctor, email: text })}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={doctor.phone_number}
            onChangeText={(text) => setDoctor({ ...doctor, phone_number: text })}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={doctor.address}
            onChangeText={(text) => setDoctor({ ...doctor, address: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pincode</Text>
          <TextInput
            style={styles.input}
            value={doctor.pincode}
            onChangeText={(text) => setDoctor({ ...doctor, pincode: text })}
            keyboardType="numeric"
            maxLength={6}
          />
        </View>

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
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
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  staticText: {
    fontSize: 16,
    color: '#666',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
  }
});

export default EditDoctor;

