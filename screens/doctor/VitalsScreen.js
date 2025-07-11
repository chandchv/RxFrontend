import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const VitalsScreen = ({ navigation, route }) => {
  const { patientId } = route.params;
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newVitals, setNewVitals] = useState({
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    temperature: '',
    weight: '',
    height: '',
    oxygen_saturation: '',
    respiratory_rate: '',
    notes: ''
  });

  useEffect(() => {
    fetchVitals();
  }, []);

  const fetchVitals = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/patient/${patientId}/vitals/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vitals');
      }

      const data = await response.json();
      setVitals(data.vitals || []);
    } catch (error) {
      console.error('Error fetching vitals:', error);
      Alert.alert('Error', 'Failed to load vitals');
    } finally {
      setLoading(false);
    }
  };

  const saveVitals = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/patient/${patientId}/vitals/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newVitals),
      });

      if (!response.ok) {
        throw new Error('Failed to save vitals');
      }

      Alert.alert('Success', 'Vitals saved successfully');
      setModalVisible(false);
      setNewVitals({
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        heart_rate: '',
        temperature: '',
        weight: '',
        height: '',
        oxygen_saturation: '',
        respiratory_rate: '',
        notes: ''
      });
      fetchVitals();
    } catch (error) {
      console.error('Error saving vitals:', error);
      Alert.alert('Error', 'Failed to save vitals');
    }
  };

  const getVitalStatus = (vital, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    switch (vital) {
      case 'heart_rate':
        if (numValue < 60 || numValue > 100) return 'abnormal';
        break;
      case 'blood_pressure_systolic':
        if (numValue < 90 || numValue > 140) return 'abnormal';
        break;
      case 'blood_pressure_diastolic':
        if (numValue < 60 || numValue > 90) return 'abnormal';
        break;
      case 'temperature':
        if (numValue < 97 || numValue > 99.5) return 'abnormal';
        break;
      case 'oxygen_saturation':
        if (numValue < 95) return 'abnormal';
        break;
      case 'respiratory_rate':
        if (numValue < 12 || numValue > 20) return 'abnormal';
        break;
    }
    return 'normal';
  };

  const getStatusColor = (status) => {
    return status === 'abnormal' ? '#ef4444' : '#10b981';
  };

  const renderVitalCard = (vitalRecord) => (
    <View key={vitalRecord.id} style={styles.vitalCard}>
      <View style={styles.vitalHeader}>
        <Text style={styles.vitalDate}>
          {new Date(vitalRecord.recorded_at).toLocaleDateString()}
        </Text>
        <Text style={styles.vitalTime}>
          {new Date(vitalRecord.recorded_at).toLocaleTimeString()}
        </Text>
      </View>

      <View style={styles.vitalGrid}>
        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Blood Pressure</Text>
          <Text style={[styles.vitalValue, { 
            color: getStatusColor(getVitalStatus('blood_pressure_systolic', vitalRecord.blood_pressure_systolic)) 
          }]}>
            {vitalRecord.blood_pressure_systolic}/{vitalRecord.blood_pressure_diastolic} mmHg
          </Text>
        </View>

        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Heart Rate</Text>
          <Text style={[styles.vitalValue, { 
            color: getStatusColor(getVitalStatus('heart_rate', vitalRecord.heart_rate)) 
          }]}>
            {vitalRecord.heart_rate} bpm
          </Text>
        </View>

        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Temperature</Text>
          <Text style={[styles.vitalValue, { 
            color: getStatusColor(getVitalStatus('temperature', vitalRecord.temperature)) 
          }]}>
            {vitalRecord.temperature}°F
          </Text>
        </View>

        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Weight</Text>
          <Text style={styles.vitalValue}>
            {vitalRecord.weight} kg
          </Text>
        </View>

        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Height</Text>
          <Text style={styles.vitalValue}>
            {vitalRecord.height} cm
          </Text>
        </View>

        <View style={styles.vitalItem}>
          <Text style={styles.vitalLabel}>Oxygen Saturation</Text>
          <Text style={[styles.vitalValue, { 
            color: getStatusColor(getVitalStatus('oxygen_saturation', vitalRecord.oxygen_saturation)) 
          }]}>
            {vitalRecord.oxygen_saturation}%
          </Text>
        </View>
      </View>

      {vitalRecord.notes && (
        <Text style={styles.vitalNotes}>
          Notes: {vitalRecord.notes}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading vitals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Patient Vitals</Text>
        <Pressable 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>Add Vitals</Text>
        </Pressable>
      </View>

      {/* Vitals List */}
      <ScrollView style={styles.vitalsList}>
        {vitals.length > 0 ? (
          vitals.map(renderVitalCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No vitals recorded yet</Text>
            <Pressable 
              style={styles.emptyStateButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyStateButtonText}>Record First Vitals</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Add Vitals Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record New Vitals</Text>
            
            <ScrollView style={styles.modalForm}>
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Systolic BP</Text>
                  <TextInput
                    style={styles.input}
                    value={newVitals.blood_pressure_systolic}
                    onChangeText={(text) => setNewVitals({...newVitals, blood_pressure_systolic: text})}
                    placeholder="120"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Diastolic BP</Text>
                  <TextInput
                    style={styles.input}
                    value={newVitals.blood_pressure_diastolic}
                    onChangeText={(text) => setNewVitals({...newVitals, blood_pressure_diastolic: text})}
                    placeholder="80"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Heart Rate (bpm)</Text>
                  <TextInput
                    style={styles.input}
                    value={newVitals.heart_rate}
                    onChangeText={(text) => setNewVitals({...newVitals, heart_rate: text})}
                    placeholder="72"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Temperature (°F)</Text>
                  <TextInput
                    style={styles.input}
                    value={newVitals.temperature}
                    onChangeText={(text) => setNewVitals({...newVitals, temperature: text})}
                    placeholder="98.6"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={newVitals.weight}
                    onChangeText={(text) => setNewVitals({...newVitals, weight: text})}
                    placeholder="70"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={newVitals.height}
                    onChangeText={(text) => setNewVitals({...newVitals, height: text})}
                    placeholder="170"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Oxygen Saturation (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={newVitals.oxygen_saturation}
                    onChangeText={(text) => setNewVitals({...newVitals, oxygen_saturation: text})}
                    placeholder="98"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Respiratory Rate</Text>
                  <TextInput
                    style={styles.input}
                    value={newVitals.respiratory_rate}
                    onChangeText={(text) => setNewVitals({...newVitals, respiratory_rate: text})}
                    placeholder="16"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newVitals.notes}
                onChangeText={(text) => setNewVitals({...newVitals, notes: text})}
                placeholder="Additional notes..."
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveVitals}
              >
                <Text style={styles.saveButtonText}>Save Vitals</Text>
              </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  vitalsList: {
    flex: 1,
    padding: 16,
  },
  vitalCard: {
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
  vitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vitalDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  vitalTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  vitalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  vitalItem: {
    width: '45%',
    marginBottom: 12,
  },
  vitalLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  vitalNotes: {
    fontSize: 14,
    color: '#374151',
    marginTop: 12,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalForm: {
    maxHeight: 400,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default VitalsScreen; 