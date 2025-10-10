import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const EmergencyInfoScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [patientInfo, setPatientInfo] = useState({});
  const [medicalConditions, setMedicalConditions] = useState([]);

  useEffect(() => {
    fetchEmergencyData();
  }, []);

  const fetchEmergencyData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/users/api/patient/emergency-info/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEmergencyContacts(data.emergency_contacts || []);
      setPatientInfo(data.patient_info || {});
      setMedicalConditions(data.medical_conditions || []);

    } catch (error) {
      console.error('Error fetching emergency data:', error);
      Alert.alert('Error', 'Failed to load emergency information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const callEmergency = (phoneNumber) => {
    Alert.alert(
      'Call Emergency Contact',
      `Are you sure you want to call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => Linking.openURL(`tel:${phoneNumber}`)
        }
      ]
    );
  };

  const renderEmergencyContact = (contact) => (
    <TouchableOpacity
      key={contact.id}
      style={styles.contactCard}
      onPress={() => callEmergency(contact.phone_number)}
    >
      <View style={styles.contactHeader}>
        <Icon name="person" size={24} color="#F44336" />
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactRelationship}>{contact.relationship}</Text>
        </View>
        <TouchableOpacity style={styles.callButton}>
          <Icon name="phone" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.contactPhone}>{contact.phone_number}</Text>
      {contact.notes && (
        <Text style={styles.contactNotes}>{contact.notes}</Text>
      )}
    </TouchableOpacity>
  );

  const renderMedicalCondition = (condition) => (
    <View key={condition.id} style={styles.conditionCard}>
      <View style={styles.conditionHeader}>
        <Icon name="medical-services" size={20} color="#F44336" />
        <Text style={styles.conditionName}>{condition.name}</Text>
      </View>
      {condition.severity && (
        <Text style={styles.conditionSeverity}>
          Severity: {condition.severity}
        </Text>
      )}
      {condition.notes && (
        <Text style={styles.conditionNotes}>{condition.notes}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F44336" />
        <Text style={styles.loadingText}>Loading emergency information...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Emergency Header */}
      <View style={styles.emergencyHeader}>
        <Icon name="warning" size={40} color="#F44336" />
        <Text style={styles.emergencyTitle}>Emergency Information</Text>
        <Text style={styles.emergencySubtitle}>
          In case of emergency, contact the numbers below
        </Text>
      </View>

      {/* Quick Emergency Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.emergencyButton, styles.ambulanceButton]}
          onPress={() => callEmergency('911')}
        >
          <Icon name="local-hospital" size={24} color="#fff" />
          <Text style={styles.emergencyButtonText}>Call 911</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.emergencyButton, styles.poisonButton]}
          onPress={() => callEmergency('1-800-222-1222')}
        >
          <Icon name="science" size={24} color="#fff" />
          <Text style={styles.emergencyButtonText}>Poison Control</Text>
        </TouchableOpacity>
      </View>

      {/* Patient Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{patientInfo.full_name || 'Not provided'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Patient ID:</Text>
            <Text style={styles.infoValue}>{patientInfo.patient_id || 'Not provided'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of Birth:</Text>
            <Text style={styles.infoValue}>{patientInfo.date_of_birth || 'Not provided'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Blood Type:</Text>
            <Text style={styles.infoValue}>{patientInfo.blood_group || 'Not provided'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Allergies:</Text>
            <Text style={styles.infoValue}>{patientInfo.allergies || 'None known'}</Text>
          </View>
        </View>
      </View>

      {/* Emergency Contacts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        {emergencyContacts.length > 0 ? (
          emergencyContacts.map(renderEmergencyContact)
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="person-off" size={64} color="#ccc" />
            <Text style={styles.noDataText}>No emergency contacts found</Text>
            <Text style={styles.noDataSubtext}>
              Please add emergency contacts in your profile settings
            </Text>
          </View>
        )}
      </View>

      {/* Medical Conditions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical Conditions</Text>
        {medicalConditions.length > 0 ? (
          medicalConditions.map(renderMedicalCondition)
        ) : (
          <Text style={styles.noDataText}>No medical conditions recorded</Text>
        )}
      </View>

      {/* Emergency Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Instructions</Text>
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionText}>
            • In case of emergency, call 911 immediately{'\n'}
            • Provide your patient ID: {patientInfo.patient_id || 'Not available'}{'\n'}
            • Inform emergency responders of any allergies or medical conditions{'\n'}
            • Keep this information accessible at all times
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emergencyHeader: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 10,
    marginBottom: 5,
  },
  emergencySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  emergencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ambulanceButton: {
    backgroundColor: '#F44336',
  },
  poisonButton: {
    backgroundColor: '#FF9800',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 15,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  contactCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  contactRelationship: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    backgroundColor: '#F44336',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactPhone: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  conditionCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conditionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  conditionSeverity: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  conditionNotes: {
    fontSize: 14,
    color: '#666',
  },
  instructionsCard: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  instructionText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 22,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default EmergencyInfoScreen;
