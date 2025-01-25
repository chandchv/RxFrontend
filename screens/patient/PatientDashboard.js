import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const PatientDashboard = ({ navigation }) => {
  const [patientInfo, setPatientInfo] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {

    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      const id = await AsyncStorage.getItem('id');

      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Token:', token);
      console.log('User Data:', userData);
      console.log('Patient number:', id);

      if (userData) {
        const parsedUserData = JSON.parse(userData);
        setPatientInfo(parsedUserData);
      }

      // Fetch prescriptions
      const response = await fetch(`${API_URL}/api/patient/prescriptions/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('Prescriptions Response Status:', response.status);
      
      const responseText = await response.text();
      console.log('Raw Prescriptions Response:', responseText);

      if (!response.ok) {
        throw new Error(responseText || 'Failed to fetch prescriptions');
      }

      const data = JSON.parse(responseText);
      console.log('Parsed Prescriptions:', data);
      setPrescriptions(data);

      // Fetch appointments
      
      const appointmentsResponse = await fetch(`${API_URL}/api/patient/appointments/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('Appointments Response Status:', appointmentsResponse.status);
      
      const appointmentsText = await appointmentsResponse.text();
      console.log('Raw Appointments Response:', appointmentsText);

      if (!appointmentsResponse.ok) {
        throw new Error(`Failed to fetch appointments: ${appointmentsText}`);
      }

      const appointmentsData = JSON.parse(appointmentsText);
      console.log('Parsed Appointments:', appointmentsData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Welcome, {patientInfo?.first_name} {patientInfo?.last_name}
        </Text>
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={styles.content}>
          
          
          <Text style={styles.subtitle}>Your Prescriptions</Text>
          {prescriptions.length > 0 ? (
            prescriptions.map((prescription) => (
              <View key={prescription.id} style={styles.prescriptionCard}>
                <Text style={styles.doctorName}>Dr. {prescription.doctor_name}</Text>
                <Text style={styles.date}>
                  {new Date(prescription.created_at).toLocaleDateString()}
                </Text>
                {prescription.diagnosis && (
                  <Text style={styles.diagnosis}>Diagnosis: {prescription.diagnosis}</Text>
                )}
                {prescription.items && prescription.items.length > 0 && (
                  <View style={styles.medicationList}>
                    <Text style={styles.medicationTitle}>Medications:</Text>
                    {prescription.items.map((item, index) => (
                      <Text key={index} style={styles.medication}>
                        • {item.medicine} - {item.dosage}
                        {item.duration && ` for ${item.duration} ${item.duration_unit || 'days'}`}
                      </Text>
                    ))}
                  </View>
                )}
                <Button
                  title="View Details"
                  onPress={() => navigation.navigate('PrescriptionDetail', { 
                    prescriptionId: prescription.id 
                  })}
                />
              </View>
            ))
          ) : (
            <Text style={styles.noData}>No prescriptions found</Text>
          )}
          
          
          
         
          </View>
      )}

      <Button title="Logout" onPress={handleLogout} color="#ff0000" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#444',
  },
  prescriptionCard: {
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
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  date: {
    color: '#666',
    marginVertical: 5,
  },
  diagnosis: {
    marginVertical: 5,
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
  medicationList: {
    marginTop: 10,
    marginBottom: 10,
  },
  medicationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#444',
  },
  medication: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    marginBottom: 3,
  },
});

export default PatientDashboard; 