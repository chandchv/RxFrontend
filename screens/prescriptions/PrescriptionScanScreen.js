import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  Dimensions,
  Linking
} from 'react-native';
import {
  Card,
  Button,
  TextInput,
  Chip,
  ProgressBar,
  ActivityIndicator,
  Switch,
  Divider,
  IconButton
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';

import prescriptionService from '../../services/prescriptionService';
import { FileUtils } from '../../utils/mobileUtils';
import { theme } from '../../styles/theme';
import { formatDateTime } from '../../utils/formatUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const { width } = Dimensions.get('window');

const PrescriptionScanScreen = ({ navigation, route }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [error, setError] = useState(null);
  const [useTextract, setUseTextract] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);

  useEffect(() => {
    // Request camera permissions on component mount
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and photo library permissions are required to scan prescriptions.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await FileUtils.takePhoto({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (result && !result.canceled) {
        setSelectedImage(result.assets[0]);
        setOcrResult(null);
        setExtractedData(null);
        setValidationResults(null);
        setError(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await FileUtils.pickImage({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (result && !result.canceled) {
        setSelectedImage(result.assets[0]);
        setOcrResult(null);
        setExtractedData(null);
        setValidationResults(null);
        setError(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleScanPrescription = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select or take a photo of the prescription first.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await prescriptionService.scanPrescription(selectedImage, {
        useTextract
      });

      setOcrResult(result.ocr_result);
      setExtractedData(result.extracted_data);
      setValidationResults(result.validation_results);
      setEditedData(result.extracted_data);

      // Show success message
      Alert.alert(
        'Scan Complete',
        `Prescription scanned successfully with ${result.ocr_result.confidence.toFixed(1)}% confidence.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error scanning prescription:', error);
      setError(error.message || 'Failed to scan prescription');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditData = () => {
    setEditMode(true);
  };

  const handleSaveEdits = () => {
    setExtractedData(editedData);
    const newValidation = prescriptionService.validateExtractedData(editedData);
    setValidationResults(newValidation);
    setEditMode(false);
  };

  const handleCancelEdits = () => {
    setEditedData(extractedData);
    setEditMode(false);
  };

  const handleCreatePrescription = () => {
    if (!validationResults?.isValid) {
      Alert.alert(
        'Validation Errors',
        'Please fix the validation errors before creating the prescription.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to prescription creation screen with extracted data
    navigation.navigate('CreatePrescription', {
      extractedData: editedData,
      ocrResult,
      sourceImage: selectedImage
    });
  };

  const renderImageSelection = () => (
    <Card style={styles.imageSelectionCard}>
      <Card.Content>
        <Text style={styles.sectionTitle}>Select Prescription Image</Text>
        <Text style={styles.sectionDescription}>
          Take a photo or select an image of the prescription to scan
        </Text>
        
        <View style={styles.imageButtonsContainer}>
          <Button
            mode="outlined"
            onPress={handleTakePhoto}
            style={styles.imageButton}
            icon="camera"
          >
            Take Photo
          </Button>
          <Button
            mode="outlined"
            onPress={handlePickImage}
            style={styles.imageButton}
            icon="image"
          >
            Select Image
          </Button>
        </View>

        {selectedImage && (
          <View style={styles.selectedImageContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
            <View style={styles.imageInfo}>
              <Text style={styles.imageInfoText}>
                Size: {(selectedImage.fileSize / 1024 / 1024).toFixed(2)} MB
              </Text>
              <Text style={styles.imageInfoText}>
                Dimensions: {selectedImage.width} x {selectedImage.height}
              </Text>
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderScanOptions = () => (
    <Card style={styles.scanOptionsCard}>
      <Card.Content>
        <Text style={styles.sectionTitle}>Scan Options</Text>
        
        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Use Advanced OCR (Textract)</Text>
            <Text style={styles.optionDescription}>
              Higher accuracy but may take longer to process
            </Text>
          </View>
          <Switch
            value={useTextract}
            onValueChange={setUseTextract}
            disabled={processing}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleScanPrescription}
          disabled={!selectedImage || processing}
          style={styles.scanButton}
          icon="magnify-scan"
        >
          {processing ? 'Scanning...' : 'Scan Prescription'}
        </Button>
      </Card.Content>
    </Card>
  );

  const renderProcessingStatus = () => {
    if (!processing) return null;

    return (
      <Card style={styles.processingCard}>
        <Card.Content>
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.processingTitle}>Processing Prescription</Text>
            <Text style={styles.processingDescription}>
              {useTextract 
                ? 'Using advanced OCR for better accuracy...' 
                : 'Processing with local OCR...'
              }
            </Text>
            <ProgressBar indeterminate color={theme.colors.primary} style={styles.progressBar} />
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderOcrResults = () => {
    if (!ocrResult) return null;

    return (
      <Card style={styles.ocrResultsCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>OCR Results</Text>
            <Chip
              mode="outlined"
              style={[
                styles.confidenceChip,
                { borderColor: getConfidenceColor(ocrResult.confidence) }
              ]}
              textStyle={{ color: getConfidenceColor(ocrResult.confidence) }}
            >
              {(ocrResult.confidence * 100).toFixed(1)}% Confidence
            </Chip>
          </View>

          <View style={styles.ocrMetadata}>
            <Text style={styles.metadataItem}>
              Method: {ocrResult.processing_method}
            </Text>
            <Text style={styles.metadataItem}>
              Processing Time: {ocrResult.processing_time.toFixed(2)}s
            </Text>
          </View>

          <View style={styles.extractedTextContainer}>
            <Text style={styles.extractedTextTitle}>Extracted Text:</Text>
            <ScrollView style={styles.extractedTextScroll} nestedScrollEnabled>
              <Text style={styles.extractedText}>{ocrResult.text}</Text>
            </ScrollView>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderExtractedData = () => {
    if (!extractedData) return null;

    const dataToShow = editMode ? editedData : extractedData;

    return (
      <Card style={styles.extractedDataCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Extracted Information</Text>
            <View style={styles.cardActions}>
              {!editMode ? (
                <IconButton
                  icon="pencil"
                  onPress={handleEditData}
                  size={20}
                />
              ) : (
                <View style={styles.editActions}>
                  <IconButton
                    icon="check"
                    onPress={handleSaveEdits}
                    size={20}
                    iconColor={theme.colors.primary}
                  />
                  <IconButton
                    icon="close"
                    onPress={handleCancelEdits}
                    size={20}
                    iconColor={theme.colors.error}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Patient Information */}
          <View style={styles.dataSection}>
            <Text style={styles.dataSectionTitle}>Patient Information</Text>
            <TextInput
              label="Patient Name"
              value={dataToShow.patient_info?.name || ''}
              onChangeText={(text) => {
                if (editMode) {
                  setEditedData({
                    ...editedData,
                    patient_info: { ...editedData.patient_info, name: text }
                  });
                }
              }}
              disabled={!editMode}
              style={styles.dataInput}
            />
            <View style={styles.inputRow}>
              <TextInput
                label="Age"
                value={dataToShow.patient_info?.age || ''}
                onChangeText={(text) => {
                  if (editMode) {
                    setEditedData({
                      ...editedData,
                      patient_info: { ...editedData.patient_info, age: text }
                    });
                  }
                }}
                disabled={!editMode}
                style={[styles.dataInput, styles.halfWidth]}
              />
              <TextInput
                label="Gender"
                value={dataToShow.patient_info?.gender || ''}
                onChangeText={(text) => {
                  if (editMode) {
                    setEditedData({
                      ...editedData,
                      patient_info: { ...editedData.patient_info, gender: text }
                    });
                  }
                }}
                disabled={!editMode}
                style={[styles.dataInput, styles.halfWidth]}
              />
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Doctor Information */}
          <View style={styles.dataSection}>
            <Text style={styles.dataSectionTitle}>Doctor Information</Text>
            <TextInput
              label="Doctor Name"
              value={dataToShow.doctor_info?.name || ''}
              onChangeText={(text) => {
                if (editMode) {
                  setEditedData({
                    ...editedData,
                    doctor_info: { ...editedData.doctor_info, name: text }
                  });
                }
              }}
              disabled={!editMode}
              style={styles.dataInput}
            />
            <TextInput
              label="Specialization"
              value={dataToShow.doctor_info?.specialization || ''}
              onChangeText={(text) => {
                if (editMode) {
                  setEditedData({
                    ...editedData,
                    doctor_info: { ...editedData.doctor_info, specialization: text }
                  });
                }
              }}
              disabled={!editMode}
              style={styles.dataInput}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Medications */}
          <View style={styles.dataSection}>
            <Text style={styles.dataSectionTitle}>Medications</Text>
            {dataToShow.medications?.map((medication, index) => (
              <Card key={index} style={styles.medicationCard}>
                <Card.Content>
                  <TextInput
                    label={`Medication ${index + 1} Name`}
                    value={medication.name || ''}
                    onChangeText={(text) => {
                      if (editMode) {
                        const updatedMedications = [...editedData.medications];
                        updatedMedications[index] = { ...updatedMedications[index], name: text };
                        setEditedData({
                          ...editedData,
                          medications: updatedMedications
                        });
                      }
                    }}
                    disabled={!editMode}
                    style={styles.dataInput}
                  />
                  <TextInput
                    label="Dosage"
                    value={medication.dosage || ''}
                    onChangeText={(text) => {
                      if (editMode) {
                        const updatedMedications = [...editedData.medications];
                        updatedMedications[index] = { ...updatedMedications[index], dosage: text };
                        setEditedData({
                          ...editedData,
                          medications: updatedMedications
                        });
                      }
                    }}
                    disabled={!editMode}
                    style={styles.dataInput}
                  />
                  <TextInput
                    label="Instructions"
                    value={medication.instructions || ''}
                    onChangeText={(text) => {
                      if (editMode) {
                        const updatedMedications = [...editedData.medications];
                        updatedMedications[index] = { ...updatedMedications[index], instructions: text };
                        setEditedData({
                          ...editedData,
                          medications: updatedMedications
                        });
                      }
                    }}
                    disabled={!editMode}
                    multiline
                    style={styles.dataInput}
                  />
                </Card.Content>
              </Card>
            ))}
          </View>

          <Divider style={styles.divider} />

          {/* Diagnosis and Advice */}
          <View style={styles.dataSection}>
            <TextInput
              label="Diagnosis"
              value={dataToShow.diagnosis || ''}
              onChangeText={(text) => {
                if (editMode) {
                  setEditedData({ ...editedData, diagnosis: text });
                }
              }}
              disabled={!editMode}
              multiline
              style={styles.dataInput}
            />
            <TextInput
              label="Advice"
              value={dataToShow.advice || ''}
              onChangeText={(text) => {
                if (editMode) {
                  setEditedData({ ...editedData, advice: text });
                }
              }}
              disabled={!editMode}
              multiline
              style={styles.dataInput}
            />
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderValidationResults = () => {
    if (!validationResults) return null;

    return (
      <Card style={styles.validationCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Validation Results</Text>
          
          <View style={styles.validationHeader}>
            <View style={styles.completenessContainer}>
              <Text style={styles.completenessLabel}>Completeness</Text>
              <ProgressBar
                progress={validationResults.completeness / 100}
                color={getCompletenessColor(validationResults.completeness)}
                style={styles.completenessBar}
              />
              <Text style={styles.completenessText}>
                {validationResults.completeness}%
              </Text>
            </View>
          </View>

          {validationResults.errors.length > 0 && (
            <View style={styles.validationSection}>
              <Text style={styles.validationSectionTitle}>
                <Icon name="alert-circle" size={16} color={theme.colors.error} />
                {' '}Errors ({validationResults.errors.length})
              </Text>
              {validationResults.errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>• {error}</Text>
              ))}
            </View>
          )}

          {validationResults.warnings.length > 0 && (
            <View style={styles.validationSection}>
              <Text style={styles.validationSectionTitle}>
                <Icon name="alert" size={16} color={theme.colors.warning} />
                {' '}Warnings ({validationResults.warnings.length})
              </Text>
              {validationResults.warnings.map((warning, index) => (
                <Text key={index} style={styles.warningText}>• {warning}</Text>
              ))}
            </View>
          )}

          {validationResults.isValid && (
            <View style={styles.validationSection}>
              <Text style={styles.validationSectionTitle}>
                <Icon name="check-circle" size={16} color={theme.colors.success} />
                {' '}Ready to Create Prescription
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderActions = () => {
    if (!extractedData) return null;

    return (
      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleCreatePrescription}
          disabled={!validationResults?.isValid}
          style={styles.actionButton}
        >
          Create Prescription
        </Button>
      </View>
    );
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return theme.colors.success;
    if (confidence >= 0.6) return theme.colors.warning;
    return theme.colors.error;
  };

  const getCompletenessColor = (completeness) => {
    if (completeness >= 80) return theme.colors.success;
    if (completeness >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  if (error && !selectedImage) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => setError(null)}
      />
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderImageSelection()}
      {selectedImage && renderScanOptions()}
      {renderProcessingStatus()}
      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorTitle}>Scan Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Button
              mode="outlined"
              onPress={() => setError(null)}
              style={styles.retryButton}
            >
              Try Again
            </Button>
          </Card.Content>
        </Card>
      )}
      {renderOcrResults()}
      {renderExtractedData()}
      {renderValidationResults()}
      {renderActions()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  imageSelectionCard: {
    margin: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  selectedImageContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  selectedImage: {
    width: width - 64,
    height: (width - 64) * 0.75,
    borderRadius: 8,
    marginBottom: 8,
  },
  imageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  imageInfoText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  scanOptionsCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  optionDescription: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  scanButton: {
    marginTop: 8,
  },
  processingCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginTop: 12,
  },
  processingDescription: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 4,
  },
  ocrResultsCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceChip: {
    height: 28,
  },
  ocrMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metadataItem: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  extractedTextContainer: {
    marginTop: 8,
  },
  extractedTextTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  extractedTextScroll: {
    maxHeight: 120,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    padding: 12,
  },
  extractedText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 16,
  },
  extractedDataCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  cardActions: {
    flexDirection: 'row',
  },
  editActions: {
    flexDirection: 'row',
  },
  dataSection: {
    marginBottom: 16,
  },
  dataSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  dataInput: {
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  divider: {
    marginVertical: 16,
  },
  medicationCard: {
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  validationCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  validationHeader: {
    marginBottom: 16,
  },
  completenessContainer: {
    alignItems: 'center',
  },
  completenessLabel: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  completenessBar: {
    width: '100%',
    height: 8,
    marginBottom: 4,
  },
  completenessText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  validationSection: {
    marginBottom: 12,
  },
  validationSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginLeft: 16,
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: theme.colors.warning,
    marginLeft: 16,
    marginBottom: 2,
  },
  errorCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
    backgroundColor: theme.colors.errorContainer,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onErrorContainer,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: theme.colors.onErrorContainer,
    marginBottom: 12,
  },
  retryButton: {
    borderColor: theme.colors.onErrorContainer,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 0,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default PrescriptionScanScreen;