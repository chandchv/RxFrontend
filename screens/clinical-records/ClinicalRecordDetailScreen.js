/**
 * Clinical Record Detail Screen
 * 
 * Mobile record detail view using existing clinical records API with mobile document
 * display, metadata viewing, secure link generation, and OCR results integration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  RefreshControl,
  Share,
  Linking,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
  Surface,
  Divider,
  IconButton,
  ActivityIndicator,
  Menu,
  Dialog,
  Portal,
  TextInput,
  Switch,
  List,
  Avatar,
  Badge,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuth } from '../../contexts/AuthContext';
import { useMobileDashboard } from '../../contexts/MobileDashboardContext';
import mobileApiService from '../../services/mobileApiService';
import { formatDate, formatFileSize, formatDateTime } from '../../utils/formatUtils';
import { theme } from '../../styles/theme';

const { width } = Dimensions.get('window');

const ClinicalRecordDetailScreen = ({ navigation, route }) => {
  const { recordId } = route.params;
  const { user } = useAuth();
  const { updateLastActivity } = useMobileDashboard();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [record, setRecord] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [shareMenuVisible, setShareMenuVisible] = useState(false);
  const [shareDialogVisible, setShareDialogVisible] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareOptions, setShareOptions] = useState({
    expiresInHours: 24,
    maxAccesses: 10,
    purpose: '',
    recipientName: '',
    recipientOrganization: '',
    patientConsent: true,
  });
  const [expandedSections, setExpandedSections] = useState({
    details: true,
    documents: true,
    metadata: false,
    sharing: false,
  });

  // Load record details
  const loadRecordDetail = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const data = await mobileApiService.getClinicalRecordDetail(recordId);
      
      if (data) {
        setRecord(data.record);
        setDocuments(data.documents || []);
        updateLastActivity();
      }
    } catch (err) {
      console.error('Failed to load clinical record detail:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recordId, updateLastActivity]);

  // Initial load
  useFocusEffect(
    useCallback(() => {
      loadRecordDetail(true);
    }, [loadRecordDetail])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecordDetail(false);
  }, [loadRecordDetail]);

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Navigation handlers
  const navigateToDocumentViewer = (document) => {
    navigation.navigate('DocumentViewer', { 
      documentId: document.id,
      recordId: recordId,
      title: document.original_filename 
    });
  };

  const navigateToUpload = () => {
    navigation.navigate('DocumentUpload', { 
      clinicalRecordId: recordId,
      clinicalRecord: record 
    });
  };

  const navigateToEdit = () => {
    navigation.navigate('EditClinicalRecord', { recordId });
  };

  // Share functionality
  const handleShareRecord = async (shareType) => {
    try {
      setShareLoading(true);
      
      const shareData = {
        record_id: recordId,
        expires_in_hours: shareOptions.expiresInHours,
        max_accesses: shareOptions.maxAccesses,
        purpose: shareOptions.purpose,
        patient_consent: shareOptions.patientConsent,
        recipient_info: {
          name: shareOptions.recipientName,
          organization: shareOptions.recipientOrganization,
        },
      };

      // Call the appropriate sharing API endpoint
      const response = await mobileApiService.createRecordShare(shareData);
      
      if (response && response.share_url) {
        // Share the secure link
        await Share.share({
          message: `Clinical Record: ${record.title}\n\nSecure Link: ${response.share_url}\n\nThis link expires in ${shareOptions.expiresInHours} hours and can be accessed ${shareOptions.maxAccesses} times.\n\nPurpose: ${shareOptions.purpose}`,
          url: response.share_url,
          title: `Clinical Record: ${record.title}`,
        });

        Alert.alert(
          'Share Link Created',
          `Secure sharing link has been created and shared. The link will expire in ${shareOptions.expiresInHours} hours.`,
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Failed to create share link:', err);
      Alert.alert(
        'Share Failed',
        err.message || 'Failed to create secure sharing link. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setShareLoading(false);
      setShareDialogVisible(false);
      setShareMenuVisible(false);
    }
  };

  const handleShareDocument = async (document) => {
    try {
      setShareLoading(true);
      
      const shareData = {
        document_id: document.id,
        expires_in_hours: 24,
        max_accesses: 5,
        purpose: `Sharing document: ${document.original_filename}`,
        patient_consent: true,
      };

      const response = await mobileApiService.createDocumentShare(shareData);
      
      if (response && response.share_url) {
        await Share.share({
          message: `Clinical Document: ${document.original_filename}\n\nSecure Link: ${response.share_url}\n\nThis link expires in 24 hours.`,
          url: response.share_url,
          title: `Document: ${document.original_filename}`,
        });
      }
    } catch (err) {
      console.error('Failed to share document:', err);
      Alert.alert('Share Failed', 'Failed to create document sharing link.');
    } finally {
      setShareLoading(false);
    }
  };

  // Get record type icon and color
  const getRecordTypeInfo = (recordType) => {
    const types = {
      lab_result: { icon: 'test-tube', color: theme.colors.primary },
      imaging: { icon: 'camera', color: theme.colors.secondary },
      prescription: { icon: 'pill', color: theme.colors.tertiary },
      consultation: { icon: 'account-doctor', color: theme.colors.primary },
      procedure: { icon: 'medical-bag', color: theme.colors.secondary },
      other: { icon: 'file-document', color: theme.colors.outline },
    };
    return types[recordType] || types.other;
  };

  // Get document type icon
  const getDocumentTypeIcon = (documentType, contentType) => {
    if (contentType?.includes('image')) return 'image';
    if (contentType?.includes('pdf')) return 'file-pdf-box';
    if (documentType === 'dicom') return 'medical-bag';
    return 'file-document';
  };

  // Get processing status info
  const getProcessingStatusInfo = (status) => {
    const statuses = {
      pending: { color: theme.colors.warning, icon: 'clock-outline' },
      processing: { color: theme.colors.primary, icon: 'cog' },
      completed: { color: theme.colors.success, icon: 'check-circle' },
      failed: { color: theme.colors.error, icon: 'alert-circle' },
    };
    return statuses[status] || statuses.pending;
  };

  // Render record header
  const renderRecordHeader = () => {
    const typeInfo = getRecordTypeInfo(record.record_type);
    
    return (
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Avatar.Icon
                size={48}
                icon={typeInfo.icon}
                style={{ backgroundColor: typeInfo.color }}
              />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.recordTitle} numberOfLines={2}>
                {record.title || 'Untitled Record'}
              </Text>
              <Text style={styles.recordSubtitle}>
                {record.record_type?.replace('_', ' ').toUpperCase()}
              </Text>
              <View style={styles.headerMeta}>
                <Chip size="small" mode="outlined" style={styles.statusChip}>
                  {record.status}
                </Chip>
                {record.priority && record.priority !== 'normal' && (
                  <Chip
                    size="small"
                    mode="flat"
                    icon={record.priority === 'high' ? 'alert' : 'arrow-up'}
                    style={[
                      styles.priorityChip,
                      { backgroundColor: record.priority === 'high' ? theme.colors.errorContainer : theme.colors.warningContainer }
                    ]}
                  >
                    {record.priority}
                  </Chip>
                )}
              </View>
            </View>
            <View style={styles.headerActions}>
              <Menu
                visible={shareMenuVisible}
                onDismiss={() => setShareMenuVisible(false)}
                anchor={
                  <IconButton
                    testID="share-button"
                    icon="share-variant"
                    onPress={() => setShareMenuVisible(true)}
                    disabled={shareLoading}
                  />
                }
              >
                <Menu.Item
                  onPress={() => {
                    setShareMenuVisible(false);
                    setShareDialogVisible(true);
                  }}
                  title="Create Secure Link"
                  leadingIcon="link"
                />
                <Menu.Item
                  onPress={() => {
                    setShareMenuVisible(false);
                    handleShareRecord('quick');
                  }}
                  title="Quick Share"
                  leadingIcon="share"
                />
              </Menu>
              
              {(user?.role === 'doctor' || user?.role === 'staff') && (
                <IconButton
                  testID="edit-button"
                  icon="pencil"
                  onPress={navigateToEdit}
                />
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Render record details section
  const renderRecordDetails = () => (
    <Card style={styles.sectionCard}>
      <List.Accordion
        title="Record Details"
        left={props => <List.Icon {...props} icon="information" />}
        expanded={expandedSections.details}
        onPress={() => toggleSection('details')}
      >
        <Card.Content>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Record Date:</Text>
            <Text style={styles.detailValue}>{formatDate(record.record_date)}</Text>
          </View>
          
          {record.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description:</Text>
              <Text style={styles.detailValue}>{record.description}</Text>
            </View>
          )}
          
          {record.patient && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Patient:</Text>
              <Text style={styles.detailValue}>
                {record.patient.first_name} {record.patient.last_name}
              </Text>
            </View>
          )}
          
          {record.created_by && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created By:</Text>
              <Text style={styles.detailValue}>
                {record.created_by.first_name} {record.created_by.last_name}
              </Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>{formatDateTime(record.created_at)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated:</Text>
            <Text style={styles.detailValue}>{formatDateTime(record.updated_at)}</Text>
          </View>
          
          {record.tags && record.tags.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tags:</Text>
              <View style={styles.tagsContainer}>
                {record.tags.map((tag, index) => (
                  <Chip key={index} size="small" style={styles.tagChip}>
                    {tag}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </List.Accordion>
    </Card>
  );

  // Render documents section
  const renderDocumentsSection = () => (
    <Card style={styles.sectionCard}>
      <List.Accordion
        title={`Documents (${documents.length})`}
        left={props => <List.Icon {...props} icon="file-document-multiple" />}
        right={props => (
          <View style={styles.accordionRight}>
            {documents.length > 0 && (
              <Badge size={20} style={styles.documentBadge}>
                {documents.length}
              </Badge>
            )}
            <List.Icon {...props} />
          </View>
        )}
        expanded={expandedSections.documents}
        onPress={() => toggleSection('documents')}
      >
        <Card.Content>
          {documents.length === 0 ? (
            <View style={styles.emptyDocuments}>
              <Icon name="file-document-outline" size={48} color={theme.colors.disabled} />
              <Text style={styles.emptyDocumentsText}>No documents attached</Text>
              {(user?.role === 'doctor' || user?.role === 'staff') && (
                <Button
                  mode="outlined"
                  icon="upload"
                  onPress={navigateToUpload}
                  style={styles.uploadButton}
                >
                  Upload Document
                </Button>
              )}
            </View>
          ) : (
            <View>
              {documents.map((document, index) => (
                <Surface key={document.id} style={styles.documentItem}>
                  <View style={styles.documentContent}>
                    <View style={styles.documentIcon}>
                      <Icon
                        name={getDocumentTypeIcon(document.document_type, document.content_type)}
                        size={32}
                        color={theme.colors.primary}
                      />
                    </View>
                    
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentName} numberOfLines={2}>
                        {document.original_filename}
                      </Text>
                      <Text style={styles.documentMeta}>
                        {formatFileSize(document.file_size)} • {formatDate(document.created_at)}
                      </Text>
                      
                      {/* Processing Status */}
                      <View style={styles.processingStatus}>
                        {document.processing_status && (
                          <View style={styles.statusIndicator}>
                            <Icon
                              name={getProcessingStatusInfo(document.processing_status).icon}
                              size={16}
                              color={getProcessingStatusInfo(document.processing_status).color}
                            />
                            <Text style={[
                              styles.statusText,
                              { color: getProcessingStatusInfo(document.processing_status).color }
                            ]}>
                              {document.processing_status}
                            </Text>
                          </View>
                        )}
                        
                        {document.ocr_confidence && (
                          <Text style={styles.ocrConfidence}>
                            OCR: {Math.round(document.ocr_confidence * 100)}%
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.documentActions}>
                      <IconButton
                        testID="document-view-button"
                        icon="eye"
                        size={20}
                        onPress={() => navigateToDocumentViewer(document)}
                      />
                      <IconButton
                        testID="document-share-button"
                        icon="share-variant"
                        size={20}
                        onPress={() => handleShareDocument(document)}
                      />
                    </View>
                  </View>
                  
                  {/* OCR Results Preview */}
                  {document.has_ocr_text && document.ocr_text && (
                    <View style={styles.ocrPreview}>
                      <Text style={styles.ocrLabel}>OCR Text Preview:</Text>
                      <Text style={styles.ocrText} numberOfLines={3}>
                        {document.ocr_text}
                      </Text>
                    </View>
                  )}
                  
                  {index < documents.length - 1 && <Divider style={styles.documentDivider} />}
                </Surface>
              ))}
              
              {(user?.role === 'doctor' || user?.role === 'staff') && (
                <Button
                  mode="outlined"
                  icon="plus"
                  onPress={navigateToUpload}
                  style={styles.addDocumentButton}
                >
                  Add Document
                </Button>
              )}
            </View>
          )}
        </Card.Content>
      </List.Accordion>
    </Card>
  );

  // Render metadata section
  const renderMetadataSection = () => (
    <Card style={styles.sectionCard}>
      <List.Accordion
        title="Metadata & Technical Details"
        left={props => <List.Icon {...props} icon="information-outline" />}
        expanded={expandedSections.metadata}
        onPress={() => toggleSection('metadata')}
      >
        <Card.Content>
          <View style={styles.metadataGrid}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Record ID</Text>
              <Text style={styles.metadataValue}>{record.id}</Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Version</Text>
              <Text style={styles.metadataValue}>{record.version || '1.0'}</Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Document Count</Text>
              <Text style={styles.metadataValue}>{documents.length}</Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Total Size</Text>
              <Text style={styles.metadataValue}>
                {formatFileSize(documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0))}
              </Text>
            </View>
            
            {record.external_id && (
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>External ID</Text>
                <Text style={styles.metadataValue}>{record.external_id}</Text>
              </View>
            )}
            
            {record.source_system && (
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Source System</Text>
                <Text style={styles.metadataValue}>{record.source_system}</Text>
              </View>
            )}
          </View>
        </Card.Content>
      </List.Accordion>
    </Card>
  );

  // Render share dialog
  const renderShareDialog = () => (
    <Portal>
      <Dialog visible={shareDialogVisible} onDismiss={() => setShareDialogVisible(false)}>
        <Dialog.Title>Create Secure Share Link</Dialog.Title>
        <Dialog.Content>
          <TextInput
            testID="purpose-input"
            label="Purpose (optional)"
            value={shareOptions.purpose}
            onChangeText={(text) => setShareOptions(prev => ({ ...prev, purpose: text }))}
            style={styles.shareInput}
            multiline
          />
          
          <TextInput
            label="Recipient Name (optional)"
            value={shareOptions.recipientName}
            onChangeText={(text) => setShareOptions(prev => ({ ...prev, recipientName: text }))}
            style={styles.shareInput}
          />
          
          <TextInput
            label="Recipient Organization (optional)"
            value={shareOptions.recipientOrganization}
            onChangeText={(text) => setShareOptions(prev => ({ ...prev, recipientOrganization: text }))}
            style={styles.shareInput}
          />
          
          <View style={styles.shareOption}>
            <Text>Expires in (hours):</Text>
            <TextInput
              value={shareOptions.expiresInHours.toString()}
              onChangeText={(text) => setShareOptions(prev => ({ ...prev, expiresInHours: parseInt(text) || 24 }))}
              keyboardType="numeric"
              style={styles.shareNumberInput}
            />
          </View>
          
          <View style={styles.shareOption}>
            <Text>Max accesses:</Text>
            <TextInput
              value={shareOptions.maxAccesses.toString()}
              onChangeText={(text) => setShareOptions(prev => ({ ...prev, maxAccesses: parseInt(text) || 10 }))}
              keyboardType="numeric"
              style={styles.shareNumberInput}
            />
          </View>
          
          <View style={styles.shareOption}>
            <Text>Patient consent obtained:</Text>
            <Switch
              value={shareOptions.patientConsent}
              onValueChange={(value) => setShareOptions(prev => ({ ...prev, patientConsent: value }))}
            />
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShareDialogVisible(false)}>Cancel</Button>
          <Button
            mode="contained"
            onPress={() => handleShareRecord('secure')}
            loading={shareLoading}
            disabled={shareLoading}
          >
            Create Link
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading clinical record...</Text>
      </View>
    );
  }

  // Render error state
  if (error && !record) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color={theme.colors.error} />
        <Text style={styles.errorTitle}>Failed to Load Record</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Button mode="contained" onPress={() => loadRecordDetail(true)}>
          Retry
        </Button>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="file-document-remove" size={64} color={theme.colors.disabled} />
        <Text style={styles.errorTitle}>Record Not Found</Text>
        <Text style={styles.errorMessage}>The requested clinical record could not be found.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        testID="clinical-record-detail-scroll"
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderRecordHeader()}
        {renderRecordDetails()}
        {renderDocumentsSection()}
        {renderMetadataSection()}
      </ScrollView>
      
      {renderShareDialog()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: theme.colors.error,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: theme.colors.onSurface,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerIcon: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  recordSubtitle: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.7,
    marginBottom: 8,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    marginRight: 8,
  },
  priorityChip: {
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
    width: 120,
    marginRight: 12,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.onSurface,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  tagChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  accordionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentBadge: {
    marginRight: 8,
  },
  emptyDocuments: {
    alignItems: 'center',
    padding: 20,
  },
  emptyDocumentsText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    opacity: 0.7,
    marginTop: 8,
    marginBottom: 16,
  },
  uploadButton: {
    marginTop: 8,
  },
  documentItem: {
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  documentContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  documentIcon: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: theme.colors.onSurface,
    opacity: 0.7,
    marginBottom: 4,
  },
  processingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  ocrConfidence: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ocrPreview: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    marginTop: 8,
  },
  ocrLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  ocrText: {
    fontSize: 12,
    color: theme.colors.onSurface,
    opacity: 0.8,
    fontStyle: 'italic',
  },
  documentDivider: {
    marginVertical: 8,
  },
  addDocumentButton: {
    marginTop: 12,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metadataItem: {
    width: '48%',
    marginBottom: 16,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurface,
    opacity: 0.7,
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontFamily: 'monospace',
  },
  shareInput: {
    marginBottom: 12,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  shareNumberInput: {
    width: 80,
  },
});

export default ClinicalRecordDetailScreen;