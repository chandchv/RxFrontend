/**
 * Real-time Data Synchronization Service
 * 
 * This service manages real-time data updates for dashboard metrics,
 * clinical records, appointments, and notifications using WebSocket connections.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import websocketService from './websocketService';
import mobileApiService from './mobileApiService';

class RealTimeService {
  constructor() {
    this.isActive = false;
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.syncFrequency = 30000; // 30 seconds
    this.dataCache = new Map();
    this.updateListeners = new Map();
    this.connectionListeners = [];
    this.errorListeners = [];
    
    // Data types that support real-time updates
    this.supportedDataTypes = [
      'dashboard_metrics',
      'clinical_records',
      'appointments',
      'prescriptions',
      'notifications',
      'alerts'
    ];
    
    // Initialize WebSocket listeners
    this.initializeWebSocketListeners();
  }

  /**
   * Initialize WebSocket event listeners
   */
  initializeWebSocketListeners() {
    // Connection status listener
    websocketService.addConnectionListener((isConnected) => {
      this.handleConnectionChange(isConnected);
    });

    // Error listener
    websocketService.addErrorListener((error) => {
      this.handleConnectionError(error);
    });

    // Notification listeners
    websocketService.addMessageListener('notification', (data) => {
      this.handleNotificationUpdate(data);
    });

    websocketService.addMessageListener('alert', (data) => {
      this.handleAlertUpdate(data);
    });

    websocketService.addMessageListener('update', (data) => {
      this.handleDataUpdate(data);
    });

    websocketService.addMessageListener('unread_count', (data) => {
      this.handleUnreadCountUpdate(data);
    });
  }

  /**
   * Start real-time data synchronization
   */
  async start() {
    if (this.isActive) {
      console.log('Real-time service already active');
      return;
    }

    try {
      console.log('Starting real-time data synchronization');
      this.isActive = true;
      
      // Connect to WebSocket
      await websocketService.connect();
      
      // Subscribe to relevant notification types
      await this.subscribeToUpdates();
      
      // Start periodic sync for fallback
      this.startPeriodicSync();
      
      // Load last sync time
      this.lastSyncTime = await AsyncStorage.getItem('lastSyncTime');
      
      console.log('Real-time service started successfully');
      
    } catch (error) {
      console.error('Error starting real-time service:', error);
      this.isActive = false;
      throw error;
    }
  }

  /**
   * Stop real-time data synchronization
   */
  stop() {
    console.log('Stopping real-time data synchronization');
    
    this.isActive = false;
    
    // Stop periodic sync
    this.stopPeriodicSync();
    
    // Disconnect WebSocket
    websocketService.disconnect();
    
    // Clear cache
    this.dataCache.clear();
    
    console.log('Real-time service stopped');
  }

  /**
   * Subscribe to real-time updates
   */
  async subscribeToUpdates() {
    const notificationTypes = [
      'appointment_created',
      'appointment_updated',
      'appointment_cancelled',
      'clinical_record_created',
      'clinical_record_updated',
      'document_processed',
      'prescription_created',
      'prescription_updated',
      'system_alert',
      'dashboard_metric_updated'
    ];

    return websocketService.subscribe(notificationTypes);
  }

  /**
   * Start periodic sync as fallback
   */
  startPeriodicSync() {
    this.stopPeriodicSync(); // Clear any existing interval
    
    this.syncInterval = setInterval(async () => {
      if (this.isActive) {
        await this.performPeriodicSync();
      }
    }, this.syncFrequency);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform periodic data synchronization
   */
  async performPeriodicSync() {
    try {
      console.log('Performing periodic sync');
      
      const syncData = await mobileApiService.getRealTimeUpdates(
        this.lastSyncTime,
        this.supportedDataTypes
      );
      
      if (syncData.data.has_updates) {
        await this.processUpdates(syncData.data.updates);
      }
      
      // Update last sync time
      this.lastSyncTime = syncData.data.current_time;
      await AsyncStorage.setItem('lastSyncTime', this.lastSyncTime);
      
    } catch (error) {
      console.error('Periodic sync error:', error);
      this.notifyErrorListeners(error);
    }
  }

  /**
   * Process real-time updates
   */
  async processUpdates(updates) {
    for (const [dataType, updateData] of Object.entries(updates)) {
      try {
        await this.processDataTypeUpdate(dataType, updateData);
      } catch (error) {
        console.error(`Error processing ${dataType} update:`, error);
      }
    }
  }

  /**
   * Process update for specific data type
   */
  async processDataTypeUpdate(dataType, updateData) {
    console.log(`Processing ${dataType} update:`, updateData);
    
    switch (dataType) {
      case 'dashboard_metrics':
        await this.updateDashboardMetrics(updateData);
        break;
        
      case 'clinical_records':
        await this.updateClinicalRecords(updateData);
        break;
        
      case 'appointments':
        await this.updateAppointments(updateData);
        break;
        
      case 'prescriptions':
        await this.updatePrescriptions(updateData);
        break;
        
      case 'notifications':
        await this.updateNotifications(updateData);
        break;
        
      case 'alerts':
        await this.updateAlerts(updateData);
        break;
        
      default:
        console.warn(`Unknown data type: ${dataType}`);
    }
    
    // Notify listeners
    this.notifyUpdateListeners(dataType, updateData);
  }

  /**
   * Update dashboard metrics
   */
  async updateDashboardMetrics(updateData) {
    const cacheKey = 'dashboard_metrics';
    const currentData = this.dataCache.get(cacheKey) || {};
    
    // Merge new metrics with existing data
    const updatedData = {
      ...currentData,
      ...updateData,
      last_updated: new Date().toISOString()
    };
    
    this.dataCache.set(cacheKey, updatedData);
    
    // Cache to storage for offline access
    await AsyncStorage.setItem(`cache_${cacheKey}`, JSON.stringify(updatedData));
  }

  /**
   * Update clinical records
   */
  async updateClinicalRecords(updateData) {
    const cacheKey = 'clinical_records';
    const currentData = this.dataCache.get(cacheKey) || { records: [] };
    
    if (updateData.action === 'create') {
      currentData.records.unshift(updateData.record);
    } else if (updateData.action === 'update') {
      const index = currentData.records.findIndex(r => r.id === updateData.record.id);
      if (index >= 0) {
        currentData.records[index] = { ...currentData.records[index], ...updateData.record };
      }
    } else if (updateData.action === 'delete') {
      currentData.records = currentData.records.filter(r => r.id !== updateData.record_id);
    }
    
    currentData.last_updated = new Date().toISOString();
    this.dataCache.set(cacheKey, currentData);
    
    // Cache to storage
    await AsyncStorage.setItem(`cache_${cacheKey}`, JSON.stringify(currentData));
  }

  /**
   * Update appointments
   */
  async updateAppointments(updateData) {
    const cacheKey = 'appointments';
    const currentData = this.dataCache.get(cacheKey) || { appointments: [] };
    
    if (updateData.action === 'create') {
      currentData.appointments.unshift(updateData.appointment);
    } else if (updateData.action === 'update') {
      const index = currentData.appointments.findIndex(a => a.id === updateData.appointment.id);
      if (index >= 0) {
        currentData.appointments[index] = { ...currentData.appointments[index], ...updateData.appointment };
      }
    } else if (updateData.action === 'cancel') {
      const index = currentData.appointments.findIndex(a => a.id === updateData.appointment_id);
      if (index >= 0) {
        currentData.appointments[index].status = 'cancelled';
        currentData.appointments[index].cancelled_at = updateData.cancelled_at;
      }
    }
    
    currentData.last_updated = new Date().toISOString();
    this.dataCache.set(cacheKey, currentData);
    
    // Cache to storage
    await AsyncStorage.setItem(`cache_${cacheKey}`, JSON.stringify(currentData));
  }

  /**
   * Update prescriptions
   */
  async updatePrescriptions(updateData) {
    const cacheKey = 'prescriptions';
    const currentData = this.dataCache.get(cacheKey) || { prescriptions: [] };
    
    if (updateData.action === 'create') {
      currentData.prescriptions.unshift(updateData.prescription);
    } else if (updateData.action === 'update') {
      const index = currentData.prescriptions.findIndex(p => p.id === updateData.prescription.id);
      if (index >= 0) {
        currentData.prescriptions[index] = { ...currentData.prescriptions[index], ...updateData.prescription };
      }
    }
    
    currentData.last_updated = new Date().toISOString();
    this.dataCache.set(cacheKey, currentData);
    
    // Cache to storage
    await AsyncStorage.setItem(`cache_${cacheKey}`, JSON.stringify(currentData));
  }

  /**
   * Update notifications
   */
  async updateNotifications(updateData) {
    const cacheKey = 'notifications';
    const currentData = this.dataCache.get(cacheKey) || { notifications: [], unread_count: 0 };
    
    if (updateData.action === 'create') {
      currentData.notifications.unshift(updateData.notification);
      currentData.unread_count = (currentData.unread_count || 0) + 1;
    } else if (updateData.action === 'mark_read') {
      const notificationIds = updateData.notification_ids || [];
      notificationIds.forEach(id => {
        const index = currentData.notifications.findIndex(n => n.id === id);
        if (index >= 0 && !currentData.notifications[index].is_read) {
          currentData.notifications[index].is_read = true;
          currentData.unread_count = Math.max(0, (currentData.unread_count || 0) - 1);
        }
      });
    }
    
    currentData.last_updated = new Date().toISOString();
    this.dataCache.set(cacheKey, currentData);
    
    // Cache to storage
    await AsyncStorage.setItem(`cache_${cacheKey}`, JSON.stringify(currentData));
  }

  /**
   * Update alerts
   */
  async updateAlerts(updateData) {
    const cacheKey = 'alerts';
    const currentData = this.dataCache.get(cacheKey) || { alerts: [] };
    
    if (updateData.action === 'create') {
      currentData.alerts.unshift(updateData.alert);
    } else if (updateData.action === 'dismiss') {
      currentData.alerts = currentData.alerts.filter(a => a.id !== updateData.alert_id);
    }
    
    currentData.last_updated = new Date().toISOString();
    this.dataCache.set(cacheKey, currentData);
    
    // Cache to storage
    await AsyncStorage.setItem(`cache_${cacheKey}`, JSON.stringify(currentData));
  }

  // WebSocket event handlers

  handleConnectionChange(isConnected) {
    console.log('Real-time connection status:', isConnected ? 'connected' : 'disconnected');
    
    if (isConnected) {
      // Re-subscribe to updates
      this.subscribeToUpdates();
      
      // Perform sync to catch up on missed updates
      this.performPeriodicSync();
    }
    
    // Notify connection listeners
    this.connectionListeners.forEach(listener => {
      try {
        listener(isConnected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  handleConnectionError(error) {
    console.error('Real-time connection error:', error);
    this.notifyErrorListeners(error);
  }

  handleNotificationUpdate(data) {
    this.processDataTypeUpdate('notifications', {
      action: 'create',
      notification: data.data
    });
  }

  handleAlertUpdate(data) {
    this.processDataTypeUpdate('alerts', {
      action: 'create',
      alert: data.data
    });
  }

  handleDataUpdate(data) {
    const { data_type, update_data } = data.data;
    this.processDataTypeUpdate(data_type, update_data);
  }

  handleUnreadCountUpdate(data) {
    this.processDataTypeUpdate('notifications', {
      action: 'update_count',
      unread_count: data.count
    });
  }

  // Listener management

  /**
   * Add update listener for specific data type
   */
  addUpdateListener(dataType, callback) {
    if (!this.updateListeners.has(dataType)) {
      this.updateListeners.set(dataType, []);
    }
    this.updateListeners.get(dataType).push(callback);
  }

  /**
   * Remove update listener
   */
  removeUpdateListener(dataType, callback) {
    if (this.updateListeners.has(dataType)) {
      const callbacks = this.updateListeners.get(dataType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Add connection listener
   */
  addConnectionListener(callback) {
    this.connectionListeners.push(callback);
  }

  /**
   * Remove connection listener
   */
  removeConnectionListener(callback) {
    const index = this.connectionListeners.indexOf(callback);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  /**
   * Add error listener
   */
  addErrorListener(callback) {
    this.errorListeners.push(callback);
  }

  /**
   * Remove error listener
   */
  removeErrorListener(callback) {
    const index = this.errorListeners.indexOf(callback);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * Notify update listeners
   */
  notifyUpdateListeners(dataType, updateData) {
    if (this.updateListeners.has(dataType)) {
      const callbacks = this.updateListeners.get(dataType);
      callbacks.forEach(callback => {
        try {
          callback(updateData);
        } catch (error) {
          console.error('Error in update listener:', error);
        }
      });
    }
  }

  /**
   * Notify error listeners
   */
  notifyErrorListeners(error) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  // Utility methods

  /**
   * Get cached data
   */
  getCachedData(dataType) {
    return this.dataCache.get(dataType);
  }

  /**
   * Clear cached data
   */
  clearCachedData(dataType = null) {
    if (dataType) {
      this.dataCache.delete(dataType);
    } else {
      this.dataCache.clear();
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isActive: this.isActive,
      websocketStatus: websocketService.getConnectionStatus(),
      lastSyncTime: this.lastSyncTime,
      cacheSize: this.dataCache.size
    };
  }

  /**
   * Force data refresh
   */
  async forceRefresh(dataTypes = null) {
    const typesToRefresh = dataTypes || this.supportedDataTypes;
    
    try {
      const updates = await mobileApiService.getRealTimeUpdates(null, typesToRefresh);
      
      if (updates.data.has_updates) {
        await this.processUpdates(updates.data.updates);
      }
      
      return true;
    } catch (error) {
      console.error('Force refresh error:', error);
      throw error;
    }
  }

  /**
   * Mark notifications as read via WebSocket
   */
  markNotificationsRead(notificationIds) {
    return websocketService.markNotificationsRead(notificationIds);
  }

  /**
   * Get unread notification count via WebSocket
   */
  getUnreadCount() {
    return websocketService.getUnreadCount();
  }
}

// Create singleton instance
const realTimeService = new RealTimeService();

export default realTimeService;