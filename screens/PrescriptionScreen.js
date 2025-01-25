import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { API_URL } from '../config';

const PrescriptionScreen = ({ route, navigation }) => {
  const { appointmentId, patientId } = route.params;
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePrescribe = async () => {
    if (!medication || !dosage || !instructions) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/prescriptions/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${yourAuthToken}`,  // Replace with actual token
        },
        body: JSON.stringify({
          patient_id: patientId,
          medication,
          dosage,
          instructions,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Prescription created successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Error', data.error || 'Failed to create prescription');
      }
    } catch (error) {
      console.error('Prescription error:', error);
      Alert.alert('Error', 'Failed to create prescription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-800 mb-4">Prescribe Medication</Text>

        <TextInput
          className="border p-3 rounded-lg bg-gray-50 mb-4"
          placeholder="Medication"
          value={medication}
          onChangeText={setMedication}
        />

        <TextInput
          className="border p-3 rounded-lg bg-gray-50 mb-4"
          placeholder="Dosage"
          value={dosage}
          onChangeText={setDosage}
        />

        <TextInput
          className="border p-3 rounded-lg bg-gray-50 mb-4"
          placeholder="Instructions"
          value={instructions}
          onChangeText={setInstructions}
        />

        <TouchableOpacity
          className={`bg-blue-500 p-4 rounded-lg items-center ${isLoading ? 'opacity-70' : ''}`}
          onPress={handlePrescribe}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold">Prescribe</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default PrescriptionScreen; 