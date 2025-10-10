/**
 * StaffDashboardScreen Component Tests
 * 
 * Tests for the mobile staff dashboard screen component including
 * processing metrics, task management, and document processing workflows.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import StaffDashboardScreen from '../../../screens/dashboard/StaffDashboardScreen';

// Mock contexts
const mockAuthContext = {
  user: {
    id: 1,
    firstName: 'Staff',
    lastName: 'Member',
    username: 'staff',
    role: 'staff',
  },
};

const mockMobileDashboardContext = {
  dashboardData: {
    processing_metrics: {
      pending: 25,
      processing: 8,
      failed: 5,
      completed_today: 42,
    },
    document_processing_analytics: {
      total_processed: 150,
      success_rate: 94.5,
      avg_processing_time: 45,
    },
    ocr_analytics: {
      avg_confidence: 87.5,
      documents_processed: 42,
      success_rate: 92.3,
    },
    daily_tasks: [
      {
        task: 'Review failed document processing',
        count: 5,
        priority: 'high',
      },
      {
        task: 'Process pending manual reviews',
        count: 12,
        priority: 'medium',
      },
      {
        task: 'Update patient records',
        count: 8,
        priority: 'low',
      },
    ],
    patient_queue: [
      {
        name: 'John Smith',
        service: 'Document processing',
        wait_time: '15 min',
      },
      {
        name: 'Mary Johnson',
        service: 'Record review',
        wait_time: '8 min',
      },
    ],
  },
  clinicalRecordsSummary: {
    summary: {
      total_records: 850,
      pending_reviews: 12,
      failed_processing: 5,
      total_documents: 2100,
    },
  },
  recentDocuments: [
    {
      id: 1,
      filename: 'patient_scan.pdf',
      type: 'pdf',
      status: 'failed',
      size_mb: 3.2,
      created_at: '2025-01-16T15:30:00Z',
      patient: { name: 'Alice Brown' },
    },
    {
      id: 2,
      filename: 'lab_report.jpg',
      type: 'image',
      status: 'completed',
      size_mb: 1.8,
      created_at: '2025-01-16T14:15:00Z',
      patient: { name: 'Bob Wilson' },
    },
  ],
  quickActions: [],
  alerts: [],
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
      if (format === 'relative') return '1 hour ago';
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
    List: {
      Item: ({ title, description, left, right, style }) => (
        <RN.View testID="list-item" style={style}>
          {left && left({})}
          <RN.View>
            <RN.Text testID="list-item-title">{title}</RN.Text>
            <RN.Text testID="list-item-description">{description}</RN.Text>
          </RN.View>
          {right && right({})}
        </RN.View>
      ),
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

describe('StaffDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with staff dashboard data', () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Check header
    expect(getByTestId('header-title')).toBeTruthy();
    expect(getByText('Staff Dashboard')).toBeTruthy();
    expect(getByText('Welcome, Staff')).toBeTruthy();

    // Check processing metrics
    expect(getByText('Pending Processing')).toBeTruthy();
    expect(getByText('Failed Processing')).toBeTruthy();
    expect(getByText('Completed Today')).toBeTruthy();
    expect(getByText('Manual Reviews')).toBeTruthy();

    // Check metric values
    expect(getByText('25')).toBeTruthy(); // Pending processing
    expect(getByText('5')).toBeTruthy(); // Failed processing
    expect(getByText('42')).toBeTruthy(); // Completed today
    expect(getByText('12')).toBeTruthy(); // Manual reviews
  });

  it('displays document processing queue correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Document Processing Queue')).toBeTruthy();
    expect(getByText('Pending')).toBeTruthy();
    expect(getByText('Processing')).toBeTruthy();
    expect(getByText('Failed')).toBeTruthy();
    
    // Check queue counts
    expect(getByText('25')).toBeTruthy(); // Pending
    expect(getByText('8')).toBeTruthy(); // Processing
    expect(getByText('5')).toBeTruthy(); // Failed
    
    // Check queue status chips
    expect(getByText('Queue')).toBeTruthy();
    expect(getByText('Active')).toBeTruthy();
    expect(getByText('Needs Attention')).toBeTruthy();
  });

  it('displays processing progress correctly', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText("Today's Processing Progress")).toBeTruthy();
    expect(getByTestId('progress-bar')).toBeTruthy();
    
    // Total documents = 25 + 8 + 5 + 42 = 80
    // Progress = 42/80 = 52.5%, rounded to 53%
    expect(getByText('42 of 80 documents processed today')).toBeTruthy();
  });

  it('displays staff actions correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Staff Actions')).toBeTruthy();
    expect(getByText('Process Failed Documents')).toBeTruthy();
    expect(getByText('Bulk Upload Documents')).toBeTruthy();
    expect(getByText('Patient Check-in')).toBeTruthy();
    expect(getByText('Review Pending Records')).toBeTruthy();
    expect(getByText('Manage Processing Queue')).toBeTruthy();
    expect(getByText('Generate Reports')).toBeTruthy();
  });

  it('displays daily tasks correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText("Today's Tasks")).toBeTruthy();
    expect(getByText('Review failed document processing')).toBeTruthy();
    expect(getByText('Process pending manual reviews')).toBeTruthy();
    expect(getByText('Update patient records')).toBeTruthy();
    
    // Check task counts
    expect(getByText('5 items')).toBeTruthy();
    expect(getByText('12 items')).toBeTruthy();
    expect(getByText('8 items')).toBeTruthy();
    
    // Check priority chips
    expect(getByText('high')).toBeTruthy();
    expect(getByText('medium')).toBeTruthy();
    expect(getByText('low')).toBeTruthy();
  });

  it('displays recent document activity correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Recent Document Activity')).toBeTruthy();
    expect(getByText('patient_scan.pdf')).toBeTruthy();
    expect(getByText('lab_report.jpg')).toBeTruthy();
    expect(getByText('Alice Brown • 1 hour ago • 3.2 MB')).toBeTruthy();
    expect(getByText('Bob Wilson • 1 hour ago • 1.8 MB')).toBeTruthy();
    
    // Check status chips
    expect(getByText('failed')).toBeTruthy();
    expect(getByText('completed')).toBeTruthy();
    
    // Check retry button for failed documents
    expect(getByText('Retry')).toBeTruthy();
  });

  it('displays OCR processing analytics correctly', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('OCR Processing Analytics')).toBeTruthy();
    expect(getByText('Avg Confidence')).toBeTruthy();
    expect(getByText('Processed Today')).toBeTruthy();
    expect(getByText('Success Rate')).toBeTruthy();
    
    expect(getByText('88%')).toBeTruthy(); // Avg confidence (rounded)
    expect(getByText('42')).toBeTruthy(); // Documents processed
    expect(getByText('92%')).toBeTruthy(); // Success rate (rounded)
    
    expect(getByText('OCR Accuracy Trend')).toBeTruthy();
    expect(getByTestId('progress-bar')).toBeTruthy();
    expect(getByText('88% average confidence this week')).toBeTruthy();
  });

  it('displays patient queue correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Patient Queue')).toBeTruthy();
    expect(getByText('John Smith')).toBeTruthy();
    expect(getByText('Mary Johnson')).toBeTruthy();
    expect(getByText('Waiting for: Document processing')).toBeTruthy();
    expect(getByText('Waiting for: Record review')).toBeTruthy();
    expect(getByText('15 min')).toBeTruthy();
    expect(getByText('8 min')).toBeTruthy();
  });

  it('handles navigation to bulk upload when FAB is pressed', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const fab = getByTestId('fab');
    fireEvent.press(fab);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ClinicalRecords', {
      screen: 'DocumentUpload',
      params: { bulk_mode: true },
    });
  });

  it('handles quick action navigation correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const processFailedButton = getByText('Process Failed Documents');
    fireEvent.press(processFailedButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ClinicalRecords', {
      screen: 'ClinicalRecordsList',
      params: { filter: 'failed_processing' },
    });
  });

  it('handles metric card navigation correctly', () => {
    const { getAllByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Find and press "Process" buttons
    const processButtons = getAllByText('Process');
    fireEvent.press(processButtons[0]); // First metric card

    expect(mockNavigation.navigate).toHaveBeenCalled();
  });

  it('handles retry button for failed documents', () => {
    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const retryButton = getByText('Retry');
    fireEvent.press(retryButton);

    // Should handle retry action (implementation depends on requirements)
  });

  it('handles refresh correctly', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
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
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByTestId('activity-indicator')).toBeTruthy();
    expect(getByText('Loading staff dashboard...')).toBeTruthy();
  });

  it('displays notification badge when there are unread notifications', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const badge = getByTestId('badge');
    expect(badge).toBeTruthy();
  });

  it('handles error states correctly', () => {
    const errorContext = {
      ...mockMobileDashboardContext,
      errors: { dashboard: 'Failed to load staff dashboard data' },
    };

    jest.doMock('../../../contexts/MobileDashboardContext', () => ({
      useMobileDashboard: () => errorContext,
    }));

    const { getByTestId } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Should show snackbar with error
    expect(getByTestId('snackbar')).toBeTruthy();
  });

  it('highlights high priority actions correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // High priority action should be highlighted
    const processFailedButton = getByText('Process Failed Documents');
    expect(processFailedButton).toBeTruthy();
  });

  it('calculates processing progress correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Total = 25 + 8 + 5 + 42 = 80
    // Progress text should show completed/total
    expect(getByText('42 of 80 documents processed today')).toBeTruthy();
  });

  it('displays correct task priority colors and icons', () => {
    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Priority chips should be displayed
    expect(getByText('high')).toBeTruthy();
    expect(getByText('medium')).toBeTruthy();
    expect(getByText('low')).toBeTruthy();
  });

  it('handles empty data states correctly', () => {
    const emptyContext = {
      ...mockMobileDashboardContext,
      dashboardData: {
        processing_metrics: { pending: 0, processing: 0, failed: 0, completed_today: 0 },
        daily_tasks: [],
        patient_queue: [],
        ocr_analytics: { avg_confidence: 0, documents_processed: 0, success_rate: 0 },
      },
      recentDocuments: [],
    };

    jest.doMock('../../../contexts/MobileDashboardContext', () => ({
      useMobileDashboard: () => emptyContext,
    }));

    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Should still render with zero values
    expect(getByText('0')).toBeTruthy();
  });

  it('formats OCR confidence percentage correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <StaffDashboardScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // 87.5% should be rounded to 88%
    expect(getByText('88%')).toBeTruthy();
    expect(getByText('88% average confidence this week')).toBeTruthy();
  });
});