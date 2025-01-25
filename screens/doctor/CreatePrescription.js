import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

const CreatePrescription = ({ route, navigation }) => {
  const { patientId, appointmentId } = route.params;
  const [loading, setLoading] = useState(false);
  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Vitals state
  const [vitals, setVitals] = useState({
    weight: '',
    height: '',
    blood_pressure: '',
    temperature: '',
    heart_rate: '',
    oxygen_saturation: ''
  });

  // Prescription data state
  const [prescriptionData, setPrescriptionData] = useState({
    chief_complaints: '',
    clinical_findings: '',
    diagnosis: '',
    advice: '',
    follow_up_date: ''
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [previousVitals, setPreviousVitals] = useState(null);
  const [showPreviousVitals, setShowPreviousVitals] = useState(false);

  useEffect(() => {
    fetchPreviousVitals();
  }, []);

  // Fetch drug suggestions
  const fetchDrugSuggestions = async (query) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/drugs/suggestions/?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch drug suggestions');
      }
      
      const data = await response.json();
      setDrugSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching drug suggestions:', error);
      setDrugSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle drug selection
  const selectDrug = (drug) => {
    setSelectedMedicines([...selectedMedicines, {
      name: drug.product_name,
      salt_composition: drug.salt_composition,
      dosage: '',
      duration: '',
      duration_unit: 'days',
      instructions: ''
    }]);
    setShowSuggestions(false);
    setSearchQuery('');
  };

  // Update medicine details
  const updateMedicine = (index, field, value) => {
    const updatedMedicines = [...selectedMedicines];
    updatedMedicines[index][field] = value;
    setSelectedMedicines(updatedMedicines);
  };

  // Remove medicine
  const removeMedicine = (index) => {
    setSelectedMedicines(selectedMedicines.filter((_, i) => i !== index));
  };

  const onFollowUpDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      setPrescriptionData({
        ...prescriptionData,
        follow_up_date: formattedDate
      });
    }
  };

  const handleSubmit = async () => {
    if (selectedMedicines.length === 0) {
      Alert.alert('Error', 'Please add at least one medicine');
      return;
    }

    // Format vitals data
    const formattedVitals = {
      weight: vitals.weight ? vitals.weight.toString() : '',
      height: vitals.height ? vitals.height.toString() : '',
      blood_pressure: vitals.blood_pressure || '',
      temperature: vitals.temperature ? vitals.temperature.toString() : '',
      heart_rate: vitals.heart_rate ? vitals.heart_rate.toString() : '',
      oxygen_saturation: vitals.oxygen_saturation ? vitals.oxygen_saturation.toString() : '',
    };

    const formData = {
      patient_id: patientId,
      appointment_id: appointmentId,
      ...formattedVitals,
      ...prescriptionData,
      follow_up_date: prescriptionData.follow_up_date || null,
      medicines: selectedMedicines.map(med => ({
        name: med.name,
        dosage: med.dosage || '1-0-0',
        duration: med.duration ? med.duration.toString() : '1',
        duration_unit: med.duration_unit || 'days',
        instructions: med.instructions || ''
      }))
    };

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/doctor/prescriptions/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create prescription');
      }

      Alert.alert('Success', 'Prescription created successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating prescription:', error);
      Alert.alert('Error', error.message || 'Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousVitals = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/doctor/patients/${patientId}/latest-vitals/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Object.keys(data).length > 0 && !data.message) {
          setPreviousVitals(data);
          setShowPreviousVitals(true);
        }
      }
    } catch (error) {
      console.error('Error fetching previous vitals:', error);
    }
  };

  const usePreviousVitals = () => {
    if (previousVitals) {
      setVitals({
        weight: previousVitals.weight,
        height: previousVitals.height,
        blood_pressure: previousVitals.blood_pressure,
        temperature: previousVitals.temperature,
        heart_rate: previousVitals.heart_rate,
        oxygen_saturation: previousVitals.oxygen_saturation
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Vitals Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Vitals</Text>
        
        {showPreviousVitals && (
          <View style={styles.previousVitalsContainer}>
            <Text style={styles.previousVitalsTitle}>
              Previous Vitals
            </Text>
            <Text style={styles.previousVitalsSubtitle}>
              Recorded by: {previousVitals?.recorded_by}
            </Text>
            <Text style={styles.previousVitalsSubtitle}>
              Date: {previousVitals?.recorded_at}
            </Text>
            <TouchableOpacity
              style={styles.usePreviousButton}
              onPress={usePreviousVitals}
            >
              <Text style={styles.usePreviousButtonText}>Use Previous Vitals</Text>
            </TouchableOpacity>
            <View style={styles.previousVitalsData}>
              <View style={styles.vitalsRow}>
                {previousVitals?.weight && (
                  <Text style={styles.vitalText}>Weight: {previousVitals.weight} kg</Text>
                )}
                {previousVitals?.height && (
                  <Text style={styles.vitalText}>Height: {previousVitals.height} cm</Text>
                )}
              </View>
              {previousVitals?.bmi && (
                <Text style={styles.vitalText}>BMI: {previousVitals.bmi}</Text>
              )}
              {previousVitals?.blood_pressure && (
                <Text style={styles.vitalText}>BP: {previousVitals.blood_pressure}</Text>
              )}
              <View style={styles.vitalsRow}>
                {previousVitals?.temperature && (
                  <Text style={styles.vitalText}>Temp: {previousVitals.temperature} °C</Text>
                )}
                {previousVitals?.heart_rate && (
                  <Text style={styles.vitalText}>Heart Rate: {previousVitals.heart_rate} bpm</Text>
                )}
              </View>
              {previousVitals?.oxygen_saturation && (
                <Text style={styles.vitalText}>O2 Sat: {previousVitals.oxygen_saturation}%</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.vitalsGrid}>
          <View style={styles.vitalInput}>
            <Text>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={vitals.weight}
              onChangeText={(text) => setVitals({...vitals, weight: text})}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.vitalInput}>
            <Text>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={vitals.height}
              onChangeText={(text) => setVitals({...vitals, height: text})}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.vitalInput}>
            <Text>Blood Pressure (mmHg)</Text>
            <TextInput
              style={styles.input}
              value={vitals.blood_pressure}
              onChangeText={(text) => setVitals({...vitals, blood_pressure: text})}
              keyboardType="numeric"
            />
            </View>
            <View style={styles.vitalInput}>
            <Text>Temperature (°C)</Text>
            <TextInput
              style={styles.input}
              value={vitals.temperature}
              onChangeText={(text) => setVitals({...vitals, temperature: text})}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.vitalInput}>
            <Text>Heart Rate (bpm)</Text>
            <TextInput
              style={styles.input}
              value={vitals.heart_rate}
              onChangeText={(text) => setVitals({...vitals, heart_rate: text})}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.vitalInput}>
            <Text>Oxygen Saturation (%)</Text>
            <TextInput
              style={styles.input}
              value={vitals.oxygen_saturation}
              onChangeText={(text) => setVitals({...vitals, oxygen_saturation: text})}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* Clinical Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clinical Details</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Chief Complaints"
          value={prescriptionData.chief_complaints}
          onChangeText={(text) => setPrescriptionData({...prescriptionData, chief_complaints: text})}
          multiline
        />
        {/* Add other clinical detail inputs */}
      </View>

      {/* Medicines Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicines</Text>
        <TextInput
          style={styles.input}
          placeholder="Search medicines..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text.length > 2) {
              fetchDrugSuggestions(text);
            } else {
              setShowSuggestions(false);
            }
          }}
        />

        {/* Drug Suggestions */}
        {showSuggestions && (
          <View style={styles.suggestionsContainer}>
            {drugSuggestions.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => selectDrug(item)}
              >
                <Text style={styles.drugName}>{item.product_name}</Text>
                <Text style={styles.saltComposition}>{item.salt_composition}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Selected Medicines List */}
        {selectedMedicines.map((medicine, index) => (
          <View key={index} style={styles.medicineItem}>
            <Text style={styles.medicineName}>{medicine.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Dosage"
              value={medicine.dosage}
              onChangeText={(text) => updateMedicine(index, 'dosage', text)}
            />
            <View style={styles.durationContainer}>
              <TextInput
                style={[styles.input, styles.durationInput]}
                placeholder="Duration"
                value={medicine.duration}
                onChangeText={(text) => updateMedicine(index, 'duration', text)}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Instructions"
                value={medicine.instructions}
                onChangeText={(text) => updateMedicine(index, 'instructions', text)}
                multiline
              />
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeMedicine(index)}
            >
              <Icon name="remove-circle" size={24} color="red" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Follow-up Date Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Follow-up Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {prescriptionData.follow_up_date 
              ? prescriptionData.follow_up_date 
              : 'Select Follow-up Date'}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={prescriptionData.follow_up_date 
              ? new Date(prescriptionData.follow_up_date) 
              : new Date()}
            mode="date"
            display="default"
            onChange={onFollowUpDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Prescription</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vitalInput: {
    width: '48%',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  suggestionsContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  drugName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  saltComposition: {
    fontSize: 14,
    color: '#666',
  },
  medicineItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationInput: {
    width: '30%',
  },
  removeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  submitButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  previousVitalsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  previousVitalsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 4,
  },
  previousVitalsSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  previousVitalsData: {
    marginTop: 12,
  },
  vitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vitalText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  usePreviousButton: {
    backgroundColor: '#0066cc',
    padding: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  usePreviousButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CreatePrescription; 