import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const AppointmentsList = () => {
  const navigation = useNavigation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/patient/appointments/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const handleCancelAppointment = async (appointmentId) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${API_URL}/api/patient/appointments/${appointmentId}/cancel/`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                throw new Error('Failed to cancel appointment');
              }

              Alert.alert('Success', 'Appointment cancelled successfully');
              fetchAppointments();
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          },
        },
      ]
    );
  };

  const renderAppointmentItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.appointmentCard,
        item.is_future ? styles.futureAppointment : styles.pastAppointment
      ]}
      onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
    >
      <View style={styles.appointmentHeader}>
        <Text style={styles.doctorName}>Dr. {item.doctor_name}</Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>

      <View style={styles.appointmentInfo}>
        <Text style={styles.dateTime}>
          {new Date(item.appointment_date).toLocaleDateString()} at {item.appointment_time}
        </Text>
        {item.reason && <Text style={styles.reason}>{item.reason}</Text>}
      </View>

      {item.status === 'scheduled' && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelAppointment(item.id)}
        >
          <Icon name="cancel" size={20} color="#F44336" />
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.newButton}
        onPress={() => navigation.navigate('CreateAppointmentPatient')}
      >
        <Icon name="add" size={24} color="#fff" />
        <Text style={styles.newButtonText}>Book New Appointment</Text>
      </TouchableOpacity>

      <FlatList
        data={appointments}
        renderItem={renderAppointmentItem}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No appointments found</Text>
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
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
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  newButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  newButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  futureAppointment: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  pastAppointment: {
    borderLeftWidth: 4,
    borderLeftColor: '#757575',
    opacity: 0.8,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  appointmentInfo: {
    marginTop: 4,
  },
  dateTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reason: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#ffebee',
  },
  cancelButtonText: {
    color: '#F44336',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
    fontSize: 16,
  },
});

export default AppointmentsList;
