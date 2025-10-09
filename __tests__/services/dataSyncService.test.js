import NetInfo from '@react-native-community/netinfo';
import dataSyncService from '../../services/dataSyncService';
import offlineStorageService from '../../services/offlineStorageService';
import mobileApiService from '../../services/mobileApiService';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('../../services/offlineStorageService');
jest.mock('../../services/mobileApiService');

describe('DataSyncService', () => {
  let mockNetworkListener;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock NetInfo
    mockNetworkListener = jest.fn();
    NetInfo.addEventListener.mockImplementation((listener) => {
      mockNetworkListener = listener;
      return jest.fn(); // unsubscribe function
    });
    
    // Reset service state
    dataSyncService.isOnline = true;
    dataSyncService.isSyncing = false;
    dataSyncService.syncListeners = [];
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('Network State Management', () => {
    it('should initialize network listener', () => {
      expect(NetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should handle network state changes', () => {
      const listener = jest.fn();
      dataSyncService.addNetworkListener(listener);
      
      // Simulate network state change
      mockNetworkListener({
        isConnected: false,
        type: 'none',
        isInternetReachable: false,
      });
      
      expect(listener).toHaveBeenCalledWith({
        isOnline: false,
        isSyncing: false,
      });
    });

    it('should trigger sync when coming back online', async () => {
      // Mock offline actions
      offlineStorageService.getOfflineActions.mockResolvedValue([
        { id: '1', type: 'CREATE_RECORD', data: { title: 'Test' } }
      ]);
      offlineStorageService.clearOfflineActions.mockResolvedValue();
      offlineStorageService.storeSyncMetadata.mockResolvedValue();
      
      // Start offline
      dataSyncService.isOnline = false;
      
      // Come back online
      mockNetworkListener({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      });
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(offlineStorageService.getOfflineActions).toHaveBeenCalled();
    });

    it('should add and remove network listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const unsubscribe1 = dataSyncService.addNetworkListener(listener1);
      const unsubscribe2 = dataSyncService.addNetworkListener(listener2);
      
      expect(dataSyncService.syncListeners).toHaveLength(2);
      
      unsubscribe1();
      expect(dataSyncService.syncListeners).toHaveLength(1);
      
      unsubscribe2();
      expect(dataSyncService.syncListeners).toHaveLength(0);
    });
  });

  describe('Offline Data Synchronization', () => {
    beforeEach(() => {
      dataSyncService.isOnline = true;
      dataSyncService.isSyncing = false;
    });

    it('should sync offline actions when connection is restored', async () => {
      const offlineActions = [
        { id: '1', type: 'CREATE_CLINICAL_RECORD', data: { title: 'Test Record' } },
        { id: '2', type: 'UPDATE_APPOINTMENT', appointmentId: '123', data: { status: 'confirmed' } },
      ];
      
      offlineStorageService.getOfflineActions.mockResolvedValue(offlineActions);
      offlineStorageService.removeOfflineAction.mockResolvedValue();
      offlineStorageService.clearOfflineActions.mockResolvedValue();
      offlineStorageService.storeSyncMetadata.mockResolvedValue();
      
      mobileApiService.createClinicalRecord.mockResolvedValue({ id: 'new-record-id' });
      mobileApiService.updateAppointment.mockResolvedValue({ id: '123' });
      
      await dataSyncService.syncOfflineData();
      
      expect(mobileApiService.createClinicalRecord).toHaveBeenCalledWith({ title: 'Test Record' });
      expect(mobileApiService.updateAppointment).toHaveBeenCalledWith('123', { status: 'confirmed' });
      expect(offlineStorageService.clearOfflineActions).toHaveBeenCalled();
      expect(offlineStorageService.storeSyncMetadata).toHaveBeenCalledWith({
        lastSyncTime: expect.any(Number),
        syncStatus: 'completed',
        actionsProcessed: 2,
      });
    });

    it('should not sync when already syncing', async () => {
      dataSyncService.isSyncing = true;
      
      await dataSyncService.syncOfflineData();
      
      expect(offlineStorageService.getOfflineActions).not.toHaveBeenCalled();
    });

    it('should not sync when offline', async () => {
      dataSyncService.isOnline = false;
      
      await dataSyncService.syncOfflineData();
      
      expect(offlineStorageService.getOfflineActions).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      const offlineActions = [
        { id: '1', type: 'CREATE_CLINICAL_RECORD', data: { title: 'Test Record' } },
      ];
      
      offlineStorageService.getOfflineActions.mockResolvedValue(offlineActions);
      mobileApiService.createClinicalRecord.mockRejectedValue(new Error('API Error'));
      offlineStorageService.storeSyncMetadata.mockResolvedValue();
      
      await dataSyncService.syncOfflineData();
      
      expect(offlineStorageService.storeSyncMetadata).toHaveBeenCalledWith({
        lastSyncTime: expect.any(Number),
        syncStatus: 'failed',
        error: 'API Error',
      });
    });
  });

  describe('Offline Action Processing', () => {
    it('should process CREATE_CLINICAL_RECORD action', async () => {
      const action = {
        id: '1',
        type: 'CREATE_CLINICAL_RECORD',
        data: { title: 'Test Record' },
      };
      
      mobileApiService.createClinicalRecord.mockResolvedValue({ id: 'new-record-id' });
      offlineStorageService.removeOfflineAction.mockResolvedValue();
      
      const result = await dataSyncService.processOfflineAction(action);
      
      expect(result.success).toBe(true);
      expect(mobileApiService.createClinicalRecord).toHaveBeenCalledWith({ title: 'Test Record' });
      expect(offlineStorageService.removeOfflineAction).toHaveBeenCalledWith('1');
    });

    it('should process UPDATE_CLINICAL_RECORD action', async () => {
      const action = {
        id: '2',
        type: 'UPDATE_CLINICAL_RECORD',
        recordId: 'record-123',
        data: { title: 'Updated Record' },
      };
      
      mobileApiService.updateClinicalRecord.mockResolvedValue({ id: 'record-123' });
      offlineStorageService.removeOfflineAction.mockResolvedValue();
      
      const result = await dataSyncService.processOfflineAction(action);
      
      expect(result.success).toBe(true);
      expect(mobileApiService.updateClinicalRecord).toHaveBeenCalledWith('record-123', { title: 'Updated Record' });
    });

    it('should handle API conflicts', async () => {
      const action = {
        id: '3',
        type: 'UPDATE_CLINICAL_RECORD',
        recordId: 'record-123',
        data: { title: 'Updated Record' },
      };
      
      const conflictError = {
        response: {
          status: 409,
          data: { serverData: { title: 'Server Version' } },
        },
      };
      
      mobileApiService.updateClinicalRecord.mockRejectedValue(conflictError);
      
      const result = await dataSyncService.processOfflineAction(action);
      
      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
      expect(result.serverData).toEqual({ serverData: { title: 'Server Version' } });
    });

    it('should handle unknown action types', async () => {
      const action = {
        id: '4',
        type: 'UNKNOWN_ACTION',
        data: {},
      };
      
      const result = await dataSyncService.processOfflineAction(action);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown action type');
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle conflicts with resolver', async () => {
      const action = {
        id: '5',
        type: 'UPDATE_CLINICAL_RECORD',
        recordId: 'record-123',
        data: { title: 'Local Version' },
      };
      
      const conflictResult = {
        conflict: true,
        serverData: { title: 'Server Version' },
      };
      
      const mockResolver = jest.fn().mockResolvedValue({ useLocal: true });
      dataSyncService.addConflictResolver('UPDATE_CLINICAL_RECORD', mockResolver);
      
      offlineStorageService.removeOfflineAction.mockResolvedValue();
      
      await dataSyncService.handleConflict(action, conflictResult);
      
      expect(mockResolver).toHaveBeenCalledWith(action, conflictResult);
      expect(offlineStorageService.removeOfflineAction).toHaveBeenCalledWith('5');
    });

    it('should use default resolution when no resolver exists', async () => {
      const action = {
        id: '6',
        type: 'UPDATE_CLINICAL_RECORD',
        recordId: 'record-123',
        data: { title: 'Local Version' },
      };
      
      const conflictResult = {
        conflict: true,
        serverData: { title: 'Server Version' },
      };
      
      offlineStorageService.removeOfflineAction.mockResolvedValue();
      
      await dataSyncService.handleConflict(action, conflictResult);
      
      expect(offlineStorageService.removeOfflineAction).toHaveBeenCalledWith('6');
    });
  });

  describe('Cache Refresh', () => {
    it('should refresh all cached data', async () => {
      const userProfile = { role: 'doctor' };
      const dashboardData = { metrics: [] };
      const clinicalRecords = { results: [] };
      const appointments = [];
      const prescriptions = [];
      
      offlineStorageService.getUserProfile.mockResolvedValue(userProfile);
      offlineStorageService.storeDashboardData.mockResolvedValue();
      offlineStorageService.storeClinicalRecords.mockResolvedValue();
      offlineStorageService.storeAppointments.mockResolvedValue();
      offlineStorageService.storePrescriptions.mockResolvedValue();
      
      mobileApiService.getDashboardData.mockResolvedValue(dashboardData);
      mobileApiService.getClinicalRecords.mockResolvedValue(clinicalRecords);
      mobileApiService.getAppointments.mockResolvedValue(appointments);
      mobileApiService.getPrescriptions.mockResolvedValue(prescriptions);
      
      await dataSyncService.syncCachedData();
      
      expect(mobileApiService.getDashboardData).toHaveBeenCalledWith('doctor');
      expect(mobileApiService.getClinicalRecords).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(mobileApiService.getAppointments).toHaveBeenCalled();
      expect(mobileApiService.getPrescriptions).toHaveBeenCalled();
      
      expect(offlineStorageService.storeDashboardData).toHaveBeenCalledWith('doctor', dashboardData);
      expect(offlineStorageService.storeClinicalRecords).toHaveBeenCalledWith(clinicalRecords, 1);
      expect(offlineStorageService.storeAppointments).toHaveBeenCalledWith(appointments);
      expect(offlineStorageService.storePrescriptions).toHaveBeenCalledWith(prescriptions);
    });
  });

  describe('Manual Sync', () => {
    it('should allow manual sync when online', async () => {
      dataSyncService.isOnline = true;
      offlineStorageService.getOfflineActions.mockResolvedValue([]);
      offlineStorageService.clearOfflineActions.mockResolvedValue();
      offlineStorageService.storeSyncMetadata.mockResolvedValue();
      
      await dataSyncService.manualSync();
      
      expect(offlineStorageService.getOfflineActions).toHaveBeenCalled();
    });

    it('should throw error when trying to sync offline', async () => {
      dataSyncService.isOnline = false;
      
      await expect(dataSyncService.manualSync()).rejects.toThrow('Cannot sync while offline');
    });
  });

  describe('Sync Statistics', () => {
    it('should return sync statistics', async () => {
      const metadata = {
        lastSyncTime: Date.now(),
        syncStatus: 'completed',
      };
      const offlineActions = [{ id: '1' }, { id: '2' }];
      
      offlineStorageService.getSyncMetadata.mockResolvedValue(metadata);
      offlineStorageService.getOfflineActions.mockResolvedValue(offlineActions);
      
      dataSyncService.isOnline = true;
      dataSyncService.isSyncing = false;
      
      const stats = await dataSyncService.getSyncStats();
      
      expect(stats).toEqual({
        lastSyncTime: metadata.lastSyncTime,
        syncStatus: 'completed',
        pendingActions: 2,
        isOnline: true,
        isSyncing: false,
      });
    });

    it('should handle missing metadata', async () => {
      offlineStorageService.getSyncMetadata.mockResolvedValue(null);
      offlineStorageService.getOfflineActions.mockResolvedValue([]);
      
      const stats = await dataSyncService.getSyncStats();
      
      expect(stats.lastSyncTime).toBeNull();
      expect(stats.syncStatus).toBe('never');
    });
  });

  describe('Network Status', () => {
    it('should return current network status', () => {
      dataSyncService.isOnline = true;
      dataSyncService.isSyncing = false;
      
      const status = dataSyncService.getNetworkStatus();
      
      expect(status).toEqual({
        isOnline: true,
        isSyncing: false,
      });
    });
  });
});