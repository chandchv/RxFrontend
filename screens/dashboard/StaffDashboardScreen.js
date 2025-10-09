/**
 * Mobile Staff Dashboard Screen
 * 
 * Mobile-optimized dashboard screen for clinic staff that displays existing staff dashboard data
 * with clinical records processing tasks and document review queue for mobile.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Badge,
  ActivityIndicator,
  Appbar,
  FAB,
  Snackbar,
  Surface,
  Divider,
  ProgressBar,
  List,
} from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useMobileDashboard } from '../../contexts/MobileDashboardContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DateUtils, UIUtils } from '../../utils/mobileUtils';

const { width } = Dimensions.get('window');

const StaffDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const {
    dashboardData,
    clinicalRecordsSummary,
    recentDocuments,
    quickActions,
    alerts,
    loading,
    errors,
    refreshAll,
    clearError,
  } = useMobileDashboard();
  
  const { unreadCount, hasPermission } = useNotifications();
  const { colors } = useTheme();
  
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Initialize dashboard data
  useEffect(() => {
    if (user && !dashboardData) {
      loadDashboardData();
    }
  }, [user]);

  // Show errors as snackbar
  useEffect(() => {
    if (errors.dashboard) {
      setSnackbarMessage(errors.dashboard);
      setSnackbarVisible(true);
    }
  }, [errors.dashboard]);

  const loadDashboardData = async () => {
    try {
      // Dashboard data is loaded automatically by the context
    } catch (error) {
      console.error('Dashboard loading error:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } catch (error) {
      Alert.alert('Refresh Error', 'Failed to refresh dashboard data');
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll]);

  const handleQuickAction = (action) => {
    switch (action.type) {
      case 'process_failed_documents':
        navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { filter: 'failed_processing' }
        });
        break;
      case 'bulk_upload':
        navigation.navigate('ClinicalRecords', { 
          screen: 'DocumentUpload',
          params: { bulk_mode: true }
        });
        break;
      case 'patient_checkin':
        navigation.navigate('More', { 
          screen: 'Appointments',
          params: { action: 'checkin' }
        });
        break;
      case 'review_pending':
        navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { filter: 'pending_review' }
        });
        break;
      case 'manage_queue':
        navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { view: 'processing_queue' }
        });
        break;
      default:
        Alert.alert('Action', `${action.title} feature coming soon!`);
    }
  };

  const renderHeader = () => (
    <Appbar.Header style={{ backgroundColor: colors.primary }}>
      <Appbar.Content
        title="Staff Dashboard"
        subtitle={`Welcome, ${user?.firstName || user?.username}`}
        titleStyle={{ color: colors.onPrimary }}
        subtitleStyle={{ color: colors.onPrimary }}
      />
      <Appbar.Action
        icon="bell"
        iconColor={colors.onPrimary}
        onPress={() => navigation.navigate('Notifications')}
      />
      {unreadCount > 0 && (
        <Badge
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: colors.error,
          }}
          size={16}
        >
          {unreadCount}
        </Badge>
      )}
    </Appbar.Header>
  );

  const renderProcessingMetrics = () => {
    if (!dashboardData?.processing_metrics) return null;

    const processingMetrics = dashboardData.processing_metrics;

    const metricsData = [
      {
        title: 'Pending Processing',
        value: processingMetrics.pending || 0,
        icon: 'hourglass-empty',
        color: colors.warning,
        onPress: () => navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { filter: 'pending' }
        }),
      },
      {
        title: 'Failed Processing',
        value: processingMetrics.failed || 0,
        icon: 'error',
        color: colors.error,
        onPress: () => navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { filter: 'failed_processing' }
        }),
      },
      {
        title: 'Completed Today',
        value: processingMetrics.completed_today || 0,
        icon: 'check-circle',
        color: colors.success,
        onPress: () => navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { filter: 'completed_today' }
        }),
      },
      {
        title: 'Manual Reviews',
        value: clinicalRecordsSummary?.summary?.pending_reviews || 0,
        icon: 'rate-review',
        color: colors.info,
        onPress: () => navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { filter: 'pending_review' }
        }),
      },
    ];

    return (
      <View style={styles.metricsContainer}>
        {metricsData.map((item, index) => (
          <Surface key={index} style={[styles.metricCard, { borderLeftColor: item.color }]}>
            <Card.Content style={styles.metricCardContent}>
              <View style={styles.metricCardHeader}>
                <MaterialIcons name={item.icon} size={24} color={item.color} />
                <Title style={[styles.metricValue, { color: item.color }]}>
                  {item.value}
                </Title>
              </View>
              <Paragraph style={styles.metricTitle}>{item.title}</Paragraph>
              <Button
                mode="text"
                onPress={item.onPress}
                style={styles.metricButton}
                labelStyle={styles.metricButtonLabel}
              >
                Process
              </Button>
            </Card.Content>
          </Surface>
        ))}
      </View>
    );
  };

  const renderProcessingQueue = () => {
    if (!dashboardData?.processing_metrics) return null;

    const processingMetrics = dashboardData.processing_metrics;
    const total = (processingMetrics.pending || 0) + (processingMetrics.processing || 0) + 
                  (processingMetrics.failed || 0) + (processingMetrics.completed_today || 0);

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="Document Processing Queue"
          left={(props) => <MaterialCommunityIcons {...props} name="file-cog" />}
          right={(props) => (
            <Button
              {...props}
              onPress={() => navigation.navigate('ClinicalRecords', { 
                screen: 'ClinicalRecordsList',
                params: { view: 'processing_queue' }
              })}
            >
              Manage
            </Button>
          )}
        />
        <Card.Content>
          <View style={styles.queueStats}>
            <View style={styles.queueItem}>
              <Title>{processingMetrics.pending || 0}</Title>
              <Paragraph>Pending</Paragraph>
              <Chip 
                mode="outlined" 
                style={[styles.queueChip, { backgroundColor: colors.warning + '20' }]}
              >
                Queue
              </Chip>
            </View>
            <View style={styles.queueItem}>
              <Title>{processingMetrics.processing || 0}</Title>
              <Paragraph>Processing</Paragraph>
              <Chip 
                mode="outlined" 
                style={[styles.queueChip, { backgroundColor: colors.info + '20' }]}
              >
                Active
              </Chip>
            </View>
            <View style={styles.queueItem}>
              <Title>{processingMetrics.failed || 0}</Title>
              <Paragraph>Failed</Paragraph>
              <Chip 
                mode="outlined" 
                style={[styles.queueChip, { backgroundColor: colors.error + '20' }]}
              >
                Needs Attention
              </Chip>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Processing Progress */}
          <View style={styles.processingProgress}>
            <Paragraph style={styles.progressLabel}>Today's Processing Progress</Paragraph>
            <ProgressBar 
              progress={total > 0 ? (processingMetrics.completed_today || 0) / total : 0} 
              color={colors.success}
              style={styles.progressBar}
            />
            <Paragraph style={styles.progressText}>
              {processingMetrics.completed_today || 0} of {total} documents processed today
            </Paragraph>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderQuickActions = () => {
    const staffQuickActions = [
      {
        title: 'Process Failed Documents',
        icon: 'error-outline',
        type: 'process_failed_documents',
        count: dashboardData?.processing_metrics?.failed || 0,
        priority: 'high',
      },
      {
        title: 'Bulk Upload Documents',
        icon: 'cloud-upload',
        type: 'bulk_upload',
        priority: 'medium',
      },
      {
        title: 'Patient Check-in',
        icon: 'person-add',
        type: 'patient_checkin',
        priority: 'medium',
      },
      {
        title: 'Review Pending Records',
        icon: 'rate-review',
        type: 'review_pending',
        count: clinicalRecordsSummary?.summary?.pending_reviews || 0,
        priority: 'medium',
      },
      {
        title: 'Manage Processing Queue',
        icon: 'queue',
        type: 'manage_queue',
        priority: 'low',
      },
      {
        title: 'Generate Reports',
        icon: 'assessment',
        type: 'generate_reports',
        priority: 'low',
      },
    ];

    return (
      <Card style={styles.card}>
        <Card.Title title="Staff Actions" />
        <Card.Content>
          <View style={styles.quickActionsContainer}>
            {staffQuickActions.map((action, index) => (
              <Button
                key={index}
                mode="outlined"
                onPress={() => handleQuickAction(action)}
                style={[
                  styles.quickActionButton,
                  action.priority === 'high' && styles.highPriorityAction
                ]}
                contentStyle={styles.quickActionContent}
                labelStyle={[
                  styles.quickActionLabel,
                  action.priority === 'high' && styles.highPriorityLabel
                ]}
                icon={action.icon}
              >
                {action.title}
                {action.count !== undefined && action.count > 0 && (
                  <Badge style={[
                    styles.actionBadge,
                    action.priority === 'high' && { backgroundColor: colors.error }
                  ]}>
                    {action.count}
                  </Badge>
                )}
              </Button>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderDailyTasks = () => {
    if (!dashboardData?.daily_tasks) return null;

    const dailyTasks = dashboardData.daily_tasks;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="Today's Tasks"
          left={(props) => <MaterialCommunityIcons {...props} name="clipboard-check" />}
        />
        <Card.Content>
          {dailyTasks.map((task, index) => (
            <List.Item
              key={index}
              title={task.task}
              description={`${task.count} items`}
              left={(props) => (
                <MaterialIcons 
                  {...props} 
                  name={getTaskIcon(task.priority)} 
                  color={getTaskColor(task.priority)}
                />
              )}
              right={(props) => (
                <Chip 
                  {...props}
                  mode="outlined"
                  style={[
                    styles.taskPriorityChip,
                    { backgroundColor: getTaskColor(task.priority) + '20' }
                  ]}
                >
                  {task.priority}
                </Chip>
              )}
              style={styles.taskItem}
            />
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderRecentDocuments = () => {
    if (!recentDocuments || recentDocuments.length === 0) return null;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="Recent Document Activity" 
          right={(props) => (
            <Button
              {...props}
              onPress={() => navigation.navigate('ClinicalRecords')}
            >
              View All
            </Button>
          )}
        />
        <Card.Content>
          {recentDocuments.slice(0, 5).map((doc, index) => (
            <View key={index} style={styles.documentItem}>
              <View style={styles.documentInfo}>
                <MaterialCommunityIcons
                  name={getDocumentIcon(doc.type)}
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.documentDetails}>
                  <Paragraph style={styles.documentName}>
                    {doc.filename}
                  </Paragraph>
                  <Paragraph style={styles.documentMeta}>
                    {doc.patient?.name} • {DateUtils.formatDate(doc.created_at, 'relative')} • {doc.size_mb} MB
                  </Paragraph>
                </View>
              </View>
              <View style={styles.documentActions}>
                <Chip
                  mode="outlined"
                  textStyle={styles.statusChipText}
                  style={[
                    styles.statusChip,
                    { backgroundColor: getStatusColor(doc.status) }
                  ]}
                >
                  {doc.status}
                </Chip>
                {doc.status === 'failed' && (
                  <Button
                    mode="text"
                    onPress={() => {/* Handle retry */}}
                    style={styles.retryButton}
                  >
                    Retry
                  </Button>
                )}
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderOCRAnalytics = () => {
    if (!dashboardData?.ocr_analytics) return null;

    const ocrAnalytics = dashboardData.ocr_analytics;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="OCR Processing Analytics"
          left={(props) => <MaterialCommunityIcons {...props} name="text-recognition" />}
        />
        <Card.Content>
          <View style={styles.ocrStats}>
            <View style={styles.ocrItem}>
              <Title>{Math.round(ocrAnalytics.avg_confidence || 0)}%</Title>
              <Paragraph>Avg Confidence</Paragraph>
            </View>
            <View style={styles.ocrItem}>
              <Title>{ocrAnalytics.documents_processed || 0}</Title>
              <Paragraph>Processed Today</Paragraph>
            </View>
            <View style={styles.ocrItem}>
              <Title>{Math.round(ocrAnalytics.success_rate || 0)}%</Title>
              <Paragraph>Success Rate</Paragraph>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.ocrProgress}>
            <Paragraph style={styles.progressLabel}>OCR Accuracy Trend</Paragraph>
            <ProgressBar 
              progress={(ocrAnalytics.avg_confidence || 0) / 100} 
              color={colors.success}
              style={styles.progressBar}
            />
            <Paragraph style={styles.progressText}>
              {Math.round(ocrAnalytics.avg_confidence || 0)}% average confidence this week
            </Paragraph>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderPatientQueue = () => {
    if (!dashboardData?.patient_queue) return null;

    const patientQueue = dashboardData.patient_queue;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="Patient Queue"
          left={(props) => <MaterialCommunityIcons {...props} name="account-clock" />}
        />
        <Card.Content>
          {patientQueue.slice(0, 3).map((patient, index) => (
            <List.Item
              key={index}
              title={patient.name}
              description={`Waiting for: ${patient.service}`}
              left={(props) => (
                <MaterialIcons {...props} name="person" color={colors.primary} />
              )}
              right={(props) => (
                <Paragraph {...props} style={styles.waitTime}>
                  {patient.wait_time}
                </Paragraph>
              )}
              style={styles.patientItem}
            />
          ))}
        </Card.Content>
      </Card>
    );
  };

  const getTaskIcon = (priority) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'remove';
      case 'low':
        return 'keyboard-arrow-down';
      default:
        return 'info';
    }
  };

  const getTaskColor = (priority) => {
    switch (priority) {
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.info;
      default:
        return colors.outline;
    }
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case 'pdf':
        return 'file-pdf-box';
      case 'image':
        return 'file-image';
      case 'dicom':
        return 'medical-bag';
      default:
        return 'file-document';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'processing':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.surface;
    }
  };

  if (loading.dashboard && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Paragraph style={styles.loadingText}>Loading staff dashboard...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {renderProcessingMetrics()}
        {renderProcessingQueue()}
        {renderQuickActions()}
        {renderDailyTasks()}
        {renderRecentDocuments()}
        {renderOCRAnalytics()}
        {renderPatientQueue()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <FAB
        style={[styles.fab, { backgroundColor: colors.primary }]}
        icon="upload"
        onPress={() => navigation.navigate('ClinicalRecords', { 
          screen: 'DocumentUpload',
          params: { bulk_mode: true }
        })}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => {
          setSnackbarVisible(false);
          clearError('dashboard');
        }}
        duration={4000}
        action={{
          label: 'Dismiss',
          onPress: () => {
            setSnackbarVisible(false);
            clearError('dashboard');
          },
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  metricCard: {
    width: (width - 40) / 2,
    borderLeftWidth: 4,
    elevation: 2,
  },
  metricCardContent: {
    paddingVertical: 12,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 0,
  },
  metricTitle: {
    fontSize: 12,
    opacity: 0.7,
    margin: 0,
  },
  metricButton: {
    marginTop: 8,
  },
  metricButtonLabel: {
    fontSize: 10,
  },
  card: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  queueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  queueItem: {
    alignItems: 'center',
  },
  queueChip: {
    marginTop: 4,
    height: 20,
  },
  divider: {
    marginVertical: 16,
  },
  processingProgress: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionButton: {
    minWidth: (width - 64) / 2,
    marginBottom: 8,
  },
  highPriorityAction: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  quickActionContent: {
    paddingVertical: 8,
  },
  quickActionLabel: {
    fontSize: 12,
  },
  highPriorityLabel: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  taskItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  taskPriorityChip: {
    height: 20,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    margin: 0,
  },
  documentMeta: {
    fontSize: 12,
    opacity: 0.6,
    margin: 0,
  },
  documentActions: {
    alignItems: 'center',
  },
  statusChip: {
    height: 24,
    marginBottom: 4,
  },
  statusChipText: {
    fontSize: 10,
  },
  retryButton: {
    marginTop: 4,
  },
  ocrStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  ocrItem: {
    alignItems: 'center',
  },
  ocrProgress: {
    alignItems: 'center',
  },
  patientItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  waitTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  bottomSpacing: {
    height: 80,
  },
});

export default StaffDashboardScreen;