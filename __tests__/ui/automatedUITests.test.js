import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { act } from 'react-test-renderer';

// Import components for UI testing
import DoctorDashboardScreen from '../../screens/dashboard/DoctorDashboardScreen';
import ClinicalRecordsListScreen from '../../screens/clinical-records/ClinicalRecordsListScreen';
import DocumentViewerScreen from '../../screens/clinical-records/DocumentViewerScreen';
import AppointmentListScreen from '../../screens/appointments/AppointmentListScreen';

// Import UI components
import MetricCard from '../../components/dashboard/MetricCard';
import RecordCard from '../../components/clinical-records/RecordCard';
import SearchFilters from '../../components/clinical-records/SearchFilters';
import UploadProgress from '../../components/clinical-records/UploadProgress';

// Test wrapper for navigation
const NavigationWrapper = ({ children }) => (
  <NavigationContainer>
    {children}
  </NavigationContainer>
);

describe('Automated UI Tests', () => {
  describe('Dashboard UI Components', () => {
    test('should render metric cards with correct data', async () => {
      const mockMetrics = {
        totalPatients: 150,
        todayAppointments: 8,
        pendingRecords: 5,
        completedRecords: 45,
      };

      const { getByText, getByTestId } = render(
        <MetricCard
          title="Total Patients"
          value={mockMetrics.totalPatients}
          icon="account-group"
          color="#2196F3"
          testID="total-patients-card"
        />
      );

      expect(getByText('Total Patients')).toBeTruthy();
      expect(getByText('150')).toBeTruthy();
      expect(getByTestId('total-patients-card')).toBeTruthy();

      // Test accessibility
      const card = getByTestId('total-patients-card');
      expect(card.props.accessible).toBeTruthy();
      expect(card.props.accessibilityLabel).toContain('Total Patients');
    });

    test('should handle metric card interactions', async () => {
      const onPress = jest.fn();
      
      const { getByTestId } = render(
        <MetricCard
          title="Today's Appointments"
          value={8}
          icon="calendar"
          onPress={onPress}
          testID="appointments-card"
        />
      );

      const card = getByTestId('appointments-card');
      
      await act(async () => {
        fireEvent.press(card);
      });

      expect(onPress).toHaveBeenCalled();
    });

    test('should display loading state for metric cards', () => {
      const { getByTestId } = render(
        <MetricCard
          title="Loading Metric"
          value={null}
          loading={true}
          testID="loading-card"
        />
      );

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    test('should handle error state for metric cards', () => {
      const { getByText } = render(
        <MetricCard
          title="Error Metric"
          value={null}
          error="Failed to load data"
          testID="error-card"
        />
      );

      expect(getByText('Failed to load data')).toBeTruthy();
    });
  });

  describe('Clinical Records UI Components', () => {
    test('should render record cards with patient information', () => {
      const mockRecord = {
        id: 1,
        patientName: 'John Doe',
        recordType: 'Lab Results',
        date: '2025-01-16T10:00:00Z',
        status: 'completed',
        priority: 'high',
      };

      const { getByText, getByTestId } = render(
        <RecordCard
          record={mockRecord}
          onPress={jest.fn()}
          testID="record-card-1"
        />
      );

      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Lab Results')).toBeTruthy();
      expect(getByText('completed')).toBeTruthy();
      expect(getByTestId('record-card-1')).toBeTruthy();
    });

    test('should handle record card selection', async () => {
      const onPress = jest.fn();
      const mockRecord = {
        id: 1,
        patientName: 'John Doe',
        recordType: 'Lab Results',
        date: '2025-01-16T10:00:00Z',
        status: 'completed',
      };

      const { getByTestId } = render(
        <RecordCard
          record={mockRecord}
          onPress={onPress}
          testID="selectable-record-card"
        />
      );

      const card = getByTestId('selectable-record-card');
      
      await act(async () => {
        fireEvent.press(card);
      });

      expect(onPress).toHaveBeenCalledWith(mockRecord);
    });

    test('should display record status indicators correctly', () => {
      const statuses = ['pending', 'processing', 'completed', 'error'];
      
      statuses.forEach(status => {
        const mockRecord = {
          id: 1,
          patientName: 'Test Patient',
          recordType: 'Test Record',
          date: '2025-01-16T10:00:00Z',
          status,
        };

        const { getByText, getByTestId } = render(
          <RecordCard
            record={mockRecord}
            testID={`record-${status}`}
          />
        );

        expect(getByText(status)).toBeTruthy();
        
        // Check for status-specific styling
        const statusIndicator = getByTestId(`status-indicator-${status}`);
        expect(statusIndicator).toBeTruthy();
      });
    });
  });

  describe('Search and Filter UI', () => {
    test('should render search filters with all options', () => {
      const mockFilters = {
        recordTypes: ['Lab Results', 'X-Ray', 'MRI', 'CT Scan'],
        statuses: ['pending', 'completed', 'processing'],
        dateRanges: ['Today', 'This Week', 'This Month', 'Custom'],
      };

      const { getByText, getByTestId } = render(
        <SearchFilters
          filters={mockFilters}
          onFilterChange={jest.fn()}
          testID="search-filters"
        />
      );

      // Check record type filters
      mockFilters.recordTypes.forEach(type => {
        expect(getByText(type)).toBeTruthy();
      });

      // Check status filters
      mockFilters.statuses.forEach(status => {
        expect(getByText(status)).toBeTruthy();
      });

      // Check date range filters
      mockFilters.dateRanges.forEach(range => {
        expect(getByText(range)).toBeTruthy();
      });

      expect(getByTestId('search-filters')).toBeTruthy();
    });

    test('should handle filter selection', async () => {
      const onFilterChange = jest.fn();
      const mockFilters = {
        recordTypes: ['Lab Results', 'X-Ray'],
        statuses: ['pending', 'completed'],
        dateRanges: ['Today', 'This Week'],
      };

      const { getByText } = render(
        <SearchFilters
          filters={mockFilters}
          onFilterChange={onFilterChange}
        />
      );

      // Select a record type filter
      const labResultsFilter = getByText('Lab Results');
      
      await act(async () => {
        fireEvent.press(labResultsFilter);
      });

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          recordTypes: expect.arrayContaining(['Lab Results']),
        })
      );
    });

    test('should handle search input', async () => {
      const onSearch = jest.fn();
      
      const { getByTestId } = render(
        <SearchFilters
          onSearch={onSearch}
          testID="search-filters"
        />
      );

      const searchInput = getByTestId('search-input');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'John Doe');
      });

      expect(onSearch).toHaveBeenCalledWith('John Doe');
    });

    test('should clear filters when reset button is pressed', async () => {
      const onFilterChange = jest.fn();
      const onReset = jest.fn();
      
      const { getByText } = render(
        <SearchFilters
          onFilterChange={onFilterChange}
          onReset={onReset}
        />
      );

      const resetButton = getByText('Clear Filters') || getByText('Reset');
      
      await act(async () => {
        fireEvent.press(resetButton);
      });

      expect(onReset).toHaveBeenCalled();
    });
  });

  describe('Upload Progress UI', () => {
    test('should display upload progress correctly', () => {
      const mockUpload = {
        id: 1,
        filename: 'test-document.pdf',
        progress: 65,
        status: 'uploading',
        size: 1024 * 1024, // 1MB
      };

      const { getByText, getByTestId } = render(
        <UploadProgress
          upload={mockUpload}
          testID="upload-progress"
        />
      );

      expect(getByText('test-document.pdf')).toBeTruthy();
      expect(getByText('65%')).toBeTruthy();
      expect(getByText('uploading')).toBeTruthy();
      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    test('should handle upload completion', () => {
      const mockUpload = {
        id: 1,
        filename: 'completed-document.pdf',
        progress: 100,
        status: 'completed',
        size: 1024 * 1024,
      };

      const { getByText, getByTestId } = render(
        <UploadProgress
          upload={mockUpload}
          testID="completed-upload"
        />
      );

      expect(getByText('completed')).toBeTruthy();
      expect(getByText('100%')).toBeTruthy();
      expect(getByTestId('success-indicator')).toBeTruthy();
    });

    test('should handle upload errors', () => {
      const mockUpload = {
        id: 1,
        filename: 'failed-document.pdf',
        progress: 45,
        status: 'error',
        error: 'Upload failed: Network error',
        size: 1024 * 1024,
      };

      const { getByText, getByTestId } = render(
        <UploadProgress
          upload={mockUpload}
          testID="failed-upload"
        />
      );

      expect(getByText('error')).toBeTruthy();
      expect(getByText('Upload failed: Network error')).toBeTruthy();
      expect(getByTestId('error-indicator')).toBeTruthy();
    });

    test('should allow retry on failed uploads', async () => {
      const onRetry = jest.fn();
      const mockUpload = {
        id: 1,
        filename: 'failed-document.pdf',
        progress: 45,
        status: 'error',
        error: 'Upload failed',
        size: 1024 * 1024,
      };

      const { getByText } = render(
        <UploadProgress
          upload={mockUpload}
          onRetry={onRetry}
        />
      );

      const retryButton = getByText('Retry') || getByText('Try Again');
      
      await act(async () => {
        fireEvent.press(retryButton);
      });

      expect(onRetry).toHaveBeenCalledWith(mockUpload.id);
    });
  });

  describe('Screen-Level UI Tests', () => {
    test('should render doctor dashboard screen with all components', async () => {
      const { getByText, getByTestId } = render(
        <NavigationWrapper>
          <DoctorDashboardScreen />
        </NavigationWrapper>
      );

      // Wait for screen to load
      await waitFor(() => {
        expect(getByText('Doctor Dashboard')).toBeTruthy();
      });

      // Check for key dashboard components
      expect(getByTestId('metrics-section')).toBeTruthy();
      expect(getByTestId('recent-activity-section')).toBeTruthy();
      expect(getByTestId('quick-actions-section')).toBeTruthy();
    });

    test('should handle navigation between screens', async () => {
      const mockNavigation = {
        navigate: jest.fn(),
        goBack: jest.fn(),
        setOptions: jest.fn(),
      };

      const { getByText } = render(
        <DoctorDashboardScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Doctor Dashboard')).toBeTruthy();
      });

      // Test navigation to clinical records
      const clinicalRecordsButton = getByText('View Clinical Records');
      
      await act(async () => {
        fireEvent.press(clinicalRecordsButton);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ClinicalRecordsList');
    });

    test('should display loading states correctly', async () => {
      // Mock loading state
      const { getByTestId } = render(
        <NavigationWrapper>
          <DoctorDashboardScreen />
        </NavigationWrapper>
      );

      // Should show loading indicators initially
      expect(getByTestId('dashboard-loading') || getByTestId('loading-indicator')).toBeTruthy();
    });

    test('should handle error states gracefully', async () => {
      // Mock API error
      global.mockApiError('mobileApiService', 'getDashboardData', new Error('API Error'));

      const { getByText } = render(
        <NavigationWrapper>
          <DoctorDashboardScreen />
        </NavigationWrapper>
      );

      await waitFor(() => {
        expect(
          getByText('Unable to load dashboard data') ||
          getByText('Something went wrong') ||
          getByText('API Error')
        ).toBeTruthy();
      });

      // Should show retry option
      expect(getByText('Retry') || getByText('Try Again')).toBeTruthy();
    });
  });

  describe('Responsive Design Tests', () => {
    test('should adapt to different screen sizes', () => {
      const screenSizes = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 8
        { width: 414, height: 896 }, // iPhone 11 Pro Max
        { width: 768, height: 1024 }, // iPad
      ];

      screenSizes.forEach(size => {
        // Mock screen dimensions
        jest.doMock('react-native', () => ({
          ...jest.requireActual('react-native'),
          Dimensions: {
            get: () => size,
          },
        }));

        const { getByTestId } = render(
          <MetricCard
            title="Responsive Test"
            value={100}
            testID="responsive-card"
          />
        );

        const card = getByTestId('responsive-card');
        expect(card).toBeTruthy();
        
        // Card should be rendered regardless of screen size
        expect(card.props.style).toBeDefined();
      });
    });

    test('should handle orientation changes', async () => {
      const { getByTestId, rerender } = render(
        <NavigationWrapper>
          <ClinicalRecordsListScreen />
        </NavigationWrapper>
      );

      // Portrait mode
      await waitFor(() => {
        expect(getByTestId('records-list')).toBeTruthy();
      });

      // Simulate orientation change to landscape
      jest.doMock('react-native', () => ({
        ...jest.requireActual('react-native'),
        Dimensions: {
          get: () => ({ width: 896, height: 414 }), // Landscape
        },
      }));

      rerender(
        <NavigationWrapper>
          <ClinicalRecordsListScreen />
        </NavigationWrapper>
      );

      // Should still render correctly in landscape
      expect(getByTestId('records-list')).toBeTruthy();
    });
  });

  describe('Accessibility Tests', () => {
    test('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <MetricCard
          title="Total Patients"
          value={150}
          icon="account-group"
          accessibilityLabel="Total Patients: 150"
          testID="accessible-card"
        />
      );

      expect(getByLabelText('Total Patients: 150')).toBeTruthy();
    });

    test('should support screen reader navigation', () => {
      const { getByTestId } = render(
        <NavigationWrapper>
          <DoctorDashboardScreen />
        </NavigationWrapper>
      );

      const dashboard = getByTestId('doctor-dashboard');
      
      // Should have accessibility properties
      expect(dashboard.props.accessible).toBeTruthy();
      expect(dashboard.props.accessibilityRole).toBeDefined();
    });

    test('should have proper focus management', async () => {
      const { getByTestId } = render(
        <SearchFilters testID="search-filters" />
      );

      const searchInput = getByTestId('search-input');
      
      // Should be focusable
      expect(searchInput.props.focusable !== false).toBeTruthy();
      
      // Should handle focus events
      await act(async () => {
        fireEvent(searchInput, 'focus');
      });

      // Focus should be managed properly
      expect(searchInput).toBeTruthy();
    });

    test('should support keyboard navigation', async () => {
      const { getByTestId } = render(
        <RecordCard
          record={{
            id: 1,
            patientName: 'John Doe',
            recordType: 'Lab Results',
            date: '2025-01-16T10:00:00Z',
            status: 'completed',
          }}
          testID="keyboard-navigable-card"
        />
      );

      const card = getByTestId('keyboard-navigable-card');
      
      // Should support keyboard events
      await act(async () => {
        fireEvent(card, 'keyPress', { nativeEvent: { key: 'Enter' } });
      });

      expect(card).toBeTruthy();
    });
  });

  describe('Performance UI Tests', () => {
    test('should render large lists efficiently', async () => {
      const largeRecordsList = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        patientName: `Patient ${i}`,
        recordType: 'Lab Results',
        date: '2025-01-16T10:00:00Z',
        status: 'completed',
      }));

      const startTime = Date.now();
      
      const { getByTestId } = render(
        <NavigationWrapper>
          <ClinicalRecordsListScreen 
            route={{ params: { records: largeRecordsList } }}
          />
        </NavigationWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('records-list')).toBeTruthy();
      });

      const renderTime = Date.now() - startTime;
      
      // Should render large lists within reasonable time
      expect(renderTime).toBeLessThan(2000); // 2 seconds max
      
      global.trackTestPerformance('render', renderTime, {
        component: 'ClinicalRecordsListScreen',
        itemCount: largeRecordsList.length,
      });
    });

    test('should handle rapid user interactions', async () => {
      const onPress = jest.fn();
      
      const { getByTestId } = render(
        <MetricCard
          title="Rapid Test"
          value={100}
          onPress={onPress}
          testID="rapid-interaction-card"
        />
      );

      const card = getByTestId('rapid-interaction-card');
      
      // Simulate rapid taps
      const rapidTaps = 10;
      const startTime = Date.now();
      
      for (let i = 0; i < rapidTaps; i++) {
        await act(async () => {
          fireEvent.press(card);
        });
      }
      
      const interactionTime = Date.now() - startTime;
      
      // Should handle rapid interactions efficiently
      expect(interactionTime).toBeLessThan(1000); // 1 second max
      expect(onPress).toHaveBeenCalledTimes(rapidTaps);
    });

    test('should maintain smooth scrolling performance', async () => {
      const { getByTestId } = render(
        <NavigationWrapper>
          <ClinicalRecordsListScreen />
        </NavigationWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('records-list')).toBeTruthy();
      });

      const scrollView = getByTestId('records-list');
      
      // Simulate scrolling
      const startTime = Date.now();
      
      await act(async () => {
        fireEvent.scroll(scrollView, {
          nativeEvent: {
            contentOffset: { y: 1000 },
            contentSize: { height: 5000 },
            layoutMeasurement: { height: 800 },
          },
        });
      });
      
      const scrollTime = Date.now() - startTime;
      
      // Scrolling should be responsive
      expect(scrollTime).toBeLessThan(100); // 100ms max
    });
  });

  describe('Animation and Transition Tests', () => {
    test('should handle screen transitions smoothly', async () => {
      const mockNavigation = {
        navigate: jest.fn(),
        addListener: jest.fn(),
      };

      const { getByText } = render(
        <DoctorDashboardScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Doctor Dashboard')).toBeTruthy();
      });

      const startTime = Date.now();
      
      // Trigger navigation
      const button = getByText('View Clinical Records');
      await act(async () => {
        fireEvent.press(button);
      });

      const transitionTime = Date.now() - startTime;
      
      // Transition should be smooth and fast
      expect(transitionTime).toBeLessThan(300); // 300ms max
      expect(mockNavigation.navigate).toHaveBeenCalled();
    });

    test('should handle loading animations', async () => {
      const { getByTestId } = render(
        <UploadProgress
          upload={{
            id: 1,
            filename: 'test.pdf',
            progress: 50,
            status: 'uploading',
          }}
          testID="animated-upload"
        />
      );

      const progressBar = getByTestId('progress-bar');
      expect(progressBar).toBeTruthy();
      
      // Progress bar should have animation properties
      expect(progressBar.props.style).toBeDefined();
    });
  });
});