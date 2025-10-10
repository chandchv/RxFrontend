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
  Platform,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, DrawerActions } from '@react-navigation/native';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const PatientDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [healthMetrics, setHealthMetrics] = useState({});
  const [errors, setErrors] = useState({});
  
  const { width } = Dimensions.get('window');

  // Patient Menu Items
  const menuItems = [
    {
      title: 'My Appointments',
      icon: 'event',
      onPress: () => navigation.navigate('AppointmentsList'),
      color: '#4CAF50',
      badge: Array.isArray(appointments) ? appointments.filter(a => a.status === 'scheduled').length : 0
    },
    {
      title: 'My Prescriptions',
      icon: 'description',
      onPress: () => {
        // Scroll to prescriptions section or show first prescription if available
        if (prescriptions.length > 0) {
          navigation.navigate('PrescriptionDetailScreen', { prescriptionId: prescriptions[0].id });
        } else {
          Alert.alert('No Prescriptions', 'You don\'t have any prescriptions yet.');
        }
      },
      color: '#9C27B0',
      badge: Array.isArray(prescriptions) ? prescriptions.length : 0
    },
    {
      title: 'Lab Results',
      icon: 'science',
      onPress: () => navigation.navigate('LabResults'),
      color: '#FF9800',
      badge: Array.isArray(labResults) ? labResults.length : 0
    },
    {
      title: 'Messages',
      icon: 'message',
      onPress: () => navigation.navigate('Messages'),
      color: '#2196F3',
      badge: Array.isArray(messages) ? messages.filter(m => !m.is_read).length : 0
    },
    {
      title: 'Medical History',
      icon: 'history',
      onPress: () => navigation.navigate('MedicalHistory'),
      color: '#607D8B'
    },
    {
      title: 'Health Overview',
      icon: 'favorite',
      onPress: () => navigation.navigate('HealthOverview'),
      color: '#E91E63'
    },
    {
      title: 'Book Appointment',
      icon: 'add-circle',
      onPress: () => navigation.navigate('CreateAppointmentPatient'),
      color: '#00BCD4'
    },
    {
      title: 'Emergency',
      icon: 'local-hospital',
      onPress: () => navigation.navigate('EmergencyInfo'),
      color: '#F44336'
    }
  ];

  useEffect(() => {
    fetchDashboardData();
    console.log('PatientDashboard: Menu items count:', menuItems.length);
  }, []);

  // Add hamburger menu and logout button to header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 15 }}
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        >
          <Icon name="menu" size={28} color="#fff" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 15 }}
          onPress={async () => {
            Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Logout',
                  onPress: async () => {
                    try {
                      await AsyncStorage.multiRemove([
                        'userToken',
                        'refreshToken',
                        'user',
                        'role',
                        'doctorId',
                        'patientId',
                        'clinicId',
                        'userType'
                      ]);
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      });
                    } catch (error) {
                      console.error('Error during logout:', error);
                      Alert.alert('Error', 'Failed to logout. Please try again.');
                    }
                  }
                }
              ]
            );
          }}
        >
          <Icon name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

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

      // Fetch all data in parallel using mobile API endpoints
      const [profileData, appointmentsData, prescriptionsData, medicalHistoryData, labResultsData, messagesData, notificationsData, healthMetricsData] = await Promise.all([
        fetchData('/users/api/patient/me/', 'profile'),
        fetchData('/users/api/patient/appointments/', 'appointments'),
        fetchData('/users/api/patients/prescriptions/', 'prescriptions'),
        fetchData('/users/api/patient/medical-history/', 'medicalHistory'),
        fetchData('/users/api/patient/lab-results/', 'labResults'),
        fetchData('/users/api/patient/messages/', 'messages'),
        fetchData('/notifications/api/mobile/summary/', 'notifications'),
        fetchData('/users/api/patient/health-metrics/', 'healthMetrics')
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

      if (Array.isArray(labResultsData)) {
        setLabResults(labResultsData);
      }

      if (Array.isArray(messagesData)) {
        setMessages(messagesData);
      }

      if (Array.isArray(notificationsData)) {
        setNotifications(notificationsData);
      }

      if (healthMetricsData && !healthMetricsData.error) {
        setHealthMetrics(healthMetricsData);
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

  const renderDashboardCard = (title, count, icon, onPress, error, color = '#2196F3', subtitle = '') => {
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
        style={[cardStyles, { borderLeftColor: color, borderLeftWidth: 4 }]}
        onPress={onPress}
        disabled={Boolean(error)}
      >
        <View style={styles.cardHeader}>
          <Icon name={icon} size={28} color={error ? '#FF5252' : color} />
          <View style={styles.cardContent}>
            <Text style={titleStyles}>{title}</Text>
            {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <Text style={[countStyles, { color: error ? '#FF5252' : color }]}>
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
      contentContainerStyle={styles.contentContainer}
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

      {/* Health Overview Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Overview</Text>
        <View style={styles.healthOverviewContainer}>
          <TouchableOpacity 
            style={[styles.healthCard, { backgroundColor: '#4CAF50' }]} 
            onPress={() => navigation.navigate('HealthOverview')}
          >
            <Icon name="favorite" size={24} color="#fff" />
            <Text style={styles.healthCardTitle}>Health Score</Text>
            <Text style={styles.healthCardValue}>{healthMetrics.health_score || '85'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.healthCard, { backgroundColor: '#2196F3' }]} 
            onPress={() => navigation.navigate('AppointmentsList')}
          >
            <Icon name="event" size={24} color="#fff" />
            <Text style={styles.healthCardTitle}>Appointments</Text>
            <Text style={styles.healthCardValue}>{appointments.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.healthCard, { backgroundColor: '#9C27B0' }]} 
            onPress={() => {
              if (prescriptions.length > 0) {
                navigation.navigate('PrescriptionDetailScreen', { prescriptionId: prescriptions[0].id });
              } else {
                Alert.alert('No Prescriptions', 'You don\'t have any prescriptions yet.');
              }
            }}
          >
            <Icon name="description" size={24} color="#fff" />
            <Text style={styles.healthCardTitle}>Prescriptions</Text>
            <Text style={styles.healthCardValue}>{prescriptions.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.healthCard, { backgroundColor: '#FF9800' }]} 
            onPress={() => navigation.navigate('LabResults')}
          >
            <Icon name="science" size={24} color="#fff" />
            <Text style={styles.healthCardTitle}>Lab Tests</Text>
            <Text style={styles.healthCardValue}>{labResults.length}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: '#4CAF50' }]} 
            onPress={() => navigation.navigate('CreateAppointmentPatient')}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Book Appointment</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: '#2196F3' }]} 
            onPress={() => navigation.navigate('ContactDoctor')}
          >
            <Icon name="phone" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Contact Doctor</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: '#F44336' }]} 
            onPress={() => navigation.navigate('EmergencyInfo')}
          >
            <Icon name="warning" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Emergency</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: '#9C27B0' }]} 
            onPress={() => navigation.navigate('Messages')}
          >
            <Icon name="message" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Messages</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Patient Portal Menu Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Portal</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { backgroundColor: item.color }]}
              onPress={() => {
                console.log('Menu item pressed:', item.title);
                try {
                  item.onPress();
                } catch (error) {
                  console.error('Navigation error:', error);
                  Alert.alert('Navigation Error', `Cannot navigate to ${item.title}: ${error.message}`);
                }
              }}
            >
              <Icon name={item.icon} size={32} color="#fff" />
              <Text style={styles.menuItemText}>{item.title}</Text>
              {item.badge !== undefined && item.badge > 0 && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ textAlign: 'center', marginTop: 10, color: '#666', fontSize: 12 }}>
          Menu Items: {menuItems.length} | Tap any tile to navigate
        </Text>
      </View>

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
  contentContainer: {
    paddingBottom: 20,
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
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 15,
    marginHorizontal: 15,
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
  healthOverviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  healthCard: {
    width: '48%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
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
  healthCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  healthCardValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardContent: {
    flex: 1,
    marginLeft: 10,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  statsContainer: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  menuItem: {
    width: '45%',
    aspectRatio: 1,
    margin: '2.5%',
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  menuBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F44336',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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