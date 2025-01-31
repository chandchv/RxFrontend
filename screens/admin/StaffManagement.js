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
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const StaffManagement = ({ navigation }) => {
  const [staff, setStaff] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [clinicId, setClinicId] = useState(null);

  useEffect(() => {
    fetchClinics();
  }, []);

  useEffect(() => {
    if (clinicId) {
      fetchStaffForClinic(clinicId);
    }
  }, [clinicId]);

  const fetchClinics = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/clinics/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch clinics');
      const data = await response.json();
      setClinics(data);
      
      if (data.length > 0) {
        setClinicId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching clinics:', error);
      Alert.alert('Error', 'Failed to load clinics');
    }
  };

  const getClinicAndFetchStaff = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      // First get the clinics list
      const clinicsResponse = await fetch(`${API_URL}/api/clinics/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!clinicsResponse.ok) {
        const errorText = await clinicsResponse.text();
        console.error('Clinics error:', errorText);
        throw new Error('Failed to fetch clinics');
      }
      
      const clinics = await clinicsResponse.json();
      console.log('Clinics data:', clinics); // Debug log
      
      if (clinics && clinics.length > 0) {
        const clinic_id = clinics[0].id;
        console.log('Selected clinic ID:', clinic_id); // Debug log
        setClinicId(clinic_id);
        await fetchStaffForClinic(clinic_id);
      } else {
        Alert.alert('Error', 'No clinic found');
      }
    } catch (error) {
      console.error('Error getting clinic:', error);
      Alert.alert('Error', 'Failed to load clinic information');
    }
  };

  const fetchStaffForClinic = async (clinic_id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('Fetching staff for clinic:', clinic_id); // Debug log
      
      const response = await fetch(`${API_URL}/api/admin/clinics/${clinic_id}/staff/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Staff fetch response:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to fetch staff');
      }
      const data = await response.json();
      console.log('Staff data:', data); // Debug log
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
      Alert.alert('Error', 'Failed to load staff members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusChange = async (staffId, newStatus) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/admin/clinics/${clinicId}/staff/${staffId}/status/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      fetchStaffForClinic(clinicId);
      setModalVisible(false);
      Alert.alert('Success', 'Staff status updated successfully');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update staff status');
    }
  };

  const handleRoleChange = async (staffId, newRole) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/admin/clinics/${clinicId}/staff/${staffId}/role/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to update role');
      }

      const data = await response.json();
      console.log('Role update response:', data);

      // Refresh the staff list
      await fetchStaffForClinic(clinicId);
      setModalVisible(false);
      Alert.alert('Success', data.message || 'Staff role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', 'Failed to update staff role');
    }
  };

  const renderStaffItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.staffCard}
      onPress={() => {
        setSelectedStaff(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.staffInfo}>
        <Text style={styles.staffName}>{item.first_name} {item.last_name}</Text>
        <Text style={styles.staffRole}>{item.role}</Text>
        <Text style={styles.staffEmail}>{item.email}</Text>
      </View>
      <View style={styles.statusContainer}>
        <Text style={[styles.status, { color: item.is_active ? '#4CAF50' : '#F44336' }]}>
          {item.is_active ? 'Active' : 'Inactive'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const StaffDetailsModal = () => (
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

          {selectedStaff && (
            <>
              <Text style={styles.modalTitle}>Staff Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>
                  {selectedStaff.first_name} {selectedStaff.last_name}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{selectedStaff.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{selectedStaff.phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Role:</Text>
                <Text style={styles.detailValue}>{selectedStaff.role}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('EditStaff', { staffId: selectedStaff.id });
                  }}
                >
                  <Icon name="edit" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { 
                    backgroundColor: selectedStaff.is_active ? '#F44336' : '#4CAF50'
                  }]}
                  onPress={() => handleStatusChange(selectedStaff.id, !selectedStaff.is_active)}
                >
                  <Icon 
                    name={selectedStaff.is_active ? 'block' : 'check-circle'} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.actionButtonText}>
                    {selectedStaff.is_active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.roleButtons}>
                <Text style={styles.roleTitle}>Change Role</Text>
                {['RECEPTIONIST', 'NURSE', 'ADMIN'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleButton,
                      selectedStaff.role === role && styles.activeRoleButton
                    ]}
                    onPress={() => handleRoleChange(selectedStaff.id, role)}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      selectedStaff.role === role && styles.activeRoleButtonText
                    ]}>
                      {role}
                    </Text>
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
        <View style={styles.clinicSelector}>
          <Text style={styles.clinicLabel}>Select Clinic:</Text>
          <Picker
            selectedValue={clinicId}
            style={styles.picker}
            onValueChange={(itemValue) => setClinicId(itemValue)}
          >
            {clinics.map((clinic) => (
              <Picker.Item 
                key={clinic.id} 
                label={clinic.name} 
                value={clinic.id} 
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={24} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddStaffScreen', { clinicId })}
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={staff.filter(member => 
          `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={renderStaffItem}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchStaffForClinic(clinicId);
        }}
        contentContainerStyle={styles.listContainer}
      />

      <StaffDetailsModal />
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  clinicSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clinicLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
    color: '#333',
  },
  picker: {
    flex: 1,
    height: 40,
  },
  searchHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  staffCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 2,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  staffRole: {
    fontSize: 14,
    color: '#0066cc',
    marginBottom: 4,
  },
  staffEmail: {
    fontSize: 14,
    color: '#666',
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 16,
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
  roleButtons: {
    marginTop: 16,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  roleButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  activeRoleButton: {
    backgroundColor: '#0066cc',
  },
  roleButtonText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  activeRoleButtonText: {
    color: '#fff',
  },
});

export default StaffManagement; 