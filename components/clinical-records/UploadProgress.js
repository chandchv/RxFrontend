/**
 * UploadProgress Component
 * Mobile-optimized upload progress display for clinical records
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  Card, 
  Text, 
  useTheme, 
  ProgressBar, 
  IconButton,
  Chip
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';

const UploadItem = ({ upload, onCancel, onRetry, onRemove, theme }) => {
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'uploading':
        return 'cloud-upload';
      case 'processing':
        return 'hourglass-empty';
      case 'completed':
        return 'check-circle';
      case 'failed':
      case 'error':
        return 'error';
      case 'cancelled':
        return 'cancel';
      case 'paused':
        return 'pause-circle';
      default:
        return 'cloud-upload';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'uploading':
      case 'processing':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.success;
      case 'failed':
      case 'error':
        return theme.colors.error;
      case 'cancelled':
        return theme.colors.onSurfaceVariant;
      case 'paused':
        return theme.colors.warning;
      default:
        return theme.colors.primary;
    }
  };

  const getFileIcon = (type) => {
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return '';
    return `${formatFileSize(bytesPerSecond)}/s`;
  };

  const getETA = (progress, speed) => {
    if (!speed || progress >= 100) return '';
    const remainingBytes = (upload.size * (100 - progress)) / 100;
    const remainingSeconds = remainingBytes / speed;
    
    if (remainingSeconds < 60) {
      return `${Math.round(remainingSeconds)}s remaining`;
    } else if (remainingSeconds < 3600) {
      return `${Math.round(remainingSeconds / 60)}m remaining`;
    } else {
      return `${Math.round(remainingSeconds / 3600)}h remaining`;
    }
  };

  const statusColor = getStatusColor(upload.status);
  const progress = upload.progress || 0;

  return (
    <View style={[
      styles.uploadItem,
      { backgroundColor: theme.colors.surfaceVariant + '50' }
    ]}>
      {/* File Info */}
      <View style={styles.uploadHeader}>
        <View style={styles.fileInfo}>
          <Icon 
            name={getFileIcon(upload.type)} 
            size={24} 
            color={theme.colors.primary} 
          />
          <View style={styles.fileDetails}>
            <Text 
              variant="bodyMedium" 
              style={[styles.fileName, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {upload.name}
            </Text>
            <View style={styles.fileMeta}>
              <Text 
                variant="labelSmall" 
                style={[styles.fileSize, { color: theme.colors.onSurfaceVariant }]}
              >
                {formatFileSize(upload.size)}
              </Text>
              {upload.type && (
                <>
                  <Text style={[styles.separator, { color: theme.colors.onSurfaceVariant }]}>•</Text>
                  <Text 
                    variant="labelSmall" 
                    style={[styles.fileType, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {upload.type.toUpperCase()}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <Icon 
            name={getStatusIcon(upload.status)} 
            size={20} 
            color={statusColor} 
          />
          <Chip
            mode="outlined"
            compact
            style={[
              styles.statusChip,
              { borderColor: statusColor }
            ]}
            textStyle={[
              styles.statusText,
              { color: statusColor }
            ]}
          >
            {upload.status}
          </Chip>
        </View>
      </View>

      {/* Progress Bar */}
      {(upload.status === 'uploading' || upload.status === 'processing') && (
        <View style={styles.progressContainer}>
          <ProgressBar 
            progress={progress / 100} 
            color={statusColor}
            style={styles.progressBar}
          />
          <View style={styles.progressInfo}>
            <Text 
              variant="labelSmall" 
              style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}
            >
              {Math.round(progress)}%
            </Text>
            {upload.speed && (
              <Text 
                variant="labelSmall" 
                style={[styles.speedText, { color: theme.colors.onSurfaceVariant }]}
              >
                {formatSpeed(upload.speed)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* ETA and Additional Info */}
      {upload.status === 'uploading' && upload.speed && (
        <Text 
          variant="labelSmall" 
          style={[styles.etaText, { color: theme.colors.onSurfaceVariant }]}
        >
          {getETA(progress, upload.speed)}
        </Text>
      )}

      {/* Error Message */}
      {upload.status === 'failed' && upload.error && (
        <Text 
          variant="bodySmall" 
          style={[styles.errorText, { color: theme.colors.error }]}
          numberOfLines={2}
        >
          {upload.error}
        </Text>
      )}

      {/* Processing Info */}
      {upload.status === 'processing' && (
        <Text 
          variant="bodySmall" 
          style={[styles.processingText, { color: theme.colors.primary }]}
        >
          Processing document... This may take a few moments.
        </Text>
      )}

      {/* Completion Info */}
      {upload.status === 'completed' && upload.completedAt && (
        <Text 
          variant="labelSmall" 
          style={[styles.completedText, { color: theme.colors.success }]}
        >
          Completed {formatUtils.formatRelativeTime(upload.completedAt)}
        </Text>
      )}

      {/* Actions */}
      <View style={styles.uploadActions}>
        {upload.status === 'uploading' && onCancel && (
          <IconButton
            icon="cancel"
            size={20}
            iconColor={theme.colors.error}
            onPress={() => onCancel(upload)}
            style={styles.actionButton}
          />
        )}
        
        {upload.status === 'failed' && onRetry && (
          <IconButton
            icon="refresh"
            size={20}
            iconColor={theme.colors.primary}
            onPress={() => onRetry(upload)}
            style={styles.actionButton}
          />
        )}
        
        {(upload.status === 'completed' || upload.status === 'failed' || upload.status === 'cancelled') && onRemove && (
          <IconButton
            icon="close"
            size={20}
            iconColor={theme.colors.onSurfaceVariant}
            onPress={() => onRemove(upload)}
            style={styles.actionButton}
          />
        )}
      </View>
    </View>
  );
};

const UploadProgress = ({
  title = "Upload Progress",
  uploads = [],
  onCancelUpload,
  onRetryUpload,
  onRemoveUpload,
  onClearCompleted,
  showCompleted = true,
  maxItems = 10,
  style,
  ...props
}) => {
  const theme = useTheme();

  const getFilteredUploads = () => {
    let filtered = uploads;
    
    if (!showCompleted) {
      filtered = uploads.filter(upload => 
        upload.status !== 'completed' && upload.status !== 'cancelled'
      );
    }
    
    return filtered.slice(0, maxItems);
  };

  const displayUploads = getFilteredUploads();
  const activeUploads = uploads.filter(upload => 
    upload.status === 'uploading' || upload.status === 'processing'
  );
  const completedUploads = uploads.filter(upload => upload.status === 'completed');
  const failedUploads = uploads.filter(upload => upload.status === 'failed');

  const getTotalProgress = () => {
    if (activeUploads.length === 0) return 0;
    const totalProgress = activeUploads.reduce((sum, upload) => sum + (upload.progress || 0), 0);
    return totalProgress / activeUploads.length;
  };

  if (displayUploads.length === 0) {
    return null;
  }

  return (
    <Card style={[styles.card, style]} mode="contained" {...props}>
      <Card.Content style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text 
            variant="titleMedium" 
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
          
          <View style={styles.headerInfo}>
            {activeUploads.length > 0 && (
              <Chip
                mode="outlined"
                compact
                style={[styles.activeChip, { borderColor: theme.colors.primary }]}
                textStyle={{ color: theme.colors.primary }}
              >
                {activeUploads.length} active
              </Chip>
            )}
            
            {completedUploads.length > 0 && onClearCompleted && (
              <TouchableOpacity
                onPress={onClearCompleted}
                style={styles.clearButton}
              >
                <Text 
                  variant="labelMedium" 
                  style={[styles.clearText, { color: theme.colors.primary }]}
                >
                  Clear completed
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Overall Progress */}
        {activeUploads.length > 0 && (
          <View style={styles.overallProgress}>
            <View style={styles.overallProgressHeader}>
              <Text 
                variant="bodySmall" 
                style={[styles.overallProgressLabel, { color: theme.colors.onSurfaceVariant }]}
              >
                Overall Progress
              </Text>
              <Text 
                variant="bodySmall" 
                style={[styles.overallProgressText, { color: theme.colors.onSurfaceVariant }]}
              >
                {Math.round(getTotalProgress())}%
              </Text>
            </View>
            <ProgressBar 
              progress={getTotalProgress() / 100} 
              color={theme.colors.primary}
              style={styles.overallProgressBar}
            />
          </View>
        )}

        {/* Summary Stats */}
        {(completedUploads.length > 0 || failedUploads.length > 0) && (
          <View style={styles.summaryStats}>
            {completedUploads.length > 0 && (
              <View style={styles.statItem}>
                <Icon name="check-circle" size={16} color={theme.colors.success} />
                <Text 
                  variant="labelSmall" 
                  style={[styles.statText, { color: theme.colors.success }]}
                >
                  {completedUploads.length} completed
                </Text>
              </View>
            )}
            
            {failedUploads.length > 0 && (
              <View style={styles.statItem}>
                <Icon name="error" size={16} color={theme.colors.error} />
                <Text 
                  variant="labelSmall" 
                  style={[styles.statText, { color: theme.colors.error }]}
                >
                  {failedUploads.length} failed
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Upload Items */}
        <View style={styles.uploadsContainer}>
          {displayUploads.map((upload, index) => (
            <UploadItem
              key={upload.id || index}
              upload={upload}
              onCancel={onCancelUpload}
              onRetry={onRetryUpload}
              onRemove={onRemoveUpload}
              theme={theme}
            />
          ))}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeChip: {
    height: 24,
    marginRight: spacing.sm,
  },
  clearButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearText: {
    fontWeight: '500',
  },
  overallProgress: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
    borderRadius: borderRadius.sm,
  },
  overallProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  overallProgressLabel: {
    fontWeight: '500',
  },
  overallProgressText: {
    fontWeight: '500',
  },
  overallProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  statText: {
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  uploadsContainer: {
    gap: spacing.sm,
  },
  uploadItem: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    position: 'relative',
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  fileName: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileSize: {
    fontSize: 11,
  },
  separator: {
    marginHorizontal: spacing.xs,
    fontSize: 11,
  },
  fileType: {
    fontSize: 11,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusChip: {
    height: 20,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
  },
  speedText: {
    fontSize: 11,
  },
  etaText: {
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  errorText: {
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  processingText: {
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  completedText: {
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  uploadActions: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
  },
  actionButton: {
    margin: 0,
    width: 32,
    height: 32,
  },
});

export default UploadProgress;