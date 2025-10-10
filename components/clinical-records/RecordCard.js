/**
 * RecordCard Component
 * Mobile-optimized clinical record display card
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme, Chip, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';

const RecordCard = ({
  record,
  onPress,
  onShare,
  onDownload,
  onFavorite,
  showActions = true,
  compact = false,
  style,
  ...props
}) => {
  const theme = useTheme();

  if (!record) {
    return null;
  }

  const getRecordIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'lab_result':
        return 'science';
      case 'imaging':
      case 'dicom':
        return 'medical-services';
      case 'prescription':
        return 'local-pharmacy';
      case 'clinical_note':
        return 'note-add';
      case 'document':
        return 'description';
      case 'pdf':
        return 'picture-as-pdf';
      case 'image':
        return 'image';
      default:
        return 'folder';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'processed':
      case 'completed':
        return theme.colors.success;
      case 'processing':
      case 'pending':
        return theme.colors.warning;
      case 'failed':
      case 'error':
        return theme.colors.error;
      case 'draft':
        return theme.colors.onSurfaceVariant;
      default:
        return theme.colors.primary;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return theme.colors.error;
      case 'high':
        return theme.colors.warning;
      case 'normal':
        return theme.colors.success;
      case 'low':
        return theme.colors.onSurfaceVariant;
      default:
        return theme.colors.primary;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const statusColor = getStatusColor(record.status);
  const priorityColor = getPriorityColor(record.priority);

  return (
    <Card 
      style={[styles.card, compact && styles.compactCard, style]} 
      mode="contained"
      {...props}
    >
      <TouchableOpacity 
        onPress={() => onPress && onPress(record)}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        <Card.Content style={[styles.content, compact && styles.compactContent]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.recordInfo}>
              <View style={[
                styles.iconContainer,
                { backgroundColor: statusColor + '15' }
              ]}>
                <Icon 
                  name={getRecordIcon(record.type)} 
                  size={compact ? 20 : 24} 
                  color={statusColor} 
                />
              </View>
              
              <View style={styles.titleContainer}>
                <Text 
                  variant={compact ? "bodyMedium" : "titleSmall"} 
                  style={[styles.recordTitle, { color: theme.colors.onSurface }]}
                  numberOfLines={compact ? 1 : 2}
                >
                  {record.title || record.name || 'Untitled Record'}
                </Text>
                
                {!compact && record.description && (
                  <Text 
                    variant="bodySmall" 
                    style={[styles.recordDescription, { color: theme.colors.onSurfaceVariant }]}
                    numberOfLines={2}
                  >
                    {record.description}
                  </Text>
                )}
              </View>
            </View>

            {showActions && (
              <View style={styles.headerActions}>
                {record.is_favorite && (
                  <Icon name="favorite" size={16} color={theme.colors.error} />
                )}
                {record.is_shared && (
                  <Icon name="share" size={16} color={theme.colors.primary} style={{ marginLeft: spacing.xs }} />
                )}
              </View>
            )}
          </View>

          {/* Metadata */}
          <View style={styles.metadata}>
            <View style={styles.metadataRow}>
              {record.patient_name && (
                <View style={styles.metadataItem}>
                  <Icon name="person" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text 
                    variant="labelSmall" 
                    style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}
                    numberOfLines={1}
                  >
                    {record.patient_name}
                  </Text>
                </View>
              )}
              
              {record.created_at && (
                <View style={styles.metadataItem}>
                  <Icon name="schedule" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text 
                    variant="labelSmall" 
                    style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {formatUtils.formatRelativeTime(record.created_at)}
                  </Text>
                </View>
              )}
            </View>

            {!compact && (
              <View style={styles.metadataRow}>
                {record.file_size && (
                  <View style={styles.metadataItem}>
                    <Icon name="storage" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text 
                      variant="labelSmall" 
                      style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}
                    >
                      {formatFileSize(record.file_size)}
                    </Text>
                  </View>
                )}
                
                {record.doctor_name && (
                  <View style={styles.metadataItem}>
                    <Icon name="medical-services" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text 
                      variant="labelSmall" 
                      style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}
                      numberOfLines={1}
                    >
                      Dr. {record.doctor_name}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Status and Priority Chips */}
          <View style={styles.chipsContainer}>
            {record.status && (
              <Chip
                mode="outlined"
                compact
                style={[
                  styles.statusChip,
                  { borderColor: statusColor }
                ]}
                textStyle={[
                  styles.chipText,
                  { color: statusColor }
                ]}
              >
                {record.status}
              </Chip>
            )}
            
            {record.priority && record.priority !== 'normal' && (
              <Chip
                mode="outlined"
                compact
                style={[
                  styles.priorityChip,
                  { borderColor: priorityColor }
                ]}
                textStyle={[
                  styles.chipText,
                  { color: priorityColor }
                ]}
              >
                {record.priority}
              </Chip>
            )}
            
            {record.type && (
              <Chip
                mode="outlined"
                compact
                style={styles.typeChip}
                textStyle={[
                  styles.chipText,
                  { color: theme.colors.onSurfaceVariant }
                ]}
              >
                {record.type}
              </Chip>
            )}
          </View>

          {/* Actions */}
          {showActions && !compact && (
            <View style={styles.actions}>
              {onShare && (
                <IconButton
                  icon="share"
                  size={20}
                  iconColor={theme.colors.primary}
                  onPress={() => onShare(record)}
                  style={styles.actionButton}
                />
              )}
              
              {onDownload && (
                <IconButton
                  icon="download"
                  size={20}
                  iconColor={theme.colors.secondary}
                  onPress={() => onDownload(record)}
                  style={styles.actionButton}
                />
              )}
              
              {onFavorite && (
                <IconButton
                  icon={record.is_favorite ? "favorite" : "favorite-border"}
                  size={20}
                  iconColor={record.is_favorite ? theme.colors.error : theme.colors.onSurfaceVariant}
                  onPress={() => onFavorite(record)}
                  style={styles.actionButton}
                />
              )}
              
              {onPress && (
                <IconButton
                  icon="open-in-new"
                  size={20}
                  iconColor={theme.colors.primary}
                  onPress={() => onPress(record)}
                  style={styles.actionButton}
                />
              )}
            </View>
          )}
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  compactCard: {
    marginVertical: spacing.xs / 2,
  },
  content: {
    padding: spacing.md,
  },
  compactContent: {
    padding: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recordInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  recordTitle: {
    fontWeight: '600',
    lineHeight: 20,
  },
  recordDescription: {
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadata: {
    marginBottom: spacing.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    flex: 1,
  },
  metadataText: {
    marginLeft: spacing.xs,
    fontSize: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  statusChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    height: 24,
  },
  priorityChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    height: 24,
  },
  typeChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    height: 24,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionButton: {
    margin: 0,
    marginLeft: spacing.xs,
  },
});

export default RecordCard;