import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

const AppointmentManagement = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchAppointments();
  }, [filterDate, statusFilter]);

  const fetchAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const dateStr = filterDate.toISOString().split('T')[0];
      const response = await fetch(
        `${API_URL}/api/clinic-admin/appointments/?date=${dateStr}&status=${statusFilter}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch appointments');
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/clinic-admin/appointments/${appointmentId}/status/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      fetchAppointments();
      setModalVisible(false);
      Alert.alert('Success', 'Appointment status updated successfully');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update appointment status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'SCHEDULED': '#2196F3',
      'CONFIRMED': '#4CAF50',
      'COMPLETED': '#9C27B0',
      'CANCELLED': '#F44336',
      'NO_SHOW': '#FF9800'
    };
    return colors[status] || '#666';
  };

  const renderAppointmentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.appointmentCard}
      onPress={() => {
        setSelectedAppointment(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.appointmentInfo}>
        <Text style={styles.timeText}>{new Date(item.appointment_date).toLocaleTimeString()}</Text>
        <Text style={styles.patientName}>{item.patient_name}</Text>
        <Text style={styles.doctorName}>Dr. {item.doctor_name}</Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const AppointmentDetailsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>

          {selectedAppointment && (
            <>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Patient:</Text>
                <Text style={styles.detailValue}>{selectedAppointment.patient_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Doctor:</Text>
                <Text style={styles.detailValue}>Dr. {selectedAppointment.doctor_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedAppointment.appointment_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedAppointment.appointment_date).toLocaleTimeString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reason:</Text>
                <Text style={styles.detailValue}>{selectedAppointment.reason}</Text>
              </View>

              <View style={styles.statusButtons}>
                {['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      { backgroundColor: getStatusColor(status) }
                    ]}
                    onPress={() => handleStatusChange(selectedAppointment.id, status)}
                  >
                    <Text style={styles.statusButtonText}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="calendar-today" size={24} color="#666" />
          <Text style={styles.dateText}>
            {filterDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        <View style={styles.statusFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['ALL', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  statusFilter === status && styles.activeFilter
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[
                  styles.filterText,
                  statusFilter === status && styles.activeFilterText
                ]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={appointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchAppointments();
        }}
        contentContainerStyle={styles.listContainer}
      />

      <AppointmentDetailsModal />

      {showDatePicker && (
        <DateTimePicker
          value={filterDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setFilterDate(selectedDate);
            }
          }}
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('CreateAppointment')}
      >
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>
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
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    elevation: 2,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  statusFilters: {
    marginTop: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: '#0066cc',
  },
  filterText: {
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    width: 80,
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '48%',
  },
  statusButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#0066cc',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
});

export default AppointmentManagement; 