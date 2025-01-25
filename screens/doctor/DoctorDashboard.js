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
      title: 'Prescriptions',
      icon: 'description',
      onPress: () => navigation.navigate('PrescriptionList'),
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
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setDoctorInfo(JSON.parse(userData));
      }
      await Promise.all([
        fetchPatients(),
        fetchAppointments(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/doctor/patients/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setPatients(Array.isArray(data) ? data : []);

    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
      Alert.alert('Error', 'Failed to load patients');
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/doctor/appointments/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const responseText = await response.text();
      console.log('Raw appointments response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('Error parsing appointments JSON:', error);
        throw new Error('Invalid response format');
      }

      const appointmentsArray = Array.isArray(data) ? data : data.results || [];
      setAppointments(appointmentsArray);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayAppts = appointmentsArray.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === today.getTime();
      });

      const upcomingAppts = appointmentsArray.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() > today.getTime();
      });

      setTodayAppointments(todayAppts);
      setUpcomingAppointments(upcomingAppts);

    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
      setTodayAppointments([]);
      setUpcomingAppointments([]);
      Alert.alert('Error', 'Failed to load appointments');
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
        <Text style={styles.headerTitle}>Doctor Dashboard</Text>
        
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
        <Text style={styles.sectionTitle}>Welcome, Dr. {doctorInfo?.name}</Text>
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
                  {new Date(appointment.appointment_date).toLocaleTimeString()}
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
});

export default DoctorDashboard; 