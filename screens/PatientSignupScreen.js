import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';

const PatientSignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phoneNumber: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    bloodGroup: '',
    clinic: ''
  });
  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState([]);
  const [fetchingClinics, setFetchingClinics] = useState(true);

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/clinics/public/`);
      const data = await response.json();
      if (response.ok) {
        setClinics(data);
      } else {
        throw new Error(data.error || 'Failed to fetch clinics');
      }
    } catch (error) {
      console.error('Error fetching clinics:', error);
      Alert.alert('Error', 'Failed to load clinics. Please try again later.');
    } finally {
      setFetchingClinics(false);
    }
  };

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  const validateDate = (date) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj instanceof Date && !isNaN(dateObj);
  };

  const handleSignup = async () => {
    // Validate form data
    if (!formData.username || !formData.password || !formData.email || !formData.phoneNumber) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!validatePhoneNumber(formData.phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    if (!validateDate(formData.dateOfBirth)) {
      Alert.alert('Error', 'Please enter a valid date in YYYY-MM-DD format');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!formData.clinic) {
      Alert.alert('Error', 'Please select a clinic');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/patient/signup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          phone_number: formData.phoneNumber,
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          address: formData.address,
          blood_group: formData.bloodGroup,
          clinic: formData.clinic
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      Alert.alert('Success', 'Registration successful! Please login.');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', error.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Patient Registration</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Username *"
          value={formData.username}
          onChangeText={(text) => setFormData({ ...formData, username: text })}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Email *"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number (10 digits) *"
          value={formData.phoneNumber}
          onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="First Name *"
            value={formData.firstName}
            onChangeText={(text) => setFormData({ ...formData, firstName: text })}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Last Name *"
            value={formData.lastName}
            onChangeText={(text) => setFormData({ ...formData, lastName: text })}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Date of Birth (YYYY-MM-DD) *"
          value={formData.dateOfBirth}
          onChangeText={(text) => setFormData({ ...formData, dateOfBirth: text })}
        />

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Gender *</Text>
          <View style={styles.picker}>
            <Picker
              selectedValue={formData.gender}
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
            >
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Male" value="M" />
              <Picker.Item label="Female" value="F" />
              <Picker.Item label="Other" value="O" />
            </Picker>
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Address *"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          multiline
        />

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Blood Group</Text>
          <View style={styles.picker}>
            <Picker
              selectedValue={formData.bloodGroup}
              onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}
            >
              <Picker.Item label="Select Blood Group" value="" />
              <Picker.Item label="A+" value="A+" />
              <Picker.Item label="A-" value="A-" />
              <Picker.Item label="B+" value="B+" />
              <Picker.Item label="B-" value="B-" />
              <Picker.Item label="O+" value="O+" />
              <Picker.Item label="O-" value="O-" />
              <Picker.Item label="AB+" value="AB+" />
              <Picker.Item label="AB-" value="AB-" />
            </Picker>
          </View>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Select Clinic *</Text>
          <View style={styles.picker}>
            <Picker
              selectedValue={formData.clinic}
              onValueChange={(value) => setFormData({ ...formData, clinic: value })}
              enabled={!fetchingClinics}
            >
              <Picker.Item label="Select Clinic" value="" />
              {clinics.map((clinic) => (
                <Picker.Item 
                  key={clinic.id} 
                  label={clinic.name} 
                  value={clinic.id} 
                />
              ))}
            </Picker>
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Password *"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password *"
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
          secureTextEntry
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  halfInput: {
    width: '48%',
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  picker: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#2196F3',
    fontSize: 14,
  },
});

export default PatientSignupScreen; 