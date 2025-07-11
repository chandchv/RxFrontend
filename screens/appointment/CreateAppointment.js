import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const CreateAppointment = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [doctorInfo, setDoctorInfo] = useState(null);

  useEffect(() => {
    fetchPatients();
    fetchDoctorInfo();
  }, []);

  useEffect(() => {
    if (doctorInfo) {
      fetchAvailableSlots();
    }
  }, [selectedDate, doctorInfo]);

  const fetchPatients = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/users/api/doctor/patients/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch patients');
    }
  };

  const fetchDoctorInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('Fetching doctor info with token:', token);
      
      const response = await fetch(`${API_URL}/users/api/doctor/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Doctor info response:', data);
      
      setDoctorInfo(data);
    } catch (error) {
      console.error('Error fetching doctor info:', error);
      Alert.alert('Error', 'Failed to fetch doctor information');
    }
  };

  const handleDateChange = async (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      await fetchAvailableSlots();
    }
  };
  
  const fetchAvailableSlots = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      console.log('Fetching slots for date:', formattedDate);
      
      const response = await fetch(
        `${API_URL}/users/api/doctor/available-slots/${doctorInfo.id}/${formattedDate}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Slots response:', data);

      if (response.ok) {
        setAvailableSlots(data.slots || []);
      } else {
        throw new Error(data.error || 'Failed to fetch slots');
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      Alert.alert('Error', 'Failed to fetch available slots');
    } finally {
      setLoading(false);
    }
  };

  

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedTime) {
      Alert.alert('Error', 'Please select both patient and time slot');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const doctorData = await AsyncStorage.getItem('userData');
      const doctor = JSON.parse(doctorData);

      const response = await fetch(`${API_URL}/users/api/doctor/appointments/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient: selectedPatient,
          appointment_date: selectedDate.toISOString().split('T')[0],
          appointment_time: selectedTime,
          reason: notes || ''
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create appointment');
      }

      Alert.alert('Success', 'Appointment created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('DoctorDashboard')
        }
      ]);

    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create New Appointment</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Select Patient</Text>
        <Picker
          selectedValue={selectedPatient}
          onValueChange={(itemValue) => setSelectedPatient(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select a patient" value="" />
          {patients.map((patient) => (
            <Picker.Item
              key={patient.id}
              label={`${patient.first_name} ${patient.last_name}`}
              value={patient.id}
            />
          ))}
        </Picker>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Select Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text>{selectedDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {availableSlots.length > 0 && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Select Time Slot</Text>
          <Picker
            selectedValue={selectedTime}
            onValueChange={(itemValue) => setSelectedTime(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select a time slot" value="" />
            {availableSlots.map((slot) => (
              <Picker.Item
                time={slot.time}
                key={slot.time}
                label={slot.time}
                value={slot.time}
              />
            ))}
          </Picker>
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any notes here..."
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Create Appointment</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  picker: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default CreateAppointment; 