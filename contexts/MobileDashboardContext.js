/**
 * Mobile Dashboard Context
 * 
 * This context manages the state for mobile dashboard functionality,
 * including dashboard data, clinical records, and real-time updates.
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import mobileApiService from '../services/mobileApiService';

const MobileDashboardContext = createContext({});

export const MobileDashboardProvider = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  
  // Dashboard state
  const [dashboardData, setDashboardData] = useState(null);
  const [clinicalRecordsSummary, setClinicalRecordsSummary] = useState(null);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dashboardPreferences, setDashboardPreferences] = useState(null);
  
  // Clinical records state
  const [clinicalRecords, setClinicalRecords] = useState([]);
  const [clinicalRecordsPagination, setClinicalRecordsPagination] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [notificationSummary, setNotificationSummary] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Loading states
  const [loading, setLoading] = useState({
    dashboard: false,
    clinicalRecords: false,
    notifications: false,
    refreshing: false,
  });
  
  // Error states
  const [errors, setErrors] = useState({});
  
  // Real-time updates
  const [lastUpdateCheck, setLastUpdateCheck] = useState(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  
  // Offline state
  const [isOffline, setIsOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  // Initialize dashboard data when user logs in
  useEffect(() => {
    if (isLoggedIn && user) {
      initializeDashboard();
      startRealTimeUpdates();
    }
  }, [isLoggedIn, user]);

  // Initialize dashboard data
  const initializeDashboard = async () => {
    try {
      setLoading(prev => ({ ...prev, dashboard: true }));
      
      // Load cached data first for better UX
      await loadCachedData();
      
      // Then fetch fresh data
      await Promise.all([
        loadDashboardData(),
        loadClinicalRecordsSummary(),
        loadRecentDocuments(),
        loadQuickActions(),
        loadAlerts(),
        loadNotificationSummary(),
      ]);
      
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      setErrors(prev => ({ ...prev, dashboard: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
  };

  // Load cached data for offline support
  const loadCachedData = async () => {
    try {
      const cachedDashboard = await mobileApiService.getCachedData('dashboard');
      const cachedNotifications = await mobileApiService.getCachedData('notifications');
      
      if (cachedDashboard?.data) {
        setDashboardData(cachedDashboard.data);
      }
      
      if (cachedNotifications?.data) {
        setNotifications(cachedNotifications.data);
      }
    } catch (error) {
      console.error('Cache loading error:', error);
    }
  };

  // Load dashboard data
  const loadDashboardData = async (options = {}) => {
    try {
      const data = await mobileApiService.getDashboardData({
        dateRange: options.dateRange || '30',
        includeTrends: options.includeTrends || false,
        compact: options.compact || false,
      });
      
      setDashboardData(data.data);
      
      // Cache the data
      await mobileApiService.setCachedData('dashboard', data.data);
      
      return data;
    } catch (error) {
      console.error('Dashboard data loading error:', error);
      setErrors(prev => ({ ...prev, dashboard: error.message }));
      throw error;
    }
  };

  // Load clinical records summary
  const loadClinicalRecordsSummary = async (options = {}) => {
    try {
      const data = await mobileApiService.getClinicalRecordsSummary(options);
      setClinicalRecordsSummary(data.data);
      return data;
    } catch (error) {
      console.error('Clinical records summary loading error:', error);
      setErrors(prev => ({ ...prev, clinicalRecords: error.message }));
      throw error;
    }
  };

  // Load recent documents
  const loadRecentDocuments = async (options = {}) => {
    try {
      const data = await mobileApiService.getRecentDocuments(options);
      setRecentDocuments(data.data.documents);
      return data;
    } catch (error) {
      console.error('Recent documents loading error:', error);
      throw error;
    }
  };

  // Load quick actions
  const loadQuickActions = async () => {
    try {
      const data = await mobileApiService.getQuickActions();
      setQuickActions(data.data.actions);
      return data;
    } catch (error) {
      console.error('Quick actions loading error:', error);
      throw error;
    }
  };

  // Load alerts
  const loadAlerts = async (options = {}) => {
    try {
      const data = await mobileApiService.getDashboardAlerts(options);
      setAlerts(data.data.alerts);
      return data;
    } catch (error) {
      console.error('Alerts loading error:', error);
      throw error;
    }
  };

  // Load notification summary
  const loadNotificationSummary = async () => {
    try {
      const data = await mobileApiService.getNotificationSummary();
      setNotificationSummary(data.data);
      setUnreadCount(data.data.unread_count);
      return data;
    } catch (error) {
      console.error('Notification summary loading error:', error);
      throw error;
    }
  };

  // Load clinical records list
  const loadClinicalRecords = async (options = {}) => {
    try {
      setLoading(prev => ({ ...prev, clinicalRecords: true }));
      
      const data = await mobileApiService.getClinicalRecords(options);
      
      if (options.page && options.page > 1) {
        // Append to existing records for pagination
        setClinicalRecords(prev => [...prev, ...data.results]);
      } else {
        // Replace records for new search/filter
        setClinicalRecords(data.results);
      }
      
      setClinicalRecordsPagination({
        count: data.count,
        next: data.next,
        previous: data.previous,
        currentPage: options.page || 1,
      });
      
      return data;
    } catch (error) {
      console.error('Clinical records loading error:', error);
      setErrors(prev => ({ ...prev, clinicalRecords: error.message }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, clinicalRecords: false }));
    }
  };

  // Load clinical record detail
  const loadClinicalRecordDetail = async (recordId) => {
    try {
      const data = await mobileApiService.getClinicalRecordDetail(recordId);
      setSelectedRecord(data.record);
      return data;
    } catch (error) {
      console.error('Clinical record detail loading error:', error);
      throw error;
    }
  };

  // Search clinical records
  const searchClinicalRecords = async (query, options = {}) => {
    try {
      setLoading(prev => ({ ...prev, clinicalRecords: true }));
      
      const data = await mobileApiService.searchClinicalRecords(query, options);
      setClinicalRecords(data.results);
      setClinicalRecordsPagination({
        count: data.count,
        next: data.next,
        previous: data.previous,
        currentPage: 1,
      });
      
      return data;
    } catch (error) {
      console.error('Clinical records search error:', error);
      setErrors(prev => ({ ...prev, clinicalRecords: error.message }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, clinicalRecords: false }));
    }
  };

  // Upload document
  const uploadDocument = async (clinicalRecordId, file, onProgress = null) => {
    try {
      const data = await mobileApiService.uploadDocument(clinicalRecordId, file);
      
      // Refresh recent documents
      await loadRecentDocuments();
      
      return data;
    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  };

  // Load notifications
  const loadNotifications = async (options = {}) => {
    try {
      setLoading(prev => ({ ...prev, notifications: true }));
      
      const data = await mobileApiService.getNotifications(options);
      
      if (options.page && options.page > 1) {
        setNotifications(prev => [...prev, ...data.results]);
      } else {
        setNotifications(data.results);
      }
      
      // Cache notifications
      await mobileApiService.setCachedData('notifications', data.results);
      
      return data;
    } catch (error) {
      console.error('Notifications loading error:', error);
      setErrors(prev => ({ ...prev, notifications: error.message }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, notifications: false }));
    }
  };

  // Mark notifications as read
  const markNotificationsRead = async (notificationIds = [], markAll = false) => {
    try {
      const data = await mobileApiService.markNotificationsRead(notificationIds, markAll);
      
      // Update local state
      if (markAll) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      } else {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }
      
      return data;
    } catch (error) {
      console.error('Mark notifications read error:', error);
      throw error;
    }
  };

  // Refresh all data
  const refreshAll = async () => {
    try {
      setLoading(prev => ({ ...prev, refreshing: true }));
      
      await Promise.all([
        loadDashboardData(),
        loadClinicalRecordsSummary(),
        loadRecentDocuments(),
        loadAlerts(),
        loadNotificationSummary(),
      ]);
      
    } catch (error) {
      console.error('Refresh error:', error);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, refreshing: false }));
    }
  };

  // Start real-time updates
  const startRealTimeUpdates = useCallback(() => {
    if (!realTimeEnabled) return;
    
    const interval = setInterval(async () => {
      try {
        const updates = await mobileApiService.getRealTimeUpdates(
          lastUpdateCheck,
          ['notifications', 'alerts', 'appointments', 'clinical_records']
        );
        
        if (updates.data.has_updates) {
          // Handle different types of updates
          const { updates: updateData } = updates.data;
          
          if (updateData.notifications) {
            await loadNotificationSummary();
          }
          
          if (updateData.alerts) {
            await loadAlerts();
          }
          
          if (updateData.appointments || updateData.clinical_records) {
            await loadDashboardData({ compact: true });
          }
        }
        
        setLastUpdateCheck(updates.data.current_time);
        
      } catch (error) {
        console.error('Real-time updates error:', error);
        // Don't spam errors for real-time updates
      }
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [lastUpdateCheck, realTimeEnabled]);

  // Sync offline data
  const syncOfflineData = async () => {
    try {
      const lastSync = await AsyncStorage.getItem('lastSyncTimestamp');
      const clientData = {
        read_notifications: notifications.filter(n => n.is_read).map(n => n.id),
        device_info: {
          platform: 'react-native',
          app_version: '1.0.0',
        },
      };
      
      const data = await mobileApiService.syncOfflineData(lastSync, clientData);
      
      // Update local state with synced data
      if (data.data.notifications) {
        setNotifications(data.data.notifications);
      }
      
      // Update sync timestamp
      await AsyncStorage.setItem('lastSyncTimestamp', data.sync_completed_at);
      setSyncStatus(data);
      
      return data;
    } catch (error) {
      console.error('Offline sync error:', error);
      throw error;
    }
  };

  // Clear errors
  const clearError = (errorType) => {
    setErrors(prev => ({ ...prev, [errorType]: null }));
  };

  // Clear all data (for logout)
  const clearAllData = () => {
    setDashboardData(null);
    setClinicalRecordsSummary(null);
    setRecentDocuments([]);
    setQuickActions([]);
    setAlerts([]);
    setClinicalRecords([]);
    setNotifications([]);
    setSelectedRecord(null);
    setErrors({});
    setUnreadCount(0);
  };

  const contextValue = {
    // Dashboard state
    dashboardData,
    clinicalRecordsSummary,
    recentDocuments,
    quickActions,
    alerts,
    dashboardPreferences,
    
    // Clinical records state
    clinicalRecords,
    clinicalRecordsPagination,
    selectedRecord,
    
    // Notification state
    notifications,
    notificationSummary,
    unreadCount,
    
    // Loading states
    loading,
    errors,
    
    // Real-time state
    lastUpdateCheck,
    realTimeEnabled,
    setRealTimeEnabled,
    
    // Offline state
    isOffline,
    syncStatus,
    
    // Dashboard actions
    loadDashboardData,
    loadClinicalRecordsSummary,
    loadRecentDocuments,
    loadQuickActions,
    loadAlerts,
    refreshAll,
    
    // Clinical records actions
    loadClinicalRecords,
    loadClinicalRecordDetail,
    searchClinicalRecords,
    uploadDocument,
    
    // Notification actions
    loadNotifications,
    markNotificationsRead,
    loadNotificationSummary,
    
    // Sync actions
    syncOfflineData,
    
    // Utility actions
    clearError,
    clearAllData,
    
    // Computed values
    hasUnreadNotifications: unreadCount > 0,
    hasAlerts: alerts.length > 0,
    isLoading: Object.values(loading).some(Boolean),
    hasErrors: Object.values(errors).some(Boolean),
  };

  return (
    <MobileDashboardContext.Provider value={contextValue}>
      {children}
    </MobileDashboardContext.Provider>
  );
};

export const useMobileDashboard = () => {
  const context = useContext(MobileDashboardContext);
  if (!context) {
    throw new Error('useMobileDashboard must be used within a MobileDashboardProvider');
  }
  return context;
};

export default MobileDashboardContext;