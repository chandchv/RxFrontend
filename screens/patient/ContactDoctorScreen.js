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
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ContactDoctorScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState('normal');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/users/api/patient/doctors/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDoctors(data.doctors || []);

    } catch (error) {
      console.error('Error fetching doctors:', error);
      Alert.alert('Error', 'Failed to load doctors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedDoctor || !message.trim()) {
      Alert.alert('Error', 'Please select a doctor and enter a message.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/patient/contact-doctor/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctor_id: selectedDoctor.id,
          message: message.trim(),
          urgency: urgency,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Message sent successfully!');
        setMessage('');
        setSelectedDoctor(null);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const getUrgencyColor = (level) => {
    switch (level) {
      case 'low': return '#4CAF50';
      case 'normal': return '#2196F3';
      case 'high': return '#FF9800';
      case 'urgent': return '#F44336';
      default: return '#666';
    }
  };

  const renderDoctorCard = (doctor) => (
    <TouchableOpacity
      key={doctor.id}
      style={[
        styles.doctorCard,
        selectedDoctor?.id === doctor.id && styles.selectedDoctorCard
      ]}
      onPress={() => setSelectedDoctor(doctor)}
    >
      <View style={styles.doctorHeader}>
        <View style={styles.doctorAvatar}>
          <Icon name="person" size={24} color="#2196F3" />
        </View>
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
          <Text style={styles.doctorSpecialization}>{doctor.specialization}</Text>
          <Text style={styles.doctorAvailability}>
            {doctor.is_available ? 'Available' : 'Not Available'}
          </Text>
        </View>
        <View style={styles.doctorActions}>
          <TouchableOpacity style={styles.callButton}>
            <Icon name="phone" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.messageButton}>
            <Icon name="message" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>
      
      {doctor.availability_hours && (
        <Text style={styles.availabilityHours}>
          Available: {doctor.availability_hours}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderUrgencyButton = (level, label) => (
    <TouchableOpacity
      style={[
        styles.urgencyButton,
        urgency === level && styles.selectedUrgencyButton,
        { borderColor: getUrgencyColor(level) }
      ]}
      onPress={() => setUrgency(level)}
    >
      <Text style={[
        styles.urgencyButtonText,
        urgency === level && { color: getUrgencyColor(level) }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading doctors...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contact Your Doctor</Text>
        <Text style={styles.headerSubtitle}>
          Send a message to your healthcare provider
        </Text>
      </View>

      {/* Select Doctor */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Doctor</Text>
        {doctors.length > 0 ? (
          doctors.map(renderDoctorCard)
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="person-off" size={64} color="#ccc" />
            <Text style={styles.noDataText}>No doctors available</Text>
          </View>
        )}
      </View>

      {/* Message Composition */}
      {selectedDoctor && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compose Message</Text>
          
          {/* Urgency Level */}
          <View style={styles.urgencyContainer}>
            <Text style={styles.urgencyLabel}>Urgency Level:</Text>
            <View style={styles.urgencyButtons}>
              {renderUrgencyButton('low', 'Low')}
              {renderUrgencyButton('normal', 'Normal')}
              {renderUrgencyButton('high', 'High')}
              {renderUrgencyButton('urgent', 'Urgent')}
            </View>
          </View>

          {/* Message Input */}
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message:</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message here..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={!message.trim()}
          >
            <Icon name="send" size={20} color="#fff" />
            <Text style={styles.sendButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="schedule" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Schedule Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="video-call" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Video Call</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        <View style={styles.emergencyCard}>
          <Icon name="warning" size={24} color="#F44336" />
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyTitle}>For Medical Emergencies</Text>
            <Text style={styles.emergencyText}>
              Call 911 immediately or go to the nearest emergency room.
            </Text>
          </View>
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
  header: {
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  doctorCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDoctorCard: {
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  doctorSpecialization: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  doctorAvailability: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  doctorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityHours: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  urgencyContainer: {
    marginBottom: 15,
  },
  urgencyLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  urgencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  urgencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#f8f9fa',
  },
  selectedUrgencyButton: {
    backgroundColor: '#f0f8ff',
  },
  urgencyButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  messageContainer: {
    marginBottom: 15,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    opacity: 1,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 5,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#ffebee',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  emergencyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 14,
    color: '#c62828',
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
});

export default ContactDoctorScreen;
