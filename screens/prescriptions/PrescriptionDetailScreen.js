import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  Linking
} from 'react-native';
import {
  Card,
  Button,
  Chip,
  Divider,
  List,
  IconButton,
  Menu,
  Portal,
  Modal,
  TextInput
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import prescriptionService from '../../services/prescriptionService';
import { theme } from '../../styles/theme';
import { formatDate, formatDateTime } from '../../utils/formatUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const PrescriptionDetailScreen = ({ navigation, route }) => {
  const { prescriptionId, prescription: initialPrescription } = route.params;
  
  const [prescription, setPrescription] = useState(initialPrescription);
  const [prescriptionStatus, setPrescriptionStatus] = useState(null);
  const [loading, setLoading] = useState(!initialPrescription);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [refillModalVisible, setRefillModalVisible] = useState(false);
  const [refillNotes, setRefillNotes] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);

  useEffect(() => {
    loadPrescriptionDetails();
    loadPrescriptionStatus();
  }, [prescriptionId]);

  const loadPrescriptionDetails = async () => {
    if (prescription) return; // Already have prescription data
    
    try {
      setLoading(true);
      setError(null);
      const data = await prescriptionService.getPrescriptionDetail(prescriptionId);
      setPrescription(data);
    } catch (err) {
      console.error('Error loading prescription details:', err);
      setError(err.message || 'Failed to load prescription details');
    } finally {
      setLoading(false);
    }
  };

  const loadPrescriptionStatus = async () => {
    try {
      setStatusLoading(true);
      const statusData = await prescriptionService.getPrescriptionStatus(prescriptionId);
      setPrescriptionStatus(statusData);
    } catch (err) {
      console.error('Error loading prescription status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleRefillRequest = async () => {
    try {
      const refillData = {
        notes: refillNotes,
        pharmacy_id: selectedPharmacy?.id
      };

      await prescriptionService.requestRefill(prescriptionId, refillData);
      
      Alert.alert(
        'Refill Requested',
        'Your refill request has been submitted successfully. You will be notified when it\'s ready.',
        [{ text: 'OK', onPress: () => setRefillModalVisible(false) }]
      );
      
      // Refresh prescription status
      loadPrescriptionStatus();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to request refill');
    }
  };

  const handleContactDoctor = () => {
    if (prescription?.doctor?.phone_number) {
      Alert.alert(
        'Contact Doctor',
        `Call Dr. ${prescription.doctor.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => Linking.openURL(`tel:${prescription.doctor.phone_number}`)
          }
        ]
      );
    } else {
      Alert.alert('Contact Info', 'Doctor contact information not available');
    }
  };

  const handleContactPharmacy = () => {
    if (prescriptionStatus?.pharmacy_info?.phone) {
      Alert.alert(
        'Contact Pharmacy',
        `Call ${prescriptionStatus.pharmacy_info.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => Linking.openURL(`tel:${prescriptionStatus.pharmacy_info.phone}`)
          }
        ]
      );
    } else {
      Alert.alert('Contact Info', 'Pharmacy contact information not available');
    }
  };

  const renderMedicationCard = (drug, index) => {
    const dispensedQty = drug.dispensed_quantity || 0;
    const remainingQty = drug.remaining_quantity || drug.quantity;
    const progress = drug.quantity > 0 ? (dispensedQty / drug.quantity) * 100 : 0;

    return (
      <Card key={index} style={styles.medicationCard}>
        <Card.Content>
          <View style={styles.medicationHeader}>
            <View style={styles.medicationInfo}>
              <Text style={styles.medicationName}>
                {drug.drug?.product_name || 'Unknown Medication'}
              </Text>
              <Text style={styles.genericName}>
                {drug.drug?.generic_name}
              </Text>
              <Text style={styles.manufacturer}>
                {drug.drug?.manufacturer}
              </Text>
            </View>
            <View style={styles.medicationStatus}>
              {drug.is_fully_dispensed ? (
                <Chip mode="outlined" style={styles.completedChip}>
                  <Icon name="check" size={16} /> Completed
                </Chip>
              ) : (
                <Chip mode="outlined" style={styles.pendingChip}>
                  <Icon name="clock" size={16} /> Pending
                </Chip>
              )}
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.dosageInfo}>
            <Text style={styles.dosageLabel}>Dosage Instructions:</Text>
            <Text style={styles.dosageText}>
              {prescriptionService.formatDosageInstructions(drug.dosage_instructions)}
            </Text>
          </View>

          <View style={styles.quantityInfo}>
            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>Prescribed:</Text>
              <Text style={styles.quantityValue}>{drug.quantity}</Text>
            </View>
            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>Dispensed:</Text>
              <Text style={styles.quantityValue}>{dispensedQty}</Text>
            </View>
            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>Remaining:</Text>
              <Text style={styles.quantityValue}>{remainingQty}</Text>
            </View>
          </View>

          {drug.duration > 0 && (
            <View style={styles.durationInfo}>
              <Text style={styles.durationLabel}>Duration:</Text>
              <Text style={styles.durationValue}>{drug.duration} days</Text>
            </View>
          )}

          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Progress: {Math.round(progress)}%</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${progress}%`,
                    backgroundColor: drug.is_fully_dispensed ? theme.colors.primary : theme.colors.secondary
                  }
                ]} 
              />
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderDispensingHistory = () => {
    if (!prescriptionStatus?.dispensing_history?.length) {
      return (
        <Card style={styles.historyCard}>
          <Card.Content>
            <Text style={styles.noHistoryText}>No dispensing history available</Text>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles.historyCard}>
        <Card.Title title="Dispensing History" />
        <Card.Content>
          {prescriptionStatus.dispensing_history.map((dispensing, index) => (
            <View key={index} style={styles.dispensingItem}>
              <View style={styles.dispensingHeader}>
                <Text style={styles.dispensingDate}>
                  {formatDateTime(dispensing.dispensed_at)}
                </Text>
                <Text style={styles.dispensingQuantity}>
                  Qty: {dispensing.quantity}
                </Text>
              </View>
              <Text style={styles.dispensingPharmacy}>
                {dispensing.pharmacy?.name || 'Unknown Pharmacy'}
              </Text>
              <Text style={styles.dispensingStaff}>
                Dispensed by: {dispensing.dispensed_by?.name || 'Unknown Staff'}
              </Text>
              {dispensing.notes && (
                <Text style={styles.dispensingNotes}>
                  Notes: {dispensing.notes}
                </Text>
              )}
              {index < prescriptionStatus.dispensing_history.length - 1 && (
                <Divider style={styles.dispensingDivider} />
              )}
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderRefillModal = () => (
    <Portal>
      <Modal
        visible={refillModalVisible}
        onDismiss={() => setRefillModalVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Request Prescription Refill</Text>
        
        <TextInput
          label="Additional Notes (Optional)"
          value={refillNotes}
          onChangeText={setRefillNotes}
          multiline
          numberOfLines={3}
          style={styles.notesInput}
        />

        <View style={styles.modalActions}>
          <Button
            mode="outlined"
            onPress={() => setRefillModalVisible(false)}
            style={styles.modalButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleRefillRequest}
            style={styles.modalButton}
          >
            Request Refill
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  if (loading) {
    return <LoadingSpinner message="Loading prescription details..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={loadPrescriptionDetails}
      />
    );
  }

  if (!prescription) {
    return (
      <ErrorMessage
        message="Prescription not found"
        onRetry={() => navigation.goBack()}
      />
    );
  }

  const statusInfo = prescriptionService.formatStatus(prescription.status);
  const urgencyInfo = prescriptionService.getUrgencyLevel(prescription);
  const isEligibleForRefill = prescriptionService.isEligibleForRefill(prescription);

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.prescriptionInfo}>
              <Text style={styles.prescriptionId}>
                Prescription #{prescription.id}
              </Text>
              <Text style={styles.prescriptionDate}>
                Issued on {formatDate(prescription.created_at)}
              </Text>
              {prescription.expiry_date && (
                <Text style={styles.expiryDate}>
                  Expires on {formatDate(prescription.expiry_date)}
                </Text>
              )}
            </View>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              <Menu.Item
                onPress={handleContactDoctor}
                title="Contact Doctor"
                leadingIcon="phone"
              />
              {prescriptionStatus?.pharmacy_info && (
                <Menu.Item
                  onPress={handleContactPharmacy}
                  title="Contact Pharmacy"
                  leadingIcon="store"
                />
              )}
              {isEligibleForRefill && (
                <Menu.Item
                  onPress={() => setRefillModalVisible(true)}
                  title="Request Refill"
                  leadingIcon="refresh"
                />
              )}
            </Menu>
          </View>

          <View style={styles.statusRow}>
            <Chip
              mode="outlined"
              style={[styles.statusChip, { borderColor: statusInfo.color }]}
              textStyle={{ color: statusInfo.color }}
            >
              {statusInfo.label}
            </Chip>
            {urgencyInfo.level !== 'normal' && (
              <Chip
                mode="outlined"
                style={[styles.urgencyChip, { borderColor: urgencyInfo.color }]}
                textStyle={{ color: urgencyInfo.color }}
              >
                {urgencyInfo.label}
              </Chip>
            )}
          </View>

          {prescriptionStatus && (
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>
                Overall Progress: {prescriptionStatus.progress_percentage}%
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${prescriptionStatus.progress_percentage}%`,
                      backgroundColor: statusInfo.color
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressSubtitle}>
                {prescriptionStatus.fully_dispensed_drugs} of {prescriptionStatus.total_drugs} medications completed
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Doctor Information */}
      <Card style={styles.doctorCard}>
        <Card.Title
          title={`Dr. ${prescription.doctor?.name || 'Unknown Doctor'}`}
          subtitle={prescription.doctor?.specialization || 'General Practitioner'}
          left={(props) => <Icon {...props} name="doctor" size={40} />}
        />
        {prescription.doctor?.email && (
          <Card.Content>
            <Text style={styles.contactInfo}>
              Email: {prescription.doctor.email}
            </Text>
            {prescription.doctor.phone_number && (
              <Text style={styles.contactInfo}>
                Phone: {prescription.doctor.phone_number}
              </Text>
            )}
          </Card.Content>
        )}
      </Card>

      {/* Medications */}
      <Text style={styles.sectionTitle}>Medications</Text>
      {prescription.prescription_drugs?.map((drug, index) => 
        renderMedicationCard(drug, index)
      )}

      {/* Dispensing History */}
      <Text style={styles.sectionTitle}>Dispensing History</Text>
      {renderDispensingHistory()}

      {/* Pharmacy Information */}
      {prescriptionStatus?.pharmacy_info && (
        <Card style={styles.pharmacyCard}>
          <Card.Title
            title={prescriptionStatus.pharmacy_info.name}
            subtitle="Dispensing Pharmacy"
            left={(props) => <Icon {...props} name="store" size={40} />}
          />
          <Card.Content>
            <Text style={styles.pharmacyAddress}>
              {prescriptionStatus.pharmacy_info.address}
            </Text>
            <Text style={styles.contactInfo}>
              Phone: {prescriptionStatus.pharmacy_info.phone}
            </Text>
            {prescriptionStatus.pharmacy_info.email && (
              <Text style={styles.contactInfo}>
                Email: {prescriptionStatus.pharmacy_info.email}
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Notes */}
      {prescription.notes && (
        <Card style={styles.notesCard}>
          <Card.Title title="Prescription Notes" />
          <Card.Content>
            <Text style={styles.notesText}>{prescription.notes}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {isEligibleForRefill && (
          <Button
            mode="contained"
            onPress={() => setRefillModalVisible(true)}
            style={styles.actionButton}
            icon="refresh"
          >
            Request Refill
          </Button>
        )}
        <Button
          mode="outlined"
          onPress={handleContactDoctor}
          style={styles.actionButton}
          icon="phone"
        >
          Contact Doctor
        </Button>
      </View>

      {renderRefillModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerCard: {
    margin: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  prescriptionInfo: {
    flex: 1,
  },
  prescriptionId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  prescriptionDate: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  expiryDate: {
    fontSize: 14,
    color: theme.colors.error,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  statusChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  urgencyChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  progressSection: {
    marginTop: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSubtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  doctorCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  contactInfo: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 16,
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  medicationCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  genericName: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  manufacturer: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  medicationStatus: {
    alignItems: 'flex-end',
  },
  completedChip: {
    borderColor: theme.colors.primary,
  },
  pendingChip: {
    borderColor: theme.colors.secondary,
  },
  divider: {
    marginVertical: 12,
  },
  dosageInfo: {
    marginBottom: 12,
  },
  dosageLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  dosageText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  quantityInfo: {
    marginBottom: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  quantityLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  durationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  durationLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  historyCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  noHistoryText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  dispensingItem: {
    paddingVertical: 8,
  },
  dispensingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dispensingDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  dispensingQuantity: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  dispensingPharmacy: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  dispensingStaff: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  dispensingNotes: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  dispensingDivider: {
    marginTop: 8,
  },
  pharmacyCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  pharmacyAddress: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  notesCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  actionButtons: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    marginBottom: 12,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  notesInput: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default PrescriptionDetailScreen;