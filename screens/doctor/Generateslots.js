import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
  ScrollView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const GenerateSlots = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [unavailableDays, setUnavailableDays] = useState([]);
  const [schedule, setSchedule] = useState({
    startTime: '09:00',
    endTime: '17:00',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    slotDuration: '30', // in minutes
  });
  
  const days = [
    { id: 0, name: 'Monday' },
    { id: 1, name: 'Tuesday' },
    { id: 2, name: 'Wednesday' },
    { id: 3, name: 'Thursday' },
    { id: 4, name: 'Friday' },
    { id: 5, name: 'Saturday' },
    { id: 6, name: 'Sunday' }
  ];

  const toggleDay = (dayId) => {
    if (unavailableDays.includes(dayId)) {
      setUnavailableDays(unavailableDays.filter(id => id !== dayId));
    } else {
      setUnavailableDays([...unavailableDays, dayId]);
    }
  };

  const handleGenerateSlots = async () => {
    // Validate time inputs
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(schedule.startTime) || 
        !timeRegex.test(schedule.endTime) ||
        !timeRegex.test(schedule.lunchStart) ||
        !timeRegex.test(schedule.lunchEnd)) {
      Alert.alert('Error', 'Please enter valid times in HH:MM format');
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
          unavailable_days: unavailableDays,
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
      navigation.goBack();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', error.message || 'Failed to generate slots');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Schedule Configuration</Text>

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

      <Text style={styles.sectionTitle}>Unavailable Days</Text>
      {days.map((day) => (
        <View key={day.id} style={styles.dayRow}>
          <Text style={styles.dayText}>{day.name}</Text>
          <Switch
            value={unavailableDays.includes(day.id)}
            onValueChange={() => toggleDay(day.id)}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={unavailableDays.includes(day.id) ? "#2196F3" : "#f4f3f4"}
          />
        </View>
      ))}

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
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayText: {
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
});

export default GenerateSlots;

