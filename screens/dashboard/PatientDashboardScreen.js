/**
 * Mobile Patient Dashboard Screen
 * 
 * Mobile-optimized dashboard screen for patients that displays existing patient dashboard data
 * with personal health records summary and mobile-specific UI components.
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
} from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useMobileDashboard } from '../../contexts/MobileDashboardContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DateUtils, UIUtils } from '../../utils/mobileUtils';

const { width } = Dimensions.get('window');

const PatientDashboardScreen = ({ navigation }) => {
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
      case 'view_records':
        navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList' 
        });
        break;
      case 'book_appointment':
        navigation.navigate('More', { 
          screen: 'Appointments',
          params: { action: 'book' }
        });
        break;
      case 'view_test_results':
        navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { filter: 'lab_report' }
        });
        break;
      case 'view_prescriptions':
        navigation.navigate('More', { 
          screen: 'MedicalHistory' 
        });
        break;
      case 'share_records':
        navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { action: 'share' }
        });
        break;
      default:
        Alert.alert('Action', `${action.title} feature coming soon!`);
    }
  };

  const renderHeader = () => (
    <Appbar.Header style={{ backgroundColor: colors.primary }}>
      <Appbar.Content
        title="My Health Dashboard"
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

  const renderPatientMetrics = () => {
    if (!dashboardData) return null;

    const metricsData = [
      {
        title: 'My Records',
        value: clinicalRecordsSummary?.summary?.total_records || 0,
        icon: 'folder',
        color: colors.primary,
        onPress: () => navigation.navigate('ClinicalRecords'),
      },
      {
        title: 'Appointments',
        value: dashboardData.appointments?.total || 0,
        icon: 'calendar-today',
        color: colors.secondary,
        onPress: () => navigation.navigate('More', { screen: 'Appointments' }),
      },
      {
        title: 'Test Results',
        value: clinicalRecordsSummary?.records_by_type?.find(r => r.record_type === 'lab_report')?.count || 0,
        icon: 'science',
        color: colors.tertiary,
        onPress: () => navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { filter: 'lab_report' }
        }),
      },
      {
        title: 'Recent Updates',
        value: clinicalRecordsSummary?.summary?.recent_records || 0,
        icon: 'update',
        color: colors.success,
        onPress: () => navigation.navigate('ClinicalRecords'),
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
                View
              </Button>
            </Card.Content>
          </Surface>
        ))}
      </View>
    );
  };

  const renderHealthSummary = () => {
    if (!clinicalRecordsSummary) return null;

    const summary = clinicalRecordsSummary.summary;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="My Health Records Summary"
          left={(props) => <MaterialCommunityIcons {...props} name="heart-pulse" />}
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
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Title>{summary.total_records || 0}</Title>
              <Paragraph>Total Records</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Title>{summary.recent_records || 0}</Title>
              <Paragraph>Recent Updates</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Title>{summary.total_documents || 0}</Title>
              <Paragraph>Documents</Paragraph>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Health Progress Indicators */}
          <View style={styles.healthProgress}>
            <Paragraph style={styles.progressLabel}>Health Record Completeness</Paragraph>
            <ProgressBar 
              progress={Math.min((summary.total_records || 0) / 10, 1)} 
              color={colors.success}
              style={styles.progressBar}
            />
            <Paragraph style={styles.progressText}>
              {Math.round(Math.min((summary.total_records || 0) / 10, 1) * 100)}% Complete
            </Paragraph>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderQuickActions = () => {
    const patientQuickActions = [
      {
        title: 'View My Records',
        icon: 'folder',
        type: 'view_records',
        count: clinicalRecordsSummary?.summary?.total_records || 0,
      },
      {
        title: 'Book Appointment',
        icon: 'calendar-plus',
        type: 'book_appointment',
      },
      {
        title: 'Test Results',
        icon: 'science',
        type: 'view_test_results',
        count: clinicalRecordsSummary?.records_by_type?.find(r => r.record_type === 'lab_report')?.count || 0,
      },
      {
        title: 'Medical History',
        icon: 'history',
        type: 'view_prescriptions',
      },
      {
        title: 'Share Records',
        icon: 'share',
        type: 'share_records',
      },
      {
        title: 'Health Trends',
        icon: 'trending-up',
        type: 'view_trends',
      },
    ];

    return (
      <Card style={styles.card}>
        <Card.Title title="Quick Actions" />
        <Card.Content>
          <View style={styles.quickActionsContainer}>
            {patientQuickActions.map((action, index) => (
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

  const renderRecentDocuments = () => {
    if (!recentDocuments || recentDocuments.length === 0) return null;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="My Recent Documents" 
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
                    {doc.record?.title} • {DateUtils.formatDate(doc.created_at, 'relative')} • {doc.size_mb} MB
                  </Paragraph>
                </View>
              </View>
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
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderUpcomingAppointments = () => {
    if (!dashboardData?.appointments?.upcoming) return null;

    const upcomingAppointments = dashboardData.appointments.upcoming;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="Upcoming Appointments"
          right={(props) => (
            <Button
              {...props}
              onPress={() => navigation.navigate('More', { screen: 'Appointments' })}
            >
              View All
            </Button>
          )}
        />
        <Card.Content>
          {upcomingAppointments.slice(0, 3).map((appointment, index) => (
            <View key={index} style={styles.appointmentItem}>
              <View style={styles.appointmentInfo}>
                <Title style={styles.appointmentDoctor}>
                  Dr. {appointment.doctor_name}
                </Title>
                <Paragraph style={styles.appointmentTime}>
                  {DateUtils.formatDate(appointment.appointment_date, 'datetime')}
                </Paragraph>
                {appointment.reason && (
                  <Paragraph style={styles.appointmentReason}>
                    {appointment.reason}
                  </Paragraph>
                )}
              </View>
              <Chip
                mode="outlined"
                style={styles.appointmentStatus}
              >
                {appointment.status}
              </Chip>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderHealthTrends = () => {
    if (!dashboardData?.health_analytics) return null;

    const healthData = dashboardData.health_analytics;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="Health Trends"
          left={(props) => <MaterialCommunityIcons {...props} name="chart-line" />}
        />
        <Card.Content>
          <View style={styles.trendsContainer}>
            <View style={styles.trendItem}>
              <MaterialIcons name="favorite" size={20} color={colors.error} />
              <View style={styles.trendDetails}>
                <Paragraph style={styles.trendLabel}>Heart Rate</Paragraph>
                <Title style={styles.trendValue}>72 BPM</Title>
                <Paragraph style={styles.trendChange}>+2 from last week</Paragraph>
              </View>
            </View>
            
            <View style={styles.trendItem}>
              <MaterialIcons name="monitor-weight" size={20} color={colors.primary} />
              <View style={styles.trendDetails}>
                <Paragraph style={styles.trendLabel}>Weight</Paragraph>
                <Title style={styles.trendValue}>70 kg</Title>
                <Paragraph style={styles.trendChange}>-1 kg from last month</Paragraph>
              </View>
            </View>
            
            <View style={styles.trendItem}>
              <MaterialIcons name="thermostat" size={20} color={colors.warning} />
              <View style={styles.trendDetails}>
                <Paragraph style={styles.trendLabel}>Blood Pressure</Paragraph>
                <Title style={styles.trendValue}>120/80</Title>
                <Paragraph style={styles.trendChange}>Normal range</Paragraph>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderAlerts = () => {
    if (!alerts || alerts.length === 0) return null;

    return (
      <Card style={styles.card}>
        <Card.Title title="Health Alerts" />
        <Card.Content>
          {alerts.slice(0, 3).map((alert, index) => (
            <View key={index} style={styles.alertItem}>
              <MaterialIcons
                name="info"
                size={20}
                color={colors.info}
              />
              <View style={styles.alertContent}>
                <Paragraph style={styles.alertMessage}>
                  {alert.message}
                </Paragraph>
                <Paragraph style={styles.alertTime}>
                  {DateUtils.formatDate(alert.created_at, 'relative')}
                </Paragraph>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
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
        <Paragraph style={styles.loadingText}>Loading your health dashboard...</Paragraph>
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
        {renderPatientMetrics()}
        {renderHealthSummary()}
        {renderQuickActions()}
        {renderRecentDocuments()}
        {renderUpcomingAppointments()}
        {renderHealthTrends()}
        {renderAlerts()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <FAB
        style={[styles.fab, { backgroundColor: colors.primary }]}
        icon="calendar-plus"
        onPress={() => navigation.navigate('More', { 
          screen: 'Appointments',
          params: { action: 'book' }
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
  healthProgress: {
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
  statusChip: {
    height: 24,
  },
  statusChipText: {
    fontSize: 10,
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentDoctor: {
    fontSize: 16,
    fontWeight: '500',
    margin: 0,
  },
  appointmentTime: {
    fontSize: 12,
    opacity: 0.6,
    margin: 0,
  },
  appointmentReason: {
    fontSize: 12,
    opacity: 0.8,
    margin: 0,
    marginTop: 4,
  },
  appointmentStatus: {
    height: 24,
  },
  trendsContainer: {
    gap: 16,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  trendDetails: {
    marginLeft: 12,
    flex: 1,
  },
  trendLabel: {
    fontSize: 12,
    opacity: 0.7,
    margin: 0,
  },
  trendValue: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 0,
  },
  trendChange: {
    fontSize: 12,
    opacity: 0.6,
    margin: 0,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  alertContent: {
    marginLeft: 12,
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    margin: 0,
  },
  alertTime: {
    fontSize: 12,
    opacity: 0.6,
    margin: 0,
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

export default PatientDashboardScreen;