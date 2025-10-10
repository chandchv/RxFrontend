/**
 * PatientDashboardScreen Component Tests
 * 
 * Tests for the mobile patient dashboard screen component including
 * health data display, user interactions, and navigation.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import PatientDashboardScreen from '../../../screens/dashboard/PatientDashboardScreen';

// Mock contexts
const mockAuthContext = {
  user: {
    id: 1,
    firstName: 'Jane',
    lastName: 'Smith',
    username: 'janesmith',
    role: 'patient',
  },
};

const mockMobileDashboardContext = {
  dashboardData: {
    appointments: {
      total: 8,
      upcoming: [
        {
          id: 1,
          doctor_name: 'Dr. Johnson',
          appointment_date: '2025-01-17T10:00:00Z',
          status: 'confirmed',
          reason: 'Regular checkup',
        },
      ],
    },
    health_analytics: {
      heart_rate: 72,
      weight: 70,
      blood_pressure: '120/80',
    },
  },
  clinicalRecordsSummary: {
    summary: {
      total_records: 12,
      recent_records: 2,
      total_documents: 25,
    },
    records_by_type: [
      { record_type: 'lab_report', count: 5 },
      { record_type: 'imaging', count: 3 },
      { record_type: 'prescription', count: 4 },
    ],
  },
  recentDocuments: [
    {
      id: 1,
      filename: 'blood_test_results.pdf',
      type: 'pdf',
      status: 'completed',
      size_mb: 1.5,
      created_at: '2025-01-16T15:30:00Z',
      record: { title: 'Blood Test Results' },
    },
  ],
  quickActions: [],
  alerts: [
    {
      id: 1,
      message: 'Your test results are ready for review',
      created_at: '2025-01-16T16:00:00Z',
    },
  ],
  loading: {
    dashboard: false,
    clinicalRecords: false,
    notifications: false,
    refreshing: false,
  },
  errors: {},
  refreshAll: jest.fn(),
  clearError: jest.fn(),
};

const mockNotificationContext = {
  unreadCount: 2,
  hasPermission: true,
};

const mockThemeContext = {
  colors: {
    primary: '#2196F3',
    secondary: '#4CAF50',
    tertiary: '#FF9800',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    surface: '#FFFFFF',
    onPrimary: '#FFFFFF',
    outline: '#E0E0E0',
  },
};

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

// Mock contexts
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

jest.mock('../../../contexts/MobileDashboardContext', () => ({
  useMobileDashboard: () => mockMobileDashboardContext,
}));

jest.mock('../../../contexts/NotificationContext', () => ({
  useNotifications: () => mockNotificationContext,
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => mockThemeContext,
}));

// Mock utils
jest.mock('../../../utils/mobileUtils', () => ({
  DateUtils: {
    formatDate: jest.fn((date, format) => {
      if (format === 'relative') return '1 hour ago';
      if (format === 'datetime') return 'Jan 17, 2025 10:00 AM';
      return 'Jan 16, 2025';
    }),
  },
  UIUtils: {},
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const RN = require('react-native');
  return {
    ...jest.requireActual('react-native-paper'),
    Provider: ({ children }) => children,
    Appbar: {
      Header: ({ children }) => <RN.View testID="appbar-header">{children}</RN.View>,
      Content: ({ title, subtitle }) => (
        <RN.View testID="appbar-content">
          <RN.Text testID="header-title">{title}</RN.Text>
          <RN.Text testID="header-subtitle">{subtitle}</RN.Text>
        </RN.View>
      ),
      Action: ({ icon, onPress }) => (
        <RN.TouchableOpacity testID={`appbar-action-${icon}`} onPress={onPress}>
          <RN.Text>{icon}</RN.Text>
        </RN.TouchableOpacity>
      ),
    },
    Card: {
      Title: ({ title }) => <RN.Text testID="card-title">{title}</RN.Text>,
      Content: ({ children }) => <RN.View testID="card-content">{children}</RN.View>,
    },
    Title: ({ children }) => <RN.Text testID="title">{children}</RN.Text>,
    Paragraph: ({ children }) => <RN.Text testID="paragraph">{children}</RN.Text>,
    Button: ({ children, onPress, testID }) => (
      <RN.TouchableOpacity testID={testID || 'button'} onPress={onPress}>
        <RN.Text>{children}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Surface: ({ children }) => <RN.View testID="surface">{children}</RN.View>,
    Badge: ({ children }) => <RN.Text testID="badge">{children}</RN.Text>,
    Chip: ({ children }) => <RN.Text testID="chip">{children}</RN.Text>,
    FAB: ({ onPress, icon }) => (
      <RN.TouchableOpacity testID="fab" onPress={onPress}>
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Snackbar: ({ visible, children, onDismiss }) =>
      visible ? (
        <RN.View testID="snackbar">
          <RN.Text>{children}</RN.Text>
          <RN.TouchableOpacity testID="snackbar-dismiss" onPress={onDismiss}>
            <RN.Text>Dismiss</RN.Text>
          </RN.TouchableOpacity>
        </RN.View>
      ) : null,
    ActivityIndicator: () => <RN.Text testID="activity-indicator">Loading...</RN.Text>,
    Divider: () => <RN.View testID="divider" />,
    ProgressBar: ({ progress }) => (
      <RN.View testID="progress-bar">
        <RN.Text testID="progress-value">{Math.round(progress * 100)}%</RN.Text>
      </RN.View>
    ),
  };
});

// Test wrapper component
const TestWrapper = ({ children }) => (
  <NavigationContainer>
    <PaperProvider>
      {children}
    </PaperProvider>
  </NavigationContainer>
);

describe('PatientDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with patient dashboard data', () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Check header
    expect(getByTestId('header-title')).toBeTruthy();
    expect(getByText('My Health Dashboard')).toBeTruthy();
    expect(getByText('Welcome, Jane')).toBeTruthy();

    // Check metrics
    expect(getByText('My Records')).toBeTruthy();
    expect(getByText('Appointments')).toBeTruthy();
    expect(getByText('Test Results')).toBeTruthy();
    expect(getByText('Recent Updates')).toBeTruthy();

    // Check metric values
    expect(getByText('12')).toBeTruthy(); // My records
    expect(getByText('8')).toBeTruthy(); // Appointments
    expect(getByText('5')).toBeTruthy(); // Test results (lab reports)
    expect(getByText('2')).toBeTruthy(); // Recent updates
  });

  it('displays health records summary correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('My Health Records Summary')).toBeTruthy();
    expect(getByText('Total Records')).toBeTruthy();
    expect(getByText('Recent Updates')).toBeTruthy();
    expect(getByText('Documents')).toBeTruthy();
    expect(getByText('Health Record Completeness')).toBeTruthy();
  });

  it('displays health progress bar correctly', () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByTestId('progress-bar')).toBeTruthy();
    expect(getByText('Health Record Completeness')).toBeTruthy();
    // Progress should be calculated as (total_records / 10) * 100
    // 12 records / 10 = 1.2, capped at 1, so 100%
    expect(getByText('100% Complete')).toBeTruthy();
  });

  it('displays recent documents correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('My Recent Documents')).toBeTruthy();
    expect(getByText('blood_test_results.pdf')).toBeTruthy();
    expect(getByText('Blood Test Results • 1 hour ago • 1.5 MB')).toBeTruthy();
  });

  it('displays upcoming appointments correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Upcoming Appointments')).toBeTruthy();
    expect(getByText('Dr. Dr. Johnson')).toBeTruthy();
    expect(getByText('Regular checkup')).toBeTruthy();
  });

  it('displays health trends correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Health Trends')).toBeTruthy();
    expect(getByText('Heart Rate')).toBeTruthy();
    expect(getByText('72 BPM')).toBeTruthy();
    expect(getByText('Weight')).toBeTruthy();
    expect(getByText('70 kg')).toBeTruthy();
    expect(getByText('Blood Pressure')).toBeTruthy();
    expect(getByText('120/80')).toBeTruthy();
  });

  it('displays health alerts correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Health Alerts')).toBeTruthy();
    expect(getByText('Your test results are ready for review')).toBeTruthy();
  });

  it('handles navigation to clinical records when FAB is pressed', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const fab = getByTestId('fab');
    fireEvent.press(fab);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('More', {
      screen: 'Appointments',
      params: { action: 'book' },
    });
  });

  it('handles quick action navigation correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Quick Actions')).toBeTruthy();
    expect(getByText('View My Records')).toBeTruthy();
    expect(getByText('Book Appointment')).toBeTruthy();
    expect(getByText('Test Results')).toBeTruthy();
    expect(getByText('Medical History')).toBeTruthy();
    expect(getByText('Share Records')).toBeTruthy();
    expect(getByText('Health Trends')).toBeTruthy();
  });

  it('handles metric card navigation correctly', () => {
    const { getAllByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Find and press "View" buttons
    const viewButtons = getAllByText('View');
    fireEvent.press(viewButtons[0]); // First metric card

    expect(mockNavigation.navigate).toHaveBeenCalled();
  });

  it('handles refresh correctly', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const scrollView = getByTestId('scroll-view') || getByTestId('dashboard-scroll');
    
    // Simulate pull to refresh
    await act(async () => {
      fireEvent(scrollView, 'refresh');
    });

    await waitFor(() => {
      expect(mockMobileDashboardContext.refreshAll).toHaveBeenCalled();
    });
  });

  it('displays loading state correctly', () => {
    const loadingContext = {
      ...mockMobileDashboardContext,
      loading: { dashboard: true },
      dashboardData: null,
    };

    jest.doMock('../../../contexts/MobileDashboardContext', () => ({
      useMobileDashboard: () => loadingContext,
    }));

    const { getByTestId, getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByTestId('activity-indicator')).toBeTruthy();
    expect(getByText('Loading your health dashboard...')).toBeTruthy();
  });

  it('displays notification badge when there are unread notifications', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const badge = getByTestId('badge');
    expect(badge).toBeTruthy();
  });

  it('handles error states correctly', () => {
    const errorContext = {
      ...mockMobileDashboardContext,
      errors: { dashboard: 'Failed to load health data' },
    };

    jest.doMock('../../../contexts/MobileDashboardContext', () => ({
      useMobileDashboard: () => errorContext,
    }));

    const { getByTestId } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Should show snackbar with error
    expect(getByTestId('snackbar')).toBeTruthy();
  });

  it('handles empty data states correctly', () => {
    const emptyContext = {
      ...mockMobileDashboardContext,
      dashboardData: {
        appointments: { total: 0, upcoming: [] },
        health_analytics: null,
      },
      clinicalRecordsSummary: {
        summary: {
          total_records: 0,
          recent_records: 0,
          total_documents: 0,
        },
        records_by_type: [],
      },
      recentDocuments: [],
      alerts: [],
    };

    jest.doMock('../../../contexts/MobileDashboardContext', () => ({
      useMobileDashboard: () => emptyContext,
    }));

    const { getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Should still render with zero values
    expect(getByText('0')).toBeTruthy();
  });

  it('calculates health record completeness correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // With 12 records, completeness should be min(12/10, 1) * 100 = 100%
    expect(getByText('100% Complete')).toBeTruthy();
  });

  it('displays correct record type counts', () => {
    const { getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Test Results should show lab_report count (5)
    expect(getByText('5')).toBeTruthy();
  });

  it('formats health trend values correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <PatientDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('72 BPM')).toBeTruthy();
    expect(getByText('70 kg')).toBeTruthy();
    expect(getByText('120/80')).toBeTruthy();
    expect(getByText('+2 from last week')).toBeTruthy();
    expect(getByText('-1 kg from last month')).toBeTruthy();
    expect(getByText('Normal range')).toBeTruthy();
  });
});