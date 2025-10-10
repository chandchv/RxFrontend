/**
 * Document Upload Screen
 * 
 * Mobile document upload using existing upload API with camera capture,
 * file selection, upload progress tracking, and OCR processing status.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Dimensions,
  ScrollView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Surface,
  Text,
  ActivityIndicator,
  ProgressBar,
  Chip,
  IconButton,
  Divider,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuth } from '../../contexts/AuthContext';
import { useMobileDashboard } from '../../contexts/MobileDashboardContext';
import mobileApiService from '../../services/mobileApiService';
import { formatFileSize, formatDate } from '../../utils/formatUtils';
import { theme, spacing, elevation } from '../../styles/theme';

const { width } = Dimensions.get('window');

const DocumentUploadScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { updateLastActivity } = useMobileDashboard();
  
  // Get clinical record ID from route params
  const { clinicalRecordId, clinicalRecord, availableRecords } = route.params || {};
  
  const [selectedRecordId, setSelectedRecordId] = useState(clinicalRecordId);
  const [selectedRecord, setSelectedRecord] = useState(clinicalRecord);
  const [showRecordSelector, setShowRecordSelector] = useState(!clinicalRecordId && !clinicalRecord);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [error, setError] = useState(null);

  // Polling for processing status
  const [statusPolling, setStatusPolling] = useState(null);

  useFocusEffect(
    useCallback(() => {
      updateLastActivity();
      
      // Clear any existing polling when screen loses focus
      return () => {
        if (statusPolling) {
          clearInterval(statusPolling);
          setStatusPolling(null);
        }
      };
    }, [updateLastActivity, statusPolling])
  );

  // Request camera permissions
  const requestCameraPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to camera to capture documents',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  // Handle camera capture
  const handleCameraCapture = async () => {
    try {
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to capture documents'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: `document_${Date.now()}.jpg`,
          size: asset.fileSize || 0,
        });
        setError(null);
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      setError('Failed to capture image. Please try again.');
    }
  };

  // Handle file selection
  const handleFileSelection = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'text/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          type: asset.mimeType || 'application/octet-stream',
          name: asset.name,
          size: asset.size || 0,
        });
        setError(null);
      }
    } catch (error) {
      console.error('File selection error:', error);
      setError('Failed to select file. Please try again.');
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No File Selected', 'Please select a file to upload');
      return;
    }

    const recordId = selectedRecordId || clinicalRecordId;
    if (!recordId) {
      Alert.alert('Error', 'No clinical record specified');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await mobileApiService.uploadDocument(
        recordId,
        selectedFile
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.upload_success) {
        setUploadedDocument(response);
        setSelectedFile(null);
        
        // Start polling for processing status
        startProcessingStatusPolling(response.document_id);
        
        Alert.alert(
          'Upload Successful',
          'Document uploaded successfully and is being processed',
          [
            {
              text: 'OK',
              onPress: () => {
                // Optionally navigate back or to document detail
              }
            }
          ]
        );
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Upload failed. Please try again.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // Start polling for processing status
  const startProcessingStatusPolling = (documentId) => {
    if (statusPolling) {
      clearInterval(statusPolling);
    }

    const pollStatus = async () => {
      try {
        const status = await mobileApiService.getDocumentProcessingStatus(documentId);
        setProcessingStatus(status);

        // Stop polling if processing is complete or failed
        if (status.processing_status === 'completed' || status.processing_status === 'failed') {
          if (statusPolling) {
            clearInterval(statusPolling);
            setStatusPolling(null);
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    };

    // Poll immediately and then every 3 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 3000);
    setStatusPolling(interval);
  };

  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  // Get processing status color
  const getProcessingStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'processing':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.success;
      case 'failed':
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  // Get processing status icon
  const getProcessingStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'clock-outline';
      case 'processing':
        return 'cog';
      case 'completed':
        return 'check-circle';
      case 'failed':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Surface style={styles.header} elevation={1}>
        <Title style={styles.headerTitle}>Upload Document</Title>
        {selectedRecord && (
          <Paragraph style={styles.headerSubtitle}>
            To: {selectedRecord.title}
          </Paragraph>
        )}
      </Surface>

      {/* Record Selector */}
      {showRecordSelector && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Select Clinical Record</Title>
            <Paragraph style={styles.sectionDescription}>
              Choose which clinical record to upload the document to
            </Paragraph>

            {availableRecords && availableRecords.length > 0 ? (
              <View style={styles.recordList}>
                {availableRecords.map((record) => (
                  <Card
                    key={record.id}
                    style={[
                      styles.recordOption,
                      selectedRecordId === record.id && styles.selectedRecordOption
                    ]}
                    onPress={() => {
                      setSelectedRecordId(record.id);
                      setSelectedRecord(record);
                      setShowRecordSelector(false);
                    }}
                  >
                    <Card.Content style={styles.recordOptionContent}>
                      <Text style={styles.recordOptionTitle}>{record.title}</Text>
                      <Text style={styles.recordOptionMeta}>
                        {record.record_type?.replace('_', ' ').toUpperCase()} • {formatDate(record.record_date)}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : (
              <View style={styles.noRecordsState}>
                <Icon name="file-document-outline" size={48} color={theme.colors.disabled} />
                <Text style={styles.noRecordsText}>
                  No clinical records available. Please create a record first.
                </Text>
                <Button
                  mode="outlined"
                  icon="arrow-left"
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                >
                  Go Back
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Upload Options */}
      {(selectedRecordId || clinicalRecordId) && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Select Document</Title>
            <Paragraph style={styles.sectionDescription}>
              Choose how you want to add your document
            </Paragraph>

            <View style={styles.uploadOptions}>
              <Button
                mode="outlined"
                icon="camera"
                onPress={handleCameraCapture}
                style={styles.uploadButton}
                contentStyle={styles.uploadButtonContent}
                disabled={uploading}
              >
                Camera
              </Button>

              <Button
                mode="outlined"
                icon="file-document"
                onPress={handleFileSelection}
                style={styles.uploadButton}
                contentStyle={styles.uploadButtonContent}
                disabled={uploading}
              >
                Files
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.filePreviewHeader}>
              <Title style={styles.sectionTitle}>Selected File</Title>
              <IconButton
                icon="close"
                size={20}
                onPress={clearSelectedFile}
                disabled={uploading}
              />
            </View>

            <View style={styles.fileInfo}>
              <Icon
                name={selectedFile.type.startsWith('image/') ? 'image' : 'file-document'}
                size={40}
                color={theme.colors.primary}
              />
              <View style={styles.fileDetails}>
                <Text style={styles.fileName}>{selectedFile.name}</Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(selectedFile.size)}
                </Text>
                <Chip
                  mode="outlined"
                  style={styles.fileTypeChip}
                  textStyle={styles.fileTypeText}
                >
                  {selectedFile.type}
                </Chip>
              </View>
            </View>

            {/* Upload Progress */}
            {uploading && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Uploading... {Math.round(uploadProgress)}%
                </Text>
                <ProgressBar
                  progress={uploadProgress / 100}
                  color={theme.colors.primary}
                  style={styles.progressBar}
                />
              </View>
            )}

            {/* Upload Button */}
            <Button
              mode="contained"
              icon="upload"
              onPress={handleUpload}
              style={styles.uploadSubmitButton}
              loading={uploading}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Upload Success */}
      {uploadedDocument && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.successHeader}>
              <Icon
                name="check-circle"
                size={24}
                color={theme.colors.success}
              />
              <Title style={[styles.sectionTitle, { color: theme.colors.success }]}>
                Upload Successful
              </Title>
            </View>

            <View style={styles.uploadedFileInfo}>
              <Text style={styles.uploadedFileName}>
                {uploadedDocument.filename}
              </Text>
              <Text style={styles.uploadedFileSize}>
                {formatFileSize(uploadedDocument.file_size)}
              </Text>
            </View>

            <Divider style={styles.divider} />

            {/* Processing Status */}
            <View style={styles.processingSection}>
              <Text style={styles.processingSectionTitle}>Processing Status</Text>
              
              {processingStatus ? (
                <View style={styles.processingStatus}>
                  <View style={styles.processingStatusHeader}>
                    <Icon
                      name={getProcessingStatusIcon(processingStatus.processing_status)}
                      size={20}
                      color={getProcessingStatusColor(processingStatus.processing_status)}
                    />
                    <Text style={[
                      styles.processingStatusText,
                      { color: getProcessingStatusColor(processingStatus.processing_status) }
                    ]}>
                      {processingStatus.processing_status_display}
                    </Text>
                  </View>

                  {processingStatus.processing_status === 'processing' && (
                    <View style={styles.processingProgress}>
                      <Text style={styles.processingProgressText}>
                        Processing... {processingStatus.progress_percent}%
                      </Text>
                      <ProgressBar
                        progress={processingStatus.progress_percent / 100}
                        color={theme.colors.primary}
                        style={styles.progressBar}
                      />
                    </View>
                  )}

                  {processingStatus.processing_status === 'completed' && (
                    <View style={styles.processingResults}>
                      {processingStatus.has_ocr_text && (
                        <Chip
                          icon="text-recognition"
                          mode="outlined"
                          style={styles.resultChip}
                        >
                          OCR Complete
                        </Chip>
                      )}
                      {processingStatus.has_structured_data && (
                        <Chip
                          icon="database"
                          mode="outlined"
                          style={styles.resultChip}
                        >
                          Data Extracted
                        </Chip>
                      )}
                      {processingStatus.ocr_confidence && (
                        <Chip
                          icon="percent"
                          mode="outlined"
                          style={styles.resultChip}
                        >
                          {Math.round(processingStatus.ocr_confidence * 100)}% Confidence
                        </Chip>
                      )}
                    </View>
                  )}

                  {processingStatus.processing_status === 'failed' && (
                    <Text style={styles.processingError}>
                      {processingStatus.processing_error || 'Processing failed'}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.processingLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.processingLoadingText}>
                    Checking processing status...
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                icon="plus"
                onPress={() => {
                  setUploadedDocument(null);
                  setProcessingStatus(null);
                  if (statusPolling) {
                    clearInterval(statusPolling);
                    setStatusPolling(null);
                  }
                }}
                style={styles.actionButton}
              >
                Upload Another
              </Button>

              <Button
                mode="contained"
                icon="eye"
                onPress={() => {
                  navigation.navigate('ClinicalRecordDetail', {
                    recordId: selectedRecordId || clinicalRecordId,
                    highlightDocument: uploadedDocument.document_id,
                  });
                }}
                style={styles.actionButton}
              >
                View Record
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card style={[styles.card, styles.errorCard]}>
          <Card.Content>
            <View style={styles.errorHeader}>
              <Icon
                name="alert-circle"
                size={24}
                color={theme.colors.error}
              />
              <Title style={[styles.sectionTitle, { color: theme.colors.error }]}>
                Upload Error
              </Title>
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              mode="outlined"
              icon="refresh"
              onPress={() => setError(null)}
              style={styles.errorButton}
            >
              Try Again
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  card: {
    margin: spacing.md,
    marginTop: 0,
    marginBottom: spacing.sm,
    elevation: elevation.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  uploadOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  uploadButton: {
    flex: 1,
    borderRadius: theme.roundness,
  },
  uploadButtonContent: {
    paddingVertical: spacing.sm,
  },
  filePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  fileDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  fileSize: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  fileTypeChip: {
    alignSelf: 'flex-start',
  },
  fileTypeText: {
    fontSize: 12,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  uploadSubmitButton: {
    borderRadius: theme.roundness,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  uploadedFileInfo: {
    marginBottom: spacing.md,
  },
  uploadedFileName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  uploadedFileSize: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  divider: {
    marginVertical: spacing.md,
  },
  processingSection: {
    marginBottom: spacing.md,
  },
  processingSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  processingStatus: {
    marginBottom: spacing.sm,
  },
  processingStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  processingStatusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  processingProgress: {
    marginBottom: spacing.sm,
  },
  processingProgressText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  processingResults: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  resultChip: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  processingError: {
    fontSize: 14,
    color: theme.colors.error,
    fontStyle: 'italic',
  },
  processingLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingLoadingText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginLeft: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: theme.roundness,
  },
  errorCard: {
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    marginBottom: spacing.md,
  },
  errorButton: {
    borderColor: theme.colors.error,
    borderRadius: theme.roundness,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.onPrimary,
    marginTop: spacing.sm,
  },
  recordList: {
    gap: spacing.sm,
  },
  recordOption: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.roundness,
  },
  selectedRecordOption: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  recordOptionContent: {
    paddingVertical: spacing.sm,
  },
  recordOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  recordOptionMeta: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  noRecordsState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noRecordsText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    borderRadius: theme.roundness,
  },
});

export default DocumentUploadScreen;