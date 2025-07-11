import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Card, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const MedicalHistory = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [medicalHistory, setMedicalHistory] = useState({
    conditions: [],
    allergies: [],
    medications: [],
    surgeries: [],
    vaccinations: [],
    familyHistory: [],
    prescriptions: [],
    appointments: [],
    vitals: [],
  });

  useEffect(() => {
    fetchMedicalHistory();
  }, []);

  const fetchMedicalHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/patient/medical-history/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch medical history');
      }

      const data = await response.json();
      setMedicalHistory(data);
    } catch (error) {
      console.error('Error fetching medical history:', error);
      Alert.alert('Error', 'Failed to load medical history');
    } finally {
      setLoading(false);
    }
  };

  const renderVitalsHistory = () => (
    <Card style={styles.card}>
      <Card.Title title="Vitals History" left={(props) => <Icon {...props} name="favorite" size={24} color="#F44336" />} />
      <Card.Content>
        {medicalHistory.vitals.length > 0 ? (
          medicalHistory.vitals.map((vital, index) => (
            <View key={index} style={styles.vitalItem}>
              <Text style={styles.date}>{new Date(vital.date).toLocaleDateString()}</Text>
              <View style={styles.vitalsGrid}>
                {vital.blood_pressure && (
                  <View style={styles.vitalData}>
                    <Text style={styles.vitalLabel}>BP</Text>
                    <Text style={styles.vitalValue}>{vital.blood_pressure}</Text>
                  </View>
                )}
                {vital.heart_rate && (
                  <View style={styles.vitalData}>
                    <Text style={styles.vitalLabel}>Heart Rate</Text>
                    <Text style={styles.vitalValue}>{vital.heart_rate} bpm</Text>
                  </View>
                )}
                {vital.temperature && (
                  <View style={styles.vitalData}>
                    <Text style={styles.vitalLabel}>Temperature</Text>
                    <Text style={styles.vitalValue}>{vital.temperature}°C</Text>
                  </View>
                )}
                {vital.weight && (
                  <View style={styles.vitalData}>
                    <Text style={styles.vitalLabel}>Weight</Text>
                    <Text style={styles.vitalValue}>{vital.weight} kg</Text>
                  </View>
                )}
              </View>
              {index < medicalHistory.vitals.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No vitals records available</Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderConditions = () => (
    <Card style={styles.card}>
      <Card.Title title="Medical Conditions" left={(props) => <Icon {...props} name="healing" size={24} color="#2196F3" />} />
      <Card.Content>
        {medicalHistory.conditions.length > 0 ? (
          medicalHistory.conditions.map((condition, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.conditionName}>{condition.name}</Text>
              <Text style={styles.conditionDetails}>
                Diagnosed: {new Date(condition.diagnosed_date).toLocaleDateString()}
              </Text>
              {condition.notes && <Text style={styles.notes}>{condition.notes}</Text>}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No medical conditions recorded</Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderAllergies = () => (
    <Card style={styles.card}>
      <Card.Title title="Allergies" left={(props) => <Icon {...props} name="error-outline" size={24} color="#FF9800" />} />
      <Card.Content>
        {medicalHistory.allergies.length > 0 ? (
          medicalHistory.allergies.map((allergy, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.allergyName}>{allergy.name}</Text>
              {allergy.severity && <Text style={styles.allergySeverity}>Severity: {allergy.severity}</Text>}
              {allergy.notes && <Text style={styles.notes}>{allergy.notes}</Text>}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No allergies recorded</Text>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {renderVitalsHistory()}
      {renderConditions()}
      {renderAllergies()}
      
      <TouchableOpacity 
        style={styles.prescriptionsButton}
        onPress={() => navigation.navigate('PrescriptionsList')}
      >
        <Icon name="description" size={24} color="#fff" />
        <Text style={styles.buttonText}>View Prescriptions History</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 8,
  },
  vitalItem: {
    marginBottom: 16,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vitalData: {
    width: '48%',
    marginBottom: 12,
  },
  vitalLabel: {
    fontSize: 12,
    color: '#666',
  },
  vitalValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  listItem: {
    marginBottom: 16,
  },
  conditionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  conditionDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  allergyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  allergySeverity: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 4,
  },
  notes: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  divider: {
    marginVertical: 12,
  },
  prescriptionsButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default MedicalHistory; 