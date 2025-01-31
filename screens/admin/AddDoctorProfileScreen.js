import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

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

];

const AddDoctorProfileScreen = ({ route, navigation }) => {
  // Get clinicId from route params
  const { clinicId } = route.params || {};
  console.log('Clinic ID:', clinicId); // Debug log

  // Verification state
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [medicalCouncil, setMedicalCouncil] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Additional profile state
  const [isVerified, setIsVerified] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [specialization, setSpecialization] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);

  const getCsrfToken = async () => {
    try {
      const response = await fetch(`${API_URL}/api/get-csrf-token/`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to get CSRF token');
      }
    } catch (error) {
      console.error('Error getting CSRF token:', error);
    }
  };

  const verifyDoctor = async () => {
    if (!name || !licenseNumber || !medicalCouncil) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsVerifying(true);
    console.log('Starting verification process...');

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/verify-doctor/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          registration_number: licenseNumber,
          state_council: medicalCouncil,
        }),
      });

      const data = await response.json();
      console.log('Raw verification response:', data);

      if (response.ok && data.success) {
        // The verification data is in data.data
        const verifiedData = data.data;
        console.log('Verified data:', verifiedData);

        if (verifiedData) {
          setIsVerified(true);
          setVerificationData(verifiedData.verification_details);
          
          // Update form with verified data
          setName(verifiedData.name || '');
          setLicenseNumber(verifiedData.registration_number || '');
          setMedicalCouncil(verifiedData.state_council || '');
          
          Alert.alert(
            'Verification Successful',
            'Doctor verified successfully! Please complete the profile.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Verification Failed', 'No verification data received');
        }
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Failed to verify doctor details');
    } finally {
      setIsVerifying(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const createProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      
      // Add clinic ID to form data
      formData.append('clinic', clinicId);
      
      // Add verified data
      formData.append('name', name);
      formData.append('license_number', licenseNumber);
      formData.append('medical_council', medicalCouncil);
      formData.append('verification_details', JSON.stringify(verificationData));
      
      // Add additional data
      formData.append('specialization', specialization);
      formData.append('consultation_fee', consultationFee);
      formData.append('email', verificationData?.email || '');
      
      if (profilePicture) {
        formData.append('profile_picture', {
          uri: profilePicture,
          type: 'image/jpeg',
          name: 'profile.jpg',
        });
      }

      console.log('Submitting form data:', Object.fromEntries(formData)); // Debug log

      const response = await fetch(`${API_URL}/doctors/api/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      console.log('Server response:', data); // Debug log

      if (response.ok) {
        Alert.alert('Success', 'Doctor profile created successfully!');
        navigation.goBack();
      } else {
        throw new Error(data.message || 'Failed to create profile');
      }
    } catch (error) {
      console.error('Profile creation error:', error);
      Alert.alert('Error', 'Failed to create doctor profile');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>Add Doctor Profile</Text>

        {!isVerified ? (
          // Verification Form
          <>
            <TextInput
              style={styles.input}
              placeholder="Full Name (as registered)"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="License Number"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
            />

            <Text style={styles.label}>Medical Council</Text>
            <Picker
              selectedValue={medicalCouncil}
              onValueChange={setMedicalCouncil}
              style={styles.picker}
            >
              <Picker.Item label="Select Medical Council" value="" />
              {medicalCouncils.map((council, index) => (
                <Picker.Item key={index} label={council} value={council} />
              ))}
            </Picker>

            <TouchableOpacity
              style={[styles.button, isVerifying && styles.buttonDisabled]}
              onPress={verifyDoctor}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Verify Doctor</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          // Additional Profile Details Form
          <>
            <View style={styles.verifiedBanner}>
              <Text style={styles.verifiedText}>✓ Doctor Verified</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Specialization"
              value={specialization}
              onChangeText={setSpecialization}
            />

            <TextInput
              style={styles.input}
              placeholder="Consultation Fee"
              value={consultationFee}
              onChangeText={setConsultationFee}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.profileImage} />
              ) : (
                <Text>Add Profile Picture</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={createProfile}
            >
              <Text style={styles.buttonText}>Create Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  innerContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifiedBanner: {
    backgroundColor: '#e6ffe6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  verifiedText: {
    color: '#008000',
    fontSize: 16,
    textAlign: 'center',
  },
  imageButton: {
    height: 150,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});

export default AddDoctorProfileScreen; 