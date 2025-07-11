import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPrescriptionDetails, getPharmacies, checkMedicineAvailability, requestMedicationDelivery } from '../../api/pharmacy';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Card, Divider, Button, Modal, Portal, List } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';

const PrescriptionDetailsScreen = () => {
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState([]);
  const [pharmaciesModalVisible, setPharmaciesModalVisible] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResults, setAvailabilityResults] = useState({});
  const [requestingDelivery, setRequestingDelivery] = useState(false);
  
  const route = useRoute();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { prescriptionId } = route.params;

  useEffect(() => {
    fetchPrescriptionDetails();
    fetchPharmacies();
  }, [prescriptionId]);

  const fetchPrescriptionDetails = async () => {
    try {
      setLoading(true);
      const data = await getPrescriptionDetails(prescriptionId);
      setPrescription(data);
    } catch (error) {
      console.error('Error fetching prescription details:', error);
      Alert.alert('Error', 'Failed to load prescription details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPharmacies = async () => {
    try {
      const data = await getPharmacies();
      setPharmacies(data);
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
    }
  };

  const handlePharmacySelection = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setPharmaciesModalVisible(false);
    checkAvailability(pharmacy.id);
  };

  const checkAvailability = async (pharmacyId) => {
    try {
      setCheckingAvailability(true);
      const results = {};
      
      // Check availability for each medicine in the prescription
      for (const drug of prescription.prescription_drugs) {
        const response = await checkMedicineAvailability(pharmacyId, drug.drug.id);
        results[drug.drug.id] = response.available ? 
          { available: true, quantity: response.quantity } : 
          { available: false };
      }
      
      setAvailabilityResults(results);
    } catch (error) {
      console.error('Error checking medicine availability:', error);
      Alert.alert('Error', 'Failed to check medicine availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleRequestDelivery = async () => {
    try {
      if (!selectedPharmacy) {
        Alert.alert('Error', 'Please select a pharmacy first');
        return;
      }

      setRequestingDelivery(true);
      
      // Mock delivery details - in a real app, you would collect these from the user
      const deliveryDetails = {
        address: 'Your current address',
        phone: 'Your phone number',
        notes: 'Leave at door'
      };
      
      await requestMedicationDelivery(prescriptionId, selectedPharmacy.id, deliveryDetails);
      
      Alert.alert(
        'Success', 
        'Your medication delivery request has been sent!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error requesting medication delivery:', error);
      Alert.alert('Error', 'Failed to request medication delivery');
    } finally {
      setRequestingDelivery(false);
    }
  };

  const renderAvailabilityStatus = (drugId) => {
    if (!selectedPharmacy || !availabilityResults[drugId]) {
      return null;
    }
    
    const result = availabilityResults[drugId];
    
    if (result.available) {
      return (
        <View style={styles.availabilityContainer}>
          <Ionicons name="checkmark-circle" size={16} color="green" />
          <Text style={[styles.availabilityText, { color: 'green' }]}>
            In stock ({result.quantity} available)
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.availabilityContainer}>
          <Ionicons name="close-circle" size={16} color="red" />
          <Text style={[styles.availabilityText, { color: 'red' }]}>
            Out of stock
          </Text>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading prescription details...</Text>
      </View>
    );
  }

  if (!prescription) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          Failed to load prescription details
        </Text>
        <Button 
          mode="contained" 
          onPress={fetchPrescriptionDetails}
          style={{ marginTop: 16 }}
        >
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card style={[styles.card, { backgroundColor: colors.cardBackground }]} elevation={3}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text style={[styles.prescriptionTitle, { color: colors.text }]}>
                Prescription #{prescription.id}
              </Text>
              <View style={styles.statusContainer}>
                <Text style={[styles.statusText, { color: colors.text }]}>
                  {prescription.status.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Doctor</Text>
              <Text style={[styles.doctorName, { color: colors.text }]}>
                Dr. {prescription.doctor.name}
              </Text>
              <Text style={[styles.sectionText, { color: colors.secondaryText }]}>
                {prescription.doctor.specialty}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Date</Text>
              <Text style={[styles.sectionText, { color: colors.secondaryText }]}>
                {new Date(prescription.created_at).toLocaleDateString()}
              </Text>
            </View>

            {prescription.notes && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
                  <Text style={[styles.sectionText, { color: colors.secondaryText }]}>
                    {prescription.notes}
                  </Text>
                </View>
              </>
            )}

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Medications</Text>
              
              {prescription.prescription_drugs.map((drug, index) => (
                <View key={index} style={styles.medicationItem}>
                  <View style={styles.medicationHeader}>
                    <Text style={[styles.medicationName, { color: colors.text }]}>
                      {drug.drug.product_name}
                    </Text>
                    {renderAvailabilityStatus(drug.drug.id)}
                  </View>
                  
                  <View style={styles.medicationDetails}>
                    <Text style={[styles.dosageText, { color: colors.secondaryText }]}>
                      Dosage: {drug.dosage_instructions || 'As directed'}
                    </Text>
                    <Text style={[styles.quantityText, { color: colors.secondaryText }]}>
                      Quantity: {drug.quantity}
                    </Text>
                    {drug.duration > 0 && (
                      <Text style={[styles.durationText, { color: colors.secondaryText }]}>
                        Duration: {drug.duration} days
                      </Text>
                    )}
                  </View>
                  
                  {drug.dispensed_quantity > 0 && (
                    <View style={styles.dispensedContainer}>
                      <Text style={[styles.dispensedText, { color: colors.success }]}>
                        Dispensed: {drug.dispensed_quantity} of {drug.quantity}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button 
            mode="contained" 
            onPress={() => setPharmaciesModalVisible(true)}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            disabled={prescription.status === 'fully_dispensed' || prescription.status === 'expired'}
          >
            {selectedPharmacy ? 'Change Pharmacy' : 'Select Pharmacy'}
          </Button>
          
          {selectedPharmacy && (
            <View style={styles.selectedPharmacyContainer}>
              <Text style={[styles.selectedPharmacyText, { color: colors.text }]}>
                Selected: {selectedPharmacy.name}
              </Text>
            </View>
          )}
          
          <Button 
            mode="contained" 
            onPress={handleRequestDelivery}
            loading={requestingDelivery}
            style={[styles.actionButton, { backgroundColor: colors.accent, marginTop: 12 }]}
            disabled={!selectedPharmacy || prescription.status === 'fully_dispensed' || prescription.status === 'expired'}
          >
            Request Delivery
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={pharmaciesModalVisible}
          onDismiss={() => setPharmaciesModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.cardBackground }]}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Pharmacy</Text>
          
          {pharmacies.length === 0 ? (
            <Text style={[styles.noPharmaciesText, { color: colors.secondaryText }]}>
              No pharmacies available
            </Text>
          ) : (
            <ScrollView style={styles.pharmaciesList}>
              {pharmacies.map((pharmacy) => (
                <TouchableOpacity
                  key={pharmacy.id}
                  style={styles.pharmacyItem}
                  onPress={() => handlePharmacySelection(pharmacy)}
                >
                  <List.Item
                    title={pharmacy.name}
                    description={pharmacy.address}
                    left={props => <List.Icon {...props} icon="pharmacy" />}
                    titleStyle={{ color: colors.text }}
                    descriptionStyle={{ color: colors.secondaryText }}
                  />
                  <Divider />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          
          <Button 
            onPress={() => setPharmaciesModalVisible(false)}
            style={styles.closeButton}
          >
            Close
          </Button>
        </Modal>
      </Portal>
      
      {checkingAvailability && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.overlayText, { color: 'white' }]}>
            Checking availability...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  prescriptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e3f2fd',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
  },
  sectionText: {
    fontSize: 14,
  },
  divider: {
    marginVertical: 12,
  },
  medicationItem: {
    marginVertical: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  medicationDetails: {
    marginTop: 4,
  },
  dosageText: {
    fontSize: 14,
    marginBottom: 2,
  },
  quantityText: {
    fontSize: 14,
    marginBottom: 2,
  },
  durationText: {
    fontSize: 14,
  },
  dispensedContainer: {
    marginTop: 4,
  },
  dispensedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    marginVertical: 16,
  },
  actionButton: {
    paddingVertical: 8,
  },
  selectedPharmacyContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  selectedPharmacyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modal: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  pharmaciesList: {
    marginBottom: 16,
  },
  pharmacyItem: {
    marginVertical: 2,
  },
  noPharmaciesText: {
    textAlign: 'center',
    marginVertical: 20,
  },
  closeButton: {
    marginTop: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default PrescriptionDetailsScreen; 