/**
 * Mobile Dashboard Screen
 * 
 * Main dashboard screen for mobile app with role-based content,
 * real-time updates, and mobile-optimized UI.
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
} from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useMobileDashboard } from '../../contexts/MobileDashboardContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DateUtils, UIUtils } from '../../utils/mobileUtils';

const { width } = Dimensions.get('window');

const MobileDashboardScreen = ({ navigation }) => {
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
      case 'add_record':
        navigation.navigate('ClinicalRecords', { 
          screen: 'DocumentUpload' 
        });
        break;
      case 'view_appointments':
        navigation.navigate('More', { 
          screen: 'Appointments' 
        });
        break;
      case 'view_prescriptions':
        navigation.navigate('More', { 
          screen: 'PrescriptionList' 
        });
        break;
      case 'view_patients':
        navigation.navigate('More', { 
          screen: 'PatientList' 
        });
        break;
      default:
        Alert.alert('Action', `${action.title} feature coming soon!`);
    }
  };

  const renderHeader = () => (
    <Appbar.Header style={{ backgroundColor: colors.primary }}>
      <Appbar.Content
        title={`${user?.role || 'User'} Dashboard`}
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

  const renderSummaryCards = () => {
    if (!dashboardData) return null;

    const summaryData = [
      {
        title: 'Today\'s Appointments',
        value: dashboardData.appointments_today || 0,
        icon: 'calendar-today',
        color: colors.primary,
      },
      {
        title: 'Pending Records',
        value: dashboardData.pending_records || 0,
        icon: 'folder-open',
        color: colors.secondary,
      },
      {
        title: 'New Notifications',
        value: unreadCount,
        icon: 'notifications',
        color: colors.tertiary,
      },
      {
        title: 'Active Alerts',
        value: alerts.length,
        icon: 'warning',
        color: colors.error,
      },
    ];

    return (
      <View style={styles.summaryContainer}>
        {summaryData.map((item, index) => (
          <Card key={index} style={[styles.summaryCard, { borderLeftColor: item.color }]}>
            <Card.Content style={styles.summaryCardContent}>
              <View style={styles.summaryCardHeader}>
                <MaterialIcons name={item.icon} size={24} color={item.color} />
                <Title style={[styles.summaryValue, { color: item.color }]}>
                  {item.value}
                </Title>
              </View>
              <Paragraph style={styles.summaryTitle}>{item.title}</Paragraph>
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  };

  const renderQuickActions = () => {
    if (!quickActions || quickActions.length === 0) return null;

    return (
      <Card style={styles.card}>
        <Card.Title title="Quick Actions" />
        <Card.Content>
          <View style={styles.quickActionsContainer}>
            {quickActions.slice(0, 6).map((action, index) => (
              <Button
                key={index}
                mode="outlined"
                onPress={() => handleQuickAction(action)}
                style={styles.quickActionButton}
                contentStyle={styles.quickActionContent}
                labelStyle={styles.quickActionLabel}
              >
                {action.title}
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
          title="Recent Documents" 
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
          {recentDocuments.slice(0, 3).map((doc, index) => (
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
                    {DateUtils.formatDate(doc.created_at, 'relative')} • {doc.size_mb} MB
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

  const renderClinicalRecordsSummary = () => {
    if (!clinicalRecordsSummary) return null;

    return (
      <Card style={styles.card}>
        <Card.Title 
          title="Clinical Records Summary"
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
              <Title>{clinicalRecordsSummary.total_records || 0}</Title>
              <Paragraph>Total Records</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Title>{clinicalRecordsSummary.pending_review || 0}</Title>
              <Paragraph>Pending Review</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Title>{clinicalRecordsSummary.processed_today || 0}</Title>
              <Paragraph>Processed Today</Paragraph>
            </View>
          </View>
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
        <Paragraph style={styles.loadingText}>Loading dashboard...</Paragraph>
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
        {renderSummaryCards()}
        {renderQuickActions()}
        {renderClinicalRecordsSummary()}
        {renderRecentDocuments()}
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
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  summaryCard: {
    width: (width - 40) / 2,
    borderLeftWidth: 4,
    elevation: 2,
  },
  summaryCardContent: {
    paddingVertical: 12,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 0,
  },
  summaryTitle: {
    fontSize: 12,
    opacity: 0.7,
    margin: 0,
  },
  card: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
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

export default MobileDashboardScreen;