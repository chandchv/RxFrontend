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
  Modal,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const DoctorManagement = ({ navigation }) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);

  useEffect(() => {
    // First fetch the current clinic
    fetchCurrentClinic();
  }, []);

  useEffect(() => {
    // Only fetch doctors when we have a selectedClinic
    if (selectedClinic) {
      fetchDoctors();
    }
  }, [selectedClinic]);

  const fetchCurrentClinic = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/clinics/current/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch current clinic');
      }

      const data = await response.json();
      setSelectedClinic(data.clinic_id);
    } catch (error) {
      console.error('Error fetching current clinic:', error);
      Alert.alert('Error', 'Failed to load current clinic');
    }
  };

  const fetchDoctors = async () => {
    try {
      if (!selectedClinic) {
        console.log('No clinic selected, skipping doctor fetch');
        return;
      }

      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      console.log('Fetching doctors for clinic:', selectedClinic);

      const response = await fetch(`${API_URL}/api/clinic-admin/doctors/${selectedClinic}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      console.log('Doctors response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }

      const data = await response.json();
      console.log('Doctors data:', data);
      setDoctors(data);
    } catch (error) {
      console.error('Doctors fetch error:', error);
      Alert.alert('Error', 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchDoctors();
  }, []);

  const handleStatusChange = async (doctorId, newStatus) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/clinic-admin/doctors/${doctorId}/status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      // Refresh the doctors list
      fetchDoctors();
      Alert.alert('Success', 'Doctor status updated successfully');
    } catch (error) {
      console.error('Status update error:', error);
      Alert.alert('Error', 'Failed to update doctor status');
    }
  };

  const handleDoctorPress = (doctor) => {
    setSelectedDoctor(doctor);
    setModalVisible(true);
  };

  const renderDoctorItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.doctorCard}
      onPress={() => handleDoctorPress(item)}
    >
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>Dr. {item.name}</Text>
        <Text style={styles.specialization}>{item.specialization}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statItem}>License: {item.license_number}</Text>
        </View>
      </View>
      <View style={styles.statusContainer}>
        <Text style={[styles.status, { color: item.status === 'Active' ? '#4CAF50' : '#FF5252' }]}>
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const DoctorDetailsModal = () => (
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

          {selectedDoctor && (
            <>
              <Text style={styles.modalTitle}>
                Dr. {selectedDoctor.name}
              </Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{selectedDoctor.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{selectedDoctor.phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Specialization:</Text>
                <Text style={styles.detailValue}>{selectedDoctor.specialization}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>License No:</Text>
                <Text style={styles.detailValue}>{selectedDoctor.license_number}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('EditDoctor', { doctorId: selectedDoctor.id });
                  }}
                >
                  <Icon name="edit" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { 
                    backgroundColor: selectedDoctor.status === 'Active' ? '#FF5252' : '#4CAF50' 
                  }]}
                  onPress={() => {
                    handleStatusChange(
                      selectedDoctor.id, 
                      selectedDoctor.status !== 'Active'
                    );
                    setModalVisible(false);
                  }}
                >
                  <Icon 
                    name={selectedDoctor.status === 'Active' ? 'block' : 'check-circle'} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.actionButtonText}>
                    {selectedDoctor.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
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

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchDoctors}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={24} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddDoctor')}
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={doctors.filter(doctor => 
          `${doctor.first_name} ${doctor.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={renderDoctorItem}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No doctors found</Text>
          </View>
        }
      />

      <DoctorDetailsModal />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    elevation: 2,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#0066cc',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 2,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statItem: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
  },
  statusContainer: {
    justifyContent: 'center',
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
    elevation: 5,
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
    width: 120,
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default DoctorManagement; 