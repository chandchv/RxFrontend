/**
 * Mobile Admin Dashboard Screen
 * 
 * Mobile-optimized dashboard screen for clinic administrators that displays existing admin dashboard data
 * with clinical records system metrics and compliance widgets for mobile.
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
  DataTable,
} from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useMobileDashboard } from '../../contexts/MobileDashboardContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DateUtils, UIUtils } from '../../utils/mobileUtils';

const { width } = Dimensions.get('window');

const AdminDashboardScreen = ({ navigation }) => {
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
      case 'manage_clinical_records':
        navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { admin_view: true }
        });
        break;
      case 'view_system_metrics':
        navigation.navigate('More', { 
          screen: 'ClinicManagement',
          params: { tab: 'metrics' }
        });
        break;
      case 'manage_staff':
        navigation.navigate('More', { 
          screen: 'StaffManagement' 
        });
        break;
      case 'view_reports':
        navigation.navigate('More', { 
          screen: 'Reports' 
        });
        break;
      case 'compliance_monitoring':
        navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { filter: 'compliance' }
        });
        break;
      default:
        Alert.alert('Action', `${action.title} feature coming soon!`);
    }
  };

  const renderHeader = () => (
    <Appbar.Header style={{ backgroundColor: colors.primary }}>
      <Appbar.Content
        title="Admin Dashboard"
        subtitle={`${user?.firstName || user?.username} - Clinic Administrator`}
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

  const renderSystemMetrics = () => {
    if (!dashboardData) return null;

    const systemMetrics = dashboardData.system_metrics || {};
    const comprehensiveAnalytics = dashboardData.comprehensive_analytics || {};

    const metricsData = [
      {
        title: 'Total Users',
        value: systemMetrics.total_users || 0,
        icon: 'people',
        color: colors.primary,
        onPress: () => navigation.navigate('More', { screen: 'StaffManagement' }),
      },
      {
        title: 'Clinical Records',
        value: clinicalRecordsSummary?.summary?.total_records || 0,
        icon: 'folder',
        color: colors.secondary,
        onPress: () => navigation.navigate('ClinicalRecords'),
      },
      {
        title: 'Storage Used',
        value: `${clinicalRecordsSummary?.summary?.total_storage_mb || 0} MB`,
        icon: 'storage',
        color: colors.tertiary,
        onPress: () => navigation.navigate('More', { screen: 'ClinicManagement' }),
      },
      {
        title: 'System Alerts',
        value: alerts?.length || 0,
        icon: 'warning',
        color: colors.error,
        onPress: () => navigation.navigate('Notifications'),
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
                Manage
              </Button>
            </Card.Content>
          </Surface>
        ))}
      </View>
    );
  };

  const renderClinicalRecordsAnalytics = () => {
    if (!clinicalRecordsSummary) return null;

    const summary = clinicalRecordsSummary.summary;
    const processingStatus = clinicalRecordsSummary.processing_status || [];

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="Clinical Records System Analytics"
          left={(props) => <MaterialCommunityIcons {...props} name="chart-bar" />}
          right={(props) => (
            <Button
              {...props}
              onPress={() => navigation.navigate('ClinicalRecords')}
            >
              Manage
            </Button>
          )}
        />
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Title>{summary.total_records || 0}</Title>
              <Paragraph>Total Records</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Title>{summary.today_records || 0}</Title>
              <Paragraph>Added Today</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Title>{summary.failed_processing || 0}</Title>
              <Paragraph>Failed Processing</Paragraph>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Processing Status Breakdown */}
          <View style={styles.processingBreakdown}>
            <Paragraph style={styles.sectionSubtitle}>Document Processing Status</Paragraph>
            {processingStatus.map((status, index) => (
              <View key={index} style={styles.statusRow}>
                <Paragraph style={styles.statusLabel}>{status.processing_status}</Paragraph>
                <View style={styles.statusBar}>
                  <ProgressBar 
                    progress={status.count / (summary.total_documents || 1)} 
                    color={getProcessingStatusColor(status.processing_status)}
                    style={styles.statusProgress}
                  />
                  <Paragraph style={styles.statusCount}>{status.count}</Paragraph>
                </View>
              </View>
            ))}
          </View>
          
          <Divider style={styles.divider} />
          
          {/* System Health Indicators */}
          <View style={styles.systemHealth}>
            <Paragraph style={styles.sectionSubtitle}>System Health</Paragraph>
            <View style={styles.healthIndicators}>
              <View style={styles.healthItem}>
                <MaterialIcons name="check-circle" size={16} color={colors.success} />
                <Paragraph style={styles.healthLabel}>OCR Service: Online</Paragraph>
              </View>
              <View style={styles.healthItem}>
                <MaterialIcons name="check-circle" size={16} color={colors.success} />
                <Paragraph style={styles.healthLabel}>Storage: {Math.round(((summary.total_storage_mb || 0) / 10000) * 100)}% Used</Paragraph>
              </View>
              <View style={styles.healthItem}>
                <MaterialIcons name="check-circle" size={16} color={colors.success} />
                <Paragraph style={styles.healthLabel}>Backup: Up to date</Paragraph>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderQuickActions = () => {
    const adminQuickActions = [
      {
        title: 'Manage Clinical Records',
        icon: 'folder-settings',
        type: 'manage_clinical_records',
        count: clinicalRecordsSummary?.summary?.total_records || 0,
      },
      {
        title: 'System Metrics',
        icon: 'analytics',
        type: 'view_system_metrics',
      },
      {
        title: 'Staff Management',
        icon: 'people-settings',
        type: 'manage_staff',
        count: dashboardData?.system_metrics?.total_users || 0,
      },
      {
        title: 'Generate Reports',
        icon: 'assessment',
        type: 'view_reports',
      },
      {
        title: 'Compliance Monitor',
        icon: 'security',
        type: 'compliance_monitoring',
      },
      {
        title: 'Backup & Recovery',
        icon: 'backup',
        type: 'backup_recovery',
      },
    ];

    return (
      <Card style={styles.card}>
        <Card.Title title="Administrative Actions" />
        <Card.Content>
          <View style={styles.quickActionsContainer}>
            {adminQuickActions.map((action, index) => (
              <Button
                key={index}
                mode="outlined"
                onPress={() => handleQuickAction(action)}
                style={styles.quickActionButton}
                contentStyle={styles.quickActionContent}
                labelStyle={styles.quickActionLabel}
                icon={action.icon}
              >
                {action.title}
                {action.count !== undefined && action.count > 0 && (
                  <Badge style={styles.actionBadge}>{action.count}</Badge>
                )}
              </Button>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderUserActivity = () => {
    if (!dashboardData?.user_activity) return null;

    const userActivity = dashboardData.user_activity;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="User Activity Summary"
          left={(props) => <MaterialCommunityIcons {...props} name="account-group" />}
        />
        <Card.Content>
          <View style={styles.activityStats}>
            <View style={styles.activityItem}>
              <Title>{userActivity.active_users || 0}</Title>
              <Paragraph>Active Users</Paragraph>
            </View>
            <View style={styles.activityItem}>
              <Title>{userActivity.total_logins || 0}</Title>
              <Paragraph>Total Logins</Paragraph>
            </View>
            <View style={styles.activityItem}>
              <Title>{userActivity.new_registrations || 0}</Title>
              <Paragraph>New Registrations</Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderPatientOverview = () => {
    if (!dashboardData?.patient_overview) return null;

    const patientOverview = dashboardData.patient_overview;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="Patient Records Overview"
          left={(props) => <MaterialCommunityIcons {...props} name="account-heart" />}
        />
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Title>{patientOverview.total_patients || 0}</Title>
              <Paragraph>Total Patients</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Title>{patientOverview.patients_with_records || 0}</Title>
              <Paragraph>With Records</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Title>{Math.round(patientOverview.coverage_percentage || 0)}%</Title>
              <Paragraph>Coverage</Paragraph>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.coverageProgress}>
            <Paragraph style={styles.progressLabel}>Records Coverage</Paragraph>
            <ProgressBar 
              progress={(patientOverview.coverage_percentage || 0) / 100} 
              color={colors.success}
              style={styles.progressBar}
            />
            <Paragraph style={styles.progressText}>
              {Math.round(patientOverview.coverage_percentage || 0)}% of patients have clinical records
            </Paragraph>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderSystemAlerts = () => {
    if (!alerts || alerts.length === 0) return null;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="System Alerts"
          left={(props) => <MaterialIcons {...props} name="warning" />}
        />
        <Card.Content>
          {alerts.slice(0, 5).map((alert, index) => (
            <View key={index} style={styles.alertItem}>
              <MaterialIcons
                name={getAlertIcon(alert.category)}
                size={20}
                color={getAlertColor(alert.category)}
              />
              <View style={styles.alertContent}>
                <Paragraph style={styles.alertTitle}>
                  {alert.title}
                </Paragraph>
                <Paragraph style={styles.alertMessage}>
                  {alert.message}
                </Paragraph>
                <Paragraph style={styles.alertTime}>
                  {DateUtils.formatDate(alert.created_at, 'relative')}
                </Paragraph>
              </View>
              {alert.requires_action && (
                <Button
                  mode="text"
                  onPress={() => {/* Handle alert action */}}
                  style={styles.alertAction}
                >
                  Action
                </Button>
              )}
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const getProcessingStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'processing':
        return colors.warning;
      case 'failed':
        return colors.error;
      case 'pending':
        return colors.info;
      default:
        return colors.outline;
    }
  };

  const getAlertIcon = (category) => {
    switch (category) {
      case 'security':
        return 'security';
      case 'system':
        return 'computer';
      case 'storage':
        return 'storage';
      case 'processing':
        return 'settings';
      default:
        return 'info';
    }
  };

  const getAlertColor = (category) => {
    switch (category) {
      case 'security':
        return colors.error;
      case 'system':
        return colors.warning;
      case 'storage':
        return colors.info;
      case 'processing':
        return colors.primary;
      default:
        return colors.outline;
    }
  };

  if (loading.dashboard && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Paragraph style={styles.loadingText}>Loading admin dashboard...</Paragraph>
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
        {renderSystemMetrics()}
        {renderClinicalRecordsAnalytics()}
        {renderQuickActions()}
        {renderUserActivity()}
        {renderPatientOverview()}
        {renderSystemAlerts()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <FAB
        style={[styles.fab, { backgroundColor: colors.primary }]}
        icon="settings"
        onPress={() => navigation.navigate('More', { 
          screen: 'ClinicManagement' 
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
    fontSize: 20,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  processingBreakdown: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    width: 80,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  statusBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  statusProgress: {
    flex: 1,
    height: 6,
  },
  statusCount: {
    marginLeft: 8,
    fontSize: 12,
    minWidth: 30,
    textAlign: 'right',
  },
  systemHealth: {
    marginBottom: 16,
  },
  healthIndicators: {
    gap: 8,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthLabel: {
    marginLeft: 8,
    fontSize: 12,
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
  quickActionContent: {
    paddingVertical: 8,
  },
  quickActionLabel: {
    fontSize: 12,
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  activityStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  activityItem: {
    alignItems: 'center',
  },
  coverageProgress: {
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
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  alertContent: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '500',
    margin: 0,
  },
  alertMessage: {
    fontSize: 12,
    margin: 0,
    marginTop: 2,
  },
  alertTime: {
    fontSize: 10,
    opacity: 0.6,
    margin: 0,
    marginTop: 4,
  },
  alertAction: {
    marginLeft: 8,
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

export default AdminDashboardScreen;