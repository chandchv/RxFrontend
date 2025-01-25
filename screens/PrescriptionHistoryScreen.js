import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { API_URL } from '../config';

const PrescriptionHistoryScreen = ({ route }) => {
  const { patientId } = route.params;
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const response = await fetch(`${API_URL}/api/prescriptions/${patientId}/`, {
          headers: {
            'Authorization': `Bearer ${yourAuthToken}`,  // Replace with actual token
          },
        });
        const data = await response.json();
        if (response.ok) {
          setPrescriptions(data);
        } else {
          console.error('Failed to fetch prescriptions:', data.error);
        }
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrescriptions();
  }, [patientId]);

  if (isLoading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <FlatList
      data={prescriptions}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <View className="p-4 border-b border-gray-200">
          <Text className="text-lg font-semibold">{item.medication}</Text>
          <Text className="text-gray-600">Dosage: {item.dosage}</Text>
          <Text className="text-gray-600">Instructions: {item.instructions}</Text>
          <Text className="text-gray-600">Date: {item.date}</Text>
        </View>
      )}
    />
  );
};

export default PrescriptionHistoryScreen; 