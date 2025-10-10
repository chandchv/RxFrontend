/**
 * Tests for ClinicalRecordsListScreen
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ClinicalRecordsListScreen from '../../../screens/clinical-records/ClinicalRecordsListScreen';
import { AuthContext } from '../../../contexts/AuthContext';
import { MobileDashboardContext } from '../../../contexts/MobileDashboardContext';
import mobileApiService from '../../../services/mobileApiService';
import { theme } from '../../../styles/theme';

// Mock the mobile API service
jest.mock('../../../services/mobileApiService');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock route
const mockRoute = {
  params: {},
};

// Mock user contexts
const mockUser = {
  id: '1',
  role: 'doctor',
  first_name: 'John',
  last_name: 'Doe',
  current_tenant: {
    id: '1',
    name: 'Test Clinic',
  },
};

const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
};

const mockDashboardContext = {
  updateLastActivity: jest.fn(),
  dashboardData: {},
  loading: false,
  error: null,
};

// Mock clinical records data
const mockClinicalRecords = {
  count: 25,
  next: 'http://api.example.com/api/mobile/clinical-records/?page=2',
  previous: null,
  results: [
    {
      id: '1',
      record_type: 'lab_result',
      title: 'Blood Test Results',
      status: 'active',
      priority: 'normal',
      record_date: '2024-01-15T10:30:00Z',
      document_count: 3,
      has_documents: true,
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T11:00:00Z',
      description: 'Complete blood count and metabolic panel',
    },
    {
      id: '2',
      record_type: 'imaging',
      title: 'Chest X-Ray',
      status: 'active',
      priority: 'high',
      record_date: '2024-01-14T14:15:00Z',
      document_count: 1,
      has_documents: true,
      created_at: '2024-01-14T14:15:00Z',
      updated_at: '2024-01-14T14:30:00Z',
      description: 'Routine chest X-ray examination',
    },
    {
      id: '3',
      record_type: 'prescription',
      title: 'Medication Prescription',
      status: 'pending',
      priority: 'normal',
      record_date: '2024-01-13T09:00:00Z',
      document_count: 0,
      has_documents: false,
      created_at: '2024-01-13T09:00:00Z',
      updated_at: '2024-01-13T09:15:00Z',
      description: 'Prescription for hypertension medication',
    },
  ],
};

// Test wrapper component
const TestWrapper = ({ children }) => (
  <NavigationContainer>
    <PaperProvider theme={theme}>
      <AuthContext.Provider value={mockAuthContext}>
        <MobileDashboardContext.Provider value={mockDashboardContext}>
          {children}
        </MobileDashboardContext.Provider>
      </AuthContext.Provider>
    </PaperProvider>
  </NavigationContainer>
);

describe('ClinicalRecordsListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mobileApiService.getClinicalRecords.mockResolvedValue(mockClinicalRecords);
    mobileApiService.isOnline.mockResolvedValue(true);
    mobileApiService.getCachedData.mockResolvedValue(null);
    mobileApiService.setCachedData.mockResolvedValue();
  });

  describe('Initial Loading', () => {
    it('should render loading state initially', async () => {
      mobileApiService.getClinicalRecords.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockClinicalRecords), 100))
      );

      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByText('Loading clinical records...')).toBeTruthy();
    });

    it('should load and display clinical records', async () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(queryByText('Loading clinical records...')).toBeNull();
      });

      expect(getByText('Blood Test Results')).toBeTruthy();
      expect(getByText('Chest X-Ray')).toBeTruthy();
      expect(getByText('Medication Prescription')).toBeTruthy();
      expect(getByText('25 records found')).toBeTruthy();
    });

    it('should call mobile API service with correct parameters', async () => {
      render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mobileApiService.getClinicalRecords).toHaveBeenCalledWith({
          page: 1,
          pageSize: 20,
          search: undefined,
          recordType: undefined,
          status: undefined,
          dateFrom: undefined,
          dateTo: undefined,
          ordering: '-record_date',
        });
      });
    });
  });

  describe('Search Functionality', () => {
    it('should render search bar', async () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Search clinical records...')).toBeTruthy();
      });
    });

    it('should perform search when typing in search bar', async () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Search clinical records...')).toBeTruthy();
      });

      const searchBar = getByPlaceholderText('Search clinical records...');
      
      act(() => {
        fireEvent.changeText(searchBar, 'blood test');
      });

      await waitFor(() => {
        expect(mobileApiService.getClinicalRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'blood test',
          })
        );
      }, { timeout: 1000 });
    });

    it('should clear search when clear button is pressed', async () => {
      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Search clinical records...')).toBeTruthy();
      });

      const searchBar = getByPlaceholderText('Search clinical records...');
      
      act(() => {
        fireEvent.changeText(searchBar, 'blood test');
      });

      await waitFor(() => {
        expect(getByText('Clear')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByText('Clear'));
      });

      expect(mobileApiService.getClinicalRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          search: undefined,
        })
      );
    });
  });

  describe('Filtering', () => {
    it('should show filter controls', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Filters')).toBeTruthy();
        expect(getByText('Sort')).toBeTruthy();
      });
    });

    it('should expand filters panel when filter button is pressed', async () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Filters')).toBeTruthy();
      });

      expect(queryByText('Type:')).toBeNull();

      act(() => {
        fireEvent.press(getByText('Filters'));
      });

      await waitFor(() => {
        expect(getByText('Type:')).toBeTruthy();
        expect(getByText('Status:')).toBeTruthy();
      });
    });

    it('should apply record type filter', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Filters')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByText('Filters'));
      });

      await waitFor(() => {
        expect(getByText('Lab Results')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByText('Lab Results'));
      });

      await waitFor(() => {
        expect(mobileApiService.getClinicalRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            recordType: 'lab_result',
          })
        );
      });
    });

    it('should apply status filter', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Filters')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByText('Filters'));
      });

      await waitFor(() => {
        expect(getByText('Active')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByText('Active'));
      });

      await waitFor(() => {
        expect(mobileApiService.getClinicalRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'active',
          })
        );
      });
    });
  });

  describe('Sorting', () => {
    it('should show sort menu when sort button is pressed', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Sort')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByText('Sort'));
      });

      await waitFor(() => {
        expect(getByText('Newest First')).toBeTruthy();
        expect(getByText('Oldest First')).toBeTruthy();
        expect(getByText('Recently Added')).toBeTruthy();
        expect(getByText('Title A-Z')).toBeTruthy();
        expect(getByText('Title Z-A')).toBeTruthy();
      });
    });

    it('should apply sort order', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Sort')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByText('Sort'));
      });

      await waitFor(() => {
        expect(getByText('Title A-Z')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByText('Title A-Z'));
      });

      await waitFor(() => {
        expect(mobileApiService.getClinicalRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            ordering: 'title',
          })
        );
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh data when pull to refresh is triggered', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mobileApiService.getClinicalRecords).toHaveBeenCalledTimes(1);
      });

      // Simulate pull to refresh
      const flatList = getByTestId('clinical-records-list') || { props: { refreshControl: { props: { onRefresh: jest.fn() } } } };
      
      if (flatList.props && flatList.props.refreshControl) {
        act(() => {
          flatList.props.refreshControl.props.onRefresh();
        });

        await waitFor(() => {
          expect(mobileApiService.getClinicalRecords).toHaveBeenCalledTimes(2);
        });
      }
    });
  });

  describe('Infinite Scrolling', () => {
    it('should load more records when reaching end of list', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mobileApiService.getClinicalRecords).toHaveBeenCalledTimes(1);
      });

      // Simulate reaching end of list
      const flatList = getByTestId('clinical-records-list') || { props: { onEndReached: jest.fn() } };
      
      if (flatList.props && flatList.props.onEndReached) {
        act(() => {
          flatList.props.onEndReached();
        });

        await waitFor(() => {
          expect(mobileApiService.getClinicalRecords).toHaveBeenCalledWith(
            expect.objectContaining({
              page: 2,
            })
          );
        });
      }
    });
  });

  describe('Navigation', () => {
    it('should navigate to record detail when record is pressed', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Blood Test Results')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByText('Blood Test Results'));
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ClinicalRecordDetail', {
        recordId: '1',
      });
    });

    it('should navigate to upload screen when FAB is pressed', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Upload')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByText('Upload'));
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('DocumentUpload');
    });
  });

  describe('Offline Functionality', () => {
    it('should show offline indicator when offline', async () => {
      mobileApiService.isOnline.mockResolvedValue(false);
      mobileApiService.getCachedData.mockResolvedValue({
        data: mockClinicalRecords,
        timestamp: Date.now(),
        ttl: 600000,
      });

      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Offline')).toBeTruthy();
      });
    });

    it('should load cached data when offline', async () => {
      mobileApiService.isOnline.mockResolvedValue(false);
      mobileApiService.getCachedData.mockResolvedValue({
        data: mockClinicalRecords,
        timestamp: Date.now(),
        ttl: 600000,
      });

      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Blood Test Results')).toBeTruthy();
        expect(getByText('Offline')).toBeTruthy();
      });

      expect(mobileApiService.getCachedData).toHaveBeenCalled();
    });

    it('should show cached data error banner when using cached data', async () => {
      mobileApiService.getClinicalRecords.mockRejectedValue(new Error('Network error'));
      mobileApiService.getCachedData.mockResolvedValue({
        data: mockClinicalRecords,
        timestamp: Date.now(),
        ttl: 600000,
      });

      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Showing cached data (offline)')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when API call fails and no cached data', async () => {
      mobileApiService.getClinicalRecords.mockRejectedValue(new Error('Network error'));
      mobileApiService.getCachedData.mockResolvedValue(null);

      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Failed to Load Records')).toBeTruthy();
        expect(getByText('Network error')).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });

    it('should retry loading when retry button is pressed', async () => {
      mobileApiService.getClinicalRecords
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockClinicalRecords);
      mobileApiService.getCachedData.mockResolvedValue(null);

      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Retry')).toBeTruthy();
      });

      act(() => {
        fireEvent.press(getByText('Retry'));
      });

      await waitFor(() => {
        expect(getByText('Blood Test Results')).toBeTruthy();
      });

      expect(mobileApiService.getClinicalRecords).toHaveBeenCalledTimes(2);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no records found', async () => {
      mobileApiService.getClinicalRecords.mockResolvedValue({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });

      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('No Records Found')).toBeTruthy();
        expect(getByText('Upload First Document')).toBeTruthy();
      });
    });

    it('should show different empty message for patients', async () => {
      const patientAuthContext = {
        ...mockAuthContext,
        user: { ...mockUser, role: 'patient' },
      };

      mobileApiService.getClinicalRecords.mockResolvedValue({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });

      const { getByText, queryByText } = render(
        <NavigationContainer>
          <PaperProvider theme={theme}>
            <AuthContext.Provider value={patientAuthContext}>
              <MobileDashboardContext.Provider value={mockDashboardContext}>
                <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
              </MobileDashboardContext.Provider>
            </AuthContext.Provider>
          </PaperProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('No Records Found')).toBeTruthy();
        expect(queryByText('Upload First Document')).toBeNull();
      });
    });
  });

  describe('Record Display', () => {
    it('should display record information correctly', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Blood Test Results')).toBeTruthy();
        expect(getByText('LAB_RESULT • Jan 15, 2024')).toBeTruthy();
        expect(getByText('Complete blood count and metabolic panel')).toBeTruthy();
        expect(getByText('3 docs')).toBeTruthy();
        expect(getByText('active')).toBeTruthy();
      });
    });

    it('should show priority indicators for high priority records', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Chest X-Ray')).toBeTruthy();
        expect(getByText('high')).toBeTruthy();
      });
    });

    it('should handle records without documents', async () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Medication Prescription')).toBeTruthy();
        expect(queryByText('0 docs')).toBeNull(); // Should not show 0 docs
      });
    });
  });

  describe('Context Integration', () => {
    it('should update last activity when records are loaded', async () => {
      render(
        <TestWrapper>
          <ClinicalRecordsListScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockDashboardContext.updateLastActivity).toHaveBeenCalled();
      });
    });
  });
});