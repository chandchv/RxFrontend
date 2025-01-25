import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const PatientMedicalHistory = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState({
    pastAppointments: [],
    prescriptions: [],
  });

  useEffect(() => {
    const fetchMedicalHistory = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_URL}/api/patient/medical-history/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch medical history');
        }

        const data = await response.json();
        setMedicalHistory(data);
      } catch (error) {
        setError(error.message || 'Error loading medical history');
      } finally {
        setLoading(false);
      }
    };

    fetchMedicalHistory();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medical History</Text>

      <Text style={styles.subtitle}>Past Appointments</Text>
      <FlatList
        data={medicalHistory.pastAppointments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>Date: {item.appointment_date}</Text>
            <Text>Doctor: Dr. {item.doctor_name}</Text>
            <Text>Reason: {item.reason || 'Not specified'}</Text>
            <Text>Status: {item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.noData}>No past appointments found</Text>}
      />

      <Text style={styles.subtitle}>Prescriptions</Text>
      <FlatList
        data={medicalHistory.prescriptions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>Date: {item.date}</Text>
            <Text>Doctor: Dr. {item.doctor_name}</Text>
            <Text>Diagnosis: {item.diagnosis}</Text>
            <Text>Medications: {item.medications}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.noData}>No prescriptions found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    margin: 20,
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
});

export default PatientMedicalHistory; 