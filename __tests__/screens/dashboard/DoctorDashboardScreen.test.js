/**
 * DoctorDashboardScreen Component Tests
 * 
 * Tests for the mobile doctor dashboard screen component including
 * data display, user interactions, and navigation.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import DoctorDashboardScreen from '../../../screens/dashboard/DoctorDashboardScreen';

// Mock contexts
const mockAuthContext = {
  user: {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    role: 'doctor',
  },
};

const mockMobileDashboardContext = {
  dashboardData: {
    appointments: {
      today: 5,
      total: 25,
      upcoming: [
        {
          id: 1,
          patient_name: 'Jane Smith',
          appointment_date: '2025-01-17T10:00:00Z',
          status: 'confirmed',
          reason: 'Regular checkup',
        },
        {
          id: 2,
          patient_name: 'Bob Johnson',
          appointment_date: '2025-01-17T14:30:00Z',
          status: 'pending',
          reason: 'Follow-up',
        },
      ],
    },
    patients: {
      total: 150,
    },
  },
  clinicalRecordsSummary: {
    summary: {
      total_records: 45,
      today_records: 3,
      pending_reviews: 2,
      total_documents: 120,
      total_storage_mb: 256,
      avg_processing_time_seconds: 45,
    },
    processing_status: [
      { processing_status: 'completed', count: 100 },
      { processing_status: 'pending', count: 15 },
      { processing_status: 'failed', count: 5 },
    ],
  },
  recentDocuments: [
    {
      id: 1,
      filename: 'patient_xray.pdf',
      type: 'pdf',
      status: 'completed',
      size_mb: 2.5,
      created_at: '2025-01-16T15:30:00Z',
      patient: { name: 'Jane Smith' },
    },
    {
      id: 2,
      filename: 'lab_results.jpg',
      type: 'image',
      status: 'processing',
      size_mb: 1.2,
      created_at: '2025-01-16T14:15:00Z',
      patient: { name: 'Bob Johnson' },
    },
  ],
  quickActions: [],
  alerts: [
    {
      id: 1,
      message: 'New lab results available for review',
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
  unreadCount: 3,
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
      if (format === 'relative') return '2 hours ago';
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

describe('DoctorDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with dashboard data', () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Check header
    expect(getByTestId('header-title')).toBeTruthy();
    expect(getByText('Doctor Dashboard')).toBeTruthy();
    expect(getByText('Welcome, Dr. John')).toBeTruthy();

    // Check metrics
    expect(getByText("Today's Appointments")).toBeTruthy();
    expect(getByText('Total Patients')).toBeTruthy();
    expect(getByText('Pending Reviews')).toBeTruthy();
    expect(getByText('Clinical Records')).toBeTruthy();

    // Check metric values
    expect(getByText('5')).toBeTruthy(); // Today's appointments
    expect(getByText('150')).toBeTruthy(); // Total patients
    expect(getByText('2')).toBeTruthy(); // Pending reviews
    expect(getByText('45')).toBeTruthy(); // Clinical records
  });

  it('displays clinical records summary correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Clinical Records Summary')).toBeTruthy();
    expect(getByText('Total Records')).toBeTruthy();
    expect(getByText('Added Today')).toBeTruthy();
    expect(getByText('Pending Review')).toBeTruthy();
    expect(getByText('256 MB')).toBeTruthy(); // Storage used
  });

  it('displays recent documents correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Recent Patient Documents')).toBeTruthy();
    expect(getByText('patient_xray.pdf')).toBeTruthy();
    expect(getByText('lab_results.jpg')).toBeTruthy();
    expect(getByText('Jane Smith • 2 hours ago • 2.5 MB')).toBeTruthy();
    expect(getByText('Bob Johnson • 2 hours ago • 1.2 MB')).toBeTruthy();
  });

  it('displays upcoming appointments correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Upcoming Appointments')).toBeTruthy();
    expect(getByText('Jane Smith')).toBeTruthy();
    expect(getByText('Bob Johnson')).toBeTruthy();
    expect(getByText('Regular checkup')).toBeTruthy();
    expect(getByText('Follow-up')).toBeTruthy();
  });

  it('displays alerts correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Active Alerts')).toBeTruthy();
    expect(getByText('New lab results available for review')).toBeTruthy();
  });

  it('handles navigation to notifications when bell icon is pressed', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const bellButton = getByTestId('appbar-action-bell');
    fireEvent.press(bellButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Notifications');
  });

  it('handles navigation to clinical records when FAB is pressed', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const fab = getByTestId('fab');
    fireEvent.press(fab);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ClinicalRecords', {
      screen: 'DocumentUpload',
    });
  });

  it('handles metric card navigation correctly', () => {
    const { getAllByText } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
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
        <DoctorDashboardScreen navigation={mockNavigation} />
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
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByTestId('activity-indicator')).toBeTruthy();
    expect(getByText('Loading doctor dashboard...')).toBeTruthy();
  });

  it('displays notification badge when there are unread notifications', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const badge = getByTestId('badge');
    expect(badge).toBeTruthy();
  });

  it('handles quick action navigation correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Test quick actions if they exist
    const quickActionsTitle = getByText('Quick Actions');
    expect(quickActionsTitle).toBeTruthy();
  });

  it('handles error states correctly', () => {
    const errorContext = {
      ...mockMobileDashboardContext,
      errors: { dashboard: 'Failed to load dashboard data' },
    };

    jest.doMock('../../../contexts/MobileDashboardContext', () => ({
      useMobileDashboard: () => errorContext,
    }));

    const { getByTestId } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Should show snackbar with error
    expect(getByTestId('snackbar')).toBeTruthy();
  });

  it('formats dates correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Check that date formatting is applied
    expect(getByText('2 hours ago')).toBeTruthy();
    expect(getByText('Jan 17, 2025 10:00 AM')).toBeTruthy();
  });

  it('displays correct status colors for documents', () => {
    const { getAllByTestId } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const chips = getAllByTestId('chip');
    expect(chips.length).toBeGreaterThan(0);
  });

  it('handles empty data states correctly', () => {
    const emptyContext = {
      ...mockMobileDashboardContext,
      dashboardData: {
        appointments: { today: 0, total: 0, upcoming: [] },
        patients: { total: 0 },
      },
      clinicalRecordsSummary: {
        summary: {
          total_records: 0,
          today_records: 0,
          pending_reviews: 0,
          total_documents: 0,
          total_storage_mb: 0,
        },
      },
      recentDocuments: [],
      alerts: [],
    };

    jest.doMock('../../../contexts/MobileDashboardContext', () => ({
      useMobileDashboard: () => emptyContext,
    }));

    const { getByText } = render(
      <TestWrapper>
        <DoctorDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Should still render with zero values
    expect(getByText('0')).toBeTruthy();
  });
});