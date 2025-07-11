import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CreateBill = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    bill_type: 'consultation',
    amount: '',
    description: ''
  });

  const handleCreateBill = async () => {
    try {
      if (!formData.patient_id || !formData.amount) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/billing/api/bills/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create bill');
      }

      Alert.alert('Success', 'Bill created successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating bill:', error);
      Alert.alert('Error', 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create New Bill</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Patient ID*</Text>
          <TextInput
            style={styles.input}
            value={formData.patient_id}
            onChangeText={(text) => setFormData({...formData, patient_id: text})}
            placeholder="Enter patient ID"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bill Type*</Text>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerText}>{formData.bill_type}</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount*</Text>
          <TextInput
            style={styles.input}
            value={formData.amount}
            onChangeText={(text) => setFormData({...formData, amount: text})}
            placeholder="Enter amount"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({...formData, description: text})}
            placeholder="Enter description"
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleCreateBill}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="add-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Create Bill</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#3f51b5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CreateBill; 