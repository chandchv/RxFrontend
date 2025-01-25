import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import Icon from 'react-native-vector-icons/MaterialIcons';

const PatientDetails = ({ route }) => {
  const { patientId } = route.params;
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Start with just patient details
      const response = await fetch(`${API_URL}/api/doctor/patient/${patientId}/`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      });

      console.log('Response status:', response.status); // Debug log

      if (!response.ok) {
        throw new Error('Failed to fetch patient details');
      }

      const data = await response.json();
      console.log('Patient data:', data); // Debug log

      if (data.patient) {
        setPatient(data.patient);
      }

    } catch (error) {
      console.error('Error fetching patient data:', error);
      Alert.alert('Error', 'Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Patient not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.title}>{patient.first_name} {patient.last_name}</Text>
        <Text style={styles.info}>Age: {patient.age || calculateAge(patient.date_of_birth)}</Text>
        <Text style={styles.info}>Gender: {patient.gender}</Text>
        <Text style={styles.info}>Email: {patient.email}</Text>
        <Text style={styles.info}>Phone: {patient.phone_number}</Text>
      </View>

      {/* Medical History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical History</Text>
        {medicalHistory.map((record, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.cardTitle}>{record.condition}</Text>
            <Text style={styles.cardDate}>{new Date(record.date).toLocaleDateString()}</Text>
            <Text style={styles.cardText}>{record.notes}</Text>
          </View>
        ))}
      </View>

      {/* Prescriptions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prescriptions</Text>
        {prescriptions.map((prescription, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.cardTitle}>{prescription.medication}</Text>
            <Text style={styles.cardDate}>
              {new Date(prescription.date_prescribed).toLocaleDateString()}
            </Text>
            <Text style={styles.cardText}>Dosage: {prescription.dosage}</Text>
            <Text style={styles.cardText}>Duration: {prescription.duration}</Text>
          </View>
        ))}
      </View>

      {/* Past Appointments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Past Appointments</Text>
        {pastAppointments.map((appointment, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.cardTitle}>
              {new Date(appointment.appointment_date).toLocaleDateString()}
            </Text>
            <Text style={styles.cardText}>Time: {appointment.appointment_time}</Text>
            <Text style={styles.cardText}>Status: {appointment.status}</Text>
            <Text style={styles.cardText}>Notes: {appointment.notes}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#0066cc',
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default PatientDetails; 