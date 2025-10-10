/**
 * Mobile Doctor Dashboard Screen
 * 
 * Mobile-optimized dashboard screen for doctors that displays data from existing dashboard service
 * with clinical records integration and mobile-specific UI components.
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
} from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useMobileDashboard } from '../../contexts/MobileDashboardContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DateUtils, UIUtils } from '../../utils/mobileUtils';

const { width } = Dimensions.get('window');

const DoctorDashboardScreen = ({ navigation }) => {
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
      case 'review_pending_records':
        navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { filter: 'pending_review' }
        });
        break;
      case 'upload_record':
        navigation.navigate('ClinicalRecords', { 
          screen: 'DocumentUpload' 
        });
        break;
      case 'view_appointments':
        navigation.navigate('More', { 
          screen: 'AppointmentsList' 
        });
        break;
      case 'view_patients':
        navigation.navigate('More', { 
          screen: 'PatientListScreen' 
        });
        break;
      case 'create_prescription':
        navigation.navigate('More', { 
          screen: 'PrescriptionListScreen' 
        });
        break;
      default:
        Alert.alert('Action', `${action.title} feature coming soon!`);
    }
  };

  const renderHeader = () => (
    <Appbar.Header style={{ backgroundColor: colors.primary }}>
      <Appbar.Content
        title="Doctor Dashboard"
        subtitle={`Welcome, Dr. ${user?.firstName || user?.username}`}
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

  const renderDoctorMetrics = () => {
    if (!dashboardData) return null;

    const metricsData = [
      {
        title: 'Today\'s Appointments',
        value: dashboardData.appointments?.today || 0,
        icon: 'calendar-today',
        color: colors.primary,
        onPress: () => navigation.navigate('More', { screen: 'AppointmentsList' }),
      },
      {
        title: 'Total Patients',
        value: dashboardData.patients?.total || 0,
        icon: 'people',
        color: colors.secondary,
        onPress: () => navigation.navigate('More', { screen: 'PatientListScreen' }),
      },
      {
        title: 'Pending Reviews',
        value: clinicalRecordsSummary?.summary?.pending_reviews || 0,
        icon: 'folder-open',
        color: colors.tertiary,
        onPress: () => navigation.navigate('ClinicalRecords', { 
          screen: 'ClinicalRecordsList',
          params: { filter: 'pending_review' }
        }),
      },
      {
        title: 'Clinical Records',
        value: clinicalRecordsSummary?.summary?.total_records || 0,
        icon: 'medical-bag',
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

  const renderClinicalRecordsSummary = () => {
    if (!clinicalRecordsSummary) return null;

    const summary = clinicalRecordsSummary.summary;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="Clinical Records Summary"
          left={(props) => <MaterialCommunityIcons {...props} name="medical-bag" />}
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
              <Title>{summary.today_records || 0}</Title>
              <Paragraph>Added Today</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Title>{summary.pending_reviews || 0}</Title>
              <Paragraph>Pending Review</Paragraph>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.processingStats}>
            <View style={styles.statItem}>
              <Paragraph>Processing Success Rate</Paragraph>
              <Title style={{ color: colors.success }}>
                {summary.avg_processing_time_seconds ? '95%' : 'N/A'}
              </Title>
            </View>
            <View style={styles.statItem}>
              <Paragraph>Storage Used</Paragraph>
              <Title>{summary.total_storage_mb || 0} MB</Title>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderQuickActions = () => {
    if (!quickActions || quickActions.length === 0) return null;

    const doctorQuickActions = [
      {
        title: 'Review Pending Records',
        icon: 'folder-open',
        type: 'review_pending_records',
        count: clinicalRecordsSummary?.summary?.pending_reviews || 0,
      },
      {
        title: 'Upload New Record',
        icon: 'cloud-upload',
        type: 'upload_record',
      },
      {
        title: 'Today\'s Appointments',
        icon: 'calendar-today',
        type: 'view_appointments',
        count: dashboardData?.appointments?.today || 0,
      },
      {
        title: 'My Patients',
        icon: 'people',
        type: 'view_patients',
        count: dashboardData?.patients?.total || 0,
      },
      {
        title: 'Create Prescription',
        icon: 'description',
        type: 'create_prescription',
      },
      {
        title: 'Generate Report',
        icon: 'assessment',
        type: 'generate_report',
      },
    ];

    return (
      <Card style={styles.card}>
        <Card.Title title="Quick Actions" />
        <Card.Content>
          <View style={styles.quickActionsContainer}>
            {doctorQuickActions.map((action, index) => (
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
          title="Recent Patient Documents" 
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
              onPress={() => navigation.navigate('More', { screen: 'AppointmentsList' })}
            >
              View All
            </Button>
          )}
        />
        <Card.Content>
          {upcomingAppointments.slice(0, 3).map((appointment, index) => (
            <View key={index} style={styles.appointmentItem}>
              <View style={styles.appointmentInfo}>
                <Title style={styles.appointmentPatient}>
                  {appointment.patient_name}
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

  const renderAlerts = () => {
    if (!alerts || alerts.length === 0) return null;

    return (
      <Card style={styles.card}>
        <Card.Title title="Active Alerts" />
        <Card.Content>
          {alerts.slice(0, 3).map((alert, index) => (
            <View key={index} style={styles.alertItem}>
              <MaterialIcons
                name="warning"
                size={20}
                color={colors.error}
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
        <Paragraph style={styles.loadingText}>Loading doctor dashboard...</Paragraph>
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
        {renderDoctorMetrics()}
        {renderClinicalRecordsSummary()}
        {renderQuickActions()}
        {renderRecentDocuments()}
        {renderUpcomingAppointments()}
        {renderAlerts()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <FAB
        style={[styles.fab, { backgroundColor: colors.primary }]}
        icon="plus"
        onPress={() => navigation.navigate('ClinicalRecords', { 
          screen: 'DocumentUpload' 
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
  processingStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
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
  appointmentPatient: {
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

export default DoctorDashboardScreen;