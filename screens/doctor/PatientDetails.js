import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PatientDetails = ({ route, navigation }) => {
  const { patientId } = route.params;
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchPatientDetails();
    fetchPatientHistory();
  }, []);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/doctor/patient/${patientId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patient details');
      }

      const data = await response.json();
      console.log('Patient details response:', data); // Debug log
      setPatient(data.patient || data);
    } catch (error) {
      console.error('Error fetching patient details:', error);
      Alert.alert('Error', 'Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Fetch appointments
      const appointmentsResponse = await fetch(
        `${API_URL}/users/api/doctor/patient/${patientId}/appointments/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!appointmentsResponse.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const appointmentsData = await appointmentsResponse.json();
      
      // Process appointments to mark past ones as missed
      const processedAppointments = appointmentsData.map(appointment => {
        const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
        const now = new Date();
        
        // If appointment is in the past and status is 'scheduled', mark it as missed
        if (appointmentDateTime < now && appointment.status === 'scheduled') {
          return {
            ...appointment,
            status: 'missed'
          };
        }
        return appointment;
      });
      
      setAppointments(processedAppointments);

      // Fetch prescriptions using the new API endpoint
      const prescriptionsResponse = await fetch(
        `${API_URL}/users/api/doctor/patient/${patientId}/prescriptions/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!prescriptionsResponse.ok) {
        throw new Error('Failed to fetch prescriptions');
      }

      const prescriptionsData = await prescriptionsResponse.json();
      console.log('Prescriptions response:', prescriptionsData); // Debug log
      setPrescriptions(Array.isArray(prescriptionsData) ? prescriptionsData : []);
    } catch (error) {
      console.error('Error fetching patient history:', error);
      Alert.alert('Error', 'Failed to load patient history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const renderAppointmentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.historyItem}
      onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
    >
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyItemTitle}>
          {formatDate(item.appointment_date)} at {item.appointment_time}
        </Text>
        <Text style={[
          styles.statusBadge,
          item.status === 'completed' ? styles.completedStatus :
          item.status === 'cancelled' ? styles.cancelledStatus :
          item.status === 'missed' ? styles.missedStatus :
          item.status === 'no_show' ? styles.noShowStatus :
          styles.pendingStatus
        ]}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>
      {item.notes && (
        <Text style={styles.historyItemSubtitle} numberOfLines={2}>
          {item.notes}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderPrescriptionItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.historyItem}
      onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: item.id })}
    >
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyItemTitle}>
          {formatDate(item.created_at)}
        </Text>
        <Text style={styles.historyItemSubtitle}>
          ID: {item.id}
        </Text>
      </View>
      <Text style={styles.historyItemSubtitle} numberOfLines={2}>
        {item.diagnosis || 'No diagnosis provided'}
      </Text>
      {item.chief_complaints && (
        <Text style={styles.historyItemNotes} numberOfLines={2}>
          {item.chief_complaints}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading patient details...</Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Patient not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.patientName}>
            {patient.first_name} {patient.last_name}
          </Text>
          <Text style={styles.patientSubtitle}>
            Patient ID: {patient.id}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Pressable 
          style={styles.actionBtn}
          onPress={() => navigation.navigate('CreateAppointment', { patientId })}
        >
          <Text style={styles.actionBtnText}>Schedule Appointment</Text>
        </Pressable>
        <Pressable 
          style={[styles.actionBtn, styles.secondaryBtn]}
          onPress={() => navigation.navigate('PatientRecords', { patientId })}
        >
          <Text style={[styles.actionBtnText, styles.secondaryBtnText]}>View Records</Text>
        </Pressable>
      </View>

      {/* Patient Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{patient.age || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>{patient.gender || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{patient.phone_number || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{patient.email || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{patient.address || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Emergency Contact</Text>
            <Text style={styles.infoValue}>{patient.emergency_contact || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Medical Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical Information</Text>
        
        <View style={styles.medicalInfo}>
          <View style={styles.medicalItem}>
            <Text style={styles.medicalLabel}>Blood Group</Text>
            <Text style={styles.medicalValue}>{patient.blood_group || 'Not specified'}</Text>
          </View>
          
          <View style={styles.medicalItem}>
            <Text style={styles.medicalLabel}>Allergies</Text>
            <Text style={styles.medicalValue}>{patient.allergies || 'None reported'}</Text>
          </View>
          
          <View style={styles.medicalItem}>
            <Text style={styles.medicalLabel}>Medical History</Text>
            <Text style={styles.medicalValue}>{patient.medical_history || 'No history recorded'}</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>Last appointment: {patient.last_appointment || 'No appointments'}</Text>
          </View>
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>Total appointments: {patient.total_appointments || 0}</Text>
          </View>
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>Last visit: {patient.last_visit || 'Never'}</Text>
          </View>
        </View>
      </View>

      {/* Previous Appointments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Previous Appointments</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('PatientAppointments', { patientId })}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {loadingHistory ? (
          <ActivityIndicator size="small" color="#0066cc" />
        ) : appointments.length > 0 ? (
          <FlatList
            data={appointments.slice(0, 3)}
            renderItem={renderAppointmentItem}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No appointments found</Text>
            }
          />
        ) : (
          <Text style={styles.emptyText}>No appointments found</Text>
        )}
      </View>

      {/* Previous Prescriptions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Previous Prescriptions</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('PatientPrescriptions', { patientId })}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {loadingHistory ? (
          <ActivityIndicator size="small" color="#0066cc" />
        ) : prescriptions.length > 0 ? (
          <FlatList
            data={prescriptions.slice(0, 3)}
            renderItem={renderPrescriptionItem}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No prescriptions found</Text>
            }
          />
        ) : (
          <Text style={styles.emptyText}>No prescriptions found</Text>
        )}
      </View>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  patientSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryBtnText: {
    color: '#374151',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
    textAlign: 'right',
  },
  medicalInfo: {
    gap: 16,
  },
  medicalItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  medicalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  medicalValue: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityText: {
    fontSize: 14,
    color: '#374151',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    color: '#2196F3',
    fontSize: 14,
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyItemStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  historyItemNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
  statusBadge: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  completedStatus: {
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  cancelledStatus: {
    backgroundColor: '#FFA000',
    color: '#fff',
  },
  pendingStatus: {
    backgroundColor: '#2196F3',
    color: '#fff',
  },
  missedStatus: {
    backgroundColor: '#FFA000',
    color: '#fff',
  },
  noShowStatus: {
    backgroundColor: '#FFA000',
    color: '#fff',
  },
});

export default PatientDetails; 