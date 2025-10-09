/**
 * Mobile App Integration Component
 * Manages overall app integration, state synchronization, and cross-platform compatibility
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Alert, AppState, NetInfo } from 'react-native';
import { integrationService } from '../../services/integrationService';
import { performanceOptimizationService } from '../../services/performanceOptimizationService';
import { secureTokenService } from '../../services/secureTokenService';
import { auditLogService } from '../../services/auditLogService';
import { PerformanceMonitor } from '../common/PerformanceMonitor';
import { ConnectionManager } from '../common/ConnectionManager';
import { OfflineIndicator } from '../common/OfflineIndicator';
import { ConflictResolver } from '../common/ConflictResolver';

const MobileAppIntegration = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [conflicts, setConflicts] = useState([]);
  const [error, setError] = useState(null);
  
  const appStateRef = useRef(AppState.currentState);
  const initializationRef = useRef(false);

  /**
   * Initialize the mobile app integration
   */
  const initializeApp = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      console.log('Initializing Mobile App Integration...');
      
      // Initialize integration service
      await integrationService.initialize();
      
      // Set up event listeners
      setupEventListeners();
      
      // Initialize performance monitoring
      await performanceOptimizationService.initialize();
      
      // Check authentication status
      await checkAuthenticationStatus();
      
      // Set up network monitoring
      setupNetworkMonitoring();
      
      // Set up app state monitoring
      setupAppStateMonitoring();
      
      setIsInitialized(true);
      console.log('Mobile App Integration initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Mobile App Integration:', error);
      setError(error);
      
      // Show user-friendly error message
      Alert.alert(
        'Initialization Error',
        'Failed to initialize the app. Please restart the application.',
        [
          { text: 'Retry', onPress: () => retryInitialization() },
          { text: 'Exit', onPress: () => {} }
        ]
      );
    }
  }, []);

  /**
   * Retry initialization
   */
  const retryInitialization = useCallback(async () => {
    initializationRef.current = false;
    setError(null);
    setIsInitialized(false);
    await initializeApp();
  }, [initializeApp]);

  /**
   * Set up event listeners for integration service
   */
  const setupEventListeners = useCallback(() => {
    // Connection status changes
    integrationService.on('connection_status_changed', ({ newStatus }) => {
      setConnectionStatus(newStatus);
    });

    // Sync events
    integrationService.on('sync_started', () => {
      setSyncStatus('syncing');
    });

    integrationService.on('sync_completed', () => {
      setSyncStatus('completed');
      setTimeout(() => setSyncStatus('idle'), 2000);
    });

    integrationService.on('sync_failed', (error) => {
      setSyncStatus('failed');
      console.error('Sync failed:', error);
      
      Alert.alert(
        'Sync Failed',
        'Failed to synchronize data. Some changes may not be saved.',
        [{ text: 'OK' }]
      );
    });

    integrationService.on('sync_conflict', (conflict) => {
      setConflicts(prev => [...prev, conflict]);
    });

    // Performance metrics updates
    integrationService.on('performance_metrics_updated', (metrics) => {
      setPerformanceMetrics(metrics);
    });

    // Real-time data updates
    integrationService.on('dashboard_updated', (data) => {
      console.log('Dashboard data updated:', data);
    });

    integrationService.on('clinical_record_updated', (data) => {
      console.log('Clinical record updated:', data);
    });

    integrationService.on('appointment_updated', (data) => {
      console.log('Appointment updated:', data);
    });

    integrationService.on('prescription_updated', (data) => {
      console.log('Prescription updated:', data);
    });

    integrationService.on('notification_received', (notification) => {
      console.log('Notification received:', notification);
      // Handle notification display
      handleNotification(notification);
    });
  }, []);

  /**
   * Check authentication status
   */
  const checkAuthenticationStatus = useCallback(async () => {
    try {
      const isAuthenticated = await secureTokenService.isAuthenticated();
      
      if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to login...');
        // Handle authentication redirect
        return false;
      }
      
      // Validate token and refresh if needed
      await secureTokenService.validateAndRefreshToken();
      
      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  }, []);

  /**
   * Set up network monitoring
   */
  const setupNetworkMonitoring = useCallback(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const status = state.isConnected ? 'connected' : 'disconnected';
      integrationService.setConnectionStatus(status);
      
      console.log('Network status changed:', status);
      
      // Log network change event
      auditLogService.logEvent('network_status_changed', {
        status,
        type: state.type,
        isInternetReachable: state.isInternetReachable
      });
    });

    return unsubscribe;
  }, []);

  /**
   * Set up app state monitoring
   */
  const setupAppStateMonitoring = useCallback(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('App state changed:', appStateRef.current, '->', nextAppState);
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        handleAppForeground();
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        handleAppBackground();
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  /**
   * Handle app coming to foreground
   */
  const handleAppForeground = useCallback(async () => {
    try {
      console.log('App came to foreground, checking for updates...');
      
      // Check authentication status
      const isAuthenticated = await checkAuthenticationStatus();
      if (!isAuthenticated) return;
      
      // Check for pending sync
      if (connectionStatus === 'connected') {
        await integrationService.syncOfflineData();
      }
      
      // Refresh performance metrics
      const metrics = integrationService.getPerformanceMetrics();
      setPerformanceMetrics(metrics);
      
      // Log app foreground event
      await auditLogService.logEvent('app_foreground', {
        timestamp: Date.now(),
        connectionStatus
      });
      
    } catch (error) {
      console.error('Error handling app foreground:', error);
    }
  }, [connectionStatus, checkAuthenticationStatus]);

  /**
   * Handle app going to background
   */
  const handleAppBackground = useCallback(async () => {
    try {
      console.log('App going to background, saving state...');
      
      // Save current state
      await performanceOptimizationService.optimizeForBackground();
      
      // Log app background event
      await auditLogService.logEvent('app_background', {
        timestamp: Date.now(),
        connectionStatus
      });
      
    } catch (error) {
      console.error('Error handling app background:', error);
    }
  }, [connectionStatus]);

  /**
   * Handle incoming notifications
   */
  const handleNotification = useCallback((notification) => {
    // Show notification based on type and priority
    if (notification.priority === 'high') {
      Alert.alert(
        notification.title,
        notification.message,
        [
          { text: 'Dismiss' },
          { text: 'View', onPress: () => handleNotificationAction(notification) }
        ]
      );
    }
  }, []);

  /**
   * Handle notification action
   */
  const handleNotificationAction = useCallback((notification) => {
    // Navigate to appropriate screen based on notification type
    console.log('Handling notification action:', notification);
    // Implementation depends on navigation structure
  }, []);

  /**
   * Resolve sync conflict
   */
  const resolveConflict = useCallback(async (conflictId, resolution) => {
    try {
      await integrationService.services.dataSync.resolveConflict(conflictId, resolution);
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      Alert.alert('Error', 'Failed to resolve conflict. Please try again.');
    }
  }, []);

  /**
   * Get app health status
   */
  const getAppHealthStatus = useCallback(() => {
    return {
      isInitialized,
      connectionStatus,
      syncStatus,
      lastSyncTime: integrationService.getLastSyncTime(),
      performanceMetrics,
      conflictsCount: conflicts.length,
      error: error?.message
    };
  }, [isInitialized, connectionStatus, syncStatus, performanceMetrics, conflicts, error]);

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
    
    return () => {
      // Cleanup on unmount
      integrationService.cleanup();
    };
  }, [initializeApp]);

  // Show loading screen while initializing
  if (!isInitialized && !error) {
    return (
      <View style={styles.loadingContainer}>
        <PerformanceMonitor />
        {/* Add loading spinner or splash screen here */}
      </View>
    );
  }

  // Show error screen if initialization failed
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Alert
          title="Initialization Error"
          message={error.message}
          onRetry={retryInitialization}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Connection status indicator */}
      <ConnectionManager 
        status={connectionStatus}
        onRetryConnection={() => integrationService.setConnectionStatus('connecting')}
      />
      
      {/* Offline indicator */}
      {connectionStatus === 'disconnected' && (
        <OfflineIndicator 
          syncStatus={syncStatus}
          onSync={() => integrationService.syncOfflineData()}
        />
      )}
      
      {/* Conflict resolver */}
      {conflicts.length > 0 && (
        <ConflictResolver 
          conflicts={conflicts}
          onResolve={resolveConflict}
        />
      )}
      
      {/* Performance monitor */}
      <PerformanceMonitor 
        metrics={performanceMetrics}
        visible={__DEV__} // Only show in development
      />
      
      {/* Main app content */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20
  }
});

export default MobileAppIntegration;