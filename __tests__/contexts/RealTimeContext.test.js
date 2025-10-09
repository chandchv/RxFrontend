/**
 * Real-time Context Tests
 * 
 * Tests for the RealTimeContext provider and hook functionality.
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { RealTimeProvider, useRealTime } from '../../contexts/RealTimeContext';
import { useAuth } from '../../contexts/AuthContext';
import realTimeService from '../../services/realTimeService';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../services/realTimeService');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

// Test component to access context
const TestComponent = ({ onContextValue }) => {
  const contextValue = useRealTime();
  React.useEffect(() => {
    onContextValue(contextValue);
  }, [contextValue, onContextValue]);
  return null;
};

describe('RealTimeContext', () => {
  let mockUser;
  let mockAuthContext;
  let contextValue;
  let appStateListener;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUser = {
      id: 1,
      username: 'testuser',
      role: 'doctor'
    };

    mockAuthContext = {
      user: mockUser,
      isLoggedIn: true
    };

    useAuth.mockReturnValue(mockAuthContext);

    // Mock AppState
    AppState.addEventListener.mockImplementation((event, callback) => {
      appStateListener = callback;
      return { remove: jest.fn() };
    });

    // Mock realTimeService
    realTimeService.start.mockResolvedValue();
    realTimeService.stop.mockImplementation(() => {});
    realTimeService.addConnectionListener.mockImplementation(() => {});
    realTimeService.addErrorListener.mockImplementation(() => {});
    realTimeService.addUpdateListener.mockImplementation(() => {});
    realTimeService.getConnectionStatus.mockReturnValue({
      isActive: true,
      lastSyncTime: new Date().toISOString(),
      cacheSize: 0
    });
    realTimeService.forceRefresh.mockResolvedValue();
    realTimeService.markNotificationsRead.mockReturnValue(true);
    realTimeService.getUnreadCount.mockReturnValue(true);

    contextValue = null;
  });

  const renderProvider = (props = {}) => {
    return render(
      <RealTimeProvider {...props}>
        <TestComponent onContextValue={(value) => { contextValue = value; }} />
      </RealTimeProvider>
    );
  };

  describe('Provider Initialization', () => {
    test('should initialize real-time service when user is logged in', async () => {
      await act(async () => {
        renderProvider();
      });

      await waitFor(() => {
        expect(realTimeService.start).toHaveBeenCalled();
      });
    });

    test('should not initialize when user is not logged in', async () => {
      useAuth.mockReturnValue({
        user: null,
        isLoggedIn: false
      });

      await act(async () => {
        renderProvider();
      });

      expect(realTimeService.start).not.toHaveBeenCalled();
    });

    test('should stop service when user logs out', async () => {
      const { rerender } = await act(async () => {
        return renderProvider();
      });

      await waitFor(() => {
        expect(realTimeService.start).toHaveBeenCalled();
      });

      // Simulate logout
      useAuth.mockReturnValue({
        user: null,
        isLoggedIn: false
      });

      await act(async () => {
        rerender(
          <RealTimeProvider>
            <TestComponent onContextValue={(value) => { contextValue = value; }} />
          </RealTimeProvider>
        );
      });

      expect(realTimeService.stop).toHaveBeenCalled();
    });
  });

  describe('App State Handling', () => {
    test('should handle app coming to foreground', async () => {
      await act(async () => {
        renderProvider();
      });

      await waitFor(() => {
        expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });

      // Simulate app going to background then foreground
      act(() => {
        appStateListener('background');
        appStateListener('active');
      });

      // Should attempt to reconnect when coming to foreground
      expect(realTimeService.start).toHaveBeenCalledTimes(2);
    });

    test('should not reconnect if already connected', async () => {
      await act(async () => {
        renderProvider();
      });

      // Set connected state
      act(() => {
        contextValue.handleConnectionChange(true);
      });

      // Simulate app state change
      act(() => {
        appStateListener('active');
      });

      // Should not start again if already connected
      expect(realTimeService.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection Management', () => {
    test('should handle connection status changes', async () => {
      await act(async () => {
        renderProvider();
      });

      await waitFor(() => {
        expect(contextValue).toBeTruthy();
      });

      // Simulate connection established
      act(() => {
        const connectionListener = realTimeService.addConnectionListener.mock.calls[0][0];
        connectionListener(true);
      });

      expect(contextValue.isConnected).toBe(true);
      expect(contextValue.connectionError).toBe(null);
    });

    test('should handle connection errors', async () => {
      await act(async () => {
        renderProvider();
      });

      await waitFor(() => {
        expect(contextValue).toBeTruthy();
      });

      const testError = new Error('Connection failed');

      // Simulate connection error
      act(() => {
        const errorListener = realTimeService.addErrorListener.mock.calls[0][0];
        errorListener(testError);
      });

      expect(contextValue.connectionError).toBe('Connection failed');
      expect(contextValue.isConnected).toBe(false);
    });
  });

  describe('Data Updates', () => {
    beforeEach(async () => {
      await act(async () => {
        renderProvider();
      });

      await waitFor(() => {
        expect(contextValue).toBeTruthy();
      });
    });

    test('should handle dashboard metrics updates', () => {
      const updateData = {
        total_patients: 150,
        appointments_today: 12
      };

      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'dashboard_metrics')[1];
        updateListener(updateData);
      });

      expect(contextValue.dashboardMetrics).toMatchObject(updateData);
      expect(contextValue.loading.dashboard).toBe(false);
    });

    test('should handle clinical records create updates', () => {
      const updateData = {
        action: 'create',
        record: {
          id: 1,
          patient_name: 'John Doe',
          record_type: 'consultation'
        }
      };

      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'clinical_records')[1];
        updateListener(updateData);
      });

      expect(contextValue.clinicalRecords.records).toHaveLength(1);
      expect(contextValue.clinicalRecords.records[0]).toMatchObject(updateData.record);
      expect(contextValue.clinicalRecords.total_count).toBe(1);
    });

    test('should handle clinical records update', () => {
      // First create a record
      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'clinical_records')[1];
        updateListener({
          action: 'create',
          record: { id: 1, patient_name: 'John Doe', status: 'pending' }
        });
      });

      // Then update it
      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'clinical_records')[1];
        updateListener({
          action: 'update',
          record: { id: 1, status: 'completed' }
        });
      });

      expect(contextValue.clinicalRecords.records[0].status).toBe('completed');
    });

    test('should handle clinical records delete', () => {
      // First create a record
      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'clinical_records')[1];
        updateListener({
          action: 'create',
          record: { id: 1, patient_name: 'John Doe' }
        });
      });

      // Then delete it
      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'clinical_records')[1];
        updateListener({
          action: 'delete',
          record_id: 1
        });
      });

      expect(contextValue.clinicalRecords.records).toHaveLength(0);
      expect(contextValue.clinicalRecords.total_count).toBe(0);
    });

    test('should handle appointments updates', () => {
      const updateData = {
        action: 'create',
        appointment: {
          id: 1,
          patient_name: 'Jane Smith',
          status: 'scheduled'
        }
      };

      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'appointments')[1];
        updateListener(updateData);
      });

      expect(contextValue.appointments.appointments).toHaveLength(1);
      expect(contextValue.appointments.appointments[0]).toMatchObject(updateData.appointment);
    });

    test('should handle appointment cancellation', () => {
      // First create an appointment
      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'appointments')[1];
        updateListener({
          action: 'create',
          appointment: { id: 1, status: 'scheduled' }
        });
      });

      // Then cancel it
      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'appointments')[1];
        updateListener({
          action: 'cancel',
          appointment_id: 1,
          cancelled_at: new Date().toISOString()
        });
      });

      expect(contextValue.appointments.appointments[0].status).toBe('cancelled');
    });

    test('should handle notifications updates', () => {
      const updateData = {
        action: 'create',
        notification: {
          id: 1,
          title: 'New Appointment',
          is_read: false
        }
      };

      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'notifications')[1];
        updateListener(updateData);
      });

      expect(contextValue.notifications.notifications).toHaveLength(1);
      expect(contextValue.notifications.unread_count).toBe(1);
      expect(contextValue.unreadNotificationCount).toBe(1);
    });

    test('should handle mark notifications as read', () => {
      // First create notifications
      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'notifications')[1];
        updateListener({
          action: 'create',
          notification: { id: 1, is_read: false }
        });
        updateListener({
          action: 'create',
          notification: { id: 2, is_read: false }
        });
      });

      // Then mark as read
      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'notifications')[1];
        updateListener({
          action: 'mark_read',
          notification_ids: [1, 2]
        });
      });

      expect(contextValue.notifications.notifications[0].is_read).toBe(true);
      expect(contextValue.notifications.notifications[1].is_read).toBe(true);
      expect(contextValue.notifications.unread_count).toBe(0);
    });

    test('should handle alerts updates', () => {
      const updateData = {
        action: 'create',
        alert: {
          id: 1,
          title: 'System Alert',
          message: 'Maintenance scheduled'
        }
      };

      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'alerts')[1];
        updateListener(updateData);
      });

      expect(contextValue.alerts.alerts).toHaveLength(1);
      expect(contextValue.activeAlertCount).toBe(1);
    });
  });

  describe('Context Actions', () => {
    beforeEach(async () => {
      await act(async () => {
        renderProvider();
      });

      await waitFor(() => {
        expect(contextValue).toBeTruthy();
      });
    });

    test('should force refresh data', async () => {
      await act(async () => {
        await contextValue.forceRefresh(['dashboard_metrics']);
      });

      expect(realTimeService.forceRefresh).toHaveBeenCalledWith(['dashboard_metrics']);
    });

    test('should handle force refresh errors', async () => {
      const error = new Error('Refresh failed');
      realTimeService.forceRefresh.mockRejectedValue(error);

      await act(async () => {
        await expect(contextValue.forceRefresh()).rejects.toThrow('Refresh failed');
      });
    });

    test('should reconnect service', async () => {
      await act(async () => {
        await contextValue.reconnect();
      });

      // Should be called during reconnect process
      expect(realTimeService.start).toHaveBeenCalled();
    });

    test('should mark notifications as read', async () => {
      const notificationIds = [1, 2, 3];

      await act(async () => {
        await contextValue.markNotificationsRead(notificationIds);
      });

      expect(realTimeService.markNotificationsRead).toHaveBeenCalledWith(notificationIds);
    });

    test('should get unread count', () => {
      contextValue.getUnreadCount();
      expect(realTimeService.getUnreadCount).toHaveBeenCalled();
    });

    test('should get connection status', () => {
      const status = contextValue.getConnectionStatus();
      
      expect(status).toMatchObject({
        isConnected: expect.any(Boolean),
        isConnecting: expect.any(Boolean),
        connectionError: null,
        lastSyncTime: null,
        isActive: true,
        cacheSize: 0
      });
    });
  });

  describe('Computed Values', () => {
    beforeEach(async () => {
      await act(async () => {
        renderProvider();
      });

      await waitFor(() => {
        expect(contextValue).toBeTruthy();
      });
    });

    test('should compute hasData correctly', () => {
      expect(contextValue.hasData).toBe(false);

      act(() => {
        const updateListener = realTimeService.addUpdateListener.mock.calls
          .find(call => call[0] === 'dashboard_metrics')[1];
        updateListener({ total_patients: 150 });
      });

      expect(contextValue.hasData).toBe(true);
    });

    test('should compute isLoading correctly', () => {
      expect(contextValue.isLoading).toBe(false);

      // Simulate loading state
      act(() => {
        contextValue.loading.dashboard = true;
      });

      expect(contextValue.isLoading).toBe(true);
    });

    test('should compute canReceiveUpdates correctly', () => {
      expect(contextValue.canReceiveUpdates).toBe(false);

      // Simulate connected state
      act(() => {
        const connectionListener = realTimeService.addConnectionListener.mock.calls[0][0];
        connectionListener(true);
      });

      expect(contextValue.canReceiveUpdates).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should throw error when used outside provider', () => {
      const TestComponentWithoutProvider = () => {
        useRealTime();
        return null;
      };

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useRealTime must be used within a RealTimeProvider');
    });

    test('should handle service initialization errors', async () => {
      const error = new Error('Service initialization failed');
      realTimeService.start.mockRejectedValue(error);

      await act(async () => {
        renderProvider();
      });

      await waitFor(() => {
        expect(contextValue.connectionError).toBe('Service initialization failed');
        expect(contextValue.isConnecting).toBe(false);
      });
    });
  });
});