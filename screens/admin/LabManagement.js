import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config';

const LabManagement = () => {
  const [labs, setLabs] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newLab, setNewLab] = useState({
    name: '',
    registration_number: '',
    address: '',
    phone_number: '',
    email: '',
  });
  const { makeAuthenticatedRequest } = useAuth();

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/labs/');
      const data = await response.json();
      setLabs(data);
    } catch (error) {
      console.error('Error fetching labs:', error);
      Alert.alert('Error', 'Failed to fetch labs');
    }
  };

  const createLab = async () => {
    try {
      await makeAuthenticatedRequest('/api/labs/', {
        method: 'POST',
        body: JSON.stringify(newLab),
      });
      setModalVisible(false);
      fetchLabs();
    } catch (error) {
      console.error('Error creating lab:', error);
      Alert.alert('Error', 'Failed to create lab');
    }
  };

  const renderLabItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.labCard}
      onPress={() => navigation.navigate('LabStaffManagement', { labId: item.id })}
    >
      <Text style={styles.labName}>{item.name}</Text>
      <Text>Registration: {item.registration_number}</Text>
      <Text>Phone: {item.phone_number}</Text>
      <Text>Email: {item.email}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>Add New Lab</Text>
      </TouchableOpacity>

      <FlatList
        data={labs}
        renderItem={renderLabItem}
        keyExtractor={(item) => item.id.toString()}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Lab</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Lab Name"
              value={newLab.name}
              onChangeText={(text) => setNewLab({...newLab, name: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Registration Number"
              value={newLab.registration_number}
              onChangeText={(text) => setNewLab({...newLab, registration_number: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Address"
              value={newLab.address}
              onChangeText={(text) => setNewLab({...newLab, address: text})}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={newLab.phone_number}
              onChangeText={(text) => setNewLab({...newLab, phone_number: text})}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={newLab.email}
              onChangeText={(text) => setNewLab({...newLab, email: text})}
              keyboardType="email-address"
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
                onPress={createLab}
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
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  addButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  labCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
  },
  labName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    marginBottom: 12,
    borderRadius: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#ff6b6b',
  },
  createButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default LabManagement; 