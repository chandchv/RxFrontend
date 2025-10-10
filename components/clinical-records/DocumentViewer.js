/**
 * DocumentViewer Component
 * Mobile-optimized document viewer for clinical records
 */

import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  ScrollView, 
  TouchableOpacity,
  Modal,
  Alert
} from 'react-native';
import { 
  Card, 
  Text, 
  useTheme, 
  IconButton, 
  ActivityIndicator,
  FAB
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DocumentViewer = ({
  document,
  onClose,
  onShare,
  onDownload,
  onAnnotate,
  showControls = true,
  fullScreen = false,
  style,
  ...props
}) => {
  const theme = useTheme();
  const scrollViewRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showFullScreen, setShowFullScreen] = useState(fullScreen);
  const [currentPage, setCurrentPage] = useState(1);

  if (!document) {
    return (
      <Card style={[styles.card, style]} mode="contained" {...props}>
        <Card.Content style={styles.content}>
          <View style={styles.emptyContainer}>
            <Icon name="description" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
              No document selected
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  const getDocumentIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'pdf':
        return 'picture-as-pdf';
      case 'image':
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'image';
      case 'dicom':
        return 'medical-services';
      case 'doc':
      case 'docx':
        return 'description';
      default:
        return 'insert-drive-file';
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.5, 3);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.5, 0.5);
    setZoom(newZoom);
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleShare = () => {
    if (onShare) {
      onShare(document);
    } else {
      Alert.alert('Share', 'Share functionality not implemented');
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(document);
    } else {
      Alert.alert('Download', 'Download functionality not implemented');
    }
  };

  const handleAnnotate = () => {
    if (onAnnotate) {
      onAnnotate(document);
    } else {
      Alert.alert('Annotate', 'Annotation functionality not implemented');
    }
  };

  const renderDocumentContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.md }}>
            Loading document...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color={theme.colors.error} />
          <Text variant="bodyMedium" style={{ color: theme.colors.error, marginTop: spacing.sm }}>
            Error loading document
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
            {error}
          </Text>
        </View>
      );
    }

    // For now, show a placeholder based on document type
    const documentType = document.type?.toLowerCase() || 'unknown';
    
    return (
      <ScrollView
        ref={scrollViewRef}
        style={styles.documentScrollView}
        contentContainerStyle={styles.documentContent}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={true}
        maximumZoomScale={3}
        minimumZoomScale={0.5}
        zoomScale={zoom}
        bouncesZoom={true}
      >
        <View style={[
          styles.documentPlaceholder,
          {
            transform: [{ scale: zoom }],
            backgroundColor: theme.colors.surfaceVariant,
          }
        ]}>
          <Icon 
            name={getDocumentIcon(documentType)} 
            size={64} 
            color={theme.colors.onSurfaceVariant} 
          />
          <Text 
            variant="titleMedium" 
            style={[styles.documentTitle, { color: theme.colors.onSurface }]}
          >
            {document.name || document.title}
          </Text>
          <Text 
            variant="bodySmall" 
            style={[styles.documentType, { color: theme.colors.onSurfaceVariant }]}
          >
            {documentType.toUpperCase()} Document
          </Text>
          {document.pages && (
            <Text 
              variant="bodySmall" 
              style={[styles.documentPages, { color: theme.colors.onSurfaceVariant }]}
            >
              Page {currentPage} of {document.pages}
            </Text>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderControls = () => {
    if (!showControls) return null;

    return (
      <View style={[styles.controls, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.controlsLeft}>
          <IconButton
            icon="zoom-out"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={handleZoomOut}
            disabled={zoom <= 0.5}
          />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface, minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Text>
          <IconButton
            icon="zoom-in"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={handleZoomIn}
            disabled={zoom >= 3}
          />
          <IconButton
            icon="fit-screen"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={handleResetZoom}
          />
        </View>

        <View style={styles.controlsRight}>
          <IconButton
            icon="fullscreen"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={() => setShowFullScreen(true)}
          />
          <IconButton
            icon="share"
            size={24}
            iconColor={theme.colors.primary}
            onPress={handleShare}
          />
          <IconButton
            icon="download"
            size={24}
            iconColor={theme.colors.secondary}
            onPress={handleDownload}
          />
        </View>
      </View>
    );
  };

  const renderFullScreenModal = () => (
    <Modal
      visible={showFullScreen}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => setShowFullScreen(false)}
    >
      <View style={[styles.fullScreenContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.fullScreenHeader, { backgroundColor: theme.colors.surface }]}>
          <IconButton
            icon="close"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={() => setShowFullScreen(false)}
          />
          <Text 
            variant="titleMedium" 
            style={[styles.fullScreenTitle, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {document.name || document.title}
          </Text>
          <View style={styles.fullScreenActions}>
            <IconButton
              icon="share"
              size={24}
              iconColor={theme.colors.primary}
              onPress={handleShare}
            />
            <IconButton
              icon="download"
              size={24}
              iconColor={theme.colors.secondary}
              onPress={handleDownload}
            />
          </View>
        </View>

        <View style={styles.fullScreenContent}>
          {renderDocumentContent()}
        </View>

        <View style={[styles.fullScreenControls, { backgroundColor: theme.colors.surface }]}>
          <IconButton
            icon="zoom-out"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={handleZoomOut}
            disabled={zoom <= 0.5}
          />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface, minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Text>
          <IconButton
            icon="zoom-in"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={handleZoomIn}
            disabled={zoom >= 3}
          />
          <IconButton
            icon="fit-screen"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={handleResetZoom}
          />
        </View>

        {onAnnotate && (
          <FAB
            icon="edit"
            style={[styles.annotationFab, { backgroundColor: theme.colors.primary }]}
            onPress={handleAnnotate}
          />
        )}
      </View>
    </Modal>
  );

  if (showFullScreen) {
    return renderFullScreenModal();
  }

  return (
    <Card style={[styles.card, style]} mode="contained" {...props}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <View style={styles.documentInfo}>
            <Icon 
              name={getDocumentIcon(document.type)} 
              size={24} 
              color={theme.colors.primary} 
            />
            <View style={styles.documentDetails}>
              <Text 
                variant="titleSmall" 
                style={[styles.documentName, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {document.name || document.title}
              </Text>
              {document.size && (
                <Text 
                  variant="bodySmall" 
                  style={[styles.documentSize, { color: theme.colors.onSurfaceVariant }]}
                >
                  {document.size}
                </Text>
              )}
            </View>
          </View>
          
          {onClose && (
            <IconButton
              icon="close"
              size={20}
              iconColor={theme.colors.onSurfaceVariant}
              onPress={onClose}
            />
          )}
        </View>

        <View style={styles.viewerContainer}>
          {renderDocumentContent()}
        </View>

        {renderControls()}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    flex: 1,
  },
  content: {
    padding: spacing.md,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  documentName: {
    fontWeight: '600',
  },
  documentSize: {
    marginTop: spacing.xs,
  },
  viewerContainer: {
    flex: 1,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  documentScrollView: {
    flex: 1,
  },
  documentContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  documentPlaceholder: {
    width: screenWidth - (spacing.md * 6),
    height: screenHeight * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  documentTitle: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  documentType: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  documentPages: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.sm,
  },
  controlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenContainer: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    elevation: 4,
  },
  fullScreenTitle: {
    flex: 1,
    marginHorizontal: spacing.sm,
    fontWeight: '600',
  },
  fullScreenActions: {
    flexDirection: 'row',
  },
  fullScreenContent: {
    flex: 1,
  },
  fullScreenControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    elevation: 4,
  },
  annotationFab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
  },
});

export default DocumentViewer;