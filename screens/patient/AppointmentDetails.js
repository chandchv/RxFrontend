import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AppointmentDetails = ({ route, navigation }) => {
  const { appointmentId } = route.params;
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointmentDetails();
  }, []);

  const fetchAppointmentDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/users/api/appointments/${appointmentId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch appointment details');
      }

      const data = await response.json();
      setAppointment(data);
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      Alert.alert('Error', 'Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(
                `${API_URL}/users/api/appointments/${appointmentId}/cancel/`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (!response.ok) {
                throw new Error('Failed to cancel appointment');
              }

              Alert.alert('Success', 'Appointment cancelled successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('PatientDashboard'),
                },
              ]);
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Appointment not found</Text>
      </View>
    );
  }

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FFC107';
      case 'cancelled':
        return '#F44336';
      case 'completed':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.statusContainer}>
            <Text style={[styles.status, { color: getStatusColor(appointment.status) }]}>
              {appointment.status}
            </Text>
          </View>
          <Text style={styles.appointmentId}>ID: {appointment.id}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Icon name="event" size={20} color="#666" />
            <Text style={styles.infoText}>
              {new Date(appointment.appointment_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="access-time" size={20} color="#666" />
            <Text style={styles.infoText}>{appointment.appointment_time}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor</Text>
          <View style={styles.infoRow}>
            <Icon name="person" size={20} color="#666" />
            <Text style={styles.infoText}>Dr. {appointment.doctor_name}</Text>
          </View>
          {appointment.doctor_specialization && (
            <View style={styles.infoRow}>
              <Icon name="local-hospital" size={20} color="#666" />
              <Text style={styles.infoText}>{appointment.doctor_specialization}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for Visit</Text>
          <Text style={styles.reasonText}>{appointment.reason || 'No reason provided'}</Text>
        </View>

        {appointment.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        )}

        {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
          <Button
            mode="contained"
            onPress={handleCancelAppointment}
            style={styles.cancelButton}
            color="#F44336"
          >
            Cancel Appointment
          </Button>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  appointmentId: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  reasonText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cancelButton: {
    marginTop: 16,
  },
});

export default AppointmentDetails; 