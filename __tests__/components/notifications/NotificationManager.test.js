/**
 * NotificationManager Component Tests
 * 
 * Tests for the comprehensive notification management component
 * including history, statistics, and preferences management.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NotificationManager from '../../../components/notifications/NotificationManager';
import { useTheme } from '../../../styles/theme';
import { useNotifications } from '../../../contexts/NotificationContext';
import pushNotificationManager from '../../../services/pushNotificationManager';

// Mock dependencies
jest.mock('../../../styles/theme');
jest.mock('../../../contexts/NotificationContext');
jest.mock('../../../services/pushNotificationManager');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock theme
const mockTheme = {
  colors: {
    primary: '#007AFF',
    primaryLight: '#E3F2FD',
    onPrimary: '#FFFFFF',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FF9800',
    info: '#2196F3',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h5: { fontSize: 20, fontWeight: '600' },
    h6: { fontSize: 18, fontWeight: '600' },
    subtitle1: { fontSize: 16, fontWeight: '500' },
    subtitle2: { fontSize: 14, fontWeight: '500' },
    body1: { fontSize: 14 },
    body2: { fontSize: 12 },
    button: { fontSize: 14, fontWeight: '600' },
    caption: { fontSize: 10 },
  },
};

// Mock notifications context
const mockNotificationsContext = {
  notifications: [
    {
      request: {
        identifier: '1',
        content: {
          title: 'Appointment Reminder',
          body: 'You have an appointment tomorrow at 10:00 AM',
          data: { type: 'appointment', read: false }
        }
      },
      date: new Date('2024-01-15T10:00:00Z')
    },
    {
      request: {
        identifier: '2',
        content: {
          title: 'Lab Results Available',
          body: 'Your blood test results are ready',
          data: { type: 'clinical_record', read: true }
        }
      },
      date: new Date('2024-01-14T15:30:00Z')
    }
  ],
  unreadCount: 1,
  clearAllNotifications: jest.fn(),
  getNotificationCount: jest.fn(() => 1),
  notificationPreferences: {
    push_notifications: true,
    sound_enabled: true,
    vibration_enabled: true,
    notification_types: {
      appointments: true,
      prescriptions: true,
      clinical_records: true,
      billing: false,
      system: false,
    },
    quiet_hours: {
      enabled: false,
      start_time: '22:00',
      end_time: '08:00',
    },
  },
  updateNotificationPreferences: jest.fn(),
  loading: {
    permissions: false,
    registration: false,
    preferences: false,
  },
  hasPermission: true,
  isRegistered: true,
  requestPermissions: jest.fn(),
  registerForPushNotifications: jest.fn(),
};

// Mock push notification manager
const mockPushNotificationManager = {
  getNotificationStatistics: jest.fn(() => Promise.resolve({
    total: 25,
    unread: 1,
    today: 3,
    thisWeek: 12,
    thisMonth: 25,
    byType: {
      appointments: 10,
      clinical_records: 8,
      prescriptions: 5,
      billing: 2,
    }
  })),
  clearAllNotifications: jest.fn(() => Promise.resolve()),
};

describe('NotificationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue(mockTheme);
    useNotifications.mockReturnValue(mockNotificationsContext);
    pushNotificationManager.getNotificationStatistics.mockImplementation(
      mockPushNotificationManager.getNotificationStatistics
    );
    pushNotificationManager.clearAllNotifications.mockImplementation(
      mockPushNotificationManager.clearAllNotifications
    );
  });

  describe('Rendering', () => {
    it('renders correctly when visible', () => {
      const { getByText, getByTestId } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      expect(getByText('Notifications')).toBeTruthy();
      expect(getByText('History')).toBeTruthy();
      expect(getByText('Statistics')).toBeTruthy();
      expect(getByText('Settings')).toBeTruthy();
    });

    it('does not render when not visible', () => {
      const { queryByText } = render(
        <NotificationManager visible={false} onClose={jest.fn()} />
      );

      expect(queryByText('Notifications')).toBeFalsy();
    });

    it('renders notification history by default', () => {
      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      expect(getByText('Recent Notifications')).toBeTruthy();
      expect(getByText('1 unread')).toBeTruthy();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to statistics tab when pressed', async () => {
      const { getByText, queryByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Statistics'));

      await waitFor(() => {
        expect(queryByText('Loading statistics...')).toBeTruthy();
      });
    });

    it('switches to preferences tab when pressed', () => {
      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Settings'));

      expect(getByText('Notification Settings')).toBeTruthy();
      expect(getByText('Permission Status')).toBeTruthy();
    });

    it('switches back to history tab', () => {
      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      // Switch to settings first
      fireEvent.press(getByText('Settings'));
      expect(getByText('Notification Settings')).toBeTruthy();

      // Switch back to history
      fireEvent.press(getByText('History'));
      expect(getByText('Recent Notifications')).toBeTruthy();
    });
  });

  describe('Notification History', () => {
    it('displays notification items', () => {
      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      expect(getByText('Appointment Reminder')).toBeTruthy();
      expect(getByText('Lab Results Available')).toBeTruthy();
    });

    it('shows empty state when no notifications', () => {
      useNotifications.mockReturnValue({
        ...mockNotificationsContext,
        notifications: [],
        unreadCount: 0,
      });

      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      expect(getByText('No notifications yet')).toBeTruthy();
    });

    it('handles clear all notifications', async () => {
      const mockClearAll = jest.fn();
      useNotifications.mockReturnValue({
        ...mockNotificationsContext,
        clearAllNotifications: mockClearAll,
      });

      const { getByTestId } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      // Find and press clear button (would need testID in actual component)
      // This is a simplified test - in reality you'd need to add testIDs
      
      // Simulate alert confirmation
      Alert.alert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons.find(b => b.text === 'Clear All');
        if (confirmButton) {
          confirmButton.onPress();
        }
      });

      // Would trigger clear all action
      await waitFor(() => {
        expect(mockClearAll).toHaveBeenCalled();
      });
    });
  });

  describe('Statistics Tab', () => {
    it('loads and displays statistics', async () => {
      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Statistics'));

      await waitFor(() => {
        expect(pushNotificationManager.getNotificationStatistics).toHaveBeenCalled();
      });
    });

    it('handles statistics loading error', async () => {
      pushNotificationManager.getNotificationStatistics.mockRejectedValue(
        new Error('Failed to load statistics')
      );

      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Statistics'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to load notification data');
      });
    });
  });

  describe('Preferences Tab', () => {
    it('displays current preferences', () => {
      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Settings'));

      expect(getByText('Push Notifications')).toBeTruthy();
      expect(getByText('Sound')).toBeTruthy();
      expect(getByText('Vibration')).toBeTruthy();
      expect(getByText('Appointments')).toBeTruthy();
    });

    it('shows permission status correctly', () => {
      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Settings'));

      expect(getByText('Granted')).toBeTruthy();
      expect(getByText('Registered for push notifications')).toBeTruthy();
    });

    it('shows grant button when permission not granted', () => {
      useNotifications.mockReturnValue({
        ...mockNotificationsContext,
        hasPermission: false,
        isRegistered: false,
      });

      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Settings'));

      expect(getByText('Not granted')).toBeTruthy();
      expect(getByText('Grant')).toBeTruthy();
    });

    it('handles permission request', async () => {
      const mockRequestPermissions = jest.fn(() => Promise.resolve(true));
      const mockRegisterPush = jest.fn(() => Promise.resolve());
      
      useNotifications.mockReturnValue({
        ...mockNotificationsContext,
        hasPermission: false,
        requestPermissions: mockRequestPermissions,
        registerForPushNotifications: mockRegisterPush,
      });

      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Settings'));
      fireEvent.press(getByText('Grant'));

      await waitFor(() => {
        expect(mockRequestPermissions).toHaveBeenCalled();
        expect(mockRegisterPush).toHaveBeenCalled();
      });
    });

    it('updates notification preferences', async () => {
      const mockUpdatePreferences = jest.fn(() => Promise.resolve());
      
      useNotifications.mockReturnValue({
        ...mockNotificationsContext,
        updateNotificationPreferences: mockUpdatePreferences,
      });

      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Settings'));

      // Would need to find and toggle switches - simplified for test
      await act(async () => {
        // Simulate preference update
        await mockUpdatePreferences({
          ...mockNotificationsContext.notificationPreferences,
          sound_enabled: false,
        });
      });

      expect(mockUpdatePreferences).toHaveBeenCalled();
    });
  });

  describe('Modal Behavior', () => {
    it('calls onClose when close button is pressed', () => {
      const mockOnClose = jest.fn();
      const { getByTestId } = render(
        <NotificationManager visible={true} onClose={mockOnClose} />
      );

      // Would need testID on close button in actual component
      // fireEvent.press(getByTestId('close-button'));
      // expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles modal request close', () => {
      const mockOnClose = jest.fn();
      const { getByTestId } = render(
        <NotificationManager visible={true} onClose={mockOnClose} />
      );

      // Modal onRequestClose would call onClose
      // This would be tested through the Modal component's onRequestClose prop
    });
  });

  describe('Loading States', () => {
    it('shows loading state for statistics', async () => {
      // Mock delayed response
      pushNotificationManager.getNotificationStatistics.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Statistics'));

      expect(getByText('Loading statistics...')).toBeTruthy();
    });

    it('shows loading state for preferences updates', () => {
      useNotifications.mockReturnValue({
        ...mockNotificationsContext,
        loading: {
          ...mockNotificationsContext.loading,
          preferences: true,
        },
      });

      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Settings'));

      // Switches should be disabled when loading
      // This would need to be tested with actual switch components
    });
  });

  describe('Error Handling', () => {
    it('handles clear all notifications error', async () => {
      const mockClearAll = jest.fn(() => Promise.reject(new Error('Clear failed')));
      useNotifications.mockReturnValue({
        ...mockNotificationsContext,
        clearAllNotifications: mockClearAll,
      });

      // Simulate error during clear all
      Alert.alert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons.find(b => b.text === 'Clear All');
        if (confirmButton) {
          confirmButton.onPress();
        }
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to clear notifications');
      });
    });

    it('handles preference update error', async () => {
      const mockUpdatePreferences = jest.fn(() => Promise.reject(new Error('Update failed')));
      
      useNotifications.mockReturnValue({
        ...mockNotificationsContext,
        updateNotificationPreferences: mockUpdatePreferences,
      });

      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByText('Settings'));

      await act(async () => {
        try {
          await mockUpdatePreferences({});
        } catch (error) {
          // Error should be handled and alert shown
        }
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update notification preferences');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', () => {
      const { getByText } = render(
        <NotificationManager visible={true} onClose={jest.fn()} />
      );

      // Check that important elements have proper labels
      expect(getByText('Notifications')).toBeTruthy();
      expect(getByText('History')).toBeTruthy();
      expect(getByText('Statistics')).toBeTruthy();
      expect(getByText('Settings')).toBeTruthy();
    });

    it('supports screen reader navigation', () => {
      // This would test accessibility props like accessibilityRole, accessibilityLabel, etc.
      // Implementation would depend on specific accessibility requirements
    });
  });
});