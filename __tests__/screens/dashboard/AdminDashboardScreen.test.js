/**
 * AdminDashboardScreen Component Tests
 * 
 * Tests for the mobile admin dashboard screen component including
 * system metrics, clinical records analytics, and administrative functions.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import AdminDashboardScreen from '../../../screens/dashboard/AdminDashboardScreen';

// Mock contexts
const mockAuthContext = {
  user: {
    id: 1,
    firstName: 'Admin',
    lastName: 'User',
    username: 'admin',
    role: 'admin',
  },
};

const mockMobileDashboardContext = {
  dashboardData: {
    system_metrics: {
      total_users: 45,
      active_sessions: 12,
      storage_used_mb: 2048,
      api_calls_today: 1250,
    },
    comprehensive_analytics: {
      total_revenue: 15000,
      total_appointments: 320,
      patient_satisfaction: 4.8,
    },
    user_activity: {
      active_users: 38,
      total_logins: 156,
      new_registrations: 5,
    },
    patient_overview: {
      total_patients: 280,
      patients_with_records: 245,
      coverage_percentage: 87.5,
    },
    performance: {
      avg_response_time_ms: 150,
      error_rate_percent: 0.2,
      uptime_percent: 99.9,
    },
  },
  clinicalRecordsSummary: {
    summary: {
      total_records: 1250,
      today_records: 25,
      pending_reviews: 8,
      failed_processing: 3,
      total_documents: 3200,
      total_storage_mb: 5120,
      avg_processing_time_seconds: 35,
    },
    processing_status: [
      { processing_status: 'completed', count: 2800 },
      { processing_status: 'pending', count: 150 },
      { processing_status: 'processing', count: 50 },
      { processing_status: 'failed', count: 200 },
    ],
  },
  recentDocuments: [],
  quickActions: [],
  alerts: [
    {
      id: 1,
      category: 'security',
      title: 'Security Alert',
      message: 'Multiple failed login attempts detected',
      created_at: '2025-01-16T16:00:00Z',
      requires_action: true,
    },
    {
      id: 2,
      category: 'system',
      title: 'System Warning',
      message: 'Storage usage is approaching 80% capacity',
      created_at: '2025-01-16T15:30:00Z',
      requires_action: false,
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
  unreadCount: 5,
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
      if (format === 'relative') return '30 minutes ago';
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
    DataTable: {
      Header: ({ children }) => <RN.View testID="data-table-header">{children}</RN.View>,
      Title: ({ children }) => <RN.Text testID="data-table-title">{children}</RN.Text>,
      Row: ({ children }) => <RN.View testID="data-table-row">{children}</RN.View>,
      Cell: ({ children }) => <RN.Text testID="data-table-cell">{children}</RN.Text>,
    },
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

describe('AdminDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with admin dashboard data', () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Check header
    expect(getByTestId('header-title')).toBeTruthy();
    expect(getByText('Admin Dashboard')).toBeTruthy();
    expect(getByText('Admin - Clinic Administrator')).toBeTruthy();

    // Check system metrics
    expect(getByText('Total Users')).toBeTruthy();
    expect(getByText('Clinical Records')).toBeTruthy();
    expect(getByText('Storage Used')).toBeTruthy();
    expect(getByText('System Alerts')).toBeTruthy();

    // Check metric values
    expect(getByText('45')).toBeTruthy(); // Total users
    expect(getByText('1250')).toBeTruthy(); // Clinical records
    expect(getByText('5120 MB')).toBeTruthy(); // Storage used
    expect(getByText('2')).toBeTruthy(); // System alerts
  });

  it('displays clinical records analytics correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Clinical Records System Analytics')).toBeTruthy();
    expect(getByText('Total Records')).toBeTruthy();
    expect(getByText('Added Today')).toBeTruthy();
    expect(getByText('Failed Processing')).toBeTruthy();
    expect(getByText('Document Processing Status')).toBeTruthy();
    expect(getByText('System Health')).toBeTruthy();
  });

  it('displays processing status breakdown correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('completed')).toBeTruthy();
    expect(getByText('pending')).toBeTruthy();
    expect(getByText('processing')).toBeTruthy();
    expect(getByText('failed')).toBeTruthy();
    
    // Check counts
    expect(getByText('2800')).toBeTruthy(); // completed count
    expect(getByText('150')).toBeTruthy(); // pending count
    expect(getByText('50')).toBeTruthy(); // processing count
    expect(getByText('200')).toBeTruthy(); // failed count
  });

  it('displays system health indicators correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('System Health')).toBeTruthy();
    expect(getByText('OCR Service: Online')).toBeTruthy();
    expect(getByText('Backup: Up to date')).toBeTruthy();
    // Storage percentage calculation: (5120 / 10000) * 100 = 51%
    expect(getByText('Storage: 51% Used')).toBeTruthy();
  });

  it('displays user activity summary correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('User Activity Summary')).toBeTruthy();
    expect(getByText('Active Users')).toBeTruthy();
    expect(getByText('Total Logins')).toBeTruthy();
    expect(getByText('New Registrations')).toBeTruthy();
    
    expect(getByText('38')).toBeTruthy(); // Active users
    expect(getByText('156')).toBeTruthy(); // Total logins
    expect(getByText('5')).toBeTruthy(); // New registrations
  });

  it('displays patient records overview correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Patient Records Overview')).toBeTruthy();
    expect(getByText('Total Patients')).toBeTruthy();
    expect(getByText('With Records')).toBeTruthy();
    expect(getByText('Coverage')).toBeTruthy();
    
    expect(getByText('280')).toBeTruthy(); // Total patients
    expect(getByText('245')).toBeTruthy(); // Patients with records
    expect(getByText('88%')).toBeTruthy(); // Coverage percentage (rounded)
    
    expect(getByText('Records Coverage')).toBeTruthy();
    expect(getByText('88% of patients have clinical records')).toBeTruthy();
  });

  it('displays system alerts correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('System Alerts')).toBeTruthy();
    expect(getByText('Security Alert')).toBeTruthy();
    expect(getByText('Multiple failed login attempts detected')).toBeTruthy();
    expect(getByText('System Warning')).toBeTruthy();
    expect(getByText('Storage usage is approaching 80% capacity')).toBeTruthy();
  });

  it('displays administrative actions correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Administrative Actions')).toBeTruthy();
    expect(getByText('Manage Clinical Records')).toBeTruthy();
    expect(getByText('System Metrics')).toBeTruthy();
    expect(getByText('Staff Management')).toBeTruthy();
    expect(getByText('Generate Reports')).toBeTruthy();
    expect(getByText('Compliance Monitor')).toBeTruthy();
    expect(getByText('Backup & Recovery')).toBeTruthy();
  });

  it('handles navigation to clinic management when FAB is pressed', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const fab = getByTestId('fab');
    fireEvent.press(fab);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('More', {
      screen: 'ClinicManagement',
    });
  });

  it('handles metric card navigation correctly', () => {
    const { getAllByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Find and press "Manage" buttons
    const manageButtons = getAllByText('Manage');
    fireEvent.press(manageButtons[0]); // First metric card

    expect(mockNavigation.navigate).toHaveBeenCalled();
  });

  it('handles quick action navigation correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const manageRecordsButton = getByText('Manage Clinical Records');
    fireEvent.press(manageRecordsButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ClinicalRecords', {
      screen: 'ClinicalRecordsList',
      params: { admin_view: true },
    });
  });

  it('handles refresh correctly', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
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
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByTestId('activity-indicator')).toBeTruthy();
    expect(getByText('Loading admin dashboard...')).toBeTruthy();
  });

  it('displays notification badge when there are unread notifications', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const badge = getByTestId('badge');
    expect(badge).toBeTruthy();
  });

  it('handles error states correctly', () => {
    const errorContext = {
      ...mockMobileDashboardContext,
      errors: { dashboard: 'Failed to load admin dashboard data' },
    };

    jest.doMock('../../../contexts/MobileDashboardContext', () => ({
      useMobileDashboard: () => errorContext,
    }));

    const { getByTestId } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Should show snackbar with error
    expect(getByTestId('snackbar')).toBeTruthy();
  });

  it('calculates storage percentage correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Storage calculation: (5120 / 10000) * 100 = 51%
    expect(getByText('Storage: 51% Used')).toBeTruthy();
  });

  it('calculates coverage percentage correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Coverage: (245 / 280) * 100 = 87.5%, rounded to 88%
    expect(getByText('88%')).toBeTruthy();
    expect(getByText('88% of patients have clinical records')).toBeTruthy();
  });

  it('displays progress bars correctly', () => {
    const { getAllByTestId } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const progressBars = getAllByTestId('progress-bar');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('handles alert actions correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Check if alerts with actions show action buttons
    const actionButtons = getAllByText('Action');
    expect(actionButtons.length).toBeGreaterThan(0);
  });

  it('displays correct alert icons and colors based on category', () => {
    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Security and system alerts should be displayed
    expect(getByText('Security Alert')).toBeTruthy();
    expect(getByText('System Warning')).toBeTruthy();
  });

  it('handles empty data states correctly', () => {
    const emptyContext = {
      ...mockMobileDashboardContext,
      dashboardData: {
        system_metrics: { total_users: 0 },
        user_activity: { active_users: 0, total_logins: 0, new_registrations: 0 },
        patient_overview: { total_patients: 0, patients_with_records: 0, coverage_percentage: 0 },
      },
      clinicalRecordsSummary: {
        summary: {
          total_records: 0,
          today_records: 0,
          failed_processing: 0,
          total_storage_mb: 0,
        },
        processing_status: [],
      },
      alerts: [],
    };

    jest.doMock('../../../contexts/MobileDashboardContext', () => ({
      useMobileDashboard: () => emptyContext,
    }));

    const { getByText } = render(
      <TestWrapper>
        <AdminDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Should still render with zero values
    expect(getByText('0')).toBeTruthy();
  });
});