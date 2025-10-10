import NetInfo from '@react-native-community/netinfo';
import offlineStorageService from './offlineStorageService';
import mobileApiService from './mobileApiService';

/**
 * Data Synchronization Service
 * Handles synchronization between local storage and backend when connection is restored
 */
class DataSyncService {
  constructor() {
    this.isOnline = true;
    this.isSyncing = false;
    this.syncQueue = [];
    this.syncListeners = [];
    this.conflictResolvers = new Map();
    
    this.initializeNetworkListener();
  }

  /**
   * Initialize network state listener
   */
  initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;
      
      console.log('Network state changed:', {
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });

      // Trigger sync when coming back online
      if (wasOffline && this.isOnline) {
        this.handleConnectionRestored();
      }

      // Notify listeners
      this.notifyNetworkStateChange(this.isOnline);
    });
  }

  /**
   * Add network state change listener
   */
  addNetworkListener(listener) {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of network state change
   */
  notifyNetworkStateChange(isOnline) {
    this.syncListeners.forEach(listener => {
      try {
        listener({ isOnline, isSyncing: this.isSyncing });
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Handle connection restored
   */
  async handleConnectionRestored() {
    console.log('Connection restored, starting sync...');
    await this.syncOfflineData();
  }

  /**
   * Add conflict resolver for specific data type
   */
  addConflictResolver(dataType, resolver) {
    this.conflictResolvers.set(dataType, resolver);
  }

  /**
   * Sync all offline data when connection is restored
   */
  async syncOfflineData() {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.notifyNetworkStateChange(this.isOnline);

    try {
      console.log('Starting offline data synchronization...');

      // Get all offline actions
      const offlineActions = await offlineStorageService.getOfflineActions() || [];
      console.log(`Found ${offlineActions.length} offline actions to sync`);

      // Process offline actions
      for (const action of offlineActions) {
        await this.processOfflineAction(action);
      }

      // Sync cached data with server
      await this.syncCachedData();

      // Clear processed offline actions
      await offlineStorageService.clearOfflineActions();

      // Update sync metadata
      await offlineStorageService.storeSyncMetadata({
        lastSyncTime: Date.now(),
        syncStatus: 'completed',
        actionsProcessed: offlineActions.length,
      });

      console.log('Offline data synchronization completed');
    } catch (error) {
      console.error('Error during offline sync:', error);
      
      await offlineStorageService.storeSyncMetadata({
        lastSyncTime: Date.now(),
        syncStatus: 'failed',
        error: error.message,
      });
    } finally {
      this.isSyncing = false;
      this.notifyNetworkStateChange(this.isOnline);
    }
  }

  /**
   * Process individual offline action
   */
  async processOfflineAction(action) {
    try {
      console.log(`Processing offline action: ${action.type}`, action);

      let result;
      switch (action.type) {
        case 'CREATE_CLINICAL_RECORD':
          result = await this.syncCreateClinicalRecord(action);
          break;
        case 'UPDATE_CLINICAL_RECORD':
          result = await this.syncUpdateClinicalRecord(action);
          break;
        case 'DELETE_CLINICAL_RECORD':
          result = await this.syncDeleteClinicalRecord(action);
          break;
        case 'UPLOAD_DOCUMENT':
          result = await this.syncUploadDocument(action);
          break;
        case 'CREATE_APPOINTMENT':
          result = await this.syncCreateAppointment(action);
          break;
        case 'UPDATE_APPOINTMENT':
          result = await this.syncUpdateAppointment(action);
          break;
        case 'CANCEL_APPOINTMENT':
          result = await this.syncCancelAppointment(action);
          break;
        case 'CREATE_PRESCRIPTION':
          result = await this.syncCreatePrescription(action);
          break;
        case 'UPDATE_PRESCRIPTION':
          result = await this.syncUpdatePrescription(action);
          break;
        default:
          console.warn(`Unknown offline action type: ${action.type}`);
          result = { success: false, error: 'Unknown action type' };
      }

      if (result.success) {
        await offlineStorageService.removeOfflineAction(action.id);
        console.log(`Successfully processed offline action: ${action.id}`);
      } else {
        console.error(`Failed to process offline action: ${action.id}`, result.error);
        
        // Handle conflicts
        if (result.conflict) {
          await this.handleConflict(action, result);
        }
      }

      return result;
    } catch (error) {
      console.error(`Error processing offline action: ${action.id}`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle data conflicts during sync
   */
  async handleConflict(action, conflictResult) {
    const resolver = this.conflictResolvers.get(action.type);
    
    if (resolver) {
      try {
        const resolution = await resolver(action, conflictResult);
        
        if (resolution.useLocal) {
          // Force update with local data
          await this.forceUpdateWithLocalData(action);
        } else if (resolution.useServer) {
          // Accept server data and update local cache
          await this.updateLocalWithServerData(action, conflictResult.serverData);
        } else if (resolution.merge) {
          // Merge data
          await this.mergeConflictedData(action, conflictResult.serverData, resolution.mergedData);
        }
        
        await offlineStorageService.removeOfflineAction(action.id);
      } catch (error) {
        console.error('Error resolving conflict:', error);
      }
    } else {
      // Default conflict resolution: use server data
      console.log('No conflict resolver found, using server data');
      await this.updateLocalWithServerData(action, conflictResult.serverData);
      await offlineStorageService.removeOfflineAction(action.id);
    }
  }

  /**
   * Sync cached data with server
   */
  async syncCachedData() {
    try {
      // Refresh dashboard data
      await this.refreshDashboardData();
      
      // Refresh clinical records
      await this.refreshClinicalRecords();
      
      // Refresh appointments
      await this.refreshAppointments();
      
      // Refresh prescriptions
      await this.refreshPrescriptions();
      
      console.log('Cached data refreshed from server');
    } catch (error) {
      console.error('Error refreshing cached data:', error);
    }
  }

  /**
   * Refresh dashboard data from server
   */
  async refreshDashboardData() {
    try {
      const userProfile = await offlineStorageService.getUserProfile();
      if (userProfile && userProfile.role) {
        const dashboardData = await mobileApiService.getDashboardData(userProfile.role);
        await offlineStorageService.storeDashboardData(userProfile.role, dashboardData);
      }
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    }
  }

  /**
   * Refresh clinical records from server
   */
  async refreshClinicalRecords() {
    try {
      const records = await mobileApiService.getClinicalRecords({ page: 1, limit: 20 });
      await offlineStorageService.storeClinicalRecords(records, 1);
    } catch (error) {
      console.error('Error refreshing clinical records:', error);
    }
  }

  /**
   * Refresh appointments from server
   */
  async refreshAppointments() {
    try {
      const appointments = await mobileApiService.getAppointments();
      await offlineStorageService.storeAppointments(appointments);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    }
  }

  /**
   * Refresh prescriptions from server
   */
  async refreshPrescriptions() {
    try {
      const prescriptions = await mobileApiService.getPrescriptions();
      await offlineStorageService.storePrescriptions(prescriptions);
    } catch (error) {
      console.error('Error refreshing prescriptions:', error);
    }
  }

  // Sync methods for different action types
  async syncCreateClinicalRecord(action) {
    try {
      const result = await mobileApiService.createClinicalRecord(action.data);
      return { success: true, data: result };
    } catch (error) {
      if (error.response?.status === 409) {
        return { success: false, conflict: true, serverData: error.response.data };
      }
      return { success: false, error: error.message };
    }
  }

  async syncUpdateClinicalRecord(action) {
    try {
      const result = await mobileApiService.updateClinicalRecord(action.recordId, action.data);
      return { success: true, data: result };
    } catch (error) {
      if (error.response?.status === 409) {
        return { success: false, conflict: true, serverData: error.response.data };
      }
      return { success: false, error: error.message };
    }
  }

  async syncDeleteClinicalRecord(action) {
    try {
      await mobileApiService.deleteClinicalRecord(action.recordId);
      return { success: true };
    } catch (error) {
      if (error.response?.status === 404) {
        // Record already deleted, consider it successful
        return { success: true };
      }
      return { success: false, error: error.message };
    }
  }

  async syncUploadDocument(action) {
    try {
      const result = await mobileApiService.uploadDocument(action.data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncCreateAppointment(action) {
    try {
      const result = await mobileApiService.createAppointment(action.data);
      return { success: true, data: result };
    } catch (error) {
      if (error.response?.status === 409) {
        return { success: false, conflict: true, serverData: error.response.data };
      }
      return { success: false, error: error.message };
    }
  }

  async syncUpdateAppointment(action) {
    try {
      const result = await mobileApiService.updateAppointment(action.appointmentId, action.data);
      return { success: true, data: result };
    } catch (error) {
      if (error.response?.status === 409) {
        return { success: false, conflict: true, serverData: error.response.data };
      }
      return { success: false, error: error.message };
    }
  }

  async syncCancelAppointment(action) {
    try {
      await mobileApiService.cancelAppointment(action.appointmentId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncCreatePrescription(action) {
    try {
      const result = await mobileApiService.createPrescription(action.data);
      return { success: true, data: result };
    } catch (error) {
      if (error.response?.status === 409) {
        return { success: false, conflict: true, serverData: error.response.data };
      }
      return { success: false, error: error.message };
    }
  }

  async syncUpdatePrescription(action) {
    try {
      const result = await mobileApiService.updatePrescription(action.prescriptionId, action.data);
      return { success: true, data: result };
    } catch (error) {
      if (error.response?.status === 409) {
        return { success: false, conflict: true, serverData: error.response.data };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Force update with local data
   */
  async forceUpdateWithLocalData(action) {
    // Implementation depends on specific action type
    console.log('Force updating with local data:', action);
  }

  /**
   * Update local cache with server data
   */
  async updateLocalWithServerData(action, serverData) {
    // Implementation depends on specific action type
    console.log('Updating local cache with server data:', action, serverData);
  }

  /**
   * Merge conflicted data
   */
  async mergeConflictedData(action, serverData, mergedData) {
    // Implementation depends on specific action type
    console.log('Merging conflicted data:', action, serverData, mergedData);
  }

  /**
   * Get current network status
   */
  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Manually trigger sync
   */
  async manualSync() {
    if (this.isOnline) {
      await this.syncOfflineData();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    const metadata = await offlineStorageService.getSyncMetadata();
    const offlineActions = await offlineStorageService.getOfflineActions() || [];
    
    return {
      lastSyncTime: metadata?.lastSyncTime || null,
      syncStatus: metadata?.syncStatus || 'never',
      pendingActions: offlineActions.length,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
    };
  }
}

export default new DataSyncService();