import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config';

const LabDashboard = ({ navigation }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { makeAuthenticatedRequest } = useAuth();

  useEffect(() => {
    fetchLabTests();
  }, []);

  const fetchLabTests = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/lab-tests/');
      const data = await response.json();
      setTests(data);
    } catch (error) {
      console.error('Error fetching lab tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTestItem = ({ item }) => (
    <TouchableOpacity
      style={styles.testCard}
      onPress={() => navigation.navigate('TestDetails', { testId: item.id })}
    >
      <Text style={styles.testName}>{item.test_name}</Text>
      <Text>Patient: {item.patient_name}</Text>
      <Text>Doctor: {item.doctor_name}</Text>
      <Text>Status: {item.status}</Text>
      <Text>Collection: {item.collection_type}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lab Tests</Text>
      <FlatList
        data={tests}
        renderItem={renderTestItem}
        keyExtractor={(item) => item.id.toString()}
        refreshing={loading}
        onRefresh={fetchLabTests}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  testCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
  },
  testName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

export default LabDashboard; 