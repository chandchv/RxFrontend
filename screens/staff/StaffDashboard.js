import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const StaffDashboard = ({ navigation }) => {
  const [staffInfo, setStaffInfo] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');

      if (!token) {
        throw new Error('No authentication token found');
      }

      if (userData) {
        const parsedUserData = JSON.parse(userData);
        setStaffInfo(parsedUserData);
      }

      // Fetch today's appointments
      const response = await fetch(`${API_URL}/api/appointments/today/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const data = await response.json();
      setAppointments(data);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
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
        <Text style={styles.title}>Staff Dashboard</Text>
        <Text style={styles.subtitle}>Welcome, {staffInfo?.first_name} {staffInfo?.last_name}</Text>
      </View>

      <View style={styles.content}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.buttonContainer}>
                <Button 
                  title="Manage Appointments" 
                  onPress={() => navigation.navigate('AppointmentList')}
                />
                <Button 
                  title="Register Patient" 
                  onPress={() => navigation.navigate('PatientRegistration')}
                />
                <Button 
                  title="View Schedule" 
                  onPress={() => navigation.navigate('Schedule')}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Appointments</Text>
              {appointments.length > 0 ? (
                appointments.map((appointment) => (
                  <View key={appointment.id} style={styles.appointmentCard}>
                    <Text style={styles.patientName}>
                      Patient: {appointment.patient_name}
                    </Text>
                    <Text style={styles.doctorName}>
                      Doctor: Dr. {appointment.doctor_name}
                    </Text>
                    <Text style={styles.time}>
                      Time: {new Date(appointment.appointment_date).toLocaleTimeString()}
                    </Text>
                    <Button 
                      title="View Details"
                      onPress={() => navigation.navigate('AppointmentDetails', { 
                        appointmentId: appointment.id 
                      })}
                    />
                  </View>
                ))
              ) : (
                <Text style={styles.noData}>No appointments scheduled for today</Text>
              )}
            </View>
          </>
        )}
      </View>

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#444',
  },
  buttonContainer: {
    gap: 10,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  doctorName: {
    fontSize: 14,
    color: '#666',
    marginVertical: 5,
  },
  time: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    margin: 20,
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
});

export default StaffDashboard; 