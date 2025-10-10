import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';

const CrossBranchPatientHistory = ({ patientId, navigation }) => {
  const { makeAuthenticatedRequest } = useAuth();
  const { accessibleBranches, getBranchTypeColor, getBranchTypeLabel } = useBranch();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patientHistory, setPatientHistory] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(30);
  const [expandedSections, setExpandedSections] = useState({
    appointments: true,
    prescriptions: true,
    labResults: true,
    diagnoses: true,
    accessHistory: false
  });

  const timeRangeOptions = [
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: '6 Months', value: 180 },
    { label: '1 Year', value: 365 },
    { label: 'All Time', value: null }
  ];

  useEffect(() => {
    fetchPatientHistory();
  }, [patientId, selectedTimeRange]);

  const fetchPatientHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        include_details: 'true'
      });
      
      if (selectedTimeRange) {
        params.append('days', selectedTimeRange.toString());
      }

      const response = await makeAuthenticatedRequest(
        `/users/api/cross-branch/patients/${patientId}/history/?${params.toString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setPatientHistory(data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch patient history');
      }
    } catch (error) {
      console.error('Error fetching patient history:', error);
      Alert.alert('Error', error.message || 'Failed to load patient history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatientHistory();
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getBranchInfo = (clinicId) => {
    const branch = accessibleBranches.find(b => b.id === clinicId);
    return branch || { name: `Branch ${clinicId}`, clinic_type: 'unknown' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderBranchIndicator = (clinicId) => {
    const branch = getBranchInfo(clinicId);
    return (
      <View style={[
        styles.branchTag,
        { backgroundColor: getBranchTypeColor(branch.clinic_type) }
      ]}>
        <Text style={styles.branchTagText}>
          {branch.branch_code || branch.name.substring(0, 3).toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      <Text style={styles.timeRangeLabel}>Time Range:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {timeRangeOptions.map(option => (
          <TouchableOpacity
            key={option.value || 'all'}
            style={[
              styles.timeRangeButton,
              selectedTimeRange === option.value && styles.timeRangeButtonActive
            ]}
            onPress={() => setSelectedTimeRange(option.value)}
          >
            <Text style={[
              styles.timeRangeButtonText,
              selectedTimeRange === option.value && styles.timeRangeButtonTextActive
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSectionHeader = (title, count, section, icon) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(section)}
    >
      <View style={styles.sectionHeaderLeft}>
        <Icon name={icon} size={24} color="#007AFF" />
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
      <Icon 
        name={expandedSections[section] ? "expand-less" : "expand-more"} 
        size={24} 
        color="#666" 
      />
    </TouchableOpacity>
  );

  const renderAppointmentItem = (appointment) => (
    <View key={appointment.id} style={styles.historyItem}>
      <View style={styles.historyItemHeader}>
        <View style={styles.historyItemInfo}>
          <Text style={styles.historyItemTitle}>
            Appointment with Dr. {appointment.doctor_name}
          </Text>
          <Text style={styles.historyItemDate}>
            {formatDate(appointment.appointment_date)}
          </Text>
        </View>
        {renderBranchIndicator(appointment.clinic_id)}
      </View>
      
      <View style={styles.historyItemDetails}>
        <Text style={styles.historyItemDetail}>
          Status: <Text style={[
            styles.statusText,
            appointment.status === 'completed' && styles.statusCompleted,
            appointment.status === 'cancelled' && styles.statusCancelled
          ]}>
            {appointment.status}
          </Text>
        </Text>
        
        {appointment.diagnosis && (
          <Text style={styles.historyItemDetail}>
            Diagnosis: {appointment.diagnosis}
          </Text>
        )}
        
        {appointment.notes && (
          <Text style={styles.historyItemDetail}>
            Notes: {appointment.notes}
          </Text>
        )}
        
        <Text style={styles.branchInfoText}>
          Branch: {getBranchInfo(appointment.clinic_id).name}
        </Text>
      </View>
    </View>
  );

  const renderPrescriptionItem = (prescription) => (
    <View key={prescription.id} style={styles.historyItem}>
      <View style={styles.historyItemHeader}>
        <View style={styles.historyItemInfo}>
          <Text style={styles.historyItemTitle}>
            Prescription by Dr. {prescription.doctor_name}
          </Text>
          <Text style={styles.historyItemDate}>
            {formatDate(prescription.created_at)}
          </Text>
        </View>
        {renderBranchIndicator(prescription.clinic_id)}
      </View>
      
      <View style={styles.historyItemDetails}>
        {prescription.medications && prescription.medications.length > 0 && (
          <View style={styles.medicationsList}>
            <Text style={styles.medicationsHeader}>Medications:</Text>
            {prescription.medications.map((med, index) => (
              <Text key={index} style={styles.medicationItem}>
                • {med.name} - {med.dosage} ({med.duration})
              </Text>
            ))}
          </View>
        )}
        
        {prescription.notes && (
          <Text style={styles.historyItemDetail}>
            Notes: {prescription.notes}
          </Text>
        )}
        
        <Text style={styles.branchInfoText}>
          Branch: {getBranchInfo(prescription.clinic_id).name}
        </Text>
      </View>
    </View>
  );

  const renderLabResultItem = (labResult) => (
    <View key={labResult.id} style={styles.historyItem}>
      <View style={styles.historyItemHeader}>
        <View style={styles.historyItemInfo}>
          <Text style={styles.historyItemTitle}>
            {labResult.test_name}
          </Text>
          <Text style={styles.historyItemDate}>
            {formatDate(labResult.test_date)}
          </Text>
        </View>
        {renderBranchIndicator(labResult.clinic_id)}
      </View>
      
      <View style={styles.historyItemDetails}>
        <Text style={styles.historyItemDetail}>
          Status: <Text style={[
            styles.statusText,
            labResult.status === 'completed' && styles.statusCompleted,
            labResult.status === 'pending' && styles.statusPending
          ]}>
            {labResult.status}
          </Text>
        </Text>
        
        {labResult.results && (
          <Text style={styles.historyItemDetail}>
            Results: {labResult.results}
          </Text>
        )}
        
        {labResult.ordered_by && (
          <Text style={styles.historyItemDetail}>
            Ordered by: Dr. {labResult.ordered_by}
          </Text>
        )}
        
        <Text style={styles.branchInfoText}>
          Branch: {getBranchInfo(labResult.clinic_id).name}
        </Text>
      </View>
    </View>
  );

  const renderDiagnosisItem = (diagnosis) => (
    <View key={diagnosis.id} style={styles.historyItem}>
      <View style={styles.historyItemHeader}>
        <View style={styles.historyItemInfo}>
          <Text style={styles.historyItemTitle}>
            {diagnosis.condition}
          </Text>
          <Text style={styles.historyItemDate}>
            {formatDate(diagnosis.diagnosis_date)}
          </Text>
        </View>
        {renderBranchIndicator(diagnosis.clinic_id)}
      </View>
      
      <View style={styles.historyItemDetails}>
        {diagnosis.severity && (
          <Text style={styles.historyItemDetail}>
            Severity: {diagnosis.severity}
          </Text>
        )}
        
        {diagnosis.notes && (
          <Text style={styles.historyItemDetail}>
            Notes: {diagnosis.notes}
          </Text>
        )}
        
        {diagnosis.diagnosed_by && (
          <Text style={styles.historyItemDetail}>
            Diagnosed by: Dr. {diagnosis.diagnosed_by}
          </Text>
        )}
        
        <Text style={styles.branchInfoText}>
          Branch: {getBranchInfo(diagnosis.clinic_id).name}
        </Text>
      </View>
    </View>
  );

  const renderAccessHistoryItem = (access) => (
    <View key={access.id} style={styles.historyItem}>
      <View style={styles.historyItemHeader}>
        <View style={styles.historyItemInfo}>
          <Text style={styles.historyItemTitle}>
            {access.access_type === 'visit' ? 'Patient Visit' : 'Data Access'}
          </Text>
          <Text style={styles.historyItemDate}>
            {formatDate(access.access_date)}
          </Text>
        </View>
        {renderBranchIndicator(access.clinic_id)}
      </View>
      
      <View style={styles.historyItemDetails}>
        <Text style={styles.historyItemDetail}>
          Accessed by: {access.accessed_by_name}
        </Text>
        
        {access.purpose && (
          <Text style={styles.historyItemDetail}>
            Purpose: {access.purpose}
          </Text>
        )}
        
        <Text style={styles.branchInfoText}>
          Branch: {getBranchInfo(access.clinic_id).name}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading patient history...</Text>
      </View>
    );
  }

  if (!patientHistory) {
    return (
      <View style={styles.emptyState}>
        <Icon name="history" size={48} color="#ccc" />
        <Text style={styles.emptyStateText}>No patient history available</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {renderTimeRangeSelector()}
      
      {/* Patient Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Cross-Branch Activity Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{patientHistory.total_visits || 0}</Text>
            <Text style={styles.statLabel}>Total Visits</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{patientHistory.branches_visited || 0}</Text>
            <Text style={styles.statLabel}>Branches Visited</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{patientHistory.total_prescriptions || 0}</Text>
            <Text style={styles.statLabel}>Prescriptions</Text>
          </View>
        </View>
      </View>

      {/* Appointments Section */}
      {renderSectionHeader(
        'Appointments', 
        patientHistory.appointments?.length || 0, 
        'appointments', 
        'event'
      )}
      {expandedSections.appointments && (
        <View style={styles.sectionContent}>
          {patientHistory.appointments?.length > 0 ? (
            patientHistory.appointments.map(renderAppointmentItem)
          ) : (
            <Text style={styles.noDataText}>No appointments found</Text>
          )}
        </View>
      )}

      {/* Prescriptions Section */}
      {renderSectionHeader(
        'Prescriptions', 
        patientHistory.prescriptions?.length || 0, 
        'prescriptions', 
        'description'
      )}
      {expandedSections.prescriptions && (
        <View style={styles.sectionContent}>
          {patientHistory.prescriptions?.length > 0 ? (
            patientHistory.prescriptions.map(renderPrescriptionItem)
          ) : (
            <Text style={styles.noDataText}>No prescriptions found</Text>
          )}
        </View>
      )}

      {/* Lab Results Section */}
      {renderSectionHeader(
        'Lab Results', 
        patientHistory.lab_results?.length || 0, 
        'labResults', 
        'science'
      )}
      {expandedSections.labResults && (
        <View style={styles.sectionContent}>
          {patientHistory.lab_results?.length > 0 ? (
            patientHistory.lab_results.map(renderLabResultItem)
          ) : (
            <Text style={styles.noDataText}>No lab results found</Text>
          )}
        </View>
      )}

      {/* Diagnoses Section */}
      {renderSectionHeader(
        'Diagnoses', 
        patientHistory.diagnoses?.length || 0, 
        'diagnoses', 
        'local-hospital'
      )}
      {expandedSections.diagnoses && (
        <View style={styles.sectionContent}>
          {patientHistory.diagnoses?.length > 0 ? (
            patientHistory.diagnoses.map(renderDiagnosisItem)
          ) : (
            <Text style={styles.noDataText}>No diagnoses found</Text>
          )}
        </View>
      )}

      {/* Access History Section */}
      {renderSectionHeader(
        'Access History', 
        patientHistory.access_history?.length || 0, 
        'accessHistory', 
        'visibility'
      )}
      {expandedSections.accessHistory && (
        <View style={styles.sectionContent}>
          {patientHistory.access_history?.length > 0 ? (
            patientHistory.access_history.map(renderAccessHistoryItem)
          ) : (
            <Text style={styles.noDataText}>No access history found</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  timeRangeContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timeRangeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeRangeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  timeRangeButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  countBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionContent: {
    backgroundColor: '#fff',
    paddingBottom: 8,
  },
  historyItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 14,
    color: '#666',
  },
  branchTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  branchTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyItemDetails: {
    marginTop: 8,
  },
  historyItemDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontWeight: '500',
  },
  statusCompleted: {
    color: '#4CAF50',
  },
  statusCancelled: {
    color: '#F44336',
  },
  statusPending: {
    color: '#FF9800',
  },
  branchInfoText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  medicationsList: {
    marginBottom: 8,
  },
  medicationsHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  medicationItem: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginBottom: 2,
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
});

export default CrossBranchPatientHistory;