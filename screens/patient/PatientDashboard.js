import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PatientDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh dashboard data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrors({});
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Helper function to handle API calls
      const fetchData = async (endpoint, errorKey) => {
        try {
          const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return await response.json();
        } catch (error) {
          console.error(`Error fetching ${errorKey}:`, error);
          setErrors(prev => ({
            ...prev,
            [errorKey]: `Failed to fetch ${errorKey}`
          }));
          return [];
        }
      };

      // Fetch all data in parallel
      const [profileData, appointmentsData, prescriptionsData, medicalHistoryData] = await Promise.all([
        fetchData('/users/api/patient/me/', 'profile'),
        fetchData('/users/api/patient/appointments/', 'appointments'),
        fetchData('/users/api/patients/prescriptions/', 'prescriptions'),
        fetchData('/users/api/patient/medical-history/', 'medicalHistory')
      ]);

      // Update state only if data is valid
      if (profileData && !profileData.error) {
        setPatientData(profileData);
      }

      if (Array.isArray(appointmentsData)) {
        setAppointments(appointmentsData);
      }

      if (Array.isArray(prescriptionsData)) {
        setPrescriptions(prescriptionsData);
      }

      if (Array.isArray(medicalHistoryData)) {
        setMedicalHistory(medicalHistoryData);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setErrors(prev => ({
        ...prev,
        general: error.message || 'Failed to load dashboard data'
      }));
      Alert.alert(
        'Error',
        'Some data could not be loaded. Please try again later or contact support if the problem persists.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const renderDashboardCard = (title, count, icon, onPress, error) => {
    const cardStyles = [styles.card];
    const titleStyles = [styles.cardTitle];
    const countStyles = [styles.cardCount];
    
    if (error) {
      cardStyles.push(styles.cardError);
      titleStyles.push(styles.cardTitleError);
      countStyles.push(styles.cardCountError);
    }
    
    return (
      <TouchableOpacity 
        style={cardStyles}
        onPress={onPress}
        disabled={Boolean(error)}
      >
        <Icon name={icon} size={32} color={error ? '#FF5252' : '#2196F3'} />
        <Text style={titleStyles}>{title}</Text>
        <Text style={countStyles}>
          {error ? 'Error' : count}
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </TouchableOpacity>
    );
  };

  const renderAppointmentItem = (appointment) => (
    <TouchableOpacity 
      key={appointment.id}
      style={styles.appointmentCard}
      onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: appointment.id })}
    >
      <View style={styles.appointmentHeader}>
        <Text style={styles.appointmentDate}>
          {new Date(appointment.appointment_date).toLocaleDateString()}
        </Text>
        <Text style={[
          styles.appointmentStatus,
          appointment.status === 'completed' && styles.statusCompleted,
          appointment.status === 'cancelled' && styles.statusCancelled,
          appointment.status === 'pending' && styles.statusPending
        ]}>
          {appointment.status}
        </Text>
      </View>
      <Text style={styles.appointmentDoctor}>
        Dr. {appointment.doctor_name}
      </Text>
      <Text style={styles.appointmentTime}>
        {new Date(appointment.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>
  );

  const renderPrescriptionItem = (prescription) => (
    <TouchableOpacity 
      key={prescription.id}
      style={styles.prescriptionCard}
      onPress={() => navigation.navigate('PrescriptionDetailScreen', { prescriptionId: prescription.id })}
    >
      <View style={styles.prescriptionHeader}>
        <Text style={styles.prescriptionDate}>
          {new Date(prescription.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.prescriptionStatus}>
          {prescription.status}
        </Text>
      </View>
      <Text style={styles.prescriptionDoctor}>
        Dr. {prescription.doctor_name}
      </Text>
      <Text style={styles.prescriptionNotes} numberOfLines={2}>
        {prescription.notes || 'No additional notes'}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#2196F3']}
          tintColor="#2196F3"
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Welcome, {patientData?.first_name}
          </Text>
          <Text style={styles.patientId}>
            ID: {patientData?.patient_id}
          </Text>
        </View>
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
          () => navigation.navigate('AppointmentsList'),
          errors.appointments
        )}
        {renderDashboardCard(
          'Prescriptions',
          prescriptions.length,
          'description',
          () => navigation.navigate('PrescriptionDetailScreen'),
          errors.prescriptions
        )}
        {renderDashboardCard(
          'Medical History',
          medicalHistory.length,
          'history',
          () => navigation.navigate('MedicalHistory'),
          errors.medicalHistory
        )}
      </View>

      <TouchableOpacity 
        style={styles.newAppointmentButton}
        onPress={() => navigation.navigate('CreateAppointmentPatient')}
      >
        <Icon name="add" size={24} color="#fff" />
        <Text style={styles.newAppointmentText}>Book New Appointment</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {appointments.length > 0 ? (
          appointments
            .filter(app => new Date(app.appointment_date) >= new Date())
            .slice(0, 3)
            .map(renderAppointmentItem)
        ) : (
          <Text style={styles.noDataText}>No upcoming appointments</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Prescriptions</Text>
        {prescriptions.length > 0 ? (
          prescriptions.slice(0, 3).map(renderPrescriptionItem)
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  patientId: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 8,
    borderRadius: 8,
  },
  profileButtonText: {
    marginLeft: 8,
    color: '#2196F3',
    fontWeight: '500',
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardError: {
    borderColor: '#FF5252',
    borderWidth: 1,
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  cardTitleError: {
    color: '#FF5252',
  },
  cardCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  cardCountError: {
    color: '#FF5252',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  newAppointmentButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
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
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
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
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  appointmentDoctor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  appointmentStatus: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  statusCompleted: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  statusCancelled: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  statusPending: {
    backgroundColor: '#fff3e0',
    color: '#ef6c00',
  },
  prescriptionCard: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prescriptionDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  prescriptionStatus: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  prescriptionDoctor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  prescriptionNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
});

export default PatientDashboard; 