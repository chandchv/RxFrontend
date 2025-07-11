import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import { Picker } from '@react-native-picker/picker';
import CustomHeader from '../../components/CustomHeader';

const AddPatientScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    user_id: '',
    clinic_id: '',
    doctor_id: '',
    first_name: '',
    last_name: '',
    email: 'example@gmail.com',
    phone: '9876543210',
    date_of_birth: 'YYYY-MM-DD',
    gender: 'M',
    address: '1234567890',
    existing_diseases: 'Diabetes',
    current_medications: 'Paracetamol',
    allergies: 'Penicillin'

  });

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/doctor/create-patient/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone,
          gender: formData.gender,
          address: formData.address,
          date_of_birth: formData.date_of_birth,
          existing_diseases: formData.existing_diseases,
          current_medications: formData.current_medications,
          allergies: formData.allergies
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add patient');
      }

      Alert.alert(
        'Success',
        'Patient added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error adding patient:', error);
      Alert.alert('Error', error.message || 'Failed to add patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Add New Patient"
        subtitle="Enter patient information"
        navigation={navigation}
        currentScreen="Patients"
      />
      
      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.first_name}
            onChangeText={(text) => setFormData({ ...formData, first_name: text })}
            placeholder="Enter first name"
          />

          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.last_name}
            onChangeText={(text) => setFormData({ ...formData, last_name: text })}
            placeholder="Enter last name"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter email"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Phone *</Text>
          <TextInput
            style={styles.input}
            value={formData.phone_number}
            onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            value={formData.date_of_birth}
            onChangeText={(text) => setFormData({ ...formData, date_of_birth: text })}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.gender}
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
              style={styles.picker}
            >
              <Picker.Item label="Male" value="M" />
              <Picker.Item label="Female" value="F" />
            </Picker>
          </View>

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Enter address"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Existing Diseases</Text>
          <TextInput
            style={styles.input}
            value={formData.existing_diseases}
            onChangeText={(text) => setFormData({ ...formData, existing_diseases: text })}
            placeholder="Enter existing diseases"
          />

          <Text style={styles.label}>Current Medications</Text>
          <TextInput
            style={styles.input}
            value={formData.current_medications}
            onChangeText={(text) => setFormData({ ...formData, current_medications: text })}
            placeholder="Enter current medications"
          />
          <Text style={styles.label}>Allergies</Text>
          <TextInput
            style={styles.input}
            value={formData.allergies}
            onChangeText={(text) => setFormData({ ...formData, allergies: text })}
            placeholder="Enter allergies"
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Add Patient</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddPatientScreen; 