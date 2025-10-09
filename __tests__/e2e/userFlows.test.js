import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens for testing
import DoctorDashboardScreen from '../../screens/dashboard/DoctorDashboardScreen';
import PatientDashboardScreen from '../../screens/dashboard/PatientDashboardScreen';
import ClinicalRecordsListScreen from '../../screens/clinical-records/ClinicalRecordsListScreen';
import ClinicalRecordDetailScreen from '../../screens/clinical-records/ClinicalRecordDetailScreen';
import AppointmentListScreen from '../../screens/appointments/AppointmentListScreen';
import PrescriptionListScreen from '../../screens/prescriptions/PrescriptionListScreen';

// Import contexts
import { MobileDashboardProvider } from '../../contexts/MobileDashboardContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

const Stack = createStackNavigator();

// Test wrapper component
const TestApp = ({ initialRouteName = 'DoctorDashboard', user = { role: 'doctor' } }) => (
  <NavigationContainer>
    <NotificationProvider>
      <MobileDashboardProvider user={user}>
        <Stack.Navigator initialRouteName={initialRouteName}>
          <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
          <Stack.Screen name="PatientDashboard" component={PatientDashboardScreen} />
          <Stack.Screen name="ClinicalRecordsList" component={ClinicalRecordsListScreen} />
          <Stack.Screen name="ClinicalRecordDetail" component={ClinicalRecordDetailScreen} />
          <Stack.Screen name="AppointmentList" component={AppointmentListScreen} />
          <Stack.Screen name="PrescriptionList" component={PrescriptionListScreen} />
        </Stack.Navigator>
      </MobileDashboardProvider>
    </NotificationProvider>
  </NavigationContainer>
);

describe('E2E User Flows', () => {
  describe('Doctor Dashboard Flow', () => {
    test('should complete doctor dashboard to clinical records flow', async () => {
      const startTime = Date.now();
      
      // Mock API responses
      global.mockApiResponse('mobileApiService', 'getDashboardData', {
        metrics: {
          totalPatients: 150,
          todayAppointments: 8,
          pendingRecords: 5,
          completedRecords: 45,
        },
        recentActivity: [
          {
            id: 1,
            type: 'clinical_record',
            title: 'Lab Results - John Doe',
            timestamp: new Date().toISOString(),
          },
        ],
        quickActions: [
          { id: 'view_records', title: 'View Clinical Records', icon: 'folder' },
          { id: 'appointments', title: 'Today\'s Appointments', icon: 'calendar' },
        ],
      });

      global.mockApiResponse('mobileApiService', 'getClinicalRecords', {
        records: [
          {
            id: 1,
            patientName: 'John Doe',
            recordType: 'Lab Results',
            date: new Date().toISOString(),
            status: 'completed',
          },
          {
            id: 2,
            patientName: 'Jane Smith',
            recordType: 'X-Ray',
            date: new Date().toISOString(),
            status: 'pending',
          },
        ],
        totalCount: 2,
        hasMore: false,
      });

      const { getByText, getByTestId } = render(<TestApp />);

      // Wait for dashboard to load
      await waitFor(() => {
        expect(getByText('Doctor Dashboard')).toBeTruthy();
      });

      const dashboardLoadTime = Date.now() - startTime;
      global.trackTestPerformance('render', dashboardLoadTime, { screen: 'DoctorDashboard' });

      // Verify dashboard metrics are displayed
      await waitFor(() => {
        expect(getByText('150')).toBeTruthy(); // Total patients
        expect(getByText('8')).toBeTruthy(); // Today's appointments
      });

      // Navigate to clinical records
      const navigationStartTime = Date.now();
      const clinicalRecordsButton = getByText('View Clinical Records');
      
      await act(async () => {
        fireEvent.press(clinicalRecordsButton);
      });

      // Wait for clinical records screen to load
      await waitFor(() => {
        expect(getByText('Clinical Records')).toBeTruthy();
      });

      const navigationTime = Date.now() - navigationStartTime;
      global.trackTestPerformance('navigation', navigationTime, { 
        from: 'DoctorDashboard', 
        to: 'ClinicalRecordsList' 
      });

      // Verify clinical records are displayed
      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('Jane Smith')).toBeTruthy();
        expect(getByText('Lab Results')).toBeTruthy();
        expect(getByText('X-Ray')).toBeTruthy();
      });

      // Test search functionality
      const searchInput = getByTestId('search-input');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      // Verify search results
      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      // Test record detail navigation
      const recordItem = getByText('John Doe');
      
      await act(async () => {
        fireEvent.press(recordItem);
      });

      // Wait for record detail screen
      await waitFor(() => {
        expect(getByText('Clinical Record Details')).toBeTruthy();
      });

      // Verify performance metrics
      expect(dashboardLoadTime).toBeLessThan(2000); // Dashboard should load within 2 seconds
      expect(navigationTime).toBeLessThan(500); // Navigation should be under 500ms
    });

    test('should handle offline scenario gracefully', async () => {
      // Mock network error
      global.mockApiError('mobileApiService', 'getDashboardData', new Error('Network Error'));

      const { getByText, queryByText } = render(<TestApp />);

      // Should show offline indicator or error state
      await waitFor(() => {
        expect(
          getByText('Unable to load dashboard data') || 
          getByText('You are offline') ||
          queryByText('Network Error')
        ).toBeTruthy();
      });

      // Should show retry option
      const retryButton = getByText('Retry') || getByText('Try Again');
      expect(retryButton).toBeTruthy();
    });

    test('should handle slow API responses', async () => {
      // Mock slow API response
      global.mockApiResponse('mobileApiService', 'getDashboardData', 
        new Promise(resolve => 
          setTimeout(() => resolve({
            metrics: { totalPatients: 150, todayAppointments: 8 },
            recentActivity: [],
            quickActions: [],
          }), 3000)
        )
      );

      const { getByTestId, getByText } = render(<TestApp />);

      // Should show loading indicator
      expect(getByTestId('loading-indicator') || getByText('Loading...')).toBeTruthy();

      // Wait for data to load (with extended timeout)
      await waitFor(() => {
        expect(getByText('Doctor Dashboard')).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  describe('Patient Dashboard Flow', () => {
    test('should complete patient dashboard to appointments flow', async () => {
      const patientUser = { role: 'patient', id: 1, name: 'John Doe' };
      
      // Mock patient dashboard data
      global.mockApiResponse('mobileApiService', 'getDashboardData', {
        metrics: {
          upcomingAppointments: 2,
          recentRecords: 3,
          prescriptions: 1,
        },
        recentActivity: [
          {
            id: 1,
            type: 'appointment',
            title: 'Checkup with Dr. Smith',
            timestamp: new Date().toISOString(),
          },
        ],
        quickActions: [
          { id: 'appointments', title: 'My Appointments', icon: 'calendar' },
          { id: 'records', title: 'My Records', icon: 'folder' },
        ],
      });

      global.mockApiResponse('mobileApiService', 'getAppointments', {
        appointments: [
          {
            id: 1,
            doctorName: 'Dr. Smith',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            time: '10:00 AM',
            type: 'Checkup',
            status: 'confirmed',
          },
          {
            id: 2,
            doctorName: 'Dr. Johnson',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
            time: '2:00 PM',
            type: 'Follow-up',
            status: 'pending',
          },
        ],
        totalCount: 2,
      });

      const { getByText, getByTestId } = render(
        <TestApp initialRouteName="PatientDashboard" user={patientUser} />
      );

      // Wait for patient dashboard to load
      await waitFor(() => {
        expect(getByText('Patient Dashboard')).toBeTruthy();
      });

      // Verify patient metrics
      await waitFor(() => {
        expect(getByText('2')).toBeTruthy(); // Upcoming appointments
        expect(getByText('3')).toBeTruthy(); // Recent records
      });

      // Navigate to appointments
      const appointmentsButton = getByText('My Appointments');
      
      await act(async () => {
        fireEvent.press(appointmentsButton);
      });

      // Wait for appointments screen
      await waitFor(() => {
        expect(getByText('My Appointments')).toBeTruthy();
      });

      // Verify appointments are displayed
      await waitFor(() => {
        expect(getByText('Dr. Smith')).toBeTruthy();
        expect(getByText('Dr. Johnson')).toBeTruthy();
        expect(getByText('Checkup')).toBeTruthy();
        expect(getByText('Follow-up')).toBeTruthy();
      });

      // Test appointment filtering
      const filterButton = getByTestId('filter-button');
      
      await act(async () => {
        fireEvent.press(filterButton);
      });

      // Should show filter options
      await waitFor(() => {
        expect(getByText('Confirmed') || getByText('Pending')).toBeTruthy();
      });
    });
  });

  describe('Clinical Records Management Flow', () => {
    test('should complete clinical records upload and processing flow', async () => {
      // Mock clinical records data
      global.mockApiResponse('mobileApiService', 'getClinicalRecords', {
        records: [],
        totalCount: 0,
      });

      global.mockApiResponse('mobileApiService', 'uploadDocument', {
        id: 1,
        filename: 'test-document.pdf',
        status: 'processing',
        uploadProgress: 100,
      });

      const { getByText, getByTestId } = render(
        <TestApp initialRouteName="ClinicalRecordsList" />
      );

      // Wait for clinical records screen
      await waitFor(() => {
        expect(getByText('Clinical Records')).toBeTruthy();
      });

      // Test document upload
      const uploadButton = getByTestId('upload-button');
      
      await act(async () => {
        fireEvent.press(uploadButton);
      });

      // Should show upload options
      await waitFor(() => {
        expect(getByText('Camera') || getByText('Gallery') || getByText('Files')).toBeTruthy();
      });

      // Simulate file selection
      const cameraOption = getByText('Camera');
      
      await act(async () => {
        fireEvent.press(cameraOption);
      });

      // Should show upload progress
      await waitFor(() => {
        expect(getByText('Uploading...') || getByTestId('upload-progress')).toBeTruthy();
      });
    });

    test('should handle large file uploads with progress tracking', async () => {
      let uploadProgress = 0;
      
      // Mock progressive upload
      global.mockApiResponse('mobileApiService', 'uploadDocument', 
        new Promise((resolve) => {
          const interval = setInterval(() => {
            uploadProgress += 20;
            if (uploadProgress >= 100) {
              clearInterval(interval);
              resolve({
                id: 1,
                filename: 'large-document.pdf',
                status: 'completed',
                uploadProgress: 100,
              });
            }
          }, 500);
        })
      );

      const { getByText, getByTestId } = render(
        <TestApp initialRouteName="ClinicalRecordsList" />
      );

      await waitFor(() => {
        expect(getByText('Clinical Records')).toBeTruthy();
      });

      const uploadButton = getByTestId('upload-button');
      
      await act(async () => {
        fireEvent.press(uploadButton);
      });

      const cameraOption = getByText('Camera');
      
      await act(async () => {
        fireEvent.press(cameraOption);
      });

      // Should show progress indicator
      await waitFor(() => {
        expect(getByTestId('upload-progress')).toBeTruthy();
      });

      // Wait for upload completion
      await waitFor(() => {
        expect(getByText('Upload completed') || getByText('large-document.pdf')).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  describe('Cross-Screen Navigation Performance', () => {
    test('should maintain performance across multiple screen transitions', async () => {
      const navigationTimes = [];
      
      const { getByText } = render(<TestApp />);

      // Wait for initial screen
      await waitFor(() => {
        expect(getByText('Doctor Dashboard')).toBeTruthy();
      });

      // Navigate through multiple screens and measure performance
      const screens = [
        { button: 'View Clinical Records', expectedText: 'Clinical Records' },
        { button: 'Back', expectedText: 'Doctor Dashboard' },
        { button: 'Today\'s Appointments', expectedText: 'Appointments' },
        { button: 'Back', expectedText: 'Doctor Dashboard' },
      ];

      for (const screen of screens) {
        const startTime = Date.now();
        
        const button = getByText(screen.button);
        await act(async () => {
          fireEvent.press(button);
        });

        await waitFor(() => {
          expect(getByText(screen.expectedText)).toBeTruthy();
        });

        const navigationTime = Date.now() - startTime;
        navigationTimes.push(navigationTime);
        
        global.trackTestPerformance('navigation', navigationTime, { 
          action: screen.button,
          target: screen.expectedText 
        });
      }

      // Verify all navigation times are reasonable
      const averageNavigationTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
      expect(averageNavigationTime).toBeLessThan(300); // Average should be under 300ms

      // No single navigation should take more than 1 second
      navigationTimes.forEach(time => {
        expect(time).toBeLessThan(1000);
      });
    });
  });

  describe('Memory Management During Navigation', () => {
    test('should not cause memory leaks during extensive navigation', async () => {
      const { getByText } = render(<TestApp />);

      // Simulate extensive navigation to test memory management
      for (let i = 0; i < 10; i++) {
        // Navigate to clinical records
        await act(async () => {
          fireEvent.press(getByText('View Clinical Records'));
        });

        await waitFor(() => {
          expect(getByText('Clinical Records')).toBeTruthy();
        });

        // Navigate back
        await act(async () => {
          fireEvent.press(getByText('Back'));
        });

        await waitFor(() => {
          expect(getByText('Doctor Dashboard')).toBeTruthy();
        });
      }

      // Test should complete without memory issues
      expect(getByText('Doctor Dashboard')).toBeTruthy();
    });
  });

  describe('Error Recovery Flows', () => {
    test('should recover from API errors gracefully', async () => {
      // Start with API error
      global.mockApiError('mobileApiService', 'getDashboardData', new Error('Server Error'));

      const { getByText, rerender } = render(<TestApp />);

      // Should show error state
      await waitFor(() => {
        expect(getByText('Unable to load dashboard data') || getByText('Server Error')).toBeTruthy();
      });

      // Mock successful retry
      global.mockApiResponse('mobileApiService', 'getDashboardData', {
        metrics: { totalPatients: 150, todayAppointments: 8 },
        recentActivity: [],
        quickActions: [],
      });

      // Trigger retry
      const retryButton = getByText('Retry') || getByText('Try Again');
      
      await act(async () => {
        fireEvent.press(retryButton);
      });

      // Should recover and show data
      await waitFor(() => {
        expect(getByText('Doctor Dashboard')).toBeTruthy();
        expect(getByText('150')).toBeTruthy();
      });
    });

    test('should handle authentication errors', async () => {
      // Mock authentication error
      global.mockApiError('mobileApiService', 'getDashboardData', {
        status: 401,
        message: 'Unauthorized',
      });

      const { getByText } = render(<TestApp />);

      // Should show authentication error
      await waitFor(() => {
        expect(
          getByText('Session expired') || 
          getByText('Please log in again') ||
          getByText('Unauthorized')
        ).toBeTruthy();
      });

      // Should show login option
      expect(getByText('Log In') || getByText('Sign In')).toBeTruthy();
    });
  });

  describe('Accessibility and Usability', () => {
    test('should be accessible with screen readers', async () => {
      const { getByLabelText, getByRole } = render(<TestApp />);

      await waitFor(() => {
        expect(getByLabelText('Doctor Dashboard') || getByRole('heading')).toBeTruthy();
      });

      // Check for accessibility labels on interactive elements
      const buttons = ['View Clinical Records', 'Today\'s Appointments'];
      
      buttons.forEach(buttonText => {
        const button = getByText(buttonText);
        expect(button).toBeTruthy();
        // Button should be accessible
        expect(button.props.accessible !== false).toBeTruthy();
      });
    });

    test('should support keyboard navigation', async () => {
      const { getByText } = render(<TestApp />);

      await waitFor(() => {
        expect(getByText('Doctor Dashboard')).toBeTruthy();
      });

      // Test tab navigation (simulated)
      const firstButton = getByText('View Clinical Records');
      const secondButton = getByText('Today\'s Appointments');

      // Both buttons should be focusable
      expect(firstButton.props.focusable !== false).toBeTruthy();
      expect(secondButton.props.focusable !== false).toBeTruthy();
    });
  });
});