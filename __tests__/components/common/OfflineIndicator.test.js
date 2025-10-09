import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import OfflineIndicator from '../../../components/common/OfflineIndicator';
import dataSyncService from '../../../services/dataSyncService';

// Mock dependencies
jest.mock('../../../services/dataSyncService');

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      timing: jest.fn(() => ({
        start: jest.fn(),
      })),
      Value: jest.fn(() => ({
        _value: 0,
      })),
    },
  };
});

const renderWithProvider = (component) => {
  return render(
    <PaperProvider>
      {component}
    </PaperProvider>
  );
};

describe('OfflineIndicator', () => {
  let mockNetworkListener;
  let mockUnsubscribe;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUnsubscribe = jest.fn();
    mockNetworkListener = null;
    
    dataSyncService.addNetworkListener.mockImplementation((listener) => {
      mockNetworkListener = listener;
      return mockUnsubscribe;
    });
    
    dataSyncService.getSyncStats.mockResolvedValue({
      lastSyncTime: Date.now() - 60000, // 1 minute ago
      syncStatus: 'completed',
      pendingActions: 0,
      isOnline: true,
      isSyncing: false,
    });
    
    dataSyncService.manualSync.mockResolvedValue();
  });

  it('should render nothing when online and not syncing', () => {
    const { queryByText } = renderWithProvider(<OfflineIndicator />);
    
    expect(queryByText(/offline/i)).toBeNull();
    expect(queryByText(/syncing/i)).toBeNull();
  });

  it('should show offline indicator when offline', async () => {
    const { getByText } = renderWithProvider(<OfflineIndicator />);
    
    // Simulate going offline
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: false, isSyncing: false });
    }
    
    await waitFor(() => {
      expect(getByText(/offline/i)).toBeTruthy();
    });
  });

  it('should show syncing indicator when syncing', async () => {
    const { getByText } = renderWithProvider(<OfflineIndicator />);
    
    // Simulate syncing
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: true, isSyncing: true });
    }
    
    await waitFor(() => {
      expect(getByText(/syncing/i)).toBeTruthy();
    });
  });

  it('should show connection restored message when back online', async () => {
    const { getByText } = renderWithProvider(<OfflineIndicator />);
    
    // Simulate coming back online after syncing
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: true, isSyncing: false });
    }
    
    await waitFor(() => {
      expect(getByText(/connection restored/i)).toBeTruthy();
    });
  });

  it('should show details when details button is pressed', async () => {
    const { getByText, queryByText } = renderWithProvider(<OfflineIndicator />);
    
    // Go offline to show the indicator
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: false, isSyncing: false });
    }
    
    await waitFor(() => {
      expect(getByText(/offline/i)).toBeTruthy();
    });
    
    // Press details button
    const detailsButton = getByText('Details');
    fireEvent.press(detailsButton);
    
    await waitFor(() => {
      expect(getByText('Last Sync:')).toBeTruthy();
      expect(getByText('Status:')).toBeTruthy();
    });
  });

  it('should hide details when hide details button is pressed', async () => {
    const { getByText, queryByText } = renderWithProvider(<OfflineIndicator />);
    
    // Go offline and show details
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: false, isSyncing: false });
    }
    
    await waitFor(() => {
      const detailsButton = getByText('Details');
      fireEvent.press(detailsButton);
    });
    
    await waitFor(() => {
      expect(getByText('Last Sync:')).toBeTruthy();
    });
    
    // Hide details
    const hideDetailsButton = getByText('Hide Details');
    fireEvent.press(hideDetailsButton);
    
    await waitFor(() => {
      expect(queryByText('Last Sync:')).toBeNull();
    });
  });

  it('should trigger manual sync when sync now button is pressed', async () => {
    const { getByText } = renderWithProvider(<OfflineIndicator />);
    
    // Show connection restored state
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: true, isSyncing: false });
    }
    
    await waitFor(() => {
      const syncButton = getByText('Sync Now');
      fireEvent.press(syncButton);
    });
    
    expect(dataSyncService.manualSync).toHaveBeenCalled();
  });

  it('should not show sync now button when offline', async () => {
    const { queryByText } = renderWithProvider(<OfflineIndicator />);
    
    // Go offline
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: false, isSyncing: false });
    }
    
    await waitFor(() => {
      expect(queryByText('Sync Now')).toBeNull();
    });
  });

  it('should not show sync now button when syncing', async () => {
    const { queryByText } = renderWithProvider(<OfflineIndicator />);
    
    // Start syncing
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: true, isSyncing: true });
    }
    
    await waitFor(() => {
      expect(queryByText('Sync Now')).toBeNull();
    });
  });

  it('should format last sync time correctly', async () => {
    const now = Date.now();
    
    // Test different time formats
    const testCases = [
      { timestamp: null, expected: 'Never' },
      { timestamp: now, expected: 'Just now' },
      { timestamp: now - 30000, expected: 'Just now' }, // 30 seconds ago
      { timestamp: now - 120000, expected: '2m ago' }, // 2 minutes ago
      { timestamp: now - 3600000, expected: '1h ago' }, // 1 hour ago
      { timestamp: now - 86400000, expected: '1d ago' }, // 1 day ago
    ];
    
    for (const testCase of testCases) {
      dataSyncService.getSyncStats.mockResolvedValue({
        lastSyncTime: testCase.timestamp,
        syncStatus: 'completed',
        pendingActions: 0,
        isOnline: false,
        isSyncing: false,
      });
      
      const { getByText, rerender } = renderWithProvider(<OfflineIndicator />);
      
      // Go offline to show indicator
      if (mockNetworkListener) {
        mockNetworkListener({ isOnline: false, isSyncing: false });
      }
      
      await waitFor(() => {
        const detailsButton = getByText('Details');
        fireEvent.press(detailsButton);
      });
      
      await waitFor(() => {
        expect(getByText(testCase.expected)).toBeTruthy();
      });
    }
  });

  it('should show pending actions count when available', async () => {
    dataSyncService.getSyncStats.mockResolvedValue({
      lastSyncTime: Date.now(),
      syncStatus: 'completed',
      pendingActions: 3,
      isOnline: false,
      isSyncing: false,
    });
    
    const { getByText } = renderWithProvider(<OfflineIndicator />);
    
    // Go offline and show details
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: false, isSyncing: false });
    }
    
    await waitFor(() => {
      const detailsButton = getByText('Details');
      fireEvent.press(detailsButton);
    });
    
    await waitFor(() => {
      expect(getByText('Pending Actions:')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });
  });

  it('should not show pending actions when count is zero', async () => {
    dataSyncService.getSyncStats.mockResolvedValue({
      lastSyncTime: Date.now(),
      syncStatus: 'completed',
      pendingActions: 0,
      isOnline: false,
      isSyncing: false,
    });
    
    const { getByText, queryByText } = renderWithProvider(<OfflineIndicator />);
    
    // Go offline and show details
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: false, isSyncing: false });
    }
    
    await waitFor(() => {
      const detailsButton = getByText('Details');
      fireEvent.press(detailsButton);
    });
    
    await waitFor(() => {
      expect(queryByText('Pending Actions:')).toBeNull();
    });
  });

  it('should show appropriate status colors', async () => {
    const testCases = [
      { status: 'completed', shouldHaveSuccessStyle: true },
      { status: 'failed', shouldHaveErrorStyle: true },
      { status: 'never', shouldHaveNormalStyle: true },
    ];
    
    for (const testCase of testCases) {
      dataSyncService.getSyncStats.mockResolvedValue({
        lastSyncTime: Date.now(),
        syncStatus: testCase.status,
        pendingActions: 0,
        isOnline: false,
        isSyncing: false,
      });
      
      const { getByText } = renderWithProvider(<OfflineIndicator />);
      
      // Go offline and show details
      if (mockNetworkListener) {
        mockNetworkListener({ isOnline: false, isSyncing: false });
      }
      
      await waitFor(() => {
        const detailsButton = getByText('Details');
        fireEvent.press(detailsButton);
      });
      
      await waitFor(() => {
        const statusText = getByText(testCase.status);
        expect(statusText).toBeTruthy();
        // Note: Testing styles would require more complex setup
      });
    }
  });

  it('should unsubscribe from network listener on unmount', () => {
    const { unmount } = renderWithProvider(<OfflineIndicator />);
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle sync stats loading errors gracefully', async () => {
    dataSyncService.getSyncStats.mockRejectedValue(new Error('Stats error'));
    
    const { getByText } = renderWithProvider(<OfflineIndicator />);
    
    // Go offline
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: false, isSyncing: false });
    }
    
    await waitFor(() => {
      expect(getByText(/offline/i)).toBeTruthy();
    });
    
    // Should not crash when trying to show details
    const detailsButton = getByText('Details');
    fireEvent.press(detailsButton);
    
    // Should still show the indicator
    expect(getByText(/offline/i)).toBeTruthy();
  });

  it('should handle manual sync errors gracefully', async () => {
    dataSyncService.manualSync.mockRejectedValue(new Error('Sync error'));
    
    const { getByText } = renderWithProvider(<OfflineIndicator />);
    
    // Show connection restored state
    if (mockNetworkListener) {
      mockNetworkListener({ isOnline: true, isSyncing: false });
    }
    
    await waitFor(() => {
      const syncButton = getByText('Sync Now');
      fireEvent.press(syncButton);
    });
    
    // Should not crash
    expect(dataSyncService.manualSync).toHaveBeenCalled();
  });
});