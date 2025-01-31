import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PatientDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      // Fetch patient profile
      const profileResponse = await fetch(`${API_URL}/api/patient/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const profileData = await profileResponse.json();
      setPatientData(profileData);

      // Fetch appointments
      const appointmentsResponse = await fetch(`${API_URL}/api/patient/appointments/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const appointmentsData = await appointmentsResponse.json();
      setAppointments(appointmentsData);

      // Fetch prescriptions
      const prescriptionsResponse = await fetch(`${API_URL}/api/patient/prescriptions/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const prescriptionsData = await prescriptionsResponse.json();
      setPrescriptions(prescriptionsData);

      // Fetch lab reports
      const labReportsResponse = await fetch(`${API_URL}/api/patient/lab-reports/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const labReportsData = await labReportsResponse.json();
      setLabReports(labReportsData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const renderDashboardCard = (title, count, icon, onPress) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Icon name={icon} size={32} color="#2196F3" />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardCount}>{count}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, {patientData?.first_name}
        </Text>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Icon name="person" size={24} color="#2196F3" />
          <Text style={styles.profileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardsContainer}>
        {renderDashboardCard(
          'Appointments',
          appointments.length,
          'event',
          () => navigation.navigate('Appointments')
        )}
        {renderDashboardCard(
          'Prescriptions',
          prescriptions.length,
          'description',
          () => navigation.navigate('Prescriptions')
        )}
        {renderDashboardCard(
          'Lab Reports',
          labReports.length,
          'science',
          () => navigation.navigate('LabReports')
        )}
      </View>

      <TouchableOpacity 
        style={styles.newAppointmentButton}
        onPress={() => navigation.navigate('BookAppointment')}
      >
        <Icon name="add" size={24} color="#fff" />
        <Text style={styles.newAppointmentText}>Book New Appointment</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {appointments.length > 0 ? (
          appointments.slice(0, 3).map((appointment) => (
            <TouchableOpacity 
              key={appointment.id}
              style={styles.appointmentCard}
              onPress={() => navigation.navigate('AppointmentDetails', { 
                appointmentId: appointment.id 
              })}
            >
              <Text style={styles.appointmentDate}>
                {new Date(appointment.appointment_date).toLocaleDateString()}
              </Text>
              <Text style={styles.appointmentDoctor}>
                Dr. {appointment.doctor_name}
              </Text>
              <Text style={styles.appointmentStatus}>
                {appointment.status}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDataText}>No upcoming appointments</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Prescriptions</Text>
        {prescriptions.length > 0 ? (
          prescriptions.slice(0, 3).map((prescription) => (
            <TouchableOpacity 
              key={prescription.id}
              style={styles.prescriptionCard}
              onPress={() => navigation.navigate('PrescriptionHistoryScreen', { 
                prescriptionId: prescription.id 
              })}
            >
              <Text style={styles.prescriptionDate}>
                {new Date(prescription.created_at).toLocaleDateString()}
              </Text>
              <Text style={styles.prescriptionDoctor}>
                Dr. {prescription.doctor_name}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDataText}>No recent prescriptions</Text>
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButtonText: {
    marginLeft: 8,
    color: '#2196F3',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  card: {
    width: '30%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  cardCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  newAppointmentButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    elevation: 3,
  },
  newAppointmentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  appointmentCard: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentDoctor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  appointmentStatus: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 4,
  },
  prescriptionCard: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  prescriptionDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  prescriptionDoctor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});

export default PatientDashboard; 