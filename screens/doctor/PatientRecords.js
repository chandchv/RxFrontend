import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const PatientRecords = ({ navigation, route }) => {
  const { patientId } = route.params;
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments');

  useEffect(() => {
    fetchPatientRecords();
  }, []);

  const fetchPatientRecords = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/patient/${patientId}/records/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patient records');
      }

      const data = await response.json();
      setRecords(data);
    } catch (error) {
      console.error('Error fetching patient records:', error);
      Alert.alert('Error', 'Failed to load patient records');
    } finally {
      setLoading(false);
    }
  };

  const renderAppointmentRecord = ({ item }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>
          {new Date(item.appointment_date).toLocaleDateString()}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.recordTitle}>Appointment</Text>
      <Text style={styles.recordDescription}>
        {item.reason || 'Regular checkup'}
      </Text>
      {item.notes && (
        <Text style={styles.recordNotes}>Notes: {item.notes}</Text>
      )}
    </View>
  );

  const renderPrescriptionRecord = ({ item }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.recordTitle}>Prescription</Text>
      <Text style={styles.recordDescription}>
        {item.medications?.length || 0} medications prescribed
      </Text>
      <Pressable 
        style={styles.viewButton}
        onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: item.id })}
      >
        <Text style={styles.viewButtonText}>View Details</Text>
      </Pressable>
    </View>
  );

  const renderTestRecord = ({ item }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>
          {new Date(item.test_date).toLocaleDateString()}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: item.results ? '#10b981' : '#f59e0b' }]}>
          <Text style={styles.statusText}>{item.results ? 'Completed' : 'Pending'}</Text>
        </View>
      </View>
      <Text style={styles.recordTitle}>Lab Test</Text>
      <Text style={styles.recordDescription}>
        {item.test_name}
      </Text>
      {item.results && (
        <Pressable 
          style={styles.viewButton}
          onPress={() => navigation.navigate('TestResults', { testId: item.id })}
        >
          <Text style={styles.viewButtonText}>View Results</Text>
        </Pressable>
      )}
    </View>
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#10b981';
      case 'scheduled': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getRecordsByType = () => {
    switch (activeTab) {
      case 'appointments':
        return records.appointments || [];
      case 'prescriptions':
        return records.prescriptions || [];
      case 'tests':
        return records.tests || [];
      default:
        return [];
    }
  };

  const renderRecord = ({ item }) => {
    switch (activeTab) {
      case 'appointments':
        return renderAppointmentRecord({ item });
      case 'prescriptions':
        return renderPrescriptionRecord({ item });
      case 'tests':
        return renderTestRecord({ item });
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading patient records...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Patient Records</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable 
          style={[styles.tab, activeTab === 'appointments' && styles.activeTab]}
          onPress={() => setActiveTab('appointments')}
        >
          <Text style={[styles.tabText, activeTab === 'appointments' && styles.activeTabText]}>
            Appointments
          </Text>
        </Pressable>
        
        <Pressable 
          style={[styles.tab, activeTab === 'prescriptions' && styles.activeTab]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Text style={[styles.tabText, activeTab === 'prescriptions' && styles.activeTabText]}>
            Prescriptions
          </Text>
        </Pressable>
        
        <Pressable 
          style={[styles.tab, activeTab === 'tests' && styles.activeTab]}
          onPress={() => setActiveTab('tests')}
        >
          <Text style={[styles.tabText, activeTab === 'tests' && styles.activeTabText]}>
            Lab Tests
          </Text>
        </Pressable>
      </View>

      {/* Records List */}
      <FlatList
        data={getRecordsByType()}
        renderItem={renderRecord}
        keyExtractor={(item) => `${activeTab}-${item.id}`}
        contentContainerStyle={styles.recordsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No {activeTab} records found
            </Text>
          </View>
        }
      />
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
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  recordsList: {
    padding: 16,
  },
  recordCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  recordDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  recordNotes: {
    fontSize: 12,
    color: '#374151',
    fontStyle: 'italic',
  },
  viewButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  viewButtonText: {
    color: '#ffffff',
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
    textAlign: 'center',
  },
});

export default PatientRecords; 