import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../config';

const SignupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [medicalCouncil, setMedicalCouncil] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [username, setUsername] = useState('');
  const [verificationData, setVerificationData] = useState(null);
  const [yearOfRegistration, setYearOfRegistration] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // List of medical councils
  const medicalCouncils = [
      "Andhra Pradesh Medical Council",	
      "Arunachal Pradesh Medical Council",	
      "Assam Medical Council",	
      "Bhopal Medical Council",	
      "Bihar Medical Council",	
      "Bombay Medical Council",	
      "Chandigarh Medical Council",	
      "Chattisgarh Medical Council",	
      "Delhi Medical Council",	
      "Goa Medical Council",	
      "Gujarat Medical Council",	
      "Haryana Medical Councils",	
      "Himachal Pradesh Medical Council",	
      "Hyderabad Medical Council",	
      "Jammu &amp; Kashmir Medical Council",	
      "Jharkhand Medical Council",	
      "Karnataka Medical Council",	
      "Madhya Pradesh Medical Council",	
      "Madras Medical Council",	
      "Mahakoshal Medical Council",	
      "Maharashtra Medical Council",	
      "Manipur Medical Council",	
      "Medical Council of India",	
      "Medical Council of Tanganyika",	
      "Mizoram Medical Council",	
      "Mysore Medical Council",	
      "Nagaland Medical Council",	
      "Orissa Council of Medical Registration",	
      "Pondicherry Medical Council",	
      "Punjab Medical Council",	
      "Rajasthan Medical Council",	
      "Sikkim Medical Council",	
      "Tamil Nadu Medical Council",	
      "Telangana State Medical Council",	
      "Travancore Cochin Medical Council, Trivandrum",	
      "Tripura State Medical Council",	
      "Uttar Pradesh Medical Council",	
      "Uttarakhand Medical Council",	
      "Vidharba Medical Council",	
      "West Bengal Medical Council",	
    
    // ... add other councils ...
  ];

  const handleVerifyDoctor = async () => {
    if (!name || !licenseNumber || !medicalCouncil) {
      Alert.alert('Error', 'Please fill in all verification fields');
      return;
    }

    setIsVerifying(true);
    try {
      console.log('Sending verification request:', {
        name,
        registration_number: licenseNumber,
        state_council: medicalCouncil
      });

      const response = await fetch(`${API_URL}/verify-doctor/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          registration_number: licenseNumber,
          state_council: medicalCouncil
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.success) {
        setIsVerified(true);
        setVerificationData(data.data);
        Alert.alert('Success', 'Doctor verification successful');
      } else {
        setIsVerified(false);
        Alert.alert('Error', data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setIsVerified(false);
      Alert.alert('Error', 'Failed to verify doctor details');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignup = async () => {
    if (!isVerified) {
      Alert.alert('Error', 'Please verify your medical license first');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!username || !email || !clinicName || !phoneNumber || !address || !pincode) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      // Split the full name into first and last name
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      console.log('Sending signup request...'); // Debug log

      const signupData = {
        username: username,
        email: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
        title: 'Dr',
        medical_degree: verificationData?.medical_degree || '',
        license_number: licenseNumber,
        state_council: medicalCouncil,
        year_of_registration: yearOfRegistration || verificationData?.year || '',
        clinic_name: clinicName,
        phone_number: phoneNumber,
        address: address,
        pincode: pincode
      };

      console.log('Sending signup data:', signupData);  // Debug log

      const response = await fetch(`${API_URL}/api/signup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        Alert.alert('Success', 'Registration successful! Please login to continue.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('Login')
          }
        ]);
      } else {
        const errorMessage = data.error || data.message || 'Registration failed';
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert(
        'Error',
        'Network error or server not responding. Please try again.'
      );
    }
  };

  const isFormValid = () => {
    return (
      isVerified &&
      username &&
      email &&
      password &&
      confirmPassword &&
      password === confirmPassword
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Doctor Registration</Text>

      <TextInput
        label="Full Name (as per Medical License)"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TextInput
        label="License Number"
        value={licenseNumber}
        onChangeText={setLicenseNumber}
        style={styles.input}
      />

      <Text style={styles.label}>Medical Council</Text>
      <Picker
        selectedValue={medicalCouncil}
        onValueChange={(itemValue) => setMedicalCouncil(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Select Medical Council" value="" />
        {medicalCouncils.map((council, index) => (
          <Picker.Item key={index} label={council} value={council} />
        ))}
      </Picker>


      <Button
        mode="contained"
        onPress={handleVerifyDoctor}
        loading={isVerifying}
        disabled={isVerifying}
        style={styles.button}
      >
        {isVerified ? 'Verified ✓' : 'Verify License'}
      </Button>

      {/* Display verification details after successful verification */}
      {isVerified && verificationData && (
        <View style={styles.verificationContainer}>
          <Text style={styles.verificationTitle}>Verified Doctor Details:</Text>
          <View style={styles.verificationDetails}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>{verificationData.name}</Text>
            
            <Text style={styles.detailLabel}>Registration Number:</Text>
            <Text style={styles.detailValue}>{verificationData.registration_number}</Text>
            
            <Text style={styles.detailLabel}>Medical Council:</Text>
            <Text style={styles.detailValue}>{verificationData.state_council}</Text>
            
            <Text style={styles.detailLabel}>Year of Registration:</Text>
            <Text style={styles.detailValue}>{verificationData.registration_date}</Text>
            
            <Text style={styles.detailLabel}>Doctor's Qualification:</Text>
            <Text style={styles.detailValue}>{verificationData.qualification}</Text>

            <Text style={styles.detailLabel}>Date of Birth:</Text>
            <Text style={styles.detailValue}>{verificationData.date_of_birth}</Text>
            
            <Text style={styles.detailLabel}>University:</Text>
            <Text style={styles.detailValue}>{verificationData.university}</Text>
          </View>
        </View>
      )}
      
      <TextInput
        label="Clinic Name"
        value={clinicName}
        onChangeText={setClinicName}
        style={styles.input}
      />

      <TextInput
        label="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        style={styles.input}
      />

      <TextInput
        label="Address"
        value={address}
        onChangeText={setAddress}
        style={styles.input}
      />

      <TextInput
        label="Pincode"
        value={pincode}
        onChangeText={setPincode}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        label="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TextInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleSignup}
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
      >
        {isLoading ? 'Signing Up...' : 'Sign Up'}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  verificationContainer: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 10,
  },
  verificationDetails: {
    gap: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: '#1b5e20',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    paddingLeft: 10,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 10,
    marginBottom: 10,
  },
  label: {
    marginBottom: 5,
  },
  picker: {
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  }
});

export default SignupScreen;
