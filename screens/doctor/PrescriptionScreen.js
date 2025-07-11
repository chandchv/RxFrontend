import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const PrescriptionScreen = ({ navigation, route }) => {
  const { prescriptionId } = route.params;
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrescription();
  }, []);

  const fetchPrescription = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/prescriptions/${prescriptionId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch prescription');
      }

      const data = await response.json();
      setPrescription(data);
    } catch (error) {
      console.error('Error fetching prescription:', error);
      Alert.alert('Error', 'Failed to load prescription');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading prescription...</Text>
      </View>
    );
  }

  if (!prescription) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Prescription not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Prescription Details</Text>
        <Text style={styles.subtitle}>
          {new Date(prescription.created_at).toLocaleDateString()}
        </Text>
      </View>

      {/* Patient Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>
            {prescription.patient?.first_name} {prescription.patient?.last_name}
          </Text>
          <Text style={styles.patientDetails}>
            Age: {prescription.patient?.age || 'N/A'} • {prescription.patient?.gender || 'N/A'}
          </Text>
        </View>
      </View>

      {/* Doctor Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prescribed By</Text>
        <Text style={styles.doctorName}>
          Dr. {prescription.doctor?.first_name} {prescription.doctor?.last_name}
        </Text>
        <Text style={styles.doctorDetails}>
          {prescription.doctor?.specialization || 'General Practitioner'}
        </Text>
      </View>

      {/* Medications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medications</Text>
        {prescription.medications?.map((medication, index) => (
          <View key={index} style={styles.medicationCard}>
            <Text style={styles.medicationName}>{medication.name}</Text>
            <Text style={styles.medicationDetails}>
              Dosage: {medication.dosage}
            </Text>
            <Text style={styles.medicationDetails}>
              Frequency: {medication.frequency}
            </Text>
            <Text style={styles.medicationDetails}>
              Duration: {medication.duration}
            </Text>
            {medication.instructions && (
              <Text style={styles.medicationInstructions}>
                Instructions: {medication.instructions}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Notes */}
      {prescription.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <Text style={styles.notesText}>{prescription.notes}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <Pressable 
          style={styles.actionButton}
          onPress={() => Alert.alert('Feature Coming Soon', 'Print functionality will be available soon')}
        >
          <Text style={styles.actionButtonText}>Print Prescription</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => Alert.alert('Feature Coming Soon', 'Share functionality will be available soon')}
        >
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Share</Text>
        </Pressable>
      </View>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  patientInfo: {
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  doctorDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  medicationCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  medicationDetails: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  medicationInstructions: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButtonText: {
    color: '#374151',
  },
});

export default PrescriptionScreen; 