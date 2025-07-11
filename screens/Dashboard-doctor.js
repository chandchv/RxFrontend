import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Dimensions,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config';
import CustomHeader from '../components/CustomHeader';

const DoctorDashboard = ({ navigation }) => {
  const [doctorData, setDoctorData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({});
  const [todaysAppointments, setTodaysAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

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
      const token = await AsyncStorage.getItem('userToken');
      
      // Fetch dashboard data
      const dashboardResponse = await fetch(`${API_URL}/users/api/doctor/dashboard/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!dashboardResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await dashboardResponse.json();
      setDoctorData(dashboardData.doctor);
      setDashboardStats(dashboardData.stats);
      setTodaysAppointments(dashboardData.todays_appointments || []);
      setUpcomingAppointments(dashboardData.upcoming_appointments || []);

      // Fetch calendar events
      await fetchCalendarEvents();
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/users/api/doctor/dashboard/calendar-events/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const events = await response.json();
        const markedDates = {};
        
        events.forEach(event => {
          const date = event.start.split('T')[0];
          if (!markedDates[date]) {
            markedDates[date] = { dots: [] };
          }
          
          const color = getStatusColor(event.extendedProps?.status || 'scheduled');
          markedDates[date].dots.push({ color });
        });

        setCalendarEvents(markedDates);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'in_progress': return '#f59e0b';
      case 'no_show': return '#6b7280';
      default: return '#3b82f6';
    }
  };

  const getStatusBadgeStyle = (status) => {
    const color = getStatusColor(status);
    return {
      backgroundColor: color + '20',
      borderColor: color,
      borderWidth: 1,
    };
  };

  const handleAppointmentAction = async (appointmentId, action) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/users/api/doctor/appointments/${appointmentId}/actions/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=${action}`,
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', result.message);
        fetchDashboardData(); // Refresh data
      } else {
        Alert.alert('Error', result.error || 'Action failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const confirmAction = (appointmentId, action) => {
    let message = '';
    switch (action) {
      case 'attend':
        message = 'Start attending this patient?';
        break;
      case 'complete':
        message = 'Mark this appointment as completed?';
        break;
      case 'no_show':
        message = 'Mark this patient as no-show?';
        break;
      default:
        return;
    }

    Alert.alert(
      'Confirm Action',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => handleAppointmentAction(appointmentId, action) }
      ]
    );
  };

  const renderAppointmentCard = ({ item }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.patientInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {item.patient?.first_name?.charAt(0)}{item.patient?.last_name?.charAt(0)}
            </Text>
          </View>
          <View style={styles.patientDetails}>
            <Text style={styles.patientName}>
              {item.patient?.first_name} {item.patient?.last_name}
            </Text>
            <Text style={styles.appointmentTime}>
              {new Date(`2000-01-01T${item.appointment_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              {item.reason && ` • ${item.reason.substring(0, 30)}...`}
            </Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status === 'in_progress' ? 'In Progress' : item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        {item.status === 'scheduled' && (
          <>
            <Pressable 
              style={[styles.actionBtn, styles.attendBtn]}
              onPress={() => confirmAction(item.id, 'attend')}
            >
              <Text style={styles.actionBtnText}>Attend</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.actionBtn, styles.postponeBtn]}
              onPress={() => navigation.navigate('PostponeAppointment', { appointmentId: item.id })}
            >
              <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Postpone</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.actionBtn, styles.noShowBtn]}
              onPress={() => confirmAction(item.id, 'no_show')}
            >
              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>No Show</Text>
            </Pressable>
          </>
        )}
        
        {item.status === 'in_progress' && (
          <Pressable 
            style={[styles.actionBtn, styles.completeBtn]}
            onPress={() => confirmAction(item.id, 'complete')}
          >
            <Text style={styles.actionBtnText}>Complete</Text>
          </Pressable>
        )}
        
                  <Pressable 
            style={[styles.actionBtn, styles.openBtn]}
            onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item.id })}
          >
            <Text style={[styles.actionBtnText, { color: '#6b7280' }]}>Open</Text>
          </Pressable>
      </View>
    </View>
  );

  const renderStatCard = (title, value, color, onPress) => (
    <Pressable style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Pressable>
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Header right component with New Appointment button
  const headerRightComponent = (
    <Pressable 
      style={styles.newAppointmentBtn}
      onPress={() => navigation.navigate('CreateAppointment')}
    >
      <Text style={styles.newAppointmentText}>+ New</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Doctor Dashboard"
        subtitle={`Welcome, Dr. ${doctorData?.user?.first_name || 'Doctor'}`}
        navigation={navigation}
        currentScreen="Dashboard"
        rightComponent={headerRightComponent}
      />
      
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Doctor Info Card */}
        <View style={styles.doctorInfoCard}>
          <Text style={styles.doctorName}>
            Dr. {doctorData?.user?.first_name} {doctorData?.user?.last_name}
          </Text>
          <Text style={styles.doctorSpecialization}>
            {doctorData?.specialization || 'General Practitioner'}
          </Text>
          <Text style={styles.doctorClinic}>
            {doctorData?.clinic?.name || 'No clinic assigned'} Clinic
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            {renderStatCard(
              "Today's Patients", 
              dashboardStats.todays_patients_count || 0, 
              '#3b82f6',
              () => navigation.navigate('AppointmentsList', { filter: 'today' })
            )}
            {renderStatCard(
              "Completed Today", 
              dashboardStats.completed_today || 0, 
              '#10b981',
              () => navigation.navigate('AppointmentsList', { filter: 'completed_today' })
            )}
          </View>
          <View style={styles.statsRow}>
            {renderStatCard(
              "Upcoming", 
              dashboardStats.upcoming_count || 0, 
              '#f59e0b',
              () => navigation.navigate('AppointmentsList', { filter: 'upcoming' })
            )}
            {renderStatCard(
              "This Month", 
              dashboardStats.month_appointments_count || 0, 
              '#8b5cf6',
              () => navigation.navigate('AppointmentsList', { filter: 'month' })
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <Pressable 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('CreateAppointment')}
            >
              <Text style={styles.quickActionText}>Schedule Appointment</Text>
            </Pressable>
            
            <Pressable 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('CreatePatient')}
            >
              <Text style={styles.quickActionText}>Add New Patient</Text>
            </Pressable>
            
            <Pressable 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('ManageAvailability')}
            >
              <Text style={styles.quickActionText}>Update Availability</Text>
            </Pressable>
            
            <Pressable 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('FullCalendar')}
            >
              <Text style={styles.quickActionText}>Full Calendar View</Text>
            </Pressable>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Appointment Calendar</Text>
            <Pressable onPress={() => navigation.navigate('FullCalendar')}>
              <Text style={styles.fullCalendarLink}>Full Calendar →</Text>
            </Pressable>
          </View>
          
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markingType={'multi-dot'}
            markedDates={{
              ...calendarEvents,
              [selectedDate]: {
                ...calendarEvents[selectedDate],
                selected: true,
                selectedColor: '#3b82f6'
              }
            }}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#3b82f6',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#3b82f6',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#00adf5',
              selectedDotColor: '#ffffff',
              arrowColor: '#3b82f6',
              disabledArrowColor: '#d9e1e8',
              monthTextColor: '#2d4150',
              indicatorColor: '#3b82f6',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14
            }}
          />
        </View>

        {/* Today's Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Appointments</Text>
          {todaysAppointments.length > 0 ? (
            <FlatList
              data={todaysAppointments}
              renderItem={renderAppointmentCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No appointments scheduled for today</Text>
            </View>
          )}
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          {upcomingAppointments.length > 0 ? (
            <View style={styles.upcomingList}>
              {upcomingAppointments.slice(0, 5).map((appointment) => (
              <Pressable
                  key={appointment.id}
                  style={styles.upcomingItem}
                  onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appointment.id })}
                >
                  <View>
                    <Text style={styles.upcomingPatient}>
                      {appointment.patient?.first_name} {appointment.patient?.last_name}
                    </Text>
                    <Text style={styles.upcomingDate}>
                      {new Date(appointment.appointment_date).toLocaleDateString()} at{' '}
                      {new Date(`2000-01-01T${appointment.appointment_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, getStatusBadgeStyle(appointment.status)]}>
                    <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                      {appointment.status?.charAt(0).toUpperCase() + appointment.status?.slice(1)}
                    </Text>
                  </View>
              </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No upcoming appointments</Text>
            </View>
          )}
          </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 16,
  },
  newAppointmentBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  newAppointmentText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  doctorInfoCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
  },
  doctorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  doctorSpecialization: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 2,
  },
  doctorClinic: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 6,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  fullCalendarLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionBtn: {
    width: '48%',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  quickActionText: {
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  attendBtn: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  postponeBtn: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  noShowBtn: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  completeBtn: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  openBtn: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 16,
  },
  upcomingList: {
    gap: 12,
  },
  upcomingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  upcomingPatient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  upcomingDate: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default DoctorDashboard; 