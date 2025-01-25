import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const PrescriptionsScreen = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const patientId = await AsyncStorage.getItem('patientId');
      console.log('Fetching prescriptions for Patient ID:', patientId);
      const response = await fetch(`${API_URL}/api/patient/prescriptions/${patientId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch prescriptions');
      }

      const data = await response.json();
      setPrescriptions(data);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setError('Error fetching prescriptions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your Prescriptions</Text>
      {prescriptions.map((prescription) => (
        <View key={prescription.id} style={styles.prescriptionCard}>
          <Text>Doctor: {prescription.doctor.user.get_full_name}</Text>
          <Text>Date: {new Date(prescription.created_at).toLocaleString()}</Text>
          <Button title="View Details" onPress={() => {/* Navigate to prescription details */}} />
        </View>
      ))}
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
    fontWeight: 'bold',
  },
  prescriptionCard: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});

export default PrescriptionsScreen; 