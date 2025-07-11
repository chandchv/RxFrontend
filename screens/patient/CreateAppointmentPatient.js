import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import { Picker } from '@react-native-picker/picker';

const CreateAppointmentPatient = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor && date) {
      fetchAvailableSlots();
    }
  }, [selectedDoctor, date]);

  const fetchDoctors = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/doctors/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }

      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      Alert.alert('Error', 'Failed to load doctors list');
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formattedDate = date.toISOString().split('T')[0];
      const response = await fetch(
        `${API_URL}/api/appointments/available-slots/${selectedDoctor}/${formattedDate}/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch available slots');
      }

      const data = await response.json();
      setAvailableSlots(data);
    } catch (error) {
      console.error('Error fetching slots:', error);
      Alert.alert('Error', 'Failed to load available time slots');
    }
  };

  const handleCreateAppointment = async () => {
    if (!selectedDoctor || !selectedSlot || !reason) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/appointments/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctor_id: selectedDoctor,
          appointment_date: date.toISOString().split('T')[0],
          appointment_time: selectedSlot,
          reason: reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create appointment');
      }

      Alert.alert(
        'Success',
        'Appointment created successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('PatientDashboard'),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Select Doctor</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedDoctor}
            onValueChange={(itemValue) => setSelectedDoctor(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select a doctor" value="" />
            {doctors.map((doctor) => (
              <Picker.Item
                key={doctor.id}
                label={`Dr. ${doctor.user.first_name} ${doctor.user.last_name}`}
                value={doctor.id}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Select Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text>{date.toLocaleDateString()}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            testID="datePicker"
            value={date}
            mode="date"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {availableSlots.length > 0 && (
          <>
            <Text style={styles.label}>Select Time Slot</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedSlot}
                onValueChange={(itemValue) => setSelectedSlot(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select a time slot" value="" />
                {availableSlots.map((slot) => (
                  <Picker.Item
                    key={slot}
                    label={slot}
                    value={slot}
                  />
                ))}
              </Picker>
            </View>
          </>
        )}

        <TextInput
          label="Reason for Visit"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleCreateAppointment}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Book Appointment
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 4,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        borderWidth: 1,
        borderColor: '#ddd',
      },
    }),
  },
  picker: {
    height: 50,
  },
  dateButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
  },
});

export default CreateAppointmentPatient; 