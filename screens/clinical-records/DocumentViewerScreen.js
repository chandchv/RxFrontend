/**
 * Document Viewer Screen
 * 
 * Mobile document viewer for PDFs, images, and DICOM files with mobile-optimized
 * zoom, pan, viewing controls, sharing, and export functionality.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  PanResponder,
  Animated,
  Share,
  Platform,
  Linking,
  StatusBar,
} from 'react-native';
import {
  Appbar,
  Text,
  Button,
  Surface,
  ActivityIndicator,
  Menu,
  Dialog,
  Portal,
  TextInput,
  Switch,
  FAB,
  Snackbar,
  IconButton,
  Chip,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Image } from 'react-native';
// Note: FileSystem, MediaLibrary, and Sharing would need to be added to package.json
// For now, we'll implement basic functionality without these dependencies

import { useAuth } from '../../contexts/AuthContext';
import { useMobileDashboard } from '../../contexts/MobileDashboardContext';
import mobileApiService from '../../services/mobileApiService';
import { formatFileSize, formatDateTime } from '../../utils/formatUtils';
import { theme } from '../../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DocumentViewerScreen = ({ navigation, route }) => {
  const { documentId, recordId, title } = route.params;
  const { user } = useAuth();
  const { updateLastActivity } = useMobileDashboard();
  
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [error, setError] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [shareDialogVisible, setShareDialogVisible] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  
  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateXValue = useRef(new Animated.Value(0)).current;
  const translateYValue = useRef(new Animated.Value(0)).current;
  
  // Share options
  const [shareOptions, setShareOptions] = useState({
    expiresInHours: 24,
    maxAccesses: 5,
    purpose: '',
    recipientName: '',
    recipientOrganization: '',
    patientConsent: true,
  });

  // Pan responder for zoom and pan gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Store current values when gesture starts
        translateXValue.setOffset(translateX);
        translateYValue.setOffset(translateY);
        scaleValue.setOffset(scale);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (evt.nativeEvent.touches.length === 2) {
          // Pinch to zoom
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + 
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          
          // Calculate scale based on distance (simplified)
          const newScale = Math.max(0.5, Math.min(5, distance / 200));
          scaleValue.setValue(newScale);
          setScale(newScale);
        } else if (scale > 1) {
          // Pan when zoomed in
          translateXValue.setValue(gestureState.dx);
          translateYValue.setValue(gestureState.dy);
          setTranslateX(gestureState.dx);
          setTranslateY(gestureState.dy);
        }
      },
      onPanResponderRelease: () => {
        // Flatten offset values
        translateXValue.flattenOffset();
        translateYValue.flattenOffset();
        scaleValue.flattenOffset();
      },
    })
  ).current;

  // Load document details and URL
  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get document details
      const documentData = await mobileApiService.getDocumentDetail(documentId);
      
      if (documentData) {
        setDocument(documentData);
        
        // Get secure document URL for viewing
        const urlData = await mobileApiService.getDocumentViewUrl(documentId);
        if (urlData && urlData.view_url) {
          setDocumentUrl(urlData.view_url);
        }
        
        updateLastActivity();
      }
    } catch (err) {
      console.error('Failed to load document:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [documentId, updateLastActivity]);

  // Initial load
  useFocusEffect(
    useCallback(() => {
      loadDocument();
    }, [loadDocument])
  );

  // Reset zoom and pan
  const resetZoom = () => {
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateXValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateYValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  // Zoom in
  const zoomIn = () => {
    const newScale = Math.min(5, scale * 1.5);
    Animated.timing(scaleValue, {
      toValue: newScale,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setScale(newScale);
  };

  // Zoom out
  const zoomOut = () => {
    const newScale = Math.max(0.5, scale / 1.5);
    Animated.timing(scaleValue, {
      toValue: newScale,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setScale(newScale);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
    if (Platform.OS === 'android') {
      StatusBar.setHidden(!fullscreen);
    }
  };

  // Download document
  const downloadDocument = async () => {
    try {
      setDownloadLoading(true);
      
      // Get download URL and open in browser for now
      const downloadUrl = await mobileApiService.getDocumentDownloadUrl(documentId);
      if (!downloadUrl || !downloadUrl.download_url) {
        throw new Error('Failed to get download URL');
      }

      // Open download URL in browser
      await Linking.openURL(downloadUrl.download_url);
      showSnackbar('Download started in browser');
    } catch (err) {
      console.error('Failed to download document:', err);
      Alert.alert('Download Failed', err.message || 'Failed to download document');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Share document
  const shareDocument = async () => {
    try {
      setShareLoading(true);
      
      const shareData = {
        document_id: documentId,
        expires_in_hours: shareOptions.expiresInHours,
        max_accesses: shareOptions.maxAccesses,
        purpose: shareOptions.purpose,
        patient_consent: shareOptions.patientConsent,
        recipient_info: {
          name: shareOptions.recipientName,
          organization: shareOptions.recipientOrganization,
        },
      };

      const response = await mobileApiService.createDocumentShare(shareData);
      
      if (response && response.share_url) {
        await Share.share({
          message: `Clinical Document: ${document.original_filename}\n\nSecure Link: ${response.share_url}\n\nThis link expires in ${shareOptions.expiresInHours} hours and can be accessed ${shareOptions.maxAccesses} times.\n\nPurpose: ${shareOptions.purpose}`,
          url: response.share_url,
          title: `Document: ${document.original_filename}`,
        });

        showSnackbar('Secure sharing link created');
      }
    } catch (err) {
      console.error('Failed to share document:', err);
      Alert.alert('Share Failed', err.message || 'Failed to create sharing link');
    } finally {
      setShareLoading(false);
      setShareDialogVisible(false);
    }
  };

  // Export document
  const exportDocument = async () => {
    try {
      // Get download URL and use native sharing
      const downloadUrl = await mobileApiService.getDocumentDownloadUrl(documentId);
      if (!downloadUrl || !downloadUrl.download_url) {
        throw new Error('Failed to get download URL');
      }

      // Use React Native's Share API
      await Share.share({
        message: `Document: ${document.original_filename}`,
        url: downloadUrl.download_url,
        title: document.original_filename,
      });
      
      showSnackbar('Document shared successfully');
    } catch (err) {
      console.error('Failed to export document:', err);
      Alert.alert('Export Failed', err.message || 'Failed to export document');
    }
  };

  // Show snackbar message
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // Get document type info
  const getDocumentTypeInfo = (contentType, documentType) => {
    if (contentType?.includes('image')) {
      return { type: 'image', icon: 'image', color: theme.colors.primary };
    }
    if (contentType?.includes('pdf')) {
      return { type: 'pdf', icon: 'file-pdf-box', color: theme.colors.error };
    }
    if (documentType === 'dicom') {
      return { type: 'dicom', icon: 'medical-bag', color: theme.colors.secondary };
    }
    return { type: 'other', icon: 'file-document', color: theme.colors.outline };
  };

  // Render document content based on type
  const renderDocumentContent = () => {
    if (!document || !documentUrl) return null;

    const typeInfo = getDocumentTypeInfo(document.content_type, document.document_type);

    if (typeInfo.type === 'image') {
      return (
        <Animated.View
          style={[
            styles.documentContainer,
            {
              transform: [
                { scale: scaleValue },
                { translateX: translateXValue },
                { translateY: translateYValue },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri: documentUrl }}
            style={styles.imageDocument}
            contentFit="contain"
            transition={200}
            onError={(error) => {
              console.error('Image load error:', error);
              setError('Failed to load image');
            }}
          />
        </Animated.View>
      );
    }

    if (typeInfo.type === 'pdf') {
      return (
        <View style={styles.documentContainer}>
          <View style={styles.pdfPlaceholder}>
            <Icon name="file-pdf-box" size={64} color={theme.colors.error} />
            <Text style={styles.pdfText}>PDF Document</Text>
            <Text style={styles.pdfSubtext}>{document.original_filename}</Text>
            <Button
              mode="contained"
              icon="open-in-app"
              onPress={() => Linking.openURL(documentUrl)}
              style={styles.openPdfButton}
            >
              Open in PDF Viewer
            </Button>
          </View>
        </View>
      );
    }

    if (typeInfo.type === 'dicom') {
      return (
        <View style={styles.documentContainer}>
          <View style={styles.dicomPlaceholder}>
            <Icon name="medical-bag" size={64} color={theme.colors.secondary} />
            <Text style={styles.dicomText}>DICOM Medical Image</Text>
            <Text style={styles.dicomSubtext}>{document.original_filename}</Text>
            <Text style={styles.dicomInfo}>
              Use a specialized DICOM viewer for full functionality
            </Text>
            <Button
              mode="outlined"
              icon="download"
              onPress={downloadDocument}
              loading={downloadLoading}
              style={styles.downloadButton}
            >
              Download DICOM File
            </Button>
          </View>
        </View>
      );
    }

    // Other document types
    return (
      <View style={styles.documentContainer}>
        <View style={styles.otherPlaceholder}>
          <Icon name={typeInfo.icon} size={64} color={typeInfo.color} />
          <Text style={styles.otherText}>Document</Text>
          <Text style={styles.otherSubtext}>{document.original_filename}</Text>
          <Text style={styles.otherInfo}>
            {document.content_type || 'Unknown file type'}
          </Text>
          <View style={styles.otherActions}>
            <Button
              mode="outlined"
              icon="download"
              onPress={downloadDocument}
              loading={downloadLoading}
              style={styles.actionButton}
            >
              Download
            </Button>
            <Button
              mode="contained"
              icon="export"
              onPress={exportDocument}
              style={styles.actionButton}
            >
              Export
            </Button>
          </View>
        </View>
      </View>
    );
  };

  // Render document info
  const renderDocumentInfo = () => {
    if (!document) return null;

    return (
      <Surface style={styles.infoPanel}>
        <View style={styles.infoHeader}>
          <Text style={styles.infoTitle} numberOfLines={2}>
            {document.original_filename}
          </Text>
          <Chip size="small" mode="outlined" style={styles.typeChip}>
            {document.document_type || 'document'}
          </Chip>
        </View>
        
        <View style={styles.infoDetails}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Size:</Text>
            <Text style={styles.infoValue}>{formatFileSize(document.file_size)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Uploaded:</Text>
            <Text style={styles.infoValue}>{formatDateTime(document.created_at)}</Text>
          </View>
          
          {document.processing_status && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={styles.infoValue}>{document.processing_status}</Text>
            </View>
          )}
          
          {document.ocr_confidence && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>OCR Confidence:</Text>
              <Text style={styles.infoValue}>{Math.round(document.ocr_confidence * 100)}%</Text>
            </View>
          )}
        </View>
      </Surface>
    );
  };

  // Render share dialog
  const renderShareDialog = () => (
    <Portal>
      <Dialog visible={shareDialogVisible} onDismiss={() => setShareDialogVisible(false)}>
        <Dialog.Title>Share Document</Dialog.Title>
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
              onChangeText={(text) => setShareOptions(prev => ({ ...prev, maxAccesses: parseInt(text) || 5 }))}
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
            onPress={shareDocument}
            loading={shareLoading}
            disabled={shareLoading}
          >
            Create Share Link
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
        <Text style={styles.loadingText}>Loading document...</Text>
      </View>
    );
  }

  // Render error state
  if (error && !document) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Document Viewer" />
        </Appbar.Header>
        
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Document</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Button mode="contained" onPress={loadDocument}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Document Viewer" />
        </Appbar.Header>
        
        <View style={styles.errorContainer}>
          <Icon name="file-document-remove" size={64} color={theme.colors.disabled} />
          <Text style={styles.errorTitle}>Document Not Found</Text>
          <Text style={styles.errorMessage}>The requested document could not be found.</Text>
          <Button mode="contained" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  const typeInfo = getDocumentTypeInfo(document.content_type, document.document_type);

  return (
    <View style={[styles.container, fullscreen && styles.fullscreenContainer]}>
      {!fullscreen && (
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content 
            title={title || document.original_filename || 'Document'} 
            titleStyle={styles.headerTitle}
          />
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Appbar.Action
                testID="menu-button"
                icon="dots-vertical"
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setShareDialogVisible(true);
              }}
              title="Share"
              leadingIcon="share-variant"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                downloadDocument();
              }}
              title="Download"
              leadingIcon="download"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                exportDocument();
              }}
              title="Export"
              leadingIcon="export"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                toggleFullscreen();
              }}
              title="Fullscreen"
              leadingIcon="fullscreen"
            />
          </Menu>
        </Appbar.Header>
      )}

      <View style={styles.content}>
        {renderDocumentContent()}
        
        {!fullscreen && renderDocumentInfo()}
      </View>

      {/* Zoom controls for images */}
      {typeInfo.type === 'image' && (
        <View style={styles.zoomControls}>
          <FAB
            testID="zoom-out-button"
            icon="minus"
            size="small"
            onPress={zoomOut}
            style={[styles.zoomButton, styles.zoomOutButton]}
            disabled={scale <= 0.5}
          />
          <FAB
            testID="reset-zoom-button"
            icon="fit-to-page"
            size="small"
            onPress={resetZoom}
            style={[styles.zoomButton, styles.resetButton]}
          />
          <FAB
            testID="zoom-in-button"
            icon="plus"
            size="small"
            onPress={zoomIn}
            style={[styles.zoomButton, styles.zoomInButton]}
            disabled={scale >= 5}
          />
        </View>
      )}

      {/* Fullscreen toggle */}
      {typeInfo.type === 'image' && (
        <FAB
          testID="fullscreen-button"
          icon={fullscreen ? "fullscreen-exit" : "fullscreen"}
          onPress={toggleFullscreen}
          style={styles.fullscreenButton}
        />
      )}

      {renderShareDialog()}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  fullscreenContainer: {
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: 16,
  },
  content: {
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
  documentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageDocument: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  pdfPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  pdfText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  pdfSubtext: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
  },
  openPdfButton: {
    marginTop: 16,
  },
  dicomPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  dicomText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  dicomSubtext: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 8,
  },
  dicomInfo: {
    fontSize: 12,
    color: theme.colors.onSurface,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 20,
  },
  downloadButton: {
    marginTop: 16,
  },
  otherPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  otherText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  otherSubtext: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 8,
  },
  otherInfo: {
    fontSize: 12,
    color: theme.colors.onSurface,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 20,
  },
  otherActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    marginHorizontal: 4,
  },
  infoPanel: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
    flex: 1,
    marginRight: 8,
  },
  typeChip: {
    alignSelf: 'flex-start',
  },
  infoDetails: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    flexDirection: 'column',
    gap: 8,
  },
  zoomButton: {
    backgroundColor: theme.colors.surface,
  },
  zoomOutButton: {},
  resetButton: {},
  zoomInButton: {},
  fullscreenButton: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: theme.colors.primary,
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

export default DocumentViewerScreen;