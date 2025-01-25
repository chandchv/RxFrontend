import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const PastAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPastAppointments();
  }, []);

  const fetchPastAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/appointments/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter past appointments
        const pastAppointments = data.filter(appointment => {
          const appointmentDate = new Date(appointment.appointment_date);
          return appointmentDate < new Date(); // Past appointments
        });
        setAppointments(pastAppointments);
      } else {
        setError('Failed to fetch past appointments');
      }
    } catch (error) {
      setError('Error fetching past appointments');
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
      <Text style={styles.title}>Past Appointments</Text>
      {appointments.map((appointment) => (
        <View key={appointment.id} style={styles.appointmentCard}>
          <Text>Patient: {appointment.patient.name}</Text>
          <Text>Date: {new Date(appointment.appointment_date).toLocaleString()}</Text>
          <Button title="View Details" onPress={() => {/* Navigate to appointment details */}} />
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
  appointmentCard: {
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

export default PastAppointments; 