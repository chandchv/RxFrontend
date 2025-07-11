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
  RefreshControl
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import CustomHeader from '../../components/CustomHeader';

const FullCalendar = ({ navigation }) => {
  const [calendarEvents, setCalendarEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDateAppointments, setSelectedDateAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDateAppointments(selectedDate);
    }
  }, [selectedDate]);

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/scheduling/calendar/events/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const events = await response.json();
      const markedDates = {};
      
      events.forEach(event => {
        const date = event.start.split('T')[0];
        if (!markedDates[date]) {
          markedDates[date] = { dots: [], marked: true };
        }
        
        const color = getStatusColor(event.extendedProps?.status || 'scheduled');
        markedDates[date].dots.push({ color });
      });

      setCalendarEvents(markedDates);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      Alert.alert('Error', 'Failed to load calendar events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDateAppointments = async (date) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/doctor/appointments/?date_from=${date}&date_to=${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedDateAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Error fetching date appointments:', error);
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

  const handleDatePress = (day) => {
    setSelectedDate(day.dateString);
  };

  const handleAppointmentPress = (appointment) => {
    setSelectedAppointment(appointment);
    setModalVisible(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCalendarEvents();
  };

  const renderAppointmentItem = (appointment) => (
    <Pressable
      key={appointment.id}
      style={styles.appointmentItem}
      onPress={() => handleAppointmentPress(appointment)}
    >
      <View style={styles.appointmentTime}>
        <Text style={styles.timeText}>
          {new Date(`2000-01-01T${appointment.appointment_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </Text>
      </View>
      
      <View style={styles.appointmentDetails}>
        <Text style={styles.patientName}>
          {appointment.patient?.first_name} {appointment.patient?.last_name}
        </Text>
        {appointment.reason && (
          <Text style={styles.appointmentReason} numberOfLines={1}>
            {appointment.reason}
          </Text>
        )}
      </View>
      
      <View style={[styles.statusBadge, getStatusBadgeStyle(appointment.status)]}>
        <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
          {appointment.status === 'in_progress' ? 'In Progress' : appointment.status?.charAt(0).toUpperCase() + appointment.status?.slice(1)}
        </Text>
      </View>
    </Pressable>
  );

  // Header right component with Create Appointment button
  const headerRightComponent = (
    <Pressable 
      style={styles.createBtn}
      onPress={() => navigation.navigate('CreateAppointment', { selectedDate })}
    >
      <Text style={styles.createBtnText}>+ New</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Appointment Calendar"
        subtitle="View and manage appointments"
        navigation={navigation}
        currentScreen="Calendar"
        rightComponent={headerRightComponent}
      />
      
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Scheduled</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>In Progress</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Cancelled</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#6b7280' }]} />
            <Text style={styles.legendText}>No Show</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={handleDatePress}
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

        {/* Selected Date Appointments */}
        <View style={styles.selectedDateSection}>
          <Text style={styles.selectedDateTitle}>
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          
          {selectedDateAppointments.length > 0 ? (
            <View style={styles.appointmentsList}>
              {selectedDateAppointments.map(renderAppointmentItem)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No appointments for this date</Text>
              <Pressable 
                style={styles.createAppointmentBtn}
                onPress={() => navigation.navigate('CreateAppointment', { selectedDate })}
              >
                <Text style={styles.createAppointmentBtnText}>Schedule Appointment</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Appointment Detail Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedAppointment && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Appointment Details</Text>
                    <Pressable 
                      style={styles.closeBtn}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.closeBtnText}>×</Text>
                    </Pressable>
                  </View>
                  
                  <View style={styles.modalBody}>
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientNameLarge}>
                        {selectedAppointment.patient?.first_name} {selectedAppointment.patient?.last_name}
                      </Text>
                      <Text style={styles.appointmentDateTime}>
                        {new Date(selectedAppointment.appointment_date).toLocaleDateString()} at{' '}
                        {new Date(`2000-01-01T${selectedAppointment.appointment_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                      {selectedAppointment.reason && (
                        <Text style={styles.appointmentReasonLarge}>
                          {selectedAppointment.reason}
                        </Text>
                      )}
                    </View>
                    
                    <View style={[styles.statusBadgeLarge, getStatusBadgeStyle(selectedAppointment.status)]}>
                      <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedAppointment.status) }]}>
                        {selectedAppointment.status === 'in_progress' ? 'In Progress' : selectedAppointment.status?.charAt(0).toUpperCase() + selectedAppointment.status?.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.modalActions}>
                    <Pressable 
                      style={styles.actionBtn}
                      onPress={() => {
                        setModalVisible(false);
                        navigation.navigate('AppointmentDetail', { appointmentId: selectedAppointment.id });
                      }}
                    >
                      <Text style={styles.actionBtnText}>View Details</Text>
                    </Pressable>
                    
                    <Pressable 
                      style={styles.actionBtn}
                      onPress={() => {
                        setModalVisible(false);
                        navigation.navigate('PatientDetail', { patientId: selectedAppointment.patient?.id });
                      }}
                    >
                      <Text style={styles.actionBtnText}>View Patient</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  content: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  selectedDateSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  appointmentsList: {
    gap: 12,
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  appointmentTime: {
    width: 60,
    marginRight: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  appointmentDetails: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  appointmentReason: {
    fontSize: 12,
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
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 16,
    marginBottom: 16,
  },
  createAppointmentBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createAppointmentBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  modalBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
  },
  patientNameLarge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  appointmentDateTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  appointmentReasonLarge: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadgeLarge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextLarge: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  createBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default FullCalendar; 