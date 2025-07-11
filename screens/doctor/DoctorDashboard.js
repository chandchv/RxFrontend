import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DrawerActions } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import LogoutButton from '../../components/LogoutButton';
import { useAuth } from '../../contexts/AuthContext';
import createApiClient from '../../utils/apiClient';

const Drawer = createDrawerNavigator({
  // Your screens here
});

const DoctorDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [error, setError] = useState(null);
  const { user, makeAuthenticatedRequest } = useAuth();
  const apiClient = createApiClient();
  const [patient_data, setPatientData] = useState([]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <LogoutButton />,
    });
  }, [navigation]);

  const menuItems = [
    {
      title: 'Appointments',
      icon: 'event',
      onPress: () => navigation.navigate('AppointmentsList'),
      color: '#4CAF50'
    },
    {
      title: 'Create Appointment',
      icon: 'add-circle',
      onPress: () => navigation.navigate('CreateAppointment'),
      color: '#2196F3'
    },
    {
      title: 'Add Patient',
      icon: 'person-add',
      onPress: () => navigation.navigate('AddPatient'),
      color: '#9C27B0'
    },
    {
      title: 'My Patients',
      icon: 'people',
      onPress: () => navigation.navigate('PatientListScreen'),
      color: '#FF9800'
    },
    {
      title: 'Prescription List',
      icon: 'description',
      onPress: () => navigation.navigate('PrescriptionListScreen'),
      color: '#607D8B'
    },
    {
      title: 'Profile',
      icon: 'account-circle',
      onPress: () => navigation.navigate('DoctorProfile'),
      color: '#795548'
    },
    {
      title: 'Generate Slots',
      icon: 'schedule',
      onPress: () => navigation.navigate('GenerateSlots'),
      color: '#795548'
    }
  ];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

   const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard data (includes appointments and other info)
      const dashboardResponse = await makeAuthenticatedRequest('/users/api/doctor/dashboard/');
      if (dashboardResponse?.ok) {
        const dashboardData = await dashboardResponse.json();
        console.log('Dashboard data received:', dashboardData);
        
        // Set doctor info
        setDoctorInfo(dashboardData.doctor);
        
        // Extract appointments from dashboard data
        const todayAppts = dashboardData.todays_appointments || [];
        const upcomingAppts = dashboardData.upcoming_appointments || [];
        
        setTodayAppointments(todayAppts);
        setUpcomingAppointments(upcomingAppts);
        setAppointments([...todayAppts, ...upcomingAppts]);
      } else {
        console.error('Failed to fetch dashboard data:', dashboardResponse?.status);
      }

      // Fetch patients separately
      const patientsResponse = await makeAuthenticatedRequest('/users/api/doctor/patients/');
      if (patientsResponse?.ok) {
        const patientsData = await patientsResponse.json();
        console.log('Patients data received:', patientsData);
        
        // patientsData has structure: { patients: [...] }
        const patientsArray = patientsData.patients || [];
        setPatients(patientsArray);
        setPatientData(patientsArray);
      } else {
        console.error('Failed to fetch patients:', patientsResponse?.status);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Welcome, Dr. {doctorInfo?.user?.first_name || user?.firstName || ''} {doctorInfo?.user?.last_name || user?.lastName || ''}
        </Text>
      </View>

      <View style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, { backgroundColor: item.color }]}
            onPress={item.onPress}
          >
            <Icon name={item.icon} size={32} color="#fff" />
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Doctor Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Welcome, Dr. {user?.firstName || user?.username}</Text>
        {error && <Text style={styles.errorText}>Error: {error}</Text>}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateAppointmentDoctor')}
        >
          <Icon name="add" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>New Appointment</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Appointments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Appointments</Text>
        {todayAppointments.length === 0 ? (
          <Text style={styles.emptyText}>No appointments for today</Text>
        ) : (
          todayAppointments.map((appointment) => (
            <TouchableOpacity
              key={appointment.id}
              style={styles.appointmentCard}
              onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: appointment.id })}
            >
              <View style={styles.appointmentHeader}>
                <Text style={styles.patientName}>{appointment.patient_name || 'Unknown Patient'}</Text>
                <Text style={styles.appointmentTime}>
                  {appointment.appointment_time || 'No time set'}
                </Text>
              </View>
              <Text style={styles.appointmentStatus}>Status: {appointment.status}</Text>
              {appointment.reason && (
                <Text style={styles.appointmentReason}>Reason: {appointment.reason}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Upcoming Appointments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {upcomingAppointments.length === 0 ? (
          <Text style={styles.emptyText}>No upcoming appointments</Text>
        ) : (
          upcomingAppointments.map((appointment) => (
            <TouchableOpacity
              key={appointment.id}
              style={styles.appointmentCard}
              onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: appointment.id })}
            >
              <View style={styles.appointmentHeader}>
                <Text style={styles.patientName}>{appointment.patient_name || 'Unknown Patient'}</Text>
                <Text style={styles.appointmentDate}>
                  {new Date(appointment.appointment_date).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.appointmentStatus}>Status: {appointment.status}</Text>
              {appointment.reason && (
                <Text style={styles.appointmentReason}>Reason: {appointment.reason}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Recent Patients */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Patients</Text>
        {patients.length === 0 ? (
          <Text style={styles.emptyText}>No patients found</Text>
        ) : (
          patients.slice(0, 10).map((patient) => (
            <TouchableOpacity
              key={patient.id}
              style={styles.patientCard}
              onPress={() => navigation.navigate('PatientDetails', { patientId: patient.id })}
            >
              <Text style={styles.patientName}>
                {`${patient.first_name || ''} ${patient.last_name || ''}`}
              </Text>
              {patient.age && patient.gender && (
                <Text style={styles.patientInfo}>
                  {patient.age} years • {patient.gender === 'M' ? 'Male' : 'Female'}
                </Text>
              )}
            </TouchableOpacity>
          ))
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '45%',
    aspectRatio: 1.2,
    borderRadius: 10,
    padding: 12,
    margin: 6,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  menuText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  appointmentCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '500',
  },
  appointmentTime: {
    color: '#666',
  },
  appointmentDate: {
    color: '#666',
  },
  appointmentStatus: {
    color: '#666',
    fontSize: 14,
  },
  patientCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  patientInfo: {
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DoctorDashboard; 