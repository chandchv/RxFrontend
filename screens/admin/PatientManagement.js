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
import ClinicSelector from '../../components/ClinicSelector';

const PatientManagement = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [assignDoctorModalVisible, setAssignDoctorModalVisible] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [clinicId, setClinicId] = useState(null);

  useEffect(() => {
    fetchClinics();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      fetchPatients();
    }
  }, [selectedClinic]);

  const fetchClinics = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/clinics/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Response status:', response.status);
        throw new Error('Failed to fetch clinics');
      }
      
      const data = await response.json();
      console.log('Clinics data:', data);
      setClinics(data);
      if (data.length > 0) {
        setSelectedClinic(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching clinics:', error);
      Alert.alert('Error', 'Failed to load clinics');
    }
  };

  const fetchPatients = async () => {
    if (!selectedClinic) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/clinic-admin/patients/list/${selectedClinic}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load patients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/clinic-admin/doctors/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch doctors');
      const data = await response.json();
      setDoctors(data.filter(doctor => doctor.is_active));
    } catch (error) {
      console.error(error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPatients();
  };

  const handleAssignDoctor = async (patientId, doctorId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/clinic-admin/patients/${patientId}/assign-doctor/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doctor_id: doctorId }),
      });

      if (!response.ok) throw new Error('Failed to assign doctor');
      
      Alert.alert('Success', 'Doctor assigned successfully');
      setAssignDoctorModalVisible(false);
      fetchPatients();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to assign doctor');
    }
  };

  const handleEditPatient = (patientId) => {
    if (selectedClinic) {
      navigation.navigate('AdminStack', {
        screen: 'EditPatient',
        params: { 
          patientId: patientId,
          clinicId: selectedClinic 
        }
      });
    }
  };

  const renderPatientItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.patientCard}
      onPress={() => {
        setSelectedPatient(item);
        setModalVisible(true);
        setClinicId(item.clinic_id);
      }}
    >
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.first_name} {item.last_name}</Text>
        <Text style={styles.patientDetails}>
          {item.gender}, {item.age} years • ID: {item.id}
        </Text>
        <Text style={styles.assignedDoctor}>
          Doctor: {item.assigned_doctor ? `Dr. ${item.assigned_doctor}` : 'Not Assigned'}
        </Text>
      </View>
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>Visits: {item.visit_count}</Text>
      </View>
    </TouchableOpacity>
  );

  const PatientDetailsModal = () => (
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

          {selectedPatient && (
            <>
              <Text style={styles.modalTitle}>
                {selectedPatient.first_name} {selectedPatient.last_name}
              </Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{selectedPatient.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{selectedPatient.phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address:</Text>
                <Text style={styles.detailValue}>{selectedPatient.address}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('EditPatient', { patientId: selectedPatient.id });
                  }}
                >
                  <Icon name="edit" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                  onPress={() => {
                    setModalVisible(false);
                    setSelectedPatient(selectedPatient);
                    setAssignDoctorModalVisible(true);
                  }}
                >
                  <Icon name="person-add" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Assign Doctor</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  const AssignDoctorModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={assignDoctorModalVisible}
      onRequestClose={() => setAssignDoctorModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setAssignDoctorModalVisible(false)}
          >
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Assign Doctor</Text>
          <FlatList
            data={doctors}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.doctorItem}
                onPress={() => handleAssignDoctor(selectedPatient.id, item.id)}
              >
                <Text style={styles.doctorName}>Dr. {item.first_name} {item.last_name}</Text>
                <Text style={styles.doctorSpecialization}>{item.specialization}</Text>
              </TouchableOpacity>
            )}
          />
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
          <Picker
            selectedValue={selectedClinic}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedClinic(itemValue)}
          >
            {clinics.map((clinic) => (
              <Picker.Item 
                key={clinic.id.toString()} 
                label={clinic.name} 
                value={clinic.id} 
              />
            ))}
          </Picker>
        </View>
        <View style={styles.searchContainer}>
          <Icon name="search" size={24} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddPatient', { clinicId: selectedClinic })}
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={patients.filter(patient => 
          `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={renderPatientItem}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContainer}
      />

      <PatientDetailsModal />
      <AssignDoctorModal />
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
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    elevation: 2,
  },
  clinicSelector: {
    flex: 1,
    marginRight: 12,
  },
  picker: {
    width: '100%',
    height: 50,
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
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 2,
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
  patientDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  assignedDoctor: {
    fontSize: 14,
    color: '#0066cc',
  },
  statsContainer: {
    justifyContent: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
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
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 1,
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
  doctorItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  doctorSpecialization: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default PatientManagement; 