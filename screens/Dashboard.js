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
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const Dashboard = ({ navigation }) => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newClinic, setNewClinic] = useState({
    name: '',
    address: '',
    phone_number: '',
    email: '',
    registration_number: ''
  });

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/admin/clinics/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clinics');
      }

      const data = await response.json();
      setClinics(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClinic = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/admin/clinics/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClinic),
      });

      if (!response.ok) {
        throw new Error('Failed to create clinic');
      }

      setModalVisible(false);
      fetchClinics(); // Refresh the list
      Alert.alert('Success', 'Clinic created successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Super Admin Dashboard</Text>
        <Pressable 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>Add New Clinic</Text>
        </Pressable>
      </View>

      <View style={styles.clinicsContainer}>
        {clinics.map((clinic) => (
          <Pressable 
            key={clinic.id} 
            style={styles.clinicCard}
            onPress={() => navigation.navigate('ClinicManagementScreen', { clinicId: clinic.id })}
          >
            <Text style={styles.clinicName}>{clinic.name}</Text>
            <Text style={styles.clinicDetails}>Doctors: {clinic.doctors_count}</Text>
            <Text style={styles.clinicDetails}>Staff: {clinic.staff_count}</Text>
            <Text style={styles.clinicDetails}>{clinic.address}</Text>
          </Pressable>
        ))}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Create New Clinic</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Clinic Name"
            value={newClinic.name}
            onChangeText={(text) => setNewClinic(prev => ({ ...prev, name: text }))}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={newClinic.address}
            onChangeText={(text) => setNewClinic(prev => ({ ...prev, address: text }))}
            multiline
          />
          
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={newClinic.phone_number}
            onChangeText={(text) => setNewClinic(prev => ({ ...prev, phone_number: text }))}
            keyboardType="phone-pad"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={newClinic.email}
            onChangeText={(text) => setNewClinic(prev => ({ ...prev, email: text }))}
            keyboardType="email-address"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Registration Number"
            value={newClinic.registration_number}
            onChangeText={(text) => setNewClinic(prev => ({ ...prev, registration_number: text }))}
          />
          
          <View style={styles.modalButtons}>
            <Pressable
              style={[styles.button, styles.buttonCancel]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            
            <Pressable
              style={[styles.button, styles.buttonCreate]}
              onPress={handleCreateClinic}
            >
              <Text style={styles.buttonText}>Create</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  clinicsContainer: {
    padding: 15,
  },
  clinicCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  clinicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  clinicDetails: {
    color: '#666',
    marginBottom: 3,
  },
  addButton: {
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    width: '45%',
  },
  buttonCancel: {
    backgroundColor: '#e74c3c',
  },
  buttonCreate: {
    backgroundColor: '#2ecc71',
  },
});

export default Dashboard; 