import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config';

const TestDetails = ({ route, navigation }) => {
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const { makeAuthenticatedRequest } = useAuth();
  const { testId } = route.params;

  useEffect(() => {
    fetchTestDetails();
  }, [testId]);

  const fetchTestDetails = async () => {
    try {
      const response = await makeAuthenticatedRequest(`/api/lab-tests/${testId}/`);
      const data = await response.json();
      setTest(data);
    } catch (error) {
      console.error('Error fetching test details:', error);
      Alert.alert('Error', 'Failed to load test details');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await makeAuthenticatedRequest(`/api/lab-tests/${testId}/update_status/`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTestDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {test && (
        <>
          <Text style={styles.title}>{test.test_name}</Text>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Patient: {test.patient_name}</Text>
            <Text style={styles.label}>Doctor: {test.doctor_name}</Text>
            <Text style={styles.label}>Status: {test.status}</Text>
            <Text style={styles.label}>Collection: {test.collection_type}</Text>
            <Text style={styles.label}>Description: {test.description}</Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => updateStatus('SAMPLE_COLLECTED')}
            >
              <Text style={styles.buttonText}>Mark Sample Collected</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => updateStatus('PROCESSING')}
            >
              <Text style={styles.buttonText}>Start Processing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => updateStatus('COMPLETED')}
            >
              <Text style={styles.buttonText}>Mark Completed</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
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
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  actionButtons: {
    marginTop: 16,
  },
  button: {
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TestDetails; 