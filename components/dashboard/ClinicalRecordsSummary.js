/**
 * ClinicalRecordsSummary Component
 * Mobile-optimized clinical records summary display for dashboard
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Text, useTheme, ProgressBar, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';

const RecordTypeCard = ({ type, count, icon, color, onPress, theme }) => (
  <TouchableOpacity
    style={[
      styles.recordTypeCard,
      { backgroundColor: color + '15' }
    ]}
    onPress={() => onPress && onPress(type)}
    activeOpacity={0.7}
  >
    <Icon name={icon} size={24} color={color} />
    <Text 
      variant="headlineSmall" 
      style={[styles.recordCount, { color: theme.colors.onSurface }]}
    >
      {count}
    </Text>
    <Text 
      variant="labelMedium" 
      style={[styles.recordLabel, { color: theme.colors.onSurfaceVariant }]}
      numberOfLines={1}
    >
      {type}
    </Text>
  </TouchableOpacity>
);

const ProcessingStatusItem = ({ label, current, total, color, theme }) => {
  const progress = total > 0 ? current / total : 0;
  
  return (
    <View style={styles.statusItem}>
      <View style={styles.statusHeader}>
        <Text 
          variant="bodyMedium" 
          style={[styles.statusLabel, { color: theme.colors.onSurface }]}
        >
          {label}
        </Text>
        <Text 
          variant="bodySmall" 
          style={[styles.statusCount, { color: theme.colors.onSurfaceVariant }]}
        >
          {current}/{total}
        </Text>
      </View>
      <ProgressBar 
        progress={progress} 
        color={color}
        style={styles.progressBar}
      />
    </View>
  );
};

const RecentRecordItem = ({ record, onPress, theme }) => {
  const getRecordIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'lab_result':
        return 'science';
      case 'imaging':
        return 'medical-services';
      case 'prescription':
        return 'local-pharmacy';
      case 'clinical_note':
        return 'note-add';
      case 'document':
        return 'description';
      default:
        return 'folder';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'processed':
        return theme.colors.success;
      case 'processing':
        return theme.colors.warning;
      case 'failed':
        return theme.colors.error;
      case 'pending':
        return theme.colors.onSurfaceVariant;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <TouchableOpacity
      style={styles.recentRecordItem}
      onPress={() => onPress && onPress(record)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.recordIcon,
        { backgroundColor: getStatusColor(record.status) + '15' }
      ]}>
        <Icon 
          name={getRecordIcon(record.type)} 
          size={20} 
          color={getStatusColor(record.status)} 
        />
      </View>
      
      <View style={styles.recordInfo}>
        <Text 
          variant="bodyMedium" 
          style={[styles.recordTitle, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {record.title || record.name}
        </Text>
        
        <View style={styles.recordMeta}>
          <Text 
            variant="bodySmall" 
            style={[styles.recordDate, { color: theme.colors.onSurfaceVariant }]}
          >
            {formatUtils.formatRelativeTime(record.created_at)}
          </Text>
          
          {record.patient_name && (
            <>
              <Text style={[styles.separator, { color: theme.colors.onSurfaceVariant }]}>•</Text>
              <Text 
                variant="bodySmall" 
                style={[styles.recordPatient, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {record.patient_name}
              </Text>
            </>
          )}
        </View>
      </View>
      
      <Chip
        mode="outlined"
        compact
        style={[
          styles.recordStatusChip,
          { borderColor: getStatusColor(record.status) }
        ]}
        textStyle={[
          styles.recordStatusText,
          { color: getStatusColor(record.status) }
        ]}
      >
        {record.status}
      </Chip>
    </TouchableOpacity>
  );
};

const ClinicalRecordsSummary = ({
  title = "Clinical Records",
  summary = {},
  recentRecords = [],
  processingStatus = {},
  onRecordTypePress,
  onRecentRecordPress,
  onViewAllPress,
  loading = false,
  error = false,
  style,
  ...props
}) => {
  const theme = useTheme();

  const defaultSummary = {
    total_records: 0,
    lab_results: 0,
    imaging_studies: 0,
    prescriptions: 0,
    clinical_notes: 0,
    documents: 0,
    ...summary
  };

  const defaultProcessingStatus = {
    pending_ocr: { current: 0, total: 0 },
    processing: { current: 0, total: 0 },
    failed: { current: 0, total: 0 },
    ...processingStatus
  };

  const recordTypes = [
    { 
      type: 'Lab Results', 
      count: defaultSummary.lab_results, 
      icon: 'science', 
      color: theme.colors.success 
    },
    { 
      type: 'Imaging', 
      count: defaultSummary.imaging_studies, 
      icon: 'medical-services', 
      color: theme.colors.primary 
    },
    { 
      type: 'Prescriptions', 
      count: defaultSummary.prescriptions, 
      icon: 'local-pharmacy', 
      color: theme.colors.tertiary 
    },
    { 
      type: 'Notes', 
      count: defaultSummary.clinical_notes, 
      icon: 'note-add', 
      color: theme.colors.secondary 
    },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-empty" size={32} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            Loading clinical records...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={32} color={theme.colors.error} />
          <Text variant="bodyMedium" style={{ color: theme.colors.error, marginTop: spacing.sm }}>
            Error loading clinical records
          </Text>
        </View>
      );
    }

    return (
      <>
        {/* Total Records Summary */}
        <View style={styles.totalSummary}>
          <View style={styles.totalInfo}>
            <Text 
              variant="headlineLarge" 
              style={[styles.totalCount, { color: theme.colors.primary }]}
            >
              {defaultSummary.total_records}
            </Text>
            <Text 
              variant="bodyMedium" 
              style={[styles.totalLabel, { color: theme.colors.onSurfaceVariant }]}
            >
              Total Records
            </Text>
          </View>
          
          {onViewAllPress && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={onViewAllPress}
              activeOpacity={0.7}
            >
              <Text 
                variant="labelMedium" 
                style={[styles.viewAllText, { color: theme.colors.primary }]}
              >
                View All
              </Text>
              <Icon name="arrow-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Record Types Grid */}
        <View style={styles.recordTypesGrid}>
          {recordTypes.map((recordType, index) => (
            <RecordTypeCard
              key={index}
              type={recordType.type}
              count={recordType.count}
              icon={recordType.icon}
              color={recordType.color}
              onPress={onRecordTypePress}
              theme={theme}
            />
          ))}
        </View>

        {/* Processing Status */}
        {(defaultProcessingStatus.pending_ocr.total > 0 || 
          defaultProcessingStatus.processing.total > 0 || 
          defaultProcessingStatus.failed.total > 0) && (
          <View style={styles.processingSection}>
            <Text 
              variant="titleSmall" 
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Processing Status
            </Text>
            
            {defaultProcessingStatus.pending_ocr.total > 0 && (
              <ProcessingStatusItem
                label="Pending OCR"
                current={defaultProcessingStatus.pending_ocr.current}
                total={defaultProcessingStatus.pending_ocr.total}
                color={theme.colors.warning}
                theme={theme}
              />
            )}
            
            {defaultProcessingStatus.processing.total > 0 && (
              <ProcessingStatusItem
                label="Processing"
                current={defaultProcessingStatus.processing.current}
                total={defaultProcessingStatus.processing.total}
                color={theme.colors.primary}
                theme={theme}
              />
            )}
            
            {defaultProcessingStatus.failed.total > 0 && (
              <ProcessingStatusItem
                label="Failed"
                current={defaultProcessingStatus.failed.current}
                total={defaultProcessingStatus.failed.total}
                color={theme.colors.error}
                theme={theme}
              />
            )}
          </View>
        )}

        {/* Recent Records */}
        {recentRecords.length > 0 && (
          <View style={styles.recentSection}>
            <Text 
              variant="titleSmall" 
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Recent Records
            </Text>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {recentRecords.slice(0, 5).map((record, index) => (
                <RecentRecordItem
                  key={record.id || index}
                  record={record}
                  onPress={onRecentRecordPress}
                  theme={theme}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </>
    );
  };

  return (
    <Card 
      style={[styles.card, style]} 
      mode="contained"
      {...props}
    >
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Text 
            variant="titleMedium" 
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
        </View>
        
        {renderContent()}
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
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
  },
  totalSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  totalInfo: {
    alignItems: 'flex-start',
  },
  totalCount: {
    fontWeight: '700',
  },
  totalLabel: {
    marginTop: spacing.xs,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    marginRight: spacing.xs,
    fontWeight: '500',
  },
  recordTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  recordTypeCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  recordCount: {
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  recordLabel: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontWeight: '500',
  },
  processingSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  statusItem: {
    marginBottom: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusLabel: {
    fontWeight: '500',
  },
  statusCount: {
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  recentSection: {
    marginBottom: spacing.md,
  },
  recentRecordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordDate: {
    fontSize: 12,
  },
  separator: {
    marginHorizontal: spacing.xs,
    fontSize: 12,
  },
  recordPatient: {
    fontSize: 12,
    flex: 1,
  },
  recordStatusChip: {
    height: 24,
  },
  recordStatusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ClinicalRecordsSummary;