import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

const CreateBranchScreen = ({ navigation }) => {
  const { makeAuthenticatedRequest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [parentClinics, setParentClinics] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    clinic_type: 'branch',
    parent_clinic_id: '',
    branch_code: '',
    address: '',
    phone_number: '',
    email: ''
  });

  useEffect(() => {
    loadParentClinics();
  }, []);

  const loadParentClinics = async () => {
    try {
      const response = await makeAuthenticatedRequest('/users/api/branch/accessible-clinics/');
      const data = await response.json();
      const parents = data.clinics?.filter(clinic => clinic.clinic_type === 'parent') || [];
      setParentClinics(parents);
    } catch (error) {
      console.error('Error loading parent clinics:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Branch name is required');
      return false;
    }

    if (formData.clinic_type === 'branch' && !formData.parent_clinic_id) {
      Alert.alert('Validation Error', 'Parent clinic is required for branch type');
      return false;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest('/users/api/branch/create/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Success',
          `Branch "${data.branch.name}" created successfully!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create branch');
      }
    } catch (error) {
      console.error('Error creating branch:', error);
      Alert.alert('Error', error.message || 'Failed to create branch');
    } finally {
      setLoading(false);
    }
  };

  const clinicTypes = [
    { value: 'independent', label: 'Independent Clinic' },
    { value: 'parent', label: 'Parent Clinic' },
    { value: 'branch', label: 'Branch Clinic' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Create New Branch</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Branch Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Enter branch name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Branch Code</Text>
            <TextInput
              style={styles.input}
              value={formData.branch_code}
              onChangeText={(value) => handleInputChange('branch_code', value)}
              placeholder="e.g., BR001"
              placeholderTextColor="#999"
            />
            <Text style={styles.inputHint}>Unique identifier for this branch</Text>
          </View>
        </View>

        {/* Clinic Type and Parent */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinic Configuration</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Clinic Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.clinic_type}
                onValueChange={(value) => handleInputChange('clinic_type', value)}
                style={styles.picker}
              >
                {clinicTypes.map(type => (
                  <Picker.Item
                    key={type.value}
                    label={type.label}
                    value={type.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {formData.clinic_type === 'branch' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Parent Clinic *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.parent_clinic_id}
                  onValueChange={(value) => handleInputChange('parent_clinic_id', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select parent clinic" value="" />
                  {parentClinics.map(clinic => (
                    <Picker.Item
                      key={clinic.id}
                      label={clinic.name}
                      value={clinic.id.toString()}
                    />
                  ))}
                </Picker>
              </View>
              <Text style={styles.inputHint}>Required for branch type clinics</Text>
            </View>
          )}
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              placeholder="Enter branch address"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone_number}
              onChangeText={(value) => handleInputChange('phone_number', value)}
              placeholder="Enter phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="add" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Create Branch</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CreateBranchScreen;