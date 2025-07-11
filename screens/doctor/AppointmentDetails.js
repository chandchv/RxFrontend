import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { API_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AppointmentDetails = ({ route, navigation }) => {
  const { appointmentId } = route.params;
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [previousPrescriptions, setPreviousPrescriptions] = useState([]);

  useEffect(() => {
    fetchAppointmentDetails();
  }, []);

  const fetchAppointmentDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/users/api/doctor/appointments/${appointmentId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch appointment details');
      const data = await response.json();
      setAppointment(data);
      
      // Fetch previous prescriptions after getting appointment details
      if (data.patient_id) {
        fetchPreviousPrescriptions(data.patient_id);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousPrescriptions = async (patientId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/users/api/doctor/prescriptions/patient/${patientId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch previous prescriptions');
      const data = await response.json();
      setPreviousPrescriptions(data.prescriptions || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    }
  };

  const renderPrescriptionItem = ({ item }) => (
    <View style={styles.prescriptionCard}>
      <View style={styles.prescriptionHeader}>
        <Text style={styles.prescriptionDate}>
          Date: {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.follow_up_date && (
          <Text style={styles.followUpDate}>
            Follow-up: {new Date(item.follow_up_date).toLocaleDateString()}
          </Text>
        )}
      </View>

      {item.chief_complaints && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chief Complaints</Text>
          <Text style={styles.sectionText}>{item.chief_complaints}</Text>
        </View>
      )}

      {item.diagnosis && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosis</Text>
          <Text style={styles.sectionText}>{item.diagnosis}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicines</Text>
        {item.medicines.map((medicine, index) => (
          <View key={index} style={styles.medicineItem}>
            <Text style={styles.medicineName}>{medicine.name}</Text>
            <Text style={styles.medicineDetails}>
              {medicine.dosage} - {medicine.duration}
            </Text>
            {medicine.instructions && (
              <Text style={styles.instructions}>{medicine.instructions}</Text>
            )}
          </View>
        ))}
      </View>

      {item.advice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advice</Text>
          <Text style={styles.sectionText}>{item.advice}</Text>
        </View>
      )}
    </View>
  );

  const updateAppointmentStatus = async (newStatus) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/users/api/doctor/appointments/${appointmentId}/update-status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update status');
      }

      Alert.alert('Success', data.message);
      fetchAppointmentDetails();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', error.message || 'Failed to update appointment status');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Appointment Details</Text>
        <Text style={styles.info}>Date: {appointment.appointment_date}</Text>
        <Text style={styles.info}>Time: {appointment.appointment_time}</Text>
        <Text style={styles.info}>Status: {appointment.status}</Text>
        <Text style={styles.info}>Patient: {appointment.patient_name}</Text>
      </View>

      

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('CreatePrescription', {
            patientId: appointment.patient_id,
            appointmentId: appointmentId
          })}>
          <Icon name="medical-services" size={24} color="#fff" />
          <Text style={styles.buttonText}>Create Prescription</Text>
        </TouchableOpacity>

        {appointment.status === 'scheduled' && (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#28a745' }]}
            onPress={() => updateAppointmentStatus('completed')}>
            <Icon name="check-circle" size={24} color="#fff" />
            <Text style={styles.buttonText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}

        {appointment.status === 'scheduled' && (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#FFA000' }]}
            onPress={() => updateAppointmentStatus('missed')}>
            <Icon name="event-busy" size={24} color="#fff" />
            <Text style={styles.buttonText}>Mark as Missed</Text>
          </TouchableOpacity>
        )}
      </View>
      {previousPrescriptions.length > 0 && (
        <View style={styles.prescriptionsSection}>
          <Text style={styles.sectionTitle}>Previous Prescriptions</Text>
          <FlatList
            data={previousPrescriptions}
            renderItem={renderPrescriptionItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>
      )}
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
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#0066cc',
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
  },
  actionButtons: {
    padding: 10,
  },
  button: {
    backgroundColor: '#0066cc',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  prescriptionsSection: {
    marginTop: 20,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0066cc',
  },
  prescriptionCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  prescriptionDate: {
    fontSize: 14,
    color: '#666',
  },
  followUpDate: {
    fontSize: 14,
    color: '#2196F3',
  },
  section: {
    marginBottom: 15,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  medicineItem: {
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#2196F3',
  },
  medicineName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  medicineDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  instructions: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  }
});

export default AppointmentDetails; 