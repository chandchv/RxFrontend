import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const DateRangePicker = ({ 
  visible, 
  dateRange, 
  onDateRangeChange, 
  onClose 
}) => {
  const [tempDateRange, setTempDateRange] = useState(dateRange);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setTempDateRange(prev => ({
        ...prev,
        startDate: selectedDate
      }));
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setTempDateRange(prev => ({
        ...prev,
        endDate: selectedDate
      }));
    }
  };

  const applyDateRange = () => {
    onDateRangeChange(tempDateRange);
    onClose();
  };

  const setQuickRange = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    setTempDateRange({
      startDate,
      endDate
    });
  };

  const quickRanges = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last 6 months', days: 180 },
    { label: 'Last year', days: 365 }
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Select Date Range</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Ranges</Text>
            <View style={styles.quickRangesContainer}>
              {quickRanges.map((range, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickRangeButton}
                  onPress={() => setQuickRange(range.days)}
                >
                  <Text style={styles.quickRangeText}>{range.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Range</Text>
            
            <View style={styles.datePickerContainer}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Icon name="date-range" size={20} color="#0066cc" />
                <Text style={styles.dateButtonText}>
                  {formatDate(tempDateRange.startDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              <Text style={styles.dateLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Icon name="date-range" size={20} color="#0066cc" />
                <Text style={styles.dateButtonText}>
                  {formatDate(tempDateRange.endDate)}
                </Text>
              </TouchableOpacity>
            </View>

            {tempDateRange.startDate > tempDateRange.endDate && (
              <View style={styles.errorContainer}>
                <Icon name="error" size={16} color="#dc3545" />
                <Text style={styles.errorText}>
                  Start date cannot be after end date
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected Range</Text>
            <View style={styles.rangePreview}>
              <Text style={styles.rangePreviewText}>
                {formatDate(tempDateRange.startDate)} - {formatDate(tempDateRange.endDate)}
              </Text>
              <Text style={styles.rangeDuration}>
                {Math.ceil((tempDateRange.endDate - tempDateRange.startDate) / (1000 * 60 * 60 * 24))} days
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.applyButton,
              tempDateRange.startDate > tempDateRange.endDate && styles.disabledButton
            ]}
            onPress={applyDateRange}
            disabled={tempDateRange.startDate > tempDateRange.endDate}
          >
            <Text style={[
              styles.applyButtonText,
              tempDateRange.startDate > tempDateRange.endDate && styles.disabledButtonText
            ]}>
              Apply Range
            </Text>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={tempDateRange.startDate}
            mode="date"
            display="default"
            onChange={handleStartDateChange}
            maximumDate={new Date()}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={tempDateRange.endDate}
            mode="date"
            display="default"
            onChange={handleEndDateChange}
            maximumDate={new Date()}
            minimumDate={tempDateRange.startDate}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  closeButton: {
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
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quickRangesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  quickRangeButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    margin: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066cc',
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dateButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8d7da',
    borderRadius: 6,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#dc3545',
  },
  rangePreview: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  rangePreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  rangeDuration: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#0066cc',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButtonText: {
    color: '#999',
  },
});

export default DateRangePicker;