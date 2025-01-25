import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { API_URL } from '../config';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

const PatientScreen = () => {
  const[patientId, setPatientId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const navigation = useNavigation();
  useEffect(() => {
    // Auto-generate a patient ID when the component mounts
    const generatePatientId = () => {
        // Example: Generate a random number between 1 and 1000
        const randomId = Math.floor(Math.random() * 1000) + 1;
        setPatientId(randomId.toString());
    };

    generatePatientId();
  }, []);
  const handleSubmit = async () => {
    if (!firstName || !lastName || !dateOfBirth || !gender || !phoneNumber || !email || !address || !pincode) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/patients/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientId,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dateOfBirth,
          gender: gender,
          phone_number: phoneNumber,
          email: email,
          address: address,
          pincode: pincode,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Patient details submitted successfully'[
        {
            text: 'OK',
            onPress: () => navigation.replace('Dashboard')
          }
        ]);
        // Reset form fields
        setPatientId('');
        setFirstName('');
        setLastName('');
        setDateOfBirth('');
        setGender('');
        setPhoneNumber('');
        setEmail('');
        setAddress('');
        setPincode('');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to submit patient details');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error or server not responding. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>New Patient Registration</Text>
      <Text>Patient ID: {patientId}</Text>
      <TextInput
        label="First Name"
        value={firstName}
        onChangeText={setFirstName}
        style={styles.input}
      />
      <TextInput
        label="Last Name"
        value={lastName}
        onChangeText={setLastName}
        style={styles.input}
      />
      <TextInput
        label="Date of Birth"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        style={styles.input}
        placeholder="YYYY-MM-DD"
      />
      <TextInput
        label="Gender"
        value={gender}
        onChangeText={setGender}
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
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
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

      <Button mode="contained" onPress={handleSubmit} style={styles.button}>
        Register
      </Button>
      <Button title="Back to Dashboard" onPress={() => navigation.navigate('Dashboard')} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  },
});

export default PatientScreen;
