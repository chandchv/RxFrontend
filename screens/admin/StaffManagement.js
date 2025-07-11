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
  const [addStaffModalVisible, setAddStaffModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [clinicId, setClinicId] = useState(null);
  // New staff form data
  const [newStaff, setNewStaff] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'receptionist',
    password: '',
    confirmPassword: ''
  });

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

  // Add new staff member
  const handleAddStaff = async () => {
    try {
      // Validate form data
      if (!newStaff.firstName || !newStaff.lastName || !newStaff.email || !newStaff.password) {
        Alert.alert('Error', 'Please fill all required fields');
        return;
      }

      if (newStaff.password !== newStaff.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/admin/clinics/${clinicId}/staff/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: newStaff.firstName,
          last_name: newStaff.lastName,
          email: newStaff.email,
          phone: newStaff.phone,
          role: newStaff.role,
          password: newStaff.password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add staff member');
      }

      // Reset form and close modal
      setNewStaff({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'receptionist',
        password: '',
        confirmPassword: ''
      });
      setAddStaffModalVisible(false);
      
      // Refresh staff list
      fetchStaffForClinic(clinicId);
      Alert.alert('Success', 'Staff member added successfully');
    } catch (error) {
      console.error('Error adding staff:', error);
      Alert.alert('Error', error.message || 'Failed to add staff member');
    } finally {
      setLoading(false);
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
                <Picker
                  selectedValue={selectedStaff.role}
                  style={styles.rolePicker}
                  onValueChange={(itemValue) => {
                    // Show confirmation dialog before changing role
                    Alert.alert(
                      'Change Role',
                      `Are you sure you want to change this user's role to ${itemValue}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Yes', 
                          onPress: () => handleRoleChange(selectedStaff.id, itemValue)
                        }
                      ]
                    );
                  }}
                >
                  <Picker.Item label="Administrator" value="admin" />
                  <Picker.Item label="Receptionist" value="receptionist" />
                  <Picker.Item label="Billing Staff" value="billing" />
                  <Picker.Item label="Pharmacy Staff" value="pharmacy" />
                  <Picker.Item label="Lab Technician" value="lab" />
                  <Picker.Item label="Nurse" value="nurse" />
                </Picker>
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
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  // Add Staff Modal
  const AddStaffModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={addStaffModalVisible}
      onRequestClose={() => setAddStaffModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setAddStaffModalVisible(false)}
          >
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Add New Staff Member</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>First Name*</Text>
            <TextInput
              style={styles.input}
              value={newStaff.firstName}
              onChangeText={(text) => setNewStaff({...newStaff, firstName: text})}
              placeholder="First Name"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Last Name*</Text>
            <TextInput
              style={styles.input}
              value={newStaff.lastName}
              onChangeText={(text) => setNewStaff({...newStaff, lastName: text})}
              placeholder="Last Name"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email*</Text>
            <TextInput
              style={styles.input}
              value={newStaff.email}
              onChangeText={(text) => setNewStaff({...newStaff, email: text})}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={newStaff.phone}
              onChangeText={(text) => setNewStaff({...newStaff, phone: text})}
              placeholder="Phone Number"
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Role*</Text>
            <Picker
              selectedValue={newStaff.role}
              style={styles.input}
              onValueChange={(itemValue) => setNewStaff({...newStaff, role: itemValue})}
            >
              <Picker.Item label="Administrator" value="admin" />
              <Picker.Item label="Receptionist" value="receptionist" />
              <Picker.Item label="Billing Staff" value="billing" />
              <Picker.Item label="Pharmacy Staff" value="pharmacy" />
              <Picker.Item label="Lab Technician" value="lab" />
              <Picker.Item label="Nurse" value="nurse" />
            </Picker>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Password*</Text>
            <TextInput
              style={styles.input}
              value={newStaff.password}
              onChangeText={(text) => setNewStaff({...newStaff, password: text})}
              placeholder="Password"
              secureTextEntry
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm Password*</Text>
            <TextInput
              style={styles.input}
              value={newStaff.confirmPassword}
              onChangeText={(text) => setNewStaff({...newStaff, confirmPassword: text})}
              placeholder="Confirm Password"
              secureTextEntry
            />
          </View>
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAddStaff}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Add Staff Member</Text>
            )}
          </TouchableOpacity>
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
        <Text style={styles.title}>Staff Management</Text>
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAddStaffModalVisible(true)}
          >
            <Icon name="person-add" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add Staff</Text>
          </TouchableOpacity>
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
      <AddStaffModal />
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
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
  rolePicker: {
    flex: 1,
    height: 40,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#0066cc',
    padding: 14,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default StaffManagement; 