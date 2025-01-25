import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { useNavigation } from '@react-navigation/native';

const DoctorInfo = () => {
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchDoctorInfo();
  }, []);

  const fetchDoctorInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('Fetching doctor info with token:', token); // Debug log
      
      const response = await fetch(`${API_URL}/api/doctor/me/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status); // Debug log

      if (response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        navigation.navigate('Login');
        return;
      }

      const data = await response.json();
      console.log('Doctor info response:', data); // Debug log

      if (response.ok) {
        setDoctorInfo(data);
      } else {
        setError(data.error || 'Failed to fetch doctor info');
      }
    } catch (error) {
      console.error('Error fetching doctor info:', error);
      setError('Failed to fetch doctor information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Try Again" onPress={fetchDoctorInfo} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {doctorInfo ? (
        <>
          <Text style={styles.title}>Doctor Information</Text>
          <Text style={styles.label}>ID: {doctorInfo.id}</Text>
          <Text style={styles.label}>Name: {doctorInfo.user_name}</Text>
          <Text style={styles.label}>License Number: {doctorInfo.license_number}</Text>
          <Text style={styles.label}>Medical Council: {doctorInfo.medical_council}</Text>
          <Text style={styles.label}>Specialization: {doctorInfo.specialization || 'Not specified'}</Text>
          <Text style={styles.label}>Clinic: {doctorInfo.clinic_name || 'Not specified'}</Text>
          <Text style={styles.label}>Clinic Address: {doctorInfo.clinic_address || 'Not specified'}</Text>
          <Text style={styles.label}>Clinic Phone: {doctorInfo.clinic_phone || 'Not specified'}</Text>
          <Text style={styles.label}>Clinic Email: {doctorInfo.clinic_email || 'Not specified'}</Text>
          <Button 
            title="Back to Dashboard" 
            onPress={() => navigation.goBack()} 
          />
        </>
      ) : (
        <Text style={styles.errorText}>No doctor information available</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default DoctorInfo; 