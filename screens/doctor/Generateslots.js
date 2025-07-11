import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
  ScrollView,
  Modal 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { API_URL } from '../../config';

const GenerateSlots = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [applyToAllDays, setApplyToAllDays] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [generatedSlots, setGeneratedSlots] = useState([]);
  const [schedule, setSchedule] = useState({
    startTime: '09:00',
    endTime: '17:00',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    slotDuration: '30',
  });

  const [showSlotManager, setShowSlotManager] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      fetchExistingSlots();
    }
  }, [selectedDate]);

  const fetchExistingSlots = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/doctor/slots/${selectedDate}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setGeneratedSlots(data.slots || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  const handleGenerateSlots = async () => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(schedule.startTime) || 
        !timeRegex.test(schedule.endTime) ||
        !timeRegex.test(schedule.lunchStart) ||
        !timeRegex.test(schedule.lunchEnd)) {
      Alert.alert('Error', 'Please enter valid times in HH:MM format');
      return;
    }

    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/doctor/generate-slots/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate,
          apply_to_all_days: applyToAllDays,
          schedule: {
            start_time: schedule.startTime,
            end_time: schedule.endTime,
            lunch_start: schedule.lunchStart,
            lunch_end: schedule.lunchEnd,
            slot_duration: parseInt(schedule.slotDuration)
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate slots');
      }

      Alert.alert('Success', data.message);
      fetchExistingSlots();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', error.message || 'Failed to generate slots');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSlot = async (slotId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/doctor/slots/${slotId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchExistingSlots();
        Alert.alert('Success', 'Slot removed successfully');
      } else {
        throw new Error('Failed to remove slot');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderSlotManager = () => (
    <Modal
      visible={showSlotManager}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSlotManager(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Manage Slots</Text>
          <ScrollView>
            {generatedSlots.map((slot) => (
              <View key={slot.id} style={styles.slotItem}>
                <Text style={styles.slotTime}>
                  {slot.start_time} - {slot.end_time}
                </Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveSlot(slot.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowSlotManager(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Schedule Configuration</Text>

      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowCalendar(true)}
      >
        <Text style={styles.dateButtonText}>
          {selectedDate || 'Select Date'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.calendarModal}>
          <Calendar
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setShowCalendar(false);
            }}
            markedDates={{
              [selectedDate]: { selected: true }
            }}
            minDate={new Date().toISOString().split('T')[0]}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowCalendar(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>Working Hours</Text>
        <View style={styles.timeInputRow}>
          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>Start Time</Text>
            <TextInput
              style={styles.timeInput}
              value={schedule.startTime}
              onChangeText={(text) => setSchedule({...schedule, startTime: text})}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>End Time</Text>
            <TextInput
              style={styles.timeInput}
              value={schedule.endTime}
              onChangeText={(text) => setSchedule({...schedule, endTime: text})}
              placeholder="17:00"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Lunch Break</Text>
        <View style={styles.timeInputRow}>
          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>Start Time</Text>
            <TextInput
              style={styles.timeInput}
              value={schedule.lunchStart}
              onChangeText={(text) => setSchedule({...schedule, lunchStart: text})}
              placeholder="13:00"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>End Time</Text>
            <TextInput
              style={styles.timeInput}
              value={schedule.lunchEnd}
              onChangeText={(text) => setSchedule({...schedule, lunchEnd: text})}
              placeholder="14:00"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View style={styles.slotDurationContainer}>
          <Text style={styles.label}>Slot Duration (minutes)</Text>
          <TextInput
            style={styles.durationInput}
            value={schedule.slotDuration}
            onChangeText={(text) => setSchedule({...schedule, slotDuration: text})}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Apply to all future days</Text>
        <Switch
          value={applyToAllDays}
          onValueChange={setApplyToAllDays}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={applyToAllDays ? "#2196F3" : "#f4f3f4"}
        />
      </View>

      <TouchableOpacity
        style={[styles.generateButton, loading && styles.disabledButton]}
        onPress={handleGenerateSlots}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Generate Slots</Text>
        )}
      </TouchableOpacity>

      {generatedSlots.length > 0 && (
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => setShowSlotManager(true)}
        >
          <Text style={styles.buttonText}>Manage Slots</Text>
        </TouchableOpacity>
      )}

      {renderSlotManager()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  scheduleSection: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  timeInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timeInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  slotDurationContainer: {
    marginTop: 10,
  },
  durationInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  generateButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateButton: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  calendarModal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  slotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  slotTime: {
    fontSize: 16,
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 5,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manageButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
});

export default GenerateSlots;

