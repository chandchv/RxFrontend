import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';

const PatientBranchTransfer = ({ 
  patientId, 
  patientName,
  currentBranchId,
  visible, 
  onClose, 
  onTransferComplete 
}) => {
  const { makeAuthenticatedRequest } = useAuth();
  const { accessibleBranches, getBranchTypeColor, getBranchTypeLabel } = useBranch();
  
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [transferReason, setTransferReason] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [maintainHistory, setMaintainHistory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const transferReasons = [
    'Patient relocation',
    'Specialist referral',
    'Better accessibility',
    'Patient preference',
    'Administrative transfer',
    'Emergency transfer',
    'Other'
  ];

  useEffect(() => {
    if (selectedBranch && selectedBranch !== currentBranchId) {
      validateTransfer();
    }
  }, [selectedBranch]);

  const validateTransfer = async () => {
    if (!selectedBranch || !patientId) return;

    setValidating(true);
    try {
      const response = await makeAuthenticatedRequest(
        '/users/api/cross-branch/patients/validate-transfer/',
        {
          method: 'POST',
          body: JSON.stringify({
            patient_id: patientId,
            target_clinic_id: selectedBranch
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setValidationResult(data);
      } else {
        const errorData = await response.json();
        setValidationResult({
          can_transfer: false,
          error: errorData.error || 'Transfer validation failed'
        });
      }
    } catch (error) {
      console.error('Error validating transfer:', error);
      setValidationResult({
        can_transfer: false,
        error: 'Failed to validate transfer'
      });
    } finally {
      setValidating(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedBranch || !transferReason.trim()) {
      Alert.alert('Error', 'Please select a branch and provide a transfer reason');
      return;
    }

    if (!validationResult?.can_transfer) {
      Alert.alert('Error', 'This transfer cannot be completed. Please check validation results.');
      return;
    }

    Alert.alert(
      'Confirm Transfer',
      `Are you sure you want to transfer ${patientName} to ${getBranchName(selectedBranch)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Transfer', style: 'destructive', onPress: performTransfer }
      ]
    );
  };

  const performTransfer = async () => {
    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(
        '/users/api/cross-branch/patients/transfer/',
        {
          method: 'POST',
          body: JSON.stringify({
            patient_id: patientId,
            target_clinic_id: selectedBranch,
            transfer_reason: transferReason,
            transfer_notes: transferNotes.trim() || null,
            maintain_history: maintainHistory
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Transfer Successful',
          `${patientName} has been successfully transferred to ${getBranchName(selectedBranch)}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onTransferComplete?.(data);
                onClose();
              }
            }
          ]
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transfer failed');
      }
    } catch (error) {
      console.error('Error transferring patient:', error);
      Alert.alert('Transfer Failed', error.message || 'Failed to transfer patient');
    } finally {
      setLoading(false);
    }
  };

  const getBranchName = (branchId) => {
    const branch = accessibleBranches.find(b => b.id === branchId);
    return branch ? branch.name : `Branch ${branchId}`;
  };

  const getAvailableBranches = () => {
    return accessibleBranches.filter(branch => 
      branch.id !== currentBranchId && 
      branch.clinic_type !== 'independent' // Typically can't transfer to independent clinics
    );
  };

  const renderBranchOption = (branch) => (
    <TouchableOpacity
      key={branch.id}
      style={[
        styles.branchOption,
        selectedBranch === branch.id && styles.branchOptionSelected
      ]}
      onPress={() => setSelectedBranch(branch.id)}
    >
      <View style={styles.branchOptionContent}>
        <View style={styles.branchInfo}>
          <Text style={[
            styles.branchName,
            selectedBranch === branch.id && styles.branchNameSelected
          ]}>
            {branch.name}
          </Text>
          <Text style={styles.branchType}>
            {getBranchTypeLabel(branch.clinic_type)}
          </Text>
          {branch.address && (
            <Text style={styles.branchAddress} numberOfLines={2}>
              {branch.address}
            </Text>
          )}
        </View>
        
        <View style={styles.branchIndicator}>
          <View style={[
            styles.branchColorIndicator,
            { backgroundColor: getBranchTypeColor(branch.clinic_type) }
          ]} />
          {selectedBranch === branch.id && (
            <Icon name="check-circle" size={24} color="#4CAF50" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderValidationResult = () => {
    if (!validationResult) return null;

    return (
      <View style={[
        styles.validationContainer,
        validationResult.can_transfer ? styles.validationSuccess : styles.validationError
      ]}>
        <Icon 
          name={validationResult.can_transfer ? "check-circle" : "error"} 
          size={20} 
          color={validationResult.can_transfer ? "#4CAF50" : "#F44336"} 
        />
        <Text style={[
          styles.validationText,
          validationResult.can_transfer ? styles.validationTextSuccess : styles.validationTextError
        ]}>
          {validationResult.can_transfer 
            ? 'Transfer is allowed' 
            : validationResult.error || 'Transfer not allowed'
          }
        </Text>
      </View>
    );
  };

  const renderReasonSelector = () => (
    <View style={styles.reasonContainer}>
      <Text style={styles.sectionTitle}>Transfer Reason *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {transferReasons.map(reason => (
          <TouchableOpacity
            key={reason}
            style={[
              styles.reasonChip,
              transferReason === reason && styles.reasonChipSelected
            ]}
            onPress={() => setTransferReason(reason)}
          >
            <Text style={[
              styles.reasonChipText,
              transferReason === reason && styles.reasonChipTextSelected
            ]}>
              {reason}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (!visible) return null;

  const availableBranches = getAvailableBranches();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Transfer Patient</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Patient Info */}
            <View style={styles.patientInfoContainer}>
              <Text style={styles.patientInfoTitle}>Transferring Patient</Text>
              <Text style={styles.patientName}>{patientName}</Text>
              <Text style={styles.currentBranch}>
                Current Branch: {getBranchName(currentBranchId)}
              </Text>
            </View>

            {/* Branch Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Select Target Branch *</Text>
              {availableBranches.length > 0 ? (
                availableBranches.map(renderBranchOption)
              ) : (
                <Text style={styles.noBranchesText}>
                  No available branches for transfer
                </Text>
              )}
            </View>

            {/* Validation Result */}
            {validating && (
              <View style={styles.validatingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.validatingText}>Validating transfer...</Text>
              </View>
            )}
            {renderValidationResult()}

            {/* Transfer Reason */}
            {renderReasonSelector()}

            {/* Transfer Notes */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Additional Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Enter any additional notes about this transfer..."
                value={transferNotes}
                onChangeText={setTransferNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* History Maintenance */}
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setMaintainHistory(!maintainHistory)}
              >
                <Icon 
                  name={maintainHistory ? "check-box" : "check-box-outline-blank"} 
                  size={24} 
                  color="#007AFF" 
                />
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxText}>
                    Maintain access to previous branch history
                  </Text>
                  <Text style={styles.checkboxSubtext}>
                    Patient's medical history from current branch will remain accessible
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.transferButton,
                (!selectedBranch || !transferReason.trim() || !validationResult?.can_transfer || loading) && 
                styles.transferButtonDisabled
              ]}
              onPress={handleTransfer}
              disabled={!selectedBranch || !transferReason.trim() || !validationResult?.can_transfer || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="swap-horiz" size={20} color="#fff" />
                  <Text style={styles.transferButtonText}>Transfer Patient</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  patientInfoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  patientInfoTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  currentBranch: {
    fontSize: 14,
    color: '#007AFF',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  branchOption: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  branchOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  branchOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  branchNameSelected: {
    color: '#007AFF',
  },
  branchType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  branchAddress: {
    fontSize: 12,
    color: '#999',
  },
  branchIndicator: {
    alignItems: 'center',
  },
  branchColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  noBranchesText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 12,
  },
  validatingText: {
    marginLeft: 8,
    color: '#666',
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  validationSuccess: {
    backgroundColor: '#e8f5e9',
  },
  validationError: {
    backgroundColor: '#ffebee',
  },
  validationText: {
    marginLeft: 8,
    fontSize: 14,
  },
  validationTextSuccess: {
    color: '#2e7d32',
  },
  validationTextError: {
    color: '#c62828',
  },
  reasonContainer: {
    marginBottom: 20,
  },
  reasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  reasonChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  reasonChipText: {
    fontSize: 14,
    color: '#666',
  },
  reasonChipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  checkboxText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  checkboxSubtext: {
    fontSize: 14,
    color: '#666',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  transferButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  transferButtonDisabled: {
    backgroundColor: '#ccc',
  },
  transferButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PatientBranchTransfer;