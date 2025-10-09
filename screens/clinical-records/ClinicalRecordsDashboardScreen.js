/**
 * Clinical Records Dashboard Screen
 * 
 * Role-specific clinical records dashboard that displays overview and metrics
 * from existing analytics service and provides navigation to clinical records
 * list, search, and upload screens.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  ProgressBar,
  Surface,
  Divider,
  IconButton,
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuth } from '../../contexts/AuthContext';
import { useMobileDashboard } from '../../contexts/MobileDashboardContext';
import mobileApiService from '../../services/mobileApiService';
import { formatFileSize, formatDate, formatDuration } from '../../utils/formatUtils';
import { theme } from '../../styles/theme';

const { width } = Dimensions.get('window');

const ClinicalRecordsDashboardScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { updateLastActivity } = useMobileDashboard();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');

  // Load dashboard data
  const loadDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Get clinical records summary with role-specific data
      const summaryData = await mobileApiService.getClinicalRecordsSummary({
        dateRange: selectedTimeRange,
        includeTrends: true,
      });

      // Get recent documents
      const recentDocuments = await mobileApiService.getRecentDocuments({
        limit: 5,
      });

      // Get dashboard alerts related to clinical records
      const alerts = await mobileApiService.getDashboardAlerts({
        limit: 5,
        categories: ['clinical_records', 'document_processing', 'ocr_review'],
      });

      setDashboardData({
        summary: summaryData,
        recentDocuments: recentDocuments,
        alerts: alerts,
      });

      updateLastActivity();
    } catch (err) {
      console.error('Failed to load clinical records dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTimeRange, updateLastActivity]);

  // Initial load
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData(false);
  }, [loadDashboardData]);

  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setSelectedTimeRange(range);
  };

  // Navigation handlers
  const navigateToRecordsList = () => {
    navigation.navigate('ClinicalRecordsList');
  };

  const navigateToSearch = () => {
    navigation.navigate('RecordSearch');
  };

  const navigateToUpload = () => {
    navigation.navigate('DocumentUpload');
  };

  const navigateToRecordDetail = (recordId) => {
    navigation.navigate('ClinicalRecordDetail', { recordId });
  };

  const navigateToDocumentViewer = (documentId) => {
    navigation.navigate('DocumentViewer', { documentId });
  };

  // Render loading state
  if (loading && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading clinical records dashboard...</Text>
      </View>
    );
  }

  // Render error state
  if (error && !dashboardData) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color={theme.colors.error} />
        <Text style={styles.errorTitle}>Failed to Load Dashboard</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Button mode="contained" onPress={() => loadDashboardData()}>
          Retry
        </Button>
      </View>
    );
  }

  const { summary, recentDocuments, alerts } = dashboardData || {};

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <Title style={styles.headerTitle}>Clinical Records</Title>
          <Text style={styles.headerSubtitle}>
            {user?.role === 'doctor' && 'Your patient records and documents'}
            {user?.role === 'patient' && 'Your health records and documents'}
            {user?.role === 'admin' && 'System-wide clinical records overview'}
            {user?.role === 'staff' && 'Document processing and management'}
          </Text>
        </View>
        <IconButton
          icon="refresh"
          size={24}
          onPress={() => loadDashboardData()}
          disabled={loading}
        />
      </Surface>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['7', '30', '90', '365'].map((range) => (
            <Chip
              key={range}
              mode={selectedTimeRange === range ? 'flat' : 'outlined'}
              selected={selectedTimeRange === range}
              onPress={() => handleTimeRangeChange(range)}
              style={styles.timeRangeChip}
            >
              {range === '7' && 'Last 7 days'}
              {range === '30' && 'Last 30 days'}
              {range === '90' && 'Last 3 months'}
              {range === '365' && 'Last year'}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Quick Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Quick Actions</Title>
          <View style={styles.quickActionsContainer}>
            <Button
              mode="contained"
              icon="file-document-multiple"
              onPress={navigateToRecordsList}
              style={styles.quickActionButton}
            >
              View Records
            </Button>
            <Button
              mode="outlined"
              icon="magnify"
              onPress={navigateToSearch}
              style={styles.quickActionButton}
            >
              Search
            </Button>
            {(user?.role === 'doctor' || user?.role === 'staff') && (
              <Button
                mode="outlined"
                icon="upload"
                onPress={navigateToUpload}
                style={styles.quickActionButton}
              >
                Upload
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Summary Metrics */}
      {summary && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Overview</Title>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{summary.summary?.total_records || 0}</Text>
                <Text style={styles.metricLabel}>Total Records</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{summary.summary?.total_documents || 0}</Text>
                <Text style={styles.metricLabel}>Documents</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{summary.summary?.today_records || 0}</Text>
                <Text style={styles.metricLabel}>Today</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {formatFileSize(summary.summary?.total_storage_bytes || 0)}
                </Text>
                <Text style={styles.metricLabel}>Storage</Text>
              </View>
            </View>

            {/* Processing Status */}
            {summary.summary?.pending_reviews > 0 && (
              <View style={styles.processingStatus}>
                <Divider style={styles.divider} />
                <View style={styles.statusRow}>
                  <Icon name="clock-outline" size={20} color={theme.colors.warning} />
                  <Text style={styles.statusText}>
                    {summary.summary.pending_reviews} documents need review
                  </Text>
                </View>
              </View>
            )}

            {summary.summary?.failed_processing > 0 && (
              <View style={styles.statusRow}>
                <Icon name="alert-circle" size={20} color={theme.colors.error} />
                <Text style={styles.statusText}>
                  {summary.summary.failed_processing} processing failures
                </Text>
              </View>
            )}

            {/* OCR Confidence */}
            {summary.summary?.avg_ocr_confidence && (
              <View style={styles.ocrConfidence}>
                <Divider style={styles.divider} />
                <Text style={styles.ocrLabel}>Average OCR Confidence</Text>
                <ProgressBar
                  progress={summary.summary.avg_ocr_confidence / 100}
                  color={
                    summary.summary.avg_ocr_confidence > 80
                      ? theme.colors.success
                      : summary.summary.avg_ocr_confidence > 60
                      ? theme.colors.warning
                      : theme.colors.error
                  }
                  style={styles.progressBar}
                />
                <Text style={styles.ocrValue}>
                  {Math.round(summary.summary.avg_ocr_confidence)}%
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Records by Type */}
      {summary?.records_by_type && summary.records_by_type.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Records by Type</Title>
            {summary.records_by_type.slice(0, 5).map((item, index) => (
              <View key={index} style={styles.typeRow}>
                <Text style={styles.typeName}>
                  {item.record_type.replace('_', ' ').toUpperCase()}
                </Text>
                <Chip size="small">{item.count}</Chip>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Recent Documents */}
      {recentDocuments?.results && recentDocuments.results.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title>Recent Documents</Title>
              <Button
                mode="text"
                onPress={navigateToRecordsList}
                compact
              >
                View All
              </Button>
            </View>
            {recentDocuments.results.map((doc, index) => (
              <Surface key={doc.id} style={styles.documentItem}>
                <View style={styles.documentContent}>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {doc.original_filename}
                    </Text>
                    <Text style={styles.documentMeta}>
                      {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                    </Text>
                  </View>
                  <View style={styles.documentStatus}>
                    <Chip
                      size="small"
                      mode={doc.processing_status === 'completed' ? 'flat' : 'outlined'}
                      textStyle={styles.statusChipText}
                    >
                      {doc.processing_status}
                    </Chip>
                  </View>
                </View>
                {index < recentDocuments.results.length - 1 && (
                  <Divider style={styles.documentDivider} />
                )}
              </Surface>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Alerts */}
      {alerts?.results && alerts.results.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Alerts & Notifications</Title>
            {alerts.results.map((alert, index) => (
              <Surface key={alert.id} style={styles.alertItem}>
                <View style={styles.alertContent}>
                  <Icon
                    name={
                      alert.category === 'clinical_records'
                        ? 'file-document'
                        : alert.category === 'document_processing'
                        ? 'cog'
                        : 'eye'
                    }
                    size={20}
                    color={
                      alert.priority === 'high'
                        ? theme.colors.error
                        : alert.priority === 'medium'
                        ? theme.colors.warning
                        : theme.colors.primary
                    }
                  />
                  <View style={styles.alertText}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <Text style={styles.alertTime}>{formatDate(alert.created_at)}</Text>
                  </View>
                </View>
                {index < alerts.results.length - 1 && (
                  <Divider style={styles.alertDivider} />
                )}
              </Surface>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Empty State */}
      {!loading && (!summary || summary.summary?.total_records === 0) && (
        <Card style={styles.card}>
          <Card.Content style={styles.emptyState}>
            <Icon name="file-document-outline" size={64} color={theme.colors.disabled} />
            <Title style={styles.emptyTitle}>No Clinical Records</Title>
            <Paragraph style={styles.emptyMessage}>
              {user?.role === 'patient'
                ? 'You don\'t have any clinical records yet. Your healthcare provider will add records as they become available.'
                : 'No clinical records found. Start by uploading documents or creating new records.'}
            </Paragraph>
            {(user?.role === 'doctor' || user?.role === 'staff') && (
              <Button
                mode="contained"
                icon="upload"
                onPress={navigateToUpload}
                style={styles.emptyActionButton}
              >
                Upload First Document
              </Button>
            )}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.7,
  },
  timeRangeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timeRangeChip: {
    marginRight: 8,
  },
  card: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  quickActionButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  metricItem: {
    width: width / 2 - 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.onSurface,
    opacity: 0.7,
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  processingStatus: {
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  ocrConfidence: {
    marginTop: 8,
  },
  ocrLabel: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  ocrValue: {
    fontSize: 12,
    color: theme.colors.onSurface,
    textAlign: 'right',
    marginTop: 4,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typeName: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  documentItem: {
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  documentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  documentMeta: {
    fontSize: 12,
    color: theme.colors.onSurface,
    opacity: 0.7,
    marginTop: 2,
  },
  documentStatus: {
    marginLeft: 8,
  },
  statusChipText: {
    fontSize: 10,
  },
  documentDivider: {
    marginHorizontal: 12,
  },
  alertItem: {
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  alertText: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  alertMessage: {
    fontSize: 12,
    color: theme.colors.onSurface,
    opacity: 0.8,
    marginTop: 2,
  },
  alertTime: {
    fontSize: 10,
    color: theme.colors.onSurface,
    opacity: 0.6,
    marginTop: 4,
  },
  alertDivider: {
    marginHorizontal: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  emptyMessage: {
    textAlign: 'center',
    marginBottom: 20,
    color: theme.colors.onSurface,
    opacity: 0.7,
  },
  emptyActionButton: {
    marginTop: 8,
  },
});

export default ClinicalRecordsDashboardScreen;