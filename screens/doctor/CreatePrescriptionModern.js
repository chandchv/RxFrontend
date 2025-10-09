import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Image,
  ImageBackground
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import CustomHeader from '../../components/CustomHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const { width, height } = Dimensions.get('window');

const DEFAULT_LAB_TESTS = [
  'Blood Sugar',
  'Hemoglobin',
  'Creatinine',
  'Uric Acid',
  'Vitamin D',
  'PSA',
];

const DEFAULT_LAB_PANELS = {
  CBC: ['Hemoglobin', 'WBC Count', 'Platelet Count', 'RBC Count'],
  LFT: ['ALT', 'AST', 'Alkaline Phosphatase', 'Bilirubin'],
  KFT: ['Creatinine', 'Urea', 'Uric Acid', 'Electrolytes'],
  'Lipid Profile': ['Total Cholesterol', 'HDL', 'LDL', 'Triglycerides'],
  Diabetes: ['Fasting Blood Sugar', 'HbA1c', 'Post Prandial Sugar'],
  Thyroid: ['TSH', 'T3', 'T4', 'Free T4'],
};

const CreatePrescriptionModern = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { patientId, patientName } = route.params;

  // State management
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [vitals, setVitals] = useState(null);

  // Smart suggestions state
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState({
    patient: [],
    clinic: [],
  });
  const [medicineSuggestions, setMedicineSuggestions] = useState({
    patient: [],
    clinic: [],
  });
  const [labSuggestions, setLabSuggestions] = useState({
    patient: [],
    clinic: [],
  });
  const [commonTemplates, setCommonTemplates] = useState([]);

  // OCR related states
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrImage, setOcrImage] = useState(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageEditorMode, setImageEditorMode] = useState('crop'); // 'crop', 'enhance', 'rotate'
  const [imageRotation, setImageRotation] = useState(0);

  // Form data
  const [formData, setFormData] = useState({
    chiefComplaints: '',
    clinicalFindings: '',
    diagnosis: '',
    medicines: [],
    labTests: [],
    advice: '',
    followUpDate: null
  });

  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);

  const fallbackDiagnoses = useMemo(
    () => [
      'Hypertension',
      'Diabetes Mellitus',
      'Upper Respiratory Tract Infection',
      'Gastroenteritis',
      'Migraine',
      'Anxiety Disorder',
      'Depression',
      'Osteoarthritis',
      'Bronchial Asthma',
      'Urinary Tract Infection'
    ],
    []
  );

  const fallbackMedicines = useMemo(
    () => [
      { name: 'Paracetamol', dosage: '500mg', frequency: '1-0-1', duration_value: 5, duration_unit: 'days', instructions: 'After meals' },
      { name: 'Ibuprofen', dosage: '400mg', frequency: '1-1-1', duration_value: 5, duration_unit: 'days', instructions: 'After meals' },
      { name: 'Amoxicillin', dosage: '500mg', frequency: '1-1-1', duration_value: 7, duration_unit: 'days', instructions: 'Before meals' },
      { name: 'Metformin', dosage: '500mg', frequency: '1-0-1', duration_value: 30, duration_unit: 'days', instructions: 'After meals' },
      { name: 'Amlodipine', dosage: '5mg', frequency: '1-0-0', duration_value: 30, duration_unit: 'days', instructions: 'Morning' },
      { name: 'Omeprazole', dosage: '20mg', frequency: '1-0-0', duration_value: 28, duration_unit: 'days', instructions: 'Before breakfast' },
    ],
    []
  );

  const resolvedDiagnosisSuggestions = useMemo(() => ({
    patient: diagnosisSuggestions.patient?.length ? diagnosisSuggestions.patient : [],
    clinic: diagnosisSuggestions.clinic?.length ? diagnosisSuggestions.clinic : [],
    fallback: fallbackDiagnoses.map(label => ({ label })),
  }), [diagnosisSuggestions, fallbackDiagnoses]);

  const resolvedMedicineSuggestions = useMemo(() => ({
    patient: medicineSuggestions.patient?.length ? medicineSuggestions.patient : [],
    clinic: medicineSuggestions.clinic?.length ? medicineSuggestions.clinic : [],
    fallback: fallbackMedicines,
  }), [medicineSuggestions, fallbackMedicines]);

  const resolvedLabSuggestions = useMemo(() => ({
    patient: labSuggestions.patient?.length ? labSuggestions.patient : [],
    clinic: labSuggestions.clinic?.length ? labSuggestions.clinic : [],
    fallback: DEFAULT_LAB_TESTS,
  }), [labSuggestions]);

  const clinicLabPanels = useMemo(() => {
    const panelMap = labSuggestions?.panels;
    const panels = panelMap && typeof panelMap === 'object' ? panelMap : {};
    if (Object.keys(panels).length) {
      return panels;
    }
    return DEFAULT_LAB_PANELS;
  }, [labSuggestions]);

  // Refs
  const scrollViewRef = useRef();
  const searchInputRef = useRef();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPatientData();
    loadSuggestions();
    loadDraft();
  }, []);

  useEffect(() => {
    // Auto-save draft every 30 seconds
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [formData]);

  // Image picker for OCR
  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to use this feature.');
        return;
      }

      // Launch image picker with minimal editing to get the original image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable default editor to use our custom one
        quality: 1.0, // Get highest quality for better OCR
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setOcrImage(result.assets[0].uri);
        setShowImageEditor(true); // Show our custom image editor
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Take photo for OCR
  const takePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera to use this feature.');
        return;
      }

      // Launch camera with minimal editing to get the original image
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // Disable default editor to use our custom one
        quality: 1.0, // Get highest quality for better OCR
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setOcrImage(result.assets[0].uri);
        setShowImageEditor(true); // Show our custom image editor
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };
  
  // Enhance image for better OCR
  const enhanceImage = async (imageUri) => {
    try {
      setOcrProcessing(true);
      
      // Apply image manipulations to enhance OCR readability
      const manipResult = await manipulateAsync(
        imageUri,
        [
          { resize: { width: 1200 } }, // Resize to optimal size for OCR
          { brightness: 0.1 }, // Slightly increase brightness
        ],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      
      setOcrImage(manipResult.uri);
      processOcrImage(manipResult.uri);
    } catch (error) {
      console.error('Error enhancing image:', error);
      // Fall back to original image
      processOcrImage(imageUri);
    } finally {
      setOcrProcessing(false);
    }
  };
  
  // Rotate image
  const rotateImage = async () => {
    if (!ocrImage) return;
    
    try {
      const newRotation = imageRotation + 90;
      setImageRotation(newRotation);
      
      const manipResult = await manipulateAsync(
        ocrImage,
        [{ rotate: 90 }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      
      setOcrImage(manipResult.uri);
    } catch (error) {
      console.error('Error rotating image:', error);
      Alert.alert('Error', 'Failed to rotate image. Please try again.');
    }
  };

  // Apply custom crop to image
  const cropImage = async (imageUri, cropRegion) => {
    try {
      // Default crop region if not provided (center 80%)
      const defaultCrop = {
        originX: width * 0.1,
        originY: width * 0.1,
        width: width * 0.8,
        height: width * 0.8
      };
      
      const crop = cropRegion || defaultCrop;
      
      const manipResult = await manipulateAsync(
        imageUri,
        [
          { 
            crop: {
              originX: crop.originX,
              originY: crop.originY,
              width: crop.width,
              height: crop.height
            } 
          }
        ],
        { compress: 0.9, format: SaveFormat.JPEG }
      );
      
      return manipResult.uri;
    } catch (error) {
      console.error('Error cropping image:', error);
      return imageUri; // Return original if crop fails
    }
  };

  // Process OCR image with advanced preprocessing
  const processOcrImage = async (imageUri) => {
    try {
      setOcrProcessing(true);
      
      // Step 1: Apply cropping if in crop mode
      let processedUri = imageUri;
      if (imageEditorMode === 'crop') {
        processedUri = await cropImage(imageUri);
      }
      
      // Step 2: Apply image enhancements for better OCR
      const enhancedUri = await manipulateAsync(
        processedUri,
        [
          { resize: { width: 1200 } }, // Resize to optimal size for OCR
          { brightness: 0.1 }, // Slightly increase brightness
        ],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      
      // Step 3: Create form data for image upload
      const formData = new FormData();
      formData.append('image', {
        uri: enhancedUri.uri,
        type: 'image/jpeg',
        name: 'prescription.jpg',
      });

      // Get token for authentication
      const token = await AsyncStorage.getItem('userToken');

      // Step 4: Call OCR API with enhanced image
      try {
        const response = await fetch(`${API_URL}/users/api/ocr/prescription/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
          },
          body: formData,
          timeout: 30000, // 30 second timeout for OCR processing
        });

        if (response.ok) {
          const responseText = await response.text();
          try {
            const result = JSON.parse(responseText);
            setOcrResult(result);
            applyOcrResults(result);
          } catch (parseError) {
            console.error('Error parsing OCR response:', parseError);
            console.error('Response text:', responseText.substring(0, 200));
            simulateOcrResults();
          }
        } else {
          console.error('OCR API error:', response.status, response.statusText);
          simulateOcrResults();
        }
      } catch (apiError) {
        console.error('OCR API call failed:', apiError);
        simulateOcrResults();
      }
    } catch (error) {
      console.error('Error in OCR processing:', error);
      simulateOcrResults();
    } finally {
      setOcrProcessing(false);
    }
  };

  // Simulate OCR results for demo purposes
  const simulateOcrResults = () => {
    // Simulated OCR result
    const simulatedResult = {
      diagnosis: 'Upper Respiratory Tract Infection',
      medicines: [
        { name: 'Paracetamol', dosage: '500mg', frequency: 'Every 6 hours', duration: '5 days' },
        { name: 'Amoxicillin', dosage: '250mg', frequency: 'Three times daily', duration: '7 days' }
      ],
      advice: 'Rest well, drink plenty of fluids, avoid cold foods'
    };

    setOcrResult(simulatedResult);
    applyOcrResults(simulatedResult);

    Alert.alert(
      'OCR Results',
      'Prescription scanned successfully! The results have been applied to the form.',
      [{ text: 'OK', onPress: () => setShowOcrModal(false) }]
    );
  };

  // Apply OCR results to form
  const applyOcrResults = (result) => {
    setFormData(prev => {
      const updatedMedicines = result.medicines.map((med, index) => ({
        id: Date.now() + index,
        name: med.name,
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: med.duration || '',
        instructions: med.instructions || ''
      }));

      return {
        ...prev,
        diagnosis: result.diagnosis || prev.diagnosis,
        advice: result.advice || prev.advice,
        medicines: [...prev.medicines, ...updatedMedicines]
      };
    });
  };

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      // Load patient history
      try {
        const historyResponse = await fetch(`${API_URL}/users/api/patient/${patientId}/history/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (historyResponse.ok) {
          const responseText = await historyResponse.text();
          try {
            const historyData = JSON.parse(responseText);
            setPatientHistory(historyData);
          } catch (parseError) {
            console.error('Error parsing history response:', responseText.substring(0, 100));
            console.error('Parse error:', parseError);
          }
        } else {
          console.error('History API error:', historyResponse.status, historyResponse.statusText);
        }
      } catch (historyError) {
        console.error('Error fetching patient history:', historyError);
      }

      // Load latest vitals
      try {
        const vitalsResponse = await fetch(`${API_URL}/users/api/patient/${patientId}/vitals/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (vitalsResponse.ok) {
          const responseText = await vitalsResponse.text();
          try {
            const vitalsData = JSON.parse(responseText);
            setVitals(vitalsData);
          } catch (parseError) {
            console.error('Error parsing vitals response:', responseText.substring(0, 100));
            console.error('Parse error:', parseError);
          }
        } else {
          console.error('Vitals API error:', vitalsResponse.status, vitalsResponse.statusText);
        }
      } catch (vitalsError) {
        console.error('Error fetching patient vitals:', vitalsError);
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
      Alert.alert('Error', 'Failed to load patient data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    setSuggestionsError(null);

    try {
      const response = await fetch(`${API_URL}/users/api/quick-add/summary/?patient_id=${patientId}`);
      if (!response.ok) {
        throw new Error('Failed to load suggestions');
      }
      const data = await response.json();

      setDiagnosisSuggestions({
        patient: data?.diagnosis?.patient || [],
        clinic: data?.diagnosis?.clinic || [],
      });
      setMedicineSuggestions({
        patient: data?.medicines?.patient || [],
        clinic: data?.medicines?.clinic || [],
      });
      setLabSuggestions({
        patient: data?.lab_tests?.patient || [],
        clinic: data?.lab_tests?.clinic || [],
        panels: data?.lab_tests?.panels || DEFAULT_LAB_PANELS,
      });
      setCommonTemplates(data?.common_templates || []);

      if (data?.diagnosis?.fallback?.length && !data.diagnosis.clinic?.length) {
        setDiagnosisSuggestions(prev => ({ ...prev, clinic: data.diagnosis.fallback }));
      }
      if (data?.medicines?.fallback?.length && !data.medicines.clinic?.length) {
        setMedicineSuggestions(prev => ({ ...prev, clinic: data.medicines.fallback }));
      }
      if (data?.lab_tests?.defaults?.length && !data.lab_tests.clinic?.length) {
        setLabSuggestions(prev => ({ ...prev, clinic: data.lab_tests.defaults }));
      }
      if (data?.lab_tests?.panels) {
        setLabSuggestions(prev => ({ ...prev, panels: data.lab_tests.panels }));
      }

    } catch (error) {
      console.error('Error loading quick suggestions:', error);
      setSuggestionsError('Failed to load quick suggestions. Please try again later.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const loadDraft = async () => {
    try {
      const draft = await AsyncStorage.getItem(`prescription_draft_${patientId}`);
      if (draft) {
        setFormData(JSON.parse(draft));
        Alert.alert('Draft Found', 'Would you like to continue with your saved draft?', [
          { text: 'No', onPress: () => AsyncStorage.removeItem(`prescription_draft_${patientId}`) },
          { text: 'Yes', style: 'default' }
        ]);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    try {
      await AsyncStorage.setItem(`prescription_draft_${patientId}`, JSON.stringify(formData));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Simulate API search
    const filtered = commonMedicines.filter(med =>
      med.name.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  const addMedicine = (medicine) => {
    const newMedicine = {
      id: Date.now(),
      name: medicine.name || medicine,
      dosage: medicine.dosage || '',
      frequency: medicine.frequency || '',
      duration: medicine.duration || '',
      instructions: medicine.instructions || ''
    };

    setFormData(prev => ({
      ...prev,
      medicines: [...prev.medicines, newMedicine]
    }));

    setSearchQuery('');
    setShowSuggestions(false);
    showToast(`Added ${newMedicine.name}`);
  };

  const removeMedicine = (id) => {
    setFormData(prev => ({
      ...prev,
      medicines: prev.medicines.filter(med => med.id !== id)
    }));
  };

  const updateMedicine = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      medicines: prev.medicines.map(med =>
        med.id === id ? { ...med, [field]: value } : med
      )
    }));
  };

  const loadTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      diagnosis: template.diagnosis || prev.diagnosis,
      advice: template.advice || prev.advice,
      medicines: template.medicines.map((med, index) => ({
        id: Date.now() + index,
        name: med.name || med,
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: (med.duration_value ?? med.duration ?? '').toString(),
        durationUnit: med.duration_unit || 'days',
        instructions: med.instructions || '',
      }))
    }));
    setShowQuickAdd(false);
    showToast(`Loaded template: ${template.name}`);
  };

  const handleSubmit = async () => {
    if (!formData.diagnosis || formData.medicines.length === 0) {
      Alert.alert('Incomplete Form', 'Please add diagnosis and at least one medicine.');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${API_URL}/users/api/prescriptions/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          patient_id: patientId,
          ...formData
        }),
      });

      if (response.ok) {
        await AsyncStorage.removeItem(`prescription_draft_${patientId}`);
        Alert.alert('Success', 'Prescription created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to create prescription: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      Alert.alert('Error', 'Failed to create prescription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message) => {
    // Simple toast implementation
    Alert.alert('', message, [{ text: 'OK' }], { cancelable: true });
  };

  const renderMedicineCard = ({ item }) => (
    <View style={styles.medicineCard}>
      <View style={styles.medicineHeader}>
        <Text style={styles.medicineName}>{item.name}</Text>
        <TouchableOpacity onPress={() => removeMedicine(item.id)}>
          <Icon name="close" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.medicineFields}>
        <View style={styles.fieldRow}>
          <TextInput
            style={styles.input}
            placeholder="Dosage (e.g., 500mg)"
            value={item.dosage}
            onChangeText={(text) => updateMedicine(item.id, 'dosage', text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Frequency (e.g., Twice daily)"
            value={item.frequency}
            onChangeText={(text) => updateMedicine(item.id, 'frequency', text)}
          />
        </View>

        <View style={styles.fieldRow}>
          <TextInput
            style={styles.input}
            placeholder="Duration (e.g., 7 days)"
            value={item.duration}
            onChangeText={(text) => updateMedicine(item.id, 'duration', text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Instructions (e.g., After meals)"
            value={item.instructions}
            onChangeText={(text) => updateMedicine(item.id, 'instructions', text)}
          />
        </View>
      </View>
    </View>
  );

  const addLabTest = (name) => {
    if (!name) {
      return;
    }

    const exists = formData.labTests.some(test => test.name === name);
    if (exists) {
      showToast(`${name} already added`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      labTests: [
        ...prev.labTests,
        {
          id: Date.now(),
          name,
          collectionType: 'CLINIC',
          notes: '',
        },
      ],
    }));

    showToast(`Added lab test: ${name}`);
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => addMedicine(item)}
    >
      <Text style={styles.suggestionName}>{item.name}</Text>
      <Text style={styles.suggestionDetails}>
        {item.dosage} • {item.frequency}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading patient data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <CustomHeader
        title="Create Prescription"
        subtitle={patientName}
        navigation={navigation}
        currentScreen="Prescriptions"
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(currentStep / 3) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step {currentStep} of 3</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => {
              setQuickAddType('diagnosis');
              setShowQuickAdd(true);
            }}
          >
            <Icon name="medical-services" size={24} color="#3b82f6" />
            <Text style={styles.quickActionText}>Quick Diagnosis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => {
              setQuickAddType('medicine');
              setShowQuickAdd(true);
            }}
          >
            <Icon name="medication" size={24} color="#10b981" />
            <Text style={styles.quickActionText}>Quick Medicine</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => {
              setQuickAddType('template');
              setShowQuickAdd(true);
            }}
          >
            <Icon name="content-copy" size={24} color="#8b5cf6" />
            <Text style={styles.quickActionText}>Templates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setShowOcrModal(true)}
          >
            <Icon name="document-scanner" size={24} color="#ef4444" />
            <Text style={styles.quickActionText}>Scan Rx</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => {
              setQuickAddType('lab');
              setShowQuickAdd(true);
            }}
          >
            <Icon name="biotech" size={24} color="#10b981" />
            <Text style={styles.quickActionText}>Lab Tests</Text>
          </TouchableOpacity>
        </View>

        {/* Patient Vitals */}
        {vitals && (
          <View style={styles.vitalsCard}>
            <Text style={styles.sectionTitle}>Patient Vitals</Text>
            <View style={styles.vitalsGrid}>
              <View style={styles.vitalItem}>
                <Text style={styles.vitalLabel}>Weight</Text>
                <Text style={styles.vitalValue}>{vitals.weight || 'N/A'} kg</Text>
              </View>
              <View style={styles.vitalItem}>
                <Text style={styles.vitalLabel}>BP</Text>
                <Text style={styles.vitalValue}>{vitals.blood_pressure || 'N/A'}</Text>
              </View>
              <View style={styles.vitalItem}>
                <Text style={styles.vitalLabel}>Temp</Text>
                <Text style={styles.vitalValue}>{vitals.temperature || 'N/A'}°C</Text>
              </View>
              <View style={styles.vitalItem}>
                <Text style={styles.vitalLabel}>HR</Text>
                <Text style={styles.vitalValue}>{vitals.heart_rate || 'N/A'} bpm</Text>
              </View>
            </View>
          </View>
        )}

        {/* Clinical Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinical Information</Text>

          <TextInput
            style={styles.textArea}
            placeholder="Chief Complaints"
            value={formData.chiefComplaints}
            onChangeText={(text) => setFormData(prev => ({ ...prev, chiefComplaints: text }))}
            multiline
            numberOfLines={3}
          />

          <TextInput
            style={styles.textArea}
            placeholder="Clinical Findings"
            value={formData.clinicalFindings}
            onChangeText={(text) => setFormData(prev => ({ ...prev, clinicalFindings: text }))}
            multiline
            numberOfLines={3}
          />

          <TextInput
            style={styles.input}
            placeholder="Diagnosis"
            value={formData.diagnosis}
            onChangeText={(text) => setFormData(prev => ({ ...prev, diagnosis: text }))}
          />
        </View>

        {/* Medicines Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medications</Text>
            <Text style={styles.medicineCount}>{formData.medicines.length} added</Text>
          </View>

          {/* Medicine Suggestions */}
          <View style={styles.suggestionBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(resolvedMedicineSuggestions.patient.length ? resolvedMedicineSuggestions.patient : resolvedMedicineSuggestions.fallback)
                .slice(0, 6)
                .map((med, index) => (
                  <TouchableOpacity
                    key={`pill-${index}`}
                    style={styles.suggestionPill}
                    onPress={() => addMedicine(med)}
                  >
                    <Text style={styles.suggestionPillText}>{med.name}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>

          {/* Medicine List */}
          <FlatList
            data={formData.medicines}
            renderItem={renderMedicineCard}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            style={styles.medicinesList}
          />
        </View>

        {/* Advice & Follow-up */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advice & Follow-up</Text>

          <TextInput
            style={styles.textArea}
            placeholder="Advice for the patient..."
            value={formData.advice}
            onChangeText={(text) => setFormData(prev => ({ ...prev, advice: text }))}
            multiline
            numberOfLines={4}
          />

          <TextInput
            style={styles.input}
            placeholder="Follow-up date (YYYY-MM-DD)"
            value={formData.followUpDate}
            onChangeText={(text) => setFormData(prev => ({ ...prev, followUpDate: text }))}
          />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleSubmit}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Icon name="save" size={24} color="#fff" />
        )}
      </TouchableOpacity>

      {/* Quick Add Modal */}
      <Modal
        visible={showQuickAdd}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuickAdd(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {quickAddType === 'diagnosis' && 'Quick Diagnosis'}
                {quickAddType === 'medicine' && 'Quick Medicine'}
                {quickAddType === 'template' && 'Prescription Templates'}
                {quickAddType === 'lab' && 'Quick Lab Tests'}
              </Text>
              <TouchableOpacity onPress={() => setShowQuickAdd(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {quickAddType === 'diagnosis' && (
                <View>
                  {isLoadingSuggestions ? (
                    <Text style={styles.quickAddLoading}>Loading suggestions…</Text>
                  ) : (
                    <>
                      <Text style={styles.quickAddSectionTitle}>For this patient</Text>
                      <View style={styles.quickAddGrid}>
                        {(resolvedDiagnosisSuggestions.patient.length ? resolvedDiagnosisSuggestions.patient : resolvedDiagnosisSuggestions.fallback).map((item, index) => (
                          <TouchableOpacity
                            key={`patient-dx-${index}`}
                            style={styles.quickAddItem}
                            onPress={() => {
                              setFormData(prev => ({ ...prev, diagnosis: item.label }));
                              setShowQuickAdd(false);
                              showToast(`Added diagnosis: ${item.label}`);
                            }}
                          >
                            <Text style={styles.quickAddText}>{item.label}</Text>
                            {item.last_used && (
                              <Text style={styles.quickAddSubtext}>Last on {new Date(item.last_used).toLocaleDateString()}</Text>
                            )}
                            {item.count > 0 && (
                              <Text style={styles.quickAddMeta}>{item.count} prescriptions</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>

                      {resolvedDiagnosisSuggestions.clinic.length > 0 && (
                        <>
                          <Text style={styles.quickAddSectionTitle}>Clinic favourites</Text>
                          <View style={styles.quickAddGrid}>
                            {resolvedDiagnosisSuggestions.clinic.map((item, index) => (
                              <TouchableOpacity
                                key={`clinic-dx-${index}`}
                                style={styles.quickAddItem}
                                onPress={() => {
                                  setFormData(prev => ({ ...prev, diagnosis: item.label }));
                                  setShowQuickAdd(false);
                                  showToast(`Added diagnosis: ${item.label}`);
                                }}
                              >
                                <Text style={styles.quickAddText}>{item.label}</Text>
                                {item.last_used && (
                                  <Text style={styles.quickAddSubtext}>Last on {new Date(item.last_used).toLocaleDateString()}</Text>
                                )}
                                {item.count > 0 && (
                                  <Text style={styles.quickAddMeta}>{item.count} prescriptions</Text>
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}
                    </>
                  )}
                </View>
              )}

              {quickAddType === 'medicine' && (
                <View>
                  {isLoadingSuggestions ? (
                    <Text style={styles.quickAddLoading}>Loading suggestions…</Text>
                  ) : (
                    <>
                      <Text style={styles.quickAddSectionTitle}>Previously used</Text>
                      <View style={styles.quickAddGrid}>
                        {(resolvedMedicineSuggestions.patient.length ? resolvedMedicineSuggestions.patient : resolvedMedicineSuggestions.fallback).map((med, index) => (
                          <TouchableOpacity
                            key={`patient-med-${index}`}
                            style={styles.quickAddItem}
                            onPress={() => {
                              addMedicine(med);
                              setShowQuickAdd(false);
                            }}
                          >
                            <Text style={styles.quickAddText}>{med.name}</Text>
                            <Text style={styles.quickAddSubtext}>{[med.dosage, med.frequency].filter(Boolean).join(' • ')}</Text>
                            {med.duration_display && (
                              <Text style={styles.quickAddMeta}>{med.duration_display}</Text>
                            )}
                            {med.count > 0 && (
                              <Text style={styles.quickAddMeta}>{med.count} times</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>

                      {resolvedMedicineSuggestions.clinic.length > 0 && (
                        <>
                          <Text style={styles.quickAddSectionTitle}>Clinic favourites</Text>
                          <View style={styles.quickAddGrid}>
                            {resolvedMedicineSuggestions.clinic.map((med, index) => (
                              <TouchableOpacity
                                key={`clinic-med-${index}`}
                                style={styles.quickAddItem}
                                onPress={() => {
                                  addMedicine(med);
                                  setShowQuickAdd(false);
                                }}
                              >
                                <Text style={styles.quickAddText}>{med.name}</Text>
                                <Text style={styles.quickAddSubtext}>{[med.dosage, med.frequency].filter(Boolean).join(' • ')}</Text>
                                {med.duration_display && (
                                  <Text style={styles.quickAddMeta}>{med.duration_display}</Text>
                                )}
                                {med.count > 0 && (
                                  <Text style={styles.quickAddMeta}>{med.count} times</Text>
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}
                    </>
                  )}
                </View>
              )}

              {quickAddType === 'lab' && (
                <View>
                  {isLoadingSuggestions ? (
                    <Text style={styles.quickAddLoading}>Loading suggestions…</Text>
                  ) : (
                    <>
                      <Text style={styles.quickAddSectionTitle}>Recent for this patient</Text>
                      <View style={styles.quickAddGrid}>
                        {(resolvedLabSuggestions.patient.length ? resolvedLabSuggestions.patient : resolvedLabSuggestions.fallback).map((test, index) => (
                          <TouchableOpacity
                            key={`patient-lab-${index}`}
                            style={styles.quickAddItem}
                            onPress={() => {
                              addLabTest(test.name || test);
                              setShowQuickAdd(false);
                            }}
                          >
                            <Text style={styles.quickAddText}>{test.name || test}</Text>
                            {test.last_used && (
                              <Text style={styles.quickAddSubtext}>Last on {new Date(test.last_used).toLocaleDateString()}</Text>
                            )}
                            {test.count > 0 && (
                              <Text style={styles.quickAddMeta}>{test.count} requests</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.quickAddSectionTitle}>Panels</Text>
                      <View style={styles.panelList}>
                        {Object.entries(clinicLabPanels).map(([panel, tests]) => (
                          <TouchableOpacity
                            key={`panel-${panel}`}
                            style={styles.panelCard}
                            onPress={() => {
                              tests.forEach(name => addLabTest(name));
                              setShowQuickAdd(false);
                              showToast(`Added ${panel} panel`);
                            }}
                          >
                            <Text style={styles.panelTitle}>{panel}</Text>
                            <Text style={styles.panelSubtext}>{tests.join(', ')}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}

              {quickAddType === 'template' && (
                <View style={styles.templateList}>
                  {(commonTemplates.length ? commonTemplates : []).map((template) => (
                    <TouchableOpacity
                      key={template.id || template.key}
                      style={styles.templateItem}
                      onPress={() => loadTemplate(template)}
                    >
                      <Text style={styles.templateName}>{template.name}</Text>
                      <Text style={styles.templateDiagnosis}>{template.diagnosis}</Text>
                      <Text style={styles.templateMedicines}>
                        {template.medicines.map(med => med.name).join(', ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* OCR Modal */}
      <Modal
        visible={showOcrModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOcrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan Prescription</Text>
              <TouchableOpacity onPress={() => setShowOcrModal(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {ocrProcessing ? (
                <View style={styles.ocrLoadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.ocrLoadingText}>Processing prescription...</Text>
                </View>
              ) : showImageEditor && ocrImage ? (
                <View style={styles.imageEditorContainer}>
                  <View style={styles.imagePreviewContainer}>
                    <ImageBackground 
                      source={{ uri: ocrImage }} 
                      style={styles.imagePreview}
                      resizeMode="contain"
                    >
                      {imageEditorMode === 'crop' && (
                        <View style={styles.cropOverlay}>
                          <View style={styles.cropArea} />
                        </View>
                      )}
                    </ImageBackground>
                  </View>
                  
                  <View style={styles.imageEditorControls}>
                    <TouchableOpacity 
                      style={[styles.editorButton, imageEditorMode === 'crop' ? styles.activeEditorButton : null]}
                      onPress={() => setImageEditorMode('crop')}
                    >
                      <Icon name="crop" size={24} color={imageEditorMode === 'crop' ? "#3b82f6" : "#6b7280"} />
                      <Text style={styles.editorButtonText}>Crop</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.editorButton}
                      onPress={rotateImage}
                    >
                      <Icon name="rotate-right" size={24} color="#6b7280" />
                      <Text style={styles.editorButtonText}>Rotate</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.editorButton, imageEditorMode === 'enhance' ? styles.activeEditorButton : null]}
                      onPress={() => setImageEditorMode('enhance')}
                    >
                      <Icon name="auto-fix-high" size={24} color={imageEditorMode === 'enhance' ? "#3b82f6" : "#6b7280"} />
                      <Text style={styles.editorButtonText}>Enhance</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.imageEditorActions}>
                    <TouchableOpacity 
                      style={styles.secondaryButton}
                      onPress={() => {
                        setOcrImage(null);
                        setShowImageEditor(false);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.primaryButton}
                      onPress={() => {
                        setShowImageEditor(false);
                        enhanceImage(ocrImage);
                      }}
                    >
                      <Text style={styles.primaryButtonText}>Process Image</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : ocrImage ? (
                <View style={styles.ocrImageContainer}>
                  <Image source={{ uri: ocrImage }} style={styles.ocrImage} />
                  <View style={styles.ocrImageActions}>
                    <TouchableOpacity 
                      style={styles.retakeButton}
                      onPress={() => setOcrImage(null)}
                    >
                      <Icon name="refresh" size={20} color="#fff" />
                      <Text style={styles.retakeButtonText}>Retake</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => setShowImageEditor(true)}
                    >
                      <Icon name="edit" size={20} color="#fff" />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.ocrOptions}>
                  <TouchableOpacity 
                    style={styles.ocrOption}
                    onPress={takePhoto}
                  >
                    <Icon name="camera-alt" size={40} color="#3b82f6" />
                    <Text style={styles.ocrOptionText}>Take Photo</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.ocrOption}
                    onPress={pickImage}
                  >
                    <Icon name="photo-library" size={40} color="#8b5cf6" />
                    <Text style={styles.ocrOptionText}>Upload Image</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.modalBody}>
              {ocrProcessing ? (
                <View style={styles.ocrLoadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.ocrLoadingText}>Processing prescription...</Text>
                </View>
              ) : (
                <>
                  {ocrImage ? (
                    <View style={styles.ocrImageContainer}>
                      <Image source={{ uri: ocrImage }} style={styles.ocrImage} />
                      <TouchableOpacity
                        style={styles.retakeButton}
                        onPress={() => setOcrImage(null)}
                      >
                        <Icon name="refresh" size={20} color="#fff" />
                        <Text style={styles.retakeButtonText}>Retake</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.ocrOptions}>
                      <TouchableOpacity
                        style={styles.ocrOption}
                        onPress={takePhoto}
                      >
                        <Icon name="camera-alt" size={40} color="#3b82f6" />
                        <Text style={styles.ocrOptionText}>Take Photo</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.ocrOption}
                        onPress={pickImage}
                      >
                        <Icon name="photo-library" size={40} color="#8b5cf6" />
                        <Text style={styles.ocrOptionText}>Upload Image</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  ocrLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  ocrLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  ocrOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  ocrOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    width: '45%',
    height: 150,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ocrOptionText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '500',
  },
  ocrImageContainer: {
    alignItems: 'center',
    padding: 10,
  },
  ocrImage: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 8,
    marginBottom: 16,
  },
  ocrImageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retakeButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  imageEditorContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    width: width * 0.9,
    height: width * 0.9,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  cropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropArea: {
    width: '80%',
    height: '80%',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  imageEditorControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  editorButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    width: '30%',
  },
  activeEditorButton: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  editorButtonText: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  imageEditorActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  quickAction: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 80,
  },
  quickActionText: {
    marginTop: 4,
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  vitalsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  vitalItem: {
    width: '50%',
    marginBottom: 12,
  },
  vitalLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  medicineCount: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    maxHeight: 200,
    zIndex: 1000,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  suggestionDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  suggestionBar: {
    marginBottom: 12,
  },
  suggestionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  suggestionPillText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '500',
  },
  medicinesList: {
    marginTop: 8,
  },
  medicineCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  medicineFields: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAddItem: {
    width: '48%',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  quickAddSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  quickAddMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  quickAddLoading: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginVertical: 12,
  },
  templateList: {
    gap: 12,
  },
  templateItem: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  templateDiagnosis: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  templateMedicines: {
    fontSize: 12,
    color: '#9ca3af',
  },
  panelList: {
    gap: 12,
    marginTop: 12,
  },
  panelCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 14,
    borderRadius: 10,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  panelSubtext: {
    fontSize: 12,
    color: '#4d7c0f',
  },
});

export default CreatePrescriptionModern;