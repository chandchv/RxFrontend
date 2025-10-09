import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Chip,
  List,
  Searchbar,
  RadioButton,
  Switch,
  HelperText
} from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { appointmentService } from '../../services/appointmentService';
import { theme } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const ScheduleAppointmentScreen = ({ navigation, route }) => {
  const { 
    appointmentId, 
    appointment: existingAppointment, 
    editMode = false, 
    rescheduleMode = false 
  } = route.params || {};

  // Form state
  const [formData, setFormData] = useState({
    doctor_id: '',
    patient_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
    is_emergency: false,
    is_telemedicine: false,
    appointment_type_id: '',
    notes: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Data state
  const [doctors, setDoctors] = useState([]);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Modal state
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  
  // Search state
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [filteredDoctors, setFilteredDoctors] = useState([]);

  useEffect(() => {
    loadInitialData();
    
    if (existingAppointment) {
      populateFormFromAppointment(existingAppointment);
    }
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [doctorSearchQuery, doctors]);

  useEffect(() => {
    if (formData.doctor_id && formData.appointment_date) {
      loadAvailableSlots();
    }
  }, [formData.doctor_id, formData.appointment_date]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      const [doctorsResponse, typesResponse] = await Promise.all([
        appointmentService.getDoctors(),
        appointmentService.getAppointmentTypes()
      ]);

      if (doctorsResponse.success) {
        setDoctors(doctorsResponse.data.doctors);
      }

      if (typesResponse.success) {
        setAppointmentTypes(typesResponse.data.appointment_types);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load appointment data');
    } finally {
      setLoading(false);
    }
  };

  const populateFormFromAppointment = (appointment) => {
    setFormData({
      doctor_id: appointment.doctor?.id || '',
      patient_id: appointment.patient?.id || '',
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      reason: appointment.reason || '',
      is_emergency: appointment.is_emergency || false,
      is_telemedicine: appointment.is_telemedicine || false,
      appointment_type_id: appointment.scheduling_info?.appointment_type?.id || '',
      notes: appointment.scheduling_info?.notes || ''
    });
  };

  const filterDoctors = () => {
    if (!doctorSearchQuery.trim()) {
      setFilteredDoctors(doctors);
      return;
    }

    const filtered = doctors.filter(doctor => {
      const searchText = doctorSearchQuery.toLowerCase();
      return (
        doctor.name.toLowerCase().includes(searchText) ||
        doctor.specialization?.toLowerCase().includes(searchText)
      );
    });
    
    setFilteredDoctors(filtered);
  };

  const loadAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      
      const response = await appointmentService.getAvailableSlots({
        doctor_id: formData.doctor_id,
        date: formData.appointment_date,
        appointment_type_id: formData.appointment_type_id || undefined
      });

      if (response.success) {
        setAvailableSlots(response.data.slots);
      } else {
        setAvailableSlots([]);
        if (response.data?.message) {
          Alert.alert('Information', response.data.message);
        }
      }
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.doctor_id) {
      newErrors.doctor_id = 'Please select a doctor';
    }

    if (!formData.appointment_date) {
      newErrors.appointment_date = 'Please select an appointment date';
    }

    if (!formData.appointment_time) {
      newErrors.appointment_time = 'Please select an appointment time';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Please provide a reason for the appointment';
    }

    // Validate date is not in the past
    if (formData.appointment_date) {
      const appointmentDate = new Date(formData.appointment_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        newErrors.appointment_date = 'Cannot schedule appointments in the past';
      }
    }

    // Validate datetime is not in the past
    if (formData.appointment_date && formData.appointment_time) {
      const appointmentDateTime = new Date(`${formData.appointment_date}T${formData.appointment_time}`);
      const now = new Date();

      if (appointmentDateTime <= now) {
        newErrors.appointment_time = 'Cannot schedule appointments in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again');
      return;
    }

    try {
      setSaving(true);
      
      let response;
      if (editMode || rescheduleMode) {
        response = await appointmentService.updateAppointment(appointmentId, formData);
      } else {
        response = await appointmentService.createAppointment(formData);
      }

      if (response.success) {
        const action = editMode ? 'updated' : rescheduleMode ? 'rescheduled' : 'created';
        Alert.alert(
          'Success',
          `Appointment ${action} successfully`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (editMode || rescheduleMode) {
                  navigation.goBack();
                } else {
                  navigation.navigate('AppointmentList');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to save appointment');
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
      Alert.alert('Error', 'Failed to save appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleDateSelect = (day) => {
    setFormData(prev => ({ ...prev, appointment_date: day.dateString, appointment_time: '' }));
    setShowCalendar(false);
    setErrors(prev => ({ ...prev, appointment_date: null }));
  };

  const handleDoctorSelect = (doctor) => {
    setFormData(prev => ({ 
      ...prev, 
      doctor_id: doctor.id, 
      appointment_time: '' // Reset time when doctor changes
    }));
    setShowDoctorPicker(false);
    setErrors(prev => ({ ...prev, doctor_id: null }));
  };

  const handleTypeSelect = (type) => {
    setFormData(prev => ({ 
      ...prev, 
      appointment_type_id: type.id,
      appointment_time: '' // Reset time when type changes
    }));
    setShowTypePicker(false);
  };

  const handleSlotSelect = (slot) => {
    setFormData(prev => ({ ...prev, appointment_time: slot.time }));
    setShowSlotPicker(false);
    setErrors(prev => ({ ...prev, appointment_time: null }));
  };

  const getSelectedDoctor = () => {
    return doctors.find(doctor => doctor.id === formData.doctor_id);
  };

  const getSelectedType = () => {
    return appointmentTypes.find(type => type.id === formData.appointment_type_id);
  };

  const renderDoctorPicker = () => (
    <Modal
      visible={showDoctorPicker}
      animationType="slide"
      onRequestClose={() => setShowDoctorPicker(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Doctor</Text>
          <TouchableOpacity onPress={() => setShowDoctorPicker(false)}>
            <Icon name="close" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>
        
        <Searchbar
          placeholder="Search doctors..."
          onChangeText={setDoctorSearchQuery}
          value={doctorSearchQuery}
          style={styles.searchBar}
        />
        
        <ScrollView style={styles.modalContent}>
          {filteredDoctors.map((doctor) => (
            <List.Item
              key={doctor.id}
              title={doctor.name}
              description={doctor.specialization}
              left={props => <List.Icon {...props} icon="doctor" />}
              right={props => 
                formData.doctor_id === doctor.id ? 
                <List.Icon {...props} icon="check" color={theme.colors.primary} /> : 
                null
              }
              onPress={() => handleDoctorSelect(doctor)}
              style={styles.listItem}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderCalendarModal = () => (
    <Modal
      visible={showCalendar}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCalendar(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.calendarModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TouchableOpacity onPress={() => setShowCalendar(false)}>
              <Icon name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>
          <Calendar
            onDayPress={handleDateSelect}
            markedDates={formData.appointment_date ? { 
              [formData.appointment_date]: { selected: true } 
            } : {}}
            minDate={new Date().toISOString().split('T')[0]}
            theme={{
              selectedDayBackgroundColor: theme.colors.primary,
              todayTextColor: theme.colors.primary,
              arrowColor: theme.colors.primary,
            }}
          />
        </View>
      </View>
    </Modal>
  );

  const renderSlotPicker = () => (
    <Modal
      visible={showSlotPicker}
      animationType="slide"
      onRequestClose={() => setShowSlotPicker(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Time Slot</Text>
          <TouchableOpacity onPress={() => setShowSlotPicker(false)}>
            <Icon name="close" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {loadingSlots ? (
            <LoadingSpinner message="Loading available slots..." />
          ) : availableSlots.length === 0 ? (
            <View style={styles.noSlotsContainer}>
              <Text style={styles.noSlotsText}>No available slots for this date</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {availableSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.slotChip,
                    formData.appointment_time === slot.time && styles.selectedSlot
                  ]}
                  onPress={() => handleSlotSelect(slot)}
                >
                  <Text style={[
                    styles.slotText,
                    formData.appointment_time === slot.time && styles.selectedSlotText
                  ]}>
                    {slot.formatted_time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return <LoadingSpinner message="Loading appointment form..." />;
  }

  const selectedDoctor = getSelectedDoctor();
  const selectedType = getSelectedType();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.formCard}>
        <Card.Content>
          <Text style={styles.formTitle}>
            {editMode ? 'Edit Appointment' : rescheduleMode ? 'Reschedule Appointment' : 'Schedule New Appointment'}
          </Text>

          {/* Doctor Selection */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowDoctorPicker(true)}
          >
            <Text style={styles.inputLabel}>Doctor *</Text>
            <View style={[styles.pickerButton, errors.doctor_id && styles.errorInput]}>
              <Text style={selectedDoctor ? styles.selectedText : styles.placeholderText}>
                {selectedDoctor ? `Dr. ${selectedDoctor.name} - ${selectedDoctor.specialization}` : 'Select a doctor'}
              </Text>
              <Icon name="keyboard-arrow-down" size={24} color={theme.colors.onSurfaceVariant} />
            </View>
            {errors.doctor_id && <HelperText type="error">{errors.doctor_id}</HelperText>}
          </TouchableOpacity>

          {/* Date Selection */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowCalendar(true)}
          >
            <Text style={styles.inputLabel}>Appointment Date *</Text>
            <View style={[styles.pickerButton, errors.appointment_date && styles.errorInput]}>
              <Text style={formData.appointment_date ? styles.selectedText : styles.placeholderText}>
                {formData.appointment_date ? formatUtils.formatDate(formData.appointment_date) : 'Select date'}
              </Text>
              <Icon name="calendar-today" size={24} color={theme.colors.onSurfaceVariant} />
            </View>
            {errors.appointment_date && <HelperText type="error">{errors.appointment_date}</HelperText>}
          </TouchableOpacity>

          {/* Appointment Type Selection */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowTypePicker(true)}
          >
            <Text style={styles.inputLabel}>Appointment Type</Text>
            <View style={styles.pickerButton}>
              <Text style={selectedType ? styles.selectedText : styles.placeholderText}>
                {selectedType ? selectedType.name : 'Select type (optional)'}
              </Text>
              <Icon name="keyboard-arrow-down" size={24} color={theme.colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>

          {/* Time Slot Selection */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => formData.doctor_id && formData.appointment_date ? setShowSlotPicker(true) : null}
            disabled={!formData.doctor_id || !formData.appointment_date}
          >
            <Text style={styles.inputLabel}>Time Slot *</Text>
            <View style={[
              styles.pickerButton, 
              errors.appointment_time && styles.errorInput,
              (!formData.doctor_id || !formData.appointment_date) && styles.disabledInput
            ]}>
              <Text style={formData.appointment_time ? styles.selectedText : styles.placeholderText}>
                {formData.appointment_time ? formatUtils.formatTime(formData.appointment_time) : 'Select time slot'}
              </Text>
              <Icon name="access-time" size={24} color={theme.colors.onSurfaceVariant} />
            </View>
            {errors.appointment_time && <HelperText type="error">{errors.appointment_time}</HelperText>}
            {(!formData.doctor_id || !formData.appointment_date) && (
              <HelperText type="info">Please select doctor and date first</HelperText>
            )}
          </TouchableOpacity>

          {/* Reason */}
          <View style={styles.inputContainer}>
            <TextInput
              label="Reason for Visit *"
              value={formData.reason}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, reason: text }));
                setErrors(prev => ({ ...prev, reason: null }));
              }}
              multiline
              numberOfLines={3}
              error={!!errors.reason}
              style={styles.textInput}
            />
            {errors.reason && <HelperText type="error">{errors.reason}</HelperText>}
          </View>

          {/* Notes */}
          <View style={styles.inputContainer}>
            <TextInput
              label="Additional Notes"
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={2}
              style={styles.textInput}
            />
          </View>

          {/* Flags */}
          <View style={styles.flagsContainer}>
            <View style={styles.flagRow}>
              <Text style={styles.flagLabel}>Emergency Appointment</Text>
              <Switch
                value={formData.is_emergency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, is_emergency: value }))}
              />
            </View>
            
            <View style={styles.flagRow}>
              <Text style={styles.flagLabel}>Telemedicine Consultation</Text>
              <Switch
                value={formData.is_telemedicine}
                onValueChange={(value) => setFormData(prev => ({ ...prev, is_telemedicine: value }))}
              />
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          disabled={saving}
        >
          Cancel
        </Button>
        
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          loading={saving}
          disabled={saving}
        >
          {editMode ? 'Update' : rescheduleMode ? 'Reschedule' : 'Schedule'}
        </Button>
      </View>

      {/* Modals */}
      {renderDoctorPicker()}
      {renderCalendarModal()}
      {renderSlotPicker()}

      {/* Type Picker Modal */}
      <Modal
        visible={showTypePicker}
        animationType="slide"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Appointment Type</Text>
            <TouchableOpacity onPress={() => setShowTypePicker(false)}>
              <Icon name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <List.Item
              title="No specific type"
              left={props => <List.Icon {...props} icon="help" />}
              right={props => 
                !formData.appointment_type_id ? 
                <List.Icon {...props} icon="check" color={theme.colors.primary} /> : 
                null
              }
              onPress={() => {
                setFormData(prev => ({ ...prev, appointment_type_id: '' }));
                setShowTypePicker(false);
              }}
              style={styles.listItem}
            />
            
            {appointmentTypes.map((type) => (
              <List.Item
                key={type.id}
                title={type.name}
                description={`${type.duration} minutes - ${type.description}`}
                left={props => <List.Icon {...props} icon="medical-bag" />}
                right={props => 
                  formData.appointment_type_id === type.id ? 
                  <List.Icon {...props} icon="check" color={theme.colors.primary} /> : 
                  null
                }
                onPress={() => handleTypeSelect(type)}
                style={styles.listItem}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  formCard: {
    marginBottom: 16,
    elevation: 2,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  selectedText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  errorInput: {
    borderColor: theme.colors.error,
  },
  disabledInput: {
    backgroundColor: theme.colors.surfaceVariant,
    opacity: 0.6,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
  },
  flagsContainer: {
    marginTop: 8,
  },
  flagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  flagLabel: {
    fontSize: 16,
    color: theme.colors.onSurface,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    margin: 20,
    maxWidth: 400,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  modalContent: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  listItem: {
    paddingHorizontal: 16,
  },
  noSlotsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  slotChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    minWidth: 100,
    alignItems: 'center',
  },
  selectedSlot: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  slotText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  selectedSlotText: {
    color: theme.colors.onPrimary,
    fontWeight: '500',
  },
});

export default ScheduleAppointmentScreen;