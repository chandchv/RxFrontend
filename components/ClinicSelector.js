import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ClinicSelector = ({ 
  clinics, 
  selectedClinic, 
  onClinicChange,
  onClinicCreated 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newClinic, setNewClinic] = useState({
    name: '',
    email: '',
    phone_number: '',
    registration_number: ''
  });

  const createClinic = async () => {
    try {
      if (!newClinic.name) {
        Alert.alert('Error', 'Clinic name is required');
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/clinics/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClinic)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create clinic');
      }

      Alert.alert('Success', 'Clinic created successfully');
      setModalVisible(false);
      setNewClinic({ name: '', email: '', phone_number: '', registration_number: '' });
      
      if (onClinicCreated) {
        onClinicCreated(data);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.selectorContainer}>
        {clinics.length > 0 ? (
          <Picker
            selectedValue={selectedClinic}
            onValueChange={onClinicChange}
            style={styles.picker}
          >
            {clinics.map((clinic) => (
              <Picker.Item 
                key={clinic.id} 
                label={clinic.name} 
                value={clinic.id} 
              />
            ))}
          </Picker>
        ) : (
          <Text style={styles.noClinicText}>No clinics available</Text>
        )}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ New Clinic</Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Clinic</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Clinic Name"
              value={newClinic.name}
              onChangeText={(text) => setNewClinic({...newClinic, name: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={newClinic.email}
              onChangeText={(text) => setNewClinic({...newClinic, email: text})}
              keyboardType="email-address"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={newClinic.phone_number}
              onChangeText={(text) => setNewClinic({...newClinic, phone_number: text})}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Registration Number"
              value={newClinic.registration_number}
              onChangeText={(text) => setNewClinic({...newClinic, registration_number: text})}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.createButton]}
                onPress={createClinic}
              >
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  noClinicText: {
    flex: 1,
    color: '#666',
    paddingHorizontal: 10,
  },
});

export default ClinicSelector; 