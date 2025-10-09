/**
 * Tests for ClinicalRecordsDashboardScreen
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';

import ClinicalRecordsDashboardScreen from '../../../screens/clinical-records/ClinicalRecordsDashboardScreen';
import { AuthContext } from '../../../contexts/AuthContext';
import { MobileDashboardContext } from '../../../contexts/MobileDashboardContext';
import mobileApiService from '../../../services/mobileApiService';
import { theme } from '../../../styles/theme';

// Mock the mobile API service
jest.mock('../../../services/mobileApiService');

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock route
const mockRoute = {
  params: {},
};

// Mock auth context
const mockAuthContext = {
  user: {
    id: '1',
    email: 'doctor@test.com',
    role: 'doctor',
    first_name: 'Test',
    last_name: 'Doctor',
  },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
};

// Mock mobile dashboard context
const mockMobileDashboardContext = {
  updateLastActivity: jest.fn(),
  dashboardData: null,
  loading: false,
  error: null,
};

// Mock data
const mockClinicalRecordsSummary = {
  summary: {
    total_records: 25,
    total_documents: 45,
    today_records: 3,
    today_documents: 5,
    pending_reviews: 2,
    failed_processing: 1,
    avg_processing_time_seconds: 120,
    avg_ocr_confidence: 85.5,
    total_storage_bytes: 1048576000, // 1GB
    total_storage_mb: 1000,
  },
  records_by_type: [
    { record_type: 'lab_result', count: 15 },
    { record_type: 'imaging', count: 8 },
    { record_type: 'prescription', count: 2 },
  ],
  processing_status: [
    { processing_status: 'completed', count: 40 },
    { processing_status: 'pending', count: 3 },
    { processing_status: 'failed', count: 2 },
  ],
  date_range_days: 30,
  generated_at: '2024-01-15T10:00:00Z',
};

const mockRecentDocuments = {
  results: [
    {
      id: '1',
      original_filename: 'lab_results_2024.pdf',
      file_size: 2048576,
      file_size_mb: 2.0,
      document_type: 'pdf',
      processing_status: 'completed',
      ocr_confidence: 92.5,
      created_at: '2024-01-15T09:30:00Z',
    },
    {
      id: '2',
      original_filename: 'xray_chest.dcm',
      file_size: 5242880,
      file_size_mb: 5.0,
      document_type: 'dicom',
      processing_status: 'processing',
      ocr_confidence: null,
      created_at: '2024-01-15T08:45:00Z',
    },
  ],
  count: 2,
  next: null,
  previous: null,
};

const mockAlerts = {
  results: [
    {
      id: '1',
      title: 'Document Review Required',
      message: '2 documents need manual review',
      category: 'document_processing',
      priority: 'medium',
      created_at: '2024-01-15T09:00:00Z',
    },
    {
      id: '2',
      title: 'Processing Failed',
      message: '1 document failed to process',
      category: 'clinical_records',
      priority: 'high',
      created_at: '2024-01-15T08:30:00Z',
    },
  ],
  count: 2,
};

// Test wrapper component
const TestWrapper = ({ children, authContext = mockAuthContext, dashboardContext = mockMobileDashboardContext }) => (
  <NavigationContainer>
    <PaperProvider theme={theme}>
      <AuthContext.Provider value={authContext}>
        <MobileDashboardContext.Provider value={dashboardContext}>
          {children}
        </MobileDashboardContext.Provider>
      </AuthContext.Provider>
    </PaperProvider>
  </NavigationContainer>
);

describe('ClinicalRecordsDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mobileApiService.getClinicalRecordsSummary.mockResolvedValue(mockClinicalRecordsSummary);
    mobileApiService.getRecentDocuments.mockResolvedValue(mockRecentDocuments);
    mobileApiService.getDashboardAlerts.mockResolvedValue(mockAlerts);
  });

  describe('Rendering', () => {
    it('renders loading state initially', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByText('Loading clinical records dashboard...')).toBeTruthy();
    });

    it('renders dashboard content after loading', async () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(queryByText('Loading clinical records dashboard...')).toBeNull();
      });

      expect(getByText('Clinical Records')).toBeTruthy();
      expect(getByText('Your patient records and documents')).toBeTruthy();
      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('Overview')).toBeTruthy();
    });

    it('renders role-specific subtitle for doctor', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Your patient records and documents')).toBeTruthy();
      });
    });

    it('renders role-specific subtitle for patient', async () => {
      const patientAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'patient' },
      };

      const { getByText } = render(
        <TestWrapper authContext={patientAuthContext}>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Your health records and documents')).toBeTruthy();
      });
    });

    it('renders role-specific subtitle for admin', async () => {
      const adminAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'admin' },
      };

      const { getByText } = render(
        <TestWrapper authContext={adminAuthContext}>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('System-wide clinical records overview')).toBeTruthy();
      });
    });

    it('renders role-specific subtitle for staff', async () => {
      const staffAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'staff' },
      };

      const { getByText } = render(
        <TestWrapper authContext={staffAuthContext}>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Document processing and management')).toBeTruthy();
      });
    });
  });

  describe('Data Loading', () => {
    it('loads dashboard data on mount', async () => {
      render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mobileApiService.getClinicalRecordsSummary).toHaveBeenCalledWith({
          dateRange: '30',
          includeTrends: true,
        });
        expect(mobileApiService.getRecentDocuments).toHaveBeenCalledWith({
          limit: 5,
        });
        expect(mobileApiService.getDashboardAlerts).toHaveBeenCalledWith({
          limit: 5,
          categories: ['clinical_records', 'document_processing', 'ocr_review'],
        });
      });
    });

    it('updates last activity after loading data', async () => {
      render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockMobileDashboardContext.updateLastActivity).toHaveBeenCalled();
      });
    });

    it('handles API errors gracefully', async () => {
      const errorMessage = 'Failed to load data';
      mobileApiService.getClinicalRecordsSummary.mockRejectedValue(new Error(errorMessage));

      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Failed to Load Dashboard')).toBeTruthy();
        expect(getByText(errorMessage)).toBeTruthy();
      });
    });
  });

  describe('Summary Metrics', () => {
    it('displays summary metrics correctly', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('25')).toBeTruthy(); // total_records
        expect(getByText('45')).toBeTruthy(); // total_documents
        expect(getByText('3')).toBeTruthy(); // today_records
        expect(getByText('1000.0 MB')).toBeTruthy(); // storage
      });
    });

    it('displays processing status warnings', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('2 documents need review')).toBeTruthy();
        expect(getByText('1 processing failures')).toBeTruthy();
      });
    });

    it('displays OCR confidence with progress bar', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Average OCR Confidence')).toBeTruthy();
        expect(getByText('86%')).toBeTruthy(); // rounded avg_ocr_confidence
      });
    });
  });

  describe('Records by Type', () => {
    it('displays records by type correctly', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Records by Type')).toBeTruthy();
        expect(getByText('LAB RESULT')).toBeTruthy();
        expect(getByText('IMAGING')).toBeTruthy();
        expect(getByText('PRESCRIPTION')).toBeTruthy();
      });
    });
  });

  describe('Recent Documents', () => {
    it('displays recent documents list', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Recent Documents')).toBeTruthy();
        expect(getByText('lab_results_2024.pdf')).toBeTruthy();
        expect(getByText('xray_chest.dcm')).toBeTruthy();
        expect(getByText('completed')).toBeTruthy();
        expect(getByText('processing')).toBeTruthy();
      });
    });
  });

  describe('Alerts', () => {
    it('displays alerts and notifications', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Alerts & Notifications')).toBeTruthy();
        expect(getByText('Document Review Required')).toBeTruthy();
        expect(getByText('Processing Failed')).toBeTruthy();
      });
    });
  });

  describe('Time Range Selection', () => {
    it('renders time range chips', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Last 7 days')).toBeTruthy();
        expect(getByText('Last 30 days')).toBeTruthy();
        expect(getByText('Last 3 months')).toBeTruthy();
        expect(getByText('Last year')).toBeTruthy();
      });
    });

    it('updates data when time range changes', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Last 7 days')).toBeTruthy();
      });

      // Clear previous calls
      jest.clearAllMocks();
      mobileApiService.getClinicalRecordsSummary.mockResolvedValue(mockClinicalRecordsSummary);
      mobileApiService.getRecentDocuments.mockResolvedValue(mockRecentDocuments);
      mobileApiService.getDashboardAlerts.mockResolvedValue(mockAlerts);

      // Tap on 7 days
      fireEvent.press(getByText('Last 7 days'));

      await waitFor(() => {
        expect(mobileApiService.getClinicalRecordsSummary).toHaveBeenCalledWith({
          dateRange: '7',
          includeTrends: true,
        });
      });
    });
  });

  describe('Quick Actions', () => {
    it('renders quick action buttons', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('View Records')).toBeTruthy();
        expect(getByText('Search')).toBeTruthy();
        expect(getByText('Upload')).toBeTruthy(); // Doctor role
      });
    });

    it('hides upload button for patients', async () => {
      const patientAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'patient' },
      };

      const { getByText, queryByText } = render(
        <TestWrapper authContext={patientAuthContext}>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('View Records')).toBeTruthy();
        expect(getByText('Search')).toBeTruthy();
        expect(queryByText('Upload')).toBeNull();
      });
    });

    it('shows upload button for staff', async () => {
      const staffAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'staff' },
      };

      const { getByText } = render(
        <TestWrapper authContext={staffAuthContext}>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Upload')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to records list when View Records is pressed', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('View Records')).toBeTruthy();
      });

      fireEvent.press(getByText('View Records'));
      expect(mockNavigate).toHaveBeenCalledWith('ClinicalRecordsList');
    });

    it('navigates to search when Search is pressed', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Search')).toBeTruthy();
      });

      fireEvent.press(getByText('Search'));
      expect(mockNavigate).toHaveBeenCalledWith('RecordSearch');
    });

    it('navigates to upload when Upload is pressed', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Upload')).toBeTruthy();
      });

      fireEvent.press(getByText('Upload'));
      expect(mockNavigate).toHaveBeenCalledWith('DocumentUpload');
    });

    it('navigates to records list when View All is pressed', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('View All')).toBeTruthy();
      });

      fireEvent.press(getByText('View All'));
      expect(mockNavigate).toHaveBeenCalledWith('ClinicalRecordsList');
    });
  });

  describe('Pull to Refresh', () => {
    it('refreshes data when pulled', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mobileApiService.getClinicalRecordsSummary).toHaveBeenCalled();
      });

      // Clear mocks
      jest.clearAllMocks();
      mobileApiService.getClinicalRecordsSummary.mockResolvedValue(mockClinicalRecordsSummary);
      mobileApiService.getRecentDocuments.mockResolvedValue(mockRecentDocuments);
      mobileApiService.getDashboardAlerts.mockResolvedValue(mockAlerts);

      // Find ScrollView and trigger refresh
      const scrollView = getByTestId('clinical-records-dashboard-scroll') || 
                        getByTestId('RNE__ScrollView') ||
                        { props: { refreshControl: { props: { onRefresh: jest.fn() } } } };

      // Simulate pull to refresh
      if (scrollView.props?.refreshControl?.props?.onRefresh) {
        act(() => {
          scrollView.props.refreshControl.props.onRefresh();
        });
      }

      await waitFor(() => {
        expect(mobileApiService.getClinicalRecordsSummary).toHaveBeenCalled();
      });
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no records exist', async () => {
      const emptySummary = {
        ...mockClinicalRecordsSummary,
        summary: {
          ...mockClinicalRecordsSummary.summary,
          total_records: 0,
          total_documents: 0,
        },
      };

      mobileApiService.getClinicalRecordsSummary.mockResolvedValue(emptySummary);

      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('No Clinical Records')).toBeTruthy();
      });
    });

    it('shows different empty message for patients', async () => {
      const patientAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'patient' },
      };

      const emptySummary = {
        ...mockClinicalRecordsSummary,
        summary: {
          ...mockClinicalRecordsSummary.summary,
          total_records: 0,
        },
      };

      mobileApiService.getClinicalRecordsSummary.mockResolvedValue(emptySummary);

      const { getByText } = render(
        <TestWrapper authContext={patientAuthContext}>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText("You don't have any clinical records yet.")).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows retry button on error', async () => {
      mobileApiService.getClinicalRecordsSummary.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsDashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Retry')).toBeTruthy();
      });

      // Clear mocks and setup success response
      jest.clearAllMocks();
      mobileApiService.getClinicalRecordsSummary.mockResolvedValue(mockClinicalRecordsSummary);
      mobileApiService.getRecentDocuments.mockResolvedValue(mockRecentDocuments);
      mobileApiService.getDashboardAlerts.mockResolvedValue(mockAlerts);

      // Press retry
      fireEvent.press(getByText('Retry'));

      await waitFor(() => {
        expect(mobileApiService.getClinicalRecordsSummary).toHaveBeenCalled();
      });
    });
  });
});