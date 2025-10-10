/**
 * OCRResultsView Component
 * Mobile-optimized OCR results display for clinical records
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { 
  Card, 
  Text, 
  useTheme, 
  Chip, 
  Button,
  TextInput,
  IconButton,
  Divider
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';

const ConfidenceIndicator = ({ confidence, theme }) => {
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return theme.colors.success;
    if (confidence >= 0.7) return theme.colors.warning;
    return theme.colors.error;
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  const color = getConfidenceColor(confidence);
  const label = getConfidenceLabel(confidence);

  return (
    <View style={styles.confidenceContainer}>
      <View style={[
        styles.confidenceBar,
        { backgroundColor: color + '20' }
      ]}>
        <View style={[
          styles.confidenceFill,
          { 
            width: `${confidence * 100}%`,
            backgroundColor: color
          }
        ]} />
      </View>
      <Text 
        variant="labelSmall" 
        style={[styles.confidenceText, { color }]}
      >
        {label} ({Math.round(confidence * 100)}%)
      </Text>
    </View>
  );
};

const ExtractedField = ({ field, onEdit, onAccept, onReject, theme }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(field.value);

  const handleSave = () => {
    if (onEdit) {
      onEdit(field.key, editedValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedValue(field.value);
    setIsEditing(false);
  };

  const getFieldIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'name':
      case 'patient_name':
        return 'person';
      case 'date':
      case 'birth_date':
        return 'event';
      case 'phone':
        return 'phone';
      case 'email':
        return 'email';
      case 'address':
        return 'location-on';
      case 'diagnosis':
        return 'medical-services';
      case 'medication':
        return 'local-pharmacy';
      case 'dosage':
        return 'medication';
      case 'doctor':
        return 'local-hospital';
      default:
        return 'text-fields';
    }
  };

  return (
    <View style={[
      styles.extractedField,
      { backgroundColor: theme.colors.surfaceVariant + '30' }
    ]}>
      <View style={styles.fieldHeader}>
        <View style={styles.fieldInfo}>
          <Icon 
            name={getFieldIcon(field.type)} 
            size={16} 
            color={theme.colors.primary} 
          />
          <Text 
            variant="labelMedium" 
            style={[styles.fieldLabel, { color: theme.colors.onSurface }]}
          >
            {field.label || field.key}
          </Text>
        </View>
        
        <ConfidenceIndicator confidence={field.confidence} theme={theme} />
      </View>

      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            mode="outlined"
            value={editedValue}
            onChangeText={setEditedValue}
            multiline={field.multiline}
            numberOfLines={field.multiline ? 3 : 1}
            style={styles.editInput}
          />
          <View style={styles.editActions}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.editButton}
              compact
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.editButton}
              compact
            >
              Save
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.fieldContent}>
          <Text 
            variant="bodyMedium" 
            style={[
              styles.fieldValue, 
              { color: theme.colors.onSurface },
              field.status === 'rejected' && { textDecorationLine: 'line-through', color: theme.colors.error }
            ]}
            selectable
          >
            {field.value}
          </Text>
          
          {field.originalValue && field.originalValue !== field.value && (
            <Text 
              variant="bodySmall" 
              style={[styles.originalValue, { color: theme.colors.onSurfaceVariant }]}
            >
              Original: {field.originalValue}
            </Text>
          )}
        </View>
      )}

      <View style={styles.fieldActions}>
        {field.status !== 'accepted' && field.status !== 'rejected' && (
          <>
            <IconButton
              icon="edit"
              size={16}
              iconColor={theme.colors.primary}
              onPress={() => setIsEditing(true)}
              style={styles.fieldActionButton}
            />
            <IconButton
              icon="check"
              size={16}
              iconColor={theme.colors.success}
              onPress={() => onAccept && onAccept(field.key)}
              style={styles.fieldActionButton}
            />
            <IconButton
              icon="close"
              size={16}
              iconColor={theme.colors.error}
              onPress={() => onReject && onReject(field.key)}
              style={styles.fieldActionButton}
            />
          </>
        )}
        
        {field.status === 'accepted' && (
          <Chip
            mode="outlined"
            compact
            style={[styles.statusChip, { borderColor: theme.colors.success }]}
            textStyle={{ color: theme.colors.success }}
          >
            Accepted
          </Chip>
        )}
        
        {field.status === 'rejected' && (
          <Chip
            mode="outlined"
            compact
            style={[styles.statusChip, { borderColor: theme.colors.error }]}
            textStyle={{ color: theme.colors.error }}
          >
            Rejected
          </Chip>
        )}
      </View>
    </View>
  );
};

const OCRResultsView = ({
  title = "OCR Results",
  ocrResults = {},
  onFieldEdit,
  onFieldAccept,
  onFieldReject,
  onAcceptAll,
  onRejectAll,
  onSaveResults,
  showActions = true,
  editable = true,
  style,
  ...props
}) => {
  const theme = useTheme();

  const {
    status = 'completed',
    confidence = 0,
    extractedFields = [],
    rawText = '',
    processedAt,
    processingTime,
    error
  } = ocrResults;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return theme.colors.success;
      case 'processing':
        return theme.colors.warning;
      case 'failed':
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const getAcceptedFieldsCount = () => {
    return extractedFields.filter(field => field.status === 'accepted').length;
  };

  const getRejectedFieldsCount = () => {
    return extractedFields.filter(field => field.status === 'rejected').length;
  };

  const getPendingFieldsCount = () => {
    return extractedFields.filter(field => !field.status || field.status === 'pending').length;
  };

  const renderContent = () => {
    if (status === 'processing') {
      return (
        <View style={styles.processingContainer}>
          <Icon name="hourglass-empty" size={32} color={theme.colors.warning} />
          <Text variant="bodyMedium" style={{ color: theme.colors.warning, marginTop: spacing.sm }}>
            Processing OCR...
          </Text>
        </View>
      );
    }

    if (status === 'failed' || error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={32} color={theme.colors.error} />
          <Text variant="bodyMedium" style={{ color: theme.colors.error, marginTop: spacing.sm }}>
            OCR Processing Failed
          </Text>
          {error && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
              {error}
            </Text>
          )}
        </View>
      );
    }

    if (extractedFields.length === 0 && !rawText) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="text-fields" size={32} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            No text extracted
          </Text>
        </View>
      );
    }

    return (
      <>
        {/* Summary Stats */}
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Overall Confidence
            </Text>
            <ConfidenceIndicator confidence={confidence} theme={theme} />
          </View>
          
          {processedAt && (
            <View style={styles.statItem}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Processed
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                {formatUtils.formatRelativeTime(processedAt)}
              </Text>
            </View>
          )}
          
          {processingTime && (
            <View style={styles.statItem}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Processing Time
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                {processingTime}ms
              </Text>
            </View>
          )}
        </View>

        {/* Field Status Summary */}
        {extractedFields.length > 0 && (
          <View style={styles.fieldsSummary}>
            <View style={styles.summaryItem}>
              <Icon name="check-circle" size={16} color={theme.colors.success} />
              <Text variant="labelSmall" style={{ color: theme.colors.success, marginLeft: spacing.xs }}>
                {getAcceptedFieldsCount()} accepted
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Icon name="cancel" size={16} color={theme.colors.error} />
              <Text variant="labelSmall" style={{ color: theme.colors.error, marginLeft: spacing.xs }}>
                {getRejectedFieldsCount()} rejected
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Icon name="schedule" size={16} color={theme.colors.warning} />
              <Text variant="labelSmall" style={{ color: theme.colors.warning, marginLeft: spacing.xs }}>
                {getPendingFieldsCount()} pending
              </Text>
            </View>
          </View>
        )}

        {/* Extracted Fields */}
        {extractedFields.length > 0 && (
          <View style={styles.fieldsSection}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Extracted Fields
            </Text>
            
            {showActions && editable && getPendingFieldsCount() > 0 && (
              <View style={styles.bulkActions}>
                <Button
                  mode="outlined"
                  onPress={onAcceptAll}
                  style={styles.bulkActionButton}
                  compact
                >
                  Accept All
                </Button>
                <Button
                  mode="outlined"
                  onPress={onRejectAll}
                  style={styles.bulkActionButton}
                  compact
                >
                  Reject All
                </Button>
              </View>
            )}
            
            <ScrollView showsVerticalScrollIndicator={false} style={styles.fieldsContainer}>
              {extractedFields.map((field, index) => (
                <ExtractedField
                  key={field.key || index}
                  field={field}
                  onEdit={editable ? onFieldEdit : null}
                  onAccept={editable ? onFieldAccept : null}
                  onReject={editable ? onFieldReject : null}
                  theme={theme}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Raw Text */}
        {rawText && (
          <View style={styles.rawTextSection}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Raw Text
            </Text>
            <ScrollView 
              style={styles.rawTextContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text 
                variant="bodySmall" 
                style={[styles.rawText, { color: theme.colors.onSurface }]}
                selectable
              >
                {rawText}
              </Text>
            </ScrollView>
          </View>
        )}
      </>
    );
  };

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
          
          <Chip
            mode="outlined"
            compact
            style={[
              styles.statusChip,
              { borderColor: getStatusColor(status) }
            ]}
            textStyle={[
              styles.statusText,
              { color: getStatusColor(status) }
            ]}
          >
            {status}
          </Chip>
        </View>

        {renderContent()}

        {/* Save Actions */}
        {showActions && editable && extractedFields.length > 0 && (
          <View style={styles.saveActions}>
            <Divider style={styles.actionsDivider} />
            <Button
              mode="contained"
              onPress={onSaveResults}
              style={styles.saveButton}
              disabled={getPendingFieldsCount() > 0}
            >
              Save Results
            </Button>
          </View>
        )}
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
  statusChip: {
    height: 24,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
    borderRadius: borderRadius.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  confidenceContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  confidenceBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: '500',
  },
  fieldsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: borderRadius.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldsSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  bulkActionButton: {
    marginLeft: spacing.sm,
  },
  fieldsContainer: {
    maxHeight: 300,
  },
  extractedField: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  fieldInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fieldLabel: {
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  fieldContent: {
    marginBottom: spacing.sm,
  },
  fieldValue: {
    fontWeight: '400',
    lineHeight: 20,
  },
  originalValue: {
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  editContainer: {
    marginBottom: spacing.sm,
  },
  editInput: {
    marginBottom: spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    marginLeft: spacing.sm,
  },
  fieldActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fieldActionButton: {
    margin: 0,
    width: 28,
    height: 28,
  },
  rawTextSection: {
    marginBottom: spacing.md,
  },
  rawTextContainer: {
    maxHeight: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  rawText: {
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  saveActions: {
    marginTop: spacing.md,
  },
  actionsDivider: {
    marginBottom: spacing.md,
  },
  saveButton: {
    alignSelf: 'center',
    minWidth: 120,
  },
  processingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OCRResultsView;