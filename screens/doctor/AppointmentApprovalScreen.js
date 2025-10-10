import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AppointmentApprovalScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [filter, setFilter] = useState('all'); // all, urgent, today, this_week

  useEffect(() => {
    fetchPendingAppointments();
  }, []);

  const fetchPendingAppointments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/users/api/doctor/appointments/pending/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPendingAppointments(data.appointments || []);

    } catch (error) {
      console.error('Error fetching pending appointments:', error);
      Alert.alert('Error', 'Failed to load pending appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const approveAppointment = async (appointmentId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/doctor/appointments/${appointmentId}/approve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'Appointment approved successfully!');
        fetchPendingAppointments(); // Refresh list
      } else {
        throw new Error('Failed to approve appointment');
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      Alert.alert('Error', 'Failed to approve appointment. Please try again.');
    }
  };

  const rejectAppointment = async (appointmentId, reason) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/doctor/appointments/${appointmentId}/reject/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Appointment rejected successfully!');
        fetchPendingAppointments(); // Refresh list
      } else {
        throw new Error('Failed to reject appointment');
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      Alert.alert('Error', 'Failed to reject appointment. Please try again.');
    }
  };

  const showRejectDialog = (appointment) => {
    Alert.prompt(
      'Reject Appointment',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          onPress: (reason) => {
            if (reason && reason.trim()) {
              rejectAppointment(appointment.id, reason.trim());
            } else {
              Alert.alert('Error', 'Please provide a reason for rejection.');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'high': return 'warning';
      case 'medium': return 'schedule';
      case 'low': return 'check-circle';
      default: return 'info';
    }
  };

  const filteredAppointments = pendingAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.appointment_date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() + 7);

    switch (filter) {
      case 'urgent':
        return appointment.urgency === 'high';
      case 'today':
        return appointmentDate.toDateString() === today.toDateString();
      case 'this_week':
        return appointmentDate >= today && appointmentDate <= thisWeek;
      default:
        return true;
    }
  });

  const renderFilterButton = (title, filterValue) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterValue && styles.activeFilterButton
      ]}
      onPress={() => setFilter(filterValue)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterValue && styles.activeFilterButtonText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderAppointmentItem = ({ item: appointment }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{appointment.patient_name}</Text>
          <Text style={styles.patientId}>ID: {appointment.patient_id}</Text>
        </View>
        <View style={styles.urgencyContainer}>
          <Icon 
            name={getUrgencyIcon(appointment.urgency)} 
            size={20} 
            color={getUrgencyColor(appointment.urgency)} 
          />
          <Text style={[styles.urgencyText, { color: getUrgencyColor(appointment.urgency) }]}>
            {appointment.urgency.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentDetails}>
        <View style={styles.detailRow}>
          <Icon name="event" size={16} color="#666" />
          <Text style={styles.detailText}>
            {new Date(appointment.appointment_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="access-time" size={16} color="#666" />
          <Text style={styles.detailText}>{appointment.appointment_time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="description" size={16} color="#666" />
          <Text style={styles.detailText}>{appointment.reason || 'No reason provided'}</Text>
        </View>
        {appointment.notes && (
          <View style={styles.detailRow}>
            <Icon name="note" size={16} color="#666" />
            <Text style={styles.detailText}>{appointment.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.appointmentActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => approveAppointment(appointment.id)}
        >
          <Icon name="check" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Approve</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => showRejectDialog(appointment)}
        >
          <Icon name="close" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => navigation.navigate('PatientDetails', { patientId: appointment.patient_id })}
        >
          <Icon name="person" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>View Patient</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading pending appointments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointment Approvals</Text>
        <Text style={styles.headerSubtitle}>
          {filteredAppointments.length} pending appointment{filteredAppointments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('All', 'all')}
        {renderFilterButton('Urgent', 'urgent')}
        {renderFilterButton('Today', 'today')}
        {renderFilterButton('This Week', 'this_week')}
      </View>

      {/* Appointments List */}
      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.appointmentsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.noDataContainer}>
            <Icon name="event-available" size={64} color="#ccc" />
            <Text style={styles.noDataText}>No pending appointments</Text>
            <Text style={styles.noDataSubtext}>
              {filter === 'all' 
                ? 'All appointment requests have been processed'
                : `No ${filter} appointments found`
              }
            </Text>
          </View>
        }
      />

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton}>
          <Icon name="schedule" size={20} color="#fff" />
          <Text style={styles.quickActionText}>View Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <Icon name="settings" size={20} color="#fff" />
          <Text style={styles.quickActionText}>Approval Settings</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeFilterButton: {
    backgroundColor: '#0066cc',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  appointmentsList: {
    flex: 1,
    padding: 15,
  },
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  patientId: {
    fontSize: 14,
    color: '#666',
  },
  urgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  appointmentDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  viewButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 5,
    backgroundColor: '#0066cc',
    borderRadius: 8,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

export default AppointmentApprovalScreen;
