import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DrawerActions } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import LogoutButton from '../../components/LogoutButton';
import { useAuth } from '../../contexts/AuthContext';
import createApiClient from '../../utils/apiClient';
import { LinearGradient } from 'expo-linear-gradient';

const Drawer = createDrawerNavigator({
  // Your screens here
});

const DoctorDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [error, setError] = useState(null);
  const { user, makeAuthenticatedRequest } = useAuth();
  const apiClient = createApiClient();
  const [patient_data, setPatientData] = useState([]);
  
  const { width } = Dimensions.get('window');

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
      color: '#4CAF50',
      badge: pendingAppointments.length
    },
    {
      title: 'Messages',
      icon: 'message',
      onPress: () => navigation.navigate('DoctorMessages'),
      color: '#2196F3',
      badge: messages.filter(m => !m.is_read).length
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      onPress: () => navigation.navigate('DoctorNotifications'),
      color: '#FF9800',
      badge: notifications.filter(n => !n.is_read).length
    },
    {
      title: 'My Patients',
      icon: 'people',
      onPress: () => navigation.navigate('PatientListScreen'),
      color: '#9C27B0'
    },
    {
      title: 'Analytics',
      icon: 'analytics',
      onPress: () => navigation.navigate('DoctorAnalytics'),
      color: '#607D8B'
    },
    {
      title: 'Create Prescription',
      icon: 'description',
      onPress: () => navigation.navigate('CreatePrescription'),
      color: '#795548'
    },
    {
      title: 'Add Patient',
      icon: 'person-add',
      onPress: () => navigation.navigate('AddPatient'),
      color: '#E91E63'
    },
    {
      title: 'Generate Slots',
      icon: 'schedule',
      onPress: () => navigation.navigate('GenerateSlots'),
      color: '#3F51B5'
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
      
      // Fetch all data in parallel
      const [dashboardResponse, patientsResponse, messagesResponse, notificationsResponse, analyticsResponse] = await Promise.all([
        makeAuthenticatedRequest('/users/api/doctor/dashboard/'),
        makeAuthenticatedRequest('/users/api/doctor/patients/'),
        makeAuthenticatedRequest('/users/api/doctor/messages/'),
        makeAuthenticatedRequest('/users/api/doctor/notifications/'),
        makeAuthenticatedRequest('/users/api/doctor/analytics/')
      ]);

      // Process dashboard data
      if (dashboardResponse?.ok) {
        const dashboardData = await dashboardResponse.json();
        console.log('Dashboard data received:', dashboardData);
        
        setDoctorInfo(dashboardData.doctor);
        
        const todayAppts = dashboardData.todays_appointments || [];
        const upcomingAppts = dashboardData.upcoming_appointments || [];
        const pendingAppts = dashboardData.pending_appointments || [];
        
        setTodayAppointments(todayAppts);
        setUpcomingAppointments(upcomingAppts);
        setPendingAppointments(pendingAppts);
        setAppointments([...todayAppts, ...upcomingAppts, ...pendingAppts]);
      }

      // Process patients data
      if (patientsResponse?.ok) {
        const patientsData = await patientsResponse.json();
        const patientsArray = patientsData.patients || [];
        setPatients(patientsArray);
        setPatientData(patientsArray);
      }

      // Process messages data
      if (messagesResponse?.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages || []);
      }

      // Process notifications data
      if (notificationsResponse?.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.notifications || []);
      }

      // Process analytics data
      if (analyticsResponse?.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData.analytics || {});
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderDashboardCard = (title, value, icon, color, onPress, subtitle = '') => (
    <TouchableOpacity style={[styles.dashboardCard, { borderLeftColor: color, borderLeftWidth: 4 }]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Icon name={icon} size={24} color={color} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </TouchableOpacity>
  );

  const renderQuickActionButton = (title, icon, color, onPress) => (
    <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: color }]} onPress={onPress}>
      <Icon name={icon} size={20} color="#fff" />
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const renderPendingAppointment = (appointment) => (
    <TouchableOpacity
      key={appointment.id}
      style={styles.pendingAppointmentCard}
      onPress={() => navigation.navigate('AppointmentApproval', { appointmentId: appointment.id })}
    >
      <View style={styles.appointmentHeader}>
        <Text style={styles.patientName}>{appointment.patient_name}</Text>
        <View style={styles.appointmentActions}>
          <TouchableOpacity style={[styles.actionButton, styles.approveButton]}>
            <Icon name="check" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.rejectButton]}>
            <Icon name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.appointmentTime}>{appointment.appointment_time}</Text>
      <Text style={styles.appointmentReason}>{appointment.reason}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
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
          colors={['#0066cc']}
          tintColor="#0066cc"
        />
      }
    >
      {/* Header with Doctor Info */}
      <LinearGradient
        colors={['#0066cc', '#004499']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.doctorInfo}>
            <Text style={styles.headerTitle}>
              Welcome, Dr. {doctorInfo?.user?.first_name || user?.firstName || ''} {doctorInfo?.user?.last_name || user?.lastName || ''}
            </Text>
            <Text style={styles.doctorSpecialization}>
              {doctorInfo?.specialization || 'General Medicine'}
            </Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Icon name="person" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Dashboard Overview Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Practice Overview</Text>
        <View style={styles.overviewGrid}>
          {renderDashboardCard(
            'Today\'s Appointments',
            todayAppointments.length,
            'event',
            '#4CAF50',
            () => navigation.navigate('AppointmentsList'),
            'scheduled'
          )}
          {renderDashboardCard(
            'Pending Approvals',
            pendingAppointments.length,
            'pending',
            '#FF9800',
            () => navigation.navigate('AppointmentApproval'),
            'awaiting'
          )}
          {renderDashboardCard(
            'Unread Messages',
            messages.filter(m => !m.is_read).length,
            'message',
            '#2196F3',
            () => navigation.navigate('DoctorMessages'),
            'new'
          )}
          {renderDashboardCard(
            'Total Patients',
            patients.length,
            'people',
            '#9C27B0',
            () => navigation.navigate('PatientListScreen'),
            'registered'
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {renderQuickActionButton('New Appointment', 'add', '#4CAF50', () => navigation.navigate('CreateAppointment'))}
          {renderQuickActionButton('Create Prescription', 'description', '#2196F3', () => navigation.navigate('CreatePrescription'))}
          {renderQuickActionButton('Add Patient', 'person-add', '#9C27B0', () => navigation.navigate('AddPatient'))}
          {renderQuickActionButton('View Analytics', 'analytics', '#607D8B', () => navigation.navigate('DoctorAnalytics'))}
        </View>
      </View>

      {/* Pending Appointments */}
      {pendingAppointments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Approvals</Text>
          {pendingAppointments.map(renderPendingAppointment)}
        </View>
      )}

      {/* Enhanced Menu Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Practice Management</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { backgroundColor: item.color }]}
              onPress={item.onPress}
            >
              <View style={styles.menuItemContent}>
                <Icon name={item.icon} size={28} color="#fff" />
                <Text style={styles.menuText}>{item.title}</Text>
                {item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doctorInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  doctorSpecialization: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dashboardCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardContent: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  pendingAppointmentCard: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  appointmentReason: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
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
  menuItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  menuText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
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
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DoctorDashboard; 