/**
 * Real-time Data Context
 * 
 * This context provides real-time data updates for dashboard metrics,
 * clinical records, appointments, and notifications throughout the app.
 */

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import realTimeService from '../services/realTimeService';
import websocketService from '../services/websocketService';

const RealTimeContext = createContext({});

export const RealTimeProvider = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  const appState = useRef(AppState.currentState);
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Real-time data state
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [clinicalRecords, setClinicalRecords] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [prescriptions, setPrescriptions] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [alerts, setAlerts] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState({
    dashboard: false,
    clinicalRecords: false,
    appointments: false,
    prescriptions: false,
    notifications: false,
    alerts: false,
  });

  // Initialize real-time service when user logs in
  useEffect(() => {
    if (isLoggedIn && user) {
      initializeRealTimeService();
    } else {
      stopRealTimeService();
    }

    return () => {
      stopRealTimeService();
    };
  }, [isLoggedIn, user]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - reconnect if needed
        if (isLoggedIn && !isConnected) {
          initializeRealTimeService();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - maintain connection but reduce activity
        // The service will handle this automatically
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isLoggedIn, isConnected]);

  /**
   * Initialize real-time service
   */
  const initializeRealTimeService = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Set up listeners before starting service
      setupRealTimeListeners();
      
      // Start real-time service
      await realTimeService.start();
      
      console.log('Real-time service initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize real-time service:', error);
      setConnectionError(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Stop real-time service
   */
  const stopRealTimeService = () => {
    try {
      realTimeService.stop();
      
      // Reset connection state
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(null);
      
      // Clear data
      clearAllData();
      
      console.log('Real-time service stopped');
      
    } catch (error) {
      console.error('Error stopping real-time service:', error);
    }
  };

  /**
   * Set up real-time data listeners
   */
  const setupRealTimeListeners = () => {
    // Connection listeners
    realTimeService.addConnectionListener(handleConnectionChange);
    realTimeService.addErrorListener(handleConnectionError);
    
    // Data update listeners
    realTimeService.addUpdateListener('dashboard_metrics', handleDashboardMetricsUpdate);
    realTimeService.addUpdateListener('clinical_records', handleClinicalRecordsUpdate);
    realTimeService.addUpdateListener('appointments', handleAppointmentsUpdate);
    realTimeService.addUpdateListener('prescriptions', handlePrescriptionsUpdate);
    realTimeService.addUpdateListener('notifications', handleNotificationsUpdate);
    realTimeService.addUpdateListener('alerts', handleAlertsUpdate);
  };

  /**
   * Handle connection status changes
   */
  const handleConnectionChange = useCallback((connected) => {
    setIsConnected(connected);
    setConnectionError(null);
    
    if (connected) {
      console.log('Real-time connection established');
      // Update last sync time
      const status = realTimeService.getConnectionStatus();
      setLastSyncTime(status.lastSyncTime);
    } else {
      console.log('Real-time connection lost');
    }
  }, []);

  /**
   * Handle connection errors
   */
  const handleConnectionError = useCallback((error) => {
    console.error('Real-time connection error:', error);
    setConnectionError(error.message);
    setIsConnected(false);
  }, []);

  // Data update handlers

  const handleDashboardMetricsUpdate = useCallback((updateData) => {
    console.log('Dashboard metrics updated:', updateData);
    
    setDashboardMetrics(prevData => {
      if (!prevData) return updateData;
      
      return {
        ...prevData,
        ...updateData,
        last_updated: new Date().toISOString()
      };
    });
    
    setLoading(prev => ({ ...prev, dashboard: false }));
  }, []);

  const handleClinicalRecordsUpdate = useCallback((updateData) => {
    console.log('Clinical records updated:', updateData);
    
    setClinicalRecords(prevData => {
      if (!prevData) return updateData;
      
      const updatedData = { ...prevData };
      
      if (updateData.action === 'create' && updateData.record) {
        updatedData.records = [updateData.record, ...(updatedData.records || [])];
        updatedData.total_count = (updatedData.total_count || 0) + 1;
      } else if (updateData.action === 'update' && updateData.record) {
        const index = updatedData.records?.findIndex(r => r.id === updateData.record.id);
        if (index >= 0) {
          updatedData.records[index] = { ...updatedData.records[index], ...updateData.record };
        }
      } else if (updateData.action === 'delete' && updateData.record_id) {
        updatedData.records = updatedData.records?.filter(r => r.id !== updateData.record_id) || [];
        updatedData.total_count = Math.max(0, (updatedData.total_count || 0) - 1);
      }
      
      updatedData.last_updated = new Date().toISOString();
      return updatedData;
    });
    
    setLoading(prev => ({ ...prev, clinicalRecords: false }));
  }, []);

  const handleAppointmentsUpdate = useCallback((updateData) => {
    console.log('Appointments updated:', updateData);
    
    setAppointments(prevData => {
      if (!prevData) return updateData;
      
      const updatedData = { ...prevData };
      
      if (updateData.action === 'create' && updateData.appointment) {
        updatedData.appointments = [updateData.appointment, ...(updatedData.appointments || [])];
        updatedData.total_count = (updatedData.total_count || 0) + 1;
      } else if (updateData.action === 'update' && updateData.appointment) {
        const index = updatedData.appointments?.findIndex(a => a.id === updateData.appointment.id);
        if (index >= 0) {
          updatedData.appointments[index] = { ...updatedData.appointments[index], ...updateData.appointment };
        }
      } else if (updateData.action === 'cancel' && updateData.appointment_id) {
        const index = updatedData.appointments?.findIndex(a => a.id === updateData.appointment_id);
        if (index >= 0) {
          updatedData.appointments[index] = {
            ...updatedData.appointments[index],
            status: 'cancelled',
            cancelled_at: updateData.cancelled_at || new Date().toISOString()
          };
        }
      }
      
      updatedData.last_updated = new Date().toISOString();
      return updatedData;
    });
    
    setLoading(prev => ({ ...prev, appointments: false }));
  }, []);

  const handlePrescriptionsUpdate = useCallback((updateData) => {
    console.log('Prescriptions updated:', updateData);
    
    setPrescriptions(prevData => {
      if (!prevData) return updateData;
      
      const updatedData = { ...prevData };
      
      if (updateData.action === 'create' && updateData.prescription) {
        updatedData.prescriptions = [updateData.prescription, ...(updatedData.prescriptions || [])];
        updatedData.total_count = (updatedData.total_count || 0) + 1;
      } else if (updateData.action === 'update' && updateData.prescription) {
        const index = updatedData.prescriptions?.findIndex(p => p.id === updateData.prescription.id);
        if (index >= 0) {
          updatedData.prescriptions[index] = { ...updatedData.prescriptions[index], ...updateData.prescription };
        }
      }
      
      updatedData.last_updated = new Date().toISOString();
      return updatedData;
    });
    
    setLoading(prev => ({ ...prev, prescriptions: false }));
  }, []);

  const handleNotificationsUpdate = useCallback((updateData) => {
    console.log('Notifications updated:', updateData);
    
    setNotifications(prevData => {
      if (!prevData) return updateData;
      
      const updatedData = { ...prevData };
      
      if (updateData.action === 'create' && updateData.notification) {
        updatedData.notifications = [updateData.notification, ...(updatedData.notifications || [])];
        updatedData.unread_count = (updatedData.unread_count || 0) + 1;
      } else if (updateData.action === 'mark_read' && updateData.notification_ids) {
        updateData.notification_ids.forEach(id => {
          const index = updatedData.notifications?.findIndex(n => n.id === id);
          if (index >= 0 && !updatedData.notifications[index].is_read) {
            updatedData.notifications[index].is_read = true;
            updatedData.unread_count = Math.max(0, (updatedData.unread_count || 0) - 1);
          }
        });
      } else if (updateData.action === 'update_count') {
        updatedData.unread_count = updateData.unread_count;
      }
      
      updatedData.last_updated = new Date().toISOString();
      return updatedData;
    });
    
    setLoading(prev => ({ ...prev, notifications: false }));
  }, []);

  const handleAlertsUpdate = useCallback((updateData) => {
    console.log('Alerts updated:', updateData);
    
    setAlerts(prevData => {
      if (!prevData) return updateData;
      
      const updatedData = { ...prevData };
      
      if (updateData.action === 'create' && updateData.alert) {
        updatedData.alerts = [updateData.alert, ...(updatedData.alerts || [])];
      } else if (updateData.action === 'dismiss' && updateData.alert_id) {
        updatedData.alerts = updatedData.alerts?.filter(a => a.id !== updateData.alert_id) || [];
      }
      
      updatedData.last_updated = new Date().toISOString();
      return updatedData;
    });
    
    setLoading(prev => ({ ...prev, alerts: false }));
  }, []);

  // Utility functions

  /**
   * Clear all real-time data
   */
  const clearAllData = () => {
    setDashboardMetrics(null);
    setClinicalRecords(null);
    setAppointments(null);
    setPrescriptions(null);
    setNotifications(null);
    setAlerts(null);
    setLastSyncTime(null);
  };

  /**
   * Force refresh all data
   */
  const forceRefresh = async (dataTypes = null) => {
    try {
      setLoading(prev => {
        const newLoading = { ...prev };
        if (!dataTypes) {
          Object.keys(newLoading).forEach(key => {
            newLoading[key] = true;
          });
        } else {
          dataTypes.forEach(type => {
            if (type === 'dashboard_metrics') newLoading.dashboard = true;
            if (type === 'clinical_records') newLoading.clinicalRecords = true;
            if (type === 'appointments') newLoading.appointments = true;
            if (type === 'prescriptions') newLoading.prescriptions = true;
            if (type === 'notifications') newLoading.notifications = true;
            if (type === 'alerts') newLoading.alerts = true;
          });
        }
        return newLoading;
      });
      
      await realTimeService.forceRefresh(dataTypes);
      
      // Update last sync time
      const status = realTimeService.getConnectionStatus();
      setLastSyncTime(status.lastSyncTime);
      
    } catch (error) {
      console.error('Force refresh error:', error);
      throw error;
    }
  };

  /**
   * Reconnect to real-time service
   */
  const reconnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Force reconnection
      websocketService.forceReconnect();
      
    } catch (error) {
      console.error('Reconnection error:', error);
      setConnectionError(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Mark notifications as read
   */
  const markNotificationsRead = async (notificationIds) => {
    try {
      // Update local state immediately for better UX
      handleNotificationsUpdate({
        action: 'mark_read',
        notification_ids: notificationIds
      });
      
      // Send to server via WebSocket
      return realTimeService.markNotificationsRead(notificationIds);
      
    } catch (error) {
      console.error('Mark notifications read error:', error);
      throw error;
    }
  };

  /**
   * Get unread notification count
   */
  const getUnreadCount = () => {
    return realTimeService.getUnreadCount();
  };

  /**
   * Get connection status
   */
  const getConnectionStatus = () => {
    return {
      isConnected,
      isConnecting,
      connectionError,
      lastSyncTime,
      ...realTimeService.getConnectionStatus()
    };
  };

  const contextValue = {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    lastSyncTime,
    
    // Real-time data
    dashboardMetrics,
    clinicalRecords,
    appointments,
    prescriptions,
    notifications,
    alerts,
    
    // Loading states
    loading,
    
    // Actions
    forceRefresh,
    reconnect,
    markNotificationsRead,
    getUnreadCount,
    getConnectionStatus,
    
    // Computed values
    hasData: !!(dashboardMetrics || clinicalRecords || appointments || prescriptions || notifications || alerts),
    unreadNotificationCount: notifications?.unread_count || 0,
    activeAlertCount: alerts?.alerts?.length || 0,
    isLoading: Object.values(loading).some(Boolean),
    canReceiveUpdates: isConnected && !connectionError,
  };

  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};

export default RealTimeContext;