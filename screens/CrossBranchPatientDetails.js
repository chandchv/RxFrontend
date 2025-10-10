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
import CrossBranchPatientHistory from '../components/CrossBranchPatientHistory';
import PatientBranchTransfer from '../components/PatientBranchTransfer';

const CrossBranchPatientDetails = ({ route, navigation }) => {
  const { patientId } = route.params;
  const { makeAuthenticatedRequest } = useAuth();
  const { 
    accessibleBranches, 
    getBranchTypeColor, 
    getBranchTypeLabel,
    canManageBranches 
  } = useBranch();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [transferModalVisible, setTransferModalVisible] = useState(false);

  useEffect(() => {
    fetchPatientDetails();
  }, [patientId]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest(
        `/users/api/cross-branch/patients/${patientId}/details/?include_history=true&include_appointments=true&include_prescriptions=true`
      );

      if (response.ok) {
        const data = await response.json();
        setPatient(data);
        
        // Set navigation title
        navigation.setOptions({
          title: `${data.first_name} ${data.last_name}`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch patient details');
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
      Alert.alert('Error', error.message || 'Failed to load patient details');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatientDetails();
  };

  const getBranchInfo = (clinicId) => {
    const branch = accessibleBranches.find(b => b.id === clinicId);
    return branch || { name: `Branch ${clinicId}`, clinic_type: 'unknown' };
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleTransferComplete = (transferData) => {
    // Refresh patient data after transfer
    fetchPatientDetails();
    Alert.alert(
      'Transfer Complete',
      'Patient has been successfully transferred. The patient details have been updated.',
      [{ text: 'OK' }]
    );
  };

  const renderBranchIndicator = (clinicId) => {
    const branch = getBranchInfo(clinicId);
    return (
      <View style={[
        styles.branchIndicator,
        { backgroundColor: getBranchTypeColor(branch.clinic_type) }
      ]}>
        <Text style={styles.branchIndicatorText}>
          {branch.branch_code || branch.name.substring(0, 3).toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderPatientHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.patientAvatar}>
        <Text style={styles.avatarText}>
          {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
        </Text>
      </View>
      
      <View style={styles.patientInfo}>
        <View style={styles.patientNameRow}>
          <Text style={styles.patientName}>
            {patient.first_name} {patient.last_name}
          </Text>
          {renderBranchIndicator(patient.clinic_id)}
        </View>
        
        <Text style={styles.patientId}>ID: {patient.patient_id}</Text>
        
        <View style={styles.patientBasicInfo}>
          <Text style={styles.basicInfoText}>
            {patient.gender} • {patient.age || calculateAge(patient.date_of_birth)} years
          </Text>
          <Text style={styles.basicInfoText}>
            {patient.phone_number} • {patient.email}
          </Text>
        </View>
        
        <View style={styles.branchInfoContainer}>
          <Icon name="location-on" size={16} color="#007AFF" />
          <Text style={styles.branchInfoText}>
            Current Branch: {getBranchInfo(patient.clinic_id).name}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('CreateAppointment', { 
          patientId: patient.id,
          patientName: `${patient.first_name} ${patient.last_name}`
        })}
      >
        <Icon name="event" size={20} color="#007AFF" />
        <Text style={styles.actionButtonText}>Book Appointment</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('CreatePrescription', { 
          patientId: patient.id,
          patientName: `${patient.first_name} ${patient.last_name}`
        })}
      >
        <Icon name="description" size={20} color="#007AFF" />
        <Text style={styles.actionButtonText}>New Prescription</Text>
      </TouchableOpacity>
      
      {canManageBranches() && (
        <TouchableOpacity
          style={[styles.actionButton, styles.transferButton]}
          onPress={() => setTransferModalVisible(true)}
        >
          <Icon name="swap-horiz" size={20} color="#FF9800" />
          <Text style={[styles.actionButtonText, styles.transferButtonText]}>
            Transfer
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'details' && styles.activeTab]}
        onPress={() => setActiveTab('details')}
      >
        <Icon 
          name="person" 
          size={20} 
          color={activeTab === 'details' ? '#007AFF' : '#666'} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'details' && styles.activeTabText
        ]}>
          Details
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'history' && styles.activeTab]}
        onPress={() => setActiveTab('history')}
      >
        <Icon 
          name="history" 
          size={20} 
          color={activeTab === 'history' ? '#007AFF' : '#666'} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'history' && styles.activeTabText
        ]}>
          Cross-Branch History
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPatientDetails = () => (
    <ScrollView style={styles.detailsContainer}>
      {/* Personal Information */}
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Full Name:</Text>
          <Text style={styles.detailValue}>
            {patient.first_name} {patient.last_name}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date of Birth:</Text>
          <Text style={styles.detailValue}>
            {new Date(patient.date_of_birth).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Gender:</Text>
          <Text style={styles.detailValue}>{patient.gender}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Age:</Text>
          <Text style={styles.detailValue}>
            {patient.age || calculateAge(patient.date_of_birth)} years
          </Text>
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>{patient.phone_number}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{patient.email}</Text>
        </View>
        
        {patient.address && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue}>{patient.address}</Text>
          </View>
        )}
      </View>

      {/* Branch Information */}
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Branch Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Branch:</Text>
          <Text style={styles.detailValue}>
            {getBranchInfo(patient.clinic_id).name}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Branch Type:</Text>
          <Text style={styles.detailValue}>
            {getBranchTypeLabel(getBranchInfo(patient.clinic_id).clinic_type)}
          </Text>
        </View>
        
        {patient.registration_date && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Registration Date:</Text>
            <Text style={styles.detailValue}>
              {new Date(patient.registration_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Recent Activity Summary */}
      {patient.recent_activity && (
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          <View style={styles.activitySummary}>
            <View style={styles.activityItem}>
              <Text style={styles.activityNumber}>
                {patient.recent_activity.total_appointments || 0}
              </Text>
              <Text style={styles.activityLabel}>Appointments</Text>
            </View>
            
            <View style={styles.activityItem}>
              <Text style={styles.activityNumber}>
                {patient.recent_activity.total_prescriptions || 0}
              </Text>
              <Text style={styles.activityLabel}>Prescriptions</Text>
            </View>
            
            <View style={styles.activityItem}>
              <Text style={styles.activityNumber}>
                {patient.recent_activity.branches_visited || 1}
              </Text>
              <Text style={styles.activityLabel}>Branches</Text>
            </View>
          </View>
          
          {patient.recent_activity.last_visit_date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Visit:</Text>
              <Text style={styles.detailValue}>
                {new Date(patient.recent_activity.last_visit_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading patient details...</Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={48} color="#ccc" />
        <Text style={styles.errorText}>Patient not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchPatientDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderPatientHeader()}
        {renderActionButtons()}
        {renderTabBar()}
        
        {activeTab === 'details' ? (
          renderPatientDetails()
        ) : (
          <CrossBranchPatientHistory 
            patientId={patientId} 
            navigation={navigation}
          />
        )}
      </ScrollView>

      <PatientBranchTransfer
        patientId={patientId}
        patientName={`${patient.first_name} ${patient.last_name}`}
        currentBranchId={patient.clinic_id}
        visible={transferModalVisible}
        onClose={() => setTransferModalVisible(false)}
        onTransferComplete={handleTransferComplete}
      />
    </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  headerContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  patientAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  patientInfo: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  branchIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  branchIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  patientId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  patientBasicInfo: {
    marginBottom: 8,
  },
  basicInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  branchInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchInfoText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  transferButton: {
    borderColor: '#FF9800',
    backgroundColor: '#fff8e1',
  },
  transferButtonText: {
    color: '#FF9800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  detailsContainer: {
    flex: 1,
  },
  detailSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    width: 120,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  activitySummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  activityItem: {
    alignItems: 'center',
  },
  activityNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  activityLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default CrossBranchPatientDetails;