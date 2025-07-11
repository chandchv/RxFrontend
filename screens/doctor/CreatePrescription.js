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
  FlatList,
  Modal
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
  
  // Vitals state with proper types
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
  const patient_id = patientId; 
  const [showLabModal, setShowLabModal] = useState(false);
  const [labs, setLabs] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null);
  const [labTests, setLabTests] = useState([]);
  const [showCustomTest, setShowCustomTest] = useState(false);
  const [customTest, setCustomTest] = useState({
    test_name: '',
    collection_type: 'inhome',
    description: ''
  });

  useEffect(() => {
    fetchPreviousVitals();
    fetchLabs();
  }, []);

  // Fetch drug suggestions
  const fetchDrugSuggestions = async (query) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/users/api/drugs/suggestions/?query=${encodeURIComponent(query)}`, {
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

  // Add custom medicine manually
  const addCustomMedicine = () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a medicine name');
      return;
    }
    
    setSelectedMedicines([...selectedMedicines, {
      name: searchQuery.trim(),
      salt_composition: '',
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

  const fetchLabs = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${API_URL}/labs/api/labs/api_available_labs/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch labs');
      }
      
      if (data.status === 'success' && Array.isArray(data.labs)) {
        setLabs(data.labs);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error fetching labs:', error);
      Alert.alert('Error', error.message || 'Failed to load labs');
    }
  };

  const handleAddLabTest = () => {
    if (showCustomTest) {
      if (!customTest.test_name.trim()) {
        Alert.alert('Error', 'Please enter test name');
        return;
      }

      setLabTests(prev => [...prev, {
        lab_id: null,
        lab_name: 'Custom Test',
        test_name: customTest.test_name,
        collection_type: customTest.collection_type,
        description: customTest.description,
        is_internal: false,
        is_custom: true
      }]);
      setShowLabModal(false);
      setShowCustomTest(false);
      setCustomTest({
        test_name: '',
        collection_type: 'blood',
        description: ''
      });
    } else {
      if (!selectedLab) {
        Alert.alert('Error', 'Please select a lab first');
        return;
      }

      setLabTests(prev => [...prev, {
        lab_id: selectedLab.id,
        lab_name: selectedLab.name,
        test_name: '',
        collection_type: 'blood',
        description: '',
        is_internal: selectedLab.type === 'INHOUSE',
        is_custom: false
      }]);
      setShowLabModal(false);
      setSelectedLab(null);
    }
  };

  const handleRemoveLabTest = (index) => {
    setLabTests(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!prescriptionData.chief_complaints.trim()) {
        Alert.alert('Error', 'Chief complaints are required');
        return;
      }

      // Format the data according to the API model
      const formData = {
        patient_id: patientId,
        appointment_id: appointmentId,
        
        // Vitals data
        weight: vitals.weight ? vitals.weight.toString() : '',
        height: vitals.height ? vitals.height.toString() : '',
        blood_pressure: vitals.blood_pressure || '',
        temperature: vitals.temperature ? vitals.temperature.toString() : '',
        heart_rate: vitals.heart_rate ? vitals.heart_rate.toString() : '',
        oxygen_saturation: vitals.oxygen_saturation ? vitals.oxygen_saturation.toString() : '',
        
        // Prescription details
        chief_complaints: prescriptionData.chief_complaints,
        clinical_findings: prescriptionData.clinical_findings,
        diagnosis: prescriptionData.diagnosis,
        advice: prescriptionData.advice,
        follow_up_date: prescriptionData.follow_up_date || null,
        
        // Medicines
        medicines: selectedMedicines.map(med => ({
          name: med.name,
          dosage: med.dosage || '1-0-0',
          duration: med.duration ? med.duration.toString() : '1',
          duration_unit: med.duration_unit || 'days',
          instructions: med.instructions || ''
        })),

        // Lab Tests
        lab_tests: labTests.map(test => ({
          lab_id: test.lab_id,
          test_name: test.test_name,
          collection_type: test.collection_type,
          description: test.description,
          is_internal: test.is_internal,
          is_custom: test.is_custom
        }))
      };

      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/users/api/doctor/prescriptions/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create prescription');
      }

      // Send lab test notifications if there are any
      if (labTests.length > 0) {
        const notificationResponse = await fetch(`${API_URL}/users/api/notifications/lab-tests/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patient_id: patientId,
            prescription_id: data.id,
            lab_tests: labTests.map(test => ({
              lab_id: test.lab_id,
              test_name: test.test_name,
              collection_type: test.collection_type,
              description: test.description,
              is_internal: test.is_internal,
              is_custom: test.is_custom
            }))
          }),
        });

        if (!notificationResponse.ok) {
          console.error('Failed to send lab test notifications');
        }
      }

      Alert.alert(
        'Success',
        'Prescription created successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

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
      const response = await fetch(`${API_URL}/users/api/doctor/patients/${patientId}/latest-vitals/`, {
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
              placeholder="Enter weight"
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
          placeholder="Chief Complaints *"
          value={prescriptionData.chief_complaints}
          onChangeText={(text) => setPrescriptionData({...prescriptionData, chief_complaints: text})}
          multiline
          required
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Clinical Findings *"
          value={prescriptionData.clinical_findings}
          onChangeText={(text) => setPrescriptionData({...prescriptionData, clinical_findings: text})}
          multiline
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Diagnosis *"
          value={prescriptionData.diagnosis}
          onChangeText={(text) => setPrescriptionData({...prescriptionData, diagnosis: text})}
          multiline
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Advice *"
          value={prescriptionData.advice} 
          onChangeText={(text) => setPrescriptionData({...prescriptionData, advice: text})}
          multiline
        />
        


        {/* Add other clinical detail inputs */}
      </View>

      {/* Medicines Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicines</Text>
        <Text style={styles.instructionText}>
          Search for medicines or type a custom medicine name to add manually
        </Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.input, styles.searchInput]}
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
          {searchQuery.trim() && !showSuggestions && (
            <TouchableOpacity
              style={styles.addCustomButton}
              onPress={addCustomMedicine}
            >
              <Icon name="add" size={20} color="#fff" />
              <Text style={styles.addCustomButtonText}>Add Custom</Text>
            </TouchableOpacity>
          )}
        </View>

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
            {searchQuery.trim() && (
              <TouchableOpacity
                style={styles.customSuggestionItem}
                onPress={addCustomMedicine}
              >
                <Icon name="add-circle" size={20} color="#3f51b5" />
                <Text style={styles.customSuggestionText}>
                  Add "{searchQuery.trim()}" as custom medicine
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Manual Add Button when no suggestions */}
        {searchQuery.trim() && !showSuggestions && drugSuggestions.length === 0 && (
          <TouchableOpacity
            style={styles.manualAddButton}
            onPress={addCustomMedicine}
          >
            <Icon name="add-circle" size={20} color="#fff" />
            <Text style={styles.manualAddButtonText}>
              Add "{searchQuery.trim()}" as custom medicine
            </Text>
          </TouchableOpacity>
        )}

        {/* Selected Medicines List */}
        {selectedMedicines.map((medicine, index) => (
          <View key={index} style={styles.medicineItem}>
            <View style={styles.medicineHeader}>
              <Text style={styles.medicineName}>{medicine.name}</Text>
              {!medicine.salt_composition && (
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>Custom</Text>
                </View>
              )}
            </View>
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
                placeholder="Duration Unit"
                value={medicine.duration_unit}
                onChangeText={(text) => updateMedicine(index, 'duration_unit', text)}
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

      {/* Lab Tests Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lab Tests</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowLabModal(true)}
        >
          <Icon name="add-circle" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Lab Test</Text>
        </TouchableOpacity>

        {labTests.map((test, index) => (
          <View key={index} style={styles.labTestItem}>
            <Text style={styles.labName}>{test.lab_name}</Text>
            <Text style={styles.labType}>
              {test.is_internal ? 'Internal Lab' : 'External Lab'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Test Name"
              value={test.test_name}
              onChangeText={(text) => {
                const newTests = [...labTests];
                newTests[index].test_name = text;
                setLabTests(newTests);
              }}
            />
            <TextInput
              style={styles.input}
              placeholder="Collection Type"
              value={test.collection_type}
              onChangeText={(text) => {
                const newTests = [...labTests];
                newTests[index].collection_type = text;
                setLabTests(newTests);
              }}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={test.description}
              onChangeText={(text) => {
                const newTests = [...labTests];
                newTests[index].description = text;
                setLabTests(newTests);
              }}
              multiline
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveLabTest(index)}
            >
              <Icon name="remove-circle" size={24} color="red" />
            </TouchableOpacity>
          </View>
        ))}
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

      {/* Lab Selection Modal */}
      <Modal
        visible={showLabModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowLabModal(false);
          setShowCustomTest(false);
          setSelectedLab(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showCustomTest ? 'Add Custom Test' : 'Select Lab'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowLabModal(false);
                setShowCustomTest(false);
                setSelectedLab(null);
              }}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {showCustomTest ? (
              <View style={styles.customTestForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Test Name *"
                  value={customTest.test_name}
                  onChangeText={(text) => setCustomTest({...customTest, test_name: text})}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Collection Type"
                  value={customTest.collection_type}
                  onChangeText={(text) => setCustomTest({...customTest, collection_type: text})}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description"
                  value={customTest.description}
                  onChangeText={(text) => setCustomTest({...customTest, description: text})}
                  multiline
                />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.customTestButton}
                  onPress={() => setShowCustomTest(true)}
                >
                  <Icon name="add-circle" size={20} color="#fff" />
                  <Text style={styles.customTestButtonText}>Add Custom Test</Text>
                </TouchableOpacity>

                <FlatList
                  data={labs}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.labItem,
                        selectedLab?.id === item.id && styles.selectedLabItem
                      ]}
                      onPress={() => setSelectedLab(item)}
                    >
                      <View style={styles.labInfo}>
                        <Text style={styles.labItemName}>{item.name}</Text>
                        <Text style={styles.labItemType}>
                          {item.type === 'INHOUSE' ? 'Internal Lab' : 'External Lab'}
                        </Text>
                        {item.address && (
                          <Text style={styles.labAddress}>{item.address}</Text>
                        )}
                      </View>
                      <View style={styles.labStatus}>
                        <Icon
                          name={item.type === 'INHOUSE' ? 'business' : 'local-hospital'}
                          size={24}
                          color={selectedLab?.id === item.id ? '#3f51b5' : '#666'}
                        />
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowLabModal(false);
                  setShowCustomTest(false);
                  setSelectedLab(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddLabTest}
              >
                <Text style={styles.modalButtonText}>
                  {showCustomTest ? 'Add Test' : 'Select Lab'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  addCustomButton: {
    backgroundColor: '#3f51b5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addCustomButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
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
  customSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  customSuggestionText: {
    fontSize: 14,
    color: '#3f51b5',
    marginLeft: 8,
    fontWeight: '500',
  },
  manualAddButton: {
    backgroundColor: '#3f51b5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  manualAddButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
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
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  customBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
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
  labTestItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  labName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  labType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3f51b5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  labItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedLabItem: {
    backgroundColor: '#e3f2fd',
  },
  labInfo: {
    flex: 1,
  },
  labItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  labItemType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  labAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  labStatus: {
    marginLeft: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  confirmButton: {
    backgroundColor: '#4caf50',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  customTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3f51b5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  customTestButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  customTestForm: {
    padding: 16,
  },
});

export default CreatePrescription; 